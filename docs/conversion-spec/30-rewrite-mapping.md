# Block 30 — Rewrite 映射规范

## 30.1 Loon 旧 Rewrite

| Loon Action | Quantumult X | Surge |
|---|---|---|
| `reject` | `url reject` | `[URL Rewrite] REGEX _ reject` |
| `reject-200` | `url reject-200` | Map Local：200 + empty body |
| `reject-img` | `url reject-img` | Map Local：tiny-gif |
| `reject-dict` | `url reject-dict` | Map Local：`{}` + JSON |
| `reject-array` | `url reject-array` | Map Local：`[]` + JSON |
| `302 TARGET` | `url 302 TARGET` | `[URL Rewrite] REGEX TARGET 302` |
| `307 TARGET` | `url 307 TARGET` | `[URL Rewrite] REGEX TARGET 307` |
| request header add | QX `request-header`（仅安全固定值） | `[Header Rewrite]` |
| request header set/del/replace | QX `script-request-header` helper | `[Header Rewrite]` |
| request body replace | QX `request-body` | `[Body Rewrite]` |
| response body replace | QX `response-body` | `[Body Rewrite]` |
| request/response JQ | QX `jsonjq-*-body` | `http-*-jq` |
| Script | QX 官方 script action | Surge `[Script]` |

### 30.1.1 旧 Rewrite reject 与 Rule URL-REGEX reject 必须分开

Loon 旧 `[Rewrite]`：

```text
REGEX - reject
```

固定转换：

```text
Quantumult X: REGEX url reject
Surge [URL Rewrite]: REGEX _ reject
```

这里 QX 使用的是官方 `reject`（404 空响应语义），**不能**因为 Block 20 的 `URL-REGEX,REGEX,REJECT -> reject-200` 而改成 `reject-200`。

旧 Rewrite 的其他 reject action 逐项保持类型：

| Loon 旧 `[Rewrite]` | Quantumult X | Surge |
|---|---|---|
| `REGEX - reject` | `REGEX url reject` | `[URL Rewrite] REGEX _ reject` |
| `REGEX - reject-200` | `REGEX url reject-200` | `[Map Local]` 200 + empty body |
| `REGEX - reject-img` | `REGEX url reject-img` | `[Map Local]` tiny-gif + 200 |
| `REGEX - reject-dict` | `REGEX url reject-dict` | `[Map Local]` `{}` + JSON + 200 |
| `REGEX - reject-array` | `REGEX url reject-array` | `[Map Local]` `[]` + JSON + 200 |

## 30.2 Rewrite v2 普通 reject

Loon v2：
```text
reject(404)
reject(200)
```

QX：
```text
REGEX url reject
```

Surge：
```ini
[URL Rewrite]
REGEX _ reject
```

普通 reject 不因为状态码自动改成 Map Local 或 echo script。

## 30.3 Rewrite v2 Body 类型优先

```text
reject_dict(200)  -> QX reject-dict
reject_array(200) -> QX reject-array
reject_img(200)   -> QX reject-img
```

状态码不能覆盖 Action / Body 语义。

## 30.4 Loon Rule：URL-REGEX + REJECT-X

WayX 固定项目映射：
```text
URL-REGEX,REGEX,REJECT
→
REGEX url reject-200
```

这只用于 Loon Rule 的 `URL-REGEX + REJECT`，不能反推普通 Rewrite `reject(200)`。

`URL-REGEX + REJECT-DROP`：
```text
QX -> REGEX url reject
```

完整 `URL-REGEX + REJECT-X` 表以 Block 20.2 为唯一 Rule 映射表；本节只强调它与旧 Rewrite reject 不同。

## 30.4.1 Rewrite v2 Header → Quantumult X

Loon 将 Header 操作细分为 `add / set / del / replace`。Quantumult X 官方 sample 同时提供原生 Header Rewrite 与 Header Script 机制。WayX 按“原生可严格等价则原生，否则 helper”选择，不因动作属于 Header 就一律生成脚本。

### 原生直转子集

Crossutility 官方 sample 只确认完整 **request Header block** 的 `request-header` rewrite，没有活动 `response-header` rewrite token。WayX 因此只在 request phase 使用该原生能力。

原生直转只保留单条、固定参数、单 URL 条件的 `request.header.add`：

```text
request.header.add(...) -> request-header（在首个 CRLF 后插入新 Header 行）
```

