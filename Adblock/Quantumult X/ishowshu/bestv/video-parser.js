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
    const __wayxContexts = { "response": { "qx": { "phase": "response", "binary": false, "responseBody": true, "name": "video-parser.js", "from": "qx", "to": "qx", "apiPlan": { "version": 1, "omitNotificationOptions": true, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"], "source": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": null, "media": null, "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" }, "target": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": null, "media": null, "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" } }, "runtimePolicyVersion": 5, "omittedParameters": ["undocumented-qx-parameters"] } } }, __wayxConfig = __wayxContexts[__wayxHost.response === undefined ? 'request' : 'response']?.[__wayxTarget];
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
                const $origDone = $done;
                $done = (obj = {}) => {
                    this.$prefs || (obj.status &&= +String(obj.status).match(/\b\d{3}\b/)[0]);
                    $origDone(obj);
                };
                const store = {
                    get: this.$prefs?.valueForKey ?? $persistentStore.read,
                    set: (k, v) => (this.$prefs?.setValueForKey ?? $persistentStore.write)(v, k)
                };
                const UTILS_URL = 'https://raw.githubusercontent.com/xzxxn777/Surge/main/Utils/Utils.js';
                const CACHE_KEY_CODE = 'Utils_Code';
                const CACHE_KEY_TIME = 'Utils_Codetime';
                const KDF_AES_KEY = 'UITN25LMUQC436IM';
                function kvGet(key) {
                    try {
                        if (typeof $prefs !== 'undefined' && $prefs.valueForKey)
                            return $prefs.valueForKey(key) || '';
                        if (typeof $persistentStore !== 'undefined' && $persistentStore.read)
                            return $persistentStore.read(key) || '';
                    }
                    catch { }
                    return '';
                }
                function kvSet(key, val) {
                    try {
                        if (typeof $prefs !== 'undefined' && $prefs.setValueForKey)
                            return $prefs.setValueForKey(val, key);
                        if (typeof $persistentStore !== 'undefined' && $persistentStore.write)
                            return $persistentStore.write(val, key);
                    }
                    catch { }
                    return false;
                }
                function fetchRemote(options) {
                    return new Promise((resolve, reject) => {
                        const method = (options.method || 'GET').toUpperCase();
                        if (typeof $httpClient !== 'undefined') {
                            const fn = method === 'POST' ? $httpClient.post : $httpClient.get;
                            fn(options, (error, response, body) => {
                                if (error)
                                    return reject(error);
                                resolve({ response, body });
                            });
                        }
                        else if (typeof $task !== 'undefined') {
                            if (method === 'POST')
                                options.method = 'POST';
                            $task.fetch(options).then(resp => resolve({ response: resp, body: resp.body }), err => reject((err && err.error) || err));
                        }
                        else {
                            reject('Unsupported environment');
                        }
                    });
                }
                function safeJson(s) {
                    try {
                        return JSON.parse(s);
                    }
                    catch {
                        return null;
                    }
                }
                async function loadUtilsCached() {
                    const cached = kvGet(CACHE_KEY_CODE);
                    if (cached) {
                        try {
                            eval(cached);
                            if (typeof creatUtils === 'function')
                                return creatUtils();
                            if (typeof createUtils === 'function')
                                return createUtils();
                            kvSet(CACHE_KEY_CODE, '');
                        }
                        catch {
                            kvSet(CACHE_KEY_CODE, '');
                        }
                    }
                    try {
                        const { body } = await fetchRemote({ url: UTILS_URL, method: 'GET', timeout: 15000 });
                        if (!body)
                            return null;
                        try {
                            eval(body);
                            if (typeof creatUtils === 'function' || typeof createUtils === 'function') {
                                kvSet(CACHE_KEY_CODE, body);
                                kvSet(CACHE_KEY_TIME, String(Date.now()));
                                return typeof creatUtils === 'function' ? creatUtils() : createUtils();
                            }
                            return null;
                        }
                        catch {
                            return null;
                        }
                    }
                    catch {
                        return null;
                    }
                }
                async function getCryptoJS() {
                    if (this.__GLOBAL_CryptoJS)
                        return this.__GLOBAL_CryptoJS;
                    const utils = await loadUtilsCached();
                    if (!utils || typeof utils.createCryptoJS !== 'function')
                        return null;
                    const CryptoJS = utils.createCryptoJS();
                    this.__GLOBAL_CryptoJS = CryptoJS;
                    return CryptoJS;
                }
                async function decryptKDFBody(cipherText) {
                    const CryptoJS = await getCryptoJS();
                    if (!CryptoJS)
                        return '';
                    let txt = String(cipherText || '').trim();
                    txt = txt.replace(/\s+/g, '');
                    txt = txt.replace(/^"|"$/g, '');
                    if (!txt)
                        return '';
                    const key = CryptoJS.enc.Utf8.parse(KDF_AES_KEY);
                    try {
                        const ct = CryptoJS.enc.Base64.parse(txt);
                        const bytes = CryptoJS.AES.decrypt({ ciphertext: ct }, key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 });
                        const result = bytes.toString(CryptoJS.enc.Utf8);
                        if (result && (result[0] === '{' || result[0] === '['))
                            return result;
                    }
                    catch (e) { }
                    try {
                        const ctHex = CryptoJS.enc.Hex.parse(txt);
                        const bytes = CryptoJS.AES.decrypt({ ciphertext: ctHex }, key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 });
                        const result = bytes.toString(CryptoJS.enc.Utf8);
                        if (result && (result[0] === '{' || result[0] === '['))
                            return result;
                    }
                    catch (e) { }
                    return '';
                }
                const M3U_HEADER = '#EXTM3U x-tvg-url="https://t.me/GithubYu9191"';
                const extraLines = t => [
                    `#EXTINF:-1 tvg-id="频道说明" tvg-name="频道说明" tvg-logo="https://epg.iill.top/logo/温馨提示.png" group-title="•${t}",欢迎订阅频道：https://t.me/GithubYu9191`,
                    'https://t.me/GithubYu9191'
                ];
                const url = $request.url || '';
                if (url.includes('/api/v1/nba/game/') ||
                    url.includes('/cms/api/live/studio/id/v8') ||
                    url.includes('/cms/api/c/player/common')) {
                    parseVideoApi();
                }
                else if (url.includes('360.com/nba.m3u')) {
                    renderM3U('nba');
                }
                else if (url.includes('360.com/dianshi.m3u')) {
                    renderM3U('tv');
                }
                else if (url.includes('360.com/video')) {
                    renderHtml();
                }
                else {
                    $done({});
                }
                async function parseVideoApi() {
                    try {
                        let raw = $response.body;
                        if (typeof raw !== 'string')
                            raw = String(raw || '');
                        let parsed = safeJson(raw);
                        if (!parsed) {
                            const decrypted = await decryptKDFBody(raw);
                            if (!decrypted) {
                                console.log('KDF: 解密失败');
                                return $done({});
                            }
                            parsed = safeJson(decrypted);
                            if (!parsed) {
                                console.log('KDF: JSON 解析失败');
                                return $done({});
                            }
                        }
                        const body = parsed;
                        if (body.dt?.liveStudioStreamRelVoList)
                            return handleNBA(body.dt);
                        if (body.dt?.medias)
                            return handleTV(body.dt);
                        console.log('KDF: 未识别内容');
                        $done({});
                    }
                    catch (e) {
                        console.log('KDF: parseVideoApi 异常: ' + e);
                        $done({});
                    }
                }
                function handleNBA(dt) {
                    store.set('content_type', 'nba');
                    store.set('nba_game_title', dt.title);
                    store.set('nba_game_description', dt.description || '');
                    store.set('nba_game_cover', dt.sourceCover);
                    store.set('nba_game_background', dt.backgroundCover || dt.sourceCover);
                    const streams = (dt.liveStudioStreamRelVoList || []).map(s => {
                        const best = s.qualitys?.find(q => /1080/.test(q.qualityShortName || '')) ?? s.qualitys?.[0] ?? {};
                        return {
                            title: s.title, cover: s.cover, canSee: s.canSee,
                            qualitys: s.qualitys || [], playUrl: best.qualityUrl || ''
                        };
                    });
                    store.set('nba_streams', JSON.stringify(streams));
                    if (dt.studioTabVoList)
                        store.set('nba_tabs', JSON.stringify(dt.studioTabVoList));
                    notify(dt.title, 'NBA比赛');
                    $done({});
                }
                function handleTV(dt) {
                    const cur = dt.currentMedias || {};
                    store.set('content_type', 'tv');
                    store.set('tv_title', cur.contentName || '');
                    store.set('tv_cover', cur.mediaCover || '');
                    store.set('tv_description', cur.shareDesc || '');
                    store.set('tv_current_ep', cur.episodeNumber || 1);
                    store.set('tv_current_media', JSON.stringify(cur));
                    const rawEps = Array.isArray(dt.medias) ? dt.medias : (dt.medias?.data || []);
                    const pickBest = (qArr = [], fallback = '') => {
                        if (!Array.isArray(qArr) || qArr.length === 0)
                            return fallback;
                        return qArr.map(q => ({
                            url: q.qualityUrl || q.originalUrl || '',
                            score: /1080|FHD/i.test(q.qualityShortName || q.bitrateType) ? 3 :
                                /720|HD/i.test(q.qualityShortName || q.bitrateType) ? 2 : 1,
                            bw: +(q.bandWidth || 0)
                        })).filter(o => o.url).sort((a, b) => b.score - a.score || b.bw - a.bw)[0].url;
                    };
                    const episodes = rawEps.map(ep => ({
                        episodeNumber: ep.episodeNumber, title: ep.mediaName, subTitle: ep.mediaSubTitle,
                        cover: ep.mediaCover, duration: ep.duration, qualitys: ep.qualitys || [],
                        playUrl: pickBest(ep.qualitys, ep.mediaUrl || '')
                    }));
                    store.set('tv_episodes', JSON.stringify(episodes));
                    notify(cur.contentName || '电视剧', '电视剧');
                    $done({});
                }
                function notify(title, type) {
                    const link = 'https://360.com/video';
                    const msg = type === 'NBA比赛' ? '点击查看比赛直播和集锦' : '点击查看剧集';
                    if (typeof $notify !== 'undefined') {
                        $notify(title || '看东方', '', msg, { 'open-url': link, url: link });
                    }
                    else if (typeof $notification !== 'undefined') {
                        $notification.post(title || '看东方', '', msg, { 'open-url': link, openUrl: link, url: link });
                    }
                }
                function buildM3U(kind) {
                    const lines = [M3U_HEADER];
                    if (kind === 'nba') {
                        const title = store.get('nba_game_title') || 'NBA';
                        lines.push(...extraLines(title));
                        JSON.parse(store.get('nba_streams') || '[]').forEach(s => {
                            if (!s.playUrl)
                                return;
                            lines.push(`#EXTINF:-1 tvg-id="${s.title}" tvg-name="${s.title}" tvg-logo="${s.cover}" group-title="${s.title}「1080」",${s.title}`);
                            lines.push(s.playUrl);
                        });
                    }
                    else {
                        const title = store.get('tv_title') || '电视剧';
                        lines.push(...extraLines(title));
                        JSON.parse(store.get('tv_episodes') || '[]').forEach(ep => {
                            const u = ep.playUrl || (ep.qualitys?.find(q => q.qualityUrl)?.qualityUrl) || ep.mediaUrl || '';
                            if (!u)
                                return;
                            const name = `${title} - 第${ep.episodeNumber}集`;
                            lines.push(`#EXTINF:-1 tvg-id="${name}" tvg-name="${name}" tvg-logo="${ep.cover}" group-title="${title}",${name}`);
                            lines.push(u);
                        });
                    }
                    return lines.join('\n');
                }
                function renderM3U(kind) {
                    $done({
                        status: 'HTTP/1.1 200 OK',
                        headers: { 'Content-Type': 'audio/x-mpegurl; charset=utf-8' },
                        body: buildM3U(kind)
                    });
                }
                function renderHtml() {
                    try {
                        const type = store.get('content_type') || 'nba';
                        type === 'nba' ? htmlNBA() : htmlTV();
                    }
                    catch (e) {
                        $done({
                            status: 'HTTP/1.1 500',
                            headers: { 'Content-Type': 'text/html; charset=utf-8' },
                            body: `<h1>Error</h1><p>${e}</p>`
                        });
                    }
                }
                function htmlNBA() {
                    const title = store.get('nba_game_title') || 'NBA';
                    const desc = store.get('nba_game_description') || '';
                    const cover = store.get('nba_game_cover') || '';
                    const bg = store.get('nba_game_background') || cover;
                    const streams = JSON.parse(store.get('nba_streams') || '[]');
                    const tabs = JSON.parse(store.get('nba_tabs') || '[]');
                    const streamsHTML = streams.map(s => {
                        const badge = !s.canSee ? '<span class="vip-badge">会员</span>' : '';
                        const qBtns = (s.qualitys || []).map(q => `<a href="javascript:void(0)" data-url="${encodeURIComponent(q.qualityUrl || '')}" data-name="${escapeAttr(s.title + ' ' + (q.qualityShortName || ''))}" class="quality-btn" onclick="playWith(this)">${q.qualityShortName}</a>`).join('');
                        return `<div class="video-item">
      <div class="video-thumbnail${!s.canSee ? ' vip-content' : ''}"><img src="${s.cover}" alt="${escapeAttr(s.title)}" onerror="this.src=''">${badge}</div>
      <h3>${s.title}</h3><div class="quality-options">${qBtns}</div></div>`;
                    }).join('');
                    const tabsHTML = tabs.filter(t => t.address)
                        .map(t => `<a href="${t.address}" class="tab-btn" target="_blank">${t.name}</a>`).join('');
                    $done({
                        status: 'HTTP/1.1 200 OK',
                        headers: { 'Content-Type': 'text/html; charset=utf-8' },
                        body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css()}
    .videos-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:15px;margin-top:10px}
    </style></head><body>
    <div class="header"><div class="header-bg" style="background-image:url('${bg}')"></div><div class="header-overlay"></div>
    <div class="header-content"><h1>${title}</h1>${desc ? `<p class="description">${desc}</p>` : ''}</div></div>
    ${tabsHTML ? `<div class="tabs">${tabsHTML}</div>` : ''}
    <div class="container"><h2 class="section-title">比赛视频 <button class="m3u-btn" onclick="copyM3U('nba')">复制 M3U 源</button> <button class="m3u-btn" onclick="openPlayerPicker()" id="player-btn">播放器</button></h2>
      <div class="videos-grid">${streamsHTML}</div></div>
    ${playerPickerHTML()}
    <script>${playerJS()}\nfunction copyM3U(k){navigator.clipboard.writeText(k==='nba'?'https://360.com/nba.m3u':'https://360.com/dianshi.m3u').then(()=>alert('已复制 M3U 源'));}</script></body></html>`
                    });
                }
                function htmlTV() {
                    const title = store.get('tv_title') || '电视剧';
                    const desc = store.get('tv_description') || '';
                    const cover = store.get('tv_cover') || '';
                    const curEp = +store.get('tv_current_ep') || 1;
                    const episodes = JSON.parse(store.get('tv_episodes') || '[]');
                    const curMedia = JSON.parse(store.get('tv_current_media') || '{}');
                    const epsHTML = episodes.map(ep => `
    <div class="episode-item ${ep.episodeNumber === curEp ? 'active' : ''}">
      <div class="episode-thumbnail"><img src="${ep.cover}" alt="${escapeAttr(ep.title || '')}" onerror="this.src=''"></div>
      <h3>${ep.title}</h3><p class="subtitle">${ep.subTitle || ''}</p></div>`).join('');
                    const qBtns = (curMedia.qualitys || []).map(q => `<a href="javascript:void(0)" data-url="${encodeURIComponent(q.qualityUrl || '')}" data-name="${escapeAttr((curMedia.mediaName || '') + ' ' + (q.qualityShortName || ''))}" class="quality-btn" onclick="playWith(this)">${q.qualityShortName}</a>`).join('');
                    $done({
                        status: 'HTTP/1.1 200 OK',
                        headers: { 'Content-Type': 'text/html; charset=utf-8' },
                        body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css()}
    .episodes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:15px;margin-top:20px}
    .episode-item{position:relative;background:var(--card);border-radius:8px;overflow:hidden;transition:.2s;padding-bottom:10px;cursor:pointer}
    .episode-item.active{border:2px solid var(--primary-color)}.episode-item:hover{transform:translateY(-5px)}
    .episode-thumbnail{position:relative;width:100%;padding-top:56.25%}.episode-thumbnail img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .subtitle{color:#aaa;font-size:12px;margin:0 10px 8px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;height:32px}
    .current-episode{padding:20px;background:rgba(26,26,26,.6);border-radius:10px;margin-bottom:30px}
    </style></head><body>
    <div class="header"><div class="header-bg" style="background-image:url('${cover}')"></div><div class="header-overlay"></div>
      <div class="header-content"><h1>${title}</h1>${desc ? `<p class="description">${desc}</p>` : ''}</div></div>
    <div class="container">
      <div class="current-episode"><h2>${curMedia.mediaName || ''} - ${curMedia.mediaSubTitle || ''}</h2>
        <p>选择清晰度:</p><div class="quality-options">${qBtns}</div></div>
      <h2 class="section-title">全部剧集 <button class="m3u-btn" onclick="copyM3U('tv')">复制 M3U 源</button> <button class="m3u-btn" onclick="openPlayerPicker()" id="player-btn">播放器</button></h2>
      <div class="episodes-grid">${epsHTML}</div></div>
    ${playerPickerHTML()}
    <script>${playerJS()}\nfunction copyM3U(k){navigator.clipboard.writeText(k==='nba'?'https://360.com/nba.m3u':'https://360.com/dianshi.m3u').then(()=>alert('已复制 M3U 源'));}</script></body></html>`
                    });
                }
                function escapeAttr(s) {
                    return String(s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
                }
                function css() {
                    return `
:root{--primary-color:#f39c12;--bg:#0c0c0c;--card:#1a1a1a;--text:#fff;--sec:#333;--hover:#555}
*{box-sizing:border-box}
body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);line-height:1.5}
.header{position:relative;height:200px;overflow:hidden;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px}
.header-bg{position:absolute;inset:0;background-size:cover;background-position:center;filter:blur(2px);z-index:1}
.header-overlay{position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.3),rgba(0,0,0,.8));z-index:2}
.header-content{position:relative;z-index:3;width:100%;max-width:800px}
h1{margin:0 0 10px;font-size:24px;font-weight:700;text-shadow:0 2px 4px rgba(0,0,0,.5)}
.description{margin:0;font-size:16px;opacity:.8;text-shadow:0 1px 2px rgba(0,0,0,.5)}
.tabs{display:flex;overflow-x:auto;padding:15px;background:rgba(26,26,26,.8);-webkit-overflow-scrolling:touch;scrollbar-width:none;position:sticky;top:0;z-index:10}
.tabs::-webkit-scrollbar{display:none}
.tab-btn{flex:0 0 auto;padding:10px 20px;margin-right:10px;background:var(--sec);color:var(--text);text-decoration:none;border-radius:5px;font-size:14px;transition:.2s}
.tab-btn:hover{background:var(--hover)}
.container{padding:15px;max-width:1200px;margin:0 auto}
.section-title{margin:0 0 20px;font-size:18px;font-weight:600;color:var(--primary-color);text-align:center}
.video-item{position:relative;background:var(--card);border-radius:8px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1);transition:.2s}
.video-item:hover{transform:translateY(-5px);box-shadow:0 7px 10px rgba(0,0,0,.2)}
.video-thumbnail{position:relative;width:100%;padding-top:56.25%}
.video-thumbnail img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.vip-badge{position:absolute;top:5px;right:5px;background:var(--primary-color);color:#fff;font-size:12px;padding:3px 6px;border-radius:3px;font-weight:bold;z-index:2}
.video-thumbnail.vip-content::after{content:'';position:absolute;inset:0;background:rgba(0,0,0,.45);z-index:1;pointer-events:none}
.video-item h3{margin:10px;font-size:14px;height:40px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.quality-options{display:flex;justify-content:space-around;padding:0 10px 10px;gap:5px}
.quality-btn{flex:1;padding:6px 0;background:var(--sec);color:var(--text);text-align:center;text-decoration:none;border-radius:4px;font-size:12px;transition:.2s;cursor:pointer}
.quality-btn:hover{background:var(--hover)}
.m3u-btn{margin-left:8px;padding:4px 12px;border:0;border-radius:4px;background:var(--primary-color);color:#fff;font-size:12px;cursor:pointer}
.m3u-btn:active{opacity:.8}
@media(max-width:600px){.header{height:150px}h1{font-size:20px}}
.player-mask{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:999;display:none;align-items:center;justify-content:center;padding:20px}
.player-mask.show{display:flex}
.player-dialog{background:#1a1a1a;border-radius:12px;padding:18px;width:100%;max-width:380px;max-height:80vh;overflow:auto}
.player-dialog h3{margin:0 0 12px;font-size:16px;color:var(--primary-color);text-align:center}
.player-list{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.player-item{padding:10px 6px;background:var(--sec);color:#fff;border:1px solid transparent;border-radius:6px;text-align:center;font-size:12px;cursor:pointer;transition:.15s}
.player-item:hover{background:var(--hover)}
.player-item.active{border-color:var(--primary-color);background:rgba(243,156,18,.15)}
.player-close{display:block;margin:14px auto 0;padding:6px 18px;background:var(--primary-color);border:0;border-radius:5px;color:#fff;cursor:pointer}
`;
                }
                function playerPickerHTML() {
                    return `<div id="player-mask" class="player-mask" onclick="if(event.target.id==='player-mask')closePlayerPicker()">
    <div class="player-dialog">
      <h3>选择默认播放器</h3>
      <div class="player-list" id="player-list"></div>
      <button class="player-close" onclick="closePlayerPicker()">关闭</button>
    </div>
  </div>`;
                }
                function playerJS() {
                    return `
const PLAYERS = {
  "默认浏览器": { scheme: "", needEncode: false, supportName: false },
  "Lenna":     { scheme: "lenna://x-callback-url/play?url=",      needEncode: true,  supportName: false },
  "SenPlayer": { scheme: "SenPlayer://x-callback-url/play?url=",  needEncode: true,  supportName: false },
  "SenPlayer-下载": { scheme: "SenPlayer://x-callback-url/download?url=", needEncode: true, supportName: true },
  "Infuse":    { scheme: "infuse://x-callback-url/play?url=",     needEncode: true,  supportName: false },
  "Fileball":  { scheme: "filebox://play?url=",                   needEncode: true,  supportName: false },
  "VidHub":    { scheme: "vidhub://x-callback-url/play?url=",     needEncode: true,  supportName: false },
  "IINA":      { scheme: "iina://weblink?url=",                   needEncode: true,  supportName: false },
  "NPlayer":   { scheme: "nplayer-",                              needEncode: false, supportName: false },
  "VLC":       { scheme: "vlc://",                                needEncode: false, supportName: false },
  "KMPlayer":  { scheme: "kmplayer://",                           needEncode: false, supportName: false },
  "Alook":     { scheme: "Alook://",                              needEncode: false, supportName: false },
  "Safari":    { scheme: "",                                      needEncode: false, supportName: false }
};
const PLAYER_KEY = 'kdf_player';
function getPlayer(){ return localStorage.getItem(PLAYER_KEY) || '默认浏览器'; }
function setPlayer(n){ localStorage.setItem(PLAYER_KEY, n); updatePlayerBtn(); }
function updatePlayerBtn(){ const b=document.getElementById('player-btn'); if(b) b.textContent='播放器: '+getPlayer(); }
function openPlayerPicker(){
  const list=document.getElementById('player-list'); const cur=getPlayer();
  list.innerHTML=Object.keys(PLAYERS).map(function(n){ return '<div class="player-item'+(n===cur?' active':'')+'" data-name="'+n+'">'+n+'</div>'; }).join('');
  list.querySelectorAll('.player-item').forEach(function(el){ el.addEventListener('click', function(){ setPlayer(el.getAttribute('data-name')); closePlayerPicker(); }); });
  document.getElementById('player-mask').classList.add('show');
}
function closePlayerPicker(){ document.getElementById('player-mask').classList.remove('show'); }
function buildPlayUrl(rawUrl, name){
  const p=PLAYERS[getPlayer()]||PLAYERS['默认浏览器'];
  if(!p.scheme) return rawUrl;
  let u=p.needEncode?encodeURIComponent(rawUrl):rawUrl;
  let link=p.scheme+u;
  if(p.supportName && name) link+='&name='+encodeURIComponent(name);
  return link;
}
function playWith(el){
  const raw=decodeURIComponent(el.getAttribute('data-url')||'');
  const name=el.getAttribute('data-name')||'';
  if(!raw){ alert('无播放地址'); return; }
  window.location.href=buildPlayUrl(raw,name);
}
document.addEventListener('DOMContentLoaded',updatePlayerBtn);
updatePlayerBtn();
`;
                }
            }).call(this);
        }
    });
})();
