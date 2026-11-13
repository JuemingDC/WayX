const url = $request.url;
if (!$response.body)
    $done({});
let body = $response.body;
let obj = JSON.parse(body);
if (url.includes("job-tab-dynamic")) {
    if (obj.resultbody?.adsTabFeeds && obj.resultbody.adsTabFeeds.length > 0) {
        delete obj.resultbody.adsTabFeeds;
    }
}
else if (url.includes("my-page")) {
    if (obj.resultbody?.vipInfo) {
        obj.resultbody.vipInfo.isVip = true;
    }
    if (obj.resultbody?.rightsGuidanceCopy) {
        delete obj.resultbody.rightsGuidanceCopy;
    }
    if (obj.resultbody?.jobToolInfoList && obj.resultbody.jobToolInfoList.length > 0) {
        delete obj.resultbody.jobToolInfoList;
    }
}
body = JSON.stringify(obj);
$done({ body });
