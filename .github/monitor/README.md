# WayX Actions 运行说明

唯一入口是 `.github/workflows/converter-check.yml`，显示名称为 **WayX Automation**。上游拉取和批量转换均由 GitHub Actions 执行。每日北京时间 01:17（UTC 17:17）自动运行；GitHub 调度可能延迟。

| 触发 | 基线 | 发布位置 | 官方规范监控 |
| --- | --- | --- | --- |
| 同仓 test → main PR | PR 的精确 head SHA | 原 test 分支 | 完整监控 |
| 外部/只读 PR | PR 的精确 head SHA | 仅验证、上传成品与 Issue 候选 | 不执行 |
| 手动选择 main | main 的触发 SHA | main | 记录规范 mirror/state |
| 手动选择 test | test 的触发 SHA | test | 完整监控 |
| 每日定时 | main 的最新 SHA | main | 完整监控 |

手动同步：打开 GitHub Actions → WayX Automation → Run workflow，选择 main 或 test。失败修复后可重新运行；目标分支已推进时，从最新基线重新触发。工作流只使用现有 main/test，不创建分支或另建 PR。

共用流程：语法检查 → 可莉去广告/依赖目录发现 → 核心、官方能力和脚本运行测试 → 逐插件拉取、转换及事务写入 → canonical 与 README 确定性校验 → 全目录格式、语义、引用、原作者 URL、仓库审计 → reconciliation/Review 报告 → Issue → 发布门禁 → 提交对应分支。

失败插件有完整旧版时保留旧版；首次失败暂缓进入有效目录，后续发现会重试。未知类型和转换失败保留源声明，自动创建或复用稳定指纹 Issue；closed Issue 再次出现会 reopen。Issue 包含插件、源文件、原作者 URL、规则、失败阶段和原因。只读运行使用 dry-run，保留候选报告。无法回退、任一必需校验失败、Issue 写入失败或发布目标推进，均阻止发布。

每次运行的 Summary 显示发布状态和已验证/保留/暂缓数量。Artifacts 保留 14 天，包含有效目录、生成成品，以及 `.github/monitor/.runtime/` 的日志、pipeline-result.json、sync failures、Issue 候选、reconciliation 和 Review inventory；失败运行也上传报告。这些 runtime 文件不提交仓库。

所有可写运行还调用 monitor_upstreams.py 记录官方文档/仓库变化，不根据监控变化猜测转换能力。任一监控源失败会阻止本次发布并自动创建/复用 upstream-monitor-failure Issue；完整原因与回退状态见 monitor.log、monitor-result.json。每次无变化也刷新报告，发布同时要求 complete=true；成功获取的规范保留在 `.github/monitor/upstream/`，元数据在 state.json。转换能力仍由官方能力测试及唯一权威规范 `.github/CONVERSION_SPEC.md` 约束。

来源镜像及状态写入有错误回退；GitHub 文件下载失败、缺 raw URL、compare 文件列表可能被截断或历史不是前向更新时，保留旧基线等待处理。HTTP 缓存必须有对应的有效镜像，缺失或损坏时重新获取。repo 初次运行只建立提交元数据基线，镜像是已监控变化的增量记录。

每日目录发现将可莉去广告/依赖类的新 LPX 自动加入同次拉取名单，其它可莉类别不加入。现有名单的原作者 URL 同步检查更新。目录发现的已验证响应同时供监控复用，只获取一次；catalog-discovery.json 记录新增/更新/移除项。新源转换失败先暂缓发布并提 Issue，下一次发现重试。官方文档和参考脚本只是监控材料，不加入 Loon 转换名单。

同步入口已负责源、目标、helper 和 README 的生成；后续 canonical/README 只验证，不重复写入。可写 test 的验证与每日 main 使用相同监控和发布门禁。
