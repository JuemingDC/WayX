# WayX Conversion Specification

版本：1.60
作者：chance  
状态：**唯一权威转换规范（Authoritative）**  
迁移状态：**Phase C active / Rewrite、Script、Configuration domain consolidation complete / Phase D–F pending**

WayX 当前只执行 **Loon → Quantumult X / Surge** 转换。Egern 不纳入本仓库转换链。

---

## 1. 权威来源与证据优先级

任何语法、API、行为或 target capability 必须先有官方依据，再进入实现。优先级固定为：

1. **Loon**
   - https://nsloon.app/docs/intro
   - Loon 官方 Rewrite / Plugin / Script 文档
2. **Quantumult X**
   - 作者官方仓库：https://github.com/crossutility/Quantumult-X
   - 当前重点依据：
     - `sample.conf`
     - `rewrite.md`
     - `sample-rewrite-request-header.js`
     - `sample-rewrite-response-header.js`
     - `sample-rewrite-with-script.js`
     - `sample-echo-response.js`
     - 官方仓库中其它明确 sample
   - 用户上传的官方 `sample.txt`
3. **Surge**
   - https://manual.nssurge.com/
   - https://nssurge.com/
4. 上游插件/脚本作者原始文件，只用于理解 source behavior，不得替代目标平台官方能力证明。

禁止用第三方教程、资源解析器或“常见写法”证明目标平台支持某语法。第三方实现只能作为兼容思路参考。

---

## 2. 总目标：行为语义等价，而不是文本相似

WayX 的目标是把 Loon 行为编译为目标平台能够表达的**同等行为**。

固定原则：

- 能证明 target native 完全等价 → native。
- native 不能完全等价，但 target Script/runtime 能完全重现 → helper / dispatcher。
- 两者都不能证明 → unsupported / fail closed。
- 禁止“删掉目标不支持的部分，其余照常输出”。
- 禁止以“生成结果看起来合法”替代语义等价证明。
- 禁止按插件 id、插件名、作者、仓库、Catalog 当前完整 signature 做特判。

---

## 3. 新架构：Semantic Compiler

固定数据流：

```text
Loon source
  → source parser
  → Semantic IR
  → reference evaluator
  → equivalence planner
      ├─ native-equivalent
      ├─ guarded-helper
      ├─ phase-dispatcher
      └─ unsupported
  → target adapter
      ├─ Quantumult X
      └─ Surge
  → target validator
  → oracle / canonical / audit
```

### 3.1 Source parser

Parser 只负责还原 Loon 源语义，不得提前做 QX/Surge 适配。

必须保留：

- source declaration 原文；
- section / phase；
- condition AST；
- Regex source；
- Regex flags；
- capture 名称及归属；
- action-local capture；
- Argument / PluginObject 引用；
- Script option；
- action 顺序；
- declaration 顺序；
- null / missing / empty string 的区别；
- 原始注释与 metadata。

### 3.2 Semantic IR

Rule、Rewrite、Script 均应先进入 target-neutral IR。

IR 不得出现：

- QX action 名；
- Surge section 名；
- QX/Surge helper URL；
- target capability 判断；
- target-specific fallback。

Target planner 只能消费 IR，不允许直接从 Loon 源字符串猜输出。

### 3.3 Reference evaluator

新架构必须具备 target-neutral reference evaluator，用于执行 Loon IR 并得到预期结果。

输入至少覆盖：

- request URL / path / method / headers / body；
- response status / headers / body；
- Argument；
- capture state。

输出至少覆盖：

- 是否命中；
- URL；
- request/response headers；
- request/response body；
- response status；
- redirect / reject / mock / abort；
- capture；
- action execution order。

---

## 4. Equivalence Planner

Planner 只能返回以下四类结果。

### 4.1 native-equivalent

只有目标平台官方语法能够完整表达源行为时使用。

要求：

- condition 等价；
- action 等价；
- capture 等价；
- execution order 等价；
- body/header lifecycle 等价。

### 4.2 guarded-helper

