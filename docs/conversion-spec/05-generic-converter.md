# Block 05 — 通用转换器架构与自动化契约

## 5.1 目标

WayX converter 的目标不是“把若干已知插件转换好”，而是：

> 对任意符合当前 Loon 官方语法、且目标平台存在可证明等价表达的陌生插件，在不增加插件专属代码的前提下，自动生成正确的 Quantumult X snippet 与 Surge module。

插件名、作者、来源仓库、URL 路径、文件名只能用于：
- 下载源文件；
- 生成目标文件名；
- metadata；
- 日志与审计。

这些信息**不得决定 Rule / Rewrite / Mock / Script / MITM 的转换语义**。

禁止在生产 converter 中出现此类逻辑：

```js
if (plugin === "YouTube") ...
if (entry.id === "Bilibili") ...
if (/RuCu6/.test(sourceUrl)) ...
if (/youtube\/response\.js/.test(scriptUrl)) ...
```

测试 fixture 可以使用真实插件名，但测试不能要求生产代码按插件身份分支。

## 5.2 输入模型

converter 输入固定分为两类：

### A. Source Descriptor

只描述资源身份与输出位置，例如：

```json
{
  "id": "Example",
  "file": "example.lpx",
  "source": "https://example.com/example.lpx",
  "qx": "Example.snippet",
  "surge": "Example.sgmodule",
  "category": "去广告"
}
```

Descriptor 不得携带“此插件应该怎样转换”的语义开关。

### B. Source Content

真正决定转换行为的内容：
- header metadata；
- `[Rule]`；
- `[Rewrite]`；
- `[Script]`；
- `[Argument]`（QX 仅用于依赖分析；Surge 渲染为官方 Module `#!arguments` 参数表）；
- `[MITM]`；
- 引用的 JQ / mock file；
- 引用的 Source JavaScript（只读；不做 runtime compatibility 审查，仅在声明不足以判定 QX HTTP Script action 时辅助判断 header/body/echo 类型）。

## 5.3 固定处理流水线

每个插件必须经过同一条流水线：

```text
normalize source
→ parse plugin sections + source header metadata IR
→ group source declarations/comments target-neutrally
→ build semantic IR / AST
→ Rule converter
→ Rewrite converter
   ├─ legacy rewrite
   └─ Rewrite v2
→ Script converter
   ├─ legacy Script parser
   ├─ Script v2 parser
   └─ target-neutral Script IR → QX / Surge Script planner
→ MITM converter
→ target planner
   ├─ Rule: target native → unsupported type commented out（不走 Script fallback）
   ├─ Quantumult X Rewrite/Mock: native → dedicated helper → observed multi-action complex helper → commented Review/Issue
   └─ Surge Rewrite/Mock: native → dedicated helper → observed multi-action complex helper → commented Review/Issue
→ validator
→ source/target reconciliation
→ output
```

不得在流水线中插入“按插件名称修补结果”的步骤。

## 5.3.1 Source section / comment / metadata 分层

Plugin section orchestration 固定拆分为：

```text
raw source
→ source section parser
→ source-section item/comment grouping
→ source metadata IR
→ Rule / Rewrite / Script planners
→ target-specific comment / metadata renderer
→ QX / Surge output builder
```

约束：
- `source-section.mjs` 只识别“注释/空行/活动声明”及当前 converter 支持的 source section 名称，不包含 QX/Surge target 语法；
- `source-metadata.mjs` 只解析 `#!key=value` 与普通 header comment，不生成目标 metadata；
- QX 的 `{# note #}` 绑定属于 target-specific rendering，只能由 `qx-comment.mjs` 执行；
- Surge 不使用 QX inline-note 机制，继续按源顺序保留普通注释；
- unknown active source section 必须逐声明进入 Issue，对空 section/纯注释 section 不误报；
- orchestration 不得再维护上述 parser/白名单的第二份实现。

## 5.3.2 Target output builder

Planner 结果的“落到哪个目标 section、按什么 section 顺序输出、如何压缩空行、如何与目标 header 拼装”不属于 source orchestration，必须由 target output builder 管理：

```text
planner result
→ target output state
→ target section routing
→ target header + ordered sections
→ final text
```

固定边界：
- QX：`qx-output.mjs` 管理 `notes/filter/rewrite/mitm`；
- Surge：`surge-output.mjs` 管理 `notes/rule/url/header/body/map/script/mitm`；
- orchestration 不得维护目标 section 标题、顺序或第二份 section-key→array mapping；
- output builder 不得解析源 Rule/Rewrite/Script，也不得改变 planner 语义，只做目标结构化落段；
- generated helper Map 可以作为 output state 的附属物，但 builder 不生成 helper 语义；
- 纯架构迁移必须保持 byte-equivalent canonical 内容（转换时间戳除非真正 regeneration，否则不允许漂移）。

