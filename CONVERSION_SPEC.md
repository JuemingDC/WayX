# WayX Conversion Specification

版本：1.25  
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
15. Quantumult X / Surge 的目标能力校验只覆盖 **Loon 去广告插件转换实际需要的 Rule 类型、Rewrite 类别与 MITM `hostname`**。其它目标软件 Profile 能力一律不进入 WayX capability model。QX 以用户提供的官方 `sample.txt` 为人工确认起点，并由 CI 读取 Crossutility 当前官方样例，验证 WayX 实际使用的 Rule/Rewrite/hostname 仍有官方依据；官方新增与本转换范围无关的能力不触发 WayX capability drift。Surge 同样只依据官方 Manual 核对本转换器实际使用的 Rule/Rewrite/hostname。
16. Surge capability registry 必须由官方 Manual 证据约束，并与 production validator 共用同一组常量。CI 只验证 WayX 当前会生成的 Rule Type、URL/Header/Body Rewrite、Map Local、HTTP `http-request/http-response` Script 与 MITM `hostname`；不得因为 Surge 其它 Profile/Module 能力存在而扩大本转换器。官方入口固定先查 `https://nssurge.com/llms.txt`，规范性语义以 Manual 为准，并在涉及近期变化时核对 release notes。
17. CI 必须维护 Catalog-observed Loon `[Rule]` syntax inventory，但该 inventory **只做上游新语法报警，不得成为 production 支持白名单**。只锁会改变转换语义的形态：top-level / nested Rule Type、Policy、Rule 参数名与 type+parameter shape、logical operator、operator placement、字段形态与逻辑嵌套层级；不锁规则数量、域名/IP/regex 值、AND/OR 子项数量。首次出现的新形态必须 fail closed，并按 Loon 源语义 → QX 官方 sample / Surge 官方 Manual → 通用 converter/spec/tests 的顺序审查。MITM 不纳入该 inventory。
18. Loon `[Rule]` production 转换必须采用 **source parser → target-neutral Rule AST → QX planner / Surge planner**。Parser 只负责 CSV/引号/逻辑子规则/Policy/参数结构，不得知道 QX/Surge 映射，也不得因目标平台不接受某个 Rule Type/逻辑组合而拒绝构建可结构化 AST；target planner 负责目标能力与 logical cardinality 校验，不得重新拆源字符串或按插件身份分支。AST 必须保留原始 source declaration、Rule Type、原始/解引号 value、Policy、参数及递归 logical children。QX planner 仅使用用户提供的官方 sample 已确认能力；Surge planner 按 `nssurge.com/llms.txt` → 官方 Manual。重构不得改变现有 canonical 语义输出。
19. Loon `[Rewrite]` production 必须建立 **Legacy parser / Rewrite v2 parser → target-neutral Rewrite Semantic IR → QX / Surge planning** 的统一交接层。两套源 parser 必须保留，禁止为统一代码而把 Legacy Rewrite 强行改写成 Rewrite v2 源语法。IR 至少记录 source syntax、原声明、phase、condition、normalized semantic operation、pipeline 顺序及必要的 source-specific semantics（例如 Legacy 302/307 的完整 Location 与 Rewrite v2 redirect 的 matched-range template 必须区分）。Production 的 Rewrite 路由判断必须消费 IR，不得在 orchestration 中继续为同一 action 名称维护第二套分类正则。IR 本身不得 import QX/Surge capability registry。QX 仍只按用户上传官方 sample；Surge 仍按 `nssurge.com/llms.txt` → Manual，并保留官方 URL/Header/Body Rewrite、Map Local 与 HTTP Script 的行为差异。
20. Rewrite 目标决策必须集中到 **`rewrite-qx.mjs::planQxRewrite()` / `rewrite-surge.mjs::planSurgeRewrite()`**。`conversion-pipeline.mjs` 只负责 source parse 后的 Semantic IR 构建、调用 target planner 与结果落段，不得直接 import QX/Surge Rewrite renderer、complex registry 或自行维护 target fallback 顺序。两个 target planner 固定执行 `native → dedicated helper → observed source-authored complex helper → comment Review/Issue`，并且只消费 Rewrite Semantic IR / 其保留的 source AST payload。Planner 模块 import 本身不得向全局 complex registry 注入 handler；handler 只能在 planner 首次实际执行时惰性注册且同进程只注册一次，避免测试/调用方因 import 顺序受到副作用。Legacy source-specific 低层 renderer 可以继续存在，但必须通过 target planner 入口调用；不得绕过 planner。旧 conservative fallback 不得调用不存在或未注册的函数；若没有已证明等价路径，必须显式返回 Review/Issue。
21. Loon `[Script]` production 必须采用 **Legacy Script parser / Script v2 parser → target-neutral Script IR → `script-qx.mjs::planQxScript()` / `script-surge.mjs::planSurgeScript()`**。Script IR 至少保留 source syntax、原声明、HTTP phase、URL condition/pattern、原始 Source Script URL、argument、enable/requires-body/binary-body-mode/timeout/max-size/debug/tag 及 v2 AST/source-specific payload，但不得包含 QX action、Surge `type=` 或 target capability registry。`conversion-pipeline.mjs` 只负责构建 IR、消费已物化的原脚本文本/Argument table 等上下文、调用 target planner 和渲染注释；不得再自行决定 QX `script-*-header/body/echo`、Surge `type=http-*` 参数或 Legacy Script option 取舍。QX planner 继续严格使用用户提供的 Crossutility 官方 sample 所确认 Script rewrite actions；Surge planner 继续按 `nssurge.com/llms.txt` → 官方 Manual 使用 `http-request/http-response`、`pattern`、`requires-body`、`max-size`、`binary-body-mode`、`timeout`、`argument` 等已确认参数。该重构不得修改 Source JavaScript、不得改变原始 Script URL、不得扩大当前 Script scope，并要求 canonical 输出保持不变。
22. Loon source section / comment / header metadata 必须与目标渲染分层。`source-section.mjs` 统一负责活动声明与前置注释分组、空行压缩、源注释文本提取以及当前去广告 converter 支持的 source section scope；`source-metadata.mjs` 只把源 header 解析为 target-neutral metadata IR；QX `{# note #}` 绑定规则只允许存在于 `qx-comment.mjs`。`conversion-pipeline.mjs` 不得维护第二份 `sectionItems/cleanComments/sourceCommentText` 或 supported-section 白名单，也不得自行实现 QX inline-note 判定；`sync-convert.mjs` 不得参与 source comment/section semantic orchestration。Surge 保留普通源注释，不得复用 QX note 语义。未知活动 source section 必须继续逐声明 fail closed 为 `ISSUE REQUIRED`。本轮不修改 MITM 转换语义、不扩大支持 section、不得改变 metadata/canonical 输出。
23. 目标 section routing 与最终文件拼装必须集中到 **`qx-output.mjs` / `surge-output.mjs`**。QX builder 固定管理 `notes/filter/rewrite/mitm` state，始终按官方 sample/项目约定渲染注释标题 `# [filter_local]`、`# [rewrite_local]`、`# [mitm]`，并负责 target header、空行压缩与最终换行；Surge builder 固定管理 `notes/rule/url/header/body/map/script/mitm` state，只对非空目标 section 按官方 section 名与固定顺序渲染 `[Rule] / [URL Rewrite] / [Header Rewrite] / [Body Rewrite] / [Map Local] / [Script] / [MITM]`，并负责 `needsCore20` 计算、Module header 与最终换行。`conversion-pipeline.mjs` 只允许通过 builder 的 state/destination API 写入 planner 结果，不得再次维护 section-name mapping、section title 顺序、`compact()` 或最终 `join()`；`sync-convert.mjs` 不得参与 target section routing。Builder 只负责结构与渲染，不得重新解释 Rule/Rewrite/Script/MITM 语义。纯架构迁移要求 canonical 输出为 0 diff。
24. Loon plugin 整体解析与纯转换调度必须从 GitHub/I/O orchestration 中分离。`plugin-parser.mjs` 是唯一整体 section parser，负责 BOM/newline normalization、header 与 section map 构建；`conversion-pipeline.mjs::convertPlugin()` 是唯一纯转换入口，负责 unknown-section fail-closed、Argument analysis、Rule/Rewrite/Script/MITM 调度、planner context 构建与 QX/Surge output builder 调用。`.github/scripts/sync-convert.mjs` 不得继续定义 `parseLoon()`、`convert()`、Rewrite/Script section dispatch 或 planner 调用链；它只负责原作者 plugin source 获取、调用统一 conversion-context materializer、调用 `convertPlugin()`、validator、canonical 文件写入与自动化提交。`conversion-pipeline.mjs` 不得 import `fs/path`、网络 fetch、Source Catalog 或 GitHub/runtime I/O；外部 JQ/mock/Source Script 必须由调用方物化后通过 context 注入。`regenerate-canonical.mjs` 必须直接调用同一个 `materializeConversionContext()` / `conversion-pipeline.mjs`，由 shared context 统一调用 `plugin-parser.mjs`，不得通过 `sync-convert.mjs` 取得转换核心。纯架构迁移要求 canonical/helper 0 diff。
25. 外部转换输入物化必须集中到 **`dependency-materializer.mjs`、`source-script-materializer.mjs` 与 `conversion-context.mjs`**。`dependency-materializer.mjs` 独占 Rewrite v2 `jq_file/mock_file` 的发现、原始 URL 解析、文本/bytes 获取、Base64 校验与 JQ minify，并以 source declaration 为 key 返回 `jqFiles/mockFiles`；`source-script-materializer.mjs` 独占 Legacy/Script v2 Source Script URL 发现、相对 URL 解析与可选源码读取，始终把 QX/Surge URL 保持为解析后的原作者 URL，不做 runtime compatibility gate、不镜像、不改写。`conversion-context.mjs::materializeConversionContext()` 固定组合 plugin parser + 两类 materializer，返回 `{parsed, scriptMap, mockFiles, jqFiles}`，是 `sync-convert.mjs` 与 `regenerate-canonical.mjs` 唯一允许使用的外部转换上下文入口。`sync-convert.mjs` 不得再 import Rewrite/Script parser、dependency spec、JQ minifier、`groupSourceSectionItems()` 或 `fetchOriginalBytes()` 来自行发现/下载依赖；canonical runner 也不得借道 `sync-convert.mjs` 获取 materializer。Materializer 只能使用 `source-fetch.mjs` 的原作者直连 fetch/URL resolver，不得加入 mirror/cache fallback。纯架构迁移要求 canonical/helper 0 diff。
26. `materializeConversionContext()` 返回的 `parsed` 必须作为同一次转换的权威 whole-plugin parse result 继续传入 `convertPlugin()`；`sync-convert.mjs` 与 `regenerate-canonical.mjs` 禁止在 materialization 后让 pipeline 对同一 source 再做第二次整体解析。`convertPlugin()` 为独立测试/调用方保留“未提供 `parsed` 时自行调用 `parseLoonPlugin(source)`”的纯函数 fallback，但 production/canonical 路径必须显式复用 context 中的 `parsed`。该收口只消除重复解析，不改变 Rule/Rewrite/Script/MITM 语义、目标格式、canonical 或 generated helper。
27. Quantumult X 成品校验必须由 **`converter/src/qx-snippet-validator.mjs`** 统一负责。该 validator 直接消费 `qx-official-capabilities.mjs` 的 WayX ad-block capability registry，校验活动 QX filter/rewrite/MITM 行、注释 section 标题、禁止活动 `#!` metadata、被丢弃 regex flag 的恢复、`jq-path=` 泄漏及未转换 token。`.github/scripts/sync-convert.mjs` 只能 import/call `validateQX()`，不得重新定义 `validateQX()`、`validateQxExecutableLine()`、QX capability whitelist 或目标语法分类；canonical runner、repository audit、Golden/genericity tests 也必须直接 import converter-owned validator，不得借道 sync orchestration。此迁移不得增加或删除任何 QX 可执行语法，官方依据仍以用户上传 sample + Crossutility 当前官方 sample/capability gate 为准，canonical/helper 必须 0 diff。
28. Source/Catalog managed artifact 的**文件系统职责**必须集中到 **`converter/src/managed-artifacts.mjs`**：仅负责文本 newline/BOM normalization、Source 文件 change detection/write、转换时间戳提取/生成、QX/Surge managed target snapshot、WayX generated helper diff/write 与 target conditional write。该模块不得 import Rule/Rewrite/Script/MITM planner、conversion pipeline、validator、Source Catalog 或网络 fetch；不得决定 target 语义、Review/Issue 或 converter fallback。`sync-convert.mjs` 仍固定执行“原作者 fetch → source normalize → source 合法性检查 → managed source compare/write → materialize context → convert → generated helper write → target validate → target write”，不得因 I/O 抽离改变调用顺序；其中 online sync 的旧时间戳只从既有 QX target 读取，converter 内容变化时的刷新条件保持原逻辑。`regenerate-canonical.mjs` 仍固定执行“读取 checked-in source → snapshot → materialize/convert/validate → helper/target diff → check 或统一新时间戳重生成 → write”，existing stamp 继续按 QX→Surge 顺序查找。纯 I/O 收口不得改变任何 converter 输入、target 内容、helper 内容、timestamp 刷新条件或 fail-closed 行为，并要求 canonical/helper 0 diff。
29. Catalog entry 执行失败的**诊断格式与失败汇总**必须集中到 **`converter/src/workflow-diagnostics.mjs`**。该模块只负责把捕获到的 entry/error 记录为稳定的 GitHub Actions `::error title=...::...` annotation、保存完整 failure detail，并按调用方指定 summary label 输出汇总；不得 import Source Catalog、fetch、materializer、conversion pipeline、target planner、validator、managed artifact I/O 或 target capability registry，也不得决定 conversion 成败以外的语义。`sync-convert.mjs` 与 `regenerate-canonical.mjs` 仍各自拥有 entry loop、转换顺序、changed/stale 判断和最终 exit-code policy，只把 catch 中重复的 error annotation/failure-list/summary rendering 委托给 diagnostics。Online sync 的 summary 文本继续为 `Failures:`，canonical runner 继续为 `Canonical regeneration failures:`；单条 annotation 继续只把 message 中的换行编码为 `%0A`，failure detail 继续优先 stack，且 sync fallback 为 message、canonical fallback 为原 error。此收口不得改变任何 converter 输入/输出、Review/Issue、canonical/helper 内容、target validation 顺序或 stale-check 行为，并要求 canonical/helper 0 diff。


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
