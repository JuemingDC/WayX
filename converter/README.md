# WayX Converter

WayX 的 Loon Plugin → Quantumult X / Surge 通用转换器。核心原则是**目标行为等价优先，无法证明等价就 fail closed**。

## 当前规则

- 转换逻辑必须与插件 id、名称、作者、仓库无关。
- Source Plugin、Source Script、JQ/mock dependency 只使用原始来源；不使用镜像/fallback 替代。
- Source JavaScript 不改写、不 wrapper、不 fork。
- QX 只输出项目已确认支持的 snippet 语法；`filter_local / rewrite_local / mitm` 段名保持注释。
- Surge 使用合法 sgmodule section/metadata。
- QX Rule 中 Loon Plugin 的 `PROXY` 保留为字面 `PROXY` policy，不改成内建 `proxy`。
- Loon `[Argument]` **不转换为 QX 参数或 BoxJs**。BoxJs 是独立功能，不属于 Loon Plugin 自动转换链。
- `[Argument]` 仅用于内部依赖分析：若 Rewrite/Script 依赖插件参数而目标无法等价表达，该声明进入 Review。
- QX/Surge 成品不复制 Loon `[Argument]` 区块和 Argument usage 清单。
- 不使用 Loon 参数默认值把动态行为静态化。

## Rewrite

- Rewrite v2 使用 tokenizer/parser/AST 与 action registry。
- 只有目标平台已确认能保持语义的 action 才自动转换。
- JSON/JQ/body/header/mock/redirect 等按目标原生能力优先；无等价能力时才生成最小 helper。
- QX 不支持的复杂 Rule/condition 不做扩大或删条件处理。

## Script

- 只转换声明层。
- Script v2 的 typed PluginObject、动态 enable/timeout/debug 等若无法保持语义，进入 Review。
- Script compatibility 扫描只用于判断原脚本能否在目标运行时执行，不用于把 Loon 参数转换成 QX 配置。

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
