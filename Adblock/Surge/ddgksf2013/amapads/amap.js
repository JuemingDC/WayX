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
    const __wayxContexts = { "response": { "surge": { "phase": "response", "binary": false, "responseBody": true, "name": "amap.js", "from": "qx", "to": "surge", "apiPlan": { "version": 1, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"], "source": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": "open-url", "media": "media-url", "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" }, "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" } }, "runtimePolicyVersion": 8, "omittedParameters": [] } } }, __wayxConfig = __wayxContexts[__wayxHost.response === undefined ? 'request' : 'response']?.[__wayxTarget];
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
                const version = 'V1.0.34';
                var _0xodl = 'jsjiami.com.v7';
                const _0x3ffcae = _0x3649;
                function _0x3649(_0x24f110, _0x4e2daa) { const _0x25d84c = _0x25d8(); return _0x3649 = function (_0x3649a9, _0x43e324) { _0x3649a9 = _0x3649a9 - 0xd2; let _0x412376 = _0x25d84c[_0x3649a9]; if (_0x3649['altIAT'] === undefined) {
                    var _0x13d1cc = function (_0x260f68) { const _0x449dcb = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/='; let _0x3f2c85 = '', _0xc36f35 = ''; for (let _0x28b769 = 0x0, _0x21056, _0x5ad763, _0xe95a68 = 0x0; _0x5ad763 = _0x260f68['charAt'](_0xe95a68++); ~_0x5ad763 && (_0x21056 = _0x28b769 % 0x4 ? _0x21056 * 0x40 + _0x5ad763 : _0x5ad763, _0x28b769++ % 0x4) ? _0x3f2c85 += String['fromCharCode'](0xff & _0x21056 >> (-0x2 * _0x28b769 & 0x6)) : 0x0) {
                        _0x5ad763 = _0x449dcb['indexOf'](_0x5ad763);
                    } for (let _0x3fa364 = 0x0, _0x3f71c0 = _0x3f2c85['length']; _0x3fa364 < _0x3f71c0; _0x3fa364++) {
                        _0xc36f35 += '%' + ('00' + _0x3f2c85['charCodeAt'](_0x3fa364)['toString'](0x10))['slice'](-0x2);
                    } return decodeURIComponent(_0xc36f35); };
                    const _0x436f95 = function (_0x465111, _0x2ff3ab) { let _0x350982 = [], _0x36de8d = 0x0, _0xb8426a, _0x2726fa = ''; _0x465111 = _0x13d1cc(_0x465111); let _0x4f8c99; for (_0x4f8c99 = 0x0; _0x4f8c99 < 0x100; _0x4f8c99++) {
                        _0x350982[_0x4f8c99] = _0x4f8c99;
                    } for (_0x4f8c99 = 0x0; _0x4f8c99 < 0x100; _0x4f8c99++) {
                        _0x36de8d = (_0x36de8d + _0x350982[_0x4f8c99] + _0x2ff3ab['charCodeAt'](_0x4f8c99 % _0x2ff3ab['length'])) % 0x100, _0xb8426a = _0x350982[_0x4f8c99], _0x350982[_0x4f8c99] = _0x350982[_0x36de8d], _0x350982[_0x36de8d] = _0xb8426a;
                    } _0x4f8c99 = 0x0, _0x36de8d = 0x0; for (let _0x59d783 = 0x0; _0x59d783 < _0x465111['length']; _0x59d783++) {
                        _0x4f8c99 = (_0x4f8c99 + 0x1) % 0x100, _0x36de8d = (_0x36de8d + _0x350982[_0x4f8c99]) % 0x100, _0xb8426a = _0x350982[_0x4f8c99], _0x350982[_0x4f8c99] = _0x350982[_0x36de8d], _0x350982[_0x36de8d] = _0xb8426a, _0x2726fa += String['fromCharCode'](_0x465111['charCodeAt'](_0x59d783) ^ _0x350982[(_0x350982[_0x4f8c99] + _0x350982[_0x36de8d]) % 0x100]);
                    } return _0x2726fa; };
                    _0x3649['vTYimW'] = _0x436f95, _0x24f110 = arguments, _0x3649['altIAT'] = !![];
                } const _0x369300 = _0x25d84c[0x0], _0x2cbc8c = _0x3649a9 + _0x369300, _0x50441f = _0x24f110[_0x2cbc8c]; return !_0x50441f ? (_0x3649['aKdpmD'] === undefined && (_0x3649['aKdpmD'] = !![]), _0x412376 = _0x3649['vTYimW'](_0x412376, _0x43e324), _0x24f110[_0x2cbc8c] = _0x412376) : _0x412376 = _0x50441f, _0x412376; }, _0x3649(_0x24f110, _0x4e2daa); }
                function _0x25d8() { const _0x245827 = (function () { return [_0xodl, 'FCbQjsYjKiyaRBmKiNdB.Jcopmbb.unv7KNhIDGE==', 'FsXgWPHXWQHyeSo/W5rgESkZ', 'WQj1s8k4W5FcM8kDE8o9', 'WRHVxCk0W4hcS8ks', 'lmkyWRNdVW', 'WQy5W7pcP0hcNmoGB8ku', 'W407Cmkx', 'DX3cM1FdIftcJCk1wSoYymobWO0', 'WOWJEmkhxYBcQ8oq', 'rmk1W5S5', 'ECkTFqm5fay', 'khLIWRXUwb4', 'jSkermkZWOuCdmk0WQNcItucW4NcUSoT', 'iCozWPFcSSkFpg7cJhxcMfldHexdJa', 'ACkLEsymgrD4', 'WQ/dG8kWW7VcNJpcMSoWe8kRadpdKmkOWR9SaSoSWRDVW7ZdJmo0mIGLm8koq2DXaW', 'taxdUcu', 'eSk6B1m', 'WP/dRsi', 'mxH2WQXM', 'WR3dG8kOW68', 'W77cJ0FcRmkws8klumo+WOa', 'W5dcI0ff', 'WO3dICkfmYBcIvhdTuZdUK0', 'W53cUWNdGI8', 'WReSW7xcRW', 'xG5UvG', 'b8kjESkIWOmb', 'WOBdJmoNtxhcLeddOW', 'WOFdK0G', 'WORdOdlcImkn', 'WPxcK8oWl8oTWQVdLe0', 'WPFdMmoYW7urWRxdOs9g', 'WPfaW4a9W4jvyCk0WOPKp8kqjq', 'W5/cMCocACk7W6tdLmkI', 'W5bpbSoIWRNdNK/dNSkYCM8Qua', 'W7FcJ0pcJW', 'qColnNTRWOC7W4hdP8kUW7fgqcWes8oLWRq', 'FSkQWRG'].concat((function () { return ['W5VcHmogDG', 'WR0IW6ZcQ3dcMCo8ESkeCxKVBmoeWQlcLCo8FemBW6ddG2m+W7XzWPfMW4i', 'WRFdKrhcImkHjdrBW4q', 'iKRdMqq', 'fCoszmkR', 'W4KBWPv5WPCeiG', 'du/cISkufmoWWOa', 'W7tcJmoe', 'jbFdONFdUq', 'W7ldUbCwkCoDBa', 'vSoldmoSa8oDWPO', 'WOBdMCoIW74tWRC', 'WRldHa/cLmkQma', 'cSoUrqyjWO7cKG', 'WOJdQJ3cLWtdM8kgW6ZdNmkDCgq8txvqW78', 'wHNdUZ96WR3dGSkeW5WsW57dHCoCW6G3W6Kl', 'WRCIW6xcTW', 'WPtdRIuAd8oVW6ncAW', 'WPjcW4y/W49vyCksWQTKjCkEdq', 'fmoLt8kpW5WKW4a', 'E8kTWRGAWQ4', 'emoVtay', 'bCkbySk3', 'W7rLWQzNWRSNtmoy', 'W6SXr2bWoW', 'x13cVSkeW7KsnJu', 'WRySW7pcQMpcKSo6Fq', 'As1TWOj3WRjC', 'W5bbgCoRWPRdK1xdNG', 'g8kOFee', 'WODJxCov', 'W4pcHCon', 'vmoudCoRdSomWObGW6pdLHxdI3BdRSkd', 'WQj1wmkJW43cO8kaDmoPW64', 'hSkkWRC', 'k17cOY/cTwJdUfjtcgi', 'Ca/dOuNdQ3xdP21jkgK', 'bCkbySk3WRikeCk8', 'cSksxSkRwCkaW5PNW6tdHJddPNO', 'xCopiwbKWPq7W4JdSa'].concat((function () { return ['WQNdL8kWW6ldIa', 'v8owiCoLW5jhuCkuWOxcTr4vW5O', 'f8oCySkpW5NdN3O', 'W7pcOGVdRa', 'WP7dQYBcUay', 'Br7dPh/dRx3dUNXF', 'mSoQW6XgWQrfew7dKSkgW4RdM1G', 'WO7cV8oqv8kfW4NdNa', 'Db/cN1pcHYFdRSkQrmoN', 'WP1UxSk4W5FcV8kvB8oG', 'wmowdCo4g8orWP9Q', 'WORdJmkfmYxcRupdJ3VdUua', 'ACkLEsy', 'vq3dUbr9WQldVCkEW7aw', 'WOhdGJ/cJJeaW4/cNSobACkvfriH', 'cCkqwSkVfSoZWRL4W7RdKW', 'WPXUnCohpCkbW7BcPcD9tehdUa', 'kqldPhZdRSoF', 'W6eWvNvNgSoe', 'W5BcLSouB2VcKe4', 'W7hcJmohW58RWQinaCkpqaPBWQ9IiHtdTdi', 'W7BcJCkhW4OQWQCnqSkcaqHmWRGQpX7dOIhdRCoAtgOoWO3cMq', 'W5mhW558WOKopmkWWPzFbCkKuNO2pCoJWR5lWQZcTMVdKCkhW7S', 'oCk4pJTQhfzHWQa', 'W4ytChm', 'W6hcJ3JcU8kB', 'CmkoW47dPSodDWNcHv/cJv3dR1u', 'aCkOnf9/r8odW75UW6/dJ8o+W7m1', 'W5dcLSoaDSoHW6hdNmkWBSkAW7NcJSkGWP4CnColWOVdMXf9W7bLe8koWOhcTCk3hCo5', 'pqldPMFdRSoE', 'xa3dVdC', 'l0xdIqdcHIpdMa', 'eSkfD8kKWOuBtSk3WQNcHImJW5hcUSoSW6efWP8WCXfh', 'WPTbvW', 'WO1ssweXtSodW6W', 'W7BcKLxcJmkOac1RW4C', 'WQddHbFcGa', 'umomuW0gWRpcHW']; }())); }())); }()); _0x25d8 = function () { return _0x245827; }; return _0x25d8(); }
                ;
                (function (_0x44171d, _0x234d1b, _0x4183ed, _0x15b12a, _0x5ccecd, _0x3053d9, _0x2ca479) { return _0x44171d = _0x44171d >> 0x8, _0x3053d9 = 'hs', _0x2ca479 = 'hs', function (_0x2a258b, _0x26b781, _0x1f22b5, _0x58a939, _0x2541f4) { const _0x54d3b9 = _0x3649; _0x58a939 = 'tfi', _0x3053d9 = _0x58a939 + _0x3053d9, _0x2541f4 = 'up', _0x2ca479 += _0x2541f4, _0x3053d9 = _0x1f22b5(_0x3053d9), _0x2ca479 = _0x1f22b5(_0x2ca479), _0x1f22b5 = 0x0; const _0x4dbcf2 = _0x2a258b(); while (!![] && --_0x15b12a + _0x26b781) {
                    try {
                        _0x58a939 = parseInt(_0x54d3b9(0xfe, 'm!Rf')) / 0x1 * (-parseInt(_0x54d3b9(0x139, 'w)kg')) / 0x2) + parseInt(_0x54d3b9(0xe2, ')[f%')) / 0x3 * (-parseInt(_0x54d3b9(0x12c, 'tU9(')) / 0x4) + parseInt(_0x54d3b9(0x141, 'SvWq')) / 0x5 + parseInt(_0x54d3b9(0xe0, '!ghO')) / 0x6 * (-parseInt(_0x54d3b9(0xf9, 'm!Rf')) / 0x7) + parseInt(_0x54d3b9(0x138, 'XxYi')) / 0x8 * (-parseInt(_0x54d3b9(0x137, '!B[n')) / 0x9) + parseInt(_0x54d3b9(0x132, 'v(hz')) / 0xa + parseInt(_0x54d3b9(0xe9, 'w)kg')) / 0xb;
                    }
                    catch (_0x1cc447) {
                        _0x58a939 = _0x1f22b5;
                    }
                    finally {
                        _0x2541f4 = _0x4dbcf2[_0x3053d9]();
                        if (_0x44171d <= _0x15b12a)
                            _0x1f22b5 ? _0x5ccecd ? _0x58a939 = _0x2541f4 : _0x5ccecd = _0x2541f4 : _0x1f22b5 = _0x2541f4;
                        else {
                            if (_0x1f22b5 == _0x5ccecd['replace'](/[NFdDYRhuGnEyICbpBJKQ=]/g, '')) {
                                if (_0x58a939 === _0x26b781) {
                                    _0x4dbcf2['un' + _0x3053d9](_0x2541f4);
                                    break;
                                }
                                _0x4dbcf2[_0x2ca479](_0x2541f4);
                            }
                        }
                    }
                } }(_0x4183ed, _0x234d1b, function (_0x521f84, _0x13b835, _0x229059, _0xc384c8, _0x2673a2, _0x2e49fe, _0x1f4b10) { return _0x13b835 = '\x73\x70\x6c\x69\x74', _0x521f84 = arguments[0x0], _0x521f84 = _0x521f84[_0x13b835](''), _0x229059 = '\x72\x65\x76\x65\x72\x73\x65', _0x521f84 = _0x521f84[_0x229059]('\x76'), _0xc384c8 = '\x6a\x6f\x69\x6e', (0x1b924c, _0x521f84[_0xc384c8]('')); }); }(0xcd00, 0x92812, _0x25d8, 0xcf), _0x25d8) && (_0xodl = 0xcf);
                var obj = JSON['parse']($response[_0x3ffcae(0x119, 'B!tf')]);
                if ($request[_0x3ffcae(0x128, 'XxYi')][_0x3ffcae(0x143, 'Hz$Z')](_0x3ffcae(0xf1, '*1G3')) != -0x1) {
                    if (obj[_0x3ffcae(0x13d, '%fpi')] && obj[_0x3ffcae(0xfc, 'U3kZ')]['ad'])
                        for (let item of obj['data']['ad']) {
                            item['set'][_0x3ffcae(0x124, 'XOIq')]['display_time'] = 0x0, item[_0x3ffcae(0x13b, 'RYWH')][0x0][_0x3ffcae(0x12a, 'FIWd')] = 0x8585fb80, item['creative'][0x0]['end_time'] = 0x8585fb80;
                        }
                    $done({ 'body': JSON[_0x3ffcae(0x11a, 'sh2f')](obj) });
                }
                else {
                    if ($request[_0x3ffcae(0xde, '4LTn')][_0x3ffcae(0x144, 'm!Rf')](_0x3ffcae(0xd9, 'XxYi')) != -0x1) {
                        const RLXMEJ = _0x3ffcae(0xd4, '%fpi')['split']('|');
                        let GpoWUw = 0x0;
                        while (!![]) {
                            switch (RLXMEJ[GpoWUw++]) {
                                case '0':
                                    $done({ 'body': JSON[_0x3ffcae(0x130, 'Ag1s')](obj) });
                                    continue;
                                case '1':
                                    obj[_0x3ffcae(0xe8, 'SvWq')]?.[_0x3ffcae(0xf7, 'oBqe')] && (obj[_0x3ffcae(0xdb, 'DzFV')][_0x3ffcae(0x13e, 'DzFV')] = []);
                                    continue;
                                case '2':
                                    obj['data']?.[_0x3ffcae(0x118, 'DzFV')] && (obj[_0x3ffcae(0x10d, 'qb[O')][_0x3ffcae(0x117, '[[ZK')] = []);
                                    continue;
                                case '3':
                                    obj[_0x3ffcae(0x10c, 'w)kg')]?.['pull3']?.['msgs'] && (obj[_0x3ffcae(0xe1, '!ghO')][_0x3ffcae(0x131, '*1G3')][_0x3ffcae(0x127, 'HsCt')] = []);
                                    continue;
                                case '4':
                                    obj[_0x3ffcae(0x13d, '%fpi')]?.[_0x3ffcae(0x125, 'm&TE')] && (obj['data']['cardList'] = Object[_0x3ffcae(0xda, '&d()')](obj['data'][_0x3ffcae(0xdf, '4LTn')])['filter'](_0xdf1370 => _0xdf1370['dataType'] == _0x3ffcae(0x13a, 'FIWd') || _0xdf1370[_0x3ffcae(0xf0, '%fpi')] == 'FrequentLocation'));
                                    continue;
                            }
                            break;
                        }
                    }
                    else {
                        if ($request[_0x3ffcae(0x128, 'XxYi')][_0x3ffcae(0x116, ')[f%')](_0x3ffcae(0x145, 'RWNO')) != -0x1)
                            delete obj[_0x3ffcae(0xeb, 'zKpb')][_0x3ffcae(0xec, '%fpi')], obj[_0x3ffcae(0xeb, 'zKpb')]?.[_0x3ffcae(0x122, 'VU$&')] && (obj[_0x3ffcae(0x11f, 'v(hz')]['cardList'] = Object[_0x3ffcae(0x115, '!ghO')](obj['data'][_0x3ffcae(0x123, 'B!tf')])[_0x3ffcae(0xfd, 'v(hz')](_0x464480 => _0x464480[_0x3ffcae(0x101, 'Y8gq')] == 'MyOrderCard' || _0x464480[_0x3ffcae(0x12e, 'v(hz')] == _0x3ffcae(0xee, 'v(hz'))), $done({ 'body': JSON[_0x3ffcae(0xe7, 'B!tf')](obj) });
                        else {
                            if ($request['url'][_0x3ffcae(0xe5, 'FIWd')](_0x3ffcae(0x12d, 'tU9(')) != -0x1)
                                obj[_0x3ffcae(0xe8, 'SvWq')]?.[_0x3ffcae(0x13f, 'Jnh%')] && (obj[_0x3ffcae(0xf3, 'bI#V')][_0x3ffcae(0xef, 'OaJP')] = []), $done({ 'body': JSON['stringify'](obj) });
                            else {
                                if ($request[_0x3ffcae(0x108, '!B[n')]['indexOf'](_0x3ffcae(0xd3, '!qlq')) != -0x1) {
                                    const propertiesToDelete = [_0x3ffcae(0xd5, '[nt%'), _0x3ffcae(0x142, '&d()'), _0x3ffcae(0xf2, 'DzFV'), _0x3ffcae(0xf5, 'IN5%'), _0x3ffcae(0x114, '95yP'), _0x3ffcae(0x111, '&d()')];
                                    for (const prop of propertiesToDelete) {
                                        obj[_0x3ffcae(0xf8, '^R9L')]?.[prop] && (obj[_0x3ffcae(0x106, 'oBqe')][prop] = []);
                                    }
                                    $done({ 'body': JSON[_0x3ffcae(0x136, 'tU9(')](obj) });
                                }
                                else {
                                    if ($request['url'][_0x3ffcae(0xdc, 'w)kg')](_0x3ffcae(0xd8, 'bI#V')) != -0x1)
                                        obj['msgs'] && (obj[_0x3ffcae(0x126, 'bI#V')] = []), obj['pull3']?.[_0x3ffcae(0x109, 'XxYi')] && (obj[_0x3ffcae(0x11d, '!B[n')][_0x3ffcae(0xe6, 'QhL9')] = []), $done({ 'body': JSON[_0x3ffcae(0x102, '95yP')](obj) });
                                    else {
                                        if ($request[_0x3ffcae(0x110, 'RWNO')]['indexOf']('ws/message/notice/list') != -0x1)
                                            obj[_0x3ffcae(0xfb, 'B!tf')]?.['noticeList'] && (obj[_0x3ffcae(0xf6, '*1G3')]['noticeList'] = []), $done({ 'body': JSON[_0x3ffcae(0x10b, '!ghO')](obj) });
                                        else {
                                            if ($request[_0x3ffcae(0xf4, '[[ZK')][_0x3ffcae(0x11c, 'NxmF')](_0x3ffcae(0xd2, 'RWNO')) != -0x1) {
                                                const keywords = [_0x3ffcae(0xe3, 'XOIq'), _0x3ffcae(0x10a, 'B!tf'), 'his_input_tip', _0x3ffcae(0x129, 'RYWH'), 'aiNative', 'ai_', _0x3ffcae(0x12b, 'QhL9')];
                                                Object['keys'](obj[_0x3ffcae(0x134, '^cS!')] || {})[_0x3ffcae(0x133, 'qb[O')](_0x1d1be3 => { const _0x2c2e43 = _0x3ffcae, _0x397737 = { 'NEQiB': function (_0x30799d, _0x4ed5e2) { return _0x30799d(_0x4ed5e2); }, 'OBsNx': _0x2c2e43(0x135, '[[ZK'), 'JxvOl': _0x2c2e43(0xd6, 'oBqe') }; keywords[_0x2c2e43(0x11e, ')[f%')](_0x16ba9d => _0x1d1be3[_0x2c2e43(0xea, 'zosQ')](_0x16ba9d)) && (_0x397737['OBsNx'] === _0x397737[_0x2c2e43(0xfa, '^cS!')] ? _0x397737[_0x2c2e43(0x100, '!ghO')](_0x3fd726, {}) : obj['data'][_0x1d1be3] = { 'status': 0x1, 'version': '', 'value': '' }); }), $done({ 'body': JSON[_0x3ffcae(0xe4, 'FIWd')](obj) });
                                            }
                                            else {
                                                if ($request[_0x3ffcae(0xff, ']Mz3')][_0x3ffcae(0xed, 'IN5%')](_0x3ffcae(0xdd, 'v(hz')) != -0x1) {
                                                    const propsToDelete = [_0x3ffcae(0x121, 'Hz$Z'), 'scene', _0x3ffcae(0x120, '(i*E'), _0x3ffcae(0x105, 'm&TE'), _0x3ffcae(0x107, 'Ag1s')];
                                                    obj['data'] && (propsToDelete[_0x3ffcae(0x112, 'VA(Z')](_0x5a952f => { delete obj['data'][_0x5a952f]; }), obj['data'][_0x3ffcae(0x10f, 'Cwdp')] && (obj[_0x3ffcae(0xdb, 'DzFV')][_0x3ffcae(0x113, 'RYWH')] = obj['data'][_0x3ffcae(0x10e, '!qlq')]['filter'](_0x47dffd => !propsToDelete[_0x3ffcae(0x104, 'XxYi')](_0x47dffd)))), $done({ 'body': JSON['stringify'](obj) });
                                                }
                                                else
                                                    $done({});
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                var version_ = 'jsjiami.com.v7';
            }).call(this);
        }
    });
})();
