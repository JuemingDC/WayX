# Target publication

Modified: 2026-11-05 (chance).

Public converted resources use `type/Quantumult X/author/app/` and `type/Surge/author/app/`. A configuration and all its scripts are colocated. Adblock and Module retain source-author classification; aggregated Rule collections use WayX. Source filenames are preferred. Generated helpers use readable trigger/operation names, not hashes or numeric codes.

The existing pipeline keeps logical working paths internally. `prepareWorkingLayout` restores that view from `.github/sources/layout-state.json` before acquisition; `publishLayout` transactionally emits the final client tree after conversion and rebinding. It updates catalog targets, native/rule state, API bindings and manual-resource paths together. The manifest permits the next run to recover the same working identities; raw source archives are never reconstructed from cleaned output. README/install links are generated from the final tree.

Client scripts contain executable JavaScript plus required legal notices. Installation instructions and configuration snippets belong outside executable code. Required providers are selected from executable dependencies; dynamic HTTP charset decoding remains a transport dependency when QX fetch is lowered to Surge callbacks. Original business operations and exact backup bytes remain available for inspection. Target scripts do not forge a Loon identity, emulate its one-shot interval or copy its default timeouts/unlimited body setting. Explicit supported settings remain part of conversion; historical forced defaults are removed during migration.

Source attribution and a unique original HTTP declaration are not prerequisites. The API family can be inferred and actual target input determines binary handling. Syntax is checked in the function context used by proxy entrypoints, including legal top-level returns, and the final classic program is checked independently. Invalid output is never certified by suppressing an exception. API/runtime checks are not device certification.

Known permanently unavailable whole-file sources are disabled in `config/unavailable-sources.json` and are not requested. Only declarations requiring unavailable resources are commented; unaffected rules remain active. A repaired source is explicitly removed from the disabled map before acquisition resumes.

Final checks cover readable paths, reference closure, script syntax, duplicate Surge script identities, raw archive checksums, and the reversible next-run layout. All code, registry and test changes are prepared before one final Actions publication.

Modified: 2026-11-13 (chance). 原生 Quantumult X 配置在格式有效时保留原文；发布版 JS 同样清除安装配置、使用说明和开发注释，仅保留可执行代码与必要许可声明，不添加 API 运行时或改变作者业务逻辑。原始脚本仍逐字节归档，保留注释、BOM 和换行；发布完整性按同一清理策略与原件比较。API 转换仍仅用于 Loon→QX、Loon→Surge、QX→Surge，不因 API 转换诊断停用原生声明。


## JQ 文件

Modified: 2026-11-14 (chance). Loon `request.json.jq_file`、`response.json.jq_file` 和旧版 `jq-path` 引用解析后，转换器在 `Resource/JQ/<插件ID>/` 生成纯 UTF-8 `.jq` 程序，文件名沿用可读的源资源路径。文件不包含 Loon Action、Shell 命令或目标配置的外层引号，使用官方 `jq --from-file` 和空输入编译验证后，与配置、脚本一起事务提交。源归档保持原样。删除依赖时同步移除本插件过期的 `.jq` 文件。

QX 与 Surge 按用户要求默认支持完整 jq 语言，原生 JQ 输出不限制为 JavaScript 可模拟的固定操作子集。QX 使用官方示例的 `jsonjq-request-body` / `jsonjq-response-body`；Surge 使用 `[Body Rewrite]` 的 `http-request-jq` / `http-response-jq`。配置中的 `# JQ File:` 链接指向本仓库保留的 `.jq` 文件，Actions 读取同一程序生成客户端原生表达式；该注释是资源引用说明，并非客户端运行时远程加载指令。

依据：<https://jqlang.org/manual/#invoking-jq>、<https://nsloon.app/docs/Rewrite/rewrite_v2/>、<https://manual.nssurge.com/http/body-rewrite.html>，以及项目提供的 Quantumult X 官方示例。
