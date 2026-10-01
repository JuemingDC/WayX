// WayX automated conversion issue proposer.
// Author: chance
// Category: Automation / Conversion / Issue Proposal

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadLoonSourceCatalog } from '../../converter/src/source-catalog.mjs';
import { parseLoonPlugin } from '../../converter/src/plugin-parser.mjs';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT,'.github','sources','loon.json');
const TARGET_DIRS = [
  path.join(ROOT,'Adblock','Quantumult X'),
  path.join(ROOT,'Adblock','Surge'),
];
const runtimeDir = path.join(ROOT,'monitor','.runtime');
const syncFailurePath = path.join(runtimeDir,'sync-failures.json');
const summaryPath = path.join(runtimeDir,'conversion-issues.md');
const dryRun = process.argv.includes('--dry-run');
const repo = process.env.GITHUB_REPOSITORY || '';

const REVIEW_RE=/^# \[WayX\]\s*([^:]*REVIEW REQUIRED):\s*(.*)$/;
const ISSUE_RE=/^# \[WayX\]\s*ISSUE REQUIRED \[([^\]]+)\]:\s*(.*)$/;
const SOURCE_RE=/^# Source declaration:\s*(.*)$/;

function gh(args) {
  return execFileSync('gh',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
}

function fingerprint(parts) {
  return crypto.createHash('sha256').update(parts.map(x=>String(x ?? '')).join('\0')).digest('hex').slice(0,16);
}

async function readJson(file,fallback) {
  try { return JSON.parse(await fs.readFile(file,'utf8')); } catch { return fallback; }
}

async function targetFiles() {
  const out=[];
  for (const dir of TARGET_DIRS) {
    let entries=[];
    try { entries=await fs.readdir(dir,{withFileTypes:true}); } catch { continue; }
    for (const entry of entries) {
      if (!entry.isFile() || !/\.(?:snippet|sgmodule)$/i.test(entry.name)) continue;
      out.push(path.join(dir,entry.name));
    }
  }
  return out.sort();
}

function extractTargetMarkers(text,file) {
  const lines=String(text ?? '').replace(/\r\n?/g,'\n').split('\n');
  const out=[];
  for (let i=0;i<lines.length;i++) {
    const value=lines[i].trim();
    const review=value.match(REVIEW_RE);
    const issue=value.match(ISSUE_RE);
    if (!review && !issue) continue;
    let source='';
    for (let j=i+1;j<Math.min(lines.length,i+5);j++) {
      const candidate=lines[j].trim();
      const match=candidate.match(SOURCE_RE);
      if (match) { source=match[1].trim(); break; }
      if (REVIEW_RE.test(candidate) || ISSUE_RE.test(candidate) || /^\[[^\]]+\]$/.test(candidate)) break;
    }
    out.push({
      kind:review ? 'review' : 'unknown',
      code:review ? review[1].trim() : issue[1].trim(),
      reason:(review ? review[2] : issue[2]).trim(),
      source,
      file,
      line:i+1,
    });
  }
  return out;
}

function targetMap(catalog) {
  const map=new Map();
  for (const entry of catalog) {
    map.set('Adblock/Quantumult X/'+entry.qx,entry);
    map.set('Adblock/Surge/'+entry.surge,entry);
  }
  return map;
}

async function sourceSectionFor(entry,declaration) {
  if (!entry || !declaration) return null;
  try {
    const text=await fs.readFile(path.join(ROOT,'Resource','Loon',entry.file),'utf8');
    const parsed=parseLoonPlugin(text);
    for (const [section,lines] of parsed.sections) {
      if (lines.some(line=>String(line).trim()===declaration)) return section;
    }
  } catch {}
  return null;
}

async function groupedTargetProblems(catalog) {
  const mapping=targetMap(catalog);
  const groups=new Map();
  for (const file of await targetFiles()) {
    const relative=path.relative(ROOT,file).replaceAll(path.sep,'/');
    const entry=mapping.get(relative);
    if (!entry) continue;
    const text=await fs.readFile(file,'utf8');
    for (const marker of extractTargetMarkers(text,relative)) {
      const key=fingerprint([entry.id,marker.kind,marker.code,marker.source]);
      if (!groups.has(key)) {
        groups.set(key,{
          fingerprint:key,
          kind:marker.kind,
          code:marker.code,
          plugin:entry,
          source:marker.source,
          reasons:new Set(),
          locations:[],
        });
      }
      const group=groups.get(key);
      if (marker.reason) group.reasons.add(marker.reason);
      if (!group.locations.some(x=>x.file===marker.file && x.line===marker.line)) {
        group.locations.push({file:marker.file,line:marker.line});
      }
    }
  }
  const out=[];
  for (const group of groups.values()) {
    out.push({
      ...group,
      reasons:[...group.reasons].sort(),
      sourceSection:await sourceSectionFor(group.plugin,group.source),
    });
  }
  return out.sort((a,b)=>a.fingerprint.localeCompare(b.fingerprint));
}

function ruleBlock(section,declarations) {
  if (!declarations?.length) return '(new upstream rule content unavailable)';
  return declarations.map(item=>{
    if (typeof item === 'string') return item;
    return '['+(item.section || section || 'Source')+'] '+item.line;
  }).join('\n');
}

