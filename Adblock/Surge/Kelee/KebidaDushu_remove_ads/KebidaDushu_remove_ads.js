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
        })((undefined), { TextDecoder: typeof TextDecoder === 'undefined' ? undefined : TextDecoder }), http: typeof $httpClient === 'undefined' ? undefined : $httpClient, task: typeof $task === 'undefined' ? undefined : $task, store: typeof $persistentStore === 'undefined' ? undefined : $persistentStore, notify: typeof $notification === 'undefined' ? undefined : $notification, argument: typeof $argument === 'undefined' ? undefined : $argument, script: typeof $script === 'undefined' ? undefined : $script, environment: typeof $environment === 'undefined' ? undefined : $environment, compression: undefined, aes: undefined, global: globalThis, url: undefined };
    if ((__wayxHost.response === undefined ? 'request' : 'response') !== "response")
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
        const nativeStore = host.store;
        const storageKey = key => {
            if (key === undefined) {
                const name = "\u5E06\u4E66\u53BB\u5E7F\u544A";
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
        function notify(title = '', subtitle = '', body = '', option, delay) {
            ;
            const raw = typeof option === 'object' && option !== null ? option : {}, mapped = {};
            const open = typeof option === 'string' && true ? option : raw["openUrl"];
            const copy = raw['clipboard'];
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
            const media = raw["mediaUrl"];
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
        let argument = host.argument;
        ;
        const script = Object.assign({}, host.script, { name: "\u5E06\u4E66\u53BB\u5E7F\u544A" });
        if (script && script.startTime !== undefined) {
            const t = script.startTime;
            script.startTime = t instanceof Date ? t : new Date(t * 1000);
        }
        const environment = Object.assign({}, host.environment);
        const overlay = {
            $request: request, $response: response, $done: done, $script: script,
            $task: undefined, $httpClient: http,
            $prefs: undefined, $persistentStore: store,
            $notify: undefined, $notification: { post: notify },
            $argument: argument, $environment: environment, $loon: undefined
        };
        overlay.$utils = (function (host, config) {
            ;
            let provider;
            const proto = Object.getPrototypeOf(Uint8Array.prototype);
            const get = name => Object.getOwnPropertyDescriptor(proto, name).get;
            const tag = Object.getOwnPropertyDescriptor(proto, Symbol.toStringTag).get;
            const byteView = value => {
                if (tag.call(value) !== 'Uint8Array')
                    throw new TypeError('Loon gzip APIs require Uint8Array');
                return new Uint8Array(get('buffer').call(value), get('byteOffset').call(value), get('byteLength').call(value));
            };
            const run = (method, value) => {
                const input = byteView(value);
                ;
                try {
                    if (!provider)
                        provider = host.compression();
                    if (method === 'gzip')
                        return provider.gzip(input);
                    const inflater = new provider.Inflate({ windowBits: 31 });
                    inflater.push(input, true);
                    if (inflater.err || !inflater.ended || !inflater.result)
                        throw new Error(inflater.msg || 'incomplete gzip stream');
                    return inflater.result;
                }
                catch (cause) {
                    const error = new Error(method === 'gzip' ? 'gzip compression failed' : 'invalid gzip data');
                    error.code = method === 'gzip' ? 'COMPRESSION_FAILED' : 'DECOMPRESSION_FAILED';
                    error.cause = cause;
                    throw error;
                }
            };
            return Object.assign({}, undefined, { gzip: value => run('gzip', value), ungzip: value => run('ungzip', value) });
        })(host, config);
        overlay.$crypto = (function (host, config) {
            ;
            let provider;
            const proto = Object.getPrototypeOf(Uint8Array.prototype), get = name => Object.getOwnPropertyDescriptor(proto, name).get, tag = Object.getOwnPropertyDescriptor(proto, Symbol.toStringTag).get;
            const view = (value, name) => {
                if (tag.call(value) !== 'Uint8Array')
                    throw new TypeError(name + ' requires Uint8Array');
                return new Uint8Array(get('buffer').call(value), get('byteOffset').call(value), get('byteLength').call(value));
            };
            const invalid = message => { throw new TypeError('Loon AES: ' + message); };
            const run = (method, value, options) => {
                const data = view(value, 'data');
                if (!options || typeof options !== 'object')
                    invalid('options required');
                const rawMode = options.mode;
                if (typeof rawMode !== 'string')
                    invalid('mode must be String');
                const mode = rawMode.toLowerCase();
                if (!['ecb', 'cbc', 'ctr', 'gcm'].includes(mode))
                    invalid('unknown mode');
                const key = view(options.key, 'key');
                if (![16, 24, 32].includes(key.length))
                    invalid('key length must be 16, 24 or 32');
                const rawIV = options.iv;
                let iv;
                if (mode === 'ecb') {
                    if (rawIV !== undefined)
                        invalid('ECB forbids IV');
                }
                else {
                    iv = view(rawIV, 'iv');
                    if (iv.length !== (mode === 'gcm' ? 12 : 16))
                        invalid('invalid IV length');
                }
                const rawPadding = options.padding;
                let disablePadding = false;
                if (mode === 'ecb' || mode === 'cbc') {
                    if (rawPadding !== undefined && typeof rawPadding !== 'string')
                        invalid('padding must be String');
                    const padding = rawPadding === undefined ? 'pkcs7' : rawPadding.toLowerCase();
                    if (!['pkcs7', 'none'].includes(padding))
                        invalid('unknown padding');
                    disablePadding = padding === 'none';
                    if (disablePadding && data.length % 16)
                        invalid('unpadded data must be block aligned');
                }
                else if (rawPadding !== undefined)
                    invalid('mode does not use padding');
                const rawAAD = options.aad, rawTag = options.tag;
                let aad, tagBytes;
                if (mode === 'gcm') {
                    if (rawAAD !== undefined)
                        aad = view(rawAAD, 'aad');
                    if (method === 'decrypt') {
                        tagBytes = view(rawTag, 'tag');
                        if (tagBytes.length !== 16)
                            invalid('GCM tag length must be 16');
                    }
                    else if (rawTag !== undefined)
                        invalid('encrypt does not accept tag');
                }
                else if (rawAAD !== undefined || rawTag !== undefined)
                    invalid('mode does not use AAD/tag');
                try {
                    if (!provider)
                        provider = host.aes();
                    const cipher = mode === 'ecb' ? provider.ecb(key, { disablePadding }) : mode === 'cbc' ? provider.cbc(key, iv, { disablePadding }) : mode === 'ctr' ? provider.ctr(key, iv) : provider.gcm(key, iv, aad);
                    let input = data;
                    if (tagBytes) {
                        input = new Uint8Array(data.length + 16);
                        input.set(data);
                        input.set(tagBytes, data.length);
                    }
                    const result = cipher[method](input);
                    if (method === 'decrypt')
                        return result;
                    if (mode === 'gcm')
                        return { ciphertext: result.slice(0, -16), tag: result.slice(-16) };
                    return { ciphertext: result };
                }
                catch (cause) {
                    const error = new Error('AES ' + method + ' failed');
                    error.code = method === 'encrypt' ? 'ENCRYPTION_FAILED' : 'DECRYPTION_FAILED';
                    error.cause = cause;
                    throw error;
                }
            };
            return { aes: { encrypt: (data, options) => run('encrypt', data, options), decrypt: (data, options) => run('decrypt', data, options) } };
        })(host, config);
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
                const base64 = (() => { var r = function (r) { this.message = r; }; (r.prototype = new Error).name = "InvalidCharacterError"; var t = function (t) { throw new r(t); }, e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", a = /[\t\n\f\r ]/g; return { encode: function (r) { r = String(r), /[^\0-\xFF]/.test(r) && t("The string to be encoded contains characters outside of the Latin1 range."); for (var a, n, c, o, h = r.length % 3, d = "", i = -1, A = r.length - h; ++i < A;)
                        a = r.charCodeAt(i) << 16, n = r.charCodeAt(++i) << 8, c = r.charCodeAt(++i), d += e.charAt((o = a + n + c) >> 18 & 63) + e.charAt(o >> 12 & 63) + e.charAt(o >> 6 & 63) + e.charAt(63 & o); return 2 == h ? (a = r.charCodeAt(i) << 8, n = r.charCodeAt(++i), d += e.charAt((o = a + n) >> 10) + e.charAt(o >> 4 & 63) + e.charAt(o << 2 & 63) + "=") : 1 == h && (o = r.charCodeAt(i), d += e.charAt(o >> 2) + e.charAt(o << 4 & 63) + "=="), d; }, decode: function (r) { var n = (r = String(r).replace(a, "")).length; n % 4 == 0 && (n = (r = r.replace(/==?$/, "")).length), (n % 4 == 1 || /[^+a-zA-Z0-9/]/.test(r)) && t("Invalid character: the string to be decoded is not correctly encoded."); for (var c, o, h = 0, d = "", i = -1; ++i < n;)
                        o = e.indexOf(r.charAt(i)), c = h % 4 ? 64 * c + o : o, h++ % 4 && (d += String.fromCharCode(255 & c >> (-2 * h & 6))); return d; }, version: "1.0.0" }; })();
                const utf8 = (() => { var r, n, t, o = String.fromCharCode; function e(r) { for (var n, t, o = [], e = 0, i = r.length; e < i;)
                    (n = r.charCodeAt(e++)) >= 55296 && n <= 56319 && e < i ? 56320 == (64512 & (t = r.charCodeAt(e++))) ? o.push(((1023 & n) << 10) + (1023 & t) + 65536) : (o.push(n), e--) : o.push(n); return o; } function i(r) { if (r >= 55296 && r <= 57343)
                    throw Error("Lone surrogate U+" + r.toString(16).toUpperCase() + " is not a scalar value"); } function u(r, n) { return o(r >> n & 63 | 128); } function f(r) { if (!(4294967168 & r))
                    return o(r); var n = ""; return 4294965248 & r ? 4294901760 & r ? 4292870144 & r || (n = o(r >> 18 & 7 | 240), n += u(r, 12), n += u(r, 6)) : (i(r), n = o(r >> 12 & 15 | 224), n += u(r, 6)) : n = o(r >> 6 & 31 | 192), n += o(63 & r | 128); } function a() { if (t >= n)
                    throw Error("Invalid byte index"); var o = 255 & r[t]; if (t++, 128 == (192 & o))
                    return 63 & o; throw Error("Invalid continuation byte"); } function c() { var o, e; if (t > n)
                    throw Error("Invalid byte index"); if (t == n)
                    return !1; if (o = 255 & r[t], t++, !(128 & o))
                    return o; if (192 == (224 & o)) {
                    if ((e = (31 & o) << 6 | a()) >= 128)
                        return e;
                    throw Error("Invalid continuation byte");
                } if (224 == (240 & o)) {
                    if ((e = (15 & o) << 12 | a() << 6 | a()) >= 2048)
                        return i(e), e;
                    throw Error("Invalid continuation byte");
                } if (240 == (248 & o) && (e = (7 & o) << 18 | a() << 12 | a() << 6 | a()) >= 65536 && e <= 1114111)
                    return e; throw Error("Invalid UTF-8 detected"); } return { version: "3.0.0", encode: function (r) { for (var n = e(r), t = n.length, o = -1, i = ""; ++o < t;)
                        i += f(n[o]); return i; }, decode: function (i) { r = e(i), n = r.length, t = 0; for (var u, f = []; !1 !== (u = c());)
                        f.push(u); return function (r) { for (var n, t = r.length, e = -1, i = ""; ++e < t;)
                        (n = r[e]) > 65535 && (i += o((n -= 65536) >>> 10 & 1023 | 55296), n = 56320 | 1023 & n), i += o(n); return i; }(f); } }; })();
                const Pathname = /^(?:https?:\/\/)?[^\/]+(\/[^?#]*)?/.exec($request.url)?.[1];
                const Status = $response.status ?? $request.statusCode;
                if (Status !== 200) {
                    console.log("非 200 状态码‼️ ‼️" + Status);
                    $done({});
                }
                const EncryptionOrNot = `${$response.headers["reqentryption"] ?? $response.headers["reqEntryption"]}`.toLowerCase() ===
                    "base64";
                const Home_Category_Selection = [
                    "rankAlgorithm",
                    "newReport",
                    "editorRecommend",
                    "book",
                    "singleBookList",
                    "course"
                ];
                const Book_Category_Selection = [
                    "newBooks",
                    "studyHistory",
                    "recommendBookList",
                    "speakers",
                    "recommendBook",
                    "algorithmRecom"
                ];
                const User_Setting_Selection = [];
                let Decode_Body = jsonParse(EncryptionOrNot ? utf8.decode(base64.decode($response.body)) : $response.body, null);
                if (Decode_Body === null) {
                    console.log("响应体解析失败‼️" + $response.body);
                    $done({});
                }
                if (Pathname.includes("/chief-orch/home/bookPortal/v105/category")) {
                    const headCategories = Decode_Body.data.headCategories;
                    Decode_Body.data.headCategories = headCategories.filter((item) => {
                        return item.code !== "web";
                    });
                }
                if (Pathname.includes("/abtest-front/banner-modular/get")) {
                    if (Decode_Body?.data?.banners?.length) {
                        console.log(`[Banner] - [${Decode_Body.data?.moduleCode}] - [${Decode_Body.data?.planName}] - 移除`);
                        Decode_Body.data.banners = [];
                    }
                }
                if (Pathname.includes("/resource-orchestration-system/book/channel/v100/info")) {
                    Decode_Body.data.moduleList.forEach((item) => {
                        if (Book_Category_Selection.includes(item.moduleCode)) {
                            console.log(`${item.moduleCode} - [${item.moduleName}] - 保留`);
                            item.showFlag = true;
                        }
                        else {
                            console.log(`${item.moduleCode} - [${item.moduleName}] - 移除`);
                            item.showFlag = false;
                        }
                    });
                }
                if (Pathname.includes("/fs-member/user/profile/v100/detail")) {
                    Decode_Body.data.vipInfos = [];
                }
                if (Pathname.includes("/chief-orch/home/bookPortal/v111/forApp")) {
                    const modules = Decode_Body.data.modules;
                    Decode_Body.data.modules = modules.filter((item) => {
                        return Home_Category_Selection.includes(item.moduleCode);
                    });
                }
                if (Pathname.includes("/sns-orchestration-system/homePage/api/v100/myPage")) {
                    Decode_Body.data.vipConfig.vipConfigs = [];
                    Decode_Body.data.serviceCenter.services = Decode_Body.data.serviceCenter?.services?.filter((item) => {
                        return User_Setting_Selection.includes(item.linkId);
                    });
                }
                if (Pathname.includes("/task-orchestration/taskCenter/api/v101/taskList")) {
                    Decode_Body.data.taskInfoList = [];
                }
                if (Pathname.includes("/resource-orchestration-system/book/v101/content")) {
                    if (Decode_Body.data?.bookComponent) {
                        for (const item of Decode_Body.data.bookComponent) {
                            if (item.hasOwnProperty("compBanner")) {
                                delete item.compBanner;
                            }
                        }
                    }
                }
                if (Pathname.includes("/user-orchestration/user/api/v101/ceiltip")) {
                    Decode_Body.data = true;
                }
                $done({
                    body: EncryptionOrNot ? base64.encode(utf8.encode(jsonStr(Decode_Body))) : jsonStr(Decode_Body)
                });
                function jsonParse(json, defaultValue) {
                    try {
                        return JSON.parse(`${json}`);
                    }
                    catch {
                        return defaultValue ?? json;
                    }
                }
                function jsonStr(json, ...args) {
                    if (typeof json === "string")
                        return json;
                    try {
                        return JSON.stringify(json, ...args);
                    }
                    catch {
                        return json;
                    }
                }
            }).call(this);
        }
    });
})();
