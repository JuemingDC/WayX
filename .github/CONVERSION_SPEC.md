# WayX Conversion Specification

版本：1.69
作者：chance  
状态：**唯一权威转换规范（Authoritative）**  
迁移状态：**领域合并完成；通用 Loon 特性合集及 Header/Body/JSON phase dispatcher 已迁移；文本请求 mock 与固定 JQ 子集（含文件依赖）已纳入共同阶段编译；未证明等价的组合继续保留兼容边界**

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

QX 的 enable 例外：按用户明确要求，默认关闭、固定 false 和动态开关均强制生成活动 Script 声明，并注明用户策略覆盖。Surge 不采用此覆盖。注释掉的源行仍保留注释。

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

以下为 v1.60 领域迁移时的历史待办；§§24–29 已部分落实 Phase D/E，仍不能宣称全行为等价或删除所有生产兼容 planner/runtime：

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

如果当前实现与本规范冲突：

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

GitHub 落地（2026-10-04，Asia/Shanghai）：PR #136 已合入 main，最终 Converter Check #997 全部通过。全仓库 `.mjs` 从 89 个降为 29 个，净减少 60 个文件；既有转换内容目录与安装索引无变更。远端只保留 main 和 test，定时活动保持暂停。


## 24. 新语法运行时修复（v1.61，2026-10-04）

### 已完成的能力边界

- 条件 helper 使用 `core.mjs` 的共同 source evaluator，QX/Surge 不再各自丢弃 `i/m/s`、将缺失 header 当作空字符串或在失败 AND/OR 分支泄漏 captures。类型比较沿用源 IR；不得用 `Number(undefined)` / `String(null)` 模拟源类型。
- Header/Body replacement helper 保留原 regex body 和 flags，使用源 `$0` / `$n` 替换契约。条件 captures 与 action-owned captures 独立。缺失的可选 condition capture 跳过当前 action，后续 action 继续。
- QX Header helper 已合入共同 mutation renderer，删除重复 condition equality/variable lowering 与旧 Header emitter。原 221 个公开入口名称保持不变，不增加领域文件。
- 同 phase 的新语法 Header set/del/replace、Body replace、JSON add/delete/replace：当需要 helper，且所有活动声明均能由共同 runtime 表达、没有原作者 HTTP Script/legacy Rewrite/argument transport 冲突时，生成一个 `phase-dispatcher`。按源声明及 action 顺序执行；后一条条件读取已提交的 header/body；每条声明重新建立 capture namespace；整个阶段只 `$done` 一次，全部未命中返回 `{}`。Guarded matcher 与阶段 dispatcher 的无 URL 约束 prefilter 使用 `^`，不得因大写 URL scheme 产生 false negative。
- QX echo-response 不允许把未经证明为精确的 condition 降为宽 matcher 后安全 no-op；Header/status/OR 等无法精确匹配时保留源声明并 Review。
- 用户明确要求 Quantumult X 强制启用默认关闭的 Script。QX Legacy / v2 HTTP Script 与可表示的 cron task 均忽略源 static/dynamic enable 的关闭值，保留原作者 URL，生成活动声明，并注明 `Source enable forced to enabled for Quantumult X by user conversion policy`。此为用户要求的策略覆盖，不宣称源开关行为等价；不存在 QX 原生 enable 字段。Surge 仍遵循源 static/dynamic enable。注释掉的源行不会被复活，无法表示的 trigger/condition 仍走既有目标限制。
- enable 变量只控制被用户覆盖的开关，不因缺失该默认值而停用 QX Script；其它未声明的动态 option references 不再被忽略。

### 正常转换保护与兼容边界

用户要求既有正常转换不受影响。`compileRegexForTarget` 对历史 native lowering 显式返回 `compatibilityUnverified`；`requireEquivalent=true` 会拒绝目标无法表达的 source flags。新 guarded matcher 不把带 flags 的 URL condition 当作精确 matcher，也不改变 regex body。既有 native JQ、reject、Map Local、原作者 Script 的 flag lowering 暂时保留，不能标为 `native-equivalent`，不能以有限 oracle 代替官方目标能力证明。

同 phase 包含 JQ/echo/URL/duplicate-header、legacy Rewrite 或原作者 Script 时，禁止复制原作者 JavaScript 到 dispatcher。现有单 URL matcher helper 保留原 URL prefilter 和活动转换，并注明 `COMPATIBILITY LIMITATION`；这条路径仍不能保证 source flag 等价或多条 HTTP Script 全部执行。无法保留单 URL prefilter 的新 compound condition 则 Review。上述限制是迁移边界，不是已完成语义能力；继续迁移时必须按 §20 验证，不得为消除 Review 而编造字段。

