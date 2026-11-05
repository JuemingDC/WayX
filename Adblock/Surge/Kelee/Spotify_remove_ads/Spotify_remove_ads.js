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
    const __wayxContexts = { "response": { "surge": { "phase": "response", "responseBody": true, "binary": false, "binaryKnown": true, "name": "Protobuf处理", "argumentSchema": { "kind": "object", "enumValues": {}, "fields": { "tab": "boolean", "useractivity": "boolean" } }, "from": "loon", "to": "surge", "apiPlan": { "version": 1, "omitNotificationOptions": false, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"], "source": { "responseStatus": "status", "scriptStartTime": "date", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": true }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "node", "timeoutMs": 1, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": true } }, "notification": { "root": "$notification.post", "open": "openUrl", "media": "mediaUrl", "action": null, "openAction": null, "stringLink": true, "delay": true }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "typed" }, "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" } }, "runtimePolicyVersion": 5, "omittedParameters": [] } } }, __wayxConfig = __wayxContexts[__wayxHost.response === undefined ? 'request' : 'response']?.[__wayxTarget];
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
        function view(value) {
            if (value === undefined)
                return undefined;
            const result = Object.assign({}, value);
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
        const request = view(host.request), response = view(host.response);
        let completed = false;
        const finish = value => { completed = true; return host.done(value); };
        function message(value, synthetic) {
            if (!value || typeof value !== 'object' || Array.isArray(value))
                return fail('completion requires an object');
            const out = Object.assign({}, value);
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
                if (!['url', 'headers', 'body', 'bodyBytes', 'status', 'abort', ...(config.to === 'loon' ? ['h2_trailers'] : [])].includes(key)) {
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
                for (const k of ['url', 'headers', 'body', 'bodyBytes', 'h2_trailers', source.responseStatus])
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
                200 !== $response.status && $done({}), (() => {
                    "use strict";
                    function e(e, t) { let i = e.success; if (void 0 !== i) {
                        y(t, 10);
                        let e = r();
                        (function (e, t) { let i = e.resolveSuccess; if (void 0 !== i) {
                            y(t, 10);
                            let e = r();
                            (function (e, t) { let i = e.configuration; if (void 0 !== i) {
                                y(t, 10);
                                let e = r();
                                (function (e, t) { let i = e.configurationAssignmentId; void 0 !== i && (y(t, 10), h(t, i)); let l = e.fetchTimeMillis; void 0 !== l && (y(t, 16), V(t, l)); let a = e.assignedValues; if (void 0 !== a)
                                    for (let e of a) {
                                        y(t, 26);
                                        let i = r();
                                        (function (e, t) { let i = e.boolValue; if (void 0 !== i) {
                                            y(t, 26);
                                            let e = r();
                                            (function (e, t) { let i = e.value; void 0 !== i && (y(t, 8), v(t, +!!i)); })(i, e), y(t, e.limit), k(t, e), o(e);
                                        } let l = e.intValue; if (void 0 !== l) {
                                            y(t, 34);
                                            let e = r();
                                            (function (e, t) { var i; let l = e.value; void 0 !== l && (y(t, 8), V(t, { low: i = 0 | l, high: i >> 31, unsigned: i >= 0 })); })(l, e), y(t, e.limit), k(t, e), o(e);
                                        } let a = e.enumValue; if (void 0 !== a) {
                                            y(t, 42);
                                            let e = r();
                                            (function (e, t) { let i = e.value; void 0 !== i && (y(t, 10), h(t, i)); })(a, e), y(t, e.limit), k(t, e), o(e);
                                        } let s = e.propertyId; if (void 0 !== s) {
                                            y(t, 10);
                                            let e = r();
                                            (function (e, t) { let i = e.scope; void 0 !== i && (y(t, 10), h(t, i)); let l = e.name; void 0 !== l && (y(t, 18), h(t, l)); })(s, e), y(t, e.limit), k(t, e), o(e);
                                        } })(e, i), y(t, i.limit), k(t, i), o(i);
                                    } })(i, e), y(t, e.limit), k(t, e), o(e);
                            } })(i, e), y(t, e.limit), k(t, e), o(e);
                        } let l = e.accountAttributesSuccess; if (void 0 !== l) {
                            y(t, 26);
                            let e = r();
                            (function (e, t) { let i = e.accountAttributes; if (void 0 !== i)
                                for (let e in i) {
                                    let l = r(), a = i[e];
                                    y(l, 10), h(l, e), y(l, 18);
                                    let s = r();
                                    (function (e, t) { let i = e.boolValue; void 0 !== i && (y(t, 16), v(t, +!!i)); let l = e.longValue; void 0 !== l && (y(t, 24), V(t, l)); let a = e.stringValue; void 0 !== a && (y(t, 34), h(t, a)); })(a, s), y(l, s.limit), k(l, s), o(s), y(t, 10), y(t, l.offset), k(t, l), o(l);
                                } })(l, e), y(t, e.limit), k(t, e), o(e);
                        } let a = e.fetchTimeMillis; void 0 !== a && (y(t, 40), V(t, a)); })(i, e), y(t, e.limit), k(t, e), o(e);
                    } }
                    function t(e) { let t = {}; e: for (; !f(e);) {
                        let a = p(e);
                        switch (a >>> 3) {
                            case 0: break e;
                            case 1: {
                                let a = i(e);
                                t.success = function (e) { let t = {}; e: for (; !f(e);) {
                                    let a = p(e);
                                    switch (a >>> 3) {
                                        case 0: break e;
                                        case 1: {
                                            let a = i(e);
                                            t.resolveSuccess = function (e) { let t = {}; e: for (; !f(e);) {
                                                let a = p(e);
                                                switch (a >>> 3) {
                                                    case 0: break e;
                                                    case 1: {
                                                        let a = i(e);
                                                        t.configuration = function (e) { let t = {}; e: for (; !f(e);) {
                                                            let a = p(e);
                                                            switch (a >>> 3) {
                                                                case 0: break e;
                                                                case 1:
                                                                    t.configurationAssignmentId = m(e, p(e));
                                                                    break;
                                                                case 2:
                                                                    t.fetchTimeMillis = w(e, !1);
                                                                    break;
                                                                case 3: {
                                                                    let a = i(e);
                                                                    (t.assignedValues || (t.assignedValues = [])).push(function (e) { let t = {}; e: for (; !f(e);) {
                                                                        let a = p(e);
                                                                        switch (a >>> 3) {
                                                                            case 0: break e;
                                                                            case 3: {
                                                                                let a = i(e);
                                                                                t.boolValue = function (e) { let t = {}; e: for (; !f(e);) {
                                                                                    let i = p(e);
                                                                                    switch (i >>> 3) {
                                                                                        case 0: break e;
                                                                                        case 1:
                                                                                            t.value = !!g(e);
                                                                                            break;
                                                                                        default: l(e, 7 & i);
                                                                                    }
                                                                                } return t; }(e), e.limit = a;
                                                                                break;
                                                                            }
                                                                            case 4: {
                                                                                let a = i(e);
                                                                                t.intValue = function (e) { let t = {}; e: for (; !f(e);) {
                                                                                    let i = p(e);
                                                                                    switch (i >>> 3) {
                                                                                        case 0: break e;
                                                                                        case 1:
                                                                                            t.value = p(e);
                                                                                            break;
                                                                                        default: l(e, 7 & i);
                                                                                    }
                                                                                } return t; }(e), e.limit = a;
                                                                                break;
                                                                            }
                                                                            case 5: {
                                                                                let a = i(e);
                                                                                t.enumValue = function (e) { let t = {}; e: for (; !f(e);) {
                                                                                    let i = p(e);
                                                                                    switch (i >>> 3) {
                                                                                        case 0: break e;
                                                                                        case 1:
                                                                                            t.value = m(e, p(e));
                                                                                            break;
                                                                                        default: l(e, 7 & i);
                                                                                    }
                                                                                } return t; }(e), e.limit = a;
                                                                                break;
                                                                            }
                                                                            case 1: {
                                                                                let a = i(e);
                                                                                t.propertyId = function (e) { let t = {}; e: for (; !f(e);) {
                                                                                    let i = p(e);
                                                                                    switch (i >>> 3) {
                                                                                        case 0: break e;
                                                                                        case 1:
                                                                                            t.scope = m(e, p(e));
                                                                                            break;
                                                                                        case 2:
                                                                                            t.name = m(e, p(e));
                                                                                            break;
                                                                                        default: l(e, 7 & i);
                                                                                    }
                                                                                } return t; }(e), e.limit = a;
                                                                                break;
                                                                            }
                                                                            default: l(e, 7 & a);
                                                                        }
                                                                    } return t; }(e)), e.limit = a;
                                                                    break;
                                                                }
                                                                default: l(e, 7 & a);
                                                            }
                                                        } return t; }(e), e.limit = a;
                                                        break;
                                                    }
                                                    default: l(e, 7 & a);
                                                }
                                            } return t; }(e), e.limit = a;
                                            break;
                                        }
                                        case 3: {
                                            let a = i(e);
                                            t.accountAttributesSuccess = function (e) { let t = {}; e: for (; !f(e);) {
                                                let a = p(e);
                                                switch (a >>> 3) {
                                                    case 0: break e;
                                                    case 1: {
                                                        let a, s, r = t.accountAttributes || (t.accountAttributes = {}), o = i(e);
                                                        t: for (; !f(e);) {
                                                            let t = p(e);
                                                            switch (t >>> 3) {
                                                                case 0: break t;
                                                                case 1:
                                                                    a = m(e, p(e));
                                                                    break;
                                                                case 2: {
                                                                    let t = i(e);
                                                                    s = function (e) { let t = {}; e: for (; !f(e);) {
                                                                        let i = p(e);
                                                                        switch (i >>> 3) {
                                                                            case 0: break e;
                                                                            case 2:
                                                                                t.boolValue = !!g(e);
                                                                                break;
                                                                            case 3:
                                                                                t.longValue = w(e, !1);
                                                                                break;
                                                                            case 4:
                                                                                t.stringValue = m(e, p(e));
                                                                                break;
                                                                            default: l(e, 7 & i);
                                                                        }
                                                                    } return t; }(e), e.limit = t;
                                                                    break;
                                                                }
                                                                default: l(e, 7 & t);
                                                            }
                                                        }
                                                        if (void 0 === a || void 0 === s)
                                                            throw Error("Invalid data for map: accountAttributes");
                                                        r[a] = s, e.limit = o;
                                                        break;
                                                    }
                                                    default: l(e, 7 & a);
                                                }
                                            } return t; }(e), e.limit = a;
                                            break;
                                        }
                                        case 5:
                                            t.fetchTimeMillis = w(e, !1);
                                            break;
                                        default: l(e, 7 & a);
                                    }
                                } return t; }(e), e.limit = a;
                                break;
                            }
                            default: l(e, 7 & a);
                        }
                    } return t; }
                    function i(e) { let t = p(e), i = e.limit; return e.limit = e.offset + t, i; }
                    function l(e, t) { switch (t) {
                        case 0:
                            for (; 128 & g(e);)
                                ;
                            break;
                        case 2:
                            u(e, p(e));
                            break;
                        case 5:
                            u(e, 4);
                            break;
                        case 1:
                            u(e, 8);
                            break;
                        default: throw Error("Unimplemented type: " + t);
                    } }
                    let a = (new Uint8Array(new Float32Array(1).buffer), new Float64Array(1)), s = (new Uint8Array(a.buffer), []);
                    function r() { let e = s.pop(); return e ? (e.offset = e.limit = 0, e) : { bytes: new Uint8Array(64), offset: 0, limit: 0 }; }
                    function o(e) { s.push(e); }
                    function n(e) { return { bytes: e, offset: 0, limit: e.length }; }
                    function c(e) { let t = e.bytes, i = e.limit; return t.length === i ? t : t.subarray(0, i); }
                    function u(e, t) { if (e.offset + t > e.limit)
                        throw Error("Skip past limit"); e.offset += t; }
                    function f(e) { return e.offset >= e.limit; }
                    function b(e, t) { let i = e.bytes, l = e.offset, a = e.limit, s = l + t; if (s > i.length) {
                        let t = new Uint8Array(2 * s);
                        t.set(i), e.bytes = t;
                    } return e.offset = s, s > a && (e.limit = s), l; }
                    function d(e, t) { let i = e.offset; if (i + t > e.limit)
                        throw Error("Read past limit"); return e.offset += t, i; }
                    function m(e, t) { let i = d(e, t), l = String.fromCharCode, a = e.bytes, s = ""; for (let e = 0; e < t; e++) {
                        let r = a[e + i], o, n, c, u;
                        (128 & r) == 0 ? s += l(r) : (224 & r) == 192 ? e + 1 >= t || (192 & (o = a[e + i + 1])) != 128 || (u = (31 & r) << 6 | 63 & o) < 128 ? s += "�" : (s += l(u), e++) : (240 & r) == 224 ? e + 2 >= t || (((o = a[e + i + 1]) | (n = a[e + i + 2]) << 8) & 49344) != 32896 || (u = (15 & r) << 12 | (63 & o) << 6 | 63 & n) < 2048 || u >= 55296 && u <= 57343 ? s += "�" : (s += l(u), e += 2) : (248 & r) == 240 ? e + 3 >= t ? s += "�" : (o = a[e + i + 1], ((o | (n = a[e + i + 2]) << 8 | (c = a[e + i + 3]) << 16) & 0xc0c0c0) != 8421504 || (u = (7 & r) << 18 | (63 & o) << 12 | (63 & n) << 6 | 63 & c) < 65536 || u > 1114111 ? s += "�" : (u -= 65536, s += l((u >> 10) + 55296, (1023 & u) + 56320), e += 3)) : s += "�";
                    } return s; }
                    function h(e, t) { let i = t.length, l = 0; for (let e = 0; e < i; e++) {
                        let a = t.charCodeAt(e);
                        a >= 55296 && a <= 56319 && e + 1 < i && (a = (a << 10) + t.charCodeAt(++e) - 0x35fdc00), l += a < 128 ? 1 : a < 2048 ? 2 : a < 65536 ? 3 : 4;
                    } y(e, l); let a = b(e, l), s = e.bytes; for (let e = 0; e < i; e++) {
                        let l = t.charCodeAt(e);
                        l >= 55296 && l <= 56319 && e + 1 < i && (l = (l << 10) + t.charCodeAt(++e) - 0x35fdc00), l < 128 ? s[a++] = l : (l < 2048 ? s[a++] = l >> 6 & 31 | 192 : (l < 65536 ? s[a++] = l >> 12 & 15 | 224 : (s[a++] = l >> 18 & 7 | 240, s[a++] = l >> 12 & 63 | 128), s[a++] = l >> 6 & 63 | 128), s[a++] = 63 & l | 128);
                    } }
                    function k(e, t) { let i = b(e, t.limit), l = e.bytes, a = t.bytes; for (let e = 0, s = t.limit; e < s; e++)
                        l[e + i] = a[e]; }
                    function g(e) { return e.bytes[d(e, 1)]; }
                    function v(e, t) { let i = b(e, 1); e.bytes[i] = t; }
                    function p(e) { let t, i = 0, l = 0; do
                        t = g(e), i < 32 && (l |= (127 & t) << i), i += 7;
                    while (128 & t); return l; }
                    function y(e, t) { for (t >>>= 0; t >= 128;)
                        v(e, 127 & t | 128), t >>>= 7; v(e, t); }
                    function w(e, t) { let i, l = 0, a = 0, s = 0; return l = 127 & (i = g(e)), 128 & i && (l |= (127 & (i = g(e))) << 7, 128 & i && (l |= (127 & (i = g(e))) << 14, 128 & i && (l |= (127 & (i = g(e))) << 21, 128 & i && (a = 127 & (i = g(e)), 128 & i && (a |= (127 & (i = g(e))) << 7, 128 & i && (a |= (127 & (i = g(e))) << 14, 128 & i && (a |= (127 & (i = g(e))) << 21, 128 & i && (s = 127 & (i = g(e)), 128 & i && (s |= (127 & (i = g(e))) << 7))))))))), { low: l | a << 28, high: a >>> 4 | s << 24, unsigned: t }; }
                    function V(e, t) { let i = t.low >>> 0, l = (t.low >>> 28 | t.high << 4) >>> 0, a = t.high >>> 24, s = 0 === a ? 0 === l ? i < 16384 ? i < 128 ? 1 : 2 : i < 2097152 ? 3 : 4 : l < 16384 ? l < 128 ? 5 : 6 : l < 2097152 ? 7 : 8 : a < 128 ? 9 : 10, r = b(e, s), o = e.bytes; switch (s) {
                        case 10: o[r + 9] = a >>> 7 & 1;
                        case 9: o[r + 8] = 9 !== s ? 128 | a : 127 & a;
                        case 8: o[r + 7] = 8 !== s ? l >>> 21 | 128 : l >>> 21 & 127;
                        case 7: o[r + 6] = 7 !== s ? l >>> 14 | 128 : l >>> 14 & 127;
                        case 6: o[r + 5] = 6 !== s ? l >>> 7 | 128 : l >>> 7 & 127;
                        case 5: o[r + 4] = 5 !== s ? 128 | l : 127 & l;
                        case 4: o[r + 3] = 4 !== s ? i >>> 21 | 128 : i >>> 21 & 127;
                        case 3: o[r + 2] = 3 !== s ? i >>> 14 | 128 : i >>> 14 & 127;
                        case 2: o[r + 1] = 2 !== s ? i >>> 7 | 128 : i >>> 7 & 127;
                        case 1: o[r] = 1 !== s ? 128 | i : 127 & i;
                    } }
                    function A(e, t) { for (let i of (Object.assign(t.accountAttributesSuccess.accountAttributes, { ads: { boolValue: !1 }, "com.spotify.madprops.use.ucs.product.state": { boolValue: !0 }, "nft-disabled": { stringValue: "1" }, offline: { boolValue: !0 }, "player-license": { stringValue: "premium" }, "streaming-rules": { stringValue: "" }, type: { stringValue: "premium" }, "publish-playlist": { boolValue: !1 }, name: { stringValue: "Spotify Premium" }, "financial-product": { stringValue: "pr:premium,tc:0" } }), t.resolveSuccess.configuration.assignedValues)) {
                        let { name: t, scope: l } = i.propertyId;
                        "ios-system-your-plan-sidedrawer" === l && "is_row_enabled" === t ? (console.log("ios-system-your-plan-sidedrawer"), console.log(i), i.boolValue.value = !1) : e.tab && "tab_configuration" === t && "ios-feature-navigation" === l ? i.enumValue.value = "" : e.useractivity || "is_useractivity_sharing_enabled" !== t || "ios-feature-share" !== l || (i.boolValue.value = !1);
                    } }
                    try {
                        let a = "string" == typeof $argument ? JSON.parse($argument) : "object" == typeof $argument ? $argument : null, s = function (a, s, u) { if (s.includes("/u")) {
                            let i, l = t(n(u));
                            return A(a, l.success), e(l, i = r()), c(i);
                        } {
                            let s, b = function (e) { let a = {}; e: for (; !f(e);) {
                                let s = p(e);
                                switch (s >>> 3) {
                                    case 0: break e;
                                    case 2: {
                                        let s = i(e);
                                        a.ucsResponseV0 = function (e) { let a = {}; e: for (; !f(e);) {
                                            let s = p(e);
                                            switch (s >>> 3) {
                                                case 0: break e;
                                                case 1: {
                                                    let s = i(e);
                                                    a.success = function (e) { let a = {}; e: for (; !f(e);) {
                                                        let s = p(e);
                                                        switch (s >>> 3) {
                                                            case 0: break e;
                                                            case 1: {
                                                                let l = i(e);
                                                                a.customization = t(e), e.limit = l;
                                                                break;
                                                            }
                                                            default: l(e, 7 & s);
                                                        }
                                                    } return a; }(e), e.limit = s;
                                                    break;
                                                }
                                                default: l(e, 7 & s);
                                            }
                                        } return a; }(e), e.limit = s;
                                        break;
                                    }
                                    default: l(e, 7 & s);
                                }
                            } return a; }(n(u));
                            return A(a, b.ucsResponseV0.success.customization.success), function (t, i) { let l = t.ucsResponseV0; if (void 0 !== l) {
                                y(i, 18);
                                let t = r();
                                (function (t, i) { let l = t.success; if (void 0 !== l) {
                                    y(i, 10);
                                    let t = r();
                                    (function (t, i) { let l = t.customization; if (void 0 !== l) {
                                        y(i, 10);
                                        let t = r();
                                        e(l, t), y(i, t.limit), k(i, t), o(t);
                                    } })(l, t), y(i, t.limit), k(i, t), o(t);
                                } })(l, t), y(i, t.limit), k(i, t), o(t);
                            } }(b, s = r()), c(s);
                        } }(a, $request.url, $response.body);
                        $done({ body: s });
                    }
                    catch (e) {
                        console.log(e.message), $done({});
                    }
                })();
            }).call(this);
        }
    });
})();
