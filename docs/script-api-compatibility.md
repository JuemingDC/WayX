# 去广告 Script API 兼容层

Modified: 2026-11-02 (chance). 当前维护方式为 ScriptHub 派生的运行时 API 适配；旧静态证明方案已从生产实现和测试中移除。详见 [完整设计](script-api/02-方案设计.md)。

## 范围

生产方向只有 Loon→Quantumult X、Loon→Surge、Quantumult X→Surge。每个源 URL 一个原文件名的共用脚本，原正文一次；原插件和脚本字节保存在 Resource/Backup。配置控制、任务、Module 工具和 Egern 不提供新 API 适配。

## 上游和修正

复用 [ScriptHub](https://github.com/Script-Hub-Org/Script-Hub/blob/b943361f11be5795b3eb10f9cc4e5497642922fc/script-converter.js) 的运行时兼容方式及 Header Proxy，出处与 GPL 许可见 vendor/script-hub。修正 Header 删除/has/Symbol/原型方法、HTTP 七方法及拒绝、字节/状态、来源默认值、显式存储删除。没有定时器空函数、正文全文替换或捕错假放行。

## 通用调用

动态对象、键名、函数包装、类和 Env 的 this 交给 JavaScript 执行。编译阶段只检查语法、授权方向、HTTP phase/binary 声明。API inventory 仅记录引用与能力，不对作者的实参、别名、分支逐项证明或白名单放行。target.capability 明确区分运行时适配、需要原生、未实现和未分类。

Header 采用大小写无关、小写字典策略，这是接受的兼容规范化；不保持原键大小写和重复大小写键。HTTP 支持动态方法、并发、Promise/callback、二进制和动态结果，错误继续传播。原生 QX 已解码文本保留；外端字节按实际可用的 TextDecoder 处理 charset，不可用则明确拒绝。Loon body-base64 转真实字节，node 映射目标单次请求的 policy；$done 先校验后锁定提交，允许作者捕获校验错误后重试。QX 未说明参数按用户要求省略；原构造表达式、副作用及异常不被移除。

## 能力边界

目标原生的存储缺失值、空值、详细错误对象、编码/Cookie 状态及客户端版本可能仍不同；兼容不等于整程序严格等价。真实源设备/版本、动态 Function 代码的 globals、完整 Header 数组、受限 Proxy descriptor、未提供的 AES/DNS/GeoIP/WASM/文件/配置 API 不伪造支持。Loon gzip/ungzip 已复用固定 Pako（原生优先、延迟初始化、gzip 完整流校验）；压缩字节编码和元数据不保证与原生一致。QX echo 和 body/header 规则需要相应声明；未知默认来源存储键、不可用通知动作在调用时明确失败。

剩余 AES、URL、编码和宿主服务的实现选择及验收条件见 [API 能力与实施路线](script-api/03-API能力与实施路线.md)。QX removeAllValues 原生保留；目标没有全局清空存储接口时不伪造成功。

## 文件与验证

原件 Resource/Backup/script/<URL SHA>/<原名>；共用文件 Script/Adblock/<来源主机>-<URL摘要>/<原名>；外部 API 清单 Resource/Backup/script-api/<URL SHA>.json。索引校验原件和清单摘要。

报告 runtimePolicyVersion=2、validationMode=api-runtime-compatibility 表示 API 适配器已组合并通过契约测试，不表示作者所有业务路径已在设备上执行。验证使用独立 API 向量、模拟原生传输和合成备份事务；实际生产原件及产物仅由 Actions 更新。

## 旧生成文件清理

Modified: 2026-11-02 (chance). Actions 在最终引用重绑定后清理没有引用的旧生成文件；生成器与清理器共用文件名归属规则。冻结源、手工脚本、脚本相对依赖和来源 URL 都参与保留判断，正在使用的旧 mock 或 Module 适配文件继续保留。原始备份不删除，清理文件清单写入 Resource/Backup/status.json 的 scriptCleanup。
