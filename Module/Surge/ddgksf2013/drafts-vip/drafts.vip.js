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
                const name = "drafts.vip.js";
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
                var _0xodk = 'jsjiami.com.v7';
                const _0xcb90c5 = _0x80fb;
                (function (_0x1e8082, _0x263f48, _0x5df862, _0x3d7576, _0x45dcb3, _0x29ae08, _0x4ef737) { return _0x1e8082 = _0x1e8082 >> 0x9, _0x29ae08 = 'hs', _0x4ef737 = 'hs', function (_0x2dfca0, _0x2a0433, _0x2f5d69, _0x248de, _0x54ee97) { const _0x1f643b = _0x80fb; _0x248de = 'tfi', _0x29ae08 = _0x248de + _0x29ae08, _0x54ee97 = 'up', _0x4ef737 += _0x54ee97, _0x29ae08 = _0x2f5d69(_0x29ae08), _0x4ef737 = _0x2f5d69(_0x4ef737), _0x2f5d69 = 0x0; const _0x2d8e0e = _0x2dfca0(); while (!![] && --_0x3d7576 + _0x2a0433) {
                    try {
                        _0x248de = -parseInt(_0x1f643b(0x11e, 'zww3')) / 0x1 * (parseInt(_0x1f643b(0x109, '&pbg')) / 0x2) + -parseInt(_0x1f643b(0x122, 'D6tJ')) / 0x3 + parseInt(_0x1f643b(0x116, 'WLdS')) / 0x4 * (parseInt(_0x1f643b(0x10e, 'so37')) / 0x5) + -parseInt(_0x1f643b(0x123, '37O#')) / 0x6 + -parseInt(_0x1f643b(0x10c, 'jYwM')) / 0x7 * (parseInt(_0x1f643b(0x115, 'jYwM')) / 0x8) + -parseInt(_0x1f643b(0x110, '1[4(')) / 0x9 + parseInt(_0x1f643b(0x10f, 'L3%$')) / 0xa;
                    }
                    catch (_0xdfec17) {
                        _0x248de = _0x2f5d69;
                    }
                    finally {
                        _0x54ee97 = _0x2d8e0e[_0x29ae08]();
                        if (_0x1e8082 <= _0x3d7576)
                            _0x2f5d69 ? _0x45dcb3 ? _0x248de = _0x54ee97 : _0x45dcb3 = _0x54ee97 : _0x2f5d69 = _0x54ee97;
                        else {
                            if (_0x2f5d69 == _0x45dcb3['replace'](/[AnlhwLFyYSXuprHPIMT=]/g, '')) {
                                if (_0x248de === _0x2a0433) {
                                    _0x2d8e0e['un' + _0x29ae08](_0x54ee97);
                                    break;
                                }
                                _0x2d8e0e[_0x4ef737](_0x54ee97);
                            }
                        }
                    }
                } }(_0x5df862, _0x263f48, function (_0x1cd4f6, _0x426acc, _0x3c8a07, _0x564fbb, _0xab3a9a, _0x519142, _0x12bdce) { return _0x426acc = '\x73\x70\x6c\x69\x74', _0x1cd4f6 = arguments[0x0], _0x1cd4f6 = _0x1cd4f6[_0x426acc](''), _0x3c8a07 = '\x72\x65\x76\x65\x72\x73\x65', _0x1cd4f6 = _0x1cd4f6[_0x3c8a07]('\x76'), _0x564fbb = '\x6a\x6f\x69\x6e', (0x1c0dac, _0x1cd4f6[_0x564fbb]('')); }); }(0x18400, 0x97d37, _0x2e6c, 0xc4), _0x2e6c) && (_0xodk = _0x2e6c);
                function _0x80fb(_0x31b574, _0x30a902) { const _0x2e6c79 = _0x2e6c(); return _0x80fb = function (_0x80fb81, _0x66f396) { _0x80fb81 = _0x80fb81 - 0x108; let _0x536bbd = _0x2e6c79[_0x80fb81]; if (_0x80fb['xSJScQ'] === undefined) {
                    var _0x5e00d6 = function (_0x1c5d1c) { const _0x290f66 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; let _0x33433f = '', _0x1bb647 = ''; for (let _0x4987e3 = 0x0, _0x273278, _0x2d0141, _0x58fdd9 = 0x0; _0x2d0141 = _0x1c5d1c['charAt'](_0x58fdd9++); ~_0x2d0141 && (_0x273278 = _0x4987e3 % 0x4 ? _0x273278 * 0x40 + _0x2d0141 : _0x2d0141, _0x4987e3++ % 0x4) ? _0x33433f += String['fromCharCode'](0xff & _0x273278 >> (-0x2 * _0x4987e3 & 0x6)) : 0x0) {
                        _0x2d0141 = _0x290f66['indexOf'](_0x2d0141);
                    } for (let _0x35c109 = 0x0, _0x358849 = _0x33433f['length']; _0x35c109 < _0x358849; _0x35c109++) {
                        _0x1bb647 += '%' + ('00' + _0x33433f['charCodeAt'](_0x35c109)['toString'](0x10))['slice'](-0x2);
                    } return decodeURIComponent(_0x1bb647); };
                    const _0x385edf = function (_0x281eae, _0x60d171) { let _0x46c47c = [], _0x2f70e5 = 0x0, _0x48c8e5, _0x13a796 = ''; _0x281eae = _0x5e00d6(_0x281eae); let _0x1f38ea; for (_0x1f38ea = 0x0; _0x1f38ea < 0x100; _0x1f38ea++) {
                        _0x46c47c[_0x1f38ea] = _0x1f38ea;
                    } for (_0x1f38ea = 0x0; _0x1f38ea < 0x100; _0x1f38ea++) {
                        _0x2f70e5 = (_0x2f70e5 + _0x46c47c[_0x1f38ea] + _0x60d171['charCodeAt'](_0x1f38ea % _0x60d171['length'])) % 0x100, _0x48c8e5 = _0x46c47c[_0x1f38ea], _0x46c47c[_0x1f38ea] = _0x46c47c[_0x2f70e5], _0x46c47c[_0x2f70e5] = _0x48c8e5;
                    } _0x1f38ea = 0x0, _0x2f70e5 = 0x0; for (let _0x2b21fa = 0x0; _0x2b21fa < _0x281eae['length']; _0x2b21fa++) {
                        _0x1f38ea = (_0x1f38ea + 0x1) % 0x100, _0x2f70e5 = (_0x2f70e5 + _0x46c47c[_0x1f38ea]) % 0x100, _0x48c8e5 = _0x46c47c[_0x1f38ea], _0x46c47c[_0x1f38ea] = _0x46c47c[_0x2f70e5], _0x46c47c[_0x2f70e5] = _0x48c8e5, _0x13a796 += String['fromCharCode'](_0x281eae['charCodeAt'](_0x2b21fa) ^ _0x46c47c[(_0x46c47c[_0x1f38ea] + _0x46c47c[_0x2f70e5]) % 0x100]);
                    } return _0x13a796; };
                    _0x80fb['YnenSO'] = _0x385edf, _0x31b574 = arguments, _0x80fb['xSJScQ'] = !![];
                } const _0x5a15a8 = _0x2e6c79[0x0], _0x3d3960 = _0x80fb81 + _0x5a15a8, _0x526d4c = _0x31b574[_0x3d3960]; return !_0x526d4c ? (_0x80fb['eOkYpS'] === undefined && (_0x80fb['eOkYpS'] = !![]), _0x536bbd = _0x80fb['YnenSO'](_0x536bbd, _0x66f396), _0x31b574[_0x3d3960] = _0x536bbd) : _0x536bbd = _0x526d4c, _0x536bbd; }, _0x80fb(_0x31b574, _0x30a902); }
                let url = $request[_0xcb90c5(0x11d, 'bXoo')], body = $response[_0xcb90c5(0x10d, 'L3%$')];
                function _0x2e6c() { const _0x982bbe = (function () { return [_0xodk, 'hyMrjulsXjyiHaXmSiwY.TwPcAFoImpM.hLMvXn7==', 'DmoaWP0', 'WOdcTLSFWQ3dImkTtMTP', 'WOT5W4uucmo4na', 'W7FcVCkYgHtdKSo4', 'W4GLWODnumkQzYLGW7Dyb1K', 'v8omdbHBW5BcVZOPWOBdQ8oyWPm', 'W54JmSkMfSoQA8oBWQiFDx3dPG', 'imknW6xdHCoimSk0', 'WP/dTvije8koqvFdTmoiW6VdVSoxW5q', 'vxev'].concat((function () { return ['WOWFpXRdSSoOWPS5W413W67cLmkcW4tcHmk5zmoUhmkI', 'ddNdKbxdVqzH', 'y8ozWQBcNCoTj8k7WQtdVxG', 'smk/W7BdRWbFkW', 'mSo7WQxcR8kCqIFcJSoHbmoL', 'BrVcU3xcGCkEW6BcUh1ZW4u', 'WOSna2m', 'W45jWOnOdaO6', 'W5TuvYlcMmk2gSkjWPTTnvDRfa', 'dCoKWRT7ahpdMqWRWRXrWR4', 'W5bwEa0', 'W5JdScjnWRFdJCkKrcCYW4eVWO7cRG'].concat((function () { return ['o8k3W5y5u2hcH8kjg3JdGSkMoW', 'p8k+W59FeZxdOSkijG', 'AbxcSH7dJCk2W5lcN2W', 'DqpdGaBcISkhzCkKW6hdOLhcJmoy', 'WPKXqLz3gtNcL3Wf', 'W7BcRmkWhXVdLSo0d8kL', 'kmogW7VdMdBdPmoHnmkJbCk+mq', 'W7O7W69c', 'kKJdStG', 'WRRcPtyTWRr6qmo1lCoI']; }())); }())); }()); _0x2e6c = function () { return _0x982bbe; }; return _0x2e6c(); }
                ;
                if (/wwww/[_0xcb90c5(0x111, '^YVX')](url))
                    body = body[_0xcb90c5(0x124, '&pbg')](/memberType":0/g, 'memberType\x22:1')[_0xcb90c5(0x120, '!0yr')](/memberDate":"\d+/g, 'memberDate\x22:\x222029');
                else {
                    if (/IsMember/[_0xcb90c5(0x11b, 'jYwM')](url))
                        body = body[_0xcb90c5(0x11f, '^bIN')](/isMember":false/g, _0xcb90c5(0x112, 'zww3'))[_0xcb90c5(0x10a, 'kG(T')](/endTime":"\d+/g, 'endTime\x22:\x222029');
                    else {
                        if (/verify_receipt/[_0xcb90c5(0x11a, 'FhEB')](url))
                            try {
                                let obj = { 'active_expires_at': _0xcb90c5(0x127, 'eXUC'), 'is_subscription_active': !![], 'active_subscription_type': _0xcb90c5(0x126, 'KhOa'), 'is_blocked': ![], 'has_had_free_trial': ![] };
                                body = JSON[_0xcb90c5(0x118, '!0yr')](obj);
                            }
                            catch (_0x5d2bff) { }
                    }
                }
                $done({ 'body': body });
                var version_ = 'jsjiami.com.v7';
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
