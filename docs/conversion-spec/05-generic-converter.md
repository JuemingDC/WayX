# Block 05 — 通用转换器架构与自动化契约

## 5.1 目标

WayX converter 的目标不是“把若干已知插件转换好”，而是：

> 对任意符合当前 Loon 官方语法、且目标平台存在可证明等价表达的陌生插件，在不增加插件专属代码的前提下，自动生成正确的 Quantumult X snippet 与 Surge module。

插件名、作者、来源仓库、URL 路径、文件名只能用于：
- 下载源文件；
- 生成目标文件名；
- metadata；
- 日志与审计。

这些信息**不得决定 Rule / Rewrite / Mock / Script / MITM 的转换语义**。

禁止在生产 converter 中出现此类逻辑：

```js
if (plugin === "YouTube") ...
if (entry.id === "Bilibili") ...
if (/RuCu6/.test(sourceUrl)) ...
if (/youtube\/response\.js/.test(scriptUrl)) ...
```

测试 fixture 可以使用真实插件名，但测试不能要求生产代码按插件身份分支。

## 5.2 输入模型

converter 输入固定分为两类：

### A. Source Descriptor

只描述资源身份与输出位置，例如：

```json
{
  "id": "Example",
  "file": "example.lpx",
  "source": "https://example.com/example.lpx",
  "qx": "Example.snippet",
  "surge": "Example.sgmodule",
  "category": "去广告"
}
```

Descriptor 不得携带“此插件应该怎样转换”的语义开关。

### B. Source Content

真正决定转换行为的内容：
- header metadata；
- `[Rule]`；
- `[Rewrite]`；
- `[Script]`；
- `[Argument]`；
- `[MITM]`；
- 引用的 JQ / mock file；
- 引用的 Source JavaScript（只读，用于兼容性判断）。

## 5.3 固定处理流水线

每个插件必须经过同一条流水线：

```text
normalize source
→ parse plugin sections
→ build semantic IR / AST
→ Rule converter
→ Rewrite converter
   ├─ legacy rewrite
   └─ Rewrite v2
→ Script declaration converter
→ MITM converter
→ target planner
   ├─ Quantumult X
   └─ Surge
→ validator
→ source/target reconciliation
→ output
```

不得在流水线中插入“按插件名称修补结果”的步骤。

## 5.4 Rule 转换器

`[Rule]` 必须：
1. 解析 Rule Type；
2. 解析参数；
3. 解析 Policy；
4. 对 logical rule 递归生成 AST；
5. 按 Block 20 映射到目标平台。

转换决策只允许依赖：
- Rule Type；
- 参数；
- Policy；
- 目标平台官方能力。

## 5.5 Rewrite 分型

所有 Rewrite 必须先分类，再转换。至少分为：

1. **Reject**
   - reject
   - reject-200
   - reject-dict
   - reject-array
   - reject-img

2. **Redirect / URL Rewrite**
   - 302
   - 307
   - Rewrite v2 redirect

3. **Header Mutation**
   - request header
   - response header
   - add / set / del / replace / regex replace

4. **Body Regex Rewrite**
   - request body
   - response body

5. **JSON / JQ**
   - json delete
   - json replace
   - jq
   - jq_file

6. **Mock / Local Response**
   - mock-response-body
   - response.body.mock
   - response.body.mock_file
   - request body mock 类动作

7. **Script Declaration**
   - legacy http-request/http-response
   - Script v2

8. **Pipeline / Composite**
   - 多 action Rewrite v2
   - 必须保持顺序和终止语义

9. **Unknown**
   - 不静默猜测；
   - 保留原声明并进入 Review。

## 5.6 Target Planner

### Quantumult X

目标 planner 只能输出 Crossutility 官方 sample 已确认的：
- filter；
- rewrite action；
- script action；
- hostname。

QX 的功能最终都落在：
- commented `# [filter_local]`
- commented `# [rewrite_local]`
- commented `# [mitm]`

内部 IR 可以区分 URL/Header/Body/Mock/Script，但最终必须渲染为 QX 官方 snippet 支持的实际语法。

### Surge

目标 planner 必须按 Surge 官方能力分流：
- `[Rule]`
- `[URL Rewrite]`
- `[Header Rewrite]`
- `[Body Rewrite]`
- `[Map Local]`
- `[Script]`
- `[MITM]`

不得把不同语义为了实现方便全部塞进 `[Script]`。

## 5.7 Mock / Map Local 原则

“本地直接返回响应”是一类语义，不等同于普通 URL reject。

