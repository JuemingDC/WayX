# Block 20 — Rule 类型 / Policy 对应规范

本块是 Rule 转换的唯一映射表。

## 20.1 Rule Type 对应

| Loon Rule Type | Quantumult X | Surge Module | 级别 |
|---|---|---|---|
| `DOMAIN` | `host` | `DOMAIN` | 直接 |
| `DOMAIN-SUFFIX` | `host-suffix` | `DOMAIN-SUFFIX` | 直接 |
| `DOMAIN-KEYWORD` | `host-keyword` | `DOMAIN-KEYWORD` | 直接 |
| `DOMAIN-WILDCARD` | `host-wildcard` | `DOMAIN-WILDCARD` | 直接 |
| `IP-CIDR` | `ip-cidr` | `IP-CIDR` | 直接 |
| `IP-CIDR6` | `ip6-cidr` | `IP-CIDR6` | 直接 |
| `GEOIP` | `geoip` | `GEOIP` | 直接 |
| `IP-ASN` | `ip-asn` | `IP-ASN` | 直接 |
| `USER-AGENT` | `user-agent` | `USER-AGENT` | 直接 |
| `URL-REGEX` | 不进普通 filter；按 Policy 映射到 QX rewrite | `URL-REGEX` | 分 Policy |
| `SRC-PORT` | 官方 sample 未确认 → Review | `SRC-PORT` | Surge 直接 |
| `DEST-PORT` | 官方 sample 未确认 → Review | `DEST-PORT` | Surge 直接 |
| `PROTOCOL` | 官方 sample 未确认 → Review | `PROTOCOL` | Surge 直接 |
| `SUBNET` | 官方 sample 未确认 → Review | `SUBNET` | Surge 直接 |
| `CELLULAR-RADIO` | 官方 sample 未确认 → Review | `CELLULAR-RADIO` | Surge 直接 |
| `CELLULAR-CARRIER` | 官方 sample 未确认 → Review | `CELLULAR-CARRIER` | Surge 直接 |
| `HOSTNAME-TYPE` | 官方 sample 未确认 → Review | `HOSTNAME-TYPE` | Surge 直接 |
| `SRC-IP` | 官方 sample 未确认 → Review | `SRC-IP` | Surge 直接 |
| `IN-PORT` | 官方 sample 未确认 → Review | `IN-PORT` | Surge 直接 |
| `DEVICE-NAME` | 官方 sample 未确认 → Review | `DEVICE-NAME` | Surge 直接 |
| `MAC-ADDRESS` | 官方 sample 未确认 → Review | `MAC-ADDRESS` | Surge 直接 |
| `PROCESS-NAME` | 官方 sample 未确认 → Review | `PROCESS-NAME` | Surge 直接，遵守平台限制 |
| `AND` | 官方 sample 未确认 → Review | `AND` | Surge 直接 |
| `OR` | 官方 sample 未确认 → Review | `OR` | Surge 直接 |
| `NOT` | 官方 sample 未确认 → Review | `NOT` | Surge 直接 |
| `SCRIPT` Rule | QX filter sample 未确认 → Review | `SCRIPT` | Surge 直接 |
| `RULE-SET` | 不自动推断 | `RULE-SET` | QX Review |
| `DOMAIN-SET` | 不自动推断 | `DOMAIN-SET` | QX Review |
| `FINAL` | `final` 仅完整规则配置场景 | `FINAL` | plugin/module 默认 Review |

## 20.2 QX IP 参数

QX 的 `ip-cidr`、`ip6-cidr`、`geoip`、`ip-asn` 不保留 Loon/Surge 的 `no-resolve`。

Surge 中源规则合法的 `no-resolve` 按官方语义保留。

## 20.3 Surge Logical Rule

Surge 原生：
```text
AND,((Rule1),(Rule2)),Policy
OR,((Rule1),(Rule2)),Policy
NOT,((Rule1)),Policy
```

要求：
- 递归验证子 Rule Type
- 不拆平
- 不把子条件扩大成独立 Rule
- `FINAL` 不得作为子 Rule
- 合法 sub-rule flag 保留

## 20.4 Policy 对应

| Loon Policy | QX | Surge Module |
|---|---|---|
| `DIRECT` | `direct` | `DIRECT` |
| `REJECT` | `reject` | `REJECT` |
| `PROXY` | `proxy` | 不假设用户存在 PROXY 组 → Review |
| `REJECT-IMG` | URL 场景 → `reject-img` | `REJECT-TINYGIF` |
| `REJECT-DROP` | 项目约定 → `reject` | `REJECT-DROP`（当前 App Module 运行时已验证） |
| `REJECT-NO-DROP` | `reject`（QX 不存在 Surge 自动升级机制） | `REJECT-NO-DROP`（当前 App Module 运行时已验证） |
| `CELLULAR` | Review | `CELLULAR`（当前 App Module 运行时已验证） |
| `CELLULAR-ONLY` | Review | `CELLULAR-ONLY`（当前 App Module 运行时已验证） |
| `HYBRID` | Review | `HYBRID`（当前 App Module 运行时已验证） |
| `NO-HYBRID` | Review | `NO-HYBRID`（当前 App Module 运行时已验证） |
| `REJECT-TINYGIF` | URL 场景 → `reject-img` | `REJECT-TINYGIF` |
| 用户策略组 | 只有明确存在对应 QX policy 时可执行 | Module 不允许假设 → Review |

公开 Surge Module Manual 当前仍列出较窄的 policy 范围；但当前 Surge App 的模块 Rule 编辑器/运行时已直接验证 `REJECT-DROP / REJECT-NO-DROP / CELLULAR / CELLULAR-ONLY / HYBRID / NO-HYBRID` 可作为 Module Rule 内建 policy 使用。WayX 对这组**运行时已验证的内建值**原样保留，绝不降级为其他 policy。

用户自定义策略组（例如源中的 `PROXY`）仍不得假定存在，必须 Review/绑定提示。

**Rule Type 的支持范围和 policy 的可用范围必须分开判断。**
