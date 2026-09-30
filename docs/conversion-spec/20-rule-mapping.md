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
| `SRC-PORT` | 注释保留；不走 Script fallback | `SRC-PORT` | Surge 直接 |
| `DEST-PORT` | 注释保留；不走 Script fallback | `DEST-PORT` | Surge 直接 |
| `PROTOCOL` | 注释保留；不走 Script fallback | `PROTOCOL` | Surge 直接 |
| `SUBNET` | 注释保留；不走 Script fallback | `SUBNET` | Surge 直接 |
| `CELLULAR-RADIO` | 注释保留；不走 Script fallback | `CELLULAR-RADIO` | Surge 直接 |
| `CELLULAR-CARRIER` | 注释保留；不走 Script fallback | `CELLULAR-CARRIER` | Surge 直接 |
| `HOSTNAME-TYPE` | 注释保留；不走 Script fallback | `HOSTNAME-TYPE` | Surge 直接 |
| `SRC-IP` | 注释保留；不走 Script fallback | `SRC-IP` | Surge 直接 |
| `IN-PORT` | 注释保留；不走 Script fallback | `IN-PORT` | Surge 直接 |
| `DEVICE-NAME` | 注释保留；不走 Script fallback | `DEVICE-NAME` | Surge 直接 |
| `MAC-ADDRESS` | 注释保留；不走 Script fallback | `MAC-ADDRESS` | Surge 直接 |
| `PROCESS-NAME` | 注释保留；不走 Script fallback | `PROCESS-NAME` | Surge 直接，遵守平台限制 |
| `AND` | 注释保留；不走 Script fallback | `AND` | Surge 直接 |
| `OR` | 注释保留；不走 Script fallback | `OR` | Surge 直接 |
| `NOT` | 注释保留；不走 Script fallback | `NOT` | Surge 直接 |
| `SCRIPT` Rule | 注释保留；不走 Script fallback | `SCRIPT` | Surge 直接 |
| `RULE-SET` | 注释保留；不自动推断、不走 Script fallback | `RULE-SET` | QX 注释 / Surge 直接 |
| `DOMAIN-SET` | 注释保留；不自动推断、不走 Script fallback | `DOMAIN-SET` | QX 注释 / Surge 直接 |

### Quantumult X 不支持 Rule 的固定处理

Quantumult X Rule/Filter 只输出用户提供的 Crossutility 官方 sample 已确认的类型。逻辑规则、端口类规则及其他 sample 未确认的 Loon Rule Type：

- 保留原注释；
- 将原 Rule 声明作为注释保留；
- 不输出活动 QX filter；
- 不尝试用 HTTP Rewrite Script、helper 或 complex helper 模拟 Rule 层匹配；
- 不扩大或拆解源 Rule 条件。

Rule 与 Rewrite 的 fallback 链严格分离：**只有 Rewrite/Mock 在目标原生语法不足时才允许考虑脚本。**


## 20.2 `URL-REGEX` + `REJECT-X` 特殊映射

Loon `[Rule]` 中的 `URL-REGEX` 不能作为 Quantumult X 普通 `filter_local` URL 规则直接输出，因此 WayX 固定降到 QX `rewrite_local`。这与 Loon 旧 `[Rewrite]` 的 `REGEX - reject` 是**不同入口**，不得混淆。

| Loon `[Rule]` | Quantumult X `rewrite_local` | Surge Module |
|---|---|---|
| `URL-REGEX,REGEX,REJECT` | `REGEX url reject-200` | `[Rule] URL-REGEX,REGEX,REJECT` |
| `URL-REGEX,REGEX,REJECT-200` | `REGEX url reject-200` | `[Map Local] REGEX data-type=text data="" status-code=200` |
| `URL-REGEX,REGEX,REJECT-IMG` | `REGEX url reject-img` | `[Rule] URL-REGEX,REGEX,REJECT-TINYGIF` |
| `URL-REGEX,REGEX,REJECT-DICT` | `REGEX url reject-dict` | `[Map Local] REGEX data-type=text data="{}" status-code=200 header="Content-Type:application/json"` |
| `URL-REGEX,REGEX,REJECT-ARRAY` | `REGEX url reject-array` | `[Map Local] REGEX data-type=text data="[]" status-code=200 header="Content-Type:application/json"` |
| `URL-REGEX,REGEX,REJECT-DROP` | `REGEX url reject` | 注释保留；Surge Module `[Rule]` 官方不允许 `REJECT-DROP` |

