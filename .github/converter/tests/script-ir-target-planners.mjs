import { parseLegacyScriptLine, legacyScriptToSemanticIr, scriptV2AstToSemanticIr, parseScriptV2 } from '../src/script.mjs';
import { planQxScript, planSurgeScript } from '../src/script-target.mjs';

// Script IR / target planner contract
// Author: chance
// Category: Converter / Script / Architecture Validation

import assert from 'node:assert/strict';
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
assert.match(qxLegacy.line,/ url script-response-body https:\/\/example\.com\/resp\.js$/);
assert.match(qxLegacy.notes.join('\n'),/timeout ignored/i);
assert.match(qxLegacy.notes.join('\n'),/binary-body-mode=true ignored/i);

const qxLegacyCompatibleIr=legacyScriptToSemanticIr(
  parseLegacyScriptLine('http-response ^https://api\\.example\\.com script-path=https://example.com/resp.js, requires-body=true, argument={"mode":"x"}, tag=Resp')
);
const qxLegacyCompatible=planQxScript(qxLegacyCompatibleIr,{
  scriptUrl:'https://example.com/resp.js',
  sourceText:'const x=$response.body; $done({body:x});',
});
assert.equal(qxLegacyCompatible.ok,true);
assert.equal(qxLegacyCompatible.section,'rewrite');
assert.match(qxLegacyCompatible.line,/ url script-response-body https:\/\/example\.com\/resp\.js$/);
assert.match(qxLegacyCompatible.notes.join('\n'),/argument ignored/);

const requestV2Source='request if ${url} ~= /request/ then script("https://example.com/request.js") with requires_body=true, tag="Req"';
const requestV2Ir=scriptV2AstToSemanticIr(parseScriptV2(requestV2Source),{source:requestV2Source});
const qxRequestV2=planQxScript(requestV2Ir,{
  scriptUrl:'https://example.com/request.js',
  // Mirrors multi-platform scripts such as RuCu6 12306.js: the QX branch
  // mutates request body while another platform branch contains response:{}.
  sourceText:'const isQuanX=typeof $task!=="undefined"; if(isQuanX){$done({body:"x"});}else{$done({response:{body:"x"}});}',
  argumentIds:new Set(),
});
assert.equal(qxRequestV2.ok,true);
assert.match(qxRequestV2.line,/ url script-request-body https:\/\/example\.com\/request\.js$/);
assert.doesNotMatch(qxRequestV2.line,/script-(?:analyze-)?echo-response/);

const requestNoBodyIr=scriptV2AstToSemanticIr(
  parseScriptV2('request if ${url} ~= /header/ then script("https://example.com/header.js")'),
);
const qxRequestNoBody=planQxScript(requestNoBodyIr,{
  scriptUrl:'https://example.com/header.js',
  sourceText:'$done({status:"HTTP/1.1 200 OK",body:"synthetic"});',
  argumentIds:new Set(),
});
assert.match(qxRequestNoBody.line,/ url script-request-header https:\/\/example\.com\/header\.js$/);

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
  parseLegacyScriptLine('http-response ^https://x\\.example script-path=https://example.com/a.js, max-size=2048, debug=false')
);
const qxLegacyDroppedOptions=planQxScript(maxSizeIr,{sourceText:'$done({});'});
assert.equal(qxLegacyDroppedOptions.ok,true);
assert.match(qxLegacyDroppedOptions.line,/ url script-response-header https:\/\/example\.com\/a\.js$/);
assert.equal(/debug|max-size/i.test(qxLegacyDroppedOptions.line),false);

const qxLegacyDebugUnsupported=planQxScript(
  legacyScriptToSemanticIr(parseLegacyScriptLine('http-response ^https://x\\.example script-path=https://example.com/a.js, debug=true')),
  {sourceText:'$done({});'}
);
assert.equal(qxLegacyDebugUnsupported.ok,true);
assert.doesNotMatch(qxLegacyDebugUnsupported.line,/debug=/);
assert.match(qxLegacyDebugUnsupported.notes.join('\n'),/debug.*omitted/i);

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
assert.match(qxV2.notes.join('\n'),/binary_body_mode=true ignored/i);

const qxV2RequiresOnlyIr=scriptV2AstToSemanticIr(
  parseScriptV2('response if ${url} ~= /api/ then script("https://example.com/v2.js") with requires_body=true, binary_body_mode=false, tag="V2"')
);
const qxV2RequiresOnly=planQxScript(qxV2RequiresOnlyIr,{
  scriptUrl:'https://example.com/v2.js',
  sourceText:'const x=$response.body; $done({body:x});',
  argumentIds:new Set(),
});
assert.equal(qxV2RequiresOnly.ok,true);
assert.match(qxV2RequiresOnly.line,/ url script-response-body https:\/\/example\.com\/v2\.js$/);

