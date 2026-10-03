// WayX Loon Rule parser and target planners
// Author: chance
// Category: Converter / Rule

import { normalizeRegexBodyForTarget } from './target-regex.mjs';
import { QX_WAYX_FILTER_TYPES } from './qx-official-capabilities.mjs';
import {
  SURGE_WAYX_RULE_TYPES,
  SURGE_WAYX_RULE_BUILTIN_POLICIES,
} from './surge-official-capabilities.mjs';
import { parseLoonRuleAst, renderRuleAst } from './rule-ast.mjs';

export * from './rule-ast.mjs';

const QX_RULE_TYPES=new Map([
  ['DOMAIN','host'], ['DOMAIN-SUFFIX','host-suffix'], ['DOMAIN-KEYWORD','host-keyword'],
  ['DOMAIN-WILDCARD','host-wildcard'], ['IP-CIDR','ip-cidr'], ['IP-CIDR6','ip6-cidr'],
  ['GEOIP','geoip'], ['IP-ASN','ip-asn'], ['USER-AGENT','user-agent'],
]);

const QX_URL_REJECT_ACTIONS=new Map([
  ['REJECT','reject-200'],
  ['REJECT-200','reject-200'],
  ['REJECT-IMG','reject-img'],
  ['REJECT-DICT','reject-dict'],
  ['REJECT-ARRAY','reject-array'],
]);

export function planQxRuleAst(ast) {
  const source=ast.source;

  if (ast.kind==='logical') {
    return {
      kind:'comment',
      line:`# [WayX] Quantumult X unsupported Rule type commented out; Rule conversion does not use Script fallback\n# Source declaration: ${source}`,
      reason:'unsupported-qx-rule-comment',
    };
  }

  const type=ast.type;
  const value=type==='URL-REGEX' ? normalizeRegexBodyForTarget(ast.value) : ast.value;
  const policyRaw=ast.policy;

  if (type==='URL-REGEX') {
    const action=QX_URL_REJECT_ACTIONS.get(policyRaw);
    if (action) return {kind:'rewrite',line:`${value} url ${action}`,reason:'wayx-url-regex-reject'};
    if (policyRaw==='REJECT-DROP') return {kind:'rewrite',line:`${value} url reject`,reason:'wayx-url-regex-reject-drop'};
  }

  const qxType=QX_RULE_TYPES.get(type);
  if (!qxType || !QX_WAYX_FILTER_TYPES.has(qxType)) {
    return {
      kind:'comment',
      line:`# [WayX] Quantumult X unsupported Rule type ${type} commented out; Rule conversion does not use Script fallback\n# Source declaration: ${source}`,
      reason:'unsupported-qx-rule-comment',
    };
  }

  let policy;
  if (policyRaw==='DIRECT') policy='direct';
  else if (policyRaw==='REJECT' || policyRaw==='REJECT-DROP' || policyRaw==='REJECT-NO-DROP') policy='reject';
  else if (policyRaw==='PROXY') policy='PROXY';
  else if (/^REJECT/.test(policyRaw)) {
    return {
      kind:'comment',
      line:`# [WayX] REVIEW REQUIRED: Quantumult X cannot preserve source reject policy ${policyRaw} in filter syntax or a lossless script equivalent\n# Source declaration: ${source}`,
      reason:'unsupported-reject-policy',
    };
  } else {
    return {
      kind:'comment',
      line:`# [WayX] REVIEW REQUIRED: Quantumult X Rule policy ${policyRaw} is not verified and has no lossless script equivalent\n# Source declaration: ${source}`,
      reason:'unsupported-policy',
    };
  }

  return {kind:'filter',line:`${qxType}, ${value}, ${policy}`,reason:'native-filter'};
}

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
