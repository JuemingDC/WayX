# Block 80 — Review / Validation / Golden

## 80.0 Review 与 Unknown Issue 分流

WayX 对不可直接活动转换的内容分两类：

- **REVIEW REQUIRED**：源语义已知，但目标平台缺少已证明等价能力，或需要人工确认已知能力边界。
- **ISSUE REQUIRED**：源语法/action/section 未登记，或出现未登记的 source-authored complex signature，当前 converter 连“该如何正确转换”都不能证明。

`ISSUE REQUIRED` 固定要求：
1. 目标文件中只输出注释，必须保留完整 `Source declaration`；
2. 不生成猜测性 helper、Rule、Rewrite 或 Script；
3. 自动化扫描 marker，按稳定 fingerprint 创建或复用 GitHub Issue；
4. Issue 未形成规范与实现依据前，该项不得进入 Safe Tier；
5. 修复顺序仍是“规范 → generic implementation → synthetic test → real-source regression”。

Issue marker 固定格式：

```text
# [WayX] ISSUE REQUIRED [<code>]: <reason>
# Source declaration: <original source>
```

已知 QX/Surge 能力缺口不得为了“多开议题”改标 Unknown；Issue 只用于未登记/未知转换。

## 80.1 Review 条件

所有 Rewrite/Mock 先执行“目标原生 → 专用 semantic helper →（仅 source-authored 且已登记的多 action）complex helper → 注释 Review/Issue”。只有对应 helper 仍无法保持时才进入下列 Review 条件。Rule 不走 Script fallback；QX 不支持的 Rule Type 直接注释保留：

出现以下任一项必须 Review：
- 目标官方资料与已验证脚本接口都没有可保持语义的路径
- 必须删除源条件才能转换
- 必须扩大 regex/domain
- 必须修改 Source JavaScript
- typed `$argument` 需要 wrapper
- dynamic enable 无目标声明能力
- pipeline 无法保持顺序
- binary request body 无已验证路径
- Surge Module 需要用户 policy group
- QX 需要官方 sample 未出现的 filter/action
- JQ 依赖无法物化
- mock_file 依赖缺失

格式：
```text
# [WayX] REVIEW REQUIRED:
# Source declaration: ...
# Reason: ...
```

原规则不能静默删除，但以下项目级丢弃项除外：
- Loon regex literal 的 `i/m/s` flags；
- 非官方 legacy `json.jq("jq-path=...")` alias。

Loon regex literal 的 `i/m/s` 是明确的转换丢弃项，不因 flags 存在进入 Review；按 Block 40 丢弃 flags 后继续语义映射，regex body 不做全局格式化。只有目标官方语法明确要求的局部适配才允许进入对应 target planner。

Loon `[Argument]` **声明区块本身不构成 Review 条件**。QX 忽略参数 UI，只做依赖分析；Surge 按 Block 60 转换为 `#!arguments` / `{{{name}}}`，必要时使用带 `argument=` 的 helper。只有 helper 也无法保持时才进入 Review；所有 `# [WayX] REVIEW REQUIRED` 及 SCRIPT/REWRITE/ARGUMENT 专用 marker 都必须被 Gate 捕获。

## 80.2 Source 对账

CI 的对账实现由 `converter/tools/conversion-reports.mjs` 自动生成 JSON + Markdown。Catalog 中每个非 `[Argument]` 活动源声明必须在每个目标平台归入以下且仅以下一类：`converted`、`unsupported/commented`、`review`、`issue`、`disabled`、`intentionalDrop`。

报告同时记录目标活动行、WayX generated helper 引用与 Source Script 引用。出现目标 `Source declaration` 无法匹配原源声明，或任一 Catalog 插件无法完成上述对账时，CI 必须失败。

Review inventory 由同一工具自动生成，按 QX/Surge、文件、reason 统计 Review 与 Issue。基线只用于新增 Review warning，不作为转换规范本身。

必须满足：
```text
Target 已转换语义项
+ 明确注释保留的不支持语义项
+ 明确 Review 语义项
+ 明确 ISSUE REQUIRED 语义项
= Source 有效语义项
```

