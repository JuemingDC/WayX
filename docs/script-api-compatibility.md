# 去广告脚本的三端通用版本

Modified: 2026-11-02 (chance). 当前范围为去广告插件的 HTTP 脚本：Quantumult X、Surge、Loon 共用同一文件。配置控制 API、Module 工具、任务、Egern 暂不处理；原始插件和脚本的全仓库备份继续进行。

## 文件和引用

- 原件：`Resource/Backup/script/<URL SHA-256>/<源文件名>`，逐字节保存。
- 通用版本：`Script/Adblock/<来源主机>-<URL摘要前12位>/<源文件名>`。文件名及扩展名沿用源名，无扩展名不擅自补后缀，同名不同 URL 用目录区分；查询参数属于身份，fragment 参数保留在引用中。
- 出处、源/生成 SHA-256、三端上下文：`Resource/Backup/index.json`。脚本不添加 WayX 作者、来源、分类等内部声明，原作者的原注释保留。
- 当前结果：`Resource/Backup/script-api-status.json`。`universal` 为文件数，`adapted` 为成功重绑定的引用数；同一文件可被多处引用，不能将引用数当作脚本数量。

所有已通过的 QX/Surge 产物对同一原 URL 使用完全相同的通用地址，不再生成 source-to-target 文件。Loon 可以在原有 HTTP Script 声明中引用同一 JS；仍须保留正确的 requires_body、binary_body_mode 和触发阶段。本次没有额外生成 Loon 插件副本，也不修改作者原始插件快照。

上游更新时，Actions 同时更新原文备份、通用文件、索引及引用，地址保持固定。新版本未通过时保留已经验证的旧通用版本并报告源摘要差异；初次未通过不输出假通用脚本。旧方向文件只在没有活动声明引用后删除；范围外工具仍在使用的旧文件保留。

## 实现方式

源业务正文只放一次；可以对已证明的纯来源宿主分支做裁剪，原件仍逐字节保留。程序识别真实宿主后，在来源客户端走原 API，在其他客户端走共同桥接层；不伪造版本、不吞错误、不用空函数冒充接口。生成前对每个已登记 HTTP profile 检查三端，不以其中两端通过推断第三端可运行。

同一 URL 可以用于多个请求/响应条件，运行时按 request/response 上下文选取计划。不同 tag 在脚本不读取名称时不再制造歧义和额外文件；脚本读取 `$script.name` 时保留已知来源名称。不能区分的 echo、binary 或可观察名称冲突继续报告，不任选一个声明覆盖其它声明。

已验证的子域包括文本正文处理、可映射的状态字段、受限 `$done` 结果与纯合成响应、QX ArrayBuffer 与回调宿主 Uint8Array 的精确偏移、显式字符串键/值写入和单键删除、普通三字段通知，以及 Loon 文档规定的一次性 interval。通用文件的语法检查按三端使用的普通脚本模式解析，保留源中显式的严格模式，不因仓库 type=module 强制改变语义。每项仍受来源与触发声明约束，不代表任意 JS、任意 API 均可转换。

## 本轮补充的能力与明确边界

| 能力                 | 本轮实现                                                                                                                                  | 仍然阻断                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| echo 后的远程脚本    | HTTP(S) js/mjs/cjs 或 WayX 通用脚本目录中的操作数改为 script-echo-response；analyze 形式保留请求体等待，保留 query/fragment 和旧声明      | JSON/数据不作为 JS；无后缀资源不能仅凭 URL 猜测                                                |
| 局部变量和存在性判断 | 用 TypeScript 词法绑定识别局部 `$e/$t` 等变量，包装变量避开作者所有标识符，避免捕获自由变量；允许映射上下文的纯存在性判断及未使用的纯探测 | 宿主别名外传、动态接收者、无法证明的外端身份探测、别名逃逸                                     |
| 类的 this            | 保留类自身严格接收者及原方法调用，不重写业务正文                                                                                          | 全局/未知接收者、this 动态宿主属性、反射构造                                                   |
| `$done(result)`      | 字面量/条件结果及闭合变量，包含嵌套回调中的已知字面量赋值、静态 body/bodyBytes/status/statusCode/url 字段读写和删除                       | 对象逃逸、简写属性外传、动态再声明、未知函数结果、Header/response 对象变更、动态属性与循环赋值 |
| 缺失存储值           | 在 `                                                                                                                                      |                                                                                                | `、`??`、布尔判断、非严格空值比较或全部使用点均安全的局部别名下处理 | 严格 null/undefined 比较、序列化、未知键、Loon 空字符串写入与全量清理 |

