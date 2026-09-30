# Block 95 — 规范块与自动转换实现索引

本文件把权威规范、production converter、validator/test 与自动化入口汇总到一张表。新增语法时必须先定位规范块，再修改该块对应的实现；不得在 `.github/scripts/sync-convert.mjs` 中直接写插件专属补丁。

| Block | 语义职责 | Production / Automation | Contract / Regression |
|---|---|---|---|
| 00 | 官方依据、优先级、行为优先 | 无独立语义转换；由 CI gate 执行 | `genericity-audit.mjs`, `audit-repository.mjs`, `spec-block-contract.mjs` |
| 05 | Catalog、通用流水线、陌生插件 | `source-catalog.mjs`, `source-fetch.mjs`, `sync-convert.mjs`, `regenerate-canonical.mjs` | `generic-identity.mjs`, `genericity-audit.mjs` |
| 10 | QX/Surge 目标文件结构 | `paths.mjs`, `metadata.mjs`, `surge-module.mjs` | `checkpoint.mjs`, target validators |
| 20 | Rule / Policy / URL-REGEX reject-X | `rule.mjs` | `checkpoint.mjs`, `surge-rule-coverage.mjs` |
| 30 | Legacy Rewrite + Rewrite v2 mapping | `legacy-rewrite.mjs`, `rewrite-v2*.mjs`, `qx-semantic-script.mjs` | `checkpoint.mjs`, `loon-new-syntax-cases.mjs`, `rucu6-rewrite-v2-coverage.mjs` |
| 40 | Regex / condition AST | `rewrite-v2.mjs`, `rewrite-v2-actions.mjs`, `target-regex.mjs` | `checkpoint.mjs`, Rewrite v2 coverage |
| 50 | JSON/JQ/mock/dependency | `jq.mjs`, `dependency.mjs`, `qx-mock.mjs`, `surge-mock.mjs`, `legacy-rewrite.mjs` | `checkpoint.mjs`, end-to-end Golden |
| 60 | Script declaration / Argument dependency analysis / compatibility | `script.mjs`, `script-compat.mjs`, `script-v2.mjs`, `script-v2-target.mjs`, `argument.mjs`, `argument-usage.mjs`, `source-fetch.mjs` | `rucu6-script-v2-coverage.mjs`, `source-script-url-preservation.mjs`, `checkpoint.mjs` |
| 70 | MITM / comments / metadata | `mitm.mjs`, `metadata.mjs`, `sync-convert.mjs` comment pipeline | `checkpoint.mjs`, QX/Surge validators |
| 80 | Review / validator / Golden / reconciliation | `validateQX`, `validateSurgeModule`, repository audit | genericity, Golden, `generated-helper-refs.mjs`, `source-script-url-preservation.mjs`, canonical consistency |
| 90 | 拉源→依赖→转换→生成→审核/提交 | `.github/sources/loon.json`, `sync-convert.mjs`, `upstream-monitor.yml`, `converter-check.yml` | full CI |
    
## 固定端到端数据流

```text
.github/sources/loon.json
→ validate Source Catalog
→ fetch plugin directly from descriptor `source` only
→ normalize + parse Loon sections
→ fetch Source JS + jq/mock dependencies directly from their original resolved URLs; Source JS is analysis-only and is not mirrored
→ Rule / Rewrite / Script / MITM generic planners
→ target native planner → verified helper fallback → commented Review
→ QX snippet + Surge sgmodule renderer
→ QX validator + Surge validator
→ source/target reconciliation + genericity/golden checks
→ canonical + generated-helper regeneration consistency
→ same-repo PR: deterministic canonical/helper commit
→ scheduled upstream flow: Safe Tier commit OR work-review PR
```

任何第二份插件清单、按插件名分支、按当前工作分支名自动修 canonical 的逻辑都违反本索引和 Block 05/90。
