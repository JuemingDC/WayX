/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
(function () {
    const __wayxHost = { request: typeof $request === 'undefined' ? undefined : $request, response: typeof $response === 'undefined' ? undefined : $response, done: $done, global: globalThis };
    if ((__wayxHost.response === undefined ? 'request' : 'response') !== "response")
        throw new Error('Unregistered HTTP source/target declaration');
    const __wayxConfig = { "apiPlan": { "target": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": "open-url", "media": "media-url", "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" } } };
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
        const buffer = value => { const b = bytes(value); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
        const status = value => {
            if (typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599)
                return value;
            const m = typeof value === 'string' && /^HTTP\/[\d.]+\s+(\d{3})(?:\s.*)?$/.exec(value);
            if (m)
                return status(Number(m[1]));
            return fail('invalid HTTP status');
        };
        const statusLine = value => { const code = status(value); return typeof value === 'string' ? value : 'HTTP/1.1 ' + code + ' ' + ({ 200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error' }[code] || 'Status'); };
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
            if (own(value, "statusCode")) {
                result["status"] = status(value["statusCode"]);
                delete result["statusCode"];
            }
            if (binary(value.bodyBytes) || binary(value.body)) {
                const valueBytes = value.bodyBytes;
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
                ;
            }
            if (own(out, 'statusCode') && !own(out, 'status'))
                out.status = out.statusCode;
            delete out.statusCode;
            if (own(out, 'status'))
                out.status = statusLine(out.status);
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
                {
                    out.bodyBytes = buffer(out.body);
                    delete out.body;
                }
            }
            ;
            for (const key of Object.keys(out))
                if (!['url', 'headers', 'body', 'bodyBytes', 'status', 'abort', ...([]), ...([])].includes(key)) {
                    delete out[key];
                }
            delete out.abort;
            if (!synthetic && true && own(out, 'headers') && !own(out, 'body') && !own(out, 'bodyBytes') && true)
                fail('QX response-body requires body with changed headers');
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
                {
                    fail('QX synthetic response requires an echo declaration');
                    return finish(out);
                }
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
        return (function ($response, $done, $request) {
            return (function () {
                if (!$response.body)
                    $done({});
                const url = $request.url;
                let obj = JSON.parse($response.body);
                if (url.includes("/answers/v2/") || url.includes("/articles/v2/")) {
                    if (obj?.third_business?.related_queries?.queries?.length > 0) {
                        obj.third_business.related_queries.queries = [];
                    }
                }
                else if (url.includes("/api/cloud/zhihu/config/all")) {
                    if (obj?.data?.configs?.length > 0) {
                        for (let i of obj.data.configs) {
                            if (i?.configKey === "feed_gray_theme") {
                                if (i?.configValue) {
                                    i.configValue.start_time = 3818332800;
                                    i.configValue.end_time = 3818419199;
                                    i.status = false;
                                }
                            }
                            else if (i?.configKey === "feed_top_res") {
                                if (i?.configValue) {
                                    i.configValue.start_time = 3818332800;
                                    i.configValue.end_time = 3818419199;
                                }
                            }
                        }
                    }
                }
                else if (url.includes("/api/v4/answers")) {
                    if (obj?.data) {
                        delete obj.data;
                    }
                    if (obj?.paging) {
                        delete obj.paging;
                    }
                }
                else if (url.includes("/api/v4/articles")) {
                    const item = ["ad_info", "paging", "recommend_info"];
                    item.forEach((i) => {
                        delete obj[i];
                    });
                }
                else if (url.includes("/appcloud2.zhihu.com/v3/config")) {
                    if (obj?.config?.hp_channel_tab) {
                        delete obj.config.hp_channel_tab;
                    }
                    if (obj?.config) {
                        if (obj.config?.homepage_feed_tab) {
                            obj.config.homepage_feed_tab.tab_infos = obj.config.homepage_feed_tab.tab_infos.filter((i) => {
                                if (i.tab_type === "activity_tab") {
                                    i.start_time = "3818332800";
                                    i.end_time = "3818419199";
                                    return true;
                                }
                                else {
                                    return false;
                                }
                            });
                        }
                        if (obj.config?.zombie_conf) {
                            obj.config.zombie_conf.zombieEnable = false;
                        }
                        if (obj.config?.gray_mode) {
                            obj.config.gray_modeenable = false;
                            obj.config.gray_mode.start_time = "3818332800";
                            obj.config.gray_mode.end_time = "3818419199";
                        }
                        if (obj.config?.zhcnh_thread_sync) {
                            obj.config.zhcnh_thread_sync.LocalDNSSetHostWhiteList = [];
                            obj.config.zhcnh_thread_sync.isOpenLocalDNS = "0";
                            obj.config.zhcnh_thread_sync.ZHBackUpIP_Switch_Open = "0";
                            obj.config.zhcnh_thread_sync.dns_ip_detector_operation_lock = "1";
                            obj.config.zhcnh_thread_sync.ZHHTTPSessionManager_setupZHHTTPHeaderField = "1";
                        }
                        obj.config.zvideo_max_number = 1;
                        obj.config.is_show_followguide_alert = false;
                    }
                }
                else if (url.includes("/commercial_api/app_float_layer")) {
                    if ("feed_egg" in obj) {
                        delete obj;
                    }
                }
                else if (url.includes("/feed/render/tab/config")) {
                    if (obj?.selected_sections?.length > 0) {
                        obj.selected_sections = obj.selected_sections.filter((i) => ["recommend", "section"].includes(i?.tab_type));
                    }
                }
                else if (url.includes("/moments_v3")) {
                    if (obj?.data?.length > 0) {
                        obj.data = obj.data.filter((i) => !i?.title?.includes("为您推荐"));
                    }
                }
                else if (url.includes("/next-bff")) {
                    if (obj?.data?.length > 0) {
                        obj.data = obj.data.filter((i) => !(i?.origin_data?.type?.includes("ad") ||
                            i?.origin_data?.resource_type?.includes("ad") ||
                            i?.origin_data?.next_guide?.title?.includes("推荐")));
                    }
                }
                else if (url.includes("/next-data")) {
                    if (obj?.data?.data?.length > 0) {
                        obj.data.data = obj.data.data.filter((i) => !(i?.type?.includes("ad") || i?.data?.answer_type?.includes("PAID")));
                    }
                }
                else if (url.includes("/next-render")) {
                    if (obj?.data?.length > 0) {
                        obj.data = obj.data.filter((i) => !(i?.adjson ||
                            i?.biz_type_list?.includes("article") ||
                            i?.biz_type_list?.includes("content") ||
                            i?.business_type?.includes("paid") ||
                            i?.section_info ||
                            i?.tips ||
                            i?.type?.includes("ad")));
                    }
                }
                else if (url.includes("/questions/")) {
                    if (obj?.ad_info) {
                        delete obj.ad_info;
                    }
                    if (obj?.data?.ad_info) {
                        delete obj.data.ad_info;
                    }
                    if (obj?.query_info) {
                        delete obj.query_info;
                    }
                    if (obj?.data?.length > 0) {
                        obj.data = obj.data.filter((i) => !i?.target?.answer_type?.includes("paid"));
                    }
                }
                else if (url.includes("/root/tab")) {
                    if (obj?.tab_list?.length > 0) {
                        obj.tab_list = obj.tab_list.filter((i) => ["follow", "hot", "recommend"].includes(i?.tab_type));
                    }
                }
                else if (url.includes("/topstory/hot-lists/everyone-seeing")) {
                    if (obj?.data?.data?.length > 0) {
                        obj.data.data = obj.data.data.filter((i) => !i.target?.metrics_area?.text?.includes("合作推广"));
                    }
                }
                else if (url.includes("/topstory/hot-lists/total")) {
                    if (obj?.data?.length > 0) {
                        obj.data = obj.data.filter((i) => !i.hasOwnProperty("ad"));
                    }
                }
                else if (url.includes("/topstory/recommend")) {
                    if (obj?.data?.length > 0) {
                        obj.data = obj.data.filter((i) => {
                            if (i.type === "market_card" && i.fields?.header?.url && i.fields.body?.video?.id) {
                                let videoID = getUrlParamValue(item.fields.header.url, "videoID");
                                if (videoID) {
                                    i.fields.body.video.id = videoID;
                                }
                            }
                            else if (i.type === "common_card") {
                                if (i.extra?.type === "drama") {
                                    return false;
                                }
                                else if (i.extra?.type === "zvideo") {
                                    let videoUrl = i.common_card.feed_content.video.customized_page_url;
                                    let videoID = getUrlParamValue(videoUrl, "videoID");
                                    if (videoID) {
                                        i.common_card.feed_content.video.id = videoID;
                                    }
                                }
                                else if (i.common_card?.feed_content?.video?.id) {
                                    let search = '"feed_content":{"video":{"id":';
                                    let str = $response.body.substring($response.body.indexOf(search) + search.length);
                                    let videoID = str.substring(0, str.indexOf(","));
                                    i.common_card.feed_content.video.id = videoID;
                                }
                                else if (i.common_card?.footline?.elements?.[0]?.text?.panel_text?.includes("广告")) {
                                    return false;
                                }
                                else if (i.common_card?.feed_content?.source_line?.elements?.[1]?.text?.panel_text?.includes("盐选")) {
                                    return false;
                                }
                                else if (i?.promotion_extra) {
                                    return false;
                                }
                                return true;
                            }
                            else if (i.type?.includes("aggregation_card")) {
                                return false;
                            }
                            else if (i.type === "feed_advert") {
                                return false;
                            }
                            return true;
                        });
                        fixPos(obj.data);
                    }
                }
                $done({ body: JSON.stringify(obj) });
                function fixPos(arr) {
                    for (let i = 0; i < arr.length; i++) {
                        arr[i].offset = i + 1;
                    }
                }
                function getUrlParamValue(url, queryName) {
                    return Object.fromEntries(url
                        .substring(url.indexOf("?") + 1)
                        .split("&")
                        .map((pair) => pair.split("=")))[queryName];
                }
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done), Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request));
    });
})();
