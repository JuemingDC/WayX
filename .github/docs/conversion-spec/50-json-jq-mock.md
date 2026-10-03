# Block 50 — JSON / JQ / Mock

## 50.1 原生 JQ 优先

Loon：
```text
request.json.jq(...)
response.json.jq(...)
request.json.jq_file(...)
response.json.jq_file(...)
```

Quantumult X 官方 sample 已确认：
```text
REGEX url jsonjq-request-body 'JQ'
REGEX url jsonjq-response-body 'JQ'
```

Surge 官方 Manual 已确认：
```ini
[Body Rewrite]
http-request-jq REGEX 'JQ'
http-response-jq REGEX 'JQ'
```

`request/response.json.jq(...)` 的 JQ 表达式必须按源内容直接迁移，不得为了“统一风格”改写成 `getpath/setpath/delpaths`、JavaScript 或其它等价形式。目标配置只允许执行**语法承载所必需**的处理：外层单引号安全转义、目标单行声明所需的空白处理；不得改变 JQ 的运算顺序、管道结构、赋值/update 形式或过滤逻辑。

`jq_file` 因目标 QX/Surge 都以内联单行 JQ 声明承载，允许在转换期删除 JQ 文件的非字符串 `#` 注释并压缩不影响语义的空白，再以内联 JQ 输出；这属于配置承载压缩，不属于表达式重写。

## 50.2 json.add / json.replace / json.delete

WayX 对 Loon Key Path JSON Action 采用项目选定的 Stash-compatible 行为基准，并统一映射到 QX/Surge 原生 JQ。必须保持 Key Path、数组下标、JSON 类型、批量参数配对和源执行顺序。

### add

目标路径当前值为 `null` 或路径不存在（`getpath(PATH) == null`）时写入；其它已有值，包括 `false`、`0`、空字符串、空数组和空对象，都不得覆盖：

```jq
if getpath(PATH) == null then setpath(PATH; VALUE) else . end
```

### replace

只有 `getpath(PATH)` 为 jq truthy 时才替换，因此路径不存在、`null`、`false` 均保持不变；`0`、空字符串、空数组和空对象仍可替换：

```jq
if getpath(PATH) then setpath(PATH; VALUE) else . end
```

不得退化成裸 `setpath(PATH; VALUE)`，否则会把不存在路径创建出来并扩大源语义。

### delete

`delete` 不增加 `getpath` guard。固定单路径优先直接：

```jq
del(.a.b)
```

多个**不含数组索引**的固定 Key Path 直接合并到同一个 jq `del(path_expression)`，用 comma expression 产生多个路径：

```jq
del(.a.b, .c.d)
```

不得为这类普通 Key Path 生成 `delpaths([...])`；`del(...)` 更贴近源 `json.delete([...])`，也避免不必要地把路径改写成 Path Array。

只要批量路径中出现数组索引，就必须按源顺序串联多个 `del(...)`，因为删除数组元素会压缩数组；一次 `del(.[1], .[2])` 会基于同一原输入选择两个路径，而 `del(.[1]) | del(.[2])` 会让第二次删除作用于第一次删除后的数组。WayX 以 Loon 批量参数左到右执行语义为准，因此数组索引路径不得合并到一个 `del(...)`。

### delpaths 使用边界

jq 官方将 `delpaths(PATHS)` 定义为 Path Array API：`PATHS` 必须是“路径数组组成的数组”，每条路径由字符串键和/或数字索引组成。它不是 WayX 对普通 Loon Key Path 批量 delete 的默认生成形式。

WayX 只允许在以下场景使用 `delpaths`：
1. 源作者的 `request/response.json.jq(...)` 本身包含 `delpaths(...)`，目标原生 JQ 直接保留；
2. 官方 `json.jq_file(...)` 的文件内容本身包含 `delpaths(...)`，转换期只做注释删除/空白压缩后原样内联；
3. 未来若 target-neutral IR 明确承载“Path Array 集合”且源语义就是一次性 Path Array 删除，可由专门 renderer 使用 `delpaths`，但必须有单独规范与回归测试。

WayX 禁止：
- 把 Loon `json.delete("a.b")` 或 `json.delete(["a.b","c.d"])` 自动改写成 `delpaths([...])`；
- 用 `delpaths` 代替包含数组索引且要求左到右执行的批量 delete；
- 为代码风格统一而把源作者的 `del(...)` 改成 `delpaths(...)`，或反向改写源作者的 `delpaths(...)`。

Number/String/Boolean/null/Object/Array 类型不得互相转换。批量 action 不得排序、去重或重排。

