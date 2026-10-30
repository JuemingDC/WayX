# TypeScript architecture

Modified: 2026-10-30 (chance).

WayX uses one Node.js TypeScript application. Install the locked dependencies with `npm ci`; Node must satisfy package.json. Node executes erasable TypeScript directly; `npm run typecheck` checks the source without emitting a second implementation.

The flow is registry → original bytes → format detection → source AST / Semantic IR → target planning and emission → validation → transactional publication. The domain layer has no filesystem or network access. Ingest owns all HTTP requests and sealed run snapshots. Application services own source lifecycles and call the domain, emit, validation and publish layers. Existing syntax/planning functions remain grouped by semantic family; src/index.ts provides the public conversion API.

| Directory       | Responsibility                                                              |
| --------------- | --------------------------------------------------------------------------- |
| src/domain      | Typed boundary contracts, rule grouping, regex and condition semantics      |
| src/ingest      | Source discovery, Surge transport, snapshots, pauses, format classification |
| src/parser      | Source AST, semantic IR and declaration planning                            |
| src/emit        | Target conversion and client JavaScript helper emission                     |
| src/validation  | Target validators, native ICU checks and repository auditing                |
| src/publish     | Artifact transactions, README, canonical developer tool and reports         |
| src/application | Sync, rules, monitor, Issues, validation evidence and Git publication       |
| tests           | Semantic regression suites plus captured pre-migration rule baselines       |
| .github/sources | Declarative source/action registries and tracked state                      |

## Commands

| Command                               | Effect                                                                 |
| ------------------------------------- | ---------------------------------------------------------------------- |
| npm run typecheck                     | Strict compiler check, no output build                                 |
| npm test                              | Isolated semantic suites; local fixtures and native jq / ICU           |
| node src/cli.ts catalog               | Refresh eligible author catalogs; preserve frozen Kelee entries        |
| node src/cli.ts rules                 | Acquire, aggregate and publish routing collections                     |
| node src/cli.ts rules check --offline | Replay the sealed rule-input evidence                                  |
| node src/cli.ts sync                  | Acquire the catalog, seal dependencies, convert and commit each source |
| node src/cli.ts verify                | Check types, changed helpers and actual repository outputs once        |
| node src/cli.ts monitor               | Monitor configured documents and repositories transactionally          |
| node src/cli.ts reports               | Reconcile current output using validation evidence                     |
| node src/cli.ts issues                | Dry run outside a publication branch; managed Issue updates in Actions |
| node src/cli.ts gate                  | Require successful stages and complete machine evidence                |
| node src/cli.ts publish               | Check expected HEAD / branch budget and publish managed artifacts      |
| node src/cli.ts regenerate            | Developer-only canonical comparison; --write explicitly rewrites       |

Daily synchronization does not run developer suites or canonical regeneration again. Pull requests run regression suites once. The final verification checks generated files and uses native ICU rather than JavaScript regex as a substitute. jq 1.8.2 is pinned and verified in Actions. No production Python subprocess exists.

## Acquisition and encrypted inputs

config/fetch.json contains the single Surge UA and limits. WAYX_FETCH_UA overrides the same value everywhere. This default is an actual observed Surge UA from the supplied HAR; application version numbers do not identify an exact network UA. Proxy variables are inherited by the CLI via Node's environment-proxy support. There is no direct-network fallback.

The fetch service bounds the decoded response stream, retries transient failures only and captures exact input bytes. Snapshots share identical URLs within a run, seal before conversion and verify hashes on replay. Author Script links are preserved and never downloaded or translated internally.

.lpxe and unknown binary inputs are archived under Resource/Encrypted/Loon/<id>/<sha>. Original URL, byte size, format and SHA-256 are recorded. Activity is tracked in .github/sources/opaque-state.json; validators verify the archive before acknowledging a skipped conversion. Existing output remains intact; a new opaque-only source has no invented target. Successful plaintext acquisition clears active opaque status while preserving historical bytes. Invalid ordinary text remains a source failure.

The author's #!source directive remains unchanged in both targets. Loon's URL-binding digest and the archive's content digest have separate meanings. Kelee remains paused in .github/sources/kelee-pause.json; this migration does not resume it.

## Changes and failures

Edit source registries or implementation, rather than generated target files. Preserve the existing semantic exceptions in .github/CONVERSION_SPEC.md; a successful TypeScript compile or jq compile alone does not prove source equivalence. Keep client-facing author JavaScript as JavaScript.

Per-source transactions restore owned files on failure. New unsupported plaintext sources are deferred and existing baselines retained. Failed rollback blocks publication. Monitoring commits its mirror and state together, rejects incomplete GitHub comparisons, and sends conditional HTTP requests only when the local mirror is intact. Publication requires current machine evidence and an unchanged destination HEAD.
