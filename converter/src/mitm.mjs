// Generic Loon MITM line planner
// Author: chance
// Category: Converter / MITM
// Spec: CONVERSION_SPEC Block 70

export function planMitmLine(line, target) {
  const source=String(line ?? '').trim();
  if (!source) return {section:'mitm', line:''};

  if (/^hostname\s*=/i.test(source)) {
    const hosts=source.split('=').slice(1).join('=').trim();
    if (!hosts) {
      return {
        section:'mitm',
        line:'# [WayX] REVIEW REQUIRED: empty source MITM hostname declaration',
      };
    }
    return {
      section:'mitm',
      line: target === 'surge'
        ? `hostname = %APPEND% ${hosts}`
        : `hostname = ${hosts}`,
    };
  }

  return {
    section:'mitm',
    line:`# [WayX] REVIEW REQUIRED: unsupported source MITM option has no verified target equivalent\n# Source declaration: ${source}`,
  };
}
