// Surge Rule planner
// Author: chance
// Category: Converter / Rule / Surge

import { normalizeRegexBodyForTarget } from './target-regex.mjs';
import { SURGE_WAYX_RULE_TYPES, SURGE_WAYX_RULE_BUILTIN_POLICIES } from './surge-official-capabilities.mjs';
import { parseLoonRuleAst, renderRuleAst } from './rule-ast.mjs';

export const SURGE_RULE_TYPES=SURGE_WAYX_RULE_TYPES;

// Module [Rule] uses the same reviewed built-in policy registry as Surge Rule.
// Compatibility export retained for the module validator.
export const SURGE_RULE_BUILTIN_POLICIES=SURGE_WAYX_RULE_BUILTIN_POLICIES;
export const SURGE_MODULE_POLICIES=SURGE_WAYX_RULE_BUILTIN_POLICIES;

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
  const types=[];

  function visit(node,logicalDepth=0) {
    types.push(node.type);
    if (!SURGE_RULE_TYPES.has(node.type)) {
      return `unsupported-rule-type:${node.type}`;
    }
    let nextLogicalDepth=logicalDepth;
    if (node.kind==='logical') {
      nextLogicalDepth=logicalDepth+1;
      if (nextLogicalDepth>10) return 'logical-nesting-depth-exceeds-10';
      if (node.type==='NOT' && node.children.length!==1) return 'NOT-requires-one-subrule';
      if ((node.type==='AND' || node.type==='OR') && node.children.length<1) {
        return `${node.type}-requires-subrules`;
      }
      for (const child of node.children) {
        const reason=visit(child,nextLogicalDepth);
        if (reason) return reason;
      }
    }
    return null;
  }

  const reason=visit(ast);
  return {ok:!reason,types,reason};
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
