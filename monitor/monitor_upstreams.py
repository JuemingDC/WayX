#!/usr/bin/env python3
"""Chance upstream monitor. Cheap checks first; GPT only reviews real semantic changes."""
from __future__ import annotations
import argparse, difflib, fnmatch, hashlib, json, os, re, sys, urllib.error, urllib.parse, urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "monitor" / "sources.json"

class TextParser(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "template"}
    def __init__(self): super().__init__(convert_charrefs=True); self.depth=0; self.parts=[]
    def handle_starttag(self, tag, attrs): self.depth += tag.lower() in self.SKIP
    def handle_endtag(self, tag):
        if tag.lower() in self.SKIP and self.depth: self.depth -= 1
    def handle_data(self, data):
        if not self.depth:
            s=re.sub(r"\s+", " ", data).strip()
            if s: self.parts.append(s)
    def text(self): return "\n".join(self.parts).strip()+"\n"

def now(): return datetime.now(timezone.utc).isoformat()
def stamp(): return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
def sha256(b): return hashlib.sha256(b).hexdigest()
def load_json(p, default):
    try: return json.loads(p.read_text("utf-8"))
    except FileNotFoundError: return default
def save_json(p, obj): p.parent.mkdir(parents=True, exist_ok=True); p.write_text(json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True)+"\n", "utf-8")
def safe(base, rel):
    p=PurePosixPath(rel)
    if p.is_absolute() or ".." in p.parts: raise ValueError(f"unsafe path: {rel}")
    return base.joinpath(*p.parts)
def normalize(data, mode):
    if mode == "raw": return data
    if mode == "html_text":
        p=TextParser(); p.feed(data.decode("utf-8", "replace")); return p.text().encode()
    raise ValueError(f"unknown normalize mode: {mode}")
def udiff(old, new, a, b):
    try: o=old.decode("utf-8"); n=new.decode("utf-8")
    except UnicodeDecodeError: return f"--- {a}\n+++ {b}\n[binary/non-UTF-8 content changed]\n"
    return "".join(difflib.unified_diff(o.splitlines(True), n.splitlines(True), fromfile=a, tofile=b, n=3))
