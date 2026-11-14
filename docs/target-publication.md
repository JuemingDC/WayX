# Target publication

Modified: 2026-11-05 (chance).

Public converted resources use `type/Quantumult X/author/app/` and `type/Surge/author/app/`. A configuration and all its scripts are colocated. Adblock and Module retain source-author classification; aggregated Rule collections use WayX. Source filenames are preferred. Generated helpers use readable trigger/operation names, not hashes or numeric codes.

The existing pipeline keeps logical working paths internally. `prepareWorkingLayout` restores that view from `.github/sources/layout-state.json` before acquisition; `publishLayout` transactionally emits the final client tree after conversion and rebinding. It updates catalog targets, native/rule state, API bindings and manual-resource paths together. The manifest permits the next run to recover the same working identities; raw source archives are never reconstructed from cleaned output. README/install links are generated from the final tree.

Client scripts contain executable JavaScript plus required legal notices. Installation instructions and configuration snippets belong outside executable code. Required providers are selected from executable dependencies; dynamic HTTP charset decoding remains a transport dependency when QX fetch is lowered to Surge callbacks. Original business operations and exact backup bytes remain available for inspection. Target scripts do not forge a Loon identity, emulate its one-shot interval or copy its default timeouts/unlimited body setting. Explicit supported settings remain part of conversion; historical forced defaults are removed during migration.

Source attribution and a unique original HTTP declaration are not prerequisites. The API family can be inferred and actual target input determines binary handling. Syntax is checked in the function context used by proxy entrypoints, including legal top-level returns, and the final classic program is checked independently. Invalid output is never certified by suppressing an exception. API/runtime checks are not device certification.

Known permanently unavailable whole-file sources are disabled in `config/unavailable-sources.json` and are not requested. Only declarations requiring unavailable resources are commented; unaffected rules remain active. A repaired source is explicitly removed from the disabled map before acquisition resumes.

Final checks cover readable paths, reference closure, script syntax, duplicate Surge script identities, raw archive checksums, and the reversible next-run layout. All code, registry and test changes are prepared before one final Actions publication.

Modified: 2026-11-13 (chance). 原生 Quantumult X 配置在格式有效时保留原文；发布版 JS 同样清除安装配置、使用说明和开发注释，仅保留可执行代码与必要许可声明，不添加 API 运行时或改变作者业务逻辑。原始脚本仍逐字节归档，保留注释、BOM 和换行；发布完整性按同一清理策略与原件比较。API 转换仍仅用于 Loon→QX、Loon→Surge、QX→Surge，不因 API 转换诊断停用原生声明。


## JQ 文件依赖转为内联

Modified: 2026-11-14 (chance). Actions 解析 Loon 的 `jq_file` / `jq-path` 并读取同一轮资源快照中的 JQ 程序；QX 输出 `jsonjq-request-body` / `jsonjq-response-body`，Surge 输出 `[Body Rewrite]` 的 `http-request-jq` / `http-response-jq`。程序只做目标配置所需的单行化和引号转义，保留字符串内容、嵌套插值、注释续行、条件、阶段与操作顺序。完整 JQ 表达式优先交由客户端原生 JQ 处理。

不再生成 `Resource/JQ` 副本及 `# JQ File:` 注释链接；Actions 发布迁移同时删除上一版产生的内容，源插件与原始归档保持原样。jq 命令行的 `-f` 不属于客户端配置语法，官方工具文件读取能力不能直接用来证明客户端文件引用接口。官方 jq 对照测试验证程序内联前后的样本行为，不代表客户端全部运行边界已得到实机验证。
