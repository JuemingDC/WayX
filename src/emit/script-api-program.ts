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
  // Modified: 2026-11-02 (chance). Fixed Loon source profile includes all
  // reusable providers lazily; author call patterns never control availability.
  const loonSource = Object.values(contexts).some((targets: any) =>
    Object.values(targets).some((c: any) => c.from === "loon"),
  );
  return `/* Adapter: GPL-3.0-only; derived from ScriptHub b943361f11be5795b3eb10f9cc4e5497642922fc. See vendor/script-hub/NOTICE.md. */\n(function(){
const ${target}=${fixedTarget ? JSON.stringify(fixedTarget) : "typeof $loon==='string'?'loon':typeof $task!=='undefined'&&typeof $task.fetch==='function'?'qx':typeof $environment!=='undefined'&&$environment['surge-version']?'surge':null"};
const ${host}={global:globalThis,request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,task:typeof $task==='undefined'?undefined:$task,http:typeof $httpClient==='undefined'?undefined:$httpClient,prefs:typeof $prefs==='undefined'?undefined:$prefs,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,notifyQx:typeof $notify==='undefined'?undefined:$notify,notify:typeof $notification==='undefined'?undefined:$notification,script:typeof $script==='undefined'?undefined:$script,argument:typeof $argument==='undefined'?undefined:$argument,environment:typeof $environment==='undefined'?undefined:$environment,loon:typeof $loon==='undefined'?undefined:$loon,setTimeout:typeof setTimeout==='undefined'?undefined:setTimeout,codecs:(${scriptCodecs})((${encodingProvider}),{TextDecoder:typeof TextDecoder==='undefined'?undefined:TextDecoder}),utils:typeof $utils==='undefined'?undefined:$utils,crypto:typeof $crypto==='undefined'?undefined:$crypto,compression:${loonSource ? "(" + pakoRuntime + ")" : "undefined"},aes:${loonSource ? "(" + aesProvider + ")" : "undefined"},url:(${urlProvider})};
const ${table}=${JSON.stringify(contexts)},${config}=${table}[${host}.response===undefined?'request':'response']?.[${target}];
if(!${config})throw new Error('Unregistered HTTP source/target declaration');
return (${scriptApiRuntime})(${config},${host},function(${scope}){with(${scope}){return (function(){\n${source}\n}).call(this);}});
})();\n`;
}