不允许静默丢行。

Source parser 遇到当前 grammar 未登记、但包含活动内容的 section 时，必须把该 section 的活动声明逐项保留为 `ISSUE REQUIRED`；不能因为 orchestration 没有对应分支就忽略整个 section。Script parse failure、未知 MITM option、未知 Rewrite action、未登记 complex signature 同理必须先注释并进入 Unknown Issue marker。只有本规范明确列出的项目级丢弃项可以不生成目标语义。

## 80.3 Quantumult X Validator

必须检查：
- 每一条活动行都必须能分类为 Crossutility 官方 sample 已确认的 QX filter、rewrite action 或 MITM key；未知活动行直接失败；
- filter type 只允许当前转换规范已经确认的 QX 类型；
- rewrite action 只允许官方 sample 已确认的 reject / redirect / request-header / body / jsonjq / Script action；
- Script action 名称只允许 `script-request-header / script-request-body / script-response-header / script-response-body / script-echo-response / script-analyze-echo-response`；
- 允许 filter/rewrite 活动行使用当前 QX beta 已确认的 `{# note #} ` 前缀；validator 必须先剥离 note 再校验真实规则语法。note 为空、闭合不完整，或用于 MITM/hostname 等非 filter/rewrite 行时直接失败；
- section 标题全部注释化；
- snippet 头部不存在活动 `#!...` 来源 metadata；
- 无 `[hH][tT][tT][pP]` 自动 case-fold；
- 无未经官方确认的 `(?i)` / `(?m)` / `(?s)` 恢复 flags；
- QX IP filter 不含 `no-resolve`；
- 无 Loon/Surge 私有 action；
- 无活动 `jq-path=`，且 legacy `jq-path=` 不得出现在目标语义项中；
- Script action 必须属于官方 sample 已确认 action；可依据源 declaration 和必要时读取到的 body/echo 行为选择 action。不得再以 Source Script runtime compatibility 扫描结果作为启用条件。

## 80.4 Surge Validator

必须检查：
- sgmodule metadata 合法
- section 合法
- Rule type 属于当前官方 Rule Type
- Logical Rule 递归合法
- Module `[Rule]` policy 允许 `DIRECT / REJECT / REJECT-TINYGIF`，以及已由 `#!arguments` 声明的完整 `{{{name}}}` policy 占位符；占位符必须引用已声明参数。其它未绑定 policy 不得直接作为活动 Module Rule
- 外部 policy 不作为活动 Module Rule
- URL/Header/Body/Map Local/Script 参数合法
- WayX 去广告转换输出中的活动 Script declaration 必须显式声明 type，且 Adblock-scope validator 不接受调度/事件/generic Script 类型；仓库中与本转换器无关的人工 Surge Module 仍按 Surge 自身合法类型校验，不受此范围限制
- 自动转换生成的 MITM hostname 使用 `%APPEND%`；validator 同时接受官方合法的 hostname override
- 不存在来源插件专属活动 metadata
- 不存在来源平台 Rewrite v2 行

## 80.5 Golden

Golden 只锁**已经人工审过的结果**，不能定义规范。

若 Golden 与本规范冲突：
**修改 Golden / output，不修改规范去迁就旧 Golden。**


## 80.6 Genericity Validator

CI 必须额外检查：
- production converter 不得使用已知插件 id/name/author/source URL 决定语义映射；
- Source Descriptor 只影响下载、metadata、目标路径；
- synthetic unknown-plugin fixture 必须通过；
- identity-invariance 测试必须通过；
- 新增一个仅改变插件身份字段的 fixture，不得改变有效 Rule/Rewrite/Script/MITM 输出。

真实插件 Golden 只能做 regression，不能替代 genericity 测试。

## 80.7 自动转换实现