## 50.2.1 Quantumult X 多 Action 原生 JQ 合并

QX 官方 sample 已确认单条 Rewrite 可以使用 `jsonjq-request-body` / `jsonjq-response-body` 承载一个 JQ 表达式。WayX 因此允许把**同一条** Loon Rewrite v2 JSON pipeline 合成一条 native JQ，但当前只开放可证明等价的保守子集：

- 至少两个 action，且全部为同 phase 的 `json.add / json.replace / json.delete`；
- source condition 必须通过 QX exact matcher，不允许只取 prefilter；
- Key Path 必须是固定的顶层对象 key，例如 `"flag"`；`"data.flag"`、`"items[0]"` 等嵌套/数组路径继续使用 helper；
- value 必须能静态编码为 JSON；capture / Plugin Argument / runtime variable 不进入 native path；
- batch 与 action 全部按源顺序逐项展开后串联，禁止排序、去重或跨 action 合并。

为保留 Loon pipeline 的 action-level failure 边界，生成的每一个 top-level 操作都必须对非 object JSON root 安全 no-op，例如：

```jq
if type == "object" then
  if getpath(["flag"]) == null then setpath(["flag"]; true) else . end
else . end
```

delete 对称生成：

```jq
if type == "object" then del(.["old"]) else . end
```

该路径不得引入 `try/catch` 作为兼容假设，也不得生成 `delpaths`。任一 action 超出上述 subset 时，**整个** source pipeline 回退到现有 full-condition helper；禁止只 native 化其中一部分。

## 50.2.2 Legacy JSON Action

旧版 `request/response-body-json-add|replace|del` 与 Rewrite v2 使用同一组语义和同一 native-JQ 优先策略，不再为可直接表达的 legacy `json-add` 生成 JS helper。对可证明的标量值直接生成上述 JQ；无法无损解析的 legacy object/array value 进入 Review，不猜测类型。

## 50.3 jq_file

Loon 官方：
```text
request.json.jq_file(path)
response.json.jq_file(path)
```

转换规则：
1. 转换期只从源插件声明的绝对 URL 或相对源插件 URL 读取依赖；
2. 校验依赖可读取且可安全压缩为单行 JQ；
3. 只删除非字符串注释并压缩语法空白，不做 AST/代数重写；
4. 以内联后的真实 JQ 输出到 QX `jsonjq-*-body` / Surge `http-*-jq`；
5. 不把路径字符串本身当作 JQ 输出。

历史源中若出现：
```text
response.json.jq("jq-path=https://...")
```

这不是 Loon 官方 `jq_file` 语法，但真实上游仍存在该 historical alias。WayX 从 2026-10-03 起**不再丢弃** `jq-path=`，而是把它作为兼容依赖引用处理：

1. 同时识别 Rewrite v2 的 `request/response.json.jq("jq-path=...")` 与 Legacy `request/response-body-json-jq jq-path=...`；
2. 绝对 HTTP(S) URL 原样读取；相对路径只相对于源 Plugin URL 解析，禁止镜像/fallback；
3. 读取后按 `jq_file` 相同规则删除非字符串注释并压缩无语义空白；
4. QX 使用 `jsonjq-request-body/jsonjq-response-body` 内联真实 JQ，Surge 使用 `http-request-jq/http-response-jq` 内联真实 JQ；
5. 目标输出不得残留 `jq-path=` 字符串，也不得把路径本身误当成 JQ；
6. 依赖无法获取、内容为空或不能证明安全承载时必须 Review，禁止静默删除规则。

`jq_file` 与 historical `jq-path=` 的目标策略固定为 **inline-only**：读取原作者依赖后，只允许写入 QX `jsonjq-request-body/jsonjq-response-body` 或 Surge `http-request-jq/http-response-jq`。禁止生成 `script-request/response-body`、`script-path=` 或任何 JQ helper；依赖无法读取、内容为空、目标引号/单行承载不安全或其它原因导致不能内联时，直接注释保留源声明并输出 Review。不得把 JQ 翻译成 JavaScript。

## 50.4 response.body.mock / mock_file

旧版 `mock-response-body` 与新版 `response.body.mock` 共用同一目标语义。内联 `data="..."` 允许包含 JSON 自身的双引号，解析必须以其后的 `status-code / data-path / mock-data-is-base64` 属性边界（或行尾最终引号）确定内容范围，禁止按第一个内部引号截断 Body。


