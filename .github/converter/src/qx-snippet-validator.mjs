// Quantumult X snippet validator
// Author: chance
// Category: Converter / Quantumult X / Validation

import {
  QX_WAYX_FILTER_TYPES,
  QX_WAYX_REWRITE_MATCHERS,
  QX_WAYX_SCRIPT_ACTIONS,
  QX_WAYX_SNIPPET_MITM_KEYS,
} from './qx-official-capabilities.mjs';

function stripQxLeadingNote(line, entry) {
  const text=String(line ?? '').trim();
  if (!text.startsWith('{#')) return {line:text,note:null};
  const match=text.match(/^\{#\s*(.*?)\s*#\}\s+(.+)$/);
  if (!match || !match[1].trim() || !match[2].trim()) {
    throw new Error(`${entry.id}: malformed Quantumult X leading rule note: ${line}`);
  }
  return {line:match[2].trim(),note:match[1].trim()};
}

function splitQxRewriteLine(line) {
  const withHeaders=String(line).match(/^(\S+)\s+(.+?)\s+url-and-header\s+(.+)$/);
  if (withHeaders) {
    return {
      matcher:'url-and-header',
      urlPattern:withHeaders[1].trim(),
      headersPattern:withHeaders[2].trim(),
      action:withHeaders[3].trim(),
    };
  }
  const urlOnly=String(line).match(/^(\S+)\s+url\s+(.+)$/);
  if (urlOnly) {
    return {
      matcher:'url',
      urlPattern:urlOnly[1].trim(),
      headersPattern:null,
      action:urlOnly[2].trim(),
    };
  }
  return null;
}

function validateQxRewriteAction(action,line,entry) {
  if (/^(?:reject|reject-200|reject-img|reject-dict|reject-array)$/.test(action)) return;
  if (/^(?:302|307)\s+\S+$/.test(action)) return;
  if (/^jsonjq-(?:request|response)-body\s+'.+'$/.test(action)) return;
  if (/^(?:request|response)-body\s+.+\s+(?:request|response)-body\s+.+$/.test(action)) return;
  if (/^(request-header|response-header)\s+.+\s+\1\s+.+$/.test(action)) return;

  const echo=action.match(/^echo-response\s+(.+)\s+echo-response\s+(\S+)$/);
  if (echo) {
    const resourcePath=echo[2];
    if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(resourcePath) || resourcePath.startsWith('/') ||
        resourcePath.split('/').includes('..')) {
      throw new Error(`${entry.id}: Quantumult X echo-response resource must be a local Data-relative path: ${line}`);
    }
    return;
  }

  const script=action.match(/^(script-[a-z-]+)\s+(\S+)$/);
  if (script && QX_WAYX_SCRIPT_ACTIONS.has(script[1])) return;

  const codepoints=[...String(action)].map(ch=>ch.codePointAt(0).toString(16)).join(',');
  throw new Error(`${entry.id}: unverified/unsupported Quantumult X rewrite action: ${action}; codepoints=${codepoints}; line: ${line}`);
}

function validateQxTaskLine(line, entry) {
  const event = String(line).match(/^(event-network|event-interaction)\s+(\S+)([\s\S]*)$/);
  let tail = '';
  if (event) {
    tail = event[3] || '';
  } else {
    const tokens = String(line).trim().split(/\s+/);
    if (tokens.length < 6) return false;
    let cronFields = null;
    if (tokens.length >= 7 && /^(?:https?:\/\/|[^\s]+\.js(?:[?#]|$))/.test(tokens[6])) cronFields = 6;
    else if (/^(?:https?:\/\/|[^\s]+\.js(?:[?#]|$))/.test(tokens[5])) cronFields = 5;
    if (!cronFields) return false;
    tail = tokens.slice(cronFields + 1).join(' ');
  }

  if (!tail.trim()) return true;
  if (!/^,\s*/.test(tail)) {
    throw new Error(`${entry.id}: malformed Quantumult X task options: ${line}`);
  }
  const optionText = tail.replace(/^,\s*/, '');
  for (const raw of optionText.split(/,\s*/)) {
    const eq = raw.indexOf('=');
    if (eq < 1) throw new Error(`${entry.id}: malformed Quantumult X task option: ${line}`);
    const name = raw.slice(0,eq).trim().toLowerCase();
    const value = raw.slice(eq+1).trim();
    if (!['tag','img-url','enabled','require-devices'].includes(name) || !value) {
      throw new Error(`${entry.id}: unverified/unsupported Quantumult X task option ${name}: ${line}`);
    }
    if (name === 'enabled' && !/^(?:true|false)$/i.test(value)) {
      throw new Error(`${entry.id}: Quantumult X task enabled must be true/false: ${line}`);
    }
  }
  return true;
}

function validateQxExecutableLine(line, entry, section = null) {
  const noted=stripQxLeadingNote(line,entry);
  line=noted.line;

  if (noted.note && /^([A-Za-z0-9_-]+)\s*=/.test(line)) {
    throw new Error(`${entry.id}: Quantumult X leading notes are only valid on filter/rewrite rules: ${line}`);
  }

  if (section==='task_local') {
    if (validateQxTaskLine(line,entry)) return;
    throw new Error(`${entry.id}: malformed/unverified Quantumult X task line: ${line}`);
  }

  const mitm=line.match(/^([A-Za-z0-9_-]+)\s*=/);
  if (mitm) {
    if (!QX_WAYX_SNIPPET_MITM_KEYS.has(mitm[1].toLowerCase())) {
      throw new Error(`${entry.id}: unverified/unsupported Quantumult X snippet MITM key: ${mitm[1]}`);
    }
    return;
  }

  const rewrite=splitQxRewriteLine(line);
  if (rewrite) {
    if (!QX_WAYX_REWRITE_MATCHERS.has(rewrite.matcher)) {
      throw new Error(`${entry.id}: unverified/unsupported Quantumult X rewrite matcher: ${rewrite.matcher}`);
    }
    if (!rewrite.urlPattern) {
      throw new Error(`${entry.id}: Quantumult X rewrite line has an empty URL pattern: ${line}`);
    }
    if (rewrite.matcher==='url-and-header' && !rewrite.headersPattern) {
      throw new Error(`${entry.id}: Quantumult X url-and-header rewrite has an empty Headers pattern: ${line}`);
    }
    validateQxRewriteAction(rewrite.action,line,entry);
    return;
  }

  const comma=line.indexOf(',');
  if (comma > 0) {
    const type=line.slice(0,comma).trim().toLowerCase();
    if (!QX_WAYX_FILTER_TYPES.has(type)) {
      throw new Error(`${entry.id}: unverified/unsupported Quantumult X filter type: ${type}`);
    }
    const fields=line.split(',').map(part=>part.trim());
    if (fields.length < 3 || !fields[1] || !fields[2]) {
      throw new Error(`${entry.id}: malformed Quantumult X filter line: ${line}`);
    }
    if (['ip-cidr','ip6-cidr','geoip','ip-asn'].includes(type) && fields.slice(3).some(x=>x.toLowerCase()==='no-resolve')) {
      throw new Error(`${entry.id}: Quantumult X IP-class rules must remove no-resolve`);
    }
    return;
  }

  throw new Error(`${entry.id}: unclassified active Quantumult X line: ${line}`);
}

export function validateQX(text, entry) {
  const activeMetadata=text.split('\n').filter(line=>/^#!/.test(line.trim()));
  if (activeMetadata.length) {
    throw new Error(`${entry.id}: Quantumult X snippet metadata must be plain comments, not active #! directives`);
  }

  const activeSections=text.split('\n').filter(line=>/^\[(filter_local|rewrite_local|task_local|mitm)\]$/i.test(line.trim()));
  if (activeSections.length) {
    throw new Error(`${entry.id}: Quantumult X section headings must be commented`);
  }

  let section=null;
  for (const raw of text.split('\n')) {
    const line=raw.trim();
    const sectionMatch=line.match(/^#\s*\[(filter_local|rewrite_local|task_local|mitm)\]\s*$/i);
    if (sectionMatch) {
      section=sectionMatch[1].toLowerCase();
      continue;
    }
    if (!line || line.startsWith('#')) continue;
    if (/\(\?[ims](?:[:)])?/i.test(line)) {
      throw new Error(`${entry.id}: Quantumult X output must not restore discarded Loon regex flags with inline modifiers: ${line}`);
    }
    if (/\[hH\]\[tT\]\[tT\]\[pP\](?:\[sS\])?/.test(line)) {
      throw new Error(`${entry.id}: Quantumult X output must not emulate case-insensitive flags with manual HTTP case-fold classes: ${line}`);
    }
    if (/jq-path=/i.test(line)) {
      throw new Error(`${entry.id}: discarded legacy jq-path alias leaked into active Quantumult X output: ${line}`);
    }
    validateQxExecutableLine(line,entry,section);
  }

  for (const bad of ['response-body-json-del','response-body-json-replace','response-body-json-jq','mock-response-body']) {
    const active=text.split('\n').find(line=>line.trim() && !line.trim().startsWith('#') && line.includes(bad));
    if (active) throw new Error(`${entry.id}: unconverted QX token ${bad}`);
  }

  const commentedSections=['# [filter_local]','# [rewrite_local]','# [mitm]'].filter(section=>text.includes(section));
  if (!commentedSections.length) {
    throw new Error(`${entry.id}: missing commented QX section heading`);
  }
}
