// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / runtime

import { normalizeRegexBodyForTarget, compileRegexForTarget, regexReplacementRuntimeSource, stringTemplateParts, conditionRuntimeSource } from "./core.mjs";
import { validateRewriteV2Ast, simpleUrlRewriteCondition, fixedStringValue, findRewriteComparisons, compileComplexCondition, qxRewriteMatcherPlan, parseJsonKeyPath, isTextRequestMockAction, fixedJqOperations } from "./rewrite.mjs";



// qx-mock.mjs
// WayX Quantumult X mock-script renderer
// Author: chance
// Category: Converter / Quantumult X / Mock



const QX_MOCK_MIME = Object.freeze({
  json: 'application/json',
  text: 'text/plain; charset=utf-8',
  css: 'text/css; charset=utf-8',
  html: 'text/html; charset=utf-8',
  javascript: 'application/javascript; charset=utf-8',
  plain: 'text/plain; charset=utf-8',
  png: 'image/png',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  tiff: 'image/tiff',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  'form-data': 'multipart/form-data',
});

const QX_MOCK_TEXT_TYPES = new Set(['json','text','css','html','javascript','plain']);

const REASON = Object.freeze({
  200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
  301: 'Moved Permanently', 302: 'Found', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 410: 'Gone',
  418: "I'm a teapot", 429: 'Too Many Requests', 451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout',
});

export function qxMimeTypeForLoonMock(type = '') {
  return QX_MOCK_MIME[String(type || '').toLowerCase()] || 'application/octet-stream';
}

export function qxMockTypeIsBinary(type = '') {
  return !QX_MOCK_TEXT_TYPES.has(String(type || '').toLowerCase());
}

function qxMockStatusLine(status = 200) {
  const code = Number.isInteger(status) ? status : 200;
  return `HTTP/1.1 ${code} ${REASON[code] || 'WayX Mock'}`;
}

function meta({ stamp = '', category = '', sourceLine = '', sourceFile = '' } = {}) {
  return [
    stamp ? `// Converted: ${stamp}` : null,
    '// Converted by: chance',
    category ? `// Category: ${category}` : '// Category: Rewrite / Mock',
    sourceLine ? `// Source Loon: ${sourceLine}` : null,
    sourceFile ? `// Source file: ${sourceFile}` : null,
  ].filter(Boolean);
}

function qxMockBase64Decoder() {
  return [
    'function __wayxBase64ToArrayBuffer(input) {',
    '  const table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";',
    '  const text = String(input || "").replace(/\\s+/g, "").replace(/=+$/, "");',
    '  let bits = 0, value = 0;',
    '  const out = [];',
    '  for (const ch of text) {',
    '    const index = table.indexOf(ch);',
    '    if (index < 0) throw new Error("invalid base64 character");',
    '    value = (value << 6) | index;',
    '    bits += 6;',
    '    if (bits >= 8) {',
    '      bits -= 8;',
    '      out.push((value >> bits) & 255);',
    '    }',
    '  }',
    '  return new Uint8Array(out).buffer;',
    '}',
  ];
}

function headerHelpers(headerOps = []) {
  return [regexReplacementRuntimeSource(),
    'function __wayxHeaderKey(headers, name) {',
    '  const wanted = String(name).toLowerCase();',
    '  return Object.keys(headers).find(key => key.toLowerCase() === wanted);',
    '}',

    'function __wayxHeaderSet(headers, name, value) {',
    '  const key = __wayxHeaderKey(headers, name);',
    '  headers[key || name] = value;',
    '}',
    'function __wayxHeaderDel(headers, name) {',
    '  const wanted = String(name).toLowerCase();',
    '  for (const key of Object.keys(headers)) if (key.toLowerCase() === wanted) delete headers[key];',
    '}',
    'function __wayxHeaderReplace(headers, name, source, replacement, flags="") {',
    '  const key = __wayxHeaderKey(headers, name);',
    '  if (key !== undefined) headers[key] = __wayxRegexReplace(headers[key],source,flags,replacement);',
    '}',
  ];
}

function renderHeaderOps(lines, headerOps = [], { knownHeaderNames = null } = {}) {
  if (!headerOps.length) return;
  const known = knownHeaderNames
    ? new Set([...knownHeaderNames].map(name => String(name).toLowerCase()))
    : null;
  lines.push(...headerHelpers(headerOps));
  for (const op of headerOps) {
    const lowerName = String(op.name || '').toLowerCase();
    if (op.type === 'add') {
      // A response mock is created from a known header set, so adding a new
      // absent header is lossless. Unknown/existing headers may require
      // duplicate preservation, which the official QX header object form does
      // not prove, so those cases remain fail-closed.
      if (!known || known.has(lowerName)) {
        throw new Error('QX header.add cannot be represented losslessly when the target header may already exist');
      }
      lines.push(`__wayxHeaderSet(headers, ${JSON.stringify(op.name)}, ${JSON.stringify(op.value)});`);
      known.add(lowerName);
    } else if (op.type === 'set') {
      lines.push(`__wayxHeaderSet(headers, ${JSON.stringify(op.name)}, ${JSON.stringify(op.value)});`);
      if (known) known.add(lowerName);
    } else if (op.type === 'del') {
      lines.push(`__wayxHeaderDel(headers, ${JSON.stringify(op.name)});`);
      if (known) known.delete(lowerName);
    } else if (op.type === 'replace') {
      lines.push(`__wayxHeaderReplace(headers, ${JSON.stringify(op.name)}, ${JSON.stringify(normalizeRegexBodyForTarget(op.pattern))}, ${JSON.stringify(op.replacement)}, ${JSON.stringify('')});`);
    } else throw new Error('unsupported QX mock header operation: ' + op.type);
  }
}

export function renderQxMockScript(plan, options = {}) {
  if (!plan || !plan.phase) throw new TypeError('Expected a QX mock plan');
  if (!['request','response'].includes(plan.phase)) throw new Error(`Unsupported mock phase: ${plan.phase}`);
  if (plan.phase === 'request' && (plan.binary || plan.base64)) {
    throw new Error('Quantumult X request mock binary/bodyBytes output is not enabled without an official request-body example');
  }
  const hasText = typeof options.bodyText === 'string';
  const hasBytes = typeof options.bodyBase64 === 'string' && options.bodyBase64.length > 0;
  if (plan.binary || plan.base64) {
    if (!hasBytes) throw new Error('mock bytes are required');
  } else if (!hasText) {
    throw new Error('mock text is required');
  }

  const mime = qxMimeTypeForLoonMock(plan.contentType);
  const lines = [
    ...meta(options),
    `const __wayxContentType = ${JSON.stringify(mime)};`,
  ];

  if (plan.binary || plan.base64) {
    lines.push(`const __wayxBodyBase64 = ${JSON.stringify(options.bodyBase64)};`);
    lines.push(...qxMockBase64Decoder());
  } else {
    lines.push(`const __wayxBody = ${JSON.stringify(options.bodyText)};`);
  }

  if (plan.phase === 'response') {
    lines.push('const headers = {"Content-Type": __wayxContentType};');
    renderHeaderOps(lines, options.headerOps, {knownHeaderNames:new Set(['Content-Type'])});
    lines.push(`const output = {status: ${JSON.stringify(qxMockStatusLine(plan.status ?? 200))}, headers};`);
    if (plan.binary || plan.base64) lines.push('output.bodyBytes = __wayxBase64ToArrayBuffer(__wayxBodyBase64);');
    else lines.push('output.body = __wayxBody;');
    lines.push('$done(output);');
  } else {
    lines.push('const headers = {...$request.headers, "Content-Type": __wayxContentType};');
    renderHeaderOps(lines, options.headerOps);
    lines.push('$done({headers, body: __wayxBody});');
  }

  lines.push('');
  return lines.join('\n');
}

