# WayX — ChatGPT Work 上游语义审查任务

版本：2.3  
作者：chance  
更新时间：2026-09-29  
类型：Automation / Upstream Semantic Review

## 触发条件

仅处理 `JuemingDC/WayX` 中同时满足：`work-review` 标签、base=`main`、head 以 `work/upstream-` 开头的 PR。其他 PR 忽略。

## 开始前必须读取

1. `CONVERSION_SPEC.md`
2. 与本次变更相关的 `docs/conversion-spec/` 规范块
3. 当前 PR 说明与 `Files changed`
4. 涉及 QX 时核对 `crossutility/Quantumult-X` 当前官方 sample
5. 涉及 Surge 时先读 `https://nssurge.com/llms.txt`，再按其指引核对当前 Manual
6. 涉及 Egern 时核对 `https://egernapp.com/docs/` 当前官方文档

`CONVERSION_POLICY.md` 与 `LOON_NEW_SYNTAX_CONVERSION.md` 仅为 deprecated index，不再作为独立行为规范。

## 分工

GitHub Actions 已完成 Safe Tier：上游检查、确定性 Rule/Rewrite/JQ/MITM 转换、简单新增删除、目标文件重生成和 validator。不要无意义重做已验证的 Safe Tier。

Work 只处理 Review Tier：JavaScript 内容、[Script]、依赖 Loon `[Argument]` 的声明、复杂逻辑规则、Loon 新语法未覆盖 action、自定义 Body、binary/base64、pipeline、helper script、converter/validator 失败、官方语法变更或任何无法证明无损的变化。Loon `[Argument]` 本身不转换为 QX/Surge 参数 UI 或 BoxJs。

## 通用转换器约束

- 新增/更新某个插件时，首先按 `CONVERSION_SPEC.md` 和 Block 05 判断它属于哪种 Rule / Rewrite / Script / MITM 语义类型。
- 不得以修复单个插件为由，在 production converter 中加入插件 id/name/author/source URL/script URL 路径特判。
- 如果陌生插件暴露的是新语法类型：先补官方依据和规范，再补 generic parser/planner 和 synthetic fixture，最后才用该真实插件做 regression。
- Source Catalog 中允许出现具体插件名和 URL，因为 Catalog 只描述输入/输出身份；这些字段不得改变转换算法。
- Gate 同样不得按作者目录、插件目录或插件名直接决定 Safe/Review；必须分析实际 section/action/policy。
- Review 修复完成后必须运行 genericity-audit 与 generic-identity，确保修复没有破坏陌生插件泛化能力。

## 核心转换规则

- 语义一致性优先于状态码表面一致。
- `reject_dict(200)` → QX `reject-dict`，不得因 200 变成 `reject-200`。
- `reject_array(status)` / `reject_img(status)` 同理保持 Body/Action 语义。
- 普通 Loon Rewrite `reject(status)` 按一般 `reject` 语义处理；不得仅为精确状态码生成 helper script。
- Loon `[Rule] URL-REGEX,...,REJECT` 按 WayX 固定映射 → QX `REGEX url reject-200`。
- `URL-REGEX + REJECT-200/REJECT-IMG/REJECT-DICT/REJECT-ARRAY/REJECT-DROP` 按 Block 20 的确定性映射处理。
- 外部 policy/group 名称（例如未在 Module 中定义的 `PROXY`）不得作为 Safe Tier 内建 policy；保持 Review/用户绑定。
- QX IP 类规则必须删除 `no-resolve`；Surge 不执行这一删除规则。
- QX snippet 的 filter/rewrite/mitm section 标题必须注释。
- 转换时保留原注释，添加转换时间、作者 `chance`、模块分类、Target、Source。
- 不扩大 MITM、正则或域名匹配范围。

## 脚本处理

脚本变化必须阅读原脚本真实行为，检查输入、输出、副作用、持久化 API、通知 API、HTTP API、`$done`、Body/二进制处理和平台判定。必要修改只能写入当前 PR head 分支。修改后与原脚本和目标平台官方示例再次比较。

## Actions 生成结果的复核

如果 Actions 已经生成了目标文件但 gate 判定为 Review Tier，必须同时审查源变化和生成结果。生成结果有误时直接在 PR 分支修正，不能因为它来自 Actions 就默认正确。

## 完成判定

只有在必要修改完成、目标格式核验通过、validator 通过、无临时无效文件遗留时才添加 `work-complete`。如果 PR 仅因自动化失败而创建了 `monitor/review-queue/*.md` 临时审查标记，完成审查后必须删除该标记再添加 `work-complete`。GitHub Actions 会 squash merge 并删除临时分支。

如果确认上游变化错误、不兼容或不应采用，说明原因并添加 `work-reject`；不得同时添加 `work-complete`。如果仍有不确定项，两个标签都不要添加，保留 PR 等待人工确认。
