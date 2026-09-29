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

来源插件 metadata **保留信息、转换格式，不保留来源平台标签**。

Quantumult X snippet：
- 不输出活动 `#!...`；
- `name / desc / author / homepage / icon / date / tag` 等转换为普通 `# Name: / # Description: / # Author: ...`；
- 来源平台专属版本字段（例如 `loon_version`）不进入目标成品。

Surge Module：
- 仅 `#!name / #!desc / #!system / #!arguments / #!arguments-desc / #!requirement` 等当前合法 Module metadata 可保持活动；
- author/icon/date/homepage/tag 等信息转为普通 `#` 注释；
- 禁止生成 `# Original Loon metadata:`、`# Loon resource:` 等来源平台说明标签。

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
