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
        })((undefined), { TextDecoder: typeof TextDecoder === 'undefined' ? undefined : TextDecoder }), http: typeof $httpClient === 'undefined' ? undefined : $httpClient, task: typeof $task === 'undefined' ? undefined : $task, store: typeof $persistentStore === 'undefined' ? undefined : $persistentStore, notify: typeof $notification === 'undefined' ? undefined : $notification, environment: typeof $environment === 'undefined' ? undefined : $environment, global: globalThis, url: undefined, argument: typeof $argument === 'undefined' ? undefined : $argument };
    if ((__wayxHost.response === undefined ? 'request' : 'response') !== "response")
        throw new Error('Unregistered HTTP source/target declaration');
    const __wayxConfig = { "apiPlan": { "source": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": "open-url", "media": "media-url", "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" }, "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" }, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"] } };
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
        function taskFetch(input) {
            return new Promise((resolve, reject) => {
                let plan;
                try {
                    plan = transport(input, 'promise');
                }
                catch (error) {
                    reject(error);
                    return;
                }
                const normalize = (native, data) => {
                    if (!native)
                        return reject({ error: 'HTTP transport returned no response' });
                    const out = { statusCode: status(native["status"]), headers: headers(native.headers || {}) };
                    if (binary(data)) {
                        out.bodyBytes = buffer(data);
                        {
                            const type = out.headers['content-type'] || '', match = typeof type === 'string' && /charset\s*=\s*["']?([^;\s"']+)/i.exec(type);
                            const encoding = match ? match[1] : 'utf-8', Decoder = host.codecs.TextDecoder;
                            try {
                                out.body = new Decoder(encoding).decode(bytes(data));
                            }
                            catch (cause) {
                                const error = new Error('HTTP response charset unavailable: ' + encoding);
                                error.code = 'UNSUPPORTED_RESPONSE_CHARSET';
                                error.encoding = encoding;
                                error.cause = cause;
                                throw error;
                            }
                        }
                    }
                    else
                        out.body = data;
                    resolve(out);
                };
                {
                    const fn = host.http && host.http[plan.verb];
                    if (typeof fn !== 'function') {
                        reject(new TypeError('Native HTTP method unavailable'));
                        return;
                    }
                    try {
                        fn.call(host.http, plan.req, (error, r, data) => {
                            if (error) {
                                reject({ error });
                                return;
                            }
                            try {
                                normalize(r, data);
                            }
                            catch (e) {
                                reject(e);
                            }
                        });
                    }
                    catch (error) {
                        reject(error);
                    }
                }
            });
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
        const nativeStore = host.store;
        const storageKey = key => {
            if (key === undefined) {
                const name = "missav.ads.js";
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
        store.remove = () => { ; ; return; };
        const prefKey = key => typeof key === 'string' ? key : fail('QX storage requires an explicit String key');
        const prefs = { valueForKey: key => store.read(prefKey(key)), setValueForKey: (value, key) => {
                key = prefKey(key);
                if (typeof value !== 'string')
                    return fail('QX storage value must be String');
                return store.write(value, key);
            }, removeValueForKey: key => nativeStore["write"](null, prefKey(key)) };
        prefs.removeAllValues = () => undefined;
        ;
        function notify(title = '', subtitle = '', body = '', option, delay) {
            ;
            const raw = typeof option === 'object' && option !== null ? option : {}, mapped = {};
            const open = typeof option === 'string' && false ? option : raw["open-url"];
            const copy = raw['update-pasteboard'];
            if (typeof open === 'string') {
                {
                    mapped.action = 'open-url';
                    mapped.url = open;
                }
            }
            if (typeof copy === 'string') {
                {
                    delete mapped.url;
                    mapped.action = 'clipboard';
                    mapped.text = copy;
                }
            }
            const media = raw["media-url"];
            if (typeof media === 'string') {
                if (/^https?:\/\//i.test(media))
                    mapped["media-url"] = media;
                else {
                    const uri = /^data:(image\/(?:png|jpeg|gif|webp));base64,([\s\S]*)$/i.exec(media);
                    let data = uri ? uri[2] : media, decoded;
                    try {
                        decoded = host.codecs.atob(data);
                    }
                    catch { }
                    if (decoded) {
                        let mime = decoded.startsWith('\x89PNG\r\n\x1a\n') ? 'image/png' : decoded.startsWith('\xff\xd8\xff') ? 'image/jpeg' : /^GIF8[79]a/.test(decoded) ? 'image/gif' : decoded.startsWith('RIFF') && decoded.slice(8, 12) === 'WEBP' ? 'image/webp' : undefined;
                        if (mime && (!uri || uri[1].toLowerCase() === mime)) {
                            mapped['media-base64'] = host.codecs.btoa(decoded);
                            mapped['media-base64-mime'] = mime;
                        }
                    }
                }
            }
            const post = host.notify.post.bind(host.notify);
            return Object.keys(mapped).length ? post(title, subtitle, body, mapped) : post(title, subtitle, body);
        }
        let argument = undefined;
        ;
        const script = undefined;
        if (script && script.startTime !== undefined) {
            const t = script.startTime;
            script.startTime = t instanceof Date ? t : new Date(t * 1000);
        }
        const environment = Object.assign({}, host.environment);
        const overlay = {
            $request: request, $response: response, $done: done, $script: script,
            $task: { fetch: taskFetch }, $httpClient: http,
            $prefs: prefs, $persistentStore: store,
            $notify: notify, $notification: { post: notify },
            $argument: argument, $environment: environment, $loon: undefined
        };
        ;
        overlay.TextDecoder = host.codecs.TextDecoder;
        let standards;
        for (const name of ['URL', 'URLSearchParams']) {
            const set = value => Object.defineProperty(overlay, name, { value, writable: true, enumerable: true, configurable: true });
            Object.defineProperty(overlay, name, { enumerable: true, configurable: true, get() {
                    if (!standards)
                        standards = typeof host.global.URL === 'function' && typeof host.global.URLSearchParams === 'function' ? { URL: host.global.URL, URLSearchParams: host.global.URLSearchParams } : host.url(host.codecs);
                    const value = standards[name];
                    set(value);
                    return value;
                }, set });
        }
        for (const name of ['TextEncoder', 'atob', 'btoa'])
            if (typeof host.global[name] === 'undefined')
                overlay[name] = host.codecs[name];
        const scope = new Proxy(overlay, { has: (t, key) => own(t, key), get: (t, key) => key === Symbol.unscopables ? undefined : Reflect.get(t, key), set: (t, key, value) => Reflect.set(t, key, value) });
        const global = new Proxy(host.global, { get: (t, key) => own(overlay, key) ? overlay[key] : Reflect.get(t, key), set: (t, key, value) => own(overlay, key) ? Reflect.set(overlay, key, value) : Reflect.set(t, key, value), has: (t, key) => own(overlay, key) || Reflect.has(t, key) });
        overlay.globalThis = global;
        overlay.window = global;
        overlay.global = global;
        return run.call(global, scope);
    })(__wayxConfig, __wayxHost, function (__wayxScope) {
        with (__wayxScope) {
            return (function () {
                (function (_0x4c0ff1, _0xe7bd1c) { const _0x4558ab = _0x4c0ff1(); function _0xa3871e(_0x154067, _0x8e0fd, _0x2dc8ad, _0x1d1b9e) { return _0x25c9(_0x8e0fd - 0x30c, _0x2dc8ad); } function _0x43fe09(_0x473e65, _0x1cfbda, _0x39428c, _0x107de4) { return _0x25c9(_0x107de4 - -0x3a2, _0x473e65); } while (!![]) {
                    try {
                        const _0x166275 = -parseInt(_0xa3871e(0x472, 0x48e, 0x47b, 0x45a)) / (0x15c5 + 0x1 * -0xb3 + -0x1511) + -parseInt(_0x43fe09(-0x28b, -0x26a, -0x248, -0x272)) / (-0x17cf + -0x1b36 + 0x3307) * (parseInt(_0xa3871e(0x43d, 0x472, 0x43d, 0x478)) / (-0x3 * 0x1f + 0x8e6 * -0x3 + 0x2 * 0xd89)) + -parseInt(_0x43fe09(-0x25b, -0x293, -0x254, -0x26e)) / (0x1b * 0xf0 + 0x20bc + -0x3a08) + -parseInt(_0x43fe09(-0x26d, -0x284, -0x28d, -0x25e)) / (0x1 * -0x987 + 0x1b * 0x5 + 0x905) * (-parseInt(_0x43fe09(-0x282, -0x232, -0x26d, -0x260)) / (-0x1f4a + 0xaf6 * 0x2 + 0x4b2 * 0x2)) + -parseInt(_0x43fe09(-0x28c, -0x284, -0x24a, -0x26a)) / (0xf43 + 0x12d * 0x6 + -0x27a * 0x9) + parseInt(_0xa3871e(0x46f, 0x48f, 0x460, 0x492)) / (0x3 * 0x733 + 0x1212 + 0x49 * -0x8b) + -parseInt(_0x43fe09(-0x28e, -0x247, -0x266, -0x265)) / (0x12eb + 0x9d9 * 0x1 + -0x1cbb) * (parseInt(_0x43fe09(-0x224, -0x252, -0x256, -0x23b)) / (0x66b + 0x89f * -0x2 + 0xadd));
                        if (_0x166275 === _0xe7bd1c)
                            break;
                        else
                            _0x4558ab['push'](_0x4558ab['shift']());
                    }
                    catch (_0x229611) {
                        _0x4558ab['push'](_0x4558ab['shift']());
                    }
                } }(_0x526f, -0x5f8 + 0x15 * 0x1ac4 + 0x179ee));
                const _0x4bce92 = (function () { const _0x51e648 = {}; _0x51e648['pzGuG'] = function (_0x5a9a4a, _0x3d9466) { return _0x5a9a4a === _0x3d9466; }, _0x51e648[_0x52bb5c(-0x14, 0x19, 0x2, -0x28)] = 'nVvtp'; function _0xd16db(_0x452f12, _0x18d285, _0x4e4276, _0x6cafe7) { return _0x25c9(_0x18d285 - 0x10, _0x4e4276); } function _0x52bb5c(_0x529b5c, _0x3cb770, _0x2f2756, _0x3f6230) { return _0x25c9(_0x529b5c - -0x176, _0x3cb770); } _0x51e648[_0xd16db(0x16e, 0x173, 0x16a, 0x18f)] = function (_0x17f9c6, _0x481279) { return _0x17f9c6 !== _0x481279; }, _0x51e648['KFbao'] = _0x52bb5c(0x1c, 0x3f, 0x0, 0x11); const _0x5d0fb0 = _0x51e648; let _0x54d46b = !![]; return function (_0x544146, _0x4b18bb) { function _0x1e6b5a(_0x3c387e, _0x18d000, _0x6f4d04, _0x31c5f3) { return _0xd16db(_0x3c387e - 0x13, _0x6f4d04 - 0x1fc, _0x31c5f3, _0x31c5f3 - 0x8b); } function _0x2d7fd6(_0x33c920, _0x154d0a, _0x1f41ce, _0x432980) { return _0xd16db(_0x33c920 - 0xe, _0x1f41ce - 0x396, _0x154d0a, _0x432980 - 0x44); } const _0x31f938 = { 'eHYBH': function (_0x18eedd, _0x29d0d8) { function _0x5c61a0(_0x2490d1, _0x2f2939, _0x2ed329, _0x3e950a) { return _0x25c9(_0x3e950a - 0x94, _0x2f2939); } return _0x5d0fb0[_0x5c61a0(0x1db, 0x232, 0x239, 0x211)](_0x18eedd, _0x29d0d8); }, 'MVBGc': _0x2d7fd6(0x4e8, 0x4fe, 0x4fb, 0x523), 'qtCaO': _0x5d0fb0[_0x2d7fd6(0x4d8, 0x533, 0x508, 0x505)] }; if (_0x5d0fb0[_0x1e6b5a(0x367, 0x37f, 0x36f, 0x36c)](_0x5d0fb0[_0x1e6b5a(0x32e, 0x339, 0x35b, 0x32b)], _0x2d7fd6(0x4ba, 0x4e5, 0x4f0, 0x51e))) {
                    const _0x3e8840 = _0x54d46b ? function () { function _0x365925(_0x5f4402, _0x5b57ef, _0x166c3b, _0x372b4d) { return _0x1e6b5a(_0x5f4402 - 0x163, _0x5b57ef - 0x18b, _0x5f4402 - -0xbe, _0x166c3b); } function _0xe0915c(_0x28111f, _0x3263d1, _0x5bcbc6, _0x548dae) { return _0x2d7fd6(_0x28111f - 0x167, _0x548dae, _0x5bcbc6 - -0x59, _0x548dae - 0x3e); } if (_0x31f938[_0x365925(0x2ba, 0x2ea, 0x2b1, 0x2dd)](_0x31f938[_0x365925(0x2c6, 0x2bb, 0x2ce, 0x2ba)], _0x31f938['qtCaO'])) {
                        if (_0x1e59dc) {
                            const _0x5e4265 = _0x25fa51['apply'](_0x39b7dc, arguments);
                            return _0x56ddb9 = null, _0x5e4265;
                        }
                    }
                    else {
                        if (_0x4b18bb) {
                            const _0x4db407 = _0x4b18bb['apply'](_0x544146, arguments);
                            return _0x4b18bb = null, _0x4db407;
                        }
                    } } : function () { };
                    return _0x54d46b = ![], _0x3e8840;
                }
                else {
                    const _0x56f24b = _0x17a2ef ? function () { function _0x5493ea(_0x4b00e6, _0x5d4873, _0x218a5c, _0x5bc1b8) { return _0x1e6b5a(_0x4b00e6 - 0x122, _0x5d4873 - 0x1be, _0x4b00e6 - -0x113, _0x5d4873); } if (_0x5db60b) {
                        const _0xe00447 = _0x142a55[_0x5493ea(0x281, 0x266, 0x277, 0x24c)](_0x51921a, arguments);
                        return _0x1a24c9 = null, _0xe00447;
                    } } : function () { };
                    return _0x10ef6e = ![], _0x56f24b;
                } }; }()), _0x26764f = _0x4bce92(this, function () { function _0xdc929a(_0x39f243, _0x3917dc, _0x17105c, _0x1205c4) { return _0x25c9(_0x1205c4 - 0x381, _0x39f243); } function _0x2c82e0(_0x5a0487, _0x212468, _0x1dd656, _0x2e7942) { return _0x25c9(_0x5a0487 - 0x357, _0x2e7942); } const _0x3db766 = {}; _0x3db766[_0xdc929a(0x4ff, 0x4f2, 0x4b2, 0x4dc)] = _0x2c82e0(0x493, 0x499, 0x49b, 0x4c1) + '+$'; const _0x487a65 = _0x3db766; return _0x26764f[_0x2c82e0(0x4cb, 0x4a5, 0x4d4, 0x4e4)]()[_0xdc929a(0x48d, 0x4c5, 0x4e3, 0x4b4)](_0x487a65['PwVkZ'])[_0xdc929a(0x51a, 0x4ea, 0x4e3, 0x4f5)]()[_0xdc929a(0x47f, 0x4a4, 0x4d5, 0x4ac) + 'r'](_0x26764f)['search'](_0x487a65[_0x2c82e0(0x4b2, 0x488, 0x4d4, 0x4cd)]); });
                _0x26764f();
                const _0x3280a4 = (function () { function _0x7d82ee(_0x59ffab, _0x14ff45, _0x4afeba, _0x2252b7) { return _0x25c9(_0x59ffab - -0x2f1, _0x2252b7); } function _0xffe45(_0x32e30b, _0x1a4ada, _0x39e571, _0x959d00) { return _0x25c9(_0x959d00 - 0x71, _0x1a4ada); } const _0x213daa = { 'EkHAm': function (_0x3e0d1e, _0x5b6b42) { return _0x3e0d1e(_0x5b6b42); }, 'YQsPb': function (_0xfefe69, _0xf315be) { return _0xfefe69 + _0xf315be; }, 'oVpCc': 'return\x20(fu' + _0x7d82ee(-0x189, -0x19f, -0x188, -0x15a), 'EBJEQ': _0xffe45(0x207, 0x208, 0x1fd, 0x1e1) + _0x7d82ee(-0x18d, -0x172, -0x15a, -0x168) + _0xffe45(0x184, 0x171, 0x19c, 0x19e) + '\x20)', 'JSdPn': function (_0xaae9e) { return _0xaae9e(); }, 'jQaMm': _0x7d82ee(-0x16b, -0x193, -0x175, -0x184), 'senxH': _0xffe45(0x1f6, 0x1eb, 0x1f5, 0x1e4), 'VEkXL': _0x7d82ee(-0x195, -0x1bf, -0x183, -0x16c), 'ZXWBJ': function (_0x2a3428, _0x3a38ba) { return _0x2a3428 < _0x3a38ba; }, 'pQGTV': function (_0x386da7, _0xb17b37) { return _0x386da7 + _0xb17b37; }, 'vuCZC': function (_0x5d4776, _0x5a55e5) { return _0x5d4776 === _0x5a55e5; }, 'hGUPt': _0xffe45(0x1fe, 0x1f4, 0x20d, 0x1f1), 'lXyuV': 'HpIlm', 'KUlOT': _0x7d82ee(-0x188, -0x1bd, -0x156, -0x16d) }; let _0x1774ad = !![]; return function (_0x495e37, _0x2e2059) { function _0x3f2419(_0xa298b5, _0x53c13a, _0x478614, _0x1056b7) { return _0xffe45(_0xa298b5 - 0x4f, _0x1056b7, _0x478614 - 0x1cb, _0x478614 - -0x3c2); } function _0x200099(_0x4e1c50, _0x5429ab, _0x179b60, _0x27bfac) { return _0x7d82ee(_0x4e1c50 - 0x356, _0x5429ab - 0x8d, _0x179b60 - 0x139, _0x5429ab); } if (_0x213daa[_0x200099(0x1c3, 0x1c9, 0x1f2, 0x1c8)] !== _0x213daa[_0x200099(0x1c3, 0x1c0, 0x1a4, 0x1ec)]) {
                    let _0x481af9;
                    try {
                        const _0x456603 = _0x213daa[_0x3f2419(-0x208, -0x1cd, -0x1f2, -0x215)](_0x176e0d, _0x213daa[_0x200099(0x1bf, 0x1df, 0x1b9, 0x1f3)](_0x213daa[_0x200099(0x1d2, 0x1fa, 0x202, 0x1b0)], _0x213daa[_0x200099(0x1a3, 0x1ad, 0x1a2, 0x1c9)]) + ');');
                        _0x481af9 = _0x213daa[_0x3f2419(-0x1b3, -0x1bc, -0x1e3, -0x20a)](_0x456603);
                    }
                    catch (_0x5f1763) {
                        _0x481af9 = _0x543cf4;
                    }
                    const _0xb4b032 = _0x481af9[_0x200099(0x1ea, 0x1f5, 0x1df, 0x1cb)] = _0x481af9['console'] || {}, _0x32cb0f = ['log', _0x213daa['jQaMm'], _0x213daa[_0x200099(0x1f0, 0x1d8, 0x1be, 0x209)], _0x213daa[_0x3f2419(-0x1eb, -0x1ec, -0x21a, -0x1e5)], _0x200099(0x1bd, 0x1d8, 0x1d9, 0x1a6), _0x200099(0x1d6, 0x1c2, 0x1eb, 0x1f5), _0x3f2419(-0x22f, -0x21b, -0x20c, -0x213)];
                    for (let _0x4cda8c = -0x20c + 0x1 * -0x1ad + 0x3b9; _0x213daa[_0x3f2419(-0x1ef, -0x226, -0x200, -0x1cd)](_0x4cda8c, _0x32cb0f[_0x200099(0x1be, 0x1bd, 0x1e9, 0x1d5)]); _0x4cda8c++) {
                        const _0x146893 = _0x3b8ad4[_0x3f2419(-0x222, -0x21f, -0x226, -0x248) + 'r']['prototype'][_0x3f2419(-0x1a9, -0x1c9, -0x1d6, -0x1db)](_0x5afc0e), _0x3a8771 = _0x32cb0f[_0x4cda8c], _0x27e6a8 = _0xb4b032[_0x3a8771] || _0x146893;
                        _0x146893[_0x3f2419(-0x1fd, -0x1be, -0x1f0, -0x1e9)] = _0x3cd796['bind'](_0x2a0849), _0x146893[_0x200099(0x1d9, 0x1c7, 0x1d9, 0x1e5)] = _0x27e6a8['toString'][_0x3f2419(-0x1ef, -0x1c5, -0x1d6, -0x1ef)](_0x27e6a8), _0xb4b032[_0x3a8771] = _0x146893;
                    }
                }
                else {
                    const _0x58efc0 = _0x1774ad ? function () { function _0x2eda01(_0x28e7cb, _0x2427e9, _0xdcb25e, _0x57f95d) { return _0x200099(_0x28e7cb - -0x1ea, _0x2427e9, _0xdcb25e - 0x19a, _0x57f95d - 0xad); } function _0x2884e0(_0x4690f4, _0x3b27b2, _0x340b68, _0x4b2c1e) { return _0x200099(_0x4690f4 - 0xc4, _0x340b68, _0x340b68 - 0x1e, _0x4b2c1e - 0x131); } const _0x26303b = { 'YygpW': function (_0x445974, _0x530dcc) { function _0x1d25e5(_0x5a1f11, _0x5242e4, _0x56dc30, _0x58dfb2) { return _0x25c9(_0x58dfb2 - -0x3d6, _0x56dc30); } return _0x213daa[_0x1d25e5(-0x258, -0x287, -0x2ac, -0x277)](_0x445974, _0x530dcc); }, 'VEPuY': function (_0x4d7661, _0x9fc88b) { function _0x5a3e20(_0x25babc, _0x3acd95, _0x1f1d4f, _0x31f5d2) { return _0x25c9(_0x31f5d2 - -0x179, _0x25babc); } return _0x213daa[_0x5a3e20(-0x3a, -0x4e, -0x11, -0x33)](_0x4d7661, _0x9fc88b); }, 'yVVxq': function (_0x11bfbd) { return _0x213daa['JSdPn'](_0x11bfbd); } }; if (_0x213daa[_0x2884e0(0x2b2, 0x297, 0x2d6, 0x2a7)](_0x213daa[_0x2eda01(-0x31, -0x52, 0x2, -0x67)], _0x213daa['lXyuV'])) {
                        const _0x40faf2 = _0x26303b[_0x2eda01(-0x46, -0x27, -0x1f, -0x58)](_0x2766da, _0x26303b[_0x2884e0(0x294, 0x2b4, 0x283, 0x29d)](_0x26303b['VEPuY'](_0x2884e0(0x2a3, 0x2c6, 0x28c, 0x28b) + _0x2884e0(0x291, 0x2c3, 0x26f, 0x2c6), _0x2eda01(-0x15, 0xf, -0x2b, 0xb) + _0x2884e0(0x28d, 0x27c, 0x286, 0x2c3) + _0x2884e0(0x256, 0x237, 0x246, 0x239) + '\x20)'), ');'));
                        _0x4c5601 = _0x26303b['yVVxq'](_0x40faf2);
                    }
                    else {
                        if (_0x2e2059) {
                            const _0x36f2c3 = _0x2e2059[_0x2eda01(0x3, -0x1d, -0x22, 0x28)](_0x495e37, arguments);
                            return _0x2e2059 = null, _0x36f2c3;
                        }
                    } } : function () { };
                    return _0x1774ad = ![], _0x58efc0;
                } }; }()), _0x540298 = _0x3280a4(this, function () { const _0x57a0cd = { 'mhSNg': function (_0x3520f1, _0x161c23) { return _0x3520f1(_0x161c23); }, 'lZFMW': function (_0x3092fb, _0x4b4903) { return _0x3092fb + _0x4b4903; }, 'jvEED': _0x15bf11(0x13f, 0x134, 0x121, 0x13c) + _0x15bf11(0x13d, 0xfa, 0x111, 0x130) + _0x15bf11(0xeb, 0xd2, 0x119, 0xf9) + '\x20)', 'JEzxM': 'log', 'zhwgI': _0x27c627(0x42e, 0x447, 0x40f, 0x413), 'mdDfS': _0x15bf11(0xdc, 0x122, 0x122, 0x111), 'xtLtC': function (_0x562541, _0x41487a) { return _0x562541 < _0x41487a; } }; function _0x15bf11(_0x1896ef, _0xbb9d26, _0xf859ac, _0x48a669) { return _0x25c9(_0x48a669 - -0x34, _0xf859ac); } let _0x4f251e; try {
                    const _0x102fa4 = _0x57a0cd[_0x15bf11(0x124, 0x167, 0x123, 0x131)](Function, _0x57a0cd['lZFMW'](_0x27c627(0x46b, 0x449, 0x461, 0x435) + _0x27c627(0x422, 0x41b, 0x430, 0x423) + _0x57a0cd[_0x27c627(0x455, 0x424, 0x453, 0x437)], ');'));
                    _0x4f251e = _0x102fa4();
                }
                catch (_0xaa8c5) {
                    _0x4f251e = window;
                } const _0x1db7aa = _0x4f251e[_0x27c627(0x44a, 0x462, 0x46d, 0x440)] = _0x4f251e[_0x27c627(0x451, 0x42a, 0x411, 0x440)] || {}, _0x46a431 = [_0x57a0cd[_0x27c627(0x3f6, 0x3ce, 0x42e, 0x404)], _0x27c627(0x467, 0x45d, 0x45f, 0x441), _0x15bf11(0x16d, 0x13a, 0x134, 0x13f), _0x15bf11(0x15a, 0xf2, 0x110, 0x128), _0x57a0cd[_0x15bf11(0x128, 0xf5, 0xc9, 0xfa)], _0x15bf11(0x147, 0x12f, 0x150, 0x13d), _0x57a0cd[_0x15bf11(0x16f, 0x12b, 0x139, 0x15b)]]; function _0x27c627(_0x55e13d, _0x1255ce, _0x2588ec, _0x2325bf) { return _0x25c9(_0x2325bf - 0x2bb, _0x55e13d); } for (let _0x6c70e2 = -0x304 * 0xc + -0x4 * -0x71f + -0x3da * -0x2; _0x57a0cd[_0x27c627(0x421, 0x42b, 0x46e, 0x448)](_0x6c70e2, _0x46a431['length']); _0x6c70e2++) {
                    const _0x269342 = _0x3280a4[_0x15bf11(0xcc, 0x116, 0xdb, 0xf7) + 'r']['prototype']['bind'](_0x3280a4), _0x24f074 = _0x46a431[_0x6c70e2], _0x3536c1 = _0x1db7aa[_0x24f074] || _0x269342;
                    _0x269342[_0x15bf11(0xff, 0x147, 0x150, 0x12d)] = _0x3280a4['bind'](_0x3280a4), _0x269342['toString'] = _0x3536c1[_0x27c627(0x460, 0x427, 0x402, 0x42f)][_0x15bf11(0x117, 0x165, 0x17b, 0x147)](_0x3536c1), _0x1db7aa[_0x24f074] = _0x269342;
                } });
                function _0x526f() { const _0x3ce5fd = ['zhrOoIaZmdbWEa', 'x19WCM90B19F', 'tLrMr1m', 'wxfLzxu', 'y3rVCIGICMv0Dq', 'BwHttMC', 'ndvPBhLsz3O', 'mtbMtePiuey', 'BMn0Aw9UkcKG', 'C25iBLO', 'lM1SltqUBgLZDa', 'vKvqDvK', 'zuHzqKG', 'B1zWq2m', 'sLnKug4', 'mJuWChG7iL0GEW', 'E30Uy29UC3rYDq', 'DgfIBgu', 'AxyUC3bHy2uTEq', 'Aw5MBW', 'Dg9tDhjPBMC', 'icaGignVBNnVBa', 'zgv4oIaXmdaXjW', 'w2HYzwyQpsCVDG', 'tvzcr2m', 'AxyUDw5KzxjFCa', 'CMv0DxjUicHMDq', 'yMLUza', 'ANzfruq', 'ChPhDuC', 'zs15ltiUBwiTna', 'zxiTzxzLBNrZoG', 'rhrlv2q', 'Aw1WB3j0yw50oW', 'mJmYntuYELHXzMXU', 'mZm1ntG0ofLmD25yCa', 'cJXZDhLSzt4kyq', 'y29UC29Szq', 'D2fYBG', 'CMzSB3CTEdOGAa', 'yxbWBhK', 'DNvdwKm', 'w3n0EwXLpsj3Aq', 'C2vUEeG', 'zs5SB2COj0jSBW', 'EhrmDem', 'C3qGCMf3t3bLBG', 'BwrezLm', 'B3jUzhvKzs5JBW', 'id0GD2LUzg93lG', 'C1zzCvO', 'y2TLzcb3Aw5KBW', 'BdSkicaGih07cG', 'B3j0yw50oYb9cG', 'AxqUBhKNxsWkyq', 'cJXZy3jPChq+cG', 'B3j0yw50oWP9cG', 'y29UC3rYDwn0BW', 'xvTOCMvMkJ0NyG', 'CM4GDgHPCYiPka', 'EMH3z0K', 'BIa9igz1BMn0Aq', 'odKYt2Dsrffz', 'FsKOktSkpc9ZyW', 'AwrKzw4GiwLTCa', 'C2vHCMnO', 'otaWndK2wK1HzNLg', 'B24OkxSkicaGia', 'zIO9j215yxzSAq', 'vKvRweW', 'mJq2ote4s2Dpu25c', 'DhbZoI8VDgHLCa', 'CMvWBgfJzq', 'j10ScMrPDLTZDa', 'kcGOlISPkYKRkq', 'mJm4mty3s2vgBePY', 'rujkrve', 'wxLNCfC', 'EsDDlaPHw3rHCG', 'lwrPC2mUDgv4Da', 'otaXotjNCw9MuMq', 'yM9KEq', 'mte1wvHRtwfX', 'DhjHy2u', 'Cffhvfy', 'z2v0pv9IBgfUAW', 'w2HYzwzEpsDODa', 'sKv6Ee0', 'DMzACNa', 'yYDDlaPHw2HYzq', 'B3bLBJSkicaGia', 'oYbOzwLNAhq6ia', 'cIaGicbKAxnWBa', 's0zIyw8', 'DMuNxsWkyvTOCG', 'wLHxqKO', 'zwyQpsDIAxqUBa', 'pc9OzwfKpG', 'AeDvuhq', 'AuLVtgS', 'pc9ZDhLSzt4k', 'yxK6ig5VBMuGiq', 'zxHJzxb0Aw9U', 'BgvUz3rO', 'wvfZugi', 'uhDwA1O', 'zxjYB3i', 'xsWkDwWUC3bHyW', 's1vSt1q', 'rwTiqw0']; _0x526f = function () { return _0x3ce5fd; }; return _0x526f(); }
                _0x540298();
                var url = $request['url'];
                let body = $response['body'];
                const injectJS = _0x4c8caf(-0x266, -0x266, -0x278, -0x248) + '(function(' + '){\x0a\x20\x20\x20\x20con' + _0x552577(0x14a, 0x111, 0x152, 0x147) + _0x4c8caf(-0x1fe, -0x1dd, -0x1e9, -0x1d6) + _0x4c8caf(-0x243, -0x264, -0x247, -0x266) + 'window.ope' + _0x4c8caf(-0x260, -0x23f, -0x23c, -0x274) + _0x552577(0x108, 0xba, 0x121, 0xee) + _0x4c8caf(-0x21a, -0x230, -0x248, -0x1fc) + _0x552577(0x141, 0x12b, 0x169, 0x145) + _0x552577(0x126, 0x16a, 0x156, 0x14c) + 'w.open:\x27,\x20' + 'arguments)' + ';\x0a\x20\x20\x20\x20\x20\x20\x20\x20' + 'return\x20nul' + _0x552577(0xc4, 0xdd, 0x108, 0xdf) + _0x552577(0xfa, 0x117, 0xdf, 0xea) + 'ript>\x0a';
                function _0x552577(_0x3a65da, _0x5a4886, _0x36d600, _0x58b7b1) { return _0x25c9(_0x58b7b1 - -0x47, _0x5a4886); }
                function _0x25c9(_0x4f421d, _0x30d38b) { _0x4f421d = _0x4f421d - (-0x1d7 + 0x1 * -0xae5 + 0xde2); const _0x11d1eb = _0x526f(); let _0x417c25 = _0x11d1eb[_0x4f421d]; if (_0x25c9['vFfjDt'] === undefined) {
                    var _0x12ef95 = function (_0xf3d0c5) { const _0x402ba6 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; let _0x1b222a = '', _0x43e19b = '', _0x137b79 = _0x1b222a + _0x12ef95; for (let _0x18448f = 0x28 * 0x5 + -0x78f + -0x6c7 * -0x1, _0x57ba97, _0x281e64, _0x245d7a = 0x13d * 0x1c + 0x7e5 + -0x11 * 0x281; _0x281e64 = _0xf3d0c5['charAt'](_0x245d7a++); ~_0x281e64 && (_0x57ba97 = _0x18448f % (-0x48 * -0x41 + -0x4 * -0x121 + -0x16c8) ? _0x57ba97 * (-0x1 * -0x592 + -0x1932 + -0x6a * -0x30) + _0x281e64 : _0x281e64, _0x18448f++ % (-0x22e5 + -0x11a7 + 0x3490)) ? _0x1b222a += _0x137b79['charCodeAt'](_0x245d7a + (0x1387 * -0x1 + 0x1af5 + -0x764 * 0x1)) - (0x1 * 0x249a + -0x1d6a + -0x726) !== 0x14 * -0x1c9 + -0x17 * 0x199 + 0x4873 ? String['fromCharCode'](-0x25c7 * 0x1 + -0x1 * -0x211b + 0x1 * 0x5ab & _0x57ba97 >> (-(0x3 * 0xb59 + -0x1 * 0xbd9 + -0x163 * 0x10) * _0x18448f & -0x1 * -0xa43 + 0x1aa + 0xb * -0x115)) : _0x18448f : -0x2557 * -0x1 + 0x1a2e + -0x3f85) {
                        _0x281e64 = _0x402ba6['indexOf'](_0x281e64);
                    } for (let _0x1d153e = 0x11c7 + 0x228b * 0x1 + -0x3452, _0x56eb0f = _0x1b222a['length']; _0x1d153e < _0x56eb0f; _0x1d153e++) {
                        _0x43e19b += '%' + ('00' + _0x1b222a['charCodeAt'](_0x1d153e)['toString'](-0xa46 * -0x2 + -0x46 * -0x36 + 0x10 * -0x234))['slice'](-(0x3 * 0x2de + 0x1925 + 0x3 * -0xb3f));
                    } return decodeURIComponent(_0x43e19b); };
                    _0x25c9['qtHqlm'] = _0x12ef95, _0x25c9['DsMced'] = {}, _0x25c9['vFfjDt'] = !![];
                } const _0x323d32 = _0x11d1eb[-0x1273 + 0x1007 + 0x26c], _0x4b502d = _0x4f421d + _0x323d32, _0x20a25e = _0x25c9['DsMced'][_0x4b502d]; if (!_0x20a25e) {
                    const _0x2027bd = function (_0x115942) { this['LynCix'] = _0x115942, this['oFyCAN'] = [0x17de + -0x2 * -0xef9 + -0x35cf, -0x1 * -0x9b6 + 0x2379 + -0x2b * 0x10d, -0x304 + 0x31d * -0x9 + 0x1f09], this['PgxgNL'] = function () { return 'newState'; }, this['yaIWVV'] = '\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*', this['DmggrN'] = '[\x27|\x22].+[\x27|\x22];?\x20*}'; };
                    _0x2027bd['prototype']['nCRZap'] = function () { const _0x1df08a = new RegExp(this['yaIWVV'] + this['DmggrN']), _0x15cc7a = _0x1df08a['test'](this['PgxgNL']['toString']()) ? --this['oFyCAN'][-0x1d2a + -0x7d3 * 0x2 + 0x413 * 0xb] : --this['oFyCAN'][0x1d4 + -0x1e91 + 0x1cbd]; return this['ogrNkw'](_0x15cc7a); }, _0x2027bd['prototype']['ogrNkw'] = function (_0x2181cd) { if (!Boolean(~_0x2181cd))
                        return _0x2181cd; return this['ZvYFCM'](this['LynCix']); }, _0x2027bd['prototype']['ZvYFCM'] = function (_0x57ebfe) { for (let _0x5cc4b7 = -0x43 * -0x2c + -0x68 * 0x10 + -0x504, _0x1e0c75 = this['oFyCAN']['length']; _0x5cc4b7 < _0x1e0c75; _0x5cc4b7++) {
                        this['oFyCAN']['push'](Math['round'](Math['random']())), _0x1e0c75 = this['oFyCAN']['length'];
                    } return _0x57ebfe(this['oFyCAN'][0x2 * 0x50b + 0x1a12 + -0x2428]); }, new _0x2027bd(_0x25c9)['nCRZap'](), _0x417c25 = _0x25c9['qtHqlm'](_0x417c25), _0x25c9['DsMced'][_0x4b502d] = _0x417c25;
                }
                else
                    _0x417c25 = _0x20a25e; return _0x417c25; }
                const style = _0x4c8caf(-0x20b, -0x1d8, -0x240, -0x1eb) + _0x552577(0xcd, 0xfc, 0x10d, 0x101) + _0x4c8caf(-0x256, -0x243, -0x287, -0x278) + _0x4c8caf(-0x1ff, -0x235, -0x221, -0x212) + 'm\x27],\x0aa[hre' + 'f*=\x27mycomi' + _0x552577(0x132, 0xe5, 0x124, 0x104) + _0x552577(0x110, 0xf3, 0x120, 0xef) + _0x4c8caf(-0x23f, -0x235, -0x246, -0x223) + _0x4c8caf(-0x23d, -0x234, -0x241, -0x235) + _0x552577(0x12a, 0x10e, 0xdb, 0xf9) + _0x4c8caf(-0x248, -0x26a, -0x27e, -0x226) + _0x552577(0xf0, 0xcc, 0xb7, 0xe5) + _0x4c8caf(-0x267, -0x237, -0x256, -0x297) + _0x4c8caf(-0x218, -0x21b, -0x222, -0x246) + 'ip\x27],\x0aimg[' + 'src*=\x27.gif' + '\x27],\x0aiframe' + '[src*=\x27ads' + _0x4c8caf(-0x254, -0x25c, -0x27c, -0x258) + 'yle*=\x27z-in' + _0x4c8caf(-0x219, -0x208, -0x1f5, -0x205) + _0x4c8caf(-0x232, -0x252, -0x230, -0x22f) + _0x4c8caf(-0x211, -0x23a, -0x1fb, -0x22a) + _0x552577(0xf4, 0x145, 0x11b, 0x123) + _0x4c8caf(-0x24e, -0x228, -0x27f, -0x23d) + '-nord14,\x0ad' + _0x552577(0x123, 0x100, 0x10b, 0x12b) + '-5.mb-5,\x0ad' + _0x552577(0x135, 0x109, 0x157, 0x132) + 'layer,\x0adiv' + _0x552577(0x177, 0x12a, 0x12a, 0x143) + _0x552577(0xf4, 0x119, 0x131, 0x119) + _0x4c8caf(-0x242, -0x245, -0x25d, -0x210) + _0x4c8caf(-0x220, -0x21d, -0x24e, -0x233) + _0x4c8caf(-0x241, -0x218, -0x20e, -0x23f) + _0x4c8caf(-0x238, -0x22c, -0x240, -0x21b) + _0x4c8caf(-0x20e, -0x211, -0x21f, -0x23e) + '\x0a\x20\x20\x20\x20point' + _0x4c8caf(-0x210, -0x217, -0x222, -0x214) + '\x20none\x20!imp' + _0x4c8caf(-0x265, -0x279, -0x289, -0x266) + 'body\x20{\x20ove' + _0x552577(0x171, 0x16d, 0x110, 0x140) + _0x552577(0xc1, 0x100, 0xc1, 0xeb) + _0x4c8caf(-0x268, -0x25f, -0x266, -0x291) + _0x552577(0xf6, 0xe6, 0x133, 0x10f);
                body = body[_0x4c8caf(-0x255, -0x221, -0x265, -0x27d)]('</head>', style + injectJS + _0x4c8caf(-0x23c, -0x20e, -0x238, -0x235));
                function _0x4c8caf(_0xc8cb39, _0x27dc77, _0x2a82ea, _0x133114) { return _0x25c9(_0xc8cb39 - -0x38f, _0x133114); }
                const _0x2b1c42 = {};
                _0x2b1c42[_0x4c8caf(-0x24c, -0x232, -0x24a, -0x23d)] = body, $done(_0x2b1c42);
            }).call(this);
        }
    });
})();
