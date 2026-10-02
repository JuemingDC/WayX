# Block 90 — 项目执行顺序

WayX 的上游维护与转换由 GitHub Actions 自动闭环执行；不再使用 ChatGPT Work、work-review PR 或 Work finalizer。

## 开发与规范变更顺序

1. 审计 converter source，确认不存在按插件身份进行语义转换的特判。
2. 审计 generic synthetic fixtures / identity-invariance tests。
3. 审计 converter tests / real-plugin regression fixtures。
4. 审计 canonical QX snippets。
5. 审计 canonical Surge sgmodules。
6. 审计 `Module/` 人工模块。
7. 审计 `Script/` 路径与声明类型；不做 Source Script runtime compatibility 审查，不修改原脚本正文。
8. 审计 GitHub Actions / monitor，只允许遍历 Source Catalog 并调用同一个 generic converter。
9. 重新生成 managed canonical。
10. 全量 diff。
11. validator / genericity / golden / canonical consistency 全部通过后才允许合并。

新增目标语法固定按：

```text
官方依据
→ CONVERSION_SPEC
→ converter
→ tests
→ canonical output
→ golden
```

禁止用既有输出反推规范，也禁止为单个插件写身份特判。

## 自动化实现文件

- Source Catalog：`.github/sources/loon.json`
- Original-source fetch router：`.github/converter/src/source-fetch.mjs`
- Python raw upstream transport：`.github/converter/tools/fetch-upstream.py`
- Scheduled upstream workflow：`.github/workflows/upstream-monitor.yml`
- Source fetch + per-plugin conversion orchestration：`.github/scripts/sync-convert.mjs`
- Automated Issue proposer：`.github/scripts/propose-conversion-issues.mjs`
- Target format validator：`.github/scripts/validate_conversion_policy.py`
- Whole-plugin parser：`.github/converter/src/plugin-parser.mjs`
- Dependency materializer：`.github/converter/src/dependency-materializer.mjs`
- Source Script materializer：`.github/converter/src/source-script-materializer.mjs`
- Shared conversion context：`.github/converter/src/conversion-context.mjs`
- Pure generic conversion core：`.github/converter/src/conversion-pipeline.mjs`
- Shared validated conversion runner：`.github/converter/src/conversion-runner.mjs`
- Managed artifact I/O / pure target diff：`.github/converter/src/managed-artifacts.mjs`
- Workflow diagnostics：`.github/converter/src/workflow-diagnostics.mjs`
- Workflow lifecycle/result regression：`.github/converter/tests/workflow-control.mjs`
- Structured scheduled failure report：`.github/converter/src/upstream-run-report.mjs`
- QX validator：`.github/converter/src/qx-snippet-validator.mjs`
- Surge validator：`.github/converter/src/surge-module.mjs`
- Repository audit：`.github/converter/tools/audit-repository.mjs`
- Reconciliation / Review inventory：`.github/converter/tools/conversion-reports.mjs`
- Canonical deterministic regeneration：`.github/converter/tools/regenerate-canonical.mjs`
- README/install index generator：`.github/converter/src/readme-index.mjs`
- README/install index CLI：`.github/converter/tools/update-readme.mjs`
- README/install index regression：`.github/converter/tests/readme-index.mjs`
- PR CI：`.github/workflows/converter-check.yml`

自动化脚本不得维护第二份插件列表；所有 Loon source 必须遍历 Source Catalog。

Online sync 与 canonical regeneration 虽然都遍历同一 Source Catalog，但 lifecycle 不同，必须保持分离：sync 负责 upstream fetch/source change/stage/failure context 与 source-last write；canonical 负责 checked-in source、check/write mode、pre-write stale set 与 stale exit policy。二者只共享语义完全相同的纯原语，例如 `managedTargetDiffs()`；不得为了减行数引入统一 Catalog loop 或共同 changed/stale result object。

## 定时自动链路

每天定时任务从同一个 `main` 基线执行：

```text
Source Catalog entry.source
→ source-fetch hostname profile
   ├─ kelee.one / *.kelee.one → Python urllib + WAYX_LOON_FETCH_UA
   ├─ rucu6.pages.dev → Python urllib + WAYX_LOON_FETCH_UA
   └─ other hosts → default Node fetch
→ 原作者同一 URL 直连 fetch
→ source normalize / validity
→ 只读比较 checked-in Source
→ conversion-runner: materialize dependencies + Source Script context
→ generic convertPlugin()
→ QX validator
→ Surge validator
→ 成功插件同步 generated helper（含安全 prune）/ target / Source
→ 继续处理下一个插件
→ 重建根目录 README（QX 原 snippet 直连，24 h remote interval）
→ 官方规范/仓库 monitor
→ repository validator + audit
→ reconciliation + Review/Issue inventory
→ 自动 Issue proposer
→ 全局校验通过后提交 main
→ 上传运行报告
```

单个插件的 fetch / materialize / convert / target validation 失败时：

- 该插件的新 managed Source / target 不得在验证前写入；
- 保留上一版 checked-in 的已验证 Source/target；
- 其它插件继续处理；
- 失败写入 `.github/monitor/.runtime/sync-failures.json`；
- Issue proposer 在本轮提交前创建或复用对应 Issue。

## 原作者源唯一链路

网络 transport/header profile 与 source identity 分离：

