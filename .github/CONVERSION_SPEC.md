# WayX Conversion Specification

版本：2.31

更新：2026-10-30
作者：chance  
状态：唯一权威转换规范（Authoritative）

## 2.1 范围与证据

WayX 支持 Loon → Quantumult X / Surge 及原生 Quantumult X → Surge 转换，Egern 不纳入转换链。本文件是唯一规范源，不维护分散规范副本。

源语法以 Loon 官方文档为准；目标语法和 API 必须有目标平台官方依据。上游插件正文用于理解源行为，不替代目标能力证明。第三方解析器只可作实现参考。

- Loon：https://nsloon.app/en/docs/Rewrite/rewrite_v2/、https://nsloon.app/en/docs/Script/script_v2/、https://nsloon.app/docs/intro。
- Quantumult X：crossutility/Quantumult-X 官方仓库中的 sample.conf、rewrite.md、sample-rewrite-request-header.js、sample-rewrite-response-header.js、sample-rewrite-with-script.js、sample-echo-response.js，以及用户提供的官方 sample.txt。
- Surge：https://manual.nssurge.com/，包括 URL/Header/Body Rewrite、Script、Module 与 Rule 文档。
- JQ：https://jqlang.org/manual/v1.8/，稳定版基线 jq 1.8.2。Action 下载官方二进制并校验固定 SHA-256，转换与最终语法检查使用同一版本；不以此推断客户端内置引擎版本。

JSON/JQ 表达式以 jqlang 官方标准为依据，不采用第三方转换器模板。作者异步脚本组合工具属于实验入口，不进入常规同步或 canonical 产物。

## 2.2 编译与目标规划

Modified: 2026-11-01 (chance). 用户授权修正墨鱼 EmbyPlugin 的指定错误声明：仅当源 URL 为 ddgksf2013/Rewrite/master/Function/EmbyPlugin.conf 且整条原文完全匹配时，将 `$Accept-Encoding` 修正为双 CRLF 捕获引用 `$1Accept-Encoding: gzip, deflate, br$2`。保留原声明注释，不推广至其他源、不改变 URL 或脚本。见 docs/moyu-sources.md。

数据流为源解析 → target-neutral Semantic IR → 分条及目标规划 → 目标输出 → 一次最终产物检查。oracle/canonical 为开发者按需运行的工具，不进入日常同步 Action。通用 parser 保留源声明、section/phase、条件、Regex body/flags、captures、变量、选项及动作和声明顺序，不提前套用目标语法。含 Script 的混合声明使用共同词法 scanner 保留并拆分各 action，不把 Script 加入官方 Rewrite action registry。

IR 不包含目标 action 名、section 名、helper URL 或目标 fallback。共享 planner 的结果分为 native-equivalent、guarded-helper、phase-dispatcher、unsupported；转换结果可同时带兼容限制或明确的用户策略说明。

能够证明完整等价时优先 native；必要且已支持的语义缺口由共同 helper/dispatcher 承担；不能安全表示则注释源声明并诊断，不生成假可用规则。不得按插件 id、名称、作者或完整 catalog signature 特判。

用户指定的 QX 正则 flags 省略策略、QX 强制 enable、作者 argument 省略、单条 pipeline 分条输出和 JSON add/replace 直接 setpath 是明确的转换策略，不能称为完整源语义等价。除此之外，不静默删除条件或动作。

<!-- Modified: 2026-10-25 (chance). Make source/target semantic equivalence the default invariant and distinguish explicit semantic exceptions from syntax preferences. -->

**转换前后语义一致是默认硬约束。** 任何输出压缩、合并、拆分、原生化或语言/架构调整都服从此约束。先用源平台官方说明或可复现的源客户端行为确定源语义，再验证目标表达式；目标 jq 文档、语法检查成功、目标表达式之间结果相同，均不能单独证明与源规则等价。不得把未经证实的“默认顺序执行”或“默认同一输入批量执行”当作事实。

等价范围包含匹配条件、作用阶段、字段及值类型、路径不存在时的行为、数组索引及删除移位、重复和父子重叠路径、动作顺序与边界、失败/跳过/回滚以及后续动作是否继续。用户要求某种写法或“合在一起”，只授权调整表达形式，不自动授权改变以上行为。无法证明请求的形式等价时，明确说明限制并使用已证明的等价路径或既有诊断边界，不靠猜测输出代码，也不能把目标原生行为直接定义成源语义。

Modified: 2026-11-02 (chance). QX 未说明参数按用户要求省略且不报参数错误；HTTP 选项见 2.25，`$argument` 的安全作者默认分支限定见 2.27，不扩展为忽略未知 API。

**例外仅限用户明确授权的具体行为。** 已有显式转换策略按本节前文保留；例如 `jq_replace` 明确要求使用 `setpath(PATH; VALUE)`，包括覆盖值及创建缺失路径，这是已授权的策略差异，不能据此认定 delete 或其它操作也可改变语义。例外记录必须说明源操作、目标写法、授权的差异及适用范围；不能把一种操作的例外推广为全局规则，也不能把结果宣称为完整语义等价。作者原有 jq 不因生成器的某个例外而被重写。

<!-- Modified: 2026-10-25 (chance). Explicit user instruction: add no-resolve to Surge IP rules across all generated sources. -->
Surge 输出的目的 IP 类规则（IP-CIDR、IP-CIDR6、GEOIP、IP-ASN，包括复合条件中的 IP 子项）统一补一个 `no-resolve`，已有参数不重复；Loon 转模块、原生 QX 转模块、分流规则集与独立含策略片段使用相同策略。保留地址、策略、其它参数及规则顺序，不向域名规则添加此参数，QX 原生输出不变。这是用户明确授权的解析行为差异：未解析的域名请求跳过 IP 条件，不由 IP 规则主动触发 DNS；不能宣称它与未加参数的源行为完全相同。依据 https://manual.nssurge.com/rules/ip.html 。

<!-- Modified: 2026-10-25 (chance). Record the explicit original-URL Script lowering exception, including both echo modes. -->
用户明确授权原生 QX Script 声明直接转换为 Surge 通用 HTTP Script，保留作者脚本原始字节；根据本次后续授权对独立适配副本执行 AST API 分析与受限转换；根据 2026-11-01 授权，发布前将脚本资源操作数绑定到已校验的 WayX 备份地址。`script-echo-response` → `type=http-request,requires-body=false`；`script-analyze-echo-response` → `type=http-request,requires-body=true`（QX 官方示例明确后者等待请求体）。普通 request/response 的 header/body 脚本分别保留阶段并设置 requires-body=false/true。声明映射和内部 API 映射分别验证；只有 API 规划通过的已支持子域才引用适配文件，不能以声明通过推断原脚本已经等价。Surge http-request 支持脚本直接返回 response；原作者程序是否使用该格式由源码分析与原触发类型确定；适配遵守 2.23 的严格边界。未进入 2.26 明确授权例外的 `url-and-header` 仍注释并保留完整源声明和诊断，不静默删除 Header 条件，也不生成无法保留完整整头语义的脚本。

## 2.3 单条组合与声明顺序

组合指一条声明 action 区域中的 `|`，不指分开的同正则声明。独立声明按源顺序转换，不能因正则相同而跨声明择一或去重。

单条声明中的各 action 按源顺序分别规划和输出，保留 Script、Header、Body、JSON/JQ、Mock 和 URL 动作，不再按家族择一。Script 使用已校验的 WayX 备份地址及原声明受支持选项；不能原生表达的独立 action 使用既有 helper 或明确诊断，失败 action 不删除其余成功 action。

动作分隔使用共同词法扫描器，保护 Regex alternation、逻辑 `||`、String/Raw String 内部 JQ 管道、变量、括号与 Script with 选项。数组批量参数仍属于一个 action，按数组顺序输出其目标操作。各文件依赖按原 action 索引绑定，Script 混合声明的分条在依赖发现、源审查和转换中使用同一入口。

不同目标可能跨 Header/Body/Script 分段执行，Surge/QX HTTP Script 仍有 first-match 行为。分条输出保留声明与动作，不据输出顺序宣称原 pipeline 的跨动作状态、条件快照或 first-match 行为完全等价；不串改原作者 Script 正文。源文件和原注释保留，QX 分段标题继续使用注释格式。

## 2.4 Regex、条件与捕获

<!-- Modified: 2026-10-26 (chance). User requests escaped literal host separators in all QX/Surge URL regexes. -->
QX/Surge 的目标 URL 正则统一将可识别 HTTP(S) authority 中的字面域名分隔点写成 `\.`，包括 Loon 新旧 Rewrite、URL-REGEX Rule、Script 的 URL matcher 及原生 QX 来源；已有 `\.` 不重复转义。不修改路径/查询中的点号、Header/Body 匹配正则、MITM hostname、普通分流域名、重定向目标或脚本资源 URL。保护现有反斜杠、字符类、分组与 `.*`/`.+` 等通配操作；不能确定为普通域名分隔符的结构保留原样，不对任意正则做全局点号替换。该收紧是用户明确授权的匹配范围变化：源未转义 `example.com` 原可匹配 `exampleXcom`，目标 `example\.com` 不再匹配它。源 AST/IR、原始源码及来源注释不改，生成目标字段幂等，不能声称此策略与未转义的源完全等价。

源 Regex literal 只去除最外层 delimiter；仅结束分隔符后的后缀识别为 flags。逐字符保留主体中的转义、斜线、字符类、分组、量词和 lookaround，不作 case folding、全局 `\\/ → /`、捕获组重写；源后缀 flags 保留在 AST/IR，目标原生输出按下述目标/字段策略映射 flags。

<!-- Modified: 2026-11-05 (chance). Restore Loon→QX source flags consistently with existing Surge outputs; preserve native QX input. -->

