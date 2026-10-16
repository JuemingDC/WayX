# WayX Conversion Specification

版本：2.11

更新：2026-10-16
作者：chance  
状态：唯一权威转换规范（Authoritative）

## 2.1 范围与证据

WayX 仅执行 Loon → Quantumult X / Surge 转换，Egern 不纳入转换链。本文件是唯一规范源，不维护分散规范副本。

源语法以 Loon 官方文档为准；目标语法和 API 必须有目标平台官方依据。上游插件正文用于理解源行为，不替代目标能力证明。第三方解析器只可作实现参考。

- Loon：https://nsloon.app/en/docs/Rewrite/rewrite_v2/、https://nsloon.app/en/docs/Script/script_v2/、https://nsloon.app/docs/intro。
- Quantumult X：crossutility/Quantumult-X 官方仓库中的 sample.conf、rewrite.md、sample-rewrite-request-header.js、sample-rewrite-response-header.js、sample-rewrite-with-script.js、sample-echo-response.js，以及用户提供的官方 sample.txt。
- Surge：https://manual.nssurge.com/，包括 URL/Header/Body Rewrite、Script、Module 与 Rule 文档。
- JQ：https://jqlang.org/manual/v1.6/。兼容基线为已验证的 jq 1.6，不假定客户端支持更新特性。

JSON/JQ 表达式以 jqlang 官方标准为依据，不采用第三方转换器模板。作者异步脚本组合工具属于实验入口，不进入常规同步或 canonical 产物。

## 2.2 编译与目标规划

数据流为源解析 → target-neutral Semantic IR → 分条及目标规划 → 目标输出 → validator → oracle/canonical/audit。通用 parser 保留源声明、section/phase、条件、Regex body/flags、captures、变量、选项及动作和声明顺序，不提前套用目标语法。含 Script 的混合声明使用共同词法 scanner 保留并拆分各 action，不把 Script 加入官方 Rewrite action registry。

IR 不包含目标 action 名、section 名、helper URL 或目标 fallback。共享 planner 的结果分为 native-equivalent、guarded-helper、phase-dispatcher、unsupported；转换结果可同时带兼容限制或明确的用户策略说明。

能够证明完整等价时优先 native；必要且已支持的语义缺口由共同 helper/dispatcher 承担；不能安全表示则注释源声明并诊断，不生成假可用规则。不得按插件 id、名称、作者或完整 catalog signature 特判。

用户指定的正则 flags 内联映射、QX 强制 enable、作者 argument 省略、单条 pipeline 分条输出和 JSON add/replace 直接 setpath 是明确的转换策略，不能称为完整源语义等价。除此之外，不静默删除条件或动作。

## 2.3 单条组合与声明顺序

组合指一条声明 action 区域中的 `|`，不指分开的同正则声明。独立声明按源顺序转换，不能因正则相同而跨声明择一或去重。

单条声明中的各 action 按源顺序分别规划和输出，保留 Script、Header、Body、JSON/JQ、Mock 和 URL 动作，不再按家族择一。Script 使用原作者 URL 及受支持选项；不能原生表达的独立 action 使用既有 helper 或明确诊断，失败 action 不删除其余成功 action。

动作分隔使用共同词法扫描器，保护 Regex alternation、逻辑 `||`、String/Raw String 内部 JQ 管道、变量、括号与 Script with 选项。数组批量参数仍属于一个 action，按数组顺序输出其目标操作。各文件依赖按原 action 索引绑定，Script 混合声明的分条在依赖发现、源审查和转换中使用同一入口。

不同目标可能跨 Header/Body/Script 分段执行，Surge/QX HTTP Script 仍有 first-match 行为。分条输出保留声明与动作，不据输出顺序宣称原 pipeline 的跨动作状态、条件快照或 first-match 行为完全等价；不串改原作者 Script 正文。源文件和原注释保留，QX 分段标题继续使用注释格式。

## 2.4 Regex、条件与捕获

源 Regex literal 只去除最外层 delimiter；仅结束分隔符后的后缀识别为 flags。逐字符保留主体中的转义、斜线、字符类、分组、量词和 lookaround，不作 case folding、全局 `\\/ → /`、捕获组重写；flag 内联前缀在目标输出阶段添加。

当前生产转换保留源 `i/m/s`：Surge 与 Quantumult X 原生正则字段将 `/pattern/i`、`/pattern/m`、`/pattern/s` 及组合 flags 转为 `(?i)pattern`、`(?m)pattern`、`(?s)pattern`、`(?ims)pattern` 等内联形式；无 flags 时不添加前缀。仅添加前缀，主体与源 AST/IR 保持不变。生成的 JavaScript helper 使用 `new RegExp(source, flags)`，不把内联修饰符放进 JavaScript 正则。内联映射是用户指定策略，尚不构成客户端引擎完整等价证明；原生 COMPATIBILITY LIMITATION 注释保留。生产原生 Header/Body 正则按同一内联策略规划，不因 `i/m/s` 单独生成 helper；严格等价检查接口仍独立保留。QX Header Rewrite 操作完整 Header 文本，只将可以安全限制到字段值并映射捕获编号的替换转为原生，其余保留 helper。Surge 使用 Header Rewrite / Body Rewrite；QX 使用 request/response-header、request/response-body。不支持的 `as` 捕获、动态值及条件继续使用 helper 或既有诊断。

