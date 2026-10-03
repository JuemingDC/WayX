import { validateRewriteV2Ast } from './rewrite.mjs';
import { compileRegexForTarget } from './target-regex.mjs';

// WayX Surge request-body mock helper renderer
// Author: chance
// Category: Converter / Surge / Rewrite v2 / Mock

const MIME = Object.freeze({
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

const TEXT_TYPES = new Set(['json','text','css','html','javascript','plain']);

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
  return compileRegexForTarget(c.right, {subject:'url', target:'surge'}).pattern;
}

function metadata({stamp='',category='',sourceLine='',sourceFile=''}={}) {
  return [
    stamp ? '// Converted: ' + stamp : null,
    '// Converted by: chance',
    '// Category: ' + (category || 'Rewrite / Request Mock'),
    sourceLine ? '// Source Loon: ' + sourceLine : null,
    sourceFile ? '// Source file: ' + sourceFile : null,
  ].filter(Boolean);
}

function base64Decoder() {
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
  const mime=MIME[contentType] || 'application/octet-stream';
  const fileMode=action.name.endsWith('_file');
  const base64=boolValue(action.args[fileMode ? 2 : 2], false);
  const binary=!TEXT_TYPES.has(contentType);

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
    ...metadata({stamp,category,sourceLine,sourceFile}),
    'const headers={...($request.headers||{}),"Content-Type":'+JSON.stringify(mime)+'};',
  ];
  if (binary || base64) {
    lines.push('const __wayxBodyBase64='+JSON.stringify(bodyBase64)+';');
    lines.push(...base64Decoder());
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