### 验证要求

- 现有全部 10 个领域测试套件继续通过；原公开 export 名称和领域布局不变。
- runtime suite 必须运行 source action oracle 对两种 target adapter 的差分：全部 8 组 flags、大小写/换行/大写 URL scheme、condition captures、action `$0/$n`、缺失/空 headers、后续 condition 读取前序修改、全未命中、单次 `$done`、最终 helper 引用。
- End-to-end golden 只能在独立行为断言通过后更新；QX enable=false / Boolean default=false / cron enable=false 必须生成活动声明，Surge 对应关闭逻辑必须保留。
- Catalog 逐项独立 materialization、转换差分、canonical regeneration、574 目标校验、managed cleanliness、原作者 Script URL preservation、官方 capability drift gates、GitHub Converter Check 均需通过。

定时活动继续暂停；远端只允许 main 与 test。


本轮本地验收：10 个领域套件通过；新增 76 组跨 QX/Surge runtime 差分通过；287 项 Catalog materialization 上下文差异为 0，转换与 validator 全部通过，15 项因 helper/启用策略/兼容注释产生预期差异，新增 Review 为 0。当前 574 个受管目标、QX 289 / Surge 288 repository audit、managed cleanliness（Kelee 275 / 全部 287）、原作者 Script URL/ref/黄金断言通过。两条既有 Kelee 上游 Script 404 保留；Sub-Store 远程 release 的一次读取超时只记录 source fetch failure，不替换其原 URL。定时活动没有恢复。


## 25. 通用 Loon 新特性合集（v1.62，2026-10-04）

复杂语法不再以 action 数量或插件 ID 作为能力单位。`rewrite.mjs` 从原条件和 action AST 识别 Regex flags、条件分组、模板、捕获、特殊字符、批量参数、运行时值与顺序；原生可表达的固定子集继续使用 native lowering，需要语义运行时的 Header/Body/JSON 进入同一个特性编译器。生成规则直接引用 `features_<target>_<hash>.js`，同阶段需要顺序合并时引用 `phase_<target>_<phase>_<hash>.js`。删除被共同编译器覆盖的三个重复 Header/Body handler；阶段 dispatcher 只嵌入一份共同 condition/Regex runtime，各声明保持独立 captures 和可变上下文，避免按声明重复复制核心；公开入口、11 个生产领域文件和 10 个测试套件保持不变。

### 特性及执行约束

| 源特性 | 实现 | 边界 |
| --- | --- | --- |
| URL/条件/动作 Regex `i/m/s` | helper 使用原 pattern 和 flags；宽 matcher 只负责触发，条件重新求值 | 仅在能拥有整个阶段时迁移旧 native flag 路径 |
| 双引号 `${...}` | 从原始 token 解析转义及变量；条件和 action 均支持内置 URL、method、status、header、已声明参数 | Header 名称与 JSON key path 支持相同 String 模板及直接 String variable；未知变量保留 Review |
| `\${`、`\\`、引号、换行、Tab、Unicode、斜线与 `$` | 保留原始 token，使转义模板和转义反斜线后的模板不混淆；只展开一次 | 不把字符串中的输入当作可执行代码 |
| raw string、双 backtick | 原样保留反斜线和 `${...}`；JSON Any 中仍为 String | 不将 raw JSON 文本偷偷改为 Object/Array |
| condition captures / action `$0/$n` | 独立作用域；捕获 alias 校验唯一性、参数冲突、路径必达与下标 | 未匹配的可选 capture 只跳过当前 action；不清除已有 Header/JSON 值 |
| 批量数组与多 actions | 参数逐项配对，按源配置顺序执行；失败的 action 不阻止后续 action | 混合 scalar/array、空数组、嵌套数组、不同长度仍非法 |
| 多 Rewrite 与多类型组合 | 共同 Header set/del/replace、Body replace、JSON add/delete/replace runtime；前序结果提交后供下一条条件读取 | JQ/echo/URL、legacy Rewrite、原作者 HTTP Script 不能未经证明并入 dispatcher |
| Surge 重复 Header | `full-header-mode=true`，完整数组保留重复项与顺序；同阶段成员统一使用数组适配器 | 重复 Header 的 source 字段查找/模板值未有明确文档，包含此读取的组合不启用；QX 继续旧 native add/注释边界 |
| Surge 参数组合 | 阶段参数取并集，沿用类型化 JSON argument transport；每条声明独立 captures | QX 参数不能被冻结为默认值以假装等价 |
| QX Body owner 的 Header-only 命中 | 同时返回当前未改动 body；所有条件未命中仍返回官方 no-op `{}` | 不输出只含 headers 的 response-body 修改结果 |

