# Chance Upstream Monitor

用于 Surge / Loon / Quantumult X / Egern 项目的低资源上游监控。

> WayX 仍以 Quantumult X / Surge 为生产内容范围。这里的 Loon / Egern 项仅作为上游语法与转换参考监控，不代表把它们作为 WayX 的生产配置平台。

## 工作方式

```text
每天 01:00 Asia/Shanghai
        │
        ▼
GitHub Actions
        │
        ├─ HTTP：ETag / Last-Modified 条件请求
        ├─ GitHub：比较 commit SHA
        └─ SHA-256 二次确认
              │
              ├─ 未变化 → 直接结束，不调用 GPT
              │
              └─ 真正变化
                    │
                    ├─ 同步变更内容
                    ├─ 生成 diff
                    └─ analysis=gpt ?
                           │
                           ├─ 否 → GitHub Actions 完成
                           └─ 是 → 仅把 diff 交给 GPT
                                      │
                                      ├─ 保存审查报告
                                      └─ 创建 GitHub Issue
```

第一次运行只建立 baseline，不调用 GPT，避免初始化时无意义消耗。

## 文件结构

```text
.github/workflows/upstream-monitor.yml
monitor/
  sources.json
  state.json
  monitor_upstreams.py
  diffs/          # 仅真正变更时生成
  reviews/        # 仅需要 GPT 审查时生成
upstream/         # 上游镜像/变更后的文件
```

## 1. 安装

把本目录内容放到你的 GitHub 仓库根目录并提交。

Workflow 会每天 `01:00` 按 `Asia/Shanghai` 时区运行，也可以在 Actions 页面手动运行。

## 2. 配置 OpenAI API（推荐）

Repository → Settings → Secrets and variables → Actions → Secrets：

```text
OPENAI_API_KEY = 你的 OpenAI API Key
```

这是 **OpenAI API**，与 ChatGPT Plus/Pro 的聊天额度不是同一个计费体系。

可选 Repository Variable：

```text
OPENAI_MODEL = gpt-5.6-sol
```

不设置时脚本默认使用 `gpt-5.6-sol`。如果不配置 `OPENAI_API_KEY`，监控和同步仍然正常运行；检测到需要语义分析的更新时，会生成 `PENDING` 审查报告和 GitHub Issue，但不会调用 GPT。

## 3. 配置数据源

编辑 `monitor/sources.json`。

### HTTP / 单文件

```json
{
  "id": "example",
  "name": "Example",
  "kind": "http",
  "platform": "Surge",
  "url": "https://example.com/file.txt",
  "save_as": "Example/file.txt",
  "normalize": "raw",
  "analysis": "none"
}
```

`analysis`：

- `none`：GitHub Actions 自己同步，不调用 GPT。
- `gpt`：只有内容 SHA-256 确实变化后才调用 GPT。

`normalize`：

- `raw`：原文件保存、原字节比较。
- `html_text`：网页提取可见文本后比较，减少 HTML 构建噪声。

### GitHub 仓库

```json
{
  "id": "repo-example",
  "name": "Repo Example",
  "kind": "github_repo",
  "platform": "Quantumult X",
  "repo": "owner/repo",
  "ref": "master",
  "save_as": "Repo/example",
  "analysis": "gpt",
  "sync_changed_files": true,
  "include_globs": ["*.conf", "*.snippet", "*.js", "*.md"]
}
```

GitHub 仓库类型每天只查询当前 commit SHA；SHA 没变时不会读取正文。发生变化后才调用 Compare API、同步命中的变更文件，并生成 patch。

## 4. 资源控制策略

- 无变化：不调用 GPT。
- HTTP 支持 ETag/Last-Modified 时优先走 `304 Not Modified`。
- HTTP 即使返回 200，也再比较 SHA-256，内容相同不调用 GPT。
- GitHub 仓库先比较 commit SHA，SHA 不变直接结束。
- GPT 默认只接收 diff，`max_diff_chars` 默认 30000，不发送整个仓库。
- 单个上游暂时失败不会阻断其他来源。
- GPT 失败不会阻断镜像同步，审查报告会记录为 `ERROR`。

## 5. 当前预置来源

- Surge 官方 `llms.txt`
- Egern Modules 官方文档
- Egern Scriptings 官方文档
- Loon Rewrite 新语法官方文档
- Quantumult X 官方仓库 `crossutility/Quantumult-X`
- Quantumult X 资源解析器 `KOP-XIAO/QuantumultX`

这些来源依据本项目既有信息源设置。可继续在 `sources.json` 中增删。

## 6. 对转换项目的 GPT 审查规则

脚本内置以下关键规则：

- 语义一致优先于状态码表面一致。
- `reject_dict(200)` 不能因为状态码为 200 就机械转换成 QX `reject-200`。
- QX 的 `reject-200` 只对应 200 + 空 Body 的拒绝语义。
- QX IP 类规则转换时去掉 `no-resolve`。
- Surge 不套用上述 QX 删除规则。
- QX 结果以官方 sample 格式为准。
- 转换模块/脚本保留原注释，并添加转换时间、作者 `chance`、模块分类。

GPT 在监控流程中只做“变化影响分析”，不会自动覆盖你的最终转换产物。这样避免上游一次异常修改直接污染生产配置。

## 7. 注意事项

- 若默认分支开启了禁止 GitHub Actions 直接 push 的保护规则，`Commit synchronized changes` 会失败。此时应改成 PR 模式。
- GitHub 公共仓库长期无活动时，scheduled workflow 可能被自动停用；需要在仓库中重新启用。
- 定时工作流不是实时系统，平台高负载时可能有调度延迟。