- QX validator：`.github/scripts/sync-convert.mjs::validateQX`
- Surge validator：`converter/src/surge-module.mjs::validateSurgeModule`
- Genericity audit：`converter/tests/genericity-audit.mjs`
- Identity invariance：`converter/tests/generic-identity.mjs`
- Repository-wide audit：`converter/tools/audit-repository.mjs`
- Generated helper reference existence：`converter/tests/generated-helper-refs.mjs`
- Original Source Script URL preservation：`converter/tests/source-script-url-preservation.mjs`
- End-to-end Golden：`converter/tests/end-to-end-golden.mjs` + `converter/fixtures/end-to-end-golden.json`


## 80.8 Generated helper runtime execution

Complex generated JavaScript must be executed in CI against synthetic request/response fixtures, not validated only by matching generated source text. Runtime fixtures must cover at least: request and response phases; method/status/header/URL conditions including grouped AND/OR logic; condition match/no-match; ordered Header/Body/JSON mutation; case-insensitive header lookup/mutation; named and optional captures; raw-string literal behavior; typed JSON replacement; JSON add no-overwrite and nested-path creation; invalid-JSON action failure with later actions continuing; and Surge duplicate-header preservation under full-header mode. Text assertions remain useful for target declaration shape but do not substitute for runtime execution.

实现固定为：
- `converter/tests/generated-helper-runtime.mjs` 使用 Node `vm` 直接执行 renderer 产出的 JavaScript，并注入目标运行时最小 `$request` / `$response` / `$argument` / `$done` fixture；
- 测试必须断言 `$done()` 恰好调用一次，并检查实际返回对象/bytes，而不是只比较生成源码字符串；
- `converter-check.yml` 将该 runtime fixture 作为独立 CI 步骤执行；
- 当前 fixture 还额外覆盖 Catalog 已观察的 QX `response.body.mock | response.header.set` complex signature，包括 text body 与 Base64 `bodyBytes` 路径。

## 80.9 Catalog-observed v2 syntax inventory

CI 必须扫描 Source Catalog 中当前实际存在的 Loon Rewrite v2 / Script v2，并与 `converter/fixtures/catalog-syntax-inventory.json` 的人工确认基线比较。

Inventory 只记录语法形态，不记录声明数量，因此同一语法的规则增删不会单独触发失败。至少必须覆盖：
- Rewrite v2：phase、condition comparison、capture、logical operator、group、regex flags、action name、action argument shape、source-authored multi-action signature；
- Script v2：phase、condition shape、regex flags、script path type、argument kind、option name/value type 与 option-set；
- `[Rewrite]` / `[Script]` 中以 `request` / `response` 开头但已不符合当前 v2 grammar 的活动声明必须立即失败。

出现 inventory 差异时不得机械更新 fixture。必须先确认这是上游真实新增/删除的语法形态，并按“Loon 源语义 → QX 官方 sample / Surge 官方 Manual → CONVERSION_SPEC → generic parser/planner → tests → inventory baseline”的顺序处理。Parser 已能解析不等于该新形态已经获得 production 放行资格。

实现：
- baseline：`converter/fixtures/catalog-syntax-inventory.json`
- validator：`converter/tests/catalog-syntax-inventory.mjs`
- CI：`.github/workflows/converter-check.yml`

## 80.10 Quantumult X / Surge scoped capability evidence gate

WayX capability gate 只验证 **Loon 去广告插件转换实际会用到的能力**。QX 与 Surge 统一只关注：

- Rule 类型；
- Rewrite 类别（包括目标原生 Rewrite / Map Local / HTTP Script 等 WayX 实际生成路径）；
- MITM `hostname`。

其余目标软件 Profile 能力不进入 capability model，也不参与 drift 判断。

### Quantumult X

- 用户提供的官方 `sample.txt` 作为人工确认基线；
- CI 读取 Crossutility 当前 `sample.conf`、`filter.snippet`、`sample-import-rewrite.snippet`，只检查 WayX registry 中的 Rule/Rewrite/hostname 是否仍有官方依据；
- 官方新增与 Loon 去广告转换无关的能力不触发 drift；
- registry 只维护 WayX 实际使用的 Rule/Rewrite/hostname，不维护转换范围之外的能力分类。

