let url = $request.url;
let body = $response.body;
let obj = JSON.parse(body);
if (url.indexOf("/chat/limitInfo") != -1) {
    delete obj.data.subMsg;
    delete obj.data.extMsg;
    delete obj.data.abValue;
    delete obj.data.freeEquityStatus;
    delete obj.data.msg;
    delete obj.data.remainFreeCount;
    delete obj.data.type;
    obj.data.limit = false;
}
else if (url.indexOf("/snapchat/url") != -1) {
    try {
        let imageUrl = obj.data.url;
        if (imageUrl && typeof imageUrl === 'string') {
            console.log("图片地址: " + imageUrl);
            $notify("图片预览", "点击跳转浏览器", imageUrl, {
                "media-url": imageUrl,
                "open-url": imageUrl
            });
        }
    }
    catch (e) {
        console.log("处理图片预览出错：" + e);
    }
}
body = JSON.stringify(obj);
$done({ body });
