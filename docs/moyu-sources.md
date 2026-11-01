# 墨鱼资源接入

Modified: 2026-11-01 (chance). 按上游目录接入原生 QX 配置，并将功能类输出至 Module。

来源：https://github.com/ddgksf2013/Rewrite （master）。导航入口：https://ddgksf2013.top/ 。

| 上游目录 | WayX 目录 | QX | Surge |
| --- | --- | ---: | ---: |
| AdBlock | Adblock | 24 | 23 |
| Function | Module | 6 | 4 |
| Html | Module | 4 | 4 |

通过 `.github/sources/native-qx.json` 注册，随现有定时工作流发现、拉取和转换。只接入配置声明，保留原注释与原脚本 URL；不复制或改写作者 JS。保留源标注的失效状态，不承诺其实际功能有效。

以下源暂时仅发布完整 Quantumult X 配置：

- AmapAds：`reject-img` 尚无已核实的 Surge 等价实现。
- EmbyPlugin：整段请求头正则替换超出现有受支持的单字段转换范围。
- TFDownload：`request-body` 正则替换尚无已核实的 Surge 等价实现。

这些边界通过 `surge_exclude` 显式登记；后续同步同样不发布不完整的 Surge 模块。其余 Surge 配置通过现有转换器与格式检查，但作者脚本在目标客户端的运行时兼容性未实机验证。
