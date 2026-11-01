# 去广告脚本的三端通用版本

Modified: 2026-11-01 (chance). 当前范围为去广告插件的 HTTP 脚本：Quantumult X、Surge、Loon 共用同一文件。配置控制 API、Module 工具、任务、Egern 暂不处理；原始插件和脚本的全仓库备份继续进行。

## 文件和引用

- 原件：`Resource/Backup/script/<URL SHA-256>/<源文件名>`，逐字节保存。
- 通用版本：`Script/Adblock/<来源主机>-<URL摘要前12位>/<源文件名>`。文件名及扩展名沿用源名，无扩展名不擅自补后缀，同名不同 URL 用目录区分；查询参数属于身份，fragment 参数保留在引用中。
- 出处、源/生成 SHA-256、三端上下文：`Resource/Backup/index.json`。脚本不添加 WayX 作者、来源、分类等内部声明，原作者的原注释保留。
- 当前结果：`Resource/Backup/script-api-status.json`。`universal` 为文件数，`adapted` 为成功重绑定的引用数；同一文件可被多处引用，不能将引用数当作脚本数量。

所有已通过的 QX/Surge 产物对同一原 URL 使用完全相同的通用地址，不再生成 source-to-target 文件。Loon 可以在原有 HTTP Script 声明中引用同一 JS；仍须保留正确的 requires_body、binary_body_mode 和触发阶段。本次没有额外生成 Loon 插件副本，也不修改作者原始插件快照。

上游更新时，Actions 同时更新原文备份、通用文件、索引及引用，地址保持固定。新版本未通过时保留已经验证的旧通用版本并报告源摘要差异；初次未通过不输出假通用脚本。旧方向文件只在没有活动声明引用后删除；范围外工具仍在使用的旧文件保留。

## 实现方式

源业务正文只放一次。程序识别真实宿主后，在来源客户端走原 API，在其它客户端走共同桥接层；不伪造版本、不吞错误、不用空函数冒充接口。生成前对每个已登记 HTTP profile 检查三端，不以其中两端通过推断第三端可运行。

同一 URL 可以用于多个请求/响应条件，运行时按 request/response 上下文选取计划。不同 tag 在脚本不读取名称时不再制造歧义和额外文件；脚本读取 `$script.name` 时保留已知来源名称。不能区分的 echo、binary 或可观察名称冲突继续报告，不任选一个声明覆盖其它声明。

已验证的子域包括文本正文处理、可映射的状态字段、受限 `$done` 结果与纯合成响应、QX ArrayBuffer 与回调宿主 Uint8Array 的精确偏移、显式字符串键/值写入和单键删除、普通三字段通知，以及 Loon 文档规定的一次性 interval。通用文件的语法检查按三端使用的普通脚本模式解析，保留源中显式的严格模式，不因仓库 type=module 强制改变语义。每项仍受来源与触发声明约束，不代表任意 JS、任意 API 均可转换。

## 去广告范围内仍需补充的能力

| 项目 | 当前边界 | 后续方案 |
| --- | --- | --- |
| `$task.fetch` / `$httpClient.*` | 方法、超时、取消、Cookie、重定向、TLS、错误和容量未形成完整映射 | 先限定请求选项和返回值，逐项验证；不能把非 GET/POST 方法改为 GET |
| Header | 大小写、重复字段、枚举和 framing 约束不同 | 对单字段操作提供明确映射，保留多值，并补三端实机结果 |
| 存储 | 动态键、缺省键归属、缺失值与返回值仍受限 | 显式绑定源身份，按具体类型/调用方式扩展；不能把空字符串当删除 |
| `$done` | 动态对象、混合放行/合成响应、部分终止字段不明确 | 做作用域与数据流分析，验证结果形状和 QX echo 声明 |
| 多端框架及动态 JS | Env 类、别名、反射和未执行的外端分支可能触发保守阻断 | 先增加词法绑定与可达分支分析，不能简单移除检查 |
| 二进制及编码 | 纯字节支持不等于任意编码/filter/压缩均等价 | 增加独立字节向量、错误和容量测试；二进制声明不能省略 |
| 参数、富通知、生命周期 | 对象参数、附件/延迟、取消和执行结束行为不同 | 分能力实现；保留类型和调度行为，不以定时器模拟持久通知 |
| 来源 profile | 不能从运行时区分的 echo/binary/名称冲突 | 保留逐声明身份；必须建立可验证的运行时判别后才能共用 |

`$config`、`$surge`、`$httpAPI`、`$configuration` 等客户端配置控制属于本轮 **范围外**，不再列为去广告兼容性待补项。现有静态分析仍较保守，blocked 代表尚未证明三端兼容，不等同于脚本一定不能在某端运行。

## 资料与验证

Loon [Script v2](https://nsloon.app/docs/Script/script_v2/) 修改的是声明语法，JS 方法仍见当前 [Script API](https://nsloon.app/docs/Script/script_api/)。Surge 依据 [JavaScript API](https://manual.nssurge.com/scripting/api.html)、[request](https://manual.nssurge.com/scripting/http-request.html) 与 [response](https://manual.nssurge.com/scripting/http-response.html)。QX 依据官方 [rewrite](https://github.com/crossutility/Quantumult-X/blob/master/sample-rewrite-with-script.js)、[bytes](https://github.com/crossutility/Quantumult-X/blob/master/sample-bytes-rewrite.js)、[echo](https://github.com/crossutility/Quantumult-X/blob/master/sample-echo-response.js) 和 [fetch](https://github.com/crossutility/Quantumult-X/blob/master/sample-task.js) 示例。

ScriptHub 已对照提交 [502cf03](https://github.com/Script-Hub-Org/Script-Hub/commit/502cf03f7db2e077d96c07c2cb151a8f0b152a80) 的 [script-converter.js](https://github.com/Script-Hub-Org/Script-Hub/blob/502cf03f7db2e077d96c07c2cb151a8f0b152a80/script-converter.js)。其前置兼容层思路可以参考，但 timer no-op、GET/POST 二分、错误变成功 null、全局 Header 变形、存储删除猜测和 `$done(` 文本替换均不作为等价实现依据。

`node tests/universal-script.ts` 实际以同一份 JS 字节运行 QX/Surge/Loon 上下文，验证原生与异端结果、正文仅出现一次、名称约束、源名及同名冲突、fragment、配置控制排除、共享地址和重复同步。`node tests/script-api.ts` 保留基础 API 矩阵、原件隔离、二进制和不兼容升级测试；`npm test` 运行完整检查。以上为 Node VM 和文件事务验证，仍需各客户端实机验证。
