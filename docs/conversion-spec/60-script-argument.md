# Block 60 — Script / Argument

## 60.1 Source Script 原则

Source JavaScript 不做正文改写。

禁止：
- prepend / wrapper / fork；
- 自动替换运行时 API；
- 为了转换 Loon `[Argument]` 修改脚本；
- 为了让参数可选而生成 QX BoxJs bridge。

脚本正文可以用于一般兼容性判断，但**不得用于把 Loon 插件参数转换成 QX 参数配置**。

## 60.2 Quantumult X Script 声明

QX Script action 只使用官方 sample 已确认的声明形式：

```text
script-request-header
script-request-body
script-response-header
script-response-body
script-echo-response
script-analyze-echo-response
```

选择依据是源声明和脚本实际阶段/Body 行为，不按插件名或作者特判。

| Source 行为 | QX declaration |
|---|---|
| request，不需要 body | `script-request-header` |
| request，读取/修改 body | `script-request-body` |
| request 阶段直接生成 response | `script-echo-response` |
| request 阶段生成 response 且需要 request body | `script-analyze-echo-response` |
| response，只处理 header | `script-response-header` |
| response，读取/修改 body | `script-response-body` |

## 60.3 Loon [Argument] → Quantumult X

**不转换。**

Loon `[Argument]`、PluginObject、动态 `enable/timeout/debug` 属于 Loon 插件配置语义。WayX 不把这些内容转换为：

- QX snippet 参数；
- BoxJs app / setting；
- `$prefs` 配置；
- URL fragment / `$environment.sourcePath` 参数；
- wrapper 或 fork 后的自定义参数桥。

BoxJs 仍可作为 WayX 中独立的 QX 功能存在，但它与 **Loon Plugin → QX** 自动转换链无关。

转换器只在内部解析 `[Argument]`，用途仅有一个：判断某条 Rule / Rewrite / Script 是否依赖 Loon 插件参数。若依赖且目标声明无法保持同一语义，则该条进入 Review，不输出伪等价的活动配置。

### 60.3.1 输出规则

QX 成品：
- 不复制源 `[Argument]` 区块；
- 不输出 Argument usage 清单；
- 不输出 Loon 参数默认值；
- 不生成 BoxJs 配置；
- 只在具体声明无法等价转换时保留必要的 Review / Unsupported 原因。

禁止使用 Loon 默认值将动态配置“冻结”为静态配置。

## 60.4 Rule PROXY 与 Argument 分离

Loon Plugin 中的 `PROXY` 是 policy binding 语义，不视为普通 `[Argument]` id。

QX Rule 转换时：
- 保留目标 policy 名称 `PROXY`；
- 不降级为 QX 内建小写 `proxy`；
- 不通过 BoxJs 自动创建策略；
- 用户目标配置中需要存在对应 policy，或由其自行绑定。

## 60.5 Surge Script

Surge 使用当前官方 Module Script 声明。

可直接保持的固定声明字段按官方语法转换，例如：
- `requires_body` → `requires-body`；
- `binary_body_mode` → `binary-body-mode`；
- 固定 timeout → `timeout=`。

Loon typed PluginObject、动态 enable 等没有经过验证的同构语义时仍进入 Review。WayX 不把 Loon `[Argument]` 区块自动改造成 Surge/QX 的参数 UI。

## 60.6 Script 兼容性与插件身份无关

一般 Source Script 兼容性判断可依据：
- 明确的目标平台支持/拒绝；
- 已知运行时 API；
- request/response phase；
- body / bodyBytes；
- `$done` 返回行为。

禁止依据：
- 插件名；
- 作者；
- script URL 路径；
- 来源仓库；
- Loon `[Argument]` 的值。

兼容性扫描不承担 Loon 参数转换职责。

## 60.7 Source Script URL

- Source Script 保留原始 URL；
- 不复制为 WayX 镜像；
- 不用第三方 mirror/fallback；
- URL 不可用或兼容性无法证明时 fail closed / Review；
- WayX 为 Rewrite/Mock 等目标能力生成的 helper script 不属于 Source Script 镜像。

## 60.8 实现索引

- Script action：`converter/src/script.mjs`
- Script compatibility：`converter/src/script-compat.mjs`
- Script v2 parser：`converter/src/script-v2.mjs`
- Script v2 target planner：`converter/src/script-v2-target.mjs`
- Loon Argument parser：`converter/src/argument.mjs`
- Argument dependency analysis：`converter/src/argument-usage.mjs`
- Source fetch：`converter/src/source-fetch.mjs`
- Regression：`converter/tests/checkpoint.mjs`、`converter/tests/end-to-end-golden.mjs`
