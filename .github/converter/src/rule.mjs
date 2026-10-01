// WayX Loon Rule conversion facade
// Author: chance
// Category: Converter / Rule

import { parseLoonRuleAst } from './rule-ast.mjs';
import { planQxRuleAst } from './rule-qx.mjs';
import { planSurgeModuleRuleAst } from './rule-surge.mjs';

export * from './rule-ast.mjs';
export * from './rule-qx.mjs';
export * from './rule-surge.mjs';

function invalidRulePlan(source,reason,target) {
  if (target==='qx') {
    return {
      kind:'comment',
      line:`# [WayX] ISSUE REQUIRED [invalid-source-rule]: invalid/unsupported source Rule cannot be parsed (${reason})\n# Source declaration: ${source}`,
      reason:'invalid-rule',
    };
  }
  return {
    kind:'comment',
    section:'rule',
    line:'',
    lines:[
      `# [WayX] ISSUE REQUIRED [invalid-source-rule]: invalid/unsupported source Rule cannot be parsed (${reason})`,
      `# Source declaration: ${source}`,
    ],
    reason:'invalid-rule',
  };
}

export function qxRule(line) {
  const source=String(line ?? '').trim();
  const parsed=parseLoonRuleAst(source);
  if (!parsed.ok) return invalidRulePlan(source,parsed.reason,'qx');
  return planQxRuleAst(parsed.ast);
}

export function surgeModuleRule(line,{proxyPolicyPlaceholder=null}={}) {
  const source=String(line ?? '').trim();
  const parsed=parseLoonRuleAst(source);
  if (!parsed.ok) return invalidRulePlan(source,parsed.reason,'surge');
  return planSurgeModuleRuleAst(parsed.ast,{proxyPolicyPlaceholder});
}

export function surgeRule(line) {
  return surgeModuleRule(line).lines.join('\n');
}
