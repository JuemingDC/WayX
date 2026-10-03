// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / artifacts / Regression Suite

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { compileRegexForTarget, minifyJq, parseRewriteV2, loadLoonSourceCatalog, qxTargetPath, surgeTargetPath, discoverSourceScriptUrls } from "../src/index.mjs";

import { spawnSync as runIsolatedCase } from 'node:child_process';
import { fileURLToPath as isolatedSuitePath } from 'node:url';
const suiteCases=["generated-helper-refs.mjs","myblockads-golden.mjs","source-script-url-preservation.mjs"];
const selectedCase=process.argv.find(arg=>arg.startsWith('--case='))?.slice(7);
if (selectedCase && !suiteCases.includes(selectedCase)) throw new Error('Unknown suite case: '+selectedCase);
if (!selectedCase) {
  for (const name of suiteCases) {
    const child=runIsolatedCase(process.execPath,[isolatedSuitePath(import.meta.url),'--case='+name],{stdio:'inherit'});
    if (child.error) throw child.error;
    if (child.status!==0) process.exit(child.status ?? 1);
  }
}

if (selectedCase === "generated-helper-refs.mjs") {
// Suite case: generated-helper-refs.mjs
const ROOT=process.cwd();
const TARGETS=[
  path.join(ROOT,'Adblock','Quantumult X'),
  path.join(ROOT,'Adblock','Surge'),
];
const RAW_PREFIX='https://raw.githubusercontent.com/JuemingDC/WayX/main/';

async function walk(dir){
  const out=[];
  for(const ent of await fs.readdir(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

const missing=[];
const refs=[];
for(const root of TARGETS){
  for(const file of await walk(root)){
    if(!/\.(?:snippet|sgmodule)$/i.test(file)) continue;
    const text=await fs.readFile(file,'utf8');
    const re=/https:\/\/raw\.githubusercontent\.com\/JuemingDC\/WayX\/main\/(Script\/[A-Za-z0-9%._~!$&'()*+,;=:@\/-]+\.js)/g;
    for(const m of text.matchAll(re)){
      const rel=decodeURIComponent(m[1]);
      assert.ok(rel.startsWith('Script/') && !rel.split('/').includes('..'), 'unsafe generated helper path: '+rel);
      refs.push({file:path.relative(ROOT,file),rel});
      try { await fs.access(path.join(ROOT,rel)); }
      catch { missing.push({file:path.relative(ROOT,file),rel}); }
    }
  }
}

assert.deepEqual(missing,[], 'target output references missing WayX script files:\n'+JSON.stringify(missing,null,2));
console.log(`Generated/local script reference check passed: refs=${refs.length}`);
}

if (selectedCase === "myblockads-golden.mjs") {
// Suite case: myblockads-golden.mjs
const fixture = JSON.parse(await fs.readFile(new URL('../fixtures/myblockads-golden.json', import.meta.url), 'utf8'));
const root = new URL('../../../', import.meta.url);
const source = await fs.readFile(new URL(fixture.source, root), 'utf8');
const qx = await fs.readFile(new URL(fixture.quantumultX, root), 'utf8');
const surge = await fs.readFile(new URL(fixture.surge, root), 'utf8');

function stripQxLeadingNote(value) {
  return String(value).replace(/^\{#\s*.*?\s*#\}\s+/, '');
}

function extractQx(text) {
  return text.split('\n').map(x => x.trim()).filter(x => x.includes(' url jsonjq-response-body ')).map(line => {
    const match = line.match(/^(.*?) url jsonjq-response-body '(.*)'$/);
    assert.ok(match, 'Malformed QX JQ line: ' + line);
    return { pattern: stripQxLeadingNote(match[1]), jq: match[2] };
  });
}

function extractSurge(text) {
  return text.split('\n').map(x => x.trim()).filter(x => x.startsWith('http-response-jq ')).map(line => {
    const match = line.match(/^http-response-jq (.*?) '(.*)'$/);
    assert.ok(match, 'Malformed Surge JQ line: ' + line);
    return { pattern: match[1], jq: match[2] };
  });
}

function fnv1a64(text) {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++) {
    hash ^= BigInt(text.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

const qxPairs = extractQx(qx);
const surgePairs = extractSurge(surge);
const normalizeUrlPattern = value => String(value).replace(/\\\//g, '/');
assert.deepEqual(
  qxPairs.map(x => ({pattern:normalizeUrlPattern(x.pattern), jq:x.jq})),
  surgePairs.map(x => ({pattern:normalizeUrlPattern(x.pattern), jq:x.jq})),
  'QX and Surge JQ rule order/semantic content diverged',
);
assert.equal(qxPairs.length, fixture.jqRuleCount);
assert.equal(new Set(qxPairs.map(x => x.jq)).size, fixture.uniqueJqCount);
assert.equal(fnv1a64(JSON.stringify(qxPairs)), fixture.orderedPairsFnv1a64);
assert.equal(qxPairs.some(x => x.jq.includes('jq-path=')), false, 'Target JQ must not keep unresolved jq-path markers');

const sourceJq = source.split('\n').map(x => x.trim())
  .filter(line => /^(?:request|response)\s+if\b/.test(line) && /\.json\.jq\(/.test(line))
  .map(parseRewriteV2);
assert.equal(sourceJq.length, 3, 'Unexpected current MyBlockAds Rewrite v2 JQ count');

let dependencyJq = 0;
for (const ast of sourceJq) {
  assert.equal(ast.condition.type, 'comparison');
  assert.equal(ast.condition.left.type, 'variable');
  assert.equal(ast.condition.left.name, 'url');
  assert.equal(ast.condition.right.type, 'regex');
  const compiled = compileRegexForTarget(ast.condition.right, {subject:'url'});
  assert.equal(compiled.ok, true, 'Source URL regex cannot be compiled for target: ' + ast.condition.right.pattern);

  const action = ast.actions[0];
  const jq = action.args[0]?.value;
  assert.equal(typeof jq, 'string');

  const target = qxPairs.find(x => x.pattern === compiled.pattern);
  if (/^jq-path=/i.test(jq)) {
    dependencyJq += 1;
    assert.ok(target, 'Resolvable jq-path dependency must be materialized and emitted as native JQ: ' + compiled.pattern);
    assert.equal(target.jq.includes('jq-path='), false, 'Materialized jq-path dependency must not leak its source marker');
    assert.equal(qx.includes(jq), false, 'QX target must not preserve jq-path source text');
    assert.equal(surge.includes(jq), false, 'Surge target must not preserve jq-path source text');
    continue;
  }

  assert.ok(target, 'Inline source JQ must remain converted: ' + compiled.pattern);
  assert.equal(minifyJq(target.jq), minifyJq(jq), 'Inline source JQ changed semantics/text beyond whitespace normalization');
}
assert.equal(dependencyJq, fixture.jqDependencyCount, 'Unexpected current MyBlockAds jq-path dependency count');
assert.doesNotMatch(qx, /jq-path=.*url script-/i, 'jq-path must never be converted through a QX script helper');
assert.doesNotMatch(surge, /jq-path=.*script-path=/i, 'jq-path must never be converted through a Surge script helper');

console.log('MyBlockAds JQ golden fixture passed');
}

if (selectedCase === "source-script-url-preservation.mjs") {
// Suite case: source-script-url-preservation.mjs
const ROOT=process.cwd();
const catalog=await loadLoonSourceCatalog(path.join(ROOT,'.github','sources','loon.json'));
const failures=[];

for(const entry of catalog){
  const source=await fs.readFile(path.join(ROOT,'Resource','Loon',entry.file),'utf8');
  const qx=await fs.readFile(path.join(ROOT,qxTargetPath(entry)),'utf8');
  const surge=await fs.readFile(path.join(ROOT,surgeTargetPath(entry)),'utf8');

  for(const ref of discoverSourceScriptUrls(source)){
    let url;
    try { url=new URL(ref); }
    catch { continue; } // relative refs are covered by resolveOriginalUrl unit tests.
    if (!['http:','https:'].includes(url.protocol)) continue;

    if(!qx.includes(ref)) failures.push({plugin:entry.id,target:'qx',sourceScript:ref});
    if(!surge.includes(ref)) failures.push({plugin:entry.id,target:'surge',sourceScript:ref});

    const basename=decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1)||'');
    if(basename){
      const localMirror=`https://raw.githubusercontent.com/JuemingDC/WayX/main/Script/${entry.id}/${basename}`;
      if(qx.includes(localMirror)) failures.push({plugin:entry.id,target:'qx',mirror:localMirror});
      if(surge.includes(localMirror)) failures.push({plugin:entry.id,target:'surge',mirror:localMirror});
    }
  }
}

assert.deepEqual(failures,[], 'Source Script URL preservation failed:\n'+JSON.stringify(failures,null,2));
console.log('Source Script URL preservation passed');
}