Native matcher 只负责候选流量预筛，helper 内重新执行完整 source condition 与 action。

关键约束：

- prefilter 允许 **false positive**；
- prefilter **禁止 false negative**；
- helper 必须能安全 no-op；
- helper 内必须使用原始 IR，而不是重新解析拼接后的 target 文本。

### 4.3 phase-dispatcher

当多条 Loon declaration 的执行顺序会被目标平台 Script 触发模型破坏时，必须合并为 phase dispatcher。

Dispatcher 必须：

- 保持 source declaration 原顺序；
- 顺序执行 source-authored pipeline；
- 保持 request / response phase 分离；
- 保持每条 declaration 自己的 condition、capture、action 顺序；
- 不把不同 source rule 人工合成新语义。

### 4.4 unsupported

无法证明等价时：

- 保留源声明；
- 给出明确 target limitation；
- 不输出假可用规则；
- 不静默删除条件、flags、参数或 action。

---

## 5. Regex 与 Condition

### 5.1 Regex source

Parser 去除 Loon Regex literal 的最外层 delimiter 后，Regex body 必须逐字符保留。

禁止全局：

- `\/ -> /` canonicalization；
- case folding；
- 捕获组重写；
- lookaround 展开；
- atomic group 改写；
- 自动插入 target inline modifier。

### 5.2 Regex flags

Loon `i / m / s` 是源行为组成部分，必须进入 Semantic IR。

**从 v1.57 起，禁止无条件丢弃 flags。**

当目标 native matcher 没有官方确认的等价 flag 表达：

1. 生成不会漏掉源命中的安全 prefilter；
2. helper / dispatcher 内执行：
   ```js
   new RegExp(source, flags)
   ```
3. 使用 helper 的实际 match object 处理 capture。

禁止因为目标 matcher 默认 case-sensitive 就把 Loon `/i` 直接删除。

### 5.3 Capture

必须区分：

- condition capture：例如 Loon `as name`；
- action-local Regex capture：`$0 ... $n`。

两者不得共用或互相替代。

### 5.4 Condition pushdown

只有能够证明为**必要条件**的 predicate 才能作为 helper prefilter。

只有能够证明为**完整等价条件**的 matcher 才能用于 native-equivalent。

---

## 6. Quantumult X Target Contract

### 6.1 官方 Rewrite 能力基线

QX target 仅使用官方 sample 已证明的格式。

当前官方 `sample.conf` 明确包含：

- `url` Rewrite matcher；
- `url-and-header`；
- reject / reject-img / reject-200 / reject-dict / reject-array；
- 302 / 307；
- request-header；
- request-body / response-body；
- jsonjq-request-body / jsonjq-response-body；
- echo-response；
- script-request-header；
- script-request-body；
- script-response-header；
- script-response-body；
- script-echo-response；
- script-analyze-echo-response。

`url-and-header` 的 headers comparison string 包含 method、path 与 request header key-value；URL 先匹配，URL 不命中时不继续 headers matcher。

### 6.2 官方 Script 行为基线

根据 `crossutility/Quantumult-X` 官方样例：

- Rewrite Script 可读取 `$request.url / path / method / headers`；
- response Script 可读取 response status / headers / body（视 action 类型）；
- `script-request-header`：
  - 可返回 `path`；
  - 可返回 `headers`；
  - `$done({})` 表示不修改；
- `script-response-header`：
  - 可返回 `status`；
  - 可返回 `headers`；
  - `$done({})` 表示不修改；
- `script-response-body`：
  - 可返回修改后的 body；
  - 可同时返回 headers / status；
  - 不得用它冒充“只改 response header”的 action；
- `script-echo-response` 可构造完整 response。

未被官方样例证明的字段或 result shape 不得生成。

### 6.3 QX Regex flags

当前官方 matcher sample 不提供 Loon `/pattern/ims` 形式或独立 flags 字段。

因此：

