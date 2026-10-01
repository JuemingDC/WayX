# WayX Project Status / TODO

> 用途：长期记录 WayX 当前实现状态、已知问题、待办优先级与验收标准。  
> 维护原则：本文件描述“当前 main 的真实状态”，不能替代 `CONVERSION_SPEC.md`；规范冲突时以 `CONVERSION_SPEC.md` 为唯一权威。

- 审计日期：2026-10-01
- 审计基线：PR #89 repository cleanup / Converter Check #669
- Source Catalog：20 个 Loon 去广告插件
- Catalog 管理目标：20 个 Quantumult X snippet + 20 个 Surge sgmodule
- Adblock 目录实际目标：21 个 QX + 21 个 Surge（额外包含手工维护的 `QZXY`）
- 最近完整 Converter Check：#669，通过
- 当前实现 PR：#89

---

## 1. 当前项目目标

WayX 当前只维护 **Loon → Quantumult X / Surge** 的去广告转换与相关手工模块。

核心转换原则：

1. 目标平台原生格式能严格等价表达 → 使用原生格式。
2. Rewrite/Mock 原生格式不能严格等价 → 使用对应专用 helper；只有源单条声明真实写出的、已观察登记的 multi-action signature 才使用 complex helper，禁止把相邻规则组合。
3. Rewrite helper 仍无法保持源语义 → 注释原声明并输出明确 Review；Rule 不使用 Script fallback。
4. 不按插件名写特例；实现必须是通用语义能力。
5. 所有新标准必须同步：规范 → converter → validator/gate → tests → Golden/canonical。
6. Source JavaScript 本身不自动修改；QX/Surge 均直接引用原 URL，不做 runtime compatibility gate，仅在必要时读取正文辅助选择 QX HTTP Script action。
7. QX `[Rule]` / `[Rewrite]` / `[Script]` 来源只要最终生成 filter/rewrite，源注释仅在严格一注释一声明时转换为 `{# note #}`；一条注释覆盖多条连续声明时保持普通注释，不能只绑定第一条。

---

## 2. 已完成能力

### 2.1 项目治理与自动化

- `CONVERSION_SPEC.md` + Block 00–95 已建立为唯一规范链。
- Source Catalog 驱动 canonical regeneration。
- 已建立 QX / Surge validator、repository audit、Golden、genericity、helper reference、Source Script URL preservation 等检查。
- 未知 Loon section、Script parse failure、未知 MITM option、未知 Rewrite action 与未登记 complex signature 不再静默丢失：先注释并标记 `ISSUE REQUIRED`，再由自动化创建/复用议题。
- 定时上游维护已切换为 GitHub Actions 全自动闭环：逐插件拉取/转换/验证、自动 Issue、全局审计后直提 main。

### 2.2 Regex

当前标准：

- Loon regex literal 只去掉最外层 `/.../` delimiter。
- `i / m / s` flags 按项目标准直接丢弃。
- regex body **原样保留**。
- 不再全局执行 `\\/ -> /`、case-fold、inline modifier 或其他 canonicalization。
- 目标确有语法差异时，只允许对应 target planner 基于官方格式局部适配。
- QX 官方 sample 已确认 `$1 / $2` capture replacement 能力；不得把“QX 不支持捕获替换”作为限制。

### 2.3 Rewrite / Complex helper

- Complex renderer 的既有 Header/Body/JSON 能力继续保留；production 只准入 source-authored + observed signature。
- 2026-09-30 扫描 20 个 Catalog Loon 插件，当前唯一活动 complex signature 为 `response.body.mock | response.header.set`（3 条），已登记为通用类型。
- 相邻、同 condition 的独立 Rewrite 不再合并；Webpage 的独立 `response.header.add` / `response.header.set` 将分别转换。
- condition named capture、`${name.n}`、action-local `$0...$n` 已分离处理。
- Header 名称大小写不敏感语义已在 helper 中处理。
- QX `request.header.add` 仅在能严格证明等价时使用 `request-header` 原生插入。
- QX `header.set / del / replace` 使用 Header helper；`response.header.add` / legacy `response-header-add` 因重复 Header 表达未验证，按用户决策直接注释保留，不再计入 Review。
- Surge `header.add` 在需要重复字段时使用 `full-header-mode=true`。
- Legacy Rewrite 已接入 native → helper → Review 路径。

