// Modified: 2026-11-02 (chance). Lower each concrete SDK reference/call to
// semantic operations with source ranges, target fields and unresolved proofs.
import ts from "typescript";
import crypto from "node:crypto";
import {
  scriptApiDefinitions,
  omitScriptNotificationOptions,
  scriptHostLayouts,
  type ScriptClient,
  type ScriptApiIR,
  type ScriptApiOperation,
} from "../domain/script-api.ts";
import { requestHeaderDeletionContract } from "./script-header-mutation.ts";
import { closedParameterArguments } from "./script-closed-functions.ts";
import { originalContextCompletionContract } from "./script-original-context.ts";
import { completionString } from "./script-string.ts";
import { resolvedPath, constantString } from "./script-bindings.ts";
import {
  valueSymbol,
  completionObjects,
  unusedPresenceProbe,
  classLocalThis,
} from "./script-analysis.ts";
type Problem = { api: string; reason: string; solution: string };
export interface ScriptApiReference {
  api: string;
  node: ts.Node;
  access: ScriptApiOperation["source"]["access"];
  call?: ts.CallExpression | ts.NewExpression;
  members: string[];
}
export function collectScriptApiReferences(
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
  aliases: Map<ts.Symbol, string>,
): ScriptApiReference[] {
  const references: ScriptApiReference[] = [];
  const localAliases = new Map(aliases);
  const walk = (n: ts.Node, fn: (n: ts.Node) => void) => {
    fn(n);
    ts.forEachChild(n, (c) => walk(c, fn));
  };
  // Codec constructor aliases are lexical bindings to the same operation.
  walk(tree, (n) => {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.initializer &&
      ts.isIdentifier(n.initializer) &&
      !valueSymbol(n.initializer, checker) &&
      ["TextEncoder", "TextDecoder", "atob", "btoa"].includes(
        n.initializer.text,
      ) &&
      ts.isVariableDeclarationList(n.parent) &&
      n.parent.flags & ts.NodeFlags.Const
    ) {
      const s = checker.getSymbolAtLocation(n.name);
      if (s) localAliases.set(s, n.initializer.text);
    }
  });
  walk(tree, (n) => {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.initializer
    ) {
      const api = resolvedPath(n.initializer, checker, localAliases);
      if (api === "$request.headers" || api === "$response.headers") {
        const symbol = checker.getSymbolAtLocation(n.name);
        if (symbol) localAliases.set(symbol, api);
      }
    }
  });
  const memberPath = (n: ts.Node): string[] => {
    if (ts.isCallExpression(n) || ts.isNewExpression(n))
      return memberPath(n.expression);
    if (ts.isPropertyAccessExpression(n))
      return [...memberPath(n.expression), n.name.text];
    if (ts.isElementAccessExpression(n))
      return [
        ...memberPath(n.expression),
        constantString(n.argumentExpression, checker) ??
          "<computed:" + n.argumentExpression.getText(tree).slice(0, 80) + ">",
      ];
    if (ts.isIdentifier(n))
      return (localAliases.get(valueSymbol(n, checker)!) ?? n.text).split(".");
    return [];
  };
  const apiRootNames = new Set([
    "WebAssembly",
    "Buffer",
    "require",
    "CompressionStream",
    "DecompressionStream",
    "globalThis",
    "window",
    "global",
    "eval",
    "Function",
    "Reflect",
    "fetch",
    "XMLHttpRequest",
    "URL",
    "URLSearchParams",
    "SharedArrayBuffer",
    "Atomics",
    "arguments",
  ]);
  const candidate = (api: string) =>
    api.startsWith("$") ||
    scriptApiDefinitions.some((d) =>
      Object.values(d.source).some(
        (key) => api === key || api.startsWith(key + "."),
      ),
    ) ||
    apiRootNames.has(api.split(/[.[]/, 1)[0]);
  const handled = new Set<ts.Node>();
  walk(tree, (n) => {
    if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
      let root: ts.Node = n.expression;
      while (
        ts.isPropertyAccessExpression(root) ||
        ts.isElementAccessExpression(root)
      )
        root = root.expression;
      const bound = ts.isIdentifier(root)
        ? valueSymbol(root, checker)
        : undefined;
      if (bound && !localAliases.has(bound)) return;
      const api = resolvedPath(n.expression, checker, localAliases);
      if (api && candidate(api)) {
        references.push({
          api,
          node: n,
          access: ts.isNewExpression(n) ? "construct" : "call",
          call: n,
          members: memberPath(n),
        });
        handled.add(n.expression);
      }
    }
    if (n.kind === ts.SyntaxKind.ThisKeyword) {
      if (classLocalThis(n)) return;
      let outer: ts.Node = n;
      while (
        (ts.isPropertyAccessExpression(outer.parent) ||
          ts.isElementAccessExpression(outer.parent)) &&
        outer.parent.expression === outer
      )
        outer = outer.parent;
      const call =
        ts.isCallExpression(outer.parent) && outer.parent.expression === outer
          ? outer.parent
          : undefined;
      references.push({
        api: outer.getText(tree),
        node: call ?? outer,
        access: call ? "call" : "read",
        ...(call ? { call } : {}),
        members: [],
      });
      return;
    }
    if (!ts.isIdentifier(n) || unusedPresenceProbe(n, tree, checker)) return;
    if (n.text === "arguments") {
      let owner: ts.Node | undefined = n.parent;
      while (
        owner &&
        !ts.isSourceFile(owner) &&
        !ts.isFunctionDeclaration(owner) &&
        !ts.isFunctionExpression(owner)
      )
        owner = owner.parent;
      if (owner && !ts.isSourceFile(owner)) return;
    }
    const bound = valueSymbol(n, checker);
    if (bound && !localAliases.has(bound)) return;
    if (
      (ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) ||
      (ts.isPropertyAssignment(n.parent) && n.parent.name === n) ||
      (ts.isVariableDeclaration(n.parent) && n.parent.name === n)
    )
      return;
    let outer: ts.Node = n;
    while (
      (ts.isPropertyAccessExpression(outer.parent) ||
        ts.isElementAccessExpression(outer.parent)) &&
      outer.parent.expression === outer
    )
      outer = outer.parent;
    if (handled.has(outer)) return;
    const api =
      resolvedPath(outer, checker, localAliases) ??
      (localAliases.has(bound!)
        ? localAliases.get(bound!) + "[<computed>]"
        : n.text.startsWith("$")
          ? outer.getText(tree).slice(0, 256)
          : null);
    if (!api || !candidate(api)) return;
    const parent = outer.parent;
    references.push({
      api,
      node: outer,
      access: ts.isDeleteExpression(parent)
        ? "delete"
        : ts.isBinaryExpression(parent) &&
            parent.left === outer &&
            parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment
          ? "write"
          : "read",
      members: memberPath(outer),
    });
  });
  return references;
}
export function parseScriptApiIR(
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
  aliases: Map<ts.Symbol, string>,
  from: ScriptClient,
  to: ScriptClient,
  options: { phase: string; binary?: boolean; responseBody?: boolean },
  problems: Problem[],
  headerQueries?: Map<
    ts.Symbol,
    { role: string; name: string; mode: "exact" | "prefix" }
  >,
): ScriptApiIR & { analysisSourceSha256: string } {
  const operations: ScriptApiOperation[] = [];
  const headerDeletion = requestHeaderDeletionContract(
    tree,
    checker,
    options.phase,
  );
  const originalContext = originalContextCompletionContract(tree, checker, {
    ...options,
    from,
  });
  const walk = (n: ts.Node, fn: (n: ts.Node) => void) => {
    fn(n);
    ts.forEachChild(n, (c) => walk(c, fn));
  };
  const objectFields = (
    n: ts.Expression | undefined,
  ): ts.ObjectLiteralExpression | null => {
    if (!n) return null;
    const args = closedParameterArguments(n, checker);
    if (args?.length === 1 && ts.isObjectLiteralExpression(args[0]))
      return args[0];
    if (ts.isObjectLiteralExpression(n)) return n;
    if (ts.isIdentifier(n)) {
      const d = valueSymbol(n, checker)?.valueDeclaration;
      if (
        d &&
        ts.isVariableDeclaration(d) &&
        d.initializer &&
        ts.isObjectLiteralExpression(d.initializer)
      )
        return d.initializer;
    }
    return null;
  };
  const names = (n: ts.Expression | undefined) =>
    objectFields(n)?.properties.flatMap((p) =>
      (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) &&
      (ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name))
        ? [p.name.text]
        : [],
    ) ?? [];
  const sourceLayout = scriptHostLayouts[from],
    targetLayout = scriptHostLayouts[to];
  const fieldsFor = (
    kind: string,
    call: ts.CallExpression | ts.NewExpression | undefined,
  ): NonNullable<ScriptApiOperation["fields"]> => {
    if (!call) return [];
    if (kind === "http") {
      const object = objectFields(call.arguments?.[0]);
      if (!object) return [];
      const fields: NonNullable<ScriptApiOperation["fields"]> = [];
      const sourceKeys: Record<string, string> = {
        [sourceLayout.http.redirect]: "redirect",
        [sourceLayout.http.cookie]: "cookie",
        [sourceLayout.http.tls]: "tls",
        [sourceLayout.http.policy]: "policy",
        timeout: "timeout",
      };
      const mapping: Record<string, string | null> = {
        redirect: targetLayout.http.redirect,
        cookie: targetLayout.http.cookie,
        tls: targetLayout.http.tls,
        policy: targetLayout.http.policy,
        timeout: targetLayout.http.timeoutMs === null ? null : "timeout",
      };
      const add = (key: string, prefix = "") => {
        const sourceQx = sourceLayout.http.style === "promise";
        const sourceKnown = sourceQx
          ? prefix
            ? [
                sourceLayout.http.redirect,
                sourceLayout.http.cookie,
                sourceLayout.http.tls,
                sourceLayout.http.policy,
              ].includes(key)
            : ["url", "method", "headers", "body"].includes(key)
          : !prefix &&
            (key in sourceKeys || ["url", "headers", "body"].includes(key));
        const semantic =
          sourceKeys[key] ??
          (["url", "method", "headers", "body"].includes(key)
            ? key
            : "unknown");
        const qxUnknown =
          (sourceQx && !sourceKnown) || (to === "qx" && !sourceKnown);
        const destination = !sourceKnown
          ? null
          : semantic in mapping
            ? mapping[semantic]
            : semantic;
        const omit = qxUnknown || (destination === null && to === "qx");
        fields.push({
          source: prefix + key,
          canonical: "http." + semantic,
          target:
            destination === null
              ? null
              : (targetLayout.http.optionsRoot && semantic in mapping
                  ? targetLayout.http.optionsRoot + "."
                  : "") + destination,
          action: omit
            ? "omit"
            : !sourceKnown || destination === null
              ? "unresolved"
              : "map",
          ...(semantic === "timeout" &&
          sourceKnown &&
          !omit &&
          sourceLayout.http.timeoutMs &&
          targetLayout.http.timeoutMs
            ? {
                transform:
                  "multiply " +
                  sourceLayout.http.timeoutMs +
                  "/" +
                  targetLayout.http.timeoutMs,
              }
            : {}),
          ...(semantic === "policy" && !omit
            ? {
                transform:
                  sourceLayout.http.directPolicy +
                  " -> " +
                  targetLayout.http.directPolicy +
                  " for builtin only; named policies unchanged",
              }
            : {}),
        });
      };
      for (const p of object.properties) {
        if (
          !ts.isPropertyAssignment(p) ||
          !(ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name))
        )
          continue;
        const key = p.name.text;
        if (sourceLayout.http.optionsRoot === key) {
          for (const k of names(p.initializer)) add(k, key + ".");
        } else add(key);
      }
      return fields;
    }
    if (kind === "completion") {
      if (ts.isCallExpression(call) && originalContext.calls.has(call))
        return [
          {
            source: "argument0",
            canonical: "complete.pass-original",
            target: from === to ? "argument0 (original context)" : "{}",
            action: "map",
            transform:
              from === to
                ? "native original response completion"
                : "untouched original response; omit redundant header/body/status replacement",
          },
        ];

      const objects = call.arguments?.[0]
        ? completionObjects(call.arguments[0], tree, checker)
        : null;
      if (
        !objects &&
        from === "qx" &&
        options.phase === "response" &&
        options.responseBody &&
        !options.binary &&
        call.arguments?.[0] &&
        completionString(call.arguments[0], tree, checker, aliases)
      )
        return [
          {
            source: "argument0",
            canonical: "complete.text-or-pass",
            target: "body",
            action: "map",
          },
        ];
      const fields: NonNullable<ScriptApiOperation["fields"]> = [];
      const sourceEcho =
        sourceLayout.completion.synthetic === "flat" &&
        options.phase === "echo";
      const add = (key: string, prefix = "") => {
        const canonical =
          key === "status" || key === "statusCode"
            ? "status"
            : key === "bodyBytes"
              ? "body.bytes"
              : key;
        const known = [
          "body",
          "bodyBytes",
          "headers",
          "status",
          "statusCode",
          "url",
          "abort",
        ].includes(key);
        const field =
          key === "statusCode"
            ? "status"
            : key === "bodyBytes"
              ? targetLayout.binaryField
              : key;
        const targetPrefix =
          prefix === "response." && targetLayout.completion.synthetic === "flat"
            ? ""
            : sourceEcho && targetLayout.completion.synthetic === "response"
              ? "response."
              : prefix;
        fields.push({
          source: prefix + key,
          canonical:
            "complete." +
            (prefix === "response." || sourceEcho ? "response." : "") +
            canonical,
          target: known ? targetPrefix + field : null,
          action: known ? "map" : "unresolved",
          ...(key === "status" || key === "statusCode"
            ? {
                transform:
                  targetLayout.completion.statusEncoding === "line"
                    ? "parse status then format HTTP status line"
                    : "parse status to Number",
              }
            : {}),
          ...(key === "bodyBytes"
            ? {
                transform:
                  targetLayout.binaryField === "body"
                    ? "exact ArrayBuffer -> Uint8Array"
                    : "exact ArrayBuffer",
              }
            : {}),
          ...(key === "body"
            ? {
                cases: [
                  {
                    when: "String",
                    target: targetPrefix + "body",
                    transform: "identity",
                  },
                  {
                    when: "Uint8Array or ArrayBuffer",
                    target: targetPrefix + targetLayout.binaryField,
                    transform: "preserve exact byteOffset/byteLength",
                  },
                ],
              }
            : {}),
        });
      };
      for (const object of objects ?? [])
        for (const p of object.properties) {
          if (
            !(
              ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)
            ) ||
            !(ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name))
          )
            continue;
          if (p.name.text === "response" && ts.isPropertyAssignment(p)) {
            for (const key of names(p.initializer)) add(key, "response.");
          } else add(p.name.text);
        }
      return fields.filter(
        (f, i) =>
          fields.findIndex(
            (x) => x.source === f.source && x.target === f.target,
          ) === i,
      );
    }
    if (kind === "storage") {
      const api = resolvedPath(call.expression, checker, aliases) ?? "";
      const read = api.endsWith(".read") || api.endsWith(".valueForKey");
      const remove = api.endsWith(".removeValueForKey");
      const value = call.arguments?.[0];
      const literalDeletion =
        !read &&
        !remove &&
        sourceLayout.store.style === "store" &&
        value &&
        (value.kind === ts.SyntaxKind.NullKeyword ||
          (sourceLayout.store.undefinedDeletes &&
            ts.isIdentifier(value) &&
            value.text === "undefined" &&
            !valueSymbol(value, checker)));
      const targetRemove =
        (remove || literalDeletion) && targetLayout.store.remove !== null;
      const fields: NonNullable<ScriptApiOperation["fields"]> = (
        call.arguments ?? []
      ).map((_, index) => ({
        source: "argument" + index,
        canonical:
          "storage." + (read || remove || index === 1 ? "key" : "value"),
        target: targetRemove
          ? remove || index === 1
            ? "argument0"
            : null
          : remove
            ? "argument1"
            : literalDeletion && index === 0
              ? "argument0=null"
              : "argument" + index,
        action: targetRemove && !remove && index === 0 ? "omit" : "map",
      }));
      if (remove && !targetRemove)
        fields.unshift({
          source: "<deletion marker>",
          canonical: "storage.delete",
          target: "argument0=null",
          action: "map",
        });
      return fields;
    }
    if (kind === "notification") {
      const fields: NonNullable<ScriptApiOperation["fields"]> = [];
      for (let index = 0; index < (call.arguments?.length ?? 0); index++) {
        if (index < 3) {
          fields.push({
            source: "argument" + index,
            canonical: ["notify.title", "notify.subtitle", "notify.body"][
              index
            ],
            target: "argument" + index,
            action: "map",
          });
          continue;
        }
        if (omitScriptNotificationOptions(from, to)) {
          fields.push({
            source: "argument" + index,
            canonical: "notify.options",
            target: null,
            action: "omit",
          });
          continue;
        }
        const argument = call.arguments![index];
        if (index === 3) {
          const object = objectFields(argument);
          if (object) {
            for (const key of names(argument)) {
              const canonical =
                key === sourceLayout.notification.open
                  ? "openURL"
                  : key === sourceLayout.notification.media
                    ? "mediaURL"
                    : key === sourceLayout.notification.action
                      ? "action"
                      : "unknown";
              const target =
                canonical === "openURL"
                  ? targetLayout.notification.open
                  : canonical === "mediaURL"
                    ? targetLayout.notification.media
                    : canonical === "action"
                      ? (targetLayout.notification.action ??
                        "<implicit-open-url>")
                      : null;
              fields.push({
                source: "argument3." + key,
                canonical: "notify." + canonical,
                target: target ? "argument3." + target : null,
                action: target ? "map" : "unresolved",
              });
            }
          } else if (
            sourceLayout.notification.stringLink &&
            constantString(argument, checker) !== null
          )
            fields.push({
              source: "argument3",
              canonical: "notify.openURL",
              target: "argument3." + targetLayout.notification.open,
              action: "map",
            });
          else
            fields.push({
              source: "argument3",
              canonical: "notify.options",
              target: null,
              action: "unresolved",
            });
        } else
          fields.push({
            source: "argument" + index,
            canonical: "notify.delay",
            target: null,
            action:
              ts.isNumericLiteral(argument) && Number(argument.text) === 0
                ? "omit"
                : "unresolved",
          });
      }
      return fields;
    }
    return [];
  };
  const emit = (
    api: string,
    node: ts.Node,
    access: ScriptApiOperation["source"]["access"],
    call?: ts.CallExpression | ts.NewExpression,
    members: string[] = [],
  ) => {
    const definitions = scriptApiDefinitions.filter((d) => {
      const key = d.source[from];
      if (!key) return false;
      if (
        d.selector === "original-context" &&
        (!call ||
          !ts.isCallExpression(call) ||
          !originalContext.calls.has(call))
      )
        return false;
      if (d.selector === "deletion-marker") {
        const value = call?.arguments?.[0];
        if (
          !value ||
          !(
            value.kind === ts.SyntaxKind.NullKeyword ||
            (sourceLayout.store.undefinedDeletes &&
              ts.isIdentifier(value) &&
              value.text === "undefined" &&
              !valueSymbol(value, checker))
          )
        )
          return false;
      }
      const matches =
        api === key || api.startsWith(key + ".") || api.startsWith(key + "[");
      if (d.id.endsWith(".context")) return api === key;
      if (d.kind === "header")
        return (
          matches &&
          api !== key &&
          d.id.endsWith(
            "." +
              (access === "write"
                ? "write"
                : access === "delete"
                  ? "delete"
                  : "lookup"),
          )
        );
      return matches;
    });
    const principal = options.phase === "response" ? "response" : "request";
    definitions.sort((a, b) => {
      const binary = (d: typeof a) =>
        d.id.endsWith(".bytes") &&
        (api.endsWith(".bodyBytes") ||
          (options.binary && d.id.startsWith(principal + ".")))
          ? 1
          : 0;
      return (
        binary(b) - binary(a) ||
        Number(Boolean(b.selector)) - Number(Boolean(a.selector)) ||
        Number(b.kind === "header") - Number(a.kind === "header") ||
        (b.source[from]?.length ?? 0) - (a.source[from]?.length ?? 0)
      );
    });
    const definition = definitions[0];
    const related = problems.filter(
      (p) =>
        p.api === api ||
        api.startsWith(p.api + ".") ||
        api.startsWith(p.api + "[") ||
        p.api.startsWith(api + ".") ||
        (definition?.kind === "http" &&
          ["$task", "$httpClient"].includes(p.api)) ||
        ((definition?.kind === "header" ||
          definition?.id.endsWith("headers")) &&
          /header/i.test(p.api)) ||
        (definition?.kind === "completion" && p.api.startsWith("$done")),
    );
    let target = definition?.target?.[to] ?? definition?.source[to] ?? null;
    // Modified: 2026-11-02 (chance). Native original-context completion keeps
    // its source API; authorized foreign hosts use the empty modification form.
    if (definition?.selector === "original-context" && from === to)
      target = "$done";
    if (definition?.kind === "http" && targetLayout.http.style === "callback") {
      let method = api.startsWith("$httpClient.")
        ? api.split(".").at(-1)
        : null;
      const object = objectFields(call?.arguments?.[0]);
      const field = object?.properties.find(
        (p) =>
          ts.isPropertyAssignment(p) &&
          p.name.getText(tree).replace(/^['"]|['"]$/g, "") === "method",
      );
      if (!method && field && ts.isPropertyAssignment(field))
        method =
          constantString(field.initializer, checker) ?? "<dynamic-method>";
      if (!method && (!call || !object)) method = "<request-method>";
      target = targetLayout.http.root + "." + (method ?? "GET").toLowerCase();
    }
    if (
      definition?.kind === "storage" &&
      definition.id === "storage.remove" &&
      targetLayout.store.style === "store"
    )
      target = "$persistentStore.write(null,key)";
    if (
      definition?.id === "storage.write" &&
      sourceLayout.store.style === "store"
    ) {
      const value = call?.arguments?.[0];
      if (
        value &&
        (value.kind === ts.SyntaxKind.NullKeyword ||
          (sourceLayout.store.undefinedDeletes &&
            ts.isIdentifier(value) &&
            value.text === "undefined" &&
            !valueSymbol(value, checker)))
      )
        target = targetLayout.store.remove
          ? "$prefs." + targetLayout.store.remove
          : "$persistentStore.write(null,key)";
    }
    const location = tree.getLineAndCharacterOfPosition(node.getStart(tree));
    const omitted = definition?.kind === "argument" && to === "qx";
    const fields = fieldsFor(definition?.kind ?? "", call);
    if (headerDeletion.ok && definition?.id === "request.header.delete")
      for (const name of headerDeletion.names)
        fields.push({
          source: "computed key",
          canonical: "header.delete-ci:" + name,
          target: name,
          action: "map",
          transform:
            "delete all matching names in a detached singleton String dictionary",
        });
    if (
      definition?.kind === "header" &&
      ts.isElementAccessExpression(node) &&
      ts.isIdentifier(node.argumentExpression)
    ) {
      const query = headerQueries?.get(
        valueSymbol(node.argumentExpression, checker)!,
      );
      if (query)
        fields.push({
          source: node.argumentExpression.text,
          canonical: "header." + query.mode + ":" + query.name,
          target: query.name,
          action: related.length ? "unresolved" : "map",
        });
    }
    operations.push({
      id: access + ":" + node.getStart(tree),
      rule: definition?.id ?? null,
      kind: definition?.kind ?? "unmapped",
      source: {
        api,
        start: node.getStart(tree),
        end: node.end,
        line: location.line + 1,
        column: location.character + 1,
        access,
        memberPath: members.slice(
          definition?.source[from]?.split(".").length ?? 1,
        ),
      },
      canonical: definition?.canonical ?? null,
      value: definition?.value ?? null,
      target: {
        api: target,
        lowering: definition?.id.endsWith(".bytes")
          ? "read target " +
            targetLayout.binaryField +
            "; expose source " +
            sourceLayout.binaryField +
            " as " +
            (sourceLayout.binaryField === "bodyBytes"
              ? "ArrayBuffer"
              : "Uint8Array") +
            " with exact byte view, then run original memberPath"
          : (definition?.lowering ??
            "No semantic mapping is registered for this source operation"),
        proof: definition?.proof ?? "add-explicit-source-and-target-contract",
      },
      ...(fields.length ? { fields } : {}),
      decision:
        from === to
          ? "native"
          : related.length
            ? "requires-proof"
            : omitted
              ? "omitted"
              : definition && target
                ? "mapped"
                : "unmapped",
      diagnostics: related,
    });
  };
  for (const reference of collectScriptApiReferences(tree, checker, aliases))
    emit(
      reference.api,
      reference.node,
      reference.access,
      reference.call,
      reference.members,
    );
  return {
    version: 1,
    sourceClient: from,
    targetClient: to,
    sourceView: "analysis-input",
    analysisSourceSha256: crypto
      .createHash("sha256")
      .update(tree.text)
      .digest("hex"),
    operations,
    diagnostics: problems,
  };
}
