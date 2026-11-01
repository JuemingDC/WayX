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
export function safePresenceUse(node: ts.Node): boolean {
  const p = node.parent;
  return (
    ts.isTypeOfExpression(p) ||
    (ts.isPrefixUnaryExpression(p) &&
      p.operator === ts.SyntaxKind.ExclamationToken) ||
    ((ts.isIfStatement(p) || ts.isWhileStatement(p)) &&
      p.expression === node) ||
    (ts.isConditionalExpression(p) && p.condition === node)
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
): ts.ObjectLiteralExpression[] | null {
  if (ts.isParenthesizedExpression(node))
    return completionObjects(node.expression, tree, checker);
  if (ts.isObjectLiteralExpression(node)) return [node];
  if (!ts.isIdentifier(node)) return null;
  const symbol = checker.getSymbolAtLocation(node),
    decl = symbol?.valueDeclaration;
  if (
    !symbol ||
    !decl ||
    !ts.isVariableDeclaration(decl) ||
    !decl.initializer ||
    !ts.isObjectLiteralExpression(decl.initializer)
  )
    return null;
  const values = [decl.initializer];
  let valid = true;
  function visit(n: ts.Node) {
    if (ts.isIdentifier(n) && valueSymbol(n, checker) === symbol) {
      const p = n.parent;
      if (ts.isVariableDeclaration(p) && p.name === n) {
        if (p.initializer) {
          if (ts.isObjectLiteralExpression(p.initializer))
            values.push(p.initializer);
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
        p.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        ts.isObjectLiteralExpression(p.right)
      )
        values.push(p.right);
      else if (
        ts.isCallExpression(p) &&
        p.expression.getText(tree) === "$done" &&
        !checker.getSymbolAtLocation(p.expression) &&
        p.arguments[0] === n
      ) {
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
export function absenceInsensitive(node: ts.Node): boolean {
  let value = node;
  while (ts.isParenthesizedExpression(value.parent)) value = value.parent;
  const p = value.parent;
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
  if (absenceInsensitive(node)) return true;
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
      if (n !== p.name && !absenceInsensitive(n)) safe = false;
    }
    ts.forEachChild(n, visit);
  };
  visit(tree);
  return safe;
}
