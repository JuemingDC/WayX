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
    const __wayxContexts = { "response": { "surge": { "phase": "response", "binary": false, "responseBody": true, "name": "keep.js", "from": "qx", "to": "surge", "apiPlan": { "version": 1, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"], "source": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": "open-url", "media": "media-url", "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" }, "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" } }, "runtimePolicyVersion": 8, "omittedParameters": [] } } }, __wayxConfig = __wayxContexts[__wayxHost.response === undefined ? 'request' : 'response']?.[__wayxTarget];
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
            let requestBody = own(input, 'body') ? input.body : undefined;
            if (requestBody === undefined && style === 'promise' && own(input, 'bodyBytes'))
                requestBody = input.bodyBytes;
            if (requestBody !== undefined) {
                if (binary(requestBody))
                    req[target.binaryField] = target.http.style === 'promise' ? buffer(requestBody) : bytes(requestBody);
                else
                    req.body = requestBody;
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
                delete req.body;
                req[target.binaryField] = target.http.style === 'promise' ? buffer(data) : data;
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
            if (config.from === config.to)
                return config.to === 'qx' ? host.notifyQx(title, subtitle, body, option) : host.notify.post(title, subtitle, body, option, delay);
            const raw = typeof option === 'object' && option !== null ? option : {}, mapped = {};
            const open = typeof option === 'string' && source.notification.stringLink ? option : raw[source.notification.open];
            const copy = raw[config.from === 'qx' ? 'update-pasteboard' : 'clipboard'];
            if (typeof open === 'string') {
                if (config.to === 'surge') {
                    mapped.action = 'open-url';
                    mapped.url = open;
                }
                else
                    mapped[target.notification.open] = open;
            }
            if (typeof copy === 'string') {
                if (config.to === 'surge') {
                    delete mapped.url;
                    mapped.action = 'clipboard';
                    mapped.text = copy;
                }
                else if (config.to === 'qx')
                    mapped['update-pasteboard'] = copy;
            }
            const media = raw[source.notification.media];
            if (typeof media === 'string') {
                if (/^https?:\/\//i.test(media))
                    mapped[target.notification.media] = media;
                else if (config.to === 'surge') {
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
            const post = config.to === 'qx' ? host.notifyQx : host.notify.post.bind(host.notify);
            return Object.keys(mapped).length ? post(title, subtitle, body, mapped) : post(title, subtitle, body);
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
                if (-1 != $request.url.indexOf("people/my")) {
                    let e = JSON.parse($response.body);
                    e.data.floatingInfo = {}, $done({ body: JSON.stringify(e) });
                }
                else if (-1 != $request.url.indexOf("config/v3/basic")) {
                    let t = JSON.parse($response.body);
                    t.data.bottomBarControl.defaultTab = "home", t.data.bottomBarControl.tabs = Object.values(t.data.bottomBarControl.tabs).filter(e => "home" == e.tabType || "new_sports" == e.tabType || "personal" == e.tabType), t.data.homeTabs = [{ type: "homeRecommend", order: 1, name: "推荐", schema: "keep://homepage/homeRecommend", showInFewDays: 7, reverseSwitch: !1, default: !0 }, { type: "homePrime", order: 2, name: "会员", schema: "keep://coursepage/homePrime", showInFewDays: 7, reverseSwitch: !1, default: !1 }], $done({ body: JSON.stringify(t) });
                }
                else if (-1 != $request.url.indexOf("homepage/v")) {
                    let n = JSON.parse($response.body);
                    if (n.data.sections.length > 0 && "quickEntranceV3" != n.data.sections[0].contentStyle) {
                        var a = { sectionStyle: null, contentStyle: "quickEntranceV3", pageId: "", pitId: null, sectionId: null, location: "entrance", pageNum: 0, moduleNum: 0, bizType: null, backgroundImage: null, sectionTrackProps: { content_style: "quickEntranceV3", pageType: "homeRecommend", section_id: null, sectionTitle: "品类入口", itemDetailId: "", pageVersion: "8.0", page_index: 0, page_plan_id: "", sectionPosition: 0, sectionType: "categoryEntry" }, moreText: null, priority: 0, index: 0, schema: null, title: null, subBaseSection: null, showUserSettingSwitch: !0, quickEntrances: [{ itemTrackProps: { itemId: null, spm: "keep.homepage.quickEntrance.0", itemTitle: "跳绳", item_type: "smartrope", itemPosition: 0 }, icon: "https://static1.keepcdn.com/kylin-cms/2022/12/7/20/4/553246736447566b5831396d774a726d4944386a5763754d4e7243573943632f72766b72713243377433733d/210x174_be8314bcf2ddadaa91d64df15b8179410024b0cc.png", iconInner: "https://static1.keepcdn.com/kylin-cms/2022/11/22/16/40/553246736447566b5831394749734e746f305572724d59745a4f52724b37623655326668714f45504637673d/108x108_bed15c8355030f96af69226270bcc4d508b73375.png", type: "smartrope", schema: "keep://subpage/home?categoryType=jumprope&amp;source=page_home&amp;isPreview=false", title: "跳绳", iconLinkFormat: null, showTimes: 0, bubbleId: null, bubbleText: null, bubble: null, newBubbleId: null, showInFewDays: 0 }, { itemTrackProps: { itemId: null, spm: "keep.homepage.quickEntrance.1", itemTitle: "跑步", item_type: "running", itemPosition: 1 }, icon: "https://static1.keepcdn.com/kylin-cms/2022/12/7/20/1/553246736447566b58312f39463164783279354b67734b4c7958796e354f32736a2b5a7576306867512b593d/210x174_1a6d2547a58966dbdea3322795acdc2bba24e889.png", iconInner: "https://static1.keepcdn.com/infra-cms/2021/03/21/20/30/298362495336_108x108.png", type: "running", schema: "keep://homepage/running?tabId=cnVubmluZw==&amp;style=tab&amp;trainingTrace=categoryEntry&amp;source=categoryEntry", title: "跑步", iconLinkFormat: null, showTimes: 0, bubbleId: null, bubbleText: null, bubble: null, newBubbleId: null, showInFewDays: 0 }, { itemTrackProps: { itemId: null, spm: "keep.homepage.quickEntrance.2", itemTitle: "行走", item_type: "hiking", itemPosition: 2 }, icon: "https://static1.keepcdn.com/kylin-cms/2022/12/7/20/1/553246736447566b583138396362694a75476b7567306d6b373158632b4c635635713847456b56325542303d/210x174_990cd347017ad1a7ba63688b96aa64ed9b7ed824.png", iconInner: "https://static1.keepcdn.com/infra-cms/2021/03/22/10/19/79547768652_108x108.png", type: "hiking", schema: "keep://homepage/hiking?tabId=aGlraW5n&amp;new=true&amp;trainingTrace=categoryEntry&amp;source=categoryEntry", title: "行走", iconLinkFormat: null, showTimes: 0, bubbleId: null, bubbleText: null, bubble: null, newBubbleId: null, showInFewDays: 0 }, { itemTrackProps: { itemId: null, spm: "keep.homepage.quickEntrance.3", itemTitle: "骑行", item_type: "cycling", itemPosition: 3 }, icon: "https://static1.keepcdn.com/kylin-cms/2022/12/7/20/1/553246736447566b583139376d6c764e3637682b4c584c36544d45466c574e556d744f6e443257534435303d/210x174_495638b7a4224c14fde4ee5c88173b32db09c8f2.png", iconInner: "https://static1.keepcdn.com/infra-cms/2021/03/22/10/19/795794009923_108x108.png", type: "cycling", schema: "keep://homepage/cycling?tabId=Y3ljbGluZw==&amp;new=true&amp;trainingTrace=categoryEntry&amp;source=categoryEntry", title: "骑行", iconLinkFormat: null, showTimes: 0, bubbleId: null, bubbleText: null, bubble: null, newBubbleId: null, showInFewDays: 0 }, { itemTrackProps: { itemId: null, spm: "keep.homepage.quickEntrance.4", itemTitle: "助眠冥想", item_type: "meditation", itemPosition: 4 }, icon: "https://static1.keepcdn.com/kylin-cms/2022/12/7/18/38/553246736447566b58313961757053466470325955426a4353427a45627874396d4f6e5144616579646c413d/210x174_c946a5440299cc439ce103629eb9498c120c060e.png", iconInner: "https://static1.keepcdn.com/kylin-cms/2022/11/22/16/27/553246736447566b58312f45336d7949654768352f79793358552f7535797462774e78574e345a3152486f3d/108x108_0e012a0f0154208c791abd0509c5a2ae19c5d40e.png", type: "meditation", schema: "keep://subpage/home?categoryType=meditation&amp;source=page_home&amp;isPreview=false", title: "助眠冥想", iconLinkFormat: null, showTimes: 0, bubbleId: null, bubbleText: null, bubble: null, newBubbleId: null, showInFewDays: 0 }, { itemTrackProps: { itemId: null, spm: "keep.homepage.quickEntrance.5", itemTitle: "瑜伽", item_type: "yoga", itemPosition: 5 }, icon: "https://static1.keepcdn.com/kylin-cms/2022/12/7/20/1/553246736447566b58312b5173386d5766432f395932726e7a5130523867676676442b463139385462514d3d/210x174_6455aa0d0da392b4dcb1ae02faa7a6de3b12b74a.png", iconInner: "https://static1.keepcdn.com/kylin-cms/2022/11/10/12/35/553246736447566b58313863714d4b313937715338352b6d653032397858705371596d4873385752486b733d/108x108_4cc973b47b99b7ba40ad7e37226c5a07e08be1ed.png", type: "yoga", schema: "keep://subpage/home?categoryType=yoga&amp;source=home_recommend", title: "瑜伽", iconLinkFormat: null, showTimes: 0, bubbleId: null, bubbleText: null, bubble: null, newBubbleId: null, showInFewDays: 0 }, { itemTrackProps: { itemId: null, spm: "keep.homepage.quickEntrance.6", itemTitle: "塑形训练", item_type: "bodybuilding", itemPosition: 6 }, icon: "https://static1.keepcdn.com/kylin-cms/2022/12/7/20/2/553246736447566b58313848692f6245626c4c72764d4e6b2b3948727a44784a727857427a6b7a326a616b3d/210x174_9537eca338eda8e0d51c40e63378d73743ae2e39.png", iconInner: "https://static1.keepcdn.com/kylin-cms/2022/11/22/16/45/553246736447566b58313843613174565a6962313166665a5666366770765342447368786a4c61377879673d/108x108_b9315d9c9915931c8bdfddbeed40b8c1b7410fa6.png", type: "bodybuilding", schema: "keep://subpage/home?categoryType=bodybuilding&amp;source=page_home&amp;isPreview=false", title: "塑形训练", iconLinkFormat: null, showTimes: 0, bubbleId: null, bubbleText: null, bubble: null, newBubbleId: null, showInFewDays: 0 }, { itemTrackProps: { itemId: null, spm: "keep.homepage.quickEntrance.7", itemTitle: "趣味课", item_type: "games", itemPosition: 7 }, icon: "https://static1.keepcdn.com/kylin-cms/2022/12/7/20/15/553246736447566b58312b6a326a4432784770777256325373413073464168336753746159436c364f70453d/210x174_efc0141893630618ab491c34999b5b64506ee721.png", iconInner: "https://static1.keepcdn.com/infra-cms/2022/8/26/16/13/553246736447566b58313956386b78707053647a4869527078506d3863736f4c5771557433436445556b673d/108x108_17b1fb9c0175415962aa4582a9deb9baeac0a663.png", type: "games", schema: "https://m.gotokeep.com/live-activity/games/center?fullscreen=true&amp;source=home_quickStart", title: "趣味课", iconLinkFormat: null, showTimes: 0, bubbleId: null, bubbleText: null, bubble: null, newBubbleId: null, showInFewDays: 0 }, { itemTrackProps: { itemId: null, spm: "keep.homepage.quickEntrance.8", itemTitle: "呼啦圈", item_type: "smarthulahoop", itemPosition: 8 }, icon: "https://static1.keepcdn.com/kylin-cms/2022/11/22/16/50/553246736447566b58312b436f7931697352694a32653235597378695a39677533515a7630485a556345383d/210x174_d09af7f584c060e3bf20f5713382fb4e502993db.png", iconInner: "https://static1.keepcdn.com/kylin-cms/2022/11/22/16/50/553246736447566b58312b64724d4c6a536d65436f5736434162693172694f6273336268564c355350634d3d/108x108_eb24e19577e617b521363b73363cfc85affa0616.png", type: "smarthulahoop", schema: "keep://subpage/home?categoryType=hulahoop&amp;source=page_home&amp;isPreview=false", title: "呼啦圈", iconLinkFormat: null, showTimes: 0, bubbleId: null, bubbleText: null, bubble: null, newBubbleId: null, showInFewDays: 0 }, { itemTrackProps: { itemId: null, spm: "keep.homepage.quickEntrance.9", itemTitle: "跑步机", item_type: "keloton", itemPosition: 9 }, icon: "https://static1.keepcdn.com/kylin-cms/2022/12/7/20/5/553246736447566b583138546267467857467a5134322b77685252514656662b504351395278655a6c41513d/210x174_f146aad28baf15d9a967507fb6e8b92cb647a105.png", iconInner: "https://static1.keepcdn.com/infra-cms/2021/03/22/10/20/79638592490_108x108.png", type: "keloton", schema: "keep://homepage/keloton?tabId=keloton", title: "跑步机", iconLinkFormat: null, showTimes: 0, bubbleId: null, bubbleText: null, bubble: null, newBubbleId: null, showInFewDays: 0 }, { itemTrackProps: { itemId: null, spm: "keep.homepage.quickEntrance.10", itemTitle: "动感单车", item_type: "puncheur", itemPosition: 10 }, icon: "https://static1.keepcdn.com/kylin-cms/2022/12/7/20/5/553246736447566b58313855655a534a706f48447154597675417570646e466c64694337715968325374553d/210x174_d9682832608569e7bfdf8e099a6a4fb271cdd814.png", iconInner: "https://static1.keepcdn.com/infra-cms/2022/4/1/16/36/79214849d54a4c4df7830379af74a37bbe952e55_108x108_9e25f3e357ad724a7b06ca568472c181876cb773.png", type: "puncheur", schema: "keep://homepage/puncheur?tabId=puncheur", title: "动感单车", iconLinkFormat: null, showTimes: 0, bubbleId: null, bubbleText: null, bubble: null, newBubbleId: null, showInFewDays: 0 }, { itemTrackProps: { itemId: null, spm: "keep.homepage.quickEntrance.11", itemTitle: "椭圆机", item_type: "elliptical", itemPosition: 11 }, icon: "https://static1.keepcdn.com/kylin-cms/2022/12/7/20/5/553246736447566b58312b62724c324c6a643154702f50654447626636676b526262636f5651504f52746b3d/210x174_777c3a7262a4390e851fb1c0005540f824149ac4.png", iconInner: "https://static1.keepcdn.com/infra-cms/2022/4/1/16/34/79214849d54a4c4df7830379af74a37bbe952e55_108x108_93972c09e24276111935364f32f58da9f0b6dfd0.png", type: "elliptical", schema: "keep://koval/main", title: "椭圆机", iconLinkFormat: null, showTimes: 0, bubbleId: null, bubbleText: null, bubble: null, newBubbleId: null, showInFewDays: 0 }, { itemTrackProps: { itemId: null, spm: "keep.homepage.quickEntrance.12", itemTitle: "健走机", item_type: "walkman", itemPosition: 12 }, icon: "https://static1.keepcdn.com/kylin-cms/2022/12/7/20/6/553246736447566b58312b7a43783335705a5257533431356c61475a76416f2f4a30647a7a47584235636f3d/210x174_31eab9bbbc0c46611911645b7a04e4007752bfe9.png", iconInner: "https://static1.keepcdn.com/infra-cms/2021/03/23/11/40/708221831818_108x108.png", type: "walkman", schema: "keep://homepage/walkman?tabId=walkman", title: "健走机", iconLinkFormat: null, showTimes: 0, bubbleId: null, bubbleText: null, bubble: null, newBubbleId: null, showInFewDays: 0 }, { itemTrackProps: { itemId: null, spm: "keep.homepage.quickEntrance.13", itemTitle: "练器械", item_type: "equipment_class", itemPosition: 13 }, icon: "https://static1.keepcdn.com/kylin-cms/2022/12/7/20/6/553246736447566b58313948413149376f6d4d4f3065575338374d50716261744f544867773448496b726b3d/210x174_eb833711c3e4896f61dcb636bf0381266e3b4db5.png", iconInner: "https://static1.keepcdn.com/infra-cms/2021/8/20/11/53/79214849d54a4c4df7830379af74a37bbe952e55_108x108_9e353657a04c932a7c07e8221d3ef6d09be02989.png", type: "equipment_class", schema: "keep://equipment/equipment_training", title: "练器械", iconLinkFormat: null, showTimes: 0, bubbleId: null, bubbleText: null, bubble: null, newBubbleId: null, showInFewDays: 0 }, { itemTrackProps: { itemId: null, spm: "keep.homepage.quickEntrance.14", itemTitle: "Keepland", item_type: "uni_web_keepland", itemPosition: 14 }, icon: "https://static1.keepcdn.com/kylin-cms/2022/12/7/20/7/553246736447566b58313848583836333869584239486c564552317272753876574a43345445306b632f773d/210x174_af8fa993c3b4c33a073d99f791748b3f44a623b2.png", iconInner: "https://static1.keepcdn.com/infra-cms/2021/03/21/20/29/297988776391_108x108.png", type: "uni_web_keepland", schema: "https://keepland.gotokeep.com?kpwebbarcolor=0xffffff&amp;kpwebbtntitlecolor=0x584F60", title: "Keepland", iconLinkFormat: null, showTimes: 0, bubbleId: null, bubbleText: null, bubble: null, newBubbleId: null, showInFewDays: 0 }] };
                        n.data.sections.unshift(a);
                    }
                    $done({ body: JSON.stringify(n) });
                }
                else if (-1 != $request.url.indexOf("preview")) {
                    let i = JSON.parse($response.body);
                    i.data.detailSections = Object.values(i.data.detailSections).filter(e => "recommendation" != e.sectionType), $done({ body: JSON.stringify(i) });
                }
                else if (-1 != $request.url.indexOf("sportpage/sport/v3/mysport")) {
                    let l = JSON.parse($response.body);
                    l.data.sections && delete l.data.sections, $done({ body: JSON.stringify(l) });
                }
                else
                    $done();
            }).call(this);
        }
    });
})();
