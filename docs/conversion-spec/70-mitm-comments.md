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