实现：
- registry：`converter/src/qx-official-capabilities.mjs`
- reviewed baseline：`converter/fixtures/qx-official-capabilities.json`
- evidence test：`converter/tests/qx-official-capabilities.mjs`
- target validator：`.github/scripts/sync-convert.mjs::validateQX`

### Surge

Surge 的能力依据只从官方文档链核对 WayX 实际生成的 Rule / URL Rewrite / Header Rewrite / Body Rewrite / Map Local / HTTP Script 与 MITM `hostname`：

1. 先读取 `https://nssurge.com/llms.txt` 确认文档优先级；
2. 配置语法与语义以 `https://manual.nssurge.com/` 为权威；
3. 涉及近期版本变化时核对官方 release notes；
4. CI 只验证 WayX registry 中已使用能力仍有官方 Manual 证据，不枚举 Surge 其它 Profile/Module 功能。

Surge production validator 与 official capability gate 必须共用同一 registry，禁止在 `rule.mjs` / `surge-module.mjs` 中另维护一份重复白名单。

实现：
- registry：`converter/src/surge-official-capabilities.mjs`
- reviewed baseline：`converter/fixtures/surge-official-capabilities.json`
- live evidence test：`converter/tests/surge-official-capabilities.mjs`
- target validator：`converter/src/surge-module.mjs::validateSurgeModule`
- Rule planner：`converter/src/rule.mjs`

## 80.11 Catalog-observed Rule inventory gate

`converter/tests/catalog-rule-inventory.mjs` 必须作为 Converter Check checkpoint 执行，并与 `converter/fixtures/catalog-rule-inventory.json` 比较。

这个 gate 是 **source-change detector**，不是目标平台白名单：当前 Catalog 没出现某个 Rule Type，不代表通用 converter 永久不支持它；反之，parser 能解析某个新类型，也不代表无需审查即可自动更新 baseline。

首次出现新的 Rule Type / Policy / parameter / logical placement / nesting shape 时 CI 失败。处理顺序固定为：
1. 确认 Loon 源语义；
2. QX：只使用用户提供的官方 sample 所支持格式判断；
3. Surge：先查 `nssurge.com/llms.txt`，再按官方 Manual 判断；
4. 更新通用 spec / parser / planner / synthetic regression；
5. 确认转换语义后才更新 observed baseline。

MITM 不属于该 inventory。
## 80.12 Rewrite Semantic IR architecture gate

`converter/tests/rewrite-ir.mjs` 必须作为 Converter Check checkpoint 执行。它验证 Legacy Rewrite 与 Rewrite v2 在进入目标规划前都能形成 target-neutral Semantic IR，并检查以下契约：

- IR 不 import Quantumult X / Surge capability registry；
- Legacy 与 v2 的相同语义类别可归入统一 operation kind；
- source-specific semantics 必须保留，例如 Legacy 302/307 的 `absolute-location` 与 Rewrite v2 redirect 的 `matched-range-template` 不得合并；
- source-authored multi-action 顺序保持；
- production `rewriteV2Action()` 的路由判断必须通过 `rewriteV2AstToSemanticIr()` / `singleRewriteOperation()`，不得恢复第二套 action-name regex 分类器；
- `planLegacyRewrite()` 必须先调用 `legacyRewriteToSemanticIr()` 再进入目标映射。

这个 gate 只约束架构与语义保真，不扩大任何 QX/Surge 能力。目标输出仍分别受 QX 官方 sample 和 Surge 官方 Manual/capability gate 约束。
## 80.13 Rewrite target-planner architecture gate

CI 必须验证 Rewrite target planning 已从 orchestration 中分离：

