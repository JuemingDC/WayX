// Modified: 2026-11-02 (chance). Resolve lexical bindings and finite completion
// objects without rewriting source text or treating local $variables as host APIs.
import ts from "typescript";
export function scriptChecker(tree: ts.SourceFile) {
  const host: ts.CompilerHost = {
    getSourceFile: (n) => (n.endsWith("upstream.js") ? tree : undefined),
    getDefaultLibFileName: () => "",
    writeFile: () => {},
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    fileExists: (n) => n.endsWith("upstream.js"),
    readFile: () => undefined,
    getCanonicalFileName: (n) => n,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
  };
  return ts
    .createProgram(
      ["upstream.js"],
      { noLib: true, allowJs: true, target: ts.ScriptTarget.Latest },
      host,
    )
    .getTypeChecker();
}
export function valueSymbol(node: ts.Node, checker: ts.TypeChecker) {
  return ts.isIdentifier(node) &&
    ts.isShorthandPropertyAssignment(node.parent) &&
    node.parent.name === node
    ? checker.getShorthandAssignmentValueSymbol(node.parent)
    : checker.getSymbolAtLocation(node);
}
// Modified: 2026-11-02 (chance). Logical chains are harmless only when their
// final value is consumed as a Boolean; fallback objects may still escape.
export function safePresenceUse(node: ts.Node): boolean {
  let value = node;
  while (ts.isParenthesizedExpression(value.parent)) value = value.parent;
  const p = value.parent;
  if (
    ts.isBinaryExpression(p) &&
    [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(
      p.operatorToken.kind,
    )
  ) {
    let chain: ts.Node = p;
    while (
      ts.isParenthesizedExpression(chain.parent) ||
      (ts.isBinaryExpression(chain.parent) &&
        [
          ts.SyntaxKind.AmpersandAmpersandToken,
          ts.SyntaxKind.BarBarToken,
        ].includes(chain.parent.operatorToken.kind))
    )
      chain = chain.parent;
    const sink = chain.parent;
    return (
      (ts.isPrefixUnaryExpression(sink) &&
        sink.operator === ts.SyntaxKind.ExclamationToken) ||
      ((ts.isIfStatement(sink) ||
        ts.isWhileStatement(sink) ||
        ts.isDoStatement(sink)) &&
        sink.expression === chain) ||
      (ts.isConditionalExpression(sink) && sink.condition === chain)
    );
  }
  return (
    ts.isTypeOfExpression(p) ||
    (ts.isPrefixUnaryExpression(p) &&
      p.operator === ts.SyntaxKind.ExclamationToken) ||
    ((ts.isIfStatement(p) || ts.isWhileStatement(p) || ts.isDoStatement(p)) &&
      p.expression === value) ||
    (ts.isConditionalExpression(p) && p.condition === value)
  );
}
export function unusedPresenceProbe(
  node: ts.Node,
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
) {
  if (!ts.isTypeOfExpression(node.parent)) return false;
  let value: ts.Node = node.parent;
  if (
    ts.isBinaryExpression(value.parent) &&
    ["===", "!==", "==", "!="].includes(
      value.parent.operatorToken.getText(tree),
    ) &&
    ts.isStringLiteralLike(value.parent.right) &&
    value.parent.right.text === "undefined"
  )
    value = value.parent;
  const declaration = value.parent;
  if (
    !ts.isVariableDeclaration(declaration) ||
    declaration.initializer !== value ||
    !ts.isIdentifier(declaration.name)
  )
    return false;
  const symbol = checker.getSymbolAtLocation(declaration.name);
  let uses = 0;
  const visit = (n: ts.Node) => {
    if (ts.isIdentifier(n) && valueSymbol(n, checker) === symbol) uses++;
    ts.forEachChild(n, visit);
  };
  visit(tree);
  return uses === 1;
}
export function classLocalThis(node: ts.Node) {
  // Class methods keep their original strict receiver semantics. Do not allow
  // access to host globals through this, or dynamic lookup that could bypass it.
  let n: ts.Node | undefined = node.parent;
  while (n && !ts.isSourceFile(n)) {
    if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n)) return false;
    if (ts.isClassDeclaration(n) || ts.isClassExpression(n)) {
      const p = node.parent;
      if (ts.isPropertyAccessExpression(p) && p.expression === node)
        return !p.name.text.startsWith("$");
      if (ts.isElementAccessExpression(p) && p.expression === node)
        return (
          ts.isStringLiteralLike(p.argumentExpression) &&
          !p.argumentExpression.text.startsWith("$")
        );
      return false;
    }
    n = n.parent;
  }
  return false;
}
// A closed variable may be assigned literal result objects in nested callbacks.
// Escapes, aliasing, dynamic properties and arbitrary function returns remain unknown.
export function completionObjects(
  node: ts.Expression,
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
  seen = new Set<ts.Symbol>(),
): ts.ObjectLiteralExpression[] | null {
  if (ts.isParenthesizedExpression(node))
    return completionObjects(node.expression, tree, checker, seen);
  // Modified: 2026-11-02 (chance). Flatten only proven spreads for validation;
  // the actual object expression, calls and side effects remain author code.
  if (ts.isObjectLiteralExpression(node)) {
    let variants: ts.ObjectLiteralElementLike[][] = [[]];
    for (const property of node.properties) {
      if (!ts.isSpreadAssignment(property)) {
        for (const v of variants) v.push(property);
        continue;
      }
      const objects = completionObjects(
        property.expression,
        tree,
        checker,
        seen,
      );
      if (!objects || variants.length * objects.length > 64) return null;
      variants = variants.flatMap((v) =>
        objects.map((o) => [...v, ...o.properties]),
      );
    }
    return variants.map((v) => ts.factory.createObjectLiteralExpression(v));
  }
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    const symbol = valueSymbol(node.expression, checker),
      decl = symbol?.valueDeclaration;
    if (!symbol || seen.has(symbol) || !decl) return null;
    const fn = ts.isFunctionDeclaration(decl)
      ? decl
      : ts.isVariableDeclaration(decl) &&
          ts.isVariableDeclarationList(decl.parent) &&
          decl.parent.flags & ts.NodeFlags.Const &&
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) ||
            ts.isFunctionExpression(decl.initializer))
        ? decl.initializer
        : null;
    if (
      !fn ||
      !fn.body ||
      fn.asteriskToken ||
      fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)
    )
      return null;
    let closed = true;
    const refs = (n: ts.Node) => {
      if (ts.isIdentifier(n) && valueSymbol(n, checker) === symbol) {
        const p = n.parent;
        // Modified: 2026-11-02 (chance). Other calls must not leak a shared
        // returned object to an uninspected consumer before this completion.
        if (
          (ts.isFunctionDeclaration(p) || ts.isVariableDeclaration(p)) &&
          p.name === n
        ) {
        } else if (ts.isCallExpression(p) && p.expression === n) {
          const sink = p.parent;
          if (
            p !== node &&
            !ts.isExpressionStatement(sink) &&
            !(
              ts.isCallExpression(sink) &&
              ts.isIdentifier(sink.expression) &&
              sink.expression.text === "$done" &&
              !valueSymbol(sink.expression, checker) &&
              sink.arguments[0] === p
            )
          )
            closed = false;
        } else closed = false;
      }
      ts.forEachChild(n, refs);
    };
    refs(tree);
    if (!closed) return null;
    const next = new Set(seen).add(symbol);
    if (!ts.isBlock(fn.body))
      return completionObjects(fn.body, tree, checker, next);
    const values: ts.ObjectLiteralExpression[] = [];
    let valid = true;
    const returns = (n: ts.Node) => {
      if (n !== fn.body && ts.isFunctionLike(n)) return;
      if (ts.isReturnStatement(n)) {
        const objects = n.expression
          ? completionObjects(n.expression, tree, checker, next)
          : [ts.factory.createObjectLiteralExpression()];
        if (!objects) valid = false;
        else values.push(...objects);
        return;
      }
      ts.forEachChild(n, returns);
    };
    returns(fn.body);
    const terminates = (n: ts.Statement): boolean =>
      ts.isReturnStatement(n) ||
      ts.isThrowStatement(n) ||
      (ts.isBlock(n) && n.statements.some(terminates)) ||
      (ts.isIfStatement(n) &&
        !!n.elseStatement &&
        terminates(n.thenStatement) &&
        terminates(n.elseStatement));
    if (!terminates(fn.body))
      values.push(ts.factory.createObjectLiteralExpression());
    return valid && values.length ? values : null;
  }
  // Modified: 2026-11-02 (chance). Both conditional result shapes must be known;
  // keep the condition and all business expressions in the original program.
  if (ts.isConditionalExpression(node)) {
    const yes = completionObjects(node.whenTrue, tree, checker, seen),
      no = completionObjects(node.whenFalse, tree, checker, seen);
    return yes && no ? [...yes, ...no] : null;
  }
  if (!ts.isIdentifier(node)) return null;
  const symbol = checker.getSymbolAtLocation(node),
    decl = symbol?.valueDeclaration;
  if (
    !symbol ||
    seen.has(symbol) ||
    !decl ||
    !ts.isVariableDeclaration(decl) ||
    !decl.initializer
  )
    return null;
  const next = new Set(seen).add(symbol);
  const initial = completionObjects(decl.initializer, tree, checker, next);
  if (!initial) return null;
  const values = [...initial];
  const scalarFields = new Set([
    "body",
    "bodyBytes",
    "status",
    "statusCode",
    "url",
  ]);
  let valid = true;
  function visit(n: ts.Node) {
    if (ts.isIdentifier(n) && valueSymbol(n, checker) === symbol) {
      const p = n.parent;
      if (ts.isVariableDeclaration(p) && p.name === n) {
        if (p.initializer) {
          const objects = completionObjects(p.initializer, tree, checker, next);
          if (objects) values.push(...objects);
          else valid = false;
        }
        const list = p.parent;
        if (
          ts.isVariableDeclarationList(list) &&
          (ts.isForOfStatement(list.parent) || ts.isForInStatement(list.parent))
        )
          valid = false;
      } else if (
        ts.isBinaryExpression(p) &&
        p.left === n &&
        p.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ) {
        const objects = completionObjects(p.right, tree, checker, next);
        if (objects) values.push(...objects);
        else valid = false;
      } else if (
        ts.isCallExpression(p) &&
        p.expression.getText(tree) === "$done" &&
        !checker.getSymbolAtLocation(p.expression) &&
        p.arguments[0] === n
      ) {
      } else if (n === node) {
        // This occurrence is the proven return/conditional/spread consumer.
      } else if (
        (ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) &&
        p.expression === n
      ) {
        // Modified: 2026-11-02 (chance). Closed static scalar fields can be read,
        // assigned or deleted; whole-result aliases and nested/header writes cannot.
        const name = ts.isPropertyAccessExpression(p)
          ? p.name
          : p.argumentExpression;
        const key =
          ts.isIdentifier(name) && ts.isPropertyAccessExpression(p)
            ? name.text
            : ts.isStringLiteralLike(name)
              ? name.text
              : null;
        const op = p.parent;
        if (!key || !scalarFields.has(key)) valid = false;
        else if (
          ts.isBinaryExpression(op) &&
          op.left === p &&
          op.operatorToken.kind === ts.SyntaxKind.EqualsToken
        ) {
          values.push(
            ts.factory.createObjectLiteralExpression([
              ts.factory.createPropertyAssignment(
                name as ts.PropertyName,
                op.right,
              ),
            ]),
          );
        } else if (ts.isDeleteExpression(op) && op.expression === p) {
          // Removing a scalar field introduces no new result shape.
        } else if (
          (ts.isBinaryExpression(op) &&
            op.left === p &&
            op.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            op.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
          ts.isPrefixUnaryExpression(op) ||
          ts.isPostfixUnaryExpression(op) ||
          (ts.isCallExpression(op) && op.expression === p)
        )
          valid = false;
      } else valid = false;
    }
    ts.forEachChild(n, visit);
  }
  visit(tree);
  return valid ? values : null;
}