Surge 官方存在 `[Map Local]` 时，优先用其原生表达 status/body/header/data-type。

QX 若存在官方等价 `reject-dict/reject-array/reject-img/reject-200`，优先原生；否则仅在规范允许时生成最小 helper。

## 5.8 Script 兼容性

Source JavaScript 的兼容性只能依据**脚本内容和声明本身**判断。

允许检查：
- 是否显式拒绝 Quantumult X；
- 是否使用 `$utils` / `$loon`；
- 是否使用 `$task` / `$prefs` / `$notify`；
- 是否使用 `$httpClient` / `$persistentStore`；
- request / response / body / binary 行为。

禁止：
- 通过 script URL 路径识别某个项目；
- 为某个作者维护 compatibility whitelist；
- 通过插件名强制选择 adapter。

如果源码不可获得、且兼容性无法从声明证明，进入 Review，不假设兼容。

## 5.9 Dependency Resolver

`jq_file`、`mock_file` 等依赖统一经过 dependency resolver：

```text
source action
→ resolve original URL/path
→ fetch original dependency directly
→ validate
→ materialize semantic content in memory
→ target planner
```

禁止在 action converter 内为单个插件写固定依赖内容；禁止把上游 JQ/mock/Source Script 作为 WayX 持久化镜像或 fallback。

## 5.10 自动化契约

GitHub Action 的职责：

1. 从 Source Catalog 获取待处理资源；
2. **只从 descriptor 中的原作者 `source` URL 下载/更新源插件；Catalog 不允许 mirror/fallback 字段；**
3. 对插件声明的 Source Script / JQ / mock dependency，**只访问声明或相对解析得到的原始 URL**；Source Script 仅临时读取用于兼容性判断，不复制到 WayX，不改写目标引用；
4. 对每个资源调用**同一个 generic converter**；
5. 运行 QX / Surge validator；
6. 运行 source/target 对账；
7. Safe Tier 自动提交；
8. Review Tier 开 PR 等待语义审查。

Source Catalog 可以包含具体插件名和原作者 URL，因为它只是数据清单；converter source code 不得根据 Catalog 中的身份字段改变转换算法。

### 5.10.1 原作者源唯一原则

- 插件：只请求 `entry.source`。
- Source Script：只请求插件声明中的 `script-path` / `script("...")` URL。
- 相对 dependency：只按插件原始 URL 解析后直接请求。
- 禁止第三方 GitHub 副本、第三方镜像、备用域名和 fallback 链；若原作者官方 `source` 本身就是 GitHub/GitHub Raw，则该 URL 属于原作者源，可直接使用。
- 原源不可达：本轮失败并进入 Review，不切换副本。
- QX/Surge 中的 Source Script URL 必须继续指向源插件声明的 URL。
- WayX 允许生成自己的 **helper script** 来补足目标平台缺失的 Rewrite/Mock 语义；这种 helper 是 converter 输出，不属于 Source Script 镜像。

## 5.11 陌生插件验收测试

converter 必须具备 identity-invariance 测试：

对于语义内容完全相同、但以下身份字段不同的两个输入：
- id
- name
- author
- source URL
- filename

除 metadata、生成脚本路径和目标文件名外，转换产生的有效 Rule/Rewrite/Script/MITM 语义必须相同。

必须至少维护一组**纯合成陌生插件 fixture**，覆盖：
- Rule；
- reject；
- redirect；
- header；
- body；
- JQ；
- mock / Map Local；
- Script；
- MITM。

这组 fixture 不允许依赖任何真实插件名称。

## 5.12 生产代码审计

CI 必须审计生产 converter，禁止出现已登记插件身份驱动的语义分支。

真实插件可以作为 regression fixture，但新增真实插件不应要求修改 converter；只有出现**新的语法类型或新的目标能力**时，才允许按以下流程修改：

```text
官方依据
→ CONVERSION_SPEC
→ generic parser / semantic converter
→ synthetic tests
→ real-plugin regression
→ canonical output
```

## 5.13 自动转换实现

- Source Catalog schema/validation：`converter/src/source-catalog.mjs`
- Original-source fetch layer：`converter/src/source-fetch.mjs`
- Generic orchestration：`.github/scripts/sync-convert.mjs`
- Offline canonical regeneration：`converter/tools/regenerate-canonical.mjs`
- Identity invariance：`converter/tests/generic-identity.mjs`
- Plugin-identity source audit：`converter/tests/genericity-audit.mjs`