- 不得把 Loon flag 字符直接拼入 QX matcher；
- 不得未经官方依据生成 `(?i)` 等 inline modifier；
- 需要 flags 语义时进入 helper/dispatcher；
- 若对应 QX Script 类型无法安全 no-op，则不得使用过宽 prefilter，必须 unsupported。

### 6.4 QX snippet 输出

WayX QX snippet 固定：

- 保留原注释；
- 添加转换时间；
- Converted by: chance；
- 添加 Category / Source / Target；
- `filter_local / rewrite_local / task_local / mitm` 段标题保持注释形式；
- 只输出 QX 官方支持的活动语法。

---

## 7. Surge Target Contract

Surge 所有能力判断必须来自官方 Manual。

### 7.1 HTTP Script

官方 http-request Script：

- 读取 URL / method / headers / body；
- 可返回 url / headers / body；
- 可直接返回 response；
- 可 abort；
- `$done({})` 或 `$done()` = request 原样继续。

官方 http-response Script：

- 读取 request + response；
- 可返回 status / headers / body；
- 可 abort；
- `$done({})` 或 `$done()` = response 原样继续。

### 7.2 Script 单命中限制

同一 request：

- 最多执行第一个匹配的 http-request Script；
- 最多执行第一个匹配的 http-response Script。

因此多个需要 helper 的 Loon declaration 不能简单转成多个互相竞争的 Surge Script；需要保持顺序时必须 phase-dispatcher。

### 7.3 Surge native

Surge native Rewrite / Header Rewrite / Body Rewrite / Map Local 能完整等价时优先 native。

若 native processing order 与 Loon source order 不等价，则不能仅因为单条 action 可映射就使用 native。

---

## 8. Rule

Rule 使用独立 target-neutral Rule IR。

要求：

- 已确认目标平台支持的 Rule type 才能 native；
- policy 语义必须保留；
- `no-resolve` 等行为属性不得因格式转换丢失；
- Surge 可使用官方 SCRIPT Rule；
- QX 不得因为缺少某 Rule type 就用 HTTP Rewrite Script 假装网络层 Rule；
- 无法等价则注释 source + unsupported。

Catalog inventory 只锁“新 Rule type / policy class / parameter class”等 semantic token，不锁历史完整组合。

---

## 9. JSON / JQ / Mock

### 9.1 Key Path

Loon Key Path 必须解析成结构化 path segments，支持：

- dot key；
- array index；
- quoted bracket key。

不得用简单 `split('.')` 破坏包含点、斜杠或特殊字符的 key。

### 9.2 JSON add / replace / delete

以 source behavior 为准，统一进入 IR 后再由目标 planner 选择 native JQ 或 runtime。

不得因为 QX/Surge 都“能写 JQ”就改变：

- missing/null 判断；
- false 值判断；
- array index 删除后的位移顺序。

### 9.3 jq / jq_file / historical jq-path

源作者提供的 JQ 只允许最小格式化以适配单行 target syntax。

禁止做代数重写。

外部依赖必须从原作者 URL 获取；无法安全内联则 unsupported，不转成自创 Script 逻辑。

### 9.4 mock / mock_file

response mock 可优先使用目标原生 mock/Map Local。

request mock 或 mixed pipeline 必须根据目标生命周期选择 helper。

远程 mock_file 物化出的 WayX helper 必须可重建、内容哈希稳定、引用可审计。

---

## 10. Script Declaration

Source Script URL 固定保持原作者 URL：

- 不镜像；
- 不 fork；
- 不 wrapper；
- 不改写源 JavaScript。

Loon Script declaration 的：

- phase；
- requires-body；
- binary-body-mode；
- timeout；
- enable；
- debug；
- argument / PluginObject；
- cron / event / generic trigger

都必须进入 IR。

目标平台无法表达的 option 不得再默认“忽略即等价”；新架构必须显式证明该 option 对行为无影响，或 unsupported。

兼容实现可暂时保留当前策略，但必须通过 migration inventory 明确标记，不得成为新架构默认规则。

---

## 11. Argument

Loon `[Argument]` 先进入 target-neutral Argument IR。

