// README/install index regression contract.
// Author: chance
// Category: Converter / README Index Test
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  README_AUTO_UPDATE_INTERVAL,
  buildReadmePlan,
  qxAddResourceUrl,
  splitQxSnippet,
  surgeModuleInstallUrl,
} from '../src/readme-index.mjs';

assert.equal(README_AUTO_UPDATE_INTERVAL,86400);
const split=splitQxSnippet(`# Name: Demo\n# [filter_local]\nhost,ads.example,reject\n# [rewrite_local]\n^https://example url reject\n# [mitm]\nhostname = example\n`);
assert.equal(split.filter,'host,ads.example,reject');
assert.equal(split.rewrite,'^https://example url reject\n\nhostname = example');
assert.throws(()=>splitQxSnippet('# Name: Missing markers\nfoo'),/missing commented section markers/);

const qx=decodeURIComponent(qxAddResourceUrl({rewrite_remote:[`https://example.com/a.snippet, tag=Demo, update-interval=${README_AUTO_UPDATE_INTERVAL}, enabled=true`]}).split('remote-resource=')[1]);
assert.match(qx,/"rewrite_remote"/);
assert.match(qx,/update-interval=86400/);
assert.match(surgeModuleInstallUrl('Module/Demo/Surge/Demo.sgmodule'),/^https:\/\/surge\.app\/install-module\?url=/);

const root=await fs.mkdtemp(path.join(os.tmpdir(),'wayx-readme-'));
await Promise.all([
  fs.mkdir(path.join(root,'Boxjs/QuantumultX'),{recursive:true}),
  fs.mkdir(path.join(root,'Module/Demo/QuantumultX'),{recursive:true}),
  fs.mkdir(path.join(root,'Module/Demo/Surge'),{recursive:true}),
  fs.mkdir(path.join(root,'Adblock/Quantumult X'),{recursive:true}),
  fs.mkdir(path.join(root,'Adblock/Surge'),{recursive:true}),
  fs.mkdir(path.join(root,'Rule/QuantumultX'),{recursive:true}),
]);
await fs.writeFile(path.join(root,'Boxjs/QuantumultX/Sub.json'),'{"name":"Chance Sub"}\n');
await fs.writeFile(path.join(root,'Module/Demo/QuantumultX/Demo.snippet'),'# Name: Demo Module\n# [rewrite_local]\n^https://demo url reject\n# [mitm]\nhostname = demo\n');
await fs.writeFile(path.join(root,'Module/Demo/Surge/Demo.sgmodule'),'#!name=Demo Module\n[URL Rewrite]\n^https://demo - reject\n');
await fs.writeFile(path.join(root,'Adblock/Quantumult X/Ads.snippet'),'# Name: Ads\n# [filter_local]\nhost,ads.example,reject\n# [rewrite_local]\n^https://ads.example url reject\n# [mitm]\nhostname = ads.example\n');
await fs.writeFile(path.join(root,'Adblock/Surge/Ads.sgmodule'),'#!name=Ads\n[URL Rewrite]\n^https://ads.example - reject\n');
await fs.writeFile(path.join(root,'Rule/QuantumultX/Apple.list'),'# NAME: Apple APNs\nHOST-SUFFIX,push.apple.com,PROXY\n');

const plan=await buildReadmePlan(root);
const readme=plan.get('README.md');
assert.ok(readme);
assert.ok(readme.indexOf('## BoxJs') < readme.indexOf('## Module'));
assert.ok(readme.indexOf('## Module') < readme.indexOf('## Adblock'));
assert.ok(readme.indexOf('## Adblock') < readme.indexOf('## Rule'));
assert.match(readme,/Chance Sub/);
assert.match(readme,/Demo Module/);
assert.match(readme,/Ads/);
assert.match(readme,/Apple APNs/);
assert.match(readme,/update-interval%3D86400/);
assert.equal(/Kelee Lpx Loon UA/i.test(readme),false);
assert.ok(plan.has('Resource/Install/QuantumultX/Adblock/Ads.filter.list'));
assert.ok(plan.has('Resource/Install/QuantumultX/Adblock/Ads.rewrite.snippet'));

await fs.rm(root,{recursive:true,force:true});
console.log('README/install index contract passed');
