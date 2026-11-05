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
    const __wayxContexts = { "response": { "qx": { "phase": "response", "binary": false, "responseBody": true, "name": "rrtv_json.js", "from": "qx", "to": "qx", "apiPlan": { "version": 1, "omitNotificationOptions": true, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"], "source": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": null, "media": null, "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" }, "target": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": null, "media": null, "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" } }, "runtimePolicyVersion": 5, "omittedParameters": ["undocumented-qx-parameters"] } } }, __wayxConfig = __wayxContexts[__wayxHost.response === undefined ? 'request' : 'response']?.[__wayxTarget];
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
                const scriptName = "RRTV";
                const magicJS = new MagicJS(scriptName, "INFO");
                const rrtv_tab_home = /.*\/v3plus\/index\/channel\?pageNum=1&position=CHANNEL_INDEX/;
                const rrtv_tab_my = /.*\/v3plus\/index\/channel\?pageNum=1&position=CHANNEL_MY/;
                const rrtv_tab_cfg = /.*\/app\/config\/h5NativeBar/;
                const rrtv_drama_detail = /.*\/drama\/detail\?/;
                const rrtv_user_info = /.*\/user\/personal/;
                const rrtv_level = /.*\/level\/info/;
                const rrtv_ad_getall = /.*\/ad\/getAll/;
                const rrtv_watch_v4 = /.*\/watch\/v4/;
                (() => {
                    let body = null;
                    if (magicJS.isResponse) {
                        switch (true) {
                            case rrtv_tab_home.test(magicJS.request.url):
                                try {
                                    let obj = JSON.parse(magicJS.response.body);
                                    for (i = 0; i < obj.data.sections.length; i++) {
                                        if (obj.data.sections[i].sectionType === "AD" ||
                                            obj.data.sections[i].sectionType === "SINGLE_IMAGE" ||
                                            obj.data.sections[i].sectionType === "SHORT_VIDEO") {
                                            delete obj.data.sections[i];
                                        }
                                    }
                                    body = JSON.stringify(obj);
                                }
                                catch (err) {
                                    magicJS.logError(`首页去广告出现异常：${err}`);
                                }
                                break;
                            case rrtv_tab_cfg.test(magicJS.request.url):
                                try {
                                    let obj = JSON.parse(magicJS.response.body);
                                    obj['data']['homeBarPage'] = [{
                                            "darkSelPag": "http://img.rr.tv/barSelpag/20210310/o_1615343956536.pag",
                                            "selPag": "http://img.rr.tv/barSelpag/20210310/o_1615343961034.pag",
                                            "pageType": 0,
                                            "darkUnselImg": "http://img.rr.tv/cover/20210310/o_1615343982560.png",
                                            "webUrl": "",
                                            "selImg": "http://img.rr.tv/cover/20210310/o_1615343977931.png",
                                            "unselImg": "http://img.rr.tv/cover/20210310/o_1615343979417.png",
                                            "name": "首页",
                                            "index": 1,
                                            "nativeAlias": "home",
                                            "darkSelImg": "http://img.rr.tv/cover/20210310/o_1615343985261.png"
                                        }, {
                                            "darkSelPag": "http://img.rr.tv/barSelpag/20210310/o_1615344101664.pag",
                                            "selPag": "http://img.rr.tv/barSelpag/20210310/o_1615344101761.pag",
                                            "pageType": 0,
                                            "darkUnselImg": "http://img.rr.tv/cover/20210310/o_1615344088886.png",
                                            "webUrl": "",
                                            "selImg": "http://img.rr.tv/cover/20210310/o_1615344085709.png",
                                            "unselImg": "http://img.rr.tv/cover/20210310/o_1615344087390.png",
                                            "name": "快看",
                                            "index": 2,
                                            "nativeAlias": "amwayVideo",
                                            "darkSelImg": "http://img.rr.tv/cover/20210310/o_1615344091229.png"
                                        }, {
                                            "darkSelPag": "http://img.rr.tv/barSelpag/20210310/o_1615344145409.pag",
                                            "selPag": "http://img.rr.tv/barSelpag/20210310/o_1615344143099.pag",
                                            "pageType": 0,
                                            "darkUnselImg": "http://img.rr.tv/img/img/20211013/o_ca5e3b6ce6b747e992789e55222445f2.png",
                                            "webUrl": "",
                                            "selImg": "http://img.rr.tv/img/img/20211013/o_14667f24618841a1906fbb2233b8869a.png",
                                            "unselImg": "http://img.rr.tv/img/img/20211013/o_963933dfc49b4c8bab6e3b36a8a2b42b.png",
                                            "name": "VIP",
                                            "index": 3,
                                            "nativeAlias": "vip",
                                            "darkSelImg": "http://img.rr.tv/img/img/20211013/o_ad54fb0336764d38910304488804f2a1.png"
                                        }, {
                                            "darkSelPag": "http://img.rr.tv/barSelpag/20210310/o_1615344154522.pag",
                                            "selPag": "http://img.rr.tv/barSelpag/20210310/o_1615344153652.pag",
                                            "pageType": 0,
                                            "darkUnselImg": "http://img.rr.tv/img/img/20211013/o_e35b6941e4a0429486cd5b535337544f.png",
                                            "webUrl": "",
                                            "selImg": "http://img.rr.tv/img/img/20211013/o_2e5efef7fd654e3ea8a60e3e719e6e8c.png",
                                            "unselImg": "http://img.rr.tv/img/img/20211013/o_7492019b1603486383733b7154e967b3.png",
                                            "name": "我的",
                                            "index": 4,
                                            "nativeAlias": "my",
                                            "darkSelImg": "http://img.rr.tv/img/img/20211013/o_f98a74489e3d4dc9bf8651eea65b949e.png"
                                        }];
                                    body = JSON.stringify(obj);
                                }
                                catch (err) {
                                    magicJS.logError(`广场去广告出现异常：${err}`);
                                }
                                break;
                            case rrtv_tab_my.test(magicJS.request.url):
                                try {
                                    let obj = JSON.parse(magicJS.response.body);
                                    obj['data']['sections'] = [{
                                            "id": 2541,
                                            "sectionType": "MAGIC_CUBE",
                                            "displayTitle": "1",
                                            "startTime": null,
                                            "position": 23,
                                            "display": "SCROLL",
                                            "moreText": "",
                                            "sectionContents": [{
                                                    "feeMode": null,
                                                    "pictureHeight": null,
                                                    "targetId": "rrspjump://webview?url=http%3A%2F%2Fmobile.rr.tv%2FappWeb%2F%23%2FbugList",
                                                    "id": 34,
                                                    "pictureWidth": null,
                                                    "title": "帮助反馈",
                                                    "targetType": "H5",
                                                    "sectionId": 2541,
                                                    "orderNum": 1,
                                                    "subTitle": null,
                                                    "icon": "http://img.rr.tv/cover/20210201/o_1612169512400.png"
                                                }, {
                                                    "feeMode": null,
                                                    "pictureHeight": null,
                                                    "targetId": "rrspjump://webview?url=http%3A%2F%2Fmobile.rr.tv%2Fmission%2F%23%2Fachievement%2Fcenter",
                                                    "id": 35,
                                                    "pictureWidth": null,
                                                    "title": "成就中心",
                                                    "targetType": "H5",
                                                    "sectionId": 2541,
                                                    "orderNum": 2,
                                                    "subTitle": null,
                                                    "icon": "http://img.rr.tv/cover/20210201/o_1612169790308.png"
                                                },],
                                            "endTime": null,
                                            "targetType": null,
                                            "sequence": 3,
                                            "name": "其他",
                                            "targetId": "rrspjump://empty"
                                        }];
                                    body = JSON.stringify(obj);
                                }
                                catch (err) {
                                    magicJS.logError(`商城去广告出现异常：${err}`);
                                }
                                break;
                            case rrtv_ad_getall.test(magicJS.request.url):
                                try {
                                    let obj = JSON.parse(magicJS.response.body);
                                    obj.data.adList = [];
                                    body = JSON.stringify(obj);
                                }
                                catch (err) {
                                    magicJS.logError(`ad_getall去广告出现异常：${err}`);
                                }
                                break;
                            case rrtv_drama_detail.test(magicJS.request.url):
                                try {
                                    body = magicJS.response.body.replace(/currentQuality":"\w+/g, 'currentQuality":"AI_OD').replace(/canPlay":false/g, 'canPlay":true').replace(/canShowVip":true/g, 'canShowVip":false').replace(/externalAds":true/g, 'externalAds":false');
                                }
                                catch (err) {
                                    magicJS.logError(`drama去广告出现异常：${err}`);
                                }
                                break;
                            case rrtv_watch_v4.test(magicJS.request.url):
                                try {
                                    body = magicJS.response.body.replace(/currentQuality":"\w+/g, 'currentQuality":"AI_OD').replace(/canPlay":false/g, 'canPlay":true').replace(/canShowVip":true/g, 'canShowVip":false').replace(/externalAds":true/g, 'externalAds":false');
                                }
                                catch (err) {
                                    magicJS.logError(`watch_4去广告出现异常：${err}`);
                                }
                                break;
                            case rrtv_user_info.test(magicJS.request.url):
                                try {
                                    let obj = JSON.parse(magicJS.response.body);
                                    obj.data.user.medalList = [{
                                            "name": "大魔王",
                                            "endTime": "2099-02-22 02:44:53",
                                            "imgUrl": "http://img.rr.tv/cover/20200424/o_1587720799676.png",
                                            "id": 1
                                        }];
                                    obj.data.user.privilegeList = [{
                                            "id": null,
                                            "createTimeStr": "",
                                            "createTime": null,
                                            "updateTime": null,
                                            "effectObject": "video",
                                            "action": "play",
                                            "function": "originalPainting",
                                            "func": "originalPainting",
                                            "description": "解锁原画",
                                            "icon": "jiesuoyuanhua",
                                            "endTime": 9999987654321
                                        }, {
                                            "id": null,
                                            "createTimeStr": "",
                                            "createTime": null,
                                            "updateTime": null,
                                            "effectObject": "mall",
                                            "action": "sale",
                                            "function": "mallDiscount",
                                            "func": "mallDiscount",
                                            "description": "龙醇商城九折",
                                            "icon": "longchunshangcheng",
                                            "endTime": 9999987654321
                                        }, {
                                            "id": null,
                                            "createTimeStr": "",
                                            "createTime": null,
                                            "updateTime": null,
                                            "effectObject": "article",
                                            "action": "write",
                                            "function": "highLight",
                                            "func": "highLight",
                                            "description": "高亮发帖",
                                            "icon": "gaoliangfatie",
                                            "endTime": 9999987654321
                                        }, {
                                            "id": null,
                                            "createTimeStr": "",
                                            "createTime": null,
                                            "updateTime": null,
                                            "effectObject": "nickName",
                                            "action": "show",
                                            "function": "nameHighLight",
                                            "func": "nameHighLight",
                                            "description": "高亮昵称",
                                            "icon": "gaoliangnicheng",
                                            "endTime": 9999987654321
                                        }, {
                                            "id": null,
                                            "createTimeStr": "",
                                            "createTime": null,
                                            "updateTime": null,
                                            "effectObject": "comment",
                                            "action": "write",
                                            "function": "highLight",
                                            "func": "highLight",
                                            "description": "高亮评论回复",
                                            "icon": "huifu",
                                            "endTime": 9999987654321
                                        }, {
                                            "id": null,
                                            "createTimeStr": "",
                                            "createTime": null,
                                            "updateTime": null,
                                            "effectObject": "danmu",
                                            "action": "send",
                                            "function": "superBarrageBlue",
                                            "func": "superBarrageBlue",
                                            "description": "超级弹幕",
                                            "icon": "chaojidanmu",
                                            "endTime": 9999987654321
                                        }, {
                                            "id": null,
                                            "createTimeStr": "",
                                            "createTime": null,
                                            "updateTime": null,
                                            "effectObject": "video",
                                            "action": "play",
                                            "function": "vipVideo",
                                            "func": "vipVideo",
                                            "description": "勋章专享剧集",
                                            "icon": "zhuanxiangjuji",
                                            "endTime": 9999987654321
                                        }, {
                                            "id": null,
                                            "createTimeStr": "",
                                            "createTime": null,
                                            "updateTime": null,
                                            "effectObject": "growth",
                                            "action": "play",
                                            "function": "0.4",
                                            "func": "0.4",
                                            "description": "看剧经验+40%",
                                            "icon": "jingyanzhijiacheng",
                                            "endTime": 9999987654321
                                        }, {
                                            "id": null,
                                            "createTimeStr": "",
                                            "createTime": null,
                                            "updateTime": null,
                                            "effectObject": "video",
                                            "action": "play",
                                            "function": "noLimit",
                                            "func": "noLimit",
                                            "description": "看剧无限制",
                                            "icon": "kanjuwuxianzhi",
                                            "endTime": 9999987654321
                                        }, {
                                            "id": null,
                                            "createTimeStr": "",
                                            "createTime": null,
                                            "updateTime": null,
                                            "effectObject": "video",
                                            "action": "play",
                                            "function": "noAd",
                                            "func": "noAd",
                                            "description": "看剧无广告",
                                            "icon": "kanjuwuguanggao",
                                            "endTime": 9999987654321
                                        }];
                                    obj.data.user.vipMedal = {
                                        "name": "大魔王",
                                        "endTime": "2099-02-22 02:44:53",
                                        "imgUrl": "http://img.rr.tv/cover/20200424/o_1587720799676.png",
                                        "id": 1,
                                        "isExpired": false
                                    };
                                    obj.data.user.vipInfo = { "level": "1", "expiredTime": 4000000000000, "valid": true };
                                    body = JSON.stringify(obj);
                                }
                                catch (err) {
                                    magicJS.logError(`pro去广告出现异常：${err}`);
                                }
                                break;
                            case rrtv_level.test(magicJS.request.url):
                                try {
                                    let obj = JSON.parse(magicJS.response.body);
                                    obj.data = {
                                        "level": "1",
                                        "expiredTime": 4000000000000,
                                        "valid": true
                                    };
                                    body = JSON.stringify(obj);
                                }
                                catch (err) {
                                    magicJS.logError(`rrtv_level出现异常：${err}`);
                                }
                                break;
                            default:
                                magicJS.logWarning("触发意外的请求处理，请确认脚本或复写配置正常。");
                                break;
                        }
                    }
                    else {
                        magicJS.logWarning("触发意外的请求处理，请确认脚本或复写配置正常。");
                    }
                    if (body) {
                        magicJS.done({ body });
                    }
                    else {
                        magicJS.done();
                    }
                })();
                function MagicJS(e = "MagicJS", t = "INFO") { function s() { _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", this.encode = function (e) { var t, s, o, i, r, n, a, c = "", h = 0; for (e = _utf8_encode(e); h < e.length;)
                    i = (t = e.charCodeAt(h++)) >> 2, r = (3 & t) << 4 | (s = e.charCodeAt(h++)) >> 4, n = (15 & s) << 2 | (o = e.charCodeAt(h++)) >> 6, a = 63 & o, isNaN(s) ? n = a = 64 : isNaN(o) && (a = 64), c = c + _keyStr.charAt(i) + _keyStr.charAt(r) + _keyStr.charAt(n) + _keyStr.charAt(a); return c; }, this.decode = function (e) { var t, s, o, i, r, n, a = "", c = 0; for (e = e.replace(/[^A-Za-z0-9\+\/\=]/g, ""); c < e.length;)
                    t = _keyStr.indexOf(e.charAt(c++)) << 2 | (i = _keyStr.indexOf(e.charAt(c++))) >> 4, s = (15 & i) << 4 | (r = _keyStr.indexOf(e.charAt(c++))) >> 2, o = (3 & r) << 6 | (n = _keyStr.indexOf(e.charAt(c++))), a += String.fromCharCode(t), 64 != r && (a += String.fromCharCode(s)), 64 != n && (a += String.fromCharCode(o)); return a = _utf8_decode(a); }, _utf8_encode = function (e) { e = e.replace(/\r\n/g, "\n"); for (var t = "", s = 0; s < e.length; s++) {
                    var o = e.charCodeAt(s);
                    o < 128 ? t += String.fromCharCode(o) : o > 127 && o < 2048 ? (t += String.fromCharCode(o >> 6 | 192), t += String.fromCharCode(63 & o | 128)) : (t += String.fromCharCode(o >> 12 | 224), t += String.fromCharCode(o >> 6 & 63 | 128), t += String.fromCharCode(63 & o | 128));
                } return t; }, _utf8_decode = function (e) { for (var t = "", s = 0, o = c1 = c2 = 0; s < e.length;)
                    (o = e.charCodeAt(s)) < 128 ? (t += String.fromCharCode(o), s++) : o > 191 && o < 224 ? (c2 = e.charCodeAt(s + 1), t += String.fromCharCode((31 & o) << 6 | 63 & c2), s += 2) : (c2 = e.charCodeAt(s + 1), c3 = e.charCodeAt(s + 2), t += String.fromCharCode((15 & o) << 12 | (63 & c2) << 6 | 63 & c3), s += 3); return t; }; } return new class {
                    constructor() { if (this.version = "2.2.3.1", this.scriptName = e, this.logLevels = { DEBUG: 5, INFO: 4, NOTIFY: 3, WARNING: 2, ERROR: 1, CRITICAL: 0, NONE: -1 }, this.isLoon = "undefined" != typeof $loon, this.isQuanX = "undefined" != typeof $task, this.isJSBox = "undefined" != typeof $drive, this.isNode = "undefined" != typeof module && !this.isJSBox, this.isSurge = "undefined" != typeof $httpClient && !this.isLoon, this.node = { request: void 0, fs: void 0, data: {} }, this.iOSUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 13_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.5 Mobile/15E148 Safari/604.1", this.pcUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36 Edg/84.0.522.59", this.logLevel = t, this._barkUrl = "", this.b64codecs = new s, this.isNode) {
                        this.node.fs = require("fs"), this.node.request = require("request");
                        try {
                            this.node.fs.accessSync("./magic.json", this.node.fs.constants.R_OK | this.node.fs.constants.W_OK);
                        }
                        catch (e) {
                            this.node.fs.writeFileSync("./magic.json", "{}", { encoding: "utf8" });
                        }
                        this.node.data = require("./magic.json");
                    }
                    else
                        this.isJSBox && ($file.exists("drive://MagicJS") || $file.mkdir("drive://MagicJS"), $file.exists("drive://MagicJS/magic.json") || $file.write({ data: $data({ string: "{}" }), path: "drive://MagicJS/magic.json" })); }
                    set barkUrl(e) { this._barkUrl = e.replace(/\/+$/g, ""); }
                    set logLevel(e) { this._logLevel = "string" == typeof e ? e.toUpperCase() : "DEBUG"; }
                    get logLevel() { return this._logLevel; }
                    get isRequest() { return "undefined" != typeof $request && "undefined" == typeof $response; }
                    get isResponse() { return "undefined" != typeof $response; }
                    get request() { return "undefined" != typeof $request ? $request : void 0; }
                    get response() { return "undefined" != typeof $response ? ($response.hasOwnProperty("status") && ($response.statusCode = $response.status), $response.hasOwnProperty("statusCode") && ($response.status = $response.statusCode), $response) : void 0; }
                    get platform() { return this.isSurge ? "Surge" : this.isQuanX ? "Quantumult X" : this.isLoon ? "Loon" : this.isJSBox ? "JSBox" : this.isNode ? "Node.js" : "unknown"; }
                    read(e, t = "") { let s = ""; this.isSurge || this.isLoon ? s = $persistentStore.read(e) : this.isQuanX ? s = $prefs.valueForKey(e) : this.isNode ? s = this.node.data : this.isJSBox && (s = $file.read("drive://MagicJS/magic.json").string); try {
                        this.isNode && (s = s[e]), this.isJSBox && (s = JSON.parse(s)[e]), t && ("string" == typeof s && (s = JSON.parse(s)), s = s && "object" == typeof s ? s[t] : null);
                    }
                    catch (o) {
                        this.logError(o), s = t ? {} : null, this.del(e);
                    } void 0 === s && (s = null); try {
                        s && "string" == typeof s && (s = JSON.parse(s));
                    }
                    catch (e) { } return this.logDebug(`READ DATA [${e}]${t ? `[${t}]` : ""}(${typeof s})\n${JSON.stringify(s)}`), s; }
                    write(e, t, s = "") { let o = s ? {} : ""; if (s && (this.isSurge || this.isLoon) ? o = $persistentStore.read(e) : s && this.isQuanX ? o = $prefs.valueForKey(e) : this.isNode ? o = this.node.data : this.isJSBox && (o = JSON.parse($file.read("drive://MagicJS/magic.json").string)), s) {
                        try {
                            "string" == typeof o && (o = JSON.parse(o)), o = "object" == typeof o && o ? o : {};
                        }
                        catch (t) {
                            this.logError(t), this.del(e), o = {};
                        }
                        this.isJSBox || this.isNode ? (o.hasOwnProperty(e) && "object" == typeof o[e] || (o[e] = {}), o[e].hasOwnProperty(s) || (o[e][s] = null), void 0 === t ? delete o[e][s] : o[e][s] = t) : void 0 === t ? delete o[s] : o[s] = t;
                    }
                    else
                        this.isNode || this.isJSBox ? void 0 === t ? delete o[e] : o[e] = t : o = void 0 === t ? null : t; "object" == typeof o && (o = JSON.stringify(o)), this.isSurge || this.isLoon ? $persistentStore.write(o, e) : this.isQuanX ? $prefs.setValueForKey(o, e) : this.isNode ? this.node.fs.writeFileSync("./magic.json", o) : this.isJSBox && $file.write({ data: $data({ string: o }), path: "drive://MagicJS/magic.json" }), this.logDebug(`WRITE DATA [${e}]${s ? `[${s}]` : ""}(${typeof t})\n${JSON.stringify(t)}`); }
                    del(e, t = "") { this.logDebug(`DELETE KEY [${e}]${t ? `[${t}]` : ""}`), this.write(e, null, t); }
                    notify(e = this.scriptName, t = "", s = "", o = "") { this.logNotify(`title:${e}\nsubTitle:${t}\nbody:${s}\noptions:${"object" == typeof o ? JSON.stringify(o) : o}`); if (o = (e => { let t = {}; return "string" == typeof e ? this.isLoon ? t = { openUrl: e } : this.isQuanX && (t = { "open-url": e }) : "object" == typeof e && (this.isLoon ? (t.openUrl = e["open-url"] ? e["open-url"] : "", t.mediaUrl = e["media-url"] ? e["media-url"] : "") : this.isQuanX && (t = e["open-url"] || e["media-url"] ? e : {})), t; })(o), 1 == arguments.length && (e = this.scriptName, t = "", s = arguments[0]), this.isSurge)
                        $notification.post(e, t, s);
                    else if (this.isLoon)
                        o ? $notification.post(e, t, s, o) : $notification.post(e, t, s);
                    else if (this.isQuanX)
                        $notify(e, t, s, o);
                    else if (this.isNode) {
                        if (this._barkUrl) {
                            let o = encodeURI(`${e}/${t}\n${s}`);
                            this.get(`${this._barkUrl}/${o}`, () => { });
                        }
                    }
                    else if (this.isJSBox) {
                        let o = { title: e, body: t ? `${t}\n${s}` : s };
                        $push.schedule(o);
                    } }
                    log(e, t = "INFO") { this.logLevels[this._logLevel] < this.logLevels[t.toUpperCase()] || console.log(`[${t}] [${this.scriptName}]\n${e}\n`); }
                    logDebug(e) { this.log(e, "DEBUG"); }
                    logInfo(e) { this.log(e, "INFO"); }
                    logNotify(e) { this.log(e, "NOTIFY"); }
                    logWarning(e) { this.log(e, "WARNING"); }
                    logError(e) { this.log(e, "ERROR"); }
                    adapterHttpOptions(e, t) { let s = "object" == typeof e ? Object.assign({}, e) : { url: e, headers: {} }; s.hasOwnProperty("header") && !s.hasOwnProperty("headers") && (s.headers = s.header, delete s.header); const o = { accept: "Accept", "accept-ch": "Accept-CH", "accept-charset": "Accept-Charset", "accept-features": "Accept-Features", "accept-encoding": "Accept-Encoding", "accept-language": "Accept-Language", "accept-ranges": "Accept-Ranges", "access-control-allow-credentials": "Access-Control-Allow-Credentials", "access-control-allow-origin": "Access-Control-Allow-Origin", "access-control-allow-methods": "Access-Control-Allow-Methods", "access-control-allow-headers": "Access-Control-Allow-Headers", "access-control-max-age": "Access-Control-Max-Age", "access-control-expose-headers": "Access-Control-Expose-Headers", "access-control-request-method": "Access-Control-Request-Method", "access-control-request-headers": "Access-Control-Request-Headers", age: "Age", allow: "Allow", alternates: "Alternates", authorization: "Authorization", "cache-control": "Cache-Control", connection: "Connection", "content-encoding": "Content-Encoding", "content-language": "Content-Language", "content-length": "Content-Length", "content-location": "Content-Location", "content-md5": "Content-MD5", "content-range": "Content-Range", "content-security-policy": "Content-Security-Policy", "content-type": "Content-Type", cookie: "Cookie", dnt: "DNT", date: "Date", etag: "ETag", expect: "Expect", expires: "Expires", from: "From", host: "Host", "if-match": "If-Match", "if-modified-since": "If-Modified-Since", "if-none-match": "If-None-Match", "if-range": "If-Range", "if-unmodified-since": "If-Unmodified-Since", "last-event-id": "Last-Event-ID", "last-modified": "Last-Modified", link: "Link", location: "Location", "max-forwards": "Max-Forwards", negotiate: "Negotiate", origin: "Origin", pragma: "Pragma", "proxy-authenticate": "Proxy-Authenticate", "proxy-authorization": "Proxy-Authorization", range: "Range", referer: "Referer", "retry-after": "Retry-After", "sec-websocket-extensions": "Sec-Websocket-Extensions", "sec-websocket-key": "Sec-Websocket-Key", "sec-websocket-origin": "Sec-Websocket-Origin", "sec-websocket-protocol": "Sec-Websocket-Protocol", "sec-websocket-version": "Sec-Websocket-Version", server: "Server", "set-cookie": "Set-Cookie", "set-cookie2": "Set-Cookie2", "strict-transport-security": "Strict-Transport-Security", tcn: "TCN", te: "TE", trailer: "Trailer", "transfer-encoding": "Transfer-Encoding", upgrade: "Upgrade", "user-agent": "User-Agent", "variant-vary": "Variant-Vary", vary: "Vary", via: "Via", warning: "Warning", "www-authenticate": "WWW-Authenticate", "x-content-duration": "X-Content-Duration", "x-content-security-policy": "X-Content-Security-Policy", "x-dnsprefetch-control": "X-DNSPrefetch-Control", "x-frame-options": "X-Frame-Options", "x-requested-with": "X-Requested-With", "x-surge-skip-scripting": "X-Surge-Skip-Scripting" }; if ("object" == typeof s.headers)
                        for (let e in s.headers)
                            o[e] && (s.headers[o[e]] = s.headers[e], delete s.headers[e]); s.headers && "object" == typeof s.headers && s.headers["User-Agent"] || (s.headers && "object" == typeof s.headers || (s.headers = {}), this.isNode ? s.headers["User-Agent"] = this.pcUserAgent : s.headers["User-Agent"] = this.iOSUserAgent); let i = !1; if (("object" == typeof s.opts && (!0 === s.opts.hints || !0 === s.opts["Skip-Scripting"]) || "object" == typeof s.headers && !0 === s.headers["X-Surge-Skip-Scripting"]) && (i = !0), i || (this.isSurge ? s.headers["X-Surge-Skip-Scripting"] = !1 : this.isLoon ? s.headers["X-Requested-With"] = "XMLHttpRequest" : this.isQuanX && ("object" != typeof s.opts && (s.opts = {}), s.opts.hints = !1)), this.isSurge && !i || delete s.headers["X-Surge-Skip-Scripting"], !this.isQuanX && s.hasOwnProperty("opts") && delete s.opts, this.isQuanX && s.hasOwnProperty("opts") && delete s.opts["Skip-Scripting"], "GET" === t && !this.isNode && s.body) {
                        let e = Object.keys(s.body).map(e => void 0 === s.body ? "" : `${encodeURIComponent(e)}=${encodeURIComponent(s.body[e])}`).join("&");
                        s.url.indexOf("?") < 0 && (s.url += "?"), s.url.lastIndexOf("&") + 1 != s.url.length && s.url.lastIndexOf("?") + 1 != s.url.length && (s.url += "&"), s.url += e, delete s.body;
                    } return this.isQuanX ? (s.hasOwnProperty("body") && "string" != typeof s.body && (s.body = JSON.stringify(s.body)), s.method = t) : this.isNode ? (delete s.headers["Accept-Encoding"], "object" == typeof s.body && ("GET" === t ? (s.qs = s.body, delete s.body) : "POST" === t && (s.json = !0, s.body = s.body))) : this.isJSBox && (s.header = s.headers, delete s.headers), s; }
                    get(e, t) { let s = this.adapterHttpOptions(e, "GET"); if (this.logDebug(`HTTP GET: ${JSON.stringify(s)}`), this.isSurge || this.isLoon)
                        $httpClient.get(s, t);
                    else if (this.isQuanX)
                        $task.fetch(s).then(e => { e.status = e.statusCode, t(null, e, e.body); }, e => t(e.error, null, null));
                    else {
                        if (this.isNode)
                            return this.node.request.get(s, t);
                        this.isJSBox && (s.handler = (e => { let s = e.error ? JSON.stringify(e.error) : void 0, o = "object" == typeof e.data ? JSON.stringify(e.data) : e.data; t(s, e.response, o); }), $http.get(s));
                    } }
                    post(e, t) { let s = this.adapterHttpOptions(e, "POST"); if (this.logDebug(`HTTP POST: ${JSON.stringify(s)}`), this.isSurge || this.isLoon)
                        $httpClient.post(s, t);
                    else if (this.isQuanX)
                        $task.fetch(s).then(e => { e.status = e.statusCode, t(null, e, e.body); }, e => { t(e.error, null, null); });
                    else {
                        if (this.isNode)
                            return this.node.request.post(s, t);
                        this.isJSBox && (s.handler = (e => { let s = e.error ? JSON.stringify(e.error) : void 0, o = "object" == typeof e.data ? JSON.stringify(e.data) : e.data; t(s, e.response, o); }), $http.post(s));
                    } }
                    done(e = {}) { "undefined" != typeof $done && $done(e); }
                    b64encode(e) { return this.b64codecs.encode(e); }
                    b64decode(e) { return this.b64codecs.decode(e); }
                    isToday(e) { if (null == e)
                        return !1; {
                        let t = new Date;
                        return "string" == typeof e && (e = new Date(e)), t.getFullYear() == e.getFullYear() && t.getMonth() == e.getMonth() && t.getDay() == e.getDay();
                    } }
                    isNumber(e) { return "NaN" !== parseFloat(e).toString(); }
                    attempt(e, t = null) { return e.then(e => [null, e]).catch(e => (this.logError(e), [e, t])); }
                    retry(e, t = 5, s = 0, o = null) { return (...i) => new Promise((r, n) => { (function i(...a) { Promise.resolve().then(() => e.apply(this, a)).then(e => { "function" == typeof o ? Promise.resolve().then(() => o(e)).then(() => { r(e); }).catch(e => { this.logError(e), t >= 1 && s > 0 ? setTimeout(() => i.apply(this, a), s) : t >= 1 ? i.apply(this, a) : n(e), t--; }) : r(e); }).catch(e => { this.logError(e), t >= 1 && s > 0 ? setTimeout(() => i.apply(this, a), s) : t >= 1 ? i.apply(this, a) : n(e), t--; }); }).apply(this, i); }); }
                    formatTime(e, t = "yyyy-MM-dd hh:mm:ss") { var s = { "M+": e.getMonth() + 1, "d+": e.getDate(), "h+": e.getHours(), "m+": e.getMinutes(), "s+": e.getSeconds(), "q+": Math.floor((e.getMonth() + 3) / 3), S: e.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (e.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in s)
                        new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? s[e] : ("00" + s[e]).substr(("" + s[e]).length))); return t; }
                    now() { return this.formatTime(new Date, "yyyy-MM-dd hh:mm:ss"); }
                    today() { return this.formatTime(new Date, "yyyy-MM-dd"); }
                    sleep(e) { return new Promise(t => setTimeout(t, e)); }
                }(e); }
            }).call(this);
        }
    });
})();
