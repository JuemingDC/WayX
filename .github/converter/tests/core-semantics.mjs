// WayX semantic core Phase B contract
// Author: chance
// Category: Converter / Core / Reference Semantics

import assert from 'node:assert/strict';
import { parseRewriteV2 } from '../src/rewrite-v2.mjs';
import { compileSourceRegex, execSourceRegex } from '../src/core/regex.mjs';
import { evaluateCondition } from '../src/core/condition-evaluator.mjs';
import { runConditionOracle } from '../src/core/equivalence-oracle.mjs';
import {
  qxExactRewriteMatcherPlan,
  qxRewriteMatcherPlan,
  evaluateQxRewriteMatcherPlan,
} from '../src/qx-rewrite-matcher.mjs';
import {
  EQUIVALENCE_KINDS,
  nativeEquivalent,
  guardedHelper,
  phaseDispatcher,
  unsupported,
  ORACLE_FAILURES,
  verifyPlanAgainstOracle,
} from '../src/core/equivalence-plan.mjs';

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

const native=nativeEquivalent({
  target:'qx',
  output:'native',
  proof:{exact:true,evidence:'official sample'},
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
  proof:{noFalseNegatives:true,safeNoop:true},
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


const flaggedAst=parseRewriteV2(
  'request if ${url} ~= /^https:\\/\\/API\\.Example\\.com\\/item\\/(\\d+)$/i as item then reject(200)'
);
const flaggedExact=qxExactRewriteMatcherPlan(flaggedAst);
assert.equal(flaggedExact.ok,false);

const flaggedPrefilter=qxRewriteMatcherPlan(flaggedAst);
assert.equal(flaggedPrefilter.ok,true);
assert.equal(flaggedPrefilter.urlPattern,'^https?://');

const flaggedCases=[
  {
    url:'https://api.example.com/item/42',
    request:{method:'GET',headers:{}},
  },
  {
    url:'https://else.example.com/other',
    request:{method:'GET',headers:{}},
  },
];

const flaggedOracle=runConditionOracle({
  condition:flaggedAst.condition,
  cases:flaggedCases,
  candidate:context=>evaluateQxRewriteMatcherPlan(flaggedPrefilter,context),
  compareCaptures:false,
});
assert.equal(flaggedOracle.falseNegatives,0);
assert.equal(flaggedOracle.falsePositives,1);

const verifiedGuard=verifyPlanAgainstOracle(
  guardedHelper({
    target:'qx',
    prefilter:flaggedPrefilter,
    runtime:'condition-helper.js',
    proof:{noFalseNegatives:true,safeNoop:true},
  }),
  flaggedOracle,
);
assert.equal(verifiedGuard.kind,EQUIVALENCE_KINDS.GUARDED);

const unsafeFlagDropOracle=runConditionOracle({
  condition:flaggedAst.condition,
  cases:flaggedCases,
  candidate:context=>({
    matched:new RegExp(flaggedAst.condition.right.pattern).test(context.url),
    captures:{},
  }),
  compareCaptures:false,
});
assert.equal(unsafeFlagDropOracle.falseNegatives,1);
assert.equal(
  verifyPlanAgainstOracle(
    guardedHelper({
      target:'qx',
      prefilter:'unsafe-source-body-without-flags',
      runtime:'condition-helper.js',
      proof:{noFalseNegatives:true,safeNoop:true},
    }),
    unsafeFlagDropOracle,
  ).reason,
  ORACLE_FAILURES.PREFILTER_FALSE_NEGATIVE,
);

const exactAst=parseRewriteV2(
  'request if ${url} ~= /^https:\\/\\/api\\.example\\.com\\/item\\/(\\d+)$/ as item then reject(200)'
);
const exactMatcher=qxExactRewriteMatcherPlan(exactAst);
assert.equal(exactMatcher.ok,true);

const exactOracle=runConditionOracle({
  condition:exactAst.condition,
  cases:flaggedCases,
  candidate:context=>evaluateQxRewriteMatcherPlan(exactMatcher,context),
});
assert.equal(exactOracle.matchExact,true);
assert.equal(exactOracle.captureExact,true);

const verifiedNative=verifyPlanAgainstOracle(
  nativeEquivalent({
    target:'qx',
    output:exactMatcher,
    proof:{exact:true,evidence:'QX official url matcher + structural subset proof'},
  }),
  exactOracle,
  {requireCapture:true},
);
assert.equal(verifiedNative.kind,EQUIVALENCE_KINDS.NATIVE);

console.log('Semantic core Phase C oracle contract passed');