所有证据域同步写入 `Resource/Backup/script-api-status.json` 的 `capabilities`，与逐脚本问题一起随 Actions 更新。对象流分析保留作者业务表达式；来源宿主分支优化只作用于通用版本，未知动态逻辑仍保留原备份或已验证旧版本，不能靠移除检查提高通过数。

## 去广告范围内仍需补充的能力

| 项目                            | 当前边界                                                                    | 后续方案                                                         |
| ------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `$task.fetch` / `$httpClient.*` | 方法、超时、取消、Cookie、重定向、TLS、错误和容量未形成完整映射             | 先限定请求选项和返回值，逐项验证；不能把非 GET/POST 方法改为 GET |
| Header                          | 大小写、重复字段、枚举和 framing 约束不同                                   | 对单字段操作提供明确映射，保留多值，并补三端实机结果             |
| 存储                            | 动态键、缺省键归属、缺失值与返回值仍受限                                    | 显式绑定源身份，按具体类型/调用方式扩展；不能把空字符串当删除    |
| `$done`                         | 已支持闭合字面量变量；任意动态对象、混合放行/合成响应和部分终止字段仍不明确 | 做作用域与数据流分析，验证结果形状和 QX echo 声明                |
| 多端框架及动态 JS               | Env 类、别名、反射和未执行的外端分支可能触发保守阻断                        | 先增加词法绑定与可达分支分析，不能简单移除检查                   |
| 二进制及编码                    | 纯字节支持不等于任意编码/filter/压缩均等价                                  | 增加独立字节向量、错误和容量测试；二进制声明不能省略             |
| 参数、富通知、生命周期          | 对象参数、附件/延迟、取消和执行结束行为不同                                 | 分能力实现；保留类型和调度行为，不以定时器模拟持久通知           |
| 来源 profile                    | 不能从运行时区分的 echo/binary/名称冲突                                     | 保留逐声明身份；必须建立可验证的运行时判别后才能共用             |

`$config`、`$surge`、`$httpAPI`、`$configuration` 等客户端配置控制属于本轮 **范围外**，不再列为去广告兼容性待补项。现有静态分析仍较保守，blocked 代表尚未证明三端兼容，不等同于脚本一定不能在某端运行。

## 资料与验证

