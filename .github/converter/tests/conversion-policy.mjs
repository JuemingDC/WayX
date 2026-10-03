// Conversion policy metadata and canonical-validator regression
// Converted: 2026-10-03
// Author: chance
// Category: Converter / Validation / Regression
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {validateConversionMetadata} from '../src/metadata.mjs';
import {validateQX} from '../src/qx-snippet-validator.mjs';
import {validateSurgeModule} from '../src/surge-module.mjs';
const entry={id:'Synthetic'};
const qx=`# Converted: 2026-10-03
# Converted by: chance
# Category: Test
# Target: Quantumult X
# Source: https://example.com/demo.lpx
# [filter_local]
{# Domain #} host, example.com, reject
# [rewrite_local]
^https://example.com/ url jsonjq-response-body '.items'
# [task_local]
event-interaction https://example.com/task.js, tag=Demo, enabled=true
# [mitm]
hostname = example.com
`;
validateConversionMetadata(qx,entry,'qx');validateQX(qx,entry);
assert.throws(()=>validateQX(qx.replace("^https://example.com/ url jsonjq-response-body '.items'",'response if ${url} ~= /api/ then reject(404)'),entry));
assert.throws(()=>validateConversionMetadata(qx.replace('# Converted by: chance',''),entry,'qx'),/metadata/);
const surge=`#!name=Demo
#!desc=Demo
#!category=WayX
# Converted: 2026-10-03
# Converted by: chance
# Target: Surge
# Source: https://example.com/demo.lpx
[General]
always-real-ip = %APPEND% api.example.com
[Rule]
DOMAIN,example.com,REJECT
[MITM]
hostname = %APPEND% example.com
`;
validateConversionMetadata(surge,entry,'surge');validateSurgeModule(surge,entry);
assert.throws(()=>validateConversionMetadata(surge.replace('#!category=WayX','#!category=Other'),entry,'surge'),/exactly one/);
assert.throws(()=>validateConversionMetadata(surge.replace('#!category=WayX','#!category=WayX\n#!category=WayX'),entry,'surge'),/exactly one/);
assert.throws(()=>validateConversionMetadata(surge.replace('#!category=WayX','#!category=WayX\n# Category: Test'),entry,'surge'),/legacy/);
assert.throws(()=>validateConversionMetadata(surge.replace('hostname = %APPEND%','hostname ='),entry,'surge'),/%APPEND%/);
// Previously rejected legal task/header/General declarations use the same
// validators as converter execution; no second capability allowlist is copied.
for(const [target,file] of [
 ['qx','Adblock/Quantumult X/Auto_Join_TF.snippet'],
 ['qx','Adblock/Quantumult X/NodeLinkCheck.snippet'],
 ['qx','Adblock/Quantumult X/Bilibili_remove_ads.snippet'],
 ['surge','Adblock/Surge/SeasunJX3_remove_ads.sgmodule'],
]){
 const text=await fs.readFile(file,'utf8');validateConversionMetadata(text,entry,target);
 if(target==='qx')validateQX(text,entry);else validateSurgeModule(text,entry);
}
console.log('Conversion policy canonical validator regression passed');
