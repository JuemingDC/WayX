# Block 90 — 项目执行顺序

本规范生效后，WayX 的整改与后续开发固定按下列顺序：

1. 审计 converter source，先确认不存在按插件身份进行语义转换的特判。
2. 审计 generic synthetic fixtures / identity-invariance tests。
3. 审计 converter tests / real-plugin regression fixtures。
4. 审计 canonical QX snippets。
5. 审计 canonical Surge sgmodules。
6. 审计 `module/` 人工模块。
7. 审计 `script/` 路径与声明类型；**不做 Source Script runtime compatibility 审查，不修改脚本正文**。
8. 审计 GitHub Actions / monitor，只允许遍历 Source Catalog 并调用同一个 generic converter。
9. 重新生成 managed canonical。
10. 全量 diff。
11. validator / genericity / golden / canonical consistency 全部通过后才允许合并。

## 规范变更流程

新增目标语法时：
1. 找到官方依据；
2. 先改本规范；
3. 再改 converter；
4. 再改 tests；
5. 再重新生成 target；
6. 最后更新 golden。

固定链路：
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
converter 先实现
→ 用现有结果反推规范
```


## 通用性约束

新增插件本身不是修改 converter 的理由。

只有当陌生插件暴露了：
- 新 Rule Type；
- 新 Rewrite action；
- 新 Script declaration；
- 新 dependency 类型；
- 新目标平台官方能力；

才允许改 converter。此时必须先修改对应规范块，再用 synthetic fixture 实现该语法类别，最后再用真实插件做回归验证。

## 自动化实现文件

- Source Catalog：`.github/sources/loon.json`
- Source fetch + validation/write orchestration：`.github/scripts/sync-convert.mjs`
- Whole-plugin parser：`converter/src/plugin-parser.mjs`
- Dependency materializer：`converter/src/dependency-materializer.mjs`
- Source Script materializer：`converter/src/source-script-materializer.mjs`
- Shared conversion context：`converter/src/conversion-context.mjs`
- Pure generic conversion core：`converter/src/conversion-pipeline.mjs`
- Managed source/target/helper artifact I/O：`converter/src/managed-artifacts.mjs`
- Catalog workflow diagnostics：`converter/src/workflow-diagnostics.mjs`
- Quantumult X snippet validator：`converter/src/qx-snippet-validator.mjs`
- Surge module validator：`converter/src/surge-module.mjs`
- Canonical deterministic regeneration：`converter/tools/regenerate-canonical.mjs`（直接复用 conversion context/pipeline）
- CI gate：`.github/workflows/converter-check.yml`（同仓库 PR 可自动提交 deterministic canonical + WayX-generated helpers；外部 fork 只校验不写入）
- Upstream scheduled flow：`.github/workflows/upstream-monitor.yml`
- Review classification：`.github/scripts/conversion_gate.py` + `.github/scripts/validate_conversion_policy.py`

自动化脚本不得再维护第二份插件列表；所有 Loon source 必须从 Source Catalog 遍历。

`sync-convert.mjs` 不得承载 Rule/Rewrite/Script/MITM semantic dispatch、依赖 discovery/materialization、managed artifact 文件系统实现、重复的 workflow error annotation/failure-summary renderer、QX validator 语法实现或最终 target assembly。生产转换与 canonical regeneration 必须先调用同一个 `materializeConversionContext()`，并把其返回的同一个 `parsed` 传入 `convertPlugin()`；两条路径直接复用 `managed-artifacts.mjs` 的非语义 I/O primitives、`workflow-diagnostics.mjs` 的诊断格式，并直接调用 converter-owned QX/Surge validators，避免在线/离线重复维护文件 normalization、artifact diff/write、失败日志格式、解析、依赖、转换与校验逻辑。

## 原作者源唯一链路

自动化从源头开始固定为：

```text
Source Catalog entry.source（原作者）
→ 直接下载 Loon plugin
→ 解析 plugin 中原始 script/dependency URL
→ 直接读取原 Source Script / dependency
→ Source Script 仅在必要时做 HTTP action 类型辅助分析；dependency 做语义分析
→ 通用 converter
→ QX / Surge
→ validator / reconciliation
→ Safe commit 或 Review PR
```

禁止：
- plugin mirror/fallback；
- Source Script 镜像落盘；
- 把原 `script-path` 改写成 WayX/GitHub URL；
- 原源失败时自动切换第三方副本。

WayX 自动生成的 target helper script 不属于 Source Script 镜像，可继续作为 converter 产物写入 `script/<id>/`。`regenerate-canonical.mjs` 必须与目标文件一起生成这些 helper；`generated-helper-refs.mjs` 必须确认所有 WayX raw helper URL 都有真实文件。

## 目标 fallback 与项目级丢弃

Rewrite/Mock 固定优先级：
```text
native target syntax
→ dedicated semantic helper
→ observed multi-action complex helper（仅源声明 actions >= 2 且 signature 已登记）
→ commented REVIEW REQUIRED / ISSUE REQUIRED
```

Rule 不使用上述 Script fallback。Quantumult X 官方 sample 未确认的逻辑规则、端口类等 Rule Type 只保留为注释。

项目级直接丢弃：
- legacy `json.jq("jq-path=...")` alias；
- Loon regex literal 的 `i/m/s` flags。

这些丢弃项不得被后续 canonical regeneration 或 Work review 自动恢复。

## 手工资产与自动报告

- `.github/sources/loon.json` 只管理自动拉取/自动转换的 Loon Catalog。
- `.github/manual-assets.json` 只登记手工维护目标资产；当前为 QZXY。自动转换不得覆盖该清单中的文件。
- canonical regeneration 后必须运行 `converter/tools/conversion-reports.mjs`，生成 reconciliation 与 Review/Issue inventory。
- Converter Check 对 reconciliation 不一致直接失败；Upstream Monitor 将报告失败转入 Work review，不允许 Safe Tier 直推。
- 两套 workflow 都上传 JSON + Markdown 报告 artifact。

## Unknown conversion Issue 提交流程

生成后的 QX/Surge 文件若含 `# [WayX] ISSUE REQUIRED [...]`，自动化必须在 Safe commit 之前运行 issue proposer：

