import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { surgeModuleRule, surgeRuleTypesInTree } from '../src/index.mjs';
import { classifyLegacyRewriteAction } from '../src/rewrite-ir.mjs';

const ROOT = process.cwd();
const manifest = JSON.parse(await fs.readFile(path.join(ROOT, '.github/sources/loon.json'), 'utf8'));

function splitPatternAction(line) {
  const idx=String(line).search(/\s/);
  if (idx<0) return [String(line).trim(),''];
  return [String(line).slice(0,idx).trim(),String(line).slice(idx).trim().replace(/^\-\s+/,'')];
}

function isKnownSourceNonRule(line) {
  const [pattern,action]=splitPatternAction(line);
  if (pattern && action && classifyLegacyRewriteAction(action).kind!=='unknown') return true;
  return !String(line).includes(',') && /^(?:\*\.)?(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/i.test(String(line));
}

function activeRuleLines(text) {
  const out = [];
  let section = null;
  for (const raw of String(text).replace(/\r\n?/g, '\n').split('\n')) {
    const m = raw.trim().match(/^\[([^\]]+)\]$/);
    if (m) {
      section = m[1];
      continue;
    }
    if (section !== 'Rule') continue;
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';') || line.startsWith('//')) continue;
    out.push(line);
  }
  return out;
}

const stats = {
  files: 0,
  rules: 0,
  native: 0,
  boundProxy: 0,
  review: 0,
  reasons: new Map(),
  types: new Map(),
  reviewLines: [],
};

for (const entry of manifest) {
  const file = path.join(ROOT, 'Resource/Loon', entry.file);
  let text;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch {
    continue;
  }

  stats.files++;
  for (const line of activeRuleLines(text)) {
    if (isKnownSourceNonRule(line)) continue;
    stats.rules++;
    const typeTree = surgeRuleTypesInTree(line);
    assert.equal(typeTree.ok, true, `unsupported Surge rule type tree: ${line} (${typeTree.reason})`);
    for (const type of typeTree.types) {
      stats.types.set(type, (stats.types.get(type) || 0) + 1);
    }

    const mapped = surgeModuleRule(line, {proxyPolicyPlaceholder:'{{{wayx_proxy_policy}}}'});
    if (mapped.kind === 'rule' && mapped.reason === 'proxy-policy-argument') {
      stats.boundProxy++;
      assert.match(mapped.line, /\{\{\{wayx_proxy_policy\}\}\}/);
      continue;
    }
    if (mapped.kind === 'rule') {
      stats.native++;
      assert.equal(mapped.lines.at(-1), mapped.line);
      continue;
    }
    stats.review++;
    stats.reasons.set(mapped.reason, (stats.reasons.get(mapped.reason) || 0) + 1);
    stats.reviewLines.push({file: entry.file, reason: mapped.reason, line});
  }
}

assert.ok(stats.files > 0, 'no Loon source files were scanned');
assert.ok(stats.rules > 0, 'no Loon [Rule] entries were scanned');

// Loon plugin PROXY is deterministically bound through a declared Module
// argument placeholder. Surge built-in Rule policies are emitted directly.
// Unknown external policy names remain Review.
const unexpectedReview = stats.reviewLines.filter(x => x.reason !== 'external-policy');
assert.equal(
  unexpectedReview.length,
  0,
  'unexpected Surge module rule reviews:\n' +
    unexpectedReview.map(x => `${x.file}: [${x.reason}] ${x.line}`).join('\n'),
);
for (const item of stats.reviewLines.filter(x => x.reason === 'external-policy')) {
  const mapped=surgeModuleRule(item.line, {proxyPolicyPlaceholder:'{{{wayx_proxy_policy}}}'});
  assert.match(mapped.lines.join('\n'), /REVIEW REQUIRED: Surge Module requires an external policy binding/i);
}

const types = [...stats.types.entries()].sort((a, b) => a[0].localeCompare(b[0]));
console.log(
  `Surge Rule coverage: files=${stats.files}, rules=${stats.rules}, native=${stats.native}, boundProxy=${stats.boundProxy}, review=${stats.review}`
);
console.log('Rule types: ' + types.map(([type, count]) => `${type}=${count}`).join(', '));
