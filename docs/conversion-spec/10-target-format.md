# Block 10 — 目标文件格式

## 10.1 Quantumult X snippet

固定使用：

```ini
# [filter_local]
...
# [rewrite_local]
...
# [mitm]
...
```

三个标题必须注释，禁止生成活动：
```ini
[filter_local]
[rewrite_local]
[mitm]
```

只允许 Crossutility 官方 sample 已确认的字段 / action。

QX URL regex 采用官方示例的 **bare regex**：

```text
^https:\/\/api\.example\.com\/ url reject
```

禁止：
```text
^[hH][tT][tT][pP][sS]...
(?i)^https...
```

除非 Crossutility 官方 sample 后续明确增加该语法。

## 10.2 Surge sgmodule

Surge 输出是 Surge Module，不照搬 Loon plugin header。

活动 metadata 只使用官方确认字段，例如：
```text
#!name=
#!desc=
#!system=
#!arguments=
#!arguments-desc=
#!requirement=
```

Loon 专属 metadata 如：
```text
#!author=
#!icon=
#!date=
#!loon_version=
```

需要保留时改成普通注释：
```text
# Original Loon metadata: #!author=...
```

## 10.3 Surge Section

只使用官方 section：
- `[Rule]`
- `[URL Rewrite]`
- `[Header Rewrite]`
- `[Body Rewrite]`
- `[Map Local]`
- `[Script]`
- `[MITM]`

不得把 Loon `[Rewrite]`、`request if ... then ...` 原样作为 Surge 可执行内容。
