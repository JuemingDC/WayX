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
                const name = "wannianli.vip.js";
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
                var _0xodl = 'jsjiami.com.v7';
                const _0x1dad96 = _0x5e67;
                (function (_0x1c882b, _0xbe5a3d, _0x298276, _0x14a6ba, _0x296bcb, _0x555e76, _0xc434cb) { return _0x1c882b = _0x1c882b >> 0x1, _0x555e76 = 'hs', _0xc434cb = 'hs', function (_0x34869b, _0xb4d45b, _0x565ee6, _0x3bdd5c, _0xcd8bb8) { const _0x5971e1 = _0x5e67; _0x3bdd5c = 'tfi', _0x555e76 = _0x3bdd5c + _0x555e76, _0xcd8bb8 = 'up', _0xc434cb += _0xcd8bb8, _0x555e76 = _0x565ee6(_0x555e76), _0xc434cb = _0x565ee6(_0xc434cb), _0x565ee6 = 0x0; const _0xda7ceb = _0x34869b(); while (!![] && --_0x14a6ba + _0xb4d45b) {
                    try {
                        _0x3bdd5c = -parseInt(_0x5971e1(0x1a3, '(g9w')) / 0x1 * (-parseInt(_0x5971e1(0x19d, 'LosZ')) / 0x2) + -parseInt(_0x5971e1(0x195, ')JPT')) / 0x3 + parseInt(_0x5971e1(0x1a1, '2lVj')) / 0x4 * (-parseInt(_0x5971e1(0x19f, 'aX$E')) / 0x5) + -parseInt(_0x5971e1(0x188, 'SEy]')) / 0x6 * (-parseInt(_0x5971e1(0x18d, 'F]bu')) / 0x7) + -parseInt(_0x5971e1(0x198, 'H6Dd')) / 0x8 + -parseInt(_0x5971e1(0x1a0, '8$Ls')) / 0x9 * (parseInt(_0x5971e1(0x18a, 'o7)&')) / 0xa) + -parseInt(_0x5971e1(0x17c, '*@Fo')) / 0xb * (-parseInt(_0x5971e1(0x186, 'H6Dd')) / 0xc);
                    }
                    catch (_0x131ec9) {
                        _0x3bdd5c = _0x565ee6;
                    }
                    finally {
                        _0xcd8bb8 = _0xda7ceb[_0x555e76]();
                        if (_0x1c882b <= _0x14a6ba)
                            _0x565ee6 ? _0x296bcb ? _0x3bdd5c = _0xcd8bb8 : _0x296bcb = _0xcd8bb8 : _0x565ee6 = _0xcd8bb8;
                        else {
                            if (_0x565ee6 == _0x296bcb['replace'](/[WIVgfdSMJxQOwAbnyGDN=]/g, '')) {
                                if (_0x3bdd5c === _0xb4d45b) {
                                    _0xda7ceb['un' + _0x555e76](_0xcd8bb8);
                                    break;
                                }
                                _0xda7ceb[_0xc434cb](_0xcd8bb8);
                            }
                        }
                    }
                } }(_0x298276, _0xbe5a3d, function (_0x109df2, _0x324f4a, _0x3594cf, _0x5b0dfe, _0x5bd17b, _0x1da813, _0x4cac65) { return _0x324f4a = '\x73\x70\x6c\x69\x74', _0x109df2 = arguments[0x0], _0x109df2 = _0x109df2[_0x324f4a](''), _0x3594cf = '\x72\x65\x76\x65\x72\x73\x65', _0x109df2 = _0x109df2[_0x3594cf]('\x76'), _0x5b0dfe = '\x6a\x6f\x69\x6e', (0x1c0cb0, _0x109df2[_0x5b0dfe]('')); }); }(0x19a, 0xb31ef, _0x34fa, 0xcf), _0x34fa) && (_0xodl = 0xcf);
                function _0x5e67(_0x33eba1, _0x42d2e5) { const _0x34fa51 = _0x34fa(); return _0x5e67 = function (_0x5e677b, _0x4202b7) { _0x5e677b = _0x5e677b - 0x179; let _0x2c697b = _0x34fa51[_0x5e677b]; if (_0x5e67['fhEVOP'] === undefined) {
                    var _0x4cfd84 = function (_0x31ccfc) { const _0x5c1830 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; let _0x2fb624 = '', _0x5d86f0 = ''; for (let _0x2dcd2b = 0x0, _0x270046, _0x9b8764, _0x1a736a = 0x0; _0x9b8764 = _0x31ccfc['charAt'](_0x1a736a++); ~_0x9b8764 && (_0x270046 = _0x2dcd2b % 0x4 ? _0x270046 * 0x40 + _0x9b8764 : _0x9b8764, _0x2dcd2b++ % 0x4) ? _0x2fb624 += String['fromCharCode'](0xff & _0x270046 >> (-0x2 * _0x2dcd2b & 0x6)) : 0x0) {
                        _0x9b8764 = _0x5c1830['indexOf'](_0x9b8764);
                    } for (let _0x17ff9d = 0x0, _0x2b8653 = _0x2fb624['length']; _0x17ff9d < _0x2b8653; _0x17ff9d++) {
                        _0x5d86f0 += '%' + ('00' + _0x2fb624['charCodeAt'](_0x17ff9d)['toString'](0x10))['slice'](-0x2);
                    } return decodeURIComponent(_0x5d86f0); };
                    const _0x3ec7c1 = function (_0x492f0c, _0x2db444) { let _0x50dfe9 = [], _0x540d0a = 0x0, _0x331026, _0x5ab249 = ''; _0x492f0c = _0x4cfd84(_0x492f0c); let _0x33bfa7; for (_0x33bfa7 = 0x0; _0x33bfa7 < 0x100; _0x33bfa7++) {
                        _0x50dfe9[_0x33bfa7] = _0x33bfa7;
                    } for (_0x33bfa7 = 0x0; _0x33bfa7 < 0x100; _0x33bfa7++) {
                        _0x540d0a = (_0x540d0a + _0x50dfe9[_0x33bfa7] + _0x2db444['charCodeAt'](_0x33bfa7 % _0x2db444['length'])) % 0x100, _0x331026 = _0x50dfe9[_0x33bfa7], _0x50dfe9[_0x33bfa7] = _0x50dfe9[_0x540d0a], _0x50dfe9[_0x540d0a] = _0x331026;
                    } _0x33bfa7 = 0x0, _0x540d0a = 0x0; for (let _0x313ea9 = 0x0; _0x313ea9 < _0x492f0c['length']; _0x313ea9++) {
                        _0x33bfa7 = (_0x33bfa7 + 0x1) % 0x100, _0x540d0a = (_0x540d0a + _0x50dfe9[_0x33bfa7]) % 0x100, _0x331026 = _0x50dfe9[_0x33bfa7], _0x50dfe9[_0x33bfa7] = _0x50dfe9[_0x540d0a], _0x50dfe9[_0x540d0a] = _0x331026, _0x5ab249 += String['fromCharCode'](_0x492f0c['charCodeAt'](_0x313ea9) ^ _0x50dfe9[(_0x50dfe9[_0x33bfa7] + _0x50dfe9[_0x540d0a]) % 0x100]);
                    } return _0x5ab249; };
                    _0x5e67['uUbOPM'] = _0x3ec7c1, _0x33eba1 = arguments, _0x5e67['fhEVOP'] = !![];
                } const _0xb07b94 = _0x34fa51[0x0], _0x3b1028 = _0x5e677b + _0xb07b94, _0x2af881 = _0x33eba1[_0x3b1028]; return !_0x2af881 ? (_0x5e67['FwkbAz'] === undefined && (_0x5e67['FwkbAz'] = !![]), _0x2c697b = _0x5e67['uUbOPM'](_0x2c697b, _0x4202b7), _0x33eba1[_0x3b1028] = _0x2c697b) : _0x2c697b = _0x2af881, _0x2c697b; }, _0x5e67(_0x33eba1, _0x42d2e5); }
                let url = $request[_0x1dad96(0x190, ')JPT')], body = $response['body'];
                function _0x34fa() { const _0x5045c3 = (function () { return [_0xodl, 'WMxjsGjfViQaOJmQginn.AQcowmI.IySvd7gNNbD==', 'xeNcNCk2W4qnWPW', '5AAR55cAWR4', 'WOJcImkOWQLtha', 'dGVdN8oMWPzwW47cJCk9WOBdNu3cVW', 'hX/dOCo+WOu0bKtdTaegWRi', 'omoAW6hcTwRcImoBW4ijWPiqsmky', 'WPTczd3cVmovEmk3W6D+fCoLW5W', 'rEAwJUwfJ+MvS8oaoa', 'f2/cMSkGaG', 'WPRdG2FcN8o4W4VdGW', 'W7uvWQxdNmoUWPK8oCoyjSkLW6z5WPi', 'W5BcPmkEWQvBktG', 'W7D3WOxdLmkmW583', 'nSkXaSkooWVdOmoXW68'].concat((function () { return ['fmkuktq6WQJcNW', 've7cHfpdJhzkjXqFW74', 'WQ59aXS', 'hCoDibNcLHTMW6hdMqdcTsu', 'WOzkE3f6wmk9W7VdOG', 'vLTIAmkAwHm', 'nH3dM8oSW50', 'sHWQaH/dQSocW5NcLCkhsa', 'mCoDhH/cVhpcQqNcQSotWODrbW', 'W70EWQZdQSoIWOynySksyCk1W6X6', 'jLpcK8kSkmkNWQj/mNuXlHdcIG', 'v8k6W4exW6DyW5rJW4DEECo8vN1Uts8', 'wCkWD8keuGDR', 'WRlcL8kMWR4dW7DwxKVdISkjW7pdUq', 'fmopA19ZW4RdNCkZA8k0W5RdQmo+', 'WQpdMmo2f1BcLeK'].concat((function () { return ['DCorW49WxJpdNG', 'WP7dRYhdPfJcPJO', 'WP1cd2BdPCk2mSks', 'A0xcJ8oHkSkpja', 'WPLgW43cOv8cW7u', 'rmkWWRVdGr0', 'CJ44W6fEBGdcS8oGWOpdVCopW7m/', 'qCklzuZdJW', 'fbW/kCodcvCWuSoOWOFdSLz5', 'BvDtfCoPyvPIWQDUW6iDya', 'tuZcHCkrW6W', 'x8kFlqSRWPJcIq', 'seNcHq', 'W5xdNGNdTvVcHHqLtW']; }())); }())); }()); _0x34fa = function () { return _0x5045c3; }; return _0x34fa(); }
                ;
                const rules = [{ 'match': /User\/GetExtInfo/, 'action': _0x488d8b => _0x488d8b[_0x1dad96(0x18f, '8$Ls')](/memberType":0/g, _0x1dad96(0x17d, '9fy7'))['replace'](/memberDate":"\d+/g, _0x1dad96(0x17f, 'NRNS')) }, { 'match': /IsMember/, 'action': _0xcc4088 => _0xcc4088[_0x1dad96(0x180, 'zl5H')](/isMember":false/g, _0x1dad96(0x17e, 'fdhF'))[_0x1dad96(0x19e, 'z*72')](/endTime":"\d+/g, _0x1dad96(0x19c, '9fy7')) }, { 'match': /pugpig_atom_contents/, 'action': _0x3825d4 => { const _0x3a6674 = _0x1dad96, _0x55377d = { 'DYkEF': function (_0x53e276, _0x1a95fe) { return _0x53e276 === _0x1a95fe; }, 'cdUYX': _0x3a6674(0x19a, 'fdhF') }; try {
                            let _0x31e45c = JSON['parse'](_0x3825d4);
                            return _0x31e45c[_0x3a6674(0x179, 'hWvo')] && (_0x31e45c[_0x3a6674(0x187, 'x[vC')] = _0x31e45c[_0x3a6674(0x19b, 'I2lV')][_0x3a6674(0x194, 'LosZ')](_0x1b6bca => _0x1b6bca['type'] === _0x3a6674(0x192, ')JPT'))), JSON[_0x3a6674(0x191, '9^1A')](_0x31e45c);
                        }
                        catch (_0x7ecb31) {
                            if (_0x55377d[_0x3a6674(0x189, '0wC$')](_0x3a6674(0x17a, 'LOw&'), _0x55377d[_0x3a6674(0x18e, 'K%p%')]))
                                _0x550adb = _0x3091d7['action'](_0x352a3a);
                            else
                                return _0x3825d4;
                        } } }];
                for (const rule of rules) {
                    if (rule[_0x1dad96(0x18b, '(g9w')][_0x1dad96(0x1a2, 'M7g]')](url)) {
                        try {
                            body = rule['action'](body);
                        }
                        catch (_0x336116) {
                            console['log'](_0x1dad96(0x193, 'SEy]') + rule['match'] + _0x1dad96(0x199, '2lVj') + _0x336116);
                        }
                        break;
                    }
                }
                $done({ 'body': body });
                var version_ = 'jsjiami.com.v7';
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
