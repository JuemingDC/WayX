// Repository-wide static audit for target configs and converter safety.
// Author: chance
// Category: Converter / Repository Audit
import fs from 'node:fs/promises';
import path from 'node:path';
import { validateQX } from '../src/qx-snippet-validator.mjs';
import { parseLoonPlugin } from '../src/plugin-parser.mjs';
import { validateSurgeModule } from '../src/surge-module.mjs';

const ROOT = process.cwd();
const findings = [];
const validated = { qx: 0, surge: 0, loon: 0 };

async function walk(dir) {
  const out = [];
  for (const ent of await fs.readdir(dir, {withFileTypes:true})) {
    if (ent.name === '.git' || ent.name === 'node_modules' || ent.name === '.runtime') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

const rel = p => path.relative(ROOT, p).split(path.sep).join('/');
const add = (file, line, code, text) => findings.push({file:rel(file), line, code, text:String(text).slice(0,240)});
const active = line => {
  const t = line.trim();
  return t && !t.startsWith('#') && !t.startsWith(';') && !t.startsWith('//');
};

const files = await walk(ROOT);
for (const file of files) {
  const rp = rel(file);
  if (!/\.(?:snippet|sgmodule|mjs|js|json|md|txt|yml|yaml|py|lpx|jq|list)$/i.test(rp)) continue;

  let text;
  try { text = await fs.readFile(file, 'utf8'); } catch { continue; }
  if (text.charCodeAt(0) === 0xFEFF) add(file, 1, 'bom', 'UTF-8 BOM present');
  if (/\r/.test(text)) add(file, 1, 'crlf', 'CR/CRLF newline present');

  const lines = text.split('\n');

  if (rp.endsWith('.snippet')) {
    try {
      validateQX(text, {id:rp});
      validated.qx++;
    } catch (error) {
      add(file, 1, 'qx-validator', error?.message || error);
    }
    for (let i=0;i<lines.length;i++) {
      const t=lines[i].trim();
      if (/^#!/.test(t)) add(file,i+1,'qx-active-metadata',t);
      if (/^#\s*Category:.*\bLoon\b/i.test(t)) add(file,i+1,'source-platform-category',t);
      if (/^\[(?:filter_local|rewrite_local|mitm)\]$/i.test(t)) add(file,i+1,'qx-active-section',t);
      if (/\[hH\]\[tT\]\[tT\]\[pP\]/.test(lines[i])) add(file,i+1,'synthetic-casefold',t);
      if (/\(\?i[:)]/.test(lines[i])) add(file,i+1,'undocumented-inline-i',t);
      if (active(lines[i]) && /jq-path=https?:\/\//.test(lines[i])) add(file,i+1,'unresolved-jq-path',t);
      if (active(lines[i]) && /\b(?:response-body-json-(?:del|replace|jq)|mock-response-body)\b/.test(lines[i])) add(file,i+1,'loon-rewrite-token-in-qx',t);
      if (active(lines[i]) && /^(?:request|response)\s+if\b/i.test(t)) add(file,i+1,'loon-rewrite-v2-in-qx',t);
      if (active(lines[i]) && /hostname\s*=\s*%APPEND%/i.test(t)) add(file,i+1,'surge-append-in-qx',t);
      if (active(lines[i]) && /^(?:ip-cidr|ip6-cidr|geoip|ip-asn),/i.test(t) && /,\s*no-resolve(?:,|$)/i.test(t)) add(file,i+1,'qx-no-resolve',t);
    }
  }

  if (rp.endsWith('.sgmodule')) {
    if (rp.startsWith('Adblock/Surge/')) {
      try {
        validateSurgeModule(text, {id:rp});
        validated.surge++;
      } catch (error) {
        add(file, 1, 'surge-adblock-validator', error?.message || error);
      }
    }
    for (let i=0;i<lines.length;i++) {
      const t=lines[i].trim();
      if (/^#!(?:author|icon|date|loon_version|homepage|tag|openurl|system_version|raw-url|tg-channel)\s*=/i.test(t)) add(file,i+1,'surge-nonmodule-metadata',t);
      if (/^#\s*Category:.*\bLoon\b/i.test(t)) add(file,i+1,'source-platform-category',t);
      if (/Original Loon(?: metadata)?/i.test(lines[i])) add(file,i+1,'source-platform-label',t);
      if (/\[hH\]\[tT\]\[tT\]\[pP\]/.test(lines[i])) add(file,i+1,'synthetic-casefold',t);
      if (/\(\?i[:)]/.test(lines[i])) add(file,i+1,'undocumented-inline-i',t);
      if (active(lines[i]) && /jq-path=https?:\/\//.test(lines[i])) add(file,i+1,'unresolved-jq-path',t);
      if (/^\[(?:Rewrite|Argument)\]$/i.test(t)) add(file,i+1,'source-section-in-surge',t);
      if (active(lines[i]) && /^(?:request|response)\s+if\b/i.test(t)) add(file,i+1,'loon-rewrite-v2-in-surge',t);
    }
  }

  if (rp.endsWith('.lpx') && rp.startsWith('Resource/Loon/')) {
    try {
      parseLoonPlugin(text);
      validated.loon++;
    } catch (error) {
      add(file, 1, 'source-plugin-parser', error?.message || error);
    }
  }

  if (/^(?:\.github\/converter\/src\/|\.github\/converter\/tools\/|\.github\/scripts\/)/.test(rp) && rp !== '.github/converter/tools/audit-repository.mjs') {
    for (let i=0;i<lines.length;i++) {
      const t=lines[i];
      if (/\[hH\]\[tT\]\[tT\]\[pP\]/.test(t)) add(file,i+1,'converter-synthetic-casefold',t.trim());
      if (/Original Loon metadata|# Original Loon:/.test(t)) add(file,i+1,'converter-source-platform-label',t.trim());
      if (/renderQxPrefsObjectBridge|renderQxScriptV2Bridge|adaptTiebaQX|adaptDianPingQX|adaptPinDuoDuo/.test(t)) add(file,i+1,'obsolete-script-body-adapter',t.trim());
    }
  }

  if (/^Script\/.+\.js$/.test(rp)) {
    for (let i=0;i<lines.length;i++) {
      if (/WayX.*(?:bridge|wrapper)|Script v2 ->|Converted Script/i.test(lines[i])) add(file,i+1,'script-body-adaptation-artifact',lines[i].trim());
    }
  }
}

if (findings.length) {
  console.error('Repository audit failed with ' + findings.length + ' finding(s):');
  for (const f of findings) console.error(`${f.file}:${f.line} [${f.code}] ${f.text}`);
  process.exitCode = 1;
} else {
  console.log(`Repository audit passed: QX=${validated.qx}, Surge adblock=${validated.surge}, source plugins=${validated.loon}; no validator or stale-pattern findings.`);
}
