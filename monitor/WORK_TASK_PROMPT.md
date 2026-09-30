# WayX — ChatGPT Work 上游语义审查任务

版本：2.6  
作者：chance  
更新时间：2026-09-30  
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

Work 只处理 Review Tier：QX 无法承载的 Loon `[Argument]`、Loon 新语法未覆盖 action、自定义 Body、binary/base64、pipeline、helper script、converter/validator 失败、官方语法变更或任何 Rewrite native + helper 均无法证明无损的变化。QX 不支持的 Rule Type（含逻辑规则、端口类等）按规范注释保留，不以 Script 方式补齐。Loon `[Argument]` 不转换为 QX 参数 UI/BoxJs；Surge 必须按官方 Module `#!arguments` / `{{{name}}}` 转换，Rewrite 必要时通过 `argument=` + `$argument` helper 承载。

## 通用转换器约束

- 新增/更新某个插件时，首先按 `CONVERSION_SPEC.md` 和 Block 05 判断它属于哪种 Rule / Rewrite / Script / MITM 语义类型。
- 不得以修复单个插件为由，在 production converter 中加入插件 id/name/author/source URL/script URL 路径特判。
- 如果陌生插件暴露的是新语法类型：先补官方依据和规范，再补 generic parser/planner 和 synthetic fixture，最后才用该真实插件做 regression。
- Source Catalog 中允许出现具体插件名和 URL，因为 Catalog 只描述输入/输出身份；这些字段不得改变转换算法。
- Gate 同样不得按作者目录、插件目录或插件名直接决定 Safe/Review；必须分析实际 section/action/policy。
- Review 修复完成后必须运行 genericity-audit 与 generic-identity，确保修复没有破坏陌生插件泛化能力。

## 核心转换规则

- Rewrite/Mock 固定执行：目标原生格式 → 专用 semantic helper →（仅源单条声明真实存在且已登记的 multi-action signature）complex helper → 注释 Review/Issue。不得把相邻、同 condition 的独立源声明拼成 pipeline。Rule 不进入该 Script fallback。
- Loon regex literal 只去掉最外层 `/.../` delimiter，并按项目标准丢弃 `i/m/s`；regex body 原样保留，禁止全局执行 `\\/ -> /`、case-fold、inline modifier 或其他 canonicalization。目标确有语法差异时只能在对应 target planner 内基于官方格式做局部适配。
- QX 与 Surge 只有 source-authored 且 observed/registered 的多 action Rewrite 才进入 complex helper；既有 renderer 能力保留，但不能据此凭空放行未观察组合。脚本必须在一个文件内按源顺序完成全部 action。单 action 如需脚本只能走对应专用 semantic helper。
- Surge 去广告 Module 中的源 `FINAL` 直接丢弃，禁止改写成活动 catch-all。
- legacy `json.jq("jq-path=...")` 直接丢弃，不解析依赖、不生成目标规则。
- QX `header.add` 不得用 set/对象赋值冒充；没有已验证重复 Header 表示时注释 Review。
- QX 与 Surge Source Script 都不做 runtime compatibility scan；直接保留原脚本 URL。仅在 QX HTTP Script action 类型无法由 declaration 明确判断时读取正文辅助判定 header/body/echo，不据此启用或禁用脚本。
- 语义一致性优先于状态码表面一致。
- `reject_dict(200)` → QX `reject-dict`，不得因 200 变成 `reject-200`。
- `reject_array(status)` / `reject_img(status)` 同理保持 Body/Action 语义。
- 普通 Loon Rewrite `reject(status)` 按一般 `reject` 语义处理；不得仅为精确状态码生成 helper script。
- Loon `[Rule] URL-REGEX,...,REJECT` 按 WayX 固定映射 → QX `REGEX url reject-200`。
- `URL-REGEX + REJECT-200/REJECT-IMG/REJECT-DICT/REJECT-ARRAY/REJECT-DROP` 按 Block 20 的确定性映射处理。
- Loon Plugin 内部 `PROXY` 保持用户策略绑定：QX 保留字面 `PROXY`；Surge Module 使用官方 `#!arguments` / `{{{name}}}` 生成 policy 参数绑定，默认 `DIRECT`，允许用户改成现有代理策略/策略组。其他未显式参数化的外部 policy/group 仍不得伪装成内建 policy。
- QX IP 类规则必须删除 `no-resolve`；Surge 不执行这一删除规则。
- QX snippet 的 filter/rewrite/mitm section 标题必须注释。
- QX filter/rewrite 支持 `{# note #} rule`。源 `[Rule]`、`[Rewrite]`、`[Script]` 只要最终生成 QX filter/rewrite，都只在“一行源注释紧邻一条源声明，且下一行不是第二条连续活动声明、最终只生成一条活动 QX 行”时内联；若一条注释下面连续多条源声明、连续多行注释、注释本身是禁用源声明，必须保持普通 `#` 注释。WayX 转换说明绝不进入 QX note。
- 转换时保留原注释，添加转换时间、作者 `chance`、模块分类、Target、Source。
- 遇到未知语法/action/section/complex signature 时先注释源声明并写 `ISSUE REQUIRED`，不得猜测转换；确认对应 GitHub Issue 已创建或复用。Issue 解决前不得把该项改成活动规则。已知目标能力缺口继续走普通 Review。
- 不扩大 MITM、正则或域名匹配范围。

## 脚本处理

Source Script 不做 QX/Surge runtime compatibility 审查，也不自动修改。目标声明始终引用原脚本 URL。

只有以下情况需要读取脚本正文：
- QX HTTP Script declaration 需要判定 header/body/echo action 类型；
- 上游脚本内容本身发生变化，需要确认声明所需的 phase/body 类型是否变化；
- Work 正在审查由 WayX 生成的 helper script。

读取 Source Script 时关注 request/response、Body/bodyBytes 和 `$done` 返回形态，但这些信息只用于 action 分类，不用于判定脚本“兼容/不兼容 QX”。WayX-generated helper 则必须与源 Rewrite action 顺序和目标官方脚本接口逐项比较。

## Actions 生成结果的复核

如果 Actions 已经生成了目标文件但 gate 判定为 Review Tier，必须同时审查源变化和生成结果。生成结果有误时直接在 PR 分支修正，不能因为它来自 Actions 就默认正确。

## 完成判定

只有在必要修改完成、目标格式核验通过、validator 通过、无临时无效文件遗留时才添加 `work-complete`。如果 PR 仅因自动化失败而创建了 `monitor/review-queue/*.md` 临时审查标记，完成审查后必须删除该标记再添加 `work-complete`。GitHub Actions 会 squash merge 并删除临时分支。

如果确认上游变化错误、不兼容或不应采用，说明原因并添加 `work-reject`；不得同时添加 `work-complete`。如果仍有不确定项，两个标签都不要添加，保留 PR 等待人工确认。
