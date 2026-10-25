// Modified: 2026-10-25 (chance). Own original transports and a disk-backed,
// run-scoped resource snapshot independently of parsing and target conversion.
// Author: chance
// Category: Converter / Resource Acquisition
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// source-fetch.mjs
// Direct upstream fetch utilities.
// Author: chance
// Category: Automation / Original Source Fetch
// Spec: Blocks 05 / 50 / 60 / 90
//
// WayX intentionally has no mirror/fallback source mechanism here.
// The caller must pass the URL declared by the original plugin/source.
// Transport/header profiles may vary by original host, but never substitute the URL.





const execFileAsync=promisify(execFile);
const PYTHON_FETCHER=fileURLToPath(new URL('../tools/fetch-upstream.py',import.meta.url));
// Modified: 2026-10-25 (chance). Separate text and binary resource budgets;
// callers may supply a per-request limit without changing process globals.
export const FETCH_LIMITS=Object.freeze({text:128*1024*1024,binary:512*1024*1024});
const TRANSIENT_FETCH_ATTEMPTS=3;
const TRANSIENT_FETCH_BASE_DELAY_MS=250;

export const WAYX_FETCH_UA='StashCore/2.7.1 Stash/2.7.1 Clash/1.11.0';
export const WAYX_LOON_FETCH_UA='Loon/764 CFNetwork/1498.700.1 Darwin/23.6.0 iPhone/17.6.1';

export const ORIGINAL_FETCH_PROFILES=Object.freeze({
  default:Object.freeze({
    id:'default',
    transport:'node-fetch',
    userAgent:WAYX_FETCH_UA,
    accept:'*/*',
  }),
  kelee:Object.freeze({
    id:'kelee',
    transport:'python-urllib',
    userAgent:WAYX_LOON_FETCH_UA,
    accept:'*/*',
  }),
  rucu6:Object.freeze({
    id:'rucu6',
    transport:'python-urllib',
    userAgent:WAYX_LOON_FETCH_UA,
    accept:'*/*',
  }),
});

function assertHttpUrl(value) {
  const text=String(value ?? '').trim();
  let url;
  try { url=new URL(text); }
  catch { throw new Error('source URL must be absolute: ' + text); }
  if (!['http:','https:'].includes(url.protocol)) {
    throw new Error('source URL must use HTTP(S): ' + text);
  }
  return text;
}

export function selectOriginalFetchProfile(value) {
  const sourceUrl=assertHttpUrl(value);
  const hostname=new URL(sourceUrl).hostname.toLowerCase();
  if (hostname==='kelee.one' || hostname.endsWith('.kelee.one')) {
    return ORIGINAL_FETCH_PROFILES.kelee;
  }
  if (hostname==='rucu6.pages.dev') {
    return ORIGINAL_FETCH_PROFILES.rucu6;
  }
  return ORIGINAL_FETCH_PROFILES.default;
}

export function resolveOriginalUrl(reference, baseUrl=null) {
  const ref=String(reference ?? '').trim();
  if (!ref) throw new Error('empty original source reference');
  try {
    const absolute=new URL(ref);
    if (!['http:','https:'].includes(absolute.protocol)) throw new Error('unsupported protocol');
    return absolute.toString();
  } catch (error) {
    if (!baseUrl) throw new Error('relative source reference requires original plugin URL: ' + ref);
    let resolved;
    try { resolved=new URL(ref, assertHttpUrl(baseUrl)); }
    catch { throw new Error('cannot resolve original source reference: ' + ref); }
    if (!['http:','https:'].includes(resolved.protocol)) {
      throw new Error('resolved source reference must use HTTP(S): ' + resolved.toString());
    }
    return resolved.toString();
  }
}

