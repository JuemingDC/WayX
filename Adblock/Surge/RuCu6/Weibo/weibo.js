/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
(function () {
    const __wayxTarget = "surge";
    const __wayxHost = { global: globalThis, request: typeof $request === 'undefined' ? undefined : $request, response: typeof $response === 'undefined' ? undefined : $response, done: $done, task: typeof $task === 'undefined' ? undefined : $task, http: typeof $httpClient === 'undefined' ? undefined : $httpClient, prefs: typeof $prefs === 'undefined' ? undefined : $prefs, store: typeof $persistentStore === 'undefined' ? undefined : $persistentStore, notifyQx: typeof $notify === 'undefined' ? undefined : $notify, notify: typeof $notification === 'undefined' ? undefined : $notification, script: typeof $script === 'undefined' ? undefined : $script, argument: typeof $argument === 'undefined' ? undefined : $argument, environment: typeof $environment === 'undefined' ? undefined : $environment, loon: typeof $loon === 'undefined' ? undefined : $loon, setTimeout: typeof setTimeout === 'undefined' ? undefined : setTimeout, codecs: (function (legacy, native = {}) {
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
        })((undefined), { TextDecoder: typeof TextDecoder === 'undefined' ? undefined : TextDecoder }), utils: typeof $utils === 'undefined' ? undefined : $utils, crypto: typeof $crypto === 'undefined' ? undefined : $crypto, compression: undefined, aes: undefined, url: undefined };
    const __wayxContexts = { "response": { "surge": { "phase": "response", "responseBody": true, "binary": false, "binaryKnown": true, "name": "weibo.js", "from": "loon", "to": "surge", "apiPlan": { "version": 1, "omitNotificationOptions": false, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"], "source": { "responseStatus": "status", "scriptStartTime": "date", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": true }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "node", "timeoutMs": 1, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": true } }, "notification": { "root": "$notification.post", "open": "openUrl", "media": "mediaUrl", "action": null, "openAction": null, "stringLink": true, "delay": true }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "typed" }, "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" } }, "runtimePolicyVersion": 7, "omittedParameters": [] } } }, __wayxConfig = __wayxContexts[__wayxHost.response === undefined ? 'request' : 'response']?.[__wayxTarget];
    if (!__wayxConfig)
        throw new Error('Unregistered HTTP source/target declaration');
    if (__wayxTarget === 'surge' && __wayxConfig.from === 'qx' && typeof __wayxHost.argument === 'string' && __wayxHost.argument.startsWith("wayx_qx_header_v1=")) {
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
        const source = config.apiPlan.source, target = config.apiPlan.target;
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
        const abLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get, typed = Object.getPrototypeOf(Uint8Array.prototype), get = name => Object.getOwnPropertyDescriptor(typed, name).get, tag = Object.getOwnPropertyDescriptor(typed, Symbol.toStringTag).get;
        const bytes = value => { let length; try {
            length = abLength.call(value);
        }
        catch { } if (length !== undefined)
            return new Uint8Array(value, 0, length); if (ArrayBuffer.isView(value)) {
            const isTyped = tag.call(value) !== undefined, getter = name => isTyped ? get(name).call(value) : Object.getOwnPropertyDescriptor(DataView.prototype, name).get.call(value);
            return new Uint8Array(getter('buffer'), getter('byteOffset'), getter('byteLength'));
        } return fail('binary body requires BufferSource'); };
        const binary = value => { if (ArrayBuffer.isView(value))
            return true; try {
            abLength.call(value);
            return true;
        }
        catch {
            return false;
        } };
        const buffer = value => { const b = bytes(value); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
        const status = value => { if (typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599)
            return value; const m = typeof value === 'string' && /^HTTP\/[\d.]+\s+(\d{3})(?:\s.*)?$/.exec(value); if (m)
            return status(Number(m[1])); return fail('invalid HTTP status'); };
        const statusLine = value => { const code = status(value); return typeof value === 'string' ? value : 'HTTP/1.1 ' + code + ' ' + ({ 200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error' }[code] || 'Status'); };
        const requestParts = value => typeof value === 'string' ? /^(https?):\/\/([^/?#]+)([^#]*)/i.exec(value) : null;
        const originalRequest = requestParts(host.request && host.request.url);
        const rawPath = parts => parts[3] ? (parts[3][0] === '?' ? '/' : '') + parts[3] : '/';
        function view(value, requestRole = false) {
            if (value === undefined)
                return undefined;
            const result = Object.assign({}, value);
            if (requestRole && config.from === 'qx' && originalRequest) {
                if (!own(result, 'scheme'))
                    result.scheme = originalRequest[1].toLowerCase();
                if (!own(result, 'path'))
                    result.path = rawPath(originalRequest);
            }
            if (value.headers !== undefined)
                result.headers = headers(value.headers);
            if (own(value, target.responseStatus)) {
                result[source.responseStatus] = status(value[target.responseStatus]);
                if (source.responseStatus !== target.responseStatus)
                    delete result[target.responseStatus];
            }
            if (config.binary || binary(value.bodyBytes) || binary(value.body)) {
                const valueBytes = target.binaryField === 'bodyBytes' ? value.bodyBytes : value.body;
                if (valueBytes !== undefined) {
                    const b = bytes(valueBytes);
                    if (source.binaryField === 'bodyBytes') {
                        result.bodyBytes = buffer(b);
                        delete result.body;
                    }
                    else {
                        result.body = b;
                        delete result.bodyBytes;
                    }
                }
            }
            return result;
        }
        const request = view(host.request, true), response = view(host.response);
        let completed = false;
        const finish = value => { completed = true; return host.done(value); };
        function message(value, synthetic) {
            if (!value || typeof value !== 'object' || Array.isArray(value))
                return fail('completion requires an object');
            const out = Object.assign({}, value);
            if (!synthetic && config.phase === 'request' && config.from === 'qx' && own(out, 'path')) {
                if (typeof out.path !== 'string' || !out.path.startsWith('/') || /[\r\n]/.test(out.path))
                    fail('QX request path must be an absolute request path');
                if (config.to !== 'qx') {
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
                out.status = target.completion.statusEncoding === 'line' ? statusLine(out.status) : status(out.status);
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
                if (target.binaryField === 'bodyBytes') {
                    out.bodyBytes = buffer(out.body);
                    delete out.body;
                }
                else
                    out.body = bytes(out.body);
            }
            if (config.to === 'surge')
                for (const key of ['h2_trailers', 'node', 'policy'])
                    delete out[key];
            for (const key of Object.keys(out))
                if (!['url', 'headers', 'body', 'bodyBytes', 'status', 'abort', ...(config.to === 'qx' && config.phase === 'request' && !synthetic ? ['path'] : []), ...(config.to === 'loon' ? ['h2_trailers'] : [])].includes(key)) {
                    if (config.to === 'qx')
                        delete out[key];
                    else
                        fail('unmapped completion field: ' + key);
                }
            if (target.completion.synthetic === 'flat')
                delete out.abort;
            if (target.completion.synthetic === 'flat' && !synthetic && config.phase === 'response' && own(out, 'headers') && !own(out, 'body') && !own(out, 'bodyBytes') && config.responseBody)
                fail('QX response-body requires body with changed headers');
            return out;
        }
        function done(value) {
            if (completed)
                return;
            if (['task', 'network', 'generic'].includes(config.phase))
                return finish(value ?? {});
            if (value === undefined || value === null)
                return finish({});
            if (value === response || value === request) {
                const out = {};
                for (const k of ['url', 'headers', 'body', 'bodyBytes', 'h2_trailers', ...(config.from === 'qx' && config.phase === 'request' ? ['path'] : []), source.responseStatus])
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
            else if (config.from === 'qx' && config.phase === 'echo')
                synthetic = true;
            const out = message(payload, synthetic);
            if (synthetic) {
                if (target.completion.synthetic === 'flat') {
                    if (config.phase !== 'echo')
                        fail('QX synthetic response requires an echo declaration');
                    return finish(out);
                }
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
            if (own(input, 'body')) {
                const value = input.body;
                req.body = binary(value) ? (target.http.style === 'promise' ? buffer(value) : bytes(value)) : value;
            }
            const mapped = {};
            for (const semantic of ['redirect', 'cookie', 'tls'])
                mapped[target.http[semantic]] = own(options, http[semantic]) ? options[http[semantic]] : http.defaults[semantic];
            if (own(options, http.policy))
                mapped[target.http.policy] = options[http.policy] === http.directPolicy ? target.http.directPolicy : options[http.policy];
            if (style === 'callback' && input['body-base64'] && config.from !== config.to) {
                if (typeof input.body !== 'string')
                    fail('body-base64 requires a String body');
                const raw = host.codecs.atob(input.body), data = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++)
                    data[i] = raw.charCodeAt(i);
                req.body = target.http.style === 'promise' ? buffer(data) : data;
            }
            if (target.http.style === 'promise') {
                req.method = verb.toUpperCase();
                req.opts = mapped;
                return { req, verb };
            }
            Object.assign(req, mapped);
            if (http.timeoutMs !== null && target.http.timeoutMs !== null && own(input, 'timeout'))
                req.timeout = input.timeout * http.timeoutMs / target.http.timeoutMs;
            for (const key of ['binary-mode', 'body-base64', 'alpn'])
                if (style === 'callback' && own(input, key) && (key !== 'body-base64' || config.from === config.to) && (key !== 'alpn' || config.from === config.to))
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
                    const out = { statusCode: status(native[target.responseStatus]), headers: headers(native.headers || {}) };
                    if (binary(data)) {
                        out.bodyBytes = buffer(data);
                        if (target.http.style === 'promise' && typeof native.body === 'string')
                            out.body = native.body;
                        else {
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
                if (target.http.style === 'promise') {
                    let promise;
                    try {
                        promise = host.task.fetch(plan.req);
                    }
                    catch (error) {
                        reject(error);
                        return;
                    }
                    Promise.resolve(promise).then(r => { try {
                        normalize(r, r && (own(r, 'bodyBytes') ? r.bodyBytes : r.body));
                    }
                    catch (error) {
                        reject(error);
                    } }, reject);
                }
                else {
                    const fn = host.http && host.http[plan.verb];
                    if (typeof fn !== 'function') {
                        reject(new TypeError('Native HTTP method unavailable'));
                        return;
                    }
                    try {
                        fn.call(host.http, plan.req, (error, r, data) => { if (error) {
                            reject({ error });
                            return;
                        } try {
                            normalize(r, data);
                        }
                        catch (e) {
                            reject(e);
                        } });
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
                if (target.http.style === 'callback') {
                    const fn = host.http && host.http[method];
                    if (typeof fn !== 'function')
                        return fail('native HTTP method unavailable');
                    return fn.call(host.http, plan.req, (error, r, data) => { if (error)
                        return callback(error, r, data); if (!r)
                        return callback('HTTP transport returned no response', r, data); const result = Object.assign({}, r, { headers: headers(r.headers || {}) }); result.status = status(r[target.responseStatus]); return callback(null, result, data); });
                }
                return host.task.fetch(plan.req).then(r => { if (!r)
                    return callback('HTTP transport returned no response', undefined, undefined); return callback(null, { status: status(r.statusCode), headers: headers(r.headers || {}) }, input && input['binary-mode'] && own(r, 'bodyBytes') ? bytes(r.bodyBytes) : r.body); }, e => callback(e && e.error || e, undefined, undefined));
            };
        const nativeStore = target.store.style === 'prefs' ? host.prefs : host.store;
        const storageKey = key => { if (key === undefined) {
            const name = config.name || (config.from === config.to && host.script && host.script.name);
            if (!name)
                return fail('source storage default key needs source script name');
            return name;
        } if (typeof key !== 'string')
            return fail('storage key must be String'); return key; };
        const store = { read: key => nativeStore[target.store.read](storageKey(key)), write: (value, key) => {
                key = storageKey(key);
                if (value === null || (value === undefined && source.store.undefinedDeletes))
                    return target.store.remove ? nativeStore[target.store.remove](key) : nativeStore[target.store.write](null, key);
                if (typeof value !== 'string')
                    return fail('storage value must be String or deletion marker');
                return nativeStore[target.store.write](value, key);
            } };
        store.remove = () => { if (config.to === 'loon')
            return host.store.remove(); if (config.to === 'qx') {
            host.prefs.removeAllValues();
            return;
        } return; };
        const prefKey = key => typeof key === 'string' ? key : fail('QX storage requires an explicit String key');
        const prefs = { valueForKey: key => store.read(prefKey(key)), setValueForKey: (value, key) => { key = prefKey(key); if (typeof value !== 'string')
                return fail('QX storage value must be String'); return store.write(value, key); }, removeValueForKey: key => target.store.remove ? nativeStore[target.store.remove](prefKey(key)) : nativeStore[target.store.write](null, prefKey(key)) };
        if (config.from === 'qx' && config.to === 'surge')
            prefs.removeAllValues = () => undefined;
        if (config.from === 'qx' && config.to === 'qx' && host.prefs && typeof host.prefs.removeAllValues === 'function')
            prefs.removeAllValues = host.prefs.removeAllValues.bind(host.prefs);
        function notify(title = '', subtitle = '', body = '', option, delay) {
            if (config.apiPlan.omitNotificationOptions)
                return target.notification.root === '$notify' ? host.notifyQx(title, subtitle, body) : host.notify.post(title, subtitle, body);
            if (config.from === config.to)
                return host.notify.post(title, subtitle, body, option, delay);
            const raw = typeof option === 'object' && option !== null ? option : {}, mapped = {};
            const media = raw.mediaUrl;
            if (typeof media === 'string') {
                if (/^https?:\/\//i.test(media))
                    mapped['media-url'] = media;
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
            return host.notify.post(title, subtitle, body, mapped);
        }
        let argument = config.from === 'qx' || target.argument === 'absent' ? undefined : host.argument;
        if (config.argumentSchema && config.argumentSchema.kind === 'object' && typeof argument === 'string')
            argument = JSON.parse(argument);
        const script = config.from === 'qx' ? undefined : Object.assign({}, host.script, { name: config.name || host.script && host.script.name });
        if (script && script.startTime !== undefined) {
            const t = script.startTime;
            script.startTime = t instanceof Date ? t : new Date(t * 1000);
        }
        const environment = Object.assign({}, host.environment);
        const overlay = {
            $request: request, $response: response, $done: done, $script: script,
            $task: config.to === 'qx' || config.from === 'qx' ? { fetch: taskFetch } : undefined, $httpClient: http,
            $prefs: config.to === 'qx' || config.from === 'qx' ? prefs : undefined, $persistentStore: store,
            $notify: config.to === 'qx' || config.from === 'qx' ? notify : undefined, $notification: { post: notify },
            $argument: argument, $environment: environment, $loon: config.to === 'loon' ? host.loon : undefined,
        };
        if (config.from === 'loon') {
            overlay.$utils = (function (host, config) {
                if (config.from === config.to && host.utils && typeof host.utils.gzip === 'function' && typeof host.utils.ungzip === 'function')
                    return host.utils;
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
                    if (config.from === config.to && host.utils && typeof host.utils[method] === 'function')
                        return host.utils[method](input);
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
                return Object.assign({}, config.from === config.to ? host.utils : undefined, { gzip: value => run('gzip', value), ungzip: value => run('ungzip', value) });
            })(host, config);
            overlay.$crypto = (function (host, config) {
                if (config.to === 'loon' && host.crypto && host.crypto.aes && typeof host.crypto.aes.encrypt === 'function' && typeof host.crypto.aes.decrypt === 'function')
                    return host.crypto;
                let provider;
                const proto = Object.getPrototypeOf(Uint8Array.prototype), get = name => Object.getOwnPropertyDescriptor(proto, name).get, tag = Object.getOwnPropertyDescriptor(proto, Symbol.toStringTag).get;
                const view = (value, name) => { if (tag.call(value) !== 'Uint8Array')
                    throw new TypeError(name + ' requires Uint8Array'); return new Uint8Array(get('buffer').call(value), get('byteOffset').call(value), get('byteLength').call(value)); };
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
        }
        overlay.TextDecoder = host.codecs.TextDecoder;
        let standards;
        for (const name of ['URL', 'URLSearchParams']) {
            const set = value => Object.defineProperty(overlay, name, { value, writable: true, enumerable: true, configurable: true });
            Object.defineProperty(overlay, name, { enumerable: true, configurable: true, get() { if (!standards)
                    standards = typeof host.global.URL === 'function' && typeof host.global.URLSearchParams === 'function' ? { URL: host.global.URL, URLSearchParams: host.global.URLSearchParams } : host.url(host.codecs); const value = standards[name]; set(value); return value; }, set });
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
                const url = $request.url;
                if (!$response)
                    $done({});
                if (!$response.body)
                    $done({});
                let body = $response.body;
                const itemMenusConfig = {
                    creatortypeask: false,
                    mblog_menus_apeal: true,
                    mblog_menus_avatar_widget: false,
                    mblog_menus_bullet_shield: true,
                    mblog_menus_card_bg: false,
                    mblog_menus_comment_manager: true,
                    mblog_menus_copy_url: true,
                    mblog_menus_custom: false,
                    mblog_menus_delete: true,
                    mblog_menus_edit: true,
                    mblog_menus_edit_history: true,
                    mblog_menus_edit_video: true,
                    mblog_menus_favorite: true,
                    mblog_menus_follow: true,
                    mblog_menus_home: false,
                    mblog_menus_long_picture: true,
                    mblog_menus_modify_visible: true,
                    mblog_menus_novelty: false,
                    mblog_menus_open_reward: false,
                    mblog_menus_popularize: false,
                    mblog_menus_promote: false,
                    mblog_menus_report: true,
                    mblog_menus_shield: true,
                    mblog_menus_sticking: true,
                    mblog_menus_video_feedback: false,
                    mblog_menus_video_later: false
                };
                if (url.includes("/interface/sdk/sdkad.php")) {
                    let obj = JSON.parse(body.substring(0, body.length - 2));
                    if (obj?.needlocation) {
                        obj.needlocation = false;
                    }
                    if (obj?.show_push_splash_ad) {
                        obj.show_push_splash_ad = false;
                    }
                    if (obj?.background_delay_display_time) {
                        obj.background_delay_display_time = 31536000;
                    }
                    if (obj?.lastAdShow_delay_display_time) {
                        obj.lastAdShow_delay_display_time = 31536000;
                    }
                    if (obj?.realtime_ad_video_stall_time) {
                        obj.realtime_ad_video_stall_time = 0;
                    }
                    if (obj?.realtime_ad_timeout_duration) {
                        obj.realtime_ad_timeout_duration = 0;
                    }
                    if (obj?.ads?.length > 0) {
                        for (let item of obj.ads) {
                            item.displaytime = 0;
                            item.displayintervel = 31536000;
                            item.allowdaydisplaynum = 0;
                            item.begintime = "2040-01-01 00:00:00";
                            item.endtime = "2040-01-01 23:59:59";
                        }
                    }
                    $done({ body: JSON.stringify(obj) + "OK" });
                }
                else {
                    let obj = JSON.parse(body);
                    if (url.includes("/2/cardlist")) {
                        if (obj?.top) {
                            delete obj.top;
                        }
                        if (obj?.cards?.length > 0) {
                            let newCards = [];
                            for (let card of obj.cards) {
                                if (card?.card_group?.length > 0) {
                                    let newGroup = [];
                                    for (let group of card.card_group) {
                                        let cardType = group.card_type;
                                        if ([120, 145, 192].includes(cardType)) {
                                            continue;
                                        }
                                        if (cardType === 6) {
                                            continue;
                                        }
                                        if (group?.mblog) {
                                            removeAvatar(group?.mblog);
                                        }
                                        newGroup.push(group);
                                    }
                                    card.card_group = newGroup;
                                    newCards.push(card);
                                }
                                else {
                                    let cardType = card.card_type;
                                    if ([17, 58].includes(cardType)) {
                                        continue;
                                    }
                                    if (card?.mblog) {
                                        removeAvatar(card?.mblog);
                                    }
                                    newCards.push(card);
                                }
                            }
                            obj.cards = newCards;
                        }
                    }
                    else if (url.includes("/2/checkin/show")) {
                        if (obj?.show) {
                            obj.show = 0;
                        }
                        if (obj?.show_time) {
                            obj.show_time = 0;
                        }
                    }
                    else if (url.includes("/2/client/publisher_list")) {
                        if (obj?.elements?.length > 0) {
                            obj.elements = obj.elements.filter((i) => ["写微博", "图片", "视频"].includes(i?.app_name));
                        }
                    }
                    else if (url.includes("/2/comments/build_comments")) {
                        if (obj?.datas?.length > 0) {
                            let newItems = [];
                            for (let item of obj.datas) {
                                if (item?.data) {
                                    if (!isAd(item?.data)) {
                                        if (item?.data?.comment_bubble) {
                                            delete item.data.comment_bubble;
                                        }
                                        if (item?.data?.comment_bullet_screens_message) {
                                            delete item.data.comment_bullet_screens_message;
                                        }
                                        if (item?.data?.hot_icon) {
                                            delete item.data.hot_icon;
                                        }
                                        if (item?.data?.vip_button) {
                                            delete item.data.vip_button;
                                        }
                                        if (item?.data?.user) {
                                            removeAvatar(item?.data);
                                            if (/(超话社区|微博)/.test(item?.data?.user?.name)) {
                                                continue;
                                            }
                                        }
                                        if ([6, 15, 41].includes(item?.type)) {
                                            continue;
                                        }
                                        if (item.hasOwnProperty("adType")) {
                                            continue;
                                        }
                                        newItems.push(item);
                                    }
                                }
                            }
                            obj.datas = newItems;
                        }
                        else if (obj?.root_comments?.length > 0) {
                            let newItems = [];
                            for (let item of obj.root_comments) {
                                if (!isAd(item)) {
                                    if (item?.comment_bubble) {
                                        delete item.comment_bubble;
                                    }
                                    if (item?.data?.comment_bubble) {
                                        delete item.data.comment_bubble;
                                    }
                                    if (item?.data?.comment_bullet_screens_message) {
                                        delete item.data.comment_bullet_screens_message;
                                    }
                                    if (item?.data?.hot_icon) {
                                        delete item.data.hot_icon;
                                    }
                                    if (item?.data?.vip_button) {
                                        delete item.data.vip_button;
                                    }
                                    if (item.user) {
                                        removeAvatar(item);
                                        if (["超话社区", "微博视频"].includes(item?.user?.name)) {
                                            continue;
                                        }
                                    }
                                    newItems.push(item);
                                }
                            }
                            obj.root_comments = newItems;
                        }
                        else if (obj?.comments?.length > 0) {
                            let newItems = [];
                            for (let item of obj.comments) {
                                if (item?.reply_comment?.comment_badge) {
                                    delete item.reply_comment.comment_badge;
                                }
                                if (item?.user?.icons) {
                                    delete item.user.icons;
                                }
                                newItems.push(item);
                            }
                            obj.comments = newItems;
                        }
                        if (obj?.rootComment) {
                            if (obj?.rootComment?.comment_bubble) {
                                delete obj.rootComment.comment_bubble;
                            }
                        }
                        if (obj?.status?.page_info) {
                            removeVoteInfo(obj?.status);
                        }
                    }
                    else if (url.includes("/2/container/asyn")) {
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                removeAvatar(item?.data);
                                if (/infeed_may_interest_in/.test(item?.itemId)) {
                                    continue;
                                }
                                if (item?.itemId === null) {
                                    continue;
                                }
                                if (item?.items?.length > 0) {
                                    let newII = [];
                                    for (let i of item.items) {
                                        removeAvatar(i?.data);
                                        removeVoteInfo(i?.data);
                                        if (i?.data?.itemid === "" && i?.data?.card_type === "22") {
                                            continue;
                                        }
                                        else if (i?.data?.itemid === "Square_HotHuati" && i?.data?.card_type === 17) {
                                            continue;
                                        }
                                        else if (i?.data?.title === "品牌话题" && i?.data?.card_type === 101) {
                                            continue;
                                        }
                                        newII.push(i);
                                    }
                                    item.items = newII;
                                }
                                newItems.push(item);
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/direct_messages/user_list")) {
                        if (obj?.user_list?.length > 0) {
                            obj.user_list = obj.user_list.filter((i) => !["活动通知", "闪聊"].includes(i?.user?.name));
                        }
                    }
                    else if (url.includes("/2/flowlist")) {
                        if (obj?.items?.length > 0) {
                            for (let item of obj.items) {
                                if (item?.items?.length > 0) {
                                    for (let i of item.items) {
                                        removeAvatar(i?.data);
                                        removeVoteInfo(i?.data);
                                    }
                                }
                            }
                        }
                        if (obj?.channelInfo?.channels?.length > 0) {
                            let newTabs = [];
                            for (let tab of obj.channelInfo.channels) {
                                if (/_selfrecomm/.test(tab?.flowId)) {
                                    continue;
                                }
                                else if (/_chaohua/.test(tab?.flowId)) {
                                    continue;
                                }
                                else {
                                    newTabs.push(tab);
                                }
                            }
                            obj.channelInfo.channels = newTabs;
                        }
                    }
                    else if (url.includes("/2/flowpage")) {
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                if (item?.data?.itemid === "hot-search-push-notice") {
                                    continue;
                                }
                                if (item?.items?.length > 0) {
                                    let newII = [];
                                    for (let i of item.items) {
                                        if (i?.data.hasOwnProperty("promotion")) {
                                            continue;
                                        }
                                        else if (/_img_search_stick/.test(i?.data?.pic)) {
                                            continue;
                                        }
                                        else {
                                            newII.push(i);
                                        }
                                    }
                                    item.items = newII;
                                }
                                newItems.push(item);
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/groups/allgroups/v2")) {
                        if (obj?.pageDatas?.length > 0) {
                            let newTabs = [];
                            for (let item of obj.pageDatas) {
                                if (item?.pageDataType === "homeExtend") {
                                    continue;
                                }
                                else {
                                    if (item?.categories?.length > 0) {
                                        let newCates = [];
                                        for (let i of item.categories) {
                                            if (i?.title === "默认分组") {
                                                if (i?.pageDatas?.length > 0) {
                                                    let newII = [];
                                                    for (let ii of i.pageDatas) {
                                                        if (["最新微博", "特别关注", "好友圈", "视频"].includes(ii?.title)) {
                                                            newII.push(ii);
                                                        }
                                                        else {
                                                            continue;
                                                        }
                                                        if (ii?.title === "最新微博") {
                                                            ii.title = "微博";
                                                        }
                                                    }
                                                    i.pageDatas = newII;
                                                }
                                            }
                                            newCates.push(i);
                                        }
                                        item.categories = newCates;
                                    }
                                    newTabs.push(item);
                                }
                            }
                            obj.pageDatas = newTabs;
                        }
                    }
                    else if (url.includes("/2/messageflow/notice")) {
                        if (obj?.messages?.length > 0) {
                            let newMsgs = [];
                            for (let msg of obj.messages) {
                                if (msg?.msg_card?.ad_tag) {
                                    continue;
                                }
                                else {
                                    newMsgs.push(msg);
                                }
                            }
                            obj.messages = newMsgs;
                        }
                    }
                    else if (url.includes("/2/page")) {
                        if (obj?.cards?.length > 0) {
                            if (obj?.cards?.[0]?.card_group?.length > 0) {
                                obj.cards[0].card_group = obj.cards[0].card_group.filter((c) => !(c?.actionlog?.ext?.includes("ads_word") || c?.itemid?.includes("t:51") || c?.itemid?.includes("ads_word")));
                            }
                            obj.cards = obj.cards.filter((i) => !(i?.itemid?.includes("feed_-_invite") ||
                                i?.itemid?.includes("infeed_friends_recommend") ||
                                i?.itemid?.includes("infeed_may_interest_in") ||
                                i?.itemid?.includes("infeed_pagemanual3") ||
                                i?.itemid?.includes("infeed_weibo_mall") ||
                                i?.mblog?.mblogtypename?.includes("广告")));
                        }
                        else if (obj?.card_group?.length > 0) {
                            obj.card_group = obj.card_group.filter((i) => i?.desc?.includes("你可能感兴趣的超话"));
                        }
                    }
                    else if (url.includes("/2/profile/container_timeline")) {
                        if (obj?.loadedInfo?.follow_guide_info) {
                            delete obj.loadedInfo.follow_guide_info;
                        }
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                if (item?.data?.left_hint?.[0]?.content === "全部微博(0)" && item?.data?.card_type === 216) {
                                    break;
                                }
                                else if (/内容/.test(item?.data?.name) && item?.data?.card_type === 58) {
                                    break;
                                }
                                else {
                                    if (item?.category === "card") {
                                        if ([58, 216].includes(item?.data?.card_type)) {
                                            if (/没有公开博文，为你推荐以下精彩内容/.test(item?.data?.name)) {
                                                continue;
                                            }
                                        }
                                        newItems.push(item);
                                    }
                                    else if (item?.category === "group") {
                                        if (item?.header?.data?.icon) {
                                            delete item.header.data.icon;
                                        }
                                        if (item?.itemId?.includes("INTEREST_PEOPLE")) {
                                            continue;
                                        }
                                        if (item?.profile_type_id === "weibo_cardpics") {
                                            continue;
                                        }
                                        if (item?.items?.length > 0) {
                                            let newII = [];
                                            for (let ii of item.items) {
                                                if (ii?.category === "feed") {
                                                    removeAvatar(ii?.data);
                                                    removeFeedAd(ii?.data);
                                                    removeVoteInfo(ii?.data);
                                                    if (ii?.data?.enable_comment_guide) {
                                                        ii.data.enable_comment_guide = false;
                                                    }
                                                    newII.push(ii);
                                                }
                                                else if (ii?.category === "card") {
                                                    if ([10, 48, 176].includes(ii?.data?.card_type)) {
                                                        continue;
                                                    }
                                                    if (ii?.data?.rightImage) {
                                                        delete ii.data.rightImage;
                                                    }
                                                    if (ii?.data?.backgroundImage) {
                                                        delete ii.data.backgroundImage;
                                                    }
                                                    newII.push(ii);
                                                }
                                            }
                                            item.items = newII;
                                        }
                                        newItems.push(item);
                                    }
                                    else if (item?.category === "feed") {
                                        if (!isAd(item?.data)) {
                                            removeFeedAd(item?.data);
                                            removeVoteInfo(item?.data);
                                            if (item?.data?.source?.includes("生日动态")) {
                                                continue;
                                            }
                                            if (item?.data?.title?.text !== "热门" && item?.data?.title?.structs?.length > 0) {
                                                continue;
                                            }
                                            newItems.push(item);
                                        }
                                    }
                                }
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/profile/dealatt") || url.includes("/2/friendships/")) {
                        if (obj?.cards?.length > 0) {
                            obj.cards = [];
                        }
                        if (obj?.toolbar_menus_new?.items?.length > 0) {
                            let toolbar = obj.toolbar_menus_new;
                            let newTools = [];
                            for (let item of toolbar.items) {
                                if (item?.identifier === "recommend") {
                                    continue;
                                }
                                else if (/reward_/.test(item?.identifier)) {
                                    continue;
                                }
                                else {
                                    newTools.push(item);
                                }
                            }
                            toolbar.items = newTools;
                        }
                    }
                    else if (url.includes("/2/profile/me")) {
                        if (obj?.vipHeaderBgImage) {
                            delete obj.vipHeaderBgImage;
                        }
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                let itemId = item.itemId;
                                if (itemId === "profileme_mine") {
                                    if (item?.header) {
                                        if (item?.header?.vipView) {
                                            delete item.header.vipView;
                                        }
                                        if (item?.header?.vipCenter) {
                                            delete item.header.vipCenter;
                                        }
                                        if (item?.header?.vipIcon) {
                                            delete item.header.vipIcon;
                                        }
                                    }
                                    if (item?.items?.length > 0) {
                                        for (let d of item.items) {
                                            if (d.itemId === "mainnums_friends") {
                                                let s = d.click.modules[0].scheme;
                                                d.click.modules[0].scheme = s.replace("231093_-_selfrecomm", "231093_-_selffollowed");
                                            }
                                        }
                                    }
                                    newItems.push(item);
                                }
                                else if (itemId === "100505_-_top8") {
                                    if (item?.items?.length > 0) {
                                        item.items = item.items.filter((i) => i?.itemId === "100505_-_album" ||
                                            i?.itemId === "100505_-_like" ||
                                            i?.itemId === "100505_-_watchhistory" ||
                                            i?.itemId === "100505_-_draft");
                                    }
                                    newItems.push(item);
                                }
                                else if (itemId === "100505_-_manage") {
                                    if (item?.style) {
                                        delete item.style;
                                    }
                                    if (item?.images) {
                                        delete item.images;
                                    }
                                    newItems.push(item);
                                }
                                else if (itemId === "100505_-_manage2") {
                                    if (item?.footer) {
                                        delete item.footer;
                                    }
                                    if (item?.body) {
                                        delete item.body;
                                    }
                                    newItems.push(item);
                                }
                                else if (itemId === "100505_-_chaohua" || itemId === "100505_-_recentlyuser") {
                                    newItems.push(item);
                                }
                                else {
                                    continue;
                                }
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/profile/statuses/tab")) {
                        if (obj?.cards?.length > 0) {
                            let newCards = [];
                            for (let card of obj.cards) {
                                if (card?.card_group?.length > 0) {
                                    let newGroup = [];
                                    for (let group of card.card_group) {
                                        let cardType = group.card_type;
                                        if (cardType === 22) {
                                            continue;
                                        }
                                        if (group?.mblog) {
                                            removeAvatar(group?.mblog);
                                            removeVoteInfo(group?.mblog);
                                        }
                                        newGroup.push(group);
                                    }
                                    card.card_group = newGroup;
                                    newCards.push(card);
                                }
                                else {
                                    if (card?.mblog) {
                                        removeAvatar(card?.mblog);
                                        removeVoteInfo(card?.mblog);
                                    }
                                    newCards.push(card);
                                }
                            }
                            obj.cards = newCards;
                        }
                        if (obj?.cardlistInfo?.page_type === "08") {
                            delete obj.cardlistInfo;
                        }
                    }
                    else if (url.includes("/2/profile/userinfo")) {
                        if (obj?.header?.data?.userInfo?.avatar_extend_info) {
                            delete obj.header.data.userInfo.avatar_extend_info;
                        }
                        if (obj?.profileSkin?.data) {
                            delete obj.profileSkin.data;
                        }
                        if (obj?.footer?.data) {
                            let toolbar = obj.footer.data.toolbar_menus_new;
                            if (toolbar?.lottie_guide) {
                                delete toolbar.lottie_guide;
                            }
                            if (toolbar?.servicePopup?.subData) {
                                delete toolbar.servicePopup.subData;
                            }
                            if (toolbar?.items?.length > 0) {
                                let newTools = [];
                                for (let item of toolbar.items) {
                                    if (item?.identifier === "recommend") {
                                        continue;
                                    }
                                    else if (item?.identifier === "urge") {
                                        continue;
                                    }
                                    else if (/reward_/.test(item?.identifier)) {
                                        continue;
                                    }
                                    else {
                                        newTools.push(item);
                                    }
                                }
                                toolbar.items = newTools;
                            }
                        }
                    }
                    else if (url.includes("/2/push/active")) {
                        if (obj?.compose_add_guide) {
                            delete obj.compose_add_guide;
                        }
                        if (obj?.floating_windows_force_show) {
                            delete obj.floating_windows_force_show;
                        }
                        if (obj?.interceptad) {
                            delete obj.interceptad;
                        }
                        if (obj?.interceptad_cardlist) {
                            delete obj.interceptad_cardlist;
                        }
                        if (obj?.loginconfig) {
                            delete obj.loginconfig;
                        }
                        if (obj?.profile_lotties) {
                            delete obj.profile_lotties;
                        }
                        if (obj?.ug_red_paper) {
                            delete obj.ug_red_paper;
                        }
                        if (obj?.weibo_pic_banner) {
                            delete obj.weibo_pic_banner;
                        }
                        if (obj?.disable_floating_window) {
                            obj.disable_floating_window = "1";
                        }
                        if (obj?.feed_redpacket) {
                            obj.feed_redpacket.starttime = "2208960000";
                            obj.feed_redpacket.interval = "31536000";
                            obj.feed_redpacket.endtime = "2209046399";
                            if (obj?.feed_redpacket?.finish_icon) {
                                delete obj.feed_redpacket.finish_icon;
                            }
                            if (obj?.feed_redpacket?.guide) {
                                delete obj.feed_redpacket.guide;
                            }
                            if (obj?.feed_redpacket?.icon) {
                                delete obj.feed_redpacket.icon;
                            }
                            if (obj?.feed_redpacket?.pre_icon) {
                                delete obj.feed_redpacket.pre_icon;
                            }
                        }
                        if (obj?.floating_window_for_live_streaming) {
                            obj.floating_window_for_live_streaming = false;
                        }
                        if (obj?.floating_window_show_interval) {
                            obj.floating_window_show_interval = 31536000;
                        }
                        if (obj?.floating_windows?.length > 0) {
                            obj.floating_windows = obj.floating_windows.filter((i) => !/(?:^ad_?|red_pocket|ug_high_priority)/.test(i?.subtype));
                        }
                    }
                    else if (url.includes("/2/search/")) {
                        if (url.includes("container_timeline")) {
                            if (obj?.loadedInfo) {
                                delete obj.loadedInfo;
                            }
                            if (obj?.items?.length > 0) {
                                let newItems = [];
                                for (let item of obj.items) {
                                    if (item?.category === "feed") {
                                        if (!isAd(item?.data)) {
                                            removeFeedAd(item?.data);
                                            newItems.push(item);
                                        }
                                    }
                                    else if (item?.category === "card") {
                                        if ([19, 22, 101, 118, 206, 208, 217, 236, 249, 261].includes(item?.data?.card_type)) {
                                            continue;
                                        }
                                        else if (item?.data?.itemid === "ads_slide") {
                                            continue;
                                        }
                                        else if (item?.data?.cate_id === "1114") {
                                            continue;
                                        }
                                        else if (item?.data.hasOwnProperty("rank")) {
                                            continue;
                                        }
                                        else {
                                            newItems.push(item);
                                        }
                                    }
                                    else if (item?.category === "cell") {
                                        newItems.push(item);
                                    }
                                    else if (item?.category === "group") {
                                        if (item?.item_category === "insert_item") {
                                            continue;
                                        }
                                        else {
                                            if (item?.items?.length > 0) {
                                                let newII = [];
                                                for (let ii of item.items) {
                                                    if ([101, 118, 182, 192, 217, 247, 264].includes(ii?.data?.card_type)) {
                                                        continue;
                                                    }
                                                    else if (ii?.data?.cate_id === "1114") {
                                                        continue;
                                                    }
                                                    else {
                                                        removeFeedAd(ii?.data);
                                                        newII.push(ii);
                                                    }
                                                }
                                                item.items = newII;
                                            }
                                        }
                                        newItems.push(item);
                                    }
                                }
                                obj.items = newItems;
                            }
                        }
                        else if (url.includes("finder")) {
                            if (obj?.channelInfo?.channels?.length > 0) {
                                let newChannels = [];
                                for (let channel of obj.channelInfo.channels) {
                                    if (["band_channel", "discover_channel", "trends_channel"].includes(channel?.key)) {
                                        let payload = channel.payload;
                                        if (payload) {
                                            if (payload?.loadedInfo) {
                                                if (payload?.loadedInfo?.searchBarContent?.length > 0) {
                                                    payload.loadedInfo.searchBarContent = [];
                                                }
                                                if (payload?.loadedInfo?.headerBack?.channelStyleMap) {
                                                    delete payload.loadedInfo.headerBack.channelStyleMap;
                                                }
                                                if (payload?.loadedInfo?.searchBarStyleInfo) {
                                                    delete payload.loadedInfo.searchBarStyleInfo;
                                                }
                                            }
                                            if (payload?.items?.length > 0) {
                                                let newItems = [];
                                                for (let item of payload.items) {
                                                    if (item?.category === "feed") {
                                                        if (!isAd(item?.data)) {
                                                            removeFeedAd(item.data);
                                                            newItems.push(item);
                                                        }
                                                    }
                                                    else if (item?.category === "card") {
                                                        if ([19, 22, 101, 118, 206, 208, 217, 236, 249, 261].includes(item?.data?.card_type)) {
                                                            continue;
                                                        }
                                                        else if (item?.data?.itemid === "ads_slide") {
                                                            continue;
                                                        }
                                                        else if (item?.data?.cate_id === "1114") {
                                                            continue;
                                                        }
                                                        else if (item?.data.hasOwnProperty("rank")) {
                                                            continue;
                                                        }
                                                        else {
                                                            newItems.push(item);
                                                        }
                                                    }
                                                    else if (item?.category === "cell") {
                                                        newItems.push(item);
                                                    }
                                                    else if (item?.category === "group") {
                                                        if (item?.item_category === "insert_item") {
                                                            continue;
                                                        }
                                                        else {
                                                            if (item?.items?.length > 0) {
                                                                let newII = [];
                                                                for (let ii of item.items) {
                                                                    if ([101, 118, 182, 192, 217, 247, 264].includes(ii?.data?.card_type)) {
                                                                        continue;
                                                                    }
                                                                    else if (ii?.data?.cate_id === "1114") {
                                                                        continue;
                                                                    }
                                                                    else {
                                                                        removeFeedAd(ii?.data);
                                                                        newII.push(ii);
                                                                    }
                                                                }
                                                                item.items = newII;
                                                            }
                                                        }
                                                        newItems.push(item);
                                                    }
                                                }
                                                payload.items = newItems;
                                            }
                                        }
                                        newChannels.push(channel);
                                    }
                                    else {
                                        continue;
                                    }
                                }
                                obj.channelInfo.channels = newChannels;
                            }
                            if (obj?.channelInfo?.moreChannels) {
                                delete obj.channelInfo.moreChannels;
                            }
                            if (obj?.header?.insert_data) {
                                delete obj.header.insert_data;
                            }
                            if (obj?.header?.data?.items?.length > 0) {
                                let newItems = [];
                                for (let item of obj.header.data.items) {
                                    if (item?.category === "card") {
                                        if ([19, 22, 101, 118, 206, 208, 217, 236, 249, 261].includes(item?.data?.card_type)) {
                                            continue;
                                        }
                                        if (item?.data.hasOwnProperty("rank")) {
                                            continue;
                                        }
                                    }
                                    else if (item?.category === "group") {
                                        if (item?.items?.length > 0) {
                                            let newII = [];
                                            for (let i of item.items) {
                                                if ([118, 182, 192, 217, 247, 264].includes(i?.data?.card_type)) {
                                                    continue;
                                                }
                                                else {
                                                    newII.push(i);
                                                }
                                            }
                                            item.items = newII;
                                        }
                                    }
                                    newItems.push(item);
                                }
                                obj.header.data.items = newItems;
                            }
                        }
                    }
                    else if (url.includes("/2/searchall")) {
                        if (obj?.header?.data) {
                            const items = ["bg_img", "background_scheme", "background_url"];
                            for (let i of items) {
                                delete obj.header.data[i];
                            }
                        }
                        if (obj?.loadedInfo?.serviceMap?.layer) {
                            delete obj.loadedInfo.serviceMap.layer;
                        }
                        if (obj?.footer) {
                            if (obj?.footer?.data?.bg_lottie) {
                                delete obj.footer.data.bg_lottie;
                            }
                            if (obj?.footer?.data?.bg_lottie_dark) {
                                delete obj.footer.data.bg_lottie_dark;
                            }
                            if (obj?.footer?.data?.discuss_avatars) {
                                delete obj.footer.data.discuss_avatars;
                            }
                            if (obj?.footer?.data?.menus?.length > 0) {
                                obj.footer.data.menus = obj.footer.data.menus.filter((i) => !/\d+_ai\./.test(i?.pic));
                            }
                        }
                        if (obj?.cards?.length > 0) {
                            let newCards = [];
                            for (let card of obj.cards) {
                                if (card?.card_group?.length > 0) {
                                    let newGroup = [];
                                    for (let group of card.card_group) {
                                        if (group?.card_type === 22) {
                                            continue;
                                        }
                                        else if (group?.card_type === 42 && group?.title_extra_text === "广告") {
                                            continue;
                                        }
                                        else if (group?.card_type === 3 && group?.pics?.length > 0) {
                                            continue;
                                        }
                                        else {
                                            if (group?.mblog) {
                                                if (!isAd(group?.mblog)) {
                                                    if (group?.mblog?.title_source) {
                                                        delete group.mblog.title_source;
                                                    }
                                                    if (group?.mblog?.source_tag_struct) {
                                                        delete group.mblog.source_tag_struct;
                                                    }
                                                    if (group?.mblog?.extend_info) {
                                                        delete group.mblog.extend_info;
                                                    }
                                                    if (group?.mblog?.common_struct) {
                                                        delete group.mblog.common_struct;
                                                    }
                                                    removeAvatar(group?.mblog);
                                                    removeVoteInfo(group?.mblog);
                                                    if (group?.mblog?.is_ad === 1) {
                                                        continue;
                                                    }
                                                    newGroup.push(group);
                                                }
                                            }
                                            else {
                                                newGroup.push(group);
                                            }
                                        }
                                    }
                                    card.card_group = newGroup;
                                    newCards.push(card);
                                }
                                else {
                                    if (card?.mblog) {
                                        if (!isAd(card?.mblog)) {
                                            removeAvatar(card?.mblog);
                                            if (card?.mblog?.title_source) {
                                                delete card.mblog.title_source;
                                            }
                                            if (card?.mblog?.source_tag_struct) {
                                                delete card.mblog.source_tag_struct;
                                            }
                                            if (card?.mblog?.extend_info) {
                                                delete card.mblog.extend_info;
                                            }
                                            if (card?.mblog?.common_struct) {
                                                delete card.mblog.common_struct;
                                            }
                                            removeVoteInfo(card?.mblog);
                                            if (card?.mblog?.page_info?.cards?.length > 0) {
                                                let page = card.mblog.page_info;
                                                for (let i of page.cards) {
                                                    if (i?.media_info?.vote_info) {
                                                        delete i.media_info.vote_info;
                                                    }
                                                }
                                            }
                                            newCards.push(card);
                                        }
                                    }
                                }
                            }
                            obj.cards = newCards;
                        }
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                if (!isAd(item?.data)) {
                                    if (item?.category === "feed") {
                                        removeFeedAd(item?.data);
                                        removeVoteInfo(item?.data);
                                        newItems.push(item);
                                    }
                                    else if (item?.category === "group") {
                                        if (item?.items?.length > 0) {
                                            let newII = [];
                                            for (let ii of item.items) {
                                                if (ii?.cate_id === "638" && ii?.readtimetype === "card") {
                                                    continue;
                                                }
                                                else {
                                                    if (!isAd(ii?.data)) {
                                                        removeFeedAd(ii?.data);
                                                        if ([3, 17, 22, 30, 42, 89, 101, 206].includes(ii?.data?.card_type)) {
                                                            continue;
                                                        }
                                                        else if (ii?.data?.card_type === 4 && ii?.data?.cate_id === "640") {
                                                            continue;
                                                        }
                                                        else if (ii?.data?.card_type === 42 && ii?.data?.is_ads === true) {
                                                            continue;
                                                        }
                                                        newII.push(ii);
                                                    }
                                                }
                                            }
                                            item.items = newII;
                                        }
                                        newItems.push(item);
                                    }
                                    else {
                                        newItems.push(item);
                                    }
                                }
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/shproxy/chaohua/discovery/searchactive")) {
                        if (obj?.items?.length > 0) {
                            obj.items = obj.items.filter((i) => i?.data?.card_type !== 1007);
                        }
                    }
                    else if (url.includes("/2/statuses/container_detail?")) {
                        if (obj?.pageHeader?.data?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.pageHeader.data.items) {
                                if (item?.category === "card" && item?.data?.is_ad_card === 1) {
                                    continue;
                                }
                                else if (item?.category === "card" && item?.data?.card_type === 227) {
                                    continue;
                                }
                                else if (item?.category === "group" && item?.items?.length > 0) {
                                    continue;
                                }
                                else if (item?.category === "wboxcard" && item?.data?.card_type === 236) {
                                    continue;
                                }
                                else if (item?.data?.itemid === "top_searching" && item?.data?.card_type === 248) {
                                    continue;
                                }
                                else {
                                    newItems.push(item);
                                }
                            }
                            obj.pageHeader.data.items = newItems;
                        }
                        if (obj?.detailInfo?.extend?.ai_search_share) {
                            delete obj.detailInfo.extend.ai_search_share;
                        }
                        if (obj?.detailInfo?.extend?.follow_data) {
                            delete obj.detailInfo.extend.follow_data;
                        }
                        if (obj?.detailInfo?.extend?.reward_info) {
                            delete obj.detailInfo.extend.reward_info;
                        }
                        if (obj?.detailInfo?.extend?.sharecontent) {
                            delete obj.detailInfo.extend.sharecontent;
                        }
                        if (obj?.detailInfo?.status?.reward_info) {
                            delete obj.detailInfo.status.reward_info;
                        }
                    }
                    else if (url.includes("/2/statuses/comments_expand_child")) {
                        if (obj?.items?.length > 0) {
                            for (let item of obj.items) {
                                removeAvatar(item?.data);
                            }
                        }
                    }
                    else if (url.includes("/2/statuses/container_detail_comment")) {
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                if (item?.type !== "trend" && item?.type !== "comment_header_tip") {
                                    if (item?.data) {
                                        removeAvatar(item?.data);
                                        if (item?.data?.card_type === 236 || item?.data?.itemid === "ai_summary_entrance_real_show") {
                                            continue;
                                        }
                                        if (item?.data?.comment_bubble) {
                                            delete item.data.comment_bubble;
                                        }
                                        if (item?.data?.comment_bullet_screens_message) {
                                            delete item.data.comment_bullet_screens_message;
                                        }
                                        if (item?.data?.hot_icon) {
                                            delete item.data.hot_icon;
                                        }
                                        if (item?.data?.vip_button) {
                                            delete item.data.vip_button;
                                        }
                                    }
                                    if (item?.items?.length > 0) {
                                        let newII = [];
                                        for (let ii of item.items) {
                                            if (ii?.data) {
                                                removeAvatar(ii?.data);
                                                if (/微博智搜/.test(ii?.data?.user?.name)) {
                                                    continue;
                                                }
                                                if (ii?.data?.comment_bubble) {
                                                    delete ii.data.comment_bubble;
                                                }
                                                if (ii?.data?.comment_bullet_screens_message) {
                                                    delete ii.data.comment_bullet_screens_message;
                                                }
                                                if (ii?.data?.hot_icon) {
                                                    delete ii.data.hot_icon;
                                                }
                                                if (ii?.data?.vip_button) {
                                                    delete ii.data.vip_button;
                                                }
                                            }
                                            newII.push(ii);
                                        }
                                        item.items = newII;
                                    }
                                    newItems.push(item);
                                }
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/statuses/container_timeline_hot") || url.includes("/2/statuses/unread_hot_timeline")) {
                        for (let s of ["ad", "advertises", "trends", "headers"]) {
                            if (obj?.[s]) {
                                delete obj[s];
                            }
                        }
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                if (!isAd(item?.data)) {
                                    if (item?.category === "feed") {
                                        removeFeedAd(item?.data);
                                        removeVoteInfo(item?.data);
                                        newItems.push(item);
                                    }
                                    else {
                                        continue;
                                    }
                                }
                            }
                            obj.items = newItems;
                        }
                        if (obj?.statuses?.length > 0) {
                            let newStatuses = [];
                            for (let item of obj.statuses) {
                                if (!isAd(item)) {
                                    removeFeedAd(item);
                                    newStatuses.push(item);
                                }
                            }
                            obj.statuses = newStatuses;
                        }
                    }
                    else if (url.includes("/2/statuses/container_timeline?") || url.includes("/2/statuses/container_timeline_unread")) {
                        if (obj?.loadedInfo?.headers) {
                            delete obj.loadedInfo.headers;
                        }
                        if (obj?.common_struct) {
                            delete obj.common_struct;
                        }
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                if (!isAd(item?.data) && !isAd(item?.status)) {
                                    if (item?.category === "dynamic") {
                                        if (item?.status?.action_button_icon_dic) {
                                            delete item.status.action_button_icon_dic;
                                        }
                                        removeFeedAd(item?.status);
                                        removeVoteInfo(item?.status);
                                        if (item.status?.title?.structs) {
                                            continue;
                                        }
                                        if (item?.status?.screen_name_suffix_new?.length > 0) {
                                            if (item?.status?.screen_name_suffix_new?.[3]?.content === "快转了") {
                                                continue;
                                            }
                                        }
                                        if (item?.status?.title?.text?.includes("精选")) {
                                            continue;
                                        }
                                        if (item?.status?.user?.following === false) {
                                            continue;
                                        }
                                        if (item?.status?.user?.unfollowing_recom_switch === 1) {
                                            item.status.user.unfollowing_recom_switch = 0;
                                        }
                                        if (item?.status?.tag_struct?.length > 0) {
                                            item.status.tag_struct = [];
                                        }
                                        newItems.push(item);
                                    }
                                    else if (item?.category === "feed") {
                                        if (item?.data?.action_button_icon_dic) {
                                            delete item.data.action_button_icon_dic;
                                        }
                                        removeFeedAd(item?.data);
                                        removeVoteInfo(item?.data);
                                        if (item.data?.title?.structs) {
                                            continue;
                                        }
                                        if (item?.data?.screen_name_suffix_new?.length > 0) {
                                            if (item?.data?.screen_name_suffix_new?.[3]?.content === "快转了") {
                                                continue;
                                            }
                                        }
                                        if (item?.data?.title?.text?.includes("精选")) {
                                            continue;
                                        }
                                        if (item?.data?.user?.following === false) {
                                            continue;
                                        }
                                        if (item?.data?.user?.unfollowing_recom_switch === 1) {
                                            item.data.user.unfollowing_recom_switch = 0;
                                        }
                                        if (item?.data?.tag_struct?.length > 0) {
                                            item.data.tag_struct = [];
                                        }
                                        newItems.push(item);
                                    }
                                    else if (item?.category === "feedBiz") {
                                        newItems.push(item);
                                    }
                                    else {
                                        continue;
                                    }
                                }
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/statuses/container_timeline_topic")) {
                        if (obj?.header?.data?.follow_guide_info) {
                            delete obj.header.data.follow_guide_info;
                        }
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                if (item?.category === "feed") {
                                    removeAvatar(item?.data);
                                    if (!isAd(item?.data)) {
                                        if (item?.data?.title?.text?.includes("新人导师")) {
                                            delete item.data.title;
                                        }
                                        newItems.push(item);
                                    }
                                }
                                else if (item?.category === "card") {
                                    if ([4, 197, 236, 1012].includes(item?.data?.card_type)) {
                                        continue;
                                    }
                                    else {
                                        if (item?.data?.card_type === 31 && item?.data?.hotwords?.length > 0) {
                                            item.data.hotwords = [];
                                        }
                                        if (item?.data?.card_type === 22 && item?.data.hasOwnProperty("card_ad_style")) {
                                            continue;
                                        }
                                        newItems.push(item);
                                    }
                                }
                                else if (item?.category === "group") {
                                    if (item?.style?.topHover) {
                                        delete item.style.topHover;
                                    }
                                    if (item?.items?.length > 0) {
                                        if (item?.itemId === null) {
                                            let newII = [];
                                            for (let ii of item.items) {
                                                if (ii?.data.hasOwnProperty("itemid")) {
                                                    if (ii?.data?.itemid?.includes("mine_topics")) {
                                                        newII.push(ii);
                                                    }
                                                    else if (ii?.data?.itemid?.includes("tab_search_input")) {
                                                        if (ii?.data?.hotwords) {
                                                            ii.data.hotwords = [{ word: "搜索超话" }];
                                                        }
                                                        newII.push(ii);
                                                    }
                                                    else if (ii?.data?.itemid?.includes("poiRankList")) {
                                                        newII.push(ii);
                                                    }
                                                }
                                                else {
                                                    newII.push(ii);
                                                }
                                                removeAvatar(ii?.data);
                                            }
                                            item.items = newII;
                                        }
                                        else {
                                            let newII = [];
                                            for (let ii of item.items) {
                                                if (ii?.data) {
                                                    if (ii?.data?.common_struct) {
                                                        delete ii.data.common_struct;
                                                    }
                                                    removeAvatar(ii?.data);
                                                    if ([1008, 1024].includes(ii?.data?.card_type)) {
                                                        continue;
                                                    }
                                                    else {
                                                        newII.push(ii);
                                                    }
                                                }
                                            }
                                            item.items = newII;
                                        }
                                    }
                                    if (item?.header?.arrayText?.contents?.length > 0) {
                                        continue;
                                    }
                                    newItems.push(item);
                                }
                                else {
                                    continue;
                                }
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/statuses/extend")) {
                        if (obj?.trend?.extra_struct?.extBtnInfo?.btn_picurl?.includes("ad")) {
                            delete obj.trend;
                        }
                        if (obj.trend?.titles) {
                            let title = obj.trend.titles.title;
                            if (/(博主好物种草|相关推荐|专区)/.test(title)) {
                                delete obj.trend;
                            }
                        }
                        const item = [
                            "bubble_guide_data",
                            "button_extra_info",
                            "display_info",
                            "extend_info",
                            "floating_button",
                            "follow_data",
                            "head_cards",
                            "highlight",
                            "interaction_extra_info",
                            "page_alerts",
                            "reward_info",
                            "source_tag_struct",
                            "top_cards"
                        ];
                        if (obj) {
                            item.forEach((i) => {
                                delete obj[i];
                            });
                        }
                        if (obj?.custom_action_list?.length > 0) {
                            let newActions = [];
                            for (let item of obj.custom_action_list) {
                                let type = item.type;
                                let add = itemMenusConfig[type];
                                if (type === "mblog_menus_copy_url") {
                                    newActions.unshift(item);
                                }
                                else if (add) {
                                    newActions.push(item);
                                }
                            }
                            obj.custom_action_list = newActions;
                        }
                        if (obj?.has_common_struct) {
                            obj.has_common_struct = false;
                        }
                        if (obj?.enable_comment_guide) {
                            obj.enable_comment_guide = false;
                        }
                    }
                    else if (url.includes("/2/statuses/repost_timeline")) {
                        if (obj?.hot_reposts?.length > 0) {
                            let newReposts = [];
                            for (let item of obj.hot_reposts) {
                                if (!isAd(item)) {
                                    newReposts.push(item);
                                }
                            }
                            obj.hot_reposts = newReposts;
                        }
                        if (obj?.reposts?.length > 0) {
                            let newReposts = [];
                            for (let item of obj.reposts) {
                                if (!isAd(item)) {
                                    newReposts.push(item);
                                }
                            }
                            obj.reposts = newReposts;
                        }
                    }
                    else if (url.includes("/2/statuses/show")) {
                        removeFeedAd(obj);
                        if (obj?.text) {
                            removeFeedAd(obj.text);
                        }
                        if (obj?.reward_info) {
                            delete obj.reward_info;
                        }
                        removeVoteInfo(obj);
                    }
                    else if (url.includes("/2/video/full_screen_stream")) {
                        if (obj?.statuses?.length > 0) {
                            let newStatuses = [];
                            for (let item of obj.statuses) {
                                if (!isAd(item)) {
                                    removeAvatar(item);
                                    if (item?.video_info?.tags?.length > 0) {
                                        item.video_info.tags = [];
                                    }
                                    newStatuses.push(item);
                                }
                            }
                            obj.statuses = newStatuses;
                        }
                    }
                    else if (url.includes("/2/video/tiny_stream_mid_detail")) {
                        if (obj?.status?.video_info?.shopping?.length > 0) {
                            obj.status.video_info.shopping = [];
                        }
                        if (obj?.status?.video_info?.bottom_banner) {
                            obj.status.video_info.bottom_banner = {};
                        }
                        if (obj?.status?.video_info?.float_info) {
                            obj.status.video_info.float_info = {};
                        }
                    }
                    else if (url.includes("/2/video/tiny_stream_video_list")) {
                        if (obj?.statuses?.length > 0) {
                            obj.statuses = [];
                        }
                        if (obj?.tab_list?.length > 0) {
                            obj.tab_list = [];
                        }
                    }
                    else if (url.includes("/2/!/huati/discovery_home_bottom_channels")) {
                        if (obj?.button_configs) {
                            delete obj.button_configs;
                        }
                        if (obj?.channelInfo?.channel_list?.length > 0) {
                            obj.channelInfo.channel_list = obj.channelInfo.channel_list.filter((t) => t?.title !== "广场");
                        }
                    }
                    else if (url.includes("/aj/appicon/list")) {
                        if (obj?.data?.list?.length > 0) {
                            for (let item of obj.data.list) {
                                if (item?.cardType) {
                                    item.cardType = 2;
                                }
                            }
                        }
                    }
                    else if (url.includes("/v1/ad/preload") || url.includes("/v2/ad/preload")) {
                        if (obj?.ads?.length > 0) {
                            for (let item of obj.ads) {
                                item.start_time = 3818332800;
                                item.end_time = 3818419199;
                                item.daily_display_cnt = 50;
                                item.display_duration = 0;
                            }
                            if (obj?.ads?.creatives?.length > 0) {
                                for (let item of obj.ads.creatives) {
                                    item.start_time = 3818332800;
                                    item.end_time = 3818419199;
                                    item.daily_display_cnt = 50;
                                    item.display_duration = 0;
                                }
                            }
                        }
                    }
                    else if (url.includes("/wbapplua/wbpullad.lua") || url.includes("/preload/get_ad")) {
                        if (obj?.cached_ad?.ads?.length > 0) {
                            for (let item of obj.cached_ad.ads) {
                                item.show_count = 50;
                                item.duration = 0;
                                item.start_date = 3818332800;
                                item.end_date = 3818419199;
                            }
                        }
                    }
                    $done({ body: JSON.stringify(obj) });
                }
                function isAd(data) {
                    if (data?.mblogtypename === "广告") {
                        return true;
                    }
                    if (data?.mblogtypename === "热推") {
                        return true;
                    }
                    if (data?.readtimetype === "adMblog") {
                        return true;
                    }
                    if (data?.promotion?.recommend === "广告") {
                        return true;
                    }
                    if (data?.promotion?.recommend === "热推") {
                        return true;
                    }
                    if (data?.promotion?.type?.includes("ad")) {
                        return true;
                    }
                    if (data?.content_auth_info?.content_auth_title === "广告") {
                        return true;
                    }
                    if (data?.content_auth_info?.content_auth_title === "热推") {
                        return true;
                    }
                    if (data?.ads_material_info?.is_ads === true) {
                        return true;
                    }
                    return false;
                }
                function removeAvatar(data) {
                    if (data?.block_card_bg) {
                        delete data.block_card_bg;
                    }
                    if (data?.buttons) {
                        delete data.buttons;
                    }
                    if (data?.cardid) {
                        delete data.cardid;
                    }
                    if (data?.icons) {
                        delete data.icons;
                    }
                    if (data?.mblog_buttons) {
                        delete data.mblog_buttons;
                    }
                    if (data?.pic_bg_new) {
                        delete data.pic_bg_new;
                    }
                    if (data?.user?.avatargj_id) {
                        delete data.user.avatargj_id;
                    }
                    if (data?.user?.avatar_extend_info) {
                        delete data.user.avatar_extend_info;
                    }
                    if (data?.user?.cardid) {
                        delete data.user.cardid;
                    }
                    if (data?.user?.icons) {
                        delete data.user.icons;
                    }
                    if (data?.user?.mbtype) {
                        delete data.user.mbtype;
                    }
                }
                function removeFeedAd(item) {
                    removeAvatar(item);
                    if (item?.retweeted_status) {
                        removeAvatar(item?.retweeted_status);
                    }
                    if (item?.action_button_icon_dic) {
                        delete item.action_button_icon_dic;
                    }
                    if (item?.common_struct) {
                        delete item.common_struct;
                    }
                    if (item?.comment_summary) {
                        delete item.comment_summary;
                    }
                    if (item?.extend_info) {
                        delete item.extend_info;
                    }
                    if (item?.icons_material) {
                        delete item.icons_material;
                    }
                    if (item?.semantic_brand_params) {
                        delete item.semantic_brand_params;
                    }
                }
                function removeVoteInfo(item) {
                    if (item?.page_info?.media_info?.vote_info) {
                        delete item.page_info.media_info.vote_info;
                    }
                }
            }).call(this);
        }
    });
})();