`request.header.add` 的原生转换不得先查找/覆盖同名字段；它通过整块 Header 字符串插入新行，保留已有同名 Header，因此是 add 而不是 set。Header 值含 `# Block 30 — Rewrite 映射规范

## 30.1 Loon 旧 Rewrite

| Loon Action | Quantumult X | Surge |
|---|---|---|
| `reject` | `url reject` | `[URL Rewrite] REGEX _ reject` |
| `reject-200` | `url reject-200` | Map Local：200 + empty body |
| `reject-img` | `url reject-img` | Map Local：tiny-gif |
| `reject-dict` | `url reject-dict` | Map Local：`{}` + JSON |
| `reject-array` | `url reject-array` | Map Local：`[]` + JSON |
| `302 TARGET` | `url 302 TARGET` | `[URL Rewrite] REGEX TARGET 302` |
| `307 TARGET` | `url 307 TARGET` | `[URL Rewrite] REGEX TARGET 307` |
| request header add | QX `request-header`（仅安全固定值） | `[Header Rewrite]` |
| request header set/del/replace | QX `script-request-header` helper | `[Header Rewrite]` |
| request body replace | QX `request-body` | `[Body Rewrite]` |
| response body replace | QX `response-body` | `[Body Rewrite]` |
| request/response JQ | QX `jsonjq-*-body` | `http-*-jq` |
| Script | QX 官方 script action | Surge `[Script]` |

### 30.1.1 旧 Rewrite reject 与 Rule URL-REGEX reject 必须分开

Loon 旧 `[Rewrite]`：

```text
REGEX - reject
```

固定转换：

```text
Quantumult X: REGEX url reject
Surge [URL Rewrite]: REGEX _ reject
```

这里 QX 使用的是官方 `reject`（404 空响应语义），**不能**因为 Block 20 的 `URL-REGEX,REGEX,REJECT -> reject-200` 而改成 `reject-200`。

旧 Rewrite 的其他 reject action 逐项保持类型：

| Loon 旧 `[Rewrite]` | Quantumult X | Surge |
|---|---|---|
| `REGEX - reject` | `REGEX url reject` | `[URL Rewrite] REGEX _ reject` |
| `REGEX - reject-200` | `REGEX url reject-200` | `[Map Local]` 200 + empty body |
| `REGEX - reject-img` | `REGEX url reject-img` | `[Map Local]` tiny-gif + 200 |
| `REGEX - reject-dict` | `REGEX url reject-dict` | `[Map Local]` `{}` + JSON + 200 |
| `REGEX - reject-array` | `REGEX url reject-array` | `[Map Local]` `[]` + JSON + 200 |

## 30.2 Rewrite v2 普通 reject

Loon v2：
```text
reject(404)
reject(200)
```

QX：
```text
REGEX url reject
```

Surge：
```ini
[URL Rewrite]
REGEX _ reject
```

普通 reject 不因为状态码自动改成 Map Local 或 echo script。

## 30.3 Rewrite v2 Body 类型优先

```text
reject_dict(200)  -> QX reject-dict
reject_array(200) -> QX reject-array
reject_img(200)   -> QX reject-img
```

状态码不能覆盖 Action / Body 语义。

## 30.4 Loon Rule：URL-REGEX + REJECT-X

WayX 固定项目映射：
```text
URL-REGEX,REGEX,REJECT
→
REGEX url reject-200
```

这只用于 Loon Rule 的 `URL-REGEX + REJECT`，不能反推普通 Rewrite `reject(200)`。

`URL-REGEX + REJECT-DROP`：
```text
QX -> REGEX url reject
```

完整 `URL-REGEX + REJECT-X` 表以 Block 20.2 为唯一 Rule 映射表；本节只强调它与旧 Rewrite reject 不同。

## 30.4.1 Rewrite v2 Header → Quantumult X

Loon 将 Header 操作细分为 `add / set / del / replace`。Quantumult X 官方 sample 同时提供原生 Header Rewrite 与 Header Script 机制。WayX 按“原生可严格等价则原生，否则 helper”选择，不因动作属于 Header 就一律生成脚本。

### 原生直转子集

Crossutility 官方 sample 只确认完整 **request Header block** 的 `request-header` rewrite，没有活动 `response-header` rewrite token。WayX 因此只在 request phase 使用该原生能力。

 时不走该原生路径，因为 QX replacement string 的 literal-dollar 转义没有在官方 sample 中得到证明。

`request.header.replace` **不再原生嵌入**到整块 Header 正则。Loon 官方语义中 Header 名称匹配不区分大小写，且 replacement 的 `$0...$n` 属于 Action 自己的正则捕获；如果为了 QX whole-header rewrite 额外加入 CRLF 捕获组，会改变捕获编号，也可能改变 `^/# Block 30 — Rewrite 映射规范

## 30.1 Loon 旧 Rewrite

| Loon Action | Quantumult X | Surge |
|---|---|---|
| `reject` | `url reject` | `[URL Rewrite] REGEX _ reject` |
| `reject-200` | `url reject-200` | Map Local：200 + empty body |
| `reject-img` | `url reject-img` | Map Local：tiny-gif |
| `reject-dict` | `url reject-dict` | Map Local：`{}` + JSON |
| `reject-array` | `url reject-array` | Map Local：`[]` + JSON |
| `302 TARGET` | `url 302 TARGET` | `[URL Rewrite] REGEX TARGET 302` |
| `307 TARGET` | `url 307 TARGET` | `[URL Rewrite] REGEX TARGET 307` |
| request header add | QX `request-header`（仅安全固定值） | `[Header Rewrite]` |
| request header set/del/replace | QX `script-request-header` helper | `[Header Rewrite]` |
| request body replace | QX `request-body` | `[Body Rewrite]` |
| response body replace | QX `response-body` | `[Body Rewrite]` |
| request/response JQ | QX `jsonjq-*-body` | `http-*-jq` |
| Script | QX 官方 script action | Surge `[Script]` |

