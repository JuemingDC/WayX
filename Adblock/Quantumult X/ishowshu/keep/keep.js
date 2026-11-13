let url = $request.url;
let body = $response.body;
let obj = JSON.parse(body);
if (url.indexOf("config/v3/basic") != -1) {
    obj.data.bottomBarControl.defaultTab = "discover";
    obj.data.discoverPageConfigs.toolsBar = {};
    if (obj && obj.data && obj.data.bottomBarControl && obj.data.bottomBarControl.tabs && Array.isArray(obj.data.bottomBarControl.tabs)) {
        obj.data.bottomBarControl.tabs = obj.data.bottomBarControl.tabs.filter(item => {
            return item && (item.name === '运动' || item.name === '发现' || item.name === '我的');
        });
    }
    if (obj && obj.data && obj.data.discoverPageConfigs && obj.data.discoverPageConfigs.discoverTabs && Array.isArray(obj.data.discoverPageConfigs.discoverTabs)) {
        obj.data.discoverPageConfigs.discoverTabs.forEach(item => {
            if (item && item.name === '推荐') {
                item.default = true;
            }
            else {
                item.default = false;
            }
            if (item.showAd) {
                item.showAd = false;
            }
        });
    }
}
body = JSON.stringify(obj);
$done({ body });
