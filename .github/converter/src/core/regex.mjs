// WayX target-neutral source Regex semantics
// Author: chance
// Category: Converter / Core / Semantic Regex

const SUPPORTED_FLAGS=/^[ims]*$/;

function assertRegexNode(node) {
  if (!node || node.type!=='regex') throw new TypeError('Expected Loon semantic Regex node');
  const flags=String(node.flags || '');
  if (!SUPPORTED_FLAGS.test(flags)) throw new Error('Unsupported Loon regex flag(s): '+flags);
  if (new Set(flags).size!==flags.length) throw new Error('Duplicate Loon regex flag(s): '+flags);
  return {source:String(node.pattern ?? ''),flags};
}

export function compileSourceRegex(node) {
  const {source,flags}=assertRegexNode(node);
  return new RegExp(source,flags);
}

export function execSourceRegex(node,value) {
  if (value===null || value===undefined) return null;
  if (typeof value!=='string') return null;
  return compileSourceRegex(node).exec(value);
}

export function testSourceRegex(node,value) {
  return execSourceRegex(node,value)!==null;
}