动态 Regex 只接受完整 `/pattern/flags` 或语义 Regex 节点，不执行表达式、不二次展开变量，缺失或无效值不匹配；生成 helper 保留解析出的 `i/m/s`。

条件支持分组、AND/OR、类型化比较、内置 URL/method/status/header、已声明参数与捕获。失败分支不得泄漏 captures，missing/null/empty string 不混同。条件读取声明开始时上下文；动作中的 Header 模板可读取当前动作序列已修改的 Header。

condition capture 与 action-local `$0…$n` 使用独立作用域。捕获 alias 校验唯一性、参数冲突、路径必达及下标；缺失的可选 capture 跳过当前动作，后续动作继续，空串捕获是有效值。替换值不二次解释 JS `$&` 等语法。

guarded-helper 的 prefilter 可以 false positive，不能产生未被用户降级政策涵盖的 false negative；helper 内执行完整条件并安全 no-op。无 URL 约束的 mutation helper 使用 `^`。不能安全 no-op 的 echo 类型不得使用未经证明的宽 matcher。

## 2.5 字符串、动作参数与 URL

String 模板依据原始词法片段解析，支持已注册内置变量、声明参数与 captures，只展开一次。转义 `\${...}` 和 Raw String 保持字面量；双 backtick 保留 Raw String 内的 backtick。JSON Any 中的 Raw String 仍是 String，不把 JSON 外观文本改解释为 Object/Array。

批量参数按源顺序配对；空数组、嵌套数组、scalar/array 混用、不同长度仍非法。动态 Header 名称和 JSON key path 使用共同 String 模板/变量解析；未知引用诊断。

URL action 从 AST 模板生成替换值，保留未匹配前后部分；缺失 capture 跳过动作。Surge native URL Rewrite 只映射已支持的捕获及参数 placeholder；无法证明字面量美元、反斜线、空白或 `$0` 的原生表示时使用既有兼容/Review 边界。不扩大 QX 透明 URL 改写能力。

## 2.6 JSON 与 JQ

Key Path 解析为 String/Number segments，支持 dot key、数字索引及 quoted bracket key，不用简单 split('.')。对象读写仅处理 own property，特殊键和 `__proto__` 不触发原型 setter。

原生 JSON 使用共同 WayX JQ 生成器：

- add：采用 ScriptHub 的设置策略，直接 `setpath(PATH; VALUE)`，覆盖已有值并创建缺失路径；必要 helper 同样设置路径。
- delete：`delpaths(PATHS)`。数字索引批量按源顺序逐项调用，保留位移语义，不能合并成针对原数组的一次删除。
- replace：直接 `setpath(PATH; VALUE)`，不添加 getpath/has 或字段存在性检查。PATH 为保留 String/Number 类型的路径数组；批量替换按源顺序用 ` | ` 连接。遵循 jq 原生设置语义，包括缺失路径创建及类型错误。VALUE 保留源声明类型：字符串 `"[]"` 不等于数组 `[]`，不得统一字符串化。必要 JSON replace helper 同样执行路径设置，不检查末端字段是否存在。

add/replace 的 PATH 使用保留 String/Number 类型的路径数组，特殊键和数组索引不改变含义。生成的原生表达式不添加统一 type guard、`$__wayx_before` 或 try/catch 回滚，使用 jqlang 原生类型、错误和管道语义；作者自带 if/try/catch 保留。批量动作内部可形成有序原生操作，多个源 actions 仍按 2.3 分条。

单条固定作者 jq 或文件 jq 优先使用原 URL matcher 和 QX jsonjq-request/response-body、Surge http-request/response-jq；不因可编译为 JavaScript、嵌套路径、flags 或同阶段其它声明自动迁为 Script。原生 matcher 无法表示的纯 jq 声明保持既有 Review/注释边界。

动态路径/值、数组索引和复杂条件按各 action 的既有 native/必要 helper/Review 边界处理。固定对象路径的 JSON 批量动作原生优先，flags 不单独导致宽 matcher helper；有 flags 的原生映射保留兼容说明。

必要 JS runtime 支持的固定 JQ 子集可含 identity、固定对象赋值、del/delete-many、点分及 quoted bracket 路径，不支持任意完整 jq。一个 JQ action 成功才提交，失败回滚当前 action，先前 action 的提交不回滚，后续动作继续。原生 JQ 的错误行为不套用 JS helper 的事务语义。