### 30.1.1 旧 Rewrite reject 与 Rule URL-REGEX reject 必须分开

Loon 旧 `[Rewrite]`：

```text
REGEX - reject
```

固定转换：

```text
Quantumult X: REGEX url reject
Surge [URL Rewrite]: REGEX _ reject
```

这里 QX 使用的是官方 `reject`（404 空响应语义），**不能**因为 Block 20 的 `URL-REGEX,REGEX,REJECT -> reject-200` 而改成 `reject-200`。

旧 Rewrite 的其他 reject action 逐项保持类型：

| Loon 旧 `[Rewrite]` | Quantumult X | Surge |
|---|---|---|
| `REGEX - reject` | `REGEX url reject` | `[URL Rewrite] REGEX _ reject` |
| `REGEX - reject-200` | `REGEX url reject-200` | `[Map Local]` 200 + empty body |
| `REGEX - reject-img` | `REGEX url reject-img` | `[Map Local]` tiny-gif + 200 |
| `REGEX - reject-dict` | `REGEX url reject-dict` | `[Map Local]` `{}` + JSON + 200 |
| `REGEX - reject-array` | `REGEX url reject-array` | `[Map Local]` `[]` + JSON + 200 |

## 30.2 Rewrite v2 普通 reject

Loon v2：
```text
reject(404)
reject(200)
```

QX：
```text
REGEX url reject
```

Surge：
```ini
[URL Rewrite]
REGEX _ reject
```

普通 reject 不因为状态码自动改成 Map Local 或 echo script。

## 30.3 Rewrite v2 Body 类型优先

```text
reject_dict(200)  -> QX reject-dict
reject_array(200) -> QX reject-array
reject_img(200)   -> QX reject-img
```

状态码不能覆盖 Action / Body 语义。

## 30.4 Loon Rule：URL-REGEX + REJECT-X

WayX 固定项目映射：
```text
URL-REGEX,REGEX,REJECT
→
REGEX url reject-200
```

这只用于 Loon Rule 的 `URL-REGEX + REJECT`，不能反推普通 Rewrite `reject(200)`。

`URL-REGEX + REJECT-DROP`：
```text
QX -> REGEX url reject
```

完整 `URL-REGEX + REJECT-X` 表以 Block 20.2 为唯一 Rule 映射表；本节只强调它与旧 Rewrite reject 不同。

## 30.4.1 Rewrite v2 Header → Quantumult X

Loon 将 Header 操作细分为 `add / set / del / replace`。Quantumult X 官方 sample 同时提供原生 Header Rewrite 与 Header Script 机制。WayX 按“原生可严格等价则原生，否则 helper”选择，不因动作属于 Header 就一律生成脚本。

### 原生直转子集

Crossutility 官方 sample 只确认完整 **request Header block** 的 `request-header` rewrite，没有活动 `response-header` rewrite token。WayX 因此只在 request phase 使用该原生能力。

 等正则上下文。因此统一进入 helper。

### Script fallback

```text
request  -> script-request-header
response -> script-response-header
```

`request.header.set / del / replace`、多动作 pipeline，以及 response phase 的 `set / del / replace` 等无法由官方静态 token 严格表达的行为使用 helper。helper 对 Header 名称执行大小写不敏感查找，并让 `header.replace` 的正则只作用于该 Header 值，因此保持 Action-local `$0...$n` 捕获语义。生成 helper 读取 `$request.headers` 或 `$response.headers` 后以 `$done({headers: ...})` 返回。

`response.header.add` 例外：QX 官方 sample 的 Header object 返回形式不能证明重复同名 Header 可保留，因此不得用对象 set 冒充 add；在没有新的官方等价表示前注释 Review。

对 Quantumult X 不发明数组 Header、重复 raw Header 行或其他未由官方 sample/已验证语法支持的返回格式。若 Loon 中存在**连续、同 phase、同 condition** 的多条 Header Rewrite，QX 输出必须将它们合并到一个 Header helper，并按源顺序执行全部动作；中间存在注释/空行或条件不同则不擅自跨边界合并。

## 30.5 Rewrite v2 Pipeline

Loon：
```text
ACTION1 | ACTION2 | ACTION3
```

按左到右执行。转换必须保持整体行为。

禁止把 pipeline 拆成会导致：
- 前一条终止后后一条不执行
- Body 被覆盖
- Header 丢失
- 顺序改变

的多条目标声明。

例如：
```text
response.body.mock(...) | response.header.set(...)
```

