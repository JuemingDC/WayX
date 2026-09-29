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
- CI gate：`.github/workflows/converter-check.yml`
- Upstream scheduled flow：`.github/workflows/upstream-monitor.yml`
- Review classification：`.github/scripts/conversion_gate.py` + `.github/scripts/validate_conversion_policy.py`

自动化脚本不得再维护第二份插件列表；所有 Loon source 必须从 Source Catalog 遍历。