Surge：

- 官方 Module argument 能力可等价表达时使用 `#!arguments` / placeholder。

Quantumult X：

- 不存在官方确认的通用 Loon Plugin Argument 等价机制时，不得伪造字段；
- 只有当 Argument 不影响当前 declaration 行为，才能证明安全省略；
- 否则 helper 若能把值固定为明确 source constant 才可继续；
- 其余 unsupported。

---

## 12. MITM / Metadata / Comments

MITM hostname 只做目标格式适配，不扩大匹配范围。

必须保留原始有效注释，并增加：

- Converted；
- Converted by: chance；
- Category；
- Source；
- Target。

Header metadata parser 与 target renderer 属于同一 metadata domain，不再拆成多个只含少量函数的独立“架构层”。

QX inline note 只在能确定一条注释唯一绑定一条活动目标声明时使用；否则保留普通注释。

---

## 13. Source Catalog 与网络获取

### 13.1 Catalog

`.github/sources/loon-static.json`：

- 只保存人工固定的非 Kelee source。

`.github/sources/loon.json`：

- 为完整生成态 Catalog。

Kelee：

- 从 `https://hub.kelee.one/list.json` 自动发现；
- 只接受指向官方 Kelee Lpx 路径的项目；
- 保持 list 顺序；
- 已存在同一 source URL 时保留稳定 id / target filename。

### 13.2 Original source only

Plugin、Source Script、JQ/mock dependency 只拉取原作者 URL。

Transport profile 可以因 host 调整 User-Agent / Python urllib / Node fetch，但：

- 原 URL 不得改变；
- 不使用 mirror；
- 不使用 fallback 副本。

Transient network error 可以有限重试同一 URL。

---

## 14. Generated Helper / Dispatcher

WayX-generated Script 只允许解决目标平台与 Loon 之间的语义缺口。

必须：

- 由 IR 生成；
- deterministic；
- 最小化；
- 带 Source / Converted / Author / Category；
- 不复制无关 runtime；
- 不包含插件特判；
- helper 文件名由内容/语义稳定派生；
- 过期 helper 自动 prune。

未来 dispatcher 应优先共享通用 runtime emitter，而不是每种 action 再新增一个独立 renderer 文件。

---

## 15. Oracle 与测试

新架构必须新增 differential oracle。

同一 fixture 同时执行：

1. Loon Semantic IR reference evaluator；
2. QX lowering semantic model；
3. Surge lowering semantic model。

比较：

- match/no-match；
- URL；
- method；
- headers；
- body；
- status；
- response/reject/mock/abort；
- capture；
- declaration/action order。

Phase C 的 matcher oracle 先固定 condition 层的差分判定：

- 同一组 context 必须同时运行 Loon reference evaluator 与目标 matcher semantic model；
- 结果必须分别统计 false positive 与 false negative，不能只给“通过/失败”；
- finite fixture 只属于差分证据，不能单独把结果提升为 `native-equivalent`；
- `native-equivalent` 仍要求独立的结构证明与目标平台官方能力证明，并要求 oracle 未观察到差异；
- `guarded-helper` 的 prefilter 必须独立证明为 source condition 的必要条件；oracle 用于阻止已观察到的 false negative，不能替代 soundness proof；
- helper/runtime 必须安全 no-op，Surge 仍受同 phase 只执行首个匹配 HTTP Script 的生命周期约束。

Regex 至少覆盖：

- 无 flag；
- `i`；
- `m`；
- `s`；
- `im/is/ms/ims`；
- optional capture；
- lookaround；
- escaped slash；
- Unicode；
- multiline body；
- header case differences。

---

## 16. Validation Gates

CI 固定分层：

1. syntax；
2. core unit；
3. QX official capability；
4. Surge official capability；
5. oracle / synthetic semantics；
6. full Catalog discovery；
7. upstream fetch + conversion；
8. canonical regeneration；
9. semantic-token inventory；
10. target validators；
11. managed cleanliness；
12. repository audit；
13. generated helper reference/runtime；
14. original Source Script URL preservation；
15. deterministic checked-in output。

