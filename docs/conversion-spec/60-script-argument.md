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

**不转换。**

QX snippet 不提供与 Loon Plugin `[Argument]` 对应的模块参数表。WayX 不把这些内容转换为 QX BoxJs、`$prefs`、URL fragment 或 wrapper。

QX 侧规则：
- 不复制源 `[Argument]` 区块；
- 不输出 Argument usage 清单；
- 不输出默认值形成伪参数 UI；
- 某条 Rewrite/Script 依赖 Loon 参数时先判断现有 QX helper 是否能在不引入伪参数存储的前提下保持；不能则注释该声明并 Review。

BoxJs 仍是 WayX 中独立的 QX 功能，但不属于 Loon Plugin → QX 自动转换。

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

## 60.5 Rule PROXY 与 Argument 分离

Loon Plugin Rule 的 `PROXY` 是插件内部 policy binding，不等同于普通 `[Argument]` id，也不做策略转换。

- QX：保留字面 `PROXY`，不降为小写内建 `proxy`。
- Surge Module：官方 Module 不能定义 `[Proxy]` / `[Proxy Group]`，活动 Module Rule 也不能使用任意外部 policy 名称。因此源 `PROXY` Rule 只作为原声明注释保留，不改成 `DIRECT`、`REJECT` 或其他策略。

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