## 2.7 文件依赖与上游 JQ 错误

jq_file、jq-path 和 mock_file 只读取源声明指定的原地址。JQ 文件内联实际程序，不把路径当 JQ、不用仓库副本替代、不为 JQ 文件本身创建脚本。作者表达式只做单行配置必需的转义、非字符串注释处理与空白压缩，不作代数改写。

文件动作按原声明 action 索引绑定，不能把单文件对象复用于整条多文件链。同 URL 可在一次 materialization 中复用读取；保留 actions 的成功/失败分别记录，文件 JQ 失败不丢弃相邻成功 action。读取失败、空文件或不能安全内联时保留文件引用并 Review。

仅修正经过真实 jq 编译验证的 `else .end` 分隔错误：原表达式编译失败且补成 `else . end` 后编译成功才内联修正；字符串、注释、合法 `.end` 字段不改，其它错误不猜测。输出保留原 jq、修正原因和保留 action 的声明；源文件不改写。inline/file/path 使用同一修正入口。

## 2.8 Mock 与共同运行时

单 action 的 response mock 可优先使用原生 mock/Map Local；远程 URL 不伪装成本地文件。需要生成的 mock helper 必须可重建、稳定命名、引用可审计。request mock 按目标生命周期规划，文本请求 mock 的共同 runtime 只覆盖已验证文本类型及 Base64=false；二进制边界不猜测扩张。多 action mock 链遵守 2.3，不以 native/echo 回退绕过复杂脚本失败。

共同同步 runtime 覆盖 Header set/del/replace、Body replace、JSON mutation、已支持的固定 JQ 子集及文本 Request mock。动作按源顺序执行；失败动作不阻止已支持的后续动作。Body owner 的 Header-only 命中保留当前 body，所有条件未命中返回官方 no-op `{}`。

Surge duplicate headers 用 full-header-mode=true 的数组模式保留项及顺序；涉及未证明的重复 Header 查找/模板读取时保持限制。QX header.add 的重复项语义不由对象 Header 模型冒充，沿用目标限制。

## 2.9 阶段所有权

阶段规划用 sourceIndex 区分声明，不按原文文本去重。能安全组合的同步声明按顺序进入一个 phase-dispatcher，前序提交供后续声明读取；各声明独立 captures，Request/Response 分离，每次阶段执行只调用一次 `$done`。只有首成员输出 dispatcher 引用，其余保留各自注释。

Surge 每阶段至多执行第一条匹配 HTTP Script。需要保证顺序的既有 helper owner 不简单输出为竞争脚本；用户指定的 2.3 分条 actions 独立输出，保留 first-match 限制，不宣称完整 pipeline 顺序语义。原生及 2.3 分条 actions 不被宽 dispatcher 吸收。

原作者 HTTP Script、legacy Rewrite、未适配的 JQ/echo/URL/二进制动作和未证明参数 transport 不能自动串入 dispatcher。单 URL helper 可按现有 COMPATIBILITY LIMITATION 保留窄 prefilter；既有独立声明的复杂条件无法取得安全阶段 owner 时诊断；2.3 拆出的 action 独立规划必要 helper，不重新进入 dispatcher。

Body Rewrite 与原作者 Script 的窄 owner 仅用于同阶段、同一个无 flags 的单 URL regex、至少一条已支持 Body/JSON/文本 Request mock、无 legacy/纯原生 JSON/JQ owner/未支持 action/参数冲突的声明组。dispatcher 在原作者 Script 前，匹配 Body Rewrite 时拥有该阶段，未匹配时不占作者 first-match 位置。不得推断仅 Header、多个 matcher 或额外条件可以与作者异步代码组合。

## 2.10 作者 Script 与参数

作者 Script 从原 URL 拉取供分析；活动声明保留原作者 URL，不镜像、不 fork、不内联、不包装、不改正文。下载失败保留原 URL，不声称取得源码或完成客户端审查。

所有受支持触发类型保留 phase、requires_body、binary_body_mode、timeout、enable、debug、argument 和 trigger IR。body 与 binary 选项独立，不能互相推导。

QX 强制启用可表示的作者 Script：固定 false、默认关闭及动态 enable 均输出活动声明并说明用户策略；注释源行仍关闭。QX 不输出未证明的 enable/timeout/debug/argument Rewrite 字段；binary_body_mode 按既有说明省略。Cron task 只输出官方 sample 证明的字段。Surge 遵循源 enable，使用已支持 timeout/debug/body/binary 字段。

Surge 没有显式 timeout 时：legacy HTTP 取源默认 10 秒；Script v2 的 Request/Response 取源默认 20 秒，Cron/Network Changed/Generic 取源默认 300 秒；旧版非 HTTP 类型取源默认 300 秒。显式合法静态/动态 timeout 保留；QX 的省略策略不因 Surge 默认值变化而改变。

