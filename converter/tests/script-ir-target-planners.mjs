// Script IR / target planner contract
// Author: chance
// Category: Converter / Script / Architecture Validation

import assert from 'node:assert/strict';
import { parseLegacyScriptLine } from '../src/script-legacy.mjs';
import { legacyScriptToSemanticIr, scriptV2AstToSemanticIr } from '../src/script-ir.mjs';
import { parseScriptV2 } from '../src/script-v2.mjs';
import { planQxScript } from '../src/script-qx.mjs';
import { planSurgeScript } from '../src/script-surge.mjs';

const legacySource='http-response ^https://api\\.example\\.com script-path=https://example.com/resp.js, requires-body=true, binary-body-mode=true, timeout=9, argument={"mode":"x"}, tag=Resp';
const legacyParsed=parseLegacyScriptLine(legacySource);
assert.equal(legacyParsed.syntax,'loon-script-legacy');
assert.equal(legacyParsed.phase,'response');
assert.equal(legacyParsed.httpType,'http-response');
assert.equal(legacyParsed.script.path,'https://example.com/resp.js');
assert.equal(legacyParsed.requiresBody,true);
assert.equal(legacyParsed.binaryBodyMode,true);
assert.equal(legacyParsed.timeout,'9');
assert.equal(legacyParsed.argument,'{"mode":"x"}');

const legacyReordered=parseLegacyScriptLine(
  'http-response ^https://api\\.example\\.com tag=Resp, timeout=9, script-path=https://example.com/resp.js, argument={"mode":"x"}, binary-body-mode=true, requires-body=true'
);
assert.equal(legacyReordered.script.path,'https://example.com/resp.js');
assert.equal(legacyReordered.requiresBody,true);
assert.equal(legacyReordered.timeout,'9');
assert.equal(
  parseLegacyScriptLine('http-response ^https://api\\.example\\.com script-path=https://example.com/resp.js, future-option=true'),
  null,
);
assert.equal(
  parseLegacyScriptLine('http-response ^https://api\\.example\\.com script-path=https://example.com/a.js, tag=A, tag=B'),
  null,
);

const legacyIr=legacyScriptToSemanticIr(legacyParsed,{source:legacySource});
assert.equal(legacyIr.type,'script-semantic-ir');
assert.equal(legacyIr.sourceSyntax,'legacy');
assert.equal(legacyIr.phase,'response');
assert.equal(legacyIr.script.path,'https://example.com/resp.js');
assert.equal(Object.hasOwn(legacyIr,'qxAction'),false);
assert.equal(Object.hasOwn(legacyIr,'surgeType'),false);

const qxLegacy=planQxScript(legacyIr,{
  scriptUrl:'https://example.com/resp.js',
  sourceText:'const x=$response.body; $done({body:x});',
});
assert.equal(qxLegacy.ok,true);
assert.equal(qxLegacy.section,'rewrite');
assert.match(qxLegacy.line,/ url script-response-body https:\/\/example\.com\/resp\.js$/);
assert.match(qxLegacy.notes.join('\n'),/argument ignored/);
assert.match(qxLegacy.notes.join('\n'),/timeout ignored/);
assert.match(qxLegacy.notes.join('\n'),/binary-body-mode=true ignored/);

const surgeLegacy=planSurgeScript(legacyIr,{name:'Resp'});
assert.equal(surgeLegacy.ok,true);
assert.equal(surgeLegacy.section,'script');
assert.equal(
  surgeLegacy.line,
  'Resp = type=http-response,pattern=^https://api\\.example\\.com,script-path=https://example.com/resp.js,requires-body=true,max-size=-1,binary-body-mode=true,timeout=9,argument={"mode":"x"}'
);

const disabledIr=legacyScriptToSemanticIr(
  parseLegacyScriptLine('http-request ^https://x\\.example script-path=https://example.com/a.js, enable=false, tag=Off')
);
assert.equal(planQxScript(disabledIr,{sourceText:'$done({});'}).disabled,true);
assert.equal(planSurgeScript(disabledIr,{name:'Off'}).disabled,true);