export function renderQxMockFileScript(plan, options = {}) {
  if (!plan?.url) throw new TypeError('Expected a resolved QX mock_file plan');
  return renderQxMockScript(plan, {...options, sourceFile: options.sourceFile || plan.url});
}

// surge-mock.mjs
// WayX Surge request-body mock helper renderer
// Author: chance
// Category: Converter / Surge / Rewrite v2 / Mock

const SURGE_MOCK_MIME = Object.freeze({
  json:'application/json',
  text:'text/plain; charset=utf-8',
  css:'text/css; charset=utf-8',
  html:'text/html; charset=utf-8',
  javascript:'application/javascript; charset=utf-8',
  plain:'text/plain; charset=utf-8',
  png:'image/png',
  gif:'image/gif',
  jpeg:'image/jpeg',
  tiff:'image/tiff',
  svg:'image/svg+xml',
  mp4:'video/mp4',
  'form-data':'multipart/form-data',
});

const SURGE_MOCK_TEXT_TYPES = new Set(['json','text','css','html','javascript','plain']);

function fixedString(node, label) {
  if (!node || !['string','raw-string'].includes(node.type)) throw new Error(label + ' must be a fixed string');
  return String(node.value);
}

function boolValue(node, fallback = false) {
  if (!node) return fallback;
  if (node.type !== 'boolean') throw new Error('mock Base64 flag must be Boolean');
  return node.value;
}

function simpleUrlCondition(ast) {
  const c = ast?.condition;
  if (!c || c.type !== 'comparison' || c.operator !== '~=' ||
      c.left?.type !== 'variable' || c.left.name !== 'url' ||
      c.right?.type !== 'regex') {
    throw new Error('Surge request mock helper requires one URL-regex condition');
  }
  const compiled=compileRegexForTarget(c.right,{subject:'url',target:'surge'});
  if (!compiled.ok) throw new Error(compiled.reason);
  return compiled.pattern;
}

function surgeMockMetadata({stamp='',category='',sourceLine='',sourceFile=''}={}) {
  return [
    stamp ? '// Converted: ' + stamp : null,
    '// Converted by: chance',
    '// Category: ' + (category || 'Rewrite / Request Mock'),
    sourceLine ? '// Source Loon: ' + sourceLine : null,
    sourceFile ? '// Source file: ' + sourceFile : null,
  ].filter(Boolean);
}

function surgeMockBase64Decoder() {
  return [
    'function __wayxBase64ToUint8Array(input){',
    '  const table="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";',
    '  const text=String(input||"").replace(/\\s+/g,"").replace(/=+$/,"");',
    '  let bits=0,value=0;const out=[];',
    '  for(const ch of text){const index=table.indexOf(ch);if(index<0)throw new Error("invalid base64 character");value=(value<<6)|index;bits+=6;if(bits>=8){bits-=8;out.push((value>>bits)&255)}}',
    '  return new Uint8Array(out);',
    '}',
  ];
}

function validateBase64(text) {
  const compact=String(text||'').replace(/\s+/g,'');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 === 1) {
    throw new Error('mock Base64 body is invalid');
  }
  return compact;
}

export function renderSurgeRequestMockScript(ast, {materialized=null, stamp='', category='', sourceLine=''}={}) {
  validateRewriteV2Ast(ast);
  if (ast.phase !== 'request' || ast.actions.length !== 1) {
    throw new Error('Surge request mock helper requires one request-phase action');
  }
  const action=ast.actions[0];
  if (!['request.body.mock','request.body.mock_file'].includes(action.name)) {
    throw new Error('Surge request mock helper supports request.body.mock/mock_file only');
  }

  const pattern=simpleUrlCondition(ast);
  const contentType=fixedString(action.args[0],'mock content type').toLowerCase();
  const mime=SURGE_MOCK_MIME[contentType] || 'application/octet-stream';
  const fileMode=action.name.endsWith('_file');
  const base64=boolValue(action.args[fileMode ? 2 : 2], false);
  const binary=!SURGE_MOCK_TEXT_TYPES.has(contentType);

  let bodyText=null, bodyBase64=null, sourceFile='';
  if (fileMode) {
    if (!materialized || materialized.error) throw new Error(materialized?.error || 'mock_file was not materialized');
    sourceFile=materialized.sourceFile || '';
    if (typeof materialized.bodyText === 'string') bodyText=materialized.bodyText;
    if (typeof materialized.bodyBase64 === 'string') bodyBase64=materialized.bodyBase64;
  } else {
    const body=fixedString(action.args[1],'mock body');
    if (base64) bodyBase64=validateBase64(body);
    else bodyText=body;
  }

  if (binary || base64) {
    if (!bodyBase64) throw new Error('binary request mock requires materialized/base64 bytes');
    bodyBase64=validateBase64(bodyBase64);
  } else if (bodyText === null) {
    throw new Error('text request mock requires text body');
  }

  const lines=[
    ...surgeMockMetadata({stamp,category,sourceLine,sourceFile}),
    'const headers={...($request.headers||{}),"Content-Type":'+JSON.stringify(mime)+'};',
  ];
  if (binary || base64) {
    lines.push('const __wayxBodyBase64='+JSON.stringify(bodyBase64)+';');
    lines.push(...surgeMockBase64Decoder());
    lines.push('$done({headers,body:__wayxBase64ToUint8Array(__wayxBodyBase64)});');
  } else {
    lines.push('const __wayxBody='+JSON.stringify(bodyText)+';');
    lines.push('$done({headers,body:__wayxBody});');
  }
  lines.push('');

  return {
    pattern,
    script:lines.join('\n'),
    surgeType:'http-request',
    requiresBody:true,
    binaryBodyMode:Boolean(binary || base64),
  };
}

// qx-semantic-script.mjs
// WayX generated Quantumult X scripts for semantic Rewrite v2 actions
// Author: chance
// Category: Converter / Quantumult X / Rewrite v2

