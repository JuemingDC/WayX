# Block 80 — Review / Validation / Golden

## 80.1 Review 条件

所有 Rewrite/Mock 先执行“目标原生 → 专用 semantic helper →（仅多 action）complex helper → 注释 Review”。只有对应 helper 仍无法保持时才进入下列 Review 条件。Rule 不走 Script fallback；QX 不支持的 Rule Type 直接注释保留：

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
- 生成 Surge 去广告 Module 时的源 `FINAL`；
- 非官方 legacy `json.jq("jq-path=...")` alias。

Loon regex literal 的 `i/m/s` 是明确的转换丢弃项，不因 flags 存在进入 Review；按 Block 40 丢弃 flags 后继续语义映射，regex body 不做全局格式化。只有目标官方语法明确要求的局部适配才允许进入对应 target planner。

Loon `[Argument]` **声明区块本身不构成 Review 条件**。QX 忽略参数 UI，只做依赖分析；Surge 按 Block 60 转换为 `#!arguments` / `{{{name}}}`，必要时使用带 `argument=` 的 helper。只有 helper 也无法保持时才进入 Review；所有 `# [WayX] REVIEW REQUIRED` 及 SCRIPT/REWRITE/ARGUMENT 专用 marker 都必须被 Gate 捕获。

## 80.2 Source 对账

必须满足：
```text
Target 已转换语义项
+ 明确注释保留的不支持语义项
+ 明确 Review 语义项
= Source 有效语义项
```

不允许静默丢行。

Source parser 遇到当前 grammar 未登记、但包含活动内容的 section 时，必须把该 section 的活动声明逐项保留为明确 Review；不能因为 orchestration 没有对应分支就忽略整个 section。Script parse failure、未知 MITM option 等同理必须进入统一 Review marker。只有本规范明确列出的项目级丢弃项可以不生成目标语义。

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
- Module `[Rule]` policy 允许 Surge Module Manual 明确列出的 `DIRECT / REJECT / REJECT-TINYGIF`，以及已由 `#!arguments` 声明的完整 `{{{name}}}` policy 占位符；占位符必须引用已声明参数。完整 Profile 的其他 built-in policy 与未绑定的未知/用户 policy group 都不得直接作为活动 Module Rule
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
