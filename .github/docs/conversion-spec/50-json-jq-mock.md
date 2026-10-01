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

多个**不含数组索引**的固定 Key Path 可合并为：

```jq
delpaths([["a","b"], ["c","d"]])
```

只要批量路径中出现数组索引，就必须按源顺序串联 `del(...)`，因为删除数组元素会压缩数组，单个 `delpaths([...])` 的批处理结果可能与 Loon 左到右逐项删除不同。例如删除 `items[0]` 后再删除 `items[1]` 必须保留该顺序。

Number/String/Boolean/null/Object/Array 类型不得互相转换。批量 action 不得排序、去重或重排。

## 50.2.1 Legacy JSON Action

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

这不是 Loon 官方 `jq_file` 语法。WayX 将该 legacy `jq-path=` 写法列为**项目级丢弃项**：不解析、不下载、不缓存、不内联、不生成 helper、也不输出目标规则。只有官方 `request/response.json.jq_file(path)` 进入依赖解析。

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
- 明确空对象/空数组/图片可使用官方 reject-*；
- 任意 response mock/mock_file 使用 WayX helper；
- 使用 QX 官方 `script-echo-response`；
- 若必须等待 request body 才能决定响应，使用 `script-analyze-echo-response`；
- binary 使用官方 `bodyBytes`；
- helper 只实现当前 Mock Action，不修改 Source Script。

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

- `jq_file` / `mock_file` 只从源插件声明或相对源 URL 解析出的原始地址读取；legacy `jq-path=` 不进入依赖流程。
- dependency 内容只在本次转换进程内由 `dependency-materializer.mjs` materialize；不写入 `.github/converter/dependencies/` 作为权威副本或 fallback。
- `dependencySpecFromAction()` 必须保持 target-neutral：只描述原始依赖 URL、kind、phase、status、content-type、base64/binary 等 Loon 源语义；不得提前写入 `qxAction`、Surge section 或 target strategy。目标 action 只能在 `rewrite-qx.mjs` / `rewrite-surge.mjs` 中选择。
- 原始依赖无法读取或无法安全嵌入目标语法时，进入 Review；不得使用仓库缓存替代。

## 50.7 自动转换实现

- JQ normalize/minify：`.github/converter/src/jq.mjs`
- jq_file/mock_file dependency semantics：`.github/converter/src/dependency.mjs`
- jq_file/mock_file discovery + fetch/materialization：`.github/converter/src/dependency-materializer.mjs`
- shared conversion context：`.github/converter/src/conversion-context.mjs`
- QX mock_file helper：`.github/converter/src/qx-mock.mjs`
- Surge request mock helper：`.github/converter/src/surge-mock.mjs`
- QX inline mock/header helpers：`.github/converter/src/qx-semantic-script.mjs`
- Legacy JSON/JQ/mock：`.github/converter/src/legacy-rewrite.mjs`
- Rewrite v2 JSON/JQ/mock planner：`.github/converter/src/rewrite-v2-semantic.mjs`
