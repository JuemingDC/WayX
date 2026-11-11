# Script API 能力与维护边界

Modified: 2026-11-03 (chance). 当前维护的是去广告 HTTP 脚本的通用 API 转换。生产方向保留 **Loon→QX、Loon→Surge、QX→Surge**，每源 URL 一个同源命名的共用脚本，作者业务正文只出现一次。运行时处理动态对象、函数、别名和 Env 接收者，不用仓库作者脚本作为 API 放行样本。

DNS、GeoIP、ASN、配置控制、任务和 Module 工具不参与新增 API 适配。DNS/IP 查询不进入操作清单、未实现能力统计或后续待办；原作者正文不删除。

## 已实现的公共能力

| 来源 API/行为                      | 通用处理                                                                             | 验证依据                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `$request` / `$response`           | 来源字段、状态、声明控制的文本/字节视图、准确 BufferSource 切片                      | 动态对象、别名、跨 realm 和字节视图                                     |
| QX 请求路径 | 从真实 URL 提供 scheme/path；path 完成值转 Surge url；完整 URL 修改透传，保留跨域/协议/端口变化 | 官方 request-header sample，端口/IPv6/查询/转义/动态返回测试 |
| Header 字典                        | ScriptHub 派生的小写、大小写无关 Proxy；补齐删除、has、Symbol、descriptor 和原型操作 | 独立 Header 操作契约；不修改原生字典                                    |
| `$httpClient` / `$task.fetch`      | 七方法、来源默认值、单位、node/policy、Promise/callback、并发、拒绝和缺失响应        | 模拟原生传输的成功、失败、并发和动态入参                                |
| Loon `body-base64`                 | API 边界解码成目标真实字节 body                                                      | 任意二进制、切片及类型错误                                              |
| QX 原生已解码文本                  | 同时有 bodyBytes 时保留原生 String，不重复按 UTF-8 解码                              | 旧编码字节与原生文本并存                                                |
| QX fetch→Surge 字节响应            | 依据 charset 使用标准 TextDecoder；缺省 UTF-8，未知标签明确失败                      | UTF-8、旧编码及错误路径                                                 |
| `$persistentStore` / `$prefs`      | 动态 String 键值、默认来源名称、显式 null/undefined 删除                             | 真实目标 SDK 返回值；不把空字符串当删除                                 |
| Loon `$persistentStore.remove()`   | QX 调用真实 removeAllValues；Loon 保留原生 remove                                    | 全量清空不以部分已见键集合模拟                                          |
| `$notification.post` / `$notify`   | 字段映射；保留有实例支持的链接、剪贴板与远程媒体                              | 来源实参构造副作用与目标通知参数                                        |
| `$done`                            | 动态完成对象、状态格式、字节、synthetic response 包装；先校验再锁定提交              | 校验错误后重试、只提交一次、原生抛错、echo 声明                         |
| Loon `setTimeout/setInterval`      | 真实目标宿主调度；不强加 Loon 特有单次 interval                                         | 回调、毫秒单位、附加参数与源 API presence                               |
| UTF-8 / Base64                     | 独立标准实现，原生能力可用时优先                                                     | 编码、BOM、流式、fatal、品牌及非法输入                                  |
| 旧字符集 TextDecoder               | 固定 Exodus bytes 1.16.0，原生标签优先，标准旧编码延迟 fallback                      | Windows/ISO 单字节、GBK/GB18030、Big5、日文/韩文、UTF-16、流式和失败    |
| Loon `$utils.gzip/ungzip`          | 原生优先，Pako 2.1.0 同步 Uint8Array；gzip-only 完整流校验                           | 独立 Node zlib、CRC/Trailer、截断、拼接成员和跨 realm                   |
| Loon `$crypto.aes.encrypt/decrypt` | 原生优先，noble-ciphers 2.4.0 同步四模式、三种密钥长度、padding、AAD 和独立 GCM tag  | NIST/Node crypto 跨库向量、篡改认证失败、准确切片和输入不变             |
| URL / URLSearchParams              | 优先完整原生类对；否则 whatwg-url 14.2.0，保持地址与参数活对象联动                   | 标准地址、IDNA、相对地址、setter、迭代、parse/canParse 及 Node URL 对照 |

公共 provider 已完成接入，不再把 AES、URL 和旧编码列为待实现方案。API 清单的 target.capability 仍区分 runtime/native-only/unavailable/unclassified；运行时映射成功不代表作者所有业务路径或所有设备版本已认证。

## AES 调用契约

| 项目 | 实现                                                                                                                   |
| ---- | ---------------------------------------------------------------------------------------------------------------------- |
| 输入 | data/key/iv/aad/tag 必须是实际 Uint8Array，保留准确 byteOffset/byteLength；不自动把密码、Base64 或十六进制字符串当密钥 |
| 密钥 | 16、24、32 字节，不派生、不补零                                                                                        |
| ECB  | 无 IV；PKCS7 默认或 none                                                                                               |
| CBC  | IV 16 字节；PKCS7 默认或 none                                                                                          |
| CTR  | IV 16 字节，无 padding；计数器行为用独立参考实现验证                                                                   |
| GCM  | nonce 12 字节，可选 AAD；加密拆出独立 16 字节 tag，解密交给上游认证后才返回明文                                        |
| 返回 | encrypt 为 `{ciphertext, tag?}`，decrypt 为 Uint8Array；同步返回                                                       |
| 失败 | 类型/长度异常明确抛出；运算失败含 ENCRYPTION_FAILED/DECRYPTION_FAILED 及 cause。来源错误文字与原生细节不保证逐字相同   |

## Surge 默认忽略策略

