# Implementation changes

- Modified: 2026-10-23 (chance). For every implementation change, add or update a nearby comment stating the modification date (`YYYY-MM-DD`) and the concrete behavior changed, so superseded logic can be identified and removed.
- Remove superseded implementation instead of keeping dead branches or commented-out old code.
- Preserve upstream rule actions: per-line DIRECT/PROXY takes precedence over the source's registered action; a registered DIRECT/PROXY action takes precedence over inferred application/category defaults. Keep general direct/proxy feeds in cn/proxy. Preserve standalone collections and rejection actions.
- Modified: 2026-10-23 (chance). Move media_cn PROXY declarations to media after resolving source/default policy; media_cn keeps DIRECT declarations, without creating media_cn_proxy outputs.
- Use the existing final generation/validation workflow; do not add redundant regression checks or repeat full builds without a new failure or change that requires them.

- Modified: 2026-11-01 (chance). For new upstream content, implement and review source registration, discovery, acquisition, classification and conversion code first. Commit only implementation/configuration/tests/documentation; GitHub Actions must fetch original source bytes, generate client artifacts, validate and publish through the existing pipeline. Do not hand-write, locally regenerate, or directly commit downloaded source snapshots, generated Module/Adblock/Rule/Script artifacts, source state manifests or generated README indexes in place of an Actions run. Read-only source inspection and isolated fixture tests remain allowed. Preserve existing published artifacts until Actions replaces them successfully. Finish the authorized code batch before the final remote update; do not push intermediate checkpoints or repeatedly trigger generation. After a failed Action, fix diagnosed implementation failures before another final update. Scheduled upstream synchronization remains unchanged.

- Modified: 2026-10-25 (chance). Semantic preservation is the default and overrides output simplification preferences. Establish source behavior from official documentation or reproducible source-client evidence before lowering; target jq syntax/compilation alone cannot prove equivalence. Preserve match conditions, types, order, array-index effects, missing-path behavior, errors and action boundaries. A request for compact/batched syntax is not permission to change behavior. Apply only explicitly authorized, narrowly documented exceptions (for example jq_replace intentionally uses setpath, including missing-path creation); do not extend an exception to deletion or other operations. If semantics are unknown or an equivalent requested form is unavailable, diagnose that boundary instead of guessing or silently changing behavior. Maintain the exception scope and evidence in CONVERSION_SPEC.md section 2.2.

- Modified: 2026-10-27 (chance). Apple actionless rows follow configured routing layers: domestic/update DIRECT first, named proxy services (including TestFlight) second, remaining Apple DIRECT last; explicit source actions remain authoritative. QX Rule outputs render semantic proxy routing as the existing user policy group ssid.

- Modified: 2026-10-27 (chance). Surge Apple outputs only apple_cn and apple_proxy. Merge direct fallback into apple_cn using official logical exclusions only where needed to preserve CN/proxy/fallback routing; QX and other collections keep their existing layout.

- Modified: 2026-10-27 (chance). Microsoft CN routing layers override actionless company/OneDrive feed defaults only; preserve explicit row actions, domestic-first ordering, existing GitHub/AI ownership and Microsoft output filenames.


- Modified: 2026-10-30 (chance). Production automation is TypeScript under src/, dispatched by src/cli.ts. Keep domain logic free of I/O; all HTTP uses the unified Surge transport, and managed writes use transactions. Never restore Python/MJS forwarding entry points. Archive encrypted source bytes without parsing them or replacing prior client outputs; preserve author #!source and original JS URLs. Source pauses remain authoritative for discovery/conversion; the 2026-11-01 user-authorized backup/rebinding and universal adblock-script passes also cover existing paused Kelee snapshots and their direct script references, without resuming plugin acquisition.

- Modified: 2026-10-30 (chance). Icon manifests and app aliases belong to .github/sources/icons.json. Fill only absent target declaration metadata; preserve author-provided image URLs, source files, client logic and timestamps. Reuse the unified fetch snapshot, reference original image URLs, and keep unmatched apps unchanged.

- Modified: 2026-11-01 (chance). Surge support confirms ICU inline i/m/s/x in URL/Header/Body/Map Local/Script patterns on iOS and Mac. Preserve source flags in Surge native output and Script v2; keep the existing QX policy separate. When lowering a Loon body regex without m, explicitly disable Surge Body Rewrite default multiline with (?-m), preserving source inline scopes. The user-authorized flag-only correction also covers retained paused Kelee Surge artifacts using frozen source snapshots, without resuming catalog acquisition/conversion. Preserve all script URLs and non-regex content, refuse ambiguous mappings, and validate ICU syntax before publication. Keep native source patterns and raw backups intact.














- Modified: 2026-11-02 (chance). User-directed Script API architecture is a ScriptHub-derived runtime compatibility layer. Preserve author business code and ordinary JavaScript Env receivers; do not add source-content/dataflow/whitelist proofs or validate repository scripts to authorize an API mapping. Maintain API contract tests with dynamic values and synthetic transport/backup integration. Source inventory is descriptive only; publication requires valid classic syntax and unambiguous HTTP declaration metadata.
- Modified: 2026-11-02 (chance). Reuse pinned ScriptHub code where applicable, preserving GPL licensing/provenance in vendor/script-hub. Maintain corrections for Header delete/has/Symbol/prototype operations, all HTTP methods, rejection/bytes/defaults, actual timers, explicit storage deletion and dynamic completion. No empty APIs or exception-to-pass-through suppression. Header case normalization and target-native storage/error differences are explicit compatibility boundaries, not an equality certificate.
- Modified: 2026-11-02 (chance). Production directions remain Loon→QX, Loon→Surge and QX→Surge. Emit one source-named common file per URL with one original business body. Raw plugin/script backups remain exact; Actions alone refreshes bytes, common files, source-bound API inventories, indices and references. Keep configuration tools, tasks and Egern outside the API adapter scope. Preserve author notices and required adapter license notices without added author/category banners.
- Modified: 2026-11-02 (chance). QX-undocumented parameters are omitted at API invocation while original construction effects/errors remain. Source names and typed arguments come from declarations; do not invent saved settings, real device/version data or QX timeout/cancellation. Runtime capability failures remain errors. Report runtimePolicyVersion and validationMode so compatibility output is not presented as author-program or device certification.

- Modified: 2026-11-02 (chance). Loon gzip/ungzip use pinned Pako with isolated lazy initialization, native source preference, Uint8Array boundaries and complete gzip-only validation. Preserve MIT/Zlib notices in generated provider code. Report runtime/native-only/unavailable/unclassified per API; AES/URL/legacy-decoder providers are implemented with pinned noble-ciphers/whatwg-url/Exodus bundles, native preference, scoped lazy initialization, full license notices and reproducible vendor lock/manifest. Runtime policy is version 3. Keep HTTP native text/charset, body-base64 and completion retry contracts in general API tests; never fake device identity or global store clearing. DNS/GeoIP/ASN services are explicitly out of scope: no conversion mappings, compatibility bindings, operation inventories, missing-capability counts or roadmap tasks; retain author bytes. Complete all remaining authorized changes before the single Actions publication. See docs/script-api/03-API能力与实施路线.md.
