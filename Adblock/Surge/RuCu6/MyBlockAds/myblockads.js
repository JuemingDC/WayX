/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
(function () {
    const __wayxHost = { request: typeof $request === 'undefined' ? undefined : $request, response: typeof $response === 'undefined' ? undefined : $response, done: $done, global: globalThis };
    if ((__wayxHost.response === undefined ? 'request' : 'response') !== "response")
        throw new Error('Unregistered HTTP source/target declaration');
    const __wayxConfig = { "apiPlan": { "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" } } };
    return (function (config, host, run) {
        const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
        const fail = message => { throw new TypeError('WayX API: ' + message); };
        const target = config.apiPlan.target;
        const headers = (function (headers) {
            if (headers === undefined || headers === null)
                return headers;
            if (typeof headers !== 'object' || Array.isArray(headers))
                throw new TypeError('Header dictionary required');
            const lowerCaseHeaders = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
            const key = prop => typeof prop === 'string' ? prop.toLowerCase() : prop;
            return new Proxy(lowerCaseHeaders, {
                get: (target, prop, receiver) => {
                    if (prop === 'hasOwnProperty')
                        return name => Object.prototype.hasOwnProperty.call(target, key(name));
                    if (prop === 'propertyIsEnumerable')
                        return name => Object.prototype.propertyIsEnumerable.call(target, key(name));
                    if (typeof prop === 'string' && !Object.prototype.hasOwnProperty.call(target, key(prop)) && ['toString', 'toLocaleString', 'valueOf', 'constructor'].includes(prop))
                        return Reflect.get(target, prop, receiver);
                    return Reflect.get(target, key(prop), receiver);
                },
                set: (target, prop, value) => Reflect.defineProperty(target, key(prop), { value, writable: true, enumerable: true, configurable: true }),
                deleteProperty: (target, prop) => Reflect.deleteProperty(target, key(prop)),
                has: (target, prop) => Reflect.has(target, key(prop)),
                defineProperty: (target, prop, descriptor) => {
                    if (key(prop) !== prop && !descriptor.configurable)
                        throw new TypeError('Case-insensitive Header descriptors must be configurable');
                    return Reflect.defineProperty(target, key(prop), descriptor);
                },
                getOwnPropertyDescriptor: (target, prop) => { const d = Reflect.getOwnPropertyDescriptor(target, key(prop)); return d && key(prop) !== prop ? Object.assign({}, d, { configurable: true }) : d; },
            });
        });
        const abLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
        const typed = Object.getPrototypeOf(Uint8Array.prototype);
        const get = name => Object.getOwnPropertyDescriptor(typed, name).get;
        const tag = Object.getOwnPropertyDescriptor(typed, Symbol.toStringTag).get;
        const bytes = value => {
            let length;
            try {
                length = abLength.call(value);
            }
            catch { }
            if (length !== undefined)
                return new Uint8Array(value, 0, length);
            if (ArrayBuffer.isView(value)) {
                const isTyped = tag.call(value) !== undefined, getter = name => isTyped ? get(name).call(value) : Object.getOwnPropertyDescriptor(DataView.prototype, name).get.call(value);
                return new Uint8Array(getter('buffer'), getter('byteOffset'), getter('byteLength'));
            }
            return fail('binary body requires BufferSource');
        };
        const binary = value => {
            if (ArrayBuffer.isView(value))
                return true;
            try {
                abLength.call(value);
                return true;
            }
            catch {
                return false;
            }
        };
        const status = value => {
            if (typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599)
                return value;
            const m = typeof value === 'string' && /^HTTP\/[\d.]+\s+(\d{3})(?:\s.*)?$/.exec(value);
            if (m)
                return status(Number(m[1]));
            return fail('invalid HTTP status');
        };
        const requestParts = value => typeof value === 'string' ? /^(https?):\/\/([^/?#]+)([^#]*)/i.exec(value) : null;
        const originalRequest = requestParts(host.request && host.request.url);
        const rawPath = parts => parts[3] ? (parts[3][0] === '?' ? '/' : '') + parts[3] : '/';
        function view(value, requestRole = false) {
            if (value === undefined)
                return undefined;
            const result = Object.assign({}, value);
            if (requestRole && false && originalRequest) {
                if (!own(result, 'scheme'))
                    result.scheme = originalRequest[1].toLowerCase();
                if (!own(result, 'path'))
                    result.path = rawPath(originalRequest);
            }
            if (value.headers !== undefined)
                result.headers = headers(value.headers);
            if (own(value, "status")) {
                result["status"] = status(value["status"]);
                ;
            }
            if (binary(value.bodyBytes) || binary(value.body)) {
                const valueBytes = value.body;
                if (valueBytes !== undefined) {
                    const b = bytes(valueBytes);
                    {
                        result.body = b;
                        delete result.bodyBytes;
                    }
                }
            }
            return result;
        }
        const request = view(host.request, true);
        const response = view(host.response);
        let completed = false;
        const finish = value => { completed = true; return host.done(value); };
        function message(value, synthetic) {
            if (!value || typeof value !== 'object' || Array.isArray(value))
                return fail('completion requires an object');
            const out = Object.assign({}, value);
            if (!synthetic && false && false && own(out, 'path')) {
                if (typeof out.path !== 'string' || !out.path.startsWith('/') || /[\r\n]/.test(out.path))
                    fail('QX request path must be an absolute request path');
                {
                    if (!originalRequest)
                        fail('QX request path requires the original HTTP URL');
                    if (!own(out, 'url') || out.url === (host.request && host.request.url))
                        out.url = originalRequest[1] + '://' + originalRequest[2] + out.path;
                    delete out.path;
                }
            }
            if (own(out, 'statusCode') && !own(out, 'status'))
                out.status = out.statusCode;
            delete out.statusCode;
            if (own(out, 'status'))
                out.status = status(out.status);
            if (own(out, 'headers')) {
                if (!out.headers || typeof out.headers !== 'object' || Array.isArray(out.headers))
                    fail('completion headers require a dictionary');
                out.headers = Object.assign({}, headers(out.headers));
            }
            if (own(out, 'bodyBytes')) {
                out.body = bytes(out.bodyBytes);
                delete out.bodyBytes;
            }
            if (binary(out.body)) {
                out.body = bytes(out.body);
            }
            for (const key of ['h2_trailers', 'node', 'policy'])
                delete out[key];
            for (const key of Object.keys(out))
                if (!['url', 'headers', 'body', 'bodyBytes', 'status', 'abort', ...([]), ...([])].includes(key)) {
                    fail('unmapped completion field: ' + key);
                }
            ;
            ;
            return out;
        }
        function done(value) {
            if (completed)
                return;
            if (['task', 'network', 'generic'].includes("response"))
                return finish(value ?? {});
            if (value === undefined || value === null)
                return finish({});
            if (value === response || value === request) {
                const out = {};
                for (const k of ['url', 'headers', 'body', 'bodyBytes', 'h2_trailers', ...([]), "status"])
                    if (own(value, k))
                        out[k] = value[k];
                value = out;
            }
            if (typeof value === 'string')
                value = { body: value };
            let synthetic = false, payload = value;
            if (value && typeof value === 'object' && own(value, 'response')) {
                synthetic = true;
                payload = value.response;
            }
            else
                ;
            const out = message(payload, synthetic);
            if (synthetic) {
                ;
                return finish({ response: out });
            }
            return finish(out);
        }
        ;
        ;
        ;
        const overlay = {
            $request: request, $response: response, $done: done
        };
        return run.call(host.global, overlay);
    })(__wayxConfig, __wayxHost, function (__wayxScope) {
        return (function ($request, $response, $done) {
            return (function () {
                const url = $request.url;
                const isResp = typeof $response !== "undefined";
                let body = $response.body;
                switch (isResp) {
                    case /^https:\/\/2023\.redircdn\.com\/web\/mob_post\.js\?/.test(url):
                        try {
                            body = body.replace(/spinit\(\)/g, "rucu6()");
                        }
                        catch (err) {
                            console.log(`草榴社区-评论区广告, 出现异常: ` + err);
                        }
                        break;
                    case /^https:\/\/capis(-?\w*)?\.didapinche\.com\/ad\/cx\/startup\?/.test(url):
                        try {
                            let obj = JSON.parse(body);
                            if (obj.hasOwnProperty("startupPages")) {
                                obj.show_time = 1;
                                obj.full_screen = 0;
                                let startupPages = [];
                                obj.startupPages.forEach((element) => {
                                    element["width"] = 1;
                                    element["height"] = 1;
                                    element["page_url"] = "#";
                                    startupPages.push(element);
                                });
                                obj.startupPages = startupPages;
                            }
                            body = JSON.stringify(obj);
                        }
                        catch (err) {
                            console.log(`嘀嗒出行-开屏广告, 出现异常: ` + err);
                        }
                        break;
                    case /^https:\/\/cmsapi\.dmall\.com\/app\/home\/homepageStartUpPic/.test(url):
                        try {
                            let obj = JSON.parse(body);
                            for (let i = 0; i < obj["data"]["welcomePage"].length; i++) {
                                obj["data"]["welcomePage"][i]["onlineTime"] = 3815740800000;
                                obj["data"]["welcomePage"][i]["offlineTime"] = 3818419199000;
                            }
                            body = JSON.stringify(obj);
                        }
                        catch (err) {
                            console.log(`多点-开屏广告, 出现异常: ` + err);
                        }
                        break;
                    case /^https:\/\/mi\.gdt\.qq\.com\/gdt_mview\.fcg/.test(url):
                        try {
                            let obj = JSON.parse(body);
                            if (obj?.seq) {
                                obj.seq = "0";
                            }
                            if (obj?.reqinterval) {
                                obj.reqinterval = 0;
                            }
                            if (obj?.last_ads) {
                                delete obj.last_ads;
                            }
                            if (obj?.data) {
                                delete obj.data;
                            }
                            body = JSON.stringify(obj);
                        }
                        catch (err) {
                            console.log(`联享家-开屏广告, 出现异常: ` + err);
                        }
                        break;
                    case /^https:\/\/guide-acs\.m\.taobao\.com\/gw\/mtop\.taobao\.cloudvideo\.video\.query/.test(url):
                        try {
                            let obj = JSON.parse(body);
                            if (obj?.data?.duration) {
                                obj.data.duration = "0";
                            }
                            if (obj?.data?.resources?.length > 0) {
                                obj.data.resources = [];
                            }
                            if (obj?.data?.caches?.length > 0) {
                                obj.data.caches = [];
                            }
                            if (obj?.data?.respTimeInMs) {
                                obj.data.respTimeInMs = "3818332800000";
                            }
                            body = JSON.stringify(obj);
                        }
                        catch (err) {
                            console.log(`淘宝-开屏视频广告, 出现异常: ` + err);
                        }
                        break;
                    case /^https:\/\/guide-acs\.m\.taobao\.com\/gw\/mtop\.taobao\.wireless\.home\.splash\.awesome\.get/.test(url):
                        try {
                            let obj = JSON.parse(body);
                            if (obj?.data?.containers?.splash_home_base) {
                                let splash = obj.data.containers.splash_home_base;
                                if (splash?.base?.sections?.length > 0) {
                                    for (let items of splash.base.sections) {
                                        if ("taobao-splash" in items.bizData) {
                                            if (items?.bizData?.["taobao-splash"]?.data?.length > 0) {
                                                for (let item of items.bizData["taobao-splash"].data) {
                                                    item.waitTime = "0";
                                                    item.times = "0";
                                                    item.hotStart = "false";
                                                    item.haveVoice = "false";
                                                    item.hideTBLogo = "false";
                                                    item.enable4G = "false";
                                                    item.coldStart = "false";
                                                    item.waitTime = "0";
                                                    item.startTime = "3818332800000";
                                                    item.endTime = "3818419199000";
                                                    item.gmtStart = "2090-12-31 00:00:00";
                                                    item.gmtEnd = "2090-12-31 23:59:59";
                                                    item.gmtStartMs = "3818332800000";
                                                    item.gmtEndMs = "3818419199000";
                                                    if (item?.imgUrl) {
                                                        item.imgUrl = "";
                                                    }
                                                    if (item?.videoUrl) {
                                                        item.videoUrl = "";
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            body = JSON.stringify(obj);
                        }
                        catch (err) {
                            console.log(`淘宝-开屏图片广告, 出现异常: ` + err);
                        }
                        break;
                    case /^https:\/\/poplayer\.template\.alibaba\.com\/\w+\.json/.test(url):
                        try {
                            let obj = JSON.parse(body);
                            if (obj?.res?.images?.length > 0) {
                                obj.res.images = [];
                            }
                            if (obj?.res?.videos?.length > 0) {
                                obj.res.videos = [];
                            }
                            if (obj?.enable) {
                                obj.enable = false;
                            }
                            if (obj?.mainRes?.images?.length > 0) {
                                obj.mainRes.images = [];
                            }
                            body = JSON.stringify(obj);
                        }
                        catch (err) {
                            console.log(`淘宝-开屏活动, 出现异常: ` + err);
                        }
                        break;
                    case /^https:\/\/hd\.mina\.mi\.com\/splashscreen\/alert/.test(url):
                        try {
                            let obj = JSON.parse(body);
                            let data = [];
                            for (let i = 0; i < obj.data.length; i++) {
                                let ad = obj.data[i];
                                ad.start = "3818332800000";
                                ad.end = "3818419199000";
                                ad.stay = 1;
                                ad.maxTimes = 1;
                                data.push(ad);
                            }
                            obj.data = data;
                            body = JSON.stringify(obj);
                        }
                        catch (err) {
                            console.log(`小爱音箱-开屏广告, 出现异常: ` + err);
                        }
                        break;
                    case /^https:\/\/api\.m\.mi\.com\/v1\/app\/start/.test(url):
                        try {
                            let obj = JSON.parse(body);
                            if (obj?.data?.splash) {
                                delete obj.data.splash;
                            }
                            if (obj?.data?.skip_splash) {
                                obj.data.skip_splash = true;
                            }
                            body = JSON.stringify(obj);
                        }
                        catch (err) {
                            console.log(`小米商城-开屏广告, 出现异常: ` + err);
                        }
                        break;
                    case /^https:\/\/api-gateway-pan\.xunlei\.com\/content\/v1\/aggregate\/info\?/.test(url):
                        try {
                            let obj = JSON.parse(body);
                            if (obj?.data?.modules?.length > 0) {
                                let newItems = [];
                                for (let item of obj.data.modules) {
                                    if (["backup_switch", "ads", "top_tip"]?.includes(item?.module_id)) {
                                        continue;
                                    }
                                    if (item?.module_id === "search_words") {
                                        item.data.hot_words = [{ word: "", assistance_description: "搜资源 or 粘贴链接" }];
                                    }
                                    newItems.push(item);
                                }
                                obj.data.modlues = newItems;
                            }
                            body = JSON.stringify(obj);
                        }
                        catch (err) {
                            console.log(`迅雷-首页广告, 出现异常: ` + err);
                        }
                        break;
                    case /^https:\/\/api\.hechuangxinxi\.xyz\/api\/v\d\/\w+/.test(url):
                        try {
                            let obj = JSON.parse(body);
                            if (url.includes("/api/v1/ads")) {
                                if (obj?.data?.ads?.index_top?.length > 0) {
                                    obj.data.ads.index_top = obj.data.ads.index_top.filter((i) => !/https?:\/\//.test(i?.url));
                                }
                                if (obj?.data?.ads?.web_magnets_top?.length > 0) {
                                    obj.data.ads.web_magnets_top = obj.data.ads.web_magnets_top.filter((i) => !/https?:\/\//.test(i?.url));
                                }
                            }
                            else if (url.includes("/api/v1/startup")) {
                                if (obj?.data?.settings?.NOTICE) {
                                    delete obj.data.settings.NOTICE;
                                }
                                if (obj?.data?.splash_ad) {
                                    obj.data.splash_ad.enabled = false;
                                    obj.data.splash_ad.overtime = 0;
                                }
                                if (obj?.data?.feedback) {
                                    obj.data.feedback = {};
                                }
                                if (obj?.data?.user) {
                                    obj.data.user.vip_expired_at = "2090-12-31T23:59:59.000+08:00";
                                    obj.data.user.is_vip = true;
                                }
                            }
                            else if (url.includes("/api/v1/users")) {
                                if (obj?.data?.user) {
                                    obj.data.user.vip_expired_at = "2090-12-31T23:59:59.000+08:00";
                                    obj.data.user.is_vip = true;
                                }
                            }
                            else if (url.includes("/api/v4/movies/")) {
                                if (obj?.data?.show_vip_banner) {
                                    obj.data.show_vip_banner = false;
                                }
                            }
                            else {
                                $done({});
                            }
                            body = JSON.stringify(obj);
                        }
                        catch (err) {
                            console.log(`JavDB, 出现异常: ` + err);
                        }
                        break;
                    default:
                        $done({});
                }
                $done({ body });
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
