# Block 40 — Regex 与 Rewrite v2 条件

## 40.1 Rewrite v2 条件 AST

必须完整解析：
- `${url}`
- `${request.method}`
- `${request.header['...']}`
- `${response.status}`
- `${response.header['...']}`
- `==`
- `~=`
- `&&`
- `||`
- 括号
- `as capture`
- String / Number / Boolean / null
- Regex
- 数组
- 插件参数变量

复杂条件禁止用字符串正则替换冒充 AST。

## 40.2 条件完整性

只有所有条件都能表达时才可直接静态转换。

Quantumult X 原生 Rewrite 不是只有 URL 条件。官方 sample 定义了第二种匹配器：

```text
<URL regex> <Headers regex> url-and-header <action...>
```

并明确规定 URL 先匹配，随后才匹配 Headers；Headers 比较字符串包含 request method、path 与 key-value request headers。当前 QX App UI 进一步确认所有 Rewrite 类型都提供可选 Headers 字段，因此 Headers matcher 应作为 Action 之外的正交能力处理。**可选**意味着不能因为目标 Action 是 Header Rewrite 就默认使用 Headers matcher。

这只证明 **request-side** Headers 匹配。不能据此把 Loon `${response.header[...]}` 或 `${response.status}` 直接降级成 QX `url-and-header`。Loon `${request.method}` / `${request.header[...]}` 也只有在能保持原比较域、边界、大小写与 Regex 语义时才允许静态编译，否则仍走 helper/Review。

QX matcher planner 区分 **prefilter** 与 **exact** 两种模式，并先判断源条件到底需要哪一种匹配域：

- URL-only：`<URL regex> url <action...>`，不得附加 Headers matcher；
- URL + Headers：`<URL regex> <Headers regex> url-and-header <action...>`；
- Headers-only：QX 官方语法仍要求 URL 字段，因此 WayX 使用全 HTTP(S) guard `^https?:// <Headers regex> url-and-header <action...>`，把 URL 变成不额外收窄的前置条件；
- 无可下推 URL/Headers predicate 的 helper prefilter：`^https?:// url <script-action>`。

对 multi-action helper，可把必要但不一定充分的 request-side 条件作为 native prefilter 下推，因为 helper 会再次完整判断原 condition。当前 prefilter 安全子集包括 URL Regex、`${request.method} == "固定方法"`，以及可安全识别的 `${request.header['Name']}` 条件。Method equality 生成 `^METHOD[ ]` Headers regex；该模式利用官方 sample 已确认的“Headers 比较字符串以 method/path/request headers 组成”语义，同时避免官方示例 `^POST` 对扩展方法名产生前缀误匹配。

Loon 官方文档规定 Header 名 lookup 大小写不敏感、`==` 比较完整 Header 值、`~=` 只对 Header value 做 Regex 搜索，缺失 Header 为 `null`。因此 QX request Header prefilter 固定采用保守策略：固定字符串 `==` 可下推为 `\r\n<case-insensitive-name>:[ \t]*<escaped-value>[ \t]*(?:\r\n|$)`；`~=` 只下推 Header presence，不把源 Regex 嵌进整块 QX Headers 字符串；`== null` 不下推正向 matcher。所有这些路径仍由 helper 重算完整 Loon condition。

若目标不再有 helper 复核、而是直接输出 QX native action，则必须使用 exact matcher。当前 exact 子集只接受 URL Regex、固定 Method equality 或二者通过 `&&` 组合；OR、response-side 条件、**任何 request Header 条件**、多个不同 URL Regex 的 AND 均不得只取部分条件生成 native action。request Header 条件即使已生成 `url-and-header` prefilter，也不等于获得 exact 等价证明。

源：
```text
${url} ~= /REGEX/ && ${request.method} == "POST"
```

若目标静态声明只能表达 URL：
- 不得丢 Method；
- 不得只保留 URL；
- 可使用目标官方 helper/script 机制；
- 若必须修改 Source Script 正文 → Review。

## 40.3 Regex literal

Loon 源：
```text
/^https:\/\/api\.example\.com/i
```

Surge 官方 URL pattern 使用 bare regular expression，不使用 JavaScript 风格的最外层 `/.../` delimiter。官方示例写作：

```text
^https://api\.example\.com
```

WayX 只处理 Loon regex literal 的**语法外壳**：parser 去掉最外层 `/.../` delimiter，并按项目标准丢弃 `i/m/s`。regex body 本身保持原样，不做全局 canonicalization；包括 `\/`、`\.`、捕获组、非捕获组、lookaround、character class、quantifier、anchor 等均不因“目标格式更整洁”而改写。**URL matcher 进一步禁止进入 target regex compiler/normalizer**：QX matcher planner 与 `simpleUrlRewriteCondition()` 必须直接使用 parser AST 中的原 URL regex body。只有非 URL 的 action-local Regex 且官方目标格式确有需要时，才允许由对应 planner 做局部适配。

禁止：
- 把 regex flag 拼进正文；
- 人工生成 `(?i)`；
- 为了“整洁”重写捕获组、非捕获组、alternation 或 quantifier。

## 40.4 Flags

- Loon regex literal 的 `i/m/s` 在 WayX 转换中**无条件丢弃**；flags 的存在本身不构成 Review；
- 不得把 flags 拼入 regex body，也不得通过 `(?i)`、人工 case-fold、`new RegExp(pattern, flags)` 或其他方式恢复；
- 去掉 literal delimiter 后，regex body 原样保留；不得全局执行 `\/ -> /` 或其他字符级 canonicalization；
- 除目标格式所需的上述处理外，regex 的捕获组、lookaround、character class、alternation、quantifier、anchor 等结构保持不变；
- Golden 锁定“丢弃 `i/m/s` + regex body 保持”的结果。

