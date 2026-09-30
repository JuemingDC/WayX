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
| request header replace | QX `request-header` 官方形式 | `[Header Rewrite]` |
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

单条、固定参数、单 URL 条件的 `header.replace`，在完整 Header block 上能够严格表达时：

```text
request.header.replace(...)  -> request-header
response.header.replace(...) -> response-header
```

输出沿用 QX Header Rewrite 的“URL + header regex + replacement”形式。不得扩大 URL/Header 匹配范围，不得改变捕获组编号。

### Script fallback

以下情况继续使用：

```text
request  -> script-request-header
response -> script-response-header
```

包括 `add / set / del`、多个 Header action、需要保持 pipeline 顺序、动态参数，以及任何无法证明与原生 Header Rewrite 严格等价的情况。生成 helper 读取 `$request.headers` 或 `$response.headers`，完成对应 Header 对象操作后以 `$done({headers: ...})` 返回。

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

当前 complex helper 可处理同 phase 的 Header + Body/JSON 有序组合。Header 支持 `set / del / replace`；JSON 支持已验证的 `delete / replace`。所有 action 必须严格按 Loon AST 左到右执行。JSON body 在 helper 内只解析一次，并在 pipeline 完成后序列化一次。

条件编译当前只接受已验证的 `url`、`request.method`、`response.status`、固定 Header 读取，以及 `== / ~= / && / || / ()`。未知变量、未知运算符、无法证明等价的 capture 行为必须 fail closed。

Loon regex literal 的 `i / m / s` flags 在所有 native/helper 路径中均只解析、不传播；目标 helper 只能使用 regex body，不得通过 `new RegExp(pattern, flags)` 恢复这些 flags。

Surge 的 `header.add` 与普通对象 Header 修改语义不同：官方定义为已有同名字段时继续追加。需要脚本保持重复字段时必须使用 `full-header-mode=true` 的 `[{field,value}]` 形式，禁止退化为对象赋值。Quantumult X 未验证等价的重复 Header 返回表示前，`header.add` complex fallback 保持 fail closed。

`json.add` 在新增路径、对象/数组等语义未得到足够依据前保持 fail closed；不得用 `setpath` 等近似行为替代。

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

