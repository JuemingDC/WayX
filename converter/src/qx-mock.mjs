// WayX Quantumult X mock-script renderer
// Author: chance
// Category: Converter / Quantumult X / Mock

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

export function renderQxMockFileScript(plan, options = {}) {
  if (!plan || !plan.url || !plan.phase) throw new TypeError('Expected a resolved QX mock_file plan');
  if (!['request','response'].includes(plan.phase)) throw new Error(`Unsupported mock phase: ${plan.phase}`);
  if (plan.phase === 'request' && (plan.binary || plan.base64)) {
    throw new Error('Quantumult X request mock_file binary/bodyBytes output is not enabled without an official request-body example');
  }

  const hasText = typeof options.bodyText === 'string';
  const hasBytes = typeof options.bodyBase64 === 'string' && options.bodyBase64.length > 0;
  if (plan.binary || plan.base64) {
    if (!hasBytes) throw new Error('materialized mock_file bytes are required');
  } else if (!hasText) {
    throw new Error('materialized mock_file text is required');
  }

  const mime = qxMimeTypeForLoonMock(plan.contentType);
  const lines = [
    ...meta({...options, sourceFile: options.sourceFile || plan.url}),
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
    lines.push(`const output = {status: ${JSON.stringify(statusLine(plan.status ?? 200))}, headers};`);
    if (plan.binary || plan.base64) lines.push('output.bodyBytes = __wayxBase64ToArrayBuffer(__wayxBodyBase64);');
    else lines.push('output.body = __wayxBody;');
    lines.push('$done(output);');
  } else {
    lines.push('const headers = {...$request.headers, "Content-Type": __wayxContentType};');
    lines.push('$done({headers, body: __wayxBody});');
  }

  lines.push('');
  return lines.join('\n');
}
