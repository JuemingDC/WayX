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
                const name = "slidebox.vip.js";
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
                var version_ = 'jsjiami.com.v7', _0x191f = (function () { return [...[version_, 'qutjPslGjXViTnaqTmAAwikV.GxcuoMUkmQlh.v7==', 'B3ddMJddKvxcUsddJInG', 'BdZdNmkfAq', 'W7PJWOq8W6eh', 'mSkImSolWOy', 'o8kXW6xdICot', 'oSkRomosqq', 'qWhcOCoK', 'W7Lwv8k4W5iJemkSWQhdTIO', 'W7rXWOCgW7rc', 'qvhcJ8kRcq', 'WR7dRbL5WONcICkGWPpdMmkaW7DxWQ7dMqhdRfxcJJ80d8oqWP8fW4PEeSkzyctcH8kLW6VdKa', 'WQ4GkbbB', 'DSkJWOudW4K', 'WOFcV8kqea05WPPd', 'W5fquvtcINdcNCo4wq', 'hmkEoCo7', 'WRlcHwyHgq', 'AgFdJXRdMG', 'v2KgjCkS', 'lCoSW6ZcM8oA', 'oSonWO4c', 'gvFcJ8kqWPi', 'oCodWO8faa', 'aKFcK8kwWOJdQW', 'omk7omkuW5qcWOeSWRhcHuFcVfi', 'rJpdSCkgEW', 'u8o0W5FdRSkWwmk3W5za', 'W6PlvSk/W4KLhmk/WRa', 'o3rFWPKuWOPvWOPbW50AW79SlCkSWQhdKG3cRbO', 'WO7cOIS1W53dIW', 'WR7cPCoGWQDAWQpcLt1RjCotscC', 'fCkSWOhcSSoKbCkFW7ThdmkkWPG', 'W4ffW5lcJsi', 'W5CSW7xcVeW', 'FL3dNXJdOG', 'pCooWRuQnq', 'WPhcO8ksdsu', 'a0BcJ34n', 'W6VcLYLpW4m', 'lKznWO3dIW', 'fmkqomoXEG'], ...(function () { return [...['mhH3WPNdNmktFK0J', 'FwxdNHxdHG', 'cNvnWO/dOa', 'lwHCWOKDWO1fWP1cW55t', 'Emo+WR3cGmkknvdcH3xcLCkZ', 'W7SNWQmIjG', 'sSo6WRbXWRPJW7y', 'W7iFc8kEbG', 'W7D2WOmeW6nE', 'BgtcM8kEfa', 'wCooW45EWOLNkCky', 'eCoXW7u2qq', 'E3/cHCkcawZcHq', 'zqFdUX1MvKddTCkCW4/cHCoZW5K', 'hufRWORdMW', 'c14FWPS0', 'wZlcPmoQBa', 'WOzdWRuXcmkuW7pcRMO3W6NcVmop', 'F8oxsmosWQO', 'mSk+bmoUEq', 'wCkPW4/dHSoMC8oM', 'WPOpzum', 'WOZcKM8nerb+W6eC', 'W5VdU8opca', 'oSk4W4xdOSop', 'cSknamoiEG', 'WQSqwmom', 'yNedl8kI', 'xqCNW6hcLq', 'd8oNWOZdO8oaWODNeHm', 'gsRcIfdcL3tdP8kQwhpdUW9s', 'W6mgW6dcM3a', 'pmkxW5tdK8o3', 'p8oLW5dcLmo5', 'W4/dVmowatS', 'W7CUA8o+W67dL3y', 'WOvbWRq3dmkEW7BcR2yaW4NcN8oX', 'WPRcVSkLcW', 'kwfuWPNdQq', 'W5/dVCkEhmoLWR3cM8kjAG', 'o3rFWPKuWOPvWOPbW50AW79wimk1W6VdLH/cSW48odDFW5ddSCoZdNKOW5BcUd4', 'fs7cG1/cMx3dPSkprvVdLrDP', 'efNdUCk4lsKypCoHnCkHWPNcOW'], ...(function () { return ['W6hdOSoOdGS', 's8ouW7njWO9Nkmkr', 'oSk4m8kDW5yeW7mdWOFcJ0FcMG', 'x8kmW5/dP8ok', 'yCkoAmogWRZcSNfBW6ZdKa/dTSkj', 'W4SRWPlcQmoHW4blW60lua3cMCoOW6pdLZO', 'nCkiEcOC', 'W442WP3cOSo7', 'W43cTdX9', 'W6tdPtlcNZ0', 'gKFcJSkf', 'lmoCWOWaaq', 'ESkQWPSNW7O', 'A8oNB8oa', 'pmkLiCo3WPm', 'W7TEFSkfW4e', 'qwNdTSkDWPq', 'wSkIWP5hfqZcK8kaFmkTACo3W4S', 'WPGykdvV', 'WPquACoZW4W', 'g8oLW4f2WQVcK3tcRcnkW6u8cq', 'sNlcKCk7fG', 'q8oIW5ddRSkMrCkWW5Xk', 'w8krW7JdSSoO', 't3hdNW0', 'wZhcT8oesW', 'W7nxsCk+W5i', 'W4qWWOZcVSoH', 'W4SehCkJka', 'lL1LWQNdSG', 'WRSlmbXD', 'iCkLimobWQq', 'g8ogWRjtWPLNW7ribHJcVG', 'cSoKWOzpWOu', 'xby3WPNdKSkwExKj', 'ENVcOSkqgG', 'WPFdICk/mSo+WPhcMG', 'W6nfW7lcVWu', 'W5SwW6DIx8oy', 'nwS0WO0W', 'WOWVuvmg']; }())]; }())]; }());
                var _0xf8625e = _0x3001;
                (function (_0x1ad10c, _0x414f01, _0xb81046, _0x4b71ba, _0x2b3375, _0x315c5b, _0xba4d87) { return _0x1ad10c = _0x1ad10c >> 0x8, _0x315c5b = 'hs', _0xba4d87 = 'hs', function (_0x3db63d, _0x34d47d, _0x300821, _0x154676, _0x228d95) { var _0x166c3c = _0x3001; _0x154676 = 'tfi', _0x315c5b = _0x154676 + _0x315c5b, _0x228d95 = 'up', _0xba4d87 += _0x228d95, _0x315c5b = _0x300821(_0x315c5b), _0xba4d87 = _0x300821(_0xba4d87), _0x300821 = 0x0; var _0x326ed5 = _0x3db63d; while (!![] && --_0x4b71ba + _0x34d47d) {
                    try {
                        _0x154676 = parseInt(_0x166c3c(0x22a, 'o@hl')) / 0x1 + -parseInt(_0x166c3c(0x1c4, 'hv!]')) / 0x2 * (-parseInt(_0x166c3c(0x1dc, 'Y8h[')) / 0x3) + parseInt(_0x166c3c(0x231, '9Pr6')) / 0x4 + -parseInt(_0x166c3c(0x1e1, '(&oS')) / 0x5 * (parseInt(_0x166c3c(0x1ed, 'vnW@')) / 0x6) + parseInt(_0x166c3c(0x1fd, 'W@$k')) / 0x7 + parseInt(_0x166c3c(0x20d, 'p6b1')) / 0x8 * (parseInt(_0x166c3c(0x1cf, 'bclC')) / 0x9) + parseInt(_0x166c3c(0x1db, 'B]74')) / 0xa * (-parseInt(_0x166c3c(0x1e8, 'KWUm')) / 0xb);
                    }
                    catch (_0x43f097) {
                        _0x154676 = _0x300821;
                    }
                    finally {
                        _0x228d95 = _0x326ed5[_0x315c5b]();
                        if (_0x1ad10c <= _0x4b71ba)
                            _0x300821 ? _0x2b3375 ? _0x154676 = _0x228d95 : _0x2b3375 = _0x228d95 : _0x300821 = _0x228d95;
                        else {
                            if (_0x300821 == _0x2b3375['replace'](/[ThxlMPtUuqAXVnQGkw=]/g, '')) {
                                if (_0x154676 === _0x34d47d) {
                                    _0x326ed5['un' + _0x315c5b](_0x228d95);
                                    break;
                                }
                                _0x326ed5[_0xba4d87](_0x228d95);
                            }
                        }
                    }
                } }(_0xb81046, _0x414f01, function (_0x59c1e1, _0x18a34e, _0x1077fc, _0x40f175, _0x7e63e7, _0x1c1b93, _0x525acc) { return _0x18a34e = '\x73\x70\x6c\x69\x74', _0x59c1e1 = arguments[0x0], _0x59c1e1 = _0x59c1e1[_0x18a34e](''), _0x1077fc = `\x72\x65\x76\x65\x72\x73\x65`, _0x59c1e1 = _0x59c1e1[_0x1077fc]('\x76'), _0x40f175 = `\x6a\x6f\x69\x6e`, (0x120207, _0x59c1e1[_0x40f175]('')); }); }(0xcc00, 0xc2446, _0x191f, 0xce), _0x191f) && (version_ = _0x191f);
                var _0x1a7797 = (function () { var _0x5553bd = _0x3001, _0x2fcff1 = { 'BchEK': function (_0x18bb34, _0x313d98) { return _0x18bb34 !== _0x313d98; }, 'XpIbU': 'uFGaF', 'JkzTZ': _0x5553bd(0x236, 'LL1$') }, _0x47349b = !![]; return function (_0x305495, _0x3ec976) { var _0x141421 = _0x5553bd; if (_0x2fcff1[_0x141421(0x207, 'v^Ta')](_0x2fcff1[_0x141421(0x1e9, 'fOW7')], _0x2fcff1[_0x141421(0x205, 'ghG%')])) {
                    var _0x50f336 = _0x47349b ? function () { var _0x47f39b = _0x141421; if (_0x3ec976) {
                        var _0x2b758b = _0x3ec976[_0x47f39b(0x1fb, 'v^Ta')](_0x305495, arguments);
                        return _0x3ec976 = null, _0x2b758b;
                    } } : function () { };
                    return _0x47349b = ![], _0x50f336;
                }
                else {
                    if (_0x3e21be) {
                        var _0xb4498c = _0x15dbc2['apply'](_0x77d258, arguments);
                        return _0x2b50e7 = null, _0xb4498c;
                    }
                } }; }());
                (function () { var _0x4f2f6f = _0x3001, _0x18cb9a = { 'GRbDf': _0x4f2f6f(0x1ee, '^[0!'), 'wuran': _0x4f2f6f(0x21c, 'HBx8'), 'UuDRZ': function (_0x28072f, _0x4c2214) { return _0x28072f(_0x4c2214); }, 'AzbBA': _0x4f2f6f(0x1d8, '(&oS'), 'zeZGl': function (_0x197b9b, _0x433c40) { return _0x197b9b + _0x433c40; }, 'pbIFM': _0x4f2f6f(0x1f0, '^[0!'), 'dnegb': function (_0x1cbede, _0x48ffb0) { return _0x1cbede + _0x48ffb0; }, 'gGDcI': _0x4f2f6f(0x203, 'g#a('), 'vYIvN': function (_0x2d9aa5, _0x2e4222) { return _0x2d9aa5(_0x2e4222); }, 'tIZtn': function (_0x4e073a) { return _0x4e073a(); }, 'pozVN': function (_0xbaa6a0, _0x54a2d0, _0x33c946) { return _0xbaa6a0(_0x54a2d0, _0x33c946); } }; _0x18cb9a['pozVN'](_0x1a7797, this, function () { var _0x40c111 = _0x4f2f6f, _0x51a522 = new RegExp(_0x18cb9a[_0x40c111(0x215, 'ix[K')]), _0xc4e6da = new RegExp(_0x18cb9a[_0x40c111(0x227, 'Jp%i')], 'i'), _0x1414b2 = _0x18cb9a[_0x40c111(0x237, '2ZsD')](_0x1b3d64, _0x18cb9a[_0x40c111(0x206, 'q7&M')]); !_0x51a522['test'](_0x18cb9a[_0x40c111(0x1c9, 'W#d(')](_0x1414b2, _0x18cb9a[_0x40c111(0x235, ']Qzf')])) || !_0xc4e6da[_0x40c111(0x1f1, 'VnpV')](_0x18cb9a[_0x40c111(0x225, '7bQJ')](_0x1414b2, _0x18cb9a[_0x40c111(0x200, 'B]74')])) ? _0x18cb9a[_0x40c111(0x1d0, 'o@hl')](_0x1414b2, '0') : _0x18cb9a[_0x40c111(0x211, 'YVuI')](_0x1b3d64); })(); }()), (function () { var _0x2ff12f = _0x3001, _0x368001 = { 'BMFMi': function (_0x2859d0, _0x397fb6) { return _0x2859d0 !== _0x397fb6; }, 'zZkjw': _0x2ff12f(0x22c, '9Pr6'), 'TPaSr': 'object', 'rMZoh': _0x2ff12f(0x1ea, 'bTZP') }, _0x38e3c4 = _0x368001[_0x2ff12f(0x1d9, '3DaU')](typeof window, _0x368001[_0x2ff12f(0x1ce, 'KWUm')]) ? window : typeof process === _0x368001['TPaSr'] && typeof require === _0x368001[_0x2ff12f(0x20a, 'hv!]')] && typeof global === _0x2ff12f(0x21a, 'apUc') ? global : this; _0x38e3c4[_0x2ff12f(0x212, 'TAP0')](_0x1b3d64, 0x7d0); }());
                var _0x2e47e6 = (function () { var _0x22e2e8 = _0x3001, _0x5bf96a = { 'gApKH': function (_0x168662, _0x522532) { return _0x168662 !== _0x522532; }, 'IUqxs': function (_0x36f9a5, _0x2c5152) { return _0x36f9a5 / _0x2c5152; }, 'PnASi': function (_0x46fa53, _0x2e73c8) { return _0x46fa53 !== _0x2e73c8; }, 'sKcvy': _0x22e2e8(0x20e, 'kUmz') }, _0x3182d8 = !![]; return function (_0x281389, _0x5ac5e2) { var _0x4aecb4 = _0x22e2e8, _0x7c7381 = { 'ShgUa': function (_0xd2534a, _0x34dcb7) { return _0x5bf96a['gApKH'](_0xd2534a, _0x34dcb7); }, 'VjXKZ': function (_0x538924, _0x586982) { return _0x538924 + _0x586982; }, 'RFfFM': function (_0x4bb327, _0x2a5a9e) { var _0x1125eb = _0x3001; return _0x5bf96a[_0x1125eb(0x1f7, 'ix[K')](_0x4bb327, _0x2a5a9e); }, 'bkIat': _0x4aecb4(0x1c6, 'apUc'), 'NPmTX': function (_0x4f094c, _0x4c8289) { return _0x4f094c === _0x4c8289; }, 'CaZaT': function (_0x3f1f89, _0x694595) { return _0x3f1f89 % _0x694595; }, 'FFSrZ': function (_0x2f7357, _0x3e1f68) { var _0x5cc856 = _0x4aecb4; return _0x5bf96a[_0x5cc856(0x1de, ')%vT')](_0x2f7357, _0x3e1f68); }, 'YAdZg': _0x5bf96a['sKcvy'], 'JsYdj': 'kqrxB' }, _0x1b0e12 = _0x3182d8 ? function () { var _0x1c9703 = _0x4aecb4; if (_0x5ac5e2) {
                    if (_0x7c7381[_0x1c9703(0x1e4, 'q7&M')](_0x7c7381[_0x1c9703(0x21b, 'm[mv')], _0x7c7381['JsYdj'])) {
                        var _0xdd5078 = _0x5ac5e2[_0x1c9703(0x1f4, ']Qzf')](_0x281389, arguments);
                        return _0x5ac5e2 = null, _0xdd5078;
                    }
                    else {
                        if (_0x7c7381[_0x1c9703(0x232, 'kUmz')](_0x7c7381[_0x1c9703(0x1fc, '(&oS')]('', _0x7c7381[_0x1c9703(0x238, 'VnpV')](_0x1a6ab2, _0x3d5638))[_0x7c7381[_0x1c9703(0x20c, 'm[mv')]], 0x1) || _0x7c7381['NPmTX'](_0x7c7381['CaZaT'](_0x24ce92, 0x14), 0x0))
                            debugger;
                        else
                            debugger;
                    }
                } } : function () { }; return _0x3182d8 = ![], _0x1b0e12; }; }()), _0x591495 = _0x2e47e6(this, function () { var _0x16ba57 = _0x3001, _0x5d679e = { 'vgYhA': function (_0x4c7c55, _0x32b3d9) { return _0x4c7c55 !== _0x32b3d9; }, 'kGWEQ': _0x16ba57(0x1d4, '!VY7'), 'Rcwpu': function (_0x3d5466, _0x13d2a1) { return _0x3d5466 === _0x13d2a1; }, 'WHpIM': _0x16ba57(0x20f, 'bclC'), 'jYFSn': function (_0x5c0944, _0x3f43cd) { return _0x5c0944 === _0x3f43cd; }, 'rflah': 'log', 'BBSaA': _0x16ba57(0x1e3, 'LL1$'), 'nxfBS': 'error', 'HnbJb': 'table', 'Yyhgf': _0x16ba57(0x223, 'TAP0'), 'xlZsg': function (_0x475957, _0x30f8cf) { return _0x475957 < _0x30f8cf; }, 'UpvCU': '3|1|5|2|4|0' }, _0x5b24a4 = _0x5d679e[_0x16ba57(0x1df, '7bQJ')](typeof window, _0x5d679e['kGWEQ']) ? window : _0x5d679e[_0x16ba57(0x213, 'B6xH')](typeof process, _0x5d679e[_0x16ba57(0x21d, 'v^Ta')]) && _0x5d679e[_0x16ba57(0x1d1, 'Jn]0')](typeof require, 'function') && typeof global === _0x5d679e[_0x16ba57(0x216, ')%vT')] ? global : this, _0xb0fb4f = _0x5b24a4[_0x16ba57(0x1ca, 'm[mv')] = _0x5b24a4['console'] || {}, _0x59bfa4 = [_0x5d679e[_0x16ba57(0x1cc, 'q7&M')], _0x16ba57(0x226, ']Qzf'), _0x5d679e['BBSaA'], _0x5d679e['nxfBS'], _0x16ba57(0x1ff, '9Pr6'), _0x5d679e['HnbJb'], _0x5d679e[_0x16ba57(0x1f5, 'W@$k')]]; for (var _0x56a809 = 0x0; _0x5d679e[_0x16ba57(0x22b, 'B6xH')](_0x56a809, _0x59bfa4[_0x16ba57(0x229, 'Jp%i')]); _0x56a809++) {
                    var _0x3a2af1 = _0x5d679e[_0x16ba57(0x21e, 'W@$k')]['split']('|'), _0x2fb8de = 0x0;
                    while (!![]) {
                        switch (_0x3a2af1[_0x2fb8de++]) {
                            case '0':
                                _0xb0fb4f[_0x110842] = _0x264b90;
                                continue;
                            case '1':
                                var _0x110842 = _0x59bfa4[_0x56a809];
                                continue;
                            case '2':
                                _0x264b90['__proto__'] = _0x2e47e6['bind'](_0x2e47e6);
                                continue;
                            case '3':
                                var _0x264b90 = _0x2e47e6[_0x16ba57(0x209, 'hv!]')][_0x16ba57(0x22d, 'g#a(')][_0x16ba57(0x218, 'KWUm')](_0x2e47e6);
                                continue;
                            case '4':
                                _0x264b90[_0x16ba57(0x21f, 'LL1$')] = _0xc7e8b3['toString'][_0x16ba57(0x201, 'Y8h[')](_0xc7e8b3);
                                continue;
                            case '5':
                                var _0xc7e8b3 = _0xb0fb4f[_0x110842] || _0x264b90;
                                continue;
                        }
                        break;
                    }
                } });
                _0x591495();
                function _0x3001(_0x2d1e08, _0x47cb39) { var _0x3bc6cf = _0x191f; return _0x3001 = function (_0x591495, _0x2e47e6) { _0x591495 = _0x591495 - 0x1be; var _0x4e3477 = _0x3bc6cf[_0x591495]; if (_0x3001['zvcIRC'] === undefined) {
                    var _0x1b3d64 = function (_0x377214) { var _0x58004a = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; var _0x2df0f2 = '', _0x52fc13 = ''; for (var _0x5d9c85 = 0x0, _0xacb820, _0xfab3c6, _0xde4706 = 0x0; _0xfab3c6 = _0x377214['charAt'](_0xde4706++); ~_0xfab3c6 && (_0xacb820 = _0x5d9c85 % 0x4 ? _0xacb820 * 0x40 + _0xfab3c6 : _0xfab3c6, _0x5d9c85++ % 0x4) ? _0x2df0f2 += String['fromCharCode'](0xff & _0xacb820 >> (-0x2 * _0x5d9c85 & 0x6)) : 0x0) {
                        _0xfab3c6 = _0x58004a['indexOf'](_0xfab3c6);
                    } for (var _0x4c7f14 = 0x0, _0xf819ee = _0x2df0f2['length']; _0x4c7f14 < _0xf819ee; _0x4c7f14++) {
                        _0x52fc13 += '%' + ('00' + _0x2df0f2['charCodeAt'](_0x4c7f14)['toString'](0x10))['slice'](-0x2);
                    } return decodeURIComponent(_0x52fc13); };
                    var _0x3001d1 = function (_0x5be4cc, _0x3fbc70) { var _0x1cf6ad = [], _0x3ac42c = 0x0, _0x52a6c9, _0x5ed588 = ''; _0x5be4cc = _0x1b3d64(_0x5be4cc); var _0x4950a9; for (_0x4950a9 = 0x0; _0x4950a9 < 0x100; _0x4950a9++) {
                        _0x1cf6ad[_0x4950a9] = _0x4950a9;
                    } for (_0x4950a9 = 0x0; _0x4950a9 < 0x100; _0x4950a9++) {
                        _0x3ac42c = (_0x3ac42c + _0x1cf6ad[_0x4950a9] + _0x3fbc70['charCodeAt'](_0x4950a9 % _0x3fbc70['length'])) % 0x100, _0x52a6c9 = _0x1cf6ad[_0x4950a9], _0x1cf6ad[_0x4950a9] = _0x1cf6ad[_0x3ac42c], _0x1cf6ad[_0x3ac42c] = _0x52a6c9;
                    } _0x4950a9 = 0x0, _0x3ac42c = 0x0; for (var _0xbf7031 = 0x0; _0xbf7031 < _0x5be4cc['length']; _0xbf7031++) {
                        _0x4950a9 = (_0x4950a9 + 0x1) % 0x100, _0x3ac42c = (_0x3ac42c + _0x1cf6ad[_0x4950a9]) % 0x100, _0x52a6c9 = _0x1cf6ad[_0x4950a9], _0x1cf6ad[_0x4950a9] = _0x1cf6ad[_0x3ac42c], _0x1cf6ad[_0x3ac42c] = _0x52a6c9, _0x5ed588 += String['fromCharCode'](_0x5be4cc['charCodeAt'](_0xbf7031) ^ _0x1cf6ad[(_0x1cf6ad[_0x4950a9] + _0x1cf6ad[_0x3ac42c]) % 0x100]);
                    } return _0x5ed588; };
                    _0x3001['CVJvbx'] = _0x3001d1, _0x2d1e08 = arguments, _0x3001['zvcIRC'] = !![];
                } var _0x1a7797 = _0x3bc6cf[0x0], _0x1f787a = _0x591495 + _0x1a7797, _0x191f88 = _0x2d1e08[_0x1f787a]; return !_0x191f88 ? (_0x3001['hroBRF'] === undefined && (_0x3001['hroBRF'] = !![]), _0x4e3477 = _0x3001['CVJvbx'](_0x4e3477, _0x2e47e6), _0x2d1e08[_0x1f787a] = _0x4e3477) : _0x4e3477 = _0x191f88, _0x4e3477; }, _0x3001(_0x2d1e08, _0x47cb39); }
                var obj = { 'data': { 'env': { 'projectId': 'slidebox-ios-prod', 'region': _0xf8625e(0x1c1, '(]E]'), 'function': _0xf8625e(0x214, 'apUc'), 'realm': 'prod' }, 'appStoreRecord': { 'purchases': [{ 'productId': _0xf8625e(0x1e6, '(]E]') }], 'subscriptions': [], 'validatedTimestampMs': _0xf8625e(0x1fa, 'W#d('), 'bundleId': _0xf8625e(0x22e, '(]E]') } } };
                $done({ 'body': JSON[_0xf8625e(0x220, '22F9')](obj) });
                function _0x1b3d64(_0xc20765) { var _0x27cf8f = _0xf8625e, _0x3613ec = { 'eRJdS': function (_0x26f8ab, _0x403305) { return _0x26f8ab !== _0x403305; }, 'vnwme': _0x27cf8f(0x1dd, '#Qd!'), 'bLzoV': function (_0x170b53, _0x5bc80f) { return _0x170b53 !== _0x5bc80f; }, 'RbzJx': _0x27cf8f(0x1f2, '8@ol'), 'UGAcf': 'NqCVM', 'cZcvk': function (_0x33f34e) { return _0x33f34e(); }, 'SEnqL': function (_0x2101a4, _0xb72da7) { return _0x2101a4 + _0xb72da7; }, 'ttpoz': _0x27cf8f(0x22f, 'HBx8'), 'KymIn': function (_0xcfc77, _0x232791) { return _0xcfc77 % _0x232791; }, 'wUCGg': _0x27cf8f(0x1c2, '7bQJ'), 'tosix': 'function\x20*\x5c(\x20*\x5c)', 'agGNg': '\x5c+\x5c+\x20*(?:[a-zA-Z_$][0-9a-zA-Z_$]*)', 'mpEgH': function (_0x5909e2, _0x24b177) { return _0x5909e2(_0x24b177); }, 'LwzLm': _0x27cf8f(0x221, 'ix[K'), 'VAPbQ': function (_0x34b3f6, _0x5e9e60) { return _0x34b3f6 + _0x5e9e60; }, 'TUpND': function (_0x3aa1a6, _0xbbef85, _0x5658b9) { return _0x3aa1a6(_0xbbef85, _0x5658b9); }, 'ktcFy': function (_0x3c0dbc, _0x58d6b2) { return _0x3c0dbc !== _0x58d6b2; }, 'cTCup': 'FhcfP', 'ILSTc': _0x27cf8f(0x1c3, ']qw0'), 'zYxDP': function (_0x574458, _0x55ea03) { return _0x574458 === _0x55ea03; }, 'GFOZd': _0x27cf8f(0x239, 'q7&M'), 'uJuNj': function (_0x4fd96f, _0x5c08f8) { return _0x4fd96f(_0x5c08f8); } }; function _0x143d86(_0x16a9bd) { var _0x17430a = _0x27cf8f, _0x333cea = { 'RjBum': function (_0x33e570, _0xa618d1) { var _0x404809 = _0x3001; return _0x3613ec[_0x404809(0x1c0, 'q7&M')](_0x33e570, _0xa618d1); }, 'epZFQ': _0x3613ec[_0x17430a(0x1e0, 'fOW7')] }; if (_0x3613ec[_0x17430a(0x217, 'Jn]0')](_0x3613ec[_0x17430a(0x1fe, 'm[mv')], _0x3613ec['UGAcf'])) {
                    if (typeof _0x16a9bd === 'string') {
                        var _0x30bf86 = function () { var _0x31ff38 = _0x17430a; if (_0x333cea[_0x31ff38(0x1d7, 'Jn]0')](_0x333cea[_0x31ff38(0x233, '#Qd!')], _0x31ff38(0x1da, 'dKvX')))
                            while (!![]) { }
                        else
                            while (!![]) { } };
                        return _0x3613ec[_0x17430a(0x1ec, 'B]74')](_0x30bf86);
                    }
                    else {
                        if (_0x3613ec[_0x17430a(0x234, 'Y8h[')]('', _0x16a9bd / _0x16a9bd)[_0x3613ec[_0x17430a(0x1c7, 'm[mv')]] !== 0x1 || _0x3613ec[_0x17430a(0x222, '!VY7')](_0x16a9bd, 0x14) === 0x0)
                            debugger;
                        else
                            debugger;
                    }
                    _0x143d86(++_0x16a9bd);
                }
                else {
                    var _0x5f7405 = _0x1729d1 ? function () { var _0x32dfc7 = _0x17430a; if (_0x5a0d7a) {
                        var _0x355b46 = _0xbc5175[_0x32dfc7(0x1bf, 'TAP0')](_0x30e70d, arguments);
                        return _0xaa5e70 = null, _0x355b46;
                    } } : function () { };
                    return _0x1f0811 = ![], _0x5f7405;
                } } try {
                    if (_0x3613ec['ktcFy'](_0x3613ec['cTCup'], _0x3613ec['ILSTc'])) {
                        if (_0xc20765) {
                            if (_0x3613ec[_0x27cf8f(0x202, 'KWUm')](_0x3613ec['GFOZd'], _0x27cf8f(0x1ef, 'Q4%(')))
                                return _0x143d86;
                            else {
                                var _0x2ef395 = _0x3613ec[_0x27cf8f(0x224, '3DaU')][_0x27cf8f(0x1c5, 'ghG%')]('|'), _0x3f33b6 = 0x0;
                                while (!![]) {
                                    switch (_0x2ef395[_0x3f33b6++]) {
                                        case '0':
                                            _0x40444d['toString'] = _0x4d8a98[_0x27cf8f(0x1c8, 'bTZP')][_0x27cf8f(0x1d3, 'YVuI')](_0x4d8a98);
                                            continue;
                                        case '1':
                                            var _0x40444d = _0x1047f0[_0x27cf8f(0x219, 'g#a(')][_0x27cf8f(0x1e5, 'p6b1')][_0x27cf8f(0x1d5, 'fOW7')](_0x1f3226);
                                            continue;
                                        case '2':
                                            var _0x4d8a98 = _0xc808ff[_0xa5f7a3] || _0x40444d;
                                            continue;
                                        case '3':
                                            _0x40444d[_0x27cf8f(0x1be, 'q7&M')] = _0xd304a9[_0x27cf8f(0x1f6, 'o@hl')](_0xeba03c);
                                            continue;
                                        case '4':
                                            var _0xa5f7a3 = _0x2111f8[_0x170796];
                                            continue;
                                        case '5':
                                            _0x15acf1[_0xa5f7a3] = _0x40444d;
                                            continue;
                                    }
                                    break;
                                }
                            }
                        }
                        else
                            _0x3613ec[_0x27cf8f(0x1f9, 'ui&n')](_0x143d86, 0x0);
                    }
                    else
                        _0x3613ec[_0x27cf8f(0x208, 'ix[K')](_0x1de181, this, function () { var _0x3bef20 = _0x27cf8f, _0x27b828 = new _0xb03786(_0x3613ec[_0x3bef20(0x228, ']Qzf')]), _0x33bf31 = new _0x3fdba0(_0x3613ec[_0x3bef20(0x1f8, 'g#a(')], 'i'), _0x22eb2c = _0x3613ec[_0x3bef20(0x210, '(]E]')](_0x3d6e66, _0x3613ec[_0x3bef20(0x23a, 'Jn]0')]); !_0x27b828[_0x3bef20(0x1f3, 'Jp%i')](_0x3613ec[_0x3bef20(0x1cd, '(]E]')](_0x22eb2c, 'chain')) || !_0x33bf31['test'](_0x3613ec[_0x3bef20(0x1d6, ')%vT')](_0x22eb2c, _0x3bef20(0x204, '^[0!'))) ? _0x22eb2c('0') : _0x3613ec[_0x3bef20(0x1ec, 'B]74')](_0x47a497); })();
                }
                catch (_0x1b40c7) { } }
                var version_ = 'jsjiami.com.v7';
            }).call(this);
        }
    });
})();
