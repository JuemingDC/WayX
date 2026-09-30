# Block 50 — JSON / JQ / Mock

## 50.1 原生 JQ 优先

Loon：
```text
request.json.jq(...)
response.json.jq(...)
request.json.jq_file(...)
response.json.jq_file(...)
```

Quantumult X：
```text
REGEX url jsonjq-request-body 'JQ'
REGEX url jsonjq-response-body 'JQ'
```

Surge：
```ini
[Body Rewrite]
http-request-jq REGEX 'JQ'
http-response-jq REGEX 'JQ'
```

不得把原生 JQ 无理由改写成 JavaScript。

## 50.2 json.delete / json.replace

允许编译为 JQ，但必须保持：
- Key Path
- 数组下标
- JSON 类型
- Action 顺序

不得把 Number/String/Boolean/null/Object/Array 互相改变类型。

## 50.3 jq_file

Loon 官方：
```text
request.json.jq_file(path)
response.json.jq_file(path)
```

转换规则：
1. 转换期读取依赖；
2. 校验依赖；
3. 目标输出真实 JQ；
4. 不把路径字符串当作 JQ 输出。

历史源中若出现：
```text
response.json.jq("jq-path=https://...")
```

这不是 Loon 官方 `jq_file` 语法。WayX 将该 legacy `jq-path=` 写法列为**项目级丢弃项**：不解析、不下载、不缓存、不内联、不生成 helper、也不输出目标规则。只有官方 `request/response.json.jq_file(path)` 进入依赖解析。

## 50.4 response.body.mock / mock_file

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
- dependency 内容只在本次转换进程内 materialize；不写入 `converter/dependencies/` 作为权威副本或 fallback。
- 原始依赖无法读取或无法安全嵌入目标语法时，进入 Review；不得使用仓库缓存替代。

## 50.7 自动转换实现

- JQ normalize/minify：`converter/src/jq.mjs`
- jq_file/mock_file dependency resolution：`converter/src/dependency.mjs`
- QX mock_file helper：`converter/src/qx-mock.mjs`
- Surge request mock helper：`converter/src/surge-mock.mjs`
- QX inline mock/header helpers：`converter/src/qx-semantic-script.mjs`
- Legacy JSON/JQ/mock：`converter/src/legacy-rewrite.mjs`
- Rewrite v2 JSON/JQ/mock planner：`converter/src/rewrite-v2-semantic.mjs`