### Surge
`response.body.mock` / `response.body.mock_file` 优先 `[Map Local]`：
- inline mock 使用 `text/base64`；
- `mock_file` 使用官方 `data-type=file`，`data` 可为解析后的文件 URL；
- Base64 文件可在转换期物化后使用 `data-type=base64`；
- 保持 status、Content-Type 与可静态表达的 response header 行为；
- Map Local 仍无法保持的条件/动作先尝试 HTTP helper，再注释 Review。

### Quantumult X

按目标能力分层，原生优先但不伪造本地资源：

1. 明确空对象/空数组/1px 图片等与官方 reject primitive 完全一致的响应，优先 `reject-dict / reject-array / reject-img`；
2. `echo-response` 是 QX 原生静态响应类型，可处理简单 text/html 等 Content Type，并可在 Content Type 字段后附加静态 Header；**Resource Path 只能引用 “On My iPhone - Quantumult X - Data” 中已经存在的本机文件**；
3. WayX 的远程 snippet 无法替用户把文件安装到 QX Data，因此远程 URL、Plugin 相对 `mock_file`、转换期下载的文件以及 inline body 都不得冒充本地 `echo-response`。这类内容先在转换期物化，再生成最小 `script-echo-response` helper，把真实 body/header/status 内联进脚本；
4. 只有目标上下文明示“该 Resource Path 已在 QX Data 本机存在”时，才允许直接输出 `echo-response <content-type/headers> echo-response <local-path>`；当前 Catalog Loon source 不提供这种 QX 本机资产声明，因此生产转换默认不会从 `mock_file` 自动选择 native echo；
5. 若必须等待 request body 才能决定 synthetic response，使用 `script-analyze-echo-response`；
6. binary helper 使用官方 `bodyBytes`；
7. helper 只实现当前 Mock Action，不修改 Source Script。

Validator 必须拒绝把 `http://`、`https://`、其它 URL scheme、绝对路径或 `..` 路径写进 native `echo-response` 的 Resource Path。

## 50.5 request.body.mock / mock_file

旧版 `mock-request-body` 同样先归一化为 request mock 语义；QX 使用 `script-request-body` helper，Surge 使用 `http-request` helper。不能用 Map Local 替代 request mock，因为 Map Local 生成的是响应而不是修改上游请求。


### QX
- 文本/JSON请求 body：`script-request-body` helper；
- binary request 若 bodyBytes 路径未由官方示例与测试确认 → Review。

### Surge
- `request.body.mock/mock_file` 不能用 Map Local 冒充 response mock；
- 统一使用最小 `http-request` helper 修改 request body；
- 文件内容在转换期从原始依赖 URL 物化后嵌入 helper；
- binary/base64 使用 Surge 官方 `binary-body-mode=true` 与 `Uint8Array`；
- helper 仍无法保持时注释 Review。

## 50.6 原始依赖读取原则

- `jq_file` / `mock_file` / historical `jq-path=` 都只从源插件声明或相对源 URL 解析出的原始地址读取；不得因 legacy alias 使用镜像/fallback。
- dependency 内容只在本次转换进程内由 `dependency-materializer.mjs` materialize；不写入 `.github/converter/dependencies/` 作为权威副本或 fallback。
- `dependencySpecFromAction()` 必须保持 target-neutral：只描述原始依赖 URL、kind、phase、status、content-type、base64/binary 等 Loon 源语义；不得提前写入 `qxAction`、Surge section 或 target strategy。目标 action 只能在 `rewrite-qx.mjs` / `rewrite-surge.mjs` 中选择。
- 原始依赖无法读取或无法安全嵌入目标语法时，进入 Review 并注释保留源声明；其中 `jq_file` / `jq-path=` 不允许 Script fallback，不得使用仓库缓存替代。

## 50.7 自动转换实现

- JQ normalize/minify：`.github/converter/src/jq.mjs`
- jq_file/jq-path/mock_file dependency semantics：`.github/converter/src/dependency.mjs`
- jq_file/jq-path/mock_file discovery + fetch/materialization：`.github/converter/src/dependency-materializer.mjs`
- shared conversion context：`.github/converter/src/conversion-context.mjs`
- QX mock_file helper：`.github/converter/src/qx-mock.mjs`
- Surge request mock helper：`.github/converter/src/surge-mock.mjs`
- QX inline mock/header helpers：`.github/converter/src/qx-semantic-script.mjs`
- Legacy JSON/JQ/mock：`.github/converter/src/legacy-rewrite.mjs`
- Rewrite v2 JSON/JQ/mock planner：`.github/converter/src/rewrite-v2-semantic.mjs`
