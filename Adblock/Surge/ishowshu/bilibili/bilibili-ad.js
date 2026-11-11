/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
(function () {
    const __wayxHost = { request: typeof $request === 'undefined' ? undefined : $request, response: typeof $response === 'undefined' ? undefined : $response, done: $done, store: typeof $persistentStore === 'undefined' ? undefined : $persistentStore, global: globalThis, argument: typeof $argument === 'undefined' ? undefined : $argument };
    if ((__wayxHost.response === undefined ? 'request' : 'response') !== "response")
        throw new Error('Unregistered HTTP source/target declaration');
    const __wayxConfig = { "apiPlan": { "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" } } };
    if ("surge" === 'surge' && typeof __wayxHost.argument === 'string' && __wayxHost.argument.startsWith("wayx_qx_header_v1=")) {
        const p = JSON.parse(decodeURIComponent(__wayxHost.argument.slice(18)));
        if (!(function (p, r) {
            const re = new RegExp(p.pattern, p.flags), headers = Array.isArray(r.headers) ? r.headers : Object.keys(r.headers || {}).map(field => ({ field, value: r.headers[field] }));
            if (p.kind === 'method')
                return re.test(String(r.method || ''));
            if (p.kind === 'field')
                return headers.some(h => String(h.field).toLowerCase() === p.field.toLowerCase() && re.test(String(h.value)));
            const path = String(r.url || '').replace(/^[a-z]+:\/\/[^/]+/i, '').split('#')[0] || '/';
            return [String(r.method || ''), path, ...headers.flatMap(h => [String(h.field), String(h.value)])].some(value => re.test(value));
        })(p, __wayxHost.request))
            return __wayxHost.done({});
        __wayxHost.argument = undefined;
    }
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
        const requestParts = value => typeof value === 'string' ? /^(https?):\/\/([^/?#]+)([^#]*)/i.exec(value) : null;
        const originalRequest = requestParts(host.request && host.request.url);
        const rawPath = parts => parts[3] ? (parts[3][0] === '?' ? '/' : '') + parts[3] : '/';
        function view(value, requestRole = false) {
            if (value === undefined)
                return undefined;
            const result = Object.assign({}, value);
            if (requestRole && true && originalRequest) {
                if (!own(result, 'scheme'))
                    result.scheme = originalRequest[1].toLowerCase();
                if (!own(result, 'path'))
                    result.path = rawPath(originalRequest);
            }
            if (value.headers !== undefined)
                result.headers = headers(value.headers);
            if (own(value, "status")) {
                result["statusCode"] = status(value["status"]);
                delete result["status"];
            }
            if (binary(value.bodyBytes) || binary(value.body)) {
                const valueBytes = value.body;
                if (valueBytes !== undefined) {
                    const b = bytes(valueBytes);
                    {
                        result.bodyBytes = buffer(b);
                        delete result.body;
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
            if (!synthetic && false && true && own(out, 'path')) {
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
                for (const k of ['url', 'headers', 'body', 'bodyBytes', 'h2_trailers', ...([]), "statusCode"])
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
        const nativeStore = host.store;
        const storageKey = key => {
            if (key === undefined) {
                const name = "bilibili-ad.js";
                if (!name)
                    return fail('source storage default key needs source script name');
                return name;
            }
            if (typeof key !== 'string')
                return fail('storage key must be String');
            return key;
        };
        const store = { read: key => nativeStore["read"](storageKey(key)), write: (value, key) => {
                key = storageKey(key);
                if (value === null || (value === undefined && false))
                    return nativeStore["write"](null, key);
                if (typeof value !== 'string')
                    return fail('storage value must be String or deletion marker');
                return nativeStore["write"](value, key);
            } };
        const prefKey = key => typeof key === 'string' ? key : fail('QX storage requires an explicit String key');
        const prefs = { valueForKey: key => store.read(prefKey(key)), setValueForKey: (value, key) => {
                key = prefKey(key);
                if (typeof value !== 'string')
                    return fail('QX storage value must be String');
                return store.write(value, key);
            }, removeValueForKey: key => nativeStore["write"](null, prefKey(key)) };
        prefs.removeAllValues = () => undefined;
        ;
        ;
        const overlay = {
            $request: request, $response: response, $done: done
        };
        ;
        return run.call(host.global, overlay);
    })(__wayxConfig, __wayxHost, function (__wayxScope) {
        return (function ($request, $response, $done) {
            return (function () {
                let url = $request.url;
                let body = $response.body;
                let obj;
                try {
                    obj = JSON.parse(body);
                }
                catch (e) {
                    console.log("数据返回异常，服务挂了");
                    $done({});
                }
                if (url.includes("/x/v2/search/square")) {
                    if (obj?.data) {
                        obj.data = { type: "history", title: "搜索历史", search_hotword_revision: 2 };
                    }
                }
                else if (url.includes("/resource/top/activity")) {
                    var jsonString = '{ "code": -404, "message": "啥都木有", "ttl": 1, "data": null }';
                    obj = JSON.parse(jsonString);
                }
                else if (url.includes("/x/v2/feed/index?")) {
                    if (obj?.data?.items?.length > 0) {
                        obj.data.items = obj.data.items.filter((i) => i?.card_goto === "av");
                    }
                    if (obj?.data?.config?.toast?.has_toast) {
                        obj.data.config.toast.has_toast = false;
                    }
                }
                else if (url.includes("/x/resource/show/tab/v2")) {
                    if (obj?.data?.bottom?.length > 0) {
                        const sortLists = ["首页", "动态", "关注", "我的"];
                        obj.data.bottom = obj.data.bottom
                            .filter((i) => sortLists?.includes(i?.name))
                            .sort((a, b) => sortLists.indexOf(a?.name) - sortLists.indexOf(b?.name));
                    }
                    if (obj?.data?.tab?.length > 0) {
                        const sortLists = ["直播", "推荐", "热门"];
                        obj.data.tab = obj.data.tab
                            .filter((i) => sortLists?.includes(i?.name))
                            .sort((a, b) => sortLists.indexOf(a?.name) - sortLists.indexOf(b?.name));
                    }
                    if (obj?.data?.top?.length > 0) {
                        obj.data.top = obj.data.top.filter((i) => i?.name === "消息");
                        if (obj?.data?.top?.[0]?.pos) {
                            obj.data.top[0].pos = 1;
                        }
                    }
                }
                else if (url.includes("/x/v2/account/mine?")) {
                    if (obj?.data?.sections_v2?.length > 0) {
                        let newSects = [];
                        for (let item of obj.data.sections_v2) {
                            delete item.button;
                            if (item?.style) {
                                if (item?.style === 1 || item?.style === 2) {
                                    if (item?.title) {
                                        if (item?.title === "创作中心" || item?.title === "推荐服务" || item?.title === "我的服务") {
                                            continue;
                                        }
                                        else if (item?.title === "更多服务") {
                                            delete item.title;
                                            if (item?.items?.length > 0) {
                                                let newItems = [];
                                                for (let i of item.items) {
                                                    if (/user_center\/feedback/g.test(i?.uri)) {
                                                    }
                                                    else if (/user_center\/setting/g.test(i?.uri)) {
                                                        newItems.push(i);
                                                    }
                                                    else {
                                                        continue;
                                                    }
                                                }
                                                item.items = newItems;
                                            }
                                        }
                                    }
                                }
                                else {
                                    continue;
                                }
                            }
                            newSects.push(item);
                        }
                        obj.data.sections_v2 = newSects;
                    }
                    delete obj.data.modular_vip_section;
                    obj.data.use_modular_vip_section = false;
                }
                else if (url.includes("/x/v2/feed/index/story")) {
                    if (obj?.data?.items?.length > 0) {
                        let newItems = [];
                        for (let item of obj.data.items) {
                            if (item?.hasOwnProperty("ad_info")) {
                                continue;
                            }
                            else if (["vertical_ad_av", "vertical_live", "vertical_pgc"]?.includes(item?.card_goto)) {
                                continue;
                            }
                            else {
                                delete item.creative_entrance;
                                delete item.story_cart_icon;
                                delete item.free_flow_toast;
                                newItems.push(item);
                            }
                        }
                        obj.data.items = newItems;
                    }
                }
                else if (url.includes("/pgc/page/bangumi") || url.includes("/pgc/page/cinema/tab")) {
                    if (obj.result?.modules?.length > 0) {
                        obj.result.modules.forEach((i) => {
                            if (i?.style?.startsWith("banner")) {
                                if (i?.items?.length > 0) {
                                    i.items = i.items.filter((ii) => ii?.link?.includes("play"));
                                }
                            }
                            else if (i?.style?.startsWith("function")) {
                                if (i?.items?.length > 0) {
                                    i.items = i.items.filter((ii) => ii?.blink?.startsWith("bilibili"));
                                }
                            }
                            else if ([241, 1283, 1284, 1441]?.includes(i?.module_id)) {
                                if (i?.items?.length > 0) {
                                    i.items = [];
                                }
                            }
                            else if (i?.style?.startsWith("tip")) {
                                if (i?.items?.length > 0) {
                                    i.items = [];
                                }
                            }
                        });
                    }
                }
                else if (url.includes("/xlive/app-room/v1/index/getInfoByRoom") || url.includes("/xlive/app-room/v1/index/getInfoByUser") || url.includes("/xlive/app-interface/v2/index/feed")) {
                    delete obj.data.play_together_info;
                    delete obj.data.play_together_info_v2;
                    delete obj.data.activity_banner_info;
                    if (obj?.data?.function_card?.length > 0) {
                        obj.data.function_card = null;
                    }
                    const banner_list = ["banner_v2", "activity_card_v1"];
                    if (obj?.data?.card_list?.length > 0) {
                        obj.data.card_list = obj.data.card_list.filter((item) => !banner_list.includes(item.card_type));
                        obj.data.card_list.forEach(card => {
                            if (card?.card_type === 'area_entrance_v3') {
                                const targetList = card?.card_data?.area_entrance_v3?.list;
                                if (targetList && Array.isArray(targetList)) {
                                    card.card_data.area_entrance_v3.list = targetList.filter(item => item?.id === 6);
                                }
                            }
                        });
                    }
                    if (obj?.data?.new_tab_info?.outer_list?.length > 0) {
                        obj.data.new_tab_info.outer_list = obj.data.new_tab_info.outer_list.filter((i) => i?.biz_id !== 33);
                    }
                    if (obj?.data?.show_reserve_status !== undefined) {
                        obj.data.show_reserve_status = false;
                    }
                    if (obj?.data?.reserve_info !== undefined) {
                        obj.data.reserve_info.show_reserve_status = false;
                    }
                    if (obj?.data?.shopping_info !== undefined) {
                        obj.data.shopping_info.is_show = 0;
                    }
                }
                else if (url.includes("/second/getList")) {
                    obj.data.banner = [];
                }
                body = JSON.stringify(obj);
                $done({ body });
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