- `sync-convert.mjs` 只能调用 `planQxRewrite()` / `planSurgeRewrite()`；
- `sync-convert.mjs` 不得直接 import `qx-semantic-script.mjs`、`surge-mock.mjs`、`rewrite-v2-semantic.mjs` 的 target mapper 或 `complex-rewrite-registry.mjs`；
- QX/Surge complex handler 注册归各自 target planner 所有；
- planner import 必须无 complex-registry 副作用；handler 只允许在首次 `planQxRewrite()` / `planSurgeRewrite()` 时幂等注册；
- `rewrite-qx.mjs` 只按用户上传 QX 官方 sample 已确认 action 选择 native 路径；
- `rewrite-surge.mjs` 只按 Surge 官方 Manual 已确认 URL/Header/Body Rewrite、Map Local 与 HTTP Script 选择目标路径；
- planner 无映射时必须返回明确 Review/Issue，禁止调用未定义 fallback；
- canonical 输出在纯架构迁移中必须保持不变。

实现：
- QX planner：`converter/src/rewrite-qx.mjs`
- Surge planner：`converter/src/rewrite-surge.mjs`
- architecture contract：`converter/tests/rewrite-target-planners.mjs`
## 80.14 Script IR / target-planner architecture gate

CI 必须验证 Script target planning 已从 orchestration 中分离：

- Legacy Script 与 Script v2 都必须先构建 `script-ir.mjs` 的 target-neutral IR；
- `sync-convert.mjs` 只允许调用 `planQxScript()` / `planSurgeScript()`，不得直接调用 `selectQxScriptAction()`、`qxScriptV2Plan()`、`surgeScriptV2Plan()`；
- `sync-convert.mjs` 不得自行解析 `requires-body`、`binary-body-mode`、`timeout`、`max-size`、`argument`、`enable` 等 Legacy Script target semantics；
- `script-ir.mjs` 不得 import QX/Surge capability registry，也不得包含 target action/section；
- QX planner 必须只生成官方 sample 已确认的 Script rewrite action；
- Surge planner 必须只生成官方 Manual 已确认的 `http-request/http-response` Script declaration 参数；
- Source Script URL preservation、QX KOP-XIAO-compatible option policy、Surge Argument/enable mapping保持现状；
- 纯架构迁移必须保持 canonical 输出不变。

实现：
- Legacy parser：`converter/src/script-legacy.mjs`
- IR：`converter/src/script-ir.mjs`
- QX planner：`converter/src/script-qx.mjs`
- Surge planner：`converter/src/script-surge.mjs`
- architecture contract：`converter/tests/script-ir-target-planners.mjs`
## 80.15 Source section / comment / metadata architecture gate

CI 必须验证 source semantic orchestration 由 `conversion-pipeline.mjs` 消费共享 parser/comment helpers，且 `sync-convert.mjs` 不参与 comment/metadata semantic parsing：

- source item/comment grouping 固定由 `source-section.mjs` 提供；
- supported source section scope 固定由同一模块导出，orchestration 不得本地维护第二份 Set；
- header `#!key=value` parsing 固定由 `source-metadata.mjs` 提供；
- QX `{# note #}` 只由 `qx-comment.mjs` 负责；
- QX note 必须继续满足“一条原始单行注释 + 一条源声明 + 一条活动目标 filter/rewrite”的现有约束；
- Surge 普通 source comment 不经过 QX note 逻辑；
- unknown active source section 仍逐声明产生 `ISSUE REQUIRED [unknown-source-section]`；
- 本架构迁移不得修改 MITM 语义、目标 metadata 内容或 canonical 输出。

实现：
- source section/comment：`converter/src/source-section.mjs`
- source metadata IR：`converter/src/source-metadata.mjs`
- QX inline note：`converter/src/qx-comment.mjs`
- target metadata renderer：`converter/src/metadata.mjs`
- contract：`converter/tests/source-section-comments.mjs`
## 80.16 Target output-builder architecture gate

CI 必须验证目标 section routing/final render 已从 orchestration 中分离：

