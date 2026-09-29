// Direct upstream fetch utilities.
// Author: chance
// Category: Automation / Original Source Fetch
// Spec: Blocks 05 / 50 / 60 / 90
//
// WayX intentionally has no mirror/fallback source mechanism here.
// The caller must pass the URL declared by the original plugin/source.

export const WAYX_FETCH_UA = 'StashCore/2.7.1 Stash/2.7.1 Clash/1.11.0';

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

async function fetchOriginal(url, {timeoutMs=20000, bytes=false}={}) {
  const sourceUrl=assertHttpUrl(url);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(), timeoutMs);
  try {
    const res=await fetch(sourceUrl, {
      headers:{'User-Agent':WAYX_FETCH_UA,'Accept':'*/*'},
      redirect:'follow',
      signal:controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from original source ${sourceUrl}`);
    if (bytes) {
      const value=Buffer.from(await res.arrayBuffer());
      if (!value.length) throw new Error('empty response from original source ' + sourceUrl);
      return value;
    }
    const value=String(await res.text()).replace(/\r\n?/g,'\n').replace(/^\uFEFF/,'');
    if (!value.trim()) throw new Error('empty response from original source ' + sourceUrl);
    return value;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchOriginalText(url, timeoutMs=20000) {
  return fetchOriginal(url, {timeoutMs,bytes:false});
}

export function fetchOriginalBytes(url, timeoutMs=20000) {
  return fetchOriginal(url, {timeoutMs,bytes:true});
}
