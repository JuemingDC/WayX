// Loon Source Script discovery and materialization
// Author: chance
// Category: Converter / Script / Materialization

import { isScriptV2, parseScriptV2 } from './script-v2.mjs';
import { groupSourceSectionItems } from './plugin-parser.mjs';
import { normalizePluginSource, parseLoonPlugin } from './plugin-parser.mjs';
import { fetchOriginalText, resolveOriginalUrl } from './source-fetch.mjs';

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
