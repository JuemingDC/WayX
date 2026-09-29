# WayX Converter

WayX 自有的 Loon Plugin → Quantumult X / Surge 转换核心。参考 KOP-XIAO 资源解析器的“类型检测 → 分类处理 → 汇总输出”思路，但不复制其近似转换规则；所有目标语法以 Loon、Quantumult X、Surge 官方文档和 WayX 项目约定为准。

当前检查点已经固化：

- Loon `URL-REGEX,...,REJECT*` → Quantumult X `url reject-200`；
- Quantumult X 不执行 `AND / OR / NOT`，保留原规则注释；
- QX IP 类规则去除 `no-resolve`；
- JQ 只做空白压缩，不重写 `walk/select/map/empty/any/if` 等算法；
- RuCu6 `12306.js` → `script-analyze-echo-response`；`header.js` → `script-response-header`；
- 普通远程 JS 优先保留原 URL；脚本正文兼容性由独立扫描判断，源脚本明确拒绝 QX 或依赖未证明可替代的 Loon-only API 时只保留注释，不为其制造可执行 fork；
- Rewrite v2 已拆成 tokenizer/parser/AST、官方 Action registry 与 fail-closed Safe Tier analyzer；
- 当前官方 Loon Rewrite v2 的 31 个 Action 已登记；只有目标平台官方资料能直接证明的 primitive 才进入自动映射；
- `[Argument]` 可生成并合并 BoxJs descriptor；当前 Tieba 的 `$argument` Object 与 DianPing 的 `enable` 开关已经通过 QX `$prefs` bridge 实际接通；
- QX snippet 的 `filter / rewrite / mitm` 段名始终保持注释；
- 去广告输出目录固定为 `Adblock/Quantumult X/` 和 `Adblock/Surge/`；
- PR 级 `Converter Check` 负责语法检查和 checkpoint 回归，不执行上游写入。

第二阶段新增：

- QX script compatibility registry：已知 RuCu6 Bilibili protobuf 脚本因上游显式拒绝 QX 而阻断执行行；YouTube 的内置 QuanX adapter 作为已审查兼容项登记；
- 未登记脚本会扫描显式 QX 拒绝、Loon-only `$utils`、QX runtime 信号；明确不支持时输出 `QUANTUMULT X UNSUPPORTED` 并注释保留源声明，适配路径不能绕过该阻断；
- 转换原则改为“先判断 Loon 行为效果，再选择目标平台等效表达”：例如 URL regex + reject/`reject(200)` 在 QX 中使用 `reject-200`，`reject_dict/array/img(200)` 分别使用对应 QX 200 响应 primitive；
- `jq_file / mock_file` 已进入依赖 AST：JQ 仍可解析并内联；QX `mock_file` 不再伪装成原生 token，而是在转换阶段读取依赖并写入生成脚本；response 使用 `script-echo-response`，request 文本 body 使用 `script-request-body`；QX 运行时不再为 mock 文件二次联网，二进制 response 用内嵌 Base64 还原为官方支持的 `bodyBytes`，二进制 request 暂不自动放行；
- 上游同步会生成 RuCu6 脚本兼容性报告，PR CI 同时检查 converter tools。

MyBlockAds JQ golden 已自动化：QX / Surge 当前 11 条 JQ 有序规则必须逐条一致，并锁定 10 个唯一表达式及有序指纹；该 fixture 不宣称已证明 Loon `/i` regex flag 与 QX regex 的等价性。

下一阶段：继续把 Rewrite v2 的 redirect、JQ、Body/Header/JSON 修改和 Action pipeline 按行为语义接入生成器，并补 QX regex flag 的官方语义验证；复杂条件不做机械降级。
