// WayX Quantumult X mock-script renderer
// Author: chance
// Category: Converter / Quantumult X / Mock

import { normalizeRegexBodyForTarget } from './target-regex.mjs';

const MIME = Object.freeze({
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

const TEXT_TYPES = new Set(['json','text','css','html','javascript','plain']);

const REASON = Object.freeze({
  200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
  301: 'Moved Permanently', 302: 'Found', 307: 'Temporary Redirect', 308: 'Permanent Redirect',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 410: 'Gone',
  418: "I'm a teapot", 429: 'Too Many Requests', 451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout',
});

export function qxMimeTypeForLoonMock(type = '') {
  return MIME[String(type || '').toLowerCase()] || 'application/octet-stream';
}

export function qxMockTypeIsBinary(type = '') {
  return !TEXT_TYPES.has(String(type || '').toLowerCase());
}

function statusLine(status = 200) {
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

function base64Decoder() {
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
  const needsAdd = headerOps.some(op => op.type === 'add');
  return [
    'function __wayxHeaderKey(headers, name) {',
    '  const wanted = String(name).toLowerCase();',
    '  return Object.keys(headers).find(key => key.toLowerCase() === wanted);',
    '}',
    ...(needsAdd ? [
      'function __wayxHeaderAdd(headers, name, value) {',
      '  const key = __wayxHeaderKey(headers, name);',
      '  headers[key || name] = value;',
      '}',
    ] : []),
    'function __wayxHeaderSet(headers, name, value) {',
    '  const key = __wayxHeaderKey(headers, name);',
    '  headers[key || name] = value;',
    '}',
    'function __wayxHeaderDel(headers, name) {',
    '  const wanted = String(name).toLowerCase();',
    '  for (const key of Object.keys(headers)) if (key.toLowerCase() === wanted) delete headers[key];',
    '}',
    'function __wayxHeaderReplace(headers, name, source, replacement) {',
    '  const key = __wayxHeaderKey(headers, name);',
    '  if (key !== undefined) headers[key] = String(headers[key]).replace(new RegExp(source), replacement);',
    '}',
  ];
}

function renderHeaderOps(lines, headerOps = []) {
  if (!headerOps.length) return;
  if (headerOps.some(op => op.type === 'add')) {
    throw new Error('QX header.add cannot be represented losslessly with the official header object form');
  }
  lines.push(...headerHelpers(headerOps));
  for (const op of headerOps) {
    if (op.type === 'add') lines.push(`__wayxHeaderAdd(headers, ${JSON.stringify(op.name)}, ${JSON.stringify(op.value)});`);
    else if (op.type === 'set') lines.push(`__wayxHeaderSet(headers, ${JSON.stringify(op.name)}, ${JSON.stringify(op.value)});`);
    else if (op.type === 'del') lines.push(`__wayxHeaderDel(headers, ${JSON.stringify(op.name)});`);
    else if (op.type === 'replace') lines.push(`__wayxHeaderReplace(headers, ${JSON.stringify(op.name)}, ${JSON.stringify(normalizeRegexBodyForTarget(op.pattern))}, ${JSON.stringify(op.replacement)});`);
    else throw new Error('unsupported QX mock header operation: ' + op.type);
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
    lines.push(...base64Decoder());
  } else {
    lines.push(`const __wayxBody = ${JSON.stringify(options.bodyText)};`);
  }

  if (plan.phase === 'response') {
    lines.push('const headers = {"Content-Type": __wayxContentType};');
    renderHeaderOps(lines, options.headerOps);
    lines.push(`const output = {status: ${JSON.stringify(statusLine(plan.status ?? 200))}, headers};`);
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
