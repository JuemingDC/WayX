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

Surge 必须使用 `%APPEND%`，避免覆盖用户主配置。

## 70.2 原注释

原注释尽量原位保留。不得删除：
- 开关说明
- 行为说明
- 分组说明
- 上游兼容说明
- 依赖说明

## 70.3 WayX Metadata

目标文件追加：
```text
# Converted: <北京时间>
# Author: chance
# Category: <模块分类>
# Target: Quantumult X|Surge
# Source: <source URL>
```

Surge 中未被官方确认的 `#!author / #!icon / #!date / #!loon_version` 不作为活动 metadata；只可普通注释保留。
