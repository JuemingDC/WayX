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

部分现有源插件存在：
```text
response.json.jq("jq-path=https://...")
```

这**不是 Loon 官方 jq_file 语法**，WayX 仅把固定 `jq-path=https://...` 作为 legacy dependency alias 处理：

- URL 必须是声明中直接给出的 HTTP(S) 原始依赖地址；
- 转换期直接读取该原始地址，不要求插件身份登记，不使用 dependency manifest、仓库缓存或 fallback；
- 读取后按真实 JQ 内容校验/规范化并内联目标；
- URL 无效、不可达或内容无法安全内联时 Review；
- 活动目标规则中禁止残留 `jq-path=`。

## 50.4 response.body.mock / mock_file

### Surge
优先 `[Map Local]`，保持：
- status
- Content-Type
- text/json/binary/base64 类型
- pipeline 中的 response header 行为

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
- 不得使用 Map Local 假装 request body rewrite；
- 当前 generic planner 尚未实现 request.body.mock / mock_file 的 Surge request-body helper；
- 因此无法由当前原生 Body Rewrite 精确表达时进入 Review，不伪造 helper 能力；
- 后续若新增 generic helper，必须先补官方运行时依据、synthetic fixture 与 validator。

## 50.6 原始依赖读取原则

- `jq_file` / `jq-path` / `mock_file` 只从源插件声明或相对源 URL 解析出的原始地址读取。
- dependency 内容只在本次转换进程内 materialize；不写入 `converter/dependencies/` 作为权威副本或 fallback。
- 原始依赖无法读取或无法安全嵌入目标语法时，进入 Review；不得使用仓库缓存替代。

## 50.7 自动转换实现

- JQ normalize/minify：`converter/src/jq.mjs`
- jq_file/mock_file dependency resolution：`converter/src/dependency.mjs`
- QX mock_file helper：`converter/src/qx-mock.mjs`
- QX inline mock/header helpers：`converter/src/qx-semantic-script.mjs`
- Legacy JSON/JQ/mock：`converter/src/legacy-rewrite.mjs`
- Rewrite v2 JSON/JQ/mock planner：`converter/src/rewrite-v2-semantic.mjs`