Modified: 2026-11-02 (chance). 用户明确授权以继续执行为优先：Surge 全量清空存储操作忽略，返回 undefined，不删除部分键、不报告清空成功。HTTP ALPN 和完成结果 h2_trailers/node/policy 字段省略，正常请求和完成继续执行。

Modified: 2026-11-10 (chance). 通知保留 openUrl/clipboard 与 QX open-url/update-pasteboard，分别映射 Surge 官方 action/url/text；两种动作同时给出时优先剪贴板。QX 目标保留两字段。通知仅忽略 delay，立即提交。远程图片映射 media-url；PNG/JPEG/GIF/WebP Data URI 或裸 Base64 经签名识别映射 media-base64/media-base64-mime，无法识别的媒体省略。实参构造照常执行；不读取未知选项 getter，不捕获作者业务代码或网络错误来假放行。

Header 继续使用大小写无关的查找、设置、删除和匹配。原始字段大小写仍按既定小写字典兼容政策规范化。

源软件版本、构建号、脚本 sourcePath 等元数据不恢复、不作为转换阻断，包装器用注释说明省略；保留兼容 presence 和实际可得的时间/名称。不会依据作者源码猜测并注释业务条件。任意作者逻辑直接依赖不存在的元数据，仍属于业务逻辑而非可安全删除的接口参数。

Modified: 2026-11-10 (chance). QX 完成值保留 url，包括域名、协议和端口变化；path 修改另作对应转换。开源实现依据为 [NSNanoCat/util 的 QX done 分支](https://github.com/NSNanoCat/util/blob/main/lib/done.mjs) 和已归档的 QX YouTube Worker 重定向调用。官方示例未列出某字段，不构成自动省略该字段的理由；开源实例与官方签名、客户端实测分别说明。

以上是用户明确接受的语义降级，不能继续称为严格等价。正常参数类型错误、认证失败、网络失败及作者自身异常仍保留。

## 可复现构建与维护

ScriptHub 固定基线为 b943361f11be5795b3eb10f9cc4e5497642922fc，复用 facade/HTTP 桥接与 Header 思路。新增算法使用成熟上游库，适配代码只处理 API 契约。Pako 的 MIT/Zlib 及新 provider 的 MIT/BSD 许可均保留在生成文件中。

`vendor/script-api-providers` 保存锁文件、完整许可、构建程序及 manifest。库独立作用域、延迟初始化，不污染宿主 globals，不运行时下载或依赖 Node。按声明的来源客户端整体加入能力，不扫描具体作者的调用决定是否带库。包体、标准修订和库版本是需要维护的实际成本。

独立向量覆盖算法、返回形状、异常和异步行为；合成程序覆盖三方向及备份事务。runtimePolicyVersion=7、validationMode=api-runtime-compatibility。**整批实现、规范和测试完成后，才统一运行一次 Actions**，同事务刷新原件、共用 JS、API 清单和引用。

主要依据：[Loon API](https://nsloon.app/docs/Script/script_api/)、[Script V2](https://nsloon.app/docs/Script/script_v2/)、[QX 作者仓库](https://github.com/crossutility/Quantumult-X)、[Loon Script API](https://nsloon.app/docs/Script/script_api/)、[Surge API](https://manual.nssurge.com/scripting/api.html)、[provider 固定版本与许可](../../vendor/script-api-providers/README.md)。

## 实例支持的 API 修正（2026-11-10，chance）

- QX 请求二进制体使用 `bodyBytes: ArrayBuffer`；Loon 字节视图和 Base64 请求在转 QX 时切换字段，保留 byteOffset/byteLength。QX→Surge 将 bodyBytes 转为 Uint8Array body。文本 body 优先，避免同时提交两种正文。
- 通知按来源字段读取并映射；Loon 字符串链接保留，远程媒体按目标字段提交；QX 不新增无证据的内嵌图片选项。
- 证据：[NSNanoCat fetch](https://github.com/NSNanoCat/util/blob/49e40678c71f5075f451bf9aea6a91fd5c75ca5f/polyfill/fetch.mjs)、[NSNanoCat notification](https://github.com/NSNanoCat/util/blob/3cfb2cac62f0331344a44ea7e3d0b18ce7c82058/lib/notification.mjs)、[Loon Script API](https://nsloon.app/docs/Script/script_api/)、[Surge API](https://manual.nssurge.com/scripting/api.html)。GitHub 实现是兼容依据，不等于本项目已经客户端实测。
- 已复查存储、HTTP 选项/响应、完成值和环境信息：QX timeout 的实例使用 Promise.race，不能据此证明原生参数支持；Surge 无原生全量清空接口，ALPN/额外完成字段及缺失环境信息仍不伪造。

## 按实际 API 生成（2026-11-11，chance）

转换产物优先使用最小词法适配：只读请求 URL/正文和响应正文、以静态 body 对象完成的 Loon 脚本，不再携带整套运行时。保留单次完成提交、字节视图偏移和函数作用域；业务语句与字面量不改写。

其余程序依据真实词法引用选择模块（正文/完成值、HTTP、存储、通知、环境、参数、标准能力），再保留模块依赖闭包。别名和动态成员访问保留对应完整 API；全局对象逃逸、动态全局键、eval/Function/this 保守保留兼容能力。只有生成器自有代码参与常量消解及依赖裁剪，不能从作者的具体 URL/数据分支猜测输出。

目标客户端和固定布局在生成阶段确定；已不再使用的 host 字段、配置字段、编解码、压缩、AES、URL provider 不打包。复杂动态脚本可能仍需要较完整的兼容层。QX 原生脚本仍直拷；精简不会恢复暂停来源，也不会修改 Rule。

验证包含完整 API 内核与精简产物的差分执行，并复用现有 API、provider、原生 QX 和发布集成测试。大小减少不作为语义一致的证明；未进行客户端实测。