- `conversion-pipeline.mjs` 必须使用 `createQxOutputState()` / `createSurgeOutputState()`；
- QX target destination 必须通过 `qxOutputDestination()`，Surge target destination 必须通过 `surgeOutputDestination()`；
- `conversion-pipeline.mjs` 不得再维护 QX/Surge section-key→array object literal、Surge section title mapping、QX 固定 section 标题、局部 `compact()` 或最终 target `.join('\n')`；`sync-convert.mjs` 不得参与 target section routing；
- QX builder 必须始终输出三个注释 section 标题并保持 `notes → filter → rewrite → mitm` 顺序；
- Surge builder 必须只输出非空 section，固定顺序为 Rule → URL Rewrite → Header Rewrite → Body Rewrite → Map Local → Script → MITM；
- Surge `needsCore20` 必须由 builder 根据 Body Rewrite / Map Local 活动行计算；
- builders 不得 import Rule/Rewrite/Script planners，不得解释 source semantics；
- 纯架构迁移要求 Catalog canonical 与 generated helpers 0 diff。

实现：
- shared line compaction：`converter/src/output-lines.mjs`
- QX builder：`converter/src/qx-output.mjs`
- Surge builder：`converter/src/surge-output.mjs`
- contract：`converter/tests/target-output-builders.mjs`
## 80.17 Plugin parser / conversion-pipeline architecture gate

CI 必须验证纯转换核心已经脱离 GitHub/I/O orchestration：

- `plugin-parser.mjs` 是整体 Loon section parser；`sync-convert.mjs` 不得重新定义 `parseLoon()`；
- `conversion-pipeline.mjs` 导出唯一 production `convertPlugin()`；`sync-convert.mjs` 不得重新定义 `convert()` 或直接 import Rule/Rewrite/Script/MITM planner；
- `conversion-pipeline.mjs` 不得 import Node `fs/path`、Source Catalog、source-fetch 或任何网络/GitHub 工具；
- pipeline 必须消费已物化的 `parsed/scriptMap/mockFiles/jqFiles` context，禁止自行 fetch；production/canonical 必须显式传入 materializer 返回的 `parsed`，不得重复整体解析；
- unknown source section、Argument review、disabled Script/Rewrite comments、planner dispatch 与 target output builder 调用均由 pipeline 负责；
- `regenerate-canonical.mjs` 必须直接 import `convertPlugin()`；整体 parser 由 `materializeConversionContext()` 统一调用，canonical runner 不得再单独 parse；
- `sync-convert.mjs` 只保留 plugin fetch、调用 `materializeConversionContext()`、调用 `convertPlugin()`、validate/write orchestration；
- 纯架构迁移要求 Catalog canonical 与 generated helper 0 diff。

实现：
- whole-plugin parser：`converter/src/plugin-parser.mjs`
- pure conversion core：`converter/src/conversion-pipeline.mjs`
- contract：`converter/tests/conversion-pipeline.mjs`
## 80.18 Conversion-context materializer architecture gate

CI 必须验证外部依赖与 Source Script 物化已经从 `sync-convert.mjs` / canonical runner 中集中：

- `dependency-materializer.mjs` 负责 Rewrite v2 jq_file/mock_file discovery、原 URL fetch、Base64/JQ 处理；
- `source-script-materializer.mjs` 负责 Legacy/Script v2 script URL discovery、相对 URL resolver、可选源码读取；
- `conversion-context.mjs::materializeConversionContext()` 必须组合 parser + 两类 materializer，并返回 `parsed/scriptMap/mockFiles/jqFiles`；该 `parsed` 必须被 sync/canonical 原样传入 `convertPlugin()`；
- `sync-convert.mjs` 不得 import `rewrite-v2*`, `dependency.mjs`, `jq.mjs`, `script-v2.mjs`, `source-section.mjs` 或 `fetchOriginalBytes()` 来自行 materialize；
- `regenerate-canonical.mjs` 不得从 `sync-convert.mjs` import materializer/Source Script inspector；
- materializer 必须继续使用 `source-fetch.mjs` 的原作者直连 resolver/fetch，不得新增 mirror/cache fallback；
- Source Script materializer 必须保持 QX/Surge URL 为解析后的原作者 URL，正文失败只记录 `sourceError`；
- pure `conversion-pipeline.mjs` 继续禁止任何 fetch；仅允许在调用方未提供 `parsed` 时使用 `parseLoonPlugin(source)` 作为纯函数 fallback；
- 纯架构迁移要求 canonical/helper 0 diff。

