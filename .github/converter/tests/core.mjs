// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / core / Regression Suite

import { parseRewriteV2, parseLoonRuleAst, renderRuleAst, ruleTypesInAst, planQxRuleAst, planSurgeModuleRuleAst, renderSurgeRuleAst, validateSurgeRuleAst, surgeRuleTypesInTree, surgeModuleRule, classifyLegacyRewriteAction } from "../src/index.mjs";
import { compileSourceRegex, execSourceRegex, evaluateCondition, EQUIVALENCE_KINDS, nativeEquivalent, guardedHelper, phaseDispatcher, unsupported, differentialConditionOracle } from "../src/core.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import { spawnSync as runIsolatedCase } from 'node:child_process';
import { fileURLToPath as isolatedSuitePath } from 'node:url';
const suiteCases=["core-semantics.mjs","rule.mjs"];
const selectedCase=process.argv.find(arg=>arg.startsWith('--case='))?.slice(7);
if (selectedCase && !suiteCases.includes(selectedCase)) throw new Error('Unknown suite case: '+selectedCase);
if (!selectedCase) {
  for (const name of suiteCases) {
    const child=runIsolatedCase(process.execPath,[isolatedSuitePath(import.meta.url),'--case='+name],{stdio:'inherit'});
    if (child.error) throw child.error;
    if (child.status!==0) process.exit(child.status ?? 1);
  }
}

