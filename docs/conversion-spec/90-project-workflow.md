# Block 90 — 项目执行顺序

本规范生效后，WayX 的整改与后续开发固定按下列顺序：

1. 审计 converter source，先确认不存在按插件身份进行语义转换的特判。
2. 审计 generic synthetic fixtures / identity-invariance tests。
3. 审计 converter tests / real-plugin regression fixtures。
4. 审计 canonical QX snippets。
5. 审计 canonical Surge sgmodules。
6. 审计 `module/` 人工模块。
7. 审计 `script/` 路径与声明兼容性；**不修改脚本正文**。
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
- Source fetch + dependency fetch + generic conversion：`.github/scripts/sync-convert.mjs`
- Canonical deterministic regeneration：`converter/tools/regenerate-canonical.mjs`
- CI gate：`.github/workflows/converter-check.yml`（同仓库 PR 可自动提交 deterministic canonical + WayX-generated helpers；外部 fork 只校验不写入）
- Upstream scheduled flow：`.github/workflows/upstream-monitor.yml`
- Review classification：`.github/scripts/conversion_gate.py` + `.github/scripts/validate_conversion_policy.py`

自动化脚本不得再维护第二份插件列表；所有 Loon source 必须从 Source Catalog 遍历。

## 原作者源唯一链路

自动化从源头开始固定为：

```text
Source Catalog entry.source（原作者）
→ 直接下载 Loon plugin
→ 解析 plugin 中原始 script/dependency URL
→ 直接读取原 Source Script / dependency
→ 只在内存中做兼容性/语义分析
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
→ verified helper script
→ commented REVIEW REQUIRED
```

项目级直接丢弃：
- Surge ad-block Module 的源 `FINAL`；
- legacy `json.jq("jq-path=...")` alias；
- Loon regex literal 的 `i/m/s` flags。

这些丢弃项不得被后续 canonical regeneration 或 Work review 自动恢复。

## 自动化 Fail-Closed 约束

- Gate 必须按 Rule/Rewrite/Script/MITM 的真实语义分类，不能按作者目录、插件目录、插件名整体升级或降级。
- 外部 policy/group（例如未在目标 Module 中定义的 `PROXY`）不是内建 Safe policy，必须进入 Review。
- Block 20 已定义的 `URL-REGEX + REJECT/REJECT-200/REJECT-IMG/REJECT-DICT/REJECT-ARRAY/REJECT-DROP` 属于确定性映射，可进入 Safe Tier。
- Quantumult X Source Script compatibility scan 失败必须参与 Review 判定；Surge 不做 Source Script runtime compatibility scan。
- 只要 Review 条件成立，即使本轮没有普通 repository diff，也必须写入临时 `monitor/review-queue/<run>.md` 并创建 `work/upstream-*` PR；不能静默退出。
- Work 完成前必须删除上述临时 review marker。
- Safe Tier 结果只能推送到生成时使用的同一个 main 基线。若 remote main 在生成后前进，本轮跳过推送，由新一轮从新基线重新生成；禁止先生成再无条件 rebase 到新 main。