const maxSizeIr=legacyScriptToSemanticIr(
  parseLegacyScriptLine('http-response ^https://x\\.example script-path=https://example.com/a.js, max-size=2048, debug=true')
);
const qxLegacyDroppedOptions=planQxScript(maxSizeIr,{sourceText:'$done({});'});
assert.equal(qxLegacyDroppedOptions.ok,true);
assert.match(qxLegacyDroppedOptions.line,/ url script-response-header https:\/\/example\.com\/a\.js$/);
assert.equal(/debug|max-size/i.test(qxLegacyDroppedOptions.line),false);
assert.equal(/debug|max-size/i.test(qxLegacyDroppedOptions.notes.join('\n')),false);

const v2Source='response if ${url} ~= /api/ then script("https://example.com/v2.js") with requires_body=true, binary_body_mode=true, tag="V2"';
const v2Ast=parseScriptV2(v2Source);
const v2Reordered=parseScriptV2(
  'response if ${url} ~= /api/ then script("https://example.com/v2.js") with tag="V2", binary_body_mode=true, requires_body=true'
);
assert.deepEqual(
  v2Reordered.options.map(option=>option.name),
  ['tag','binary_body_mode','requires_body'],
);
const v2Ir=scriptV2AstToSemanticIr(v2Ast,{source:v2Source});
assert.equal(v2Ir.sourceSyntax,'v2');
assert.equal(v2Ir.phase,'response');
assert.equal(v2Ir.script.path,'https://example.com/v2.js');
assert.equal(Object.hasOwn(v2Ir,'section'),false);

const qxV2=planQxScript(v2Ir,{
  scriptUrl:'https://example.com/v2.js',
  sourceText:'const x=$response.body; $done({body:x});',
  argumentIds:new Set(),
});
assert.equal(qxV2.ok,true);
assert.match(qxV2.line,/ url script-response-body https:\/\/example\.com\/v2\.js$/);

const v2DebugSource='response if ${url} ~= /debug/ then script("https://example.com/debug.js") with debug=true, tag="Debug"';
const v2DebugIr=scriptV2AstToSemanticIr(parseScriptV2(v2DebugSource),{source:v2DebugSource});
const qxV2Debug=planQxScript(v2DebugIr,{
  scriptUrl:'https://example.com/debug.js',
  sourceText:'$done({});',
  argumentIds:new Set(),
});
assert.equal(qxV2Debug.ok,true);
assert.match(qxV2Debug.line,/ url script-response-header https:\/\/example\.com\/debug\.js$/);
assert.equal(/(?:^|[,\s])debug=/.test(qxV2Debug.line),false);
assert.equal(/Source Script debug|debug ignored/i.test(qxV2Debug.notes.join('\n')),false);

const v2DynamicDebugSource='response if ${url} ~= /debug-dynamic/ then script("https://example.com/debug-dynamic.js") with debug=${debugSwitch}, tag="DebugDynamic"';
const v2DynamicDebugIr=scriptV2AstToSemanticIr(parseScriptV2(v2DynamicDebugSource),{source:v2DynamicDebugSource});
const qxV2DynamicDebug=planQxScript(v2DynamicDebugIr,{
  scriptUrl:'https://example.com/debug-dynamic.js',
  sourceText:'$done({});',
  argumentIds:new Set(),
});
assert.equal(qxV2DynamicDebug.ok,true);
assert.match(qxV2DynamicDebug.line,/ url script-response-header https:\/\/example\.com\/debug-dynamic\.js$/);
assert.equal(/debugSwitch|(?:^|[,\s])debug=/.test(qxV2DynamicDebug.line),false);
assert.equal(/debugSwitch|Source Script debug|debug ignored/i.test(qxV2DynamicDebug.notes.join('\n')),false);

const surgeV2=planSurgeScript(v2Ir,{
  scriptUrl:'https://example.com/v2.js',
  name:'V2',
  argumentIds:new Set(),
  argumentTable:{byId:new Map()},
});
assert.equal(surgeV2.ok,true);
assert.match(surgeV2.line,/^V2 = type=http-response,pattern=api,script-path=https:\/\/example\.com\/v2\.js,requires-body=true,max-size=-1,binary-body-mode=true$/);

console.log('Script IR target planner contract passed');
