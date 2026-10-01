# Block 30 — Rewrite 映射规范


## 30.0 统一 Semantic IR 契约

Legacy Rewrite 与 Rewrite v2 的**源 grammar 不合并**；统一点位于 source parse 之后。Production 必须通过 `.github/converter/src/rewrite-ir.mjs` 形成 target-neutral Semantic IR，再进入目标规划。

统一 operation kind 至少包括：
- `reject`
- `redirect`
- `url-rewrite`
- `header`
- `body-regex`
- `json`
- `mock`
- `action`（已解析但尚未归入以上类别）
- `unknown`

IR 必须保留 source action/AST，不得为了统一分类丢弃 typed argument、capture/template、pipeline 顺序或 Legacy 特有参数。Source-authored 多 action 的 operation 顺序必须与源声明一致。

目标 planner 仍遵守本块后续映射与 fallback 链；建立 IR **不等于**允许把相似但语义不同的 Legacy/v2 action 强行共用 native mapping。


## 30.0.1 Target planner 边界

Rewrite Semantic IR 形成后，所有目标决策固定进入：

- Quantumult X：`.github/converter/src/rewrite-qx.mjs::planQxRewrite(ir, ctx)`
- Surge：`.github/converter/src/rewrite-surge.mjs::planSurgeRewrite(ir, ctx)`

两个 planner 统一拥有目标 fallback 顺序：

```text
native target primitive
→ dedicated semantic helper
→ source-authored generic complex helper
→ explicit comment Review / Issue
```

`.github/scripts/sync-convert.mjs` 不得再：
- 直接调用 QX/Surge Rewrite renderer；
- 直接注册/调用 complex Rewrite handler；
- 通过 raw action-name regex 判断 target 路径；
- 保留未定义或隐式 fallback。
- 在模块 import 阶段修改全局 complex registry；handler 必须由 target planner 首次执行时惰性、幂等注册。

Legacy Rewrite 的 source-specific helper 可以继续存在于 `legacy-rewrite.mjs`，但必须由 QX/Surge target planner 调用；其存在不构成 orchestration 旁路。

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

`request.header.add` 的原生转换不得先查找/覆盖同名字段；它通过整块 Header 字符串插入新行，保留已有同名 Header，因此是 add 而不是 set。Header 值含 `$` 时不走该原生路径，因为 QX replacement string 的 literal-dollar 转义没有在官方 sample 中得到证明。

`request.header.replace` **不再原生嵌入**到整块 Header 正则。Loon Header 名称匹配不区分大小写，且 replacement 的 `$0...$n` 属于 Action 自己的正则捕获；如果为了 QX whole-header rewrite 额外加入 CRLF 捕获组，会改变捕获编号，也可能改变 `^ / $` 等正则上下文。因此统一进入 helper。

### Script fallback

```text
request  -> script-request-header
response -> script-response-header
```

`request.header.set / del / replace`、多动作 pipeline，以及 response phase 的 `set / del / replace` 等无法由官方静态 token 严格表达的行为使用 helper。helper 对 Header 名称执行大小写不敏感查找，并让 `header.replace` 的正则只作用于该 Header 值，因此保持 Action-local `$0...$n` 捕获语义。生成 helper 读取 `$request.headers` 或 `$response.headers` 后以 `$done({headers: ...})` 返回。

Helper 选择继续遵守最小实现原则：固定值、单 URL 条件的 Header-only 操作优先生成专用 Header helper；只有出现 condition capture、运行时模板或更复杂条件时才使用通用 Complex helper。Header-only helper 不应携带无关 JSON/Body mutation runtime。

`response.header.add` 例外：QX 官方 sample 的 Header object 返回形式不能证明重复同名 Header 可保留，因此不得用对象 set 冒充 add；按当前项目决策直接注释保留源声明，不生成活动 helper，也不进入持续 Review inventory。

对 Quantumult X 不发明数组 Header、重复 raw Header 行或其他未由官方 sample/已验证语法支持的返回格式。

**禁止把多条独立源声明合并成 pipeline。** 即使多条 Loon Rewrite 连续、同 phase、同 condition，也必须逐条转换；只有源 Loon 同一条声明本身使用 `ACTION1 | ACTION2` 时，才属于 multi-action pipeline。转换器不得为了“看起来更完整”而把相邻规则拼接成新的 AST、helper 或 `Source declaration: A | B`。
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

## 30.5.1 Script fallback 边界

脚本 fallback 只用于 Rewrite/Mock，不用于 Rule。

固定顺序：

```text
single action:
target native
→ dedicated semantic helper（仅当原生无法严格等价）
→ REVIEW REQUIRED

multi action:
target native（仅当能整体严格等价）
→ dedicated semantic helper（若有）
→ Complex Rewrite Helper Registry
→ REVIEW REQUIRED
```

通用 Complex Rewrite helper 只接受 `actions.length >= 2`。它生成一份脚本文件，在脚本内部按 Loon 源顺序执行全部 action，并保持 condition、Body/Header/JSON 的先后关系。不得把一个多 action pipeline 拆成多个互不保证执行顺序的目标声明。

单 action 即使需要 Script，也必须使用对应的专用 semantic helper（例如 Header、JSON add、Mock、Redirect 等），不能借用 Complex helper。

## 30.5.1 Complex Rewrite Helper Registry

Complex Registry 只处理**源 Loon 同一条 Rewrite v2 声明中真实存在的多 action pipeline**。禁止从两条或多条独立源规则“推导”或“拼装” complex AST。

