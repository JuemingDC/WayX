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

1. 源注释与源 `[Rule]` / `[Rewrite]` / `[Script]` 中最终生成 QX filter/rewrite 的声明紧邻，中间没有空行；
2. 只有一行源注释；
3. 该注释后只紧接一条活动源声明；若继续紧接第二条活动声明，则视为分组注释，不转 note；
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
#!category=WayX
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
- 每个 WayX 生成或维护的 `.sgmodule` 必须声明且只声明一次 `#!category=WayX`，用于 Surge Module UI 归类；
- 来源 Loon 的 `#!category=...` 不透传、不转成普通 `# Category:`；Surge 目标统一替换为 `#!category=WayX`；
- 仅 `#!name / #!desc / #!category / #!system / #!arguments / #!arguments-desc / #!requirement` 等当前项目确认的 Module metadata 可保持活动；
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

## 10.4 Output builder 固定顺序

Quantumult X builder 固定输出：

```text
<header/comments>
<optional notes>
# [filter_local]
...
# [rewrite_local]
...
# [mitm]
...
```

即使某个 QX section 当前为空，三个注释 section 标题仍保留，以匹配 WayX snippet 固定格式。

Surge builder 只输出有内容的 section，固定顺序为：

```text
[Rule]
[URL Rewrite]
[Header Rewrite]
[Body Rewrite]
[Map Local]
[Script]
[MITM]
```

普通 notes 位于第一个 Surge section 之前。`[Body Rewrite]` 或 `[Map Local]` 含活动行时，由 Surge builder 计算 `needsCore20` 并传给 Module header renderer；line requirement 仍由 Script planner/orchestration 提供的状态决定。

## 10.6 自动转换实现

- QX/Surge output path：`.github/converter/src/paths.mjs`
- QX/Surge metadata/header：`.github/converter/src/metadata.mjs`
- QX output state/final render：`.github/converter/src/qx-output.mjs`
- Surge output state/final render：`.github/converter/src/surge-output.mjs`
- Shared line compaction：`.github/converter/src/output-lines.mjs`
- QX snippet validator：`.github/converter/src/qx-snippet-validator.mjs`（直接消费 `qx-official-capabilities.mjs`）
- Surge module section/header validator：`.github/converter/src/surge-module.mjs`
- Orchestration：`.github/scripts/sync-convert.mjs`（只写 builder state，不负责 section title/final assembly）
