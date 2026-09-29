import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  isRewriteV2,
  parseRewriteV2,
  validateRewriteV2Ast,
  simpleUrlRewriteCondition,
  qxDirectRewritePlan,
  qxMockPlanFromAction,
  renderQxInlineMockScript,
  renderQxRedirectScript,
  renderQxRejectScript,
  renderQxHeaderScript,
  surgeInlineMockPlan,
  surgeHeaderRewritePlan,
  surgeDirectRewritePlan,
  surgeRedirectRewritePlan,
  surgeRejectRewritePlan,
} from '../src/index.mjs';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'Resource', 'Loon', 'RuCu6');

async function pluginFiles() {
  const names = await fs.readdir(DIR);
  return names.filter(name => name.endsWith('.lpx')).sort();
}

function classifyQx(ast) {
  try {
    if (ast.actions.length === 1 && /^(?:request|response)\.body\.mock_file$/.test(ast.actions[0].name)) {
      const condition = simpleUrlRewriteCondition(ast);
      if (!condition.ok) return {ok:false, reason:condition.reason};
      const plan = qxMockPlanFromAction(ast.actions[0], {pluginSourceUrl:'https://example.invalid/plugin.lpx'});
      if (plan.phase === 'request' && (plan.binary || plan.base64)) {
        return {ok:false, reason:'binary request mock_file requires an official QX request bytes contract'};
      }
      return {ok:true, strategy:'generated-mock-file'};
    }
    if (ast.actions.some(action => /^(?:request|response)\.body\.mock$/.test(action.name))) {
      renderQxInlineMockScript(ast);
      return {ok:true, strategy:'generated-inline-mock'};
    }

    const direct = qxDirectRewritePlan(ast);
    if (direct.ok) return {ok:true, strategy:'direct'};

    if (ast.actions.length === 1 && ast.actions[0].name === 'redirect') {
      renderQxRedirectScript(ast);
      return {ok:true, strategy:'generated-redirect'};
    }
    if (ast.actions.length === 1 && /^(?:reject|reject_dict|reject_array)$/.test(ast.actions[0].name)) {
      renderQxRejectScript(ast);
      return {ok:true, strategy:'generated-reject'};
    }
    const allowedHeaders = new Set([
      ast.phase + '.header.set',
      ast.phase + '.header.del',
      ast.phase + '.header.replace',
    ]);
    if (ast.actions.length && ast.actions.every(action => allowedHeaders.has(action.name))) {
      renderQxHeaderScript(ast);
      return {ok:true, strategy:'generated-header'};
    }
    return {ok:false, reason:direct.reason || 'no QX semantic mapper'};
  } catch (error) {
    return {ok:false, reason:String(error?.message || error).split('\n')[0]};
  }
}

function classifySurge(ast) {
  try {
    for (const [name, mapper] of [
      ['map-local-mock', surgeInlineMockPlan],
      ['header-rewrite', surgeHeaderRewritePlan],
      ['direct', surgeDirectRewritePlan],
      ['url-rewrite', surgeRedirectRewritePlan],
      ['map-local-reject', surgeRejectRewritePlan],
    ]) {
      const result = mapper(ast);
      if (result.ok) return {ok:true, strategy:name};
    }
    return {ok:false, reason:'no Surge semantic mapper'};
  } catch (error) {
    return {ok:false, reason:String(error?.message || error).split('\n')[0]};
  }
}

function tally(result, bucket) {
  const key = result.ok ? result.strategy : 'REVIEW: ' + result.reason;
  bucket[key] = (bucket[key] || 0) + 1;
}

const report = {
  files: 0,
  rewriteV2: 0,
  parseErrors: [],
  qx: {},
  surge: {},
  reviewExamples: {qx:[], surge:[]},
};

for (const name of await pluginFiles()) {
  report.files++;
  const text = await fs.readFile(path.join(DIR, name), 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!isRewriteV2(line)) continue;
    report.rewriteV2++;
    let ast;
    try {
      ast = parseRewriteV2(line);
      validateRewriteV2Ast(ast);
    } catch (error) {
      report.parseErrors.push({file:name, line, error:String(error?.message || error).split('\n')[0]});
      continue;
    }

    const qx = classifyQx(ast);
    const surge = classifySurge(ast);
    tally(qx, report.qx);
    tally(surge, report.surge);
    if (!qx.ok && report.reviewExamples.qx.length < 20) report.reviewExamples.qx.push({file:name, reason:qx.reason, line});
    if (!surge.ok && report.reviewExamples.surge.length < 20) report.reviewExamples.surge.push({file:name, reason:surge.reason, line});
  }
}

assert.equal(report.parseErrors.length, 0, 'Current RuCu6 Rewrite v2 sources must all parse/validate');
assert.ok(report.rewriteV2 > 0, 'Expected current RuCu6 Rewrite v2 entries');
console.log('RuCu6 Rewrite v2 semantic coverage:');
console.log(JSON.stringify(report, null, 2));
