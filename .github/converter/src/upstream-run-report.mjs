// Scheduled upstream conversion failure reporting.
// Author: chance
// Category: Converter / Automation / Failure Report

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseLoonPlugin } from './plugin-parser.mjs';

function activeDeclarations(text) {
  if (!text) return [];
  const parsed=parseLoonPlugin(text);
  const out=[];
  for (const [section,lines] of parsed.sections) {
    if (section === 'Argument') continue;
    for (const raw of lines) {
      const line=String(raw ?? '').trim();
      if (!line || /^(?:#|;|\/\/)/.test(line)) continue;
      out.push({section,line});
    }
  }
  return out;
}

function multiset(items) {
  const counts=new Map();
  for (const item of items) {
    const key=item.section+'\0'+item.line;
    counts.set(key,(counts.get(key)||0)+1);
  }
  return counts;
}

export function failureDeclarationContext(previous,current,{limit=40}={}) {
  const before=activeDeclarations(previous);
  const after=activeDeclarations(current);
  const counts=multiset(before);
  const changed=[];
  for (const item of after) {
    const key=item.section+'\0'+item.line;
    const count=counts.get(key)||0;
    if (count) counts.set(key,count-1);
    else changed.push(item);
  }
  if (changed.length) return {kind:'changed-upstream-declarations',items:changed.slice(0,limit)};
  if (after.length) return {kind:'current-upstream-declarations',items:after.slice(0,limit)};
  if (before.length) return {kind:'current-local-declarations',items:before.slice(0,limit)};
  return {kind:'unavailable',items:[]};
}

export function buildSyncFailure({entry,stage,error,previousSource=null,fetchedSource=null}) {
  const reason=String(error?.message || error || 'unknown failure');
  const detail=String(error?.stack || error?.message || error || 'unknown failure');
  const context=failureDeclarationContext(previousSource,fetchedSource);
  return {
    plugin:{
      id:entry.id,
      file:entry.file,
      source:entry.source,
      qx:entry.qx,
      surge:entry.surge,
    },
    stage,
    reason,
    detail,
    declarationContext:context.kind,
    declarations:context.items,
  };
}

export async function writeSyncFailureReport(root,failures,{runtimeDir='.github/monitor/.runtime'}={}) {
  const dir=path.join(root,runtimeDir);
  await fs.mkdir(dir,{recursive:true});
  const jsonPath=path.join(dir,'sync-failures.json');
  const markdownPath=path.join(dir,'sync-failures.md');
  await fs.writeFile(jsonPath,JSON.stringify({version:1,failures},null,2)+'\n');
  const lines=['# WayX scheduled sync failures','',`Total: ${failures.length}`,''];
  for (const failure of failures) {
    lines.push(
      '## '+failure.plugin.id,
      '',
      '- Stage: `'+failure.stage+'`',
      '- Reason: '+failure.reason,
      '- Source: `'+failure.plugin.file+'`',
      '- Upstream: '+failure.plugin.source,
      '',
      '### Related source declarations',
      ''
    );
    if (failure.declarations.length) {
      lines.push('```text');
      for (const item of failure.declarations) lines.push('['+item.section+'] '+item.line);
      lines.push('```','');
    } else {
      lines.push('(new upstream rule content unavailable)','');
    }
  }
  await fs.writeFile(markdownPath,lines.join('\n')+'\n');
  return {jsonPath,markdownPath};
}
