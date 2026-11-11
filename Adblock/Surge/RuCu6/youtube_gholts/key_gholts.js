/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
(function () {
    const __wayxHost = { request: typeof $request === 'undefined' ? undefined : $request, response: typeof $response === 'undefined' ? undefined : $response, done: $done, store: typeof $persistentStore === 'undefined' ? undefined : $persistentStore, global: globalThis };
    if ((__wayxHost.response === undefined ? 'request' : 'response') !== "response")
        throw new Error('Unregistered HTTP source/target declaration');
    const __wayxConfig = { "apiPlan": { "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" } } };
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
            if (requestRole && false && originalRequest) {
                if (!own(result, 'scheme'))
                    result.scheme = originalRequest[1].toLowerCase();
                if (!own(result, 'path'))
                    result.path = rawPath(originalRequest);
            }
            if (value.headers !== undefined)
                result.headers = headers(value.headers);
            if (own(value, "status")) {
                result["status"] = status(value["status"]);
                ;
            }
            if (binary(value.bodyBytes) || binary(value.body)) {
                const valueBytes = value.body;
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
                ;
                return finish({ response: out });
            }
            return finish(out);
        }
        const nativeStore = host.store;
        const storageKey = key => {
            if (key === undefined) {
                const name = "youtube_key";
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
                if (value === null || (value === undefined && true))
                    return nativeStore["write"](null, key);
                if (typeof value !== 'string')
                    return fail('storage value must be String or deletion marker');
                return nativeStore["write"](value, key);
            } };
        store.remove = () => { ; ; return; };
        ;
        ;
        ;
        const overlay = {
            $request: request, $response: response, $done: done,
            $persistentStore: store
        };
        return run.call(host.global, overlay);
    })(__wayxConfig, __wayxHost, function (__wayxScope) {
        return (function ($persistentStore, $request, $response, $done) {
            return (function () {
                (() => {
                    const CONFIG_KEY = "YouTubeConfig";
                    const QUALITY_KEY = "YouTubeQuality";
                    function readConfig(key = CONFIG_KEY, limit = Infinity) {
                        const stored = $persistentStore.read(key);
                        if (typeof stored === "string" && stored.length > limit)
                            return {};
                        try {
                            const value = JSON.parse(stored || "{}");
                            return value && typeof value === "object" && !Array.isArray(value) ? value : {};
                        }
                        catch {
                            return {};
                        }
                    }
                    function writeConfig(config, key = CONFIG_KEY) {
                        return $persistentStore.write(JSON.stringify(config), key);
                    }
                    function keyCandidates(stored) {
                        if (!stored)
                            return [];
                        return [stored, ...(Array.isArray(stored.previous) ? stored.previous.slice(0, 3) : [])].filter((pair) => pair &&
                            typeof pair.clientKey === "string" &&
                            typeof pair.encryptKey === "string" &&
                            pair.clientKey.length > 0 &&
                            pair.clientKey.length <= 5500 &&
                            pair.encryptKey.length > 0 &&
                            pair.encryptKey.length <= 5500);
                    }
                    function clearKeys(platform, expected) {
                        if (platform === undefined || expected === undefined)
                            return;
                        const config = readConfig();
                        if (!Object.hasOwn(config, platform))
                            return;
                        const current = config[platform];
                        const snapshot = expected;
                        if (JSON.stringify(current) === JSON.stringify(snapshot)) {
                            delete config[platform];
                            return writeConfig(config);
                        }
                    }
                    function wireFields(bytes) {
                        const fields = [];
                        let offset = 0;
                        function read() {
                            let value = 0, scale = 1;
                            for (let i = 0; i < 5; i++) {
                                if (offset >= bytes.length)
                                    throw new Error("Truncated protobuf varint");
                                const byte = bytes[offset++];
                                value += (byte & 127) * scale;
                                if (!(byte & 128)) {
                                    if (value > 0xffffffff)
                                        throw new Error("Protobuf length/tag overflow");
                                    return value;
                                }
                                scale *= 128;
                            }
                            throw new Error("Invalid protobuf varint");
                        }
                        while (offset < bytes.length) {
                            const start = offset, tag = read(), no = Math.floor(tag / 8), wire = tag % 8;
                            if (!no)
                                throw new Error("Invalid protobuf field");
                            let payloadStart = offset;
                            if (wire === 2) {
                                const length = read();
                                payloadStart = offset;
                                offset += length;
                            }
                            else if (wire === 1)
                                offset += 8;
                            else if (wire === 5)
                                offset += 4;
                            else if (wire === 0) {
                                let count = 0, byte;
                                do {
                                    if (offset >= bytes.length || count++ === 10)
                                        throw new Error("Invalid protobuf integer");
                                    byte = bytes[offset++];
                                    if (count === 10 && byte > 1)
                                        throw new Error("Protobuf integer overflow");
                                } while (byte & 128);
                            }
                            else
                                throw new Error("Unsupported protobuf wire type " + wire);
                            if (offset > bytes.length)
                                throw new Error("Truncated protobuf field");
                            fields.push({
                                no,
                                wire,
                                data: bytes.subarray(payloadStart, offset),
                                raw: bytes.subarray(start, offset),
                            });
                        }
                        return fields;
                    }
                    function bytesField(bytes, number, unique = false) {
                        let first;
                        for (const field of wireFields(bytes)) {
                            if (field.no !== number || field.wire !== 2)
                                continue;
                            if (!unique)
                                return field.data;
                            if (first)
                                return;
                            first = field.data;
                        }
                        return first;
                    }
                    function platformKey(request) {
                        return Object.entries(request.headers ?? {}).some(([name, value]) => name.toLowerCase() === "user-agent" && /music/i.test(value))
                            ? "youtubeMusic"
                            : "youtube";
                    }
                    function keyMain() {
                        try {
                            const endpoint = $request.url.split("?")[0].split("/youtubei/v1/")[1];
                            if ((endpoint !== "config" && endpoint !== "log_event") || !$response.body?.length)
                                return $done();
                            let group = $response.body;
                            for (const no of [1, 16, 7, 138536474, 146311580]) {
                                group = bytesField(group, no, true);
                                if (!group)
                                    return $done();
                            }
                            const clientKey = bytesField(group, 1, true), encryptKey = bytesField(group, 2, true);
                            if (clientKey?.length && encryptKey?.length && clientKey.length <= 4096 && encryptKey.length <= 4096) {
                                const platform = platformKey($request), config = readConfig();
                                const value = {
                                    clientKey: clientKey.toBase64(),
                                    encryptKey: encryptKey.toBase64(),
                                };
                                if (config[platform]?.clientKey !== value.clientKey || config[platform]?.encryptKey !== value.encryptKey) {
                                    const previous = keyCandidates(config[platform])
                                        .filter((pair) => pair.clientKey !== value.clientKey || pair.encryptKey !== value.encryptKey)
                                        .slice(0, 3)
                                        .map(({ clientKey, encryptKey }) => ({
                                        clientKey,
                                        encryptKey,
                                    }));
                                    if (previous.length)
                                        value.previous = previous;
                                    config[platform] = value;
                                    if (!writeConfig(config))
                                        console.log("YouTube key write failed");
                                }
                            }
                            $done();
                        }
                        catch (error) {
                            console.log("YouTube keys: " + error);
                            $done();
                        }
                    }
                    keyMain();
                })();
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$persistentStore") ? __wayxScope["$persistentStore"] : (typeof $persistentStore === 'undefined' ? undefined : $persistentStore), Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