Inventory 只用于发现新的 semantic token，不得作为完整 AST signature allowlist。

Golden 只在语义测试已通过后用于发现 deterministic output drift；不得用更新 Golden 掩盖语义错误。

---

## 17. 仓库结构

唯一规范源：

```text
.github/CONVERSION_SPEC.md
```

不再维护：

- `.github/docs/conversion-spec/*`；
- `.github/PROJECT_STATUS.md`；
- `.github/converter/README.md` 的规范副本；
- “Block → 固定实现文件名”契约。

根目录只允许：

```text
.github/
README.md
Adblock/
Resource/
Boxjs/
Module/
Rule/
Script/
```

Converter 实现按十个领域收口，统一公开入口：

| 文件 | 职责 |
|---|---|
| `src/core.mjs` | 源 Regex、条件 evaluator、等价规划、当前官方目标能力集合 |
| `src/rule.mjs` | Rule AST、QX/Surge 原生规则适配 |
| `src/rewrite.mjs` | Rewrite 源 parser/IR、JQ/依赖描述、Legacy/V2 目标规划、复杂动作路由 |
| `src/script.mjs` | Script 源 parser/IR、Argument、行为信号、QX/Surge 目标适配 |
| `src/configuration.mjs` | General/MITM 配置 IR 与目标适配 |
| `src/input.mjs` | 原作者源抓取、Catalog、插件/段落解析、依赖与脚本 materialization |
| `src/output.mjs` | 元数据、注释、目标输出状态/序列化、QX/Surge target validators |
| `src/runtime.mjs` | 通用 generated helper emitter；未来 dispatcher 在同域实现 |
| `src/workflow.mjs` | 产物生命周期、README 索引、工作流诊断与上游报告 |
| `src/conversion.mjs` | 纯转换 pipeline、共享 materialization/执行/验证入口 |
| `src/index.mjs` | 统一公开 export 入口，不复制实现 |

文件合并规则：

- 不再为同一领域的 QX/Surge、Legacy/V2 或单个辅助函数新增平行碎片 `.mjs`；新实现进入现有对应领域。
- 内部职责通过有名称的函数及原注释区分；保留原有注释并记录合并日期、作者与领域，不增加旧路径转发壳。
- tests 将原 36 个独立测试合并到 10 个领域套件；每个测试案例仍由独立 Node 子进程执行，保留变量、模块缓存与注册表隔离。fixtures/tools 按数据与运维命令组织；生产入口、canonical、测试和 CLI 都引用当前领域文件。
- 删除旧文件必须同时更新所有 import、工作流入口、结构约束和规范中的当前入口。
- 保留公开函数名和已有转换行为；结构调整不改写原作者脚本 URL、不扩大 MITM 范围、不重新命名生成助手或改变一项插件一套转换产物的外部接口。
- Generated helper 仍按语义需要生成；不能把不同插件/phase/动作的脚本机械拼接，导致首条匹配、顺序或 body 语义变化。
- Phase D–F 的语义迁移仍需独立证明；领域收口不作为行为等价证明的替代。
- 分支限定为 main，最多另有一个名为 test 的验证分支；不创建其他工作分支。Converter Check 在 checkout 后核对远端 heads 数量与名称，违反此预算即失败。

---

## 18. 自动化入口

Production：

```text
.github/scripts/sync-convert.mjs
```

Canonical：

```text
.github/converter/tools/regenerate-canonical.mjs
```

Target validation：

```text
.github/converter/src/output.mjs  # validateQX / validateSurgeModule
```

CI：

```text
.github/workflows/converter-check.yml
```

Scheduled upstream：

```text
.github/workflows/upstream-monitor.yml
```

Workflow 只调用稳定入口，不应枚举 converter 内部所有实现文件。

---

## 19. 新架构迁移阶段

### Phase A — Repository consolidation