关键约束：
- `URL-REGEX + REJECT` 在 QX 固定为 `reject-200`，这是 WayX 对 Loon Rule 语义的项目映射。
- `REJECT-IMG / REJECT-DICT / REJECT-ARRAY` 不得统一降级成普通 `reject`。
- Surge Module 只有 `DIRECT / REJECT / REJECT-TINYGIF` 可作为活动 `[Rule]` policy。需要具体 HTTP body 的 `REJECT-200/DICT/ARRAY` 降到官方 `[Map Local]`；`REJECT-DROP / REJECT-NO-DROP / CELLULAR / CELLULAR-ONLY / HYBRID / NO-HYBRID` 虽属于完整 Surge Profile 的内建 policy，但公开 Module Manual 未允许它们作为 Module Rule policy，因此源声明只注释保留，不做近似替换。
- 本节只处理 Loon `[Rule]`。Loon 旧 `[Rewrite]` 的 reject 映射见 Block 30。

## 20.3 QX IP 参数

QX 的 `ip-cidr`、`ip6-cidr`、`geoip`、`ip-asn` 不保留 Loon/Surge 的 `no-resolve`。

Surge 中源规则合法的 `no-resolve` 按官方语义保留。

## 20.4 Surge Logical Rule

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
- 合法 sub-rule flag 保留

## 20.5 Policy 对应

| Loon Policy | QX | Surge Module |
|---|---|---|
| `DIRECT` | `direct` | `DIRECT` |
| `REJECT` | `reject` | `REJECT` |
| `PROXY` | `PROXY`（原样保留，不映射为内建 `proxy`） | 生成 Module policy 参数并写为 `{{{wayx_proxy_policy}}}`；默认 `DIRECT`，用户可改为目标 Surge 代理策略/策略组 |
| `REJECT-IMG` | URL 场景 → `reject-img` | `REJECT-TINYGIF` |
| `REJECT-DROP` | 项目约定 → `reject` | 注释保留；Module Rule 官方未允许 |
| `REJECT-NO-DROP` | `reject`（QX 不存在 Surge 自动升级机制） | 注释保留；Module Rule 官方未允许 |
| `CELLULAR` | Review | 注释保留；Module Rule 官方未允许 |
| `CELLULAR-ONLY` | Review | 注释保留；Module Rule 官方未允许 |
| `HYBRID` | Review | 注释保留；Module Rule 官方未允许 |
| `NO-HYBRID` | Review | 注释保留；Module Rule 官方未允许 |
| `REJECT-TINYGIF` | URL 场景 → `reject-img` | `REJECT-TINYGIF` |
| 用户策略组 | 只有明确存在对应 QX policy 时可执行 | Module 不允许假设 → Review |

Surge 完整 Profile 的 built-in policy 集合比 Module Rule 更大，但 Module Manual 对模块 `[Rule]` 有额外限制：活动规则只允许 `DIRECT / REJECT / REJECT-TINYGIF`。WayX 不把完整 Profile 能力外推到 `.sgmodule`；未被 Module Manual 允许的 built-in policy 只注释保留。

Loon 插件 [Rule] 中的 `PROXY` 具有插件内部策略选择语义，不转换成其他 policy。Quantumult X 保留字面 `PROXY`，不得静默降为内建小写 `proxy`。

Surge Module 不能定义 `[Proxy]` / `[Proxy Group]`，但官方 Parameter Tables 会在应用 Module 前把 `{{{name}}}` 替换成用户配置值。WayX 因此将 Loon Plugin 的 `PROXY` 视为“用户选择策略”的绑定语义：生成独立 Module 参数（默认 `DIRECT`），Rule 的 policy 写成对应 `{{{...}}}` 占位符。用户可在 Module 参数中填入现有 Surge 代理策略或策略组。这里不是把 `PROXY` 静默改成 `DIRECT`；`DIRECT` 只是参数默认值。其他任意自定义外部 policy/group 仍不得在无显式参数绑定时伪装成内建 policy。

**Rule Type 的支持范围和 policy 的可用范围必须分开判断。**

## 20.6 自动转换实现

- Production：`converter/src/rule.mjs`
- Orchestration：`.github/scripts/sync-convert.mjs` 的 `[Rule]` 分发，只按 planner 返回的 section 写入 QX rewrite/filter 或 Surge Rule/Map Local。
- Synthetic regression：`converter/tests/checkpoint.mjs`，必须逐项覆盖 `REJECT / REJECT-200 / REJECT-IMG / REJECT-DICT / REJECT-ARRAY / REJECT-DROP`。
- Repository coverage：`converter/tests/surge-rule-coverage.mjs`。
