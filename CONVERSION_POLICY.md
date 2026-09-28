# Conversion Policy

## 目录规则

1. `adblock/`
   - 去广告、推广移除、界面净化、HTTPDNS 屏蔽。
   - 对应的 Quantumult X snippet 与 Surge sgmodule 保留在这里。

2. `module/`
   - 只放非去广告类的 `.snippet` 与 `.sgmodule`。
   - 不放 JavaScript、JSON 或独立 rule 文件。

3. `script/`
   - 所有 JavaScript 统一放这里。
   - 包括模块配套脚本和单脚本。
   - 模块通过 raw URL 引用对应 `script/` 路径。

4. `rule/`
   - 独立规则集。

5. `boxjs/`
   - BoxJs JSON 配置。

## 转换规则

1. **机制对应优先**
   - jq → jq
   - JavaScript → JavaScript
   - Rewrite → Rewrite
   - Rule / Filter → Rule / Filter
   - Header Rewrite → Header Rewrite
   - 本地 mock/reject → 目标平台等价本地响应

2. **语义保持**
   - 不因为另一种写法更短就改变原规则的处理阶段、返回结构或匹配范围。
   - 不把精确字段删除改为关键词模糊删除。
   - 不把原脚本逻辑改写成 jq，除非原平台本身就是 jq/结构化 JSON 操作且目标平台有等价 jq。
   - 不扩大 MITM hostname、Rule 域名或正则匹配范围。

3. **脚本处理**
   - 优先直接复用原脚本。
   - 仅修改目标平台 API 差异、路径、持久化 API、通知 API、HTTP API 等必要部分。
   - 修改后逐项对比原脚本输入、输出与副作用。
   - JavaScript 文件最终统一放入 `script/`，不放入 `module/`。

4. **注释**
   - 原注释尽量完整保留。
   - 新增 Author: chance、Converted、Category、Target、Source。
   - Quantumult X snippet 的 filter/rewrite/mitm 分段标题注释化。

5. **验证**
   - Surge：对照 Surge 官方文档与当前官方语法。
   - Quantumult X：对照项目内官方 sample 配置。
   - 转换后检查正则、响应类型、MITM、脚本路径及 Rule 行为。
