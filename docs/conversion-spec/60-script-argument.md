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

QX snippet 不提供与 Loon Plugin `[Argument]` 对应的模块参数表。WayX 不把这些内容转换为 QX BoxJs、`$prefs`、URL fragment 或 wrapper。

QX 侧规则：
- 不复制源 `[Argument]` 区块；
- 不输出 Argument usage 清单；
- 不输出默认值形成伪参数 UI；
- 某条 Rewrite/Script 依赖 Loon 参数且 QX 无法保持时，该声明进入 Review。

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
- `input/select/switch` 的首个默认值转换到 `#!arguments`。
- Loon `tag/desc` 和 select 可选值汇总到 `#!arguments-desc`，不伪造 Surge 不存在的 select/switch 控件类型。
- Surge 参数默认值若包含 `#!arguments` 无法安全分隔的逗号或换行，进入 Review，不发明转义语法。
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

## 60.5 Rule PROXY 与 Argument 分离

Loon Plugin Rule 的 `PROXY` 是插件 policy binding，不等同于普通 `[Argument]` id。

- QX：保留字面 `PROXY`，不降为小写内建 `proxy`。
- Surge：继续服从 Surge Module Rule 的官方 policy 限制；不要仅因为存在 `#!arguments` 就假设任意外部 policy 可作为合法 Module Rule。

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
