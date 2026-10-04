// Converted: 2026-10-04 17:52:14 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/keapi\.fenbi\.com\/app\/(iphone|ipad)\/position_resource\/get_home_banners\?.*position_resource_type=1/i then response.body.mock("json", "{\"code\":1,\"msg\":\"\",\"data\":{\"positionResourceType\":1,\"payload\":{\"items\":[{\"id\":17868,\"courseSetId\":2,\"content\":\"妹子图\",\"imageUrl\":\"https://i.im.ge/2025/11/24/4DrVp0.mm.png\",\"url\":\"null\",\"redirectType\":1,\"ordinal\":8,\"createdTime\":1746799144383,\"startTime\":1759850171000,\"endTime\":4070880000000,\"type\":0,\"bizType\":4}],\"count\":1}}}", 200)
const __wayxContentType = "application/json";
const __wayxBody = "{\"code\":1,\"msg\":\"\",\"data\":{\"positionResourceType\":1,\"payload\":{\"items\":[{\"id\":17868,\"courseSetId\":2,\"content\":\"妹子图\",\"imageUrl\":\"https://i.im.ge/2025/11/24/4DrVp0.mm.png\",\"url\":\"null\",\"redirectType\":1,\"ordinal\":8,\"createdTime\":1746799144383,\"startTime\":1759850171000,\"endTime\":4070880000000,\"type\":0,\"bizType\":4}],\"count\":1}}}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
