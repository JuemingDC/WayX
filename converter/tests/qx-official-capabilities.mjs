// Quantumult X official sample capability drift gate
// Author: chance
// Category: Converter / Quantumult X / Validation

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  QX_WAYX_FILTER_TYPES,
  QX_WAYX_SCRIPT_ACTIONS,
  QX_WAYX_REWRITE_MATCH_KINDS,
  QX_WAYX_NATIVE_REWRITE_ACTIONS,
  QX_WAYX_NOT_EMITTED,
  QX_WAYX_SNIPPET_MITM_KEYS,
} from '../src/qx-official-capabilities.mjs';

const ROOT = process.cwd();
const fixture = JSON.parse(await fs.readFile(
  path.join(ROOT, 'converter/fixtures/qx-official-capabilities.json'),
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

function sorted(values) {
  return [...values].sort();
}

function sectionLines(text, wanted) {
  const out = [];
  let section = null;
  for (const raw of String(text).replace(/\r\n?/g, '\n').split('\n')) {
    const trimmed = raw.trim();
    const header = trimmed.match(/^\[([^\]]+)\]$/);
    if (header) {
      section = header[1].toLowerCase();
      continue;
    }
    if (section !== wanted.toLowerCase()) continue;
    out.push(trimmed);
  }
  return out;
}

function uncommentExample(line) {
  const text = String(line || '').trim();
  if (text.startsWith(';')) return text.slice(1).trim();
  return text;
}

function extractFilterTypes(sample) {
  const types = new Set();
  for (const raw of sectionLines(sample, 'filter_local')) {
    const line = uncommentExample(raw);
    if (!line || line.startsWith('#')) continue;
    const comma = line.indexOf(',');
    if (comma < 1) continue;
    types.add(line.slice(0, comma).trim().toLowerCase());
  }
  return types;
}

function rewriteActionFromTail(tail) {
  const first = String(tail || '').trim().split(/\s+/)[0];
  if (/^(?:302|307)$/.test(first)) return first;
  return first || null;
}

function extractRewrite(sample) {
  const actions = new Set();
  const matchKinds = new Set();

  for (const raw of sectionLines(sample, 'rewrite_local')) {
    const line = uncommentExample(raw);
    if (!line || line.startsWith('#')) continue;

    const urlAndHeader = line.indexOf(' url-and-header ');
    if (urlAndHeader >= 0) {
      matchKinds.add('url-and-header');
      const tail = line.slice(urlAndHeader + ' url-and-header '.length);
      const action = rewriteActionFromTail(tail);
      if (action) actions.add(action);
      continue;
    }

    const url = line.indexOf(' url ');
    if (url < 0) continue;
    matchKinds.add('url');
    const action = rewriteActionFromTail(line.slice(url + ' url '.length));
    if (action) actions.add(action);
  }

  // The official sample documents these even though it does not provide one
  // executable/commented example line for each of them.
  if (/\bjsonjq-request-body\b/.test(sample)) actions.add('jsonjq-request-body');
  for (const match of sample.matchAll(/\bscript-(?:request|response|echo|analyze)[a-z-]*\b/g)) {
    actions.add(match[0]);
  }

  return { actions, matchKinds };
}

function extractFullMitmKeys(sample) {
  const keys = new Set();
  for (const raw of sectionLines(sample, 'mitm')) {
    const line = uncommentExample(raw);
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z0-9_-]+)\s*=/);
    if (match) keys.add(match[1].toLowerCase());
  }
  return keys;
}

