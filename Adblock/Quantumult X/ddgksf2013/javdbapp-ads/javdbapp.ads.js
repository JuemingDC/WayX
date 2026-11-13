let body = $response.body, url = $request.url, obj = JSON.parse(body);
try {
    /\/api\/v\d\/startup/.test(url) && (obj?.data?.settings?.NOTICE && delete obj.data.settings.NOTICE, obj?.data?.splash_ad && (obj.data.splash_ad.enabled = !1, obj.data.splash_ad.overtime = 0)), /\/api\/v\d\/ads/.test(url) && obj?.data && (obj.data.ads = null), /\/api\/v4\/movies/.test(url) && obj?.data && (obj.data.show_vip_banner = !1);
}
catch (a) { }
$done({ body: JSON.stringify(obj) });
