var body = $response.body;
var obj = JSON.parse(body);
if (obj.data.length == 600) {
    obj.data = "null";
    $done({ body: JSON.stringify(obj) });
}
else {
    $done({});
}
