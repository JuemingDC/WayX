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

第二阶段新增：

- QX script compatibility / port registry：已知 RuCu6 Bilibili protobuf 脚本因上游显式拒绝 QX 而阻断执行行；YouTube 的内置 QuanX adapter 作为已审查兼容项登记；
- 未登记脚本会扫描显式 QX 拒绝、Loon-only `$utils`、QX runtime 信号；存在明确阻断项时输出 `MANUAL PORT REQUIRED`，不生成会报错的 QX 行；
- `jq_file / mock_file` 已进入依赖 AST：JQ 和文本/Base64 mock 可以解析为可内联依赖，未证明安全的二进制 mock 保持 Review Tier；
- 上游同步会生成 RuCu6 脚本兼容性报告，PR CI 同时检查 converter tools。

MyBlockAds JQ golden 已自动化：QX / Surge 当前 11 条 JQ 有序规则必须逐条一致，并锁定 10 个唯一表达式及有序指纹；该 fixture 不宣称已证明 Loon `/i` regex flag 与 QX regex 的等价性。

下一阶段：把依赖 resolver 接入完整 RuCu6 Rewrite v2 生成器，并补目标平台的 regex flag 语义验证。