目标不支持的合法作者 argument 直接省略，保留原 task、作者 URL 和受支持选项，并说明省略，不以参数无法编码丢弃整条 task。QX HTTP/非 HTTP 均省略 argument；Surge 支持的 String/PluginObject 参数按既有编码保留，合法但无法编码则省略。无效源结构/绑定仍诊断，不以目标省略掩盖错误。

Script v2 path/tag/img_url 必须是固定 String/Raw String，真实模板或变量无效；path 非空。往返输出保留原 token，转义/raw `${...}` 不改成会插值的字符串。PluginObject 是非空、唯一参数标识符列表，不允许内置变量、captures 或重复引用；有参数作用域时校验声明绑定，无作用域的直接 API 不猜测声明。

动态 enable/debug 要求 Boolean；timeout 要求 Number 或完整解析为有限正数的 String。未声明、错误类型/默认值、已声明但无默认值分别报告。QX 在省略前校验角色，enable 强制覆盖不被默认值关闭。Surge 未证明的缺省动态 transport 仍保持 Review 边界。

动态 Cron 引用须为已声明 String，基线默认值非空并有五或六字段。Surge 使用参数 placeholder，QX 采用已支持默认值并强制 enabled。字段数量检查不等同完整 Cron 或客户端调度验证，不扩展固定 Cron、参数等价传递和缺省回退检查。

## 2.11 Rule 与目标输出

Rule 使用独立 target-neutral IR，仅输出官方已确认的 type/policy/参数。除下面列出的用户策略外保留源 policy；Surge 的 PROXY 需要外部 Module 参数绑定，QX 保留字面 policy 名。不用 HTTP Rewrite Script 冒充 QX 网络层缺失的 Rule 类型。未知或不能安全表达的类型注释并诊断。

Loon build 1008+ 的 `DOMAIN-WILDCARD` 使用完整域名 Glob 匹配，支持 `*`（含零字符、跨点）、`?`（一个字符）、`[abc]`、`[0-9]` 和 `[!abc]`/`[^abc]`。Surge 使用官方 `DOMAIN-WILDCARD` 原样保留 pattern（包括逻辑子规则），沿用 policy 绑定及 matching 增强；不得降为 DOMAIN-SUFFIX 或 URL-REGEX。QX 按用户确认，将所有形式的 `DOMAIN-WILDCARD` 统一直接映射为 `host-wildcard`，完整保留 pattern，包括字符集合、范围及否定集合；不添加 pattern 形式判断、Review 拦截或 HTTP Script。类型命名与分段格式仍遵循上传的《示例配置(1).txt》。原注释、禁用状态、作者、转换时间与分类沿用共同输出逻辑。

依据：Loon https://nsloon.app/docs/Rule/domain_rule/；Surge https://manual.nssurge.com/rules/domain.html；QX 为用户上传官方示例。Script Hub Beta `b31b010d111aa81e8b89635f08d401c960d29538` 的 Loon/Surge DOMAIN-WILDCARD 保留逻辑仅作实现参考，不替代上述目标官方依据。

源 Rule 的 URL-REGEX（包括逻辑子规则）若包含 ICU 不接受的 `{数字, 空白数字}`，仅在字符类、转义和 `\Q...\E` 之外、上下界有效时移除逗号后的空格。源快照/AST 保留原文，目标修复须注明原因及源声明；不修改被转义的花括号、字符类或无效上下界，不据此作通用正则重写。此例外用于修复原本无法编译的量词语法。

用户指定的精确域名例外：所有转换产物中的 `DOMAIN,dns.weixin.qq.com` 和 `DOMAIN,dns.weixin.qq.com.cn` 使用 DIRECT（QX 为 `host, ..., direct`），在目标 planner 统一执行，不依赖插件 id。源 Loon 快照保留原文；不扩展到 DOMAIN-SUFFIX、DOMAIN-KEYWORD、逻辑子条件或其它子域名。Surge DIRECT 不携带仅适用于拒绝策略的 pre-matching；extended-matching 沿用既有目标规则。

Loon `[Rule]` 的 `URL-REGEX,<regex>,REJECT` 转为 Quantumult X 重写 `<regex> url reject`，不再默认使用 `reject-200`。仅当源 policy 明确为 `REJECT-200`（识别不区分大小写）时输出 `<regex> url reject-200`；不得根据 URL 文本、响应猜测或普通 REJECT 推断 HTTP 200。原有 `REJECT-IMG/DICT/ARRAY` 专用映射、`REJECT-DROP` 映射以及 Surge 输出不变；DIRECT/PROXY 等非拒绝策略不得强制改写为 reject。此规则只约束 Rule 中 URL-REGEX 的目标适配，不改变 `[Rewrite]` 里显式 action 的映射。 Rule 策略及 Rewrite v2 的动作/状态码均从各自基础映射表直接查找；Safe Tier 复用同一 Rewrite 原语查询，不再维护独立拒绝映射或追加特例分支。