const qxTimeoutUnsupported=planQxScript(
  scriptV2AstToSemanticIr(parseScriptV2('response if ${url} ~= /timeout/ then script("https://example.com/t.js") with timeout=12')),
  {scriptUrl:'https://example.com/t.js',sourceText:'$done({});',argumentIds:new Set()}
);
assert.equal(qxTimeoutUnsupported.ok,true);
assert.doesNotMatch(qxTimeoutUnsupported.line,/timeout=/);
assert.match(qxTimeoutUnsupported.notes.join('\n'),/timeout ignored/i);

const qxEnableTrue=planQxScript(
  scriptV2AstToSemanticIr(parseScriptV2('request if ${url} ~= /enabled/ then script("https://example.com/e.js") with enable=true')),
  {scriptUrl:'https://example.com/e.js',sourceText:'$done({});',argumentIds:new Set()}
);
assert.equal(qxEnableTrue.ok,true);
assert.match(qxEnableTrue.line,/script-request-header/);

const qxEnableDynamic=planQxScript(
  scriptV2AstToSemanticIr(parseScriptV2('request if ${url} ~= /enabled/ then script("https://example.com/e.js") with enable=${enabled}')),
  {scriptUrl:'https://example.com/e.js',sourceText:'$done({});',argumentIds:new Set(['enabled'])}
);
assert.equal(qxEnableDynamic.ok,true);
assert.match(qxEnableDynamic.line,/script-request-header/);
assert.match(qxEnableDynamic.notes.join('\n'),/defaults to enabled/i);

const v2DebugSource='response if ${url} ~= /debug/ then script("https://example.com/debug.js") with debug=true, tag="Debug"';
const v2DebugIr=scriptV2AstToSemanticIr(parseScriptV2(v2DebugSource),{source:v2DebugSource});
const qxV2Debug=planQxScript(v2DebugIr,{
  scriptUrl:'https://example.com/debug.js',
  sourceText:'$done({});',
  argumentIds:new Set(),
});
assert.equal(qxV2Debug.ok,true);
assert.doesNotMatch(qxV2Debug.line,/debug=/);
assert.match(qxV2Debug.notes.join('\n'),/debug.*omitted/i);

const v2DynamicDebugSource='response if ${url} ~= /debug-dynamic/ then script("https://example.com/debug-dynamic.js") with debug=${debugSwitch}, tag="DebugDynamic"';
const v2DynamicDebugIr=scriptV2AstToSemanticIr(parseScriptV2(v2DynamicDebugSource),{source:v2DynamicDebugSource});
const qxV2DynamicDebug=planQxScript(v2DynamicDebugIr,{
  scriptUrl:'https://example.com/debug-dynamic.js',
  sourceText:'$done({});',
  argumentIds:new Set(),
});
assert.equal(qxV2DynamicDebug.ok,true);
assert.doesNotMatch(qxV2DynamicDebug.line,/debug=/);
assert.match(qxV2DynamicDebug.notes.join('\n'),/debug.*omitted/i);

const surgeBinaryWithoutBody=planSurgeScript(
  scriptV2AstToSemanticIr(parseScriptV2('request if ${url} ~= /raw/ then script("raw.js") with binary_body_mode=true')),
  {scriptUrl:'raw.js',name:'Raw',argumentIds:new Set(),argumentTable:{byId:new Map()}}
);
assert.equal(surgeBinaryWithoutBody.ok,true);
assert.match(surgeBinaryWithoutBody.line,/binary-body-mode=true/);
assert.doesNotMatch(surgeBinaryWithoutBody.line,/requires-body=true/);

const qxBinaryWithoutBody=planQxScript(
  scriptV2AstToSemanticIr(parseScriptV2('request if ${url} ~= /raw/ then script("raw.js") with binary_body_mode=true')),
  {scriptUrl:'raw.js',sourceText:'$done({});',argumentIds:new Set()}
);
assert.equal(qxBinaryWithoutBody.ok,true);
assert.match(qxBinaryWithoutBody.line,/script-request-header/);
assert.doesNotMatch(qxBinaryWithoutBody.line,/script-request-body/);
assert.match(qxBinaryWithoutBody.notes.join('\n'),/binary_body_mode=true ignored/i);

const surgeV2=planSurgeScript(v2Ir,{
  scriptUrl:'https://example.com/v2.js',
  name:'V2',
  argumentIds:new Set(),
  argumentTable:{byId:new Map()},
});
assert.equal(surgeV2.ok,true);
assert.match(surgeV2.line,/^V2 = type=http-response,pattern=api,script-path=https:\/\/example\.com\/v2\.js,requires-body=true,max-size=-1,binary-body-mode=true$/);

console.log('Script IR target planner contract passed');
