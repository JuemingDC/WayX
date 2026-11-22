/* SPDX-License-Identifier: GPL-3.0-only */
(function () {
    if ((typeof $response === 'undefined' ? 'request' : 'response') !== "response")
        throw new Error('Unregistered HTTP source/target declaration');
    const __wayxDone = $done;
    let __wayxCompleted = false;
    const __wayxBinary = value => { if (ArrayBuffer.isView(value))
        return true; try {
        Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get.call(value);
        return true;
    }
    catch {
        return false;
    } };
    const __wayxBytes = value => { let length; try {
        length = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get.call(value);
    }
    catch { } if (length !== undefined)
        return new Uint8Array(value, 0, length); if (ArrayBuffer.isView(value)) {
        const proto = Object.getPrototypeOf(Uint8Array.prototype), typed = Object.getOwnPropertyDescriptor(proto, Symbol.toStringTag).get.call(value) !== undefined, get = name => Object.getOwnPropertyDescriptor(typed ? proto : DataView.prototype, name).get.call(value);
        return new Uint8Array(get('buffer'), get('byteOffset'), get('byteLength'));
    } throw new TypeError('WayX API: binary body requires BufferSource'); };
    const __wayxDecodeText = (value, body) => (function (value, data, decoder) {
        const headers = value.headers || {};
        const header = name => headers[Object.keys(headers).find(key => key.toLowerCase() === name)];
        const type = String(header('content-type') || '');
        const charset = /;\s*charset\s*=\s*["']?([^;"'\s]+)/i.exec(type)?.[1];
        if (charset && !/^utf-?8$/i.test(charset))
            return data;
        if (type && !/^(?:text\/|application\/(?:[\w.+-]+\+)?(?:json|xml)(?:\s*;|\s*$))/i.test(type.trim()))
            return data;
        const encoding = header('content-encoding');
        if (encoding && !/^identity$/i.test(String(encoding).trim()))
            return data;
        return new decoder('utf-8', { fatal: true }).decode(data);
    })(value, body, (function (legacy, native = {}) {
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
    })(undefined, { TextDecoder: globalThis.TextDecoder }).TextDecoder);
    const __wayxView = (value, phase) => { if (value === undefined)
        return undefined; const result = Object.assign({}, value); if (typeof value.body !== 'string') {
        const data = __wayxBinary(value.bodyBytes) ? value.bodyBytes : value.body;
        if (__wayxBinary(data)) {
            const body = __wayxBytes(data);
            result.body = (typeof $response === 'undefined' ? 'request' : 'response') === phase && ["response"].includes(phase) ? __wayxDecodeText(value, body) : body;
        }
    } delete result.bodyBytes; return result; };
    return (function (nativeDone, run) {
        let attempted = false, nativeFailed = false, nativeError;
        const done = value => {
            if (attempted)
                return;
            attempted = true;
            try {
                return nativeDone(value);
            }
            catch (error) {
                nativeFailed = true;
                nativeError = error;
                throw error;
            }
        };
        const recover = error => {
            if (nativeFailed && error === nativeError)
                throw error;
            try {
                if (typeof console !== 'undefined' && typeof console.log === 'function')
                    console.log('[WayX] HTTP script failed; ' + (attempted ? 'completion already submitted' : 'passing through unchanged'), error);
            }
            catch { }
            if (!attempted)
                return done({});
        };
        try {
            const result = run(done);
            return result && typeof result.then === 'function' ? Promise.resolve(result).catch(recover) : result;
        }
        catch (error) {
            return recover(error);
        }
    })(__wayxDone, __wayxGuardDone => (function ($request, $response, $done) {
        return (function () {
            let obj = JSON.parse($response.body);
            delete obj.data.homeNewsAdv.jumpValue;
            delete obj.data.homeDineInAdv;
            delete obj.data.homePickupAdv;
            delete obj.data.nearbyShopInfo;
            delete obj.data.homeEventThemesAdv;
            delete obj.data.eventThemes;
            delete obj.data.homeRootAdv;
            delete obj.data.homeTopAdv;
            delete obj.data.homeDialogAdv;
            delete obj.data.homeBannerAdv;
            delete obj.data.homeCouponAdv;
            delete obj.data.homeCompanyAdv;
            delete obj.data.homeDeliveryAdv;
            $done({ body: JSON.stringify(obj) });
        }).call(this);
    }).call(globalThis, undefined, __wayxView(typeof $response === 'undefined' ? undefined : $response, 'response'), value => {
        if (__wayxCompleted)
            return;
        const result = value == null ? {} : Object.assign({}, value);
        if (__wayxBinary(result.body)) {
            const data = __wayxBytes(result.body);
            result.bodyBytes = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
            delete result.body;
        }
        __wayxCompleted = true;
        return __wayxGuardDone(result);
    }));
})();
