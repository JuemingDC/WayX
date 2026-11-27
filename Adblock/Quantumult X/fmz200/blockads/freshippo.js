const url = $request.url;
if (!$response.body)
    $done({});
let obj;
try {
    obj = JSON.parse($response.body);
}
catch (e) {
    console.info(url);
    console.error("JSON解析错误:", e);
    $done({});
}
if (url.indexOf("queryindexpage") != -1) {
    const sceneTemplateId = [
        "509",
        "738"
    ];
    const spmcCode = [
        "waterfall",
        "category"
    ];
    if (obj?.data?.scenes?.length > 0) {
        obj.data.scenes = obj.data.scenes.filter(scene => sceneTemplateId.includes(scene.sceneTemplateId));
    }
    if (obj.data?.secondFloor) {
        obj.data.secondFloor = {};
    }
    if (obj?.data?.model?.scenes?.length > 0) {
        obj.data.model.scenes = obj.data.model.scenes.filter(scene => spmcCode.includes(scene.spmc));
    }
}
else if (url.indexOf("querymypage") != -1) {
    const sceneTemplateId = [
        "906",
        "907",
        "198",
        "286",
        "431",
        "185",
        "230",
        "978",
        "709",
        "432",
        "403",
        "350"
    ];
    if (obj?.data?.scenes?.length > 0) {
        obj.data.scenes = obj.data.scenes.filter(scene => sceneTemplateId.includes(scene.sceneTemplateId));
    }
}
else if (url.indexOf("querytabfeedstream") != -1) {
    if (obj?.data?.pageName && obj.data.pageName.includes("盒马商家")) {
        obj.data = {};
    }
    if (obj.data?.scenes?.length > 0) {
        obj.data.scenes = obj.data.scenes.filter(item => item.sceneType !== "100004");
    }
}
else if (url.indexOf("mtop.trade.query.bag") != -1) {
    const AD_KEYS = [
        "hemaActivityBanner_HemaActivityBanner",
        "cartShopCouponPopWindow_hm_fresh",
        "extendGeneralOpenPopWindow_hm_fresh",
        "generalOpenPopWindow_hm_fresh"
    ];
    if (obj.data?.data) {
        AD_KEYS.forEach(k => delete obj.data.data[k]);
    }
    if (obj.data?.hierarchy?.structure) {
        const structure = obj.data.hierarchy.structure;
        AD_KEYS.forEach(k => delete structure[k]);
        Object.keys(structure).forEach(k => {
            if (Array.isArray(structure[k])) {
                structure[k] = structure[k].filter(item => !AD_KEYS.includes(item));
            }
        });
    }
}
else {
    $done({});
}
$done({ body: JSON.stringify(obj) });
