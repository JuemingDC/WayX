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

## 30.2 普通 reject

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

## 30.3 Body 类型优先

```text
reject_dict(200)  -> QX reject-dict
reject_array(200) -> QX reject-array
reject_img(200)   -> QX reject-img
```

状态码不能覆盖 Action / Body 语义。

## 30.4 Loon Rule：URL-REGEX + REJECT

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