实现：
- dependency materializer：`converter/src/dependency-materializer.mjs`
- Source Script materializer：`converter/src/source-script-materializer.mjs`
- context aggregator：`converter/src/conversion-context.mjs`
- contract：`converter/tests/conversion-context-materializers.mjs`

## 80.19 Quantumult X snippet-validator ownership gate

CI 必须验证 QX 成品校验已经从 GitHub sync orchestration 中分离：

- `converter/src/qx-snippet-validator.mjs` 是唯一 QX snippet validator，实现并导出 `validateQX()`；
- validator 必须直接消费 `qx-official-capabilities.mjs` 的 `QX_WAYX_FILTER_TYPES`、`QX_WAYX_SCRIPT_ACTIONS`、`QX_WAYX_SNIPPET_MITM_KEYS`，不得维护第二份能力白名单；
- validator 继续检查活动 `#!` metadata、活动 `[filter_local]/[rewrite_local]/[mitm]`、filter/rewrite/MITM 活动行、QX note 位置、被丢弃 regex flags 的恢复、HTTP case-fold 伪装、`jq-path=` 泄漏与旧未转换 token；
- `sync-convert.mjs` 只能 import/call `validateQX()`，不得定义 `validateQX()`、`validateQxExecutableLine()` 或直接 import QX capability registry；
- `regenerate-canonical.mjs`、`audit-repository.mjs`、Golden/genericity tests 必须直接 import converter-owned validator，不得从 `sync-convert.mjs` re-export/borrow；
- validator extraction 不新增 QX action/Rule/MITM 能力；官方 sample/capability gate 仍是唯一目标能力依据；
- 纯架构迁移要求 canonical/helper 0 diff。

实现：
- QX validator：`converter/src/qx-snippet-validator.mjs`
- QX capability registry：`converter/src/qx-official-capabilities.mjs`
- behavior regression：`converter/tests/end-to-end-golden.mjs`
- architecture contract：`converter/tests/spec-block-contract.mjs`

## 80.20 Managed artifact I/O ownership gate

CI 必须验证 source/target/helper 文件系统职责已经从 sync/canonical runner 中收口，但转换行为不变：

- `converter/src/managed-artifacts.mjs` 只允许负责 managed text normalization、Source change detection/write、conversion timestamp、target snapshot、generated helper diff/write 与 conditional target write；
- 该模块不得 import `conversion-pipeline.mjs`、Rule/Rewrite/Script/MITM planner、QX/Surge validator、Source Catalog 或 `source-fetch.mjs`，因此不能解释任何转换语义；
- `sync-convert.mjs` 不再直接 import `node:fs/promises`、`node:crypto`、`normalizePluginSource()` 或 `qxTargetPath()/surgeTargetPath()` 来维护 managed artifacts；它必须继续直接从 `entry.source` fetch 原作者 plugin，并在 conversion 前做 Loon source 结构合法性检查；
- online sync 的顺序固定为 fetch → in-memory source normalize → source validity → managed source compare/write → materialize context → convert → generated helper write → QX/Surge validate → conditional target write；无效 upstream source 不得先写入 `Resource/Loon`，且不得把 validator 移到 target write 之后；
- online sync 的 conversion stamp 继续只读取既有 QX target 的 `# Converted:`；source 未变但 converter output 变化时继续刷新时间戳，判断条件保持原样；
- canonical runner 的 existing stamp 继续按 QX target → Surge target 顺序获取；check 模式不得写 target/helper，write 模式在发现 diff 后继续用一个新的共享时间戳重生成 target/helper；
- managed-artifact contract test 必须覆盖 BOM/CRLF/trailing newline、source unchanged/changed、target snapshot、stamp precedence、helper diff/write 与 target conditional write；
- 全 Catalog canonical 与 generated helper 必须 0 diff。

实现：
- managed artifact I/O：`converter/src/managed-artifacts.mjs`
- behavior contract：`converter/tests/managed-artifacts.mjs`
- architecture contract：`converter/tests/spec-block-contract.mjs`

