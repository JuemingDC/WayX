// Shared external conversion-input materialization
// Author: chance
// Category: Converter / Context / Materialization

import { parseLoonPlugin } from './plugin-parser.mjs';
import { materializeRewriteDependencies } from './dependency-materializer.mjs';
import { materializeSourceScripts } from './source-script-materializer.mjs';
import { fetchOriginalText, fetchOriginalBytes } from './source-fetch.mjs';

export async function materializeConversionContext(entry,source,{
  fetchText=fetchOriginalText,
  fetchBytes=fetchOriginalBytes,
}={}) {
  const parsed=parseLoonPlugin(source);

  const [{mockFiles,jqFiles},scriptMap]=await Promise.all([
    materializeRewriteDependencies(entry,parsed,{fetchText,fetchBytes}),
    materializeSourceScripts(source,entry.source,{parsed,fetchText}),
  ]);

  return {
    parsed,
    scriptMap,
    mockFiles,
    jqFiles,
  };
}
