# Block 80 — Review / Validation / Golden

## 80.1 Review 条件

出现以下任一项必须 Review：
- 目标官方资料没有对应语法
- 必须删除源条件才能转换
- 必须扩大 regex/domain
- 必须修改 Source JavaScript
- typed `$argument` 需要 wrapper
- dynamic enable 无目标声明能力
- pipeline 无法保持顺序
- binary request body 无已验证路径
- regex flag 对实际行为明显关键但目标无官方表达
- Surge Module 需要用户 policy group
- QX 需要官方 sample 未出现的 filter/action
- JQ 依赖无法物化
- mock_file 依赖缺失
- Script compatibility 不确定

格式：
```text
# [WayX] REVIEW REQUIRED:
# Source declaration: ...
# Reason: ...
```

原规则不能静默删除。

## 80.2 Source 对账

必须满足：
```text
Target 已转换语义项
+ 明确 Review 语义项
= Source 有效语义项
```

不允许静默丢行。

## 80.3 Quantumult X Validator

必须检查：
- 只使用 Crossutility 官方 sample 已确认 filter/action；
- section 标题全部注释化；
- snippet 头部不存在活动 `#!...` 来源 metadata；
- 无 `[hH][tT][tT][pP]` 自动 case-fold；
- 无未经官方确认的 `(?i)`；
- QX IP filter 不含 `no-resolve`；
- 无 Loon/Surge 私有 action；
- 无活动 `jq-path=`；
- Script action 与脚本行为匹配。

## 80.4 Surge Validator

必须检查：
- sgmodule metadata 合法
- section 合法
- Rule type 属于当前官方 Rule Type
- Logical Rule 递归合法
- Module policy 仅使用当前官方资料或当前 Surge App 运行时已直接验证的内建值；未知/用户 policy group 不作为活动 Rule
- 外部 policy 不作为活动 Module Rule
- URL/Header/Body/Map Local/Script 参数合法
- 自动转换生成的 MITM hostname 使用 `%APPEND%`；validator 同时接受官方合法的 hostname override
- 不存在来源插件专属活动 metadata
- 不存在来源平台 Rewrite v2 行

## 80.5 Golden

Golden 只锁**已经人工审过的结果**，不能定义规范。

若 Golden 与本规范冲突：
**修改 Golden / output，不修改规范去迁就旧 Golden。**
