# WayX Converter Status

## 2026-09-29 phase 4 — Rewrite v2 semantic coverage

Implemented on `work/rewrite-v2-semantic-actions-20260929` / PR #6:

- Added a target-regex compiler for Loon flags.
  - `/i` is compiled to explicit ASCII case-folded character classes instead of emitting undocumented QX inline modifiers.
  - `m/s` are elided only for URL/header subjects where CR/LF cannot occur; body regex remains fail-closed.
  - Unicode or ambiguous case-folding remains Review Tier.
- Added behavior-first Rewrite v2 mapping:
  - QX/Surge JSON delete/replace/JQ.
  - Proven scalar body replacement.
  - Redirect and URL replacement.
  - Reject behavior including non-200/custom responses.
  - Header pipelines.
  - Inline mock and response mock + Header pipelines.
- QX redirect uses a generated `script-echo-response` to reproduce Loon's matched-range replacement and named capture templates without assuming undocumented QX 302 capture syntax.
- Ordinary Loon `reject(404)` uses native QX `url reject`; generated `script-echo-response` is reserved for reject behavior with no exact native QX primitive.
- QX same-phase Header set/del/replace is combined into one generated script so left-to-right Loon ordering is preserved.
- QX `header.add` remains fail-closed because the documented header object cannot guarantee duplicate-header semantics.
- QX inline `body.mock` and response mock + Header pipelines are combined into one generated script.
- Surge mappings were rechecked from the official Surge documentation entrypoint/manual:
  - `[URL Rewrite]` for redirect/url.replace.
  - `[Body Rewrite]` for body/JQ operations.
  - `[Header Rewrite]` for header operations; Loon `set` becomes `header-del` + `header-add`.
  - native `[URL Rewrite] ... _ reject` for ordinary reject;
  - `[Map Local]` only for structured/image/custom reject responses and static mock responses that actually require a synthesized response.
- Added a real-resource coverage scan to PR CI.

Current RuCu6 Rewrite v2 coverage from CI:

- 9 current RuCu6 plugins.
- 175 Rewrite v2 entries.
- Parse/action validation errors: 0.
- Quantumult X: 174 / 175 automatically mapped.
  - direct: 156
  - generated inline mock: 7
  - generated redirect: 9
  - generated header: 2
  - Review: 1
- Surge: 175 / 175 automatically mapped.
  - URL Rewrite reject: 6
  - Map Local reject: 118
  - direct Body/JQ: 32
  - Map Local mock: 7
  - URL Rewrite: 9
  - Header Rewrite: 3
- The only current QX Rewrite v2 Review item is `webpage.lpx`:
  `response.header.add("content-disposition", "inline")`.
  It is intentionally not approximated because Loon `header.add` appends a second same-name field while QX's documented script headers are an object.

Verification:

- Converter syntax check: passed.
- Converter checkpoint: passed.
- MyBlockAds JQ golden: passed.
- RuCu6 Rewrite v2 semantic coverage scan: passed.

## 2026-09-29 phase 3 — semantic QX conversion

Implemented on `work/semantic-rewrite-mock-20260929` / PR #5:

- Conversion policy is now explicitly behavior-first rather than token-by-token.
- Loon URL-regex terminal reject semantics map to QX by observable response:
  - `reject(404)` -> native QX `reject`;
  - `reject(200)` -> `reject-200`;
  - `reject_dict(200)` -> `reject-dict`;
  - `reject_array(200)` -> `reject-array`;
  - `reject_img(200)` -> `reject-img`;
  - non-200 status is not silently collapsed to a QX 200 primitive.
- Simple response-phase reject rules may use the same QX terminal response primitive when URL condition and result are equivalent; phase spelling itself is not treated as the target behavior.
- `request/response.body.mock_file` now has a QX generated-script strategy:
  - response -> `script-echo-response`;
  - request text body -> `script-request-body`;
  - plugin-relative files resolve against the plugin URL;
  - mock-file dependencies are fetched/materialized during conversion and embedded into the generated QX script, so the QX rewrite does not perform a second network fetch;
  - response binary/Base64 files are embedded as Base64 and decoded to the official QX `bodyBytes` output form inside the generated script;
  - request binary/bodyBytes remains disabled until an official request-body example proves that exact output contract.
