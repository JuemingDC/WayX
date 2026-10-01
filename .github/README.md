# WayX

自用 Quantumult X / Surge 配置仓库。

> 仅整理 Quantumult X 与 Surge。Egern 相关内容不纳入本仓库。

## 项目状态

当前进度、已知问题与待办优先级见：[PROJECT_STATUS.md](./PROJECT_STATUS.md)。

## 目录结构

```text
WayX/
├── .github/
│   ├── converter/          # 转换器、tests、fixtures、tools
│   ├── docs/               # 分块转换规范
│   ├── monitor/            # 上游规范监控、state、runtime、mirror
│   ├── scripts/            # Actions orchestration
│   ├── sources/            # Loon Source Catalog
│   ├── workflows/          # 正式 GitHub Actions
│   ├── CONVERSION_SPEC.md
│   ├── PROJECT_STATUS.md
│   └── README.md
├── Resource/               # 转换输入 / managed source
├── Adblock/
│   ├── Quantumult X/
│   └── Surge/
├── Boxjs/
├── Module/
├── Rule/
└── Script/
```

- `.github/`：所有转换实现、规范、测试、监控与 Actions orchestration；根目录不再存放 workflow 实现或规范文件。
- `Resource/`：Catalog 管理的 Loon 原始输入资源。
- `Adblock/`：去广告、界面净化、HTTPDNS 屏蔽等广告/干扰项处理。这里保留对应的 `.snippet` / `.sgmodule`。
- `Module/`：非去广告类的功能模块，只放 `.snippet` / `.sgmodule`。
- `Script/`：JavaScript 脚本统一放这里；无论是模块配套脚本还是单脚本，都不放进 `Module/`。
- `Rule/`：独立规则集。
- `Boxjs/`：BoxJs 配置。

## 当前分类原则

- HTTPDNS → `Adblock/Quantumult X/HTTPDNS.snippet` / `Adblock/Surge/HTTPDNS.sgmodule`
- 去广告模块 / snippet → `Adblock/Quantumult X/` 与 `Adblock/Surge/`
- 功能性 module / snippet → `Module/<App-or-Feature>/`
- JavaScript → `Script/<App-or-Feature>/`
- 独立规则 → `Rule/`
- BoxJs JSON → `Boxjs/`

## 转换规范

唯一权威规范：[CONVERSION_SPEC.md](./CONVERSION_SPEC.md)。

转换以“原行为与目标平台官方格式”优先，不为了统一写法而改变实现机制：

- jq / JSON 结构化处理 → 目标平台原生 jq；Key Path delete 使用 `del`（普通多路径合并到一个 `del`，数组索引按源顺序串联），`delpaths` 仅保留给源 jq 自带的 Path Array 语义或未来明确的 Path Array IR；
- Source JavaScript → 原文件原样保留并直接引用原 URL；QX/Surge 均不做 runtime compatibility gate，只转换声明，不修改、wrapper、fork 或自动替换运行时 API；
- QX Source Script 声明按当前 WayX 规范处理：Script argument 不注入，动态 enable 默认开启，timeout 与 binary-body-mode 按既定策略忽略；`debug` 与 Legacy `max-size` 直接丢弃；header/body 只由 requires-body 决定；固定 enable=false/0 仍禁用。
- URL Rewrite → 对应目标平台 URL Rewrite；
- Header Rewrite → 对应目标平台 Header Rewrite；
- Rule / Filter → 对应目标平台 Rule / Filter；
- Loon Plugin Rule 的 `PROXY` → QX 保留字面 `PROXY`；Surge Module 生成官方 `#!arguments` policy 参数并在 Rule 中使用 `{{{...}}}`，默认 `DIRECT`，用户可改为已有代理策略/策略组；
- 本地响应 / reject-dict → 使用目标平台语义等价的本地响应机制；
- MITM → 仅保留实际需要的 hostname。

只有 Rewrite/Mock 在目标平台确实缺少严格等价的原生表达时，才允许生成 helper script；Rule 不用 Script 补齐。Complex helper 只处理**源单条声明真实写出的**多 action pipeline，并由通用 action-family classifier + renderer capability 判定是否可保真转换；禁止把相邻规则凭空组合，也禁止按 Catalog 已观察完整 signature 建白名单。单 action 必须使用对应专用 helper。Source Script 本身不改写。

转换时保留原注释，并追加转换时间、作者 chance、模块分类、目标平台与原始来源。

`QZXY.snippet` / `QZXY.sgmodule` 为 chance 手工维护资产，登记在 `.github/manual-assets.json`，不进入 Loon Source Catalog，也不参与 canonical regeneration；但仍接受目标格式 validator 与 repository audit。

CI 会自动生成 Source → Target reconciliation 和 Review/Issue inventory。每个 Catalog 源有效语义项必须能对账到活动转换、明确注释、Review、Issue、源禁用或规范允许丢弃中的一种；对账失败直接阻止通过。

遇到未知语法、未知 action、未知 section 或未登记 complex signature 时，WayX 先把该源声明以注释保留，不生成猜测性活动规则，并写入 `ISSUE REQUIRED` marker；上游自动化随后创建/复用 GitHub Issue。已知语义但目标能力不足仍使用普通 Review。

QX 当前支持 filter/rewrite 前置 note。源 `[Rule]`、`[Rewrite]`、`[Script]` 只要最终生成 QX filter/rewrite，都只把严格一对一的源注释转成：

```text
{# 注释 #} host-suffix, example.com, reject
{# 注释 #} ^https://ads\.example\.com url reject
```

如果一条注释下面连续对应多条源规则、存在多行连续注释、注释本身是被禁用的源规则，或一条源声明展开成多条 QX 行，则保持普通 `#` 注释。WayX 自己的转换说明不会写入 `{# ... #}`。

Quantumult X snippet 按项目约定将分段标题保留为注释形式，例如：

```text
# [filter_local]
# [rewrite_local]
# [mitm]
```

## 自动上游同步

`.github/workflows/upstream-monitor.yml` 每天自动完成 Source Catalog 原作者拉取、逐插件 QX/Surge 转换与校验、全仓 audit/reconciliation、Issue 跟踪和已验证产物提交。

- 单个插件转换失败不会阻塞其它插件；
- 失败插件保留上一版已验证 Source/target；
- `REVIEW REQUIRED`、`ISSUE REQUIRED` 和 hard sync failure 都自动创建/复用 GitHub Issue；
- 自动 Issue 必须包含插件、对应源规则与失败原因；
- 全局 validator/audit/reconciliation 不通过时不会提交本轮自动产物；
- 不使用 ChatGPT Work 或 work-review PR。

## Author

chance
