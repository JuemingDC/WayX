// Converted: 2026-10-04 18:07:30 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^http:\/\/weatherapi\.ccqyj\.com\/server\/listsv\d$/i then response.body.mock("json", "{\"data\":[{\"title\":\"小工具\",\"type\":1,\"sort\":1,\"id\":\"5d5fb7c41a0c40015679a3e3\",\"list\":[{\"title\":\"主题皮肤\",\"groupId\":\"5d5fb7c41a0c40015679a3e3\",\"image\":\"http://cdn.weather.nineton.cn/b52be26ae06f6824d171375d0dac51f1.png\",\"dark_icon\":\"http://cdn.weather.nineton.cn/e714ad6421965c8368ca6af438acde36.png\",\"type\":1,\"protocol\":\"ntweather://opentheme\",\"sort\":1103,\"version\":814,\"rightVersion\":0,\"symbol\":1}]}],\"code\":1,\"info\":\"ok\"}", 200)
const __wayxContentType = "application/json";
const __wayxBody = "{\"data\":[{\"title\":\"小工具\",\"type\":1,\"sort\":1,\"id\":\"5d5fb7c41a0c40015679a3e3\",\"list\":[{\"title\":\"主题皮肤\",\"groupId\":\"5d5fb7c41a0c40015679a3e3\",\"image\":\"http://cdn.weather.nineton.cn/b52be26ae06f6824d171375d0dac51f1.png\",\"dark_icon\":\"http://cdn.weather.nineton.cn/e714ad6421965c8368ca6af438acde36.png\",\"type\":1,\"protocol\":\"ntweather://opentheme\",\"sort\":1103,\"version\":814,\"rightVersion\":0,\"symbol\":1}]}],\"code\":1,\"info\":\"ok\"}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
