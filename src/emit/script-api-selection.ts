// Modified: 2026-11-11 (chance). Inspect lexical API roots; specialize and
// dependency-slice only converter-owned helpers, never the author's statements.
import ts from "typescript";
import { collectScriptApiReferences } from "../parser/script-api-ir.ts";

export function scriptApiUsage(tree: ts.SourceFile) {
  const program = ts.createProgram(
    [tree.fileName],
    { allowJs: true, noLib: true, noResolve: true },
    {
      getSourceFile: (name) => (name === tree.fileName ? tree : undefined),
      getDefaultLibFileName: () => "",
      writeFile: () => {},
      getCurrentDirectory: () => "",
      getDirectories: () => [],
      fileExists: (name) => name === tree.fileName,
      readFile: () => undefined,
      getCanonicalFileName: (name) => name,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => "\n",
    },
  );
  const refs = collectScriptApiReferences(tree, program.getTypeChecker());
  const roots = new Set<string>();
  let dynamic = false,
    globalAccess = false;
  for (const ref of refs) {
    const parts = ref.api.split(".");
    if (["globalThis", "window", "global"].includes(parts[0])) {
      globalAccess = true;
      if (parts.length < 2 || parts[1] === "<runtime-key>") dynamic = true;
      else roots.add(parts[1]);
    } else roots.add(parts[0]);
  }
  const walk = (node: ts.Node) => {
    if (
      ts.isWithStatement(node) ||
      node.kind === ts.SyntaxKind.ThisKeyword ||
      (ts.isIdentifier(node) && ["eval", "Function"].includes(node.text))
    )
      dynamic = true;
    ts.forEachChild(node, walk);
  };
  walk(tree);
  return { roots, dynamic, globalAccess, refs };
}
export type ScriptApiUsage = ReturnType<typeof scriptApiUsage>;
// Modified: 2026-11-11 (chance). Preserve lazy standard-class getters inside
// author control flow; lexical arguments would evaluate them before author try/if.
export const useLexicalScriptApis = (usage: ScriptApiUsage) =>
  !usage.dynamic &&
  !usage.globalAccess &&
  !usage.roots.has("URL") &&
  !usage.roots.has("URLSearchParams");
