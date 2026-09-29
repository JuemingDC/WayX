# Block 00 — 权威来源与通用原则

## 0.1 优先级

1. 目标平台官方文档 / 官方示例
2. 本规范
3. converter 实现
4. 历史输出
5. 第三方转换器 / 第三方配置

发生冲突时，修改低优先级内容。不得用“现有代码就是这样”反推规范。

## 0.2 官方依据

### Loon
- https://nsloon.app/docs/Rewrite/rewrite_v2/
- https://nsloon.app/docs/Rewrite/
- https://nsloon.app/docs/Script/script_v2/
- https://nsloon.app/docs/category/%E8%A7%84%E5%88%99/

### Quantumult X
- https://github.com/crossutility/Quantumult-X
- 官方 `sample.conf`
- 官方 `rewrite.md`
- 官方 `sample-import-rewrite.snippet`
- 项目上传的官方 `sample.txt`

### Surge
每次修改 Surge 规则前必须先读取：
- https://nssurge.com/llms.txt

规范语法以当前 Manual 为准：
- https://manual.nssurge.com/
- Module: https://manual.nssurge.com/profile/module.html
- Rule: https://manual.nssurge.com/rules/overview.html
- Logical Rule: https://manual.nssurge.com/rules/logical.html
- Reject Policy: https://manual.nssurge.com/policies/reject.html

若当前 Surge App 的模块编辑器/运行时与公开 Manual 的旧文字存在可重复验证的差异，只能对**已在当前官方 App 中直接验证的具体能力**采用运行时行为，并在测试/规范中明确记录；不得由此推断其他未验证语法。

## 0.3 行为优先

必须保持：
- 匹配范围
- request / response 阶段
- Rule / Rewrite 条件
- Action 行为
- Body 类型
- Header 行为
- 状态码（仅在状态码属于动作语义时）
- MITM 范围
- Script phase/body 模式
- 原规则顺序

不得为了统一写法扩大、缩小或替换原行为。

## 0.4 目标原生优先

优先级：
1. 目标平台原生能力
2. WayX 最小 helper script（仅用于非 Source Script 的 Action 补足）
3. Review 注释

目标平台原生能做时，不得为了“统一”改成脚本。

## 0.5 Source JavaScript

对 Loon `[Script]` 引用的原脚本：
- 不改正文
- 不 prepend
- 不 wrapper
- 不 fork
- 不自动替换 API
- 不为了 `$argument`、dynamic `enable`、`$prefs` 修改脚本

允许读取源码做兼容性判断。若脚本不支持目标平台，注释声明，不执行。

## 0.6 自动执行约束

Block 00 不直接产生目标语法，但必须由自动检查约束后续实现：
- `converter/tests/spec-block-contract.mjs`：确认每个规范块都有生产实现/校验脚本对应；
- `converter/tests/genericity-audit.mjs`：禁止插件身份驱动转换；
- `converter/tools/audit-repository.mjs`：审计已生成目标与陈旧/非法模式；
- `.github/workflows/converter-check.yml`：只有规范、实现、测试、canonical consistency 全通过才放行。
