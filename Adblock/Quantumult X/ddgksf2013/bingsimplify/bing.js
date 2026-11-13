const version = 'V1.0.1';
let body = $response.body;
if (body) {
    if (!0 === /config\/api\/v1\/get/.test($request.url))
        try {
            let e = JSON.parse(body);
            e.data.apps = e.data.apps.filter(e => !("News" == e.appCategory || "Operation" == e.appCategory || "Entertainment" == e.appCategory || "Weather" == e.appName || "Weather: Maps" == e.appName || "0News-L2SDK-Interests" == e.appName)), body = JSON.stringify(e);
        }
        catch (a) {
            console.log("bing : " + a);
        }
    else
        $done({});
    $done({ body });
}
else
    $done({});
