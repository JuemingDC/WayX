# Block 70 — MITM / Source 注释 / Metadata

## 70.1 MITM

规则：
1. 不扩大 hostname。
2. 不把单 host 自动变 wildcard。
3. 不添加与实际 Rewrite/Script 无关的 host。
4. HTTPS 目标动作需要 MITM 时，目标必须包含对应 hostname。

QX snippet：
```ini
# [mitm]
hostname = api.example.com, *.example.com
```

Surge Module：
```ini
[MITM]
hostname = %APPEND% api.example.com, *.example.com
```

自动从源插件生成的 Surge Module 默认使用 `%APPEND%`，避免无意覆盖用户主配置；但 validator 必须接受 Surge 官方 Module 支持的合法 `hostname = ...` override。不得把合法手写 override 误判为错误。

## 70.1.1 本轮 MITM 边界

当前架构重构**不修改 MITM planner 或 hostname 语义**。MITM 继续保持现有项目边界；本块新增内容只涉及 source section/comment/header metadata 分层。

## 70.2 原注释

原注释尽量原位保留。Source comment grouping 必须由 `.github/converter/src/source-section.mjs` 统一完成；QX inline note 决策再由 `.github/converter/src/qx-comment.mjs` 单独处理。不得删除：
- 开关说明
- 行为说明
- 分组说明
- 上游兼容说明
- 依赖说明

Quantumult X 对最终进入 filter/rewrite 的源 Rule / Rewrite / Script declaration 注释统一应用“一注释一规则”规则：只有单行注释紧邻且只对应一条源声明、并最终生成一条活动 QX filter/rewrite 时，才转换成 `{# note #} rule`。如果一条注释下面连续有多条源声明、存在多行注释、注释本身是被禁用的源声明，或一条源声明展开为多条目标规则，则继续保留普通 `#` 注释，不强行绑定到其中一条。

WayX 转换说明属于目标 metadata，不是源规则注释，禁止进入 QX `{# ... #}` note。`qx-comment.mjs` 只允许从 source item 紧邻的原始单行注释生成 note；不能从 WayX 生成说明、target metadata 或 Review/Issue 文本反向生成 note。

## 70.2.1 MITM 能力边界

WayX 的 MITM capability model 只有 `hostname`。当前 Source Catalog 的活动 `[MITM]` 均为 `hostname`；若未来出现其它活动项，按未登记源语法 fail closed，不扩展为通用 Profile 配置转换。

## 70.3 Source Metadata IR / WayX Metadata

源 header 必须先由 `source-metadata.mjs` 解析为 target-neutral `{directives, comments}`。`metadata.mjs` 只负责把该 IR 渲染为 QX 普通注释或 Surge Module metadata；不得在两个 target renderer 内再次各自解析 `#!...`。



目标文件追加必要的 WayX 转换信息：
```text
# Converted: <北京时间>
# Converted by: chance
# Category: <模块分类>
# Source: <source URL>
# Target: Quantumult X|Surge
```

源插件已有作者、图标、日期、主页等信息时，提取其值并使用目标平台正常的普通注释格式，例如：
```text
# Author: ...
# Icon: ...
# Updated: ...
```

禁止在目标成品头部加入 `Original Loon metadata`、`Loon resource`、`Loon Plugin Conversion` 等来源平台说明。Surge 中未被 Module metadata 确认的字段不得作为活动 `#!...`；QX snippet 的这些信息全部使用普通 `#` 注释。来源平台专属版本字段不输出。

## 70.4 自动转换实现

- MITM target planner：`.github/converter/src/mitm.mjs`
- Source header metadata IR：`.github/converter/src/source-metadata.mjs`
- Metadata/header rendering：`.github/converter/src/metadata.mjs`
- Source section/comment grouping：`.github/converter/src/source-section.mjs`
- QX inline note rendering：`.github/converter/src/qx-comment.mjs`
- Validation：`.github/converter/src/surge-module.mjs` + `.github/scripts/sync-convert.mjs::validateQX`。