if (selectedCase === "core-semantics.mjs") {
// Suite case: core-semantics.mjs
// WayX semantic core Phase C contract
// Author: chance
// Category: Converter / Core / Reference Semantics


function condition(source) {
  return parseRewriteV2(source).condition;
}

const insensitive=condition(
  'request if ${url} ~= /^https:\\/\\/API\\.Example\\.com\\/item\\/(\\d+)$/i as item then reject(200)'
);
const insensitiveResult=evaluateCondition(insensitive,{
  url:'https://api.example.com/item/42',
  request:{method:'GET',headers:{}},
});
assert.equal(insensitiveResult.matched,true);
assert.equal(insensitiveResult.captures.item[0],'https://api.example.com/item/42');
assert.equal(insensitiveResult.captures.item[1],'42');

const sensitive=condition(
  'request if ${url} ~= /^https:\\/\\/API\\.Example\\.com\\/item\\/(\\d+)$/ as item then reject(200)'
);
assert.equal(evaluateCondition(sensitive,{url:'https://api.example.com/item/42'}).matched,false);

assert.equal(
  execSourceRegex({type:'regex',pattern:'^b$',flags:'m'},'a\nb\nc')?.[0],
  'b',
);
assert.equal(
  execSourceRegex({type:'regex',pattern:'a.b',flags:'s'},'a\nb')?.[0],
  'a\nb',
);
assert.equal(
  compileSourceRegex({type:'regex',pattern:'abc',flags:'i'}).test('ABC'),
  true,
);

const emptyHeader=condition(
  'request if ${request.header[\'X-Optional\']} == "" then reject(200)'
);
assert.equal(
  evaluateCondition(emptyHeader,{request:{headers:{'x-optional':''}}}).matched,
  true,
);
assert.equal(
  evaluateCondition(emptyHeader,{request:{headers:{}}}).matched,
  false,
);

const missingHeader=condition(
  'request if ${request.header[\'X-Optional\']} == null then reject(200)'
);
assert.equal(
  evaluateCondition(missingHeader,{request:{headers:{}}}).matched,
  true,
);
assert.equal(
  evaluateCondition(missingHeader,{request:{headers:{'X-OPTIONAL':''}}}).matched,
  false,
);

const combined=condition(
  'request if (${request.method} == "GET" || ${request.method} == "POST") && ${url} ~= /item\\/(\\d+)/ as item then reject(200)'
);
const combinedResult=evaluateCondition(combined,{
  url:'https://example.com/item/99',
  request:{method:'POST',headers:{}},
});
assert.equal(combinedResult.matched,true);
assert.equal(combinedResult.captures.item[1],'99');
assert.equal(
  evaluateCondition(combined,{
    url:'https://example.com/item/99',
    request:{method:'PUT',headers:{}},
  }).matched,
  false,
);

const argumentCondition=condition(
  'request if ${enabled} == true && ${url} ~= /api/i then reject(200)'
);
assert.equal(
  evaluateCondition(argumentCondition,{
    url:'https://example.com/API',
    request:{headers:{}},
    arguments:new Map([['enabled',true]]),
  }).matched,
  true,
);


const matcherContexts=[
  {url:'https://api.example.com/item/42',request:{method:'GET',headers:{}}},
  {url:'https://API.Example.com/item/42',request:{method:'GET',headers:{}}},
  {url:'https://example.com/other',request:{method:'GET',headers:{}}},
];
const bareCaseSensitiveUrl=context=>
  /^https:\/\/API\.Example\.com\/item\/(\d+)$/.test(String(context.url || ''));

const qxFlagLoss=differentialConditionOracle({
  condition:insensitive,
  target:'qx',
  targetModel:bareCaseSensitiveUrl,
  contexts:matcherContexts,
});
assert.equal(qxFlagLoss.observedExact,false);
assert.equal(qxFlagLoss.noFalseNegatives,false);
assert.equal(qxFlagLoss.falseNegatives.length,1);

const surgeFlagLoss=differentialConditionOracle({
  condition:insensitive,
  target:'surge',
  targetModel:bareCaseSensitiveUrl,
  contexts:matcherContexts,
});
assert.equal(surgeFlagLoss.observedExact,false);
assert.equal(surgeFlagLoss.falseNegatives.length,1);

const exactOracle=differentialConditionOracle({
  condition:sensitive,
  target:'bare-native-url',
  targetModel:bareCaseSensitiveUrl,
  contexts:matcherContexts,
});
assert.equal(exactOracle.observedExact,true);
assert.equal(exactOracle.noFalseNegatives,true);
assert.equal(exactOracle.noFalsePositives,true);

const broadGuardOracle=differentialConditionOracle({
  condition:combined,
  target:'broad-prefilter',
  targetModel:context=>/^https?:\/\//.test(String(context.url || '')),
  contexts:[
    {url:'https://example.com/item/99',request:{method:'POST',headers:{}}},
    {url:'https://example.com/item/99',request:{method:'PUT',headers:{}}},
    {url:'https://example.com/other',request:{method:'GET',headers:{}}},
    {url:'https://example.com/item/not-number',request:{method:'POST',headers:{}}},
  ],
});
assert.equal(broadGuardOracle.noFalseNegatives,true);
assert.equal(broadGuardOracle.observedExact,false);
assert.ok(broadGuardOracle.falsePositives.length>0);

const native=nativeEquivalent({
  target:'qx',
  output:'native',
  proof:{exact:true,evidence:'official sample',oracle:exactOracle},
});
assert.equal(native.kind,EQUIVALENCE_KINDS.NATIVE);
assert.throws(
  ()=>nativeEquivalent({target:'qx',output:'native',proof:{exact:false}}),
  /proof\.exact=true/,
);

const guarded=guardedHelper({
  target:'surge',
  prefilter:'^https?://',
  runtime:'helper.js',
  proof:{noFalseNegatives:true,safeNoop:true,oracle:broadGuardOracle},
});
assert.equal(guarded.kind,EQUIVALENCE_KINDS.GUARDED);
assert.throws(
  ()=>guardedHelper({
    target:'qx',
    prefilter:'too-narrow',
    runtime:'helper.js',
    proof:{noFalseNegatives:false,safeNoop:true},
  }),
  /noFalseNegatives=true/,
);

const dispatcher=phaseDispatcher({
  target:'surge',
  phase:'request',
  rules:['r1','r2'],
  runtime:'dispatcher.js',
  proof:{preservesOrder:true,safeNoop:true},
});
assert.equal(dispatcher.kind,EQUIVALENCE_KINDS.DISPATCHER);
assert.equal(unsupported('target lifecycle cannot express source behavior').kind,EQUIVALENCE_KINDS.UNSUPPORTED);

console.log('Semantic core Phase C contract passed');
}

