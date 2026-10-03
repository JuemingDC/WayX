// WayX compact core contract: semantic evaluator + Rule domain
// Author: chance
// Category: Converter / Core / Validation

import assert from 'node:assert/strict';
import { parseRewriteV2 } from '../src/rewrite-v2.mjs';
import {
  compileSourceRegex,
  execSourceRegex,
  evaluateCondition,
  guaranteedConditionPredicates,
  EQUIVALENCE_KINDS,
  nativeEquivalent,
  guardedHelper,
  phaseDispatcher,
  unsupported,
} from '../src/core/semantic.mjs';
import {
  parseLoonRuleAst,
  renderRuleAst,
  ruleTypesInAst,
  planQxRuleAst,
  planSurgeModuleRuleAst,
  renderSurgeRuleAst,
  validateSurgeRuleAst,
} from '../src/core/rule.mjs';

function condition(source) {
  return parseRewriteV2(source).condition;
}

// Semantic Regex / condition reference behavior.
const insensitive=condition(
  'request if ${url} ~= /^https:\\/\\/API\\.Example\\.com\\/item\\/(\\d+)$/i as item then reject(200)'
);
const insensitiveResult=evaluateCondition(insensitive,{
  url:'https://api.example.com/item/42',
  request:{method:'GET',headers:{}},
});
assert.equal(insensitiveResult.matched,true);
assert.equal(insensitiveResult.captures.item[1],'42');

const sensitive=condition(
  'request if ${url} ~= /^https:\\/\\/API\\.Example\\.com\\/item\\/(\\d+)$/ as item then reject(200)'
);
assert.equal(evaluateCondition(sensitive,{url:'https://api.example.com/item/42'}).matched,false);
assert.equal(execSourceRegex({type:'regex',pattern:'^b$',flags:'m'},'a\nb\nc')?.[0],'b');
assert.equal(execSourceRegex({type:'regex',pattern:'a.b',flags:'s'},'a\nb')?.[0],'a\nb');
assert.equal(compileSourceRegex({type:'regex',pattern:'abc',flags:'i'}).test('ABC'),true);

const emptyHeader=condition(
  'request if ${request.header[\'X-Optional\']} == "" then reject(200)'
);
assert.equal(evaluateCondition(emptyHeader,{request:{headers:{'x-optional':''}}}).matched,true);
assert.equal(evaluateCondition(emptyHeader,{request:{headers:{}}}).matched,false);

const missingHeader=condition(
  'request if ${request.header[\'X-Optional\']} == null then reject(200)'
);
assert.equal(evaluateCondition(missingHeader,{request:{headers:{}}}).matched,true);
assert.equal(evaluateCondition(missingHeader,{request:{headers:{'X-OPTIONAL':''}}}).matched,false);

const combined=condition(
  'request if (${request.method} == "GET" || ${request.method} == "POST") && ${url} ~= /item\\/(\\d+)/ as item then reject(200)'
);
assert.equal(evaluateCondition(combined,{
  url:'https://example.com/item/99',
  request:{method:'POST',headers:{}},
}).captures.item[1],'99');
assert.equal(evaluateCondition(combined,{
  url:'https://example.com/item/99',
  request:{method:'PUT',headers:{}},
}).matched,false);

const argumentCondition=condition(
  'request if ${enabled} == true && ${url} ~= /api/i then reject(200)'
);
assert.equal(evaluateCondition(argumentCondition,{
  url:'https://example.com/API',
  request:{headers:{}},
  arguments:new Map([['enabled',true]]),
}).matched,true);

// Phase C: only predicates guaranteed on every successful branch are eligible
// for later target prefilter lowering.
const guaranteed=guaranteedConditionPredicates(condition(
  'request if ${request.method} == "POST" && ${url} ~= /API/i then reject(200)'
));
assert.deepEqual(guaranteed,[
  {kind:'equals',variable:'request.method',valueType:'string',value:'POST'},
  {kind:'regex',variable:'url',pattern:'API',flags:'i',capture:null,nativeRegexSafe:false},
]);

const orIntersection=guaranteedConditionPredicates(condition(
  'request if (${request.method} == "GET" && ${url} ~= /a/) || (${request.method} == "GET" && ${url} ~= /b/) then reject(200)'
));
assert.deepEqual(orIntersection,[
  {kind:'equals',variable:'request.method',valueType:'string',value:'GET'},
]);

const native=nativeEquivalent({target:'qx',output:'native',proof:{exact:true,evidence:'official sample'}});
assert.equal(native.kind,EQUIVALENCE_KINDS.NATIVE);
assert.throws(()=>nativeEquivalent({target:'qx',output:'native',proof:{exact:false}}),/proof\.exact=true/);

