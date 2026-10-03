// WayX differential condition oracle
// Author: chance
// Category: Converter / Core / Equivalence Oracle

import { evaluateCondition } from './condition-evaluator.mjs';

function normalizeCandidate(value) {
  if (typeof value==='boolean') return {matched:value,captures:null};
  if (!value || typeof value!=='object') {
    throw new TypeError('oracle candidate must return boolean or {matched,...}');
  }
  return {
    matched:value.matched===true,
    captures:value.captures && typeof value.captures==='object' ? value.captures : null,
  };
}

function capturesEqual(expected,actual) {
  const left=Object.keys(expected || {}).sort();
  const right=Object.keys(actual || {}).sort();
  if (left.length!==right.length || left.some((key,index)=>key!==right[index])) return false;
  return left.every(key=>JSON.stringify(expected[key])===JSON.stringify(actual[key]));
}

export function runConditionOracle({
  condition,
  cases,
  candidate,
  compareCaptures=true,
}={}) {
  if (!condition || typeof condition!=='object') {
    throw new TypeError('oracle condition is required');
  }
  if (!Array.isArray(cases) || cases.length===0) {
    throw new TypeError('oracle cases must be a non-empty array');
  }
  if (typeof candidate!=='function') {
    throw new TypeError('oracle candidate must be a function');
  }

  const results=[];
  let falsePositives=0;
  let falseNegatives=0;
  let captureMismatches=0;
  let comparedCaptures=0;

  for (let index=0;index<cases.length;index++) {
    const context=cases[index];
    const expected=evaluateCondition(condition,context);
    const actual=normalizeCandidate(candidate(context));

    if (expected.matched && !actual.matched) falseNegatives++;
    if (!expected.matched && actual.matched) falsePositives++;

    let captureEqual=null;
    if (
      compareCaptures &&
      expected.matched &&
      actual.matched &&
      Object.keys(expected.captures).length
    ) {
      comparedCaptures++;
      captureEqual=actual.captures!==null && capturesEqual(expected.captures,actual.captures);
      if (!captureEqual) captureMismatches++;
    }

    results.push({index,expected,actual,captureEqual});
  }

  return {
    cases:cases.length,
    falsePositives,
    falseNegatives,
    captureMismatches,
    comparedCaptures,
    matchExact:falsePositives===0 && falseNegatives===0,
    captureExact:comparedCaptures===0 ? null : captureMismatches===0,
    results,
  };
}
