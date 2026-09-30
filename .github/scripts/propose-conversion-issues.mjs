// WayX unknown conversion issue proposer
// Author: chance
// Category: Automation / Review / Issue Proposal

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  extractUnknownIssueMarkers,
  groupUnknownIssueMarkers,
  conversionUnknownIssueTitle,
} from '../../converter/src/unknown-issue.mjs';

const ROOT = process.cwd();
const TARGET_DIRS = [
  path.join(ROOT, 'Adblock', 'Quantumult X'),
  path.join(ROOT, 'Adblock', 'Surge'),
];
const dryRun = process.argv.includes('--dry-run');
const repo = process.env.GITHUB_REPOSITORY || '';
const runtimeDir = path.join(ROOT, 'monitor', '.runtime');
const summaryPath = path.join(runtimeDir, 'unknown-conversion-issues.md');

async function targetFiles() {
  const out = [];
  for (const dir of TARGET_DIRS) {
    let entries = [];
    try { entries = await fs.readdir(dir, {withFileTypes:true}); } catch { continue; }
    for (const entry of entries) {
      if (!entry.isFile() || !/\.(?:snippet|sgmodule)$/i.test(entry.name)) continue;
      out.push(path.join(dir, entry.name));
    }
  }
  return out.sort();
}

function gh(args) {
  return execFileSync('gh', args, {encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim();
}

function issueBody(group) {
  const reasons = group.reasons.length ? group.reasons.map(reason => '- ' + reason).join('\n') : '- no additional reason';
  const locations = group.locations.map(location => '- ' + location.file + ':' + location.line).join('\n');
  return [
    '## Unknown conversion',
    '',
    'WayX converter already failed closed: the source declaration is commented and no guessed active target rule was generated.',
    '',
    '- Code: ' + group.code,
    '- Fingerprint: ' + group.fingerprint,
    '',
    '### Reason',
    '',
    reasons,
    '',
    '### Source declaration',
    '',
    '```text',
    group.source || '(source declaration unavailable)',
    '```',
    '',
    '### Generated target locations',
    '',
    locations || '- (none)',
    '',
    '### Required resolution',
    '',
    'Verify source semantics and official target capability first, then update CONVERSION_SPEC.md, generic implementation, synthetic regression and real-source regression. Keep the declaration commented until proven.',
    '',
  ].join('\n');
}

async function main() {
  const markers = [];
  for (const file of await targetFiles()) {
    const sourceText = await fs.readFile(file, 'utf8');
    const relative = path.relative(ROOT, file).replaceAll(path.sep, '/');
    markers.push(...extractUnknownIssueMarkers(sourceText, relative));
  }
  const groups = groupUnknownIssueMarkers(markers);

  await fs.mkdir(runtimeDir, {recursive:true});
  const summary = [
    '# Unknown conversion issue proposal',
    '',
    'Detected: ' + groups.length,
    '',
    ...groups.flatMap(group => [
      '- [' + group.code + '] ' + group.fingerprint + ': ' + (group.source || '(no source declaration)'),
      ...group.locations.map(location => '  - ' + location.file + ':' + location.line),
    ]),
    '',
  ].join('\n');
  await fs.writeFile(summaryPath, summary);

  const output = process.env.GITHUB_OUTPUT;
  if (output) {
    await fs.appendFile(output, 'has_unknown=' + (groups.length ? 'true' : 'false') + '\n');
    await fs.appendFile(output, 'summary=' + path.relative(ROOT, summaryPath).replaceAll(path.sep, '/') + '\n');
  }

  if (!groups.length) { console.log('No ISSUE REQUIRED markers found.'); return; }
  if (dryRun) { console.log(JSON.stringify(groups, null, 2)); return; }
  if (!repo) throw new Error('GITHUB_REPOSITORY is required to create conversion issues');

  try {
    gh(['label','create','conversion-unknown','--repo',repo,'--description','Unknown converter syntax or unregistered semantic type','--color','D93F0B','--force']);
  } catch (error) {
    throw new Error('failed to ensure conversion-unknown label: ' + String(error?.stderr || error?.message || error));
  }

  for (const group of groups) {
    const title = conversionUnknownIssueTitle(group);
    let existing = [];
    try {
      const raw = gh(['issue','list','--repo',repo,'--state','all','--search','"' + title + '" in:title','--json','number,title,state,url','--limit','20']);
      existing = raw ? JSON.parse(raw) : [];
    } catch (error) {
      throw new Error('failed to search existing conversion issue: ' + String(error?.stderr || error?.message || error));
    }
    const exact = existing.find(issue => issue.title === title);
    if (exact) { console.log('Reuse issue #' + exact.number + ': ' + title); continue; }

    try {
      const url = gh(['issue','create','--repo',repo,'--title',title,'--body',issueBody(group),'--label','conversion-unknown']);
      console.log('Created conversion issue: ' + url);
    } catch (error) {
      throw new Error('failed to create conversion issue: ' + String(error?.stderr || error?.message || error));
    }
  }
}

await main();
