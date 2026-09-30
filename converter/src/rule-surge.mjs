// Surge Rule planner
// Author: chance
// Category: Converter / Rule / Surge

import { normalizeRegexBodyForTarget } from './target-regex.mjs';
import { SURGE_WAYX_RULE_TYPES } from './surge-official-capabilities.mjs';
import { parseLoonRuleAst, renderRuleAst, ruleTypesInAst } from './rule-ast.mjs';

export const SURGE_RULE_TYPES=SURGE_WAYX_RULE_TYPES;

export const SURGE_MODULE_POLICIES=new Set([
  'DIRECT','REJECT','REJECT-TINYGIF',
]);

const LOON_RULE_POLICIES_COMMENT_ONLY=new Set([
  'REJECT-DROP','REJECT-NO-DROP',
  'CELLULAR','CELLULAR-ONLY','HYBRID','NO-HYBRID',
]);

export function surgePolicyIndex(_parts) {
  return 2;
}

function surgeCsvRegexField(value) {
  const text=String(value ?? '');
  return text.includes(',') ? '"' + text.replace(/"/g,'\\"') + '"' : text;
}

function surgeValueRenderer(node) {
  if (node.type!=='URL-REGEX') return node.valueRaw;
  return surgeCsvRegexField(normalizeRegexBodyForTarget(node.value));
}

export function validateSurgeRuleAst(ast) {
  const types=ruleTypesInAst(ast);
  for (const type of types) {
    if (!SURGE_RULE_TYPES.has(type)) {
      return {ok:false,types,reason:`unsupported-rule-type:${type}`};
    }
  }
  return {ok:true,types,reason:null};
}

export function renderSurgeRuleAst(ast,{policyOverride=null}={}) {
  return renderRuleAst(ast,{valueRenderer:surgeValueRenderer,policyOverride});
}

export function surgeRuleTypesInTree(line,{subrule=false}={}) {
  const parsed=parseLoonRuleAst(line,{nested:subrule});
  if (!parsed.ok) {
    const type=parsed.ast?.type ? [parsed.ast.type] : [];
    return {ok:false,types:type,reason:parsed.reason};
  }
  return validateSurgeRuleAst(parsed.ast);
}

export function planSurgeModuleRuleAst(ast,{proxyPolicyPlaceholder=null}={}) {
  const source=ast.source;
  const type=ast.type;

  if (type==='URL-REGEX') {
    const pattern=normalizeRegexBodyForTarget(ast.value);
    const mapLocal={
      'REJECT-200':`${pattern} data-type=text data="" status-code=200`,
      'REJECT-DICT':`${pattern} data-type=text data="{}" status-code=200 header="Content-Type:application/json"`,
      'REJECT-ARRAY':`${pattern} data-type=text data="[]" status-code=200 header="Content-Type:application/json"`,
    }[ast.policy];
    if (mapLocal) {
      return {
        kind:'map',
        section:'map',
        line:mapLocal,
        lines:[mapLocal],
        reason:'url-regex-local-response',
      };
    }
  }

  const typeTree=validateSurgeRuleAst(ast);
  if (!typeTree.ok) {
    return {
      kind:'comment',
      lines:[
        `# [WayX] ISSUE REQUIRED [unknown-rule-type]: Surge Rule type/combination is not registered (${typeTree.reason})`,
        `# Source declaration: ${source}`,
      ],
      reason:'unsupported-rule-type',
    };
  }

  if (!ast.nested && !ast.policyRaw) {
    return {
      kind:'comment',
      lines:[
        '# [WayX] ISSUE REQUIRED [invalid-source-rule]: invalid/unsupported source Rule cannot be parsed into a verified target mapping',
        `# Source declaration: ${source}`,
      ],
      reason:'invalid-rule',
    };
  }

  let policy=ast.policy;
  if (policy==='REJECT-IMG') policy='REJECT-TINYGIF';

  if (policy==='PROXY') {
    if (!proxyPolicyPlaceholder) {
      return {
        kind:'comment',
        section:'rule',
        line:'',
        lines:[
          '# [WayX] Source Loon plugin policy PROXY requires a Surge module policy parameter binding.',
          `# Source declaration: ${source}`,
        ],
        reason:'source-proxy-policy-needs-argument',
      };
    }
    const lineOut=renderSurgeRuleAst(ast,{policyOverride:proxyPolicyPlaceholder});
    return {
      kind:'rule',
      section:'rule',
      line:lineOut,
      lines:[lineOut],
      reason:'proxy-policy-argument',
    };
  }

  if (LOON_RULE_POLICIES_COMMENT_ONLY.has(policy)) {
    return {
      kind:'comment',
      section:'rule',
      line:'',
      lines:[
        `# [WayX] Surge Module unsupported Rule policy ${policy} commented out; Module Rule supports only DIRECT/REJECT/REJECT-TINYGIF.`,
        `# Source declaration: ${source}`,
      ],
      reason:'unsupported-surge-module-policy',
    };
  }

  if (!SURGE_MODULE_POLICIES.has(policy)) {
    return {
      kind:'comment',
      lines:[
        '# [WayX] REVIEW REQUIRED: Surge Module requires an external policy binding that cannot be defined losslessly by this ad-block module',
        `# Source declaration: ${source}`,
      ],
      reason:'external-policy',
    };
  }

  const lineOut=renderSurgeRuleAst(ast,{policyOverride:policy});
  return {
    kind:'rule',
    section:'rule',
    line:lineOut,
    lines:[lineOut],
    reason:'module-native-rule',
  };
}