### 2.4 Mock / JSON / JQ

- Surge response mock 优先 Map Local；file 可由 Surge Map Local 处理。
- request mock 使用 request-body helper，不用 Map Local 冒充。
- QX request/response mock 使用已验证 Script action/helper。
- Legacy mock JSON 内部双引号截断问题已修复。
- JSON delete / replace 优先原生 JQ；JSON add 在原生无法保持 no-overwrite 语义时使用专用 helper；多 action JSON pipeline 使用 complex helper。
- legacy `jq-path=` 已按项目标准彻底丢弃，不解析、不下载、不生成 Review。

### 2.5 Rule / Script / 其他项目标准

- QX / Surge Source Script 均不做 runtime compatibility scan，直接保留原始 Script URL；QX 仅在 declaration 不足以确定 header/body/echo action 时读取正文辅助分类。
- QX 官方 sample 未确认的 Rule Type（逻辑规则、端口类等）只注释保留，不用 HTTP Rewrite Script 模拟。
- Loon Plugin `PROXY` 保持用户策略绑定：QX 保留字面 `PROXY`；Surge Module 生成 `wayx_proxy_policy` 参数（默认 `DIRECT`）并把 Rule policy 写成 `{{{wayx_proxy_policy}}}`。
- QX snippet 的 filter / rewrite / mitm section 标题保持注释形式。
- QX filter/rewrite 支持前置 `{# note #}`；converter 已按“单行注释 + 单条源声明 + 单条活动目标规则”限制 `[Rule]` / `[Rewrite]` / `[Script]` 来源内联，分组注释不内联。
- Cron / Network Changed / Generic Script 不属于当前去广告 converter 范围。
- Egern 不纳入 WayX 仓库当前目标。

---

## 3. Review 库存

2026-10-01 规范 v1.28 已更新 QX Source Script option 策略：`debug` 与 Legacy `max-size` 改为直接丢弃；不写入 QX declaration、不输出 WayX 注释、不产生 Review/Issue，也不影响 action 选择。目标 Review inventory 为：

- **Quantumult X：0**
- **Surge：0**
- **Unknown Issue：0**

QX Source Script declaration 当前固定策略：argument、动态 enable、timeout、binary body mode 仍按既有忽略策略处理；`debug` 与 Legacy `max-size` 直接丢弃，既不写入 QX declaration，也不生成 WayX 审计注释或 Review/Issue。header/body 只由 `requires-body` / `requires_body` 决定，固定 `enable=false/0` 仍保持禁用。Rewrite 参数与未知语法仍按各自语义独立判断。

`response.header.add` 继续按项目决策明确注释保留，因此不占用 Review inventory。

以下不再计入 Review：
- Source Script runtime compatibility；
- QX logical Rule、`DEST-PORT` 等官方 sample 未确认 Rule Type（明确注释保留）；
- Loon Plugin `PROXY` 在 Surge Module 中通过参数化 policy binding 转为活动 Rule，不再属于 Review/注释库存；
- 无法按当前 Surge ad-block Module Rule 语义等价表达的源 policy 继续注释保留。

当前 Catalog 目标已没有活动 Review marker；后续新语法、新插件或现有上游变化仍可能重新产生 Review/Issue。

## 4. 待办工作

### P0 — 优先处理

#### P0-1：重新生成 canonical 并重建 Review inventory — 已完成

v1.4 已重新生成全部 Catalog 管理的 QX snippet / Surge sgmodule，并完成以下检查：

