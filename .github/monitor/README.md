# WayX Actions 运行说明

唯一入口是 `.github/workflows/converter-check.yml`，显示名称为 **WayX Automation**。上游拉取和批量转换均由 GitHub Actions 执行。定时触发已暂停，当前没有每日自动运行。

| 触发 | 基线 | 发布位置 | 官方规范监控 |
| --- | --- | --- | --- |
| 同仓 test → main PR | PR 的精确 head SHA | 原 test 分支 | 不执行 |
| 外部/只读 PR | PR 的精确 head SHA | 仅验证、上传成品与 Issue 候选 | 不执行 |
| 手动选择 main | main 的触发 SHA | main | 记录规范 mirror/state |
| 手动选择 test | test 的触发 SHA | test | 不执行 |

手动同步：打开 GitHub Actions → WayX Automation → Run workflow，选择 main 或 test。失败修复后可重新运行；目标分支已推进时，从最新基线重新触发。工作流只使用现有 main/test，不创建分支或另建 PR。

共用流程：语法检查 → 可莉去广告/依赖目录发现 → 核心、官方能力和脚本运行测试 → 逐插件拉取、转换及事务写入 → canonical 和 README 生成 → 全目录格式、语义、引用、原作者 URL、仓库审计 → reconciliation/Review 报告 → Issue → 发布门禁 → 提交对应分支。

失败插件有完整旧版时保留旧版；首次失败暂缓进入有效目录，后续发现会重试。未知类型和转换失败保留源声明，自动创建或复用稳定指纹 Issue；closed Issue 再次出现会 reopen。Issue 包含插件、源文件、原作者 URL、规则、失败阶段和原因。只读运行使用 dry-run，保留候选报告。无法回退、任一必需校验失败、Issue 写入失败或发布目标推进，均阻止发布。

每次运行的 Summary 显示发布状态和已验证/保留/暂缓数量。Artifacts 保留 14 天，包含有效目录、生成成品，以及 `.github/monitor/.runtime/` 的日志、pipeline-result.json、sync failures、Issue 候选、reconciliation 和 Review inventory；失败运行也上传报告。这些 runtime 文件不提交仓库。

主分支手动运行还调用 monitor_upstreams.py 记录官方文档/仓库变化，不根据监控变化猜测转换能力。独立监控源获取问题可从 monitor.log 查阅；成功获取的规范保留在 `.github/monitor/upstream/`，元数据在 state.json。转换能力仍由官方能力测试及唯一权威规范 `.github/CONVERSION_SPEC.md` 约束。
