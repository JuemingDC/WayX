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
→ parse plugin sections
→ build semantic IR / AST
→ Rule converter
→ Rewrite converter
   ├─ legacy rewrite
   └─ Rewrite v2
→ Script declaration converter
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

QX / Surge planner 只能消费 AST，不得再次对原始声明做 CSV 拆分、逻辑子规则拆分或插件身份判断。

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

## 5.5 Rewrite 分型

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

## 5.6 Target Planner

### Quantumult X

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
7. Safe Tier 自动提交；
8. Review Tier 开 PR 等待语义审查。

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
