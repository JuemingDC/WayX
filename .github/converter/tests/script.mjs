// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / script / Regression Suite

import { parseLegacyScriptLine, legacyScriptToSemanticIr, scriptV2AstToSemanticIr, parseScriptV2, planQxScript, planSurgeScript } from "../src/index.mjs";
import assert from "node:assert/strict";

import { spawnSync as runIsolatedCase } from 'node:child_process';
import { fileURLToPath as isolatedSuitePath } from 'node:url';
const suiteCases=["script-ir-target-planners.mjs"];
const selectedCase=process.argv.find(arg=>arg.startsWith('--case='))?.slice(7);
if (selectedCase && !suiteCases.includes(selectedCase)) throw new Error('Unknown suite case: '+selectedCase);
if (!selectedCase) {
  for (const name of suiteCases) {
    const child=runIsolatedCase(process.execPath,[isolatedSuitePath(import.meta.url),'--case='+name],{stdio:'inherit'});
    if (child.error) throw child.error;
    if (child.status!==0) process.exit(child.status ?? 1);
  }
}

if (selectedCase === "script-ir-target-planners.mjs") {
// Suite case: script-ir-target-planners.mjs
// Script IR / target planner contract
// Author: chance
// Category: Converter / Script / Architecture Validation


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
const qxForcedLegacy=planQxScript(disabledIr,{sourceText:'$done({});'});
assert.equal(qxForcedLegacy.ok,true);
assert.equal(qxForcedLegacy.disabled,undefined);
assert.match(qxForcedLegacy.notes.join('\n'),/forced to enabled/);
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
assert.match(qxEnableDynamic.notes.join('\n'),/forced to enabled/);

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
assert.equal(qxV2DynamicDebug.ok,false);
assert.match(qxV2DynamicDebug.reason,/undeclared.*debugSwitch/);

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
assert.match(surgeV2.line,/^V2 = type=http-response,pattern=api,script-path=https:\/\/example\.com\/v2\.js,requires-body=true,max-size=-1,binary-body-mode=true,timeout=20$/);

console.log('Script IR target planner contract passed');
}

if (selectedCase==='script-ir-target-planners.mjs') {
  for(const suffix of ['enable=false','enable=${off}']) {
    const ir=scriptV2AstToSemanticIr(parseScriptV2('request if ${url} ~= /off/ then script("https://example.test/author.js") with '+suffix));
    const qx=planQxScript(ir,{argumentIds:new Set(['off']),argumentTable:{byId:new Map([['off',{id:'off',hasDefault:true,defaultValue:false}]])}});
    assert.equal(qx.ok,true);
    assert.equal(qx.disabled,undefined);
    assert.match(qx.line,/script-request-header https:\/\/example\.test\/author\.js$/);
    assert.match(qx.notes.join('\n'),/forced to enabled/);
  }
  const cron=planQxScript(scriptV2AstToSemanticIr(parseScriptV2('cron "0 8 * * *" then script("https://example.test/task.js") with enable=false')));
  assert.equal(cron.ok,true);
  assert.equal(cron.disabled,undefined);
  assert.equal(cron.section,'task');
  assert.match(cron.line,/enabled=true/);
  const surgeOff=planSurgeScript(scriptV2AstToSemanticIr(parseScriptV2('request if ${url} ~= /off/ then script("https://example.test/author.js") with enable=false')));
  assert.equal(surgeOff.disabled,true);
}

