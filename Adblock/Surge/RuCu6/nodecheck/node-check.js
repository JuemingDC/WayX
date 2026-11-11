/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
(function () {
    const __wayxHost = { request: typeof $request === 'undefined' ? undefined : $request, response: typeof $response === 'undefined' ? undefined : $response, done: $done, codecs: (function (legacy, native = {}) {
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
        })((undefined), { TextDecoder: typeof TextDecoder === 'undefined' ? undefined : TextDecoder }), http: typeof $httpClient === 'undefined' ? undefined : $httpClient, task: typeof $task === 'undefined' ? undefined : $task, environment: typeof $environment === 'undefined' ? undefined : $environment, global: globalThis };
    if ((__wayxHost.response === undefined ? 'request' : 'response') !== "request")
        throw new Error('Unregistered HTTP source/target declaration');
    const __wayxConfig = { "apiPlan": { "source": { "responseStatus": "status", "scriptStartTime": "date", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": true }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "node", "timeoutMs": 1, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": true } }, "notification": { "root": "$notification.post", "open": "openUrl", "media": "mediaUrl", "action": null, "openAction": null, "stringLink": true, "delay": true }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "typed" }, "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" }, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"] } };
    return (function (config, host, run) {
        const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
        const fail = message => { throw new TypeError('WayX API: ' + message); };
        const source = config.apiPlan.source;
        const target = config.apiPlan.target;
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
        const abLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
        const typed = Object.getPrototypeOf(Uint8Array.prototype);
        const get = name => Object.getOwnPropertyDescriptor(typed, name).get;
        const tag = Object.getOwnPropertyDescriptor(typed, Symbol.toStringTag).get;
        const bytes = value => {
            let length;
            try {
                length = abLength.call(value);
            }
            catch { }
            if (length !== undefined)
                return new Uint8Array(value, 0, length);
            if (ArrayBuffer.isView(value)) {
                const isTyped = tag.call(value) !== undefined, getter = name => isTyped ? get(name).call(value) : Object.getOwnPropertyDescriptor(DataView.prototype, name).get.call(value);
                return new Uint8Array(getter('buffer'), getter('byteOffset'), getter('byteLength'));
            }
            return fail('binary body requires BufferSource');
        };
        const binary = value => {
            if (ArrayBuffer.isView(value))
                return true;
            try {
                abLength.call(value);
                return true;
            }
            catch {
                return false;
            }
        };
        const status = value => {
            if (typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599)
                return value;
            const m = typeof value === 'string' && /^HTTP\/[\d.]+\s+(\d{3})(?:\s.*)?$/.exec(value);
            if (m)
                return status(Number(m[1]));
            return fail('invalid HTTP status');
        };
        const requestParts = value => typeof value === 'string' ? /^(https?):\/\/([^/?#]+)([^#]*)/i.exec(value) : null;
        const originalRequest = requestParts(host.request && host.request.url);
        const rawPath = parts => parts[3] ? (parts[3][0] === '?' ? '/' : '') + parts[3] : '/';
        function view(value, requestRole = false) {
            if (value === undefined)
                return undefined;
            const result = Object.assign({}, value);
            if (requestRole && false && originalRequest) {
                if (!own(result, 'scheme'))
                    result.scheme = originalRequest[1].toLowerCase();
                if (!own(result, 'path'))
                    result.path = rawPath(originalRequest);
            }
            if (value.headers !== undefined)
                result.headers = headers(value.headers);
            if (own(value, "status")) {
                result["status"] = status(value["status"]);
                ;
            }
            if (binary(value.bodyBytes) || binary(value.body)) {
                const valueBytes = value.body;
                if (valueBytes !== undefined) {
                    const b = bytes(valueBytes);
                    {
                        result.body = b;
                        delete result.bodyBytes;
                    }
                }
            }
            return result;
        }
        const request = view(host.request, true);
        const response = view(host.response);
        let completed = false;
        const finish = value => { completed = true; return host.done(value); };
        function message(value, synthetic) {
            if (!value || typeof value !== 'object' || Array.isArray(value))
                return fail('completion requires an object');
            const out = Object.assign({}, value);
            if (!synthetic && false && false && own(out, 'path')) {
                if (typeof out.path !== 'string' || !out.path.startsWith('/') || /[\r\n]/.test(out.path))
                    fail('QX request path must be an absolute request path');
                {
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
                out.status = status(out.status);
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
                out.body = bytes(out.body);
            }
            for (const key of ['h2_trailers', 'node', 'policy'])
                delete out[key];
            for (const key of Object.keys(out))
                if (!['url', 'headers', 'body', 'bodyBytes', 'status', 'abort', ...([]), ...([])].includes(key)) {
                    fail('unmapped completion field: ' + key);
                }
            ;
            ;
            return out;
        }
        function done(value) {
            if (completed)
                return;
            if (['task', 'network', 'generic'].includes("task"))
                return finish(value ?? {});
            if (value === undefined || value === null)
                return finish({});
            if (value === response || value === request) {
                const out = {};
                for (const k of ['url', 'headers', 'body', 'bodyBytes', 'h2_trailers', ...([]), "status"])
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
            else
                ;
            const out = message(payload, synthetic);
            if (synthetic) {
                ;
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
                    req["body"] = bytes(requestBody);
                else
                    req.body = requestBody;
            }
            const mapped = {};
            for (const semantic of ['redirect', 'cookie', 'tls'])
                mapped[target.http[semantic]] = own(options, http[semantic]) ? options[http[semantic]] : http.defaults[semantic];
            if (own(options, http.policy))
                mapped["policy"] = options[http.policy] === http.directPolicy ? "DIRECT" : options[http.policy];
            if (style === 'callback' && input['body-base64'] && true) {
                if (typeof input.body !== 'string')
                    fail('body-base64 requires a String body');
                const raw = host.codecs.atob(input.body), data = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++)
                    data[i] = raw.charCodeAt(i);
                delete req.body;
                req["body"] = data;
            }
            ;
            Object.assign(req, mapped);
            if (http.timeoutMs !== null && true && own(input, 'timeout'))
                req.timeout = input.timeout * http.timeoutMs / 1000;
            for (const key of ['binary-mode', 'body-base64', 'alpn'])
                if (style === 'callback' && own(input, key) && (key !== 'body-base64' || false) && (key !== 'alpn' || false))
                    req[key] = input[key];
            if (style === 'promise')
                req['binary-mode'] = true;
            return { req, verb };
        }
        const http = {};
        for (const method of config.apiPlan.methods)
            http[method] = (input, callback) => {
                if (typeof callback !== 'function')
                    return fail('HTTP callback required');
                const plan = transport(input, 'callback', method);
                {
                    const fn = host.http && host.http[method];
                    if (typeof fn !== 'function')
                        return fail('native HTTP method unavailable');
                    return fn.call(host.http, plan.req, (error, r, data) => {
                        if (error)
                            return callback(error, r, data);
                        if (!r)
                            return callback('HTTP transport returned no response', r, data);
                        const result = Object.assign({}, r, { headers: headers(r.headers || {}) });
                        result.status = status(r["status"]);
                        return callback(null, result, data);
                    });
                }
                return host.task.fetch(plan.req).then(r => {
                    if (!r)
                        return callback('HTTP transport returned no response', undefined, undefined);
                    return callback(null, { status: status(r.statusCode), headers: headers(r.headers || {}) }, input && input['binary-mode'] && own(r, 'bodyBytes') ? bytes(r.bodyBytes) : r.body);
                }, e => callback(e && e.error || e, undefined, undefined));
            };
        ;
        ;
        ;
        const environment = Object.assign({}, host.environment);
        const overlay = {
            $done: done,
            $httpClient: http,
            $environment: environment
        };
        return run.call(host.global, overlay);
    })(__wayxConfig, __wayxHost, function (__wayxScope) {
        return (function ($environment, $httpClient, $done) {
            return (function () {
                const SCRIPT_VERSION = "2026.07.17 12:50";
                const IP_API = "http://ip-api.com/json?lang=zh-CN";
                const CHECK_HOST = "https://check-host.net";
                const REQUEST_TIMEOUT = 10000;
                const RESULT_DELAY = 5500;
                const RESULT_RETRY_DELAY = 3500;
                const params = typeof $environment !== "undefined" && $environment.params ? $environment.params : {};
                const nodeName = params.node || "";
                const nodeInfo = params.nodeInfo || {};
                if (!nodeName) {
                    finishError("未获取到节点名称，请长按具体节点运行此脚本。");
                }
                else {
                    run();
                }
                async function run() {
                    try {
                        const [nodeRes, directRes, remoteRes] = await Promise.all([checkGeo(nodeName), checkGeo("DIRECT"), checkRemote(nodeInfo)]);
                        render(nodeRes, directRes, remoteRes);
                    }
                    catch (error) {
                        finishError(`执行异常: ${error.message}`);
                    }
                }
                async function checkGeo(node) {
                    try {
                        const data = await requestJson(IP_API, node);
                        if (data && data.status === "fail") {
                            return { ok: false, error: data.message || "IP 查询失败" };
                        }
                        return { ok: true, data };
                    }
                    catch (error) {
                        return { ok: false, error: error.message };
                    }
                }
                async function checkRemote(info) {
                    const address = info?.address ? String(info.address) : "";
                    const port = info?.port ? String(info.port) : "";
                    if (!address || !port) {
                        return { available: false, reachable: false, error: "未获取到节点底层 IP/端口，请对具体节点运行" };
                    }
                    const host = address.includes(":") && !address.startsWith("[") ? `[${address}]` : address;
                    const target = `${host}:${port}`;
                    const submitUrl = `${CHECK_HOST}/check-tcp?host=${encodeURIComponent(target)}&max_nodes=10`;
                    try {
                        const submission = await requestJson(submitUrl, "DIRECT");
                        if (!submission?.ok || !submission?.request_id) {
                            return { available: false, reachable: false, target, error: "远端探测任务提交失败或被限流" };
                        }
                        const requestId = submission.request_id;
                        const nodes = submission.nodes || {};
                        const names = Object.keys(nodes);
                        const countries = {};
                        names.forEach((name) => {
                            countries[name] = Array.isArray(nodes[name]) ? nodes[name][0] : "";
                        });
                        await wait(RESULT_DELAY);
                        let result = await getRemoteResult(requestId, names, countries);
                        if (!result.complete) {
                            await wait(RESULT_RETRY_DELAY);
                            result = await getRemoteResult(requestId, names, countries);
                        }
                        if (!result.complete && result.items.length === 0) {
                            return { available: false, reachable: false, target, error: "远端探测响应超时，暂未返回结果" };
                        }
                        return {
                            available: true,
                            reachable: result.reachable,
                            data: result.items,
                            target
                        };
                    }
                    catch (error) {
                        return { available: false, reachable: false, target, error: `不可用: ${error.message}` };
                    }
                }
                async function getRemoteResult(requestId, names, countries) {
                    const result = await requestJson(`${CHECK_HOST}/check-result/${requestId}`, "DIRECT");
                    let reachable = false;
                    let complete = false;
                    const items = names.map((name) => {
                        const records = result && result[name];
                        const record = Array.isArray(records) && records.length ? records[0] : null;
                        const seconds = record && Number(record.time);
                        if (record !== null)
                            complete = true;
                        if (Number.isFinite(seconds) && seconds >= 0)
                            reachable = true;
                        return {
                            flag: getFlag(countries[name]),
                            msStr: Number.isFinite(seconds) && seconds >= 0 ? formatMs(seconds * 1000) : "--.--ms"
                        };
                    });
                    return { reachable, complete, items };
                }
                function requestJson(url, node) {
                    return new Promise((resolve, reject) => {
                        const options = {
                            url,
                            headers: {
                                Accept: "application/json",
                                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 Loon Node Check"
                            }
                        };
                        if (node)
                            options.node = node;
                        let isSettled = false;
                        const timer = setTimeout(() => {
                            if (!isSettled) {
                                isSettled = true;
                                reject(new Error("请求超时"));
                            }
                        }, REQUEST_TIMEOUT);
                        $httpClient.get(options, (error, response, body) => {
                            if (isSettled)
                                return;
                            isSettled = true;
                            clearTimeout(timer);
                            if (error)
                                return reject(new Error(error));
                            const status = Number(response?.status);
                            if (status < 200 || status >= 300)
                                return reject(new Error(`HTTP ${status}`));
                            try {
                                resolve(JSON.parse(body));
                            }
                            catch (e) {
                                reject(new Error("JSON 格式解析失败"));
                            }
                        });
                    });
                }
                function wait(ms) {
                    return new Promise((resolve) => setTimeout(resolve, ms));
                }
                function formatMs(ms) {
                    if (ms >= 10000)
                        return `${Math.floor(ms)}ms`;
                    if (ms >= 1000)
                        return `${Math.floor(ms)
                            .toString()
                            .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}ms`;
                    if (ms >= 100)
                        return `${ms.toFixed(1)}ms`;
                    if (ms >= 10)
                        return `${ms.toFixed(2)}ms`;
                    if (ms <= 0)
                        return "0.00ms";
                    return `${ms.toFixed(3)}ms`;
                }
                function getFlag(countryCode) {
                    if (!countryCode || String(countryCode).length !== 2)
                        return "🌍";
                    const points = String(countryCode)
                        .toUpperCase()
                        .split("")
                        .map((char) => 127397 + char.charCodeAt());
                    return String.fromCodePoint(...points);
                }
                function escapeHtml(str) {
                    return String(str ?? "")
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;")
                        .replace(/"/g, "&quot;")
                        .replace(/'/g, "&#39;");
                }
                function render(node, direct, remote) {
                    const textParts = [];
                    const htmlParts = [];
                    let nodeText = `【节点代理】: ${node.ok ? "✅ 正常" : "❌ 不可达"}`;
                    let nodeHtml = `<b>节点代理</b>: ${node.ok ? "✅ 正常" : "❌ 不可达"}`;
                    if (node.ok && node.data) {
                        const d = node.data;
                        const loc = [d.country, d.regionName || d.region, d.city].filter(Boolean).join(" - ");
                        nodeText += `\n ├ IP: ${d.ip || d.query}\n ├ 位置: ${loc}\n └ ISP: ${d.isp || d.organization}`;
                        nodeHtml += `<br/><b>IP</b>: ${escapeHtml(d.ip || d.query)}`;
                        if (loc)
                            nodeHtml += `<br/><b>位置</b>: ${escapeHtml(loc)}`;
                        nodeHtml += `<br/><b>ISP</b>: ${escapeHtml(d.isp || d.organization)}`;
                    }
                    else if (node.error) {
                        nodeText += `\n └ ${node.error}`;
                        nodeHtml += `<br/><small style="color: gray;">${escapeHtml(node.error)}</small>`;
                    }
                    textParts.push(nodeText);
                    htmlParts.push(nodeHtml);
                    let directText = `【本机网络】: ${direct.ok ? "✅ 正常" : "❌ 异常"}`;
                    let directHtml = `<b>本机网络</b>: ${direct.ok ? "✅ 正常" : "❌ 异常"}`;
                    if (!direct.ok && direct.error) {
                        directText += `\n └ ${direct.error}`;
                        directHtml += `<br/><small style="color: gray;">${escapeHtml(direct.error)}</small>`;
                    }
                    textParts.push(directText);
                    htmlParts.push(directHtml);
                    let remoteText = "";
                    let remoteHtml = "";
                    if (!remote.available) {
                        remoteText = `【远端探测】: ⚠️ 未完成\n └ ${remote.error || "未知原因"}`;
                        remoteHtml = `<b>远端探测</b>: ⚠️ 未完成<br/><small style="color: gray;">${escapeHtml(remote.error)}</small>`;
                    }
                    else {
                        remoteText = `【远端探测】: ${remote.reachable ? "✅ 可达" : "❌ 不可达"}`;
                        remoteHtml = `<b>远端探测</b>: ${remote.reachable ? "✅ 可达" : "❌ 不可达"}`;
                        if (remote.data && remote.data.length > 0) {
                            remoteText += "\n";
                            for (let i = 0; i < remote.data.length; i += 2) {
                                const left = remote.data[i];
                                const right = remote.data[i + 1];
                                remoteHtml += `<br/>${left.flag} <code style="font-family: monospace;">${left.msStr}</code>`;
                                remoteText += ` ${left.flag} ${left.msStr}`;
                                if (right) {
                                    remoteHtml += `&emsp;&emsp;${right.flag} <code style="font-family: monospace;">${right.msStr}</code>`;
                                    const padding = left.msStr.length < 8 ? Array(10 - left.msStr.length).join(" ") : "  ";
                                    remoteText += `${padding}${right.flag} ${right.msStr}`;
                                }
                                remoteText += "\n";
                            }
                            remoteText = remoteText.trimEnd();
                        }
                    }
                    textParts.push(remoteText);
                    htmlParts.push(remoteHtml);
                    let conclusion = "";
                    if (!direct.ok) {
                        conclusion = "⚠️ 本机网络异常，无法连接外部网络";
                    }
                    else if (node.ok) {
                        conclusion = "✅ 当前节点一切正常，可顺利连通";
                    }
                    else if (remote.available && remote.reachable) {
                        conclusion = "🚫 疑似遭到运营商或 GFW 阻断\n(探测到海外服务器连通正常，但本机无法直连)";
                    }
                    else if (remote.available && !remote.reachable) {
                        conclusion = "💤 节点疑似已离线\n(探测到海外服务器与本机均无法连通)";
                    }
                    else {
                        conclusion = "❓ 数据不足，无法精确区分是阻断还是离线";
                    }
                    textParts.push(`【诊断结论】\n${conclusion}`);
                    htmlParts.push(`<b>📋 诊断结论</b><br/>${escapeHtml(conclusion).replace(/\n/g, "<br/>")}`);
                    const typeStr = nodeInfo.type ? ` · ${nodeInfo.type}` : "";
                    let targetText = `【当前节点】\n 📍 ${nodeName}${typeStr}`;
                    let targetHtml = `<b>节点</b>: <span style="color: #467fcf; font-weight: bold;">${escapeHtml(nodeName)}${escapeHtml(typeStr)}</span>`;
                    if (remote.target) {
                        targetText += `\n 🎯 探测目标: ${remote.target}`;
                        targetHtml += `<br/><small style="color: gray;">探测目标: ${escapeHtml(remote.target)}</small>`;
                    }
                    textParts.push(targetText);
                    htmlParts.push(targetHtml);
                    $done({
                        title: "🌐 节点阻断检测报告",
                        content: textParts.join("\n\n"),
                        htmlMessage: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: inherit; word-break: break-all;">${htmlParts.join("<br/><br/>")}</div>`
                    });
                }
                function finishError(message) {
                    $done({
                        title: "🌐 节点阻断检测",
                        content: `🛑 ${message}`,
                        htmlMessage: `<div style="font-family: -apple-system, sans-serif; font-size: 16px; color: inherit;"><b>🛑 ${escapeHtml(message)}</b></div>`
                    });
                }
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$environment") ? __wayxScope["$environment"] : (typeof $environment === 'undefined' ? undefined : $environment), Object.prototype.hasOwnProperty.call(__wayxScope, "$httpClient") ? __wayxScope["$httpClient"] : (typeof $httpClient === 'undefined' ? undefined : $httpClient), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
