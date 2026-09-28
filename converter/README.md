# WayX Converter

WayX 自有的 Loon Plugin → Quantumult X / Surge 转换核心。参考 KOP-XIAO 资源解析器的“类型检测 → 分类处理 → 汇总输出”思路，但不复制其近似转换规则；所有目标语法以 Loon、Quantumult X、Surge 官方文档和 WayX 项目约定为准。

当前检查点已经固化：

- Loon `URL-REGEX,...,REJECT*` → Quantumult X `url reject-200`；
- Quantumult X 不执行 `AND / OR / NOT`，保留原规则注释；
- QX IP 类规则去除 `no-resolve`；
- JQ 只做空白压缩，不重写 `walk/select/map/empty/any/if` 等算法；
- RuCu6 `12306.js` → `script-analyze-echo-response`；`header.js` → `script-response-header`；
- 普通远程 JS 保留原 URL；脚本正文兼容性由独立扫描/port registry 判断；
- `[Argument]` 解析为 BoxJs descriptor，snippet 本身不写配置项；
- 去广告输出目录固定为 `Adblock/Quantumult X/` 和 `Adblock/Surge/`。

下一阶段：完整 Rewrite v2 条件 AST、pipeline、mock/header/body fallback、BoxJs `$prefs` bridge 与脚本 fork registry。