内置 Header 模板读取当前 action 序列已经修改的 Header；条件读取该条声明开始时的上下文。String 模板与直接 Any variable 保持区别：`${response.status}` 直接作为 JSON value 保留 Number，双引号模板得到 String。

### 等价边界与正常转换保护

官方依据：Loon Rewrite v2 文档的 template、capture、batch、URL range 和配置顺序；Quantumult X 作者仓库 `crossutility/Quantumult-X` 的 `rewrite.md`、request/response Header 与 Body 样例；Surge HTTP Request/Response 文档的 `$done`、first-match、requires-body、full-header-mode。Node VM 和 source oracle 验证生成代码的声明内行为，并不证明客户端的全部网络、压缩、编码、缓冲和 engine 边界。Surge chunked/Expect 请求、body 上限及目标 body 编码限制继续适用。

若同阶段存在原作者 HTTP Script、legacy Rewrite 或共同编译器不能承载的 JQ/echo/URL/重复 Header 组合，不能仅因新特性识别而把旧 native declaration 移到 HTTP Script，避免 first-match 改变已有功能。这类源保留旧 native 兼容路径及 §24 约束；旧 helper 的 URL prefilter 与兼容说明仍保留。新 template/type/capture 不得输出未展开的可执行值。无等价方案时按既有规范 Review、注释或忽略，不复制原作者脚本、不编造目标字段。单条 redirect 的已声明 plugin 参数属于已知 QX transport 限制，保留目标限制注释及原声明，不继续生成带字面 `${app}` 等未展开参数的跳转地址；非终结 mutation 的参数继续现有 Review 策略。

动态 `~= ${pattern}` 的 flags/源 engine 契约、QX 任意 origin 的透明 URL 改写、Surge URL helper 的 Host 自动同步、完整 JQ 与异步作者 Script 的组合尚未证明，本轮不启用近似实现。URL 的原 matcher、capture 与 matched-range/unmatched-range 语义必须保留，不能以完整 URL 字符串替换冒充范围替换。

QX 默认关闭及动态 enable 的 Script 继续按用户授权强制启用，原作者 URL 不变；Surge 的源 enable 不变。源注释不会复活。定时活动继续暂停，远端最多 main/test。

### 验证

`loon-feature-semantics.json` 是按独立预期结果编写的通用特性合集，不能加入插件名称专用分支。runtime suite 在完整 conversion 后运行实际被引用的 helper，覆盖 String/raw/type、转义与捕获、批量与顺序、JSON 失败继续、QX Header-only Body owner、Surge duplicate Header 与 typed argument phase。保留既有 76 组 source oracle 差分、全部领域套件和 Catalog/目标政策/原作者 URL/managed/audit/官方 drift/CI 验收。End-to-end golden 仅在独立行为断言全部通过后更新。

本轮验收记录：18 个通用 source 案例在完整 conversion 后运行 QX/Surge 引用的 helper，共 36 个独立预期输出断言；原 76 组 source oracle 差分继续通过。补充大小写不同的 Header key 的 set/replace 行为、未匹配 capture 保留原值、参数/template transport、first-match 兼容保护及 duplicate Header 读取拒绝用例。287 项目录独立依赖 materialization 的上下文差异为 0，转换与 validator 全部通过，50 项 helper/目标存在预期变化，新增 Review/Issue 为 0；两个既有 Kelee 作者 Script 404 不改变原 URL；Sub-Store 三个 GitHub release Script URL 的读取超时同样只记录 fetch failure，输出地址不变。Telegram 的两条 QX 参数重定向改为已知目标限制注释，删除原先会输出未展开 `${app}` 的 helper；Surge 转换保留。没有放宽 managed Review/Issue 门禁，也没有恢复定时活动。


## 26. 动态操作地址与 JSON 自有属性（v1.63）

Header 名称和 JSON key path 使用共同 String lowering，支持条件捕获、内置变量及 Surge 已声明参数。模板只展开一次；直接 variable 必须在执行时得到 String，JSON Any variable 仍保留原类型。QX 参数 transport、阶段所有权、动态 Regex 及透明 URL 改写继续遵循既有边界。