const guarded=guardedHelper({
  target:'surge',
  prefilter:'^https?://',
  runtime:'helper.js',
  proof:{noFalseNegatives:true,safeNoop:true},
});
assert.equal(guarded.kind,EQUIVALENCE_KINDS.GUARDED);
assert.throws(()=>guardedHelper({
  target:'qx',
  prefilter:'too-narrow',
  runtime:'helper.js',
  proof:{noFalseNegatives:false,safeNoop:true},
}),/noFalseNegatives=true/);

assert.equal(phaseDispatcher({
  target:'surge',
  phase:'request',
  rules:['r1','r2'],
  runtime:'dispatcher.js',
  proof:{preservesOrder:true,safeNoop:true},
}).kind,EQUIVALENCE_KINDS.DISPATCHER);
assert.equal(unsupported('target lifecycle cannot express source behavior').kind,EQUIVALENCE_KINDS.UNSUPPORTED);

// Rule parser / AST / target lowering.
const simple=parseLoonRuleAst('DOMAIN, example.com, REJECT');
assert.equal(simple.ok,true);
assert.equal(simple.ast.kind,'rule');
assert.equal(simple.ast.type,'DOMAIN');
assert.equal(simple.ast.value,'example.com');
assert.equal(simple.ast.policy,'REJECT');
assert.deepEqual(simple.ast.params,[]);
assert.equal(renderRuleAst(simple.ast),'DOMAIN,example.com,REJECT');

const inlineComment=parseLoonRuleAst('DOMAIN, mallapi2.qinlinkeji.com, REJECT // 商城页面');
assert.equal(inlineComment.ast.inlineComment,'商城页面');

const ipAsn=parseLoonRuleAst('IP-ASN, 6185, REJECT-DROP, no-resolve');
assert.equal(planQxRuleAst(ipAsn.ast).line,'ip-asn, 6185, reject');
assert.equal(planSurgeModuleRuleAst(ipAsn.ast).line,'IP-ASN,6185,REJECT-DROP,no-resolve');

const quoted=parseLoonRuleAst('USER-AGENT, "Example App*", REJECT');
assert.equal(quoted.ast.value,'Example App*');
assert.equal(renderRuleAst(quoted.ast),'USER-AGENT,"Example App*",REJECT');

const cidr=parseLoonRuleAst('IP-CIDR, 1.1.1.0/24, REJECT, no-resolve');
assert.deepEqual(cidr.ast.params,[{raw:'no-resolve',name:'no-resolve',value:null}]);

const logical=parseLoonRuleAst(
  'AND, ((URL-REGEX, "^https:\\/\\/example\\.com\\/(a,b)"), (OR, ((DOMAIN-SUFFIX, example.com), (PROTOCOL, TCP)))), REJECT'
);
assert.equal(logical.ok,true);
assert.deepEqual(ruleTypesInAst(logical.ast),['AND','URL-REGEX','OR','DOMAIN-SUFFIX','PROTOCOL']);

const didiLogical=parseLoonRuleAst(
  'AND, ((IP-ASN, 45090, no-resolve), (DEST-PORT, 25641), (PROTOCOL, TCP)), REJECT'
);
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
assert.equal(manyLogical.ast.children.length,6);
assert.equal(planSurgeModuleRuleAst(manyLogical.ast).kind,'rule');

function nestedNotRule(depth) {
  let rule='DOMAIN,example.com';
  for (let i=1;i<depth;i++) rule='NOT,(('+rule+'))';
  return 'NOT,(('+rule+')),REJECT';
}
assert.equal(validateSurgeRuleAst(parseLoonRuleAst(nestedNotRule(10)).ast).ok,true);
assert.equal(
  validateSurgeRuleAst(parseLoonRuleAst(nestedNotRule(11)).ast).reason,
  'logical-nesting-depth-exceeds-10',
);

const unknown=parseLoonRuleAst('FUTURE-RULE, value, REJECT');
assert.equal(planQxRuleAst(unknown.ast).reason,'unsupported-qx-rule-comment');
assert.equal(planSurgeModuleRuleAst(unknown.ast).reason,'unsupported-rule-type');

assert.equal(parseLoonRuleAst('NOT, ((DOMAIN, a.example), (DOMAIN, b.example)), REJECT').reason,'invalid-NOT-cardinality');
assert.equal(parseLoonRuleAst('AND, DOMAIN, REJECT').reason,'invalid-AND-subrules');

const surgeRegex=parseLoonRuleAst('URL-REGEX, "^https:\\/\\/example\\.com\\/(a,b)", REJECT');
assert.equal(renderSurgeRuleAst(surgeRegex.ast),'URL-REGEX,"^https:\\/\\/example\\.com\\/(a,b)",REJECT');
assert.equal(planQxRuleAst(simple.ast).line,'host, example.com, reject');
assert.equal(planSurgeModuleRuleAst(simple.ast).line,'DOMAIN,example.com,REJECT');

console.log('Compact core semantic + Rule contract passed');
