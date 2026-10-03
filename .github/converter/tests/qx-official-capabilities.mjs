// Quantumult X official evidence gate for Loon ad-block conversion
// Author: chance
// Category: Converter / Quantumult X / Validation

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  QX_WAYX_FILTER_TYPES,
  QX_WAYX_REWRITE_MATCHERS,
  QX_WAYX_SCRIPT_ACTIONS,
  QX_WAYX_NATIVE_REWRITE_ACTIONS,
  QX_WAYX_SNIPPET_MITM_KEYS,
} from '../src/qx-official-capabilities.mjs';
import { validateQX } from '../src/qx-snippet-validator.mjs';

const ROOT = process.cwd();
const fixture = JSON.parse(await fs.readFile(
  path.join(ROOT, '.github/converter/fixtures/qx-official-capabilities.json'),
  'utf8',
));
const RAW = 'https://raw.githubusercontent.com/crossutility/Quantumult-X/master/';

async function fetchText(name) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(RAW + name, { signal:AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }
  throw new Error('failed to fetch official Quantumult X ' + name + ': ' + String(lastError?.message || lastError));
}

const sorted = values => [...values].sort();

function sectionLines(text, wanted) {
  const out = [];
  let section = null;
  for (const raw of String(text).replace(/\r\n?/g, '\n').split('\n')) {
    const trimmed = raw.trim();
    const header = trimmed.match(/^\[([^\]]+)\]$/);
    if (header) { section = header[1].toLowerCase(); continue; }
    if (section === wanted.toLowerCase()) out.push(trimmed);
  }
  return out;
}

function uncomment(line) {
  const text = String(line || '').trim();
  return text.startsWith(';') ? text.slice(1).trim() : text;
}

function officialRuleTypes(sample) {
  const out = new Set();
  for (const raw of sectionLines(sample, 'filter_local')) {
    const line = uncomment(raw);
    if (!line || line.startsWith('#')) continue;
    const comma = line.indexOf(',');
    if (comma > 0) out.add(line.slice(0, comma).trim().toLowerCase());
  }
  return out;
}

function officialRewriteMatchers(sample) {
  const out = new Set();
  for (const raw of sectionLines(sample, 'rewrite_local')) {
    const line = uncomment(raw);
    if (!line || line.startsWith('#')) continue;
    if (line.includes(' url ')) out.add('url');
    if (line.includes(' url-and-header ')) out.add('url-and-header');
  }
  return out;
}

function officialRewriteActions(sample) {
  const out = new Set();
  for (const raw of sectionLines(sample, 'rewrite_local')) {
    const line = uncomment(raw);
    if (!line || line.startsWith('#')) continue;

    let tail = null;
    const urlMarker = line.indexOf(' url ');
    if (urlMarker >= 0) {
      tail = line.slice(urlMarker + 5).trim();
    } else {
      const match = line.match(/^\S+\s+.+?\s+url-and-header\s+(.+)$/);
      if (match) tail = match[1].trim();
    }
    if (!tail) continue;

    const action = tail.split(/\s+/)[0];
    if (action) out.add(action);
  }
  if (/\bjsonjq-request-body\b/.test(sample)) out.add('jsonjq-request-body');
  for (const action of [
    'script-request-header','script-request-body',
    'script-response-header','script-response-body',
    'script-echo-response','script-analyze-echo-response',
  ]) {
    if (sample.includes(action)) out.add(action);
  }
  return out;
}

