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

WayX 不以“格式规范化”为理由改写 regex body。Loon parser 去除最外层 delimiter 与 flags 后，regex body 按源结构保留；其中 `\/` 与 `/` 在目标正则中虽可表示相同斜杠，但转换器不得仅为样式统一批量替换。

禁止：
- 把 regex flag 拼进正文；
- 人工生成 `(?i)`；
- 为了“整洁”重写捕获组、非捕获组、alternation 或 quantifier。

## 40.4 Flags

- Loon regex literal 的 `i/m/s` 属于源 delimiter metadata；输出目标声明时去除，不拼入 regex body；
- 目标没有官方 flag 字段时不发明 `(?i)`、人工 case-fold 或其他替代表达；
- regex body 保持原样，不因 flag 进行结构改写；
- Golden 锁定“去除源 flag、保留 regex body”的结果。

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
- 去掉 Loon regex literal 的最外层 delimiter/flag；
- 保留 regex body 原有的 `\/` 或 `/` 写法，不做全局斜杠 canonicalization；
- 对 `URL-REGEX` 中本身含逗号的 pattern 保留 CSV 引号；
- 保留捕获组结构和编号；
- 保留合法的 `$1/$2` replacement。

## 40.9 自动转换实现

- Rewrite v2 condition parser/AST：`converter/src/rewrite-v2.mjs`
- AST action/condition validation：`converter/src/rewrite-v2-actions.mjs`
- Target regex compilation：`converter/src/target-regex.mjs`
- Static/simple-condition target planner：`converter/src/rewrite-v2-semantic.mjs`
- Surge module validator：`converter/src/surge-module.mjs`
- Regression：`converter/tests/checkpoint.mjs`、`converter/tests/rucu6-rewrite-v2-coverage.mjs`


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
