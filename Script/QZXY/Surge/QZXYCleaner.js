/*
 * name: 趣智校园净化
 * author: chance
 * category: 广告净化 / 应用精简
 * converted: 2026-09-27
 * updated: 2026-09-27
 * target: Surge
 * source: 趣智校园冷启动 HAR（2026-09-27）
 *
 * 稳定版：
 * - 严格保留服务端 JSON 数据类型与层级，避免 App 因强制解包/类型断言闪退
 * - 清空推广频道、广告链、广告位与返现活动
 * - 关闭广告相关开关
 * - 将当前项目加入 taskAdvertiseProjectBlackList
 * - 不修改登录、校园项目、钱包、充值/退款、报修、扫码用水等核心接口
 */

var url = $request.url;
var body = $response.body;

if (!body) {
  $done({});
} else {
  try {
    var obj = JSON.parse(body);
    var data = obj && obj.data;

    if (url.indexOf("/user/coin/info/withAppAdvChannel") !== -1) {
      // 必须保留 data 与 coinInfo 对象；直接设为 null 会导致当前 iOS 客户端冷启动闪退。
      if (data && typeof data === "object" && !Array.isArray(data)) {
        data.appAdvChannelList = [];
      }
    } else if (url.indexOf("/project/adv/chain/get") !== -1) {
      obj.data = [];
    } else if (url.indexOf("/project/advSpace/app/v2/list") !== -1) {
      // 保留原对象结构，只清除广告字段。
      if (data && typeof data === "object" && !Array.isArray(data)) {
        var adKeys = [
          "openAdvId",
          "cutAdvId",
          "nativeAdvId",
          "feedAdvId",
          "feedGroupAdvId",
          "jutuiIconAdvId",
          "jutuiFloatAdvId",
          "jutuiTextLinkAdvId",
          "yifanTextLinkAdvId"
        ];

        for (var i = 0; i < adKeys.length; i++) {
          if (adKeys[i] in data) data[adKeys[i]] = "";
        }

        if ("commandAdvStr" in data) data.commandAdvStr = "";
        if ("jumpDDLWay" in data) data.jumpDDLWay = 0;
      }
    } else if (url.indexOf("/settlement/advertise/freeMeal/activity/index") !== -1) {
      // 保留对象结构，避免客户端对 data.amount / activityList 强制读取时崩溃。
      if (data && typeof data === "object" && !Array.isArray(data)) {
        if ("amount" in data) data.amount = 0;
        data.activityList = [];
      }
    } else if (url.indexOf("/project/info/triple") !== -1) {
      if (data && typeof data === "object" && !Array.isArray(data)) {
        var sw = data.clientProjectInfoSwitchDTO;
        if (sw && typeof sw === "object" && !Array.isArray(sw)) {
          var switchKeys = [
            "screenAdvertisingSwitch",
            "appAdvertiseSwitch",
            "aliXcxAdvertiseSwitch",
            "weChatXcxAdvertiseSwitch",
            "jobAdvertisingSwitch"
          ];

          for (var j = 0; j < switchKeys.length; j++) {
            if (switchKeys[j] in sw) sw[switchKeys[j]] = 0;
          }
        }

        var cfg = data.clientProjectInfoConfigDTO;
        if (cfg && typeof cfg === "object" && !Array.isArray(cfg)) {
          if ("appAdvertiseLevel" in cfg) cfg.appAdvertiseLevel = 0;
          if ("aliXcxAdvertiseLevel" in cfg) cfg.aliXcxAdvertiseLevel = 0;
          if ("weChatXcxAdvertiseLevel" in cfg) cfg.weChatXcxAdvertiseLevel = 0;
          if ("taskImg" in cfg) cfg.taskImg = null;
          if ("thirdChannelLink" in cfg) cfg.thirdChannelLink = null;

          // 冷启动 HAR 中当前项目为 3118。
          // 保留原字段类型（逗号分隔字符串），仅追加当前项目 ID。
          if ("taskAdvertiseProjectBlackList" in cfg) {
            var projectId = String(data.projectId || "");
            var ids = String(cfg.taskAdvertiseProjectBlackList || "")
              .split(",")
              .map(function (v) { return v.trim(); })
              .filter(Boolean);

            if (projectId && ids.indexOf(projectId) === -1) {
              ids.push(projectId);
            }

            cfg.taskAdvertiseProjectBlackList = ids.join(",");
          }
        }
      }
    }

    $done({ body: JSON.stringify(obj) });
  } catch (e) {
    // 解析异常时完全透传原响应。
    $done({});
  }
}
