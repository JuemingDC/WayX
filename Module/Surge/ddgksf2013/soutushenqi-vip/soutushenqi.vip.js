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
                const name = "soutushenqi.vip.js";
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
                var _0xodM = 'jsjiami.com.v7';
                function _0xfe46() { const _0x5a7b78 = (function () { return [_0xodM, 'dPMGjAseIjEinaYNmpdiy.Tcom.qWvQuf7YrYntl==', 'amotW7bxW7VcPsi', 'beXQW6q', 'nSkWWPuzW7CsW6pdJaxcPxy', 'aaVcP2NdVx56W6ldItNdG3NdOq', 'W4DRdKRdJfhdUfpcNSkfWQ80W6WKfM/dNSozzmomkq', 'CfhcUCkFWQJdL8k+sCoU', 'umo9FKWes0tdKfhdNSkD', 'FKRdSmordCoHWO0bW5G', 'aM7dPmkpWR4AW7BdVmkViZZdKW', 'WQDhW47dGSkJW4hcJSo0W68', 'WPldJ8kXoNdcKh5oWPi'].concat((function () { return ['WRFcLNVcSmo2x1nJW7O', 'DeRcLmoYoCovWPu4', 'WQFcGgu4WPCdWO/dMa', 'W7GHcJy', 'FSo/W4ezeq', 'h8khkYu9WRRcQW', 'W4DRdKRdJe7dVLdcNSkkWQe7W6qNj1pdKSoyBmodj8kJ', 'W6akW6tdOCkxW47cJSoq', 'mmkDdaHygCkVW5ddVG', 'W6GLdsm', 'uSo4Ee8imNpdM3BdSSkyW4O', 'ycbAW7L+i3FdVKS', 'nWtdUmkd'].concat((function () { return ['bWJcP2JdTxGtW5hdQcNdHfu', 'gmkqnW', 'WPdcSmoskmkRw8oztmk8WQVdMCkxW4bLWRdcNSkd', 'jmkxCeRcLIRcO8o3FIKI', 'eh7dMsBcTM3dJCof', 'oH/dTmoz', 'W6aeWO/cMSo4W5ZcJmoHW4nRW5u', 'WOCTsWlcObFdT1BcHmkbWPCC', 'WRlcSumigLddK1TYECk1', 'WR52hYmtW79+W58', 'DCoSWRBcIGWJlKqyD8oBBGS', 'qCkhWRecW7dcRbldKrNdUa']; }())); }())); }()); _0xfe46 = function () { return _0x5a7b78; }; return _0xfe46(); }
                ;
                function _0x3570(_0x28ffa3, _0x371e38) { const _0xfe469f = _0xfe46(); return _0x3570 = function (_0x3570ee, _0x926ea7) { _0x3570ee = _0x3570ee - 0xf1; let _0x228c65 = _0xfe469f[_0x3570ee]; if (_0x3570['EdebnD'] === undefined) {
                    var _0x34edc6 = function (_0x47481f) { const _0x44edb4 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; let _0x433f42 = '', _0x461460 = ''; for (let _0x237a4e = 0x0, _0x1d6a4b, _0x1e662b, _0x2e9a3a = 0x0; _0x1e662b = _0x47481f['charAt'](_0x2e9a3a++); ~_0x1e662b && (_0x1d6a4b = _0x237a4e % 0x4 ? _0x1d6a4b * 0x40 + _0x1e662b : _0x1e662b, _0x237a4e++ % 0x4) ? _0x433f42 += String['fromCharCode'](0xff & _0x1d6a4b >> (-0x2 * _0x237a4e & 0x6)) : 0x0) {
                        _0x1e662b = _0x44edb4['indexOf'](_0x1e662b);
                    } for (let _0x4e707f = 0x0, _0x19e0c0 = _0x433f42['length']; _0x4e707f < _0x19e0c0; _0x4e707f++) {
                        _0x461460 += '%' + ('00' + _0x433f42['charCodeAt'](_0x4e707f)['toString'](0x10))['slice'](-0x2);
                    } return decodeURIComponent(_0x461460); };
                    const _0x28f086 = function (_0x245867, _0x119817) { let _0x4d3132 = [], _0x3beb45 = 0x0, _0x3be688, _0x4d89a1 = ''; _0x245867 = _0x34edc6(_0x245867); let _0x64b177; for (_0x64b177 = 0x0; _0x64b177 < 0x100; _0x64b177++) {
                        _0x4d3132[_0x64b177] = _0x64b177;
                    } for (_0x64b177 = 0x0; _0x64b177 < 0x100; _0x64b177++) {
                        _0x3beb45 = (_0x3beb45 + _0x4d3132[_0x64b177] + _0x119817['charCodeAt'](_0x64b177 % _0x119817['length'])) % 0x100, _0x3be688 = _0x4d3132[_0x64b177], _0x4d3132[_0x64b177] = _0x4d3132[_0x3beb45], _0x4d3132[_0x3beb45] = _0x3be688;
                    } _0x64b177 = 0x0, _0x3beb45 = 0x0; for (let _0x215b3b = 0x0; _0x215b3b < _0x245867['length']; _0x215b3b++) {
                        _0x64b177 = (_0x64b177 + 0x1) % 0x100, _0x3beb45 = (_0x3beb45 + _0x4d3132[_0x64b177]) % 0x100, _0x3be688 = _0x4d3132[_0x64b177], _0x4d3132[_0x64b177] = _0x4d3132[_0x3beb45], _0x4d3132[_0x3beb45] = _0x3be688, _0x4d89a1 += String['fromCharCode'](_0x245867['charCodeAt'](_0x215b3b) ^ _0x4d3132[(_0x4d3132[_0x64b177] + _0x4d3132[_0x3beb45]) % 0x100]);
                    } return _0x4d89a1; };
                    _0x3570['GowHKm'] = _0x28f086, _0x28ffa3 = arguments, _0x3570['EdebnD'] = !![];
                } const _0x227e24 = _0xfe469f[0x0], _0x10db13 = _0x3570ee + _0x227e24, _0x205ead = _0x28ffa3[_0x10db13]; return !_0x205ead ? (_0x3570['rrSipb'] === undefined && (_0x3570['rrSipb'] = !![]), _0x228c65 = _0x3570['GowHKm'](_0x228c65, _0x926ea7), _0x28ffa3[_0x10db13] = _0x228c65) : _0x228c65 = _0x205ead, _0x228c65; }, _0x3570(_0x28ffa3, _0x371e38); }
                const _0x127c80 = _0x3570;
                (function (_0x242833, _0x453f8d, _0x6661a, _0x24a7f, _0x5f1e68, _0x3a687c, _0x124a26) { return _0x242833 = _0x242833 >> 0x7, _0x3a687c = 'hs', _0x124a26 = 'hs', function (_0x14c3fd, _0x4f6eae, _0x5142a6, _0x22cfe5, _0x4a1b68) { const _0x12f13a = _0x3570; _0x22cfe5 = 'tfi', _0x3a687c = _0x22cfe5 + _0x3a687c, _0x4a1b68 = 'up', _0x124a26 += _0x4a1b68, _0x3a687c = _0x5142a6(_0x3a687c), _0x124a26 = _0x5142a6(_0x124a26), _0x5142a6 = 0x0; const _0x5f0da0 = _0x14c3fd(); while (!![] && --_0x24a7f + _0x4f6eae) {
                    try {
                        _0x22cfe5 = -parseInt(_0x12f13a(0xf7, 'mv%w')) / 0x1 * (parseInt(_0x12f13a(0xfd, 'ik19')) / 0x2) + parseInt(_0x12f13a(0x10b, 'D&#w')) / 0x3 * (parseInt(_0x12f13a(0x113, 'w1J3')) / 0x4) + parseInt(_0x12f13a(0xfa, 'qK)6')) / 0x5 * (-parseInt(_0x12f13a(0x103, '*a&0')) / 0x6) + -parseInt(_0x12f13a(0x105, '23m#')) / 0x7 * (parseInt(_0x12f13a(0x110, 'nmSI')) / 0x8) + -parseInt(_0x12f13a(0x104, 'dft%')) / 0x9 * (-parseInt(_0x12f13a(0xf3, '&zpS')) / 0xa) + parseInt(_0x12f13a(0xf5, 'hCQD')) / 0xb * (parseInt(_0x12f13a(0xfb, 'nmSI')) / 0xc) + parseInt(_0x12f13a(0x102, '3Wjn')) / 0xd * (parseInt(_0x12f13a(0xfe, 'ov$S')) / 0xe);
                    }
                    catch (_0x4358cc) {
                        _0x22cfe5 = _0x5142a6;
                    }
                    finally {
                        _0x4a1b68 = _0x5f0da0[_0x3a687c]();
                        if (_0x242833 <= _0x24a7f)
                            _0x5142a6 ? _0x5f1e68 ? _0x22cfe5 = _0x4a1b68 : _0x5f1e68 = _0x4a1b68 : _0x5142a6 = _0x4a1b68;
                        else {
                            if (_0x5142a6 == _0x5f1e68['replace'](/[PEtWMGqNprIyTdlAeQYfnu=]/g, '')) {
                                if (_0x22cfe5 === _0x4f6eae) {
                                    _0x5f0da0['un' + _0x3a687c](_0x4a1b68);
                                    break;
                                }
                                _0x5f0da0[_0x124a26](_0x4a1b68);
                            }
                        }
                    }
                } }(_0x6661a, _0x453f8d, function (_0x3f207a, _0x53dfda, _0x15dec3, _0x3a035c, _0x27ec64, _0x7c35c3, _0xfda967) { return _0x53dfda = '\x73\x70\x6c\x69\x74', _0x3f207a = arguments[0x0], _0x3f207a = _0x3f207a[_0x53dfda](''), _0x15dec3 = '\x72\x65\x76\x65\x72\x73\x65', _0x3f207a = _0x3f207a[_0x15dec3]('\x76'), _0x3a035c = '\x6a\x6f\x69\x6e', (0x1c21a1, _0x3f207a[_0x3a035c]('')); }); }(0x6280, 0x5cd18, _0xfe46, 0xc7), _0xfe46) && (_0xodM = 0xc7);
                let url = $request[_0x127c80(0x111, 'q^bD')], body = $response[_0x127c80(0xf9, 'k98U')];
                if (/2222wwww/[_0x127c80(0x10f, 'ik19')](url))
                    body = body['replace'](/memberType":0/g, _0x127c80(0xf6, 'D#fN'))[_0x127c80(0x108, 'q^bD')](/memberDate":"\d+/g, _0x127c80(0x112, 'NF#2'));
                else {
                    if (/account/[_0x127c80(0x106, 'hCQD')](url)) {
                        body = body['replace'](/vipType":0/g, 'vipType\x22:1024')[_0x127c80(0xf8, 'mv%w')](/vipLabel":"[^"]+"/g, 'vipLabel\x22:\x22尊享会员\x22');
                        ;
                    }
                    else {
                        if (/config\/queryConfigs/[_0x127c80(0xf1, 'Q!WH')](url))
                            try {
                                let obj = JSON[_0x127c80(0x107, 'Mxmf')](body);
                                const keysToDelete = [_0x127c80(0xfc, '&zpS'), 'stsq_ios_app_update', 'stsq_ios_pay_channel_config_v2', _0x127c80(0x109, '&zpS'), 'stsq_ios_home_vipImageUrlConfig', 'stsq_ios_vip_function_introduce'];
                                for (const key of keysToDelete) {
                                    delete obj[_0x127c80(0x10c, 'hCQD')][key];
                                }
                                body = JSON[_0x127c80(0x101, '#@8w')](obj);
                            }
                            catch (_0x1defe7) { }
                    }
                }
                $done({ 'body': body });
                var version_ = 'jsjiami.com.v7';
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
