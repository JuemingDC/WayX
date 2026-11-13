try {
    let obj = JSON.parse($response.body);
    if (obj.body?.app_home_banner?.data) {
        obj.body.app_home_banner.data = [];
    }
    if (obj.body?.tagbanner2024?.data) {
        obj.body.tagbanner2024.data = [];
    }
    $done({ body: JSON.stringify(obj) });
}
catch (e) {
    console.log("招商证券广告去除脚本异常：" + e);
    $done({});
}
