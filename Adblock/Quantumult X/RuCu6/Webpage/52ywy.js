/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
(function () {
    const __wayxTarget = "qx";
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
    const __wayxContexts = { "response": { "qx": { "phase": "response", "responseBody": true, "binary": false, "binaryKnown": true, "name": "52ywy_web_ads", "from": "loon", "to": "qx", "apiPlan": { "version": 1, "omitNotificationOptions": true, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"], "source": { "responseStatus": "status", "scriptStartTime": "date", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": true }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "node", "timeoutMs": 1, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": true } }, "notification": { "root": "$notification.post", "open": "openUrl", "media": "mediaUrl", "action": null, "openAction": null, "stringLink": true, "delay": true }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "typed" }, "target": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": null, "media": null, "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" } }, "runtimePolicyVersion": 7, "omittedParameters": ["undocumented-qx-parameters"] } } }, __wayxConfig = __wayxContexts[__wayxHost.response === undefined ? 'request' : 'response']?.[__wayxTarget];
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
                const $ = new Env("夜未央");
                const STORE_KEY = "52ywy_r2";
                const DICT_KEY = "52ywy_dict";
                const TTL_MS = 24 * 3600000;
                const GIST_URL = "https://gist.githubusercontent.com/Yu9191/0c88077bc4251d0803810db88334d336/raw/r2-dict.json";
                const BYID_URL = "https://miniapp2.52ywy.com/ywyminiappbot/getVideoById?id=";
                const LIST_RE = /\/(getLatest|getLatestAll|getCategoryVideos|getSearch|series|movies|tv|av|getbloger)/;
                const PLAYER_RE = /\/player\/getPlayer(\?|$)/;
                const KEYS_ZERO = new Set(["vip", "dl_ban", "temp", "mob_status"]);
                !(async () => {
                    const url = $request.url || "";
                    const body = $response.body;
                    if (!body)
                        return $.done({});
                    let data;
                    try {
                        data = JSON.parse(body);
                    }
                    catch (_) {
                        return $.done({ body });
                    }
                    if (LIST_RE.test(url) && Array.isArray(data)) {
                        const { map, evicted } = pruneExpired($.getjson(STORE_KEY, {}));
                        let added = 0;
                        for (const it of data) {
                            if (it && it.id != null && it.r2) {
                                map[String(it.id)] = { r2: it.r2, t: Date.now() };
                                added++;
                            }
                        }
                        if (added || evicted)
                            $.setjson(map, STORE_KEY);
                        walkZero(data);
                        $.log(`列表缓存 +${added} 项，过期清理 ${evicted} 项，共 ${Object.keys(map).length} 项`);
                        return $.done({ body: JSON.stringify(data) });
                    }
                    if (PLAYER_RE.test(url)) {
                        const m = url.match(/videoid=(\d+)/);
                        if (m && data && typeof data === "object" && !Array.isArray(data)) {
                            const vid = m[1];
                            let r2 = null;
                            const dict = await loadRemoteDict();
                            if (dict && dict[vid])
                                r2 = dict[vid];
                            if (!r2) {
                                const entry = $.getjson(STORE_KEY, {})[vid];
                                if (entry && entry.r2 && Date.now() - entry.t < TTL_MS)
                                    r2 = entry.r2;
                            }
                            if (!r2)
                                r2 = await fetchById(vid);
                            if (r2) {
                                data.r2 = r2;
                                data.isvip = 1;
                                data.user = true;
                                $.log(`注入 vid=${vid} r2=${r2}`);
                            }
                            else {
                                $.log(`未命中 vid=${vid}`);
                            }
                        }
                        return $.done({ body: JSON.stringify(data) });
                    }
                    walkZero(data);
                    $.done({ body: JSON.stringify(data) });
                })().catch((e) => { $.logErr(e); $.done({}); });
                function walkZero(node) {
                    if (Array.isArray(node)) {
                        for (const v of node)
                            walkZero(v);
                    }
                    else if (node && typeof node === "object") {
                        for (const k of Object.keys(node)) {
                            if (KEYS_ZERO.has(k) && typeof node[k] === "number")
                                node[k] = 0;
                            else
                                walkZero(node[k]);
                        }
                    }
                }
                async function loadRemoteDict() {
                    const cached = $.getjson(DICT_KEY, null);
                    if (cached && cached.data && Date.now() - cached.t < TTL_MS)
                        return cached.data;
                    try {
                        const resp = await $.http.get({ url: GIST_URL, timeout: 10000 });
                        const dict = $.toObj(resp.body);
                        if (dict && typeof dict === "object" && !Array.isArray(dict)) {
                            $.setjson({ data: dict, t: Date.now() }, DICT_KEY);
                            $.log(`字典刷新 ${Object.keys(dict).length} 条`);
                            return dict;
                        }
                    }
                    catch (e) {
                        $.log(`字典拉取失败: ${e && e.message || e}`);
                    }
                    return cached && cached.data || null;
                }
                async function fetchById(vid) {
                    try {
                        const resp = await $.http.get({ url: BYID_URL + vid, timeout: 8000 });
                        const arr = $.toObj(resp.body);
                        if (Array.isArray(arr) && arr[0] && typeof arr[0].r2 === "string" && arr[0].r2) {
                            const r2 = arr[0].r2;
                            const map = $.getjson(STORE_KEY, {});
                            map[vid] = { r2, t: Date.now() };
                            $.setjson(map, STORE_KEY);
                            $.log(`getVideoById 补到 vid=${vid}`);
                            return r2;
                        }
                    }
                    catch (e) {
                        $.log(`getVideoById 失败 vid=${vid} ${e && e.message || e}`);
                    }
                    return null;
                }
                function pruneExpired(raw) {
                    const map = {};
                    let evicted = 0;
                    const now = Date.now();
                    for (const k of Object.keys(raw)) {
                        const v = raw[k];
                        if (v && typeof v === "object" && v.r2 && now - v.t < TTL_MS)
                            map[k] = v;
                        else
                            evicted++;
                    }
                    return { map, evicted };
                }
                function Env(e, t) { class s {
                    constructor(e) { this.env = e; }
                    send(e, t = "GET") { e = "string" == typeof e ? { url: e } : e; let s = this.get; "POST" === t && (s = this.post); const i = new Promise((t, i) => { s.call(this, e, (e, s, o) => { e ? i(e) : t(s); }); }); return e.timeout ? ((e, t = 1e3) => Promise.race([e, new Promise((e, s) => { setTimeout(() => { s(new Error("请求超时")); }, t); })]))(i, e.timeout) : i; }
                    get(e) { return this.send.call(this.env, e); }
                    post(e) { return this.send.call(this.env, e, "POST"); }
                } return new class {
                    constructor(e, t) { this.logLevels = { debug: 0, info: 1, warn: 2, error: 3 }, this.logLevelPrefixs = { debug: "[DEBUG] ", info: "[INFO] ", warn: "[WARN] ", error: "[ERROR] " }, this.logLevel = "info", this.name = e, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.encoding = "utf-8", this.startTime = (new Date).getTime(), Object.assign(this, t), this.log("", `🔔${this.name}, 开始!`); }
                    getEnv() { return "undefined" != typeof Egern ? "Egern" : "undefined" != typeof $environment && $environment["surge-version"] ? "Surge" : "undefined" != typeof $environment && $environment["stash-version"] ? "Stash" : "undefined" != typeof module && module.exports ? "Node.js" : "undefined" != typeof $task ? "Quantumult X" : "undefined" != typeof $loon ? "Loon" : "undefined" != typeof $rocket ? "Shadowrocket" : void 0; }
                    isNode() { return "Node.js" === this.getEnv(); }
                    isQuanX() { return "Quantumult X" === this.getEnv(); }
                    isSurge() { return "Surge" === this.getEnv(); }
                    isLoon() { return "Loon" === this.getEnv(); }
                    isShadowrocket() { return "Shadowrocket" === this.getEnv(); }
                    isStash() { return "Stash" === this.getEnv(); }
                    isEgern() { return "Egern" === this.getEnv(); }
                    toObj(e, t = null) { try {
                        return JSON.parse(e);
                    }
                    catch {
                        return t;
                    } }
                    toStr(e, t = null, ...s) { try {
                        return JSON.stringify(e, ...s);
                    }
                    catch {
                        return t;
                    } }
                    getjson(e, t) { let s = t; if (this.getdata(e))
                        try {
                            s = JSON.parse(this.getdata(e));
                        }
                        catch { } return s; }
                    setjson(e, t) { try {
                        return this.setdata(JSON.stringify(e), t);
                    }
                    catch {
                        return !1;
                    } }
                    getScript(e) { return new Promise(t => { this.get({ url: e }, (e, s, i) => t(i)); }); }
                    runScript(e, t) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let o = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); o = o ? 1 * o : 20, o = t && t.timeout ? t.timeout : o; const [r, a] = i.split("@"), n = { url: `http://${a}/v1/scripting/evaluate`, body: { script_text: e, mock_type: "cron", timeout: o }, headers: { "X-Key": r, Accept: "*/*" }, policy: "DIRECT", timeout: o }; this.post(n, (e, t, i) => s(i)); }).catch(e => this.logErr(e)); }
                    loaddata() { if (!this.isNode())
                        return {}; {
                        this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path");
                        const e = this.path.resolve(this.dataFile), t = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(e), i = !s && this.fs.existsSync(t);
                        if (!s && !i)
                            return {};
                        {
                            const i = s ? e : t;
                            try {
                                return JSON.parse(this.fs.readFileSync(i));
                            }
                            catch (e) {
                                return {};
                            }
                        }
                    } }
                    writedata() { if (this.isNode()) {
                        this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path");
                        const e = this.path.resolve(this.dataFile), t = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(e), i = !s && this.fs.existsSync(t), o = JSON.stringify(this.data);
                        s ? this.fs.writeFileSync(e, o) : i ? this.fs.writeFileSync(t, o) : this.fs.writeFileSync(e, o);
                    } }
                    lodash_get(e, t, s = void 0) { const i = t.replace(/\[(\d+)\]/g, ".$1").split("."); let o = e; for (const e of i)
                        if (o = Object(o)[e], void 0 === o)
                            return s; return o; }
                    lodash_set(e, t, s) { return Object(e) !== e || (Array.isArray(t) || (t = t.toString().match(/[^.[\]]+/g) || []), t.slice(0, -1).reduce((e, s, i) => Object(e[s]) === e[s] ? e[s] : e[s] = (Math.abs(t[i + 1]) | 0) === +t[i + 1] ? [] : {}, e)[t[t.length - 1]] = s), e; }
                    getdata(e) { let t = this.getval(e); if (/^@/.test(e)) {
                        const [, s, i] = /^@(.*?)\.(.*?)$/.exec(e), o = s ? this.getval(s) : "";
                        if (o)
                            try {
                                const e = JSON.parse(o);
                                t = e ? this.lodash_get(e, i, "") : t;
                            }
                            catch (e) {
                                t = "";
                            }
                    } return t; }
                    setdata(e, t) { let s = !1; if (/^@/.test(t)) {
                        const [, i, o] = /^@(.*?)\.(.*?)$/.exec(t), r = this.getval(i), a = i ? "null" === r ? null : r || "{}" : "{}";
                        try {
                            const t = JSON.parse(a);
                            this.lodash_set(t, o, e), s = this.setval(JSON.stringify(t), i);
                        }
                        catch (t) {
                            const r = {};
                            this.lodash_set(r, o, e), s = this.setval(JSON.stringify(r), i);
                        }
                    }
                    else
                        s = this.setval(e, t); return s; }
                    getval(e) { switch (this.getEnv()) {
                        case "Surge":
                        case "Loon":
                        case "Stash":
                        case "Shadowrocket":
                        case "Egern": return $persistentStore.read(e);
                        case "Quantumult X": return $prefs.valueForKey(e);
                        case "Node.js": return this.data = this.loaddata(), this.data[e];
                        default: return this.data && this.data[e] || null;
                    } }
                    setval(e, t) { switch (this.getEnv()) {
                        case "Surge":
                        case "Loon":
                        case "Stash":
                        case "Shadowrocket":
                        case "Egern": return $persistentStore.write(e, t);
                        case "Quantumult X": return $prefs.setValueForKey(e, t);
                        case "Node.js": return this.data = this.loaddata(), this.data[t] = e, this.writedata(), !0;
                        default: return this.data && this.data[t] || null;
                    } }
                    initGotEnv(e) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, e && (e.headers = e.headers ? e.headers : {}, e && (e.headers = e.headers ? e.headers : {}, void 0 === e.headers.cookie && void 0 === e.headers.Cookie && void 0 === e.cookieJar && (e.cookieJar = this.ckjar))); }
                    get(e, t = () => { }) { switch (e.headers && (delete e.headers["Content-Type"], delete e.headers["Content-Length"], delete e.headers["content-type"], delete e.headers["content-length"]), e.params && (e.url += "?" + this.queryStr(e.params)), void 0 === e.followRedirect || e.followRedirect || ((this.isSurge() || this.isLoon()) && (e["auto-redirect"] = !1), this.isQuanX() && (e.opts ? e.opts.redirection = !1 : e.opts = { redirection: !1 })), this.getEnv()) {
                        case "Surge":
                        case "Loon":
                        case "Stash":
                        case "Shadowrocket":
                        case "Egern":
                        default:
                            this.isSurge() && this.isNeedRewrite && (e.headers = e.headers || {}, Object.assign(e.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(e, (e, s, i) => { !e && s && (s.body = i, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), t(e, s, i); });
                            break;
                        case "Quantumult X":
                            this.isNeedRewrite && (e.opts = e.opts || {}, Object.assign(e.opts, { hints: !1 })), $task.fetch(e).then(e => { const { statusCode: s, statusCode: i, headers: o, body: r, bodyBytes: a } = e; t(null, { status: s, statusCode: i, headers: o, body: r, bodyBytes: a }, r, a); }, e => t(e && e.error || "UndefinedError"));
                            break;
                        case "Node.js":
                            let s = require("iconv-lite");
                            this.initGotEnv(e), this.got(e).on("redirect", (e, t) => { try {
                                if (e.headers["set-cookie"]) {
                                    const s = e.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();
                                    s && this.ckjar.setCookieSync(s, null), t.cookieJar = this.ckjar;
                                }
                            }
                            catch (e) {
                                this.logErr(e);
                            } }).then(e => { const { statusCode: i, statusCode: o, headers: r, rawBody: a } = e, n = s.decode(a, this.encoding); t(null, { status: i, statusCode: o, headers: r, rawBody: a, body: n }, n); }, e => { const { message: i, response: o } = e; t(i, o, o && s.decode(o.rawBody, this.encoding)); });
                    } }
                    post(e, t = () => { }) { const s = e.method ? e.method.toLocaleLowerCase() : "post"; switch (e.body && e.headers && !e.headers["Content-Type"] && !e.headers["content-type"] && (e.headers["content-type"] = "application/x-www-form-urlencoded"), e.headers && (delete e.headers["Content-Length"], delete e.headers["content-length"]), void 0 === e.followRedirect || e.followRedirect || ((this.isSurge() || this.isLoon()) && (e["auto-redirect"] = !1), this.isQuanX() && (e.opts ? e.opts.redirection = !1 : e.opts = { redirection: !1 })), this.getEnv()) {
                        case "Surge":
                        case "Loon":
                        case "Stash":
                        case "Shadowrocket":
                        case "Egern":
                        default:
                            this.isSurge() && this.isNeedRewrite && (e.headers = e.headers || {}, Object.assign(e.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient[s](e, (e, s, i) => { !e && s && (s.body = i, s.statusCode = s.status ? s.status : s.statusCode, s.status = s.statusCode), t(e, s, i); });
                            break;
                        case "Quantumult X":
                            e.method = s, this.isNeedRewrite && (e.opts = e.opts || {}, Object.assign(e.opts, { hints: !1 })), $task.fetch(e).then(e => { const { statusCode: s, statusCode: i, headers: o, body: r, bodyBytes: a } = e; t(null, { status: s, statusCode: i, headers: o, body: r, bodyBytes: a }, r, a); }, e => t(e && e.error || "UndefinedError"));
                            break;
                        case "Node.js":
                            let i = require("iconv-lite");
                            this.initGotEnv(e);
                            const { url: o, ...r } = e;
                            this.got[s](o, r).then(e => { const { statusCode: s, statusCode: o, headers: r, rawBody: a } = e, n = i.decode(a, this.encoding); t(null, { status: s, statusCode: o, headers: r, rawBody: a, body: n }, n); }, e => { const { message: s, response: o } = e; t(s, o, o && i.decode(o.rawBody, this.encoding)); });
                    } }
                    time(e, t = null) { const s = t ? new Date(t) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(e) && (e = e.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let t in i)
                        new RegExp("(" + t + ")").test(e) && (e = e.replace(RegExp.$1, 1 == RegExp.$1.length ? i[t] : ("00" + i[t]).substr(("" + i[t]).length))); return e; }
                    queryStr(e) { let t = ""; for (const s in e) {
                        let i = e[s];
                        null != i && "" !== i && ("object" == typeof i && (i = JSON.stringify(i)), t += `${s}=${i}&`);
                    } return t = t.substring(0, t.length - 1), t; }
                    msg(t = e, s = "", i = "", o = {}) { const r = e => { const { $open: t, $copy: s, $media: i, $mediaMime: o } = e; switch (typeof e) {
                        case void 0: return e;
                        case "string": switch (this.getEnv()) {
                            case "Surge":
                            case "Stash":
                            case "Egern":
                            default: return { url: e };
                            case "Loon":
                            case "Shadowrocket": return e;
                            case "Quantumult X": return { "open-url": e };
                            case "Node.js": return;
                        }
                        case "object": switch (this.getEnv()) {
                            case "Surge":
                            case "Stash":
                            case "Shadowrocket":
                            case "Egern":
                            default: {
                                const r = {};
                                let a = e.openUrl || e.url || e["open-url"] || t;
                                a && Object.assign(r, { action: "open-url", url: a });
                                let n = e["update-pasteboard"] || e.updatePasteboard || s;
                                n && Object.assign(r, { action: "clipboard", text: n });
                                let h = e.mediaUrl || e["media-url"] || i;
                                if (h) {
                                    let e, t;
                                    if (h.startsWith("http"))
                                        ;
                                    else if (h.startsWith("data:")) {
                                        const [s] = h.split(";"), [, i] = h.split(",");
                                        e = i, t = s.replace("data:", "");
                                    }
                                    else {
                                        e = h, t = (e => { const t = { JVBERi0: "application/pdf", R0lGODdh: "image/gif", R0lGODlh: "image/gif", iVBORw0KGgo: "image/png", "/9j/": "image/jpg" }; for (var s in t)
                                            if (0 === e.indexOf(s))
                                                return t[s]; return null; })(h);
                                    }
                                    Object.assign(r, { "media-url": h, "media-base64": e, "media-base64-mime": o ?? t });
                                }
                                return Object.assign(r, { "auto-dismiss": e["auto-dismiss"], sound: e.sound }), r;
                            }
                            case "Loon": {
                                const s = {};
                                let o = e.openUrl || e.url || e["open-url"] || t;
                                o && Object.assign(s, { openUrl: o });
                                let r = e.mediaUrl || e["media-url"] || i;
                                return r && Object.assign(s, { mediaUrl: r }), console.log(JSON.stringify(s)), s;
                            }
                            case "Quantumult X": {
                                const o = {};
                                let r = e["open-url"] || e.url || e.openUrl || t;
                                r && Object.assign(o, { "open-url": r });
                                let a = e.mediaUrl || e["media-url"] || i;
                                a && Object.assign(o, { "media-url": a });
                                let n = e["update-pasteboard"] || e.updatePasteboard || s;
                                return n && Object.assign(o, { "update-pasteboard": n }), console.log(JSON.stringify(o)), o;
                            }
                            case "Node.js": return;
                        }
                        default: return;
                    } }; if (!this.isMute)
                        switch (this.getEnv()) {
                            case "Surge":
                            case "Loon":
                            case "Stash":
                            case "Shadowrocket":
                            case "Egern":
                            default:
                                $notification.post(t, s, i, r(o));
                                break;
                            case "Quantumult X": $notify(t, s, i, r(o));
                            case "Node.js":
                        } if (!this.isMuteLog) {
                        let e = ["", "==============📣系统通知📣=============="];
                        e.push(t), s && e.push(s), i && e.push(i), console.log(e.join("\n")), this.logs = this.logs.concat(e);
                    } }
                    debug(...e) { this.logLevels[this.logLevel] <= this.logLevels.debug && (e.length > 0 && (this.logs = [...this.logs, ...e]), console.log(`${this.logLevelPrefixs.debug}${e.map(e => e ?? String(e)).join(this.logSeparator)}`)); }
                    info(...e) { this.logLevels[this.logLevel] <= this.logLevels.info && (e.length > 0 && (this.logs = [...this.logs, ...e]), console.log(`${this.logLevelPrefixs.info}${e.map(e => e ?? String(e)).join(this.logSeparator)}`)); }
                    warn(...e) { this.logLevels[this.logLevel] <= this.logLevels.warn && (e.length > 0 && (this.logs = [...this.logs, ...e]), console.log(`${this.logLevelPrefixs.warn}${e.map(e => e ?? String(e)).join(this.logSeparator)}`)); }
                    error(...e) { this.logLevels[this.logLevel] <= this.logLevels.error && (e.length > 0 && (this.logs = [...this.logs, ...e]), console.log(`${this.logLevelPrefixs.error}${e.map(e => e ?? String(e)).join(this.logSeparator)}`)); }
                    log(...e) { e.length > 0 && (this.logs = [...this.logs, ...e]), console.log(e.map(e => e ?? String(e)).join(this.logSeparator)); }
                    logErr(e, t) { switch (this.getEnv()) {
                        case "Surge":
                        case "Loon":
                        case "Stash":
                        case "Shadowrocket":
                        case "Egern":
                        case "Quantumult X":
                        default:
                            this.log("", `❗️${this.name}, 错误!`, t, e);
                            break;
                        case "Node.js": this.log("", `❗️${this.name}, 错误!`, t, void 0 !== e.message ? e.message : e, e.stack);
                    } }
                    wait(e) { return new Promise(t => setTimeout(t, e)); }
                    done(e = {}) { const t = ((new Date).getTime() - this.startTime) / 1e3; switch (this.log("", `🔔${this.name}, 结束! 🕛 ${t} 秒`), this.log(), this.getEnv()) {
                        case "Surge":
                        case "Loon":
                        case "Stash":
                        case "Shadowrocket":
                        case "Egern":
                        case "Quantumult X":
                        default:
                            $done(e);
                            break;
                        case "Node.js": process.exit(1);
                    } }
                }(e, t); }
            }).call(this);
        }
    });
})();
