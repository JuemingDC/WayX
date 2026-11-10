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
        })((function () {
            const Object = new Proxy(globalThis.Object, { get: (target, key) => key === 'hasOwn' ? (target.hasOwn || ((value, property) => globalThis.Object.prototype.hasOwnProperty.call(value, property))) : Reflect.get(target, key) });
            var __wayxProvider = (() => { var o2 = Object.create; var BA = Object.defineProperty; var w2 = Object.getOwnPropertyDescriptor; var g2 = Object.getOwnPropertyNames; var n2 = Object.getPrototypeOf, _2 = Object.prototype.hasOwnProperty; var YA = A => { throw TypeError(A); }; var RA = (A, B) => () => (B || A((B = { exports: {} }).exports, B), B.exports), OA = (A, B) => { for (var e in B)
                BA(A, e, { get: B[e], enumerable: !0 }); }, SA = (A, B, e, Q) => { if (B && typeof B == "object" || typeof B == "function")
                for (let t of g2(B))
                    !_2.call(A, t) && t !== e && BA(A, t, { get: () => B[t], enumerable: !(Q = w2(B, t)) || Q.enumerable }); return A; }; var r2 = (A, B, e) => (e = A != null ? o2(n2(A)) : {}, SA(B || !A || !A.__esModule ? BA(e, "default", { value: A, enumerable: !0 }) : e, A)), s2 = A => SA(BA({}, "__esModule", { value: !0 }), A); var _A = (A, B, e) => B.has(A) || YA("Cannot " + e); var u = (A, B, e) => (_A(A, B, "read from private field"), e ? e.call(A) : B.get(A)), L = (A, B, e) => B.has(A) ? YA("Cannot add the same private member more than once") : B instanceof WeakSet ? B.add(A) : B.set(A, e), v = (A, B, e, Q) => (_A(A, B, "write to private field"), Q ? Q.call(A, e) : B.set(A, e), e), jA = (A, B, e) => (_A(A, B, "access private method"), e); var u1 = RA((T3, O2) => { O2.exports = { $C: [6, 1040, 1, -21, 26, 20], $c: [6, 1072, 1, 27, 26, -28], $1: [17, 913, 7, 1], $2: [17, 945, 7, 1], $3: ["AAEJAwf7Bw_3DwfEAQsDB_sLD_cPD9QO-A4H3RL0EgklAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"], $4: [1, 9490, 1, -2, 1, 8, 1, -2, 1, -4, 1, -2, 1, -8, 1, -2, 2, 16, 2, 1, 2, 3, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1], $5: ["Bv7FA_74_tr-Ev4mAP8AAAAAAAAAAA"], $6: ["$5", 1, 9661, 1, -2], $7: [2, 12541, 2, -98, 1, -156, 1, 7897, 3, -7897, 1, 244], $8: ["E9UxzELB4htgpd4feI7ZJNwBAQEfAf8B_wH_Af8B_wH_Af8B_wEAAAD_"], $9: [1, 26142, 4, 2, 1, 1, 4, 2, 1, 1, 1, 1], $j: ["ipErP1Ps8XWWMAFJ4rgaAwI1HDv3D_k4cuHcHicp0VFf43EZOCAtKIYJGRokBhxNIB4qMI3tHlWG0gtGG_5HAI0TWEcHAQVAFZtpbqgTMYcTOjErvTAqSgAWUBIyTyZ-JwRT9krRHiX4Z3qSTmo8MH-xFCXNJO8FQPEBuGAlBhEMOhMaPFSWbUBCikNUq4NJTTraLApjAfFoHCnoaimC5yYVIij5CTwiyhSCyCw_DwEgXCVj9FfpAM2rPLIMZfFgRQsMDO407TAD_gQzJhVhbRIZAfwKcC5ocSwVFbV-Cwr_8ssh9gIq1PnvAAABAAAAAAAAAAABAP8BAAAAAAAAAQAAAAABAAAAAAEAAAAAAACnWgAAAAECAAAAAKMAXgABAAAAAAAAAgAa5gABAAAAAQCdYwAAAAACAAAAAAEAAAAAAf8BAAAAAQABAQAAAQEAAAAAAAAAAACUbAAAAAAAAZJuAAH_AQAAkm-RbwABAAAAAAAAAQEAAAAAAQAAAAAAAAAAAQAAAAABAAABAAAAAAEAAAAAiXcAAQABh3kAAAAAAAH_AQAAAAAAAAEAAQAAAACEfdsmAAAAAQ", 3, 32999, "lIZ_NRU0zrJ-KhNa6DV79Fl84mAcRy5Ra54FEbOQbwDl7RwkQS0WIELTXCtwAx1jrKtUAEF2R-4RsvwGDgD1ACAJ-S8F-xEK9-ctP88Abu8B9latCvJR-9ks9eAd5G3mTCEXGTgTAklJTHMRgwcHCQEBAwENxAD7BHGvigKY_BwhCURv-sHrt3mBfwEAgIABf4MAAAAAAQEAe4kAAAAAAQABAAB1i3UAjgACAAAAAABwkAEAAQABAG2UbACWAGqXAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAABomAAAAQD_aJn_AQAAAAAAAAABAAABZAGcAAEAAAAAAAABAGIAn2GfAQAAAQAAAAABAQBdpAA"], jis0208: [3, 12288, "DAHsHgAD4ZkAF4tnlaRb_wAxzwAAADEA0P8B_wAA", "$7", "Ffr-LCHGNsn-8gACAOoACgAlAR0BIADfAAAj3SEAAAAAAN8AMQDPAAAA", 10, -53078, "CwGjJR8lQrsBRwC2FQ39b4EAz-Ee2wAj_QIDFYb_AAEAAP8j3QAjAAAABADaIAAB3gAAAAAAAAAAAQ", "$6", "O9Z__QABfyAQ8QAAAA8", 0, 11, 1, -3596, -2, 2, 122, 2, -6, 1, -90, 1, -2, 0, 8, 2, -3, "4u8BKwL_IgABAA", 0, 11, "IIRs7wRZ8BcAriLfF_UAIgAB_wAAAAAAAAAAAAAA", 0, 7, "KwQ-_fy1AJQh_wYAAPoA4A", 0, 4, 1, 9528, 0, 15, 10, 55584, 0, 7, 26, 7, 0, 6, 26, 6, 0, 4, 83, -53018, 0, 11, 86, 13, 0, 8, "$1", 0, 8, "$2", 0, 38, "$C", 0, 15, "$c", 0, 13, "$3", 0, 438, 20, -3223, 10, -788, 0, 1, "ScoNKsoO2zIaBbUY_Ace8DMAAAAAAAAAAAAAAAAAAAA", 3, 96, 2, -17, 1, 52, 1, -36, 0, 8, "e6EB9rZTM_0A8RLu", 5, 4482, 2, -120, "OUT-_tUOyQLiCIp6_p918wAyAQAA7wAAAAAAAAAAAAAAAA", 0, 190, "nHnsO4BaDM0rUqYzWTZDx3g_Tp2Tec8pNKp4bVvPh4gX0StTjbB-xcGVJEJPq6hEnCwH1S9govG0lCCKsUHTSlSeUiTAWQ850g4tEPCwlfn1YqMRLkwj_hoZ3Pj4SDQNL1oP55NH7QQlhuxdVoFoKfHrGPwgqcO8dbKyTrmmXLzU1HlArtIQM7o1MWyF5bxpBIzE-B764FqIJ9se2IsdE29BMYBKylR5hUR7acF0WsXI-r9NUp3K0zQ2GlvfPS_8jNY1lNXhtdz05IhGag-v6vegffC_JaMXCtdm52PRLE4ZBbH0Ku-1FBmVZrdWyjB9SikpKHJ345JLdn49Z89rOSMoR-Gp10DBBE3B9U7I-mt_MO8-ac1tQb1oByRJxvjbOe4vU5ECDlPMV5z_YlEZLN09ixo0ELM7MMlbzj90A3zODdeC-4K2R7AuN5iX6bXw1PxMyc8ATIQKUzZWURIq0ntOy8mJtDPPJLwkHkmlMWbuKa_OzPniK3NivCCXBBwxN80OE56Pu6ULQpYGKXtDWhyGboGmQxQDynStamfKJ_Ohf8dMuazINxQY3tjMQf0Qwm1U7x_yjBPcou9sQR-1T0IDqAxiKsuRTMG6y3txTSFLnAo8q_ia0JRRZQHIGpz_vNGIm8JUUMQrLUP8gpIIklBrTWXwtWFRwLM7HdVo-aeoAxe2TVemLXc1tREsgUm4bXVkESvrBC9wlIpyN1kR42eAc1-JoukNOAY51qsaCKSzTQIA7gQwda56hF3MXWvA1l1VEuQgHLE58XUAKgEIDAJFqOkdVwKV7E9T69KxghPGMEMeYrYnfX4Z9kw7jX7uErLf2Zf_TWDc2K5UnL5S_MgWAQmkokNRyftccz2sqAtp9k8G8-DsSN_9-ZRY4BqFKI9nkCgThCG4gPtSMg7ZvKDFECHwAPBBCIcxAtLQUta9UEyxH6I7gjpaApYcdCgVGZ6XYzzYp0-OWdkf2-_i5O1C7D4WuypDZ_XGLbdF-n6pDFMugeVaCZKc4Y3I75ARBNq9ZMpbE8eq9HTzeUTzyPlV_bzYl33Wkoy5exAMaaZ5-ensPw5dOGBOj5-rgP16OgD08FwU_QfmyyYcBdIYzWra1zJp_DIiMhlEm0gt_HrHUNrWCDFVAQ-AChYcYDn5SkDOk8ZAsHizdTOTyj7FbZRU5NKgJBJFUmPtqwGiOpon-RS5hlnNqvvNvKeot5M-Yh9PSxDMIeiJ9FmR7w6yQjbocXHEZqDr3M0y4KeexiVzWZsNXkf2MndF3WQz01i0eDxodgcMndmOTUVIcFaDifbgcsiUXPS441ObNZR0SbiUEEYgoavkR5HIwycZNhKN5w9PKf1b7ZhkYe1Asunr4I7RywwsUIvfcKynFrc3RozuJ75FdbmkE5K2jimudqnQ-4bjWHPqEu1XnJeb_t9J_mVEur358PcP3_01UPy0KKtF6ScsUg0qtMQYkzUDdzYgEXZf8KLHCvwlYdgU7y9yG7BQwgaiTbhA3qnvgn4W7HjRJrapCbEuj0jSzv2UXRftBTmX2uT1hrcrtGDfkYGow-jT74pqY_010c_Y7Reso1jidNo_GCi4Fntiudxux0GascLlWF72TTw3rkN7xJKUiLByU9nzmS6ZrA8S_DONCnYKhBoxcLUrHeO6ARkgWdUjjvX7UXrFbMlXwqa1UESlEYvQbOIgWlic2TAphjY44sbjQYIZaaLNmRXMkxF-3zYiUEdAmxufhbZHALAvmRsAxI5_Ume9Qiak-13q5VBVfXhQCAEIaQVVjw4EVrDqjwQgSAcjfBWGy4BO4-lAXzlbo2OK7zCVkVw_tL0TlSscFx7tfMXBF5mD-3H9FTg_2F1ll1UVjDhi9O1xvO9UuUVnEMIJ7h-IVmYi-nP4dVuJ_KjTURi8C9mK4ICaoqzceEGFZT6HTK_L-v-PcO-WqimyBkFxdh4OIhC7up0Jt6k4WZC0biFIooKLVdYpVI_REbsHds5lQmEGMQUyktrPq1GoPYX1fR0VMNGUcavwraXoLjSqVH0jTKFsrLvil5kMgSDyN1F0vwYvhPe0ca49im57Yln_8Muht3x9SV3Ry5xVlFU86z2LlTyPbvocQl4TxkggaGIglHvRu4jxLk2zLSxvXdGgHWzHXyaC_jXj8SqeNrP9MRzPXRp9BFYBU_5cfrX-f0eIt4gjwiwGJb7GjVYVJqBDYO1N2LjFD2gmu3sRGw_p6S8Xz6NfDppL78zE5w4TTz7JqpBrKYT1vMf2RGHSF6Kw0iv72RXMhmu3hmsEyrdD30yUEp4CQwp5Qw9F4OzWj0pibXMf6oNjKrL3EaB9VZoq6Mrw7e-wVLYsRy1bUP8HDDYEYL6s40kr8EDSRTTOTDL0IIg8Oa4Q8f5cDVu5xsvs1BpcwE_0cogerV9e3ENnknlRPwG6EIGIBMnFh-N2bujpNIGPXMBK6kkU5ZMlU4UjLG0VkpxXckvYqKOqXuzEpkbcfrT2ggvDEqTcRg4DvG9XUUSEv2kgHE2SIDVIPR6QelDj5_85xD79SByobabciuLfkZwgckT16sSxdnG9MJxAPj-nsUZH6Kviao2f6jD5jDT__d_Y0PigDRjNWqnbdYJ3F0knbCiEld6QRgZ81Ga6413OpHSqNdZyiZJ-j5ZNZ-g3xuqon1Yz8r0rQWOTjJ8leF1jofF-ylLBJCFUszEExMRZYw0m6E_XFG_7eFSd_0dRIDIPQwP-PWCUMNiXQ9F4IvcAlivTWIqEntEK_YOavjIFein1QcjzCwlctgKn9Ac29QuY9n-UMQ4PTjFaJjdXG-jc6Vsk7RnAVV2WiLIVq_TZg9RZ9leeJc3m0T11RTpa4cecrnRJIdAWUU9y3wh-A3kur9PYGM6374XljfEcvK4MjkK_U86xhIm5hcKAhR4o1Kq4TpDFBhlJ7zWL8uQMT5Ui2e9qW_f9ES43_kbPGbTEF1OIf-1uI7_rmPLt8Ji5Ou2JrmVkAkEFNfRyAfqyFgCgTWbxQuUUjxXkVrPARc7An3gqxA4K9intHFIlXyuyVUOQ3orXd-8lgg0qJWTtvg_5Zj1m7Oq8vxoBoqjcTSsAeetyqjsm1FwD9DWWLzHkQ_fl--JG8qstBQ0Bw958LyxgpG_YUFzThKyOTCFRYXg2U6ajiJzj9SqDr3Rtrch0rh3K34X_7CNl7_UMBFDJqVA_k6ofz7iRK2cTphbKB0o6ZdtamHlfAC_G_8fvKUn-wkNFjacnafy6t0IIfRhRVNHct185m8eB6Y1-biE9YhaZKHM0OD7wyatTGlQ81JbWulv_yiIPlrlhFkvRF435xZRQfX9rdMi5PX8g0Rl4cQlf16svOdIYURPBsDctnLPBtKMecak51AxA6hdTUv45bBq11npRyQsXOPiy1FjfFQ8XH1srKvV44lHryPNdlJoAZXRmtAG_joj9V4syvrPtC-q9hksJgTL-35_c3eR5SwfXzuXkon5rZg_tbXIzGu97RvgUU1MKSDzk8HF_GOi_UUdaHarnX7YaraEWGVUthkLzkPODDrhI_j17Szmpc5iMZ2-Q0BegW_VyZ4d79Sx1V72o4IHaez_Wv2SBmPWwFHOcBR4WQjGeZlR0gF1WZR37l1a8ofSKp4ZZyJy6pLX-sJiaSvYh2JwD2dci4VMy0IwkqQD5HoTCsUZjzsiHctC0erXQnM4ZIv4hH8YabY0yqt2Thtp1SH-3n-haF4xzEqBQ8Fcvw8Q0PWxLirojRdssBgPas-bhX3mB5VXoWV18XuwR6hWVEvtDglHEI7dabE8RJvNVsCi3VpYpJytGqiGq5zpiImpuyodiqVKlooI1WWz-MwRitEF4s0fA4FeVLoVRVCv5CGGViZZggj4TjMpDzaKLJPkGgUSSJfS1en40CBUsY7U4LEKBjIg5EmQX1aRSmfATfMyCniXwBqajVl7k-FlCyc5Rpv53WlWml30YvU4HBTy-DQL2N_T_9-YDC_cf_hnN7w79-f4tEuUAHscaDNMDBQMCLQLQ5wEAAAEGAwABAgQBAAUDBwUABAQAAwQEAwUAw_sACSkQ6NYKFiLqCf8atQIBAAIDBjnVEwURAAABvf8IFQ8QB71K3dQqCe3o_xYaF736GgchwfhCBu0WugIGBAcAAgQAAQcCBB7qBgII2wgBI8crAgjU6v4GAQECAwIDAAkDAQEAAAILBAADCwILuw0HCdwIAAYAAwMFAQAIDAoUAAG-EBfOCwUg5wrcAQQNDgwdtwX7AQAAAAMBAwMBAQAe7QEABAEEAwYAAQEHAAEAAAAEA8w2AwEH78kNBhADDAEEBgoDALUBOs0CAAYBAQAAAQEAAzbLAgUDBQEHBQUOAfbFAQf7BwIECAQLDAQCCQfTLO3REB8MwAT-CgQCBAADCAUCDwAEAgEFAQHEAQ0vAMsY7wD-NNPjAwsCCwEAFgUGv063FgEt0ekpCg0Cw0fLGwH41jDy2gECCvcAAAv4AwECAAADAAIBAAACAgIBAAMAAQMAAAUBAQEDAQEBAgABAgEGAQIEBAEAAAEBAunMBggBFgMB5SMOCQIAALcABAIBAQICAAECAAEEBP4AAgEAAvQNAQAJBOIfA-IqAQIBAQEJAgGzAgEIAgcAAgcHAwQGCAMB2CAUvQABEwIg7u83tQgmBQq-AAABBAEHBAEFAgUAAAQEBgABAv8B6A3hCQEFAAELGAQDBd0KIrMAAAEAAQEp1wACAAAAAgMEAwABAAADAgUCBgAFCQEBAwsDBAIBtAMLCgPzCgMK9RTUAgUGNtIGAAkFAAICBQEFAQIEAsM-vAIDAB8BBAsMCwAAuBAlzyXWCzUGuBwnywAHF_Ir-Ov3JebsFuorvwIxBfUPAsM18dYBAv8EAhzkAgYAAQEAAAIBAQECBgcFAgEAAQEEAAMEAAEDCgXlDQy3EAILJ9LoGwEDCwMLAt3nAgAAAQEAAwIBAgQDAAEBBgEIAAEFAAX6CQkCAQICAwMCAgSzAgALAQ8ABQAKBQgADLgCAwECAwICAQEDAwIHBAoM-AADAwQDBQQCB68AAQQBAAYFAAEIAgoEEgABBr1NswEAAQABAAEAAAEAAQABAgACAgAAAgAAAQAAAAEBAQEAAQIBAAABAQABAwEAAQAHAQICAgEAAAADAAAAAQABAQUAAwEABAEB5hoDAQIBAQO1AAEBBAoNHQMPswECAiQXDAHV_BL06gE62B3cLbYIAQECBgEFAAIABQgIBRmzAQQCCAAACgUIBBIJ9c8HBe0AARbtBAECBAMBBQMDAiHhBgAB7BgGBQcHvAUQGA3FBj_CERfUCfohJbIDAhACAQATAQIW1TPg2P4BCQcCAAMEGhHgJcgwCNvw6AIDCQQEAQMJAgIGAwgFAQUIzAEF4wABAAMBAAIBAgEAAAIBAgABAQMC9goAAAIEAAEHBgADAQADAQAIAQAAAAACAAoC0-MBAAIKAAYCAwUD_gYCAQMBBwABAwvdMsEsEt0UzTu4BQQCAQEFDgEGF88q9tUXG9op-QTPCwcq2AwIBAMLAwL2CsACCgsJAh8AAu_ZBAHuBQgHBQQHAQcHDAQIuAIBBwgHExq__QEHAQHyEgELDAAEAQECAQIEAQIDAQEBAAX7vQECAgwDBQUCBQsTAcEGAhIMBf7cGeA3B8ANChEDCBe4DgYEAgIBAQcH4DMBB7kBEAQACPAfAucfAAXIAQYFAQEyBLoBAQEAAAEBAAEDAAEBAQAAAAIAAAEDAAABAAMAAAABAQIAAgEBAAMAAAQCAQEAAAEBAQEDAwEBAwACAAAAAgAFAQEBAgG3AAAAAwEFAQADAwIEAwAGBQMFCgcGAsMBQcoHAgYNAgIHD-8IzfMAAAYFAQAEAgICAQIBBAAIAAICAAQEAQMEAQQBAQEGtwAEBgAEGeclCQUHAeQPDvnF_T3EAwcFCQQHBQMJCAECAAPeJsMACAImCc0EAhoV_vLn9ffzIgXx6wEABwYBAgMAAQACAAMDBAMBBgTYMAEBAAAGAQYAzhUHFcgCAgMBARADAgIDCwEAAeraEAEB_ijwAQ8M5wUFxwMCAAgBAAEFAAIEAAQBAPoIAgD0FQECAQECAQADBQIBAwACAAMGtwMaAuAoBQP72gIEBwMAAwkDAAQAAAMBAAkEDPoPsQIBAP0FAwEZ6QH3DQADAAAAAQEB9wwABgLdJwEEAgEAAwMAAQABAwUDAAMEA7YICSAECAO_AQIBDQMEBx8Dvw0w2RjWNckS-AABCAMpvgsAEx7LAwEHAgUb5y0DAbUJAyXcAgEBAQEEBgISAQEGBAQABgj9swUGIhYHBdEC4wIGBwAACgMFFgrbG_nONc0A_EH_yijcHRXZJOYqziDEBQMBCwECBgIBAgcDAQIDAAYECcMCBwYBBAEKFcYn4AgBBgYJBQUCBgkJ4voFAQkM6QEJ1x3XAA0EAwQBBRoCAgcBB9EGAw8CCMIDAAQGAwAAAQAAAAICAwEIAwMCCQEABgMAAwAFAwMEthET8QUHGQcD1-sRACYE4hvIEPsG5iD4KPb4FtYG6AEDIvXiPQyxAQEAAjrIBAMDAAAAAQECAQAFBAwBAQMFCAAEAgABAA7N-AABCQgFFQPb5gsFKwADvwcBAwIPEfcXAgrY3xwEBiG7AwQAAQMDBgIHCA0JBAAD5QDaDPkCB_ABAAABAwMAAQIBAQMCAgMBAAAO9wH_AwHuFgQCAAABAdUyAQAFAQECAgAEAgIC-7sCAgQEBQMJCgMGBAwCykG2DAAOBQUCAvAHGN4C5ynv80Dm2Tbf5gYEBQcgBAi8EizHN8H9AzQG5fMw1jDl994WJQjW4g4DMMQ59AbYB-kDCAM7twsGK-UKAOIp7_7tAQQBDQvSEPAJ_woPDgMBAA76_dcFAiXeBQEHBOIlAxe2DwQBAgIP_A4ADwK_BwMOAQgBGsw0Cvr38v4NywMBDwUFCgUBBgMK1wkDDAUWBbMq_QMF--_0IvUA3EHcCBsJtTDjGRoHugIuELkDAQAACwYBAgUABgABAgkEAwfvFuAnAMsDDwECDQHNAAEFBQEBAgAAAwYBCQECAQQCAQgCAgQHAdIS1AwDCAQJAwggyBPZIiXFIgL93wAWBhXY8QEj-RXEEAsCAwUFDwIC0gUSBAkR__ICFrgLBggDHAAMzQ_aAAkCAQH2DQACAgMAAQcFCQYAAQkBAAEJALkVBxcCAQvMDS_sAcoDDf8JEggIAOTyAwriJCm3AgICCQEP6CMAARnPG84BAgcGAAEI5zcQAeYcuAgeAtolDvbVCRkJAhIAAb8DCAU4uDMQxQwIChMH69gGCQEEBREHzf8EAQQBAgEAAQEEAQIAAgUABAgGAgICAAMCAQIEAgYEAbEAAgIFAgUBAAMEAQAB6SwDAQoBAAYEvkS7_QMFDAMLBQMXwRr_7Qb7DhjSJe4UIwO5Ag0BBOkV9SPmNMw1zOYBBA8FBSPALyCwEw0BFs8TNMIe4f8s5xb2B9gj8AvbBxgBBSAGzPEA9wMAEhAZAwq9GfzjFxUAGgfGBhnWAhAIAwcDBM0WN9jx60fDBhoQyQsdGL77AwgZDhHOGNwMHggFBAnQHg_NAAsKFAXG-gIBAQgDAgECBAAH_wYAAgQPAgYAAAbx0vUB_zwFCbgO-wIDBQABAgMABAEDBAUFAQQABQIDAgYDyAEJAQESAO4SCAHfHBX-1xAHDb0FCg4EFgEDyQIICwEMAAETAAkFAMkUBwrfEt0bAQYBAwQa5CWwEgQhyAAC_gMKCgMFBgMBAwIGCAYBBQK6K9MDFAYEAw0OBwYC1uQVEBu2AQACAQsDEwYJEAQAAQcBxwXnAB4Y1gIBDgILAQMEDAPBR88GHAEKuwgEAQgCAAQCAwAJBQAHCcFN2wcT98YENuEh9d8HNrEATu77AOQFCgk", 0, 43, "DAMEFAYEBQICEwEpAuUeh_qAX-8AAAAAAAAAAAAAAD7CNN3v", 3, 15, "og0CAhf-9gH7FAYO8RcRUNUqAfnvLhEGCOLtBiDdFg-BuwruCQL1CPUTADQN6xX63xbZKgcC0fAh9DwDu1H69xH7FQsHGeou_RYA6A4TBwYH9QoK-xP3ABP-_gUGGPwE_gMAEfkHDZVwAAMRAVWz_AUBAQEADQH7TgAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAC_gAAAAAAAAAAAAEAAAAAAP8AAQAA_wABAAAAF-kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAACnXAAAAAAX7AAAAAAAAAAAA", 3, 6, "s_0A_QQHBwMRBHSTAwIECAUGCPkYAgMEBRX0BgAR9RUJ9AkL_Q8G_d4WCBb-BAAO-AsLCQYEAgbyEgECAAwBL9QC_gUECAsBAQQHBf7RMQOIhwoEqWL7ChMJBf4IAQUMTsYFHPH_-QQMBjsC6wAO8Qfy8zBA5RjQEQX4IegE9Q0L9UDaFewGFwPfAhbhGf0bDAAoBOjw_gznVgYi6OEt6BAA4PopO-Yu2hTbAhkFD80GJd0gMeoZ5BcH7z_iHuf-Hd1UAY5UAfsFMvjKPP0b-QkV8_oVCAf9DfkEAfwHBQIBAxYKBv4EBP4CAQUE_bBUCRAAFewEDhlWx9gdCQkMEvAFBRICDf0ANssMJw0DVK5A6CRPkeo7CzPlCw4j3Pz1Fg39BQH-DPYH-g8K_lEAAAAAAAAAAAA1ywAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA9AMMAAAAAAAAAAABGugAAAAABACLeAAAAAAAAAAAAAAAA-wUA_gIAAAb6AAAAAAAAAAAAACkavRML4gAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQD_AAAAAAEAAAAAAAAAAAAAAAAA_wEAAAAAAAAAAAAAAAAAAAAAAAAB_wH_AAH_AQAb5QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH_AQAAAAAAAAD-AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH_AAEAAAAAAAAAE-0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", 3, 1, "AgcFCop-BgAEBQWTgvr9C_0J_QYE_A4IG8BM9w4TIfOwSwBK-fEK7BAlK9zrACsHLyEBDPb6JfMOAuwjABD-ChudWQsHBAH6EAMEAAkDBgIBAg_xBQIiEQoDAQr7EwH7-wYFBAX8EQEABAUMAQUPAAcEBwT8_iH6AfMTAhIEAgYPD_oF-g34CBEPE_zynl0gCQFEwvv1Ag33_v4zBfv8IAYCEPz9H_oOAQ7SJgQMAwX-AwQPBgIVDv73CRoADP78DQj8CgIB4i0AA0HCICAABQf-Bgz5_AAG_gYAAgQB_AMDBQQFU_6uBQQSAwoIBgMB4CEEAAEHCwUDC_78Cv0I9Rb6_gcHBA4ZJOgT-OvVSyE-uPYY5CLp-RX66Cof5igM5-r7BhXfIN0p_u0nC1mbFukW-gD6FONV1ify4DvMCO4idMfw7wAI8wUIHdn1GwA49un-IvT87wcIBAEuA1kAAAAP8QAAAAAAId8AAAAAAAAAAAAAAAD2AAoAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAA_wEAAAAAAAAAAAAAAAAAAAAK9gAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAD_AQDyDgAAAAD9AwAAAAAAAAAAAAAAAAH_AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAABAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD_AQAAAAEAAP8AAf8AAQD_AAEAAAAAAAAAAAAAAAAAAAA", 3, -32, "awj69Qvt_fUhI_zwJOcF7wYZAh39_i3Q-gLzEK1TGPwSA_kK_f4BAQcAA_4HBgICCAMBAQANDA8E9wQHEwUG9BMAAj2uEEL56RMvxg3zE-_99wTTLULhAjXaBeYFWu0OzjJG9_Eqyizr-RUVtf1UKtYFHOUII81RHdEMEg_m-RDmVwcG19tq_RED3jMd9_IB8xzpLvUh1gDKNgs8yf39BwX8GgPoHv4HCAAB_gES_A3-9woF_hQFCQAGEAMLCwsC-gIHBQj9BgAPgJf493fBAP3nMvQE9xz-BgIA9gINEgQF-voTBCP3D_T9B_MdAwVepgIGBAEXBgcHABD1EPYK9v4OFwH4CQAk5jjS7SH-GvrjMTfEN8Y1ziv5_gQLyhT3ILSBJ-IWDOQbZHctCRMHH-8d5gj95yoKukDqGVR98ILIPc9JA7oqwAYS7WDb8dILQdPmDjgB7wj9pLL95Bvy6CnvyjrIG9Yw_P4j6Ef7Ie4BEeoPGeES3QfjhmIO-_geKQkZGOMK7vj0HatszibWHgeuYe8wx2XDQc4a9gzh7-lt_BLjHQDzf6MH_vX6-DHyDcovDxAJEOMXAxrtGP6kXLRY-wUGCPoGAwEWAAUAA_4JCvwIBQUAAwL-AQMECQQHCwz-B_vOSQoABgj-OvYMBxcKDOYZ4ukKHv0zLOHpGe0X0AIM-yAT6RA0Lej0EfrgG_3e-VYv0PUe3zQGTqBzG_SqER7RDSXx7Rvp8jTeCvAUAz5Av-pY7N7kR79K1tEj9hPV2h0aSSftMO0b6fEU7SEAuRUc3KHPOp8LBUCyPr1CmXHU447z_Qj-7uuXeRT52zUCMKNM7_0CFAzjNPUW5wMY_OwtAe4W7w3uHP5ZqPoGEA3zHhE1-BxBugv6-jDrEfsv8x78S-8y3fvpCRUia4gQEgMq4QQT9gr5EQv6DQb8BQ0CCgwE_gMBCAACAAUEDBsJA_4FCgMLBBH4EAL9CQMP_QAX_RcH8hH5Bhb6-fsYDwCIfhL9Bwf8Bf5N6hrsBCQI78NiabXSOQca6R_55xoMBvIGCwcMEggiBAQc7gIDAQQD_QAG_gz-AQYB_gf9CgcFDwcI_P4R6hMO-gIDAQr9DwDsFf74EQUCB_0e8A_xB_oD9Bv8BwYJ-h8A_ATuCfcAFwH7FQdhAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHuIAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAv4AAAAAAAAAAf8AAQAA_wABAAAB_wAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAH_AAAAAAAAAf8AAAAAAAAAAAAAAAAAAB7iAP4CAAH_AAAAAf8BAAAAAAAAAAAAABDwAAAAAAAAAAAAACbaAAAAAAAAAAAAAAAAAAAC_wD_Av8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAMNAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_4AAAAAAAAAAAAAAAAAAAAAAAAAAv4AAAAAAf8AAf8B_wEA_wH_AAAAAQAA_wAB_wAAAQAAAAD_AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADyDgAAAAAB_wAAAAAAAAEA_wL-AAAB_wH_Af8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAc5AAAAAAAAAAAAAAAAAEb5AEAMNAAAAv1LdMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADPOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEb5QAAAAAAAAAAAAAAAAAAAAAC_gABAP8AAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAB_gAAAf8B_wH_AQD_AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEA_wEAAP8BAP8BAAAAAAAAAAAAAAAAAAAAAAAAAAH_AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA3iMAAAAAAAAAAAAAACvVAAAAAAAAAAAAAAAAAAAAAQAAAP8BAAAAAAAAAAAAAAAAAAAAAAAAAP8BAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf8AAAABAAAAAA", 3, -8, -1, 1, 15, 1, -5, 1, 10, 2, 11, 1, -3, 1, 21, 1, -5, 2, 8, 3, 5, 1, -4, 1, 4, -3, -1, -3, -1, -3, -3, -2, 1, 4, -2, -2, 1, 7, 1, -4, 2, 5, 1, 21, -3, 3, 3, "wgoI-wsCAwECRMsM_vwk-vkGAPQbAA4SDQLvCRn--hT8BQ79EQUCBfwA_QsFCQIBBgoNDwUT-QkaSOUR9R3xFhH0BCH0BAjp_QgEIfryIvYSCv4HEv4UH_YH-vr9JgQKEgmjXgMEBQAOCxEE9AEkBAoABv5gsAkC-AsT8RcABjPSCAMKDv0C_RIe5wUO_vrDQwICAQX9BQACAwADBgIRDPr7LOQABBbyDRkpiUi9QPgv7w7yCAD6AS76Bu0O_fAG_M07MfUKAuQRFgsnAtH-ep8GC98DH_XoLAMC9BfzEQ72EPrwDwcGBPEOBggNDBMI9Aj1Bgr-_vwKAwIE_BX5CQVYswIBAQML-xn49DoF4gMM9RAs4vcj9QXgEy_10TPtHR7z9BER9e2RZAws2-YQJwQG-Rz27iMEGP3wHu3pARYjH9T5Awnz-gcs9fgH-gAe8P4S_gdRpzDQCAACBf0CAAH3DACbAQp2AAAAAAAAAAAQ8AEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAH_Af8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAACbaAAAAAAAAAAAAAAEAAAAAAP8BAAAAAAAAAAAAJdsAAAAAAAAAAAAAAAAAABbqAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEA_wABAAAA_wABAP8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB_hAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH_AAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8BEe8AAAAAAAAAAAAAAAEAAA", 3, 6, 2, 1, "Vf4DBgAHAP0QCQP8BP4EBwn-_AgLAgb0BwG4UwADCv4MBAIJBeIp_QYGBQACBAYW-w77CwUBBAIFCv79BQIDAQQB_hX3BhLiGy4J8wPmFfsy5QEpDfkLGz-69xT9qnT89gANDgQB9QEd9A7-uzMVBgQI-QQCAfcOAwMH_u8RBAAGEgACAgACAQICAgUSAQz6DBj-BPwEBP0FAQDCQgUABQ4EGPMb8DQB-_Ih_gaYb_f95CfVLM9b_uEb_g74FvTp--sAbBQP9ALzjGr4AvE4vQEq6B5LHtfiLgXUMrU1D9gRGhT9nHrN9HG8ER0p8vNBwBPm3OVCCbuUl1YF3znz7R718AQPyn_d9CIAE_L1_udDIvTv-MBICSoj4wj4HcQmBk6cFNoGETjwFOkWBAcH9hwQCPfy-wsb9xUODQf-CgcJIQ8FAOAAKfgUAekYWYcoCQoC8vsTIvMB9wL3FfcD6xApCvcD6QPwRf4Y0wEl4hAF6vkPBpqc_OIsG_ECDwXUGO4T_vQzAu0u_fD3ABbDPgT-DP4PBALtEwj9DwYEAwgV_B_WBze8DxT6G-oI6hYLDvERAA8DAAMbCPn38wkRB_0IL9oGBAAVAvb6ARPQQv0H_Qj8BAQCBgQEAQgECAf8BQICBwIBABkBAAkMAwoS-fsOAQcQChn28wEz8P71IvwBI_jvEwDzCCAI9BcQB_P8DCLLARTm_DD6EsY0-QYIEnd6BBLpGAoC_voMBP4Q8wwCBAgCCwEDAAICAJ8G_QgDAQEEDAkLAQcG-wQCAAXnG4SP_BL0APoHEfgi_vYi_AAIAAT8B_0CPcS5RgFQBQMBDRco-_sUCvv1Du8eAPMDGAsA9R0A8Q4i8voDFfwBAgP3EAr7yTjxIPsJBAX9_gb-CP0CBBD2CgMV6gwGAgIPBxj-7xIL-g_8BvkIAvvwGQwH_Qv8-w38_AcIBH8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADPQAAAAAAAAAAAAZ6AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0S8AAAAAAAAAAf8AAQAAAAAV6wAAAP8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQD_AAAB_wH_AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH_AAAB_wH_AAH_AAEAAP8BAf4BAAAB_wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB_wABAAAAAAD_AQAAAAAB_wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA_wABAAAAAADIOAAAAAAAAAAAAAAAAAAAAAL-AAAAAAAAAAEAAAAA_wEAAP8BAAAAAAAAAAAAAAAAAAAAAAAAAAAB_wAAAAAAAAAP8QAAAAAAAAAAAQD_AAAB_wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH_AAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB_wAAAAABAAD_AQAAAAAM9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAADWKgAAAAAAAAAAAAAAAAAAAQAAAAAAABLu_wEAAAAAAAAAAAAAAAAAAAAAAAAAAAABAP8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", 3, 5, "nAIDCQEHIgr8BwSXbBDzABYDC-sQ9_QbDv4Dvo8AAAAAAAAAAAAAAf8B_wABAAAAAAAAAAAAAP8", 4, 86, "Djr0FwEFCQYGMckP-gP-Cf4FGAYBAywBY5ImDwYY_RkLAQoBAwn-GP34HwgD-gr-BQUABwEEBQgB-SD4ACfgFBfo-0z47QMa40ypCwRL-fwHvnTp_TEl6knp6gj3CBb6BSADG_HnWfsA5iQcABD88uoZ8vcbNfn-7wMIJfQJ6xgGEPEWBAH7C75GBAEF3CEBAv0CBAIJAQEABgf-BQ7-_QQLK8wJ_gj-AQUEA_w-BgUAEgkC-yvkAf4BBgv5IAr8ARL8CQD9AwEBABT8_QN_jjDHIwoBAQr6Av0GAgoFBQgDAAUBAfkGEgMDAQFpmAUHC_YE-AsEAwALC_38DwAOAgECEBBhouwW_hn8K-v8FQUICPsfkAAAAAAAAAAABvoAAAAAAAAAAAAAAAAA0i4BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH_AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB_wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAP4CAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAA2iYAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzDQH_AAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC7RQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI-OMdAAEAAAAAAAAAAAAA", 3, 3, -2, 1, -2, 1, 54, 1, 4, -1, 1, 4, 1, 13, 1, -2, -2, 1, 34, -1, 1, 23, 1, 5, 1, 8, -1, -3, 1, 8, 2, -5, 1, 5, 1, -5, 1, 11, -1, 2, 14, -3, 1, 6, 1, -5, 1, 10, 1, -6, 2, 5, 1, -7, 1, 8, 2, 65, 1, 12, 2, 7, 1, 13, 1, 34, 1, -5, -1, 1, -6, 1, -8, 2, 27, 2, 2, 1, 8, 1, -4, 1, 8, 1, 13, 1, -11, 1, -36, 1, 54, 1, 17, 1, 11, 1, 13, 1, -4, 1, -3, -2, 1, -6, 1, 22, 1, -9, 1, 13, 1, -5, 1, 7, -2, -2, 1, -2, 1, 4, -1, 1, -2, 1, 66, -2, 1, 11, -3, 1, 14, -1, 2, 1, 2, 9, 2, 2, -2, 1, 8, 1, -5, -2, 1, 5, 1, -4, 1, 5, -3, 1, 10, 1, 17, -1, 1, 4, 2, 2, -1, 4, 1, 2, 3, "MhH-C_0AAgYbHu8NBAAHAAcLCwnuDAgBABD-Ae8MWLf-_iT-9An4-QEJ9_kp7An-_A4W6hP3GwUGDgFuBAMY_uIXAiP7iHP7JND8Lv3-BwEUAAXs_ggYFv0jwwofCQQIEfz5_AELCPIW-STtBgENHAACVgMDAwYCAAUC-wsHAw7xArNqmwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf8AAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAP8BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAPkH", 3, 1, -3, 1, 7, -1, 1, -2, -2, 1, 4, -2, 1, 6, 1, 4, 2, 1, -1, 3, 1, 2, 9, "t10LChELBwEOdikAAAAAAAAA", 3, -5, 2, 4, "bP0M-gMeBgOOl5EKd7yfAAAAAAAAALkRJ-TdIA", 0, 464, "$j", 0, 2, 10, -20522, "4gEi-v8AAAA", 0, 2068, 10, -56723, 10, -26, "4gEi-i7kChP_AAAAM-8AAQ", "$j"], jis0212: [0, 108, "2O7wIAPRK_6DJQACAP4CAP4CAP0EAA", 0, 8, 1, -741, 1, 4, 1, 24, 0, 38, "uu_-BHOBcQAAAAAh3yE", 0, 359, 1, -7569, 3, 1, 1, 31, 0, 1, 1, -31, 0, 1, -1, 1, 28, 0, 1, 1, -29, 0, 4, 4, 28, "ysU79Qr95B0DAAAAAAAAAA", 0, 35, 11, 51, 2, 1, 0, 35, 11, 66, 2, 1, 0, 94, 1, -922, 1, 73, 0, 1, 1, 21, 0, 1, 1, 11, 0, 1, 1, 14, 1, -3, 0, 1, "So15Af8B", 0, 1, 1, 19, 1, -137, 0, 16, "5ireNgkBBAn9CAGsWouHlgAB_wEAAAAAAAAA_wH_Af8", 0, 46, "wf4D_T_KMgPA_UIBA7pCA7r-Av5P-_sFAAAAAAEAAAD_AAEAAP8BAP8AAAABAAAA", 0, 1, "HAED_QOo_gL-AGD5A_kLAQID_QcD_YsB_gP9_H77iH4D_QMBA_0F_Xf-Av6QZpz5B_v5bgP9-55omv0CA_0BAAAAAP8AAAABAAAAAAAAAAAAAAAA_wAAAAABAAD_AQAAAAAAAAAA_wAAAAEAAAAAAAAAAAAAAP8BAAAAAA", 0, 7, "4f4D_SDKMgPf_SMBA9kjA9n-Av4w-_sF2ycBAAAAAAEAAAD_AAEAAP8BAP8AAAABAAAAAAAA", 0, 1, -1, -3, 1, -57, 1, -2, -2, 1, -2, 1, 225, 0, 1, "KwP5CwECA_0HA_2qAf4D_d1--6dfA_0DAQP9Bf2W_gL-cWac-Qf7-W4D_fuehwF3AgP9AQAAAAAAAAAAAAD_AAAAAAEAAP8BAAAAAAAAAAD_AAAAAQAAAAAAAAAAAAAA_wABAAAA", 0, 383, 1, 19589, 2, 1, 1, 6, 1, 5, 1, 12, 2, 3, -3, -2, 3, 2, 1, 4, 2, 10, -2, -2, 1, 9, 1, 8, -1, 1, 6, 2, 4, 2, 10, -3, 1, 5, 1, 13, 2, 8, 1, 5, 1, 17, 1, 9, 1, 9, 1, 12, 2, 9, 3, 4, 1, 5, 1, 6, -1, -1, -1, 4, 7, 2, 1, 1, 4, 2, 2, 1, 5, 3, 2, -1, 1, 20, -2, 1, 46, 1, -46, -1, -1, -1, -1, -2, -1, -1, 2, 5, 2, 1, 1, 5, -1, -1, -1, 1, 6, -3, 1, 6, -1, -1, -2, 4, 5, 2, 2, 2, 2, 2, 1, 2, 3, -1, -1, -1, 3, 1, -2, 2, 1, 2, 3, 1, 18, 1, 4, -1, 4, 1, 2, 1, 2, 3, 2, 1, 3, 1, -1, -2, 1, 9, -3, -1, 1, 13, -1, 2, 9, 3, 1, -2, -2, -2, -1, -1, -1, -2, 2, 3, 4, 2, -3, 1, 4, 1, 6, -1, 2, 1, -1, 3, 10, 2, 2, -3, -1, -1, 3, 2, -3, -1, 2, 5, 2, 1, 2, 2, -2, -2, 2, 2, 1, -55, 1, 69, 2, 1, -1, -3, 3, 3, 3, 1, -1, 2, 4, 5, 1, 1, 7, 2, 4, 2, 8, -2, -2, 2, 2, -2, 1, 4, -1, -1, 2, 2, -3, 2, 3, -1, -2, -1, -1, 2, 1, 1, 5, -1, 1, 4, -3, -3, 1, 4, 3, 2, 4, 2, 1, -29, 1, 29, 1, 6, -1, 4, 1, 1, 4, 2, 3, 2, 3, -1, -1, 3, 1, 2, 2, 1, 8, 1, 7, 1, 4, -3, -1, 2, 1, 1, 6, 1, 4, -1, 1, 23, 2, 4, 1, 6, -2, 1, 9, 1, 4, -3, -1, 1, 9, 1, 10, -1, -1, 2, 1, -2, 1, 5, 1, 6, 3, 1, -1, -2, 1, 5, -3, -2, 1, 8, 3, 3, -2, 2, 9, -2, 2, 12, 2, 1, -1, 1, 9, 1, 5, 2, 8, -2, 1, 6, 1, 8, -3, 1, 11, 2, 1, -1, -1, 3, 2, 1, 4, 1, 7, 3, 8, 1, 6, -1, -2, 1, 4, -1, 1, 6, 4, 1, -1, -1, 4, 7, 2, 7, 3, 5, 2, 1, -1, -2, -3, -1, -1, -3, -2, -1, -2, -1, 2, 4, 1, 4, -3, 3, 2, -1, 2, 3, -2, 2, 1, 1, 8, -2, 3, 6, 1, 4, -1, 1, 4, 2, 2, 2, 1, 1, 5, 3, 1, 3, 1, -2, -1, -2, 3, 6, -3, 1, 9, 1, -2, 1, 13, -1, 1, 5, -1, -1, 2, 6, 1, 4, 1, 6, 1, 4, 1, 4, 2, 3, 1, 5, 2, 4, 1, 4, -3, -3, -2, 2, 5, -3, -2, 2, 1, 2, 1, -1, -2, -2, 1, 4, 1, 9, 2, 2, -1, 1, 4, 2, 2, -1, 2, 5, 1, 13, 1, 12, 1, 16, 1, 6, 1, 6, 2, 5, -1, 1, 4, -1, 2, 2, 2, 13, -2, 1, 5, -1, 1, 14, -3, -1, 2, 1, -1, -1, 2, 1, 1, 5, 1, 10, -1, -1, -1, 2, 2, -3, -3, 2, 3, 1, 5, -2, -1, 2, 4, 2, 1, 2, 2, -2, 1, 5, 3, 1, -3, 1, 6, -3, 2, 2, 1, 17, 1, 9, -1, -2, 1, 6, 1, 5, 4, 1, -3, 2, 2, 3, 2, 1, 6, 2, 20, 1, 6, 2, 2, 3, 4, -3, 1, 5, 2, 1, -2, 2, 2, 1, 6, 2, 1, -2, 2, 1, -2, -1, 1, 24, 2, 1, -3, -1, 2, 5, 4, 1, -2, 2, 11, 1, 8, 1, 4, 1, 12, -1, -1, -2, -2, 2, 1, -1, 3, 2, 2, 3, -2, -2, -3, 1, 6, 1, 12, 1, 8, 1, 5, -2, -1, 6, 2, 1, 6, 1, 18, -3, -2, -1, -1, -1, 3, 1, 3, 1, 2, 1, -1, -2, -1, -1, -1, 1, 4, 1, 9, 4, 1, -2, -2, -3, -1, 2, 1, -2, 2, 14, -2, 2, 2, 1, 8, 2, 3, 3, 2, 4, 6, 3, 1, -3, -1, -3, 1, 6, 1, 6, 3, 3, 2, 3, 2, -5, 1, 11, 2, 2, -1, -1, 5, 2, 1, 8, 1, -7, -1, 2, 8, 2, 9, 1, 4, -2, -1, 1, 4, -3, 2, 4, -1, -2, 4, 1, 2, 3, -1, 2, 1, 2, 3, 3, 8, 2, 5, 2, 5, 1, 4, 1, 15, -2, 2, 1, -2, 5, 1, 3, 1, -1, 4, 1, -1, -2, -1, 1, 8, 1, 7, -2, 2, 1, 4, 1, -1, 1, -13, 3, 17, -2, 1, 11, 1, 4, 2, 9, -3, -2, 1, 5, 2, 7, 1, 5, 2, 1, -1, -3, -2, 2, 4, -1, 3, 4, 2, 3, 2, 3, 1, -41, 2, 42, 1, 13, 3, 2, 2, 5, 1, 5, 1, 4, 1, 6, 1, 5, 1, 9, 2, 2, 2, 1, 1, 4, 1, 9, -1, -2, 2, 2, 1, 15, -3, 3, 2, 4, 5, 2, 1, 2, 1, -3, -1, 1, 6, 3, 2, -3, -2, 2, 7, 1, 17, 1, -9, 1, 5, 1, 5, 2, 4, -1, -1, -1, -1, -3, -2, 2, 3, 1, 6, 1, 9, 2, 17, 2, 4, 3, 5, 1, 11564, 1, -11557, -3, 2, 1, -3, 2, 6, -2, 2, 1, 1, 8, -3, -2, 2, 11, 1, 5, -1, 3, 1, -1, -1, 1, 7, -1, -1, -2, 2, 2, -2, 2, 1, 2, 14, -1, -3, -2, -1, 1, 7, 1, 4, -2, 4, 5, -2, -3, -2, -1, 1, 4, 2, 1, -3, -1, -2, 1, 4, 3, 10, 2, 3, -2, 2, 6, 2, 1, -1, -2, 1, 8, -3, 3, 7, 2, 3, 1, 10, 2, 4, 2, 2, -1, -2, -2, 2, 19, 2, 1, -3, -3, 1, 4, 1, 8, 1, 4, -1, -1, 1, 5, 1, 9, 2, 2, -2, 1, 12, 1, 4, -2, -2, -2, -2, 3, 1, -1, 1, 4, 1, 4, 3, 4, -1, -2, 2, 1, -3, 1, 4, -1, -1, 1, 6, 1, 10, -1, -3, 1, 4, 1, 4, -3, 2, 6, 1, 6, 2, 2, 1, 6, 1, 14, 1, 28, 1, -28, -1, -1, -3, -3, 1, 7, 1, 10, 1, 8, 2, 9, 1, 5, -3, 1, 7, 1, 9, 2, 5, 4, 12, -1, -2, -1, -3, -3, 2, 1, 2, 1, -1, 2, 17, 2, 2, -1, 2, 1, 1, 4, -2, -1, 2, 3, 1, 11, -1, 5, 6, 1, 5, 1, 14, -1, -2, 1, 8, 1, 14, 1, 10, 2, 6, -3, -2, -2, 2, 1, -1, -1, -1, 2, 2, 2, 34, -1, 2, 5, 3, 3, -3, -2, 2, 3, 4, 4, 2, 9, -1, 1, 4, -2, 1, 10, 2, 1, 2, 1, -2, -3, 1, 7, 2, 1, 1, 4, 1, 14, -1, 1, 6, 1, 10, 1, -7, 1, 22, 2, 2, -1, 1, 12, 1, 4, 1, 6, 1, 4, 1, 24, 2, -9, 2, 1, 1, 9, -2, 1, 4, -3, -1, 2, 2, -2, -1, 1, 12, 1, -5, 1, 7, 1, -16, 4, 20, -1, 1, 5, -2, -2, 2, 8, 2, 3, -1, -1, 1, 4, -1, 4, 7, -3, -1, 2, 3, 1, 6, -3, 1, 4, -3, 2, 3, 1, 9, -3, -3, 1, 4, 1, -3, 2, 9, 1, 6, -3, 1, 4, 2, 14, 1, 6, 1, 6, 1, 5, 1, 4, 2, 1, -2, 2, 6, 1, 13, 1, -7, 1, 9, -2, 1, 8, 1, 12, 1, 4, 1, -8, 1, 7, 1, 4, -1, 2, 2, -1, 1, 9, 5, 1, -1, 1, 15, 1, 10, -2, 1, 19, 2, 1, -2, -1, -1, 1, 4, -1, 3, 9, 1, 6, 1, 5, 1, -2, -2, 2, 2, 2, 1, 1, 6, -1, 1, 6, 1, 5, 1, 22, 3, 3, 1, 5, 1, 10, 2, 2, 4, 3, -3, 2, 2, -1, -1, -3, -1, 1, 4, -1, 2, 1, 2, 3, -1, 1, 5, -2, -3, -3, -2, 1, 4, 2, 2, -2, 1, 7, -2, 2, 1, -2, -1, 2, 2, 1, 10, -3, -1, 1, 6, 2, 5, 1, 4, 1, 4, -3, 1, -8, 1, 7, 3, 2, 1, 6, 1, 11, 3, 2, -1, 5, 4, 1, 9, 2, 2, 3, 5, 4, 1, 2, 2, -2, -3, -1, 1, 10, -2, -2, 2, 5, 2, 2, -1, 1, 4, 1, 4, 1, 8, 1, 5, -1, 1, 10, 3, 6, -2, 1, 4, -2, 2, 1, 1, 5, -3, 1, 5, 1, 9, 2, 12, -2, -3, -1, -1, -3, -2, -1, -1, -2, 2, 4, -3, 2, 1, -2, 2, 7, 1, 5, -3, -2, -3, -1, 4, 3, 2, 2, 2, 4, -3, -1, 2, 1, -3, -2, 1, 12, -2, -2, 2, 3, 1, 4, 1, 4, -2, -1, 5, 3, 2, 1, -1, -2, -1, -3, 2, 7, 2, 4, 3, 3, -1, 1, 7, 2, 3, -2, 1, 20, -1, 1, 11, 1, 5, 1, 5, 2, 2, 3, 2, 2, 1, 1, 6, -1, 2, 4, 2, 3, 2, 3, 2, 1, 1, 4, -2, -1, -2, 2, 10, -2, 3, 3, 2, 11, 1, 5, 4, 6, 2, 1, 1, 4, -1, 1, -5, 2, 6, -1, 1, 17, 2, 1, -2, 1, 11, -1, 1, 6, -3, 2, 1, -3, -1, -1, 1, 13, -3, 3, 4, -1, 1, 5, 3, 3, -1, -1, -3, -1, 1, 7, 1, 8, -1, -3, 1, 6, -2, 4, 15, 1, 21, -1, 1, 10, 2, 2, -2, 2, 3, 1, 4, 1, 9, 2, 6, -3, 1, 15, 1, 7, -1, 2, 7, 2, 5, 2, 5, -1, -2, -2, -2, -1, 2, 16, -2, 2, 7, -2, -2, 4, 4, -1, 2, 3, -2, 3, 3, -3, -2, 2, 9, 2, 5, -3, 2, 2, -2, 2, 3, -1, -2, -1, -2, -2, 1, 5, 2, 3, 2, 3, -3, 1, 5, -1, 3, 6, 1, 13, -3, -3, -2, 1, 5, -2, 3, 1, 1, 6, -3, 1, 4, 1, 4, -1, 2, 5, -1, 2, 2, 2, 15, 1, 5, -1, -1, -3, 1, 5, -1, -1, 2, 1, 2, 3, 2, 4, 1, 4, 1, 7, -1, 1, 11, -3, 4, 1, 4, 5, 3, 1, -1, 1, 9, 2, 5, 1, 6, -1, 1, 7, -1, 3, 7, 2, 6, -1, -1, -1, -1, -1, -2, -1, -3, 1, 6, 3, 9, 1, 4, 4, 4, -1, 2, 1, -3, -1, 2, 12, 2, 3, -2, -2, 1, 4, -1, -3, -3, -1, -2, 3, 3, 1, 4, 2, 3, -1, -2, -1, 2, 2, -2, -3, -2, 1, 4, -2, 1, 8, 2, 1, 1, 5, -3, -1, 1, 6, -1, -1, 2, 10, 1, 6, -3, 1, 14, -2, -3, -3, 1, 4, 1, 7, -2, -2, 1, 4, -2, -2, -2, 1, 7, 3, 3, 1, 10, -2, 2, 5, 1, 4, -1, -3, -1, -1, 1, 6, 1, 16, -1, 2, 1, -3, 3, 4, -3, 2, 3, -3, 2, 3, 2, 2, 1, 6, "$9", 1, 19, -1, 1, 5, 1, -3, 1, 8, 2, 4, -3, -1, 1, 4, 1, -4, 3, 8, 2, 1, 2, 3, 1, 153, 3, -146, 1, 17, 1, -12, -1, 1, 9, 3, -9, -1, 1, 4, 1, -5, 3, 14, -2, -1, 4, 6, 2, 2, -3, 1, 8, 2, 3, -2, 1, 5, 2, 3, 2, 1, 1, 4, -3, 2, 1, 1, 4, 1, 6, -3, 1, 8, 2, 2, -1, 1, 11, 1, 10, -1, 1, 6, 1, 4, 1, 5, -2, -3, -1, 1, 16, 1, 10, 1, 6, 2, 1, -3, 2, 7, 1, 7, 1, 8, 1, 5, -1, 1, 5, -1, 1, 4, 1, 5, -2, 2, 9, -1, -1, -2, 2, 1, -1, 3, 20, -2, 3, 5, 1, 59, 1, -58, 2, 1, -1, 2, 2, 1, 8, 1, 4, -1, -2, 1, 4, 1, 4, 1, 9, -1, 2, 3, 1, 90, 1, -63, 1, 4, -3, -1, 1, 8, 1, -2, 2, 4, 3, 1, -1, 1, 7, -3, 2, 4, 1, 4, -1, 1, 8, 2, 1, -2, 1, 15, 5, 2, -2, 4, 3, 1, 5, -1, -1, -1, 1, 13, -1, -1, -1, 1, 4, -1, -1, 2, 3, -3, -3, 1, 8, 1, 9, -2, -3, 3, 2, -1, -2, -2, 2, 2, 1, 7, -2, 4, 1, 2, 2, 2, 3, 3, 4, 1, 8, 2, 2, 2, 5, -1, 2, 2, 1, 25, -1, -1, -2, -2, 1, 6, -2, -3, 1, 4, 1, 8, -3, 4, 7, 2, 1, -2, 3, 3, 2, 7, 2, 3, 1, 12, 1, 4, -3, -1, 1, 8, 2, 3, -1, -2, -1, -1, 2, 7, -1, -1, 1, 8, -2, 1, 8, 2, 4, 1, 10, -2, 2, 8, -1, -1, -1, 1, 8, 2, 1, -1, 1, 11, -1, -3, 1, 4, -2, -2, -3, -3, 1, 7, -1, -1, -2, -3, 2, 2, 2, 5, 2, 2, -3, 3, 1, 2, 2, 1, 4, 1, 8, -2, -2, 1, 6, -1, 1, 10, -2, -1, 2, 2, -1, -1, 1, 5, 1, 9, 3, 1, 1, 5, 1, 5, 3, 3, -2, 3, 8, 1, 6, -2, 1, -2, -3, -3, 3, 3, 2, 5, 1, 6, -2, 1, 4, 3, 3, 2, 9, 2, 4, 2, 2, -1, 3, 5, 1, 5, -3, -2, 1, 5, -3, 2, 2, -2, 2, 5, 1, 4, -3, 1, 6, -3, -2, 1, 4, -3, -1, 1, 4, -2, 1, 6, -3, -2, -1, 1, 4, 2, 7, -3, -2, 1, 17, -3, 2, 3, 2, 1, 2, 4, 3, 2, -1, 2, 7, 2, 3, 2, 4, 1, 4, -2, 1, 9, -3, 1, 6, -1, 2, 2, 1, 6, -2, 1, 5, -1, 1, 5, -2, 2, 1, -3, 2, 3, -1, -1, 1, 6, 1, 5, 3, 6, -3, -1, 1, 4, 2, 1, 2, 3, -3, 2, 10, -1, -1, -2, -1, 1, 4, 2, 1, 1, 14, -1, -1, 1, 4, -1, 2, 1, -1, 3, 9, -1, 2, 10, 2, 1, -3, -2, 1, 16, -1, -1, 1, 13, -3, 1, 6, 4, 1, -1, -1, -3, -1, -3, 1, 6, -1, 2, 1, -1, -3, -1, 1, 15, -2, -2, 2, 3, -1, -1, 1, 6, 3, 11, 1, -194, 2, 198, -1, 1, 7, -2, -2, 1, 23, 2, 6, -1, -3, -1, 2, 7, 1, 11, 1, 5, 1, 4, 2, 9, -1, 3, 1, 1, 17, -1, 1, 7, -2, -1, -3, -1, 1, 4, -3, -1, 2, 3, 1, 6, 1, 4, -1, 2, 1, -1, -2, -3, 2, 5, -3, -1, 1, 5, -3, -3, 1, 25, -3, 1, 4, 1, 10, -3, -2, 2, 1, 2, 7, 2, 2, -1, -3, 4, 1, -2, 3, 4, 2, 3, 1, 4, 1, 10, 1, 7, -1, 1, 15, 1, 5, 1, 5, 1, 6, 1, 6, 2, 5, -2, -1, 1, 7, 3, 3, -1, 2, 3, -1, 3, 2, 1, 27, 2, 1, 1, 10, -1, -1, 1, 6, -3, -1, 2, 1, 1, 8, -1, 2, 1, 1, 10, 2, 2, 2, 4, -2, -2, 2, 4, 1, -16, 1, 33, 3, 1, -3, 2, 1, 2, 2, 2, 2, 1, 5, -3, 2, 16, 1, 4, 2, 3, 3, 2, -2, 3, 1, -1, -3, 2, 4, 4, 4, 3, 5, 2, 4, 1, 5, 1, 8, 2, 1, -1, 1, 15, -3, 2, 9, 1, 6, 1, 4, -3, 2, 2, -2, 3, 4, 1, 5, 1, 9, 1, 8, -2, 1, 11, 1, 4, -2, -1, -2, 2, 6, 4, 3, 2, 8, 2, 7, 1, -17, 2, 21, 1, 6, -1, 2, 6, 1, 7, -2, 2, 3, 5, 13, -2, 1, 8, 1, 6, 2, 4, -2, -2, 1, 18, 1, 6, 4, 1, -1, -3, 1, 7, 1, 21, 5, 8, 2, 3, -2, 1, 14, -1, 1, 10, -1, 3, 1, 1, 6, 1, 8, 3, 3, 2, 2, 1, 4, -1, 1, 4, -2, -1, -1, -1, 1, 7, 1, 16, 1, 6, 1, 4, -1, 1, 4, 1, 5, 2, 7, 1, 4, -1, 2, 12, 2, 1, 1, 6, 3, 4, -2, 2, 6, 1, 6, -2, 2, 2, -1, 1, 27, 1, 5, -1, 3, 6, 1, 9, -3, -2, -2, -1, 1, 4, 1, 6, -3, 1, 4, 2, 3, 3, 7, -1, 3, 8, -2, 2, 1, -3, -1, -1, -1, -2, 1, 4, -2, 2, 2, -1, 2, 5, 2, 2, -2, 1, 4, 1, 4, 2, 3, 1, 4, 1, 7, 1, 12, 2, 4, -2, -2, 1, 9, -2, 1, 5, -1, -2, 2, 8, -1, 1, 6, 1, 5, 2, 13, 2, 5, -2, -3, 2, 1, -1, -3, -1, 2, 4, 2, 4, 1, 4, -3, -1, 2, 2, -3, 2, 4, -2, 2, 4, -1, 1, 5, 1, 9, -2, -1, -3, -1, 4, 4, 2, 5, -1, 2, 1, 2, 1, -1, 1, 5, -1, -2, 2, 3, -1, 2, 1, 1, 7, -1, -2, -1, 2, 1, -3, 3, 1, -1, 2, 2, 2, 3, -1, 1, 7, -1, -1, 2, 2, -1, 2, 5, -2, 2, 1, -2, 2, 2, -2, -2, -3, -3, -1, 2, 2, -1, 2, 10, -1, 3, 1, -1, 3, 1, -2, -2, -2, 1, 6, 2, 8, 1, 8, -1, 10, 1, 1, 7, 1, 6, 2, 2, 2, 1, -3, -1, 2, 3, 1, 4, 1, 5, 1, 4, 3, 3, -2, 2, 1, 2, 2, 2, 13, 3, 3, -1, 4, 5, 3, 5, -1, 3, 2, -1, -2, 4, 1, 2, 2, 2, 1, -2, -3, -1, -3, 2, 8, -2, -3, -2, 1, 4, 2, 1, 2, 2, 1, 4, -3, 2, 1, -3, 1, 4, 3, 5, -2, 1, 6, 1, 11, 2, 3, 2, 8, -2, -2, 2, 1, 1, 4, 1, 6, -2, 4, 3, -2, 2, 3, 1, 5, -1, -1, 1, 4, 2, 6, -1, 1, 13, -1, 6, 7, -2, -3, 1, 10, 2, 1, -1, -3, -2, 1, 5, -1, 1, 15, 1, 5, 3, 4, -2, -1, 1, 5, 2, 1, 1, 7, 1, 4, 3, 2, -2, -2, 1, 4, 2, 1, -1, 1, 7, 1, 6, 3, 1, 2, 2, -1, -1, -2, 2, 2, 2, 1, -2, 4, 1, 1, 4, 2, 1, -2, -3, 2, 4, -1, 3, 2, -1, 1, 13, 2, -11, 3, 1, -3, -1, 1, 9, -3, 1, 5, 2, 4, 3, 7, -1, -2, 1, 12, -3, 2, 6, 1, 7, 3, 5, 2, 1, 7, 1, -1, -2, 1, 15, -3, -3, -3, 2, 1, -1, 1, 5, 1, 4, 1, 6, 1, 5, -1, -3, 2, 3, 1, 4, -2, -2, -3, 1, 5, -3, -3, -3, 2, 1, -1, 2, 1, -1, 1, 5, 1, 5, 3, 4, 3, 4, -2, 2, 3, -3, 2, 2, -3, 3, 2, -2, 2, 3, 1, 4, 3, 1, -1, -1, -2, -2, -1, -3, 3, 1, 1, 5, -2, -2, -3, 2, 7, 3, 6, -3, 1, 4, -2, 1, 4, -2, 2, 3, -1, -3, 1, 8, 1, 4, 1, 5, 2, 7, -2, -3, 3, 4, -3, -1, -3, -1, 2, 3, -2, -3, -2, 2, 9, -2, 2, 3, -2, 1, 11, 3, 3, 2, 9, -1, 1, 4, -1, 2, 11, 2, 2, -3, -1, -3, 1, 9, -1, 2, 1, 2, 1, -3, -1, -3, 1, 11, -3, 1, 11, 1, 4, 1, 4, -3, 1, 8, 3, -5, 1, 4, -3, 2, 3, 4, 2, 1, 7, -1, -1, 3, 7, -2, -1, 2, 3, 2, 1, 1, 13, 1, -10, 3, 3, 1, 4, -3, 2, 7, 1, 12, 2, -11, 2, 2, -3, 1, 6, 1, 5, -3, 1, 9, -1, 3, 1, 1, 4, -1, -1, -3, -3, 2, 2, 1, 5, -1, -1, 3, 4, 2, 3, -3, -1, -2, -3, 2, 2, 1, 10, -1, -1, 1, 6, 1, 6, 2, 1, -1, 2, 12, 1, 4, 4, 1, -1, 2, 2, 1, 4, 2, 6, -1, -3, -1, -2, -3, -2, 1, 6, -1, 2, 2, -1, 1, 4, 1, 4, -1, -3, 2, 2, -1, -1, -2, 2, 4, -1, -3, 1, 6, -3, 2, 5, -3, 2, 1, -1, 1, 4, -3, 1, 5, -2, -2, 1, 5, -3, -1, 2, 1, 2, 3, 3, 2, 2, 9, 2, 1, -3, 2, 8, -2, 2, 2, 2, 1, 1, 4, -1, -2, -2, 1, 7, -2, 1, 5, -1, -1, 2, 2, 2, 3, 2, 4, -2, 1, 9, -1, -2, 1, 8, 1, 6, -1, -3, 2, 1, 1, 9, -2, -2, -1, -2, 1, 9, 2, 12, 2, 1, 1, 4, -2, 1, 6, 2, 1, 1, 8, 1, 12, 1, 10, -3, -3, 3, 1, 5, 1, -2, 1, 8, 3, 1, 1, 5, 1, 6, 1, 6, 1, 10, -3, -1, 2, 2, -2, -1, 2, 2, -3, 1, 12, 1, 4, 1, 4, 2, 1, 1, 4, 1, 4, -2, -1, 1, 4, 1, 6, 2, 2, -1, 2, 2, 4, 3, 1, 4, -2, -2, -1, 1, 9, 2, 1, 3, 1, 1, 12, -1, 1, 7, 2, 1, 3, 2, -1, -1, 4, 2, -1, -2, 2, 1, 2, 1, 1, 9, -1, 1, 4, 2, 4, -1, -3, 1, 4, 2, 1, -1, 2, 2, 1, 11, -3, 1, 10, 3, -5, 6, 5, -2, -1, -3, -1, 2, 3, -1, -1, 1, 6, 2, 2, 2, 8, 1, 7, 1, 4, 1, 9, -1, 1, 5, 1, 9, 2, 5, 3, 2, -2, 1, 4, 3, 2, -3, -1, 3, 3, -1, 2, 1, -2, 1, 8, -2, -1, 1, 9, 1, 13, 3, 3, 1, 5, 3, 1, -2, 2, 6, 1, 4, -2, -3, -2, -3, 3, 10, 2, 1, 2, 5, 1, 4, -3, -1, -3, 2, 1, 2, 1, 1, 7, -1, -2, 1, 5, 1, 7, 2, 1, -3, 3, 1, 2, 1, -1, 3, 2, -3, 2, 4, 2, 5, 2, 7, -2, 1, 8, 2, 2, -1, 5, 8, 3, 5, 1, 8, -1, 1, 38, 1, -31, 2, 2, 2, 3, -1, -3, 2, 3, 2, 2, 1, 13, 2, 7, -3, -1, 2, 4, -2, 2, 6, 2, 3, -1, -3, -2, 1, 8, 2, 4, -1, 1, 6, -1, -1, 1, 5, 1, 6, 2, 1, -2, 1, 5, 2, 2, -3, 1, 4, 1, 5, -2, 2, 4, -2, -2, -3, -3, -2, -1, 2, 2, 1, 157, 1, -2, 3, 1, 2, 3, -2, 1, 7, 2, 2, 3, 7, -3, 4, 1, 1, 6, -3, 4, 11, 1, 10, -1, 3, 1, 2, 4, 1, 4, 2, 4, -3, -3, -2, 1, 6, 1, 7, 2, 2, -2, 1, 4, 2, 5, 1, 11, -3, -3, -1, -2, -3, 2, 1, -2, 1, 7, 3, 2, 2, 7, -1, 3, 2, -1, 2, 1, -1, 4, 6, -3, -1, 1, 5, -1, -1, 2, 3, -1, 2, 1, -1, -1, -1, -3, 1, 27, -3, -1, 1, 6, -3, -3, 1, 11, 1, 6, 1, 5, 1, 13, -1, 2, 7, -3, 2, 12, 1, 14, 1, 4, -1, -2, 2, 1, 2, 1, 1, 7, 2, 12, -1, 2, 1, -2, 2, 2, -3, 1, 4, 1, 7, 3, 10, -3, -1, -1, -3, -2, 1, 4, -3, 1, 4, 1, 4, -1, 1, 8, -1, -2, -1, 1, 5, 1, 4, 2, 8, 3, 5, -3, -1, 1, 7, 1, 9, 1, 14, 3, -13, 1, 4, -2, 1, 7, -1, -2, -2, -3, 1, 11, -3, -1, 1, 6, 1, 15, 1, -9, -1, 1, 4, 2, 3, 1, 5, -1, -3, 2, 1, -2, -2, 2, 6, 3, 3, 2, 2, 2, 1, -3, 2, 1, -2, 1, 11, 2, 3, 2, 4, -2, 2, 3, 1, 5, 1, 9, -1, 1, 5, 4, 8, 1, 4, 2, 2, -1, 1, 4, 1, 5, -3, -2, -3, 1, 5, 1, 6, 1, 6, -1, 3, 1, 2, 1, -2, 2, 1, -3, -2, -2, -1, -1, 2, 1, 2, 4, 2, 1, 4, 2, -3, -1, -1, -1, -2, -2, -1, 2, 1, 1, 6, 1, 9, 1, 4, 1, 4, 1, 5, -1, -1, -3, -1, -2, -1, 2, 6, 2, 5, 2, 1, 2, 5, 2, 1, 1, 72, 1, -58, 3, 1, 2, 1, 3, 9, -1, -2, -3, -2, 2, 1, 3, 4, -2, 2, 5, -2, 3, 3, 1, 24, 1, 7, 1, 4, 2, 1, -1, -1, -1, 1, 6, 1, 4, 2, 1, 2, 2, 3, 1, 2, 8, -1, -2, 3, 17, 1, 6, -1, 3, 5, -2, 1, 8, 1, -139, 1, 148, -1, 1, 11, 2, 1, -2, 1, 4, 1, 4, -3, 1, 4, -1, -3, -3, 1, -109, 1, 129, 1, 9, 1, 11, 2, 1, -1, -2, -1, 2, 1, -3, 3, 1, -1, -3, 2, 3, -1, -2, 1, 5, 2, 2, -1, -1, 2, 3, -3, -3, 2, 12, -1, 1, 8, 1, 7, 3, 1, 1, 4, -1, -2, 1, 5, 2, 2, -1, -1, 2, 4, -3, -2, -3, 1, 8, 1, 10, -2, 4, 4, 1, 4, 1, 58, 2, -57, -1, 2, 4, -3, 1, 4, -1, -1, 1, 11, -1, 4, 3, -1, 2, 2, -3, 2, 3, -1, 1, 8, 1, 6, 5, 8, -2, -2, 7, 2, -1, 1, 6, -3, 3, 9, -1, -1, -1, 2, 3, -2, 2, 1, -2, -3, 1, 4, 1, 4, 2, 1, -1, -2, -1, 1, 12, 3, 1, 4, 3, -2, 1, 4, 2, 2, -2, 1, -34, 1, 42, -1, 2, 4, 1, 5, -1, 1, 4, 1, 5, -2, 1, 5, 2, 2, 2, 3, 2, 7, 3, 1, 2, 5, -1, -2, -2, 1, 5, -1, 1, 12, -1, -1, 2, 1, -2, -1, -3, 2, 11, 4, 2, -3, 5, 2, 1, 4, -2, -2, 3, 5, -2, 1, 18, -3, 1, 4, -1, -1, -1, 1, 4, 3, 4, 1, 4, -3, 3, 1, 3, 1, 3, 5, -1, -1, 2, 11, -2, -1, -2, -1, -3, -2, -1, -1, 1, -96, 1, 113, 2, 1, 2, 6, -1, -3, 3, 2, 2, 2, 1, 4, 2, 4, -1, -1, 1, 4, 2, 5, 2, 1, 2, 6, 3, 1, -1, -2, -1, 1, 7, 1, 10, 1, 4, -3, 2, 2, 1, 9, 2, 1, 1, 8, 7, 7, 2, 1, -3, -2, -1, 3, 1, 1, 4, -1, -2, -3, 3, 4, -2, -3, 2, 8, -1, 3, 6, -3, 2, 6, 2, 2, -1, -2, 3, 2, 2, 5, -1, -3, -1, 1, 4, -1, 1, 4, -1, -1, -2, 3, 2, 1, 4, 1, 8, 3, -8, -3, 3, 1, 2, 1, 1, 8, 2, 4, -1, -1, -2, 1, 4, -1, 1, 4, -1, -1, 4, 2, -2, -2, 2, 3, -1, -1, -1, 2, 2, -3, 1, 4, 1, 7, 1, 7, -1, 1, 4, 1, 23, 3, 1, 2, 2, 1, 7, -1, 1, 15, 2, 2, -1, 5, 9, 3, 2, 1, 7, -2, 1, 8, 3, 7, -3, -1, 1, 9, 1, 4, 3, 6, 2, 5, 3, 1, -1, -3, 3, 5, 3, 7, -2, 2, 3, -3, -1, -1, 2, 2, -2, 1, 5, -2, 1, 4, 3, 2, 3, 4, 1, 7, -2, -1, -2, -1, 4, 4, 1, 11, -3, -2, 2, 3, 2, 5, 2, 2, 1, 4, 1, 10, 4, 3, 1, 4, 5, 23, 1, 12, -3, -1, -1, -3, -1, -2, -2, -3, -1, 2, 4, -1, 1, 7, 2, 1, 2, 1, 1, 8, -1, -1, -1, -1, 2, 4, -2, 1, 5, -1, 2, 5, -1, -2, -1, -1, -1, 2, 3, 1, 4, 3, 2, 2, 3, -3, -3, -1, 3, 13, 3, 1, 3, 2, -2, -2, 1, 4, 2, 3, -1, 2, 3, -1, 1, 5, 1, 7, -1, 2, 4, -3, 2, 2, -3, -2, 1, 4, -2, 3, 1, 1, 6, 3, 1, -1, 1, 5, -1, 1, 12, -3, 3, 3, 1, 5, -2, 2, 5, 1, 4, 1, 5, 1, 10, 2, 1, 1, -22, 1, 34, -2, 1, 6, 1, 4, 5, 5, -1, 3, 9, 1, 4, 1, -13, 1, 16, 1, 4, 1, 9, 1, 8, 2, 1, -2, -1, -2, 2, 2, 1, 5, -1, -1, 2, 4, 1, 6, 2, 1, 2, 152, 2, 3, 1, 6, -1, -1, -1, -3, -1, 2, 1, 2, 2, -2, -1, 1, -5, 2, 9, -1, 2, 1, -3, 1, 5, 2, 1, 1, 4, -2, 2, 7, -3, 1, 4, 2, 1, 1, 5, 2, 1, 1, 7, 2, 20, 2, 10, -2, -1, -3, 1, 6, 1, -2, -3, -3, -3, 1, 6, -3, 2, 2, -1, -2, 2, 1, 2, 5, -1, -1, 1, 5, 1, 8, 1, 4, -3, 1, 73, -3, -2, -1, 1, 16, -2, -1, -3, 1, 4, 2, 2, -3, 3, 8, 1, 5, 2, 4, -2, -2, -2, -1, -1, -1, 1, 4, 4, 4, -1, -3, -2, 2, 2, -1, -1, 2, 10, -1, 1, 4, -3, 1, -53, 2, 52, -1, 1, 8, -3, 3, 2, 1, 4, 1, 5, -2, -1, 4, 9, 2, 2, 1, 9, -1, 4, 2, -3, 2, 2, 1, 9, 3, 1, 1, 4, 4, 6, 2, 2, 1, 6, 2, 2, 3, 1, 3, 7, 2, 6, 1, 5, 1, 6, -1, -2, 2, 4, 2, 1, -3, 1, 4, -1, 2, 3, 1, 4, -1, 2, 4, 2, 4, 2, 1, -2, 1, 7, -1, -2, 1, 7, 1, 11, 1, 5, 2, 1, 1, 5, 2, 1, 1, -14, 1, 18, -1, 2, 4, 2, 6, 3, 5, 1, 5, 2, 1, -1, -1, 2, 1, 3, 3, 4, 5, -2, 2, 5, -1, -3, 1, 7, 5, 1, -2, 2, 4, 1, 6, 1, 55, 2, 2, 3, 2, 2, 14, -1, 1, 5, 2, 1, 1, 4, 2, 3, -1, -2, 2, 1, -1, 1, 10, 2, 2, -3, 1, 5, -2, 2, 3, 1, 4, -2, -3, -1, -3, -3, 1, 11, -2, 2, 12, 1, 5, 1, -6, 2, 1, 2, 5, -2, 1, 7, 2, 3, 1, 7, 1, 14, -1, 1, 4, 2, 3, 1, 4, -3, -3, 1, 4, 1, 11, -2, 2, 2, -1, -1, 1, 4, 3, 1, -1, 3, 4, -2, 1, 10, 3, 1, -1, 1, 6, 1, 14, 1, -15, 3, 4, 2, 1, 1, 12, 3, 1, 2, 2, -1, 1, 5, 1, -20, 1, 35, 1, -12, 2, 3, -3, 3, 9, 3, 3, -1, 1, 4, -2, -3, 3, 1, -1, -1, -1, -1, 1, 4, 2, -4, -3, -1, 2, 4, -1, -2, 2, 1, 2, 1, 2, 1, 1, 5, 2, 3, 1, 6, -3, -3, 3, 1, 1, 5, -2, -2, 1, 5, 1, 6, 3, 4, 1, 5, -1, 2, 1, -3, -3, -2, 3, 1, -2, 1, 5, -2, 1, 4, -1, 3, 3, 4, 1, -2, 3, 4, -1, 2, 2, -1, 2, 13, -2, 2, 1, -3, 2, 5, 2, 3, 6, 1, 1, 5, -1, -1, -1, 2, 2, 4, 2, 2, 1, -1, -3, 2, 1, -2, -1, 2, 3, 4, 5, -1, 3, 5, -2, 2, 1, 3, 1, -1, -1, -1, 2, 1, 2, 2, -2, 3, 2, -1, 2, 6, 2, 2, 2, 2, -3, 3, 1, 3, 4, 5, 4, 3, 1, -1, 3, 8, 2, 2, -3, 1, 4, -1, 2, 5, 2, 3, 2, 1, -2, -3, -2, -3, -1, 4, 1, 5, 1, 4, 1, 4, 2, -1, -2, -1, 3, 1, 2, 2, 3, 1, -1, -1, 2, 1, -3, -1, -1, 1, 8, -1, 2, 3, -1, 1, 5, 1, 4, -3, 2, 2, 4, 6, -1, 2, 2, -1, 2, 1, 2, 8, 2, 1, 3, 15, 3, 6, -2, 2, 1, -1, -3, 2, 5, -1, 2, 1, -2, 3, 1, 2, 1, -1, -3, -2, 4, 1, 1, 5, 2, 1, -1, -1, -2, -2, -2, -2, -2, -2, 2, 1, -1, -1, -2, 3, 8, -3, 1, -18, 1, 23, 4, 2, 5, 1, 1, 5, 1, 5, -2, 2, 1, -2, 2, 3, 1, 17, 2, -3, 2, 1, -1, 2, 3, -1, 2, 3, 3, 3, 3, 5, 1, 7, 2, 14, 4, 1, 1, 6, -3, 1, -3, 1, 5, -1, -2, -1, -1, 1, 8, -3, -2, -2, -1, -1, 1, 4, -2, 3, 1, 2, 1, 1, 17, 1, -2, 2, 244, 1, 4, 1, 5, -3, 3, 3, 3, 14, -1, 1, 4, -2, 2, 1, 1, 7, -1, -3, -2, -1, 1, 6, 2, 1, -1, 4, 4, 2, 5, 4, 2, -3, -1, 2, 54, -3, 3, 1, 1, 5, 1, 4, -1, 4, 3, 2, 1, -3, 1, 16, -1, 3, 1, 1, 8, 1, 12, 1, 5, 2, 6, 2, 1, 4, 1, 1, 4, 1, 7, 1, 4, -3, -2, -1, 3, 4, -2, 2, 4, -3, 1, 6, 1, 15, 1, 7, 1, -14625, 1, 14629, -1, 3, 2, 1, 9, 1, 5, -1, 1, 8, 2, 7, -1, -3, 2, 16, -1, 3, 3, 1, 4, 1, 8, -1, 1, 13, -1, 1, 6, 2, 3, 1, 5, 2, 1, 2, 1, 1, 7, -3, -2, -3, 1, 4, 3, 2, -2, -1, 2, 1, 1, 8, 3, 11, 2, 1, 2, 3, -2, 1, 9, -1, 2, 2, 2, 2, 3, 1, -1, 2, 1, -1, 2, 2, -1, 2, 1, 3, 1, 2, 1, -2, 3, 2, 2, 3, -1, 1, -6, 1, 5, -2, 1, 10, -1, -2, 2, 2, -1, 1, 12, -2, 1, 14, 2, -13, 1, 5, -1, 1, 5, -1, -1, -2, -2, 1, 4, 3, 2, 2, 1, -1, 1, -17, 1, 24, 1, 5, -2, -2, 3, 6, 2, 2, 2, 1, 2, 7, 2, 1, -3, -1, 1, 62, 2, 1, -1, -3, 2, 2, 2, 1, -3, -2, -2, -2, -3, 1, 20, -1, 3, 1, -2, 1, 8, -2, 1, 11, 2, 4, 1, 8, 3, 3, 3, 2, -2, -2, 2, 3, -3, 5, 5, 4, 3, 2, 3, 3, 4, 2, 4, 1, 5, 2, 3, 2, 1, 3, 1, 1, 58, -1, -1, 1, 6, 3, 9, -2, 2, 3, -2, -1, -3, 1, 5, 2, 9, 2, 4, -1, -1, 1, 8, 3, 2, -3, 2, 3, -3, 2, 3, 3, 3, 2, 6, 2, 3, 1, 4, 1, 7, -1, 3, 1, -2, 2, 5, 1, 4, 2, 1, -1, 1, 14, 1, -7, -2, 3, 5, -1, -2, -2, -1, 1, 6, 1, 76, -1, 2, 1, -2, 3, 1, -2, -1, 2, 2, -1, -1, -2, -1, 1, 5, -1, -1, 3, 2, 2, 3, -3, 2, 3, -1, -1, -2, 2, 5, -1, 2, 3, -2, 7, 1, 2, 2, 4, 1, -1, -1, -3, -2, 2, 1, -3, 1, 5, 1, 4, -1, 3, 5, -1, 2, 1, -2, 1, 10, 2, 2, 3, 8, -3, -2, -2, -1, 2, 1, -1, 5, 1, 1, 4, -1, 3, 1, 2, 5, 4, 3, 3, 1, -1, 2, 1, -3, 1, 5, 2, 2, 2, 7, -1, -2, 3, 3, 2, 4, 2, 2, 2, 1, -1, 2, 5, 1, 5, -1, 2, 6, 1, 4, -1, 1, 5, -1, 2, 2, -3, -3, 4, 3, -2, 2, 1, -1, 1, 8, -3, -1, 1, 4, 3, 1, -1, -1, 2, 3, 5, 2, 1, 6, 3, 3, 1, 5, -3, 3, 1, 2, 3, 3, 3, 2, 2, -1, -1, -2, 3, 1, -3, 2, 5, 1, -15, 1, 14, 1, -4, 1, 5, -1, -1, -2, -1, -3, 1, 106, 1, 11, 1, 4, -1, 1, 17, 1, -10, 1, 14, 2, 5, 3, 3, 2, 16, 3, 1, 1, 5, -1, 1, 8, 1, -9, 2, 4, -3, -2, 2, 8, 1, 10, -3, 1, -2, -2, 3, 3, 1, 4, 2, 5, 2, 3, -1, 2, 4, -1, -3, 2, 2, 2, 3, 4, 1, 1, 8, 1, 8, -1, -1, -2, -3, -3, -2, -2, -3, -3, 2, 1, 4, 9, -2, 3, 3, 1, 4, -1, -1, -1, -2, -1, 2, 2, 1, 9, 1, 11, 1, -9, 1, 4, 1, 6, 3, 1, 2, 2, -2, 2, 2, 3, 92, -3, 4, 1, -1, 2, 6, 1, 6, -1, -2, -2, 1, 5, -3, -3, 3, 1, 3, 2, 1, 16, -1, -2, 1, 9, 1, 9, 1, 4, -2, 3, 4, 3, 1, -2, -2, 1, 6, 2, 2, 1, 5, 4, 5, -1, 2, 1, 3, 1, -3, -2, -3, 2, 3, -3, 2, 1, -1, -2, 2, 1, 2, 1, -1, -1, 5, 1, 1, 11, 4, 1, -1, 2, 2, 2, 9, 5, 3, -1, -1, 1, 4, -2, 4, 17, -1, 2, 1, 1, 6, 3, 2, -1], "euc-kr": [2, 44034, 2, 1, 5, 4, 1, 8, 2, 5, 3, 1, 7, 1, -2, 3, 3, 0, 6, 3, 0, 2, 2, 3, 1, 10, 1, -1, 6, 1, -1, 0, 6, 2, 0, 3, 1, 19, 1, 2, 2, 2, 1, -2, 5, 1, -2, 2, 4, 3, 4, 3, 1, 7, 1, -2, 6, 3, -3, 2, 1, 7, 2, -2, 3, 3, 2, 1, 3, 1, 3, 1, 8, 1, -1, 8, 1, 2, 2, 2, 1, -2, -1, 2, 1, -3, -1, 5, 2, 2, 2, 3, 1, -1, 5, 1, -2, -1, 6, 1, 3, 1, 3, 1, 8, 1, 2, 1, 6, 2, 0, 6, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 3, 1, 3, 1, 0, 6, 8, 1, -1, 8, 1, 2, 2, 2, 1, 4, 4, -3, -1, 5, 2, 2, 2, 3, 1, 11, 1, 6, 2, 18, 1, 8, 1, 2, 2, 3, 1, 7, 1, -2, 8, 1, 3, 1, 3, 1, 19, 1, 2, 2, 2, 1, 6, 3, -2, -1, 6, 1, 8, 1, 0, 6, 19, 0, 2, 2, 2, 1, -2, 2, 1, 0, 6, 3, 0, -2, -1, 3, 2, -1, -3, 3, 1, -1, 5, 1, -2, 3, 3, 2, 1, 2, 2, 3, 1, 7, 1, -2, 6, 3, 6, 2, 47, 1, -3, 3, 1, 7, 1, -2, 6, 3, 2, 2, 11, 1, 2, 1, -1, 6, 1, 3, 1, 3, 1, 9, 1, 0, 6, 1, 0, 4, 2, 2, 1, 19, 1, 0, 6, 8, 0, 2, 2, -1, -1, 7, 1, -2, -1, 4, 3, 6, 2, 11, 1, 6, 2, 19, 2, 6, 1, 3, 1, 3, 1, 7, 1, 3, 2, 6, 1, 27, 1, 2, 2, 3, 1, 6, 1, -3, -1, 5, 2, 7, 1, 5, 1, 0, 6, 6, 0, 6, 2, 2, 2, 3, 1, 7, 1, 2, 2, 0, 6, 7, 1, 3, 1, 3, 1, 7, 1, 10, 2, 27, 1, 2, 2, -1, -1, -1, 4, 1, -3, -1, 3, 1, 30, 1, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, -3, 2, 1, 5, 4, -2, 1, 5, -1, 2, 3, 3, 1, 7, 1, -2, 6, 3, -2, 0, 6, 1, 0, 3, 1, 7, 1, 4, 1, 11, 1, 0, 6, 23, 0, -2, 3, 2, -1, 4, 2, -2, 5, 3, 2, 3, 3, 1, 7, 1, -2, 6, 3, 2, 2, 3, 1, 7, 1, 2, 2, 2, 2, 3, 1, 3, 1, 23, 1, 2, 2, 3, 1, -1, 5, 1, -2, -1, 4, 1, 3, 3, 3, 1, 11, 1, 16, 1, 0, 6, 19, 0, 3, 1, 3, 1, -1, 0, 6, 6, 0, -2, 8, 1, 2, 2, 3, 1, 8, 1, -1, -1, 6, 1, 2, 2, 2, 1, 7, 2, -2, -1, 6, 1, 19, 1, 7, 1, 27, 1, 3, 1, 3, 1, 7, 1, 10, 2, 6, 2, 7, 1, 3, 2, 5, 1, 0, 6, 1, 0, 2, 2, 3, 1, 5, 3, -2, -1, 3, 2, -1, 3, 1, 3, 1, 3, 1, 0, 6, 16, 0, 2, 2, 3, 1, -1, 5, 1, -2, -1, 4, 1, -1, -3, 2, 1, 3, 5, -3, 3, 5, 2, 3, 3, 1, 7, 1, -2, 6, 3, 55, 1, -3, 2, 1, -2, 4, 2, -2, -1, -1, 2, 1, -1, 2, 2, 3, 1, 7, 1, -2, 6, 3, -1, 0, 6, 2, 0, 3, 1, 11, 1, 6, 2, 3, 1, -1, 0, 6, 22, 0, 2, 2, 2, 1, -2, -1, 3, 1, -2, -1, -1, -1, 2, 1, 3, 1, 3, 1, 19, 1, 19, 1, 7, 1, 3, 1, 3, 1, 7, 1, -2, 8, 1, 27, 1, 2, 2, 3, 1, 7, 1, -2, -1, -1, 0, 6, 5, 0, 19, 1, 2, 1, 0, 6, 5, 0, 20, 1, 6, 1, 3, 1, 3, 1, 8, 1, -1, -1, 6, 1, 3, 1, 3, 1, 7, 1, 4, 1, 6, 1, 2, 2, 2, 1, -2, 5, 1, -2, -1, 6, 1, 27, 1, 2, 2, 2, 1, 7, 2, -2, 5, 4, 2, 2, 3, 1, 7, 1, -2, -3, 0, 6, 4, 0, 2, 3, 3, 1, 7, 1, -2, 9, 3, 0, 6, 53, 0, 2, 2, 3, 1, -1, 4, 2, -2, 5, 3, 2, 3, 3, 1, 7, 1, -2, 6, 3, 19, 1, 35, 1, 2, 2, 3, 1, 5, 1, 0, 6, 7, 0, 6, 1, 7, 1, 6, 1, 0, 6, 13, 0, 27, 1, 3, 1, 51, 1, 2, 2, 3, 1, 6, 1, 4, 2, 34, 1, 9, 1, 0, 6, 18, 0, 3, 1, 3, 1, 2, 1, 0, 6, 5, 0, 3, 2, 34, 1, 2, 2, 2, 1, 7, 2, -2, 8, 1, 3, 1, 3, 1, 7, 1, 10, 2, 3, 1, 3, 1, 7, 1, -2, -1, 6, 1, 2, 2, 3, 1, 7, 1, -2, 3, 4, 2, 4, 3, 1, 7, 1, -2, 6, 3, 2, 2, 9, 1, 0, 6, 5, 0, -1, 20, 1, 0, 6, 14, 0, 2, 2, 3, 1, 7, 1, -2, 5, 3, 2, 3, 3, 1, 7, 1, -2, -1, 6, 1, 2, 2, 3, 1, 7, 1, -2, 6, 3, 3, 1, 12, 1, -1, 8, 1, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 3, 1, 16, 1, 18, 1, 0, 6, 8, 0, 7, 1, 3, 1, 3, 1, 5, 1, 0, 6, 2, 0, -2, -1, 6, 1, 3, 1, 3, 1, 8, 1, -1, -1, 6, 1, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 19, 1, 7, 1, 27, 1, 2, 2, 3, 1, 7, 1, 2, 1, -1, 6, 1, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 2, 2, 3, 1, -1, 0, 6, 6, 0, -2, -1, 2, 2, 16, 2, 0, 6, 13, 0, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 2, 2, -1, 5, 5, -2, -1, 2, 2, -1, 2, 3, 3, 1, 7, 1, -2, 5, 4, 6, 2, 12, 1, 34, 1, 2, 2, 3, 1, -1, 5, 1, -2, -1, 4, 2, 2, 3, 3, 1, 7, 1, -2, 6, 3, 0, 6, 2, 2, 3, 1, 10, 1, -3, 4, 1, 6, 1, 0, 6, 21, 0, -2, 3, 2, -1, 5, 1, -2, -1, 6, 1, 3, 1, 15, 1, 34, 2, 3, 1, 3, 1, 8, 1, -1, -1, 6, 1, 3, 1, 3, 1, 8, 1, -1, 8, 1, -3, 2, 1, 5, 4, -2, -1, 3, 1, -1, 2, 2, 0, 6, 1, 0, 3, 1, 8, 1, -1, 8, 1, 5, 1, 0, 6, 22, 0, 3, 1, 3, 1, 19, 1, 3, 1, 3, 1, 7, 1, 2, 1, 8, 1, 3, 1, 3, 1, 7, 1, 2, 1, 36, 1, 2, 2, 2, 1, -2, 5, 1, -2, -3, -1, 2, 1, 2, 5, 4, 5, -2, -1, 3, 1, 2, 1, 2, 2, -1, 0, 6, 2, 0, 7, 1, -2, 3, 3, 2, 1, 2, 2, 9, 1, 0, 6, 3, 0, 38, 1, 2, 2, 2, 1, -2, 5, 1, -2, -1, 5, 2, 2, 2, 2, 1, 7, 2, -2, 6, 3, 2, 2, 3, 1, 8, 1, -1, 3, 3, 2, 1, 3, 1, 23, 1, -3, 3, 1, 7, 1, -2, -1, 6, 1, 3, 1, 9, 1, 0, 6, 6, 0, 7, 1, 13, 1, 0, 6, 6, 0, 7, 1, 2, 2, 3, 1, 7, 1, 10, 2, 3, 1, 23, 1, 2, 2, 2, 1, 5, 4, -2, -1, 3, 1, -2, 7, 1, 11, 1, 7, 1, 27, 1, 2, 2, 3, 1, 12, 1, 6, 1, -1, 0, 6, 2, 0, 3, 1, 7, 1, 2, 1, -1, 6, 1, 2, 2, 3, 1, 0, 6, 7, 1, -2, 36, 1, 2, 2, 3, 1, -1, 5, 1, -2, -1, 4, 3, 2, 2, 3, 1, -1, 5, 1, -2, 5, 3, 2, 3, 3, 1, 7, 1, -2, 6, 3, 14, 2, 39, 1, 2, 2, 0, 6, 2, 1, 7, 2, 2, 1, 6, 3, 9, 1, 0, 6, 11, 0, 6, 1, 14, 2, -2, 34, 3, 2, 2, 3, 1, 7, 1, 3, 2, 62, 1, 9, 1, 0, 6, 18, 0, 8, 1, 0, 6, 12, 0, 6, 1, 2, 2, 3, 1, 7, 1, 2, 1, -1, 90, 1, 20, 1, 6, 1, 3, 1, 0, 6, 3, 1, 7, 1, 16, 2, 0, 6, 22, 0, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, -2, 2, 2, 5, 4, -2, 3, 3, 2, 1, 2, 2, 3, 1, 7, 1, -2, 6, 3, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 3, 1, 3, 1, 7, 1, 4, 1, 6, 1, 2, 5, -2, 4, 2, -2, 4, 3, -1, 2, 2, 3, 1, 7, 1, -2, 6, 3, 2, 2, 0, 6, 3, 1, 7, 1, -2, 6, 3, 3, 1, 3, 1, 3, 1, 0, 6, 9, 0, 6, 1, -3, 3, 1, -1, 5, 1, -2, -1, 3, 1, 2, 1, 2, 2, 3, 1, 12, 1, 6, 1, 3, 1, 3, 1, 7, 1, 2, 1, 7, 2, 3, 1, 3, 1, 7, 1, -2, 8, 1, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 2, 2, 2, 1, 7, 2, -2, -1, -1, -1, -2, 17, 1, 0, 6, 2, 0, 7, 1, 2, 2, 3, 1, 7, 1, 4, 1, -1, 0, 6, 5, 0, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 6, 2, 7, 1, 2, 1, -1, 6, 1, 2, 2, 3, 1, 6, 2, -2, -1, 34, 1, 2, 2, 2, 1, 6, 2, -3, -1, 4, 1, -1, -2, 3, 2, 7, 1, 2, 2, 5, 2, 2, 3, 3, 1, 7, 1, 2, 2, 9, 2, 0, 6, 18, 0, 8, 1, 0, 6, 26, 0, 2, 2, 3, 1, -1, 5, 1, 2, 2, 6, 2, 3, 1, 3, 1, 51, 1, 23, 1, 2, 2, 2, 1, -2, 5, 1, 3, 2, 6, 1, 2, 2, 6, 1, 0, 6, 9, 0, 7, 1, 10, 1, 0, 6, 9, 0, 7, 1, 3, 1, 3, 1, 7, 1, 10, 2, 27, 1, 2, 2, 3, 1, 7, 1, 3, 2, 6, 1, 19, 1, 7, 1, 27, 1, 3, 1, 9, 1, 0, 6, 26, 0, 0, 6, 9, 0, 6, 1, 2, 2, 3, 1, -1, 4, 1, 10, 3, 3, 1, 3, 1, 7, 1, 11, 1, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 2, 2, -3, 4, 3, -3, 3, 3, -2, 2, 2, 3, 1, 7, 1, -2, 6, 3, 2, 2, 3, 1, 2, 1, 4, 1, -2, -1, 3, 1, -1, 3, 2, 3, 1, 8, 1, 10, 1, -2, 0, 6, 1, 0, -2, 5, 4, 1, 7, -1, -1, 2, 2, 3, 1, 7, 1, -2, -1, 2, 1, 0, 6, 4, 0, -3, 3, 1, -1, 4, 2, 3, 6, 3, 4, 3, 1, 7, 1, -2, 7, 2, 2, 2, 3, 1, -3, 2, 1, -3, -1, -1, 4, 1, 2, 2, 3, 1, 7, 1, -2, 6, 3, 2, 2, 11, 1, 2, 1, -1, 6, 1, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 2, 2, 3, 1, 5, 3, -2, -1, 6, 1, -2, 0, 6, 1, 0, 3, 1, 7, 1, 2, 2, 6, 2, 2, 2, 3, 1, 2, 1, 0, 6, 5, 0, 3, 2, 6, 1, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 2, 2, 3, 1, 7, 1, -2, -1, -1, 4, 1, 2, 2, 3, 1, 5, 1, -1, -2, -1, 3, 8, 3, 1, 7, 1, 2, 1, 8, 1, 2, 2, 3, 1, 4, 3, -3, 3, 4, -1, 2, 2, -1, -3, 5, 1, -2, 5, 4, 2, 2, 3, 1, 7, 1, -2, 6, 3, 2, 2, -1, -1, 7, 1, 4, 1, 0, 6, 6, 1, 3, 1, 3, 1, 14, 1, 0, 6, 5, 0, 2, 2, 3, 1, -1, 5, 1, -2, -1, 5, 2, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 3, 1, 3, 1, 7, 1, 2, 2, 6, 2, 27, 1, 2, 2, 3, 1, -1, 5, 1, -2, -1, 3, 3, 6, 3, 8, 1, -1, -1, 6, 1, 19, 1, 4, 2, 0, 6, 2, 0, 3, 1, 3, 1, 7, 1, -2, -1, 6, 1, 2, 2, -1, 0, 6, 15, 0, 6, 1, 2, 2, 3, 1, 5, 3, -2, 3, -39183, "t20AgVqpZw8W_9sAAgD2AAAgAOAw0CAC3SP-AAAAEAA", 10, -14, "sSUfaAMAuBV7gQDPJ7QAA1z934Rs7wRZ8FSTAAAAIgAAAADeIAABAN4AACcA_AAB_wAAAN4g", "$6", "kv0AAQB-VgCuIt8X9QDbAnoA-gCm_v0AuS0hAAAAAA_yAAAAAAAAAAAAAAAAAAAAAADdyg", 6, 1, 19, 1, 0, 6, 7, 1, 19, 1, 0, 6, 8, 0, 2, 2, 3, 1, 7, 1, -2, 8, 1, 3, 1, "0gErArCpaBAE_P7eIsUdEF3i_ZRkJpD-9v6t-wADAfs1LtosAMARAAL-_gK-pv4NAZdpAHMBAfwB1PsAARKc-bBanxVIigEhAAEA3v8DAAAAAP4C_gACIAAA3iH_BQAAAAEAAAAAAPwDAAAAAAAAAAAAAAEAAAAA2iAAAQAAAAAFAAAADADvEu4SAO7_4A", 0, 23, 3, 51394, 7, 1, 11, 1, 2, 2, 3, 1, 0, 6, 7, 1, -2, -1, 17, 1, 0, 6, 17, 0, 2, 2, 2, 1, -2, 5, 1, -2, -1, 2, 2, -2, 59, 13605, 1, 170, 33, -170, 1, 133, 2, -13830, -1, -1, 2, 1, 4, 1, -2, 6, 3, 2, 2, 3, 1, 4, 1, 0, 6, 3, 0, -2, 6, 3, 3, 1, 13, 1, 0, 6, 3, 0, 29, 1, 94, -39190, 5, 39096, 2, 2, 3, 1, 7, 1, -2, 6, 3, 2, 1, 0, 6, 18, 0, 6, 1, 2, 1, 0, 6, 17, 0, 15, 1, 10, -43320, 0, 5, 10, -26, 0, 7, "$1", 0, 8, "$2", 0, 6, 20, 43326, 2, 2, 3, 1, -1, 0, 6, 6, 0, -2, -1, -1, 4, 1, 6, 2, 7, 1, 0, 6, 4, 0, 7, 1, 19, 1, 2, 1, "$3", "$4", 8, -42440, 0, 26, 5, 42432, 3, 1, 3, 1, 7, 1, 8, 2, 0, 6, 23, 0, 3, 1, 0, 6, 3, 0, 2, 2, 3, 1, 7, 1, 3, 2, 6, 1, 8, 1, 3, -38872, "E4QrIRIA", 4, -34, 10, -14, 1, 39, 3, -62, 1, 63, 2, -72, 1, 62, 2, -34, 10, 7, 5, -58, 6, 53, 5, -48, 1, -4719, 2, 4761, 3, -56, 1, 73, 1, -18, 3, -25, 1, 43, 4, -51, "3fIC7wUS6TMAAAAAAAA", 0, 15, 11, 38822, 15, 2, 0, 6, 19, 0, 7, 1, 0, 6, 20, 0, 12, 1, "xgnZewAAAAE", 0, 1, 1, 11, 0, 1, "PwGWeWcjh-MBAP8B_wABAA", 0, 1, 28, 12565, 26, -3500, 15, -138, "vZUAZwEAIQDfAA", 4, 8348, 15, 43622, 11, 1, 0, 6, 4, 0, 2, 1, -1, 19, 1, 0, 6, 15, 0, 2, 2, 3, 1, 7, 1, 3, 2, 2, 2, "5ireNgkBBAcBtVqLHmjj_QAB_wEAAAAAAP8B_wABAAA", 28, 12470, 26, -3456, 15, -66, 1, -9162, 2, -8, 1, 8128, 1, 10, 4, 1, 2, 43936, 2, 3, -1, -1, 7, 1, -2, 5, 4, 2, 2, 3, 1, 2, 1, 0, 6, 5, 0, -2, 6, 3, 3, 1, -1, -1, 7, 1, 2, 1, 0, 6, 2, 0, 30, 1, 83, -40019, 0, 11, 4, 39936, 2, 2, 3, 1, 7, 1, -2, 6, 3, 2, 2, -1, 0, 6, 2, 0, 7, 1, -2, -1, 6, 1, 3, 1, 6, 1, 0, 6, 9, 0, 7, 1, 3, 1, 13, 1, 86, -40029, 0, 8, 3, 39943, 6, 1, 2, 2, 3, 1, 7, 1, -2, -1, 3, 1, 0, 6, 3, 0, 3, 1, 3, 1, 12, 1, 5, 1, 0, 6, 29, 0, 3, 1, "$C", 0, 15, "$c", 0, 13, 3, 1, 7, 1, -2, -1, 6, 1, 8, 1, 0, 6, 7, 0, 11, 1, 2, 2, 3, 1, 3, 1, 0, 6, 4, 0, -2, -1, 6, 1, 19, 1, -1, 0, 94, 6, 0, 3, 1, 17, 1, 0, 6, 6, 0, 3, 1, 3, 1, 7, 1, -2, -1, 5, 1, 0, 6, 1, 0, 3, 1, 3, 1, 7, 1, 4, 1, 6, 1, 2, 2, 3, 1, 3, 1, 0, 94, 4, 0, -2, -1, 20, 1, 0, 6, 14, 0, 2, 2, 2, 1, 6, 3, -2, -1, 0, 6, 6, 1, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 2, 2, 3, 1, -1, 0, 94, 6, 0, -2, 6, 3, 13, 2, 0, 6, 6, 0, 20, 1, 0, 6, 14, 0, 2, 2, 2, 1, 7, 2, -2, 6, 3, 2, -8960, -2, 4, 2, 8, 5, 5, 1, -2, -3, 2, 7, 3, 1, 2, 6, -2, -3, 1, 10, -1, 1, 6, -3, -3, 2, 19, -2, 2, 2, -1, 2, 5, 4, 1, 4, 2, -3, -3, 2, 7, 3, 1, 3, 6, -1, 2, 2, 2, 7, 3, 1, -3, -2, -3, -3, 1, 8, -1, 2, 8, -2, 2, 2, -1, -1, 3, 2, -1, 2, 1, 2, 5, -2, -3, -1, 2, 8699, 3, 1, 7, 1, -2, -1, 6, 1, 3, 1, 3, 1, 0, 6, 7, 1, -2, 6, 3, 12, 1, 0, 6, 15, 0, 2, 2, 3, 1, 7, 1, -2, -1, 3, 1, 2, -8801, -1, -1, 1, 6, -3, -3, 1, 8, 2, 2, 2, 6, -2, -3, 2, 7, -1, -1, 1, 6, -3, -3, 1, 8, -1, 2, 8, -2, 4, 2, 3, 4, -1, 2, 1, 2, 5, -2, -3, 2, 11, 1, 6, 1, 18, 2, 8, -2, -3, 2, 7, -1, 1, 8, -3, -3, 2, 19, -2, 3, 2, 2, 6, -1, -1, 1, 6, 2, 27, -2, 2, 2, -1, 2, 5, -1, 2, 1, -3, 3, 1, -1, -3, -1, 2, 5, 3, 1, -3, 2, 2, -2, -3, 1, 7, 3, 8436, 2, 2, 3, 1, 7, 1, 4, 1, 6, 1, -1, 0, 6, 19, 0, 6, 1, -1, 0, 6, 6, 0, 19, 1, 7, 1, 1, -8531, 3, 1, 2, 6, 1, 6, 3, 47, -1, -3, 2, 7, 3, 1, 2, 6, -2, 1, 11, -2, -1, 1, 6, -3, -3, 2, 10, 1, 4, -2, 2, 27, -2, -1, -1, 2, 7, -1, 3, 1, 2, 4, 1, 6, 2, 11, 2, 6, 1, 19, 1, 6, -3, -3, 2, 7, -3, 1, 6, 2, 27, -2, -3, 3, 6, -1, 2, 1, 1, 5, 1, 7, 2, 11, 2, 6, -2, -3, 2, 7, -2, 1, 7, -3, -3, 2, 7, 1, 10, 2, 27, -2, -1, -1, -1, 3, 4, -1, -1, 20, 8050, 2, 2, 3, 1, -1, 0, 6, 6, 0, -2, -1, 6, 1, 3, 1, 3, 1, 6, 1, 0, 6, 6, 0, 6, 1, 20, 1, 1, -8144, 2, 30, -2, -3, 2, 7, -1, -1, 3, 6, -1, 4, 2, 2, 5, 5, 1, -1, 3, 1, -2, -3, 2, 7, 3, 1, 2, 6, -2, -3, 1, 7, 1, 4, 2, 34, 2, 1, -3, 2, 1, 2, 4, 3, 1, 3, 5, -2, -3, 2, 7, 3, 1, 2, 6, -2, -3, 2, 7, 2, 2, -2, -3, -3, 2, 23, -2, -3, -1, 2, 5, -1, -1, 3, 4, -3, -3, 1, 11, 1, 35, -3, -3, 2, 7, 6, 7760, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 0, 6, 3, 1, 3, 1, 7, 1, 11, 1, 2, 2, 0, 6, 3, 1, 7, 1, 3, 2, 19, 1, 1, -7862, 2, 8, -2, -3, 1, 8, -1, -1, 2, 6, -2, 2, 2, 2, 7, -1, -1, 1, 6, 1, 19, 1, 7, 1, 27, -3, -3, 2, 7, 2, 10, 1, 6, 2, 7, -3, 2, 6, -2, 3, 3, 2, 5, -1, 2, 1, -3, -1, -3, -3, 2, 19, -2, -3, -1, 2, 5, -1, -1, 1, 4, 3, 1, -1, 5, 2, 3, 3, 5, 1, 3, 3, -2, -3, 2, 7, 3, 1, 1, 6, 3, 55, -1, 2, 2, 2, 1, 2, 4, 15, 7471, 2, 2, 3, 1, 6, 1, 0, 6, 1, 0, -2, -1, 6, 1, 2, 2, 3, 1, 6, 2, -2, 5, 3, 0, 6, 1, 0, 2, 2, 3, 1, 7, 1, -2, 6, 3, 12, 1, 1, -7582, -1, -1, -2, 2, 1, -2, -3, 2, 7, 3, 1, 1, 6, -3, -3, 2, 11, 1, 6, -3, 2, 23, -2, 2, 2, -1, -1, 2, 3, -1, -1, -1, -1, -2, -3, -3, 1, 19, 1, 19, 1, 7, -3, -3, 2, 7, -1, 1, 8, 2, 27, -2, -3, 2, 7, -1, -1, 1, 6, 1, 19, 1, 7, 1, 20, 1, 6, -3, -3, 1, 8, -1, -1, 1, 6, -3, -3, 1, 7, 1, 4, 2, 6, -2, 2, 2, -1, 2, 5, -1, -1, 1, 6, 2, 27, -2, 2, 2, 2, 7, 4, 1, 2, 5, -2, -3, 8, 7116, 18, 1, 0, 6, 16, 0, 2, 2, 3, 1, -1, 4, 1, 0, 6, 1, 0, -2, 6, 3, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 3, 1, -1, 2, -7214, 3, 1, 3, 5, -2, -3, 2, 7, 3, 1, 2, 62, -2, -3, 2, 1, 2, 4, 3, 1, 3, 5, -2, -3, 2, 7, 3, 1, 1, 6, 1, 19, 2, 35, -2, -3, 1, 12, 1, 6, 1, 7, 1, 19, 1, 27, -3, 2, 51, -2, -3, 2, 6, 1, 4, 1, 34, 1, 27, -3, -3, 2, 7, -3, 2, 34, -2, 2, 2, 2, 7, -1, 1, 8, -3, -3, 2, 7, 1, 10, -3, -3, 2, 7, -1, -1, 2, 6, -2, -3, 2, 7, 4, 1, 2, 3, 14, 6614, 7, 1, 3, 1, 2, 1, 0, 6, 21, 0, 2, 2, 3, 1, 0, 6, 7, 1, -2, -1, 4, 1, -1, 3, 1, 15, 1, 2, -6712, -2, -3, 2, 7, 3, 1, 2, 6, -2, 1, 14, -1, 2, 34, -2, -3, 2, 7, 3, 1, 3, 5, -2, -3, 2, 7, -1, -1, 2, 6, -2, -3, 2, 7, 3, 1, 1, 6, -3, 1, 12, -1, 2, 8, -2, -3, 2, 7, -1, -1, 1, 6, -3, 1, 16, 1, 26, 1, 7, -3, -3, 2, 7, -1, -1, 1, 6, -3, -3, 1, 8, -1, -1, 2, 6, -2, -3, 2, 7, -1, -1, 1, 6, 1, 19, 1, 7, 2, 27, -2, -3, 1, 7, -2, -1, 2, 6, -2, -3, 2, 7, 8, 6246, 18, 1, 0, 6, 9, 0, 3, 1, 14, 1, 0, 6, -1, 6, 1, 25, 1, 1, -6335, -1, 2, 6, -2, -3, 2, 7, -1, 2, 1, 2, 2, 2, 29, -2, -3, 2, 7, -1, -1, 2, 6, -2, 5, 1, 2, 5, -1, 2, 1, -2, 3, 1, -2, -3, 2, 7, 4, 1, 2, 5, 1, 6, 1, 12, 2, 34, -2, -3, -1, 2, 5, -1, 2, 1, 3, 4, -2, -3, 2, 7, 3, 1, 2, 6, -2, -3, 3, 10, -1, 1, 4, 2, 27, 2, 1, -3, -1, 2, 5, -1, -1, 1, 6, -3, 2, 15, 1, 34, 2, 5933, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 4, 1, 0, 6, 15, 0, 7, 1, 4, 1, 0, 6, 23, 0, 2, 2, 3, 1, 4, 1, 1, -6029, -3, 1, 8, -1, -1, 1, 6, -3, -3, 1, 8, -1, 3, 8, -1, 4, 2, 2, 5, -1, -1, -3, 2, 1, -3, -3, 1, 8, -1, 1, 8, 1, 27, -3, -3, 1, 19, -3, -3, 1, 7, -2, 1, 8, -3, -3, 1, 7, -2, 2, 36, -2, 2, 2, -1, 2, 5, 3, 1, -1, -1, 5, 2, 5, 2, 2, 4, -1, -1, -3, 2, 2, -2, -3, 2, 7, 3, 1, -3, 2, 2, -2, 1, 12, 2, 38, -2, 2, 2, -1, 2, 5, -1, 3, 5621, 3, 2, 6, 1, 3, 1, 3, 1, 7, 1, -1, 0, 6, 3, 0, 6, 1, 2, 2, 2, 1, -2, 5, 1, -2, 6, 1, 0, 6, 2, 0, 3, 1, 3, 1, 7, 1, 10, 2, 2, 2, 3, 1, 2, 1, 2, -5730, 2, 5, -2, 2, 2, 2, 7, 3, 1, 2, 6, -2, -3, 1, 8, 3, 1, -3, -2, -3, 3, 23, -1, -3, 2, 7, -1, -1, 1, 6, -3, 1, 15, 1, 7, 1, 19, 2, 7, -2, -3, 2, 7, 1, 10, -3, 2, 23, -2, 4, 2, 2, 5, -1, -1, 2, 3, -1, 1, 7, 1, 11, 1, 7, 2, 27, -2, -3, 1, 12, 1, 6, -3, -3, 1, 7, -2, -1, 2, 6, -2, -3, 2, 7, -1, 2, 36, -2, -3, -1, 2, 5, -1, 3, 1, 2, 4, -2, 5, 5270, -2, -1, 6, 1, -3, 3, 1, -1, 5, 1, -2, 2, 3, 0, 6, 1, 0, 2, 1, 2, 2, 3, 1, 7, 1, -2, 6, 3, 4, 2, 0, 6, 32, 0, 1, -5378, -1, 2, 5, 3, 1, 3, 5, -2, -3, 2, 7, 3, 1, 2, 6, 1, 14, 2, 39, -2, 2, 2, 1, 7, 3, 2, 1, 6, 1, 20, 2, 6, 2, 14, 3, 1, 2, 34, -2, -3, 2, 7, -3, 1, 62, 1, 27, 1, 20, 2, 6, -2, -3, 1, 7, -2, -1, 1, 90, 1, 20, 1, 6, -3, -3, 2, 7, 2, 38, -2, -3, 2, 7, -1, -1, 2, 6, 2, 1, 4, 2, 2, 5, 3, 1, -3, 2, 2, -2, -3, 2, 7, 3, 1, 1, 6, 18, 4741, 2, 2, 3, 1, 3, 1, 0, 6, 4, 0, -2, 6, 3, 2, 2, 3, 1, 7, 1, -2, -1, -1, 0, 6, 5, 0, 3, 1, 3, 1, 7, 1, 2, 2, 6, 2, 6, 1, 1, -4850, -2, -3, 2, 7, -1, -1, 1, 6, -3, -3, 1, 7, 1, 4, 5, 6, 2, 2, 2, 1, 2, 4, 3, 1, 1, 4, 2, 1, -2, -3, 2, 7, 3, 1, 2, 6, -2, -3, 2, 7, 3, 1, 1, 6, -3, -3, 1, 12, 3, 6, -1, -3, -1, 2, 5, -1, -1, -3, 2, 2, -2, -3, 1, 12, 1, 6, -3, -3, 1, 7, 2, 2, 1, 7, -3, -3, 2, 7, -1, 2, 8, -2, -3, 2, 7, -1, -1, 2, 6, -2, 2, 2, 2, 7, -1, -1, 1, 4521, 8, 1, -1, 8, 1, 2, 2, 3, 1, 3, 1, 0, 6, 4, 0, -2, -1, 6, 1, 14, 1, 0, 6, 6, 0, 26, 1, 1, -4617, 2, 1, -1, 1, 19, 2, 7, -2, -3, 1, 7, 1, 4, 2, 6, -2, -3, 2, 7, -1, -1, 2, 6, 1, 6, 1, 7, -2, -1, 2, 6, -2, 2, 3, 2, 6, -1, -1, 2, 34, -2, 2, 2, 3, 6, -1, -1, 1, 4, 2, 1, 2, 1, -3, 2, 7, 2, 2, 3, 5, -2, -3, 2, 7, 2, 2, 1, 27, 2, 34, -2, -3, -1, 2, 5, 2, 2, 1, 6, -3, -3, 1, 51, 2, 23, -2, 2, 2, -1, 2, 5, -3, 2, 6, -2, 1, 15, 1, 7, 1, 19, 1, 7, -3, 8, 4103, 3, 1, 15, 1, 0, 6, 8, 0, 3, 1, 3, 1, 8, 1, -1, 3, 1, 0, 6, 5, 0, 2, 2, 2, 1, -2, 5, 1, -2, -1, 6, 1, 9, 1, 1, -4202, 2, 7, 1, 10, 2, 27, -2, -3, 2, 7, -3, 1, 6, 1, 19, 1, 7, 1, 27, -3, 1, 44, 2, 6, -2, -3, -1, 3, 4, 1, 10, -3, -3, 1, 7, 2, 11, -2, -3, 2, 7, -1, -1, 2, 6, 3, 2, 3, 1, 3, 4, 3, 1, 2, 3, 2, 1, -2, -3, 2, 7, 3, 1, 2, 6, -2, -3, -2, 2, 4, -1, -1, -3, 2, 1, -3, -3, 1, 8, 2, 10, 2, 2, 4, 1, 7, 5, -1, -1, 11, 3791, 15, 1, 0, 6, 19, 0, 3, 1, 3, 1, -1, 0, 6, 6, 0, 2, 1, 8, 1, 3, 1, 3, 1, 7, 1, 2, 1, -1, 2, -3885, -2, -3, 2, 7, -1, -1, 3, 6, -1, -3, 2, 1, 6, 4, 4, 3, -3, -3, 2, 7, 2, 1, 2, 7, -2, 3, 3, -1, 3, 2, -1, -1, -1, 2, 4, -2, -3, 2, 7, 3, 1, 2, 6, -2, 1, 11, -2, -1, 2, 6, -2, -3, 2, 7, -1, -1, 2, 6, -2, -3, 2, 7, -1, -1, 2, 6, -2, 3, 3, 2, 5, -1, -1, 2, 6, -2, -3, 2, 7, 2, 2, 1, 6, 6, 3605, 3, 1, 3, 1, 7, 1, -2, 6, 1, 0, 6, 26, 0, 0, 6, 4, 0, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 2, 2, 3, 1, 3, 1, 1, -3707, -2, -3, 2, 7, -3, 2, 6, -2, -3, 2, 7, -1, -1, 2, 6, -2, -3, 2, 7, -1, -1, -1, 2, 4, -2, -3, 1, 5, 2, 1, -1, 8, 1, -3, -3, 1, 7, -2, 2, 8, -2, 3, 3, 3, 4, 4, 1, -3, 2, 1, -2, 3, 1, -1, 2, 5, 4, 1, 2, 5, -2, -3, 2, 7, 3, 1, 2, 6, -2, -1, -1, 1, 7, 1, 4, 1, 6, -3, -3, 2, 19, -2, -3, -1, 1, 3417, 2, 1, -2, -1, 6, 1, 2, 2, 3, 1, 7, 1, -2, 2, 3, 0, 6, 4, 0, 20, 1, 2, 1, 0, 6, 32, 0, 2, -3512, -1, 2, 1, 2, 5, -2, -3, 2, 7, -1, -1, 1, 6, -3, -3, 2, 7, 2, 2, 1, 6, 2, 27, -2, -3, -1, 2, 5, -1, 3, 1, 3, 3, 1, 6, 1, 8, -1, -1, 1, 6, 2, 19, 1, 6, -3, -3, 2, 7, -1, -1, 2, 6, -2, 1, 16, 2, 6, -2, 3, 3, 2, 5, -1, -1, 1, 6, 1, 19, 1, 7, 2, 27, -2, -3, 2, 7, -1, 1, 8, -3, -3, 1, 7, 2, 11, -2, -3, 2, 7, -1, -1, 2, 34, -2, 2, 2, -1, 2, 5, -1, 2, 3062, 3, 1, -1, 5, 1, -2, -1, 6, 1, 2, 2, 3, 1, 2, 1, 0, 6, 5, 0, -2, -1, 6, 1, 2, 2, 3, 1, 7, 1, -2, 0, 6, 6, 3, 3, 1, 3, 1, 8, 1, 10, 1, 2, 2, 2, -3175, 2, 2, 2, 1, -2, -1, -1, -2, 2, 4, 3, 1, 2, 6, -2, -3, 2, 7, 3, 1, 1, 6, -3, 1, 16, 2, 34, -2, -3, 2, 7, 3, 1, 1, 6, 1, 20, 1, 6, 1, 19, 2, 35, -2, -3, 2, 7, -1, -1, -1, 2, 4, 1, 6, 1, 11, 1, 7, 1, 19, 1, 7, -3, -3, 2, 7, 1, 31, 2, 6, -2, -3, 2, 7, -3, 1, 6, 2, 19, 1, 34, 1, 27, 1, 27, 1, 15, -2, -1, 2, 34, -2, -3, 2, 7, 2, 3, 3, 4, -2, -1, -1, 2, 7, -1, 3, 2561, 4, 1, 2, 1, -2, -1, 3, 1, 2, 1, 2, 2, 3, 1, 5, 1, 0, 6, 5, 0, -1, 6, 1, 2, 2, 12, 1, 0, 6, 2, 0, -1, 6, 1, 2, 2, 3, 1, 8, 1, -1, -1, 6, 1, 2, 1, 3, -2671, 2, 5, -2, -3, 2, 7, 3, 1, 1, 6, -3, -1, -1, 1, 7, 1, 4, 2, 34, -2, -3, 2, 7, 3, 1, 2, 6, -2, -3, 2, 7, -1, -1, 1, 6, -3, 1, 15, 1, 7, -3, 1, 16, 2, 6, -2, -3, 2, 7, -1, -1, 1, 6, -3, -3, 1, 12, 1, 34, -3, -3, 2, 7, -1, -1, 1, 6, 1, 15, 2, 11, -2, -3, 2, 7, -1, -1, 1, 6, 1, 19, 1, 7, -3, 1, 23, -3, -3, 2, 7, -1, -1, 1, 6, -3, -3, 1, 7, 1, 4, 2, 6, -2, -3, 2, 7, -1, -1, 1, 2165, 3, 1, 8, 1, -1, 8, 1, 2, 2, 3, 1, 0, 6, 4, 1, 2, 1, 2, 1, -1, 6, 1, 3, 1, 3, 1, 5, 1, 0, 6, 2, 0, 4, 1, 6, 1, 2, 2, 3, 1, 12, 1, 3, 1, 2, -2237, -2, 3, 2, 2, 6, -1, -1, 2, 6, -2, -3, 2, 7, -1, -1, 2, 6, -2, -3, 2, 7, 3, 1, 2, 6, 1, 19, 2, 34, -2, 2, 2, 2, 7, 3, 1, 2, 6, -2, -3, 2, 7, -1, -1, 1, 6, -3, -3, 2, 7, 3, 1, 1, 6, 2, 27, -2, -3, 2, 7, -1, -1, 2, 6, -2, -3, 1, 7, 1, 4, 1, 6, 1, 20, 1, 6, 1, 7, 1, 19, 2, 27, -2, -3, 2, 7, -1, -1, 1, 6, -3, -3, 1, 12, 1, 6, 1, 20, 2, 6, -2, -3, 3, 1752, 2, 2, 3, 1, 7, 1, -2, -1, 6, 1, 2, 2, -1, 0, 6, 2, 0, 7, 1, 2, 1, -1, 6, 1, 2, 2, -1, 5, 4, 0, 6, 1, 0, -2, -1, 3, 1, 2, 1, 3, 1, 3, 1, 7, 1, 3, 2, 6, 1, 2, 2, 2, -1864, -1, -1, 1, 6, -3, -3, 1, 7, 2, 11, -2, -3, 2, 7, -3, 2, 34, -2, -3, 2, 7, -1, -1, 2, 6, -2, 2, 3, 2, 6, 3, 1, 2, 6, -2, -3, 2, 7, 3, 1, 1, 6, 1, 20, 2, 34, -2, -3, -1, 2, 5, 3, 1, 2, 6, -2, -3, 2, 7, -1, -1, 1, 6, -3, 1, 15, 1, 7, -3, 2, 23, -2, -3, 2, 7, -1, -1, 1, 4, -1, -3, 1, 23, 1, 27, -3, 1, 14, -1, 1, 6, 2, 27, -2, -3, 2, 7, -1, -1, 1, 6, 1, 19, 3, 1328, 7, 1, -2, -1, 6, 1, 0, 78, 1, -1344, 2, 27, -2, -3, 2, 7, -3, 1, 6, -3, -3, 1, 7, 1, 4, 2, 6, -2, 2, 2, -1, 2, 5, -1, 1, 8, -3, -3, 2, 7, 2, 10, -2, -3, 2, 7, -1, -1, 3, 6, -1, -3, -1, 2, 5, 3, 1, -3, 2, 2, -2, -3, 2, 7, 3, 1, 2, 6, 2, 54, -2, -3, 2, 7, 3, 1, 2, 6, -2, -3, 2, 7, -1, -1, 1, 6, -3, -3, 2, 7, 2, 2, 1, 6, 1, 7, 1, 8, -1, 2, 8, -2, -3, 2, 7, -1, -1, 0, 96, 1, 6, 1, 20, 1, 34, -3, 1, 23, -3, -3, 1, 8, -1, 2, 8, -2, 2, 2, -1, 2, 5, -1, -1, 1, 6, 1, 20, 1, 34, -3, -3, 1, 7, -2, 1, 8, -3, -3, 1, 7, -2, -1, 1, 6, -3, -3, 2, 7, -1, 2, 36, -2, -3, 2, 7, -1, -1, 2, 6, -2, -3, 1, 4, 2, 2, -1, -1, 2, 6, -2, -3, 2, 7, 3, 1, 1, 6, 1, 20, 2, 34, -2, -3, -1, 2, 5, -1, -1, 2, 6, -2, -3, 2, 7, -1, -1, 2, 6, -2, -3, 2, 7, 3, 1, 1, 6, -3, 0, 96, -3, 1, 8, 2, 10, -2, -3, 1, 4, 2, 2, -1, -1, -3, 2, 2, -2, -3, 1, 10, -1, 2, 6, -2, 1, 14, -1, 2, 6, -2, -3, 1, 8, -1, -1, 1, 6, -3, -3, 1, 8, -1, 2, 8, -2, -3, 1, 4, -2, -2, -1, 1, 6, -3, -3, 1, 7, 1, 4, 2, 6, -2, -3, 1, 12, 2, 6, -2, -3, 2, 7, -1, -1, 2, 6, -2, -3, 1, 7, -2, -1, 2, 6, -2, 4, 1, 2, 6, -1, -1, -3, -2, -3, -3, 2, 7, -3, 2, 6, -2, -3, 2, 7, -1, -1, 0, 286, "PTXTsaZOhW8jt_TQLgA3XHX_eZ4oUjCtkQYr6u5lOI9l-VcSSp8X0N-Gs7ltiwZN-IWlkhe2vOkS9iF70AJ5p9cxWTxuSW20PVkvddsh0p5iQG5y1vyaL8yJdKEAQk8AAQACAQEAAgQBCwEAAAQIAgUIAQUAAgIBAQEKuQEBDAEKCA4IAAy6AwYBAAUAAwIEAAEHBwEBAgACBAIACAu5BxEICgIKBf4QuwUBBQQAAQMCAwQHAAEBBhMEAAs", 0, 96, "I4iFqGRXwqzTxHWfgg8s5xoLWZI92sfMb6_Z4FD5gysT5V3nBinQsCaT4E-wHSU0puP0Ia6vsQX7cpKJoumbaww4i66BQON6x7KFd26Y-wtQGeLyLbUyMt7PyIMED1MJGQsSA70GAQMBAQEAAgsJAAcBAAICAQMEAgcEBrIAAgEHCQAABAQGBgEABQcCdZoCwAb8ooMDEr8DCQEFAQEACgIJFAFrlwIAvAACDQEDCBgFCAUHtAIXAekBABg", 0, 96, "vFPD1oPCVWBD3HFHO8cY8nB3Lld08zvh6O7tN_DZ--noWM1Sez00HyZKn0e6C7HwEhb25DUhnQJLOKLv_WutBSQOkn_yFk5NgSnbes-u_8shNCGN2ZDmFhHicVkvbXcbDLQOL8ERAgEEAgUSCA3CGgADCAECCQIFDcUKAw4CC8cQGhAHAbsBAQABAQABBAEGAQIAAwEBAAACBQMABAAAAQMAAgADAAMAAQIIBAEDBQACAbQGAwECAQQCBgA", 0, 96, "6MGhK1VuvW8Qi5idTjUfBGAmiNaS1m9LPw0sLQ4R-z6T7cBUbp3tVhby0G-C8F2YkZifcDrZrVacsPYoj3Os9KobMCl1RYObo_LQBC20kGocg7WTnaAo_uyiriaTP2gGBwECAgICAAwAAgoHtgABAAIDAgECBAMAAAEBAgMJAQEDBQEAAQEAAQIDAAJvlgQDAgIFtREBAhISEbkBBgkCAAYGFBPRjaG1AgABCQIDAAIBAg4HDAYLtw0HBQ0", 0, 96, "0QGzKjVl_PqMFBbtF5r3U3aWQw3iqMiudPrqMEsFLo4Vh77Xtwn8V2EnE3mgaQo0z-opyZNL_Kj_cE2ImK1ELNr_X5NGQiPSKZWsYG6apq2QI0p7OFFVbCwXaSmFhnkKBwADAwMFxgscC2lYCgAGBwMFBAAHBAQGAwkEuQ4CLr8CAgUGCAcDAgEIBRS_EBzPAggACAEBBzLAIgMPvwIEAQYCAAgAAwIIBAEGAgIEAQkAAQkBAbMAAAABAgE", 0, 96, "QKIBqIVgLCS_SCvbeGYw4YR1JVVa2l6-bLspjAiJ8ggE1ILQyMNQn7JRG3Kj7cRuNInVCghmfAs08xMeR08GDmRlNN8deRG_fpDqfpe4c22xEA1eZIis_F5-unAAO1MAAAECAQAEAgEDAQMCAAICAAABAgICAQEDAAMDAwEBAAAGAwECAgACAAcBAgECuAUnFAAHtiYFCQYCyAQHF-EEGwAIDMICAAEECwEIAgrcIBIJB9IDBRsEC2BtBSE", 0, 96, "PMrjQSB3NO5adAo4dhnjwXJSS_8Ya1HpT_L_O5e4nCMr3j_e4JTFfsxtMcaGl3e_wMw6PnylTDvr1ADfqhvkvlpLAKdLMcl50lEMZwlbi9K-ARcySzDLfeKMTbNWC5teWgQCCgYKBQIAAggFBAMFvQUeBggPZ3HnAQAQBgEtugIADwQDAQsHBwEGAgQKYFULCwIECgUACQYAAXCavAQNAgoRANEDJgnPAAIABAEBAAACAAACAQEAAQEDAwA", 0, 96, 2, 314, "Xmz4mtroWQRE0I0DVyDUBgFtUQUAMRpquc19Jl6LNvguqQK9brwAVSw3q5LkZXzZjtAAD8kmwS9nAQACAQEAAAEGAQAAAAEAAwABAAAAAgIAAgEAAAoBAQEGAAUBAQAABN_SBQ4GKcT8qABhB5hpAA", 6, 38414, 1, -26737, 5, 26736, 1, -28187, 4, 28186, "loY4xwDDPC4q3Mlt0BKuFGaTeIgAnWNqAPCmbgIFi3w", 3, 33771, 0, 96, "DRgASldNfXwAj84E", 5, 40719, "Q-k54KcfHUQAJS8qdluya-_ShES06E6rWAgOGXlgBQYV5gECAfgA96dgBgE", 3, 39197, 1, -34010, 6, 34009, 1, -24424, 11, 24423, "w4AAefI-VAAe4QD1b4oAiA7RmQCIeABj", 8, 40202, "6TtVlFow3RY", 6, 31809, "_VoA4qhZel8bgHkAYxDnG-sq", 0, 96, "OXyPZ2mujmAumTSXnwEuv-zGnyhfArs9mwH2bBnyGXkRSzZSeYNBQ5LEc78Auk2y8VUJpJZBlV_cNPqk5bjlo4ROrqzRRpAs0VCpMfte7S_lHiG2UZWUGuspVHeNK04AAQYCAQcGAAUBAwkDAgEJAgkC0QsEAhvFAgoDAgcBAQAGCwEEBAEBCNkJBhMCxQMABgQCBA0HCxewCQACAwACAQMCDw4HBAoIvQQB8AIABQEABAAAAQEBAQMAAQQ", 0, 96, "-cgVSLIPGd2cN4nIpEMFVLoQPqlPKGX1M1FJxfpbJLbkKB2elsDNkaqQuFkTW84gBzaayd6OPl0_9jEObiHWOsQ2RO6r5uvQFUFQ2aYtnYkFu26yzZofIghWbmQNG2gCAwEAAQIFAQIBCgUDAQECAAAAAwMB1AUCAAEEAgIDDc0IBQABBgUAGwy2LNQDAAECDQYBAAUCBgIDBgQOvxQCAA4FCXaTBAjEJQEOAALN_g0HBQUKBgYJuwyYfQk", 0, 96, "P3o9lsy-vQSC2x8Mhmwj8o4NK9wR8C1WrJRG6dRXWDCWWAsORqpMUpEIaRJbp4aSaazoxEhXYl-3j5wCNYdiSLPmgL1MqYHPhhQjK7FGibQHLDbMKrClDTbfTW8i_4YBAQhpdAMDCgd1mAhgVQUYAAUCFBi0Pc4HAQYEDQIHBADZHwfWCQYFAgATCb8OAiXNEhLZAgEAFwISAAAGCAUCvgIBAgoDAQMFBQoMAw0FAAQAtBQFBQkWCMoBAwo", 0, 96, "ST9qen43_CZyWYtou_kGuCsTezZuUcJlWv9hlXpsM3fXFcFRz0gpGwYFAiaBJzsOirn31hkEVZIVLDyKehbyICg6ehNCCCQi_6eQHaIGOWf3FxkCjlMT58I0c2qcsXEDCQMECwEDvgEAGwMY1gcGBA332wEHo2MBAxMIBAABEAIEAQEHsCAKGAW8p2sABgUBAgQKBgAHAggEAgHaAQQGEAsA7M4HCAkECATRHwIGFAAACrgCCwMHDAUBCQQ", 0, 96, "fKplSmggsMY0K_MH5hmrZj1IIMCMWnL5VvjKRsAxDsBJHZTt0M1xYLjSSSRLuFDvkb2hMoNkTm52_lZBplnDFHYNfN5_iQw-0EUR6gMR5lNgUcdhr_izR_czZ7QtFZALBLkCAg4DAgcHAQcECgO8EwICBAECBAABAQITDbkRNLkBDRAQEtACB5GdvC7RABgRAwYTuQMBAQEHBAcBBQUAAgCFfAcDAAQFAAkABQW5GwIDEQkIBgLJBgcNFuE", 0, 96, "y1Rx1gCHySvDp2Yidsp7Dtx-RduoexPaK5ICKzc6jeYn1zH14Jxxf11gDybiUwBBlqE9mJFgejHt2D1WcupJlBBBK53DwoHB82S5swfW7Cyd6LlHM__KbxueLHVSD3oBAegQAQMAIQIDvQMREgINvgUHAwICAgMACAEBBw0BAwcKA7kNBQUXBg63CwYACBYCAwEADAHHAgEBCwEBAwYODQAEC-YLCgQEvREHAwAOzTjIAAEWBAsABgAaB9A", 0, 96, "EZNnb5COiXcf0YWq3MkuW40r40zmdhciADQhUKsNgwHf9qI7pEj6J2ObZ9aGd99i1RKPA3LVIwVF72Q-xvCr_1CwEcIcPrzjNHgMZFXVZejX42c4G2c5Ri84_CwTN4XMAwASAAMFCAEMAQMKAQrsxwIBBwUDAwACAQMBAAcAAgMACQIBCAAB2wUGBAEDI84B7Q4dzwUBBQUDAQcFBwgRvwsEAAEAAgEEAgAGAgIJBAECBQILBrtGsgICARA", 0, 96, "dpMAUiv1bg-V0wkmowwAYXuLrNgHxGka-IboaZLC_lado6sAFN2vKReyMVXzTPxyQaKBA5H13fUAhW6rTWYNx3IVgg3wX9OQMSpplGbNwRfTKjAZ5bPzPdzTENB-LGwRAAMGDwG8GgbiBgIBAgAIAQEFAAkFAwYGBAgHvgQBAAQAAAcABwAKGMYsBMcBDwIAAwMCBwEHAQIDAQMKBwO2BAAADwIBAAQDAwQCAQAAAgABBAUFCAkAuhACCgE", 0, 96, "fE7lsItU32m8XX8eL8f-egdHgRAlAluI1aqH7eqd7I6LXXzlb5WeQ7Xc09WpCA0ZACPGSCMcxECqs1JaAMUcqF5qlfncAaXyMz4gNDskrogPjNMUPtFkwIw4Fr4PrnYXBAEIAbUABwIDAgEDAwAAAQECBQoFAwEBAAICBAEFBgmx_6peCAMBBAcDBQoACAABAwMCBbkADwkBDgAlwwwHAASEhQcAE7csBBa8DQoEAAAGCQjpCNwCBgwGCgI", 0, 96, "p2_KViv4oogdBtqaf6O-EOhy5RumG4kA7U3DAxNJ-OfUQw_Ed_araAJmRr3yNki3-sU6SzYVY4HpteTyfrIBaWwZSYFQt-0AdmoqpIj_wBUfryAZyhaV0Bi2aU9KOngODwJiWgwsBAABwiUlA68CAQsCCAABAQgFAAQBFQoBtQkAAwsFAgEBBAIOBQECBMABAwAIBAgSCAICBAAGAAoDy-cBCgMAAAcFCAEDCgYDCQIKsgABAQIAAgADAgE", 0, 96, "WhpWz8kPAC_GNpDvGPYZAEilWA9ZnEUUeEUt8z8nlA0v7iJKPqAZkKTJoW2bq8JUPJAULnbzu2dCZuHOocYoqIN7FCYx3iQq174vFvYfLFsAAAObaQMACAEECQEDAgAAAQABBwIAAAEAAwEFAAMDt_8CAgIBAAYCAQQGBQUGAAEFCgpjVhAAA_sKARAGH7ECAwAABgEEAgEBAAMCAgI", 3, 1, "uK_MxBd-QwKqRxXDbI17AQMAAQADAQIB", 0, 96, "PoMvJ83Qsk5dRHxfcH1BHyb7rJQjR0_5K2dVpSCoSz0POWQBQl8f8gUN3PcPdq7ZDgnuN22DSjMSRgSxzR09S-U7vDsBH2AnLVoThoBC9RdwDb6-iUb8UeK9rB6qVYEAAgQBAgEBBQYBB7cFBAYFAQICAQIBGQAMyQsUGrQAAAABAAAAAQMAAgABAgEBAQABAQEBAQMCAAIAAQMBAAICAwUBAAAAAgIAAwIBAQICAgABAQECAQgBBbSnbpI", 0, 96, "mJFG8fF0WHn5BNu3Rhono0pfYd2kKId4UouJkJxarBdPJmNsKNjGV1EVITBdD_bkAn83bEsiHgB-7Xw9QV4_yaT0wE__rAVHq2t1wNIm2cQ87M1DRx4d243dD_9nm1ACCgkHBwIABgkNBrcWBwYUyatuAQYUAwPbDCMGtgIAAQQAAQUBAAIAAAACCAIEBAAABAMCBAkBAQIAC8EcGMmkgQMF8AMAhILdAAUBAAEBAgECAQAAAgAKAgcCAAI", 0, 96, "5SyczxOJxuhS9Fe_rjdeHL90mZO1HARfrfB9O4aXozZMZkqDQkI3rD0velLROIXg0YhtlBiTJ2C56AJvZAHgjp_xfD98-Vf442cOddm_a2R_XwTYetIVDj_Jz-ElaoACAwQBBgIMAboABQIGAAEFAQIIAQwNArsCAQQGAAcDAAkDAwAAAAIDBAEBAgABBAEDAwMCAgUCuAkNAwEBFAMEAQAMCbMUBRMJBggBzwgEiF4CAgUAAgQADQADAQQ", 0, 96, "VhvyOvGDy4-k7TP2PkA7QiFjWQHQXUKQGIUIyyZvhC1TaP6K985K9BjyQJks2FNTAT5An5TyMQ3sif8IS5EPspuEpQMO419AhloKKjjgPAfZZhboJdynesTFIhRk24AAAQkHvQQZAg0BAnyTxwMCAwEAAQUBAQICBAEBAgABBAAAAQUAAQEACAABBAYAAAIFA7UNCwYPAg0CA8sCByAMCNvoBQcGHQAGCLqndwgb9Qm-BAIBAQECAQEAAgM", 0, 96, "DT08kxlBwFCp5Be1AY6OqnM6XpaSztUctDyKB15JD6sZ36cJQOgpItEbAC0pB408RrmpmlZOEYhEgZfLd-OlIpepJVzjNau97xqtoMYO-COzbv5hwpbnrVdGnHShH2IAAQEBAAUBAQECAgEBAQACAQIBAAIBAAEBAgIBAAEDAgEEAQABAQAEAAAAAQEBAQG4BQECABICAgMADAPaAgABBQMBAQECAAYDAQQCBAEBAQEFAAcCBQHJJgcDywA", 0, 96, "afU9ymwo02M7qzmO9Wk3h2GbWC6LHJTYkxX-tA4xeXESezUnxVeKzjjIzwJ3cyR53zpffR-IxSdNggKl4B45SF-ZpJeDc7eTNirUGpS0ESM0BqDv1VNrckGiXyG3vV0XDQbo8x0KAMUAAgIBDwQYCg65BAMDAQIAAAIBAQUBAAEADAQCBgUABQEAAAIAywQEAQIHAgMDCgwEAwoAtwAABQYBBgQBCwQEBAQAAgIAAgMEAWqWygIABfsBAw0", 0, 96, "cn4ZDpRGyYAxZTWOJY0LxsIoR2PsU1rDIYVN9VOsqAmGnDPLICLcUfnBZhEuUEX484TLxkoBX8nweHMs3uG0p9IL6BFZxz3gK0djPmwsAlIEutjd8BmrP_cZG1dAAfl0AwUNCMQFpp3W4gECBAUCBhAQAQMCAgwAAwQAuwQBAQIBAgcEIwIFBAO8AQcDAg8fAQEDyiYDB8AHAQEIEA0SwwoQK7ELBwYFDiS2AQMGBAUHCwoUAbwPAQoRAxc", 0, 96, "-1BiakTbemXc_DkJ-z1ZYkMAjeCJSymn6fcIAGpeFYA9VCrhz9jn9WplOqW8Cg7xxzgVLLwAi_mcGkT-pfcOrBGXsdr7OHzsNaL2-YGZ40F3j2RPsMIYAdBqFR4BsAIBCAcDBgkOeZjOmgCEBQIAAQlrVqoAXwMFAwIAAZNwAQMDAQQBAwF_hnqQcJIGBWOgvggGCgcDEQ8CBLIQAQgXzwgHEhkA0SvJAgUDCgrwDOj9AQ", 3, 43557, "gv9ZoA", 0, 96, "g9v9JjBgboE98wUdKJH5cgGNewWAiQABDABqoA", 3, 24686, "puNUmZl3AB7N9R14VEmB0CaU2WeYAL_qVatJN84EYR59TFYiOS8RvrofJd9tsphntZFOq14IB5MAfAkNbpcKvAIBAQGeZZsAagCWcAMAAQAAAop3AQCIeACIfwCBggJ8hXuPBg", 3, 27320, "Wz9akmej", 3, 23717, "hf8ZEe4AD_tgDYx4iACcvg", 3, 42484, "09Hoof9FW2eSdwEDDgA", 0, 96, "phQpl0biGYdeAKFeAAy4OnNt6jSJukIKmEATII6QPK1SJfOFRBsAQG5t4pZpZpkAjeeKUtgReVw_dOJLLiSzHY4Z7Uv7BFr8g3i76JX19KaHV6yzyLoZEIuoZEKyWPmcBQTIk3gTdQBfoQBkApptAAMAAwACAQABAAEAAoZ7hXsCBAR7AIkIBWqaZp5iAFUCqVkBEwYDBAQDCAMBc48CAQFtmWeeAbYBAAEDAQABAwABAQEFmWgEAAECBAM", 0, 96, "z9ylKoqbjdRDN8BEsHC5uUmr9DWE-ywmWlDTN4bRv8IAOvOeoi1CDgVeYkVpGGpRASw8SK3h4t6PeY7gIKHVZoMnVWBXKWoAKRM1_WhDCtYA5DQ-fGq_HeKIdz5kXHABAggMAxIDvRAHAB_cBgIEBAjLBwwQAQEJEQYD1QYGAAcFAQPQAQANAQQGAQAEBQICAAIJCgLO-QYCBQfdChEM4gQAFgKEAFcBBwEAAAKeAGQFAgAAlW2TcY94A4U", 0, 96, "iCaXFqFvUSyRnjhpvNErs0GqBYsf2-kv_8Ev_olS9tpO3c3FA0bEkECJSeXJwiSznQInk0tQ9WdxZjuogY1AJ0y2zUmIY4St9JpiAOyQhUP9LNmKSIYzjEvx-I6fmnoABAACAXiOAgIFaZcJyAoCEQsGwAEBAQUBAwMDCAQBAAMDAQALAwEKBQBmVQEBAQIAAAgAAQUABA0BAQIDAAAEAgMDAQkBAAEFAAC8DQYBAgkJFgi2q3EBBAIPAgM", 0, 96, "S0lcCB4WXvk5fltBMf6Q9yj-ZBa0kLM4HZ8OF3mvwxplm_XC7IHT7vuUkpvGLAdmH5wEGKPTSlfYH_u86VJ1gyMdgFdcZ3nQKtYAQOE-KAC6c9C-CwXulwBWbaJtkpAGAAHuFrMjJbsCAQMAAAMAAQUBAgkBAQAEAQEOBgcBaZ0CBcomBb0BAAMEAgECBQUIBAIJAwQAAQIBAQIFBwSzAQIAqFwABgADAAACAAEAAgICkm4AknAAAwGMdYs", 0, 96, "4VQAlI_Um4R7AN1QOZzCQhFCEQfzO85_pGEAN8gAtSggAGwpzZsAjUI8Is8_d28EAIZ7AYR9gwCEBAMEAgAABAACAAABAAJmAF-hchUAeQBYCAOdAHYEDQ1smQM", 4, 25672, "f44NSyROw8jdbwbBMKfFy0FCgvrnDK1L6_A-o3zlm3Lv7Bi_y1HFuiprZ1iA4g4NCnJeCQEKHwgEuAYZGBEBAcsJJMEQIByyAQEKBgADBQIKAggDAwIBAg", 0, 96, "cDrgWCTSAFiw9hIoP8WLBr0AAaoAYACgZAIAAQ", 4, 39358, "Pqb-i1wXFeolJlBcb5UA1PXTYQAJF94ASpL_AS8dnwZBbHzPIhrJT7egfwB6yrqi-WN7CXoADFkjeuu8lXcIQfCdTmeyAB7hWHOh3nIBhnwAhICAhwAAAgF2AJMABGkAnwFgAHcGCQAADMMABAGmWwIDAgQAD4sAhAZ2jQRvngBiAFUBAAkNCSIDBrUKAQAHmQCBf4oJxQI", 0, 96, 3, 42674, "zZvraRRlbSA1UAYEBuSCzdQXcL0LadnkPe6xJNgEj53B7nxTO3yHz75zsf51sOFjshmvWHULpSvOSBOGM3yaK1CwViWjyINoMgazVTpUxtBmB6LhtnA6DTWYyk4ECSfMBAIFAAIAAAUBDQIBAgEBAwUDAQICAAUCCrkDBA8BCgACCwUPBQe-DQMEB-YKCQwBDA64AAUFAAABAwIAAQQDAQMAAQQDh3oBBgIFAAACAQEAAAMFBAQ", 0, 96, "nPA7XoecAuxVqZWpo5_fZ0EC3mE9TCwG401PxB-_-KiWa75Qkvp8sRFdn2NT15GeFZCDJtbglRx-zzaIyM0x8KCbr56ZfH2KDm9ncTY4tA_UHPYa46dMhb-U4qtIqJa7AwMEBwUBAAYAAg4KBAMQANMJDwm8AAIDBQUEBQIBAgIEAQIGAgUBAQEFAgICAAYJswIGAQkBCQSHfQQBAQIBBAgBAQABAQABA7wAAQEAAQAGAAEDAAICAgYDAQM", 0, 96, "TtEPBxgg2T4hGMjezwr1U44Iz14QsugibcAKZfW16V3YoIDeeHxPxtT7ipMXrhjSetalbEmJQ3QENFepAYVpINncfyc2Pr-C7G48ICsGfHFAz7i657OOHI2NZVPlT3EDAQAAAQUAAAADDAUAAwABAQICAAG5EAALCQQBAtYJAhEBDBsEA8UBI8cAAAIABAUCAwAAAQEDAgAAAQABAgEBAQEAAQACAAMAAgIBAQEAAgEFCAACBQAAAQABBAA", 0, 96, "XKULJ1rqp_gBbEPeL42-oOxC-ktI1jahDv2Dd4TdiOFWPiIbV7j-I385JRdY-H1Ef48bA4RAdAFHZCsWc6ivatnnnkx1V5kP6TerD5SxR4ZDCW8GEbppA1T_E1mUOZcBB7MAAwMGAQEDBQcKAgYEAwIEAwUAAQEHsAIAAQQJAAQBAQEAAAEBAAEGAAIAAQIDAgAAAQACAAEBAgUBBAADAQIAAQUABskXEQbIAfcPEd0LBAEBBwUHBgMAAQM", 0, 96, "KgpImTf_lcCDPtATP8qC5qX9lVBJRPuC0784vUkXQikopsS1KXV8u19J6hmo_RwD8YsoqyQ2xAEmC13jHDtVH2JzPv5TVTMBK8RThq9dj9U4I-9v8O0ztYplkL5Cno4ABQG7CAYBBRzPAQABCSfUAAEEAgIBCAEAAQQBAQEBAwIHAQAABQQEAAMBAQEBAAMF4QLTAgAGBAEKBAMBAQIEBQ4IAAYD6ssAOgnCF_8DGNQJBfwOBQAJBgcCwQU", 0, 96, "q4QPlikFZ7-4kSIVrv05kbg_Iw3BiF_wqRlgc28HubOBJB0cIo_MoLnyJgEhLeigixuaOLldJzxsWiIT3TNnopYZxIF6tQ-TfGz43k80d_cqqBBJ_OEgsXXn-V-FUVQDAAgEAAEBAAEBAAQBAAMIAQEABAMBAAEABQNvlAAD5gQABALVAAMLAQIAAgECAgEFAQABAAEBAAIFAAMEAwICAgEBAwMAAbgEBgEECgwBBAEHBQYBAtYCkl4YDhI", 0, 96, "9s_uPJGPg4apFY9-MkJmzmNKgKPa9AFDqk_qRf42wTHpTW8v5QFvcpI77KUGRgC-1bXeAKCxLLgDchdTuwqjj8MprSlrKvZt4wpxpR985fg6zyeAN4SOJkSlLZRqYJMDyQIO3wEBAwIIAA4ADQN-lQAC0wETAxkBC8ULAgMABgIC_gINAgcFALkJCQMW0wMFCQAABBURAMUAAgMFBAECBAEAAAMFAQQDBAcBAQHMBwQABAQVBQYCDADAFhQ", 0, 96, "rBf2AZfG4lTlQpy4HrImU-lV_lsjY1SQs-cDMJnqm4o9K2Zv-T-kMfmTMurjK2ot55NMpzwfn4EmFEhbn1dg2jfgcN9V4ICDhEMJhYQpQruVWfAFRy91SGFoq-9WxozFCAcmyqlZCgUBAAIBCQgLDQgAuAUCBAQHCAEGBwgDBwICAQQBAboDAQoFCw4SAAW8DBABCAIFAA4AzgEFBQ8DAhMCA88IBxMDBw0EX1gUBwEPDQYACrgAAg0BAAY", 0, 96, "EkfaXJM2owzDOojhXHP_OALcKCIUDRvpKPf_3XpWOXeartze3DK0XSr9Z-ubIOplaaVMThDvbaXYVBQ4UHMHgUBa1gNKAJxWd2SVlBqDFxQZA7YzrWiatVtqGTwATWkAAQYBBwEAAAEGAgABAgcBBAAAvgcbBhAC0gQIKcMFAwUBAxoCBQ3S7A0K8QoBBgABBAgDCQIGAwICAAACAAADBAKyJwQBAQADBgoAAALWAwvdFjezDg0bAQDYIQM", 0, 96, "BdBi-gH6WFV5q-a15dWSgU_bWjA3I5u_9IUFLiYI-RUfbLgufTNyhbRyrOme9H0nvFjOM64ssvLvogu1nkcfTLnqzZlv9kpigl8e3wpwK04m8DeEVqnfiHHjLTIV3o3GAQIEAhQPAQEADAQJA7P-BQ0O7vMBBQcCAggEAQQEAAEEAAMAAgIFCQcDBrMARvHFGQjgDAwFAQcEGQL08gHl7wYBAwEHAgAFAhkUAwC3AwICo2iYagIBCAAFABY", 0, 96, "OBi0X-FRswlUDdnUwHZlNGyp2I3Ze12TZeKjOfUqOul_La8F8ekAUsLc7HJJwQ7uUBaO1XYeqOvFsqrVOD7eVOh5GjIbXIrkrZUiTHxqW-0J_UI1LTsMHTzImsX8apTAAgEIAgoFAA0NzyjiFAkMzAwF8gMQjIvMAgYHAQoBAA8FAgsDCGJqC_UB7AMDM9cHknsGAhPIERgIBwi4CQAJLgvGESPCAwMFAgADBQEFAgQHAwsLugUQCwIYAwM", 0, 96, "KkCBXhyakcBD48ywGW8VzyBqrmWwj_EFfyAAY19rnLMIPFxHyvVMfid4NoJL0ey8BwF2cwj_EoQVo7DahEqAq1CuglDahPjeEpOzbigz9ADth-zo_8Xo34X_EE38fpa7AhDsBgsFBwEFAAgPA9MQARHg7gESEAkCAhEHA_LLBwkdBsoHAwABBhsFEAG5BAAAAQADBwICAAGXcgEIAwgBAQIABAEHAgYDwwgACgKIVQMNAgYDBQUFDwQMAAI", 0, 96, "wV0zo1JdBc0uBvv808L2AogG_5UoureesezOSVBouGeCoSHuWY_N9rum18OfHZUkY2XKgHY6mqAAvYKe0bgtjKomMPkijTXaAY6_CRG_L4dFZuT3EFpE1dNEqAhijlQm7yECDAHGAxMBEggGvQwADQcCAAYHF7VCvgEEBgUIBggPBAUEBwW8AysFEr4FAAUHAwABDwAWAAEBuz3CAwABABUDEAUQBAi2ACIQDwABuAEKAQMDAgUBBAIRAQI", 0, 96, 2, 30685, "BZ-vXd_GDkkUrv-r1emOdJpqygV53WHW9wReZZw3LukJTUG5S7vVgEOEVnRirP2qav1qHzHRYo-_2DREKiP1HsATGrfXZiXhIsvAyhNz6b5AOn8LAZosYHebzHmYtgIEAwICAAYIBAMXAgEABgkBuBboDgkcBcYGAh0eBgIAAL0CLgTXCQkb3SsEvxkbCrgNAwIFBgQDAAAEAAYAAQQGcpIGBsMfDhDC9QQGAwcKBQ8AAg8GtgMBBQ", 0, 96, "Yl8LNkpe4lZ_4Fe-ppkABMXoiIZLpfBk28JD6VgkgjdxDhHBXIN9ZYahm0sIc3JUNIWyyG1TwsTEU44QFALyQVNka0Rg4rTnRgACutw0tFNFdFatLHOSLtp1eDQwCV8NAgIAAAECAQ8EAQgAAwa4DgEBBR8JAwa3AAYEAAEDAwMABAAFAgABAAEAAAECAgAAAgMDAgICAgACAAEEAQcFAMgCL8kMBwEGJ8QBG9kLDQABAw0JBBO2AQcPBgU", 0, 96, "jTDyPYHPZsuW6DaOAK_MYbVV1Cc3hQPtxUtKV3vkuxWVbAKIJVtbpKg5G_YAYBudaZjpT-o5ZSoE-Ts1a64cjtcxYm6cmFG_wfn_U3Wf0xu-7iPUmOmX1uo8Q9XtOHkACQEHAQELY2oBEwAC1AcEAgMCAwj7AgYDAwkTCgLRAQUZCbwNAQEAAQAFAAMDAgABAgMCBQEHBAkGCLUDCAEBAAEFAQMDAgEDCwMCAwQCxiHoDyrAAgUKAAECBQA", 0, 96, "O3jA12FpgHMtTDt5TLAodifVF3BpNYprtGJ0H_7cxeYXTyeXYzCavakroFIokJoA_OmpTq4RLcHYQw10PC11jQ4JHAjxN8yXMs0Hvc5hHhwCjP6YLIeyHwDs_1ixvXIOEQm1AQMBAAEACQEICgIdwgAGABkAABQF3B_QEQsTzwIW9AAEAwsZBQ-xFQwFEdorErQAAhoTHsgFBQXfCCEN4QAA6QwNEgPOAQQBAAMCAwMAAQQACwAAAQcBBQs"], "iso-2022-jp-katakana": [12290, 9, 0, -13, 249, -10, -82, 1, 1, 1, 1, 57, 1, 1, -37, 56, -91, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 3, -89, 0], "gb18030-ranges": [0, 128, 36, 37, 2, 4, 7, 9, 5, 6, 31, 32, 8, 10, 6, 9, 1, 3, 4, 6, 3, 4, 1, 3, 1, 2, 4, 5, 17, 18, 7, 8, 15, 16, 24, 25, 3, 4, 4, 5, 29, 30, 98, 99, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 28, 29, 87, 88, 15, 16, 101, 102, 1, 4, 13, 14, 183, 200, 1, 8, 7, 24, 1, 8, 55, 56, 14, 78, 1, 2, 7102, 7103, 2, 6, 1, 3, 2, 4, 7, 9, 9, 10, 1, 3, 1, 2, 5, 6, 112, 113, 86, 87, 1, 2, 3, 4, 12, 13, 10, 11, 62, 74, 4, 14, 22, 26, 2, 6, 110, 111, 6, 7, 1, 2, 3, 4, 4, 5, 2, 6, 2, 3, 1, 2, 1, 6, 2, 3, 5, 9, 5, 6, 10, 11, 3, 4, 5, 6, 13, 15, 2, 6, 6, 8, 37, 38, 3, 4, 11, 12, 25, 26, 82, 83, 333, 343, 10, 50, 100, 176, 4, 40, 13, 28, 3, 6, 10, 12, 16, 18, 8, 10, 8, 10, 3, 4, 2, 4, 18, 22, 31, 33, 2, 3, 54, 55, 1, 2, 2110, 2111, 2, 3, 3, 4, 2, 4, 10, 11, 15, 16, 2, 3, 3, 4, 4, 5, 2, 4, 3, 4, 14, 15, 293, 305, 4, 8, 1, 20, 5, 7, 2, 11, 20, 21, 2, 85, 7, 11, 2, 88, 5, 8, 6, 43, 246, 256, 7, 8, 113, 114, 234, 236, 12, 15, 2, 3, 34, 35, 9, 10, 2, 4, 2, 3, 113, 114, 43, 44, 298, 299, 111, 112, 11, 12, 765, 766, 85, 86, 96, 98, 14, 15, 147, 148, 218, 219, 287, 288, 113, 114, 885, 886, 264, 265, 471, 472, 116, 117, 4, 5, 43, 44, 248, 249, 373, 374, 20, 21, 193, 194, 5, 6, 82, 83, 16, 17, 441, 442, 50, 51, 2, 3, 4, 6, 1, 3, 20, 21, 3, 4, 22, 24, 703, 704, 39, 44, 111, 118, 148, 149, 81, 20983, 14426, 18374, 1, 92, 1, 31, 13, 46, 1, 4, 5, 6, 7, 8, 4, 6, 4, 6, 8, 9, 7, 8, 16, 18, 14, 15, 4295, 4296, 76, 77, 27, 28, 81, 82, 9, 10, 26, 30, 1, 2, 1, 3, 3, 4, 6, 9, 1, 3, 2, 5, 1030, 1032, 1, 19, 4, 14, 1, 5, 1, 15, 1, 5, 149, 243, 129, 135, 149606, 26], gb18030: [1, 19970, 3, 1, 1, 8, -2, 1, 4, 3, 7, -1, -2, -2, 2, 4, -1, -1, -1, -1, 1, 4, 3, 3, -1, -1, -3, 1, 6, -3, -1, 2, 2, 4, 6, 2, 1, 6, 1, -2, 10, 1, 7, 1, -1, -2, 1, 5, 2, 5, -1, 3, 2, 1, 4, 1, 6, 3, 4, -2, 4, 1, 3, 2, 1, 9, -3, 2, 2, -1, 3, 7, -3, -1, 2, 3, -1, 3, 3, -1, -2, 3, 3, -1, -1, -1, 7, 1, 2, 2, 5, 5, 2, 5, -3, -1, 2, 4, 3, 2, -2, -1, -1, -1, -1, -1, 5, 2, 2, 1, 6, 1, 1, 5, -1, -1, 2, 10, -3, -1, 2, 1, 2, 1, 2, 2, -2, 4, 1, -2, 3, 2, 3, 2, -2, -1, -1, -1, 2, 1, 2, 1, 3, 1, -1, 2, 1, 2, 1, -1, 1, 6, -1, 5, 2, 9, 1, 3, 1, 4, 3, 3, 1, 5, 4, -2, -1, 1, 4, -1, 2, 1, -1, 2, 3, -3, -1, 4, 1, -1, 3, 1, 13, 1, -2, 2, 1, -1, 3, 1, -3, 2, 1, -1, 3, 1, -2, -3, 11, 3, -1, -1, 4, 1, 3, 1, 3, 2, -1, 5, 2, 4, 1, -1, 8, 1, 6, 1, 9, 1, 3, 2, 2, 1, 4, 3, 2, 1, 4, 1, 21, 1, -1, -1, 2, 3, 5, 1, 7, 1, 19, 2, 6, 1, 3, 1, 11, 1, 4, 2, 4, 3, -1, 5, 1, 10, 1, 3, 2, 6, 1, 14, 1, 29, 1, -3, 1, 4, -2, -1, 3, 1, 2, 1, 3, 3, -1, 5, 1, 2, 1, 2, 1, 2, 1, 1, 4, -2, 1, 7, 2, 3, 2, 3, 2, 1, 2, 2, 4, 2, 2, 1, -3, -1, 3, 2, -1, -1, 5, 2, 2, 2, 1, 5, 3, 3, 2, 3, 3, 1, -1, -2, -1, 2, 2, -1, 9, 1, -1, 2, 1, 2, 2, 6, 1, -1, -1, 2, 2, -1, -2, 1, 6, 2, 5, -3, 2, 1, 2, 2, 3, 2, 1, 6, 2, 1, 3, 1, 3, 1, -2, -1, -2, 2, 1, 2, 1, 1, 6, -1, 6, 5, -1, 2, 2, 2, 2, -1, 5, 1, -1, 2, 1, 3, 1, -1, -1, 4, 2, 2, 1, 10, 1, -1, -1, 5, 2, 7, 1, 2, 1, 7, 1, -1, 4, 7, 3, 6, 10, 3, 3, 2, 3, 1, -1, -1, 4, 1, -1, 3, 1, -1, 6, 1, 4, 1, 11, 1, 8, 1, 3, 2, 4, 3, -2, 4, 1, -1, 4, 2, -3, 2, 2, 2, 1, -2, 2, 1, 3, 1, 3, 1, 10, 1, 2, 3, -2, -1, -1, -1, 3, 4, -2, -3, 2, 3, -1, -1, 1, 7, -2, -1, 2, 1, 1, 4, -3, -2, 4, 1, 2, 1, -1, 2, 3, -1, 7, 3, 2, 1, -1, 2, 1, -1, 2, 1, -2, -2, 4, 2, 7, 1, 4, 1, 3, 1, -1, 5, 2, 3, 6, 2, 1, -1, 1, 4, 3, 1, 2, 2, 1, 4, 1, 12, 1, 5, 3, 3, -1, -2, -1, -3, 1, 8, 3, 3, -1, 1, 5, 2, 1, 1, 4, 1, 5, -2, 2, 2, -2, -2, -1, 2, 1, 2, 1, -1, -1, 4, 2, -1, 1, 8, 5, 2, -1, -1, -1, 8, 1, -3, 2, 4, 2, 3, -1, -1, -1, 4, 1, -2, -3, -1, 2, 3, -3, 5, 1, -2, 1, 8, -1, -1, 3, 2, 2, 1, -1, -1, 1, 4, -1, 2, 4, 1, 10, -1, -2, 5, 4, 2, 6, 3, 2, 6, 2, -1, -2, -1, 4, 1, -2, 5, 1, 2, 3, 6, 1, 4, 1, -1, 2, 3, 2, 1, -1, -1, 1, 4, 3, 1, 4, 1, -1, -2, -1, -2, 2, 1, 5, 2, 4, 1, 5, 2, 4, 1, 2, 1, 2, 4, -1, 6, 3, 2, 4, -2, -1, 2, 5, 3, 5, -1, 2, 1, 3, 1, 2, 2, -2, 7, 1, 9, 1, -1, -1, -1, -1, -1, -1, 5, 2, 3, 2, 2, 1, 3, 2, 1, 4, 5, 1, -2, -1, -1, 1, 4, -1, 2, 3, 2, 1, -2, -1, 5, 1, -2, 6, 2, 2, 2, -1, 8, 2, 2, 1, 2, 1, 3, 2, 2, 2, 4, 1, 3, 2, -2, -1, 2, 1, -1, 3, 1, 12, 1, 5, 3, 2, 1, 2, 3, 5, 1, -1, 3, 1, 4, 5, 4, 1, 4, 1, 8, 2, 7, 2, 3, 2, 15, 1, 11, 1, 7, 1, 4, 1, 13, 1, 9, 1, 2, 1, 2, 1, -2, 1, 6, 6, 1, -1, 2, 1, 2, 2, 3, 2, 2, 2, 3, 3, -2, -1, 17, 3, 2, 1, 3, 1, 4, 1, -3, 2, 5, 5, 1, 2, 3, -1, -1, 4, 1, 2, 1, -1, 5, 6, 2, 1, 2, 8, -1, -1, 1, 4, -1, 3, 1, 2, 1, 3, 2, 5, 2, 4, 5, 5, 2, 7, 2, 4, 1, 1, 5, -2, -1, -1, 3, 2, -1, 3, 1, 9, 1, 7, 2, 2, 1, 2, 2, -1, 2, 2, 2, 3, -1, 3, 2, 8, 1, -1, 4, 1, 3, 1, 2, 3, 2, 1, -1, 3, 1, 3, 2, -1, 3, 1, 3, 1, 3, 1, 4, 1, -1, 2, 2, 5, 1, 5, 1, 4, 1, 14, 1, 7, 1, 3, 2, 2, 1, 3, 1, 5, 1, 6, 1, 5, 1, 17, 2, -1, -2, -1, 3, 1, 8, 1, 5, 2, 3, 2, 8, 2, 18, 2, 4, 1, 3, 1, 11, 1, 3, 1, 14, 1, 6, 1, -2, -1, 2, 1, 2, 1, 2, 1, 8, 1, -1, 2, 1, 5, 1, -1, 4, 1, 2, 3, -2, 2, 1, 4, 1, -2, -1, -3, -3, 2, 1, 2, 1, 1, 4, 4, 1, -2, 2, 1, -3, 2, 1, -2, 2, 1, 1, 5, 5, 1, -1, 2, 1, 13, 1, -2, -1, 3, 2, 3, 1, 1, 4, -3, 2, 1, 4, 1, 2, 2, -2, 4, 1, 4, 1, 2, 3, 2, 4, 2, 2, 6, 1, -1, 2, 1, 7, 1, 3, 1, 4, 2, 2, 5, -2, -1, 5, 2, -1, 2, 1, 3, 1, 12, 1, -1, 3, 1, -1, -1, 2, 7, 4, 1, -1, 4, 1, 3, 1, 2, 1, 2, 2, -1, 3, 1, 7, 1, -2, -1, 5, 1, 3, 1, 5, 1, 2, 1, 10, 2, 4, 1, 7, 1, 4, 1, 2, 1, 9, 1, 2, 4, 4, 1, 18, 1, 7, 1, 14, 2, 7, 1, -2, 2, 1, 5, 1, 2, 1, 6, 2, 2, 1, 5, 1, -1, -1, -1, 3, 1, 3, 1, -2, 2, 1, 2, 1, -1, 5, 1, 23, 1, 12, 1, 26, 2, -1, 2, 1, 8, 1, 15, 1, -2, -3, 1, 7, 2, 1, 2, 5, -2, 3, 1, -2, -1, 4, 1, 2, 1, 2, 1, -2, -3, -3, 2, 2, 3, 1, -1, -1, 1, 8, 3, 7, 4, 2, 2, 1, 1, 4, 3, 2, 2, 3, -1, 4, 4, 3, 1, -1, 9, 2, -3, 2, 1, 2, 2, 5, 1, -1, 7, 1, 2, 5, -1, 2, 1, -1, 2, 1, 4, 2, -1, 2, 1, -3, -1, -1, 4, 2, -1, -2, 4, 1, 4, 1, 2, 1, 3, 1, 2, 11, 2, 1, 2, 4, 3, 4, 3, 1, 4, 1, -1, -2, -1, 7, 2, -2, 7, 1, 4, 2, -1, 5, 2, 3, 1, 2, 2, 2, 2, -1, 5, 7, 5, 2, -1, 3, 3, -1, -1, -1, 4, 2, -1, -1, 2, 1, 6, 1, 6, 1, 6, 1, 7, 1, 2, 1, -3, -1, 2, 1, 2, 1, 10, 1, 6, 1, 2, 2, 6, 2, 5, 1, -1, 4, 1, 2, 1, 5, 1, -1, -2, 3, 1, 5, 2, 8, 1, 8, 2, 2, 1, 11, 3, 2, 1, -1, 11, 1, -1, 2, 2, 4, 1, 13, 1, 22, 1, 3, 1, 25, 1, 13, 1, 7, 1, 13, 1, -1, 2, 2, 2, 2, 1, 5, 2, 1, -2, 2, 4, 5, 1, 2, 2, -3, -2, 3, 1, 2, 1, 2, 3, -3, 8, 6, 5, 2, 2, 2, 5, 1, 2, 2, 4, 3, -1, 6, 2, 7, 1, 5, 2, 2, 1, 2, 1, 15, 2, -3, -1, -1, 1, 4, 3, 2, -1, 2, 2, 3, 2, -3, 1, 5, -2, -1, 4, 3, 5, 3, 5, 1, -1, 4, 5, 10, 1, 6, 2, 2, 3, 4, 1, 12, 1, -1, 9, 1, -1, 2, 2, 3, 1, 3, 7, -1, 3, 2, -1, -1, -1, -1, 2, 2, 3, 1, 4, 2, -3, 2, 2, -1, -1, 7, 1, -2, 3, 1, 15, 1, -1, -2, 4, 4, 3, 1, -2, -1, 2, 1, -2, 2, 2, -2, 3, 1, -1, -1, 3, 2, -3, -2, 3, 6, -1, 2, 1, -1, 2, 3, 4, 1, 6, 1, -1, 2, 1, 6, 2, -1, 4, 1, 5, 2, 2, 4, 2, 1, -2, 3, 4, 3, 4, 2, 1, 2, 2, 2, 1, 2, 1, -2, 2, 2, 3, 1, 2, 1, 2, 1, -1, 3, 10, 2, 1, 2, 3, -1, 2, 3, -1, 2, 3, 3, 2, 3, 7, 5, 1, 5, 1, 2, 2, -1, 7, 3, -1, 2, 1, -1, 2, 1, 3, 1, 2, 2, 4, 1, 2, 3, 1, 7, 2, 2, 2, 1, -1, 1, 6, 3, 1, 4, 2, 2, 1, 4, 2, -1, -1, 3, 1, -2, -1, 2, 2, 2, 1, -1, 2, 1, -3, -1, -2, 3, 1, 2, 1, 8, 2, 3, 2, 5, 2, 3, 1, 2, 1, -1, -1, -2, 5, 2, 1, 4, 2, 6, -2, 2, 1, 5, 2, 4, 2, -1, 3, 2, 5, 3, 4, 1, 4, 1, 2, 2, -2, 3, 2, 19, 1, 8, 1, -1, -1, -1, 2, 1, 3, 1, 7, 1, 4, 1, 4, 1, 7, 2, 4, 1, -1, 19, 1, 2, 1, 5, 1, 8, 1, 9, 1, 2, 3, 10, 1, 6, 1, 3, 1, 5, 1, -1, 5, 2, -2, 17, 1, 14, 1, 9, 1, 6, 1, -1, -1, 2, 9, 1, 4, 3, 2, -1, -2, 4, 2, -1, -1, 4, 1, 2, 2, 5, 1, 1, 5, 3, 1, -3, 2, 4, 3, 4, 2, 1, 7, 1, 2, 1, -2, 2, 8, 2, 1, 2, 1, 2, 1, -1, 3, 3, 4, 1, 6, 2, -3, 1, 4, 3, 2, 1, 4, 2, 2, 2, 1, 4, 2, 3, 1, 3, 1, -1, -3, 2, 1, -1, 1, 7, -3, -1, -3, 2, 7, 2, 1, -2, 2, 5, 1, 4, -1, -2, 4, 2, 1, 4, 4, 2, 4, 3, 2, 1, 4, 1, 3, 1, -2, 2, 9, -1, 3, 2, 2, 1, 6, 1, 2, 2, 4, 1, -2, 2, 2, -1, 4, 6, 8, 1, -2, 3, 3, -1, 3, 1, 2, 2, 4, 1, 2, 2, 4, 2, -1, 4, 1, 1, 4, -1, -3, 3, 1, -1, 7, 1, -1, -2, -1, 1, 4, -3, 2, 1, 2, 2, -2, -1, -1, 5, 1, -1, 2, 1, 3, 1, 1, 4, 3, 1, 7, 1, -1, -2, 5, 1, 2, 2, 4, 1, -1, -1, -1, 4, 1, -1, 2, 4, 5, 1, 2, 2, 2, 2, 6, 2, -2, -1, 4, 2, 3, 1, -1, 6, 2, 5, 1, 2, 1, -1, -1, 2, 1, 1, 5, 7, 1, -1, 3, 1, 5, 1, 8, 1, -1, 3, 1, 10, 1, 7, 3, -1, -2, 9, 1, 2, 2, 2, 2, 4, 1, 5, 1, 4, 1, 2, 1, -3, 4, 1, -1, -2, -1, 3, 1, -1, 2, 1, 7, 1, -2, -1, 4, 1, 5, 2, 3, 1, -1, -1, 25, 1, 8, 1, 8, 1, 5, 1, 12, 1, 5, 1, 2, 1, 4, 2, -3, -2, 2, 1, 5, 2, 2, 1, 2, 2, 2, 1, -1, 3, 1, 2, 2, -1, -1, 3, 2, 2, 2, 4, 1, 3, 2, -1, -1, 2, 1, 15, 1, 3, 1, 3, 2, -2, 3, 1, -1, -1, 2, 2, -1, 2, 1, -2, -1, -1, -1, -1, 8, 2, 2, 1, 3, 2, -1, 4, 4, -2, 2, 2, 3, 1, 8, 2, -1, 2, 1, 2, 5, 4, 6, 2, 2, 5, 1, -1, 2, 2, 3, 1, -1, -1, 3, 2, 3, 3, 3, 1, "$9", 2, 21, 5, 3, -1, 2, 1, -1, 7, 1, 2, 2, 2, 1, 2, 6, 4, 1, -1, 2, 1, -1, -1, 5, 1, 3, 3, -1, 2, 2, 3, 1, 3, 1, -1, 2, 1, 4, 1, 4, 1, 4, 1, 5, 2, 9, 1, 5, 2, 5, 1, 4, 1, 4, 1, 26, 1, -1, 8, 3, 2, 1, 6, 1, -1, 2, 3, -1, 2, 1, -1, 7, 3, 1, 4, 2, 1, 3, 1, -2, 3, 1, -1, -1, 6, 1, -1, -1, 1, 4, -1, 2, 1, 4, 2, 2, 1, 2, 1, -1, 2, 2, -1, 2, 2, -1, 1, 4, 2, 1, 5, 1, -1, 3, 4, 2, 1, 2, 3, -1, -2, -2, -1, 4, 1, -1, -2, 2, 1, 2, 1, -1, -1, 4, 1, 4, 1, -1, -2, -1, 3, 3, -2, -1, -2, -2, -1, 2, 2, -1, 8, 4, -1, 10, 2, 3, 6, -3, -3, -1, 2, 1, 3, 1, 2, 1, 2, 1, -3, 8, 2, -1, 4, 2, -1, 1, 6, -2, -1, 2, 1, 5, 2, 3, 1, 7, 1, 7, 2, 3, 2, 2, 3, -3, 1, 7, -3, -1, -1, -2, 10, 3, 1, 10, 8, 1, -1, 9, 2, -1, -1, 8, 2, 3, 1, 3, 1, 10, 1, 3, 1, 4, 3, -1, 2, 2, -1, 10, 1, -1, 6, 1, -1, -1, 4, 1, 2, 1, 2, 1, -1, 5, 1, 2, 1, 10, 1, -1, 3, 2, 3, 1, -2, 4, 1, 3, 1, 5, 1, -1, -2, -1, 12, 1, 3, 2, 8, 1, 2, 1, 3, 1, 4, 1, 3, 1, -1, 2, 1, 17, 1, 2, 1, 2, 1, 2, 1, -2, 2, 1, 2, 1, 4, 1, 2, 1, 2, 1, 5, 1, 2, 3, 3, 1, -1, -1, -1, 3, 4, 6, 1, 2, 2, 2, 1, 10, 2, 2, 2, -1, 3, 1, 2, 1, 2, 1, 3, 1, 5, 1, 8, 1, -1, -1, -1, 3, 1, 6, 1, 3, 1, 12, 2, 4, 1, 10, 1, -1, 10, 1, 12, 1, 6, 2, -1, 6, 1, -1, 4, 1, -1, 3, 1, 7, 1, 5, 2, 2, 1, 8, 1, 7, 1, -2, 5, 1, 3, 1, 11, 1, 7, 1, 2, 1, 3, 1, 3, 1, 9, 1, -1, 5, 2, 8, 1, 8, 1, -1, 115, 2, 2, 5, 10, 1, 4, 1, -1, 3, 2, 4, 1, 2, 1, -2, 2, 1, 12, 1, 8, 1, 2, 6, 14, 1, -1, 4, 2, 1, 4, -2, -3, 4, 1, 2, 2, 3, 1, 5, 2, 8, 1, 8, 1, -3, 7, 1, -1, 2, 2, 5, 1, -1, -1, 2, 1, 1, 6, -1, 5, 1, 8, 1, 3, 2, 3, 1, -1, 3, 1, 3, 1, 7, 1, 5, 3, -1, -3, 1, 4, 3, 4, -1, -2, -1, 3, 5, -3, -1, 2, 2, 4, 1, 2, 1, 3, 3, -2, 5, 2, 3, 1, -2, 3, 1, 2, 7, 3, 1, 5, 3, -1, -1, -1, 2, 1, 3, 1, 2, 2, -3, -2, 2, 2, 2, 1, 2, 2, 4, 2, -1, 3, 1, -1, -1, 1, 5, -3, 2, 2, 4, 3, -2, 4, 5, 3, 2, -2, 3, 1, 2, 1, 3, 5, 2, 1, -1, 1, 4, 2, 1, -1, 2, 2, 1, 4, -1, 1, 4, 2, 5, 2, 1, 2, 1, 3, 1, -2, 3, 1, 4, 1, -1, 2, 3, 6, 1, -1, 2, 1, 2, 2, 2, 1, -3, 3, 1, -1, 2, 4, -1, -1, 1, 4, -2, -3, 4, 4, -2, -1, -1, 2, 1, 2, 1, 2, 1, 3, 2, 4, 2, 2, 1, 3, 2, 5, 1, 2, 1, 2, 1, 2, 2, -1, 2, 1, -1, 5, 3, -1, 1, 5, -2, 2, 6, 2, 2, 2, 1, 2, 1, 6, 1, 3, 2, 3, 4, 4, 2, 4, 1, -1, 3, 2, -2, 2, 2, -1, 4, 1, -2, 2, 1, -1, 3, 1, -1, -1, 8, 2, 4, 1, -1, -3, 2, 2, -1, 2, 2, 2, 1, 2, 1, -2, 3, 3, -1, -1, -1, 2, 1, -1, 3, 1, -1, 8, 1, 8, 2, 4, 2, -2, -1, 2, 1, 3, 1, 11, 1, 2, 1, 15, 1, 3, 2, -1, 2, 2, 5, 1, 7, 2, 3, 1, 2, 1, 2, 1, 2, 1, -1, 2, 1, 4, 1, -1, -2, -1, 2, 2, -2, 3, 1, 4, 2, 3, 1, 3, 1, -1, -1, -3, 2, 1, 3, 1, 1, 5, -3, 10, 2, 4, 1, 8, 1, 3, 1, 2, 1, 5, 1, 3, 1, 10, 3, 3, 1, 4, 1, -3, -1, -1, -1, 2, 1, 7, 1, 7, 1, 3, 2, -1, 10, 1, 3, 1, -1, 3, 1, 3, 1, 6, 1, 3, 2, -1, 3, 1, -1, -1, 7, 1, 3, 1, 2, 2, 13, 3, 4, 1, 5, 1, 11, 1, 2, 1, 2, 1, 6, 1, -1, 6, 1, 7, 1, 11, 2, -1, 12, 2, 33, 2, 8, 1, 7, 2, 17, 1, 3, 1, 18, 1, 2, 1, 14, 1, 12, 1, -3, 4, 2, -2, 3, 1, -1, 4, 3, 3, 1, 3, 2, 3, 1, -1, 2, 3, 2, 1, 13, 2, 1, 5, -1, 3, 1, -3, 2, 3, 4, 4, -1, 13, 1, -2, 3, 1, 4, 1, -1, 1, 4, -3, 7, 1, -1, 3, 1, 11, 1, 5, 2, 2, 1, -1, -2, 11, 3, 8, 1, 4, 3, 14, 1, 4, 1, -1, -1, 13, 1, -1, 5, 1, -1, 5, 3, 3, 1, 4, 2, -1, 2, 1, 6, 1, 5, 1, 4, 1, 4, 1, 3, 1, 5, 2, 7, 2, 3, 1, 6, 1, -1, 3, 1, 9, 1, 10, 1, 5, 1, 10, 2, 4, 1, -1, 6, 1, 10, 1, 12, 1, 22, 1, 10, 1, -1, -1, 3, 1, 3, 2, 1, 5, -1, -1, 7, 1, 3, 2, 4, 2, 3, 1, 2, 1, -1, -1, -1, -1, 3, 2, -2, 4, 1, 2, 2, 2, 1, 3, 1, 3, 2, 2, 4, 5, 1, -2, -1, 2, 1, 12, 1, 12, 1, -2, 3, 2, -1, 7, 4, 3, 4, 4, 1, -2, -1, 4, 1, -1, 2, 1, 96, 29162, 3, -46374, "txH94FoBDkm3D_EAAgD2AAACAP4wAPDfIQAAAAAAEAA", 8, -14, 2, 6, 2, -8, "sSUfPvAA6P0a_t4u4op_-vGGkQIy6vv030INAPQAuBb-Df1vgQDPAJ87AE52bgAAACIAAAAAAAAAAAAAAAAB_wAAAAAAAAAAAAAAAAAAAAQA2iAAAd4B_wAh4CE", "$5", 1, -220, 1, 342, 2, -3, -1, 1, 3711, 96, 46354, 10, -50198, 6, 50668, 20, -49892, 20, -40, 10, -40, "rMAgxw", 10, -46414, 2, 46404, 12, -50704, 2, 50692, 95, -492, 1, -46565, 3, 52992, 1, 225, 89, -225, 1, 133, 96, -6654, 83, -46597, 11, 46814, 96, -311, 86, -46597, 8, 46726, 96, -223, "$1", 8, 127, "$2", 1, 5763, -1, 1, -2, 4, 1, 2, 30, 2, 2, 2, 4, 2, -4, 4, 2, 2, -46, 2, 34, 2, -6, 1, -8, 1, -25, 2, 25, 9, -5790, 96, -154, "$C", 15, 58, "$c", 13, 0, 2, -58610, "2TkBDw_PAwIeAAAAAQA", 4, 140, 1, 123, 1, 9, -3, 1, 46, 2, 19, 1, 87, 36, 656, 15, 13, 3, 3, 2, 38, 4, 36, 1, 35, 1, -885, 1, 3452, 2, 10, 11, 47005, "Ad_sEQH_Af8", "$8", "6mbtBAOwZwACHOMAAAE", 4, 58727, 37, -46792, 21, 46755, 9, -47041, 1, 633, 2, 234, 3, 12, "oSIJAgACWrEB_T4PsSwzAAAAAADLAQDoOhG1OQ", 3, 51155, 1, -46827, 2, -98, 2, 96, 1, -249, 2, 150, 10, 52650, 4, 1, 14, 1, 4, 1, 1, -52782, 12, -79, 1, 11, 13, 47084, 76, -49921, 15, 49845, 2, -30004, -1, 6, 2, 2, 2, 2, 9, -2, 4, 3, -1, 6, 1, 3, 1, 4, 1, -1, 3, 3, 2, 4, 2, 2, 3, 1, 1, 4, 2, 1, 2, 1, 2, 1, 4, 3, 13, 2, 2, 1, -1, 4, 1, 8, 1, 11, 1, -2, 2, 1, 94, 27790, 12, -27884, 5, 1, 2, 1, -1, -1, 2, 1, 2, 1, 4, 1, 4, 1, 3, 1, 2, 1, 6, 1, -1, 2, 1, -3, 3, 2, 2, 1, 4, 2, -1, 5, 1, 2, 3, -1, 7, 3, 4, 1, -1, 4, 1, -1, -1, 3, 1, 4, 1, 5, 1, 94, 27750, 11, -27844, -1, 2, 2, 4, 2, 9, 2, 6, 2, 2, 1, -2, -1, -1, -1, -1, 2, 1, 5, 4, 4, 1, 19, 1, -1, -1, 1, 4, 13, 2, 2, 1, 5, 1, 3, 2, 94, 27713, 3, -27807, -1, -2, 3, 1, 3, 1, 2, 1, -1, 11, 1, -1, 8, 1, 16, 3, 23, 1, 9, 1, -1, -1, -1, -3, 7, 1, 3, 2, 94, 27687, 1, -27781, -1, 7, 2, 4, 1, 8, 1, -1, -1, -1, 4, 1, -3, 2, 1, 5, 1, 2, 1, -2, -3, 1, 5, -1, -2, 2, 2, -1, 4, 1, 2, 1, 2, 1, -2, 4, 2, 4, 1, 8, 4, 3, 2, 7, 1, -1, 3, 1, 5, 2, 3, 1, 2, 1, -1, 94, 27632, 3, -27726, 3, 1, -1, -2, -1, -2, 2, 2, -1, -3, 5, 3, -2, 2, 8, 2, 2, 3, 3, 1, 4, 2, 4, 4, 1, -1, -3, 2, 1, 2, 1, 3, 1, -3, -3, 4, 2, 2, 2, 4, 1, 2, 1, 2, 1, -3, -1, 4, 1, -1, 3, 1, 4, 1, -1, -3, 3, 1, -2, -1, 2, 3, -3, 2, 1, 2, 1, 2, 3, 3, 1, -1, 2, 3, -1, 94, 27537, 7, -27631, 6, 2, -1, 5, 1, -1, 4, 1, 7, 1, 3, 1, 8, 1, 2, 1, -1, 3, 2, -1, -1, 2, 3, 2, 1, 2, 1, -1, 2, 1, 2, 1, 10, 1, 9, 1, 2, 1, -2, 10, 1, 2, 1, "w4b0g2SlOrbQuu-xjw6jZvSaYHAOjSBBTWVTyypcVUSSLbJk6PmeBZo53mQ4T9_2qhOOQ9op1URRrscptLY6eVs-RrhU_cglXWeuZlMr24dXFeNQAPLGxDuWuf8mDFJeAgEBAAYBAwB230HBDPEB_yIAD_IL9vokAdXv9BQD9iToGOYQ2xQMDgnICQgOE-H_8QEn1iToBSsKyx7XQOjzBPEP7us-1RjrDvH-IBbPC_AA7SXf_ywSzgoBGP3qEA4Puzz2_tM2ySQAAAAAAAAAAA", 3, 1, 5, 1, 8, 1, -2, -2, 3, 1, 2, 2, -1, 2, 1, 2, 1, 2, 1, -3, -1, 11, 1, 4, 2, -2, 3, 1, -1, 3, 2, -1, 5, 1, 1, 4, -1, 3, 1, -2, 3, 1, 8, 1, 8, 2, "XCd040NPKxPzDsQTeGghIJ7FcENQg2u6PuMtkaiaPPsAzTXHcJFD_phE-mcqLmaXA_wqhXHzb6y62SEAvNtRC1wVFH0YhUkAAaG5Yi3PbbSf_kEfRRXViSw6E1SvsjZ3DhG5CUHCBwAEJhDW9RHo8wA88Q0HvCLnBxEX0SnlFOIh9_ciAQEPzCbq5BkMAeYAAPMAFyDQ-gAwySkPBgH48A7V7QQAPAAAAdj3IgcUxfEk6QYK_-0J7QAW5ysg1w", 4, 1705, -3, -2, 2, 1, 12, 2, 3, 1, 3, 4, 6, 2, 2, 3, 12, 2, -2, 2, 1, -1, -1, -2, 3, 1, 2, 1, -1, 5, 1, -1, -1, 13, 1, 9, 1, 3, 1, 5, 2, "5OCwRCTMOswsd2hLstGa6xrfc5mlqOEGnWp6LPVh2agtzzWkjvzUSbydoXJE7rHS9WH6lk1jodMn_Qsj-09LwFDkvvYqZPZiCa7OiKG0WfjeLYWFuY5BiwjRtGiTZwnPAQF3_ukVEOH-Mtjn_xIw59QPJP8A7f4uyfABNM_3EA0RFNAEDxXf-yvqFwPOJAIUujPl9QAQEgDMHhnfGO39HdAo1AIc7zLV8DAA5BHs9wEBLtcFJdj_JBLz8xW6SALODQQAAA", 4, 4, 2, 1, -1, 4, 1, 6, 6, 2, 1, 3, 2, -2, -1, -3, -1, -2, 3, 1, -1, -3, 2, 1, 2, 2, 3, 1, 2, 1, 1, 6, -1, 4, 1, -1, 4, 1, -1, -1, -1, 2, 1, 5, 3, 12, 1, 8, 5, 4, 1, 7, 1, "OuIaRv8g4dvm6-9j_hl-FDtzUlzTCDT-1wxr7sxnT4iXvjjqJF7dirY3D7LdmlWknmxYHvAMF0Z-O1TKQwixKWDfF4dsuJuYHK4HlxPgd00wjIvbL9x2Nt58yvGi9VcFAje7MNMSEOD7PdUy0-8Z7vccH9MC__wQIfEOzQr5DSr3-9wV3hP48vos5g8c1y4K39sh7vAZI9A75h-wDTHy5gvhADXX_gcv5Bns5xrTMPnXM9H_Gek7BwHYKNM", 3, 3881, -1, 2, 1, 2, 3, -1, 3, 1, -2, 2, 3, -1, -1, -1, -1, 8, 1, 4, 5, 4, 1, 2, 1, 3, 1, 3, 1, 4, 3, 3, 1, 3, 2, 14, 1, 3, 1, 5, 1, -1, 2, 1, 2, 1, 6, 1, 3, 1, 7, 1, "QGcuONUd3vmhveIYXpl76MonZCsdUOutXaIZR3_ru3IQvMRymArRqa7VltUV0EgGfxTHTLXF83u7u2G6yqyXWfq3MvNwBp_S4mSWgO0TkJXUKdMeMimQ8V9cU1P5qHjYJ-0l0Ar6He_mM9P5JwXkADe9AhzzMsIPAyjEGBEK2hz3DvUe-dITF-DnO94VBNL9-wADKxXr0z_t_-r58zH1BvES6PQAHewA_wAyzyvs--z3-xflEvwN4z_71zE", 6, -5922, 10, 1, 5, 1, 15, 1, 5, 1, -3, -1, 4, 2, -1, 9, 2, 2, 1, 2, 2, 1, 7, 2, 1, -1, 4, 2, -1, 7, 1, -2, 5, 1, 2, 2, 4, 2, 4, 1, 3, 1, "IByHcxuivw0fRxen8vxakYfNOAYBnGLkyYjbhDMKgJaD39_s5wILzWBIn5AppfVhzqjfOgHT35pRqfAB8gGL4UTQIL7iT4kN9F5OeV_-yXLY9TWHgIhvyGxl1nYf0mAg4uwFPdMd5QfjEQ0e1CfZBO4y5eoRK8IMHeL3KOYw5ukAFxjiBgX82j_I9x8h1hb3-xLbCPz5LffjATHvGcsLCvjhRsAe2ibpAvkU_g3bQ7sBEfFA-AHlBg8I_cc", 7, 9650, 12, 1, 11, 1, 5, 1, -3, -2, -2, 2, 1, 2, 1, -1, -1, 3, 1, 2, 2, 2, 1, 6, 1, 3, 1, -2, -2, -1, -1, -1, 7, 2, 2, 1, -1, 2, 1, -1, 2, 2, 4, 1, -1, 5, 2, 2, 1, 2, 1, 2, 1, "Ae3-muyXHmwHf_mPtl7lYovTT2I9OQDJ5NDAJGVut2EOOUPSD-NZC3pwXP1Nefdg90rN2a9-SfMYZLhgQkU-Ux9gFoLEOguuJOjpXH7YG2tQDffSsnzpojLz4GC7WpABAQBOKN1BBAf2xjDDAAMz3fEW5xHxHOQRAzH2BOUb5_QHABnNHxbaLuveEOsh_R7W-hrZ-UXF_fw61zO-PuIa0_EFAP432Sb10A74LtZCsUnzzwbzDy4BCMcg0S_cPdThLAAAAA", 15, 1, 3, 1, -1, -1, -3, 6, 1, 10, 1, 5, 1, 24, 1, 3, 1, -1, 4, 5, -3, -2, -1, 4, 1, 3, 1, 2, 2, 3, 4, "ngIAjaCI9MA-sNT6GBxjkA7zk66fBOYGLiWFvW1uaAXwlPJ1Vr_6g7NrAnzGhNIimeQYgHKtzvHqsKe6YwrBsQEkhYXQqVbtGsLgTSSMbZ-LmnbKBEss0ABLzbTZBujINJUAAnoAABPGLPzU_0jWBxLZFwrrDR3q0x_jPPQK5SfT6yvjG-I0w_U98-ceFL5D6NM4ySzeDiH1D8MY5izZGvsQ3fURAhvSDgsg1TkD3fsgwS4Mzvj-BQUMG9sHAC3PDg_UABgTAAA", 3, 1, 5, 2, 11, 1, 11, 1, 10, 1, 2, 1, 4, 1, 2, 3, -1, 6, 2, -1, 9, 1, 2, 2, -1, 3, 1, -2, -1, -1, 3, 2, -1, 2, 1, 3, 2, -1, 2, 1, -1, 3, 1, "JwEDQDvkIWUTbupp7MqHIUqzI_oWxMF3UkMZQqWs1qBCknXll9ZTSBY8suilLYotndioppsAJJGHlWIW5JcweLFMtgRASDHuCppmtAY0taXY9vHgpxySVz3Z1F-lNd6lHnUAAXsAAPIADA_XFu0twELUHADdIwzFNwTM9_5I3A8MzjALwybVAgA12gQr4vjwF_IAEwYN1BjsKMQBQusB_t4S-RT7JOf-_egx5doAF_n-POL13UXt5B4QAP66BirqJfPm-CH8AAA", 4, 1, -1, -1, -1, 6, 1, -1, -1, -1, 2, 2, 1, 4, -1, -1, -1, -2, 2, 1, -1, 11, 1, 2, 1, 2, 2, -1, -1, -1, 2, 1, -1, 4, 1, 7, 1, 2, 1, 3, 1, -2, 4, 1, 3, 2, 3, 2, 3, 8, 2, 1, 3, 1, 8, 1, 3, 1, "wnxXTVVjzSwAEL8-Z9V0ki9PN1SgP_fK4ajxfCrN96KMpmxB0OXdjmmjOHvMZq1zkCD_U3lZz3gkByHe5MmeXOIZNZtUU2gXDExabdOklsmZDUoHTE_yN-cPnlzNAPxXKej1CO0OP7A_wwoE_g_2K8RDvhoW8OUQJsw29NEn1B3v_ka0MxTy9OUzvkC8It4JCCbFFP4I6Qr2OPIe5uEQHcQNMuQVziHnQPb6DPDr8v8mAMU93_ot-8YRIQfFJw", 4, 2, 4, 1, -1, 5, 1, 2, 2, 3, 1, 3, 1, 3, 2, 3, 1, 2, 1, 5, 1, 4, 1, -1, 8, 1, 3, 1, 2, 2, 6, 1, 8, 1, 6, 1, 2, 2, 13, 1, 6, 1, "QnWwDa5-DdPbRAY5QYkcKozKmsuQo8zOfEzx5T28qrjbgPGfmd9xCyfZV2iFzciyybZ4sASypFPVBJEDsleHk6uBNvAdUxOgxepkiInmJYQHXX70bdGuXJt0dZJb-Yt8HsES_-INP_fQLwe9Ge72BCoA5f8C_P8R-wDtDhvW_jbfJckn0xrnAS4A5RHb-wUiFgrWASD8Fe_JSNfqE-70-hwe2C_FHBYYz-4EH9f6JOH__QQA-hEV5Cz8B-sK8g", 10, 3564, 37, 1, 6, 2, 11, 3, 7, 1, 2, 2, -1, 3, 2, 2, 4, -1, 4, 2, 3, 1, 2, 1, 5, 3, 2, 1, "Jybdd-0XjHkldu-SadYDxvK5de1g0oyjhDpOQIDFd7KNAtTW-Xc1XM9faAVV9ggAwGG0YzOkcQni0tLhloXYvRzOXWs-5YuqSucOpUn53VFLXro7GVCCQrs_PcSxpSkAXyfPDewe9iDS_yD7B90BON72AQ3qFAj1J_Dk_fUgF-X87gMl3j3aD_X62w8R9fgCLOTzLNABJtAV9QHyDQYn7NYh_B8A8wXj9EHSAB_h4iET3_439uzYBgAQDgX_AgEA", 3, 1, -1, -2, -1, 7, 2, -3, 2, 1, 2, 1, 7, 2, 6, 1, 8, 1, 2, 1, 14, 1, 21, 1, -1, 4, 1, 3, 1, 3, 1, 7, 1, "jNiTxuR7yvwf_3dWuLt4A1qYswBV3Xy7KebtoP_iql7UdZV1_d4OMel4TVPCXq2BOULpuS-z84uI9Lq-x0K6VIi7I7lZLSzGB4simCvExWt9Hmx8ZICKmIA7j2x-SIAZ9uAcE7slAdUTASftGr0NFffnByTl7jDcJ97vCvQq2Q4N7gAwANr6N8MlANgR8vYM9zEV9egfvCrUGTPAEQvhBR8a3OAvAtcmBOX_EQDqARjUA_8y5in7APwM5tM", 55, 11840, 8, 1, 33, 1, "ZcogHaB0IVL65ik_GCYE3O1bbVDb-8juJM-tJXw8grRI6vq5dMbwp7mpoNkbCQNnqla34HFe3vOA1tEbBvOBE9EP7EG226bSq9lFXrNMWCz4WjnH_p5ispfXNU8ai1Ay0EfVAP_x8gkDEf8JD-TxMsg-Be_kEPgPzkLdLcD8DjDj2DLxFxDm_9QTLP4AxCfpABMDDw7M8DDm__wUA_MRC9AJI_3z2_4nFtEBHuosvR8c9Bi5PgMIzxMW4f0", 13, 4128, 7, 1, 76, 1, "PXSTG6tMGkHzHfP0G8XQCBjQKejvJ0SMiP7h7uhRiyn1Vlcy5PRWp5UUCIiiaAU3AOOHM1B1P2hUb6t3m3mOZUAQwfMBxLro8tsGED9qoqVdDnsgk-kMHGmE2vN_31z2Mc4y9O82shIcAALQPdsy_8ENMMoWIuMA1x8K6RcE9SS3It5DwhIAHAHSCBkiyxAD5z7p2fgj1x4U4gH69DwBB7oEDRDiETu89ifcK-YB_QHtIhfIOvPZLBG9Awg", 64, 8447, 5, 1, 5, 1, 22, 1, "yhh2hq3wFcpNUOiNd3ihH611vv2rv2h6OwrybfPsexZjEwXfwTkhvztEFu9mW7CTYszd20zVA1L4Qn9j5z2xRpAbUFN1X9kGZx8xQdGA4i5xg7g2wL3ZROrlz9jyPk8r8yMKu___AQsEBugQ8Qb6BSH_5wMb5gDsIhDiDifAK-UBECDh3_z_G-MBCTD11QIJ9_0m5vsI__EP-QztJggPzSrR_gwq89ck1BD8EOgo9_YPAO7s_SjmHgrVQrU", 36, 11741, 24, 1, 3, 1, 1, 15, 1, 5, 2, 6, 1, 25, 1, 13, 1, 7, 1, 12, 1, 16, 1, 5, 1, 13, 1, 24, -1, 7, 1, -1, 10, 2, 2, 2, "iJ5b4KE_qft8aUBuRb2ZKFjCSrPwhoyk1gciXiuTzMoJM7siH45nzQNIUvNUrp5qeIRuwzR9pnUQS2TxcC_I724GbFjgD9hMIgbCV_JHfdeXTMq6ByVLJ4xHol4CRIUCmcgN6Q_98wwA_DjBC_My-g7GLuQm99YO-hkbux4d1ybYHvH-BvUJ7DLXBvbvIA7PCjjf_eX8SP_w8wXUBg0c_PD8AegCFQos3fcH9gXzKgvdCgDRFOYF_ybb__7_ADAA", 4, 1, -1, 5, 2, 3, 3, 2, 1, -2, 4, 1, 4, 1, 2, 1, 8, 1, -1, -1, 5, 1, 5, 1, 2, 1, -3, 2, 1, 2, 1, 7, 1, -2, 5, 1, 2, 2, -2, -1, 3, 1, 4, 1, -1, -1, 5, 1, 2, 2, 6, 1, 2, 3, "4ujGEhDk52X_al0rkVhSgnhC3MVMcAbqGrcvvbRhSK4vVqOgj7w2FteoH_vgcsJ9qgXaaiRjXx4dhiLsD2XbsOM-BI0-cmMxqP832F_9t2yqtiPJvgscsXkrsU2igiQCAHUFAvAqvCLg-zEDDAbJAg3xBxwTzBAO_tUXFAbMQQLV6D7YHNAl_Oo04N8WMckH7Tbo4iEB8xEft0IM0eQ8xw4REBMJ9bsw0h8mxjy7-yAG9Q8h3N0k9_rqTuHUJ_8FAAA", 4, 1, -1, -2, 7, 1, 3, 2, -2, 4, 4, 2, 3, -1, -1, 2, 6, 3, 1, -1, 2, 1, 6, 6, -1, -1, 2, 4, -1, -1, 2, 1, 2, 2, 3, 1, 4, 4, -1, 3, 1, -1, 14, 1, 6, 2, 12, 1, "hv1dZDSH_dA7O1q7Igr4KbDqMRH4pbxSPN4l0PDnRaDHxSGf-7M73Vv7XBrmNE57jvsuxDvMt6rUDwNinJzj54X3VkTdalWrMt9lgOkVmPuzpDWvcUCI_1vyMehlyFICAAICAZbBCzTT8QoX9Cfs0UXGEvPwMxYC2h_2ABHRCuY3zDi6QLsW9wAjB-bzFPsQ3gf4E-X7FRLtLcD_HhIN-QP4EQXmH-786S3k20XVBQ4UALz-A_dQtTzy9iLt6Bfh-w4RAAAAAAA", 6, 2, 2, 1, -1, -1, 1, 4, 1, 4, 3, 2, -3, -3, -2, 2, 1, 2, 1, -1, 1, 9, 5, 1, 7, 3, -2, 2, 6, 2, 1, -2, 1, 7, 1, 6, -1, -1, -1, 4, 2, 3, 1, 2, 1, 2, 2, 1, 8, -1, -1, 3, 1, 13, 1, 2, 1, -1, 3, 2, -1, 5, 1, "P-lomMYgxeNt2RTA_-qoko-qTqsPYu7q8JJaPGeIro2-mKjo4E0O9B-MEjJQ6oq4z2rGehokCE1k7AZPqXuGVtSft3tf21x097RLAWde_3dbo63_j19NEJCDyR9vrkuBC_YB8_bzJPAQEtYMHb8wzg0uAcEl9AEpBtr7C-M71hTn9f4BOwC5NgDmDB_e9fMcGgblE_3THf0Q4xvUAwoPB9MAAQglGOvhFA709fD7LOv89hTv-zXRIRf2wAA42A", 6, 7367, -1, -1, 3, 3, -2, 3, 3, 5, 2, 4, 1, -1, -1, 3, 1, -2, 2, 2, 4, 1, 1, 8, 5, 1, -1, 4, 1, -1, 6, 1, 2, 1, 5, 3, 2, 1, -1, -1, 8, 1, 6, 1, 4, 2, 2, 4, 3, 1, -1, 7, 1, "eZcPekuA6mRxf_wv0nS9bb5TcPaZRxwGxRqmiXXSxXcA3rjqZU8CeJZiLDKZNw7fhgtV8Gp83IseA2MTsGQWulaigN47irNwnKtJ9sV5ImafHw_yOvDbAjciN_3-o2Qi5Bf37DfHBRzVRs4D7Dv25vX7ENwLEu0O-PQPBg8B-wjo8gBA_Mok7uILJ9n6IiHADR7fNdjnRbgJJtk-uRzwBu0ELg_eF938Guz__Ps3Db4HHdv6QADY8wcL3wo", 15, 9810, 3, 1, 2, 1, -1, 5, 2, 6, 2, -2, -1, -3, 5, 3, 2, 2, -1, -1, 6, 1, -2, -2, 4, 3, -1, 1, 4, -3, 1, 7, 2, 1, 5, 1, 2, 1, -1, -1, 3, 1, 8, 1, -1, 4, 1, 8, 1, "aX32fBFADlU_SGdvNWdgIrlOirsICutA_Y4gfyAtxUl36P8glsS5S6r6wVd_9ytXz7Z3SiJoq8TqoYXeQw-WYR76XxXiGzEbDml3UJTefu2herBiQxdIvqImPzHcrKGC4AoG8DLqA-zkDvr5DvkNIO_u_hsPyRczzRrP_BzpOOXsAhTuAQ_tD__4CgcC_v_dAfsQBxsA4vL-HhgF3-gs1zEFCfu-HekhAuoO__Al5BADBuY3xRXfIR_LAPAi9w", 4, 5778, -3, 4, 3, 2, 2, 2, 3, -1, 3, 1, -1, -2, -3, 4, 2, 2, 3, -2, -1, 2, 1, -3, 1, 10, 2, 2, 3, 3, 2, 2, 2, 1, 2, 1, -2, 1, 6, 1, 5, 2, 2, -2, 1, 4, 4, 4, 3, 1, -1, 2, 1, 2, 1, -1, -1, 5, 1, 2, 9, -1, -2, 2, 1, -2, 2, 1, 10, 3, 2, 2, "LgEBBAMBJtlz-4qkHEUqWof3T0Ap34UeHVaUmZWW-ReOE2V5CM2KEZqKvu0PpqnA-qjLv9qHyCFfzmr3yqszDRrbA6BHwEHLvOZUex_-pwE_hnD4T-UK26ItIbpbq68-eWXH5K0AAQABAAKDAAAAAADSLPQB3SLbDC_w1SIo_tcFBesT6zb1xyzOCSsC2vMjF9H7FSzCHiP07dYQMro1Af8B0xDwDwcf2gr3BP369_UDHvgF5RfxEgroJB7GFAAh88_yAQUFH94WI9ANAB_YIAAAAAAAAA", 5, 1, 1, 4, 5, 1, -3, 1, 4, 7, 13, 2, 2, 7, 3, 2, 2, 4, 1, 3, 1, 4, 2, 2, 1, -2, -1, 7, 1, 4, 4, 1, 5, 1, 5, 2, 2, 3, 2, -1, 2, 1, -1, 2, 1, 4, 1, -1, -1, 3, 1, -2, 3, 3, 3, 1, 3, 2, "cMw38Cc2fX28YEZXVdwBmQ4G4e7cOtMoYLD4NwydAmek8TgR4EGsUz6wEysU4b15_A8aUyIO_DNNr9QY6h-j0CimG0CFyKW7lLF_jrU6U0yYUT6XcHnFrosrvJgors0AYA0F8DIAvzzs0z7CUPYAvh0h3R_MBQ4A_O0t_tkt2gMIK9D7CA_XAQ46zRvd8yvYMcsSGhq7_yv73jDiFeIRK_jd5AMb9gIG9Djz0xYG_9VC5PjqO9shxjPgKM4-1BUA", 5, 3, 3, 2, 3, 1, -1, -2, 4, 1, 1, 5, 6, 1, 3, 1, 6, 2, 8, 5, 6, 1, 3, 1, 8, 2, 10, 1, 5, 1, -1, 4, 4, -1, 5, 1, -1, 3, 3, "cgECAQEAWV9UFxdMnptXLZ5hKLiLZJxZozvVbLZRGMqRjMVJEP8znvHM-WQj8_7U-BIZE6hehiCoeBcoKZCZKQYhAhjEMQq0r9v8ZwcuwekHv0m-GxOx37U-S2B_FUVUmvytt4QAAAAAAM8HRe7GBEHPKtvlJO0Q4AAt8QbdS8sPHvL38gDgFg3kDfE1Dskc4hDo9gAROLc9xwcl5OwX_SEB_wTq_e0j0xIEGQMFyQr-Nr8e5TgGB-_vIQDYFd0FCRf9G7w1wQU", 5, 12475, 4, 1, -3, -2, 8, 1, -1, 2, 1, 4, 1, 13, 1, 2, 1, -1, 3, 1, 2, 3, -1, -1, 2, 1, 4, 1, 2, 2, 2, 1, -2, 2, 1, 6, 1, -1, 2, 2, -1, 5, 2, 3, 1, 11, 1, 2, 1, 3, 1, "HkTtgVPshdBWnBI2RPimcz34XxcJqfj89ncgXSeuXO1-am-bUdDQ8eZjkSEI_L0P2K6rvtmlbPsa1swXlOd8RABY3b9MN7R_ePtHvHJFLqSYKRjUo6OPyNguBUzUq08WA-35FjbI-BoO6_voM_Xv6xoS0gUcCusND-X19h8XDQHOKfTUF_Yd2fcGONnoDizg-xf2EtBFxfg87ts0-fwAC9f4BQwMEu393_s_3-0k-_Pv_xsL4Q3qHQD94Ss", 9, 1551, 4, 1, -1, 3, 1, 2, 1, 4, 1, -1, 9, 1, 10, 2, 5, 7, 4, 1, 11, 3, 2, 1, 4, 1, 5, 1, 3, 1, 9, 1, -1, 4, 1, 2, 3, 3, 1, "AdmNckbkKLzOwVdgOM-xCvfJHqAdJyvvnM4nVEMqsCroi2GliaFvrI-V0rc8pZ7yQGAhDmAUSvF2iKWoTlaudRDWBwBAPb691uchLg_hR5iNzFI90MAgTa3IrjC5wFAAAnf_3C7XB_sZ8wkd0SrNJOsD6Uru1TDIJNgNPr8GGt_2GecUKAbCFO8BOr4BQgjT8gL7LgLa_TfCAAjy_iPbNOIBA_ctxC_rCNk_zhYU4QAZCBcBvQso2f_7GN4GBwoWAAA", 7, 1, 11, 1, 7, 2, 3, 1, -1, 3, 1, 6, 3, -1, 7, 1, 7, 1, 5, 1, 2, 2, -1, 6, 1, 7, 1, 4, 1, 15, 1, "VeHVRhu42w3gJ69wwzIsrB99zaHXYL6s7eWg5qM2JF0Kc-j3XgE1gIq5yX9-iTA4JjuFHtGVcUj-f1NdXQ8JufQj-uUNA1XtuvLV6mS3-QWrxdtYIuYR3j4Liaz12qQAYPIu5CTt6Qr6NbwfGuALA9ojIeoJ7e8J9f_yChna-x0V2_oB-QBKxAoZ4Dj4yzAA2R7i8S0Pvi4T7NQIFu0w9RHz9wsQAOgc3uQeFgbj4ggYCeTtKvUJGM329g3-_y0A", 3, 1, 5, 1, 11, 1, 4, 1, 16, 1, -1, 14, 1, 3, 1, 16, 1, 2, 5, 5, 1, 3, 1, 3, 1, 8, 1, "bbAsw74F10P_bcvWbtz83wC9cSRvfL_aXYiiIO5Ws7bz0dfdunTFQaER0kujCzgRHT6_1J0xriFqmT3NJKTN7r7HqzfWq49Fv60F39FvxOtPpzHKT4BXuECMVG6mlqkBAHPwKwDyAuDxGSXIBwzrDSnp-OkTC_odAMsUHfDr8B387Az0EBnUJ9Q-3yDj8woBEAbkKN0p9c4ZE_z0Fd7qPAfONfbH-hfwCg3lCv0U6x0A6yL_4gQo6BYAB8r1ARwWAAA", 7, 1, 7, 10, 5, 4, -1, 6, 1, 5, 2, 2, 2, 1, 4, 2, 1, 2, 3, 3, 3, 5, 1, 3, 1, -1, -2, 2, 3, 2, 4, 3, 1, -2, 2, 1, 4, 2, 4, 1, 3, 1, -2, 3, 5, 4, 2, -1, -1, 3, 2, 2, 4, 4, 1, "FAEptmRQ_4wM0jUdRFjPh4CQzgyM-5sdntroyr18k4Ft3b7wQ_iUxerrlRTVHVBQFYHYAwotDbB3LWrXsBFixuK1zas14k4q07q-lAqlHDs0z629TRQgFefHLnkgvKt8FwEBAQADhwDl8vL-EAUfDtgp5t1Ayxvu-xgD99sS9zfBKAHcCTHd7_v9_R3oDTXpBgIHxAgl4QAfHfgEAM_wCfMO8TLn7RoU4-4z0w8FJbYi6x3rAxDq-__0M-sH2xkY4AYC-PoBLQAAAAAA", 3, 1, 4, 1, 2, 1, 2, 1, 2, 1, 3, 1, 2, 1, 7, 2, 2, 3, -1, 4, 1, 3, 1, -1, 6, 1, 2, 1, 8, 3, -1, 3, 1, -1, 4, 1, 3, 4, -2, 2, 1, 2, 1, -1, 5, 1, 3, 1, 7, 1, 5, 1, "zeDCdPZnrjqvWhKm0kbFSgoTbX3vWNtzvsz93-X1ZvqzCWD8c72B99bj8t8sLvmJ-3OPxXmhZ3BLoxSKXpS7Cpb1lpotrQXV7qCvq_NlBJWh_U8khPbu0qpyyvzoWF0C9ET42e7_C-4hDwQC1fYADSLpHs8hC9VGtB8e0AXyI_gY3zDp1iYDGMAq9e8k5g3oA-4QCfH3QLoeH9EJHebsABcA4xXwL80ACAs00AzgAA4r2wv2Iu__7_D-Qd0", 3, 5418, 2, 1, -3, 3, 1, -1, 4, 1, 2, 1, 2, 1, 5, 1, 3, 1, 5, 2, 7, 3, 4, 1, 4, 1, 4, 1, 3, 1, 10, 1, 4, 1, 4, 1, 6, 1, 8, 1, -1, 4, 2, 5, 1, "I9xunHwTd8anarqlLwMofzJS6EYz4511tsfvpPp38Fm-TB2aaANspx-QwgcTay_iupuXpXEqRn2QugobCMzYbjip0yIXkhMIcpCADNndzX1pbUFPxTWmRaO0XIcsEIyI8ub-AiHYBxH__v4G-B7W8Az7P9kPGswc-Q_NRPjX9vMj3AUG-w8yvP1O4tY5-_oT2PL7DDDdAOAuGObcOwDo-N1CBOIO5eAx-hLV9PpKxQ3mBDj49B-7AgI_2O4S-Q", 14, 8656, 6, 1, 2, 1, 3, 1, 3, 1, 6, 2, 6, 2, 2, 1, -1, 7, 1, 2, 5, -2, -2, -1, -1, 4, 1, 5, 1, -3, -2, 2, 2, 2, 1, -1, 4, 1, 3, 1, 5, 1, 5, 1, -1, 6, 1, "D03DdOGYNgtGqwY8w88ab_EkTogWx4DO-zYmLlgEXBZ3FErHHWPZRcPQeZx51j-pReXW16twsQEPcErFhtyvnodCt9VMu2zzWb1iFCcLkoETocwHCRBqAns9-wgeuCdc_w0Y1SbqBOUdHBC8EAEs1RsMxRfrNNoLACDQKf0T1iTW-gDwOd4b8u3xAQUIMfgJzQn5-fgAL9MZKtveADDo7kDkD_baCjXv0ELHLPkNwhL5F-sd3SQAEcYGBQUOFQ", 3, 1, 5, 1, 4, 1, 4, 1, 2, 2, 2, 2, 4, 1, 3, 1, -1, 2, 2, 5, 2, 2, 1, 2, 4, 7, 1, -2, 3, 2, 2, 2, -1, 3, 1, 7, 1, 5, 1, -1, 5, 2, 5, 3, 3, 1, 4, 1, 4, 2, 3, 1, "NQHRWcWwmSbKDXVVisMaQfUYc3Gn0VEBWrrFMGkGEuqRm0J5QlUVC8gbUrNL1RnWVO79lkwJm3F_MIRkkhDGXrykto2mP2TJg2Vx9qoAt4ADAjHogCfzyOGouwZB7yXfiQAH5gEHGe7WHxzyyh_uBibQP8MOAR8ABf_EDzwAtvo08BTXK-Upvvo95uNC2v0J2CoP1QIsDv7a_O0KFBHnE9YZ4iUevwoS6jEO0e5F2-777SYK7inW4ifcFwch8dgb", 9, 5313, 2, 1, 25, 1, 6, 2, 20, 1, 3, 1, -1, -1, 2, 1, 27, 1, "R989K5G20VNuEX4vHecAlueoFSCD2_xX0JVN-EGaGqtsWCymH6PuBaDwGUt0p3uY12aJAZQWgX3nRblMcUsm-i06tQCCgNdAylvGMPnPAWY1dNY7QMYj1vTZqMrbemT4NOoSzfsuAQb36e0q8h_A_UrL6wUTG9gU4Qr7EDG7ADkQwTfp1TL19-_-Bgodyg3xKdc04AQqzPIRIg_w9dk62Qr07yj4HQAB_9QgAP8FANMVLP_D-0DZ7j7DAzc", 31, -3311, -2, 1, 9, 3, 5, 3, 1, -1, -1, 4, 1, -1, 4, 2, 3, 1, 3, 1, 12, 1, 6, 1, 22, 1, "cIA_Qvsjk5BqAEHfhpNlqCTVs74FfV8E7xQ87pVjmKtGR2BUmodGPAx8Efj_fhC_wSdddyfWs0UhqTPD17vrUoRfPYwT9nACqLYlcDnNZc_LVas1P0VzLrZmKb7A1lMv6PBEwCEEAQD_BAj-6ek54O7uDu0y9Ok4-PjOGAH_9PIj6fER__0ZGwTe-gIj1uwA_EL6yAsx3uEo8x3bIc0AQQzFDQAouAw8uA4d4jD09OQrDsQ8xQcDAgoHDgo", 32, -108, 9, 1, 48, 1, 7, 1, "dF4BruYBxdaZnl_dHVSgV2qtOFCHw_Rt6DmNteM44Q3wY51eEnhVGGfYjqPo959fxxoJ-ou0McwPmohgb9vky1wAcR_7p0W3AtzotWHzbj3FL-M-0Y_vb2HtZG8JOW3uLRD0DgTQ4wAGMcsQLMf-Axz7ERDz3_820BgPAAfIIOv5NurOQsNDuz72DNUxxPgl7wHsHOs0wgb9EQEnAPQDDOzVNOL-ChcIyDrm-gEc1fAaIdP4CQUn1fMZ-Sg", 8, -1255, 8, 2, 80, 1, "4RYv3KLiwWoPjzL5_rWt0iWXHiUQ2e2VJ-LPV7fAgaEhwI_C7GsbrbEHFbDoc2c-UVA9uPEB3EBkgSlZ_ahrEf_Bf3PRf-Qi0yJpHe4jEDwnF-2Cah0_bpiKX3pz25QB4vEB6_oiG9kB9h_WCxz0H_LwCu8qzv8q4usPGPQQ7BDlEPAECvrnEC_BMvYgzAT8CiHkDtIv0z3S8jIJ8RXwCt4G8hL-AwkMB7sYDhYMzDIB7t8U6BPcEgX9Cfo", 35, 9636, 30, 1, 31, 1, "J58J79v_kQHmzLxfPgl7hKcYiNDUR7vGWlsr_c8eQpw7AHmtvFxDbjANcDoJ3Naalxq-11AE8Q0kJAdIdVOZ2M4jgXce56JnO0mwVfjN4jTo4ZJV5IcJG5m3Fm3JWF4XG_v35f7vM_AJAeviMAL28wL37v8IDAgixhIZ4QQAHgD-3_72FBMBE-MF-f4O1CjpNfT2-wcRvQEz0gkQHvET8d72IuULNNn1HuEMGAAF6vYB8RXf-Dbj6zQHB-c", 32, 4084, 5, 1, 51, 1, "rAQJCwgZHhQwmHQdF5bSFQJVQ6lrohpAwBdPx1cW11oHnwW_go95-NXeSvf7O80uLpu6y_iXzqioVXyZIkmr0VRsZD55A7befRHTnnyGbnWI9saxVHZpn2qyvWmNewHzVosAAAAAAAEAwx0NIcgQ8OwqF9Up7u32KtEL9Br3LPr-yigNxRL_8RUMDw7EIvn95AM5zBX_7iLRLvLtJu3tQM0mzSPiHhL9zAoWFMYSFBIL6Bbq2DvWGN001vfyGOn_CAc", 5, 35176, 9, -23517, 4, 1, -2, 2, 1, 8, 1, 4, 1, 6, 1, 7, 2, 7, 2, 4, 1, 7, 3, 2, 1, 3, 1, -2, 7, 1, 3, 1, 21, 1, "jX4zz-5Fz4KFEzn8vpGE1THlDTKhzgSyO6qYHmhwSwwp9NIQorTIDwUBCLb3vNowBw8dCfyeBQUeBQsACxEC-lLNBP4OAu7RZgcF-CX4CfI81y5BkC8B4SEyCNAhAk4AA_0Q9fsAAE3A-_gr1QX7CxnhGeoqGdIMKK8AUa8AADTZ-gH4BQAAAABE9sYAAAAAOsYA_wAAAAAAAAAAAAAyzgAAAAD_Ls8AAAAAAAAAAf8BAP8BAAAAAAAW6gA", 96, 15696, "X_faCjj9HPf5C-78LtEv51EBAdoUCPj0DRgwIqY44h7-0B3vGAJVxBHyBR0OKQEBEBsv5v75BxgD0V8aDGjRpS35jsvO6JLkE_kI2i07SrVcujUQXr2ts8608gUL_k8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQD_AQAAAP8BAAAAAAAAAAAAAAAAAAAAAf8AAAABAP0e4wAAUM0Q1QxB-7gI-QE3yf4I-P0D_ToAxjMH8eIt99IAAAA", 15, 15185, -3, 2, 48, 1, 4, 1, 7, 1, 5, 3, 2, -1, 2, 1, 2, 1, 9, 5, 2, 1, 4, 2, 5, 2, 2, 1, 10, 1, 3, 1, 13, 1, -1, 2, 3, -1, -1, -1, 3, 2, -2, 4, 1, -2, -2, 3, 1, 1, -15374, 1, -50, 1, 11, -2, 1, 14842, 2, 5, -2, 2, 9, -1, 2, 10, 1, 7, -3, 1, -2, 3, 3, -1, 2, 1, -2, 2, 2, -3, 2, 3, 1, 4, -1, -2, -2, -2, -2, 2, 2, -1, -1, -2, 1, 4, -2, 2, 1, 3, 1, -2, -1, 1, -4, 1, 4, 3, 1, -3, -1, 2, 2, 2, 2, 2, 2, 2, 1, 1, -14542, 1, 16, 1, 17058, 1, 4, 1, -2, 1, 15, 1, -8, 1, 18, 1, -2, 1, 5, 1, 6, 1, 10, 1, 10, 1, 7, 1, 4, 1, 5, -1, 1, 19, 1, 4, 1, 9, 1, 24, 1, -1562, -3, -1, 1, -5, 1, 18, 1, -12, 1, 18, 1, -2, -2, -3, 1, -742, 2, 2, -2, 3, 3, 3, 2, -1, 2, 3, 3, 1, -1, -1, 1, 5, 7, 1, 3, 1, -2, 2, 1, 4, 1, 8, 1, 2, 3, 5, 2, -2, -1, -2, 3, 1, 3, 1, 2, 2, 2, 1, -3, 2, 1, 5, 5, 6, 2, 12, 1, 2, 1, 2, 1, "bgJG9x71-BHzAgsS-_n6Aw8DDgUd-wQN_QkJAsY0XwkAEEDQBRnuDt4mAAYyhkpYlFxc99w9CAtXAv0IBfQALN4GJhvlGvX-7AQI_Dn25yUc1wzeDDQCAf745Tv6COv4lQGOAAIAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAwQf5AAAAAv4AAAEeBufzAEq4DBbo-gAAAQAAAP8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA3AA", 5, 1, 2, 1, -1, 3, 1, -1, 7, 1, 3, 2, 7, 1, -1, 12, 1, 2, 2, 2, 1, 7, 1, 19, 1, 22, 1, "CwHv7xId-irbRAYUBxDlJ3DleQMBD_od2wkCBQERDAXxFwEYtB72HAD05wrsCPQkCdU8J-3sKvfUF90FM-7XPQjrDQDK9EY0CQCrian3_GnC0B_3-xvg1kjMDPgy_lgA_wABAAAAAAAAAAAAAEEGwiEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH_AAEA_wAAAAH_AAEAAAAA_wABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", 96, 2943, "aLJNAv0CAEHHOgDrCegI6PY58tM6whwFCREBBD_j8i4Q8tEf2EUb2PTNCi_z9ADw2vplyfB69Aj-GRMA8Q7uwwkiDBUBojtTCwIV1hX29PolwBf64k39KAAqt0jlGoMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB_wDVLAD_AAABAAAA_wABAP8AAAAAAf8AAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHwEP8BAAA", 33, 2570, 1, 4, 1, 21, 1, 11, 1, 5, 1, 10, 3, 2, 4, 1, -2, 4, 1, 4, 2, 2, 1, 3, 1, 2, 2, -2, -2, 5, 2, -1, -2, 2, 3, -2, 2, 5, -1, -3, 1, 4, -2, 2, 1, 3, 1, 3, 3, 2, 1, 2, 7, "DAEEAQI95MP8XO4f-_kbJ6AuCCgD3gfpNO3oM_34Iu0aIifdI-wlwQkzBPUdBP22EgIGBxcdNBsOD_wWM9NCEfdpSHoIEyW4Pt3eRA01BecexBnvg3P3hvvJDwTrGfo8JegoggKQAAAAAPUA_wABAAAAAADyDgAAAAAAAAAAAAAAAAAAAAAAAQAAAADYAfoAJ9kAAPoJAAAABgAAAAAAAAAB_wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAB_wABAAAAAAAAAAAAAAAsAA", 3, 6, 6, 1, 5, 3, -2, 2, 1, -2, 2, 1, -2, 2, 1, 5, 1, -1, 3, 5, 2, 2, 6, 1, -2, 2, 1, 4, 1, 5, 2, 7, 2, -1, -2, 4, 2, 2, 1, 5, 1, -1, -1, -1, -1, -1, -1, 3, 1, 2, 3, 3, 1, "qwEEBAQAAQC5PADgIAUPBgz9JhsI3MZG902RC-v-EhYD70SQAAAAAAAAANQAAAAAAAAAAAABAAD6ABbq9AAAAAAAAQAAAA", 3, 6, "VuzdNQHJDk8R4vnyNQDo8e82MtwU8R3U_iwAnTAx5QMMDAABzAD5OPEOPMs43BbeLgDrARUCPCclkyPTE-kQ64UAAgEAVAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf8B_wH_AQAAAAAAAAAAAAAAAAAAADsAAAAA", 3, 1, 1, 4, 3, 1, 3, 1, 3, 3, 3, 2, 2, 3, -1, -1, 4, 1, 3, 1, 4, 1, 3, 2, -1, 20, 1, 4, 1, 3, 1, 11, 2, -1, 7, 1, 9, 1, "RPIekcQA", 3, 30, "M_wrLkawLQfO-B3eV7rpY90A1QRQDNFVsRkA5xH25ir1DADYABoM7q-J6QP0Iv7aASYFKuAd1CAU9gLvBzHdDPkPAAgNGyQCBQMT9Q0FBAX-EvIJ-vwfCQAIAQAIVQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB_wAAAAAAAAAAAAAAAAAAADrHAAAAAAD_AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAcAAAAAAAAzAAAA", 4, 1, 2, 1, 2, 1, 2, 2, 3, 5, -2, -1, 1, 5, 3, 6, 5, 3, -1, -1, -1, 2, 3, 7, 3, 6, 2, 6, 2, 2, 1, 4, 3, 4, 2, 12, 1, -1, -2, 1, 4, 10, 1, 9, 1, "NwwPBgICKu0SAgXxDwD3CAEY7Bru_gXxHfUMDRHmGRwAI_4H9fnnFDzl9Qgu7hPtDd_-HgoNFgPVQw2tAwoEAQIIAwILBAcGpf5LAgMCAAr9DP4EFQb5CAECCfEP9l4AAAAAAP4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAL9EAAgAAAAAAAAAAAAAAACnXEwAAAAAAAAAAAAAAAAAAAAH_Af8", 96, 7915, "-xv7DegT_vcMFusGC_ge_AkICwIOnAnBPN1gcgEAAAAAAAAAAAAAAAAAAAAAAAAAD9c_wQBA", 6, 3, 1, 7, -2, 1, 5, -2, -3, -2, -2, -2, 2, 2, 3, 1, "gBD5Cg76GPsI9J9-_gkMAc8JBAz4M-oV3AIZBgDjAgogG_D08_0bAd404VYAAf7HXgAAAAAAAAAAAC_RAAAAACPeAAAAAf8B_wAAAQD_AAABAAAAAAAAAAAAAAAAAAAA", 46, 12803, 25, 1, 25, 1, "ahIYAxLv5Q75DlDO9Sv67RPZawXuDdALDRweKjbnEg8cIOfVNQEFAQEABQEEAAEBYAAAAAAAAAAAAAAAAAAAAAAAAQAAAP8BAAAAAAAAAAAAAP43_wAAAAAAAAABAAAA", 4, 1, -1, -2, 3, 2, 2, 1, "LBLVHx4H7VjhCgP32wAKAQ8iJgPYSQD45dot9SPwAsIhGw5OJPAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", 6, 9641, 25, 1, 65, 1, "Oe3kNgS-_BT0HCHgBuQ0AgHeXd0uAb00AMcDG-a2rP0YL7AgMNT2-zyUYKF8Qt8cRqwmzADd8h6a0eZHTLTCARX9-x_cGr8y3MLjANzw4zUGFCi13h9fA_7r-Qn9Vm0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf8AAAH_AAH_AAAB_wH_AQAAAAAAAAAAAAAAAAAAAAH_AAAAAAAAAAAAAAABAAAAAP8BAAAAAAAAAAAAAAAAAAA", 52, 9016, 43, 1, "a13dEfwLHgzvAQ4qCPcd-xkOIQMQ_RESdm6VrwlBv1a_rhwBDwj1BPwM9Bz-Bhrq-wgKEwD2ARQMAP0X7wn4XboIBAX6B8QG_gHib6QIF_ECVW3-A0bH_jISAQkbAPiT3AAAAAAAAAAAAAEAAAAAAADrAAAAAAAaJcr3AC7SM_0EAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAADWKgAAAAAAzwAAAP34CAD_AQAj4AAAI908wf0AAAAAAA", 35, 14792, 58, 1, 3, 1, "lzLg8gUt3_wn5kYA1ira9CAS_CgB3BHvLCbiCuYlEna98NsCQyzGHwHjJwIN5A_xAywN_hsECNQGPQoN3QEOEgEAAQT9AgADAgEFAQACAVkAAAAAAAAAAAABAP8B_wAAAQAAAAAAAAAAAAAAAAAm2gAAAAAAAAAAAAAAAAAAAAABAAAAAAABAP8AAAAAAD8AAAAAAAAAAAAAAAAAAAA", 3, 2, 2, 1, 2, 1, -1, -1, 1, -7177, -1, -1, -1, 2, 2, 8, 5412, 88, 1, 1, -5506, -2, 1, 13, 3, 1, 1, 6, 2, 1, -3, -3, -2, -3, 2, 4, 1, 6, -2, 2, 2, 2, 1, 1, 26, 1, -24, 2, 3, -2, 3, 2, 2, 3, 2, 2, -2, 2, 1, 1, 4, -1, -2, 1, -2, -3, 7, 1, 4, 2, 5, 1, "NUQEW2JW-AIc8_wv8g7l-wwI_hzzoo3e_fbbNxwaMMr-Agf9_X_fF-gYG-MAAAAAAAAAAAAAAAAAACXc_wAAAAABAAAAAAAAAAA", 15, 8194, 44, 1, 25, 1, "kQQBLgcDAAULFCAD-v4mGvr9Ax31EB3x8QAFAxIJAOYWKueUAAAAAAAAAAAAAQDfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", 3, 9007, "TAYK6SA74eIIJA7NMvUO3esEcxjOMd7GW8zbJNgpIsL0KSuyOzQALADsE-EfHpk3ENol2P0L_t-L2eQCG9dWq40iANgtCwkFBAIJBAUNBQBnAAAAAAAAAAAAAAAAAAAAAAAAAf8B_wAB_wAAAAAB_wAAAf8AAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB_wEA_y0AAAAAAAAAAAAAAA", 8, 1, 76, 1, "JMsa9VWLLGDHJuEaJuYUF9-7l7oARbrc_BUhCxPvASbcDwgUtUqscS-9KQBMjFH5Ya8K2Vjqw-ovIxT-GO0TixouAAT8DQD5DAAFCMABaf8BAAD_AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH_AQAA_wEAAAAAAAAAAAAAAAAAAAAACQD4AAAAAAAAAAAAACQA", 3, 3, 2, 1, -1, 1, -2, 2, 1, -1, -1, 2, 2, -1, -2, -3, 28, 1600, 1, 4, 1, 18, 1, 7, 1, 11, 1, 4, -2, -2, -1, 7, 2, 3, 1, 2, 1, 4, 6, -3, -2, -1, 1, 6, 2, 3, 3, 1, 5, 2, 3, 1, -1, -2, 2, 1, 1, 4, 5, 1, -1, 13, 4, -2, 2, 1, 3, -1790, "mAEzPAsDAwL-A_4HugcECg8BASCPAP_UAAAAAAAAAAAf8wAAAQAA8A", 3, 185, "Cg5YkBHqhHElFvwE_tBY9OwNBgr1HwwHGvUgHAAJAkgAAgQBAgQAAQD9BQcDbWYAAf8AAAr2AAAAAAAa5gAAAAAAAAAAAAAAAAAAAAAnAAAAAAAAAAAAAAAAAPw", 3, 2, 4, 1, "bjC9CAgOAAQGAQECdSl92wFyAAAAAAAAAAAAAADxAAAzAA", 3, 2, 2, 1, 2, 3, 10, 1, 8, 1, 2, 1, 2, 1, 2, 1, 2, 1, -3, 2, 2, 1, 4, 2, 1, 2, 4, 2, 1, 10, 1, 7, 1, 4, 3, 3, 1, 2, 1, -2, 4, 1, -1, 2, 2, -1, 3, 4, 3, 3, 2, 1, 5, 1, "HQEAHpgr5QgJ9wMLAf4GB5cAAM0AHOsAAAAAAQAAAAA", 3, 2, "IQf6BQcCHxXhBAPZMbOI_PYoTbLz-QEGAmwAAAAA-QAADQAAABTMLgAAAOcZAAAAAAA", 4, 47, "2-YBFPMJOMwNBQL4HwDjCRj8R9vnDesZFQMGIOQAFu4IEgDv-eVn0vkOQ80GIVmj8IAAAAAAAOcZAAAAAAEA_wDnGgv1AAAAAAAAAAAAAAAAAAAAAADXAicAAO0TAADmGgA", 9, 5477, 2, 1, 2, 1, -1, 5, 1, 4, 2, 19, 1, 2, 2, 2, 1, -1, 2, 1, -1, 2, 3, 3, 1, 9, 1, -2, 5, 1, 8, 1, 5, 1, -1, 3, 1, -2, 3, 1, 5, 1, "weR9EgEJAhKBAOoAAAAAAA", 3, 11639, "1QMA2IyBMJzAQSgJ_f4IAQMDqRv5Bh0E9vMFNuFFAgIYAUHoC9ws1y0BHRoB8vc_8xIRIwpDq01ShP4FBADxBAUCEQD2Bgf0CA73EgoEDwwLHf7NAAEAmAAA0_QMHtw6xgAAAAAAAAAACwAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQD-AQAA8QAAAAAXAAAAAAAAAAAAAAAAAAAAAAAA5gA4AAAA", 7, 1, -1, -1, 2, 1, -1, 49, 1, -2, 5, 5, -1, 24, 2, "PCD8DNkXCUdaBk9L8y0FNHn-E2IF-QEHCA0A-JmB7gBgAAAAAAAAAAEAAAAAAAABHgDsAAEKAAEAAAAA7RMAAA", 3, 27, "HxzoBvYFJB7oAM4p9gQdMPcG7BQEAQ4G6y4E7yIFEu4eEPkVZl0BAPQSCOsNABEH9hP4DgIXAPX7Fg14AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB_wEAAAAm_wAA2AEA_wEAAAAAAAAAAAAAAAAAAA", 96, 8358, "YgIZDe8CCwQNAA8EB3wFDfz8EhYGCdQI_egfC_wHB_xOF0x3AAAAAAAAAAAAAAAA_gAAAAAAAAAACgAAC_UAAAAAAPcAEg", 3, 3154, -3, 1, -2, 2, 1, 2, 1, -3, -2, 1, -3, 3, 4, 2, 6, 1, 6, 1, -2, -2, 1, -2, 2, 2, -1, -1, 5, 1, 2, 1, -1, 1, 4, 7, 3, 3, 1, 3, 2, -1, 1, -2, -2, 3, 2, -1, 2, 1, 2, 1, -1, 6, 900, 1, 22, -2, -3, -2, -3, 1, 9, 38, 4, 2, 1, -3, 2, 1, 3, 3, 7, 2, 31, 2, 1, -1055, -1, 2, 2, 3, 3, -1, -1, 2, 2, -1, -3, 1, -2, 2, 3, 2, 1, 3, 2, 5, 2, -1, -2, 3, 1, -2, 2, 7, 1, -3, -2, 2, 4, -1, 3, 1, -3, 2, 1, -2, 1, -14, 3, 14, -2, -2, 2, 1, 3, 2, 4, 1, -1, 2, 2, 1, -3, 2, 3, 9, 1, -2, 3, 1, "OqwE3AsX9QcaQLv-G_WV4gAf4wAAAAHjHQAAAA", 5, 7923, 2, 1, 29, 1, 37, 1, 13, 2, "ZAEMBAABAgMABa_9GX3VyhcFBAUKOQFL8wGZAAAAAAAAAAAA4QAAJPvh_AAAAAD-AAEpAA", 5, 5, 1, 5, 1, -2, 1, 4, -1, 1, -2, 2, 1, -3, 2, 2, -1, 4, 1, 2, 1, -1, -2, -3, -1, 3, 2, -1, 1, 4, 7, 2, "cfsFHgEBCfwO9g8AAwvs_hL-E_YVBP39Bvsb7QoCEO8EBgryGvL8A3IBngAA1wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB_wAAAQAAAAAAAAAAACMA", 11, 11, 2, 1, 81, 1, "GyDl_R_sAg71Dfr0GRD1B_kUA1obkQAGBQEMEPkL-wQFsAQICgECHyPwBAwY6xQBCyjh6xXxMPf5B-4p9goKJBQPWcwBJzUBAQUDAXYAAAAAAAAAAAAAAAAAAAAAAAAJ-wAAAAAAAAAAAAAAAA4AAAAAAAAAAAAAAAAAAAAB_wAAAAEAAAAAAAAAAAAA7Av2AAEJAAAAAAA", 3, 2, "Kf4I2SkNAgYEFgcR9AcCgAAAAAAAAAAAAAAJDwAA", 96, 374, "iQIAAQQFAAIAAQACAKYGFwEQ-gH-LOT9IPAJ-wboFQwN8BjhCfb9GQXkNAcA-gXcQsoV6vj4MQPwDwEC-xkX4gYI6yMJ6_z3DQdCn1oA_OQP2yEcxw8Y5_QLLRv4KZgAAAAAAAAAAAAAAADuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH_AAAAAAEA_wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", 18, 4743, 1, 6, 1, 16, 1, 5, 2, 3, 2, 5, -3, 1, 12, 7, 2, 4, 2, -3, -1, 3, 1, 2, 3, 5, 1, 4, 2, -1, 4, 1, 6, 1, -1, 4, 1, 4, 1, -1, -1, 9, 1, -1, 7, 1, 3, 1, "xsH8J-nrJznGCP0XB-kT7gkQDvUNJ_zqCxAFFwL5CwEAyukCCvoAEPQg4zfw8e4UAu4E_g4K3zkB6i_WEAINDOYP_h4VABDz8ArcJPEFCAgc7woQ_AoAAyHx_RIG9PuHAAAAAAAAAAAAAAAAAAAAAAAAAAABAP8BAAAAAPcAAAAD-AABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf8AAQAAHw", 6, 1, 3, 1, 11, 1, 3, 1, 11, 1, 2, 1, 8, 1, 4, 2, 1, 5, 3, 3, -1, -1, 2, 1, 39, 1, "Hwr7EQj-vQIAAedXfAAAAAAABQEAAP8H", 3, -1572, "LQH4AgwC9wAJBQQBAwoECBUGAk8Gfj4BBwcAAcnMRwv-AQMPCQADBQQA-vwREIU5Fg4GD_sEAgQEBH4uB5hTHPu-EA_8H7UF2QEABf0AFIIAAAAAAAAAAAAAAAAAAAAGAAAAAAH2AAAAAAD96RcAAAAAAAAAAAAAAAAAAAAG5BkAAAAAAAAAAP0BAAABACAA7wAAAAAAAP8ABQAAAAA", 96, 2583, "Yv4O-AUNAPMBBBL4CvwDEAAGkQAAAAAAAAAAAAAAAAAAAAAA", 3, 2, "tf4Fmig5MhlTD0sJ_P0JEQACA-8AC-olCgDqFQHoJPMWCAEMAfQLCgX4-wfzF_cADgD3JQUF8gQQCQT7CwHZCQf6EvsGOgf7AZEAAPsS7wABAAD_AAAAAAAAAAAAAAAAAAAAAAAAAAH_AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_gAAAAAA2SQAAAA", 96, 4607, "5QUDTucslQn7FvoGBv4bAgINQQKJAAABAQz_AAABAAAAAAAAAAAIAA", 6, 1, "jHEMAasCABAD7CCtHxl1K1_EriwTAp__AQD3AAAAAOEf_AAAAQAAAAEACAA", 4, 2, "I2cCeiIA", 3, 1, 2, 1, 2, 4, 6, 2, 5, 1, -1, 2, 1, 8, 1, 4, 2, 4, 6, 2, 2, 64, -144, 2, 1, -1, 2, 2, 2, 4, -1, -2, -3, 4, 2, -3, 1, 12, -1, -2, 1, 9, 5, 4, 2, 5, 2, 7, 2, 7, 2, 4, 5, -22, 3, 2, 3, 1, 2, 2, "3wKZCAsAARr79w4B_P4GoF0DAQT-BPwIAARz_QMB_gQDliQgJv6KAQQI-w_xCw4GAwsDmQB8RgQAAgZDxgGcAPsAAAAAAAAAAAADAAAE_AAAAAAAAAAAAAEAAAAAAAD9AQAAAAEAAAAAAAAAAQAAAAADAOAgAAAAAPULAA", 3, 59, -2, 1, -2, -2, 1, 6, 1, -3, 1, -3, 1, 4, 1, 4, 1, 50, 1, 9, -2, 1, 9, 1, -3, 2, 5, 1, 5, 96, -610, 94, 17649, 96, -17743, 94, 17647, 96, -17741, 94, 17645, 28, -17739, 1, 5, -2, 1, 6, -1, -3, 2, 6, -3, 1, 12, -2, 3, 1, -1, -2, -3, 4, 1, -2, 2, 8, -2, 10, 1, 2, 2, 4, 1, 2, 2, 6, 1, 9, 2, -1, 6, 1, 4, 1, 94, 17571, 9, -17665, 3, 1, 2, 1, -1, 5, 2, 4, 1, 3, 1, -3, 2, 1, 3, 1, 2, 1, -3, -2, 2, 1, -1, -1, 4, 2, 9, 1, -1, -2, 12, 1, -1, -2, 2, 1, 3, 1, -1, 6, 1, -1, 9, 1, 2, 1, 2, 1, 94, 17530, 5, -17624, -1, -1, -1, 5, 2, 11, 1, 45, 2, 2, 2, 12, 10, 3, 3, 5, 2, "LEwbUQn5AAAAAA", 94, -5608, 4, 5540, -1, 2, 1, -3, 3, 6, 2, 1, 3, 2, 1, -52137, 3, 47508, "hO7TQAIo6XvzfQrWqZwZD5Nc5QCWH3HGiYbxqwhOiHsCAIN1-g4h-IrqbGkFUhA8fDICBAABABj7G_4Dmk0uBgD6AHGWAQD4AAsAZpoAAf9mAJwBAPK6t48SAe0V6wAAulsA6xUBAgBZqAAAAOcbAAAAAAAAAAAAAFZJZA", 3, -5, 1, -43, 1, 42, 7, 112, "rgxNUg", 94, 17580], big5: [0, 942, "8EHQotHjCg87q1EwfGXPoA0C-A9ujclE9Qgv0HWEEOj9iqrZDJqc_LjIATD98RzrtkgR661DCfr_AJMGb_iTBHCMBF8MAAUAjAb6BvoH-Qb6BHCMB2j-B4wEcf38kgeTZgb6BvoG-geH8A", 0, 1, "lYdEVjo_KZDraxZFgEFIIOVEcSTS3hs719EL-VC5yMpphxYGmrgQAKo-nVdHwRGreRGYAOKCs823YS3Ic654vKki9p_dkmEMAOt7HOQbQIlZ6wYpHqws-NVBFJpyC4B3h39_gvw6SG34FRaJk8GsXH3cfwdeWkEHfH0FfdyiBnwBAQseUwWXAMSgBfsG-gRimgReQCU5BfsF-wX7BvoGZUEb9bU90j_75wHsBB7sB-wT2D6kP2UFlyu48gvtlwZ6Il4HrLuSBmOXBZ5dBMM5BPwE_ATD5lMFY1-llAWFDi8", 0, 31, 5, -28172, "QMu4epBujPgAeIp7oN93idgFVKcE_ARVAKcE_AdSpwQ", 4, -118530, "QM2-ADHAC_JRtlCtg4b9ANgFVADQ_wH_Af8B_wH_Af8", 0, 1, 1, 7659, 0, 1, "wAk23-wRcB7iAf8B_wI", "$8", 0, 1, 1, 7277, 0, 1, -1, 1, -7640, 1, 374, 2, 8568, 0, 84, 1, 163789, 1, -37477, 0, 1, "CmU", 0, 2, "PZ9wkE4gL_Q", 0, 2, "XddbiA1_rR0nR7wGkhKCBgkNEwIqATE3APrrtE10BWDobXhuBw0MBw8mMEJUn1b3I4MABqLq0HiCXdgHhesAAAIAAAABAAEAAAADAgEAAAACAAABAgIFAgEABQMFCQAAAAAAAQADAAEGAgAEAADlCAHsEdg", 0, 4, "jCulXZHnGe8", 0, 1, "C-pLpI3zWAU", 0, 2, "nycF-0IxKI5lsftdyo2AHq5RAa6MBfsEwjoFWA", 0, 1, "mqPabhTz", 0, 1, "EVoiCe3ZCtqCdo55mz1c_gY3K0sUcIq6hPQVEeB-1SAIg-8Wlp_hp16ibmBJBA4RDxAEFh4oCgRvpmUZF-2ZJKBJUQAF2l8E_AX7BfsGcAAAAAAAAeUb7xIA5AAAHQj4AAH8BAAB4h7iHuIeAeEAAR4AAAAAAAEAAOAg4AAg4KMFeA", 0, 1, "Q_4A0T7WZLp6JVMABAxkrH9tDF270Oz7oIr8_JdglvJlOMZwjpFur5jwxFKsxzcg5l229fqB2AT8BfsFeIMEXZ8Hr0oF-wRkmASbYQReDZEF-wX7BYd0BfsH-QT8BIgqSgb6BPwH-QT8BvoE", 0, 1, "QwIf5hKICl5To3bvtP2O-BhNcp1uiWmC-Cmm2AX7BvoEa5EG-gS-oJ4FYvajBvoH-QT8BcD7", 0, 1, "2X5MDi5nAP1_eTKDSCrpgH68R0FJaf3w_yTfWMDp9O9DlQSI8IQF-wf5BF2fBPwG-gf5BYd0BPwEskoF-wf5Bw", 0, 1, "CzRoUHjXQUiQBWIZgAU", 0, 1, "UXZ4uls-qwj2UuJB_tgF-wT8BPwH-QV46wM", 0, 1, "tJUb3VgMSk1Y3IRKK0rg2sZKjgb6BKUXQAWG1p8HrskO2g", 0, 1, 1, 157629, 1, -38905, 1, 7365, 1, 505, 0, 1, "RIOFc89zWTrc3vH-forw7RlmsrqbgBXn2AT8BVwBngZXowb6BHqCB_kE_AdVOGwG", 0, 2, "XRbWP7y_YPEHaXU2yPAlwXawinq4Ru7BWI5fSLZJtWbor-wSA_wK8wjYBfsG-gb6BvoE_Ab6BPwEo1kE_AT8BVijBfsG-gf5BmGZB_kF-wX7Bg", 0, 1, "Q2eWZpkE-3uD-LtPTJsQaZ6naNsQg3Q6xDvLBfkJwipUq4J76jrIJ_USbpA1yWbfIff02Ab6B_kF-wT8BWKZBoZ0B_kH-Qb6B_kF-wX7BPwEXp4G-gT8B_kG-gf5BPwF-wS5vy7T", 0, 1, "Z1tij6YA7KJRLH4vPBjBYscAXPiMtkjLMzPLt-F1lx05ktiZa46EecwyNMszywMXpj0P7TXZ_PpYr-_YJtklsE6xpabNSzbLbHVxjTfYKYQ_co0704OPVJSHa_MVJugbHM6xOud0tZcr-r83bcgd1_C99pae2UN6vPnY7kXUX4LkLXI1UehEugQxvgCApJZo6L1ZBBFW2Aa-_j4H-QWUEP_cfAWkthyFBLVHBvoG-gb6BlejBVmiBHqCB_kE_Ab6BvoE_AX7BvoE_Ab6BvoFfX4E_AT8BPwEe4EG-gb6BvoH-Qb6BVqhB_kF-wb6BvoF-wT8BfsGevrkogec4O0DVKpT_z0H-QV44CH4C38H-QS7QQRyAOcnAwDZKgMGAQAEAtwkZgSj-gMDWQZW", 0, 1, "WPK2fdi4R_YLBlycU-18Z_IGaHqr1o5YD4QCqWuipKqXLwhGlRlq2AehAFgG-gV2NQFPBK8CBwEAAEMGuQEAAAE_BMACAM2OVYoEuswy", 0, 1, "O8JoCzIixcD9KH0qM3iL_djxP890TpqHoJE05p6DujmP0x2rsq35WQRRaOsyLLo74BqHavfWIzV15IiAwzXFTMty55CLVgY9dm7bBiiGyHjArB8pCxObUB1rBMOeS1AFk-zvjQVYowWEdwaxAuD2DGUG-gVfnAVuLfzdhwdhKm4GZERSBpxeBfsGudnjhQS342IFwtjXAQH-AVC1KdsAgAWBAAF5B4ZzB4oBbgSQ", 0, 1, "AFCzhk52wAGjydNMsD_9WNaoi54R5hkO8SOPgECKtlWL-TEwd3JmBZbLmgZ9GRdNBPwGnAEBAgQDGukX7xHw9hT5DTkF-wRkAhg", 0, 3, "aAIKxpjP2xU", 0, 1, "1nsoQ5ywc9kYBt66RWLuAOcYN3P7cr06iAnyTAObhVMFpVYFb4wFgHsH-QfAALxExxjwC8QHlAb6B2QC", 0, 1, "1XjL3n6ZOgMmOaQA95ta21MA0fVjtuWK54v4hazpD5NABlxcfAer0uGbBYBC0tSTBPwGbu37pAX7BK7FiQZ7KBdABIN5Bw", 0, 1, "SHigCpS4qBSNq7RMQt0gY-o15FCpom1mgETGuW3x-nPdibxRfN4vUAkNpRKUFGYXCXpnXYQLKg2JZaejLQEV6HNjVDLfuFHeGAtS8HRUC3337jZBU56fj_MrYVtX8Tnt_gmNORgHOuU2GQaHDvwQaaxYuAkeIYo_KIo0IDYDH1pttAxjAhBc2136JvekaAA6DxEI8T88qwpB4fChZL4DGg8JtuSbL1GUdofmnHdqFoptU7-GitQMioNzixfYVQ70EQANhzM8DwIMBMKkqQlJ0yq5SKajzCy5XaYjUFBwJZ7IjKkNLGcLLiFpgj7OLyPW0yZQ_R6NfgHYmLU96Bj9erb7IYl9Hn0GANC6LuFPs-t6DK86yDYBEyOYQLoYAAXuIXcQtcD4UaEb3ifz8BicXNm_Xi97AhQKBjge02d3ACTnynTPzCiTdY48gbrlvhKVmKyI2T66ZC5dRI0tF_T-EuxC5K4Yykz3_C56S7fkf_evR1Sl4hQt26ixcGIVRm-ESSjSLm4MijDPDCBmNTY7z0e2qlQ8tYDwXc6YhU9JBhQRqtx4ggI7xOYIo2j9jYxhEMKiBGWiT7E7xBvj55owgQ7yUHI5rhZogvC9aD2NS6KoVkrDO9mFmit5QjzZcLAzt70f_VtUZD3j8vaP9VzbiSg0UQrpuDUAFoJuaaOGeT2-WAALA7HlsXcCGwL9FKXCwXbFOV7e9mqRzfqPdNsUP4NK2UOPEjXaJA_ZDABbqCcVChOVmTU5S8P0Ci_uVVA584KIOMZdVPBCycqAtEF1BqYxtqFBzz038eNbn6_axQgMEEQTMgT7sJJdZDaiDWJ2N3uC2xFrPFMVlm6rTFqkn0bcWtp7XynaIV-i_wr0qZy4sbCchMdOaYi4Gue10BNBhJChIPJj_6hjiEvGqUiFZ-36PvZ-gIijM55_f4J_3h2JdtUonHPnYMggf3lVwo8w5nZrN9LesDxeGtU2t3kE2z5sfdwO1LlchzPktlNKtIBsfnTONr0mEPPYLUfMlovL2UAHcIHyGYZzxap7apRvzBURDAERDXQWgS1Izcv1b7dAG1Zi_hcap00Y2-_uHwv4sMPsEP43W8sdjdwwBAWLwBjWSPPwDp7vFi7UR_zPnp9MtG4KAYOe7hkFGDOeM_8lTRqIMNLvJtYGABwqwfq2_AxaAGuST7Ap1UK8eIa6RHaeBOTL2Xk7gxIMKtS3JfQsygUuUK5L2wQIA5F1BKATXJ6ENxSLpMfWBY2NNkZ0_iJl6rpyqyZmjOIGcrGHp5Mi3Gi72qVX9wn-TMN3a7Okwhvk0jKJbuGnlEmWCeRnXdOG0IyAIdynhcaps6J3jkstfj7P2RWyKSK1SvKnYy7RioXz1yF6mvbSHrlFY5uBfnBMSVhcUfxBxwjp4SMG8qtg9aFYoHc2vcrSOeHRhNnb7Ub18RCQbjrEvkvFqdK6V-Cwm2Jlmsm4m7CIWzLtN-SFhCPaPss-yvsW12qUis2myTbSIPMWf6JPjDRkZcuLND-UYE67QDq36z0UShhyo1wBAQAX1ke56RVvstM9yjkeGn2e_GNhnVCuT-jnOaTMSkqdMG2MCxHDO7bcMVmXn-xx2VtkunpBQfXDaZM8QrOKQHjqiwSHdINWP5Zxdq_xvozNyOP-tEop1cobi9buUEJD7_-sUhruRF8PPd01K_3gdGnRzKu3vgFslVmYweJ9f7_p_U-vNdGf3oH2vEK9_ERZPGe41FY35P9ykiTvRWMBN-AdZb_Z9QjPSJ9iHcsV6OGv3JBlmXSlI9IXTH_9AQUC0X3-3NVPr7tJgo_oI98T5B--INcqAhWDYCy-MfFaep-AkGcbPKZVmS8GgVdBvWCkNsJeYT6TZZKL2Y59PMJmLK_ELt2_Mjm1tlgF-c_IXbZC4yHnL-fCPDXNeMTMyEYnnC0R1qN36IV5lDw3G1586xJu3LNUqbHRxfjB2Itnpfmk6Yd7NasedjtAy_6Gs4qi3PdwjkoFUW-Hd2i91r1DeYo9ZUaZeucvD3RL6wDMPNwd-BTJNSV6XjYMvD3B01PYUZypjtSoVBHy9wfEP4kkqqCMg78r5XFL2G9Kr2e7jmYx3--FebJR_B31XFJO-WmFWKY7bNGE-7BScoygBjcPH4BiHXp0zDKSkNPl2wBr1UW1M9zznUdiI5Jnl3QAiUPBVVhNK5xu-kn9iAPjE40qjPoOhyGqP7l51qBLArtRCAU5s1i1aoooKNMEOZWTbsnUdu-rYFimRXAyGpQ5K283-mMPo0Rco2SaTiaEpktq3e0xAykqy3oJCPYDAelOvyrn7xrM079pDf6B9JS4RZ9ZD3pJGukpkm3ryEq2114duDDxom-kYVNxOUbf28ozdRhMysNCOBZaDpbnHwL09gEHS2hLvmr4xvnqGlpCYZHH3T2SP50vxN9r1kE3Jn7nBy3QCCfXJt2SbHaIOcWWs_VR2SJK3kjiBN0kM09UmoH-JzFJdXy9KCx9ZVV8q7UmGaljYozYed0RuZQOy5zci9vZlLRIXegW_5kqO7lF16lFbQ3v_szQEHyPrFLvDZn8ZNhp04N7AvwBZoWaZCXWniNYkEQiS5bVRi7BiX0K-SbZwjvMKGX7VlfSvFbKf9XGCuKaoGKMX2xFdBtucQ3aoe0BFPoBd4Xiuin67iYREKf2ndM6sQUC8HHGkdwwNoqe1eFzANnl9NG9Hy9ljKJbBNUvaAy32s4o-DfIIJtHAye52m5Pl8VxyIxylSKMobMTl1tbS7OEeopyyHUXnbZIg3oneTYnSLYo1pQvzWykTImAC31qTrDy7CSLg3jiifd--b3Vllsj8AffFmGU-RH0fIjuWNdn_kT_9TtkBTeWi8BceqBbPm_kEkOQHG-s5sLBPLCUNqNO5pm-_I2PbNlU6GSEzTypUNopcNK6Z6HnZq8C_EutZpg41pfq_AbKrQDiWEFwYCQaB9p76xNBsJN4E9lmnd4tkmIJw46sIw1heOG8MjBrk7Nv24Rtf18sH-jm8P-7pJzYJ6hXdEnBgLQDRnyP_fUL29IIV12RWgKVeIY82SYcQGwLVK4Z6B7EGxFYdHHh82l04vdX2IVkt_ZUfwZrB-8XRyZ4nWHd1Ali0LRbagu3WZZSqc8CIbg9ZVG1DW4Mq1ER7x7Zl2Brl3T7rdxTtJd4lViRgiDJiHWtWEt6Ml-tW4ag7ozKNPUJJtiCOESsMwf0sm0k2_bxla34wm2tD9S-SqswwVX2isYBCbVUyLwkQpcjqWPYGgn0eVIyCAh-zqrMmY58kO0CbE5DBe2_oYwcmLs5nqYs_BWFQ8No9QrnmcSBXsirUbM_02nDkmvXy2FWyU1MYPYUHkOO9gu6px7lQk2VQwAboEoGYLS5U4hcn-4U00HE0FobBADCDQMF2DpE7ioEGu5LE-OMiZxnndgIK5pc6LMl9SfjlbzRBO5fDCYloGKLkA0JFOEM3_3PLtAFhwchSrWqKSAJvEoKC_NRQAkOlghEGQAg7yvbWKUsgov_BPsssAXq94gEE_QCInfn6xYxAx4d4wNNs-w3HAIAuCZBB6BtmXdJ0SJvOhbPUw0msKYRIHrvbn6ke7kiFhcnGegzAG-W-h8fPFVFehCWUCQiScwIwQ5bH5yCHSl7xmMpAEudexyDuoaWEwEIBMQJCAFmkOgyMgoJLxJF_BAjBwcACEVAKJcLbVfpGw8QK-kks3QETD6xuoMb9HwPkY8D0F_XUskKmmcaChoEDVTXntJz5RdbEwJ4sk7We4bww1FCKQI7-b_EMAQLCBUFDgbPe_tTq3aIX3mo6JSVaID3h5Nr0ys0znScG85_f4p0fKoTvAaI0qO4R_cHD-8h3ThqW0nsyHGNmWWpVSvTbpCEjNl1ncA-yjSTa0yy6RUvrCJ4TjgX5wr0MaclNshDu1Gw_HqEjnDqFPYoSJaeYDDO8UrDMc3TK32BgbBCiuYYI9vmGP4B4hwo1mSagPqDjXHNgrzy_KPefzPLjnCxTuAfJtgErUwc4ki2is-knbepw6mR9Ad1jQDYBfsFZAWSBGNgOQVj9w-SBGWXBvoHZvOgBGkACP8B-PqZB1cOAP0cAADg-yUA2wAmAAEA2gAAACcB-90oAADYKQAAAdYd5CkAAQDWKvn5SZsr1SsB1CzVLNQsAdMtANMAAC4ACfcAANIu0i8AAADRL9EvAAAAAQAAAQDQMQAAAM8xAAEAAABqBZEAADHPAAEAzpsHkADOADTr4TPNMwAAAABoB2Tyowb6BnmBBpNnB1czbwd8H14E_ASeAF4FnQAAAPdnBGU5AADHE4QEnwAAXQf5BJ8ACFUH-QSfCfcAXQVgmwSo9wEAXASgAFwEoOpyBZ8AAAAAAAACx5MGn1sGlgkA9AwAWwT8BKHAQFsHnlsHn1oF-wWhAMVR6gEAAPpfBrvmWQegWQb6BGmTB2aTB6BZBKQAAAAAWAT8BKQAAFgHao8G-gX7BokZWAajANeABo5sBPwHhXQEplYEjm4G-gZmPlYH-Qb6BXKJBKj_VQf5BfsF-wf5BaXnbwVkRP0BVQb6B1eiBfsFpQABVQb6BfsH-Qf5BWBG0i7CkwWmAACxpAaMG6-kBvoGplQHpbkHJhpUBJ0LVAf5BvoGpgD_wUAAVARmlgRpQNV-BmdAwCIfUgb6BqdTBKpSBfsE_AVoQbCiBHeFB6cBUQSrUQSrAAHOMOLeQgBQBfsF-wWrAL5CANsl72EHqgAAAAAATwarTwX7BqztGvlOBpxeB_kHaJEHkhoATQT8Ba4AAP9OBq0A_04GaEIETAX7BfsFWqEFr0wF-wWwAEsFr-QdSwRiTwBLBPwE_AVenQX7BZ0UAAAE_QBJB_kEswRFBvoGsbqPBfsF-wWBegaxSQT8BvoF-wdanwaySAX7BrJIBfsGskgHsUgGsgABqVcA61wF-wa02iYARgW1Rgb6BPwH-QX7BbYARQb6B5Hqfgb6BmtJRgf5BPwHtAH6BwD_AdrTlgb6BvoG-gZrIyoAq1VCBoM14mAGuL32jwT8BvoE_AT8BPwG-gX7B7jvEbP7AJMGkus8AEEFusR9Bbr9vIgE_AS7AAAAAAAAQQS73WQEuwBBBPwFbU4AAACjnQVgmwb6BfsHuQAAALKOBfsGd0MAAPsGPwZtjQT8BbwBAAAAPgdXogT8B7sAPge7sk8APQZySz0FW6AEvwA9BX1-BL89Br7_ATwGvzsH-QX7BfsE_AX7BcAAOwXByjU7BfsF-wb6BfsGvzsE_AbAAAAAr1EAOge_nf4EEuihBMMArElEBcIAALcASfo_BLvtGwDbJdPZjQX7BZRnBfsH-QaVZQf5BJ1fBfsGtQBFBrQBAEUF-wSWzDkD9mgE_AeSZweRaAT8BWGaBPwE_AdYoQb6BFqiB_kE_AdYoQZ5gQb6B_kG-gf5BKlTBqf_VAX7BfsG-gX7BvoEaJQG-gX7B4jQBQEbgAWL2JgH-QT8BPwF-wR4AoIGeIIH-Qf5BrVFB7S7A-egBHKKBPwHcACJBnx-BfsHWp8H-QRYG4kG-gb6BqxOBnACAf4AiQb6BnEBAAD_AAEAAQAAAB1qBfsG-gaPawT8BnMAhwVnlAT8BPwEsUsG-gdzAIYEdkGzK2cH-QT8BfsEjW8Glso2AAD_2I0G-gR34j1mBHmDB3WEB3g7BP3EAADfIgJ-BvoG-gf5B3v_OcgAAH4F-wX7BPwGWDcH5n4GfH4H-QS34WQHkthLRAW2pCUAAgB6BfsF-waA_X0F-wVaoQRaogZYS1cG-gX7BPwFggB5BfsHe34HfCtSBavYeAT8BoHfmgX7BfsE_AeCdwT8BPwGgwD_eAT8BfsG-gWHdAb6B1ueB_kE_AT8BoV1BIj_AHUF-wWFdgSIAQTSnQT8BvoF-wZ3gwb6BPwEinIG-gVdB5cF-wf5BfsG-gX7BJxgBfsE_AZWpAb6BfsGiHIFieUbcgT8BYlyBvoGiHIEXKAE_AdcnQf5B5XHLHEGigDTL86gB_kEjgAAAW0FiAMC0S8BbQf5BLf_Rgf5BrRGBPwFt9kCaQWQawdeMWoEfhTqFQv5Zwf5BpICAABmB_kHcocG-gWXZAb6BvoG-gX7B2D_mgb6BPwHgd42AB_h0JQFaDDKmQT8BWI2AWIFXjlkBvoF-wVdA5sGYJoF-wS1xjxFBvoEdIgG-gWaYQaZAABhBvoHW54EmADKmgb6BmKYBvoFtkUFmwAAAPsGXwf5BmM4C_Xxbgac_8iXBmNR518F-wX7BvoF-wdWIOABogX7BJ7gfgb6BvoGfH4GmuJ-B5vHOwDGlgf5BvoGnlwF-wedAADuEwH_AlkG-gX7B55bBmSWB_kFinEE_AV6gQT8B_kFovxdBPwG-gWeXQa77RTQbgRdnwX7Bb0-BadUBfsEaD3DPAEAVwe5QAakAFYGplQFqVIGfOeXBH99BH5-BKpSBfsFq1AEfi7HOQAAAQBPBqtPB_kH-Qf5B_kH-QVhRsIA8VMATgSDM0YGhwz_aATB7wBMBXwe4urzWABKBLMAsyoDaQdpJ_9qB7ybogWzAMX0SANEBmKYBrZEBPwEqAYLAAAAQwWXypoE_Ab6B1-aBrhCBvoG-gZgmgX7BvoHlQDKWUEEjOKOBPwHuPxFBfsE_Af5B7PJML4qZQa5AAI_B357B_kGukAEtkYFtLOUB_kG-ge5QAZhU7c7FQA_B15csk4BPgf5BI4wwEA-BG-NBbyyAEjFgAd5gAX7BJxgB_kFi9VXpSh3B_kFhDsAAAAA_wA9Br09BfsEwa-MBcGuUTsF-wT8BPwFwOdUBvoH-QemwJMF-wb6BacBUwb6B_kEnV8F-wZrjwVgVv8BRQaaGgK75VxIBZsAAABgB_kF-wVZGSAAAQDkhAV6Af9GuhrDpAWUZwT8B3x9B_kGg_kA6JYEWxSNBbYARQT8B6VUBPwE_Ab6BPwHen8F-weeWwX7BPwF-wX7BbXhyzZkB_kEYpoGjAkAy5oG-gb6B_kG-gf5BPwFl2QFk2gFteEgRQS3RQb6BrVFB_kFbI8Gk2cF-wR6ggb6B_kEeSRfB55bBvoG-gRpT6OhBvoFfH8E_AT8BH7cogVZXMh-BvoEt6mcBmzvF-0AmweS0ZYGkGoEaClrBpL80JwH-QaQAc6bB5bB_hL4ChE5t0ZJBPwHef_fogSUaAf5BvoH-Qb6B4kBbwf5BPwH-Qb6BvoH-Qf5BI5uBvoEqMAAlAX7BfsE_AeQaQWmVQekVQT8BPwHegF-B3sAfgX7BVoifwdXOyLTcgZ8AH4GjG4G-gf5BPwGk2cG-gVyiQV_fAT8BvoHi24G-geRAWcHXi9sBPwGoNsE4CJ5BvoHngfQhAb6B_kGeYEE_AZhmQf5BpJoBYAWCVwG-gRzMPMBZQaVAGUGlQDLmgex4WcElw69Occu6h4AAMoAAAA2ywA2AAAAyjYAyjfJN8k3YgeS5TPP6DfJJ9n1QskAHBsA4SD4CMg4AAAADFQFnO8RyAA4ABbrFbI5xzkIvzkAxw0tAAABAMYAOgDGOsY6E-FoBKEAAAACAPPRPQD7BQAAvRoZEADDPvIOAPQMw_dGAADDFCkAwz3DPdYqAAHCPgAAAADCPxPTG-wU3CTBPwAAAQAAwEAAAMBBAAAAEPG_AEIAAQAATwWtAAAAAgAAAboRNboHQMcCN8c5ukYAAAAAAQAAAAEJr1D6t0kAAAAAAAAAAAAAAQAAtgBV9r9BAAC1SwABALRMAbMe402zTQC_9BY4s03AQQC4SAAAAACyTrJPAd8hAAAAALFQm6EHvv8CuEcAAAD3-w8AAAAA9goAANwlOQT8BvoHiivFfwR8PKOhBfsG-gb6BnkaZwb6BvoHdYQE_Ad1hAf5BPwE_AT8BIR4BHqCBPwE_AT8BfsF-wWMM-tRBvoG-gb6B_kH-QZ-fAd_egT8BPwEi3EE_AT8BFqiBPwE_AX7BXYxVAb6B_kHrE0F-wb6B_kHbyJoBPwF-wb6BvoE_AT8BPwGhHYG-geS93AEjc2iBvoH-Qf5B_kE_AWlVgX7BfsGq08GsUkHuEEHuQI-BA", 0, 1, "SzzCa56RYrxCxjhrk0m19ggo1oB_5hgZ5dIskdKWdp4a0xnlpQ1QZxx1zDLIcLgFblgJNVi1-f-KbME9aaOgSVE155fISDe1nWG8QuoU4xtFu_L7iAduz42nYBWQr1GyTISxyCImtd0xhn1imOV6mgPrh3u_P6hWwvNIbYI07O1RrTK6N2B512KvMeJEu8M1-gdUFJjwDhjr94Ge4ekd1CIIuTwM8hDucYrsFgYIlFB_EXeseOXlDVenMs2uQEgQr2ShqVyyQwFZoEbH9qhW8BD-nD4iKsHVzWejYi7Gn2m4rZhlmVuT0Unvi7ORVk7t_ZfPN6Jt5-EhOMthWl7hP8AT6rdIA4B6bHohW4HOSMvdVd4LqmmfKzPSMfkP1uBh1tklANAgy7WKQjKKSJYp9VIHZSxDzu4QcIYHI9so-8Yx4S6kK4lrfWhlvfLytC7NVNs6EdFrBpnXG9mDFFbSW3awRbg9nhlukfl9CGXElqvhMIdbgOe4936GQ75PpFKySLKeYKtTrFMG6SnIOuGoq7J2I1y3ibirt3YmAg7wwjZajqhe4jDnPN3MLyKRDT7mYaY1NRb8f1KpMY8kKS_Pk2vNGFm-7hAo1k6wuUWlWc4wKT-WBvhIT-t787FMDFU5b4T3goV54xtxI2qlAVdhnodkEqtT17ps-fN3Bb772YF9g3tKtFKszDNqlOIcA_tcosE9p1jyDDMDx5Buu4CiICoOxZaRgFZh0KZYIQL4jmYImEB1ddZaOPl9yTE-nEXEr2rDPQn1NsTfGlU7cff5Z53fIP9DvCnW_2aDKaBe4TjKSj_xdLBPNLT8KfLPOby0oDDkpPsqDYCc2fAvqyamWAUDbFxGuSIJCGqL7BWuLQzlpCx34NIsWTA26_9ugUoGu8nc2tD9AVI5g_P6MtQW4F4IroNlMCfPJjgof4W8RGrg-C7YZ-ZEY2P_pdD0UsYsLyYETYFA7mUnfCoXTLSJek44582qas8gUrsT53SLWbnTlC5GrGw_mWiWtWzgWqsEbpyZSacOYsErVFJdjoYUxqhWxlf6RZ-p2AT8BPwH-QX7BfsF-wX7BvoH-Qf5BPwE_Af5B4AHAHIG-gX7BZVmBZphBvoHn1oHeQ8Cbwb6BvoH-Qb6BvoF-wRsAo4F-wb6BvoH-QT8B_kH-Qb6BXSHBnt_Bl2dBPwE_AR7gQZbnwf5BfsFWqEFrk0Huj8E_AT8BpRmBvoEfX8G-gf5B69KBHYFGmcG-gT8B_kGd4ME_AT8B7KjpAX7BvoFapEF-wX7B_kF-wR05KQHgXgFapEF-wb6B_kE_AV6Gv5pBfsEtEgF-wesTQT8BIF7B7BJBPwFrU4F-wT8B_kFbo0F-wb6B7VEB4L5fgRzB4IF-wZwigW512sEWlNPB_kE_AT8BJVnBJ9dBPwG-gW0RwWdIzsFvT4GWKIE_ASdXwb6B357BaZVB2eSBJkTUAV736EF-wT8BV-cBvoGtEYF-wa1RQb6BY8oRAT8BqoAUAX7BPwHj2oG-gRd_SYdzCFyBPwErU8H-QR66pgGW58H-QT8B5ISVQX7BX3yjAT8BfsF-wb6B_kF-wWe_l8Ek2kGjG4HdIUGtdUvQQX7BPwF-wf5BvoEgXsE_AR7QUAFgHsFiATqhQb6B10rcQT8BPwF-wf5BfsF-wX7BvoH-Qf5B1ajBPwGaht1BZsaRgVmlQVmlQX7B_kHen8Es0kH-QSfXQX7BWCbBfsGsePkggT8BfsF-wX7B_kE_AX7BfsF-wb6B_kF-wWhWgb6B21JQwaTZwZvQ0gFcIsEs8Y6SQSzSQZnOfH75OakB_kEW1dKB_kE_Af5B_kG-gZfmwb6BPwG-gVxigb6BniCBrDNfQb6BIf_dgf5BInxggR4hAdemwVvCgApWQZ7fwWqx4oH-QX7BqMc8Okm2gEcwS0B1CsD_NUk3f6EBlch_xFyBlg_4AD_AYME_ASCegX7BvoE_AbA39iDBIY1vTjlINIAAPKDB708BnPjpAV0AwEAIRhKBJkLCP8B-QNUBGgvZQd8KFUEeoIG-gX7BfsF-wb6BrNHBbVGBPwG-gb6BpRmBGuRB_kH-QdhXMlzBWuQB_kF-wf5BoJ4BfsH", 0, 1, "WO_7QhvqwcnpcpWktEQvoCerxoG3G74dXqs-rDbYBPwFlA0fsQDnJhHn4wMa46IGeoAHo9IDgQb6BQ", 0, 1, "UvYbDvJEXONhrmjIKvdVuzjIdn3yZqVVplmZ0g32KadX3P3dw6cFbldMsa9ScsPkzngXvA7o3xTKUFsXAR0yjXWhOp4El2UGb049BPwHbYwH-QX7B6VUBfsG-gf5B4QaWwb6BlxWwuz4D5MEmuR-BppgB3noFkXCGWIEwq4pwip3BPwH", 0, 1, "XeZk_aoQA54tJ1H-nDHZ4qRmJuZ_kWqH3CYHSJXkMsYvj2AtVoIGeYEF-wZ0hgRZNzHfH7yBB30IdAT8B_kFqVIF-wX7BvoF", 0, 1, "_kjHfnRDia_K0uLO0cTMyc9aU68TQ47mDA0DNusbGE85mlltpcqV7mBateKwDEqLeXED-60v9zgFPiWf_idsmFGHB346QQXB8usgwR_nATfhIOEf4QAg3yAE_TwFwrYG9E-xA-wUBfkJBTkG8sVDAv68DgjqSQGvStPnJWMHurk", 0, 1, "WSfakQX7", 0, 1, "UREz59vHpkZ86wq6u1Ig5sktrZFHBoV1BY3sO-TtdgeUCVwE_AQ", 0, 1, "Usa8xowYkOmD2AWZJbOKBKcF", 0, 1, "SnUsjKTV2GIOsUZiPb_new3mXA3nB_sL8R5sBXIFAP47qCrW", 0, 1, "Uiko8ZaFBe3b9ZlrJg78_QACBADTCg", 0, 1, "-h1fax33", 0, 1, "IEjgLNtWggawEQ", 0, 1, "1HrM5IDdHKpMXX4kxpkRfJ9a98unB-ykSaAqwcvVjrvU7vlmaHOK5RaNARDw1HYHrwDsXgac_vQe7GIGwc0b7mMGmmAEseUBGOgBGEwGqNkpvA", 0, 1, 1, 119683, 1, 21961, 0, 1, "fsrRik4F", 0, 1, "_WlvbCkgZWAWJAP2COw", 0, 1, "D-c09I4l21RJ-A0A_6qR5ogE5yQEmj3aMB0_BYTrUsM", 0, 1, "Xw82kpSNhcehqG6dz4QKXxeI1VcKAQAA2CfyhQeEBc0oewewSQY", 0, 1, "2W3-vysFCvcpUIgFnNpDQgdh", 0, 1, 1, 14232, 0, 1, "wpTCv1I4_Om37KGF8VX6KNSUEiBkz3KGB3XXJPnDvGOV58zhWnzzfFwHnf4GAP34_xX55RlYBKT0DfYSTweWYwapAPoGAwL_7P0QsjMk", 0, 1, "qb5QB47A1fOaLfc0kBSJ6_kaUQSYyTTvAds17w", 0, 1, "cfDKIpiUofc2d49_hfj-2xT9_7lnnFeAf1ATllS0rD0pyK1r6wy6U7w48wNVsRKUC_QACxjz_gThLvX-f1kHk-7rB-qcBPwG-gb6BfsF-wb6BfsF-wSAfAX7BvoG-gT8BPwHZhZ9B8D_OgZSzzEAzyHfAAAA_yIA", 3, 56874, 1, -64924, 4, 64924, "XLYd4h5Avxq4ACsAJAHZANsAIwDVACkAzQAxAMkANQDLADMAywAzAP8h3iLeJ9kAAQD_AAEA_wAyAM4AMgDOADIAzgAyAM4AMgDOADIAzgA", 6, 20, 2, -56903, 2, 2, 2, 4095, "NfzQAgMwa1vHA-P-Gzf-wf7a_hz-5mGpM1uNewACAPwAIADfAAAh4DD1AAAAAAEA_wAAAAAADe_f_wAD_AAAAAAA", 3, 18, "CwHJH7loAQH-SAD4vTMO_wABAAAi3QAAIwAAAAAA", 5, 56320, "XsoAenr-nxL-WQIG_gsBUgP3AfwBAwAB_oz96yzYUpvgLM0AIxriBf8jAAAAAAARAO8AAAAEAPwA_wAAAAAAAAABAN0AI9wBADHPAAAAIgA", 3, 56671, 1, -51863, 3, -58, "ztLsADTrqAEC_gMBgwHkMwAAAADNUQAAAAAABB8I", 8, -22350, "j_7-_v7-_rL39_f3d2sBknYDAwNUAAH-4A0L9oAAAf4lAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", 3, -116, 10, 55708, 10, -56762, 9, 3767, 1, 8983, 2, 2, 26, 43995, 26, 6, "$1", "$2", 37, -52822, 1, -11857, 2, -17, 1, -4, -3, 32, 8500, -1, 1, -886, 0, 29, "AFinAT8ZKAUthCUFdB8AmXkrGmtAAfwBIAyoYwIW_i8SnsL2SIUZO8spEUvcAAGkFhIVOGsHTgAAAAAAAAAAAwAAAAEAAAEAAAD7AAAAAAAD_QAAAAAAAwEAAQAABAEBAAACAAAAAQAAAAEA", 3, 11, "_nOLDAc5w_78HwIIEe1OCAP8AQ0e_gICAAX8APh-_SUFAP0qXl0BAAEAA-wAAAAAAAAO8gAAAAAAAAAAAAAAAAAAAwAAAAAAAAA", 3, 15, "-wIAFiIO_v0YJUb-Ah48Af4CJrwSFTSEhoMUAK1ELRQC4FcPDBQrChcf90EWUQgGMyQ2vgsECxEBUN6N_P7-AyIRAf6W8lIAAAEAAAAAAAAAAAAFAQAAAAIBAAAAAQEAAQAAAwAAAAMAAAAAAAEBAAQAAAAAAAEABAIAAAAAAAAB2wAAAAAAAAAAAAA", 4, -5, 2, 11, "2QRm_kQAIUwA_RGV_mUAEAXBav4X_g7-TDP0DvgB-v4T-_z1-gMH_v70Bw3f_jsXAkIB3i24q_7-GwBvCIQW_q1ESAD9_lNAR_39AAE1aUP-Jwj-_XDUBFIJMQYIAE4AAwAAAAAAAAABAAABAAAA-wUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwADAAAAAAIAAQEAAAEAAAABAAAAAwAAAAADAAIAAAAABAABAAAAAAAGAQABAAEAAAA", 4, 6, "i_EwEC7sBhBGg7VWUgAyABUvCgH-WQkP8Ar3AgD94gME9AIJAwk9_f4BHwgbImb5APsHjGQY_k8AlwX8_QXwCfgM-_r6CvcLzf3-Vfz3BP4C-e8AHABL8wr5-wj-1QAuAPwDcBtiZCdv_ZoLvfw3_QACUvf83bL-AwAEABUz9vwD60IWmkb5AQUA7wQL-fEAIe79IHp5hD1TMkMBCAUgSwkBAFYGCAgPDgNOAwvs1AsWG6EQdaQB9w8G1Sb52h8A6_z9ChDnCRz4A84e5yID6hHx_gEnQABt_gQA_YL9AAF2TwGnD_Af5yfYHvzvFPnYDSDuAfz1BgDpGwPw-fMMvQXzBl4G7gz5Bu8R_uuzTl70FfUE9fz2Fu72Grf-_QAw_gOcEwD9_lEAAvdeIIL3AmwMGkT9FAFe8wr1I_kM8Sf-chL-6fUS4xzxAfr5Htwo1Sb9_fSyAfy4Amp1AQAAAAEAAAIAAQDUAAAAAAAAAAAAAQAAAAAAAAD_AAAAAAABAAIAAAAAAAAAAQAAAAAAAQAAAAABAAAAAAAAAAAAAAAAAAACAAABAAAAAAAAAgAAAAAAAAAAAAACAAAAAAAAAQABAQAAAQAAAAMAAAAAAAADAAAAAAEAAQAAAAAEAAABAAAAAAAAAAAAAAAEAgAEBAIAAwAAAQAAAAAAAAAAAQAAAAEAAAAAAAQCAAABDbgAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAEAAAAAAAAAAAEAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAQAAAAAAAAAAAAEBAAAAAAAAAAAAAAAAAgAAAAAAAAEAAAAAAAAAAAEBAAAAAAEAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAABAQ", 4, -18, "XPkH6vwZ8gMNaXIbOucGAPsVzg8V3xvbLfvqBe4L9RHvFgYD6fMFAPrp_v5j_dOV_gsASWzz3f7-toRZQPwJ-gL-F7wi-AH9Ri02Dg5HxgtC9x7QFBED_v4crxAH-_ylfAVl-wL4AfkvHBcPAgwAwi3v5QvsLu_6_OwEEuARGucQAejZ_QITDf4BRD89_P4C9f0HCnz8lgH-_RRnAAAAAAAAAAQAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAIAAAAAAQIAAAABAAECAAABAgMBAAAAAAAAAgAAAAcAAQIAAAABAAABAAEAAAAAAM4zAAAAAAEAAAUAAAAAuAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAEAAAAAAAAAAAABAAAAAA", 3, 16, "1v0CmwEg4Rzq-vsMDfP1E-AEFQ3HBSLxEGuI8_L-9wT9F58s_QD7D2n8GOT0IvQJ_P0H9uQDHvKZBP4zAv0D_AF-LfwAcOkW8AEFAWQB-_4F9WYh_AT4AF8vAAFWAP38YAIc9wkPBBoF4BPqCwUBAe_6_in-AT5JAvf6AvYYCM8nAPb83xT-EwjtBeck1ib9AO7lIW9oFD0Z_vj5-wvxDgX0_AX9YR0J2yrWAw8V-dcADgn0EeQk-OjtB7BCABeTB8cECr0aGM0JAP0lyCn95Av0B-wo7SvN-yX57uFC7PkJtPgD9w6SAAoPHgFWDQr9-Nj-9gv5l1_7AOk9LwHwF0ABAIf-sf6AA1U3_nm06vwO7wn9CvUENRgOpen7Ew_hGff6-AkI6gwN-JYiq0piAgX84wL4BBAJpQibI_77CP12LmkLQA0AMtP5DyDw_Q3l8iEG6gzWIfP9F_MP2J86_g6t9AYC_v77fwH5_UtJIx5A0BPnJfru7QwT-vrsFgID5vsFCe39Fz-CCBQC_ivf5MH7_f4Bi_sm4wQa4QTvCxr5bTkC_f0CW0wA_f2N-CQlB_ldIgVTDSQ3IvwEAPsE_IgKAgToGSQi9_nj_Cj-_vncmjny8vAT7A4J6QX3_BH1HPA8BWURJEIH8gYH7wgI8tIH0x3i-xvJ-EXzBdQM4iUK0hYOFLwoCPr0lxgCLhwER6lBJvcW4-Yk7PgjAQD35NlD7RDwBAbYHH8O-PgC_Qr19YtB_AR09gDVEvD2GvLyZhIh_AH8X_gA_ADUUwAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAIBAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAABAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAABAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAABAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAACAAAAAAAAAAAAAAEAAAAAAgAAAAEAAAABAAIAAAAAAQAAAgMAAAEAAAAAAAAAAAAAAQABAAAAAAAAAAAAAAAAAAAAAAQAzDYGAQAAAQAAAAEABAABAAAAAAAAAAEAtwAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAABAAAAAAAAAAAAAAEAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAIBAAAAAAAAAAIAAAAAAAAAAAAB_wAAAAH_AgAAAAAAAQAAAAAAAAEBAAAAAAAAAQAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAACAAEA_wAB_wAB_wAAAAAAAQACAAAAAAEAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAQABAAAAAAAAAAAAAAAAAP8BAAAAAAAAAAMAAAAAAAAAAAIAAAAAAAABAAAAAAAAAgAAAAAAAAAAAAAB", 3, 13, "yP38ATv3_hAB8v0K1CUR9wA4Av7-cQAWAPizAX39f4QC-gj9_AExVTBEC_wDJJ8O9OgABxT58g8F-BYtxBsB3fcKHeAcBsgEGQ_a9_wM9AsPFkkoAf7SHRVSM_kAmgHT_kAY_iP1-wf6B_34A-ED8gGH_oK0zXYAAAAB_wABAP8AAQABAAAAAQAAAAAAAAAAAQAAAAIBAAAAAAAAAgAAAQAAAAAAAAAAAAAAAAAAAAABAQABAP8AAAH_AQD_AAAB_wAAAAAAAAEDAAAAAgABAAEAAAIAAQAAAQABAAAAAAAAAAABAAAAAQAABAE", 3, -6, "YgZhIQUNpjIDtgK-WlgAFcs2_tIw7O814vr3_ugFExPIL-kN_tr6PvzTLN1yJwD8Kv75BIoF9wYBzFQf_UEIJ_A1xOgME_MZ1APzJ-T7-0Df9RHzAL0R9vdFBUcAAbYGAwL799gzAgX75vxh7FcCAv35BgP-S0wD-pwP_e79BwUK8vk-_X8B-Ylg_v7ICQHqBBf7BRQa-vIG9_gQsKsU9k7v8CXsAwj58BXs7AD8JP77AE8nA3wGBfMO-fj7thsAAQkWD_0M5QgR1IljNATrtlvv-wbmGs0EKEj-LWsDAP39y3kq8v7eEf7hOdgc5OsZ9CL97gvfLjUNC_TuBmk_gvwD-v6OZhvk8QnzdQj-_f5kBgHqAAn-_Aj10iQZAgBa9QAHwEb2EOQWAu0H8v4SIvoP_vYH_vkCif4D9wYC7qsDUCwKd5f18_4VAfH7BAQB8AsBHiQ0MPtEEfwD_SUBsRDtFOcGEfH6FPQM8fL9_hMPGQD8A45vJgH17Rf46_4a4gb84Cjw9hoQNR_oEATiFvjTBgkA-vue9_39CPQM-wL4ATYx_icA1DQlAfrhTwTwCPn5DvkH8pxL-wRv-v6LBPkE_KneAP35AQbzBVwmyfsvTAwJQfsC3ur7CA3uGxDXBh_-Ate_X_3uOFp5BGIG_vw6_gklAP2EOEkj-90ZAuEG5iT4Bdk00_UtzzbPDRWwAv3VJQT72QMVBzLBASZB0woHHAPV-yX36wMlVv3-_fwGQv7-WPsAqf4HDPoL7hfqBAoC78pV_fwDfwD9_gh2AR8U_AErAQT5CP774iPlFgci6DHWB_X5Jt8b_PAY2CHsUgAsVwbKIwsC0e8wEcY33_kXzzzbAxAHCuX88Prt_hHi-PoH_QfvCPz-R_4QIvsAAY78CQP995rdQ2Ut8vAhyfY69e8Y0kDo2P4OCAr2AeCvhzAAPmItNuXYLuoXFv4KwQPjIdwvGr4-_c8MR5okEOwRBvz53f3lQdImEg8A8vFNPwOa_vr8BW19BPgC9w7SFQAkBUIA-w0eRADfFALARf0IWwb9-QEBMNcKFgIEjZYCigfyEPnyBA9jBP2w_C28CgID7wIQ6hLv_gtg-zEBA0kt--jmDAf9BvPdMgH-AlQP-d8p8ybt5vcI9RbWAwAJIK0UXPj1DfAQBOX9GYlK6SLmA_b9B_ua8gUBC_vx-wYmEE4C_vwB_L_-V_sgAznzDPwL-_3yBAgB7hLzBPjTBA9Zdibw_AMF-5_gCv0E9wMBAPRTKf72_iIAVoqPCSUV5ur3E_fuFQEBZfCAAQDzdP79fkrVBCbUDRL66RkN6fID9y_68J5z5yDwBMwKIe1zIfoJ7wsA7_sC2ABlFiLkEggLy_1g-Qb8OQAlGgPjErVH9wICOkv2AAF3MDsA_SgP0AMpOwbWGtoK-HOIHOcS9hEMKVnoQvAo3_wGBBDsEPQWAId99fB2hx5kB_sALf4evgEDAfgh6AP4hgAf_dzaCvf-LdkV-PgR2B_w5wE_BPu6EJOMQvsCWv0lMj4A_AIIG8wQNOLVBP33P_zLMRe--EjEGOzxFtkgjL2PNBTgLfb1uQALCfAUN60vN_u17g70EO8I7gIPAP366woB_ABE_nf4B_X-BQGaABn8ICdynW8OAp36Avn6l_7-Tv1lDO8JAQH4_QMBTQW48Rfs1UID7gT7DQIQTwA1RjLP_vYF_OoM9w0GIJ0JzBn0FNLkRbUtAQJisuUbvzD0123V9dcqzAp7g_kT5gYI6w14aQDu0RKkJPQI3QQSBvT17QX7HwogLAz2CQP5BPMC_gj40fr7TA7tDvb6Duo0_AOfkQb7BvkDy_IT9GQBaUQADeUU7gL2CYL6-wUB_vv7A_zxBwAG5BE8A_4BACcC2TgAAd4CBPkI-sD-FQkDsCoH_AAR-O0KA_MXt_cFYQb9_QBLrwjqEucN6gkRAArqBuMAHuNIAEryBv4C-RbgINwX7_gbWQcC8f7-9g7vtgXcLE_-SUZSAWv0ONbTJ90HBkX99wjw9fLl-DDpAPAq3wsCD-7iDPf4KN8A7mUyEObx_QAN7RP0dZDY7Bzo8yC6UccdAvL0JQzWBffrKk3-EymkDCPiC80MKf3f8iP98CXEBScP1fwMmQoP-uQd9A_55Rj45yHt4xfkDfn-MOr6Cf7i_RkBABkBh-8Q8P4IBPT-6gB7D_r3BBXwAe8IAvmLnyHmAPP88hQB6_oEAaqQXv0F8wr-gADWSJ8N-EkBAd3lF-8NyxL6AAc2_vuxAS397P4H7AgE9w0A655BOvTF80PwBN0i7uD4KwEFA9gX_QKZGfT--P38BgACA06F9AQC-wQD6Ar8yUaHBgDyAgYW9OY80BPn9Av9DAHCKfkn_kD8APvtEP4CG_0IBgMG7_kBy1AF9AuUEpj-CO4R5xj69gf-_gPsAtAEVP3-X20f4AQC_RzvGOziFAP38wUaPf_7ADf9_QAsA_38Xx0BmQAB9gf57_cIALT9AiwHmIsEDMYG9vAW7Pr5AR_cGniQj_6ue1ABGvvlFvECAwDoHgjoB-Uh_V4IBA_27gv3fyf8AUX-dwQC7f4BCpFoCPkDAAH5AfotVCEC0wfxAfx-AjM7KUiN9wsr6gD7-v0ctFzQ-0_T5hrWFcw4DfYuNf7LBfT-C-wr7CT3zxsD7wgb_N8e2RzfpQLm_-DpFOA0FOEL4vIf3O8WKgb58PEVA1ihwRTw2SqcBOMM-Q2rUwOtCxP-BgX8loyV5f39Cc0BoPgB4V_dBwv1-eoA_aACeP5DAbHz9ekhBfb6KM78NAMA_PTrIADhKen9_gjnHPUC9CT05MNvAP1--yzILw74AfQCZBIMDAksffUG_dQEE-ku7AcSvCsU-HTcHuYCDuM84fHJDvEE_gTqMdS25REE6RPxEAX6Au_4CAzCIv5G_QCYLftmF_0C_Y-89wMG9QQD-v29_gVWAv78AwcEEv3kFwgL0xQPBgD5Af70Av4wBS17CHAgAJYBUQEG_LftADVaALEB_Mh-Drn7-vkDCAUA-9aXAAAAAAEAAAABALUAAgAA_wEA_wEAAAAAAAAA_wEAAP8BAAAA_wABAP8BAAEAAAAAAAAAAQAAAAABAAAAAAEBAAD_AAAB_wH_AAAB_wAAAQD_AQIAAAAAAAEBAAAAAQAAAAAA_wEAAAAAAAEB_wAAAAAAAAABAAAAAAAAAAAAAAH_AQEAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAACAAH_AQAAAAAAAAAAAAAAAAAAAAIAAAAAAQAAAAAAAAAAAQAAAQAAAAAAAAAAAAAAAAD_AQAAAAAAAAAAAwAAAQAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAgAAAAAAAAEAAf8AAAACAAAAAAAAAAAAAAAAAAABAAAAAAEAAAAAAQAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAQABAQAAAAAAAAAAAAAAAAACAAAAAAEAAAAAAAAAAf8B_wAB_wAB_wH_AAEAAQAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAIAAAAAAAIAAAAAAAAAAAAAAgAAAAABAQAAAAEBAP8B_wAB_wH_AQAAAAEAAAAAAAAABAEAAAAAAAAAAAIBAQABAACzAgAAAAAAAAAAAAAAAAAAAAAAAAEAAAEAAAAAAAEAAAAAAAAT7wAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAABAAD_AAABAP8AAgABAAAAAAAAAAAAAAEAAAAAAAABAAAAAAABAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAACAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAA8BAAAAAAAAAAAAAAAQAAAAAAAOwVAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAABAQAAAAAAAAAAAAH_AAAAAAAAAAAAAAAB_wAAAAAAAAAAAAAAAAADAQD_AAIAAAEAAAAAAAEAAAD_AQAAAAEAAAAAAAAAAAAAAAEAAAABAAAAAAABAAABAAAAAQABAAAAAAAAAAEAAAEAAAAAAAAAAAAAAAAAAgAAAAAAAQAAAQAAAAAAAAEAAAAAAQAAAAAAAAAAAAAAAAAAAAAAA9knAAAAAAAAAAAAAgAAAAAAAAABAAEAAAAAAAAAAAIAAAAAAAAAAQAAAAEAAgAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAABAEAAAAAAAAAAAAAAOQAHgADAQIAAACyAAAAAAAAAAAX6gEAAAAAAAABAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIBAAAAAAAAAAAAAAEBAAAAAAABAAAAAAABAAABAAAAAAEAAAAAAAAAAAEAAAAAAQAAAAABAP8B_wAAAf8B_wEAAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAH_AAIAAAAAAAABAAAAAAAAAAAAAAEAAQAAAAAB_wAAAAAAAAAAAAEAAP8AAf8DAAAAAAAAAQAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAEAAAEAAAABAAAAAAAAAAAAAAABAAAAAAAAAAAAAAEAAAAAAAEAAQAAAgAAAAAAAAAAAAEAAAAAAAAAAAABAAEAAAAAAAAAAAAAANgqAAEAAAEAAAAAAAAAAAAAAQABAf8B_wAB_wAAAAEA_wH_AAAAAQAA_wH_AAMAAAAAAAAAAAIAAAABAAEAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAEAAAEBAAAAAAAB_wH_AQAAAQAAAAAAAAAAAwAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAQAAAAAAAAAAAQAFAACwAgAAAAAAAAAAAAACAAAAAAAAAAECAAAAAAAAAAAAAAAAAAAAAAIAAQAAAAAAAAAAAAAAAAEBAAAAAAAAAAADAAEAAAABAAAAAgAAAP8B_wEAAAAAAAAAAAAAAAEAAgAAAAAAAAAAAAAAAAAAAQAAAQAAAAAAAAABAgAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAABAAEAAAABAAAAAAAAAAAAAQAB_wH_AAAAAAABAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAQAAC_UBAAAAAAAAAAEAAAAAAQAAAQAAAAAAAgAAAAAAAAEAAAABAAAAAAAAAAAAAQACAAAAAAAAAAAAAAAAAAAAAAIAAAABAAAA_wABAAAAAQAAAAAAAAAAAAABAAEAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAABAAAAAAAAAAABAQD_AQAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAQAAAAAAAAAAAAAAAAAAAAADAQAAAAAAAAAAAAABAAABAAAAAAAAAAAAAQAAAQICAQAAsQAAAAAAAAAAAAAAAQABAAEAAgEAAP8BAAAAAP8BAAAA_wIAAQAAAAAAAAAAAQAAAAABAAAAAAAAAQAAAAAAAAAAAAEAAQABAAAAAAAAAQAAAAIAAAAAAAAAAAABAgAAAAAAAAAAAAAAAQAAAAEAAAMAAAAAAAAAAAAAAAAAAAAAAAACAAEDAP8B_wEAAAAAAAD_AAEAAAAAAAAAAAD_Af8AAAMAAAAAAAEAAAEAAQAAAAABAAEAAAAAAAABAAAAAQAAAAAAAQAAAQAAAAAAAQAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAEAAAEAAAAAAAAAAAEAAAACAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAEB_wAAAAAB_wIAAAAAAAAAAAAAAAAAAAIAAAAAAAEAAAACAAAAAAEAAAAAAAAAAAEAAAAAAAABAAAAAAAAAAAAAAMAAAAAAAEAAAAAAQAAAAEAAAABAAAAAAEAAAEAAQAAAgEAsgD_AAABAAAAAA", 3, 170, "jfxlwXsM_fgM9PQp-ggcwfgATx7-FOgR-vzGm_EP6Rb75f38AXgAN_bN_AGA9wT9BfxnKEX9wPAG7vcs-fP6EijoGuId7QnvGX86BQkkE9UHH_TtARPoG_797hHsCBDBAQA1_Aj8cfvIGBz64yPx9ugOAucjPv1VIAB4PAfMFO0x5u0c9R_r9fMywHyZ8P4_DAT2rUSyCBEh9_oB_qAI9QQB-gB3Hymp-AQE-T_59A_zFuYTbvwD_PkDc_7-AxLvEQD53iv9FRP6C9wT8Ar69gMKtDoYBnsBNzk8UgAAAQMAAAAAAAAAAAAAAAAAAgAAAAAAAAABAv8B_wEAAAAAAAEAAQABAAAAAAAAAAABAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAECAAAAAAAAAAAAAAAAAAAAAAAAAAABAAABAAAABAD_AQAA_wEAAP8BAP8BAQAAAAAEAAAAAAAAAAAAAAAAAAAAAP8BAAACAAAAAQABAAEAAAAAAQEAAAAAAAAAAAABAAAAAAEAAAAAAAAAAgAAAAAAAAABAAAAAAAAAAABAQAAAAAAAAAAAAAAAAAAAAIAAAAB", 3, 372, "oPn9fiXc0z0A5f0R_fLXONkGe_EB6QUR7_D99AYHAbL2CgAB9LEV9PzQNSy5Fvj88CX26AIhcAEdc_0H_QcA9AD4DfaLMQOH5AwE7Bn1AfybYv0DCfwD8QEGQwT5BAm4_PkJVQEB90H1-zLBN9zxCBX0KMH6A1IBAAFWLP0DkQnwllYI_gXE8g779QP8Bt02ADcd_jL3lgL5pRQP2am_Bfv7BGopMrMBX2URDe_6E_H9_Av9_PUTSvwI_aiuFkN3HTtn3hfgQugHC_1nlPsJ7wAd6QL6CvESAem1UQLvCgLwhPoBHhHs4Aod_un77SnoEB2NvO7vIeAc5QsM-Pzv-RMJCgYB9QzjFAoC5gCjMwb0Bv5DKQAmAwGs_br9AAVC8RH6vqYA9wX-bh43txr2BQf87gAzBvYSB_r-6wZoOD0A_DmK9f5SDE8A8A7uHwDZBSP88yQb_gPq08gH8gX1iPs_E_AFDtsKBg8CAPT1BQIFbgElYE_sAg32-wXzCPp0_c7-A_kJ_bldjRXBOvvy2S7YFfUV-vMY6qHrAAEqOAIE9gX7SwAJMZcHAvv1C-rrF_X8BfjS9A7GAz7xOmiDDQIB6Qi8-7gOjfQBEMKY8Q_0AQdF_f38Yfn5VbwwU_0C-rLgcAv4BB7kZgGZ-w0HD_UFBPAKlABV_KkT7x35PsfaGPgPu1ErLc8Y7QD6CAYDkGv0B-sYAfb3Dvf-B_4H61QQKQE2BvUBnfsJncj2Bfv6BUEHAvn6EaUCrGdHBfD4FNP_-wED_PkDUA8H8PoQ5xHzE_vyBA7sCe8Urgh0AP3-A1L89gf9_v0L9CkgZzjZ-R30Ahrr6yDh3FgQ4R7z5A_-DQJv-g3zBG5hCAEB7hX85gsw_TOGAv77AqygAfwB-fkDAvk__Qb8AP24afr9sDSlTNQa5cxl7e4U6fmBAAAEAAD_AQAAAAAAAP8B_wECAAAAAAAAAAAAAAEAAQAAAAAAAQAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAEAAAEAAAAAAAAAAAABAAAAAAAAAAABAAAAAAEAAAAAAAAAAQAAAAAAAAAAAAAAAAMAAgAAAAAAAAABAAAAAQAAAAAAAAAAAAAAAQAAAQAAAAACAAABAAC6R7IAAAAAAAAAAQAABAAAAAAAAAAAAAAAAAACAAAAAQIAAAABAwIAAAAAAAAAAAECAAAAAAAAAAAAAAAAAAEBAAAAAAAEAAAAAAAAAAAAAAAAAAABAAEDAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAIBAAAAAAABAAEAAAAAAQAAAAEAAAABAQAAAAAAAQH_AAAAAAABAAIAAAAAAAAAAAEAAAAAAQEAAAABAAADAAAAAAAAAAAAAgAAAAABAQAAAAAAAAEAAAAB_wAAAAEA_wAAAAACAAAAAgAAAAAAAQAAAAAAAQAAAAAAAQACAP8BAAD_AQAAAAAAAAAAAgEAAAABAAAAAAAAAAAAAQAAAAAAAAEAAAAAAAAAAAEAAAABAAIAAAAAAAEAAQCyAAAAAQQAAAAAAAIAAAADAAAAAQABAAAAAQEAAgAAAAABAAIAAAAAAAAAAAABAAEABAAAAAAAAAAAAAABAAABAwAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAQABAAEAAAACAAAAAQAAAAAAAAEAAAABAAABAAIA_wAB_wEAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAEAAAEAAAAAAQAAAAAAAAAAAAEAAwAAAAAAAAAAAAABAQAAAAAAAAAAAAIAAAAAAAIAAAAAAAAAAAEAAAAAAAAAAQEAAAABAAAAAAEAAAAAAAEAAAACAAAAAAAAAAAAAAAAAA", 3, 629, "yP3qBh1FAYEycm9-y_2u_P4CjQNLQw79AP1iDJayGCr-XySFT8D9CwfzAPu_JEmM-Bb3_AnrAK8YNlkB8gfzFv3rAAH5fv0xF1VAAflqAfsAUZ-yAP1jAGX7AvME_cVsAAj7BvAG7rABe_5WATrE2SMC-OYJ_uxI_AXtpStBMxDy_iS0UwkC_fr1aogDOfsEIgAjw_ULCxD6_QPnAfw8AfkEDPn8AQJFfgIGS1MB_AEEZoMA_fB2aLJBAkj-_nz-M8r3kAsCfzQWBnE4AAISmlsFBP7-Cg7Q_Af3_PhHAwjxAvcC7QZKSdUBQgwYo_7YAWVRl7n91AD4BPkIKgEL7wAa7UIC_h8Q8wzqDgARAwkH6wRh_vYH4hr78BDzAPYSrgFx9RTu9Q353_le3AAl_DLvDeMEEwD4C-oKC_IQ89cuRvw5eh5i-QJgiAPMAvPa_u4ErdcQ9wElBPsgQ68O_v0HJ1sCOXjSLgEd-wTMQMRR8QHdalOSAsADAf6bLlX2CaEAvc7-Bcmz2YuU_RfoCwT7AgkATlU9d_v5CO8Lo_179wP8MRZM6vnjTpON_laCBAb93flrOzJGLwP91QCI_gFRV2AuAR7-eFMRCPW3mc6LLv2UaXw-_C9aFewI_v79SgFQtgIFlXYC_dNPCnMEAQT9-fi2VQD4zGf98e39_P2QhPzb94kEDfXkUSlCCQDU_owB_rVU_XuwJOVW7wYnY6Xj_Uas_h7-YZL8jIOVAHkBzeb7DADqAIT9qen_94RHLucM_JcDXDf9KTcJKSIH_sEjye-Z_gEtAv1NVQbxWAX-0_wDAwbs_QD7ewD8ggL-jrlU3BdCMRIAZHg3rQIoMP4D4KOkqdcF-4Gp7sI1BpkAgQCJb_qAIkwIAcyE4B-w_QDsd0yol3W_3FGYAjb_DRq3AP36AH5cKpoNQcbpAlOVAAEAAAEAAAABAAEB_wIAAAACAAEAAAAAAAEAtAMAAgADBAIBAgAAAf8AAAEBAQMAAAAAAAAAAQAABQD_Af8BAAEAAAACAAEAAQEAAAEAAAACAAEAAAAAAgAAAAAAAAIAAAAAAAABAAABAAEAAQMAAAAAAAAAAAIAAAACAAACAAAAAQEBAAAAAAAAAQABAAABAAACAAAAAAAAAAAAAAIAAAABAAAAAAEAAAAAAQAAAAAAAQAAAAABAAEAAAAAAAAAAAACAAABAQCyBQIAAANEvwMAAAAEAAEABAAAAAYAAAAAAAACAAAAAQABAAABAAEAAQIAAQACAAAAAAACAAAAAAH_AQAAAgQAAAAAAAACAQD_AAIAAAACAAAAAAAAAAACAAEAAAAAAAABAAABAAEAAgAAAAAAAAAAAAAAAAACAQABAAAAAAEAAAABAAEAAQAAAAACAAAAAAEAAAC0BAAAAAACAwAAAAIEAAQAAAEBAwYAAAIBAQIAAwAAAAEAAgAAAAAT7wAAAQEBAQMAAf8BAAAAAgABAAACAAAAAAACAAEAAAADAAMA_wICAQEAAAEAAAACAAIAAAEAAACyAAUAAAMDAQQABAAAAQQB_wEFAgACAAIBBQIAAQcAAAIAAAABAAACAAACAQAAAQACAwAAAAAAAAECAAAAAQABAQAAAAABAAEAAQAAAAEAAQAAALIABQAABQIAAgIEBgAFAAMBAQEAAwMABAABCAAAAgIAAQABAgMAAAMAAAABAQEAAAEBAAAAAQACAAAAtwcFAwAAAQUJBgIAAAIAAAMFAAIDBQAEAAADAQEBAAAAAAACAAABAQC4Ag0LBgABCAAJAAADAAD3CwQDAwAAAAECAQABAQABAAEAAL8NBQwADAEFAwMABAEBAQPSBxQJAwMA5A0DAwMAAAgAAu4ICtQoAQMA3g", 10, -22547, 10, 10, 10, -782, "NghFGuETFE0-MExTdVpXS3RbENKrseM-APEdTgAAAAMAAAEBAAAGAgLSLwABAAYAEAEZB2oC", "$7", "OwH__wAo", 83, 2307, 86, 13, "$C", "$c", "59AAFXCLjeVJd44e1yirqSEAABCnBHKKBHbyW7JOOQY", 0, 40, "4gEi-i7kCnkA4wP_AAAAM-8ADwD-AA", 3, 1, -1, 2, 1, 1, 7, 2, 6, 1, 7, -1, -2, -1, -1, 1, 7, 1, 5, -1, 1, 7, -3, 2, 1, -1, 2, 6, 1, 6, 1, 4, 0, 3, "g8wK-CDdpFI-39cZmCRnhAQ6RUk0YQSbd4YfZC4G_s9jb0xm4ijj7uHRGEcq8Qqr8wz3-_wxDy_VAPMXUQKNKDj-kHsBRj9GxCAM-_tyAdkt0ZPvCRPIHtwO9hAU5AIc8PDvHZ5h9QaVe_wtPHzZ_U77CQdD-wj1AvgH1r4PVv0AAmCVDn0XWWD--owBBfwE-_YG-QqJ_k_6_gL-BPz25C0LCfL6CfYAJOxVANibVPXbJgMD_AHNMBr9AAL4jQH7AjLkJuYJENko6gzhFtQFCyEtKWIBAosAWlkOGwCgBvIp8NMCCPIkEfHm-yKm-P1bAwb8AQazOWXxB_b2E-3-F_nsA5UBYgH4Av0I9_sMAUopA3z9AvsEdxda_Vv-_hz6BQTtAv4W9AcDBPNFSAgBAATy6Qn-9RAG7gX0AcK4A_7-Ak8BEfv2-xTvDPCESABd7gMYBgPh_fkw0hkNBskM8RUS5QXoW_0FAvr4Cs8B-wD9p_5aAOu79mAD9gEJ8_71CAIB9vgA81D13wED-Aj4j_cG_QVk4wj3Agbu_RT68tRK0i_eB_YXC_cJ8-8S1QIvHQF2_AAS6opNADBVAfL3AQ_wBeIOA-YGB_Em4fH-N8oD_JIBdQL6_QX-BQn0BfcA7QUUjjhvBBT-4xn09AUGEtoLAgfrEpoCLQGuAmb1-xT5-APyAwn0B_z1BxD59XD8BA4CAAAAAP__AQEATAADAgD7AAAACKRiA-8D_QAAAAAAAwEBAAQCAAMBCAYAAQbcAAAAAAAAAAQBAAQAAgACAAEAAAACAAABAwAKAAAAAAYAAQYHFrkAAP8B_wH_AQAAAAAAAP8BAgEAAAABAAAAAQIAAQAAAgAAAAAAAAACAQAAAAAAAQEAAQAAAAAAAwAAAAAAAAAAAAMAAgAAAAAAAAAFAAAAAAAAAAAEAgAAAQIBBAUDAAAAAAQDBwAAAAAGAAAAuQAAAAAAAAAAAAAAAAAAAAIAAQAAAAABAAAAAAEAAAAAAAAAAAAAAAAAAAIAAAEAAAAAAAIAAAAAAAAAAAAAAAIAAQAAAAAAAAAAAAAAAQEAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAB_wMAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAgAAAAAAAAAAAAQBAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAIAAAAAAAAAAQAAAAACAAAAAQMHAAAAAAACAAAAAAAAAAAKAwABAAAAAAAGAAAAuAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAEAAAAAAAEAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAgABAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAQ", 3, -7, "VC37_mAGR_jyGNgo1Qwb5gMN9eoCHeT9-vwS9yhvBhzs6wsT4wT7C-0GB4RqEk3yBw318gcHAff3E_7lE3rmIQPjBBzt_e8Y_u0k8Qfp-QP2ABqQWv1fPnVY_gLq3B3YOc8Y8fcIAiYE3wrW1RLiXeFvnPnoSNUZ58ID7A3y_QwE6xfo5mv0DPAS9QEF8QTS_Av4-_0L8D8KVgD9TQsWQ_3-BAID_AH-_Er8hbICf3mHN1ke9BT893J_H-ru_QIZ8QYN4Rv58_gHGOEe8uvN_v0A53v4B_kI_gHaAfoD_IgD_v0IifcN3hYB9RIH_OH3J-sO4wX4MlcEdgF6Phr-Av4h5gv3KfNJqfYn3w4A2c9L5Ruza9EE6AAE5woF_fgD9gkL9PpeGEWN_A8R8OscAv757Q0E4w0JAeod9fi6o4MH8wrzDwL77v0CC_wA-vj9BxAYAF8AAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAADAAAB_wEAAP8BAAAA_wEAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf8AAAAAAAAEAAAAAAAAAAAAAAIAAAAAAAAAAAAAAQAAAAAAAAABAAEAAAAAAQAAAAABAAAAAAACAAABAAACAAQAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAYDAAAAAAAAAQAAAAAGAAAAALkAAAAAAAAAAAAAAAAAAAAAAAADAAAAAQAAAAAAAQAAAAAAL9EAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAQEAAAAAAf8AAAAAAAAAAAAAAAAAAAAAAgEAAAAAAAAAAAAAAAAAAAAAAAAAAAE", 3, 39, "IAOL8_34BwFhJicvsAEaHevmDfMBEfDzARzEHxMNB9MAiz396Rj05w0V_Ov9CRIA5Rrl9FABZhR26hAC5gn7EPcO4hYE9OAAsDDV8SHePN_n9g0l-PrVF-VD_vf03vYUGAjBSckm3uE39B7OAPgm4FxZATEfAQc_AAYL-PEcAtL3z1jQFCDf9u4cJL4WHssLMMYYC9sZ5gam5x7y_vASAPOXBwAhAwL6WxkDAvMK-_yhRvUF_PP8_v420wf2BALxEiABPxgAXgLOSkNeAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAgAAAQD_AQD_AAEA_wABAAD_Af8AAwAAAAEAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAEAAQAAAAAAAAD_AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAQABAAAAAAEAAQ", 3, -6, "CuwD_uwAHQoA8gr-_vr5DzYB_vn-kPcBBvex_VIuAHj9AHf_AAABAAEAAAAAAAAAAAABAAAAAAAAAAAAAQAAAQABAAA", 3, 5, "AwT4Vjj7MEgGAAQioO4Y8Pb5DfQd9QLtCvMFBw7mMSFyRCT6DeAX1GSw6h339BACFu76-fn5-xn4-Yn8B_bNDBgC_mkwAmpw_QzxEMsBFe_4CAP8C_6A-gEB9gPP5gELDg3q2f4-A_TJAB8EAwYN-QHcSzn-NvkAAgWS-PcLAPUMakCPh7s0-tQL8DXkBAPiJfPrGPD7AOct9Af1AMllovznC_b--_0IBwjoB0w7zvwWAOb5B_ITFDg6Bf5WUv2XEu4CBQj4L_5_BfsBhvw29fwM2WDl9xHuG-URBfvvFPGKLKsdRdUXAPAMoFQR_vHsF_Ij-wTTGesm9uYe6AcB-3_8AP2HFOcJwAAL-i7oAAcPA8Ya6hj1AQEe9e_o9AERAQUe7Or6CwL9AwI4FAVd_QP6_gQ9VOgAEZZTMMUJCgEh-2GPBtcI-DbYC-IiFZY4IvIBA5Fs9wH3Gkv2_Qvtbaj0-gsB8_h9AAACAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAQAAAAAB_wH_Af8AAAAAAAAB_wAAAAAAAAAABAAAAAIAAAAAAQEAAwIAAAABAAAAAAAAAAABAAUAAAAAALoAAAAAAAD_AAEAAP8AAQAAAAAAAAABAAAAAAAAAAEAAAAAAAAAAQAC_wEA_wAAAf8BAP8BAP8B_wAAAAEAAAIAAAH_AAAAAAAAAAAAAAAAAgABAAAAAAAAAAAAAQAAAAEAAAAAAAAAAf8CAAAAAAABAAABAAAAAAAAAAAAAAAAAAAAAAIAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAEAAAABAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAV6wAAAAAAAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAP8QAAAAAAAA", 3, -9, "2vMSYDX-_on5-Qn3_AcF0QUL8OUq-wXy9Qj4CPz8AA_1ABQAKzkDUBD5CPv-9gPPPlP99AL-EO0DAwAHBPsI9RL5-AX89QcJ9gYiBvMM9v7-mQDzDf788QH-qAL7BQD9_FA38w7xCfgBA_oIcQz4AfsE95j-8_wJ_fwL8vz8TwT8Afz9Ovsw_v1VJ_rA9wb7C_kEAC31DfkW1DfTMOgB5PUFHwvMDt0zEMgN-xb3-R39BgbKDR7bIAr-TwXt9gMM6A_uBA7qH_MHBe0C9Q7yA64AKAcA-w3wDe8T-vUHlTQPIyj-0gE8Af4aASr2DPz7CPf53wn4AAj7BfIC-wQHa_0AhQz3gQJcJvtPT_D59vwB8vcRFNUE8xnuF7IvGQkB9wDh-S0E4_l-mgH-AWf8WW7YAMUQAuP1JhDT_voh8sYlMujqDuQNBAq-_PMYzRPlFwvsDwrvEufbN-b0DvIG9CztE9YZCuT3Bhz2VwP3_BH22fw34g4FBuYQ8usZ9PEW7EWvDusSI_jdCQTrGRX7Uv6YxOwR_AXrG-QY_ukg4RD7Dg_1fAIE-ACCAWL6COoF9TfxCRgA-hT0A-roKdsS9AMJ8nEyJPf6P-AO7_kT4uAXCN1AxSbQQM0nlmPYDPsP--LieZf7-f0CBbVgDQgL0AA__KoYMwj8y_493Oca6e4GN9XwDBz69BToGtMCFfr98rj8AwBY_f0A_Z2V6gj-wDc8-NQ-3SvHF_725yb2AP0Y1fIvAska7Az5BiHgKdn1Fdc-Eukf3BfjE-4c6wIGDOz3_RT2C2_8AAKd-e8JBvH99g8OaW0B_A78-wn4-QECDP7oE1v-agP8-wAE_r75SWX1_QMAAf4J5xX5Egn2A_wB2R4KEwIBAPgH9Vk-_f0AlwT7pBHs8ArxAQ7kEfIT-QEBAgXhCHAD_QyRB_r9Awrm_BcF9gAK8Ow6MQYA_S4AAQIA9Qf5Vf78K_sEzwzzARHxDPEC8xH1BO4m-gb5_UEbEgTk7PgwzxrxEwPbHhTTBQgQ_Q7g8iYJ2A4YzibgJscjvvxo9wr-A_T1F_D5BBPnBgAG-QCTNgsS-Qfv9g_9-A7xAfsMB98G-vNTAvta9gTxGgEgAB8n1_39QgX2BQEWBf7--ggAQuYFCu8UzfoFA_0A4BYA_GwBAfgBlgf8AQTrFPAAC_AFiwsB8_D9Bf1PqpngsQP5_gnsF98IAQ7KM_XvBNd0Pf6SAukW_AfJzVzw9AYlyyHuEdgOGdgVC-x9HA3hBAj7BMxS3Pb-Fwv29wr-9P4OJU3kCton-9kt1SgG6BiITAUM6wcd0QEOD_IDCUzi_Qj8-AM9IwYLJ9UJ8_Ub_AbdBhfq8yfo9g_uA_UDCQT-_BZN_gUd7xIV6_VP3RcL7u8d5AMBwkEUBPLuBAY-SRz-HRYCBtPZVdYVFd4cAmt93h7-5xP67gQE_vwn5gFYNAL59wv8JhAADyEBqe8OBPAH8AeOCsYw103B_QYdxiDz-BEc_OLtJcQ7Z0Nc3dZN49cs_usi_gy2-RQABw3cNM0UKw-hcQED_FcCAfsnMgEAPMtJANcpPrMABxzIEwEbFagWF_QQ6ccqLwnzBM_2NxD5zegNIhHBUOsS3SPYE84AI8X9EMsyAvEB_A_sCBHgLw4tAPz-BYb4JPEOAfMK-vj8EdYh_QP66gMGCwPy_vkL9hHIMz_8evIGBPYBBPK9_EdrAPwI9wQD_ACRDXMDAPYQA_gDAfj-9QMR_v79kQf4CPeUTP1l8AgDAwHxF-xc-wn4thbz7wIQAuQd7g7mARTnDe7vACUAO_0ANXn9AK3VbgYH_Pf1D-yrB3AAAAIAAAAB_wAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAQABAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAAAAAAAAAEAAAAAAAABAAAAAAAAAAAAAAIAAAAAAAAAAAAAAQAAAAAAAAH_AQEAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAICAAAAAAEAAAAAAQABAAH_AAH_AAEAAAAAAAAAAAAAAAEAAAAAAAUAAAICAbMCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEAAAAAAAEAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAf8AAAAB_wAB_wH_AAH_AAAAAAAB_wH_AQD_AAABAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAQAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgABAAAAAAABAQAAAAAAAAAB_wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAABAQAAAAH_AAAAAAAB_wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwH_Af8B_wH_Af8AAQAA_wABAAABAAAAAQAAAAAAAP8BAAAAAAABAP8BAP8AAAEA_wEBAAAAAAAAAAABAAABAAAAAAAAAAAAAAEAAAAAAAAAAAEAAAAAAAAAAAAAAAEAAAEAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAEAAAAAAAEAAAAAAAAAAAAAAAABAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAIAAAAAAAEAAAAAAAAAAQAAAAAAAAIAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAQAAAEAAAAAAAEBAAG3AAAAAAAAAAAAAAAAAAABAAIAAAACAAAAAAH_AAAAAAAAAAAAAAAAAAAAAgEAAAAAAAD_AQAAAAAAAAAAAAAAAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAAAAQAAAAAAAf8BAAD_Af8AAAABAAAA_wEAAQEAAAAAAAAAAf8AAAAAAAAB_wAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAEAAAAAAAAAAQL_Af8B_wAAAf8AAAAAAQD_AAH_AQD_Af8AAf8AAAAAAQAA_wAAAAAAAAH_AAEA_wMAAAAAAAAAAAAAAAEBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAD_AQAAAAAAAAAAAAEAAAAAAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAQAAAQAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAQAAAAEAAAAAAAAAAQAAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAABAAAAAAEAAAAAAAAAAAA", 3, 8, "BDcAATXFkykpnCcp1PwX-Rm1ASL320HbB_Im4ekCBx7TPwXOMvS7MOEkzAkYKK8oAdU22wo4vyLZCQPsD_YP8g3wD_ztEOh2Df5kHOH-B_33BfoF9E7HywL-RfwAcv7rH-YWAOsADPUI-AECDyH-OQPxCPvO-whO-vn5DgXyBQPuDu0pBwL-7Af2D_EADfQF-gf0Qwb61iXX-vwL8AEF_gb9_V0C-gL9oAga3RYL6PzzEez9CP0i2hkH9P3tEGQR_gP29gkA-fxBBfot_nsD_ZihQfoSiQAxBgEG5xUF6RP57RD49hn97AEeov0CAEYX8AP6_hLiE-8k1RK6QQUM8_Ep2gvoUT4U--r9-yXl-A77C_XhJQ2KyvwG7v34A_oOCPIK8AgJ6QEW69ZFAQBFEz3x5hoM-fEJ_vqNXv77Av15BvkE-3hu_UlRAOAZ8Pv7F-gf2RbfR7oB_qAr-SQB9hYDDg_b9QIg_eoA6BkJ9xjz-doPJeQB49szEvLsYCJAsgUI-vr-Dvrjp0X42BUTDs0FJM4IFAEgzQDrNsYJJ4qHuzTWLtQx4egy1-4P6yTyAeAf3EvACf79_gX4WXHtAPz9AKI68cYw3vMACxAHDAvqA9wq7fgc2CjiCwQY-8D4-_4W_B3zHPnMFvSjDP0Q_OAbBA8F8fbgFeoHJO7wAvAIDPQ9_gT-_a0F-P4FCf76BQAG_gXoDgD98wMGBowd_v4fW_0Lax_z8wb9_P4X6vr2BwebGyd3CQDxAwMO_ewEE3KmEvn69BDvABrh9R_mFeQABfr7lwYA-AT9DPAH9JL--0x6_QgG9AjyDf3-8Bb97E4B-tj9-QzxBfQT7Af4Dwfv-BTa_fsAAzn-ATMAREL7FuQM8QYPrjwX8AfUHLsr-vsBAqtNFh8CFf3X6-5F4MgcL9z-Gv7pqVbYAvlFyDS5EuOvceMS6jEQyBT9BRxVyKwL7vw0FcXmNPMZ4br48hTt2x5XqhX69_QW99D0AQAP_P7xA7QVQwX-_P4B-QmPD_jh3TcKAfAN_fIFwQ7-Gv4BH_0ARpsAJ_oBAP0FAPsBXe8LBPzhGPn-BAr4CBH4Af4EAQD5CEbsBATz0vwBAQT99gJfANgJ3QkrzDH4JKob-yb-4hAGB8YqDsAiDuwh2wT4Cdts_AH89gD9BTYrAvr8fQMA-Zz9AJ1JArUC_QT3_a-OAvmYfOjtAhAK5w7yBu4YA_7z_PenAGcBRHt67fYF6RIM5BHu9yLm-vmP8hMH7fr99BbuDAn85wsF8hj6bmxwEfbvFO8S_Qfu_foQ8f77DvaXaAJ_Hv38CPMG9RL-_vX9EOsF2AD5hPgF9g34A_gBb_4rRnX7GBwSAd4AHvkT898l4AnVLvb00v0D_yENARYB-wAJ9_A_pzPb_e4HDO8uvyz-7QsR-ywA_v5l_h2OBBLWLccZ-w_UB_QY5RsU8A8E-OYv5BDPNOPfFvb8Or34MfLvIIMC_YIAAAAAAQAAAf8AAf8AAAAB_wAAAAAB_wAAAAAAAAAAAAEA_wEA_wAAAAAAAAH_AAAAAAAAAf8AAwAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAB_wEAAAAAAAEAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAIAAAEAAP8AAf8AAQAAAAAAAAAAAAEAAAAAAAAAAAD_AAEAAAAAAAAAAAADAAAAAQAAAAAAAAAAAAABAAABAAAEArAAAAIAAAAAAAAAAAAAAAAAAAAAAQEAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIBAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAQABAAAAAAAAAAAAAAEAAAAAAAAAAAABAAABAQAAAAAAAAAAAAAAAS_RAAABAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD_AQAAAAEAAAEAAAAAAAAAAAECAAAAAAAAAAAAAAAAAAAAAAAAAAD_AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAACPcQAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAABAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAQAA9AwBAP8AAAAAAf8AAAAAAQAAAQAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAEBAAAAAAAAAOYaAAAAAAABAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAH_AAAAAAAAAAAA_wEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAP8B_wAAAf8BAAD_AQABAAAAAAAAAAABAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAIAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC_wEAAAAAAAABAAAAAAEAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAEAAAAAAAAAAAEAAAABAAAAAAABAAAAAQABAQAAAgCyAAAAAAAAAAAAAAAAAAABAQAAAAEAAwAAAP8BAAAAAP8BAP8AAwAAAAAAAAAAAAAAAAAAAAAAAAABAQAAAAAAAAAAAAAAAAAAAAAAAQAAAQEAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAEAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAQAAAQAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAA", 3, 82, 2, 34, "_s8m-xEh0j7DMtpEygAM8CLW2hwrPIX0PhLvC_i1GwY0wff4QuLfPeTtEOkYZQj49gT8DOsK-hWsDkP9_a8JA_oVEP0D_PQGkQEAeRKF8QMI-_gJo8j6CPzrEe4OBC73Cfj61SzyBvoL9QHz8QAK_v7-A_AJ_Zoe5f74_YECAEGZE-0G_gX2_g7y9hLrFArdOAP8_ewPCuAGFv4E1zD1AQQA4gncJeIGB_r3J6luAAH4RTj-LPz8AwX-_omBDPz9GhPz6QH8DfoMC9zvFh7MCRPm8TIEzg0F-C3BHRjQNvz9CNTgz9HvBELU7e8C9wEn6BT8B9kR9wIO1Sf2AwzjABDr9RXg5e8JAAcD7w35BPT7_rED_f5KAfzC7fEG_AamKgBr-Qe-cvj8De8M-AP-_vgBAwsA_P4V-AMB_P38Cfz5XvcG-TH-0STeJfMV4hjzEM0d5yNKn_MSDNoKGOj7BQwN1ggh8-2hcAJdWCT8AwT8AfgI_P1O_kiWAFP9BpX-JvUB_gf6CekxA1YAIAD9kQACsVcDLMcNAO4HDADwDIAAZP1Y-QnoCwj-_BEB5fIJ7hH58Q_fkPET7gIL_Pj7Xf_0CPn-DPQJ9gcF_QlXMf0H8g_wAQr7BPgDyvMC-5bnAgJnaNj39Tf-8eYR9xv98fIX9uvYTHlAASUJ5BEE8vv-ARb7yEjm3QP-ATYAAfr4CATyBFAFEM0SHNvyO97s9TgB4CjK-yXi71jH3RQR7u4d-hMM6eYv4OwhOlP9_gNa_v4CPuRXCD7L-vsC1ew11Dvf9RXSHN_9Bjz-yaJgCRHpKMI33RUVzRPyEDb86xTv-Q4L5wf4BfwI8QoL5AG9-WsDAAABAP8B_wEAAAAAAAAAAP8BAAD_AAEAAAAA_wEAAAD_AAEA_wEAAAAAAAIAAAAAAAAAAAAAAQAAAAABAAAAAQAAAAAAAAEAAAAAAQAAAAAAAAABAAAAAAAAAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAABAAAAAAAAAAAAAQAAAAAAAAAAAAAA1ykAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAEAAAEAAAAAAAABAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAABAAAAAAAAAQAAAAAAAgAAAAAAAQEA_wH_AQAAAAD_AQABAAAAAgAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAEAAAAAAAAAAAAAAAABAAABAAAAAAAAAAAAAAABAAABAAAAAAEAAAKyAQD_AQD_AAEA_wEBAAAABAAAAAAAAAAAAAAAAAAAAAAAAQEAAAAAAAAAAAACAAAAAAH_Af8BAAAAAQEAAAAAAAAAAAAAAAEAAAAf4QAAAQACAAAAAAAAAAAAAAAAAAAAAAABAgAAAAAAAAAAAAAAAAAAAAEAAAAAAAEAAAAAAAAEAAD_AAH_AAH_AAABAP8B_wAB_wABAP8AAf8AAQAAAAD_AQD_AQEAAAAAAQD_AQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAEAAQA", 3, 11, "Xf0F-P4IJAEA-_r7BwLz_I7-dqb4-gP-BvYN8nMAAAAAAAEAAAAAAAAAAAABAAABAAAAAAAAAAA", 3, 128, "m_EB-f5E7RP8BPwF8_oABNAG_vsF-NrCeAH-AxPy7SHgCRDqDwID_ivjDvzvCSH26w_6_v3wljUD_D_9_gH5AXsCO_v-9gz2_X44A_79_QLSFtPwKOT6AxHqHPTeL84NA-c1xyLh8wcIFdf-LOcp9BDT-iDXOvTAAAf-CR4HD9oNFTLzDAASaZHk-wb2Dvj2DA785f0Q_RH8DfPtCOkr-ewEAfCqBgf2dgEAAAABAAAAAAAAAAAAAAEAAAAAAPIPAAAAAQAAAAAAAAAAAQAAAAEAAAAAAAH_AAAAAAAAAgAAAAAAAAAAAAEAAQAAAAAAAAEAAAAAAAADAAAAAAAAAAAAAAD_Af8BAP8B_wH_AAAAAf8AAf8BAAAA_wH_AQD_AAAAAAEAAAAAAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAAAA", 3, 11, "Bg_6_PqYAf5JAvvi9vEa_QIA5RvmAQQS6vYCG2QOQVX5-Q7xAgm4-wT5hAIB_gnmBfr6BwwA7P0F-gj6AhH38wEFAvIAW_z-9wPD-_0AB_MHVgAD9gAB-0_yAPsY3Bgh7fgQ7QXuItIl4f0FF-YH8xb9COkB4Svk7ccv_gIB8_0wMQL5Vy8D-Uf-Tv4IAv73-guKVfEWAgEA_cbwAQMA-foMAfIL9OY4_gf-_lT8Iwz89A_--vf7B4_9AgH3D_j4AQz8_n5POwAL9gMC9sxVrI7vDQTy_AkE6xik_qz0C_X6B_kJUAEBBfL-_AUR8QX90LwE9_0N-v37_Qn6AQSyAP0Ief3-AfxlcOAK7S7uEfoK7QT400r--f7588s5FxflWUv8JSX1AQkAA-39_hFWEDHiHco11R4PCOT11jHgAwEo-ev-BBr59tsh9_73APcO_gFQAgAc_jz-AqYd1yP0EfmVZfjgK91boAgL8f0k7_jpJuEh4QL9FPz8-B3pAAkI9fwH7RrjCRMAwQDK_AAE-AX-FBoF8_0CC2l0rv0DC_UI-Pz9iiqzAgP6_gYA8QP9RQv7BPME9wUACvEAw58D_m4B_PsFJgQD9fcP9A0Q2hX3-Q7sBvIBAvgAQA719BIA8voN-AQH6AMG9gYQ_h43AP02PTr-QkT0Bwr79QT7B_0E70qJAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAABAAAAAAEAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAABAAABAAAAAAAAAAABAAAAAAAAAAAB_wEAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAQAAAAAAAAAAAAAAAQAAAAABAP8AAQAAAQABALIAAAAAAAIAAwAAAAAAAAAAAAEAAQAAAAAAAAADAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAEAAAAAAAAAAAEAAgAAAAAAAAAAAAAAAwAAAAAAAAAAAAABAAAAAQAAAAAAAAAAAAEDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAwAAAAAAAAAAAAAAAAH_AAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAABAAEAAAAAAAABAAAAAAAAAQABAAAAAAAAAAAAAAEAAAAAAAAAAAABAAAAAAAAAAAAAAABAQAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAQAAAQAAAAAAAAAAAAAAAA", 3, 98, "Vu4l4QUN9ucFHdwg4Qz1G9ocFdwfBt8R-CvZ9vYQBvYB_jbzB_v-9fgUAeANG-EKAAvmDwf97pQHCfwA-AnwBvkL_PLR7gEPAQDnNs_6ENcVAgYW7wuVAP1k-AL-AngBNgGLCvkHBPAFAAPuDn149wb8Bv38QQIBCnM4AQBc_AD7AZf26RbmCGq9A94H7u5E5uD-vVHcKu3l_TzNIdopD_v06ff-8gr2-hqlEPD6APsI9QfrKjYG_Yj9_FsHPPkC8foHAXRP_fj-C_IG_v3RBfQGOgP-_TtMBAH0AfwGEP796RrnCpzxCP31FPP6Ce0IBWj9ACb-JwAjFyro_vwB-wjKnvgA-P3--gP8AVT9-gJa9wzwCPr-CP5MdQDEtP1T_AfxBir4BP4D9RD5-Qf4A5j-NSP3ugjqI-MV-wX86Av6Bu0k--ztJvPqBgXIUVvC3ErfDvgQ-f73E-oEBfgP9gnxC_GQ-gAnGvjkGQID8wmFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAABAAAAAAAB_wAAAAAAAAAAAAIAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAEAAAAAAAABAAAAAAEAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAD_Af8BAP8AAQAA_wEAAAAAAAD_AQD_AQIAAAAAAAAAAAEAAQAAAAAAAAABAAABAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAQAAAAAAAAABALIAAAAAAAEEAAAAAAAAAAAAAgAAAAMAAAAAAAAAAAAAAAIBAAEAAgAAAAAAAAAAAwAAAAAAAQAAAAEEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAQMAAAAAAAAAAAAAAAAAAgAAAAAAAAIAAAEAAAAAAAAAAA", 3, 96, "D3S-BAD9XETL9QYE_v389kcCCQT4APUS8wQFpvyz_voB-wVjAQBDCeIN_vsS5RbnDgb5_fYECOkAHvndRA4F8BTv8R72BuEi4wr6DfUKOf7-dv05jggH_foB9Cxx_gEm_A4X7QrqF9co9QPYBAwX2P3eNgfvBgsD4yDfBfzz_CH3DshV6wIX6vsM-wbxGvn-Cer3FAXpAQj4BCDTgv0IAQIQ5ApqAf5DACr5_frzBRbsAgLxBfr9FfYGNCAB_v0l_mR13v4F_Pv6-_xE-LlhB_j9BQH7AgDhK7Tx8DTbAxnSBgAODCG8HQ7d_fz8IQUD5fwEAxjNCm34CPkB8fYB-3P--AT7gAb6Af43_hxPAgX--_3hBQD9CP78_QP-Zwr9YPf5AgH-_QQBAP0Guj_-A_pLUQ31_Ar6A_7hG_0Ogw0lzvcAAQb3FPwA-vgI_Lc3XP4DIhcRIAMk_v4xS5D7AGkD-gIC-9bLLABVrABpBg0AAvgF-uoSFQT4-ggB-JdG_gD87PMDI-Tz-wAP7PiwakH7BADzAw758AD6KtX6Evb9-Qn5eEEH9Av89wQGUf5IB_T2AgMCSxYu1fdEDAYA9AYB_pv-srwM7wb-De8IAfkCCivzBQz0CfzxDvb7Yf1DAHxbAP2O_lUR-QL-8AEHCfz6CwL5_OsEG1GT_gaqff77-A_--vkT8O8H9hnqCsAyASfy8_R19wP8-QkA9-D8-w_8BBHnDAHy8xHuD_f1FgH8BzIj_v5mBf39WwX99v4HBgHz_gb7C-p1AAEAAAAAAAEAAAAAAAAAAAEAAf8AAAH_AAEAAAEAAAAAAAAAAAIA_wH_AAH_Af8BAAAA_wAB_wABAAACAAAAGuYAAAAAAAAAAAAAAAEAAAAAAAEBAAAAAAAAAAEAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAEBAAAAAAABAAEAAQAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAEAAAAAAAAAAAAAAAAB_wAAAAAAAAAAAAEAAAAB_wEAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAA4h4BAAAAAAAAAAEAAAAAsgAABQAAAAAAAwIBAAEBAAMAAAAAAAAAAAADAf8AAQD_AQABAAAEAAAAAAAAAAAAAAEAAQQAAAAAAAD_Af8B_wABAv8AAf8CAQAAAAAAAAABAAEAAAAAAAAAAAABAAEBAAAAAAAAAAABAgAAAAAAAAAAAAAAAgAAAAAAAAAAAAABAAAAAQEAAAEAAwAAAAAAAAAAAAAAAAAAAAAAAf8AAAEBAAAAAAAAAAAAAAAAAAAAAAAAAf8AAAIAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAABAAABAAAAAAAAAAAAAAAAAA", 3, 241, "S9wRAAJp_AEH-grWBSTjAesd5hvzB-7yEAXtI98g8QML7gEsAP3hIwLnHPgERf4ChgH5AvgF9wIxAfwBIY8CAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAQAAxzkAAAEAAAAAAAAAAAAAAAAAAAA", 3, 85, "uIj6_dT7_QP2DPj6Af65Gyv7ACMLFAH-e_78-wHzAhriDfQDnvb7-hDvDfz1CvoBCvgBM_1SIf4VDgX-_v4jCN4AYGC89gH4AAIBLQL9NpgBAAABAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAEAAAEAAAAAAAAAAACyAAEAAQMAAAAAAAIAAAE", 3, 554, "w6xOOwsI_PsCAXVZ_gAI-OsEB_ET_PMa4_0QgU9bDA349RRdAQECBAAAAAAAAAAAAQQAAAAAAAAAAAAAAAABAAEEAAAAAA", 3, -11, "Ke0M9w3h_fz6Ap8A_f79KfnxC1JJaAD5LCv9Bfr6BpG2AMoI_PIOsP2L_gL3BvcK9wHz4v44AjBFAHle_Y78AYcF--sHBvH8FAUF3wYD-PQe9QjuAx35CPIAEQL--vUL9gr3X_cA-wn6-wT7Li7-P1n3AfUSAv32CfvwDwTrM_4jawABov0C_cEK-vYEC0aP_v0AAmCL_nD8MOgH8hf1KPLfDM884wkZ9PHuCfERFJVcAAVHAQD7_YwD_nAAAAAAAgAAAAAAAAAAAAIAAAABAQEAAAACAAAAAAAAAQACAAAAAAAAAgAAAAAAAAAAAAEAAAAAAAABAQABAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAD_wH_AAEAAAD_Af8BAAEAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAQAAAAEAAAAAAAABAAAAAAAAAQAAAAAAAgAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAABAQAAAAAAAAA", 3, 38, "XPwD-Wf9_QKJ_vtiAHL6D_cG9gb9Bvv6_fetSP4D_SqyAPT9BQH7DeMCFO_8C-8L-JwJCPkD6A73DQQA8O0IAPr4G-0HBuwJBQfgK_wuOzASAAuYAAAAAAAAAAEAAAAAAQAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAA", 3, 8, "N3oC_S9hgAAmANAANx3-_v3LCPoADvz5_RD3_ABM-PkH_PwQ9Qb6_gb69w3RAJPU_j3w_hMu3gEA_SQy_QMA-wSIu_0AiVH-Afz9qIwCAv45RHlh_TFcALjcAfwc5PUNBPsG8Bv2AAX7AkwCUj1oCfIK-gEBBUDXAfvU_AD9AgEytf11_fwAVwfnJO4E6Rb6F_Dz5wr2DwYH--cO7hH0_A_pGvTXAf5OAIkBQQBhAQD7YQCN_Qry_gfeAfz6_QvyBAn0mQL7SQH--fzuDQzlR8YG9xD89JX5Cvj0BfcKBPMHDewJ-AcF9QQb6ewPAPEB_kr-Av5J_SwE_f77N6j-Xv4r-QCJ_oMDIQsd5vkG9AdCAAX9APsA1vz-ZJhSZVwD_ST-npf8AAL6Br9tdKw6Efv4A_j8DQby_gj0BgPz_QQD9w4eIvsE_I5-_sw0AJQDmt790fwB6P0Ac4X7-vIT_vMI8Az0E_Cz_v5RBIQhgmT8-Zf94gMI_f3--ASNRwEA_SMX2PH-D_YEAPr8lf4FBAUCBO4G_ff5GOoA8Rvo-x7mGeTHIU4C_i38ARYcFv4tJgz-BaXZAIj7IC7-Bfvo_AADUwMAAAIDAgABAAEAAgQAAAAAAQAABAAAAAAAAAAGAAAAAAAAAAAAAAAAAAACAAABAAECAAAAAQAAAAACAAAAAAAAAQAAAAIAAAAAAAIAAAABAAEBAAEAAAT_Af8BAP8BAAAA_wMAAAAAAAEAAAACAAAAAAAAAAIBAAABAAAAAAABAQAAAAAAAwD_AQAA_wEAAAAA_wH_AQAAAP8B_wH_AAH_AQABAAACAAAAAAABAAAAAAABAAAAAAABAAAAAAAAAAAAAAAAAQAAAQD_AQD_AQAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAABAAAAAAAAALIAAQAEAAAFAAIAAQMEBv8B_wEFAAAAAAAAAgAAAQIBAQIAAAMAAAIAAAAAAAEAAQEFAAAAAAAAAAAAAAAAAAIAAAAAAAAAAQAAAAACAAAAAAIAAAEAAQAAAgAAAAMAAAAAAAAAAAAAAAABAAACAAAAAQAAAAEAAQAAAAAAAAAAAQAAAAAAAQAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAEAAAAAAAAArwgAAAMCAAIAAQcAAAAGAAAB", 3, 1095, "UssAidVY_AP9lT-HfrsA5QT8Af6Z_J-9N1aMyAD9-AUD9fv9A_pLTf48ggX9A_75lX_-Bff9BQDIAeQEA_kAA_f9AgD8-KOG_mGIBvIEAPcC-AH-CP1_SBEPGv7wAfYE9PkN-vr8_Qr4pPYL-_AEC_QNCe_-_R7fB9g5RP3-DygpDJpbTv6K2opWH7EBACT7cFQlAPy6kP7HX_4B7GOS_i7WzQX4AvQJAvEB-wRC_f6KjQH8_LzTfsv-WKXyB_kGZQA6VQJwAgAAAQEAAAACAAMAAQACAAAAAAAAAgEAAgEEAAAAAAACAAAAAAEAAAACAAAAAAACAQAAAAAAAAEAAgMAAAAAAAAAAAADAAEAAAEAAQAAAAAAAAAAAAABAAAAAAEAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQABAAAAAAAAsgEGAAECAivXAwAAAwAAAQUAAAAFAAIBAAADAQUAAgQEAAAAAAAAAgAAAAEAAAACAAAAAQEBAQACAwAAAAADAAECAA", 3, 196, "UgX3-QL9CQPyAaz79_MHDOsR6gz3C_3xCQf-9ATUDSEAEhUb_v4MCyH-_QBj-YAev78AJEsB-wLCtwnvYn7-syzx49X0_v0VSACcAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAAAAAAAAALcABQEJAQAFBQAAAAICAAMCAAADAgEDBAIAAAADAA", 3, 776, "nSD-BKj8AHtg_AN_HXh2gwkD_vv7AaH7CPsC_voAB_X9Bpt9J44DAAADAAACAQAAAAADAAEBAAAAAAAC_wEAAAAAAAD_AAEAAQA", 3, 45, "1FmJXwD9AkfDgy0AXy8BiqP9Av1GAFYPAAYAAAAFAgAFAAIDAAACAAAAAwA", 3, 1124, 2, 816, "fP6DmAAL_v7K_gEBAdUo7AgF_p0BAv4C_o9TEz0wAv7-pEcIzHXzHLAD_f7qE_79A57-4hOZw_yRctP-AV79DB-BJwBXlEm4AQC88AEwvhYIJFvZ_QDn_sXqDyFT4_U9vfUOoksAOdnKTug3FeuWVFJZEfAIC_b2DvP0EfAIC_b2DvP3EfAIC_b2DvP0_hwAAf59UwWTZZ1vdYZoOcWTCO8fgV8BlBJgeHMHmnLgLkeVX7lYkMClnaMaUs00JciyUV6XyRUWPSWbP78Gk2XdXYN4k13W0jtRnEXY62e117xIs0OkY-YQTL3mEjz--sNxm0kYBXuUBQEK9n5TDC5fqt9wDt9NjxoVeKE8JAtPLJ0sTLjxXHtqj3UwwRH6nEYQ_Z_oeeD0uXRfIXii9MTKBuxJ0gDFUK7N0qzOOAQKAvitHOZCJAOD_7Ta0ZZMUG6bX1dSTDObZbErAxHs-O8w6DEUAZ7HNZnWjgkUWYxOrqVB524iW0CQeOkX_uN9kG-ClX49GQifAaH_lXYB7v10A7wgCvYJVMgctm6pImde0OxBDvsSwiuiZk22fvtn974DQyTn_ydazX2GHJXr-OUu8Uxyw3kKDCXZzhqW_Gu1SWyoSsrU4RyPI2HpZbeCa1bNkI3ObYdFpwowwMogEnLKTKUR8-Gv9Vjiw9CK5e0hdXRjTaly9ED9zrpFMl20zSCTp2MFm7uxTe_YBy0AXBUcJDAkrkYA_ioTrotrW-oE1mqGj9IQGNecK5fqbCB2AaRbQdzxMoC8FUnPlfX_Hy2_h4fwJ_FZnRIDzSHTcA6o9Pv2IvGbUB5taV3DxgdTwDDrY3FWuGq8zl0FDp4vzzzO9FA8vsO_HTsntHauckwUMCKkZ5IUc446yPZyYRc1yXZhOMFstNesfypkdcFe5Yw3IL9LSba2k_nA6t07O8jHwwOV6tMc9cg71SnQYefx7DE2nO32mQZt4rYC-22yFzOqVKtLB1enWKX3MfHskYwA0vUO5C-SV3uLvrGErKxdTUu1zgnOUnSbCPrtfJaI6RE4LevESpl0RLzvIXEpVnyTT4l_M_4xzkvuQyu0AOexOWEInoiZLGhTC-7hGge1mVW9Fps3cA8k4LpWPtSD55iMZHSQEefgLAuGbazfWhFBxp5o9gjLUtVsCIltklOtuUWtTnkbBVfuUMisT0f9pyPJNUW5j6rFH4dNLNA01RbAJxhS1IAQM74NH98j-zJJgkG6_qwUj7HgyUpRuOwXmlMX8SXvC8pjsPOOfEC-BProFaBeZJvun3AF-Qb47xeEbTIo2UoIAAgk48vhuSazGULBIy2zFOkS7XBqJAj31CrPl6eF1FAz0vsx4BwTrygRESFIlwH99vfIL0SnACbQPsjBdKEjBaDamPYf05p_BpFioWrR_qGMZJo6xKj7He1O0xIHgROE7WKyAk6UnJFCssNDfDpV0P45ww7yJugsthyfQlcpfUGF2jREdWwEi4tI2Mf8HAbkLoFOv3rOQBVNKST9HwbhnJpeCGG2SLOSAxEUjkPC8Ui2KMnUAQcZbqTLN_NfArIB_QXcezIUOjHbv7fkFwvRiCaK9lx8q66ry93ILCrF0ml5AX3VAEXA2gJsgDHJgR2dqMaJAAACAAMAAAYAAAAAAwEBAwAAAgAAAAAAAAABAAAAAAC4GQwMBQEDAwAAAAYCAAAAAgAAAQDRAAwKAgAAAwECAAkBAAABAAEAAAEDAAHDCQcUCAYAAAYAAQPUFAUJCALYJAIC0gAuAQAA2Rr20Agc3ssAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANrZBbVGBfsHpr0x3uWiBfsFtkUFpVYEnO_7dgX7BfsG-gf5B3CJBHSIBfsG-gb6BvoFc4gHgHkH-QePagR0AeMdR59NVAX7BHWHB3KHB_kE_Ab6BfsF-wb6BX4sUQX7BHUATLQAAOsVhwZzAAL-MuZvB4DzAAAAAAAAACoJzTRSB3SFBncZagf5BfsHdACFB41sB4kL7d76oAaT0w8AhQZ1AIUF-waZ3IUGdQAAIGUHYDTgABniCfznngd0hQf5BXaFBHgc5REH54QH-QV4_wDzkQf5Bl-bBfsF-wZ39wgg4QABggT8BGmTBIpyBHoQcgaIAPAAIt5BvAT_AIIHV6IGeYEFjwTn36IEe4EEfIAE_Ad5gAd5AN0jAIAGegP8gQX7BrWiJA_OOGoGfPuDBqfUfwX7BPwF-wd6fwf5B_kFkGsE_AZ7fwZ8ANyiBX3dIxrmfgf5BWCbBVqhBoD0CQr2fQZiCJAGfQZ3BvoF-wV-APIPfAd9F-l8BPwHfewUAAABewX7Bn8AAHsGfgEltqAF-wT8BaW2AyMM9AB6BPwEd_sQ9YUHfwB6BIIA2iYKLMt5BfsEXg6QB4B5BPwHgHkEgzhBBoE0RQaB_uCbBvoH-QT8BrNHBvoGggZyBF0E-SGBB5rFIgAAeAX7BfsGltwKByPddwT8BoPwhwaD-n0H-QSFdwf5BYTYnwX7BIQBBP51BYV2B4N2BoV1BV0q_3UH-QeFC2kGukAE_AeFADCmKtYrCmkG-gaHAABzBIlzBW4a25gEiQD6eQSKcgX7BYlyBfsFiXIGiHIFiQByBvoG-gX7BfsHmGEEvc5xB_kGXS5vB4gAAHEF-wSL3SQGJNZwB_kFi3AEjQFuBov_cAWMANT9ngZdLAJvBmQnANKdB6TNGW8G-gWNbgeL0SwDbgVfL20FgwsAbQePagb6B_kFWh2EB4xtBo0BbAT8BPwHjRbqbAVnlAX7BfsF-wX7BFoGnAW-PQX7BKPpcAX7BfsFkAABAWkF-wT8BqdTB3IbAhZUB49qBpZkB5r17H4Ek8g4aQaQagT8BGlO3ADOMmkFYDJpBZJpBPwF-wT8B_kH-QV0hwX7BfsF-wWTAAAAAAAAANH8NABnBpMA6RcA63wHkiJFBpNnBPwG-gaTZweRAiLe5zveIUUGlABmBYsKAMyaBIwHAwEAZQT8BGyQBJcAAABlBPwGlQFkBfsG-gaI0KIF-wX7BZYB9W8GlmQFYTZkBJhkBpb_AQ_xwz0f1wrVjwb6BfsG-gd8fQT8BJhkBZj_AWMG-gZ9fQa14gAAAGMHYJkFmP8BAAEAAAAAAGIHlwu2oQX7BZkAAABiB6VUBPwF-waZAADtdAaZYQaZYQX7BfsGmQFgB_kGihAAAB7jXwWbAf9gBrH5UAf5BPwGmxDgEF8EnV8HmgD1agVhO18FnA"] }; }); var H1 = RA((p3, x1) => { x1.exports = () => u1(); }); var _3 = {}; OA(_3, { TextDecoder: () => q }); var { Buffer: rA } = globalThis, sA = rA && !rA.TYPED_ARRAY_SUPPORT, Y = sA ? rA : null, y = !!globalThis.HermesInternal, cA = !!globalThis.Deno, J = new Uint8Array(Uint16Array.of(258).buffer)[0] === 2, eA = A => A && (sA || `${A}`.includes("[native code]")); !sA && eA(() => { }) && (eA = () => !1); var F = eA(globalThis.TextEncoder) ? new TextEncoder : null, P = eA(globalThis.TextDecoder) ? new TextDecoder("utf-8", { ignoreBOM: !0 }) : null, N = (() => { if (P)
                try {
                    return new TextDecoder("latin1", { ignoreBOM: !0 });
                }
                catch { } return null; })(); function c2(A, B, e, Q) { let t = "", f = B; for (let n = e - 3; f < n; f += 4) {
                let E = A[f], _ = A[f + 1], w = A[f + 2], g = A[f + 3];
                t += Q[E], t += Q[_], t += Q[w], t += Q[g];
            } for (; f < e;)
                t += Q[A[f++]]; return t; } function i2(A, B, e, Q) { let t = "", f = B; for (let n = e - 15; f < n; f += 16) {
                let E = A[f], _ = A[f + 1], w = A[f + 2], g = A[f + 3], o = A[f + 4], s = A[f + 5], i = A[f + 6], c = A[f + 7], C = A[f + 8], r = A[f + 9], D = A[f + 10], I = A[f + 11], l = A[f + 12], j = A[f + 13], AA = A[f + 14], nA = A[f + 15];
                t += `${Q[E]}${Q[_]}${Q[w]}${Q[g]}${Q[o]}${Q[s]}${Q[i]}${Q[c]}${Q[C]}${Q[r]}${Q[D]}${Q[I]}${Q[l]}${Q[j]}${Q[AA]}${Q[nA]}`;
            } for (; f < e;)
                t += Q[A[f++]]; return t; } var XA = y ? i2 : c2; function zA(A, B, e, Q) { if (e - B > 3e4) {
                let t = [];
                for (let n = B; n < e;) {
                    let E = n + 500, _ = E > e ? e : E;
                    t.push(XA(A, n, _, Q)), n = _;
                }
                let f = t.join("");
                return t.length = 0, f;
            } return XA(A, B, e, Q); } function C2(A, B) { let e = A.length; if (e > 64) {
                let Q = A.charCodeAt.bind(A);
                for (let t = 0; t < e; t++)
                    B[t] = Q(t);
            }
            else
                for (let Q = 0; Q < e; Q++)
                    B[Q] = A.charCodeAt(Q); return B; } function D2(A, B) { let e = A.length; for (let Q = 0; Q < e; Q++)
                B[Q] = A.charCodeAt(Q); return B; } var iA = y ? C2 : D2; var CA = globalThis.Buffer; function a(A) { if (!(A && A instanceof Uint8Array))
                throw new TypeError("Expected an Uint8Array"); } var R = "Input is not a string"; function K(A, B) { switch (B) {
                case "uint8":
                    if (A.constructor !== Uint8Array)
                        throw new Error("Unexpected");
                    return A;
                case "arraybuffer":
                    if (A.byteLength !== A.buffer.byteLength)
                        throw new Error("Unexpected");
                    return A.buffer;
                case "buffer": return A.length <= 64 ? CA.from(A) : CA.from(A.buffer, A.byteOffset, A.byteLength);
            } throw new TypeError("Unexpected format"); } function mA(A, B) { switch (B) {
                case "uint8": return A.length <= 64 || A.byteOffset !== 0 || A.byteLength !== A.buffer.byteLength ? new Uint8Array(A) : new Uint8Array(A.buffer, A.byteOffset, A.byteLength);
                case "arraybuffer": return A.buffer.byteLength === A.byteLength ? A.buffer : A.buffer.slice(A.byteOffset, A.byteOffset + A.byteLength);
                case "buffer":
                    if (A.constructor !== CA)
                        throw new Error("Unexpected");
                    return A;
            } throw new TypeError("Unexpected format"); } var NA = globalThis.atob, KA = Uint8Array.prototype.toBase64, JA = 8192, I2 = KA && NA; function X(A) { let B = 0, e = A.length; if (e > 64) {
                let Q = (4 - (A.byteOffset & 3)) % 4;
                for (; B < Q; B++)
                    if (A[B] >= 128)
                        return B;
                let t = (A.byteLength - Q) / 4 | 0, f = new Uint32Array(A.buffer, A.byteOffset + Q, t), n = 0;
                for (let E = t - 3; !(n >= E); B += 16, n += 4) {
                    let _ = f[n], w = f[n + 1], g = f[n + 2], o = f[n + 3];
                    if (_ & 2155905152 || w & 2155905152 || g & 2155905152 || o & 2155905152)
                        break;
                }
                for (; n < t && !(f[n] & 2155905152); B += 4, n++)
                    ;
            } for (; B < e; B++)
                if (A[B] >= 128)
                    return B; return e; } function H(A, B = 0, e = A.length) { B |= 0, e |= 0; let Q = e - B; if (Q === 0)
                return ""; if (I2 && Q >= 256 && Q < 1e8 && A.toBase64 === KA && A.BYTES_PER_ELEMENT === 1) {
                let f = B === 0 && e === A.length ? A : A.subarray(B, e);
                return NA(f.toBase64());
            } if (Q > JA) {
                let f = "";
                for (let n = B; n < e;) {
                    let E = Math.min(e, n + JA);
                    f += String.fromCharCode.apply(String, A.subarray(n, E)), n = E;
                }
                return f;
            } let t = B === 0 && e === A.length ? A : A.subarray(B, e); return String.fromCharCode.apply(String, t); } var G = Y && J && !cA ? (A, B = A.length) => B > 32 ? Y.from(A.buffer, A.byteOffset, B * 2).ucs2Slice() : H(A, 0, B) : (A, B = A.length) => H(A, 0, B), z = Y ? A => A.byteLength >= 768 && !cA ? Y.from(A.buffer, A.byteOffset, A.byteLength).latin1Slice(0, A.byteLength) : P.decode(A) : N ? A => N.decode(A) : A => H(A instanceof Uint8Array ? A : new Uint8Array(A.buffer, A.byteOffset, A.byteLength)); var VA = A => iA(A, new Uint8Array(A.length)), P2 = y && F?.encodeInto, WA = P2 ? (A, B) => { let e = new Uint8Array(A.length + 4), Q = F.encodeInto(A, e); if (Q.read !== A.length || Q.written !== A.length)
                throw new SyntaxError(B); return e.subarray(0, A.length); } : Y ? (A, B) => { let e = Y.from(A, "utf8"); if (e.length !== A.length)
                throw new SyntaxError(B); return new Uint8Array(e.buffer, e.byteOffset, e.byteLength); } : (A, B) => { let e = F.encode(A); if (e.length !== A.length)
                throw new SyntaxError(B); return e; }; function ZA(A) { if (Object.keys(A).length > 0)
                throw new TypeError("Unexpected extra options"); } var I3 = Object.getPrototypeOf(Uint8Array); var lA = {}; OA(lA, { E_CHAR: () => m, E_LAST: () => DA, E_LENGTH: () => Q1, E_PADDING: () => e1, fromBase64: () => PA, toBase64: () => IA }); var qA = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"], $A = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"], A1 = {}, B1 = {}, m = "Invalid character in base64 input", e1 = "Invalid base64 padding", Q1 = "Invalid base64 length", DA = "Invalid last chunk"; function IA(A, B, e) { let Q = A.length / 3 | 0, t = Q * 3, f = "", n = 0, E = B ? $A : qA, _ = B ? B1 : A1; if (!_.pairs)
                if (_.pairs = [], P) {
                    _.codepairs = new Uint16Array(64 * 64);
                    let c = _.codepairs, C = new Uint8Array(c.buffer, c.byteOffset, c.byteLength);
                    for (let r = 0; r < 64; r++) {
                        let D = E[r].charCodeAt(0);
                        for (let I = 0; I < 64; I++)
                            C[r << 7 | I << 1] = C[I << 7 | (r << 1) + 1] = D;
                    }
                }
                else {
                    let c = _.pairs;
                    for (let C = 0; C < 64; C++)
                        for (let r = 0; r < 64; r++)
                            c.push(`${E[C]}${E[r]}`);
                } let { pairs: w, codepairs: g } = _; if (P) {
                let c = new Uint16Array(Q * 2), C = 0;
                for (let r = A.length - 11; n < r; n += 12, C += 8) {
                    let D = A[n], I = A[n + 1], l = A[n + 2], j = A[n + 3], AA = A[n + 4], nA = A[n + 5], Q2 = A[n + 6], pA = A[n + 7], t2 = A[n + 8], f2 = A[n + 9], LA = A[n + 10], E2 = A[n + 11];
                    c[C] = g[D << 4 | I >> 4], c[C + 1] = g[(I & 15) << 8 | l], c[C + 2] = g[j << 4 | AA >> 4], c[C + 3] = g[(AA & 15) << 8 | nA], c[C + 4] = g[Q2 << 4 | pA >> 4], c[C + 5] = g[(pA & 15) << 8 | t2], c[C + 6] = g[f2 << 4 | LA >> 4], c[C + 7] = g[(LA & 15) << 8 | E2];
                }
                for (let r = A.length - 2; n < r; n += 3, C += 2) {
                    let D = A[n], I = A[n + 1], l = A[n + 2];
                    c[C] = g[D << 4 | I >> 4], c[C + 1] = g[(I & 15) << 8 | l];
                }
                f = z(c);
            }
            else
                for (; n < t; n += 3) {
                    let c = A[n], C = A[n + 1], r = A[n + 2];
                    f += w[c << 4 | C >> 4], f += w[(C & 15) << 8 | r];
                } let o = 0, s = 2, i = A.length; for (; n < i; n++) {
                let c = A[n];
                f += E[o | c >> s], s === 6 && (s = 0, f += E[c & 63]), o = c << 6 - s & 63, s += 2;
            } return s !== 2 && (f += E[o]), e && (f += ["", "==", "="][i - t]), f; } var l2 = F ? 128 : 65536; function PA(A, B) { let e = A.length; for (; A[e - 1] === "=";)
                e--; let Q = A.length - e, t = e % 4, f = e - t; if (t === 1)
                throw new SyntaxError(Q1); if (Q > 3 || Q !== 0 && A.length % 4 !== 0)
                throw new SyntaxError(e1); let n = B ? $A : qA, E = B ? B1 : A1; E.fromMap || (E.fromMap = new Int8Array(l2).fill(-1), n.forEach((c, C) => E.fromMap[c.charCodeAt(0)] = C)); let _ = E.fromMap, w = new Uint8Array(Math.floor(e * 3 / 4)), g = 0, o = 0; if (F) {
                let c = WA(A, m);
                for (; o < f; o += 4) {
                    let C = c[o], r = c[o + 1], D = c[o + 2], I = c[o + 3], l = _[C] << 18 | _[r] << 12 | _[D] << 6 | _[I];
                    if (l < 0)
                        throw new SyntaxError(m);
                    w[g] = l >> 16, w[g + 1] = l >> 8 & 255, w[g + 2] = l & 255, g += 3;
                }
            }
            else
                for (; o < f; o += 4) {
                    let c = A.charCodeAt(o), C = A.charCodeAt(o + 1), r = A.charCodeAt(o + 2), D = A.charCodeAt(o + 3), I = _[c] << 18 | _[C] << 12 | _[r] << 6 | _[D];
                    if (I < 0)
                        throw new SyntaxError(m);
                    w[g] = I >> 16, w[g + 1] = I >> 8 & 255, w[g + 2] = I & 255, g += 3;
                } if (t < 2)
                return w; let s = _[A.charCodeAt(o++)] << 6 | _[A.charCodeAt(o++)]; if (s < 0)
                throw new SyntaxError(m); if (w[g++] = s >> 4, t < 3) {
                if (s & 15)
                    throw new SyntaxError(DA);
                return w;
            } let i = _[A.charCodeAt(o++)]; if (i < 0)
                throw new SyntaxError(m); if (w[g++] = s << 4 & 255 | i >> 2, i & 3)
                throw new SyntaxError(DA); return w; } var { Buffer: O, atob: g1, btoa: n1 } = globalThis, _1 = O && !O.TYPED_ARRAY_SUPPORT, { toBase64: t1 } = Uint8Array.prototype, { E_CHAR: V, E_PADDING: Z, E_LENGTH: u2, E_LAST: x2 } = lA, H2 = n1 && y, h2 = g1 && y, v2 = A => A.constructor === O && O.isBuffer(A), a2 = A => v2(A) ? A : O.from(A.buffer, A.byteOffset, A.byteLength); function f1(A, B) { if (B)
                return A; let e = A.indexOf("=", A.length - 3); return e === -1 ? A : A.slice(0, e); } function E1(A, B) { return B && A.length % 4 !== 0 ? A + "=".repeat(4 - A.length % 4) : A; } var M2 = A => t1 && A.toBase64 === t1; function F2(A, { padding: B = !0 } = {}) { return a(A), M2(A) ? B ? A.toBase64() : A.toBase64({ omitPadding: !B }) : _1 ? f1(a2(A).base64Slice(0, A.byteLength), B) : H2 ? f1(n1(H(A)), B) : IA(A, !1, B); } function r1(A, B) { if (!B)
                return o1(A, !0, !1, "uint8", null); let { format: e = "uint8", padding: Q = !1, ...t } = B; return o1(A, !0, Q, e, t); } function o1(A, B, e, Q, t) { if (typeof A != "string")
                throw new TypeError(R); t !== null && ZA(t); let f = e === "both" ? A.endsWith("=") : void 0; if (e === !0 || f === !0) {
                if (A.length % 4 !== 0)
                    throw new SyntaxError(Z);
                if (A[A.length - 3] === "=")
                    throw new SyntaxError(Z);
            }
            else if (e === !1 || f === !1) {
                if (A.length % 4 === 1)
                    throw new SyntaxError(u2);
                if (e === !1 && A.endsWith("="))
                    throw new SyntaxError("Did not expect padding in base64 input");
            }
            else
                throw new TypeError("Invalid padding option"); return W(A, B, e, Q); } var b2 = /[\t\n\f\r ]/; function w1(A, B) { let e = A.indexOf("=", A.length - 3), Q = e >= 0 ? A.length - e : 0, t = A.length - Q, f = t % 4, n = B.length - (t - f) / 4 * 3; return f === 0 && n === 0 || f === 2 && n === 1 || f === 3 && n === 2; } var W; Uint8Array.fromBase64 ? W = (A, B, e, Q) => { let t = B ? "base64url" : "base64", f; if (e === !0)
                f = Uint8Array.fromBase64(A, { alphabet: t, lastChunkHandling: "strict" });
            else
                try {
                    let n = A.length % 4 > 0 ? `${A}${"=".repeat(4 - A.length % 4)}` : A;
                    f = Uint8Array.fromBase64(n, { alphabet: t, lastChunkHandling: "strict" });
                }
                catch (n) {
                    throw b2.test(A) ? new SyntaxError(V) : n;
                } if (!w1(A, f))
                throw new SyntaxError(V); return K(f, Q); } : _1 ? W = (A, B, e, Q) => { let t = O.byteLength(A, "base64"), f = O.allocUnsafeSlow(t); if (f.base64Write(A) !== t)
                throw new SyntaxError(Z); let n = B ? f.base64urlSlice(0, f.length) : f.base64Slice(0, f.length); if (A !== n) {
                if (e === !B)
                    throw new SyntaxError(Z);
                if (E1(A, !0) !== E1(n, B))
                    throw new SyntaxError(Z);
            } return mA(f, Q); } : h2 ? W = (A, B, e, Q) => { let t; if (B) {
                if (/[\t\n\f\r +/]/.test(A))
                    throw new SyntaxError(V);
                A = A.replaceAll("-", "+").replaceAll("_", "/");
            } try {
                t = VA(g1(A));
            }
            catch {
                throw new SyntaxError(V);
            } if (!B && !w1(A, t))
                throw new SyntaxError(V); if (t.length % 3 !== 0) {
                let f = F2(t.subarray(-(t.length % 3))), n = A.length % 4 === 0 ? A.slice(-4) : A.slice(-(A.length % 4)).padEnd(4, "=");
                if (f !== n)
                    throw new SyntaxError(x2);
            } return K(t, Q); } : W = (A, B, e, Q) => K(PA(A, B), Q); var C1 = "Input is not well-formed utf16", uA = String.prototype.isWellFormed, xA = String.prototype.toWellFormed, s1 = 65533; var c1 = A => new Uint16Array(A.buffer, A.byteOffset, A.byteLength / 2); var U2 = P ? new TextDecoder("utf-16le", { ignoreBOM: !0, fatal: !0 }) : null, G2 = P ? new TextDecoder("utf-16le", { ignoreBOM: !0 }) : null, k2 = P ? new TextDecoder("utf-16be", { ignoreBOM: !0, fatal: !0 }) : null, y2 = P ? new TextDecoder("utf-16be", { ignoreBOM: !0 }) : null; function D1(A, B, e) { if (e === "uint16") {
                if (!(A instanceof Uint16Array))
                    throw new TypeError("Expected an Uint16Array");
            }
            else if (e === "uint8-le" || e === "uint8-be") {
                if (a(A), A.byteLength % 2 !== 0)
                    throw new TypeError("Expected even number of bytes");
            }
            else
                throw new TypeError("Unknown format"); return (e === "uint8-le" || e === "uint16" && J ? B ? G2 : U2 : B ? y2 : k2).decode(A); } function I1(A, B, e) { let Q; switch (e) {
                case "uint16":
                    if (!(A instanceof Uint16Array))
                        throw new TypeError("Expected an Uint16Array");
                    Q = A;
                    break;
                case "uint8-le":
                    if (a(A), A.byteLength % 2 !== 0)
                        throw new TypeError("Expected even number of bytes");
                    Q = i1(A, !0);
                    break;
                case "uint8-be":
                    if (a(A), A.byteLength % 2 !== 0)
                        throw new TypeError("Expected even number of bytes");
                    Q = i1(A, !1);
                    break;
                default: throw new TypeError("Unknown format");
            } let t = T2(Q, B, !B && uA || B && xA); if (!B && uA && !uA.call(t))
                throw new TypeError(C1); return B && xA ? xA.call(t) : t; } function i1(A, B) { return c1(B === J ? A.byteOffset % 2 === 0 ? A : Uint8Array.from(A) : p2(Uint8Array.from(A))); } var T2 = (A, B = !1, e = !1) => { if (e || Y2(A))
                return G(A); if (!B)
                throw new TypeError(C1); return G(L2(Uint16Array.from(A))); }; function p2(A) { let B = 0; for (let e = A.length - 3; B < e; B += 4) {
                let Q = A[B], t = A[B + 1], f = A[B + 2], n = A[B + 3];
                A[B] = t, A[B + 1] = Q, A[B + 2] = n, A[B + 3] = f;
            } for (let e = A.length - 1; B < e; B += 2) {
                let Q = A[B], t = A[B + 1];
                A[B] = t, A[B + 1] = Q;
            } return A; } function L2(A) { let B = A.length; for (let e = 0; e < B; e++) {
                let Q = A[e];
                if (Q >= 55296 && Q < 57344)
                    if (Q > 56319 || e + 1 >= B)
                        A[e] = s1;
                    else {
                        let t = A[e + 1];
                        t < 56320 || t >= 57344 ? A[e] = s1 : e++;
                    }
            } return A; } function Y2(A) { let B = A.length, e = 0, Q = 2147516416, t = 55296, f = 57344; if (B > 32 && A.byteOffset % 4 === 0) {
                let n = A.byteLength / 4 | 0, E = new Uint32Array(A.buffer, A.byteOffset, n);
                for (let _ = n - 3; !(e >= _); e += 4) {
                    let w = E[e], g = E[e + 1], o = E[e + 2], s = E[e + 3];
                    if (w & Q || g & Q || o & Q || s & Q)
                        break;
                }
                for (; e < n && !(E[e] & Q); e++)
                    ;
                e *= 2;
            } for (let n = B - 3; !(e >= n); e += 4) {
                let E = A[e], _ = A[e + 1], w = A[e + 2], g = A[e + 3];
                if (E >= t && E < f || _ >= t && _ < f || w >= t && w < f || g >= t && g < f)
                    break;
            } for (; e < B; e++) {
                let n = A[e];
                if (n >= t && n < f) {
                    if (n >= 56320 || e + 1 >= B)
                        return !1;
                    e++;
                    let E = A[e];
                    if (E < 56320 || E >= f)
                        return !1;
                }
            } return !0; } function R2() { if (!P)
                return !1; try {
                let A = new TextDecoder("utf-16le").decode(Uint8Array.of(1, 2, 3, 216)), B = new TextDecoder("utf-16be").decode(Uint8Array.of(2, 1, 216, 3));
                return A === B && A === "\u0201\uFFFD";
            }
            catch { } return !1; } var P1 = R2() ? D1 : I1; var QA = (A, B = "uint16") => P1(A, !1, B), l1 = (A, B = "uint16") => P1(A, !0, B); var v1 = r2(H1(), 1), HA = { jis0208: 11104, jis0212: 7211, "euc-kr": 23750, gb18030: 23940, big5: 19782 }, d, h1 = new Map; function S2(A) { let B = r1(A), e = B.length, Q = e >> 1, t = new Uint8Array(e), f = -1, n = 0; for (let E = 0, _ = 0; E < e; E += 2, _++)
                f = f + B[_] + 1 & 255, n = n + B[Q + _] & 255, t[E] = f, t[E + 1] = n; return t; } function hA(A, B, e) { let Q = 0; for (let t = 0; t < B.length; t++) {
                let f = B[t];
                if (typeof f == "number")
                    if (f === 0)
                        e += B[++t];
                    else {
                        f < 0 ? (Q -= f, f = 1) : Q += B[++t];
                        for (let n = 0; n < f; n++, e++, Q++)
                            if (Q <= 65535)
                                A[e] = Q;
                            else {
                                let E = String.fromCodePoint(Q);
                                A[e] = E.charCodeAt(0) << 16 | E.charCodeAt(1);
                            }
                    }
                else if (f[0] === "$" && Object.hasOwn(d, f))
                    e = hA(A, d[f], e);
                else {
                    let n;
                    for (let E of QA(S2(f), "uint8-le"))
                        n = E, A[e++] = E.length === 1 ? E.charCodeAt(0) : E.charCodeAt(0) << 16 | E.charCodeAt(1);
                    Q = n.codePointAt(0) + 1;
                }
            } return e; } function b(A) { let B = h1.get(A); if (B)
                return B; if (d || (d = (0, v1.default)()), !Object.hasOwn(d, A))
                throw new Error("Unknown encoding"); if (!d[A])
                throw new Error("Table already used (likely incorrect bundler dedupe)"); let e; if (A.endsWith("-ranges")) {
                e = [];
                let Q = 0, t = 0, f = d[A];
                for (; f.length > 0;)
                    e.push([Q += f.shift(), t += f.shift()]);
            }
            else if (A.endsWith("-katakana")) {
                let Q = -1;
                e = new Uint16Array(d[A].map(t => Q += t + 1));
            }
            else if (A === "big5")
                e = new Uint32Array(HA[A]), hA(e, d[A], 0), e[1133] = 13239044, e[1135] = 13239052, e[1164] = 15336196, e[1166] = 15336204;
            else {
                if (!Object.hasOwn(HA, A))
                    throw new Error("Unknown encoding");
                e = new Uint16Array(HA[A]), hA(e, d[A], 0);
            } return d[A] = null, h1.set(A, e), e; } var M1 = "Input is not well-formed for this encoding", tA = { "euc-kr": A => { let B = b("euc-kr"), e = 0, Q = 0, t, f = E => { if (E < 65 || E > 254)
                    e = 0, t[Q++] = A(), E < 128 && (t[Q++] = E);
                else {
                    let _ = B[(e - 129) * 190 + E - 65];
                    e = 0, _ ? t[Q++] = _ : (t[Q++] = A(), E < 128 && (t[Q++] = E));
                } }; return { decode: (E, _, w, g) => { let o = _; if (t = new Uint16Array(w - _ + (e ? 1 : 0)), Q = 0, !e)
                        for (let i = w - 1; o < i;) {
                            let c = E[o];
                            if (c < 128)
                                t[Q++] = c, o++;
                            else {
                                if (c === 128 || c === 255)
                                    break;
                                let C = E[o + 1];
                                if (C < 65 || C === 255)
                                    break;
                                let r = B[(c - 129) * 190 + C - 65];
                                if (!r)
                                    break;
                                t[Q++] = r, o += 2;
                            }
                        } for (e && o < w && f(E[o++]); o < w;) {
                        let i = E[o++];
                        i < 128 ? t[Q++] = i : i === 128 || i === 255 ? t[Q++] = A() : (e = i, o < w && f(E[o++]));
                    } e && !g && (e = 0, t[Q++] = A()); let s = G(t, Q); return t = null, s; }, isAscii: () => e === 0 }; }, "euc-jp": A => { let B = b("jis0208"), e = b("jis0212"), Q = !1, t = 0, f = 0, n, E = w => { if (t === 142 && w >= 161 && w <= 223)
                    t = 0, n[f++] = 65216 + w;
                else if (t === 143 && w >= 161 && w <= 254)
                    Q = !0, t = w;
                else {
                    let g;
                    t >= 161 && t <= 254 && w >= 161 && w <= 254 && (g = (Q ? e : B)[(t - 161) * 94 + w - 161]), t = 0, Q = !1, g ? n[f++] = g : (n[f++] = A(), w < 128 && (n[f++] = w));
                } }; return { decode: (w, g, o, s) => { let i = g; if (n = new Uint16Array(o - g + (t ? 1 : 0)), f = 0, !t)
                        for (let C = o - 1; i < C;) {
                            let r = w[i];
                            if (r < 128)
                                n[f++] = r, i++;
                            else {
                                let D = w[i + 1];
                                if (r === 142 && D >= 161 && D <= 223)
                                    n[f++] = 65216 + D, i += 2;
                                else {
                                    if (r < 161 || r === 255 || D < 161 || D === 255)
                                        break;
                                    let I = B[(r - 161) * 94 + D - 161];
                                    if (!I)
                                        break;
                                    n[f++] = I, i += 2;
                                }
                            }
                        } for (t && i < o && E(w[i++]), t && i < o && E(w[i++]); i < o;) {
                        let C = w[i++];
                        C < 128 ? n[f++] = C : C < 161 && C !== 142 && C !== 143 || C === 255 ? n[f++] = A() : (t = C, i < o && E(w[i++]), t && i < o && E(w[i++]));
                    } t && !s && (t = 0, Q = !1, n[f++] = A()); let c = G(n, f); return n = null, c; }, isAscii: () => t === 0 }; }, "iso-2022-jp": A => { let B = b("jis0208"), e = 1, Q = 1, t = 0, f = !1, n = (w, g) => { if (e < 5 && g === 27) {
                    e = 6;
                    return;
                } switch (e) {
                    case 1:
                    case 2:
                        if (f = !1, e === 2) {
                            if (g === 92)
                                return 165;
                            if (g === 126)
                                return 8254;
                        }
                        return g <= 127 && g !== 14 && g !== 15 ? g : A();
                    case 3: return f = !1, g >= 33 && g <= 95 ? 65344 + g : A();
                    case 4:
                        if (f = !1, g < 33 || g > 126)
                            return A();
                        t = g, e = 5;
                        return;
                    case 5:
                        if (f = !1, g === 27)
                            return e = 6, A();
                        if (e = 4, g >= 33 && g <= 126) {
                            let o = B[(t - 33) * 94 + g - 33];
                            if (o)
                                return o;
                        }
                        return A();
                    case 6:
                        if (g === 36 || g === 40) {
                            t = g, e = 7;
                            return;
                        }
                        return f = !1, e = Q, w.push(g), A();
                    case 7: {
                        let o = t;
                        t = 0;
                        let s;
                        if (o === 40 ? g === 66 ? s = 1 : g === 74 ? s = 2 : g === 73 && (s = 3) : o === 36 && (g === 64 || g === 66) && (s = 4), s) {
                            e = Q = s;
                            let i = f;
                            return f = !0, i ? A() : void 0;
                        }
                        return f = !1, e = Q, w.push(g, o), A();
                    }
                } }, E = w => { if (e < 5)
                    return null; switch (f = !1, e) {
                    case 5: return e = 4, A();
                    case 6: return e = Q, A();
                    case 7: return e = Q, w.push(t), t = 0, A();
                } }; return { decode: (w, g, o, s) => { let i = new Uint16Array(o - g + 2), c = 0, C = g, r = []; for (; C < o || r.length > 0;) {
                        let D = n(r, r.length > 0 ? r.pop() : w[C++]);
                        D !== void 0 && (i[c++] = D);
                    } if (!s)
                        for (; C <= o || r.length > 0;)
                            if (C < o || r.length > 0) {
                                let D = n(r, r.length > 0 ? r.pop() : w[C++]);
                                D !== void 0 && (i[c++] = D);
                            }
                            else {
                                let D = E(r);
                                if (D === null)
                                    break;
                                i[c++] = D;
                            } return s || (e = Q = 1, t = 0, f = !1), G(i, c); }, isAscii: () => !1 }; }, shift_jis: A => { let B = b("jis0208"), e = 0, Q = 0, t, f = E => { let _ = e; if (e = 0, E >= 64 && E <= 252 && E !== 127) {
                    let w = (_ - (_ < 160 ? 129 : 193)) * 188 + E - (E < 127 ? 64 : 65);
                    if (w >= 8836 && w <= 10715) {
                        t[Q++] = 48508 + w;
                        return;
                    }
                    let g = B[w];
                    if (g) {
                        t[Q++] = g;
                        return;
                    }
                } t[Q++] = A(), E < 128 && (t[Q++] = E); }; return { decode: (E, _, w, g) => { t = new Uint16Array(w - _ + (e ? 1 : 0)), Q = 0; let o = _; if (!e)
                        for (let i = w - 1; o < i;) {
                            let c = E[o];
                            if (c <= 128)
                                t[Q++] = c, o++;
                            else if (c >= 161 && c <= 223)
                                t[Q++] = 65216 + c, o++;
                            else {
                                if (c === 160 || c > 252)
                                    break;
                                let C = E[o + 1];
                                if (C < 64 || C > 252 || C === 127)
                                    break;
                                let r = (c - (c < 160 ? 129 : 193)) * 188 + C - (C < 127 ? 64 : 65);
                                if (r >= 8836 && r <= 10715)
                                    t[Q++] = 48508 + r, o += 2;
                                else {
                                    let D = B[r];
                                    if (!D)
                                        break;
                                    t[Q++] = D, o += 2;
                                }
                            }
                        } for (e && o < w && f(E[o++]); o < w;) {
                        let i = E[o++];
                        i <= 128 ? t[Q++] = i : i >= 161 && i <= 223 ? t[Q++] = 65216 + i : i === 160 || i > 252 ? t[Q++] = A() : (e = i, o < w && f(E[o++]));
                    } e && !g && (e = 0, t[Q++] = A()); let s = G(t, Q); return t = null, s; }, isAscii: () => e === 0 }; }, gbk: A => tA.gb18030(A), gb18030: A => { let B = b("gb18030"), e = b("gb18030-ranges"), Q = 0, t = 0, f = 0, n = _ => { if (_ > 39419 && _ < 189e3 || _ > 1237575)
                    return; if (_ === 7457)
                    return 59335; let w = 0, g = 0; for (let [o, s] of e) {
                    if (o > _)
                        break;
                    w = o, g = s;
                } return g + _ - w; }; return { decode: (_, w, g, o) => { let s = new Uint16Array(g - w + (Q ? 3 : 0)), i = 0, c = w, C = []; if (Q === 0)
                        for (let r = g - 1; c < r;) {
                            let D = _[c];
                            if (D < 128)
                                s[i++] = D, c++;
                            else if (D === 128)
                                s[i++] = 8364, c++;
                            else {
                                if (D === 255)
                                    break;
                                let I = _[c + 1], l;
                                if (I < 127) {
                                    if (I < 64)
                                        break;
                                    l = B[(D - 129) * 190 + I - 64];
                                }
                                else {
                                    if (I === 255 || I === 127)
                                        break;
                                    l = B[(D - 129) * 190 + I - 65];
                                }
                                if (!l)
                                    break;
                                s[i++] = l, c += 2;
                            }
                        } for (; c < g || C.length > 0;) {
                        let r = C.length > 0 ? C.pop() : _[c++];
                        if (Q)
                            if (t)
                                if (f)
                                    if (r <= 57 && r >= 48) {
                                        let D = n((Q - 129) * 12600 + (t - 48) * 1260 + (f - 129) * 10 + r - 48);
                                        if (Q = t = f = 0, D === void 0)
                                            s[i++] = A();
                                        else if (D <= 65535)
                                            s[i++] = D;
                                        else {
                                            let I = D - 65536;
                                            s[i++] = 55296 | I >> 10, s[i++] = 56320 | I & 1023;
                                        }
                                    }
                                    else
                                        C.push(r, f, t), Q = t = f = 0, s[i++] = A();
                                else
                                    r >= 129 && r <= 254 ? f = r : (C.push(r, t), Q = t = 0, s[i++] = A());
                            else if (r <= 57 && r >= 48)
                                t = r;
                            else {
                                let D;
                                r >= 64 && r <= 254 && r !== 127 && (D = B[(Q - 129) * 190 + r - (r < 127 ? 64 : 65)]), Q = 0, D ? s[i++] = D : (s[i++] = A(), r < 128 && (s[i++] = r));
                            }
                        else
                            r < 128 ? s[i++] = r : r === 128 ? s[i++] = 8364 : r === 255 ? s[i++] = A() : Q = r;
                    } return Q && !o && (Q = t = f = 0, s[i++] = A()), G(s, i); }, isAscii: () => Q === 0 }; }, big5: A => { let B = b("big5"), e = 0, Q = 0, t, f = E => { if (E < 64 || E > 126 && E < 161 || E === 255)
                    e = 0, t[Q++] = A(), E < 128 && (t[Q++] = E);
                else {
                    let _ = B[(e - 129) * 157 + E - (E < 127 ? 64 : 98)];
                    e = 0, _ > 65536 ? (t[Q++] = _ >> 16, t[Q++] = _ & 65535) : _ ? t[Q++] = _ : (t[Q++] = A(), E < 128 && (t[Q++] = E));
                } }; return { decode: (E, _, w, g) => { let o = _; if (t = new Uint16Array(w - _ + (e ? 1 : 0)), Q = 0, !e)
                        for (let i = w - 1; o < i;) {
                            let c = E[o];
                            if (c < 128)
                                t[Q++] = c, o++;
                            else {
                                if (c === 128 || c === 255)
                                    break;
                                let C = E[o + 1];
                                if (C < 64 || C > 126 && C < 161 || C === 255)
                                    break;
                                let r = B[(c - 129) * 157 + C - (C < 127 ? 64 : 98)];
                                if (r > 65536)
                                    t[Q++] = r >> 16, t[Q++] = r & 65535;
                                else {
                                    if (!r)
                                        break;
                                    t[Q++] = r;
                                }
                                o += 2;
                            }
                        } for (e && o < w && f(E[o++]); o < w;) {
                        let i = E[o++];
                        i < 128 ? t[Q++] = i : i === 128 || i === 255 ? t[Q++] = A() : (e = i, o < w && f(E[o++]));
                    } e && !g && (e = 0, t[Q++] = A()); let s = G(t, Q); return t = null, s; }, isAscii: () => e === 0 }; } }, F1 = A => A !== "iso-2022-jp"; function b1(A, B = !1) { if (typeof B != "boolean")
                throw new TypeError("loose option should be boolean"); if (!Object.hasOwn(tA, A))
                throw new RangeError("Unsupported encoding"); let e, Q = F1(A), t, f = B ? () => 65533 : () => { throw t || (e = null), new TypeError(M1); }; return (n, E = !1) => { let _ = ""; if (Q && (!e || e.isAscii?.())) {
                let w = X(n);
                if (w === n.length)
                    return z(n);
                _ = H(n, 0, w);
            } return t = E, e || (e = tA[A](f)), _ + e.decode(n, _.length, n.length, E); }; } var a1 = new Map, j2 = [[148, 236], [149, 237], [150, 243]], X2 = [[30, 89], [38, 97], [43, 102], [44, 103], [50, 109], [67, 126], [84, 144], [100, 160]], MA = { __proto__: null, big5: A => (A / 157 | 0) + 129 << 8 | (A % 157 < 63 ? 64 : 98) + A % 157, shift_jis: A => { let B = A / 188 | 0, e = A % 188; return B + (B < 31 ? 129 : 193) << 8 | (e < 63 ? 64 : 65) + e; }, "iso-2022-jp": A => (A / 94 | 0) + 33 << 8 | A % 94 + 33, "euc-jp": A => (A / 94 | 0) + 161 << 8 | A % 94 + 161, "euc-kr": A => (A / 190 | 0) + 129 << 8 | A % 190 + 65, gb18030: A => (A / 190 | 0) + 129 << 8 | (A % 190 < 63 ? 64 : 65) + A % 190 }; MA.gbk = MA.gb18030; function z2(A, B, e) { let Q = a1.get(A); if (Q)
                return Q; let t = A, f = A === "shift_jis"; A === "iso-2022-jp" && (t = "jis0208"), A === "gbk" && (t = "gb18030"), (A === "euc-jp" || f) && (t = "jis0208"); let E = b(t), _ = new Uint16Array(B), w = MA[A] || (g => g + 1); for (let g = 0; g < E.length; g++) {
                let o = E[g];
                if (o) {
                    if (A === "big5") {
                        if (g < 5024 || _[o] && o !== 9552 && o !== 9566 && o !== 9569 && o !== 9578 && o !== 21313 && o !== 21317)
                            continue;
                    }
                    else if (f && g >= 8272 && g <= 8835 || _[o])
                        continue;
                    if (o > 65535) {
                        let s = String.fromCharCode(o >> 16, o & 65535);
                        _[s.codePointAt(0)] = w(g);
                    }
                    else
                        _[o] = w(g);
                }
            } if (e)
                for (let g = 0; g < 128; g++)
                    _[g] = g; if (f || A === "euc-jp") {
                f && (_[128] = 128);
                let g = f ? 65216 : 28864;
                for (let o = 65377; o <= 65439; o++)
                    _[o] = o - g;
                _[8722] = _[65293], _[165] = 92, _[8254] = 126;
            }
            else if (t === "gb18030") {
                A === "gbk" && (_[8364] = 128);
                for (let g = 59277; g <= 59283; g++)
                    _[g] = g - 16564;
                for (let [g, o] of j2)
                    _[59136 | g] = 42496 | o;
                for (let [g, o] of X2)
                    _[59392 | g] = 65024 | o;
            } return a1.set(A, _), _; } var m2 = /[^\x00-\xFF]/, vA, aA; function FA(A, B) { if (!Object.hasOwn(tA, A))
                throw new RangeError("Unsupported encoding"); let e = A === "big5" ? 194727 : 65536, Q = A === "iso-2022-jp", t = A === "gb18030", f = F1(A), n = Q ? 5 : t ? 4 : 2, E = Q ? 3 : 0, _ = z2(A, e, f); return t && !vA && (vA = b("gb18030-ranges")), Q && !aA && (aA = b("iso-2022-jp-katakana")), w => { if (typeof w != "string")
                throw new TypeError(R); if (f && F && !m2.test(w)) {
                let c = F.encode(w);
                if (c.length === w.length)
                    return c;
            } let g = w.length, o = new Uint8Array(g * n + E), s = 0; if (f)
                for (; s < g;) {
                    let c = w.charCodeAt(s);
                    if (c >= 128)
                        break;
                    o[s++] = c;
                } let i = c => { if (B)
                return B(c, o, s); throw new TypeError(M1); }; if (!_ || _.length < e)
                throw new Error("Unreachable"); if (Q) {
                let c = 0, C = () => { c = 0, o[s++] = 27, o[s++] = 40, o[s++] = 66; };
                for (let r = 0; r < g; r++) {
                    let D = w.charCodeAt(r);
                    if (D >= 55296 && D < 57344)
                        if (c === 2 && C(), D >= 56320 || r + 1 === g)
                            s += i(D);
                        else {
                            let I = w.charCodeAt(r + 1);
                            I < 56320 || I >= 57344 ? s += i(D) : (r++, s += i(65536 + (I & 1023 | (D & 1023) << 10)));
                        }
                    else if (D < 128)
                        (c === 2 || c === 1 && (D === 92 || D === 126)) && C(), D === 14 || D === 15 || D === 27 ? s += i(65533) : o[s++] = D;
                    else if (D === 165 || D === 8254)
                        c !== 1 && (c = 1, o[s++] = 27, o[s++] = 40, o[s++] = 74), o[s++] = D === 165 ? 92 : 126;
                    else {
                        D === 8722 && (D = 65293), D >= 65377 && D <= 65439 && (D = aA[D - 65377]);
                        let I = _[D];
                        I ? (c !== 2 && (c = 2, o[s++] = 27, o[s++] = 36, o[s++] = 66), o[s++] = I >> 8, o[s++] = I & 255) : (c === 2 && C(), s += i(D));
                    }
                }
                c && C();
            }
            else if (t) {
                let c = C => { let r = 0, D = 0; for (let [l, j] of vA) {
                    if (j > C)
                        break;
                    r = l, D = j;
                } let I = C === 59335 ? 7457 : r + C - D; o[s++] = 129 + (I / 12600 | 0), I %= 12600, o[s++] = 48 + (I / 1260 | 0), I %= 1260, o[s++] = 129 + (I / 10 | 0), o[s++] = 48 + I % 10; };
                for (let C = s; C < g; C++) {
                    let r = w.charCodeAt(C);
                    if (r >= 55296 && r < 57344)
                        if (r >= 56320 || C + 1 === g)
                            s += i(r);
                        else {
                            let D = w.charCodeAt(C + 1);
                            D < 56320 || D >= 57344 ? s += i(r) : (C++, c(65536 + (D & 1023 | (r & 1023) << 10)));
                        }
                    else {
                        let D = _[r];
                        D & 65280 ? (o[s++] = D >> 8, o[s++] = D & 255) : D || r === 0 ? o[s++] = D : r === 58853 ? s += i(r) : c(r);
                    }
                }
            }
            else {
                let c = A === "big5" ? C => { let r = _[C]; r & 65280 ? (o[s++] = r >> 8, o[s++] = r & 255) : r || C === 0 ? o[s++] = r : s += i(C); } : C => { s += i(C); };
                for (let C = s; C < g; C++) {
                    let r = w.charCodeAt(C);
                    if (r >= 55296 && r < 57344)
                        if (r >= 56320 || C + 1 === g)
                            s += i(r);
                        else {
                            let D = w.charCodeAt(C + 1);
                            D < 56320 || D >= 57344 ? s += i(r) : (C++, c(65536 + (D & 1023 | (r & 1023) << 10)));
                        }
                    else {
                        let D = _[r];
                        D & 65280 ? (o[s++] = D >> 8, o[s++] = D & 255) : D || r === 0 ? o[s++] = D : s += i(r);
                    }
                }
            } return s === o.length ? o : o.slice(0, s); }; } function d1(A, B = !1) { let e = b1(A, B), Q = !1; return (t, f = !1) => (a(t), !Q && t.byteLength === 0 ? "" : (Q = f, e(t, f))); } var x = "Input is not well-formed utf8", h = 65533, J2 = y, { decodeURIComponent: U1, escape: G1 } = globalThis; function fA(A, B) { let e = H(A, 0, X(A)); if (e.length === A.length)
                return e; if (J2 && G1 && U1) {
                let Q = G1(H(A, e.length, A.length));
                try {
                    return e + U1(Q);
                }
                catch {
                    if (!B)
                        throw new TypeError(x);
                }
            } return e + N2(A, B, e.length); } function N2(A, B, e = 0) { e |= 0; let Q = A.length, t = "", f = 512, n = Math.min(Q - e, f + 1), E = new Array(n).fill(0), _ = 0; for (let w = e; w < Q; w++) {
                _ >= f && (E.length = _, t += String.fromCharCode.apply(String, E), E.length <= f && E.push(0), _ = 0);
                let g = A[w];
                if (g < 128)
                    E[_++] = g;
                else if (g < 194) {
                    if (!B)
                        throw new TypeError(x);
                    E[_++] = h;
                }
                else if (g < 224) {
                    if (w + 1 >= Q) {
                        if (!B)
                            throw new TypeError(x);
                        E[_++] = h;
                        break;
                    }
                    let o = A[w + 1];
                    if (o < 128 || o > 191) {
                        if (!B)
                            throw new TypeError(x);
                        E[_++] = h;
                        continue;
                    }
                    w++, E[_++] = (g & 31) << 6 | o & 63;
                }
                else if (g < 240) {
                    if (w + 1 >= Q) {
                        if (!B)
                            throw new TypeError(x);
                        E[_++] = h;
                        break;
                    }
                    let o = g === 224 ? 160 : 128, s = g === 237 ? 159 : 191, i = A[w + 1];
                    if (i < o || i > s) {
                        if (!B)
                            throw new TypeError(x);
                        E[_++] = h;
                        continue;
                    }
                    if (w++, w + 1 >= Q) {
                        if (!B)
                            throw new TypeError(x);
                        E[_++] = h;
                        break;
                    }
                    let c = A[w + 1];
                    if (c < 128 || c > 191) {
                        if (!B)
                            throw new TypeError(x);
                        E[_++] = h;
                        continue;
                    }
                    w++, E[_++] = (g & 15) << 12 | (i & 63) << 6 | c & 63;
                }
                else if (g <= 244) {
                    if (w + 1 >= Q) {
                        if (!B)
                            throw new TypeError(x);
                        E[_++] = h;
                        break;
                    }
                    let o = g === 240 ? 144 : 128, s = g === 244 ? 143 : 191, i = A[w + 1];
                    if (i < o || i > s) {
                        if (!B)
                            throw new TypeError(x);
                        E[_++] = h;
                        continue;
                    }
                    if (w++, w + 1 >= Q) {
                        if (!B)
                            throw new TypeError(x);
                        E[_++] = h;
                        break;
                    }
                    let c = A[w + 1];
                    if (c < 128 || c > 191) {
                        if (!B)
                            throw new TypeError(x);
                        E[_++] = h;
                        continue;
                    }
                    if (w++, w + 1 >= Q) {
                        if (!B)
                            throw new TypeError(x);
                        E[_++] = h;
                        break;
                    }
                    let C = A[w + 1];
                    if (C < 128 || C > 191) {
                        if (!B)
                            throw new TypeError(x);
                        E[_++] = h;
                        continue;
                    }
                    w++;
                    let r = (g & 15) << 18 | (i & 63) << 12 | (c & 63) << 6 | C & 63;
                    if (r > 65535) {
                        let D = r - 65536;
                        E[_++] = 55296 + (D >> 10 & 1023), E[_++] = 56320 + (D & 1023);
                    }
                    else
                        E[_++] = r;
                }
                else {
                    if (!B)
                        throw new TypeError(x);
                    E[_++] = h;
                }
            } return _ === 0 ? t : (E.length = _, t + String.fromCharCode.apply(String, E)); } var W2 = P, Z2 = P ? new TextDecoder("utf-8", { ignoreBOM: !0, fatal: !0 }) : null, { isWellFormed: BB } = String.prototype; function k1(A, B = !1) { return a(A), A.byteLength === 0 ? "" : P || !fA ? B ? W2.decode(A) : Z2.decode(A) : fA(A, B); } var y1 = A => k1(A, !1), T1 = A => k1(A, !0); var R1 = [189, 148, 0, 0, 63, 0, 116, 64, 0, 68, 0, 78, 0, 78, 0, 0, 63, 64, 114, 117, 0, 0, 123, 0, 0, 128, 149, 0, 149, 0, 0, 132, 0, 117, 0, 0, 32, 0, 85, 33, 0, 37, 0, 47, 0, 47, 0, 0, 32, 33, 83, 86, 0, 0, 92, 0, 0, 97, 118, 0, 118, 0, 0, 101, 474], O1 = [[58, 3424], [4, 65533], [29, 3424], [4, 65533]], S1 = [[47], 78, [12], 83, 128, [17], 47, [12], 52, 97], p1 = [8236, 0, 8088, 0, 8090, 8097, 8090, 8090, 0, 8103], EA = [8236, 0, 8088, 271, 8090, 8097, 8090, 8090, 574, 8103], j1 = [64, 0, 157, [4], 39, 68, 109, 62, 67, 0, 0, 82, 75, 68, 0, 175, 75, 86, 105, 92, 108, 144, 114, 115, 0, 120, [3], 154, 104, 128, 143, 0, 158, 159, 0, 37, 78, 31, 36, 0, 0, 51, 44, 37, 0, 144, 44, 55, 74, 61, 77, 113, 83, 84, 0, 89, [3], 123, 73, 97, 112, 0, 127, 128], k = [8071, 8071, 8073, 8073, 8077, 8061, 8061], L1 = [-22, 910, 879, 879, 899, 880, 880, 894, 876, 893, [8, 879], 894, [4, 878], 864, 859, 884, 882, 861, 877, 881, 876, 873, 875, 846, 815, 815, 835, 816, 816, 830, 812, 829, [8, 815], 830, [4, 814], 800, 795, 820, 818, 797, 813, 817, 812, 809, 811], Y1 = [9344, 9345, 9354, 9357, 9360, 9363, 9366, 9373, 9380, 9387, 9394, 9461, 9464, 9467, 9470, [4, 9473], 8845, 9484, 8580, 8580, 8625, 8652, 8652, 6, 8838, 20, 21, 25, 88, [3, 9392], 942], bA = { ibm866: [[48, 912], [3, 9441], ...[29, 62, 122, 122, 109, 107, 120, 101, 106, 111, 109, 107, 31, 34, 65, 56, 39, 10, 69, 102, 102, 96, 89, 109, 105, 98, 81, 108, 102, 102, 97, 97, 84, 82, 75, 75, 98, 96, 13, 0, 123, 118, 125, 128, 111].map(A => A + 9266), [16, 864], 785, 864, 786, 865, 787, 866, 792, 871, -72, 8480, -67, 8479, 8218, -89, 9378, -95], "koi8-u": [...Y1, 944, 9391, 944, 944, [5, 9391], 996, 944, [4, 9391], 846, 848, 9390, 848, 848, [5, 9390], 979, 848, ...L1], "koi8-r": [...Y1, [15, 9391], 846, [11, 9390], ...L1], macintosh: [68, 68, 69, 70, 77, 81, 86, 90, 88, 89, 90, 88, 89, 90, 91, 89, 90, 90, 91, 89, 90, 90, 91, 92, 90, 91, 92, 90, 94, 92, 93, 93, 8064, 15, 0, 0, 3, 8061, 16, 56, 6, 0, 8312, 9, -4, 8627, 24, 41, 8558, 0, 8626, 8626, -15, 0, 8524, 8538, 8535, 775, 8561, -17, -2, 748, 40, 57, -1, -32, -22, 8535, 206, 8579, 8512, -28, -13, 8029, -42, -11, -9, 8, 132, 132, 8003, 8003, 8010, 8010, 8004, 8004, 33, 9459, 39, 159, 8042, 8145, 8029, 8029, 64035, 64035, 8001, -42, 7992, 7995, 8012, -35, -28, -38, -29, -33, [3, -29], -33, -27, -27, 63503, -31, -24, -24, -27, 60, 464, 485, -73, [3, 479], -68, 480, 477, 456], "x-mac-cyrillic": [[32, 912], 8064, 15, 1006, 0, 3, 8061, 16, 863, 6, 0, 8312, 855, 934, 8627, 853, 932, 8558, 0, 8626, 8626, 930, 0, 987, 849, 844, 923, 845, 924, 845, 924, 844, 923, 920, 836, -22, 8535, 206, 8579, 8512, -28, -13, 8029, -42, 832, 911, 831, 910, 902, 8003, 8003, 8010, 8010, 8004, 8004, 33, 8007, 822, 901, 821, 900, 8250, 804, 883, 880, [31, 848], 8109], "windows-874": [8236, [4], 8097, [11], ...k, [9], ...O1] }; [[...p1, 214, 8110, 206, 215, 239, 234, 0, ...k, 0, 8329, 199, 8095, 191, 200, 224, 219, 0, 550, 566, 158, 0, 95, [4], 180, [4], 204, 0, 0, 553, 143, [5], 76, 165, 0, 129, 544, 128, ...R1], [898, 898, 8088, 976, 8090, 8097, 8090, 8090, 8228, 8103, 895, 8110, 894, 895, 893, 896, 962, ...k, 0, 8329, 959, 8095, 958, 959, 957, 960, 0, 877, 956, 869, 0, 1003, 0, 0, 857, 0, 858, [4], 856, 0, 0, 852, 931, 989, [3], 921, 8285, 922, 0, 924, 840, 919, 920, [64, 848]], [...EA, 214, 8110, 198, 0, 239, 0, 0, ...k, 580, 8329, 199, 8095, 183, 0, 224, 217], [8236, 0, 8088, 271, 8090, 8097, 8090, 8090, 0, 8103, 0, 8110, [5], ...k, 0, 8329, 0, 8095, [5], 740, 740, [7], 65533, [4], 8038, [4], 720, [3], [3, 720], 0, 720, 0, [20, 720], 65533, [44, 720], 65533], [...EA, 214, 8110, 198, [4], ...k, 580, 8329, 199, 8095, 183, 0, 0, 217, 0, ...S1], [...EA, 0, 8110, [5], ...k, 580, 8329, 0, 8095, [8], 8198, [5], 45, [15], 61, [5], [20, 1264], [5, 1308], [7, 65533], [27, 1264], 65533, 65533, 7953, 7953, 65533], [8236, 1533, 8088, 271, 8090, 8097, 8090, 8090, 574, 8103, 1519, 8110, 198, 1529, 1546, 1529, 1567, ...k, 1553, 8329, 1527, 8095, 183, 8047, 8047, 1563, 0, 1387, [8], 1556, [15], 1377, [4], 1376, 1537, [22, 1376], 0, [4, 1375], [4, 1380], 0, 1379, 0, [4, 1378], [5], 1373, 1373, 0, 0, [4, 1371], 0, 1370, 1370, 0, 1369, 0, 1368, 0, 0, 7953, 7953, 1491], [...p1, 0, 8110, 0, 27, 569, 41, 0, ...k, 0, 8329, 0, 8095, 0, 18, 573, 0, 0, 65533, [3], 65533, 0, 0, 48, 0, 172, [4], 23, [8], ...j1, 474], [...EA, 0, 8110, 198, [4], ...k, 580, 8329, 0, 8095, 183, 0, 0, 217, [35], 63, [8], 564, [3], 64, 0, 567, 0, 0, 203, [7], 210, 549, [4], 32, [8], 533, [3], 33, 0, 561, 0, 0, 172, [7], 179, 8109]].forEach((A, B) => { bA[`windows-${B + 1250}`] = A; }); [[], [99, 566, 158, 0, 152, 180, 0, 0, 183, 180, 185, 205, 0, 207, 204, 0, 84, 553, 143, 0, 137, 165, 528, 0, 168, 165, 170, 190, 544, 192, ...R1], [133, 566, 0, 0, 65533, 126, 0, 0, 135, 180, 115, 136, 0, 65533, 204, 0, 118, [4], 111, 0, 0, 120, 165, 100, 121, 0, 65533, 189, [3], 65533, 0, 69, 66, [9], 65533, [4], 75, 0, 0, 68, [4], 143, 126, [4], 65533, 0, 38, 35, [9], 65533, [4], 44, 0, 0, 37, [4], 112, 95, 474], [99, 150, 179, 0, 131, 149, 0, 0, 183, 104, 119, 186, 0, 207, 0, 0, 84, 553, 164, 0, 116, 134, 528, 0, 168, 89, 104, 171, 141, 192, 140, 64, [6], 103, 68, 0, 78, 0, 74, 0, 0, 91, 64, 116, 122, 99, [5], 153, [3], 139, 140, 0, 33, [6], 72, 37, 0, 47, 0, 43, 0, 0, 60, 33, 85, 91, 68, [5], 122, [3], 108, 109, 474], [[12, 864], 0, [66, 864], 8230, [12, 864], -86, 864, 864], [[3, 65533], 0, [7, 65533], 1376, 0, [13, 65533], 1376, [3, 65533], 1376, 65533, [26, 1376], [5, 65533], [19, 1376], [13, 65533]], [8055, 8055, 0, 8200, 8202, [4], 720, [3], 65533, 8038, [4], [3, 720], 0, [3, 720], 0, 720, 0, [20, 720], 65533, [44, 720], 65533], [65533, [8], 45, [15], 61, [4], [32, 65533], 7992, [27, 1264], 65533, 65533, 7953, 7953, 65533], S1, [99, 112, 127, 134, 131, 144, 0, 147, 103, 182, 187, 209, 0, 188, 155, 0, 84, 97, 112, 119, 116, 129, 0, 132, 88, 167, 172, 194, 8024, 173, 140, 64, [6], 103, 68, 0, 78, 0, 74, [4], 116, 122, [4], 145, 0, 153, [6], 33, [6], 72, 37, 0, 47, 0, 43, [4], 85, 91, [4], 114, 0, 122, [5], 57], O1, null, [8060, [3], 8057, 0, 0, 48, 0, 172, [4], 23, [4], 8040, [3], ...j1, 7962], [7521, 7521, 0, 102, 102, 7524, 0, 7640, 0, 7640, 7520, 7750, 0, 0, 201, 7534, 7534, 110, 110, 7564, 7564, 0, 7583, 7625, 7582, 7625, 7589, 7735, 7623, 7623, 7586, [16], 164, [6], 7571, [6], 152, [17], 133, [6], 7540, [6], 121], [[3], 8200, 0, 186, 0, 185, [11], 201, [3], 198, [3], 150, 150, 186], [99, 99, 158, 8200, 8057, 186, 0, 185, 0, 366, 0, 205, 0, 204, 204, 0, 0, 90, 143, 201, 8040, 0, 0, 198, 84, 351, 0, 150, 150, 186, 189, [3], 63, 0, 65, [10], 64, 114, [3], 123, 0, 131, 152, [4], 59, 316, [4], 32, 0, 34, [10], 33, 83, [3], 92, 0, 100, 121, [4], 28, 285]].forEach((A, B) => { A && (bA[`iso-8859-${B + 1}`] = [[33], ...A]); }); var dA = bA; var z1 = "Input is not well-formed for this encoding", m1 = "x-user-defined", J1 = "iso-8859-8-i", UA = A => { if (!(Object.hasOwn(dA, A) || A === m1 || A === J1))
                throw new RangeError("Unsupported encoding"); }, N1 = 65533; function q2(A) { return UA(A), A === m1 ? Array.from({ length: 128 }, (Q, t) => 63360 + t) : (A === J1 && (A = "iso-8859-8"), dA[A].flatMap(Q => Array.isArray(Q) ? new Array(Q[0]).fill(Q[1] ?? 0) : Q).map((Q, t) => Q === N1 ? Q : Q + 128 + t)); } var X1 = new Map; function K1(A) { let B = X1.get(A); if (B)
                return B; let e = A === "iso-8859-1"; if (e && !P)
                return (E, _ = !1) => H(E); let Q, t = q2(A), f = t.includes(N1), n = (E, _ = !1) => { if (!Q) {
                let s = Array.from({ length: 128 }, (i, c) => c).concat(t);
                for (; s.length < 256;)
                    s.push(s.length);
                Q = s.map(i => String.fromCharCode(i));
            } let w = X(E); if (w === E.length)
                return z(E); if (e)
                return H(E); let g = H(E, 0, w), o = zA(E, g.length, E.length, Q); if (!_ && f && o.includes("\uFFFD"))
                throw new TypeError(z1); return g + o; }; return X1.set(A, n), n; } var { TextDecoder: V1, btoa: $2 } = globalThis, oA, A3 = new Set(["iso-8859-1", "iso-8859-9", "iso-8859-11", "iso-8859-6", "iso-8859-8", "iso-8859-8-i", "iso-8859-16"]); function B3(A) { if (A === "windows-1252") {
                if (oA === void 0) {
                    oA = !1;
                    try {
                        let B = new Uint8Array(9);
                        B[8] = 128, oA = new V1(A).decode(B).codePointAt(8) === 8364;
                    }
                    catch { }
                }
                return oA;
            } return !A3.has(A); } function W1(A, B = !1) { if (typeof B != "boolean")
                throw new TypeError("loose option should be boolean"); if (UA(A), N && B3(A))
                try {
                    let Q = new V1(A, { fatal: !B });
                    return t => (a(t), t.byteLength === 0 ? "" : Q.decode(t));
                }
                catch { } let e = K1(A); return Q => (a(Q), Q.byteLength === 0 ? "" : e(Q, B)); } var rB = Uint8Array.fromBase64 && $2; var U = { "utf-8": ["unicode-1-1-utf-8", "unicode11utf8", "unicode20utf8", "utf8", "x-unicode20utf8"], "utf-16be": ["unicodefffe"], "utf-16le": ["csunicode", "iso-10646-ucs-2", "ucs-2", "unicode", "unicodefeff", "utf-16"], "iso-8859-2": ["iso-ir-101"], "iso-8859-3": ["iso-ir-109"], "iso-8859-4": ["iso-ir-110"], "iso-8859-5": ["csisolatincyrillic", "cyrillic", "iso-ir-144"], "iso-8859-6": ["arabic", "asmo-708", "csiso88596e", "csiso88596i", "csisolatinarabic", "ecma-114", "iso-8859-6-e", "iso-8859-6-i", "iso-ir-127"], "iso-8859-7": ["csisolatingreek", "ecma-118", "elot_928", "greek", "greek8", "iso-ir-126", "sun_eu_greek"], "iso-8859-8": ["csiso88598e", "csisolatinhebrew", "hebrew", "iso-8859-8-e", "iso-ir-138", "visual"], "iso-8859-8-i": ["csiso88598i", "logical"], "iso-8859-16": [], "koi8-r": ["cskoi8r", "koi", "koi8", "koi8_r"], "koi8-u": ["koi8-ru"], "windows-874": ["dos-874", "iso-8859-11", "iso8859-11", "iso885911", "tis-620"], ibm866: ["866", "cp866", "csibm866"], "x-mac-cyrillic": ["x-mac-ukrainian"], macintosh: ["csmacintosh", "mac", "x-mac-roman"], gbk: ["chinese", "csgb2312", "csiso58gb231280", "gb2312", "gb_2312", "gb_2312-80", "iso-ir-58", "x-gbk"], gb18030: [], big5: ["big5-hkscs", "cn-big5", "csbig5", "x-x-big5"], "euc-jp": ["cseucpkdfmtjapanese", "x-euc-jp"], shift_jis: ["csshiftjis", "ms932", "ms_kanji", "shift-jis", "sjis", "windows-31j", "x-sjis"], "euc-kr": ["cseuckr", "csksc56011987", "iso-ir-149", "korean", "ks_c_5601-1987", "ks_c_5601-1989", "ksc5601", "ksc_5601", "windows-949"], "iso-2022-jp": ["csiso2022jp"], replacement: ["csiso2022kr", "hz-gb-2312", "iso-2022-cn", "iso-2022-cn-ext", "iso-2022-kr"], "x-user-defined": [] }; for (let A of [10, 13, 14, 15])
                U[`iso-8859-${A}`] = [`iso8859-${A}`, `iso8859${A}`]; for (let A of [2, 6, 7])
                U[`iso-8859-${A}`].push(`iso_8859-${A}:1987`); for (let A of [3, 4, 5, 8])
                U[`iso-8859-${A}`].push(`iso_8859-${A}:1988`); for (let A = 2; A < 9; A++)
                U[`iso-8859-${A}`].push(`iso8859-${A}`, `iso8859${A}`, `iso_8859-${A}`); for (let A = 2; A < 5; A++)
                U[`iso-8859-${A}`].push(`csisolatin${A}`, `l${A}`, `latin${A}`); for (let A = 0; A < 9; A++)
                U[`windows-125${A}`] = [`cp125${A}`, `x-cp125${A}`]; U["windows-1252"].push("ansi_x3.4-1968", "ascii", "cp819", "csisolatin1", "ibm819", "iso-8859-1", "iso-ir-100", "iso8859-1", "iso88591", "iso_8859-1", "iso_8859-1:1987", "l1", "latin1", "us-ascii"); U["windows-1254"].push("csisolatin5", "iso-8859-9", "iso-ir-148", "iso8859-9", "iso88599", "iso_8859-9", "iso_8859-9:1989", "l5", "latin5"); U["iso-8859-10"].push("csisolatin6", "iso-ir-157", "l6", "latin6"); U["iso-8859-15"].push("csisolatin9", "iso_8859-15", "l9"); var GA = U; function e3(A) { if (A instanceof ArrayBuffer || globalThis.SharedArrayBuffer && A instanceof SharedArrayBuffer)
                return !0; if (!A || typeof A.byteLength != "number")
                return !1; let B = Object.prototype.toString.call(A); return B === "[object ArrayBuffer]" || B === "[object SharedArrayBuffer]"; } function Z1(A) { if (A instanceof Uint8Array)
                return A; if (ArrayBuffer.isView(A))
                return new Uint8Array(A.buffer, A.byteOffset, A.byteLength); if (e3(A)) {
                if ("detached" in A)
                    return A.detached === !0 ? new Uint8Array : new Uint8Array(A);
                try {
                    return new Uint8Array(A);
                }
                catch {
                    return new Uint8Array;
                }
            } throw new TypeError("Argument must be a SharedArrayBuffer, ArrayBuffer or ArrayBufferView"); } function kA(A, B, e) { switch (e) {
                case "utf-8": {
                    let Q = 0;
                    for (; Q < 2 && Q < B && (A[B - Q - 1] & 192) === 128;)
                        Q++;
                    if (Q === B)
                        return 0;
                    let t = A[B - Q - 1];
                    if (t < 194 || t > 244)
                        return 0;
                    if (Q === 0)
                        return 1;
                    if (t < 224 || t < 240 && Q >= 2)
                        return 0;
                    let f = t === 240 ? 144 : t === 224 ? 160 : 128, n = t === 244 ? 143 : t === 237 ? 159 : 191, E = A[B - Q];
                    return E >= f && E <= n ? Q + 1 : 0;
                }
                case "utf-16le":
                case "utf-16be": {
                    let Q = B % 2;
                    if (B < 2)
                        return Q;
                    let t = B - Q - 1, f = e === "utf-16le" ? A[t] << 8 ^ A[t - 1] : A[t - 1] << 8 ^ A[t];
                    return f >= 55296 && f < 56320 ? Q + 2 : Q;
                }
            } throw new Error("Unsupported encoding"); } function q1(A, B, e) { if (A.length === 0)
                return B; let Q = B.length; if (A.length < 3) {
                let f = new Uint8Array(Q + A.length);
                return f.set(B), f.set(A, Q), f;
            } let t = new Uint8Array(Q + 3); t.set(B), t.set(A.subarray(0, 3), Q); for (let f = 1; f <= 3; f++) {
                let n = kA(t, Q + f, e);
                if (n <= f) {
                    let E = f - n;
                    return E > 0 ? t.subarray(0, Q + E) : B;
                }
            } } var t3 = "Unknown encoding", f3 = "import '@exodus/bytes/encoding.js' for legacy multi-byte encodings support", $1 = 'The "options" argument must be of type object', E3 = "\uFFFD", o3 = new Set(["big5", "euc-kr", "euc-jp", "iso-2022-jp", "shift_jis", "gbk", "gb18030"]), TA, w3, wA; function A2(A) { if (A === "utf-8" || A === "utf8" || A === "UTF-8" || A === "UTF8")
                return "utf-8"; if (A === "windows-1252" || A === "ascii" || A === "latin1")
                return "windows-1252"; if (/[^\w\t\n\f\r .:-]/i.test(A))
                return null; let B = `${A}`.trim().toLowerCase(); if (Object.hasOwn(GA, B))
                return B; if (!wA) {
                wA = new Map;
                for (let [Q, t] of Object.entries(GA))
                    for (let f of t)
                        wA.set(f, Q);
            } let e = wA.get(B); return e || null; } var g3 = A => o3.has(A); function B2(A, B) { TA = A, w3 = B; } var yA = (A, B, e) => Object.defineProperty(A, B, { value: e, writable: !1 }); function n3(A, B) { if (A === "utf-8")
                return B ? T1 : y1; let e = A === "utf-16le" ? "uint8-le" : "uint8-be"; return B ? Q => l1(Q, e) : Q => QA(Q, e); } var M, S, $, T, p, gA, e2, q = class {
                constructor(B = "utf-8", e = {}) { L(this, gA); L(this, M); L(this, S); L(this, $); L(this, T); L(this, p); if (typeof e != "object")
                    throw new TypeError($1); let Q = A2(B); if (!Q || Q === "replacement")
                    throw new RangeError(t3); yA(this, "encoding", Q), yA(this, "fatal", !!e.fatal), yA(this, "ignoreBOM", !!e.ignoreBOM), v(this, S, Q === "utf-8" || Q === "utf-16le" || Q === "utf-16be"), v(this, $, !u(this, S) && g3(Q)), v(this, p, u(this, S) && !this.ignoreBOM); }
                get [Symbol.toStringTag]() { return "TextDecoder"; }
                decode(B, e = {}) { if (typeof e != "object")
                    throw new TypeError($1); let Q = !!e.stream, t = B === void 0 ? new Uint8Array : Z1(B), f = t.length === 0; if (f && Q)
                    return ""; if (u(this, S)) {
                    let n;
                    if (u(this, T)) {
                        let w = q1(t, u(this, T), this.encoding);
                        if (t.length < 3)
                            t = w;
                        else {
                            n = w;
                            let g = n.length - u(this, T).length;
                            g > 0 && (t = t.subarray(g));
                        }
                        v(this, T, null);
                    }
                    else if (f)
                        return v(this, p, !this.ignoreBOM), "";
                    let E = "";
                    if (Q || !this.fatal && this.encoding !== "utf-8") {
                        let w = kA(t, t.byteLength, this.encoding);
                        w > 0 && (Q ? v(this, T, Uint8Array.from(t.subarray(-w))) : E = E3, t = t.subarray(0, -w));
                    }
                    let _ = !1;
                    if (u(this, p)) {
                        let w = jA(this, gA, e2).call(this, n ?? t);
                        w && (_ = !0, n ? n = n.subarray(w) : t = t.subarray(w));
                    }
                    else
                        !Q && !this.ignoreBOM && v(this, p, !0);
                    u(this, M) || v(this, M, n3(this.encoding, !this.fatal));
                    try {
                        let w = (n ? u(this, M).call(this, n) : "") + u(this, M).call(this, t) + E;
                        return Q && (_ || w.length > 0) && v(this, p, !1), w;
                    }
                    catch (w) {
                        throw v(this, T, null), w;
                    }
                }
                else if (u(this, $)) {
                    if (!TA)
                        throw new Error(f3);
                    return u(this, M) || v(this, M, TA(this.encoding, !this.fatal)), u(this, M).call(this, t, Q);
                }
                else
                    return u(this, M) || v(this, M, W1(this.encoding, !this.fatal)), u(this, M).call(this, t); }
            }; M = new WeakMap, S = new WeakMap, $ = new WeakMap, T = new WeakMap, p = new WeakMap, gA = new WeakSet, e2 = function (B) { switch (this.encoding) {
                case "utf-8": return B.byteLength >= 3 && B[0] === 239 && B[1] === 187 && B[2] === 191 ? 3 : 0;
                case "utf-16le": return B.byteLength >= 2 && B[0] === 255 && B[1] === 254 ? 2 : 0;
                case "utf-16be": return B.byteLength >= 2 && B[0] === 254 && B[1] === 255 ? 2 : 0;
            } throw new Error("Unreachable"); }; B2(d1, FA); return s2(_3); })();
            ;
            return __wayxProvider;
        }), { TextDecoder: typeof TextDecoder === 'undefined' ? undefined : TextDecoder }), utils: typeof $utils === 'undefined' ? undefined : $utils, crypto: typeof $crypto === 'undefined' ? undefined : $crypto, compression: (function () {
            const module = { exports: {} };
            const exports = module.exports;
            !function (t, e) { "object" == typeof exports && "undefined" != typeof module ? e(exports) : "function" == typeof define && define.amd ? define(["exports"], e) : e((t = "undefined" != typeof globalThis ? globalThis : t || self).pako = {}); }(this, (function (t) {
                "use strict";
                function e(t) { let e = t.length; for (; --e >= 0;)
                    t[e] = 0; }
                const a = 256, i = 286, n = 30, s = 15, r = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]), o = new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]), l = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7]), h = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]), d = new Array(576);
                e(d);
                const _ = new Array(60);
                e(_);
                const f = new Array(512);
                e(f);
                const c = new Array(256);
                e(c);
                const u = new Array(29);
                e(u);
                const w = new Array(n);
                function m(t, e, a, i, n) { this.static_tree = t, this.extra_bits = e, this.extra_base = a, this.elems = i, this.max_length = n, this.has_stree = t && t.length; }
                let b, g, p;
                function k(t, e) { this.dyn_tree = t, this.max_code = 0, this.stat_desc = e; }
                e(w);
                const v = t => t < 256 ? f[t] : f[256 + (t >>> 7)], y = (t, e) => { t.pending_buf[t.pending++] = 255 & e, t.pending_buf[t.pending++] = e >>> 8 & 255; }, x = (t, e, a) => { t.bi_valid > 16 - a ? (t.bi_buf |= e << t.bi_valid & 65535, y(t, t.bi_buf), t.bi_buf = e >> 16 - t.bi_valid, t.bi_valid += a - 16) : (t.bi_buf |= e << t.bi_valid & 65535, t.bi_valid += a); }, z = (t, e, a) => { x(t, a[2 * e], a[2 * e + 1]); }, A = (t, e) => { let a = 0; do {
                    a |= 1 & t, t >>>= 1, a <<= 1;
                } while (--e > 0); return a >>> 1; }, E = (t, e, a) => { const i = new Array(16); let n, r, o = 0; for (n = 1; n <= s; n++)
                    o = o + a[n - 1] << 1, i[n] = o; for (r = 0; r <= e; r++) {
                    let e = t[2 * r + 1];
                    0 !== e && (t[2 * r] = A(i[e]++, e));
                } }, R = t => { let e; for (e = 0; e < i; e++)
                    t.dyn_ltree[2 * e] = 0; for (e = 0; e < n; e++)
                    t.dyn_dtree[2 * e] = 0; for (e = 0; e < 19; e++)
                    t.bl_tree[2 * e] = 0; t.dyn_ltree[512] = 1, t.opt_len = t.static_len = 0, t.sym_next = t.matches = 0; }, Z = t => { t.bi_valid > 8 ? y(t, t.bi_buf) : t.bi_valid > 0 && (t.pending_buf[t.pending++] = t.bi_buf), t.bi_buf = 0, t.bi_valid = 0; }, U = (t, e, a, i) => { const n = 2 * e, s = 2 * a; return t[n] < t[s] || t[n] === t[s] && i[e] <= i[a]; }, S = (t, e, a) => { const i = t.heap[a]; let n = a << 1; for (; n <= t.heap_len && (n < t.heap_len && U(e, t.heap[n + 1], t.heap[n], t.depth) && n++, !U(e, i, t.heap[n], t.depth));)
                    t.heap[a] = t.heap[n], a = n, n <<= 1; t.heap[a] = i; }, D = (t, e, i) => { let n, s, l, h, d = 0; if (0 !== t.sym_next)
                    do {
                        n = 255 & t.pending_buf[t.sym_buf + d++], n += (255 & t.pending_buf[t.sym_buf + d++]) << 8, s = t.pending_buf[t.sym_buf + d++], 0 === n ? z(t, s, e) : (l = c[s], z(t, l + a + 1, e), h = r[l], 0 !== h && (s -= u[l], x(t, s, h)), n--, l = v(n), z(t, l, i), h = o[l], 0 !== h && (n -= w[l], x(t, n, h)));
                    } while (d < t.sym_next); z(t, 256, e); }, T = (t, e) => { const a = e.dyn_tree, i = e.stat_desc.static_tree, n = e.stat_desc.has_stree, r = e.stat_desc.elems; let o, l, h, d = -1; for (t.heap_len = 0, t.heap_max = 573, o = 0; o < r; o++)
                    0 !== a[2 * o] ? (t.heap[++t.heap_len] = d = o, t.depth[o] = 0) : a[2 * o + 1] = 0; for (; t.heap_len < 2;)
                    h = t.heap[++t.heap_len] = d < 2 ? ++d : 0, a[2 * h] = 1, t.depth[h] = 0, t.opt_len--, n && (t.static_len -= i[2 * h + 1]); for (e.max_code = d, o = t.heap_len >> 1; o >= 1; o--)
                    S(t, a, o); h = r; do {
                    o = t.heap[1], t.heap[1] = t.heap[t.heap_len--], S(t, a, 1), l = t.heap[1], t.heap[--t.heap_max] = o, t.heap[--t.heap_max] = l, a[2 * h] = a[2 * o] + a[2 * l], t.depth[h] = (t.depth[o] >= t.depth[l] ? t.depth[o] : t.depth[l]) + 1, a[2 * o + 1] = a[2 * l + 1] = h, t.heap[1] = h++, S(t, a, 1);
                } while (t.heap_len >= 2); t.heap[--t.heap_max] = t.heap[1], ((t, e) => { const a = e.dyn_tree, i = e.max_code, n = e.stat_desc.static_tree, r = e.stat_desc.has_stree, o = e.stat_desc.extra_bits, l = e.stat_desc.extra_base, h = e.stat_desc.max_length; let d, _, f, c, u, w, m = 0; for (c = 0; c <= s; c++)
                    t.bl_count[c] = 0; for (a[2 * t.heap[t.heap_max] + 1] = 0, d = t.heap_max + 1; d < 573; d++)
                    _ = t.heap[d], c = a[2 * a[2 * _ + 1] + 1] + 1, c > h && (c = h, m++), a[2 * _ + 1] = c, _ > i || (t.bl_count[c]++, u = 0, _ >= l && (u = o[_ - l]), w = a[2 * _], t.opt_len += w * (c + u), r && (t.static_len += w * (n[2 * _ + 1] + u))); if (0 !== m) {
                    do {
                        for (c = h - 1; 0 === t.bl_count[c];)
                            c--;
                        t.bl_count[c]--, t.bl_count[c + 1] += 2, t.bl_count[h]--, m -= 2;
                    } while (m > 0);
                    for (c = h; 0 !== c; c--)
                        for (_ = t.bl_count[c]; 0 !== _;)
                            f = t.heap[--d], f > i || (a[2 * f + 1] !== c && (t.opt_len += (c - a[2 * f + 1]) * a[2 * f], a[2 * f + 1] = c), _--);
                } })(t, e), E(a, d, t.bl_count); }, O = (t, e, a) => { let i, n, s = -1, r = e[1], o = 0, l = 7, h = 4; for (0 === r && (l = 138, h = 3), e[2 * (a + 1) + 1] = 65535, i = 0; i <= a; i++)
                    n = r, r = e[2 * (i + 1) + 1], ++o < l && n === r || (o < h ? t.bl_tree[2 * n] += o : 0 !== n ? (n !== s && t.bl_tree[2 * n]++, t.bl_tree[32]++) : o <= 10 ? t.bl_tree[34]++ : t.bl_tree[36]++, o = 0, s = n, 0 === r ? (l = 138, h = 3) : n === r ? (l = 6, h = 3) : (l = 7, h = 4)); }, I = (t, e, a) => { let i, n, s = -1, r = e[1], o = 0, l = 7, h = 4; for (0 === r && (l = 138, h = 3), i = 0; i <= a; i++)
                    if (n = r, r = e[2 * (i + 1) + 1], !(++o < l && n === r)) {
                        if (o < h)
                            do {
                                z(t, n, t.bl_tree);
                            } while (0 != --o);
                        else
                            0 !== n ? (n !== s && (z(t, n, t.bl_tree), o--), z(t, 16, t.bl_tree), x(t, o - 3, 2)) : o <= 10 ? (z(t, 17, t.bl_tree), x(t, o - 3, 3)) : (z(t, 18, t.bl_tree), x(t, o - 11, 7));
                        o = 0, s = n, 0 === r ? (l = 138, h = 3) : n === r ? (l = 6, h = 3) : (l = 7, h = 4);
                    } };
                let F = !1;
                const L = (t, e, a, i) => { x(t, 0 + (i ? 1 : 0), 3), Z(t), y(t, a), y(t, ~a), a && t.pending_buf.set(t.window.subarray(e, e + a), t.pending), t.pending += a; };
                var N = (t, e, i, n) => { let s, r, o = 0; t.level > 0 ? (2 === t.strm.data_type && (t.strm.data_type = (t => { let e, i = 4093624447; for (e = 0; e <= 31; e++, i >>>= 1)
                    if (1 & i && 0 !== t.dyn_ltree[2 * e])
                        return 0; if (0 !== t.dyn_ltree[18] || 0 !== t.dyn_ltree[20] || 0 !== t.dyn_ltree[26])
                    return 1; for (e = 32; e < a; e++)
                    if (0 !== t.dyn_ltree[2 * e])
                        return 1; return 0; })(t)), T(t, t.l_desc), T(t, t.d_desc), o = (t => { let e; for (O(t, t.dyn_ltree, t.l_desc.max_code), O(t, t.dyn_dtree, t.d_desc.max_code), T(t, t.bl_desc), e = 18; e >= 3 && 0 === t.bl_tree[2 * h[e] + 1]; e--)
                    ; return t.opt_len += 3 * (e + 1) + 5 + 5 + 4, e; })(t), s = t.opt_len + 3 + 7 >>> 3, r = t.static_len + 3 + 7 >>> 3, r <= s && (s = r)) : s = r = i + 5, i + 4 <= s && -1 !== e ? L(t, e, i, n) : 4 === t.strategy || r === s ? (x(t, 2 + (n ? 1 : 0), 3), D(t, d, _)) : (x(t, 4 + (n ? 1 : 0), 3), ((t, e, a, i) => { let n; for (x(t, e - 257, 5), x(t, a - 1, 5), x(t, i - 4, 4), n = 0; n < i; n++)
                    x(t, t.bl_tree[2 * h[n] + 1], 3); I(t, t.dyn_ltree, e - 1), I(t, t.dyn_dtree, a - 1); })(t, t.l_desc.max_code + 1, t.d_desc.max_code + 1, o + 1), D(t, t.dyn_ltree, t.dyn_dtree)), R(t), n && Z(t); }, B = { _tr_init: t => { F || ((() => { let t, e, a, h, k; const v = new Array(16); for (a = 0, h = 0; h < 28; h++)
                        for (u[h] = a, t = 0; t < 1 << r[h]; t++)
                            c[a++] = h; for (c[a - 1] = h, k = 0, h = 0; h < 16; h++)
                        for (w[h] = k, t = 0; t < 1 << o[h]; t++)
                            f[k++] = h; for (k >>= 7; h < n; h++)
                        for (w[h] = k << 7, t = 0; t < 1 << o[h] - 7; t++)
                            f[256 + k++] = h; for (e = 0; e <= s; e++)
                        v[e] = 0; for (t = 0; t <= 143;)
                        d[2 * t + 1] = 8, t++, v[8]++; for (; t <= 255;)
                        d[2 * t + 1] = 9, t++, v[9]++; for (; t <= 279;)
                        d[2 * t + 1] = 7, t++, v[7]++; for (; t <= 287;)
                        d[2 * t + 1] = 8, t++, v[8]++; for (E(d, 287, v), t = 0; t < n; t++)
                        _[2 * t + 1] = 5, _[2 * t] = A(t, 5); b = new m(d, r, 257, i, s), g = new m(_, o, 0, n, s), p = new m(new Array(0), l, 0, 19, 7); })(), F = !0), t.l_desc = new k(t.dyn_ltree, b), t.d_desc = new k(t.dyn_dtree, g), t.bl_desc = new k(t.bl_tree, p), t.bi_buf = 0, t.bi_valid = 0, R(t); }, _tr_stored_block: L, _tr_flush_block: N, _tr_tally: (t, e, i) => (t.pending_buf[t.sym_buf + t.sym_next++] = e, t.pending_buf[t.sym_buf + t.sym_next++] = e >> 8, t.pending_buf[t.sym_buf + t.sym_next++] = i, 0 === e ? t.dyn_ltree[2 * i]++ : (t.matches++, e--, t.dyn_ltree[2 * (c[i] + a + 1)]++, t.dyn_dtree[2 * v(e)]++), t.sym_next === t.sym_end), _tr_align: t => { x(t, 2, 3), z(t, 256, d), (t => { 16 === t.bi_valid ? (y(t, t.bi_buf), t.bi_buf = 0, t.bi_valid = 0) : t.bi_valid >= 8 && (t.pending_buf[t.pending++] = 255 & t.bi_buf, t.bi_buf >>= 8, t.bi_valid -= 8); })(t); } };
                var C = (t, e, a, i) => { let n = 65535 & t | 0, s = t >>> 16 & 65535 | 0, r = 0; for (; 0 !== a;) {
                    r = a > 2e3 ? 2e3 : a, a -= r;
                    do {
                        n = n + e[i++] | 0, s = s + n | 0;
                    } while (--r);
                    n %= 65521, s %= 65521;
                } return n | s << 16 | 0; };
                const M = new Uint32Array((() => { let t, e = []; for (var a = 0; a < 256; a++) {
                    t = a;
                    for (var i = 0; i < 8; i++)
                        t = 1 & t ? 3988292384 ^ t >>> 1 : t >>> 1;
                    e[a] = t;
                } return e; })());
                var H = (t, e, a, i) => { const n = M, s = i + a; t ^= -1; for (let a = i; a < s; a++)
                    t = t >>> 8 ^ n[255 & (t ^ e[a])]; return -1 ^ t; }, j = { 2: "need dictionary", 1: "stream end", 0: "", "-1": "file error", "-2": "stream error", "-3": "data error", "-4": "insufficient memory", "-5": "buffer error", "-6": "incompatible version" }, K = { Z_NO_FLUSH: 0, Z_PARTIAL_FLUSH: 1, Z_SYNC_FLUSH: 2, Z_FULL_FLUSH: 3, Z_FINISH: 4, Z_BLOCK: 5, Z_TREES: 6, Z_OK: 0, Z_STREAM_END: 1, Z_NEED_DICT: 2, Z_ERRNO: -1, Z_STREAM_ERROR: -2, Z_DATA_ERROR: -3, Z_MEM_ERROR: -4, Z_BUF_ERROR: -5, Z_NO_COMPRESSION: 0, Z_BEST_SPEED: 1, Z_BEST_COMPRESSION: 9, Z_DEFAULT_COMPRESSION: -1, Z_FILTERED: 1, Z_HUFFMAN_ONLY: 2, Z_RLE: 3, Z_FIXED: 4, Z_DEFAULT_STRATEGY: 0, Z_BINARY: 0, Z_TEXT: 1, Z_UNKNOWN: 2, Z_DEFLATED: 8 };
                const { _tr_init: P, _tr_stored_block: Y, _tr_flush_block: G, _tr_tally: X, _tr_align: W } = B, { Z_NO_FLUSH: q, Z_PARTIAL_FLUSH: J, Z_FULL_FLUSH: Q, Z_FINISH: V, Z_BLOCK: $, Z_OK: tt, Z_STREAM_END: et, Z_STREAM_ERROR: at, Z_DATA_ERROR: it, Z_BUF_ERROR: nt, Z_DEFAULT_COMPRESSION: st, Z_FILTERED: rt, Z_HUFFMAN_ONLY: ot, Z_RLE: lt, Z_FIXED: ht, Z_DEFAULT_STRATEGY: dt, Z_UNKNOWN: _t, Z_DEFLATED: ft } = K, ct = 258, ut = 262, wt = 42, mt = 113, bt = 666, gt = (t, e) => (t.msg = j[e], e), pt = t => 2 * t - (t > 4 ? 9 : 0), kt = t => { let e = t.length; for (; --e >= 0;)
                    t[e] = 0; }, vt = t => { let e, a, i, n = t.w_size; e = t.hash_size, i = e; do {
                    a = t.head[--i], t.head[i] = a >= n ? a - n : 0;
                } while (--e); e = n, i = e; do {
                    a = t.prev[--i], t.prev[i] = a >= n ? a - n : 0;
                } while (--e); };
                let yt = (t, e, a) => (e << t.hash_shift ^ a) & t.hash_mask;
                const xt = t => { const e = t.state; let a = e.pending; a > t.avail_out && (a = t.avail_out), 0 !== a && (t.output.set(e.pending_buf.subarray(e.pending_out, e.pending_out + a), t.next_out), t.next_out += a, e.pending_out += a, t.total_out += a, t.avail_out -= a, e.pending -= a, 0 === e.pending && (e.pending_out = 0)); }, zt = (t, e) => { G(t, t.block_start >= 0 ? t.block_start : -1, t.strstart - t.block_start, e), t.block_start = t.strstart, xt(t.strm); }, At = (t, e) => { t.pending_buf[t.pending++] = e; }, Et = (t, e) => { t.pending_buf[t.pending++] = e >>> 8 & 255, t.pending_buf[t.pending++] = 255 & e; }, Rt = (t, e, a, i) => { let n = t.avail_in; return n > i && (n = i), 0 === n ? 0 : (t.avail_in -= n, e.set(t.input.subarray(t.next_in, t.next_in + n), a), 1 === t.state.wrap ? t.adler = C(t.adler, e, n, a) : 2 === t.state.wrap && (t.adler = H(t.adler, e, n, a)), t.next_in += n, t.total_in += n, n); }, Zt = (t, e) => { let a, i, n = t.max_chain_length, s = t.strstart, r = t.prev_length, o = t.nice_match; const l = t.strstart > t.w_size - ut ? t.strstart - (t.w_size - ut) : 0, h = t.window, d = t.w_mask, _ = t.prev, f = t.strstart + ct; let c = h[s + r - 1], u = h[s + r]; t.prev_length >= t.good_match && (n >>= 2), o > t.lookahead && (o = t.lookahead); do {
                    if (a = e, h[a + r] === u && h[a + r - 1] === c && h[a] === h[s] && h[++a] === h[s + 1]) {
                        s += 2, a++;
                        do { } while (h[++s] === h[++a] && h[++s] === h[++a] && h[++s] === h[++a] && h[++s] === h[++a] && h[++s] === h[++a] && h[++s] === h[++a] && h[++s] === h[++a] && h[++s] === h[++a] && s < f);
                        if (i = ct - (f - s), s = f - ct, i > r) {
                            if (t.match_start = e, r = i, i >= o)
                                break;
                            c = h[s + r - 1], u = h[s + r];
                        }
                    }
                } while ((e = _[e & d]) > l && 0 != --n); return r <= t.lookahead ? r : t.lookahead; }, Ut = t => { const e = t.w_size; let a, i, n; do {
                    if (i = t.window_size - t.lookahead - t.strstart, t.strstart >= e + (e - ut) && (t.window.set(t.window.subarray(e, e + e - i), 0), t.match_start -= e, t.strstart -= e, t.block_start -= e, t.insert > t.strstart && (t.insert = t.strstart), vt(t), i += e), 0 === t.strm.avail_in)
                        break;
                    if (a = Rt(t.strm, t.window, t.strstart + t.lookahead, i), t.lookahead += a, t.lookahead + t.insert >= 3)
                        for (n = t.strstart - t.insert, t.ins_h = t.window[n], t.ins_h = yt(t, t.ins_h, t.window[n + 1]); t.insert && (t.ins_h = yt(t, t.ins_h, t.window[n + 3 - 1]), t.prev[n & t.w_mask] = t.head[t.ins_h], t.head[t.ins_h] = n, n++, t.insert--, !(t.lookahead + t.insert < 3));)
                            ;
                } while (t.lookahead < ut && 0 !== t.strm.avail_in); }, St = (t, e) => { let a, i, n, s = t.pending_buf_size - 5 > t.w_size ? t.w_size : t.pending_buf_size - 5, r = 0, o = t.strm.avail_in; do {
                    if (a = 65535, n = t.bi_valid + 42 >> 3, t.strm.avail_out < n)
                        break;
                    if (n = t.strm.avail_out - n, i = t.strstart - t.block_start, a > i + t.strm.avail_in && (a = i + t.strm.avail_in), a > n && (a = n), a < s && (0 === a && e !== V || e === q || a !== i + t.strm.avail_in))
                        break;
                    r = e === V && a === i + t.strm.avail_in ? 1 : 0, Y(t, 0, 0, r), t.pending_buf[t.pending - 4] = a, t.pending_buf[t.pending - 3] = a >> 8, t.pending_buf[t.pending - 2] = ~a, t.pending_buf[t.pending - 1] = ~a >> 8, xt(t.strm), i && (i > a && (i = a), t.strm.output.set(t.window.subarray(t.block_start, t.block_start + i), t.strm.next_out), t.strm.next_out += i, t.strm.avail_out -= i, t.strm.total_out += i, t.block_start += i, a -= i), a && (Rt(t.strm, t.strm.output, t.strm.next_out, a), t.strm.next_out += a, t.strm.avail_out -= a, t.strm.total_out += a);
                } while (0 === r); return o -= t.strm.avail_in, o && (o >= t.w_size ? (t.matches = 2, t.window.set(t.strm.input.subarray(t.strm.next_in - t.w_size, t.strm.next_in), 0), t.strstart = t.w_size, t.insert = t.strstart) : (t.window_size - t.strstart <= o && (t.strstart -= t.w_size, t.window.set(t.window.subarray(t.w_size, t.w_size + t.strstart), 0), t.matches < 2 && t.matches++, t.insert > t.strstart && (t.insert = t.strstart)), t.window.set(t.strm.input.subarray(t.strm.next_in - o, t.strm.next_in), t.strstart), t.strstart += o, t.insert += o > t.w_size - t.insert ? t.w_size - t.insert : o), t.block_start = t.strstart), t.high_water < t.strstart && (t.high_water = t.strstart), r ? 4 : e !== q && e !== V && 0 === t.strm.avail_in && t.strstart === t.block_start ? 2 : (n = t.window_size - t.strstart, t.strm.avail_in > n && t.block_start >= t.w_size && (t.block_start -= t.w_size, t.strstart -= t.w_size, t.window.set(t.window.subarray(t.w_size, t.w_size + t.strstart), 0), t.matches < 2 && t.matches++, n += t.w_size, t.insert > t.strstart && (t.insert = t.strstart)), n > t.strm.avail_in && (n = t.strm.avail_in), n && (Rt(t.strm, t.window, t.strstart, n), t.strstart += n, t.insert += n > t.w_size - t.insert ? t.w_size - t.insert : n), t.high_water < t.strstart && (t.high_water = t.strstart), n = t.bi_valid + 42 >> 3, n = t.pending_buf_size - n > 65535 ? 65535 : t.pending_buf_size - n, s = n > t.w_size ? t.w_size : n, i = t.strstart - t.block_start, (i >= s || (i || e === V) && e !== q && 0 === t.strm.avail_in && i <= n) && (a = i > n ? n : i, r = e === V && 0 === t.strm.avail_in && a === i ? 1 : 0, Y(t, t.block_start, a, r), t.block_start += a, xt(t.strm)), r ? 3 : 1); }, Dt = (t, e) => { let a, i; for (;;) {
                    if (t.lookahead < ut) {
                        if (Ut(t), t.lookahead < ut && e === q)
                            return 1;
                        if (0 === t.lookahead)
                            break;
                    }
                    if (a = 0, t.lookahead >= 3 && (t.ins_h = yt(t, t.ins_h, t.window[t.strstart + 3 - 1]), a = t.prev[t.strstart & t.w_mask] = t.head[t.ins_h], t.head[t.ins_h] = t.strstart), 0 !== a && t.strstart - a <= t.w_size - ut && (t.match_length = Zt(t, a)), t.match_length >= 3)
                        if (i = X(t, t.strstart - t.match_start, t.match_length - 3), t.lookahead -= t.match_length, t.match_length <= t.max_lazy_match && t.lookahead >= 3) {
                            t.match_length--;
                            do {
                                t.strstart++, t.ins_h = yt(t, t.ins_h, t.window[t.strstart + 3 - 1]), a = t.prev[t.strstart & t.w_mask] = t.head[t.ins_h], t.head[t.ins_h] = t.strstart;
                            } while (0 != --t.match_length);
                            t.strstart++;
                        }
                        else
                            t.strstart += t.match_length, t.match_length = 0, t.ins_h = t.window[t.strstart], t.ins_h = yt(t, t.ins_h, t.window[t.strstart + 1]);
                    else
                        i = X(t, 0, t.window[t.strstart]), t.lookahead--, t.strstart++;
                    if (i && (zt(t, !1), 0 === t.strm.avail_out))
                        return 1;
                } return t.insert = t.strstart < 2 ? t.strstart : 2, e === V ? (zt(t, !0), 0 === t.strm.avail_out ? 3 : 4) : t.sym_next && (zt(t, !1), 0 === t.strm.avail_out) ? 1 : 2; }, Tt = (t, e) => { let a, i, n; for (;;) {
                    if (t.lookahead < ut) {
                        if (Ut(t), t.lookahead < ut && e === q)
                            return 1;
                        if (0 === t.lookahead)
                            break;
                    }
                    if (a = 0, t.lookahead >= 3 && (t.ins_h = yt(t, t.ins_h, t.window[t.strstart + 3 - 1]), a = t.prev[t.strstart & t.w_mask] = t.head[t.ins_h], t.head[t.ins_h] = t.strstart), t.prev_length = t.match_length, t.prev_match = t.match_start, t.match_length = 2, 0 !== a && t.prev_length < t.max_lazy_match && t.strstart - a <= t.w_size - ut && (t.match_length = Zt(t, a), t.match_length <= 5 && (t.strategy === rt || 3 === t.match_length && t.strstart - t.match_start > 4096) && (t.match_length = 2)), t.prev_length >= 3 && t.match_length <= t.prev_length) {
                        n = t.strstart + t.lookahead - 3, i = X(t, t.strstart - 1 - t.prev_match, t.prev_length - 3), t.lookahead -= t.prev_length - 1, t.prev_length -= 2;
                        do {
                            ++t.strstart <= n && (t.ins_h = yt(t, t.ins_h, t.window[t.strstart + 3 - 1]), a = t.prev[t.strstart & t.w_mask] = t.head[t.ins_h], t.head[t.ins_h] = t.strstart);
                        } while (0 != --t.prev_length);
                        if (t.match_available = 0, t.match_length = 2, t.strstart++, i && (zt(t, !1), 0 === t.strm.avail_out))
                            return 1;
                    }
                    else if (t.match_available) {
                        if (i = X(t, 0, t.window[t.strstart - 1]), i && zt(t, !1), t.strstart++, t.lookahead--, 0 === t.strm.avail_out)
                            return 1;
                    }
                    else
                        t.match_available = 1, t.strstart++, t.lookahead--;
                } return t.match_available && (i = X(t, 0, t.window[t.strstart - 1]), t.match_available = 0), t.insert = t.strstart < 2 ? t.strstart : 2, e === V ? (zt(t, !0), 0 === t.strm.avail_out ? 3 : 4) : t.sym_next && (zt(t, !1), 0 === t.strm.avail_out) ? 1 : 2; };
                function Ot(t, e, a, i, n) { this.good_length = t, this.max_lazy = e, this.nice_length = a, this.max_chain = i, this.func = n; }
                const It = [new Ot(0, 0, 0, 0, St), new Ot(4, 4, 8, 4, Dt), new Ot(4, 5, 16, 8, Dt), new Ot(4, 6, 32, 32, Dt), new Ot(4, 4, 16, 16, Tt), new Ot(8, 16, 32, 32, Tt), new Ot(8, 16, 128, 128, Tt), new Ot(8, 32, 128, 256, Tt), new Ot(32, 128, 258, 1024, Tt), new Ot(32, 258, 258, 4096, Tt)];
                function Ft() { this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = ft, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new Uint16Array(1146), this.dyn_dtree = new Uint16Array(122), this.bl_tree = new Uint16Array(78), kt(this.dyn_ltree), kt(this.dyn_dtree), kt(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new Uint16Array(16), this.heap = new Uint16Array(573), kt(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new Uint16Array(573), kt(this.depth), this.sym_buf = 0, this.lit_bufsize = 0, this.sym_next = 0, this.sym_end = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0; }
                const Lt = t => { if (!t)
                    return 1; const e = t.state; return !e || e.strm !== t || e.status !== wt && 57 !== e.status && 69 !== e.status && 73 !== e.status && 91 !== e.status && 103 !== e.status && e.status !== mt && e.status !== bt ? 1 : 0; }, Nt = t => { if (Lt(t))
                    return gt(t, at); t.total_in = t.total_out = 0, t.data_type = _t; const e = t.state; return e.pending = 0, e.pending_out = 0, e.wrap < 0 && (e.wrap = -e.wrap), e.status = 2 === e.wrap ? 57 : e.wrap ? wt : mt, t.adler = 2 === e.wrap ? 0 : 1, e.last_flush = -2, P(e), tt; }, Bt = t => { const e = Nt(t); var a; return e === tt && ((a = t.state).window_size = 2 * a.w_size, kt(a.head), a.max_lazy_match = It[a.level].max_lazy, a.good_match = It[a.level].good_length, a.nice_match = It[a.level].nice_length, a.max_chain_length = It[a.level].max_chain, a.strstart = 0, a.block_start = 0, a.lookahead = 0, a.insert = 0, a.match_length = a.prev_length = 2, a.match_available = 0, a.ins_h = 0), e; }, Ct = (t, e, a, i, n, s) => { if (!t)
                    return at; let r = 1; if (e === st && (e = 6), i < 0 ? (r = 0, i = -i) : i > 15 && (r = 2, i -= 16), n < 1 || n > 9 || a !== ft || i < 8 || i > 15 || e < 0 || e > 9 || s < 0 || s > ht || 8 === i && 1 !== r)
                    return gt(t, at); 8 === i && (i = 9); const o = new Ft; return t.state = o, o.strm = t, o.status = wt, o.wrap = r, o.gzhead = null, o.w_bits = i, o.w_size = 1 << o.w_bits, o.w_mask = o.w_size - 1, o.hash_bits = n + 7, o.hash_size = 1 << o.hash_bits, o.hash_mask = o.hash_size - 1, o.hash_shift = ~~((o.hash_bits + 3 - 1) / 3), o.window = new Uint8Array(2 * o.w_size), o.head = new Uint16Array(o.hash_size), o.prev = new Uint16Array(o.w_size), o.lit_bufsize = 1 << n + 6, o.pending_buf_size = 4 * o.lit_bufsize, o.pending_buf = new Uint8Array(o.pending_buf_size), o.sym_buf = o.lit_bufsize, o.sym_end = 3 * (o.lit_bufsize - 1), o.level = e, o.strategy = s, o.method = a, Bt(t); };
                var Mt = { deflateInit: (t, e) => Ct(t, e, ft, 15, 8, dt), deflateInit2: Ct, deflateReset: Bt, deflateResetKeep: Nt, deflateSetHeader: (t, e) => Lt(t) || 2 !== t.state.wrap ? at : (t.state.gzhead = e, tt), deflate: (t, e) => { if (Lt(t) || e > $ || e < 0)
                        return t ? gt(t, at) : at; const a = t.state; if (!t.output || 0 !== t.avail_in && !t.input || a.status === bt && e !== V)
                        return gt(t, 0 === t.avail_out ? nt : at); const i = a.last_flush; if (a.last_flush = e, 0 !== a.pending) {
                        if (xt(t), 0 === t.avail_out)
                            return a.last_flush = -1, tt;
                    }
                    else if (0 === t.avail_in && pt(e) <= pt(i) && e !== V)
                        return gt(t, nt); if (a.status === bt && 0 !== t.avail_in)
                        return gt(t, nt); if (a.status === wt && 0 === a.wrap && (a.status = mt), a.status === wt) {
                        let e = ft + (a.w_bits - 8 << 4) << 8, i = -1;
                        if (i = a.strategy >= ot || a.level < 2 ? 0 : a.level < 6 ? 1 : 6 === a.level ? 2 : 3, e |= i << 6, 0 !== a.strstart && (e |= 32), e += 31 - e % 31, Et(a, e), 0 !== a.strstart && (Et(a, t.adler >>> 16), Et(a, 65535 & t.adler)), t.adler = 1, a.status = mt, xt(t), 0 !== a.pending)
                            return a.last_flush = -1, tt;
                    } if (57 === a.status)
                        if (t.adler = 0, At(a, 31), At(a, 139), At(a, 8), a.gzhead)
                            At(a, (a.gzhead.text ? 1 : 0) + (a.gzhead.hcrc ? 2 : 0) + (a.gzhead.extra ? 4 : 0) + (a.gzhead.name ? 8 : 0) + (a.gzhead.comment ? 16 : 0)), At(a, 255 & a.gzhead.time), At(a, a.gzhead.time >> 8 & 255), At(a, a.gzhead.time >> 16 & 255), At(a, a.gzhead.time >> 24 & 255), At(a, 9 === a.level ? 2 : a.strategy >= ot || a.level < 2 ? 4 : 0), At(a, 255 & a.gzhead.os), a.gzhead.extra && a.gzhead.extra.length && (At(a, 255 & a.gzhead.extra.length), At(a, a.gzhead.extra.length >> 8 & 255)), a.gzhead.hcrc && (t.adler = H(t.adler, a.pending_buf, a.pending, 0)), a.gzindex = 0, a.status = 69;
                        else if (At(a, 0), At(a, 0), At(a, 0), At(a, 0), At(a, 0), At(a, 9 === a.level ? 2 : a.strategy >= ot || a.level < 2 ? 4 : 0), At(a, 3), a.status = mt, xt(t), 0 !== a.pending)
                            return a.last_flush = -1, tt; if (69 === a.status) {
                        if (a.gzhead.extra) {
                            let e = a.pending, i = (65535 & a.gzhead.extra.length) - a.gzindex;
                            for (; a.pending + i > a.pending_buf_size;) {
                                let n = a.pending_buf_size - a.pending;
                                if (a.pending_buf.set(a.gzhead.extra.subarray(a.gzindex, a.gzindex + n), a.pending), a.pending = a.pending_buf_size, a.gzhead.hcrc && a.pending > e && (t.adler = H(t.adler, a.pending_buf, a.pending - e, e)), a.gzindex += n, xt(t), 0 !== a.pending)
                                    return a.last_flush = -1, tt;
                                e = 0, i -= n;
                            }
                            let n = new Uint8Array(a.gzhead.extra);
                            a.pending_buf.set(n.subarray(a.gzindex, a.gzindex + i), a.pending), a.pending += i, a.gzhead.hcrc && a.pending > e && (t.adler = H(t.adler, a.pending_buf, a.pending - e, e)), a.gzindex = 0;
                        }
                        a.status = 73;
                    } if (73 === a.status) {
                        if (a.gzhead.name) {
                            let e, i = a.pending;
                            do {
                                if (a.pending === a.pending_buf_size) {
                                    if (a.gzhead.hcrc && a.pending > i && (t.adler = H(t.adler, a.pending_buf, a.pending - i, i)), xt(t), 0 !== a.pending)
                                        return a.last_flush = -1, tt;
                                    i = 0;
                                }
                                e = a.gzindex < a.gzhead.name.length ? 255 & a.gzhead.name.charCodeAt(a.gzindex++) : 0, At(a, e);
                            } while (0 !== e);
                            a.gzhead.hcrc && a.pending > i && (t.adler = H(t.adler, a.pending_buf, a.pending - i, i)), a.gzindex = 0;
                        }
                        a.status = 91;
                    } if (91 === a.status) {
                        if (a.gzhead.comment) {
                            let e, i = a.pending;
                            do {
                                if (a.pending === a.pending_buf_size) {
                                    if (a.gzhead.hcrc && a.pending > i && (t.adler = H(t.adler, a.pending_buf, a.pending - i, i)), xt(t), 0 !== a.pending)
                                        return a.last_flush = -1, tt;
                                    i = 0;
                                }
                                e = a.gzindex < a.gzhead.comment.length ? 255 & a.gzhead.comment.charCodeAt(a.gzindex++) : 0, At(a, e);
                            } while (0 !== e);
                            a.gzhead.hcrc && a.pending > i && (t.adler = H(t.adler, a.pending_buf, a.pending - i, i));
                        }
                        a.status = 103;
                    } if (103 === a.status) {
                        if (a.gzhead.hcrc) {
                            if (a.pending + 2 > a.pending_buf_size && (xt(t), 0 !== a.pending))
                                return a.last_flush = -1, tt;
                            At(a, 255 & t.adler), At(a, t.adler >> 8 & 255), t.adler = 0;
                        }
                        if (a.status = mt, xt(t), 0 !== a.pending)
                            return a.last_flush = -1, tt;
                    } if (0 !== t.avail_in || 0 !== a.lookahead || e !== q && a.status !== bt) {
                        let i = 0 === a.level ? St(a, e) : a.strategy === ot ? ((t, e) => { let a; for (;;) {
                            if (0 === t.lookahead && (Ut(t), 0 === t.lookahead)) {
                                if (e === q)
                                    return 1;
                                break;
                            }
                            if (t.match_length = 0, a = X(t, 0, t.window[t.strstart]), t.lookahead--, t.strstart++, a && (zt(t, !1), 0 === t.strm.avail_out))
                                return 1;
                        } return t.insert = 0, e === V ? (zt(t, !0), 0 === t.strm.avail_out ? 3 : 4) : t.sym_next && (zt(t, !1), 0 === t.strm.avail_out) ? 1 : 2; })(a, e) : a.strategy === lt ? ((t, e) => { let a, i, n, s; const r = t.window; for (;;) {
                            if (t.lookahead <= ct) {
                                if (Ut(t), t.lookahead <= ct && e === q)
                                    return 1;
                                if (0 === t.lookahead)
                                    break;
                            }
                            if (t.match_length = 0, t.lookahead >= 3 && t.strstart > 0 && (n = t.strstart - 1, i = r[n], i === r[++n] && i === r[++n] && i === r[++n])) {
                                s = t.strstart + ct;
                                do { } while (i === r[++n] && i === r[++n] && i === r[++n] && i === r[++n] && i === r[++n] && i === r[++n] && i === r[++n] && i === r[++n] && n < s);
                                t.match_length = ct - (s - n), t.match_length > t.lookahead && (t.match_length = t.lookahead);
                            }
                            if (t.match_length >= 3 ? (a = X(t, 1, t.match_length - 3), t.lookahead -= t.match_length, t.strstart += t.match_length, t.match_length = 0) : (a = X(t, 0, t.window[t.strstart]), t.lookahead--, t.strstart++), a && (zt(t, !1), 0 === t.strm.avail_out))
                                return 1;
                        } return t.insert = 0, e === V ? (zt(t, !0), 0 === t.strm.avail_out ? 3 : 4) : t.sym_next && (zt(t, !1), 0 === t.strm.avail_out) ? 1 : 2; })(a, e) : It[a.level].func(a, e);
                        if (3 !== i && 4 !== i || (a.status = bt), 1 === i || 3 === i)
                            return 0 === t.avail_out && (a.last_flush = -1), tt;
                        if (2 === i && (e === J ? W(a) : e !== $ && (Y(a, 0, 0, !1), e === Q && (kt(a.head), 0 === a.lookahead && (a.strstart = 0, a.block_start = 0, a.insert = 0))), xt(t), 0 === t.avail_out))
                            return a.last_flush = -1, tt;
                    } return e !== V ? tt : a.wrap <= 0 ? et : (2 === a.wrap ? (At(a, 255 & t.adler), At(a, t.adler >> 8 & 255), At(a, t.adler >> 16 & 255), At(a, t.adler >> 24 & 255), At(a, 255 & t.total_in), At(a, t.total_in >> 8 & 255), At(a, t.total_in >> 16 & 255), At(a, t.total_in >> 24 & 255)) : (Et(a, t.adler >>> 16), Et(a, 65535 & t.adler)), xt(t), a.wrap > 0 && (a.wrap = -a.wrap), 0 !== a.pending ? tt : et); }, deflateEnd: t => { if (Lt(t))
                        return at; const e = t.state.status; return t.state = null, e === mt ? gt(t, it) : tt; }, deflateSetDictionary: (t, e) => { let a = e.length; if (Lt(t))
                        return at; const i = t.state, n = i.wrap; if (2 === n || 1 === n && i.status !== wt || i.lookahead)
                        return at; if (1 === n && (t.adler = C(t.adler, e, a, 0)), i.wrap = 0, a >= i.w_size) {
                        0 === n && (kt(i.head), i.strstart = 0, i.block_start = 0, i.insert = 0);
                        let t = new Uint8Array(i.w_size);
                        t.set(e.subarray(a - i.w_size, a), 0), e = t, a = i.w_size;
                    } const s = t.avail_in, r = t.next_in, o = t.input; for (t.avail_in = a, t.next_in = 0, t.input = e, Ut(i); i.lookahead >= 3;) {
                        let t = i.strstart, e = i.lookahead - 2;
                        do {
                            i.ins_h = yt(i, i.ins_h, i.window[t + 3 - 1]), i.prev[t & i.w_mask] = i.head[i.ins_h], i.head[i.ins_h] = t, t++;
                        } while (--e);
                        i.strstart = t, i.lookahead = 2, Ut(i);
                    } return i.strstart += i.lookahead, i.block_start = i.strstart, i.insert = i.lookahead, i.lookahead = 0, i.match_length = i.prev_length = 2, i.match_available = 0, t.next_in = r, t.input = o, t.avail_in = s, i.wrap = n, tt; }, deflateInfo: "pako deflate (from Nodeca project)" };
                const Ht = (t, e) => Object.prototype.hasOwnProperty.call(t, e);
                var jt = function (t) { const e = Array.prototype.slice.call(arguments, 1); for (; e.length;) {
                    const a = e.shift();
                    if (a) {
                        if ("object" != typeof a)
                            throw new TypeError(a + "must be non-object");
                        for (const e in a)
                            Ht(a, e) && (t[e] = a[e]);
                    }
                } return t; }, Kt = t => { let e = 0; for (let a = 0, i = t.length; a < i; a++)
                    e += t[a].length; const a = new Uint8Array(e); for (let e = 0, i = 0, n = t.length; e < n; e++) {
                    let n = t[e];
                    a.set(n, i), i += n.length;
                } return a; };
                let Pt = !0;
                try {
                    String.fromCharCode.apply(null, new Uint8Array(1));
                }
                catch (t) {
                    Pt = !1;
                }
                const Yt = new Uint8Array(256);
                for (let t = 0; t < 256; t++)
                    Yt[t] = t >= 252 ? 6 : t >= 248 ? 5 : t >= 240 ? 4 : t >= 224 ? 3 : t >= 192 ? 2 : 1;
                Yt[254] = Yt[254] = 1;
                var Gt = t => { if ("function" == typeof TextEncoder && TextEncoder.prototype.encode)
                    return (new TextEncoder).encode(t); let e, a, i, n, s, r = t.length, o = 0; for (n = 0; n < r; n++)
                    a = t.charCodeAt(n), 55296 == (64512 & a) && n + 1 < r && (i = t.charCodeAt(n + 1), 56320 == (64512 & i) && (a = 65536 + (a - 55296 << 10) + (i - 56320), n++)), o += a < 128 ? 1 : a < 2048 ? 2 : a < 65536 ? 3 : 4; for (e = new Uint8Array(o), s = 0, n = 0; s < o; n++)
                    a = t.charCodeAt(n), 55296 == (64512 & a) && n + 1 < r && (i = t.charCodeAt(n + 1), 56320 == (64512 & i) && (a = 65536 + (a - 55296 << 10) + (i - 56320), n++)), a < 128 ? e[s++] = a : a < 2048 ? (e[s++] = 192 | a >>> 6, e[s++] = 128 | 63 & a) : a < 65536 ? (e[s++] = 224 | a >>> 12, e[s++] = 128 | a >>> 6 & 63, e[s++] = 128 | 63 & a) : (e[s++] = 240 | a >>> 18, e[s++] = 128 | a >>> 12 & 63, e[s++] = 128 | a >>> 6 & 63, e[s++] = 128 | 63 & a); return e; }, Xt = (t, e) => { const a = e || t.length; if ("function" == typeof TextDecoder && TextDecoder.prototype.decode)
                    return (new TextDecoder).decode(t.subarray(0, e)); let i, n; const s = new Array(2 * a); for (n = 0, i = 0; i < a;) {
                    let e = t[i++];
                    if (e < 128) {
                        s[n++] = e;
                        continue;
                    }
                    let r = Yt[e];
                    if (r > 4)
                        s[n++] = 65533, i += r - 1;
                    else {
                        for (e &= 2 === r ? 31 : 3 === r ? 15 : 7; r > 1 && i < a;)
                            e = e << 6 | 63 & t[i++], r--;
                        r > 1 ? s[n++] = 65533 : e < 65536 ? s[n++] = e : (e -= 65536, s[n++] = 55296 | e >> 10 & 1023, s[n++] = 56320 | 1023 & e);
                    }
                } return ((t, e) => { if (e < 65534 && t.subarray && Pt)
                    return String.fromCharCode.apply(null, t.length === e ? t : t.subarray(0, e)); let a = ""; for (let i = 0; i < e; i++)
                    a += String.fromCharCode(t[i]); return a; })(s, n); }, Wt = (t, e) => { (e = e || t.length) > t.length && (e = t.length); let a = e - 1; for (; a >= 0 && 128 == (192 & t[a]);)
                    a--; return a < 0 || 0 === a ? e : a + Yt[t[a]] > e ? a : e; };
                var qt = function () { this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0; };
                const Jt = Object.prototype.toString, { Z_NO_FLUSH: Qt, Z_SYNC_FLUSH: Vt, Z_FULL_FLUSH: $t, Z_FINISH: te, Z_OK: ee, Z_STREAM_END: ae, Z_DEFAULT_COMPRESSION: ie, Z_DEFAULT_STRATEGY: ne, Z_DEFLATED: se } = K;
                function re(t) { this.options = jt({ level: ie, method: se, chunkSize: 16384, windowBits: 15, memLevel: 8, strategy: ne }, t || {}); let e = this.options; e.raw && e.windowBits > 0 ? e.windowBits = -e.windowBits : e.gzip && e.windowBits > 0 && e.windowBits < 16 && (e.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new qt, this.strm.avail_out = 0; let a = Mt.deflateInit2(this.strm, e.level, e.method, e.windowBits, e.memLevel, e.strategy); if (a !== ee)
                    throw new Error(j[a]); if (e.header && Mt.deflateSetHeader(this.strm, e.header), e.dictionary) {
                    let t;
                    if (t = "string" == typeof e.dictionary ? Gt(e.dictionary) : "[object ArrayBuffer]" === Jt.call(e.dictionary) ? new Uint8Array(e.dictionary) : e.dictionary, a = Mt.deflateSetDictionary(this.strm, t), a !== ee)
                        throw new Error(j[a]);
                    this._dict_set = !0;
                } }
                function oe(t, e) { const a = new re(e); if (a.push(t, !0), a.err)
                    throw a.msg || j[a.err]; return a.result; }
                re.prototype.push = function (t, e) { const a = this.strm, i = this.options.chunkSize; let n, s; if (this.ended)
                    return !1; for (s = e === ~~e ? e : !0 === e ? te : Qt, "string" == typeof t ? a.input = Gt(t) : "[object ArrayBuffer]" === Jt.call(t) ? a.input = new Uint8Array(t) : a.input = t, a.next_in = 0, a.avail_in = a.input.length;;)
                    if (0 === a.avail_out && (a.output = new Uint8Array(i), a.next_out = 0, a.avail_out = i), (s === Vt || s === $t) && a.avail_out <= 6)
                        this.onData(a.output.subarray(0, a.next_out)), a.avail_out = 0;
                    else {
                        if (n = Mt.deflate(a, s), n === ae)
                            return a.next_out > 0 && this.onData(a.output.subarray(0, a.next_out)), n = Mt.deflateEnd(this.strm), this.onEnd(n), this.ended = !0, n === ee;
                        if (0 !== a.avail_out) {
                            if (s > 0 && a.next_out > 0)
                                this.onData(a.output.subarray(0, a.next_out)), a.avail_out = 0;
                            else if (0 === a.avail_in)
                                break;
                        }
                        else
                            this.onData(a.output);
                    } return !0; }, re.prototype.onData = function (t) { this.chunks.push(t); }, re.prototype.onEnd = function (t) { t === ee && (this.result = Kt(this.chunks)), this.chunks = [], this.err = t, this.msg = this.strm.msg; };
                var le = { Deflate: re, deflate: oe, deflateRaw: function (t, e) { return (e = e || {}).raw = !0, oe(t, e); }, gzip: function (t, e) { return (e = e || {}).gzip = !0, oe(t, e); }, constants: K };
                const he = 16209;
                var de = function (t, e) { let a, i, n, s, r, o, l, h, d, _, f, c, u, w, m, b, g, p, k, v, y, x, z, A; const E = t.state; a = t.next_in, z = t.input, i = a + (t.avail_in - 5), n = t.next_out, A = t.output, s = n - (e - t.avail_out), r = n + (t.avail_out - 257), o = E.dmax, l = E.wsize, h = E.whave, d = E.wnext, _ = E.window, f = E.hold, c = E.bits, u = E.lencode, w = E.distcode, m = (1 << E.lenbits) - 1, b = (1 << E.distbits) - 1; t: do {
                    c < 15 && (f += z[a++] << c, c += 8, f += z[a++] << c, c += 8), g = u[f & m];
                    e: for (;;) {
                        if (p = g >>> 24, f >>>= p, c -= p, p = g >>> 16 & 255, 0 === p)
                            A[n++] = 65535 & g;
                        else {
                            if (!(16 & p)) {
                                if (0 == (64 & p)) {
                                    g = u[(65535 & g) + (f & (1 << p) - 1)];
                                    continue e;
                                }
                                if (32 & p) {
                                    E.mode = 16191;
                                    break t;
                                }
                                t.msg = "invalid literal/length code", E.mode = he;
                                break t;
                            }
                            k = 65535 & g, p &= 15, p && (c < p && (f += z[a++] << c, c += 8), k += f & (1 << p) - 1, f >>>= p, c -= p), c < 15 && (f += z[a++] << c, c += 8, f += z[a++] << c, c += 8), g = w[f & b];
                            a: for (;;) {
                                if (p = g >>> 24, f >>>= p, c -= p, p = g >>> 16 & 255, !(16 & p)) {
                                    if (0 == (64 & p)) {
                                        g = w[(65535 & g) + (f & (1 << p) - 1)];
                                        continue a;
                                    }
                                    t.msg = "invalid distance code", E.mode = he;
                                    break t;
                                }
                                if (v = 65535 & g, p &= 15, c < p && (f += z[a++] << c, c += 8, c < p && (f += z[a++] << c, c += 8)), v += f & (1 << p) - 1, v > o) {
                                    t.msg = "invalid distance too far back", E.mode = he;
                                    break t;
                                }
                                if (f >>>= p, c -= p, p = n - s, v > p) {
                                    if (p = v - p, p > h && E.sane) {
                                        t.msg = "invalid distance too far back", E.mode = he;
                                        break t;
                                    }
                                    if (y = 0, x = _, 0 === d) {
                                        if (y += l - p, p < k) {
                                            k -= p;
                                            do {
                                                A[n++] = _[y++];
                                            } while (--p);
                                            y = n - v, x = A;
                                        }
                                    }
                                    else if (d < p) {
                                        if (y += l + d - p, p -= d, p < k) {
                                            k -= p;
                                            do {
                                                A[n++] = _[y++];
                                            } while (--p);
                                            if (y = 0, d < k) {
                                                p = d, k -= p;
                                                do {
                                                    A[n++] = _[y++];
                                                } while (--p);
                                                y = n - v, x = A;
                                            }
                                        }
                                    }
                                    else if (y += d - p, p < k) {
                                        k -= p;
                                        do {
                                            A[n++] = _[y++];
                                        } while (--p);
                                        y = n - v, x = A;
                                    }
                                    for (; k > 2;)
                                        A[n++] = x[y++], A[n++] = x[y++], A[n++] = x[y++], k -= 3;
                                    k && (A[n++] = x[y++], k > 1 && (A[n++] = x[y++]));
                                }
                                else {
                                    y = n - v;
                                    do {
                                        A[n++] = A[y++], A[n++] = A[y++], A[n++] = A[y++], k -= 3;
                                    } while (k > 2);
                                    k && (A[n++] = A[y++], k > 1 && (A[n++] = A[y++]));
                                }
                                break;
                            }
                        }
                        break;
                    }
                } while (a < i && n < r); k = c >> 3, a -= k, c -= k << 3, f &= (1 << c) - 1, t.next_in = a, t.next_out = n, t.avail_in = a < i ? i - a + 5 : 5 - (a - i), t.avail_out = n < r ? r - n + 257 : 257 - (n - r), E.hold = f, E.bits = c; };
                const _e = 15, fe = new Uint16Array([3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0]), ce = new Uint8Array([16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78]), ue = new Uint16Array([1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0]), we = new Uint8Array([16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64]);
                var me = (t, e, a, i, n, s, r, o) => { const l = o.bits; let h, d, _, f, c, u, w = 0, m = 0, b = 0, g = 0, p = 0, k = 0, v = 0, y = 0, x = 0, z = 0, A = null; const E = new Uint16Array(16), R = new Uint16Array(16); let Z, U, S, D = null; for (w = 0; w <= _e; w++)
                    E[w] = 0; for (m = 0; m < i; m++)
                    E[e[a + m]]++; for (p = l, g = _e; g >= 1 && 0 === E[g]; g--)
                    ; if (p > g && (p = g), 0 === g)
                    return n[s++] = 20971520, n[s++] = 20971520, o.bits = 1, 0; for (b = 1; b < g && 0 === E[b]; b++)
                    ; for (p < b && (p = b), y = 1, w = 1; w <= _e; w++)
                    if (y <<= 1, y -= E[w], y < 0)
                        return -1; if (y > 0 && (0 === t || 1 !== g))
                    return -1; for (R[1] = 0, w = 1; w < _e; w++)
                    R[w + 1] = R[w] + E[w]; for (m = 0; m < i; m++)
                    0 !== e[a + m] && (r[R[e[a + m]]++] = m); if (0 === t ? (A = D = r, u = 20) : 1 === t ? (A = fe, D = ce, u = 257) : (A = ue, D = we, u = 0), z = 0, m = 0, w = b, c = s, k = p, v = 0, _ = -1, x = 1 << p, f = x - 1, 1 === t && x > 852 || 2 === t && x > 592)
                    return 1; for (;;) {
                    Z = w - v, r[m] + 1 < u ? (U = 0, S = r[m]) : r[m] >= u ? (U = D[r[m] - u], S = A[r[m] - u]) : (U = 96, S = 0), h = 1 << w - v, d = 1 << k, b = d;
                    do {
                        d -= h, n[c + (z >> v) + d] = Z << 24 | U << 16 | S | 0;
                    } while (0 !== d);
                    for (h = 1 << w - 1; z & h;)
                        h >>= 1;
                    if (0 !== h ? (z &= h - 1, z += h) : z = 0, m++, 0 == --E[w]) {
                        if (w === g)
                            break;
                        w = e[a + r[m]];
                    }
                    if (w > p && (z & f) !== _) {
                        for (0 === v && (v = p), c += b, k = w - v, y = 1 << k; k + v < g && (y -= E[k + v], !(y <= 0));)
                            k++, y <<= 1;
                        if (x += 1 << k, 1 === t && x > 852 || 2 === t && x > 592)
                            return 1;
                        _ = z & f, n[_] = p << 24 | k << 16 | c - s | 0;
                    }
                } return 0 !== z && (n[c + z] = w - v << 24 | 64 << 16 | 0), o.bits = p, 0; };
                const { Z_FINISH: be, Z_BLOCK: ge, Z_TREES: pe, Z_OK: ke, Z_STREAM_END: ve, Z_NEED_DICT: ye, Z_STREAM_ERROR: xe, Z_DATA_ERROR: ze, Z_MEM_ERROR: Ae, Z_BUF_ERROR: Ee, Z_DEFLATED: Re } = K, Ze = 16180, Ue = 16190, Se = 16191, De = 16192, Te = 16194, Oe = 16199, Ie = 16200, Fe = 16206, Le = 16209, Ne = t => (t >>> 24 & 255) + (t >>> 8 & 65280) + ((65280 & t) << 8) + ((255 & t) << 24);
                function Be() { this.strm = null, this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new Uint16Array(320), this.work = new Uint16Array(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0; }
                const Ce = t => { if (!t)
                    return 1; const e = t.state; return !e || e.strm !== t || e.mode < Ze || e.mode > 16211 ? 1 : 0; }, Me = t => { if (Ce(t))
                    return xe; const e = t.state; return t.total_in = t.total_out = e.total = 0, t.msg = "", e.wrap && (t.adler = 1 & e.wrap), e.mode = Ze, e.last = 0, e.havedict = 0, e.flags = -1, e.dmax = 32768, e.head = null, e.hold = 0, e.bits = 0, e.lencode = e.lendyn = new Int32Array(852), e.distcode = e.distdyn = new Int32Array(592), e.sane = 1, e.back = -1, ke; }, He = t => { if (Ce(t))
                    return xe; const e = t.state; return e.wsize = 0, e.whave = 0, e.wnext = 0, Me(t); }, je = (t, e) => { let a; if (Ce(t))
                    return xe; const i = t.state; return e < 0 ? (a = 0, e = -e) : (a = 5 + (e >> 4), e < 48 && (e &= 15)), e && (e < 8 || e > 15) ? xe : (null !== i.window && i.wbits !== e && (i.window = null), i.wrap = a, i.wbits = e, He(t)); }, Ke = (t, e) => { if (!t)
                    return xe; const a = new Be; t.state = a, a.strm = t, a.window = null, a.mode = Ze; const i = je(t, e); return i !== ke && (t.state = null), i; };
                let Pe, Ye, Ge = !0;
                const Xe = t => { if (Ge) {
                    Pe = new Int32Array(512), Ye = new Int32Array(32);
                    let e = 0;
                    for (; e < 144;)
                        t.lens[e++] = 8;
                    for (; e < 256;)
                        t.lens[e++] = 9;
                    for (; e < 280;)
                        t.lens[e++] = 7;
                    for (; e < 288;)
                        t.lens[e++] = 8;
                    for (me(1, t.lens, 0, 288, Pe, 0, t.work, { bits: 9 }), e = 0; e < 32;)
                        t.lens[e++] = 5;
                    me(2, t.lens, 0, 32, Ye, 0, t.work, { bits: 5 }), Ge = !1;
                } t.lencode = Pe, t.lenbits = 9, t.distcode = Ye, t.distbits = 5; }, We = (t, e, a, i) => { let n; const s = t.state; return null === s.window && (s.wsize = 1 << s.wbits, s.wnext = 0, s.whave = 0, s.window = new Uint8Array(s.wsize)), i >= s.wsize ? (s.window.set(e.subarray(a - s.wsize, a), 0), s.wnext = 0, s.whave = s.wsize) : (n = s.wsize - s.wnext, n > i && (n = i), s.window.set(e.subarray(a - i, a - i + n), s.wnext), (i -= n) ? (s.window.set(e.subarray(a - i, a), 0), s.wnext = i, s.whave = s.wsize) : (s.wnext += n, s.wnext === s.wsize && (s.wnext = 0), s.whave < s.wsize && (s.whave += n))), 0; };
                var qe = { inflateReset: He, inflateReset2: je, inflateResetKeep: Me, inflateInit: t => Ke(t, 15), inflateInit2: Ke, inflate: (t, e) => { let a, i, n, s, r, o, l, h, d, _, f, c, u, w, m, b, g, p, k, v, y, x, z = 0; const A = new Uint8Array(4); let E, R; const Z = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]); if (Ce(t) || !t.output || !t.input && 0 !== t.avail_in)
                        return xe; a = t.state, a.mode === Se && (a.mode = De), r = t.next_out, n = t.output, l = t.avail_out, s = t.next_in, i = t.input, o = t.avail_in, h = a.hold, d = a.bits, _ = o, f = l, x = ke; t: for (;;)
                        switch (a.mode) {
                            case Ze:
                                if (0 === a.wrap) {
                                    a.mode = De;
                                    break;
                                }
                                for (; d < 16;) {
                                    if (0 === o)
                                        break t;
                                    o--, h += i[s++] << d, d += 8;
                                }
                                if (2 & a.wrap && 35615 === h) {
                                    0 === a.wbits && (a.wbits = 15), a.check = 0, A[0] = 255 & h, A[1] = h >>> 8 & 255, a.check = H(a.check, A, 2, 0), h = 0, d = 0, a.mode = 16181;
                                    break;
                                }
                                if (a.head && (a.head.done = !1), !(1 & a.wrap) || (((255 & h) << 8) + (h >> 8)) % 31) {
                                    t.msg = "incorrect header check", a.mode = Le;
                                    break;
                                }
                                if ((15 & h) !== Re) {
                                    t.msg = "unknown compression method", a.mode = Le;
                                    break;
                                }
                                if (h >>>= 4, d -= 4, y = 8 + (15 & h), 0 === a.wbits && (a.wbits = y), y > 15 || y > a.wbits) {
                                    t.msg = "invalid window size", a.mode = Le;
                                    break;
                                }
                                a.dmax = 1 << a.wbits, a.flags = 0, t.adler = a.check = 1, a.mode = 512 & h ? 16189 : Se, h = 0, d = 0;
                                break;
                            case 16181:
                                for (; d < 16;) {
                                    if (0 === o)
                                        break t;
                                    o--, h += i[s++] << d, d += 8;
                                }
                                if (a.flags = h, (255 & a.flags) !== Re) {
                                    t.msg = "unknown compression method", a.mode = Le;
                                    break;
                                }
                                if (57344 & a.flags) {
                                    t.msg = "unknown header flags set", a.mode = Le;
                                    break;
                                }
                                a.head && (a.head.text = h >> 8 & 1), 512 & a.flags && 4 & a.wrap && (A[0] = 255 & h, A[1] = h >>> 8 & 255, a.check = H(a.check, A, 2, 0)), h = 0, d = 0, a.mode = 16182;
                            case 16182:
                                for (; d < 32;) {
                                    if (0 === o)
                                        break t;
                                    o--, h += i[s++] << d, d += 8;
                                }
                                a.head && (a.head.time = h), 512 & a.flags && 4 & a.wrap && (A[0] = 255 & h, A[1] = h >>> 8 & 255, A[2] = h >>> 16 & 255, A[3] = h >>> 24 & 255, a.check = H(a.check, A, 4, 0)), h = 0, d = 0, a.mode = 16183;
                            case 16183:
                                for (; d < 16;) {
                                    if (0 === o)
                                        break t;
                                    o--, h += i[s++] << d, d += 8;
                                }
                                a.head && (a.head.xflags = 255 & h, a.head.os = h >> 8), 512 & a.flags && 4 & a.wrap && (A[0] = 255 & h, A[1] = h >>> 8 & 255, a.check = H(a.check, A, 2, 0)), h = 0, d = 0, a.mode = 16184;
                            case 16184:
                                if (1024 & a.flags) {
                                    for (; d < 16;) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    a.length = h, a.head && (a.head.extra_len = h), 512 & a.flags && 4 & a.wrap && (A[0] = 255 & h, A[1] = h >>> 8 & 255, a.check = H(a.check, A, 2, 0)), h = 0, d = 0;
                                }
                                else
                                    a.head && (a.head.extra = null);
                                a.mode = 16185;
                            case 16185:
                                if (1024 & a.flags && (c = a.length, c > o && (c = o), c && (a.head && (y = a.head.extra_len - a.length, a.head.extra || (a.head.extra = new Uint8Array(a.head.extra_len)), a.head.extra.set(i.subarray(s, s + c), y)), 512 & a.flags && 4 & a.wrap && (a.check = H(a.check, i, c, s)), o -= c, s += c, a.length -= c), a.length))
                                    break t;
                                a.length = 0, a.mode = 16186;
                            case 16186:
                                if (2048 & a.flags) {
                                    if (0 === o)
                                        break t;
                                    c = 0;
                                    do {
                                        y = i[s + c++], a.head && y && a.length < 65536 && (a.head.name += String.fromCharCode(y));
                                    } while (y && c < o);
                                    if (512 & a.flags && 4 & a.wrap && (a.check = H(a.check, i, c, s)), o -= c, s += c, y)
                                        break t;
                                }
                                else
                                    a.head && (a.head.name = null);
                                a.length = 0, a.mode = 16187;
                            case 16187:
                                if (4096 & a.flags) {
                                    if (0 === o)
                                        break t;
                                    c = 0;
                                    do {
                                        y = i[s + c++], a.head && y && a.length < 65536 && (a.head.comment += String.fromCharCode(y));
                                    } while (y && c < o);
                                    if (512 & a.flags && 4 & a.wrap && (a.check = H(a.check, i, c, s)), o -= c, s += c, y)
                                        break t;
                                }
                                else
                                    a.head && (a.head.comment = null);
                                a.mode = 16188;
                            case 16188:
                                if (512 & a.flags) {
                                    for (; d < 16;) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    if (4 & a.wrap && h !== (65535 & a.check)) {
                                        t.msg = "header crc mismatch", a.mode = Le;
                                        break;
                                    }
                                    h = 0, d = 0;
                                }
                                a.head && (a.head.hcrc = a.flags >> 9 & 1, a.head.done = !0), t.adler = a.check = 0, a.mode = Se;
                                break;
                            case 16189:
                                for (; d < 32;) {
                                    if (0 === o)
                                        break t;
                                    o--, h += i[s++] << d, d += 8;
                                }
                                t.adler = a.check = Ne(h), h = 0, d = 0, a.mode = Ue;
                            case Ue:
                                if (0 === a.havedict)
                                    return t.next_out = r, t.avail_out = l, t.next_in = s, t.avail_in = o, a.hold = h, a.bits = d, ye;
                                t.adler = a.check = 1, a.mode = Se;
                            case Se: if (e === ge || e === pe)
                                break t;
                            case De:
                                if (a.last) {
                                    h >>>= 7 & d, d -= 7 & d, a.mode = Fe;
                                    break;
                                }
                                for (; d < 3;) {
                                    if (0 === o)
                                        break t;
                                    o--, h += i[s++] << d, d += 8;
                                }
                                switch (a.last = 1 & h, h >>>= 1, d -= 1, 3 & h) {
                                    case 0:
                                        a.mode = 16193;
                                        break;
                                    case 1:
                                        if (Xe(a), a.mode = Oe, e === pe) {
                                            h >>>= 2, d -= 2;
                                            break t;
                                        }
                                        break;
                                    case 2:
                                        a.mode = 16196;
                                        break;
                                    case 3: t.msg = "invalid block type", a.mode = Le;
                                }
                                h >>>= 2, d -= 2;
                                break;
                            case 16193:
                                for (h >>>= 7 & d, d -= 7 & d; d < 32;) {
                                    if (0 === o)
                                        break t;
                                    o--, h += i[s++] << d, d += 8;
                                }
                                if ((65535 & h) != (h >>> 16 ^ 65535)) {
                                    t.msg = "invalid stored block lengths", a.mode = Le;
                                    break;
                                }
                                if (a.length = 65535 & h, h = 0, d = 0, a.mode = Te, e === pe)
                                    break t;
                            case Te: a.mode = 16195;
                            case 16195:
                                if (c = a.length, c) {
                                    if (c > o && (c = o), c > l && (c = l), 0 === c)
                                        break t;
                                    n.set(i.subarray(s, s + c), r), o -= c, s += c, l -= c, r += c, a.length -= c;
                                    break;
                                }
                                a.mode = Se;
                                break;
                            case 16196:
                                for (; d < 14;) {
                                    if (0 === o)
                                        break t;
                                    o--, h += i[s++] << d, d += 8;
                                }
                                if (a.nlen = 257 + (31 & h), h >>>= 5, d -= 5, a.ndist = 1 + (31 & h), h >>>= 5, d -= 5, a.ncode = 4 + (15 & h), h >>>= 4, d -= 4, a.nlen > 286 || a.ndist > 30) {
                                    t.msg = "too many length or distance symbols", a.mode = Le;
                                    break;
                                }
                                a.have = 0, a.mode = 16197;
                            case 16197:
                                for (; a.have < a.ncode;) {
                                    for (; d < 3;) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    a.lens[Z[a.have++]] = 7 & h, h >>>= 3, d -= 3;
                                }
                                for (; a.have < 19;)
                                    a.lens[Z[a.have++]] = 0;
                                if (a.lencode = a.lendyn, a.lenbits = 7, E = { bits: a.lenbits }, x = me(0, a.lens, 0, 19, a.lencode, 0, a.work, E), a.lenbits = E.bits, x) {
                                    t.msg = "invalid code lengths set", a.mode = Le;
                                    break;
                                }
                                a.have = 0, a.mode = 16198;
                            case 16198:
                                for (; a.have < a.nlen + a.ndist;) {
                                    for (; z = a.lencode[h & (1 << a.lenbits) - 1], m = z >>> 24, b = z >>> 16 & 255, g = 65535 & z, !(m <= d);) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    if (g < 16)
                                        h >>>= m, d -= m, a.lens[a.have++] = g;
                                    else {
                                        if (16 === g) {
                                            for (R = m + 2; d < R;) {
                                                if (0 === o)
                                                    break t;
                                                o--, h += i[s++] << d, d += 8;
                                            }
                                            if (h >>>= m, d -= m, 0 === a.have) {
                                                t.msg = "invalid bit length repeat", a.mode = Le;
                                                break;
                                            }
                                            y = a.lens[a.have - 1], c = 3 + (3 & h), h >>>= 2, d -= 2;
                                        }
                                        else if (17 === g) {
                                            for (R = m + 3; d < R;) {
                                                if (0 === o)
                                                    break t;
                                                o--, h += i[s++] << d, d += 8;
                                            }
                                            h >>>= m, d -= m, y = 0, c = 3 + (7 & h), h >>>= 3, d -= 3;
                                        }
                                        else {
                                            for (R = m + 7; d < R;) {
                                                if (0 === o)
                                                    break t;
                                                o--, h += i[s++] << d, d += 8;
                                            }
                                            h >>>= m, d -= m, y = 0, c = 11 + (127 & h), h >>>= 7, d -= 7;
                                        }
                                        if (a.have + c > a.nlen + a.ndist) {
                                            t.msg = "invalid bit length repeat", a.mode = Le;
                                            break;
                                        }
                                        for (; c--;)
                                            a.lens[a.have++] = y;
                                    }
                                }
                                if (a.mode === Le)
                                    break;
                                if (0 === a.lens[256]) {
                                    t.msg = "invalid code -- missing end-of-block", a.mode = Le;
                                    break;
                                }
                                if (a.lenbits = 9, E = { bits: a.lenbits }, x = me(1, a.lens, 0, a.nlen, a.lencode, 0, a.work, E), a.lenbits = E.bits, x) {
                                    t.msg = "invalid literal/lengths set", a.mode = Le;
                                    break;
                                }
                                if (a.distbits = 6, a.distcode = a.distdyn, E = { bits: a.distbits }, x = me(2, a.lens, a.nlen, a.ndist, a.distcode, 0, a.work, E), a.distbits = E.bits, x) {
                                    t.msg = "invalid distances set", a.mode = Le;
                                    break;
                                }
                                if (a.mode = Oe, e === pe)
                                    break t;
                            case Oe: a.mode = Ie;
                            case Ie:
                                if (o >= 6 && l >= 258) {
                                    t.next_out = r, t.avail_out = l, t.next_in = s, t.avail_in = o, a.hold = h, a.bits = d, de(t, f), r = t.next_out, n = t.output, l = t.avail_out, s = t.next_in, i = t.input, o = t.avail_in, h = a.hold, d = a.bits, a.mode === Se && (a.back = -1);
                                    break;
                                }
                                for (a.back = 0; z = a.lencode[h & (1 << a.lenbits) - 1], m = z >>> 24, b = z >>> 16 & 255, g = 65535 & z, !(m <= d);) {
                                    if (0 === o)
                                        break t;
                                    o--, h += i[s++] << d, d += 8;
                                }
                                if (b && 0 == (240 & b)) {
                                    for (p = m, k = b, v = g; z = a.lencode[v + ((h & (1 << p + k) - 1) >> p)], m = z >>> 24, b = z >>> 16 & 255, g = 65535 & z, !(p + m <= d);) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    h >>>= p, d -= p, a.back += p;
                                }
                                if (h >>>= m, d -= m, a.back += m, a.length = g, 0 === b) {
                                    a.mode = 16205;
                                    break;
                                }
                                if (32 & b) {
                                    a.back = -1, a.mode = Se;
                                    break;
                                }
                                if (64 & b) {
                                    t.msg = "invalid literal/length code", a.mode = Le;
                                    break;
                                }
                                a.extra = 15 & b, a.mode = 16201;
                            case 16201:
                                if (a.extra) {
                                    for (R = a.extra; d < R;) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    a.length += h & (1 << a.extra) - 1, h >>>= a.extra, d -= a.extra, a.back += a.extra;
                                }
                                a.was = a.length, a.mode = 16202;
                            case 16202:
                                for (; z = a.distcode[h & (1 << a.distbits) - 1], m = z >>> 24, b = z >>> 16 & 255, g = 65535 & z, !(m <= d);) {
                                    if (0 === o)
                                        break t;
                                    o--, h += i[s++] << d, d += 8;
                                }
                                if (0 == (240 & b)) {
                                    for (p = m, k = b, v = g; z = a.distcode[v + ((h & (1 << p + k) - 1) >> p)], m = z >>> 24, b = z >>> 16 & 255, g = 65535 & z, !(p + m <= d);) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    h >>>= p, d -= p, a.back += p;
                                }
                                if (h >>>= m, d -= m, a.back += m, 64 & b) {
                                    t.msg = "invalid distance code", a.mode = Le;
                                    break;
                                }
                                a.offset = g, a.extra = 15 & b, a.mode = 16203;
                            case 16203:
                                if (a.extra) {
                                    for (R = a.extra; d < R;) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    a.offset += h & (1 << a.extra) - 1, h >>>= a.extra, d -= a.extra, a.back += a.extra;
                                }
                                if (a.offset > a.dmax) {
                                    t.msg = "invalid distance too far back", a.mode = Le;
                                    break;
                                }
                                a.mode = 16204;
                            case 16204:
                                if (0 === l)
                                    break t;
                                if (c = f - l, a.offset > c) {
                                    if (c = a.offset - c, c > a.whave && a.sane) {
                                        t.msg = "invalid distance too far back", a.mode = Le;
                                        break;
                                    }
                                    c > a.wnext ? (c -= a.wnext, u = a.wsize - c) : u = a.wnext - c, c > a.length && (c = a.length), w = a.window;
                                }
                                else
                                    w = n, u = r - a.offset, c = a.length;
                                c > l && (c = l), l -= c, a.length -= c;
                                do {
                                    n[r++] = w[u++];
                                } while (--c);
                                0 === a.length && (a.mode = Ie);
                                break;
                            case 16205:
                                if (0 === l)
                                    break t;
                                n[r++] = a.length, l--, a.mode = Ie;
                                break;
                            case Fe:
                                if (a.wrap) {
                                    for (; d < 32;) {
                                        if (0 === o)
                                            break t;
                                        o--, h |= i[s++] << d, d += 8;
                                    }
                                    if (f -= l, t.total_out += f, a.total += f, 4 & a.wrap && f && (t.adler = a.check = a.flags ? H(a.check, n, f, r - f) : C(a.check, n, f, r - f)), f = l, 4 & a.wrap && (a.flags ? h : Ne(h)) !== a.check) {
                                        t.msg = "incorrect data check", a.mode = Le;
                                        break;
                                    }
                                    h = 0, d = 0;
                                }
                                a.mode = 16207;
                            case 16207:
                                if (a.wrap && a.flags) {
                                    for (; d < 32;) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    if (4 & a.wrap && h !== (4294967295 & a.total)) {
                                        t.msg = "incorrect length check", a.mode = Le;
                                        break;
                                    }
                                    h = 0, d = 0;
                                }
                                a.mode = 16208;
                            case 16208:
                                x = ve;
                                break t;
                            case Le:
                                x = ze;
                                break t;
                            case 16210: return Ae;
                            default: return xe;
                        } return t.next_out = r, t.avail_out = l, t.next_in = s, t.avail_in = o, a.hold = h, a.bits = d, (a.wsize || f !== t.avail_out && a.mode < Le && (a.mode < Fe || e !== be)) && We(t, t.output, t.next_out, f - t.avail_out), _ -= t.avail_in, f -= t.avail_out, t.total_in += _, t.total_out += f, a.total += f, 4 & a.wrap && f && (t.adler = a.check = a.flags ? H(a.check, n, f, t.next_out - f) : C(a.check, n, f, t.next_out - f)), t.data_type = a.bits + (a.last ? 64 : 0) + (a.mode === Se ? 128 : 0) + (a.mode === Oe || a.mode === Te ? 256 : 0), (0 === _ && 0 === f || e === be) && x === ke && (x = Ee), x; }, inflateEnd: t => { if (Ce(t))
                        return xe; let e = t.state; return e.window && (e.window = null), t.state = null, ke; }, inflateGetHeader: (t, e) => { if (Ce(t))
                        return xe; const a = t.state; return 0 == (2 & a.wrap) ? xe : (a.head = e, e.done = !1, ke); }, inflateSetDictionary: (t, e) => { const a = e.length; let i, n, s; return Ce(t) ? xe : (i = t.state, 0 !== i.wrap && i.mode !== Ue ? xe : i.mode === Ue && (n = 1, n = C(n, e, a, 0), n !== i.check) ? ze : (s = We(t, e, a, a), s ? (i.mode = 16210, Ae) : (i.havedict = 1, ke))); }, inflateInfo: "pako inflate (from Nodeca project)" };
                var Je = function () { this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1; };
                const Qe = Object.prototype.toString, { Z_NO_FLUSH: Ve, Z_FINISH: $e, Z_OK: ta, Z_STREAM_END: ea, Z_NEED_DICT: aa, Z_STREAM_ERROR: ia, Z_DATA_ERROR: na, Z_MEM_ERROR: sa } = K;
                function ra(t) { this.options = jt({ chunkSize: 65536, windowBits: 15, to: "" }, t || {}); const e = this.options; e.raw && e.windowBits >= 0 && e.windowBits < 16 && (e.windowBits = -e.windowBits, 0 === e.windowBits && (e.windowBits = -15)), !(e.windowBits >= 0 && e.windowBits < 16) || t && t.windowBits || (e.windowBits += 32), e.windowBits > 15 && e.windowBits < 48 && 0 == (15 & e.windowBits) && (e.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new qt, this.strm.avail_out = 0; let a = qe.inflateInit2(this.strm, e.windowBits); if (a !== ta)
                    throw new Error(j[a]); if (this.header = new Je, qe.inflateGetHeader(this.strm, this.header), e.dictionary && ("string" == typeof e.dictionary ? e.dictionary = Gt(e.dictionary) : "[object ArrayBuffer]" === Qe.call(e.dictionary) && (e.dictionary = new Uint8Array(e.dictionary)), e.raw && (a = qe.inflateSetDictionary(this.strm, e.dictionary), a !== ta)))
                    throw new Error(j[a]); }
                function oa(t, e) { const a = new ra(e); if (a.push(t), a.err)
                    throw a.msg || j[a.err]; return a.result; }
                ra.prototype.push = function (t, e) { const a = this.strm, i = this.options.chunkSize, n = this.options.dictionary; let s, r, o; if (this.ended)
                    return !1; for (r = e === ~~e ? e : !0 === e ? $e : Ve, "[object ArrayBuffer]" === Qe.call(t) ? a.input = new Uint8Array(t) : a.input = t, a.next_in = 0, a.avail_in = a.input.length;;) {
                    for (0 === a.avail_out && (a.output = new Uint8Array(i), a.next_out = 0, a.avail_out = i), s = qe.inflate(a, r), s === aa && n && (s = qe.inflateSetDictionary(a, n), s === ta ? s = qe.inflate(a, r) : s === na && (s = aa)); a.avail_in > 0 && s === ea && a.state.wrap > 0 && 0 !== t[a.next_in];)
                        qe.inflateReset(a), s = qe.inflate(a, r);
                    switch (s) {
                        case ia:
                        case na:
                        case aa:
                        case sa: return this.onEnd(s), this.ended = !0, !1;
                    }
                    if (o = a.avail_out, a.next_out && (0 === a.avail_out || s === ea))
                        if ("string" === this.options.to) {
                            let t = Wt(a.output, a.next_out), e = a.next_out - t, n = Xt(a.output, t);
                            a.next_out = e, a.avail_out = i - e, e && a.output.set(a.output.subarray(t, t + e), 0), this.onData(n);
                        }
                        else
                            this.onData(a.output.length === a.next_out ? a.output : a.output.subarray(0, a.next_out));
                    if (s !== ta || 0 !== o) {
                        if (s === ea)
                            return s = qe.inflateEnd(this.strm), this.onEnd(s), this.ended = !0, !0;
                        if (0 === a.avail_in)
                            break;
                    }
                } return !0; }, ra.prototype.onData = function (t) { this.chunks.push(t); }, ra.prototype.onEnd = function (t) { t === ta && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = Kt(this.chunks)), this.chunks = [], this.err = t, this.msg = this.strm.msg; };
                var la = { Inflate: ra, inflate: oa, inflateRaw: function (t, e) { return (e = e || {}).raw = !0, oa(t, e); }, ungzip: oa, constants: K };
                const { Deflate: ha, deflate: da, deflateRaw: _a, gzip: fa } = le, { Inflate: ca, inflate: ua, inflateRaw: wa, ungzip: ma } = la;
                var ba = ha, ga = da, pa = _a, ka = fa, va = ca, ya = ua, xa = wa, za = ma, Aa = K, Ea = { Deflate: ba, deflate: ga, deflateRaw: pa, gzip: ka, Inflate: va, inflate: ya, inflateRaw: xa, ungzip: za, constants: Aa };
                t.Deflate = ba, t.Inflate = va, t.constants = Aa, t.default = Ea, t.deflate = ga, t.deflateRaw = pa, t.gzip = ka, t.inflate = ya, t.inflateRaw = xa, t.ungzip = za, Object.defineProperty(t, "__esModule", { value: !0 });
            }));
            ;
            return module.exports;
        }), aes: undefined, url: undefined };
    const __wayxContexts = { "response": { "surge": { "phase": "response", "binary": false, "responseBody": true, "name": "bili_view_ad.js", "from": "qx", "to": "surge", "apiPlan": { "version": 1, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"], "source": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": "open-url", "media": "media-url", "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" }, "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" } }, "runtimePolicyVersion": 8, "omittedParameters": [] } } }, __wayxConfig = __wayxContexts[__wayxHost.response === undefined ? 'request' : 'response']?.[__wayxTarget];
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
                !function (t, e) { "object" == typeof exports && "undefined" != typeof module ? e(exports) : "function" == typeof define && define.amd ? define(["exports"], e) : e((t = "undefined" != typeof globalThis ? globalThis : t || self).pako = {}); }(this, (function (t) {
                    "use strict";
                    function e(t) { let e = t.length; for (; --e >= 0;)
                        t[e] = 0; }
                    const a = 256, i = 286, n = 30, s = 15, r = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]), o = new Uint8Array([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]), l = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7]), h = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]), d = new Array(576);
                    e(d);
                    const _ = new Array(60);
                    e(_);
                    const f = new Array(512);
                    e(f);
                    const c = new Array(256);
                    e(c);
                    const u = new Array(29);
                    e(u);
                    const w = new Array(n);
                    function m(t, e, a, i, n) { this.static_tree = t, this.extra_bits = e, this.extra_base = a, this.elems = i, this.max_length = n, this.has_stree = t && t.length; }
                    let b, g, p;
                    function k(t, e) { this.dyn_tree = t, this.max_code = 0, this.stat_desc = e; }
                    e(w);
                    const v = t => t < 256 ? f[t] : f[256 + (t >>> 7)], y = (t, e) => { t.pending_buf[t.pending++] = 255 & e, t.pending_buf[t.pending++] = e >>> 8 & 255; }, x = (t, e, a) => { t.bi_valid > 16 - a ? (t.bi_buf |= e << t.bi_valid & 65535, y(t, t.bi_buf), t.bi_buf = e >> 16 - t.bi_valid, t.bi_valid += a - 16) : (t.bi_buf |= e << t.bi_valid & 65535, t.bi_valid += a); }, z = (t, e, a) => { x(t, a[2 * e], a[2 * e + 1]); }, A = (t, e) => { let a = 0; do {
                        a |= 1 & t, t >>>= 1, a <<= 1;
                    } while (--e > 0); return a >>> 1; }, E = (t, e, a) => { const i = new Array(16); let n, r, o = 0; for (n = 1; n <= s; n++)
                        o = o + a[n - 1] << 1, i[n] = o; for (r = 0; r <= e; r++) {
                        let e = t[2 * r + 1];
                        0 !== e && (t[2 * r] = A(i[e]++, e));
                    } }, R = t => { let e; for (e = 0; e < i; e++)
                        t.dyn_ltree[2 * e] = 0; for (e = 0; e < n; e++)
                        t.dyn_dtree[2 * e] = 0; for (e = 0; e < 19; e++)
                        t.bl_tree[2 * e] = 0; t.dyn_ltree[512] = 1, t.opt_len = t.static_len = 0, t.sym_next = t.matches = 0; }, Z = t => { t.bi_valid > 8 ? y(t, t.bi_buf) : t.bi_valid > 0 && (t.pending_buf[t.pending++] = t.bi_buf), t.bi_buf = 0, t.bi_valid = 0; }, U = (t, e, a, i) => { const n = 2 * e, s = 2 * a; return t[n] < t[s] || t[n] === t[s] && i[e] <= i[a]; }, S = (t, e, a) => { const i = t.heap[a]; let n = a << 1; for (; n <= t.heap_len && (n < t.heap_len && U(e, t.heap[n + 1], t.heap[n], t.depth) && n++, !U(e, i, t.heap[n], t.depth));)
                        t.heap[a] = t.heap[n], a = n, n <<= 1; t.heap[a] = i; }, D = (t, e, i) => { let n, s, l, h, d = 0; if (0 !== t.sym_next)
                        do {
                            n = 255 & t.pending_buf[t.sym_buf + d++], n += (255 & t.pending_buf[t.sym_buf + d++]) << 8, s = t.pending_buf[t.sym_buf + d++], 0 === n ? z(t, s, e) : (l = c[s], z(t, l + a + 1, e), h = r[l], 0 !== h && (s -= u[l], x(t, s, h)), n--, l = v(n), z(t, l, i), h = o[l], 0 !== h && (n -= w[l], x(t, n, h)));
                        } while (d < t.sym_next); z(t, 256, e); }, T = (t, e) => { const a = e.dyn_tree, i = e.stat_desc.static_tree, n = e.stat_desc.has_stree, r = e.stat_desc.elems; let o, l, h, d = -1; for (t.heap_len = 0, t.heap_max = 573, o = 0; o < r; o++)
                        0 !== a[2 * o] ? (t.heap[++t.heap_len] = d = o, t.depth[o] = 0) : a[2 * o + 1] = 0; for (; t.heap_len < 2;)
                        h = t.heap[++t.heap_len] = d < 2 ? ++d : 0, a[2 * h] = 1, t.depth[h] = 0, t.opt_len--, n && (t.static_len -= i[2 * h + 1]); for (e.max_code = d, o = t.heap_len >> 1; o >= 1; o--)
                        S(t, a, o); h = r; do {
                        o = t.heap[1], t.heap[1] = t.heap[t.heap_len--], S(t, a, 1), l = t.heap[1], t.heap[--t.heap_max] = o, t.heap[--t.heap_max] = l, a[2 * h] = a[2 * o] + a[2 * l], t.depth[h] = (t.depth[o] >= t.depth[l] ? t.depth[o] : t.depth[l]) + 1, a[2 * o + 1] = a[2 * l + 1] = h, t.heap[1] = h++, S(t, a, 1);
                    } while (t.heap_len >= 2); t.heap[--t.heap_max] = t.heap[1], ((t, e) => { const a = e.dyn_tree, i = e.max_code, n = e.stat_desc.static_tree, r = e.stat_desc.has_stree, o = e.stat_desc.extra_bits, l = e.stat_desc.extra_base, h = e.stat_desc.max_length; let d, _, f, c, u, w, m = 0; for (c = 0; c <= s; c++)
                        t.bl_count[c] = 0; for (a[2 * t.heap[t.heap_max] + 1] = 0, d = t.heap_max + 1; d < 573; d++)
                        _ = t.heap[d], c = a[2 * a[2 * _ + 1] + 1] + 1, c > h && (c = h, m++), a[2 * _ + 1] = c, _ > i || (t.bl_count[c]++, u = 0, _ >= l && (u = o[_ - l]), w = a[2 * _], t.opt_len += w * (c + u), r && (t.static_len += w * (n[2 * _ + 1] + u))); if (0 !== m) {
                        do {
                            for (c = h - 1; 0 === t.bl_count[c];)
                                c--;
                            t.bl_count[c]--, t.bl_count[c + 1] += 2, t.bl_count[h]--, m -= 2;
                        } while (m > 0);
                        for (c = h; 0 !== c; c--)
                            for (_ = t.bl_count[c]; 0 !== _;)
                                f = t.heap[--d], f > i || (a[2 * f + 1] !== c && (t.opt_len += (c - a[2 * f + 1]) * a[2 * f], a[2 * f + 1] = c), _--);
                    } })(t, e), E(a, d, t.bl_count); }, O = (t, e, a) => { let i, n, s = -1, r = e[1], o = 0, l = 7, h = 4; for (0 === r && (l = 138, h = 3), e[2 * (a + 1) + 1] = 65535, i = 0; i <= a; i++)
                        n = r, r = e[2 * (i + 1) + 1], ++o < l && n === r || (o < h ? t.bl_tree[2 * n] += o : 0 !== n ? (n !== s && t.bl_tree[2 * n]++, t.bl_tree[32]++) : o <= 10 ? t.bl_tree[34]++ : t.bl_tree[36]++, o = 0, s = n, 0 === r ? (l = 138, h = 3) : n === r ? (l = 6, h = 3) : (l = 7, h = 4)); }, I = (t, e, a) => { let i, n, s = -1, r = e[1], o = 0, l = 7, h = 4; for (0 === r && (l = 138, h = 3), i = 0; i <= a; i++)
                        if (n = r, r = e[2 * (i + 1) + 1], !(++o < l && n === r)) {
                            if (o < h)
                                do {
                                    z(t, n, t.bl_tree);
                                } while (0 != --o);
                            else
                                0 !== n ? (n !== s && (z(t, n, t.bl_tree), o--), z(t, 16, t.bl_tree), x(t, o - 3, 2)) : o <= 10 ? (z(t, 17, t.bl_tree), x(t, o - 3, 3)) : (z(t, 18, t.bl_tree), x(t, o - 11, 7));
                            o = 0, s = n, 0 === r ? (l = 138, h = 3) : n === r ? (l = 6, h = 3) : (l = 7, h = 4);
                        } };
                    let F = !1;
                    const L = (t, e, a, i) => { x(t, 0 + (i ? 1 : 0), 3), Z(t), y(t, a), y(t, ~a), a && t.pending_buf.set(t.window.subarray(e, e + a), t.pending), t.pending += a; };
                    var N = (t, e, i, n) => { let s, r, o = 0; t.level > 0 ? (2 === t.strm.data_type && (t.strm.data_type = (t => { let e, i = 4093624447; for (e = 0; e <= 31; e++, i >>>= 1)
                        if (1 & i && 0 !== t.dyn_ltree[2 * e])
                            return 0; if (0 !== t.dyn_ltree[18] || 0 !== t.dyn_ltree[20] || 0 !== t.dyn_ltree[26])
                        return 1; for (e = 32; e < a; e++)
                        if (0 !== t.dyn_ltree[2 * e])
                            return 1; return 0; })(t)), T(t, t.l_desc), T(t, t.d_desc), o = (t => { let e; for (O(t, t.dyn_ltree, t.l_desc.max_code), O(t, t.dyn_dtree, t.d_desc.max_code), T(t, t.bl_desc), e = 18; e >= 3 && 0 === t.bl_tree[2 * h[e] + 1]; e--)
                        ; return t.opt_len += 3 * (e + 1) + 5 + 5 + 4, e; })(t), s = t.opt_len + 3 + 7 >>> 3, r = t.static_len + 3 + 7 >>> 3, r <= s && (s = r)) : s = r = i + 5, i + 4 <= s && -1 !== e ? L(t, e, i, n) : 4 === t.strategy || r === s ? (x(t, 2 + (n ? 1 : 0), 3), D(t, d, _)) : (x(t, 4 + (n ? 1 : 0), 3), ((t, e, a, i) => { let n; for (x(t, e - 257, 5), x(t, a - 1, 5), x(t, i - 4, 4), n = 0; n < i; n++)
                        x(t, t.bl_tree[2 * h[n] + 1], 3); I(t, t.dyn_ltree, e - 1), I(t, t.dyn_dtree, a - 1); })(t, t.l_desc.max_code + 1, t.d_desc.max_code + 1, o + 1), D(t, t.dyn_ltree, t.dyn_dtree)), R(t), n && Z(t); }, B = { _tr_init: t => { F || ((() => { let t, e, a, h, k; const v = new Array(16); for (a = 0, h = 0; h < 28; h++)
                            for (u[h] = a, t = 0; t < 1 << r[h]; t++)
                                c[a++] = h; for (c[a - 1] = h, k = 0, h = 0; h < 16; h++)
                            for (w[h] = k, t = 0; t < 1 << o[h]; t++)
                                f[k++] = h; for (k >>= 7; h < n; h++)
                            for (w[h] = k << 7, t = 0; t < 1 << o[h] - 7; t++)
                                f[256 + k++] = h; for (e = 0; e <= s; e++)
                            v[e] = 0; for (t = 0; t <= 143;)
                            d[2 * t + 1] = 8, t++, v[8]++; for (; t <= 255;)
                            d[2 * t + 1] = 9, t++, v[9]++; for (; t <= 279;)
                            d[2 * t + 1] = 7, t++, v[7]++; for (; t <= 287;)
                            d[2 * t + 1] = 8, t++, v[8]++; for (E(d, 287, v), t = 0; t < n; t++)
                            _[2 * t + 1] = 5, _[2 * t] = A(t, 5); b = new m(d, r, 257, i, s), g = new m(_, o, 0, n, s), p = new m(new Array(0), l, 0, 19, 7); })(), F = !0), t.l_desc = new k(t.dyn_ltree, b), t.d_desc = new k(t.dyn_dtree, g), t.bl_desc = new k(t.bl_tree, p), t.bi_buf = 0, t.bi_valid = 0, R(t); }, _tr_stored_block: L, _tr_flush_block: N, _tr_tally: (t, e, i) => (t.pending_buf[t.sym_buf + t.sym_next++] = e, t.pending_buf[t.sym_buf + t.sym_next++] = e >> 8, t.pending_buf[t.sym_buf + t.sym_next++] = i, 0 === e ? t.dyn_ltree[2 * i]++ : (t.matches++, e--, t.dyn_ltree[2 * (c[i] + a + 1)]++, t.dyn_dtree[2 * v(e)]++), t.sym_next === t.sym_end), _tr_align: t => { x(t, 2, 3), z(t, 256, d), (t => { 16 === t.bi_valid ? (y(t, t.bi_buf), t.bi_buf = 0, t.bi_valid = 0) : t.bi_valid >= 8 && (t.pending_buf[t.pending++] = 255 & t.bi_buf, t.bi_buf >>= 8, t.bi_valid -= 8); })(t); } };
                    var C = (t, e, a, i) => { let n = 65535 & t | 0, s = t >>> 16 & 65535 | 0, r = 0; for (; 0 !== a;) {
                        r = a > 2e3 ? 2e3 : a, a -= r;
                        do {
                            n = n + e[i++] | 0, s = s + n | 0;
                        } while (--r);
                        n %= 65521, s %= 65521;
                    } return n | s << 16 | 0; };
                    const M = new Uint32Array((() => { let t, e = []; for (var a = 0; a < 256; a++) {
                        t = a;
                        for (var i = 0; i < 8; i++)
                            t = 1 & t ? 3988292384 ^ t >>> 1 : t >>> 1;
                        e[a] = t;
                    } return e; })());
                    var H = (t, e, a, i) => { const n = M, s = i + a; t ^= -1; for (let a = i; a < s; a++)
                        t = t >>> 8 ^ n[255 & (t ^ e[a])]; return -1 ^ t; }, j = { 2: "need dictionary", 1: "stream end", 0: "", "-1": "file error", "-2": "stream error", "-3": "data error", "-4": "insufficient memory", "-5": "buffer error", "-6": "incompatible version" }, K = { Z_NO_FLUSH: 0, Z_PARTIAL_FLUSH: 1, Z_SYNC_FLUSH: 2, Z_FULL_FLUSH: 3, Z_FINISH: 4, Z_BLOCK: 5, Z_TREES: 6, Z_OK: 0, Z_STREAM_END: 1, Z_NEED_DICT: 2, Z_ERRNO: -1, Z_STREAM_ERROR: -2, Z_DATA_ERROR: -3, Z_MEM_ERROR: -4, Z_BUF_ERROR: -5, Z_NO_COMPRESSION: 0, Z_BEST_SPEED: 1, Z_BEST_COMPRESSION: 9, Z_DEFAULT_COMPRESSION: -1, Z_FILTERED: 1, Z_HUFFMAN_ONLY: 2, Z_RLE: 3, Z_FIXED: 4, Z_DEFAULT_STRATEGY: 0, Z_BINARY: 0, Z_TEXT: 1, Z_UNKNOWN: 2, Z_DEFLATED: 8 };
                    const { _tr_init: P, _tr_stored_block: Y, _tr_flush_block: G, _tr_tally: X, _tr_align: W } = B, { Z_NO_FLUSH: q, Z_PARTIAL_FLUSH: J, Z_FULL_FLUSH: Q, Z_FINISH: V, Z_BLOCK: $, Z_OK: tt, Z_STREAM_END: et, Z_STREAM_ERROR: at, Z_DATA_ERROR: it, Z_BUF_ERROR: nt, Z_DEFAULT_COMPRESSION: st, Z_FILTERED: rt, Z_HUFFMAN_ONLY: ot, Z_RLE: lt, Z_FIXED: ht, Z_DEFAULT_STRATEGY: dt, Z_UNKNOWN: _t, Z_DEFLATED: ft } = K, ct = 258, ut = 262, wt = 42, mt = 113, bt = 666, gt = (t, e) => (t.msg = j[e], e), pt = t => 2 * t - (t > 4 ? 9 : 0), kt = t => { let e = t.length; for (; --e >= 0;)
                        t[e] = 0; }, vt = t => { let e, a, i, n = t.w_size; e = t.hash_size, i = e; do {
                        a = t.head[--i], t.head[i] = a >= n ? a - n : 0;
                    } while (--e); e = n, i = e; do {
                        a = t.prev[--i], t.prev[i] = a >= n ? a - n : 0;
                    } while (--e); };
                    let yt = (t, e, a) => (e << t.hash_shift ^ a) & t.hash_mask;
                    const xt = t => { const e = t.state; let a = e.pending; a > t.avail_out && (a = t.avail_out), 0 !== a && (t.output.set(e.pending_buf.subarray(e.pending_out, e.pending_out + a), t.next_out), t.next_out += a, e.pending_out += a, t.total_out += a, t.avail_out -= a, e.pending -= a, 0 === e.pending && (e.pending_out = 0)); }, zt = (t, e) => { G(t, t.block_start >= 0 ? t.block_start : -1, t.strstart - t.block_start, e), t.block_start = t.strstart, xt(t.strm); }, At = (t, e) => { t.pending_buf[t.pending++] = e; }, Et = (t, e) => { t.pending_buf[t.pending++] = e >>> 8 & 255, t.pending_buf[t.pending++] = 255 & e; }, Rt = (t, e, a, i) => { let n = t.avail_in; return n > i && (n = i), 0 === n ? 0 : (t.avail_in -= n, e.set(t.input.subarray(t.next_in, t.next_in + n), a), 1 === t.state.wrap ? t.adler = C(t.adler, e, n, a) : 2 === t.state.wrap && (t.adler = H(t.adler, e, n, a)), t.next_in += n, t.total_in += n, n); }, Zt = (t, e) => { let a, i, n = t.max_chain_length, s = t.strstart, r = t.prev_length, o = t.nice_match; const l = t.strstart > t.w_size - ut ? t.strstart - (t.w_size - ut) : 0, h = t.window, d = t.w_mask, _ = t.prev, f = t.strstart + ct; let c = h[s + r - 1], u = h[s + r]; t.prev_length >= t.good_match && (n >>= 2), o > t.lookahead && (o = t.lookahead); do {
                        if (a = e, h[a + r] === u && h[a + r - 1] === c && h[a] === h[s] && h[++a] === h[s + 1]) {
                            s += 2, a++;
                            do { } while (h[++s] === h[++a] && h[++s] === h[++a] && h[++s] === h[++a] && h[++s] === h[++a] && h[++s] === h[++a] && h[++s] === h[++a] && h[++s] === h[++a] && h[++s] === h[++a] && s < f);
                            if (i = ct - (f - s), s = f - ct, i > r) {
                                if (t.match_start = e, r = i, i >= o)
                                    break;
                                c = h[s + r - 1], u = h[s + r];
                            }
                        }
                    } while ((e = _[e & d]) > l && 0 != --n); return r <= t.lookahead ? r : t.lookahead; }, Ut = t => { const e = t.w_size; let a, i, n; do {
                        if (i = t.window_size - t.lookahead - t.strstart, t.strstart >= e + (e - ut) && (t.window.set(t.window.subarray(e, e + e - i), 0), t.match_start -= e, t.strstart -= e, t.block_start -= e, t.insert > t.strstart && (t.insert = t.strstart), vt(t), i += e), 0 === t.strm.avail_in)
                            break;
                        if (a = Rt(t.strm, t.window, t.strstart + t.lookahead, i), t.lookahead += a, t.lookahead + t.insert >= 3)
                            for (n = t.strstart - t.insert, t.ins_h = t.window[n], t.ins_h = yt(t, t.ins_h, t.window[n + 1]); t.insert && (t.ins_h = yt(t, t.ins_h, t.window[n + 3 - 1]), t.prev[n & t.w_mask] = t.head[t.ins_h], t.head[t.ins_h] = n, n++, t.insert--, !(t.lookahead + t.insert < 3));)
                                ;
                    } while (t.lookahead < ut && 0 !== t.strm.avail_in); }, St = (t, e) => { let a, i, n, s = t.pending_buf_size - 5 > t.w_size ? t.w_size : t.pending_buf_size - 5, r = 0, o = t.strm.avail_in; do {
                        if (a = 65535, n = t.bi_valid + 42 >> 3, t.strm.avail_out < n)
                            break;
                        if (n = t.strm.avail_out - n, i = t.strstart - t.block_start, a > i + t.strm.avail_in && (a = i + t.strm.avail_in), a > n && (a = n), a < s && (0 === a && e !== V || e === q || a !== i + t.strm.avail_in))
                            break;
                        r = e === V && a === i + t.strm.avail_in ? 1 : 0, Y(t, 0, 0, r), t.pending_buf[t.pending - 4] = a, t.pending_buf[t.pending - 3] = a >> 8, t.pending_buf[t.pending - 2] = ~a, t.pending_buf[t.pending - 1] = ~a >> 8, xt(t.strm), i && (i > a && (i = a), t.strm.output.set(t.window.subarray(t.block_start, t.block_start + i), t.strm.next_out), t.strm.next_out += i, t.strm.avail_out -= i, t.strm.total_out += i, t.block_start += i, a -= i), a && (Rt(t.strm, t.strm.output, t.strm.next_out, a), t.strm.next_out += a, t.strm.avail_out -= a, t.strm.total_out += a);
                    } while (0 === r); return o -= t.strm.avail_in, o && (o >= t.w_size ? (t.matches = 2, t.window.set(t.strm.input.subarray(t.strm.next_in - t.w_size, t.strm.next_in), 0), t.strstart = t.w_size, t.insert = t.strstart) : (t.window_size - t.strstart <= o && (t.strstart -= t.w_size, t.window.set(t.window.subarray(t.w_size, t.w_size + t.strstart), 0), t.matches < 2 && t.matches++, t.insert > t.strstart && (t.insert = t.strstart)), t.window.set(t.strm.input.subarray(t.strm.next_in - o, t.strm.next_in), t.strstart), t.strstart += o, t.insert += o > t.w_size - t.insert ? t.w_size - t.insert : o), t.block_start = t.strstart), t.high_water < t.strstart && (t.high_water = t.strstart), r ? 4 : e !== q && e !== V && 0 === t.strm.avail_in && t.strstart === t.block_start ? 2 : (n = t.window_size - t.strstart, t.strm.avail_in > n && t.block_start >= t.w_size && (t.block_start -= t.w_size, t.strstart -= t.w_size, t.window.set(t.window.subarray(t.w_size, t.w_size + t.strstart), 0), t.matches < 2 && t.matches++, n += t.w_size, t.insert > t.strstart && (t.insert = t.strstart)), n > t.strm.avail_in && (n = t.strm.avail_in), n && (Rt(t.strm, t.window, t.strstart, n), t.strstart += n, t.insert += n > t.w_size - t.insert ? t.w_size - t.insert : n), t.high_water < t.strstart && (t.high_water = t.strstart), n = t.bi_valid + 42 >> 3, n = t.pending_buf_size - n > 65535 ? 65535 : t.pending_buf_size - n, s = n > t.w_size ? t.w_size : n, i = t.strstart - t.block_start, (i >= s || (i || e === V) && e !== q && 0 === t.strm.avail_in && i <= n) && (a = i > n ? n : i, r = e === V && 0 === t.strm.avail_in && a === i ? 1 : 0, Y(t, t.block_start, a, r), t.block_start += a, xt(t.strm)), r ? 3 : 1); }, Dt = (t, e) => { let a, i; for (;;) {
                        if (t.lookahead < ut) {
                            if (Ut(t), t.lookahead < ut && e === q)
                                return 1;
                            if (0 === t.lookahead)
                                break;
                        }
                        if (a = 0, t.lookahead >= 3 && (t.ins_h = yt(t, t.ins_h, t.window[t.strstart + 3 - 1]), a = t.prev[t.strstart & t.w_mask] = t.head[t.ins_h], t.head[t.ins_h] = t.strstart), 0 !== a && t.strstart - a <= t.w_size - ut && (t.match_length = Zt(t, a)), t.match_length >= 3)
                            if (i = X(t, t.strstart - t.match_start, t.match_length - 3), t.lookahead -= t.match_length, t.match_length <= t.max_lazy_match && t.lookahead >= 3) {
                                t.match_length--;
                                do {
                                    t.strstart++, t.ins_h = yt(t, t.ins_h, t.window[t.strstart + 3 - 1]), a = t.prev[t.strstart & t.w_mask] = t.head[t.ins_h], t.head[t.ins_h] = t.strstart;
                                } while (0 != --t.match_length);
                                t.strstart++;
                            }
                            else
                                t.strstart += t.match_length, t.match_length = 0, t.ins_h = t.window[t.strstart], t.ins_h = yt(t, t.ins_h, t.window[t.strstart + 1]);
                        else
                            i = X(t, 0, t.window[t.strstart]), t.lookahead--, t.strstart++;
                        if (i && (zt(t, !1), 0 === t.strm.avail_out))
                            return 1;
                    } return t.insert = t.strstart < 2 ? t.strstart : 2, e === V ? (zt(t, !0), 0 === t.strm.avail_out ? 3 : 4) : t.sym_next && (zt(t, !1), 0 === t.strm.avail_out) ? 1 : 2; }, Tt = (t, e) => { let a, i, n; for (;;) {
                        if (t.lookahead < ut) {
                            if (Ut(t), t.lookahead < ut && e === q)
                                return 1;
                            if (0 === t.lookahead)
                                break;
                        }
                        if (a = 0, t.lookahead >= 3 && (t.ins_h = yt(t, t.ins_h, t.window[t.strstart + 3 - 1]), a = t.prev[t.strstart & t.w_mask] = t.head[t.ins_h], t.head[t.ins_h] = t.strstart), t.prev_length = t.match_length, t.prev_match = t.match_start, t.match_length = 2, 0 !== a && t.prev_length < t.max_lazy_match && t.strstart - a <= t.w_size - ut && (t.match_length = Zt(t, a), t.match_length <= 5 && (t.strategy === rt || 3 === t.match_length && t.strstart - t.match_start > 4096) && (t.match_length = 2)), t.prev_length >= 3 && t.match_length <= t.prev_length) {
                            n = t.strstart + t.lookahead - 3, i = X(t, t.strstart - 1 - t.prev_match, t.prev_length - 3), t.lookahead -= t.prev_length - 1, t.prev_length -= 2;
                            do {
                                ++t.strstart <= n && (t.ins_h = yt(t, t.ins_h, t.window[t.strstart + 3 - 1]), a = t.prev[t.strstart & t.w_mask] = t.head[t.ins_h], t.head[t.ins_h] = t.strstart);
                            } while (0 != --t.prev_length);
                            if (t.match_available = 0, t.match_length = 2, t.strstart++, i && (zt(t, !1), 0 === t.strm.avail_out))
                                return 1;
                        }
                        else if (t.match_available) {
                            if (i = X(t, 0, t.window[t.strstart - 1]), i && zt(t, !1), t.strstart++, t.lookahead--, 0 === t.strm.avail_out)
                                return 1;
                        }
                        else
                            t.match_available = 1, t.strstart++, t.lookahead--;
                    } return t.match_available && (i = X(t, 0, t.window[t.strstart - 1]), t.match_available = 0), t.insert = t.strstart < 2 ? t.strstart : 2, e === V ? (zt(t, !0), 0 === t.strm.avail_out ? 3 : 4) : t.sym_next && (zt(t, !1), 0 === t.strm.avail_out) ? 1 : 2; };
                    function Ot(t, e, a, i, n) { this.good_length = t, this.max_lazy = e, this.nice_length = a, this.max_chain = i, this.func = n; }
                    const It = [new Ot(0, 0, 0, 0, St), new Ot(4, 4, 8, 4, Dt), new Ot(4, 5, 16, 8, Dt), new Ot(4, 6, 32, 32, Dt), new Ot(4, 4, 16, 16, Tt), new Ot(8, 16, 32, 32, Tt), new Ot(8, 16, 128, 128, Tt), new Ot(8, 32, 128, 256, Tt), new Ot(32, 128, 258, 1024, Tt), new Ot(32, 258, 258, 4096, Tt)];
                    function Ft() { this.strm = null, this.status = 0, this.pending_buf = null, this.pending_buf_size = 0, this.pending_out = 0, this.pending = 0, this.wrap = 0, this.gzhead = null, this.gzindex = 0, this.method = ft, this.last_flush = -1, this.w_size = 0, this.w_bits = 0, this.w_mask = 0, this.window = null, this.window_size = 0, this.prev = null, this.head = null, this.ins_h = 0, this.hash_size = 0, this.hash_bits = 0, this.hash_mask = 0, this.hash_shift = 0, this.block_start = 0, this.match_length = 0, this.prev_match = 0, this.match_available = 0, this.strstart = 0, this.match_start = 0, this.lookahead = 0, this.prev_length = 0, this.max_chain_length = 0, this.max_lazy_match = 0, this.level = 0, this.strategy = 0, this.good_match = 0, this.nice_match = 0, this.dyn_ltree = new Uint16Array(1146), this.dyn_dtree = new Uint16Array(122), this.bl_tree = new Uint16Array(78), kt(this.dyn_ltree), kt(this.dyn_dtree), kt(this.bl_tree), this.l_desc = null, this.d_desc = null, this.bl_desc = null, this.bl_count = new Uint16Array(16), this.heap = new Uint16Array(573), kt(this.heap), this.heap_len = 0, this.heap_max = 0, this.depth = new Uint16Array(573), kt(this.depth), this.sym_buf = 0, this.lit_bufsize = 0, this.sym_next = 0, this.sym_end = 0, this.opt_len = 0, this.static_len = 0, this.matches = 0, this.insert = 0, this.bi_buf = 0, this.bi_valid = 0; }
                    const Lt = t => { if (!t)
                        return 1; const e = t.state; return !e || e.strm !== t || e.status !== wt && 57 !== e.status && 69 !== e.status && 73 !== e.status && 91 !== e.status && 103 !== e.status && e.status !== mt && e.status !== bt ? 1 : 0; }, Nt = t => { if (Lt(t))
                        return gt(t, at); t.total_in = t.total_out = 0, t.data_type = _t; const e = t.state; return e.pending = 0, e.pending_out = 0, e.wrap < 0 && (e.wrap = -e.wrap), e.status = 2 === e.wrap ? 57 : e.wrap ? wt : mt, t.adler = 2 === e.wrap ? 0 : 1, e.last_flush = -2, P(e), tt; }, Bt = t => { const e = Nt(t); var a; return e === tt && ((a = t.state).window_size = 2 * a.w_size, kt(a.head), a.max_lazy_match = It[a.level].max_lazy, a.good_match = It[a.level].good_length, a.nice_match = It[a.level].nice_length, a.max_chain_length = It[a.level].max_chain, a.strstart = 0, a.block_start = 0, a.lookahead = 0, a.insert = 0, a.match_length = a.prev_length = 2, a.match_available = 0, a.ins_h = 0), e; }, Ct = (t, e, a, i, n, s) => { if (!t)
                        return at; let r = 1; if (e === st && (e = 6), i < 0 ? (r = 0, i = -i) : i > 15 && (r = 2, i -= 16), n < 1 || n > 9 || a !== ft || i < 8 || i > 15 || e < 0 || e > 9 || s < 0 || s > ht || 8 === i && 1 !== r)
                        return gt(t, at); 8 === i && (i = 9); const o = new Ft; return t.state = o, o.strm = t, o.status = wt, o.wrap = r, o.gzhead = null, o.w_bits = i, o.w_size = 1 << o.w_bits, o.w_mask = o.w_size - 1, o.hash_bits = n + 7, o.hash_size = 1 << o.hash_bits, o.hash_mask = o.hash_size - 1, o.hash_shift = ~~((o.hash_bits + 3 - 1) / 3), o.window = new Uint8Array(2 * o.w_size), o.head = new Uint16Array(o.hash_size), o.prev = new Uint16Array(o.w_size), o.lit_bufsize = 1 << n + 6, o.pending_buf_size = 4 * o.lit_bufsize, o.pending_buf = new Uint8Array(o.pending_buf_size), o.sym_buf = o.lit_bufsize, o.sym_end = 3 * (o.lit_bufsize - 1), o.level = e, o.strategy = s, o.method = a, Bt(t); };
                    var Mt = { deflateInit: (t, e) => Ct(t, e, ft, 15, 8, dt), deflateInit2: Ct, deflateReset: Bt, deflateResetKeep: Nt, deflateSetHeader: (t, e) => Lt(t) || 2 !== t.state.wrap ? at : (t.state.gzhead = e, tt), deflate: (t, e) => { if (Lt(t) || e > $ || e < 0)
                            return t ? gt(t, at) : at; const a = t.state; if (!t.output || 0 !== t.avail_in && !t.input || a.status === bt && e !== V)
                            return gt(t, 0 === t.avail_out ? nt : at); const i = a.last_flush; if (a.last_flush = e, 0 !== a.pending) {
                            if (xt(t), 0 === t.avail_out)
                                return a.last_flush = -1, tt;
                        }
                        else if (0 === t.avail_in && pt(e) <= pt(i) && e !== V)
                            return gt(t, nt); if (a.status === bt && 0 !== t.avail_in)
                            return gt(t, nt); if (a.status === wt && 0 === a.wrap && (a.status = mt), a.status === wt) {
                            let e = ft + (a.w_bits - 8 << 4) << 8, i = -1;
                            if (i = a.strategy >= ot || a.level < 2 ? 0 : a.level < 6 ? 1 : 6 === a.level ? 2 : 3, e |= i << 6, 0 !== a.strstart && (e |= 32), e += 31 - e % 31, Et(a, e), 0 !== a.strstart && (Et(a, t.adler >>> 16), Et(a, 65535 & t.adler)), t.adler = 1, a.status = mt, xt(t), 0 !== a.pending)
                                return a.last_flush = -1, tt;
                        } if (57 === a.status)
                            if (t.adler = 0, At(a, 31), At(a, 139), At(a, 8), a.gzhead)
                                At(a, (a.gzhead.text ? 1 : 0) + (a.gzhead.hcrc ? 2 : 0) + (a.gzhead.extra ? 4 : 0) + (a.gzhead.name ? 8 : 0) + (a.gzhead.comment ? 16 : 0)), At(a, 255 & a.gzhead.time), At(a, a.gzhead.time >> 8 & 255), At(a, a.gzhead.time >> 16 & 255), At(a, a.gzhead.time >> 24 & 255), At(a, 9 === a.level ? 2 : a.strategy >= ot || a.level < 2 ? 4 : 0), At(a, 255 & a.gzhead.os), a.gzhead.extra && a.gzhead.extra.length && (At(a, 255 & a.gzhead.extra.length), At(a, a.gzhead.extra.length >> 8 & 255)), a.gzhead.hcrc && (t.adler = H(t.adler, a.pending_buf, a.pending, 0)), a.gzindex = 0, a.status = 69;
                            else if (At(a, 0), At(a, 0), At(a, 0), At(a, 0), At(a, 0), At(a, 9 === a.level ? 2 : a.strategy >= ot || a.level < 2 ? 4 : 0), At(a, 3), a.status = mt, xt(t), 0 !== a.pending)
                                return a.last_flush = -1, tt; if (69 === a.status) {
                            if (a.gzhead.extra) {
                                let e = a.pending, i = (65535 & a.gzhead.extra.length) - a.gzindex;
                                for (; a.pending + i > a.pending_buf_size;) {
                                    let n = a.pending_buf_size - a.pending;
                                    if (a.pending_buf.set(a.gzhead.extra.subarray(a.gzindex, a.gzindex + n), a.pending), a.pending = a.pending_buf_size, a.gzhead.hcrc && a.pending > e && (t.adler = H(t.adler, a.pending_buf, a.pending - e, e)), a.gzindex += n, xt(t), 0 !== a.pending)
                                        return a.last_flush = -1, tt;
                                    e = 0, i -= n;
                                }
                                let n = new Uint8Array(a.gzhead.extra);
                                a.pending_buf.set(n.subarray(a.gzindex, a.gzindex + i), a.pending), a.pending += i, a.gzhead.hcrc && a.pending > e && (t.adler = H(t.adler, a.pending_buf, a.pending - e, e)), a.gzindex = 0;
                            }
                            a.status = 73;
                        } if (73 === a.status) {
                            if (a.gzhead.name) {
                                let e, i = a.pending;
                                do {
                                    if (a.pending === a.pending_buf_size) {
                                        if (a.gzhead.hcrc && a.pending > i && (t.adler = H(t.adler, a.pending_buf, a.pending - i, i)), xt(t), 0 !== a.pending)
                                            return a.last_flush = -1, tt;
                                        i = 0;
                                    }
                                    e = a.gzindex < a.gzhead.name.length ? 255 & a.gzhead.name.charCodeAt(a.gzindex++) : 0, At(a, e);
                                } while (0 !== e);
                                a.gzhead.hcrc && a.pending > i && (t.adler = H(t.adler, a.pending_buf, a.pending - i, i)), a.gzindex = 0;
                            }
                            a.status = 91;
                        } if (91 === a.status) {
                            if (a.gzhead.comment) {
                                let e, i = a.pending;
                                do {
                                    if (a.pending === a.pending_buf_size) {
                                        if (a.gzhead.hcrc && a.pending > i && (t.adler = H(t.adler, a.pending_buf, a.pending - i, i)), xt(t), 0 !== a.pending)
                                            return a.last_flush = -1, tt;
                                        i = 0;
                                    }
                                    e = a.gzindex < a.gzhead.comment.length ? 255 & a.gzhead.comment.charCodeAt(a.gzindex++) : 0, At(a, e);
                                } while (0 !== e);
                                a.gzhead.hcrc && a.pending > i && (t.adler = H(t.adler, a.pending_buf, a.pending - i, i));
                            }
                            a.status = 103;
                        } if (103 === a.status) {
                            if (a.gzhead.hcrc) {
                                if (a.pending + 2 > a.pending_buf_size && (xt(t), 0 !== a.pending))
                                    return a.last_flush = -1, tt;
                                At(a, 255 & t.adler), At(a, t.adler >> 8 & 255), t.adler = 0;
                            }
                            if (a.status = mt, xt(t), 0 !== a.pending)
                                return a.last_flush = -1, tt;
                        } if (0 !== t.avail_in || 0 !== a.lookahead || e !== q && a.status !== bt) {
                            let i = 0 === a.level ? St(a, e) : a.strategy === ot ? ((t, e) => { let a; for (;;) {
                                if (0 === t.lookahead && (Ut(t), 0 === t.lookahead)) {
                                    if (e === q)
                                        return 1;
                                    break;
                                }
                                if (t.match_length = 0, a = X(t, 0, t.window[t.strstart]), t.lookahead--, t.strstart++, a && (zt(t, !1), 0 === t.strm.avail_out))
                                    return 1;
                            } return t.insert = 0, e === V ? (zt(t, !0), 0 === t.strm.avail_out ? 3 : 4) : t.sym_next && (zt(t, !1), 0 === t.strm.avail_out) ? 1 : 2; })(a, e) : a.strategy === lt ? ((t, e) => { let a, i, n, s; const r = t.window; for (;;) {
                                if (t.lookahead <= ct) {
                                    if (Ut(t), t.lookahead <= ct && e === q)
                                        return 1;
                                    if (0 === t.lookahead)
                                        break;
                                }
                                if (t.match_length = 0, t.lookahead >= 3 && t.strstart > 0 && (n = t.strstart - 1, i = r[n], i === r[++n] && i === r[++n] && i === r[++n])) {
                                    s = t.strstart + ct;
                                    do { } while (i === r[++n] && i === r[++n] && i === r[++n] && i === r[++n] && i === r[++n] && i === r[++n] && i === r[++n] && i === r[++n] && n < s);
                                    t.match_length = ct - (s - n), t.match_length > t.lookahead && (t.match_length = t.lookahead);
                                }
                                if (t.match_length >= 3 ? (a = X(t, 1, t.match_length - 3), t.lookahead -= t.match_length, t.strstart += t.match_length, t.match_length = 0) : (a = X(t, 0, t.window[t.strstart]), t.lookahead--, t.strstart++), a && (zt(t, !1), 0 === t.strm.avail_out))
                                    return 1;
                            } return t.insert = 0, e === V ? (zt(t, !0), 0 === t.strm.avail_out ? 3 : 4) : t.sym_next && (zt(t, !1), 0 === t.strm.avail_out) ? 1 : 2; })(a, e) : It[a.level].func(a, e);
                            if (3 !== i && 4 !== i || (a.status = bt), 1 === i || 3 === i)
                                return 0 === t.avail_out && (a.last_flush = -1), tt;
                            if (2 === i && (e === J ? W(a) : e !== $ && (Y(a, 0, 0, !1), e === Q && (kt(a.head), 0 === a.lookahead && (a.strstart = 0, a.block_start = 0, a.insert = 0))), xt(t), 0 === t.avail_out))
                                return a.last_flush = -1, tt;
                        } return e !== V ? tt : a.wrap <= 0 ? et : (2 === a.wrap ? (At(a, 255 & t.adler), At(a, t.adler >> 8 & 255), At(a, t.adler >> 16 & 255), At(a, t.adler >> 24 & 255), At(a, 255 & t.total_in), At(a, t.total_in >> 8 & 255), At(a, t.total_in >> 16 & 255), At(a, t.total_in >> 24 & 255)) : (Et(a, t.adler >>> 16), Et(a, 65535 & t.adler)), xt(t), a.wrap > 0 && (a.wrap = -a.wrap), 0 !== a.pending ? tt : et); }, deflateEnd: t => { if (Lt(t))
                            return at; const e = t.state.status; return t.state = null, e === mt ? gt(t, it) : tt; }, deflateSetDictionary: (t, e) => { let a = e.length; if (Lt(t))
                            return at; const i = t.state, n = i.wrap; if (2 === n || 1 === n && i.status !== wt || i.lookahead)
                            return at; if (1 === n && (t.adler = C(t.adler, e, a, 0)), i.wrap = 0, a >= i.w_size) {
                            0 === n && (kt(i.head), i.strstart = 0, i.block_start = 0, i.insert = 0);
                            let t = new Uint8Array(i.w_size);
                            t.set(e.subarray(a - i.w_size, a), 0), e = t, a = i.w_size;
                        } const s = t.avail_in, r = t.next_in, o = t.input; for (t.avail_in = a, t.next_in = 0, t.input = e, Ut(i); i.lookahead >= 3;) {
                            let t = i.strstart, e = i.lookahead - 2;
                            do {
                                i.ins_h = yt(i, i.ins_h, i.window[t + 3 - 1]), i.prev[t & i.w_mask] = i.head[i.ins_h], i.head[i.ins_h] = t, t++;
                            } while (--e);
                            i.strstart = t, i.lookahead = 2, Ut(i);
                        } return i.strstart += i.lookahead, i.block_start = i.strstart, i.insert = i.lookahead, i.lookahead = 0, i.match_length = i.prev_length = 2, i.match_available = 0, t.next_in = r, t.input = o, t.avail_in = s, i.wrap = n, tt; }, deflateInfo: "pako deflate (from Nodeca project)" };
                    const Ht = (t, e) => Object.prototype.hasOwnProperty.call(t, e);
                    var jt = function (t) { const e = Array.prototype.slice.call(arguments, 1); for (; e.length;) {
                        const a = e.shift();
                        if (a) {
                            if ("object" != typeof a)
                                throw new TypeError(a + "must be non-object");
                            for (const e in a)
                                Ht(a, e) && (t[e] = a[e]);
                        }
                    } return t; }, Kt = t => { let e = 0; for (let a = 0, i = t.length; a < i; a++)
                        e += t[a].length; const a = new Uint8Array(e); for (let e = 0, i = 0, n = t.length; e < n; e++) {
                        let n = t[e];
                        a.set(n, i), i += n.length;
                    } return a; };
                    let Pt = !0;
                    try {
                        String.fromCharCode.apply(null, new Uint8Array(1));
                    }
                    catch (t) {
                        Pt = !1;
                    }
                    const Yt = new Uint8Array(256);
                    for (let t = 0; t < 256; t++)
                        Yt[t] = t >= 252 ? 6 : t >= 248 ? 5 : t >= 240 ? 4 : t >= 224 ? 3 : t >= 192 ? 2 : 1;
                    Yt[254] = Yt[254] = 1;
                    var Gt = t => { if ("function" == typeof TextEncoder && TextEncoder.prototype.encode)
                        return (new TextEncoder).encode(t); let e, a, i, n, s, r = t.length, o = 0; for (n = 0; n < r; n++)
                        a = t.charCodeAt(n), 55296 == (64512 & a) && n + 1 < r && (i = t.charCodeAt(n + 1), 56320 == (64512 & i) && (a = 65536 + (a - 55296 << 10) + (i - 56320), n++)), o += a < 128 ? 1 : a < 2048 ? 2 : a < 65536 ? 3 : 4; for (e = new Uint8Array(o), s = 0, n = 0; s < o; n++)
                        a = t.charCodeAt(n), 55296 == (64512 & a) && n + 1 < r && (i = t.charCodeAt(n + 1), 56320 == (64512 & i) && (a = 65536 + (a - 55296 << 10) + (i - 56320), n++)), a < 128 ? e[s++] = a : a < 2048 ? (e[s++] = 192 | a >>> 6, e[s++] = 128 | 63 & a) : a < 65536 ? (e[s++] = 224 | a >>> 12, e[s++] = 128 | a >>> 6 & 63, e[s++] = 128 | 63 & a) : (e[s++] = 240 | a >>> 18, e[s++] = 128 | a >>> 12 & 63, e[s++] = 128 | a >>> 6 & 63, e[s++] = 128 | 63 & a); return e; }, Xt = (t, e) => { const a = e || t.length; if ("function" == typeof TextDecoder && TextDecoder.prototype.decode)
                        return (new TextDecoder).decode(t.subarray(0, e)); let i, n; const s = new Array(2 * a); for (n = 0, i = 0; i < a;) {
                        let e = t[i++];
                        if (e < 128) {
                            s[n++] = e;
                            continue;
                        }
                        let r = Yt[e];
                        if (r > 4)
                            s[n++] = 65533, i += r - 1;
                        else {
                            for (e &= 2 === r ? 31 : 3 === r ? 15 : 7; r > 1 && i < a;)
                                e = e << 6 | 63 & t[i++], r--;
                            r > 1 ? s[n++] = 65533 : e < 65536 ? s[n++] = e : (e -= 65536, s[n++] = 55296 | e >> 10 & 1023, s[n++] = 56320 | 1023 & e);
                        }
                    } return ((t, e) => { if (e < 65534 && t.subarray && Pt)
                        return String.fromCharCode.apply(null, t.length === e ? t : t.subarray(0, e)); let a = ""; for (let i = 0; i < e; i++)
                        a += String.fromCharCode(t[i]); return a; })(s, n); }, Wt = (t, e) => { (e = e || t.length) > t.length && (e = t.length); let a = e - 1; for (; a >= 0 && 128 == (192 & t[a]);)
                        a--; return a < 0 || 0 === a ? e : a + Yt[t[a]] > e ? a : e; };
                    var qt = function () { this.input = null, this.next_in = 0, this.avail_in = 0, this.total_in = 0, this.output = null, this.next_out = 0, this.avail_out = 0, this.total_out = 0, this.msg = "", this.state = null, this.data_type = 2, this.adler = 0; };
                    const Jt = Object.prototype.toString, { Z_NO_FLUSH: Qt, Z_SYNC_FLUSH: Vt, Z_FULL_FLUSH: $t, Z_FINISH: te, Z_OK: ee, Z_STREAM_END: ae, Z_DEFAULT_COMPRESSION: ie, Z_DEFAULT_STRATEGY: ne, Z_DEFLATED: se } = K;
                    function re(t) { this.options = jt({ level: ie, method: se, chunkSize: 16384, windowBits: 15, memLevel: 8, strategy: ne }, t || {}); let e = this.options; e.raw && e.windowBits > 0 ? e.windowBits = -e.windowBits : e.gzip && e.windowBits > 0 && e.windowBits < 16 && (e.windowBits += 16), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new qt, this.strm.avail_out = 0; let a = Mt.deflateInit2(this.strm, e.level, e.method, e.windowBits, e.memLevel, e.strategy); if (a !== ee)
                        throw new Error(j[a]); if (e.header && Mt.deflateSetHeader(this.strm, e.header), e.dictionary) {
                        let t;
                        if (t = "string" == typeof e.dictionary ? Gt(e.dictionary) : "[object ArrayBuffer]" === Jt.call(e.dictionary) ? new Uint8Array(e.dictionary) : e.dictionary, a = Mt.deflateSetDictionary(this.strm, t), a !== ee)
                            throw new Error(j[a]);
                        this._dict_set = !0;
                    } }
                    function oe(t, e) { const a = new re(e); if (a.push(t, !0), a.err)
                        throw a.msg || j[a.err]; return a.result; }
                    re.prototype.push = function (t, e) { const a = this.strm, i = this.options.chunkSize; let n, s; if (this.ended)
                        return !1; for (s = e === ~~e ? e : !0 === e ? te : Qt, "string" == typeof t ? a.input = Gt(t) : "[object ArrayBuffer]" === Jt.call(t) ? a.input = new Uint8Array(t) : a.input = t, a.next_in = 0, a.avail_in = a.input.length;;)
                        if (0 === a.avail_out && (a.output = new Uint8Array(i), a.next_out = 0, a.avail_out = i), (s === Vt || s === $t) && a.avail_out <= 6)
                            this.onData(a.output.subarray(0, a.next_out)), a.avail_out = 0;
                        else {
                            if (n = Mt.deflate(a, s), n === ae)
                                return a.next_out > 0 && this.onData(a.output.subarray(0, a.next_out)), n = Mt.deflateEnd(this.strm), this.onEnd(n), this.ended = !0, n === ee;
                            if (0 !== a.avail_out) {
                                if (s > 0 && a.next_out > 0)
                                    this.onData(a.output.subarray(0, a.next_out)), a.avail_out = 0;
                                else if (0 === a.avail_in)
                                    break;
                            }
                            else
                                this.onData(a.output);
                        } return !0; }, re.prototype.onData = function (t) { this.chunks.push(t); }, re.prototype.onEnd = function (t) { t === ee && (this.result = Kt(this.chunks)), this.chunks = [], this.err = t, this.msg = this.strm.msg; };
                    var le = { Deflate: re, deflate: oe, deflateRaw: function (t, e) { return (e = e || {}).raw = !0, oe(t, e); }, gzip: function (t, e) { return (e = e || {}).gzip = !0, oe(t, e); }, constants: K };
                    const he = 16209;
                    var de = function (t, e) { let a, i, n, s, r, o, l, h, d, _, f, c, u, w, m, b, g, p, k, v, y, x, z, A; const E = t.state; a = t.next_in, z = t.input, i = a + (t.avail_in - 5), n = t.next_out, A = t.output, s = n - (e - t.avail_out), r = n + (t.avail_out - 257), o = E.dmax, l = E.wsize, h = E.whave, d = E.wnext, _ = E.window, f = E.hold, c = E.bits, u = E.lencode, w = E.distcode, m = (1 << E.lenbits) - 1, b = (1 << E.distbits) - 1; t: do {
                        c < 15 && (f += z[a++] << c, c += 8, f += z[a++] << c, c += 8), g = u[f & m];
                        e: for (;;) {
                            if (p = g >>> 24, f >>>= p, c -= p, p = g >>> 16 & 255, 0 === p)
                                A[n++] = 65535 & g;
                            else {
                                if (!(16 & p)) {
                                    if (0 == (64 & p)) {
                                        g = u[(65535 & g) + (f & (1 << p) - 1)];
                                        continue e;
                                    }
                                    if (32 & p) {
                                        E.mode = 16191;
                                        break t;
                                    }
                                    t.msg = "invalid literal/length code", E.mode = he;
                                    break t;
                                }
                                k = 65535 & g, p &= 15, p && (c < p && (f += z[a++] << c, c += 8), k += f & (1 << p) - 1, f >>>= p, c -= p), c < 15 && (f += z[a++] << c, c += 8, f += z[a++] << c, c += 8), g = w[f & b];
                                a: for (;;) {
                                    if (p = g >>> 24, f >>>= p, c -= p, p = g >>> 16 & 255, !(16 & p)) {
                                        if (0 == (64 & p)) {
                                            g = w[(65535 & g) + (f & (1 << p) - 1)];
                                            continue a;
                                        }
                                        t.msg = "invalid distance code", E.mode = he;
                                        break t;
                                    }
                                    if (v = 65535 & g, p &= 15, c < p && (f += z[a++] << c, c += 8, c < p && (f += z[a++] << c, c += 8)), v += f & (1 << p) - 1, v > o) {
                                        t.msg = "invalid distance too far back", E.mode = he;
                                        break t;
                                    }
                                    if (f >>>= p, c -= p, p = n - s, v > p) {
                                        if (p = v - p, p > h && E.sane) {
                                            t.msg = "invalid distance too far back", E.mode = he;
                                            break t;
                                        }
                                        if (y = 0, x = _, 0 === d) {
                                            if (y += l - p, p < k) {
                                                k -= p;
                                                do {
                                                    A[n++] = _[y++];
                                                } while (--p);
                                                y = n - v, x = A;
                                            }
                                        }
                                        else if (d < p) {
                                            if (y += l + d - p, p -= d, p < k) {
                                                k -= p;
                                                do {
                                                    A[n++] = _[y++];
                                                } while (--p);
                                                if (y = 0, d < k) {
                                                    p = d, k -= p;
                                                    do {
                                                        A[n++] = _[y++];
                                                    } while (--p);
                                                    y = n - v, x = A;
                                                }
                                            }
                                        }
                                        else if (y += d - p, p < k) {
                                            k -= p;
                                            do {
                                                A[n++] = _[y++];
                                            } while (--p);
                                            y = n - v, x = A;
                                        }
                                        for (; k > 2;)
                                            A[n++] = x[y++], A[n++] = x[y++], A[n++] = x[y++], k -= 3;
                                        k && (A[n++] = x[y++], k > 1 && (A[n++] = x[y++]));
                                    }
                                    else {
                                        y = n - v;
                                        do {
                                            A[n++] = A[y++], A[n++] = A[y++], A[n++] = A[y++], k -= 3;
                                        } while (k > 2);
                                        k && (A[n++] = A[y++], k > 1 && (A[n++] = A[y++]));
                                    }
                                    break;
                                }
                            }
                            break;
                        }
                    } while (a < i && n < r); k = c >> 3, a -= k, c -= k << 3, f &= (1 << c) - 1, t.next_in = a, t.next_out = n, t.avail_in = a < i ? i - a + 5 : 5 - (a - i), t.avail_out = n < r ? r - n + 257 : 257 - (n - r), E.hold = f, E.bits = c; };
                    const _e = 15, fe = new Uint16Array([3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0]), ce = new Uint8Array([16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18, 19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78]), ue = new Uint16Array([1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 0, 0]), we = new Uint8Array([16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23, 23, 24, 24, 25, 25, 26, 26, 27, 27, 28, 28, 29, 29, 64, 64]);
                    var me = (t, e, a, i, n, s, r, o) => { const l = o.bits; let h, d, _, f, c, u, w = 0, m = 0, b = 0, g = 0, p = 0, k = 0, v = 0, y = 0, x = 0, z = 0, A = null; const E = new Uint16Array(16), R = new Uint16Array(16); let Z, U, S, D = null; for (w = 0; w <= _e; w++)
                        E[w] = 0; for (m = 0; m < i; m++)
                        E[e[a + m]]++; for (p = l, g = _e; g >= 1 && 0 === E[g]; g--)
                        ; if (p > g && (p = g), 0 === g)
                        return n[s++] = 20971520, n[s++] = 20971520, o.bits = 1, 0; for (b = 1; b < g && 0 === E[b]; b++)
                        ; for (p < b && (p = b), y = 1, w = 1; w <= _e; w++)
                        if (y <<= 1, y -= E[w], y < 0)
                            return -1; if (y > 0 && (0 === t || 1 !== g))
                        return -1; for (R[1] = 0, w = 1; w < _e; w++)
                        R[w + 1] = R[w] + E[w]; for (m = 0; m < i; m++)
                        0 !== e[a + m] && (r[R[e[a + m]]++] = m); if (0 === t ? (A = D = r, u = 20) : 1 === t ? (A = fe, D = ce, u = 257) : (A = ue, D = we, u = 0), z = 0, m = 0, w = b, c = s, k = p, v = 0, _ = -1, x = 1 << p, f = x - 1, 1 === t && x > 852 || 2 === t && x > 592)
                        return 1; for (;;) {
                        Z = w - v, r[m] + 1 < u ? (U = 0, S = r[m]) : r[m] >= u ? (U = D[r[m] - u], S = A[r[m] - u]) : (U = 96, S = 0), h = 1 << w - v, d = 1 << k, b = d;
                        do {
                            d -= h, n[c + (z >> v) + d] = Z << 24 | U << 16 | S | 0;
                        } while (0 !== d);
                        for (h = 1 << w - 1; z & h;)
                            h >>= 1;
                        if (0 !== h ? (z &= h - 1, z += h) : z = 0, m++, 0 == --E[w]) {
                            if (w === g)
                                break;
                            w = e[a + r[m]];
                        }
                        if (w > p && (z & f) !== _) {
                            for (0 === v && (v = p), c += b, k = w - v, y = 1 << k; k + v < g && (y -= E[k + v], !(y <= 0));)
                                k++, y <<= 1;
                            if (x += 1 << k, 1 === t && x > 852 || 2 === t && x > 592)
                                return 1;
                            _ = z & f, n[_] = p << 24 | k << 16 | c - s | 0;
                        }
                    } return 0 !== z && (n[c + z] = w - v << 24 | 64 << 16 | 0), o.bits = p, 0; };
                    const { Z_FINISH: be, Z_BLOCK: ge, Z_TREES: pe, Z_OK: ke, Z_STREAM_END: ve, Z_NEED_DICT: ye, Z_STREAM_ERROR: xe, Z_DATA_ERROR: ze, Z_MEM_ERROR: Ae, Z_BUF_ERROR: Ee, Z_DEFLATED: Re } = K, Ze = 16180, Ue = 16190, Se = 16191, De = 16192, Te = 16194, Oe = 16199, Ie = 16200, Fe = 16206, Le = 16209, Ne = t => (t >>> 24 & 255) + (t >>> 8 & 65280) + ((65280 & t) << 8) + ((255 & t) << 24);
                    function Be() { this.strm = null, this.mode = 0, this.last = !1, this.wrap = 0, this.havedict = !1, this.flags = 0, this.dmax = 0, this.check = 0, this.total = 0, this.head = null, this.wbits = 0, this.wsize = 0, this.whave = 0, this.wnext = 0, this.window = null, this.hold = 0, this.bits = 0, this.length = 0, this.offset = 0, this.extra = 0, this.lencode = null, this.distcode = null, this.lenbits = 0, this.distbits = 0, this.ncode = 0, this.nlen = 0, this.ndist = 0, this.have = 0, this.next = null, this.lens = new Uint16Array(320), this.work = new Uint16Array(288), this.lendyn = null, this.distdyn = null, this.sane = 0, this.back = 0, this.was = 0; }
                    const Ce = t => { if (!t)
                        return 1; const e = t.state; return !e || e.strm !== t || e.mode < Ze || e.mode > 16211 ? 1 : 0; }, Me = t => { if (Ce(t))
                        return xe; const e = t.state; return t.total_in = t.total_out = e.total = 0, t.msg = "", e.wrap && (t.adler = 1 & e.wrap), e.mode = Ze, e.last = 0, e.havedict = 0, e.flags = -1, e.dmax = 32768, e.head = null, e.hold = 0, e.bits = 0, e.lencode = e.lendyn = new Int32Array(852), e.distcode = e.distdyn = new Int32Array(592), e.sane = 1, e.back = -1, ke; }, He = t => { if (Ce(t))
                        return xe; const e = t.state; return e.wsize = 0, e.whave = 0, e.wnext = 0, Me(t); }, je = (t, e) => { let a; if (Ce(t))
                        return xe; const i = t.state; return e < 0 ? (a = 0, e = -e) : (a = 5 + (e >> 4), e < 48 && (e &= 15)), e && (e < 8 || e > 15) ? xe : (null !== i.window && i.wbits !== e && (i.window = null), i.wrap = a, i.wbits = e, He(t)); }, Ke = (t, e) => { if (!t)
                        return xe; const a = new Be; t.state = a, a.strm = t, a.window = null, a.mode = Ze; const i = je(t, e); return i !== ke && (t.state = null), i; };
                    let Pe, Ye, Ge = !0;
                    const Xe = t => { if (Ge) {
                        Pe = new Int32Array(512), Ye = new Int32Array(32);
                        let e = 0;
                        for (; e < 144;)
                            t.lens[e++] = 8;
                        for (; e < 256;)
                            t.lens[e++] = 9;
                        for (; e < 280;)
                            t.lens[e++] = 7;
                        for (; e < 288;)
                            t.lens[e++] = 8;
                        for (me(1, t.lens, 0, 288, Pe, 0, t.work, { bits: 9 }), e = 0; e < 32;)
                            t.lens[e++] = 5;
                        me(2, t.lens, 0, 32, Ye, 0, t.work, { bits: 5 }), Ge = !1;
                    } t.lencode = Pe, t.lenbits = 9, t.distcode = Ye, t.distbits = 5; }, We = (t, e, a, i) => { let n; const s = t.state; return null === s.window && (s.wsize = 1 << s.wbits, s.wnext = 0, s.whave = 0, s.window = new Uint8Array(s.wsize)), i >= s.wsize ? (s.window.set(e.subarray(a - s.wsize, a), 0), s.wnext = 0, s.whave = s.wsize) : (n = s.wsize - s.wnext, n > i && (n = i), s.window.set(e.subarray(a - i, a - i + n), s.wnext), (i -= n) ? (s.window.set(e.subarray(a - i, a), 0), s.wnext = i, s.whave = s.wsize) : (s.wnext += n, s.wnext === s.wsize && (s.wnext = 0), s.whave < s.wsize && (s.whave += n))), 0; };
                    var qe = { inflateReset: He, inflateReset2: je, inflateResetKeep: Me, inflateInit: t => Ke(t, 15), inflateInit2: Ke, inflate: (t, e) => { let a, i, n, s, r, o, l, h, d, _, f, c, u, w, m, b, g, p, k, v, y, x, z = 0; const A = new Uint8Array(4); let E, R; const Z = new Uint8Array([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]); if (Ce(t) || !t.output || !t.input && 0 !== t.avail_in)
                            return xe; a = t.state, a.mode === Se && (a.mode = De), r = t.next_out, n = t.output, l = t.avail_out, s = t.next_in, i = t.input, o = t.avail_in, h = a.hold, d = a.bits, _ = o, f = l, x = ke; t: for (;;)
                            switch (a.mode) {
                                case Ze:
                                    if (0 === a.wrap) {
                                        a.mode = De;
                                        break;
                                    }
                                    for (; d < 16;) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    if (2 & a.wrap && 35615 === h) {
                                        0 === a.wbits && (a.wbits = 15), a.check = 0, A[0] = 255 & h, A[1] = h >>> 8 & 255, a.check = H(a.check, A, 2, 0), h = 0, d = 0, a.mode = 16181;
                                        break;
                                    }
                                    if (a.head && (a.head.done = !1), !(1 & a.wrap) || (((255 & h) << 8) + (h >> 8)) % 31) {
                                        t.msg = "incorrect header check", a.mode = Le;
                                        break;
                                    }
                                    if ((15 & h) !== Re) {
                                        t.msg = "unknown compression method", a.mode = Le;
                                        break;
                                    }
                                    if (h >>>= 4, d -= 4, y = 8 + (15 & h), 0 === a.wbits && (a.wbits = y), y > 15 || y > a.wbits) {
                                        t.msg = "invalid window size", a.mode = Le;
                                        break;
                                    }
                                    a.dmax = 1 << a.wbits, a.flags = 0, t.adler = a.check = 1, a.mode = 512 & h ? 16189 : Se, h = 0, d = 0;
                                    break;
                                case 16181:
                                    for (; d < 16;) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    if (a.flags = h, (255 & a.flags) !== Re) {
                                        t.msg = "unknown compression method", a.mode = Le;
                                        break;
                                    }
                                    if (57344 & a.flags) {
                                        t.msg = "unknown header flags set", a.mode = Le;
                                        break;
                                    }
                                    a.head && (a.head.text = h >> 8 & 1), 512 & a.flags && 4 & a.wrap && (A[0] = 255 & h, A[1] = h >>> 8 & 255, a.check = H(a.check, A, 2, 0)), h = 0, d = 0, a.mode = 16182;
                                case 16182:
                                    for (; d < 32;) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    a.head && (a.head.time = h), 512 & a.flags && 4 & a.wrap && (A[0] = 255 & h, A[1] = h >>> 8 & 255, A[2] = h >>> 16 & 255, A[3] = h >>> 24 & 255, a.check = H(a.check, A, 4, 0)), h = 0, d = 0, a.mode = 16183;
                                case 16183:
                                    for (; d < 16;) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    a.head && (a.head.xflags = 255 & h, a.head.os = h >> 8), 512 & a.flags && 4 & a.wrap && (A[0] = 255 & h, A[1] = h >>> 8 & 255, a.check = H(a.check, A, 2, 0)), h = 0, d = 0, a.mode = 16184;
                                case 16184:
                                    if (1024 & a.flags) {
                                        for (; d < 16;) {
                                            if (0 === o)
                                                break t;
                                            o--, h += i[s++] << d, d += 8;
                                        }
                                        a.length = h, a.head && (a.head.extra_len = h), 512 & a.flags && 4 & a.wrap && (A[0] = 255 & h, A[1] = h >>> 8 & 255, a.check = H(a.check, A, 2, 0)), h = 0, d = 0;
                                    }
                                    else
                                        a.head && (a.head.extra = null);
                                    a.mode = 16185;
                                case 16185:
                                    if (1024 & a.flags && (c = a.length, c > o && (c = o), c && (a.head && (y = a.head.extra_len - a.length, a.head.extra || (a.head.extra = new Uint8Array(a.head.extra_len)), a.head.extra.set(i.subarray(s, s + c), y)), 512 & a.flags && 4 & a.wrap && (a.check = H(a.check, i, c, s)), o -= c, s += c, a.length -= c), a.length))
                                        break t;
                                    a.length = 0, a.mode = 16186;
                                case 16186:
                                    if (2048 & a.flags) {
                                        if (0 === o)
                                            break t;
                                        c = 0;
                                        do {
                                            y = i[s + c++], a.head && y && a.length < 65536 && (a.head.name += String.fromCharCode(y));
                                        } while (y && c < o);
                                        if (512 & a.flags && 4 & a.wrap && (a.check = H(a.check, i, c, s)), o -= c, s += c, y)
                                            break t;
                                    }
                                    else
                                        a.head && (a.head.name = null);
                                    a.length = 0, a.mode = 16187;
                                case 16187:
                                    if (4096 & a.flags) {
                                        if (0 === o)
                                            break t;
                                        c = 0;
                                        do {
                                            y = i[s + c++], a.head && y && a.length < 65536 && (a.head.comment += String.fromCharCode(y));
                                        } while (y && c < o);
                                        if (512 & a.flags && 4 & a.wrap && (a.check = H(a.check, i, c, s)), o -= c, s += c, y)
                                            break t;
                                    }
                                    else
                                        a.head && (a.head.comment = null);
                                    a.mode = 16188;
                                case 16188:
                                    if (512 & a.flags) {
                                        for (; d < 16;) {
                                            if (0 === o)
                                                break t;
                                            o--, h += i[s++] << d, d += 8;
                                        }
                                        if (4 & a.wrap && h !== (65535 & a.check)) {
                                            t.msg = "header crc mismatch", a.mode = Le;
                                            break;
                                        }
                                        h = 0, d = 0;
                                    }
                                    a.head && (a.head.hcrc = a.flags >> 9 & 1, a.head.done = !0), t.adler = a.check = 0, a.mode = Se;
                                    break;
                                case 16189:
                                    for (; d < 32;) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    t.adler = a.check = Ne(h), h = 0, d = 0, a.mode = Ue;
                                case Ue:
                                    if (0 === a.havedict)
                                        return t.next_out = r, t.avail_out = l, t.next_in = s, t.avail_in = o, a.hold = h, a.bits = d, ye;
                                    t.adler = a.check = 1, a.mode = Se;
                                case Se: if (e === ge || e === pe)
                                    break t;
                                case De:
                                    if (a.last) {
                                        h >>>= 7 & d, d -= 7 & d, a.mode = Fe;
                                        break;
                                    }
                                    for (; d < 3;) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    switch (a.last = 1 & h, h >>>= 1, d -= 1, 3 & h) {
                                        case 0:
                                            a.mode = 16193;
                                            break;
                                        case 1:
                                            if (Xe(a), a.mode = Oe, e === pe) {
                                                h >>>= 2, d -= 2;
                                                break t;
                                            }
                                            break;
                                        case 2:
                                            a.mode = 16196;
                                            break;
                                        case 3: t.msg = "invalid block type", a.mode = Le;
                                    }
                                    h >>>= 2, d -= 2;
                                    break;
                                case 16193:
                                    for (h >>>= 7 & d, d -= 7 & d; d < 32;) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    if ((65535 & h) != (h >>> 16 ^ 65535)) {
                                        t.msg = "invalid stored block lengths", a.mode = Le;
                                        break;
                                    }
                                    if (a.length = 65535 & h, h = 0, d = 0, a.mode = Te, e === pe)
                                        break t;
                                case Te: a.mode = 16195;
                                case 16195:
                                    if (c = a.length, c) {
                                        if (c > o && (c = o), c > l && (c = l), 0 === c)
                                            break t;
                                        n.set(i.subarray(s, s + c), r), o -= c, s += c, l -= c, r += c, a.length -= c;
                                        break;
                                    }
                                    a.mode = Se;
                                    break;
                                case 16196:
                                    for (; d < 14;) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    if (a.nlen = 257 + (31 & h), h >>>= 5, d -= 5, a.ndist = 1 + (31 & h), h >>>= 5, d -= 5, a.ncode = 4 + (15 & h), h >>>= 4, d -= 4, a.nlen > 286 || a.ndist > 30) {
                                        t.msg = "too many length or distance symbols", a.mode = Le;
                                        break;
                                    }
                                    a.have = 0, a.mode = 16197;
                                case 16197:
                                    for (; a.have < a.ncode;) {
                                        for (; d < 3;) {
                                            if (0 === o)
                                                break t;
                                            o--, h += i[s++] << d, d += 8;
                                        }
                                        a.lens[Z[a.have++]] = 7 & h, h >>>= 3, d -= 3;
                                    }
                                    for (; a.have < 19;)
                                        a.lens[Z[a.have++]] = 0;
                                    if (a.lencode = a.lendyn, a.lenbits = 7, E = { bits: a.lenbits }, x = me(0, a.lens, 0, 19, a.lencode, 0, a.work, E), a.lenbits = E.bits, x) {
                                        t.msg = "invalid code lengths set", a.mode = Le;
                                        break;
                                    }
                                    a.have = 0, a.mode = 16198;
                                case 16198:
                                    for (; a.have < a.nlen + a.ndist;) {
                                        for (; z = a.lencode[h & (1 << a.lenbits) - 1], m = z >>> 24, b = z >>> 16 & 255, g = 65535 & z, !(m <= d);) {
                                            if (0 === o)
                                                break t;
                                            o--, h += i[s++] << d, d += 8;
                                        }
                                        if (g < 16)
                                            h >>>= m, d -= m, a.lens[a.have++] = g;
                                        else {
                                            if (16 === g) {
                                                for (R = m + 2; d < R;) {
                                                    if (0 === o)
                                                        break t;
                                                    o--, h += i[s++] << d, d += 8;
                                                }
                                                if (h >>>= m, d -= m, 0 === a.have) {
                                                    t.msg = "invalid bit length repeat", a.mode = Le;
                                                    break;
                                                }
                                                y = a.lens[a.have - 1], c = 3 + (3 & h), h >>>= 2, d -= 2;
                                            }
                                            else if (17 === g) {
                                                for (R = m + 3; d < R;) {
                                                    if (0 === o)
                                                        break t;
                                                    o--, h += i[s++] << d, d += 8;
                                                }
                                                h >>>= m, d -= m, y = 0, c = 3 + (7 & h), h >>>= 3, d -= 3;
                                            }
                                            else {
                                                for (R = m + 7; d < R;) {
                                                    if (0 === o)
                                                        break t;
                                                    o--, h += i[s++] << d, d += 8;
                                                }
                                                h >>>= m, d -= m, y = 0, c = 11 + (127 & h), h >>>= 7, d -= 7;
                                            }
                                            if (a.have + c > a.nlen + a.ndist) {
                                                t.msg = "invalid bit length repeat", a.mode = Le;
                                                break;
                                            }
                                            for (; c--;)
                                                a.lens[a.have++] = y;
                                        }
                                    }
                                    if (a.mode === Le)
                                        break;
                                    if (0 === a.lens[256]) {
                                        t.msg = "invalid code -- missing end-of-block", a.mode = Le;
                                        break;
                                    }
                                    if (a.lenbits = 9, E = { bits: a.lenbits }, x = me(1, a.lens, 0, a.nlen, a.lencode, 0, a.work, E), a.lenbits = E.bits, x) {
                                        t.msg = "invalid literal/lengths set", a.mode = Le;
                                        break;
                                    }
                                    if (a.distbits = 6, a.distcode = a.distdyn, E = { bits: a.distbits }, x = me(2, a.lens, a.nlen, a.ndist, a.distcode, 0, a.work, E), a.distbits = E.bits, x) {
                                        t.msg = "invalid distances set", a.mode = Le;
                                        break;
                                    }
                                    if (a.mode = Oe, e === pe)
                                        break t;
                                case Oe: a.mode = Ie;
                                case Ie:
                                    if (o >= 6 && l >= 258) {
                                        t.next_out = r, t.avail_out = l, t.next_in = s, t.avail_in = o, a.hold = h, a.bits = d, de(t, f), r = t.next_out, n = t.output, l = t.avail_out, s = t.next_in, i = t.input, o = t.avail_in, h = a.hold, d = a.bits, a.mode === Se && (a.back = -1);
                                        break;
                                    }
                                    for (a.back = 0; z = a.lencode[h & (1 << a.lenbits) - 1], m = z >>> 24, b = z >>> 16 & 255, g = 65535 & z, !(m <= d);) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    if (b && 0 == (240 & b)) {
                                        for (p = m, k = b, v = g; z = a.lencode[v + ((h & (1 << p + k) - 1) >> p)], m = z >>> 24, b = z >>> 16 & 255, g = 65535 & z, !(p + m <= d);) {
                                            if (0 === o)
                                                break t;
                                            o--, h += i[s++] << d, d += 8;
                                        }
                                        h >>>= p, d -= p, a.back += p;
                                    }
                                    if (h >>>= m, d -= m, a.back += m, a.length = g, 0 === b) {
                                        a.mode = 16205;
                                        break;
                                    }
                                    if (32 & b) {
                                        a.back = -1, a.mode = Se;
                                        break;
                                    }
                                    if (64 & b) {
                                        t.msg = "invalid literal/length code", a.mode = Le;
                                        break;
                                    }
                                    a.extra = 15 & b, a.mode = 16201;
                                case 16201:
                                    if (a.extra) {
                                        for (R = a.extra; d < R;) {
                                            if (0 === o)
                                                break t;
                                            o--, h += i[s++] << d, d += 8;
                                        }
                                        a.length += h & (1 << a.extra) - 1, h >>>= a.extra, d -= a.extra, a.back += a.extra;
                                    }
                                    a.was = a.length, a.mode = 16202;
                                case 16202:
                                    for (; z = a.distcode[h & (1 << a.distbits) - 1], m = z >>> 24, b = z >>> 16 & 255, g = 65535 & z, !(m <= d);) {
                                        if (0 === o)
                                            break t;
                                        o--, h += i[s++] << d, d += 8;
                                    }
                                    if (0 == (240 & b)) {
                                        for (p = m, k = b, v = g; z = a.distcode[v + ((h & (1 << p + k) - 1) >> p)], m = z >>> 24, b = z >>> 16 & 255, g = 65535 & z, !(p + m <= d);) {
                                            if (0 === o)
                                                break t;
                                            o--, h += i[s++] << d, d += 8;
                                        }
                                        h >>>= p, d -= p, a.back += p;
                                    }
                                    if (h >>>= m, d -= m, a.back += m, 64 & b) {
                                        t.msg = "invalid distance code", a.mode = Le;
                                        break;
                                    }
                                    a.offset = g, a.extra = 15 & b, a.mode = 16203;
                                case 16203:
                                    if (a.extra) {
                                        for (R = a.extra; d < R;) {
                                            if (0 === o)
                                                break t;
                                            o--, h += i[s++] << d, d += 8;
                                        }
                                        a.offset += h & (1 << a.extra) - 1, h >>>= a.extra, d -= a.extra, a.back += a.extra;
                                    }
                                    if (a.offset > a.dmax) {
                                        t.msg = "invalid distance too far back", a.mode = Le;
                                        break;
                                    }
                                    a.mode = 16204;
                                case 16204:
                                    if (0 === l)
                                        break t;
                                    if (c = f - l, a.offset > c) {
                                        if (c = a.offset - c, c > a.whave && a.sane) {
                                            t.msg = "invalid distance too far back", a.mode = Le;
                                            break;
                                        }
                                        c > a.wnext ? (c -= a.wnext, u = a.wsize - c) : u = a.wnext - c, c > a.length && (c = a.length), w = a.window;
                                    }
                                    else
                                        w = n, u = r - a.offset, c = a.length;
                                    c > l && (c = l), l -= c, a.length -= c;
                                    do {
                                        n[r++] = w[u++];
                                    } while (--c);
                                    0 === a.length && (a.mode = Ie);
                                    break;
                                case 16205:
                                    if (0 === l)
                                        break t;
                                    n[r++] = a.length, l--, a.mode = Ie;
                                    break;
                                case Fe:
                                    if (a.wrap) {
                                        for (; d < 32;) {
                                            if (0 === o)
                                                break t;
                                            o--, h |= i[s++] << d, d += 8;
                                        }
                                        if (f -= l, t.total_out += f, a.total += f, 4 & a.wrap && f && (t.adler = a.check = a.flags ? H(a.check, n, f, r - f) : C(a.check, n, f, r - f)), f = l, 4 & a.wrap && (a.flags ? h : Ne(h)) !== a.check) {
                                            t.msg = "incorrect data check", a.mode = Le;
                                            break;
                                        }
                                        h = 0, d = 0;
                                    }
                                    a.mode = 16207;
                                case 16207:
                                    if (a.wrap && a.flags) {
                                        for (; d < 32;) {
                                            if (0 === o)
                                                break t;
                                            o--, h += i[s++] << d, d += 8;
                                        }
                                        if (4 & a.wrap && h !== (4294967295 & a.total)) {
                                            t.msg = "incorrect length check", a.mode = Le;
                                            break;
                                        }
                                        h = 0, d = 0;
                                    }
                                    a.mode = 16208;
                                case 16208:
                                    x = ve;
                                    break t;
                                case Le:
                                    x = ze;
                                    break t;
                                case 16210: return Ae;
                                default: return xe;
                            } return t.next_out = r, t.avail_out = l, t.next_in = s, t.avail_in = o, a.hold = h, a.bits = d, (a.wsize || f !== t.avail_out && a.mode < Le && (a.mode < Fe || e !== be)) && We(t, t.output, t.next_out, f - t.avail_out), _ -= t.avail_in, f -= t.avail_out, t.total_in += _, t.total_out += f, a.total += f, 4 & a.wrap && f && (t.adler = a.check = a.flags ? H(a.check, n, f, t.next_out - f) : C(a.check, n, f, t.next_out - f)), t.data_type = a.bits + (a.last ? 64 : 0) + (a.mode === Se ? 128 : 0) + (a.mode === Oe || a.mode === Te ? 256 : 0), (0 === _ && 0 === f || e === be) && x === ke && (x = Ee), x; }, inflateEnd: t => { if (Ce(t))
                            return xe; let e = t.state; return e.window && (e.window = null), t.state = null, ke; }, inflateGetHeader: (t, e) => { if (Ce(t))
                            return xe; const a = t.state; return 0 == (2 & a.wrap) ? xe : (a.head = e, e.done = !1, ke); }, inflateSetDictionary: (t, e) => { const a = e.length; let i, n, s; return Ce(t) ? xe : (i = t.state, 0 !== i.wrap && i.mode !== Ue ? xe : i.mode === Ue && (n = 1, n = C(n, e, a, 0), n !== i.check) ? ze : (s = We(t, e, a, a), s ? (i.mode = 16210, Ae) : (i.havedict = 1, ke))); }, inflateInfo: "pako inflate (from Nodeca project)" };
                    var Je = function () { this.text = 0, this.time = 0, this.xflags = 0, this.os = 0, this.extra = null, this.extra_len = 0, this.name = "", this.comment = "", this.hcrc = 0, this.done = !1; };
                    const Qe = Object.prototype.toString, { Z_NO_FLUSH: Ve, Z_FINISH: $e, Z_OK: ta, Z_STREAM_END: ea, Z_NEED_DICT: aa, Z_STREAM_ERROR: ia, Z_DATA_ERROR: na, Z_MEM_ERROR: sa } = K;
                    function ra(t) { this.options = jt({ chunkSize: 65536, windowBits: 15, to: "" }, t || {}); const e = this.options; e.raw && e.windowBits >= 0 && e.windowBits < 16 && (e.windowBits = -e.windowBits, 0 === e.windowBits && (e.windowBits = -15)), !(e.windowBits >= 0 && e.windowBits < 16) || t && t.windowBits || (e.windowBits += 32), e.windowBits > 15 && e.windowBits < 48 && 0 == (15 & e.windowBits) && (e.windowBits |= 15), this.err = 0, this.msg = "", this.ended = !1, this.chunks = [], this.strm = new qt, this.strm.avail_out = 0; let a = qe.inflateInit2(this.strm, e.windowBits); if (a !== ta)
                        throw new Error(j[a]); if (this.header = new Je, qe.inflateGetHeader(this.strm, this.header), e.dictionary && ("string" == typeof e.dictionary ? e.dictionary = Gt(e.dictionary) : "[object ArrayBuffer]" === Qe.call(e.dictionary) && (e.dictionary = new Uint8Array(e.dictionary)), e.raw && (a = qe.inflateSetDictionary(this.strm, e.dictionary), a !== ta)))
                        throw new Error(j[a]); }
                    function oa(t, e) { const a = new ra(e); if (a.push(t), a.err)
                        throw a.msg || j[a.err]; return a.result; }
                    ra.prototype.push = function (t, e) { const a = this.strm, i = this.options.chunkSize, n = this.options.dictionary; let s, r, o; if (this.ended)
                        return !1; for (r = e === ~~e ? e : !0 === e ? $e : Ve, "[object ArrayBuffer]" === Qe.call(t) ? a.input = new Uint8Array(t) : a.input = t, a.next_in = 0, a.avail_in = a.input.length;;) {
                        for (0 === a.avail_out && (a.output = new Uint8Array(i), a.next_out = 0, a.avail_out = i), s = qe.inflate(a, r), s === aa && n && (s = qe.inflateSetDictionary(a, n), s === ta ? s = qe.inflate(a, r) : s === na && (s = aa)); a.avail_in > 0 && s === ea && a.state.wrap > 0 && 0 !== t[a.next_in];)
                            qe.inflateReset(a), s = qe.inflate(a, r);
                        switch (s) {
                            case ia:
                            case na:
                            case aa:
                            case sa: return this.onEnd(s), this.ended = !0, !1;
                        }
                        if (o = a.avail_out, a.next_out && (0 === a.avail_out || s === ea))
                            if ("string" === this.options.to) {
                                let t = Wt(a.output, a.next_out), e = a.next_out - t, n = Xt(a.output, t);
                                a.next_out = e, a.avail_out = i - e, e && a.output.set(a.output.subarray(t, t + e), 0), this.onData(n);
                            }
                            else
                                this.onData(a.output.length === a.next_out ? a.output : a.output.subarray(0, a.next_out));
                        if (s !== ta || 0 !== o) {
                            if (s === ea)
                                return s = qe.inflateEnd(this.strm), this.onEnd(s), this.ended = !0, !0;
                            if (0 === a.avail_in)
                                break;
                        }
                    } return !0; }, ra.prototype.onData = function (t) { this.chunks.push(t); }, ra.prototype.onEnd = function (t) { t === ta && ("string" === this.options.to ? this.result = this.chunks.join("") : this.result = Kt(this.chunks)), this.chunks = [], this.err = t, this.msg = this.strm.msg; };
                    var la = { Inflate: ra, inflate: oa, inflateRaw: function (t, e) { return (e = e || {}).raw = !0, oa(t, e); }, ungzip: oa, constants: K };
                    const { Deflate: ha, deflate: da, deflateRaw: _a, gzip: fa } = le, { Inflate: ca, inflate: ua, inflateRaw: wa, ungzip: ma } = la;
                    var ba = ha, ga = da, pa = _a, ka = fa, va = ca, ya = ua, xa = wa, za = ma, Aa = K, Ea = { Deflate: ba, deflate: ga, deflateRaw: pa, gzip: ka, Inflate: va, inflate: ya, inflateRaw: xa, ungzip: za, constants: Aa };
                    t.Deflate = ba, t.Inflate = va, t.constants = Aa, t.default = Ea, t.deflate = ga, t.deflateRaw = pa, t.gzip = ka, t.inflate = ya, t.inflateRaw = xa, t.ungzip = za, Object.defineProperty(t, "__esModule", { value: !0 });
                }));
                const $ = {};
                $.done = (obj) => $done(obj);
                function biliReadVarint(buf, pos) {
                    let result = 0, shift = 0;
                    while (pos < buf.length) {
                        const b = buf[pos++];
                        result |= (b & 0x7F) << shift;
                        if (shift >= 28) { }
                        if (!(b & 0x80))
                            break;
                        shift += 7;
                    }
                    return [result >>> 0, pos];
                }
                function biliWriteVarint(val) {
                    const out = [];
                    val = val >>> 0;
                    while (val > 0x7F) {
                        out.push((val & 0x7F) | 0x80);
                        val >>>= 7;
                    }
                    out.push(val & 0x7F);
                    return out;
                }
                function biliParseFields(buf, offset, limit) {
                    offset = offset || 0;
                    limit = limit || buf.length;
                    const fields = [];
                    let pos = offset;
                    while (pos < limit) {
                        const start = pos;
                        let tag;
                        [tag, pos] = biliReadVarint(buf, pos);
                        const fieldNo = tag >>> 3;
                        const wireType = tag & 0x07;
                        if (fieldNo === 0 || fieldNo > 50000)
                            break;
                        if (wireType === 0) {
                            while (pos < limit && buf[pos] & 0x80)
                                pos++;
                            pos++;
                        }
                        else if (wireType === 1) {
                            pos += 8;
                        }
                        else if (wireType === 2) {
                            let len;
                            [len, pos] = biliReadVarint(buf, pos);
                            if (len < 0 || pos + len > limit)
                                break;
                            pos += len;
                        }
                        else if (wireType === 5) {
                            pos += 4;
                        }
                        else {
                            break;
                        }
                        if (pos > limit)
                            break;
                        fields.push({ fieldNo, wireType, start, end: pos });
                    }
                    return fields;
                }
                function biliGetInner(buf, start, end) { let pos = start; let tag; [tag, pos] = biliReadVarint(buf, pos); let len; [len, pos] = biliReadVarint(buf, pos); return [pos, pos + len]; }
                function biliRebuildField(fieldNo, payload) { const tag = biliWriteVarint((fieldNo << 3) | 2); const len = biliWriteVarint(payload.length); const out = new Uint8Array(tag.length + len.length + payload.length); out.set(tag, 0); out.set(len, tag.length); out.set(payload, tag.length + len.length); return out; }
                const AD_MARKERS = [[0x53, 0x6F, 0x75, 0x72, 0x63, 0x65, 0x43, 0x6F, 0x6E, 0x74, 0x65, 0x6E, 0x74, 0x44, 0x74, 0x6F], [0x61, 0x64, 0x2D, 0x63, 0x6F, 0x6D, 0x70, 0x6C, 0x61, 0x69, 0x6E], [0x62, 0x69, 0x6C, 0x69, 0x62, 0x69, 0x6C, 0x69, 0x2E, 0x61, 0x64, 0x2E, 0x76, 0x31],];
                function biliContainsAd(buf, start, end) {
                    for (const marker of AD_MARKERS) {
                        const mLen = marker.length;
                        outer: for (let i = start; i <= end - mLen; i++) {
                            for (let j = 0; j < mLen; j++) {
                                if (buf[i + j] !== marker[j])
                                    continue outer;
                            }
                            return true;
                        }
                    }
                    return false;
                }
                function biliConcat(arrays) {
                    let total = 0;
                    for (const a of arrays)
                        total += a.length;
                    const out = new Uint8Array(total);
                    let offset = 0;
                    for (const a of arrays) {
                        out.set(a, offset);
                        offset += a.length;
                    }
                    return out;
                }
                function biliRemoveAds(pbData) {
                    const buf = new Uint8Array(pbData);
                    const topFields = biliParseFields(buf, 0, buf.length);
                    const segments = [];
                    let removedField7 = false;
                    let cleanedField5 = false;
                    for (const f of topFields) {
                        if (f.fieldNo === 7) {
                            removedField7 = true;
                            continue;
                        }
                        if (f.fieldNo === 5 && !cleanedField5) {
                            cleanedField5 = true;
                            const cleaned = biliCleanField5(buf, f.start, f.end);
                            if (cleaned) {
                                segments.push(cleaned);
                                continue;
                            }
                        }
                        segments.push(buf.slice(f.start, f.end));
                    }
                    if (removedField7)
                        console.log('[B站净化] 已移除字段7（广告控制模块数据）');
                    return biliConcat(segments);
                }
                function biliCleanField5(buf, f5Start, f5End) {
                    try {
                        const [f5InnerStart, f5InnerEnd] = biliGetInner(buf, f5Start, f5End);
                        const f5Fields = biliParseFields(buf, f5InnerStart, f5InnerEnd);
                        const tabSegments = [];
                        let modified = false;
                        for (const tab of f5Fields) {
                            if (tab.fieldNo !== 1) {
                                tabSegments.push(buf.slice(tab.start, tab.end));
                                continue;
                            }
                            const [tabInnerStart, tabInnerEnd] = biliGetInner(buf, tab.start, tab.end);
                            const tabFields = biliParseFields(buf, tabInnerStart, tabInnerEnd);
                            let hasContentField2 = false;
                            for (const tf of tabFields) {
                                if (tf.fieldNo === 2 && (tf.end - tf.start) > 1000) {
                                    hasContentField2 = true;
                                }
                            }
                            if (!hasContentField2) {
                                tabSegments.push(buf.slice(tab.start, tab.end));
                                continue;
                            }
                            const tabParts = [];
                            for (const tf of tabFields) {
                                if (tf.fieldNo === 2 && (tf.end - tf.start) > 1000) {
                                    const cleaned = biliCleanContentField2(buf, tf.start, tf.end);
                                    if (cleaned) {
                                        tabParts.push(cleaned);
                                        modified = true;
                                    }
                                    else {
                                        tabParts.push(buf.slice(tf.start, tf.end));
                                    }
                                }
                                else {
                                    tabParts.push(buf.slice(tf.start, tf.end));
                                }
                            }
                            const tabPayload = biliConcat(tabParts);
                            tabSegments.push(biliRebuildField(1, tabPayload));
                        }
                        if (!modified)
                            return null;
                        const f5Payload = biliConcat(tabSegments);
                        return biliRebuildField(5, f5Payload);
                    }
                    catch (e) {
                        console.log('[B站净化] 清理字段5出错：' + e.message);
                        return null;
                    }
                }
                function biliCleanContentField2(buf, start, end) {
                    try {
                        const [innerStart, innerEnd] = biliGetInner(buf, start, end);
                        const fields = biliParseFields(buf, innerStart, innerEnd);
                        const parts = [];
                        let modified = false;
                        for (const f of fields) {
                            if (f.fieldNo === 2) {
                                const [modInnerStart, modInnerEnd] = biliGetInner(buf, f.start, f.end);
                                const modFields = biliParseFields(buf, modInnerStart, modInnerEnd);
                                let moduleType = -1;
                                for (const mf of modFields) {
                                    if (mf.fieldNo === 1 && mf.wireType === 0) {
                                        let pos = mf.start;
                                        let tag;
                                        [tag, pos] = biliReadVarint(buf, pos);
                                        [moduleType, pos] = biliReadVarint(buf, pos);
                                        break;
                                    }
                                }
                                if (moduleType === 55) {
                                    console.log('[B站净化] 已移除UP主分享好物推广模块');
                                    modified = true;
                                    continue;
                                }
                                if (moduleType === 28) {
                                    const cleaned = biliCleanRelatedModule(buf, f.start, f.end);
                                    if (cleaned) {
                                        parts.push(cleaned);
                                        modified = true;
                                        continue;
                                    }
                                }
                            }
                            parts.push(buf.slice(f.start, f.end));
                        }
                        if (!modified)
                            return null;
                        const payload = biliConcat(parts);
                        return biliRebuildField(2, payload);
                    }
                    catch (e) {
                        console.log('[B站净化] 清理 content 字段2 出错：' + e.message);
                        return null;
                    }
                }
                function biliCleanRelatedModule(buf, start, end) {
                    try {
                        const [modInnerStart, modInnerEnd] = biliGetInner(buf, start, end);
                        const modFields = biliParseFields(buf, modInnerStart, modInnerEnd);
                        const modParts = [];
                        let modified = false;
                        for (const mf of modFields) {
                            if (mf.fieldNo === 22) {
                                const cleaned = biliCleanField22(buf, mf.start, mf.end);
                                if (cleaned) {
                                    modParts.push(cleaned);
                                    modified = true;
                                    continue;
                                }
                            }
                            modParts.push(buf.slice(mf.start, mf.end));
                        }
                        if (!modified)
                            return null;
                        const payload = biliConcat(modParts);
                        return biliRebuildField(2, payload);
                    }
                    catch (e) {
                        console.log('[B站净化] 清理相关推荐模块出错：' + e.message);
                        return null;
                    }
                }
                function biliCleanField22(buf, start, end) {
                    try {
                        const [innerStart, innerEnd] = biliGetInner(buf, start, end);
                        const fields = biliParseFields(buf, innerStart, innerEnd);
                        const parts = [];
                        let removedCount = 0;
                        for (const f of fields) {
                            if (f.fieldNo === 1) {
                                if (biliContainsAd(buf, f.start, f.end)) {
                                    removedCount++;
                                    continue;
                                }
                            }
                            parts.push(buf.slice(f.start, f.end));
                        }
                        if (removedCount === 0)
                            return null;
                        console.log('[B站净化] 已从相关推荐列表移除 ' + removedCount + ' 条广告');
                        const payload = biliConcat(parts);
                        return biliRebuildField(22, payload);
                    }
                    catch (e) {
                        console.log('[B站净化] 清理字段22出错：' + e.message);
                        return null;
                    }
                }
                const UP_RCMD_MARKER = [0x75, 0x70, 0x5F, 0x72, 0x63, 0x6D, 0x64];
                function biliContainsUpRcmd(buf, start, end) {
                    const mLen = UP_RCMD_MARKER.length;
                    for (let i = start; i <= end - mLen; i++) {
                        let match = true;
                        for (let j = 0; j < mLen; j++) {
                            if (buf[i + j] !== UP_RCMD_MARKER[j]) {
                                match = false;
                                break;
                            }
                        }
                        if (match)
                            return true;
                    }
                    return false;
                }
                function biliCleanPopularIndex(pbData) {
                    const buf = new Uint8Array(pbData);
                    const topFields = biliParseFields(buf, 0, buf.length);
                    const segments = [];
                    let removedCount = 0;
                    for (const f of topFields) {
                        if (f.fieldNo === 1 && f.wireType === 2) {
                            if (biliContainsUpRcmd(buf, f.start, f.end)) {
                                removedCount++;
                                continue;
                            }
                        }
                        segments.push(buf.slice(f.start, f.end));
                    }
                    if (removedCount > 0) {
                        console.log('[B站净化] 已从热门页面移除 ' + removedCount + ' 条 UP 主推荐关注卡片');
                    }
                    return biliConcat(segments);
                }
                const DYN_UP_INTEREST_MARKER = [0xE4, 0xBD, 0xA0, 0xE5, 0x8F, 0xAF, 0xE8, 0x83, 0xBD, 0xE6, 0x84, 0x9F, 0xE5, 0x85, 0xB4, 0xE8, 0xB6, 0xA3];
                function biliContainsUpInterest(buf, start, end) {
                    const mLen = DYN_UP_INTEREST_MARKER.length;
                    for (let i = start; i <= end - mLen; i++) {
                        let match = true;
                        for (let j = 0; j < mLen; j++) {
                            if (buf[i + j] !== DYN_UP_INTEREST_MARKER[j]) {
                                match = false;
                                break;
                            }
                        }
                        if (match)
                            return true;
                    }
                    return false;
                }
                function biliCleanDynAll(pbData) {
                    const buf = new Uint8Array(pbData);
                    const topFields = biliParseFields(buf, 0, buf.length);
                    const topSegments = [];
                    let modified = false;
                    for (const tf of topFields) {
                        if (tf.fieldNo === 1 && tf.wireType === 2) {
                            const [innerStart, innerEnd] = biliGetInner(buf, tf.start, tf.end);
                            const innerFields = biliParseFields(buf, innerStart, innerEnd);
                            const parts = [];
                            let removedCount = 0;
                            for (const f of innerFields) {
                                if (f.fieldNo === 1 && f.wireType === 2) {
                                    if (biliContainsUpInterest(buf, f.start, f.end)) {
                                        removedCount++;
                                        continue;
                                    }
                                }
                                parts.push(buf.slice(f.start, f.end));
                            }
                            if (removedCount > 0) {
                                console.log('[B站净化] 已从动态页面移除 ' + removedCount + ' 条"你可能感兴趣的UP主"卡片');
                                const payload = biliConcat(parts);
                                topSegments.push(biliRebuildField(1, payload));
                                modified = true;
                                continue;
                            }
                        }
                        topSegments.push(buf.slice(tf.start, tf.end));
                    }
                    return modified ? biliConcat(topSegments) : new Uint8Array(pbData);
                }
                function biliCleanDefaultWords(pbData) {
                    const buf = new Uint8Array(pbData);
                    const fields = biliParseFields(buf, 0, buf.length);
                    const segments = [];
                    let cleared = false;
                    for (const f of fields) {
                        if ((f.fieldNo === 3 || f.fieldNo === 4) && f.wireType === 2) {
                            segments.push(new Uint8Array(biliWriteVarint((f.fieldNo << 3) | 2)));
                            segments.push(new Uint8Array([0]));
                            cleared = true;
                            continue;
                        }
                        segments.push(buf.slice(f.start, f.end));
                    }
                    if (cleared)
                        console.log('[B站净化] 已清空搜索框预填充推荐词');
                    return biliConcat(segments);
                }
                const VIP_BANNER_MARKER = [0x76, 0x69, 0x70, 0x2D, 0x6F, 0x70, 0x65, 0x6E, 0x2D, 0x62, 0x61, 0x6E, 0x6E, 0x65, 0x72];
                function biliContainsBytes(buf, start, end, marker) {
                    const mLen = marker.length;
                    for (let i = start; i <= end - mLen; i++) {
                        let ok = true;
                        for (let j = 0; j < mLen; j++) {
                            if (buf[i + j] !== marker[j]) {
                                ok = false;
                                break;
                            }
                        }
                        if (ok)
                            return true;
                    }
                    return false;
                }
                function biliCleanPlayViewUnite(pbData) {
                    const buf = new Uint8Array(pbData);
                    const topFields = biliParseFields(buf, 0, buf.length);
                    const segments = [];
                    let removed = 0;
                    for (const f of topFields) {
                        if (f.fieldNo === 5 && f.wireType === 2) {
                            if (biliContainsBytes(buf, f.start, f.end, VIP_BANNER_MARKER)) {
                                removed++;
                                continue;
                            }
                        }
                        segments.push(buf.slice(f.start, f.end));
                    }
                    if (removed > 0) {
                        console.log('[B站净化] 已从播放页移除 ' + removed + ' 条会员推广 banner');
                        return biliConcat(segments);
                    }
                    return new Uint8Array(pbData);
                }
                function biliDecodeGrpc(rawBody) {
                    const body = new Uint8Array(rawBody);
                    const compressFlag = body[0];
                    const msgLen = (body[1] << 24) | (body[2] << 16) | (body[3] << 8) | body[4];
                    const msgData = body.slice(5, 5 + msgLen);
                    let pbData;
                    if (compressFlag === 1) {
                        pbData = pako.ungzip(msgData);
                    }
                    else {
                        pbData = msgData;
                    }
                    return { compressFlag, pbData };
                }
                function biliEncodeGrpc(compressFlag, pbData) {
                    let outMsg;
                    if (compressFlag === 1) {
                        outMsg = pako.gzip(pbData);
                    }
                    else {
                        outMsg = pbData;
                    }
                    const outBuf = new Uint8Array(5 + outMsg.length);
                    outBuf[0] = compressFlag;
                    outBuf[1] = (outMsg.length >> 24) & 0xFF;
                    outBuf[2] = (outMsg.length >> 16) & 0xFF;
                    outBuf[3] = (outMsg.length >> 8) & 0xFF;
                    outBuf[4] = outMsg.length & 0xFF;
                    outBuf.set(outMsg, 5);
                    return outBuf;
                }
                function biliProcessResponse() {
                    const rawBody = $response.bodyBytes;
                    if (!rawBody || rawBody.byteLength < 5) {
                        console.log('[B站净化] 响应体为空或过小，跳过处理');
                        return $.done({});
                    }
                    const url = $request.url || '';
                    const isDefaultWords = url.indexOf('DefaultWords') !== -1;
                    const isViewView = url.indexOf('View/View') !== -1;
                    const isPopularIndex = url.indexOf('Popular/Index') !== -1;
                    const isDynAll = url.indexOf('DynAll') !== -1;
                    const isPlayViewUnite = url.indexOf('PlayViewUnite') !== -1;
                    try {
                        const { compressFlag, pbData } = biliDecodeGrpc(rawBody);
                        const apiName = isDefaultWords ? 'DefaultWords' : isViewView ? 'View/View' : isPopularIndex ? 'Popular/Index' : isDynAll ? 'DynAll' : isPlayViewUnite ? 'PlayViewUnite' : 'Unknown';
                        console.log('[B站净化] 接口：' + apiName);
                        console.log('[B站净化] Protobuf 大小：' + pbData.length + ' 字节');
                        let cleaned;
                        if (isDefaultWords) {
                            cleaned = biliCleanDefaultWords(pbData);
                        }
                        else if (isViewView) {
                            cleaned = biliRemoveAds(pbData);
                        }
                        else if (isPopularIndex) {
                            cleaned = biliCleanPopularIndex(pbData);
                        }
                        else if (isDynAll) {
                            cleaned = biliCleanDynAll(pbData);
                        }
                        else if (isPlayViewUnite) {
                            cleaned = biliCleanPlayViewUnite(pbData);
                        }
                        else {
                            console.log('[B站净化] 未知接口，跳过处理');
                            return $.done({});
                        }
                        console.log('[B站净化] 清理后大小：' + cleaned.length + ' 字节（差值：' + (pbData.length - cleaned.length) + '）');
                        const outBuf = biliEncodeGrpc(compressFlag, cleaned);
                        return $.done({ bodyBytes: outBuf.buffer });
                    }
                    catch (e) {
                        console.log('[B站净化] 处理出错：' + e.message);
                        return $.done({});
                    }
                }
                biliProcessResponse();
            }).call(this);
        }
    });
})();
