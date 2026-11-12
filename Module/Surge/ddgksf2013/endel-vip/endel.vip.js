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
                const name = "endel.vip.js";
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
            $response: response, $done: done
        };
        ;
        return run.call(host.global, overlay);
    })(__wayxConfig, __wayxHost, function (__wayxScope) {
        return (function ($response, $done) {
            return (function () {
                var _0xodW = 'jsjiami.com.v7';
                var _0x362180 = _0x4364;
                function _0x4364(_0x418868, _0x2cb136) { var _0x260f14 = _0x260f(); return _0x4364 = function (_0x436437, _0x3e8933) { _0x436437 = _0x436437 - 0xb0; var _0x2f68d3 = _0x260f14[_0x436437]; if (_0x4364['ZfFgOe'] === undefined) {
                    var _0x233a8b = function (_0x481137) { var _0x2d989d = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; var _0xf6802a = '', _0x30d3ac = ''; for (var _0x319a24 = 0x0, _0x46ef22, _0x2b41c2, _0x382d77 = 0x0; _0x2b41c2 = _0x481137['charAt'](_0x382d77++); ~_0x2b41c2 && (_0x46ef22 = _0x319a24 % 0x4 ? _0x46ef22 * 0x40 + _0x2b41c2 : _0x2b41c2, _0x319a24++ % 0x4) ? _0xf6802a += String['fromCharCode'](0xff & _0x46ef22 >> (-0x2 * _0x319a24 & 0x6)) : 0x0) {
                        _0x2b41c2 = _0x2d989d['indexOf'](_0x2b41c2);
                    } for (var _0x3f26de = 0x0, _0x55cd18 = _0xf6802a['length']; _0x3f26de < _0x55cd18; _0x3f26de++) {
                        _0x30d3ac += '%' + ('00' + _0xf6802a['charCodeAt'](_0x3f26de)['toString'](0x10))['slice'](-0x2);
                    } return decodeURIComponent(_0x30d3ac); };
                    var _0x471c3c = function (_0x4ad598, _0x395beb) { var _0x547d16 = [], _0x47deb7 = 0x0, _0x4c8a71, _0x88ce62 = ''; _0x4ad598 = _0x233a8b(_0x4ad598); var _0x11b7b0; for (_0x11b7b0 = 0x0; _0x11b7b0 < 0x100; _0x11b7b0++) {
                        _0x547d16[_0x11b7b0] = _0x11b7b0;
                    } for (_0x11b7b0 = 0x0; _0x11b7b0 < 0x100; _0x11b7b0++) {
                        _0x47deb7 = (_0x47deb7 + _0x547d16[_0x11b7b0] + _0x395beb['charCodeAt'](_0x11b7b0 % _0x395beb['length'])) % 0x100, _0x4c8a71 = _0x547d16[_0x11b7b0], _0x547d16[_0x11b7b0] = _0x547d16[_0x47deb7], _0x547d16[_0x47deb7] = _0x4c8a71;
                    } _0x11b7b0 = 0x0, _0x47deb7 = 0x0; for (var _0x3a4d04 = 0x0; _0x3a4d04 < _0x4ad598['length']; _0x3a4d04++) {
                        _0x11b7b0 = (_0x11b7b0 + 0x1) % 0x100, _0x47deb7 = (_0x47deb7 + _0x547d16[_0x11b7b0]) % 0x100, _0x4c8a71 = _0x547d16[_0x11b7b0], _0x547d16[_0x11b7b0] = _0x547d16[_0x47deb7], _0x547d16[_0x47deb7] = _0x4c8a71, _0x88ce62 += String['fromCharCode'](_0x4ad598['charCodeAt'](_0x3a4d04) ^ _0x547d16[(_0x547d16[_0x11b7b0] + _0x547d16[_0x47deb7]) % 0x100]);
                    } return _0x88ce62; };
                    _0x4364['knVmqZ'] = _0x471c3c, _0x418868 = arguments, _0x4364['ZfFgOe'] = !![];
                } var _0x2047af = _0x260f14[0x0], _0x2c0602 = _0x436437 + _0x2047af, _0x8147d9 = _0x418868[_0x2c0602]; return !_0x8147d9 ? (_0x4364['hknjuQ'] === undefined && (_0x4364['hknjuQ'] = !![]), _0x2f68d3 = _0x4364['knVmqZ'](_0x2f68d3, _0x3e8933), _0x418868[_0x2c0602] = _0x2f68d3) : _0x2f68d3 = _0x8147d9, _0x2f68d3; }, _0x4364(_0x418868, _0x2cb136); }
                function _0x260f() { var _0x110f1e = (function () { return [_0xodW, 'ljlwSskjhiBaymCGki.UkckQNourmh.v7QCChuHC==', 'm8krWPrQW5zJWQNcLCkoymkKWP3dKG', 'm8oYs1S2CmkM', 'nuO4aSk+WRSgWPlcMCk1tg0hW4XJWPBcK2RcT8ofWRy', 'WO4lWOpdJ8kMsmoQ', 'k8kmDSkemmotjW', 'W77cH2VcVCkUFSkcWQa+rq', 'WRqHWPHksmkhFIO', 'DWdcSSoUWPXXw1ZcQq', 'wmoXcmoWvCkUnCoCW4xcUSomWPm'].concat((function () { return ['AetcOSkbW5JdQ8kW', 'W7u7W7dcU8ozWOhdKSoYwMxcNSoqsa', 'DCkgW7pdLCoXhZJdUmo4v8oMCCkOqG', 'W6BcTmodc8ogW4vlWQOAW58', 'WPFdJd7dGfNdRI/cMINdMG', 'A8khdSktW7vS', 'WRxcGt8aWQu4WRhdJd/cH8k/', 'pSoVzSoJvSkbW7CfW5zKW7u', 'WPldIMpcGw7dVJ/cTW', 'WPRdHG1QrIa4W4ddR8ovwIS', 'DZ0SWPLpWODWW6f5WQ0'].concat((function () { return ['WPRdIWrNqYboW4FdRCoAyZZcMq', 'm8kQedPutCkcsNddPde', 'kqxcU8oqW6dcKWRdMmoyEvSW', 'j0yGqK1Nj8oYW4K', 'fdRcLCkMW7ldNSkgcG', 'cstcI8oQW5pcPa', 'oSoPy8oMvSkBW5SCW5P9W7q', 'W6tdNSk9wcpdVSo1W41eWO8y', 'yc9joSk6WQdcQXDLW47dVmkPWR8']; }())); }())); }()); _0x260f = function () { return _0x110f1e; }; return _0x260f(); }
                ;
                (function (_0x208d19, _0x184f8c, _0x30d39e, _0xb043cb, _0x1f2b50, _0x3cadbe, _0x211896) { return _0x208d19 = _0x208d19 >> 0x1, _0x3cadbe = 'hs', _0x211896 = 'hs', function (_0xf53a09, _0x3ba24e, _0x33adfe, _0x1ce487, _0x10e69b) { var _0x4293fd = _0x4364; _0x1ce487 = 'tfi', _0x3cadbe = _0x1ce487 + _0x3cadbe, _0x10e69b = 'up', _0x211896 += _0x10e69b, _0x3cadbe = _0x33adfe(_0x3cadbe), _0x211896 = _0x33adfe(_0x211896), _0x33adfe = 0x0; var _0x5a299e = _0xf53a09(); while (!![] && --_0xb043cb + _0x3ba24e) {
                    try {
                        _0x1ce487 = parseInt(_0x4293fd(0xbc, 'd8Q2')) / 0x1 + parseInt(_0x4293fd(0xc8, '#1c^')) / 0x2 * (-parseInt(_0x4293fd(0xbf, '#1c^')) / 0x3) + parseInt(_0x4293fd(0xb7, 'yjKb')) / 0x4 * (-parseInt(_0x4293fd(0xb6, 'm4fg')) / 0x5) + parseInt(_0x4293fd(0xba, 'z!tp')) / 0x6 * (parseInt(_0x4293fd(0xc2, 'VlCS')) / 0x7) + parseInt(_0x4293fd(0xc4, 'z!tp')) / 0x8 * (parseInt(_0x4293fd(0xc1, 'Q^Z[')) / 0x9) + parseInt(_0x4293fd(0xb4, '6skT')) / 0xa + parseInt(_0x4293fd(0xc7, 'vgdi')) / 0xb;
                    }
                    catch (_0x2e9d92) {
                        _0x1ce487 = _0x33adfe;
                    }
                    finally {
                        _0x10e69b = _0x5a299e[_0x3cadbe]();
                        if (_0x208d19 <= _0xb043cb)
                            _0x33adfe ? _0x1f2b50 ? _0x1ce487 = _0x10e69b : _0x1f2b50 = _0x10e69b : _0x33adfe = _0x10e69b;
                        else {
                            if (_0x33adfe == _0x1f2b50['replace'](/[lwHSrByCukUGQhN=]/g, '')) {
                                if (_0x1ce487 === _0x3ba24e) {
                                    _0x5a299e['un' + _0x3cadbe](_0x10e69b);
                                    break;
                                }
                                _0x5a299e[_0x211896](_0x10e69b);
                            }
                        }
                    }
                } }(_0x30d39e, _0x184f8c, function (_0x5f03c1, _0x2c83f8, _0x2fa4dd, _0x4a4cf5, _0x4bd960, _0x477770, _0x52381a) { return _0x2c83f8 = '\x73\x70\x6c\x69\x74', _0x5f03c1 = arguments[0x0], _0x5f03c1 = _0x5f03c1[_0x2c83f8](''), _0x2fa4dd = '\x72\x65\x76\x65\x72\x73\x65', _0x5f03c1 = _0x5f03c1[_0x2fa4dd]('\x76'), _0x4a4cf5 = '\x6a\x6f\x69\x6e', (0x1c4d4e, _0x5f03c1[_0x4a4cf5]('')); }); }(0x18e, 0xbc3f2, _0x260f, 0xc9), _0x260f) && (_0xodW = 0x178d);
                var ddgksf2013 = JSON['parse']($response['body']);
                ddgksf2013[_0x362180(0xc0, 'In!V')] = { 'promo_type': _0x362180(0xcb, 'dNyI'), 'period': _0x362180(0xb0, 'WkM!'), 'promo_tag': '', 'store_trial': ![], 'time_left': 0x0, 'price_id': _0x362180(0xc9, 'Fw^['), 'valid_until': 0x218711a00, 'type': _0x362180(0xb8, '^7M8'), 'price': 0x0, 'trial_type': _0x362180(0xb5, 'EQQt'), 'prev_store': _0x362180(0xb3, 'VlCS'), 'cancel_at_period_end': ![], 'multiple_subscriptions': ![], 'currency': '', 'store': _0x362180(0xc3, 'In!V'), 'trial_canceled': ![] }, $done({ 'body': JSON['stringify'](ddgksf2013) });
                var version_ = 'jsjiami.com.v7';
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
