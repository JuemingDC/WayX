# Block 60 — Script / Argument

## 60.0 Script IR / Target Planner 架构

Loon `[Script]` 固定采用：

```text
Legacy http-request/http-response ─→ legacy Script parser ─┐
                                                         ├→ target-neutral Script IR
Script v2 request/response ───────→ Script v2 parser ───┘
                                                         ├→ planQxScript()
                                                         └→ planSurgeScript()
```

固定职责：
- Legacy parser 只解析 Loon `http-request/http-response <pattern> key=value,...`；
- Script v2 parser 继续由 `script-v2.mjs` 负责；
- `script-ir.mjs` 统一保留 source syntax、source declaration、phase、pattern/condition、原始 script path、argument 与 options；
- IR 不得写入 QX action、Surge `type=`、目标 section 或目标 capability；
- QX planner 独占 Source Script declaration 的 `script-request-header/body`、`script-response-header/body` 选择；QX 官方支持的 `script-echo-response` / `script-analyze-echo-response` 仍属于目标能力，但不得由 Source Script 全文件正文启发式把一个已声明的 Loon request Script 擅自改类；
- Surge planner 独占 `type=http-request/http-response` 与 `requires-body/max-size/binary-body-mode/timeout/argument/debug` 等声明展开；
- `conversion-pipeline.mjs` 不得重新解析 Legacy option 或自行决定任何 target Script action/parameter；`sync-convert.mjs` 不参与 Script semantic dispatch；
- Source JavaScript 正文仍只允许补充 request/response body 依赖信号，不做 runtime compatibility gate，也不得覆盖源 declaration 的 request/response phase。

本重构不改变现有 option policy，不扩大 Script scope，也不改写 Source Script URL。

## 60.1 Source Script 原则

Source JavaScript 不做正文改写。

禁止：
- prepend / wrapper / fork；
- 自动替换运行时 API；
- 为了转换 Loon `[Argument]` 修改脚本；
- 为了让参数可选而生成 QX BoxJs bridge。

Quantumult X 与 Surge 均不做 Source Script runtime compatibility 审查。目标声明直接引用原脚本 URL。QX 对 Source Script 以源 declaration 的 HTTP phase 与 `requires_body` / `requires-body` 为权威：request 只映射到 `script-request-header/body`，response 只映射到 `script-response-header/body`。脚本正文可作为“实际读取了 body”这一补充信号，但不得因为全文件中出现其它平台分支、公共 helper 或 `$done({response: ...})` / status 字样而把 request declaration 改成 echo-response family。该读取不承担兼容性判定，也不得用于把 Loon 插件参数转换成 QX 参数配置。

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

`binary_body_mode` / legacy `binary-body-mode` 与 `requires_body` / `requires-body` 永久正交：binary mode 绝不能让 QX 自动选择 body action；QX action 只由 request/response phase 与 requires-body 决定。用户提供的官方 sample 没有 `binary_body_mode`、`timeout`、动态 `enable`、`debug` 的 HTTP Script rewrite 参数形式，因此禁止发明 QX 字段。会改变执行行为且无法表达的值必须 fail closed：binary mode=true、任意 timeout、动态 enable、debug=true/动态 debug → Review；enable=false/0 → disabled；enable=true/1 与 debug=false/0 可省略。Legacy `max-size` 继续按既有策略直接丢弃，不影响 action 选择。

| Source 行为 | QX declaration |
|---|---|
| Source Script request，不需要 body | `script-request-header` |
| Source Script request，`requires_body=true` / `requires-body=true` 或正文明确读取 request body | `script-request-body` |
| Source Script response，只处理 header | `script-response-header` |
| Source Script response，`requires_body=true` / `requires-body=true` 或正文明确读取 response body | `script-response-body` |
| QX `script-echo-response` / `script-analyze-echo-response` | 官方能力保留；不得仅凭共享 Source JavaScript 全文件中的 response/status helper 信号从 request declaration 自动升级为 echo family |
| request/response，源声明同时带 binary body mode | 仍按 `requires_body` 选择 `script-request-body` / `script-response-body`；binary body mode 字段本身忽略 |

## 60.3 Loon [Argument] → Quantumult X

QX snippet 不复制 Loon Plugin `[Argument]` 参数 UI，也不生成 BoxJs / `$prefs` / URL fragment / wrapper。

### 60.3.1 Source Script declaration

这里按 KOP-XIAO 当前 `Scripts/resource-parser.js` 的实际 Script 转换口径处理。其 `SCP2QX()` 对 Surge/HTTP Script 声明只提取：

- `pattern`；
- `script-path`；
- `type=http-request/http-response`；
- `requires-body`，据此选择 QX `script-*-header/body`。

该实现没有读取或传递 `argument`、`enable`、`timeout`、`binary-body-mode`。WayX 对 Loon legacy Script / Script v2 采用同样的 QX 声明层策略：