const parse = (text: string) =>
  ts.createSourceFile(
    "adapter.js",
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
const printer = ts.createPrinter({ removeComments: true });
const property = (node: ts.Node): string[] | null => {
  if (ts.isIdentifier(node)) return [node.text];
  if (ts.isPropertyAccessExpression(node)) {
    const root = property(node.expression);
    return root && [...root, node.name.text];
  }
  if (
    ts.isElementAccessExpression(node) &&
    ts.isStringLiteralLike(node.argumentExpression)
  ) {
    const root = property(node.expression);
    return root && [...root, node.argumentExpression.text];
  }
  return null;
};
const ids = (node: ts.Node) => {
  const names = new Set<string>();
  const walk = (n: ts.Node, parent?: ts.Node) => {
    const key =
      parent &&
      ((ts.isPropertyAccessExpression(parent) && parent.name === n) ||
        (ts.isPropertyAssignment(parent) && parent.name === n) ||
        (ts.isMethodDeclaration(parent) && parent.name === n));
    if (ts.isIdentifier(n) && !key) names.add(n.text);
    ts.forEachChild(n, (child) => walk(child, n));
  };
  walk(node);
  return names;
};

export function selectScriptApiRuntime(
  runtime: string,
  usage: ScriptApiUsage,
  configs: any[],
) {
  const has = (name: string) => usage.dynamic || usage.roots.has(name);
  const factory = ts.factory;
  const uniform = (path: string[]) => {
    const values = configs.map((config) =>
      path.reduce((value, key) => value?.[key], config),
    );
    return values.every((value) => Object.is(value, values[0]))
      ? { known: true, value: values[0] }
      : { known: false, value: undefined };
  };
  const primitive = (node: ts.Node): { known: boolean; value?: any } => {
    if (node.kind === ts.SyntaxKind.TrueKeyword)
      return { known: true, value: true };
    if (node.kind === ts.SyntaxKind.FalseKeyword)
      return { known: true, value: false };
    if (node.kind === ts.SyntaxKind.NullKeyword)
      return { known: true, value: null };
    if (ts.isIdentifier(node) && node.text === "undefined")
      return { known: true, value: undefined };
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node))
      return {
        known: true,
        value: ts.isStringLiteral(node) ? node.text : Number(node.text),
      };
    return { known: false };
  };
  const literal = (value: any): ts.Expression =>
    value === undefined
      ? factory.createIdentifier("undefined")
      : value === null
        ? factory.createNull()
        : typeof value === "string"
          ? factory.createStringLiteral(value)
          : typeof value === "number"
            ? value < 0
              ? factory.createPrefixUnaryExpression(
                  ts.SyntaxKind.MinusToken,
                  factory.createNumericLiteral(-value),
                )
              : factory.createNumericLiteral(value)
            : value
              ? factory.createTrue()
              : factory.createFalse();
  const result = ts.transform(parse("(" + runtime + ")"), [
    (context) => {
      const visit: ts.Visitor = (node) => {
        const p = property(node);
        if (
          p &&
          p.length > 1 &&
          ["config", "source", "target"].includes(p[0])
        ) {
          const path =
            p[0] === "config" ? p.slice(1) : ["apiPlan", p[0], ...p.slice(1)];
          const value = uniform(path);
          if (
            value.known &&
            (value.value === null ||
              !["object", "function"].includes(typeof value.value))
          )
            return literal(value.value);
        }
        node = ts.visitEachChild(node, visit, context);
        if (ts.isBinaryExpression(node)) {
          const a = primitive(node.left),
            b = primitive(node.right),
            op = node.operatorToken.kind;
          if (a.known && op === ts.SyntaxKind.AmpersandAmpersandToken)
            return a.value ? node.right : node.left;
          if (a.known && op === ts.SyntaxKind.BarBarToken)
            return a.value ? node.left : node.right;
          if (
            a.known &&
            b.known &&
            [
              ts.SyntaxKind.EqualsEqualsEqualsToken,
              ts.SyntaxKind.ExclamationEqualsEqualsToken,
            ].includes(op)
          )
            return literal(
              op === ts.SyntaxKind.EqualsEqualsEqualsToken
                ? a.value === b.value
                : a.value !== b.value,
            );
        }
        if (
          ts.isPrefixUnaryExpression(node) &&
          node.operator === ts.SyntaxKind.ExclamationToken
        ) {
          const v = primitive(node.operand);
          if (v.known) return literal(!v.value);
        }
        if (ts.isConditionalExpression(node)) {
          const v = primitive(node.condition);
          if (v.known) return v.value ? node.whenTrue : node.whenFalse;
        }
        if (ts.isIfStatement(node)) {
          const v = primitive(node.expression);
          if (v.known)
            return v.value
              ? node.thenStatement
              : (node.elseStatement ?? factory.createEmptyStatement());
        }
        return node;
      };
      return (node) => ts.visitNode(node, visit) as ts.SourceFile;
    },
  ]);
  const specialized = printer.printFile(result.transformed[0]);
  result.dispose();
  const tree = parse(specialized);
  const fn = (tree.statements[0] as ts.ExpressionStatement)
    .expression as ts.ParenthesizedExpression;
  const kernel = fn.expression as ts.FunctionExpression;
  let statements: ts.Statement[] = [];
  const lexical = useLexicalScriptApis(usage);
  for (const statement of kernel.body.statements) {
    if (lexical && ts.isReturnStatement(statement)) {
      statements.push(
        factory.createReturnStatement(
          factory.createCallExpression(
            factory.createPropertyAccessExpression(
              factory.createIdentifier("run"),
              "call",
            ),
            undefined,
            [
              factory.createPropertyAccessExpression(
                factory.createIdentifier("host"),
                "global",
              ),
              factory.createIdentifier("overlay"),
            ],
          ),
        ),
      );
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const d of statement.declarationList.declarations) {
        let declaration = d;
        if (
          ts.isIdentifier(d.name) &&
          d.name.text === "overlay" &&
          d.initializer &&
          ts.isObjectLiteralExpression(d.initializer)
        ) {
          declaration = factory.updateVariableDeclaration(
            d,
            d.name,
            d.exclamationToken,
            d.type,
            factory.updateObjectLiteralExpression(
              d.initializer,
              d.initializer.properties.filter(
                (p) => !!p.name && has(p.name.getText(tree)),
              ),
            ),
          );
        }
        statements.push(
          factory.updateVariableStatement(
            statement,
            statement.modifiers,
            factory.updateVariableDeclarationList(statement.declarationList, [
              declaration,
            ]),
          ),
        );
      }
      continue;
    }
    const names = ids(statement);
    // These are initialization statements owned by the corresponding API module.
    if (
      names.has("store") &&
      statement.getText(tree).startsWith("store.remove") &&
      !has("$persistentStore")
    )
      continue;
    if (names.has("prefs") && !has("$prefs") && ts.isIfStatement(statement))
      continue;
    if (
      names.has("argument") &&
      ts.isIfStatement(statement) &&
      !has("$argument")
    )
      continue;
    if (names.has("script") && ts.isIfStatement(statement) && !has("$script"))
      continue;
    if (ts.isBlock(statement)) {
      statements.push(
        ...statement.statements
          .filter(
            (s) => !s.getText(tree).includes("overlay.$utils") || has("$utils"),
          )
          .filter(
            (s) =>
              !s.getText(tree).includes("overlay.$crypto") || has("$crypto"),
          ),
      );
      continue;
    }
    if (ts.isForOfStatement(statement)) {
      if (names.has("http") && !has("$httpClient")) continue;
      if (names.has("standards") && !has("URL") && !has("URLSearchParams"))
        continue;
      if (
        ts.isArrayLiteralExpression(statement.expression) &&
        statement.expression.elements.some(
          (e) => ts.isStringLiteral(e) && e.text === "TextEncoder",
        )
      ) {
        const elements = statement.expression.elements.filter(
          (e) => ts.isStringLiteral(e) && has(e.text),
        );
        if (!elements.length) continue;
        statements.push(
          factory.updateForOfStatement(
            statement,
            statement.awaitModifier,
            statement.initializer,
            factory.updateArrayLiteralExpression(
              statement.expression,
              elements,
            ),
            statement.statement,
          ),
        );
        continue;
      }
    }
    if (
      ts.isExpressionStatement(statement) &&
      ts.isBinaryExpression(statement.expression)
    ) {
      const p = property(statement.expression.left);
      if (
        lexical &&
        p?.[0] === "overlay" &&
        ["globalThis", "window", "global"].includes(p[1])
      )
        continue;
      if (p?.[0] === "overlay" && p[1] === "TextDecoder" && !has("TextDecoder"))
        continue;
    }
    statements.push(statement);
  }
  // Binding dependencies are conservative: shadowed/property names may retain
  // an extra helper, but cannot delete a needed helper or reorder author code.
  const bindings = new Map<string, ts.Statement>();
  for (const s of statements) {
    if (ts.isFunctionDeclaration(s) && s.name) bindings.set(s.name.text, s);
    if (ts.isVariableStatement(s))
      for (const d of s.declarationList.declarations)
        if (ts.isIdentifier(d.name)) bindings.set(d.name.text, s);
  }
  const keep = new Set(
    statements.filter(
      (s) => !ts.isVariableStatement(s) && !ts.isFunctionDeclaration(s),
    ),
  );
  const queue = [...keep];
  for (let i = 0; i < queue.length; i++)
    for (const name of ids(queue[i])) {
      const dependency = bindings.get(name);
      if (dependency && !keep.has(dependency)) {
        keep.add(dependency);
        queue.push(dependency);
      }
    }
  statements = statements.filter((s) => keep.has(s));
  const selected = factory.updateFunctionExpression(
    kernel,
    kernel.modifiers,
    kernel.asteriskToken,
    kernel.name,
    kernel.typeParameters,
    kernel.parameters,
    kernel.type,
    factory.updateBlock(kernel.body, statements),
  );
  const code = printer.printNode(ts.EmitHint.Expression, selected, tree);
  const hostFields = new Set<string>(),
    configPaths: string[][] = [];
  const collect = (node: ts.Node) => {
    const p = property(node);
    if (p && p.length > 1) {
      if (p[0] === "host") hostFields.add(p[1]);
      if (
        p[0] === "config" &&
        !ts.isPropertyAccessExpression(node.parent) &&
        !ts.isElementAccessExpression(node.parent)
      )
        configPaths.push(p.slice(1));
    }
    ts.forEachChild(node, collect);
  };
  collect(parse("(" + code + ")"));
  return { code, hostFields, configPaths };
}

