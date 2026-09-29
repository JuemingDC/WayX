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

源：
```text
/^https:\/\/api\.example\.com/i
```

目标 bare regex：
```text
^https:\/\/api\.example\.com
```

只移除最外层 regex delimiter 与 flag 语法，不改 body。

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
- `^` / `$`
- 捕获组
- 非捕获组
- lookaround
- alternation
- character class
- quantifier

不得为了“简洁”重写 regex。

## 40.7 自动转换实现

- Rewrite v2 condition parser/AST：`converter/src/rewrite-v2.mjs`
- AST action/condition validation：`converter/src/rewrite-v2-actions.mjs`
- Target regex compilation：`converter/src/target-regex.mjs`
- Static/simple-condition target planner：`converter/src/rewrite-v2-semantic.mjs`
- Regression：`converter/tests/checkpoint.mjs`、`converter/tests/rucu6-rewrite-v2-coverage.mjs`
