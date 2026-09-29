// WayX remote-script compatibility registry
// Author: chance
// Category: Converter / Script Compatibility

const PORTS = [
  {
    id: 'rucu6-bilibili-protobuf',
    test: url => /\/Scripts\/bilibili\/(?:request|response)\.js(?:\?|$)/i.test(String(url || '')),
    qx: {
      status: 'unsupported',
      executable: false,
      reason: 'Upstream Bilibili protobuf runtime explicitly rejects Quantumult X and uses Loon $utils.ungzip; keep the source declaration commented in QX output.',
    },
  },
  {
    id: 'rucu6-youtube',
    test: url => /\/Scripts\/youtube\/(?:request|response)\.js(?:\?|$)/i.test(String(url || '')),
    qx: {
      status: 'native-adapter',
      executable: true,
      reason: 'Upstream YouTube runtime contains an explicit QuanX adapter using $task/$prefs and bodyBytes translation.',
    },
  },
];

export const QX_SCRIPT_PORT_REGISTRY = Object.freeze(PORTS);

export function registeredQxScriptPort(scriptUrl = '') {
  const item = PORTS.find(entry => entry.test(scriptUrl));
  return item ? { id: item.id, ...item.qx } : null;
}

export function scriptRuntimeSignals(sourceText = '') {
  const source = String(sourceText || '');
  return {
    explicitQxRejection:
      /quantumult\s*x[^\n]{0,120}(?:not\s+support|unsupported|not\s+supported)/i.test(source) ||
      /(?:not\s+support|unsupported|not\s+supported)[^\n]{0,120}quantumult\s*x/i.test(source),
    qxTask: /\$task\b/.test(source),
    qxPrefs: /\$prefs\b/.test(source),
    qxNotify: /\$notify\b/.test(source),
    qxBodyBytes: /\bbodyBytes\b/.test(source),
    qxNamedAdapter: /\b(?:QuanX|QuantumultX|isQuanX|isQuantumultX)\b/i.test(source),
    loonUtils: /\$utils\s*\./.test(source),
    surgeHttpClient: /\$httpClient\b/.test(source),
    surgePersistentStore: /\$persistentStore\b/.test(source),
    loonObject: /\$loon\b/.test(source),
  };
}

export function inspectQxScriptCompatibility({ scriptUrl = '', sourceText = '', forkUrl = '' } = {}) {
  const signals = scriptRuntimeSignals(sourceText);
  const registered = registeredQxScriptPort(scriptUrl);

  // Explicit incompatibility always wins. WayX must not turn an unsupported
  // source runtime into an executable QX line by selecting a fork first.
  if (signals.explicitQxRejection || registered?.executable === false) {
    return {
      status: 'unsupported',
      executable: false,
      reason: registered?.reason || 'Script explicitly rejects Quantumult X; keep the source declaration commented in QX output.',
      registryId: registered?.id || null,
      signals,
    };
  }

  if (signals.loonUtils) {
    return {
      status: 'unsupported',
      executable: false,
      reason: 'Script directly uses Loon $utils API without a proven Quantumult X equivalent; keep the source declaration commented in QX output.',
      registryId: registered?.id || null,
      signals,
    };
  }

  if (registered) return { ...registered, signals };

  const qxEvidence = signals.qxTask || signals.qxPrefs || signals.qxNotify || signals.qxNamedAdapter;
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
      reason: 'Script uses non-Quantumult-X runtime API(s) without a QX adapter: ' + APIs + '; keep the source declaration commented in QX output.',
      registryId: null,
      signals,
    };
  }

  // A WayX adaptation is allowed only for a source script that is otherwise
  // QX-compatible (for example an Argument/$prefs bridge), never to override
  // an explicit source-level incompatibility.
  if (forkUrl && forkUrl !== scriptUrl) {
    return {
      status: 'adapted',
      executable: true,
      reason: 'WayX QX adaptation selected for an otherwise compatible source script.',
      registryId: null,
      signals,
    };
  }

  return {
    status: qxEvidence ? 'runtime-evidence' : 'generic',
    executable: true,
    reason: qxEvidence
      ? 'No blocking signal found and the script contains Quantumult X runtime evidence.'
      : 'No blocking signal found; preserve the source script behavior and use the normal QX script action selected from request/response semantics.',
    registryId: null,
    signals,
  };
}

export function qxManualPortComment({ scriptUrl = '', result } = {}) {
  const reason = result?.reason || 'Quantumult X compatibility is not available for this source script.';
  return [
    '# [WayX] QUANTUMULT X UNSUPPORTED - source script disabled:',
    `# Script: ${scriptUrl}`,
    `# Reason: ${reason}`,
  ];
}
