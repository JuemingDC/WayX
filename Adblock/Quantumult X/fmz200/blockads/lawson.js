let url = $request.url;
let obj = JSON.parse($response.body);
try {
    if (url.includes("/portal/app/globalLaunch/listAdvert?")) {
        console.log('去除弹窗、悬浮广告');
        if (obj?.data) {
            console.log('【已处理】去除弹窗、悬浮广告');
            obj.data = {};
        }
    }
    if (url.includes("/app/v1/home/getReservation/?")) {
        console.log('去除预购列表');
        if (obj?.data) {
            console.log('【已处理】去除预购列表');
            obj.data = {};
        }
    }
    if (url.includes("/app/v1/home/getRecommendations/?")) {
        console.log('去除推荐列表');
        if (obj?.data) {
            console.log('【已处理】去除推荐列表');
            obj.data = {};
        }
    }
    if (url.includes("/app/v1/home/getConfigInfo/?")) {
        console.log('去除首页banner推广');
        if (obj?.data?.dysmorphismPictureList) {
            console.log('【已处理】去除首页banner推广');
            obj.data.dysmorphismPictureList = [];
        }
    }
    if (url.includes("/app/v1/mina/systemSetting?")) {
        console.log('去除首页栏目');
        if (obj?.data) {
            obj.data = obj.data.map(item => {
                if (item.type === 'HOMETAB') {
                    console.log('【已处理】去除首页栏目');
                    item.openFlg = false;
                    item.typeValue = {};
                }
                return item;
            });
        }
    }
}
catch (e) {
    console.log('脚本运行出现错误，部分广告未去除⚠️');
    console.log('错误信息：' + e.message);
}
$done({ body: JSON.stringify(obj) });
