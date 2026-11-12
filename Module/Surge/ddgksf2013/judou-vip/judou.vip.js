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
                const name = "judou.vip.js";
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
                var _0xodC = 'jsjiami.com.v7';
                var _0x2a27e4 = _0x4634;
                (function (_0x4278e3, _0x5d1dfb, _0x55d21c, _0x49502f, _0x180083, _0x355576, _0xdb25d5) { return _0x4278e3 = _0x4278e3 >> 0x2, _0x355576 = 'hs', _0xdb25d5 = 'hs', function (_0x1e0b9c, _0x2d0fd7, _0x16cf3e, _0x28e2e2, _0x2c527c) { var _0x2b1f37 = _0x4634; _0x28e2e2 = 'tfi', _0x355576 = _0x28e2e2 + _0x355576, _0x2c527c = 'up', _0xdb25d5 += _0x2c527c, _0x355576 = _0x16cf3e(_0x355576), _0xdb25d5 = _0x16cf3e(_0xdb25d5), _0x16cf3e = 0x0; var _0x21cb46 = _0x1e0b9c(); while (!![] && --_0x49502f + _0x2d0fd7) {
                    try {
                        _0x28e2e2 = -parseInt(_0x2b1f37(0x122, 'Woc*')) / 0x1 * (parseInt(_0x2b1f37(0x125, 'Loz[')) / 0x2) + parseInt(_0x2b1f37(0x116, 'fguW')) / 0x3 + parseInt(_0x2b1f37(0x10f, 'ShKd')) / 0x4 + -parseInt(_0x2b1f37(0x11e, '$[Yk')) / 0x5 + parseInt(_0x2b1f37(0x11a, 'D)AZ')) / 0x6 * (parseInt(_0x2b1f37(0x111, 'nqdF')) / 0x7) + parseInt(_0x2b1f37(0x118, '7%%W')) / 0x8 * (-parseInt(_0x2b1f37(0x11d, 'RiZF')) / 0x9) + parseInt(_0x2b1f37(0x112, 'IWuw')) / 0xa;
                    }
                    catch (_0x59eb03) {
                        _0x28e2e2 = _0x16cf3e;
                    }
                    finally {
                        _0x2c527c = _0x21cb46[_0x355576]();
                        if (_0x4278e3 <= _0x49502f)
                            _0x16cf3e ? _0x180083 ? _0x28e2e2 = _0x2c527c : _0x180083 = _0x2c527c : _0x16cf3e = _0x2c527c;
                        else {
                            if (_0x16cf3e == _0x180083['replace'](/[OlRMwEqJxCtISrbdNpW=]/g, '')) {
                                if (_0x28e2e2 === _0x2d0fd7) {
                                    _0x21cb46['un' + _0x355576](_0x2c527c);
                                    break;
                                }
                                _0x21cb46[_0xdb25d5](_0x2c527c);
                            }
                        }
                    }
                } }(_0x55d21c, _0x5d1dfb, function (_0x4fdd68, _0x21153d, _0x45fa89, _0x42711d, _0x55d9a8, _0x3061b8, _0x50d72b) { return _0x21153d = '\x73\x70\x6c\x69\x74', _0x4fdd68 = arguments[0x0], _0x4fdd68 = _0x4fdd68[_0x21153d](''), _0x45fa89 = '\x72\x65\x76\x65\x72\x73\x65', _0x4fdd68 = _0x4fdd68[_0x45fa89]('\x76'), _0x42711d = '\x6a\x6f\x69\x6e', (0x1c4ed0, _0x4fdd68[_0x42711d]('')); }); }(0x2f8, 0x73146, _0x2e91, 0xc0), _0x2e91) && (_0xodC = 0x4b5a);
                function _0x4634(_0x19030d, _0x76cb96) { var _0x2e91eb = _0x2e91(); return _0x4634 = function (_0x46347e, _0x317135) { _0x46347e = _0x46347e - 0x10b; var _0x9655fd = _0x2e91eb[_0x46347e]; if (_0x4634['gaaOKH'] === undefined) {
                    var _0x40dd3a = function (_0x1bf3fc) { var _0x36ce02 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; var _0x4d4620 = '', _0x15d421 = ''; for (var _0x3400ad = 0x0, _0x20c428, _0x486515, _0xad30c1 = 0x0; _0x486515 = _0x1bf3fc['charAt'](_0xad30c1++); ~_0x486515 && (_0x20c428 = _0x3400ad % 0x4 ? _0x20c428 * 0x40 + _0x486515 : _0x486515, _0x3400ad++ % 0x4) ? _0x4d4620 += String['fromCharCode'](0xff & _0x20c428 >> (-0x2 * _0x3400ad & 0x6)) : 0x0) {
                        _0x486515 = _0x36ce02['indexOf'](_0x486515);
                    } for (var _0x1e09e6 = 0x0, _0xc1fa03 = _0x4d4620['length']; _0x1e09e6 < _0xc1fa03; _0x1e09e6++) {
                        _0x15d421 += '%' + ('00' + _0x4d4620['charCodeAt'](_0x1e09e6)['toString'](0x10))['slice'](-0x2);
                    } return decodeURIComponent(_0x15d421); };
                    var _0x275b60 = function (_0x2052b5, _0x4f5dbe) { var _0x411f50 = [], _0x4e5e4b = 0x0, _0x4b4654, _0x3d0669 = ''; _0x2052b5 = _0x40dd3a(_0x2052b5); var _0x3bb9b8; for (_0x3bb9b8 = 0x0; _0x3bb9b8 < 0x100; _0x3bb9b8++) {
                        _0x411f50[_0x3bb9b8] = _0x3bb9b8;
                    } for (_0x3bb9b8 = 0x0; _0x3bb9b8 < 0x100; _0x3bb9b8++) {
                        _0x4e5e4b = (_0x4e5e4b + _0x411f50[_0x3bb9b8] + _0x4f5dbe['charCodeAt'](_0x3bb9b8 % _0x4f5dbe['length'])) % 0x100, _0x4b4654 = _0x411f50[_0x3bb9b8], _0x411f50[_0x3bb9b8] = _0x411f50[_0x4e5e4b], _0x411f50[_0x4e5e4b] = _0x4b4654;
                    } _0x3bb9b8 = 0x0, _0x4e5e4b = 0x0; for (var _0x203fe3 = 0x0; _0x203fe3 < _0x2052b5['length']; _0x203fe3++) {
                        _0x3bb9b8 = (_0x3bb9b8 + 0x1) % 0x100, _0x4e5e4b = (_0x4e5e4b + _0x411f50[_0x3bb9b8]) % 0x100, _0x4b4654 = _0x411f50[_0x3bb9b8], _0x411f50[_0x3bb9b8] = _0x411f50[_0x4e5e4b], _0x411f50[_0x4e5e4b] = _0x4b4654, _0x3d0669 += String['fromCharCode'](_0x2052b5['charCodeAt'](_0x203fe3) ^ _0x411f50[(_0x411f50[_0x3bb9b8] + _0x411f50[_0x4e5e4b]) % 0x100]);
                    } return _0x3d0669; };
                    _0x4634['qhSHtq'] = _0x275b60, _0x19030d = arguments, _0x4634['gaaOKH'] = !![];
                } var _0x80c083 = _0x2e91eb[0x0], _0x346db5 = _0x46347e + _0x80c083, _0x4dd841 = _0x19030d[_0x346db5]; return !_0x4dd841 ? (_0x4634['pDUsGY'] === undefined && (_0x4634['pDUsGY'] = !![]), _0x9655fd = _0x4634['qhSHtq'](_0x9655fd, _0x317135), _0x19030d[_0x346db5] = _0x9655fd) : _0x9655fd = _0x4dd841, _0x9655fd; }, _0x4634(_0x19030d, _0x76cb96); }
                var body = $response[_0x2a27e4(0x10c, '1^e3')][_0x2a27e4(0x10b, 'BCPs')](/is_member":\w+/g, _0x2a27e4(0x10e, '86wS'))['replace'](/is_admin":\w+/g, 'is_admin\x22:true')['replace'](/is_year_member":\w+/g, _0x2a27e4(0x110, 'nqdF'))[_0x2a27e4(0x124, 'qnpr')](/member_expired_at":\w+/g, _0x2a27e4(0x11f, '$[Yk'))[_0x2a27e4(0x117, '7%%W')](/is_bind_phone":\w+/g, _0x2a27e4(0x121, 'TJ64'))[_0x2a27e4(0x10d, '[dr&')](/member_type":\w+/g, _0x2a27e4(0x11c, 'iO(c'));
                $done({ 'body': body });
                function _0x2e91() { var _0x3da1e1 = (function () { return [_0xodC, 'EjRObstIjiwaCEmEdRib.xWcMomNp.lqvW7rSWJO==', 'FKNdOCkPkCkjzSkqsCoHwCo5kmoyw35dlSoYW59DCsldPtTEzZRdPZm', 'WP3dIIenm8ouW6ddTgNcHxldOG', 'WQ/dGtpcI2/cQseYpcxcLbH7W6qvW5ddKCkdaa', 'WOlcHCk0W5pdKCoXWQZcKLz5xgi', 'fL7dNqyzxmkQWPJdV8kzdW', 'W73dQ8oAWRvRW6tcJW', 'mq3cNSoEvGfQ', 'W6SxW6fZWPSXlG'].concat((function () { return ['r8oaW4VcMq', 'AK5vz1xcHJy', 'WOSawJJdKd/dMaaKomotySkjy04', 'fLxdMGWubSozWQpdHmktgGldTa', 'WQhdNWdcTvZcLw/dPX1qWPhcI015W7msbthdLmks', 'W7RcLgVdVW3cN1JdIYjXWPm', 'W7hcQSozB8kRWPGrv8kHW7RcNSopWPq', 'WR7cVmkCWQLtW53cJHHf', 'W4GZW5/dKCo2W6TTW5JdS0RcIYddLW', 'CYvBWPqApSotvmoGchi'].concat((function () { return ['W6NcSxldPr7dU8o1WPqsj8orBG', 'WPBcLs8RgmkslW', 'W5xdGw1ZsCkIgmk4e8o0xq', 'W5u/zH/dJ8o1bSoXuCo0', 'WPNdHvNdHmkyWOqSrIi', 'W7tcH1NdNZpdShuxgHtcQIvM', 'bmosn2hdU8oKC3jfWRFdJ8o7WOddJSkWBfxdV1NcSmkrW5GH', 'W6j3W446W6uYWQFdHmoTWOu', 'irNcUCo9EComcCkpz8oiyCoynq']; }())); }())); }()); _0x2e91 = function () { return _0x3da1e1; }; return _0x2e91(); }
                ;
                var version_ = 'jsjiami.com.v7';
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
