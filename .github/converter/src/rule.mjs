// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / rule

import { normalizeRegexBodyForTarget, QX_WAYX_FILTER_TYPES, SURGE_WAYX_RULE_TYPES, SURGE_WAYX_RULE_BUILTIN_POLICIES } from "./core.mjs";



// rule-ast.mjs
// Loon Rule source parser / target-neutral AST
// Author: chance
// Category: Converter / Rule / AST

export const LOON_LOGICAL_RULE_TYPES = new Set(['AND','OR','NOT']);

export function splitTopLevelCsv(input) {
  const out=[];
  let buf='', quote=null, esc=false, depth=0;
  for (const ch of String(input ?? '')) {
    if (quote) {
      buf+=ch;
      if (esc) { esc=false; continue; }
      if (ch==='\\') { esc=true; continue; }
      if (ch===quote) quote=null;
      continue;
    }
    if (ch==='"' || ch==="'") { quote=ch; buf+=ch; continue; }
    if (ch==='(') { depth++; buf+=ch; continue; }
    if (ch===')') { depth=Math.max(0,depth-1); buf+=ch; continue; }
    if (ch===',' && depth===0) { out.push(buf.trim()); buf=''; continue; }
    buf+=ch;
  }
  out.push(buf.trim());
  return out;
}

export function unquoteRuleField(value) {
  const s=String(value ?? '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1,-1);
  }
  return s;
}

export function splitLogicalSubrules(value) {
  const source=String(value ?? '').trim();
  if (!source.startsWith('(') || !source.endsWith(')')) return null;
  const inner=source.slice(1,-1).trim();
  const out=[];
  let i=0;

  while (i<inner.length) {
    while (i<inner.length && /[\s,]/.test(inner[i])) i++;
    if (i>=inner.length) break;
    if (inner[i]!=='(') return null;

    const start=++i;
    let depth=1, quote=null, esc=false;
    for (;i<inner.length;i++) {
      const ch=inner[i];
      if (quote) {
        if (esc) { esc=false; continue; }
        if (ch==='\\') { esc=true; continue; }
        if (ch===quote) quote=null;
        continue;
      }
      if (ch==='"' || ch==="'") { quote=ch; continue; }
      if (ch==='(') { depth++; continue; }
      if (ch===')') {
        depth--;
        if (depth===0) {
          out.push(inner.slice(start,i).trim());
          i++;
          break;
        }
      }
    }
    if (depth!==0) return null;
    while (i<inner.length && /\s/.test(inner[i])) i++;
    if (i<inner.length && inner[i]===',') i++;
  }

  return out;
}

function parseParameter(raw) {
  const text=String(raw ?? '').trim();
  const eq=text.indexOf('=');
  if (eq<0) return {raw:text,name:text.toLowerCase(),value:null};
  return {
    raw:text,
    name:text.slice(0,eq).trim().toLowerCase(),
    value:text.slice(eq+1).trim(),
  };
}

export function parseLoonRuleAst(line,{nested=false}={}) {
  const source=String(line ?? '').trim();
  const inline=source.match(/^(.*?)\s+\/\/\s*(.+)$/);
  const syntaxSource=inline ? inline[1].trim() : source;
  const inlineComment=inline ? inline[2].trim() : '';
  const parts=splitTopLevelCsv(syntaxSource);
  const type=String(parts[0] ?? '').trim().toUpperCase();
  if (!type) return {ok:false,ast:null,reason:'missing-rule-type'};

  const logical=LOON_LOGICAL_RULE_TYPES.has(type);
  const policyRaw=nested ? null : String(parts[2] ?? '').trim();
  const parameterFields=nested ? parts.slice(2) : parts.slice(3);
  const params=parameterFields.filter(Boolean).map(parseParameter);

  const ast={
    source,
    syntaxSource,
    inlineComment,
    nested:Boolean(nested),
    kind:logical ? 'logical' : 'rule',
    type,
    fieldCount:parts.length,
    valueRaw:String(parts[1] ?? '').trim(),
    value:logical ? String(parts[1] ?? '').trim() : unquoteRuleField(parts[1] ?? ''),
    policyRaw,
    policy:policyRaw ? policyRaw.toUpperCase() : '',
    params,
    children:[],
  };

  if (!logical) return {ok:true,ast,reason:null};

  const childSources=splitLogicalSubrules(ast.valueRaw);
  if (!childSources?.length) {
    return {ok:false,ast,reason:`invalid-${type}-subrules`};
  }
  if (type==='NOT' && childSources.length!==1) {
    return {ok:false,ast,reason:'invalid-NOT-cardinality'};
  }
  for (const childSource of childSources) {
    const child=parseLoonRuleAst(childSource,{nested:true});
    if (!child.ok) return {ok:false,ast,reason:child.reason};
    ast.children.push(child.ast);
  }

  return {ok:true,ast,reason:null};
}

