// Converted: 2026-10-04 18:07:10 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/api\.chelaile\.net\.cn\/goocity\/flowPos\/home\?/i then response.body.mock("json", "**YGKJ{\"jsonr\":{\"status\":\"00\",\"data\":{\"advertList\":[{\"id\":106,\"title\":\"站点地图\",\"iconUrl\":\"https://image3.chelaile.net.cn/89iIqxaM.png\",\"linkUrl\":\"\",\"adType\":5,\"showRedDot\":0,\"updateTime\":0,\"appId\":\"\",\"appPath\":\"\",\"bubbleOrder\":0,\"h5Type\":0},{\"id\":1,\"title\":\"地铁\",\"iconUrl\":\"https://image3.chelaile.net.cn/rewrLCWY.png\",\"linkUrl\":\"https://web.chelaile.net.cn/metro/index.html?h5_stats_referer=icon\",\"adType\":2,\"showRedDot\":0,\"updateTime\":0,\"appId\":\"\",\"appPath\":\"\",\"bubbleOrder\":0,\"h5Type\":0}]}}}YGKJ##", 200)
const __wayxContentType = "application/json";
const __wayxBody = "**YGKJ{\"jsonr\":{\"status\":\"00\",\"data\":{\"advertList\":[{\"id\":106,\"title\":\"站点地图\",\"iconUrl\":\"https://image3.chelaile.net.cn/89iIqxaM.png\",\"linkUrl\":\"\",\"adType\":5,\"showRedDot\":0,\"updateTime\":0,\"appId\":\"\",\"appPath\":\"\",\"bubbleOrder\":0,\"h5Type\":0},{\"id\":1,\"title\":\"地铁\",\"iconUrl\":\"https://image3.chelaile.net.cn/rewrLCWY.png\",\"linkUrl\":\"https://web.chelaile.net.cn/metro/index.html?h5_stats_referer=icon\",\"adType\":2,\"showRedDot\":0,\"updateTime\":0,\"appId\":\"\",\"appPath\":\"\",\"bubbleOrder\":0,\"h5Type\":0}]}}}YGKJ##";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
