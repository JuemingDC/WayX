# Block 95 — 规范块与自动转换实现索引

本文件把权威规范、production converter、validator/test 与自动化入口汇总到一张表。新增语法时必须先定位规范块，再修改该块对应的实现；不得在 `.github/scripts/sync-convert.mjs` 中直接写插件专属补丁。

| Block | 语义职责 | Production / Automation | Contract / Regression |
|---|---|---|---|
| 00 | 官方依据、优先级、行为优先 | 无独立语义转换；由 CI gate 执行 | `genericity-audit.mjs`, `audit-repository.mjs`, `spec-block-contract.mjs` |
| 05 | Catalog、手工资产边界、whole-plugin parser、shared conversion context、pure conversion pipeline、source section/comment orchestration、陌生插件 | `source-catalog.mjs`, `plugin-parser.mjs`, `dependency-materializer.mjs`, `source-script-materializer.mjs`, `conversion-context.mjs`, `conversion-pipeline.mjs`, `managed-artifacts.mjs`, `workflow-diagnostics.mjs`, `source-section.mjs`, `source-metadata.mjs`, `.github/manual-assets.json`, `source-fetch.mjs`, `sync-convert.mjs`, `regenerate-canonical.mjs` | `conversion-context-materializers.mjs`, `conversion-pipeline.mjs`, `source-section-comments.mjs`, `generic-identity.mjs`, `genericity-audit.mjs`, `manual-assets.mjs` |
| 10 | QX/Surge 目标文件结构 / section routing / final assembly | `paths.mjs`, `metadata.mjs`, `output-lines.mjs`, `qx-output.mjs`, `surge-output.mjs`, `qx-snippet-validator.mjs`, `surge-module.mjs`, `qx-official-capabilities.mjs`, `surge-official-capabilities.mjs` | `target-output-builders.mjs`, `checkpoint.mjs`, `qx-official-capabilities.mjs`, `surge-official-capabilities.mjs`, target validators |
| 20 | Rule AST / Policy / URL-REGEX reject-X | `rule-ast.mjs`, `rule-qx.mjs`, `rule-surge.mjs`, `rule.mjs` facade | `rule-ast.mjs`, `checkpoint.mjs`, `surge-rule-coverage.mjs`, `catalog-rule-inventory.mjs` |
| 30 | Legacy/v2 source parsers → Rewrite Semantic IR → QX/Surge target planners / observed complex signatures | `rewrite-ir.mjs`, `rewrite-qx.mjs`, `rewrite-surge.mjs`, `legacy-rewrite.mjs`, `rewrite-v2*.mjs`, `complex-rewrite*.mjs`, target renderers | `rewrite-ir.mjs`, `rewrite-target-planners.mjs`, `checkpoint.mjs`, `loon-new-syntax-cases.mjs`, `rucu6-rewrite-v2-coverage.mjs`, `complex-source-inventory.mjs`, `catalog-syntax-inventory.mjs` |
| 40 | Regex / condition AST | `rewrite-v2.mjs`, `rewrite-v2-actions.mjs`, `target-regex.mjs` | `checkpoint.mjs`, Rewrite v2 coverage |
| 50 | JSON/JQ/mock/dependency discovery/materialization | `jq.mjs`, `dependency.mjs`, `dependency-materializer.mjs`, `conversion-context.mjs`, `qx-mock.mjs`, `surge-mock.mjs`, `legacy-rewrite.mjs` | `conversion-context-materializers.mjs`, `checkpoint.mjs`, end-to-end Golden |
| 60 | Legacy/v2 Script parser → target-neutral Script IR → QX/Surge Script planner / Source Script materialization / Argument analysis | `script-legacy.mjs`, `script-v2.mjs`, `script-ir.mjs`, `script-qx.mjs`, `script-surge.mjs`, `script.mjs`, `script-v2-target.mjs`, `argument.mjs`, `argument-usage.mjs`, `source-script-materializer.mjs`, `conversion-context.mjs`, `source-fetch.mjs` | `conversion-context-materializers.mjs`, `script-ir-target-planners.mjs`, `rucu6-script-v2-coverage.mjs`, `catalog-syntax-inventory.mjs`, `source-script-url-preservation.mjs`, `checkpoint.mjs` |
| 70 | MITM / source comments / metadata | `mitm.mjs`, `source-section.mjs`, `source-metadata.mjs`, `qx-comment.mjs`, `metadata.mjs` | `source-section-comments.mjs`, `checkpoint.mjs`, QX/Surge validators |
| 80 | Review / Unknown Issue / validator / Golden / reconciliation / inventory | `qx-snippet-validator.mjs::validateQX`, `surge-module.mjs::validateSurgeModule`, `unknown-issue.mjs`, `conversion-reports.mjs`, `qx-official-capabilities.mjs`, `surge-official-capabilities.mjs`, repository audit | genericity, Golden, `unknown-issue-markers.mjs`, `manual-assets.mjs`, `catalog-syntax-inventory.mjs`, `catalog-rule-inventory.mjs`, `rewrite-ir.mjs`, `qx-official-capabilities.mjs`, `surge-official-capabilities.mjs`, `generated-helper-refs.mjs`, `generated-helper-runtime.mjs`, `source-script-url-preservation.mjs`, canonical consistency |
| 90 | 拉源→managed artifact I/O→依赖→转换→生成→diagnostics→Issue/审核/提交 | `.github/sources/loon.json`, `managed-artifacts.mjs`, `workflow-diagnostics.mjs`, `sync-convert.mjs`, `propose-conversion-issues.mjs`, `upstream-monitor.yml`, `converter-check.yml` | `managed-artifacts.mjs`, `workflow-diagnostics.mjs`, full CI |
    
## 固定端到端数据流

```text
.github/sources/loon.json
→ validate Source Catalog
→ fetch plugin directly from descriptor `source` only
→ managed source normalization/change detection via `managed-artifacts.mjs`
→ normalize + `plugin-parser.mjs`
→ `conversion-context.mjs::materializeConversionContext()`
   ├─ jq/mock dependencies via `dependency-materializer.mjs`
   └─ Source JS via `source-script-materializer.mjs`
→ `conversion-pipeline.mjs::convertPlugin()`
→ Rule source parser → target-neutral Rule AST → QX/Surge Rule planners
→ Legacy Rewrite parser / Rewrite v2 parser → target-neutral Rewrite Semantic IR → rewrite-qx.mjs / rewrite-surge.mjs
→ Legacy Script parser / Script v2 parser → target-neutral Script IR → script-qx.mjs / script-surge.mjs
→ MITM generic planner
→ target native planner → dedicated helper → observed complex helper → commented Review/Issue
→ QX output builder / Surge output builder → final snippet/module
→ generated-helper managed write/diff primitives
→ `qx-snippet-validator.mjs` + `surge-module.mjs` target validation
→ managed target conditional write
→ workflow diagnostics / failure summary
→ machine-readable source/target reconciliation + Review/Issue inventory + genericity/golden checks
→ canonical + generated-helper regeneration consistency
→ same-repo PR: deterministic canonical/helper commit
→ scheduled upstream flow: Safe Tier commit OR work-review PR
```

任何第二份插件清单、按插件名分支、按当前工作分支名自动修 canonical 的逻辑都违反本索引和 Block 05/90。

### Catalog Legacy syntax inventory

- Test：`converter/tests/catalog-legacy-syntax-inventory.mjs`
- Baseline：`converter/fixtures/catalog-legacy-syntax-inventory.json`
- Scope：Legacy Rewrite / Legacy HTTP Script observed syntax only; no target capability expansion.
