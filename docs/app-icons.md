# Application icon metadata

Modified: 2026-10-30 (chance).

`.github/sources/icons.json` registers the original lige47, fmz200 and Qure Color manifests in that priority order. App aliases are explicit registry data. Matching ignores name case, punctuation and image extensions, prefers the unnumbered icon within a collection, and does not infer a match from an arbitrary substring. Unmatched apps remain unchanged.

The TypeScript fetch service downloads each manifest once through the run's resource snapshot and shared Surge UA. Monitoring reuses that exact feed and keeps its original contents under `.github/monitor/upstream/Icons/`. Images are referenced by their original author URLs; images are not mirrored.

An existing nonempty icon declaration always wins, including author metadata retained as `# Upstream icon = ...`. No existing URL is replaced. New links are added to the target declaration header as `# Icon: URL`, followed by `# Icon Collection: manifest-URL` for attribution. These comments follow WayX's existing QX/Surge metadata convention; they do not introduce undocumented active module directives or claim that clients render module icons from these comments.

Loon sources, author JavaScript, `#!source`, rule actions, timestamps and client logic remain unchanged. Both Loon conversion and native QX conversion apply this metadata before output comparison/commit, so repeated synchronization does not continually remove and re-add the icon. Frozen sources are not downloaded. The metadata backfill is limited to targets owned by the Loon catalog, native QX registry or manual-asset registry.

Run `node src/cli.ts icons` for a metadata-only refresh without fetching plugins or regenerating routing rules. Normal synchronization also refreshes icons. Counts and unmatched filenames are recorded in `.github/monitor/.runtime/icons-result.json`; unmatched items do not receive a generic substitute image.
