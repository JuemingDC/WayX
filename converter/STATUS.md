# WayX Converter Status

## 2026-09-29 phase 3 — semantic QX conversion

Implemented on `work/semantic-rewrite-mock-20260929` / PR #5:

- Conversion policy is now explicitly behavior-first rather than token-by-token.
- Loon URL-regex terminal reject semantics map to QX by observable response:
  - `reject(200)` / plain reject-style URL blocking -> `reject-200`;
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
- Parsing or dependency resolution alone never promotes complex Rewrite v2 rules to Safe Tier.
- Binary response `mock_file` is materialized during conversion, embedded losslessly as Base64, and restored through the official QX `bodyBytes` output path; binary request `mock_file` remains disabled until its exact QX request-body output contract is officially evidenced.

## Next work

1. Extend the behavior-first Rewrite v2 generator to redirect, JQ, body/header/JSON modifications and safe pipelines.
2. Generate one target script when a Loon pipeline has ordering or shared-state semantics that cannot be reproduced by independent QX lines.
3. Add target-specific regex-flag handling only after QX support is proven from official material; current `/i` source rules remain outside the golden equivalence claim.
4. After PR #5 is merged, rerun upstream monitoring from the new main and discard stale pre-converter branch output.
