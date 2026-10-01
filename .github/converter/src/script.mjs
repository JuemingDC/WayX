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

  // The Loon declaration phase is authoritative for native QX Script mapping.
  // QX's official sample and KOP-XIAO's resource parser both map
  // request/response + requires-body directly to the corresponding
  // script-request/response-header/body action. Whole-file source inspection
  // is only allowed to strengthen body-dependency detection; it must not
  // switch a declared request script into the echo-response family because
  // multi-platform helpers can contain inactive Surge/Loon response branches.
  if(p==='request') {
    const needsBody=Boolean(requiresBody || signals.readsRequestBody);
    return {
      action:needsBody ? 'script-request-body' : 'script-request-header',
      reason:needsBody
        ? 'request-phase declaration reads/requires request body'
        : 'request-phase declaration does not require request body',
      override:false,
      signals,
    };
  }

  const needsBody=Boolean(requiresBody || signals.readsResponseBody);
  return {
    action:needsBody ? 'script-response-body' : 'script-response-header',
    reason:needsBody
      ? 'response-phase declaration reads/requires response body'
      : 'response-phase declaration does not require response body',
    override:false,
    signals,
  };
}

