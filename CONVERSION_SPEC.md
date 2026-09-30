# WayX Conversion Specification

版本：1.11  
作者：chance  
状态：**唯一权威转换规范（Authoritative）**

WayX 当前只执行 **Loon → Quantumult X / Surge** 转换。Egern 不纳入本仓库；需要时另立规范。

本规范采用“分块规范”结构。转换器、测试、canonical 输出、Golden 都必须服从本规范，不能反过来用现有代码定义规范。

## 2026-09-30 规范更新

1. Quantumult X 对官方 sample 未确认的 Rule Type（包括逻辑规则、端口类等）只保留为注释，不生成活动规则，也不使用 Script 兜底。
2. Script fallback 仅属于 Rewrite/Mock 语义：目标原生格式无法严格等价表达时，才考虑专用 helper；Rule 不进入 Script fallback。
3. Source JavaScript 在 Quantumult X 与 Surge 中均不做 runtime compatibility 审查。目标声明直接引用原脚本 URL；仅在需要判定 HTTP Script 的 header/body/echo action 类型时读取源码辅助分类。
4. Loon Plugin 内部策略 `PROXY` 保持“用户选择策略”语义：QX 保留字面 `PROXY`；Surge Module 生成官方 `#!arguments` policy 参数并在 Rule 中使用 `{{{...}}}` 占位符，默认 `DIRECT`，用户可改为已有代理策略/策略组。
5. 通用 Complex Rewrite helper 只处理多 action pipeline（`actions.length >= 2`），脚本负责按源顺序完成整条多 action 语义；单 action 如确需脚本，必须走对应的专用 semantic helper。
6. QX filter/rewrite 支持 `{# note #} rule` 前置 note。源 `[Rule]` / `[Rewrite]` / `[Script]` 只要最终生成一条活动 QX filter/rewrite，都按同一规则处理：只有“单行源注释紧邻一条源声明，且该注释不覆盖后续连续多条声明、最终只生成一条活动 QX 规则”时才转换；分组注释、连续多行注释、被注释掉的源声明和 WayX 转换说明继续使用普通 `#` 注释。
7. Complex Rewrite 只接受**源 Loon 本身使用 `|` 声明的多 action pipeline**；禁止把相邻、同条件或看似可合并的多条独立源声明拼成虚构 pipeline。Complex renderer 既有能力代码继续保留，但 production 只有在“当前 Source Catalog 已实际观察到并登记的 action signature”时才能启用。
8. 2026-09-30 对全部 20 个 Catalog Loon 插件的活动 Rewrite 审计只发现一种源生 complex signature：`response.body.mock | response.header.set`（3 条）。该类型作为通用 signature 登记，不按 Bilibili/作者/URL 特判。
9. 遇到未知语法、未知 action、未登记 complex signature 或其他无法确定转换方式的活动内容时，固定 **fail closed**：目标侧先注释保留源声明，不生成猜测性活动规则；同时输出 `ISSUE REQUIRED` 标记，由自动化提议 GitHub Issue。已知但目标平台缺少等价能力的情况继续使用普通 Review，不滥用 unknown issue。
10. QX `response.header.add` / legacy `response-header-add` 属于已知但当前官方 sample 未证明重复 Header 等价表达的能力缺口。按项目决策直接注释保留源声明，不生成 helper，也不再作为持续 Review 项。
11. `QZXY.snippet` / `QZXY.sgmodule` 明确为 chance 手工维护资产，登记在 `.github/manual-assets.json`；不得加入 Loon Source Catalog，不参与 canonical regeneration，但仍接受 repository validator/audit。
12. CI 必须自动生成 Source → Target reconciliation 与 Review/Issue inventory。Catalog 每个源有效语义项必须落入 converted / explicit-comment / Review / Issue / intentional-drop 之一；报告不对账时 fail closed。
13. QX Source Script 声明的 `argument`、动态 `enable`、`timeout`、`binary-body-mode` / `binary_body_mode` 按 KOP-XIAO `resource-parser.js` 的转换口径处理：QX 只保留 pattern / Script action / 原始 script URL，并由 `requires-body` / `requires_body` 单独决定 header/body 类型；Script argument 不注入，动态 enable 视为默认开启，timeout 与 binary body mode 均忽略。源明确 `enable=false` 仍保持禁用。该规则只适用于 Script declaration；Rewrite 条件/action 中的 `[Argument]` 引用以及 debug/max-size 等其它字段继续按 WayX 自身规范独立判断。
14. CI 必须维护 Catalog-observed Loon Rewrite v2 / Script v2 syntax inventory。Inventory 只锁定“语法形态”而不锁规则数量，包括 phase、condition comparison/capture/logical/group/regex flags、Rewrite action/argument shape/multi-action signature，以及 Script path/argument/option shape 与 option-set。任何当前 Catalog 首次出现的新语法形态必须 fail closed；不得仅因 parser 已经能解析就自动放行。处理顺序固定为：核对当前 Loon 源语义 → 核对 Quantumult X 官方 sample 与 Surge 官方 Manual → 更新 CONVERSION_SPEC/generic implementation/tests → 人工确认后才更新 inventory baseline。
15. Quantumult X / Surge 的目标能力校验只覆盖 **Loon 去广告插件转换实际需要的 Rule 类型、Rewrite 类别与 MITM `hostname`**。不得枚举或跟踪完整 Profile 的 `FINAL`、CA/证书、服务器证书校验跳过、路由兜底等配置能力。QX 以用户提供的官方 `sample.txt` 为人工确认起点，并由 CI 读取 Crossutility 当前官方样例，验证 WayX 实际使用的 Rule/Rewrite/hostname 仍有官方依据；官方新增与去广告转换无关的完整配置能力不触发 WayX capability drift。Surge 同样只依据官方 Manual 核对本转换器实际使用的 Rule/Rewrite/hostname。


## 规范块

| Block | 内容 |
|---|---|
| [00-authority](docs/conversion-spec/00-authority.md) | 权威来源、优先级、通用原则 |
| [05-generic-converter](docs/conversion-spec/05-generic-converter.md) | **通用转换器架构、分型、自动化契约、陌生插件验收** |
| [10-target-format](docs/conversion-spec/10-target-format.md) | QX snippet / Surge sgmodule 固定格式 |
| [20-rule-mapping](docs/conversion-spec/20-rule-mapping.md) | **Rule 类型与 Policy 对应表** |
| [30-rewrite-mapping](docs/conversion-spec/30-rewrite-mapping.md) | Loon 旧 Rewrite / Rewrite v2 Action 映射 |
| [40-regex-condition](docs/conversion-spec/40-regex-condition.md) | Regex、flags、条件 AST、逻辑条件 |
| [50-json-jq-mock](docs/conversion-spec/50-json-jq-mock.md) | JSON/JQ、jq_file、mock/mock_file |
| [60-script-argument](docs/conversion-spec/60-script-argument.md) | Script 声明、action 类型判定、Argument |
| [70-mitm-comments](docs/conversion-spec/70-mitm-comments.md) | MITM、注释、metadata |
| [80-review-validation](docs/conversion-spec/80-review-validation.md) | Review Tier、validator、Golden |
| [90-project-workflow](docs/conversion-spec/90-project-workflow.md) | 项目执行顺序和规范变更流程 |
| [95-implementation-index](docs/conversion-spec/95-implementation-index.md) | **规范块 → production script → tests → 自动化入口总索引** |

## 固定顺序

```text
官方依据
→ CONVERSION_SPEC
→ converter
→ tests
→ canonical output
→ golden
```

禁止：

```text
先改 converter
→ 发现能跑
→ 再补规范
```
