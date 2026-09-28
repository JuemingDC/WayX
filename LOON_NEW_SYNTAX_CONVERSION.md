# Loon 新语法 → Quantumult X / Surge 转换规范

> 适用范围：WayX 中采用 Loon 3.5.x 新语法的 `.lpx` 插件，尤其是 RuCu6 当前 `rucu6.pages.dev/Plugins/` 资源。
>
> 本文件是转换约束，不是 README。转换程序和人工转换都必须优先遵守本文件及根目录 `CONVERSION_POLICY.md`。

## 1. 基本原则

1. **语义优先于形式**：必须保持请求/响应阶段、状态码、响应体类型、正则范围、MITM 范围、脚本方向和二进制模式。
2. **禁止扩大匹配范围**：不能为了简化转换把 `AND` 条件拆成更宽泛的单条域名规则，不能把精确 URL 正则扩大为域名级拦截。
3. **禁止伪等价**：目标平台没有无损等价语法时，必须：
   - 使用目标平台官方支持的脚本机制实现等价行为；或
   - 保留原规则为注释并标记 `UNSUPPORTED / MANUAL PORT REQUIRED`。
4. **保留原注释与元数据**：原 `#!name`、`#!desc`、`#!author`、`#!icon`、`#!date`、普通注释和分组注释尽量原位保留。
5. 所有转换结果追加：
   - `# Converted: <北京时间>`
   - `# Converted by: chance`
   - `# Category: <分类>`
   - `# Target: Quantumult X|Surge`
   - `# Source: <原始 URL>`
6. **RuCu6 原始插件只从 Cloudflare Pages 主源同步**；镜像只能用于校验或主源故障时的人工恢复：
   - `https://rucu6.pages.dev/Plugins/<name>.lpx`
7. 原始 Loon 文件保存到 `Resource/Loon/RuCu6/`，不得在 Resource 内修改语法。
8. JavaScript 若需要本地化或平台适配，统一放在 `script/`，模块不得内嵌大段脚本代码。

## 2. 权威依据

### Surge

转换前必须核对 Surge 官方手册：

- Module: https://manual.nssurge.com/profile/module.html
- Profile Format: https://manual.nssurge.com/profile/format.html
- Logical Rules: https://manual.nssurge.com/rules/logical.html
- REJECT Policies: https://manual.nssurge.com/policies/reject.html
- URL Rewrite: https://manual.nssurge.com/http/url-rewrite.html
- Map Local: https://manual.nssurge.com/http/map-local.html
- Header Rewrite: https://manual.nssurge.com/http/header-rewrite.html
- Body Rewrite / JQ: https://manual.nssurge.com/http/body-rewrite.html
- HTTP Processing: https://manual.nssurge.com/http/overview.html
- Scripting: https://manual.nssurge.com/scripting/overview.html
- HTTP Request Script: https://manual.nssurge.com/scripting/http-request.html
- HTTP Response Script: https://manual.nssurge.com/scripting/http-response.html

关键官方约束：

- Surge Module 使用与 Profile 相同的 section 语法。
- Module 的 `[Rule]` 只能安全使用内置策略；不能假定用户存在名为 `PROXY` 的策略组。
- Surge 原生支持 `AND / OR / NOT` 逻辑规则。
- `REJECT`、`REJECT-DROP`、`REJECT-NO-DROP`、`REJECT-TINYGIF` 语义不同，不得互换。
- HTTPS 的 URL/Header/Body/Script 处理必须有相应 MITM hostname。
- Surge Body Rewrite 原生支持 `http-response-jq` / `http-request-jq`。
- Surge Module 参数使用 `#!arguments` + `{{{name}}}`，不得把 Loon `${name}` 原样带入。

### Quantumult X

Quantumult X 只使用项目提供的官方 `sample.txt` / crossutility 官方 sample 中已经出现的语法作为可执行输出依据。

WayX snippet 固定使用注释化分段：

```ini
# [filter_local]
# [rewrite_local]
# [mitm]
```

可执行 filter 基础类型以 sample 为准：

```ini
user-agent, ...
host, ...
host-keyword, ...
host-wildcard, ...
host-suffix, ...
ip-cidr, ...
ip6-cidr, ...
```

可执行 rewrite 基础形式以 sample 为准：

