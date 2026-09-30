import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { qxRule as canonicalQxRule, surgeModuleRule } from '../../converter/src/rule.mjs';
import { selectQxScriptAction } from '../../converter/src/script.mjs';
import { inspectQxScriptCompatibility, qxManualPortComment } from '../../converter/src/script-compat.mjs';
import { minifyJqFile } from '../../converter/src/jq.mjs';
import { planLegacyRewrite } from '../../converter/src/legacy-rewrite.mjs';
import { qxTargetPath, surgeTargetPath } from '../../converter/src/paths.mjs';
import { analyzeSafeRewriteV2 } from '../../converter/src/rewrite-v2-safe.mjs';
import { isRewriteV2, parseRewriteV2 } from '../../converter/src/rewrite-v2.mjs';
import { validateRewriteV2Ast } from '../../converter/src/rewrite-v2-actions.mjs';
import { inlineResolvedDependency, jqDependencySpecFromAction, qxMockPlanFromAction } from '../../converter/src/dependency.mjs';
import { renderQxMockFileScript } from '../../converter/src/qx-mock.mjs';
import { qxDirectRewritePlan, surgeDirectRewritePlan, surgeRedirectRewritePlan, surgeRejectRewritePlan, surgeHeaderRewritePlan, surgeInlineMockPlan, simpleUrlRewriteCondition } from '../../converter/src/rewrite-v2-semantic.mjs';
import { renderQxRedirectScript, renderQxRejectScript, renderQxHeaderScript, renderQxInlineMockScript } from '../../converter/src/qx-semantic-script.mjs';
import { isScriptV2, parseScriptV2, splitScriptV2Csv } from '../../converter/src/script-v2.mjs';
import { qxScriptV2Plan, surgeScriptV2Plan } from '../../converter/src/script-v2-target.mjs';
import { analyzePluginArgumentUsage, rewriteV2PluginArgumentRefs } from '../../converter/src/argument-usage.mjs';
import { surgeArgumentMetadata, surgePluginObjectArgument, surgeDynamicOptionValue, surgeEnableRequirement, parseLegacyLoonPluginObjectRefs } from '../../converter/src/argument.mjs';
import { hasActiveSurgeLines, renderSurgeModuleHeader, validateSurgeModule } from '../../converter/src/surge-module.mjs';
import { renderQxSnippetHeader } from '../../converter/src/metadata.mjs';
import { loadLoonSourceCatalog } from '../../converter/src/source-catalog.mjs';
import { planMitmLine } from '../../converter/src/mitm.mjs';
import { fetchOriginalText, fetchOriginalBytes, resolveOriginalUrl } from '../../converter/src/source-fetch.mjs';
import { registerComplexRewriteHandler, planComplexRewrite } from '../../converter/src/complex-rewrite-registry.mjs';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, '.github/sources/loon.json');
const RESOURCE_DIR = path.join(ROOT, 'Resource/Loon');
const TARGET_ROOT = path.join(ROOT, 'Adblock');
const SCRIPT_DIR = path.join(ROOT, 'script');
const RAW_BASE = 'https://raw.githubusercontent.com/JuemingDC/WayX/main';

registerComplexRewriteHandler({
  id: 'qx-same-phase-header-script',
  targets: ['qx'],
  match: ast => ast.actions.length > 0 && ast.actions.every(action => action.name.startsWith(ast.phase + '.header.')),
  plan: (ast, _target, ctx) => {
    try {
      const plan = renderQxHeaderScript(ast, {stamp:ctx.stamp, category:ctx.category, sourceLine:ctx.sourceLine});
      const key = crypto.createHash('sha1').update('header\0' + ctx.sourceLine).digest('hex').slice(0, 10);
      const filename = 'header_' + key + '.js';
      ctx.generatedScripts.set(filename, plan.script);
      return {ok:true, section:'rewrite', line:plan.pattern + ' url ' + plan.qxAction + ' ' + RAW_BASE + '/script/' + ctx.id + '/' + filename};
    } catch (error) {
      return {ok:false, terminal:true, reason:String(error?.message || error)};
    }
  },
});


const nowCN = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(new Date()).replace(' ', 'T').replace('T', ' ') + ' +08:00';

const normalizeNewlines = s => s.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

