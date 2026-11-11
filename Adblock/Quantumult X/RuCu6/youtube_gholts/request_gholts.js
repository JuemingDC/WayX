/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
(function () {
    const __wayxHost = { request: typeof $request === 'undefined' ? undefined : $request, response: typeof $response === 'undefined' ? undefined : $response, done: $done, prefs: typeof $prefs === 'undefined' ? undefined : $prefs, global: globalThis };
    if ((__wayxHost.response === undefined ? 'request' : 'response') !== "request")
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
            if (!synthetic && true && false && own(out, 'path')) {
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
                if (!['url', 'headers', 'body', 'bodyBytes', 'status', 'abort', ...(!synthetic ? ['path'] : []), ...([])].includes(key)) {
                    delete out[key];
                }
            delete out.abort;
            if (!synthetic && false && own(out, 'headers') && !own(out, 'body') && !own(out, 'bodyBytes') && true)
                fail('QX response-body requires body with changed headers');
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
        const nativeStore = host.prefs;
        const storageKey = key => {
            if (key === undefined) {
                const name = "request_gholts.js";
                if (!name)
                    return fail('source storage default key needs source script name');
                return name;
            }
            if (typeof key !== 'string')
                return fail('storage key must be String');
            return key;
        };
        const store = { read: key => nativeStore["valueForKey"](storageKey(key)), write: (value, key) => {
                key = storageKey(key);
                if (value === null || (value === undefined && true))
                    return nativeStore["removeValueForKey"](key);
                if (typeof value !== 'string')
                    return fail('storage value must be String or deletion marker');
                return nativeStore["setValueForKey"](value, key);
            } };
        store.remove = () => {
            ;
            {
                host.prefs.removeAllValues();
                return;
            }
            return;
        };
        ;
        ;
        let argument = undefined;
        ;
        const overlay = {
            $request: request, $done: done,
            $persistentStore: store,
            $argument: argument
        };
        return run.call(host.global, overlay);
    })(__wayxConfig, __wayxHost, function (__wayxScope) {
        return (function ($persistentStore, $argument, $request, $done) {
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
                    function concatBytes(chunks) {
                        const result = new Uint8Array(chunks.reduce((n, b) => n + b.length, 0));
                        let offset = 0;
                        for (const bytes of chunks) {
                            result.set(bytes, offset);
                            offset += bytes.length;
                        }
                        return result;
                    }
                    function sameBytes(a, b) {
                        return a === b || (a.length === b.length && a.every((value, i) => value === b[i]));
                    }
                    function varint(value) {
                        const bytes = [];
                        do {
                            bytes.push((value % 128) | (value > 127 ? 128 : 0));
                            value = Math.floor(value / 128);
                        } while (value);
                        return new Uint8Array(bytes);
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
                    function readInteger(bytes) {
                        let value = 0, scale = 1;
                        for (const byte of bytes) {
                            value += (byte & 127) * scale;
                            scale *= 128;
                        }
                        return value;
                    }
                    function readOptions(defaults = {}) {
                        return { ...defaults, ...parseArguments() };
                    }
                    function parseArguments() {
                        if (typeof $argument === "string") {
                            if (!$argument || $argument.includes("{{{"))
                                return {};
                            try {
                                return coerceValues(JSON.parse($argument));
                            }
                            catch {
                                return {};
                            }
                        }
                        if ($argument && typeof $argument === "object")
                            return coerceValues({ ...$argument });
                        return {};
                    }
                    function coerceValues(values) {
                        const result = {};
                        for (const [key, value] of Object.entries(values)) {
                            if (typeof value !== "string") {
                                result[key] = value;
                                continue;
                            }
                            const text = value.trim().toLowerCase();
                            if (text === "true")
                                result[key] = true;
                            else if (text === "false")
                                result[key] = false;
                            else if (text !== "" && !Number.isNaN(Number(text)))
                                result[key] = Number(text);
                            else
                                result[key] = value;
                        }
                        return result;
                    }
                    function platformKey(request) {
                        return Object.entries(request.headers ?? {}).some(([name, value]) => name.toLowerCase() === "user-agent" && /music/i.test(value))
                            ? "youtubeMusic"
                            : "youtube";
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
                    function decodeBase64(value) {
                        const normalized = value.replace(/[-_\s=]/g, (character) => (character === "-" ? "+" : character === "_" ? "/" : ""));
                        const partial = normalized.length % 4 === 1;
                        const bytes = Uint8Array.fromBase64(partial ? normalized + "A" : normalized);
                        return partial ? bytes.subarray(0, -1) : bytes;
                    }
                    const QUALITY_LIMIT = 64 * 1024;
                    function validQuality(value) {
                        const record = value;
                        return !!(record &&
                            typeof record === "object" &&
                            !Array.isArray(record) &&
                            Number.isInteger(record.height) &&
                            record.height > 0 &&
                            record.height <= 0x7fffffff &&
                            Array.isArray(record.itags) &&
                            record.itags.length > 0 &&
                            record.itags.length <= 256 &&
                            record.itags.every((itag) => Number.isInteger(itag) && itag > 0 && itag <= 0xffffffff) &&
                            new Set(record.itags).size === record.itags.length &&
                            (record.premiumItags === undefined ||
                                (Array.isArray(record.premiumItags) &&
                                    record.premiumItags.length <= record.itags.length &&
                                    new Set(record.premiumItags).size === record.premiumItags.length &&
                                    record.premiumItags.every((itag) => record.itags.includes(itag)))));
                    }
                    function setQuality(bytes, quality) {
                        const values = new Map(quality
                            ? [
                                [13, 0],
                                [14, 2],
                                [16, quality.height],
                                [21, quality.height],
                                [26, 3],
                                [30, 0],
                            ]
                            : [
                                [16, 4320],
                                [26, 1],
                                [30, 0],
                            ]), seen = new Set(), chunks = [];
                        let changed = false;
                        for (const field of wireFields(bytes)) {
                            const value = field.wire === 0 ? values.get(field.no) : undefined;
                            if (value !== undefined) {
                                if (readInteger(field.data) === value)
                                    chunks.push(field.raw);
                                else {
                                    chunks.push(varint(field.no * 8), varint(value));
                                    changed = true;
                                }
                                seen.add(field.no);
                            }
                            else
                                chunks.push(field.raw);
                        }
                        for (const [no, value] of values)
                            if (!seen.has(no)) {
                                chunks.push(varint(no * 8), varint(value));
                                changed = true;
                            }
                        return changed ? concatBytes(chunks) : bytes;
                    }
                    function preferInitialQuality(bytes) {
                        const fields = wireFields(bytes);
                        const states = fields.filter((field) => field.no === 2 && field.wire === 2);
                        if (states.length !== 1)
                            return bytes;
                        const state = states[0];
                        const output = setQuality(state.data, undefined);
                        return output === state.data
                            ? bytes
                            : concatBytes(fields.map((field) => (field === state ? concatBytes([varint(18), varint(output.length), output]) : field.raw)));
                    }
                    function selectQuality(fields, url) {
                        try {
                            const match = /[?&]id=([^&]+)/.exec(url);
                            if (!match)
                                return;
                            const config = fields.find((field) => field.no === 5 && field.wire === 2);
                            const signed = config && bytesField(config.data, 1);
                            if (!signed?.length)
                                return;
                            const quality = readConfig(QUALITY_KEY, QUALITY_LIMIT)?.[decodeURIComponent(match[1])];
                            if (!validQuality(quality))
                                return;
                            const formats = [], premium = [];
                            for (const field of wireFields(signed)) {
                                if (field.no !== 6 || field.wire !== 2)
                                    continue;
                                const itag = wireFields(field.data).find((field) => field.no === 1 && field.wire === 0);
                                if (!itag)
                                    continue;
                                const id = readInteger(itag.data);
                                if (!quality.itags.includes(id))
                                    continue;
                                formats.push(field.data);
                                if (quality.premiumItags?.includes(id))
                                    premium.push(field.data);
                            }
                            return formats.length
                                ? {
                                    height: quality.height,
                                    formats: premium.length ? premium : formats,
                                }
                                : undefined;
                        }
                        catch {
                            return undefined;
                        }
                    }
                    function forceHighestQuality(bytes, url) {
                        const fields = wireFields(bytes), quality = selectQuality(fields, url);
                        const selected = fields.filter((field) => field.no === 17 && field.wire === 2);
                        const replaceFormats = quality &&
                            (selected.length !== quality.formats.length || selected.some((field, i) => !sameBytes(field.data, quality.formats[i])));
                        const chunks = [];
                        let found = false, changed = !!replaceFormats;
                        for (const field of fields) {
                            if (field.no === 1 && field.wire === 2) {
                                const state = setQuality(field.data, quality);
                                if (state === field.data)
                                    chunks.push(field.raw);
                                else {
                                    chunks.push(varint(10), varint(state.length), state);
                                    changed = true;
                                }
                                found = true;
                            }
                            else if (replaceFormats && field.no === 17 && field.wire === 2) {
                                continue;
                            }
                            else
                                chunks.push(field.raw);
                        }
                        if (!found) {
                            const state = setQuality(new Uint8Array(), quality);
                            chunks.push(varint(10), varint(state.length), state);
                            changed = true;
                        }
                        if (replaceFormats)
                            for (const format of quality.formats)
                                chunks.push(varint(17 * 8 + 2), varint(format.length), format);
                        return changed ? concatBytes(chunks) : bytes;
                    }
                    function requestMain() {
                        try {
                            const path = $request.url.split("?")[0];
                            let result;
                            if (path.endsWith("/player/ad_break"))
                                result = emptyPlayback();
                            else if (path.endsWith("/log_event"))
                                result = prepareLogEvent($request);
                            else if (path.endsWith("/initplayback")) {
                                if ($request.method !== "GET" && $request.method !== "HEAD") {
                                    const body = binaryRequestBody($request);
                                    if (body?.length && checkPlaybackKey(body, platformKey($request)) && readOptions().autoHd !== false) {
                                        const output = preferInitialQuality(body);
                                        if (output !== body)
                                            result = { body: output };
                                    }
                                }
                            }
                            else if (path.endsWith("/videoplayback")) {
                                const options = readOptions();
                                const body = options.autoHd === false ? undefined : binaryRequestBody($request);
                                if (body?.length) {
                                    const output = forceHighestQuality(body, $request.url);
                                    if (output !== body)
                                        result = { body: output };
                                }
                            }
                            $done(result ?? {});
                        }
                        catch (error) {
                            console.log("YouTube request: " + error);
                            $done();
                        }
                    }
                    function binaryRequestBody(request) {
                        const body = request.body;
                        if (ArrayBuffer.isView(body))
                            return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
                        if (body?.length)
                            throw new Error("YouTube requires binary-body-mode for request bodies");
                        const length = Object.entries(request.headers ?? {}).find(([name]) => name.toLowerCase() === "content-length")?.[1];
                        if (Number(length) > 0)
                            throw new Error("YouTube request body unavailable; requires-body must be enabled");
                    }
                    function emptyPlayback() {
                        return {
                            response: {
                                status: 200,
                                headers: { "Content-Type": "application/x-protobuf" },
                                body: new Uint8Array(),
                            },
                        };
                    }
                    function prepareLogEvent(request) {
                        const names = Object.keys(request.headers ?? {}).filter((name) => name.toLowerCase() === "x-youtube-hot-hash-data");
                        if (!names.length || readConfig()[platformKey(request)]?.clientKey)
                            return;
                        const headers = { ...request.headers };
                        for (const name of names)
                            delete headers[name];
                        return { headers };
                    }
                    function checkPlaybackKey(body, platform) {
                        const encrypted = bytesField(body, 3);
                        const encryptKey = encrypted && bytesField(encrypted, 5);
                        if (!encryptKey?.length)
                            return false;
                        const expected = readConfig()[platform];
                        for (const pair of keyCandidates(expected)) {
                            try {
                                if (sameBytes(encryptKey, decodeBase64(pair.encryptKey)))
                                    return true;
                            }
                            catch {
                            }
                        }
                        clearKeys(platform, expected);
                        return false;
                    }
                    requestMain();
                })();
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$persistentStore") ? __wayxScope["$persistentStore"] : (typeof $persistentStore === 'undefined' ? undefined : $persistentStore), Object.prototype.hasOwnProperty.call(__wayxScope, "$argument") ? __wayxScope["$argument"] : (typeof $argument === 'undefined' ? undefined : $argument), Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
