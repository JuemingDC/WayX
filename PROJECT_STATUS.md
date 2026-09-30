# WayX Project Status / TODO

> 用途：长期记录 WayX 当前实现状态、已知问题、待办优先级与验收标准。  
> 维护原则：本文件描述“当前 main 的真实状态”，不能替代 `CONVERSION_SPEC.md`；规范冲突时以 `CONVERSION_SPEC.md` 为唯一权威。

- 审计日期：2026-09-30
- 审计基线：PR #70 QX official capability drift gate / Converter Check #601
- Source Catalog：20 个 Loon 去广告插件
- Catalog 管理目标：20 个 Quantumult X snippet + 20 个 Surge sgmodule
- Adblock 目录实际目标：21 个 QX + 21 个 Surge（额外包含手工维护的 `QZXY`）
- 最近完整 Converter Check：#601，通过
- 当前实现 PR：#70

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
- Work 审查规则已同步 native → helper → Review、regex body 保持等标准。

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

2026-09-30 规范 v1.11 已把 QX Source Script 的 `binary-body-mode` / `binary_body_mode` 纳入 KOP-XIAO `resource-parser.js` 兼容口径。目标 Review inventory 为：

- **Quantumult X：0**
- **Surge：0**
- **Unknown Issue：0**

QX Source Script declaration 的 `argument`、动态 `enable`、`timeout`、`binary-body-mode` / `binary_body_mode` 现在统一按 KOP-XIAO Script 转换取舍处理：argument 忽略，动态 enable 默认开启，timeout 与 binary body mode 忽略；header/body 只由 `requires-body` / `requires_body` 决定。固定 `enable=false/0` 仍保持禁用。

这项兼容策略只覆盖上述 Script declaration 字段。`debug`、`max-size`、Rewrite 参数、未知语法等继续按 WayX 自身规范判断，不因为 KOP-XIAO 忽略其它字段而自动放行。

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

#### P0-2：QX Script option 保真

Loon Source Script declaration 的 `argument`、dynamic enable、timeout、binary body mode 已按 KOP-XIAO parser 口径确定：QX 忽略 argument，动态 enable 默认开启，timeout 与 binary body mode 忽略；header/body 只由 requires-body 决定。固定 enable=false/0 仍禁用。debug、max-size 等其它字段继续按 WayX 自身标准逐项判断。

处理顺序：

1. QX 原生 declaration；
2. 若问题属于 Rewrite 语义而非 Source Script 本体，使用对应专用 helper；
3. 仍无法保持则注释 Review。

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

- [x] 已建立 Catalog-observed Rewrite v2 / Script v2 syntax inventory：`converter/tests/catalog-syntax-inventory.mjs` + `converter/fixtures/catalog-syntax-inventory.json`。当前基线为 175 条 Rewrite v2 / 110 条 Script v2；CI 只锁语法形态，不锁同类规则数量。新 action/参数形态/condition/capture/logical/regex flag/Script option/argument/option-set 或 multi-action signature 首次出现时 fail closed，必须先核对官方语义再更新基线；未观察到的 complex signature 仍不得预先放行。
- 每次新增 QX 官方 sample 证据时，复核现有 Rewrite Review 是否可以安全降级为 native/helper；Rule 只在官方明确支持对应 Rule Type 后才改为活动 filter。
- [x] QX capability gate 已收窄为 Loon 去广告转换实际能力：仅核对 Rule 类型、WayX 实际使用的 Rewrite action 与 MITM `hostname` 是否仍有 Crossutility 官方依据；转换范围之外的能力不进入 registry。Surge 同样采用 Rule / Rewrite / hostname 边界。
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
