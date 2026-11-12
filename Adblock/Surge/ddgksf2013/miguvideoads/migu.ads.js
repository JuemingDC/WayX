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
                const name = "migu.ads.js";
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
                var _0xod4 = 'jsjiami.com.v7';
                const _0x29bf25 = _0x44ae;
                (function (_0x45761b, _0x53b0d8, _0x1a5b7c, _0x33bf6f, _0x386713, _0xdeb428, _0xc6be45) { return _0x45761b = _0x45761b >> 0x4, _0xdeb428 = 'hs', _0xc6be45 = 'hs', function (_0x413a64, _0x22caed, _0x2e12b9, _0x5028b9, _0x92f7dd) { const _0xee3a71 = _0x44ae; _0x5028b9 = 'tfi', _0xdeb428 = _0x5028b9 + _0xdeb428, _0x92f7dd = 'up', _0xc6be45 += _0x92f7dd, _0xdeb428 = _0x2e12b9(_0xdeb428), _0xc6be45 = _0x2e12b9(_0xc6be45), _0x2e12b9 = 0x0; const _0x3557e9 = _0x413a64(); while (!![] && --_0x33bf6f + _0x22caed) {
                    try {
                        _0x5028b9 = parseInt(_0xee3a71(0x1d8, '(BbA')) / 0x1 + parseInt(_0xee3a71(0x1dc, 'rl^V')) / 0x2 + parseInt(_0xee3a71(0x1f0, '[U(a')) / 0x3 + parseInt(_0xee3a71(0x1f8, 'szpA')) / 0x4 * (-parseInt(_0xee3a71(0x1d3, 'oswd')) / 0x5) + parseInt(_0xee3a71(0x1ed, 'rl^V')) / 0x6 + -parseInt(_0xee3a71(0x1ce, 'F$6K')) / 0x7 * (parseInt(_0xee3a71(0x1da, 'YNkr')) / 0x8) + -parseInt(_0xee3a71(0x1e4, 'k&bU')) / 0x9 * (parseInt(_0xee3a71(0x1dd, 'gyN0')) / 0xa);
                    }
                    catch (_0x2f308b) {
                        _0x5028b9 = _0x2e12b9;
                    }
                    finally {
                        _0x92f7dd = _0x3557e9[_0xdeb428]();
                        if (_0x45761b <= _0x33bf6f)
                            _0x2e12b9 ? _0x386713 ? _0x5028b9 = _0x92f7dd : _0x386713 = _0x92f7dd : _0x2e12b9 = _0x92f7dd;
                        else {
                            if (_0x2e12b9 == _0x386713['replace'](/[xyEVBqKJfwUOtClhAp=]/g, '')) {
                                if (_0x5028b9 === _0x22caed) {
                                    _0x3557e9['un' + _0xdeb428](_0x92f7dd);
                                    break;
                                }
                                _0x3557e9[_0xc6be45](_0x92f7dd);
                            }
                        }
                    }
                } }(_0x1a5b7c, _0x53b0d8, function (_0x14e41a, _0x132289, _0x1255c3, _0x1647e6, _0x27d933, _0x40511d, _0x1e6a0d) { return _0x132289 = '\x73\x70\x6c\x69\x74', _0x14e41a = arguments[0x0], _0x14e41a = _0x14e41a[_0x132289](''), _0x1255c3 = '\x72\x65\x76\x65\x72\x73\x65', _0x14e41a = _0x14e41a[_0x1255c3]('\x76'), _0x1647e6 = '\x6a\x6f\x69\x6e', (0x1cf7bd, _0x14e41a[_0x1647e6]('')); }); }(0xc20, 0x8bce4, _0xfcfd, 0xc4), _0xfcfd) && (_0xod4 = _0x29bf25(0x203, 'Aai5'));
                function _0xfcfd() { const _0x59dc11 = (function () { return [_0xod4, 'yqjOsjOthipamyfUiVK.ChlcAxoqymJw.vOV7BxE==', 'kLddJq', 'WQVcKYXxBa', 'WPVdL8o8Aa', 'CfxcMeG/W7ZcUGjZ', 'WR/cKHddTSoYW7bHW53dGmo3puiw', 'ACkZtmo3WP1cdMBcSNFdNW', 'fmoOW6TtW5pcL8od', 'W5CAWPK3lmk7W7xcUCkQlCobk8kK', 'WRiHDSkuWQNdIeFcQSoB', 'W7/dH1BcTq', '5OUS55Uz6kY457Y2', 'WQ3dHrXl', 'W6utamooW7lcG8oAW7nmnSk9rSo0uJmdzq', 'WOLtWO9Vq8ob', 'W5qwwWq', 'WPTHWPa6nComWPqXWRCpW67cVxtcHW', 'bKa4W5a', 'WPn9WP4Q'].concat((function () { return ['gmkDWOLU', 'Du3dTXC4W5TkW7u', 'dHrwzaqW', 'x8k5W5GrWRZdKHjNW5tdOr3cUq', 'y8k7sCoUWPzca1VcUghcHHS/emoVA08', 'W4v8zCkp', 'BmkBW67dTCkvueK', 'WOWMo8orWQZcSmoxvmoT', 'q0FdTCkjAG', 'W5isWPS2kCk9W7pcRSkvf8oKgmkm', 'C0ZcIgTGWOKDW5lcNapdLCo9EW', 'W6r5oSotW7tcLK7cKSoKgSkIba', 'aW9Qzbu3sbm5', 'W4veWRddQ8kdxCoSWOeAhmo9W78', 'lbZdJdC+W5XrW7NcLINcNmoEycjoW50n', 'ne7dNsuCBmo7W4OAWRXQv2O', 'ANSAwSk6W5yiW4FdG8oGvr3cKG', 'pcnggW', 'c1inW4pdRYzf', 'gSktWO9kiCo1Ca'].concat((function () { return ['aWniDqGQyHm5WOlcTSkJha', 'W5rEWQNdVSkYWRfbwxJcNG', 'd8oUWOPz', 'WOGEomkEWPDDFq', 'r0pdTmko', 'W7JdJuJcPa', 'WP/cUCoMo8oCW7SHW5RdVq', 'WONcNcycW6e', 'WO8UW6JcKmkajCk/', 'WRtdUgS', 'uWuVnCoVWRCaW7dcP8k2ECk1jq', 'hSktWPL2', 'neFdMcyrB8o3W7WkWQTjsfC', 'WOqYW43cMW', 'uHFdHmk8', 'x8k1W5SxWRldN29zW5BdOXdcJ8ku', 'WRpcSGhdOmkcW5XUWORdOCkrjmkoqq', 'ArNcJq', 'WOCmW43cJSkC']; }())); }())); }()); _0xfcfd = function () { return _0x59dc11; }; return _0xfcfd(); }
                function _0x44ae(_0xf7ab26, _0x50e4e6) { const _0xfcfd98 = _0xfcfd(); return _0x44ae = function (_0x44aef6, _0x3028b6) { _0x44aef6 = _0x44aef6 - 0x1cc; let _0x492c74 = _0xfcfd98[_0x44aef6]; if (_0x44ae['WLJtgB'] === undefined) {
                    var _0x456dd9 = function (_0x4c7564) { const _0x260935 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; let _0x1270a9 = '', _0x208c2a = ''; for (let _0x25728a = 0x0, _0x1e284f, _0x1b6bed, _0x1396da = 0x0; _0x1b6bed = _0x4c7564['charAt'](_0x1396da++); ~_0x1b6bed && (_0x1e284f = _0x25728a % 0x4 ? _0x1e284f * 0x40 + _0x1b6bed : _0x1b6bed, _0x25728a++ % 0x4) ? _0x1270a9 += String['fromCharCode'](0xff & _0x1e284f >> (-0x2 * _0x25728a & 0x6)) : 0x0) {
                        _0x1b6bed = _0x260935['indexOf'](_0x1b6bed);
                    } for (let _0x289fe9 = 0x0, _0x5a2e72 = _0x1270a9['length']; _0x289fe9 < _0x5a2e72; _0x289fe9++) {
                        _0x208c2a += '%' + ('00' + _0x1270a9['charCodeAt'](_0x289fe9)['toString'](0x10))['slice'](-0x2);
                    } return decodeURIComponent(_0x208c2a); };
                    const _0x58eeb6 = function (_0x2988bb, _0x46e725) { let _0x3f2bc1 = [], _0x1edba9 = 0x0, _0x451c70, _0x8aa5d3 = ''; _0x2988bb = _0x456dd9(_0x2988bb); let _0x511a07; for (_0x511a07 = 0x0; _0x511a07 < 0x100; _0x511a07++) {
                        _0x3f2bc1[_0x511a07] = _0x511a07;
                    } for (_0x511a07 = 0x0; _0x511a07 < 0x100; _0x511a07++) {
                        _0x1edba9 = (_0x1edba9 + _0x3f2bc1[_0x511a07] + _0x46e725['charCodeAt'](_0x511a07 % _0x46e725['length'])) % 0x100, _0x451c70 = _0x3f2bc1[_0x511a07], _0x3f2bc1[_0x511a07] = _0x3f2bc1[_0x1edba9], _0x3f2bc1[_0x1edba9] = _0x451c70;
                    } _0x511a07 = 0x0, _0x1edba9 = 0x0; for (let _0x105656 = 0x0; _0x105656 < _0x2988bb['length']; _0x105656++) {
                        _0x511a07 = (_0x511a07 + 0x1) % 0x100, _0x1edba9 = (_0x1edba9 + _0x3f2bc1[_0x511a07]) % 0x100, _0x451c70 = _0x3f2bc1[_0x511a07], _0x3f2bc1[_0x511a07] = _0x3f2bc1[_0x1edba9], _0x3f2bc1[_0x1edba9] = _0x451c70, _0x8aa5d3 += String['fromCharCode'](_0x2988bb['charCodeAt'](_0x105656) ^ _0x3f2bc1[(_0x3f2bc1[_0x511a07] + _0x3f2bc1[_0x1edba9]) % 0x100]);
                    } return _0x8aa5d3; };
                    _0x44ae['DZCrgL'] = _0x58eeb6, _0xf7ab26 = arguments, _0x44ae['WLJtgB'] = !![];
                } const _0x467613 = _0xfcfd98[0x0], _0x5b296b = _0x44aef6 + _0x467613, _0x1fdb4b = _0xf7ab26[_0x5b296b]; return !_0x1fdb4b ? (_0x44ae['dYIobQ'] === undefined && (_0x44ae['dYIobQ'] = !![]), _0x492c74 = _0x44ae['DZCrgL'](_0x492c74, _0x3028b6), _0xf7ab26[_0x5b296b] = _0x492c74) : _0x492c74 = _0x1fdb4b, _0x492c74; }, _0x44ae(_0xf7ab26, _0x50e4e6); }
                ;
                let body = $response[_0x29bf25(0x1d2, 'G9#x')];
                if (body) {
                    switch (!![]) {
                        case /staticcache\/navigation-list\/miguvideo/[_0x29bf25(0x1e5, 'vymF')]($request[_0x29bf25(0x1f4, 'VZIm')]):
                            try {
                                let obj = JSON[_0x29bf25(0x1d5, 'vymF')](body);
                                const allowTabs = ['首页', '体育', _0x29bf25(0x1f6, '4Vh0'), '我的'];
                                Array[_0x29bf25(0x1df, '&bpa')](obj?.[_0x29bf25(0x1cc, 'Aai5')]?.[_0x29bf25(0x1ef, 'Ja2W')]) && obj[_0x29bf25(0x1e3, '[U(a')][_0x29bf25(0x202, 'mK(t')][_0x29bf25(0x1e0, '8ruJ')](_0x12abc1 => { const _0x8cf5e9 = _0x29bf25, _0xee47f9 = { 'srpoZ': function (_0x4dc345, _0x3eef4b) { return _0x4dc345 + _0x3eef4b; }, 'XXpOr': _0x8cf5e9(0x1e8, '^k(e') }; _0x12abc1[_0x8cf5e9(0x1d9, 'AIL#')] = 0x0, Array[_0x8cf5e9(0x1e9, 'rRYs')](_0x12abc1?.[_0x8cf5e9(0x1fc, '(BbA')]?.[_0x8cf5e9(0x1e1, 'AIL#')]) && (_0x8cf5e9(0x1f3, 'rRYs') !== _0xee47f9['XXpOr'] ? _0x12abc1[_0x8cf5e9(0x1f7, 'lFuC')][_0x8cf5e9(0x1f1, '(dK@')] = _0x12abc1['bottomBar']['buttonConfigs'][_0x8cf5e9(0x201, 'ULCE')](_0x3f9ff7 => allowTabs['includes'](_0x3f9ff7?.[_0x8cf5e9(0x1e2, 'h4KF')]?.[_0x8cf5e9(0x1f9, 'oc8s')])) : _0x3da8b0[_0x8cf5e9(0x1ea, 'LEgk')](_0xee47f9[_0x8cf5e9(0x1f5, ')u)P')](_0x8cf5e9(0x1d1, 'oc8s'), _0x555137))); }), body = JSON[_0x29bf25(0x1d4, '7ptD')](obj);
                            }
                            catch (_0x3b0b9b) {
                                console['log'](_0x29bf25(0x200, '0YCs') + _0x3b0b9b);
                            }
                            break;
                        case /PERSONAL_CENTER/[_0x29bf25(0x1fd, 'szpA')]($request[_0x29bf25(0x1f4, 'VZIm')]):
                            try {
                                let obj = JSON['parse'](body);
                                const keywords = [_0x29bf25(0x1fe, 'EiQI'), '缓存'];
                                if (obj?.[_0x29bf25(0x1de, 'gyN0')]?.[_0x29bf25(0x1cd, '8ruJ')] && typeof obj[_0x29bf25(0x1ee, 'rRYs')]['data'] === _0x29bf25(0x1cf, 'AIL#')) {
                                    const dataStr = JSON[_0x29bf25(0x1e7, 'w6Ty')](obj[_0x29bf25(0x1ff, '7Ez$')]['data']), hasKeyword = keywords[_0x29bf25(0x1e6, 'szpA')](_0x50ce31 => dataStr['includes'](_0x50ce31));
                                    !hasKeyword && (obj[_0x29bf25(0x1ec, '8ruJ')][_0x29bf25(0x204, '&bpa')] = {});
                                }
                                body = JSON['stringify'](obj);
                            }
                            catch (_0x31209e) {
                                console[_0x29bf25(0x1f2, 'rl^V')](_0x29bf25(0x1db, 'F$6K') + _0x31209e);
                            }
                            break;
                        default:
                            $done({});
                            break;
                    }
                    $done({ 'body': body });
                }
                else
                    $done({});
                var version_ = 'jsjiami.com.v7';
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
