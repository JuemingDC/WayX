// Modified: 2026-11-02 (chance). Concrete API occurrences lower through one
// semantic IR and target plan; lexical proofs remain separate from API mappings.
import { parseScriptApiIR } from "./script-api-ir.ts";
import { emitScriptApiPlan } from "../emit/script-api-plan.ts";
import { scriptKnownFields } from "../domain/script-api.ts";
// Modified: 2026-11-02 (chance). Map documented optional notifications separately from HTTP options.
import { notificationContract } from "./script-notification.ts";
// Modified: 2026-11-01 (chance). Inspect JavaScript syntax rather than replacing API names in strings/comments; only emit adapters for a documented bounded contract.
import ts from "typescript";
import { codecContract } from "./script-codecs.ts";
import { scriptCodecs } from "../emit/script-codecs.ts";
import { optionalScriptParameters } from "./script-parameters.ts";
import { argumentContract, type ArgumentSchema } from "./script-argument.ts";
import {
  contextAliases,
  resolvedPath,
  constantString,
  storageString,
} from "./script-bindings.ts";
import { completionString } from "./script-string.ts";
import { qxTaskContract } from "./script-task.ts";
import { callbackHttpContract } from "./script-http.ts";
import { readonlyHeaderContract } from "./script-headers.ts";
import {
  scriptChecker,
  safePresenceUse,
  safeContextMemberGuard,
  unusedPresenceProbe,
  classLocalThis,
  completionObjects,
  valueSymbol,
  safeStorageRead,
} from "./script-analysis.ts";
import { scriptApiRuntime } from "../emit/script-api-runtime.ts";
export type ScriptPlatform = "qx" | "loon" | "surge" | "egern";
export type ApiOptions = {
  from: ScriptPlatform;
  to: ScriptPlatform;
  phase: "request" | "response" | "echo" | "task" | "network" | "generic";
  name?: string;
  binary?: boolean;
  responseBody?: boolean;
  argumentSchema?: ArgumentSchema;
  sourceUrl?: string;
};
export type ApiProblem = { api: string; reason: string; solution: string };
const gaps: Record<string, [string, string]> = {
  $task: [
    "QX fetch input/Promise/await response or error data flow is outside the proven closed-field subset",
    "Use a proven literal or closed-const request, closed response fields and Boolean-only failures; undocumented QX parameters are omitted without errors on every host",
  ],
  $httpClient: [
    "HTTP request/callback/error/header or binary data flow is outside the currently proven subset",
    "Use literal verified request/result shapes; target QX omits undocumented request options without errors, preserves all seven methods and never fakes cancellation",
  ],
  $configuration: [
    "QX message actions operate on client-specific configuration, DNS caches and traffic state",
    "Implement only actions backed by a target control API and preserve async result/error shapes; retain native scripts otherwise",
  ],
  $config: [
    "Loon has synchronous config reads/batch setters that have no universal target equivalent",
    "Use target-specific native implementations; do not turn synchronous return values into Promises",
  ],
  $surge: [
    "Surge controls and HTTP API endpoints have client-specific state and permissions",
    "Provide separate target control modules; no fake success return values",
  ],
  $httpAPI: [
    "Surge local control endpoints are not a portable JavaScript API",
    "Map individual documented endpoints or retain the source client",
  ],
  $dns: [
    "Query protocols/server selection/cache/TTL/error codes are not equivalent across clients",
    "Preserve DNS protocol and server options in a target-specific implementation; external DoH is a behavioral change",
  ],
  $crypto: [
    "Loon synchronous AES and target WebCrypto promises/modes/padding/tag layout differ",
    "Implement a verified synchronous AES library with NIST vectors or refactor async callers; do not replace with WebCrypto transparently",
  ],
  $utils: [
    "GeoIP/ASN databases, gzip format and decompression failure/size behavior differ",
    "Keep database provenance; verify byte/error/limit contracts for every tool separately",
  ],
  $environment: [
    "Device metadata, sourcePath, parameters and configuration fields differ by host",
    "Map fields individually with the original source URL and actual host context; never fabricate another client's version/device data",
  ],
  $loon: [
    "Loon runtime identity string cannot be inferred from another application's version",
    "Keep environment branches native or resolve them with verified source/target branches",
  ],
};
function propertyPath(node: ts.Node): string | null {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) {
    const p = propertyPath(node.expression);
    return p ? p + "." + node.name.text : null;
  }
  if (ts.isElementAccessExpression(node)) {
    const p = propertyPath(node.expression),
      a = node.argumentExpression;
    return p && a && ts.isStringLiteralLike(a) ? p + "." + a.text : null;
  }
  return null;
}
function memberName(n: ts.Node): string | null {
  return ts.isPropertyAccessExpression(n)
    ? n.name.text
    : ts.isElementAccessExpression(n) &&
        ts.isStringLiteralLike(n.argumentExpression)
      ? n.argumentExpression.text
      : null;
}
export function inspectScriptApis(source: string) {
  const tree = ts.createSourceFile(
    "upstream.js",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  // Modified: 2026-11-02 (chance). Local bindings and harmless context guards are not foreign host API calls.
  const checker = scriptChecker(tree);
  const contexts = contextAliases(tree, checker);
  const paths = new Set<string>(),
    calls: { api: string; node: ts.CallExpression }[] = [],
    problems: ApiProblem[] = [];
  const add = (api: string, reason: string, solution: string) =>
    problems.push({ api, reason, solution });
  function visit(node: ts.Node) {
    if (node.kind === ts.SyntaxKind.ThisKeyword && !classLocalThis(node))
      add(
        "this",
        "Dynamic receiver access requires scope/data-flow proof",
        "Keep native or resolve the receiver before adaptation",
      );
    if (
      ts.isWithStatement(node) ||
      ts.isImportDeclaration(node) ||
      ts.isImportEqualsDeclaration(node)
    )
      add(
        "dynamic-module",
        "Dynamic scope/imports cannot be audited by a lexical adapter",
        "Bundle the module with preserved semantics and audit dependencies separately",
      );
    if (
      ts.isNewExpression(node) &&
      node.expression.getText(tree) === "Function"
    )
      add(
        "Function",
        "Dynamic code can access unadapted host globals",
        "Remove dynamic code or provide a separately verified native implementation",
      );
    if (ts.isCallExpression(node)) {
      const api = resolvedPath(node.expression, checker, contexts.aliases);
      let root: ts.Expression = node.expression;
      while (
        ts.isPropertyAccessExpression(root) ||
        ts.isElementAccessExpression(root)
      )
        root = root.expression;
      const bound = ts.isIdentifier(root)
        ? checker.getSymbolAtLocation(root)
        : null;
      if (
        api &&
        (contexts.aliases.has(bound!) ||
          !bound?.declarations?.some((d) => d.getSourceFile() === tree))
      )
        calls.push({ api, node });
      if (api === "eval" || api?.startsWith("Reflect."))
        add(
          api,
          "Dynamic lookup cannot be proven safe by a finite static inventory",
          "Audit the evaluated program/property targets explicitly",
        );
    }
    if (
      (ts.isPropertyAccessExpression(node) ||
        ts.isElementAccessExpression(node)) &&
      (memberName(node) === "constructor" ||
        memberName(node.expression) === "constructor")
    ) {
      const parent = node.parent;
      if (
        memberName(node.expression) === "constructor" ||
        (memberName(node) === "constructor" &&
          ((ts.isCallExpression(parent) && parent.expression === node) ||
            (ts.isNewExpression(parent) && parent.expression === node) ||
            (ts.isTaggedTemplateExpression(parent) && parent.tag === node) ||
            (ts.isVariableDeclaration(parent) && parent.initializer === node) ||
            (ts.isBinaryExpression(parent) && parent.right === node)))
      )
        add(
          "function-constructor",
          "Constructor reflection can compile uninspected code",
          "Retain native or resolve the exact constructor and call before adaptation",
        );
    }
    if (
      ts.isPropertyAccessExpression(node) &&
      ["caller", "callee"].includes(node.name.text)
    )
      add(
        "function-reflection",
        "Caller/callee identity changes across wrappers and strict modules",
        "Retain native or replace reflective control flow with explicit functions",
      );
    if (ts.isIdentifier(node)) {
      if (
        ["setTimeout", "setInterval"].includes(node.text) &&
        (ts.isVariableDeclaration(node.parent) ||
          ts.isParameter(node.parent)) &&
        node.parent.name === node
      )
        add(
          node.text,
          "Source declares/shadows an injected timer binding",
          "Resolve the lexical binding before timer adaptation",
        );
      if (node.text === "arguments") {
        let parent: ts.Node | undefined = node.parent;
        while (
          parent &&
          !ts.isFunctionDeclaration(parent) &&
          !ts.isFunctionExpression(parent)
        )
          parent = parent.parent;
        if (!parent)
          add(
            "arguments",
            "Top-level host invocation arguments are not a portable contract",
            "Use explicit script arguments rather than the host call frame",
          );
      }
      const local = valueSymbol(node, checker);
      // Modified: 2026-11-02 (chance). Keep author aliases untouched while
      // inventorying their original mapped context fields and pure guards.
      if (contexts.initializers.has(node)) {
        ts.forEachChild(node, visit);
        return;
      }
      if (local && contexts.aliases.has(local)) {
        if (
          ts.isVariableDeclaration(node.parent) &&
          node.parent.name === node
        ) {
          ts.forEachChild(node, visit);
          return;
        }
        if (!safePresenceUse(node)) {
          let outer: ts.Node = node;
          while (
            (ts.isPropertyAccessExpression(outer.parent) ||
              ts.isElementAccessExpression(outer.parent)) &&
            outer.parent.expression === outer
          )
            outer = outer.parent;
          const path = resolvedPath(outer, checker, contexts.aliases);
          if (path) paths.add(path);
          else
            add(
              contexts.aliases.get(local)!,
              "Computed API property cannot be resolved statically",
              "Use a static mapped context member or retain the native script",
            );
        }
        ts.forEachChild(node, visit);
        return;
      }
      // Bound ordinary variables (including minified $e/$t) remain ordinary JS.
      // Shadowed injected top-level bindings are still rejected by syntax/gates.
      if (
        local?.declarations?.some((d) => d.getSourceFile() === tree) &&
        !["setTimeout", "setInterval"].includes(node.text)
      ) {
        ts.forEachChild(node, visit);
        return;
      }
      if (unusedPresenceProbe(node, tree, checker)) {
        ts.forEachChild(node, visit);
        return;
      }
      if (
        [
          "$request",
          "$response",
          "$script",
          "$persistentStore",
          "$prefs",
          "$notification",
          "$notify",
        ].includes(node.text) &&
        (safePresenceUse(node) || safeContextMemberGuard(node, checker))
      ) {
        ts.forEachChild(node, visit);
        return;
      }
      const name = node.text,
        isProperty =
          (ts.isPropertyAccessExpression(node.parent) &&
            node.parent.name === node) ||
          (ts.isPropertyAssignment(node.parent) && node.parent.name === node);
      if (
        !isProperty &&
        /^(?:globalThis|window|global|require|eval|Function|Reflect|fetch|XMLHttpRequest|WebAssembly|TextEncoder|TextDecoder|URL|URLSearchParams|Buffer|crypto|CompressionStream|DecompressionStream|atob|btoa|SharedArrayBuffer|Atomics|DOMException)$/.test(
          name,
        )
      )
        add(
          name,
          "Direct host/global access bypasses lexical API bindings",
          "Keep native or build a verified host-specific adapter; do not perform textual replacement",
        );
      if (!isProperty && name.startsWith("$") && name.length > 1) {
        let outer: ts.Node = node;
        while (
          (ts.isPropertyAccessExpression(outer.parent) ||
            ts.isElementAccessExpression(outer.parent)) &&
          outer.parent.expression === outer
        )
          outer = outer.parent;
        // Modified: 2026-11-02 (chance). Inventory proven const keys/tables,
        // not dynamic decoder calls; keep author evaluation/source untouched.
        const p = resolvedPath(outer, checker, contexts.aliases);
        if (p) paths.add(p);
        else
          add(
            name,
            "Computed API property cannot be resolved statically",
            "Use a static property name or retain the native script",
          );
        if (
          (ts.isVariableDeclaration(node.parent) ||
            ts.isParameter(node.parent) ||
            ts.isFunctionDeclaration(node.parent)) &&
          node.parent.name === node
        )
          add(
            name,
            "Source declares/shadows a platform global",
            "Resolve the lexical scope before adaptation",
          );
        if (
          outer === node &&
          !(
            ts.isCallExpression(node.parent) && node.parent.expression === node
          ) &&
          !ts.isTypeOfExpression(node.parent)
        )
          add(
            name,
            "Bare platform-object aliases require data-flow proof",
            "Access the documented member directly or keep this program native",
          );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  for (const d of (tree as any).parseDiagnostics ?? [])
    add(
      "syntax",
      ts.flattenDiagnosticMessageText(d.messageText, " "),
      "Preserve the raw script and repair syntax before conversion",
    );
  return {
    tree,
    checker,
    contextAliases: contexts.aliases,
    paths: [...paths].sort(),
    calls,
    problems,
  };
}
// Modified: 2026-11-01 (chance). Egern modules are strict; reject observable sloppy-script constructs before putting legacy code inside an ES module.
function moduleStrictnessProblems(tree: ts.SourceFile): ApiProblem[] {
  const problems: ApiProblem[] = [];
  const add = (reason: string) =>
    problems.push({
      api: "module-strictness",
      reason,
      solution:
        "Declare variables and remove sloppy-only constructs, or retain the source runtime",
    });
  const checker = scriptChecker(tree);
  const written = (n: ts.Node) => {
    if (ts.isParenthesizedExpression(n)) {
      written(n.expression);
      return;
    }
    if (ts.isArrayLiteralExpression(n)) {
      for (const e of n.elements)
        written(ts.isSpreadElement(e) ? e.expression : e);
      return;
    }
    if (ts.isObjectLiteralExpression(n)) {
      for (const p of n.properties) {
        if (ts.isPropertyAssignment(p)) written(p.initializer);
        else if (ts.isShorthandPropertyAssignment(p)) written(p.name);
        else if (ts.isSpreadAssignment(p)) written(p.expression);
      }
      return;
    }
    if (
      ts.isIdentifier(n) &&
      (!checker.getSymbolAtLocation(n) ||
        ["undefined", "NaN", "Infinity"].includes(n.text))
    )
      add(
        "Undeclared/global write changes behavior in Egern strict modules: " +
          n.text,
      );
  };
  const visit = (n: ts.Node) => {
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      n.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    )
      written(n.left);
    if (
      (ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) &&
      (n.operator === ts.SyntaxKind.PlusPlusToken ||
        n.operator === ts.SyntaxKind.MinusMinusToken)
    )
      written(n.operand);
    if (ts.isForInStatement(n) || ts.isForOfStatement(n))
      written(n.initializer);
    if (ts.isDeleteExpression(n) && ts.isIdentifier(n.expression))
      add("Deleting an identifier is forbidden in strict modules");
    if (ts.isNumericLiteral(n) && /^0[0-9]/.test(n.getText(tree)))
      add("Legacy octal/leading-zero literal is not strict-compatible");
    if (ts.isStringLiteral(n)) {
      const raw = n.getText(tree);
      for (let i = 1; i < raw.length - 1; i++)
        if (raw[i] === "\\") {
          i++;
          if (
            /[1-7]/.test(raw[i]) ||
            (raw[i] === "0" && /[0-9]/.test(raw[i + 1] ?? ""))
          )
            add("Legacy octal string escape is not strict-compatible");
        }
    }
    if (
      ts.isIdentifier(n) &&
      ["eval", "arguments"].includes(n.text) &&
      (ts.isVariableDeclaration(n.parent) ||
        ts.isParameter(n.parent) ||
        ts.isFunctionDeclaration(n.parent)) &&
      n.parent.name === n
    )
      add("Reserved strict-mode binding: " + n.text);
    if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n)) {
      const names = n.parameters.map((p) => p.name.getText(tree));
      if (new Set(names).size !== names.length)
        add("Duplicate function parameters are not strict-compatible");
    }
    ts.forEachChild(n, visit);
  };
  visit(tree);
  return problems;
}
export function planScriptApiConversion(source: string, options: ApiOptions) {
  const inventory = inspectScriptApis(source),
    problems = [...inventory.problems],
    features = inventory.paths;
  const codecs = codecContract(inventory.tree, inventory.checker);
  if (codecs.ok)
    for (let i = problems.length - 1; i >= 0; i--)
      if (codecs.names.includes(problems[i].api)) problems.splice(i, 1);
  const argsContract = argumentContract(
    inventory.tree,
    inventory.checker,
    options.argumentSchema,
    options.from,
    options.to,
  );
  if (argsContract.ok)
    for (let i = problems.length - 1; i >= 0; i--)
      if (problems[i].api === "$argument") problems.splice(i, 1);
  const taskContract = qxTaskContract(
    inventory.tree,
    inventory.checker,
    options.from,
    options.to,
  );
  if (options.from === options.to) {
    const operationIR = parseScriptApiIR(
      inventory.tree,
      inventory.checker,
      inventory.contextAliases,
      options.from,
      options.to,
      options,
      [],
    );
    return {
      status: "native" as const,
      problems: [] as ApiProblem[],
      features: [] as string[],
      code: source,
      operationIR,
      contract: {
        apiPlan: emitScriptApiPlan(operationIR),
        ...(codecs.ok ? { portableCodecs: codecs.names } : {}),
        ...(taskContract.ok
          ? {
              httpTask: true,
              httpTaskBinary: taskContract.binary,
              httpIgnoredOptions: taskContract.ignoredOptions,
            }
          : {}),
      },
    };
  }
  // Modified: 2026-11-02 (chance). Grant only proven readonly headers and explicit callback HTTP options.
  const headerContract = readonlyHeaderContract(
    inventory.tree,
    inventory.checker,
    inventory.contextAliases,
  );
  const httpContract = callbackHttpContract(
    inventory.tree,
    inventory.checker,
    options.from,
    options.to,
  );
  if (options.to === "egern" && options.from !== "egern")
    problems.push(...moduleStrictnessProblems(inventory.tree));
  const identifiers = new Set<string>();
  const collect = (n: ts.Node) => {
    if (ts.isIdentifier(n)) identifiers.add(n.text);
    ts.forEachChild(n, collect);
  };
  collect(inventory.tree);
  const fresh = (base: string) => {
    let name = base;
    while (identifiers.has(name)) name += "_";
    identifiers.add(name);
    return name;
  };
  const ctxBinding = fresh("__wayxContext"),
    entryBinding = fresh("__wayxEgernEntry"),
    // Modified: 2026-11-02 (chance). Keep legacy CLI bridges capture-free too.
    hostBinding = fresh("__wayxHost");
  const parameterTail = optionalScriptParameters(fresh, {
    $httpClient: httpContract.ok,
    $task: taskContract.ok,
    $argument: argsContract.ok,
    ...Object.fromEntries(
      (codecs.ok ? codecs.names : []).map((n) => [n, true]),
    ),
  });
  const add = (api: string, reason: string, solution: string) =>
    problems.push({ api, reason, solution });
  const allowedFields = scriptKnownFields();
  for (const api of features) {
    const [root, field] = api.split(".");
    if (root === "$httpClient" && httpContract.ok) continue;
    if (root === "$task" && taskContract.ok) continue;
    if (gaps[root]) {
      const [reason, solution] = gaps[root];
      add(root, reason, solution);
      continue;
    }
    if (root === "$argument") {
      if (argsContract.ok) continue;
      add(
        root,
        "Source argument schema is missing, ambiguous, or its use is unsafe after QX omission",
        "Bind arguments at declaration generation with exact types/defaults; do not serialize objects into an assumed equivalent string",
      );
      continue;
    }
    if (["$done", "$notify"].includes(root)) continue;
    if (!allowedFields[root] || !field || !allowedFields[root].has(field))
      add(
        api,
        "API/member is outside the documented portable subset",
        "Add an explicit contract and independent tests; retain the raw backup meanwhile",
      );
    if (root === "$script" && options.from === "qx")
      add(
        api,
        "QX has no documented equivalent of this $script field",
        "Use a documented source context field",
      );
    if (api === "$script.startTime" && ["egern", "qx"].includes(options.to))
      add(
        api,
        "The target does not expose an equivalent source run-start timestamp",
        "Retain native timing-sensitive scripts or accept an explicitly changed timing origin",
      );
    if (field === "bodyBytes" && options.from !== "qx")
      add(
        api,
        "bodyBytes is a QX ArrayBuffer field; callback hosts use body/Uint8Array",
        "Use source binary-body mode and the correct host field",
      );
  }
  if (
    !headerContract.ok &&
    features.some((p) => /^\$(?:request|response)\.headers(?:\.|$)/.test(p))
  )
    add(
      "headers-shape",
      "Callback hosts do not document identical header casing, duplicate-field or enumeration behavior",
      "Use a target-native header implementation or establish the exact header object contract on real clients",
    );
  if (features.some((p) => p.startsWith("$script.name")) && !options.name)
    add(
      "$script.name",
      "The source script tag/default name was not established",
      "Bind the original Script v2 tag rather than using a renamed target script identifier",
    );
  // Egern's current API is a module/async ctx model, not a Surge-compatible global object.
  let entry: string | null = null;
  if (options.from === "egern") {
    if (features.length)
      add(
        "Egern globals",
        "Current Egern scripts use ctx, not callback-host globals",
        "Migrate the legacy program to the current ctx module API",
      );
    const exports = inventory.tree.statements.filter(
      (s) =>
        ts.canHaveModifiers(s) &&
        ts
          .getModifiers(s)
          ?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword),
    );
    if (exports.length !== 1 || !ts.isFunctionDeclaration(exports[0]))
      add(
        "export default",
        "Expected one default async function module",
        "Bundle default expressions/imports into a separately verified Egern function",
      );
    else {
      const fn = exports[0] as ts.FunctionDeclaration,
        param = fn.parameters[0]?.name;
      if (!param || !ts.isIdentifier(param) || param.text !== "ctx")
        add(
          "ctx",
          "A canonical ctx parameter is required for the current module adapter",
          "Rename the parameter with an AST binding transform before conversion",
        );
      const mods = ts.getModifiers(fn) ?? [];
      const start =
          mods
            .find((m) => m.kind === ts.SyntaxKind.ExportKeyword)
            ?.getStart(inventory.tree) ?? fn.getStart(inventory.tree),
        bodyStart = mods.find(
          (m) => m.kind === ts.SyntaxKind.DefaultKeyword,
        )!.end;
      entry =
        source.slice(0, start) +
        "const " +
        entryBinding +
        " = " +
        source.slice(bodyStart, fn.end) +
        ";" +
        source.slice(fn.end);
    }
    const scan = (n: ts.Node) => {
      if (
        ts.isIdentifier(n) &&
        n.text === "ctx" &&
        !(
          ts.isPropertyAccessExpression(n.parent) && n.parent.expression === n
        ) &&
        !(ts.isParameter(n.parent) && n.parent.name === n)
      )
        add(
          "ctx alias",
          "Aliased/computed ctx requires data-flow proof",
          "Use explicit documented ctx members or retain native",
        );
      if (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) {
        const p = propertyPath(n);
        if (p?.startsWith("ctx.")) {
          const supported =
            /^ctx\.(?:request|response)(?:\.(?:url|method|status|headers|text|json|arrayBuffer))?$/.test(
              p,
            ) ||
            /^ctx\.(?:request|response)\.headers\.(?:get|has)$/.test(p) ||
            p === "ctx.respond" ||
            p === "ctx.abort" ||
            p === "ctx.script" ||
            p === "ctx.script.name";
          if (!supported)
            add(
              p,
              "Egern streams, environment, controls, storage return contracts or extended APIs have no complete portable equivalent",
              "Use the capability-specific target implementation listed in docs/script-api-compatibility.md",
            );
        }
      }
      ts.forEachChild(n, scan);
    };
    scan(inventory.tree);
  }
  const notificationOmissions = new Set<string>();
  let synthesis = 0,
    passOrModify = 0;
  for (const { api, node } of inventory.calls) {
    if (api === "$done") {
      const arg = node.arguments[0];
      // Modified: 2026-11-02 (chance). Prove all closed literal assignments to a result variable; do not guess arbitrary dynamic objects.
      const objects = arg
        ? completionObjects(arg, inventory.tree, inventory.checker)
        : null;
      if (objects) {
        for (const object of objects) {
          let response = false;
          for (const property of object.properties) {
            if (
              !ts.isPropertyAssignment(property) &&
              !ts.isShorthandPropertyAssignment(property)
            ) {
              add(
                "$done",
                "Computed/spread completion fields are not statically verified",
                "Construct an explicit completion result",
              );
              continue;
            }
            const key = property.name
              ?.getText(inventory.tree)
              .replace(/^['"]|['"]$/g, "");
            // Modified: 2026-11-02 (chance). A proven readonly Header query
            // does not authorize invalid String/dynamic output dictionaries.
            if (
              key === "headers" &&
              (!ts.isPropertyAssignment(property) ||
                !ts.isObjectLiteralExpression(property.initializer))
            )
              add(
                "$done.headers",
                "Output headers require an explicit object dictionary; String/unknown header results are not a portable contract",
                "Preserve the source diagnostic; prove output fields separately from readonly input queries",
              );
            if (key === "response") {
              response = true;
              if (
                !ts.isPropertyAssignment(property) ||
                !ts.isObjectLiteralExpression(property.initializer)
              )
                add(
                  "$done.response",
                  "Dynamic synthetic response needs field/data-flow proof",
                  "Use explicit documented response fields or retain the native script",
                );
            }
            if (
              ![
                "body",
                "bodyBytes",
                "headers",
                "status",
                "statusCode",
                "url",
                "response",
                "abort",
              ].includes(key ?? "")
            )
              add(
                "$done." + key,
                "Completion field has no mapped target contract",
                "Implement the target-specific request control/trailers API or retain native",
              );
            if (
              key === "abort" &&
              options.to !== "surge" &&
              options.to !== "egern"
            )
              add(
                "$done.abort",
                "Target abort equivalence is unproven",
                "Retain native blocking or use a verified target declaration",
              );
          }
          if (response) synthesis++;
          else passOrModify++;
        }
      } else if (
        arg &&
        !(
          options.from === "qx" &&
          options.phase === "response" &&
          options.responseBody === true &&
          !options.binary &&
          completionString(
            arg,
            inventory.tree,
            inventory.checker,
            inventory.contextAliases,
          )
        )
      )
        add(
          "$done",
          "Dynamic completion object needs field/data-flow proof",
          "Use explicit result fields or add a verified program-specific plan",
        );
      else passOrModify++;
    }
    if (api === "clearTimeout" || api === "clearInterval")
      add(
        api,
        "Timer cancellation availability differs by target engine",
        "Select a verified engine and cancellation contract; never provide a no-op",
      );
    if (api === "setInterval" && options.from !== "loon")
      add(
        api,
        "Only Loon documents the one-shot setInterval alias in the researched API",
        "Use a real repeating scheduler with cancellation or retain the native source",
      );
    if (
      (api === "setTimeout" || api === "setInterval") &&
      (options.from === "egern" || options.to === "egern")
    )
      add(
        api,
        "The current Egern API page does not establish a matching timer lifecycle",
        "Verify target timers and completion cancellation before enabling",
      );
    const args = node.arguments;
    if (api === "$notify" || api === "$notification.post") {
      const notification = notificationContract(
        args,
        inventory.checker,
        options.from,
        options.to,
      );
      for (const omission of notification.omitted)
        notificationOmissions.add(omission);
      if (!notification.ok)
        add(
          api,
          "Notification attachments/actions/delay differ across clients",
          "Use explicit documented open-URL/HTTP media fields; QX omits unsupported optional parameters, other targets require per-field proof",
        );
    }
    if (api === "$prefs.valueForKey" || api === "$persistentStore.read") {
      if (
        options.from !== "surge" &&
        !safeStorageRead(node, inventory.tree, inventory.checker)
      )
        add(
          api,
          "The documented source missing-value contract does not identify null vs undefined precisely enough for strict conversion",
          "Verify missing/empty/string values in the real source client; never silently coerce storage absence",
        );
      if (
        args.length !== 1 ||
        constantString(args[0], inventory.checker) === null ||
        /[\\/]/.test(constantString(args[0], inventory.checker) ?? "")
      )
        add(
          api,
          "Default/dynamic key namespaces differ across clients",
          "Use an explicit plain string key or bind source identity with a verified namespace strategy",
        );
    }
    if (
      [
        "$prefs.setValueForKey",
        "$persistentStore.write",
        "$prefs.removeValueForKey",
      ].includes(api)
    ) {
      const key = args[api === "$prefs.removeValueForKey" ? 0 : 1],
        value = args[0];
      const stringValue = value
        ? storageString(value, inventory.tree, inventory.checker)
        : { known: false, nonempty: false };
      // Modified: 2026-11-02 (chance). Resolve constant keys and known nonempty
      // serialization without changing source construction, order or exceptions.
      if (
        api !== "$prefs.removeValueForKey" &&
        value &&
        stringValue.known &&
        !stringValue.nonempty &&
        [options.from, options.to].includes("loon")
      )
        add(
          api,
          "Loon empty-string storage semantics are not a portable deletion/write contract",
          "Use an explicit deletion or a nonempty string; do not equate empty strings with missing keys",
        );
      if (
        !key ||
        constantString(key, inventory.checker) === null ||
        /[\\/]/.test(constantString(key, inventory.checker) ?? "")
      )
        add(
          api,
          "Only explicit plain string keys are proven portable",
          "Resolve a stable explicit key; do not map the source's implicit key to the adapter path",
        );
      if (
        api !== "$prefs.removeValueForKey" &&
        (!value ||
          !(
            stringValue.known ||
            (options.from === "loon" &&
              "mayDelete" in stringValue &&
              stringValue.mayDelete) ||
            (value.kind === ts.SyntaxKind.NullKeyword &&
              options.from !== "qx") ||
            (options.from === "loon" &&
              ts.isIdentifier(value) &&
              value.text === "undefined")
          ))
      )
        add(
          api,
          "Value coercion/deletion of dynamic non-string values is not proven equivalent",
          "Pass a known String or a documented deletion value; validate the broader domain on real clients",
        );
      if (options.to === "egern")
        add(
          api,
          "Egern storage mutation returns void; source returns Boolean",
          "Only rewrite callers that demonstrably ignore the return, then test failure semantics",
        );
    }
  }
  if (
    options.to === "qx" &&
    !headerContract.ok &&
    features.some(
      (p) =>
        p.startsWith("$request.headers") || p.startsWith("$response.headers"),
    )
  )
    add(
      "headers",
      "QX body-script framing/header restrictions need a declaration-specific proof",
      "Use header actions when possible; retain Content-Type/Length/Encoding restrictions and test duplicate headers",
    );
  if (options.phase === "generic")
    add(
      "generic-result",
      "Widget/panel result schemas are not shared across clients",
      "Build native UI results separately; preserve computation in a shared pure function",
    );
  if (
    features.some((p) =>
      /^\$(?:request|response)\.bodyBytes(?:\.|$)/.test(p),
    ) &&
    features.some((p) => /^\$(?:request|response)\.body(?:\.|$)/.test(p))
  )
    add(
      "binary/text",
      "Simultaneous source text and binary views need a decoding contract",
      "Convert a binary-only or text-only program, or verify the exact codec and empty-body rules",
    );
  // Modified: 2026-11-02 (chance). Explicit binary declarations map callback
  // Uint8Array body to QX bodyBytes; input/output are validated without text decoding.
  if (options.to === "qx" && synthesis && passOrModify)
    add(
      "$done.response",
      "Mixed request modification/pass-through and synthetic responses cannot be assigned one proven QX script mode",
      "Split only if source ordering and match ownership remain equivalent; otherwise retain native",
    );
  const unique = problems.filter(
    (p, i) =>
      problems.findIndex((v) => v.api === p.api && v.reason === p.reason) === i,
  );
  const operationIR = parseScriptApiIR(
    inventory.tree,
    inventory.checker,
    inventory.contextAliases,
    options.from,
    options.to,
    options,
    unique,
    headerContract.queries,
  );
  const apiPlan = emitScriptApiPlan(operationIR);
  if (unique.length)
    return {
      operationIR,
      status: "blocked" as const,
      problems: unique,
      features,
      code: null,
    };
  const effectiveOptions = {
    ...options,
    apiPlan,
    binaryReads:
      !!options.binary &&
      features.some((p) =>
        new RegExp(
          "^\\$" +
            (options.phase === "response" ? "response" : "request") +
            "\\.(?:body|bodyBytes)(?:\\.|$)",
        ).test(p),
      ),
    ...(httpContract.ok ? { httpCallback: true } : {}),
    ...(argsContract.ok
      ? { argumentMapped: true, argumentSchema: argsContract.schema }
      : {}),
    ...(taskContract.ok
      ? { httpTask: true, httpTaskBinary: taskContract.binary }
      : {}),
    ...(headerContract.ok
      ? {
          headerReads: headerContract.reads,
          headerPrefixes: headerContract.prefixes,
        }
      : {}),
    ...(options.to === "qx" && synthesis ? { phase: "echo" } : {}),
  };
  const config = JSON.stringify(effectiveOptions);
  const body =
    options.from === "egern"
      ? '"use strict";\n' +
        entry! +
        "\nreturn " +
        entryBinding +
        "(" +
        ctxBinding +
        ");"
      : source;
  const run = `function($request,$response,$done,$script,$persistentStore,$prefs,$notification,$notify,${ctxBinding},setTimeout,setInterval${parameterTail}){\n${body}\n}`;
  const core = `(${scriptApiRuntime})(${config},${hostBinding},${run})`;
  const header = `// Modified: 2026-11-01 (chance). Documented script API subset: ${options.from} -> ${options.to}; upstream body preserved in its separate raw backup.\n// Category: Script API adapter\n// Source: ${String(options.sourceUrl ?? "").replace(/[\r\n]/g, "")}\n`;
  const code =
    options.to === "egern"
      ? header +
        `export default async function(ctx){const ${hostBinding}={ctx};return await ${core};}\n`
      : header +
        `(function(){const ${hostBinding}={request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,script:typeof $script==='undefined'?undefined:$script,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,prefs:typeof $prefs==='undefined'?undefined:$prefs,notify:typeof $notification==='undefined'?undefined:$notification,notifyQx:typeof $notify==='undefined'?undefined:$notify,http:typeof $httpClient==='undefined'?undefined:$httpClient,task:typeof $task==='undefined'?undefined:$task,argument:typeof $argument==='undefined'?undefined:$argument${codecs.ok ? ",codecs:(" + scriptCodecs + ")()" : ""}};${core};})();\n`;
  return {
    status: "adapted" as const,
    problems: [],
    features,
    code,
    operationIR,
    contract: {
      apiPlan,
      headerReads: headerContract.reads,
      headerPrefixes: headerContract.prefixes,
      binaryReads: effectiveOptions.binaryReads,
      ...(codecs.ok ? { portableCodecs: codecs.names } : {}),
      ...(argsContract.ok
        ? {
            argumentMapped: true,
            argumentSchema: argsContract.schema,
            ...(argsContract.omittedParameters
              ? { omittedParameters: argsContract.omittedParameters }
              : {}),
          }
        : {}),
      ...(notificationOmissions.size
        ? {
            omittedParameters: [
              ...new Set([
                ...(argsContract.ok
                  ? (argsContract.omittedParameters ?? [])
                  : []),
                ...notificationOmissions,
              ]),
            ],
          }
        : {}),
      ...(taskContract.ok
        ? {
            httpTask: true,
            httpTaskBinary: taskContract.binary,
            httpIgnoredOptions: taskContract.ignoredOptions,
          }
        : {}),
      ...(httpContract.ok
        ? {
            httpCallback: true,
            httpIgnoredOptions: httpContract.ignoredOptions,
          }
        : {}),
    },
    echoRequired: options.to === "qx" && synthesis > 0,
  };
}