export function selectScriptConfig(config: any, paths: string[][]) {
  const result: any = {};
  for (const path of paths) {
    let input = config,
      output = result;
    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      input = input?.[key];
      if (input === undefined) break;
      if (
        i === path.length - 1 ||
        Array.isArray(input) ||
        input === null ||
        typeof input !== "object"
      ) {
        output[key] = input;
        break;
      } else output = output[key] ??= {};
    }
  }
  return result;
}

// Modified: 2026-11-11 (chance). Direct body/url-only programs need a small
// lexical bridge, not a global Proxy. Dynamic/escaping APIs keep modular dispatch.
export function emitBodyScript(
  source: string,
  usage: ScriptApiUsage,
  configs: any[],
  to: string | undefined,
  fresh: (name: string) => string,
) {
  if (
    !to ||
    usage.dynamic ||
    !usage.roots.has("$done") ||
    configs.some(
      (c) => c.from !== "loon" || !["request", "response"].includes(c.phase),
    )
  )
    return null;
  if (
    [...usage.roots].some(
      (root) => !["$request", "$response", "$done"].includes(root),
    )
  )
    return null;
  for (const ref of usage.refs) {
    if (ref.api === "$done") {
      if (
        !ref.call ||
        !ts.isCallExpression(ref.call) ||
        ref.call.arguments.length > 1
      )
        return null;
      const arg = ref.call.arguments[0];
      if (
        arg &&
        (!ts.isObjectLiteralExpression(arg) ||
          arg.properties.some(
            (p) =>
              (!ts.isPropertyAssignment(p) &&
                !ts.isShorthandPropertyAssignment(p)) ||
              !p.name ||
              !["body", '"body"', "'body'"].includes(p.name.getText()),
          ))
      )
        return null;
    } else if (
      !["$request.url", "$request.body", "$response.body"].includes(ref.api) ||
      ref.access !== "read"
    )
      return null;
  }
  const nativeDone = fresh("__wayxDone"),
    completed = fresh("__wayxCompleted"),
    bytes = fresh("__wayxBytes"),
    isBinary = fresh("__wayxBinary"),
    view = fresh("__wayxView");
  const phases = [
    ...new Set(
      configs.map((c) => (c.phase === "response" ? "response" : "request")),
    ),
  ];
  return `/* SPDX-License-Identifier: GPL-3.0-only */
(function(){
${phases.length === 1 ? `if((typeof $response==='undefined'?'request':'response')!==${JSON.stringify(phases[0])})throw new Error('Unregistered HTTP source/target declaration');` : ""}
const ${nativeDone}=$done;
let ${completed}=false;
const ${isBinary}=value=>{if(ArrayBuffer.isView(value))return true;try{Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'byteLength').get.call(value);return true;}catch{return false;}};
const ${bytes}=value=>{let length;try{length=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'byteLength').get.call(value);}catch{}if(length!==undefined)return new Uint8Array(value,0,length);if(ArrayBuffer.isView(value)){const proto=Object.getPrototypeOf(Uint8Array.prototype),typed=Object.getOwnPropertyDescriptor(proto,Symbol.toStringTag).get.call(value)!==undefined,get=name=>Object.getOwnPropertyDescriptor(typed?proto:DataView.prototype,name).get.call(value);return new Uint8Array(get('buffer'),get('byteOffset'),get('byteLength'));}throw new TypeError('WayX API: binary body requires BufferSource');};
const ${view}=value=>{if(value===undefined)return undefined;const result=Object.assign({},value);if(${isBinary}(value.bodyBytes)||${isBinary}(value.body)){const data=value.${to === "qx" ? "bodyBytes" : "body"};if(data!==undefined){result.body=${bytes}(data);delete result.bodyBytes;}}return result;};
return (function($request,$response,$done){return (function(){\n${source}\n}).call(this);}).call(globalThis,${usage.roots.has("$request") ? `${view}(typeof $request==='undefined'?undefined:$request)` : "undefined"},${usage.roots.has("$response") ? `${view}(typeof $response==='undefined'?undefined:$response)` : "undefined"},value=>{
if(${completed})return;
const result=value==null?{}:Object.assign({},value);
if(${isBinary}(result.body)){const data=${bytes}(result.body);${to === "qx" ? "result.bodyBytes=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);delete result.body;" : "result.body=data;"}}
${completed}=true;return ${nativeDone}(result);
});
})();\n`;
}
