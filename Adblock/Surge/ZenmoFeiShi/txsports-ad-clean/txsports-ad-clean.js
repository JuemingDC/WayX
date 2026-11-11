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
                const name = "txsports-ad-clean.js";
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
                (function () {
                    function tsqxVarint(b, p) {
                        var n = 0, m = 1, i, x;
                        for (i = 0; i < 5 && p < b.length; i++) {
                            x = b[p++];
                            n += (x & 127) * m;
                            if (!(x & 128)) {
                                if (n > 4294967295)
                                    throw new Error("varint");
                                return { n: n, p: p };
                            }
                            m *= 128;
                        }
                        throw new Error("varint");
                    }
                    function tsqxFields(b) {
                        var out = [], p = 0, t, n, w, s, a, z, i;
                        while (p < b.length) {
                            if (out.length >= 10000)
                                throw new Error("fields");
                            s = p;
                            t = tsqxVarint(b, p);
                            p = t.p;
                            n = Math.floor(t.n / 8);
                            w = t.n % 8;
                            if (!n)
                                throw new Error("tag");
                            if (w === 2) {
                                t = tsqxVarint(b, p);
                                a = t.p;
                                z = a + t.n;
                                p = z;
                            }
                            else if (w === 0) {
                                a = p;
                                for (i = 0; i < 10; i++) {
                                    if (p >= b.length)
                                        throw new Error("bounds");
                                    if (!(b[p++] & 128))
                                        break;
                                }
                                if (i === 10)
                                    throw new Error("varint64");
                                z = p;
                            }
                            else if (w === 1 || w === 5) {
                                a = p;
                                z = p + (w === 1 ? 8 : 4);
                                p = z;
                            }
                            else {
                                throw new Error("wire");
                            }
                            if (p > b.length)
                                throw new Error("bounds");
                            out.push({ n: n, w: w, s: s, e: p, a: a, z: z });
                        }
                        return out;
                    }
                    function tsqxText(b) {
                        var s = "", i;
                        for (i = 0; i < b.length; i++) {
                            if (b[i] > 127)
                                return null;
                            s += String.fromCharCode(b[i]);
                        }
                        return s;
                    }
                    function tsqxEncode(s) {
                        var b = new Uint8Array(s.length), i;
                        for (i = 0; i < s.length; i++)
                            b[i] = s.charCodeAt(i);
                        return b;
                    }
                    function tsqxJoin(parts) {
                        var n = 0, i, p = 0, b;
                        for (i = 0; i < parts.length; i++)
                            n += parts[i].length;
                        if (n > 2097152)
                            throw new Error("size");
                        b = new Uint8Array(n);
                        for (i = 0; i < parts.length; i++) {
                            b.set(parts[i], p);
                            p += parts[i].length;
                        }
                        return b;
                    }
                    function tsqxUnsigned(n) {
                        var a = [];
                        while (n >= 128) {
                            a.push((n % 128) + 128);
                            n = Math.floor(n / 128);
                        }
                        a.push(n);
                        return new Uint8Array(a);
                    }
                    function tsqxPack(n, b) {
                        return tsqxJoin([tsqxUnsigned(n * 8 + 2), tsqxUnsigned(b.length), b]);
                    }
                    function tsqxString(n, s) {
                        return tsqxPack(n, tsqxEncode(s));
                    }
                    function tsqxKey(b, fs) {
                        var key = null, i, f;
                        for (i = 0; i < fs.length; i++) {
                            f = fs[i];
                            if (f.n === 1 && f.w === 2) {
                                if (key !== null)
                                    throw new Error("duplicate-key");
                                key = tsqxText(b.subarray(f.a, f.z));
                            }
                        }
                        return key;
                    }
                    function tsqxValue(b, key, wanted) {
                        var fs = tsqxFields(b), chunks = [], count = 0, changed = false, i, f, v;
                        for (i = 0; i < fs.length; i++) {
                            f = fs[i];
                            if (f.n === 4 && f.w === 2 && tsqxText(b.subarray(f.a, f.z)) !== key) {
                                throw new Error("name");
                            }
                            if (f.n === 1 && f.w === 2) {
                                count++;
                                v = tsqxText(b.subarray(f.a, f.z));
                                if (v !== wanted) {
                                    chunks.push(tsqxString(1, wanted));
                                    changed = true;
                                    continue;
                                }
                            }
                            chunks.push(b.subarray(f.s, f.e));
                        }
                        if (!count)
                            throw new Error("value");
                        return changed ? tsqxJoin(chunks) : b;
                    }
                    function tsqxEntry(b, fs, key, wanted) {
                        var chunks = [], count = 0, changed = false, i, f, old, next;
                        for (i = 0; i < fs.length; i++) {
                            f = fs[i];
                            if (f.n === 2 && f.w === 2) {
                                count++;
                                old = b.subarray(f.a, f.z);
                                next = tsqxValue(old, key, wanted);
                                if (next !== old) {
                                    chunks.push(tsqxPack(2, next));
                                    changed = true;
                                    continue;
                                }
                            }
                            chunks.push(b.subarray(f.s, f.e));
                        }
                        if (count !== 1)
                            throw new Error("entry");
                        return changed ? tsqxJoin(chunks) : b;
                    }
                    function tsqxNewEntry(key, value) {
                        return tsqxPack(3, tsqxJoin([
                            tsqxString(1, key),
                            tsqxPack(2, tsqxJoin([tsqxString(1, value), tsqxString(4, key)]))
                        ]));
                    }
                    function tsqxHeaderUserAgent() {
                        var hs = $request.headers || {}, h;
                        for (h in hs)
                            if (h.toLowerCase() === "user-agent")
                                return String(hs[h]);
                        return "";
                    }
                    function tsqxXmlRun(url) {
                        var raw, ua, out;
                        if (!/^https?:\/\/k\.ssp\.qq\.com\/getsdkconfig(?:\?|$)/.test(url))
                            return {};
                        ua = tsqxHeaderUserAgent();
                        if (!/^QQSportsV3\//i.test(ua))
                            return {};
                        raw = $response.body;
                        if (typeof raw !== "string" || !raw)
                            return {};
                        out = raw.replace(/(<key>adOn<\/key>\s*<string>)YES(<\/string>)/g, "$1NO$2");
                        out = out.replace(/(<key>gdtAdOn<\/key>\s*<string>)YES(<\/string>)/g, "$1NO$2");
                        return out !== raw ? { body: out } : {};
                    }
                    function tsqxClearAdInfos(a) {
                        var i, x, changed = false;
                        if (!Array.isArray(a))
                            return false;
                        for (i = 0; i < a.length; i++) {
                            x = a[i];
                            if (x && typeof x === "object" && Array.isArray(x.adInfos) && x.adInfos.length) {
                                x.adInfos = [];
                                changed = true;
                            }
                        }
                        return changed;
                    }
                    function tsqxDropMyModules(a) {
                        var drop = { "804": true, "810": true, "816": true, "817": true }, keep = [], i, x, t;
                        if (!Array.isArray(a))
                            return false;
                        for (i = 0; i < a.length; i++) {
                            x = a[i];
                            t = x && Number(x.moduleType);
                            if (drop[String(t)])
                                continue;
                            keep.push(x);
                        }
                        if (keep.length === a.length)
                            return false;
                        a.length = 0;
                        for (i = 0; i < keep.length; i++)
                            a.push(keep[i]);
                        return true;
                    }
                    function tsqxDropHotRaceRail(a) {
                        var keep = [], i, x, t, hit = false;
                        if (!Array.isArray(a))
                            return false;
                        for (i = 0; i < a.length; i++) {
                            x = a[i];
                            t = x && typeof x === "object" ? Number(x.type) : NaN;
                            if (t === 1120) {
                                hit = true;
                                continue;
                            }
                            keep.push(x);
                        }
                        if (!hit)
                            return false;
                        a.length = 0;
                        for (i = 0; i < keep.length; i++)
                            a.push(keep[i]);
                        return true;
                    }
                    function tsqxSspTargetRequest() {
                        var raw = $request.body, req, a, i, slot, hit = false;
                        if (typeof raw !== "string" || !raw)
                            return false;
                        try {
                            req = JSON.parse(raw);
                        }
                        catch (e) {
                            return false;
                        }
                        a = req && req.adReqData;
                        if (!a || a.adtype !== 7 || a.chid !== 5 || String(a.launch) !== "0" || !Array.isArray(a.slot))
                            return false;
                        for (i = 0; i < a.slot.length; i++) {
                            slot = a.slot[i];
                            if (slot && String(slot.loid) === "71,73")
                                hit = true;
                        }
                        return hit;
                    }
                    function tsqxJsonRun(url) {
                        var raw = $response.body, o, d, inner, changed = false, i;
                        if (typeof raw !== "string" || !raw)
                            return {};
                        try {
                            o = JSON.parse(raw);
                        }
                        catch (e) {
                            return {};
                        }
                        if (/^https?:\/\/app\.sports\.qq\.com\/init\/config(?:\?|$)/.test(url)) {
                            d = o && o.data;
                            if (!d || typeof d !== "object" || !d.middleIcon || typeof d.middleIcon !== "object")
                                return {};
                            if (String(d.middleIcon.isAble) === "0")
                                return {};
                            d.middleIcon.isAble = "0";
                            return { body: JSON.stringify(o) };
                        }
                        if (/^https?:\/\/app\.sports\.qq\.com\/user\/homePageV2(?:\?|$)/.test(url)) {
                            d = o && o.data;
                            if (!d || typeof d !== "object" || !tsqxDropMyModules(d.moduleList))
                                return {};
                            return { body: JSON.stringify(o) };
                        }
                        if (/^https?:\/\/app\.sports\.qq\.com\/m\/match\/liveSum(?:\?|$)/.test(url)) {
                            d = o && o.data;
                            if (!d || typeof d !== "object")
                                return {};
                            if (Number(d.sum) === 0 && d.mids && typeof d.mids === "object" && Object.keys(d.mids).length === 0)
                                return {};
                            d.sum = 0;
                            d.mids = {};
                            return { body: JSON.stringify(o) };
                        }
                        if (/^https?:\/\/app\.sports\.qq\.com\/match\/multiUpdate(?:\?|$)/.test(url)) {
                            d = o && o.data;
                            if (!d || typeof d !== "object" || Array.isArray(d))
                                return {};
                            for (i in d) {
                                if (d[i] && typeof d[i] === "object" && d[i].matchInfo) {
                                    o.data = {};
                                    return { body: JSON.stringify(o) };
                                }
                            }
                            return {};
                        }
                        if (/^https?:\/\/app\.sports\.qq\.com\/feeds\/(?:home|list)(?:\?|$)/.test(url)) {
                            d = o && o.data;
                            if (!d || typeof d !== "object")
                                return {};
                            if (Array.isArray(d.topItem) && tsqxDropHotRaceRail(d.topItem))
                                changed = true;
                            if (/^https?:\/\/app\.sports\.qq\.com\/feeds\/home(?:\?|$)/.test(url) && Array.isArray(d.hotWords) && d.hotWords.length) {
                                d.hotWords = [];
                                changed = true;
                            }
                            if (/^https?:\/\/app\.sports\.qq\.com\/feeds\/home(?:\?|$)/.test(url) && Object.prototype.hasOwnProperty.call(d, "coinIcon")) {
                                delete d.coinIcon;
                                changed = true;
                            }
                            if (typeof d.adList === "string" && d.adList !== "") {
                                d.adList = "";
                                changed = true;
                            }
                            if (tsqxClearAdInfos(d.list))
                                changed = true;
                            if (tsqxClearAdInfos(d.topItem))
                                changed = true;
                            return changed ? { body: JSON.stringify(o) } : {};
                        }
                        if (/^https?:\/\/sports\.ssp\.qq\.com\/app(?:\?|$)/.test(url)) {
                            if (!tsqxSspTargetRequest() || !o || typeof o.adList !== "string" || !o.adList)
                                return {};
                            try {
                                inner = JSON.parse(o.adList);
                            }
                            catch (e2) {
                                return {};
                            }
                            if (!inner || !Array.isArray(inner.index) || !inner.index.length || !Array.isArray(inner.order) || !inner.order.length)
                                return {};
                            for (i = 0; i < inner.index.length; i++) {
                                if (!inner.index[i] || Number(inner.index[i].channel_id) !== 7247)
                                    return {};
                            }
                            inner.order = [];
                            o.adList = JSON.stringify(inner);
                            return { body: JSON.stringify(o) };
                        }
                        return {};
                    }
                    function tsqxRun() {
                        if (typeof $request === "undefined" || typeof $response === "undefined")
                            return {};
                        var tsqxUrl = $request.url || "";
                        if (/^https?:\/\/k\.ssp\.qq\.com\/getsdkconfig(?:\?|$)/.test(tsqxUrl))
                            return tsqxXmlRun(tsqxUrl);
                        if (/^https?:\/\/app\.sports\.qq\.com\/(?:init\/config|user\/homePageV2|m\/match\/liveSum|match\/multiUpdate|feeds\/(?:home|list))(?:\?|$)|^https?:\/\/sports\.ssp\.qq\.com\/app(?:\?|$)/.test(tsqxUrl))
                            return tsqxJsonRun(tsqxUrl);
                        if (!/^https?:\/\/config\.ab\.qq\.com\/tab\/GetTabRemoteConfig(?:\?|$)/.test(tsqxUrl))
                            return {};
                        var hs = $request.headers || {}, ua = "", h, raw, b;
                        for (h in hs)
                            if (h.toLowerCase() === "user-agent")
                                ua = String(hs[h]);
                        if (!/^QQSportsV3\//i.test(ua))
                            return {};
                        if ($response.statusCode && $response.statusCode !== 200)
                            return {};
                        raw = $response.bodyBytes;
                        if (!raw)
                            return {};
                        if (Object.prototype.toString.call(raw) === "[object ArrayBuffer]") {
                            b = new Uint8Array(raw);
                        }
                        else if (ArrayBuffer.isView(raw)) {
                            b = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
                        }
                        else {
                            return {};
                        }
                        if (!b.length || b.length > 2097152)
                            return {};
                        var values = { iqad_splash_forbid_splash: "1", teenager_guide_show_interval: "36500" };
                        var fs = tsqxFields(b), code = null, maps = 0, i, f, sub, ef, key, next;
                        var seen = {}, chunks = [], changed = false;
                        for (i = 0; i < fs.length; i++) {
                            f = fs[i];
                            if (f.n === 1 && f.w === 0)
                                code = tsqxVarint(b, f.a).n;
                            if (f.n === 3 && f.w === 2)
                                maps++;
                        }
                        if (code !== 100 || !maps)
                            return {};
                        for (i = 0; i < fs.length; i++) {
                            f = fs[i];
                            if (f.n === 3 && f.w === 2) {
                                sub = b.subarray(f.a, f.z);
                                ef = tsqxFields(sub);
                                key = tsqxKey(sub, ef);
                                if (Object.prototype.hasOwnProperty.call(values, key)) {
                                    seen[key] = true;
                                    next = tsqxEntry(sub, ef, key, values[key]);
                                    if (next !== sub) {
                                        chunks.push(tsqxPack(3, next));
                                        changed = true;
                                        continue;
                                    }
                                }
                            }
                            chunks.push(b.subarray(f.s, f.e));
                        }
                        for (key in values) {
                            if (!seen[key]) {
                                chunks.push(tsqxNewEntry(key, values[key]));
                                changed = true;
                            }
                        }
                        return changed ? { bodyBytes: tsqxJoin(chunks).buffer } : {};
                    }
                    var tsqxOutput = {};
                    try {
                        tsqxOutput = tsqxRun();
                    }
                    catch (tsqxError) { }
                    $done(tsqxOutput);
                })();
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