每组批量操作先求值全部参数，再进行修改。缺失 capture、运行时类型不符或动态路径无效只跳过该组，后续操作继续。固定路径在转换时验证；动态路径使用同一个 `parseJsonKeyPath` 在运行时解析，不另建目标专用语法。Header/JSON 地址读取当前操作或上一条同阶段规则已完成的修改。

JSON 查询和遍历仅识别自有属性；`__proto__`、`constructor`、`toString` 均作为普通 JSON 键处理。创建属性使用安全的自有属性写入，禁止修改原型或读取 JavaScript 继承属性。Header 对象写入同样保持自有字段。JSON 根为 null 或标量时不修改原始 body；无法解析的动态路径也不重新序列化 body。数组删除仍按顺序移动下标；add 允许在缺失或 null 的父节点建立容器。

验收新增独立预期结果涵盖动态地址、可选捕获、批量失败继续、数组删除、特殊键、类型失败和跨声明顺序；Surge 参数用例验证类型保留与单次展开。保持 11 个生产领域文件、10 个测试套件和 221 个公开导出，不新增零散生成类别。


## 27. 文本请求 mock 的阶段组合（v1.64）

`request.body.mock` 和 `request.body.mock_file` 的文本子集进入共同特性编译器；固定内容类型为 json/text/css/html/javascript/plain，Base64 必须省略或固定 false。QX 使用 script-request-body，Surge 使用 requires-body=true 的 http-request。这里只替换发往上游的请求体，不生成 response，也不终止后续请求规则。

Mock 在源 action 位置执行，随后 Header/Body/JSON 操作继续读取已修改的状态；同一阶段的所有可组合声明共用一个 dispatcher。允许多次 inline mock 按顺序覆盖；每条声明最多一个 file mock，跨声明的文件分别按原 URL 在转换时获取。文件内容直接作为文本嵌入，不作模板展开、不执行 JavaScript；生成 helper 保留源文件 URL 注释。没有 materialized text 时保留 Review，不生成缺失文件的活动 helper。

Inline body 使用共同 String lowering，支持捕获、内置变量和 Surge typed argument；缺失值或类型不符只跳过当前 mock，已有 body/Content-Type 不变，后续 action 继续。文本 mock 的 Content-Type 使用已有 MIME 映射和大小写不敏感 Header setter；Surge duplicate Header 遵循 full-header-mode 的已验证子集。

删除 QX 专用 request-mixed handler，改为统一 features/phase 生成类别。保留公开旧 renderer 供 legacy、binary/Base64 兼容适配，不把它们混入文本阶段。响应 mock 的 request/response 时机及终结行为仍按原规范处理；动态内容类型、同声明多个 file 依赖、二进制/编码体和异步作者 Script 组合不在本次等价子集。

目标的请求体 API 仍受原平台契约约束：Surge 的 chunked、Expect: 100-continue、大小上限及 framing 约束不由转换器改写或绕过。不会为这些限制增加虚构字段或宣称所有网络传输情况均可等价。本次仅扩大已验证的同步文本操作组合，保留原有兼容边界、QX 强制 enable 策略及暂停的定时活动。


## 28. 同声明多文件依赖（v1.65）

共同文本请求阶段现在支持一条 Rewrite 中的多个 `request.body.mock_file`。多文件 materialization 使用 `byAction` 对象，键为原 AST 的绝对 action index；Header/Body/JSON 或 inline mock 插入在文件动作之间不会改变绑定关系。单文件仍返回旧的 bodyText/bodyBase64/sourceFile 格式，旧调用方及公开导出保持兼容。多文件声明不得重复使用一个旧单文件对象作为所有文件的内容。

每条多文件声明内，规范化后相同的原 URL 只获取一次，包括失败结果；各 action 保存独立依赖记录。请求体修改不改变缓存中的原文本，再次 mock 同一文件会恢复原内容。跨声明及跨阶段仍保留原有获取契约，不扩大 snapshot 范围。原 URL 保留在依赖数据与生成 helper 注释中，文件文本不展开变量、不作为代码执行。

每个失败依赖记录自己的 action index、错误及可解析的 URL，声明顶层汇总 error。任何依赖缺失或获取失败时，按原 fail-closed 规范保留整条源声明及 Review，不生成猜测内容或仅执行部分 file actions 的 helper。响应多 mock、二进制/Base64 多文件组合仍不属于该阶段的可表达子集。

