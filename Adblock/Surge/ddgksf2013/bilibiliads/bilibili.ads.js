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
                const name = "bilibili.ads.js";
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
        return (function ($response, $request, $done) {
            return (function () {
                const version = 'V2.0.124';
                let body = $response.body;
                if (body) {
                    switch (!0) {
                        case /pgc\/season\/app\/related\/recommend\?/.test($request.url):
                            try {
                                let a = JSON.parse(body);
                                a.result?.cards?.length && (a.result.cards = a.result.cards.filter(a => 2 != a.type)), body = JSON.stringify(a);
                            }
                            catch (a) {
                                console.log(`bilibili recommend:` + a);
                            }
                            break;
                        case /^https?:\/\/app\.bilibili\.com\/x\/resource\/show\/skin\?/.test($request.url):
                            try {
                                let a = JSON.parse(body);
                                delete a.data?.common_equip, body = JSON.stringify(a);
                            }
                            catch (a) {
                                console.log(`bilibili skin:` + a);
                            }
                            break;
                        case /^https:\/\/app\.bilibili\.com\/x\/v2\/feed\/index\?/.test($request.url):
                            try {
                                let a = JSON.parse(body), b = [];
                                for (let c of a.data.items)
                                    if (c.hasOwnProperty("banner_item"))
                                        continue;
                                    else if (!c.hasOwnProperty("ad_info") && -1 === c.card_goto?.indexOf("ad") && ["small_cover_v2", "large_cover_v1", "large_cover_single_v9"].includes(c.card_type))
                                        b.push(c);
                                    else
                                        continue;
                                a.data.items = b, body = JSON.stringify(a);
                            }
                            catch (a) {
                                console.log(`bilibili index:` + a);
                            }
                            break;
                        case /^https?:\/\/app\.bilibili\.com\/x\/v2\/feed\/index\/story\?/.test($request.url):
                            try {
                                let a = JSON.parse(body), b = [];
                                for (let c of a.data.items)
                                    c.hasOwnProperty("ad_info") || -1 !== c.card_goto.indexOf("ad") || b.push(c);
                                a.data.items = b, body = JSON.stringify(a);
                            }
                            catch (a) {
                                console.log(`bilibili Story:` + a);
                            }
                            break;
                        case /^https?:\/\/app\.bilibili\.com\/x\/v\d\/account\/teenagers\/status\?/.test($request.url):
                            try {
                                let a = JSON.parse(body);
                                a.data.teenagers_status = 0, body = JSON.stringify(a);
                            }
                            catch (a) {
                                console.log(`bilibili teenagers:` + a);
                            }
                            break;
                        case /^https?:\/\/app\.bilibili\.com\/x\/resource\/show\/tab/.test($request.url):
                            try {
                                const a = new Set([177, 178, 179, 181, 102, 104, 106, 486, 488, 489]);
                                let b = JSON.parse(body);
                                if (b.data?.tab) {
                                    var dataTab = [];
                                    dataTab.push({ id: 39, name: "\u76F4\u64AD", uri: "bilibili://live/home", tab_id: "\u76F4\u64ADtab", pos: 1 }, { id: 40, name: "\u63A8\u8350", uri: "bilibili://pegasus/promo", tab_id: "\u63A8\u8350tab", pos: 2, default_selected: 1 }), -1 == JSON.stringify(b.data.tab).indexOf("pgc/home") ? dataTab.push({ id: 774, name: "\u756A\u5267", uri: "bilibili://following/home_activity_tab/6544", tab_id: "bangumi", pos: 3 }) : dataTab.push({ id: 545, name: "\u756A\u5267", uri: "bilibili://pgc/home", tab_id: "bangumi", pos: 3 }), dataTab.push({ id: 41, name: "\u70ED\u95E8", uri: "bilibili://pegasus/hottopic", tab_id: "hottopic", pos: 4 }, { id: 151, name: "\u5F71\u89C6", uri: "bilibili://pgc/cinema-tab", tab_id: "film", pos: 5 }), b.data.tab = dataTab;
                                }
                                if (b.data.top && (b.data.top = [{ id: 481, icon: "http://i0.hdslb.com/bfs/archive/d43047538e72c9ed8fd8e4e34415fbe3a4f632cb.png", name: "\u6D88\u606F", uri: "bilibili://link/im_home", tab_id: "\u6D88\u606FTop", pos: 1 }]), b.data.bottom) {
                                    let c = b.data.bottom.filter(b => a.has(b.id));
                                    b.data.bottom = c;
                                }
                                body = JSON.stringify(b);
                            }
                            catch (a) {
                                console.log(`bilibili tabprocess:` + a);
                            }
                            break;
                        case /^https?:\/\/app\.bilibili\.com\/x\/v2\/account\/mine/.test($request.url):
                            try {
                                let a = JSON.parse(body);
                                const b = new Set([396, 397, 398, 399, 407, 410, 402, 404, 425, 426, 427, 428, 430, 432, 433, 434, 494, 495, 496, 497, 500, 501, 2830, 3072, 3084]);
                                a.data.sections_v2.forEach((c, d) => { let e = c.items.filter(a => b.has(a.id)); a.data.sections_v2[d].items = e, a.data.sections_v2[d].button = {}, delete a.data.sections_v2[d].be_up_title, delete a.data.sections_v2[d].tip_icon, delete a.data.sections_v2[d].tip_title, ("\u521B\u4F5C\u4E2D\u5FC3" == a.data.sections_v2[d].title || "\u5275\u4F5C\u4E2D\u5FC3" == a.data.sections_v2[d].title) && (delete a.data.sections_v2[d].title, delete a.data.sections_v2[d].type); }), delete a.data.vip_section_v2, delete a.data.vip_section, a.data.hasOwnProperty("live_tip") && (a.data.live_tip = {}), a.data.hasOwnProperty("answer") && (a.data.answer = {}), a.data.vip.status || (a.data.vip_type = 2, a.data.vip.type = 2, a.data.vip.status = 1, a.data.vip.vip_pay_type = 1, a.data.vip.due_date = 466982416e4), body = JSON.stringify(a);
                            }
                            catch (a) {
                                console.log(`bilibili mypage:` + a);
                            }
                            break;
                        case /^https?:\/\/api\.live\.bilibili\.com\/xlive\/app-room\/v1\/index\/getInfoByRoom/.test($request.url):
                            try {
                                let a = JSON.parse(body);
                                a.data.activity_banner_info = null, a.data?.shopping_info && (a.data.shopping_info = { is_show: 0 }), a.data?.new_tab_info?.outer_list && a.data.new_tab_info.outer_list.length && (a.data.new_tab_info.outer_list = a.data.new_tab_info.outer_list.filter(a => 33 != a.biz_id)), body = JSON.stringify(a);
                            }
                            catch (a) {
                                console.log(`bilibili live broadcast:` + a);
                            }
                            break;
                        case /^https?:\/\/app\.bilibili\.com\/x\/resource\/top\/activity/.test($request.url):
                            try {
                                let a = JSON.parse(body);
                                a.data && (a.data.hash = "ddgksf2013", a.data.online.icon = ""), body = JSON.stringify(a);
                            }
                            catch (a) {
                                console.log(`bilibili right corner:` + a);
                            }
                            break;
                        case /ecommerce-user\/get_shopping_info\?/.test($request.url):
                            try {
                                let a = JSON.parse(body);
                                a.data && (a.data = { shopping_card_detail: {}, bubbles_detail: {}, recommend_card_detail: {}, selected_goods: {}, h5jump_popup: [] }), body = JSON.stringify(a);
                            }
                            catch (a) {
                                console.log(`bilibili shopping info:` + a);
                            }
                            break;
                        case /^https?:\/\/app\.bilibili\.com\/x\/v2\/search\/square/.test($request.url):
                            try {
                                let a = JSON.parse(body);
                                a.data = { type: "history", title: "\u641C\u7D22\u5386\u53F2", search_hotword_revision: 2 }, body = JSON.stringify(a);
                            }
                            catch (a) {
                                console.log(`bilibili hot search:` + a);
                            }
                            break;
                        case /https?:\/\/app\.bilibili\.com\/x\/v2\/account\/myinfo\?/.test($request.url):
                            try {
                                let a = JSON.parse(body);
                                a.data.vip.status || (a.data.vip.type = 2, a.data.vip.status = 1, a.data.vip.vip_pay_type = 1, a.data.vip.due_date = 466982416e4), body = JSON.stringify(a);
                            }
                            catch (a) {
                                console.log(`bilibili 1080p:` + a);
                            }
                            break;
                        case /pgc\/page\/(bangumi|cinema\/tab\?)/.test($request.url):
                            try {
                                let a = JSON.parse(body);
                                a.result.modules.forEach(a => { a.style.startsWith("banner") && (a.items = a.items.filter(a => -1 != a.link.indexOf("play"))), a.style.startsWith("function") && (a.items = a.items.filter(a => -1 == a.blink.indexOf("bilibili.com")), [1283, 241, 1441, 1284].includes(a.module_id) && (a.items = [])), a.style.startsWith("tip") && (a.items = []); }), body = JSON.stringify(a);
                            }
                            catch (a) {
                                console.log(`bilibili fanju:` + a);
                            }
                            break;
                        case /^https:\/\/app\.bilibili\.com\/x\/v2\/splash\/list/.test($request.url):
                            try {
                                let a = JSON.parse(body);
                                if (a.data && a.data.list)
                                    for (let b of a.data.list)
                                        b.duration = 0, b.begin_time = 2240150400, b.end_time = 2240150400;
                                if (a.data && a.data.show)
                                    for (let b of a.data.show)
                                        b.duration = 0, b.stime = 2240150400, b.etime = 2240150400;
                                body = JSON.stringify(a);
                            }
                            catch (a) {
                                console.log(`bilibili openad:` + a);
                            }
                            break;
                        case /^https:\/\/api\.live\.bilibili\.com\/xlive\/app-interface\/v2\/index\/feed/.test($request.url):
                            try {
                                let a = JSON.parse(body);
                                a.data && a.data.card_list && (a.data.card_list = a.data.card_list.filter(a => "banner_v1" != a.card_type)), body = JSON.stringify(a);
                            }
                            catch (a) {
                                console.log(`bilibili xlive:` + a);
                            }
                            break;
                        default: $done({});
                    }
                    $done({ body });
                }
                else
                    $done({});
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
