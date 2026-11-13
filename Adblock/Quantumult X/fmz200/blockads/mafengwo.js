const url = $request.url;
if (!$response.body)
    $done({});
let body = $response.body;
let obj = JSON.parse(body);
if (url.includes("/get_profile")) {
    if (obj?.data?.user_info?.daka_guide_info) {
        obj.data.user_info.daka_guide_info.is_show_tip = 0;
        obj.data.user_info.daka_guide_info.tip = "";
    }
}
else if (url.includes("/get_list")) {
    if (obj?.data?.list?.length > 0) {
        obj.data.list = obj.data.list.filter(function (item) {
            if (item.style != "inspire") {
                return item;
            }
        });
    }
}
body = JSON.stringify(obj);
$done({ body });
