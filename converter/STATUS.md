# WayX Converter Status

> Current policy overrides historical implementation notes below when they conflict. As of Phase 12, upstream plugins/scripts/dependencies are original-source-only; no upstream mirror/cache is authoritative or used as fallback.

## 2026-09-29 phase 12 — original-source-only pipeline and deterministic PR generation

Current implementation:

- Source Catalog contains one authoritative `source` URL per Loon plugin; `mirrors` are rejected by schema/CI.
- Plugins are fetched only from the original-author source URL.
- Source Script URLs from `script-path` / Script v2 declarations remain unchanged in QX/Surge output. Script bodies are fetched directly only for compatibility analysis and are not copied into WayX.
- JQ/mock dependencies are fetched directly from the original resolved URL and materialized in memory. Historical `converter/dependencies/` upstream caches were removed.
- If an original plugin/script/dependency URL is unavailable or cannot be safely represented, conversion fails closed / enters Review rather than switching to a mirror.
- WayX-generated helper scripts remain valid converter output when QX lacks a native equivalent; these are not Source Script mirrors.
- `Converter Check` validates parser/semantic/golden/genericity/spec/canonical consistency and, for same-repository PRs only, may commit deterministic generated QX/Surge/helper outputs.
- PR generation is race-safe: checkout uses the PR head SHA, remote head is rechecked before push, and a run skips its write if the PR head advanced while it was executing.
- Scheduled `upstream-monitor` remains responsible for detecting/fetching upstream source changes and feeding the same generic converter.

Verification target after the deterministic generated-output commit:
- regeneration: `changed=0`;
- generated helper references: pass;
- MyBlockAds golden: 10 safely materialized JQ rules + 1 source jq-path fail-closed preservation;
- original Source Script URL preservation: pass;
- no source-script mirror/fallback/cache path.


## 2026-09-29 phase 10 — incremental RuCu6 canonical promotion and consistency hardening

In progress on `work/rucu6-canonical-phase1-20260929` / PR #16:

- Promote reviewed RuCu6 YouTube into managed canonical QX/Surge output using the production converter.
- Keep Bilibili and JingDong for later one-at-a-time promotion instead of widening this review.
- Correct the stale QX `[Argument]` note: current policy is declaration-only conversion; typed/dynamic arguments remain Review. No BoxJs/`$prefs` bridge, wrapper or source-script fork is generated.
- Harden `Converter Check` so canonical verification detects untracked generated files as well as tracked diffs.
- Existing end-to-end golden coverage remains the semantic baseline; source JavaScript remains unchanged.


## 2026-09-29 phase 9 — canonical regeneration and checked-in consistency

Implemented on `work/canonical-regeneration-20260929` / PR #12:

- Added `converter/tools/regenerate-canonical.mjs`.
- The tool imports the production converter instead of duplicating conversion logic.
- Managed canonical sources:
  - all 11 entries in `.github/sources/loon.json`;
  - local RuCu6 `MyBlockAds`, because it already has an audited full-output golden and existing canonical targets.
- Canonical regeneration is offline:
  - reads checked-in Loon source files;
  - resolves exact existing script mirrors under `script/<entry.id>/<filename>` when available;
  - reads script bodies only for compatibility checks;
  - never rewrites/wraps/forks source JavaScript;
  - supports official `*.json.jq_file(...)` through conversion-time materialization; offline canonical generation requires the dependency to be registered in `converter/dependencies/manifest.json` and backed by a checked-in file;
  - recognizes RuCu6's current `response.json.jq("jq-path=https://...")` only as a project-specific legacy compatibility alias. This is not treated or documented as official Loon Rewrite v2 syntax; it is resolved to the cached JQ before QX/Surge output;
  - still refuses uncached `body.mock_file` dependencies in offline canonical mode until their bytes are explicitly materialized.
- Rebuilt managed QX/Surge outputs with the current converter.
- Surge generated modules now use the audited module header layer (`#!name`, `#!desc`, optional requirement/system) and preserve Loon-only metadata as ordinary comments.
- QX managed snippets retain commented `# [filter_local] / # [rewrite_local] / # [mitm]` headings.
- `MyBlockAds.sgmodule` was regenerated as well; its former active Loon `#!author/#!icon/#!date/#!loon_version` lines are now comments. The Reddit JQ dependency is cached at `converter/dependencies/rucu6/reddit.jq`, comment-stripped/minified outside strings, and inlined into both QX and Surge outputs; unresolved `jq-path=` is forbidden by golden tests.
- `QZXY` remains explicitly unmanaged by the Loon converter because it is a hand-maintained native target configuration.
- Permanent `Converter Check` behavior:
  - regenerates managed canonical outputs in the PR workspace;
  - uploads the regenerated output artifact;
  - fails if `Adblock/Quantumult X/` or `Adblock/Surge/` differs from the checked-in tree.
