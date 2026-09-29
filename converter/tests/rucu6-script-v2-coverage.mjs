import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  isScriptV2,
  parseScriptV2,
  scriptV2ArgumentRefs,
  scriptV2DynamicOptionRefs,
  scriptOptionBoolean,
  qxScriptV2Plan,
  surgeScriptV2Plan,
} from '../src/index.mjs';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'Resource', 'Loon', 'RuCu6');

function sectionLines(text, wanted) {
  const out = [];
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.trim().match(/^\[([^\]]+)\]$/);
    if (m) { current = m[1]; continue; }
    if (current === wanted) out.push(raw);
  }
  return out;
}

const files = (await fs.readdir(DIR)).filter(name => name.endsWith('.lpx')).sort();
const report = {
  files: files.length,
  scriptLines: 0,
  scriptV2: 0,
  parseErrors: [],
  phases: {},
  requiresBody: 0,
  binaryBodyMode: 0,
  argumentObject: 0,
  argumentString: 0,
  dynamicOptions: {},
  scriptUrls: {},
  qxPlans: {},
  surgePlans: {},
};

for (const name of files) {
  const text = await fs.readFile(path.join(DIR, name), 'utf8');
  for (const raw of sectionLines(text, 'Script')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';') || line.startsWith('//')) continue;
    report.scriptLines++;
    if (!isScriptV2(line)) {
      report.parseErrors.push({file:name, line, error:'non-Script-v2 active line'});
      continue;
    }
    try {
      const ast = parseScriptV2(line);
      report.scriptV2++;
      report.phases[ast.phase] = (report.phases[ast.phase] || 0) + 1;
      if (scriptOptionBoolean(ast, 'requires_body')) report.requiresBody++;
      if (scriptOptionBoolean(ast, 'binary_body_mode')) report.binaryBodyMode++;
      if (ast.script.argument?.type === 'plugin-object') report.argumentObject++;
      if (['string','raw-string'].includes(ast.script.argument?.type)) report.argumentString++;
      for (const ref of scriptV2DynamicOptionRefs(ast)) {
        const key = ref.option + ':' + ref.id;
        report.dynamicOptions[key] = (report.dynamicOptions[key] || 0) + 1;
      }
      const qxPlan = qxScriptV2Plan(ast, {scriptUrl:ast.script.path, sourceText:''});
      const surgePlan = surgeScriptV2Plan(ast, {scriptUrl:ast.script.path, name:'coverage'});
      const qxKey = qxPlan.ok ? (qxPlan.disabled ? 'disabled' : qxPlan.strategy) : 'REVIEW: ' + qxPlan.reason;
      const surgeKey = surgePlan.ok ? (surgePlan.disabled ? 'disabled' : surgePlan.strategy) : 'REVIEW: ' + surgePlan.reason;
      report.qxPlans[qxKey] = (report.qxPlans[qxKey] || 0) + 1;
      report.surgePlans[surgeKey] = (report.surgePlans[surgeKey] || 0) + 1;

      const refs = scriptV2ArgumentRefs(ast);
      const key = ast.script.path;
      if (!report.scriptUrls[key]) report.scriptUrls[key] = {count:0, argumentRefs:[], binary:false};
      report.scriptUrls[key].count++;
      report.scriptUrls[key].argumentRefs = [...new Set([...report.scriptUrls[key].argumentRefs, ...refs])].sort();
      report.scriptUrls[key].binary ||= scriptOptionBoolean(ast, 'binary_body_mode');
    } catch (error) {
      report.parseErrors.push({file:name, line, error:String(error?.message || error).split('\n')[0]});
    }
  }
}

assert.ok(report.scriptLines > 0, 'Expected RuCu6 Script entries');
assert.equal(report.parseErrors.length, 0, 'Current RuCu6 [Script] entries must parse as Script v2');
assert.equal(report.scriptLines, report.scriptV2);
console.log('RuCu6 Script v2 coverage:');
console.log(JSON.stringify(report, null, 2));
