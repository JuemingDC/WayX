# Script API 能力与实施路线

Modified: 2026-11-02 (chance). 当前维护的是去广告 HTTP 脚本的通用 API 转换。生产方向保留 **Loon→QX、Loon→Surge、QX→Surge**，每源 URL 一个同源命名的共用脚本，作者业务正文只出现一次。运行时处理动态对象、函数、别名和 Env 接收者，不用仓库作者脚本作为 API 放行样本。

DNS、GeoIP、ASN、配置控制、任务和 Module 工具不参与新增 API 适配。DNS/IP 查询不进入操作清单、未实现能力统计或后续待办；原作者正文不删除。

## 已实现的公共能力

| 来源 API/行为                      | 通用处理                                                                             | 验证依据                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `$request` / `$response`           | 来源字段、状态、声明控制的文本/字节视图、准确 BufferSource 切片                      | 动态对象、别名、跨 realm 和字节视图                                     |
| Header 字典                        | ScriptHub 派生的小写、大小写无关 Proxy；补齐删除、has、Symbol、descriptor 和原型操作 | 独立 Header 操作契约；不修改原生字典                                    |
| `$httpClient` / `$task.fetch`      | 七方法、来源默认值、单位、node/policy、Promise/callback、并发、拒绝和缺失响应        | 模拟原生传输的成功、失败、并发和动态入参                                |
| Loon `body-base64`                 | API 边界解码成目标真实字节 body                                                      | 任意二进制、切片及类型错误                                              |
| QX 原生已解码文本                  | 同时有 bodyBytes 时保留原生 String，不重复按 UTF-8 解码                              | 旧编码字节与原生文本并存                                                |
| QX fetch→Surge 字节响应            | 依据 charset 使用标准 TextDecoder；缺省 UTF-8，未知标签明确失败                      | UTF-8、旧编码及错误路径                                                 |
| `$persistentStore` / `$prefs`      | 动态 String 键值、默认来源名称、显式 null/undefined 删除                             | 真实目标 SDK 返回值；不把空字符串当删除                                 |
| Loon `$persistentStore.remove()`   | QX 调用真实 removeAllValues；Loon 保留原生 remove                                    | 全量清空不以部分已见键集合模拟                                          |
| `$notification.post` / `$notify`   | 字段映射；Loon clipboard→Surge action/text；QX 未说明附加参数省略                    | 来源实参构造副作用与目标通知参数                                        |
| `$done`                            | 动态完成对象、状态格式、字节、synthetic response 包装；先校验再锁定提交              | 校验错误后重试、只提交一次、原生抛错、echo 声明                         |
| Loon `setTimeout/setInterval`      | 真实宿主调度；Loon interval 按文档只执行一次                                         | 回调、毫秒单位、附加参数与源 API presence                               |
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

## 无目标接口的处理边界

以下是明确的目标能力差异，已经有对应处理，不是继续编写替代服务的待办。

| 行为                                       | Quantumult X                                          | Surge                                                    |
| ------------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------- |
| 未说明参数                                 | 按用户要求，在 API 调用处省略；保留原构造表达式及异常 | 有映射就转换；无等价行为明确失败                         |
| 全量清空存储                               | 调用真实 removeAllValues                              | SDK 无全量清空方法，调用时 UNSUPPORTED_API               |
| Loon 显式 ALPN                             | 目标未说明，省略                                      | fetch SDK 无对应选择器，明确失败；不原样转发冒充支持     |
| 完成结果 h2_trailers                       | 未说明字段省略                                        | SDK 无 trailer 完成字段，明确失败；不丢掉它后声称等价    |
| 原生通知延迟、内嵌媒体、同时打开链接并复制 | 额外通知参数省略                                      | 生命周期或动作契约无等价接口，明确失败；不伪造后台定时器 |
| 原生 echo / body/header 声明约束           | 必须有正确 echo 或 body 声明                          | 依照实际目标 Script 声明                                 |

存储缺失/空值、Cookie 状态、详细原生错误和实际引擎版本仍可能不同；保留真实 SDK 行为，不强制归一或伪装成功。Loon/QX 的字典 Header 输入仍采用明确的小写兼容政策，原键大小写和重复大小写键不保留；Surge full-header 数组不是新的来源转换方向。受 Proxy 不变量限制的 descriptor 明确失败。

真实源设备、版本、sourcePath 和不可得时刻不虚构。动态 Function 的全局作用域、任意全局反射、WASM/require/文件/配置 API 不在该运行时的通用模拟范围。没有增加按作者程序形状放行的证明器。

## 可复现构建与维护

ScriptHub 固定基线为 b943361f11be5795b3eb10f9cc4e5497642922fc，复用 facade/HTTP 桥接与 Header 思路。新增算法使用成熟上游库，适配代码只处理 API 契约。Pako 的 MIT/Zlib 及新 provider 的 MIT/BSD 许可均保留在生成文件中。

`vendor/script-api-providers` 保存锁文件、完整许可、构建程序及 manifest。库独立作用域、延迟初始化，不污染宿主 globals，不运行时下载或依赖 Node。按声明的来源客户端整体加入能力，不扫描具体作者的调用决定是否带库。包体、标准修订和库版本是需要维护的实际成本。

独立向量覆盖算法、返回形状、异常和异步行为；合成程序覆盖三方向及备份事务。runtimePolicyVersion=3、validationMode=api-runtime-compatibility。**整批实现、规范和测试完成后，才统一运行一次 Actions**，同事务刷新原件、共用 JS、API 清单和引用。

主要依据：[Loon API](https://nsloon.app/docs/Script/script_api/)、[Script V2](https://nsloon.app/docs/Script/script_v2/)、[QX 作者仓库](https://github.com/crossutility/Quantumult-X)、[Surge API](https://manual.nssurge.com/scripting/api.html)、[provider 固定版本与许可](../../vendor/script-api-providers/README.md)。
