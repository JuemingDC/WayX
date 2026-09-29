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
| legacy field-oriented request/response header mutation | QX 静态 `request-header` 不是同构字段操作，当前默认 Review | `[Header Rewrite]` |
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

Loon v2 的 `reject(status)` 必须保持状态码语义。

### `reject(404)`

项目既定映射：

```text
QX    -> REGEX url reject
Surge -> [URL Rewrite] REGEX _ reject
```

### `reject(200)`

```text
QX    -> REGEX url reject-200
Surge -> [Map Local] REGEX data-type=text data="" status-code=200
```

其他固定 status 或带自定义 body 的 `reject(status, body)`：
- 只有目标存在可证明等价原生表达时才静态转换；
- QX 当前使用最小 response helper 保持 status/body；
- Surge 可由 Map Local 精确表达的 response 语义使用 Map Local；
- 不得把 `reject(200)` 降成 404 reject，也不得丢失自定义 body。

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

## 30.4 Legacy Header 与 Rewrite v2 Header 的边界

Legacy field-oriented Header Action 与 QX 官方静态 `request-header` / `url-and-header` 不是天然同构：
- Loon legacy Header Action 按 Header 字段执行 add/del/replace；
- QX 静态 `request-header` 示例是对完整请求 Header 文本执行正则替换；
- 未证明等价前，legacy field-oriented Header → QX 保持 Review，不用“名字相似”强行映射。

Rewrite v2 Header 的 QX 转换使用同 phase helper，见下一节。

## 30.4.1 Rewrite v2 Header → Quantumult X Header Script

Loon 将 Header 操作细分为 `add / set / del / replace`；Quantumult X 的官方 Rewrite 接口按阶段提供 Header Script：

```text
request.header.add/set/del/replace
→ script-request-header

response.header.add/set/del/replace
→ script-response-header
```

转换按 **Header 行为与请求/响应阶段** 映射，不要求目标端存在与 Loon 子动作同名的 Rewrite token。生成脚本读取 `$request.headers` 或 `$response.headers`，完成对应 Header 对象操作后以 `$done({headers: ...})` 返回；同一 Loon pipeline 必须在同一个 helper 中按原顺序执行。

对 Quantumult X 不发明数组 Header、重复 raw Header 行或其他未在官方示例中证明的返回格式；`add` 在 QX Header 对象模型中写入匹配 Header 键。

若 Loon 中存在**连续、同 phase、同 condition** 的多条 Header Rewrite，QX 输出必须将它们合并到一个 Header helper，并按源顺序执行全部动作，避免同一事务依赖多条同时命中的 QX rewrite。中间存在注释/空行或条件不同则不擅自跨边界合并。

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

