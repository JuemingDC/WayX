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
  const parts=splitTopLevelCsv(source);
  const type=String(parts[0] ?? '').trim().toUpperCase();
  if (!type) return {ok:false,ast:null,reason:'missing-rule-type'};

  const logical=LOON_LOGICAL_RULE_TYPES.has(type);
  const policyRaw=nested ? null : String(parts[2] ?? '').trim();
  const parameterFields=nested ? parts.slice(2) : parts.slice(3);
  const params=parameterFields.filter(Boolean).map(parseParameter);

  const ast={
    source,
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
    return {ok:false,ast,reason:'NOT-requires-one-subrule'};
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
