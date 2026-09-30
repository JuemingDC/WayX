// WayX unknown conversion issue marker parser
// Author: chance
// Category: Converter / Review / Issue Proposal

import crypto from 'node:crypto';

const ISSUE_RE = /^# \[WayX\] ISSUE REQUIRED \[([A-Za-z0-9._-]+)\]:\s*(.*)$/;
const SOURCE_RE = /^# Source declaration:\s*(.*)$/;

export function extractUnknownIssueMarkers(text, file = '') {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const marker = lines[i].trim().match(ISSUE_RE);
    if (!marker) continue;

    let source = '';
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
      const next = lines[j].trim();
      const sourceMatch = next.match(SOURCE_RE);
      if (sourceMatch) {
        source = sourceMatch[1].trim();
        break;
      }
      if (ISSUE_RE.test(next) || /^\[[^\]]+\]$/.test(next)) break;
    }

    out.push({
      code:marker[1],
      reason:marker[2].trim(),
      source,
      file:String(file || ''),
      line:i + 1,
    });
  }
  return out;
}

export function unknownIssueFingerprint(item) {
  const basis = String(item?.code || '') + '\0' + String(item?.source || '');
  return crypto.createHash('sha256').update(basis).digest('hex').slice(0, 16);
}

export function groupUnknownIssueMarkers(items = []) {
  const groups = new Map();
  for (const item of items) {
    const fingerprint = unknownIssueFingerprint(item);
    if (!groups.has(fingerprint)) {
      groups.set(fingerprint, {
        fingerprint,
        code:item.code,
        source:item.source,
        reasons:new Set(),
        locations:[],
      });
    }
    const group = groups.get(fingerprint);
    if (item.reason) group.reasons.add(item.reason);
    if (!group.locations.some(location => location.file === item.file && location.line === item.line)) {
      group.locations.push({file:item.file, line:item.line});
    }
  }
  return [...groups.values()]
    .map(group => ({...group, reasons:[...group.reasons].sort()}))
    .sort((a,b) => a.fingerprint.localeCompare(b.fingerprint));
}

export function conversionUnknownIssueTitle(group) {
  return `[conversion-unknown:${group.fingerprint}] ${group.code}`;
}
