# Conversion Policy

版本：2.0  
作者：chance  
更新时间：2026-09-28

## 目录规则

1. `Adblock/`
   - 去广告、推广移除、界面净化、HTTPDNS 屏蔽。
   - 对应的 Quantumult X snippet 与 Surge sgmodule 保留在这里。

2. `module/`
   - 只放非去广告类的 `.snippet` 与 `.sgmodule`。
   - 不放 JavaScript、JSON 或独立 rule 文件。

3. `script/`
   - 所有 JavaScript 统一放这里。
   - 包括模块配套脚本和单脚本。
   - 模块通过 raw URL 引用对应 `script/` 路径。

4. `rule/`
   - 独立规则集。

5. `boxjs/`
   - BoxJs JSON 配置。

## 转换规则

> Loon 3.5.x 新语法（`request/response if ${url} ~= ... then ...`、`response.json.*`、`script(...) with`、`[Argument]` 等）必须同时遵循 [`LOON_NEW_SYNTAX_CONVERSION.md`](./LOON_NEW_SYNTAX_CONVERSION.md)。该文件优先定义新语法的目标平台等价行为与不可转换处理。

1. **机制对应优先**
   - jq → jq
   - JavaScript → JavaScript
   - Rewrite → Rewrite
   - Rule / Filter → Rule / Filter
   - Header Rewrite → Header Rewrite
   - 本地 mock/reject → 目标平台等价本地响应

2. **语义保持**
   - 不因为另一种写法更短就改变原规则的处理阶段、返回结构或匹配范围。
   - 不把精确字段删除改为关键词模糊删除。
   - 不把原脚本逻辑改写成 jq，除非原平台本身就是 jq/结构化 JSON 操作且目标平台有等价 jq。
   - 不扩大 MITM hostname、Rule 域名或正则匹配范围。

3. **脚本处理**
   - 自动转换只处理 **Script 声明**，不改写、包装、fork 原始 JavaScript 正文。
   - 原脚本已经支持目标平台时直接复用；若脚本明确拒绝目标平台、使用目标平台不存在的 API，或兼容性无法证明，则在目标配置中注释掉该 Script 声明并说明原因。
   - 不得为了消除 `$argument`、动态 `enable`、运行时 API 差异而偷偷生成“兼容 fork”去改变原脚本行为。
   - 由 Rewrite / Mock / Header 等**非源 Script 动作**为了保持目标平台等价行为而生成的短 helper script，可以放入 `script/`；这类 helper 不得冒充或替换原作者 Script 正文。
   - JavaScript 文件统一放入 `script/`，不放入 `module/`。

4. **注释**
   - 原注释尽量完整保留。
   - 新增 Author: chance、Converted、Category、Target、Source。
   - Quantumult X snippet 的 filter/rewrite/mitm 分段标题注释化。

5. **验证**
   - Surge：对照 Surge 官方文档与当前官方语法。
   - Quantumult X：对照项目内官方 sample 配置。
   - 转换后检查正则、响应类型、MITM、脚本路径及 Rule 行为。


## Reject / 状态码规则

**状态码不是转换动作的首要判定指标。** 优先保持处理阶段、动作语义、Body 类型、匹配范围和副作用。

- Loon `reject_dict(status)` → QX `reject-dict`，不得因为 `status=200` 变成 `reject-200`。
- `reject_array(status)` → QX `reject-array`。
- `reject_img(status)` → QX `reject-img`。
- 普通 Loon Rewrite `reject(status)` → QX 一般 `reject` 语义；不得仅为精确复刻数字状态码生成 helper script。
- 自定义 Body、binary/base64、Header + Body pipeline 属于 Review Tier。
- WayX 对 Loon `[Rule] URL-REGEX, "REGEX", REJECT` 的固定 QX 映射是 `REGEX url reject-200`。这是 URL-REGEX Rule 的项目映射，不能反推成“凡是 200 都使用 reject-200”。

Surge 普通拒绝优先使用官方 URL Rewrite 的 `reject`；只有确实需要静态 Body / Content-Type / 本地 mock 时才使用官方 Map Local 能力。

## Quantumult X 固定约束

- 以 Crossutility 官方 `Quantumult-X` 仓库的 sample / rewrite 示例以及项目上传的官方 sample 为可执行语法依据。
- snippet 分段必须注释：`# [filter_local]`、`# [rewrite_local]`、`# [mitm]`。
- URL Rewrite 使用官方示例的 bare-regex 风格；不得把 Loon `/i` 展开成 `[hH][tT]...`，也不得发明官方 sample 未确认的 `(?i)`。
- 若源 regex flag 对实际匹配语义不可忽略而目标声明又无官方表达方式，则进入 Review；不得把近似结果标成“无损”。
- QX IP 类规则（至少 `ip-cidr`、`ip6-cidr`，以及转换器处理的 `geoip`、`ip-asn`）必须去掉 `no-resolve`。
- 最终只输出官方 sample 已确认的字段与动作。
- 不允许把 Loon / Surge / Egern 私有关键字作为 QX 可执行行输出。