- Source Script declaration 继续引用原作者 URL；
- Source Script runtime compatibility disabled marker 已移除；
- QX 不支持 Rule 以注释形式对账，未生成 Rule helper；
- Surge 的 Loon `PROXY` 已通过 `#!arguments` policy 参数转换为活动 Rule；其它无法等价绑定的源 policy 继续只注释保留；
- helper 文件引用存在且 action 类型通过 validator/CI；
- Review inventory 目标已调整为 QX 0 / Surge 0 / Issue 0，并由 CI 自动核验。

#### P0-2：QX Script option 保真 — 已完成

Loon Source Script declaration 的 `argument`、dynamic enable、timeout、binary body mode 保持既有 QX 忽略策略；`debug` 与 Legacy `max-size` 已改为直接丢弃。固定/动态 debug 都不输出参数或注释，Legacy max-size 也不输出参数或注释；两者均不产生 Review/Issue，不影响 requires-body 对 action 的选择。固定 enable=false/0 仍禁用。Converter Check #668 全绿，当前 Catalog canonical/helper 0 diff。

#### P0-3：QX `response.header.add` — 已完成（明确注释）

重复 Header 语义仍未由当前 QX 官方 sample 证明可用普通 Header object 等价表达。按用户决策：

- 禁止用 set 冒充 add；
- 不生成 dedicated/complex helper；
- 新版 `response.header.add` 与 legacy `response-header-add` 均保留完整 Source declaration 并注释掉；
- 不再计入持续 Review inventory。

### P1 — 项目结构与可维护性

#### P1-1：QZXY 手工维护边界 — 已完成

- `Adblock/Quantumult X/QZXY.snippet`
- `Adblock/Surge/QZXY.sgmodule`

已登记到 `.github/manual-assets.json`，固定由 chance 手工维护：
- 不进入 `.github/sources/loon.json`；
- 不参与 canonical regeneration；
- 自动转换不得创建、删除或覆盖；
- 仍由 QX / Surge validator 与 repository audit 检查格式。

#### P1-2：Source → Target reconciliation — 已完成

新增 `converter/tools/conversion-reports.mjs`，CI 自动生成 JSON + Markdown reconciliation。20 个 Catalog 插件的每条非 `[Argument]` 活动源声明必须归入 converted / unsupported-commented / Review / Issue / disabled / intentional-drop 之一；出现未匹配 Source declaration 或无法闭合时 CI 失败。

报告同时统计目标活动行、WayX generated helper 引用和 Source Script 引用。

#### P1-3：自动 Review / Issue inventory — 已完成

同一工具自动统计：
- QX / Surge Review 总数；
- Unknown Issue 总数；
- 按文件；
- 按 reason；
- 手工资产与 Catalog 分开标识。

当前目标自动结果：QX 0 / Surge 0 / Issue 0。基线用于 CI 新增 Review warning，不再依赖人工写死的旧库存数字。

### P2 — 长期质量工作

