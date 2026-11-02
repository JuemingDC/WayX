// Modified: 2026-11-03 (chance). Protect author text and executable lines when compacting managed output.
import assert from "node:assert/strict";
import { compactGeneratedPluginComments as compact } from "../src/domain/output-comments.ts";
const author = '# [WayX] Source Script timeout ignored for Quantumult X.\r\n# Target: Surge';
const original = '# Converted: 2026-11-03\r\n# Converted by: chance\r\n# Source: https://author.test/a\r\n# Target: Quantumult X\r\n\r\n'+author+'\r\n# [WayX] Source Script argument ignored for Quantumult X, matching KOP-XIAO resource-parser conversion behavior.\r\n# [WayX] Unsupported script: requires attention\r\n# [rewrite_local]\r\n^https://a/ url reject\r\n';
const result = compact(original, author);
assert.ok(result.includes(author));
assert.ok(result.includes('Unsupported script: requires attention'));
assert.ok(result.includes('# [rewrite_local]\r\n'));
assert.ok(!result.includes('# Target: Quantumult X'));
assert.ok(!result.includes('KOP-XIAO'));
assert.equal(compact(result,author),result);
const active = (text:string) => text.split('\n').filter(line=>line.trim()&&!line.trim().startsWith('#'));
assert.deepEqual(active(result),active(original));
assert.equal(compact(author,''),author);
console.log('Generated comment compaction: author text, CRLF, active declarations, diagnostics and idempotence passed');
