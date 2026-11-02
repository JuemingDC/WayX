// Modified: 2026-11-02 (chance). Shared closed-call summaries prove wrapper
// parameters/results without executing functions or rewriting author expressions.
import ts from "typescript";
export function scriptSymbol(n: ts.Node, checker: ts.TypeChecker) {
  return ts.isIdentifier(n) &&
    ts.isShorthandPropertyAssignment(n.parent) &&
    n.parent.name === n
    ? checker.getShorthandAssignmentValueSymbol(n.parent)
    : checker.getSymbolAtLocation(n);
}
export function closedFunctionCalls(
  fn: ts.Node,
  checker: ts.TypeChecker,
): ts.CallExpression[] | null {
  if (
    !ts.isFunctionDeclaration(fn) &&
    !ts.isArrowFunction(fn) &&
    !ts.isFunctionExpression(fn)
  )
    return null;
  // Modified: 2026-11-02 (chance). Conditional/block function declarations
  // need Annex B initialization proofs; this summary accepts top-level declarations.
  if (ts.isFunctionDeclaration(fn) && !ts.isSourceFile(fn.parent)) return null;
  if (
    !fn.body ||
    fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ||
    ("asteriskToken" in fn && fn.asteriskToken) ||
    fn.parameters.some(
      (p) => !ts.isIdentifier(p.name) || p.dotDotDotToken || p.initializer,
    )
  )
    return null;
  const binding = ts.isFunctionDeclaration(fn)
    ? fn.name
    : ts.isVariableDeclaration(fn.parent) &&
        fn.parent.initializer === fn &&
        ts.isVariableDeclarationList(fn.parent.parent) &&
        fn.parent.parent.flags & ts.NodeFlags.Const
      ? fn.parent.name
      : null;
  if (!binding || !ts.isIdentifier(binding)) return null;
  const symbol = scriptSymbol(binding, checker);
  if (!symbol || symbol.declarations?.length !== 1) return null;
  const calls: ts.CallExpression[] = [];
  let safe = true;
  const walk = (n: ts.Node) => {
    if (
      ts.isIdentifier(n) &&
      scriptSymbol(n, checker) === symbol &&
      n !== binding
    ) {
      const p = n.parent;
      if (
        !ts.isCallExpression(p) ||
        p.expression !== n ||
        p.arguments.some(ts.isSpreadElement) ||
        p.arguments.length !== fn.parameters.length
      )
        safe = false;
      else calls.push(p);
    }
    ts.forEachChild(n, walk);
  };
  walk(fn.getSourceFile());
  // Receiver and call-frame observations need a distinct contract.
  const frame = (n: ts.Node) => {
    if (
      n.kind === ts.SyntaxKind.ThisKeyword ||
      (ts.isIdentifier(n) && n.text === "arguments")
    )
      safe = false;
    ts.forEachChild(n, frame);
  };
  frame(fn.body);
  return safe && calls.length && calls.length <= 64 ? calls : null;
}
export function closedParameterArguments(
  node: ts.Node,
  checker: ts.TypeChecker,
): ts.Expression[] | null {
  if (!ts.isIdentifier(node)) return null;
  const symbol = scriptSymbol(node, checker),
    p = symbol?.valueDeclaration;
  if (!p || !ts.isParameter(p) || !ts.isIdentifier(p.name)) return null;
  const fn = p.parent,
    calls = closedFunctionCalls(fn, checker);
  if (!calls) return null;
  const index = fn.parameters.indexOf(p);
  let safe = true;
  const walk = (n: ts.Node) => {
    if (
      ts.isIdentifier(n) &&
      scriptSymbol(n, checker) === symbol &&
      n !== p.name
    ) {
      let current: ts.Node = n;
      while (
        current.parent &&
        (ts.isParenthesizedExpression(current.parent) ||
          ts.isArrayLiteralExpression(current.parent) ||
          ts.isObjectLiteralExpression(current.parent) ||
          ts.isSpreadElement(current.parent) ||
          ts.isSpreadAssignment(current.parent) ||
          (ts.isShorthandPropertyAssignment(current.parent) &&
            current.parent.name === current) ||
          (ts.isPropertyAssignment(current.parent) &&
            current.parent.initializer === current))
      )
        current = current.parent;
      const q = current.parent;
      if (
        (ts.isBinaryExpression(q) &&
          q.left === current &&
          q.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
          q.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
        ((ts.isForInStatement(q) || ts.isForOfStatement(q)) &&
          q.initializer === current) ||
        ts.isPostfixUnaryExpression(q) ||
        (ts.isPrefixUnaryExpression(q) &&
          [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(
            q.operator,
          ))
      )
        safe = false;
    }
    ts.forEachChild(n, walk);
  };
  walk(fn);
  return safe ? calls.map((c) => c.arguments[index]) : null;
}