QX：一个 echo helper 完成 body + header。  
Surge：组合成等价 Map Local / header 行为。

## 30.5.1 Complex Rewrite Helper Registry

复杂 Rewrite v2 在原生目标能力不足时，可由通用 helper 按 AST condition/action 能力处理；禁止按插件身份特判。新增组合必须先增加 generic handler 与 synthetic fixture，不支持的组合保持 Review。

固定路由顺序：

```text
target native planner
→ dedicated semantic helper
→ Complex Rewrite Helper Registry
→ REVIEW REQUIRED
```

当前 complex helper 可处理同 phase 的 Header/Body/JSON pipeline，以及需要 Surge Module 参数运行时参与的 Rewrite。Header 支持已验证的 `set / del / replace`，Surge 在 `full-header-mode=true` 下额外支持保持重复字段的 `add`；JSON 支持已验证的 `add / delete / replace`。所有 Action 必须严格按 Loon AST 从左到右执行，Body Replace 与 JSON Action 可以交错，禁止把 JSON 操作整体提前或延后。

条件编译当前只接受已验证的 `url`、`request.method`、`response.status`、固定 Header 读取，以及 `== / ~= / && / || / ()`。未知变量、未知运算符、无法证明等价的 capture 行为必须 fail closed。

Loon regex literal 的 `i / m / s` flags 在所有 native/helper 路径中均只解析、不传播；flags 的存在本身不进入 Review。目标编译阶段同时去掉 literal delimiter，并将仅用于源 literal 的 `\/` 规范化为目标 bare-regex 的 `/`；目标 helper 不得通过 `new RegExp(pattern, flags)`、inline modifier 或 case-fold 恢复这些 flags。

Surge 的 `header.add` 与普通对象 Header 修改语义不同。需要脚本保持重复字段时必须使用 `full-header-mode=true` 的 `[{field,value}]` 形式，禁止退化为对象赋值。Quantumult X 同样不得用 set/对象赋值冒充 add：request phase 可用官方 `request-header` 整块字符串插入保留重复字段；response phase 没有已验证的重复 Header 表示，因此 `response.header.add` 注释 Review。

Legacy Rewrite 同样遵守 native → helper → Review：request phase 的旧版 `header-add` 在值不含未证明的 replacement `# Block 30 — Rewrite 映射规范

## 30.1 Loon 旧 Rewrite

| Loon Action | Quantumult X | Surge |
|---|---|---|
| `reject` | `url reject` | `[URL Rewrite] REGEX _ reject` |
| `reject-200` | `url reject-200` | Map Local：200 + empty body |
| `reject-img` | `url reject-img` | Map Local：tiny-gif |
| `reject-dict` | `url reject-dict` | Map Local：`{}` + JSON |
| `reject-array` | `url reject-array` | Map Local：`[]` + JSON |
| `302 TARGET` | `url 302 TARGET` | `[URL Rewrite] REGEX TARGET 302` |
| `307 TARGET` | `url 307 TARGET` | `[URL Rewrite] REGEX TARGET 307` |
| request header add | QX `request-header`（仅安全固定值） | `[Header Rewrite]` |
| request header set/del/replace | QX `script-request-header` helper | `[Header Rewrite]` |
| request body replace | QX `request-body` | `[Body Rewrite]` |
| response body replace | QX `response-body` | `[Body Rewrite]` |
| request/response JQ | QX `jsonjq-*-body` | `http-*-jq` |
| Script | QX 官方 script action | Surge `[Script]` |

### 30.1.1 旧 Rewrite reject 与 Rule URL-REGEX reject 必须分开

Loon 旧 `[Rewrite]`：

```text
REGEX - reject
```

固定转换：

```text
Quantumult X: REGEX url reject
Surge [URL Rewrite]: REGEX _ reject
```

这里 QX 使用的是官方 `reject`（404 空响应语义），**不能**因为 Block 20 的 `URL-REGEX,REGEX,REJECT -> reject-200` 而改成 `reject-200`。

旧 Rewrite 的其他 reject action 逐项保持类型：

| Loon 旧 `[Rewrite]` | Quantumult X | Surge |
|---|---|---|
| `REGEX - reject` | `REGEX url reject` | `[URL Rewrite] REGEX _ reject` |
| `REGEX - reject-200` | `REGEX url reject-200` | `[Map Local]` 200 + empty body |
| `REGEX - reject-img` | `REGEX url reject-img` | `[Map Local]` tiny-gif + 200 |
| `REGEX - reject-dict` | `REGEX url reject-dict` | `[Map Local]` `{}` + JSON + 200 |
| `REGEX - reject-array` | `REGEX url reject-array` | `[Map Local]` `[]` + JSON + 200 |

## 30.2 Rewrite v2 普通 reject

Loon v2：
```text
reject(404)
reject(200)
```

QX：
```text
REGEX url reject
```

Surge：
```ini
[URL Rewrite]
REGEX _ reject
```

普通 reject 不因为状态码自动改成 Map Local 或 echo script。

## 30.3 Rewrite v2 Body 类型优先

```text
reject_dict(200)  -> QX reject-dict
reject_array(200) -> QX reject-array
reject_img(200)   -> QX reject-img
```

状态码不能覆盖 Action / Body 语义。

## 30.4 Loon Rule：URL-REGEX + REJECT-X

WayX 固定项目映射：
```text
URL-REGEX,REGEX,REJECT
→
REGEX url reject-200
```

这只用于 Loon Rule 的 `URL-REGEX + REJECT`，不能反推普通 Rewrite `reject(200)`。

`URL-REGEX + REJECT-DROP`：
```text
QX -> REGEX url reject
```

完整 `URL-REGEX + REJECT-X` 表以 Block 20.2 为唯一 Rule 映射表；本节只强调它与旧 Rewrite reject 不同。

## 30.4.1 Rewrite v2 Header → Quantumult X

Loon 将 Header 操作细分为 `add / set / del / replace`。Quantumult X 官方 sample 同时提供原生 Header Rewrite 与 Header Script 机制。WayX 按“原生可严格等价则原生，否则 helper”选择，不因动作属于 Header 就一律生成脚本。

### 原生直转子集

Crossutility 官方 sample 只确认完整 **request Header block** 的 `request-header` rewrite，没有活动 `response-header` rewrite token。WayX 因此只在 request phase 使用该原生能力。

原生直转只保留单条、固定参数、单 URL 条件的 `request.header.add`：

```text
request.header.add(...) -> request-header（在首个 CRLF 后插入新 Header 行）
```

`request.header.add` 的原生转换不得先查找/覆盖同名字段；它通过整块 Header 字符串插入新行，保留已有同名 Header，因此是 add 而不是 set。Header 值含 `# Block 30 — Rewrite 映射规范