## 5.3.3 Plugin parser / conversion pipeline core

GitHub Actions / file I/O orchestration 与纯转换核心必须分离：

```text
raw Loon source
→ plugin-parser.mjs
→ parsed plugin {header, sections}
→ conversion-pipeline.mjs::convertPlugin()
→ Rule / Rewrite / Script / MITM planners
→ QX / Surge output builders
→ { qx, surge, generatedScripts }
```

职责边界：
- `plugin-parser.mjs` 是唯一整体 section parser，负责 BOM/newline normalization 与 `[Section]` 切分；
- `conversion-pipeline.mjs` 接受 entry/source/stamp 以及已经物化的 `parsed/scriptMap/mockFiles/jqFiles/rawBase` 等 context，不做文件或网络 I/O；production/canonical 必须复用 materializer 返回的 `parsed`，不得重复整体解析；
- pipeline 负责 unknown-section fail-closed、Argument analysis、Rule/Rewrite/Script/MITM dispatch、planner context 和 output builder 调用；
- `.github/scripts/sync-convert.mjs` 只负责原插件 source 获取、调用 `materializeConversionContext()` / pipeline、validator 与写文件；
- `regenerate-canonical.mjs` 必须直接复用同一个 conversion context/pipeline，而不是借道 sync 脚本取得转换核心；
- parser/pipeline 不得 import `fs`, `path`, HTTP fetch、Source Catalog 或 GitHub API；
- 外部依赖缺失时继续由既有 Review/Issue 语义 fail closed，不能由 pipeline 自行联网补取。

## 5.3.4 Conversion context materialization

外部资源物化固定为一条共享链路：

```text
entry + source
→ plugin-parser.mjs
→ dependency-materializer.mjs
   ├─ jq_file
   └─ mock_file
→ source-script-materializer.mjs
→ conversion-context.mjs::materializeConversionContext()
→ { parsed, scriptMap, mockFiles, jqFiles }
→ convertPlugin(..., { parsed, ... })
```

约束：
- `sync-convert.mjs` 与 `regenerate-canonical.mjs` 都必须调用同一个 `materializeConversionContext()`，并把其返回的同一个 `parsed` 显式传给 `convertPlugin()`；
- materializer 只从原插件 URL 或其相对解析出的原始 URL 读取，不使用 mirror/cache fallback；
- `dependency-materializer.mjs` 只做依赖发现/读取/校验，不决定 QX/Surge target action；
- `source-script-materializer.mjs` 只发现/解析/读取 Source Script，不做 runtime compatibility gate，不改写 URL；
- Source Script 正文读取失败时返回 `sourceError`，不自动禁用声明；
- context materialization 与 pure `convertPlugin()` 分层，后者继续保持零网络/零文件 I/O；
- `convertPlugin()` 仅为独立测试/调用方保留 `parsed` 缺省时的纯解析 fallback；production/canonical 路径不得依赖该 fallback。

## 5.4 Rule 转换器

`[Rule]` 固定分为三层：

```text
Loon Rule source line
→ target-neutral Rule AST
→ QX Rule planner
→ Surge Rule planner
```

Parser 只负责源语法，不得包含目标平台知识。至少解析并保留：
- 原始 source declaration；
- top-level / nested Rule Type；
- 原始 value field 与解引号后的 value；
- top-level Policy；
- Rule 参数（raw/name/value）；
- logical rule 的递归 children；
- nested/top-level 位置。

QX / Surge planner 只能消费 AST，不得再次对原始声明做 CSV 拆分、逻辑子规则拆分或插件身份判断。Parser 对未知但可结构化的 Rule Type 仍应成功产出 AST；某个逻辑组合是否合法、某 Rule Type 是否受目标支持，由 target planner/validator 决定。

转换决策只允许依赖：
- Rule Type；
- value / logical children；
- 参数；
- Policy；
- 目标平台官方能力。

目标 planner 的职责必须分离：
- QX planner：只按用户提供的 Crossutility 官方 sample 确认的 filter/rewrite 能力映射；
- Surge planner：按 `nssurge.com/llms.txt` 指定优先级核对官方 Manual，并保留合法 logical tree/Rule 参数；
- 任一目标不支持时按 Block 20 的 comment/Review/Issue 规则 fail closed，不允许修改 AST 来迁就目标。

