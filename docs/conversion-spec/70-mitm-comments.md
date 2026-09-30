# Block 70 — MITM / 注释 / Metadata

## 70.1 MITM

规则：
1. 不扩大 hostname。
2. 不把单 host 自动变 wildcard。
3. 不添加与实际 Rewrite/Script 无关的 host。
4. HTTPS 目标动作需要 MITM 时，目标必须包含对应 hostname。
5. 不迁移 Loon CA 私钥/证书内容。

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

## 70.2 原注释

原注释尽量原位保留。不得删除：
- 开关说明
- 行为说明
- 分组说明
- 上游兼容说明
- 依赖说明

Quantumult X 对最终进入 filter/rewrite 的源 Rule / Rewrite / Script declaration 注释统一应用“一注释一规则”规则：只有单行注释紧邻且只对应一条源声明、并最终生成一条活动 QX filter/rewrite 时，才转换成 `{# note #} rule`。如果一条注释下面连续有多条源声明、存在多行注释、注释本身是被禁用的源声明，或一条源声明展开为多条目标规则，则继续保留普通 `#` 注释，不强行绑定到其中一条。

WayX 转换说明属于目标 metadata，不是源规则注释，禁止进入 QX `{# ... #}` note。

## 70.2.1 未支持 MITM option

除当前已验证的 `hostname` 等目标可表达项外，源 MITM option 不得以普通 “Unsupported” 注释静默保留。无法映射时必须输出 `# [WayX] REVIEW REQUIRED` 与原 `# Source declaration:`，使 Source→Target 对账和 Gate 都能识别该语义项尚未转换。

## 70.3 WayX Metadata

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

- MITM target planner：`converter/src/mitm.mjs`
- Metadata/header rendering：`converter/src/metadata.mjs`
- Source comment grouping/preservation：`.github/scripts/sync-convert.mjs` 的 section item/comment pipeline。
- Validation：`converter/src/surge-module.mjs` + `.github/scripts/sync-convert.mjs::validateQX`。
