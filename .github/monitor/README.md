# Chance Upstream Monitor — GitHub Actions 全自动模式

WayX 的上游维护由 GitHub Actions 定时闭环执行，不再使用 ChatGPT Work、work-review PR 或 Work finalizer。

## 每日流程

```text
每天 01:00 Asia/Shanghai
→ 从 main checkout
→ 校验 converter core / inventory / genericity
→ 按 .github/sources/loon.json 逐插件拉取原作者 Loon
→ 每插件 materialize → convert → QX/Surge validate
→ 成功插件写入 Resource/Loon + Adblock + generated helper
→ 失败插件保持旧的已验证 Source/target，不阻塞其它插件
→ 检查监控中的官方规范/仓库并更新 upstream mirror/state
→ 全仓 validator + repository audit + reconciliation
→ 为 REVIEW REQUIRED / ISSUE REQUIRED / hard sync failure 创建或复用 GitHub Issue
→ 所有全局校验通过后直接提交 main
→ 上传运行日志、failure report、reconciliation 与 inventory artifact
```

## Issue 要求

自动提交的转换 Issue 必须包含：

- 相关插件 ID；
- 本地 Source 文件；
- 原作者上游 URL；
- 对应 Source declaration / 规则内容；
- hard failure 时的失败阶段；
- 明确失败原因；
- QX/Surge 目标位置或运行位置。

同一问题使用稳定 fingerprint；重复定时运行复用/更新已有 Issue，closed issue 再次出现时自动 reopen。

## Fail-closed

未知语法、未知 action、未登记 complex signature 仍按 converter 规范 fail closed：目标侧注释保留源声明，不生成猜测性活动规则。已知但目标能力不足继续使用 REVIEW REQUIRED。两类情况均由 Actions 自动跟踪 Issue，不再转交 Work。

hard sync failure 采用单插件事务边界：conversion + QX/Surge validation 成功前不写该插件的新 managed Source/target/helper。其它插件继续独立同步。

## 官方规范监控

`.github/monitor/monitor_upstreams.py` 只记录监控源变化、更新 `.github/monitor/state.json` / `upstream/` mirror，并生成 `.github/monitor/.runtime/upstream_changes.md`。官方规范变化本身不创建 Work PR，也不阻断已验证插件的自动同步。

## 核心文件

- `.github/CONVERSION_SPEC.md`：唯一权威转换规范。
- `.github/sources/loon.json`：唯一 Loon Source Catalog。
- `.github/scripts/sync-convert.mjs`：原作者拉取、转换、目标校验与成功插件落盘。
- `.github/scripts/propose-conversion-issues.mjs`：Review/Issue/hard failure 自动 Issue。
- `.github/converter/tests/validate_conversion_policy.py`：转换策略硬校验。
- `.github/converter/tools/audit-repository.mjs`：仓库级审计。
- `.github/converter/tools/conversion-reports.mjs`：reconciliation + Review/Issue inventory。
- `.github/monitor/monitor_upstreams.py`：官方规范/仓库变化记录。
- `.github/workflows/upstream-monitor.yml`：每天 01:00 自动调度器。

`.github/monitor/.runtime/` 与 `.github/reports/` 不提交。