- 单一规范；
- 删除重复文档/status；
- 去掉 path-coupled spec contract；
- workflow syntax 自动发现；
- 合并明显的单函数/单职责碎片模块。

### Phase B — Core Semantic IR

- 统一 source Regex/condition/capture；
- 建 reference evaluator；
- 当前 target output 暂不改变。

### Phase C — Equivalence Planner + matcher oracle

- native-equivalent proof；
- guarded-helper proof；
- prefilter soundness；
- differential condition matcher oracle；
- false-positive / false-negative evidence；
- unsupported reason taxonomy。

### Phase D — Runtime / Dispatcher

- QX runtime adapter；
- Surge runtime adapter；
- phase dispatcher；
- action ordering。

### Phase E — Full behavior oracle migration

- action/runtime differential tests；
- Catalog differential tests；
- flag/capture fuzz；
- canonical regeneration。

### Phase F — Compatibility removal

只有当新路径覆盖 Catalog 且 oracle/canonical/validator 全部通过时，才删除对应旧 planner/helper。

禁止“大爆炸重写”。

---

## 20. 固定修改顺序

任何新增能力或语义修复固定按：

```text
官方依据
→ CONVERSION_SPEC
→ Semantic IR / evaluator
→ equivalence planner
→ target adapter/runtime
→ synthetic oracle
→ real-plugin regression
→ target validator
→ canonical
→ full Catalog audit
```

禁止：

```text
先改某个插件成品
→ 为了让它通过写插件特判
→ 再补测试/规范
```

---

## 21. 领域迁移检查点（2026-10-03）

已完成：

- `rewrite.mjs`：合并 Rewrite v2 parser、Legacy/V2 IR、源 action registry/validation；target-only QX primitives 与 planner result 留在 target mapping domain。
- `rewrite-qx.mjs` / `rewrite-surge.mjs`：从 IR condition/operations 构造 lowering view，不读取 provenance AST；Legacy planner 从 condition/operation 取数据。
- `script.mjs`：合并 Legacy/V2 source parser 与 Script IR，提供统一 `parseScriptDeclaration`。
- `script-target.mjs`：合并 QX/Surge、Legacy/V2 target adapters 与 action selector，读取 Script IR；`sourcePayload` 仅作为 provenance。
- `configuration.mjs`：General/MITM 进入 target-neutral IR，再执行目标适配；hostname 顺序、排除项、通配符、端口保持原样，MITM/MitM 两段及尾部注释均保留。
- 删除旧的 `rewrite-v2` / `rewrite-ir` / `rewrite-v2-actions` / `rewrite-plan-result`、`script-v2` / `script-legacy` / `script-ir` / `script-qx` / `script-surge` / `script-v2-target` 与 `mitm` 碎片文件；公开函数通过 `index.mjs` 保留。
- 修复 Upstream Monitor 对已删除 spec/rule 测试的引用；每日 schedule 已暂停，保留手动触发。
- 删除漂移的 Python target validator/allowlist，政策 CLI 统一调用正式 QX/Surge validators，metadata 检查并入 metadata domain；CI 使用 `--all` 避免仅校验变更文件导致零目标通过。

尚未完成，不能据此宣称全行为等价或删除生产兼容 planner/runtime：

1. Phase D：将现有 runtime emitter 迁到共同语义 runtime；引入 request/response phase dispatcher，解决同 phase 首条 Script 命中限制。
2. Phase E：扩展 reference evaluator 到 actions，加入完整行为 oracle、flag/capture fuzz、Catalog differential 与 canonical regeneration。
3. Phase F：仅对已通过 oracle/canonical/validator 的能力删除旧 compatibility lowering；当前 `compileRegexForTarget` 与 Script option 省略策略仍属历史兼容路径，未被本次领域整理证明为等价。

本检查点记录完成边界，不取代 §§19–20 的迁移阶段与验收顺序。恢复 schedule 必须单独明确执行，不能由迁移提交自动恢复。

验证检查点：

