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
| `PROCESS-NAME` | 官方 sample 未确认 → Review | `PROCESS-NAME` | 仅源插件明确为 macOS-only 时直接；否则 Review |
| `AND` | 官方 sample 未确认 → Review | `AND` | Surge 直接 |
| `OR` | 官方 sample 未确认 → Review | `OR` | Surge 直接 |
| `NOT` | 官方 sample 未确认 → Review | `NOT` | Surge 直接 |
| `SCRIPT` Rule | QX filter sample 未确认 → Review | `SCRIPT` | Surge 直接 |
| `RULE-SET` | 不自动推断 | `RULE-SET` | QX Review |
| `DOMAIN-SET` | 不自动推断 | `DOMAIN-SET` | QX Review |
| `FINAL` | `final` 仅完整规则配置场景 | 不自动输出活动 `FINAL` | plugin/module 默认 Review |

## 20.2 `URL-REGEX` + `REJECT-X` 特殊映射

Loon `[Rule]` 中的 `URL-REGEX` 不能作为 Quantumult X 普通 `filter_local` URL 规则直接输出，因此 WayX 固定降到 QX `rewrite_local`。这与 Loon 旧 `[Rewrite]` 的 `REGEX - reject` 是**不同入口**，不得混淆。

| Loon `[Rule]` | Quantumult X `rewrite_local` | Surge Module |
|---|---|---|
| `URL-REGEX,REGEX,REJECT` | `REGEX url reject-200` | `[Rule] URL-REGEX,REGEX,REJECT` |
| `URL-REGEX,REGEX,REJECT-200` | `REGEX url reject-200` | `[Map Local] REGEX data-type=text data="" status-code=200` |
| `URL-REGEX,REGEX,REJECT-IMG` | `REGEX url reject-img` | `[Rule] URL-REGEX,REGEX,REJECT-TINYGIF` |
| `URL-REGEX,REGEX,REJECT-DICT` | `REGEX url reject-dict` | `[Map Local] REGEX data-type=text data="{}" status-code=200 header="Content-Type:application/json"` |
| `URL-REGEX,REGEX,REJECT-ARRAY` | `REGEX url reject-array` | `[Map Local] REGEX data-type=text data="[]" status-code=200 header="Content-Type:application/json"` |
| `URL-REGEX,REGEX,REJECT-DROP` | `REGEX url reject` | `[Rule] URL-REGEX,REGEX,REJECT-DROP` |

关键约束：
- `URL-REGEX + REJECT` 在 QX 固定为 `reject-200`，这是 WayX 对 Loon Rule 语义的项目映射。
- `REJECT-IMG / REJECT-DICT / REJECT-ARRAY` 不得统一降级成普通 `reject`。
- Surge 能用原生 Rule policy 表达时保留 Rule；需要具体 HTTP body 的 `REJECT-200/DICT/ARRAY` 降到官方 `[Map Local]`，不能伪装成普通 Rule reject。
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
- `FINAL` 不得作为子 Rule
- 合法 sub-rule flag 保留

## 20.5 Policy 对应

| Loon Policy | QX | Surge Module |
|---|---|---|
| `DIRECT` | `direct` | `DIRECT` |
| `REJECT` | `reject` | `REJECT` |
| `PROXY` | `PROXY`（保留为外部 policy 绑定，不映射为内建 `proxy`） | 不假设用户存在 PROXY 组 → Review |
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

Loon 插件 [Rule] 中的 `PROXY` 具有插件策略选择语义：Loon 官方定义其为“由用户选择策略组”的保留策略，而不是普通的固定内建 `proxy`。Quantumult X snippet 没有与 Loon 插件策略选择器同构的参数界面，因此转换到 QX 时必须保留字面 `PROXY` 作为外部 policy 名称；不得静默降为 QX 内建小写 `proxy`。该输出仍属于 Review/用户绑定：用户需要在 QX 中提供名为 `PROXY` 的对应策略，或在导入层显式绑定目标策略。

用户自定义策略组（例如源中的 `PROXY`）仍不得假定存在，必须 Review/绑定提示。

**Rule Type 的支持范围和 policy 的可用范围必须分开判断。**

### 20.5.1 平台限制与 FINAL

- `PROCESS-NAME` 属于 Surge 的平台受限 Rule。只有源插件 metadata 明确约束为 macOS-only 时，WayX 才允许在 Surge Module 中输出活动 `PROCESS-NAME`；否则保留源声明并 Review。
- Loon Plugin 中的 `FINAL` 不自动变成 Surge Module 活动 `FINAL`。Module 被插入用户主配置后的规则顺序与全局兜底语义不能仅由单个插件声明证明，因此默认 Review。
- 上述限制不改变本块已记录、且已经通过实际 Surge App 验证的 Module 内建 policy 支持范围。

## 20.6 自动转换实现

- Production：`converter/src/rule.mjs`
- Orchestration：`.github/scripts/sync-convert.mjs` 的 `[Rule]` 分发，只按 planner 返回的 section 写入 QX rewrite/filter 或 Surge Rule/Map Local。
- Synthetic regression：`converter/tests/checkpoint.mjs`，必须逐项覆盖 `REJECT / REJECT-200 / REJECT-IMG / REJECT-DICT / REJECT-ARRAY / REJECT-DROP`。
- Repository coverage：`converter/tests/surge-rule-coverage.mjs`。
