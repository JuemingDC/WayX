# Chance Upstream Monitor — Work 模式

用于 WayX 的低资源上游监控。GitHub Actions 负责机械检查；只有真实语义变化才通过 Pull Request 交给 ChatGPT Work。

> WayX 仍以 Quantumult X / Surge 为生产内容范围。Loon / Egern 主要作为上游语法与转换参考监控。

## 工作流

```text
每天 01:00 Asia/Shanghai
→ GitHub Actions 检查 ETag / Last-Modified / commit SHA / SHA-256
→ 无真实变化：结束（Work = 0 / API = 0）
→ analysis=none：Actions 直接同步 main
→ analysis=work：创建 work-review PR
→ ChatGPT Work 审查 / 必要修改 / 自检
→ Work 添加 work-complete
→ GitHub Actions 自动 squash merge + 删除临时分支
```

## OpenAI API

**本版本不调用 OpenAI API。**

代码中已移除 `OPENAI_API_KEY`、`/v1/responses` 和 API 模型配置，因此 WayX 自动化不会产生 OpenAI API 账单。

以前创建的 GitHub Secret `OPENAI_API_KEY` 已不再被任何 Workflow 使用。建议在 GitHub 仓库 Settings → Secrets and variables → Actions 中手动删除。

## ChatGPT Work 一次性设置

GitHub Actions 能创建 PR，但不能替你的 ChatGPT 账户创建/授权 Work webhook 任务。需要在 ChatGPT **Work** 中做一次设置：
- 连接 GitHub，并授权 `JuemingDC/WayX`；
- 创建 GitHub PR 事件触发任务；
- 触发事件：PR opened；
- 仓库：`JuemingDC/WayX`；
- 条件：PR 带 `work-review` 标签，base=`main`，head 以 `work/upstream-` 开头；
- Prompt：使用本仓库 `monitor/WORK_TASK_PROMPT.md` 的完整内容。

设置一次后，后续流程自动运行。

## 自动清理

Work 完成后添加 `work-complete` 标签。Finalizer 验证 PR 属于本自动化，再自动 squash merge 并删除 review 分支。
GitHub 不提供真正删除 PR 的能力，因此采用 **merge/close + 删除临时分支**。本版本不再把 diff/review 临时文件提交到 main。
有一个 `work-review` PR 未完成时，下一次定时任务直接跳过，避免重复 PR 和重复 Work 消耗。

## 当前监控源
- Surge 官方 `llms.txt`
- Egern Modules 官方文档
- Egern Scriptings 官方文档
- Loon Rewrite 新语法官方文档
- Quantumult X 官方仓库 `crossutility/Quantumult-X`
- Quantumult X 资源解析器 `KOP-XIAO/QuantumultX`

`analysis`：
- `none`：Actions 自己同步；
- `work`：真实内容变化后创建 PR，交给 Work 语义审查。