## 30.1 Loon 旧 Rewrite

| Loon Action | Quantumult X | Surge |
|---|---|---|
| `reject` | `url reject` | `[URL Rewrite] REGEX _ reject` |
| `reject-200` | `url reject-200` | Map Local：200 + empty body |
| `reject-img` | `url reject-img` | Map Local：tiny-gif |
| `reject-dict` | `url reject-dict` | Map Local：`{}` + JSON |
| `reject-array` | `url reject-array` | Map Local：`[]` + JSON |
| `302 TARGET` | `url 302 TARGET` | `[URL Rewrite] REGEX TARGET 302` |
| `307 TARGET` | `url 307 TARGET` | `[URL Rewrite] REGEX TARGET 307` |
| request header add | QX `request-header`（仅安全固定值） | `[Header Rewrite]` |
| request header set/del/replace | QX `script-request-header` helper | `[Header Rewrite]` |
| request body replace | QX `request-body` | `[Body Rewrite]` |
| response body replace | QX `response-body` | `[Body Rewrite]` |
| request/response JQ | QX `jsonjq-*-body` | `http-*-jq` |
| Script | QX 官方 script action | Surge `[Script]` |

### 30.1.1 旧 Rewrite reject 与 Rule URL-REGEX reject 必须分开

Loon 旧 `[Rewrite]`：

```text
REGEX - reject
```

固定转换：

```text
Quantumult X: REGEX url reject
Surge [URL Rewrite]: REGEX _ reject
```

这里 QX 使用的是官方 `reject`（404 空响应语义），**不能**因为 Block 20 的 `URL-REGEX,REGEX,REJECT -> reject-200` 而改成 `reject-200`。

旧 Rewrite 的其他 reject action 逐项保持类型：

| Loon 旧 `[Rewrite]` | Quantumult X | Surge |
|---|---|---|
| `REGEX - reject` | `REGEX url reject` | `[URL Rewrite] REGEX _ reject` |
| `REGEX - reject-200` | `REGEX url reject-200` | `[Map Local]` 200 + empty body |
| `REGEX - reject-img` | `REGEX url reject-img` | `[Map Local]` tiny-gif + 200 |
| `REGEX - reject-dict` | `REGEX url reject-dict` | `[Map Local]` `{}` + JSON + 200 |
| `REGEX - reject-array` | `REGEX url reject-array` | `[Map Local]` `[]` + JSON + 200 |

## 30.2 Rewrite v2 普通 reject

Loon v2：
```text
reject(404)
reject(200)
```

QX：
```text
REGEX url reject
```

Surge：
```ini
[URL Rewrite]
REGEX _ reject
```

普通 reject 不因为状态码自动改成 Map Local 或 echo script。

## 30.3 Rewrite v2 Body 类型优先

```text
reject_dict(200)  -> QX reject-dict
reject_array(200) -> QX reject-array
reject_img(200)   -> QX reject-img
```

状态码不能覆盖 Action / Body 语义。

## 30.4 Loon Rule：URL-REGEX + REJECT-X

WayX 固定项目映射：
```text
URL-REGEX,REGEX,REJECT
→
REGEX url reject-200
```