def request(url, headers=None, data=None, timeout=30):
    req=urllib.request.Request(url, headers=headers or {}, data=data, method="POST" if data is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r: return r.status, r.read(), dict(r.headers.items())
    except urllib.error.HTTPError as e: return e.code, e.read(), dict(e.headers.items()) if e.headers else {}
def gh_headers(ua):
    h={"Accept":"application/vnd.github+json","User-Agent":ua,"X-GitHub-Api-Version":"2022-11-28"}
    if os.getenv("GITHUB_TOKEN"): h["Authorization"]="Bearer "+os.environ["GITHUB_TOKEN"]
    return h
def gh_json(url, ua, timeout):
    st,b,_=request(url, gh_headers(ua), timeout=timeout)
    if st != 200: raise RuntimeError(f"GitHub API HTTP {st}: {url}")
    return json.loads(b)
def selected(path, globs): return not globs or any(fnmatch.fnmatch(path, g) for g in globs)
def trim(s, limit):
    if len(s)<=limit:return s
    h=max(1,limit//2); return s[:h]+f"\n\n--- [middle omitted: {len(s)-2*h} chars] ---\n\n"+s[-h:]

def review_rules():
    return """Review upstream changes for a Surge/Loon/Quantumult X/Egern conversion project. Analyze impact only; never blindly rewrite production files.
Rules: preserve semantic behavior before superficial syntax/status-code equality. Loon reject_dict(200) must NOT become QX reject-200 merely because status=200; body/action semantics come first. QX reject-200 means 200 + empty-body URL rejection. QX IP-class rules such as ip-cidr/ip6-cidr remove no-resolve in generated QX output; do not apply that deletion rule to Surge. QX output must follow the official sample format. Preserve original comments and add conversion date, author chance, and module category when conversion is performed. Surge/Egern official docs are authoritative; do not invent unsupported syntax. If evidence is insufficient, require manual verification.
Return concise Markdown sections: ## 变化摘要 / ## 对现有转换规则的影响 / ## 是否需要修改转换器 / ## 建议动作 / ## 风险与未确认项. In 是否需要修改转换器 use one decision: NO_CHANGE, REVIEW, or UPDATE_REQUIRED."""

def call_gpt(src, diff, settings):
    key=os.getenv("OPENAI_API_KEY","").strip()
    if not key: return "PENDING", "OPENAI_API_KEY 未配置。已同步上游并保存 diff，未调用 GPT。"
    model=src.get("model") or os.getenv("OPENAI_MODEL","").strip() or settings.get("default_model","gpt-5.6-sol")
    evidence=trim(diff, int(settings.get("max_diff_chars",30000)))
    body=json.dumps({"model":model,"instructions":review_rules(),"input":f"Source: {src.get('name',src['id'])}\nPlatform: {src.get('platform','unknown')}\nCategory: {src.get('category','unspecified')}\nURL/Repo: {src.get('url') or src.get('repo')}\n\n```diff\n{evidence}\n```","max_output_tokens":2200,"store":False}, ensure_ascii=False).encode()
    st,b,_=request("https://api.openai.com/v1/responses", {"Authorization":"Bearer "+key,"Content-Type":"application/json","User-Agent":settings.get("user_agent","chance-upstream-monitor/1.0")}, body, 90)
    if st != 200: return "ERROR", f"OpenAI API HTTP {st}: {b.decode('utf-8','replace')[:1200]}"
    obj=json.loads(b); chunks=[]
    for item in obj.get("output",[]):
        if item.get("type")!="message": continue
        for c in item.get("content",[]):
            if c.get("type")=="output_text" and isinstance(c.get("text"),str): chunks.append(c["text"])
    return model, "\n".join(chunks).strip() or "OpenAI API returned no output_text."

def check_http(src, st, settings):
    h={"User-Agent":settings.get("user_agent","chance-upstream-monitor/1.0"),"Accept-Encoding":"identity"}
    if st.get("etag"): h["If-None-Match"]=st["etag"]
    if st.get("last_modified"): h["If-Modified-Since"]=st["last_modified"]
    code,raw,rh=request(src["url"], h, timeout=int(settings.get("timeout_seconds",25)))
    if code==304: return False,False,"304 Not Modified",""
    if code!=200: raise RuntimeError(f"HTTP {code}: {src['url']}")
    data=normalize(raw, src.get("normalize","raw")); digest=sha256(data); old_digest=st.get("sha256")
    mirror=safe(ROOT/settings.get("mirror_root","upstream"), src["save_as"]); old=mirror.read_bytes() if mirror.exists() else b""
    newst={"kind":"http","url":src["url"],"sha256":digest,"etag":rh.get("ETag"),"last_modified":rh.get("Last-Modified"),"checked_at":now()}
    if old_digest is None:
        mirror.parent.mkdir(parents=True,exist_ok=True); mirror.write_bytes(data); st.clear(); st.update(newst); return False,True,"baseline created; GPT skipped",""
    if digest==old_digest:
        changed_meta=any(st.get(k)!=newst.get(k) for k in ("etag","last_modified")); st.update(newst); return False,changed_meta,"content hash unchanged",""
    mirror.parent.mkdir(parents=True,exist_ok=True); mirror.write_bytes(data); st.clear(); st.update(newst)
    return True,True,"content changed",udiff(old,data,"a/"+src["save_as"],"b/"+src["save_as"])

def check_repo(src, st, settings):
    ua=settings.get("user_agent","chance-upstream-monitor/1.0"); timeout=int(settings.get("timeout_seconds",25)); repo=src["repo"]; ref=urllib.parse.quote(src.get("ref","HEAD"),safe="")
    commit=gh_json(f"https://api.github.com/repos/{repo}/commits/{ref}",ua,timeout); head=commit["sha"]; old=st.get("remote_sha")
    if old is None: st.clear(); st.update({"kind":"github_repo","repo":repo,"ref":src.get("ref","HEAD"),"remote_sha":head,"checked_at":now()}); return False,True,"baseline commit recorded; GPT skipped",""
    if old==head: return False,False,"HEAD unchanged",""
    comp=gh_json(f"https://api.github.com/repos/{repo}/compare/{old}...{head}",ua,timeout); globs=src.get("include_globs",[]); base=safe(ROOT/settings.get("mirror_root","upstream"),src.get("save_as",src["id"])); chunks=[f"Repository: {repo}\nCompare: {old}...{head}\n"]
    matched=0
    for item in comp.get("files",[]):
        path=item.get("filename","")
        if not path or not selected(path,globs): continue
        matched+=1; status=item.get("status","modified"); patch=item.get("patch")
        chunks.append(f"\n--- file: {path} status={status} +{item.get('additions',0)} -{item.get('deletions',0)}\n")
        target=safe(base,path); old_bytes=target.read_bytes() if target.exists() else b""
        if status=="removed":
            if src.get("sync_changed_files",True) and target.exists(): target.unlink()
            chunks.append(udiff(old_bytes,b"","a/"+path,"/dev/null") if old_bytes else (patch or "[patch unavailable]\n")); continue
        raw_url=item.get("raw_url"); new_bytes=b""
        if src.get("sync_changed_files",True) and raw_url:
            rs,rb,_=request(raw_url,{"User-Agent":ua,"Accept-Encoding":"identity"},timeout=timeout)
            if rs==200: target.parent.mkdir(parents=True,exist_ok=True); target.write_bytes(rb); new_bytes=rb
        if patch: chunks.append(patch+"\n")
        elif old_bytes and new_bytes: chunks.append(udiff(old_bytes,new_bytes,"a/"+path,"b/"+path))
        else: chunks.append("[patch unavailable; manual inspection required]\n")
    st.clear(); st.update({"kind":"github_repo","repo":repo,"ref":src.get("ref","HEAD"),"remote_sha":head,"checked_at":now()})
    if not matched: return False,True,"repository changed; no monitored file matched",""
    return True,True,f"repository changed; {matched} monitored file(s) affected","".join(chunks)

def set_output(name,value):
    if p:=os.getenv("GITHUB_OUTPUT"):
        with open(p,"a",encoding="utf-8") as f:f.write(f"{name}={value}\n")

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--config",default=str(CONFIG)); ap.add_argument("--no-gpt",action="store_true"); args=ap.parse_args()
    cfg=load_json(Path(args.config),{}); settings=cfg.get("settings",{}); state_path=safe(ROOT,settings.get("state_file","monitor/state.json")); state=load_json(state_path,{"version":1,"sources":{}}); states=state.setdefault("sources",{})
    diff_root=safe(ROOT,settings.get("diff_root","monitor/diffs")); review_root=safe(ROOT,settings.get("review_root","monitor/reviews")); runtime=safe(ROOT,settings.get("runtime_root","monitor/.runtime")); results=[]; any_state=False
    for src in cfg.get("sources",[]):
        sid=src["id"]; s=states.setdefault(sid,{})
        try:
            if src["kind"]=="http": changed,state_changed,msg,diff=check_http(src,s,settings)
            elif src["kind"]=="github_repo": changed,state_changed,msg,diff=check_repo(src,s,settings)
            else: raise ValueError("unsupported source kind: "+src["kind"])
        except Exception as e:
            print(f"[error] {sid}: {type(e).__name__}: {e}",file=sys.stderr); results.append((src,False,False,"ERROR: "+str(e),None,None)); continue
        any_state|=state_changed; diff_path=review_path=None
        if changed:
            ddir=diff_root/sid; ddir.mkdir(parents=True,exist_ok=True); diff_path=ddir/(stamp()+".diff"); diff_path.write_text(diff or "# no textual patch\n","utf-8")
            if src.get("analysis","none")=="gpt":
                engine,text=("PENDING","--no-gpt enabled; upstream synchronized, awaiting review.") if args.no_gpt else call_gpt(src,diff,settings)
                rdir=review_root/sid; rdir.mkdir(parents=True,exist_ok=True); review_path=rdir/(stamp()+".md"); review_path.write_text(f"# Upstream Review: {src.get('name',sid)}\n\n- Source ID: `{sid}`\n- Review engine: `{engine}`\n- Diff: `{diff_path.relative_to(ROOT).as_posix()}`\n- Checked at: `{now()}`\n\n{text.strip()}\n","utf-8")
        print(f"[result] {sid}: {msg}"); results.append((src,changed,state_changed,msg,diff_path,review_path))
    if any_state: save_json(state_path,state)
    reviews=[r for r in results if r[5]]; summary=runtime/"review_summary.md"
    if reviews:
        runtime.mkdir(parents=True,exist_ok=True); lines=["# 上游更新审查\n\n",f"执行时间：`{now()}`\n\n"]
        for src,_,_,_,d,r in reviews: lines += [f"## {src.get('name',src['id'])}\n\n",f"- Diff: `{d.relative_to(ROOT).as_posix()}`\n",f"- Review: `{r.relative_to(ROOT).as_posix()}`\n\n"]
        summary.write_text("".join(lines),"utf-8")
    set_output("has_change","true" if any(r[1] for r in results) else "false"); set_output("has_review","true" if reviews else "false"); set_output("review_summary",summary.relative_to(ROOT).as_posix())
    return 0

if __name__=="__main__": raise SystemExit(main())
