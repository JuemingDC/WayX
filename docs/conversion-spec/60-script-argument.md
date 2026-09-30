# Block 60 — Script / Argument

## 60.1 Source Script 原则

Source JavaScript 不做正文改写。

禁止：
- prepend / wrapper / fork；
- 自动替换运行时 API；
- 为了转换 Loon `[Argument]` 修改脚本；
- 为了让参数可选而生成 QX BoxJs bridge。

Quantumult X 与 Surge 均不做 Source Script runtime compatibility 审查。目标声明直接引用原脚本 URL；脚本正文仅在 QX 的 HTTP Script declaration 不能单凭源声明确定 header/body/echo action 时，作为辅助行为信息读取。该读取不承担兼容性判定，也不得用于把 Loon 插件参数转换成 QX 参数配置。

WayX 去广告转换的 Script 范围只包含 HTTP request/response 声明。项目中不为非 HTTP 调度/事件类 Script 建立 parser、planner 或 target validator 兼容分支。

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

`binary_body_mode=true` 不要求目标声明存在同名字段。若目标官方脚本运行时已经提供等价二进制 body 接口，则按能力映射：当前 QX **response** 侧已由官方 `sample-bytes-rewrite.js` 验证 `bodyBytes`，可使用 `script-response-body`；QX request 侧在没有同等级官方样例前保持 Review。

| Source 行为 | QX declaration |
|---|---|
| request，不需要 body | `script-request-header` |
| request，读取/修改 body | `script-request-body` |
| request 阶段直接生成 response | `script-echo-response` |
| request 阶段生成 response 且需要 request body | `script-analyze-echo-response` |
| response，只处理 header | `script-response-header` |
| response，读取/修改 body | `script-response-body` |
| response，读取/修改 binary body | `script-response-body`；Crossutility 官方 `sample-bytes-rewrite.js` 已确认 `$response.bodyBytes` / `$done({bodyBytes})` |

## 60.3 Loon [Argument] → Quantumult X

QX snippet 不复制 Loon Plugin `[Argument]` 参数 UI，也不生成 BoxJs / `$prefs` / URL fragment / wrapper。

### 60.3.1 Source Script declaration

这里按 KOP-XIAO 当前 `Scripts/resource-parser.js` 的实际 Script 转换口径处理。其 `SCP2QX()` 对 Surge/HTTP Script 声明只提取：

- `pattern`；
- `script-path`；
- `type=http-request/http-response`；
- `requires-body`，据此选择 QX `script-*-header/body`。

该实现没有读取或传递 `argument`、`enable`、`timeout`。WayX 对 Loon legacy Script / Script v2 采用同样的 QX 声明层策略：

- Script `argument` / PluginObject：**忽略，不生成 QX 参数，也不因此 Review**；
- 动态 `enable=${id}` / `enable={id}`：**忽略动态开关，QX 规则默认开启**；
- 固定 `enable=false/0`：仍按源声明禁用；
- `timeout`：**忽略，不因此 Review**；
- `tag`、源注释、原始 Script URL 保留；
- `requires_body` 继续决定 header/body Script action；
- `binary_body_mode`、`max-size` 等未包含在本次用户决策中的能力仍按 QX 官方样例与现有规范单独判断，不因为 KOP-XIAO 忽略其它字段就自动放行。

为便于审计，WayX 在生成的 QX snippet 中用普通注释记录被忽略的 Script argument / dynamic enable / timeout；这些说明不是 Review marker。

参考实现：
`https://github.com/KOP-XIAO/QuantumultX/blob/master/Scripts/resource-parser.js` → `SCP2QX()`。

### 60.3.2 Rewrite 中的 [Argument]

上述“忽略”规则**只针对 Source Script declaration**。Rewrite v2 条件或 action 中的参数会直接改变匹配范围、替换值、JSON/Header 行为，不能按 Script 参数同样丢弃。

因此 Rewrite 参数仍按既有流程：

1. 能在 QX 原生声明中确定性表达 → native；
2. Rewrite 语义可由已登记专用 helper 无损表达 → helper；
3. 否则注释 Review/Issue。

QX 仍不复制源 `[Argument]` 区块本身，也不生成参数 UI。

## 60.4 Loon [Argument] → Surge Module

Surge Module 官方支持参数表：

```ini
#!arguments=name:default,enabled:true
#!arguments-desc=...
```

参数引用统一使用：

```text
{{{name}}}
```

转换规则：

- Loon 参数 id 保持为 Surge 参数名；若含 Surge 不允许的字符，规范化为字母/数字/下划线，发生重名冲突则 fail closed。
- `input/select/switch` 的首个默认值转换到 `#!arguments`；没有默认值的 `input/select` 只声明参数名，不伪造默认值。
- Loon `tag/desc` 和 select 可选值汇总到 `#!arguments-desc`，不伪造 Surge 不存在的 select/switch 控件类型。
- Surge 参数默认值若包含 `#!arguments` 无法安全分隔的逗号或换行，进入 Review，不发明转义语法。
- 无默认值参数若用于 Loon PluginObject，Loon 的缺值语义为 `null`；Surge 文本替换无法无损复刻时进入 Review，不把它静默变成空字符串。
- QX 不生成这些 metadata。

Surge 官方参数表本质是文本替换，因此 Script 侧按 Surge 原生格式重新表达：

