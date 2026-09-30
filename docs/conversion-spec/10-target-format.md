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

只允许 Crossutility 官方 sample 已确认的字段 / action，以及当前 QX beta 已公开的 filter/rewrite 前置 note 语法。

### 10.1.1 Filter / Rewrite 前置 Note

QX 当前支持在 filter 或 rewrite 活动规则前增加：

```text
{# note #} host-suffix, example.com, proxy
{# note #} ^https?://ads\.example\.com url reject
```

WayX 只在以下条件**同时成立**时把 Loon 原注释转换为 QX note：

1. 源注释与源 Rule/Rewrite 紧邻，中间没有空行；
2. 只有一行源注释；
3. 该注释后只紧接一条活动源 Rule/Rewrite；若继续紧接第二条活动规则，则视为分组注释，不转 note；
4. 注释内容不是被注释掉的 Rule/Rewrite declaration；
5. 一条源声明最终只生成一条活动 QX filter/rewrite 行；
6. WayX 自己的 Converted / Author / Category / Target / Source / Review 等转换说明永远不进入 `{# ... #}`。

不满足时继续按普通 `#` 注释原位保留。Surge 输出不使用 QX note 语法。

QX URL regex 采用官方示例的 **bare regex**：

```text
^https://api\.example\.com/ url reject
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

## 10.6 自动转换实现

- QX/Surge output path：`converter/src/paths.mjs`
- QX/Surge metadata/header：`converter/src/metadata.mjs`
- Surge module section/header validator：`converter/src/surge-module.mjs`
- Final render/orchestration：`.github/scripts/sync-convert.mjs`
