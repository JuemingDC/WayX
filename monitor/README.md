# Chance Upstream Monitor — Actions + Work 分层模式

WayX 使用两级自动化：GitHub Actions 处理可以机械证明正确的 Safe Tier；只有脚本、复杂语义或官方规范变化才进入 ChatGPT Work。

## 每日流程

```text
每天 01:00 Asia/Shanghai
→ GitHub Actions 同步选定 Loon 源 / RuCu6 / 官方规范
→ sync-convert 对 Safe Tier 做确定性 QX / Surge 转换
→ validate_conversion_policy.py 校验目标格式
→ conversion_gate.py 判断 Safe Tier / Review Tier
→ 无变化：结束
→ 仅 Safe Tier：直接提交 main
→ Review Tier / converter失败 / validator失败：创建 work-review PR
→ ChatGPT Work 按 monitor/WORK_TASK_PROMPT.md 审查与必要修改
→ work-complete：自动 squash merge + 删除临时分支
→ work-reject：自动关闭且不合并 + 删除临时分支
```

## Safe Tier

Actions 可直接新增、删除和同步基础 Rule、确定的 reject/redirect、转换器已覆盖的简单 JQ、纯 hostname MITM、注释与转换元数据。新增和删除都通过重新解析源文件并完整重生成目标文件完成，不猜测插入位置。

QX IP 类规则自动去掉 `no-resolve`；Surge 保留其官方支持的 `no-resolve`。Loon `[Rule] URL-REGEX,...,REJECT` 按 WayX 约定转成 QX `url reject-200`；普通 Rewrite 的 reject 不按状态码机械映射。

## Review Tier

JavaScript 内容、[Script]、依赖 Loon `[Argument]` 且目标无法确定表达的执行声明、复杂 AND/OR/NOT、Loon 新 Rewrite 未覆盖 action、自定义 Body、binary/base64、pipeline、helper script、converter/validator 失败和官方规范变化都交给 Work。Loon `[Argument]` 不转换为 QX 参数 UI/BoxJs；Surge 使用官方 `#!arguments` 参数表和 `{{{name}}}` 占位符。不能证明安全就不直接写 main。

RuCu6 当前属于 Review Tier：Actions 负责同步原始 LPX/JS，Work 负责复杂新语法与脚本转换审查。

## OpenAI API

本流程不调用 OpenAI API，不使用 `OPENAI_API_KEY`，不会产生 API 独立账单。以前创建的仓库 Secret 可以手动删除。

## 自动清理

`monitor/.runtime/` 和 `.github/reports/` 不提交。Work 完成后临时 review 分支自动删除。GitHub 本身不支持真正删除 PR 历史，所以最终只保留 merged/closed PR 记录，不保留临时 diff/review 文件。

一个 `work-review` PR 未处理完成时，下一次定时任务会跳过，避免重复 PR 和重复 Work 消耗。

## 核心文件

- `CONVERSION_SPEC.md`：唯一权威转换规范入口。
- `docs/conversion-spec/`：分块转换规范。
- `.github/scripts/sync-convert.mjs`：Loon → QX/Surge 通用转换与上游同步入口。
- `.github/scripts/validate_conversion_policy.py`：目标格式硬校验。
- `.github/scripts/conversion_gate.py`：Safe / Work 风险分级。
- `monitor/monitor_upstreams.py`：官方文档/仓库变化检查。
- `monitor/WORK_TASK_PROMPT.md`：Work 审查与处理规范。
- `.github/workflows/upstream-monitor.yml`：每天 01:00 唯一上游调度器。
- `.github/workflows/work-review-finalizer.yml`：Work 完成/拒绝后的 merge、close 和 branch cleanup。