基础映射表显式登记全部 29 个已知 Rule 类型（含插件范围外的 FINAL 边界）、15 个策略及 31 个 Rewrite v2 action。Rule 策略共用 `qxFilter/qxRewrite/surgePolicy/surgeMap` 四列，不再在调用方额外改写 REJECT-IMG 或拼装拒绝响应。`URL-REGEX` 的 REJECT-NO-DROP 与现有 REJECT-DROP 一样适配为 QX `reject`；这不宣称保留连接丢弃、重试或自动升级行为。QX 网络层无对应类型及超出插件范围的条目显式记为 null。Header/JSON/JQ 目标类型由共同 `REWRITE_MUTATION_MAPPINGS` 表登记，不因需要参数转换而记 null：request/response 的 header.add/set/del/replace 均映射到 QX request-header/response-header；json.add/delete/replace/jq/jq_file 均映射到 jsonjq-request-body/jsonjq-response-body。Surge Header 使用 http-request/http-response 与 header-add/header-del/header-replace-regex，set 依次执行 header-del 与 header-add；JSON/JQ 使用 http-request-jq/http-response-jq。文件 JQ 先解析并内联原表达式，JSON 路径转为 JQ，Header 字段操作转为目标参数。表中类型存在不跳过参数、重复字段、动态值、捕获和 matcher 的语义校验；复杂情形继续由现有 planner 选择 helper 或诊断。新增源 action 或目标能力必须同步补表并通过完整性及交叉矩阵测试。

Surge 逐条 Rule 使用已支持的 pre-matching/extended-matching 增强，保持类型与官方最低应用版本边界，不根据 Body Rewrite 的 CORE_VERSION 推断这些能力。QX 不输出 Surge 参数或 no-resolve 字段；目标不支持的属性按明确目标策略处理。

QX 原生 URL Rewrite `reject` 按上传官方 sample.conf 返回空体 404；短时间内重复请求越多，软件响应延迟由 0 秒增至最多约 5 秒。这是响应延迟，不是规则开始生效的时间或规则寿命；官方示例没有证明按源 App 独立计数。Rule 的 URL-REGEX → reject、legacy reject、v2 reject(404) 均保留原生目标动作，由 QX 自行计数和延迟，不添加计数器、定时器、脚本响应或改为 reject-200。显式 200/图片/对象/数组变体保留各自类型，不推断它们有相同延迟机制。filter 的 reject（含 DNS 行为）、URL rewrite 的 reject 与 Surge 自动 REJECT-DROP 升级机制分别处理；复杂条件或自定义响应本来需要 helper 时，不宣称 helper 复现原生 backoff。输出校验器与能力清单共用原生 reject 动作集合，Body/Header 的匹配与替换 action token 必须同阶段。

所有目标配置在生成和发布前必须独立校验外层 URL/Headers 匹配表达式，不能因 Script 内含完整条件而跳过。校验空值、未展开变量、括号/字符类/转义完整性及公共 Regex 语法；QX 同时校验分段与 action，Surge 同时校验各 HTTP 处理分段及 Script 参数。公共 Regex 语法检查不宣称 JavaScript 与客户端 ICU 引擎等价；保留 ICU 专用构造，并检查其传输与结构。全仓库审计收集已经序列化到配置中的实际表达式，调用运行环境 ICU 批量编译，任何失败或 ICU 不可用均阻止发布；不以脚本内部条件或库名注册代替输出验证。运行环境 ICU 的语法检查不等同于各客户端版本全部语义和生命周期的运行证明。

Surge Script 的 pattern 含逗号、空白或引号时统一使用公共参数编码器，保持 Regex 反斜线；validator 按引号解析逗号分隔参数，拒绝截断、残缺或重复参数。该规则覆盖源 Script、legacy/v2 Rewrite helper 和复杂动作 helper。

带 flags 的静态 URL 条件在 helper 的外层预筛选中同样保留 `(?i/m/s)` 形式，不因 flags 退化成宽匹配。固定 String/Raw String URL 相等条件直接编译为转义字面量并首尾锚定的 Regex，复用 QX/Surge 原生动作与 Script 声明；动态 String 不作静态相等映射。没有可安全下推的 URL 条件时可以使用合法宽匹配，但 helper 必须执行完整条件，且不能据此绕过合成响应的精确条件要求。

QX 重定向统一使用官方原生 `<URL正则> url 302/307 <目标地址>`；存在可精确表达的请求条件时使用 `url-and-header`。URL 捕获 `${alias.N}` 转为 `$N`，保留源正则主体、flags 映射和规则顺序。不得将原生 302/307 转成 redirect helper 或宽匹配 `^ url script-echo-response`；无法用原生语法完整表达的条件或模板保留源声明并诊断，不生成重定向脚本。