```ini
REGEX url reject
REGEX url reject-img
REGEX url reject-200
REGEX url reject-dict
REGEX url reject-array
REGEX url 302 TARGET
REGEX url 307 TARGET
REGEX url jsonjq-response-body 'JQ'
REGEX url request-header ...
REGEX url request-body ...
REGEX url response-body ...
REGEX url script-response-body SCRIPT
REGEX url script-request-body SCRIPT
REGEX url script-response-header SCRIPT
REGEX url script-request-header SCRIPT
REGEX url script-echo-response SCRIPT
```

没有出现在当前官方 sample、且不能由上述机制无损实现的 Loon 行，不得杜撰 Quantumult X 语法。

## 3. Loon 新语法解析

核心形式：

```text
request  if ${url} ~= /REGEX/i then ACTION
response if ${url} ~= /REGEX/i then ACTION
request  if ${url} ~= /REGEX/i as urlMatch then ACTION
response if ${url} ~= /REGEX/i as urlMatch then ACTION
```

转换时必须移除 JavaScript 正则定界符 `/` 和尾部 flag，但保留正则主体。

### Flag 处理

- `/i`：目标语法没有独立 flag 参数时，优先改写为正则内联标志 `(?i)`；若目标 regex 引擎不接受，则保留原大小写语义所需的明确字符范围，不能直接丢弃。
- 其他 flag 不得擅自忽略。

## 4. [Rule] 转换

### 4.1 Surge

以下 Loon Rule 原样语义映射到 Surge：

```text
DOMAIN
DOMAIN-SUFFIX
DOMAIN-KEYWORD
IP-CIDR
IP-CIDR6
USER-AGENT
DEST-PORT
PROTOCOL
URL-REGEX
AND / OR / NOT
```

策略映射：

```text
DIRECT          -> DIRECT
REJECT          -> REJECT
REJECT-DROP     -> REJECT-DROP
REJECT-NO-DROP  -> REJECT-NO-DROP
REJECT-TINYGIF  -> REJECT-TINYGIF
```

若 Loon 使用 `PROXY` 或任意非 Surge 内置策略名，**Module 中不得假定该策略存在**。保留为注释并标记需要用户策略绑定，除非该模块明确声明了可用的目标策略。

### 4.2 Quantumult X

仅对 sample 明确支持的基础 filter 做直接转换：

```text
DOMAIN          -> host
DOMAIN-SUFFIX   -> host-suffix
DOMAIN-KEYWORD  -> host-keyword
IP-CIDR         -> ip-cidr
IP-CIDR6        -> ip6-cidr
USER-AGENT      -> user-agent
DIRECT          -> direct
REJECT          -> reject
PROXY           -> proxy
```

`AND / OR / NOT / DEST-PORT / URL-REGEX / REJECT-NO-DROP` 等若当前 sample 没有等价示例，不直接生成可执行行。

特别禁止：

```text
AND((DOMAIN A),(PROTOCOL TCP)),REJECT
```

错误转换为：

```text
host, A, reject
```

因为后者扩大到了非 TCP 流量。

## 5. [Rewrite] 新语法映射

### 5.1 reject_dict

Loon：

```text
request if ${url} ~= /REGEX/i then reject_dict(200)
```

Quantumult X：

```text
REGEX url reject-dict
```

Surge：

```ini
[Map Local]
REGEX data-type=text data="{}" status-code=200 header="Content-Type:application/json"
```

### 5.2 reject_img

Loon：

```text
request if ${url} ~= /REGEX/i then reject_img(200)
```

Quantumult X：

```text
REGEX url reject-img
```

Surge：

```ini
[Map Local]
REGEX data-type=tiny-gif status-code=200
```

### 5.3 reject(status)

若状态码不是目标平台内建 reject 动作的确定等价状态码，不得直接降级。

Loon：

```text
request if ${url} ~= /REGEX/i then reject(404)
```

Surge 使用 Map Local 返回明确 404。

Quantumult X 使用生成的 `script-echo-response` 返回明确状态码；不能简单改成 `url reject` 并声称等价。

### 5.4 redirect

Loon：

```text
request if ${url} ~= /REGEX/i then redirect(302, "TARGET")
request if ${url} ~= /REGEX/i then redirect(307, "TARGET")
```

Quantumult X：

```text
REGEX url 302 TARGET
REGEX url 307 TARGET
```

Surge：

```ini
[URL Rewrite]
REGEX TARGET 302
REGEX TARGET 307
```

