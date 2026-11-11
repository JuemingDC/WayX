/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
(function () {
    const __wayxHost = { request: typeof $request === 'undefined' ? undefined : $request, response: typeof $response === 'undefined' ? undefined : $response, done: $done, global: globalThis };
    if ((__wayxHost.response === undefined ? 'request' : 'response') !== "response")
        throw new Error('Unregistered HTTP source/target declaration');
    const __wayxConfig = { "apiPlan": { "target": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": "open-url", "media": "media-url", "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" } }, "argumentSchema": { "kind": "object", "enumValues": {}, "fields": { "tab": "boolean", "useractivity": "boolean" } } };
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
        let argument = undefined;
        if (config.argumentSchema && true && typeof argument === 'string')
            argument = JSON.parse(argument);
        const overlay = {
            $request: request, $response: response, $done: done,
            $argument: argument
        };
        return run.call(host.global, overlay);
    })(__wayxConfig, __wayxHost, function (__wayxScope) {
        return (function ($response, $done, $argument, $request) {
            return (function () {
                200 !== $response.status && $done({}), (() => {
                    "use strict";
                    function e(e, t) { let i = e.success; if (void 0 !== i) {
                        y(t, 10);
                        let e = r();
                        (function (e, t) { let i = e.resolveSuccess; if (void 0 !== i) {
                            y(t, 10);
                            let e = r();
                            (function (e, t) { let i = e.configuration; if (void 0 !== i) {
                                y(t, 10);
                                let e = r();
                                (function (e, t) { let i = e.configurationAssignmentId; void 0 !== i && (y(t, 10), h(t, i)); let l = e.fetchTimeMillis; void 0 !== l && (y(t, 16), V(t, l)); let a = e.assignedValues; if (void 0 !== a)
                                    for (let e of a) {
                                        y(t, 26);
                                        let i = r();
                                        (function (e, t) { let i = e.boolValue; if (void 0 !== i) {
                                            y(t, 26);
                                            let e = r();
                                            (function (e, t) { let i = e.value; void 0 !== i && (y(t, 8), v(t, +!!i)); })(i, e), y(t, e.limit), k(t, e), o(e);
                                        } let l = e.intValue; if (void 0 !== l) {
                                            y(t, 34);
                                            let e = r();
                                            (function (e, t) { var i; let l = e.value; void 0 !== l && (y(t, 8), V(t, { low: i = 0 | l, high: i >> 31, unsigned: i >= 0 })); })(l, e), y(t, e.limit), k(t, e), o(e);
                                        } let a = e.enumValue; if (void 0 !== a) {
                                            y(t, 42);
                                            let e = r();
                                            (function (e, t) { let i = e.value; void 0 !== i && (y(t, 10), h(t, i)); })(a, e), y(t, e.limit), k(t, e), o(e);
                                        } let s = e.propertyId; if (void 0 !== s) {
                                            y(t, 10);
                                            let e = r();
                                            (function (e, t) { let i = e.scope; void 0 !== i && (y(t, 10), h(t, i)); let l = e.name; void 0 !== l && (y(t, 18), h(t, l)); })(s, e), y(t, e.limit), k(t, e), o(e);
                                        } })(e, i), y(t, i.limit), k(t, i), o(i);
                                    } })(i, e), y(t, e.limit), k(t, e), o(e);
                            } })(i, e), y(t, e.limit), k(t, e), o(e);
                        } let l = e.accountAttributesSuccess; if (void 0 !== l) {
                            y(t, 26);
                            let e = r();
                            (function (e, t) { let i = e.accountAttributes; if (void 0 !== i)
                                for (let e in i) {
                                    let l = r(), a = i[e];
                                    y(l, 10), h(l, e), y(l, 18);
                                    let s = r();
                                    (function (e, t) { let i = e.boolValue; void 0 !== i && (y(t, 16), v(t, +!!i)); let l = e.longValue; void 0 !== l && (y(t, 24), V(t, l)); let a = e.stringValue; void 0 !== a && (y(t, 34), h(t, a)); })(a, s), y(l, s.limit), k(l, s), o(s), y(t, 10), y(t, l.offset), k(t, l), o(l);
                                } })(l, e), y(t, e.limit), k(t, e), o(e);
                        } let a = e.fetchTimeMillis; void 0 !== a && (y(t, 40), V(t, a)); })(i, e), y(t, e.limit), k(t, e), o(e);
                    } }
                    function t(e) { let t = {}; e: for (; !f(e);) {
                        let a = p(e);
                        switch (a >>> 3) {
                            case 0: break e;
                            case 1: {
                                let a = i(e);
                                t.success = function (e) { let t = {}; e: for (; !f(e);) {
                                    let a = p(e);
                                    switch (a >>> 3) {
                                        case 0: break e;
                                        case 1: {
                                            let a = i(e);
                                            t.resolveSuccess = function (e) { let t = {}; e: for (; !f(e);) {
                                                let a = p(e);
                                                switch (a >>> 3) {
                                                    case 0: break e;
                                                    case 1: {
                                                        let a = i(e);
                                                        t.configuration = function (e) { let t = {}; e: for (; !f(e);) {
                                                            let a = p(e);
                                                            switch (a >>> 3) {
                                                                case 0: break e;
                                                                case 1:
                                                                    t.configurationAssignmentId = m(e, p(e));
                                                                    break;
                                                                case 2:
                                                                    t.fetchTimeMillis = w(e, !1);
                                                                    break;
                                                                case 3: {
                                                                    let a = i(e);
                                                                    (t.assignedValues || (t.assignedValues = [])).push(function (e) { let t = {}; e: for (; !f(e);) {
                                                                        let a = p(e);
                                                                        switch (a >>> 3) {
                                                                            case 0: break e;
                                                                            case 3: {
                                                                                let a = i(e);
                                                                                t.boolValue = function (e) { let t = {}; e: for (; !f(e);) {
                                                                                    let i = p(e);
                                                                                    switch (i >>> 3) {
                                                                                        case 0: break e;
                                                                                        case 1:
                                                                                            t.value = !!g(e);
                                                                                            break;
                                                                                        default: l(e, 7 & i);
                                                                                    }
                                                                                } return t; }(e), e.limit = a;
                                                                                break;
                                                                            }
                                                                            case 4: {
                                                                                let a = i(e);
                                                                                t.intValue = function (e) { let t = {}; e: for (; !f(e);) {
                                                                                    let i = p(e);
                                                                                    switch (i >>> 3) {
                                                                                        case 0: break e;
                                                                                        case 1:
                                                                                            t.value = p(e);
                                                                                            break;
                                                                                        default: l(e, 7 & i);
                                                                                    }
                                                                                } return t; }(e), e.limit = a;
                                                                                break;
                                                                            }
                                                                            case 5: {
                                                                                let a = i(e);
                                                                                t.enumValue = function (e) { let t = {}; e: for (; !f(e);) {
                                                                                    let i = p(e);
                                                                                    switch (i >>> 3) {
                                                                                        case 0: break e;
                                                                                        case 1:
                                                                                            t.value = m(e, p(e));
                                                                                            break;
                                                                                        default: l(e, 7 & i);
                                                                                    }
                                                                                } return t; }(e), e.limit = a;
                                                                                break;
                                                                            }
                                                                            case 1: {
                                                                                let a = i(e);
                                                                                t.propertyId = function (e) { let t = {}; e: for (; !f(e);) {
                                                                                    let i = p(e);
                                                                                    switch (i >>> 3) {
                                                                                        case 0: break e;
                                                                                        case 1:
                                                                                            t.scope = m(e, p(e));
                                                                                            break;
                                                                                        case 2:
                                                                                            t.name = m(e, p(e));
                                                                                            break;
                                                                                        default: l(e, 7 & i);
                                                                                    }
                                                                                } return t; }(e), e.limit = a;
                                                                                break;
                                                                            }
                                                                            default: l(e, 7 & a);
                                                                        }
                                                                    } return t; }(e)), e.limit = a;
                                                                    break;
                                                                }
                                                                default: l(e, 7 & a);
                                                            }
                                                        } return t; }(e), e.limit = a;
                                                        break;
                                                    }
                                                    default: l(e, 7 & a);
                                                }
                                            } return t; }(e), e.limit = a;
                                            break;
                                        }
                                        case 3: {
                                            let a = i(e);
                                            t.accountAttributesSuccess = function (e) { let t = {}; e: for (; !f(e);) {
                                                let a = p(e);
                                                switch (a >>> 3) {
                                                    case 0: break e;
                                                    case 1: {
                                                        let a, s, r = t.accountAttributes || (t.accountAttributes = {}), o = i(e);
                                                        t: for (; !f(e);) {
                                                            let t = p(e);
                                                            switch (t >>> 3) {
                                                                case 0: break t;
                                                                case 1:
                                                                    a = m(e, p(e));
                                                                    break;
                                                                case 2: {
                                                                    let t = i(e);
                                                                    s = function (e) { let t = {}; e: for (; !f(e);) {
                                                                        let i = p(e);
                                                                        switch (i >>> 3) {
                                                                            case 0: break e;
                                                                            case 2:
                                                                                t.boolValue = !!g(e);
                                                                                break;
                                                                            case 3:
                                                                                t.longValue = w(e, !1);
                                                                                break;
                                                                            case 4:
                                                                                t.stringValue = m(e, p(e));
                                                                                break;
                                                                            default: l(e, 7 & i);
                                                                        }
                                                                    } return t; }(e), e.limit = t;
                                                                    break;
                                                                }
                                                                default: l(e, 7 & t);
                                                            }
                                                        }
                                                        if (void 0 === a || void 0 === s)
                                                            throw Error("Invalid data for map: accountAttributes");
                                                        r[a] = s, e.limit = o;
                                                        break;
                                                    }
                                                    default: l(e, 7 & a);
                                                }
                                            } return t; }(e), e.limit = a;
                                            break;
                                        }
                                        case 5:
                                            t.fetchTimeMillis = w(e, !1);
                                            break;
                                        default: l(e, 7 & a);
                                    }
                                } return t; }(e), e.limit = a;
                                break;
                            }
                            default: l(e, 7 & a);
                        }
                    } return t; }
                    function i(e) { let t = p(e), i = e.limit; return e.limit = e.offset + t, i; }
                    function l(e, t) { switch (t) {
                        case 0:
                            for (; 128 & g(e);)
                                ;
                            break;
                        case 2:
                            u(e, p(e));
                            break;
                        case 5:
                            u(e, 4);
                            break;
                        case 1:
                            u(e, 8);
                            break;
                        default: throw Error("Unimplemented type: " + t);
                    } }
                    let a = (new Uint8Array(new Float32Array(1).buffer), new Float64Array(1)), s = (new Uint8Array(a.buffer), []);
                    function r() { let e = s.pop(); return e ? (e.offset = e.limit = 0, e) : { bytes: new Uint8Array(64), offset: 0, limit: 0 }; }
                    function o(e) { s.push(e); }
                    function n(e) { return { bytes: e, offset: 0, limit: e.length }; }
                    function c(e) { let t = e.bytes, i = e.limit; return t.length === i ? t : t.subarray(0, i); }
                    function u(e, t) { if (e.offset + t > e.limit)
                        throw Error("Skip past limit"); e.offset += t; }
                    function f(e) { return e.offset >= e.limit; }
                    function b(e, t) { let i = e.bytes, l = e.offset, a = e.limit, s = l + t; if (s > i.length) {
                        let t = new Uint8Array(2 * s);
                        t.set(i), e.bytes = t;
                    } return e.offset = s, s > a && (e.limit = s), l; }
                    function d(e, t) { let i = e.offset; if (i + t > e.limit)
                        throw Error("Read past limit"); return e.offset += t, i; }
                    function m(e, t) { let i = d(e, t), l = String.fromCharCode, a = e.bytes, s = ""; for (let e = 0; e < t; e++) {
                        let r = a[e + i], o, n, c, u;
                        (128 & r) == 0 ? s += l(r) : (224 & r) == 192 ? e + 1 >= t || (192 & (o = a[e + i + 1])) != 128 || (u = (31 & r) << 6 | 63 & o) < 128 ? s += "�" : (s += l(u), e++) : (240 & r) == 224 ? e + 2 >= t || (((o = a[e + i + 1]) | (n = a[e + i + 2]) << 8) & 49344) != 32896 || (u = (15 & r) << 12 | (63 & o) << 6 | 63 & n) < 2048 || u >= 55296 && u <= 57343 ? s += "�" : (s += l(u), e += 2) : (248 & r) == 240 ? e + 3 >= t ? s += "�" : (o = a[e + i + 1], ((o | (n = a[e + i + 2]) << 8 | (c = a[e + i + 3]) << 16) & 0xc0c0c0) != 8421504 || (u = (7 & r) << 18 | (63 & o) << 12 | (63 & n) << 6 | 63 & c) < 65536 || u > 1114111 ? s += "�" : (u -= 65536, s += l((u >> 10) + 55296, (1023 & u) + 56320), e += 3)) : s += "�";
                    } return s; }
                    function h(e, t) { let i = t.length, l = 0; for (let e = 0; e < i; e++) {
                        let a = t.charCodeAt(e);
                        a >= 55296 && a <= 56319 && e + 1 < i && (a = (a << 10) + t.charCodeAt(++e) - 0x35fdc00), l += a < 128 ? 1 : a < 2048 ? 2 : a < 65536 ? 3 : 4;
                    } y(e, l); let a = b(e, l), s = e.bytes; for (let e = 0; e < i; e++) {
                        let l = t.charCodeAt(e);
                        l >= 55296 && l <= 56319 && e + 1 < i && (l = (l << 10) + t.charCodeAt(++e) - 0x35fdc00), l < 128 ? s[a++] = l : (l < 2048 ? s[a++] = l >> 6 & 31 | 192 : (l < 65536 ? s[a++] = l >> 12 & 15 | 224 : (s[a++] = l >> 18 & 7 | 240, s[a++] = l >> 12 & 63 | 128), s[a++] = l >> 6 & 63 | 128), s[a++] = 63 & l | 128);
                    } }
                    function k(e, t) { let i = b(e, t.limit), l = e.bytes, a = t.bytes; for (let e = 0, s = t.limit; e < s; e++)
                        l[e + i] = a[e]; }
                    function g(e) { return e.bytes[d(e, 1)]; }
                    function v(e, t) { let i = b(e, 1); e.bytes[i] = t; }
                    function p(e) { let t, i = 0, l = 0; do
                        t = g(e), i < 32 && (l |= (127 & t) << i), i += 7;
                    while (128 & t); return l; }
                    function y(e, t) { for (t >>>= 0; t >= 128;)
                        v(e, 127 & t | 128), t >>>= 7; v(e, t); }
                    function w(e, t) { let i, l = 0, a = 0, s = 0; return l = 127 & (i = g(e)), 128 & i && (l |= (127 & (i = g(e))) << 7, 128 & i && (l |= (127 & (i = g(e))) << 14, 128 & i && (l |= (127 & (i = g(e))) << 21, 128 & i && (a = 127 & (i = g(e)), 128 & i && (a |= (127 & (i = g(e))) << 7, 128 & i && (a |= (127 & (i = g(e))) << 14, 128 & i && (a |= (127 & (i = g(e))) << 21, 128 & i && (s = 127 & (i = g(e)), 128 & i && (s |= (127 & (i = g(e))) << 7))))))))), { low: l | a << 28, high: a >>> 4 | s << 24, unsigned: t }; }
                    function V(e, t) { let i = t.low >>> 0, l = (t.low >>> 28 | t.high << 4) >>> 0, a = t.high >>> 24, s = 0 === a ? 0 === l ? i < 16384 ? i < 128 ? 1 : 2 : i < 2097152 ? 3 : 4 : l < 16384 ? l < 128 ? 5 : 6 : l < 2097152 ? 7 : 8 : a < 128 ? 9 : 10, r = b(e, s), o = e.bytes; switch (s) {
                        case 10: o[r + 9] = a >>> 7 & 1;
                        case 9: o[r + 8] = 9 !== s ? 128 | a : 127 & a;
                        case 8: o[r + 7] = 8 !== s ? l >>> 21 | 128 : l >>> 21 & 127;
                        case 7: o[r + 6] = 7 !== s ? l >>> 14 | 128 : l >>> 14 & 127;
                        case 6: o[r + 5] = 6 !== s ? l >>> 7 | 128 : l >>> 7 & 127;
                        case 5: o[r + 4] = 5 !== s ? 128 | l : 127 & l;
                        case 4: o[r + 3] = 4 !== s ? i >>> 21 | 128 : i >>> 21 & 127;
                        case 3: o[r + 2] = 3 !== s ? i >>> 14 | 128 : i >>> 14 & 127;
                        case 2: o[r + 1] = 2 !== s ? i >>> 7 | 128 : i >>> 7 & 127;
                        case 1: o[r] = 1 !== s ? 128 | i : 127 & i;
                    } }
                    function A(e, t) { for (let i of (Object.assign(t.accountAttributesSuccess.accountAttributes, { ads: { boolValue: !1 }, "com.spotify.madprops.use.ucs.product.state": { boolValue: !0 }, "nft-disabled": { stringValue: "1" }, offline: { boolValue: !0 }, "player-license": { stringValue: "premium" }, "streaming-rules": { stringValue: "" }, type: { stringValue: "premium" }, "publish-playlist": { boolValue: !1 }, name: { stringValue: "Spotify Premium" }, "financial-product": { stringValue: "pr:premium,tc:0" } }), t.resolveSuccess.configuration.assignedValues)) {
                        let { name: t, scope: l } = i.propertyId;
                        "ios-system-your-plan-sidedrawer" === l && "is_row_enabled" === t ? (console.log("ios-system-your-plan-sidedrawer"), console.log(i), i.boolValue.value = !1) : e.tab && "tab_configuration" === t && "ios-feature-navigation" === l ? i.enumValue.value = "" : e.useractivity || "is_useractivity_sharing_enabled" !== t || "ios-feature-share" !== l || (i.boolValue.value = !1);
                    } }
                    try {
                        let a = "string" == typeof $argument ? JSON.parse($argument) : "object" == typeof $argument ? $argument : null, s = function (a, s, u) { if (s.includes("/u")) {
                            let i, l = t(n(u));
                            return A(a, l.success), e(l, i = r()), c(i);
                        } {
                            let s, b = function (e) { let a = {}; e: for (; !f(e);) {
                                let s = p(e);
                                switch (s >>> 3) {
                                    case 0: break e;
                                    case 2: {
                                        let s = i(e);
                                        a.ucsResponseV0 = function (e) { let a = {}; e: for (; !f(e);) {
                                            let s = p(e);
                                            switch (s >>> 3) {
                                                case 0: break e;
                                                case 1: {
                                                    let s = i(e);
                                                    a.success = function (e) { let a = {}; e: for (; !f(e);) {
                                                        let s = p(e);
                                                        switch (s >>> 3) {
                                                            case 0: break e;
                                                            case 1: {
                                                                let l = i(e);
                                                                a.customization = t(e), e.limit = l;
                                                                break;
                                                            }
                                                            default: l(e, 7 & s);
                                                        }
                                                    } return a; }(e), e.limit = s;
                                                    break;
                                                }
                                                default: l(e, 7 & s);
                                            }
                                        } return a; }(e), e.limit = s;
                                        break;
                                    }
                                    default: l(e, 7 & s);
                                }
                            } return a; }(n(u));
                            return A(a, b.ucsResponseV0.success.customization.success), function (t, i) { let l = t.ucsResponseV0; if (void 0 !== l) {
                                y(i, 18);
                                let t = r();
                                (function (t, i) { let l = t.success; if (void 0 !== l) {
                                    y(i, 10);
                                    let t = r();
                                    (function (t, i) { let l = t.customization; if (void 0 !== l) {
                                        y(i, 10);
                                        let t = r();
                                        e(l, t), y(i, t.limit), k(i, t), o(t);
                                    } })(l, t), y(i, t.limit), k(i, t), o(t);
                                } })(l, t), y(i, t.limit), k(i, t), o(t);
                            } }(b, s = r()), c(s);
                        } }(a, $request.url, $response.body);
                        $done({ body: s });
                    }
                    catch (e) {
                        console.log(e.message), $done({});
                    }
                })();
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done), Object.prototype.hasOwnProperty.call(__wayxScope, "$argument") ? __wayxScope["$argument"] : (typeof $argument === 'undefined' ? undefined : $argument), Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request));
    });
})();