if (selectedCase==='script-ir-target-planners.mjs') {
  const cases=[
    ['http-request api script-path=https://example.test/a.js',10],
    ['http-response api script-path=https://example.test/a.js',10],
    ['request if ${url} ~= /api/ then script("https://example.test/a.js")',20],
    ['response if ${url} ~= /api/ then script("https://example.test/a.js")',20],
    ['cron "0 8 * * *" then script("https://example.test/a.js")',300],
    ['network-changed then script("https://example.test/a.js")',300],
    ['generic then script("https://example.test/a.js")',300],
  ];
  const {parseScriptDeclaration,buildSurgeArgumentTable}=await import('../src/index.mjs');
  for(const [source,seconds] of cases) {
    const ir=parseScriptDeclaration(source);
    const out=planSurgeScript(ir);
    assert.equal(out.ok,true,source);
    assert.deepEqual(out.line.match(/timeout=[^,]+/g),['timeout='+seconds]);
    assert.equal(ir.options.some(o=>o.name==='timeout'),false,'the source IR keeps an omitted timeout omitted');
    const qx=planQxScript(ir);
    assert.equal(qx.ok,true);
    assert.doesNotMatch(qx.line,/timeout=/);
    const explicit=parseScriptDeclaration(source+(ir.sourceSyntax==='legacy'?', timeout=1.5':' with timeout=1.5'));
    assert.deepEqual(planSurgeScript(explicit).line.match(/timeout=[^,]+/g),['timeout=1.5']);
  }
  const argumentTable=buildSurgeArgumentTable(['limit = input,30,type=number,tag=Timeout']);
  for(const source of [
    'http-response api script-path=https://example.test/a.js,timeout={limit}',
    'response if ${url} ~= /api/ then script("https://example.test/a.js") with timeout=${limit}',
    'generic then script("https://example.test/a.js") with timeout=${limit}',
  ]) {
    const out=planSurgeScript(parseScriptDeclaration(source),{argumentTable,argumentIds:new Set(['limit'])});
    assert.equal(out.ok,true,JSON.stringify(out));
    assert.deepEqual(out.line.match(/timeout=[^,]+/g),['timeout='+argumentTable.byId.get('limit').placeholder]);
  }
  for(const option of ['requires_body=true','binary_body_mode=true','requires_body=false, binary_body_mode=true']) {
    const out=planSurgeScript(parseScriptDeclaration('request if ${url} ~= /api/ then script("a.js") with '+option));
    assert.match(out.line,/,timeout=20$/);
    assert.equal(out.line.includes('requires-body=true'),option.startsWith('requires_body=true'));
  }
  console.log('Source Script timeout defaults passed: legacy HTTP 10s, v2 HTTP 20s, v2 non-HTTP 300s; explicit/dynamic values retained');
}

if(selectedCase==='script-ir-target-planners.mjs') {
  const {parseScriptDeclaration,buildSurgeArgumentTable}=await import('../src/index.mjs');
  const sources=(name)=>[
    'http-request api script-path=https://example.test/a.js,'+name+'={value}',
    'http-response api script-path=https://example.test/a.js,'+name+'={value}',
    'request if ${url} ~= /api/ then script("https://example.test/a.js") with '+name+'=${value}',
    'response if ${url} ~= /api/ then script("https://example.test/a.js") with '+name+'=${value}',
    'generic then script("https://example.test/a.js") with '+name+'=${value}',
    'network-changed then script("https://example.test/a.js") with '+name+'=${value}',
    'cron "0 8 * * *" then script("https://example.test/a.js") with '+name+'=${value}',
  ];
  const invalid=[
    ['timeout','value=switch,true','type'],
    ['debug','value=input,"false"','type'],
    ['enable','value=input,"true"','type'],
    ['timeout','value=input,"20ms"','default'],
    ['timeout','value=input,"Infinity"','default'],
    ['timeout','value=input,"0"','default'],
    ['timeout','value=input,-1,type=number','default'],
    ['timeout','value=input,""','default'],
    ['debug','value=switch,yes','default'],
  ];
  for(const [name,declaration,reason] of invalid) {
    const argumentTable=buildSurgeArgumentTable([declaration]);
    for(const source of sources(name)) {
      const ir=parseScriptDeclaration(source);
      const opts={argumentTable,argumentIds:new Set(['value'])};
      const surge=planSurgeScript(ir,opts);
      assert.equal(surge.ok,false,source);assert.match(surge.reason,new RegExp('invalid.*'+reason+'.*'+name));
      const qx=planQxScript(ir,opts);
      assert.equal(qx.ok,name==='enable',source); // Explicit user policy wins.
      if(!qx.ok)assert.match(qx.reason,new RegExp('invalid.*'+reason+'.*'+name));
    }
  }
  for(const [name,declaration] of [['timeout','value=input,"20"'],['timeout','value=input,"+20"'],['timeout','value=input,".5"'],['timeout','value=input,"1e2"'],['timeout','value=input,2.5,type=number'],['debug','value=switch,true'],['enable','value=switch,false']]) {
    const argumentTable=buildSurgeArgumentTable([declaration]);
    for(const source of sources(name)) {
      const ir=parseScriptDeclaration(source),opts={argumentTable,argumentIds:new Set(['value'])};
      const surge=planSurgeScript(ir,opts),qx=planQxScript(ir,opts);
      assert.equal(surge.ok,true,JSON.stringify(surge));assert.equal(qx.ok,true,JSON.stringify(qx));
      assert.ok(surge.line.includes(argumentTable.byId.get('value').placeholder));
      if(name==='debug')assert.match(surge.line,/,debug=\{\{\{value\}\}\}$/);
      assert.doesNotMatch(qx.line,/timeout=|debug=/);
      if(name==='timeout')assert.equal(argumentTable.byId.get('value').valueType,declaration.includes('type=number')?'number':'string');
    }
  }
  const missingTable=buildSurgeArgumentTable(['value=input,type=number']);
  for(const source of sources('timeout')) {
    const ir=parseScriptDeclaration(source);
    const missing=planSurgeScript(ir,{argumentTable:missingTable});
    assert.equal(missing.ok,false);assert.match(missing.reason,/missing.*default.*timeout/);
    assert.equal(planQxScript(ir,{argumentTable:missingTable}).ok,true);
    const undeclared=planSurgeScript(ir,{argumentTable:buildSurgeArgumentTable([])});
    assert.equal(undeclared.ok,false);assert.match(undeclared.reason,/undeclared.*timeout/);
  }
  const legacyDebug=planSurgeScript(parseScriptDeclaration('http-request api script-path=a.js,debug=true'));
  assert.match(legacyDebug.line,/,debug=true$/);
  console.log('Dynamic Script option bindings passed: types/defaults/missing values, both syntaxes/targets, all supported phases and QX force-enable');
}

