const url = $request.url;
if (!$response.body)
    $done({});
let obj = JSON.parse($response.body);
if (url.indexOf("/homePage/getHomePageInfo") != -1) {
    const moduleIdForApp = [
        51,
        53,
        87,
        129,
        119,
    ];
    const moduleIdForApplet = [
        51,
        53,
        87,
        120,
        119,
    ];
    if (obj.data?.cmsInfo?.cmsList?.length > 0) {
        if (url.indexOf("cl-homepage-service") != -1) {
            obj.data.cmsInfo.cmsList = obj.data.cmsInfo.cmsList.filter(item => moduleIdForApp.includes(item.moduleId));
        }
        else if (url.indexOf("cl-common-api") != -1) {
            obj.data.cmsInfo.cmsList = obj.data.cmsInfo.cmsList.filter(item => moduleIdForApplet.includes(item.moduleId));
        }
    }
    if (obj.data?.cmsInfo?.otherList?.length > 0) {
        obj.data.cmsInfo.otherList = [];
    }
    if (obj.data?.cmsAggregationResp) {
        delete obj.data.cmsAggregationResp;
    }
}
else if (url.indexOf("/personalCenter/getCmsModuleList") != -1) {
    const moduleTypeIdForApp = [
        149,
        148,
        150,
        151,
        152,
    ];
    const mainTitlesToDelete = ["保养超值卡", "特价团购", "合作加盟", "集团客户", "评价途虎"];
    if (obj.data?.cmsList?.length > 0) {
        obj.data.cmsList = obj.data.cmsList.filter(item => moduleTypeIdForApp.includes(item.moduleTypeId) && !mainTitlesToDelete.includes(item.mainTitle));
    }
}
else if (url.indexOf("/shopTab/getModuleForC") != -1) {
    delete obj.data.bannersList;
    if (obj.data?.cmsList?.length > 0) {
        obj.data.cmsList = obj.data.cmsList.filter(item => item.bottomMargin === 12);
    }
}
else {
    $done({});
}
$done({ body: JSON.stringify(obj) });
