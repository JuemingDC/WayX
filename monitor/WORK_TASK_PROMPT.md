# WayX — ChatGPT Work 上游语义审查任务

版本：2.0  
作者：chance  
更新时间：2026-09-28  
类型：Automation / Upstream Semantic Review

## 触发条件

仅处理仓库 `JuemingDC/WayX` 中：
- 新打开的 Pull Request；
- PR 带有 `work-review` 标签；
- base 分支为 `main`；
- head 分支以 `work/upstream-` 开头。

其他 PR 一律忽略。

## 目标

GitHub Actions 已完成机械工作：检查 ETag / Last-Modified / commit SHA / SHA-256、同步真实变化并建立 PR。

Work 只处理需要理解的部分：
1. 阅读 PR 的 `Files changed`，确认具体上游变化。
2. 判断变化是否影响 WayX 当前 Quantumult X / Surge 的转换结果、脚本、模块或规范。
3. 需要修改时，在该 PR 的 head 分支中完成必要修改；不要直接写 main。
4. 完成后核对修改前后语义、目标平台官方规范和项目现有约定。
5. 所有检查通过后，为 PR 添加 `work-complete` 标签。
6. 如果证据不足、官方能力不明确、转换存在风险或无法完成操作：不要添加 `work-complete`，在 PR 中说明阻塞原因。

## 强制规范

### Surge / Egern
回答、转换或修改前必须重新查阅官方资料：
- Surge: `https://nssurge.com/`、`https://manual.nssurge.com/`
- Egern: `https://egernapp.com/`
只使用官方支持语法。

### Quantumult X
以官方 sample / `crossutility/Quantumult-X` 当前资料为最终依据，输出只能使用 QX 支持的样式。
QX IP 类规则转换时去掉 `no-resolve`。该删除规则不得套用到 Surge。

### Loon Reject 转换
状态码不是机械转换指标，优先保持前后语义一致：
- `reject_dict(200)` 不得仅因为 `200` 转成 QX `reject-200`；
- 字典、数组、图片响应分别保持相应语义；
- 一般拒绝按一般拒绝语义处理；
- 只有来源本身表达“200 + 空 Body 的 URL 拒绝”时，才使用 QX `reject-200`；
- 不得为了强制复刻状态码而无必要地生成脚本。

### 模块 / snippet / 脚本
发生转换时：
- 保留原注释；
- 添加转换时间；
- 作者写 `chance`；
- 添加模块分类；
- QX snippet 中 filter / rewrite / mitm 的分段标题按项目约定注释；
- 脚本转换必须检查原脚本真实行为；
- 修改完成后与原脚本、目标平台官方示例再次比较。

## 完成判定
只有在上游变化已确认、必要修改已写入 PR 分支、目标格式核验通过、无临时分析文件遗留时，才能添加 `work-complete` 标签。
添加后 GitHub Actions 会自动 squash merge、删除临时 review 分支并关闭 PR。
GitHub PR 历史记录不能真正删除，只能进入 merged/closed 状态。

## 不允许
- 不得盲目修改生产配置；
- 不得自动放宽 MITM 范围；
- 不得猜测未确认的 Egern / Surge API；
- 不得把 `200` 当作 `reject-200` 的充分条件；
- 不得在未完成核验时添加 `work-complete`。