- Kelee 与 RuCu6 允许使用专用 Python `urllib.request` transport 和 Loon UA，以兼容其原作者站点的 HTTP 访问行为；
- profile 只由解析后的 hostname 选择，不得由插件身份字段选择；
- profile 不得修改 Catalog/source declaration 中的 URL，也不得引入备用 URL；
- 专用 transport 失败即记录原作者 fetch failure，不做 Node fallback、mirror fallback 或第三方副本 fallback。

禁止：

- plugin mirror/fallback；
- Source Script 镜像落盘；
- 把原 `script-path` 改写成 WayX/GitHub URL；
- 原源失败时自动切换第三方副本。

WayX 生成的 target helper 不属于 Source Script 镜像，可以写入 `Script/<id>/`。生成 helper 必须由 reference tests 验证真实存在。

## 目标 fallback

Rewrite/Mock 固定优先级：

```text
native target syntax
→ dedicated semantic helper
→ source-authored generic multi-action complex helper
→ commented REVIEW REQUIRED / ISSUE REQUIRED
```

Rule 不使用 Script fallback。未知语法仍 fail closed；目标文件注释保留完整 Source declaration，不生成猜测性活动规则。

项目级直接丢弃项继续遵守对应规范，例如 legacy `jq-path=`、Loon regex `i/m/s` flags，以及 Block 60 已定义的 QX Script `debug` / Legacy `max-size`。

## 自动 Issue 契约

Issue proposer 必须覆盖三类问题：

1. target 中的 `ISSUE REQUIRED`；
2. target 中的 `REVIEW REQUIRED`；
3. `sync-convert.mjs` 的 hard failure。

每个自动 Issue 必须包含：

- 插件 ID；
- 本地 Source 文件；
- 原作者上游 URL；
- QX / Surge target 文件；
- 对应 Source declaration / 规则内容；
- failure/review/issue 的明确原因；
- hard failure 的执行阶段；
- target marker 位置或运行上下文。

若新 upstream 在 fetch 阶段即失败，无法获得新规则内容，Issue 必须明确说明这一点，并尽可能附当前本地 Source 的规则上下文。

Issue fingerprint 必须包含插件身份与问题语义；重复运行复用/更新已有 Issue，不重复创建。若同一 fingerprint 的 closed Issue 再次出现，自动 reopen。

Review/Issue marker 不阻止其它已验证插件的自动提交。它们是 fail-closed 的追踪信息，不是 ChatGPT Work handoff。

## 全局提交门

定时 workflow 只有在以下全局检查成功时才允许提交自动产物：

- target format validator；
- repository audit；
- Source → Target reconciliation；
- generated helper references；
- Source Script original-URL preservation；
- Issue proposer。

单插件 hard failure本身允许其它插件已验证产物继续提交，但 workflow 最终状态应显式失败，以便 Actions 页面可见，并由 conversion-failure Issue 持续跟踪。

自动提交前必须再次检查 remote `main` 是否仍等于本轮生成基线。若 `main` 已前进，则本轮不 push，由下一轮从新基线完整重生成；禁止把旧生成结果 rebase 到新 main 后直接推送。

## 手工资产与报告

- `.github/sources/loon.json` 只管理自动拉取/转换的 Loon Catalog。
- `.github/manual-assets.json` 登记手工资产；当前 QZXY 不参与自动 regeneration。
- `.github/monitor/monitor_upstreams.py` 只记录监控源变化并维护 `.github/monitor/state.json` / `upstream/` mirror，不创建 review PR。
- 两套 workflow 均保留 machine-readable reconciliation / inventory；scheduled flow 还上传 sync failure、issue summary、monitor change summary 与运行日志。

## README 自动索引

根目录 `README.md` 是面向使用者的公开安装索引，不属于手工维护文档。其唯一生成入口为 `.github/converter/src/readme-index.mjs` / `.github/converter/tools/update-readme.mjs`，资源顺序固定为 `BoxJs → Module → Adblock → Rule`，并从资源自身 metadata 提取名称。

自动索引必须满足：

- Quantumult X 与 Surge 分列，不存在的平台显示 `—`；
- QX Rule 使用官方 `filter_remote`；
- QX Module/Adblock 的 `.snippet` 保持单文件，不拆 filter/rewrite。依据当前 KOP-XIAO 资源解析器兼容逻辑，Quantumult X build 844 起允许 rewrite resource 混合 filter 与 rewrite，因此 README 直接把原 `.snippet` 作为单个 `rewrite_remote` 导入；
- 每条 QX remote descriptor 显式写 `update-interval=86400` 与 `enabled=true`；
- 不生成 `Resource/Install/QuantumultX/` 或任何 README 专用中间 snippet/list；
- Surge 模块链接使用 `https://surge.app/install-module?url=...` 供用户现有 DivineEngine Redirect 转为官方 `surge:///install-module?url=...`；官方 install-module 不支持 update interval 参数，因此不得伪造；
- BoxJs 订阅使用 BoxJs 的一键订阅入口；
- 生成器发现索引资源仍引用大小写错误的 WayX `/main/script/` Raw URL 时必须失败，不生成可能错误的安装链接。

新增/删除转换内容后不得要求人工补 README：scheduled sync、canonical PR CI 与 README checker 必须自动生成/校验并把 `README.md` 与对应转换产物一起提交。

## 仓库布局门禁

`.github/converter/tests/repository-layout.mjs`（路径中的前导空格仅为排版错误）由 Converter Check 与 Upstream Monitor 同时执行，用于阻止 `converter/`、`docs/`、`monitor/`、`upstream/` 等工作流目录重新出现在仓库根目录。允许的根目录固定为 `README.md / .github / Resource / Adblock / Boxjs / Module / Rule / Script`。
