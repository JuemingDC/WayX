// Modified: 2026-11-11 (chance). Emit body-only bridges or API dependency slices instead of one full runtime per script.
import {
  scriptApiUsage,
  useLexicalScriptApis,
  selectScriptApiRuntime,
  selectScriptConfig,
  emitBodyScript,
} from "./script-api-selection.ts";
import {
  headerPredicateRuntime,
  headerArgumentPrefix,
} from "../domain/qx-header.ts";
// Modified: 2026-11-03 (chance). Evaluate declaration header guards before author execution; native QX remains unchanged.
// Modified: 2026-11-02 (chance). Compose one untouched author body with an API
// scope. Lexical declarations and Env objects remain ordinary JavaScript.
import ts from "typescript";
import { scriptApiRuntime } from "./script-api-runtime.ts";
import { pakoRuntime } from "../vendor/pako/runtime.ts";
import { scriptCodecs } from "./script-codecs.ts";
import { aesProvider } from "../vendor/providers/aes.ts";
import { encodingProvider } from "../vendor/providers/encoding.ts";
import { urlProvider } from "../vendor/providers/url.ts";
export function emitScriptApiProgram(
  source: string,
  contexts: Record<string, any>,
  fixedTarget?: string,
) {
  const tree = ts.createSourceFile(
      "source.js",
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    ),
    names = new Set<string>();
  const walk = (n: ts.Node) => {
    if (ts.isIdentifier(n)) names.add(n.text);
    ts.forEachChild(n, walk);
  };
  walk(tree);
  const fresh = (name: string) => {
    while (names.has(name)) name += "_";
    names.add(name);
    return name;
  };
  const host = fresh("__wayxHost"),
    config = fresh("__wayxConfig"),
    scope = fresh("__wayxScope"),
    target = fresh("__wayxTarget"),
    table = fresh("__wayxContexts");
  // Modified: 2026-11-05 (chance). Include only providers referenced by executable source;
  // target-specific composition does not carry a Loon runtime or source metadata banner.
  const usage = scriptApiUsage(tree);
  // Opaque lookup retains the established provider dependency policy; a local
  // `this` reference must not pull every large provider into an unrelated script.
  const executable = ts.createPrinter({ removeComments: true }).printFile(tree);
  const opaqueUses = (pattern: RegExp) =>
    usage.dynamic && pattern.test(executable);
  const compression =
    usage.roots.has("$utils") || opaqueUses(/\$utils|\b(?:gzip|ungzip)\b/);
  const aes = usage.roots.has("$crypto") || opaqueUses(/\$crypto/);
  const url =
    opaqueUses(/\b(?:URL|URLSearchParams)\b/) ||
    usage.roots.has("URL") ||
    usage.roots.has("URLSearchParams");
  let legacyEncoding = false;
  const inspectDecoder = (node: ts.Node) => {
    if (
      usage.roots.has("TextDecoder") &&
      ts.isElementAccessExpression(node) &&
      ts.isStringLiteralLike(node.argumentExpression) &&
      node.argumentExpression.text === "TextDecoder"
    )
      legacyEncoding = true;
    // Modified: 2026-11-05 (chance). Aliased constructors may receive dynamic
    // encodings; omit the provider only for direct, known UTF-8 constructions.
    if (ts.isIdentifier(node) && node.text === "TextDecoder") {
      const parent = node.parent;
      if (ts.isNewExpression(parent) && parent.expression === node) {
        const label = parent.arguments?.[0];
        if (
          label &&
          (!ts.isStringLiteralLike(label) ||
            !/^(?:utf-?8|unicode-1-1-utf-8)$/i.test(label.text))
        )
          legacyEncoding = true;
      } else legacyEncoding = true;
    }
    ts.forEachChild(node, inspectDecoder);
  };
  inspectDecoder(tree);
  // QX fetch promises expose both bytes and decoded text on Surge's callback transport.
  // The response charset is runtime data, so its decoder is an active API dependency.
  legacyEncoding ||=
    (opaqueUses(/\$task/) || usage.roots.has("$task")) &&
    Object.values(contexts).some(
      (targets: any) => targets.surge?.from === "qx",
    ) &&
    (!fixedTarget || fixedTarget === "surge");
  const selected = fixedTarget
    ? Object.fromEntries(
        Object.entries(contexts)
          .map(([role, targets]) => [
            role,
            { [fixedTarget]: targets[fixedTarget] },
          ])
          .filter(([, targets]) =>
            Object.values(targets as object).some(Boolean),
          ),
      )
    : contexts;
  const configs = Object.values(selected).flatMap((targets: any) =>
    Object.values(targets),
  );
  const bodyOnly = emitBodyScript(source, usage, configs, fixedTarget, fresh);
  if (bodyOnly) return bodyOnly;
  const runtime = selectScriptApiRuntime(scriptApiRuntime, usage, configs);
  const capture: Record<string, string> = {
    global: "globalThis",
    request: "typeof $request==='undefined'?undefined:$request",
    response: "typeof $response==='undefined'?undefined:$response",
    done: "$done",
    task: "typeof $task==='undefined'?undefined:$task",
    http: "typeof $httpClient==='undefined'?undefined:$httpClient",
    prefs: "typeof $prefs==='undefined'?undefined:$prefs",
    store: "typeof $persistentStore==='undefined'?undefined:$persistentStore",
    notifyQx: "typeof $notify==='undefined'?undefined:$notify",
    notify: "typeof $notification==='undefined'?undefined:$notification",
    script: "typeof $script==='undefined'?undefined:$script",
    argument: "typeof $argument==='undefined'?undefined:$argument",
    environment: "typeof $environment==='undefined'?undefined:$environment",
    loon: "typeof $loon==='undefined'?undefined:$loon",
    setTimeout: "typeof setTimeout==='undefined'?undefined:setTimeout",
    codecs: `(${scriptCodecs})((${legacyEncoding ? encodingProvider : "undefined"}),{TextDecoder:typeof TextDecoder==='undefined'?undefined:TextDecoder})`,
    utils: "typeof $utils==='undefined'?undefined:$utils",
    crypto: "typeof $crypto==='undefined'?undefined:$crypto",
    compression: compression ? "(" + pakoRuntime + ")" : "undefined",
    aes: aes ? "(" + aesProvider + ")" : "undefined",
    url: url ? "(" + urlProvider + ")" : "undefined",
  };
  // Phase dispatch needs the real response presence even when the API is unused.
  runtime.hostFields.add("response");
  const headerGuard =
    (!fixedTarget || fixedTarget === "surge") &&
    configs.some((c: any) => c.from === "qx");
  if (headerGuard) {
    runtime.hostFields.add("argument");
    runtime.hostFields.add("request");
    runtime.hostFields.add("done");
  }
  const captures = [...runtime.hostFields]
    .map((key) => key + ":" + capture[key])
    .join(",");
  const compact = Object.fromEntries(
    Object.entries(selected).map(([role, targets]: [string, any]) => [
      role,
      Object.fromEntries(
        Object.entries(targets).map(([client, value]) => [
          client,
          selectScriptConfig(value, runtime.configPaths),
        ]),
      ),
    ]),
  );
  const single =
    fixedTarget && Object.keys(compact).length === 1
      ? Object.keys(compact)[0]
      : null;
  const configuration = single
    ? `if((${host}.response===undefined?'request':'response')!==${JSON.stringify(single)})throw new Error('Unregistered HTTP source/target declaration');\nconst ${config}=${JSON.stringify(compact[single][fixedTarget!])};`
    : `const ${table}=${JSON.stringify(compact)},${config}=${table}[${host}.response===undefined?'request':'response']?.[${target}];\nif(!${config})throw new Error('Unregistered HTTP source/target declaration');`;
  const lexical = useLexicalScriptApis(usage);
  // Only adapted bindings become parameters. Unadapted globals must keep
  // native lexical lookup and missing-name ReferenceErrors.
  const adapted = new Set([
    "$request",
    "$response",
    "$done",
    "$script",
    "$task",
    "$httpClient",
    "$prefs",
    "$persistentStore",
    "$notify",
    "$notification",
    "$argument",
    "$environment",
    "$loon",
    "TextDecoder",
    "TextEncoder",
    "atob",
    "btoa",
    "URL",
    "URLSearchParams",
    ...(configs.some((c: any) => c.from === "loon")
      ? ["$utils", "$crypto"]
      : []),
  ]);
  const roots = [...usage.roots].filter((root) => adapted.has(root));
  const invocation = lexical
    ? `function(${scope}){return(function(${roots.join(",")}){return(function(){\n${source}\n}).call(this);}).call(this,${roots.map((root) => `Object.prototype.hasOwnProperty.call(${scope},${JSON.stringify(root)})?${scope}[${JSON.stringify(root)}]:(typeof ${root}==='undefined'?undefined:${root})`).join(",")});}`
    : `function(${scope}){with(${scope}){return(function(){\n${source}\n}).call(this);}}`;
  return `/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */\n/* Adapter: GPL-3.0-only; derived from ScriptHub b943361f11be5795b3eb10f9cc4e5497642922fc. See vendor/script-hub/NOTICE.md. */\n(function(){
${single ? "" : `const ${target}=${fixedTarget ? JSON.stringify(fixedTarget) : "typeof $loon==='string'?'loon':typeof $task!=='undefined'&&typeof $task.fetch==='function'?'qx':typeof $environment!=='undefined'&&$environment['surge-version']?'surge':null"};`}
const ${host}={${captures}};
${configuration}
${headerGuard ? `if(${fixedTarget ? JSON.stringify(fixedTarget) : target}==='surge'&&typeof ${host}.argument==='string'&&${host}.argument.startsWith(${JSON.stringify(headerArgumentPrefix)})){const p=JSON.parse(decodeURIComponent(${host}.argument.slice(${headerArgumentPrefix.length})));if(!(${headerPredicateRuntime})(p,${host}.request))return ${host}.done({});${host}.argument=undefined;}` : ""}
return (${runtime.code})(${config},${host},${invocation});
})();\n`;
}