Catalog 另设 Regex feature inventory：高级/特殊构造包括 lookaround/lookbehind、named/numeric backreference、named capture、Unicode property、inline modifier、atomic/conditional/branch-reset group、possessive quantifier。当前实测 baseline 不是空集：`DianPing.lpx` 有 3 个 Legacy atomic group `(?>...)` 与 1 个 Legacy negative lookahead `(?!...)`；它们继续作为**源 pattern 原样透传**的既有行为锁定。Rewrite/Script v2 当前未观察到这些高级构造。未来 special-feature baseline 任一变化都 fail closed；普通 capture/non-capture group、alternation、character class、anchor、quantifier、escaped slash/dot 仍按原 regex body 保留，不归类为平台特殊功能字符。

## 40.5 正则结构保持

必须保持原始匹配结构，包括：
- `^` / `$`
- 捕获组
- 非捕获组
- lookaround
- alternation
- character class
- quantifier

尤其是 URL Rewrite replacement 后续引用捕获组时，**不得改变捕获组编号或删除捕获组**。

`(^https://example\.com/path)` 与 `^(https://example\.com/path)` 都是合法正则结构；WayX 不因格式偏好在二者之间强制改写。

## 40.6 Surge 302 / 307 捕获替换

Surge 官方 URL Rewrite 由三部分组成：

```text
<regex> <replacement> <type>
```

replacement 支持 `$1`、`$2` 等捕获组引用。

Loon：

```text
request if ${url} ~= /(^https:\/\/example\.com\/path)(?:\?.*)/ as urlMatch then redirect(302, "${urlMatch.1}")
```

Surge：

```ini
[URL Rewrite]
(^https://example\.com/path)(?:/?\?.*) $1 302
```

其中：
- 前面的 `(...)` 是捕获组；
- `$1` 是 Surge 官方 replacement 引用；
- `302` 是 URL Rewrite 类型；
- 这三个部分都必须保留，不能因“特殊字符”清理而删除。

## 40.7 注释禁用规则

若 Loon 源声明本身以 `#` 注释禁用，则：
- 原始 Loon 注释必须保留；
- 生成的 Surge 等价规则也必须继续注释；
- 禁止在转换时自动启用。

这是状态语义保持，不是转换失败。

## 40.8 Surge canonical 输出

WayX 对 Surge URL pattern 只做必要的目标格式处理：
- 去掉 Loon regex literal 的最外层 delimiter，并丢弃 `i/m/s`；
- regex body 原样保留，不全局改写 `\/`、`\.` 或其他合法转义；
- 对 `URL-REGEX` 中本身含逗号的 pattern 保留 CSV 引号；
- 保留捕获组结构和编号；
- 保留合法的 `$1/$2` replacement。

## 40.9 自动转换实现

- Rewrite v2 condition parser/AST：`.github/converter/src/rewrite-v2.mjs`
- AST action/condition validation：`.github/converter/src/rewrite-v2-actions.mjs`
- Target regex compilation（仅非 URL 或未来有明确目标语法适配依据的字段）：`.github/converter/src/target-regex.mjs`
- Static/simple-condition target planner：`.github/converter/src/rewrite-v2-semantic.mjs`
- QX native matcher / multi-action prefilter：`.github/converter/src/qx-rewrite-matcher.mjs`
- Surge module validator：`.github/converter/src/surge-module.mjs`
- Regression：`.github/converter/tests/checkpoint.mjs`、`.github/converter/tests/catalog-syntax-inventory.mjs`、`.github/converter/tests/catalog-regex-inventory.mjs`、`.github/converter/tests/rewrite-target-planners.mjs`


## 40.10 Complex helper typed equality

Complex helper 的 `==` 必须按条件 literal 类型进行比较，而不能把目标运行时值与 parser AST 值直接做 JavaScript strict equality：String/raw-string 以字符串比较；Number 先按数值语义比较；Boolean 按布尔 literal 语义比较；`null` 匹配目标变量不存在/null 的情况。尤其是 QX/Surge 的 response status 运行时表示不得导致 Loon 数字状态条件失配。上述行为必须由实际 helper runtime fixture 验证。


## 40.11 Condition type and phase validation

转换前必须按 Loon 当前 Rewrite v2 条件类型约束验证 AST：
- `${response.status}` 是 Number，只允许与 Number 或已知 Number 类型插件变量做 `==`；不得把字符串 `"204"` 自动强制转换为数字状态码。
- Header 变量是 String 或 null；Header 的 `==` 固定值只允许 String/raw-string/null，或已知 String 类型插件变量；不得接受 Number/Boolean 固定值。
- request phase 不得引用 `${response.status}` 或 `${response.header['...']}`。
- `~=` 的右侧必须是 Regex（插件变量 Regex 的独立支持须有明确类型与目标端映射后再开放）。

这些属于源语法有效性约束，不能靠目标 helper 的 JavaScript coercion 修复无效源表达式。


## 40.12 Condition variable domain

Complex helper 的内建条件变量域为 `${url}`、`${request.method}`、request/response Header，以及 response phase 的 `${response.status}`。除此之外的变量必须保留给 `[Argument]` usage/planner 判断：已声明插件参数按参数规则处理，未声明引用进入 Review；不得在 AST 验证阶段提前删除或冻结为固定值，也不得让生成 helper 依赖 JavaScript 隐式行为。

`==` 的固定 literal 类型同时按变量域约束：URL 与 request.method 只接受 String/raw-string；Header 接受 String/raw-string/null；response.status 接受 Number。插件参数变量只有在参数类型已经解析并能证明与左侧变量类型一致时才可开放，不能因为 parser 能读到 `${...}` 就默认可转换。
