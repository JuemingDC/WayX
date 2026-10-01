// Shared workflow diagnostics for catalog conversion runners.
// Author: chance
// Category: Converter / Workflow Diagnostics

function fallbackValue(error, mode) {
  return mode === 'error' ? error : error?.message;
}

function failureDetail(error, mode) {
  return error?.stack || fallbackValue(error, mode);
}

function annotationValue(error, mode) {
  if (mode === 'error') return error?.message || error;
  return error?.message;
}

export function formatWorkflowErrorAnnotation(entry, error, {annotationFallback='message'}={}) {
  const title=entry?.id;
  const message=String(annotationValue(error,annotationFallback)).replaceAll('\n','%0A');
  return `::error title=${title}::${message}`;
}

export function createWorkflowFailureReporter({
  summaryLabel='Failures',
  detailFallback='message',
  annotationFallback='message',
  writeError=console.error,
}={}) {
  const failures=[];

  function capture(entry,error) {
    failures.push(`${entry.id}: ${failureDetail(error,detailFallback)}`);
    writeError(formatWorkflowErrorAnnotation(entry,error,{annotationFallback}));
  }

  function report() {
    if (!failures.length) return false;
    writeError(`\n${summaryLabel}:\n` + failures.join('\n\n'));
    return true;
  }

  return {
    capture,
    report,
    get size() { return failures.length; },
    snapshot() { return [...failures]; },
  };
}
