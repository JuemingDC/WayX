# Implementation changes

- Modified: 2026-10-23 (chance). For every implementation change, add or update a nearby comment stating the modification date (`YYYY-MM-DD`) and the concrete behavior changed, so superseded logic can be identified and removed.
- Remove superseded implementation instead of keeping dead branches or commented-out old code.
- Preserve upstream rule actions: per-line DIRECT/PROXY takes precedence over the source's registered action; a registered DIRECT/PROXY action takes precedence over inferred application/category defaults. Keep general direct/proxy feeds in cn/proxy. Preserve standalone collections and rejection actions.
- Modified: 2026-10-23 (chance). Move media_cn PROXY declarations to media after resolving source/default policy; media_cn keeps DIRECT declarations, without creating media_cn_proxy outputs.
- Use the existing final generation/validation workflow; do not add redundant regression checks or repeat full builds without a new failure or change that requires them.

- Modified: 2026-10-25 (chance). Finish all changes in the current requested scope locally before running the consolidated final checks. Do not trigger Actions, push intermediate implementation checkpoints, or rerun full generation after each small change. Publish the completed batch in one remote update; use the resulting single final Action for integration validation. If final validation fails, fix the diagnosed failures together and rerun only affected local checks before another final remote update. Scheduled upstream synchronization remains unchanged.

- Modified: 2026-10-25 (chance). Semantic preservation is the default and overrides output simplification preferences. Establish source behavior from official documentation or reproducible source-client evidence before lowering; target jq syntax/compilation alone cannot prove equivalence. Preserve match conditions, types, order, array-index effects, missing-path behavior, errors and action boundaries. A request for compact/batched syntax is not permission to change behavior. Apply only explicitly authorized, narrowly documented exceptions (for example jq_replace intentionally uses setpath, including missing-path creation); do not extend an exception to deletion or other operations. If semantics are unknown or an equivalent requested form is unavailable, diagnose that boundary instead of guessing or silently changing behavior. Maintain the exception scope and evidence in CONVERSION_SPEC.md section 2.2.

- Modified: 2026-10-27 (chance). Apple actionless rows follow configured routing layers: domestic/update DIRECT first, named proxy services (including TestFlight) second, remaining Apple DIRECT last; explicit source actions remain authoritative. QX Rule outputs render semantic proxy routing as the existing user policy group ssid.

- Modified: 2026-10-27 (chance). Surge Apple outputs only apple_cn and apple_proxy. Merge direct fallback into apple_cn using official logical exclusions only where needed to preserve CN/proxy/fallback routing; QX and other collections keep their existing layout.

- Modified: 2026-10-27 (chance). Microsoft CN routing layers override actionless company/OneDrive feed defaults only; preserve explicit row actions, domestic-first ordering, existing GitHub/AI ownership and Microsoft output filenames.

- Modified: 2026-10-29 (chance). Native QX Script conversion only lowers declarations and always retains the author's original script URL. Do not download, scan or rewrite author JS, inject internal API shims, or generate API adapter copies. Source script runtime compatibility is outside this conversion scope.

- Modified: 2026-10-30 (chance). Production automation is TypeScript under src/, dispatched by src/cli.ts. Keep domain logic free of I/O; all HTTP uses the unified Surge transport, and managed writes use transactions. Never restore Python/MJS forwarding entry points. Archive encrypted source bytes without parsing them or replacing prior client outputs; preserve author #!source and original JS URLs. Source pauses remain authoritative.

- Modified: 2026-10-30 (chance). Icon manifests and app aliases belong to .github/sources/icons.json. Fill only absent target declaration metadata; preserve author-provided image URLs, source files, client logic and timestamps. Reuse the unified fetch snapshot, reference original image URLs, and keep unmatched apps unchanged.
