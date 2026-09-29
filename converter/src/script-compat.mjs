// WayX source-script compatibility inspection
// Author: chance
// Category: Converter / Script Compatibility
//
// IMPORTANT:
// Compatibility is inferred only from the script declaration/source content.
// Plugin id/name/author/repository/script URL path must never select a semantic port.

export function scriptRuntimeSignals(sourceText = '') {
  const source = String(sourceText || '');
  return {
    sourceAvailable: Boolean(source.trim()),
    explicitQxRejection:
      /quantumult\s*x[^\n]{0,160}(?:not\s+support|unsupported|not\s+supported|does\s+not\s+support)/i.test(source) ||
      /(?:not\s+support|unsupported|not\s+supported|does\s+not\s+support)[^\n]{0,160}quantumult\s*x/i.test(source),
    explicitQxSupport:
      /quantumult\s*x[^\n]{0,160}(?:support|supported|adapter|compatible)/i.test(source) ||
      /(?:support|supported|adapter|compatible)[^\n]{0,160}quantumult\s*x/i.test(source),
    qxTask: /\$task\b/.test(source),
    qxPrefs: /\$prefs\b/.test(source),
    qxNotify: /\$notify\b/.test(source),
    qxBodyBytes: /\bbodyBytes\b/.test(source),
    qxNamedAdapter: /\b(?:QuanX|QuantumultX|isQuanX|isQuantumultX)\b/i.test(source),
    loonUtils: /\$utils\s*\./.test(source),
    surgeHttpClient: /\$httpClient\b/.test(source),
    surgePersistentStore: /\$persistentStore\b/.test(source),
    loonObject: /\$loon\b/.test(source),
    done: /\$done\s*\(/.test(source),
  };
}

export function inspectQxScriptCompatibility({ sourceText = '' } = {}) {
  const signals = scriptRuntimeSignals(sourceText);

  if (!signals.sourceAvailable) {
    return {
      status: 'review',
      executable: false,
      reason: 'Source JavaScript is unavailable, so Quantumult X runtime compatibility cannot be proven from content.',
      signals,
    };
  }

  // Explicit incompatibility always wins over any generic QX-looking token.
  if (signals.explicitQxRejection) {
    return {
      status: 'unsupported',
      executable: false,
      reason: 'Script explicitly rejects Quantumult X; keep the source declaration commented in QX output.',
      signals,
    };
  }

  // Loon-only helper API has no proven QX equivalent. If a script also contains
  // a QX adapter, the adapter must make the Loon-only path conditional; a simple
  // token scan cannot prove that control flow, so keep it in Review.
  if (signals.loonUtils) {
    const qxEvidence = signals.qxTask || signals.qxPrefs || signals.qxNotify || signals.qxNamedAdapter || signals.explicitQxSupport;
    return {
      status: qxEvidence ? 'review' : 'unsupported',
      executable: false,
      reason: qxEvidence
        ? 'Script contains both Quantumult X evidence and Loon $utils usage; control-flow compatibility requires review.'
        : 'Script directly uses Loon $utils API without a proven Quantumult X equivalent.',
      signals,
    };
  }

  const qxEvidence =
    signals.qxTask ||
    signals.qxPrefs ||
    signals.qxNotify ||
    signals.qxNamedAdapter ||
    signals.explicitQxSupport;

  const foreignRuntimeOnly =
    (signals.surgeHttpClient || signals.surgePersistentStore || signals.loonObject) &&
    !qxEvidence;

  if (foreignRuntimeOnly) {
    const APIs = [
      signals.surgeHttpClient ? '$httpClient' : null,
      signals.surgePersistentStore ? '$persistentStore' : null,
      signals.loonObject ? '$loon' : null,
    ].filter(Boolean).join(', ');
    return {
      status: 'unsupported',
      executable: false,
      reason: 'Script uses non-Quantumult-X runtime API(s) without QX adapter evidence: ' + APIs + '.',
      signals,
    };
  }

  if (qxEvidence) {
    return {
      status: 'runtime-evidence',
      executable: true,
      reason: 'Script source contains Quantumult X runtime evidence and no blocking incompatibility signal.',
      signals,
    };
  }

  // A script containing only platform-neutral request/response globals may be
  // portable, but token scanning cannot prove all runtime calls. Mark it generic
  // executable only when it uses no known foreign platform APIs.
  return {
    status: 'generic',
    executable: true,
    reason: 'No known platform-specific blocking signal was found; preserve the source script unchanged and use declaration semantics.',
    signals,
  };
}

export function qxManualPortComment({ scriptUrl = '', result } = {}) {
  const reason = result?.reason || 'Quantumult X compatibility is not available for this source script.';
  const label = result?.status === 'review'
    ? '# [WayX] QUANTUMULT X REVIEW REQUIRED - source script disabled:'
    : '# [WayX] QUANTUMULT X UNSUPPORTED - source script disabled:';
  return [
    label,
    `# Script: ${scriptUrl}`,
    `# Reason: ${reason}`,
  ];
}
