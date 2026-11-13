const url = $request.url;
if (!$response.body)
    $done({});
let obj = JSON.parse($response.body);
if (url.includes("/activity/app/launcher")) {
    if (obj?.data?.length > 0) {
        obj.data.forEach((i) => {
            i.startTime = 2208960000;
            i.endTime = 2209046399;
        });
    }
}
$done({ body: JSON.stringify(obj) });
