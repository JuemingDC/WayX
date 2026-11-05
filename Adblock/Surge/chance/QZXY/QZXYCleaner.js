var url = $request.url;
var body = $response.body;
if (!body) {
    $done({});
}
else {
    try {
        var obj = JSON.parse(body);
        var data = obj && obj.data;
        if (/\/project\/iconSlogan(?:\?|$)/.test(url)) {
            if (data && typeof data === "object" && !Array.isArray(data)) {
                ["front", "wallet", "service", "mine"].forEach(function (key) {
                    if (key in data)
                        data[key] = null;
                });
            }
        }
        else if (url.indexOf("/user/coin/info/withAppAdvChannel") !== -1) {
            if (data && typeof data === "object" && !Array.isArray(data)) {
                data.appAdvChannelList = [];
            }
        }
        else if (url.indexOf("/project/adv/chain/get") !== -1) {
            if (Array.isArray(data))
                obj.data = [];
        }
        else if (url.indexOf("/project/advSpace/app/v2/list") !== -1) {
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
                    if (adKeys[i] in data)
                        data[adKeys[i]] = "";
                }
                if ("commandAdvStr" in data)
                    data.commandAdvStr = "";
                if ("jumpDDLWay" in data)
                    data.jumpDDLWay = 0;
            }
        }
        else if (url.indexOf("/settlement/advertise/freeMeal/activity/index") !== -1) {
            if (data && typeof data === "object" && !Array.isArray(data)) {
                if ("amount" in data)
                    data.amount = 0;
                data.activityList = [];
            }
        }
        else if (url.indexOf("/project/info/triple") !== -1) {
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
                        if (switchKeys[j] in sw)
                            sw[switchKeys[j]] = 0;
                    }
                }
                var cfg = data.clientProjectInfoConfigDTO;
                if (cfg && typeof cfg === "object" && !Array.isArray(cfg)) {
                    if ("appAdvertiseLevel" in cfg)
                        cfg.appAdvertiseLevel = 0;
                    if ("aliXcxAdvertiseLevel" in cfg)
                        cfg.aliXcxAdvertiseLevel = 0;
                    if ("weChatXcxAdvertiseLevel" in cfg)
                        cfg.weChatXcxAdvertiseLevel = 0;
                    if ("taskImg" in cfg)
                        cfg.taskImg = null;
                    if ("thirdChannelLink" in cfg)
                        cfg.thirdChannelLink = null;
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
    }
    catch (e) {
        $done({});
    }
}
