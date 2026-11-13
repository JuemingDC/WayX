let requestUrl = $request.url;
let responseBody = $response.body;
let obj = JSON.parse(responseBody);
if (requestUrl.includes("/api/v1/movie/index_recommend?")) {
    if (Array.isArray(obj.data)) {
        console.log('去广告开始💕');
        obj.data = obj.data.filter(item => {
            if (item.layout === 'advert_self') {
                return false;
            }
            if (Array.isArray(item.list)) {
                item.list = item.list.filter(subItem => subItem.type !== 3);
            }
            return true;
        });
    }
    console.log('去广告结束💕');
}
$done({ body: JSON.stringify(obj) });
