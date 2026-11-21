/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
(function () {
    const __wayxHost = { request: typeof $request === 'undefined' ? undefined : $request, response: typeof $response === 'undefined' ? undefined : $response, done: $done, global: globalThis };
    if ((__wayxHost.response === undefined ? 'request' : 'response') !== "request")
        throw new Error('Unregistered HTTP source/target declaration');
    const __wayxConfig = { "apiPlan": { "target": { "responseStatus": "status", "responseTrailers": "trailers", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "responseTrailers": "trailers", "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" } } };
    const __wayxExecute = () => (function (config, host, run) {
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
        const binaryBody = value => { const field = "body", alternate = field === 'body' ? 'bodyBytes' : 'body'; return binary(value[field]) ? value[field] : binary(value[alternate]) ? value[alternate] : undefined; };
        const status = value => {
            if (typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599)
                return value;
            const m = typeof value === 'string' && /^HTTP\/[\d.]+\s+(\d{3})(?:\s.*)?$/.exec(value);
            if (m)
                return status(Number(m[1]));
            return fail('invalid HTTP status');
        };
        function trailers(value) {
            if (Array.isArray(value))
                return value.map(row => {
                    if (!row || typeof row !== 'object')
                        return fail('trailer array requires field/value strings');
                    const field = row.field, entry = row.value;
                    if (typeof field !== 'string' || typeof entry !== 'string')
                        return fail('trailer array requires field/value strings');
                    return { field, value: entry };
                });
            if (!value || typeof value !== 'object')
                return fail('trailers require a dictionary or field/value array');
            return Object.assign({}, headers(value));
        }
        const headerView = value => headers(Array.isArray(value) ? Object.fromEntries(trailers(value).map(row => [row.field, row.value])) : value);
        function trailerView(result, sourceField, targetField, available) {
            if (targetField && sourceField !== targetField) {
                const present = own(result, targetField), value = result[targetField];
                delete result[targetField];
                if (available && sourceField && present && value !== undefined) {
                    const fields = trailers(value);
                    result[sourceField] = headers(Array.isArray(fields) ? Object.fromEntries(fields.map(row => [row.field, row.value])) : fields);
                }
            }
            return result;
        }
        const requestParts = value => typeof value === 'string' ? /^(https?):\/\/([^/?#]+)([^#]*)/i.exec(value) : null;
        const originalRequest = requestParts(host.request && host.request.url);
        const rawPath = parts => parts[3] ? (parts[3][0] === '?' ? '/' : '') + parts[3] : '/';
        function view(value, requestRole = false) {
            if (value === undefined)
                return undefined;
            const result = Object.assign({}, value);
            if (requestRole && false && originalRequest) {
                if (!own(result, 'scheme'))
                    result.scheme = originalRequest[1].toLowerCase();
                if (!own(result, 'path'))
                    result.path = rawPath(originalRequest);
            }
            const nativeHeaders = value.headers;
            if (nativeHeaders !== undefined)
                result.headers = headerView(nativeHeaders);
            if (!requestRole)
                trailerView(result, "h2_trailers", "trailers", false);
            if (own(value, "status")) {
                result["status"] = status(value["status"]);
                ;
            }
            const data = binaryBody(value);
            {
                if (data !== undefined && (typeof result.body !== 'string'))
                    result.body = bytes(data);
                delete result.bodyBytes;
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
            if (!synthetic && true && false && own(out, 'path')) {
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
            {
                if (own(out, 'h2_trailers') && true && false && false && !synthetic)
                    out.trailers = out.h2_trailers;
                for (const key of ['h2_trailers', 'node', 'policy'])
                    delete out[key];
                if (own(out, 'trailers')) {
                    delete out.trailers;
                }
            }
            for (const key of Object.keys(out))
                if (!['url', 'headers', 'body', 'bodyBytes', 'status', 'abort', ...([]), ...([]), ...(['trailers'])].includes(key)) {
                    fail('unmapped completion field: ' + key);
                }
            ;
            ;
            return out;
        }
        function done(value) {
            if (completed)
                return;
            if (['task', 'network', 'generic'].includes("request"))
                return finish(value ?? {});
            if (value === undefined || value === null)
                return finish({});
            if (value === response || value === request) {
                const out = {};
                for (const k of ['url', 'headers', 'body', 'bodyBytes', 'h2_trailers', ...(["h2_trailers"]), ...([]), "status"])
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
        ;
        ;
        ;
        ;
        const overlay = {
            $request: request, $done: done
        };
        return run.call(host.global, overlay);
    })(__wayxConfig, __wayxHost, function (__wayxScope) {
        return (function ($request, $done) {
            return (function () {
                const url = $request.url;
                const header = $request.headers;
                const contype = header["content-type"];
                const headopt = header["operation-type"];
                if (url.includes("/mobile.12306.cn/otsmobile/app/mgs/")) {
                    const list12306 = [
                        "com.cars.otsmobile.integration.activityBanner",
                        "com.cars.otsmobile.memberInfo.getMemberQa",
                        "com.cars.otsmobile.newHomePage.initData",
                        "com.cars.otsmobile.newHomePageBussData",
                        "com.cars.otsmobile.paySuccBuss.bussEntryShow"
                    ];
                    if (list12306?.includes(headopt)) {
                        $done();
                    }
                    else {
                        $done({});
                    }
                }
                else if (url.includes("/mobilepaas.abchina.com.cn:441/mgw")) {
                    const listbankabc = [
                        "com.bankabc.recommendcenter.homepage.gethpadverinfo",
                        "com.abchina.mbank.common.homepage.getStartParam"
                    ];
                    if (listbankabc?.includes(headopt)) {
                        $done();
                    }
                    else {
                        $done({});
                    }
                }
                else if (url.includes("/sec.sginput.qq.com/q")) {
                    if (contype === "application/octet-stream") {
                        $done();
                    }
                    else {
                        $done({});
                    }
                }
                else {
                    $done({});
                }
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
    if (["request"].includes(__wayxHost.response === undefined ? 'request' : 'response'))
        return (function (nativeDone, run) {
            let attempted = false, nativeFailed = false, nativeError;
            const done = value => {
                if (attempted)
                    return;
                attempted = true;
                try {
                    return nativeDone(value);
                }
                catch (error) {
                    nativeFailed = true;
                    nativeError = error;
                    throw error;
                }
            };
            const recover = error => {
                if (nativeFailed && error === nativeError)
                    throw error;
                try {
                    if (typeof console !== 'undefined' && typeof console.log === 'function')
                        console.log('[WayX] HTTP script failed; ' + (attempted ? 'completion already submitted' : 'passing through unchanged'), error);
                }
                catch { }
                if (!attempted)
                    return done({});
            };
            try {
                const result = run(done);
                return result && typeof result.then === 'function' ? Promise.resolve(result).catch(recover) : result;
            }
            catch (error) {
                return recover(error);
            }
        })(__wayxHost.done, __wayxGuardDone => { __wayxHost.done = __wayxGuardDone; return __wayxExecute(); });
    return __wayxExecute();
})();
