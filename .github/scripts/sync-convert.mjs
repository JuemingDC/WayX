import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { qxRule as canonicalQxRule, surgeModuleRule } from '../../converter/src/rule.mjs';
import { minifyJqFile } from '../../converter/src/jq.mjs';
import { qxTargetPath, surgeTargetPath } from '../../converter/src/paths.mjs';
import { isRewriteV2, parseRewriteV2 } from '../../converter/src/rewrite-v2.mjs';
import { validateRewriteV2Ast } from '../../converter/src/rewrite-v2-actions.mjs';
import { dependencySpecFromAction, inlineResolvedDependency, jqDependencySpecFromAction, isDiscardedLegacyJqPathAction } from '../../converter/src/dependency.mjs';
import { simpleUrlRewriteCondition } from '../../converter/src/rewrite-v2-semantic.mjs';
import { isScriptV2, parseScriptV2 } from '../../converter/src/script-v2.mjs';
import { analyzePluginArgumentUsage, rewriteV2PluginArgumentRefs } from '../../converter/src/argument-usage.mjs';
import { surgeArgumentMetadata } from '../../converter/src/argument.mjs';
import { validateSurgeModule } from '../../converter/src/surge-module.mjs';
import { createQxOutputState, appendQxOutput, qxOutputDestination, qxRuleOutputDestination, qxRewriteOutputDestination, renderQxOutput } from '../../converter/src/qx-output.mjs';
import { createSurgeOutputState, appendSurgeOutput, surgeOutputDestination, surgeRuleOutputDestination, surgeRewriteOutputDestination, renderSurgeOutput } from '../../converter/src/surge-output.mjs';
import { groupSourceSectionItems, cleanSourceComments, isSupportedSourceSection } from '../../converter/src/source-section.mjs';
import { attachQxInlineNote } from '../../converter/src/qx-comment.mjs';
import { loadLoonSourceCatalog } from '../../converter/src/source-catalog.mjs';
import { planMitmLine } from '../../converter/src/mitm.mjs';
import { fetchOriginalText, fetchOriginalBytes, resolveOriginalUrl } from '../../converter/src/source-fetch.mjs';
import { QX_WAYX_FILTER_TYPES, QX_WAYX_SCRIPT_ACTIONS, QX_WAYX_SNIPPET_MITM_KEYS } from '../../converter/src/qx-official-capabilities.mjs';
import { legacyRewriteToSemanticIr, rewriteV2AstToSemanticIr } from '../../converter/src/rewrite-ir.mjs';
import { planQxRewrite } from '../../converter/src/rewrite-qx.mjs';
import { planSurgeRewrite } from '../../converter/src/rewrite-surge.mjs';
import { rewriteReview, rewriteIssue } from '../../converter/src/rewrite-plan-result.mjs';
import { parseLegacyScriptLine } from '../../converter/src/script-legacy.mjs';
import { legacyScriptToSemanticIr, scriptV2AstToSemanticIr } from '../../converter/src/script-ir.mjs';
import { planQxScript } from '../../converter/src/script-qx.mjs';
import { planSurgeScript } from '../../converter/src/script-surge.mjs';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, '.github/sources/loon.json');
const RESOURCE_DIR = path.join(ROOT, 'Resource/Loon');
const TARGET_ROOT = path.join(ROOT, 'Adblock');
const SCRIPT_DIR = path.join(ROOT, 'script');
const RAW_BASE = 'https://raw.githubusercontent.com/JuemingDC/WayX/main';

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



function rewriteErrorResult(line, error) {
  const reason = String(error?.message || error).split('\n')[0];
  if (error instanceof SyntaxError) return rewriteIssue(line, 'unknown-rewrite-v2-syntax', reason);
  if (error?.code === 'WAYX_REWRITE_V2_ACTION_INVALID' && /not present in the current official Loon Rewrite v2 registry/i.test(reason)) {
    return rewriteIssue(line, 'unknown-rewrite-v2-action', reason);
  }
  if (error?.code === 'WAYX_REWRITE_V2_CONDITION_INVALID' && /unsupported|unknown|must be a variable/i.test(reason)) {
    return rewriteIssue(line, 'unknown-rewrite-v2-condition', reason);
  }
  return rewriteReview(line, reason);
}

