# WayX Converter

WayX 自有的 Loon Plugin → Quantumult X / Surge 转换核心。参考 KOP-XIAO 资源解析器的“类型检测 → 分类处理 → 汇总输出”思路，但不复制其近似转换规则；所有目标语法以 Loon、Quantumult X、Surge 官方文档和 WayX 项目约定为准。

当前检查点已经固化：

- Loon `URL-REGEX,...,REJECT*` → Quantumult X `url reject-200`；
- Quantumult X 不执行 `AND / OR / NOT`，保留原规则注释；
- QX IP 类规则去除 `no-resolve`；
- JQ 只做空白压缩，不重写 `walk/select/map/empty/any/if` 等算法；
- RuCu6 `12306.js` → `script-analyze-echo-response`；`header.js` → `script-response-header`；
- 普通远程 JS 保留原 URL；脚本正文兼容性由独立扫描/port registry 判断；
- Rewrite v2 已拆成 tokenizer/parser/AST、官方 Action registry 与 fail-closed Safe Tier analyzer；
- 当前官方 Loon Rewrite v2 的 31 个 Action 已登记；只有目标平台官方资料能直接证明的 primitive 才进入自动映射；
- `[Argument]` 可生成并合并 BoxJs descriptor；当前 Tieba 的 `$argument` Object 与 DianPing 的 `enable` 开关已经通过 QX `$prefs` bridge 实际接通；
- QX snippet 的 `filter / rewrite / mitm` 段名始终保持注释；
- 去广告输出目录固定为 `Adblock/Quantumult X/` 和 `Adblock/Surge/`；
- PR 级 `Converter Check` 负责语法检查和 checkpoint 回归，不执行上游写入。

下一阶段：脚本兼容性/fork registry、`jq_file / mock_file` 依赖解析和 MyBlockAds 自动 golden fixture。