- 固定输入 Catalog 287 项的 QX/Surge 文本及 generated helpers 与迁移前相同。
- 使用当前原作者 Source Script/JQ/mock 依赖再次对比：287 项 target validator 通过、迁移差异 0、canonical drift 0。
- 以下原作者 Script URL 返回 HTTP 404，未取得源代码，未镜像或改写 URL；这两项原脚本审查仍未完成，不应标记全量上游依赖验证完成：
  - `https://kelee.one/Resource/JavaScript/EasyBike/mobileconfig-gateway.js`
  - `https://kelee.one/Resource/JavaScript/CommonScript/replace-body.js`
- QX/Surge 官方 capability drift gates、generated helper runtime/ref、原作者 Script URL preservation、repository audit、managed cleanliness 均通过。
- 政策 CLI 全量验证 574 个目标通过；daily schedule 保持暂停。

GitHub 落地检查点（2026-10-03）：

- 迁移检查点通过 `work/upstream-domain-migration` 推送，并经 PR #135 合入 main；最终 Converter Check #995 全部通过。
- 141 个非 main 分支的提交全部保存在标签 `archive/branches-2026-10-03-37132780544-1`；归档树内 `.github/branch-archive.json` 记录分支名与原提交 SHA，所有原提交均为标签的可达祖先。
- 一次性清理任务成功删除这 141 个分支，仅保留 main；临时清理 workflow 在本次收尾中移除，不新增后续分支或定时任务。
- 补回并测试架构整理遗漏的公开 `materializeConversionContext` 导出；198 个迁移前公开导出全部保留。
- WayX 工作审查自动活动保持关闭；Upstream Monitor 的 schedule 继续暂停，仅保留 workflow_dispatch。

续接顺序：先复查上述两个上游 404，再执行 §19 Phase D/E；完整语义证明通过后才执行 Phase F。当前领域整合检查点不会自动恢复定时任务。

## 22. 当前迁移期兼容声明

main 中现有 converter 在 Phase B–F 完成前继续承担生产转换。

如果当前实现与本 v1.60 新规范冲突：

- 不立即在同一个结构 PR 中强行改动 canonical；
- 在后续语义 PR 中按新顺序迁移；
- 新代码不得继续复制旧的静默降级行为；
- 特别是 Regex `i/m/s` 的“无条件丢弃”已经被本规范废止，后续必须进入等价实现或 unsupported。

这条兼容声明只用于控制迁移风险，不代表旧行为继续被认为正确。


## 23. 领域文件合并检查点（v1.60，2026-10-03）

将 45 个生产实现 `.mjs`（含原公开入口）缩减为 10 个领域实现加 1 个公开入口；不保留旧路径转发文件。
原 36 个测试文件缩减为 10 个领域套件；原测试逻辑与进程隔离均保留，可用 `--case=<原测试名.mjs>` 单独复查。同步迁移测试、生产 sync-convert、canonical/报告/校验 CLI 与 README 索引等调用；结构契约限定这 11 个实现文件与 10 个测试套件，禁止重新引入已删除碎片。

验收必须覆盖：公开导出列表与合并前完全一致、全套现有测试通过、固定输入 Catalog 转换和 generated helper 文本逐项无差异、原作者 Source Script/JQ/mock 上下文对比、目标 policy/audit/managed cleanliness、GitHub Converter Check。
定时活动继续暂停。本次没有实现或宣称 §§19–22 中尚未完成的 phase dispatcher/action oracle/兼容路径替换。

本地验证结果：

- 统一入口的 221 个公开导出与合并前完全一致；10 个领域测试套件承载原 36 个独立案例，全部通过。
- 固定输入 Catalog 287 项的 QX/Surge 与 generated helpers 文本逐项完全相同。
- 使用当前原作者 Source Script/JQ/mock 依赖，分别执行合并前后 materialization 与 conversion：287 项通过，上下文差异 0、转换差异 0、canonical drift 0。
- 574 个生成目标政策检查、repository audit、managed cleanliness 均通过；两条原有上游 Script 404 仍按 §21 记录，不伪称取得原脚本。