function cleanSource(text) {
  return normalizeNewlines(text).replace(/\n*$/, '\n');
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
    const argumentRefs = rewriteV2PluginArgumentRefs(ast, ctx.argumentIds || []);
    if (argumentRefs.all.length) {
      return {
        section: 'comment',
        line: `# [WayX] REWRITE V2 REVIEW REQUIRED: plugin [Argument] reference(s) ${argumentRefs.all.join(', ')} have no target declaration equivalent: ${line}`,
      };
    }
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

    // Non-native combinations enter the isolated registry only after the
    // native and dedicated planners above have declined them.
    const complex = planComplexRewrite(ast, 'qx', {...ctx, sourceLine:line});
    if (complex.ok) return {section:complex.section, line:complex.line, lines:complex.lines};
    if (complex.terminal) return {section:'comment', line:'# Unsupported Loon Rewrite v2 preserved (' + complex.reason + '): ' + line};

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

function surgeSectionArray(sg, section) {
  return ({url:sg.url, header:sg.header, map:sg.map, body:sg.body, script:sg.script})[section] || null;
}

function planDisabledSurgeRewriteComments(comments, ctx) {
  const passthrough = [];
  const routed = [];

  for (const raw of comments || []) {
    const trimmed = String(raw ?? '').trim();
    const match = trimmed.match(/^#\s*((?:request|response)\s+if\b[\s\S]+)$/);
    if (!match || !isRewriteV2(match[1])) {
      passthrough.push(raw);
      continue;
    }

    const sourceLine = match[1].trim();
    const mapped = rewriteV2Action(sourceLine, 'surge', ctx);
    if (!mapped || mapped.section === 'comment') {
      passthrough.push(raw);
      continue;
    }

    const lines = mapped.lines || [mapped.line];
    routed.push({
      section:mapped.section,
      lines:[
        raw,
        ...lines.map(line => '# ' + line),
      ],
    });
  }

  return { passthrough, routed };
}

function qxHeaderRewriteInfo(line, argumentIds = []) {
  if (!line || !isRewriteV2(line)) return null;
  try {
    const ast = parseRewriteV2(line);
    validateRewriteV2Ast(ast);
    if (rewriteV2PluginArgumentRefs(ast, argumentIds).all.length) return null;
    if (!ast.actions.length || ast.actions.some(action =>
      !new RegExp('^' + ast.phase + '\\.header\\.(?:add|set|del|replace)$').test(action.name)
    )) return null;
    const condition = simpleUrlRewriteCondition(ast);
    if (!condition.ok) return null;
    return {
      ast,
      signature: ast.phase + '\0' + JSON.stringify(ast.condition),
    };
  } catch {
    return null;
  }
}

function qxNativeHeaderReplacePlan(ast) {
  // QX native request-header/response-header rewrites the complete HTTP header block.
  // Direct mapping is intentionally limited to one fixed header.replace action.
  if (ast.actions.length !== 1 || !ast.actions[0].name.endsWith('.header.replace')) return null;
  const condition = simpleUrlRewriteCondition(ast);
  if (!condition.ok) return null;
  const action = ast.actions[0];
  const nameNode = action.args[0], regex = action.args[1], replacementNode = action.args[2];
  if (!nameNode || !['string','raw-string'].includes(nameNode.type) || regex?.type !== 'regex' ||
      !replacementNode || !['string','raw-string'].includes(replacementNode.type)) return null;
  const name = String(nameNode.value), replacement = String(replacementNode.value);
  if (/\s/.test(name) || /[\r\n]/.test(replacement) || replacement.includes('$' + '{')) return null;
  const token = ast.phase === 'request' ? 'request-header' : 'response-header';
  const headerName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headerPattern = '(\\r\\n)' + headerName + ':\\s*' + regex.pattern + '(\\r\\n)';
  const headerReplacement = '$1' + name + ': ' + replacement + '$2';
  return {section:'rewrite', line:condition.pattern + ' url ' + token + ' ' + headerPattern + ' ' + token + ' ' + headerReplacement};
}
function planAdjacentQxHeaderGroups(items, ctx) {
  const plans = new Map();
  const consumed = new Set();

  for (let index = 0; index < items.length; index++) {
    if (consumed.has(index) || !items[index]?.line) continue;
    const first = qxHeaderRewriteInfo(items[index].line, ctx.argumentIds || []);
    if (!first) continue;

    const actions = [...first.ast.actions];
    const sourceLines = [items[index].line];
    let end = index;

    for (let nextIndex = index + 1; nextIndex < items.length; nextIndex++) {
      const nextItem = items[nextIndex];
      if (!nextItem?.line || nextItem.comments.length) break;
      const next = qxHeaderRewriteInfo(nextItem.line, ctx.argumentIds || []);
      if (!next || next.signature !== first.signature) break;
      actions.push(...next.ast.actions);
      sourceLines.push(nextItem.line);
      end = nextIndex;
    }

    if (end === index) continue;

    const mergedAst = {...first.ast, actions};
    const nativePlan = qxNativeHeaderReplacePlan(mergedAst);
    if (nativePlan) {
      plans.set(index, nativePlan);
    } else {
      const plan = renderQxHeaderScript(mergedAst, {
        stamp: ctx.stamp,
        category: ctx.category,
        sourceLine: sourceLines.join(' | '),
      });
      const key = crypto.createHash('sha1').update('header\0' + sourceLines[0]).digest('hex').slice(0, 10);
      const filename = `header_${key}.js`;
      ctx.generatedScripts.set(filename, plan.script);
      plans.set(index, {section:'rewrite', line:`${plan.pattern} url ${plan.qxAction} ${RAW_BASE}/script/${ctx.id}/${filename}`});
    }
    for (let consumedIndex = index + 1; consumedIndex <= end; consumedIndex++) consumed.add(consumedIndex);
  }

  return {plans, consumed};
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
        const text = await fetchOriginalText(plan.url);
        const compact = text.replace(/\s+/g, '');
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 === 1) throw new Error('invalid Base64 mock_file content');
        out.set(item.line, { bodyBase64: Buffer.from(compact, 'base64').toString('base64'), sourceFile: plan.url });
      } else if (plan.binary) {
        const bytes = await fetchOriginalBytes(plan.url);
        out.set(item.line, { bodyBase64: bytes.toString('base64'), sourceFile: plan.url });
      } else {
        const text = await fetchOriginalText(plan.url);
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
      const text = await fetchOriginalText(spec.url);
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

function parseScriptLine(line) {
  const m = line.match(/^(http-request|http-response)\s+(\S+)\s+(.+)$/i);
  if (!m) return null;
  const type = m[1].toLowerCase(), pattern = m[2], rest = m[3];
  const options = new Map();
  for (const token of splitScriptV2Csv(rest)) {
    const eq = token.indexOf('=');
    if (eq < 1) continue;
    options.set(token.slice(0, eq).trim().toLowerCase(), token.slice(eq + 1).trim());
  }
  const scriptPath = options.get('script-path');
  const tag = options.get('tag');
  const requiresBody = /^(?:true|1)$/i.test(options.get('requires-body') || '');
  const binary = /^(?:true|1)$/i.test(options.get('binary-body-mode') || '');
  const timeout = options.get('timeout');
  const maxSize = options.get('max-size');
  const argument = options.get('argument');
  const enable = options.get('enable') ?? options.get('enabled');
  return { type, pattern, scriptPath, tag, requiresBody, binary, timeout, maxSize, argument, enable, original: line };
}

function sanitizeName(s) {
  return (s || 'script').replace(/[=,\r\n]/g, '_').trim().slice(0, 64) || 'script';
}

function convert(entry, source, scriptMap, stamp = nowCN(), qxMockFiles = new Map(), jqFiles = new Map()) {
  const parsed = parseLoon(source);
  const sourceHeader = parsed.header;
  const qxHeader = renderQxSnippetHeader(sourceHeader, entry, stamp);

  const qx = { filter: [], rewrite: [], mitm: [], notes: [], generatedScripts: new Map() };
  const sg = { rule: [], url: [], header: [], map: [], body: [], script: [], mitm: [], notes: [], generatedScripts: new Map() };
  const argumentAnalysis = analyzePluginArgumentUsage({
    argumentLines: parsed.sections.get('Argument') || [],
    rewriteLines: parsed.sections.get('Rewrite') || [],
    scriptLines: parsed.sections.get('Script') || [],
    ruleLines: parsed.sections.get('Rule') || [],
  });
  const argumentIds = new Set(argumentAnalysis.declaredIds);
  const surgeArgumentPlan = surgeArgumentMetadata(parsed.sections.get('Argument') || []);
  const surgeArgumentTable = surgeArgumentPlan.table;
  let surgeNeedsLineRequirement = false;
  const qctx = { id: entry.id, generatedScripts: qx.generatedScripts, sourceUrl: entry.source, stamp, category: entry.category, mockFiles: qxMockFiles, jqFiles, argumentIds };
  const sctx = { id: entry.id, generatedScripts: sg.generatedScripts, sourceUrl: entry.source, stamp, category: entry.category, jqFiles, argumentIds, argumentTable: surgeArgumentTable };

  // Loon [Argument] is never emitted into Quantumult X. Surge modules use
  // official #!arguments metadata and {{{name}}} placeholders instead.
  if (argumentAnalysis.undeclaredRefs.length) {
    const refs = [...new Set(argumentAnalysis.undeclaredRefs.map(ref => ref.id))].sort().join(', ');
    qx.notes.push(`# [WayX] ARGUMENT REVIEW REQUIRED: undeclared source plugin argument reference(s): ${refs}`);
    sg.notes.push(`# [WayX] ARGUMENT REVIEW REQUIRED: undeclared source plugin argument reference(s): ${refs}`);
  }
  if (argumentAnalysis.policyBindings.length) {
    qx.notes.push('# [WayX] Policy binding: source PROXY is preserved as literal QX policy name PROXY; a matching target policy must exist.');
  }

  for (const item of sectionItems(parsed.sections.get('Rule'))) {
    const comments = cleanComments(item.comments);
    if (!item.line) { qx.filter.push(...comments); sg.rule.push(...comments); continue; }
    const qr = canonicalQxRule(item.line);
    if (qr.kind === 'filter') qx.filter.push(...comments, qr.line);
    else if (qr.kind === 'rewrite') qx.rewrite.push(...comments, qr.line);
    else qx.filter.push(...comments, qr.line);
    const sr = surgeModuleRule(item.line);
    const sRuleDest = sr.section === 'map' ? sg.map : sg.rule;
    sRuleDest.push(...comments, ...sr.lines);
  }

  const rewriteItems = sectionItems(parsed.sections.get('Rewrite'));
  const qxHeaderGroups = planAdjacentQxHeaderGroups(rewriteItems, qctx);

  for (let rewriteIndex = 0; rewriteIndex < rewriteItems.length; rewriteIndex++) {
    const item = rewriteItems[rewriteIndex];
    const comments = cleanComments(item.comments);
    const surgeCommentPlan = planDisabledSurgeRewriteComments(item.comments, sctx);
    const surgeComments = cleanComments(surgeCommentPlan.passthrough);
    for (const routed of surgeCommentPlan.routed) {
      const dest = surgeSectionArray(sg, routed.section);
      if (dest) dest.push(...routed.lines);
      else sg.notes.push(...routed.lines);
    }
    if (!item.line) continue;

    const qxConsumed = qxHeaderGroups.consumed.has(rewriteIndex);
    let qr = qxHeaderGroups.plans.get(rewriteIndex) || null;
    let sr = rewriteV2Action(item.line, 'surge', sctx);

    if (!qxConsumed && !qr) {
      const headerInfo = qxHeaderRewriteInfo(item.line, qctx.argumentIds || []);
      if (headerInfo) qr = qxNativeHeaderReplacePlan(headerInfo.ast);
    }
    if (!qxConsumed && !qr) qr = rewriteV2Action(item.line, 'qx', qctx);

    const [pattern, action] = splitPatternAction(item.line);
    if (!qxConsumed && !qr) qr = planLegacyRewrite(pattern, action, 'qx', { ...qctx, rawBase: RAW_BASE });
    if (!sr) sr = planLegacyRewrite(pattern, action, 'surge', { ...sctx, rawBase: RAW_BASE });

    if (!qxConsumed) {
      const qdest = qr.section === 'rewrite' ? qx.rewrite : qx.notes;
      qdest.push(...comments, qr.line);
    }

    const sdest = surgeSectionArray(sg, sr.section) || sg.notes;
    sdest.push(...surgeComments, ...(sr.lines || [sr.line]));
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
        const qxPlan = qxScriptV2Plan(ast, { scriptUrl: qxUrl, sourceText, argumentIds });
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
      const surgePlan = surgeScriptV2Plan(ast, { scriptUrl: surgeUrl, name, argumentIds, argumentTable: surgeArgumentTable });
      sg.script.push(...comments);
      if (!surgePlan.ok) {
        sg.script.push(`# [WayX] SCRIPT V2 REVIEW REQUIRED: ${surgePlan.reason}`);
        sg.script.push(`# Source declaration: ${item.line}`);
      } else if (surgePlan.disabled) {
        sg.script.push(`# [WayX] Script disabled by source option: ${item.line}`);
      } else {
        if (surgePlan.usesLineRequirement) surgeNeedsLineRequirement = true;
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
    } else {
      let requirementPrefix = '';
      if (enableDynamic) {
        const ref = String(sc.enable).match(/^\$?\{([A-Za-z_][\w-]*)\}$/);
        const requirement = ref ? surgeEnableRequirement(ref[1], surgeArgumentTable) : null;
        if (!requirement) {
          sg.script.push('# [WayX] SCRIPT REVIEW REQUIRED: dynamic source enable cannot be mapped to a declared Surge module boolean argument.');
          sg.script.push(`# Source declaration: ${item.line}`);
          continue;
        }
        requirementPrefix = requirement + ' ';
        surgeNeedsLineRequirement = true;
      }

      const params = [`type=${sc.type}`, `pattern=${sc.pattern}`, `script-path=${surgeUrl}`];
      if (sc.requiresBody) {
        params.push('requires-body=true');
        params.push(`max-size=${sc.maxSize || '-1'}`);
      }
      if (sc.binary) params.push('binary-body-mode=true');

      if (sc.timeout) {
        const timeoutRef = String(sc.timeout).match(/^\$?\{([A-Za-z_][\w-]*)\}$/);
        if (timeoutRef) {
          const placeholder = surgeDynamicOptionValue(timeoutRef[1], surgeArgumentTable);
          if (!placeholder) {
            sg.script.push('# [WayX] SCRIPT REVIEW REQUIRED: dynamic timeout references an undeclared Surge module argument.');
            sg.script.push(`# Source declaration: ${item.line}`);
            continue;
          }
          params.push(`timeout=${placeholder}`);
        } else {
          params.push(`timeout=${sc.timeout}`);
        }
      }

      if (sc.argument) {
        const refs = parseLegacyLoonPluginObjectRefs(sc.argument);
        if (refs) {
          const encoded = surgePluginObjectArgument(refs, surgeArgumentTable);
          if (!encoded.ok) {
            sg.script.push(`# [WayX] SCRIPT REVIEW REQUIRED: ${encoded.reason}`);
            sg.script.push(`# Source declaration: ${item.line}`);
            continue;
          }
          params.push('argument=' + encoded.value);
        } else {
          params.push(`argument=${sc.argument}`);
        }
      }
      sg.script.push(requirementPrefix + `${name} = ${params.join(',')}`);
    }
  }

  const mitmLines = parsed.sections.get('MitM') || parsed.sections.get('MITM') || [];
  for (const item of sectionItems(mitmLines)) {
    const comments = cleanComments(item.comments);
    if (!item.line) continue;
    const qPlan = planMitmLine(item.line, 'qx');
    const sPlan = planMitmLine(item.line, 'surge');
    qx.mitm.push(...comments, qPlan.line);
    sg.mitm.push(...comments, sPlan.line);
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
  const surgeHeader = renderSurgeModuleHeader(parsed.header, entry, stamp, {
    needsCore20,
    argumentMetadata:surgeArgumentPlan.lines,
    needsLineRequirement:surgeNeedsLineRequirement,
  });
  const sgOut = [...surgeHeader, '', ...surgeSections].join('\n').replace(/\n*$/, '\n');

  return { qx: qxOut.replace(/\n*$/, '\n'), surge: sgOut, generatedScripts: new Map([...qx.generatedScripts, ...sg.generatedScripts]) };

}

async function inspectSourceScript(reference, pluginSourceUrl) {
  const originalUrl = resolveOriginalUrl(reference, pluginSourceUrl);
  const normalized = normalizeNewlines(await fetchOriginalText(originalUrl)).replace(/\n*$/, '\n');
  return {
    qx: originalUrl,
    surge: originalUrl,
    source: normalized,
    qxAdapted: false,
  };
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
  const commentedSections = ['# [filter_local]', '# [rewrite_local]', '# [mitm]'].filter(section => text.includes(section));
  if (!commentedSections.length) throw new Error(`${entry.id}: missing commented QX section heading`);
}


async function main() {
  const manifest = await loadLoonSourceCatalog(MANIFEST);
  await Promise.all([RESOURCE_DIR, TARGET_ROOT, SCRIPT_DIR].map(d => fs.mkdir(d, { recursive: true })));
  const failures = [];
  for (const entry of manifest) {
    try {
      console.log(`\n== ${entry.id} ==`);
      const text = await fetchOriginalText(entry.source);
      const fetchedFrom = entry.source;
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
      const discoveredScriptUrls = scriptUrls(source);
      for (const reference of discoveredScriptUrls) {
        scriptMap.set(reference, await inspectSourceScript(reference, entry.source));
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
  materializeJqFiles,
  materializeQxMockFiles,
  parseLoon,
  scriptUrls,
  validateQX,
};