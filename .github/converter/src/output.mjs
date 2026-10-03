// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / output

import { isRewriteV2 } from "./rewrite.mjs";
import { parseLegacyScriptLine } from "./script.mjs";
import { cleanSourceComments, sourceCommentText } from "./input.mjs";
import { QX_WAYX_FILTER_TYPES, QX_WAYX_REWRITE_MATCHERS, QX_WAYX_SCRIPT_ACTIONS, QX_WAYX_SNIPPET_MITM_KEYS, SURGE_WAYX_REWRITE_SECTIONS, SURGE_WAYX_URL_REWRITE_TYPES, SURGE_WAYX_HEADER_REWRITE_ACTIONS, SURGE_WAYX_BODY_REWRITE_TYPES, SURGE_WAYX_MAP_LOCAL_DATA_TYPES, SURGE_WAYX_SCRIPT_TYPES, SURGE_WAYX_MITM_KEYS } from "./core.mjs";
import { splitTopLevelCsv, surgePolicyIndex, surgeRuleTypesInTree, SURGE_MODULE_POLICIES } from "./rule.mjs";



// metadata.mjs
// WayX target metadata normalization
// Author: chance
// Category: Converter / Metadata

export function parseSourceMetadataHeader(headerLines = []) {
  const directives=new Map();
  const comments=[];

  for (const raw of headerLines) {
    const line=String(raw ?? '').trimEnd();
    const match=line.trim().match(/^#!([^=]+)=(.*)$/);
    if (match) {
      directives.set(match[1].trim().toLowerCase(),match[2].trim());
      continue;
    }
    comments.push(line);
  }

  return {directives,comments};
}

const KNOWN_LABELS = new Map([
  ['author', 'Author'],
  ['homepage', 'Homepage'],
  ['icon', 'Icon'],
  ['openurl', 'Open URL'],
  ['tag', 'Tags'],
  ['raw-url', 'Upstream'],
  ['tg-channel', 'Channel'],
  ['date', 'Updated'],
  ['system', 'Platform'],
  ['system_version', 'System Version'],
]);

function targetText(value, target) {
  if (!value) return value;
  return String(value).replace(/\bLoon\b/g, target);
}

function metadataComments(directives, target) {
  const out = [];
  for (const [key, value] of directives) {
    if (!value) continue;
    if (key === 'name' || key === 'desc' || key === 'loon_version') continue;
    if (key === 'system' && /^(?:ios|mac)$/i.test(value) && target === 'Surge') continue;
    if (key === 'category' && target === 'Surge') continue;
    const label = KNOWN_LABELS.get(key) || key.replace(/(^|[-_])(\w)/g, (_, __, c) => ' ' + c.toUpperCase()).trim();
    out.push(`# ${label}: ${value}`);
  }
  return out;
}

function preservedComments(lines) {
  const out = [];
  for (const raw of lines) {
    const line = String(raw ?? '').trimEnd();
    if (!line.trim()) {
      if (out.length && out.at(-1) !== '') out.push('');
      continue;
    }
    out.push(line);
  }
  while (out.length && !out.at(-1)) out.pop();
  return out;
}

export function renderQxSnippetHeader(headerLines, entry, stamp) {
  const { directives, comments } = parseSourceMetadataHeader(headerLines);
  const out = [];
  const name = directives.get('name') || entry.id;
  const desc = targetText(directives.get('desc') || '', 'Quantumult X');

  out.push(`# Name: ${name}`);
  if (desc) out.push(`# Description: ${desc}`);
  out.push(...metadataComments(directives, 'Quantumult X'));
  const original = preservedComments(comments);
  if (original.length) {
    out.push('');
    out.push(...original);
  }
  out.push(
    '',
    `# Converted: ${stamp}`,
    '# Converted by: chance',
    `# Category: ${entry.category}`,
    `# Source: ${entry.source}`,
    '# Target: Quantumult X',
  );
  return out;
}

export function renderSurgeModuleHeader(headerLines, entry, stamp, { needsCore20 = false, argumentMetadata = [], needsLineRequirement = false } = {}) {
  const { directives, comments } = parseSourceMetadataHeader(headerLines);
  const name = directives.get('name') || entry.id;
  const desc = targetText(directives.get('desc') || entry.id, 'Surge');
  const out = [
    '#!name=' + name,
    '#!desc=' + desc,
    '#!category=WayX',
  ];

  const system = directives.get('system');
  if (system && /^mac$/i.test(system)) out.push('#!system=mac');
  if (needsLineRequirement) out.push('#!requirement=CORE_VERSION>=22');
  else if (needsCore20) out.push('#!requirement=CORE_VERSION>=20');
  out.push(...argumentMetadata);

  const meta = metadataComments(directives, 'Surge');
  const original = preservedComments(comments);
  if (meta.length || original.length) out.push('');
  out.push(...meta);
  if (meta.length && original.length) out.push('');
  out.push(...original);
  out.push(
    '',
    '# Converted: ' + stamp,
    '# Converted by: chance',
    '# Source: ' + entry.source,
    '# Target: Surge',
  );
  return out;
}

// Generated-file policy metadata; target syntax is validated by its sole adapter.
export function validateConversionMetadata(text,entry,target) {
  const common=[
    /^# Converted:\s*.+$/m,
    /^# Converted by:\s*chance\s*$/m,
    /^# Source:\s*.+$/m,
    target==='qx' ? /^# Target:\s*Quantumult X\s*$/m : /^# Target:\s*Surge\s*$/m,
  ];
  for(const pattern of common){
    if(!pattern.test(text))throw new Error(`${entry.id}: missing conversion metadata ${pattern}`);
  }
  if(target==='qx'){
    if(!/^# Category:\s*.+$/m.test(text))throw new Error(`${entry.id}: missing conversion Category`);
    for(const title of ['# [filter_local]','# [rewrite_local]','# [mitm]']){
      if(!text.includes(title))throw new Error(`${entry.id}: missing commented section ${title}`);
    }
  }else if(target==='surge'){
    if((text.match(/^#!category=WayX$/gm)||[]).length!==1)throw new Error(`${entry.id}: module requires exactly one #!category=WayX`);
    if(/^# Category:\s*.+$/m.test(text))throw new Error(`${entry.id}: legacy Surge Category comment`);
    let mitm=false;
    for(const raw of text.split('\n')){
      const line=raw.trim(),section=line.match(/^\[([^\]]+)\]$/);
      if(section){mitm=section[1]==='MITM';continue;}
      if(mitm && /^hostname\s*=/i.test(line) && !/^hostname\s*=\s*%APPEND%\s+\S/i.test(line)){
        throw new Error(`${entry.id}: Surge module MITM hostname must use %APPEND%`);
      }
    }
  }else throw new TypeError('Unknown metadata target: '+target);
}

// output.mjs
// Target output builders for Quantumult X and Surge
// Author: chance
// Category: Converter / Output



export function compactOutputLines(lines = []) {
  const out=[];
  for (const raw of lines) {
    const line=raw ?? '';
    if (line==='' && out.at(-1)==='') continue;
    out.push(line);
  }
  while (out.length && out.at(-1)==='') out.pop();
  return out;
}

export function hasActiveOutputLines(lines = []) {
  return lines.some(raw=>{
    const line=String(raw ?? '').trim();
    return line && !line.startsWith('#') && !line.startsWith(';') && !line.startsWith('//');
  });
}

export function finalizeOutputLines(lines = []) {
  return lines.join('\n').replace(/\n*$/, '\n');
}

const QX_DESTINATIONS=new Map([
  ['notes','notes'],
  ['comment','notes'],
  ['filter','filter'],
  ['rewrite','rewrite'],
  ['task','task'],
  ['mitm','mitm'],
]);

export function createQxOutputState() {
  return {
    notes:[],
    filter:[],
    rewrite:[],
    task:[],
    mitm:[],
    generatedScripts:new Map(),
  };
}

export function qxOutputDestination(state,section) {
  const key=QX_DESTINATIONS.get(String(section || '').toLowerCase());
  return key ? state[key] : null;
}

export function appendQxOutput(state,section,...lines) {
  const dest=qxOutputDestination(state,section);
  if (!dest) return false;
  dest.push(...lines);
  return true;
}

export function qxRuleOutputDestination(state,kind) {
  return qxOutputDestination(state,kind==='rewrite' ? 'rewrite' : 'filter');
}

export function qxRewriteOutputDestination(state,section) {
  if (section==='rewrite' || section==='drop') return qxOutputDestination(state,'rewrite');
  return qxOutputDestination(state,'notes');
}

export function renderQxOutput({state,headerLines,entry,stamp}) {
  const header=renderQxSnippetHeader(headerLines,entry,stamp);
  const lines=[
    ...header,
    '',
    ...(state.notes.length ? [...state.notes,''] : []),
    '# [filter_local]',
    ...compactOutputLines(state.filter),
    '',
    '# [rewrite_local]',
    ...compactOutputLines(state.rewrite),
    '',
    ...(state.task.length ? ['# [task_local]',...compactOutputLines(state.task),''] : []),
    '# [mitm]',
    ...compactOutputLines(state.mitm),
    '',
  ];
  return finalizeOutputLines(lines);
}

const SURGE_DESTINATIONS=new Map([
  ['notes','notes'],
  ['comment','notes'],
  ['general','general'],
  ['rule','rule'],
  ['url','url'],
  ['header','header'],
  ['body','body'],
  ['map','map'],
  ['script','script'],
  ['mitm','mitm'],
]);

const SURGE_SECTION_ORDER=[
  ['general','[General]'],
  ['rule','[Rule]'],
  ['url','[URL Rewrite]'],
  ['header','[Header Rewrite]'],
  ['body','[Body Rewrite]'],
  ['map','[Map Local]'],
  ['script','[Script]'],
  ['mitm','[MITM]'],
];

export function createSurgeOutputState() {
  return {
    notes:[],
    general:[],
    rule:[],
    url:[],
    header:[],
    body:[],
    map:[],
    script:[],
    mitm:[],
    generatedScripts:new Map(),
  };
}

export function surgeOutputDestination(state,section) {
  const key=SURGE_DESTINATIONS.get(String(section || '').toLowerCase());
  return key ? state[key] : null;
}

export function appendSurgeOutput(state,section,...lines) {
  const dest=surgeOutputDestination(state,section);
  if (!dest) return false;
  dest.push(...lines);
  return true;
}

export function surgeRuleOutputDestination(state,section) {
  return surgeOutputDestination(state,section==='map' ? 'map' : 'rule');
}

export function surgeRewriteOutputDestination(state,section) {
  if (section==='drop') return surgeOutputDestination(state,'notes');
  return surgeOutputDestination(state,section) || surgeOutputDestination(state,'notes');
}

export function renderSurgeOutput({
  state,
  headerLines,
  entry,
  stamp,
  argumentMetadata=[],
  needsLineRequirement=false,
}) {
  const needsCore20=hasActiveOutputLines(state.body) || hasActiveOutputLines(state.map);
  const header=renderSurgeModuleHeader(headerLines,entry,stamp,{
    needsCore20,
    argumentMetadata,
    needsLineRequirement,
  });

  const sections=[];
  if (state.notes.length) sections.push(...state.notes,'');

  for (const [key,title] of SURGE_SECTION_ORDER) {
    if (!state[key].length) continue;
    sections.push(title,...compactOutputLines(state[key]),'');
  }

  return finalizeOutputLines([...header,'',...sections]);
}

// qx-comment.mjs
// Quantumult X inline source-note rendering
// Author: chance
// Category: Converter / Comments / Quantumult X

export function looksLikeCommentedSourceDeclaration(text,sectionKind) {
  const value=String(text || '').trim();
  if (!value) return false;

  if (sectionKind==='rule') {
    return /^(?:[A-Z][A-Z0-9-]*|AND|OR|NOT)\s*,/i.test(value);
  }

  if (sectionKind==='rewrite') {
    if (isRewriteV2(value)) return true;
    return /^\S+\s+(?:-\s+)?(?:reject(?:-[A-Za-z0-9-]+)?|302\b|307\b|header\b|(?:response-)?header-(?:add|del|replace|replace-regex)\b|(?:request|response)-body-(?:replace-regex|json-|mock)|mock-(?:request|response)-body\b)/i.test(value);
  }

  if (sectionKind==='script') {
    if (/^\s*(?:request|response)\s+if\b/.test(value) && /\bthen\s+script\s*\(/.test(value)) return true;
    return Boolean(parseLegacyScriptLine(value)?.script?.path);
  }

  return false;
}

export function qxInlineNoteCandidate(sectionLines,item,sectionKind) {
  if (!item?.line || !Number.isInteger(item.sourceIndex) || item.sourceIndex<1) return null;

  const index=item.sourceIndex;
  const previousRaw=sectionLines[index-1];
  const previous=String(previousRaw ?? '').trim();
  const note=sourceCommentText(previousRaw);

  if (!previous || note===null || !note || note.includes('{#') || note.includes('#}')) return null;

  // Only one adjacent source comment can become a QX leading note.
  if (index>=2 && sourceCommentText(sectionLines[index-2])!==null) return null;

  // A comment followed by multiple active source declarations is a group comment.
  if (index+1<sectionLines.length) {
    const next=String(sectionLines[index+1] ?? '').trim();
    if (next && sourceCommentText(sectionLines[index+1])===null) return null;
  }

  // Disabled source declarations are source content, not prose notes.
  if (looksLikeCommentedSourceDeclaration(note,sectionKind)) return null;

  return {text:note,raw:previousRaw};
}

export function attachQxInlineNote({sectionLines,item,sectionKind,lines,eligible=true}) {
  const output=(lines || []).filter(line=>line!==undefined && line!==null && String(line).length);
  const candidate=eligible ? qxInlineNoteCandidate(sectionLines,item,sectionKind) : null;
  const singleActive=
    candidate &&
    output.length===1 &&
    !String(output[0]).includes('\n') &&
    !String(output[0]).trim().startsWith('#');

  if (!singleActive) {
    return {comments:cleanSourceComments(item.comments),lines:output};
  }

  const remaining=[...item.comments];
  if (remaining.length && remaining.at(-1)===candidate.raw) remaining.pop();

  return {
    comments:cleanSourceComments(remaining),
    lines:[`{# ${candidate.text} #} ${output[0]}`],
  };
}

// qx-snippet-validator.mjs
// Quantumult X snippet validator
// Author: chance
// Category: Converter / Quantumult X / Validation



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
  const source=String(line).trim();
  const comma=source.indexOf(',');
  const declaration=(comma>=0 ? source.slice(0,comma) : source).trim();
  const optionText=comma>=0 ? source.slice(comma+1).trim() : '';

  const event=declaration.match(/^(event-network|event-interaction)\s+(\S+)$/);
  if (!event) {
    const tokens=declaration.split(/\s+/);
    if (tokens.length < 6) return false;
    const scriptUrl=tokens.at(-1);
    const cron=tokens.slice(0,-1);
    if (![5,6].includes(cron.length) || !/^https?:\/\/\S+$/i.test(scriptUrl)) return false;
  }

  if (!optionText) return true;
  for (const raw of optionText.split(/,\s*/)) {
    const eq=raw.indexOf('=');
    if (eq < 1) throw new Error(`${entry.id}: malformed Quantumult X task option: ${line}`);
    const name=raw.slice(0,eq).trim().toLowerCase();
    const value=raw.slice(eq+1).trim();
    if (!['tag','img-url','enabled','require-devices'].includes(name) || !value) {
      throw new Error(`${entry.id}: unverified/unsupported Quantumult X task option ${name}: ${line}`);
    }
    if (name==='enabled' && !/^(?:true|false)$/i.test(value)) {
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

// surge-module.mjs
// WayX Surge Module formatter / validator
// Author: chance
// Category: Converter / Surge Module




export function hasActiveSurgeLines(lines = []) {
  return lines.some(raw => {
    const line = String(raw).trim();
    return line && !line.startsWith('#') && !line.startsWith(';') && !line.startsWith('//');
  });
}

export function validateSurgeModule(text, entry = {id:'module'}) {
  const allowedSections = new Set(['General','Rule', ...SURGE_WAYX_REWRITE_SECTIONS, 'MITM']);

  const allowedTopDirectives = [
    /^#!name=.+$/i,
    /^#!desc=.+$/i,
    /^#!category=WayX$/,
    /^#!system=mac$/i,
    /^#!requirement=.+$/i,
    /^#!arguments=.+$/i,
    /^#!arguments-desc=.+$/i,
  ];

  if (!/^#!name=.+$/m.test(text)) throw new Error(`${entry.id}: Surge module missing #!name`);
  if (!/^#!desc=.+$/m.test(text)) throw new Error(`${entry.id}: Surge module missing #!desc`);
  if (!/^#!category=WayX$/m.test(text)) throw new Error(`${entry.id}: Surge module must declare #!category=WayX`);

  let current = null;
  let hasBodyRewrite = false;
  let hasInlineMapLocal = false;
  let hasLineRequirement = false;
  const declaredArguments = new Set();
  let moduleRequirementCore = null;

  for (const raw of String(text).split('\n')) {
    let line = raw.trim();
    if (!line) continue;

    if (current === null) {
      const args = line.match(/^#!arguments=(.+)$/i);
      if (args) {
        for (const item of args[1].split(',')) {
          const name = item.split(':', 1)[0].trim();
          if (!/^[A-Za-z0-9_]+$/.test(name)) {
            throw new Error(`${entry.id}: invalid Surge module argument name: ${name}`);
          }
          if (declaredArguments.has(name)) {
            throw new Error(`${entry.id}: duplicate Surge module argument: ${name}`);
          }
          declaredArguments.add(name);
        }
      }
      const requirement = line.match(/^#!requirement=.*CORE_VERSION\s*>=\s*(\d+)/i);
      if (requirement) moduleRequirementCore = Number(requirement[1]);
    }

    const lineRequirement = line.match(/^#!REQUIREMENT\s+(?:"(?:[^"\\]|\\.)*"|\S+)\s+(.+)$/);
    if (lineRequirement) {
      hasLineRequirement = true;
      line = lineRequirement[1].trim();
    }

    const section = line.match(/^\[([^\]]+)\]$/);
    if (section) {
      current = section[1];
      if (!allowedSections.has(current)) {
        throw new Error(`${entry.id}: unsupported Surge module section [${current}]`);
      }
      continue;
    }

    if (line.startsWith('#!')) {
      if (current === null && allowedTopDirectives.some(re => re.test(line))) continue;
      throw new Error(`${entry.id}: unsupported Surge module directive: ${line}`);
    }
    if (line.startsWith('#') || line.startsWith(';') || line.startsWith('//')) continue;

    if (current === null) {
      throw new Error(`${entry.id}: active Surge content outside a section: ${line}`);
    }

    if (current === 'General') {
      const option=line.match(/^([^=]+?)\s*=\s*(.+)$/);
      if (!option || option[1].trim()!=='always-real-ip') {
        throw new Error(`${entry.id}: unsupported Surge module [General] option: ${line}`);
      }
      continue;
    }

    if (current === 'Rule') {
      const parts = splitTopLevelCsv(line);
      const typeTree = surgeRuleTypesInTree(line);
      if (!typeTree.ok) {
        throw new Error(`${entry.id}: unsupported Surge rule type/combination in module (${typeTree.reason}): ${line}`);
      }
      const policyIndex = surgePolicyIndex(parts);
      const policyRaw = String(parts[policyIndex] || '');
      const argumentPolicy = policyRaw.match(/^\{\{\{([A-Za-z0-9_]+)\}\}\}$/);
      if (argumentPolicy) {
        if (!declaredArguments.has(argumentPolicy[1])) {
          throw new Error(`${entry.id}: Surge module [Rule] references undeclared policy argument ${argumentPolicy[1]}: ${line}`);
        }
      } else {
        const policy = policyRaw.toUpperCase();
        if (!SURGE_MODULE_POLICIES.has(policy)) {
          throw new Error(`${entry.id}: Surge module [Rule] policy is outside the WayX accepted Surge Rule built-in policy set or a declared {{{argument}}}: ${line}`);
        }
      }
      if (line !== parts.join(',')) {
        throw new Error(`${entry.id}: Surge module [Rule] must use canonical top-level comma formatting: ${line}`);
      }
      continue;
    }

    if (current === 'URL Rewrite') {
      const type = line.trim().split(/\s+/).at(-1);
      if (!SURGE_WAYX_URL_REWRITE_TYPES.has(type)) {
        throw new Error(`${entry.id}: invalid Surge URL Rewrite line: ${line}`);
      }
      if (type === 'reject' && !/\s_\sreject$/.test(line)) {
        throw new Error(`${entry.id}: Surge URL reject must use '<pattern> _ reject': ${line}`);
      }
      continue;
    }

    if (current === 'Header Rewrite') {
      const match = line.match(/^http-(?:request|response)\s+\S+\s+(header-[a-z-]+)\b/);
      if (!match || !SURGE_WAYX_HEADER_REWRITE_ACTIONS.has(match[1])) {
        throw new Error(`${entry.id}: invalid Surge Header Rewrite line: ${line}`);
      }
      continue;
    }

    if (current === 'Body Rewrite') {
      hasBodyRewrite = true;
      const type = line.trim().split(/\s+/, 1)[0];
      if (!SURGE_WAYX_BODY_REWRITE_TYPES.has(type)) {
        throw new Error(`${entry.id}: invalid Surge Body Rewrite line: ${line}`);
      }
      continue;
    }

    if (current === 'Map Local') {
      const dataType = line.match(/\bdata-type=([^\s]+)/)?.[1];
      if (!dataType || !SURGE_WAYX_MAP_LOCAL_DATA_TYPES.has(dataType)) {
        throw new Error(`${entry.id}: invalid Surge Map Local line: ${line}`);
      }
      if (dataType !== 'file') hasInlineMapLocal = true;
      continue;
    }

    if (current === 'Script') {
      const declaration = line.match(/^([^=]+?)\s*=\s*(.+)$/);
      if (!declaration) throw new Error(`${entry.id}: invalid Surge [Script] declaration: ${line}`);
      const body = declaration[2];
      const typeMatch = body.match(/(?:^|,)\s*type=([^,\s]+)/);
      if (!typeMatch) throw new Error(`${entry.id}: Surge [Script] declaration must include an explicit type: ${line}`);
      const type = typeMatch[1];
      if (!SURGE_WAYX_SCRIPT_TYPES.has(type)) {
        throw new Error(`${entry.id}: unsupported Surge [Script] type for WayX conversion: ${line}`);
      }
      if (!/(?:^|,)\s*script-path=[^,\s]+/.test(body)) {
        throw new Error(`${entry.id}: Surge [Script] missing script-path: ${line}`);
      }
      if (type === 'http-request' || type === 'http-response') {
        const patternMatch = body.match(/(?:^|,)\s*pattern=([^,]+)/);
        if (!patternMatch) {
          throw new Error(`${entry.id}: Surge HTTP script missing pattern: ${line}`);
        }
      } else if (type === 'cron') {
        if (!/(?:^|,)\s*cronexp=(?:"(?:[^"\\]|\\.)*"|[^,]+)/.test(body)) {
          throw new Error(`${entry.id}: Surge cron script missing cronexp: ${line}`);
        }
      } else if (type === 'event') {
        if (!/(?:^|,)\s*event-name=[^,\s]+/.test(body)) {
          throw new Error(`${entry.id}: Surge event script missing event-name: ${line}`);
        }
      }
      continue;
    }

    if (current === 'MITM') {
      const match = line.match(/^([^=]+?)\s*=\s*(.+)$/);
      if (!match) throw new Error(`${entry.id}: invalid Surge MITM option: ${line}`);
      const key = match[1].trim();
      if (!SURGE_WAYX_MITM_KEYS.has(key)) {
        throw new Error(`${entry.id}: WayX ad-block Surge Module [MITM] only accepts hostname: ${line}`);
      }
      continue;
    }

  }

  if ((hasBodyRewrite || hasInlineMapLocal) && !(moduleRequirementCore >= 20)) {
    throw new Error(`${entry.id}: Body Rewrite / inline Map Local requires #!requirement CORE_VERSION>=20 or newer`);
  }
  if (hasLineRequirement && !(moduleRequirementCore >= 22)) {
    throw new Error(`${entry.id}: parameterized line requirements require #!requirement CORE_VERSION>=22 or newer`);
  }

  for (const match of String(text).matchAll(/\{\{\{([A-Za-z0-9_]+)\}\}\}/g)) {
    if (!declaredArguments.has(match[1])) {
      throw new Error(`${entry.id}: undeclared Surge module argument placeholder: ${match[1]}`);
    }
  }
}