若使用 `as urlMatch` 和 `${urlMatch.N}`，转换为目标平台对应捕获组引用；转换后必须用测试 URL 验证捕获组编号。

### 5.5 response.json.jq

Loon：

```text
response if ${url} ~= /REGEX/i then response.json.jq("JQ")
```

Quantumult X：

```text
REGEX url jsonjq-response-body 'JQ'
```

Surge：

```ini
[Body Rewrite]
http-response-jq REGEX 'JQ'
```

禁止把 JQ 改写成 JavaScript，除非目标平台 JQ 无法表达原操作。

### 5.6 response.json.delete

单路径：

```text
response.json.delete("data.a")
```

转换为 JQ：

```jq
del(.data.a)
```

多路径：

```text
response.json.delete(["data.a", "data.b.c"])
```

转换为：

```jq
del(.data.a, .data.b.c)
```

Quantumult X 用 `jsonjq-response-body`；Surge 用 `http-response-jq`。

### 5.7 response.json.replace

Loon：

```text
response.json.replace(["data.a", "data.b"], [0, []])
```

转换必须保持 JSON 类型：

```jq
.data.a = 0 | .data.b = []
```

字符串、数字、布尔、null、对象、数组不得互相转换类型。

### 5.8 response.body.replace

Loon：

```text
response if ${url} ~= /URL/i then response.body.replace(/OLD/, "NEW")
```

Quantumult X：

```text
URL url response-body OLD response-body NEW
```

Surge：

```ini
[Body Rewrite]
http-response URL OLD NEW
```

必须正确转义空格、引号和捕获组。

### 5.9 response.body.mock

Loon：

```text
response.body.mock("text", BODY, STATUS)
response.body.mock("text", BASE64, STATUS, true)
```

Surge 优先使用 `[Map Local]`，保持：
- 状态码
- Content-Type
- 文本 / base64 数据类型
- 链式 header 操作

Quantumult X：
- 简单内建空对象/空数组/图片可使用官方 reject-*；
- 任意静态 body、非默认状态码、binary/base64 或需要同时修改 header 时，生成 `script-echo-response` 辅助脚本。
- 二进制辅助脚本必须使用 Quantumult X 官方支持的 `bodyBytes` / ArrayBuffer 机制，不得把 base64 字符串当普通文本返回。

### 5.10 Header 操作

Loon：

```text
request.header.set(...)
response.header.set(...)
response.header.add(...)
```

Surge 使用官方 `[Header Rewrite]` 的 `header-replace` / `header-add` / `header-del` 组合；“set” 必须表达为替换现有值或先删后加，保持覆盖语义。

Quantumult X：
- sample 没有与 Loon `set/add` 一一对应的静态响应头语法时，使用官方 `script-request-header` / `script-response-header`。
- 辅助脚本必须仅改目标 header，不得触碰 body。

### 5.11 Pipeline

Loon：

```text
ACTION1 | ACTION2
```

表示同一匹配上的连续动作。转换时不能拆成目标平台会互相抢占的两个 HTTP script。

例如：

```text
response.body.mock(...) | response.header.set(...)
```

必须在一个 Map Local（Surge）或一个 `script-echo-response`（QX）中同时完成 body + header。

## 6. [Script] 转换

Loon：

```text
request if ${url} ~= /REGEX/i then script("URL") with tag="...", requires_body=true
response if ${url} ~= /REGEX/i then script("URL") with tag="...", requires_body=true, binary_body_mode=true
```

### 6.1 Surge

转换成现代 `[Script]` 声明：

```ini
name = type=http-request,pattern=REGEX,script-path=URL,requires-body=true
name = type=http-response,pattern=REGEX,script-path=URL,requires-body=true,binary-body-mode=true
```

- `requires_body` -> `requires-body`
- `binary_body_mode` -> `binary-body-mode`
- 每条 script name 必须唯一、稳定、可重复生成。
- HTTPS host 必须进入 `[MITM]`。

### 6.2 Quantumult X

```text
request + requires_body=true  -> url script-request-body
request + requires_body=false -> url script-request-header
response + requires_body=true -> url script-response-body
response + requires_body=false-> url script-response-header
```

**在生成 QX 行之前必须读取脚本内容做运行时兼容检查。**

至少检查：

