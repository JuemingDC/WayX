// WayX remote-script compatibility and fork registry
// Author: chance
// Category: Converter / Script Compatibility

const PORTS = [
  {
    id: 'rucu6-bilibili-protobuf',
    test: url => /\/Scripts\/bilibili\/(?:request|response)\.js(?:\?|$)/i.test(String(url || '')),
    qx: {
      status: 'manual-port',
      executable: false,
      reason: 'Upstream Bilibili protobuf runtime explicitly rejects Quantumult X and uses $utils.ungzip; no QX fork is registered.',
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

  if (forkUrl && forkUrl !== scriptUrl) {
    return {
      status: 'fork',
      executable: true,
      reason: 'WayX QX fork selected by converter.',
      registryId: registered?.id || null,
      signals,
    };
  }

  if (registered) {
    return { ...registered, signals };
  }

  if (signals.explicitQxRejection) {
    return {
      status: 'manual-port',
      executable: false,
      reason: 'Script explicitly rejects Quantumult X and no verified QX fork is registered.',
      registryId: null,
      signals,
    };
  }

  if (signals.loonUtils) {
    return {
      status: 'manual-port',
      executable: false,
      reason: 'Script directly uses Loon $utils API; no verified Quantumult X equivalent/fork is registered.',
      registryId: null,
      signals,
    };
  }

  const qxEvidence = signals.qxTask || signals.qxPrefs || signals.qxNotify || signals.qxNamedAdapter;
  return {
    status: qxEvidence ? 'runtime-evidence' : 'generic',
    executable: true,
    reason: qxEvidence
      ? 'No blocking signal found and the script contains Quantumult X runtime evidence.'
      : 'No blocking signal found; generic script execution remains subject to normal Review Tier checks when content changes.',
    registryId: null,
    signals,
  };
}

export function qxManualPortComment({ scriptUrl = '', result } = {}) {
  const reason = result?.reason || 'Quantumult X compatibility could not be proven.';
  return [
    '# [WayX] MANUAL PORT REQUIRED:',
    `# Script: ${scriptUrl}`,
    `# Reason: ${reason}`,
  ];
}
