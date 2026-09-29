import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { qxRule as canonicalQxRule, surgeRule as canonicalSurgeRule } from '../../converter/src/rule.mjs';
import { selectQxScriptAction } from '../../converter/src/script.mjs';
import { inspectQxScriptCompatibility, qxManualPortComment } from '../../converter/src/script-compat.mjs';
import { minifyJq } from '../../converter/src/jq.mjs';
import { BOXJS_SUBSCRIPTION, qxTargetPath, surgeTargetPath } from '../../converter/src/paths.mjs';
import { analyzeSafeRewriteV2, analyzeSimpleUrlRegexCondition } from '../../converter/src/rewrite-v2-safe.mjs';
import { isRewriteV2, parseRewriteV2 } from '../../converter/src/rewrite-v2.mjs';
import { validateRewriteV2Ast } from '../../converter/src/rewrite-v2-actions.mjs';
import { qxMockPlanFromAction } from '../../converter/src/dependency.mjs';
import { renderQxMockFileScript } from '../../converter/src/qx-mock.mjs';
import { mergeBoxJsSubscription, renderBoxJsApp, renderQxPrefsObjectBridge } from '../../converter/src/argument.mjs';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, '.github/sources/loon.json');
const RESOURCE_DIR = path.join(ROOT, 'Resource/Loon');
const TARGET_ROOT = path.join(ROOT, 'Adblock');
const SCRIPT_DIR = path.join(ROOT, 'script');
const RAW_BASE = 'https://raw.githubusercontent.com/JuemingDC/WayX/main';
const UA = 'StashCore/2.7.1 Stash/2.7.1 Clash/1.11.0';
const MIRRORS = ['git.repcz.link', 'git.unx.indevs.in'];

const nowCN = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(new Date()).replace(' ', 'T').replace('T', ' ') + ' +08:00';

const normalizeNewlines = s => s.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

async function fetchText(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': '*/*' }, redirect: 'follow', signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = normalizeNewlines(await res.text());
    if (!text.trim()) throw new Error('empty response');
    return text;
  } finally { clearTimeout(timer); }
}

function candidates(url) {
  if (!url.includes('https://kelee.one/')) return [url];
  const suffix = url.slice('https://kelee.one'.length);
  return [
    ...MIRRORS.map(h => `https://${h}/kelee.one${suffix}`),
    url,
  ];
}

async function fetchWithFallback(url) {
  const errors = [];
  for (const candidate of candidates(url)) {
    try { return { text: await fetchText(candidate), fetchedFrom: candidate }; }
    catch (e) { errors.push(`${candidate}: ${e.message}`); }
  }
  throw new Error(`all sources failed\n${errors.join('\n')}`);
}

function cleanSource(text) {
  // Qmxn mirror may insert this one line. The direct mirrors used by Actions do not.
  return normalizeNewlines(text).split('\n').filter(l => !/^#\s*引用链接:\s*/.test(l)).join('\n').replace(/\n*$/, '\n');
}

function parseLoon(text) {
  const header = [];
  const sections = new Map();
  let current = null;
  for (const raw of normalizeNewlines(text).split('\n')) {
    const m = raw.trim().match(/^\[([^\]]+)\]$/);
    if (m) {
      current = m[1];
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (current === null) header.push(raw);
    else sections.get(current).push(raw);
  }
  return { header, sections };
}

