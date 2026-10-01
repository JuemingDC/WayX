// Loon Legacy Script parser
// Author: chance
// Category: Converter / Script / Source Parsing

import { splitScriptV2Csv } from './script-v2.mjs';
export const LOON_LEGACY_SCRIPT_OPTION_NAMES = new Set([
  'script-path',
  'tag',
  'requires-body',
  'binary-body-mode',
  'timeout',
  'max-size',
  'argument',
  'enable',
  'enabled',
  'debug',
]);


export function parseLegacyScriptLine(source) {
  const raw=String(source ?? '').trim();
  const match=raw.match(/^(http-request|http-response)\s+(\S+)\s+(.+)$/i);
  if (!match) return null;

  const type=match[1].toLowerCase();
  const phase=type.replace(/^http-/,'');
  const pattern=match[2];
  const rest=match[3];
  const options=new Map();
  const optionList=[];

  for (const token of splitScriptV2Csv(rest)) {
    const eq=token.indexOf('=');
    if (eq<1) return null;
    const name=token.slice(0,eq).trim().toLowerCase();
    const value=token.slice(eq+1).trim();
    if(!LOON_LEGACY_SCRIPT_OPTION_NAMES.has(name) || options.has(name) || !value) return null;
    options.set(name,value);
    optionList.push({type:'option',name,value,raw:token});
  }

  const scriptPath=options.get('script-path') || null;
  const tag=options.get('tag') || null;
  const requiresBody=/^(?:true|1)$/i.test(options.get('requires-body') || '');
  const binary=/^(?:true|1)$/i.test(options.get('binary-body-mode') || '');
  const timeout=options.get('timeout') || null;
  const maxSize=options.get('max-size') || null;
  const argument=options.get('argument') || null;
  const enable=options.get('enable') ?? options.get('enabled') ?? null;
  const debug=options.get('debug') ?? null;

  return {
    type:'script',
    syntax:'loon-script-legacy',
    phase,
    httpType:type,
    pattern,
    script:{path:scriptPath},
    options:optionList,
    optionMap:options,
    tag,
    requiresBody,
    binaryBodyMode:binary,
    timeout,
    maxSize,
    argument,
    enable,
    debug,
    raw,
  };
}