QX 仅输出官方证明的 url/url-and-header、reject 系列、302/307、header/body/jsonjq/echo 及各 Script action。url-and-header 的 URL 先匹配，再检查 method/path/request headers。response-body Script 可同时返回 body/headers/status，但不能冒充只改 Header 的 action；echo-response 的宽 matcher 必须满足安全边界。

QX 原生 request-header 与 response-header 使用同构语法：`URL正则 url request-header 匹配正则 request-header 替换文本`，响应阶段将两个 action token 均改为 response-header。匹配对象是完整 Header 文本，可跨 `\r\n` 匹配多个字段；request-header 的完整文本还包含请求行。request-header 的整体匹配语义依据官方 sample.conf，response-header 的同构语法依据用户于 2026-10-07 的确认，不能因官方示例未列出响应阶段就判为不支持。原生 lowering 仍须保持字段边界、捕获组编号、重复字段与动作顺序；固定 set 映射为删除已有同名字段后插入，固定 del 映射为字段行删除；字段内 replace 保留字段前缀并偏移源捕获编号。复杂条件、动态值、跨行或边界敏感的字段替换继续使用 helper。

Surge native URL/Header/Body Rewrite/Map Local 能安全表示时优先；原生处理次序不等价时由已支持 runtime 或诊断承担。Body Rewrite 等 requirement 由实际活动目标字段推导，不因注释行或移除的字段保留无用 requirement。

## 2.12 Metadata、MITM 与注释

MITM hostname 只作目标格式适配，不扩大范围。保留有效源注释、作者、名称、说明、图标及更新时间；目标添加 Converted、Converted by: chance、Category（适用目标）、Source、Target。QX section 标题使用注释形式；Surge 仅用支持的 Module metadata。

QX inline note 仅在一条注释唯一对应一条活动声明时使用，否则普通注释保留。拆分输出的源注释只绑定首条，不复制成多个伪一对一注释。注释源 Rewrite 只输出关闭的已支持形式，不复活活动规则，不生成无用 helper。

Script v2 双目标共用绑定检查入口，顺序固定为 AST 类型、动态 Cron、PluginObject、动态选项；保留原来的首个错误与目标特定的 QX force-enable 规则。QX HTTP action 按声明 phase 与对应 body 依赖直接选择 script-request/response-header/body；任务和 HTTP 的 force-enable 说明共用同一逻辑。

Mock/JQ 依赖共用 Rewrite/Script 声明收集与 action 索引结果装配；格式解析、读取方式和单文件结果形状仍按各自契约执行。Mock 的单文件形状按文件 action 数量，JQ 按原声明 action 总数判定，不能合并成同一个条件。多 action 按原索引记录成功值及错误，失败不删除相邻成功结果；只在原有声明范围内复用读取，保持原错误文字、源 URL、输出内容与事务边界。

## 2.13 Catalog 与原地址获取

loon-static.json 保存人工固定来源；RuCu6 插件正文只从 rucu6.pages.dev 拉取，不按类别筛选。目录每次读取作者消息 https://t.me/GitCube/327（可通过 Telegram 官方 telegram.me 别名读取同一消息），只解析消息正文中的插件链接及短链接跳转后的导入地址；短链接仅用于发现，跟随 HTTPS 短链跳转，在 Location 已包含直接插件地址或 Loon 导入页 plugin 参数时立即提取并停止网络访问，不读取导入页；按查询参数解析并处理 HTML 实体及百分号编码，保留目录顺序并按规范化地址去重。瞬时失败最多重试 3 次；任一插件短链失败使刷新失败并保留当前清单及产物。最终插件 URL 必须属于 rucu6.pages.dev/Plugins/*.lpx。也支持 RUCU6_LIST_URL 或 --rucu6-list-url 指定该域名的 JSON/列表目录；每次刷新读取目录，新增自动登记，同 URL 保持稳定 id/路径。缺失完整目录或目录无法枚举时明确报告发现不完整，不把固定名单验证称为发现全部新插件；不得猜测文件名冒充完整目录。

loon.json 为完整生成态 Catalog。可莉目录从 https://hub.kelee.one/list.json 发现去广告/依赖的官方 Lpx 项目，保留 feed 顺序，同 source URL 复用稳定 id/目标文件名；其它类别不自动扩大范围。

用户明确停拉的来源优先于目录发现。自 2026-10-08 起，排除可莉的 `Bilibili_remove_ads.lpx` 与 RuCu6 的 `bilibili.lpx`；查询参数或 fragment 不改变排除身份。动态目录与旧静态清单均不得重新引入这两个源，按现有受管理产物清理契约删除其源文件、目标与生成 helper，不影响其他作者来源。

Plugin、作者 Script、JQ/mock 依赖均读取原作者 URL。host profile 可选择 User-Agent、Python urllib 或 Node fetch，原 URL 不变，不用镜像/仓库 fallback；瞬时网络错误只有限重试同一 URL。Python 抓取成功只证明可取得内容，不证明真实客户端执行、编码、压缩或缓冲等价。

