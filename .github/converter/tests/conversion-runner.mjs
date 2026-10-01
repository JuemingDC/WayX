// Validated conversion runner behavior contract.
// Author: chance
// Category: Converter / Execution / Validation Test

import assert from 'node:assert/strict';
import {
  materializeConversionRunContext,
  convertPluginWithContext,
  validateConvertedPlugin,
} from '../src/conversion-runner.mjs';

const entry={
  id:'RunnerFixture',
  category:'去广告',
  source:'https://example.invalid/RunnerFixture.lpx',
  qx:'RunnerFixture.snippet',
  surge:'RunnerFixture.sgmodule',
};

const source=[
  '#!name=RunnerFixture',
  '#!desc=Validated runner fixture',
  '',
  '[Rule]',
  'DOMAIN-SUFFIX,ads.example,REJECT',
  '',
].join('\n');

const firstStages=[];
const context=await materializeConversionRunContext(entry,source,{
  onStage:stage=>firstStages.push(stage),
});
const first=convertPluginWithContext(entry,source,context,{
  stamp:'2026-10-01 12:00:00 +08:00',
  rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main',
  onStage:stage=>firstStages.push(stage),
});
assert.deepEqual(firstStages,['materialize-context','convert']);

validateConvertedPlugin(entry,first,{
  onStage:stage=>firstStages.push(stage),
});
assert.deepEqual(firstStages,[
  'materialize-context',
  'convert',
  'validate-qx',
  'validate-surge',
]);
assert.match(first.qx,/^# Converted: 2026-10-01 12:00:00 \+08:00$/m);
assert.match(first.surge,/^# Converted: 2026-10-01 12:00:00 \+08:00$/m);

const rerunStages=[];
const second=convertPluginWithContext(entry,source,context,{
  stamp:'2026-10-01 12:01:00 +08:00',
  rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main',
  onStage:stage=>rerunStages.push(stage),
});
assert.deepEqual(rerunStages,['convert']);

validateConvertedPlugin(entry,second,{
  surgeValidationOptions:{adblockScope:true},
  onStage:stage=>rerunStages.push(stage),
});
assert.deepEqual(rerunStages,[
  'convert',
  'validate-qx',
  'validate-surge',
]);
assert.match(second.qx,/^# Converted: 2026-10-01 12:01:00 \+08:00$/m);
assert.match(second.surge,/^# Converted: 2026-10-01 12:01:00 \+08:00$/m);
assert.notEqual(first.qx,second.qx);
assert.notEqual(first.surge,second.surge);

console.log('Validated conversion runner contract passed');
