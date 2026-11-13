let url = $request.url;
let body = $response.body;
let obj = JSON.parse(body);
try {
    if (url.indexOf("/homepage/hub") != -1) {
        const tabArray = ["首页", "聊天", "个人中心"];
        if (obj?.result?.bottom_tabs) {
            obj.result.bottom_tabs = obj.result.bottom_tabs.filter(tab => tabArray.includes(tab.title));
        }
        const topArray = [1];
        if (obj?.result?.all_top_opts) {
            obj.result.all_top_opts = [];
        }
        delete obj.result.search_bar_hot_query;
        const adArray = [
            "irregular_banner_dy",
            "irregular_banner",
            "ad_module",
            "icon_set",
            "recommend_fresh_info",
            "timeline"
        ];
        if (obj?.result?.module_order) {
            obj.result.module_order = obj.result.module_order.filter(tab => !adArray.includes(tab.module_name));
        }
    }
}
catch (error) {
    console.log("脚本执行出错:" + error.message);
    console.log("url:" + url);
}
body = JSON.stringify(obj);
$done({ body });