发现入口将原始响应及来源 URL 交监控复用，缺失/空内容/来源不符失败，不重复获取另一份目录。报告记录新增、修改、删除的实际条目，新语义必须先审查，不自动修改 capability/golden baseline。

端到端黄金测试使用 `fixtures/end-to-end-sources/` 中的固定离线输入，不读取每天同步更新的 Resource 源文件；输入快照及预期摘要仅在审查后共同更新。实际 Catalog 与最新源的校验仍由目录 inventory、全量转换、canonical 和成品验证承担，不能以固定黄金样本替代。

## 2.14 全量转换、事务与发布

每次 Action 获取全部 catalog entry，重新解析、物化依赖、转换并验证；不因源 unchanged、已有目标或上次结果跳过。生成器/规范及同 URL 依赖变化在源声明不变时也能生效。

逐文件比较实际内容，只忽略转换器生成的 Converted 时间（含 dispatcher 嵌入时间）；相同不写入、不刷新原时间/mtime。QX、Surge、helper 分别比较，缺失补建；变化文件不导致其它相同文件被覆盖。源按真实 bytes 变化写入，废弃生成 helper 自动 prune，手写脚本保留。有效清单生成后清理所有退出名单的受管理源、QX/Surge 目标及生成脚本，并补清理历史遗留孤立产物；保护当前条目复用的路径及脚本目录。手写独立资源不属于退出拉取名单的受管理产物。目录读取或校验失败不能据此批量删除。

单插件的源/目标/helper 写入事务可回滚，失败不留下部分新旧产物；一个插件失败不阻止其它正常插件。未知语义或 target Review/Issue 在写盘前隔离，既有条目保留旧基线并重试，首次失败条目暂缓。rollback 失败、stale head 或任一全局门禁失败必须阻止发布。

sync 是产物与 README 的写入入口；canonical/README 验证只检查，不重复写盘。报告区分全部成功转换、实际更新、内容相同、保留及暂缓，不把未覆盖称为未转换。

## 2.15 README 索引

根 README 保持标题、导航、BoxJs/Module/Adblock/Rule 顺序及 Name/Quantumult X/Surge 三列。Adblock 按实际拉取来源分组，不按插件内 `Author` 或 Converted by 署名分组。已登记资源使用 Catalog 的 source；未登记资源从 QX、Surge 的 Source 注释依次取得原地址。kelee.one 及其子域归“可莉”，rucu6.pages.dev 归“RuCu6”，GitHub/raw.githubusercontent.com 地址归仓库 owner；其它有效来源使用域名，缺失或无效来源归“本地资源”。资源署名与原作者 URL 保留在资源文件中。

来源组按条目在 Catalog 中首次出现的顺序排列，组内保留 Catalog 顺序；未登记资源随后按文件名稳定排序。每个资源只出现一次。每组使用 GitHub 支持的 details/summary 默认折叠，summary 显示来源名称与资源数量，名称作 HTML 转义；summary 后及表格结束处保留空行，使三列表格正确显示。README 提示点击展开后使用页面查找定位资源，不添加脚本或无效搜索框。

按实际目标文件生成索引：新增加条目，删除删条目，单目标缺失显示 —，空来源组不保留；已退出拉取名单的自动管理产物必须实际删除，不继续展示过时条目。安装 URL 与每日 update-interval=86400 保持。相同 README 不写入，校验须核对来源分组、折叠结构、资源数量、组内顺序、链接与实际产物一致。

## 2.16 自动化与报告

唯一 GitHub workflow 为 .github/workflows/converter-check.yml，每日 UTC `30 17 * * *`（北京时间 01:30）及手动/PR 执行。远端只允许 main，最多另有 test；checkout 后核对分支预算。Work 自动活动不因此恢复。

语法检查 → 目录刷新 → converter checkpoint → 全量 sync → 成品验证/监控/报告 → Issue/发布门禁。可写 main/test 执行完整监控并要求 complete=true；只读 PR 不写 Issue、mirror/state。syntax 成功即可尝试监控，不因转换失败省略全部规范检查。

Review inventory baseline 必须可读且结构有效，不能跳过比较。同步/监控报告只在 ENOENT 时允许为空；损坏 JSON、结构/版本/IO 错误使 Issue 步骤失败。同步报告支持版本 1/2，监控报告支持版本 1。每次新语义/同步/监控失败使用稳定 fingerprint 复用 Issue，保留源声明、阶段、错误与回滚结果。

监控告警恢复在现有 Issue 生命周期统一处理：仅完整、无失败且明确列出该来源成功的报告可关闭带受管监控标签的对应告警。缺失报告、未覆盖来源、失败或只读执行不得关闭告警。

发布只允许通过全部 required gates 的产物，提交前核对请求 head 未推进，提交后确认受管工作区无未保存变化。日志、发现结果、监控缓存、失败报告和生成产物随已有 artifact 保存。

