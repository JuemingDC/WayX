// Converted: 2026-10-03 17:44:36 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/cn\.iot\.dreame\.tech:\d+\/dreame-product\/public\/common-plugin$/i then response.body.mock("json", "{\"code\":0,\"success\":true,\"data\":{\"version\":1144,\"appVer\":20,\"url\":\"https://kelee.one/Resource/Zip/DREAME/d6996fee95380affdf740ee44a85fbe9___UNI__EDB922E.zip\",\"md5\":\"e0cc9cb77d9e0cf275e41e73dba3f988\",\"validDate\":\"\",\"changeLog\":\"\",\"status\":\"\"},\"msg\":\"操作成功\"}", 200)
const __wayxContentType = "application/json";
const __wayxBody = "{\"code\":0,\"success\":true,\"data\":{\"version\":1144,\"appVer\":20,\"url\":\"https://kelee.one/Resource/Zip/DREAME/d6996fee95380affdf740ee44a85fbe9___UNI__EDB922E.zip\",\"md5\":\"e0cc9cb77d9e0cf275e41e73dba3f988\",\"validDate\":\"\",\"changeLog\":\"\",\"status\":\"\"},\"msg\":\"操作成功\"}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
