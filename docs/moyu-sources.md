# 墨鱼资源接入

Modified: 2026-11-01 (chance). 按上游目录接入原生 QX 配置，并将功能类输出至 Module。

来源：https://github.com/ddgksf2013/Rewrite （master）。导航入口：https://ddgksf2013.top/ 。

| 上游目录 | WayX 目录 | QX | Surge |
| --- | --- | ---: | ---: |
| AdBlock | Adblock | 24 | 24 |
| Function | Module | 6 | 6 |
| Html | Module | 4 | 4 |

通过 `.github/sources/native-qx.json` 注册，随现有定时工作流发现、拉取和转换。只接入配置声明，保留原注释与原脚本 URL；不复制或改写作者 JS。保留源标注的失效状态，不承诺其实际功能有效。

EmbyPlugin 原声明的替换串为 `$Accept-Encoding: gzip, deflate, br`，没有引用 CRLF 捕获组。按用户授权修正为 `$1Accept-Encoding: gzip, deflate, br$2`，匹配端补齐尾部 CRLF 捕获；保留原声明注释。修正仅匹配该源 URL 和该条完整原文，其他源和其他写法不适用。QX 原生格式按上传官方 sample 的双 CRLF 边界写法；Surge 使用 `header-replace Accept-Encoding`，缺失字段不新增。原脚本 URL 和请求阶段保持不变，未验证脚本运行时兼容性。

Modified: 2026-11-01 (chance). 高德 reject-img 使用 Map Local tiny-gif/200；TFDownload 含空格的替换按重复动作分隔并引用完整参数。Surge 含引号参数按当前官方格式生成（iOS 5.21.0+ / Mac 6.8.0+）。