if(selectedCase==='script-ir-target-planners.mjs') {
  const {scriptV2ToSource,parseScriptDeclaration}=await import('../src/index.mjs');
  const triggers=['request if ${url} ~= /api/','response if ${url} ~= /api/','cron "0 8 * * *"','network-changed','generic'];
  for(const trigger of triggers) {
    for(const field of ['path','tag','img_url']) {
      const source=value=>trigger+' then script('+(field==='path'?value:'"a.js"')+')'+(field==='path'?'':' with '+field+'='+value);
      for(const invalid of ['"${region}"',"\"\\\\${region}\"",'${region}'])assert.throws(()=>parseScriptV2(source(invalid)),/fixed|template|invalid value type/);
      for(const [value,expected] of [[String.raw`"\${region}"`,'${region}'],['`${region}`','${region}'],['`a``b`','a`b'],['"plain"','plain']]) {
        const ast=parseScriptV2(source(value));
        const actual=field==='path'?ast.script.path:ast.options[0].value.value;
        assert.equal(actual,expected,source(value));
        const again=parseScriptV2(scriptV2ToSource(ast));
        assert.equal(field==='path'?again.script.path:again.options[0].value.value,expected);
        const ir=parseScriptDeclaration(source(value));
        assert.equal(planQxScript(ir).ok,true);assert.equal(planSurgeScript(ir).ok,true);
      }
    }
    assert.throws(()=>parseScriptV2(trigger+' then script("")'),/non-empty/);
    assert.throws(()=>parseScriptV2(trigger+' then script(``)'),/non-empty/);
  }
  const manual=parseScriptV2('generic then script(`literal-${region}.js`)');
  delete manual.script.pathNode;
  assert.equal(parseScriptV2(scriptV2ToSource(manual)).script.path,'literal-${region}.js');
  const escaped=parseScriptDeclaration("request if ${url} ~= /api/ then script(\"https://example.test/\\${region}.js\") with tag=\"\\${tag}\"");
  assert.equal(escaped.script.path,'https://example.test/${region}.js');
  assert.equal(planQxScript(escaped).tag,'${tag}');
  console.log('Fixed Script fields passed: templates rejected, escaped/raw literals decoded once, all phases and lexical round trips retained');
}
