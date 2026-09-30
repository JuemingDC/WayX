import assert from 'node:assert/strict';
import {
  extractUnknownIssueMarkers,
  groupUnknownIssueMarkers,
  unknownIssueFingerprint,
  conversionUnknownIssueTitle,
} from '../src/unknown-issue.mjs';

const qx = [
  '# [WayX] ISSUE REQUIRED [unknown-complex-rewrite]: unregistered source-authored complex Rewrite signature: response.header.set | response.json.jq',
  '# Source declaration: response if ${url} ~= /api/ then response.header.set("X","1") | response.json.jq("del(.ads)")',
].join('\n');
const surge = [
  '# [WayX] ISSUE REQUIRED [unknown-complex-rewrite]: same source, second target',
  '# Source declaration: response if ${url} ~= /api/ then response.header.set("X","1") | response.json.jq("del(.ads)")',
  '# [WayX] ISSUE REQUIRED [unknown-source-section]: unsupported Loon source section [DNS]',
  '# Source declaration: foo=bar',
].join('\n');

const markers = [
  ...extractUnknownIssueMarkers(qx, 'Adblock/Quantumult X/Test.snippet'),
  ...extractUnknownIssueMarkers(surge, 'Adblock/Surge/Test.sgmodule'),
];
assert.equal(markers.length, 3);
const groups = groupUnknownIssueMarkers(markers);
assert.equal(groups.length, 2, 'same unknown source must be deduplicated across targets');

const complex = groups.find(group => group.code === 'unknown-complex-rewrite');
assert.ok(complex);
assert.equal(complex.locations.length, 2);
assert.equal(unknownIssueFingerprint(complex), complex.fingerprint);
assert.match(conversionUnknownIssueTitle(complex), /^\[conversion-unknown:[0-9a-f]{16}\] unknown-complex-rewrite$/);

console.log('Unknown issue marker parser passed');
