// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / input

import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import { isScriptV2, parseScriptV2 } from "./script.mjs";
import { minifyJqFile, isRewriteV2, parseRewriteV2, validateRewriteV2Ast, legacyRewriteToSemanticIr, dependencySpecFromAction, jqDependencySpecFromAction, legacyJqPathDependencySpecFromIr } from "./rewrite.mjs";



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
const MAX_FETCH_BYTES=64*1024*1024;
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

async function fetchViaNode(sourceUrl, profile, timeoutMs) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const res=await fetch(sourceUrl,{
      headers:{'User-Agent':profile.userAgent,'Accept':profile.accept},
      redirect:'follow',
      signal:controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from original source ${sourceUrl}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function fetchViaPython(sourceUrl, profile, timeoutMs) {
  const timeoutSeconds=Math.max(1,Math.ceil(timeoutMs/1000));
  try {
    const {stdout}=await execFileAsync('python3',[
      PYTHON_FETCHER,
      '--url',sourceUrl,
      '--user-agent',profile.userAgent,
      '--accept',profile.accept,
      '--timeout-seconds',String(timeoutSeconds),
    ],{
      encoding:null,
      maxBuffer:MAX_FETCH_BYTES,
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
    throw new Error(`Python urllib fetch failed from original source ${sourceUrl}: ${detail}`);
  }
}

function isTransientFetchError(error) {
  const text=String(error?.message ?? error);
  return /(?:ECONNRESET|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT|Connection reset|Temporary failure|timed out|Timeout|HTTP (?:408|425|429|5\d\d)\b)/i.test(text);
}

function delay(ms) {
  return new Promise(resolve=>setTimeout(resolve,ms));
}

async function fetchOriginalBuffer(url, timeoutMs) {
  const sourceUrl=assertHttpUrl(url);
  const profile=selectOriginalFetchProfile(sourceUrl);
  const fetcher=profile.transport==='python-urllib' ? fetchViaPython : fetchViaNode;
  let lastError=null;

  for (let attempt=1; attempt<=TRANSIENT_FETCH_ATTEMPTS; attempt++) {
    try {
      const value=await fetcher(sourceUrl,profile,timeoutMs);
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

async function fetchOriginal(url, {timeoutMs=20000, bytes=false}={}) {
  const sourceUrl=assertHttpUrl(url);
  const value=await fetchOriginalBuffer(sourceUrl,timeoutMs);
  if (bytes) return value;
  const text=value.toString('utf8').replace(/\r\n?/g,'\n').replace(/^\uFEFF/,'');
  if (!text.trim()) throw new Error('empty response from original source ' + sourceUrl);
  return text;
}

export function fetchOriginalText(url, timeoutMs=20000) {
  return fetchOriginal(url,{timeoutMs,bytes:false});
}

export function fetchOriginalBytes(url, timeoutMs=20000) {
  return fetchOriginal(url,{timeoutMs,bytes:true});
}

// source-catalog.mjs
// WayX declarative Loon source catalog
// Author: chance
// Category: Converter / Source Catalog


const REQUIRED = Object.freeze(['id','file','source','qx','surge','category']);

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeRelativePath(value, field) {
  const path = cleanString(value);
  if (!path) throw new Error(`catalog entry missing ${field}`);
  if (path.startsWith('/') || path.includes('\\') || path.split('/').includes('..')) {
    throw new Error(`catalog ${field} must be a safe repository-relative path: ${path}`);
  }
  return path;
}

function absoluteHttpUrl(value, field) {
  const text=cleanString(value);
  let url;
  try { url=new URL(text); }
  catch { throw new Error(`catalog ${field} must be an absolute URL: ${text}`); }
  if (!['http:','https:'].includes(url.protocol)) {
    throw new Error(`catalog ${field} must use HTTP(S): ${text}`);
  }
  return text;
}

export function validateLoonSourceEntry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('catalog entry must be an object');
  }
  for (const field of REQUIRED) {
    if (!cleanString(input[field])) throw new Error(`catalog entry missing ${field}`);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'mirrors')) {
    throw new Error('catalog mirrors are forbidden; use the original author source URL only');
  }

  const entry = {
    id: cleanString(input.id),
    file: safeRelativePath(input.file, 'file'),
    source: absoluteHttpUrl(input.source, 'source'),
    qx: safeRelativePath(input.qx, 'qx'),
    surge: safeRelativePath(input.surge, 'surge'),
    category: cleanString(input.category)
  };

  if (!/^[A-Za-z0-9._-]+$/.test(entry.id)) {
    throw new Error(`catalog id contains unsupported characters: ${entry.id}`);
  }
  if (!/\.lpx$/i.test(entry.file)) throw new Error(`catalog file must end in .lpx: ${entry.file}`);
  if (!/\.snippet$/i.test(entry.qx)) throw new Error(`catalog qx target must end in .snippet: ${entry.qx}`);
  if (!/\.sgmodule$/i.test(entry.surge)) throw new Error(`catalog surge target must end in .sgmodule: ${entry.surge}`);

  return Object.freeze(entry);
}

export function validateLoonSourceCatalog(input) {
  if (!Array.isArray(input)) throw new TypeError('Loon source catalog must be an array');
  const entries = input.map(validateLoonSourceEntry);
  const seen = {
    id:new Set(),
    file:new Set(),
    qx:new Set(),
    surge:new Set(),
  };
  for (const entry of entries) {
    for (const field of Object.keys(seen)) {
      const key=entry[field];
      if (seen[field].has(key)) throw new Error(`duplicate catalog ${field}: ${key}`);
      seen[field].add(key);
    }
  }
  return Object.freeze(entries);
}

export async function loadLoonSourceCatalog(file) {
  const raw=JSON.parse(await fs.readFile(file,'utf8'));
  return validateLoonSourceCatalog(raw);
}

// plugin-parser.mjs
// Loon source parser and section/comment structure
// Author: chance
// Category: Converter / Source Parsing

export const WAYX_SUPPORTED_SOURCE_SECTIONS = new Set([
  'Argument',
  'General',
  'Rule',
  'Rewrite',
  'Script',
  'MITM',
  'MitM',
]);

export function normalizePluginSource(text) {
  return String(text ?? '').replace(/\r\n?/g,'\n').replace(/^\uFEFF/,'');
}

export function parseLoonPlugin(text) {
  const header=[];
  const sections=new Map();
  let current=null;

  for (const raw of normalizePluginSource(text).split('\n')) {
    const match=raw.trim().match(/^\[([^\]]+)\]$/);
    if (match) {
      current=match[1];
      if (!sections.has(current)) sections.set(current,[]);
      continue;
    }
    if (current===null) header.push(raw);
    else sections.get(current).push(raw);
  }

  return {header,sections};
}

export function isSupportedSourceSection(name) {
  return WAYX_SUPPORTED_SOURCE_SECTIONS.has(String(name ?? ''));
}

export function groupSourceSectionItems(lines = []) {
  const items=[];
  let pending=[];
  for (let sourceIndex=0; sourceIndex<lines.length; sourceIndex++) {
    const raw=String(lines[sourceIndex] ?? '');
    const trimmed=raw.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';') || trimmed.startsWith('//')) {
      pending.push(lines[sourceIndex]);
      continue;
    }
    items.push({comments:pending,line:trimmed,sourceIndex});
    pending=[];
  }
  if (pending.length) items.push({comments:pending,line:null,sourceIndex:lines.length});
  return items;
}

export function cleanSourceComments(comments = []) {
  return comments
    .map(value=>value || '')
    .map(value=>String(value).trim() ? String(value) : '')
    .filter((value,index,all)=>!(value==='' && all[index-1]===''));
}

export function sourceCommentText(raw) {
  const text=String(raw ?? '').trim();
  const match=text.match(/^(?:#|;|\/\/)\s*(.*?)\s*$/);
  return match ? match[1].trim() : null;
}

// source-script-materializer.mjs
// Loon Source Script discovery and materialization
// Author: chance
// Category: Converter / Script / Materialization






// Loon Source Script discovery and materialization
// Author: chance
// Category: Converter / Script / Materialization

export function discoverSourceScriptUrls(source,{parsed=null}={}) {
  const text=String(source ?? '');
  const urls=new Set(
    [...text.matchAll(/script-path=([^,\s]+)/gi)].map(match=>match[1].trim())
  );

  const plugin=parsed || parseLoonPlugin(text);
  for (const item of groupSourceSectionItems(plugin.sections.get('Script'))) {
    if (!item.line || !isScriptV2(item.line)) continue;
    try {
      urls.add(parseScriptV2(item.line).script.path);
    } catch {
      // Invalid Script v2 syntax is handled by the conversion pipeline.
    }
  }
  return [...urls];
}

export async function inspectSourceScript(reference,pluginSourceUrl,{
  fetchText=fetchOriginalText,
}={}) {
  const originalUrl=resolveOriginalUrl(reference,pluginSourceUrl);
  try {
    const normalized=normalizePluginSource(await fetchText(originalUrl)).replace(/\n*$/,'\n');
    return {
      qx:originalUrl,
      surge:originalUrl,
      source:normalized,
      sourceError:null,
    };
  } catch (error) {
    return {
      qx:originalUrl,
      surge:originalUrl,
      source:'',
      sourceError:String(error?.message || error),
    };
  }
}

export async function materializeSourceScripts(source,pluginSourceUrl,{
  parsed=null,
  fetchText=fetchOriginalText,
}={}) {
  const scriptMap=new Map();
  for (const reference of discoverSourceScriptUrls(source,{parsed})) {
    scriptMap.set(
      reference,
      await inspectSourceScript(reference,pluginSourceUrl,{fetchText}),
    );
  }
  return scriptMap;
}

// dependency-materializer.mjs
// Loon Rewrite dependency discovery and materialization
// Author: chance
// Category: Converter / Dependency / Materialization

export async function materializeMockFiles(entry,parsed,{
  fetchText=fetchOriginalText,
  fetchBytes=fetchOriginalBytes,
}={}) {
  const out=new Map();
  for (const item of groupSourceSectionItems(parsed?.sections?.get('Rewrite'))) {
    if (!item.line || !isRewriteV2(item.line)) continue;
    try {
      const ast=parseRewriteV2(item.line);
      validateRewriteV2Ast(ast);
      const mockFileActions=ast.actions.filter(action=>/^(?:request|response)\.body\.mock_file$/.test(action.name));
      if (mockFileActions.length!==1) continue;

      const plan=dependencySpecFromAction(mockFileActions[0],{pluginSourceUrl:entry.source});
      if (plan.base64) {
        const text=await fetchText(plan.url);
        const compact=String(text).replace(/\s+/g,'');
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length%4===1) {
          throw new Error('invalid Base64 mock_file content');
        }
        out.set(item.line,{
          bodyBase64:Buffer.from(compact,'base64').toString('base64'),
          sourceFile:plan.url,
        });
      } else if (plan.binary) {
        const bytes=await fetchBytes(plan.url);
        out.set(item.line,{
          bodyBase64:Buffer.from(bytes).toString('base64'),
          sourceFile:plan.url,
        });
      } else {
        const text=await fetchText(plan.url);
        out.set(item.line,{
          bodyText:text,
          sourceFile:plan.url,
        });
      }
    } catch (error) {
      out.set(item.line,{error:String(error?.message || error).split('\n')[0]});
    }
  }
  return out;
}

function splitLegacyRewriteLine(line) {
  const source=String(line ?? '').trim();
  const idx=source.search(/\s/);
  if (idx<0) return null;
  const pattern=source.slice(0,idx).trim();
  const action=source.slice(idx).trim().replace(/^\-\s+/,'');
  if (!pattern || !action) return null;
  return {pattern,action};
}

export async function materializeJqFiles(entry,parsed,{
  fetchText=fetchOriginalText,
}={}) {
  const out=new Map();
  for (const item of groupSourceSectionItems(parsed?.sections?.get('Rewrite'))) {
    if (!item.line) continue;
    try {
      let spec=null;
      if (isRewriteV2(item.line)) {
        const ast=parseRewriteV2(item.line);
        validateRewriteV2Ast(ast);
        if (ast.actions.length!==1) continue;
        spec=jqDependencySpecFromAction(ast.actions[0],{pluginSourceUrl:entry.source});
      } else {
        const legacy=splitLegacyRewriteLine(item.line);
        if (!legacy) continue;
        const ir=legacyRewriteToSemanticIr(legacy.pattern,legacy.action);
        spec=legacyJqPathDependencySpecFromIr(ir,{pluginSourceUrl:entry.source});
      }

      if (!spec) continue;
      if (!spec.resolvable || !spec.url) {
        throw new Error(spec.reason || 'JQ dependency is not resolvable');
      }

      const text=await fetchText(spec.url);
      const content=minifyJqFile(text);
      if (!content) throw new Error('JQ dependency resolved to empty content');
      out.set(item.line,{
        content,
        sourceFile:spec.url,
        legacyAlias:Boolean(spec.legacyAlias),
      });
    } catch (error) {
      out.set(item.line,{error:String(error?.message || error).split('\n')[0]});
    }
  }
  return out;
}

export async function materializeRewriteDependencies(entry,parsed,options={}) {
  const [mockFiles,jqFiles]=await Promise.all([
    materializeMockFiles(entry,parsed,options),
    materializeJqFiles(entry,parsed,options),
  ]);
  return {mockFiles,jqFiles};
}
