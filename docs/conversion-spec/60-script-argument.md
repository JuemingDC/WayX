# Block 60 — Script / Argument

## 60.1 Source Script 唯一原则

**只转换 Script 声明，不转换 Source JavaScript 正文。**

禁止：
- prepend
- wrapper
- fork
- 自动 API 替换
- 删除 QX 不支持检查
- 为 `$argument` / `enable` 修改脚本

## 60.2 Quantumult X Script Action

Crossutility 官方 sample 已确认的 Script action 包括：
```text
script-request-header
script-request-body
script-response-header
script-response-body
script-echo-response
script-analyze-echo-response
```

选择依据是脚本实际行为，不是文件名。

| Source 行为 | QX declaration |
|---|---|
| request，不需要 body | `script-request-header` |
| request，读取/修改 body | `script-request-body` |
| request 阶段直接生成 response | `script-echo-response` |
| request 阶段生成 response 且需要 request body | `script-analyze-echo-response` |
| response，只处理 header | `script-response-header` |
| response，读取/修改 body | `script-response-body` |

兼容检查至少包括：
- 是否明确拒绝 QX；
- 是否已有 QX adapter；
- 是否依赖 Loon-only API；
- binary 是否正确使用目标平台数据接口。

明确不支持 QX：
```text
# [WayX] QUANTUMULT X UNSUPPORTED
# Source declaration: ...
# Reason: ...
```

目标成品中的 Review/Unsupported 注释使用 `Source declaration`，不添加 `Original Loon`、`Loon resource` 等来源平台标签。

不 fork。

## 60.3 Surge Script

使用现代 Surge：
```ini
[Script]
name = type=http-request,pattern=...,script-path=...
name = type=http-response,pattern=...,script-path=...
```

合法映射：
- `requires_body` → `requires-body`
- `binary_body_mode` → `binary-body-mode`
- 固定 timeout → `timeout=`

## 60.4 [Argument] → QX

QX snippet 没有 Loon `[Argument]` 同构语法。

因此 converter：
- 不修改 Source Script 注入 `$prefs`
- 不生成 wrapper 重建 typed object
- 不用 BoxJs 偷偷改变 Source Script 接口

若原脚本自身已支持 QX `$prefs` / QX adapter，可按原脚本接口使用；否则参数化 Script 声明进入 Review。

BoxJs 可以作为独立 QX 原生功能存在，但不能成为自动改造 Source Script 的手段。

## 60.5 [Argument] → Surge

Surge `#!arguments` 只在**不改变 Source Script 接口**时使用。

允许：
- Source Script 原本接收 string `$argument`
- Surge `argument=` 能传入完全相同字符串

Review：
- Loon typed object argument
- Boolean/Number object 重建
- dynamic `enable` 需要 wrapper 才能实现


## 60.6 Script 兼容性判定必须与插件身份无关

兼容性只允许依据 Source Script 内容与脚本声明本身判定。

允许使用的证据：
- 显式 Quantumult X 支持或拒绝；
- `$task` / `$prefs` / `$notify`；
- `$httpClient` / `$persistentStore`；
- `$utils` / `$loon`；
- body / bodyBytes；
- request/response phase；
- binary 模式；
- `$done` 返回形态。

禁止建立：
- 按插件名的 adapter registry；
- 按作者的 whitelist；
- 按 script URL 路径的特判；
- 按来源仓库的 compatibility override。

如果脚本正文不可获得，且仅凭声明无法证明兼容，必须 Review。

## 60.6.1 Source Script URL 保留

- 转换时可从原 `script-path` / `script("...")` URL 临时读取脚本正文做兼容性判断；相对路径只允许相对原插件 `source` URL 解析。
- 不把 Source Script 复制到 WayX 仓库。
- 不把目标 QX/Surge 声明改写为 WayX raw URL。
- 不使用 GitHub/第三方镜像替代原脚本。
- 原脚本 URL 读取失败时进入 Review/automation failure，不能用副本继续生成“看似成功”的目标。

## 60.7 自动转换实现

- Legacy script behavior selection：`converter/src/script.mjs`
- Source JS compatibility：`converter/src/script-compat.mjs`
- Script v2 parser：`converter/src/script-v2.mjs`
- Script v2 target planner：`converter/src/script-v2-target.mjs`
- Loon Argument parser：`converter/src/argument.mjs`
- Original Source Script fetch / relative resolution：`converter/src/source-fetch.mjs`
- Regression：`converter/tests/rucu6-script-v2-coverage.mjs`、`converter/tests/checkpoint.mjs`
