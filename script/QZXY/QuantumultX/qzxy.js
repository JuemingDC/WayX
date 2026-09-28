/*
 * Name: 趣智校园首页净化
 * Author: chance
 * Category: 去广告 / 响应体净化
 * Converted: 2026-09-22
 * Target: Quantumult X
 * Source: https://raw.githubusercontent.com/JuemingDC/QuantumultX/main/Rewrite/qzxy.snippet
 * Basis: quantumult-x-2026-09-15-160818.har
 *
 * 设计原则：
 * 1. jq 能安全处理的专用广告接口不进入本脚本；
 * 2. 本脚本只处理“核心业务响应中混有广告字段”的接口；
 * 3. 修改前校验响应结构，字段不存在时保持原响应，降低误杀风险。
 */

let body = $response.body;

try {
  const obj = JSON.parse(body);
  const url = $request.url || "";

  const isObject = (v) =>
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v);

  const has = (o, k) =>
    isObject(o) &&
    Object.prototype.hasOwnProperty.call(o, k);

  /*
   * /project/info/triple
   *
   * 该接口同时承载学校、支付、维修等核心项目配置。
   * 因此不能粗暴重构 data，也不修改含义较宽的非广告字段。
   *
   * 仅处理：
   * - appAdvertiseSwitch
   * - screenAdvertisingSwitch
   * - jobAdvertisingSwitch
   * - appAdvertiseLevel
   * - taskImg
   * - taskAdvertiseProjectBlackList
   */
  if (
    /\/project\/info\/triple(?:\?|$)/.test(url) &&
    isObject(obj.data)
  ) {
    const data = obj.data;
    const switches = data.clientProjectInfoSwitchDTO;
    const config = data.clientProjectInfoConfigDTO;

    if (isObject(switches)) {
      [
        "appAdvertiseSwitch",
        "screenAdvertisingSwitch",
        "jobAdvertisingSwitch"
      ].forEach((key) => {
        if (has(switches, key)) {
          switches[key] = 0;
        }
      });
    }

    if (isObject(config)) {
      if (has(config, "appAdvertiseLevel")) {
        config.appAdvertiseLevel = 0;
      }

      if (has(config, "taskImg")) {
        config.taskImg = null;
      }

      /*
       * 保留服务端现有黑名单，只追加当前 projectId。
       *
       * 例如：
       * 原始：
       * 3170,3454
       *
       * 当前 projectId：
       * 3118
       *
       * 修改后：
       * 3170,3454,3118
       *
       * 不直接写死黑名单，避免覆盖服务端以后新增的项目。
       */
      if (
        has(config, "taskAdvertiseProjectBlackList") &&
        data.projectId != null
      ) {
        const projectId = String(data.projectId).trim();
        const raw = config.taskAdvertiseProjectBlackList;

        if (projectId) {
          if (typeof raw === "string") {
            const list = raw
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean);

            if (!list.includes(projectId)) {
              list.push(projectId);
            }

            config.taskAdvertiseProjectBlackList =
              list.join(",");
          } else if (raw == null) {
            config.taskAdvertiseProjectBlackList =
              projectId;
          }
        }
      }
    }
  }

  /*
   * /user/coin/info/withAppAdvChannel
   *
   * 该接口同时包含：
   * - coinInfo
   * - appAdvChannelList
   *
   * 截图中圈出的：
   * - 每天赚（省）点零花钱
   * - 可提现金
   * - 超值购物
   * - 霸王餐
   * - 小说
   * - 任务赚现金
   * - 看视频赚现金
   * - 抖音直播
   * - 闪购外卖券
   * - 28 元红包
   * - 外卖券
   * - 学生享好价
   *
   * 均位于这一整块首页商业模块中。
   *
   * 不能只清空 appAdvChannelList：
   * 这样仍可能保留 coinInfo 对应的
   * “每天赚零花钱 / 可提现金”父级 UI。
   *
   * 但也不能无条件 data = null。
   * 只有当当前 HAR 已确认的结构同时存在时，
   * 才隐藏整个模块。
   *
   * 如果服务端未来改版：
   * - coinInfo 不存在
   * - appAdvChannelList 不存在
   * - 字段类型改变
   *
   * 则保持原响应，避免误杀其他功能。
   */
  if (
    /\/user\/coin\/info\/withAppAdvChannel(?:\?|$)/.test(url) &&
    isObject(obj.data)
  ) {
    const data = obj.data;

    const matchedCurrentShape =
      has(data, "coinInfo") &&
      isObject(data.coinInfo) &&
      has(data, "appAdvChannelList") &&
      Array.isArray(data.appAdvChannelList);

    if (matchedCurrentShape) {
      obj.data = null;
    }
  }

  body = JSON.stringify(obj);
} catch (_) {
  /*
   * 非 JSON、空响应或服务端响应结构异常时：
   * 不修改 body。
   *
   * 这样即使接口临时返回：
   * - HTML
   * - 网关错误
   * - 空字符串
   * - 非标准 JSON
   *
   * 也不会因为脚本解析失败导致 APP 请求进一步异常。
   */
}

$done(body);