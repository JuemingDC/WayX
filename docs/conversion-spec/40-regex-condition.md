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
- 不得丢 Method
- 不得只保留 URL
- 可使用目标官方 helper/script 机制
- 若必须修改 Source Script 正文 → Review

## 40.3 Regex literal

Loon 源：
```text
/^https:\/\/api\.example\.com/i
```

Surge 目标使用官方 bare-regex 写法：
```text
^https://api\.example\.com
```

Surge URL pattern 不是 JavaScript 的 `/.../` literal，因此：
- 去掉最外层 regex delimiter 与 flag；
- 将 Loon/JavaScript literal 中仅用于转义分隔符的 `\/` 规范化为普通 `/`；
- 禁止在 Surge 成品中继续输出 `https:\/\/` 这类源平台 literal 风格。

这属于目标语法规范化，不改变正则匹配语义。

## 40.4 禁止 case-fold 造型

禁止：
```text
^[hH][tT][tT][pP][sS]
```

禁止擅自生成：
```text
(?i)
```

除非目标官方资料明确确认。

## 40.5 Flags

- 记录 `i/m/s` 来源。
- 目标没有官方 flag 字段时不发明表达法。
- 默认保留 bare regex body。
- 若 path/header/body 的实际匹配明显依赖 flag，进入 Review。
- Golden 不得把人工 case-fold 当成“标准输出”。

## 40.6 正则结构

必须保留：
- `^` / `# Block 40 — Regex 与 Rewrite v2 条件

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
- 不得丢 Method
- 不得只保留 URL
- 可使用目标官方 helper/script 机制
- 若必须修改 Source Script 正文 → Review

## 40.3 Regex literal

Loon 源：
```text
/^https:\/\/api\.example\.com/i
```

Surge 目标使用官方 bare-regex 写法：
```text
^https://api\.example\.com
```

Surge URL pattern 不是 JavaScript 的 `/.../` literal，因此：
- 去掉最外层 regex delimiter 与 flag；
- 将 Loon/JavaScript literal 中仅用于转义分隔符的 `\/` 规范化为普通 `/`；
- 禁止在 Surge 成品中继续输出 `https:\/\/` 这类源平台 literal 风格。

这属于目标语法规范化，不改变正则匹配语义。

## 40.4 禁止 case-fold 造型

禁止：
```text
^[hH][tT][tT][pP][sS]
```

禁止擅自生成：
```text
(?i)
```

除非目标官方资料明确确认。

## 40.5 Flags

- 记录 `i/m/s` 来源。
- 目标没有官方 flag 字段时不发明表达法。
- 默认保留 bare regex body。
- 若 path/header/body 的实际匹配明显依赖 flag，进入 Review。
- Golden 不得把人工 case-fold 当成“标准输出”。


- 捕获组
- 非捕获组
- lookaround
- alternation
- character class
- quantifier

不得为了“简洁”改变 regex 语义。

Surge 允许做两类**仅语法规范化、语义不变**的处理：
- `\/` → `/`，因为 Surge 使用 bare regex，不使用 `/.../` delimiter；
- 若源以 `(^...)` 开始，可规范化为 `^(...)`，保持同一捕获组编号和同一匹配范围，避免把 `^` 包在最外层捕获组中。

禁止删除后续真正被 replacement 引用的捕获组。

## 40.7 Surge 302 / 307 捕获替换

Surge 官方 URL Rewrite 的 302/307 replacement 支持 `$1`、`$2` 等捕获组引用。

因此 Loon：

```text
request if ${url} ~= /(^https:\/\/example\.com\/path)(?:\?.*)/ as urlMatch then redirect(302, "${urlMatch.1}")
```

应转换为：

```ini
[URL Rewrite]
^(https://example\.com/path)(?:\?.*) $1 302
```

其中 `$1` 是 Surge 官方 replacement 语法，不得删除；删除后将无法保持“去掉查询参数后跳转到原 URL 主体”的行为。

## 40.8 自动转换实现

- Rewrite v2 condition parser/AST：`converter/src/rewrite-v2.mjs`
- AST action/condition validation：`converter/src/rewrite-v2-actions.mjs`
- Target regex compilation：`converter/src/target-regex.mjs`
- Static/simple-condition target planner：`converter/src/rewrite-v2-semantic.mjs`
- Regression：`converter/tests/checkpoint.mjs`、`converter/tests/rucu6-rewrite-v2-coverage.mjs`