function rewriteV2Action(line, target, ctx) {
  if (!isRewriteV2(line)) return null;

  let ast;
  let argumentRefs = {conditionRefs:[], actionRefs:[], all:[]};
  try {
    ast = parseRewriteV2(line);
    validateRewriteV2Ast(ast);
    argumentRefs = rewriteV2PluginArgumentRefs(ast, ctx.argumentIds || []);
    if (ast.actions.length === 1 && isDiscardedLegacyJqPathAction(ast.actions[0])) {
      return {section:'drop', line:'', reason:'discard-legacy-jq-path'};
    }
  } catch (error) {
    return rewriteErrorResult(line, error);
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
    return rewriteReview(line, String(error?.message || error).split('\n')[0]);
  }

  const ir = rewriteV2AstToSemanticIr(ast, {source:line});
  const planner = target === 'qx' ? planQxRewrite : target === 'surge' ? planSurgeRewrite : null;
  if (!planner) return rewriteIssue(line, 'unknown-rewrite-target', 'unsupported Rewrite target planner: ' + target);
  return planner(ir, {...ctx, sourceLine:line, argumentRefs:argumentRefs.all});
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
    if (mapped.section === 'drop') {
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

async function materializeMockFiles(entry, parsed) {
  const out = new Map();
  for (const item of groupSourceSectionItems(parsed.sections.get('Rewrite'))) {
    if (!item.line || !isRewriteV2(item.line)) continue;
    try {
      const ast = parseRewriteV2(item.line);
      validateRewriteV2Ast(ast);
      const mockFileActions = ast.actions.filter(action => /^(?:request|response)\.body\.mock_file$/.test(action.name));
      if (mockFileActions.length !== 1) continue;
      const condition = simpleUrlRewriteCondition(ast);
      if (!condition.ok) continue;

      const plan = dependencySpecFromAction(mockFileActions[0], { pluginSourceUrl: entry.source });
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
  for (const item of groupSourceSectionItems(parsed.sections.get('Rewrite'))) {
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


function sanitizeName(s) {
  return (s || 'script').replace(/[=,\r\n]/g, '_').trim().slice(0, 64) || 'script';
}

function convert(entry, source, scriptMap, stamp = nowCN(), qxMockFiles = new Map(), jqFiles = new Map()) {
  const parsed = parseLoon(source);
  const sourceHeader = parsed.header;

  const qx = createQxOutputState();
  const sg = createSurgeOutputState();
  for (const [sectionName, sectionLines] of parsed.sections) {
    if (isSupportedSourceSection(sectionName)) continue;
    const active = groupSourceSectionItems(sectionLines).filter(item => item.line).map(item => item.line);
    if (!active.length) continue;
    const reason = '# [WayX] ISSUE REQUIRED [unknown-source-section]: unsupported Loon source section [' + sectionName + '] is outside the current ad-block conversion grammar';
    for (const line of active) {
      appendQxOutput(qx,'notes',reason,'# Source declaration: ' + line);
      appendSurgeOutput(sg,'notes',reason,'# Source declaration: ' + line);
    }
  }
  const argumentAnalysis = analyzePluginArgumentUsage({
    argumentLines: parsed.sections.get('Argument') || [],
    rewriteLines: parsed.sections.get('Rewrite') || [],
    scriptLines: parsed.sections.get('Script') || [],
    ruleLines: parsed.sections.get('Rule') || [],
  });
  const argumentIds = new Set(argumentAnalysis.declaredIds);
  const surgeArgumentPlan = surgeArgumentMetadata(parsed.sections.get('Argument') || [], {
    proxyPolicyBinding: argumentAnalysis.policyBindings.length > 0,
  });
  const surgeArgumentTable = surgeArgumentPlan.table;
  const surgeProxyPolicyPlaceholder = surgeArgumentPlan.policyBinding?.placeholder || null;
  let surgeNeedsLineRequirement = false;
  const qctx = { id: entry.id, generatedScripts: qx.generatedScripts, sourceUrl: entry.source, stamp, category: entry.category, mockFiles: qxMockFiles, jqFiles, argumentIds, rawBase: RAW_BASE };
  const sctx = { id: entry.id, generatedScripts: sg.generatedScripts, sourceUrl: entry.source, stamp, category: entry.category, mockFiles: qxMockFiles, jqFiles, argumentIds, argumentTable: surgeArgumentTable, rawBase: RAW_BASE };

  // Loon [Argument] is never emitted into Quantumult X. Surge modules use
  // official #!arguments metadata and {{{name}}} placeholders instead.
  if (argumentAnalysis.undeclaredRefs.length) {
    const refs = [...new Set(argumentAnalysis.undeclaredRefs.map(ref => ref.id))].sort().join(', ');
    appendQxOutput(qx,'notes',`# [WayX] ARGUMENT REVIEW REQUIRED: undeclared source plugin argument reference(s): ${refs}`);
    appendSurgeOutput(sg,'notes',`# [WayX] ARGUMENT REVIEW REQUIRED: undeclared source plugin argument reference(s): ${refs}`);
  }
  if (argumentAnalysis.policyBindings.length) {
    appendQxOutput(qx,'notes','# [WayX] Policy binding: source PROXY is preserved as literal QX policy name PROXY; a matching target policy must exist.');
  }

  const ruleSectionLines = parsed.sections.get('Rule') || [];
  for (const item of groupSourceSectionItems(ruleSectionLines)) {
    const comments = cleanSourceComments(item.comments);
    if (!item.line) {
      qxOutputDestination(qx,'filter').push(...comments);
      surgeOutputDestination(sg,'rule').push(...comments);
      continue;
    }
    const qr = canonicalQxRule(item.line);
    const qxRendered = attachQxInlineNote({
      sectionLines: ruleSectionLines,
      item,
      sectionKind: 'rule',
      lines: [qr.line],
      eligible: qr.kind === 'filter' || qr.kind === 'rewrite',
    });
    const qxRuleDest = qxRuleOutputDestination(qx,qr.kind);
    if (qr.kind === 'filter' || qr.kind === 'rewrite') qxRuleDest.push(...qxRendered.comments,...qxRendered.lines);
    else qxRuleDest.push(...comments,qr.line);
    const sr = surgeModuleRule(item.line,{proxyPolicyPlaceholder:surgeProxyPolicyPlaceholder});
    surgeRuleOutputDestination(sg,sr.section).push(...comments,...sr.lines);
  }

  const rewriteSectionLines = parsed.sections.get('Rewrite') || [];
  const rewriteItems = groupSourceSectionItems(rewriteSectionLines);

  for (let rewriteIndex = 0; rewriteIndex < rewriteItems.length; rewriteIndex++) {
    const item = rewriteItems[rewriteIndex];
    const comments = cleanSourceComments(item.comments);
    const surgeCommentPlan = planDisabledSurgeRewriteComments(item.comments, sctx);
    const surgeComments = cleanSourceComments(surgeCommentPlan.passthrough);
    for (const routed of surgeCommentPlan.routed) {
      (surgeOutputDestination(sg,routed.section) || surgeOutputDestination(sg,'notes')).push(...routed.lines);
    }
    if (!item.line) continue;

    let qr = rewriteV2Action(item.line, 'qx', qctx);
    let sr = rewriteV2Action(item.line, 'surge', sctx);

    if (!qr || !sr) {
      const [pattern, action] = splitPatternAction(item.line);
      const ir = legacyRewriteToSemanticIr(pattern, action);
      if (!qr) qr = planQxRewrite(ir, {...qctx, sourceLine:item.line});
      if (!sr) sr = planSurgeRewrite(ir, {...sctx, sourceLine:item.line});
    }

    const qdest=qxRewriteOutputDestination(qx,qr.section);
    if (qr.section==='drop') {
      qdest.push(...comments);
    } else if (qr.section==='rewrite') {
      const qxRendered=attachQxInlineNote({
        sectionLines:rewriteSectionLines,
        item,
        sectionKind:'rewrite',
        lines:qr.lines || [qr.line],
        eligible:qr.qxInlineNoteEligible !== false,
      });
      qdest.push(...qxRendered.comments,...qxRendered.lines);
    } else {
      qdest.push(...comments,...(qr.lines || [qr.line]));
    }

    const sdest=surgeRewriteOutputDestination(sg,sr.section);
    if (sr.section==='drop') sdest.push(...surgeComments);
    else sdest.push(...surgeComments,...(sr.lines || [sr.line]));
  }

  const scriptSectionLines = parsed.sections.get('Script') || [];
  let scriptIndex = 0;
  for (const item of groupSourceSectionItems(scriptSectionLines)) {
    const comments = cleanSourceComments(item.comments);
    if (!item.line) continue;

    let ir;
    let sourceSyntax;
    if (isScriptV2(item.line)) {
      sourceSyntax='v2';
      try {
        ir=scriptV2AstToSemanticIr(parseScriptV2(item.line),{source:item.line});
      } catch (error) {
        const reason=String(error?.message || error).split('\n')[0];
        appendQxOutput(qx,'notes',...comments,`# [WayX] ISSUE REQUIRED [unknown-script-v2-syntax]: source declaration parse failed: ${reason}`,`# Source declaration: ${item.line}`);
        appendSurgeOutput(sg,'notes',...comments,`# [WayX] ISSUE REQUIRED [unknown-script-v2-syntax]: source declaration parse failed: ${reason}`,`# Source declaration: ${item.line}`);
        continue;
      }
    } else {
      sourceSyntax='legacy';
      const parsedLegacy=parseLegacyScriptLine(item.line);
      if (!parsedLegacy?.script?.path) {
        appendQxOutput(qx,'notes',...comments,'# [WayX] ISSUE REQUIRED [unknown-script-declaration]: unsupported source Script declaration is outside the registered grammar',`# Source declaration: ${item.line}`);
        appendSurgeOutput(sg,'notes',...comments,'# [WayX] ISSUE REQUIRED [unknown-script-declaration]: unsupported source Script declaration is outside the registered grammar',`# Source declaration: ${item.line}`);
        continue;
      }
      ir=legacyScriptToSemanticIr(parsedLegacy,{source:item.line});
    }

    scriptIndex++;
    const mapped=scriptMap.get(ir.script.path);
    const sourceText=mapped?.source || '';
    const qxUrl=mapped?.qx || ir.script.path;
    const surgeUrl=mapped?.surge || ir.script.path;
    const qxPlan=planQxScript(ir,{scriptUrl:qxUrl,sourceText,argumentIds});
    const qxScriptDest=qxOutputDestination(qx,'rewrite');

    if (!qxPlan.ok) {
      qxScriptDest.push(...comments);
      if (sourceSyntax==='legacy' && ir.sourcePayload.tag) qxScriptDest.push(`# ${ir.sourcePayload.tag}`);
      qxScriptDest.push(`# [WayX] ${sourceSyntax==='v2' ? 'SCRIPT V2' : 'SCRIPT'} REVIEW REQUIRED: ${qxPlan.reason}`);
      qxScriptDest.push(`# Source declaration: ${item.line}`);
    } else if (qxPlan.disabled) {
      qxScriptDest.push(...comments);
      if (sourceSyntax==='legacy' && ir.sourcePayload.tag) qxScriptDest.push(`# ${ir.sourcePayload.tag}`);
      qxScriptDest.push(`# [WayX] Script disabled by source ${sourceSyntax==='v2' ? 'option' : 'declaration'}: ${item.line}`);
    } else {
      const qxRendered=attachQxInlineNote({
        sectionLines:scriptSectionLines,
        item,
        sectionKind:'script',
        lines:[qxPlan.line],
      });
      qxScriptDest.push(...qxRendered.comments);
      if (qxPlan.tag) qxScriptDest.push(`# ${qxPlan.tag}`);
      for (const note of qxPlan.notes || []) qxScriptDest.push(`# [WayX] ${note}`);
      qxScriptDest.push(...qxRendered.lines);
    }

    const sourceTag=sourceSyntax==='v2'
      ? ir.sourcePayload.options.find(x=>x.name==='tag')?.value?.value
      : ir.sourcePayload.tag;
    const name=sanitizeName(sourceTag || `${entry.id}_${String(scriptIndex).padStart(2,'0')}`);
    const surgePlan=planSurgeScript(ir,{
      scriptUrl:surgeUrl,
      name,
      argumentIds,
      argumentTable:surgeArgumentTable,
    });
    const surgeScriptDest=surgeOutputDestination(sg,'script');
    surgeScriptDest.push(...comments);
    if (!surgePlan.ok) {
      surgeScriptDest.push(`# [WayX] ${sourceSyntax==='v2' ? 'SCRIPT V2' : 'SCRIPT'} REVIEW REQUIRED: ${surgePlan.reason}`);
      surgeScriptDest.push(`# Source declaration: ${item.line}`);
    } else if (surgePlan.disabled) {
      surgeScriptDest.push(`# [WayX] Script disabled by source ${sourceSyntax==='v2' ? 'option' : 'declaration'}: ${item.line}`);
    } else {
      if (surgePlan.usesLineRequirement) surgeNeedsLineRequirement=true;
      surgeScriptDest.push(surgePlan.line);
    }
  }

  const mitmLines = parsed.sections.get('MitM') || parsed.sections.get('MITM') || [];
  for (const item of groupSourceSectionItems(mitmLines)) {
    const comments = cleanSourceComments(item.comments);
    if (!item.line) continue;
    const qPlan = planMitmLine(item.line, 'qx');
    const sPlan = planMitmLine(item.line, 'surge');
    qxOutputDestination(qx,'mitm').push(...comments,qPlan.line);
    surgeOutputDestination(sg,'mitm').push(...comments,sPlan.line);
  }

  const qxOut=renderQxOutput({
    state:qx,
    headerLines:sourceHeader,
    entry,
    stamp,
  });
  const sgOut=renderSurgeOutput({
    state:sg,
    headerLines:parsed.header,
    entry,
    stamp,
    argumentMetadata:surgeArgumentPlan.lines,
    needsLineRequirement:surgeNeedsLineRequirement,
  });

  return {
    qx:qxOut,
    surge:sgOut,
    generatedScripts:new Map([...qx.generatedScripts,...sg.generatedScripts]),
  };

}

async function inspectSourceScript(reference, pluginSourceUrl) {
  const originalUrl = resolveOriginalUrl(reference, pluginSourceUrl);
  try {
    const normalized = normalizeNewlines(await fetchOriginalText(originalUrl)).replace(/\n*$/, '\n');
    return {
      qx: originalUrl,
      surge: originalUrl,
      source: normalized,
      sourceError: null,
    };
  } catch (error) {
    // Source Script content is optional and is read only to refine the target
    // rewrite action type. Runtime compatibility is not gated for QX or Surge;
    // both targets keep the original Source Script URL unchanged.
    return {
      qx: originalUrl,
      surge: originalUrl,
      source: '',
      sourceError: String(error?.message || error),
    };
  }
}
function scriptUrls(source) {
  const urls = new Set([...source.matchAll(/script-path=([^,\s]+)/gi)].map(m => m[1].trim()));
  const parsed = parseLoon(source);
  for (const item of groupSourceSectionItems(parsed.sections.get('Script'))) {
    if (!item.line || !isScriptV2(item.line)) continue;
    try { urls.add(parseScriptV2(item.line).script.path); }
    catch {}
  }
  return [...urls];
}

function stripQxLeadingNote(line, entry) {
  const text = String(line ?? '').trim();
  if (!text.startsWith('{#')) return {line:text, note:null};
  const match = text.match(/^\{#\s*(.*?)\s*#\}\s+(.+)$/);
  if (!match || !match[1].trim() || !match[2].trim()) {
    throw new Error(`${entry.id}: malformed Quantumult X leading rule note: ${line}`);
  }
  return {line:match[2].trim(), note:match[1].trim()};
}

function validateQxExecutableLine(line, entry) {
  const noted = stripQxLeadingNote(line, entry);
  line = noted.line;
  if (noted.note && /^([A-Za-z0-9_-]+)\s*=/.test(line)) {
    throw new Error(`${entry.id}: Quantumult X leading notes are only valid on filter/rewrite rules: ${line}`);
  }
  const mitm = line.match(/^([A-Za-z0-9_-]+)\s*=/);
  if (mitm) {
    if (!QX_WAYX_SNIPPET_MITM_KEYS.has(mitm[1].toLowerCase())) {
      throw new Error(`${entry.id}: unverified/unsupported Quantumult X snippet MITM key: ${mitm[1]}`);
    }
    return;
  }

  const urlMarker = line.indexOf(' url ');
  if (urlMarker >= 0) {
    const pattern = line.slice(0, urlMarker).trim();
    const action = line.slice(urlMarker + 5).trim();
    if (!pattern) throw new Error(`${entry.id}: Quantumult X rewrite line has an empty URL pattern: ${line}`);

    if (/^(?:reject|reject-200|reject-img|reject-dict|reject-array)$/.test(action)) return;
    if (/^(?:302|307)\s+\S+$/.test(action)) return;
    if (/^jsonjq-(?:request|response)-body\s+'.+'$/.test(action)) return;
    if (/^(?:request|response)-body\s+.+\s+(?:request|response)-body\s+.+$/.test(action)) return;
    if (/^request-header\s+.+\s+request-header\s+.+$/.test(action)) return;

    const script = action.match(/^(script-[a-z-]+)\s+(\S+)$/);
    if (script && QX_WAYX_SCRIPT_ACTIONS.has(script[1])) return;

    throw new Error(`${entry.id}: unverified/unsupported Quantumult X rewrite action: ${action}`);
  }

  const comma = line.indexOf(',');
  if (comma > 0) {
    const type = line.slice(0, comma).trim().toLowerCase();
    if (!QX_WAYX_FILTER_TYPES.has(type)) {
      throw new Error(`${entry.id}: unverified/unsupported Quantumult X filter type: ${type}`);
    }
    const fields = line.split(',').map(part => part.trim());
    if (fields.length < 3 || !fields[1] || !fields[2]) {
      throw new Error(`${entry.id}: malformed Quantumult X filter line: ${line}`);
    }
    if (['ip-cidr','ip6-cidr','geoip','ip-asn'].includes(type) && fields.slice(3).some(x => x.toLowerCase() === 'no-resolve')) {
      throw new Error(`${entry.id}: Quantumult X IP-class rules must remove no-resolve`);
    }
    return;
  }

  throw new Error(`${entry.id}: unclassified active Quantumult X line: ${line}`);
}

function validateQX(text, entry) {
  const activeMetadata = text.split('\n').filter(l => /^#!/.test(l.trim()));
  if (activeMetadata.length) throw new Error(`${entry.id}: Quantumult X snippet metadata must be plain comments, not active #! directives`);
  const activeSections = text.split('\n').filter(l => /^\[(filter_local|rewrite_local|mitm)\]$/i.test(l.trim()));
  if (activeSections.length) throw new Error(`${entry.id}: Quantumult X section headings must be commented`);

  for (const raw of text.split('\n')) {
    const line = raw.trim();
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
    validateQxExecutableLine(line, entry);
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
      const qxMockFiles = await materializeMockFiles(entry, parsedSource);
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
  materializeMockFiles,
  inspectSourceScript,
  parseLoon,
  scriptUrls,
  validateQX,
};
