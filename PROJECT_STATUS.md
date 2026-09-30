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
2. 原生格式不能严格等价 → 使用已验证的最小 helper / complex helper。
3. helper 仍无法保持源语义 → 注释原声明并输出明确 Review。
4. 不按插件名写特例；实现必须是通用语义能力。
5. 所有新标准必须同步：规范 → converter → validator/gate → tests → Golden/canonical。
6. Source JavaScript 本身不自动修改；只在目标声明与运行时兼容性有证据时启用。

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

- QX、Surge 都可调用通用 complex helper。
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
- JSON add / delete / replace 与 complex helper 已支持。
- legacy `jq-path=` 已按项目标准彻底丢弃，不解析、不下载、不生成 Review。

### 2.5 Rule / Script / 其他项目标准

- Surge 去广告 Module 的源 `FINAL` 直接丢弃，不改写成 catch-all。
- Surge Source Script 不做 runtime compatibility scan，只按 Surge declaration 格式转换。
- QX Source Script 使用 fail-closed 兼容性判断；无正向 QX runtime 证据不启用。
- QX snippet 的 filter / rewrite / mitm section 标题保持注释形式。
- Cron / Network Changed / Generic Script 不属于当前去广告 converter 范围。
- Egern 不纳入 WayX 仓库当前目标。

---

## 3. 当前 Review 库存

下面的数字是当前 canonical 目标文件中的 **Review marker 数量**，不是插件数量。

### 3.1 Quantumult X

当前：**139 个 Review marker / 14 个目标文件**。

| 文件 | Review 数 |
|---|---:|
| Bilibili.snippet | 21 |
| BlockAdvertisers.snippet | 4 |
| DianPing.snippet | 2 |
| HTTPDNS.snippet | 2 |
| JingDong.snippet | 4 |
| MyBlockAds.snippet | 25 |
| PinDuoDuo_remove_ads.snippet | 3 |
| RuCu6_Amap.snippet | 15 |
| Tieba_remove_ads.snippet | 1 |
| Webpage.snippet | 15 |
| Weibo.snippet | 21 |
| XiaoHongShu.snippet | 13 |
| YouTube.snippet | 3 |
| Zhihu.snippet | 10 |
| **合计** | **139** |

按原因汇总：

| 原因 | Marker 数 | 当前状态 |
|---|---:|---|
| Source Script 被 QX fail-closed 禁用/Review | 111 | 最大 backlog；需逐脚本证明 QX runtime 兼容性 |
| QX logical Rule 无已验证原生或无损脚本等价 | 21 | 等待官方 sample/可证明方案 |
| QX `DEST-PORT` 未验证 | 4 | 严格按 QX sample，暂不猜测 |
| Script argument/enable/timeout/max-size/binary option 无法保持 | 2 | DianPing；需继续 native/helper 方案分析 |
| QX `response.header.add` 重复 Header 语义未验证 | 1 | 禁止用 set 冒充 add |
| **合计** | **139** | |

### 3.2 Surge

当前：**5 个 Review marker / 2 个目标文件**。

| 文件 | Review 数 | 原因 |
|---|---:|---|
| Bilibili.sgmodule | 1 | 外部 policy/group binding 无法由去广告 Module 无损定义 |
| Webpage.sgmodule | 4 | 外部 policy/group binding 无法由去广告 Module 无损定义 |
| **合计** | **5** | |

---

## 4. 待办工作

### P0 — 优先处理

#### P0-1：降低 QX Source Script Review

当前有 111 个 Source Script disabled/review marker。

处理要求：

- 逐脚本读取真实源码。
- 只使用 QX 官方 sample 已确认的 runtime/global 作为正向证据。
- 如果脚本已经支持 QX，允许按原 Source Script URL + 正确 QX Script action 启用。
- 不自动 fork / wrapper / 修改 Source JS。
- 若依赖 Loon/Surge 私有 API 且源脚本没有 QX adapter，继续 Review。
- 每减少一类 Review，必须新增通用 compatibility fixture，而不是插件名特判。

验收：

- compatibility 判定有官方依据；
- checkpoint + genericity + end-to-end 全通过；
- canonical Review 数可解释地下降；
- Source Script URL 保持原始来源。

#### P0-2：QX logical Rule / DEST-PORT

当前：

- logical Rule：21 个 Review marker
- DEST-PORT：4 个 Review marker

处理要求：

- 继续以用户上传的 QX 官方 sample 为语法权威。
- 先确认是否存在官方目标声明。
- 无原生格式时，再评估是否存在真正等价的 QX Script/Rule 能力。
- Rule 层语义不能用 HTTP Rewrite helper 冒充。
- 仍无法严格等价时保持 Review。

验收：

- 不扩大或缩小匹配范围；
- policy 行为不变；
- 不引入未在 QX sample 证明的 filter type。

#### P0-3：QX Script option 保真

当前 DianPing 有 2 个 Review marker，涉及 source argument / enable / timeout / max-size / binary option 组合。

处理顺序：

1. QX 原生 declaration；
2. 已验证 helper；
3. 仍无法保持则注释 Review。

不得通过忽略 option 来假装转换成功。

#### P0-4：QX `response.header.add`

当前 1 个 Review marker。

- 继续检查 QX 官方 sample 是否存在可保留同名重复 Header 的 response 表达。
- `set` / 普通 Header object 赋值不能视为 `add`。
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
- 每次新增 QX 官方 sample 证据时，复核现有 Review 是否可以安全降级为 native/helper。
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
- Surge Source Script：不做 runtime compatibility scan。
- QX `header.add`：禁止用 set 冒充。
- Cron / Network Changed / Generic Script：当前去广告范围不处理。
- Egern：当前不属于 WayX 仓库目标。
- QX 不创建 Loon `[Argument]` 参数 UI/BoxJs；仅做依赖与可表达性分析。

---

## 6. 每次重大转换修改后的检查清单

- [ ] 先更新/确认 `CONVERSION_SPEC.md` 对应 Block。
- [ ] 无插件名/作者名特判。
- [ ] 目标原生 → verified helper → Review 顺序正确。
- [ ] Regex 只丢 `i/m/s`，body 未被全局改写。
- [ ] Source comments、转换时间、作者 chance、分类、Target、Source 保留。
- [ ] QX section heading 仍为注释。
- [ ] Source Script 未被自动修改。
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