if (selectedCase === "rule.mjs") {
// Suite case: rule.mjs
// WayX target-neutral Rule + target planner contract
// Author: chance
// Category: Converter / Rule / Validation




const simple=parseLoonRuleAst('DOMAIN, example.com, REJECT');
assert.equal(simple.ok,true);
assert.equal(simple.ast.kind,'rule');
assert.equal(simple.ast.type,'DOMAIN');
assert.equal(simple.ast.valueRaw,'example.com');
assert.equal(simple.ast.value,'example.com');
assert.equal(simple.ast.policyRaw,'REJECT');
assert.equal(simple.ast.policy,'REJECT');
assert.deepEqual(simple.ast.params,[]);
assert.equal(renderRuleAst(simple.ast),'DOMAIN,example.com,REJECT');

const inlineComment=parseLoonRuleAst('DOMAIN, mallapi2.qinlinkeji.com, REJECT // 商城页面');
assert.equal(inlineComment.ok,true);
assert.equal(inlineComment.ast.syntaxSource,'DOMAIN, mallapi2.qinlinkeji.com, REJECT');
assert.equal(inlineComment.ast.inlineComment,'商城页面');
assert.equal(inlineComment.ast.policy,'REJECT');

const ipAsn=parseLoonRuleAst('IP-ASN, 6185, REJECT-DROP, no-resolve');
assert.equal(ipAsn.ok,true);
assert.equal(planQxRuleAst(ipAsn.ast).line,'ip-asn, 6185, reject');
assert.equal(planSurgeModuleRuleAst(ipAsn.ast).line,'IP-ASN,6185,REJECT-DROP,no-resolve');

const quoted=parseLoonRuleAst('USER-AGENT, "Example App*", REJECT');
assert.equal(quoted.ok,true);
assert.equal(quoted.ast.valueRaw,'"Example App*"');
assert.equal(quoted.ast.value,'Example App*');
assert.equal(renderRuleAst(quoted.ast),'USER-AGENT,"Example App*",REJECT');

const cidr=parseLoonRuleAst('IP-CIDR, 1.1.1.0/24, REJECT, no-resolve');
assert.equal(cidr.ok,true);
assert.deepEqual(cidr.ast.params,[{raw:'no-resolve',name:'no-resolve',value:null}]);
assert.equal(renderRuleAst(cidr.ast),'IP-CIDR,1.1.1.0/24,REJECT,no-resolve');

const argumentParam=parseLoonRuleAst('RULE-SET, Example, REJECT, extended-matching=true');
assert.equal(argumentParam.ok,true);
assert.deepEqual(argumentParam.ast.params,[{
  raw:'extended-matching=true',
  name:'extended-matching',
  value:'true',
}]);

const logical=parseLoonRuleAst(
  'AND, ((URL-REGEX, "^https:\\/\\/example\\.com\\/(a,b)"), (OR, ((DOMAIN-SUFFIX, example.com), (PROTOCOL, TCP)))), REJECT'
);
assert.equal(logical.ok,true);
assert.equal(logical.ast.kind,'logical');
assert.equal(logical.ast.type,'AND');
assert.equal(logical.ast.policy,'REJECT');
assert.deepEqual(ruleTypesInAst(logical.ast),[
  'AND','URL-REGEX','OR','DOMAIN-SUFFIX','PROTOCOL',
]);
assert.equal(logical.ast.children[0].nested,true);
assert.equal(logical.ast.children[0].value,'^https:\\/\\/example\\.com\\/(a,b)');
assert.equal(logical.ast.children[1].kind,'logical');
assert.equal(logical.ast.children[1].children.length,2);

const nestedFlag=parseLoonRuleAst(
  'AND, ((IP-CIDR, 10.0.0.0/8, no-resolve), (DOMAIN-SUFFIX, example.com)), REJECT'
);
assert.equal(nestedFlag.ok,true);
assert.deepEqual(nestedFlag.ast.children[0].params,[{
  raw:'no-resolve',
  name:'no-resolve',
  value:null,
}]);

const didiLogical=parseLoonRuleAst(
  'AND, ((IP-ASN, 45090, no-resolve), (DEST-PORT, 25641), (PROTOCOL, TCP)), REJECT'
);
assert.equal(didiLogical.ok,true);
assert.equal(didiLogical.ast.kind,'logical');
assert.equal(didiLogical.ast.children.length,3);
assert.equal(didiLogical.ast.children[0].type,'IP-ASN');
assert.deepEqual(didiLogical.ast.children[0].params,[{
  raw:'no-resolve',
  name:'no-resolve',
  value:null,
}]);
assert.equal(planQxRuleAst(didiLogical.ast).reason,'unsupported-qx-rule-comment');
assert.equal(
  planSurgeModuleRuleAst(didiLogical.ast).line,
  'AND,((IP-ASN,45090,no-resolve),(DEST-PORT,25641),(PROTOCOL,TCP)),REJECT',
);

const manyChildSource=[
  'DOMAIN-SUFFIX,example.com',
  'DEST-PORT,443',
  'PROTOCOL,TCP',
  'IP-ASN,13335,no-resolve',
  'USER-AGENT,Example*',
  'URL-REGEX,^https:\\/\\/example\\.com\\/',
];
const manyLogical=parseLoonRuleAst(
  'AND,(' + manyChildSource.map(rule=>'('+rule+')').join(',') + '),REJECT'
);
assert.equal(manyLogical.ok,true);
assert.equal(manyLogical.ast.children.length,6);
assert.equal(planQxRuleAst(manyLogical.ast).reason,'unsupported-qx-rule-comment');
assert.equal(planSurgeModuleRuleAst(manyLogical.ast).kind,'rule');
assert.match(planSurgeModuleRuleAst(manyLogical.ast).line,/^AND,\(\(.+\),\(.+\),\(.+\),\(.+\),\(.+\),\(.+\)\),REJECT$/);

function nestedNotRule(depth) {
  let rule='DOMAIN,example.com';
  for (let i=1;i<depth;i++) rule='NOT,(('+rule+'))';
  return 'NOT,(('+rule+')),REJECT';
}
const depth10=parseLoonRuleAst(nestedNotRule(10));
assert.equal(depth10.ok,true);
assert.equal(validateSurgeRuleAst(depth10.ast).ok,true);
assert.equal(planSurgeModuleRuleAst(depth10.ast).kind,'rule');

const depth11=parseLoonRuleAst(nestedNotRule(11));
assert.equal(depth11.ok,true);
assert.equal(validateSurgeRuleAst(depth11.ast).reason,'logical-nesting-depth-exceeds-10');
assert.equal(planSurgeModuleRuleAst(depth11.ast).reason,'unsupported-rule-type');

const unknown=parseLoonRuleAst('FUTURE-RULE, value, REJECT');
assert.equal(unknown.ok,true);
assert.equal(unknown.ast.type,'FUTURE-RULE');
assert.equal(planQxRuleAst(unknown.ast).reason,'unsupported-qx-rule-comment');
assert.equal(planSurgeModuleRuleAst(unknown.ast).reason,'unsupported-rule-type');

const invalidNot=parseLoonRuleAst('NOT, ((DOMAIN, a.example), (DOMAIN, b.example)), REJECT');
assert.equal(invalidNot.ok,false);
assert.equal(invalidNot.reason,'invalid-NOT-cardinality');

const malformed=parseLoonRuleAst('AND, DOMAIN, REJECT');
assert.equal(malformed.ok,false);
assert.equal(malformed.reason,'invalid-AND-subrules');

const surgeRegex=parseLoonRuleAst('URL-REGEX, "^https:\\/\\/example\\.com\\/(a,b)", REJECT');
assert.equal(surgeRegex.ok,true);
assert.equal(
  renderSurgeRuleAst(surgeRegex.ast),
  'URL-REGEX,"^https:\\/\\/example\\.com\\/(a,b)",REJECT',
);

assert.equal(planQxRuleAst(simple.ast).line,'host, example.com, reject');
assert.equal(planSurgeModuleRuleAst(simple.ast).line,'DOMAIN,example.com,REJECT');


const ROOT=process.cwd();
const manifest=JSON.parse(await fs.readFile(path.join(ROOT,'.github/sources/loon.json'),'utf8'));
const baseline=JSON.parse(await fs.readFile(
  path.join(ROOT,'.github/converter/fixtures/catalog-rule-inventory.json'),
  'utf8',
));

const inventory={
  ruleTypes:new Set(),
  policies:new Set(),
  parameterNames:new Set(),
  logicalOperators:new Set(),
};
const coverage={
  files:0,
  rules:0,
  native:0,
  boundProxy:0,
  review:0,
  types:new Map(),
  reviewLines:[],
};

function collectObservedRule(node) {
  inventory.ruleTypes.add(node.type);
  if (!node.nested) {
    assert.ok(node.policyRaw,'top-level Rule missing policy: '+node.source);
    inventory.policies.add(node.policy);
  }
  for (const param of node.params) {
    if (param.name) inventory.parameterNames.add(param.name);
  }
  if (node.kind==='logical') inventory.logicalOperators.add(node.type);
  for (const child of node.children) collectObservedRule(child);
}

function splitPatternAction(line) {
  const idx=String(line).search(/\s/);
  if (idx<0) return [String(line).trim(),''];
  return [
    String(line).slice(0,idx).trim(),
    String(line).slice(idx).trim().replace(/^\-\s+/,''),
  ];
}

function isKnownSourceNonRule(line) {
  const [pattern,action]=splitPatternAction(line);
  if (pattern && action && classifyLegacyRewriteAction(action).kind!=='unknown') return true;
  return !String(line).includes(',') &&
    /^(?:\*\.)?(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/i.test(String(line));
}

function activeRuleLines(text) {
  const out=[];
  let section=null;
  for (const raw of String(text).replace(/\r\n?/g,'\n').split('\n')) {
    const header=raw.trim().match(/^\[([^\]]+)\]$/);
    if (header) {
      section=header[1];
      continue;
    }
    const line=raw.trim();
    if (section!=='Rule' || !line || /^(?:#|;|\/\/)/.test(line)) continue;
    out.push(line);
  }
  return out;
}

for (const entry of manifest) {
  const file=path.join(ROOT,'Resource/Loon',entry.file);
  let text;
  try {
    text=await fs.readFile(file,'utf8');
  } catch {
    continue;
  }
  coverage.files++;

  for (const line of activeRuleLines(text)) {
    if (isKnownSourceNonRule(line)) continue;
    coverage.rules++;

    const parsed=parseLoonRuleAst(line);
    assert.ok(parsed.ok,entry.file+': Rule AST parse failed ('+parsed.reason+'): '+line);
    collectObservedRule(parsed.ast);

    const typeTree=surgeRuleTypesInTree(line);
    assert.equal(
      typeTree.ok,
      true,
      'unsupported Surge rule type tree: '+line+' ('+typeTree.reason+')',
    );
    for (const type of typeTree.types) {
      coverage.types.set(type,(coverage.types.get(type) || 0)+1);
    }

    const mapped=surgeModuleRule(line,{proxyPolicyPlaceholder:'{{{wayx_proxy_policy}}}'});
    if (mapped.kind==='rule' && mapped.reason==='proxy-policy-argument') {
      coverage.boundProxy++;
      assert.match(mapped.line,/\{\{\{wayx_proxy_policy\}\}\}/);
      continue;
    }
    if (mapped.kind==='rule' || mapped.kind==='map') {
      coverage.native++;
      assert.equal(mapped.lines.at(-1),mapped.line);
      if (mapped.kind==='map') assert.equal(mapped.reason,'url-regex-local-response');
      continue;
    }

    coverage.review++;
    coverage.reviewLines.push({file:entry.file,reason:mapped.reason,line});
  }
}

assert.ok(coverage.files>0,'no Loon source files were scanned');
assert.ok(coverage.rules>0,'no Loon [Rule] entries were scanned');

const sorted=set=>[...set].sort();
const actual={
  version:baseline.version,
  scope:baseline.scope,
  ruleTypes:sorted(inventory.ruleTypes),
  policies:sorted(inventory.policies),
  parameterNames:sorted(inventory.parameterNames),
  logicalOperators:sorted(inventory.logicalOperators),
};
assert.equal(actual.version,baseline.version,'Rule inventory fixture version drifted');
assert.equal(actual.scope,baseline.scope,'Rule inventory fixture scope drifted');

function assertNoNewObserved(actualValues,baselineValues,label) {
  const expected=new Set(baselineValues || []);
  const added=(actualValues || []).filter(value=>!expected.has(value));
  assert.deepEqual(
    added,
    [],
    'Catalog-observed Loon Rule inventory gained new '+label+
      '. Do not update the baseline mechanically. Actual inventory: '+JSON.stringify(actual),
  );
}

assertNoNewObserved(actual.ruleTypes,baseline.ruleTypes,'Rule type');
assertNoNewObserved(actual.policies,baseline.policies,'top-level policy');
assertNoNewObserved(actual.parameterNames,baseline.parameterNames,'parameter name');
assertNoNewObserved(actual.logicalOperators,baseline.logicalOperators,'logical operator');

const unexpectedReview=coverage.reviewLines.filter(item=>item.reason!=='external-policy');
assert.equal(
  unexpectedReview.length,
  0,
  'unexpected Surge module rule reviews:\n'+
    unexpectedReview.map(item=>item.file+': ['+item.reason+'] '+item.line).join('\n'),
);
for (const item of coverage.reviewLines.filter(item=>item.reason==='external-policy')) {
  const mapped=surgeModuleRule(item.line,{proxyPolicyPlaceholder:'{{{wayx_proxy_policy}}}'});
  assert.match(
    mapped.lines.join('\n'),
    /REVIEW REQUIRED: Surge Module requires an external policy binding/i,
  );
}

console.log(
  'Rule contract passed: files='+coverage.files+
  ', rules='+coverage.rules+
  ', native='+coverage.native+
  ', boundProxy='+coverage.boundProxy+
  ', review='+coverage.review+
  ', observedTypes='+actual.ruleTypes.length,
);
}

if(selectedCase==='rule.mjs') {
  const enhanced=line=>surgeModuleRule(line,{matchingEnhancements:true});
  assert.equal(enhanced('DOMAIN,ads.test,REJECT').line,'DOMAIN,ads.test,REJECT,extended-matching,pre-matching');
  assert.equal(enhanced('DEST-PORT,4480,REJECT-NO-DROP').line,'DEST-PORT,4480,REJECT-NO-DROP,pre-matching');
  assert.equal(enhanced('DOMAIN,allow.test,DIRECT').line,'DOMAIN,allow.test,DIRECT,extended-matching');
  assert.equal(enhanced('URL-REGEX,^https://ads.test/,REJECT').line,'URL-REGEX,^https://ads.test/,REJECT,extended-matching');
  assert.equal(enhanced('RULE-SET,https://example.test/list,REJECT').line,'RULE-SET,https://example.test/list,REJECT,extended-matching');
  assert.equal(enhanced('DOMAIN-SET,https://example.test/domains,REJECT').line,'DOMAIN-SET,https://example.test/domains,REJECT,extended-matching,pre-matching');
  const logical=enhanced('AND,((DOMAIN-SUFFIX,chat.bilibili.com),(OR,((DOMAIN-KEYWORD,stun),(DOMAIN-KEYWORD,tracker),(DOMAIN-KEYWORD,p2p)))),REJECT');
  assert.equal(logical.line,'AND,((DOMAIN-SUFFIX,chat.bilibili.com,extended-matching),(OR,((DOMAIN-KEYWORD,stun,extended-matching),(DOMAIN-KEYWORD,tracker,extended-matching),(DOMAIN-KEYWORD,p2p,extended-matching)))),REJECT,pre-matching');
  assert.equal((logical.line.match(/pre-matching/g)||[]).length,1,'pre-matching must occur only at top level');
  assert.doesNotMatch(enhanced('AND,((DOMAIN,ads.test),(PROTOCOL,UDP)),REJECT').line,/pre-matching/);
  assert.equal(enhanced('DOMAIN,ads.test,REJECT,pre-matching,extended-matching').line,'DOMAIN,ads.test,REJECT,pre-matching,extended-matching');
  for(const source of ['DOMAIN,ads.test,DIRECT,pre-matching','DEST-PORT,443,REJECT,extended-matching','AND,((DOMAIN,ads.test,pre-matching)),REJECT','URL-REGEX,ads,REJECT,pre-matching'])assert.equal(enhanced(source).kind,'comment',source);
  const {convertPlugin,validateConvertedPlugin}=await import('../src/conversion.mjs');
  const entry={id:'MatchingFlags',source:'https://example.test/source.lpx',category:'Test'};
  const options={stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'};
  const rejectOnly=convertPlugin(entry,'[Rule]\nDOMAIN,ads.test,REJECT\nDEST-PORT,4480,REJECT-NO-DROP',options);
  validateConvertedPlugin(entry,rejectOnly);
  assert.doesNotMatch(rejectOnly.surge,/#!requirement=CORE_VERSION/,'do not invent an unverified core number for pre-matching');
  assert.match(rejectOnly.surge,/DOMAIN,ads.test,REJECT,extended-matching,pre-matching/);
  assert.doesNotMatch(rejectOnly.qx,/pre-matching|extended-matching/);
  const allow=convertPlugin(entry,'[Rule]\nDOMAIN,allow.test,DIRECT\nDOMAIN-SUFFIX,test,REJECT',options);
  validateConvertedPlugin(entry,allow);
  assert.match(allow.surge,/DOMAIN-SUFFIX,test,REJECT,extended-matching,pre-matching/,'mixed modules enhance each eligible rule');
  assert.match(allow.surge,/DOMAIN,allow.test,DIRECT,extended-matching\nDOMAIN-SUFFIX,test,REJECT,extended-matching,pre-matching/);
  assert.match(surgeModuleRule('DOMAIN,proxy.test,PROXY',{matchingEnhancements:true,proxyPolicyPlaceholder:'WayXProxyPolicy'}).line,/DOMAIN,proxy.test,WayXProxyPolicy,extended-matching/);
  assert.doesNotMatch(surgeModuleRule('DOMAIN,proxy.test,PROXY',{matchingEnhancements:true,proxyPolicyPlaceholder:'WayXProxyPolicy'}).line,/pre-matching/);
  console.log('Surge matching flags passed: type/scope/policy, nested flags, dedup, external-set guard, allow order, QX isolation and existing requirement preservation');
}

if(selectedCase==='core-semantics.mjs') {
  const {scanSourceRegexLiteral}=await import('../src/core.mjs');
  const source=String.raw`/^(?:im|s)[/\]a-z]{1,3}\/(\d+)$/ims&&`;
  const regex=scanSourceRegexLiteral(source);
  assert.equal(regex.pattern,String.raw`^(?:im|s)[/\]a-z]{1,3}\/(\d+)$`);
  assert.equal(regex.flags,'ims');
  assert.equal(source.slice(regex.end),'&&');
  assert.throws(()=>scanSourceRegexLiteral('/x/i42'),/suffix boundary/);
  assert.throws(()=>scanSourceRegexLiteral('/[abc/'),/Unterminated/);
  const ast=parseRewriteV2('request if ${url} ~= ${pattern} as hit then request.header.set("X-ID","${hit.1}")');
  const context={url:'ITEM/42',arguments:{pattern:String.raw`/^item\/(\d+)$/i`}};
  assert.deepEqual(evaluateCondition(ast.condition,context),{matched:true,captures:{hit:['ITEM/42','42']}});
  for(const pattern of [undefined,'item/(.*)','/item/i trailing','/[abc/i'])assert.equal(evaluateCondition(ast.condition,{...context,arguments:{pattern}}).matched,false);
}
