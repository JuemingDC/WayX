# WayX Actions 运行说明

Modified: 2026-11-03 (chance). 本文与当前 TypeScript 入口和工作流保持一致。

唯一工作流为 `.github/workflows/converter-check.yml`，显示名称 **WayX Automation**。每日北京时间 **05:30**（UTC 前一天 21:30）运行；GitHub 调度可能延迟。main/test 的实现、测试、配置和规范变更也会触发；生成产物提交不会循环触发。

| 触发                | 基线               | 发布位置                      | 官方规范监控 |
| ------------------- | ------------------ | ----------------------------- | ------------ |
| 同仓 test → main PR | PR 的精确 head SHA | 原 test 分支                  | 完整监控     |
| 外部/只读 PR        | PR 的精确 head SHA | 仅验证、上传成品与 Issue 候选 | 不执行       |
| 手动选择 main/test  | 触发时的精确 SHA   | 所选原分支                    | 完整监控     |
| 每日定时            | main 的触发 SHA    | main                          | 完整监控     |

手动同步：GitHub Actions → WayX Automation → Run workflow，选择 main 或 test。工作流只使用既有 main/test，不创建分支或另建 PR。目标分支推进后须从新基线重跑。

## 执行流程

安装锁定依赖和 jq → PR 执行一次回归测试 → 准备日志和分支预算 → 目录发现 → 规则聚合、插件获取与转换 → 原文备份、API 兼容层、引用重绑定及无引用生成脚本清理 → 最终验证 → 规范监控 → 对账报告 → Issue → 发布门禁 → 同事务提交。

每日同步不重复运行开发测试或 canonical 重生成。最终验证检查 TypeScript、变化脚本的语法以及实际仓库产物，不重新生成整套输出。开发用 canonical 比较通过 `node src/cli.ts regenerate` 单独运行。

可莉由 `.github/sources/kelee-pause.json` 保持暂停，不获取其目录、插件正文或转换依赖。明确授权的脚本备份与共用文件更新使用保留声明，不恢复来源发现。其它来源照常更新；目录响应与监控复用同一运行快照。

## 失败与发布

失败插件存在完整旧版时保留旧版；首次失败暂缓发布。未知声明和转换失败进入稳定指纹 Issue，关闭后再次出现可重开。只读运行使用 dry-run 并保存候选报告。任一必需检查、回退、Issue 写入或监控失败，以及发布目标推进，都会阻止发布。

规范监控使用 `node src/cli.ts monitor`，记录官方文档与仓库变化，不根据变化猜测转换能力。有效镜像保存在 `.github/monitor/upstream/`，状态保存在 `state.json`。下载失败、比较结果截断或历史不是前向更新时保留旧基线；HTTP 缓存必须对应有效镜像。

Summary 显示发布状态及已验证、保留和暂缓数量。Artifacts 保留 14 天，包含有效目录、生成产物、备份、引用索引，以及 `.github/monitor/.runtime/` 下的日志、门禁、对账和 Issue 候选。运行日志不提交仓库。转换政策以 [CONVERSION_SPEC.md](../CONVERSION_SPEC.md) 为准。
