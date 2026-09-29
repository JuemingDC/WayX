# WayX Converter Status

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

- Bilibili protobuf QX port is **not** fabricated. It remains a real manual-port item because replacing `$utils.ungzip` and its platform runtime requires a tested QX implementation.
- Parsing or dependency resolution alone never promotes complex Rewrite v2 rules to Safe Tier.
- Binary `mock_file` content is not coerced into UTF-8 text.

## Next work

1. Build the full RuCu6 Rewrite v2 source → target generator on top of the existing AST, action registry, script registry and dependency resolver.
2. Add target-specific dependency materialization for QX/Surge with byte/text integrity checks.
3. Add target-specific regex-flag handling only after QX support is proven from official material; current `/i` source rules remain outside the golden equivalence claim.
4. After phase 2 is green and merged, rerun the upstream monitor from the new main; discard the stale pre-converter `work/upstream-36491808454-1` results.
