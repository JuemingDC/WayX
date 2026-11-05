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
        }), { TextDecoder: typeof TextDecoder === 'undefined' ? undefined : TextDecoder }), utils: typeof $utils === 'undefined' ? undefined : $utils, crypto: typeof $crypto === 'undefined' ? undefined : $crypto, compression: undefined, aes: undefined, url: undefined };
    const __wayxContexts = { "response": { "surge": { "phase": "response", "binary": false, "responseBody": true, "name": "baidumap.js", "from": "qx", "to": "surge", "apiPlan": { "version": 1, "omitNotificationOptions": true, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"], "source": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": null, "media": null, "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" }, "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" } }, "runtimePolicyVersion": 5, "omittedParameters": [] } } }, __wayxConfig = __wayxContexts[__wayxHost.response === undefined ? 'request' : 'response']?.[__wayxTarget];
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
                let protobuf;
                !function (g) {
                    "use strict";
                    !function (r, e, t) { var i = function t(i) { var n = e[i]; return n || r[i][0].call(n = e[i] = { exports: {} }, t, n, n.exports), n.exports; }(t[0]); protobuf = i.util.global.protobuf = i, "function" == typeof define && define.amd && define(["long"], function (t) { return t && t.isLong && (i.util.Long = t, i.configure()), i; }), "object" == typeof module && module && module.exports && (module.exports = i); }({ 1: [function (t, i, n) { i.exports = function (t, i) { var n = Array(arguments.length - 1), s = 0, r = 2, u = !0; for (; r < arguments.length;)
                                n[s++] = arguments[r++]; return new Promise(function (r, e) { n[s] = function (t) { if (u)
                                if (u = !1, t)
                                    e(t);
                                else {
                                    for (var i = Array(arguments.length - 1), n = 0; n < i.length;)
                                        i[n++] = arguments[n];
                                    r.apply(null, i);
                                } }; try {
                                t.apply(i || null, n);
                            }
                            catch (t) {
                                u && (u = !1, e(t));
                            } }); }; }, {}], 2: [function (t, i, n) { n.length = function (t) { var i = t.length; if (!i)
                                return 0; for (var n = 0; 1 < --i % 4 && "=" == (t[0 | i] || "");)
                                ++n; return Math.ceil(3 * t.length) / 4 - n; }; for (var f = Array(64), h = Array(123), r = 0; r < 64;)
                                h[f[r] = r < 26 ? r + 65 : r < 52 ? r + 71 : r < 62 ? r - 4 : r - 59 | 43] = r++; n.encode = function (t, i, n) { for (var r, e = null, s = [], u = 0, o = 0; i < n;) {
                                var h = t[i++];
                                switch (o) {
                                    case 0:
                                        s[u++] = f[h >> 2], r = (3 & h) << 4, o = 1;
                                        break;
                                    case 1:
                                        s[u++] = f[r | h >> 4], r = (15 & h) << 2, o = 2;
                                        break;
                                    case 2: s[u++] = f[r | h >> 6], s[u++] = f[63 & h], o = 0;
                                }
                                8191 < u && ((e = e || []).push(String.fromCharCode.apply(String, s)), u = 0);
                            } return o && (s[u++] = f[r], s[u++] = 61, 1 === o && (s[u++] = 61)), e ? (u && e.push(String.fromCharCode.apply(String, s.slice(0, u))), e.join("")) : String.fromCharCode.apply(String, s.slice(0, u)); }; var c = "invalid encoding"; n.decode = function (t, i, n) { for (var r, e = n, s = 0, u = 0; u < t.length;) {
                                var o = t.charCodeAt(u++);
                                if (61 == o && 1 < s)
                                    break;
                                if ((o = h[o]) === g)
                                    throw Error(c);
                                switch (s) {
                                    case 0:
                                        r = o, s = 1;
                                        break;
                                    case 1:
                                        i[n++] = r << 2 | (48 & o) >> 4, r = o, s = 2;
                                        break;
                                    case 2:
                                        i[n++] = (15 & r) << 4 | (60 & o) >> 2, r = o, s = 3;
                                        break;
                                    case 3: i[n++] = (3 & r) << 6 | o, s = 0;
                                }
                            } if (1 === s)
                                throw Error(c); return n - e; }, n.test = function (t) { return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(t); }; }, {}], 3: [function (t, i, n) { function a(i, n) { "string" == typeof i && (n = i, i = g); var h = []; function f(t) { if ("string" != typeof t) {
                                var i = c();
                                if (a.verbose && console.log("codegen: " + i), i = "return " + i, t) {
                                    for (var n = Object.keys(t), r = Array(n.length + 1), e = Array(n.length), s = 0; s < n.length;)
                                        r[s] = n[s], e[s] = t[n[s++]];
                                    return r[s] = i, Function.apply(null, r).apply(null, e);
                                }
                                return Function(i)();
                            } for (var u = Array(arguments.length - 1), o = 0; o < u.length;)
                                u[o] = arguments[++o]; if (o = 0, t = t.replace(/%([%dfijs])/g, function (t, i) { var n = u[o++]; switch (i) {
                                case "d":
                                case "f": return "" + +("" + n);
                                case "i": return "" + Math.floor(n);
                                case "j": return JSON.stringify(n);
                                case "s": return "" + n;
                            } return "%"; }), o !== u.length)
                                throw Error("parameter count mismatch"); return h.push(t), f; } function c(t) { return "function " + (t || n || "") + "(" + (i && i.join(",") || "") + "){\n  " + h.join("\n  ") + "\n}"; } return f.toString = c, f; } (i.exports = a).verbose = !1; }, {}], 4: [function (t, i, n) { function r() { this.t = {}; } (i.exports = r).prototype.on = function (t, i, n) { return (this.t[t] || (this.t[t] = [])).push({ fn: i, ctx: n || this }), this; }, r.prototype.off = function (t, i) { if (t === g)
                                this.t = {};
                            else if (i === g)
                                this.t[t] = [];
                            else
                                for (var n = this.t[t], r = 0; r < n.length;)
                                    n[r].fn === i ? n.splice(r, 1) : ++r; return this; }, r.prototype.emit = function (t) { var i = this.t[t]; if (i) {
                                for (var n = [], r = 1; r < arguments.length;)
                                    n.push(arguments[r++]);
                                for (r = 0; r < i.length;)
                                    i[r].fn.apply(i[r++].ctx, n);
                            } return this; }; }, {}], 5: [function (t, i, n) { i.exports = o; var s = t(1), u = t(7)("fs"); function o(n, r, e) { return r = "function" == typeof r ? (e = r, {}) : r || {}, e ? !r.xhr && u && u.readFile ? u.readFile(n, function (t, i) { return t && "undefined" != typeof XMLHttpRequest ? o.xhr(n, r, e) : t ? e(t) : e(null, r.binary ? i : i.toString("utf8")); }) : o.xhr(n, r, e) : s(o, this, n, r); } o.xhr = function (t, n, r) { var e = new XMLHttpRequest; e.onreadystatechange = function () { if (4 !== e.readyState)
                                return g; if (0 !== e.status && 200 !== e.status)
                                return r(Error("status " + e.status)); if (n.binary) {
                                if (!(t = e.response))
                                    for (var t = [], i = 0; i < e.responseText.length; ++i)
                                        t.push(255 & e.responseText.charCodeAt(i));
                                return r(null, "undefined" != typeof Uint8Array ? new Uint8Array(t) : t);
                            } return r(null, e.responseText); }, n.binary && ("overrideMimeType" in e && e.overrideMimeType("text/plain; charset=x-user-defined"), e.responseType = "arraybuffer"), e.open("GET", t), e.send(); }; }, { 1: 1, 7: 7 }], 6: [function (t, i, n) { function r(t) { function i(t, i, n, r) { var e = i < 0 ? 1 : 0; t(0 === (i = e ? -i : i) ? 0 < 1 / i ? 0 : 2147483648 : isNaN(i) ? 2143289344 : 34028234663852886e22 < i ? (e << 31 | 2139095040) >>> 0 : i < 11754943508222875e-54 ? (e << 31 | Math.round(i / 1401298464324817e-60)) >>> 0 : (e << 31 | 127 + (t = Math.floor(Math.log(i) / Math.LN2)) << 23 | 8388607 & Math.round(i * Math.pow(2, -t) * 8388608)) >>> 0, n, r); } function n(t, i, n) { t = t(i, n), i = 2 * (t >> 31) + 1, n = t >>> 23 & 255, t &= 8388607; return 255 == n ? t ? NaN : 1 / 0 * i : 0 == n ? 1401298464324817e-60 * i * t : i * Math.pow(2, n - 150) * (8388608 + t); } function r(t, i, n) { o[0] = t, i[n] = h[0], i[n + 1] = h[1], i[n + 2] = h[2], i[n + 3] = h[3]; } function e(t, i, n) { o[0] = t, i[n] = h[3], i[n + 1] = h[2], i[n + 2] = h[1], i[n + 3] = h[0]; } function s(t, i) { return h[0] = t[i], h[1] = t[i + 1], h[2] = t[i + 2], h[3] = t[i + 3], o[0]; } function u(t, i) { return h[3] = t[i], h[2] = t[i + 1], h[1] = t[i + 2], h[0] = t[i + 3], o[0]; } var o, h, f, c, a; function l(t, i, n, r, e, s) { var u, o = r < 0 ? 1 : 0; 0 === (r = o ? -r : r) ? (t(0, e, s + i), t(0 < 1 / r ? 0 : 2147483648, e, s + n)) : isNaN(r) ? (t(0, e, s + i), t(2146959360, e, s + n)) : 17976931348623157e292 < r ? (t(0, e, s + i), t((o << 31 | 2146435072) >>> 0, e, s + n)) : r < 22250738585072014e-324 ? (t((u = r / 5e-324) >>> 0, e, s + i), t((o << 31 | u / 4294967296) >>> 0, e, s + n)) : (t(4503599627370496 * (u = r * Math.pow(2, -(r = 1024 === (r = Math.floor(Math.log(r) / Math.LN2)) ? 1023 : r))) >>> 0, e, s + i), t((o << 31 | r + 1023 << 20 | 1048576 * u & 1048575) >>> 0, e, s + n)); } function d(t, i, n, r, e) { i = t(r, e + i), t = t(r, e + n), r = 2 * (t >> 31) + 1, e = t >>> 20 & 2047, n = 4294967296 * (1048575 & t) + i; return 2047 == e ? n ? NaN : 1 / 0 * r : 0 == e ? 5e-324 * r * n : r * Math.pow(2, e - 1075) * (n + 4503599627370496); } function v(t, i, n) { f[0] = t, i[n] = c[0], i[n + 1] = c[1], i[n + 2] = c[2], i[n + 3] = c[3], i[n + 4] = c[4], i[n + 5] = c[5], i[n + 6] = c[6], i[n + 7] = c[7]; } function b(t, i, n) { f[0] = t, i[n] = c[7], i[n + 1] = c[6], i[n + 2] = c[5], i[n + 3] = c[4], i[n + 4] = c[3], i[n + 5] = c[2], i[n + 6] = c[1], i[n + 7] = c[0]; } function p(t, i) { return c[0] = t[i], c[1] = t[i + 1], c[2] = t[i + 2], c[3] = t[i + 3], c[4] = t[i + 4], c[5] = t[i + 5], c[6] = t[i + 6], c[7] = t[i + 7], f[0]; } function y(t, i) { return c[7] = t[i], c[6] = t[i + 1], c[5] = t[i + 2], c[4] = t[i + 3], c[3] = t[i + 4], c[2] = t[i + 5], c[1] = t[i + 6], c[0] = t[i + 7], f[0]; } return "undefined" != typeof Float32Array ? (o = new Float32Array([-0]), h = new Uint8Array(o.buffer), a = 128 === h[3], t.writeFloatLE = a ? r : e, t.writeFloatBE = a ? e : r, t.readFloatLE = a ? s : u, t.readFloatBE = a ? u : s) : (t.writeFloatLE = i.bind(null, m), t.writeFloatBE = i.bind(null, w), t.readFloatLE = n.bind(null, g), t.readFloatBE = n.bind(null, j)), "undefined" != typeof Float64Array ? (f = new Float64Array([-0]), c = new Uint8Array(f.buffer), a = 128 === c[7], t.writeDoubleLE = a ? v : b, t.writeDoubleBE = a ? b : v, t.readDoubleLE = a ? p : y, t.readDoubleBE = a ? y : p) : (t.writeDoubleLE = l.bind(null, m, 0, 4), t.writeDoubleBE = l.bind(null, w, 4, 0), t.readDoubleLE = d.bind(null, g, 0, 4), t.readDoubleBE = d.bind(null, j, 4, 0)), t; } function m(t, i, n) { i[n] = 255 & t, i[n + 1] = t >>> 8 & 255, i[n + 2] = t >>> 16 & 255, i[n + 3] = t >>> 24; } function w(t, i, n) { i[n] = t >>> 24, i[n + 1] = t >>> 16 & 255, i[n + 2] = t >>> 8 & 255, i[n + 3] = 255 & t; } function g(t, i) { return (t[i] | t[i + 1] << 8 | t[i + 2] << 16 | t[i + 3] << 24) >>> 0; } function j(t, i) { return (t[i] << 24 | t[i + 1] << 16 | t[i + 2] << 8 | t[i + 3]) >>> 0; } i.exports = r(r); }, {}], 7: [function (t, i, n) { function r(t) { try {
                                var i = eval("require")(t);
                                if (i && (i.length || Object.keys(i).length))
                                    return i;
                            }
                            catch (t) { } return null; } i.exports = r; }, {}], 8: [function (t, i, n) { var e = n.isAbsolute = function (t) { return /^(?:\/|\w+:)/.test(t); }, r = n.normalize = function (t) { var i = (t = t.replace(/\\/g, "/").replace(/\/{2,}/g, "/")).split("/"), n = e(t), t = ""; n && (t = i.shift() + "/"); for (var r = 0; r < i.length;)
                                ".." === i[r] ? 0 < r && ".." !== i[r - 1] ? i.splice(--r, 2) : n ? i.splice(r, 1) : ++r : "." === i[r] ? i.splice(r, 1) : ++r; return t + i.join("/"); }; n.resolve = function (t, i, n) { return n || (i = r(i)), !e(i) && (t = (t = n ? t : r(t)).replace(/(?:\/|^)[^/]+$/, "")).length ? r(t + "/" + i) : i; }; }, {}], 9: [function (t, i, n) { i.exports = function (i, n, t) { var r = t || 8192, e = r >>> 1, s = null, u = r; return function (t) { if (t < 1 || e < t)
                                return i(t); r < u + t && (s = i(r), u = 0); t = n.call(s, u, u += t); return 7 & u && (u = 1 + (7 | u)), t; }; }; }, {}], 10: [function (t, i, n) { n.length = function (t) { for (var i, n = 0, r = 0; r < t.length; ++r)
                                (i = t.charCodeAt(r)) < 128 ? n += 1 : i < 2048 ? n += 2 : 55296 == (64512 & i) && 56320 == (64512 & t.charCodeAt(r + 1)) ? (++r, n += 4) : n += 3; return n; }, n.read = function (t, i, n) { if (n - i < 1)
                                return ""; for (var r, e = null, s = [], u = 0; i < n;)
                                (r = t[i++]) < 128 ? s[u++] = r : 191 < r && r < 224 ? s[u++] = (31 & r) << 6 | 63 & t[i++] : 239 < r && r < 365 ? (r = ((7 & r) << 18 | (63 & t[i++]) << 12 | (63 & t[i++]) << 6 | 63 & t[i++]) - 65536, s[u++] = 55296 + (r >> 10), s[u++] = 56320 + (1023 & r)) : s[u++] = (15 & r) << 12 | (63 & t[i++]) << 6 | 63 & t[i++], 8191 < u && ((e = e || []).push(String.fromCharCode.apply(String, s)), u = 0); return e ? (u && e.push(String.fromCharCode.apply(String, s.slice(0, u))), e.join("")) : String.fromCharCode.apply(String, s.slice(0, u)); }, n.write = function (t, i, n) { for (var r, e, s = n, u = 0; u < t.length; ++u)
                                (r = t.charCodeAt(u)) < 128 ? i[n++] = r : (r < 2048 ? i[n++] = r >> 6 | 192 : (55296 == (64512 & r) && 56320 == (64512 & (e = t.charCodeAt(u + 1))) ? (++u, i[n++] = (r = 65536 + ((1023 & r) << 10) + (1023 & e)) >> 18 | 240, i[n++] = r >> 12 & 63 | 128) : i[n++] = r >> 12 | 224, i[n++] = r >> 6 & 63 | 128), i[n++] = 63 & r | 128); return n - s; }; }, {}], 11: [function (t, i, n) { var l = t(14), d = t(33); function u(t, i, n, r) { var e = !1; if (i.resolvedType)
                                if (i.resolvedType instanceof l) {
                                    t("switch(d%s){", r);
                                    for (var s = i.resolvedType.values, u = Object.keys(s), o = 0; o < u.length; ++o)
                                        s[u[o]] !== i.typeDefault || e || (t("default:")('if(typeof(d%s)==="number"){m%s=d%s;break}', r, r, r), i.repeated || t("break"), e = !0), t("case%j:", u[o])("case %i:", s[u[o]])("m%s=%j", r, s[u[o]])("break");
                                    t("}");
                                }
                                else
                                    t('if(typeof d%s!=="object")', r)("throw TypeError(%j)", i.fullName + ": object expected")("m%s=types[%i].fromObject(d%s)", r, n, r);
                            else {
                                var h = !1;
                                switch (i.type) {
                                    case "double":
                                    case "float":
                                        t("m%s=Number(d%s)", r, r);
                                        break;
                                    case "uint32":
                                    case "fixed32":
                                        t("m%s=d%s>>>0", r, r);
                                        break;
                                    case "int32":
                                    case "sint32":
                                    case "sfixed32":
                                        t("m%s=d%s|0", r, r);
                                        break;
                                    case "uint64": h = !0;
                                    case "int64":
                                    case "sint64":
                                    case "fixed64":
                                    case "sfixed64":
                                        t("if(util.Long)")("(m%s=util.Long.fromValue(d%s)).unsigned=%j", r, r, h)('else if(typeof d%s==="string")', r)("m%s=parseInt(d%s,10)", r, r)('else if(typeof d%s==="number")', r)("m%s=d%s", r, r)('else if(typeof d%s==="object")', r)("m%s=new util.LongBits(d%s.low>>>0,d%s.high>>>0).toNumber(%s)", r, r, r, h ? "true" : "");
                                        break;
                                    case "bytes":
                                        t('if(typeof d%s==="string")', r)("util.base64.decode(d%s,m%s=util.newBuffer(util.base64.length(d%s)),0)", r, r, r)("else if(d%s.length >= 0)", r)("m%s=d%s", r, r);
                                        break;
                                    case "string":
                                        t("m%s=String(d%s)", r, r);
                                        break;
                                    case "bool": t("m%s=Boolean(d%s)", r, r);
                                }
                            } return t; } function v(t, i, n, r) { if (i.resolvedType)
                                i.resolvedType instanceof l ? t("d%s=o.enums===String?(types[%i].values[m%s]===undefined?m%s:types[%i].values[m%s]):m%s", r, n, r, r, n, r, r) : t("d%s=types[%i].toObject(m%s,o)", r, n, r);
                            else {
                                var e = !1;
                                switch (i.type) {
                                    case "double":
                                    case "float":
                                        t("d%s=o.json&&!isFinite(m%s)?String(m%s):m%s", r, r, r, r);
                                        break;
                                    case "uint64": e = !0;
                                    case "int64":
                                    case "sint64":
                                    case "fixed64":
                                    case "sfixed64":
                                        t('if(typeof m%s==="number")', r)("d%s=o.longs===String?String(m%s):m%s", r, r, r)("else")("d%s=o.longs===String?util.Long.prototype.toString.call(m%s):o.longs===Number?new util.LongBits(m%s.low>>>0,m%s.high>>>0).toNumber(%s):m%s", r, r, r, r, e ? "true" : "", r);
                                        break;
                                    case "bytes":
                                        t("d%s=o.bytes===String?util.base64.encode(m%s,0,m%s.length):o.bytes===Array?Array.prototype.slice.call(m%s):m%s", r, r, r, r, r);
                                        break;
                                    default: t("d%s=m%s", r, r);
                                }
                            } return t; } n.fromObject = function (t) { var i = t.fieldsArray, n = d.codegen(["d"], t.name + "$fromObject")("if(d instanceof this.ctor)")("return d"); if (!i.length)
                                return n("return new this.ctor"); n("var m=new this.ctor"); for (var r = 0; r < i.length; ++r) {
                                var e = i[r].resolve(), s = d.safeProp(e.name);
                                e.map ? (n("if(d%s){", s)('if(typeof d%s!=="object")', s)("throw TypeError(%j)", e.fullName + ": object expected")("m%s={}", s)("for(var ks=Object.keys(d%s),i=0;i<ks.length;++i){", s), u(n, e, r, s + "[ks[i]]")("}")("}")) : e.repeated ? (n("if(d%s){", s)("if(!Array.isArray(d%s))", s)("throw TypeError(%j)", e.fullName + ": array expected")("m%s=[]", s)("for(var i=0;i<d%s.length;++i){", s), u(n, e, r, s + "[i]")("}")("}")) : (e.resolvedType instanceof l || n("if(d%s!=null){", s), u(n, e, r, s), e.resolvedType instanceof l || n("}"));
                            } return n("return m"); }, n.toObject = function (t) { var i = t.fieldsArray.slice().sort(d.compareFieldsById); if (!i.length)
                                return d.codegen()("return {}"); for (var n = d.codegen(["m", "o"], t.name + "$toObject")("if(!o)")("o={}")("var d={}"), r = [], e = [], s = [], u = 0; u < i.length; ++u)
                                i[u].partOf || (i[u].resolve().repeated ? r : i[u].map ? e : s).push(i[u]); if (r.length) {
                                for (n("if(o.arrays||o.defaults){"), u = 0; u < r.length; ++u)
                                    n("d%s=[]", d.safeProp(r[u].name));
                                n("}");
                            } if (e.length) {
                                for (n("if(o.objects||o.defaults){"), u = 0; u < e.length; ++u)
                                    n("d%s={}", d.safeProp(e[u].name));
                                n("}");
                            } if (s.length) {
                                for (n("if(o.defaults){"), u = 0; u < s.length; ++u) {
                                    var o, h = s[u], f = d.safeProp(h.name);
                                    h.resolvedType instanceof l ? n("d%s=o.enums===String?%j:%j", f, h.resolvedType.valuesById[h.typeDefault], h.typeDefault) : h.long ? n("if(util.Long){")("var n=new util.Long(%i,%i,%j)", h.typeDefault.low, h.typeDefault.high, h.typeDefault.unsigned)("d%s=o.longs===String?n.toString():o.longs===Number?n.toNumber():n", f)("}else")("d%s=o.longs===String?%j:%i", f, h.typeDefault.toString(), h.typeDefault.toNumber()) : h.bytes ? (o = "[" + Array.prototype.slice.call(h.typeDefault).join(",") + "]", n("if(o.bytes===String)d%s=%j", f, String.fromCharCode.apply(String, h.typeDefault))("else{")("d%s=%s", f, o)("if(o.bytes!==Array)d%s=util.newBuffer(d%s)", f, f)("}")) : n("d%s=%j", f, h.typeDefault);
                                }
                                n("}");
                            } for (var c = !1, u = 0; u < i.length; ++u) {
                                var h = i[u], a = t.i.indexOf(h), f = d.safeProp(h.name);
                                h.map ? (c || (c = !0, n("var ks2")), n("if(m%s&&(ks2=Object.keys(m%s)).length){", f, f)("d%s={}", f)("for(var j=0;j<ks2.length;++j){"), v(n, h, a, f + "[ks2[j]]")("}")) : h.repeated ? (n("if(m%s&&m%s.length){", f, f)("d%s=[]", f)("for(var j=0;j<m%s.length;++j){", f), v(n, h, a, f + "[j]")("}")) : (n("if(m%s!=null&&m.hasOwnProperty(%j)){", f, h.name), v(n, h, a, f), h.partOf && n("if(o.oneofs)")("d%s=%j", d.safeProp(h.partOf.name), h.name)), n("}");
                            } return n("return d"); }; }, { 14: 14, 33: 33 }], 12: [function (t, i, n) { i.exports = function (t) { var i = f.codegen(["r", "l"], t.name + "$decode")("if(!(r instanceof Reader))")("r=Reader.create(r)")("var c=l===undefined?r.len:r.pos+l,m=new this.ctor" + (t.fieldsArray.filter(function (t) { return t.map; }).length ? ",k,value" : ""))("while(r.pos<c){")("var t=r.uint32()"); t.group && i("if((t&7)===4)")("break"); i("switch(t>>>3){"); for (var n = 0; n < t.fieldsArray.length; ++n) {
                                var r = t.i[n].resolve(), e = r.resolvedType instanceof o ? "int32" : r.type, s = "m" + f.safeProp(r.name);
                                i("case %i: {", r.id), r.map ? (i("if(%s===util.emptyObject)", s)("%s={}", s)("var c2 = r.uint32()+r.pos"), h.defaults[r.keyType] !== g ? i("k=%j", h.defaults[r.keyType]) : i("k=null"), h.defaults[e] !== g ? i("value=%j", h.defaults[e]) : i("value=null"), i("while(r.pos<c2){")("var tag2=r.uint32()")("switch(tag2>>>3){")("case 1: k=r.%s(); break", r.keyType)("case 2:"), h.basic[e] === g ? i("value=types[%i].decode(r,r.uint32())", n) : i("value=r.%s()", e), i("break")("default:")("r.skipType(tag2&7)")("break")("}")("}"), h.long[r.keyType] !== g ? i('%s[typeof k==="object"?util.longToHash(k):k]=value', s) : i("%s[k]=value", s)) : r.repeated ? (i("if(!(%s&&%s.length))", s, s)("%s=[]", s), h.packed[e] !== g && i("if((t&7)===2){")("var c2=r.uint32()+r.pos")("while(r.pos<c2)")("%s.push(r.%s())", s, e)("}else"), h.basic[e] === g ? i(r.resolvedType.group ? "%s.push(types[%i].decode(r))" : "%s.push(types[%i].decode(r,r.uint32()))", s, n) : i("%s.push(r.%s())", s, e)) : h.basic[e] === g ? i(r.resolvedType.group ? "%s=types[%i].decode(r)" : "%s=types[%i].decode(r,r.uint32())", s, n) : i("%s=r.%s()", s, e), i("break")("}");
                            } for (i("default:")("r.skipType(t&7)")("break")("}")("}"), n = 0; n < t.i.length; ++n) {
                                var u = t.i[n];
                                u.required && i("if(!m.hasOwnProperty(%j))", u.name)("throw util.ProtocolError(%j,{instance:m})", "missing required '" + u.name + "'");
                            } return i("return m"); }; var o = t(14), h = t(32), f = t(33); }, { 14: 14, 32: 32, 33: 33 }], 13: [function (t, i, n) { i.exports = function (t) { for (var i, n = a.codegen(["m", "w"], t.name + "$encode")("if(!w)")("w=Writer.create()"), r = t.fieldsArray.slice().sort(a.compareFieldsById), e = 0; e < r.length; ++e) {
                                var s = r[e].resolve(), u = t.i.indexOf(s), o = s.resolvedType instanceof f ? "int32" : s.type, h = c.basic[o];
                                i = "m" + a.safeProp(s.name), s.map ? (n("if(%s!=null&&Object.hasOwnProperty.call(m,%j)){", i, s.name)("for(var ks=Object.keys(%s),i=0;i<ks.length;++i){", i)("w.uint32(%i).fork().uint32(%i).%s(ks[i])", (s.id << 3 | 2) >>> 0, 8 | c.mapKey[s.keyType], s.keyType), h === g ? n("types[%i].encode(%s[ks[i]],w.uint32(18).fork()).ldelim().ldelim()", u, i) : n(".uint32(%i).%s(%s[ks[i]]).ldelim()", 16 | h, o, i), n("}")("}")) : s.repeated ? (n("if(%s!=null&&%s.length){", i, i), s.packed && c.packed[o] !== g ? n("w.uint32(%i).fork()", (s.id << 3 | 2) >>> 0)("for(var i=0;i<%s.length;++i)", i)("w.%s(%s[i])", o, i)("w.ldelim()") : (n("for(var i=0;i<%s.length;++i)", i), h === g ? l(n, s, u, i + "[i]") : n("w.uint32(%i).%s(%s[i])", (s.id << 3 | h) >>> 0, o, i)), n("}")) : (s.optional && n("if(%s!=null&&Object.hasOwnProperty.call(m,%j))", i, s.name), h === g ? l(n, s, u, i) : n("w.uint32(%i).%s(%s)", (s.id << 3 | h) >>> 0, o, i));
                            } return n("return w"); }; var f = t(14), c = t(32), a = t(33); function l(t, i, n, r) { i.resolvedType.group ? t("types[%i].encode(%s,w.uint32(%i)).uint32(%i)", n, r, (i.id << 3 | 3) >>> 0, (i.id << 3 | 4) >>> 0) : t("types[%i].encode(%s,w.uint32(%i).fork()).ldelim()", n, r, (i.id << 3 | 2) >>> 0); } }, { 14: 14, 32: 32, 33: 33 }], 14: [function (t, i, n) { i.exports = s; var h = t(22), r = (((s.prototype = Object.create(h.prototype)).constructor = s).className = "Enum", t(21)), e = t(33); function s(t, i, n, r, e, s) { if (h.call(this, t, n), i && "object" != typeof i)
                                throw TypeError("values must be an object"); if (this.valuesById = {}, this.values = Object.create(this.valuesById), this.comment = r, this.comments = e || {}, this.valuesOptions = s, this.reserved = g, i)
                                for (var u = Object.keys(i), o = 0; o < u.length; ++o)
                                    "number" == typeof i[u[o]] && (this.valuesById[this.values[u[o]] = i[u[o]]] = u[o]); } s.fromJSON = function (t, i) { t = new s(t, i.values, i.options, i.comment, i.comments); return t.reserved = i.reserved, t; }, s.prototype.toJSON = function (t) { t = !!t && !!t.keepComments; return e.toObject(["options", this.options, "valuesOptions", this.valuesOptions, "values", this.values, "reserved", this.reserved && this.reserved.length ? this.reserved : g, "comment", t ? this.comment : g, "comments", t ? this.comments : g]); }, s.prototype.add = function (t, i, n, r) { if (!e.isString(t))
                                throw TypeError("name must be a string"); if (!e.isInteger(i))
                                throw TypeError("id must be an integer"); if (this.values[t] !== g)
                                throw Error("duplicate name '" + t + "' in " + this); if (this.isReservedId(i))
                                throw Error("id " + i + " is reserved in " + this); if (this.isReservedName(t))
                                throw Error("name '" + t + "' is reserved in " + this); if (this.valuesById[i] !== g) {
                                if (!this.options || !this.options.allow_alias)
                                    throw Error("duplicate id " + i + " in " + this);
                                this.values[t] = i;
                            }
                            else
                                this.valuesById[this.values[t] = i] = t; return r && (this.valuesOptions === g && (this.valuesOptions = {}), this.valuesOptions[t] = r || null), this.comments[t] = n || null, this; }, s.prototype.remove = function (t) { if (!e.isString(t))
                                throw TypeError("name must be a string"); var i = this.values[t]; if (null == i)
                                throw Error("name '" + t + "' does not exist in " + this); return delete this.valuesById[i], delete this.values[t], delete this.comments[t], this.valuesOptions && delete this.valuesOptions[t], this; }, s.prototype.isReservedId = function (t) { return r.isReservedId(this.reserved, t); }, s.prototype.isReservedName = function (t) { return r.isReservedName(this.reserved, t); }; }, { 21: 21, 22: 22, 33: 33 }], 15: [function (t, i, n) { i.exports = u; var r, o = t(22), e = (((u.prototype = Object.create(o.prototype)).constructor = u).className = "Field", t(14)), h = t(32), f = t(33), c = /^required|optional|repeated$/; function u(t, i, n, r, e, s, u) { if (f.isObject(r) ? (u = e, s = r, r = e = g) : f.isObject(e) && (u = s, s = e, e = g), o.call(this, t, s), !f.isInteger(i) || i < 0)
                                throw TypeError("id must be a non-negative integer"); if (!f.isString(n))
                                throw TypeError("type must be a string"); if (r !== g && !c.test(r = r.toString().toLowerCase()))
                                throw TypeError("rule must be a string rule"); if (e !== g && !f.isString(e))
                                throw TypeError("extend must be a string"); this.rule = (r = "proto3_optional" === r ? "optional" : r) && "optional" !== r ? r : g, this.type = n, this.id = i, this.extend = e || g, this.required = "required" === r, this.optional = !this.required, this.repeated = "repeated" === r, this.map = !1, this.message = null, this.partOf = null, this.typeDefault = null, this.defaultValue = null, this.long = !!f.Long && h.long[n] !== g, this.bytes = "bytes" === n, this.resolvedType = null, this.extensionField = null, this.declaringField = null, this.n = null, this.comment = u; } u.fromJSON = function (t, i) { return new u(t, i.id, i.type, i.rule, i.extend, i.options, i.comment); }, Object.defineProperty(u.prototype, "packed", { get: function () { return null === this.n && (this.n = !1 !== this.getOption("packed")), this.n; } }), u.prototype.setOption = function (t, i, n) { return "packed" === t && (this.n = null), o.prototype.setOption.call(this, t, i, n); }, u.prototype.toJSON = function (t) { t = !!t && !!t.keepComments; return f.toObject(["rule", "optional" !== this.rule && this.rule || g, "type", this.type, "id", this.id, "extend", this.extend, "options", this.options, "comment", t ? this.comment : g]); }, u.prototype.resolve = function () { var t; return this.resolved ? this : ((this.typeDefault = h.defaults[this.type]) === g ? (this.resolvedType = (this.declaringField || this).parent.lookupTypeOrEnum(this.type), this.resolvedType instanceof r ? this.typeDefault = null : this.typeDefault = this.resolvedType.values[Object.keys(this.resolvedType.values)[0]]) : this.options && this.options.proto3_optional && (this.typeDefault = null), this.options && null != this.options.default && (this.typeDefault = this.options.default, this.resolvedType instanceof e && "string" == typeof this.typeDefault && (this.typeDefault = this.resolvedType.values[this.typeDefault])), this.options && (!0 !== this.options.packed && (this.options.packed === g || !this.resolvedType || this.resolvedType instanceof e) || delete this.options.packed, Object.keys(this.options).length || (this.options = g)), this.long ? (this.typeDefault = f.Long.fromNumber(this.typeDefault, "u" == (this.type[0] || "")), Object.freeze && Object.freeze(this.typeDefault)) : this.bytes && "string" == typeof this.typeDefault && (f.base64.test(this.typeDefault) ? f.base64.decode(this.typeDefault, t = f.newBuffer(f.base64.length(this.typeDefault)), 0) : f.utf8.write(this.typeDefault, t = f.newBuffer(f.utf8.length(this.typeDefault)), 0), this.typeDefault = t), this.map ? this.defaultValue = f.emptyObject : this.repeated ? this.defaultValue = f.emptyArray : this.defaultValue = this.typeDefault, this.parent instanceof r && (this.parent.ctor.prototype[this.name] = this.defaultValue), o.prototype.resolve.call(this)); }, u.d = function (n, r, e, s) { return "function" == typeof r ? r = f.decorateType(r).name : r && "object" == typeof r && (r = f.decorateEnum(r).name), function (t, i) { f.decorateType(t.constructor).add(new u(i, n, r, e, { default: s })); }; }, u.r = function (t) { r = t; }; }, { 14: 14, 22: 22, 32: 32, 33: 33 }], 16: [function (t, i, n) { var r = i.exports = t(17); r.build = "light", r.load = function (t, i, n) { return (i = "function" == typeof i ? (n = i, new r.Root) : i || new r.Root).load(t, n); }, r.loadSync = function (t, i) { return (i = i || new r.Root).loadSync(t); }, r.encoder = t(13), r.decoder = t(12), r.verifier = t(36), r.converter = t(11), r.ReflectionObject = t(22), r.Namespace = t(21), r.Root = t(26), r.Enum = t(14), r.Type = t(31), r.Field = t(15), r.OneOf = t(23), r.MapField = t(18), r.Service = t(30), r.Method = t(20), r.Message = t(19), r.wrappers = t(37), r.types = t(32), r.util = t(33), r.ReflectionObject.r(r.Root), r.Namespace.r(r.Type, r.Service, r.Enum), r.Root.r(r.Type), r.Field.r(r.Type); }, { 11: 11, 12: 12, 13: 13, 14: 14, 15: 15, 17: 17, 18: 18, 19: 19, 20: 20, 21: 21, 22: 22, 23: 23, 26: 26, 30: 30, 31: 31, 32: 32, 33: 33, 36: 36, 37: 37 }], 17: [function (t, i, n) { var r = n; function e() { r.util.r(), r.Writer.r(r.BufferWriter), r.Reader.r(r.BufferReader); } r.build = "minimal", r.Writer = t(38), r.BufferWriter = t(39), r.Reader = t(24), r.BufferReader = t(25), r.util = t(35), r.rpc = t(28), r.roots = t(27), r.configure = e, e(); }, { 24: 24, 25: 25, 27: 27, 28: 28, 35: 35, 38: 38, 39: 39 }], 18: [function (t, i, n) { i.exports = s; var u = t(15), r = (((s.prototype = Object.create(u.prototype)).constructor = s).className = "MapField", t(32)), o = t(33); function s(t, i, n, r, e, s) { if (u.call(this, t, i, r, g, g, e, s), !o.isString(n))
                                throw TypeError("keyType must be a string"); this.keyType = n, this.resolvedKeyType = null, this.map = !0; } s.fromJSON = function (t, i) { return new s(t, i.id, i.keyType, i.type, i.options, i.comment); }, s.prototype.toJSON = function (t) { t = !!t && !!t.keepComments; return o.toObject(["keyType", this.keyType, "type", this.type, "id", this.id, "extend", this.extend, "options", this.options, "comment", t ? this.comment : g]); }, s.prototype.resolve = function () { if (this.resolved)
                                return this; if (r.mapKey[this.keyType] === g)
                                throw Error("invalid key type: " + this.keyType); return u.prototype.resolve.call(this); }, s.d = function (n, r, e) { return "function" == typeof e ? e = o.decorateType(e).name : e && "object" == typeof e && (e = o.decorateEnum(e).name), function (t, i) { o.decorateType(t.constructor).add(new s(i, n, r, e)); }; }; }, { 15: 15, 32: 32, 33: 33 }], 19: [function (t, i, n) { i.exports = e; var r = t(35); function e(t) { if (t)
                                for (var i = Object.keys(t), n = 0; n < i.length; ++n)
                                    this[i[n]] = t[i[n]]; } e.create = function (t) { return this.$type.create(t); }, e.encode = function (t, i) { return this.$type.encode(t, i); }, e.encodeDelimited = function (t, i) { return this.$type.encodeDelimited(t, i); }, e.decode = function (t) { return this.$type.decode(t); }, e.decodeDelimited = function (t) { return this.$type.decodeDelimited(t); }, e.verify = function (t) { return this.$type.verify(t); }, e.fromObject = function (t) { return this.$type.fromObject(t); }, e.toObject = function (t, i) { return this.$type.toObject(t, i); }, e.prototype.toJSON = function () { return this.$type.toObject(this, r.toJSONOptions); }; }, { 35: 35 }], 20: [function (t, i, n) { i.exports = r; var f = t(22), c = (((r.prototype = Object.create(f.prototype)).constructor = r).className = "Method", t(33)); function r(t, i, n, r, e, s, u, o, h) { if (c.isObject(e) ? (u = e, e = s = g) : c.isObject(s) && (u = s, s = g), i !== g && !c.isString(i))
                                throw TypeError("type must be a string"); if (!c.isString(n))
                                throw TypeError("requestType must be a string"); if (!c.isString(r))
                                throw TypeError("responseType must be a string"); f.call(this, t, u), this.type = i || "rpc", this.requestType = n, this.requestStream = !!e || g, this.responseType = r, this.responseStream = !!s || g, this.resolvedRequestType = null, this.resolvedResponseType = null, this.comment = o, this.parsedOptions = h; } r.fromJSON = function (t, i) { return new r(t, i.type, i.requestType, i.responseType, i.requestStream, i.responseStream, i.options, i.comment, i.parsedOptions); }, r.prototype.toJSON = function (t) { t = !!t && !!t.keepComments; return c.toObject(["type", "rpc" !== this.type && this.type || g, "requestType", this.requestType, "requestStream", this.requestStream, "responseType", this.responseType, "responseStream", this.responseStream, "options", this.options, "comment", t ? this.comment : g, "parsedOptions", this.parsedOptions]); }, r.prototype.resolve = function () { return this.resolved ? this : (this.resolvedRequestType = this.parent.lookupType(this.requestType), this.resolvedResponseType = this.parent.lookupType(this.responseType), f.prototype.resolve.call(this)); }; }, { 22: 22, 33: 33 }], 21: [function (t, i, n) { i.exports = a; var e, s, u, r = t(22), o = (((a.prototype = Object.create(r.prototype)).constructor = a).className = "Namespace", t(15)), h = t(33), f = t(23); function c(t, i) { if (!t || !t.length)
                                return g; for (var n = {}, r = 0; r < t.length; ++r)
                                n[t[r].name] = t[r].toJSON(i); return n; } function a(t, i) { r.call(this, t, i), this.nested = g, this.e = null; } function l(t) { return t.e = null, t; } a.fromJSON = function (t, i) { return new a(t, i.options).addJSON(i.nested); }, a.arrayToJSON = c, a.isReservedId = function (t, i) { if (t)
                                for (var n = 0; n < t.length; ++n)
                                    if ("string" != typeof t[n] && t[n][0] <= i && t[n][1] > i)
                                        return !0; return !1; }, a.isReservedName = function (t, i) { if (t)
                                for (var n = 0; n < t.length; ++n)
                                    if (t[n] === i)
                                        return !0; return !1; }, Object.defineProperty(a.prototype, "nestedArray", { get: function () { return this.e || (this.e = h.toArray(this.nested)); } }), a.prototype.toJSON = function (t) { return h.toObject(["options", this.options, "nested", c(this.nestedArray, t)]); }, a.prototype.addJSON = function (t) { if (t)
                                for (var i, n = Object.keys(t), r = 0; r < n.length; ++r)
                                    i = t[n[r]], this.add((i.fields !== g ? e : i.values !== g ? u : i.methods !== g ? s : i.id !== g ? o : a).fromJSON(n[r], i)); return this; }, a.prototype.get = function (t) { return this.nested && this.nested[t] || null; }, a.prototype.getEnum = function (t) { if (this.nested && this.nested[t] instanceof u)
                                return this.nested[t].values; throw Error("no such enum: " + t); }, a.prototype.add = function (t) { if (!(t instanceof o && t.extend !== g || t instanceof e || t instanceof f || t instanceof u || t instanceof s || t instanceof a))
                                throw TypeError("object must be a valid nested object"); if (this.nested) {
                                var i = this.get(t.name);
                                if (i) {
                                    if (!(i instanceof a && t instanceof a) || i instanceof e || i instanceof s)
                                        throw Error("duplicate name '" + t.name + "' in " + this);
                                    for (var n = i.nestedArray, r = 0; r < n.length; ++r)
                                        t.add(n[r]);
                                    this.remove(i), this.nested || (this.nested = {}), t.setOptions(i.options, !0);
                                }
                            }
                            else
                                this.nested = {}; return (this.nested[t.name] = t).onAdd(this), l(this); }, a.prototype.remove = function (t) { if (!(t instanceof r))
                                throw TypeError("object must be a ReflectionObject"); if (t.parent !== this)
                                throw Error(t + " is not a member of " + this); return delete this.nested[t.name], Object.keys(this.nested).length || (this.nested = g), t.onRemove(this), l(this); }, a.prototype.define = function (t, i) { if (h.isString(t))
                                t = t.split(".");
                            else if (!Array.isArray(t))
                                throw TypeError("illegal path"); if (t && t.length && "" === t[0])
                                throw Error("path must be relative"); for (var n = this; 0 < t.length;) {
                                var r = t.shift();
                                if (n.nested && n.nested[r]) {
                                    if (!((n = n.nested[r]) instanceof a))
                                        throw Error("path conflicts with non-namespace objects");
                                }
                                else
                                    n.add(n = new a(r));
                            } return i && n.addJSON(i), n; }, a.prototype.resolveAll = function () { for (var t = this.nestedArray, i = 0; i < t.length;)
                                t[i] instanceof a ? t[i++].resolveAll() : t[i++].resolve(); return this.resolve(); }, a.prototype.lookup = function (t, i, n) { if ("boolean" == typeof i ? (n = i, i = g) : i && !Array.isArray(i) && (i = [i]), h.isString(t) && t.length) {
                                if ("." === t)
                                    return this.root;
                                t = t.split(".");
                            }
                            else if (!t.length)
                                return this; if ("" === t[0])
                                return this.root.lookup(t.slice(1), i); var r = this.get(t[0]); if (r) {
                                if (1 === t.length) {
                                    if (!i || ~i.indexOf(r.constructor))
                                        return r;
                                }
                                else if (r instanceof a && (r = r.lookup(t.slice(1), i, !0)))
                                    return r;
                            }
                            else
                                for (var e = 0; e < this.nestedArray.length; ++e)
                                    if (this.e[e] instanceof a && (r = this.e[e].lookup(t, i, !0)))
                                        return r; return null === this.parent || n ? null : this.parent.lookup(t, i); }, a.prototype.lookupType = function (t) { var i = this.lookup(t, [e]); if (i)
                                return i; throw Error("no such type: " + t); }, a.prototype.lookupEnum = function (t) { var i = this.lookup(t, [u]); if (i)
                                return i; throw Error("no such Enum '" + t + "' in " + this); }, a.prototype.lookupTypeOrEnum = function (t) { var i = this.lookup(t, [e, u]); if (i)
                                return i; throw Error("no such Type or Enum '" + t + "' in " + this); }, a.prototype.lookupService = function (t) { var i = this.lookup(t, [s]); if (i)
                                return i; throw Error("no such Service '" + t + "' in " + this); }, a.r = function (t, i, n) { e = t, s = i, u = n; }; }, { 15: 15, 22: 22, 23: 23, 33: 33 }], 22: [function (t, i, n) { (i.exports = e).className = "ReflectionObject"; var r, u = t(33); function e(t, i) { if (!u.isString(t))
                                throw TypeError("name must be a string"); if (i && !u.isObject(i))
                                throw TypeError("options must be an object"); this.options = i, this.parsedOptions = null, this.name = t, this.parent = null, this.resolved = !1, this.comment = null, this.filename = null; } Object.defineProperties(e.prototype, { root: { get: function () { for (var t = this; null !== t.parent;)
                                        t = t.parent; return t; } }, fullName: { get: function () { for (var t = [this.name], i = this.parent; i;)
                                        t.unshift(i.name), i = i.parent; return t.join("."); } } }), e.prototype.toJSON = function () { throw Error(); }, e.prototype.onAdd = function (t) { this.parent && this.parent !== t && this.parent.remove(this), this.parent = t, this.resolved = !1; t = t.root; t instanceof r && t.u(this); }, e.prototype.onRemove = function (t) { t = t.root; t instanceof r && t.o(this), this.parent = null, this.resolved = !1; }, e.prototype.resolve = function () { return this.resolved || this.root instanceof r && (this.resolved = !0), this; }, e.prototype.getOption = function (t) { return this.options ? this.options[t] : g; }, e.prototype.setOption = function (t, i, n) { return n && this.options && this.options[t] !== g || ((this.options || (this.options = {}))[t] = i), this; }, e.prototype.setParsedOption = function (i, t, n) { this.parsedOptions || (this.parsedOptions = []); var r, e, s = this.parsedOptions; return n ? (r = s.find(function (t) { return Object.prototype.hasOwnProperty.call(t, i); })) ? (e = r[i], u.setProperty(e, n, t)) : ((r = {})[i] = u.setProperty({}, n, t), s.push(r)) : ((e = {})[i] = t, s.push(e)), this; }, e.prototype.setOptions = function (t, i) { if (t)
                                for (var n = Object.keys(t), r = 0; r < n.length; ++r)
                                    this.setOption(n[r], t[n[r]], i); return this; }, e.prototype.toString = function () { var t = this.constructor.className, i = this.fullName; return i.length ? t + " " + i : t; }, e.r = function (t) { r = t; }; }, { 33: 33 }], 23: [function (t, i, n) { i.exports = u; var e = t(22), r = (((u.prototype = Object.create(e.prototype)).constructor = u).className = "OneOf", t(15)), s = t(33); function u(t, i, n, r) { if (Array.isArray(i) || (n = i, i = g), e.call(this, t, n), i !== g && !Array.isArray(i))
                                throw TypeError("fieldNames must be an Array"); this.oneof = i || [], this.fieldsArray = [], this.comment = r; } function o(t) { if (t.parent)
                                for (var i = 0; i < t.fieldsArray.length; ++i)
                                    t.fieldsArray[i].parent || t.parent.add(t.fieldsArray[i]); } u.fromJSON = function (t, i) { return new u(t, i.oneof, i.options, i.comment); }, u.prototype.toJSON = function (t) { t = !!t && !!t.keepComments; return s.toObject(["options", this.options, "oneof", this.oneof, "comment", t ? this.comment : g]); }, u.prototype.add = function (t) { if (t instanceof r)
                                return t.parent && t.parent !== this.parent && t.parent.remove(t), this.oneof.push(t.name), this.fieldsArray.push(t), o(t.partOf = this), this; throw TypeError("field must be a Field"); }, u.prototype.remove = function (t) { if (!(t instanceof r))
                                throw TypeError("field must be a Field"); var i = this.fieldsArray.indexOf(t); if (i < 0)
                                throw Error(t + " is not a member of " + this); return this.fieldsArray.splice(i, 1), -1 < (i = this.oneof.indexOf(t.name)) && this.oneof.splice(i, 1), t.partOf = null, this; }, u.prototype.onAdd = function (t) { e.prototype.onAdd.call(this, t); for (var i = 0; i < this.oneof.length; ++i) {
                                var n = t.get(this.oneof[i]);
                                n && !n.partOf && (n.partOf = this).fieldsArray.push(n);
                            } o(this); }, u.prototype.onRemove = function (t) { for (var i, n = 0; n < this.fieldsArray.length; ++n)
                                (i = this.fieldsArray[n]).parent && i.parent.remove(i); e.prototype.onRemove.call(this, t); }, u.d = function () { for (var n = Array(arguments.length), t = 0; t < arguments.length;)
                                n[t] = arguments[t++]; return function (t, i) { s.decorateType(t.constructor).add(new u(i, n)), Object.defineProperty(t, i, { get: s.oneOfGetter(n), set: s.oneOfSetter(n) }); }; }; }, { 15: 15, 22: 22, 33: 33 }], 24: [function (t, i, n) { i.exports = h; var r, e = t(35), s = e.LongBits, u = e.utf8; function o(t, i) { return RangeError("index out of range: " + t.pos + " + " + (i || 1) + " > " + t.len); } function h(t) { this.buf = t, this.pos = 0, this.len = t.length; } function f() { return e.Buffer ? function (t) { return (h.create = function (t) { return e.Buffer.isBuffer(t) ? new r(t) : a(t); })(t); } : a; } var c, a = "undefined" != typeof Uint8Array ? function (t) { if (t instanceof Uint8Array || Array.isArray(t))
                                return new h(t); throw Error("illegal buffer"); } : function (t) { if (Array.isArray(t))
                                return new h(t); throw Error("illegal buffer"); }; function l() { var t = new s(0, 0), i = 0; if (!(4 < this.len - this.pos)) {
                                for (; i < 3; ++i) {
                                    if (this.pos >= this.len)
                                        throw o(this);
                                    if (t.lo = (t.lo | (127 & this.buf[this.pos]) << 7 * i) >>> 0, this.buf[this.pos++] < 128)
                                        return t;
                                }
                                return t.lo = (t.lo | (127 & this.buf[this.pos++]) << 7 * i) >>> 0, t;
                            } for (; i < 4; ++i)
                                if (t.lo = (t.lo | (127 & this.buf[this.pos]) << 7 * i) >>> 0, this.buf[this.pos++] < 128)
                                    return t; if (t.lo = (t.lo | (127 & this.buf[this.pos]) << 28) >>> 0, t.hi = (t.hi | (127 & this.buf[this.pos]) >> 4) >>> 0, this.buf[this.pos++] < 128)
                                return t; if (i = 0, 4 < this.len - this.pos) {
                                for (; i < 5; ++i)
                                    if (t.hi = (t.hi | (127 & this.buf[this.pos]) << 7 * i + 3) >>> 0, this.buf[this.pos++] < 128)
                                        return t;
                            }
                            else
                                for (; i < 5; ++i) {
                                    if (this.pos >= this.len)
                                        throw o(this);
                                    if (t.hi = (t.hi | (127 & this.buf[this.pos]) << 7 * i + 3) >>> 0, this.buf[this.pos++] < 128)
                                        return t;
                                } throw Error("invalid varint encoding"); } function d(t, i) { return (t[i - 4] | t[i - 3] << 8 | t[i - 2] << 16 | t[i - 1] << 24) >>> 0; } function v() { if (this.pos + 8 > this.len)
                                throw o(this, 8); return new s(d(this.buf, this.pos += 4), d(this.buf, this.pos += 4)); } h.create = f(), h.prototype.h = e.Array.prototype.subarray || e.Array.prototype.slice, h.prototype.uint32 = (c = 4294967295, function () { if (c = (127 & this.buf[this.pos]) >>> 0, this.buf[this.pos++] < 128 || (c = (c | (127 & this.buf[this.pos]) << 7) >>> 0, this.buf[this.pos++] < 128 || (c = (c | (127 & this.buf[this.pos]) << 14) >>> 0, this.buf[this.pos++] < 128 || (c = (c | (127 & this.buf[this.pos]) << 21) >>> 0, this.buf[this.pos++] < 128 || (c = (c | (15 & this.buf[this.pos]) << 28) >>> 0, this.buf[this.pos++] < 128 || !((this.pos += 5) > this.len))))))
                                return c; throw this.pos = this.len, o(this, 10); }), h.prototype.int32 = function () { return 0 | this.uint32(); }, h.prototype.sint32 = function () { var t = this.uint32(); return t >>> 1 ^ -(1 & t) | 0; }, h.prototype.bool = function () { return 0 !== this.uint32(); }, h.prototype.fixed32 = function () { if (this.pos + 4 > this.len)
                                throw o(this, 4); return d(this.buf, this.pos += 4); }, h.prototype.sfixed32 = function () { if (this.pos + 4 > this.len)
                                throw o(this, 4); return 0 | d(this.buf, this.pos += 4); }, h.prototype.float = function () { if (this.pos + 4 > this.len)
                                throw o(this, 4); var t = e.float.readFloatLE(this.buf, this.pos); return this.pos += 4, t; }, h.prototype.double = function () { if (this.pos + 8 > this.len)
                                throw o(this, 4); var t = e.float.readDoubleLE(this.buf, this.pos); return this.pos += 8, t; }, h.prototype.bytes = function () { var t = this.uint32(), i = this.pos, n = this.pos + t; if (n > this.len)
                                throw o(this, t); return this.pos += t, Array.isArray(this.buf) ? this.buf.slice(i, n) : i === n ? new this.buf.constructor(0) : this.h.call(this.buf, i, n); }, h.prototype.string = function () { var t = this.bytes(); return u.read(t, 0, t.length); }, h.prototype.skip = function (t) { if ("number" == typeof t) {
                                if (this.pos + t > this.len)
                                    throw o(this, t);
                                this.pos += t;
                            }
                            else
                                do {
                                    if (this.pos >= this.len)
                                        throw o(this);
                                } while (128 & this.buf[this.pos++]); return this; }, h.prototype.skipType = function (t) { switch (t) {
                                case 0:
                                    this.skip();
                                    break;
                                case 1:
                                    this.skip(8);
                                    break;
                                case 2:
                                    this.skip(this.uint32());
                                    break;
                                case 3:
                                    for (; 4 != (t = 7 & this.uint32());)
                                        this.skipType(t);
                                    break;
                                case 5:
                                    this.skip(4);
                                    break;
                                default: throw Error("invalid wire type " + t + " at offset " + this.pos);
                            } return this; }, h.r = function (t) { r = t, h.create = f(), r.r(); var i = e.Long ? "toLong" : "toNumber"; e.merge(h.prototype, { int64: function () { return l.call(this)[i](!1); }, uint64: function () { return l.call(this)[i](!0); }, sint64: function () { return l.call(this).zzDecode()[i](!1); }, fixed64: function () { return v.call(this)[i](!0); }, sfixed64: function () { return v.call(this)[i](!1); } }); }; }, { 35: 35 }], 25: [function (t, i, n) { i.exports = s; var r = t(24), e = ((s.prototype = Object.create(r.prototype)).constructor = s, t(35)); function s(t) { r.call(this, t); } s.r = function () { e.Buffer && (s.prototype.h = e.Buffer.prototype.slice); }, s.prototype.string = function () { var t = this.uint32(); return this.buf.utf8Slice ? this.buf.utf8Slice(this.pos, this.pos = Math.min(this.pos + t, this.len)) : this.buf.toString("utf-8", this.pos, this.pos = Math.min(this.pos + t, this.len)); }, s.r(); }, { 24: 24, 35: 35 }], 26: [function (t, i, n) { i.exports = h; var r, d, v, e = t(21), s = (((h.prototype = Object.create(e.prototype)).constructor = h).className = "Root", t(15)), u = t(14), o = t(23), b = t(33); function h(t) { e.call(this, "", t), this.deferred = [], this.files = []; } function p() { } h.fromJSON = function (t, i) { return i = i || new h, t.options && i.setOptions(t.options), i.addJSON(t.nested); }, h.prototype.resolvePath = b.path.resolve, h.prototype.fetch = b.fetch, h.prototype.load = function t(i, s, e) { "function" == typeof s && (e = s, s = g); var u = this; if (!e)
                                return b.asPromise(t, u, i, s); var o = e === p; function h(t, i) { if (e) {
                                var n = e;
                                if (e = null, o)
                                    throw t;
                                n(t, i);
                            } } function f(t) { var i = t.lastIndexOf("google/protobuf/"); if (-1 < i) {
                                t = t.substring(i);
                                if (t in v)
                                    return t;
                            } return null; } function c(t, i) { try {
                                if (b.isString(i) && "{" == (i[0] || "") && (i = JSON.parse(i)), b.isString(i)) {
                                    d.filename = t;
                                    var n, r = d(i, u, s), e = 0;
                                    if (r.imports)
                                        for (; e < r.imports.length; ++e)
                                            (n = f(r.imports[e]) || u.resolvePath(t, r.imports[e])) && a(n);
                                    if (r.weakImports)
                                        for (e = 0; e < r.weakImports.length; ++e)
                                            (n = f(r.weakImports[e]) || u.resolvePath(t, r.weakImports[e])) && a(n, !0);
                                }
                                else
                                    u.setOptions(i.options).addJSON(i.nested);
                            }
                            catch (t) {
                                h(t);
                            } o || l || h(null, u); } function a(n, r) { if (!~u.files.indexOf(n))
                                if (u.files.push(n), n in v)
                                    o ? c(n, v[n]) : (++l, setTimeout(function () { --l, c(n, v[n]); }));
                                else if (o) {
                                    var t;
                                    try {
                                        t = b.fs.readFileSync(n).toString("utf8");
                                    }
                                    catch (t) {
                                        return void (r || h(t));
                                    }
                                    c(n, t);
                                }
                                else
                                    ++l, u.fetch(n, function (t, i) { --l, e && (t ? r ? l || h(null, u) : h(t) : c(n, i)); }); } var l = 0; b.isString(i) && (i = [i]); for (var n, r = 0; r < i.length; ++r)
                                (n = u.resolvePath("", i[r])) && a(n); return o ? u : (l || h(null, u), g); }, h.prototype.loadSync = function (t, i) { if (b.isNode)
                                return this.load(t, i, p); throw Error("not supported"); }, h.prototype.resolveAll = function () { if (this.deferred.length)
                                throw Error("unresolvable extensions: " + this.deferred.map(function (t) { return "'extend " + t.extend + "' in " + t.parent.fullName; }).join(", ")); return e.prototype.resolveAll.call(this); }; var f = /^[A-Z]/; function c(t, i) { var n, r = i.parent.lookup(i.extend); if (r)
                                return ((n = new s(i.fullName, i.id, i.type, i.rule, g, i.options)).declaringField = i).extensionField = n, r.add(n), 1; } h.prototype.u = function (t) { if (t instanceof s)
                                t.extend === g || t.extensionField || c(0, t) || this.deferred.push(t);
                            else if (t instanceof u)
                                f.test(t.name) && (t.parent[t.name] = t.values);
                            else if (!(t instanceof o)) {
                                if (t instanceof r)
                                    for (var i = 0; i < this.deferred.length;)
                                        c(0, this.deferred[i]) ? this.deferred.splice(i, 1) : ++i;
                                for (var n = 0; n < t.nestedArray.length; ++n)
                                    this.u(t.e[n]);
                                f.test(t.name) && (t.parent[t.name] = t);
                            } }, h.prototype.o = function (t) { var i; if (t instanceof s)
                                t.extend !== g && (t.extensionField ? (t.extensionField.parent.remove(t.extensionField), t.extensionField = null) : -1 < (i = this.deferred.indexOf(t)) && this.deferred.splice(i, 1));
                            else if (t instanceof u)
                                f.test(t.name) && delete t.parent[t.name];
                            else if (t instanceof e) {
                                for (var n = 0; n < t.nestedArray.length; ++n)
                                    this.o(t.e[n]);
                                f.test(t.name) && delete t.parent[t.name];
                            } }, h.r = function (t, i, n) { r = t, d = i, v = n; }; }, { 14: 14, 15: 15, 21: 21, 23: 23, 33: 33 }], 27: [function (t, i, n) { i.exports = {}; }, {}], 28: [function (t, i, n) { n.Service = t(29); }, { 29: 29 }], 29: [function (t, i, n) { i.exports = r; var o = t(35); function r(t, i, n) { if ("function" != typeof t)
                                throw TypeError("rpcImpl must be a function"); o.EventEmitter.call(this), this.rpcImpl = t, this.requestDelimited = !!i, this.responseDelimited = !!n; } ((r.prototype = Object.create(o.EventEmitter.prototype)).constructor = r).prototype.rpcCall = function t(n, i, r, e, s) { if (!e)
                                throw TypeError("request must be specified"); var u = this; if (!s)
                                return o.asPromise(t, u, n, i, r, e); if (!u.rpcImpl)
                                return setTimeout(function () { s(Error("already ended")); }, 0), g; try {
                                return u.rpcImpl(n, i[u.requestDelimited ? "encodeDelimited" : "encode"](e).finish(), function (t, i) { if (t)
                                    return u.emit("error", t, n), s(t); if (null === i)
                                    return u.end(!0), g; if (!(i instanceof r))
                                    try {
                                        i = r[u.responseDelimited ? "decodeDelimited" : "decode"](i);
                                    }
                                    catch (t) {
                                        return u.emit("error", t, n), s(t);
                                    } return u.emit("data", i, n), s(null, i); });
                            }
                            catch (t) {
                                return u.emit("error", t, n), setTimeout(function () { s(t); }, 0), g;
                            } }, r.prototype.end = function (t) { return this.rpcImpl && (t || this.rpcImpl(null, null, null), this.rpcImpl = null, this.emit("end").off()), this; }; }, { 35: 35 }], 30: [function (t, i, n) { i.exports = u; var r = t(21), s = (((u.prototype = Object.create(r.prototype)).constructor = u).className = "Service", t(20)), o = t(33), h = t(28); function u(t, i) { r.call(this, t, i), this.methods = {}, this.f = null; } function e(t) { return t.f = null, t; } u.fromJSON = function (t, i) { var n = new u(t, i.options); if (i.methods)
                                for (var r = Object.keys(i.methods), e = 0; e < r.length; ++e)
                                    n.add(s.fromJSON(r[e], i.methods[r[e]])); return i.nested && n.addJSON(i.nested), n.comment = i.comment, n; }, u.prototype.toJSON = function (t) { var i = r.prototype.toJSON.call(this, t), n = !!t && !!t.keepComments; return o.toObject(["options", i && i.options || g, "methods", r.arrayToJSON(this.methodsArray, t) || {}, "nested", i && i.nested || g, "comment", n ? this.comment : g]); }, Object.defineProperty(u.prototype, "methodsArray", { get: function () { return this.f || (this.f = o.toArray(this.methods)); } }), u.prototype.get = function (t) { return this.methods[t] || r.prototype.get.call(this, t); }, u.prototype.resolveAll = function () { for (var t = this.methodsArray, i = 0; i < t.length; ++i)
                                t[i].resolve(); return r.prototype.resolve.call(this); }, u.prototype.add = function (t) { if (this.get(t.name))
                                throw Error("duplicate name '" + t.name + "' in " + this); return t instanceof s ? e((this.methods[t.name] = t).parent = this) : r.prototype.add.call(this, t); }, u.prototype.remove = function (t) { if (t instanceof s) {
                                if (this.methods[t.name] !== t)
                                    throw Error(t + " is not a member of " + this);
                                return delete this.methods[t.name], t.parent = null, e(this);
                            } return r.prototype.remove.call(this, t); }, u.prototype.create = function (t, i, n) { for (var r, e = new h.Service(t, i, n), s = 0; s < this.methodsArray.length; ++s) {
                                var u = o.lcFirst((r = this.f[s]).resolve().name).replace(/[^$\w_]/g, "");
                                e[u] = o.codegen(["r", "c"], o.isReserved(u) ? u + "_" : u)("return this.rpcCall(m,q,s,r,c)")({ m: r, q: r.resolvedRequestType.ctor, s: r.resolvedResponseType.ctor });
                            } return e; }; }, { 20: 20, 21: 21, 28: 28, 33: 33 }], 31: [function (t, i, n) { i.exports = w; var u = t(21), o = (((w.prototype = Object.create(u.prototype)).constructor = w).className = "Type", t(14)), h = t(23), f = t(15), c = t(18), a = t(30), e = t(19), s = t(24), l = t(38), d = t(33), v = t(13), b = t(12), p = t(36), y = t(11), m = t(37); function w(t, i) { u.call(this, t, i), this.fields = {}, this.oneofs = g, this.extensions = g, this.reserved = g, this.group = g, this.c = null, this.i = null, this.a = null, this.l = null; } function r(t) { return t.c = t.i = t.a = null, delete t.encode, delete t.decode, delete t.verify, t; } Object.defineProperties(w.prototype, { fieldsById: { get: function () { if (!this.c) {
                                        this.c = {};
                                        for (var t = Object.keys(this.fields), i = 0; i < t.length; ++i) {
                                            var n = this.fields[t[i]], r = n.id;
                                            if (this.c[r])
                                                throw Error("duplicate id " + r + " in " + this);
                                            this.c[r] = n;
                                        }
                                    } return this.c; } }, fieldsArray: { get: function () { return this.i || (this.i = d.toArray(this.fields)); } }, oneofsArray: { get: function () { return this.a || (this.a = d.toArray(this.oneofs)); } }, ctor: { get: function () { return this.l || (this.ctor = w.generateConstructor(this)()); }, set: function (t) { for (var i = t.prototype, n = (i instanceof e || ((t.prototype = new e).constructor = t, d.merge(t.prototype, i)), t.$type = t.prototype.$type = this, d.merge(t, e, !0), this.l = t, 0); n < this.fieldsArray.length; ++n)
                                        this.i[n].resolve(); for (var r = {}, n = 0; n < this.oneofsArray.length; ++n)
                                        r[this.a[n].resolve().name] = { get: d.oneOfGetter(this.a[n].oneof), set: d.oneOfSetter(this.a[n].oneof) }; n && Object.defineProperties(t.prototype, r); } } }), w.generateConstructor = function (t) { for (var i, n = d.codegen(["p"], t.name), r = 0; r < t.fieldsArray.length; ++r)
                                (i = t.i[r]).map ? n("this%s={}", d.safeProp(i.name)) : i.repeated && n("this%s=[]", d.safeProp(i.name)); return n("if(p)for(var ks=Object.keys(p),i=0;i<ks.length;++i)if(p[ks[i]]!=null)")("this[ks[i]]=p[ks[i]]"); }, w.fromJSON = function (t, i) { for (var n = new w(t, i.options), r = (n.extensions = i.extensions, n.reserved = i.reserved, Object.keys(i.fields)), e = 0; e < r.length; ++e)
                                n.add((void 0 !== i.fields[r[e]].keyType ? c : f).fromJSON(r[e], i.fields[r[e]])); if (i.oneofs)
                                for (r = Object.keys(i.oneofs), e = 0; e < r.length; ++e)
                                    n.add(h.fromJSON(r[e], i.oneofs[r[e]])); if (i.nested)
                                for (r = Object.keys(i.nested), e = 0; e < r.length; ++e) {
                                    var s = i.nested[r[e]];
                                    n.add((s.id !== g ? f : s.fields !== g ? w : s.values !== g ? o : s.methods !== g ? a : u).fromJSON(r[e], s));
                                } return i.extensions && i.extensions.length && (n.extensions = i.extensions), i.reserved && i.reserved.length && (n.reserved = i.reserved), i.group && (n.group = !0), i.comment && (n.comment = i.comment), n; }, w.prototype.toJSON = function (t) { var i = u.prototype.toJSON.call(this, t), n = !!t && !!t.keepComments; return d.toObject(["options", i && i.options || g, "oneofs", u.arrayToJSON(this.oneofsArray, t), "fields", u.arrayToJSON(this.fieldsArray.filter(function (t) { return !t.declaringField; }), t) || {}, "extensions", this.extensions && this.extensions.length ? this.extensions : g, "reserved", this.reserved && this.reserved.length ? this.reserved : g, "group", this.group || g, "nested", i && i.nested || g, "comment", n ? this.comment : g]); }, w.prototype.resolveAll = function () { for (var t = this.fieldsArray, i = 0; i < t.length;)
                                t[i++].resolve(); for (var n = this.oneofsArray, i = 0; i < n.length;)
                                n[i++].resolve(); return u.prototype.resolveAll.call(this); }, w.prototype.get = function (t) { return this.fields[t] || this.oneofs && this.oneofs[t] || this.nested && this.nested[t] || null; }, w.prototype.add = function (t) { if (this.get(t.name))
                                throw Error("duplicate name '" + t.name + "' in " + this); if (t instanceof f && t.extend === g) {
                                if ((this.c || this.fieldsById)[t.id])
                                    throw Error("duplicate id " + t.id + " in " + this);
                                if (this.isReservedId(t.id))
                                    throw Error("id " + t.id + " is reserved in " + this);
                                if (this.isReservedName(t.name))
                                    throw Error("name '" + t.name + "' is reserved in " + this);
                                return t.parent && t.parent.remove(t), (this.fields[t.name] = t).message = this, t.onAdd(this), r(this);
                            } return t instanceof h ? (this.oneofs || (this.oneofs = {}), (this.oneofs[t.name] = t).onAdd(this), r(this)) : u.prototype.add.call(this, t); }, w.prototype.remove = function (t) { if (t instanceof f && t.extend === g) {
                                if (this.fields && this.fields[t.name] === t)
                                    return delete this.fields[t.name], t.parent = null, t.onRemove(this), r(this);
                                throw Error(t + " is not a member of " + this);
                            } if (t instanceof h) {
                                if (this.oneofs && this.oneofs[t.name] === t)
                                    return delete this.oneofs[t.name], t.parent = null, t.onRemove(this), r(this);
                                throw Error(t + " is not a member of " + this);
                            } return u.prototype.remove.call(this, t); }, w.prototype.isReservedId = function (t) { return u.isReservedId(this.reserved, t); }, w.prototype.isReservedName = function (t) { return u.isReservedName(this.reserved, t); }, w.prototype.create = function (t) { return new this.ctor(t); }, w.prototype.setup = function () { for (var t = this.fullName, i = [], n = 0; n < this.fieldsArray.length; ++n)
                                i.push(this.i[n].resolve().resolvedType); this.encode = v(this)({ Writer: l, types: i, util: d }), this.decode = b(this)({ Reader: s, types: i, util: d }), this.verify = p(this)({ types: i, util: d }), this.fromObject = y.fromObject(this)({ types: i, util: d }), this.toObject = y.toObject(this)({ types: i, util: d }); var r, t = m[t]; return t && ((r = Object.create(this)).fromObject = this.fromObject, this.fromObject = t.fromObject.bind(r), r.toObject = this.toObject, this.toObject = t.toObject.bind(r)), this; }, w.prototype.encode = function (t, i) { return this.setup().encode(t, i); }, w.prototype.encodeDelimited = function (t, i) { return this.encode(t, i && i.len ? i.fork() : i).ldelim(); }, w.prototype.decode = function (t, i) { return this.setup().decode(t, i); }, w.prototype.decodeDelimited = function (t) { return t instanceof s || (t = s.create(t)), this.decode(t, t.uint32()); }, w.prototype.verify = function (t) { return this.setup().verify(t); }, w.prototype.fromObject = function (t) { return this.setup().fromObject(t); }, w.prototype.toObject = function (t, i) { return this.setup().toObject(t, i); }, w.d = function (i) { return function (t) { d.decorateType(t, i); }; }; }, { 11: 11, 12: 12, 13: 13, 14: 14, 15: 15, 18: 18, 19: 19, 21: 21, 23: 23, 24: 24, 30: 30, 33: 33, 36: 36, 37: 37, 38: 38 }], 32: [function (t, i, n) { var t = t(33), e = ["double", "float", "int32", "uint32", "sint32", "fixed32", "sfixed32", "int64", "uint64", "sint64", "fixed64", "sfixed64", "bool", "string", "bytes"]; function r(t, i) { var n = 0, r = {}; for (i |= 0; n < t.length;)
                                r[e[n + i]] = t[n++]; return r; } n.basic = r([1, 5, 0, 0, 0, 5, 5, 0, 0, 0, 1, 1, 0, 2, 2]), n.defaults = r([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, !1, "", t.emptyArray, null]), n.long = r([0, 0, 0, 1, 1], 7), n.mapKey = r([0, 0, 0, 5, 5, 0, 0, 0, 1, 1, 0, 2], 2), n.packed = r([1, 5, 0, 0, 0, 5, 5, 0, 0, 0, 1, 1, 0]); }, { 33: 33 }], 33: [function (n, t, i) { var r, e, s = t.exports = n(35), u = n(27), o = (s.codegen = n(3), s.fetch = n(5), s.path = n(8), s.fs = s.inquire("fs"), s.toArray = function (t) { if (t) {
                                for (var i = Object.keys(t), n = Array(i.length), r = 0; r < i.length;)
                                    n[r] = t[i[r++]];
                                return n;
                            } return []; }, s.toObject = function (t) { for (var i = {}, n = 0; n < t.length;) {
                                var r = t[n++], e = t[n++];
                                e !== g && (i[r] = e);
                            } return i; }, /\\/g), h = /"/g, f = (s.isReserved = function (t) { return /^(?:do|if|in|for|let|new|try|var|case|else|enum|eval|false|null|this|true|void|with|break|catch|class|const|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$/.test(t); }, s.safeProp = function (t) { return !/^[$\w_]+$/.test(t) || s.isReserved(t) ? '["' + t.replace(o, "\\\\").replace(h, '\\"') + '"]' : "." + t; }, s.ucFirst = function (t) { return (t[0] || "").toUpperCase() + t.substring(1); }, /_([a-z])/g), c = (s.camelCase = function (t) { return t.substring(0, 1) + t.substring(1).replace(f, function (t, i) { return i.toUpperCase(); }); }, s.compareFieldsById = function (t, i) { return t.id - i.id; }, s.decorateType = function (t, i) { return t.$type ? (i && t.$type.name !== i && (s.decorateRoot.remove(t.$type), t.$type.name = i, s.decorateRoot.add(t.$type)), t.$type) : (i = new (r = r || n(31))(i || t.name), s.decorateRoot.add(i), i.ctor = t, Object.defineProperty(t, "$type", { value: i, enumerable: !1 }), Object.defineProperty(t.prototype, "$type", { value: i, enumerable: !1 }), i); }, 0); s.decorateEnum = function (t) { var i; return t.$type || (i = new (e = e || n(14))("Enum" + c++, t), s.decorateRoot.add(i), Object.defineProperty(t, "$type", { value: i, enumerable: !1 }), i); }, s.setProperty = function (t, i, n) { if ("object" != typeof t)
                                throw TypeError("dst must be an object"); if (i)
                                return function t(i, n, r) { var e = n.shift(); return "__proto__" !== e && (0 < n.length ? i[e] = t(i[e] || {}, n, r) : ((n = i[e]) && (r = [].concat(n).concat(r)), i[e] = r)), i; }(t, i = i.split("."), n); throw TypeError("path must be specified"); }, Object.defineProperty(s, "decorateRoot", { get: function () { return u.decorated || (u.decorated = new (n(26))); } }); }, { 14: 14, 26: 26, 27: 27, 3: 3, 31: 31, 35: 35, 5: 5, 8: 8 }], 34: [function (t, i, n) { i.exports = e; var r = t(35); function e(t, i) { this.lo = t >>> 0, this.hi = i >>> 0; } var s = e.zero = new e(0, 0), u = (s.toNumber = function () { return 0; }, s.zzEncode = s.zzDecode = function () { return this; }, s.length = function () { return 1; }, e.zeroHash = "\0\0\0\0\0\0\0\0", e.fromNumber = function (t) { var i, n; return 0 === t ? s : (n = (t = (i = t < 0) ? -t : t) >>> 0, t = (t - n) / 4294967296 >>> 0, i && (t = ~t >>> 0, n = ~n >>> 0, 4294967295 < ++n && (n = 0, 4294967295 < ++t && (t = 0))), new e(n, t)); }, e.from = function (t) { if ("number" == typeof t)
                                return e.fromNumber(t); if (r.isString(t)) {
                                if (!r.Long)
                                    return e.fromNumber(parseInt(t, 10));
                                t = r.Long.fromString(t);
                            } return t.low || t.high ? new e(t.low >>> 0, t.high >>> 0) : s; }, e.prototype.toNumber = function (t) { var i; return !t && this.hi >>> 31 ? (t = 1 + ~this.lo >>> 0, i = ~this.hi >>> 0, -(t + 4294967296 * (i = t ? i : i + 1 >>> 0))) : this.lo + 4294967296 * this.hi; }, e.prototype.toLong = function (t) { return r.Long ? new r.Long(0 | this.lo, 0 | this.hi, !!t) : { low: 0 | this.lo, high: 0 | this.hi, unsigned: !!t }; }, String.prototype.charCodeAt); e.fromHash = function (t) { return "\0\0\0\0\0\0\0\0" === t ? s : new e((u.call(t, 0) | u.call(t, 1) << 8 | u.call(t, 2) << 16 | u.call(t, 3) << 24) >>> 0, (u.call(t, 4) | u.call(t, 5) << 8 | u.call(t, 6) << 16 | u.call(t, 7) << 24) >>> 0); }, e.prototype.toHash = function () { return String.fromCharCode(255 & this.lo, this.lo >>> 8 & 255, this.lo >>> 16 & 255, this.lo >>> 24, 255 & this.hi, this.hi >>> 8 & 255, this.hi >>> 16 & 255, this.hi >>> 24); }, e.prototype.zzEncode = function () { var t = this.hi >> 31; return this.hi = ((this.hi << 1 | this.lo >>> 31) ^ t) >>> 0, this.lo = (this.lo << 1 ^ t) >>> 0, this; }, e.prototype.zzDecode = function () { var t = -(1 & this.lo); return this.lo = ((this.lo >>> 1 | this.hi << 31) ^ t) >>> 0, this.hi = (this.hi >>> 1 ^ t) >>> 0, this; }, e.prototype.length = function () { var t = this.lo, i = (this.lo >>> 28 | this.hi << 4) >>> 0, n = this.hi >>> 24; return 0 == n ? 0 == i ? t < 16384 ? t < 128 ? 1 : 2 : t < 2097152 ? 3 : 4 : i < 16384 ? i < 128 ? 5 : 6 : i < 2097152 ? 7 : 8 : n < 128 ? 9 : 10; }; }, { 35: 35 }], 35: [function (t, i, n) { var r = n; function e(t, i, n) { for (var r = Object.keys(i), e = 0; e < r.length; ++e)
                                t[r[e]] !== g && n || (t[r[e]] = i[r[e]]); return t; } function s(t) { function n(t, i) { if (!(this instanceof n))
                                return new n(t, i); Object.defineProperty(this, "message", { get: function () { return t; } }), Error.captureStackTrace ? Error.captureStackTrace(this, n) : Object.defineProperty(this, "stack", { value: Error().stack || "" }), i && e(this, i); } return n.prototype = Object.create(Error.prototype, { constructor: { value: n, writable: !0, enumerable: !1, configurable: !0 }, name: { get() { return t; }, set: g, enumerable: !1, configurable: !0 }, toString: { value() { return this.name + ": " + this.message; }, writable: !0, enumerable: !1, configurable: !0 } }), n; } r.asPromise = t(1), r.base64 = t(2), r.EventEmitter = t(4), r.float = t(6), r.inquire = t(7), r.utf8 = t(10), r.pool = t(9), r.LongBits = t(34), r.isNode = !!("undefined" != typeof global && global && global.process && global.process.versions && global.process.versions.node), r.global = r.isNode && global || "undefined" != typeof window && window || "undefined" != typeof self && self || this, r.emptyArray = Object.freeze ? Object.freeze([]) : [], r.emptyObject = Object.freeze ? Object.freeze({}) : {}, r.isInteger = Number.isInteger || function (t) { return "number" == typeof t && isFinite(t) && Math.floor(t) === t; }, r.isString = function (t) { return "string" == typeof t || t instanceof String; }, r.isObject = function (t) { return t && "object" == typeof t; }, r.isset = r.isSet = function (t, i) { var n = t[i]; return null != n && t.hasOwnProperty(i) && ("object" != typeof n || 0 < (Array.isArray(n) ? n : Object.keys(n)).length); }, r.Buffer = function () { try {
                                var t = r.inquire("buffer").Buffer;
                                return t.prototype.utf8Write ? t : null;
                            }
                            catch (t) {
                                return null;
                            } }(), r.v = null, r.b = null, r.newBuffer = function (t) { return "number" == typeof t ? r.Buffer ? r.b(t) : new r.Array(t) : r.Buffer ? r.v(t) : "undefined" == typeof Uint8Array ? t : new Uint8Array(t); }, r.Array = "undefined" != typeof Uint8Array ? Uint8Array : Array, r.Long = r.global.dcodeIO && r.global.dcodeIO.Long || r.global.Long || r.inquire("long"), r.key2Re = /^true|false|0|1$/, r.key32Re = /^-?(?:0|[1-9][0-9]*)$/, r.key64Re = /^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/, r.longToHash = function (t) { return t ? r.LongBits.from(t).toHash() : r.LongBits.zeroHash; }, r.longFromHash = function (t, i) { t = r.LongBits.fromHash(t); return r.Long ? r.Long.fromBits(t.lo, t.hi, i) : t.toNumber(!!i); }, r.merge = e, r.lcFirst = function (t) { return (t[0] || "").toLowerCase() + t.substring(1); }, r.newError = s, r.ProtocolError = s("ProtocolError"), r.oneOfGetter = function (t) { for (var n = {}, i = 0; i < t.length; ++i)
                                n[t[i]] = 1; return function () { for (var t = Object.keys(this), i = t.length - 1; -1 < i; --i)
                                if (1 === n[t[i]] && this[t[i]] !== g && null !== this[t[i]])
                                    return t[i]; }; }, r.oneOfSetter = function (n) { return function (t) { for (var i = 0; i < n.length; ++i)
                                n[i] !== t && delete this[n[i]]; }; }, r.toJSONOptions = { longs: String, enums: String, bytes: String, json: !0 }, r.r = function () { var n = r.Buffer; n ? (r.v = n.from !== Uint8Array.from && n.from || function (t, i) { return new n(t, i); }, r.b = n.allocUnsafe || function (t) { return new n(t); }) : r.v = r.b = null; }; }, { 1: 1, 10: 10, 2: 2, 34: 34, 4: 4, 6: 6, 7: 7, 9: 9 }], 36: [function (t, i, n) { i.exports = function (t) { var i = h.codegen(["m"], t.name + "$verify")('if(typeof m!=="object"||m===null)')("return%j", "object expected"), n = t.oneofsArray, r = {}; n.length && i("var p={}"); for (var e = 0; e < t.fieldsArray.length; ++e) {
                                var s, u = t.i[e].resolve(), o = "m" + h.safeProp(u.name);
                                u.optional && i("if(%s!=null&&m.hasOwnProperty(%j)){", o, u.name), u.map ? (i("if(!util.isObject(%s))", o)("return%j", f(u, "object"))("var k=Object.keys(%s)", o)("for(var i=0;i<k.length;++i){"), function (t, i, n) { switch (i.keyType) {
                                    case "int32":
                                    case "uint32":
                                    case "sint32":
                                    case "fixed32":
                                    case "sfixed32":
                                        t("if(!util.key32Re.test(%s))", n)("return%j", f(i, "integer key"));
                                        break;
                                    case "int64":
                                    case "uint64":
                                    case "sint64":
                                    case "fixed64":
                                    case "sfixed64":
                                        t("if(!util.key64Re.test(%s))", n)("return%j", f(i, "integer|Long key"));
                                        break;
                                    case "bool": t("if(!util.key2Re.test(%s))", n)("return%j", f(i, "boolean key"));
                                } }(i, u, "k[i]"), c(i, u, e, o + "[k[i]]")("}")) : u.repeated ? (i("if(!Array.isArray(%s))", o)("return%j", f(u, "array"))("for(var i=0;i<%s.length;++i){", o), c(i, u, e, o + "[i]")("}")) : (u.partOf && (s = h.safeProp(u.partOf.name), 1 === r[u.partOf.name] && i("if(p%s===1)", s)("return%j", u.partOf.name + ": multiple values"), r[u.partOf.name] = 1, i("p%s=1", s)), c(i, u, e, o)), u.optional && i("}");
                            } return i("return null"); }; var u = t(14), h = t(33); function f(t, i) { return t.name + ": " + i + (t.repeated && "array" !== i ? "[]" : t.map && "object" !== i ? "{k:" + t.keyType + "}" : "") + " expected"; } function c(t, i, n, r) { if (i.resolvedType)
                                if (i.resolvedType instanceof u) {
                                    t("switch(%s){", r)("default:")("return%j", f(i, "enum value"));
                                    for (var e = Object.keys(i.resolvedType.values), s = 0; s < e.length; ++s)
                                        t("case %i:", i.resolvedType.values[e[s]]);
                                    t("break")("}");
                                }
                                else
                                    t("{")("var e=types[%i].verify(%s);", n, r)("if(e)")("return%j+e", i.name + ".")("}");
                            else
                                switch (i.type) {
                                    case "int32":
                                    case "uint32":
                                    case "sint32":
                                    case "fixed32":
                                    case "sfixed32":
                                        t("if(!util.isInteger(%s))", r)("return%j", f(i, "integer"));
                                        break;
                                    case "int64":
                                    case "uint64":
                                    case "sint64":
                                    case "fixed64":
                                    case "sfixed64":
                                        t("if(!util.isInteger(%s)&&!(%s&&util.isInteger(%s.low)&&util.isInteger(%s.high)))", r, r, r, r)("return%j", f(i, "integer|Long"));
                                        break;
                                    case "float":
                                    case "double":
                                        t('if(typeof %s!=="number")', r)("return%j", f(i, "number"));
                                        break;
                                    case "bool":
                                        t('if(typeof %s!=="boolean")', r)("return%j", f(i, "boolean"));
                                        break;
                                    case "string":
                                        t("if(!util.isString(%s))", r)("return%j", f(i, "string"));
                                        break;
                                    case "bytes": t('if(!(%s&&typeof %s.length==="number"||util.isString(%s)))', r, r, r)("return%j", f(i, "buffer"));
                                } return t; } }, { 14: 14, 33: 33 }], 37: [function (t, i, n) { var u = t(19); n[".google.protobuf.Any"] = { fromObject: function (t) { if (t && t["@type"]) {
                                    var i, n = t["@type"].substring(1 + t["@type"].lastIndexOf("/")), n = this.lookup(n);
                                    if (n)
                                        return ~(i = "." == (t["@type"][0] || "") ? t["@type"].slice(1) : t["@type"]).indexOf("/") || (i = "/" + i), this.create({ type_url: i, value: n.encode(n.fromObject(t)).finish() });
                                } return this.fromObject(t); }, toObject: function (t, i) { var n, r, e = "", s = ""; return i && i.json && t.type_url && t.value && (s = t.type_url.substring(1 + t.type_url.lastIndexOf("/")), e = t.type_url.substring(0, 1 + t.type_url.lastIndexOf("/")), (n = this.lookup(s)) && (t = n.decode(t.value))), !(t instanceof this.ctor) && t instanceof u ? (n = t.$type.toObject(t, i), r = "." === t.$type.fullName[0] ? t.$type.fullName.slice(1) : t.$type.fullName, n["@type"] = s = (e = "" === e ? "type.googleapis.com/" : e) + r, n) : this.toObject(t, i); } }; }, { 19: 19 }], 38: [function (t, i, n) { i.exports = a; var r, e = t(35), s = e.LongBits, u = e.base64, o = e.utf8; function h(t, i, n) { this.fn = t, this.len = i, this.next = g, this.val = n; } function f() { } function c(t) { this.head = t.head, this.tail = t.tail, this.len = t.len, this.next = t.states; } function a() { this.len = 0, this.head = new h(f, 0, 0), this.tail = this.head, this.states = null; } function l() { return e.Buffer ? function () { return (a.create = function () { return new r; })(); } : function () { return new a; }; } function d(t, i, n) { i[n] = 255 & t; } function v(t, i) { this.len = t, this.next = g, this.val = i; } function b(t, i, n) { for (; t.hi;)
                                i[n++] = 127 & t.lo | 128, t.lo = (t.lo >>> 7 | t.hi << 25) >>> 0, t.hi >>>= 7; for (; 127 < t.lo;)
                                i[n++] = 127 & t.lo | 128, t.lo = t.lo >>> 7; i[n++] = t.lo; } function p(t, i, n) { i[n] = 255 & t, i[n + 1] = t >>> 8 & 255, i[n + 2] = t >>> 16 & 255, i[n + 3] = t >>> 24; } a.create = l(), a.alloc = function (t) { return new e.Array(t); }, e.Array !== Array && (a.alloc = e.pool(a.alloc, e.Array.prototype.subarray)), a.prototype.p = function (t, i, n) { return this.tail = this.tail.next = new h(t, i, n), this.len += i, this; }, (v.prototype = Object.create(h.prototype)).fn = function (t, i, n) { for (; 127 < t;)
                                i[n++] = 127 & t | 128, t >>>= 7; i[n] = t; }, a.prototype.uint32 = function (t) { return this.len += (this.tail = this.tail.next = new v((t >>>= 0) < 128 ? 1 : t < 16384 ? 2 : t < 2097152 ? 3 : t < 268435456 ? 4 : 5, t)).len, this; }, a.prototype.int32 = function (t) { return t < 0 ? this.p(b, 10, s.fromNumber(t)) : this.uint32(t); }, a.prototype.sint32 = function (t) { return this.uint32((t << 1 ^ t >> 31) >>> 0); }, a.prototype.int64 = a.prototype.uint64 = function (t) { t = s.from(t); return this.p(b, t.length(), t); }, a.prototype.sint64 = function (t) { t = s.from(t).zzEncode(); return this.p(b, t.length(), t); }, a.prototype.bool = function (t) { return this.p(d, 1, t ? 1 : 0); }, a.prototype.sfixed32 = a.prototype.fixed32 = function (t) { return this.p(p, 4, t >>> 0); }, a.prototype.sfixed64 = a.prototype.fixed64 = function (t) { t = s.from(t); return this.p(p, 4, t.lo).p(p, 4, t.hi); }, a.prototype.float = function (t) { return this.p(e.float.writeFloatLE, 4, t); }, a.prototype.double = function (t) { return this.p(e.float.writeDoubleLE, 8, t); }; var y = e.Array.prototype.set ? function (t, i, n) { i.set(t, n); } : function (t, i, n) { for (var r = 0; r < t.length; ++r)
                                i[n + r] = t[r]; }; a.prototype.bytes = function (t) { var i, n = t.length >>> 0; return n ? (e.isString(t) && (i = a.alloc(n = u.length(t)), u.decode(t, i, 0), t = i), this.uint32(n).p(y, n, t)) : this.p(d, 1, 0); }, a.prototype.string = function (t) { var i = o.length(t); return i ? this.uint32(i).p(o.write, i, t) : this.p(d, 1, 0); }, a.prototype.fork = function () { return this.states = new c(this), this.head = this.tail = new h(f, 0, 0), this.len = 0, this; }, a.prototype.reset = function () { return this.states ? (this.head = this.states.head, this.tail = this.states.tail, this.len = this.states.len, this.states = this.states.next) : (this.head = this.tail = new h(f, 0, 0), this.len = 0), this; }, a.prototype.ldelim = function () { var t = this.head, i = this.tail, n = this.len; return this.reset().uint32(n), n && (this.tail.next = t.next, this.tail = i, this.len += n), this; }, a.prototype.finish = function () { for (var t = this.head.next, i = this.constructor.alloc(this.len), n = 0; t;)
                                t.fn(t.val, i, n), n += t.len, t = t.next; return i; }, a.r = function (t) { r = t, a.create = l(), r.r(); }; }, { 35: 35 }], 39: [function (t, i, n) { i.exports = s; var r = t(38), e = ((s.prototype = Object.create(r.prototype)).constructor = s, t(35)); function s() { r.call(this); } function u(t, i, n) { t.length < 40 ? e.utf8.write(t, i, n) : i.utf8Write ? i.utf8Write(t, n) : i.write(t, n); } s.r = function () { s.alloc = e.b, s.writeBytesBuffer = e.Buffer && e.Buffer.prototype instanceof Uint8Array && "set" === e.Buffer.prototype.set.name ? function (t, i, n) { i.set(t, n); } : function (t, i, n) { if (t.copy)
                                t.copy(i, n, 0, t.length);
                            else
                                for (var r = 0; r < t.length;)
                                    i[n++] = t[r++]; }; }, s.prototype.bytes = function (t) { var i = (t = e.isString(t) ? e.v(t, "base64") : t).length >>> 0; return this.uint32(i), i && this.p(s.writeBytesBuffer, i, t), this; }, s.prototype.string = function (t) { var i = e.Buffer.byteLength(t); return this.uint32(i), i && this.p(u, i, t), this; }, s.r(); }, { 35: 35, 38: 38 }] }, {}, [16]);
                }();
                let md5 = null;
                (function () {
                    'use strict';
                    var ERROR = 'input is invalid type';
                    var WINDOW = typeof window === 'object';
                    var root = WINDOW ? window : {};
                    if (root.JS_MD5_NO_WINDOW) {
                        WINDOW = false;
                    }
                    var WEB_WORKER = !WINDOW && typeof self === 'object';
                    var NODE_JS = !root.JS_MD5_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
                    if (NODE_JS) {
                        root = global;
                    }
                    else if (WEB_WORKER) {
                        root = self;
                    }
                    var COMMON_JS = !root.JS_MD5_NO_COMMON_JS && typeof module === 'object' && module.exports;
                    var AMD = typeof define === 'function' && define.amd;
                    var ARRAY_BUFFER = !root.JS_MD5_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
                    var HEX_CHARS = '0123456789abcdef'.split('');
                    var EXTRA = [128, 32768, 8388608, -2147483648];
                    var SHIFT = [0, 8, 16, 24];
                    var OUTPUT_TYPES = ['hex', 'array', 'digest', 'buffer', 'arrayBuffer', 'base64'];
                    var BASE64_ENCODE_CHAR = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');
                    var blocks = [], buffer8;
                    if (ARRAY_BUFFER) {
                        var buffer = new ArrayBuffer(68);
                        buffer8 = new Uint8Array(buffer);
                        blocks = new Uint32Array(buffer);
                    }
                    if (root.JS_MD5_NO_NODE_JS || !Array.isArray) {
                        Array.isArray = function (obj) { return Object.prototype.toString.call(obj) === '[object Array]'; };
                    }
                    if (ARRAY_BUFFER && (root.JS_MD5_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
                        ArrayBuffer.isView = function (obj) { return typeof obj === 'object' && obj.buffer && obj.buffer.constructor === ArrayBuffer; };
                    }
                    var createOutputMethod = function (outputType) { return function (message) { return new Md5(true).update(message)[outputType](); }; };
                    var createMethod = function () { var method = createOutputMethod('hex'); if (NODE_JS) {
                        method = nodeWrap(method);
                    } method.create = function () { return new Md5(); }; method.update = function (message) { return method.create().update(message); }; for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
                        var type = OUTPUT_TYPES[i];
                        method[type] = createOutputMethod(type);
                    } return method; };
                    var nodeWrap = function (method) { var crypto = eval("require('crypto')"); var Buffer = eval("require('buffer').Buffer"); var nodeMethod = function (message) { if (typeof message === 'string') {
                        return crypto.createHash('md5').update(message, 'utf8').digest('hex');
                    }
                    else {
                        if (message === null || message === undefined) {
                            throw ERROR;
                        }
                        else if (message.constructor === ArrayBuffer) {
                            message = new Uint8Array(message);
                        }
                    } if (Array.isArray(message) || ArrayBuffer.isView(message) || message.constructor === Buffer) {
                        return crypto.createHash('md5').update(new Buffer(message)).digest('hex');
                    }
                    else {
                        return method(message);
                    } }; return nodeMethod; };
                    function Md5(sharedMemory) { if (sharedMemory) {
                        blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
                        this.blocks = blocks;
                        this.buffer8 = buffer8;
                    }
                    else {
                        if (ARRAY_BUFFER) {
                            var buffer = new ArrayBuffer(68);
                            this.buffer8 = new Uint8Array(buffer);
                            this.blocks = new Uint32Array(buffer);
                        }
                        else {
                            this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                        }
                    } this.h0 = this.h1 = this.h2 = this.h3 = this.start = this.bytes = this.hBytes = 0; this.finalized = this.hashed = false; this.first = true; }
                    Md5.prototype.update = function (message) { if (this.finalized) {
                        return;
                    } var notString, type = typeof message; if (type !== 'string') {
                        if (type === 'object') {
                            if (message === null) {
                                throw ERROR;
                            }
                            else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
                                message = new Uint8Array(message);
                            }
                            else if (!Array.isArray(message)) {
                                if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
                                    throw ERROR;
                                }
                            }
                        }
                        else {
                            throw ERROR;
                        }
                        notString = true;
                    } var code, index = 0, i, length = message.length, blocks = this.blocks; var buffer8 = this.buffer8; while (index < length) {
                        if (this.hashed) {
                            this.hashed = false;
                            blocks[0] = blocks[16];
                            blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
                        }
                        if (notString) {
                            if (ARRAY_BUFFER) {
                                for (i = this.start; index < length && i < 64; ++index) {
                                    buffer8[i++] = message[index];
                                }
                            }
                            else {
                                for (i = this.start; index < length && i < 64; ++index) {
                                    blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
                                }
                            }
                        }
                        else {
                            if (ARRAY_BUFFER) {
                                for (i = this.start; index < length && i < 64; ++index) {
                                    code = message.charCodeAt(index);
                                    if (code < 0x80) {
                                        buffer8[i++] = code;
                                    }
                                    else if (code < 0x800) {
                                        buffer8[i++] = 0xc0 | (code >> 6);
                                        buffer8[i++] = 0x80 | (code & 0x3f);
                                    }
                                    else if (code < 0xd800 || code >= 0xe000) {
                                        buffer8[i++] = 0xe0 | (code >> 12);
                                        buffer8[i++] = 0x80 | ((code >> 6) & 0x3f);
                                        buffer8[i++] = 0x80 | (code & 0x3f);
                                    }
                                    else {
                                        code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
                                        buffer8[i++] = 0xf0 | (code >> 18);
                                        buffer8[i++] = 0x80 | ((code >> 12) & 0x3f);
                                        buffer8[i++] = 0x80 | ((code >> 6) & 0x3f);
                                        buffer8[i++] = 0x80 | (code & 0x3f);
                                    }
                                }
                            }
                            else {
                                for (i = this.start; index < length && i < 64; ++index) {
                                    code = message.charCodeAt(index);
                                    if (code < 0x80) {
                                        blocks[i >> 2] |= code << SHIFT[i++ & 3];
                                    }
                                    else if (code < 0x800) {
                                        blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
                                        blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
                                    }
                                    else if (code < 0xd800 || code >= 0xe000) {
                                        blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
                                        blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
                                        blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
                                    }
                                    else {
                                        code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
                                        blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
                                        blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
                                        blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
                                        blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
                                    }
                                }
                            }
                        }
                        this.lastByteIndex = i;
                        this.bytes += i - this.start;
                        if (i >= 64) {
                            this.start = i - 64;
                            this.hash();
                            this.hashed = true;
                        }
                        else {
                            this.start = i;
                        }
                    } if (this.bytes > 4294967295) {
                        this.hBytes += this.bytes / 4294967296 << 0;
                        this.bytes = this.bytes % 4294967296;
                    } return this; };
                    Md5.prototype.finalize = function () { if (this.finalized) {
                        return;
                    } this.finalized = true; var blocks = this.blocks, i = this.lastByteIndex; blocks[i >> 2] |= EXTRA[i & 3]; if (i >= 56) {
                        if (!this.hashed) {
                            this.hash();
                        }
                        blocks[0] = blocks[16];
                        blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
                    } blocks[14] = this.bytes << 3; blocks[15] = this.hBytes << 3 | this.bytes >>> 29; this.hash(); };
                    Md5.prototype.hash = function () { var a, b, c, d, bc, da, blocks = this.blocks; if (this.first) {
                        a = blocks[0] - 680876937;
                        a = (a << 7 | a >>> 25) - 271733879 << 0;
                        d = (-1732584194 ^ a & 2004318071) + blocks[1] - 117830708;
                        d = (d << 12 | d >>> 20) + a << 0;
                        c = (-271733879 ^ (d & (a ^ -271733879))) + blocks[2] - 1126478375;
                        c = (c << 17 | c >>> 15) + d << 0;
                        b = (a ^ (c & (d ^ a))) + blocks[3] - 1316259209;
                        b = (b << 22 | b >>> 10) + c << 0;
                    }
                    else {
                        a = this.h0;
                        b = this.h1;
                        c = this.h2;
                        d = this.h3;
                        a += (d ^ (b & (c ^ d))) + blocks[0] - 680876936;
                        a = (a << 7 | a >>> 25) + b << 0;
                        d += (c ^ (a & (b ^ c))) + blocks[1] - 389564586;
                        d = (d << 12 | d >>> 20) + a << 0;
                        c += (b ^ (d & (a ^ b))) + blocks[2] + 606105819;
                        c = (c << 17 | c >>> 15) + d << 0;
                        b += (a ^ (c & (d ^ a))) + blocks[3] - 1044525330;
                        b = (b << 22 | b >>> 10) + c << 0;
                    } a += (d ^ (b & (c ^ d))) + blocks[4] - 176418897; a = (a << 7 | a >>> 25) + b << 0; d += (c ^ (a & (b ^ c))) + blocks[5] + 1200080426; d = (d << 12 | d >>> 20) + a << 0; c += (b ^ (d & (a ^ b))) + blocks[6] - 1473231341; c = (c << 17 | c >>> 15) + d << 0; b += (a ^ (c & (d ^ a))) + blocks[7] - 45705983; b = (b << 22 | b >>> 10) + c << 0; a += (d ^ (b & (c ^ d))) + blocks[8] + 1770035416; a = (a << 7 | a >>> 25) + b << 0; d += (c ^ (a & (b ^ c))) + blocks[9] - 1958414417; d = (d << 12 | d >>> 20) + a << 0; c += (b ^ (d & (a ^ b))) + blocks[10] - 42063; c = (c << 17 | c >>> 15) + d << 0; b += (a ^ (c & (d ^ a))) + blocks[11] - 1990404162; b = (b << 22 | b >>> 10) + c << 0; a += (d ^ (b & (c ^ d))) + blocks[12] + 1804603682; a = (a << 7 | a >>> 25) + b << 0; d += (c ^ (a & (b ^ c))) + blocks[13] - 40341101; d = (d << 12 | d >>> 20) + a << 0; c += (b ^ (d & (a ^ b))) + blocks[14] - 1502002290; c = (c << 17 | c >>> 15) + d << 0; b += (a ^ (c & (d ^ a))) + blocks[15] + 1236535329; b = (b << 22 | b >>> 10) + c << 0; a += (c ^ (d & (b ^ c))) + blocks[1] - 165796510; a = (a << 5 | a >>> 27) + b << 0; d += (b ^ (c & (a ^ b))) + blocks[6] - 1069501632; d = (d << 9 | d >>> 23) + a << 0; c += (a ^ (b & (d ^ a))) + blocks[11] + 643717713; c = (c << 14 | c >>> 18) + d << 0; b += (d ^ (a & (c ^ d))) + blocks[0] - 373897302; b = (b << 20 | b >>> 12) + c << 0; a += (c ^ (d & (b ^ c))) + blocks[5] - 701558691; a = (a << 5 | a >>> 27) + b << 0; d += (b ^ (c & (a ^ b))) + blocks[10] + 38016083; d = (d << 9 | d >>> 23) + a << 0; c += (a ^ (b & (d ^ a))) + blocks[15] - 660478335; c = (c << 14 | c >>> 18) + d << 0; b += (d ^ (a & (c ^ d))) + blocks[4] - 405537848; b = (b << 20 | b >>> 12) + c << 0; a += (c ^ (d & (b ^ c))) + blocks[9] + 568446438; a = (a << 5 | a >>> 27) + b << 0; d += (b ^ (c & (a ^ b))) + blocks[14] - 1019803690; d = (d << 9 | d >>> 23) + a << 0; c += (a ^ (b & (d ^ a))) + blocks[3] - 187363961; c = (c << 14 | c >>> 18) + d << 0; b += (d ^ (a & (c ^ d))) + blocks[8] + 1163531501; b = (b << 20 | b >>> 12) + c << 0; a += (c ^ (d & (b ^ c))) + blocks[13] - 1444681467; a = (a << 5 | a >>> 27) + b << 0; d += (b ^ (c & (a ^ b))) + blocks[2] - 51403784; d = (d << 9 | d >>> 23) + a << 0; c += (a ^ (b & (d ^ a))) + blocks[7] + 1735328473; c = (c << 14 | c >>> 18) + d << 0; b += (d ^ (a & (c ^ d))) + blocks[12] - 1926607734; b = (b << 20 | b >>> 12) + c << 0; bc = b ^ c; a += (bc ^ d) + blocks[5] - 378558; a = (a << 4 | a >>> 28) + b << 0; d += (bc ^ a) + blocks[8] - 2022574463; d = (d << 11 | d >>> 21) + a << 0; da = d ^ a; c += (da ^ b) + blocks[11] + 1839030562; c = (c << 16 | c >>> 16) + d << 0; b += (da ^ c) + blocks[14] - 35309556; b = (b << 23 | b >>> 9) + c << 0; bc = b ^ c; a += (bc ^ d) + blocks[1] - 1530992060; a = (a << 4 | a >>> 28) + b << 0; d += (bc ^ a) + blocks[4] + 1272893353; d = (d << 11 | d >>> 21) + a << 0; da = d ^ a; c += (da ^ b) + blocks[7] - 155497632; c = (c << 16 | c >>> 16) + d << 0; b += (da ^ c) + blocks[10] - 1094730640; b = (b << 23 | b >>> 9) + c << 0; bc = b ^ c; a += (bc ^ d) + blocks[13] + 681279174; a = (a << 4 | a >>> 28) + b << 0; d += (bc ^ a) + blocks[0] - 358537222; d = (d << 11 | d >>> 21) + a << 0; da = d ^ a; c += (da ^ b) + blocks[3] - 722521979; c = (c << 16 | c >>> 16) + d << 0; b += (da ^ c) + blocks[6] + 76029189; b = (b << 23 | b >>> 9) + c << 0; bc = b ^ c; a += (bc ^ d) + blocks[9] - 640364487; a = (a << 4 | a >>> 28) + b << 0; d += (bc ^ a) + blocks[12] - 421815835; d = (d << 11 | d >>> 21) + a << 0; da = d ^ a; c += (da ^ b) + blocks[15] + 530742520; c = (c << 16 | c >>> 16) + d << 0; b += (da ^ c) + blocks[2] - 995338651; b = (b << 23 | b >>> 9) + c << 0; a += (c ^ (b | ~d)) + blocks[0] - 198630844; a = (a << 6 | a >>> 26) + b << 0; d += (b ^ (a | ~c)) + blocks[7] + 1126891415; d = (d << 10 | d >>> 22) + a << 0; c += (a ^ (d | ~b)) + blocks[14] - 1416354905; c = (c << 15 | c >>> 17) + d << 0; b += (d ^ (c | ~a)) + blocks[5] - 57434055; b = (b << 21 | b >>> 11) + c << 0; a += (c ^ (b | ~d)) + blocks[12] + 1700485571; a = (a << 6 | a >>> 26) + b << 0; d += (b ^ (a | ~c)) + blocks[3] - 1894986606; d = (d << 10 | d >>> 22) + a << 0; c += (a ^ (d | ~b)) + blocks[10] - 1051523; c = (c << 15 | c >>> 17) + d << 0; b += (d ^ (c | ~a)) + blocks[1] - 2054922799; b = (b << 21 | b >>> 11) + c << 0; a += (c ^ (b | ~d)) + blocks[8] + 1873313359; a = (a << 6 | a >>> 26) + b << 0; d += (b ^ (a | ~c)) + blocks[15] - 30611744; d = (d << 10 | d >>> 22) + a << 0; c += (a ^ (d | ~b)) + blocks[6] - 1560198380; c = (c << 15 | c >>> 17) + d << 0; b += (d ^ (c | ~a)) + blocks[13] + 1309151649; b = (b << 21 | b >>> 11) + c << 0; a += (c ^ (b | ~d)) + blocks[4] - 145523070; a = (a << 6 | a >>> 26) + b << 0; d += (b ^ (a | ~c)) + blocks[11] - 1120210379; d = (d << 10 | d >>> 22) + a << 0; c += (a ^ (d | ~b)) + blocks[2] + 718787259; c = (c << 15 | c >>> 17) + d << 0; b += (d ^ (c | ~a)) + blocks[9] - 343485551; b = (b << 21 | b >>> 11) + c << 0; if (this.first) {
                        this.h0 = a + 1732584193 << 0;
                        this.h1 = b - 271733879 << 0;
                        this.h2 = c - 1732584194 << 0;
                        this.h3 = d + 271733878 << 0;
                        this.first = false;
                    }
                    else {
                        this.h0 = this.h0 + a << 0;
                        this.h1 = this.h1 + b << 0;
                        this.h2 = this.h2 + c << 0;
                        this.h3 = this.h3 + d << 0;
                    } };
                    Md5.prototype.hex = function () { this.finalize(); var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3; return HEX_CHARS[(h0 >> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] + HEX_CHARS[(h0 >> 12) & 0x0F] + HEX_CHARS[(h0 >> 8) & 0x0F] + HEX_CHARS[(h0 >> 20) & 0x0F] + HEX_CHARS[(h0 >> 16) & 0x0F] + HEX_CHARS[(h0 >> 28) & 0x0F] + HEX_CHARS[(h0 >> 24) & 0x0F] + HEX_CHARS[(h1 >> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] + HEX_CHARS[(h1 >> 12) & 0x0F] + HEX_CHARS[(h1 >> 8) & 0x0F] + HEX_CHARS[(h1 >> 20) & 0x0F] + HEX_CHARS[(h1 >> 16) & 0x0F] + HEX_CHARS[(h1 >> 28) & 0x0F] + HEX_CHARS[(h1 >> 24) & 0x0F] + HEX_CHARS[(h2 >> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] + HEX_CHARS[(h2 >> 12) & 0x0F] + HEX_CHARS[(h2 >> 8) & 0x0F] + HEX_CHARS[(h2 >> 20) & 0x0F] + HEX_CHARS[(h2 >> 16) & 0x0F] + HEX_CHARS[(h2 >> 28) & 0x0F] + HEX_CHARS[(h2 >> 24) & 0x0F] + HEX_CHARS[(h3 >> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] + HEX_CHARS[(h3 >> 12) & 0x0F] + HEX_CHARS[(h3 >> 8) & 0x0F] + HEX_CHARS[(h3 >> 20) & 0x0F] + HEX_CHARS[(h3 >> 16) & 0x0F] + HEX_CHARS[(h3 >> 28) & 0x0F] + HEX_CHARS[(h3 >> 24) & 0x0F]; };
                    Md5.prototype.toString = Md5.prototype.hex;
                    Md5.prototype.digest = function () { this.finalize(); var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3; return [h0 & 0xFF, (h0 >> 8) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 24) & 0xFF, h1 & 0xFF, (h1 >> 8) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 24) & 0xFF, h2 & 0xFF, (h2 >> 8) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 24) & 0xFF, h3 & 0xFF, (h3 >> 8) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 24) & 0xFF]; };
                    Md5.prototype.array = Md5.prototype.digest;
                    Md5.prototype.arrayBuffer = function () { this.finalize(); var buffer = new ArrayBuffer(16); var blocks = new Uint32Array(buffer); blocks[0] = this.h0; blocks[1] = this.h1; blocks[2] = this.h2; blocks[3] = this.h3; return buffer; };
                    Md5.prototype.buffer = Md5.prototype.arrayBuffer;
                    Md5.prototype.base64 = function () { var v1, v2, v3, base64Str = '', bytes = this.array(); for (var i = 0; i < 15;) {
                        v1 = bytes[i++];
                        v2 = bytes[i++];
                        v3 = bytes[i++];
                        base64Str += BASE64_ENCODE_CHAR[v1 >>> 2] + BASE64_ENCODE_CHAR[(v1 << 4 | v2 >>> 4) & 63] + BASE64_ENCODE_CHAR[(v2 << 2 | v3 >>> 6) & 63] + BASE64_ENCODE_CHAR[v3 & 63];
                    } v1 = bytes[i]; base64Str += BASE64_ENCODE_CHAR[v1 >>> 2] + BASE64_ENCODE_CHAR[(v1 << 4) & 63] + '=='; return base64Str; };
                    var exports = createMethod();
                    if (COMMON_JS) {
                        module.exports = exports;
                    }
                    else {
                        root.md5 = exports;
                        md5 = exports;
                        if (AMD) {
                            define(function () { return exports; });
                        }
                    }
                })();
                const baiduMapJson = { "options": { "java_package": "com.smile.baidumap.model" }, "nested": { "RepHead": { "fields": { "md5": { "type": "string", "id": 1 }, "range": { "type": "string", "id": 2 }, "messageHead": { "rule": "repeated", "type": "MessageHead", "id": 3 } } }, "MessageHead": { "fields": { "offset": { "type": "int32", "id": 1 }, "length": { "type": "int32", "id": 2 }, "name": { "type": "string", "id": 3 } } }, "Result": { "fields": { "type": { "type": "int32", "id": 1 }, "error": { "type": "int32", "id": 2 } } }, "Ads": { "fields": { "option": { "type": "Option", "id": 1 }, "content": { "rule": "repeated", "type": "Content", "id": 2 } } }, "Option": { "fields": { "lasttime": { "type": "int32", "id": 1 }, "checkcode": { "type": "string", "id": 2 }, "errmsg": { "type": "string", "id": 3 } } }, "Content": { "fields": { "type": { "type": "string", "id": 1 }, "data": { "type": "string", "id": 2 }, "intval": { "type": "int32", "id": 3 }, "start": { "type": "int32", "id": 4 }, "end": { "type": "int32", "id": 5 }, "id": { "type": "int32", "id": 6 }, "updatetime": { "type": "int32", "id": 7 }, "order": { "type": "int32", "id": 8 }, "ctrlMode": { "type": "string", "id": 9 }, "dayTimes": { "type": "int32", "id": 10 } } } } };
                const baiduMapRoot = protobuf.Root.fromJSON(baiduMapJson);
                const isQuanX = typeof $task != "undefined";
                const binaryBody = isQuanX ? new Uint8Array($response.bodyBytes) : $response.body;
                const beginOffset = 4;
                const prefixLength = new DataView(binaryBody.slice(0, beginOffset).buffer).getInt32(0);
                const repHeadData = binaryBody.slice(beginOffset, beginOffset + prefixLength);
                const repHeadType = baiduMapRoot.lookupType("RepHead");
                const repHeadMessage = repHeadType.decode(repHeadData);
                const originMd5 = repHeadMessage.md5;
                let newResult = null;
                let newAds = null;
                const dataBeginOffset = beginOffset + prefixLength;
                for (let i = 0; i < repHeadMessage.messageHead.length; i++) {
                    let messageHead = repHeadMessage.messageHead[i];
                    const name = messageHead.name;
                    const targetDataLength = messageHead.length;
                    const currentOffset = dataBeginOffset + messageHead.offset;
                    const targetData = binaryBody.slice(currentOffset, currentOffset + targetDataLength);
                    if (name === 'Result') {
                        const resultType = baiduMapRoot.lookupType(name);
                        const resultMessage = resultType.decode(targetData);
                        const parseMd5 = md5(binaryBody.slice(currentOffset));
                        console.log(`解析出的md5和原始md5相同?:${parseMd5 === originMd5}`);
                        newResult = resultType.encode(resultMessage).finish();
                    }
                    else if (name === 'Ads') {
                        const adsType = baiduMapRoot.lookupType(name);
                        let adsMessage = adsType.decode(targetData);
                        for (let j = 0; j < adsMessage.content.length; j++) {
                            let item = adsMessage.content[j];
                            if ((item.type.indexOf('_banner') !== -1 || item.type.indexOf('splash_screen1040') !== -1)
                                && item.hasOwnProperty('start') && item.hasOwnProperty('end')) {
                                adsMessage.content[j].start = 1648746061;
                                adsMessage.content[j].end = 1648832461;
                                console.log(`设置${item.type}时间为过期`);
                            }
                        }
                        newAds = adsType.encode(adsMessage).finish();
                    }
                }
                const mergeResultAndAds = Uint8Array.from([...newResult, ...newAds]);
                const newMd5 = md5(mergeResultAndAds);
                console.log(`新md5:${newMd5}`);
                repHeadMessage.md5 = newMd5;
                repHeadMessage.messageHead[0].length = newResult.byteLength;
                repHeadMessage.messageHead[1].offset = newResult.byteLength;
                repHeadMessage.messageHead[1].length = newAds.byteLength;
                const newRepHead = repHeadType.encode(repHeadMessage).finish();
                const totalLength = beginOffset + newRepHead.byteLength + newResult.byteLength + newAds.byteLength;
                let body = new Uint8Array(totalLength);
                body.set(Uint8Array.from([(newRepHead.byteLength >> 24) & 0xff, (newRepHead.byteLength >> 16) & 0xff, (newRepHead.byteLength >> 8) & 0xff, newRepHead.byteLength & 0xff]));
                body.set(newRepHead, beginOffset);
                body.set(newResult, beginOffset + newRepHead.byteLength);
                body.set(newAds, beginOffset + newRepHead.byteLength + newResult.byteLength);
                console.log(`${body.byteLength}---${body.buffer.byteLength}`);
                if (isQuanX) {
                    $done({ bodyBytes: body.buffer.slice(body.byteOffset, body.byteLength + body.byteOffset) });
                }
                else {
                    $done({ body });
                }
            }).call(this);
        }
    });
})();