V2 文件地址必须是固定 String/raw String；双引号内的动态模板明确拒绝 materialization，不尝试获取含未展开模板的 URL。escaped template 和 raw String 中的 `${...}` 是普通文件名内容，按共同字符串解析后解析 URL。动态文件地址不会被参数默认值冻结；JQ/mock 的文件地址使用同一个静态校验。其它动态 Regex、透明 URL 和作者异步 Script 的边界继续保留。

§27 的每条声明单文件限制由本节的动作索引绑定替代。验收涵盖不同文件、重复相对地址、插入动作、重复 mock 恢复原内容、空文本、字面模板路径、失败去重与保守 Review；仍使用原 features/phase 类别，不增加生产领域文件或公开入口。


## 29. 固定 inline JQ 的共同阶段适配（v1.66）

新增严格解析的 JQ 子集：`.`、顶层字段常量赋值（`.name = JSON` 或 `.["name"] = JSON`）、单字段删除 `del(.name)` / `del(.["name"])`，以及这些操作以 `|` 组成的管道。标识符与双引号字段允许两种写法；JSON 常量可以包含对象、数组及普通标量。生成代码只执行编译后的操作数据，不执行源 JQ/JavaScript 文本。超出 JavaScript 安全整数范围的常量保留原生路径，不在转换时静默取整。

这些 inline JQ actions 可进入 Header/Body/JSON/文本请求 mock 的共同 features/phase runtime。每个 JQ action 独立读取当前 body；无效 JSON 或对象字段类型错误只跳过该 action，body 保留 action 开始前的值，后续 action 继续。恒等表达式接受任意有效 JSON；null 的字段赋值创建对象，null 的删除保持 null；字符串、数字、Boolean 和数组的对象字段操作失败。字段写入使用 own property，包括 `__proto__` 等普通 JSON key，不修改原型。一个 JQ action 内的多个操作全部成功后才提交；不同 action 之间的已完成修改不会回滚。

任意 JQ、动态 JQ、嵌套 selector、多输出、select/map/算术/条件及 jq_file 尚未纳入该适配器。它们仍阻止同阶段整体迁移，保留既有 native/compatibility/Review 策略；原作者 HTTP Script、Legacy、终结 Rewrite 的组合限制继续适用。该子集不能用于宣称全 JQ 解释器或真实客户端传输边界已实现。定时活动继续暂停，QX 强制 enable 政策不变。

阶段收尾状态：Phase D 已覆盖共同同步 Header/Body/JSON、文本请求 mock 与本节固定 inline JQ；其余 action/作者 Script 的全阶段调度仍未完成。Phase E 已有条件/action oracle、独立预期输出和本节真实 jq 差分，尚缺完整语法组合随机验证及真实客户端边界验证。Phase F 仅删除已被这些检查替代的旧实现，历史 native flag/Script options 等兼容路径仍需逐项证明。§27 的单文件限制已由 §28 替代，动态及二进制限制继续保留。


## 30. JQ 文件动作绑定与 golden 精简（v1.67）

`jq_file` 和已接受的历史 `json.jq("jq-path=...")` 依赖现在可与其它同阶段动作组合。单动作依赖仍保留 content/sourceFile/legacyAlias 格式；多动作声明使用按绝对 action index 绑定的 byAction，不允许旧单动作对象被复用为多个文件。声明内相同规范化 URL 的获取结果（包括失败）只获取一次，跨声明仍遵循原有获取契约。失败项保留索引及可解析的 URL，汇总错误；任意缺失、空内容或获取失败使整条声明进入 Review，不输出部分文件动作的 helper。

获取的 JQ 内容以 raw String 数据进入语义 IR，不把文件文本中的 `${...}` 当作 Loon 模板进行二次展开。目标规划与 phase eligibility 使用同一套已解析依赖的 AST。§29 的固定 JQ 子集可进入共同 features/phase dispatcher，并在生成 helper 中保留原 JQ 文件 URL 注释；任意 JQ 仍遵循既有 native/compatibility/Review 边界，不假设所有文件表达式可在 JavaScript 中执行。参数/Regex、原作者 Script、Legacy 及终结动作的限制不变。

