const url = $request.url;
if (!$response.body)
    $done({});
let body = $response.body;
if (url.includes("getPageComponents")) {
    let obj = JSON.parse(body);
    if (obj?.data?.pageComponents?.length > 0) {
        obj.data.pageComponents = obj.data.pageComponents.filter((i) => ![
            "TCMP_home_followingadvertising",
        ]?.includes(i?.componentCode));
    }
    body = JSON.stringify(obj);
}
$done({ body });