const STATUS_TEXT = Object.freeze({
  200:'OK', 201:'Created', 202:'Accepted', 204:'No Content',
  301:'Moved Permanently', 302:'Found', 307:'Temporary Redirect', 308:'Permanent Redirect',
  400:'Bad Request', 401:'Unauthorized', 403:'Forbidden', 404:'Not Found', 410:'Gone',
  418:"I'm a teapot", 429:'Too Many Requests', 451:'Unavailable For Legal Reasons',
  500:'Internal Server Error', 502:'Bad Gateway', 503:'Service Unavailable', 504:'Gateway Timeout',
});

function qxSemanticStatusLine(code) {
  return 'HTTP/1.1 ' + code + ' ' + (STATUS_TEXT[code] || 'WayX Response');
}

function qxSemanticMetadata({ stamp = '', category = '', sourceLine = '' } = {}) {
  return [
    stamp ? '// Converted: ' + stamp : null,
    '// Converted by: chance',
    category ? '// Category: ' + category : '// Category: Rewrite / Script',
    sourceLine ? '// Source Loon: ' + sourceLine : null,
  ].filter(Boolean);
}

function oneAction(ast, name, {conditionMode='simple-url'}={}) {
  validateRewriteV2Ast(ast);
  if (ast.actions.length !== 1 || ast.actions[0].name !== name) {
    throw new Error('Expected one ' + name + ' action');
  }
  if (conditionMode === 'external-exact') {
    return { condition:null, action:ast.actions[0] };
  }
  const condition = simpleUrlRewriteCondition(ast);
  if (!condition.ok) throw new Error(condition.reason);
  return { condition, action: ast.actions[0] };
}

function templateCaptureName(template) {
  return [...String(template).matchAll(/\$\{([A-Za-z_][A-Za-z0-9_-]*)\.(\d+)\}/g)];
}

function redirectUrlComparison(ast) {
  const found=findRewriteComparisons(ast?.condition,node=>
    node?.type==='comparison' &&
    node.operator==='~=' &&
    node.left?.type==='variable' &&
    node.left.name==='url' &&
    node.right?.type==='regex'
  );
  if(found.length!==1) {
    throw new Error('redirect helper requires exactly one URL regex condition');
  }

  function rejectOr(node) {
    if(!node) return;
    if(node.type==='group') return rejectOr(node.expression);
    if(node.type==='logical') {
      if(node.operator==='||') throw new Error('redirect helper does not lower OR conditions because the URL match is not guaranteed on every successful branch');
      rejectOr(node.left);
      rejectOr(node.right);
    }
  }
  rejectOr(ast.condition);
  return found[0];
}

function qxConditionHeaderHelper() {
  return [
    'function __wayxHeader(phase,name){',
    '  const h=phase==="request"?$request.headers:$response.headers;',
    '  const wanted=String(name).toLowerCase();',
    '  if(Array.isArray(h)){const x=h.find(x=>String(x.field).toLowerCase()===wanted);return x?.value;}',
    '  const k=Object.keys(h||{}).find(x=>x.toLowerCase()===wanted);',
    '  return k===undefined?undefined:h[k];',
    '}',
  ];
}