// Modified: 2026-11-02 (chance). Absence normalization is safe only when the
// caller cannot distinguish null from undefined; strict equality/stringification
// and escaping aliases remain outside this proof.
export function absenceInsensitive(
  node: ts.Node,
  checker?: ts.TypeChecker,
): boolean {
  let value = node;
  while (ts.isParenthesizedExpression(value.parent)) value = value.parent;
  const p = value.parent;
  // A locally bound value observed only behind its String guard cannot expose
  // which missing representation was returned: both skip that same branch.
  if (checker && ts.isIdentifier(value)) {
    const symbol = valueSymbol(value, checker);
    const stringGuard = (condition: ts.Expression): boolean | null => {
      if (ts.isParenthesizedExpression(condition))
        return stringGuard(condition.expression);
      if (!ts.isBinaryExpression(condition)) return null;
      const op = condition.operatorToken.kind,
        expr = ts.isTypeOfExpression(condition.left)
          ? condition.left
          : ts.isTypeOfExpression(condition.right)
            ? condition.right
            : null,
        other = expr === condition.left ? condition.right : condition.left;
      if (
        !expr ||
        !ts.isIdentifier(expr.expression) ||
        valueSymbol(expr.expression, checker) !== symbol ||
        !ts.isStringLiteralLike(other) ||
        other.text !== "string"
      )
        return null;
      return [
        ts.SyntaxKind.EqualsEqualsToken,
        ts.SyntaxKind.EqualsEqualsEqualsToken,
      ].includes(op)
        ? true
        : [
              ts.SyntaxKind.ExclamationEqualsToken,
              ts.SyntaxKind.ExclamationEqualsEqualsToken,
            ].includes(op)
          ? false
          : null;
    };
    let current: ts.Node = value;
    while (current.parent) {
      const ancestor = current.parent;
      if (ts.isBinaryExpression(ancestor) && ancestor.right === current) {
        const guard = stringGuard(ancestor.left);
        if (
          (ancestor.operatorToken.kind ===
            ts.SyntaxKind.AmpersandAmpersandToken &&
            guard === true) ||
          (ancestor.operatorToken.kind === ts.SyntaxKind.BarBarToken &&
            guard === false)
        )
          return true;
      }
      if (ts.isConditionalExpression(ancestor)) {
        const guard = stringGuard(ancestor.condition);
        if (
          (guard === true && ancestor.whenTrue === current) ||
          (guard === false && ancestor.whenFalse === current)
        )
          return true;
      }
      if (ts.isIfStatement(ancestor)) {
        const guard = stringGuard(ancestor.expression);
        if (
          (guard === true && ancestor.thenStatement === current) ||
          (guard === false && ancestor.elseStatement === current)
        )
          return true;
      }
      current = ancestor;
    }
  }
  // Modified: 2026-11-02 (chance). A String type test rejects both missing
  // representations equally; optional chaining also maps both to undefined.
  if (
    (ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) &&
    p.expression === value &&
    p.questionDotToken
  )
    return true;
  if (ts.isTypeOfExpression(p) && ts.isBinaryExpression(p.parent)) {
    const test = p.parent,
      other = test.left === p ? test.right : test.left;
    if (
      [
        ts.SyntaxKind.EqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsToken,
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
      ].includes(test.operatorToken.kind) &&
      ts.isStringLiteralLike(other) &&
      !["object", "undefined"].includes(other.text)
    )
      return true;
  }

  if (ts.isBinaryExpression(p)) {
    if (
      p.left === value &&
      [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(
        p.operatorToken.kind,
      )
    )
      return true;
    if (
      [
        ts.SyntaxKind.EqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsToken,
      ].includes(p.operatorToken.kind)
    )
      return (
        (p.left === value ? p.right : p.left).kind === ts.SyntaxKind.NullKeyword
      );
  }
  return (
    (ts.isPrefixUnaryExpression(p) &&
      p.operator === ts.SyntaxKind.ExclamationToken) ||
    ((ts.isIfStatement(p) || ts.isWhileStatement(p)) &&
      p.expression === value) ||
    (ts.isConditionalExpression(p) && p.condition === value)
  );
}
export function safeStorageRead(
  node: ts.CallExpression,
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
): boolean {
  if (absenceInsensitive(node, checker)) return true;
  const p = node.parent;
  if (
    !ts.isVariableDeclaration(p) ||
    p.initializer !== node ||
    !ts.isIdentifier(p.name)
  )
    return false;
  const symbol = checker.getSymbolAtLocation(p.name);
  let safe = true;
  const visit = (n: ts.Node) => {
    if (ts.isIdentifier(n) && valueSymbol(n, checker) === symbol) {
      if (n !== p.name && !absenceInsensitive(n, checker)) safe = false;
    }
    ts.forEachChild(n, visit);
  };
  visit(tree);
  return safe;
}