export function walkRuleAst(ast,visitor,{depth=0}={}) {
  visitor(ast,{depth});
  for (const child of ast?.children ?? []) walkRuleAst(child,visitor,{depth:depth+1});
}

export function ruleTypesInAst(ast) {
  const types=[];
  walkRuleAst(ast,node=>types.push(node.type));
  return types;
}

export function renderRuleAst(ast,{valueRenderer=null,policyOverride=null}={}) {
  const renderValue=node=>{
    if (typeof valueRenderer==='function') return valueRenderer(node);
    return node.valueRaw;
  };

  let value;
  if (ast.kind==='logical') {
    value='(' + ast.children.map(child=>'(' + renderRuleAst(child,{valueRenderer}) + ')').join(',') + ')';
  } else {
    value=renderValue(ast);
  }

  const parts=[ast.type,value];
  if (!ast.nested) {
    parts.push(policyOverride ?? ast.policyRaw ?? '');
  }
  for (const param of ast.params) parts.push(param.raw);
  return parts.join(',');
}

// rule.mjs
// WayX Loon Rule parser facade and target planners
// Author: chance
// Category: Converter / Rule








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

const SURGE_REJECT_MATCH_POLICIES=new Set(['REJECT','REJECT-DROP','REJECT-NO-DROP','REJECT-TINYGIF']);
const SURGE_EXTENDED_TYPES=new Set(['DOMAIN','DOMAIN-SUFFIX','DOMAIN-KEYWORD','DOMAIN-WILDCARD','DOMAIN-SET','RULE-SET','URL-REGEX']);
const SURGE_PRE_TYPES=new Set(['DOMAIN','DOMAIN-SUFFIX','DOMAIN-KEYWORD','DOMAIN-WILDCARD','DOMAIN-SET','IP-CIDR','IP-CIDR6','GEOIP','IP-ASN','SRC-IP','DEST-PORT','SRC-PORT','SUBNET','CELLULAR-CARRIER','CELLULAR-RADIO']);
function surgePreEligible(node,{allowRuleSet=false}={}) {
  if(node.kind==='logical')return node.children.every(child=>surgePreEligible(child,{allowRuleSet}));
  return SURGE_PRE_TYPES.has(node.type)||(allowRuleSet&&node.type==='RULE-SET');
}
function enhancedSurgeRuleAst(ast,policy,{preMatching=true}={}) {
  const result=structuredClone(ast);
  if(!SURGE_REJECT_MATCH_POLICIES.has(policy))return result;
  const add=(node,name)=>{if(!node.params.some(p=>p.name===name))node.params.push({name,raw:name,value:null});};
  walkRuleAst(result,node=>{if(SURGE_EXTENDED_TYPES.has(node.type))add(node,'extended-matching');});
  if(preMatching&&!result.nested&&surgePreEligible(result))add(result,'pre-matching');
  return result;
}

export function validateSurgeRuleAst(ast) {
  const types=[];

  function visit(node,logicalDepth=0) {
    types.push(node.type);
    if(node.params.some(p=>p.name==='extended-matching')&&!SURGE_EXTENDED_TYPES.has(node.type))return 'extended-matching-unsupported-type:'+node.type;
    if(node.params.some(p=>p.name==='pre-matching')&&(node.nested||!SURGE_REJECT_MATCH_POLICIES.has(node.policy)||!surgePreEligible(node,{allowRuleSet:true})))return 'invalid-pre-matching-scope-policy-or-type';
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

export function planSurgeModuleRuleAst(ast,{proxyPolicyPlaceholder=null,matchingEnhancements=false,preMatching=true}={}) {
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

  const lineOut=renderSurgeRuleAst(matchingEnhancements?enhancedSurgeRuleAst(ast,policy,{preMatching}):ast,{policyOverride:policy});
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

export function surgeModuleRule(line,{proxyPolicyPlaceholder=null,matchingEnhancements=false,preMatching=true}={}) {
  const source=String(line ?? '').trim();
  const parsed=parseLoonRuleAst(source);
  if (!parsed.ok) return invalidRulePlan(source,parsed.reason,'surge');
  return planSurgeModuleRuleAst(parsed.ast,{proxyPolicyPlaceholder,matchingEnhancements,preMatching});
}

export function surgeRule(line) {
  return surgeModuleRule(line).lines.join('\n');
}
