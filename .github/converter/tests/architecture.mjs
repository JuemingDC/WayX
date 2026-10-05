// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / architecture / Regression Suite

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import { spawnSync as runIsolatedCase } from 'node:child_process';
import { fileURLToPath as isolatedSuitePath } from 'node:url';
const suiteCases=["architecture-contract.mjs","genericity-audit.mjs","repository-layout.mjs"];
const selectedCase=process.argv.find(arg=>arg.startsWith('--case='))?.slice(7);
if (selectedCase && !suiteCases.includes(selectedCase)) throw new Error('Unknown suite case: '+selectedCase);
if (!selectedCase) {
  for (const name of suiteCases) {
    const child=runIsolatedCase(process.execPath,[isolatedSuitePath(import.meta.url),'--case='+name],{stdio:'inherit'});
    if (child.error) throw child.error;
    if (child.status!==0) process.exit(child.status ?? 1);
  }
}

if (selectedCase === "architecture-contract.mjs") {
// Suite case: architecture-contract.mjs
// WayX architecture contract: single authority + semantic compiler migration
// Author: chance
// Category: Converter / Architecture / Governance





const ROOT=process.cwd();
const spec=await fs.readFile(path.join(ROOT,'.github/CONVERSION_SPEC.md'),'utf8');

assert.match(spec,/版本：2\.4\b/,'Authoritative specification uses version 2.4');
assert.match(spec,/^## 2\.1 /m);
assert.doesNotMatch(spec,/迁移状态|历史记录|失败案例|PR #|（v1\.\d+|版本：1\.|已由 §|本轮验收/,'specification contains only current normative content');
for (const evidence of [
  'crossutility/Quantumult-X',
  'sample.conf',
  'rewrite.md',
  'sample-rewrite-request-header.js',
  'sample-rewrite-response-header.js',
  'sample-rewrite-with-script.js',
  'sample-echo-response.js',
  'manual.nssurge.com',
]) {
  assert.ok(spec.includes(evidence),'missing official capability evidence in CONVERSION_SPEC: '+evidence);
}

for (const invariant of [
  'Semantic IR',
  'native-equivalent',
  'guarded-helper',
  'phase-dispatcher',
  'false positive',
  'false negative',
  'new RegExp(source, flags)',
  '唯一规范源',
  'finite fixture',
  'false-positive / false-negative evidence',
]) {
  assert.ok(spec.includes(invariant),'missing semantic-compiler invariant in CONVERSION_SPEC: '+invariant);
}

assert.match(spec,/当前生产转换丢弃源 `i\/m\/s`/,'effective specification must match the target flag policy');

for (const rel of [
  '.github/converter/src/core.mjs',
  '.github/converter/src/rule.mjs',
  '.github/converter/src/rewrite.mjs',
  '.github/converter/src/script.mjs',
  '.github/converter/src/configuration.mjs',
  '.github/converter/src/input.mjs',
  '.github/converter/src/output.mjs',
  '.github/converter/src/runtime.mjs',
  '.github/converter/src/workflow.mjs',
  '.github/converter/src/conversion.mjs',
  '.github/converter/src/index.mjs',
  '.github/converter/tests/core.mjs',
  '.github/converter/tests/core.mjs',
]) {
  const stat=await fs.stat(path.join(ROOT,rel));
  assert.ok(stat.isFile() && stat.size>0,'semantic core path missing: '+rel);
}

for (const rel of [
  '.github/converter/src/core/regex.mjs',
  '.github/converter/src/core/condition-evaluator.mjs',
  '.github/converter/src/core/equivalence-plan.mjs',
  '.github/converter/src/target-regex.mjs',
  '.github/converter/src/qx-official-capabilities.mjs',
  '.github/converter/src/surge-official-capabilities.mjs',
  '.github/converter/src/rule-ast.mjs',
  '.github/converter/src/jq.mjs',
  '.github/converter/src/dependency.mjs',
  '.github/converter/src/complex-rewrite.mjs',
  '.github/converter/src/complex-rewrite-registry.mjs',
  '.github/converter/src/rewrite-v2-safe.mjs',
  '.github/converter/src/rewrite-v2-semantic.mjs',
  '.github/converter/src/qx-rewrite-matcher.mjs',
  '.github/converter/src/legacy-rewrite.mjs',
  '.github/converter/src/rewrite-qx.mjs',
  '.github/converter/src/rewrite-surge.mjs',
  '.github/converter/src/argument.mjs',
  '.github/converter/src/argument-usage.mjs',
  '.github/converter/src/script-target.mjs',
  '.github/converter/src/source-fetch.mjs',
  '.github/converter/src/source-catalog.mjs',
  '.github/converter/src/plugin-parser.mjs',
  '.github/converter/src/source-script-materializer.mjs',
  '.github/converter/src/dependency-materializer.mjs',
  '.github/converter/src/metadata.mjs',
  '.github/converter/src/qx-comment.mjs',
  '.github/converter/src/qx-snippet-validator.mjs',
  '.github/converter/src/surge-module.mjs',
  '.github/converter/src/qx-mock.mjs',
  '.github/converter/src/surge-mock.mjs',
  '.github/converter/src/qx-semantic-script.mjs',
  '.github/converter/src/complex-rewrite-script.mjs',
  '.github/converter/src/managed-artifacts.mjs',
  '.github/converter/src/readme-index.mjs',
  '.github/converter/src/upstream-run-report.mjs',
  '.github/converter/src/workflow-diagnostics.mjs',
  '.github/converter/src/conversion-pipeline.mjs',
  '.github/converter/src/conversion-runner.mjs',

  '.github/docs/conversion-spec',
  '.github/PROJECT_STATUS.md',
  '.github/converter/README.md',
  '.github/converter/src/source-metadata.mjs',
  '.github/converter/src/rewrite-v2.mjs',
  '.github/converter/src/rewrite-ir.mjs',
  '.github/converter/src/rewrite-v2-actions.mjs',
  '.github/converter/src/rewrite-plan-result.mjs',
  '.github/converter/src/script-v2.mjs',
  '.github/converter/src/script-legacy.mjs',
  '.github/converter/src/script-ir.mjs',
  '.github/converter/src/script-qx.mjs',
  '.github/converter/src/script-surge.mjs',
  '.github/converter/src/script-v2-target.mjs',
  '.github/converter/src/mitm.mjs',
  '.github/converter/src/rule-qx.mjs',
  '.github/converter/src/rule-surge.mjs',
  '.github/converter/tests/rule-ast.mjs',
  '.github/converter/tests/catalog-rule-inventory.mjs',
  '.github/converter/tests/surge-rule-coverage.mjs',
]) {
  await assert.rejects(
    fs.stat(path.join(ROOT,rel)),
    {code:'ENOENT'},
    'duplicate/stale architecture authority must stay removed: '+rel,
  );
}

console.log('Semantic compiler architecture contract passed');

assert.deepEqual((await fs.readdir(path.join(ROOT,'.github/converter/src'))).sort(),['configuration.mjs','conversion.mjs','core.mjs','index.mjs','input.mjs','output.mjs','rewrite.mjs','rule.mjs','runtime.mjs','script.mjs','workflow.mjs'].sort(),'implementations must stay in consolidated semantic domains');

assert.deepEqual((await fs.readdir(path.join(ROOT,'.github/converter/tests'))).filter(name=>name.endsWith('.mjs')).sort(),["architecture.mjs","artifacts.mjs","catalog.mjs","conversion.mjs","core.mjs","official-capabilities.mjs","rewrite.mjs","runtime.mjs","script.mjs","workflow.mjs"],'tests must stay in consolidated suites');
}

if (selectedCase === "genericity-audit.mjs") {
// Suite case: genericity-audit.mjs
const ROOT=process.cwd();
const SRC=path.join(ROOT,'.github','converter','src');
const files=[
  ...(await fs.readdir(SRC))
    .filter(name=>name.endsWith('.mjs'))
    .map(name=>path.join(SRC,name)),
  path.join(ROOT,'.github','scripts','sync-convert.mjs'),
  path.join(ROOT,'.github','converter','tools','regenerate-canonical.mjs'),
];

const forbiddenSymbols=[
  'QX_SCRIPT_OVERRIDES',
  'QX_SCRIPT_PORT_REGISTRY',
  'registeredQxScriptPort',
  'EXTRA_LOCAL_ENTRIES',
];

const identityComparisonPatterns=[
  /\b(?:entry|plugin)\.(?:id|name|author)\s*(?:===|==|!==|!=)\s*['"]/,
  /\bswitch\s*\(\s*(?:entry|plugin)\.(?:id|name|author)\s*\)/,
  /\b(?:scriptUrl|sourceUrl)\s*\.(?:includes|startsWith|endsWith|match)\s*\(\s*['"][^'"]*(?:youtube|bilibili|jingdong|12306|myblockads|rucu6)/i,
  /\/Scripts\\\/(?:youtube|bilibili|jingdong|12306|myblockads)[^/]*\\?\.js/i,
  /path\.startsWith\(\s*["']Resource\/Loon\/[^"']+\/["']\s*\)/,
  /Resource\/Loon\/(?:RuCu6|YouTube|Bilibili|JingDong|MyBlockAds)\//i,
];

const violations=[];
for(const file of files){
  const text=await fs.readFile(file,'utf8');
  for(const symbol of forbiddenSymbols){
    if(text.includes(symbol)) violations.push(`${path.relative(ROOT,file)}: forbidden plugin-port symbol ${symbol}`);
  }
  for(const re of identityComparisonPatterns){
    if(re.test(text)) violations.push(`${path.relative(ROOT,file)}: identity-driven semantic branch matched ${re}`);
  }
}

assert.deepEqual(violations, [], 'Generic converter audit failed:\n'+violations.join('\n'));
console.log('Generic converter source audit passed');
}

if (selectedCase === "repository-layout.mjs") {
// Suite case: repository-layout.mjs
// Repository root/workflow-domain layout contract
// Author: chance
// Category: Workflow / Repository Layout





const ROOT=process.cwd();
const allowedRoot=new Set(['.git','.github','README.md','Adblock','Resource','Boxjs','Module','Rule','Script']);
const rootEntries=await fs.readdir(ROOT);
const unexpected=rootEntries.filter(name=>!allowedRoot.has(name)).sort();
assert.deepEqual(
  unexpected,
  [],
  'repository root must contain only README.md, .github and conversion-content directories: '+unexpected.join(', '),
);

for(const rel of ['converter','docs','monitor','upstream','boxjs','module','rule','script','CONVERSION_SPEC.md','PROJECT_STATUS.md','.gitignore']){
  await assert.rejects(
    fs.stat(path.join(ROOT,rel)),
    {code:'ENOENT'},
    'workflow/spec path must not return to repository root: '+rel,
  );
}

for(const rel of [
  '.github/converter',
  '.github/monitor',
  '.github/CONVERSION_SPEC.md',
  '.github/README.md',
  '.github/scripts',
  '.github/sources/loon.json',
  '.github/manual-assets.json',
  '.github/workflows',
  'README.md',
  'Adblock',
  'Resource',
  'Boxjs',
  'Module',
  'Rule',
  'Script',
]){
  const stat=await fs.stat(path.join(ROOT,rel));
  assert.ok(stat, 'required workflow-domain path missing: '+rel);
}

for(const rel of [
  '.github/docs/conversion-spec',
  '.github/PROJECT_STATUS.md',
  '.github/converter/README.md',
]){
  await assert.rejects(
    fs.stat(path.join(ROOT,rel)),
    {code:'ENOENT'},
    'duplicate/stale architecture authority must stay removed: '+rel,
  );
}

const executableRoots=[
  '.github/workflows',
  '.github/scripts',
  '.github/converter/src',
  '.github/converter/tests',
  '.github/converter/tools',
  '.github/monitor',
];

async function walk(rel){
  const dir=path.join(ROOT,rel);
  const out=[];
  for(const ent of await fs.readdir(dir,{withFileTypes:true})){
    if(ent.name.startsWith('.')) continue;
    const child=path.join(rel,ent.name);
    if(ent.isDirectory()) out.push(...await walk(child));
    else if(/\.(?:mjs|js|py|ya?ml|json)$/.test(ent.name)) out.push(child);
  }
  return out;
}

const stale=[];
for(const root of executableRoots){
  for(const rel of await walk(root)){
    if(rel === '.github/converter/tests/architecture.mjs') continue;
    const text=await fs.readFile(path.join(ROOT,rel),'utf8');
    const checks=[
      {re:/(^|[\s'"\`(])converter\//gm,label:'root converter/'},
      {re:/(^|[\s'"\`(])monitor\//gm,label:'root monitor/'},
      {re:/(^|[\s'"\`(])docs\/conversion-spec\//gm,label:'root docs/conversion-spec/'},
      {re:/['"\`]boxjs\//g,label:'lowercase boxjs path'},
      {re:/['"\`]module\//g,label:'lowercase module path'},
      {re:/['"\`]rule\//g,label:'lowercase rule path'},
      {re:/['"\`]script\//g,label:'lowercase script path'},
      {re:/path\.join\([^\n)]*['"](?:boxjs|module|rule|script)['"]/g,label:'lowercase root directory in path.join'},
      {re:/\/main\/script\//g,label:'lowercase Raw GitHub /script/'},
    ];
    for(const {re,label} of checks){
      if(re.test(text)) stale.push(rel+': '+label);
      re.lastIndex=0;
    }
  }
}

assert.deepEqual(stale,[], 'stale pre-migration workflow paths detected:\n'+stale.join('\n'));
console.log('Repository workflow-domain layout contract passed');
}
