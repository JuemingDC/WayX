# Script API 跨软件转换与剩余边界

Modified: 2026-11-01 (chance). 本文对应当前实现、官方契约和独立测试；“支持”指表中限定输入域，不能推导为任意脚本、任意 API 或真实设备上的全量等价。

## 资料与结论

Loon [Script v2](https://nsloon.app/docs/Script/script_v2/) 改的是配置声明，官方明确 JS 对象/方法没有因此变更；运行时以当前 [Script API](https://nsloon.app/docs/Script/script_api/) 为准。v2 与 API 适配必须分别检查。当前官方 v2 每条声明只允许一个 script action，不支持 Rewrite 的管道；兼容历史扩展不作为 v2 官方能力证据。

ScriptHub 已检查到提交 [502cf03](https://github.com/Script-Hub-Org/Script-Hub/commit/502cf03f7db2e077d96c07c2cb151a8f0b152a80)，其 [script-converter.js](https://github.com/Script-Hub-Org/Script-Hub/blob/502cf03f7db2e077d96c07c2cb151a8f0b152a80/script-converter.js) 与本次读取的 beta 文件相同。它的主要策略是注入前置兼容层，而非完整 JS 编译器或所有方向的 API 映射。

| ScriptHub 实现观察 | 位置 | 对 WayX 的结论 |
| --- | --- | --- |
| 将 interval/cancel 设为空函数 | 153–154 行 | 会改变调度或取消行为，不能作为等价实现 |
| fetch 只区分 POST 和其它方法 | 158 行起 | PUT、DELETE、HEAD、PATCH 等不能落成 GET |
| Promise 成功分支处理缺失 response | 162 行起 | 必须保留失败/拒绝与成功的区别，不能把错误变成成功 null |
| 存储删键采用兼容尝试 | 189 行起 | 应依据目标正式删除契约；空字符串不是删除 |
| 依赖 status/headers/body 判断是否包装 response | 240 行起 | 必须使用源触发类型；响应的可选字段不能作为唯一判据 |
| 正则替换 `$done(` 文本 | 365 行 | 字符串/注释、别名和动态调用需要 AST 与作用域分析 |
| Header 统一小写代理并移除 Host | 103 行起 | 改变字段枚举、大小写与请求内容，不是无条件等价 |

这些是源码检查结论，不是对所有 ScriptHub 用户脚本效果的判定。WayX 没有复制其实现代码。

## 本次实现与使用范围

| 项目 | 当前行为 |
| --- | --- |
| 原始插件和脚本 | 保存逐字节原件；地址固定、SHA-256 检测变化、原位更新，Git 保留旧版 |
| API 适配 | AST 盘点；返回 native/adapted/blocked、API、原因及方案 |
| 已支持程序 | 独立生成 Script/Api/<来源>-to-<目标>/<稳定ID>.js；原件不加兼容代码 |
| 自动分发 | 现有 QX/Surge 产物使用原来源、触发类型及 binary profile 确定适配计划 |
| 四平台入口 | qx、loon、surge、egern，包含 Egern 当前 async ctx 模型；受下表子域约束 |
| 升级失败 | 保留既有适配文件及其源码摘要；原始备份继续更新，报告列明不能适配的新版本 |
| 实际盘点 | Resource/Backup/script-api-status.json，逐脚本/逐目标列出结果与解决方案 |

已接通的子域：纯文本 HTTP Script 上下文与 completion；QX statusCode/状态行和回调型宿主 status；QX 合成响应与 request.response；纯二进制 ArrayBuffer/Uint8Array 的精确偏移；显式常量字符串键/值写入及单键删除；普通三字段通知；已知名称和可映射开始时间；Loon 文档规定的单次 interval；Egern 可验证的 text/json/arrayBuffer 读取和函数返回值。混合合成响应与普通放行、动态 completion/来源 profile、缺省键或不受支持选项会进入 blocked。

ESM 与旧式全局脚本还需要严格模式检查：已加入未声明写入、解构写入、删除标识符、重复参数、旧八进制、绑定冲突及反射控制流的阻断；Egern 转回其它端保留模块的严格执行。

测试覆盖 12 个方向的受限文本正文转换、echo、状态码、二进制切片、单键删除、Loon 一次性 interval、源字符串/注释不被替换、原始备份和适配文件分离、固定地址更新、损坏校验与不兼容升级保留。测试为 Node VM 和文件事务夹具，尚不等于 iOS 各客户端实机认证。

## 当前报告如何理解与后续顺序

Modified: 2026-11-01 (chance). 按现有 `Resource/Backup/script-api-status.json` 重新盘点：625 条 blocked 引用涉及 124 个不同原始脚本 URL；其中 317 条引用带有 `source-profile` 问题。这些是同一脚本在不同声明/目标中的引用次数，不是 625 份不同脚本，也不能据此判断 124 个程序在目标端全部无法运行。一次脚本报告可包含多个问题，分类次数不可相加计算脚本数；具体数量会随 Actions 更新变化。

1. **优先修补声明身份绑定**：当前通过来源插件 URL、脚本 URL 和阶段回查 profile；同一 URL 对应多个 tag/name/binary 声明时会阻断，迁移产物也可能找不到原声明。后续应在声明解析时分配稳定 ID，将运行平台、阶段、binary、requires-body、name、argument 逐声明传到备份/API 规划，避免靠 URL 反查。保留同 URL 的不同声明，不能任选一个 profile。
2. **其次扩展静态分析**：不少脚本包含 Env 框架或多个客户端的条件分支。目前没有完整可达性/作用域/数据流证明，会把未执行分支中的外端 API、`this`、别名、动态键和 `$` 局部变量一起列为受限。后续先做宿主已知分支消除及词法绑定解析，再审计实际可执行分支；不能直接删除检查或伪造宿主身份来提高通过率。
3. **再打通高频 HTTP、Header 和存储子域**：报告中 `$httpClient`、`$task` 分别出现在 116、107 条受限引用中；还存在 Header 对象形状、动态存储键/返回值及动态 `$done` 限制。先限定方法、选项和返回值，保留错误语义，逐选项测试，未知输入继续明确报告。基础方法能翻译，不等于所有网络默认值已经等价。
4. **单独处理客户端专属能力并实机验证**：控制配置、DNS、AES、压缩、富通知、取消/流等维持下表边界。Node VM 已验证受限子域，尚缺各客户端实机上的 Header 枚举/重复字段、生命周期、网络副作用、容量和异常行为矩阵。应记录实际版本和运行结果后逐项开放。

恢复 Surge 配置正则 flags 不会消除上述 JS API 问题；两者分别规划和验证。Loon Script v2 官方明确只改声明语法，JS API 没有随 v2 变成另一套接口。

## 仍不能直接证明等价的 API 与方案

| API/能力 | 不能直接等价的原因 | 方案及当前处理 |
| --- | --- | --- |
| `$task.fetch` / `$httpClient.*` / `ctx.http.*` | 超时单位、默认 TLS/ALPN、cookie、redirect、错误对象、取消和容量不同 | 建立逐 options 映射与七方法真实客户端测试；当前跨端 HTTP 分支 blocked，不能用 GET 替代其它方法 |
| HTTP timeout/cancel | 超时 Promise 不等于中断底层请求，网络副作用仍可能发生 | 需要目标正式取消/超时契约；不以 Promise.race 伪装 |
| HTTP binary/base64/filter | 字节视图、编码、文本过滤、返回限制并非同一种操作 | 纯字节偏移已支持；编码/filter 要独立实现和字节夹具，不能静默丢字段 |
| Header 与 h2_trailers | 大小写、多值、枚举、framing 及 trailer 可见性不同 | 使用原生 Header 声明或 full-header 模式并补实机证据；不把 trailer 当普通 Header |
| `$done` 的 node/policy/method/abort 等 | 请求控制和终止能力随宿主/触发类型变化 | 按字段和目标单独验证；已证明的纯 echo 选择 QX echo 类型，混合放行/合成响应不猜测 |
| 存储缺省键 | Loon 以 tag/name，Surge 以 script-path 归属；适配路径会改变归属 | 绑定显式源身份或人工迁移；当前仅接受已验证的显式普通字符串键 |
| 存储空值/类型/返回值 | null/undefined/空字符串、Boolean/void 不是同一契约 | 有依据的单键删除已实现；动态值、源缺失值不明确、Egern mutation 返回值等 blocked |
| 全量清理 / QX iCloud | 只删除适配器记录过的键会漏掉已有数据；iCloud 是独立异步服务 | 目标须支持同作用域枚举/清理或 iCloud；不能拿本地存储或空循环冒充 |
| 通知附件/点击/延迟 | URL/媒体/剪贴板组合、延迟和持久调度不同 | 普通通知已接通；富通知逐选项转换。Loon 延迟通知不能用 `$done` 后被取消的 timer 代替 |
| interval / clear timers | Loon interval 是单次；其它端的取消能力与引擎有关 | Loon 单次转为单次 timeout；未证明的重复/取消继续 blocked，不设空函数 |
| `$script` / `$environment` / `$loon` | Date 与 epoch 秒、脚本名、设备/版本/源 URL 字段不同 | 开始时间仅在存在可映射字段时转换；身份不伪造，原始 URL 保留在出处中 |
| `$argument` / PluginObject | QX 与目标配置不能自动重建 Loon 保存的对象参数和默认值 | 由声明层绑定类型、默认值与 reload 快照；不把对象序列化为字符串宣称等价 |
| `$config` / `$surge` / `$httpAPI` / `$configuration.sendMessage` | 同步/异步及批量/单项状态操作不同，API 动作也不同 | 编写目标原生控制模块；对照实际状态和错误测试，不能伪返回 true |
| `$dns.query` 与 DNS cache API | 服务器、协议、TTL/cache、超时和错误模型不同 | 映射完整查询契约；外部 DoH 属于行为变更，需要明确方案 |
| GeoIP / ASN / ASO | 数据库版本、空值与返回类型不同 | 固定数据库来源或标明结果差异；不能仅因方法同名就判等价 |
| gzip/ungzip 与 `ctx.compress` | 同步/异步、null/抛错、大小限制及 gzip 字节头不同 | 区分语义相同的解压与字节完全相同的压缩；逐算法验证失败/容量，必要时纯 JS 实现 |
| Loon `$crypto.aes` | ECB/CBC/CTR/GCM、padding、独立 tag 与同步接口不同 | 用独立向量验证的同步 AES 库，或整体重构 async；WebCrypto 不透明替代同步接口 |
| Egern `ctx.request/response.body` 流 | 一次消费、流背压、取消不能由已有字符串完整还原 | 当前仅已验证的读取方法子域；完整流处理保留 Egern 原生实现 |
| Egern Widget / SSH / SFTP | 其它宿主缺少同构 UI、SSH 会话或文件系统 | 保留原生脚本；需要时拆出外部服务/目标 UI 层，不做伪接口 |
| eval / Function / 反射 / API 别名 / WASM | 静态属性替换无法穷尽运行时访问与导入 | 保留原文，增加模块打包、数据流分析或专门实现后再启用 |
| 全局 WebAPI | 目标引擎与版本可能不提供同一标准对象 | Surge 需要 WebView 时显式声明，其他目标依据其正式契约；当前不推断存在 |
| 脚本选择/生命周期/容量 | 配置 first-match、Rewrite 禁用关系、chunked/Expect 和缓冲限制不由 API shim 决定 | 声明层与 API 层分别验证；API 转换不能修复来源条件或改变脚本所有权 |

## 证据来源

- [Loon Script v2](https://nsloon.app/docs/Script/script_v2/)；[Loon Script API](https://nsloon.app/docs/Script/script_api/)。
- [Surge JavaScript API](https://manual.nssurge.com/scripting/api.html)、[request](https://manual.nssurge.com/scripting/http-request.html)、[response](https://manual.nssurge.com/scripting/http-response.html)、[运行引擎与声明](https://manual.nssurge.com/scripting/overview.html)。
- QX 官方 [task/fetch](https://github.com/crossutility/Quantumult-X/blob/master/sample-task.js)、[rewrite](https://github.com/crossutility/Quantumult-X/blob/master/sample-rewrite-with-script.js)、[bytes](https://github.com/crossutility/Quantumult-X/blob/master/sample-bytes-rewrite.js)、[echo](https://github.com/crossutility/Quantumult-X/blob/master/sample-echo-response.js)、[控制接口](https://github.com/crossutility/Quantumult-X/blob/master/sample-configuration-api.js)、[DNS](https://github.com/crossutility/Quantumult-X/blob/master/sample-dns-api.js)，以及用户提供的示例配置。
- [Egern 当前 JavaScript API](https://egernapp.com/docs/javascript-api/) 与 [Scripting 配置](https://egernapp.com/docs/configuration/scriptings/)。

## 独立使用

```bash
node src/cli.ts script-api --from qx --to surge --phase response < original.js > adapted.js
node src/cli.ts script-api --from loon --to qx --phase request --report < original.js
node src/cli.ts script-api --from egern --to surge --phase response < original.js
```

blocked 返回 JSON 原因/方案且退出码为 2；不会输出一份假装成功的适配脚本。单元及事务验证：`node tests/script-api.ts`。

## 本次一并修复的上游格式错误

对抓获的实际奶思合集，规范化已知 DOMAIN/IP 类型与 legacy `- reject-200` 分隔符，保留每条原声明注释；树先生朴朴片段的 `REJECT` 修正为 QX 正式 `reject`。合集另有一条将远程 JSON 用作本地 echo-response 文件的声明，按用户上传 sample 的 Data-relative 文件要求保留原文并显式标记 SOURCE INVALID；不擅自补网络请求伪装为原生等价。原始备份仍完整保存原行，native state 的 diagnostics 记录该项。
