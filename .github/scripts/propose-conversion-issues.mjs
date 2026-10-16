// WayX automated conversion issue proposer.
// Author: chance
// Category: Automation / Conversion / Issue Proposal

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadLoonSourceCatalog } from "../converter/src/input.mjs";
import { parseLoonPlugin } from "../converter/src/input.mjs";

import { isRewriteV2, parseRewriteV2, selectRewritePipelineLayer, classifyLegacyRewriteAction, validateRewriteV2Ast, LOON_LEGACY_MOCK_OPTION_NAMES } from '../converter/src/rewrite.mjs';
import { isScriptV2, parseScriptV2, parseLegacyScriptLine } from '../converter/src/script.mjs';

const ROOT = process.cwd();
const TARGET_DIRS = [
  path.join(ROOT,'Adblock','Quantumult X'),
  path.join(ROOT,'Adblock','Surge'),
];
const runtimeDir = path.join(ROOT,'.github','monitor','.runtime');
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

async function readFailureReport(file,kind) {
  let report;
  try { report=JSON.parse(await fs.readFile(file,'utf8')); }
  catch (error) {
    if(error?.code==='ENOENT') return {version:1,failures:[]};
    throw new Error('Cannot read failure report '+file+': '+error.message,{cause:error});
  }
  const invalid=reason=>{throw new Error('Invalid failure report '+file+': '+reason);};
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const text=value=>typeof value==='string'&&value.trim().length>0;
  if(!object(report)||!(kind==='sync'?[1,2]:[1]).includes(report.version)||!Array.isArray(report.failures)) invalid('expected supported version and failures array');
  for(const [index,failure] of report.failures.entries()) {
    const owner=failure?.[kind==='sync'?'plugin':'source'];
    if(!object(failure)||!object(owner)||!text(owner.id)||!text(failure.stage)||!text(failure.reason)) invalid('invalid failures['+index+']');
    if(kind==='monitor'&&(!text(failure.errorType)||typeof failure.rollbackSucceeded!=='boolean')) invalid('invalid monitor failure details at '+index);
  }
  for(const key of kind==='sync'?['publishable']:['complete']) {
    if(key in report&&typeof report[key]!=='boolean') invalid(key+' must be boolean');
  }
  if(kind==='monitor'&&report.complete===true&&report.failures.length) invalid('complete report contains failures');
  return report;
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

async function sourceContextFor(entry,declaration,{limit=40}={}) {
  if (!entry) return {section:null,declarations:[]};
  try {
    const text=await fs.readFile(path.join(ROOT,'Resource','Loon',entry.file),'utf8');
    const parsed=parseLoonPlugin(text);
    const fallback=[];
    for (const [section,lines] of parsed.sections) {
      if (section === 'Argument') continue;
      for (const raw of lines) {
        const line=String(raw ?? '').trim();
        if (!line || /^(?:#|;|\/\/)/.test(line)) continue;
        if (declaration && line===declaration) return {section,declarations:[{section,line}]};
        if (fallback.length<limit) fallback.push({section,line});
      }
    }
    return {section:null,declarations:fallback};
  } catch {
    return {section:null,declarations:[]};
  }
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
    const context=await sourceContextFor(group.plugin,group.source);
    out.push({
      ...group,
      reasons:[...group.reasons].sort(),
      sourceSection:context.section,
      declarations:context.declarations,
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
    ruleBlock(group.sourceSection,group.declarations),
    '~~~',
    '',
    '## Generated target locations',
    '',
    ...(group.locations.length ? group.locations.map(x=>'- '+x.file+':'+x.line) : ['- (none)']),
    '',
    '## Automation behavior',
    '',
    'WayX failed closed for this declaration. No guessed active target rule is generated. The workflow continues other plugins and tracks the original declaration through this Issue.',
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
    'This plugin did not pass the Actions conversion/validation transaction, so its new upstream Source/targets are not intentionally committed by the converter. Other plugins continue independently.',
    '',
  ].join('\n');
}

export function targetProblemTitle(group) {
  return '[conversion-'+group.kind+':'+group.fingerprint+'] '+group.plugin.id+' '+group.code;
}

export function syncFailureTitle(failure) {
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

async function sourceSemanticProblems(catalog,{root=ROOT,sourceOverrides=null}={}) {
  const out=[];
  for(const entry of catalog) {
    let plugin;
    try {plugin=parseLoonPlugin(sourceOverrides?.has(entry.id)?sourceOverrides.get(entry.id):await fs.readFile(path.join(root,'Resource/Loon',entry.file),'utf8'));}
    catch {continue;} // Source I/O failures belong to the sync transaction.
    for(const section of ['Rewrite','Script'])for(const raw of plugin.sections.get(section)||[]) {
      const line=raw.trim();if(!line || /^(?:#|;|\/\/)/.test(line))continue;
      try {
        if(isScriptV2(line))parseScriptV2(line);
        else if(section==='Rewrite' && isRewriteV2(line))validateRewriteV2Ast(selectRewritePipelineLayer(parseRewriteV2(line)));
        else if(section==='Rewrite') {
          const separator=line.search(/\s/);
          if(separator<1)throw new Error('Malformed Legacy Rewrite declaration');
          const operation=classifyLegacyRewriteAction(line.slice(separator).trim().replace(/^\-\s+/,''));
          if(operation.kind==='unknown')throw new Error(operation.reason||'Unknown Legacy Rewrite action');
          for(const option of operation.optionNames||[])if(!LOON_LEGACY_MOCK_OPTION_NAMES.has(option))throw new Error('Unknown Legacy mock option: '+option);
        } else if(!parseLegacyScriptLine(line))throw new Error('Unregistered Legacy Script declaration or option');
      }catch(error){
        const code='unknown-source-syntax';
        out.push({fingerprint:fingerprint([entry.id,'unknown',code,line]),kind:'unknown',code,plugin:entry,source:line,
          reasons:['Source syntax requires review: '+error.message],locations:[],sourceSection:section,declarations:[{section,line}]});
      }
    }
  }
  return out;
}

export async function validationIssueCandidates(root=ROOT,stages={}) {
  let report;
  try {report=JSON.parse(await fs.readFile(path.join(root,'.github/monitor/.runtime/validation-results.json'),'utf8'));}
  catch(error){if(error.code!=='ENOENT')throw error;report={version:1,stages:{}};}
  if(report?.version!==1||!report.stages||typeof report.stages!=='object'||Array.isArray(report.stages))throw new Error('Invalid validation-results.json');
  const failures=[];
  for(const [stage,result] of Object.entries(report.stages)) {
    if(typeof result?.complete!=='boolean'||!Array.isArray(result.checks)||result.checks.some(check=>!check?.id||!['passed','failed'].includes(check.status)))throw new Error('Invalid validation-results.json stage: '+stage);
    const checks=result.checks.filter(check=>check.status==='failed');
    if(!result.complete)checks.push({id:'incomplete-stage',status:'failed',detail:'Stage did not finish; previous successful evidence is invalid.'});
    if(checks.length)failures.push({stage,checks});
  }
  for(const [stage,result] of Object.entries(stages))if(result.outcome==='failure'&&!['issues','gate','publish'].includes(stage)&&!failures.some(failure=>failure.stage===stage)) {
    failures.push({stage,checks:[{id:'stage-failure',status:'failed',detail:'Workflow stage failed before complete check evidence was available. Inspect the stage log in the run artifact.'}]});
  }
  return {validationReport:report,validationFailures:failures};
}

export function validationFailureTitle(failure) {
  return '[WayX validation] '+failure.stage+' ['+fingerprint(['validation',failure.stage])+']';
}

export function validationFailureIssueBody(failure) {
  const run=process.env.GITHUB_RUN_ID,server=process.env.GITHUB_SERVER_URL||'https://github.com';
  const lines=['Automated checks found results that require review. Publication remains gated.','',
    '- Stage: '+failure.stage,'- Failed checks: '+failure.checks.length,
    '- Run: '+(run?server+'/'+repo+'/actions/runs/'+run:'local validation'),
    '- Full evidence: validation-results.json and per-check logs in the run artifact',''];
  for(const check of failure.checks.slice(0,30)) {
    lines.push('### '+check.id,'','- Log: '+(check.log||'workflow stage log'),'','~~~text',
      JSON.stringify(check.findings?.length?check.findings:check.detail||'Check failed',null,2).slice(0,1400),'~~~','');
  }
  if(failure.checks.length>30)lines.push('Additional failures are preserved in the artifact.');
  return lines.join('\n');
}

export function recoveredValidationIssues(report,issues) {
  return issues.filter(issue=>{
    const match=String(issue.title??'').match(/^\[WayX validation\] (\S+) \[([a-f0-9]{16})\]$/);
    const result=match&&report?.stages?.[match[1]];
    return issue.state==='OPEN'&&issue.labels?.some(label=>label.name==='validation-failure')&&result?.complete===true&&result.checks?.length>0&&result.checks.every(check=>check.status==='passed');
  });
}

export async function ruleIssueCandidates(root=ROOT) {
  let report;
  try {report=JSON.parse(await fs.readFile(path.join(root,'.github/monitor/.runtime/rules-result.json'),'utf8'));}
  catch(error){if(error.code==='ENOENT')return {ruleReport:null,ruleProblems:[]};throw error;}
  if(report?.version!==1||typeof report.complete!=='boolean'||!Array.isArray(report.quarantined))throw new Error('Invalid rules-result.json');
  const groups=new Map();
  for(const item of report.quarantined) {
    if(!item.source||!item.code||!item.declaration||!item.reason)throw new Error('Invalid quarantined source rule');
    const key=fingerprint([item.source,item.code]);
    if(!groups.has(key))groups.set(key,{fingerprint:key,source:item.source,code:item.code,items:[]});
    groups.get(key).items.push(item);
  }
  return {ruleReport:report,ruleProblems:[...groups.values()]};
}

export function ruleProblemTitle(group) {return '[WayX rules:'+group.fingerprint+'] '+group.source+' '+group.code;}
export function ruleProblemBody(group) {
  return ['Native rule aggregation quarantined declarations that cannot be emitted without changing matching semantics.',
    '- Source: '+group.source,'- Type: '+group.code,'- Declarations: '+group.items.length,
    '- Full evidence: rules-result.json in the Action artifact',
    '- Supported rules continue to publish; quarantined rules are not widened or converted into scripts.',
    '', '~~~json',JSON.stringify(group.items.slice(0,40),null,2).slice(0,48000),'~~~'].join('\n');
}

export function recoveredRuleIssues(report,problems,issues) {
  if(report?.complete!==true)return [];
  const active=new Set(problems.map(ruleProblemTitle));
  return issues.filter(issue=>issue.state==='OPEN'&&issue.labels?.some(label=>label.name==='rules-review')&&/^\[WayX rules:[a-f0-9]{16}\] /.test(issue.title)&&!active.has(issue.title));
}

export async function collectIssueCandidates({root=ROOT,catalog=null,sourceOverrides=null,includeTargets=true,includeSyncFailures=true}={}) {
  catalog=catalog||await loadLoonSourceCatalog(path.join(root,'.github/sources/loon.json'));
  const targetProblems=includeTargets?await groupedTargetProblems(catalog):[];
  for(const problem of await sourceSemanticProblems(catalog,{root,sourceOverrides})){
    if(!targetProblems.some(group=>group.plugin.id===problem.plugin.id&&group.source===problem.source))targetProblems.push(problem);
  }
  const syncReport=includeSyncFailures?await readFailureReport(path.join(root,'.github/monitor/.runtime/sync-failures.json'),'sync'):{failures:[]};
  const syncFailures=syncReport.failures;
  const monitorReport=includeSyncFailures?await readFailureReport(path.join(root,'.github/monitor/.runtime/monitor-result.json'),'monitor'):{failures:[]};
  const monitorFailures=monitorReport.failures;
  const validation=includeSyncFailures?await validationIssueCandidates(root,JSON.parse(process.env.STAGES||'{}')):{validationReport:{version:1,stages:{}},validationFailures:[]};
  const rules=includeSyncFailures?await ruleIssueCandidates(root):{ruleReport:null,ruleProblems:[]};
  return {targetProblems,syncFailures,monitorFailures,monitorReport,syncReport,...validation,...rules};
}

export function monitorFailureTitle(failure) {
  const source=failure.source;
  return '[WayX monitor] '+source.id+' ['+fingerprint([source.id,source.url||source.repo,source.ref,failure.stage,failure.errorType])+']';
}

export function monitorFailureIssueBody(failure) {
  const source=failure.source;
  return ['Upstream monitoring failed; publication remains blocked until a complete run succeeds.','',
    '- Source: '+source.id,'- Upstream: '+(source.url||'https://github.com/'+source.repo),
    '- Ref: '+(source.ref||'not applicable'),'- Stage: '+failure.stage,
    '- Reason: '+failure.reason,'- Rollback succeeded: '+failure.rollbackSucceeded,
    '- Configuration: .github/monitor/sources.json','- Report: .github/monitor/.runtime/monitor-result.json',
    '', 'No conversion semantics are inferred from this monitoring failure.'].join('\n');
}

// Only explicit successful source results can resolve managed monitoring alerts.
export function recoveredMonitorIssues(report,issues) {
  if(report?.complete!==true||!Array.isArray(report.failures)||report.failures.length||!Array.isArray(report.results))return [];
  const recovered=new Set(report.results.filter(result=>result?.succeeded===true&&typeof result.source?.id==='string').map(result=>result.source.id));
  const failed=new Set(report.results.filter(result=>result?.succeeded!==true).map(result=>result?.source?.id));
  return issues.filter(issue=>{
    const match=String(issue.title??'').match(/^\[WayX monitor\] (\S+) \[([a-f0-9]{16})\]$/);
    return issue.state==='OPEN'&&issue.labels?.some(label=>label.name==='upstream-monitor-failure')&&match&&recovered.has(match[1])&&!failed.has(match[1]);
  });
}

export function recoveredConversionIssues({syncReport,targetProblems},issues) {
  if(syncReport?.publishable!==true||!Array.isArray(syncReport.convertedPlugins)||!Array.isArray(syncReport.failures))return [];
  const healthy=new Set(syncReport.convertedPlugins),failed=new Set(syncReport.failures.map(failure=>failure.plugin.id));
  for(const problem of targetProblems)failed.add(problem.plugin.id);
  return issues.filter(issue=>{
    const match=String(issue.title??'').match(/^\[conversion-(failure|unknown|review):[a-f0-9]{16}\] (\S+) /);
    return issue.state==='OPEN'&&match&&issue.labels?.some(label=>label.name==='conversion-'+match[1])&&healthy.has(match[2])&&!failed.has(match[2]);
  });
}

function reconcileManagedIssues(context) {
  const {monitorReport,validationReport,validationFailures,syncReport,ruleReport,ruleProblems}=context;
  if(monitorReport.complete!==true&&!Object.values(validationReport.stages).some(stage=>stage.complete)&&syncReport.publishable!==true)return;
  const issues=JSON.parse(gh(['issue','list','--repo',repo,'--state','open','--limit','1000','--json','number,title,state,labels']));
  const recovered=[...recoveredMonitorIssues(monitorReport,issues),
    ...recoveredValidationIssues(validationReport,issues).filter(issue=>!validationFailures.some(failure=>validationFailureTitle(failure)===issue.title)),
    ...recoveredConversionIssues(context,issues),...recoveredRuleIssues(ruleReport,ruleProblems,issues)];
  for(const issue of recovered) {
    gh(['issue','close',String(issue.number),'--repo',repo,'--reason','completed']);
    console.log('Resolved recovered managed issue #'+issue.number);
  }
}

async function main() {
  const {targetProblems,syncFailures,monitorFailures,monitorReport,syncReport,validationReport,validationFailures,ruleReport,ruleProblems}=await collectIssueCandidates();
  await fs.mkdir(runtimeDir,{recursive:true});
  const lines=[
    '# WayX automated conversion issues',
    '',
    '- Source/target semantic problems: '+targetProblems.length,
    '- Hard sync failures: '+syncFailures.length,
    '- Upstream monitor failures: '+monitorFailures.length,
    '- Validation stages requiring review: '+validationFailures.length,
    '- Quarantined rule groups: '+ruleProblems.length,
    '',
  ];
  for (const group of targetProblems) {
    lines.push('- '+targetProblemTitle(group));
    for (const location of group.locations) lines.push('  - '+location.file+':'+location.line);
  }
  for (const failure of syncFailures) lines.push('- '+syncFailureTitle(failure));
  for (const failure of monitorFailures) lines.push('- '+monitorFailureTitle(failure));
  for(const failure of validationFailures)lines.push('- '+validationFailureTitle(failure));
  for(const problem of ruleProblems)lines.push('- '+ruleProblemTitle(problem));
  await fs.writeFile(summaryPath,lines.join('\n')+'\n');

  const output=process.env.GITHUB_OUTPUT;
  if (output) {
    await fs.appendFile(output,'has_issues='+(targetProblems.length || syncFailures.length || monitorFailures.length || validationFailures.length || ruleProblems.length ? 'true' : 'false')+'\n');
    await fs.appendFile(output,'summary='+path.relative(ROOT,summaryPath).replaceAll(path.sep,'/')+'\n');
  }

  if (dryRun) {
    console.log(JSON.stringify({targetProblems,syncFailures,monitorFailures,validationFailures,ruleProblems},null,2));
    return;
  }
  if(repo){
    if(validationFailures.length)await ensureLabel('validation-failure','Automated output, syntax, runtime or workflow validation failed','B60205');
    if(ruleProblems.length)await ensureLabel('rules-review','Source rule declarations quarantined by native target conversion','FBCA04');
    reconcileManagedIssues({monitorReport,validationReport,validationFailures,syncReport,targetProblems,ruleReport,ruleProblems});
  }
  if (!targetProblems.length && !syncFailures.length && !monitorFailures.length && !validationFailures.length && !ruleProblems.length) {
    console.log('No conversion issue candidates found.');
    return;
  }
  if (!repo) throw new Error('GITHUB_REPOSITORY is required to create conversion issues');

  await ensureLabel('conversion-unknown','Unknown converter syntax or unregistered semantic type','D93F0B');
  await ensureLabel('conversion-review','Known source semantics not losslessly expressible by the current target mapping','FBCA04');
  await ensureLabel('conversion-failure','Scheduled upstream conversion or validation failed for a plugin','B60205');
  if(monitorFailures.length)await ensureLabel('upstream-monitor-failure','Upstream specification monitoring failed; publication blocked','B60205');

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
  for(const problem of ruleProblems)await upsertIssue({title:ruleProblemTitle(problem),body:ruleProblemBody(problem),label:'rules-review'});
  for(const failure of validationFailures)await upsertIssue({title:validationFailureTitle(failure),body:validationFailureIssueBody(failure),label:'validation-failure'});
  for(const failure of monitorFailures)await upsertIssue({title:monitorFailureTitle(failure),body:monitorFailureIssueBody(failure),label:'upstream-monitor-failure'});
}

const isMain=process.argv[1] && path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if (isMain) await main();
