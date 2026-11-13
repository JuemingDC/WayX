var cuttlefish = { "warning": "本腳本僅供學習交流使用，禁止轉載售賣", "tgchannel": "https://t.me/ddgksf2021", "feedback": "https://t.me/ddgksf2013_bot" };
var body = $response.body.replace(/Ad":1/g, 'Ad":0').replace(/Ad_ab":1/g, 'Ad_ab":0');
$done({ body });