Production 准入按 **generic action family + renderer capability**，不再按完整 action signature 建 observed allowlist。流程固定为：

```text
source-authored multi-action AST
→ validateRewriteV2Ast()
→ classifyComplexRewrite() 按 action family 分类
→ target handler 按 family / phase / runtime requirement 匹配
→ renderer 按源 action 顺序执行
→ 无法等价则 REVIEW REQUIRED
```

因此以下都不是新语法，也不需要登记新 signature：

- 同一已支持 family 从 2 个 action 扩展为 3/N 个；
- Header / Body / JSON 已支持 action 的新排列或交错；
- 以前未在 Catalog 同时出现过、但 renderer 已能逐 action 保持语义的新组合；
- QX inline `body.mock` 与同 phase `header.set/del/replace` 的新组合。

Renderer 的能力边界仍然严格保留。当前 mixed renderer 只执行已经实现的同 phase Header、Body Replace、JSON add/delete/replace；QX inline mock renderer 要求恰好一个 same-phase `body.mock`，其它 action 只能是同 phase Header，并继续拒绝无法保真表示的 `header.add` duplicate semantics。Surge 的 Map Local / HTTP Script 仍按官方能力决定。

已知 action 若出现在当前 generic complex renderer 尚未实现的 family（例如 mixed pipeline 中的 JQ action），源语义是已知的，因此固定为普通 `REVIEW REQUIRED`，不得误标成 unknown syntax。只有 parser/action registry 本身不认识的 action/语法才使用 `ISSUE REQUIRED`。

固定路由顺序：

```text
target native planner
→ dedicated semantic helper
→ source-authored generic Complex Rewrite Helper Registry
→ commented REVIEW REQUIRED / ISSUE REQUIRED
```

所有 action 必须严格按 Loon AST 从左到右执行，Body Replace 与 JSON Action 可以交错，禁止按 action family 重排。Complex helper 的 synthetic regression 必须至少覆盖 2-action、3-action、新排列以及已知但 renderer 不支持的组合，防止再次退化为 full-signature whitelist。


Loon regex literal 的 `i / m / s` flags 在所有 native/helper 路径中均只解析、不传播；flags 的存在本身不进入 Review。parser 去掉 literal delimiter 后，regex body 原样保留，不再全局执行 `\/ -> /` 或其他 canonicalization；目标 helper 不得通过 `new RegExp(pattern, flags)`、inline modifier 或 case-fold 恢复这些 flags。若目标软件确有语法差异，只能由对应 target planner 基于官方格式做局部适配。

Surge 的 `header.add` 与普通对象 Header 修改语义不同。需要脚本保持重复字段时必须使用 `full-header-mode=true` 的 `[{field,value}]` 形式，禁止退化为对象赋值。Quantumult X 同样不得用 set/对象赋值冒充 add：request phase 可用官方 `request-header` 整块字符串插入保留重复字段；response phase 没有已验证的重复 Header 表示，因此 `response.header.add` 明确注释保留，不进入持续 Review。

Legacy Rewrite 同样遵守 native → helper → Review：request phase 的旧版 `header-add` 在值不含未证明的 replacement `$` 语法时可复用官方 `request-header` 插入；`header-replace / header-del / header-replace-regex` 以及 response phase 的可脚本化操作使用最小 Header helper。旧版 `header-replace-regex` 的 `$n` 必须继续引用它自己的正则捕获，不能被 whole-header CRLF 捕获组改号。旧版 `response-header-add` 与新版 `response.header.add` 一样，在 QX 无重复字段等价表示时直接注释保留。

旧版 `mock-request-body / mock-response-body` 先归一化到与 Rewrite v2 `request/response.body.mock` 相同的语义计划：QX 使用已验证的 request-body/echo helper，Surge response 优先 Map Local、request 使用 `http-request` helper。旧版 mock 的 `data="..."` 必须按属性边界取完整内容，不能因 JSON 内部双引号提前截断。旧版 `*-body-json-add` 对可证明的标量值复用 Complex JSON helper，保持“仅 key 不存在时新增”的语义；无法证明的 object/array legacy value 才进入 Review。

`json.add` 按 Loon JSON Key Path 语义处理：仅当目标 Key 不存在时新增；中间对象/数组路径按 Key Path 创建；批量参数按下标配对并从左到右执行。禁止把 `add` 退化成无条件覆盖。

`json.delete` 删除对象 Key；Key Path 最终指向数组索引（如 `items[0]`）时必须删除该元素并压缩数组，禁止使用 JavaScript `delete` 产生稀疏数组。`json.replace(..., null)` 保持 JSON `null` 类型，不得转换为字符串 `"null"`。

## 30.6 自动转换实现

- Legacy classifier/planner：`.github/converter/src/legacy-rewrite.mjs`
- Rewrite v2 parser：`.github/converter/src/rewrite-v2.mjs`
- Rewrite v2 action validator：`.github/converter/src/rewrite-v2-actions.mjs`
- Target semantic planners：`.github/converter/src/rewrite-v2-semantic.mjs`
- QX helper renderer：`.github/converter/src/qx-semantic-script.mjs`
- Synthetic regression：`.github/converter/tests/checkpoint.mjs`、`.github/converter/tests/loon-new-syntax-cases.mjs`
- Real syntax coverage：`.github/converter/tests/catalog-syntax-inventory.mjs`、`.github/converter/tests/rewrite-target-planners.mjs`、`.github/converter/tests/end-to-end-golden.mjs`

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