- Explicit source-level QX rejection and unported Loon-only `$utils` are hard blockers. A WayX adaptation/fork URL cannot override them; the original Loon script declaration remains commented in QX output.
- PR #5 Converter Check passed after these changes.

Current semantic boundary:

- Regex flags such as Loon `/i` still require an official QX-supported equivalent before automatic promotion.
- Compound conditions, captures and multi-action pipelines remain Review Tier until their complete behavior can be reproduced, rather than flattening them into independent target lines.
- `mock_file` response/header pipelines still need a single generated script when header actions must execute in Loon order.
- Surge behavior was not weakened by this QX phase; Surge-specific expansion continues from official Surge syntax.

## 2026-09-29 phase 2

Completed in this branch:

- Fixed the PR #3 Converter Check regression: the Surge policy assertion itself was over-escaped; it now uses an exact expected string.
- Added `converter/src/script-compat.mjs`:
  - QX script compatibility / fork registry.
  - Known RuCu6 Bilibili protobuf scripts are blocked from QX executable output because upstream explicitly throws on Quantumult X and uses Loon `$utils.ungzip`.
  - Known RuCu6 YouTube request/response scripts are registered as having an explicit QuanX adapter (`$task / $prefs / bodyBytes` translation).
  - Unknown scripts are scanned for explicit QX rejection and direct Loon-only `$utils` use.
- Integrated script compatibility into the real legacy sync converter:
  - blocked scripts keep the original Loon declaration as comments;
  - output includes `[WayX] MANUAL PORT REQUIRED`;
  - no invalid QX script execution line is emitted;
  - verified WayX QX forks remain executable.
- Added `converter/tools/scan-script-compat.mjs` and wired it into upstream monitoring.
- Added `converter/src/dependency.mjs`:
  - discovers `request/response.json.jq_file`;
  - discovers `request/response.body.mock_file`;
  - resolves absolute HTTP(S) and plugin-relative dependencies when a plugin source URL is available;
  - can inline JQ and text/Base64 mock dependencies without changing Action ordering;
  - binary mock files remain Review Tier until a target-native binary/file mapping is proven.
- Extended checkpoint coverage for the script registry and dependency resolver.
- Converter CI now syntax-checks both `converter/src/*.mjs` and `converter/tools/*.mjs`.
- MyBlockAds JQ golden fixture is now automated: QX and Surge must keep the same 11 ordered JQ rules, 10 unique expressions, and the reviewed ordered-pair fingerprint.

Official behavior rechecked during this phase:

- Loon Rewrite v2 current docs: `jq_file`, `mock_file`, Base64 and pipeline semantics.
- Loon plugin/script docs: plugin object arguments preserve typed values.
- Quantumult X official repository: `$task.fetch`, `$prefs`, `bodyBytes` are documented; no official `$utils.ungzip` example was found.
- Surge documentation entrypoint and current Body Rewrite / Map Local manuals were checked before retaining the current Surge mappings.

## Current boundary

- Bilibili protobuf is treated as **unsupported in QX output**, not as a pending fork: the source explicitly rejects QX and depends on `$utils.ungzip`, so WayX preserves the Loon declaration as comments and emits no executable QX line.
- Current Rewrite v2 simple URL-condition coverage is effectively complete for present RuCu6 sources; QX duplicate `header.add` remains intentionally unconverted.
- Compound Rewrite v2 conditions, runtime-variable values and target-unprovable regex/body semantics remain fail-closed.
- Binary response `mock_file` is materialized during conversion, embedded losslessly as Base64, and restored through the official QX `bodyBytes` output path; binary request `mock_file` remains disabled until its exact QX request-body output contract is officially evidenced.

## Next work

1. Parse current Loon Script v2 declarations into an AST instead of treating them as legacy `script-path=` lines.
2. Preserve typed plugin arguments and `[Argument]` bindings for Script v2; use QX BoxJs/`$prefs` bridges only when needed.
3. Map request/response phase, body/binary-body requirements, timeout and enable semantics to verified QX/Surge script forms.
4. Keep explicit QX-incompatible source scripts commented and disabled; do not fork them.
5. Add a Script v2 real-resource coverage report analogous to the Rewrite v2 report.
