# WayX Conversion Specification

版本：1.0  
作者：chance  
状态：**唯一权威转换规范（Authoritative）**

WayX 当前只执行 **Loon → Quantumult X / Surge** 转换。Egern 不纳入本仓库；需要时另立规范。

本规范采用“分块规范”结构。转换器、测试、canonical 输出、Golden 都必须服从本规范，不能反过来用现有代码定义规范。

## 规范块

| Block | 内容 |
|---|---|
| [00-authority](docs/conversion-spec/00-authority.md) | 权威来源、优先级、通用原则 |
| [10-target-format](docs/conversion-spec/10-target-format.md) | QX snippet / Surge sgmodule 固定格式 |
| [20-rule-mapping](docs/conversion-spec/20-rule-mapping.md) | **Rule 类型与 Policy 对应表** |
| [30-rewrite-mapping](docs/conversion-spec/30-rewrite-mapping.md) | Loon 旧 Rewrite / Rewrite v2 Action 映射 |
| [40-regex-condition](docs/conversion-spec/40-regex-condition.md) | Regex、flags、条件 AST、逻辑条件 |
| [50-json-jq-mock](docs/conversion-spec/50-json-jq-mock.md) | JSON/JQ、jq_file、mock/mock_file |
| [60-script-argument](docs/conversion-spec/60-script-argument.md) | Script 声明、脚本兼容、Argument |
| [70-mitm-comments](docs/conversion-spec/70-mitm-comments.md) | MITM、注释、metadata |
| [80-review-validation](docs/conversion-spec/80-review-validation.md) | Review Tier、validator、Golden |
| [90-project-workflow](docs/conversion-spec/90-project-workflow.md) | 项目执行顺序和规范变更流程 |

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