这只用于 Loon Rule 的 `URL-REGEX + REJECT`，不能反推普通 Rewrite `reject(200)`。

`URL-REGEX + REJECT-DROP`：
```text
QX -> REGEX url reject
```

完整 `URL-REGEX + REJECT-X` 表以 Block 20.2 为唯一 Rule 映射表；本节只强调它与旧 Rewrite reject 不同。

## 30.4.1 Rewrite v2 Header → Quantumult X

Loon 将 Header 操作细分为 `add / set / del / replace`。Quantumult X 官方 sample 同时提供原生 Header Rewrite 与 Header Script 机制。WayX 按“原生可严格等价则原生，否则 helper”选择，不因动作属于 Header 就一律生成脚本。

### 原生直转子集

Crossutility 官方 sample 只确认完整 **request Header block** 的 `request-header` rewrite，没有活动 `response-header` rewrite token。WayX 因此只在 request phase 使用该原生能力。

 时不走该原生路径，因为 QX replacement string 的 literal-dollar 转义没有在官方 sample 中得到证明。

`request.header.replace` **不再原生嵌入**到整块 Header 正则。Loon 官方语义中 Header 名称匹配不区分大小写，且 replacement 的 `$0...$n` 属于 Action 自己的正则捕获；如果为了 QX whole-header rewrite 额外加入 CRLF 捕获组，会改变捕获编号，也可能改变 `^/# Block 30 — Rewrite 映射规范

## 30.1 Loon 旧 Rewrite

| Loon Action | Quantumult X | Surge |
|---|---|---|
| `reject` | `url reject` | `[URL Rewrite] REGEX _ reject` |
| `reject-200` | `url reject-200` | Map Local：200 + empty body |
| `reject-img` | `url reject-img` | Map Local：tiny-gif |
| `reject-dict` | `url reject-dict` | Map Local：`{}` + JSON |
| `reject-array` | `url reject-array` | Map Local：`[]` + JSON |
| `302 TARGET` | `url 302 TARGET` | `[URL Rewrite] REGEX TARGET 302` |
| `307 TARGET` | `url 307 TARGET` | `[URL Rewrite] REGEX TARGET 307` |
| request header add | QX `request-header`（仅安全固定值） | `[Header Rewrite]` |
| request header set/del/replace | QX `script-request-header` helper | `[Header Rewrite]` |
| request body replace | QX `request-body` | `[Body Rewrite]` |
| response body replace | QX `response-body` | `[Body Rewrite]` |
| request/response JQ | QX `jsonjq-*-body` | `http-*-jq` |
| Script | QX 官方 script action | Surge `[Script]` |

### 30.1.1 旧 Rewrite reject 与 Rule URL-REGEX reject 必须分开

Loon 旧 `[Rewrite]`：

```text
REGEX - reject
```

固定转换：

```text
Quantumult X: REGEX url reject
Surge [URL Rewrite]: REGEX _ reject
```

这里 QX 使用的是官方 `reject`（404 空响应语义），**不能**因为 Block 20 的 `URL-REGEX,REGEX,REJECT -> reject-200` 而改成 `reject-200`。

旧 Rewrite 的其他 reject action 逐项保持类型：

| Loon 旧 `[Rewrite]` | Quantumult X | Surge |
|---|---|---|
| `REGEX - reject` | `REGEX url reject` | `[URL Rewrite] REGEX _ reject` |
| `REGEX - reject-200` | `REGEX url reject-200` | `[Map Local]` 200 + empty body |
| `REGEX - reject-img` | `REGEX url reject-img` | `[Map Local]` tiny-gif + 200 |
| `REGEX - reject-dict` | `REGEX url reject-dict` | `[Map Local]` `{}` + JSON + 200 |
| `REGEX - reject-array` | `REGEX url reject-array` | `[Map Local]` `[]` + JSON + 200 |

## 30.2 Rewrite v2 普通 reject

Loon v2：
```text
reject(404)
reject(200)
```

QX：
```text
REGEX url reject
```

Surge：
```ini
[URL Rewrite]
REGEX _ reject
```

普通 reject 不因为状态码自动改成 Map Local 或 echo script。

## 30.3 Rewrite v2 Body 类型优先

```text
reject_dict(200)  -> QX reject-dict
reject_array(200) -> QX reject-array
reject_img(200)   -> QX reject-img
```

状态码不能覆盖 Action / Body 语义。

## 30.4 Loon Rule：URL-REGEX + REJECT-X

WayX 固定项目映射：
```text
URL-REGEX,REGEX,REJECT
→
REGEX url reject-200
```

这只用于 Loon Rule 的 `URL-REGEX + REJECT`，不能反推普通 Rewrite `reject(200)`。

`URL-REGEX + REJECT-DROP`：
```text
QX -> REGEX url reject
```

完整 `URL-REGEX + REJECT-X` 表以 Block 20.2 为唯一 Rule 映射表；本节只强调它与旧 Rewrite reject 不同。

## 30.4.1 Rewrite v2 Header → Quantumult X

Loon 将 Header 操作细分为 `add / set / del / replace`。Quantumult X 官方 sample 同时提供原生 Header Rewrite 与 Header Script 机制。WayX 按“原生可严格等价则原生，否则 helper”选择，不因动作属于 Header 就一律生成脚本。

### 原生直转子集

Crossutility 官方 sample 只确认完整 **request Header block** 的 `request-header` rewrite，没有活动 `response-header` rewrite token。WayX 因此只在 request phase 使用该原生能力。

 等正则上下文。因此统一进入 helper。

### Script fallback

```text
request  -> script-request-header
response -> script-response-header
```

`request.header.set / del / replace`、多动作 pipeline，以及 response phase 的 `set / del / replace` 等无法由官方静态 token 严格表达的行为使用 helper。helper 对 Header 名称执行大小写不敏感查找，并让 `header.replace` 的正则只作用于该 Header 值，因此保持 Action-local `$0...$n` 捕获语义。生成 helper 读取 `$request.headers` 或 `$response.headers` 后以 `$done({headers: ...})` 返回。

`response.header.add` 例外：QX 官方 sample 的 Header object 返回形式不能证明重复同名 Header 可保留，因此不得用对象 set 冒充 add；在没有新的官方等价表示前注释 Review。

对 Quantumult X 不发明数组 Header、重复 raw Header 行或其他未由官方 sample/已验证语法支持的返回格式。若 Loon 中存在**连续、同 phase、同 condition** 的多条 Header Rewrite，QX 输出必须将它们合并到一个 Header helper，并按源顺序执行全部动作；中间存在注释/空行或条件不同则不擅自跨边界合并。

## 30.5 Rewrite v2 Pipeline

Loon：
```text
ACTION1 | ACTION2 | ACTION3
```

按左到右执行。转换必须保持整体行为。

禁止把 pipeline 拆成会导致：
- 前一条终止后后一条不执行
- Body 被覆盖
- Header 丢失
- 顺序改变

的多条目标声明。

例如：
```text
response.body.mock(...) | response.header.set(...)
```

QX：一个 echo helper 完成 body + header。  
Surge：组合成等价 Map Local / header 行为。

## 30.5.1 Complex Rewrite Helper Registry

复杂 Rewrite v2 在原生目标能力不足时，可由通用 helper 按 AST condition/action 能力处理；禁止按插件身份特判。新增组合必须先增加 generic handler 与 synthetic fixture，不支持的组合保持 Review。

固定路由顺序：

```text
target native planner
→ dedicated semantic helper
→ Complex Rewrite Helper Registry
→ REVIEW REQUIRED
```

当前 complex helper 可处理同 phase 的 Header/Body/JSON pipeline，以及需要 Surge Module 参数运行时参与的 Rewrite。Header 支持已验证的 `set / del / replace`，Surge 在 `full-header-mode=true` 下额外支持保持重复字段的 `add`；JSON 支持已验证的 `add / delete / replace`。所有 Action 必须严格按 Loon AST 从左到右执行，Body Replace 与 JSON Action 可以交错，禁止把 JSON 操作整体提前或延后。

条件编译当前只接受已验证的 `url`、`request.method`、`response.status`、固定 Header 读取，以及 `== / ~= / && / || / ()`。未知变量、未知运算符、无法证明等价的 capture 行为必须 fail closed。

Loon regex literal 的 `i / m / s` flags 在所有 native/helper 路径中均只解析、不传播；flags 的存在本身不进入 Review。目标编译阶段同时去掉 literal delimiter，并将仅用于源 literal 的 `\/` 规范化为目标 bare-regex 的 `/`；目标 helper 不得通过 `new RegExp(pattern, flags)`、inline modifier 或 case-fold 恢复这些 flags。

Surge 的 `header.add` 与普通对象 Header 修改语义不同。需要脚本保持重复字段时必须使用 `full-header-mode=true` 的 `[{field,value}]` 形式，禁止退化为对象赋值。Quantumult X 同样不得用 set/对象赋值冒充 add：request phase 可用官方 `request-header` 整块字符串插入保留重复字段；response phase 没有已验证的重复 Header 表示，因此 `response.header.add` 注释 Review。

 语法时可复用官方 `request-header` 插入；`header-replace / header-del / header-replace-regex` 以及 response phase 的可脚本化操作使用最小 Header helper。旧版 `header-replace-regex` 的 `$n` 必须继续引用它自己的正则捕获，不能被 whole-header CRLF 捕获组改号。旧版 `response-header-add` 与新版 `response.header.add` 一样，在 QX 无重复字段等价表示时保持 Review。

旧版 `mock-request-body / mock-response-body` 先归一化到与 Rewrite v2 `request/response.body.mock` 相同的语义计划：QX 使用已验证的 request-body/echo helper，Surge response 优先 Map Local、request 使用 `http-request` helper。旧版 mock 的 `data="..."` 必须按属性边界取完整内容，不能因 JSON 内部双引号提前截断。旧版 `*-body-json-add` 对可证明的标量值复用 Complex JSON helper，保持“仅 key 不存在时新增”的语义；无法证明的 object/array legacy value 才进入 Review。

`json.add` 按 Loon JSON Key Path 语义处理：仅当目标 Key 不存在时新增；中间对象/数组路径按 Key Path 创建；批量参数按下标配对并从左到右执行。禁止把 `add` 退化成无条件覆盖。

`json.delete` 删除对象 Key；Key Path 最终指向数组索引（如 `items[0]`）时必须删除该元素并压缩数组，禁止使用 JavaScript `delete` 产生稀疏数组。`json.replace(..., null)` 保持 JSON `null` 类型，不得转换为字符串 `"null"`。

## 30.6 自动转换实现

- Legacy classifier/planner：`converter/src/legacy-rewrite.mjs`
- Rewrite v2 parser：`converter/src/rewrite-v2.mjs`
- Rewrite v2 action validator：`converter/src/rewrite-v2-actions.mjs`
- Target semantic planners：`converter/src/rewrite-v2-semantic.mjs`
- QX helper renderer：`converter/src/qx-semantic-script.mjs`
- Synthetic regression：`converter/tests/checkpoint.mjs`、`converter/tests/loon-new-syntax-cases.mjs`
- Real syntax coverage：`converter/tests/rucu6-rewrite-v2-coverage.mjs`

## 30.6.1 注释禁用的 Rewrite v2

在 Loon `[Rewrite]` 中，形如：

```text
#response if ... then response.body.mock(...)
#response if ... then response.json.jq(...)
```

的行不是普通说明文字，而是**被注释禁用的可执行 Rewrite 声明**。

Surge 转换规则：

- 先保留原始 Loon 注释行，满足来源注释保留要求；
- 再使用与活动 Rewrite 完全相同的 generic planner 生成 Surge 等价语法；
- 生成的 Surge 等价语法继续以 `#` 注释，禁止因转换而自动启用；
- 按实际目标能力路由到对应 section，例如：
  - `response.body.mock(...)` → commented `[Map Local]`；
  - `response.json.jq(...)` → commented `[Body Rewrite]` / `http-response-jq`；