- CI path triggers now also cover the Loon source manifest, Loon resources, mirrored scripts and canonical QX/Surge output directories.

Next work:

1. Extend Script v2 compound-condition conversion only where target behavior is complete and proven.
2. Promote additional RuCu6 plugins into managed canonical output one at a time after their end-to-end golden is reviewed.
3. Keep manual native targets such as QZXY outside automatic Loon regeneration.

## 2026-09-29 phase 8 — end-to-end full-output golden

Implemented on `work/end-to-end-golden-20260929` / PR #11:

- `.github/scripts/sync-convert.mjs` can now be imported by tests without executing network sync; normal CLI execution still runs `main()`.
- Added deterministic complete-output conversion with fixed timestamp against checked-in Loon sources.
- Golden coverage includes six representative full plugins:
  - HTTPDNS — legacy Rule + logical Rule + URL Rewrite + Map Local + MITM;
  - PinDuoDuo — nested URL-REGEX/USER-AGENT Rule, PROTOCOL=QUIC, JQ Body Rewrite, Map Local, source Script declaration, MITM;
  - RuCu6 MyBlockAds — large Rule/Rewrite v2/JQ/Script surface;
  - RuCu6 YouTube — binary Script v2 plus typed argument Review;
  - RuCu6 Bilibili — protobuf QX hard-disable plus JSON script declarations and generated rewrite helpers;
  - RuCu6 JingDong — dynamic enable/Cookies Review plus native script declaration.
- `converter/fixtures/end-to-end-golden.json` locks complete QX and Surge SHA-256 fingerprints, byte sizes, source/generated script counts, Review counts and Surge section order.
- `converter/tests/end-to-end-golden.mjs` additionally validates target semantics:
  - QX section headings remain commented;
  - Surge output passes the strict sgmodule validator;
  - Surge Loon-only metadata is not active;
  - Core 20 requirement appears when Body Rewrite / inline Map Local is active;
  - PinDuoDuo PROTOCOL=QUIC logical rule survives;
  - Bilibili protobuf `request.js/response.js` never appears in an active QX line;
  - YouTube/JingDong typed argument and dynamic enable remain Review instead of modifying source scripts.
- Source Script JavaScript remains unchanged. End-to-end golden validates declarations and generated target helper scripts only.
- Existing MyBlockAds JQ golden, Rewrite v2 coverage, Script v2 coverage, uploaded Loon syntax cases and Surge Rule coverage remain enabled in the same CI job.

Next work:

1. Regenerate the checked-in canonical `Adblock/Quantumult X/` and `Adblock/Surge/` outputs with the merged converter so old pre-audit headers are replaced.
2. Add an offline consistency test that compares checked-in canonical outputs against current converter output after normalizing only the conversion timestamp/source-script mirror URL where appropriate.
3. Then extend Script v2 compound conditions only where target semantics remain fully equivalent.

## 2026-09-29 phase 7 — Surge sgmodule format audit

Implemented on `work/surge-module-format-audit-v2-20260929` / PR #10:

- Rechecked the converter against the current official Surge Manual from the official documentation entrypoint.
- Surge output no longer copies the Loon plugin header as active module metadata.
- Generated module metadata:
  - `#!name`
  - `#!desc`
  - valid `#!system` when present
  - `#!requirement=CORE_VERSION>=20` when active Body Rewrite or inline Map Local is emitted.
- Source metadata is converted to target-native presentation: author/icon/date/homepage/tag become ordinary comments as appropriate, while source-platform-only version fields are omitted from target artifacts.
- WayX conversion metadata remains ordinary comments: conversion time, author `chance`, category, target and source.
- No undocumented Surge `#!category` directive is invented.
- Surge Module `[Rule]` is normalized independently from a normal Surge profile:
  - Loon `REJECT-IMG` -> `REJECT-TINYGIF`;
  - current Surge App runtime-verified built-in policies `REJECT-DROP / REJECT-NO-DROP / CELLULAR / CELLULAR-ONLY / HYBRID / NO-HYBRID` are preserved as active policies instead of being collapsed or commented;
  - unknown/user policy groups remain binding notes rather than fabricated module policies;
  - external policy names such as `PROXY` remain commented for user binding;
  - the converter now recognizes the current official Surge Rule Type Index (DOMAIN family, IP family, USER-AGENT, URL-REGEX, process/source/port/network rules, AND/OR/NOT, SCRIPT, RULE-SET, FINAL) and preserves native Loon→Surge combinations such as nested logic, PROTOCOL=QUIC and `no-resolve`.
