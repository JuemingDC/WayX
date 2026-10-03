// WayX equivalence-planning result contract
// Author: chance
// Category: Converter / Core / Equivalence Planning

import { evaluateCondition } from './condition-evaluator.mjs';

export const EQUIVALENCE_KINDS=Object.freeze({
  NATIVE:'native-equivalent',
  GUARDED:'guarded-helper',
  DISPATCHER:'phase-dispatcher',
  UNSUPPORTED:'unsupported',
});

function object(value,label) {
  if (!value || typeof value!=='object') throw new TypeError(label+' must be an object');
  return value;
}

export function nativeEquivalent({target,output,proof}={}) {
  object(proof,'native-equivalent proof');
  if (proof.exact!==true) throw new Error('native-equivalent requires proof.exact=true');
  return {kind:EQUIVALENCE_KINDS.NATIVE,target,output,proof};
}

export function guardedHelper({target,prefilter,runtime,proof}={}) {
  object(proof,'guarded-helper proof');
  if (proof.noFalseNegatives!==true) {
    throw new Error('guarded-helper requires proof.noFalseNegatives=true');
  }
  if (proof.safeNoop!==true) {
    throw new Error('guarded-helper requires proof.safeNoop=true');
  }
  return {kind:EQUIVALENCE_KINDS.GUARDED,target,prefilter,runtime,proof};
}

export function phaseDispatcher({target,phase,rules,runtime,proof}={}) {
  object(proof,'phase-dispatcher proof');
  if (proof.preservesOrder!==true) {
    throw new Error('phase-dispatcher requires proof.preservesOrder=true');
  }
  if (proof.safeNoop!==true) {
    throw new Error('phase-dispatcher requires proof.safeNoop=true');
  }
  if (!Array.isArray(rules) || rules.length===0) {
    throw new Error('phase-dispatcher requires at least one source rule');
  }
  return {kind:EQUIVALENCE_KINDS.DISPATCHER,target,phase,rules,runtime,proof};
}

export function unsupported(reason,details={}) {
  const message=String(reason || '').trim();
  if (!message) throw new Error('unsupported requires a non-empty reason');
  return {kind:EQUIVALENCE_KINDS.UNSUPPORTED,reason:message,details};
}


function targetMatch(result,index) {
  if (typeof result==='boolean') return result;
  if (result && typeof result==='object' && typeof result.matched==='boolean') {
    return result.matched;
  }
  throw new TypeError('target matcher model case '+index+' must return boolean or {matched:boolean}');
}

/**
 * Differential evidence for one source condition against one target matcher model.
 *
 * This is intentionally evidence, not a proof generator: finite contexts can
 * expose false positives/negatives, but cannot by themselves establish full
 * semantic equivalence.
 */
export function differentialConditionOracle({
  condition,
  target='target',
  targetModel,
  contexts=[],
}={}) {
  if (!condition || typeof condition!=='object') {
    throw new TypeError('differential oracle requires a condition AST');
  }
  if (typeof targetModel!=='function') {
    throw new TypeError('differential oracle requires a target matcher model');
  }
  if (!Array.isArray(contexts) || contexts.length===0) {
    throw new Error('differential oracle requires at least one context');
  }

  const cases=contexts.map((context,index)=>{
    const sourceMatched=Boolean(evaluateCondition(condition,context).matched);
    const targetMatched=targetMatch(targetModel(context),index);
    let classification='match';
    if (sourceMatched && !targetMatched) classification='false-negative';
    else if (!sourceMatched && targetMatched) classification='false-positive';
    return {index,sourceMatched,targetMatched,classification};
  });
  const falseNegatives=cases.filter(item=>item.classification==='false-negative');
  const falsePositives=cases.filter(item=>item.classification==='false-positive');

  return {
    target:String(target || 'target'),
    caseCount:cases.length,
    observedExact:falseNegatives.length===0 && falsePositives.length===0,
    noFalseNegatives:falseNegatives.length===0,
    noFalsePositives:falsePositives.length===0,
    falseNegatives,
    falsePositives,
    cases,
  };
}
