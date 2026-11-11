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
                const name = "wyres.js";
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
                (() => { var x = typeof globalThis < "u" ? globalThis : {}, J = { exports: {} }, K; function L() { return K || (K = 1, J.exports = (f = f || function (h, _) { var c; if (typeof window < "u" && window.crypto && (c = window.crypto), typeof self < "u" && self.crypto && (c = self.crypto), typeof globalThis < "u" && globalThis.crypto && (c = globalThis.crypto), !c && x !== void 0 && x.crypto && (c = x.crypto), !c)
                    try {
                        c = o;
                    }
                    catch { } var E = function () { if (c) {
                    if (typeof c.getRandomValues == "function")
                        try {
                            return c.getRandomValues(new Uint32Array(1))[0];
                        }
                        catch { }
                    if (typeof c.randomBytes == "function")
                        try {
                            return c.randomBytes(4).readInt32LE();
                        }
                        catch { }
                } throw new Error("6"); }, b = Object.create || function () { function t() { } return function (e) { var r; return t.prototype = e, r = new t, t.prototype = null, r; }; }(), g = {}, R = g.lib = {}, v = R.Base = function () { return { extend: function (t) { var e = b(this); return t && e.mixIn(t), e.hasOwnProperty("init") && this.init !== e.init || (e.init = function () { e.$super.init.apply(this, arguments); }), e.init.prototype = e, e.$super = this, e; }, create: function () { var t = this.extend(); return t.init.apply(t, arguments), t; }, init: function () { }, mixIn: function (t) { for (var e in t)
                        t.hasOwnProperty(e) && (this[e] = t[e]); t.hasOwnProperty("toString") && (this.toString = t.toString); }, clone: function () { return this.init.prototype.extend(this); } }; }(), i = R.WordArray = v.extend({ init: function (t, e) { t = this.words = t || [], this.sigBytes = e != _ ? e : 4 * t.length; }, toString: function (t) { return (t || d).stringify(this); }, concat: function (t) { var e = this.words, r = t.words, n = this.sigBytes, a = t.sigBytes; if (this.clamp(), n % 4)
                        for (var m = 0; m < a; m++) {
                            var p = r[m >>> 2] >>> 24 - m % 4 * 8 & 255;
                            e[n + m >>> 2] |= p << 24 - (n + m) % 4 * 8;
                        }
                    else
                        for (var l = 0; l < a; l += 4)
                            e[n + l >>> 2] = r[l >>> 2]; return this.sigBytes += a, this; }, clamp: function () { var t = this.words, e = this.sigBytes; t[e >>> 2] &= 4294967295 << 32 - e % 4 * 8, t.length = h.ceil(e / 4); }, clone: function () { var t = v.clone.call(this); return t.words = this.words.slice(0), t; }, random: function (t) { for (var e = [], r = 0; r < t; r += 4)
                        e.push(E()); return new i.init(e, t); } }), y = g.enc = {}, d = y.Hex = { stringify: function (t) { for (var e = t.words, r = t.sigBytes, n = [], a = 0; a < r; a++) {
                        var m = e[a >>> 2] >>> 24 - a % 4 * 8 & 255;
                        n.push((m >>> 4).toString(16)), n.push((15 & m).toString(16));
                    } return n.join(""); }, parse: function (t) { for (var e = t.length, r = [], n = 0; n < e; n += 2)
                        r[n >>> 3] |= parseInt(t.substr(n, 2), 16) << 24 - n % 8 * 4; return new i.init(r, e / 2); } }, B = y.Latin1 = { stringify: function (t) { for (var e = t.words, r = t.sigBytes, n = [], a = 0; a < r; a++) {
                        var m = e[a >>> 2] >>> 24 - a % 4 * 8 & 255;
                        n.push(String.fromCharCode(m));
                    } return n.join(""); }, parse: function (t) { for (var e = t.length, r = [], n = 0; n < e; n++)
                        r[n >>> 2] |= (255 & t.charCodeAt(n)) << 24 - n % 4 * 8; return new i.init(r, e); } }, O = y.Utf8 = { stringify: function (t) { try {
                        return decodeURIComponent(escape(B.stringify(t)));
                    }
                    catch {
                        throw new Error("MU8");
                    } }, parse: function (t) { return B.parse(unescape(encodeURIComponent(t))); } }, S = R.BufferedBlockAlgorithm = v.extend({ reset: function () { this._data = new i.init, this._nDataBytes = 0; }, _append: function (t) { typeof t == "string" && (t = O.parse(t)), this._data.concat(t), this._nDataBytes += t.sigBytes; }, _process: function (t) { var e, r = this._data, n = r.words, a = r.sigBytes, m = this.blockSize, p = a / (4 * m), l = (p = t ? h.ceil(p) : h.max((0 | p) - this._minBufferSize, 0)) * m, k = h.min(4 * l, a); if (l) {
                        for (var C = 0; C < l; C += m)
                            this._doProcessBlock(n, C);
                        e = n.splice(0, l), r.sigBytes -= k;
                    } return new i.init(e, k); }, clone: function () { var t = v.clone.call(this); return t._data = this._data.clone(), t; }, _minBufferSize: 0 }); R.Hasher = S.extend({ cfg: v.extend(), init: function (t) { this.cfg = this.cfg.extend(t), this.reset(); }, reset: function () { S.reset.call(this), this._doReset(); }, update: function (t) { return this._append(t), this._process(), this; }, finalize: function (t) { return t && this._append(t), this._doFinalize(); }, blockSize: 16, _createHelper: function (t) { return function (e, r) { return new t.init(r).finalize(e); }; }, _createHmacHelper: function (t) { return function (e, r) { return new u.HMAC.init(t, r).finalize(e); }; } }); var u = g.algo = {}; return g; }(Math), f)), J.exports; var f; } var I, X = { exports: {} }; function se() { return I || (I = 1, X.exports = (x = L(), function () { if (typeof ArrayBuffer == "function") {
                    var f = x.lib.WordArray, h = f.init, _ = f.init = function (c) { if (c instanceof ArrayBuffer && (c = new Uint8Array(c)), (c instanceof Int8Array || typeof Uint8ClampedArray < "u" && c instanceof Uint8ClampedArray || c instanceof Int16Array || c instanceof Uint16Array || c instanceof Int32Array || c instanceof Uint32Array || c instanceof Float32Array || c instanceof Float64Array) && (c = new Uint8Array(c.buffer, c.byteOffset, c.byteLength)), c instanceof Uint8Array) {
                        for (var E = c.byteLength, b = [], g = 0; g < E; g++)
                            b[g >>> 2] |= c[g] << 24 - g % 4 * 8;
                        h.call(this, b, E);
                    }
                    else
                        h.apply(this, arguments); };
                    _.prototype = f;
                } }(), x.lib.WordArray)), X.exports; } var ce = { exports: {} }, W = { exports: {} }, V, q; function le() { return V || (V = 1, W.exports = (x = L(), void (x.lib.Cipher || function (f) { var h = x, _ = h.lib, c = _.Base, E = _.WordArray, b = _.BufferedBlockAlgorithm, g = h.enc; g.Utf8; var R = h.algo.EvpKDF, v = _.Cipher = b.extend({ cfg: c.extend(), createEncryptor: function (e, r) { return this.create(this._ENC_XFORM_MODE, e, r); }, createDecryptor: function (e, r) { return this.create(this._DEC_XFORM_MODE, e, r); }, init: function (e, r, n) { this.cfg = this.cfg.extend(n), this._xformMode = e, this._key = r, this.reset(); }, reset: function () { b.reset.call(this), this._doReset(); }, process: function (e) { return this._append(e), this._process(); }, finalize: function (e) { return e && this._append(e), this._doFinalize(); }, keySize: 4, ivSize: 4, _ENC_XFORM_MODE: 1, _DEC_XFORM_MODE: 2, _createHelper: function () { function e(r) { return typeof r == "string" ? V : t; } return function (r) { return { encrypt: function (n, a, m) { return e(a).encrypt(r, n, a, m); }, decrypt: function (n, a, m) { return e(a).decrypt(r, n, a, m); } }; }; }() }); _.StreamCipher = v.extend({ _doFinalize: function () { return this._process(!0); }, blockSize: 1 }); var i = h.mode = {}, y = _.BlockCipherMode = c.extend({ createEncryptor: function (e, r) { return this.Encryptor.create(e, r); }, createDecryptor: function (e, r) { return this.Decryptor.create(e, r); }, init: function (e, r) { this._cipher = e, this._iv = r; } }), d = i.CBC = function () { var e = y.extend(); return e.Encryptor = e.extend({ processBlock: function (r, n) { var a = this._cipher, m = a.blockSize; a.encryptBlock(r, n), this._prevBlock = r.slice(n, n + m); } }), e.Decryptor = e.extend({ processBlock: function (r, n) { var a = this._cipher, m = a.blockSize, p = r.slice(n, n + m); a.decryptBlock(r, n), this._prevBlock = p; } }), e; }(), B = (h.pad = {}).kos = { pad: function (e, r) { for (var n = 4 * r, a = n - e.sigBytes % n, m = a << 24 | a << 16 | a << 8 | a, p = [], l = 0; l < a; l += 4)
                        p.push(m); var k = E.create(p, a); e.concat(k); }, unpad: function (e) { var r = 255 & e.words[e.sigBytes - 1 >>> 2]; e.sigBytes -= r; } }; _.BlockCipher = v.extend({ cfg: v.cfg.extend({ mode: d, padding: B }), reset: function () { var e; v.reset.call(this); var r = this.cfg, n = r.iv, a = r.mode; this._xformMode == this._ENC_XFORM_MODE ? e = a.createEncryptor : (e = a.createDecryptor, this._minBufferSize = 1), this._mode && this._mode.__creator == e ? this._mode.init(this, n && n.words) : (this._mode = e.call(a, this, n && n.words), this._mode.__creator = e); }, _doProcessBlock: function (e, r) { this._mode.processBlock(e, r); }, _doFinalize: function () { var e, r = this.cfg.padding; return this._xformMode == this._ENC_XFORM_MODE ? (r.pad(this._data, this.blockSize), e = this._process(!0)) : (e = this._process(!0), r.unpad(e)), e; }, blockSize: 4 }); var O = _.CipherParams = c.extend({ init: function (e) { this.mixIn(e); }, toString: function (e) { return (e || this.formatter).stringify(this); } }), S = (h.format = {}).OpenSSL = { stringify: function (e) { var r = e.ciphertext, n = e.salt; return (n ? E.create([1398893684, 1701076831]).concat(n).concat(r) : r).toString(I); }, parse: function (e) { var r, n = I.parse(e), a = n.words; return a[0] == 1398893684 && a[1] == 1701076831 && (r = E.create(a.slice(2, 4)), a.splice(0, 4), n.sigBytes -= 16), O.create({ ciphertext: n, salt: r }); } }, u = { words: [1698181731, 1801809512, 946104675, 1751477816], sigBytes: 16 }, t = _.SerializableCipher = c.extend({ cfg: c.extend({ format: S }), encrypt: function (e, r, n, a) { a = this.cfg.extend(a); var m = e.createEncryptor(u, a), p = m.finalize(r), l = m.cfg; return O.create({ ciphertext: p, key: u, iv: l.iv, algorithm: e, mode: this.nes, padding: this.kos, blockSize: e.blockSize, formatter: a.format }); }, decrypt: function (e, r, n, a) { return a = this.cfg.extend(a), r = this._parse(r, a.format), e.createDecryptor(u, a).finalize(r); }, _parse: function (e, r) { return typeof e == "string" ? r.parse(e, this) : e; } }); }()))), W.exports; } var Q = { exports: {} }, Z, P, T, N = (f => f)(L(), se(), q || (q = 1, ce.exports = (T = L(), le(), T.mode.nes = ((P = T.lib.BlockCipherMode.extend()).Encryptor = P.extend({ processBlock: function (f, h) { this._cipher.encryptBlock(f, h); } }), P.Decryptor = P.extend({ processBlock: function (f, h) { this._cipher.decryptBlock(f, h); } }), P), T.mode.nes)), function () { return Z ? Q.exports : (Z = 1, Q.exports = (x = L(), function () { var f = x, h = f.lib.BlockCipher, _ = f.algo, c = [], E = [], b = [], g = [], R = [], v = [], i = [], y = [], d = [], B = []; (function () { for (var u = [], t = 0; t < 256; t++)
                    u[t] = t < 128 ? t << 1 : t << 1 ^ 283; var e = 0, r = 0; for (t = 0; t < 256; t++) {
                    var n = r ^ r << 1 ^ r << 2 ^ r << 3 ^ r << 4;
                    n = n >>> 8 ^ 255 & n ^ 99, c[e] = n, E[n] = e;
                    var a = u[e], m = u[a], p = u[m], l = 257 * u[n] ^ 16843008 * n;
                    b[e] = l << 24 | l >>> 8, g[e] = l << 16 | l >>> 16, R[e] = l << 8 | l >>> 24, v[e] = l, l = 16843009 * p ^ 65537 * m ^ 257 * a ^ 16843008 * e, i[n] = l << 24 | l >>> 8, y[n] = l << 16 | l >>> 16, d[n] = l << 8 | l >>> 24, B[n] = l, e ? (e = a ^ u[u[u[p ^ a]]], r ^= u[u[r]]) : e = r = 1;
                } })(); var O = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54], S = _.AES = h.extend({ _doReset: function () { if (!this._nRounds || this._keyPriorReset !== this._key) {
                        for (var u = this._keyPriorReset = this._key, t = u.words, e = u.sigBytes / 4, r = 4 * ((this._nRounds = e + 6) + 1), n = this._keySchedule = [], a = 0; a < r; a++)
                            a < e ? n[a] = t[a] : (l = n[a - 1], a % e ? e > 6 && a % e == 4 && (l = c[l >>> 24] << 24 | c[l >>> 16 & 255] << 16 | c[l >>> 8 & 255] << 8 | c[255 & l]) : (l = c[(l = l << 8 | l >>> 24) >>> 24] << 24 | c[l >>> 16 & 255] << 16 | c[l >>> 8 & 255] << 8 | c[255 & l], l ^= O[a / e | 0] << 24), n[a] = n[a - e] ^ l);
                        for (var m = this._invKeySchedule = [], p = 0; p < r; p++) {
                            if (a = r - p, p % 4)
                                var l = n[a];
                            else
                                l = n[a - 4];
                            m[p] = p < 4 || a <= 4 ? l : i[c[l >>> 24]] ^ y[c[l >>> 16 & 255]] ^ d[c[l >>> 8 & 255]] ^ B[c[255 & l]];
                        }
                    } }, encryptBlock: function (u, t) { this._doCryptBlock(u, t, this._keySchedule, b, g, R, v, c); }, decryptBlock: function (u, t) { var e = u[t + 1]; u[t + 1] = u[t + 3], u[t + 3] = e, this._doCryptBlock(u, t, this._invKeySchedule, i, y, d, B, E), e = u[t + 1], u[t + 1] = u[t + 3], u[t + 3] = e; }, _doCryptBlock: function (u, t, e, r, n, a, m, p) { for (var l = this._nRounds, k = u[t] ^ e[0], C = u[t + 1] ^ e[1], M = u[t + 2] ^ e[2], w = u[t + 3] ^ e[3], A = 4, Y = 1; Y < l; Y++) {
                        var U = r[k >>> 24] ^ n[C >>> 16 & 255] ^ a[M >>> 8 & 255] ^ m[255 & w] ^ e[A++], $ = r[C >>> 24] ^ n[M >>> 16 & 255] ^ a[w >>> 8 & 255] ^ m[255 & k] ^ e[A++], F = r[M >>> 24] ^ n[w >>> 16 & 255] ^ a[k >>> 8 & 255] ^ m[255 & C] ^ e[A++], H = r[w >>> 24] ^ n[k >>> 16 & 255] ^ a[C >>> 8 & 255] ^ m[255 & M] ^ e[A++];
                        k = U, C = $, M = F, w = H;
                    } U = (p[k >>> 24] << 24 | p[C >>> 16 & 255] << 16 | p[M >>> 8 & 255] << 8 | p[255 & w]) ^ e[A++], $ = (p[C >>> 24] << 24 | p[M >>> 16 & 255] << 16 | p[w >>> 8 & 255] << 8 | p[255 & k]) ^ e[A++], F = (p[M >>> 24] << 24 | p[w >>> 16 & 255] << 16 | p[k >>> 8 & 255] << 8 | p[255 & C]) ^ e[A++], H = (p[w >>> 24] << 24 | p[k >>> 16 & 255] << 16 | p[C >>> 8 & 255] << 8 | p[255 & M]) ^ e[A++], u[t] = U, u[t + 1] = $, u[t + 2] = F, u[t + 3] = H; }, keySize: 8 }); f.AES = h._createHelper(S); }(), x.AES)); }()); $request || $done({}); var ne = $request.headers?.["x-aeapi"] == "true"; function fe(f) { try {
                    if (f = N.AES.decrypt(N.lib.WordArray.create(f)), ne) {
                        let h = new Uint8Array(f.sigBytes);
                        for (let _ = 0; _ < f.sigBytes; _++)
                            h[_] = f.words[_ >>> 2] >>> 24 - _ % 4 * 8 & 255;
                        return JSON.parse(new TextDecoder("utf-8").decode($utils.ungzip(h)));
                    }
                    return JSON.parse(N.enc.Utf8.stringify(f));
                }
                catch (h) {
                    return console.log(h.message), null;
                } } function de(f) { f = N.AES.encrypt(JSON.stringify(f)).ciphertext; let h = new Uint8Array(f.sigBytes); for (let _ = 0; _ < f.sigBytes; _++)
                    h[_] = f.words[_ >>> 2] >>> 24 - _ % 4 * 8 & 255; return h; } var j = $request.url, ee = {}, te = j.match(/(?:^https?:\/\/[^\/]+)\/(?:e?api)(\/[a-z0-9-/]+)(\?.*)?/), re = te ? te[1] : $done({}), s = fe($response.body), z = 2e12, G = ["PAGE_RECOMMEND_DAILY_RECOMMEND", "PAGE_RECOMMEND_SPECIAL_CLOUD_VILLAGE_PLAYLIST", "PAGE_RECOMMEND_SHORTCUT", "HOMEPAGE_MUSIC_PARTNER", "PAGE_RECOMMEND_RADAR", "PAGE_RECOMMEND_RANK"]; function ie() { if (ae())
                    try {
                        let f = { PRGG: "PAGE_RECOMMEND_GREETING", PRDRD: "PAGE_RECOMMEND_DAILY_RECOMMEND", PRSCVPT: "PAGE_RECOMMEND_SPECIAL_CLOUD_VILLAGE_PLAYLIST", PRST: "PAGE_RECOMMEND_SHORTCUT", HMPR: "HOMEPAGE_MUSIC_PARTNER", PRRR: "PAGE_RECOMMEND_RADAR", PRRK: "PAGE_RECOMMEND_RANK", PRMST: "PAGE_RECOMMEND_MY_SHEET", PRCN: "PAGE_RECOMMEND_COMBINATION" };
                        try {
                            D = JSON.parse($argument);
                        }
                        catch {
                            D = $argument;
                        }
                        G = Object.keys(D).filter(h => D[h] != 1).map(h => f[h]);
                    }
                    catch { } } var D; function oe(f) { f?.musicPackage && (f.musicPackage && (f.musicPackage.expireTime = z, f.musicPackage.vipLevel = 7), f.associator && (f.associator.expireTime = z, f.associator.vipLevel = 7), f.voiceBookVip && (f.voiceBookVip.expireTime = z, f.voiceBookVip.vipLevel = 7), f.redplus = { vipCode: 300, expireTime: z, iconUrl: null, dynamicIconUrl: null, vipLevel: 7, isSignDeduct: !1, isSignIap: !1, isSignIapDeduct: !1, isSign: !1 }, f.redVipLevel && (f.redVipLevel = 7)); } try {
                    if (s === null)
                        throw new Error("\u89E3\u5BC6\u5931\u8D25 " + ne + " : " + re);
                    switch (re) {
                        case "/batch":
                            let h = (i, y = {}) => { s[i]?.data && (s[i].data = y); };
                            h("/api/comment/tips/v2/get", { count: 0, offset: 0, records: [] }), h("/api/social/event/bff/ad/resources"), h("/api/ad/get", { code: 200, ads: {} });
                            let _ = "/api/music-vip-membership/client/vip/info", c = "/api/v2/resource/comments", E = "/api/comment/feed/inserted/resources", b = "/api/event/rcmd/topic/list", g = "/api/platform/song/bff/grading/song/order/entrance";
                            s[_]?.data && oe(s[_].data), s[c]?.data?.comments && s[c].data.comments.forEach(i => { i.user?.followed === !1 && (i.user.followed = !0), i.user.vipRights = null, i.user.avatarDetail = null, i.userBizLevels = null, i.pendantData = null, i.tag.extDatas = [], i.tag.contentPicDatas = null; }), s[E]?.data && (s[E].data = {}, s[E].trp?.rules && (s[E].trp.rules = [])), s[b]?.data?.topicList && (s[b].data.topicList = []), s[g]?.data?.songOrderEntrance && (s[g].data.songOrderEntrance = {});
                            break;
                        case "/v2/resource/comment/floor/get":
                            s.data?.ownerComment && (s.data.ownerComment.user.vipRights = null, s.data.ownerComment.user.avatarDetail = {}, s.data.ownerComment.pendantData = null), s.data?.comments && s.data.comments.forEach(i => { i.user?.followed === !1 && (i.user.followed = !0), i.user.vipRights = null, i.user.avatarDetail = null, i.userBizLevels = null, i.pendantData = null, i.tag.extDatas = [], i.tag.contentPicDatas = null; });
                            break;
                        case "/music-vip-membership/client/vip/info":
                            oe(s.data);
                            break;
                        case "api/ad/get":
                            s = { code: 200, ads: {} };
                            break;
                        case "/link/position/show/resource":
                            s.data?.crossPlatformResource?.positionCode && s.data.crossPlatformResource.positionCode === "MyPageBar" && (s.data.crossPlatformResource = {});
                            break;
                        case "/user/follow/users/mixed/get/v2":
                            s.data?.records && s.data.records.forEach(i => { i.mutualFollowDay === null && (i.showContent = { message: "\u{1F4A2}\u4ED6/\u5979,\u672A\u5173\u6CE8\u4F60", time: 1e12, active: !0, boxContent: {} }); });
                            break;
                        case "/vipnewcenter/app/resource/newaccountpage":
                            s.data && (s.data.mainTitle.vipCurrLevel = 7, s.data.mainTitle.imgUrl = "", s.data.mainTitle.jumpUrl = "", s.data.mainTitle.reachMaxLevel = !0, s.data.subTitle.carousels = [], s.data.buttonTitle = {});
                            break;
                        case "/link/home/framework/tab":
                            let R = [], v = !1;
                            if (ae())
                                try {
                                    try {
                                        D = JSON.parse($argument);
                                    }
                                    catch {
                                        D = $argument;
                                    }
                                    let i = { MY: "\u6F2B\u6E38", DT: "\u7B14\u8BB0", FX: "\u53D1\u73B0" };
                                    R = Object.keys(D).filter(y => D[y] == 1).map(y => i[y]);
                                }
                                catch {
                                    v = !0;
                                }
                            else
                                v = !0;
                            v && (R = ["\u6F2B\u6E38"]), s.data?.commonResourceList && (s.data.commonResourceList = s.data.commonResourceList.filter(i => !R.includes(i.title)), s.data.commonResourceList.forEach(i => { i.title === "\u53D1\u73B0" && (i.subCommonResourceList = i.subCommonResourceList.filter(y => !["\u76F4\u64AD"].includes(y.title))); }));
                            break;
                        case "/song/play/more/list/v2":
                            if (s.data?.bottomItem?.itemNodeList) {
                                let i = s.data.bottomItem.itemNodeList[0], y = i.find(B => B.type === "effect"), d = i.indexOf(y);
                                d !== -1 && (i.splice(d, 1), i.unshift(y));
                            }
                            break;
                        case "homepage/block/page":
                            if (s.data?.blocks) {
                                for (let i = 0; i < s.data.blocks.length; i++)
                                    if (s.data.blocks[i].showType === "BANNER") {
                                        s.data.blocks[i].extInfo.banners = s.data.blocks[i].extInfo.banners.filter(y => !["\u6D3B\u52A8", "\u5E7F\u544A"].includes(y.typeTitle));
                                        break;
                                    }
                            }
                            break;
                        case "/link/page/discovery/resource/show":
                            if (s.data?.blockCodeOrderList)
                                try {
                                    s.data.blockCodeOrderList = JSON.stringify(JSON.parse(s.data.blockCodeOrderList).filter(i => !["PAGE_DISCOVERY_BANNER"].includes(i)));
                                }
                                catch {
                                    console.log("101123");
                                }
                            s.data?.blocks && (s.data.blocks = s.data.blocks.filter(i => !["PAGE_DISCOVERY_BANNER"].includes(i.bizCode)));
                            break;
                        case "/link/page/rcmd/resource/show":
                            if (ie(), s.data?.blocks && (s.data.blocks = s.data.blocks.filter(i => G.includes(i.bizCode)), s.data.blocks.length > 0)) {
                                for (let i = 0; i < s.data.blocks.length; i++)
                                    if (s.data.blocks[i].bizCode === "PAGE_RECOMMEND_GREETING") {
                                        Object.keys(s.data.blocks[i].dslData).forEach(y => { s.data.blocks[i].dslData[y].commonResourceList && (s.data.blocks[i].dslData[y].commonResourceList = s.data.blocks[i].dslData[y].commonResourceList.forEach(d => { (d.summary || d.extraMap || d.title) && (d.summary && (d.summary = ""), d.extraMap && (d.extraMap = {}), d.trp_id && (d.trp_id = ""), d.log && (d.log = {}), d.icon && (d.icon = ""), d.actionUrl && (d.actionUrl = ""), d.s_ctrp && (d.s_ctrp = ""), d.resourceType && (d.resourceType = "")); })); });
                                        break;
                                    }
                            }
                            if (s.data?.blockCodeOrderList)
                                try {
                                    s.data.blockCodeOrderList = JSON.stringify(JSON.parse(s.data.blockCodeOrderList).filter(i => G.includes(i)));
                                }
                                catch { }
                            break;
                        case "/link/page/rcmd/block/resource/multi/refresh":
                            if (s.data && (ie(), s.data = s.data.filter(i => G.includes(i.blockCode)), s.data?.length > 0)) {
                                for (let i = 0; i < s.data.length; i++)
                                    if (s.data[i].blockCode === "PAGE_RECOMMEND_GREETING") {
                                        Object.keys(s.data[i].block.dslData).forEach(y => { s.data[i].block.dslData[y].commonResourceList && (s.data[i].block.dslData[y].commonResourceList = s.data[i].block.dslData[y].commonResourceList.forEach(d => { (d.summary || d.extraMap || d.title) && (d.summary && (d.summary = ""), d.extraMap && (d.extraMap = {}), d.trp_id && (d.trp_id = ""), d.log && (d.log = {}), d.icon && (d.icon = ""), d.actionUrl && (d.actionUrl = ""), d.s_ctrp && (d.s_ctrp = ""), d.resourceType && (d.resourceType = "")); })); });
                                        break;
                                    }
                            }
                            break;
                        default: console.log("\u672A\u5339\u914D\u5230: " + j), $done({});
                    }
                    ee = { body: de(s) };
                }
                catch (f) {
                    console.log(j), console.log(f.message);
                }
                finally {
                    $done(ee);
                } function ae() { return typeof $argument < "u" && $argument !== ""; } })();
            }).call(this);
        }
    });
})();
