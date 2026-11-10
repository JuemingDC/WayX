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
    const __wayxContexts = { "response": { "qx": { "phase": "response", "responseBody": true, "binary": false, "binaryKnown": true, "name": "移除首页广告配置", "from": "loon", "to": "qx", "apiPlan": { "version": 1, "omitNotificationOptions": true, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"], "source": { "responseStatus": "status", "scriptStartTime": "date", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": true }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "node", "timeoutMs": 1, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": true } }, "notification": { "root": "$notification.post", "open": "openUrl", "media": "mediaUrl", "action": null, "openAction": null, "stringLink": true, "delay": true }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "typed" }, "target": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": null, "media": null, "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" } }, "runtimePolicyVersion": 6, "omittedParameters": ["undocumented-qx-parameters"] } } }, __wayxConfig = __wayxContexts[__wayxHost.response === undefined ? 'request' : 'response']?.[__wayxTarget];
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
                    out.url = originalRequest[1] + '://' + originalRequest[2] + out.path;
                    delete out.path;
                }
            }
            if (config.to === 'qx' && own(out, 'url')) {
                const next = requestParts(out.url);
                if (!synthetic && config.phase === 'request' && !own(out, 'path') && next && originalRequest && next[1].toLowerCase() === originalRequest[1].toLowerCase() && next[2] === originalRequest[2])
                    out.path = rawPath(next);
                delete out.url;
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
                (function () {
                    if (!$loon) {
                        return;
                    }
                    "use strict";
                    var WASM_BASE64 = "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G2oiBCAHIABB2ABqKAIAIgYgAEHIAGooAgAiCE9BBHRqIgAgB0EwQSAgAxtqIgMgA0EIaigCACAHIAYgCElBBHRqIgdBCGooAgBJIgYbIARBCGooAgAgAEEIaigCAEkiCBsiCUEIaigCACEMIAcgAyAAIAgbIAYbIgtBCGooAgAhDiACQcgAaiIPIAMgByAGGyIDKQIINwIAIAJBwABqIgcgAykCADcCACACQdAAaiAJIAsgDCAOSSIDGyIGKQIANwIAIAJB2ABqIAYpAgg3AgAgAkHgAGogCyAJIAMbIgMpAgA3AgAgAkHoAGogAykCCDcCACACQfAAaiIDIAAgBCAIGyIAKQIANwIAIAJB+ABqIgQgACkCCDcCACABIAcgAiAPKAIAIgYgDSgCACIISSIAGyIJKQIINwIIIAEgCSkCADcCACABIAUgAyAEKAIAIgQgCigCACIJSSILGyIKKQIINwJ4IAEgCikCADcCcCABIAcgAEEEdGoiACACIAYgCE9BBHRqIgIgAEEIaigCACIGIAJBCGooAgAiCEkiChsiBykCCDcCGCABIAcpAgA3AhAgASAFQXBBACALG2oiByADQXBBACAEIAlPG2oiAyADQQhqKAIAIgUgB0EIaigCACIESSIJGyILKQIINwJoIAEgCykCADcCYCABIAAgCkEEdGoiACACIAYgCE9BBHRqIgIgAEEIaigCACIGIAJBCGooAgAiCEkiCxsiCikCCDcCKCABIAopAgA3AiAgASAHQXBBACAJG2oiByADQXBBACAFIARPG2oiAyADQQhqKAIAIgQgB0EIaigCACIJSSIKGyIFKQIINwJYIAEgBSkCADcCUCABIAAgC0EEdGoiBSACIAYgCE9BBHRqIgIgBUEIaigCACIGIAJBCGooAgAiCEkiCxsiACkCCDcCOCABIAApAgA3AjAgASAHQXBBACAKG2oiACADQXBBACAEIAlPG2oiByAHQQhqKAIAIgkgAEEIaigCACIKSSIDGyIEKQIINwJIIAEgBCkCADcCQAJAAkAgAiAGIAhPQQR0aiAAQXBBACADG2pBEGpHDQAgBSALQQR0aiAHQXBBACAJIApPG2pBEGpGDQELEOCAgIAAAAsL0gECBn8BfiAAQRBqIQIgACABQQR0aiEDQQAhBCAAIQEDQCACIQUCQCABQRhqKAIAIgYg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EMmAgIAAAAtBASAGEMmAgIAAAAsgBEH7AEcNACACQQhqIAMgDCABEI+AgIAAIAIoAggiDUF/Rg0AIAIoAhBBBHQhDkEAIQEgAigCDCIPIQACQANAIA4gAUYNASABQRBqIQEgAEEEaiEEIAAoAgAhBSAAQRBqIQAgAyAMIAUgBCgCAEHMhYiAAEEEEIqAgIAARQ0ACyAPIAFqQXhqKAIAIgAgDE8NACADIABqLQAAQfsARw0AIAJBCGogAyAMIAAQj4CAgAAgAigCCCIQQX9GDQAgAigCDCERIAJBCGogAigCECISEImAgIAAAkACQAJAAkACQAJAIBINACACKAIQIRMgAigCDCEODAELIBJBBHQhBEEAIQEgAigCDCEOIAIoAhAhEyARIQADQAJAAkAgAyAMIAAoAgAgAEEEaiIFKAIAQbyPiIAAQQwQioCAgAANACADIAwgACgCACAFKAIAQciPiIAAQQYQioCAgAANACADIAwgACgCACAFKAIAQc6PiIAAQRAQioCAgAANACADIAwgACgCACAFKAIAQd6PiIAAQQUQioCAgAANACADIAwgACgCACAFKAIAQeOPiIAAQQMQioCAgAANACADIAwgACgCACAFKAIAQeaPiIAAQQsQioCAgAANACADIAwgACgCACAFKAIAQfGPiIAAQRIQioCAgAANACADIAwgACgCACAFKAIAQYOQiIAAQQsQioCAgAANACADIAwgACgCACAFKAIAQY6QiIAAQQ8QioCAgAANACADIAwgACgCACAFKAIAQZ2QiIAAQQsQioCAgAANAAJAIAMgDCAAKAIAIAUoAgBBqJCIgABBFBCKgICAAA0AIAMgDCAAKAIAIAUoAgBBvJCIgABBDhCKgICAAEUNAiAAQQhqKAIAIgUgDE8NAiADIAVqLQAAQfsARw0CIAMgDCAFIAJBjAFqEJWAgIAADQIMBQsgAyAMIABBCGooAgAgAEEMaigCACACQYwBahCRgICAAAwBCwJAIAEgE0kNACABIBNBzJCIgAAQ04CAgAAACyAOIAFqQQE6AAALIABBEGohACABQQFqIQEgBEFwaiIEDQALCyADIAwgESASIA4gEyACQYwBahCUgICAACACKAKUASIARQ0AQQBBADYC7JaIgAAgAyAMIAIoApABIgEgAEHkloiAABCSgICAAEUNAEEAKALs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qIiAADYCuKiIgABBAEHAqIiAADYCzKiIgABBAEG4qIiAADYCwKiIgABBAEHIqIiAADYC1KiIgABBAEHAqIiAADYCyKiIgABBAEHQqIiAADYC3KiIgABBAEHIqIiAADYC0KiIgABBAEHYqIiAADYC5KiIgABBAEHQqIiAADYC2KiIgABBAEHgqIiAADYC7KiIgABBAEHYqIiAADYC4KiIgABBAEHgqIiAADYC6KiIgABBAEHoqIiAADYC9KiIgABBAEHoqIiAADYC8KiIgABBAEHwqIiAADYC/KiIgABBAEHwqIiAADYC+KiIgABBAEH4qIiAADYChKmIgABBAEH4qIiAADYCgKmIgABBAEGAqYiAADYCjKmIgABBAEGAqYiAADYCiKmIgABBAEGIqYiAADYClKmIgABBAEGIqYiAADYCkKmIgABBAEGQqYiAADYCnKmIgABBAEGQqYiAADYCmKmIgABBAEGYqYiAADYCpKmIgABBAEGYqYiAADYCoKmIgABBAEGgqYiAADYCrKmIgABBAEGoqYiAADYCtKmIgABBAEGgqYiAADYCqKmIgABBAEGwqYiAADYCvKmIgABBAEGoqYiAADYCsKmIgABBAEG4qYiAADYCxKmIgABBAEGwqYiAADYCuKmIgABBAEHAqYiAADYCzKmIgABBAEG4qYiAADYCwKmIgABBAEHIqYiAADYC1KmIgABBAEHAqYiAADYCyKmIgABBAEHQqYiAADYC3KmIgABBAEHIqYiAADYC0KmIgABBAEHYqYiAADYC5KmIgABBAEHQqYiAADYC2KmIgABBAEHgqYiAADYC7KmIgABBAEHYqYiAADYC4KmIgABBAEHoqYiAADYC9KmIgABBAEHgqYiAADYC6KmIgABBAEHwqYiAADYC/KmIgABBAEHoqYiAADYC8KmIgABBAEH4qYiAADYChKqIgABBAEHwqYiAADYC+KmIgABBAEGAqoiAADYCjKqIgABBAEH4qYiAADYCgKqIgABBAEGIqoiAADYClKqIgABBAEGAqoiAADYCiKqIgABBAEGQqoiAADYCnKqIgABBAEGIqoiAADYCkKqIgABBAEGYqoiAADYCpKqIgABBAEGQqoiAADYCmKqIgABBACAGQQ9qQXhxIgBBeGoiAjYCvKqIgABBAEGYqoiAADYCoKqIgABBACAGIABrIAlB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GyEDCwJAIAMgACgCACACa00NACAAIAIgA0EBQQEQoICAgAALIAAoAgQgAmohBAJAAkAgAUGAAUkNACABQT9xQYB/ciEFIAFBBnYhBgJAIAFBgBBPDQAgBCAFOgABIAQgBkHAAXI6AAAMAgsgAUEMdiEHIAZBP3FBgH9yIQYCQCABQf//A0sNACAEIAU6AAIgBCAGOgABIAQgB0HgAXI6AAAMAgsgBCAFOgADIAQgBjoAAiAEIAdBP3FBgH9yOgABIAQgAUESdkFwcjoAAAwBCyAEIAE6AAALIAAgAyACajYCCEEAC14BAX8CQAJAAkAgAiAAKAIAIAAoAggiA2tNDQAgACADIAJBAUEBEKCAgIAAIAAoAgghAwwBCyACRQ0BCyACRQ0AIAAoAgQgA2ogASAC/AoAAAsgACADIAJqNgIIQQALoQECAn8BfiOAgICAAEEgayICJICAgIAAAkAgASgCAEF/Rw0AIAEoAgwhAyACQQA2AhwgAkKAgICAEDcCFCACQRRqQeyQiIAAIAMoAgAiAygCACADKAIEENCAgIAAGiACIAIoAhwiAzYCECACIAIpAhQiBDcDCCABIAM2AgggASAENwIACyAAQZiTiIAANgIEIAAgATYCACACQSBqJICAgIAAC4UCAgJ/AX4jgICAgABBIGsiAiSAgICAAAJAIAEoAgBBf0cNACABKAIMIQMgAkEANgIYIAJCgICAgBA3AhAgAkEQakHskIiAACADKAIAIgMoAgAgAygCBBDQgICAABogAiACKAIYIgM2AgggAiACKQIQIgQ3AwAgASADNgIIIAEgBDcCAAsgASgCCCEDIAFBADYCCCABKQIAIQQgAUKAgICAEDcCACACIAM2AhggAiAENwMQEJ6AgIAAAkBBDEEEEJqAgIAAIgENAEEEQQwQzICAgAAACyABIAIoAhg2AgggASACKQMQNwIAIABBmJOIgAA2AgQgACABNgIAIAJBIGokgICAgAALCQAgAEEANgIACxQAIABB7JCIgAAgASACENCAgIAAC8ABAQJ/AkACQCACRQ0AQQAtANWqiIAAIQNBAEEBOgDVqoiAAEHgqoiAACEEQYCAjIAAQeCqiIAATQ0AIAJBgICMgABB4KqIgABrSw0AIANB/wFxDQBBgICMgABB4KqIgABrIQIMAQtBACEEAkAgAkEQdiACQf//A3FBAEdqIgJAACIDQX9HDQBBACECDAELIAJBEHQiAkFwaiACIANBEHQiBEEAIAJrRhshAgsgAEEANgIIIAAgAjYCBCAAIAQ2AgALHAACQCAARQ0AIAAgARDMgICAAAALEM2AgIAAAAuQAQACQAJAIANBAE4NAEEBIQFBBCECQQAhAwwBCwJAAkACQAJAIAFFDQAgAiABQQEgAxCcgICAACEBDAELAkAgAw0AQQEhAQwCCxCegICAACADQQEQmoCAgAAhAQsgAQ0AQQEhASAAQQE2AgQMAQsgACABNgIEQQAhAQtBCCECCyAAIAJqIAM2AgAgACABNgIAC3sBA38jgICAgABBEGsiASSAgICAACABQQRqIAAoAgAiAiAAKAIEIAJBAXQiAkEIIAJBCEsbIgIQyoCAgAACQCABKAIEQQFHDQAgASgCCCABKAIMEMmAgIAAAAsgASgCCCEDIAAgAjYCACAAIAM2AgQgAUEQaiSAgICAAAsNACABIAAQt4CAgAAACxcAQeCTiIAAQSNB9JOIgAAQ0YCAgAAACxUAIAAgAUEBdEEBciACENGAgIAAAAsUACABIAAoAgAgACgCBBDXgICAAAv0BAEIfyOAgICAAEEQayIEJICAgIAAAkACQAJAIANBAXENACACLQAAIgUNAUEAIQUMAgsgACACIANBAXYgASgCDBGBgICAAICAgIAAIQUMAQsgASgCDCEGQQAhBwNAIAJBAWohCAJAAkACQAJAAkAgBcBBf0oNACAFQf8BcSIJQYABRg0BIAlBwAFHDQMgBCABNgIEIAQgADYCACAEQqCAgIAGNwIIIAMgB0EDdGoiBSgCACAEIAUoAgQRgoCAgACAgICAAEUNAkEBIQUMBgsCQCAAIAggBUH/AXEiBSAGEYGAgIAAgICAgAANACAIIAVqIQIMBAtBASEFDAULAkAgACACQQNqIgUgAi8AASICIAYRgYCAgACAgICAAA0AIAUgAmohAgwDC0EBIQUMBAsgB0EBaiEHIAghAgwBC0GggICABiEKAkAgBUEBcUUNACACQQVqIQggAigAASEKC0EAIQkCQAJAIAVBAnENAEEAIQsgCCECDAELIAhBAmohAiAILwAAIQsLAkACQCAFQQRxDQAgAiEIDAELIAJBAmohCCACLwAAIQkLAkACQCAFQQhxDQAgCCECDAELIAhB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";
                    var instancePromise = null;
                    function base64ToBytes(value) {
                        var binary = atob(value);
                        var bytes = new Uint8Array(binary.length);
                        for (var i = 0; i < binary.length; i++)
                            bytes[i] = binary.charCodeAt(i);
                        return bytes;
                    }
                    function utf8Encode(value) {
                        var bytes = [];
                        for (var i = 0; i < value.length; i++) {
                            var code = value.charCodeAt(i);
                            if (code < 0x80) {
                                bytes.push(code);
                            }
                            else if (code < 0x800) {
                                bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
                            }
                            else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) {
                                var next = value.charCodeAt(i + 1);
                                if (next >= 0xdc00 && next <= 0xdfff) {
                                    var point = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
                                    bytes.push(0xf0 | (point >> 18), 0x80 | ((point >> 12) & 0x3f), 0x80 | ((point >> 6) & 0x3f), 0x80 | (point & 0x3f));
                                    i++;
                                    continue;
                                }
                                bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
                            }
                            else {
                                bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
                            }
                        }
                        return new Uint8Array(bytes);
                    }
                    function utf8Decode(bytes) {
                        var result = "";
                        var i = 0;
                        while (i < bytes.length) {
                            var first = bytes[i++];
                            var point;
                            if (first < 0x80) {
                                point = first;
                            }
                            else if (first < 0xe0) {
                                point = ((first & 0x1f) << 6) | (bytes[i++] & 0x3f);
                            }
                            else if (first < 0xf0) {
                                point = ((first & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
                            }
                            else {
                                point = ((first & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12)
                                    | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
                            }
                            if (point < 0x10000) {
                                result += String.fromCharCode(point);
                            }
                            else {
                                point -= 0x10000;
                                result += String.fromCharCode(0xd800 + (point >> 10), 0xdc00 + (point & 0x3ff));
                            }
                        }
                        return result;
                    }
                    function loadWasm() {
                        if (!instancePromise) {
                            instancePromise = WebAssembly.instantiate(base64ToBytes(WASM_BASE64))
                                .then(function (result) { return result.instance.exports; });
                        }
                        return instancePromise;
                    }
                    function processBody(exports, inputBytes) {
                        var pointer = exports.alloc(inputBytes.length);
                        new Uint8Array(exports.memory.buffer, pointer, inputBytes.length).set(inputBytes);
                        var outputPointer = exports.process(pointer, inputBytes.length);
                        var outputLength = exports.output_len();
                        var output = outputLength === 0
                            ? null
                            : utf8Decode(new Uint8Array(exports.memory.buffer, outputPointer, outputLength));
                        exports.dealloc(pointer, inputBytes.length);
                        return output;
                    }
                    try {
                        if (!$request || !$response || typeof $response.body !== "string")
                            return $done({});
                        loadWasm().then(function (exports) {
                            try {
                                var output = processBody(exports, utf8Encode($response.body));
                                return $done(output === null ? {} : { body: output });
                            }
                            catch (error) {
                                console.log("base_init_wasm: " + (error && error.message ? error.message : error));
                                return $done({});
                            }
                        }).catch(function (error) {
                            console.log("base_init_wasm: " + (error && error.message ? error.message : error));
                            $done({});
                        });
                    }
                    catch (error) {
                        console.log("base_init_wasm: " + (error && error.message ? error.message : error));
                        $done({});
                    }
                })();
            }).call(this);
        }
    });
})();
