/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
(function () {
    const __wayxHost = { request: typeof $request === 'undefined' ? undefined : $request, response: typeof $response === 'undefined' ? undefined : $response, done: $done, codecs: (function (legacy, native = {}) {
            let legacyProvider;
            const text = value => { if (typeof value === 'symbol')
                throw new TypeError('Cannot convert a Symbol to a string'); return String(value); };
            const dictionary = value => { if (value === undefined || value === null)
                return {}; if (typeof value !== 'object' && typeof value !== 'function')
                throw new TypeError('Options must be an object'); return value; };
            const arrayBufferLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
            const typedPrototype = Object.getPrototypeOf(Uint8Array.prototype), typedGet = name => Object.getOwnPropertyDescriptor(typedPrototype, name).get, dataGet = name => Object.getOwnPropertyDescriptor(DataView.prototype, name).get;
            const typedName = Object.getOwnPropertyDescriptor(typedPrototype, Symbol.toStringTag).get, typedLength = typedGet('length'), typedBuffer = typedGet('buffer'), typedOffset = typedGet('byteOffset'), typedBytes = typedGet('byteLength'), dataBuffer = dataGet('buffer'), dataOffset = dataGet('byteOffset'), dataBytes = dataGet('byteLength'), setBytes = Uint8Array.prototype.set;
            const inputBytes = value => {
                if (value === undefined)
                    return new Uint8Array(0);
                let length;
                try {
                    length = arrayBufferLength.call(value);
                }
                catch { }
                if (length !== undefined)
                    return new Uint8Array(value, 0, length);
                if (ArrayBuffer.isView(value)) {
                    const typed = typedName.call(value) !== undefined, buffer = (typed ? typedBuffer : dataBuffer).call(value), offset = (typed ? typedOffset : dataOffset).call(value), size = (typed ? typedBytes : dataBytes).call(value);
                    arrayBufferLength.call(buffer);
                    return new Uint8Array(buffer, offset, size);
                }
                throw new TypeError('Expected an ArrayBuffer or view');
            };
            const scalar = (s, index) => { let cp = s.charCodeAt(index), read = 1; if (cp >= 0xd800 && cp <= 0xdbff) {
                const low = s.charCodeAt(index + 1);
                if (low >= 0xdc00 && low <= 0xdfff) {
                    cp = 0x10000 + ((cp - 0xd800) << 10) + (low - 0xdc00);
                    read = 2;
                }
                else
                    cp = 0xfffd;
            }
            else if (cp >= 0xdc00 && cp <= 0xdfff)
                cp = 0xfffd; return { cp, read }; };
            const sequence = cp => cp <= 0x7f ? [cp] : cp <= 0x7ff ? [0xc0 | (cp >> 6), 0x80 | (cp & 63)] : cp <= 0xffff ? [0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)] : [0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)];
            const encoderInstances = new WeakSet();
            const encoderBrand = value => { if (!encoderInstances.has(value))
                throw new TypeError('Illegal TextEncoder receiver'); };
            class TextEncoder {
                constructor() { encoderInstances.add(this); }
                get encoding() { encoderBrand(this); return 'utf-8'; }
                encode(input = undefined) { encoderBrand(this); const s = input === undefined ? '' : text(input), out = []; for (let i = 0; i < s.length;) {
                    const point = scalar(s, i);
                    out.push(...sequence(point.cp));
                    i += point.read;
                } return new Uint8Array(out); }
                encodeInto(input, destination) { encoderBrand(this); if (arguments.length < 2)
                    throw new TypeError('Two arguments required'); const s = text(input); if (typedName.call(destination) !== 'Uint8Array')
                    throw new TypeError('Uint8Array destination required'); const capacity = typedLength.call(destination); let read = 0, written = 0; while (read < s.length) {
                    const point = scalar(s, read), bytes = sequence(point.cp);
                    if (written + bytes.length > capacity)
                        break;
                    setBytes.call(destination, bytes, written);
                    written += bytes.length;
                    read += point.read;
                } return { read, written }; }
            }
            const decoders = new WeakMap(), decoderState = value => { const state = decoders.get(value); if (!state)
                throw new TypeError('Illegal TextDecoder receiver'); return state; };
            const reset = state => { state.point = 0; state.seen = 0; state.need = 0; state.lower = 0x80; state.upper = 0xbf; };
            class TextDecoder {
                constructor(label = 'utf-8', options = undefined) {
                    const encoding = text(label).replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '').toLowerCase(), opts = dictionary(options), fatal = !!opts.fatal, ignoreBOM = !!opts.ignoreBOM;
                    let delegate;
                    if (typeof native.TextDecoder === 'function') {
                        try {
                            delegate = new native.TextDecoder(encoding, { fatal, ignoreBOM });
                        }
                        catch (error) {
                            if (error.name !== 'RangeError')
                                throw error;
                        }
                    }
                    if (!delegate && !['utf-8', 'utf8', 'unicode-1-1-utf-8', 'unicode11utf8', 'unicode20utf8', 'x-unicode20utf8'].includes(encoding)) {
                        if (!legacy)
                            throw new RangeError('Encoding provider unavailable');
                        if (!legacyProvider)
                            legacyProvider = legacy();
                        delegate = new legacyProvider.TextDecoder(encoding, { fatal, ignoreBOM });
                    }
                    const state = { fatal, ignoreBOM, delegate, stream: false, bom: false };
                    reset(state);
                    decoders.set(this, state);
                }
                get encoding() { const state = decoderState(this); return state.delegate ? state.delegate.encoding : 'utf-8'; }
                get fatal() { return decoderState(this).fatal; }
                get ignoreBOM() { return decoderState(this).ignoreBOM; }
                decode(input = undefined, options = undefined) {
                    const state = decoderState(this), bytes = inputBytes(input), opts = dictionary(options), stream = !!opts.stream, out = [];
                    if (state.delegate)
                        return state.delegate.decode(bytes, { stream });
                    if (!state.stream) {
                        reset(state);
                        state.bom = false;
                    }
                    state.stream = stream;
                    const emit = cp => { if (!state.bom) {
                        state.bom = true;
                        if (cp === 0xfeff && !state.ignoreBOM)
                            return;
                    } out.push(cp <= 0xffff ? String.fromCharCode(cp) : String.fromCharCode(0xd800 + ((cp - 0x10000) >> 10), 0xdc00 + ((cp - 0x10000) & 1023))); };
                    const error = () => { reset(state); if (state.fatal)
                        throw new TypeError('Invalid UTF-8 data'); emit(0xfffd); };
                    for (let i = 0; i < bytes.length; i++) {
                        const b = bytes[i];
                        if (!state.need) {
                            if (b <= 0x7f) {
                                emit(b);
                                continue;
                            }
                            if (b >= 0xc2 && b <= 0xdf) {
                                state.need = 1;
                                state.point = b & 31;
                                continue;
                            }
                            if (b >= 0xe0 && b <= 0xef) {
                                state.need = 2;
                                state.point = b & 15;
                                if (b === 0xe0)
                                    state.lower = 0xa0;
                                if (b === 0xed)
                                    state.upper = 0x9f;
                                continue;
                            }
                            if (b >= 0xf0 && b <= 0xf4) {
                                state.need = 3;
                                state.point = b & 7;
                                if (b === 0xf0)
                                    state.lower = 0x90;
                                if (b === 0xf4)
                                    state.upper = 0x8f;
                                continue;
                            }
                            error();
                            continue;
                        }
                        if (b < state.lower || b > state.upper) {
                            error();
                            i--;
                            continue;
                        }
                        state.lower = 0x80;
                        state.upper = 0xbf;
                        state.point = (state.point << 6) | (b & 63);
                        state.seen++;
                        if (state.seen === state.need) {
                            const cp = state.point;
                            reset(state);
                            emit(cp);
                        }
                    }
                    if (!stream && state.need)
                        error();
                    return out.join('');
                }
            }
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
            class PortableInvalidCharacterError extends Error {
                get name() { return 'InvalidCharacterError'; }
                get code() { return 5; }
                get [Symbol.toStringTag]() { return 'DOMException'; }
            }
            const invalid = () => { throw typeof DOMException === 'function' ? new DOMException('Invalid Base64 character', 'InvalidCharacterError') : new PortableInvalidCharacterError('Invalid Base64 character'); };
            function atob(value) { if (!arguments.length)
                throw new TypeError('One argument required'); let s = text(value).replace(/[\t\n\f\r ]/g, ''); if (s.length % 4 === 0)
                s = s.replace(/==?$/, ''); if (s.length % 4 === 1 || /[^A-Za-z0-9+/]/.test(s))
                invalid(); let bits = 0, buffer = 0, out = ''; for (let i = 0; i < s.length; i++) {
                buffer = (buffer << 6) | alphabet.indexOf(s[i]);
                bits += 6;
                if (bits >= 8) {
                    bits -= 8;
                    out += String.fromCharCode((buffer >> bits) & 255);
                }
            } return out; }
            function btoa(value) { if (!arguments.length)
                throw new TypeError('One argument required'); const s = text(value); let out = ''; for (let i = 0; i < s.length; i += 3) {
                const a = s.charCodeAt(i), b = s.charCodeAt(i + 1), c = s.charCodeAt(i + 2);
                if (a > 255 || b > 255 || c > 255)
                    invalid();
                const word = (a << 16) | ((b || 0) << 8) | (c || 0);
                out += alphabet[(word >>> 18) & 63] + alphabet[(word >>> 12) & 63] + (i + 1 < s.length ? alphabet[(word >>> 6) & 63] : '=') + (i + 2 < s.length ? alphabet[word & 63] : '=');
            } return out; }
            return { TextEncoder, TextDecoder, atob, btoa };
        })((undefined), { TextDecoder: typeof TextDecoder === 'undefined' ? undefined : TextDecoder }), http: typeof $httpClient === 'undefined' ? undefined : $httpClient, task: typeof $task === 'undefined' ? undefined : $task, environment: typeof $environment === 'undefined' ? undefined : $environment, global: globalThis };
    if ((__wayxHost.response === undefined ? 'request' : 'response') !== "request")
        throw new Error('Unregistered HTTP source/target declaration');
    const __wayxConfig = { "apiPlan": { "source": { "responseStatus": "status", "scriptStartTime": "date", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": true }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "node", "timeoutMs": 1, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": true } }, "notification": { "root": "$notification.post", "open": "openUrl", "media": "mediaUrl", "action": null, "openAction": null, "stringLink": true, "delay": true }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "typed" }, "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" }, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"] } };
    return (function (config, host, run) {
        const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
        const fail = message => { throw new TypeError('WayX API: ' + message); };
        const source = config.apiPlan.source;
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
            if (['task', 'network', 'generic'].includes("task"))
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
        function transport(input, style, method) {
            if (typeof input === 'string')
                input = { url: input };
            if (!input || typeof input !== 'object' || typeof input.url !== 'string')
                return fail('HTTP request requires url');
            const http = style === 'promise' ? config.apiPlan.qxHttp : source.http;
            const options = style === 'promise' ? (input.opts || {}) : input;
            const verb = String(method || input.method || 'GET').toLowerCase();
            if (!config.apiPlan.methods.includes(verb))
                return fail('HTTP method unavailable: ' + verb);
            const req = { url: input.url };
            if (own(input, 'headers'))
                req.headers = Object.assign({}, input.headers);
            let requestBody = own(input, 'body') ? input.body : undefined;
            if (requestBody === undefined && style === 'promise' && own(input, 'bodyBytes'))
                requestBody = input.bodyBytes;
            if (requestBody !== undefined) {
                if (binary(requestBody))
                    req["body"] = bytes(requestBody);
                else
                    req.body = requestBody;
            }
            const mapped = {};
            for (const semantic of ['redirect', 'cookie', 'tls'])
                mapped[target.http[semantic]] = own(options, http[semantic]) ? options[http[semantic]] : http.defaults[semantic];
            if (own(options, http.policy))
                mapped["policy"] = options[http.policy] === http.directPolicy ? "DIRECT" : options[http.policy];
            if (style === 'callback' && input['body-base64'] && true) {
                if (typeof input.body !== 'string')
                    fail('body-base64 requires a String body');
                const raw = host.codecs.atob(input.body), data = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++)
                    data[i] = raw.charCodeAt(i);
                delete req.body;
                req["body"] = data;
            }
            ;
            Object.assign(req, mapped);
            if (http.timeoutMs !== null && true && own(input, 'timeout'))
                req.timeout = input.timeout * http.timeoutMs / 1000;
            for (const key of ['binary-mode', 'body-base64', 'alpn'])
                if (style === 'callback' && own(input, key) && (key !== 'body-base64' || false) && (key !== 'alpn' || false))
                    req[key] = input[key];
            if (style === 'promise')
                req['binary-mode'] = true;
            return { req, verb };
        }
        const http = {};
        for (const method of config.apiPlan.methods)
            http[method] = (input, callback) => {
                if (typeof callback !== 'function')
                    return fail('HTTP callback required');
                const plan = transport(input, 'callback', method);
                {
                    const fn = host.http && host.http[method];
                    if (typeof fn !== 'function')
                        return fail('native HTTP method unavailable');
                    return fn.call(host.http, plan.req, (error, r, data) => {
                        if (error)
                            return callback(error, r, data);
                        if (!r)
                            return callback('HTTP transport returned no response', r, data);
                        const result = Object.assign({}, r, { headers: headers(r.headers || {}) });
                        result.status = status(r["status"]);
                        return callback(null, result, data);
                    });
                }
                return host.task.fetch(plan.req).then(r => {
                    if (!r)
                        return callback('HTTP transport returned no response', undefined, undefined);
                    return callback(null, { status: status(r.statusCode), headers: headers(r.headers || {}) }, input && input['binary-mode'] && own(r, 'bodyBytes') ? bytes(r.bodyBytes) : r.body);
                }, e => callback(e && e.error || e, undefined, undefined));
            };
        ;
        ;
        ;
        const environment = Object.assign({}, host.environment);
        const overlay = {
            $done: done,
            $httpClient: http,
            $environment: environment
        };
        return run.call(host.global, overlay);
    })(__wayxConfig, __wayxHost, function (__wayxScope) {
        return (function ($environment, $done, $httpClient) {
            return (function () {
                const NF_BASE_URL = "https://www.netflix.com/title/81280792";
                const DISNEY_BASE_URL = "https://www.disneyplus.com";
                const DISNEY_LOCATION_BASE_URL = "https://disney.api.edge.bamgrid.com/graph/v1/device/graphql";
                const YTB_BASE_URL = "https://www.youtube.com/premium";
                const Dazn_BASE_URL = "https://startup.core.indazn.com/misl/v5/Startup";
                const Param_BASE_URL = "https://www.paramountplus.com/";
                const Discovery_token_BASE_URL = "https://us1-prod-direct.discoveryplus.com/token?deviceId=d1a4a5d25212400d1e6985984604d740&realm=go&shortlived=true";
                const Discovery_BASE_URL = "https://us1-prod-direct.discoveryplus.com/users/me";
                const GPT_BASE_URL = "https://chat.openai.com/";
                const GPT_RegionL_URL = "https://chat.openai.com/cdn-cgi/trace";
                const Google_BASE_URL = "https://www.google.com/maps/timeline";
                var inputParams = $environment.params;
                var nodeName = inputParams.node;
                let flags = new Map([
                    ["AC", "🇦🇨"],
                    ["AE", "🇦🇪"],
                    ["AF", "🇦🇫"],
                    ["AI", "🇦🇮"],
                    ["AL", "🇦🇱"],
                    ["AM", "🇦🇲"],
                    ["AQ", "🇦🇶"],
                    ["AR", "🇦🇷"],
                    ["AS", "🇦🇸"],
                    ["AT", "🇦🇹"],
                    ["AU", "🇦🇺"],
                    ["AW", "🇦🇼"],
                    ["AX", "🇦🇽"],
                    ["AZ", "🇦🇿"],
                    ["BA", "🇧🇦"],
                    ["BB", "🇧🇧"],
                    ["BD", "🇧🇩"],
                    ["BE", "🇧🇪"],
                    ["BF", "🇧🇫"],
                    ["BG", "🇧🇬"],
                    ["BH", "🇧🇭"],
                    ["BI", "🇧🇮"],
                    ["BJ", "🇧🇯"],
                    ["BM", "🇧🇲"],
                    ["BN", "🇧🇳"],
                    ["BO", "🇧🇴"],
                    ["BR", "🇧🇷"],
                    ["BS", "🇧🇸"],
                    ["BT", "🇧🇹"],
                    ["BV", "🇧🇻"],
                    ["BW", "🇧🇼"],
                    ["BY", "🇧🇾"],
                    ["BZ", "🇧🇿"],
                    ["CA", "🇨🇦"],
                    ["CF", "🇨🇫"],
                    ["CH", "🇨🇭"],
                    ["CK", "🇨🇰"],
                    ["CL", "🇨🇱"],
                    ["CM", "🇨🇲"],
                    ["CN", "🇨🇳"],
                    ["CO", "🇨🇴"],
                    ["CP", "🇨🇵"],
                    ["CR", "🇨🇷"],
                    ["CU", "🇨🇺"],
                    ["CV", "🇨🇻"],
                    ["CW", "🇨🇼"],
                    ["CX", "🇨🇽"],
                    ["CY", "🇨🇾"],
                    ["CZ", "🇨🇿"],
                    ["DE", "🇩🇪"],
                    ["DG", "🇩🇬"],
                    ["DJ", "🇩🇯"],
                    ["DK", "🇩🇰"],
                    ["DM", "🇩🇲"],
                    ["DO", "🇩🇴"],
                    ["DZ", "🇩🇿"],
                    ["EA", "🇪🇦"],
                    ["EC", "🇪🇨"],
                    ["EE", "🇪🇪"],
                    ["EG", "🇪🇬"],
                    ["EH", "🇪🇭"],
                    ["ER", "🇪🇷"],
                    ["ES", "🇪🇸"],
                    ["ET", "🇪🇹"],
                    ["EU", "🇪🇺"],
                    ["FI", "🇫🇮"],
                    ["FJ", "🇫🇯"],
                    ["FK", "🇫🇰"],
                    ["FM", "🇫🇲"],
                    ["FO", "🇫�"],
                    ["FR", "🇫🇷"],
                    ["GA", "🇬🇦"],
                    ["GB", "🇬🇧"],
                    ["HK", "🇭🇰"],
                    ["HU", "🇭🇺"],
                    ["ID", "🇮🇩"],
                    ["IE", "🇮🇪"],
                    ["IL", "🇮🇱"],
                    ["IM", "🇮🇲"],
                    ["IN", "🇮🇳"],
                    ["IS", "🇮🇸"],
                    ["IT", "🇮🇹"],
                    ["JP", "🇯🇵"],
                    ["KR", "🇰🇷"],
                    ["LU", "🇱🇺"],
                    ["MO", "🇲🇴"],
                    ["MX", "🇲🇽"],
                    ["MY", "🇲🇾"],
                    ["NL", "🇳🇱"],
                    ["PH", "🇵🇭"],
                    ["RO", "🇷🇴"],
                    ["RS", "🇷🇸"],
                    ["RU", "🇷🇺"],
                    ["RW", "🇷🇼"],
                    ["SA", "🇸🇦"],
                    ["SB", "��🇧"],
                    ["SC", "🇸🇨"],
                    ["SD", "🇸🇩"],
                    ["SE", "🇸🇪"],
                    ["SG", "🇸🇬"],
                    ["TH", "🇹🇭"],
                    ["TN", "🇹🇳"],
                    ["TO", "🇹🇴"],
                    ["TR", "🇹🇷"],
                    ["TV", "🇹🇻"],
                    ["TW", "🇨🇳"],
                    ["UK", "🇬🇧"],
                    ["UM", "🇺🇲"],
                    ["US", "🇺🇸"],
                    ["UY", "🇺🇾"],
                    ["UZ", "🇺🇿"],
                    ["VA", "🇻🇦"],
                    ["VE", "🇻🇪"],
                    ["VG", "🇻🇬"],
                    ["VI", "🇻🇮"],
                    ["VN", "🇻🇳"],
                    ["ZA", "🇿🇦"]
                ]);
                let result = {
                    title: "  节点解锁查询",
                    YouTube: "<b>YouTube: </b>检测失败，请重试� ❗️",
                    Netflix: "<b>Netflix: </b>检测失败，请重试 ❗️",
                    Dazn: "<b>Dazn: </b>检测失败，请重试 ❗️",
                    Disney: "<b>Disneyᐩ: </b>检测失败，请重试 ❗️",
                    Paramount: "<b>Paramountᐩ: </b>检测失败，请重试 ❗️",
                    Discovery: "<b>Discoveryᐩ: </b>检测失败，请重试 ❗️"
                };
                let arrow = " ➟ ";
                Promise.all([ytbTest(), disneyLocation(), nfTest(), daznTest(), parmTest(), discoveryTest(), gptTest()])
                    .then((value) => {
                    let content = "------------------------------------</br>" +
                        [
                            result["Dazn"],
                            result["Discovery"],
                            result["Paramount"],
                            result["Disney"],
                            result["Netflix"],
                            result["ChatGPT"],
                            result["YouTube"]
                        ].join("</br></br>");
                    content =
                        content +
                            "</br>------------------------------------</br>" +
                            "<font color=#CD5C5C>" +
                            "<b>节点</b> ➟ " +
                            nodeName +
                            "</font>";
                    content =
                        `<p style="text-align: center; font-family: -apple-system; font-size: large; font-weight: thin">` + content + `</p>`;
                    console.log(content);
                    $done({ title: result["title"], htmlMessage: content });
                })
                    .catch((values) => {
                    console.log("reject:" + values);
                    let content = "------------------------------------</br>" +
                        [
                            result["Dazn"],
                            result["Discovery"],
                            result["Paramount"],
                            result["Disney"],
                            result["Netflix"],
                            result["ChatGPT"],
                            result["YouTube"]
                        ].join("</br></br>");
                    content =
                        content +
                            "</br>------------------------------------</br>" +
                            "<font color=#CD5C5C>" +
                            "<b>节点</b> ➟ " +
                            nodeName +
                            "</font>";
                    content =
                        `<p style="text-align: center; font-family: -apple-system; font-size: large; font-weight: thin">` + content + `</p>`;
                    $done({ title: result["title"], htmlMessage: content });
                });
                function disneyLocation() {
                    return new Promise((resolve, reject) => {
                        let params = {
                            url: DISNEY_LOCATION_BASE_URL,
                            node: nodeName,
                            timeout: 5000,
                            headers: {
                                "Accept-Language": "en",
                                Authorization: "ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84",
                                "Content-Type": "application/json",
                                "User-Agent": "UA"
                            },
                            body: JSON.stringify({
                                query: "mutation registerDevice($input: RegisterDeviceInput!) { registerDevice(registerDevice: $input) { grant { grantType assertion } } }",
                                variables: {
                                    input: {
                                        applicationRuntime: "chrome",
                                        attributes: {
                                            browserName: "chrome",
                                            browserVersion: "94.0.4606",
                                            manufacturer: "microsoft",
                                            model: null,
                                            operatingSystem: "windows",
                                            operatingSystemVersion: "10.0",
                                            osDeviceIds: []
                                        },
                                        deviceFamily: "browser",
                                        deviceLanguage: "en",
                                        deviceProfile: "windows"
                                    }
                                }
                            })
                        };
                        $httpClient.post(params, (errormsg, response, data) => {
                            console.log("----------disney--------------");
                            if (errormsg) {
                                result["Discovery"] = "<b>Disneyᐩ:</b>检测失败 ❗️";
                                resolve("disney request failed:" + errormsg);
                                return;
                            }
                            if (response.status == 200) {
                                console.log("disney request result:" + response.status);
                                let resData = JSON.parse(data);
                                if (resData?.extensions?.sdk?.session != null) {
                                    let { inSupportedLocation, location: { countryCode } } = resData?.extensions?.sdk?.session;
                                    if (inSupportedLocation == false) {
                                        result["Disney"] = "<b>Disneyᐩ:</b> 即将登陆 ➟ " + "⟦" + flags.get(countryCode.toUpperCase()) + "⟧ ⚠️";
                                        resolve();
                                    }
                                    else {
                                        result["Disney"] = "<b>Disneyᐩ:</b> 支持 ➟ " + "⟦" + flags.get(countryCode.toUpperCase()) + "⟧ 🎉";
                                        resolve({ inSupportedLocation, countryCode });
                                    }
                                }
                                else {
                                    result["Disney"] = "<b>Disneyᐩ:</b> 未支持 🚫 ";
                                    resolve();
                                }
                            }
                            else {
                                result["Discovery"] = "<b>Disneyᐩ:</b>检测失败 ❗️";
                                resolve();
                            }
                        });
                    });
                }
                function disneyHomePage() {
                    return new Promise((resolve, reject) => {
                        let params = {
                            url: DISNEY_BASE_URL,
                            node: nodeName,
                            timeout: 5000,
                            headers: {
                                "Accept-Language": "en",
                                "User-Agent": UA
                            }
                        };
                        $httpClient.get(params, (errormsg, response, data) => {
                            if (errormsg) {
                                resolve(errormsg);
                                return;
                            }
                            if (response.status != 200 || data.indexOf("unavailable") != -1) {
                                resolve();
                            }
                            else {
                                let match = data.match(/Region: ([A-Za-z]{2})[\s\S]*?CNBL: ([12])/);
                                if (!match) {
                                    resolve();
                                }
                                else {
                                    let region = match[1];
                                    let cnbl = match[2];
                                    resolve({ region, cnbl });
                                }
                            }
                        });
                    });
                }
                function ytbTest() {
                    return new Promise((resolve, reject) => {
                        let params = {
                            url: YTB_BASE_URL,
                            node: nodeName,
                            timeout: 10000,
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36"
                            }
                        };
                        $httpClient.get(params, (errormsg, response, data) => {
                            console.log("----------YTB--------------");
                            if (errormsg) {
                                console.log("YTB request failed:" + errormsg);
                                result["YouTube"] = "<b>YouTube Premium: </b>检测失败 ❗️";
                                resolve(errormsg);
                                return;
                            }
                            if (response.status !== 200) {
                                result["YouTube"] = "<b>YouTube Premium: </b>检测失败 ❗️";
                                resolve(response.status);
                            }
                            else {
                                console.log("YTB request data:" + response.status);
                                if (data.indexOf("Premium is not available in your country") !== -1) {
                                    result["YouTube"] = "<b>YouTube Premium: </b>未支持 🚫";
                                    resolve("YTB test failed");
                                }
                                else if (data.indexOf("Premium is not available in your country") == -1) {
                                    let region = "";
                                    let re = new RegExp('"GL":"(.*?)"', "gm");
                                    let ret = re.exec(data);
                                    if (ret != null && ret.length === 2) {
                                        region = ret[1];
                                    }
                                    else if (data.indexOf("www.google.cn") !== -1) {
                                        region = "CN";
                                    }
                                    else {
                                        region = "US";
                                    }
                                    console.log("YTB region:" + region);
                                    result["YouTube"] = "<b>YouTube Premium: </b>支持 " + arrow + "⟦" + flags.get(region.toUpperCase()) + "⟧ 🎉";
                                    resolve(region);
                                }
                                else {
                                    result["YouTube"] = "<b>YouTube Premium: </b>检测超时 🚦";
                                    resolve("timeout");
                                }
                            }
                        });
                    });
                }
                function daznTest() {
                    return new Promise((resolve, reject) => {
                        const extra = `{
            "LandingPageKey":"generic",
            "Platform":"web",
            "PlatformAttributes":{},
            "Manufacturer":"",
            "PromoCode":"",
            "Version":"2"
          }`;
                        let params = {
                            url: Dazn_BASE_URL,
                            node: nodeName,
                            timeout: 5000,
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36",
                                "Content-Type": "application/json"
                            },
                            body: extra
                        };
                        $httpClient.post(params, (errormsg, response, data) => {
                            console.log("----------DAZN--------------");
                            if (errormsg) {
                                console.log("Dazn request error:" + errormsg);
                                result["Dazn"] = "<b>Dazn: </b>检测失败 ❗️";
                                resolve(errormsg);
                                return;
                            }
                            if (response.status == 200) {
                                console.log("Dazn request data:" + response.status);
                                let region = "";
                                let re = new RegExp('"GeolocatedCountry":"(.*?)"', "gm");
                                let ret = re.exec(data);
                                if (ret != null && ret.length === 2) {
                                    region = ret[1];
                                    result["Dazn"] = "<b>Dazn: </b>支持 " + arrow + "⟦" + flags.get(region.toUpperCase()) + "⟧ 🎉";
                                }
                                else {
                                    result["Dazn"] = "<b>Dazn: </b>未支持 🚫";
                                }
                                resolve(region);
                            }
                            else {
                                result["Dazn"] = "<b>Dazn: </b>检测失败 ❗️";
                                resolve(response.status);
                            }
                        });
                    });
                }
                function parmTest() {
                    return new Promise((resolve, reject) => {
                        let params = {
                            url: Param_BASE_URL,
                            node: nodeName,
                            timeout: 5000,
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36"
                            }
                        };
                        $httpClient.get(params, (errormsg, response, data) => {
                            console.log("----------PARAM--------------");
                            if (errormsg) {
                                console.log("Param request error:" + errormsg);
                                result["Paramountᐩ"] = "<b>Paramountᐩ: </b>检测失败 ❗️";
                                resolve(errormsg);
                                return;
                            }
                            console.log("param result:" + response.status);
                            if (response.status == 200) {
                                result["Paramount"] = "<b>Paramountᐩ: </b>支持 🎉 ";
                                resolve();
                            }
                            else if (response.status == 302) {
                                result["Paramount"] = "<b>Paramountᐩ: </b>未支持 🚫";
                                resolve();
                            }
                            else {
                                result["Paramount"] = "<b>Paramountᐩ: </b>检测失败 ❗️";
                                resolve();
                            }
                        });
                    });
                }
                function discoveryTest() {
                    return new Promise((resolve, reject) => {
                        let params = {
                            url: Discovery_token_BASE_URL,
                            node: nodeName,
                            timeout: 5000,
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36"
                            }
                        };
                        $httpClient.get(params, (errormsg, response, data) => {
                            if (errormsg) {
                                console.log("Discovery token request error:" + errormsg);
                                resolve(errormsg);
                                return;
                            }
                            if (response.status == 200) {
                                console.log("----------Discory token--------------");
                                console.log("discovery_token request result:" + data);
                                let d = JSON.parse(data);
                                let token = d["data"]["attributes"]["token"];
                                const cookievalid = `_gcl_au=1.1.858579665.1632206782; _rdt_uuid=1632206782474.6a9ad4f2-8ef7-4a49-9d60-e071bce45e88; _scid=d154b864-8b7e-4f46-90e0-8b56cff67d05; _pin_unauth=dWlkPU1qWTRNR1ZoTlRBdE1tSXdNaTAwTW1Nd0xUbGxORFV0WWpZMU0yVXdPV1l6WldFeQ; _sctr=1|1632153600000; aam_fw=aam%3D9354365%3Baam%3D9040990; aam_uuid=24382050115125439381416006538140778858; st=${token}; gi_ls=0; _uetvid=a25161a01aa711ec92d47775379d5e4d; AMCV_BC501253513148ED0A490D45%40AdobeOrg=-1124106680%7CMCIDTS%7C18894%7CMCMID%7C24223296309793747161435877577673078228%7CMCAAMLH-1633011393%7C9%7CMCAAMB-1633011393%7CRKhpRz8krg2tLO6pguXWp5olkAcUniQYPHaMWWgdJ3xzPWQmdj0y%7CMCOPTOUT-1632413793s%7CNONE%7CvVersion%7C5.2.0; ass=19ef15da-95d6-4b1d-8fa2-e9e099c9cc38.1632408400.1632406594`;
                                let p = {
                                    url: Discovery_BASE_URL,
                                    node: nodeName,
                                    timeout: 5000,
                                    headers: {
                                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36",
                                        Cookie: cookievalid
                                    }
                                };
                                $httpClient.get(p, (emsg, res, resData) => {
                                    console.log("----------Discory--------------");
                                    if (emsg) {
                                        console.log("Discovery request error:" + errormsg);
                                        result["Discovery"] = "<b>Discoveryᐩ: </b>检测失败 ❗️";
                                        resolve(emsg);
                                        return;
                                    }
                                    if (res.status == 200) {
                                        console.log("Discovery request result:" + resData);
                                        let resD = JSON.parse(resData);
                                        let locationd = resD["data"]["attributes"]["currentLocationTerritory"];
                                        if (locationd == "us") {
                                            result["Discovery"] = "<b>Discoveryᐩ: </b>支持 🎉 ";
                                            resolve();
                                        }
                                        else {
                                            result["Discovery"] = "<b>Discoveryᐩ: </b>未支持 🚫";
                                            resolve();
                                        }
                                    }
                                    else {
                                        result["Discovery"] = "<b>Discoveryᐩ: </b>检测失败 ❗️";
                                        resolve(res.status);
                                    }
                                });
                            }
                            else {
                                result["Discovery"] = "<b>Discoveryᐩ: </b>检测失败 ❗️";
                                resolve(response.status);
                            }
                        });
                    });
                }
                function nfTest() {
                    return new Promise((resolve, reject) => {
                        let params = {
                            url: NF_BASE_URL,
                            node: nodeName,
                            timeout: 6000,
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15"
                            }
                        };
                        $httpClient.get(params, (errormsg, response, data) => {
                            console.log("----------NetFlix--------------");
                            if (errormsg) {
                                console.log("NF request failed: " + errormsg);
                                result["Netflix"] = "<b>Netflix: </b>检测失败 ❗️";
                                resolve(errormsg);
                                return;
                            }
                            if (response.status == 403) {
                                result["Netflix"] = "<b>Netflix: </b>未支持 🚫";
                                resolve("403 Not Available");
                            }
                            else if (response.status == 404) {
                                result["Netflix"] = "<b>Netflix: </b>支持自制剧集 ⚠️";
                                resolve("404 Not Found");
                            }
                            else if (response.status == 200) {
                                console.log("NF request result:" + JSON.stringify(response.headers));
                                let ourl = response.headers["X-Originating-URL"];
                                if (ourl == undefined) {
                                    ourl = response.headers["X-Originating-Url"];
                                }
                                if (ourl == undefined) {
                                    ourl = response.headers["x-originating-url"];
                                }
                                if (ourl == undefined) {
                                    console.log("未知地区");
                                    result["Netflix"] = "<b>Netflix: </b>完整支持" + arrow + "⟦未知地区⟧ 🎉";
                                    resolve(region);
                                }
                                else {
                                    console.log("X-Originating-URL:" + ourl);
                                    let region = ourl.split("/")[3];
                                    region = region.split("-")[0];
                                    if (region == "title") {
                                        region = "us";
                                    }
                                    result["Netflix"] = "<b>Netflix: </b>完整支持" + arrow + "⟦" + flags.get(region.toUpperCase()) + "⟧ 🎉";
                                    resolve(region);
                                }
                            }
                            else {
                                result["Netflix"] = "<b>Netflix: </b>检测失败 ❗️";
                                resolve(response.status);
                            }
                        });
                    });
                }
                support_countryCodes = [
                    "T1",
                    "XX",
                    "AL",
                    "DZ",
                    "AD",
                    "AO",
                    "AG",
                    "AR",
                    "AM",
                    "AU",
                    "AT",
                    "AZ",
                    "BS",
                    "BD",
                    "BB",
                    "BE",
                    "BZ",
                    "BJ",
                    "BT",
                    "BA",
                    "BW",
                    "BR",
                    "BG",
                    "BF",
                    "CV",
                    "CA",
                    "CL",
                    "CO",
                    "KM",
                    "CR",
                    "HR",
                    "CY",
                    "DK",
                    "DJ",
                    "DM",
                    "DO",
                    "EC",
                    "SV",
                    "EE",
                    "FJ",
                    "FI",
                    "FR",
                    "GA",
                    "GM",
                    "GE",
                    "DE",
                    "GH",
                    "GR",
                    "GD",
                    "GT",
                    "GN",
                    "GW",
                    "GY",
                    "HT",
                    "HN",
                    "HU",
                    "IS",
                    "IN",
                    "ID",
                    "IQ",
                    "IE",
                    "IL",
                    "IT",
                    "JM",
                    "JP",
                    "JO",
                    "KZ",
                    "KE",
                    "KI",
                    "KW",
                    "KG",
                    "LV",
                    "LB",
                    "LS",
                    "LR",
                    "LI",
                    "LT",
                    "LU",
                    "MG",
                    "MW",
                    "MY",
                    "MV",
                    "ML",
                    "MT",
                    "MH",
                    "MR",
                    "MU",
                    "MX",
                    "MC",
                    "MN",
                    "ME",
                    "MA",
                    "MZ",
                    "MM",
                    "NA",
                    "NR",
                    "NP",
                    "NL",
                    "NZ",
                    "NI",
                    "NE",
                    "NG",
                    "MK",
                    "NO",
                    "OM",
                    "PK",
                    "PW",
                    "PA",
                    "PG",
                    "PE",
                    "PH",
                    "PL",
                    "PT",
                    "QA",
                    "RO",
                    "RW",
                    "KN",
                    "LC",
                    "VC",
                    "WS",
                    "SM",
                    "ST",
                    "SN",
                    "RS",
                    "SC",
                    "SL",
                    "SG",
                    "SK",
                    "SI",
                    "SB",
                    "ZA",
                    "ES",
                    "LK",
                    "SR",
                    "SE",
                    "CH",
                    "TH",
                    "TG",
                    "TO",
                    "TT",
                    "TN",
                    "TR",
                    "TV",
                    "UG",
                    "AE",
                    "US",
                    "UY",
                    "VU",
                    "ZM",
                    "BO",
                    "BN",
                    "CG",
                    "CZ",
                    "VA",
                    "FM",
                    "MD",
                    "PS",
                    "KR",
                    "TW",
                    "TZ",
                    "TL",
                    "GB"
                ];
                function gptTest() {
                    return new Promise((resolve, reject) => {
                        let params = {
                            url: GPT_BASE_URL,
                            node: nodeName,
                            timeout: 5000,
                            "auto-redirect": false
                        };
                        $httpClient.get(params, (errormsg, response, data) => {
                            console.log("----------GPT--------------");
                            if (errormsg) {
                                console.log("GPT request failed:!!! " + errormsg);
                                result["ChatGPT"] = "<b>ChatGPT: </b>未支持 🚫";
                                resolve("不支持 ChatGPT");
                                return;
                            }
                            let resp = JSON.stringify(response);
                            console.log("ChatGPT Main Test");
                            let jdg = resp.indexOf("text/plain");
                            if (jdg == -1) {
                                let p = {
                                    url: GPT_RegionL_URL,
                                    node: nodeName,
                                    timeout: 5000
                                };
                                $httpClient.get(p, (emsg, resheader, resData) => {
                                    console.log("----------GPT RegionL--------------");
                                    if (emsg) {
                                        console.log("GPT RegionL request error:" + errormsg);
                                        result["ChatGPT"] = "<b>ChatGPT: </b>检测失败 ❗️";
                                        resolve(emsg);
                                        return;
                                    }
                                    console.log("ChatGPT Region Test");
                                    let region = resData.split("loc=")[1].split("\n")[0];
                                    console.log("ChatGPT Region: " + region);
                                    let res = support_countryCodes.indexOf(region);
                                    if (res != -1) {
                                        result["ChatGPT"] = "<b>ChatGPT: </b>支持 " + arrow + "⟦" + flags.get(region.toUpperCase()) + "⟧ 🎉";
                                        console.log("支持 ChatGPT");
                                        resolve(region);
                                    }
                                    else {
                                        result["ChatGPT"] = "<b>ChatGPT: </b>未支持 🚫";
                                        console.log("不支持 ChatGPT");
                                        resolve("不支持 ChatGPT");
                                    }
                                });
                            }
                            else {
                                result["ChatGPT"] = "<b>ChatGPT: </b>未支持 🚫";
                                console.log("不支持 ChatGPT");
                                resolve("不支持 ChatGPT");
                            }
                        });
                    });
                }
                function googleToCN() {
                    return new Promise((resolve, reject) => {
                        let params = {
                            url: Google_BASE_URL,
                            node: nodeName,
                            timeout: 3000,
                            headers: {
                                "Accept-Encoding": `gzip, deflate, br`,
                                Connection: `keep-alive`,
                                Accept: `text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`,
                                Host: `www.google.com`,
                                "User-Agent": `Mozilla/5.0 (iPhone; CPU iPhone OS 15_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1`,
                                "Accept-Language": `zh-CN,zh-Hans;q=0.9`
                            }
                        };
                        $httpClient.get(params, (errormsg, response, data) => {
                            console.log("----------Google2CN--------------");
                            if (errormsg) {
                                console.log("Google2CN request failed:" + errormsg);
                                result["Google2CN"] = "<b>2CN: </b>检测失败 ❗️";
                                resolve(errormsg);
                                return;
                            }
                            if (response.status == 400) {
                                result["Google2CN"] = "<b>2CN: </b>已被送中";
                                resolve("404 Not Found");
                            }
                            else {
                                result["Google2CN"] = "<b>2CN: </b>未被送中";
                                resolve(response.status);
                            }
                        });
                    });
                }
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$environment") ? __wayxScope["$environment"] : (typeof $environment === 'undefined' ? undefined : $environment), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done), Object.prototype.hasOwnProperty.call(__wayxScope, "$httpClient") ? __wayxScope["$httpClient"] : (typeof $httpClient === 'undefined' ? undefined : $httpClient));
    });
})();