## 5.5 Rewrite Semantic IR 与分型

Legacy Rewrite 与 Rewrite v2 **保留独立 source parser**，但 parser 完成后必须统一进入 target-neutral Rewrite Semantic IR：

```text
Legacy Rewrite source ─→ Legacy parser ─┐
                                      ├→ Rewrite Semantic IR → QX / Surge planning
Rewrite v2 source ────→ Rewrite v2 AST ┘
```

Semantic IR 只描述源语义，不携带目标平台语法。至少保留：
- `sourceSyntax`：`legacy` / `v2`；
- 完整 source declaration；
- phase / condition；
- 按源顺序排列的 semantic operations；
- 是否 source-authored pipeline；
- operation 的 normalized kind；
- 必须保真的 source-specific semantics。

特别注意：相同“类别”不代表可丢弃来源差异。例如 Legacy `302 TARGET` / `307 TARGET` 是完整 redirect target，而 Rewrite v2 `redirect(...)` 当前语义是基于匹配区间/template 的重写；IR 必须明确区分，target planner 不得只因为两者都叫 redirect 就共用错误实现。

Production orchestration 不再承担 target Rewrite 决策。它只负责 source parse、依赖物化、Semantic IR 构建与调用 `planQxRewrite()` / `planSurgeRewrite()`；不得直接 import target Rewrite renderer、complex registry 或用 action-name regex 决定 QX/Surge 路径。既有 native/helper renderer 作为低层实现由 target planner 调用，其输入必须来自 IR 所保留的 AST/semantic payload。

所有 Rewrite 必须先分类，再转换。至少分为：

1. **Reject**
   - reject
   - reject-200
   - reject-dict
   - reject-array
   - reject-img

2. **Redirect / URL Rewrite**
   - 302
   - 307
   - Rewrite v2 redirect

3. **Header Mutation**
   - request header
   - response header
   - add / set / del / replace / regex replace

4. **Body Regex Rewrite**
   - request body
   - response body

5. **JSON / JQ**
   - json delete
   - json replace
   - jq
   - jq_file

6. **Mock / Local Response**
   - mock-response-body
   - response.body.mock
   - response.body.mock_file
   - request body mock 类动作

7. **Script Declaration**
   - legacy http-request/http-response
   - Script v2

8. **Pipeline / Composite**
   - 仅指源 Loon 单条声明真实写出的 `ACTION1 | ACTION2 ...`；
   - 必须保持顺序和终止语义；
   - 禁止把相邻、同条件的独立源声明合并成 pipeline；
   - production complex helper 仅放行 Source Catalog 已观察并登记的 action signature。

9. **Unknown Rewrite**
   - 先判断目标原生格式能否严格保持语义；
   - 原生不足时才考虑对应的专用 helper；
   - 源生 multi-action 且 signature 已登记时才进入 complex helper；
   - 未知语法、未知 action、未登记 complex signature：**先注释源声明，再输出 `ISSUE REQUIRED`**；
   - 已知语义但目标能力不足：注释源声明并进入普通 Review；
   - 两类情况都不得静默猜测或生成“可能能跑”的活动规则。

Rule 不属于上述 fallback 链。QX 官方 sample 未确认的 Rule Type（例如逻辑规则、端口类等）直接保留为注释，不转换成 Script。

Unknown 与 Unsupported 必须分开：已知 Loon 语义、只是目标平台缺少等价能力，属于 Review；连源语义/语法类型或 complex signature 都未登记的内容属于 Unknown，必须携带 `ISSUE REQUIRED` 标记，以便自动化创建/复用议题。

## 5.5.1 Script Semantic IR

Loon `[Script]` 与 Rewrite 相同，source syntax 与 target planning 必须分层：

```text
Legacy Script source ─→ Legacy Script parser ─┐
                                            ├→ Script Semantic IR → QX / Surge Script planner
Script v2 source ─────→ Script v2 parser ────┘
```

Script IR 只保留源语义与必要 source-specific payload，至少包括：
- `sourceSyntax`：`legacy` / `v2`；
- 完整 source declaration；
- HTTP phase；
- URL pattern / condition；
- 原始 Source Script path/URL；
- argument；
- enable / requires-body / binary-body-mode / timeout / max-size / debug / tag；
- v2 AST 或 Legacy parser payload。

IR 不得包含 QX Script action、Surge `type=http-*`、目标 section 或 capability registry。Production orchestration 只构建 IR 并调用 `planQxScript()` / `planSurgeScript()`；QX action 选择、Surge 参数展开和目标能力判断全部归 target planner。

