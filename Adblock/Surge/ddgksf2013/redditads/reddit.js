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
                const name = "reddit.js";
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
        return (function ($request, $done, $response) {
            return (function () {
                const version = 'V1.0.9';
                var _0xodH = 'jsjiami.com.v7';
                const _0xc3dd0a = _0x1e61;
                if (function (_0x297b99, _0x23f2e1, _0x6df70d, _0x3c23f, _0x377ebd, _0x2c90c8, _0x4be525) { return _0x297b99 = _0x297b99 >> 0x6, _0x2c90c8 = 'hs', _0x4be525 = 'hs', function (_0x2e8807, _0x4f615d, _0x39406d, _0x480882, _0x25520e) { const _0x39cfbb = _0x1e61; _0x480882 = 'tfi', _0x2c90c8 = _0x480882 + _0x2c90c8, _0x25520e = 'up', _0x4be525 += _0x25520e, _0x2c90c8 = _0x39406d(_0x2c90c8), _0x4be525 = _0x39406d(_0x4be525), _0x39406d = 0x0; const _0x548169 = _0x2e8807(); while (!![] && --_0x3c23f + _0x4f615d) {
                    try {
                        _0x480882 = -parseInt(_0x39cfbb(0xe7, 'p4lg')) / 0x1 + parseInt(_0x39cfbb(0xe5, ']WGR')) / 0x2 * (parseInt(_0x39cfbb(0xfd, 'p6@A')) / 0x3) + -parseInt(_0x39cfbb(0xf9, 'bE)$')) / 0x4 + -parseInt(_0x39cfbb(0xe6, 'L]@f')) / 0x5 + -parseInt(_0x39cfbb(0xf5, 'ICP5')) / 0x6 * (parseInt(_0x39cfbb(0xfe, 'Z5[j')) / 0x7) + parseInt(_0x39cfbb(0xf8, ')Hz#')) / 0x8 + parseInt(_0x39cfbb(0x10a, 'd&Pb')) / 0x9;
                    }
                    catch (_0x58ea56) {
                        _0x480882 = _0x39406d;
                    }
                    finally {
                        _0x25520e = _0x548169[_0x2c90c8]();
                        if (_0x297b99 <= _0x3c23f)
                            _0x39406d ? _0x377ebd ? _0x480882 = _0x25520e : _0x377ebd = _0x25520e : _0x39406d = _0x25520e;
                        else {
                            if (_0x39406d == _0x377ebd['replace'](/[kKlGUnbLWFYEOphRDPNdf=]/g, '')) {
                                if (_0x480882 === _0x4f615d) {
                                    _0x548169['un' + _0x2c90c8](_0x25520e);
                                    break;
                                }
                                _0x548169[_0x4be525](_0x25520e);
                            }
                        }
                    }
                } }(_0x6df70d, _0x23f2e1, function (_0x3bf4d5, _0x51ea99, _0x4fa532, _0xb5ed0d, _0xee9e18, _0x219c74, _0x1ad289) { return _0x51ea99 = '\x73\x70\x6c\x69\x74', _0x3bf4d5 = arguments[0x0], _0x3bf4d5 = _0x3bf4d5[_0x51ea99](''), _0x4fa532 = '\x72\x65\x76\x65\x72\x73\x65', _0x3bf4d5 = _0x3bf4d5[_0x4fa532]('\x76'), _0xb5ed0d = '\x6a\x6f\x69\x6e', (0x1a8866, _0x3bf4d5[_0xb5ed0d]('')); }); }(0x3340, 0xc4ab3, _0x1715, 0xcf), _0x1715) { }
                const opName = $request?.[_0xc3dd0a(0xeb, '1D%(')]?.[_0xc3dd0a(0xe3, 'r@dH')] || '';
                function _0x1e61(_0x37ad72, _0xa65d17) { const _0x1715c6 = _0x1715(); return _0x1e61 = function (_0x1e61ca, _0x1d9789) { _0x1e61ca = _0x1e61ca - 0xdd; let _0x2ce79b = _0x1715c6[_0x1e61ca]; if (_0x1e61['BTKsgq'] === undefined) {
                    var _0xa37233 = function (_0x221d34) { const _0x504cae = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; let _0x3f1826 = '', _0x3285c4 = ''; for (let _0x2eb4f4 = 0x0, _0xa8b038, _0x41bc3d, _0x8e9071 = 0x0; _0x41bc3d = _0x221d34['charAt'](_0x8e9071++); ~_0x41bc3d && (_0xa8b038 = _0x2eb4f4 % 0x4 ? _0xa8b038 * 0x40 + _0x41bc3d : _0x41bc3d, _0x2eb4f4++ % 0x4) ? _0x3f1826 += String['fromCharCode'](0xff & _0xa8b038 >> (-0x2 * _0x2eb4f4 & 0x6)) : 0x0) {
                        _0x41bc3d = _0x504cae['indexOf'](_0x41bc3d);
                    } for (let _0x26ebf1 = 0x0, _0xe97a80 = _0x3f1826['length']; _0x26ebf1 < _0xe97a80; _0x26ebf1++) {
                        _0x3285c4 += '%' + ('00' + _0x3f1826['charCodeAt'](_0x26ebf1)['toString'](0x10))['slice'](-0x2);
                    } return decodeURIComponent(_0x3285c4); };
                    const _0xc89735 = function (_0x1de514, _0x2bfde6) { let _0x2c03d2 = [], _0x53937e = 0x0, _0x3ae814, _0x4a2cc3 = ''; _0x1de514 = _0xa37233(_0x1de514); let _0x192053; for (_0x192053 = 0x0; _0x192053 < 0x100; _0x192053++) {
                        _0x2c03d2[_0x192053] = _0x192053;
                    } for (_0x192053 = 0x0; _0x192053 < 0x100; _0x192053++) {
                        _0x53937e = (_0x53937e + _0x2c03d2[_0x192053] + _0x2bfde6['charCodeAt'](_0x192053 % _0x2bfde6['length'])) % 0x100, _0x3ae814 = _0x2c03d2[_0x192053], _0x2c03d2[_0x192053] = _0x2c03d2[_0x53937e], _0x2c03d2[_0x53937e] = _0x3ae814;
                    } _0x192053 = 0x0, _0x53937e = 0x0; for (let _0x1a6904 = 0x0; _0x1a6904 < _0x1de514['length']; _0x1a6904++) {
                        _0x192053 = (_0x192053 + 0x1) % 0x100, _0x53937e = (_0x53937e + _0x2c03d2[_0x192053]) % 0x100, _0x3ae814 = _0x2c03d2[_0x192053], _0x2c03d2[_0x192053] = _0x2c03d2[_0x53937e], _0x2c03d2[_0x53937e] = _0x3ae814, _0x4a2cc3 += String['fromCharCode'](_0x1de514['charCodeAt'](_0x1a6904) ^ _0x2c03d2[(_0x2c03d2[_0x192053] + _0x2c03d2[_0x53937e]) % 0x100]);
                    } return _0x4a2cc3; };
                    _0x1e61['IEgssj'] = _0xc89735, _0x37ad72 = arguments, _0x1e61['BTKsgq'] = !![];
                } const _0xf622 = _0x1715c6[0x0], _0x46d550 = _0x1e61ca + _0xf622, _0x4d7095 = _0x37ad72[_0x46d550]; return !_0x4d7095 ? (_0x1e61['fvMIXX'] === undefined && (_0x1e61['fvMIXX'] = !![]), _0x2ce79b = _0x1e61['IEgssj'](_0x2ce79b, _0x1d9789), _0x37ad72[_0x46d550] = _0x2ce79b) : _0x2ce79b = _0x4d7095, _0x2ce79b; }, _0x1e61(_0x37ad72, _0xa65d17); }
                let body;
                if (/Ads/i[_0xc3dd0a(0xea, 'lUu0')](opName))
                    $done({ 'body': '{}' });
                else
                    try {
                        body = JSON[_0xc3dd0a(0x106, 'Z5[j')]($response[_0xc3dd0a(0x10e, 'Ludd')]['replace'](/"isObfuscated":true/g, '\x22isObfuscated\x22:false')['replace'](/"obfuscatedPath":"[^"]*"/g, '\x22obfuscatedPath\x22:null')[_0xc3dd0a(0xe1, 'YRTb')](/"isNsfw":true/g, '\x22isNsfw\x22:false')['replace'](/"isAdPersonalizationAllowed":true/g, '\x22isAdPersonalizationAllowed\x22:false')[_0xc3dd0a(0xf2, ']7tS')](/"isThirdPartyInfoAdPersonalizationAllowed":true/g, _0xc3dd0a(0xf3, 'T[Av'))[_0xc3dd0a(0xf4, 'Ludd')](/"isNsfwMediaBlocked":true/g, _0xc3dd0a(0xdf, '7Vi7'))[_0xc3dd0a(0xe0, '%9Ot')](/"isNsfwContentShown":true/g, _0xc3dd0a(0x103, '78t5'))[_0xc3dd0a(0xee, 'p4lg')](/"isPremiumMember":false/g, _0xc3dd0a(0xdd, 'r@dH'))[_0xc3dd0a(0xf1, 'lUu0')](/"isEmployee":false/g, '\x22isEmployee\x22:true'));
                        const data = body['data'] ?? {};
                        Object[_0xc3dd0a(0xe4, ']cmg')](data)[_0xc3dd0a(0x102, 'B(G3')](_0x264ed5 => { const _0x38539b = _0xc3dd0a, _0x227df7 = { 'xGFfl': function (_0x380bd6, _0x1395e7) { return _0x380bd6 === _0x1395e7; }, 'QRZWk': _0x38539b(0x100, 'r@dH'), 'iYbEo': function (_0x5aaf97, _0x21896c) { return _0x5aaf97 === _0x21896c; }, 'Ojbez': _0x38539b(0x101, 'qFlq') }, _0xe804f6 = data[_0x264ed5]?.[_0x38539b(0x104, 'ICP5')]?.[_0x38539b(0xe2, 'ICP5')]; if (!Array[_0x38539b(0xff, 'YRTb')](_0xe804f6))
                            return; data[_0x264ed5][_0x38539b(0x109, 'N8*j')][_0x38539b(0xfb, 'L]@f')] = _0xe804f6[_0x38539b(0x107, '1D%(')](({ node: _0x2d14e2 }) => { const _0x5c395f = _0x38539b; if (_0x227df7[_0x5c395f(0x108, 'd&Pb')](_0x227df7[_0x5c395f(0x105, 'Kk@x')], 'DxeQL')) {
                            if (!_0x2d14e2)
                                return !![];
                            if (_0x227df7[_0x5c395f(0x10d, '*5gs')](_0x2d14e2[_0x5c395f(0xf7, 'p6@A')], _0x227df7[_0x5c395f(0x10b, '&c9p')]))
                                return ![];
                            if (_0x2d14e2['adPayload'])
                                return ![];
                            if (Array['isArray'](_0x2d14e2[_0x5c395f(0xf6, '*3VZ')]))
                                return !_0x2d14e2['cells']['some'](_0x3835ab => _0x3835ab?.['__typename'] === _0x5c395f(0x10c, 'Ludd'));
                            return !![];
                        }
                        else
                            _0x221d34({ 'body': '{}' }); }); }), body = JSON['stringify'](body);
                    }
                    catch (_0x2d423f) {
                        console[_0xc3dd0a(0xf0, 'BSBF')](_0xc3dd0a(0xef, 'gTpY'), _0x2d423f);
                    }
                    finally {
                        $done(body ? { 'body': body } : {});
                    }
                function _0x1715() { const _0x213a1a = (function () { return [_0xodH, 'kWYjkUsfjLEiFahdPmLniYD.PcKobmkOG.pvRNl7==', 'WOrxWQ/dSdK0zmkXwtxcHmomW5m', 'WR7dPsJdPdHtWQBdGCk3WP3dTZi', 'E8o0rd/dLSksWRu', 'WORcRXjDWO0', 'qCoHA17cL8kh', 'WRHOECotWRVcNSo1', 'gXvsW4NcLSoTmmoRW6pdK8oPW5/cPZG8W4BcUYTeW7FcU8k+WQ0XcM8', 'W6ZdLSktoCkWWOVdUmov', 'WOxdLmkjWRxdJG', 'W7RcVwZcPwS', 'W7NcMSoflbNcUW', 'dqagr8kv', 'CddcPmo/e8orxGu', 'rhn2emoml8kZWOjYWPaaw3RcLG', 'zSk/mSosW5O', 'CCogiCo2xvNdRI7cPWhdNrdcImo9'].concat((function () { return ['W6LoW5BdGZa', 'uSoncmoQ', 'W6ZcVGrCWRm5W69moaztEIGyWPBdQ8ooWPCXWRZcHqu', 'WPK7WQddT8orWQ/cGmoOmmoBW7L0pa', 'WRtcLKNdQ8opF27cVSoha8ozi8oTibFcQSkAWRNcLulcKmkJWPVdHSkbW6O', 'W5LPW6NcR8kcW7NdLW', 'ymoIDshdHCkqWQK', 'W6ZdNSkrmCkM', 'WPBdUJzCWO4qW45QycrowHC7WQFdKmkJW6nOWOdcSs1W', 'WQz9lSky', 'W7NdUgC4W5VdLHu', 'emkBnSkFzqKHWOX3ESoDWRRcSG', 'et5qct/cOW/dQK4AxwBcMG', 'WQNdHCo5gWBcN8oTBq', 'eCkDnCkAzaeJWQbGEmokWR/cQG', 'sCo+pMa', 'W7FcLSoipbNcU8or', 'W7OKcCoKW6XzgMmUWPBcIr/dQW'].concat((function () { return ['WPfOWOpcHeZcI8oj', 'uM8tvw3dTvS', 'zSkWzXpdRNKUWPxdMbLUWPm', 'WPW/gW', 't8o+pxHFW6bh', 'WOTEWQ7cQSk7WPRcPW', 'jvlcHCotrCoDWPZcImkTWP/dSSknW7nruCo9W5bNW5BcGmkjW5GQBLiRWRpcO0SwDCkQwmo0W75Ntmk9pHpcNCkwWQ7dPfRdPCk0W6q', 'qSohhmo/sfVdRW', 'WR/cJmkMf8kVWRpdG8oH', 'WQXWv8k7WQW', 'W68/W6RcV3TPomkBBHW', 'dSoQiCksWQ8rWOWkfGX5cCklWOK', 'WOBcNSkOvcz7asVcSf45afS', 'W7RdRKe+W7DPW7zghX5yta', 'qmooy8ojjq', 'CIBcQ0OEW4iTWQRdVCkqeYBcKr0']; }())); }())); }()); _0x1715 = function () { return _0x213a1a; }; return _0x1715(); }
                ;
                var version_ = 'jsjiami.com.v7';
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done), Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response));
    });
})();
