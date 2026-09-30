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
  parseLegacyScriptLine('http-response ^https://x\\.example script-path=https://example.com/a.js, max-size=2048')
);
assert.equal(planQxScript(maxSizeIr,{sourceText:'$done({});'}).ok,false);
assert.match(planQxScript(maxSizeIr,{sourceText:'$done({});'}).reason,/max-size/);

const v2Source='response if ${url} ~= /api/ then script("https://example.com/v2.js") with requires_body=true, binary_body_mode=true, tag="V2"';
const v2Ast=parseScriptV2(v2Source);
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

const surgeV2=planSurgeScript(v2Ir,{
  scriptUrl:'https://example.com/v2.js',
  name:'V2',
  argumentIds:new Set(),
  argumentTable:{byId:new Map()},
});
assert.equal(surgeV2.ok,true);
assert.match(surgeV2.line,/^V2 = type=http-response,pattern=api,script-path=https:\/\/example\.com\/v2\.js,requires-body=true,max-size=-1,binary-body-mode=true$/);

console.log('Script IR target planner contract passed');
