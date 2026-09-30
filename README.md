# WayX

自用 Quantumult X / Surge 配置仓库。

> 仅整理 Quantumult X 与 Surge。Egern 相关内容不纳入本仓库。

## 项目状态

当前进度、已知问题与待办优先级见：[PROJECT_STATUS.md](./PROJECT_STATUS.md)。

## 目录结构

```text
WayX/
├── Adblock/
│   ├── Quantumult X/
│   └── Surge/
├── module/
│   └── <App-or-Feature>/
│       ├── QuantumultX/
│       └── Surge/
├── script/
│   └── <App-or-Feature>/
│       ├── QuantumultX/
│       └── Surge/
├── rule/
│   └── QuantumultX/
└── boxjs/
    └── QuantumultX/
```

- `Adblock/`：去广告、界面净化、HTTPDNS 屏蔽等广告/干扰项处理。这里保留对应的 `.snippet` / `.sgmodule`。
- `module/`：非去广告类的功能模块，只放 `.snippet` / `.sgmodule`。
- `script/`：JavaScript 脚本统一放这里；无论是模块配套脚本还是单脚本，都不放进 `module/`。
- `rule/`：独立规则集。
- `boxjs/`：BoxJs 配置。

## 当前分类原则

- HTTPDNS → `Adblock/Quantumult X/HTTPDNS.snippet` / `Adblock/Surge/HTTPDNS.sgmodule`
- 去广告模块 / snippet → `Adblock/Quantumult X/` 与 `Adblock/Surge/`
- 功能性 module / snippet → `module/<App-or-Feature>/`
- JavaScript → `script/<App-or-Feature>/`
- 独立规则 → `rule/`
- BoxJs JSON → `boxjs/`

## 转换规范

唯一权威规范：[CONVERSION_SPEC.md](./CONVERSION_SPEC.md)。

转换以“原行为与目标平台官方格式”优先，不为了统一写法而改变实现机制：

- jq / JSON 结构化处理 → 目标平台原生 jq；
- Source JavaScript → 原文件原样保留并直接引用原 URL；QX/Surge 均不做 runtime compatibility gate，只转换声明，不修改、wrapper、fork 或自动替换运行时 API；
- URL Rewrite → 对应目标平台 URL Rewrite；
- Header Rewrite → 对应目标平台 Header Rewrite；
- Rule / Filter → 对应目标平台 Rule / Filter；
- 本地响应 / reject-dict → 使用目标平台语义等价的本地响应机制；
- MITM → 仅保留实际需要的 hostname。

只有 Rewrite/Mock 在目标平台确实缺少严格等价的原生表达时，才允许生成 helper script；Rule 不用 Script 补齐。通用 complex helper 只处理多 action pipeline，单 action 必须使用对应专用 helper。Source Script 本身不改写。

转换时保留原注释，并追加转换时间、作者 chance、模块分类、目标平台与原始来源。

Quantumult X snippet 按项目约定将分段标题保留为注释形式，例如：

```text
# [filter_local]
# [rewrite_local]
# [mitm]
```

## Author

chance
