// Target-neutral Rewrite Semantic IR
// Author: chance
// Category: Converter / Rewrite / Semantic IR

const LEGACY_REJECT_VARIANTS = new Map([
  ['reject', {variant:'generic', status:null}],
  ['reject-200', {variant:'empty', status:200}],
  ['reject-img', {variant:'image', status:200}],
  ['reject-dict', {variant:'dict', status:200}],
  ['reject-array', {variant:'array', status:200}],
  ['reject-video', {variant:'video', status:null}],
]);

function shellTokens(input) {
  const out=[];
  let cur='', quote=null, esc=false;
  for (const ch of String(input ?? '')) {
    if (esc) { cur+=ch; esc=false; continue; }
    if (ch==='\\' && quote) { cur+=ch; esc=true; continue; }
    if (quote) {
      cur+=ch;
      if (ch===quote) quote=null;
      continue;
    }
    if (ch==='"' || ch==="'") { quote=ch; cur+=ch; continue; }
    if (/\s/.test(ch)) {
      if (cur) { out.push(cur); cur=''; }
    } else cur+=ch;
  }
  if (cur) out.push(cur);
  return out;
}

export function unquoteRewriteToken(token) {
  const t=String(token ?? '');
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1,-1);
  }
  return t;
}

function parseLegacyMockData(rest) {
  const source=String(rest || '');
  const quotedStart=source.search(/\bdata="/i);
  if (quotedStart>=0) {
    const valueStart=source.indexOf('"',quotedStart)+1;
    const tail=source.slice(valueStart);
    const marker=tail.match(/"\s+(?=(?:status-code|data-path|mock-data-is-base64)=)/i);
    const end=marker ? valueStart+marker.index : source.lastIndexOf('"');
    if (end>=valueStart) {
      return source.slice(valueStart,end)
        .replace(/\\"/g,'"')
        .replace(/\\n/g,'\n')
        .replace(/\\\\/g,'\\');
    }
  }
  const unquoted=source.match(/\bdata=([^\s]+)/i);
  return unquoted ? unquoted[1] : null;
}

function parseLegacyMock(rest) {
  const type=(String(rest).match(/\bdata-type=([^\s]+)/i)||[])[1] || 'text';
  const status=Number((String(rest).match(/\bstatus-code=(\d+)/i)||[])[1] || 200);
  const dataPath=(String(rest).match(/\bdata-path=([^\s]+)/i)||[])[1] || null;
  const base64=/\bmock-data-is-base64=(?:true|1)\b/i.test(String(rest));
  return {type,status,data:parseLegacyMockData(rest),dataPath,base64};
}

export function classifyLegacyRewriteAction(action) {
  const raw=String(action ?? '').trim();
  const lower=raw.toLowerCase();

  if (LEGACY_REJECT_VARIANTS.has(lower)) {
    const semantic=LEGACY_REJECT_VARIANTS.get(lower);
    return {
      kind:'reject',
      action:lower,
      variant:semantic.variant,
      status:semantic.status,
      raw,
    };
  }

  let match=raw.match(/^(302|307)\s+(.+)$/i);
  if (match) {
    return {
      kind:'redirect',
      status:Number(match[1]),
      target:match[2],
      redirectMode:'absolute-location',
      raw,
    };
  }

  match=raw.match(/^header\s+(.+)$/i);
  if (match) {
    return {
      kind:'url-rewrite',
      target:match[1],
      rewriteMode:'transparent-replace',
      raw,
    };
  }

  match=raw.match(/^(response-)?header-(add|del|replace|replace-regex)\s+(.+)$/i);
  if (match) {
    return {
      kind:'header',
      phase:match[1] ? 'response':'request',
      operation:match[2].toLowerCase(),
      rest:match[3],
      raw,
    };
  }

  match=raw.match(/^(request|response)-body-replace-regex\s+(.+)$/i);
  if (match) {
    return {
      kind:'body-regex',
      phase:match[1].toLowerCase(),
      operation:'replace',
      rest:match[2],
      raw,
    };
  }

  match=raw.match(/^(request|response)-body-json-(add|replace|del|jq)\s+(.+)$/i);
  if (match) {
    return {
      kind:'json',
      phase:match[1].toLowerCase(),
      operation:match[2].toLowerCase(),
      rest:match[3],
      raw,
    };
  }

  match=raw.match(/^mock-(request|response)-body\s+(.+)$/i);
  if (match) {
    return {
      kind:'mock',
      phase:match[1].toLowerCase(),
      operation:'inline',
      mock:parseLegacyMock(match[2]),
      raw,
    };
  }

  return {kind:'unknown',raw};
}

export function isDiscardedLegacyJqPathIr(ir) {
  if (!ir || ir.type!=='rewrite-semantic-ir' || ir.sourceSyntax!=='legacy') return false;
  if (!Array.isArray(ir.operations) || ir.operations.length!==1) return false;
  const op=ir.operations[0];
  return op?.kind==='json' &&
    op?.operation==='jq' &&
    /^jq-path\s*=/i.test(String(op?.rest || '').trim());
}

export function legacyRewriteToSemanticIr(pattern,action) {
  const sourcePattern=String(pattern ?? '').trim();
  const sourceAction=String(action ?? '').trim();
  const op=classifyLegacyRewriteAction(sourceAction);
  return {
    type:'rewrite-semantic-ir',
    sourceSyntax:'legacy',
    source:sourcePattern + (sourceAction ? ' ' + sourceAction : ''),
    phase:op.phase || (op.kind==='redirect' || op.kind==='url-rewrite' || op.kind==='reject' ? 'request' : null),
    condition:{
      type:'url-regex',
      pattern:sourcePattern,
    },
    operations:[op],
    pipeline:false,
    sourcePayload:{
      pattern:sourcePattern,
      action:sourceAction,
    },
  };
}

function scalarValue(node) {
  if (!node) return null;
  if (Object.hasOwn(node,'value')) return node.value;
  return null;
}

function classifyRewriteV2Action(action,phase) {
  const name=String(action?.name || '');
  if (/^reject(?:_|$)/.test(name)) {
    const variant = name==='reject_dict' ? 'dict'
      : name==='reject_array' ? 'array'
      : name==='reject_img' ? 'image'
      : name==='reject_200' ? 'empty'
      : 'generic';
    return {
      kind:'reject',
      actionName:name,
      variant,
      status:scalarValue(action?.args?.[0]),
      sourceAction:action,
    };
  }

  if (name==='redirect') {
    return {
      kind:'redirect',
      actionName:name,
      status:scalarValue(action?.args?.[0]),
      targetNode:action?.args?.[1] || null,
      redirectMode:'matched-range-template',
      sourceAction:action,
    };
  }

  const header=name.match(/^(request|response)\.header\.(add|set|del|replace)$/);
  if (header) {
    return {
      kind:'header',
      phase:header[1],
      operation:header[2],
      actionName:name,
      sourceAction:action,
    };
  }

  const body=name.match(/^(request|response)\.body\.replace$/);
  if (body) {
    return {
      kind:'body-regex',
      phase:body[1],
      operation:'replace',
      actionName:name,
      sourceAction:action,
    };
  }

  const json=name.match(/^(request|response)\.json\.(add|delete|replace|jq|jq_file)$/);
  if (json) {
    return {
      kind:'json',
      phase:json[1],
      operation:json[2],
      actionName:name,
      sourceAction:action,
    };
  }

  const mock=name.match(/^(request|response)\.body\.(mock|mock_file)$/);
  if (mock) {
    return {
      kind:'mock',
      phase:mock[1],
      operation:mock[2]==='mock_file' ? 'file':'inline',
      actionName:name,
      sourceAction:action,
    };
  }

  return {
    kind:'action',
    phase,
    actionName:name,
    sourceAction:action,
  };
}

export function rewriteV2AstToSemanticIr(ast,{source=''}={}) {
  if (!ast || ast.type!=='rewrite') throw new TypeError('Expected Rewrite v2 AST');
  const operations=(ast.actions || []).map(action=>classifyRewriteV2Action(action,ast.phase));
  return {
    type:'rewrite-semantic-ir',
    sourceSyntax:'v2',
    source:String(source || ''),
    phase:ast.phase || null,
    condition:ast.condition || null,
    operations,
    pipeline:operations.length>1,
    sourcePayload:{ast},
    ast,
  };
}

export function singleRewriteOperation(ir) {
  return ir?.operations?.length===1 ? ir.operations[0] : null;
}

export function rewriteOperationKinds(ir) {
  return (ir?.operations || []).map(op=>op.kind);
}

export function isRewriteOperation(ir,kind,{phase=null,operation=null,actionName=null}={}) {
  const op=singleRewriteOperation(ir);
  if (!op || op.kind!==kind) return false;
  if (phase!==null && op.phase!==phase) return false;
  if (operation!==null && op.operation!==operation) return false;
  if (actionName!==null && op.actionName!==actionName) return false;
  return true;
}

export function legacyRewriteTokens(text) {
  return shellTokens(text).map(unquoteRewriteToken);
}