export function renderQxRedirectScript(ast, options = {}) {
  const fullCondition=options.conditionMode==='full';
  const pair = fullCondition
    ? (()=>{ validateRewriteV2Ast(ast); if(ast.actions.length!==1 || ast.actions[0].name!=='redirect') throw new Error('Expected one redirect action'); return {action:ast.actions[0]}; })()
    : oneAction(ast, 'redirect');
  const action = pair.action;
  const status = action.args[0];
  const template = fixedStringValue(action.args[1]);
  if (status?.type !== 'number' || ![302,307].includes(status.value)) throw new Error('redirect status must be 302 or 307');
  if (template === null) throw new Error('redirect target must be a fixed string');

  if (!fullCondition) {
    const condition = pair.condition;
    const refs = templateCaptureName(template);
    if (/\$\{/.test(template) && refs.length === 0) throw new Error('redirect target contains an unsupported variable template');
    for (const ref of refs) {
      if (!condition.capture || ref[1] !== condition.capture) throw new Error('redirect target references a non-URL capture');
    }

    const lines = [
      ...qxSemanticMetadata(options),
      'const __wayxRe = new RegExp(' + JSON.stringify(condition.pattern) + ', ' + JSON.stringify('') + ');',
      'const __wayxUrl = $request.url;',
      'const __wayxMatch = __wayxRe.exec(__wayxUrl);',
      'if (!__wayxMatch) {',
      '  $done({});',
      '} else {',
      '  const __wayxTemplate = ' + JSON.stringify(template) + ';',
    ];
    if (refs.length) {
      lines.push('  const __wayxReplacement = __wayxTemplate.replace(/\\$\\{' + condition.capture + '\\.(\\d+)\\}/g, (_, n) => __wayxMatch[Number(n)] ?? "");');
    } else {
      lines.push('  const __wayxReplacement = __wayxTemplate;');
    }
    lines.push(
      '  const __wayxLocation = __wayxUrl.slice(0, __wayxMatch.index) + __wayxReplacement + __wayxUrl.slice(__wayxMatch.index + __wayxMatch[0].length);',
      '  $done({status: ' + JSON.stringify(qxSemanticStatusLine(status.value)) + ', headers: {Location: __wayxLocation}, body: ""});',
      '}',
      '',
    );
    return {
      qxAction: 'script-echo-response',
      pattern: condition.pattern,
      script: lines.join('\n'),
      notes: condition.notes,
    };
  }

  const urlCondition=redirectUrlComparison(ast);
  const urlPattern=String(urlCondition.right.pattern);
  const refs=templateCaptureName(template);
  if (/\$\{/.test(template) && refs.length===0) throw new Error('redirect target contains an unsupported variable template');
  for (const ref of refs) {
    if (!urlCondition.capture || ref[1]!==urlCondition.capture) throw new Error('redirect target references a non-URL capture');
  }

  const conditionExpr=compileComplexCondition(ast.condition,'qx');
  const matchExpr=urlCondition.capture
    ? '__wayxCaptures['+JSON.stringify(urlCondition.capture)+']'
    : 'String(__wayxUrl ?? "").match(new RegExp('+JSON.stringify(urlPattern)+','+JSON.stringify('')+'))';

  const lines=[
    ...qxSemanticMetadata(options),
    'const __wayxCaptures=Object.create(null);',
    ...qxConditionHeaderHelper(),
    'const __wayxUrl=$request.url;',
    'if('+conditionExpr+'){',
    '  const __wayxMatch='+matchExpr+';',
    '  if(!__wayxMatch){$done({});}else{',
    '    const __wayxTemplate='+JSON.stringify(template)+';',
  ];
  if(refs.length){
    lines.push('    const __wayxReplacement=__wayxTemplate.replace(/\\$\\{'+urlCondition.capture+'\\.(\\d+)\\}/g,(_,n)=>__wayxMatch[Number(n)] ?? "");');
  }else{
    lines.push('    const __wayxReplacement=__wayxTemplate;');
  }
  lines.push(
    '    const __wayxLocation=__wayxUrl.slice(0,__wayxMatch.index)+__wayxReplacement+__wayxUrl.slice(__wayxMatch.index+__wayxMatch[0].length);',
    '    $done({status:'+JSON.stringify(qxSemanticStatusLine(status.value))+',headers:{Location:__wayxLocation},body:""});',
    '  }',
    '}else{$done({});}',
    '',
  );

  return {
    qxAction:'script-echo-response',
    pattern:urlPattern,
    script:lines.join('\n'),
    notes:[],
  };
}

export function renderQxRejectScript(ast, options = {}) {
  validateRewriteV2Ast(ast);
  if (ast.actions.length !== 1) throw new Error('reject script requires exactly one action');
  const externalExact=options.conditionMode === 'external-exact';
  const condition=externalExact ? {pattern:null,notes:[]} : simpleUrlRewriteCondition(ast);
  if (!condition.ok && !externalExact) throw new Error(condition.reason);
  const action = ast.actions[0];
  if (!['reject','reject_dict','reject_array'].includes(action.name)) {
    throw new Error('reject action has no generated QX response implementation');
  }
  const status = action.args[0];
  if (status?.type !== 'number' || !Number.isInteger(status.value) || status.value < 100 || status.value > 599) {
    throw new Error('reject status must be 100...599');
  }

  let body = '', contentType = null;
  if (action.name === 'reject') {
    if (action.args.length > 1) {
      body = fixedStringValue(action.args[1]);
      if (body === null) throw new Error('custom reject body must be a fixed string');
      contentType = 'text/plain; charset=utf-8';
    }
  } else if (action.name === 'reject_dict') {
    body = '{}';
    contentType = 'application/json';
  } else if (action.name === 'reject_array') {
    body = '[]';
    contentType = 'application/json';
  }

  const response = {
    status: qxSemanticStatusLine(status.value),
    ...(contentType ? { headers: { 'Content-Type': contentType } } : {}),
    body,
  };
  return {
    qxAction: 'script-echo-response',
    pattern: condition.pattern,
    script: [...qxSemanticMetadata(options), '$done(' + JSON.stringify(response) + ');', ''].join('\n'),
    notes: condition.notes,
  };
}

function expandAction(action) {
  if (!action.args.some(x => x.type === 'array')) return [action.args];
  const arrays = action.args.map(x => x.items);
  return arrays[0].map((_, index) => arrays.map(a => a[index]));
}

function qxSemanticFixed(node, what) {
  const value = fixedStringValue(node);
  if (value === null) throw new Error(what + ' must be a fixed string');
  if (/\$\{/.test(value)) throw new Error(what + ' contains a runtime variable and needs a broader script bridge');
  return value;
}

function booleanArg(node, fallback = false) {
  if (!node) return fallback;
  if (node.type !== 'boolean') throw new Error('mock Base64 flag must be Boolean');
  return node.value;
}

function numberArg(node, fallback = 200) {
  if (!node) return fallback;
  if (node.type !== 'number' || !Number.isInteger(node.value)) throw new Error('mock status must be an integer');
  return node.value;
}

export function headerOpsForMock(ast, mockAction) {
  const ops = [];
  for (const action of ast.actions) {
    if (action === mockAction) continue;
    if (!new RegExp('^' + ast.phase + '\\.header\\.(?:add|set|del|replace)$').test(action.name)) {
      throw new Error('QX mock pipeline supports only same-phase header add/set/del/replace actions');
    }
    for (const args of expandAction(action)) {
      if (action.name.endsWith('.add')) {
        ops.push({type:'add', name:qxSemanticFixed(args[0], 'header name'), value:qxSemanticFixed(args[1], 'header value')});
      } else if (action.name.endsWith('.set')) {
        ops.push({type:'set', name:qxSemanticFixed(args[0], 'header name'), value:qxSemanticFixed(args[1], 'header value')});
      } else if (action.name.endsWith('.del')) {
        ops.push({type:'del', name:qxSemanticFixed(args[0], 'header name')});
      } else {
        const regex = args[1];
        if (regex?.type !== 'regex') throw new Error('header.replace regex is not fixed');
        ops.push({
          type:'replace',
          name:qxSemanticFixed(args[0], 'header name'),
          pattern:normalizeRegexBodyForTarget(regex.pattern),
          flags:'',
          replacement:qxSemanticFixed(args[2], 'header replacement'),
        });
      }
    }
  }
  return ops;
}

export function renderQxInlineMockScript(ast, options = {}) {
  validateRewriteV2Ast(ast);
  const externalExact=options.conditionMode === 'external-exact';
  const condition=externalExact ? {pattern:null,notes:[]} : simpleUrlRewriteCondition(ast);
  if (!condition.ok && !externalExact) throw new Error(condition.reason);
  const mocks = ast.actions.filter(a => /^(?:request|response)\.body\.mock$/.test(a.name));
  if (mocks.length !== 1) throw new Error('QX inline mock conversion requires exactly one body.mock action');
  const mock = mocks[0];
  if (!mock.name.startsWith(ast.phase + '.')) throw new Error('mock action phase does not match Rewrite phase');

  const contentType = fixedStringValue(mock.args[0]);
  const body = fixedStringValue(mock.args[1]);
  if (contentType === null || body === null) throw new Error('inline mock content type/body must be fixed strings');

  const isResponse = ast.phase === 'response';
  const status = isResponse ? numberArg(mock.args[2], 200) : null;
  const base64 = isResponse ? booleanArg(mock.args[3], false) : booleanArg(mock.args[2], false);
  const binary = qxMockTypeIsBinary(contentType);
  if (binary && !base64) throw new Error('binary inline mock must use Base64=true for a lossless QX conversion');
  const compactBase64 = base64 ? body.replace(/\s+/g, '') : '';
  if (base64 && (!/^[A-Za-z0-9+/]*={0,2}$/.test(compactBase64) || compactBase64.length % 4 === 1)) {
    throw new Error('inline mock Base64 body is invalid');
  }

  const plan = {phase:ast.phase, contentType, status, base64, binary};
  const headerOps = headerOpsForMock(ast, mock);
  const scriptOptions = {
    ...options,
    headerOps,
    ...(base64 || binary ? {bodyBase64:compactBase64} : {bodyText:body}),
  };
  return {
    qxAction: isResponse ? 'script-echo-response' : 'script-request-body',
    pattern: condition.pattern,
    script: renderQxMockScript(plan, scriptOptions),
    notes: condition.notes,
  };
}

export function renderQxHeaderScript(ast,options={}) {
  validateRewriteV2Ast(ast);
  if (ast.actions.some(action=>action.name.endsWith('.add'))) throw new Error('QX header.add cannot be represented losslessly: the official header object form does not prove duplicate-header preservation');
  if (ast.actions.some(action=>!new RegExp('^'+ast.phase+'\\.header\\.(?:set|del|replace)$').test(action.name))) throw new Error('QX header script supports only same-phase set/del/replace actions');
  return renderRewriteScript(ast,{...options,target:'qx'});
}

// complex-rewrite-script.mjs
// WayX generated scripts for mixed same-phase Rewrite v2 pipelines
// Author: chance
// Category: Converter / Rewrite v2 / Complex Helper

function complexRewriteFixed(node, label) {
  if (!node || !['string','raw-string'].includes(node.type)) {
    throw new Error(label + ' must be a fixed string');
  }
  const parts=stringTemplateParts(node);
  if(parts.some(p=>p[0]==='v'))throw new Error(label+' must be a fixed string');
  return parts.map(p=>p[1]).join('');
}
function captureGroupCount(pattern) {
  let count=0, escaped=false, inClass=false;
  for(let i=0;i<pattern.length;i++){
    const ch=pattern[i];
    if(escaped){escaped=false;continue}
    if(ch==='\\\\'){escaped=true;continue}
    if(ch==='['){inClass=true;continue}
    if(ch===']'&&inClass){inClass=false;continue}
    if(ch!=='('||inClass)continue;
    if(pattern[i+1]!=='?'){count++;continue}
    if(pattern[i+2]==='<' && pattern[i+3]!=='=' && pattern[i+3]!=='!') count++;
  }
  return count;
}
function captureInfo(node, map = new Map()) {
  if (!node) return map;
  if (node.type === 'comparison' && node.capture) {
    if (map.has(node.capture)) throw new Error('duplicate capture alias: ' + node.capture);
    map.set(node.capture, node.right?.type==='variable' ? Infinity : captureGroupCount(node.right?.pattern || ''));
  }
  if (node.type === 'group') captureInfo(node.expression, map);
  if (node.type === 'logical') { captureInfo(node.left, map); captureInfo(node.right, map); }
  return map;
}
function guaranteedCaptures(node) {
  if (!node) return new Set();
  if (node.type === 'comparison') return new Set(node.capture ? [node.capture] : []);
  if (node.type === 'group') return guaranteedCaptures(node.expression);
  if (node.type === 'logical') {
    const left=guaranteedCaptures(node.left), right=guaranteedCaptures(node.right);
    if(node.operator==='&&') return new Set([...left,...right]);
    return new Set([...left].filter(x=>right.has(x)));
  }
  return new Set();
}
function capturedString(node, label, captures, guaranteed, argumentTable = null) {
  if(node?.type==='variable'){validateTemplateVariable(node.name,captures,guaranteed,argumentTable);return '__wayxStringValue('+JSON.stringify(node.name)+')';}
  if (!node || !['string','raw-string'].includes(node.type)) throw new Error(label + ' must be a string');
  const parts=stringTemplateParts(node);
  for(const [kind,name] of parts) if(kind==='v') validateTemplateVariable(name,captures,guaranteed,argumentTable);
  if(parts.every(p=>p[0]==='s'))return JSON.stringify(parts.map(p=>p[1]).join(''));
  return '__wayxTpl(' + JSON.stringify(parts) + ')';
}
function validateTemplateVariable(name,captures,guaranteed,argumentTable) {
  if(['url','request.method','response.status'].includes(name) || /^(request|response)\.header\[(?:'[^']+'|"[^"]+")\]$/.test(name))return;
  const match=name.match(/^([A-Za-z_][A-Za-z0-9_-]*)\.(\d+)$/);
  if(match){
    const max=captures.get(match[1]);
    if(max===undefined)throw new Error('unknown capture alias: '+match[1]);
    if(!guaranteed.has(match[1]))throw new Error('capture alias is not guaranteed on every successful condition path: '+match[1]);
    if(Number(match[2])>max)throw new Error('capture index exceeds regex capture-group count: '+name);
  }else if(!argumentTable?.byId?.has(name))throw new Error('unknown plugin argument interpolation: '+name);
}
function expand(action) {
  if (!action.args.some(arg => arg.type === 'array')) return [action.args];
  return action.args[0].items.map((_, i) => action.args.map(arg => arg.items[i]));
}
function coarsePattern(ast) {
  return qxRewriteMatcherPlan(ast).urlPattern;
}
function jsonValueSource(node, captures, guaranteed, argumentTable = null) {
  if (!node) throw new Error('JSON replacement value is missing');
  if (node.type === 'variable') {
    validateTemplateVariable(node.name,captures,guaranteed,argumentTable);
    return '__wayxValue('+JSON.stringify(node.name)+')';
  }
  if (!['string','raw-string','number','boolean','null'].includes(node.type)) throw new Error('JSON replacement value must be fixed or a declared plugin argument');
  if (node.type === 'string') return capturedString(node, 'JSON replacement value', captures, guaranteed, argumentTable);
  if (node.type === 'raw-string') return JSON.stringify(node.value);
  return JSON.stringify(node.value);
}
function mockFileDependency(ast,materialized,index) {
  if(materialized?.error)throw new Error(materialized.error);
  if(materialized?.byAction)return Object.prototype.hasOwnProperty.call(materialized.byAction,index)?materialized.byAction[index]:null;
  // An old single-file object must never be reused for another file action.
  return ast.actions.filter(a=>a.name==='request.body.mock_file').length===1?materialized:null;
}
function statements(ast, target, {argumentTable = null, mockMaterialized = null} = {}) {
  const out = [];
  const captures = captureInfo(ast.condition);
  const guaranteed = guaranteedCaptures(ast.condition);
  for(const alias of captures.keys())if(argumentTable?.byId?.has(alias))throw new Error('capture alias duplicates plugin argument: '+alias);
  let body = false, headers = false, json = false, headerAdd = false, dynamicPath = false;
  for (const [actionIndex,action] of ast.actions.entries()) {
    if (new RegExp('^' + ast.phase + '\\x2eheader\\x2e(?:add|set|del|replace)$').test(action.name)) {
      headers = true;
      for (const args of expand(action)) {
        const name = capturedString(args[0], 'header name', captures, guaranteed, argumentTable);
        const fixedName=args[0].type!=='variable' && stringTemplateParts(args[0]).every(p=>p[0]==='s');
        if (action.name.endsWith('.add')) {
          if (target !== 'surge') throw new Error('header.add duplicate semantics are not verified for ' + target);
          headerAdd = true;
          const value=capturedString(args[1], 'header value', captures, guaranteed, argumentTable);
          out.push(fixedName?'__wayxWith('+value+',v=>__wayxAdd('+name+',v));':'__wayxWithArgs(['+name+','+value+'],(n,v)=>__wayxAdd(n,v));');
        } else if (action.name.endsWith('.set')) {
          const value=capturedString(args[1], 'header value', captures, guaranteed, argumentTable);
          out.push(fixedName?'__wayxWith('+value+',v=>__wayxSet('+name+',v));':'__wayxWithArgs(['+name+','+value+'],(n,v)=>__wayxSet(n,v));');
        } else if (action.name.endsWith('.del')) {
          out.push(fixedName?'__wayxDel('+name+');':'__wayxWith('+name+',n=>__wayxDel(n));');
        } else {
          if (args[1]?.type !== 'regex') throw new Error('header.replace regex must be fixed');
          const value=capturedString(args[2], 'header replacement', captures, guaranteed, argumentTable);
          const tail=JSON.stringify(normalizeRegexBodyForTarget(args[1].pattern))+',v,'+JSON.stringify('')+'));';
          out.push(fixedName?'__wayxWith('+value+',v=>__wayxHeaderReplace('+name+','+tail:'__wayxWithArgs(['+name+','+value+'],(n,v)=>__wayxHeaderReplace(n,'+tail);
        }
      }
      continue;
    }
    if (action.name === 'request.body.mock' || action.name === 'request.body.mock_file') {
      if(ast.phase!=='request')throw new Error('request mock action requires request phase');
      if(!isTextRequestMockAction(action))throw new Error('text request mock requires a fixed text content type and Base64=false');
      const type=complexRewriteFixed(action.args[0], 'request mock content type').toLowerCase();


      let bodyValue;
      if (action.name.endsWith('.mock_file')) {
        complexRewriteFixed(action.args[1],'mock file path');
        const dependency=mockFileDependency(ast,mockMaterialized,actionIndex);
        if(!dependency)throw new Error('request mock_file action '+actionIndex+' was not materialized during conversion');
        if(dependency.error)throw new Error(dependency.error);
        if (typeof dependency.bodyText !== 'string') {
          throw new Error('request mock_file requires materialized text in the shared phase runtime');
        }
        bodyValue=JSON.stringify(dependency.bodyText);
      } else {
        bodyValue=capturedString(action.args[1], 'request mock body', captures, guaranteed, argumentTable);
      }

      body = true;
      headers = true;
      const mime=qxMimeTypeForLoonMock(type);
      out.push('__wayxWith('+bodyValue+',v=>{__wayxBody=v;__wayxSet("Content-Type",'+JSON.stringify(mime)+');});');
      continue;
    }
    if(action.name===ast.phase+'.json.jq') {
      const operations=fixedJqOperations(action);
      if(operations===null)throw new Error('inline JQ is outside the fixed mutation subset');
      body=true;
      const operationsData=JSON.stringify(JSON.stringify(operations));
      // The original top-level renderer stays byte-identical for existing
      // helpers. Nested paths require strict object traversal and creation.
      const apply=operations.some(op=>op.path) ?
        'if(j===null){if(op.kind==="delete")continue;j={}}let parent=j;const path=op.path||[op.key];for(let i=0;i<path.length;i++){if(parent===null){break}if(typeof parent!=="object"||Array.isArray(parent))throw new Error("JQ object path requires object");const key=path[i];if(i===path.length-1){if(op.kind==="delete")delete parent[key];else Object.defineProperty(parent,key,{value:op.value,enumerable:true,writable:true,configurable:true});break}let child=Object.prototype.hasOwnProperty.call(parent,key)?parent[key]:undefined;if(child==null){if(op.kind==="delete"){break}child={};Object.defineProperty(parent,key,{value:child,enumerable:true,writable:true,configurable:true})}parent=child}' :
        'if(j===null){if(op.kind==="delete")continue;j={}}if(typeof j!=="object"||Array.isArray(j))throw new Error("JQ object key requires object");if(op.kind==="delete")delete j[op.key];else Object.defineProperty(j,op.key,{value:op.value,enumerable:true,writable:true,configurable:true})';
      // jq collects every del path before deleting any of them. Validate the
      // complete group against its input so an overlapping parent cannot hide
      // a scalar/array path error; commit only after the whole action succeeds.
      const deleteMany=operations.some(op=>op.kind==='delete-many') ?
        'if(op.kind==="delete-many"){for(const path of op.paths){let parent=j;for(const key of path){if(parent==null)break;if(typeof parent!=="object"||Array.isArray(parent))throw new Error("JQ object path requires object");parent=Object.prototype.hasOwnProperty.call(parent,key)?parent[key]:undefined}}for(const path of op.paths){let parent=j;for(let i=0;i<path.length;i++){if(parent==null)break;const key=path[i];if(i===path.length-1){delete parent[key];break}parent=Object.prototype.hasOwnProperty.call(parent,key)?parent[key]:undefined}}continue;}' : '';
      out.push('try{let j=JSON.parse(String(__wayxBody ?? ""));for(const op of JSON.parse('+operationsData+')){if(op.kind==="identity")continue;'+deleteMany+apply+'}__wayxBody=JSON.stringify(j)}catch{}');
      continue;
    }
    if (action.name === ast.phase + '.json.add' || action.name === ast.phase + '.json.delete' || action.name === ast.phase + '.json.replace') {
      body = true; json = true;
      for(const args of expand(action)){
        const address=capturedString(args[0], 'JSON key path', captures, guaranteed, argumentTable);
        const fixed=args[0].type!=='variable' && stringTemplateParts(args[0]).every(p=>p[0]==='s');
        const path=fixed ? JSON.stringify(parseJsonKeyPath(complexRewriteFixed(args[0], 'JSON key path'))) : null;
        if(!fixed)dynamicPath=true;
        const helper=action.name.endsWith('.delete')?'__wayxJsonDelete':action.name.endsWith('.add')?'__wayxJsonAdd':'__wayxJsonReplace';
        const value=action.name.endsWith('.delete')?null:jsonValueSource(args[1], captures, guaranteed, argumentTable);
        const fixedValue=value!==null && args[1].type!=='variable' && (args[1].type!=='string' || stringTemplateParts(args[1]).every(p=>p[0]==='s'));
        if(fixed)out.push(value===null?'__wayxJsonAction(j=>'+helper+'(j,'+path+'));':fixedValue?'__wayxJsonAction(j=>'+helper+'(j,'+path+','+value+'));':'__wayxWith('+value+',v=>__wayxJsonAction(j=>'+helper+'(j,'+path+',v)));');
        else out.push(value===null?'__wayxWithPath('+address+',p=>__wayxJsonAction(j=>'+helper+'(j,p)));':'__wayxWithArgs(['+address+','+value+'],(a,v)=>__wayxWithPath(a,p=>__wayxJsonAction(j=>'+helper+'(j,p,v))));');
      }
      continue;
    }
    if (action.name === ast.phase + '.body.replace') {
      body = true;
      for(const args of expand(action)){
        if (args[0]?.type !== 'regex') throw new Error('body.replace regex must be fixed');
        const replacement=capturedString(args[1], 'body replacement', captures, guaranteed, argumentTable);
        if(args[1]?.type==='variable' || (args[1]?.type==='string' && String(args[1].value).includes('${'))) out.push('__wayxWith('+replacement+',v=>{__wayxBody=__wayxRegexReplace(String(__wayxBody ?? ""),'+JSON.stringify(normalizeRegexBodyForTarget(args[0].pattern))+','+JSON.stringify('')+',v);});');
        else out.push('__wayxBody=__wayxRegexReplace(String(__wayxBody ?? ""),'+JSON.stringify(normalizeRegexBodyForTarget(args[0].pattern))+','+JSON.stringify('')+','+replacement+');');
      }
      continue;
    }
    throw new Error('complex helper does not handle ' + action.name);
  }
  if (!body && !headers) throw new Error('complex helper requires at least one Header/Body/JSON action');
  return {out, body, headers, json, headerAdd, dynamicPath};

}
const JSON_MUTATION_RUNTIME=[
    'function __wayxJsonParent(root,path){let x=root;for(let i=0;i<path.length-1;i++){if(x==null||typeof x!=="object"||!Object.prototype.hasOwnProperty.call(x,path[i]))return null;x=x[path[i]];}return x;}',
    'function __wayxJsonGet(root,path){let x=root;for(const k of path){if(x==null||typeof x!=="object"||!Object.prototype.hasOwnProperty.call(x,k))return undefined;x=x[k]}return x;}',
    'function __wayxJsonSet(root,path,value){let x=root;for(let i=0;i<path.length-1;i++){const k=path[i],next=path[i+1];if(x==null||typeof x!=="object")return;const cur=Object.prototype.hasOwnProperty.call(x,k)?x[k]:undefined;if(cur==null)Object.defineProperty(x,k,{value:typeof next==="number"?[]:{},enumerable:true,writable:true,configurable:true});else if(typeof cur!=="object")return;x=x[k]}if(x!=null&&typeof x==="object")Object.defineProperty(x,path[path.length-1],{value,enumerable:true,writable:true,configurable:true});}',
    'function __wayxJsonAdd(root,path,value){const cur=__wayxJsonGet(root,path);if(cur===undefined||cur===null)__wayxJsonSet(root,path,value);}',
    'function __wayxJsonDelete(root,path){const p=__wayxJsonParent(root,path);if(p==null)return;const k=path[path.length-1];if(Array.isArray(p)&&typeof k==="number"){if(k>=0&&k<p.length)p.splice(k,1);}else delete p[k];}',
    'function __wayxJsonReplace(root,path,value){const cur=__wayxJsonGet(root,path);if(cur!==undefined)__wayxJsonSet(root,path,value);}',
];
function renderRewriteScript(ast, {target, stamp='', category='', sourceLine='', argumentTable=null, mockMaterialized=null,jqMaterialized=null,fullHeaderMode=false,sharedRuntime=false}={}) {
  validateRewriteV2Ast(ast);
  if (!['qx','surge'].includes(target)) throw new Error('invalid rewrite helper target');
  const plan = statements(ast, target, {argumentTable,mockMaterialized});
  if(target==='surge' && fullHeaderMode)plan.headerAdd=true;
  if(plan.headerAdd) {
    const readsHeader=node=>{
      if(!node || typeof node!=='object')return false;
      const names=node.type==='variable' ? [node.name] : node.type==='string' ? stringTemplateParts(node).filter(p=>p[0]==='v').map(p=>p[1]) : [];
      return names.some(name=>/^(request|response)\.header\[/.test(name)) || Object.values(node).some(value=>Array.isArray(value)?value.some(readsHeader):value && typeof value==='object' && readsHeader(value));
    };
    if(readsHeader(ast))throw new Error('duplicate-header source lookup/template semantics are not verified');
  }
  const condition = compileComplexCondition(ast.condition, target, {argumentTable,sharedRuntime:true});
  const source = ast.phase === 'request' ? '$request' : '$response';
  const doneValue = plan.headers && plan.body ? '{headers:__wayxHeaders,body:__wayxBody}' : plan.headers ? '{headers:__wayxHeaders}' : '{body:__wayxBody}';
  const lines = [
    stamp ? '// Converted: ' + stamp : null,
    '// Converted by: chance',
    '// Category: ' + (category || 'Rewrite / Loon Feature Collection'),
    sourceLine ? '// Source Loon: ' + sourceLine : null,
    ...(mockMaterialized?.byAction ? Object.values(mockMaterialized.byAction).filter(x=>x.sourceFile).map(x=>'// Source mock file: '+x.sourceFile) : mockMaterialized?.sourceFile ? ['// Source mock file: '+mockMaterialized.sourceFile] : []),
    target==='surge' && ast.actions.some(isTextRequestMockAction) ? '// Surge request-body API limits: chunked / Expect: 100-continue bodies are not overwritten; platform buffering limits still apply.' : null,
    ...(jqMaterialized?.byAction ? Object.values(jqMaterialized.byAction).filter(x=>x.sourceFile).map(x=>'// Source JQ file: '+x.sourceFile) : jqMaterialized?.sourceFile ? ['// Source JQ file: '+jqMaterialized.sourceFile] : []),
    sharedRuntime ? null : regexReplacementRuntimeSource(),
    sharedRuntime ? null : conditionRuntimeSource(),
    'const __wayxCaptures=Object.create(null);',
    argumentTable ? 'let __wayxArgs={};try{__wayxArgs=JSON.parse(String($argument||"{}"))}catch{}' : 'const __wayxArgs={};',
    plan.headerAdd ? 'let __wayxHeaders=Array.isArray(' + source + '.headers)?' + source + '.headers.map(x=>({field:x.field,value:x.value})):Object.entries(' + source + '.headers||{}).map(([field,value])=>({field,value}));' : 'let __wayxHeaders={...(' + source + '.headers||{})};',
    'let __wayxBody=' + source + '.body;',
    'function __wayxValue(name){return resolveSemanticVariable(name,{url:$request.url,request:'+ (ast.phase==='request' ? '{...$request,headers:__wayxHeaders}' : '$request')+',response:'+(ast.phase==='response' ? '{...$response,headers:__wayxHeaders}' : '{}')+',arguments:__wayxArgs},new Map(Object.entries(__wayxCaptures)))}',
    'function __wayxTpl(parts){let out="";for(const [kind,name] of parts){const v=kind==="s"?name:__wayxValue(name);if(v===undefined)return undefined;out+=String(v)}return out}',
    'function __wayxWith(v,fn){if(v!==undefined)fn(v)}',
    'function __wayxStringValue(name){const v=__wayxValue(name);return typeof v==="string"?v:undefined}',
    'function __wayxWithArgs(values,fn){if(values.every(v=>v!==undefined))fn(...values)}',
    plan.dynamicPath && !sharedRuntime ? parseJsonKeyPath.toString() : null,
    plan.dynamicPath ? 'function __wayxWithPath(v,fn){if(v===undefined)return;let p;try{p=parseJsonKeyPath(v)}catch{return}fn(p)}' : null,
    plan.json ? 'function __wayxJsonAction(fn){try{const j=JSON.parse(String(__wayxBody ?? ""));if(j===null||typeof j!=="object")return;fn(j);__wayxBody=JSON.stringify(j)}catch{}}' : null,
    ...(plan.json && !sharedRuntime ? JSON_MUTATION_RUNTIME : []),
    plan.headerAdd ? 'function __wayxAdd(n,v){__wayxHeaders.push({field:n,value:v});}' : null,
    plan.headerAdd ? 'function __wayxSet(n,v){const w=String(n).toLowerCase();let seen=false;__wayxHeaders=__wayxHeaders.filter(x=>{if(String(x.field).toLowerCase()!==w)return true;if(!seen){x.value=v;seen=true;return true;}return false;});if(!seen)__wayxHeaders.push({field:n,value:v});}' : 'function __wayxSet(n,v){const k=__wayxKey(n);__wayxDel(n);Object.defineProperty(__wayxHeaders,k||n,{value:v,enumerable:true,writable:true,configurable:true});}',
    plan.headerAdd ? 'function __wayxDel(n){const w=String(n).toLowerCase();__wayxHeaders=__wayxHeaders.filter(x=>String(x.field).toLowerCase()!==w);}' : 'function __wayxDel(n){const w=String(n).toLowerCase();for(const k of Object.keys(__wayxHeaders))if(k.toLowerCase()===w)delete __wayxHeaders[k];}',
    plan.headerAdd ? 'function __wayxHeaderReplace(n,p,r,f=""){const w=String(n).toLowerCase();for(const x of __wayxHeaders)if(String(x.field).toLowerCase()===w)x.value=__wayxRegexReplace(x.value,p,f,r);}' : 'function __wayxHeaderReplace(n,p,r,f=""){const w=String(n).toLowerCase();for(const k of Object.keys(__wayxHeaders))if(k.toLowerCase()===w)__wayxHeaders[k]=__wayxRegexReplace(__wayxHeaders[k],p,f,r);}',
    plan.headerAdd ? null : 'function __wayxKey(n){return Object.keys(__wayxHeaders).find(k=>k.toLowerCase()===String(n).toLowerCase());}',
    'if(' + condition + '){',
    ...plan.out.map(line => '  ' + line),
    '  $done(' + doneValue + ');',
    '}else{$done({});}',
    '',
  ].filter(line => line !== null);
  const qxAction = plan.body
    ? (ast.phase==='request'?'script-request-body':'script-response-body')
    : (ast.phase==='request'?'script-request-header':'script-response-header');
  return {pattern:coarsePattern(ast),script:lines.join('\n'),qxAction,surgeType:ast.phase==='request'?'http-request':'http-response',requiresBody:plan.body,fullHeaderMode:plan.headerAdd,dynamicPath:plan.dynamicPath,json:plan.json};
}

export function renderMixedRewriteScript(ast, options = {}) {
  validateRewriteV2Ast(ast);
  if (!Array.isArray(ast?.actions) || ast.actions.length < 2) {
    throw new Error('complex helper requires a multi-action Rewrite pipeline');
  }
  return renderRewriteScript(ast, options);
}

export function renderSingleRewriteMutationScript(ast, options = {}) {
  validateRewriteV2Ast(ast);
  if (!Array.isArray(ast?.actions) || ast.actions.length !== 1) {
    throw new Error('single Rewrite mutation helper requires exactly one action');
  }
  const name=ast.actions[0]?.name || '';
  const supported=new RegExp('^'+ast.phase+'\\.(?:header\\.(?:'+(options.target==='surge'?'add|':'')+'set|del|replace)|body\\.replace|json\\.(?:add|delete|replace))$');
  if (!supported.test(name) && fixedJqOperations(ast.actions[0])===null && !isTextRequestMockAction(ast.actions[0])) {
    throw new Error('single Rewrite mutation helper does not support '+name);
  }
  return renderRewriteScript(ast, options);
}

export function renderSingleJsonMutationScript(ast, options = {}) {
  validateRewriteV2Ast(ast);
  if (!Array.isArray(ast?.actions) || ast.actions.length !== 1 || !/^(?:request|response)\.json\.(?:add|delete|replace)$/.test(ast.actions[0]?.name || '')) {
    throw new Error('single JSON mutation helper requires exactly one json.add/delete/replace action');
  }
  return renderRewriteScript(ast, options);
}

export const renderSingleJsonAddScript = renderSingleJsonMutationScript;

// All matching source entries run in source order. One target HTTP Script owns
// the phase, re-evaluates each original condition, and commits each mutation
// before the next entry reads headers/body. Only our synchronous helpers enter
// this dispatcher; external author scripts are never copied or evaluated.
export function renderRewritePhaseDispatcher(declarations,options={}) {
  if (!declarations.length) throw new Error('empty Rewrite dispatcher');
  const phase=declarations[0].phase;
  if (declarations.some(ast=>ast.phase!==phase)) throw new Error('mixed dispatcher phases');
  const fullHeaderMode=options.target==='surge' && declarations.some(ast=>ast.actions.some(a=>a.name.endsWith('.header.add')));
  const plans=declarations.map(ast=>renderRewriteScript(ast,{...options,mockMaterialized:options.mockFiles?.get(ast.raw) || options.mockMaterialized,jqMaterialized:options.jqFiles?.get(ast.raw) || options.jqMaterialized,fullHeaderMode,sharedRuntime:true}));
  const requiresBody=plans.some(p=>p.requiresBody);
  const lines=[...qxSemanticMetadata(options),
    regexReplacementRuntimeSource(),
    conditionRuntimeSource(),
    ...(plans.some(p=>p.json) ? JSON_MUTATION_RUNTIME : []),
    plans.some(p=>p.dynamicPath) ? parseJsonKeyPath.toString() : '',
    'function __wayxCloneHeaders(h){return Array.isArray(h)?h.map(x=>({...x})):{...(h||{})}}',
    'const __wayxRequest={...$request,headers:__wayxCloneHeaders($request.headers)};',
    'const __wayxResponse=typeof $response==="undefined"?{}:{...$response,headers:__wayxCloneHeaders($response.headers)};',
    'const __wayxResult={};',
    'function __wayxCommit(value){Object.assign(__wayxResult,value);Object.assign('+(phase==='request'?'__wayxRequest':'__wayxResponse')+',value);}',
  ];
  for (const plan of plans) lines.push('(($request,$response,$done)=>{\n'+plan.script+'\n})(__wayxRequest,__wayxResponse,__wayxCommit);');
  if(options.target==='qx' && requiresBody)lines.push('if(Object.keys(__wayxResult).length && !("body" in __wayxResult))__wayxResult.body='+(phase==='request'?'__wayxRequest':'__wayxResponse')+'.body;');
  lines.push('$done(__wayxResult);','');
  return {pattern:'^',script:lines.join('\n'),requiresBody,fullHeaderMode,
    qxAction:'script-'+phase+'-'+(requiresBody?'body':'header'),surgeType:'http-'+phase};
}