export function targetProblemIssueBody(group) {
  const plugin=group.plugin;
  return [
    '## Related plugin',
    '',
    '- Plugin: '+plugin.id,
    '- Source file: Resource/Loon/'+plugin.file,
    '- Upstream: '+plugin.source,
    '- Quantumult X target: Adblock/Quantumult X/'+plugin.qx,
    '- Surge target: Adblock/Surge/'+plugin.surge,
    '',
    '## Failure reason',
    '',
    '- Type: '+group.kind,
    '- Code: '+group.code,
    ...group.reasons.map(reason=>'- '+reason),
    '',
    '## Corresponding source rule',
    '',
    '~~~text',
    (group.sourceSection ? '['+group.sourceSection+'] ' : '')+(group.source || '(source declaration unavailable)'),
    '~~~',
    '',
    '## Generated target locations',
    '',
    ...(group.locations.length ? group.locations.map(x=>'- '+x.file+':'+x.line) : ['- (none)']),
    '',
    '## Automation behavior',
    '',
    'WayX failed closed for this declaration. No guessed active target rule is generated. The scheduled GitHub Actions workflow keeps processing other plugins and tracks this problem through this Issue.',
    '',
  ].join('\n');
}

export function syncFailureIssueBody(failure) {
  const plugin=failure.plugin;
  return [
    '## Related plugin',
    '',
    '- Plugin: '+plugin.id,
    '- Source file: Resource/Loon/'+plugin.file,
    '- Upstream: '+plugin.source,
    '- Quantumult X target: Adblock/Quantumult X/'+plugin.qx,
    '- Surge target: Adblock/Surge/'+plugin.surge,
    '',
    '## Failure reason',
    '',
    '- Stage: '+failure.stage,
    '- Reason: '+failure.reason,
    '',
    '~~~text',
    failure.detail || failure.reason,
    '~~~',
    '',
    '## Corresponding source rule',
    '',
    '- Context: '+failure.declarationContext,
    '',
    '~~~text',
    ruleBlock(null,failure.declarations),
    '~~~',
    '',
    '## Automation behavior',
    '',
    'This plugin did not pass the scheduled conversion/validation transaction, so its new upstream Source/targets are not intentionally committed by the converter. Other plugins continue independently.',
    '',
  ].join('\n');
}

function targetProblemTitle(group) {
  return '[conversion-'+group.kind+':'+group.fingerprint+'] '+group.plugin.id+' '+group.code;
}

function syncFailureTitle(failure) {
  const fp=fingerprint([
    failure.plugin.id,
    failure.stage,
    failure.reason,
    ...(failure.declarations || []).map(x=>(x.section || '')+'\0'+x.line),
  ]);
  return '[conversion-failure:'+fp+'] '+failure.plugin.id+' '+failure.stage;
}

async function ensureLabel(name,description,color) {
  gh(['label','create',name,'--repo',repo,'--description',description,'--color',color,'--force']);
}

async function upsertIssue({title,body,label}) {
  const raw=gh(['issue','list','--repo',repo,'--state','all','--search','"'+title+'" in:title','--json','number,title,state,url','--limit','20']);
  const items=raw ? JSON.parse(raw) : [];
  const exact=items.find(item=>item.title===title);
  if (exact) {
    gh(['issue','edit',String(exact.number),'--repo',repo,'--body',body,'--add-label',label]);
    if (exact.state==='CLOSED') gh(['issue','reopen',String(exact.number),'--repo',repo]);
    console.log('Reuse/update issue #'+exact.number+': '+title);
    return exact.url;
  }
  const url=gh(['issue','create','--repo',repo,'--title',title,'--body',body,'--label',label]);
  console.log('Created conversion issue: '+url);
  return url;
}

export async function collectIssueCandidates() {
  const catalog=await loadLoonSourceCatalog(MANIFEST);
  const targetProblems=await groupedTargetProblems(catalog);
  const syncReport=await readJson(syncFailurePath,{version:1,failures:[]});
  const syncFailures=Array.isArray(syncReport.failures) ? syncReport.failures : [];
  return {targetProblems,syncFailures};
}

async function main() {
  const {targetProblems,syncFailures}=await collectIssueCandidates();
  await fs.mkdir(runtimeDir,{recursive:true});
  const lines=[
    '# WayX automated conversion issues',
    '',
    '- Target Review/Issue markers: '+targetProblems.length,
    '- Hard sync failures: '+syncFailures.length,
    '',
  ];
  for (const group of targetProblems) {
    lines.push('- '+targetProblemTitle(group));
    for (const location of group.locations) lines.push('  - '+location.file+':'+location.line);
  }
  for (const failure of syncFailures) lines.push('- '+syncFailureTitle(failure));
  await fs.writeFile(summaryPath,lines.join('\n')+'\n');

  const output=process.env.GITHUB_OUTPUT;
  if (output) {
    await fs.appendFile(output,'has_issues='+(targetProblems.length || syncFailures.length ? 'true' : 'false')+'\n');
    await fs.appendFile(output,'summary='+path.relative(ROOT,summaryPath).replaceAll(path.sep,'/')+'\n');
  }

  if (!targetProblems.length && !syncFailures.length) {
    console.log('No conversion issue candidates found.');
    return;
  }
  if (dryRun) {
    console.log(JSON.stringify({targetProblems,syncFailures},null,2));
    return;
  }
  if (!repo) throw new Error('GITHUB_REPOSITORY is required to create conversion issues');

  await ensureLabel('conversion-unknown','Unknown converter syntax or unregistered semantic type','D93F0B');
  await ensureLabel('conversion-review','Known source semantics not losslessly expressible by the current target mapping','FBCA04');
  await ensureLabel('conversion-failure','Scheduled upstream conversion or validation failed for a plugin','B60205');

  for (const group of targetProblems) {
    await upsertIssue({
      title:targetProblemTitle(group),
      body:targetProblemIssueBody(group),
      label:group.kind==='review' ? 'conversion-review' : 'conversion-unknown',
    });
  }
  for (const failure of syncFailures) {
    await upsertIssue({
      title:syncFailureTitle(failure),
      body:syncFailureIssueBody(failure),
      label:'conversion-failure',
    });
  }
}

const isMain=process.argv[1] && path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if (isMain) await main();