### 60.4.1 PluginObject

Loon：

```text
script("plugin.js", {${region}, ${level}, ${enabled}})
```

Surge：

```ini
#!arguments=region:CN,level:2,enabled:true
[Script]
name = ...,argument="{\"region\":\"{{{region}}}\",\"level\":{{{level}}},\"enabled\":{{{enabled}}}}"
```

类型规则：
- Loon String → JSON quoted placeholder；
- Loon Number / Boolean → JSON unquoted placeholder；
- JSON key 继续使用原 Loon 参数名。

Surge 的 `$argument` 本身是 String，因此这里输出 JSON String，而不是伪造 Object runtime。

### 60.4.2 动态 Script options

- Loon `timeout=${id}` → Surge `timeout={{{id}}}`；
- Loon `debug=${id}` → Surge `debug={{{id}}}`；
- Loon `enable=${id}` → Surge 行级 `#!REQUIREMENT`，比较该 Boolean 参数是否为 `true`；
- 使用行级 Requirement 时模块必须声明 `#!requirement=CORE_VERSION>=22` 或更高。

动态参数未声明、类型不符合或无法形成合法 Surge 声明时才进入 Review。

### 60.4.3 Rewrite 参数

Loon Rewrite v2 中引用已声明 `[Argument]` 时，Surge 不得因为存在参数就整体 Review。固定处理为：

1. 生成 `#!arguments` / `#!arguments-desc`；
2. 原生 Surge 声明能直接使用参数时写成 `{{{name}}}`；
3. 条件或 Action 需要运行时求值时，生成最小 HTTP helper，并通过 Script declaration 的 `argument=` 传入 JSON 模板；
4. helper 使用 `$argument` 读取参数，保持 String/Number/Boolean 类型；
5. 仅当参数未声明、类型无法表达或 helper 仍无法保持源语义时才注释 Review。

## 60.5 Rule PROXY 与 Module policy 参数

Loon Plugin Rule 的 `PROXY` 是插件内部“用户选择策略”绑定，不等同于普通固定 policy 名称。

- QX：保留字面 `PROXY`，不降为小写内建 `proxy`。
- Surge Module：使用官方 Parameter Tables 机制生成独立策略参数。WayX 默认参数名为 `wayx_proxy_policy`（若与源参数重名则顺延后缀），默认值为 `DIRECT`，Rule policy 写成 `{{{wayx_proxy_policy}}}`。
- 参数说明必须明确提示用户可改为现有 Surge 代理策略或策略组；默认 `DIRECT` 只是安装时安全默认值，不代表把源 `PROXY` 语义永久转换为直连。
- 多条源 `PROXY` Rule 共用同一个策略参数，保持 Loon Plugin 的统一策略绑定语义。

官方 Module 文档说明 `#!arguments` 声明的占位符会在应用 Module 前被替换；kokoryh/Sparkle 的 Bilibili Surge module 也使用同一模式，把该规则的 policy 位置写成参数占位符，并提示用户选择代理策略。

## 60.6 Source Script 检查范围

WayX 不判断 Source JavaScript 是否“兼容 Quantumult X / Surge”。

固定行为：

- QX 与 Surge 都直接引用源插件声明的原始 Script URL；
- 不依据 `$utils`、`$httpClient`、`$task`、`$prefs`、`$loon` 等 runtime token 启用或禁用 Source Script；
- 不依据插件名、作者、来源仓库或 Script URL 路径做判断；
- 不修改、wrapper、fork、prepend Source JavaScript；
- 仅在 QX action 类型不能由 declaration 明确决定时，允许读取脚本正文判断是否读取 request/response body、是否直接构造 response，从而选择 `script-*-header/body/echo`；
- 源码正文读取失败时，不因“兼容性未知”禁用脚本；应先使用源 declaration 已明确的信息。若 QX request-phase declaration 仍无法区分“修改 request”与“直接构造 HTTP response”，则该 QX 声明进入 Review，不能猜成 `script-request-*` 或 `script-echo-response`。Surge 仍直接引用原脚本 URL。

Source Script 的跨平台运行时适配由原脚本自身负责，不属于 WayX converter 的兼容性门禁。

## 60.7 Source Script URL

- Source Script 保留原始 URL；
- 不复制为 WayX 镜像；
- 不用第三方 mirror/fallback；
- QX 与 Surge 均不做 Source Script runtime compatibility scan；
- Source Script 正文读取只用于必要的 QX action 类型辅助判定；
- WayX 为 Rewrite/Mock 等目标能力生成的 helper script 不属于 Source Script 镜像；
- helper script 只能补足 Rewrite/Mock 语义，不能用来模拟 QX 不支持的 Rule Type。

## 60.8 实现索引

- Script action：`converter/src/script.mjs`
- Script v2 parser：`converter/src/script-v2.mjs`
- Script v2 target planner：`converter/src/script-v2-target.mjs`
- Surge Rewrite argument helper：`converter/src/complex-rewrite-script.mjs`
- Loon Argument parser：`converter/src/argument.mjs`
- Argument dependency analysis：`converter/src/argument-usage.mjs`
- Source fetch：`converter/src/source-fetch.mjs`
- Regression：`converter/tests/checkpoint.mjs`、`converter/tests/end-to-end-golden.mjs`
