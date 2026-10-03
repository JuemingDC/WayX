// WayX equivalence-planning result contract
// Author: chance
// Category: Converter / Core / Equivalence Planning

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


export const ORACLE_FAILURES=Object.freeze({
  NATIVE_MATCH:'oracle-refuted-native-match-equivalence',
  NATIVE_CAPTURE:'oracle-refuted-native-capture-equivalence',
  PREFILTER_FALSE_NEGATIVE:'oracle-refuted-prefilter-soundness',
});

export function verifyPlanAgainstOracle(plan,oracle,{requireCapture=false}={}) {
  object(plan,'equivalence plan');
  object(oracle,'oracle report');

  if (plan.kind===EQUIVALENCE_KINDS.NATIVE) {
    if (oracle.matchExact!==true) {
      return unsupported(ORACLE_FAILURES.NATIVE_MATCH,{plan,oracle});
    }
    if (requireCapture && oracle.captureExact!==true) {
      return unsupported(ORACLE_FAILURES.NATIVE_CAPTURE,{plan,oracle});
    }
  }

  if (plan.kind===EQUIVALENCE_KINDS.GUARDED && oracle.falseNegatives!==0) {
    return unsupported(ORACLE_FAILURES.PREFILTER_FALSE_NEGATIVE,{plan,oracle});
  }

  if (
    plan.kind!==EQUIVALENCE_KINDS.NATIVE &&
    plan.kind!==EQUIVALENCE_KINDS.GUARDED &&
    plan.kind!==EQUIVALENCE_KINDS.DISPATCHER &&
    plan.kind!==EQUIVALENCE_KINDS.UNSUPPORTED
  ) {
    throw new Error('unknown equivalence plan kind: '+String(plan.kind));
  }

  if (plan.kind===EQUIVALENCE_KINDS.UNSUPPORTED) return plan;

  return {
    ...plan,
    proof:{
      ...plan.proof,
      oracle,
    },
  };
}
