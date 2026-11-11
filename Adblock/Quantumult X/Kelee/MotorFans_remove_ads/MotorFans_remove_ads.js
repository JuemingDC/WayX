/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
(function () {
    const __wayxHost = { request: typeof $request === 'undefined' ? undefined : $request, response: typeof $response === 'undefined' ? undefined : $response, done: $done, global: globalThis };
    if ((__wayxHost.response === undefined ? 'request' : 'response') !== "response")
        throw new Error('Unregistered HTTP source/target declaration');
    const __wayxConfig = { "apiPlan": { "target": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": "open-url", "media": "media-url", "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" } } };
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
        const statusLine = value => { const code = status(value); return typeof value === 'string' ? value : 'HTTP/1.1 ' + code + ' ' + ({ 200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error' }[code] || 'Status'); };
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
            if (value.headers !== undefined)
                result.headers = headers(value.headers);
            if (own(value, "statusCode")) {
                result["status"] = status(value["statusCode"]);
                delete result["statusCode"];
            }
            if (binary(value.bodyBytes) || binary(value.body)) {
                const valueBytes = value.bodyBytes;
                if (valueBytes !== undefined) {
                    const b = bytes(valueBytes);
                    {
                        result.body = b;
                        delete result.bodyBytes;
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
            if (!synthetic && false && false && own(out, 'path')) {
                if (typeof out.path !== 'string' || !out.path.startsWith('/') || /[\r\n]/.test(out.path))
                    fail('QX request path must be an absolute request path');
                ;
            }
            if (own(out, 'statusCode') && !own(out, 'status'))
                out.status = out.statusCode;
            delete out.statusCode;
            if (own(out, 'status'))
                out.status = statusLine(out.status);
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
                {
                    out.bodyBytes = buffer(out.body);
                    delete out.body;
                }
            }
            ;
            for (const key of Object.keys(out))
                if (!['url', 'headers', 'body', 'bodyBytes', 'status', 'abort', ...([]), ...([])].includes(key)) {
                    delete out[key];
                }
            delete out.abort;
            if (!synthetic && true && own(out, 'headers') && !own(out, 'body') && !own(out, 'bodyBytes') && true)
                fail('QX response-body requires body with changed headers');
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
                for (const k of ['url', 'headers', 'body', 'bodyBytes', 'h2_trailers', ...([]), "status"])
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
                {
                    fail('QX synthetic response requires an echo declaration');
                    return finish(out);
                }
                return finish({ response: out });
            }
            return finish(out);
        }
        ;
        ;
        ;
        const overlay = {
            $response: response, $done: done
        };
        return run.call(host.global, overlay);
    })(__wayxConfig, __wayxHost, function (__wayxScope) {
        return (function ($response, $done) {
            return (function () {
                (() => {
                    if (!$response?.body)
                        return $done({});
                    let body;
                    try {
                        body = JSON.parse($response.body);
                    }
                    catch (e) {
                        console.log(`JSON解析失败: ${e.message}`);
                        return $done({});
                    }
                    let modified = false;
                    const UNWANTED_TAB_TYPES = new Set([2, 3]);
                    const REMOVED_KEYWORDS = [
                        "_ad_",
                        "splash",
                        "adPatch",
                        "AdFree",
                        "adFeed",
                        "AdTime",
                        "AdAlert",
                        "AdConfig",
                        "cancelInspire",
                        "financeAvoidChannel",
                        "_popup_",
                        "HomeKingKong",
                        "MyWalletConfig",
                        "insurance_product_url",
                        "insurance_order_url",
                    ];
                    const FALLBACK_TITLES = {
                        0: "首页",
                        1: "玩圈",
                        4: "我的",
                    };
                    const FALLBACK_TAB_TYPES = [0, 1, 4];
                    const fallbackTab = (type, light) => {
                        const index = type === 4 ? 5 : type + 1;
                        return {
                            titleColor: light ? "#333333" : "#C7C9D0",
                            imageUrl: light
                                ? `https://imgs3.58moto.com/img/app/${index}@3x.png`
                                : `https://imgs3.58moto.com/img/icon2/black_${index}@3x.png`,
                            type,
                            title: FALLBACK_TITLES[type],
                            selectedImageUrl: light
                                ? `https://imgs3.58moto.com/img/app/${index}_s@3x.png`
                                : `https://imgs3.58moto.com/img/icon2/black_${index}_s@3x.png`,
                            selectedTitleColor: light ? "#111111" : "#C7C9D0",
                        };
                    };
                    const getFallbackData = () => ({
                        dymaicTabBar: FALLBACK_TAB_TYPES.map((type) => fallbackTab(type, true)),
                        blackDymaicTabBar: FALLBACK_TAB_TYPES.map((type) => fallbackTab(type, false)),
                    });
                    const shouldRemoveTab = (item) => {
                        const type = item?.type;
                        return UNWANTED_TAB_TYPES.has(type) || UNWANTED_TAB_TYPES.has(Number(type));
                    };
                    const shouldRemoveField = (key) => {
                        return REMOVED_KEYWORDS.some((keyword) => key.includes(keyword));
                    };
                    const cleanFields = (node) => {
                        if (Array.isArray(node)) {
                            node.forEach(cleanFields);
                            return;
                        }
                        if (!node || typeof node !== "object")
                            return;
                        for (const key of Object.keys(node)) {
                            if (shouldRemoveField(key)) {
                                delete node[key];
                                modified = true;
                            }
                            else {
                                cleanFields(node[key]);
                            }
                        }
                    };
                    const processData = () => {
                        let dataPath = body?.data;
                        if (dataPath === null || dataPath === undefined) {
                            body.data = JSON.stringify(getFallbackData());
                            modified = true;
                            return;
                        }
                        if (typeof dataPath === "string") {
                            try {
                                dataPath = JSON.parse(dataPath);
                            }
                            catch (e) {
                                console.log(`data JSON解析失败: ${e.message}`);
                                return;
                            }
                        }
                        if (typeof dataPath !== "object" || dataPath === null)
                            return;
                        for (const tabKey of ["dymaicTabBar", "blackDymaicTabBar"]) {
                            const items = dataPath[tabKey];
                            if (!Array.isArray(items) || items.length === 0)
                                continue;
                            const filteredItems = items.filter((item) => !shouldRemoveTab(item));
                            if (filteredItems.length !== items.length) {
                                dataPath[tabKey] = filteredItems;
                                modified = true;
                            }
                        }
                        cleanFields(dataPath);
                        if (typeof body.data === "string") {
                            body.data = JSON.stringify(dataPath);
                        }
                    };
                    processData();
                    $done(modified ? { body: JSON.stringify(body) } : {});
                })();
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
