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
    const __wayxContexts = { "response": { "surge": { "phase": "response", "binary": false, "responseBody": true, "name": "weibo_json.js", "from": "qx", "to": "surge", "apiPlan": { "version": 1, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"], "source": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": "open-url", "media": "media-url", "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" }, "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" } }, "runtimePolicyVersion": 8, "omittedParameters": [] } } }, __wayxConfig = __wayxContexts[__wayxHost.response === undefined ? 'request' : 'response']?.[__wayxTarget];
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
                const version = 'V2.0.142';
                const mainConfig = { isDebug: !1, author: "ddgksf2013", removeHomeVip: !0, removeHomeCreatorTask: !0, removeRelate: !0, removeGood: !0, removeFollow: !0, modifyMenus: !0, removeRelateItem: !1, removeRecommendItem: !0, removeRewardItem: !0, removeLiveMedia: !0, removeNextVideo: !1, removePinedTrending: !0, removeInterestFriendInTopic: !1, removeInterestTopic: !1, removeInterestUser: !0, removeLvZhou: !0, removeSearchWindow: !0, profileSkin1: null, profileSkin2: null, tabIconVersion: 0, tabIconPath: "" }, itemMenusConfig = { creator_task: !1, mblog_menus_custom: !1, mblog_menus_video_later: !0, mblog_menus_comment_manager: !0, mblog_menus_avatar_widget: !1, mblog_menus_card_bg: !1, mblog_menus_long_picture: !0, mblog_menus_delete: !0, mblog_menus_edit: !0, mblog_menus_edit_history: !0, mblog_menus_edit_video: !0, mblog_menus_sticking: !0, mblog_menus_open_reward: !0, mblog_menus_novelty: !1, mblog_menus_favorite: !0, mblog_menus_promote: !0, mblog_menus_modify_visible: !0, mblog_menus_copy_url: !0, mblog_menus_follow: !0, mblog_menus_video_feedback: !0, mblog_menus_shield: !0, mblog_menus_report: !0, mblog_menus_apeal: !0, mblog_menus_home: !0 }, modifyCardsUrls = ["/cardlist", "video/community_tab", "searchall"], modifyStatusesUrls = ["statuses/friends/timeline", "statuses_unread_hot_timeline", "statuses/unread_friends_timeline", "statuses/unread_hot_timeline", "groups/timeline", "statuses/friends_timeline"], otherUrls = { "/profile/me": "removeHome", "/statuses/extend": "itemExtendHandler", "/video/remind_info": "removeVideoRemind", "/checkin/show": "removeCheckin", "/live/media_homelist": "removeMediaHomelist", "/container_detail": "removeComments", "/container/get_item": "containerHandler", "/profile/container_timeline": "userHandler", "/video/tiny_stream_video_list": "nextVideoHandler", "/2/statuses/video_mixtimeline": "nextVideoHandler", "video/tiny_stream_mid_detail": "nextVideoHandler", "/!/client/light_skin": "tabSkinHandler", "/littleskin/preview": "skinPreviewHandler", "/search/finder": "removeSearchMain", "/search/container_timeline": "removeSearch", "/search/container_discover": "removeSearch", "/2/flowpage": "removeMsgAd", "/2/page?": "removePage", "/statuses/unread_topic_timeline": "topicHandler", "/square&pageDataType/": "squareHandler", "/statuses/container_timeline_topic": "removeMain", "/statuses/container_timeline": "removeMainTab", "wbapplua/wbpullad.lua": "removeLuaScreenAds", "interface/sdk/sdkad.php": "removePhpScreenAds", "a=trends": "removeTopics", user_center: "modifiedUserCenter", "a=get_coopen_ads": "removeIntlOpenAds", "php?a=search_topic": "removeSearchTopic", "ad/realtime": "removeRealtimeAd", "ad/preload": "removeAdPreload", "php?a=open_app": "removeAdBanner" };
                function getModifyMethod(e) { for (const o of modifyCardsUrls)
                    if (-1 < e.indexOf(o))
                        return "removeCards"; for (const i of modifyStatusesUrls)
                    if (-1 < e.indexOf(i))
                        return "removeTimeLine"; for (var [t, a] of Object.entries(otherUrls))
                    if (-1 < e.indexOf(t))
                        return a; return null; }
                function removeRealtimeAd(e) { return delete e.ads, e.code = 4016, e; }
                function removeAdBanner(e) { return e.data.close_ad_setting && delete e.data.close_ad_setting, e.data.detail_banner_ad && (e.data.detail_banner_ad = []), e; }
                function removeAdPreload(e) { if (e.ads) {
                    e.last_ad_show_interval = 86400;
                    for (var t of e.ads)
                        t.start_time = 2681574400, t.end_time = 2681660799, t.display_duration = 0, t.daily_display_cnt = 0, t.total_display_cnt = 0;
                } return e; }
                function removeIntlOpenAds(e) { return e.data && (e.data = { display_ad: 1 }), e; }
                function removeSearchTopic(e) { return e.data && 0 !== e.data.search_topic?.cards.length && (e.data.search_topic.cards = Object.values(e.data.search_topic.cards).filter(e => !("searchtop" == e.type)), e.data.trending_topic) && delete e.data.trending_topic, e; }
                function modifiedUserCenter(e) { return e.data && 0 !== e.data.length && e.data.cards && (e.data.cards = Object.values(e.data.cards).filter(e => !("personal_vip" == e.items[0].type))), e; }
                function removeTopics(e) { return e.data && (e.data.order = ["search_topic"]), e; }
                function isAd(e) { return !!e && ("广告" == e.mblogtypename || "热推" == e.mblogtypename || "ad" == e.promotion?.type || "ad" == e.page_info?.actionlog?.source || "广告" == e.content_auth_info?.content_auth_title); }
                function squareHandler(e) { return e.items, e; }
                function removeMainTab(e) { if (e.loadedInfo && e.loadedInfo.headers && delete e.loadedInfo.headers, e.items) {
                    var t, a = [];
                    for (t of e.items)
                        isAd(t.data) || (t.data?.page_info?.video_limit && delete t.data.page_info.video_limit, t.data?.common_struct && delete t.data.common_struct, t.category && "group" == t.category && -1 == JSON.stringify(t.items).indexOf("profile_top")) || a.push(t);
                    e.items = a, log("removeMainTab success");
                } return e; }
                function removeMain(e) { if (e.loadedInfo && e.loadedInfo.headers && delete e.loadedInfo.headers, e.items) {
                    var t, a = [];
                    for (t of e.items)
                        "feed" == t.category ? isAd(t.data) || a.push(t) : "group" == t.category ? 0 < t.items.length && t.items[0].data?.itemid?.includes("search_input") ? (t.items = t.items.filter(e => e?.data?.itemid?.includes("mine_topics") || e?.data?.itemid?.includes("search_input") || 202 == e?.data?.card_type), t.items[0].data.hotwords = [{ word: "搜索超话", tip: "" }], a.push(t)) : 0 < t.items.length && t.items[0].data?.itemid?.includes("top_title") || (0 < t.items.length && (t.items = Object.values(t.items).filter(e => "feed" === e.category || "card" === e.category)), a.push(t)) : t.data?.card_type && -1 < [202, 200].indexOf(t.data.card_type) || a.push(t);
                    e.items = a, log("removeMain success");
                } return e; }
                function topicHandler(e) { var t = e.cards; if (t && (mainConfig.removeUnfollowTopic || mainConfig.removeUnusedPart)) {
                    var a, o = [];
                    for (a of t) {
                        let e = !0;
                        if (a.mblog) {
                            var i = a.mblog.buttons;
                            mainConfig.removeUnfollowTopic && i && "follow" == i[0].type && (e = !1);
                        }
                        else {
                            if (!mainConfig.removeUnusedPart)
                                continue;
                            if ("bottom_mix_activity" == a.itemid)
                                e = !1;
                            else if ("正在活跃" == a?.top?.title)
                                e = !1;
                            else if (200 == a.card_type && a.group)
                                e = !1;
                            else {
                                i = a.card_group;
                                if (!i)
                                    continue;
                                var r = i[0];
                                if (-1 < ["guess_like_title", "cats_top_title", "chaohua_home_readpost_samecity_title"].indexOf(r.itemid))
                                    e = !1;
                                else if (1 < i.length) {
                                    var n, d = [];
                                    for (n of i)
                                        -1 == ["chaohua_discovery_banner_1", "bottom_mix_activity"].indexOf(n.itemid) && d.push(n);
                                    a.card_group = d;
                                }
                            }
                        }
                        e && o.push(a);
                    }
                    e.cards = o, log("topicHandler success");
                } return e; }
                function removeSearchMain(e) { var t = e.channelInfo.channels; if (t) {
                    var a, o = [];
                    for (a of t)
                        a.payload && (a.payload?.items && (a.payload.items = []), a.payload?.loadedInfo?.searchBarContent && (a.payload.loadedInfo.searchBarContent = [{}]), a.payload?.loadedInfo?.headerBack && (a.payload.loadedInfo.headerBack.channelStyleMap = {}), delete a.titleInfoAbsorb, delete a.titleInfo, delete a.title, o.push(a));
                    e.channelInfo.channels = o, e.header?.data && removeHeader(e.header.data), e.channelInfo?.moreChannels && (delete e.channelInfo.moreChannels, delete e.channelInfo.channelConfig), log("remove_search main success");
                } return e; }
                function removeHeader(e) { if (e.items) {
                    var t, a = [];
                    for (t of e.items)
                        "group" == t.category && (t.items = t.items.filter(e => void 0 === e.data?.card_type || 101 === e.data?.card_type || 17 === e.data?.card_type).map(e => (17 === e.data?.card_type && (e.data.col = 1), e)), 0 < t.items.length) && a.push(t);
                    log("remove Header success"), e.items = a;
                } return e; }
                function checkSearchWindow(e) { return !!mainConfig.removeSearchWindow && "card" == e.category && ("finder_window" == e.data?.itemid || "discover_gallery" == e.data?.itemid || "more_frame" == e.data?.itemid || 208 == e.data?.card_type || 236 == e.data?.card_type || 247 == e.data?.card_type || 217 == e.data?.card_type || 101 == e.data?.card_type || 19 == e.data?.card_type || e.data?.mblog?.page_info?.actionlog?.source?.includes("ad") || e.data?.pic?.includes("ads")); }
                function removeSearch(e) { if (e.items) {
                    var t, a = [];
                    for (t of e.items)
                        "feed" == t.category ? isAd(t.data) || (t.data?.page_info?.video_limit && delete t.data.page_info.video_limit, a.push(t)) : "group" == t.category ? "guess" === t.header?.type && "search" != t.itemExt?.filterType || (t.items = t.items.filter(e => (void 0 === e.data?.card_type || 17 === e.data?.card_type || 10 === e.data?.card_type) && "广告" !== e.data?.content_auth_info?.content_auth_title).map(e => (17 === e.data?.card_type && (e.data.col = 1), e)), 0 < t.items.length && a.push(t)) : checkSearchWindow(t) || a.push(t);
                    e.items = a, e.loadedInfo && (e.loadedInfo.searchBarContent = [], e.loadedInfo.headerBack) && (e.loadedInfo.headerBack.channelStyleMap = {}), log("remove_search success");
                } return e; }
                function removeMsgAd(e) { if (e.items) {
                    var t, a = [];
                    for (t of e.items)
                        "hotword" == t.itemId ? (t.items = t.items.filter(e => e?.data?.pic?.includes("com/wb_search")), a.push(t)) : "text" == t.type && t?.text?.content?.includes("实时热点") && a.push(t);
                    e.items = a, e.channelInfo && delete e.channelInfo, log("remove_search success");
                } return e; }
                function removePage(e) { return removeCards(e), mainConfig.removePinedTrending && e.cards && 0 < e.cards.length && e.cards[0].card_group && (e.cards[0].card_group = e.cards[0].card_group.filter(e => !(e?.actionlog?.ext?.includes("ads_word") || e?.itemid?.includes("t:51") || e?.itemid?.includes("ads_word")))), e; }
                function removeCards(e) { if (e.hotwords && (e.hotwords = []), e.cards) {
                    var t, a = [];
                    for (t of e.cards) {
                        "232082type=1" != e.cardlistInfo?.containerid || 17 != t.card_type && 58 != t.card_type && 11 != t.card_type || (o = t.card_type + 1, t = { card_type: o });
                        var o = t.card_group;
                        if (o && 0 < o.length) {
                            var i = [];
                            for (const n of o)
                                118 == n.card_type || isAd(n.mblog) || -1 == JSON.stringify(n).indexOf("res_from:ads") && i.push(n);
                            t.card_group = i, a.push(t);
                        }
                        else {
                            var r = t.card_type;
                            -1 < [9, 165].indexOf(r) ? isAd(t.mblog) || a.push(t) : -1 < [1007, 180].indexOf(r) || a.push(t);
                        }
                    }
                    e.cards = a;
                } e.items && (log("data.items"), removeSearch(e)); }
                function lvZhouHandler(e) { if (mainConfig.removeLvZhou && e) {
                    var t = e.common_struct;
                    if (t) {
                        var a = [];
                        for (const o of t)
                            "绿洲" != o.name && a.push(o);
                        e.common_struct = a;
                    }
                } }
                function isBlock(e) { var t = mainConfig.blockIds || []; if (0 !== t.length) {
                    var a = e.user.id;
                    for (const o of t)
                        if (o == a)
                            return !0;
                } return !1; }
                function removeTimeLine(e) { for (const a of ["ad", "advertises", "trends", "headers"])
                    e[a] && delete e[a]; if (e.statuses) {
                    var t = [];
                    for (const o of e.statuses)
                        isAd(o) || (lvZhouHandler(o), o.common_struct && delete o.common_struct, o.category && "group" == o.category) || t.push(o);
                    e.statuses = t;
                } }
                function removeHomeVip(e) { return e.header && e.header.vipView && (e.header.vipView = null), e; }
                function removeVideoRemind(e) { e.bubble_dismiss_time = 0, e.exist_remind = !1, e.image_dismiss_time = 0, e.image = "", e.tag_image_english = "", e.tag_image_english_dark = "", e.tag_image_normal = "", e.tag_image_normal_dark = ""; }
                function itemExtendHandler(e) { var t; (mainConfig.removeRelate || mainConfig.removeGood) && e.trend && e.trend.titles && (t = e.trend.titles.title, mainConfig.removeRelate && "相关推荐" === t || mainConfig.removeGood && "博主好物种草" === t) && delete e.trend, mainConfig.removeFollow && e.follow_data && (e.follow_data = null), mainConfig.removeRewardItem && e.reward_info && (e.reward_info = null), e.head_cards && delete e.head_cards, e.page_alerts && (e.page_alerts = null); try {
                    -1 < e.trend.extra_struct.extBtnInfo.btn_picurl.indexOf("timeline_icon_ad_delete") && delete e.trend;
                }
                catch (e) { } if (mainConfig.modifyMenus && e.custom_action_list) {
                    var a = [];
                    for (const r of e.custom_action_list) {
                        var o = r.type, i = itemMenusConfig[o];
                        void 0 === i ? a.push(r) : "mblog_menus_copy_url" === o ? a.unshift(r) : i && a.push(r);
                    }
                    e.custom_action_list = a;
                } }
                function updateFollowOrder(e) { try {
                    for (var t of e.items) {
                        var a;
                        if ("mainnums_friends" === t.itemId)
                            return a = t.click.modules[0].scheme, t.click.modules[0].scheme = a.replace("231093_-_selfrecomm", "231093_-_selffollowed"), void log("updateFollowOrder success");
                    }
                }
                catch (e) {
                    console.log("updateFollowOrder fail");
                } }
                function updateProfileSkin(t, e) { try {
                    var a = mainConfig[e];
                    if (a) {
                        let e = 0;
                        for (var o of t.items)
                            if (o.image)
                                try {
                                    "alpha" != (dm = o.image.style.darkMode) && (o.image.style.darkMode = "alpha"), o.image.iconUrl = a[e++], o.dot && (o.dot = []);
                                }
                                catch (e) { }
                        log("updateProfileSkin success");
                    }
                }
                catch (e) {
                    console.log("updateProfileSkin fail");
                } }
                function removeHome(e) { if (e.items) {
                    var t, a = [];
                    for (t of e.items) {
                        var o = t.itemId;
                        "profileme_mine" == o ? ((t = mainConfig.removeHomeVip ? removeHomeVip(t) : t).header?.vipIcon && delete t.header.vipIcon, updateFollowOrder(t), a.push(t)) : "100505_-_top8" == o ? (updateProfileSkin(t, "profileSkin1"), a.push(t)) : "100505_-_newcreator" == o ? "grid" == t.type ? (updateProfileSkin(t, "profileSkin2"), a.push(t)) : mainConfig.removeHomeCreatorTask || a.push(t) : "100505_-_chaohua" != o && "100505_-_manage" != o && "100505_-_recentlyuser" != o || (0 < t.images?.length && (t.images = t.images.filter(e => "100505_-_chaohua" == e.itemId || "100505_-_recentlyuser" == e.itemId)), a.push(t));
                    }
                    e.items = a;
                } return e; }
                function removeCheckin(e) { log("remove tab1签到"), e.show = 0; }
                function removeMediaHomelist(e) { mainConfig.removeLiveMedia && (log("remove 首页直播"), e.data = {}); }
                function removeComments(e) { var t = ["广告", "廣告", "相关内容", "推荐", "热推", "推薦", "荐读"], a = (e.pageHeader && (e.pageHeader.data.items = e.pageHeader.data.items.filter(e => "detail" == e.category)), e.items || []); if (0 !== a.length) {
                    var o = [];
                    for (const r of a) {
                        var i = r.data.adType || "";
                        -1 == t.indexOf(i) && 6 != r.data.card_type && 236 != r.data.card_type && o.push(r);
                    }
                    log("remove 评论区相关和推荐内容"), e.items = o, e.tip_msg && delete e.tip_msg;
                } }
                function containerHandler(e) { mainConfig.removeInterestFriendInTopic && "超话里的好友" === e.card_type_name && (log("remove 超话里的好友"), e.card_group = []), mainConfig.removeInterestTopic && e.itemid && (-1 < e.itemid.indexOf("infeed_may_interest_in") ? (log("remove 感兴趣的超话"), e.card_group = []) : -1 < e.itemid.indexOf("infeed_friends_recommend") && (log("remove 超话好友关注"), e.card_group = [])); }
                function userHandler(e) { if (e = removeMainTab(e), mainConfig.removeInterestUser && e.items) {
                    var t, a = [];
                    for (t of e.items) {
                        let e = !0;
                        if ("group" == t.category)
                            try {
                                "可能感兴趣的人" == t.items[0].data.desc && (e = !1);
                            }
                            catch (e) { }
                        e && (t.data?.common_struct && delete t.data.common_struct, a.push(t));
                    }
                    e.items = a, log("removeMain sub success");
                } return e; }
                function nextVideoHandler(e) { if (e.statuses) {
                    var t, a = [];
                    for (t of e.statuses)
                        if (!isAd(t)) {
                            for (const o of ["forward_redpacket_info", "shopping", "float_info", "tags"])
                                t.video_info?.[o] && delete t.video_info[o];
                            a.push(t);
                        }
                    e.statuses = a, log("removeMainTab Success");
                } return e; }
                function tabSkinHandler(e) { try {
                    var t, a = mainConfig.tabIconVersion;
                    if (e.data.canUse = 1, a && mainConfig.tabIconPath && !(a < 100)) {
                        for (t of e.data.list)
                            t.version = a, t.downloadlink = mainConfig.tabIconPath;
                        log("tabSkinHandler success");
                    }
                }
                catch (e) {
                    log("tabSkinHandler fail");
                } }
                function skinPreviewHandler(e) { e.data.skin_info.status = 1; }
                function removeLuaScreenAds(e) { if (e.cached_ad)
                    for (var t of e.cached_ad.ads)
                        t.start_date = 1893254400, t.show_count = 0, t.duration = 0, t.end_date = 1893340799; return e; }
                function removePhpScreenAds(e) { if (e.ads) {
                    e.show_push_splash_ad = !1, e.background_delay_display_time = 0, e.lastAdShow_delay_display_time = 0, e.realtime_ad_video_stall_time = 0, e.realtime_ad_timeout_duration = 0;
                    for (var t of e.ads)
                        t.displaytime = 0, t.displayintervel = 86400, t.allowdaydisplaynum = 0, t.displaynum = 0, t.displaytime = 1, t.begintime = "2029-12-30 00:00:00", t.endtime = "2029-12-30 23:59:59";
                } return e; }
                function log(e) { mainConfig.isDebug && console.log(e); }
                var body = $response.body, url = $request.url;
                let method = getModifyMethod(url);
                if (method) {
                    log(method);
                    var func = eval(method);
                    let data = JSON.parse(body.match(/\{.*\}/)[0]);
                    new func(data), body = JSON.stringify(data), "removePhpScreenAds" == method && (body = JSON.stringify(data) + "OK");
                }
                $done({ body: body });
            }).call(this);
        }
    });
})();