- [x] 已建立 Catalog-observed Legacy Rewrite / Legacy Script syntax inventory：`converter/tests/catalog-legacy-syntax-inventory.mjs` + `converter/fixtures/catalog-legacy-syntax-inventory.json`。当前 Catalog 为 116 条 Legacy Rewrite / 20 条 Legacy Script；无 unknown Legacy Rewrite、无无法解析 Legacy Script。该 gate 使用 production classifier/parser，只锁 action/option 语法形态，不锁具体 URL/pattern/value/数量。Converter Check #665 全绿，canonical/helper 0 diff。
- [x] 已建立 Catalog-observed Rewrite v2 / Script v2 syntax inventory：`converter/tests/catalog-syntax-inventory.mjs` + `converter/fixtures/catalog-syntax-inventory.json`。当前基线为 175 条 Rewrite v2 / 110 条 Script v2；CI 只锁语法形态，不锁同类规则数量。新 action/参数形态/condition/capture/logical/regex flag/Script option/argument/option-set 或 multi-action signature 首次出现时 fail closed，必须先核对官方语义再更新基线；未观察到的 complex signature 仍不得预先放行。
- [x] 已建立 Catalog-observed Rule inventory：只锁 top/nested Rule Type、Policy、Rule parameter、logical operator/placement、字段形态与最大嵌套层级；不锁规则数量、匹配值或 AND/OR 子项数量，MITM 不进入 inventory。该 gate 仅用于发现上游新语法，不能反向成为 production 支持白名单。
- [x] Rule production 已重构为 `rule-ast.mjs` → `rule-qx.mjs` / `rule-surge.mjs`：source parser 只构建 target-neutral AST，未知但可结构化 Rule 仍能进入 AST；QX/Surge planner 分别做目标能力与 logical semantics 校验。`rule.mjs` 仅保留兼容 facade，Catalog Rule inventory 也改为遍历同一 production AST。
- [x] Rewrite production 已建立统一 Semantic IR 交接层：Legacy Rewrite 与 Rewrite v2 保留独立 source parser，但均归一为 `rewrite-ir.mjs` 的 target-neutral operation model；production Rewrite v2 路由改为读取 IR operation，Legacy planner 也先经 IR 分类。IR 明确保留 Legacy absolute redirect 与 Rewrite v2 matched-range redirect 等来源语义差异，不因统一类别而强制共用错误映射。
- [x] Rewrite target 决策已集中到 `rewrite-qx.mjs::planQxRewrite()` / `rewrite-surge.mjs::planSurgeRewrite()`：`sync-convert.mjs` 只负责 parse、依赖物化、IR 构建和 planner 调用；QX header 特判、native/helper/complex fallback 与 complex-handler 注册均移入对应 target planner。旧未定义 `rewriteAction(...)` conservative fallback 已移除，未证明等价路径统一显式 Review/Issue。
- [x] Script production 已重构为 Legacy Script parser / Script v2 parser → `script-ir.mjs` target-neutral IR → `script-qx.mjs::planQxScript()` / `script-surge.mjs::planSurgeScript()`：`sync-convert.mjs` 不再选择 QX `script-*-header/body/echo`，也不再展开 Surge `type=http-*`、requires-body/max-size/binary/timeout/argument/enable 参数；Source Script URL、现有 QX KOP-XIAO-compatible option policy 与 Surge HTTP Script 语义保持不变。
- [x] Source section/comment/header metadata orchestration 已拆分：`source-section.mjs` 统一活动声明与前置注释分组及 supported-section scope，`source-metadata.mjs` 生成 target-neutral header metadata IR，`qx-comment.mjs` 独占 QX `{# note #}` 绑定规则；`sync-convert.mjs` 不再维护第二份 comment parser/section whitelist。MITM planner/hostname 语义未改。
- [x] Target output assembly 已拆分：`qx-output.mjs` 统一 QX notes/filter/rewrite/mitm state、固定注释 section 顺序与最终 snippet 拼装；`surge-output.mjs` 统一 Rule/URL/Header/Body/Map/Script/MITM destination、section 顺序、`needsCore20` 与 module 拼装；`sync-convert.mjs` 不再直接访问目标 section 数组或维护 section 标题/compact/join。
- [x] Whole-plugin parser 与 pure conversion core 已拆分：`plugin-parser.mjs` 统一 Loon BOM/newline/section parsing；`conversion-pipeline.mjs::convertPlugin()` 统一 unknown-section、Argument、Rule/Rewrite/Script/MITM dispatch、planner context 与 output builders。`sync-convert.mjs` 不再承载 semantic dispatch；canonical runner 直接复用同一 parser/pipeline。
- [x] External conversion context 已集中：`dependency-materializer.mjs` 统一 jq_file/mock_file discovery + fetch，`source-script-materializer.mjs` 统一 Legacy/Script v2 URL discovery、相对 URL 解析与可选源码读取，`conversion-context.mjs::materializeConversionContext()` 组合 parser + 两类 materializer。在线 sync 与 canonical regeneration 都先调用同一 context，再调用 `convertPlugin()`；`sync-convert.mjs` 不再解析 Rewrite/Script 来发现依赖。
- [x] Conversion context 已收口为 parse-once：`materializeConversionContext()` 返回的 `parsed` 会原样传入 `convertPlugin()`，在线 sync 与 canonical regeneration 不再对同一插件重复 whole-plugin parse；pipeline 仅为独立调用保留无 `parsed` 时的纯解析 fallback。该变更经 Converter Check #658 验证 canonical/helper 0 diff。
- [x] QX snippet validator 已从 GitHub orchestration 抽离：`converter/src/qx-snippet-validator.mjs` 统一实现 `validateQX()` 并直接消费 `qx-official-capabilities.mjs`；sync、canonical runner、repository audit、Golden/genericity 均直接复用该 validator，不再从 `sync-convert.mjs` 借用校验逻辑。Converter Check #659 全绿且 canonical/helper 0 diff。
- [x] Managed artifact I/O 已收口：`converter/src/managed-artifacts.mjs` 统一 source normalize/change-detect/write、conversion stamp、QX/Surge target snapshot、generated helper diff/write 与 conditional target write；`sync-convert.mjs` 和 canonical runner 不再分别维护 fs/crypto/target-path/normalization。源合法性仍先于 `Resource/Loon` 写入，online/canonical 时间戳策略、helper/validator/target write 顺序保持原样。Converter Check #662 全绿，canonical/helper 0 diff。
- [x] Workflow diagnostics 已收口：`converter/src/workflow-diagnostics.mjs` 统一 GitHub Actions error annotation、failure detail 收集与 summary rendering；online sync 继续保持 `Failures:`、`stack || message` 与 `String(error.message)`，canonical runner 继续保持 `Canonical regeneration failures:`、`stack || error` 与 `String(error.message || error)`，调用方仍独占 exit policy/stale-check。Converter Check #663 全绿，canonical/helper 0 diff。
- [x] QX Source Script `debug` / Legacy `max-size` 已按用户决策改为直接丢弃：QX planner 不输出参数、不输出普通审计注释、不产生 Review/Issue；Script v2 动态 `debug=${...}` 也直接丢弃且不因未声明参数阻断。Surge 行为不变。Converter Check #668 全绿，canonical/helper 0 diff。
- [x] 仓库清理已完成：删除 deprecated `CONVERSION_POLICY.md` / `LOON_NEW_SYNTAX_CONVERSION.md`、重复 `converter/STATUS.md`、冗余 `Resource/Loon/RuCu6/SOURCES.txt` 及两份已被通用 inventory/planner/Golden 覆盖的 RuCu6 专用 coverage 测试；同时移除 Egern 定时监控、失效 `scan-script-compat.mjs` 引用和相关旧文档引用。PR #89 / Converter Check #669 全绿，canonical/helper 0 diff。
- [x] GitHub Actions 全自动上游闭环已实现：scheduled workflow 逐插件执行原作者 fetch → materialize → convert → QX/Surge validate，成功后才写 managed Source/target/helper；单插件 hard failure 保留旧成品并写结构化 failure report，其他插件继续。`REVIEW REQUIRED` / `ISSUE REQUIRED` / hard failure 统一由 Issue proposer 创建或复用 Issue，Issue 必须包含插件、对应源规则和失败原因。旧 ChatGPT Work prompt/finalizer、work-review PR 路径与 conversion gate 已删除。
- [x] Generated helper 输出已闭环同步：`managed-artifacts.mjs` 只对严格匹配 converter-owned helper 命名模式的文件做 stale prune，手工/Source Script 不在删除范围。首次 canonical prune 识别并移除 4 个历史孤儿 helper（Tieba 1、Webpage 3）；其余成品仅刷新统一 conversion timestamp。
- 每次新增 QX 官方 sample 证据时，复核现有 Rewrite Review 是否可以安全降级为 native/helper；Rule 只在官方明确支持对应 Rule Type 后才改为活动 filter。
- [x] QX capability gate 已收窄为 Loon 去广告转换实际能力：仅核对 Rule 类型、WayX 实际使用的 Rewrite action 与 MITM `hostname` 是否仍有 Crossutility 官方依据；转换范围之外的能力不进入 registry。Surge 同样采用 Rule / Rewrite / hostname 边界。
- [x] Surge official capability gate 已落地：production `rule.mjs` / `surge-module.mjs` 共用 `surge-official-capabilities.mjs`；CI 实时读取 Surge 官方 Manual，只验证 WayX 实际使用的 28 个 Rule Type、URL/Header/Body Rewrite、Map Local、HTTP request/response Script 与 MITM `hostname` 仍有官方依据。Surge 其它 Profile/Module 能力不进入本 gate。
- [x] 对 generated helper 做行为级 runtime fixture，而不只做字符串/语法断言：`converter/tests/generated-helper-runtime.mjs` 已接入 CI，覆盖 request/response、组合条件、命中/未命中、Header/Body/JSON 顺序、capture、raw string、typed JSON、invalid JSON 失败隔离、Surge duplicate header，以及当前 observed QX mock complex signature。
- 保持 `PROJECT_STATUS.md` 与实际 Review inventory 同步。