2026-10-26 用户提供 Quantumult X 作者回复，确认 URL、request/response-header 和 request/response-body 正则均支持 `(?i)`、`(?m)`、`(?s)` 及组合，版本间支持一致。2026-11-05 用户明确恢复 Loon→Quantumult X 重写规则的全部源 flags：URL、Header、Body、Script matcher 与 helper 外层预筛选均保留 i/m/s，组合按固定顺序 `(?ims)` 输出，Header 值嵌入使用 `(?ims:pattern)` 保留局部作用域。不再省略 i 或 URL flags，不输出过期省略警告；没有源 flags 时不新增。Surge 的正文默认 m 补偿仍只作用于 Surge。

源 AST/IR、作者脚本及 JavaScript helper 的 `RegExp(source, flags)` 保持原样。原生 Quantumult X 内容继续独立检查/复制，本次不重写其 flags、正则、动作或规则顺序，不套用 Loon flag 编译器。Header 字段边界、重复字段和复杂条件沿用既有 helper/诊断边界；域名字面点号沿用既有策略。

仅在来源暂停时，Actions 额外修正保留的 QX 产物：从 Resource/Loon 快照定位唯一对应的 URL/Header/Body/Script 正则字段，仅恢复 flags，保留脚本地址、注释、顺序和其它内容，不恢复上游获取。歧义字段保留并记入 `.github/monitor/.runtime/qx-flags.json`；重复运行幂等，通过既有事务、QX 格式及最终 ICU 校验后发布。

<!-- Modified: 2026-11-01 (chance). Restore Surge flags based on the supplied Miles / Surge Networks support email. -->
Surge 官方支持邮件确认：`[URL Rewrite]`、`[Map Local]`、`[Script]`、`[Header Rewrite]` 的 pattern，以及 `[Body Rewrite]` 的 URL 和正文正则均使用 Apple ICU，支持 `(?i)`、`(?m)`、`(?s)`、`(?x)` 及组合，iOS/Mac 共用核心。恢复所有 Surge 输出路径的源 flags，包括 Rewrite v2、Script v2、原生 QX 转换和保留的窄 URL prefilter；不得再以未确认支持为由删除。Loon literal 后缀仍仅解析来源已支持的 i/m/s，映射为固定顺序 `(?ims)`；原生来源中的内联 x 及其作用域原样保留，不凭目标支持扩充来源语法，JS helper 不接受虚构的 `/pattern/x`。ICU 校验继续作为发布门禁。

仅 Surge `[Body Rewrite]` 的正文 regex 默认开启 m，URL regex 没有该默认；所有字段默认关闭 s。Loon 源正文未启用 m 时显式输出 `(?-m)`（与 i/s 合并为 `(?i-m)`、`(?s-m)` 等），源有 m 则保留 m，避免 `^`/`$` 从整段边界扩大到每行边界；正文内的显式作用域仍可覆盖前置模式。该默认补偿只用于明确的 Loon Regex AST，不能把 Surge 原生正文默认强行改为关闭。无源 i/s/x 时不凭空开启；QX 不采用此 Surge 默认补偿。官方正文默认说明：https://manual.nssurge.com/http/body-rewrite.html 。恢复模式不代表 ICU 与 JavaScript 的 Unicode/换行/匹配替换语义已获全量等价认证。

仅在来源暂停时，Surge flags 修正覆盖保留的现有产物：Actions 从已保存的 Resource/Loon 快照恢复能唯一对应的 URL/Header/Body/Script 字段，不获取新插件、不取消暂停、不重新生成其它内容。保留脚本备份/API 地址，歧义字段保留并记入运行报告 `.github/monitor/.runtime/surge-flags.json`。变更通过原有事务与最终 ICU 校验后发布；重复运行幂等。

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
<!-- Modified: 2026-10-25 (chance). Keep the requested one-call deletion form only where it preserves established source semantics; batching is not a semantic exception. -->
<!-- Modified: 2026-10-28 (chance). Preserve sequential deletion while compacting independent object paths. -->
- delete：独立、互不为父子路径的纯对象键合并为 `del(.a,.data.ads)`；特殊键保留方括号字符串。含数字索引或父子重叠的多路径批次使用 `reduce PATHS[] as $p (.;delpaths([$p]))`，单个数字路径使用 `delpaths([PATH])`。按源顺序处理数组移位与重复索引，不按快照批量删除；作者自带 jq/jq_file 不改写。此规则取代一律单次 delpaths 的旧要求。

- replace：直接 `setpath(PATH; VALUE)`，不添加 getpath/has 或字段存在性检查。PATH 为保留 String/Number 类型的路径数组；批量替换按源顺序用 ` | ` 连接。遵循 jq 原生设置语义，包括缺失路径创建及类型错误。VALUE 保留源声明类型：字符串 `"[]"` 不等于数组 `[]`，不得统一字符串化。必要 JSON replace helper 同样执行路径设置，不检查末端字段是否存在。

add/replace 的 PATH 使用保留 String/Number 类型的路径数组，特殊键和数组索引不改变含义。生成的原生表达式不添加统一 type guard、`$__wayx_before` 或 try/catch 回滚，使用 jqlang 原生类型、错误和管道语义；作者自带 if/try/catch 保留。批量动作内部可形成有序原生操作，多个源 actions 仍按 2.3 分条。

单条固定作者 jq 或文件 jq 优先使用原 URL matcher 和 QX jsonjq-request/response-body、Surge http-request/response-jq；不因可编译为 JavaScript、嵌套路径、flags 或同阶段其它声明自动迁为 Script。原生 matcher 无法表示的纯 jq 声明保持既有 Review/注释边界。

动态路径/值、数组索引和复杂条件按各 action 的既有 native/必要 helper/Review 边界处理。固定对象路径的 JSON 批量动作原生优先，flags 不单独导致宽 matcher helper；两端恢复源 flags 后均不再输出过期的省略警告。

必要 JS runtime 支持的固定 JQ 子集可含 identity、固定对象赋值、del/delete-many、点分及 quoted bracket 路径，不支持任意完整 jq。一个 JQ action 成功才提交，失败回滚当前 action，先前 action 的提交不回滚，后续动作继续。原生 JQ 的错误行为不套用 JS helper 的事务语义。

## 2.7 文件依赖与上游 JQ 错误

<!-- Modified: 2026-10-25 (chance). Separate acquisition, source preparation, target planning and final publication; centralize run snapshots and resource limits. -->

资源获取由 `src/ingest/resources.ts` 统一负责；文本资源默认上限 128 MiB，二进制 mock 默认上限 512 MiB。上限按实际读取字节执行，调用者可显式传入更合适的单次上限；不得将资源下载上限当作目标客户端的正文处理能力。临时网络错误、超时、HTTP 408/425/429 和 5xx 才重试；永久 HTTP 错误与超限立即失败。

一次完整同步先准备所有插件的源文件、脚本、jq 和 mock 依赖，逐插件转换，补齐原生 QX 和保留产物的源脚本归档并重绑定后封存资源快照，最后统一校验及 Git 发布。原 URL 和请求 profile 决定缓存身份；成功资源存于运行目录，manifest 记录 URL、profile、SHA-256 和字节数，读取时校验。失败保留有限重试后的结果，不因后续插件重复引用而再次下载。相同 URL 以首次成功获取的字节为准；文本/二进制读取仍分别执行各自上限。快照仅用于当前运行，不跨运行复用旧资源。

解析阶段统一准备源 Rewrite 声明：新版 AST、旧版 Semantic IR 和解析诊断按源声明绑定，文件依赖与两个目标规划器共享准备结果；各规划器获得独立副本，原注释、正则 flags、动作顺序和路径类型不得改变。准备上下文绑定源 URL 与内容摘要，不得用于另一个源版本。转换阶段不得联网。

目标正则能力由 `TARGET_REGEX_CAPABILITIES` 按客户端与配置字段集中声明；`unverified` 不得因为 runner ICU 编译成功而提升为已验证，也不得据此删除 flags 或自动改变既有原生优先策略。最终验证集中检查转换器语法、变化的生成脚本及实际配置产物，不在各阶段重复完整生成。

输出阶段仅对同一规则区段中完全相同的活动路由声明去重，保留首次位置和所有源注释。策略或参数不同的规则不得合并；Rewrite、Body、Header 和 Script 等可能重复执行的动作不得按行去重。

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

Modified: 2026-11-01 (chance). 作者 Script 从原 URL 拉取并按原始字节归档；活动声明在发布前改为已校验的 WayX 备份地址，不 fork、不内联、不包装、不改正文。下载失败优先保留已校验旧备份；初次即失败时保留现有作者引用并明确列为未备份，不虚构地址或声称备份完整。

所有受支持触发类型保留 phase、requires_body、binary_body_mode、timeout、enable、debug、argument 和 trigger IR。body 与 binary 选项独立，不能互相推导。

QX 强制启用可表示的作者 Script：固定 false、默认关闭及动态 enable 均输出活动声明并说明用户策略；注释源行仍关闭。QX 不输出未证明的 enable/timeout/debug/argument Rewrite 字段；binary_body_mode 按既有说明省略。Cron task 只输出官方 sample 证明的字段。Surge 遵循源 enable，使用已支持 timeout/debug/body/binary 字段。

Modified: 2026-11-05 (chance). Surge 没有显式 timeout 时使用目标原生默认，不复制 Loon 的 10/20/300 秒默认。没有显式正文大小限制时不自动添加 max-size=-1；发布迁移移除历史强加的默认性能选项。显式合法静态/动态设置仍按目标支持处理，QX 不输出未支持参数。

目标不支持的合法作者 argument 直接省略，保留原 task、作者 URL 和受支持选项，并说明省略，不以参数无法编码丢弃整条 task。QX HTTP/非 HTTP 均省略 argument；Surge 支持的 String/PluginObject 参数按既有编码保留，合法但无法编码则省略。无效源结构/绑定仍诊断，不以目标省略掩盖错误。

