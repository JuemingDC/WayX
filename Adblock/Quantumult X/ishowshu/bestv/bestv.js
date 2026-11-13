let url = $request.url;
let body = $response.body;
let obj = JSON.parse(body);
if (url.includes("/live/studio/id/v4")) {
    if (obj.dt && obj.dt.liveStudioStreamRelVoList) {
        const streams = obj.dt.liveStudioStreamRelVoList;
        streams.forEach(stream => {
            console.log(stream.title);
            console.log('');
            stream.qualitys.forEach(quality => {
                console.log(`${quality.qualityName}: ${quality.qualityUrl}`);
                console.log('');
            });
            console.log('');
            console.log('');
        });
    }
}
if (url.includes("/project/userCenter")) {
    obj.dt = [];
}
body = JSON.stringify(obj);
$done({ body });