async function fetchViaNode(sourceUrl, profile, timeoutMs, maxBytes) {
  const controller=new AbortController();
  // Modified: 2026-10-25 (chance). Give deadline failures a stable retry code.
  const timeoutError=Object.assign(new Error(`Original source timed out: ${sourceUrl}`),{code:'ETIMEDOUT'});
  const timer=setTimeout(()=>controller.abort(timeoutError),timeoutMs);
  try {
    const res=await fetch(sourceUrl,{
      headers:{'User-Agent':profile.userAgent,'Accept':profile.accept},
      redirect:'follow',
      signal:controller.signal,
    });
    if (!res.ok) {
      await res.body?.cancel();
      throw Object.assign(new Error(`HTTP ${res.status} from original source ${sourceUrl}`),{status:res.status});
    }
    // Modified: 2026-10-25 (chance). Bound actual streamed bytes, including
    // decompressed responses without a trustworthy Content-Length header.
    const chunks=[];
    let size=0;
    for await (const chunk of res.body ?? []) {
      size+=chunk.byteLength;
      if(size>maxBytes) {
        controller.abort();
        throw Object.assign(new Error(`Source exceeds bounded download size: ${sourceUrl}`),{code:'ERR_FETCH_SIZE'});
      }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks,size);
  } catch(error) {
    if(controller.signal.reason===timeoutError)throw timeoutError;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchViaPython(sourceUrl, profile, timeoutMs, maxBytes) {
  const timeoutSeconds=Math.max(1,Math.ceil(timeoutMs/1000));
  try {
    const {stdout}=await execFileAsync('python3',[
      PYTHON_FETCHER,
      '--url',sourceUrl,
      '--user-agent',profile.userAgent,
      '--accept',profile.accept,
      '--timeout-seconds',String(timeoutSeconds),
      '--max-bytes',String(maxBytes),
    ],{
      encoding:null,
      maxBuffer:maxBytes,
      timeout:timeoutMs+5000,
      killSignal:'SIGKILL',
      windowsHide:true,
    });
    return Buffer.from(stdout);
  } catch (error) {
    const stderr=Buffer.isBuffer(error?.stderr)
      ? error.stderr.toString('utf8').trim()
      : String(error?.stderr ?? '').trim();
    const detail=stderr || String(error?.message ?? error);
    // Modified: 2026-10-25 (chance). Preserve subprocess deadline failures for retry.
    const failure=new Error(`Python urllib fetch failed from original source ${sourceUrl}: ${detail}`,{cause:error});
    if(error.code===25)failure.code='ERR_FETCH_SIZE';
    const status=stderr.match(/^HTTP (\d{3})\b/);
    if(status)failure.status=Number(status[1]);
    if(error.killed && error.signal==='SIGKILL')failure.code='ETIMEDOUT';
    throw failure;
  }
}

function isTransientFetchError(error) {
  // Modified: 2026-10-25 (chance). Node fetch exposes network codes in cause;
  // permanent size failures must never become retries through message matching.
  if(error?.code==='ERR_FETCH_SIZE')return false;
  if(error?.status)return [408,425,429].includes(error.status) || (error.status>=500 && error.status<=599);
  const codes=new Set(['ECONNRESET','ECONNREFUSED','EAI_AGAIN','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','UND_ERR_SOCKET']);
  for(let cause=error,seen=new Set();cause && !seen.has(cause);cause=cause.cause) {
    seen.add(cause);
    if(codes.has(cause.code))return true;
  }
  const text=String(error?.message ?? error);
  return /(?:ECONNRESET|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT|Connection reset|Temporary failure|timed out|Timeout|HTTP (?:408|425|429|5\d\d)\b)/i.test(text);
}

function delay(ms) {
  return new Promise(resolve=>setTimeout(resolve,ms));
}

async function fetchOriginalBuffer(url, timeoutMs, maxBytes) {
  const sourceUrl=assertHttpUrl(url);
  const profile=selectOriginalFetchProfile(sourceUrl);
  const fetcher=profile.transport==='python-urllib' ? fetchViaPython : fetchViaNode;
  let lastError=null;

  for (let attempt=1; attempt<=TRANSIENT_FETCH_ATTEMPTS; attempt++) {
    try {
      const value=await fetcher(sourceUrl,profile,timeoutMs,maxBytes);
      if (!value.length) throw new Error('empty response from original source ' + sourceUrl);
      return value;
    } catch (error) {
      lastError=error;
      if (attempt>=TRANSIENT_FETCH_ATTEMPTS || !isTransientFetchError(error)) throw error;
      await delay(TRANSIENT_FETCH_BASE_DELAY_MS * (2 ** (attempt-1)));
    }
  }

  throw lastError;
}

async function fetchOriginal(url, {timeoutMs=20000, bytes=false,maxBytes=bytes?FETCH_LIMITS.binary:FETCH_LIMITS.text}={}) {
  if(!Number.isSafeInteger(maxBytes) || maxBytes<1)throw new TypeError('maxBytes must be a positive safe integer');
  if(!Number.isFinite(timeoutMs) || timeoutMs<=0)throw new TypeError('timeoutMs must be positive');
  const sourceUrl=assertHttpUrl(url);
  const value=await fetchOriginalBuffer(sourceUrl,timeoutMs,maxBytes);
  if (bytes) return value;
  const text=value.toString('utf8').replace(/\r\n?/g,'\n').replace(/^\uFEFF/,'');
  if (!text.trim()) throw new Error('empty response from original source ' + sourceUrl);
  return text;
}

export function fetchOriginalText(url, options=20000) {
  return fetchOriginal(url,{...(typeof options==='number'?{timeoutMs:options}:options),bytes:false});
}

export function fetchOriginalBytes(url, options=20000) {
  return fetchOriginal(url,{...(typeof options==='number'?{timeoutMs:options}:options),bytes:true});
}


// Modified: 2026-10-25 (chance). Standalone materializer APIs share one read
// context across their declarations too; rejected promises remain deterministic.
export function memoizeResourceReads({fetchText=fetchOriginalText,fetchBytes=fetchOriginalBytes}={}) {
  const pending=new Map();
  const once=(kind,url,read)=>{
    const key=JSON.stringify([kind,assertHttpUrl(url),selectOriginalFetchProfile(url)]);
    if(!pending.has(key))pending.set(key,Promise.resolve().then(()=>read(url)));
    return pending.get(key);
  };
  return {fetchText:url=>once('text',url,fetchText),fetchBytes:url=>once('binary',url,fetchBytes)};
}

// One successful response per original URL/request profile for this run. Failed
// requests retain their final error after transport retries; no later plugin
// silently retries into a different upstream version. Disk storage bounds the
// cache's retained memory; callers get independent byte buffers.
export function createResourceSnapshot({directory,fetchBytes=fetchOriginalBytes,fetchText=null}={}) {
  if(!directory)throw new TypeError('Resource snapshot requires a run directory');
  const pending=new Map(),records=new Map();
  let sealed=false;
  const keyFor=url=>JSON.stringify([assertHttpUrl(url),selectOriginalFetchProfile(url)]);
  async function read(url,kind) {
    const original=assertHttpUrl(url),key=keyFor(original),limit=FETCH_LIMITS[kind];
    if(!pending.has(key)) {
      if(sealed)throw new Error('Resource snapshot is sealed: '+original);
      pending.set(key,(async()=>{
        try {
          const bytes=kind==='text' && fetchText
            ? Buffer.from(await fetchText(original),'utf8')
            : Buffer.from(await fetchBytes(original,{maxBytes:limit}));
          if(bytes.length>limit)throw Object.assign(new Error('Source exceeds bounded download size: '+original),{code:'ERR_FETCH_SIZE'});
          const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
          await fs.mkdir(directory,{recursive:true});
          const file=path.join(directory,crypto.createHash('sha256').update(key).digest('hex')+'.bin');
          await fs.writeFile(file,bytes);
          const record={url:original,profile:selectOriginalFetchProfile(original).id,sha256,size:bytes.length,storage:path.basename(file)};
          records.set(key,record);
          return {file,...record};
        }catch(error){records.set(key,{url:original,error:String(error.message || error)});throw error;}
      })());
    }
    const record=await pending.get(key);
    if(record.size>limit)throw Object.assign(new Error('Source exceeds '+kind+' download size: '+original),{code:'ERR_FETCH_SIZE'});
    const bytes=await fs.readFile(record.file);
    if(bytes.length!==record.size || crypto.createHash('sha256').update(bytes).digest('hex')!==record.sha256)throw new Error('Resource snapshot checksum mismatch: '+original);
    return bytes;
  }
  return Object.freeze({
    fetchBytes:url=>read(url,'binary'),
    fetchText:async url=>{
      const text=(await read(url,'text')).toString('utf8').replace(/\r\n?/g,'\n').replace(/^\uFEFF/,'');
      if(!text.trim())throw new Error('empty response from original source '+url);
      return text;
    },
    async seal(){
      sealed=true;
      await Promise.allSettled(pending.values());
      await fs.mkdir(directory,{recursive:true});
      await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify({version:1,resources:[...records.values()]},null,2)+'\n');
    },
  });
}
