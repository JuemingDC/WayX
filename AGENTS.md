# Implementation changes

- Modified: 2026-10-23 (chance). For every implementation change, add or update a nearby comment stating the modification date (`YYYY-MM-DD`) and the concrete behavior changed, so superseded logic can be identified and removed.
- Remove superseded implementation instead of keeping dead branches or commented-out old code.
- Preserve upstream rule actions: per-line DIRECT/PROXY takes precedence over the source's registered action; a registered DIRECT/PROXY action takes precedence over inferred application/category defaults. Keep general direct/proxy feeds in cn/proxy. Preserve standalone collections and rejection actions.
- Modified: 2026-10-23 (chance). Move media_cn PROXY declarations to media after resolving source/default policy; media_cn keeps DIRECT declarations, without creating media_cn_proxy outputs.
- Use the existing final generation/validation workflow; do not add redundant regression checks or repeat full builds without a new failure or change that requires them.

- Modified: 2026-10-25 (chance). Finish all changes in the current requested scope locally before running the consolidated final checks. Do not trigger Actions, push intermediate implementation checkpoints, or rerun full generation after each small change. Publish the completed batch in one remote update; use the resulting single final Action for integration validation. If final validation fails, fix the diagnosed failures together and rerun only affected local checks before another final remote update. Scheduled upstream synchronization remains unchanged.