---

## 5. 明确不是 Bug 的项目决策

以下内容是当前项目标准，不应作为“待修复问题”重复打开：

- Loon regex `i/m/s` flags：**直接丢弃**。
- regex body：**原样保留，不做全局格式转换**。
- legacy `jq-path=`：**直接丢弃**。
- QX section heading：按项目约定注释。
- QX / Surge Source Script：均不做 runtime compatibility scan；直接保留原 URL。
- QX `header.add`：禁止用 set 冒充。
- Cron / Network Changed / Generic Script：当前去广告范围不处理。
- Egern：当前不属于 WayX 仓库目标。
- QX 不创建 Loon `[Argument]` 参数 UI/BoxJs；仅做依赖与可表达性分析。

---

## 6. 每次重大转换修改后的检查清单

- [ ] 先更新/确认 `CONVERSION_SPEC.md` 对应 Block。
- [ ] 无插件名/作者名特判。
- [x] Rewrite/Mock 路由已收紧为 target native → dedicated helper → observed source-authored complex helper → Review/Issue；Rule 不走 Script fallback。
- [ ] Regex 只丢 `i/m/s`，body 未被全局改写。
- [ ] Source comments、转换时间、作者 chance、分类、Target、Source 保留；QX 一对一注释正确内联，分组注释未误绑第一条规则。
- [ ] QX section heading 仍为注释。
- [ ] Source Script 未被自动修改，且 QX/Surge 未按 runtime compatibility 扫描结果启用/禁用。
- [x] checkpoint / genericity / end-to-end / syntax 全通过。
- [ ] canonical outputs 重新生成。
- [ ] repository audit / helper refs / Golden / Source Script URL preservation 全通过。
- [x] Review / Issue inventory 已由 CI 自动统计。
- [x] 本轮进度、Review 数与已知问题已同步。

---

## 7. 状态更新规则

发生以下任一事件时必须更新本文件：

- Source Catalog 增删插件；
- 新增/移除 Review 原因；
- QX / Surge Review marker 数明显变化；
- 新增 target native/helper 能力；
- converter scope 改变；
- canonical 管理边界变化；
- 新发现会影响转换正确性的 bug。

本文件只负责进度与问题跟踪。转换语义的最终定义仍以 `CONVERSION_SPEC.md` 为准。
