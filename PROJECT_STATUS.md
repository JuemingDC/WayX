# WayX Project Status / TODO

> 用途：长期记录 WayX 当前实现状态、已知问题、待办优先级与验收标准。  
> 维护原则：本文件描述“当前 main 的真实状态”，不能替代 `CONVERSION_SPEC.md`；规范冲突时以 `CONVERSION_SPEC.md` 为唯一权威。

- 审计日期：2026-09-30
- 审计基线：`main @ f29cbd71d5ce0f9b71036128dace17b5ecd0dd41`
- Source Catalog：20 个 Loon 去广告插件
- Catalog 管理目标：20 个 Quantumult X snippet + 20 个 Surge sgmodule
- Adblock 目录实际目标：21 个 QX + 21 个 Surge（额外包含手工维护的 `QZXY`）
- 最近完整 Converter Check：#520，通过
- 当前 open PR：0（本状态文件创建前）

---

## 1. 当前项目目标

WayX 当前只维护 **Loon → Quantumult X / Surge** 的去广告转换与相关手工模块。

核心转换原则：

1. 目标平台原生格式能严格等价表达 → 使用原生格式。
2. Rewrite/Mock 原生格式不能严格等价 → 使用对应专用 helper；多 action pipeline 才使用 complex helper。
3. Rewrite helper 仍无法保持源语义 → 注释原声明并输出明确 Review；Rule 不使用 Script fallback。
4. 不按插件名写特例；实现必须是通用语义能力。
5. 所有新标准必须同步：规范 → converter → validator/gate → tests → Golden/canonical。
6. Source JavaScript 本身不自动修改；QX/Surge 均直接引用原 URL，不做 runtime compatibility gate，仅在必要时读取正文辅助选择 QX HTTP Script action。
7. QX 源注释仅在严格一注释一规则时转换为 `{# note #}`；一条注释覆盖多条连续规则时保持普通注释，不能只绑定第一条。

---

## 2. 已完成能力

### 2.1 项目治理与自动化

- `CONVERSION_SPEC.md` + Block 00–95 已建立为唯一规范链。
- Source Catalog 驱动 canonical regeneration。
- 已建立 QX / Surge validator、repository audit、Golden、genericity、helper reference、Source Script URL preservation 等检查。
- 未知 Loon section、Script parse failure、未知 MITM option 不再静默丢失，统一进入 Review。
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

- QX、Surge 的多 action Rewrite pipeline 可调用通用 complex helper；单 action 不进入 complex helper。
- 同 phase Header / Body / JSON pipeline 可保持源顺序。
- condition named capture、`${name.n}`、action-local `$0...$n` 已分离处理。
- Header 名称大小写不敏感语义已在 helper 中处理。
- QX `request.header.add` 仅在能严格证明等价时使用 `request-header` 原生插入。
- QX `header.set / del / replace` 使用 Header helper；`response.header.add` 因重复 Header 表达未验证，保持 Review。
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

- Surge 去广告 Module 的源 `FINAL` 直接丢弃，不改写成 catch-all。
- QX / Surge Source Script 均不做 runtime compatibility scan，直接保留原始 Script URL；QX 仅在 declaration 不足以确定 header/body/echo action 时读取正文辅助分类。
- QX 官方 sample 未确认的 Rule Type（逻辑规则、端口类等）只注释保留，不用 HTTP Rewrite Script 模拟。
- Loon Plugin `PROXY` 不做策略转换：QX 保留字面 `PROXY`；Surge Module 保留源 Rule 注释。
- QX snippet 的 filter / rewrite / mitm section 标题保持注释形式。
- QX filter/rewrite 支持前置 `{# note #}`；converter 已按“单行注释 + 单条源规则 + 单条活动目标规则”限制内联，分组注释不内联。
- Cron / Network Changed / Generic Script 不属于当前去广告 converter 范围。
- Egern 不纳入 WayX 仓库当前目标。

---

## 3. Review 库存

2026-09-30 规范 v1.4 改变了 Review 分类口径，旧 main 中的 **139 个 QX / 5 个 Surge Review marker** 仅作为变更前基线，不再代表新规范下的待办数量：

- 原先因“QX Source Script compatibility 不确定”产生的 marker 将随 canonical regeneration 移除；Source Script 不再经过 runtime compatibility gate。
- QX logical Rule、`DEST-PORT` 等未受官方 sample 支持的 Rule Type 改为“注释保留的不支持语义项”，不再尝试 Script 等价，也不计为 Rewrite helper backlog。
- Loon Plugin `PROXY` 在 Surge Module 中改为源 Rule 注释保留，不再将其视作可通过策略映射解决的 Review。
- Script declaration 中无法表达的 Loon `[Argument]` / dynamic option、QX `response.header.add` 等真正的目标能力缺口仍保留 Review。

本分支完成 canonical regeneration 后，必须重新由目标文件生成 Review inventory，再将精确数字写回本节；禁止沿用旧口径的 139 / 5 作为当前状态。

## 4. 待办工作

### P0 — 优先处理