## Surge 固定约束

- 转换或验证前先查 `https://nssurge.com/llms.txt` 并按其指引核对当前 Surge Manual。
- Surge IP 类规则不套用 QX 的 `no-resolve` 删除规则；源中合法的 `no-resolve` 按语义保留。
- Surge Module metadata 只使用官方文档确认的 `#!name`、`#!desc`、`#!system=mac`、`#!arguments`、`#!arguments-desc`、`#!requirement`；作者、分类、日期等保存为普通 `#` 注释。
- Module `[Rule]` 的 policy 仅允许官方规定的 `DIRECT / REJECT / REJECT-TINYGIF`；普通 Profile 支持的 `REJECT-DROP / REJECT-NO-DROP` 不得原样塞入 Module，也不得有损改成 `REJECT`。
- 使用 Body Rewrite 或 inline Map Local 的 Module 必须声明相应 Core requirement。
- 自动生成 Module 的 `[MITM]` hostname 使用 `%APPEND%`，不得覆盖主配置。
- 只使用官方支持 section 与 action；不确定时进入 Work。

## GitHub Actions 自动化边界

自动化采用 **fail-closed**：能证明是确定、无损映射的变化才允许 Actions 直接写 main。

### Safe Tier：Actions 可直接新增 / 删除 / 同步

在 converter 与 validator 均通过时：
- DOMAIN / DOMAIN-SUFFIX / DOMAIN-KEYWORD / DOMAIN-WILDCARD；
- IP-CIDR / IP-CIDR6 / GEOIP / IP-ASN（QX 去 `no-resolve`，Surge 保留）；
- USER-AGENT；
- DIRECT / REJECT / PROXY 的基础策略映射；
- Loon URL-REGEX + REJECT → QX `url reject-200` 的固定映射；
- 原生 `reject / reject-200 / reject-img / reject-dict / reject-array`；
- Loon Rewrite v2 的严格 Safe 子集：`request if ${url} ~= /REGEX/ then reject(status) / reject_dict(status) / reject_array(status) / reject_img(status)`；仅允许无 regex flag、无附加条件、无 `as`、无 pipeline、无自定义 Body。该子集按动作/Body 语义映射，`reject(200)` 仍是普通 `reject`，不会机械转成 `reject-200`；
- 302 / 307；
- 转换器已明确覆盖且可无损表达的简单 JSON JQ delete / replace / jq；
- 纯 hostname MITM 列表，禁止自动扩大 wildcard；
- 注释、转换日期等元数据。

Safe Tier 的新增和删除必须通过 **重新解析源文件并完整生成目标文件** 完成，保持源顺序；不得猜测插入位置或在目标文件末尾机械追加。

### Review Tier：必须交给 ChatGPT Work

以下任一出现时不得自动合并：
- JavaScript 内容变化；
- `[Script]` / `[Argument]` 变化；
- Loon 新 Rewrite 中 converter 未明确覆盖的 action；
- AND / OR / NOT、复杂条件、pipeline；
- 自定义 Body、binary/base64、Header + Body 联动；
- 需要新增 helper script；
- 目标平台没有官方确认的等价动作；
- 生成结果含 `UNSUPPORTED` / `MANUAL PORT REQUIRED` / 非无损提示；
- converter 或 validator 失败；
- Surge / Egern 官方规范变化可能影响当前输出；
- QX 官方 sample / parser 变化可能影响当前输出；
- 无法确认新增/删除后的顺序语义。

### 自动验证门槛

直接写 main 前至少必须满足：
1. QX 可执行类型 / Rewrite action 在项目 allowlist 中；
2. QX 三个 snippet section 标题均注释化；
3. QX IP 类规则不含 `no-resolve`；
4. Surge section 合法，MITM 使用 `%APPEND%`；
5. `Converted / Converted by chance / Category / Target / Source` 元数据完整；
6. 无待审查标记；
7. JavaScript 未发生变化；
8. Source → Target 的增删来自确定映射；
9. 没有向历史 `Adblock/` 目录继续写新结果；
10. validator 返回 0。

任意一项不满足：创建 `work-review` PR，不直接写 main。

## Work 完成与清理

- Work 只修改 `work/upstream-*` PR 分支，不直接写 main。
- 全部验证通过 → 添加 `work-complete`。
- 确认上游变化不应采用 → 添加 `work-reject`。
- 不确定 → 两个标签都不加，保留 PR 等待确认。
- `work-complete` → Actions squash merge 并删除临时分支。
- `work-reject` → Actions 关闭 PR、不合并并删除临时分支。
- GitHub PR 历史不能真正删除；临时 branch、runtime report、无效中间文件必须自动清理。

## 目录迁移约束

自动化只向现代目录写入：

`Adblock/Quantumult X/` 与 `Adblock/Surge/`。

旧小写 `adblock/` 已废弃并删除；自动化不得重新创建。
