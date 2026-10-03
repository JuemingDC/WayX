// Direct upstream fetch utilities.
// Author: chance
// Category: Automation / Original Source Fetch
// Spec: Blocks 05 / 50 / 60 / 90
//
// WayX intentionally has no mirror/fallback source mechanism here.
// The caller must pass the URL declared by the original plugin/source.
// Transport/header profiles may vary by original host, but never substitute the URL.

import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

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
