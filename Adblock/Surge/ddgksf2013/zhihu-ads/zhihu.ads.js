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
                const name = "zhihu.ads.js";
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
                const version = 'V1.0.75';
                var _0xodA = 'jsjiami.com.v7';
                function _0x29a9() { const _0x48cfa5 = (function () { return [_0xodA, 'JNLjpsujeiFuaxmFiV.cOSVomTG.FHvnFp7XgRnt==', 'WP/dVGG', 'mWNdUmklsMpdGhnNWRhdGSobW63dS8kFc8k5ja', 'W7aKecPycbzQW7VdGJ3cN8kEaSotWRDQWPVcOdC', 'W70JcYzE', 'WOSGFG', '5ysq6lA75lI9B8k/WQ9TCmki5l256lsn5yws5AYN', 'ASoeWRrE', 'iq7dPCk8tcBdIw5WW7tdSCozW6VdOSkE', 'uKxdMfW', 'W4Oxj2y', 'l8keWQ0', 'WO4vm8oRfSkAmmoQWRq', 'WOT1ku3dM8oqWRv8wq', 't0pdMuJcOq4', 'kmk3W4NdImoFjSo/Af8Irq', 'cILLm8kvg8oxW6S', 'lwxcL8kOACoTWQr4W4BcU8oAWO0okSks', 'BrlcPwhcIeWhFdFdR8kwbq', 'g8kbuw9K', 'W7K4cYTdvvaJW7q', 'aCkUyN1IWO3dH8o/WOyGveC', 'C8ksjSogWRyU', 'W5FcUSkLW7m', 'W4FcVSkIW6y', 'WRhdQrFdPCo+WO7cSe/cNCo0W7pcRSkD', 'vCoAm2K', 'WRxdPqddR8oK', '5OUP55Qe55QB6yc35l615zo6', 'WOpdSb3dHmor', 'a8kfWP/cHSovW7e', 'a8oVW74', 'fIOfca', 'WOGpm8oNgCkzbSoVWQiFWRv4', 'tCo8WPNdRuqWWRGHbeFdG8olW7aCuYVcIG', 'FSksoCogWRGSWPlcOmkeWO7cRW', '55w05lIqzZKTzSkNfos8IUI3T+whGowSNq', 'WOXLoeO', 'v0/dG0pcSa', 'aSoKW6iC', 'WRVdQbG', 'mCoTW7e', 'qmoaDCkyWR3dLq9wWPqGW5uVWRzF', 'teZdHvxcINjtW7GTWR44WPldQ8kUEGzyfsPo', 'W54aqdNdPd0MW7PXDWu', 'trNcONupW47dGar+W4qwWPysjmkpWPSFhmoNW6tcKG', 'WQiuWPKvWQVdT8olW6v1arpcSgC2W4TbW7G8', 'rCoEnhW', 'WQFdRrddQW', 'ArNdNmoK', 'smoNWPS', 'l8opzSkyWQ4SWOpcSmktWP8', 'W44BjgS', '5AEs6lst5lQw', 'W4pcOH3cJMXLW5/dI20bW60SW58vWRdcL8ot', '55E75lUfDZldIJqGW5pKVlVOTQVLHQFLR7u', 'atCn', 'xbRdMZu', 'ACkylmoF', 'WOSOySonha', 'j2hcKCkHy8o2', 'W4dcR8kJW7SidmoMW6pcGq', 'W5hcRSkLW6yjbCoqW7hcNCoAiG', 'r3dcVbVdG3FcMq', 'WRT5sYrmxfyXW6K', 'aZFdQ8oJWQq/WOrAlWNcML1oarVcQmko', '5P+P6k235RES5OoL', 'WQldTrm', 'f0jJFsGgaLxcPW', 'qKVdMfZcKXCpWRq0WQuT', 'x8ogAmkcWQNcGumCWR0/WPC'].concat((function () { return ['EsT5jG', '5ysC6ykT5REP5OcE5BwM6k6q', 'W5bYx3i5kq8', 'aCknWOFcKW', 'WOKymCoN', 'oxBcJmkK', 'WO5Po2hdHSomWRP9', 'xCoCW4xdHCkgWReOW5JcICkwgCo1', 'mxJcNW', 'W651qCka', 'W5xcPGRcGa', 'WO0am8oXhq', 'ct7dSmo4WRq', 'sSobCG', 'WPWfhSoRfSkBnG', 'c8kKya', 'CSofWRngW5pcP8kxc8ovW5WEWQldPhFdOmkiW6hdNr8JkCkvWQ4RW4KWWQ7dMCoPWQGReNFcRJiYdmkOW5lcVCkmtJ4argJdTMtdNZWOq8opW7aSfLCkW5GmW5/cHCkxW4m', 'W4vVCh4', 'W4FcRHRcHg4', 'l8opWRvZbSoivaG', 'kgxcLa', 'W4OljhC', 'wmoDAmkeWQFcGq', 'WOWMW6ZdTSkdafVcUCkkDSoNoSkfj1FcNhC', 'BI/dI8oZp8kUWQHMW6pcG8oZWPW', 'kWFdOSkXvvNdLwr8WQ0', 'w8oWWPldLMSMWRuJgvhdHCoG', 'dSkor0n1nq', 'hCkJBNfiW47dHSo+WOySxfOmpfrjW5mUiq', 'W7O+hdfirMyYW6ldMsNdGW', 'WQWuWP8pWRNdSCoc', 'dmo1W7Srz8oQrJlcRatdLmoSW7j5', 'W5ymWPZcPYq9W7u/DwPUyG', 'W75XrSkv', 'W4FcRG7cVMHRW5xdIW', 't8oACa', 'W5iBWORcOa', 'dmo1W7Srz8oQrJlcTWZdLSkOW7P0W6hcTmkcW7pcIa', 'w8oWWPldLMSKWR47ceBdNW', 'eL91CsK', 'W5LIDgSKDu/dOmkcbSkgW7pdUgZdGmoVAdFcUN3dH8onW7e', 'FeBcPmoTCSoXoq', 'W7/cQ0xcTw1CWRCDW47dNSkDeCke', 'trNcONupW47dHH9RW6GhWOmVC8knWOyFgG', 'W6XXumkfE2P2WQmUavldOG', '6iAk5AUo5l2B', 'WQVdRrFdHCo8WPlcG1JcRCoWW6/cRmkmua', 'W5iMWOpdNG', 'rKxdNK7cMG', 'b1L8EsKpnfdcV8kvWQ8', 'b8koDdWKj8okuxNcRdhdVq', 'BSkjjSocWRKLWQtcPCkC', 'WOKemSo2', 'kw7cImkG', 'WQfjWR3dUSkqi0RdGuVdQa', 'wCo0WOpdKW', 'cIVdSmoIWR94WOnzlG', 'WQZdVXpdPduZW7qx', 'bmkKANrsWOddT8oYWPm3xG', 'xSo6WPRdN1SRWOuUdeBdJW', 'W4VcRXFcIxqOW4VdKgWTW6GWW5ujWQO', 'E1RcPCo6Da', '5l295AAc77+J55+/5lIr776Q', 'wb7dMJldUq', 'tSonzmke', 'WPFdVGxdO8oLWPxcVu0', 'WOddS0/dMtrLW7hdN1egW7m', 'WQddI8kUhCk+DYxdVSkY', 'pqNdVSkrwgxdIq', 'rKJdK3dcOru', 'FIDRmfpcKMBdS1m', 'DqJdM8oGWO3dPs8/WRpcLbJdL2pcSg5zr8oUW6VcKSk/FCkkW4xdKmo9FZeUW7i/pwddGCkgW6TwdmotW4iHWPxdQHRdG8kZW59zseKvWQNdLuNdVwlcL8kUvqlcIW4'].concat((function () { return ['rKJdG13cTaHwW6RcP8kwW4NcHq', 'w8o6WOxdT1uMWRi', 'W4KkxIa', 'k8kbW79AW5RdKCo6sCol', 'FvlcS8oSFG', '5P6U55+t5P+N55MV', 'WRrqWQFdRCkD', 'e8kfWOpcRCoeW6OY', 'eL9HsY8pdvW', 'ftRdRmoSWQv3', 'gmkuuxvViv/dI8oK', 'hCkJBNfiW47dMSo0WPeQv14km0r/W401n8klWQ0', 'p8koWRxdUHa', 'wX7cRa', '5BEe5BYK6yk2', '57cd6ygM5lY35zcm5yso5A+Q', 'Aa7dGW', 'W6ldSSkKemkBvGG', 'DCkjimoBWQr4W6ldRmkvWPxcQbdcQmk9ySo+euxcHGddK03cGdLiWOFcKmoEymkGWPhcM8oKnhJdKsuKDLGTkgJcHCkKiItdJ8oDbvmlnrq7WR3dTmkjWOxdPCk6zq', 'nHqkmsFcPvfXcq', 'WQyuWOO', 'xNBcKae', 's8otlMbOmCo6xwlcGdhdHr8McCogWOSZmtC', 'WQBdRGddVsHwWQ9lW5ZdJSk8uSoTACk9sCopWP8UgHhdPSk9WQGuvMpcUSk5a8oFsmocW4HIW5ucWOamWR4hDSoQcsdcICoPWPCdneTHcmkiW682AwPaW6SQW75xya', '5yA95lY/5yYK', 'pGVdSSkPiSkJl8o3WOKfWOue', 'W6KyW6xcQmoktLtdQ1ldNuDp', 'FHpdGCoKWPVcSxq', 'W5ukWOVcVs8UW4mUyW', 'vgVcIGhdKZBcImo/yCkaW7xcRxhdM0D7W7q', 'WPiVW7hdVW', 'WP8ojCo7', 'W5ibma', 'mXldUmkKsJZcJI50WRddVSkbWRBdRmkfc8kXmmkaW7JcHNWpbCknrCkEW5ygaYSmuCk9orrPeSogW77dLKNdQ8kLE8o/nrRcT156pSk1z8oNWQeTBghcLSkPzNfP', 'W7LGr8kisM5WWQSJ', 'WQfDWQddTW', 'W4pdItVdJCkVxmke', 'WPXHp18', 'dI0igCoHs1pdO2yHbmk1tq', 'WQvrWQpdUG', 'A8kKW7a', 'ru/dM1VcSbq', 'oxlcJmkKB8o1WPjJW4hcKmotWPa', 'ctfVhmk6aSoeW74yjaxdK8kzW59IkSkhWRVcUsi', 'ldhdL8o0WRxcMuq', 'q8oEjgDWFmoPwNBcGdddLXH0pSoaWOSLmbOkWRNcR1m', 'lfpdTchdLqapFW3dSCk7eq', 'WRxdKmkUf8k1tZVdT8k5oSot', 'W7aKecPyeLeQW7NdTd7dLCkpbCocWRW', 'rmojkW', 'W5D/Bg8Ypq', 'dSk4wg9uWP4', 'mGy1qCkIkG', 'EWxcPxBcSLS3zsZdUmkCaG', 'BmoyWRDPW4NdS8oEsW', 'W4GDqq', '5OIR55IS55Um6yo55l+s5zk3', 'W7ZcQI7dPaipW4WU', 'wqRdJtpdTvLJ', 'ACkyj8oF', 'F8kqWOTJ', 'WRXjWQFdVmku', 'W5jKzx8+oZ/cRCkxw8kcW6u', 'WOCjkmoQdCoDkCoPWQiAWRDP', 'W4VcRXFcIxqOW5VdLxKOW7u8W404WQ/dGmo/W7u9W6xdRwBcTa', 'ed16mmkV', 'A8ocW7dcSetcNmoeWQ/cJ8oaDW', 'gcOg', 'vLtdMW', 'fCknWOhcGCov']; }())); }())); }()); _0x29a9 = function () { return _0x48cfa5; }; return _0x29a9(); }
                ;
                const _0x23a96a = _0x2c12;
                function _0x2c12(_0x14ee17, _0x53c4fe) { const _0x29a94c = _0x29a9(); return _0x2c12 = function (_0x2c1207, _0x5dc5e5) { _0x2c1207 = _0x2c1207 - 0x65; let _0x57412d = _0x29a94c[_0x2c1207]; if (_0x2c12['HCEtwO'] === undefined) {
                    var _0x119ce8 = function (_0x462a17) { const _0x3d1bae = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; let _0x516142 = '', _0x2265de = ''; for (let _0x2cbd46 = 0x0, _0x445e6b, _0x2852e5, _0x3ebb9b = 0x0; _0x2852e5 = _0x462a17['charAt'](_0x3ebb9b++); ~_0x2852e5 && (_0x445e6b = _0x2cbd46 % 0x4 ? _0x445e6b * 0x40 + _0x2852e5 : _0x2852e5, _0x2cbd46++ % 0x4) ? _0x516142 += String['fromCharCode'](0xff & _0x445e6b >> (-0x2 * _0x2cbd46 & 0x6)) : 0x0) {
                        _0x2852e5 = _0x3d1bae['indexOf'](_0x2852e5);
                    } for (let _0x5d7dd6 = 0x0, _0x33ad3e = _0x516142['length']; _0x5d7dd6 < _0x33ad3e; _0x5d7dd6++) {
                        _0x2265de += '%' + ('00' + _0x516142['charCodeAt'](_0x5d7dd6)['toString'](0x10))['slice'](-0x2);
                    } return decodeURIComponent(_0x2265de); };
                    const _0x591f16 = function (_0x2b269d, _0x2b6404) { let _0x75584a = [], _0x4416b1 = 0x0, _0x22a7af, _0x293c70 = ''; _0x2b269d = _0x119ce8(_0x2b269d); let _0x39a48d; for (_0x39a48d = 0x0; _0x39a48d < 0x100; _0x39a48d++) {
                        _0x75584a[_0x39a48d] = _0x39a48d;
                    } for (_0x39a48d = 0x0; _0x39a48d < 0x100; _0x39a48d++) {
                        _0x4416b1 = (_0x4416b1 + _0x75584a[_0x39a48d] + _0x2b6404['charCodeAt'](_0x39a48d % _0x2b6404['length'])) % 0x100, _0x22a7af = _0x75584a[_0x39a48d], _0x75584a[_0x39a48d] = _0x75584a[_0x4416b1], _0x75584a[_0x4416b1] = _0x22a7af;
                    } _0x39a48d = 0x0, _0x4416b1 = 0x0; for (let _0x5c108f = 0x0; _0x5c108f < _0x2b269d['length']; _0x5c108f++) {
                        _0x39a48d = (_0x39a48d + 0x1) % 0x100, _0x4416b1 = (_0x4416b1 + _0x75584a[_0x39a48d]) % 0x100, _0x22a7af = _0x75584a[_0x39a48d], _0x75584a[_0x39a48d] = _0x75584a[_0x4416b1], _0x75584a[_0x4416b1] = _0x22a7af, _0x293c70 += String['fromCharCode'](_0x2b269d['charCodeAt'](_0x5c108f) ^ _0x75584a[(_0x75584a[_0x39a48d] + _0x75584a[_0x4416b1]) % 0x100]);
                    } return _0x293c70; };
                    _0x2c12['DwuioV'] = _0x591f16, _0x14ee17 = arguments, _0x2c12['HCEtwO'] = !![];
                } const _0x1ccb59 = _0x29a94c[0x0], _0xa88968 = _0x2c1207 + _0x1ccb59, _0x5e627c = _0x14ee17[_0xa88968]; return !_0x5e627c ? (_0x2c12['dRmFIX'] === undefined && (_0x2c12['dRmFIX'] = !![]), _0x57412d = _0x2c12['DwuioV'](_0x57412d, _0x5dc5e5), _0x14ee17[_0xa88968] = _0x57412d) : _0x57412d = _0x5e627c, _0x57412d; }, _0x2c12(_0x14ee17, _0x53c4fe); }
                (function (_0x57d889, _0x46494f, _0x5754cb, _0x1bded8, _0x266c93, _0x29ae6c, _0x2ded45) { return _0x57d889 = _0x57d889 >> 0x8, _0x29ae6c = 'hs', _0x2ded45 = 'hs', function (_0x27d1c4, _0x1d78ee, _0x2873e7, _0x4fa2f8, _0x3c58f6) { const _0x50b3a7 = _0x2c12; _0x4fa2f8 = 'tfi', _0x29ae6c = _0x4fa2f8 + _0x29ae6c, _0x3c58f6 = 'up', _0x2ded45 += _0x3c58f6, _0x29ae6c = _0x2873e7(_0x29ae6c), _0x2ded45 = _0x2873e7(_0x2ded45), _0x2873e7 = 0x0; const _0xb93336 = _0x27d1c4(); while (!![] && --_0x1bded8 + _0x1d78ee) {
                    try {
                        _0x4fa2f8 = parseInt(_0x50b3a7(0x73, 'bm)*')) / 0x1 * (parseInt(_0x50b3a7(0x90, 'yJF9')) / 0x2) + parseInt(_0x50b3a7(0x106, '#@I]')) / 0x3 + -parseInt(_0x50b3a7(0x75, '&)bz')) / 0x4 * (-parseInt(_0x50b3a7(0x130, 'IkWc')) / 0x5) + -parseInt(_0x50b3a7(0x120, 'V9bb')) / 0x6 + -parseInt(_0x50b3a7(0x118, 'JZ0B')) / 0x7 + -parseInt(_0x50b3a7(0xe7, '40vx')) / 0x8 * (parseInt(_0x50b3a7(0xda, 'vnPQ')) / 0x9) + -parseInt(_0x50b3a7(0x101, ')zTp')) / 0xa * (-parseInt(_0x50b3a7(0xf5, 'HV(D')) / 0xb);
                    }
                    catch (_0x485bc8) {
                        _0x4fa2f8 = _0x2873e7;
                    }
                    finally {
                        _0x3c58f6 = _0xb93336[_0x29ae6c]();
                        if (_0x57d889 <= _0x1bded8)
                            _0x2873e7 ? _0x266c93 ? _0x4fa2f8 = _0x3c58f6 : _0x266c93 = _0x3c58f6 : _0x2873e7 = _0x3c58f6;
                        else {
                            if (_0x2873e7 == _0x266c93['replace'](/[TuNRxLpVgeOJSnGXtFH=]/g, '')) {
                                if (_0x4fa2f8 === _0x1d78ee) {
                                    _0xb93336['un' + _0x29ae6c](_0x3c58f6);
                                    break;
                                }
                                _0xb93336[_0x2ded45](_0x3c58f6);
                            }
                        }
                    }
                } }(_0x5754cb, _0x46494f, function (_0x293389, _0x490d0a, _0x50a72a, _0x1add4a, _0x500729, _0x2ce7f8, _0x47ed3e) { return _0x490d0a = '\x73\x70\x6c\x69\x74', _0x293389 = arguments[0x0], _0x293389 = _0x293389[_0x490d0a](''), _0x50a72a = '\x72\x65\x76\x65\x72\x73\x65', _0x293389 = _0x293389[_0x50a72a]('\x76'), _0x1add4a = '\x6a\x6f\x69\x6e', (0x19e141, _0x293389[_0x1add4a]('')); }); }(0xc300, 0x23646, _0x29a9, 0xc5), _0x29a9) && (_0xodA = `\xd7d`);
                let body = $response[_0x23a96a(0x9e, ')zTp')];
                if (body) {
                    switch (!![]) {
                        case /appview\/v2\/answer/[_0x23a96a(0xbf, 'hGsP')]($request[_0x23a96a(0xd9, 'u!lE')]):
                            try { }
                            catch (_0x4179de) {
                                console[_0x23a96a(0xa8, 'XsCu')](_0x23a96a(0xa2, 'IkWc') + _0x4179de);
                            }
                            break;
                        case /com\/moments_v3/['test']($request['url']):
                            try {
                                let obj = JSON[_0x23a96a(0xe2, '7]YL')](body);
                                obj[_0x23a96a(0x87, '^7kn')] = obj[_0x23a96a(0xc1, 'V9bb')][_0x23a96a(0x8b, '4H%x')](_0x100305 => !(_0x100305[_0x23a96a(0xb1, 'bp*n')] == _0x23a96a(0xc9, 'u!lE') || _0x100305[_0x23a96a(0xee, 'F9FM')] == _0x23a96a(0x8f, 'V9bb'))), body = JSON['stringify'](obj);
                            }
                            catch (_0x1e40d6) {
                                console['log'](_0x23a96a(0x7f, 'G3Lk') + _0x1e40d6);
                            }
                            break;
                        case /notifications\/v3/['test']($request[_0x23a96a(0x72, 'nU0!')]):
                            try {
                                let obj = JSON[_0x23a96a(0xa3, 'zuM@')](body), newItems = [];
                                for (let item of obj[_0x23a96a(0xf7, 'Rq%g')]) {
                                    if (item['detail_title'] === '官方帐号消息') {
                                        let unread_count = item[_0x23a96a(0xc8, 'n@Xp')];
                                        unread_count > 0x0 ? item[_0x23a96a(0x7d, 'nU0!')][_0x23a96a(0x12e, 'MXn%')] = _0x23a96a(0xe9, 'snFt') + unread_count + '条' : item['content'][_0x23a96a(0xe1, 'vnPQ')] = _0x23a96a(0xef, '9%Kz'), item[_0x23a96a(0xe6, 'G3Lk')] = !![], item['unread_count'] = 0x0, newItems[_0x23a96a(0xae, '2&^q')](item);
                                    }
                                    else
                                        item[_0x23a96a(0x8c, '#@I]')] !== '活动助手' && newItems[_0x23a96a(0x77, 'G3Lk')](item);
                                }
                                obj['data'] = newItems, body = JSON[_0x23a96a(0x6c, '0H#^')](obj);
                            }
                            catch (_0x4efec3) {
                                console['log'](_0x23a96a(0x10a, 'A2LK') + _0x4efec3);
                            }
                            break;
                        case /user-credit\/basis/[_0x23a96a(0x138, 'AuBk')]($request[_0x23a96a(0x93, 'V9bb')]):
                            try {
                                let obj = JSON['parse'](body);
                                obj[_0x23a96a(0xa0, 'xsZ[')][_0x23a96a(0xec, '7pPT')] = 0x3e6, body = JSON[_0x23a96a(0xeb, 'Xhat')](obj);
                            }
                            catch (_0x37d749) {
                                console['log'](_0x23a96a(0x105, '#HAe') + _0x37d749);
                            }
                            break;
                        case /bazaar\/vip_tab\/modules/[_0x23a96a(0x103, 'bp*n')]($request['url']):
                            try {
                                let obj = JSON['parse'](body);
                                obj['data'] = obj['data'][_0x23a96a(0xc5, 'HV(D')](_0x4365f5 => !(_0x4365f5['type'] == 'FCT14A' || _0x4365f5[_0x23a96a(0xff, 'xsZ[')] == _0x23a96a(0x96, '9%Kz') || _0x4365f5[_0x23a96a(0x89, 'MXG0')] == 'FCT07A')), body = JSON[_0x23a96a(0xeb, 'Xhat')](obj);
                            }
                            catch (_0x5de77f) {
                                console[_0x23a96a(0xea, 'JZ0B')](_0x23a96a(0xd4, 'V#cb') + _0x5de77f);
                            }
                            break;
                        case /questions\/\d+\/feeds/['test']($request['url']):
                            try {
                                body = body['replace'](/ad_info"/g, 'ddgksf2013\x22');
                            }
                            catch (_0x5d1e6d) {
                                console[_0x23a96a(0xfd, 'A2LK')](_0x23a96a(0x12a, 'IkWc') + _0x5d1e6d);
                            }
                            break;
                        case /next-data/[_0x23a96a(0xe0, 's1K6')]($request[_0x23a96a(0xb2, '4xrW')]):
                            try {
                                let obj = JSON['parse'](body), items = [];
                                for (let item of obj[_0x23a96a(0x125, 'u!lE')][_0x23a96a(0xf3, '#@I]')]) {
                                    if (item[_0x23a96a(0xc0, 'snFt')] == 'normal') {
                                        if (item['data']?.['link_cards'])
                                            item['data']['link_cards'] = [];
                                        items['push'](item);
                                    }
                                }
                                obj[_0x23a96a(0x80, '#HAe')][_0x23a96a(0xbe, 'hGsP')] = items, body = JSON['stringify'](obj);
                            }
                            catch (_0x438938) {
                                console['log']('zhihu\x20next-data' + _0x438938);
                            }
                            break;
                        case /next-render/['test']($request[_0x23a96a(0xcf, 'JZ0B')]):
                            try {
                                let obj = JSON[_0x23a96a(0xba, '0H#^')](body), items = [];
                                for (let item of obj[_0x23a96a(0xf7, 'Rq%g')]) {
                                    if (item['type'] == 'answer') {
                                        if (item[_0x23a96a(0xfc, 'n@Xp')]?.[_0x23a96a(0xf8, 'IkWc')])
                                            delete item[_0x23a96a(0xf0, 'xsZ[')];
                                        items[_0x23a96a(0x85, 'MXG0')](item);
                                    }
                                }
                                obj['data'] = items, body = JSON[_0x23a96a(0xe4, 'hGsP')](obj);
                            }
                            catch (_0x5a90ba) {
                                console['log'](_0x23a96a(0xe8, 'ZuqP') + _0x5a90ba);
                            }
                            break;
                        case /bazaar\/vip_tab\/header/[_0x23a96a(0xd6, 'V9bb')]($request[_0x23a96a(0xa6, '4H%x')]):
                            try {
                                let obj = JSON[_0x23a96a(0xa7, 'HV(D')](body);
                                obj[_0x23a96a(0x110, 'IkWc')] = { 'day_url': 'https://pic1.zhimg.com/v2-4812630bc27d642f7cafcd6cdeca3d7a_r.png', 'night_url': _0x23a96a(0x83, 'rMzn') }, obj[_0x23a96a(0x69, 'HV(D')] = { 'jump_url': _0x23a96a(0x116, 'xsZ['), 'text': _0x23a96a(0xad, 'zyo2'), 'color_text': { 'text': '', 'color': '' } }, obj[_0x23a96a(0x104, 'MXn%')] = null, body = JSON[_0x23a96a(0x84, 'Rq%g')](obj);
                            }
                            catch (_0x3161f9) {
                                console[_0x23a96a(0xf6, '#@I]')](_0x23a96a(0x78, 'V9bb') + _0x3161f9);
                            }
                            break;
                        case /topstory\/hot-lists/[_0x23a96a(0xbf, 'hGsP')]($request[_0x23a96a(0x102, '#@I]')]):
                            try {
                                let obj = JSON[_0x23a96a(0x12d, 's1K6')](body);
                                obj[_0x23a96a(0x11d, '(DO8')]['data'] = obj['data']['data'][_0x23a96a(0x94, 'xsZ[')](_0x479297 => !_0x479297[_0x23a96a(0xb8, '#@I]')]), body = JSON['stringify'](obj);
                            }
                            catch (_0x10da0e) {
                                console['log'](_0x23a96a(0xaf, 'rMzn') + _0x10da0e);
                            }
                            break;
                        case /topstory\/recommend/[_0x23a96a(0x9d, 'vnPQ')]($request['url']):
                            try {
                                let obj = JSON[_0x23a96a(0xf9, 'n@Xp')](body);
                                const propsToDelete = ['TikTok', '副业', '赚钱', '挣钱', _0x23a96a(0x11b, 'zuM@'), '运营', '电商', '剪辑', _0x23a96a(0x7a, 'MXG0'), '失业', '收益', '稿费', _0x23a96a(0xdc, '7]YL'), '存款', '兼职'];
                                let items = [];
                                for (let item of obj[_0x23a96a(0xf1, 'HV(D')]) {
                                    if (item[_0x23a96a(0x11c, 'snFt')]('ad') || item['promotion_extra'] != null || item[_0x23a96a(0xf2, 'n@Xp')] == _0x23a96a(0x114, 'u!lE') || item[_0x23a96a(0x68, 'MXG0')]?.[_0x23a96a(0xff, 'xsZ[')] == _0x23a96a(0xac, '7]YL') || item['extra']?.['type'] == _0x23a96a(0x12f, 'snFt'))
                                        continue;
                                    else {
                                        if (item['type'] == 'common_card' && item[_0x23a96a(0x6e, '4xrW')]?.[_0x23a96a(0xce, '*Xoz')] == _0x23a96a(0xe3, '#@I]')) {
                                            let videoUrl = item[_0x23a96a(0x11f, 'Xhat')]['feed_content'][_0x23a96a(0xc2, 'snFt')]['customized_page_url'], videoID = videoUrl[_0x23a96a(0x9f, 'MXG0')](/[?&]videoID=(\d+)/)[0x1];
                                            videoID && (item[_0x23a96a(0x129, 'u!lE')][_0x23a96a(0x108, 'u!lE')][_0x23a96a(0x115, 'Xhat')]['id'] = videoID), items[_0x23a96a(0xdb, 'bp*n')](item);
                                        }
                                        else {
                                            if (item[_0x23a96a(0x123, '#@I]')] == _0x23a96a(0x128, 'A2LK') && item['common_card']?.[_0x23a96a(0x97, 'yJF9')]?.[_0x23a96a(0x100, 'IkWc')]?.['id']) {
                                                let search = '\x22feed_content\x22:{\x22video\x22:{\x22id\x22:', str = $response[_0x23a96a(0xc7, '9%Kz')][_0x23a96a(0xb4, '^7kn')]($response[_0x23a96a(0x81, 'n@Xp')]['indexOf'](search) + search[_0x23a96a(0x6b, 'ZuqP')]), videoID = str[_0x23a96a(0x134, 'F9FM')](0x0, str['indexOf'](','));
                                                item[_0x23a96a(0xb6, 'UHfx')][_0x23a96a(0xbc, 'A2LK')][_0x23a96a(0x12b, 'S&KK')]['id'] = videoID, items['push'](item);
                                            }
                                            else {
                                                if (item[_0x23a96a(0xd3, 'AuBk')]?.['feed_content']?.[_0x23a96a(0xcd, '4H%x')]?.[_0x23a96a(0x124, 'MXG0')]) {
                                                    var find = ![];
                                                    propsToDelete[_0x23a96a(0x137, 'u!lE')](_0x2d91c2 => { const _0x5e121d = _0x23a96a; item[_0x5e121d(0xca, 'vnPQ')][_0x5e121d(0x11a, 'Rq%g')]['title'][_0x5e121d(0x107, 'rMzn')]['includes'](_0x2d91c2) && (find = !![]); }), !find && items['push'](item);
                                                }
                                                else
                                                    items['push'](item);
                                            }
                                        }
                                    }
                                }
                                obj['data'] = items;
                                for (let i = 0x0; i < obj['data'][_0x23a96a(0xb5, '4H%x')]; i++) {
                                    obj['data'][i]['offset'] = i + 0x1;
                                }
                                body = JSON[_0x23a96a(0x131, 'bm)*')](obj);
                            }
                            catch (_0x4ce298) {
                                console[_0x23a96a(0x82, 'bp*n')]('zhihu\x20recommend' + _0x4ce298);
                            }
                            break;
                        case /unlimited\/go\/my_card/[_0x23a96a(0x10f, 'Rq%g')]($request[_0x23a96a(0x99, 'AuBk')]):
                            try {
                                let obj = JSON[_0x23a96a(0x11e, '7pPT')](body);
                                obj['title'] = '盐选会员', obj[_0x23a96a(0xe5, 'hGsP')] = _0x23a96a(0x70, '7pPT'), obj['card_jump_url'] = '', obj[_0x23a96a(0xb7, 'zuM@')] = '', body = JSON[_0x23a96a(0xb3, 'n@Xp')](obj);
                            }
                            catch (_0x1c15c6) {
                                console['log'](_0x23a96a(0xa1, 'n@Xp') + _0x1c15c6);
                            }
                            break;
                        case /people\/self/[_0x23a96a(0x122, 'n@Xp')]($request[_0x23a96a(0xc6, '*Xoz')]):
                            try {
                                let obj = JSON['parse'](body);
                                obj[_0x23a96a(0xf4, '^7kn')][_0x23a96a(0x95, 'A2LK')] = !![], obj[_0x23a96a(0x98, '2&^q')]['vip_icon'] = { 'url': _0x23a96a(0x79, 'JZ0B'), 'night_mode_url': _0x23a96a(0xfe, '2&^q') }, obj['vip_info']['entrance'] = { 'icon': { 'url': _0x23a96a(0x135, 'nU0!'), 'night_mode_url': _0x23a96a(0x74, 'vnPQ') }, 'title': _0x23a96a(0x9a, 'MXn%'), 'expires_day': '2039-12-24', 'sub_title': null, 'button_text': _0x23a96a(0x12c, ')zTp'), 'jump_url': _0x23a96a(0xaa, '40vx'), 'button_jump_url': _0x23a96a(0xd2, '7pPT'), 'sub_title_new': null, 'identity': 'svip' }, obj['vip_info'][_0x23a96a(0x136, '4H%x')] = { 'left_button': { 'title': _0x23a96a(0x71, 'AuBk'), 'description': '为您严选好内容', 'jump_url': _0x23a96a(0x113, '*Xoz') }, 'right_button': { 'title': '我的盐选会员', 'description': _0x23a96a(0xde, 'bp*n'), 'jump_url': _0x23a96a(0x10d, '*Xoz') } }, obj[_0x23a96a(0x6a, 'Xhat')][_0x23a96a(0xed, 'MXn%')] = { 'title': _0x23a96a(0xc3, '^7kn'), 'sub_title': _0x23a96a(0xcb, 'V9bb'), 'jump_url': _0x23a96a(0xd1, 'MXn%'), 'button_text': _0x23a96a(0x67, 'UHfx') }, body = JSON['stringify'](obj);
                            }
                            catch (_0x3a114c) {
                                console[_0x23a96a(0x6f, 'V#cb')]('zhihu\x20people' + _0x3a114c);
                            }
                            break;
                        case /commercial_api\/real_time_launch/[_0x23a96a(0x112, '5Vjd')]($request['url']):
                            try {
                                body = body[_0x23a96a(0x86, '%dk[')](/img_play_duration\\":\d+/g, _0x23a96a(0x8d, 'zuM@'))['replace'](/launch_timeout\\":\d+/g, 'launch_timeout\x22:0');
                            }
                            catch (_0x1c834f) {
                                console[_0x23a96a(0x82, 'bp*n')]('zhihu\x20openad' + _0x1c834f);
                            }
                            break;
                        case /search\/recommend_query/[_0x23a96a(0xcc, '^7kn')]($request[_0x23a96a(0xdf, '9%Kz')]):
                            try {
                                let obj = JSON['parse'](body);
                                obj['recommend_queries']?.[_0x23a96a(0x117, 'S&KK')] && (obj[_0x23a96a(0xdd, 'IkWc')][_0x23a96a(0x9c, 's1K6')] = [{ 'query': '', 'real_query': '', 'query_display': '', 'uuid': 'f8c151ce-8bba-4491-89d1-06af4353e3da', 'type': _0x23a96a(0xbd, 'vnPQ') }]), body = JSON[_0x23a96a(0xbb, '40vx')](obj);
                            }
                            catch (_0x1764ee) {
                                console[_0x23a96a(0xd0, 'zyo2')](_0x23a96a(0x6d, 'A2LK') + _0x1764ee);
                            }
                            break;
                        case /search\/tabs/[_0x23a96a(0x103, 'bp*n')]($request[_0x23a96a(0x111, 'MXn%')]):
                            try {
                                let obj = JSON['parse'](body);
                                obj[_0x23a96a(0xb0, '7pPT')] = obj[_0x23a96a(0xd7, 'snFt')]['filter'](_0x2eea12 => !(_0x2eea12['t'] == _0x23a96a(0xfb, 'MXn%'))), body = JSON[_0x23a96a(0x7e, '5Vjd')](obj);
                            }
                            catch (_0x2f4569) {
                                console['log']('zhihu\x20search/tabs' + _0x2f4569);
                            }
                            break;
                        case /search\/preset_words/[_0x23a96a(0xd8, 'nU0!')]($request['url']):
                            try {
                                let obj = JSON[_0x23a96a(0x66, 'S&KK')](body);
                                obj[_0x23a96a(0xb9, 'yJF9')]?.[_0x23a96a(0xab, '40vx')] && obj[_0x23a96a(0x10e, '5Vjd')]['words'][_0x23a96a(0x132, 'rMzn')](_0x1c852d => { const _0x249c25 = _0x23a96a; _0x1c852d['begin_ts'] = 0xb2d05e00, _0x1c852d[_0x249c25(0x109, '0H#^')] = 0xb2d06c10; }), obj[_0x23a96a(0x10b, '40vx')]?.['force_words'] && obj['preset_words'][_0x23a96a(0x91, 'bm)*')][_0x23a96a(0x10c, '4d9S')](_0x2a421e => { const _0x484b56 = _0x23a96a; _0x2a421e[_0x484b56(0x127, 'JZ0B')] = 0xb2d05e00, _0x2a421e[_0x484b56(0x133, '4H%x')] = 0xb2d06c10; }), body = JSON[_0x23a96a(0x121, 'vnPQ')](obj);
                            }
                            catch (_0x2272ed) {
                                console[_0x23a96a(0x76, '4d9S')](_0x23a96a(0x119, 'V#cb') + _0x2272ed);
                            }
                            break;
                        case /search\/hot_search/['test']($request[_0x23a96a(0x8a, '##AR')]):
                            try {
                                let obj = JSON[_0x23a96a(0xfa, 'ZuqP')](body);
                                obj[_0x23a96a(0xd5, '4d9S')] && (obj[_0x23a96a(0xa9, 'rMzn')] = []), body = JSON[_0x23a96a(0x126, 'ZuqP')](obj);
                            }
                            catch (_0x3a26bd) {
                                console[_0x23a96a(0xa5, '9%Kz')](_0x23a96a(0x92, '40vx') + _0x3a26bd);
                            }
                            break;
                        case /bazaar\/vip_tab\/tabs/[_0x23a96a(0xbf, 'hGsP')]($request['url']):
                            try {
                                let obj = JSON[_0x23a96a(0xc4, 'XsCu')](body);
                                obj = obj['filter'](_0x1a8987 => !(_0x1a8987['value'] == 'vip_buy')), body = JSON['stringify'](obj);
                            }
                            catch (_0x2ce863) {
                                console['log'](_0x23a96a(0x88, '9%Kz') + _0x2ce863);
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