- planner 无法证明等价时只保留原注释，不伪造目标语法；
- 禁止按插件名、URL、作者或 Bilibili 特判。

这一规则的目标是避免 Surge 模块中残留 Loon 可执行语法，同时保持源插件的禁用状态不变。



### Named regex captures in complex helpers

For a Loon condition of the form `~= /pattern/ as name`, a generated complex helper may preserve the complete JavaScript match object under that declared name and resolve double-quoted action-string references `${name.0}`, `${name.1}`, etc. Index 0 is the complete match and positive indices are capture groups. Capture aliases must be unique, referenced indexes must not exceed the declared regex capture count, and an action-referenced capture must be guaranteed on every successful condition path. If an optional capture group has no runtime value, only that action is skipped and later actions continue. Raw strings never expand `${...}`. References to undeclared capture names or unsupported interpolation forms fail closed at conversion time. Loon regex flags `i`, `m`, and `s` are parsed but are not propagated to target `RegExp`; only the regex body is retained.


### Complex JSON runtime guard

Generated complex helpers evaluate the Loon condition before running actions. JSON is parsed at the position of each JSON action, not globally before the pipeline. If one action fails at runtime (including invalid JSON or an unavailable optional capture), earlier completed changes are retained, that action is skipped, and later actions continue, matching Loon's documented left-to-right runtime failure semantics.


### Captures in complex JSON replacement values

A string value passed to `json.replace` may resolve a previously declared named regex capture such as `${hit.1}` using the same capture resolver as header/body action strings. Fixed JSON primitives remain typed: numbers stay numbers, booleans stay booleans, and `null` stays JSON null. Undeclared capture aliases and unsupported interpolation forms fail closed. Loon `i/m/s` flags remain omitted from generated target regular expressions.


### Complex helper source semantics

The complex helper follows the current Loon Rewrite v2 execution contract: actions and batch elements execute left-to-right; runtime failure skips only the failing action while preserving earlier completed changes; Header/Body replacement `$0..$n` remains action-local; condition captures use `${name.n}`; raw strings are literal and do not expand variables. These rules are semantic requirements, not target-specific optimizations.


### Complex helper target flags

Generated target declarations must request only the runtime capabilities the helper actually uses. A helper that reads or mutates a body requires body access; Surge therefore emits `requires-body=true` for these helpers. `full-header-mode=true` is emitted only when duplicate-header semantics must be preserved (currently verified Surge `header.add` paths). Do not enable full-header mode for ordinary set/delete/replace pipelines. This follows Surge's official HTTP Script contract and avoids unnecessary buffering/header representation changes.
