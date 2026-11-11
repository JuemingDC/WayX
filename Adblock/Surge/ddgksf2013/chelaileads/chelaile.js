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
                const name = "chelaile.js";
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
                const version = "1.0.2";
                var _0xodU = 'jsjiami.com.v7';
                const _0x254505 = _0x238f;
                (function (_0x2c0bca, _0x2ebdc9, _0x563d65, _0x4c5999, _0x5945b7, _0x2c171b, _0x25621f) { return _0x2c0bca = _0x2c0bca >> 0x9, _0x2c171b = 'hs', _0x25621f = 'hs', function (_0x3e1454, _0x3df71b, _0xd45ef1, _0x54577e, _0x281a32) { const _0xce2fa8 = _0x238f; _0x54577e = 'tfi', _0x2c171b = _0x54577e + _0x2c171b, _0x281a32 = 'up', _0x25621f += _0x281a32, _0x2c171b = _0xd45ef1(_0x2c171b), _0x25621f = _0xd45ef1(_0x25621f), _0xd45ef1 = 0x0; const _0x193cf6 = _0x3e1454(); while (!![] && --_0x4c5999 + _0x3df71b) {
                    try {
                        _0x54577e = parseInt(_0xce2fa8(0xb4, 'jAq9')) / 0x1 + parseInt(_0xce2fa8(0xcb, '[JDC')) / 0x2 + parseInt(_0xce2fa8(0xc7, '5wwc')) / 0x3 + -parseInt(_0xce2fa8(0xbe, 'K3pM')) / 0x4 + -parseInt(_0xce2fa8(0xba, '9n3]')) / 0x5 * (-parseInt(_0xce2fa8(0xb5, 'jAq9')) / 0x6) + -parseInt(_0xce2fa8(0xbc, 'Wl9x')) / 0x7 + parseInt(_0xce2fa8(0xb8, 'KD$D')) / 0x8;
                    }
                    catch (_0x59bf9b) {
                        _0x54577e = _0xd45ef1;
                    }
                    finally {
                        _0x281a32 = _0x193cf6[_0x2c171b]();
                        if (_0x2c0bca <= _0x4c5999)
                            _0xd45ef1 ? _0x5945b7 ? _0x54577e = _0x281a32 : _0x5945b7 = _0x281a32 : _0xd45ef1 = _0x281a32;
                        else {
                            if (_0xd45ef1 == _0x5945b7['replace'](/[ugdTkJEhWSlHQFqpGnR=]/g, '')) {
                                if (_0x54577e === _0x3df71b) {
                                    _0x193cf6['un' + _0x2c171b](_0x281a32);
                                    break;
                                }
                                _0x193cf6[_0x25621f](_0x281a32);
                            }
                        }
                    }
                } }(_0x563d65, _0x2ebdc9, function (_0x541c58, _0x890db2, _0x2723f2, _0x55764f, _0x187d3b, _0x4dc5ba, _0x1bca32) { return _0x890db2 = '\x73\x70\x6c\x69\x74', _0x541c58 = arguments[0x0], _0x541c58 = _0x541c58[_0x890db2](''), _0x2723f2 = '\x72\x65\x76\x65\x72\x73\x65', _0x541c58 = _0x541c58[_0x2723f2]('\x76'), _0x55764f = '\x6a\x6f\x69\x6e', (0x1bd73c, _0x541c58[_0x55764f]('')); }); }(0x18400, 0x5fafe, _0x28c5, 0xc4), _0x28c5) && (_0xodU = 0xc4);
                let body = $response[_0x254505(0xb6, 'jH$c')], match = body[_0x254505(0xbb, 'N!^y')](/[*]*YGKJ([\s\S]*?)YGKJ[*]*/);
                function _0x238f(_0x40ff87, _0x12b73c) { const _0x28c52e = _0x28c5(); return _0x238f = function (_0x238f01, _0x180064) { _0x238f01 = _0x238f01 - 0xb4; let _0x3f96ed = _0x28c52e[_0x238f01]; if (_0x238f['gwzKGS'] === undefined) {
                    var _0xea82fc = function (_0xa5c493) { const _0x240015 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; let _0x17100c = '', _0x3b2435 = ''; for (let _0x33b217 = 0x0, _0x731669, _0x121cd9, _0x36240f = 0x0; _0x121cd9 = _0xa5c493['charAt'](_0x36240f++); ~_0x121cd9 && (_0x731669 = _0x33b217 % 0x4 ? _0x731669 * 0x40 + _0x121cd9 : _0x121cd9, _0x33b217++ % 0x4) ? _0x17100c += String['fromCharCode'](0xff & _0x731669 >> (-0x2 * _0x33b217 & 0x6)) : 0x0) {
                        _0x121cd9 = _0x240015['indexOf'](_0x121cd9);
                    } for (let _0x11486d = 0x0, _0xab1bb8 = _0x17100c['length']; _0x11486d < _0xab1bb8; _0x11486d++) {
                        _0x3b2435 += '%' + ('00' + _0x17100c['charCodeAt'](_0x11486d)['toString'](0x10))['slice'](-0x2);
                    } return decodeURIComponent(_0x3b2435); };
                    const _0x14222d = function (_0x47a088, _0x5ad663) { let _0x5b929f = [], _0x447174 = 0x0, _0x45b7e6, _0xbbe1c0 = ''; _0x47a088 = _0xea82fc(_0x47a088); let _0xa3c063; for (_0xa3c063 = 0x0; _0xa3c063 < 0x100; _0xa3c063++) {
                        _0x5b929f[_0xa3c063] = _0xa3c063;
                    } for (_0xa3c063 = 0x0; _0xa3c063 < 0x100; _0xa3c063++) {
                        _0x447174 = (_0x447174 + _0x5b929f[_0xa3c063] + _0x5ad663['charCodeAt'](_0xa3c063 % _0x5ad663['length'])) % 0x100, _0x45b7e6 = _0x5b929f[_0xa3c063], _0x5b929f[_0xa3c063] = _0x5b929f[_0x447174], _0x5b929f[_0x447174] = _0x45b7e6;
                    } _0xa3c063 = 0x0, _0x447174 = 0x0; for (let _0x4af42d = 0x0; _0x4af42d < _0x47a088['length']; _0x4af42d++) {
                        _0xa3c063 = (_0xa3c063 + 0x1) % 0x100, _0x447174 = (_0x447174 + _0x5b929f[_0xa3c063]) % 0x100, _0x45b7e6 = _0x5b929f[_0xa3c063], _0x5b929f[_0xa3c063] = _0x5b929f[_0x447174], _0x5b929f[_0x447174] = _0x45b7e6, _0xbbe1c0 += String['fromCharCode'](_0x47a088['charCodeAt'](_0x4af42d) ^ _0x5b929f[(_0x5b929f[_0xa3c063] + _0x5b929f[_0x447174]) % 0x100]);
                    } return _0xbbe1c0; };
                    _0x238f['WpFbyw'] = _0x14222d, _0x40ff87 = arguments, _0x238f['gwzKGS'] = !![];
                } const _0x21efd7 = _0x28c52e[0x0], _0x1cb9a9 = _0x238f01 + _0x21efd7, _0x455c06 = _0x40ff87[_0x1cb9a9]; return !_0x455c06 ? (_0x238f['okzZqQ'] === undefined && (_0x238f['okzZqQ'] = !![]), _0x3f96ed = _0x238f['WpFbyw'](_0x3f96ed, _0x180064), _0x40ff87[_0x1cb9a9] = _0x3f96ed) : _0x3f96ed = _0x455c06, _0x3f96ed; }, _0x238f(_0x40ff87, _0x12b73c); }
                function _0x28c5() { const _0x2e02aa = (function () { return [_0xodU, 'gTjJsEjlpiaGmuEiW.FcoRHmQp.lSvk7dQqllnGh==', 'AI1Tv2nMsePMkfaAW4m', 'FqTMmJrmjmkebCkuW4VdI8oP', 'W5Lgb8kJev/cMXhdVCkiW7Kg', 'W7TAW7SZW6NdGKVcVvn9WPS', 'mSkAzJu4W5BcTCooW64NBqW', 'mCkzzZm/W5BdVCoiW5WRtYBdHa', 'tKXUWPm', 'amoZW7NdTCorv8ogW5vpW7C0W5RdGq'].concat((function () { return ['W7hcOrtcHSkCpmkvWR8oWOzkWPNcRq', 'CCoWcZm', 'u8o3W7iaW5joWRG', 'W6rbjhTO', 'xSkuW7u8pLZcSNBdPSkoW6pcPmkM', 'WOJcMvO6la', 'W43dGaldPSopW7BcHu7dTxKcuIG', 'W7DhW5ufav9VWOy', 'WQtdKCokW6xcJSkvjga', 'WRvxbHqEW4VdVSoIsbWhW4y'].concat((function () { return ['mmkEBta9W5/dU8ozW6iitbtdHq', 'FZ92', 'W7i3FmkuoSoMomk3WPtdIthcSa', '6lE+57MT6kED5yMo', 'W7jIW5iVWQWwia', 'W7aaWPn5W6OMb8oNWOxcNmoq', 'W6VcTCoQh0BdQgNcMeO']; }())); }())); }()); _0x28c5 = function () { return _0x2e02aa; }; return _0x28c5(); }
                ;
                if (match) {
                    let jsonText = match[0x1], data = JSON['parse'](jsonText);
                    switch (!![]) {
                        case /goocity\/city/['test']($request['url']):
                            try {
                                let list = data['jsonr'][_0x254505(0xb9, 'uT^q')][_0x254505(0xc0, 'YgTx')];
                                list = list['filter'](_0x36f94d => ['首页', '我的', _0x254505(0xc5, 'uk)3')][_0x254505(0xbf, 'D82[')](_0x36f94d[_0x254505(0xbd, ']3Jt')])), list = list['map'](_0x3f042c => { return delete _0x3f042c['picUrl'], delete _0x3f042c['clickIconUrl'], _0x3f042c; }), data['jsonr']['data']['cityList'] = list;
                            }
                            catch (_0x1e2f11) {
                                console[_0x254505(0xc3, 'XvJl')](_0x254505(0xc9, '0JR5') + _0x1e2f11);
                            }
                            break;
                    }
                    body = '**YGKJ' + JSON[_0x254505(0xc8, 'X)Xt')](data) + 'YGKJ**';
                }
                $done({ 'body': body });
                var version_ = 'jsjiami.com.v7';
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
