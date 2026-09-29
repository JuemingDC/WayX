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
- 转换原则改为“先判断 Loon 行为效果，再选择目标平台等效表达”：例如 Loon `reject(404)` 直接使用 QX 原生 `reject`，`reject(200)` 使用 `reject-200`，`reject_dict/array/img(200)` 分别使用对应 QX 原生 primitive；
- `jq_file / mock_file` 已进入依赖 AST：JQ 仍可解析并内联；QX `mock_file` 不再伪装成原生 token，而是在转换阶段读取依赖并写入生成脚本；response 使用 `script-echo-response`，request 文本 body 使用 `script-request-body`；QX 运行时不再为 mock 文件二次联网，二进制 response 用内嵌 Base64 还原为官方支持的 `bodyBytes`，二进制 request 暂不自动放行；
- 上游同步会生成 RuCu6 脚本兼容性报告，PR CI 同时检查 converter tools。

MyBlockAds JQ golden 已自动化：QX / Surge 当前 11 条 JQ 有序规则必须逐条一致，并锁定 10 个唯一表达式及有序指纹。

第三/四阶段继续按“效果等价”扩展 Rewrite v2：

- Loon URL regex 的 `/i` 不使用未在 QX 官方 sample 中证明的 `(?i)`；转换器把 ASCII 字母显式编译为大小写字符类，例如 `api` → `[aA][pP][iI]`。不能无损编译的 Unicode/特殊 escape 保持 Review；
- redirect 的“只替换 URL 命中片段 + capture 模板”在 QX 侧使用生成的 `script-echo-response`，不假定 QX 302 replacement 支持未证明的捕获语义；
- JSON delete/replace/JQ、可证明安全的 Body Replace 直接转为 QX/Surge 原生能力；
- 普通 `reject(404)` 优先使用 QX 原生 `url reject`；只有目标端没有原生等价 primitive 的自定义状态/body 才进入生成响应脚本；Surge 普通 reject 使用 `[URL Rewrite] ... _ reject`，不使用 Map Local；
- 同阶段 Header set/del/replace pipeline 在 QX 侧合并为一个脚本以保持顺序；Surge 使用官方 `[Header Rewrite]`，其中 Loon `set` 展开为 `header-del + header-add`；
- inline response mock 及 mock + Header pipeline：QX 合成一个 echo-response 脚本；Surge 使用 `[Map Local]` 静态响应。

当前 CI 会扫描实际 RuCu6 资源：9 个插件、175 条 Rewrite v2 中，QX 自动等价转换 174 条，Surge 175 条。QX 唯一保留 Review 的现存规则是 `response.header.add("content-disposition", "inline")`，因为 QX 官方脚本 Header 使用对象，无法保证 Loon 的“同名字段也追加第二条”语义。

第五阶段已接入 Loon HTTP Script v2：

- 当前 RuCu6 9 个插件的 110 条活动 Script v2 全部进入正式 parser/AST，解析错误为 0；其中 response 101 条、request 9 条，108 条要求 body，14 条要求 binary body；
- 103 条不含动态参数的声明直接转为目标平台原生 Script 形式，不额外生成包装脚本；
- 其余 7 条声明需要 [Argument] / dynamic enable：QX 使用 BoxJs + $prefs 恢复 Loon typed $argument；Surge 使用官方 Module #!arguments + {{{name}}}，再把 Surge String $argument 还原为 Loon 所需类型；
- bridge 按“每条 Script v2 声明”单独生成，避免同一个上游 JS 在不同规则里收到错误参数；
- QX 兼容性检查优先于 bridge。源脚本显式拒绝 QX、使用 $utils，或只包含 $httpClient/$persistentStore/$loon 而没有 QX adapter 时，仍只保留注释，不因参数 bridge 变成可执行；
- Bilibili protobuf request/response 仍属于明确 QX 不支持项，不 fork；YouTube 的显式 QuanX adapter 可继续使用；
- QX / Surge 原生能表达的 phase、requires-body、binary-body-mode、固定 timeout/debug 均直接写目标平台声明，不额外包脚本。

下一阶段优先做 Script v2 的复合 condition 整体保持，以及用实际同步输出做端到端 golden；仍坚持原生声明优先、脚本仅用于目标平台确实缺少等价表达的情况。