- 是否显式拒绝 QX，例如 `QuantumultX is not supported`；
- 是否只使用 Loon 专有对象且没有 QX adapter；
- 是否使用 `$task` / `$prefs` 或通用 adapter；
- 二进制脚本是否正确处理 QX 的 ArrayBuffer / bodyBytes；
- `$argument` 的格式是否与 Loon 传参一致。

若脚本明确不支持 QX：不生成会报错的执行行，保留原行注释并标记 `MANUAL PORT REQUIRED`。

## 7. [Argument] 参数表

Loon 示例：

```text
Capture=switch, false, true, ...
captionLang=select, "zh-Hans", "zh-Hant", ...
```

### Quantumult X

当前 snippet sample 没有 Loon 式参数表。转换器默认：

1. 解析每个参数的**第一个值为默认值**；
2. 将 `${name}` 固化为默认值；
3. 原 `[Argument]` 内容完整保留为注释；
4. 若参数控制脚本开关，默认 false 的脚本默认不生成执行行，但保留注释；
5. 若要保留可配置 UI，必须单独设计 BoxJs/脚本配置，不得伪造 snippet 参数语法。

### Surge

Surge Module 支持官方 `#!arguments`，但仅在能够保持语义时使用。

- Loon `${name}` 不能原样保留；
- Surge 使用 `{{{name}}}`；
- 传给脚本的数据使用 `argument=`；
- Loon 的 `enable=${name}` 没有文档确认的同构行级开关时，不得伪造参数；默认固化或使用经过验证的 wrapper。

## 8. MITM

Loon：

```text
[MITM]
hostname=a.com, *.b.com
```

Surge Module：

```ini
[MITM]
hostname = %APPEND% a.com, *.b.com
```

Quantumult X snippet：

```ini
# [mitm]
hostname = a.com, *.b.com
```

规则：

1. 不扩大 wildcard。
2. 不自行增加无关域名。
3. 仅在转换后的 HTTPS Rewrite/Script 实际需要时补充缺失 host；补充必须可从 URL 正则明确推导，并写注释说明。
4. Surge 必须使用 `%APPEND%`，避免覆盖主配置 MITM hostname。

## 9. 正则转换

1. 保留锚点 `^` / `$`。
2. 保留转义层级；从 Loon JS-regex literal 转到配置 regex 时只去掉最外层 `/`。
3. `(?:...)`、lookaround、捕获组不得为“简洁”而改写。
4. 带 `as urlMatch` 的规则必须验证引用。
5. 不自动把 `https?` 改成 `https`。
6. 不自动把具体主机改成 wildcard。

## 10. 注释与不可转换项

不可无损转换时使用：

```text
# [WayX] MANUAL PORT REQUIRED:
# Original Loon: ...
# Reason: ...
```

不要删除原规则。

## 11. 验证流程

每个插件转换后至少完成：

1. section 解析成功；
2. 原有效规则数与目标“已转换 + 明确注释未转换”数可对账；
3. 所有 URL regex 可编译；
4. QX 只出现官方 sample 支持的可执行关键字；
5. QX 分段标题必须注释化；
6. Surge section 名必须属于官方支持范围；
7. Surge Module Rule 不引用未声明的外部策略；
8. JQ 表达式前后类型一致；
9. HTTPS rewrite/script 对应 MITM hostname；
10. 所有脚本 URL 可解析；
11. 脚本运行时兼容目标平台；
12. 二进制脚本单独检查 bodyBytes / binary-body-mode；
13. 输出与原插件逐条做语义对比；
14. 只有通过验证的文件才能覆盖仓库现有目标文件。

## 12. 当前 RuCu6 特别说明

RuCu6 2026 年 Loon 插件已经大量使用新语法，包括：

- `request/response if ${url} ~= /.../ then ...`
- `response.json.delete`
- `response.json.replace`
- `response.json.jq`
- `response.body.mock`
- `response.body.replace`
- `request/response.header.*`
- pipeline `|`
- `script(...) with ...`
- `[Argument]`

因此禁止再使用只会机械替换旧 Loon `[Rewrite]` 行的转换器。

当前已发现：
- RuCu6 YouTube 脚本包含 Loon / Surge / QuanX adapter，可按目标平台参数继续验证后使用。
- RuCu6 Bilibili protobuf 脚本存在明确的 QX 不支持分支；QX 版本不得直接引用该脚本并假定可运行。

以上兼容结论必须随上游脚本更新重新扫描，不得永久硬编码。