- Script `argument` / PluginObject：继续按既有策略忽略，不生成 QX 参数；
- 动态 `enable=${id}` / `enable={id}`：QX 无已确认动态 enable 字段 → Review；
- 固定 `enable=false/0`：按源声明禁用；固定 `enable=true/1`：无需额外目标字段；
- `timeout`：QX 无已确认 Script declaration timeout 字段 → Review；
- `binary_body_mode=true` / `binary-body-mode=true`：QX 无已确认对应字段 → Review；false 可省略，且 binary mode 永不反推 requires-body；
- `debug=true` 或动态 `debug=${id}`：QX 无已确认字段 → Review；`debug=false/0` 可省略；
- Legacy `max-size`：继续直接丢弃，不写入 QX declaration，也不影响 `requires-body` 对 header/body action 的选择；
- `tag`、源注释、原始 Script URL 保留；
- `requires_body` 继续决定 header/body Script action；
- 其它未明确纳入本兼容策略的字段仍按 WayX 自身 QX 规范独立判断。

QX 只允许对真正无目标语义影响且规范明确允许省略的字段静默省略；会改变执行行为但目标没有官方字段的 option 必须转为 Script Review，不能用普通注释掩盖后继续启用规则。

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

目标 planner 必须先按目标软件官方能力决定字段，而不是因为 Loon 有字段就照抄：

- Surge 官方 Script declaration 原生支持 `timeout` 与 `debug`：Loon `timeout=${id}` → `timeout={{{id}}}`；`debug=${id}` → `debug={{{id}}}`；
- Surge 官方 Script declaration没有 `enable=` 参数；Loon `enable=${id}` → 官方行级 `#!REQUIREMENT`，比较该 Boolean Module 参数是否为 `true`；固定 false 直接 disabled，固定 true 不写额外字段；
- Surge 官方同时支持 `requires-body` 与 `binary-body-mode`，二者独立输出：binary=true 不得自动补 requires-body=true，requires-body=true 也不得自动补 binary-body-mode=true；
- 使用行级 Requirement 时模块必须声明 `#!requirement=CORE_VERSION>=22` 或更高。

动态参数未声明、类型不符合或目标官方能力无法形成合法声明时进入 Review。

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
- 源 declaration 的 request/response phase 不得被正文启发式覆盖；正文只允许把“无 requires-body 声明但实际读取对应 body”的情况提升为同 phase 的 body action；
- 源码正文读取失败时，不因“兼容性未知”禁用脚本；直接按 declaration 的 phase 与 `requires_body` / `requires-body` 映射。跨平台源码中其它平台的 synthetic response 分支、共享 helper、dead code 都不得改变 QX action family。Surge 仍直接引用原脚本 URL。

Source Script 的跨平台运行时适配由原脚本自身负责，不属于 WayX converter 的兼容性门禁。

## 60.6.1 Legacy / Script v2 混排顺序

`[Script]` 中 Legacy 与 Script v2 必须按源文件出现顺序进入同一个 `groupSourceSectionItems()` 遍历。parser/IR/planner 可以不同，但不得先收集全部 Legacy 再输出 v2，或反之。QX `[rewrite_local]` 与 Surge `[Script]` 内对应 Source Script 声明的相对顺序必须与 Loon 源顺序一致；Review/disabled 项的源位置也不得导致后续活动脚本跨越前面的活动脚本重新排序。

## 60.7 Source Script URL

- Source Script 保留原始 URL；
- 不复制为 WayX 镜像；
- 不用第三方 mirror/fallback；
- QX 与 Surge 均不做 Source Script runtime compatibility scan；
- Source Script 正文读取只用于同一 request/response phase 内补充 body 依赖信号，不用于切换 QX action family；
- WayX 为 Rewrite/Mock 等目标能力生成的 helper script 不属于 Source Script 镜像；
- helper script 只能补足 Rewrite/Mock 语义，不能用来模拟 QX 不支持的 Rule Type。

## 60.8 自动化实现索引

- Script action behavior inspector：`.github/converter/src/script.mjs`
- Legacy Script parser：`.github/converter/src/script-legacy.mjs`
- Script v2 parser：`.github/converter/src/script-v2.mjs`
- Script Semantic IR：`.github/converter/src/script-ir.mjs`
- QX Script planner：`.github/converter/src/script-qx.mjs`
- Surge Script planner：`.github/converter/src/script-surge.mjs`
- Script v2 low-level target renderer：`.github/converter/src/script-v2-target.mjs`
- Surge Rewrite argument helper：`.github/converter/src/complex-rewrite-script.mjs`
- Loon Argument parser：`.github/converter/src/argument.mjs`
- Argument dependency analysis：`.github/converter/src/argument-usage.mjs`
- Source Script discovery/materialization：`.github/converter/src/source-script-materializer.mjs`
- Shared conversion context：`.github/converter/src/conversion-context.mjs`
- Original source fetch primitive：`.github/converter/src/source-fetch.mjs`
- Regression：`.github/converter/tests/checkpoint.mjs`、`.github/converter/tests/end-to-end-golden.mjs`