#### P0-1：重新生成 canonical 并重建 Review inventory

执行 v1.4 后重新生成全部 Catalog 管理的 QX snippet / Surge sgmodule，并确认：

- Source Script declaration 仍引用原作者 URL；
- 不再出现 Source Script runtime compatibility disabled marker；
- QX 不支持 Rule 以注释形式对账，且没有生成 Rule helper；
- Surge 的 Loon `PROXY` Rule 仅注释保留；
- helper 文件引用均存在且与 action 类型匹配；
- Review inventory 按新口径重新统计。

#### P0-2：QX Script option 保真

Loon Script declaration 的 `[Argument]`、dynamic enable/timeout/debug、max-size、binary body 等仍按目标声明能力逐项判断。不得为了“直接引用原脚本”而忽略 declaration 层无法表达的 option。

处理顺序：

1. QX 原生 declaration；
2. 若问题属于 Rewrite 语义而非 Source Script 本体，使用对应专用 helper；
3. 仍无法保持则注释 Review。

#### P0-3：QX `response.header.add`

重复 Header 语义仍未由当前 QX 官方 sample 证明可用普通 Header object 等价表达：

- 禁止用 set 冒充 add；
- 单 action 不借用 complex helper；
- 无官方等价形式前保持 Review。

### P1 — 项目结构与可维护性

#### P1-1：明确 QZXY 的管理方式

当前 Source Catalog 有 20 个插件，但 QX / Surge Adblock 目录各有 21 个文件。

额外文件：

- `Adblock/Quantumult X/QZXY.snippet`
- `Adblock/Surge/QZXY.sgmodule`

QZXY 当前是手工维护/独立来源，不受 Source Catalog canonical regeneration 管理。

需要二选一：

- A. 保持手工资产，并在 Source Catalog / README / audit 中明确 exemption；
- B. 建立正式 source descriptor，把它纳入统一生成链。

在决定前，不允许 canonical 工具误删或覆盖 QZXY。

#### P1-2：生成机器可读的 Source → Target reconciliation 报告

当前已经 fail-closed，但还缺一个统一的逐语义项报告。

目标：

```text
Source 有效语义项
=
Target 已转换项
+
明确 Review 项
+
规范允许丢弃项
```

建议由 CI 输出 JSON/Markdown summary，包括：

- source item 数
- native 转换数
- helper 转换数
- Review 数
- intentional drop 数
- 按 action/rule 类型分类

这样可避免只依赖 Golden/hash 与 Review marker 观察项目健康度。

#### P1-3：自动生成 Review inventory

当前本文件中的 139 / 5 是人工审计结果。

建议增加脚本从 canonical 输出自动统计：

- QX / Surge Review 总数
- 按文件
- 按 reason
- 与上一次 main 比较增减

如果 Review 意外增加，CI 应至少输出明显 warning。

### P2 — 长期质量工作

- 继续扩充陌生插件 generic fixtures，防止能力只对当前 20 个 Catalog 插件有效。
- 每次新增 QX 官方 sample 证据时，复核现有 Rewrite Review 是否可以安全降级为 native/helper；Rule 只在官方明确支持对应 Rule Type 后才改为活动 filter。
- 定期复核 validator whitelist 是否与当前官方 sample 一致。
- 对 generated helper 做行为级 runtime fixture，而不只做字符串/语法断言。
- 保持 `PROJECT_STATUS.md` 与实际 Review inventory 同步。

---

## 5. 明确不是 Bug 的项目决策

以下内容是当前项目标准，不应作为“待修复问题”重复打开：

- Loon regex `i/m/s` flags：**直接丢弃**。
- regex body：**原样保留，不做全局格式转换**。
- Surge source `FINAL`：**直接丢弃**。
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
- [ ] Rewrite/Mock 为目标原生 → dedicated helper → multi-action complex helper → Review；Rule 不走 Script fallback。
- [ ] Regex 只丢 `i/m/s`，body 未被全局改写。
- [ ] Source comments、转换时间、作者 chance、分类、Target、Source 保留；QX 一对一注释正确内联，分组注释未误绑第一条规则。
- [ ] QX section heading 仍为注释。
- [ ] Source Script 未被自动修改，且 QX/Surge 未按 runtime compatibility 扫描结果启用/禁用。
- [ ] checkpoint / genericity / end-to-end / syntax 全通过。
- [ ] canonical outputs 重新生成。
- [ ] repository audit / helper refs / Golden / Source Script URL preservation 全通过。
- [ ] 重新统计 Review inventory。
- [ ] 如果进度、Review 数或已知问题变化，更新本文件。

---

## 7. 状态更新规则

发生以下任一事件时必须更新本文件：

- Source Catalog 增删插件；
- 新增/移除 Review 原因；
- QX / Surge Review marker 数明显变化；
- 新增 target native/helper 能力；
- converter scope 改变；
- 新增 intentional drop 标准；
- canonical 管理边界变化；
- 新发现会影响转换正确性的 bug。

本文件只负责进度与问题跟踪。转换语义的最终定义仍以 `CONVERSION_SPEC.md` 为准。