- Section output is Surge-native: `[Rule]`, `[URL Rewrite]`, `[Header Rewrite]`, `[Body Rewrite]`, `[Map Local]`, `[Script]`, `[MITM]`.
- URL reject uses `<pattern> _ reject`.
- Header Rewrite uses official `http-request/http-response ... header-*` syntax.
- Script declarations use modern `name = type=http-...,pattern=...,script-path=...` syntax.
- Generated Module MITM hostname uses `%APPEND%` to avoid overriding the parent profile; validator also accepts valid Surge hostname override syntax.
- Added reusable `converter/src/surge-module.mjs` formatter/validator and checkpoint coverage.
- Source JavaScript remains unchanged; this phase changes only declaration/module formatting.

## 2026-09-29 phase 6 — declaration-only scripts and uploaded Loon syntax cases

Implemented on `work/declaration-only-loon-cases-20260929` / PR #9.

This phase supersedes the Script v2 source-bridge behavior recorded in phase 5:

- Source JavaScript is never rewritten, wrapped, prefixed, or forked by the converter.
- Script source may be read only for target-runtime compatibility checks.
- Mirrored script files are exact normalized upstream copies.
- Script v2 target conversion is declaration-only:
  - 103 / 110 current RuCu6 declarations map natively;
  - 3 dynamic-`enable` declarations stay Review;
  - 4 typed/object-`$argument` declarations stay Review.
- No QX BoxJs/`$prefs` wrapper is generated for Script v2.
- No Surge wrapper is generated to reconstruct typed Loon `$argument`.
- Fixed string Surge `argument=` remains allowed because Surge natively exposes it as the string `$argument`.
- QX has no corresponding argument field in the official rewrite sample, so any Loon Script v2 argument remains Review in QX.
- Removed obsolete modified-script artifacts for Tieba/DianPing/PinDuoDuo and restored PinDuoDuo root script to the exact source copy.
- Removed managed BoxJs entries that existed only for script-body bridges; unrelated BoxJs apps remain untouched.

User-provided Loon new-syntax cases are now locked by CI:

- `response.json.delete`
- `response.json.replace`
- `response.json.jq`
- `response.body.mock`
- `reject_dict(200)`
- `reject(404)`
- `reject_img(200)`
- `URL-REGEX ... REJECT-IMG`
- `URL-REGEX ... REJECT-DROP`

Current rule behavior:

- QX `URL-REGEX REJECT-DROP` -> native `url reject` by project policy.
- QX `URL-REGEX REJECT-DROP` remains `url reject`; Surge output preserves `REJECT-DROP / REJECT-NO-DROP` exactly when used as current runtime-supported built-in policies.
- QX `REJECT-IMG` -> `reject-img`.
- Surge Loon `REJECT-IMG` rule policy -> `REJECT-TINYGIF`.
- Ordinary Loon `reject(404)` continues to use native QX `reject` and Surge URL Rewrite `_ reject`.

Verification:

- Converter syntax check: passed.
- Converter checkpoint: passed.
- MyBlockAds JQ golden: passed.
- RuCu6 Rewrite v2 coverage: passed.
- RuCu6 Script v2 declaration coverage: passed.
- Uploaded Loon new-syntax regression cases: passed.
- PR #9 merged to `main` at `06482d4e8b258b7ca50aac84a7ac8d813036c0a9`.

Historical phase-5 notes about generated Script v2 bridges are superseded by this phase.

## 2026-09-29 phase 5 — Loon Script v2 parser, native mapping and argument bridges

Implemented on `work/script-v2-parser-20260929` / PR #8:

- Added a dedicated HTTP Script v2 parser/AST instead of parsing new syntax with legacy `script-path=` regular expressions.
- Current RuCu6 real-source inventory:
  - 9 plugins;
  - 110 active Script v2 declarations;
  - 110 / 110 parsed and validated;
  - 0 parse errors;
  - response: 101;
  - request: 9;
  - `requires_body=true`: 108;
  - `binary_body_mode=true`: 14;
  - plugin-object argument declarations: 5;
  - dynamic `enable`: 3.