Loon [Script v2](https://nsloon.app/docs/Script/script_v2/) 修改的是声明语法，JS 方法仍见当前 [Script API](https://nsloon.app/docs/Script/script_api/)。Surge 依据 [JavaScript API](https://manual.nssurge.com/scripting/api.html)、[request](https://manual.nssurge.com/scripting/http-request.html) 与 [response](https://manual.nssurge.com/scripting/http-response.html)。QX 依据官方 [rewrite](https://github.com/crossutility/Quantumult-X/blob/master/sample-rewrite-with-script.js)、[bytes](https://github.com/crossutility/Quantumult-X/blob/master/sample-bytes-rewrite.js)、[echo](https://github.com/crossutility/Quantumult-X/blob/master/sample-echo-response.js) 和 [fetch](https://github.com/crossutility/Quantumult-X/blob/master/sample-task.js) 示例。

本轮重新读取 ScriptHub 当前脚本，与文件修订 [b943361](https://github.com/Script-Hub-Org/Script-Hub/commit/b943361f11be5795b3eb10f9cc4e5497642922fc) 的 [script-converter.js](https://github.com/Script-Hub-Org/Script-Hub/blob/b943361f11be5795b3eb10f9cc4e5497642922fc/script-converter.js) 内容一致。其前置兼容层思路可以参考，但 timer no-op、GET/POST 二分、错误变成功 null、全局 Header 变形、存储删除猜测和 `$done(` 文本替换均不作为等价实现依据。

`node tests/universal-script.ts` 实际以同一份 JS 字节运行 QX/Surge/Loon 上下文，验证原生与异端结果、正文仅出现一次、名称约束、源名及同名冲突、fragment、配置控制排除、共享地址和重复同步。`node tests/script-api.ts` 保留基础 API 矩阵、原件隔离、二进制和不兼容升级测试；`npm test` 运行完整检查。以上为 Node VM 和文件事务验证，仍需各客户端实机验证。

### 尚未解决的关键边界

- HTTP：Loon timeout 为毫秒（默认 5000），Surge 为秒（默认 5）；QX 对等请求超时/底层取消的契约尚未建立。QX build 934+ 的 auto-cookie 默认 false，而两种回调宿主默认 true；Loon insecure 默认 true、ALPN 默认 h1。下一步须逐选项映射七种方法，保留 Cookie、TLS、重定向、错误和容量，不把 DELETE 等改为 GET，不吞拒绝、不伪取消。本轮没有宣称通用 HTTP 已打通。
- Header：ScriptHub 的小写 Proxy 可能折叠同名字段、改变枚举及 Host；本轮保持阻断一般对象，后续应按字段操作和重复 Header 语义实现，不能全局改写作者对象。
- WASM：已检查仍受限的 Bixin 胶水代码，其解码后通过 `WebAssembly.instantiate(...,{})` 加载模块并调用 exports；源码外层一致不足以证明三端引擎、内存和导出 ABI。ScriptHub 当前文件没有提供该模块的等价纯 JS 后端。可行方向是针对实际导出操作实现独立解码/过滤器并用字节向量验证，或先确认各目标引擎支持；本轮没有注入空 exports 或把运行失败当成功。
- WebAPI：Surge 可能需要 WebView，不能假定 QX/Loon 提供同一编码/压缩对象；局部自带 polyfill 已按普通 JS 识别，真正宿主 API 则需要独立实现和标准向量。

新增验证：`node tests/script-capabilities.ts`，覆盖 script echo、局部绑定、存在性守卫、闭合对象、类接收者、构造器反射、简写逃逸、动态重声明和缺失存储值的三端执行及反例。原始 `.json` 脚本命名亦通过活动操作数进行完整引用检查，不截断扩展名。

## 2026-11-02：本次落实的下一阶段

Modified: 2026-11-02 (chance). 以下内容是当前实现，取代上文对应的“后续”描述；未覆盖的能力仍按边界保留。

- 多端框架：按来源软件折叠纯 `typeof` 宿主判断和同一顺序语句列表内已初始化的 const 判断，保留死分支 var 提升。局部同名变量、未知条件、TDZ、Annex B 函数提升、宿主变量写入、源码文本观察和 getter 接收者身份不确定时不强行裁剪。不执行作者代码来“判断”可达性。索引记录 specialization 次数和原因。
- Header：新增只读单字段子域：`const h=$response.headers; const key=Object.keys(h).find(k=>k.toLowerCase()==="content-type"); const value=key===undefined?undefined:h[key]`。保留作者查找表达式和原字典；限制 key 不外传，目标对查询字段验证 singleton string，重复大小写字段和数组值显式失败。直接区分大小写读取、写 Header、复制全部 Header 到结果、full-header 和 framing 尚不支持。此输入契约不等于一般 Header 对象兼容。
- 返回值：支持已知条件分支结果及闭合对象的静态标量字段读写、删除；未知别名、动态字段、Header/response 深层变化继续阻断。QX 混合放行/合成响应的声明歧义继续报告。
- HTTP：实际实现 Surge↔Loon 的窄回调适配，覆盖 GET/POST/PUT/DELETE/HEAD/OPTIONS/PATCH 与秒/毫秒换算，不改方法，不丢 Host，不吞网络错误，不将缺失响应改为成功。限定字面量 HTTP URL、正超时、显式关闭 Cookie/redirect、显式 UA/Accept/identity 编码、ASCII 请求/响应至多 64KiB、一个活动请求、忽略调用返回值、错误仅作布尔判断及响应仅读数字 status。HTTPS/TLS/ALPN、动态选项、一般响应头、二进制与 QX 超时/取消仍未证明。因此此能力只供已有底层转换接口使用，**不会发布只有两端通过的 Adblock 通用文件**。
- WASM：对源码中明确命名的 WASM_BASE64 字面量做不执行的检查，输出模块摘要、大小、imports/exports 和编译状态；不实例化、不执行 start、不伪造 exports。相同摘要可共用后续 ABI 调查，但不能仅凭 Node 编译通过就启用三端。未找到可解析字面量时也明确记录“尚未定位模块”。
- 问题分类：逐脚本记录 source-invalid / analysis-unresolved / mapping-missing / target-contract-unverified，区分分析尚未证明和目标契约欠缺；不能把 blocked 数量解释成确定无法运行的脚本数。

### 可运行的受控验证

执行 `node tests/support/http-contract-server.ts 8080` 启动仅监听 127.0.0.1 的本地测试服务；需要手机访问时显式传入第三参数，例如 `node tests/support/http-contract-server.ts 8080 0.0.0.0`，使用同一局域网内的电脑 IP。此测试工具不接入生产抓取/发布流程，不需要部署公共服务。

`tools/script-client-probe.js` 是手动 HTTP 脚本探针，各客户端以其支持的参数入口提供测试服务 origin；QX 可在测试副本开头直接设置 raw 为 origin（不改变正式通用脚本）。探针依次记录七方法、Host/正文、重定向、Cookie 关闭、重复 Header、字节、503、断连及延迟的实际结果；QX 延迟项记录自然完成，**不假设有等价请求取消选项**。WASM 项只编译自有空模块，不执行备份作者模块。探针日志是待采集证据，不是已经完成的实机验证。

`node tests/script-contracts.ts` 使用真实本地 HTTP 服务和 Node 实现的宿主 API 测试替身，验证方法、超时单位、Host、Cookie/redirect 选项、503、超时/断连、缺失响应和 Header/结果反例；`node tests/script-specialize.ts` 验证来源分支、变量提升、词法遮蔽、TDZ 和未知条件。这些测试不冒充 Surge/Loon/QX 实机。

Modified: 2026-11-02 (chance). 最终复核修正：来源分支优化使用局部文本替换，不整文件重排；未证明仅直接调用的函数体和类体不做内部裁剪，保留可隐式字符串化的作者函数文本。条件表达式取值保留 unbound callee 语义。HTTP 回调的 response/data 只允许在已证明 error 为假的成功分支观察，错误结果形状不猜测。补充相应反例验证。

## QX 请求参数策略：2026-11-02 用户更正

Modified: 2026-11-02 (chance). 以作者 [crossutility/Quantumult-X](https://github.com/crossutility/Quantumult-X/tree/af6fb594233ec4a3ec6d4ccb3601e9c36b75ea2d) 的示例为依据。下表及本节取代前文“QX timeout 未证明即阻断整个 HTTP 转换”的旧策略。

| 来源回调参数                    | QX 派发字段                | 当前处理                                            |
| ------------------------------- | -------------------------- | --------------------------------------------------- |
| URL、方法、headers、body        | url、method、headers、body | 保留七种方法和原值，继续受已支持的输入形状约束      |
| auto-redirect                   | opts.redirection           | 映射并显式保留源默认值                              |
| auto-cookie                     | opts.auto-cookie           | 映射并显式保留源默认值                              |
| insecure                        | opts.skip-cert-verify      | 映射并显式保留源默认值                              |
| policy                          | opts.policy                | 源内置 DIRECT 改为 direct，其余策略名称保留         |
| timeout、ALPN、其它未说明的参数 | 不发送                     | 按用户要求省略，不报参数错误；列表仅写外部状态/索引 |

依据包括作者的 sample-task.js、sample-fetch-opts-policy.js、sample-fetch-opts-filter.js 和 sample-bytes-rewrite.js；filter 示例已弃用，不作为活跃选项。响应 bodyBytes 是已说明的 ArrayBuffer 字段，不据此宣称请求也接受同名参数。

省略是用户授权的语义例外：不声称仍保留源请求级超时或 ALPN，不发明取消接口，不用计时器伪装请求取消。真实网络失败仍进入错误回调，成功缺少合法响应仍报契约错误；“参数不报错”不会吞掉业务 JS 错误。其它客户端的参数及 API 支持边界保持严格。

已证明的源回调程序可以通过 QX 桥接进入三端共同文件；仍须三个宿主及全部声明通过。QX 来源的任意 Promise/别名/动态结果程序不因这个例外自动视为已转换。`node tests/qx-http-options.ts` 验证七方法、参数无错省略、Cookie/redirect/TLS/policy、延迟/断连及同一文件的三端执行。

## 继续补充：对象流、存储及 QX 来源 Promise

Modified: 2026-11-02 (chance). 本节取代上文对应的旧阻断描述；QX 未说明的请求参数继续省略、不报参数错误。

| 能力               | 新增支持                                                                | 保留边界                                                                   |
| ------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 框架中的上下文使用 | const request/response/script 别名、最终仅作 Boolean 的逻辑守卫         | 未知 this、别名外传/写入、未知计算属性和身份 getter                        |
| 完成对象           | 闭合函数返回、已知 spread、条件结果、静态标量字段组合                   | 函数返回结果经其它调用逃逸、async/未知函数、动态展开和 Header 对象变形     |
| QX 字符串完成      | 原 response-body 声明已确认、String/undefined 类型流已证明              | 不推广到 header/request/echo，也不把任意动态对象强转字符串                 |
| 存储               | const 字符串键/拼接、确定非空的已知 JSON 根序列化                       | 缺失值差异、动态键归属、空字符串及未知值强制转换                           |
| QX Promise HTTP    | 七方法，受限 then/catch、本地捕获的 await，statusCode、文本或 bodyBytes | 动态 URL/headers、响应对象外传、详细错误观察、未捕获 await 和混合文本/字节 |

QX 来源的请求同样按作者示例过滤未知顶层/opts 字段，连 QX 原生分支也执行过滤；timeout、ALPN 等省略列表写外部状态，不往脚本加说明头。其它已说明选项保留映射和来源默认值。Surge/Loon 彼此的请求超时仍正常换算；QX 来源未定义对等超时时，不在其它端伪造请求取消，只使用实际原生行为。

bodyBytes 按精确偏移转为/转自 Uint8Array，不用整个底层缓冲区。HTTP 文本仍限已证明的 ASCII/64KiB/单活动请求及显式 UA/Accept/identity 输入域；这些实现不是一般网络库、任意二进制或实机认证。WASM、压缩、插件参数对象、富通知及未知接收者仍单列，不靠忽略整个 API 冒充成功。

新增验证：`tests/script-flow.ts` 检查对象别名、布尔守卫、函数/spread 结果、存储和逃逸反例；`tests/script-task.ts` 在真实本地 HTTP 服务上运行同一份三端脚本，检查七方法、Promise/await、网络/业务拒绝、偏移字节和参数省略；`tests/script-flow-production.ts` 经真实备份事务检查 body 模式、原始字节、固定地址、原位升级和外部元数据。
