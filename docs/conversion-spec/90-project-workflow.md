# Block 90 — 项目执行顺序

WayX 的上游维护与转换由 GitHub Actions 自动闭环执行；不再使用 ChatGPT Work、work-review PR 或 Work finalizer。

## 开发与规范变更顺序

1. 审计 converter source，确认不存在按插件身份进行语义转换的特判。
2. 审计 generic synthetic fixtures / identity-invariance tests。
3. 审计 converter tests / real-plugin regression fixtures。
4. 审计 canonical QX snippets。
5. 审计 canonical Surge sgmodules。
6. 审计 `module/` 人工模块。
7. 审计 `script/` 路径与声明类型；不做 Source Script runtime compatibility 审查，不修改原脚本正文。
8. 审计 GitHub Actions / monitor，只允许遍历 Source Catalog 并调用同一个 generic converter。
9. 重新生成 managed canonical。
10. 全量 diff。
11. validator / genericity / golden / canonical consistency 全部通过后才允许合并。

新增目标语法固定按：

```text
官方依据
→ CONVERSION_SPEC
→ converter
→ tests
→ canonical output
→ golden
```

禁止用既有输出反推规范，也禁止为单个插件写身份特判。

## 自动化实现文件

- Source Catalog：`.github/sources/loon.json`
- Scheduled upstream workflow：`.github/workflows/upstream-monitor.yml`
- Source fetch + per-plugin conversion orchestration：`.github/scripts/sync-convert.mjs`
- Automated Issue proposer：`.github/scripts/propose-conversion-issues.mjs`
- Target format validator：`.github/scripts/validate_conversion_policy.py`
- Whole-plugin parser：`converter/src/plugin-parser.mjs`
- Dependency materializer：`converter/src/dependency-materializer.mjs`
- Source Script materializer：`converter/src/source-script-materializer.mjs`
- Shared conversion context：`converter/src/conversion-context.mjs`
- Pure generic conversion core：`converter/src/conversion-pipeline.mjs`
- Shared validated conversion runner：`converter/src/conversion-runner.mjs`
- Managed artifact I/O：`converter/src/managed-artifacts.mjs`
- Workflow diagnostics：`converter/src/workflow-diagnostics.mjs`
- Structured scheduled failure report：`converter/src/upstream-run-report.mjs`
- QX validator：`converter/src/qx-snippet-validator.mjs`
- Surge validator：`converter/src/surge-module.mjs`
- Repository audit：`converter/tools/audit-repository.mjs`
- Reconciliation / Review inventory：`converter/tools/conversion-reports.mjs`
- Canonical deterministic regeneration：`converter/tools/regenerate-canonical.mjs`
- PR CI：`.github/workflows/converter-check.yml`

自动化脚本不得维护第二份插件列表；所有 Loon source 必须遍历 Source Catalog。

## 定时自动链路

每天定时任务从同一个 `main` 基线执行：

```text
Source Catalog entry.source
→ 原作者直连 fetch
→ source normalize / validity
→ 只读比较 checked-in Source
→ conversion-runner: materialize dependencies + Source Script context
→ generic convertPlugin()
→ QX validator
→ Surge validator
→ 成功插件同步 generated helper（含安全 prune）/ target / Source
→ 继续处理下一个插件
→ 官方规范/仓库 monitor
→ repository validator + audit
→ reconciliation + Review/Issue inventory
→ 自动 Issue proposer
→ 全局校验通过后提交 main
→ 上传运行报告
```

单个插件的 fetch / materialize / convert / target validation 失败时：

- 该插件的新 managed Source / target 不得在验证前写入；
- 保留上一版 checked-in 的已验证 Source/target；
- 其它插件继续处理；
- 失败写入 `monitor/.runtime/sync-failures.json`；
- Issue proposer 在本轮提交前创建或复用对应 Issue。

## 原作者源唯一链路

禁止：

- plugin mirror/fallback；
- Source Script 镜像落盘；
- 把原 `script-path` 改写成 WayX/GitHub URL；
- 原源失败时自动切换第三方副本。

WayX 生成的 target helper 不属于 Source Script 镜像，可以写入 `script/<id>/`。生成 helper 必须由 reference tests 验证真实存在。

## 目标 fallback

Rewrite/Mock 固定优先级：

```text
native target syntax
→ dedicated semantic helper
→ source-authored generic multi-action complex helper
→ commented REVIEW REQUIRED / ISSUE REQUIRED
```

Rule 不使用 Script fallback。未知语法仍 fail closed；目标文件注释保留完整 Source declaration，不生成猜测性活动规则。

项目级直接丢弃项继续遵守对应规范，例如 legacy `jq-path=`、Loon regex `i/m/s` flags，以及 Block 60 已定义的 QX Script `debug` / Legacy `max-size`。

## 自动 Issue 契约

Issue proposer 必须覆盖三类问题：

1. target 中的 `ISSUE REQUIRED`；
2. target 中的 `REVIEW REQUIRED`；
3. `sync-convert.mjs` 的 hard failure。

每个自动 Issue 必须包含：

- 插件 ID；
- 本地 Source 文件；
- 原作者上游 URL；
- QX / Surge target 文件；
- 对应 Source declaration / 规则内容；
- failure/review/issue 的明确原因；
- hard failure 的执行阶段；
- target marker 位置或运行上下文。

若新 upstream 在 fetch 阶段即失败，无法获得新规则内容，Issue 必须明确说明这一点，并尽可能附当前本地 Source 的规则上下文。

Issue fingerprint 必须包含插件身份与问题语义；重复运行复用/更新已有 Issue，不重复创建。若同一 fingerprint 的 closed Issue 再次出现，自动 reopen。

Review/Issue marker 不阻止其它已验证插件的自动提交。它们是 fail-closed 的追踪信息，不是 ChatGPT Work handoff。

## 全局提交门

定时 workflow 只有在以下全局检查成功时才允许提交自动产物：

- target format validator；
- repository audit；
- Source → Target reconciliation；
- generated helper references；
- Source Script original-URL preservation；
- Issue proposer。

单插件 hard failure本身允许其它插件已验证产物继续提交，但 workflow 最终状态应显式失败，以便 Actions 页面可见，并由 conversion-failure Issue 持续跟踪。

自动提交前必须再次检查 remote `main` 是否仍等于本轮生成基线。若 `main` 已前进，则本轮不 push，由下一轮从新基线完整重生成；禁止把旧生成结果 rebase 到新 main 后直接推送。

## 手工资产与报告

- `.github/sources/loon.json` 只管理自动拉取/转换的 Loon Catalog。
- `.github/manual-assets.json` 登记手工资产；当前 QZXY 不参与自动 regeneration。
- `monitor/monitor_upstreams.py` 只记录监控源变化并维护 `monitor/state.json` / `upstream/` mirror，不创建 review PR。
- 两套 workflow 均保留 machine-readable reconciliation / inventory；scheduled flow 还上传 sync failure、issue summary、monitor change summary 与运行日志。