function extractSnippetMitmKeys(snippet) {
  const keys = new Set();
  for (const raw of String(snippet).replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line || /^(?:#|;|\/\/)/.test(line)) continue;
    const match = line.match(/^([A-Za-z0-9_-]+)\s*=/);
    if (match) keys.add(match[1].toLowerCase());
  }
  return keys;
}

function extractFilterSnippetTypes(snippet) {
  const types = new Set();
  for (const raw of String(snippet).replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line || /^(?:#|;|\/\/)/.test(line)) continue;
    const comma = line.indexOf(',');
    if (comma > 0) types.add(line.slice(0, comma).trim().toLowerCase());
  }
  return types;
}

function union(...sets) {
  const out = new Set();
  for (const set of sets) for (const value of set) out.add(value);
  return out;
}

function objectKeysSet(value) {
  return new Set(Object.keys(value || {}));
}

const [sample, rewriteSnippet, filterSnippet] = await Promise.all([
  fetchText(fixture.authority.officialSamplePath),
  fetchText(fixture.authority.officialRewriteSnippetPath),
  fetchText(fixture.authority.officialFilterSnippetPath),
]);

const officialFilterTypes = extractFilterTypes(sample);
const officialRewrite = extractRewrite(sample);
const officialFullMitmKeys = extractFullMitmKeys(sample);
const officialSnippetMitmKeys = extractSnippetMitmKeys(rewriteSnippet);
const officialFilterSnippetTypes = extractFilterSnippetTypes(filterSnippet);

assert.deepEqual(sorted(officialFilterTypes), fixture.filterTypes, 'official QX filter capability baseline drifted');
assert.deepEqual(sorted(officialRewrite.matchKinds), fixture.rewriteMatchKinds, 'official QX rewrite match-kind baseline drifted');
assert.deepEqual(sorted(officialRewrite.actions), fixture.urlRewriteActions, 'official QX rewrite action baseline drifted');
assert.deepEqual(sorted(officialFullMitmKeys), fixture.fullConfigMitmKeys, 'official QX full-profile MITM baseline drifted');
assert.deepEqual(sorted(officialSnippetMitmKeys), fixture.snippetMitmKeys, 'official QX rewrite-snippet MITM baseline drifted');

for (const type of officialFilterSnippetTypes) {
  assert.ok(officialFilterTypes.has(type), 'official filter.snippet uses unregistered filter type: ' + type);
}

const classifiedFilters = union(
  QX_WAYX_FILTER_TYPES,
  objectKeysSet(QX_WAYX_NOT_EMITTED.filterTypes),
);
assert.deepEqual(
  sorted(classifiedFilters),
  fixture.filterTypes,
  'every official QX filter type must be either executable in WayX or explicitly classified as not emitted',
);

const classifiedRewriteActions = union(
  QX_WAYX_NATIVE_REWRITE_ACTIONS,
  objectKeysSet(QX_WAYX_NOT_EMITTED.urlRewriteActions),
);
assert.deepEqual(
  sorted(classifiedRewriteActions),
  fixture.urlRewriteActions,
  'every official QX rewrite action must be either executable in WayX or explicitly classified as not emitted',
);

const classifiedMatchKinds = union(
  QX_WAYX_REWRITE_MATCH_KINDS,
  objectKeysSet(QX_WAYX_NOT_EMITTED.rewriteMatchKinds),
);
assert.deepEqual(
  sorted(classifiedMatchKinds),
  fixture.rewriteMatchKinds,
  'every official QX rewrite match kind must be either executable in WayX or explicitly classified as not emitted',
);

assert.deepEqual(
  sorted(QX_WAYX_SCRIPT_ACTIONS),
  fixture.urlRewriteActions.filter(x => x.startsWith('script-')).sort(),
  'WayX QX Script-action whitelist must match the official sample documentation',
);

assert.deepEqual(
  sorted(QX_WAYX_SNIPPET_MITM_KEYS),
  fixture.snippetMitmKeys,
  'WayX QX snippet MITM whitelist must match the official rewrite snippet',
);

assert.equal(
  /\bskip-server-cert-verify\b/.test(rewriteSnippet + '\n' + sample),
  false,
  'skip-server-cert-verify unexpectedly appeared in the current official QX samples; review the previous WayX restriction',
);

console.log(
  'Quantumult X official capability gate passed: ' +
  fixture.filterTypes.length + ' filters / ' +
  fixture.urlRewriteActions.length + ' rewrite actions / ' +
  fixture.snippetMitmKeys.length + ' snippet MITM key(s)'
);
