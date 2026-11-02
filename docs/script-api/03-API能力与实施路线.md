# Script API 能力与实施路线

Modified: 2026-11-02 (chance). 本文区分已经实现的 API、可复用库补齐的能力，以及需要真实宿主服务的能力。范围为去广告 HTTP 脚本；生产方向仅 Loon→QX、Loon→Surge、QX→Surge。优先级依据 API 的可复用程度、调用契约和实现依赖，不依据某个本地作者脚本是否能过测试。

## 本轮已处理

| API/行为                    | 处理                                                                                                              | 验证                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `$done`                     | 校验成功后才锁定宿主提交；校验错误允许作者捕获并提交合法结果；宿主错误继续传播                                    | 三方向的错误后重试、重复完成、原生抛错                             |
| QX `$task.fetch` 原生正文   | 有原生 String 时原样保留，不用 bodyBytes 再按 UTF-8 覆盖                                                          | 原生 windows-1252 字节与已解码文本并存                             |
| QX fetch→Surge 字节响应     | 依据 Content-Type charset 使用真实 TextDecoder，缺省 UTF-8；无对应解码器则拒绝并带 `UNSUPPORTED_RESPONSE_CHARSET` | UTF-8、原生旧编码、无旧编码实现                                    |
| HTTP 请求输入               | QX 未说明的参数在 API 调用时省略，原实参构造照常执行；不把未说明的输入 bodyBytes 当 body                          | 未说明字段、getter、构造副作用和合法 BufferSource                  |
| Loon `body-base64`          | 在调用边界解码为 QX ArrayBuffer/Surge Uint8Array body；原生 Loon 保持原参数                                       | 任意二进制字节与错误入参                                           |
| Loon HTTP `node`            | 映射到目标 fetch 的 policy；DIRECT 映射对应直连名称                                                               | Loon→QX/Surge；只影响这一请求，不写入配置                          |
| `$utils.gzip/ungzip`        | 原生 Loon 优先，否则固定 Pako 2.1.0 同步实现；准确 Uint8Array 视图、完整 gzip 流和校验错误                        | 独立 Node zlib 交叉向量、空数据、跨 realm、CRC/长度/截断、拼接成员 |
| QX `$prefs.removeAllValues` | 原生 QX 保留真实方法及接收者；Surge 明确无实现                                                                    | 不用已见键集合冒充清空整个存储                                     |
| API 清单                    | target.capability 标注 runtime/native-only/unavailable/unclassified；缺失 provider 附方案                         | 清单不因未执行的功能检测分支而阻断整份作者程序                     |

Pako 按来源客户端整体加入，延迟初始化、独立作用域，不污染宿主 globals；没有按脚本名或调用写法选择实现。上游 bundle、SHA-256、MIT/Zlib 许可和生成文件中的许可见 `vendor/pako/NOTICE.md`。gzip 的合法编码、Header 元数据、错误文字仍可能与原生不同，不保证压缩后逐字节相同。

## 剩余 API 与实施顺序

| 顺序     | API                                           | 当前状态                                             | 方案与完成条件                                                                                                                                                                  |
| -------- | --------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | `$crypto.aes.encrypt/decrypt`                 | Loon 原生保留；QX/Surge 未实现                       | 复用固定版本 `@noble/ciphers` 的纯 JS 同步 AES。先完成下表契约及独立向量，再一次启用四种模式                                                                                    |
| 2        | `URL` / `URLSearchParams`                     | 有真实宿主实现就使用；未打包 fallback                | 优先评估 `jsdom/whatwg-url`，两类共同提供，保留 searchParams 与 URL 的联动。确认依赖、IDNA、经典 JS 解析、运行时所需 globals 与包体预算，使用 WPT 向量验收                      |
| 3        | 旧字符集解码                                  | 原生 TextDecoder 可用的标签支持；fallback 只有 UTF-8 | 若要扩大支持，固定并裁剪成熟 Encoding Standard 实现，按标签和标准向量覆盖；不可用标签继续明确拒绝，不把它悄悄当 UTF-8                                                           |
| 4        | HTTP ALPN / `h2_trailers`、完整 Header 数组   | 未保证跨端等价；普通字典仍使用 ScriptHub 小写策略    | 先登记各 SDK 字段、返回/完成值和声明支持，再做声明驱动的 Header 数组模式。保持重复字段及顺序；目标无表达能力时报告边界，不合并后宣称等价                                        |
| 原生服务 | `$dns.query`                                  | 原生 Loon 保留；未实现跨端 provider                  | 只映射契约相同的真实解析器。需要另行提供 DoH 时复用成熟 DNS wire-format 库和 HTTP，限定显式 DoH 范围；UDP、DoQ、system、TTL/CNAME、缓存、超时语义分别验证，禁止默认改走公共 DoH |
| 原生数据 | `$utils.geoip/ipasn/ipaso`                    | 原生 Loon 保留；未实现跨端 provider                  | 先核对目标原生接口的国家码/ASN/组织名、缺失值及数据库契约；选择替代数据库需明确策略、许可、版本与更新。同步本地 API 不改为远程 Promise                                          |
| 原生存储 | `$prefs.removeAllValues`、缺失/空值及详细错误 | clear-all 仅 QX 原生；其它存储调用保持目标真实结果   | 不增设只记录当前脚本写入键的假清空方案；不强制把 null/undefined/空字符串归一。无法证明相同的数据契约明确列差异                                                                  |
| 实际身份 | 真实源设备、版本、sourcePath、不可得时间信息  | 不可从其它客户端恢复                                 | 保留实际可得字段，缺失就缺失。Loon presence 使用明确兼容标识，不生成伪版本、伪设备或伪时间                                                                                      |

