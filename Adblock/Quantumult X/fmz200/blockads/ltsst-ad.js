var body = JSON.parse($response.body);
const url = $request.url;
if (url.includes('/ltsstnew/common/getJGQIconNew')) {
    delete body.content.specialBanner;
}
else if (url.includes('/ltsstnew/city/getAllBannelByCity')) {
    body.content = body.content.filter(i => i.bannerType === 1);
}
$done({ body: JSON.stringify(body) });