Script v2 path/tag/img_url 必须是固定 String/Raw String，真实模板或变量无效；path 非空。往返输出保留原 token，转义/raw `${...}` 不改成会插值的字符串。PluginObject 是非空、唯一参数标识符列表，不允许内置变量、captures 或重复引用；有参数作用域时校验声明绑定，无作用域的直接 API 不猜测声明。

动态 enable/debug 要求 Boolean；timeout 要求 Number 或完整解析为有限正数的 String。未声明、错误类型/默认值、已声明但无默认值分别报告。QX 在省略前校验角色，enable 强制覆盖不被默认值关闭。Surge 未证明的缺省动态 transport 仍保持 Review 边界。

动态 Cron 引用须为已声明 String，基线默认值非空并有五或六字段。Surge 使用参数 placeholder，QX 采用已支持默认值并强制 enabled。字段数量检查不等同完整 Cron 或客户端调度验证，不扩展固定 Cron、参数等价传递和缺省回退检查。

## 2.11 Rule 与目标输出

Rule 使用独立 target-neutral IR，仅输出官方已确认的 type/policy/参数。除下面列出的用户策略外保留源 policy；Surge 的 PROXY 需要外部 Module 参数绑定，QX 保留字面 policy 名。不用 HTTP Rewrite Script 冒充 QX 网络层缺失的 Rule 类型。未知或不能安全表达的类型注释并诊断。

Loon build 1008+ 的 `DOMAIN-WILDCARD` 使用完整域名 Glob 匹配，支持 `*`（含零字符、跨点）、`?`（一个字符）、`[abc]`、`[0-9]` 和 `[!abc]`/`[^abc]`。Surge 使用官方 `DOMAIN-WILDCARD` 原样保留 pattern（包括逻辑子规则），沿用 policy 绑定及 matching 增强；不得降为 DOMAIN-SUFFIX 或 URL-REGEX。QX 按用户确认，将所有形式的 `DOMAIN-WILDCARD` 统一直接映射为 `host-wildcard`，完整保留 pattern，包括字符集合、范围及否定集合；不添加 pattern 形式判断、Review 拦截或 HTTP Script。类型命名与分段格式仍遵循上传的《示例配置(1).txt》。原注释、禁用状态、作者、更新时间与分类沿用共同输出逻辑。

依据：Loon https://nsloon.app/docs/Rule/domain_rule/；Surge https://manual.nssurge.com/rules/domain.html；QX 为用户上传官方示例。Script Hub Beta `b31b010d111aa81e8b89635f08d401c960d29538` 的 Loon/Surge DOMAIN-WILDCARD 保留逻辑仅作实现参考，不替代上述目标官方依据。

源 Rule 的 URL-REGEX（包括逻辑子规则）若包含 ICU 不接受的 `{数字, 空白数字}`，仅在字符类、转义和 `\Q...\E` 之外、上下界有效时移除逗号后的空格。源快照/AST 保留原文，目标修复须注明原因及源声明；不修改被转义的花括号、字符类或无效上下界，不据此作通用正则重写。此例外用于修复原本无法编译的量词语法。

用户指定的精确域名例外：所有转换产物中的 `DOMAIN,dns.weixin.qq.com` 和 `DOMAIN,dns.weixin.qq.com.cn` 使用 DIRECT（QX 为 `host, ..., direct`），在目标 planner 统一执行，不依赖插件 id。源 Loon 快照保留原文；不扩展到 DOMAIN-SUFFIX、DOMAIN-KEYWORD、逻辑子条件或其它子域名。Surge DIRECT 不携带仅适用于拒绝策略的 pre-matching；extended-matching 沿用既有目标规则。

Loon `[Rule]` 的 `URL-REGEX,<regex>,REJECT` 转为 Quantumult X 重写 `<regex> url reject`，不再默认使用 `reject-200`。仅当源 policy 明确为 `REJECT-200`（识别不区分大小写）时输出 `<regex> url reject-200`；不得根据 URL 文本、响应猜测或普通 REJECT 推断 HTTP 200。原有 `REJECT-IMG/DICT/ARRAY` 专用映射、`REJECT-DROP` 映射以及 Surge 输出不变；DIRECT/PROXY 等非拒绝策略不得强制改写为 reject。此规则只约束 Rule 中 URL-REGEX 的目标适配，不改变 `[Rewrite]` 里显式 action 的映射。 Rule 策略及 Rewrite v2 的动作/状态码均从各自基础映射表直接查找；Safe Tier 复用同一 Rewrite 原语查询，不再维护独立拒绝映射或追加特例分支。

基础映射表显式登记全部 29 个已知 Rule 类型（含插件范围外的 FINAL 边界）、15 个策略及 31 个 Rewrite v2 action。Rule 策略共用 `qxFilter/qxRewrite/surgePolicy/surgeMap` 四列，不再在调用方额外改写 REJECT-IMG 或拼装拒绝响应。`URL-REGEX` 的 REJECT-NO-DROP 与现有 REJECT-DROP 一样适配为 QX `reject`；这不宣称保留连接丢弃、重试或自动升级行为。QX 网络层无对应类型及超出插件范围的条目显式记为 null。Header/JSON/JQ 目标类型由共同 `REWRITE_MUTATION_MAPPINGS` 表登记，不因需要参数转换而记 null：request/response 的 header.add/set/del/replace 均映射到 QX request-header/response-header；json.add/delete/replace/jq/jq_file 均映射到 jsonjq-request-body/jsonjq-response-body。Surge Header 使用 http-request/http-response 与 header-add/header-del/header-replace-regex，set 依次执行 header-del 与 header-add；JSON/JQ 使用 http-request-jq/http-response-jq。文件 JQ 先解析并内联原表达式，JSON 路径转为 JQ，Header 字段操作转为目标参数。表中类型存在不跳过参数、重复字段、动态值、捕获和 matcher 的语义校验；复杂情形继续由现有 planner 选择 helper 或诊断。新增源 action 或目标能力必须同步补表并通过完整性及交叉矩阵测试。

Surge 逐条 Rule 使用已支持的 pre-matching/extended-matching 增强，保持类型与官方最低应用版本边界，不根据 Body Rewrite 的 CORE_VERSION 推断这些能力。QX 不输出 Surge 参数或 no-resolve 字段；目标不支持的属性按明确目标策略处理。

QX 原生 URL Rewrite `reject` 按上传官方 sample.conf 返回空体 404；短时间内重复请求越多，软件响应延迟由 0 秒增至最多约 5 秒。这是响应延迟，不是规则开始生效的时间或规则寿命；官方示例没有证明按源 App 独立计数。Rule 的 URL-REGEX → reject、legacy reject、v2 reject(404) 均保留原生目标动作，由 QX 自行计数和延迟，不添加计数器、定时器、脚本响应或改为 reject-200。显式 200/图片/对象/数组变体保留各自类型，不推断它们有相同延迟机制。filter 的 reject（含 DNS 行为）、URL rewrite 的 reject 与 Surge 自动 REJECT-DROP 升级机制分别处理；复杂条件或自定义响应本来需要 helper 时，不宣称 helper 复现原生 backoff。输出校验器与能力清单共用原生 reject 动作集合，Body/Header 的匹配与替换 action token 必须同阶段。

所有目标配置在生成和发布前必须独立校验外层 URL/Headers 匹配表达式，不能因 Script 内含完整条件而跳过。校验空值、未展开变量、括号/字符类/转义完整性及公共 Regex 语法；QX 同时校验分段与 action，Surge 同时校验各 HTTP 处理分段及 Script 参数。公共 Regex 语法检查不宣称 JavaScript 与客户端 ICU 引擎等价；保留 ICU 专用构造，并检查其传输与结构。全仓库审计收集已经序列化到配置中的实际表达式，调用运行环境 ICU 批量编译，任何失败或 ICU 不可用均阻止发布；不以脚本内部条件或库名注册代替输出验证。运行环境 ICU 的语法检查不等同于各客户端版本全部语义和生命周期的运行证明。

Surge Script 的 pattern 含逗号、空白或引号时统一使用公共参数编码器，保持 Regex 反斜线；validator 按引号解析逗号分隔参数，拒绝截断、残缺或重复参数。该规则覆盖源 Script、legacy/v2 Rewrite helper 和复杂动作 helper。

带 flags 的静态 URL 条件在两端 helper 外层预筛选中保留源 flags 前缀，避免外层漏掉内部条件本可匹配的请求。固定 String/Raw String URL 相等条件直接编译为转义字面量并首尾锚定的 Regex，复用 QX/Surge 原生动作与 Script 声明；动态 String 不作静态相等映射。没有可安全下推的 URL 条件时可以使用合法宽匹配，但 helper 必须执行完整条件，且不能据此绕过合成响应的精确条件要求。

QX 重定向统一使用官方原生 `<URL正则> url 302/307 <目标地址>`；存在可精确表达的请求条件时使用 `url-and-header`。URL 捕获 `${alias.N}` 转为 `$N`，保留源正则主体和规则顺序，flags 按 2.4 保留为内联模式。不得将原生 302/307 转成 redirect helper 或宽匹配 `^ url script-echo-response`；无法用原生语法完整表达的条件或模板保留源声明并诊断，不生成重定向脚本。

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

Modified: 2026-11-01 (chance). Plugin、作者 Script、JQ/mock 依赖均通过统一 Surge transport 读取原作者 URL，不用第三方镜像作为获取回退；瞬时网络错误仅有限重试同一 URL。下载源地址与产物脚本地址分开：后者使用经过字节校验的 WayX 备份。获取成功不证明真实客户端运行时 API、编码、压缩或缓冲等价。

