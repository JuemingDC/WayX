// Modified: 2026-11-09 (chance). Reproduce the interrupted TG parameter header;
// preserve declarations, script payloads, comments, BOM and existing line endings.
import assert from "node:assert/strict";
import { normalizeSurgeModuleHeader } from "../src/domain/surge-module-header.ts";

const metadata = "#!arguments=CLIENT:Telegram\n#!arguments-desc=Select client\n";
const comments = "# Author: PandaX & chance\n# Category: Redirect\n";
const initial = "#!name=Telegram\n#!desc=Redirect\n";
const body = '\n[Script]\nRedirect = type=http-request,argument=CLIENT={{{CLIENT}}},script-path=redirect.js\n';
const interrupted = initial + comments + metadata + body;
const expected = initial + metadata + comments + body;
assert.equal(normalizeSurgeModuleHeader(interrupted), expected);
assert.equal(normalizeSurgeModuleHeader(expected), expected);
assert.equal(normalizeSurgeModuleHeader(initial + comments + body), initial + comments + body);
assert.equal(normalizeSurgeModuleHeader("\uFEFF" + interrupted.replaceAll("\n", "\r\n")), "\uFEFF" + expected.replaceAll("\n", "\r\n"));
console.log("Surge module header: contiguous arguments, stable metadata and unchanged body passed");
