# WayX Conversion Specification

版本：1.4  
作者：chance  
状态：**唯一权威转换规范（Authoritative）**

WayX 当前只执行 **Loon → Quantumult X / Surge** 转换。Egern 不纳入本仓库；需要时另立规范。

本规范采用“分块规范”结构。转换器、测试、canonical 输出、Golden 都必须服从本规范，不能反过来用现有代码定义规范。

## 2026-09-30 规范更新

1. Quantumult X 对官方 sample 未确认的 Rule Type（包括逻辑规则、端口类等）只保留为注释，不生成活动规则，也不使用 Script 兜底。
2. Script fallback 仅属于 Rewrite/Mock 语义：目标原生格式无法严格等价表达时，才考虑专用 helper；Rule 不进入 Script fallback。
3. Source JavaScript 在 Quantumult X 与 Surge 中均不做 runtime compatibility 审查。目标声明直接引用原脚本 URL；仅在需要判定 HTTP Script 的 header/body/echo action 类型时读取源码辅助分类。
4. Loon Plugin 内部策略 `PROXY` 不做语义替换：QX 保留字面 `PROXY`；Surge Module 因官方禁止活动 Rule 使用外部 policy 名称，仅将源声明原样注释保留，不改写成其他策略。
5. 通用 Complex Rewrite helper 只处理多 action pipeline（`actions.length >= 2`），脚本负责按源顺序完成整条多 action 语义；单 action 如确需脚本，必须走对应的专用 semantic helper。


## 规范块

| Block | 内容 |
|---|---|
| [00-authority](docs/conversion-spec/00-authority.md) | 权威来源、优先级、通用原则 |
| [05-generic-converter](docs/conversion-spec/05-generic-converter.md) | **通用转换器架构、分型、自动化契约、陌生插件验收** |
| [10-target-format](docs/conversion-spec/10-target-format.md) | QX snippet / Surge sgmodule 固定格式 |
| [20-rule-mapping](docs/conversion-spec/20-rule-mapping.md) | **Rule 类型与 Policy 对应表** |
| [30-rewrite-mapping](docs/conversion-spec/30-rewrite-mapping.md) | Loon 旧 Rewrite / Rewrite v2 Action 映射 |
| [40-regex-condition](docs/conversion-spec/40-regex-condition.md) | Regex、flags、条件 AST、逻辑条件 |
| [50-json-jq-mock](docs/conversion-spec/50-json-jq-mock.md) | JSON/JQ、jq_file、mock/mock_file |
| [60-script-argument](docs/conversion-spec/60-script-argument.md) | Script 声明、脚本兼容、Argument |
| [70-mitm-comments](docs/conversion-spec/70-mitm-comments.md) | MITM、注释、metadata |
| [80-review-validation](docs/conversion-spec/80-review-validation.md) | Review Tier、validator、Golden |
| [90-project-workflow](docs/conversion-spec/90-project-workflow.md) | 项目执行顺序和规范变更流程 |
| [95-implementation-index](docs/conversion-spec/95-implementation-index.md) | **规范块 → production script → tests → 自动化入口总索引** |

## 固定顺序

```text
官方依据
→ CONVERSION_SPEC
→ converter
→ tests
→ canonical output
→ golden
```

禁止：

```text
先改 converter
→ 发现能跑
→ 再补规范
```
