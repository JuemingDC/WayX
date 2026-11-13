let url = $request.url;
let body = $response.body;
let obj = JSON.parse(body);
if (url.indexOf("/advertisement/v1") != -1) {
    obj.data = obj.data.filter(item => ![30, 50, 90, 320, 100, 770].includes(item.region_code));
    obj.data = obj.data.map(item => {
        if (item.region_code === 2) {
            item.positions = item.positions.filter(position => ![890, 60, 2, 240, 2503].includes(position.component_code));
        }
        return item;
    });
    body = JSON.stringify(obj);
    $done({ body });
}
if (url.indexOf("/orders/list") != -1) {
    if (obj && obj.data) {
        obj.data.forEach(item => {
            if (item) {
                delete item.just_in_time_comment;
            }
        });
    }
    body = JSON.stringify(obj);
    $done({ body });
}
body = JSON.stringify(obj);
$done({ body });
