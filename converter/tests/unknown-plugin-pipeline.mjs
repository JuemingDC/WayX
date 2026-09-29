import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';

import {
  prepareEntryConversion,
  renderEntryConversion,
  validateQX,
  writeConversionArtifacts,
  writeSourceArtifact,
} from '../../.github/scripts/sync-convert.mjs';
import { validateSurgeModule } from '../src/surge-module.mjs';

const requests = [];
let pluginText = '';

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  requests.push(pathname);

  if (pathname === '/vendor/unknown.lpx') {
    res.writeHead(200, {'content-type':'text/plain; charset=utf-8'});
    res.end(pluginText);
    return;
  }
  if (pathname === '/vendor/source.js') {
    res.writeHead(200, {'content-type':'application/javascript; charset=utf-8'});
    res.end('// Original author source script\n$done({body:$response.body});\n');
    return;
  }
  if (pathname === '/vendor/filter.jq') {
    res.writeHead(200, {'content-type':'text/plain; charset=utf-8'});
    res.end('# original jq comment\ndel(.data.ads)\n');
    return;
  }

  res.writeHead(404, {'content-type':'text/plain'});
  res.end('not found');
});

server.listen(0, '127.0.0.1');
await once(server, 'listening');

const address = server.address();
assert.ok(address && typeof address === 'object');
const origin = 'http://127.0.0.1:' + address.port;

pluginText = [
  '#!name=Unfamiliar Fixture',
  '#!desc=Production pipeline smoke fixture',
  '#!author=Fixture Author',
  '',
  '[Rule]',
  '# preserve-rule-comment',
  'DOMAIN-SUFFIX,example.com,DIRECT',
  'URL-REGEX,^https://ads[.]example[.]com,REJECT-DICT',
  '',
  '[Rewrite]',
  '# preserve-rewrite-comment',
  '^https://legacy[.]example[.]com reject',
  'response if ${url} ~= /jq[.]example[.]com/ then response.json.jq_file("./filter.jq")',
  'request if ${url} ~= /go[.]example[.]com(.*)/ as urlMatch then redirect(302, "https://target.example.com/${urlMatch.1}")',
  '',
  '[Script]',
  'http-response ^https://api[.]example[.]com script-path=./source.js,tag=fixture_response,requires-body=true',
  '',
  '[MITM]',
  'hostname = api.example.com, ads.example.com',
  '',
].join('\n');

const entry = {
  id:'UnknownFixture',
  file:'SyntheticVendor/unfamiliar.lpx',
  source:origin + '/vendor/unknown.lpx',
  qx:'UnknownFixture.snippet',
  surge:'UnknownFixture.sgmodule',
  category:'测试 / 通用转换',
};

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'wayx-unknown-plugin-'));
try {
  const prepared = await prepareEntryConversion(entry);

  assert.equal(prepared.source, pluginText);
  assert.deepEqual([...prepared.scriptMap.keys()], ['./source.js']);
  assert.equal(prepared.scriptMap.get('./source.js')?.qx, origin + '/vendor/source.js');
  assert.equal(prepared.scriptMap.get('./source.js')?.surge, origin + '/vendor/source.js');

  const out = renderEntryConversion(entry, prepared, '2026-09-29 18:00:00 +08:00');
  validateQX(out.qx, entry);
  validateSurgeModule(out.surge, entry);

  const sourceWrite = await writeSourceArtifact(entry, prepared.source, {root});
  const generatedWrite = await writeConversionArtifacts(entry, out, {root});

  assert.equal(sourceWrite.changed, true);
  assert.equal(generatedWrite.qx, true);
  assert.equal(generatedWrite.surge, true);

  const sourcePath = path.join(root, 'Resource', 'Loon', 'SyntheticVendor', 'unfamiliar.lpx');
  const qxPath = path.join(root, 'Adblock', 'Quantumult X', 'UnknownFixture.snippet');
  const surgePath = path.join(root, 'Adblock', 'Surge', 'UnknownFixture.sgmodule');

  assert.equal(await fs.readFile(sourcePath, 'utf8'), pluginText);
  const qx = await fs.readFile(qxPath, 'utf8');
  const surge = await fs.readFile(surgePath, 'utf8');

  assert.ok(qx.includes('# Converted: 2026-09-29 18:00:00 +08:00'));
  assert.ok(qx.includes('# Converted by: chance'));
  assert.ok(qx.includes('# Category: 测试 / 通用转换'));
  assert.ok(qx.includes('# [filter_local]'));
  assert.ok(qx.includes('# [rewrite_local]'));
  assert.ok(qx.includes('# [mitm]'));
  assert.ok(qx.includes('# preserve-rule-comment'));
  assert.ok(qx.includes('# preserve-rewrite-comment'));
  assert.ok(qx.includes('url reject-dict'));
  assert.ok(qx.includes('url reject'));
  assert.ok(qx.includes('jsonjq-response-body'));
  assert.ok(qx.includes('del(.data.ads)'));
  assert.ok(qx.includes('script-response-body ' + origin + '/vendor/source.js'));

  assert.ok(surge.includes('[Rule]'));
  assert.ok(surge.includes('[URL Rewrite]'));
  assert.ok(surge.includes('[Body Rewrite]'));
  assert.ok(surge.includes('[Map Local]'));
  assert.ok(surge.includes('[Script]'));
  assert.ok(surge.includes('[MITM]'));
  assert.ok(surge.includes('data="{}"'));
  assert.ok(surge.includes('_ reject'));
  assert.ok(surge.includes('script-path=' + origin + '/vendor/source.js'));
  assert.ok(surge.includes('hostname = %APPEND% api.example.com, ads.example.com'));

  assert.ok(out.generatedScripts.size >= 1, 'redirect should generate at least one QX helper');
  const helperNames = [...out.generatedScripts.keys()];
  assert.ok(helperNames.some(name => name.startsWith('redirect_') && name.endsWith('.js')));
  for (const name of helperNames) {
    await fs.access(path.join(root, 'script', entry.id, name));
  }

  assert.deepEqual(
    [...requests].sort(),
    ['/vendor/filter.jq', '/vendor/source.js', '/vendor/unknown.lpx'].sort(),
    'pipeline must fetch only the original plugin and its original resolved dependencies',
  );

  const secondSource = await writeSourceArtifact(entry, prepared.source, {root});
  const secondTargets = await writeConversionArtifacts(entry, out, {root});
  assert.equal(secondSource.changed, false);
  assert.equal(secondTargets.qx, false);
  assert.equal(secondTargets.surge, false);
  assert.deepEqual(secondTargets.helpers, []);

  console.log('Unknown-plugin production pipeline smoke passed');
} finally {
  server.close();
  await once(server, 'close');
  await fs.rm(root, {recursive:true, force:true});
}