仅保留被端到端 conversion suite 使用的 end-to-end-golden.json（固定日期下的输出摘要、大小、段落和 helper 数量），不将其作为语义等价证明。删除重复的 MyBlockAds 专用 golden 文件及专用测试：同插件已在端到端快照中覆盖，通用 JQ 文件 materialization、原文保留、原生目标及完整目录 canonical/audit 门禁继续覆盖对应转换链。行为验证继续由独立预期输出、source oracle 与真实 jq 对照承担。定时活动继续暂停，main/test 分支预算及 QX 强制启用政策不变。


## 31. 固定 JQ 嵌套对象路径（v1.68）

§29–30 的 JQ 常量赋值及单路径 del 扩展至固定嵌套对象字段，如 `.data.ads = []`、`.["data"]["a.b"].flag = true`、`del(.data.ads)`。只接受标识符字段和 JSON 双引号 bracket 字段组成的对象路径；数字索引、数组遍历、slice、可选 selector、动态路径、多输出及任意表达式仍不属于共同 runtime 子集。路径不是 Loon JSON key-path，不以其创建/replace 规则代替 JQ。

JQ 赋值将缺失或 null 父字段创建为对象，并覆写最终字段；标量或数组父节点导致当前整个 JQ action 失败。删除缺失或 null 路径不创建对象；标量或数组父节点同样失败。每个 JQ action 在独立解析的当前 body 上执行，全部子操作成功后才提交，因此前面的 pipe 修改也会随本 action 的后续失败一起回滚；不同 action 已提交的修改保留，后续 action 继续。所有字段访问使用 own property，写入不触发 `__proto__` setter。Inline/file JQ 共用同一个解析器与适配器，不新增插件特判或生产文件类别。原顶层子集生成文本保持兼容。

验证以独立 jq 程序为预期输出，覆盖对象/null/缺失/标量/数组、字段转义、quoted bracket、原型名称和动作内回滚；完整 conversion 检查 inline/file 与 Header/Body/JSON/请求 mock 的阶段顺序。已有完整目录、validator/canonical、source URL 和 CI 门禁继续执行。数字精度、压缩/编码/缓冲等既有客户端边界不因路径扩大而消失；定时活动继续暂停，QX 强制 enable 及 main/test 分支预算不变。

注释掉的 Rewrite 不因新 JQ 子集而迁移为宽 matcher helper；其可表示的 native 注释仍走兼容规划，保持关闭并避免为注释新增无用的 JQ helper。完整目录验收允许仅已证明的新嵌套子集产生预期 helper 更新，逐项记录而不声称输出始终不变。


## 32. 用户指定的原生优先策略（v1.69）

目标软件支持的原生表达优先于生成脚本。单条固定 inline/file JQ（包括表达式内部的 pipe）优先保留原 URL matcher，并映射到 QX jsonjq-request/response-body 或 Surge http-request/response-jq；不得因 JQ 可被 JavaScript 编译、嵌套字段、Regex flags 或同阶段其它规则而自动迁移为 Script。原生 matcher 无法表达的纯 JQ 声明按既有 Review/注释规范处理，不以宽 matcher 脚本绕过。原 flags 的 native 兼容限制仍须如实保留，不宣称本策略证明 flags 等价。

纯多 JQ action 在已证明固定单输出子集内可合成原生 JQ：每个 action 使用独立输入变量及 try/catch，使该 action 失败时返回其动作开始前的输入，再执行后续 action；任意多输出 JQ 不猜测合成。独立原生 JQ 不得被其它 helper 的 phase dispatcher 吸收。只有原生无法承载的多类型动作组合（例如 json.jq 后 header.set/add、Body/mocks 等）才考虑共同 Script；此类 helper 保留原单 URL regex，阶段合并仅限所有成员具有相同 URL regex，不能将多个独立 URL 规则无条件扩为 `^`。其它组合仍保留原生/compatibility/Review 边界。

Mock 同样原生优先：Surge 可原生表达的 Map Local、QX echo-response 的原生文件能力仅在本地资源契约可满足时适用，不把远程 URL 假装成本地文件。目标缺少相应原生能力的 inline/mock/组合允许必要的 Script fallback，不因原生优先而删除有效功能。原作者脚本、QX 强制 enable、关闭注释及暂停的定时活动不变。§31 中 Jump 的两条规则迁移为 dispatcher 的决策撤销：恢复原 native JQ 规则及对应 matcher/Surge requirement，并删除新增的两份阶段 helper；嵌套 JQ 编译器仅保留供真正必要的组合使用。此节优先于 §§24–31 中与该用户策略冲突的自动 phase 迁移选择。