function shellTokens(input) {
  const out = [];
  let cur = '', quote = null, esc = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (esc) { cur += ch; esc = false; continue; }
    if (ch === '\\' && quote) { cur += ch; esc = true; continue; }
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (/\s/.test(ch)) {
      if (cur) { out.push(cur); cur = ''; }
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function splitPatternAction(line) {
  const idx = line.search(/\s/);
  if (idx < 0) return [line.trim(), ''];
  return [line.slice(0, idx).trim(), line.slice(idx).trim().replace(/^\-\s+/, '')];
}


function rewriteV2Action(line, target, ctx) {
  if (!isRewriteV2(line)) return null;

  // mock_file is a behavior-level conversion in QX: Loon reads a resource and
  // synthesizes/replaces a body; QX reproduces that effect with a generated
  // rewrite script instead of pretending mock_file is a native QX token.
  if (target === 'qx') {
    try {
      const ast = parseRewriteV2(line);
      validateRewriteV2Ast(ast);
      if (ast.actions.length === 1 && /^(?:request|response)\.body\.mock_file$/.test(ast.actions[0].name)) {
        const condition = analyzeSimpleUrlRegexCondition(ast.condition);
        if (!condition.ok) {
          return { section: 'comment', line: `# Unsupported Loon Rewrite v2 preserved (${condition.reason}): ${line}` };
        }
        const plan = qxMockPlanFromAction(ast.actions[0], { pluginSourceUrl: ctx.sourceUrl });
        const key = crypto.createHash('sha1').update(line).digest('hex').slice(0, 10);
        const filename = `mock_file_${key}.js`;
        const script = renderQxMockFileScript(plan, {
          stamp: ctx.stamp,
          category: ctx.category,
          sourceLine: line,
        });
        ctx.generatedScripts.set(filename, script);
        return {
          section: 'rewrite',
          line: `${condition.pattern} url ${plan.qxAction} ${RAW_BASE}/script/${ctx.id}/${filename}`,
        };
      }
    } catch (error) {
      return { section: 'comment', line: `# Unsupported Loon Rewrite v2 preserved (${String(error?.message || error).split('\n')[0]}): ${line}` };
    }
  }

  const parsed = analyzeSafeRewriteV2(line);
  if (!parsed.safe) {
    return { section: 'comment', line: `# Unsupported Loon Rewrite v2 preserved (${parsed.reason}): ${line}` };
  }
  // Direct primitives are chosen by resulting behavior. Example:
  // Loon reject(200) -> QX reject-200, not QX reject (404).
  return rewriteAction(parsed.pattern, parsed.action, target, ctx);
}

function sectionItems(lines = []) {
  const items = [];
  let pending = [];
  for (const raw of lines) {
    const t = raw.trim();
    if (!t || t.startsWith('#') || t.startsWith(';') || t.startsWith('//')) {
      pending.push(raw);
      continue;
    }
    items.push({ comments: pending, line: t });
    pending = [];
  }
  if (pending.length) items.push({ comments: pending, line: null });
  return items;
}

function cleanComments(comments) {
  return comments.map(x => x || '').map(x => x.trim() ? x : '').filter((x, i, a) => !(x === '' && a[i - 1] === ''));
}

function qxRule(line) {
  const p = line.split(',').map(s => s.trim());
  const type = (p[0] || '').toUpperCase();
  const value = p[1] || '';
  const policy = (p[2] || '').toLowerCase();
  const map = {
    'DOMAIN': 'host', 'DOMAIN-SUFFIX': 'host-suffix', 'DOMAIN-KEYWORD': 'host-keyword',
    'DOMAIN-WILDCARD': 'host-wildcard', 'IP-CIDR': 'ip-cidr', 'IP-CIDR6': 'ip6-cidr',
    'GEOIP': 'geoip', 'IP-ASN': 'ip-asn', 'USER-AGENT': 'user-agent'
  };
  if (map[type]) {
    if (!['direct', 'reject', 'proxy'].includes(policy)) return { kind: 'comment', line: `# Loon rule policy not losslessly expressible in Quantumult X: ${line}` };
    return { kind: 'filter', line: `${map[type]}, ${value}, ${policy}` };
  }
  if (type === 'URL-REGEX' && /^REJECT/.test((p[2] || '').toUpperCase())) return { kind: 'rewrite', line: `# Moved from Loon URL-REGEX Rule\n${value.replace(/^"|"$/g, '')} url reject-200` };
  return { kind: 'comment', line: `# Loon rule not losslessly expressible in Quantumult X filter: ${line}` };
}

function surgeRule(line) {
  return line.split(',').map(s => s.trim()).join(',');
}

function jqPath(pathText) {
  // Current whitelist uses identifier-safe dotted paths. Keep exact hierarchy.
  return '.' + pathText.split('.').map(k => /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : `[${JSON.stringify(k)}]`).join('.').replace(/\.\[/g, '[');
}

function quoteJq(jq) {
  if (jq.includes("'")) throw new Error('jq expression contains a single quote and cannot be safely embedded without manual review');
  return `'${jq}'`;
}

function jqDelete(rest) {
  const fields = shellTokens(rest).map(x => x.replace(/^['"]|['"]$/g, ''));
  return `del(${fields.map(jqPath).join(', ')})`;
}

function parseJsonValue(tok) {
  const t = tok.trim();
  try { return JSON.stringify(JSON.parse(t)); } catch {}
  if (/^(true|false|null|-?\d+(?:\.\d+)?)$/.test(t)) return t;
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    const body = t.slice(1, -1);
    return JSON.stringify(body);
  }
  return JSON.stringify(t);
}

function jqReplace(rest) {
  const t = shellTokens(rest);
  const ops = [];
  for (let i = 0; i + 1 < t.length; i += 2) {
    const keys = t[i].replace(/^['"]|['"]$/g, '').split('.');
    ops.push(`setpath(${JSON.stringify(keys)}; ${parseJsonValue(t[i + 1])})`);
  }
  return ops.join(' | ');
}

function parseMock(rest) {
  const type = (rest.match(/\bdata-type=([^\s]+)/) || [])[1] || 'text';
  const status = Number((rest.match(/\bstatus-code=(\d+)/) || [])[1] || 200);
  let data = '';
  const dm = rest.match(/\bdata="((?:\\.|[^"])*)"/);
  if (dm) data = dm[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
  else {
    const du = rest.match(/\bdata=([^\s]+)/);
    if (du) data = du[1];
  }
  return { type, status, data };
}

function mockScriptContent(mock) {
  const contentType = mock.type === 'json' ? 'application/json' : 'text/plain; charset=utf-8';
  return `// Generated from Loon mock-response-body by chance\n$done({status: \"HTTP/1.1 ${mock.status} OK\", headers: {\"Content-Type\": ${JSON.stringify(contentType)}}, body: ${JSON.stringify(mock.data)}});\n`;
}

function rewriteAction(pattern, action, target, ctx) {
  const a = action.trim();
  const lower = a.toLowerCase();
  if (['reject', 'reject-dict', 'reject-array', 'reject-img', 'reject-200'].includes(lower)) {
    if (target === 'qx') return { section: 'rewrite', line: `${pattern} url ${lower === 'reject' ? 'reject-200' : lower}` };
    if (lower === 'reject') return { section: 'url', line: `${pattern} _ reject` };
    if (lower === 'reject-img') return { section: 'map', line: `${pattern} data-type=tiny-gif status-code=200` };
    const body = lower === 'reject-dict' ? '{}' : lower === 'reject-array' ? '[]' : '';
    if (lower === 'reject-200') return { section: 'map', line: `${pattern} data-type=text data="" status-code=200` };
    return { section: 'map', line: `${pattern} data-type=text data=${JSON.stringify(body)} status-code=200 header=${JSON.stringify('Content-Type:application/json')}` };
  }
  if (lower.startsWith('response-body-json-del ')) {
    const jq = minifyJq(jqDelete(a.slice('response-body-json-del '.length)));
    return target === 'qx' ? { section: 'rewrite', line: `${pattern} url jsonjq-response-body ${quoteJq(jq)}` }
      : { section: 'body', line: `http-response-jq ${pattern} ${quoteJq(jq)}` };
  }
  if (lower.startsWith('response-body-json-replace ')) {
    const jq = minifyJq(jqReplace(a.slice('response-body-json-replace '.length)));
    return target === 'qx' ? { section: 'rewrite', line: `${pattern} url jsonjq-response-body ${quoteJq(jq)}` }
      : { section: 'body', line: `http-response-jq ${pattern} ${quoteJq(jq)}` };
  }
  if (lower.startsWith('response-body-json-jq ')) {
    const jq = a.slice('response-body-json-jq '.length).trim();
    return target === 'qx' ? { section: 'rewrite', line: `${pattern} url jsonjq-response-body ${jq}` }
      : { section: 'body', line: `http-response-jq ${pattern} ${jq}` };
  }
  if (lower.startsWith('mock-response-body ')) {
    const mock = parseMock(a.slice('mock-response-body '.length));
    if (target === 'surge') {
      const ct = mock.type === 'json' ? 'Content-Type:application/json' : 'Content-Type:text/plain';
      return { section: 'map', line: `${pattern} data-type=text data=${JSON.stringify(mock.data)} status-code=${mock.status} header=${JSON.stringify(ct)}` };
    }
    const key = crypto.createHash('sha1').update(pattern + a).digest('hex').slice(0, 10);
    const filename = `mock_${key}.js`;
    ctx.generatedScripts.set(filename, mockScriptContent(mock));
    return { section: 'rewrite', line: `${pattern} url script-echo-response ${RAW_BASE}/script/${ctx.id}/${filename}` };
  }
  if (/^(302|307)\s+/.test(a)) {
    const m = a.match(/^(302|307)\s+(.+)$/);
    if (target === 'qx') return { section: 'rewrite', line: `${pattern} url ${m[1]} ${m[2]}` };
    return { section: 'url', line: `${pattern} ${m[2]} ${m[1]}` };
  }
  return { section: 'comment', line: `# Unsupported Loon rewrite preserved: ${pattern} ${action}` };
}

function parseScriptLine(line) {
  const m = line.match(/^(http-request|http-response)\s+(\S+)\s+(.+)$/i);
  if (!m) return null;
  const type = m[1].toLowerCase(), pattern = m[2], rest = m[3];
  const scriptPath = (rest.match(/(?:^|,)\s*script-path=([^,]+)/i) || [])[1]?.trim();
  const tag = (rest.match(/(?:^|,)\s*tag=([^,]+)/i) || [])[1]?.trim();
  const requiresBody = /(?:^|,)\s*requires-body=(?:true|1)/i.test(rest);
  const binary = /(?:^|,)\s*binary-body-mode=(?:true|1)/i.test(rest);
  const timeout = (rest.match(/(?:^|,)\s*timeout=([^,]+)/i) || [])[1]?.trim();
  const maxSize = (rest.match(/(?:^|,)\s*max-size=([^,]+)/i) || [])[1]?.trim();
  const argument = (rest.match(/(?:^|,)\s*argument=([^,]+)/i) || [])[1]?.trim();
  const enable = (rest.match(/(?:^|,)\s*enable=([^,]+)/i) || [])[1]?.trim();
  return { type, pattern, scriptPath, tag, requiresBody, binary, timeout, maxSize, argument, enable, original: line };
}

function argumentDefaults(lines = []) {
  const out = new Map();
  for (const item of sectionItems(lines)) {
    if (!item.line) continue;
    const idx = item.line.indexOf('=');
    if (idx < 0) continue;
    const name = item.line.slice(0, idx).trim();
    const rhs = item.line.slice(idx + 1).trim();
    const tokens = shellTokens(rhs.replace(/,/g, ' '));
    // Loon: switch,true,false / select,"true","false". First value after type is default.
    if (tokens.length >= 2) out.set(name, tokens[1].replace(/^['"]|['"]$/g, ''));
  }
  return out;
}

function resolveArgument(arg, defaults) {
  if (!arg) return null;
  return arg
    .replace(/\[\{([^}]+)\}\]/g, (_, k) => defaults.get(k) ?? '')
    .replace(/\{([^}]+)\}/g, (_, k) => defaults.get(k) ?? '');
}

function sanitizeName(s) {
  return (s || 'script').replace(/[=,\r\n]/g, '_').trim().slice(0, 64) || 'script';
}

function convert(entry, source, scriptMap, stamp = nowCN()) {
  const parsed = parseLoon(source);
  const defaults = argumentDefaults(parsed.sections.get('Argument'));
  const meta = [
    `# Converted: ${stamp}`,
    '# Converted by: chance',
    `# Category: ${entry.category}`,
    `# Source: ${entry.source}`,
  ];
  const header = parsed.header.filter(l => !/^#\s*引用链接:/.test(l));
  while (header.length && !header.at(-1).trim()) header.pop();

  const qx = { filter: [], rewrite: [], mitm: [], notes: [], generatedScripts: new Map() };
  const sg = { rule: [], url: [], map: [], body: [], script: [], mitm: [], notes: [], generatedScripts: new Map() };
  const qctx = { id: entry.id, generatedScripts: qx.generatedScripts, sourceUrl: entry.source, stamp, category: entry.category };
  const sctx = { id: entry.id, generatedScripts: sg.generatedScripts, sourceUrl: entry.source, stamp, category: entry.category };

  // Preserve [Argument] semantics as comments. QX/Surge module arguments are not fabricated.
  if (parsed.sections.has('Argument')) {
    const raw = parsed.sections.get('Argument').filter(x => x.trim());
    qx.notes.push('# Original Loon [Argument] (BoxJs/$prefs bridge required; Review Tier until verified):', ...raw.map(x => x.trim().startsWith('#') ? x : `# ${x}`));
    sg.notes.push('# Original Loon [Argument] (default values are used for conversion):', ...raw.map(x => x.trim().startsWith('#') ? x : `# ${x}`));
  }

  for (const item of sectionItems(parsed.sections.get('Rule'))) {
    const comments = cleanComments(item.comments);
    if (!item.line) { qx.filter.push(...comments); sg.rule.push(...comments); continue; }
    const qr = canonicalQxRule(item.line);
    if (qr.kind === 'filter') qx.filter.push(...comments, qr.line);
    else if (qr.kind === 'rewrite') qx.rewrite.push(...comments, qr.line);
    else qx.filter.push(...comments, qr.line);
    sg.rule.push(...comments, canonicalSurgeRule(item.line));
  }

  for (const item of sectionItems(parsed.sections.get('Rewrite'))) {
    const comments = cleanComments(item.comments);
    if (!item.line) continue;

    const qv2 = rewriteV2Action(item.line, 'qx', qctx);
    const sv2 = rewriteV2Action(item.line, 'surge', sctx);
    let qr, sr;
    if (qv2 || sv2) {
      qr = qv2;
      sr = sv2;
    } else {
      const [pattern, action] = splitPatternAction(item.line);
      qr = rewriteAction(pattern, action, 'qx', qctx);
      sr = rewriteAction(pattern, action, 'surge', sctx);
    }

    const qdest = qr.section === 'rewrite' ? qx.rewrite : qx.notes;
    const sdest = ({url: sg.url, map: sg.map, body: sg.body, script: sg.script})[sr.section] || sg.notes;
    qdest.push(...comments, qr.line);
    sdest.push(...comments, sr.line);
  }

  let scriptIndex = 0;
  for (const item of sectionItems(parsed.sections.get('Script'))) {
    const comments = cleanComments(item.comments);
    if (!item.line) continue;
    const sc = parseScriptLine(item.line);
    if (!sc || !sc.scriptPath) {
      qx.notes.push(...comments, `# Unsupported Loon Script preserved: ${item.line}`);
      sg.notes.push(...comments, `# Unsupported Loon Script preserved: ${item.line}`);
      continue;
    }
    scriptIndex++;
    const mapped = scriptMap.get(sc.scriptPath);
    const qxUrl = mapped?.qx || sc.scriptPath;
    const surgeUrl = mapped?.surge || sc.scriptPath;
    const qxCompat = inspectQxScriptCompatibility({
      scriptUrl: sc.scriptPath,
      sourceText: mapped?.source || '',
      forkUrl: mapped?.qxAdapted ? qxUrl : '',
    });
    qx.rewrite.push(...comments);
    if (sc.tag) qx.rewrite.push(`# ${sc.tag}`);
    if (!qxCompat.executable) {
      qx.rewrite.push(...qxManualPortComment({ scriptUrl: sc.scriptPath, result: qxCompat }));
      qx.rewrite.push(`# Original Loon: ${item.line}`);
    } else {
      const qType = selectQxScriptAction({
        phase: sc.type,
        requiresBody: sc.requiresBody,
        scriptUrl: sc.scriptPath,
        sourceText: mapped?.source || '',
      }).action;
      if (sc.argument && mapped?.qxArgumentBridge) qx.rewrite.push(`# [WayX] BoxJs/$prefs bridge active for argument=${sc.argument}`);
      else if (sc.argument) qx.rewrite.push(`# [WayX] REVIEW REQUIRED: verify BoxJs/$prefs bridge for argument=${sc.argument}`);
      if (sc.enable && mapped?.qxEnableBridge) qx.rewrite.push(`# [WayX] BoxJs/$prefs enable bridge active for enable=${sc.enable}`);
      else if (sc.enable) qx.rewrite.push(`# [WayX] REVIEW REQUIRED: verify QX enable bridge for enable=${sc.enable}`);
      if (sc.argument || sc.enable || sc.binary) qx.rewrite.push(`# Loon script options preserved in source: ${[sc.argument && `argument=${sc.argument}`, sc.enable && `enable=${sc.enable}`, sc.binary && 'binary-body-mode=true'].filter(Boolean).join(', ')}`);
      qx.rewrite.push(`${sc.pattern} url ${qType} ${qxUrl}`);
    }

    const resolvedArg = resolveArgument(sc.argument, defaults);
    const name = sanitizeName(sc.tag || `${entry.id}_${String(scriptIndex).padStart(2, '0')}`);
    const params = [`type=${sc.type}`, `pattern=${sc.pattern}`, `script-path=${surgeUrl}`];
    if (sc.requiresBody) {
      params.push('requires-body=true');
      params.push(`max-size=${sc.maxSize || '-1'}`);
    }
    if (sc.binary) params.push('binary-body-mode=true');
    if (sc.timeout) params.push(`timeout=${sc.timeout}`);
    if (resolvedArg) params.push(`argument=${resolvedArg}`);
    sg.script.push(...comments);
    if (sc.enable) sg.script.push(`# Loon per-script enable option ${sc.enable} uses its declared default in this Surge conversion.`);
    sg.script.push(`${name} = ${params.join(',')}`);
  }

  const mitmLines = parsed.sections.get('MitM') || parsed.sections.get('MITM') || [];
  for (const item of sectionItems(mitmLines)) {
    const comments = cleanComments(item.comments);
    if (!item.line) continue;
    if (/^hostname\s*=/i.test(item.line)) {
      const hosts = item.line.split('=').slice(1).join('=').trim();
      qx.mitm.push(...comments, `hostname = ${hosts}`);
      sg.mitm.push(...comments, `hostname = %APPEND% ${hosts}`);
    } else {
      qx.mitm.push(...comments, `# Unsupported Loon MITM option preserved: ${item.line}`);
      sg.mitm.push(...comments, `# Unsupported Loon MITM option preserved: ${item.line}`);
    }
  }

  const compact = arr => {
    const out = [];
    for (const line of arr) {
      if (line === '' && out.at(-1) === '') continue;
      out.push(line);
    }
    while (out.length && out.at(-1) === '') out.pop();
    return out;
  };

  const qxOut = [
    ...header, ...meta, '# Target: Quantumult X', '',
    ...(qx.notes.length ? [...qx.notes, ''] : []),
    '# [filter_local]', ...compact(qx.filter), '',
    '# [rewrite_local]', ...compact(qx.rewrite), '',
    '# [mitm]', ...compact(qx.mitm), ''
  ].join('\n');

  const surgeSections = [];
  if (sg.notes.length) surgeSections.push(...sg.notes, '');
  if (sg.rule.length) surgeSections.push('[Rule]', ...compact(sg.rule), '');
  if (sg.url.length) surgeSections.push('[URL Rewrite]', ...compact(sg.url), '');
  if (sg.body.length) surgeSections.push('[Body Rewrite]', ...compact(sg.body), '');
  if (sg.map.length) surgeSections.push('[Map Local]', ...compact(sg.map), '');
  if (sg.script.length) surgeSections.push('[Script]', ...compact(sg.script), '');
  if (sg.mitm.length) surgeSections.push('[MITM]', ...compact(sg.mitm), '');
  const sgOut = [...header, ...meta, '# Target: Surge', '', ...surgeSections].join('\n').replace(/\n*$/, '\n');

  return { qx: qxOut.replace(/\n*$/, '\n'), surge: sgOut, generatedScripts: new Map([...qx.generatedScripts, ...sg.generatedScripts]) };
}

function convertedScriptMeta(entry, target, sourceUrl, stamp) {
  return [
    `// Converted: ${stamp}`,
    '// Converted by: chance',
    `// Category: ${entry.category}`,
    `// Target: ${target}`,
    `// Source: ${sourceUrl}`,
    '',
  ].join('\n');
}

async function writeAdaptedScript(dest, entry, target, sourceUrl, body) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const normalizedBody = normalizeNewlines(body).replace(/^\/\/ Converted:.*\n\/\/ Converted by: chance\n\/\/ Category:.*\n\/\/ Target:.*\n\/\/ Source:.*\n\n/, '').replace(/\n*$/, '\n');
  const old = await exists(dest) ? normalizeNewlines(await fs.readFile(dest, 'utf8')) : null;
  const oldStamp = (old?.match(/^\/\/ Converted:\s*(.+)$/m) || [])[1] || null;
  const candidate = convertedScriptMeta(entry, target, sourceUrl, oldStamp || nowCN()) + normalizedBody;
  if (old === candidate) return false;
  const output = convertedScriptMeta(entry, target, sourceUrl, nowCN()) + normalizedBody;
  await fs.writeFile(dest, output);
  return true;
}

function adaptSurgeScript(entry, source) {
  if (entry.id !== 'DianPing') return source;
  const out = source
    .replace('$done({body: "", headers: "", status: "HTTP/1.1 404 Not Found"});', '$done({body: "", headers: {}, status: 404});')
    .replace('$done({bodyBytes: hexStringToArrayBuffer(hexString),headers: header, status: "HTTP/1.1 200 OK"});', '$done({body: new Uint8Array(hexStringToArrayBuffer(hexString)), headers: header, status: 200});');
  if (/bodyBytes\s*:/.test(out) || /status\s*:\s*["']HTTP\/1\.1/.test(out)) {
    throw new Error(`${entry.id}: Surge script adapter could not remove Quantumult X-only response fields`);
  }
  return out;
}

function adaptDianPingQX(entry, source, defaults) {
  if (entry.id !== 'DianPing') return source;
  const fallback = String(defaults.get('davsdmpk_enable') ?? 'true').trim().toLowerCase() === 'false' ? 'false' : 'true';
  const key = 'wayx.dianping.davsdmpk_enable';
  return [
    '// WayX BoxJs -> Quantumult X $prefs enable bridge',
    '// Converted by: chance',
    `const __wayxEnabledValue = $prefs.valueForKey(${JSON.stringify(key)});`,
    `const __wayxEnabled = String(__wayxEnabledValue === null || __wayxEnabledValue === undefined ? ${JSON.stringify(fallback)} : __wayxEnabledValue).toLowerCase() === "true";`,
    'if (!__wayxEnabled) {',
    '  $done({});',
    '} else {',
    source,
    '}',
    '',
  ].join('\n');
}

function adaptTiebaQX(entry, source, argumentLines = []) {
  if (entry.id !== 'Tieba') return source;
  if (!/\$argument\b/.test(source)) throw new Error(`${entry.id}: expected $argument usage was not found in tieba-proto.js`);
  if (/\b(?:const|let|var)\s+\$argument\b/.test(source)) throw new Error(`${entry.id}: source declares $argument; automatic QX bridge would collide`);

  const bridge = renderQxPrefsObjectBridge(
    entry.id,
    argumentLines,
    ['per_filter_video_thread'],
    { per_filter_video_thread: 'boolean' },
  );
  return bridge + source;
}

async function adaptPinDuoDuoCommon(entry, source) {
  if (entry.id !== 'PinDuoDuo') return source;
  const re = /https:\/\/kelee\.one\/Resource\/JavaScript\/PinDuoDuo\/[^"'\s]+\.js/g;
  const urls = [...new Set(source.match(re) || [])];
  let out = source;
  for (const runtimeUrl of urls) {
    const filename = decodeURIComponent(new URL(runtimeUrl).pathname.split('/').pop());
    const { text } = await fetchWithFallback(runtimeUrl);
    const nested = normalizeNewlines(text).replace(/\n*$/, '\n');
    const dest = path.join(SCRIPT_DIR, entry.id, filename);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    if (!await exists(dest) || normalizeNewlines(await fs.readFile(dest, 'utf8')) !== nested) await fs.writeFile(dest, nested);
    out = out.split(runtimeUrl).join(`${RAW_BASE}/script/${entry.id}/${encodeURIComponent(filename)}`);
  }
  if (/https:\/\/kelee\.one\/Resource\/JavaScript\/PinDuoDuo\//.test(out)) {
    throw new Error(`${entry.id}: unresolved Kelee runtime dependency remains in converted script`);
  }
  return out;
}

async function syncScript(entry, url, defaults = new Map(), argumentLines = []) {
  const filename = decodeURIComponent(new URL(url).pathname.split('/').pop() || `${entry.id}.js`);
  const destDir = path.join(SCRIPT_DIR, entry.id);
  await fs.mkdir(destDir, { recursive: true });
  const { text } = await fetchWithFallback(url);
  const normalized = normalizeNewlines(text).replace(/\n*$/, '\n');

  // Keep an exact upstream script copy when the common runtime script itself needs conversion.
  const sourceDest = entry.id === 'PinDuoDuo' ? path.join(destDir, 'Source', filename) : path.join(destDir, filename);
  await fs.mkdir(path.dirname(sourceDest), { recursive: true });
  if (!await exists(sourceDest) || normalizeNewlines(await fs.readFile(sourceDest, 'utf8')) !== normalized) await fs.writeFile(sourceDest, normalized);

  let qxPath = sourceDest;
  let surgePath = sourceDest;

  if (entry.id === 'Tieba') {
    const qxDest = path.join(destDir, 'QuantumultX', filename);
    await writeAdaptedScript(qxDest, entry, 'Quantumult X', url, adaptTiebaQX(entry, normalized, argumentLines));
    qxPath = qxDest;
  }

  if (entry.id === 'DianPing') {
    const qxDest = path.join(destDir, 'QuantumultX', filename);
    const surgeDest = path.join(destDir, 'Surge', filename);
    await writeAdaptedScript(qxDest, entry, 'Quantumult X', url, adaptDianPingQX(entry, normalized, defaults));
    await writeAdaptedScript(surgeDest, entry, 'Surge', url, adaptSurgeScript(entry, normalized));
    qxPath = qxDest;
    surgePath = surgeDest;
  }

  if (entry.id === 'PinDuoDuo') {
    const commonDest = path.join(destDir, filename);
    const adapted = await adaptPinDuoDuoCommon(entry, normalized);
    await writeAdaptedScript(commonDest, entry, 'Quantumult X / Surge', url, adapted);
    qxPath = commonDest;
    surgePath = commonDest;
  }

  const toRaw = file => `${RAW_BASE}/${path.relative(ROOT, file).split(path.sep).map(encodeURIComponent).join('/')}`;
  return { qx: toRaw(qxPath), surge: toRaw(surgePath), source: normalized, qxAdapted: qxPath !== sourceDest, qxArgumentBridge: entry.id === 'Tieba', qxEnableBridge: entry.id === 'DianPing' };
}

function scriptUrls(source) {
  return [...new Set([...source.matchAll(/script-path=([^,\s]+)/gi)].map(m => m[1].trim()))];
}

function validateQX(text, entry) {
  const activeSections = text.split('\n').filter(l => /^\[(filter_local|rewrite_local|mitm)\]$/i.test(l.trim()));
  if (activeSections.length) throw new Error(`${entry.id}: Quantumult X section headings must be commented`);
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^(?:ip-cidr|ip6-cidr|geoip|ip-asn),/i.test(line) && /,\s*no-resolve(?:,|$)/i.test(line)) {
      throw new Error(`${entry.id}: Quantumult X IP-class rules must remove no-resolve`);
    }
  }
  for (const bad of ['response-body-json-del', 'response-body-json-replace', 'response-body-json-jq', 'mock-response-body']) {
    const active = text.split('\n').find(l => l.trim() && !l.trim().startsWith('#') && l.includes(bad));
    if (active) throw new Error(`${entry.id}: unconverted QX token ${bad}`);
  }
  if (!text.includes('# [rewrite_local]') || !text.includes('# [mitm]') || !text.includes('# [filter_local]')) throw new Error(`${entry.id}: missing commented QX headings`);
}

function validateSurge(text, entry) {
  const allowed = new Set(['Rule','URL Rewrite','Body Rewrite','Map Local','Script','MITM']);
  for (const m of text.matchAll(/^\[([^\]]+)\]$/gm)) if (!allowed.has(m[1])) throw new Error(`${entry.id}: unsupported Surge section [${m[1]}]`);
  for (const line of text.split('\n')) {
    const m = line.match(/^hostname\s*=\s*(.+)$/i);
    if (m && !m[1].trim().startsWith('%APPEND%')) throw new Error(`${entry.id}: Surge module MITM hostname must use %APPEND%`);
  }
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
  await Promise.all([RESOURCE_DIR, TARGET_ROOT, SCRIPT_DIR].map(d => fs.mkdir(d, { recursive: true })));
  const failures = [];
  const generatedBoxJsApps = [];
  for (const entry of manifest) {
    try {
      console.log(`\n== ${entry.id} ==`);
      const { text, fetchedFrom } = await fetchWithFallback(entry.source);
      const source = cleanSource(text);
      if (!/^#!name=/m.test(source) || !/^\[[^\]]+\]/m.test(source)) throw new Error('downloaded content is not a valid Loon plugin');
      const sourcePath = path.join(RESOURCE_DIR, entry.file);
      const old = await exists(sourcePath) ? normalizeNewlines(await fs.readFile(sourcePath, 'utf8')) : null;
      const changed = old !== source;
      if (changed) await fs.writeFile(sourcePath, source);
      console.log(`${changed ? 'updated' : 'unchanged'} source via ${fetchedFrom}; sha256=${sha256(source).slice(0, 12)}`);

      const scriptMap = new Map();
      const parsedSource = parseLoon(source);
      const argumentLines = parsedSource.sections.get('Argument') || [];
      const sourceDefaults = argumentDefaults(argumentLines);
      for (const url of scriptUrls(source)) {
        scriptMap.set(url, await syncScript(entry, url, sourceDefaults, argumentLines));
      }

      // Only publish BoxJs controls once the corresponding QX bridge is functional.
      if (['Tieba', 'DianPing'].includes(entry.id) && argumentLines.length) {
        const displayName = (source.match(/^#!name\s*=\s*(.+)$/m) || [])[1]?.trim() || entry.id;
        generatedBoxJsApps.push(renderBoxJsApp({ ...entry, name: displayName }, argumentLines));
      }

      const qxPath = path.join(ROOT, qxTargetPath(entry));
      const sgPath = path.join(ROOT, surgeTargetPath(entry));
      await Promise.all([
        path.dirname(qxPath),
        path.dirname(sgPath),
      ].map(d => fs.mkdir(d, { recursive: true })));
      const qxExists = await exists(qxPath);
      const sgExists = await exists(sgPath);
      const oldQx = qxExists ? normalizeNewlines(await fs.readFile(qxPath, 'utf8')) : null;
      const oldSg = sgExists ? normalizeNewlines(await fs.readFile(sgPath, 'utf8')) : null;
      const oldStamp = (oldQx?.match(/^# Converted:\s*(.+)$/m) || [])[1] || null;
      let stamp = changed || !oldStamp ? nowCN() : oldStamp;
      let out = convert(entry, source, scriptMap, stamp);

      // Converter changes must also refresh outputs even when upstream LPX is unchanged.
      // Preserve the old conversion timestamp only if the generated content is actually identical.
      if (!changed && oldStamp && ((oldQx && oldQx !== out.qx) || (oldSg && oldSg !== out.surge))) {
        stamp = nowCN();
        out = convert(entry, source, scriptMap, stamp);
      }

      for (const [file, content] of out.generatedScripts) {
        const dir = path.join(SCRIPT_DIR, entry.id);
        await fs.mkdir(dir, { recursive: true });
        const dest = path.join(dir, file);
        if (!await exists(dest) || normalizeNewlines(await fs.readFile(dest, 'utf8')) !== content) await fs.writeFile(dest, content);
      }
      validateQX(out.qx, entry);
      validateSurge(out.surge, entry);
      let outputChanged = false;
      if (oldQx !== out.qx) { await fs.writeFile(qxPath, out.qx); outputChanged = true; }
      if (oldSg !== out.surge) { await fs.writeFile(sgPath, out.surge); outputChanged = true; }
      console.log(outputChanged ? `converted -> ${path.relative(ROOT, qxPath)}, ${path.relative(ROOT, sgPath)}` : 'conversion verified: outputs unchanged');
    } catch (e) {
      failures.push(`${entry.id}: ${e.stack || e.message}`);
      console.error(`::error title=${entry.id}::${String(e.message).replaceAll('\n', '%0A')}`);
    }
  }
  if (!failures.length && generatedBoxJsApps.length) {
    const boxJsPath = path.join(ROOT, BOXJS_SUBSCRIPTION);
    const current = JSON.parse(await fs.readFile(boxJsPath, 'utf8'));
    const merged = mergeBoxJsSubscription(current, generatedBoxJsApps);
    const next = JSON.stringify(merged, null, 2) + '\n';
    const previous = normalizeNewlines(await fs.readFile(boxJsPath, 'utf8'));
    if (previous !== next) {
      await fs.writeFile(boxJsPath, next);
      console.log(`BoxJs updated -> ${path.relative(ROOT, boxJsPath)}`);
    }
  }

  if (failures.length) {
    console.error('\nFailures:\n' + failures.join('\n\n'));
    process.exitCode = 1;
  }
}

await main();