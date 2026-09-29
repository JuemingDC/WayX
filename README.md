# WayX

自用 Quantumult X / Surge 配置仓库。

> 仅整理 Quantumult X 与 Surge。Egern 相关内容不纳入本仓库。

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

## 转换原则

转换以“原本的形式和语义”优先，不为了统一写法而改变实现机制：

- jq / JSON 结构化处理 → 目标平台原生 jq；
- JavaScript → 保留原脚本和原逻辑，仅做目标平台必要 API/路径适配；
- URL Rewrite → 对应目标平台 URL Rewrite；
- Header Rewrite → 对应目标平台 Header Rewrite；
- Rule / Filter → 对应目标平台 Rule / Filter；
- 本地响应 / reject-dict → 使用目标平台语义等价的本地响应机制；
- MITM → 仅保留实际需要的 hostname。

只有目标平台没有等价原生能力时，才允许换用脚本，并在文件注释中写明原因。

转换时保留原注释，并追加转换时间、作者 chance、模块分类、目标平台与原始来源。

Quantumult X snippet 按项目约定将分段标题保留为注释形式，例如：

```text
# [filter_local]
# [rewrite_local]
# [mitm]
```

## Author

chance