## 5.6 Target Planner

### Quantumult X

Rewrite 顶层入口固定为 `converter/src/rewrite-qx.mjs::planQxRewrite(ir, ctx)`；Script 顶层入口固定为 `converter/src/script-qx.mjs::planQxScript(ir, ctx)`。两个 planner 的目标决策均不得由 orchestration 旁路。

目标 planner 只能输出 Crossutility 官方 sample 已确认的：
- filter；
- rewrite action；
- script action；
- hostname。

QX 的功能最终都落在：
- commented `# [filter_local]`
- commented `# [rewrite_local]`
- commented `# [mitm]`

内部 IR 可以区分 URL/Header/Body/Mock/Script，但最终必须渲染为 QX 官方 snippet 支持的实际语法。

### Surge

Rewrite 顶层入口固定为 `converter/src/rewrite-surge.mjs::planSurgeRewrite(ir, ctx)`；Script 顶层入口固定为 `converter/src/script-surge.mjs::planSurgeScript(ir, ctx)`。两个 planner 的目标决策均不得由 orchestration 旁路。

目标 planner 必须按 Surge 官方能力分流：
- `[Rule]`
- `[URL Rewrite]`
- `[Header Rewrite]`
- `[Body Rewrite]`
- `[Map Local]`
- `[Script]`
- `[MITM]`

Loon Plugin Rule 的 `PROXY` 视为用户策略绑定：目标 Module 通过官方 Parameter Tables 生成 `#!arguments` 参数，并在 Rule policy 位置写入对应 `{{{...}}}` 占位符；不得固定替换成某个代理组名，也不得按插件身份特判。

不得把不同语义为了实现方便全部塞进 `[Script]`。

## 5.7 Mock / Map Local 原则

“本地直接返回响应”是一类语义，不等同于普通 URL reject。

Surge 官方存在 `[Map Local]` 时，优先用其原生表达 status/body/header/data-type。

QX 若存在官方等价 `reject-dict/reject-array/reject-img/reject-200`，优先原生；否则仅在规范允许时生成最小 helper。

## 5.8 Source Script 检查范围

Quantumult X 与 Surge **均不做 Source JavaScript runtime compatibility 审查**。Source Script 本体不因运行时 token、平台分支、作者、仓库或 URL 路径被启用/禁用。

固定规则：
- 目标声明直接保留并引用源插件中的原始 Script URL；
- 不 wrapper、fork、prepend 或改写 Source JavaScript；
- Script phase、`requires_body` 等声明已足以决定目标 action 时，不需要读取脚本正文；
- 只有 QX HTTP Script action 在声明不足以区分 header/body/echo 时，允许读取原脚本正文观察 request/response body 与 `$done` 返回形态，目的仅是选择正确的 rewrite action；
- 源码读取失败本身不构成“运行时兼容性” Review，也不允许切换到镜像 URL；但若 QX request-phase 因缺少源码仍无法区分 request mutation 与 synthetic response，则因 **action 类型无法确定** 进入 Review，禁止猜测；
- 任何源码读取结果都不得用于修改 Source JavaScript 或把 Rule 转成 Script。

兼容性是否由脚本作者自行跨平台处理，不属于 WayX converter 的判定职责。

## 5.9 Dependency Resolver

`jq_file`、`mock_file` 等依赖统一经过 dependency resolver：

```text
source action
→ resolve original URL/path
→ fetch original dependency directly
→ validate
→ materialize semantic content in memory
→ target planner
```

禁止在 action converter 内为单个插件写固定依赖内容；禁止把上游 JQ/mock/Source Script 作为 WayX 持久化镜像或 fallback。

## 5.10 自动化契约

GitHub Action 的职责：

1. 从 Source Catalog 获取待处理资源；
2. **只从 descriptor 中的原作者 `source` URL 下载/更新源插件；Catalog 不允许 mirror/fallback 字段；**
3. 对插件声明的 Source Script / JQ / mock dependency，**只访问声明或相对解析得到的原始 URL**；Source Script 不做 runtime compatibility 审查，仅在 QX action 类型需要补充判定时临时读取，不复制到 WayX，不改写目标引用；
4. 对每个资源调用**同一个 generic converter**；
5. 运行 QX / Surge validator；
6. 运行 source/target 对账；
7. conversion + target validator 成功的插件写入 managed Source/target/helper；
8. Review / Issue / hard failure 由自动 Issue proposer 跟踪；全局 audit/reconciliation 通过后直接提交 main。