前三项是适合通过通用库继续补齐的能力；后几项依赖宿主或真实数据，不能靠改函数名解决。它们不是同一等级的“阻断”：当前清单描述能力，只有语法、方向和触发声明问题会在生成阶段阻止发布。缺失 API 的实际调用仍失败，作者可正常功能检测或捕获错误。

## AES 的具体映射

以下为待实施方案，尚未计入已支持能力。Loon 的接口是同步字节 API，不能替换成返回 Promise 的 WebCrypto，也不能用缺少 GCM 的实现宣称四模式完成。

| Loon 契约                                                      | noble-ciphers 适配要求                                                                               |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| data、key、iv、aad、tag 为 Uint8Array                          | 同压缩边界，品牌校验及准确视图；不自动解释密码、Base64 或十六进制字符串                              |
| key 为 16/24/32 字节                                           | 四模式共用校验；不派生密钥、不自行补零                                                               |
| ECB                                                            | 不接受 IV；PKCS7 默认，可显式 none；使用上游 padding 控制                                            |
| CBC                                                            | IV 16 字节；PKCS7 默认或 none；padding 校验失败必须抛错                                              |
| CTR                                                            | IV 16 字节；不加 padding；计数器行为用独立向量确认，不能仅检查自身往返                               |
| GCM                                                            | nonce 12 字节、可选 AAD；上游密文与尾部 16 字节 tag 分开返回；解密按接口合并输入给库并验证后返回明文 |
| `encrypt` 返回 `{ciphertext, tag?}`；`decrypt` 返回 Uint8Array | 同步返回形状；认证失败不能返回部分明文；不暴露上游不同形状                                           |
| 同步参数/运算异常                                              | 参数类型/长度与运行错误分别测试；未建立来源错误码契约前不声称错误消息逐字相同                        |

验收包括 NIST 与跨库向量、三种密钥长度、空数据、非整块数据、切片/跨 realm、PKCS7 损坏、GCM 密文/标签/AAD 篡改、输入不被修改。测试通过后才在共同 catalog、provider、capability report 中同步标记 runtime。

## 与 ScriptHub 的分工

固定的 ScriptHub `script-converter.js` 已复用其 facade/HTTP 桥接/Header 思路。核对 b943361f11be5795b3eb10f9cc4e5497642922fc，未包含 `$utils`、`$crypto`、`$dns`、gzip 或 URLSearchParams 的实现，不能把这些问题标成上游已解决。这些缺口用成熟库补 provider，宿主服务缺口保留实际边界；不再增加另一套逐源码证明器。

## 维护与发布

1. 先在 `domain/script-api.ts` 定义来源、目标、数据契约、可用性和方案，避免目录把 unavailable 写成已支持。
2. provider 独立、固定来源与许可，原生优先，运行时才处理动态值；不读取作者业务值选择兼容算法。
3. API 向量使用独立参考实现、错误和异步行为；测试不加载仓库作者脚本作为放行清单。
4. Actions 一次更新原件、同源共用 JS、API 清单及全部引用；原字节备份保留，脚本 URL 稳定。生产文件不在本地手写。

## 主要依据

- [Loon Script API](https://nsloon.app/docs/Script/script_api/) 与 [Script V2](https://nsloon.app/docs/Script/script_v2/)：同步字节、HTTP、AES、DNS 和本地数据库契约。
- [QX 作者仓库](https://github.com/crossutility/Quantumult-X)，尤其 sample.conf、sample-bytes-rewrite.js、sample-fetch-opts-policy.js：只映射已说明的参数，其余省略。
- [Surge Scripting](https://manual.nssurge.com/scripting/)：目标接口和声明模式。
- [ScriptHub 固定源码](https://github.com/Script-Hub-Org/Script-Hub/blob/b943361f11be5795b3eb10f9cc4e5497642922fc/script-converter.js)：当前复用基线。
- [Pako 2.1.0](https://github.com/nodeca/pako/tree/3c06216518c259b569a5168dee867e6dabbe5160)：本轮实现的上游 provider。
- [noble-ciphers](https://github.com/paulmillr/noble-ciphers)：待实施的同步 AES 方案；引入时须另行固定具体版本。
- [whatwg-url](https://github.com/jsdom/whatwg-url)：待评估的 URL 标准实现；引入时须另行固定版本及传递依赖。
