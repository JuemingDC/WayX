import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { minifyJqFile } from '../../converter/src/jq.mjs';
import { qxTargetPath, surgeTargetPath } from '../../converter/src/paths.mjs';
import { isRewriteV2, parseRewriteV2 } from '../../converter/src/rewrite-v2.mjs';
import { validateRewriteV2Ast } from '../../converter/src/rewrite-v2-actions.mjs';
import { simpleUrlRewriteCondition } from '../../converter/src/rewrite-v2-semantic.mjs';
import { isScriptV2, parseScriptV2 } from '../../converter/src/script-v2.mjs';
import { validateSurgeModule } from '../../converter/src/surge-module.mjs';
import { groupSourceSectionItems } from '../../converter/src/source-section.mjs';
import { loadLoonSourceCatalog } from '../../converter/src/source-catalog.mjs';
import { normalizePluginSource, parseLoonPlugin } from '../../converter/src/plugin-parser.mjs';
import { convertPlugin } from '../../converter/src/conversion-pipeline.mjs';
import { fetchOriginalText, fetchOriginalBytes, resolveOriginalUrl } from '../../converter/src/source-fetch.mjs';
import { QX_WAYX_FILTER_TYPES, QX_WAYX_SCRIPT_ACTIONS, QX_WAYX_SNIPPET_MITM_KEYS } from '../../converter/src/qx-official-capabilities.mjs';

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

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

function cleanSource(text) {
  return normalizePluginSource(text).replace(/\n*$/, '\n');
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



async function inspectSourceScript(reference, pluginSourceUrl) {
  const originalUrl = resolveOriginalUrl(reference, pluginSourceUrl);
  try {
    const normalized = normalizePluginSource(await fetchOriginalText(originalUrl)).replace(/\n*$/, '\n');
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
  const parsed = parseLoonPlugin(source);
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
      const old = await exists(sourcePath) ? normalizePluginSource(await fs.readFile(sourcePath, 'utf8')) : null;
      const changed = old !== source;
      if (changed) await fs.writeFile(sourcePath, source);
      console.log(`${changed ? 'updated' : 'unchanged'} source via ${fetchedFrom}; sha256=${sha256(source).slice(0, 12)}`);

      const scriptMap = new Map();
      const parsedSource = parseLoonPlugin(source);
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
      const oldQx = qxExists ? normalizePluginSource(await fs.readFile(qxPath, 'utf8')) : null;
      const oldSg = sgExists ? normalizePluginSource(await fs.readFile(sgPath, 'utf8')) : null;
      const oldStamp = (oldQx?.match(/^# Converted:\s*(.+)$/m) || [])[1] || null;
      let stamp = changed || !oldStamp ? nowCN() : oldStamp;
      let out = convertPlugin(entry, source, {scriptMap, stamp, mockFiles:qxMockFiles, jqFiles, rawBase:RAW_BASE});

      // Converter changes must also refresh outputs even when upstream LPX is unchanged.
      // Preserve the old conversion timestamp only if the generated content is actually identical.
      if (!changed && oldStamp && ((oldQx && oldQx !== out.qx) || (oldSg && oldSg !== out.surge))) {
        stamp = nowCN();
        out = convertPlugin(entry, source, {scriptMap, stamp, mockFiles:qxMockFiles, jqFiles, rawBase:RAW_BASE});
      }

      for (const [file, content] of out.generatedScripts) {
        const dir = path.join(SCRIPT_DIR, entry.id);
        await fs.mkdir(dir, { recursive: true });
        const dest = path.join(dir, file);
        if (!await exists(dest) || normalizePluginSource(await fs.readFile(dest, 'utf8')) !== content) await fs.writeFile(dest, content);
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
  materializeJqFiles,
  materializeMockFiles,
  inspectSourceScript,
  scriptUrls,
  validateQX,
};
