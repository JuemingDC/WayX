import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { qxRule as canonicalQxRule, surgeModuleRule } from '../../converter/src/rule.mjs';
import { selectQxScriptAction } from '../../converter/src/script.mjs';
import { inspectQxScriptCompatibility, qxManualPortComment } from '../../converter/src/script-compat.mjs';
import { minifyJq, minifyJqFile } from '../../converter/src/jq.mjs';
import { qxTargetPath, surgeTargetPath } from '../../converter/src/paths.mjs';
import { analyzeSafeRewriteV2 } from '../../converter/src/rewrite-v2-safe.mjs';
import { isRewriteV2, parseRewriteV2 } from '../../converter/src/rewrite-v2.mjs';
import { validateRewriteV2Ast } from '../../converter/src/rewrite-v2-actions.mjs';
import { inlineResolvedDependency, jqDependencySpecFromAction, qxMockPlanFromAction } from '../../converter/src/dependency.mjs';
import { renderQxMockFileScript } from '../../converter/src/qx-mock.mjs';
import { qxDirectRewritePlan, surgeDirectRewritePlan, surgeRedirectRewritePlan, surgeRejectRewritePlan, surgeHeaderRewritePlan, surgeInlineMockPlan, simpleUrlRewriteCondition } from '../../converter/src/rewrite-v2-semantic.mjs';
import { renderQxRedirectScript, renderQxRejectScript, renderQxHeaderScript, renderQxInlineMockScript } from '../../converter/src/qx-semantic-script.mjs';
import { isScriptV2, parseScriptV2 } from '../../converter/src/script-v2.mjs';
import { qxScriptV2Plan, surgeScriptV2Plan } from '../../converter/src/script-v2-target.mjs';
import { hasActiveSurgeLines, renderSurgeModuleHeader, validateSurgeModule } from '../../converter/src/surge-module.mjs';
import { renderQxSnippetHeader } from '../../converter/src/metadata.mjs';

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

