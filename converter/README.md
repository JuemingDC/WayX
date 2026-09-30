# WayX Converter

WayX 的 Loon Plugin → Quantumult X / Surge 通用转换器。核心原则是**目标行为等价优先，无法证明等价就 fail closed**。

## 当前规则

- 转换逻辑必须与插件 id、名称、作者、仓库无关。
- Source Plugin、Source Script、JQ/mock dependency 只使用原始来源；不使用镜像/fallback 替代。
- Source JavaScript 不改写、不 wrapper、不 fork。
- QX 只输出项目已确认支持的 snippet 语法；`filter_local / rewrite_local / mitm` 段名保持注释。
- QX filter/rewrite 的源注释统一覆盖 `[Rule]` / `[Rewrite]` / `[Script]` 来源；仅在严格“一条源注释 → 一条源声明 → 一条活动目标规则”时转换为 `{# note #} rule`；分组注释、多行注释和转换说明继续使用普通 `#`。
- Surge 使用合法 sgmodule section/metadata。
- Loon Plugin 的 `PROXY` 保持用户策略绑定：QX 保留字面 `PROXY`；Surge Module 生成 `#!arguments` policy 参数并在 Rule 中使用 `{{{...}}}`，默认 `DIRECT`、可改为已有代理策略/策略组。
- Loon `[Argument]` **不转换为 QX 参数或 BoxJs**；QX 只用它做依赖分析。BoxJs 是独立功能，不属于 Loon Plugin 自动转换链。
- Surge Module 将 Loon `[Argument]` 转成官方 `#!arguments / #!arguments-desc`，执行项使用 `{{{name}}}` 占位符。
- Loon PluginObject 在 Surge Script 中转换为 JSON 字符串 `argument=`；动态 timeout/debug 使用占位符，动态 enable 使用官方行级 `#!REQUIREMENT`。
- QX 成品不复制 Loon `[Argument]` 区块和 Argument usage 清单；Surge 只输出目标平台参数 metadata，不复制 Loon 原区块。
- 不使用 Loon 参数默认值把动态行为静态化。

## Rewrite

- Rewrite v2 使用 tokenizer/parser/AST 与 action registry。
- 只有目标平台已确认能保持语义的 action 才自动转换。
- JSON/JQ/body/header/mock/redirect 等按目标原生能力优先；无等价能力时才生成最小 helper。
- QX 官方 sample 未确认的 Rule Type（逻辑规则、端口类等）直接注释保留，不扩大/删条件，也不使用 Script fallback。
- 未知语法/action/section 或未登记 complex signature 固定先注释，再输出 `ISSUE REQUIRED` 供自动化创建议题；已知目标能力缺口继续使用普通 Review。QX `response.header.add` / legacy `response-header-add` 是项目已决策的明确注释项，不再持续占用 Review inventory。

## Script

- Source Script 只转换声明层，QX/Surge 均直接引用原脚本 URL，不做 runtime compatibility gate。
- 仅在 QX declaration 需要判定 header/body/echo action 类型时读取脚本正文辅助分类。
- QX Script v2/legacy Script 的 argument 按 KOP-XIAO parser 口径忽略，动态 enable 默认开启，timeout 忽略；固定 enable=false/0 仍禁用。Rewrite 参数、debug、binary/max-size 等仍按各自能力单独判断。
- 通用 complex renderer 代码继续保留，但 production 只处理源单条 Rewrite v2 中真实存在且已登记的 multi-action signature；禁止合并相邻独立规则。单 action 需要脚本时走专用 semantic helper。

## 自动化

主要入口：

- Production converter：`.github/scripts/sync-convert.mjs`
- Canonical regeneration：`converter/tools/regenerate-canonical.mjs`
- QX/Surge validators：production converter + `converter/src/surge-module.mjs`
- Genericity audit：`converter/tests/genericity-audit.mjs`
- End-to-end golden：`converter/tests/end-to-end-golden.mjs`
- Converter Check：`.github/workflows/converter-check.yml`

新增语法或能力必须按：

```text
官方依据
→ CONVERSION_SPEC
→ generic implementation
→ synthetic regression
→ real-plugin regression
→ canonical output
```

不得用插件特判修复单个成品。
