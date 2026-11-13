const url = $request.url;
if (!$response.body)
    $done({});
let body = $response.body;
let obj = JSON.parse(body);
if (obj.data?.length > 0) {
    obj.data = obj.data.filter(item => {
        item.detailInfo.popDayLimit = 0;
        item.detailInfo.adType = 4;
        item.detailInfo.closeButtonLocation = 0;
        item.detailInfo.skipButtonLocation = 0;
        item.detailInfo.adLandingInfoList = [{
                "id": "",
                "imgSource": null,
                "landingPageModel": "",
                "landingPageLink": null,
                "landingPageType": null,
                "landingGroup": null,
                "styleType": null,
                "orderIndex": 1,
                "landingPageText": null,
                "landingPageImg": "",
                "landingPageName": "",
                "messageModel": null
            }];
        return true;
    });
}
body = JSON.stringify(obj);
$done({ body });
