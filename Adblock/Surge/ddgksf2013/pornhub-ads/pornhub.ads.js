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
                const name = "pornhub.ads.js";
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
                var _0xodi = 'jsjiami.com.v7';
                function _0x5d9c(_0x9f1558, _0xed1cd9) { const _0x4973cc = _0x4973(); return _0x5d9c = function (_0x5d9cf6, _0x30972b) { _0x5d9cf6 = _0x5d9cf6 - 0x15c; let _0x58a711 = _0x4973cc[_0x5d9cf6]; if (_0x5d9c['kYNriy'] === undefined) {
                    var _0xca1599 = function (_0x5e9f25) { const _0x3e8c49 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; let _0x1ab394 = '', _0x2048a4 = ''; for (let _0x3cc53f = 0x0, _0x4190a9, _0x36adb5, _0x3e4b10 = 0x0; _0x36adb5 = _0x5e9f25['charAt'](_0x3e4b10++); ~_0x36adb5 && (_0x4190a9 = _0x3cc53f % 0x4 ? _0x4190a9 * 0x40 + _0x36adb5 : _0x36adb5, _0x3cc53f++ % 0x4) ? _0x1ab394 += String['fromCharCode'](0xff & _0x4190a9 >> (-0x2 * _0x3cc53f & 0x6)) : 0x0) {
                        _0x36adb5 = _0x3e8c49['indexOf'](_0x36adb5);
                    } for (let _0x4ed161 = 0x0, _0x3d9d1d = _0x1ab394['length']; _0x4ed161 < _0x3d9d1d; _0x4ed161++) {
                        _0x2048a4 += '%' + ('00' + _0x1ab394['charCodeAt'](_0x4ed161)['toString'](0x10))['slice'](-0x2);
                    } return decodeURIComponent(_0x2048a4); };
                    const _0x5bb3e8 = function (_0x533fb0, _0x12717e) { let _0x3abba2 = [], _0x29902f = 0x0, _0x25f425, _0x3e1e80 = ''; _0x533fb0 = _0xca1599(_0x533fb0); let _0x163d60; for (_0x163d60 = 0x0; _0x163d60 < 0x100; _0x163d60++) {
                        _0x3abba2[_0x163d60] = _0x163d60;
                    } for (_0x163d60 = 0x0; _0x163d60 < 0x100; _0x163d60++) {
                        _0x29902f = (_0x29902f + _0x3abba2[_0x163d60] + _0x12717e['charCodeAt'](_0x163d60 % _0x12717e['length'])) % 0x100, _0x25f425 = _0x3abba2[_0x163d60], _0x3abba2[_0x163d60] = _0x3abba2[_0x29902f], _0x3abba2[_0x29902f] = _0x25f425;
                    } _0x163d60 = 0x0, _0x29902f = 0x0; for (let _0x545333 = 0x0; _0x545333 < _0x533fb0['length']; _0x545333++) {
                        _0x163d60 = (_0x163d60 + 0x1) % 0x100, _0x29902f = (_0x29902f + _0x3abba2[_0x163d60]) % 0x100, _0x25f425 = _0x3abba2[_0x163d60], _0x3abba2[_0x163d60] = _0x3abba2[_0x29902f], _0x3abba2[_0x29902f] = _0x25f425, _0x3e1e80 += String['fromCharCode'](_0x533fb0['charCodeAt'](_0x545333) ^ _0x3abba2[(_0x3abba2[_0x163d60] + _0x3abba2[_0x29902f]) % 0x100]);
                    } return _0x3e1e80; };
                    _0x5d9c['PHLPyX'] = _0x5bb3e8, _0x9f1558 = arguments, _0x5d9c['kYNriy'] = !![];
                } const _0x313823 = _0x4973cc[0x0], _0x4fbfe1 = _0x5d9cf6 + _0x313823, _0x32056 = _0x9f1558[_0x4fbfe1]; return !_0x32056 ? (_0x5d9c['fbgoSo'] === undefined && (_0x5d9c['fbgoSo'] = !![]), _0x58a711 = _0x5d9c['PHLPyX'](_0x58a711, _0x30972b), _0x9f1558[_0x4fbfe1] = _0x58a711) : _0x58a711 = _0x32056, _0x58a711; }, _0x5d9c(_0x9f1558, _0xed1cd9); }
                const _0x42d722 = _0x5d9c;
                (function (_0x1c9c73, _0x482e9, _0x2e9282, _0x39d330, _0x1a27cb, _0x5e102e, _0x5f16a3) { return _0x1c9c73 = _0x1c9c73 >> 0x1, _0x5e102e = 'hs', _0x5f16a3 = 'hs', function (_0x29086e, _0x2bb48f, _0x47b255, _0x3600d4, _0x22bac4) { const _0x4ca8a7 = _0x5d9c; _0x3600d4 = 'tfi', _0x5e102e = _0x3600d4 + _0x5e102e, _0x22bac4 = 'up', _0x5f16a3 += _0x22bac4, _0x5e102e = _0x47b255(_0x5e102e), _0x5f16a3 = _0x47b255(_0x5f16a3), _0x47b255 = 0x0; const _0x302312 = _0x29086e(); while (!![] && --_0x39d330 + _0x2bb48f) {
                    try {
                        _0x3600d4 = parseInt(_0x4ca8a7(0x174, 'H1fh')) / 0x1 * (parseInt(_0x4ca8a7(0x15e, 'zV)n')) / 0x2) + parseInt(_0x4ca8a7(0x17a, 'rAEJ')) / 0x3 * (parseInt(_0x4ca8a7(0x168, 'K^aR')) / 0x4) + -parseInt(_0x4ca8a7(0x16c, 'qa@X')) / 0x5 * (parseInt(_0x4ca8a7(0x178, '^s$W')) / 0x6) + -parseInt(_0x4ca8a7(0x167, 'rAEJ')) / 0x7 * (parseInt(_0x4ca8a7(0x16d, '5H7y')) / 0x8) + parseInt(_0x4ca8a7(0x161, 'K^aR')) / 0x9 + -parseInt(_0x4ca8a7(0x164, 'IHBZ')) / 0xa * (-parseInt(_0x4ca8a7(0x16e, '&h(Y')) / 0xb) + -parseInt(_0x4ca8a7(0x16a, '(AS)')) / 0xc * (parseInt(_0x4ca8a7(0x15c, 'ceC(')) / 0xd);
                    }
                    catch (_0xeac755) {
                        _0x3600d4 = _0x47b255;
                    }
                    finally {
                        _0x22bac4 = _0x302312[_0x5e102e]();
                        if (_0x1c9c73 <= _0x39d330)
                            _0x47b255 ? _0x1a27cb ? _0x3600d4 = _0x22bac4 : _0x1a27cb = _0x22bac4 : _0x47b255 = _0x22bac4;
                        else {
                            if (_0x47b255 == _0x1a27cb['replace'](/[HRfApbVTFKDyGLrPhW=]/g, '')) {
                                if (_0x3600d4 === _0x2bb48f) {
                                    _0x302312['un' + _0x5e102e](_0x22bac4);
                                    break;
                                }
                                _0x302312[_0x5f16a3](_0x22bac4);
                            }
                        }
                    }
                } }(_0x2e9282, _0x482e9, function (_0x278751, _0x45d37, _0x1e9a50, _0x579fdf, _0x5468a7, _0x4c2712, _0xff4e96) { return _0x45d37 = '\x73\x70\x6c\x69\x74', _0x278751 = arguments[0x0], _0x278751 = _0x278751[_0x45d37](''), _0x1e9a50 = '\x72\x65\x76\x65\x72\x73\x65', _0x278751 = _0x278751[_0x1e9a50]('\x76'), _0x579fdf = '\x6a\x6f\x69\x6e', (0x1c65d2, _0x278751[_0x579fdf]('')); }); }(0x182, 0xebb25, _0x4973, 0xc3), _0x4973) && (_0xodi = _0x42d722(0x15d, 'K^aR'));
                var url = $request[_0x42d722(0x15f, '41c4')];
                let body = $response[_0x42d722(0x177, 'qa@X')];
                function _0x4973() { const _0x28b211 = (function () { return [_0xodi, 'RLPjWHGsPTyjrhDiTaVAKmFir.fcVyoHmT.phbv7==', 'CSo9WQRdHNBcJHyfwG', 'WR/cPCoQfhJcL8knWPhdO0VdLG7cHu4tbmonWPf/qCo1WPpcJ8kuW7WEoSkizXvHkxv+D8o5fmoCWPhdTGbCEdpdQ8ontgmvWQldMCo0WONcPqtcImo6cmk+jCkSmHpcSSkGiNLDgeruFmkrBCkGWOCeWQxdKmoXCSo9W40KtmopWPiFa8kwWQDvgCkKWR7dMCkpW4HaBuldRmk9v1SRWOZdShVcOmoYW6C1WRJcKsn7dmoMW63dKNldUSoIjCozWQiDAxPTW5HZnr1SyqxdR8oAqCk6WOFdK8oeW6NcVuFcR8kiW5PesNJdKweGmxtdUbWiEK9XWRJdHmkKW7ldP8o6xqFdQhaqW51tW6hcNmkFoSkVhSoZfGCfWP1+bSkBW4lcKvLgW6WnuaHKWRJdTZfiWRyptbWyWO5XWOxdK8ksl07cGZ0vgmoeW74BysaLWRhcVSoiW6eeW7BdU08JBh3dUYnyW5ZcJmobWPLmFf99WPOEd8oHWPFdI8kDW5VdU8oNe33dK1XGWR5AaCoJW7pdSLuzgav8WP3cHCkqW57dHSoOW70Nw8oefN8+nI0HqSk1DKNdH8osW6OSWPVdNCkmd8kUE8k5WPuirapdGSo3eeGPWQvXlSoaECkkW5rFucfHWRW2WRjXW4tcHrNcNmoOdwpdUCo4xSkUW6WfW7X2W69GWOH6W5LvWQKcFHhdImkJWPBcTSkwWODqWQBcVtKKW7qPWPVdLb0uW6ddIXW6xCk9WQFcVa/cIsiKW4DatGVcRSozWOWiiSkWdgddOCkhtCkjW6XLW5WBobu8WQ/cG8kQW4VdP13dPSokWRu7FKRcNL7cMmoYmmkPWRJcKmohW7Hxmq1TWPqQW7jhhtVcLvfxWOlcM8omhmkIW7RdRxTsrNSGdSoceCo7WQVcLSkjW7DekmksW4tcMSoZjri4W6VcJJ1iAmkjWPZdImkbCmkWWOpcG8kdnhBdU8kpnw/dGSovf8kVrIRcI8oIW6hdUsGAW4/dTuCgW6fqW6jQk8oP', 'nd5HWQWCWOVcR39TWOtcVvBcMG', 'W6ddM0bvf8kYEmkip8k3ba', 'wsFcQrfOldO', 'eq/cLqJdTLhcSmoGWOG+ECoUW4Kp', 'WQJcLWZcJCoOW4DjW7a9uCkirSkbWRe', 'uConzwdcT8kLWRLYxIex', 'W4PNW53cGgVcTbG', 'amozW6r3WQFdHNSrWQu'].concat((function () { return ['WP3dKCkhW5FdVvVdTLmfpSop', 'W7dcJf5lDSoJWRldQaG', 'WO/cT2/dLMpcVbRcGd9BWPvH', 'a8olWPNdVMffW6H8', 'WQpdI30Lx8kvW6m', 'WRddT8kEj8oVW4JdIfvQ', 'dSoxWPVdSKjmWRi', 'dmkfWRKeW7pdNM3dGmo/CCo1oKX0ECo2dNWgWPPJWQ3cQSoXW77dP8kEW4hdMwyBW4pcVgdcPmkimsxcISoVcfiTWRLlW6zfW6dcPX/cJSkIF8oIWRddJfZcKmozpZdcPg3dOmocuSoycXzzdYDIW491FqlcQG3dLGCZWRtdHSkHWQ48fvJcJH59d8kuW43dH8oCWRhcImk6W4DkqSkpWPJcLCoryfJdICoPWQ/dOY3cItNcONhcNg3dHHlcTmkxWQZcHCoxWPZcLsNcVv/cJ8ozzdniWQtcQmknsSoRESkRWRWEW4xdU8oYWQuWWPJcPmkGW45bvbZdKmofo8oHCmorWPu/WPtdPa1LwZGYqCo9cmoKemoYE8ozACkvWRXSW6ldGfa/D8kWomoWCSo7WRGKAmoaymkSECkPW4uzuw95WRNcKmoBW5vEdLnIumk5CSoTzcuzWPOsWRBcTmkBW5ldPLvTuM3dPCoRACoF5yAM6zAA5A6j5y+E6yAB776w5AYK5BMzW4DZdSoLW4itnCo7WOGhC8kuW5ZcMw8BW6DqgmkjrcNVV492WRD5qMVdPSk0nSkNyCoxuY/cKMNdLfJdUwPPW7e3WRD0Cmo5kqZcUCkrW6JdKMJcTffBa8k5u1b9WODgW55/WORcOX7dStxdHSoaW5lcKtefuXlcIGFdUNddNrCpxdtcLrVcKea3mCoWfey3WQpdK8kyCKiFvwanl8o3W5aoWOSWWPdcKLpdKcrYW7SXxLVcOaddG8k3W6pcImkCW78YWRTgW4KXWR4Gg8o+A8ohzNhcUgG2oqWDWQD4f8ofW6qDe3VdImkEhSo7WOK5ut7dRxhdQ8kxWRnVWQ7dT3pcNfCdW6GyWRraWPjMW5KuW7jrW4ZcQ8kivu/dOmkrWQa/luRdICoWu8olbmkXWQJdVSoOACopW6nIWQVcKSkVs8kvEHRdLmowWRivW73cNmkCcZ7dUbtcUCkyba19yq3cJa9BW6tcLx7cOJlcImoCE3dcOITzW4OQd8kAW6jXBCkcnSkDwmotWOzAju5sWOhdN2jHWRqRzauHW7HkW7tcRGmIlCkbW4qXsWVcPq8Wb8opdSkvDgyOWQtcJ8kqW7aBWPRdUmohW6uY', 'amkxnIG', 'WQZdS3PSpSkeW4rzW6e', 'rCoezuf3lCksp3S', 'mt9KW4XxW6FdJgzK'].concat((function () { return ['WPNdMSoAWO7cH2tdI3y', 'WR/cKb0mtSknsmoul8kzpInlWPO', 'wSkXxxrYDCo4W7JcHLdcRq', 'a3hcMq', 'ymoVWP7dOcaKWObtEhFcVmkDW5y', 'W6hdLefsfSoxfmkFhmkFnxrk', 'WRpdMX1XzmozWOy', 'rCocAZq/uSoDlu5OrCoVCW', 'W7dcH10OnmkkWRtdRqP7iCkM']; }())); }())); }()); _0x4973 = function () { return _0x28b211; }; return _0x4973(); }
                ;
                const injectJS = _0x42d722(0x176, 'WGcL'), style = _0x42d722(0x166, 'aKft');
                body = body[_0x42d722(0x162, 'IHBZ')](_0x42d722(0x175, 'oHw8'), style + injectJS + _0x42d722(0x169, 'gh(&')), $done({ 'body': body });
                var version_ = 'jsjiami.com.v7';
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
