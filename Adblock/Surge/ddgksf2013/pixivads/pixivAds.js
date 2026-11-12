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
                const name = "pixivAds.js";
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
                (function (_0x342e39, _0x5e7f19) { const _0x3bcfa7 = { _0x4bd559: 0x54b, _0x117a90: 0x52f, _0x5e09be: 0x53e, _0x3bfba8: 0x526, _0x3f9542: 0x547, _0x72dddf: 0x54f, _0x1ce23d: 0x559, _0x43b7de: 0x540, _0x163de7: 0x534, _0x3962e3: 0x530, _0x5510f8: 0x542, _0x3b6c4b: 0x53c, _0x5aab3c: 0x476, _0x2b44e7: 0x473, _0x4f8d39: 0x472, _0x2322aa: 0x546, _0x37374a: 0x545, _0x46a5fa: 0x561, _0x3bfd78: 0x478, _0x40ef39: 0x46a, _0x51ba5c: 0x462, _0x1bc57d: 0x465, _0xc4b40b: 0x467, _0x2f0f94: 0x45a, _0x462e3e: 0x480, _0x173bf9: 0x46e, _0x29484e: 0x46d, _0x243b6e: 0x571, _0x517f67: 0x57f, _0xfad18e: 0x498, _0x1ee47b: 0x4a3, _0x34da05: 0x487, _0x3e3087: 0x481, _0x1d2f6a: 0x481 }, _0x3b453f = { _0x2b99fc: 0x3b0 }, _0xb044a0 = { _0xb6cb97: 0x2c2 }, _0x4f8ffb = _0x342e39(); function _0x213234(_0x576d22, _0x1ba6ba, _0x16b8cf, _0x241050) { return _0x4558(_0x241050 - _0xb044a0._0xb6cb97, _0x576d22); } function _0x5b47ff(_0xd973b8, _0x379683, _0x1a968e, _0x4e1b94) { return _0x4558(_0x1a968e - _0x3b453f._0x2b99fc, _0x4e1b94); } while (!![]) {
                    try {
                        const _0x26d016 = parseInt(_0x5b47ff(_0x3bcfa7._0x4bd559, _0x3bcfa7._0x117a90, _0x3bcfa7._0x5e09be, _0x3bcfa7._0x3bfba8)) / (0xbaa + 0x8 * -0x15d + -0x1 * 0xc1) + parseInt(_0x5b47ff(_0x3bcfa7._0x3f9542, _0x3bcfa7._0x72dddf, _0x3bcfa7._0x1ce23d, _0x3bcfa7._0x43b7de)) / (-0x1f * -0x61 + -0x53 * -0x67 + -0x2d22) * (-parseInt(_0x5b47ff(_0x3bcfa7._0x163de7, _0x3bcfa7._0x3962e3, _0x3bcfa7._0x5510f8, _0x3bcfa7._0x3b6c4b)) / (-0x20c7 + -0x59 * 0x5b + 0x1 * 0x406d)) + parseInt(_0x213234(_0x3bcfa7._0x5aab3c, _0x3bcfa7._0x2b44e7, _0x3bcfa7._0x4f8d39, 0x466)) / (-0x2d1 * 0x2 + -0xe5 * -0xa + -0x34c) * (-parseInt(_0x5b47ff(_0x3bcfa7._0x2322aa, 0x531, _0x3bcfa7._0x37374a, _0x3bcfa7._0x46a5fa)) / (0x15ef * 0x1 + 0x9ef + 0x1f * -0x107)) + -parseInt(_0x213234(_0x3bcfa7._0x3bfd78, _0x3bcfa7._0x40ef39, _0x3bcfa7._0x51ba5c, _0x3bcfa7._0x1bc57d)) / (-0xb * -0x13 + -0x114d * -0x1 + -0x1218) * (parseInt(_0x213234(_0x3bcfa7._0xc4b40b, 0x449, 0x46d, _0x3bcfa7._0x2f0f94)) / (0xd * 0xeb + -0x229d + 0x16b5)) + -parseInt(_0x213234(0x46b, _0x3bcfa7._0x462e3e, _0x3bcfa7._0x173bf9, _0x3bcfa7._0x29484e)) / (0x24b9 + 0x141 * 0x15 + 0x6 * -0xa81) * (parseInt(_0x5b47ff(0x55e, 0x578, _0x3bcfa7._0x243b6e, _0x3bcfa7._0x517f67)) / (-0x1 * -0x3e + 0x5 * -0x3d4 + 0x12ef)) + parseInt(_0x213234(_0x3bcfa7._0xfad18e, _0x3bcfa7._0x1ee47b, 0x47f, _0x3bcfa7._0x34da05)) / (0x1d87 + -0x124 * -0x18 + -0x1 * 0x38dd) + parseInt(_0x213234(0x490, _0x3bcfa7._0x5aab3c, _0x3bcfa7._0x3e3087, _0x3bcfa7._0x1d2f6a)) / (0x130b * -0x1 + -0x135f + 0x2675);
                        if (_0x26d016 === _0x5e7f19)
                            break;
                        else
                            _0x4f8ffb['push'](_0x4f8ffb['shift']());
                    }
                    catch (_0x165ebf) {
                        _0x4f8ffb['push'](_0x4f8ffb['shift']());
                    }
                } }(_0x2187, -0x29402 + -0x1 * -0x813b + -0x2f669 * -0x2));
                function _0xb6ef61(_0xb2507e, _0x1db459, _0x8ba17b, _0x533d9e) { const _0x4b770d = { _0x42268c: 0xb2 }; return _0x4558(_0x533d9e - -_0x4b770d._0x42268c, _0x1db459); }
                const _0x18451a = (function () { const _0x1ebd04 = { _0x2e2ae6: 0x160, _0x1501ba: 0x147, _0x1d4038: 0x17a, _0x4e73ff: 0x140, _0x59c519: 0x148, _0x53c3a0: 0x138, _0x490933: 0x178, _0x365aee: 0x192, _0x30e7e3: 0x1a9, _0x30d9eb: 0x164, _0x3ebf64: 0x17c, _0x80bc12: 0x152, _0x6d7210: 0x17d, _0x143776: 0x186, _0x51ad64: 0x190, _0x2a4a0d: 0x19d, _0x394cef: 0x142, _0x36e927: 0x129, _0x26411f: 0x135, _0x23ace4: 0x159, _0x33283d: 0x163, _0x175f98: 0x171, _0x1a7bca: 0x13e, _0x496f5b: 0x127, _0x4ec5fe: 0x12c, _0x5d5e1d: 0x14f }, _0x43d284 = { _0x3cb87b: 0x4ac, _0x4faaca: 0x4c4, _0x3c9e7f: 0x48f, _0x40a2a2: 0xa0, _0x16db30: 0xa3, _0x5b2895: 0xb7, _0x5122b5: 0x4b8, _0xe7dbcf: 0x4cc, _0x30ea83: 0x4c4, _0x1891a3: 0x4c2, _0x1c8ac7: 0x4c8, _0x385a13: 0xb8, _0x12b916: 0xa8, _0x41b4ba: 0x4b0, _0x2044c8: 0xc4, _0x55253e: 0xd9, _0x34dc01: 0xac, _0x185623: 0x4c1, _0x5e8352: 0x4b2, _0xd9d426: 0x4d7, _0xb3f69d: 0x4bd, _0x20f12c: 0xc9, _0x9c0a29: 0xd1, _0x372359: 0xcb, _0x82ba87: 0x4b7, _0x4a4d1c: 0x4c2, _0x16156a: 0x4bf, _0x3f00fe: 0xd2, _0x2ab09a: 0xc9, _0x37dd0c: 0xbf, _0x4ca5c5: 0xd4, _0x116680: 0xba }, _0x2d58de = { _0x50ac91: 0x31 }, _0x4be8c4 = { _0x2becb5: 0x5c }, _0x2933f6 = {}; function _0x4b3cfc(_0x331821, _0x1459a4, _0x5d1db2, _0x156017) { return _0x4558(_0x331821 - -_0x4be8c4._0x2becb5, _0x5d1db2); } _0x2933f6[_0x4cea3d(0x15e, _0x1ebd04._0x2e2ae6, _0x1ebd04._0x1501ba, _0x1ebd04._0x1d4038)] = _0x4b3cfc(_0x1ebd04._0x4e73ff, _0x1ebd04._0x59c519, _0x1ebd04._0x53c3a0, 0x15b), _0x2933f6[_0x4cea3d(_0x1ebd04._0x490933, _0x1ebd04._0x365aee, _0x1ebd04._0x1d4038, _0x1ebd04._0x30e7e3)] = _0x4b3cfc(_0x1ebd04._0x30d9eb, _0x1ebd04._0x3ebf64, _0x1ebd04._0x80bc12, _0x1ebd04._0x6d7210), _0x2933f6[_0x4cea3d(_0x1ebd04._0x143776, 0x18c, _0x1ebd04._0x51ad64, _0x1ebd04._0x2a4a0d)] = function (_0x133619, _0x4637f0) { return _0x133619 === _0x4637f0; }, _0x2933f6['ONpmb'] = _0x4b3cfc(_0x1ebd04._0x394cef, 0x133, _0x1ebd04._0x36e927, _0x1ebd04._0x26411f), _0x2933f6[_0x4b3cfc(_0x1ebd04._0x23ace4, _0x1ebd04._0x33283d, _0x1ebd04._0x175f98, 0x145)] = _0x4b3cfc(_0x1ebd04._0x1a7bca, _0x1ebd04._0x496f5b, _0x1ebd04._0x4ec5fe, _0x1ebd04._0x5d5e1d); function _0x4cea3d(_0x203617, _0x365793, _0x393621, _0x332794) { return _0x4558(_0x365793 - -_0x2d58de._0x50ac91, _0x393621); } const _0x252c0e = _0x2933f6; let _0x95336a = !![]; return function (_0xc4263b, _0x101081) { const _0x4d4330 = { _0x2d44a2: 0xbb, _0xef66b6: 0xad, _0x5bae4d: 0xcf, _0x10dc60: 0xd4, _0x2be074: 0xda, _0x2755f6: 0xaf, _0x486f48: 0xc9, _0x358337: 0xbb, _0x8a3d9e: 0xa2, _0x1a105c: 0xbf, _0x486cf8: 0x91, _0xa7f2fb: 0x2f3, _0x5b5895: 0x308, _0x58282a: 0x30b }, _0xca8ad9 = { _0x38bd48: 0x1a8, _0x29b238: 0x1e2 }, _0x441b3c = { _0xd660c2: 0x84, _0x5b970f: 0x64 }, _0x3e5f58 = { _0x7e16e0: 0x97, _0x364c04: 0xf2, _0x4534ef: 0xe6 }; function _0x1f57d9(_0x28cc7f, _0x39c93e, _0xf2cd50, _0x39115d) { return _0x4b3cfc(_0x28cc7f - -_0x3e5f58._0x7e16e0, _0x39c93e - _0x3e5f58._0x364c04, _0x39c93e, _0x39115d - _0x3e5f58._0x4534ef); } const _0x43ea1c = {}; function _0x4b6ace(_0x173443, _0x9d501b, _0x14d573, _0x3bee5f) { return _0x4cea3d(_0x173443 - _0x441b3c._0xd660c2, _0x173443 - 0x336, _0x3bee5f, _0x3bee5f - _0x441b3c._0x5b970f); } _0x43ea1c[_0x4b6ace(_0x43d284._0x3cb87b, _0x43d284._0x4faaca, _0x43d284._0x3c9e7f, 0x4a6)] = function (_0x1de749, _0x34b9b3) { return _0x1de749 === _0x34b9b3; }, _0x43ea1c[_0x1f57d9(_0x43d284._0x40a2a2, _0x43d284._0x16db30, 0xad, _0x43d284._0x5b2895)] = _0x252c0e['kwEkY'], _0x43ea1c[_0x4b6ace(_0x43d284._0x5122b5, _0x43d284._0xe7dbcf, _0x43d284._0x30ea83, 0x4b9)] = _0x252c0e['ujeQf']; const _0x4277ab = _0x43ea1c; if (_0x252c0e[_0x4b6ace(_0x43d284._0x1891a3, 0x4c9, _0x43d284._0x1c8ac7, 0x4d6)](_0x252c0e[_0x1f57d9(0xc1, _0x43d284._0x385a13, _0x43d284._0x12b916, 0xa4)], _0x252c0e[_0x4b6ace(0x4ba, _0x43d284._0x41b4ba, 0x4b7, 0x4c6)])) {
                    const _0x53a16e = _0xea6603['constructo' + 'r'][_0x1f57d9(_0x43d284._0x2044c8, 0xd4, _0x43d284._0x55253e, _0x43d284._0x34dc01)][_0x4b6ace(_0x43d284._0x185623, _0x43d284._0x5e8352, _0x43d284._0xd9d426, _0x43d284._0xb3f69d)](_0x3b23a4), _0x322346 = _0x411f2d[_0x268939], _0x5bf181 = _0x465084[_0x322346] || _0x53a16e;
                    _0x53a16e['__proto__'] = _0x143ceb[_0x1f57d9(_0x43d284._0x20f12c, _0x43d284._0x9c0a29, _0x43d284._0x2044c8, _0x43d284._0x372359)](_0x14c180), _0x53a16e[_0x4b6ace(_0x43d284._0x82ba87, _0x43d284._0x4a4d1c, _0x43d284._0x16156a, 0x4cc)] = _0x5bf181[_0x1f57d9(0xbf, _0x43d284._0x5b2895, 0xc4, _0x43d284._0x3f00fe)][_0x1f57d9(_0x43d284._0x2ab09a, _0x43d284._0x37dd0c, _0x43d284._0x4ca5c5, _0x43d284._0x116680)](_0x5bf181), _0x4fe891[_0x322346] = _0x53a16e;
                }
                else {
                    const _0xf09174 = _0x95336a ? function () { const _0x259f07 = { _0x23096f: 0x1d5, _0x742e47: 0x1c9, _0x1e8b3a: 0x1e2, _0x4db8be: 0x1c2 }, _0x19ff3b = { _0x38d777: 0x567, _0x313673: 0xcc, _0x2f58ef: 0xcc }; function _0x7f90f9(_0x43adaf, _0x354c55, _0x495d13, _0x2b6ee9) { return _0x4b6ace(_0x354c55 - -_0xca8ad9._0x38bd48, _0x354c55 - _0xca8ad9._0x29b238, _0x495d13 - 0xf4, _0x2b6ee9); } function _0x275596(_0x510b33, _0x488392, _0x5a476f, _0x693b03) { return _0x4b6ace(_0x510b33 - -_0x19ff3b._0x38d777, _0x488392 - _0x19ff3b._0x313673, _0x5a476f - _0x19ff3b._0x2f58ef, _0x488392); } if (_0x4277ab[_0x275596(-_0x4d4330._0x2d44a2, -_0x4d4330._0xef66b6, -0xbb, -0xaa)](_0x4277ab[_0x275596(-_0x4d4330._0x5bae4d, -_0x4d4330._0x10dc60, -_0x4d4330._0x2be074, -0xd7)], _0x4277ab[_0x275596(-0xcf, -0xea, -0xea, -_0x4d4330._0x10dc60)])) {
                        if (_0x101081) {
                            if (_0x4277ab[_0x275596(-_0x4d4330._0x2755f6, -_0x4d4330._0x486f48, -0xb0, -_0x4d4330._0x358337)] !== _0x275596(-_0x4d4330._0x8a3d9e, -_0x4d4330._0x1a105c, -0xa8, -_0x4d4330._0x486cf8)) {
                                const _0x54bee4 = _0x59a992 ? function () { const _0x811c08 = { _0x166502: 0x2a1, _0x2377b3: 0x1b1, _0x14b953: 0xe2 }; function _0x1d48ff(_0x3997bd, _0x15347c, _0x23a6f9, _0xf40f5) { return _0x275596(_0x3997bd - _0x811c08._0x166502, _0x15347c, _0x23a6f9 - _0x811c08._0x2377b3, _0xf40f5 - _0x811c08._0x14b953); } if (_0x54cbea) {
                                    const _0x3f859e = _0x135403[_0x1d48ff(_0x259f07._0x23096f, _0x259f07._0x742e47, _0x259f07._0x1e8b3a, _0x259f07._0x4db8be)](_0x38bb23, arguments);
                                    return _0xb22ec1 = null, _0x3f859e;
                                } } : function () { };
                                return _0xe19fc1 = ![], _0x54bee4;
                            }
                            else {
                                const _0x2780fd = _0x101081[_0x7f90f9(0x2f7, _0x4d4330._0xa7f2fb, _0x4d4330._0x5b5895, _0x4d4330._0x58282a)](_0xc4263b, arguments);
                                return _0x101081 = null, _0x2780fd;
                            }
                        }
                    }
                    else {
                        const _0x5b10af = _0x879e4c ? function () { if (_0x31dd11) {
                            const _0x11fdce = _0x3841e5['apply'](_0x1f3f6d, arguments);
                            return _0xd3b73a = null, _0x11fdce;
                        } } : function () { };
                        return _0x19fed9 = ![], _0x5b10af;
                    } } : function () { };
                    return _0x95336a = ![], _0xf09174;
                } }; }()), _0x5c3962 = _0x18451a(this, function () { const _0x3a7378 = { _0x1c4b8: 0x1ef, _0xb88e53: 0x1fc, _0x30c99a: 0x1db, _0x3b451b: 0x1e0, _0x5dd485: 0x20a, _0x16b13c: 0x1f1, _0x239f9f: 0x1d6, _0x2f61b9: 0x1ce, _0x36d661: 0x1d1, _0xd532c3: 0x1f9, _0x2cd342: 0x1e1, _0x4adf07: 0x1d5, _0x510eec: 0x1d7, _0x1dc1f7: 0x1e7, _0x2c0cfc: 0x204, _0x28fb69: 0x1ca }; function _0x575574(_0x37ab4b, _0x31ce44, _0x27f8d5, _0x5f1ae1) { return _0x4558(_0x37ab4b - -0x3a9, _0x5f1ae1); } const _0x4b9151 = {}; _0x4b9151['eaXda'] = _0x575574(-_0x3a7378._0x1c4b8, -_0x3a7378._0xb88e53, -_0x3a7378._0x30c99a, -_0x3a7378._0x3b451b) + '+$'; function _0x51e745(_0x5c1709, _0x15c5fd, _0xe58e85, _0x16d78e) { return _0x4558(_0x16d78e - -0x393, _0xe58e85); } const _0x1898df = _0x4b9151; return _0x5c3962['toString']()[_0x51e745(-_0x3a7378._0x5dd485, -0x1fc, -0x1e5, -_0x3a7378._0x16b13c)](_0x1898df[_0x51e745(-_0x3a7378._0x239f9f, -_0x3a7378._0x2f61b9, -0x1ba, -_0x3a7378._0x36d661)])[_0x51e745(-0x1da, -0x1d4, -_0x3a7378._0xd532c3, -_0x3a7378._0x2cd342)]()[_0x575574(-_0x3a7378._0x16b13c, -_0x3a7378._0x4adf07, -0x1e2, -_0x3a7378._0x510eec) + 'r'](_0x5c3962)['search'](_0x1898df[_0x575574(-_0x3a7378._0x1dc1f7, -_0x3a7378._0x2c0cfc, -_0x3a7378._0x28fb69, -_0x3a7378._0xb88e53)]); });
                function _0x2c40d5(_0x49413f, _0x2cc066, _0x2d2388, _0x193bf7) { const _0x373c73 = { _0x473d56: 0x200 }; return _0x4558(_0x2d2388 - _0x373c73._0x473d56, _0x49413f); }
                _0x5c3962();
                function _0x4558(_0x4fe891, _0x57919d) { const _0x59a47b = _0x2187(); return _0x4558 = function (_0xacd4a7, _0x5f9c3) { _0xacd4a7 = _0xacd4a7 - (0x10 * -0x27 + -0x26e4 + 0x2ae0); let _0x76a83d = _0x59a47b[_0xacd4a7]; if (_0x4558['NNtiKF'] === undefined) {
                    var _0x23493a = function (_0x3e98d7) { const _0x42641c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; let _0x4ac5a4 = '', _0x2338c9 = '', _0x1fc724 = _0x4ac5a4 + _0x23493a; for (let _0x3ea350 = -0xaa2 + 0x247d + -0x19db * 0x1, _0x3f7122, _0x5e3aa3, _0x156c31 = -0xb52 * -0x3 + 0xa8a + -0x2c80; _0x5e3aa3 = _0x3e98d7['charAt'](_0x156c31++); ~_0x5e3aa3 && (_0x3f7122 = _0x3ea350 % (-0x14e1 * 0x1 + 0xaae + -0x1 * -0xa37) ? _0x3f7122 * (-0x742 * 0x2 + 0x1271 * -0x2 + -0x259 * -0x16) + _0x5e3aa3 : _0x5e3aa3, _0x3ea350++ % (-0x173c + -0x10f * -0x7 + 0x32b * 0x5)) ? _0x4ac5a4 += _0x1fc724['charCodeAt'](_0x156c31 + (-0x2457 + -0x1ef7 + 0x4358)) - (-0xd1 * -0xd + 0x8 * 0x291 + 0x1f1b * -0x1) !== -0x33e * -0x5 + -0xb5 + -0x3 * 0x52b ? String['fromCharCode'](0x1 * 0x1843 + 0x1f7f * -0x1 + 0x83b & _0x3f7122 >> (-(-0x2021 + -0x3 * -0x482 + 0x129d) * _0x3ea350 & 0x1c8 * 0x1 + -0x92f * 0x1 + 0x76d)) : _0x3ea350 : -0x4 * -0x327 + 0x1 * 0xd49 + 0x7 * -0x3b3) {
                        _0x5e3aa3 = _0x42641c['indexOf'](_0x5e3aa3);
                    } for (let _0x439fff = 0x2c6 + -0x25e3 + 0x231d, _0x2e7d4e = _0x4ac5a4['length']; _0x439fff < _0x2e7d4e; _0x439fff++) {
                        _0x2338c9 += '%' + ('00' + _0x4ac5a4['charCodeAt'](_0x439fff)['toString'](-0x2026 + -0xdea + 0x2e20))['slice'](-(-0x13f3 * -0x1 + -0x4e + -0x13a3));
                    } return decodeURIComponent(_0x2338c9); };
                    _0x4558['deBLzw'] = _0x23493a, _0x4fe891 = arguments, _0x4558['NNtiKF'] = !![];
                } const _0x5d45df = _0x59a47b[-0xe * -0x26f + 0x1 * -0x24bb + 0x3 * 0xe3], _0x6ecad9 = _0xacd4a7 + _0x5d45df, _0x469011 = _0x4fe891[_0x6ecad9]; if (!_0x469011) {
                    const _0xc5d944 = function (_0x8caa4f) { this['vJPNkk'] = _0x8caa4f, this['ocnvMY'] = [-0x2656 + 0xf1 * 0x15 + 0x1292, 0xe0c + 0x13bb + 0x1 * -0x21c7, -0x16c0 + -0x147e + -0x1e * -0x171], this['JBmsdn'] = function () { return 'newState'; }, this['ZVmvDp'] = '\x5cw+\x20*\x5c(\x5c)\x20*{\x5cw+\x20*', this['EuJEid'] = '[\x27|\x22].+[\x27|\x22];?\x20*}'; };
                    _0xc5d944['prototype']['vaxOvf'] = function () { const _0x3e26b7 = new RegExp(this['ZVmvDp'] + this['EuJEid']), _0x5c1f2a = _0x3e26b7['test'](this['JBmsdn']['toString']()) ? --this['ocnvMY'][0x11a8 + -0x18bb + -0x1 * -0x714] : --this['ocnvMY'][0x131c * -0x2 + -0x1a * -0x16e + -0x86 * -0x2]; return this['RrrRok'](_0x5c1f2a); }, _0xc5d944['prototype']['RrrRok'] = function (_0x4b6b48) { if (!Boolean(~_0x4b6b48))
                        return _0x4b6b48; return this['SWaygu'](this['vJPNkk']); }, _0xc5d944['prototype']['SWaygu'] = function (_0xa4986c) { for (let _0x21bb91 = -0xa3 * 0x3c + 0x139f + 0x1295, _0x4ce14b = this['ocnvMY']['length']; _0x21bb91 < _0x4ce14b; _0x21bb91++) {
                        this['ocnvMY']['push'](Math['round'](Math['random']())), _0x4ce14b = this['ocnvMY']['length'];
                    } return _0xa4986c(this['ocnvMY'][-0xe * 0x1ef + -0x4b1 * -0x2 + 0x11b0]); }, new _0xc5d944(_0x4558)['vaxOvf'](), _0x76a83d = _0x4558['deBLzw'](_0x76a83d), _0x4fe891[_0x6ecad9] = _0x76a83d;
                }
                else
                    _0x76a83d = _0x469011; return _0x76a83d; }, _0x4558(_0x4fe891, _0x57919d); }
                function _0x2187() { const _0x546fdf = ['t05WBwi', 's0jbEvG', 'DhjHy2u', 'ChjVDg90ExbL', 'y29UC3rYDwn0BW', 'Aw5MBW', 'kcGOlISPkYKRkq', 'CMvZCg9UC2u', 'yMLUza', 'BeXdsfC', 'y0Dmswm', 'odi1otyWm0rkwgrjsG', 'ze1js08', 'mtCZmdD6uvD0swO', 'zwfyzge', 'DwPLuwy', 'DMDlA1O', 'mZmYnJi2mefPD0j4ra', 'CgfYC2u', 'CMv0DxjUicHMDq', 'mtGZnJqXsgTVzwng', 'zNzmyxa', 'y29UC29Szq', 'A3DfA1K', 'mJi5ndqZtwr0uNP3', 'yM9JyLC', 'BgvUz3rO', 'mJK1ntm1ALvOqM9A', 'yxbWBhK', 'u3bwrw8', 'nZe5nJC3B25mBMPb', 'rNbWtvC', 'AKzTA0e', 'C3rYAw5NAwz5', 'wMXlEMC', 'CM4GDgHPCYiPka', 'C1bwALi', 'yvHdv3G', 'CLzszvm', 'zKDyAgK', 'C2vHCMnO', 'mtHpzvnqAKO', 'ne1REwTzqW', 'Bg9N', 'zLLov2m', 'tujxugu', 'AxnFChjLBwL1Bq', 'ngHMD2z0tG', 'zxjYB3i', 'mJa1nMDcAMjeDW', 'ruXZve4', 'B3DdCfa', 'DxnLCG', 'BMn0Aw9UkcKG', 'u0ncvui', 'BLbSzvi', 'Dg9tDhjPBMC', 'y1jeAKq']; _0x2187 = function () { return _0x546fdf; }; return _0x2187(); }
                const _0x232dcd = (function () { const _0x1998f6 = { _0x358217: 0x388, _0xa9fe29: 0x3af, _0x21b534: 0x396, _0xba1e8d: 0x396, _0x29a714: 0x392, _0x5be922: 0x39d, _0x3a6d1a: 0x3b3, _0x24a5c5: 0x2dc, _0x5d241e: 0x2cc, _0x2f6fcf: 0x2c1 }, _0x1fd163 = { _0x5663dd: 0xbe, _0x277ed2: 0xba, _0x1990de: 0xc8, _0x5ce50c: 0xa7, _0x2e102b: 0xb7, _0x355a2a: 0x9c, _0x344ae9: 0xb5, _0x594cc7: 0xb7, _0x597a3b: 0xba }, _0x161f11 = { _0x30360d: 0x1f7 }, _0x231d07 = { _0x35a14c: 0xfd }, _0x494272 = {}; _0x494272[_0x3ed78b(_0x1998f6._0x358217, _0x1998f6._0xa9fe29, _0x1998f6._0x21b534, _0x1998f6._0xba1e8d)] = function (_0x3d7a66, _0x3fbe5c) { return _0x3d7a66 !== _0x3fbe5c; }, _0x494272[_0x3ed78b(_0x1998f6._0x29a714, 0x3b0, _0x1998f6._0x5be922, _0x1998f6._0x3a6d1a)] = 'zMEbn', _0x494272['CPtHG'] = _0x457d5a(_0x1998f6._0x24a5c5, _0x1998f6._0x5d241e, _0x1998f6._0x2f6fcf, 0x2c8); const _0x30aa8f = _0x494272; function _0x457d5a(_0x24fc12, _0x27786f, _0x142395, _0x2e9a80) { return _0x4558(_0x142395 - _0x231d07._0x35a14c, _0x27786f); } function _0x3ed78b(_0x4f3702, _0x24ae40, _0x53842c, _0x266b4b) { return _0x4558(_0x53842c - _0x161f11._0x30360d, _0x266b4b); } let _0x28cf44 = !![]; return function (_0x5d227f, _0x359857) { const _0x433837 = _0x28cf44 ? function () { const _0x2340e8 = { _0x22a93d: 0x25d }, _0x3fca2b = { _0x248a36: 0xe1 }; function _0x52e358(_0x38e5d0, _0x482ce3, _0x2b4e2d, _0x56d9f8) { return _0x4558(_0x482ce3 - -_0x3fca2b._0x248a36, _0x38e5d0); } function _0xd522b0(_0x5b8995, _0x386b77, _0x26e097, _0x1a3e28) { return _0x4558(_0x386b77 - -_0x2340e8._0x22a93d, _0x26e097); } if (_0x359857) {
                    if (_0x30aa8f[_0xd522b0(-0xbf, -_0x1fd163._0x5663dd, -_0x1fd163._0x277ed2, -_0x1fd163._0x1990de)](_0x30aa8f[_0xd522b0(-_0x1fd163._0x5ce50c, -_0x1fd163._0x2e102b, -_0x1fd163._0x5ce50c, -_0x1fd163._0x355a2a)], _0x30aa8f['CPtHG'])) {
                        const _0x2b776a = _0x359857[_0x52e358(0xce, _0x1fd163._0x344ae9, _0x1fd163._0x594cc7, _0x1fd163._0x597a3b)](_0x5d227f, arguments);
                        return _0x359857 = null, _0x2b776a;
                    }
                    else {
                        if (_0x3435c4) {
                            const _0x4e5731 = _0x98471['apply'](_0xaf8a67, arguments);
                            return _0x1afad9 = null, _0x4e5731;
                        }
                    }
                } } : function () { }; return _0x28cf44 = ![], _0x433837; }; }()), _0x4385bd = _0x232dcd(this, function () { const _0x39cd4d = { _0x3de197: 0x35d, _0x26fe94: 0x36c, _0x250777: 0x371, _0x1b2959: 0x89, _0x551079: 0x96, _0x340f3f: 0xb1, _0x49c12: 0x83, _0x2755: 0xa6, _0x25875c: 0x9f, _0x1396c4: 0x385, _0x64e74d: 0x39a, _0x11a483: 0x389, _0x32da95: 0x87, _0x2091b0: 0x6b, _0x49f9de: 0x6c, _0x17053d: 0x83, _0x4f996b: 0x70, _0x3814dc: 0x73, _0x50d1ff: 0x82, _0x31248e: 0x86, _0x1f0d3c: 0x38f, _0x13790a: 0x3ad, _0xaa3632: 0x39c, _0x343bee: 0x395, _0x2ad2d9: 0xa8, _0xfb493f: 0x9e, _0x7829a5: 0xa5, _0x3d3d34: 0x70, _0x242fe2: 0x84, _0x311696: 0x37e, _0x175c36: 0x387, _0x36c03c: 0x380, _0x11cef1: 0x3a1, _0x1e509f: 0x39e, _0x7b5a4: 0x388, _0x2489a3: 0x98, _0x50da6b: 0x8a, _0x2e3910: 0x92, _0x482d51: 0xad, _0x51cb41: 0x96, _0x5c835d: 0xa3, _0x415cde: 0x3a9, _0x1d1f41: 0x37b, _0x51c02c: 0x379, _0xaa0815: 0x391, _0x57f304: 0xa7, _0x2c3ed9: 0x85, _0x1425f5: 0x8c, _0x182d6d: 0x9e, _0x3bb83e: 0xa8, _0x1372a1: 0x371, _0x421606: 0x373, _0x1ca077: 0x399, _0x51d8d3: 0x384, _0x9a0d1a: 0x3a0, _0x474a9e: 0x372, _0xc40472: 0xb7, _0x43fe0b: 0xc5, _0x2b7964: 0x97, _0x4b55d6: 0x39b, _0x57ab17: 0x8b, _0x4991b8: 0x80, _0x219a01: 0x8a }, _0x10b950 = { _0x2e96aa: 0x23c }, _0x3c0b0c = { _0x1a34c5: 0x1e4 }, _0x2c642c = { 'vUwIm': function (_0x2a42bd, _0x5171ef) { return _0x2a42bd(_0x5171ef); }, 'qhtZO': function (_0x225807, _0x3ebc13) { return _0x225807 + _0x3ebc13; }, 'SpVEo': _0x2e3b5a(0x37c, _0x39cd4d._0x3de197, _0x39cd4d._0x26fe94, _0x39cd4d._0x250777) + _0x221b24(-_0x39cd4d._0x1b2959, -0x7a, -_0x39cd4d._0x551079, -0x8d), 'WOkJo': '{}.constru' + 'ctor(\x22retu' + _0x221b24(-_0x39cd4d._0x340f3f, -_0x39cd4d._0x49c12, -_0x39cd4d._0x2755, -_0x39cd4d._0x25875c) + '\x20)', 'cGLIc': function (_0x128589) { return _0x128589(); }, 'sOeex': _0x2e3b5a(_0x39cd4d._0x1396c4, 0x38b, _0x39cd4d._0x64e74d, _0x39cd4d._0x11a483), 'ELsTN': 'warn', 'MDvbR': _0x221b24(-_0x39cd4d._0x32da95, -_0x39cd4d._0x2091b0, -_0x39cd4d._0x49f9de, -_0x39cd4d._0x17053d), 'FppMW': 'table', 'owCpP': _0x221b24(-_0x39cd4d._0x4f996b, -_0x39cd4d._0x3814dc, -_0x39cd4d._0x50d1ff, -_0x39cd4d._0x31248e), 'SCBUB': function (_0x4f653f, _0x43218c) { return _0x4f653f < _0x43218c; }, 'rVReS': function (_0x13d844, _0x13aa7d) { return _0x13d844 === _0x13aa7d; }, 'fGXhi': _0x2e3b5a(_0x39cd4d._0x1f0d3c, _0x39cd4d._0x13790a, _0x39cd4d._0xaa3632, _0x39cd4d._0x343bee) }; function _0x2e3b5a(_0x7bad7f, _0x28a875, _0x336b23, _0x377fec) { return _0x4558(_0x377fec - _0x3c0b0c._0x1a34c5, _0x336b23); } function _0x221b24(_0x50af08, _0x2182e8, _0x2be28d, _0x1fcc52) { return _0x4558(_0x1fcc52 - -_0x10b950._0x2e96aa, _0x2be28d); } let _0x389038; try {
                    const _0x25fc0f = _0x2c642c['vUwIm'](Function, _0x2c642c['qhtZO'](_0x2c642c[_0x221b24(-0xc2, -_0x39cd4d._0x2ad2d9, -_0x39cd4d._0xfb493f, -_0x39cd4d._0x7829a5)], _0x2c642c['WOkJo']) + ');');
                    _0x389038 = _0x2c642c[_0x221b24(-_0x39cd4d._0x3d3d34, -0x84, -_0x39cd4d._0x242fe2, -0x7e)](_0x25fc0f);
                }
                catch (_0x308505) {
                    _0x389038 = window;
                } const _0x4a0f62 = _0x389038[_0x2e3b5a(_0x39cd4d._0x311696, 0x35a, _0x39cd4d._0x175c36, 0x374)] = _0x389038[_0x2e3b5a(0x36b, _0x39cd4d._0x36c03c, 0x36a, 0x374)] || {}, _0x9f0e3b = [_0x2c642c['sOeex'], _0x2c642c[_0x2e3b5a(_0x39cd4d._0x11cef1, _0x39cd4d._0x1e509f, _0x39cd4d._0x7b5a4, 0x390)], _0x2c642c['MDvbR'], _0x221b24(-_0x39cd4d._0x2489a3, -_0x39cd4d._0x50da6b, -0xa5, -_0x39cd4d._0x2e3910), 'exception', _0x2c642c[_0x221b24(-_0x39cd4d._0x482d51, -_0x39cd4d._0x51cb41, -0xb8, -_0x39cd4d._0x5c835d)], _0x2c642c[_0x2e3b5a(_0x39cd4d._0x415cde, _0x39cd4d._0x1d1f41, _0x39cd4d._0x51c02c, _0x39cd4d._0xaa0815)]]; for (let _0x2c1ab5 = -0xf89 + 0x1 * 0x1d7b + -0xdf2; _0x2c642c[_0x221b24(-_0x39cd4d._0x3d3d34, -_0x39cd4d._0x57f304, -_0x39cd4d._0x2c3ed9, -_0x39cd4d._0x1425f5)](_0x2c1ab5, _0x9f0e3b[_0x221b24(-_0x39cd4d._0x182d6d, -0x99, -0x91, -_0x39cd4d._0x3bb83e)]); _0x2c1ab5++) {
                    if (_0x2c642c[_0x2e3b5a(_0x39cd4d._0x1372a1, _0x39cd4d._0x421606, _0x39cd4d._0x1ca077, _0x39cd4d._0x51d8d3)](_0x2c642c[_0x2e3b5a(_0x39cd4d._0x9a0d1a, _0x39cd4d._0x474a9e, 0x38b, _0x39cd4d._0x1396c4)], _0x221b24(-_0x39cd4d._0xc40472, -_0x39cd4d._0x43fe0b, -0x99, -0xad))) {
                        const _0x5d3b3a = _0x437934[_0x221b24(-_0x39cd4d._0x2b7964, -0xa3, -_0x39cd4d._0x50da6b, -0xa6)](_0x2ed2c9, arguments);
                        return _0x315243 = null, _0x5d3b3a;
                    }
                    else {
                        const _0x158921 = _0x232dcd['constructo' + 'r'][_0x2e3b5a(0x399, 0x3a3, 0x3ae, _0x39cd4d._0x4b55d6)][_0x221b24(-_0x39cd4d._0x2091b0, -_0x39cd4d._0x57ab17, -_0x39cd4d._0x4991b8, -_0x39cd4d._0x4991b8)](_0x232dcd), _0x487025 = _0x9f0e3b[_0x2c1ab5], _0xc8b9a1 = _0x4a0f62[_0x487025] || _0x158921;
                        _0x158921['__proto__'] = _0x232dcd[_0x221b24(-0x86, -_0x39cd4d._0x219a01, -0x6c, -_0x39cd4d._0x4991b8)](_0x232dcd), _0x158921['toString'] = _0xc8b9a1['toString']['bind'](_0xc8b9a1), _0x4a0f62[_0x487025] = _0x158921;
                    }
                } });
                _0x4385bd();
                let body = $response['body'];
                body = JSON[_0xb6ef61(0xe2, 0xf5, 0xeb, 0xda)](body), body[_0x2c40d5(0x39f, 0x3b9, 0x3bb, 0x39e)][_0xb6ef61(0xf7, 0x107, 0xee, 0xfc)][_0x2c40d5(0x3ac, 0x3c0, 0x3a8, 0x39a)] = !![], body[_0xb6ef61(0x108, 0xf5, 0xfe, 0xfc)][_0x2c40d5(0x395, 0x3b0, 0x3a8, 0x3b3)] = !![], body = JSON[_0x2c40d5(0x391, 0x38b, 0x39b, 0x395)](body);
                const _0x220609 = {};
                _0x220609['body'] = body, $done(_0x220609);
            }).call(this);
        }
    });
})();