1. 读取 marker + 紧随其后的完整 `Source declaration`；
2. 用 issue code + source declaration 计算稳定 fingerprint；
3. 搜索 open/closed 历史 Issue，已有相同 fingerprint 时复用，不重复创建；
4. 没有时创建 `conversion-unknown` Issue，记录原因、源声明和命中的目标文件；
5. 本轮必须进入 Work Review，禁止直接推 main。

Issue 是“未知语义待决”的追踪载体，不替代目标文件中的注释保留，也不允许自动化自行猜答案。

## 自动化 Fail-Closed 约束

- Gate 必须按 Rule/Rewrite/Script/MITM 的真实语义分类，不能按作者目录、插件目录、插件名整体升级或降级。
- Loon Plugin 的 `PROXY` 保持“用户选择策略”语义：QX 保留字面 `PROXY`；Surge Module 通过 `#!arguments` + `{{{policy}}}` 建立策略参数绑定，默认 `DIRECT`，用户可改为已有代理策略/策略组。其他未显式参数化的外部 policy/group 仍不得伪装成内建 Safe policy。
- Block 20 已定义的 `URL-REGEX + REJECT/REJECT-200/REJECT-IMG/REJECT-DICT/REJECT-ARRAY/REJECT-DROP` 属于确定性映射，可进入 Safe Tier。
- Quantumult X 与 Surge 均不运行 Source Script compatibility scan。原脚本 URL 直接保留；正文读取失败本身不触发 compatibility Review。
- 只要 Review 或 Unknown Issue 条件成立，即使本轮没有普通 repository diff，也必须写入临时 `monitor/review-queue/<run>.md` 并创建 `work/upstream-*` PR；不能静默退出。
- Work 完成前必须删除上述临时 review marker。
- Safe Tier 结果只能推送到生成时使用的同一个 main 基线。若 remote main 在生成后前进，本轮跳过推送，由新一轮从新基线重新生成；禁止先生成再无条件 rebase 到新 main。