发现入口将原始响应及来源 URL 交监控复用，缺失/空内容/来源不符失败，不重复获取另一份目录。报告记录新增、修改、删除的实际条目，已注册语法按目标规划直接转换，不以历史目录是否出现作为审批条件；未知语法或无法满足目标契约时保留源声明并提 Issue，不自动扩充 capability/golden baseline。

端到端黄金测试使用 `fixtures/end-to-end-sources/` 中的固定离线输入，作为开发时按需入口，不读取每天同步更新的 Resource 源文件。日常同步按实际 Catalog 全量转换一次并检查最终产物，不运行黄金测试或 canonical 重转。

## 2.14 全量转换、事务与发布

<!-- Modified: 2026-10-25 (chance). Consolidate validation after the full requested change set; do not use intermediate Action runs as development checkpoints. -->

开发修改先在本地完成当前请求范围内的全部实现、规范和必要测试，再按改动范围集中检查一次。不得每改一处就触发 Action、推送中间检查点或重跑完整生成；完整批次通过后一次性更新远端，使用由该最终更新触发的一次 Action 验证集成。最终检查发现问题时，集中修复已定位问题并复查受影响项目，再更新最终批次；不重复已通过且未受影响的检查。每日定时上游同步不受此开发约束改变。

每次 Action 获取全部 catalog entry，解析、物化依赖并转换一次，完成后统一检查实际产物一次；不在各阶段重复验证或全量重转比对。生成器/规范及同 URL 依赖变化在源声明不变时也能生效。

逐文件比较实际内容，只忽略转换器生成的 Converted 时间（含 dispatcher 嵌入时间）；相同不写入、不刷新原时间/mtime。QX、Surge、helper 分别比较，缺失补建；变化文件不导致其它相同文件被覆盖。源按真实 bytes 变化写入，废弃生成 helper 自动 prune，手写脚本保留。有效清单生成后清理所有退出名单的受管理源、QX/Surge 目标及生成脚本，并补清理历史遗留孤立产物；保护当前条目复用的路径及脚本目录。手写独立资源不属于退出拉取名单的受管理产物。目录读取或校验失败不能据此批量删除。

单插件的源/目标/helper 写入事务可回滚，失败不留下部分新旧产物；一个插件失败不阻止其它正常插件。未知语义或 target Review/Issue 在写盘前隔离，既有条目保留旧基线并重试，首次失败条目暂缓。rollback 失败、stale head 或任一全局门禁失败必须阻止发布。

sync 是产物与 README 的写入入口；canonical、README 对比及回归套件仅供开发时按需运行。报告区分全部成功转换、实际更新、内容相同、保留及暂缓，不把未覆盖称为未转换。

## 2.15 README 索引

根 README 保持标题、导航、BoxJs/Module/Adblock/Rule 顺序及 Name/Quantumult X/Surge 三列。Modified: 2026-11-03 (chance). 四个分类均在二级标题下使用默认收起的 GitHub `<details>/<summary>`（显示分类与实时条目数），保留二级标题锚点、原有分类顺序及各自表格；Adblock 来源分组在分类折叠内部继续使用独立嵌套 `<details>`。每个 `<summary>` 后与每个 `</details>` 前使用空行，确保 GitHub Markdown 标题及表格可正常渲染。Adblock 按实际拉取来源分组，不按插件内 `Author` 或 Converted by 署名分组。已登记资源使用 Catalog 的 source；未登记资源从 QX、Surge 的 Source 注释依次取得原地址。kelee.one 及其子域归“可莉”，rucu6.pages.dev 归“RuCu6”，GitHub/raw.githubusercontent.com 地址归仓库 owner；其它有效来源使用域名，缺失或无效来源归“本地资源”。资源署名与原作者 URL 保留在资源文件中。

<!-- Modified: 2026-10-25 (chance). Preserve source grouping and order; alphabetize names inside each source and group rule links by policy. -->

来源组按条目在 Catalog 中首次出现的顺序排列，分类和外层顺序保持。每个来源内部按展示名称 A–Z 分字母小节并排序；中文按拼音首字母，数字及其它字符单列，Module 同样按字母分组。Rule 目录按 Reject、Proxy、Direct 分组排序，仅调整链接展示，不改变资源内容或动作；混合策略文件列在 Proxy 并提示保留逐条策略。每个资源只出现一次。每组使用 GitHub 支持的 details/summary 默认折叠，summary 显示来源名称与资源数量，名称作 HTML 转义；summary 后及表格结束处保留空行，使三列表格正确显示。README 提示点击展开后使用页面查找定位资源，不添加脚本或无效搜索框。

按实际目标文件生成索引：新增加条目，删除删条目，单目标缺失显示 —，空来源组不保留；已退出拉取名单的自动管理产物必须实际删除，不继续展示过时条目。安装 URL 与每日 update-interval=86400 保持。相同 README 不写入，校验须核对来源分组、折叠结构、资源数量、组内顺序、链接与实际产物一致。

## 2.16 自动化与报告

唯一 GitHub workflow 为 .github/workflows/converter-check.yml，每日 UTC `30 21 * * *`（北京时间次日 05:30）及实现变更 push、手动/PR 执行。远端只允许 main，最多另有 test；checkout 后核对分支预算。Work 自动活动不因此恢复。

目录刷新 → 规则集生成/全量 sync → 一次最终产物检查 → 报告、Issue 与发布。日常 Action 不运行全仓语法预扫描、checkpoint 回归套件、canonical 重转、规则集重建回放、重复的目标格式/README/受管文件扫描。可写 main/test 执行监控并要求 complete=true；只读 PR 不写 Issue、mirror/state。目录刷新成功即可尝试监控。

Review inventory baseline 必须可读且结构有效，不能跳过比较。同步/监控报告只在 ENOENT 时允许为空；损坏 JSON、结构/版本/IO 错误使 Issue 步骤失败。同步报告支持版本 1/2，监控报告支持版本 1。每次新语义/同步/监控失败使用稳定 fingerprint 复用 Issue，保留源声明、阶段、错误与回滚结果。

监控告警恢复在现有 Issue 生命周期统一处理：仅完整、无失败且明确列出该来源成功的报告可关闭带受管监控标签的对应告警。缺失报告、未覆盖来源、失败或只读执行不得关闭告警。

所有自动化阶段通过 src/application/automation.ts 的共同检查入口执行，独立检查失败后继续收集同阶段其它检查。每项记录命令、退出码、完成状态及日志位置，实际差异保存文件、首个差异位置、预期/实际片段及摘要；语法、规范能力、Rule/Rewrite/Script/General/MITM、依赖、helpers/runtime、metadata/注释、目录/README/手写资源和发布门禁继续使用现有领域检查，不另写同类特例。成功项在控制台和 summary 只显示计数，完整日志随 artifact 保存，人工仅查看异常。机器报告缺失、不完整或失败不得由绿色 step 状态替代。

验证异常按阶段使用稳定 fingerprint 复用受管 Issue，附本次 Action 链接、失败检查与证据位置；完整成功的同阶段检查才可关闭该类告警。只读执行不得写 Issue。未知源语法继续附源声明，不能猜测为有效规则。

对账报告复用本轮转换记录和唯一最终检查的文件摘要，不要求 canonical 重转证据，不重新执行转换。verified 仅表示本轮生成且实际产物通过格式检查，不宣称客户端语义已验证。已隔离并完整保留旧基线的同步失败单独标为 retained，继续通过原有同步 Issue 跟踪。Markdown 对账仅列异常，完整结构化明细留在 artifact。

发布只允许通过全部 required gates 的产物，提交前核对请求 head 未推进，提交后确认受管工作区无未保存变化。日志、发现结果、监控缓存、失败报告和生成产物随已有 artifact 保存。

<!-- Modified: 2026-10-30 (chance). All production orchestration uses the TypeScript CLI. -->
流程控制由 `src/cli.ts` 和 `src/application/automation.ts` 承担：分支预算、转换任务与唯一最终检查、Issue 写入或只读选择、发布门禁、受管 Git 提交与 run summary。YAML 保留事件和阶段条件；Bash 仅调用程序并转存日志。发布前核对 expected head，限制 main/test 与受管范围。Node 原生执行可擦除 TypeScript，`tsc --noEmit` 独立检查；依赖通过锁文件和 npm ci 安装，CI 保持 Node 26 安全版本下限。Python 与旧 MJS 入口全部移除。

## 2.17 验证要求

日常 Action 在同一最终阶段检查转换器语法、本次变化的生成脚本、实际产物格式及外层正则，复用其证据生成报告；源获取失败、未知源声明、事务回滚、远端 head 和发布范围检查属于实际执行边界。开发者回归套件、oracle、canonical 和独立比较工具保留为按需入口，不自动在同步前后运行。不得为单个来源增加重复回归检查或全量重放。

Oracle 使用独立源 reference evaluator、目标 lowering 模型及实际生成脚本/原生 jq 对照。覆盖命中/no-op、URL/method/headers/body/status、captures、动作顺序、阶段所有权、单次 `$done`、missing/null/false/空值、Unicode/转义/原型键、依赖失败隔离与事务回滚。条件证据分别统计 false-positive / false-negative evidence；finite fixture 不能单独证明 native-equivalent，仍须结构及官方能力依据。

用户降级策略的目标预期与源全行为 oracle 分开，不据 flags 恢复或 JQ 分条宣称源行为完全等价。Golden 在独立语义检查通过后仅用于发现输出漂移，不用更新 Golden 掩盖错误。真实 jq 编译和结果/错误传播同时验证。

验收包括上游预检/目录/转换一致选层、真实同正则独立规则保留、分条 JSON/JQ、错误 JQ 诊断作用域、README 来源分组/折叠及增减、完整 Action 和逐文件内容比较。零 Review/Issue 不等于全 Loon 语法或真实客户端行为已证明。

## 2.18 实现组织与契约对应

