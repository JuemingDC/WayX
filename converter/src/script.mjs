// WayX generic remote-script declaration conversion
// Author: chance
// Category: Converter / Script
//
// Script action selection is based only on declaration semantics and inspected
// source behavior. Script URL, plugin id, author and repository never select an
// action.

export function scriptBehaviorSignals(sourceText='') {
  const source=String(sourceText || '');
  return {
    sourceAvailable:Boolean(source.trim()),
    readsRequestBody:/\$request\.(?:body|bodyBytes)\b/.test(source),
    readsResponseBody:/\$response\.(?:body|bodyBytes)\b/.test(source),
    returnsHttpResponse:
      /\$done\s*\(\s*\{[\s\S]{0,800}\b(?:status|statusCode)\s*:/.test(source) ||
      /\$done\s*\(\s*\{[\s\S]{0,800}\bresponse\s*:\s*\{/.test(source),
  };
}

export function selectQxScriptAction({phase,requiresBody=false,sourceText=''}) {
  const p=String(phase).toLowerCase().replace(/^http-/,'');
  if(!['request','response'].includes(p)) throw new Error(`Unsupported QX HTTP script phase: ${phase}`);

  const signals=scriptBehaviorSignals(sourceText);

  // A request-phase Loon script can either mutate the outgoing request or
  // synthesize an immediate HTTP response. QX uses different rewrite actions
  // for those behaviors, so do not guess when source inspection is unavailable.
  if(p==='request' && !signals.sourceAvailable) {
    return {
      action:null,
      reason:'request-phase source inspection is unavailable; cannot distinguish request mutation from synthetic response',
      override:false,
      signals,
    };
  }

  if(p==='request') {
    if(signals.returnsHttpResponse) {
      const waitsForBody=Boolean(requiresBody || signals.readsRequestBody);
      return {
        action:waitsForBody ? 'script-analyze-echo-response' : 'script-echo-response',
        reason:waitsForBody
          ? 'request-phase source constructs an HTTP response and reads/requires request body'
          : 'request-phase source constructs an HTTP response without request-body dependency',
        override:false,
        signals,
      };
    }
    const needsBody=Boolean(requiresBody || signals.readsRequestBody);
    return {
      action:needsBody ? 'script-request-body' : 'script-request-header',
      reason:needsBody
        ? 'request-phase script reads/requires request body'
        : 'request-phase script does not require request body',
      override:false,
      signals,
    };
  }

  const needsBody=Boolean(requiresBody || signals.readsResponseBody);
  return {
    action:needsBody ? 'script-response-body' : 'script-response-header',
    reason:needsBody
      ? 'response-phase script reads/requires response body'
      : 'response-phase script does not require response body',
    override:false,
    signals,
  };
}