流程控制由 `.github/scripts/automation.py` 承担：分支预算、语法/checkpoint/成品验证编排、Issue 写入或只读选择、发布门禁、受管 Git 提交与 run summary。YAML 保留事件和阶段条件；Bash 仅调用程序并转存日志，不嵌入业务分支或 Python heredoc。发布程序继续核对 expected head、限制 main/test 与受管提交范围，并检查产物工作区。Node.js 26、Python 3.14 及转换核心语言不因该迁移改变。

## 2.17 验证要求

保留 syntax、core/rewrite/script/conversion/architecture/workflow/official-capabilities/runtime、catalog、target policy、canonical、managed cleanliness、repository audit、helper/ref、作者 URL 与确定性检查。Inventory 只锁 semantic token，不使用完整 AST signature 白名单。

Oracle 使用独立源 reference evaluator、目标 lowering 模型及实际生成脚本/原生 jq 对照。覆盖命中/no-op、URL/method/headers/body/status、captures、动作顺序、阶段所有权、单次 `$done`、missing/null/false/空值、Unicode/转义/原型键、依赖失败隔离与事务回滚。条件证据分别统计 false-positive / false-negative evidence；finite fixture 不能单独证明 native-equivalent，仍须结构及官方能力依据。

用户降级策略的目标预期与源全行为 oracle 分开，不据 flags 内联映射或 JQ 分条宣称源行为完全等价。Golden 在独立语义检查通过后仅用于发现输出漂移，不用更新 Golden 掩盖错误。真实 jq 编译和结果/错误传播同时验证。

验收包括上游预检/目录/转换一致选层、真实同正则独立规则保留、分条 JSON/JQ、错误 JQ 诊断作用域、README 来源分组/折叠及增减、完整 Action 和逐文件内容比较。零 Review/Issue 不等于全 Loon 语法或真实客户端行为已证明。

## 2.18 实现组织与契约对应

根目录为 .github、README.md、Adblock、Resource、Boxjs、Module、Rule、Script。生产实现为十个领域文件和 index.mjs 公开入口；不新增平行碎片或旧路径转发壳，结构调整保持公开函数、原作者 URL 和外部产物接口。

| 文件 | 职责 |
| --- | --- |
| core.mjs | Regex/条件解析、reference evaluator、目标能力与等价规划 |
| rule.mjs | Rule IR 与目标适配 |
| rewrite.mjs | Rewrite parser/IR、选层、JSON/JQ/依赖、复杂动作规划 |
| script.mjs | Script scanner/parser/IR、Argument 与目标适配 |
| configuration.mjs | General/MITM IR 与目标适配 |
| input.mjs | Catalog、原地址抓取、插件解析与 materialization |
| output.mjs | Metadata/注释、目标序列化与 validators |
| runtime.mjs | 共同 helper/dispatcher emitter |
| workflow.mjs | 产物生命周期、README 索引、诊断与报告 |
| conversion.mjs | 共享选层、物化、转换与验证 pipeline |
| index.mjs | 统一公开 exports，不复制实现 |

同类问题在所属领域的公共入口修复，不按插件名、来源名或 Issue 编号追加特殊分支。Regex 语法修复、目标参数编解码与共用校验集中于 core.mjs；rule.mjs 只负责规则 AST 和目标规划，output.mjs 负责目标格式验证。自动化的正则编译与验证编排相邻组织，Issue 创建、复用和恢复关闭统一由 propose-conversion-issues.mjs 管理。测试补在现有领域套件，不新增平行实现文件。

生产入口为 .github/scripts/sync-convert.mjs；canonical 为 .github/converter/tools/regenerate-canonical.mjs；QX/Surge validators 位于 output.mjs。测试归领域套件，以独立子进程隔离各案例。

| 契约 | 实现入口 | 验证 |
| --- | --- | --- |
| Script/JSON/JQ 全动作分条 | splitScriptPipelineSources、selectRewritePipelineLayer、rewriteV2Action | conversion-policy、upstream-automation、catalog |
| 原 action 索引与依赖隔离 | input materializers、resolveRewriteJqDependencies | conversion-context、runtime/file isolation |
| 复杂脚本及阶段 owner | planRewriteFeatureHelper、prepareRewriteDispatchers | runtime/oracle、phase/author ownership |
| 作者选项与参数 | Script planners、共同绑定校验 | script、conversion-policy |
| README 来源折叠组及动态索引 | buildReadmePlan、sync transaction | readme-index、managed cleanliness |
| 原地址、全量转换与不覆盖 | input transport、sync-convert、workflow lifecycle | source-fetch、事务/发布测试、完整 Action |

能力扩展必须先有源/目标官方依据及独立语义证据，再经过完整目录、canonical、validator 和 Action。不能仅为减少诊断而扩大未证明的转换范围。