async function fetchBytes(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': '*/*' }, redirect: 'follow', signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!bytes.length) throw new Error('empty response');
    return bytes;
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

async function fetchBytesWithFallback(url) {
  const errors = [];
  for (const candidate of candidates(url)) {
    try { return { bytes: await fetchBytes(candidate), fetchedFrom: candidate }; }
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

  let ast;
  try {
    ast = parseRewriteV2(line);
    validateRewriteV2Ast(ast);
  } catch (error) {
    return { section: 'comment', line: `# Unsupported Loon Rewrite v2 preserved (${String(error?.message || error).split('\n')[0]}): ${line}` };
  }

  try {
    if (ast.actions.length === 1) {
      const jqSpec = jqDependencySpecFromAction(ast.actions[0], { pluginSourceUrl: ctx.sourceUrl });
      if (jqSpec) {
        const materialized = ctx.jqFiles?.get(line);
        if (!materialized) throw new Error('JQ dependency was not materialized during conversion');
        if (materialized.error) throw new Error(materialized.error);
        const inlined = inlineResolvedDependency(ast.actions[0], materialized.content, { pluginSourceUrl: ctx.sourceUrl });
        ast = { ...ast, actions: [inlined.action] };
        validateRewriteV2Ast(ast);
      }
    }
  } catch (error) {
    return { section: 'comment', line: `# Unsupported Loon Rewrite v2 preserved (${String(error?.message || error).split('\n')[0]}): ${line}` };
  }

  if (target === 'qx') {
    // mock_file requires conversion-time dependency materialization.
    if (ast.actions.length === 1 && /^(?:request|response)\.body\.mock_file$/.test(ast.actions[0].name)) {
      try {
        const condition = simpleUrlRewriteCondition(ast);
        if (!condition.ok) throw new Error(condition.reason);
        const plan = qxMockPlanFromAction(ast.actions[0], { pluginSourceUrl: ctx.sourceUrl });
        const materialized = ctx.mockFiles?.get(line);
        if (!materialized) throw new Error('mock_file was not materialized during conversion');
        if (materialized.error) throw new Error(materialized.error);
        const key = crypto.createHash('sha1').update('mock-file\0' + line).digest('hex').slice(0, 10);
        const filename = `mock_file_${key}.js`;
        const script = renderQxMockFileScript(plan, {
          ...materialized,
          stamp: ctx.stamp,
          category: ctx.category,
          sourceLine: line,
        });
        ctx.generatedScripts.set(filename, script);
        return { section: 'rewrite', line: `${condition.pattern} url ${plan.qxAction} ${RAW_BASE}/script/${ctx.id}/${filename}` };
      } catch (error) {
        return { section: 'comment', line: `# Unsupported Loon Rewrite v2 preserved (${String(error?.message || error).split('\n')[0]}): ${line}` };
      }
    }

    // Inline body.mock, including Loon's mock + response-header pipeline,
    // becomes one QX script so mock-before-upstream and action ordering are kept.
    if (ast.actions.some(a => /^(?:request|response)\.body\.mock$/.test(a.name))) {
      try {
        const plan = renderQxInlineMockScript(ast, { stamp: ctx.stamp, category: ctx.category, sourceLine: line });
        const key = crypto.createHash('sha1').update('mock-inline\0' + line).digest('hex').slice(0, 10);
        const filename = `mock_${key}.js`;
        ctx.generatedScripts.set(filename, plan.script);
        return { section: 'rewrite', line: `${plan.pattern} url ${plan.qxAction} ${RAW_BASE}/script/${ctx.id}/${filename}` };
      } catch (error) {
        return { section: 'comment', line: `# Unsupported Loon Rewrite v2 preserved (${String(error?.message || error).split('\n')[0]}): ${line}` };
      }
    }

    // Prefer a native QX primitive when its observable behavior is equivalent.
    try {
      const direct = qxDirectRewritePlan(ast);
      if (direct.ok) return { section: direct.section, line: direct.line };
    } catch (error) {
      return { section: 'comment', line: `# Unsupported Loon Rewrite v2 preserved (${String(error?.message || error).split('\n')[0]}): ${line}` };
    }

    // URL redirect in Loon replaces only the matched range. Use a generated
    // echo-response script so capture/template behavior does not depend on an
    // undocumented QX 302 replacement contract.
    if (ast.actions.length === 1 && ast.actions[0].name === 'redirect') {
      try {
        const plan = renderQxRedirectScript(ast, { stamp: ctx.stamp, category: ctx.category, sourceLine: line });
        const key = crypto.createHash('sha1').update('redirect\0' + line).digest('hex').slice(0, 10);
        const filename = `redirect_${key}.js`;
        ctx.generatedScripts.set(filename, plan.script);
        return { section: 'rewrite', line: `${plan.pattern} url ${plan.qxAction} ${RAW_BASE}/script/${ctx.id}/${filename}` };
      } catch (error) {
        return { section: 'comment', line: `# Unsupported Loon Rewrite v2 preserved (${String(error?.message || error).split('\n')[0]}): ${line}` };
      }
    }

    // Use a generated response only when QX has no exact native reject primitive.
    if (ast.actions.length === 1 && /^(?:reject|reject_dict|reject_array)$/.test(ast.actions[0].name)) {
      try {
        const plan = renderQxRejectScript(ast, { stamp: ctx.stamp, category: ctx.category, sourceLine: line });
        const key = crypto.createHash('sha1').update('reject\0' + line).digest('hex').slice(0, 10);
        const filename = `reject_${key}.js`;
        ctx.generatedScripts.set(filename, plan.script);
        return { section: 'rewrite', line: `${plan.pattern} url ${plan.qxAction} ${RAW_BASE}/script/${ctx.id}/${filename}` };
      } catch (error) {
        return { section: 'comment', line: `# Unsupported Loon Rewrite v2 preserved (${String(error?.message || error).split('\n')[0]}): ${line}` };
      }
    }

    // Header set/del/replace pipelines are kept in one QX script to preserve
    // Loon's left-to-right action order. header.add remains fail-closed because
    // QX's documented header object cannot represent duplicate header fields.
    if (ast.actions.length && ast.actions.every(a => new RegExp('^' + ast.phase + '\\.header\\.(?:set|del|replace)$').test(a.name))) {
      try {
        const plan = renderQxHeaderScript(ast, { stamp: ctx.stamp, category: ctx.category, sourceLine: line });
        const key = crypto.createHash('sha1').update('header\0' + line).digest('hex').slice(0, 10);
        const filename = `header_${key}.js`;
        ctx.generatedScripts.set(filename, plan.script);
        return { section: 'rewrite', line: `${plan.pattern} url ${plan.qxAction} ${RAW_BASE}/script/${ctx.id}/${filename}` };
      } catch (error) {
        return { section: 'comment', line: `# Unsupported Loon Rewrite v2 preserved (${String(error?.message || error).split('\n')[0]}): ${line}` };
      }
    }
  }

  if (target === 'surge') {
    try {
      for (const mapper of [surgeInlineMockPlan, surgeHeaderRewritePlan, surgeDirectRewritePlan, surgeRedirectRewritePlan, surgeRejectRewritePlan]) {
        const mapped = mapper(ast);
        if (mapped.ok) return { section: mapped.section, line: mapped.line, lines: mapped.lines };
      }
    } catch (error) {
      return { section: 'comment', line: `# Unsupported Loon Rewrite v2 preserved (${String(error?.message || error).split('\n')[0]}): ${line}` };
    }
  }

  // Keep the older conservative subset as a final compatibility fallback.
  const parsed = analyzeSafeRewriteV2(line);
  if (!parsed.safe) {
    return { section: 'comment', line: `# Unsupported Loon Rewrite v2 preserved (${parsed.reason}): ${line}` };
  }
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

async function materializeQxMockFiles(entry, parsed) {
  const out = new Map();
  for (const item of sectionItems(parsed.sections.get('Rewrite'))) {
    if (!item.line || !isRewriteV2(item.line)) continue;
    try {
      const ast = parseRewriteV2(item.line);
      validateRewriteV2Ast(ast);
      if (ast.actions.length !== 1 || !/^(?:request|response)\.body\.mock_file$/.test(ast.actions[0].name)) continue;
      const condition = simpleUrlRewriteCondition(ast);
      if (!condition.ok) continue;

      const plan = qxMockPlanFromAction(ast.actions[0], { pluginSourceUrl: entry.source });
      if (plan.phase === 'request' && (plan.binary || plan.base64)) {
        out.set(item.line, { error: 'Quantumult X request mock_file binary/bodyBytes output is not enabled without an official request-body example' });
        continue;
      }

      if (plan.base64) {
        const { text } = await fetchWithFallback(plan.url);
        const compact = text.replace(/\s+/g, '');
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 === 1) throw new Error('invalid Base64 mock_file content');
        out.set(item.line, { bodyBase64: Buffer.from(compact, 'base64').toString('base64'), sourceFile: plan.url });
      } else if (plan.binary) {
        const { bytes } = await fetchBytesWithFallback(plan.url);
        out.set(item.line, { bodyBase64: bytes.toString('base64'), sourceFile: plan.url });
      } else {
        const { text } = await fetchWithFallback(plan.url);
        out.set(item.line, { bodyText: text, sourceFile: plan.url });
      }
    } catch (error) {
      out.set(item.line, { error: String(error?.message || error).split('\n')[0] });
    }
  }
  return out;
}

async function materializeJqFiles(entry, parsed) {
  const out = new Map();
  for (const item of sectionItems(parsed.sections.get('Rewrite'))) {
    if (!item.line || !isRewriteV2(item.line)) continue;
    try {
      const ast = parseRewriteV2(item.line);
      validateRewriteV2Ast(ast);
      if (ast.actions.length !== 1) continue;
      const spec = jqDependencySpecFromAction(ast.actions[0], { pluginSourceUrl: entry.source });
      if (!spec) continue;
      if (!spec.resolvable || !spec.url) throw new Error(spec.reason || 'JQ dependency is not resolvable');
      const { text } = await fetchWithFallback(spec.url);
      out.set(item.line, {
        content: minifyJqFile(text),
        sourceFile: spec.url,
        legacyAlias: Boolean(spec.legacyAlias),
      });
    } catch (error) {
      out.set(item.line, { error: String(error?.message || error).split('\n')[0] });
    }
  }
  return out;
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
  return { section: 'comment', line: `# Unsupported source rewrite preserved: ${pattern} ${action}` };
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

function sanitizeName(s) {
  return (s || 'script').replace(/[=,\r\n]/g, '_').trim().slice(0, 64) || 'script';
}

function convert(entry, source, scriptMap, stamp = nowCN(), qxMockFiles = new Map(), jqFiles = new Map()) {
  const parsed = parseLoon(source);
  const sourceHeader = parsed.header.filter(l => !/^#\s*引用链接:/.test(l));
  const qxHeader = renderQxSnippetHeader(sourceHeader, entry, stamp);

  const qx = { filter: [], rewrite: [], mitm: [], notes: [], generatedScripts: new Map() };
  const sg = { rule: [], url: [], header: [], map: [], body: [], script: [], mitm: [], notes: [], generatedScripts: new Map() };
  const qctx = { id: entry.id, generatedScripts: qx.generatedScripts, sourceUrl: entry.source, stamp, category: entry.category, mockFiles: qxMockFiles, jqFiles };
  const sctx = { id: entry.id, generatedScripts: sg.generatedScripts, sourceUrl: entry.source, stamp, category: entry.category, jqFiles };

  // Preserve [Argument] semantics as comments. QX/Surge module arguments are not fabricated.
  if (parsed.sections.has('Argument')) {
    const raw = parsed.sections.get('Argument').filter(x => x.trim());
    qx.notes.push('# Source [Argument] (BoxJs/$prefs bridge required; Review Tier until verified):', ...raw.map(x => x.trim().startsWith('#') ? x : `# ${x}`));
    sg.notes.push('# Source [Argument] (declaration-only conversion; typed/dynamic arguments stay Review):', ...raw.map(x => x.trim().startsWith('#') ? x : `# ${x}`));
  }

  for (const item of sectionItems(parsed.sections.get('Rule'))) {
    const comments = cleanComments(item.comments);
    if (!item.line) { qx.filter.push(...comments); sg.rule.push(...comments); continue; }
    const qr = canonicalQxRule(item.line);
    if (qr.kind === 'filter') qx.filter.push(...comments, qr.line);
    else if (qr.kind === 'rewrite') qx.rewrite.push(...comments, qr.line);
    else qx.filter.push(...comments, qr.line);
    const sr = surgeModuleRule(item.line);
    sg.rule.push(...comments, ...sr.lines);
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
    const sdest = ({url: sg.url, header: sg.header, map: sg.map, body: sg.body, script: sg.script})[sr.section] || sg.notes;
    qdest.push(...comments, qr.line);
    sdest.push(...comments, ...(sr.lines || [sr.line]));
  }

  let scriptIndex = 0;
  for (const item of sectionItems(parsed.sections.get('Script'))) {
    const comments = cleanComments(item.comments);
    if (!item.line) continue;

    if (isScriptV2(item.line)) {
      scriptIndex++;
      let ast;
      try {
        ast = parseScriptV2(item.line);
      } catch (error) {
        qx.notes.push(...comments, `# Unsupported source Script v2 preserved (${String(error?.message || error).split('\n')[0]}): ${item.line}`);
        sg.notes.push(...comments, `# Unsupported source Script v2 preserved (${String(error?.message || error).split('\n')[0]}): ${item.line}`);
        continue;
      }

      const mapped = scriptMap.get(ast.script.path);
      const sourceText = mapped?.source || '';
      const qxUrl = mapped?.qx || ast.script.path;
      const surgeUrl = mapped?.surge || ast.script.path;
      const qxCompat = inspectQxScriptCompatibility({
        scriptUrl: ast.script.path,
        sourceText,
        forkUrl: '',
      });

      qx.rewrite.push(...comments);
      if (!qxCompat.executable) {
        qx.rewrite.push(...qxManualPortComment({ scriptUrl: ast.script.path, result: qxCompat }));
        qx.rewrite.push(`# Source declaration: ${item.line}`);
      } else {
        const qxPlan = qxScriptV2Plan(ast, { scriptUrl: qxUrl, sourceText });
        if (!qxPlan.ok) {
          qx.rewrite.push(`# [WayX] SCRIPT V2 REVIEW REQUIRED: ${qxPlan.reason}`);
          qx.rewrite.push(`# Source declaration: ${item.line}`);
        } else if (qxPlan.disabled) {
          qx.rewrite.push(`# [WayX] Script disabled by source option: ${item.line}`);
        } else {
          if (qxPlan.tag) qx.rewrite.push(`# ${qxPlan.tag}`);
          if (qxPlan.binaryBodyMode) qx.rewrite.push('# [WayX] Source binary_body_mode=true; script source is preserved unchanged.');
          for (const note of qxPlan.notes || []) qx.rewrite.push(`# [WayX] ${note}`);
          qx.rewrite.push(qxPlan.line);
        }
      }

      const name = sanitizeName((ast.options.find(x => x.name === 'tag')?.value?.value) || `${entry.id}_${String(scriptIndex).padStart(2, '0')}`);
      const surgePlan = surgeScriptV2Plan(ast, { scriptUrl: surgeUrl, name });
      sg.script.push(...comments);
      if (!surgePlan.ok) {
        sg.script.push(`# [WayX] SCRIPT V2 REVIEW REQUIRED: ${surgePlan.reason}`);
        sg.script.push(`# Source declaration: ${item.line}`);
      } else if (surgePlan.disabled) {
        sg.script.push(`# [WayX] Script disabled by source option: ${item.line}`);
      } else {
        sg.script.push(surgePlan.line);
      }
      continue;
    }

    const sc = parseScriptLine(item.line);
    if (!sc || !sc.scriptPath) {
      qx.notes.push(...comments, `# Unsupported source Script preserved: ${item.line}`);
      sg.notes.push(...comments, `# Unsupported source Script preserved: ${item.line}`);
      continue;
    }
    scriptIndex++;
    const mapped = scriptMap.get(sc.scriptPath);
    const qxUrl = mapped?.qx || sc.scriptPath;
    const surgeUrl = mapped?.surge || sc.scriptPath;
    const qxCompat = inspectQxScriptCompatibility({
      scriptUrl: sc.scriptPath,
      sourceText: mapped?.source || '',
      forkUrl: '',
    });

    const enableFixed = sc.enable ? String(sc.enable).trim().toLowerCase() : '';
    const enableDynamic = Boolean(sc.enable) && !['true','false','1','0'].includes(enableFixed);

    qx.rewrite.push(...comments);
    if (sc.tag) qx.rewrite.push(`# ${sc.tag}`);
    if (!qxCompat.executable) {
      qx.rewrite.push(...qxManualPortComment({ scriptUrl: sc.scriptPath, result: qxCompat }));
      qx.rewrite.push(`# Source declaration: ${item.line}`);
    } else if (enableFixed === 'false' || enableFixed === '0') {
      qx.rewrite.push(`# [WayX] Script disabled by source declaration: ${item.line}`);
    } else if (sc.argument || enableDynamic) {
      qx.rewrite.push('# [WayX] SCRIPT REVIEW REQUIRED: QX declaration cannot carry this source argument/enable semantics without changing the script.');
      qx.rewrite.push(`# Source declaration: ${item.line}`);
    } else {
      const qType = selectQxScriptAction({
        phase: sc.type,
        requiresBody: sc.requiresBody,
        scriptUrl: sc.scriptPath,
        sourceText: mapped?.source || '',
      }).action;
      qx.rewrite.push(`${sc.pattern} url ${qType} ${qxUrl}`);
    }

    const name = sanitizeName(sc.tag || `${entry.id}_${String(scriptIndex).padStart(2, '0')}`);
    sg.script.push(...comments);
    if (enableFixed === 'false' || enableFixed === '0') {
      sg.script.push(`# [WayX] Script disabled by source declaration: ${item.line}`);
    } else if (enableDynamic) {
      sg.script.push('# [WayX] SCRIPT REVIEW REQUIRED: dynamic source enable has no verified Surge declaration equivalent.');
      sg.script.push(`# Source declaration: ${item.line}`);
    } else if (sc.argument && /[\[{]\{?[^}\]]+\}?[\]}]/.test(sc.argument)) {
      sg.script.push('# [WayX] SCRIPT REVIEW REQUIRED: dynamic/typed source argument is not converted because script source must remain unchanged.');
      sg.script.push(`# Source declaration: ${item.line}`);
    } else {
      const params = [`type=${sc.type}`, `pattern=${sc.pattern}`, `script-path=${surgeUrl}`];
      if (sc.requiresBody) {
        params.push('requires-body=true');
        params.push(`max-size=${sc.maxSize || '-1'}`);
      }
      if (sc.binary) params.push('binary-body-mode=true');
      if (sc.timeout) params.push(`timeout=${sc.timeout}`);
      if (sc.argument) params.push(`argument=${sc.argument}`);
      sg.script.push(`${name} = ${params.join(',')}`);
    }
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
      qx.mitm.push(...comments, `# Unsupported source MITM option preserved: ${item.line}`);
      sg.mitm.push(...comments, `# Unsupported source MITM option preserved: ${item.line}`);
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
    ...qxHeader, '',
    ...(qx.notes.length ? [...qx.notes, ''] : []),
    '# [filter_local]', ...compact(qx.filter), '',
    '# [rewrite_local]', ...compact(qx.rewrite), '',
    '# [mitm]', ...compact(qx.mitm), ''
  ].join('\n');

  const surgeSections = [];
  if (sg.notes.length) surgeSections.push(...sg.notes, '');
  if (sg.rule.length) surgeSections.push('[Rule]', ...compact(sg.rule), '');
  if (sg.url.length) surgeSections.push('[URL Rewrite]', ...compact(sg.url), '');
  if (sg.header.length) surgeSections.push('[Header Rewrite]', ...compact(sg.header), '');
  if (sg.body.length) surgeSections.push('[Body Rewrite]', ...compact(sg.body), '');
  if (sg.map.length) surgeSections.push('[Map Local]', ...compact(sg.map), '');
  if (sg.script.length) surgeSections.push('[Script]', ...compact(sg.script), '');
  if (sg.mitm.length) surgeSections.push('[MITM]', ...compact(sg.mitm), '');

  const needsCore20 = hasActiveSurgeLines(sg.body) || hasActiveSurgeLines(sg.map);
  const surgeHeader = renderSurgeModuleHeader(parsed.header, entry, stamp, { needsCore20 });
  const sgOut = [...surgeHeader, '', ...surgeSections].join('\n').replace(/\n*$/, '\n');

  return { qx: qxOut.replace(/\n*$/, '\n'), surge: sgOut, generatedScripts: new Map([...qx.generatedScripts, ...sg.generatedScripts]) };

}

async function syncScript(entry, url) {
  const filename = decodeURIComponent(new URL(url).pathname.split('/').pop() || `${entry.id}.js`);
  const destDir = path.join(SCRIPT_DIR, entry.id);
  await fs.mkdir(destDir, { recursive: true });
  const { text } = await fetchWithFallback(url);
  const normalized = normalizeNewlines(text).replace(/\n*$/, '\n');
  const dest = path.join(destDir, filename);
  if (!await exists(dest) || normalizeNewlines(await fs.readFile(dest, 'utf8')) !== normalized) {
    await fs.writeFile(dest, normalized);
  }
  const raw = `${RAW_BASE}/${path.relative(ROOT, dest).split(path.sep).map(encodeURIComponent).join('/')}`;
  return { qx: raw, surge: raw, source: normalized, qxAdapted: false };
}
function scriptUrls(source) {
  const urls = new Set([...source.matchAll(/script-path=([^,\s]+)/gi)].map(m => m[1].trim()));
  const parsed = parseLoon(source);
  for (const item of sectionItems(parsed.sections.get('Script'))) {
    if (!item.line || !isScriptV2(item.line)) continue;
    try { urls.add(parseScriptV2(item.line).script.path); }
    catch {}
  }
  return [...urls];
}

function validateQX(text, entry) {
  const activeMetadata = text.split('\n').filter(l => /^#!/.test(l.trim()));
  if (activeMetadata.length) throw new Error(`${entry.id}: Quantumult X snippet metadata must be plain comments, not active #! directives`);
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


async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
  await Promise.all([RESOURCE_DIR, TARGET_ROOT, SCRIPT_DIR].map(d => fs.mkdir(d, { recursive: true })));
  const failures = [];
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
      const qxMockFiles = await materializeQxMockFiles(entry, parsedSource);
      const jqFiles = await materializeJqFiles(entry, parsedSource);
      for (const url of scriptUrls(source)) {
        scriptMap.set(url, await syncScript(entry, url));
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
      let out = convert(entry, source, scriptMap, stamp, qxMockFiles, jqFiles);

      // Converter changes must also refresh outputs even when upstream LPX is unchanged.
      // Preserve the old conversion timestamp only if the generated content is actually identical.
      if (!changed && oldStamp && ((oldQx && oldQx !== out.qx) || (oldSg && oldSg !== out.surge))) {
        stamp = nowCN();
        out = convert(entry, source, scriptMap, stamp, qxMockFiles, jqFiles);
      }

      for (const [file, content] of out.generatedScripts) {
        const dir = path.join(SCRIPT_DIR, entry.id);
        await fs.mkdir(dir, { recursive: true });
        const dest = path.join(dir, file);
        if (!await exists(dest) || normalizeNewlines(await fs.readFile(dest, 'utf8')) !== content) await fs.writeFile(dest, content);
      }
      validateQX(out.qx, entry);
      validateSurgeModule(out.surge, entry);
      let outputChanged = false;
      if (oldQx !== out.qx) { await fs.writeFile(qxPath, out.qx); outputChanged = true; }
      if (oldSg !== out.surge) { await fs.writeFile(sgPath, out.surge); outputChanged = true; }
      console.log(outputChanged ? `converted -> ${path.relative(ROOT, qxPath)}, ${path.relative(ROOT, sgPath)}` : 'conversion verified: outputs unchanged');
    } catch (e) {
      failures.push(`${entry.id}: ${e.stack || e.message}`);
      console.error(`::error title=${entry.id}::${String(e.message).replaceAll('\n', '%0A')}`);
    }
  }
  if (failures.length) {
    console.error('\nFailures:\n' + failures.join('\n\n'));
    process.exitCode = 1;
  }
}

const __wayxIsMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (__wayxIsMain) await main();

export {
  cleanSource,
  convert,
  parseLoon,
  scriptUrls,
  validateQX,
};