Source Catalog 可以包含具体插件名和原作者 URL，因为它只是数据清单；converter source code 不得根据 Catalog 中的身份字段改变转换算法。

手工维护资产不进入 Source Catalog。当前 `QZXY` 由 `.github/manual-assets.json` 单独声明，canonical regeneration 不得创建、删除或覆盖这些路径；repository validator/audit 仍必须验证其目标格式。新增手工资产必须先登记该 manifest，避免“未被 Catalog 管理”与“意外漏管”混淆。

### 5.10.1 原作者源唯一原则

- 插件：只请求 `entry.source`。
- Source Script：只请求插件声明中的 `script-path` / `script("...")` URL。
- 相对 dependency：只按插件原始 URL 解析后直接请求。
- 禁止第三方 GitHub 副本、第三方镜像、备用域名和 fallback 链；若原作者官方 `source` 本身就是 GitHub/GitHub Raw，则该 URL 属于原作者源，可直接使用。
- Plugin/JQ/mock 等转换必需源不可达：本轮失败并进入 Review，不切换副本。Source Script 正文读取失败不因“兼容性未知”禁用原始 URL；若 declaration 已足以确定 action 则继续转换，若 QX request-phase action 仍有歧义则仅该 QX 声明 Review。
- QX/Surge 中的 Source Script URL 必须继续指向源插件声明的 URL。
- WayX 允许生成自己的 **helper script** 来补足目标平台缺失的 Rewrite/Mock 语义；这种 helper 是 converter 输出，不属于 Source Script 镜像。

## 5.11 陌生插件验收测试

converter 必须具备 identity-invariance 测试：

对于语义内容完全相同、但以下身份字段不同的两个输入：
- id
- name
- author
- source URL
- filename

除 metadata、生成脚本路径和目标文件名外，转换产生的有效 Rule/Rewrite/Script/MITM 语义必须相同。

必须至少维护一组**纯合成陌生插件 fixture**，覆盖：
- Rule；
- reject；
- redirect；
- header；
- body；
- JQ；
- mock / Map Local；
- Script；
- MITM。

这组 fixture 不允许依赖任何真实插件名称。

## 5.12 生产代码审计

CI 必须审计生产 converter，禁止出现已登记插件身份驱动的语义分支。

真实插件可以作为 regression fixture，但新增真实插件不应要求修改 converter；只有出现**新的语法类型或新的目标能力**时，才允许按以下流程修改：

```text
官方依据
→ CONVERSION_SPEC
→ generic parser / semantic converter
→ synthetic tests
→ real-plugin regression
→ canonical output
```

## 5.13 自动转换实现

- Source Catalog schema/validation：`converter/src/source-catalog.mjs`
- Hand-maintained asset manifest：`.github/manual-assets.json`
- Manual asset contract：`converter/tests/manual-assets.mjs`
- Original-source fetch layer：`converter/src/source-fetch.mjs`
- Generic orchestration：`.github/scripts/sync-convert.mjs`
- Offline canonical regeneration：`converter/tools/regenerate-canonical.mjs`
- Identity invariance：`converter/tests/generic-identity.mjs`
- Plugin-identity source audit：`converter/tests/genericity-audit.mjs`

## 5.14 Legacy Rewrite / Script observed-syntax inventory

除 Rewrite v2 / Script v2 inventory 外，CI 必须维护当前 Source Catalog 已实际出现的 Legacy Rewrite / Legacy Script 语法形态。

固定原则：

- Legacy Rewrite 使用 production `classifyLegacyRewriteAction()` 分类，不复制第二套 action grammar；
- inventory 只记录 action kind、phase/operation、reject variant、redirect status 与 legacy mock 的 option-name shape；
- 不记录 URL/pattern、header 名、JSON path/value、redirect target、mock data 等内容值，也不锁同类规则数量；
- Legacy Script 使用 production `parseLegacyScriptLine()`；
- Script inventory 只记录 phase、option name、option value shape 与 option-set；
- Script path、URL pattern、tag、argument 内容与其它具体值不进入 baseline；
- 当前未观察到的 legacy action/option 不得为了“将来可能出现”提前加入 fixture；
- 新 shape 首次出现时 CI fail closed，必须先检查 Loon 源语义；只有实际影响 target mapping 时才进一步核对 QX/Surge 官方能力；
- observed inventory 不能反向成为 production 支持白名单，production 仍以 parser/planner/target capability contract 为准。

自动实现：
- Legacy syntax inventory：`converter/tests/catalog-legacy-syntax-inventory.mjs`
- Baseline：`converter/fixtures/catalog-legacy-syntax-inventory.json`