- Target planning is native-first:
  - 103 / 110 declarations require no parameter bridge and map directly to QX rewrite script actions / Surge `[Script]`;
  - QX uses `script-request-header/body` or `script-response-header/body` through the existing source-aware action selector;
  - Surge uses official `type=http-request/http-response,pattern=...,script-path=...` plus `requires-body`, `max-size`, `binary-body-mode`, fixed `timeout` and `debug` when present.
- Added per-declaration typed bridges for the 7 declarations that use Loon `[Argument]` and/or dynamic `enable`:
  - QX: BoxJs settings + `$prefs`, then reconstruct the Loon typed `$argument` object before executing the original script;
  - Surge: official Module `#!arguments` / `{{{name}}}` placeholders, then reconstruct typed values from Surge's String `$argument`;
  - a bridge is generated per Script v2 declaration, not per source JS URL, so different declarations using the same script cannot leak parameter shape into each other.
- Bridge generation refuses to wrap a source that declares its own `$argument`, avoiding lexical collisions.
- QX source-runtime compatibility remains a hard gate before bridge generation:
  - explicit QX rejection remains disabled;
  - direct Loon `$utils` remains disabled;
  - scripts that only use `$httpClient`, `$persistentStore` or `$loon` without any QX adapter evidence are disabled;
  - scripts with an explicit QX runtime branch remain eligible.
- RuCu6 Bilibili protobuf request/response scripts remain QX-disabled and are not forked.
- RuCu6 YouTube request/response scripts remain eligible because the source has an explicit QuanX adapter.
- Script v2 real-resource coverage is now part of PR CI, alongside Rewrite v2 and MyBlockAds golden tests.

Current boundary:

- Current RuCu6 Script v2 declarations all use simple URL-regex conditions; target planning remains fail-closed for compound/non-URL conditions until their complete behavior is preserved.
- QX `binary_body_mode` is not invented as a config token; binary behavior is delegated to a script runtime already proven QX-compatible.
- Unsupported script runtimes stay commented rather than receiving a compatibility fork.
- Native target declarations are preferred over generated wrappers. Wrappers are used only to restore Loon parameter semantics that QX/Surge declarations cannot carry directly.

Next work:

1. Add end-to-end conversion golden coverage for representative Script v2 outputs: plain response-body, request-header, binary YouTube, QX-disabled Bilibili, Jingdong dynamic enable/Cookies, and YouTube typed argument object.
2. Extend condition conversion only where complete Script v2 condition semantics can be reproduced.
3. Re-run the upstream monitor after PR #8 merge so current RuCu6 outputs are regenerated from the new Script v2 pipeline.

## 2026-09-29 phase 4 — Rewrite v2 semantic coverage

Implemented on `work/rewrite-v2-semantic-actions-20260929` / PR #6:

- Added a target-regex compiler for Loon flags.
  - `/i` is **not** expanded into per-character ASCII case-fold classes and no undocumented QX inline modifier is emitted. Target declarations keep the source regex body in the documented bare-regex form.
  - `m/s` are elided only for URL/header subjects where CR/LF cannot occur; body regex remains fail-closed.
  - Source regex flags that have no documented target declaration field are retained only as diagnostics; the converter does not invent target syntax.
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
- Explicit source-level QX rejection and unported source-runtime `$utils` are hard blockers. A WayX adaptation/fork URL cannot override them; the source script declaration remains commented in QX output.
- PR #5 Converter Check passed after these changes.

Current semantic boundary:

- Loon `/i` has no documented QX rewrite flag field in Crossutility's current sample. WayX therefore preserves the source regex body as bare QX regex and does not synthesize `[aA]` expansions or `(?i)`.
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
  - blocked scripts keep the source declaration as comments;
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

## Phase 11 — Source Catalog unification and spec-to-code contract

- Loon `[Rule] URL-REGEX + REJECT-X` and legacy `[Rewrite] reject-X` are explicitly separated in Block 20/30 and synthetic tests.
- Every conversion spec block is mapped to production implementation/test files; Block 70 now has a dedicated MITM planner.
- RuCu6 managed LPX sources are declarative Source Catalog entries; duplicate `sync_rucu6.py` automation is removed.
- Source Script dependencies use their original declared URLs; no source-script mirror filename planner is part of the current pipeline.
- `converter-check` validates and may safely commit deterministic generated outputs to same-repo PR heads; scheduled `upstream-monitor` owns upstream source fetch/update and Review/Safe Tier handoff.