<!-- Modified: 2026-10-30 (chance). Establish one typed layered production tree. -->
生产源码只位于 src/，通过 src/cli.ts 调度；测试位于 tests/，静态输入、规范、上游快照和注册表继续位于 .github/。客户端作者脚本与生成 Script/*.js 仍为客户端可执行 JavaScript，不作为仓库自动化入口。

| 层 | 职责 |
| --- | --- |
| src/domain | 源语义契约、Regex/条件、规则聚合与路由归属；不访问网络或文件 |
| src/ingest | 来源发现、统一 Surge UA、字节限额、快照、冻结、加密分类和归档 |
| src/parser | 插件、声明、Rule/Rewrite/Script AST 与 Semantic IR、现有语义规划 |
| src/emit | QX/Surge 转换与 helper/dispatcher 输出 |
| src/validation | 目标格式、真实 ICU 外层正则、实际产物和规范检查 |
| src/publish | 源/目标/helper 生命周期、事务、README 和对账报告 |
| src/application | 任务编排、监控、错误隔离、Issue、门禁及受管 Git 发布 |
| src/index.ts | 稳定的公开转换 API，仅 re-export |

同类问题在所属语义领域公共入口修复，不按插件名追加特殊分支。语法解析与规划保留既有共享领域接口；资源获取和发布必须通过统一服务，转换阶段复用已封存快照。原作者 JS 按字节保存在固定备份路径；AST 分析和 去广告 API 转换只生成单独的 Script/Adblock 通用产物，原始归档不改。

统一命令为 node src/cli.ts；开发者回归为 npm test，类型检查为 npm run typecheck。常规同步只生成一次并检查本轮实际产物，不自动调用 canonical 重新转换；PR 回归套件独立于日常计划同步。

| 契约 | 实现入口 | 验证 |
| --- | --- | --- |
| Script/JSON/JQ 全动作分条 | splitScriptPipelineSources、selectRewritePipelineLayer、rewriteV2Action | conversion-policy、upstream-automation、catalog |
| 原 action 索引与依赖隔离 | input materializers、resolveRewriteJqDependencies | conversion-context、runtime/file isolation |
| 复杂脚本及阶段 owner | planRewriteFeatureHelper、prepareRewriteDispatchers | runtime/oracle、phase/author ownership |
| 作者选项与参数 | Script planners、共同绑定校验 | script、conversion-policy |
| README 来源折叠组及动态索引 | buildReadmePlan、sync transaction | readme-index、managed cleanliness |
| 原地址、全量转换与不覆盖 | resources transport/snapshot、sync-convert、workflow lifecycle | source-fetch、事务/发布测试、完整 Action |

能力扩展须有源/目标官方依据及相应语义证据，开发时按改动范围验证；日常 Action 不重跑开发回归。不能仅为减少诊断而扩大未证明的转换范围。

## 2.19 Python 规则集聚合

<!-- Modified: 2026-10-25 (chance). Add measured independent-service selectors rather than widening regex/domain boundaries or automatically expanding all upstream children. -->

覆盖补充按当前发布数据比较父分类与独立子服务，只有存在额外原生声明且属于既有业务范围才显式登记；不自动递归拉取全部子分类，不把细分声明增加等同于所有域名此前未覆盖。Google 补 Play/FCM/Trust Services/Scholar，Disney 补 ESPN/Hulu/Star+；Microsoft 对 Azure/Bing/PKI/OneDrive 分别使用 `@cn` 和 `@!cn`，不凭新增子服务改写直连/代理默认。media_cn 适度加入国内协作、文档、网盘；media 加海外网盘和密码管理。独立服务无额外声明的分类不为数量增加重复 selectors。广告拦截、通用 cn/proxy 和独立 filterfix 不随此覆盖补充扩大。

<!-- Modified: 2026-10-25 (chance). Explicitly select the independent apple-update service; the optimized aggregate apple release may omit its more-specific entries. -->

Apple 的直连 tags 显式同时选择 `apple` 与 `apple-update`；不能依赖综合 `apple` 发布数据保留所有更新服务的细分域名。保留上游 `apple-update` 的原生匹配类型，由既有 split 默认直连逻辑处理，不手写生成文件、不把其它源逐条明确的 PROXY 声明改成 DIRECT。QX 的 Apple 资源必须保留逐条策略并放在通用 cn/proxy fallback 之前；`force-policy` 会覆盖逐条策略，资源选择器无法修复设备端的强制策略、DNS 或 HTTPS 解密设置。仓库覆盖检查不等于设备端已恢复更新。

Geosite 分类选择器统一支持 `分类@属性` 与 `分类@!属性`，按发布数据中的属性拆分，不在转换器中按应用名称编写分支。Steam 使用 `steam@cn` 直连、其余 Steam 规则代理；补充国内源并入同一分类。QX 保留单文件逐条策略，Surge 拆分 direct/proxy。

<!-- Modified: 2026-10-25 (chance). Treat MetaCubeX and V2Fly as joint primary inputs; preserve source actions and independent acquisition evidence. -->

V2Fly 与 MetaCubeX（Mihomo 侧）是共同主要来源，独立获取与校验，不设主次、不在其中一方成功时跳过另一方；按原生匹配条件与动作合并，重复声明同时保留双方作者与 URL。MetaCubeX 登记与现有 media/media_cn collections 对应的全部国内外应用分类 JSON，并扩充独立服务：Apple Update 直连、Apple Intelligence 归 AI、无逐条策略的 TV+ 默认直连；Google 的 Play/FCM/Trust Services/Scholar、Disney 的 ESPN/Hulu/Star+；Microsoft 的 `microsoft@cn`、`azure@cn`、`bing@cn` 直连，以及当前没有 cn 属性分组的 PKI/OneDrive 代理；国内协作/文档/网盘直连，海外网盘/密码管理代理。两者共同驱动现有 QX/Surge 聚合器，不是新增 Mihomo 输出。MetaCubeX 当前没有发布 `@!cn` 文件，不能用完整 Microsoft/Azure/Bing 文件代替补集代理，否则会把其中的直连声明重复登记为代理。media 类 JSON 本身不携带动作，使用既有 `Media` 默认占位，归属后沿用已声明的应用动作，不能给整个公司分类强加 PROXY 而重造国内接入点冲突。双方同条声明去重并合并来源证据，新增来源不保证等量增加规则。

规则集聚合领域统一由 `src/domain/aggregate.ts` 和 `src/application/rules.ts` 管理，来源、分类、品牌默认策略和子服务归属集中于 `.github/sources/rules.json`。只排除直接 blackmatrix7 来源，接受其它维护者引用它的情况。采用 V2Fly 官方发布及 SHA-256 校验；SagerNet geosite 与其共用相同上游，不重复下载相同数据。MetaCubeX 持续生成的具体分类、其维护的补充及 Nexitally 的直连/代理/AI/加密货币/推送列表按来源策略合并。来源作者、URL、许可证及内容摘要保留。注册表 rule_exclusions 可按分类、原生类型和操作数表达式统一排除规则，作用于所有输入和两端输出，不能直接编辑生成文件；排除通配符不影响对应 CIDR 或其它规则类型。

<!-- Modified: 2026-10-27 (chance). Render proxy actions as ssid in QX routing lists. -->
QX 原生 filter 文件仅输出 direct/reject/ssid：未受全代理约束的显式 DIRECT 保留 direct、REJECT 家族统一 reject，其余品牌名、Media、未指定策略等在应用配置默认值后统一 ssid。先归一化动作，再合并同动作规则去重；混合文件保留显式直连/拒绝例外，不使用 force-policy 覆盖。原生格式门禁同时检查三种标准策略。Surge 外部 RULE-SET 行不携带策略，混合策略分类按 surge_output 决定拆分或合并；两端合集统一过滤进程名、进程路径、用户/UID 等桌面身份条件，复合条件包含这类谓词时整条过滤，不能删除条件后扩大匹配。过滤项单独统计且不提转换错误 Issue。域名正则的锚定字面量、有限分支、字符集合和有界重复精确展开为原生 DOMAIN/DOMAIN-SUFFIX；点号、点星、点加精确映射为原生域名通配符。不支持的正则/原生类型/选项按用户要求忽略，仅在 Action 报告统计且不提 Issue；不能放宽匹配或改成脚本；可转换正则独立保留，不因其它规则覆盖而省略。sing-box JSON 支持官方版本 1–5，只解析已支持字段；含无对应原生谓词的条件整体忽略，不能去掉部分 AND 条件后扩大匹配；源模式损坏仍阻止发布。

多作者规则先按用途分类，再做格式适配、整合和完全相同项去重。已有独立合集的应用归入对应应用；其它国内应用及其服务归入 media_cn，其它国外应用归入 media；没有应用归属证据的通用 DIRECT 归 cn、通用代理归 proxy。应用证据来自官方 Geosite 的应用/服务标签和明确标注用途的补充源；classification.domestic_tags/overseas_tags 只提供归属证据，不生成额外规则或指定策略。广告、独立 filterfix 及明确排除项维持原边界。按精确声明或上游明确列出的域名后缀关联分类，不能靠 .cn 后缀、IP 所在地或企业名称猜测应用。更具体的关联优先，AI、YouTube、GitHub 等子服务按 classification.priority 处理；其它无法确定的共享规则保留来源分类并报告歧义。

先归类，再执行 routing_policies 中明确登记的全代理约束：Google、YouTube、Facebook/Meta、X、Telegram、GitHub、海外 AI、Netflix、Disney 合集只输出代理访问规则。属于这些应用的源 DIRECT 声明（逐条显式动作及来源注册的 DIRECT 默认值）合并到 cn，保留 DIRECT，不改写为 PROXY；在应用默认动作推断前分流，保留匹配条件与来源署名。其它非拒绝声明使用 PROXY，按最终合集、动作和完整匹配条件精确去重；REJECT 和独立 filterfix 保持原行为。全代理分类禁止 direct/proxy 选择器、DIRECT 默认值和 Surge split 布局，避免配置退回旧行为。其它分类保留来源逐条明确写出的 DIRECT/PROXY/REJECT。无逐条策略的输入在分类后使用 default_policies：media_cn 默认 DIRECT，其它合集沿用来源注册策略；解析时须记录策略是否明确写在源规则中，不能把源文件默认值误认为逐条例外。不根据 @cn 属性或服务器位置自行推断 DIRECT。Geosite 的直连/代理划分仅使用显式配置的 tags/proxy_tags。去重键包含目标规则类型、操作数、策略及可表达参数；相同域名的不同类型、不同策略、不同参数均保留。不得做后缀覆盖压缩、跨策略删除、父子应用裁剪或 adblock_extra 增量覆盖过滤；可转换正则也须保留。来自不同合集的同一规则可在明确归属后汇总到同一目标，只有完全重复项才能合并。除下述 Apple 直连文件合并的等价降级外，Surge 不合成 AND/NOT；不因直连冲突删除代理规则。此前明确指定的 rule_exclusions、exclude_tags 和目标不支持条件的整条过滤继续生效；被 AI 范围排除的国内应用可按其国内应用证据归入 media_cn。

两端文件布局独立：Quantumult X 每个合集始终单文件，逐条保留 native direct/ssid/reject，不能因 Surge 拆分而生成 QX 的 _direct/_proxy 文件。Surge 的 surge_output 显式规定 split/combined：Apple 根据 routing_layers 输出 apple_cn.list/apple_proxy.list；Microsoft、Steam 拆为 _direct.list/_proxy.list；Google、YouTube、Facebook/Meta、X、Telegram、GitHub、海外 AI、Netflix、Disney 输出单一 .list，主配置以代理策略引用，不生成 _direct/_proxy 两份；Spotify 的 DIRECT/PROXY 匹配项合并为 spotify.list，不带策略，由主配置统一选择一个策略，不宣称它能保留逐条分流差异。没有上游直连证据时不补造 Spotify DIRECT。其它合集存在不同策略时自动拆分；REJECT 家族独立输出，不能混入以代理引用的文件。Surge 外部 RULE-SET 均不带逐条策略。filterfix 的独立混合策略 dconf 规则继续生效。

生成文件集中在 Rule/QuantumultX 与 Rule/Surge；英文头包括 Name、Updated、Source Authors、Category 以及来源。Category 固定为广告 Adblock、应用/AI/media 为 app、cn/proxy 为 general。只在实际输出或元信息变化时更新时间；只清理状态文件记录且仍有受管标记的旧产物，保护手写文件。下载、校验或事务失败保留旧产物；无法表示的声明保存在 rules-result.json.filtered；格式损坏等异常按来源/错误类型复用 Issue，已支持规则继续发布，不能将隔离项宣称已转换。完整成功且不再出现该类声明时关闭对应告警。

补充来源默认合并现有分类。注册表 `standalone: true` 的来源独立输出，不参与应用归属、cn/proxy 合并或跨来源去重；保留原注释、声明顺序与逐条策略。filterFix 使用独立分类 filterfix：QX 输出 Rule/QuantumultX/filterfix.list；Surge 输出 Rule/Surge/filterfix.dconf，在同一个 [Rule] 配置片段保留 DIRECT/PROXY，不生成 filterfix_direct/filterfix_proxy 或把该来源并入 cn。Surge 使用主配置 [Rule] 内的 #!include 引用片段，PROXY 须为主配置已定义的代理或策略组。外部 RULE-SET 与模块均不能用于保存该混合策略语义。依据：https://manual.nssurge.com/profile/format.html、https://manual.nssurge.com/rules/ruleset.html、https://manual.nssurge.com/profile/module.html。

完整转换/合并/去重由 Action 的 rules 阶段执行一次，最终产物格式检查不重新构建规则集。状态文件记录的旧受管产物自动清理，手写文件保留。详细源快照与异常随现有 artifact 保存，summary 仅列计数和异常。

<!-- Modified: 2026-10-27 (chance). Adopt source-backed Apple CN/proxy layers and proxy TestFlight. -->
Apple 用应用注册的 routing_layers 分层：第一层合并 QuixoticHeart apple-cn、V2Fly apple-update、MetaCubeX apple-update，策略 DIRECT；第二层为 QuixoticHeart apple-proxy 与 Tartarus TestFlight，策略 PROXY；未声明策略且未归入层的 Apple 默认 DIRECT。相同原生匹配声明在两个无策略来源重复时采用前层动作；逐条明确策略继续保留，不做域名扩大或父域覆盖压缩。QuixoticHeart 保留作者、原链接、GPL-3.0 来源信息，不把其 QX 文件名策略误认为内建动作。系统更新域名先于宽泛 cdn-apple.com 代理规则，TestFlight 先于 apple.com 默认直连。QX 保持单一 apple.list，层内沿用原生类型和具体度排序，代理渲染为 ssid；Surge 按 apple_cn.list (DIRECT) → apple_proxy.list (代理策略组) 引用，三份均置于通用 cn/proxy/IP fallback 前。层信息只参与登记应用，不更改其它应用规则的默认或顺序。主配置须已有 ssid 策略组。

参考 V2Fly 的归属与属性分离、DustinWin 的 apple-cn/microsoft-cn、Sukka 的服务/CDN 分层以及 ACL4SSR 的专项例外顺序：Apple、Microsoft 通过显式 @cn 选择器声明国内接入点的 DIRECT，互补选择器及专项服务声明 PROXY；不把品牌全部默认为 DIRECT。没有逐条策略的通用来源被归入某应用时，如果同一原生匹配条件在应用专属来源中具有唯一的已配置动作，沿用该动作，保留通用来源的匹配声明和署名；不能让通用列表默认 PROXY 重造应用已明确直连端点的冲突。全代理约束以外，应用专属来源之间的冲突及源规则逐条明确写出的策略仍保留，不按多数表决、不扩大匹配、不删除不同类型/参数规则。共享 CDN 或云厂商域名不能单凭托管关系推断应用，明确的应用专用主机优先于云厂商父域名。

参考来源：https://github.com/v2fly/domain-list-community 、https://github.com/DustinWin/ruleset_geodata 、https://github.com/SukkaW/Surge 、https://github.com/ACL4SSR/ACL4SSR/blob/master/Clash/config/ACL4SSR_Online_Full.ini 。

<!-- Modified: 2026-10-25 (chance). Import native QX app resources separately from Loon conversion and merge routing/rewrites without rewriting upstream expressions. -->

## 2.20 原生 QX 来源同步

Modified: 2026-11-01 (chance). Actions 内原生 QX 走格式校验与复制路径：仅补充必要的注释分段、将客户端不支持的元数据转为注释、为裸 jq 补引用。保留原注释、执行声明顺序、URL 正则、动作、hostname 文本及脚本正文；脚本操作数统一由发布前备份步骤重绑定；不再按目标端逻辑重写 QX、不重组分段、不合并 hostname、不补写原生 QX 图标。此前明确授权的 Emby 指定错误修正继续生效。 Modified: 2026-11-02 (chance). 用户新增授权：echo-response/analyze-echo-response 后的 HTTP(S) JS 脚本操作数修正为对应 script echo，保留 analyze 的请求体等待；不将 JSON/数据或本地资源误判为脚本。

同作者同应用的 filter/rewrite 文件按来源顺序连接为一份混合 snippet；不混用不同作者。Surge 输出统一调用 convertNativeQxToSurge；作者 JS 通过统一快照下载并按原字节归档，不改写。元数据图标补全只作用于 Surge 或非原生 QX 转换产物。既有来源版本选择、分类、所有权、整批事务与失败保留机制继续生效。新内容及生成产物只由 Actions 拉取、生成和发布，本地只提交代码及孤立测试。

## 2.18 原生 QX Script 字节保留与备份引用（2026-11-01）

Modified: 2026-11-01 (chance). 转换范围为去广告插件的 HTTP 脚本，不处理修改客户端配置的 API。每源 URL 共用一个源名脚本，保留授权目标及来源原生分支，详细约束见 2.23。原 JS 始终按字节备份；API 规划独立于配置转换，不得以声明可转换推断脚本 API 全量兼容。

## 2.19 可莉来源暂停与恢复（2026-11-08）

Modified: 2026-11-08 (chance). 用户已明确恢复可莉拉取：`sources/kelee-pause.json` 的 paused=false，恢复目录发现、插件正文获取、依赖更新、转换及目录监控。可选暂停机制保留，来源归档和加密来源的保留策略继续生效。

## 2.20 字节获取、加密插件与来源声明

<!-- Modified: 2026-10-30 (chance). Preserve raw encrypted input without inventing decryption or source authentication. -->
所有源和依赖通过 src/ingest/resources.ts 获取。默认 UA 由 config/fetch.json 定义，WAYX_FETCH_UA 可统一覆盖；不按来源切换 Stash/Loon UA。当前固定值来自用户 HAR 实测 Surge 请求，不把应用商店版本号拼装成 UA，也不宣称已证明是最新构建。

.lpxe 按加密 Loon 包处理；未知非 UTF-8 或包含 NUL 的二进制按 opaque 处理。先保存原始字节、原 URL、SHA-256、大小和类型，再记录活动状态。原始归档位于 Resource/Encrypted/Loon/<id>/<sha>，不得把下载成功标为已转换，不尝试猜测加密头、解密或解析密文。普通无效文本和 HTML 按源校验失败隔离，不能伪装成正常加密包。

活动 opaque 条目通过归档摘要验证后可保留旧转换产物；首次遇到的包允许仅归档，报告明确标为不可转换，不发布虚构片段。已冻结的可莉条目不重新获取插件正文或转换依赖；仅执行 2.19 明确授权的脚本备份与引用替换。恢复明文后退出 opaque 状态，历史字节归档保留；现有未知语法和失败事务规则继续适用。

作者 #!source 原样作为注释保留；它是 Loon 插件下载 URL 的 SHA-256 绑定元数据，不是内容签名，不能证明内容完整性或授予解密能力。转换为 QX/Surge 不执行 Loon 的来源告警逻辑，也不为输出地址重算作者值。归档使用独立内容 SHA-256，不混用两种摘要。

## 2.21 应用图标声明补全

<!-- Modified: 2026-10-30 (chance). Add source-backed app icons only where metadata is missing. -->
`.github/sources/icons.json` 登记 lige47、fmz200、Qure Color 原始图标集，按登记顺序优先；同集优先无编号版本，其余保持原顺序。只做名称规范化、明确应用别名及有限功能后缀匹配，不用任意子串匹配、不用通用图标填补未知应用。作者已有非空图标声明及图片地址优先保留，不重写或替换。

补全只在 QX/Surge 目标声明头使用现有 `# Icon: URL` 注释约定，并保留图标集来源；不添加未获目标官方证明的活动图标指令，不据此宣称客户端必定显示模块图标。图片引用原作者地址，不镜像图片。Loon 原件、规则和动作、时间戳以及 `#!source` 不改；活动脚本资源链接在统一备份步骤按 2.22 重绑定，来源注释中的原地址保留。

图标集通过统一获取器和运行快照拉取一次，监控复用本轮输入并保存原始集合内容。正常转换在目标比较前补全，metadata-only icons 命令仅补全登记的受管目标；重复执行保持稳定，未匹配列表保留在报告中。暂停开关为 true 时阻止源和依赖获取；2026-11-08 用户已明确恢复，可莉当前使用正常获取流程。

## 2.22 插件正文与源脚本持久备份

Modified: 2026-11-01 (chance). 每次同步使用同一运行快照的原始响应字节归档 Loon 与原生 QX 插件正文，并获取其活动脚本声明及现有 Adblock/Module 产物直接引用的 HTTP(S) 脚本；包括任务脚本和已登记的暂停来源。未参与本次拉取的保留源快照须标记来源状态，不冒充最新上游响应。未引用的任意历史脚本与脚本内部动态网络依赖不靠猜测枚举。

归档位于 `Resource/Backup/plugin/<URL SHA-256>/<文件名>` 和 `Resource/Backup/script/<URL SHA-256>/<文件名>`。查询参数属于资源身份；fragment 不发到服务器，不参与字节获取身份，但在目标脚本地址中原样保留。原始文件逐字节保留 BOM、CRLF、注释和署名，不追加备份头。整理时间、作者 chance、分类及出处写在规范/索引/状态文件，不能污染作者脚本。`index.json` 记录原 URL、获取 URL、正文 SHA-256、大小与路径；备份地址固定；检测到内容变化时原位替换原文并更新摘要，旧版本保留在 Git 历史中。

生成完成后只替换活动声明的脚本操作数，QX 仍使用官方支持的 `script-request/response-header/body`、两种 echo 和任务格式；Surge 仍使用 `script-path`。不全局替换 URL，不改注释、匹配正则、跳转目标、图标、argument 或 JS 正文。备份、索引、脚本引用及产物同一 Git 提交发布。原生 QX、Loon 转换及已有 Module 统一执行。

每次均重新获取同 URL 的脚本，不因插件正文未变化跳过。下载失败时使用索引中已校验的旧备份并列明失败；无旧备份则保留既有作者地址，`status.json` 明确记录缺失项与 unresolvedReferences，不能声称全量备份完成。空内容、HTML 错误页、超出 Git 单文件限制的响应不伪装为脚本。校验失败、事务失败或缺失 WayX 引用阻止发布。原文归档不套用生成代码的换行/BOM/Node 语法要求，独立校验所有归档字节和引用闭包。

Modified: 2026-11-01 (chance). 原生 QX 上游整条 URL rewrite 使用大写 `REJECT` 时，按上传 sample 的小写 `reject` 规范化该动作 token，并保留完整原声明注释；不调整 matcher、Header、参数或脚本正文，不推广到未知动作。

Modified: 2026-11-01 (chance). 奶思大合集中实测含非 QX 的 DOMAIN 类型声明；原生片段格式修正只将已知 DOMAIN/DOMAIN-SUFFIX/DOMAIN-KEYWORD/DOMAIN-WILDCARD 类型分别改为 host/host-suffix/host-keyword/host-wildcard，并规范已支持 IP-CIDR/IP6-CIDR/USER-AGENT 类型的大小写。保留参数、策略、顺序和原声明注释，不猜测未知类型。

## 2.23 ScriptHub 派生的通用 Script API 兼容层

Modified: 2026-11-02 (chance). 用户要求 API 之间长期可维护的通用转换，取代历史逐源码/逐数据流放行策略。生产只开放 Loon→QX、Loon→Surge、QX→Surge；只处理 HTTP 去广告脚本。每 URL 一个同源命名的共用 JS，原业务正文一次，函数、类、this、动态对象和包装调用保持普通 JavaScript。不得新增脚本名白名单、具体实参证明器或以本地仓库脚本通过作为 API 转换依据。构建阶段仅检查经典 JS 语法、授权方向和 HTTP 触发声明；API 引用清单是描述性元数据；target.capability 区分 runtime/native-only/unavailable/unclassified，缺失 provider 不因未执行的功能检测分支静态阻断整份程序，也不冒充支持。

复用 Script-Hub-Org/Script-Hub b943361f11be5795b3eb10f9cc4e5497642922fc 的 script-converter.js 运行时方案及 Header Proxy；固定来源、GPL 许可和修改说明放 vendor/script-hub。集中修复 delete/has/Symbol/原型方法、七 HTTP 方法、拒绝与缺失响应、字节/状态、来源默认值与单位、显式删除存储键。不得提供 timer 空函数、正则全文替换 $done、网络失败 resolve(null) 或捕错后假放行。宿主字段/默认值由 domain/script-api.ts 统一维护。

## 2.24 API 兼容政策和边界

Modified: 2026-11-02 (chance). 接受 ScriptHub 的 Header 小写、大小写无关兼容政策；它不保持键大小写与重复大小写字段，不得继续以这些源码写法静态阻断全部转换。Header 操作在独立字典上进行，完整 Header 数组和 Proxy descriptor 不变量限制明确报告。HTTP 在运行时派发动态方法/参数，保留 Promise/callback、并发和错误；QX 未说明参数省略，原实参构造、副作用和异常保留，不伪造 QX 超时/取消。存储动态 String 键值使用目标原生 API，删除使用 remove 或 null，不试写空字符串；缺失值、空值及详细错误仍可能保持目标原生差异。原生 QX fetch 的已解码文本保持，外端字节按显式 charset 使用真实 TextDecoder 解码，不可用时以 UNSUPPORTED_RESPONSE_CHARSET 拒绝。Loon body-base64 解码为目标真实二进制 body，HTTP node 映射目标 policy，不写配置。动态完成结果校验成功后才锁定提交，校验失败可由作者捕获后重试；按状态/字节/response 布局适配；QX 不支持参数省略，其它不可用字段报错。QX echo 与 response-body Header 规则需要正确声明，不能从具体业务正文推断改写触发语义。

来源 API presence 通过兼容 facade 提供。Loon 外端 presence 使用明确兼容标识，不假装真实版本或设备；不可恢复的源元数据、任意全局反射/Function 构造代码和原生引擎能力列为边界。实际 timers 保留。Loon gzip/ungzip 由原生优先、固定 Pako 2.1.0 同步 provider 提供；仅接受准确 Uint8Array 视图，gzip-only 完整流校验，CRC/Trailer 使用上游实现，错误不转成功。包含上游 MIT/Zlib 许可；按声明来源整体提供并延迟初始化，不按作者代码形状选 provider。DNS、GeoIP、ASN 等网络查询工具由用户明确排除，不参与去广告 API 映射、操作清单、未实现能力及剩余优先级；不添加 provider 或原生兼容绑定，原作者正文不删除。AES 已复用固定 noble-ciphers 2.4.0，同步映射四模式、padding、AAD 和独立 GCM tag；原生 Loon 优先。URL/URLSearchParams 以完整原生类对优先、固定 whatwg-url 14.2.0 延迟 fallback。TextDecoder 原生标签优先，其它标准旧编码由固定 Exodus bytes 1.16.0 提供。依赖、许可、摘要与构建保存在 vendor/script-api-providers；不扫描作者调用选择能力，不运行时下载库。未提供的 WASM/文件/配置能力不模拟成功。API 兼容组合成功不代表任意作者程序严格等价或实机认证。

## 2.25 备份、清单与验证

Modified: 2026-11-02 (chance). 原插件/脚本继续逐字节备份，源名与固定共用 URL 保持；仅 Actions 同事务拉取、更新原件、共用脚本、引用和外部 API 清单。Resource/Backup/script-api/<URL SHA>.json 绑定原件及清单摘要，记录原源码 UTF-16 API 位置与运行时适配，不记录逐业务值的伪证明。API 能力与维护边界维护在 docs/script-api/03-API能力与实施路线.md；AES/URL/旧编码公共 provider 已启用；原生无对应接口的行为仍明确列边界，不能以部分键清理模拟全量清空存储、以定时器模拟完成后的原生通知、或转发未说明的 Surge ALPN。Loon remove 映射真实 QX removeAllValues；Surge 忽略全量清空和通知点击行为，保留通知内容与支持的媒体字段。runtimePolicyVersion=4、validationMode=api-runtime-compatibility 必须明确出现在报告；保留旧版本的完整性迁移校验，不用旧 static policy 生成新文件。

测试由 API 契约、标准向量、模拟原生网络及合成备份事务组成；覆盖动态输入、Env 接收者、Header 操作、七方法/失败/并发、字节、存储和通知，并以独立 zlib 向量验证压缩和损坏输入；原生 QX clear-all 保留，Surge 无清空存储 API 时不以已见键集合模拟。不得用源脚本的具体语法分支堆叠测试放行清单。Rule/Rewrite/Module 的已有转换职责不受影响。

原生 QX echo-response/analyze-echo-response 的远程 HTTP(S) js/mjs/cjs 或已验证 WayX 共用脚本链接，仍修复为对应 script echo，保留 analyze/body、query/fragment 与来源依据；远程 JSON/数据和本地资源不误判为脚本。来源暂停和原备份获取授权不变。

依据： https://github.com/crossutility/Quantumult-X 、 https://manual.nssurge.com/scripting/ 、 https://nsloon.app/docs/Script/script_api/ 、 https://nsloon.app/docs/Script/script_v2/ 。

Modified: 2026-11-02 (chance). 旧生成脚本清理在所有声明重绑定后、同一备份发布事务中执行。仅管理 API/Adblock 生成目录、生成器共享文件名规则及 legacy 目录；未标记为生成的作者/手工脚本不因无引用而删除。根据最终产物、冻结源声明、保留的手工脚本和脚本间相对/完整/编码 URL 建立引用闭包，保留传递依赖与仍作为来源 URL 的文件；无根引用的旧生成文件和孤立循环才移除。同步清理 adapters/bindings 的悬空记录，原始 Resource/Backup 字节不删除，status.json 记录 scriptCleanup。正在使用的 Rewrite mock/helper 和 Module 方向适配文件不按年代或目录整批删除。

Modified: 2026-11-02 (chance). 用户新授权覆盖此前 Surge 严格阻断策略：全量清空存储操作忽略、返回 undefined；HTTP ALPN 与完成值 h2_trailers/node/policy 省略。通知忽略延时和所有点击行为，立即提交内容，远程媒体及可识别内嵌图片映射官方 media-url 或 media-base64/media-base64-mime。Header 匹配保持大小写无关。源版本/构建/路径字段不恢复、不阻断转换，以规范和兼容性报告说明；保留实际可得信息及兼容 presence，不通过源码猜测删除业务分支。这些明确接受的降级不等于严格语义一致；普通业务异常、网络错误和加密错误不得吞掉。

Modified: 2026-11-03 (chance). 当前实现只维护运行时 API 契约，不保留旧 author-composition 实验、静态证明参数或未使用的选项目录；历史设计查阅 Git。原始归档及仍被引用的旧适配文件保留完整性验证，只有现有 Actions 引用闭包清理确认无用后才删除。

Modified: 2026-11-03 (chance). 生成正文精简：通用脚本不附带适配层开发备注；插件省略重复 Target 和常规参数转换说明，规划诊断仍保留。保留原作者注释、许可、转换日期、chance、分类、出处、必要分段和异常提示。已有暂停产物仅使用归档源执行注释精简，不恢复获取。

### 2.25 Native QX url-and-header

Modified: 2026-11-03 (chance). 按上传官方 sample，先匹配 URL，再匹配方法、路径及请求头组成的文本。第一阶段实现限定为不跨分隔符的非空 token 正则（保留量词/大小写，不转换为通配符）、方法前缀/边界、显式忽略大小写的字段前缀。除 2.26 的明确例外外，未知序列化布局、不能安全协调的 URL 重叠、未支持的动作继续 REVIEW；不能把未命中当作后续规则已执行。URL 正则保持 Surge 原生 ICU 引擎，不在 JS 重编译。

支持 reject（按官方 sample 返回空 404，沿用既有授权省略动态延时）、reject-dict/array/200 和有当前共享 QX API 适配器的 response-header/body。拒绝脚本无请求体读取，开启 full-header-mode 保留重复字段。响应脚本用保留命名空间 argument 在公共适配器外层判断，未命中完成且不执行作者代码；QX 原产物和作者源码不变。完整候选结果写入备份状态报告的 headerRewrites。

官方依据：https://manual.nssurge.com/scripting/http-request.html 、https://manual.nssurge.com/scripting/http-response.html 、https://manual.nssurge.com/http/overview.html 。

Modified: 2026-11-03 (chance). URL 前缀分离将 `^https?` / `^http?` 展开为有限备选后逐对比较，保留顶层 alternation 与真实交集的阻断。报告记录潜在重叠数及前 8 条来源声明；`.+` 可以跨路径，不能将其自行缩窄为主机名通配。

### 2.26 Native QX URL/Header 拒绝动作兼容策略（2026-11-03）

Modified: 2026-11-03 (chance). Author: chance. Category: Adblock / Rewrite / QX→Surge。仅在现有 `src/application/qx-header.ts` 的原生 QX→Surge 备份/发布事务增加兼容分支，不改源 QX 语法、原作者注释、脚本原件、IR、解析层或 Action 结构。

1. **完全相同 URL + 相同拒绝动作 + 不同 Header**：同一目标内，原始 URL 正则文本必须完全一致，全部同 URL 声明都有 Header，动作也完全相同，且至少存在两个不同 Header。对 `reject`、`reject-200`、`reject-dict`、`reject-array`，允许在 Surge 合并为唯一原生 `[URL Rewrite]` 或 `[Map Local]` 规则；**仅对生成的 Surge 删除 Header 条件**。源 QX 原文及原作者注释不改；完整的 `# Source declaration` 来源行继续保留，并用一条必要的兼容例外注释标识。在报告中标记 `mode=authorized-url-only-merge`。**此为用户明确授权的匹配范围扩大，不是严格等价转换**：任何匹配该 URL 的请求都可能触发动作，即使原本没有命中任何一个 Header。不能把动作类型不同或其他无条件规则混入同组，也不能把 `reject-dict` 降级为 `reject`。
2. **URL 不同的单条联合拒绝规则**：优先保留 URL 与 Header 的双重条件，以原有 `[Script]` `type=http-request` 脚本处理 `reject`、`reject-200`、`reject-dict`、`reject-array`，`requires-body=false`、`full-header-mode=true`；严格区分 404/200 及空 JSON/数组等响应。已有有限同阶段顺序 dispatcher 保持优先。宽泛 URL 正则可能被保守的重叠检测命中时，仅当目标 URL 带固定字面主机、没有另一个完全相同 URL 的声明、没有已知同主机的潜在冲突项，才允许生成单独的 Header 守卫脚本。无法满足这些限制时沿用 REVIEW，不把 `$done({})` 当作允许后续 HTTP Script 执行。
3. **优先级及风险边界**：Surge 先执行原生 Header/URL Rewrite 和 Map Local，再进入 Script，且同一阶段 HTTP Script 首条匹配占用脚本执行机会。第二种兼容分支无法证明与宽泛、跨主机正则或已有原生 Mock 的完整执行顺序等价；这类残余阴影风险要在规范中明确，不得宣称整份合集全量等价。原生 QX 和已转换的作者脚本保持原样，生成助手由现有引用闭包管理，重复同步不得复制脚本/原生规则。

回归应覆盖合并后唯一原生规则、原来源 Header/注释保留、动作相同与不同的区分、不同 URL 的 Header 命中和未命中、真实宽泛前缀相交、显式同主机冲突继续 REVIEW、重复运行幂等及 Surge 输出校验。Surge 官方依据：https://manual.nssurge.com/http/url-rewrite.html 、https://manual.nssurge.com/http/map-local.html 、https://manual.nssurge.com/http/overview.html 、https://manual.nssurge.com/scripting/http-request.html 。


## 2.28 目标目录、可执行脚本与失效来源（2026-11-05）

Modified: 2026-11-05 (chance). 当前用户要求覆盖旧版共享三端脚本、强制来源声明及源客户端性能默认策略。

转换产物统一为 `类型/Quantumult X或Surge/来源作者/应用/配置或脚本`。脚本与应用配置同目录，原文件名优先，生成助手采用阶段和 URL/操作的可读名称；不把摘要或编号当公开脚本名。类型包括 Adblock、Module、Rule，聚合规则作者为 WayX。配置索引、原件索引、API 绑定和链接一起迁移；`layout-state.json` 记录可逆内部工作视图，只有最终目录发布。原始输入备份不清理/改写。

原作者业务操作继续保留；交付 JS 只留可执行代码和必须的法律声明，安装示例、配置段、无作用说明、开发标记移出脚本。QX/Surge 分别生成程序，只组合实际需要的 provider。缺少或混合来源/原声明不单独阻断：根据已有代码与目标调用上下文适配 API，binary 从实际目标值识别；函数入口允许顶层 return，最终组合仍必须通过语法和运行契约检查。不能以忽略真实错误换取通过。

目标保持真实客户端识别、原生 timers、默认超时和正文限制，不注入虚假 Loon 身份，不模拟 Loon 特有单次 interval 或强加不限正文。Surge 发布脚本名称唯一。已知永久失效 URL 登记在 config/unavailable-sources.json，整文件不获取；部分脚本/依赖失效只注释对应声明，保留其它活动内容。所有变更完成并验证后才一次提交运行 Actions。

Modified: 2026-11-05 (chance). 原生 Quantumult X 配置在格式有效时保留原文，JS 从原始归档逐字节复制（包括注释、BOM、换行），不包裹 API 运行时，不清理安装注释，不因 API 转换诊断停用原生声明。配置仅修正实际不规范的语法；目录迁移只重绑定配置中的脚本地址，不改原生 JS 正文。API 转换仅用于 Loon→QX、Loon→Surge、QX→Surge。此原生直拷政策优先于转换脚本的注释清理要求。

Modified: 2026-11-08 (chance). WayX 生成元数据只输出 `Updated`（更新时间），不再输出独立的 `Converted` 时间。已有自有时间段在最终发布时迁移；作者原注释、原生 QX 副本和原始备份不改写。日期仅在对应内容更新时改变，不因重复同步刷新其它文件的日期。
