# Block 90 — 项目执行顺序

本规范生效后，WayX 的整改与后续开发固定按下列顺序：

1. 审计 converter source。
2. 审计 converter tests / fixtures。
3. 审计 canonical QX snippets。
4. 审计 canonical Surge sgmodules。
5. 审计 `module/` 人工模块。
6. 审计 `script/` 路径与声明兼容性；**不修改脚本正文**。
7. 审计 GitHub Actions / monitor，只允许调用符合规范的 converter。
8. 重新生成 managed canonical。
9. 全量 diff。
10. validator / golden / canonical consistency 全部通过后才允许合并。

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
