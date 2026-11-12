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
                const name = "coolapk.js";
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
                const version = 'V1.0.12';
                var _0xodQ = 'jsjiami.com.v7';
                var _0x4d5bbc = _0x4915;
                if (function (_0x5ebd38, _0x1ea8bf, _0x43fd67, _0xc8c6c2, _0x4b433e, _0x3d9344, _0x28be66) { return _0x5ebd38 = _0x5ebd38 >> 0x4, _0x3d9344 = 'hs', _0x28be66 = 'hs', function (_0x324a39, _0x43f9e0, _0xd3f182, _0x37e385, _0x4d4bf6) { var _0x16651d = _0x4915; _0x37e385 = 'tfi', _0x3d9344 = _0x37e385 + _0x3d9344, _0x4d4bf6 = 'up', _0x28be66 += _0x4d4bf6, _0x3d9344 = _0xd3f182(_0x3d9344), _0x28be66 = _0xd3f182(_0x28be66), _0xd3f182 = 0x0; var _0xe3c204 = _0x324a39(); while (!![] && --_0xc8c6c2 + _0x43f9e0) {
                    try {
                        _0x37e385 = parseInt(_0x16651d(0x117, '[kUH')) / 0x1 + -parseInt(_0x16651d(0x123, '$iGg')) / 0x2 * (parseInt(_0x16651d(0xff, '5B&[')) / 0x3) + parseInt(_0x16651d(0x119, '!*y]')) / 0x4 * (-parseInt(_0x16651d(0xdd, '$iGg')) / 0x5) + parseInt(_0x16651d(0xe1, ')MrE')) / 0x6 * (-parseInt(_0x16651d(0xf5, '[%KX')) / 0x7) + -parseInt(_0x16651d(0xfb, 'jBWt')) / 0x8 * (parseInt(_0x16651d(0xfc, 'RnwD')) / 0x9) + -parseInt(_0x16651d(0x118, 'r2H[')) / 0xa * (-parseInt(_0x16651d(0x11a, '@VdX')) / 0xb) + parseInt(_0x16651d(0xd9, 'r2H[')) / 0xc;
                    }
                    catch (_0x234e57) {
                        _0x37e385 = _0xd3f182;
                    }
                    finally {
                        _0x4d4bf6 = _0xe3c204[_0x3d9344]();
                        if (_0x5ebd38 <= _0xc8c6c2)
                            _0xd3f182 ? _0x4b433e ? _0x37e385 = _0x4d4bf6 : _0x4b433e = _0x4d4bf6 : _0xd3f182 = _0x4d4bf6;
                        else {
                            if (_0xd3f182 == _0x4b433e['replace'](/[pknywlVDMAOqBNQWC=]/g, '')) {
                                if (_0x37e385 === _0x43f9e0) {
                                    _0xe3c204['un' + _0x3d9344](_0x4d4bf6);
                                    break;
                                }
                                _0xe3c204[_0x28be66](_0x4d4bf6);
                            }
                        }
                    }
                } }(_0x43fd67, _0x1ea8bf, function (_0x10fc76, _0x45c0f2, _0x1a9131, _0x4c8441, _0x2ce3fe, _0x3ef64b, _0x41be0e) { return _0x45c0f2 = '\x73\x70\x6c\x69\x74', _0x10fc76 = arguments[0x0], _0x10fc76 = _0x10fc76[_0x45c0f2](''), _0x1a9131 = '\x72\x65\x76\x65\x72\x73\x65', _0x10fc76 = _0x10fc76[_0x1a9131]('\x76'), _0x4c8441 = '\x6a\x6f\x69\x6e', (0x1bc5a0, _0x10fc76[_0x4c8441]('')); }); }(0xcd0, 0xda08a, _0x34f8, 0xcf), _0x34f8) { }
                function _0x4915(_0x5d3cf6, _0x5d8ae8) { var _0x34f8ff = _0x34f8(); return _0x4915 = function (_0x491528, _0x4192ca) { _0x491528 = _0x491528 - 0xd5; var _0x5e4f8e = _0x34f8ff[_0x491528]; if (_0x4915['nLDuIb'] === undefined) {
                    var _0x518de3 = function (_0xf111f7) { var _0x50d3e2 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; var _0x34547c = '', _0x550ded = ''; for (var _0xb48188 = 0x0, _0xc85b6e, _0x47073e, _0x3c49ab = 0x0; _0x47073e = _0xf111f7['charAt'](_0x3c49ab++); ~_0x47073e && (_0xc85b6e = _0xb48188 % 0x4 ? _0xc85b6e * 0x40 + _0x47073e : _0x47073e, _0xb48188++ % 0x4) ? _0x34547c += String['fromCharCode'](0xff & _0xc85b6e >> (-0x2 * _0xb48188 & 0x6)) : 0x0) {
                        _0x47073e = _0x50d3e2['indexOf'](_0x47073e);
                    } for (var _0x36ae18 = 0x0, _0x1ae53c = _0x34547c['length']; _0x36ae18 < _0x1ae53c; _0x36ae18++) {
                        _0x550ded += '%' + ('00' + _0x34547c['charCodeAt'](_0x36ae18)['toString'](0x10))['slice'](-0x2);
                    } return decodeURIComponent(_0x550ded); };
                    var _0x37768b = function (_0x200eba, _0x120acb) { var _0x31a888 = [], _0x531671 = 0x0, _0x501c14, _0x4d2fc3 = ''; _0x200eba = _0x518de3(_0x200eba); var _0x1be1e7; for (_0x1be1e7 = 0x0; _0x1be1e7 < 0x100; _0x1be1e7++) {
                        _0x31a888[_0x1be1e7] = _0x1be1e7;
                    } for (_0x1be1e7 = 0x0; _0x1be1e7 < 0x100; _0x1be1e7++) {
                        _0x531671 = (_0x531671 + _0x31a888[_0x1be1e7] + _0x120acb['charCodeAt'](_0x1be1e7 % _0x120acb['length'])) % 0x100, _0x501c14 = _0x31a888[_0x1be1e7], _0x31a888[_0x1be1e7] = _0x31a888[_0x531671], _0x31a888[_0x531671] = _0x501c14;
                    } _0x1be1e7 = 0x0, _0x531671 = 0x0; for (var _0x489d54 = 0x0; _0x489d54 < _0x200eba['length']; _0x489d54++) {
                        _0x1be1e7 = (_0x1be1e7 + 0x1) % 0x100, _0x531671 = (_0x531671 + _0x31a888[_0x1be1e7]) % 0x100, _0x501c14 = _0x31a888[_0x1be1e7], _0x31a888[_0x1be1e7] = _0x31a888[_0x531671], _0x31a888[_0x531671] = _0x501c14, _0x4d2fc3 += String['fromCharCode'](_0x200eba['charCodeAt'](_0x489d54) ^ _0x31a888[(_0x31a888[_0x1be1e7] + _0x31a888[_0x531671]) % 0x100]);
                    } return _0x4d2fc3; };
                    _0x4915['FlZKKV'] = _0x37768b, _0x5d3cf6 = arguments, _0x4915['nLDuIb'] = !![];
                } var _0x4559b3 = _0x34f8ff[0x0], _0x556a17 = _0x491528 + _0x4559b3, _0x1d8f0c = _0x5d3cf6[_0x556a17]; return !_0x1d8f0c ? (_0x4915['PEqCNf'] === undefined && (_0x4915['PEqCNf'] = !![]), _0x5e4f8e = _0x4915['FlZKKV'](_0x5e4f8e, _0x4192ca), _0x5d3cf6[_0x556a17] = _0x5e4f8e) : _0x5e4f8e = _0x1d8f0c, _0x5e4f8e; }, _0x4915(_0x5d3cf6, _0x5d8ae8); }
                function _0x34f8() { var _0x2b36a8 = (function () { return [_0xodQ, 'VwjpOMsQjDkiqWAaqmBMipV.CcVWonmNl.wWvy7V==', 'baT9b8knW7m', 'sJpdMq', 'WQtcPJVdLvvPrs4MW5La', 'iL8DpwtcTG', 'W4GXW5b9WPbZpmoj', 'w8oOW6/dPa', 'WQ0gW44m', 'W4pcQCklWOjRWOFdSG', 'WQfitgH/WP8', 'c8o6muNcUmkNeCkwdehcNCkwha', 'W6zekHJcNmkKWQPhWPm', 'd05LWPBdIY99WRGGm3JcMmkrW6fDxK7cIWW', 'sJ/dQCoZsCoVW4P4', 'WQddMmomWPbRWRzYWPn9sSodgLG', 'fvL4WPhdQsLMWRK8', 'ixbZvCkAs8k2WPe', 'W4rLbmkCWPO7iSkoDeGBWOu', 'bCowWPpcOq', 'WRvVvCkQW7P4dCov', 'WRLVrCkMW7zxFa', 'WQnpWPOqdSoYyGmjW5VdUv8', 'W6xdTNRcKGy', 'dxP2WOxdSCobW5BcQ8oqoa', 'xSoxWRWr', 'WR0oW44bWRS', 'W4PJhmk6WPO5', 'WQtdNYddRW'].concat((function () { return ['FuzdjIxcOSoRWOjpWQtdKmkLfa', 'Eae3WPO0WRLzWPW', 'WQboWPGudCo5xHmuW4tdTxO', 'lt3cHfi', 'DanRW5TLW5KoWQXpW5ywW5pdUq', 'CdlcUehdIcDy', 'W5jyWQhdGGO9lG', 'W7DFpaG', 'WR16W65OW7VcPcVdMSktWRVcOwzLgK/dHdq', 'je3cKKe', 'osL3WOW', 'W596hmkNWOS', 'W6bcna', 'FmkPj8kPbatdSflcQa', 'p2PXW6ldKarAcW', 'dCksWOXxW48zCmkVn8kcWRe', 'WPZdSmkJW4WJWP/cMCkuyI7cIG', 'yColfSkBwJu', 'WQjkWPOvE8kfAGifW7m', 's8oSW6JdSq', 'vmkaW4xdRdO7mSk0uJxcTMifua', 'W4qEW7Kp', 'u8kfjtyCBt8qCIBcUCox', 'kL8ho3NcSSkmWO4wWRBcKCk2v8kGWOpcUKC', 'mmoepCkJqx4', 'W5/cPmoGWPrSWPZcMmkDvq', 'zLS4W4bbW5RdPCke', 'WRrGvCkI', 'WRZdR8k1WRzIW7nKpCoXW5tcG8k1a3xdH2JdHNq'].concat((function () { return ['yfHKWRS8WRVdICk6aGdcTmko', 'WP46hCkaWRiEjmk8', 'u8kGyXhdTmoYrSk7ghNcLmktpq', 'w1yHqCoqWRFdImkPgmoIW6hcR8kN', 'qZtdJI0', 'amo7nLW', 'W4NcOmoKWPK', 'z8ktWOygWP8', 'W7NdSMBcHHDo', 'lND8tCkkxq', 'fGTLh8kn', 'pMfXW6RdJre', 'Bte2WRRcK09DbWPXW6VdRW', 'm2PHW67dNdj1', 'W7hdTNZcGa', 'WPJdT8kfWPb2WPVdRCk2', 'W4JcR8oKWPfHWQNcPCkltaNcTmkMW4FcLG', 'W5JcS8o8', 'W6qBW5Tsxa', 'rSoJW7JdTxr3tG', 'vSotWQyxb2W', 'WP8ZqSo6W457Emopv2WfWPryW6m', 'FanQW51KW54kWR9QW7SrW5JdIa', 'rZ7dQCoiwmoMW69LW7xdQmoEaq', 'bSo1jKq', 'AdrVW7ZdGs5QoG', '5ygE5BYd5lII']; }())); }())); }()); _0x34f8 = function () { return _0x2b36a8; }; return _0x34f8(); }
                ;
                if ($request[_0x4d5bbc(0x106, 'o@lM')]['indexOf'](_0x4d5bbc(0x113, '[)9@')) != -0x1) {
                    var ddgksf2013 = JSON[_0x4d5bbc(0xf4, ')MrE')]($response[_0x4d5bbc(0x11b, 'xGus')]);
                    ddgksf2013[_0x4d5bbc(0x125, ')MrE')][_0x4d5bbc(0xe2, 'AB[h')] && (ddgksf2013[_0x4d5bbc(0x10d, ')P5)')] = ddgksf2013['data'][_0x4d5bbc(0x10b, '4RuZ')](_0x3eb886 => _0x3eb886['id'])), $done({ 'body': JSON[_0x4d5bbc(0xe9, 'o@lM')](ddgksf2013) });
                }
                else {
                    if ($request[_0x4d5bbc(0xe0, 'P(ob')][_0x4d5bbc(0x100, 'CQ!L')]('main/init') != -0x1) {
                        var ddgksf2013 = JSON[_0x4d5bbc(0x11e, '6vvr')]($response[_0x4d5bbc(0xf0, 'mE@W')]);
                        ddgksf2013[_0x4d5bbc(0x104, 'i^5h')][_0x4d5bbc(0x112, 'avCc')] && (ddgksf2013[_0x4d5bbc(0x103, '8hHM')] = ddgksf2013[_0x4d5bbc(0xe5, 'Y^uJ')]['filter'](_0x261cbb => !(_0x261cbb[_0x4d5bbc(0xe3, 'XzOE')] == 0x3b1 || _0x261cbb[_0x4d5bbc(0xf1, 'VBIO')] == 0x18f6 || _0x261cbb[_0x4d5bbc(0x108, '$iGg')] == 0x5f87 || _0x261cbb['entityId'] == 0x8fe7))), $done({ 'body': JSON[_0x4d5bbc(0xed, 'hk5I')](ddgksf2013) });
                    }
                    else {
                        if ($request['url'][_0x4d5bbc(0xd7, ')P5)')](_0x4d5bbc(0xf2, 'VBIO')) != -0x1) {
                            var ddgksf2013 = JSON['parse']($response['body']);
                            ddgksf2013['data'] = ddgksf2013[_0x4d5bbc(0x10f, 'GIqP')][_0x4d5bbc(0xdf, '@VdX')](_0x1ec6d2 => !(_0x1ec6d2['entityTemplate'] == _0x4d5bbc(0x109, 'G6ZB') || _0x1ec6d2[_0x4d5bbc(0x108, '$iGg')] == 0x21bf || _0x1ec6d2['entityId'] == 0x72a5 || _0x1ec6d2[_0x4d5bbc(0xeb, 'i@td')] == 0x80ee || _0x1ec6d2['entityId'] == 0x7f2d || _0x1ec6d2[_0x4d5bbc(0xf7, 'Y^uJ')][_0x4d5bbc(0xe6, 'Y9Oy')](_0x4d5bbc(0xde, '!*y]')) != -0x1 || _0x1ec6d2[_0x4d5bbc(0x121, '@VdX')]['indexOf']('红包') != -0x1)), $done({ 'body': JSON['stringify'](ddgksf2013) });
                        }
                        else {
                            if ($request['url'][_0x4d5bbc(0xd7, ')P5)')]('dataList') != -0x1) {
                                var ddgksf2013 = JSON[_0x4d5bbc(0xd6, 'RnwD')]($response[_0x4d5bbc(0x101, 'o@lM')]);
                                ddgksf2013[_0x4d5bbc(0xf9, 'XGCm')] = ddgksf2013[_0x4d5bbc(0x11d, '[)9@')][_0x4d5bbc(0xe7, 'FqP1')](_0x23762b => !['sponsorCard', _0x4d5bbc(0x116, 'DWHY'), _0x4d5bbc(0xea, 'hk5I')][_0x4d5bbc(0xee, 'T50r')](_0x23762b[_0x4d5bbc(0x127, '[)9@')]) && !/流量|精选配件/[_0x4d5bbc(0xe4, ')P5)')](_0x23762b['title'])), $done({ 'body': JSON['stringify'](ddgksf2013) });
                            }
                            else {
                                if ($request[_0x4d5bbc(0xd5, '[)9@')][_0x4d5bbc(0x124, '$iGg')](_0x4d5bbc(0x122, '$iGg')) != -0x1) {
                                    var RWpvFh = _0x4d5bbc(0xfa, 'AB[h')[_0x4d5bbc(0x105, 'r2H[')]('|'), wKuzMO = 0x0;
                                    while (!![]) {
                                        switch (RWpvFh[wKuzMO++]) {
                                            case '0':
                                                ddgksf2013['data']?.[_0x4d5bbc(0xef, 'r2H[')]?.[_0x4d5bbc(0xd8, '4SJ2')] && (ddgksf2013['data'][_0x4d5bbc(0xdb, 'i@td')] = ddgksf2013[_0x4d5bbc(0x10d, ')P5)')]['hotReplyRows'][_0x4d5bbc(0xf8, 'r2H[')](_0x1ed6a0 => _0x1ed6a0['id']));
                                                continue;
                                            case '1':
                                                $done({ 'body': JSON[_0x4d5bbc(0x107, 'sbEa')](ddgksf2013) });
                                                continue;
                                            case '2':
                                                if (ddgksf2013[_0x4d5bbc(0xdc, '!*y]')]?.[_0x4d5bbc(0x111, 'AB[h')])
                                                    ddgksf2013[_0x4d5bbc(0x115, 'VBIO')][_0x4d5bbc(0x102, 'BsVX')] = [];
                                                continue;
                                            case '3':
                                                var ddgksf2013 = JSON['parse']($response[_0x4d5bbc(0x11c, '!*y]')]);
                                                continue;
                                            case '4':
                                                if (ddgksf2013[_0x4d5bbc(0xfd, '5B&[')]?.['include_goods_ids'])
                                                    ddgksf2013[_0x4d5bbc(0x10d, ')P5)')]['include_goods_ids'] = [];
                                                continue;
                                            case '5':
                                                ddgksf2013[_0x4d5bbc(0xf6, '4SJ2')]?.['topReplyRows']?.[_0x4d5bbc(0x11f, ')MrE')] && (ddgksf2013['data'][_0x4d5bbc(0x110, 'ucy2')] = ddgksf2013['data']['topReplyRows'][_0x4d5bbc(0x120, 'T50r')](_0x52b293 => _0x52b293['id']));
                                                continue;
                                            case '6':
                                                if (ddgksf2013['data']?.[_0x4d5bbc(0xec, 'madr')])
                                                    ddgksf2013['data'][_0x4d5bbc(0xe8, '!*y]')] = [];
                                                continue;
                                        }
                                        break;
                                    }
                                }
                                else
                                    $done({});
                            }
                        }
                    }
                }
                var version_ = 'jsjiami.com.v7';
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
