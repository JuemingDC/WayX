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
    const __wayxContexts = { "response": { "surge": { "phase": "response", "binary": false, "responseBody": true, "name": "cnftp.js", "from": "qx", "to": "surge", "apiPlan": { "version": 1, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"], "source": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": "open-url", "media": "media-url", "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" }, "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" } }, "runtimePolicyVersion": 8, "omittedParameters": [] } } }, __wayxConfig = __wayxContexts[__wayxHost.response === undefined ? 'request' : 'response']?.[__wayxTarget];
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
                const url = $request.url;
                if (!$response.body)
                    $done({});
                const isIQY = url.includes("iqiyi.com/");
                const isMG = url.includes("mgtv.com/");
                const isYK = url.includes("youku.com/");
                let obj = JSON.parse($response.body);
                if (isIQY) {
                    if (url.includes("/bottom_theme?")) {
                        if (obj?.cards?.length > 0) {
                            let card = obj.cards[0];
                            if (card?.items?.length > 0) {
                                card.items = card.items.filter((i) => ["29", "31", "34"]?.includes(i?._id));
                                for (let i = 0; i < card.items.length; i++) {
                                    card.items[i].show_order = i + 1;
                                }
                            }
                        }
                    }
                    else if (url.includes("/common_switch?")) {
                        if (obj?.content?.resource) {
                            const items = [
                                "activities",
                                "ai_guide",
                                "cast_device_ad",
                                "flow_promotion",
                                "growth_award",
                                "ip_restriction_ad",
                                "member",
                                "ppc_feed_insert",
                                "second_floor_guide",
                                "speed_ad",
                                "vip_tips",
                                "vipgrowth_value",
                                "vr"
                            ];
                            for (let i of items) {
                                delete obj.content.resource[i];
                            }
                        }
                    }
                    else if (url.includes("/control/")) {
                        if (obj?.content?.weather) {
                            delete obj.content.weather;
                        }
                    }
                    else if (url.includes("/getMyMenus?")) {
                        if (obj?.data?.length > 0) {
                            let newMenus = [];
                            for (let item of obj.data) {
                                if (["wd_liebiao_2", "wd_liebiao_3", "wd_liebiao_4"]?.includes(item?.statistic?.block)) {
                                    continue;
                                }
                                else {
                                    if (item?.menuList?.length > 0) {
                                        let newLists = [];
                                        for (let i of item.menuList) {
                                            if (i?.menuType === 121) {
                                                continue;
                                            }
                                            else {
                                                newLists.push(i);
                                            }
                                        }
                                        item.menuList = newLists;
                                        newMenus.push(item);
                                    }
                                    else {
                                        newMenus.push(item);
                                    }
                                }
                            }
                            obj.data = newMenus;
                        }
                    }
                    else if (url.includes("/home_top_menu?")) {
                        if (obj?.cards?.length > 0) {
                            let card = obj.cards[0];
                            if (card?.items?.length > 0) {
                                card.items = card.items.filter((i) => !["1017", "8196", "4525518866820370"]?.includes(i?._id));
                                for (let i = 0; i < card.items.length; i++) {
                                    card.items[i].show_order = i + 1;
                                }
                            }
                        }
                    }
                    else if (url.includes("/mixer?")) {
                        if (obj?.errorCode === 0) {
                            const items = ["adSlots", "splashLottieFile", "splashUiConfig"];
                            for (let i of items) {
                                delete obj[i];
                            }
                        }
                    }
                    else if (url.includes("/search.video.iqiyi.com/")) {
                        if (obj?.cache_expired_sec) {
                            obj.cache_expired_sec = 1;
                        }
                        if (obj?.data) {
                            obj.data = [{ query: "搜索内容" }];
                        }
                        if (obj?.show_style?.roll_period) {
                            obj.show_style.roll_period = 1000;
                        }
                    }
                    else if (url.includes("/views_category/")) {
                        if (obj?.base?.statistics?.ad_str) {
                            delete obj.base.statistics.ad_str;
                        }
                        if (obj?.cards?.length > 0) {
                            let newCards = [];
                            for (let card of obj.cards) {
                                if (card?.blocks?.length > 0) {
                                    let newItems = [];
                                    for (let item of card.blocks) {
                                        if (["block_321", "block_415", "block_416"]?.includes(item?.block_name)) {
                                            continue;
                                        }
                                        else if (item?.buttons?.[0]?.id === "ad") {
                                            continue;
                                        }
                                        else {
                                            newItems.push(item);
                                        }
                                    }
                                    card.blocks = newItems;
                                    newCards.push(card);
                                }
                                else {
                                    newCards.push(card);
                                }
                            }
                            obj.cards = newCards;
                        }
                    }
                    else if (url.includes("/views_comment/")) {
                        if (obj?.cards?.length > 0) {
                            obj.cards = obj.cards.filter((i) => i.hasOwnProperty("alias_name") && !["comment_resource_card", "comment_resource_convention_card"]?.includes(i?.alias_name));
                        }
                    }
                    else if (url.includes("/views_home/")) {
                        if (obj?.base?.statistics?.ad_str) {
                            delete obj.base.statistics.ad_str;
                        }
                        if (obj?.cards?.length > 0) {
                            let newCards = [];
                            for (let card of obj.cards) {
                                if (["ad_mobile_flow", "ad_trueview", "focus", "qy_home_vip_opr_banner"]?.includes(card?.alias_name)) {
                                    continue;
                                }
                                else {
                                    if (card?.top_banner?.l_blocks?.length > 0) {
                                        for (let item of card.top_banner.l_blocks) {
                                            if (item?.buttons?.length > 0) {
                                                delete item.buttons;
                                            }
                                        }
                                        newCards.push(card);
                                    }
                                    else {
                                        newCards.push(card);
                                    }
                                }
                            }
                            obj.cards = newCards;
                        }
                    }
                    else if (url.includes("/views_plt/")) {
                        if (obj?.kv_pair) {
                            const items = ["activity_tab", "cloud_cinema", "vip_fixed_card"];
                            for (let i of items) {
                                delete obj.kv_pair[i];
                            }
                        }
                        if (obj?.cards?.length > 0) {
                            obj.cards = obj.cards.filter((i) => ![
                                "bi_playlist",
                                "cloud_cinema_play_privilege",
                                "cloud_cinema_playlist",
                                "cloud_cinema_playlist_1",
                                "cloud_cinema_playlist_2",
                                "cloud_cinema_privilege_icon",
                                "cloud_cinema_star_activities",
                                "play_ad_no_vip",
                                "play_around",
                                "play_custom_card",
                                "play_splendid_collection",
                                "play_type_topical_card_3",
                                "play_type_topical_card_4",
                                "play_variety_custom_2",
                                "play_vertical",
                                "play_vip_promotion",
                                "play_water_fall_like",
                                "play_water_fall_like_title",
                                "plt_cloud_cinema_photo",
                                "plt_cloud_cinema_short2",
                                "plt_playlist",
                                "plt_playlist_1",
                                "plt_playlist_2",
                                "funny_short_video"
                            ]?.includes(i?.alias_name));
                        }
                    }
                    else if (url.includes("/views_search/")) {
                        if (obj?.cards?.length > 0) {
                            let newCards = [];
                            for (let card of obj.cards) {
                                if ([
                                    "ad_mobile_flow",
                                    "hot_query_bottom",
                                    "hot_query_search_top_ad",
                                    "search_com_related_query",
                                    "search_intent_detail_onesearch",
                                    "search_mid_text_ad",
                                    "search_onebox_v2",
                                    "search_small_card_ad",
                                    "search_topbanner_text",
                                    "search_vip_banner"
                                ]?.includes(card?.strategy_com_id)) {
                                    continue;
                                }
                                else {
                                    if (card?.blocks?.length > 0) {
                                        let newBlocks = [];
                                        for (let i of card.blocks) {
                                            if (i.hasOwnProperty("block_name")) {
                                                newBlocks.push(i);
                                            }
                                            else if (i.hasOwnProperty("block_type")) {
                                                if (![861, 959]?.includes(i?.block_type)) {
                                                    newBlocks.push(i);
                                                }
                                            }
                                        }
                                        card.blocks = newBlocks;
                                        newCards.push(card);
                                    }
                                    else {
                                        newCards.push(card);
                                    }
                                }
                            }
                            obj.cards = newCards;
                        }
                    }
                    else if (url.includes("/waterfall/")) {
                        if (obj?.base?.statistics?.ad_str) {
                            delete obj.base.statistics.ad_str;
                        }
                        if (obj?.cards?.length > 0) {
                            let newCards = [];
                            for (let card of obj.cards) {
                                if (card.hasOwnProperty("block_class")) {
                                    continue;
                                }
                                else {
                                    if (card?.blocks?.length > 0) {
                                        let newItems = [];
                                        for (let item of card.blocks) {
                                            if (item.hasOwnProperty("block_class")) {
                                                continue;
                                            }
                                            else {
                                                newItems.push(item);
                                            }
                                        }
                                        card.blocks = newItems;
                                        newCards.push(card);
                                    }
                                    else {
                                        newCards.push(card);
                                    }
                                }
                            }
                            obj.cards = newCards;
                        }
                    }
                }
                else if (isMG) {
                    if (url.includes("/dynamic/v1/channel/index/")) {
                        if (obj?.adInfo) {
                            delete obj.adInfo;
                        }
                        if (obj?.data?.length > 0) {
                            let newItems = [];
                            for (let item of obj.data) {
                                if (item?.moduleEntityId === "91") {
                                    if (item?.DSLList?.length > 0) {
                                        let newLists = [];
                                        for (let i of item.DSLList) {
                                            if (i?.data?.items?.length > 0) {
                                                let newII = [];
                                                for (let ii of i.data.items) {
                                                    if (ii?.id === 0) {
                                                        continue;
                                                    }
                                                    else if (["热门", "推荐"]?.includes(ii?.cornerTitle)) {
                                                        continue;
                                                    }
                                                    else {
                                                        newII.push(ii);
                                                    }
                                                }
                                                i.data.items = newII;
                                                newLists.push(i);
                                            }
                                            else {
                                                newLists.push(i);
                                            }
                                        }
                                        item.DSLList = newLists;
                                        newItems.push(item);
                                    }
                                    else {
                                        newItems.push(item);
                                    }
                                }
                                else if (["842", "2237", "5418"]?.includes(item?.moduleEntityId)) {
                                    continue;
                                }
                                else {
                                    newItems.push(item);
                                }
                            }
                            obj.data = newItems;
                        }
                        if (obj?.moduleIDS?.length > 0) {
                            obj.moduleIDS = obj.moduleIDS.filter((i) => !["842", "2237", "5418"]?.includes(i?.moduleEntityId));
                        }
                    }
                    else if (url.includes("/dynamic/v1/channel/vrsList/")) {
                        if (obj?.data?.length > 0) {
                            let newItems = [];
                            for (let item of obj.data) {
                                if (item?.vclassId > 100033 && item?.vclassId !== 100160) {
                                    continue;
                                }
                                else {
                                    newItems.push(item);
                                }
                            }
                            obj.data = newItems;
                        }
                    }
                    else if (url.includes("/mobile/config?")) {
                        const items = [
                            "XmVideoB",
                            "XmsellSwitch",
                            "damang_duanju_tab",
                            "damang_tab",
                            "dc_adConfig",
                            "relative_ads",
                            "second_floor_guide_switch"
                        ];
                        for (let i of items) {
                            if (obj?.data?.[i]) {
                                obj.data[i] = "0";
                            }
                        }
                        if (obj?.data?.XmFsLvlCatAddr) {
                            obj.data.XmFsLvlCatAddr = "";
                        }
                    }
                    else if (url.includes("/mobile/recommend/v2?")) {
                        if (obj?.data?.default) {
                            obj.data.default = { 0: ["搜索内容"] };
                        }
                        if (obj?.data?.recommend) {
                            obj.data.recommend = [];
                        }
                        if (obj?.data?.interval) {
                            obj.data.interval = 1000;
                        }
                    }
                    else if (url.includes("/odin/c1/channel/index?")) {
                        if (obj?.data?.length > 0) {
                            let newItems = [];
                            for (let item of obj.data) {
                                if (item?.moduleType === "childslideicon") {
                                    continue;
                                }
                                else {
                                    newItems.push(item);
                                }
                            }
                            obj.data = newItems;
                        }
                    }
                    else if (url.includes("/v1/vod/info?")) {
                        if (obj?.data?.config?.ad) {
                            obj.data.config.ad.wmShowTime = 0;
                        }
                        if (obj?.data?.config?.videoRcMod) {
                            obj.data.config.videoRcMod.toastStatus = 0;
                            obj.data.config.videoRcMod.toastTime = 0;
                        }
                        if (obj?.data?.tabs?.length > 0) {
                            obj.data.tabs = obj.data.tabs.filter((i) => ["1", "2"]?.includes(i?.type));
                        }
                        if (obj?.data?.template?.modules?.length > 0) {
                            let newMods = [];
                            for (let item of obj.data.template.modules) {
                                if ([202, 203, 301, 601, 701, 702]?.includes(item?.dataType)) {
                                    continue;
                                }
                                else {
                                    if (item?.clipInfo?.rcInfo) {
                                        delete item.clipInfo.rcInfo;
                                    }
                                    newMods.push(item);
                                }
                            }
                            obj.data.template.modules = newMods;
                        }
                        if (obj?.data?.template?.theme) {
                            delete obj.data.template.theme;
                        }
                    }
                    else if (url.includes("/v3/module/list?")) {
                        if (obj?.data?.list?.length > 0) {
                            let newList = [];
                            for (let item of obj.data.list) {
                                if ([3, 5, 6, 8]?.includes(item?.moduleType)) {
                                    continue;
                                }
                                else if (item?.moduleType === 2 && item?.title === "用户信息模块") {
                                    if (item?.data?.length > 0) {
                                        let newItems = [];
                                        for (let i of item.data) {
                                            if (["领取芒果卡权益", "签到赢积分"]?.includes(i?.title)) {
                                                continue;
                                            }
                                            else {
                                                newItems.push(i);
                                            }
                                        }
                                        item.data = newItems;
                                        newList.push(item);
                                    }
                                    else {
                                        newList.push(item);
                                    }
                                }
                                else if (item?.moduleType === 7 && item?.title === "我的服务") {
                                    if (item?.data?.length > 0) {
                                        let newItems = [];
                                        for (let i of item.data) {
                                            if (["功能实验室", "芒果壁纸", "我的音乐"]?.includes(i?.title)) {
                                                continue;
                                            }
                                            else {
                                                newItems.push(i);
                                            }
                                        }
                                        item.data = newItems;
                                        newList.push(item);
                                    }
                                    else {
                                        newList.push(item);
                                    }
                                }
                                else {
                                    newList.push(item);
                                }
                            }
                            obj.data.list = newList;
                        }
                    }
                    else if (url.includes("/v10/video/info?")) {
                        if (obj?.data?.categoryList?.length > 0) {
                            obj.data.categoryList = obj.data.categoryList.filter((i) => ![2, 8, 9, 14, 17]?.includes(i?.dataType));
                        }
                    }
                }
                else if (isYK) {
                    if (url.includes("/collect-api/get_push_interval_config_wx?")) {
                        if (obj?.data) {
                            const items = ["tipContent", "tipContentNew"];
                            for (let i of items) {
                                delete obj.data[i];
                            }
                        }
                    }
                    else if (url.includes("columbus.gateway.new.execute")) {
                        if (obj?.data?.["2019030100"]?.data) {
                            let objData = obj.data["2019030100"].data;
                            if (objData?.data?.global) {
                                let config = objData.data.global;
                                if (config?.PHONE_DETAIL_TOP_TAB?.pageTabs?.length > 0) {
                                    config.PHONE_DETAIL_TOP_TAB.pageTabs = config.PHONE_DETAIL_TOP_TAB.pageTabs.filter((i) => ["detail", "planet"]?.includes(i?.code));
                                }
                            }
                            if (objData?.nodes?.length > 0) {
                                if (objData?.nodes?.length === 1) {
                                    let node0 = objData.nodes[0];
                                    if (node0?.nodes?.length > 0) {
                                        if (node0?.typeName === "NORMAL") {
                                            node0.nodes = node0.nodes.filter((i) => ![
                                                "PHONE_CHD_AGE_DETAIL_2",
                                                "PHONE_CHILD_SERIES_A",
                                                "PHONE_CHILD_STAR_A",
                                                "PHONE_DEFALT_SCROLL_C",
                                                "Phone运营banner",
                                                "播放页触达组件",
                                                "播放页广告组件",
                                                "播放页会员引导组件",
                                                "播放页活动组件",
                                                "播放页全屏播后推荐组件",
                                                "播放页少儿品牌专区组件",
                                                "播放页推荐组件",
                                                "播放页用户触达组件",
                                                "播放页有料不能停组件",
                                                "球区自动化组件",
                                                "优酷购"
                                            ]?.includes(i?.typeName));
                                        }
                                        else if (node0?.typeName === "FEED_CHILD_DRAWER_PAGINATION") {
                                            if (node0?.nodes) {
                                                node0.nodes = [];
                                            }
                                        }
                                        else if (node0?.typeName === "FEED_DRAWER_PAGINATION") {
                                            if (node0?.nodes) {
                                                node0.nodes = [];
                                            }
                                        }
                                    }
                                }
                                else {
                                    objData.nodes = [];
                                }
                            }
                        }
                    }
                    else if (url.includes("columbus.home.feed/")) {
                        if (obj?.data?.["2019061000"]?.data) {
                            let objData = obj.data["2019061000"].data;
                            if (objData?.nodes?.length > 0) {
                                let newNodes1 = [];
                                for (let node1 of objData.nodes) {
                                    if (node1?.typeName === "PHONE_FEED_CARD_GROUP") {
                                        if (node1?.nodes?.length > 0) {
                                            let newNode2 = [];
                                            for (let node2 of node1.nodes) {
                                                if (node2?.typeName === "PHONE_FEED_CARD_S_AD") {
                                                    continue;
                                                }
                                                else if (node2?.typeName === "PHONE_H_UC_AD") {
                                                    continue;
                                                }
                                                else {
                                                    newNode2.push(node2);
                                                }
                                            }
                                            node1.nodes = newNode2;
                                            newNodes1.push(node1);
                                        }
                                        else {
                                            newNodes1.push(node1);
                                        }
                                    }
                                    else {
                                        newNodes1.push(node1);
                                    }
                                }
                                objData.nodes = newNodes1;
                            }
                        }
                    }
                    else if (url.includes("columbus.home.query/")) {
                        if (obj?.data?.["2019061000"]?.data) {
                            let objData = obj.data["2019061000"].data;
                            if (objData?.data?.indexPositionResult?.length > 0) {
                                objData.data.indexPositionResult = [];
                            }
                            if (objData?.nodes?.length > 0) {
                                let newNodes1 = [];
                                for (let node1 of objData.nodes) {
                                    if (["CHILD", "COMIC2", "20230929GREATWORKMFK"]?.includes(node1?.data?.nodeKey)) {
                                        continue;
                                    }
                                    else {
                                        if (node1?.data?.indexPositionResult?.length > 0) {
                                            node1.data.indexPositionResult = [];
                                        }
                                        if (node1?.data?.refreshImg) {
                                            delete node1.data.refreshImg;
                                        }
                                        if (node1?.nodes?.length > 0) {
                                            let newNode2 = [];
                                            for (let node2 of node1.nodes) {
                                                if (node2?.data?.crmSale) {
                                                    delete node2.data.crmSale;
                                                }
                                                if (["UC广告抽屉", "橱窗广告"].includes(node2?.typeName)) {
                                                    continue;
                                                }
                                                else if (node2?.id === 31476) {
                                                    if (node2?.data?.keywords?.length > 0) {
                                                        delete node2.data.keywords;
                                                    }
                                                }
                                                else if (node2?.id === 35505) {
                                                    continue;
                                                }
                                                else if (node2?.id === 37335) {
                                                    continue;
                                                }
                                                else {
                                                    if (node2?.nodes?.length > 0) {
                                                        let newNode3 = [];
                                                        for (let node3 of node2.nodes) {
                                                            if ([
                                                                "PHONE_FEED_CARD_B_AD",
                                                                "PHONE_FEED_CARD_S_AD",
                                                                "PHONE_H_UC_AD",
                                                                "PHONE_IMG_A",
                                                                "PHONE_YK_AD_BANNER"
                                                            ].includes(node3?.typeName)) {
                                                                continue;
                                                            }
                                                            else if (node3.id === 272768) {
                                                                console.log("移除首页的轮播广告");
                                                                continue;
                                                            }
                                                            else {
                                                                if (node3?.nodes?.length > 0) {
                                                                    let newNode4 = [];
                                                                    for (let node4 of node3.nodes) {
                                                                        if (node4?.typeName === "PHONE_FEED_CARD_S_AD") {
                                                                            continue;
                                                                        }
                                                                        else if (node4?.data.hasOwnProperty("ad")) {
                                                                            continue;
                                                                        }
                                                                        else {
                                                                            newNode4.push(node4);
                                                                        }
                                                                    }
                                                                    node3.nodes = newNode4;
                                                                    newNode3.push(node3);
                                                                }
                                                                else {
                                                                    newNode3.push(node3);
                                                                }
                                                            }
                                                        }
                                                        node2.nodes = newNode3;
                                                        newNode2.push(node2);
                                                    }
                                                    else {
                                                        newNode2.push(node2);
                                                    }
                                                }
                                            }
                                            node1.nodes = newNode2;
                                        }
                                        newNodes1.push(node1);
                                    }
                                }
                                objData.nodes = newNodes1;
                            }
                        }
                    }
                    else if (url.includes("columbus.uc.query/")) {
                        if (obj?.data?.["2019061000"]?.data) {
                            let objData = obj.data["2019061000"].data;
                            if (objData?.nodes?.length > 0) {
                                let objNodes = objData.nodes[0];
                                if (objNodes?.nodes?.length > 0) {
                                    let newNodes = [];
                                    for (let item of objNodes.nodes) {
                                        if (item?.id === 32133) {
                                            continue;
                                        }
                                        else if (item?.id === 32775) {
                                            continue;
                                        }
                                        else if (item?.id === 22570) {
                                            continue;
                                        }
                                        else if (item?.id === 28912) {
                                            if (item?.nodes?.length > 0) {
                                                let newII = [];
                                                for (let ii of item.nodes) {
                                                    if (ii?.id === 110429) {
                                                        continue;
                                                    }
                                                    newII.push(ii);
                                                }
                                                item.nodes = newII;
                                                newNodes.push(item);
                                            }
                                            else {
                                                newNodes.push(item);
                                            }
                                        }
                                        else if (item?.id === 35942) {
                                            continue;
                                        }
                                        else if (item?.id === 36014) {
                                            continue;
                                        }
                                        else if (item?.id === 36015) {
                                            if (item?.nodes?.length > 0) {
                                                let node0 = item.nodes[0];
                                                if (node0?.nodes?.length > 0) {
                                                    let newII = [];
                                                    for (let ii of node0.nodes) {
                                                        if ([683367, 683368, 683372, 683502]?.includes(ii?.id)) {
                                                            newII.push(ii);
                                                        }
                                                    }
                                                    node0.nodes = newII;
                                                    newNodes.push(item);
                                                }
                                                else {
                                                    newNodes.push(item);
                                                }
                                            }
                                            else {
                                                newNodes.push(item);
                                            }
                                        }
                                        else if (item?.id === 38466) {
                                            continue;
                                        }
                                        else {
                                            newNodes.push(item);
                                        }
                                    }
                                    objNodes.nodes = newNodes;
                                }
                            }
                        }
                    }
                    else if (url.includes("columbus.ycp.query/")) {
                        if (obj?.data?.["2019061000"]?.data) {
                            let objData = obj.data["2019061000"].data;
                            if (objData?.nodes?.length > 0) {
                                let objNodes = objData.nodes[0];
                                if (objNodes?.nodes?.length > 0) {
                                    let newNodes = [];
                                    for (let item of objNodes.nodes) {
                                        if (item?.id === 23242) {
                                            if (item?.nodes?.length > 0) {
                                                let newItems = [];
                                                for (let i of item.nodes) {
                                                    if (i?.typeName === "COMPONENT_YCP_NOTICE") {
                                                        continue;
                                                    }
                                                    else if (i?.id === 113941) {
                                                        continue;
                                                    }
                                                    else {
                                                        newItems.push(i);
                                                    }
                                                }
                                                item.nodes = newItems;
                                                newNodes.push(item);
                                            }
                                            else {
                                                newNodes.push(item);
                                            }
                                        }
                                        else if (item?.id === 23243) {
                                            if (item?.nodes?.length > 0) {
                                                let newItems = [];
                                                for (let i of item.nodes) {
                                                    if (i?.id === -1000) {
                                                        continue;
                                                    }
                                                    else {
                                                        newItems.push(i);
                                                    }
                                                }
                                                item.nodes = newItems;
                                                newNodes.push(item);
                                            }
                                            else {
                                                newNodes.push(item);
                                            }
                                        }
                                        else {
                                            newNodes.push(item);
                                        }
                                    }
                                    objNodes.nodes = newNodes;
                                }
                            }
                        }
                    }
                    else if (url.includes("haidai.lantern.appconfig.get/")) {
                        if (obj?.data?.model?.configInfo?.bottomNavigate) {
                            let bottom = obj.data.model.configInfo.bottomNavigate;
                            if (bottom?.data?.bottomTabList?.length > 0) {
                                bottom.data.bottomTabList = bottom.data.bottomTabList.filter((i) => ["HOME", "NEW_UCENTER", "VIP_MEMBER"]?.includes(i?.type));
                                for (let i = 0; i < bottom.data.bottomTabList.length; i++) {
                                    bottom.data.bottomTabList[i].menuIndex = i + 1;
                                }
                            }
                        }
                    }
                    else if (url.includes("huluwa.dispatcher.youthmode.config2/")) {
                        if (obj?.data?.result) {
                            obj.data.result = {};
                        }
                    }
                    else if (url.includes("play.ups.appinfo.get/")) {
                        if (obj?.data?.data) {
                            const items = ["ad", "watermark", "ykad"];
                            for (let i of items) {
                                delete obj.data.data[i];
                            }
                        }
                    }
                    else if (url.includes("soku.yksearch/")) {
                        if (obj?.data?.nodes?.length > 0) {
                            obj.data.nodes = obj.data.nodes.filter((i) => i.hasOwnProperty("data"));
                        }
                    }
                }
                $done({ body: JSON.stringify(obj) });
            }).call(this);
        }
    });
})();