function snippetMitmKeys(snippet) {
  const out = new Set();
  for (const raw of String(snippet).replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line || /^(?:#|;|\/\/)/.test(line)) continue;
    const match = line.match(/^([A-Za-z0-9_-]+)\s*=/);
    if (match) out.add(match[1].toLowerCase());
  }
  return out;
}

const scriptSamples=fixture.authority.officialScriptSamples;
const [sample, rewriteSnippet, filterSnippet, rewriteDoc, requestHeaderSample, responseHeaderSample, responseBodySample, echoResponseSample] = await Promise.all([
  fetchText(fixture.authority.officialSamplePath),
  fetchText(fixture.authority.officialRewriteSnippetPath),
  fetchText(fixture.authority.officialFilterSnippetPath),
  fetchText(fixture.authority.officialRewriteDocPath),
  fetchText(scriptSamples.requestHeader),
  fetchText(scriptSamples.responseHeader),
  fetchText(scriptSamples.responseBody),
  fetchText(scriptSamples.echoResponse),
]);

const officialRules = officialRuleTypes(sample);
const officialRewriteMatchersSet = officialRewriteMatchers(sample);
const officialRewrites = officialRewriteActions(sample);
const officialMitm = snippetMitmKeys(rewriteSnippet);
const reviewedUiRewrites = new Set(Object.keys(fixture.authority.manualRewriteEvidence || {}));

function assertContains(text, pattern, label) {
  assert.ok(pattern.test(String(text)), 'QX official Script evidence drifted: ' + label);
}

// Crossutility's own samples are the runtime contract for helper/dispatcher work.
assertContains(rewriteDoc,/script-response-body/, 'rewrite.md documents script-response-body');
assertContains(requestHeaderSample,/\$request\.(?:url|path|method|headers)/, 'request-header sample reads request context');
assertContains(requestHeaderSample,/\$done\s*\(\s*\{\s*\}\s*\)/, 'request-header sample proves $done({}) no-op');
assertContains(requestHeaderSample,/\$done\s*\(\s*\{[\s\S]*?path\s*:[\s\S]*?headers\s*:/, 'request-header sample returns path + headers');
assertContains(responseHeaderSample,/\$response\.(?:statusCode|headers)/, 'response-header sample reads response context');
assertContains(responseHeaderSample,/\$done\s*\(\s*\{\s*\}\s*\)/, 'response-header sample proves $done({}) no-op');
assertContains(responseHeaderSample,/\$done\s*\(\s*\{[\s\S]*?status\s*:[\s\S]*?headers\s*:/, 'response-header sample returns status + headers');
assertContains(responseBodySample,/\$response\.body/, 'response-body sample reads response body');
assertContains(responseBodySample,/\$done\s*\(/, 'response-body sample completes through $done');
assertContains(responseBodySample,/headers[\s\S]*status|status[\s\S]*headers/, 'response-body sample documents optional headers/status');
assertContains(echoResponseSample,/status[\s\S]*headers[\s\S]*body/, 'echo-response sample constructs response status/headers/body');
assertContains(echoResponseSample,/\$done\s*\(\s*myResponse\s*\)/, 'echo-response sample returns full response');

assert.deepEqual(sorted(QX_WAYX_FILTER_TYPES), fixture.ruleTypes, 'QX Rule-type registry drifted from reviewed WayX adblock baseline');
assert.deepEqual(sorted(QX_WAYX_REWRITE_MATCHERS), fixture.rewriteMatchers, 'QX Rewrite matcher registry drifted from reviewed WayX adblock baseline');
assert.deepEqual(sorted(QX_WAYX_NATIVE_REWRITE_ACTIONS), fixture.rewriteActions, 'QX Rewrite registry drifted from reviewed WayX adblock baseline');
assert.deepEqual(sorted(QX_WAYX_SNIPPET_MITM_KEYS), fixture.mitmKeys, 'QX hostname registry drifted from reviewed WayX adblock baseline');

for (const type of fixture.ruleTypes) {
  assert.ok(officialRules.has(type), 'WayX QX Rule type lost official sample evidence: ' + type);
}
for (const matcher of fixture.rewriteMatchers) {
  assert.ok(officialRewriteMatchersSet.has(matcher), 'WayX QX Rewrite matcher lost official sample evidence: ' + matcher);
}
for (const action of fixture.rewriteActions) {
  if (reviewedUiRewrites.has(action)) continue;
  assert.ok(officialRewrites.has(action), 'WayX QX Rewrite action lost official sample evidence: ' + action);
}
for (const action of reviewedUiRewrites) {
  assert.ok(
    fixture.rewriteActions.includes(action),
    'QX manually reviewed UI Rewrite action must remain in the scoped capability set: ' + action,
  );
}
for (const key of fixture.mitmKeys) {
  assert.ok(officialMitm.has(key), 'WayX QX MITM hostname key lost official rewrite-snippet evidence: ' + key);
}

for (const action of QX_WAYX_SCRIPT_ACTIONS) {
  assert.ok(fixture.rewriteActions.includes(action), 'QX Script action must remain inside the scoped Rewrite capability set: ' + action);
}

const headerMatchedActionTails = [
  'reject',
  'reject-200',
  'reject-img',
  'reject-dict',
  'reject-array',
  '302 https://example.com/new',
  '307 https://example.com/new',
  "jsonjq-request-body '.'",
  "jsonjq-response-body '.'",
  'request-header ^GET(.*) request-header POST$1',
  'response-header ^HTTP/(.*) response-header HTTP/$1',
  'request-body x request-body y',
  'response-body x response-body y',
  'echo-response text/html echo-response index.html',
  'script-request-header request-header.js',
  'script-request-body request-body.js',
  'script-response-header response-header.js',
  'script-response-body response-body.js',
  'script-echo-response echo.js',
  'script-analyze-echo-response analyze.js',
];

validateQX([
  '# [rewrite_local]',
  '^https://api\\.example\\.com url response-header ^([^\\\\r\\\\n]+)(\\\\r\\\\n) response-header $1$2X-Test: 1$2',
  '^https://page\\.example\\.com url echo-response text/html echo-response index.html',
  ...headerMatchedActionTails.map(action => '^https://header\\.example\\.com ^POST url-and-header ' + action),
  '# [mitm]',
].join('\n'),{id:'QxNativeRewriteFixture'});
assert.throws(
  () => validateQX([
    '# [rewrite_local]',
    '^https://page\\.example\\.com url echo-response text/html echo-response https://example.com/index.html',
    '# [mitm]',
  ].join('\n'),{id:'QxRemoteEchoFixture'}),
  /local Data-relative path/,
);

// The official filter resource is used only as supporting evidence for the
// Rule types that WayX actually emits from Loon ad-block plugins.
for (const raw of String(filterSnippet).split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || /^(?:#|;|\/\/)/.test(line)) continue;
  const comma = line.indexOf(',');
  if (comma < 1) continue;
  const type = line.slice(0, comma).trim().toLowerCase();
  if (fixture.ruleTypes.includes(type)) assert.ok(officialRules.has(type));
}

console.log(
  'Quantumult X scoped adblock capability gate passed: ' +
  fixture.ruleTypes.length + ' Rule types / ' +
  fixture.rewriteMatchers.length + ' Rewrite matchers / ' +
  fixture.rewriteActions.length + ' Rewrite actions (' +
  reviewedUiRewrites.size + ' current-app UI reviewed) / hostname / official Script runtime samples'
);
