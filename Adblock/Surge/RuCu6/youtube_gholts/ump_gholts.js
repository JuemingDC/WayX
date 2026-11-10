/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
/*
    Third-party components bundled below use the MIT License.

    @noble/ciphers
    Copyright (c) 2022 Paul Miller (https://paulmillr.com)
    Copyright (c) 2016 Thomas Pornin <pornin@bolet.org>

    @noble/hashes
    Copyright (c) 2022 Paul Miller (https://paulmillr.com)

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
    */
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
        })((undefined), { TextDecoder: typeof TextDecoder === 'undefined' ? undefined : TextDecoder }), utils: typeof $utils === 'undefined' ? undefined : $utils, crypto: typeof $crypto === 'undefined' ? undefined : $crypto, compression: (function () {
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
    const __wayxContexts = { "response": { "surge": { "phase": "response", "responseBody": true, "binary": false, "binaryKnown": true, "name": "youtube_ump", "argumentSchema": { "kind": "object", "enumValues": {}, "fields": { "autoHd": "boolean", "blockAi": "boolean", "blockGames": "boolean", "blockStore": "boolean", "blockVerticalLive": "boolean", "jumpAhead": "boolean", "onTheGo": "boolean" } }, "from": "loon", "to": "surge", "apiPlan": { "version": 1, "omitNotificationOptions": false, "qxHttp": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "methods": ["get", "post", "put", "delete", "head", "options", "patch"], "source": { "responseStatus": "status", "scriptStartTime": "date", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": true }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "node", "timeoutMs": 1, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": true } }, "notification": { "root": "$notification.post", "open": "openUrl", "media": "mediaUrl", "action": null, "openAction": null, "stringLink": true, "delay": true }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "typed" }, "target": { "responseStatus": "status", "scriptStartTime": "epoch-seconds", "binaryField": "body", "store": { "style": "store", "read": "read", "write": "write", "remove": null, "undefinedDeletes": false }, "http": { "style": "callback", "root": "$httpClient", "optionsRoot": null, "redirect": "auto-redirect", "cookie": "auto-cookie", "tls": "insecure", "policy": "policy", "timeoutMs": 1000, "directPolicy": "DIRECT", "defaults": { "redirect": true, "cookie": true, "tls": false } }, "notification": { "root": "$notification.post", "open": "url", "media": "media-url", "action": "action", "openAction": "open-url", "stringLink": false, "delay": false }, "completion": { "statusEncoding": "number", "synthetic": "response" }, "argument": "string" } }, "runtimePolicyVersion": 7, "omittedParameters": [] } } }, __wayxConfig = __wayxContexts[__wayxHost.response === undefined ? 'request' : 'response']?.[__wayxTarget];
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
                (() => {
                    const ON_THE_GO_BUNDLE_TEMPLATE = "on_the_go_controls.eml-fe|f87c8ecdb154dadd";
                    const ON_THE_GO_RESOURCES_BASE64 = "CteBAdqBiO8Fz4EBCj5lbmdhZ2VtZW50X3BhbmVsX2xhcmdlX3BsYXllcl9jb250cm9scy5lbWwtZmV8ZWFhNmUwNWM5MmU2ZWU3OBKJgQGyx86HBYGBARLzgAEKBAgGEAkKBAgHEAUKBAgKEAgKBAgYEA4KBAgZEAIKBAgfEA4KBAggEA4KBAgoEA4KBAgtEA4KBAgwEA4KBAgxEA4KBAgyEA4KBAg0EA4KBAg6EA4KBAg/EA4KBAhMEA4KBAhREA4KBAhUEA4KBAhVEA4KBAhZEA4SBAgBGAESiGIIAhgCIoFiGv5hChEIARINGgsKCQjEyOFMEgIaAAofCAISGxoZChcI65i9UBIQGg4KDAgHEggILTIECgIIAwrHYQgDEsJhWr9hCAESumEat2EKEQgBEg0aCwoJCKeU3EsSAhoACoEBCAISfRp7CnkIhIu9UBJyGnAKDAgKEggIMDIECgIIAQoMCAsSCAgxMgQKAggFCgwIDBIICDIyBAoCCAQKEAgCEgwaCgoICAESBBICCBAKDAgTEggINDIECgIIAQokCAkSIBoeChwIBxIYGhYKFAgBEhASDggEEgIIBBICCAESAggECp1gCAMSmGBalWAIARK6FiK3Fgq0FgoKUggIARIEEgIIFRKlFhqiFgoRCAESDRoLCgkIp5TcSxICGgAKLQgCEikaJwolCISLvVASHhocCgwIChIICDAyBAoCCAMKDAgMEggIMjIECgIIBArdFQgDEtgVWtUVCAES0BUazRUKtREIARKwERqtEQqqEQi5lNxLEqIRGp8RCpwRCAESlxEalBEKDAgCEggIOjIECgIIAgqzCQgBEq4JIqsJCjwKKFImCAESIkogCAESCAgHMgQKAggAGhJSEAgCEgwSCggGEgIIARICCDMSEBIOCAYSAggBEgIIMxICCAES6gha5wgIARLiCCLfCArmBwrMBlrJBggCEp0GWpoGCAISgQFafwgCEmBaXggCEiwSKggBEgIIAxICCAESDhoMCAcyCAoGCKPTn44CEgIIARIKGggIBzIECgIIBhIsEioIARICCAMSAggBEg0aCwgHMgcKBQie2L9GEgIIARILGgkIBzIFCgMI6gcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIigISkQVajgUIAxLOBFrLBAgDEosEWogECAMSyANaxQMIAxKFA1qCAwgDEsICWr8CCAMS/wFa/AEIAxK8AVq5AQgDEnpaeAgDEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAESGRIXCAESAggHEgYIiJfhpwESAggBEgMIpgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIAhIZEhcIARICCAcSBgiIl+GnARICCAESAwipAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggDEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKoCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAQSGRIXCAESAggHEgYIiJfhpwESAggBEgMIswISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBRIZEhcIARICCAcSBgiIl+GnARICCAESAwi9AhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggGEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCL8CEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxAISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIICBIZEhcIARICCAcSBgiIl+GnARICCAESAwjFAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggJEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMYCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAoSGRIXCAESAggHEgYIiJfhpwESAggBEgMI4QISJVIjCAESH0odCAESCAgHMgQKAggAGg9SDQgCEgkIKDIFCgMIgwMSlAEikQEKjgEKYFpeCAISLBIqCAESAggDEgIIARIOGgwIBzIICgYIo9OfjgISAggBEgoaCAgHMgQKAggGEiwSKggBEgIIAxICCAESDRoLCAcyBwoFCJ7Yv0YSAggBEgsaCQgHMgUKAwjqBxIqGigKJggGEiIaIAoeCOoHEhkaFwoVCAESERoPCg0IARIJCCgyBQoDCIMDEnQacgpwCAMSbBpqChAIAhIMEgoIBhICCAESAggCCiIIAxIeIhwKFAoMEgoIARICCAQSAggLEgQSAggIEgQSAggLCjIIARIuIiwKKgoeUhwIARIYShYIARIICAYyBAoCCgAaCAgGMgQKAgoAEggIBjIECgIKAArNBwgDEsgHGsUHCsIHCPmj3EkSugcatwcKtAcIBhKvByKsBwqpBwr+Blr7BggDEihSJggBEiJKIAgBEggIBzIECgIIABoSUhAIAhIMEgoIBhICCAESAggzEswGWskGCAISnQZamgYIAhKBAVp/CAISYFpeCAISLBIqCAESAggDEgIIARIOGgwIBzIICgYIo9OfjgISAggBEgoaCAgHMgQKAggGEiwSKggBEgIIAxICCAESDRoLCAcyBwoFCJ7Yv0YSAggBEgsaCQgHMgUKAwjqBxIZEhcIARICCAcSBgiIl+GnARICCAESAwiKAhKRBVqOBQgDEs4EWssECAMSiwRaiAQIAxLIA1rFAwgDEoUDWoIDCAMSwgJavwIIAxL/AVr8AQgDErwBWrkBCAMSelp4CAMSOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIARIZEhcIARICCAcSBgiIl+GnARICCAESAwimAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggCEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKkCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAMSGRIXCAESAggHEgYIiJfhpwESAggBEgMIqgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBBIZEhcIARICCAcSBgiIl+GnARICCAESAwizAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggFEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCL0CEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAYSGRIXCAESAggHEgYIiJfhpwESAggBEgMIvwISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBxIZEhcIARICCAcSBgiIl+GnARICCAESAwjEAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggIEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMUCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAkSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIChIZEhcIARICCAcSBgiIl+GnARICCAESAwjhAhIlUiMIARIfSh0IARIICAcyBAoCCAAaD1INCAISCQgoMgUKAwiDAxImGiQKIggBEh4iHAoUCgwSCggBEgIIBBICCAsSBBICCAgSBBICCAsKkgQIAhKNBBqKBApcCISLvVASVRpTChgIAhIUGhIKEAgBEgxSCggFEgYIBxICCAMKGAgDEhQaEgoQCAESDFIKCAUSBggHEgIIAwoPCA4SCwgZMgcKBQ0AAAAACgwIEBIICDIyBAoCCAIKzQEIuZe9UBLFARrCAQq/AQgBEroBIrcBCrQBCgwSCggBEgIIBBICCAsSowEaoAEKnQEI4KqfURKVARqSAQqPAQgBEooBWocBCAESdSJzCnEKLhIsCAESAggDEgIIARINGgsIBzIHCgUI/5zcexICCAESDRoLCAcyBwoFCJuNpXMSPxo9CjsIm42lcxI0GjIKDAgBEggITDIECgIIAQoQCAMSDBIKCAYSAggBEgIIBgoQCAISDBIKCAYSAggBEgIICBIMEgoIBhICCAESAggECj4IlZe9UBI3GjUKMwgGEi8aLQorCNygiloSJBoiCggIAhIEEgIIAwoMCAMSCAgKMgQKAggACggIARIEEgIICgp9COuYvVASdhp0CkAIBRI8IjoKHgoMEgoIARICCAQSAggLEg5aDAgBEggIUTIECgIIAhIYWhYIARIICFEyBAoCCAISCAhRMgQKAggHChAIARIMEgoIBhICCAESAggFChAIBBIMEgoIBhICCAESAggRCgwIBhIICAoyBAoCCAEKGwiWkelQEhQaEgoQCAESDBIKCAYSAggBEgIICBLfFSLcFQrZFQoKUggIARIEEgIIFRLKFRrHFQoRCAESDRoLCgkIp5TcSxICGgAKLQgCEikaJwolCISLvVASHhocCgwIChIICDAyBAoCCAMKDAgMEggIMjIECgIIBAqCFQgDEv0UWvoUCAES9RQa8hQK6hAIARLlEBriEArfEAi5lNxLEtcQGtQQCtEQCAESzBAayRAKDAgCEggIOjIECgIIAgqHCQgBEoIJIv8ICjwKKFImCAESIkogCAESCAgHMgQKAggAGhJSEAgCEgwSCggGEgIIAhICCDMSEBIOCAYSAggCEgIIMxICCAESvghauwgIARK2CCKzCArcBwrHBlrEBggCEp0GWpoGCAISgQFafwgCEmBaXggCEiwSKggBEgIIAxICCAESDhoMCAcyCAoGCKPTn44CEgIIARIKGggIBzIECgIIBhIsEioIARICCAMSAggBEg0aCwgHMgcKBQie2L9GEgIIARILGgkIBzIFCgMI6gcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIigISkQVajgUIAxLOBFrLBAgDEosEWogECAMSyANaxQMIAxKFA1qCAwgDEsICWr8CCAMS/wFa/AEIAxK8AVq5AQgDEnpaeAgDEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAESGRIXCAESAggHEgYIiJfhpwESAggBEgMIpgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIAhIZEhcIARICCAcSBgiIl+GnARICCAESAwipAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggDEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKoCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAQSGRIXCAESAggHEgYIiJfhpwESAggBEgMIswISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBRIZEhcIARICCAcSBgiIl+GnARICCAESAwi9AhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggGEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCL8CEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxAISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIICBIZEhcIARICCAcSBgiIl+GnARICCAESAwjFAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggJEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMYCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAoSGRIXCAESAggHEgYIiJfhpwESAggBEgMI4QISIFIeCAESGkoYCAESCAgHMgQKAggAGgpSCAgCEgQSAggZEo8BIowBCokBCmBaXggCEiwSKggBEgIIAxICCAESDhoMCAcyCAoGCKPTn44CEgIIARIKGggIBzIECgIIBhIsEioIARICCAMSAggBEg0aCwgHMgcKBQie2L9GEgIIARILGgkIBzIFCgMI6gcSJRojCiEIBhIdGhsKGQjqBxIUGhIKEAgBEgwaCgoICAESBBICCBkSUhpQCk4IAxJKGkgKCAgCEgQSAggYCggIAxIEEgIICAoyCAESLiIsCioKHlIcCAESGEoWCAESCAgGMgQKAgoAGggIBjIECgIKABIICAYyBAoCCgAKrgcIAxKpBxqmBwqjBwj5o9xJEpsHGpgHCpUHCAYSkAcijQcKigcK+QZa9gYIAxIoUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAYSAggCEgIIMxLHBlrEBggCEp0GWpoGCAISgQFafwgCEmBaXggCEiwSKggBEgIIAxICCAESDhoMCAcyCAoGCKPTn44CEgIIARIKGggIBzIECgIIBhIsEioIARICCAMSAggBEg0aCwgHMgcKBQie2L9GEgIIARILGgkIBzIFCgMI6gcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIigISkQVajgUIAxLOBFrLBAgDEosEWogECAMSyANaxQMIAxKFA1qCAwgDEsICWr8CCAMS/wFa/AEIAxK8AVq5AQgDEnpaeAgDEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAESGRIXCAESAggHEgYIiJfhpwESAggBEgMIpgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIAhIZEhcIARICCAcSBgiIl+GnARICCAESAwipAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggDEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKoCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAQSGRIXCAESAggHEgYIiJfhpwESAggBEgMIswISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBRIZEhcIARICCAcSBgiIl+GnARICCAESAwi9AhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggGEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCL8CEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxAISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIICBIZEhcIARICCAcSBgiIl+GnARICCAESAwjFAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggJEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMYCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAoSGRIXCAESAggHEgYIiJfhpwESAggBEgMI4QISIFIeCAESGkoYCAESCAgHMgQKAggAGgpSCAgCEgQSAggZEgwaCgoICAESBBICCAgKggQIAhL9Axr6AwpcCISLvVASVRpTChgIAhIUGhIKEAgBEgxSCggFEgYIBxICCAMKGAgDEhQaEgoQCAESDFIKCAUSBggHEgIIAwoPCA4SCwgZMgcKBQ0AAAAACgwIEBIICDIyBAoCCAIKyQEIuZe9UBLBARq+AQq7AQgBErYBIrMBCrABCggICjIECgIIARKjARqgAQqdAQjgqp9REpUBGpIBCo8BCAESigFahwEIARJ1InMKcQouEiwIARICCAMSAggBEg0aCwgHMgcKBQj/nNx7EgIIARINGgsIBzIHCgUIm42lcxI/Gj0KOwibjaVzEjQaMgoMCAESCAhMMgQKAggBChAIAxIMEgoIBhICCAISAggGChAIAhIMEgoIBhICCAISAggIEgwSCggGEgIIAhICCAQKPgiVl71QEjcaNQozCAYSLxotCisI3KCKWhIkGiIKCAgCEgQSAggDCgwIAxIICAoyBAoCCAAKCAgBEgQSAggKCnEI65i9UBJqGmgKPAgFEjgiNgoaCggICjIECgIIARIOWgwIARIICFEyBAoCCAISGFoWCAESCAhRMgQKAggCEggIUTIECgIIBwoICAESBBICCBYKEAgEEgwSCggGEgIIAhICCBEKDAgGEggICjIECgIIAQobCJaR6VASFBoSChAIARIMEgoIBhICCAISAggIEtIHGs8HChEIARINGgsKCQinlNxLEgIaAApfCAISWxpZClcIhIu9UBJQGk4KDAgKEggIMDIECgIIAwoMCAwSCAgyMgQKAggECgwICxIICDEyBAoCCAMKEAgDEgwaCgoICAESBBICCBIKEAgCEgwaCgoICAESBBICCBIK2AYIAxLTBlrQBggBEtcDItQDCtEDCgQSAggHEsgDGsUDChEIARINGgsKCQinlNxLEgIaAAqvAwgCEqoDGqcDCjsIhIu9UBI0GjIKDAgREggIVDIECgIIAgoQCAMSDBoKCggIARIEEgIIDgoQCAISDBoKCggIARIEEgIIDgrnAgiVl71QEt8CGtwCCggIBRIEEgIIDwrPAggBEsoCIscCCrABChpKGAgBEgoIVRIGCAQSAggGGggIVTIECgIIAhKRASKOAQpECihSJggBEiJKIAgBEggIBzIECgIIABoSUhAIAhIMEgoIBBICCAcSAghsEhgSFggEEgIIBxICCGwSChoICAcyBAoCCC8SRiJECjQKJFIiCAESHkocCAESCAgHMgQKAggAGg5SDAgCEggSBggEEgIIBxIMEgoIBBICCAcSAggvEgwSCggEEgIIARICCDcSkQEijgEKRAooUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAQSAggHEgIIbBIYEhYIBBICCAcSAghsEgoaCAgHMgQKAggqEkYiRAo0CiRSIggBEh5KHAgBEggIBzIECgIIABoOUgwIAhIIEgYIBBICCAcSDBIKCAQSAggHEgIIKhIMEgoIBBICCAESAghJEvECGu4CCrABCAESqwEaqAEKpQEIoLrkpQESnAEamQEKEAgDEgwSCggBEgIIBBICCAcKKwgEEicaJQojCNaV6VASHBoaChgImtiVnAESEBoOCgwIARIICFkyBAoCCAEKKwgFEicaJQojCNaV6VASHBoaChgImtiVnAESEBoOCgwIARIICFkyBAoCCAIKKwgGEicaJQojCNaV6VASHBoaChgImtiVnAESEBoOCgwIARIICFkyBAoCCAcKuAEIAhKzARqwAQotCISLvVASJhokChAIAxIMGgoKCAgBEgQSAggMChAIAhIMGgoKCAgBEgQSAggMCj4IlZe9UBI3GjUKMwgGEi8aLQorCNygiloSJBoiCgwIAxIICAoyBAoCCAAKCAgCEgQSAggNCggIARIEEgIICgo/COuYvVASOBo2ChIIBRIOWgwIARIICFEyBAoCCAIKDAgGEggICjIECgIIAQoICAESBBICCBMKCAgEEgQSAggUEt8VItwVCtkVCgpSCAgBEgQSAggVEsoVGscVChEIARINGgsKCQinlNxLEgIaAAotCAISKRonCiUIhIu9UBIeGhwKDAgKEggIMDIECgIIAwoMCAwSCAgyMgQKAggECoIVCAMS/RRa+hQIARL1FBryFArqEAgBEuUQGuIQCt8QCLmU3EsS1xAa1BAK0RAIARLMEBrJEAoMCAISCAg6MgQKAggCCocJCAESggki/wgKPAooUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAYSAggDEgIIMxIQEg4IBhICCAMSAggzEgIIARK+CFq7CAgBErYIIrMICtwHCscGWsQGCAISnQZamgYIAhKBAVp/CAISYFpeCAISLBIqCAESAggDEgIIARIOGgwIBzIICgYIo9OfjgISAggBEgoaCAgHMgQKAggGEiwSKggBEgIIAxICCAESDRoLCAcyBwoFCJ7Yv0YSAggBEgsaCQgHMgUKAwjqBxIZEhcIARICCAcSBgiIl+GnARICCAESAwiKAhKRBVqOBQgDEs4EWssECAMSiwRaiAQIAxLIA1rFAwgDEoUDWoIDCAMSwgJavwIIAxL/AVr8AQgDErwBWrkBCAMSelp4CAMSOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIARIZEhcIARICCAcSBgiIl+GnARICCAESAwimAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggCEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKkCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAMSGRIXCAESAggHEgYIiJfhpwESAggBEgMIqgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBBIZEhcIARICCAcSBgiIl+GnARICCAESAwizAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggFEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCL0CEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAYSGRIXCAESAggHEgYIiJfhpwESAggBEgMIvwISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBxIZEhcIARICCAcSBgiIl+GnARICCAESAwjEAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggIEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMUCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAkSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIChIZEhcIARICCAcSBgiIl+GnARICCAESAwjhAhIgUh4IARIaShgIARIICAcyBAoCCAAaClIICAISBBICCBsSjwEijAEKiQEKYFpeCAISLBIqCAESAggDEgIIARIOGgwIBzIICgYIo9OfjgISAggBEgoaCAgHMgQKAggGEiwSKggBEgIIAxICCAESDRoLCAcyBwoFCJ7Yv0YSAggBEgsaCQgHMgUKAwjqBxIlGiMKIQgGEh0aGwoZCOoHEhQaEgoQCAESDBoKCggIARIEEgIIGxJSGlAKTggDEkoaSAoICAISBBICCBoKCAgDEgQSAggICjIIARIuIiwKKgoeUhwIARIYShYIARIICAYyBAoCCgAaCAgGMgQKAgoAEggIBjIECgIKAAquBwgDEqkHGqYHCqMHCPmj3EkSmwcamAcKlQcIBhKQByKNBwqKBwr5Blr2BggDEihSJggBEiJKIAgBEggIBzIECgIIABoSUhAIAhIMEgoIBhICCAMSAggzEscGWsQGCAISnQZamgYIAhKBAVp/CAISYFpeCAISLBIqCAESAggDEgIIARIOGgwIBzIICgYIo9OfjgISAggBEgoaCAgHMgQKAggGEiwSKggBEgIIAxICCAESDRoLCAcyBwoFCJ7Yv0YSAggBEgsaCQgHMgUKAwjqBxIZEhcIARICCAcSBgiIl+GnARICCAESAwiKAhKRBVqOBQgDEs4EWssECAMSiwRaiAQIAxLIA1rFAwgDEoUDWoIDCAMSwgJavwIIAxL/AVr8AQgDErwBWrkBCAMSelp4CAMSOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIARIZEhcIARICCAcSBgiIl+GnARICCAESAwimAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggCEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKkCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAMSGRIXCAESAggHEgYIiJfhpwESAggBEgMIqgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBBIZEhcIARICCAcSBgiIl+GnARICCAESAwizAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggFEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCL0CEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAYSGRIXCAESAggHEgYIiJfhpwESAggBEgMIvwISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBxIZEhcIARICCAcSBgiIl+GnARICCAESAwjEAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggIEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMUCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAkSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIChIZEhcIARICCAcSBgiIl+GnARICCAESAwjhAhIgUh4IARIaShgIARIICAcyBAoCCAAaClIICAISBBICCBsSDBoKCggIARIEEgIICAqCBAgCEv0DGvoDClwIhIu9UBJVGlMKGAgCEhQaEgoQCAESDFIKCAUSBggHEgIIAwoYCAMSFBoSChAIARIMUgoIBRIGCAcSAggDCg8IDhILCBkyBwoFDQAAAAAKDAgQEggIMjIECgIIAgrJAQi5l71QEsEBGr4BCrsBCAEStgEiswEKsAEKCAgKMgQKAggBEqMBGqABCp0BCOCqn1ESlQEakgEKjwEIARKKAVqHAQgBEnUicwpxCi4SLAgBEgIIAxICCAESDRoLCAcyBwoFCP+c3HsSAggBEg0aCwgHMgcKBQibjaVzEj8aPQo7CJuNpXMSNBoyCgwIARIICEwyBAoCCAEKEAgDEgwSCggGEgIIAxICCAYKEAgCEgwSCggGEgIIAxICCAgSDBIKCAYSAggDEgIIBAo+CJWXvVASNxo1CjMIBhIvGi0KKwjcoIpaEiQaIgoICAISBBICCAMKDAgDEggICjIECgIIAAoICAESBBICCAoKcQjrmL1QEmoaaAo8CAUSOCI2ChoKCAgKMgQKAggBEg5aDAgBEggIUTIECgIIAhIYWhYIARIICFEyBAoCCAISCAhRMgQKAggHCggIARIEEgIIFwoQCAQSDBIKCAYSAggDEgIIEQoMCAYSCAgKMgQKAggBChsIlpHpUBIUGhIKEAgBEgwSCggGEgIIAxICCAgSuhYitxYKtBYKClIICAESBBICCBUSpRYaohYKEQgBEg0aCwoJCKeU3EsSAhoACi0IAhIpGicKJQiEi71QEh4aHAoMCAoSCAgwMgQKAggDCgwIDBIICDIyBAoCCAQK3RUIAxLYFVrVFQgBEtAVGs0VCrURCAESsBEarREKqhEIuZTcSxKiERqfEQqcEQgBEpcRGpQRCgwIAhIICDoyBAoCCAIKswkIARKuCSKrCQo8CihSJggBEiJKIAgBEggIBzIECgIIABoSUhAIAhIMEgoIBhICCAQSAggzEhASDggGEgIIBBICCDMSAggBEuoIWucICAES4ggi3wgK5gcKzAZayQYIAhKdBlqaBggCEoEBWn8IAhJgWl4IAhIsEioIARICCAMSAggBEg4aDAgHMggKBgij05+OAhICCAESChoICAcyBAoCCAYSLBIqCAESAggDEgIIARINGgsIBzIHCgUInti/RhICCAESCxoJCAcyBQoDCOoHEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCIoCEpEFWo4FCAMSzgRaywQIAxKLBFqIBAgDEsgDWsUDCAMShQNaggMIAxLCAlq/AggDEv8BWvwBCAMSvAFauQEIAxJ6WngIAxI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggBEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKYCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAISGRIXCAESAggHEgYIiJfhpwESAggBEgMIqQISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIAxIZEhcIARICCAcSBgiIl+GnARICCAESAwiqAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggEEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCLMCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAUSGRIXCAESAggHEgYIiJfhpwESAggBEgMIvQISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBhIZEhcIARICCAcSBgiIl+GnARICCAESAwi/AhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggHEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMQCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAgSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxQISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIICRIZEhcIARICCAcSBgiIl+GnARICCAESAwjGAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggKEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCOECEiVSIwgBEh9KHQgBEggIBzIECgIIABoPUg0IAhIJCCgyBQoDCPMCEpQBIpEBCo4BCmBaXggCEiwSKggBEgIIAxICCAESDhoMCAcyCAoGCKPTn44CEgIIARIKGggIBzIECgIIBhIsEioIARICCAMSAggBEg0aCwgHMgcKBQie2L9GEgIIARILGgkIBzIFCgMI6gcSKhooCiYIBhIiGiAKHgjqBxIZGhcKFQgBEhEaDwoNCAESCQgoMgUKAwjzAhJ0GnIKcAgDEmwaagoQCAISDBIKCAYSAggEEgIIAgoiCAMSHiIcChQKDBIKCAESAggEEgIIChIEEgIICBIEEgIICwoyCAESLiIsCioKHlIcCAESGEoWCAESCAgGMgQKAgoAGggIBjIECgIKABIICAYyBAoCCgAKzQcIAxLIBxrFBwrCBwj5o9xJEroHGrcHCrQHCAYSrwcirAcKqQcK/gZa+wYIAxIoUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAYSAggEEgIIMxLMBlrJBggCEp0GWpoGCAISgQFafwgCEmBaXggCEiwSKggBEgIIAxICCAESDhoMCAcyCAoGCKPTn44CEgIIARIKGggIBzIECgIIBhIsEioIARICCAMSAggBEg0aCwgHMgcKBQie2L9GEgIIARILGgkIBzIFCgMI6gcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIigISkQVajgUIAxLOBFrLBAgDEosEWogECAMSyANaxQMIAxKFA1qCAwgDEsICWr8CCAMS/wFa/AEIAxK8AVq5AQgDEnpaeAgDEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAESGRIXCAESAggHEgYIiJfhpwESAggBEgMIpgISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIAhIZEhcIARICCAcSBgiIl+GnARICCAESAwipAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggDEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCKoCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAQSGRIXCAESAggHEgYIiJfhpwESAggBEgMIswISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIIBRIZEhcIARICCAcSBgiIl+GnARICCAESAwi9AhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggGEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCL8CEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAcSGRIXCAESAggHEgYIiJfhpwESAggBEgMIxAISOVo3CAISGEoWCAESCAg/MgQKAggDGggIPzIECgIICBIZEhcIARICCAcSBgiIl+GnARICCAESAwjFAhI5WjcIAhIYShYIARIICD8yBAoCCAMaCAg/MgQKAggJEhkSFwgBEgIIBxIGCIiX4acBEgIIARIDCMYCEjlaNwgCEhhKFggBEggIPzIECgIIAxoICD8yBAoCCAoSGRIXCAESAggHEgYIiJfhpwESAggBEgMI4QISJVIjCAESH0odCAESCAgHMgQKAggAGg9SDQgCEgkIKDIFCgMI8wISJhokCiIIARIeIhwKFAoMEgoIARICCAQSAggKEgQSAggIEgQSAggLCpIECAISjQQaigQKXAiEi71QElUaUwoYCAISFBoSChAIARIMUgoIBRIGCAcSAggDChgIAxIUGhIKEAgBEgxSCggFEgYIBxICCAMKDwgOEgsIGTIHCgUNAAAAAAoMCBASCAgyMgQKAggCCs0BCLmXvVASxQEawgEKvwEIARK6ASK3AQq0AQoMEgoIARICCAQSAggKEqMBGqABCp0BCOCqn1ESlQEakgEKjwEIARKKAVqHAQgBEnUicwpxCi4SLAgBEgIIAxICCAESDRoLCAcyBwoFCP+c3HsSAggBEg0aCwgHMgcKBQibjaVzEj8aPQo7CJuNpXMSNBoyCgwIARIICEwyBAoCCAEKEAgDEgwSCggGEgIIBBICCAYKEAgCEgwSCggGEgIIBBICCAgSDBIKCAYSAggEEgIIBAo+CJWXvVASNxo1CjMIBhIvGi0KKwjcoIpaEiQaIgoICAISBBICCAMKDAgDEggICjIECgIIAAoICAESBBICCAoKfQjrmL1QEnYadApACAUSPCI6Ch4KDBIKCAESAggEEgIIChIOWgwIARIICFEyBAoCCAISGFoWCAESCAhRMgQKAggCEggIUTIECgIIBwoQCAESDBIKCAYSAggEEgIIBQoQCAQSDBIKCAYSAggEEgIIEQoMCAYSCAgKMgQKAggBChsIlpHpUBIUGhIKEAgBEgwSCggGEgIIBBICCAgSEAgDEAcYBCIICAcyBAoCCCQSVAgEGAQiTiJMCkAKLFIqCAESJkokCAESCAgHMgQKAggAGhZSFAgCEhASDggBEgIIBxIGCMul76cBEhASDggBEgIIBxIGCMul76cBEggSBggBEgIIAhIsCAUQChgEIiRSIggBEh5KHAgBEggIBzIECgIIABoOUgwIAhIIEgYIBBICCAkSnAIIBhgEIpUCIpICCoUCCiRSIggBEh5KHAgBEggIBzIECgIIABoOUgwIAhIIEgYIARICCAUS3AEa2QEKIwgBEh9SHQgEEhkSFwgBEgIIBRIDCJkSEgIIARIGCP/C7NsBCiMIAhIfUh0IBBIZEhcIARICCAUSAwiZEhICCAISBgj/wuzbAQojCAMSH1IdCAQSGRIXCAESAggFEgMImRISAggDEgYI/8Ls2wEKIwgEEh9SHQgEEhkSFwgBEgIIBRIDCJkSEgIIBBIGCP/C7NsBChUIBRIREg8IARICCAUSAwiZEhICCAUKFQgGEhESDwgBEgIIBRIDCJkSEgIIBgoVCAcSERIPCAESAggFEgMImRISAggHEggSBggBEgIIARIsCAcQChgEIiRSIggBEh5KHAgBEggIBzIECgIIABoOUgwIAhIIEgYIARICCAUSmAEICBgEIpEBIo4BCkQKKFImCAESIkogCAESCAgHMgQKAggAGhJSEAgCEgwSCggEEgIIBxICCGwSGBIWCAQSAggHEgIIbBIKGggIBzIECgIIRhJGIkQKNAokUiIIARIeShwIARIICAcyBAoCCAAaDlIMCAISCBIGCAQSAggHEgwSCggEEgIIBxICCEYSDBIKCAQSAggBEgIITxIrCAkQChgEIiNKIQgBEhMIGBIPCAESAggHEgMI7wcSAggBGggIGDIECgIIHRKnAQgKGAQioAEinQEKmgEKBBICCAkSkQEijgEKRAooUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAQSAggHEgIIbBIYEhYIBBICCAcSAghsEgoaCAgHMgQKAggBEkYiRAo0CiRSIggBEh5KHAgBEggIBzIECgIIABoOUgwIAhIIEgYIBBICCAcSDBIKCAQSAggHEgIIARIMEgoIBBICCAESAghWEhIICxgEIgwSCggEEgIIARICCA4SkgEIDBAZGAQiiQEihgEKEwoEEgIIBxILCBkyBwoFDQAAMEISbyJtCl4KBBICCAUSViJUCkQKKFImCAESIkogCAESCAgHMgQKAggAGhJSEAgCEgwSCggEEgIICRICCCYSGBIWCAQSAggJEgIIJhIKGggIBzIECgIIAhIMEgoIBBICCAkSAggCEgsIGTIHCgUNAABgQhImCA0QBxgEIh4iHAoQCgQSAggHEggIBzIECgIIJBIICAcyBAoCCCwSEwgOEBkYBCILCBkyBwoFDQAAkEISEwgPEBkYBCILCBkyBwoFDQAAEEISEwgQEBkYBCILCBkyBwoFDQAAtEISHwgREAoYBCIXEhUIARICCAcSAwj+BxICCB8SBAjp0x0SJAgSEBkYBCIcIhoKGAoQWg4IAhIEEgIIERIEEgIIBxIEEgIIDhLHAQgTEAYYBCK+ASK7AQoqCh5KHAgBEg4IHxIKCAESAggEEgIIBxoICB8yBAoCCAISCBIGCAYSAggGCioKHkocCAESDggfEgoIARICCAQSAggHGggIHzIECgIIAxIIEgYIBhICCAUKKgoeShwIARIOCB8SCggBEgIIBBICCAcaCAgfMgQKAggHEggSBggGEgIIBQoqCh5KHAgBEg4IHxIKCAESAggEEgIIBxoICB8yBAoCCAYSCBIGCAYSAggHEgkIBjIFCgMKASASMggUEAYYBCIqCAYyJgokCiJpZC5wbGF5ZXJfY29udHJvbHMucGxheWJhY2suYnV0dG9uEhQIFRAKGAQiDBIKCAESAggEEgIIHhJSCBYQBhgEIkoiSAo4CihSJggBEiJKIAgBEggIBzIECgIIABoSUhAIAhIMEgoIARICCAQSAggREgwSCggBEgIIBBICCBESDBIKCAYSAggCEgIIBRJSCBcQBhgEIkoiSAo4CihSJggBEiJKIAgBEggIBzIECgIIABoSUhAIAhIMEgoIARICCAQSAggSEgwSCggBEgIIBBICCBISDBIKCAYSAggDEgIIBRL0AggYEAYYBCLrAiLoAgrWAgooUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAESAggEEgIIDxKpAiKmAgovCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAESDRILCAQSAggDEgMI2AMKLwoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggCEg0SCwgEEgIIAxIDCJcBCi8KHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIAxINEgsIBBICCAMSAwjZAwovCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAQSDRILCAQSAggDEgMI2gMKLwoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggFEg0SCwgEEgIIAxIDCNsDCi8KHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIBhINEgsIBBICCAMSAwjcAxINEgsIBBICCAMSAwiXARLHBQgZECgYBCK+BSK7BQr8BAooUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAESAggEEgIIDxLPBCLMBApgCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAESPiI8CjoKLRIrCAESAggDEgIIARIOGgwIBzIICgYIi5fg4wISAggBEgsaCQgHMgUKAwipAxIJCCgyBQoDCKkDCmAKHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIAhI+IjwKOgotEisIARICCAMSAggBEg4aDAgHMggKBgiLl+DjAhICCAESCxoJCAcyBQoDCKEDEgkIKDIFCgMIoQMKYAoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggDEj4iPAo6Ci0SKwgBEgIIAxICCAESDhoMCAcyCAoGCIuX4OMCEgIIARILGgkIBzIFCgMIowMSCQgoMgUKAwijAwpgCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAQSPiI8CjoKLRIrCAESAggDEgIIARIOGgwIBzIICgYIi5fg4wISAggBEgsaCQgHMgUKAwilAxIJCCgyBQoDCKUDCmAKHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIBRI+IjwKOgotEisIARICCAMSAggBEg4aDAgHMggKBgiLl+DjAhICCAESCxoJCAcyBQoDCKcDEgkIKDIFCgMIpwMKYAoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggGEj4iPAo6Ci0SKwgBEgIIAxICCAESDhoMCAcyCAoGCIuX4OMCEgIIARILGgkIBzIFCgMIqwMSCQgoMgUKAwirAwo6Ci0SKwgBEgIIAxICCAESDhoMCAcyCAoGCIuX4OMCEgIIARILGgkIBzIFCgMIoQMSCQgoMgUKAwihAxL0AggaEAYYBCLrAiLoAgrWAgooUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAESAggEEgIIDxKpAiKmAgovCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAESDRILCAQSAggDEgMI3QMKLwoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggCEg0SCwgEEgIIAxIDCJgBCi8KHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIAxINEgsIBBICCAMSAwjeAwovCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAQSDRILCAQSAggDEgMI3wMKLwoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggFEg0SCwgEEgIIAxIDCOADCi8KHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIBhINEgsIBBICCAMSAwjhAxINEgsIBBICCAMSAwiYARLHBQgbECgYBCK+BSK7BQr8BAooUiYIARIiSiAIARIICAcyBAoCCAAaElIQCAISDBIKCAESAggEEgIIDxLPBCLMBApgCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAESPiI8CjoKLRIrCAESAggDEgIIARIOGgwIBzIICgYIi5fg4wISAggBEgsaCQgHMgUKAwiqAxIJCCgyBQoDCKoDCmAKHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIAhI+IjwKOgotEisIARICCAMSAggBEg4aDAgHMggKBgiLl+DjAhICCAESCxoJCAcyBQoDCKIDEgkIKDIFCgMIogMKYAoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggDEj4iPAo6Ci0SKwgBEgIIAxICCAESDhoMCAcyCAoGCIuX4OMCEgIIARILGgkIBzIFCgMIpAMSCQgoMgUKAwikAwpgCh5KHAgBEg4IIBIKCAESAggEEgIIDxoICCAyBAoCCAQSPiI8CjoKLRIrCAESAggDEgIIARIOGgwIBzIICgYIi5fg4wISAggBEgsaCQgHMgUKAwimAxIJCCgyBQoDCKYDCmAKHkocCAESDgggEgoIARICCAQSAggPGggIIDIECgIIBRI+IjwKOgotEisIARICCAMSAggBEg4aDAgHMggKBgiLl+DjAhICCAESCxoJCAcyBQoDCKgDEgkIKDIFCgMIqAMKYAoeShwIARIOCCASCggBEgIIBBICCA8aCAggMgQKAggGEj4iPAo6Ci0SKwgBEgIIAxICCAESDhoMCAcyCAoGCIuX4OMCEgIIARILGgkIBzIFCgMIrAMSCQgoMgUKAwisAwo6Ci0SKwgBEgIIAxICCAESDhoMCAcyCAoGCIuX4OMCEgIIARILGgkIBzIFCgMIogMSCQgoMgUKAwiiAxifia7Q8M+r8T4wAQrkhwHagYjvBdyHAQoqb25fdGhlX2dvX2NvbnRyb2xzLmVtbC1mZXxmODdjOGVjZGIxNTRkYWRkErWFAbLHzocFrYUBEp6FAQoECAYQCQoECAsQCwoECBAQDgoECBEQCAoECBIQDgoECBQQDgoECBgQBQoECB0QDgoECB8QAgoECCUQDQoECCoQDgoECCsQDgoECDAQCwoECDEQDgoFCDIQ6gcKBAhGEA4KBAhHEA4KBAhJEA4KBAhKEA4KBAhOEA4KBAhVEA4KBAhpEA4KBQiBARAOCgUIggEQDgoFCIkBEA4KBQiMARAOCgUIkQEQDhIECAEYARKUZggCGAIijWYaimYKEQgBEg0aCwoJCMTI4UwSAhoACjQIAhIwGi4KEwi5l71QEgwaCgoICAMSBBICCEMKFwjrmL1QEhAaDgoMCAYSCAgRMgQKAggACr5lCAMSuWVatmUIARKxZRquZQoRCAESDRoLCgkIp5TcSxICGgAKigEIAhKFARqCAQpnCISLvVASYBpeCgwIChIICEYyBAoCCAMKDAgLEggIRzIECgIIBApACAISPBo6CjgIARI0IjIKKgoiWiAIAhIWWhQIAhIEEgIIBxIKUggIARIEEgIICRIEEgIIDxIEEgIIGRIEEgIIFwoXCOuYvVASEBoOCgwIBhIICBEyBAoCCAAKi2QIAxKGZFqDZAgBEpoeGpceChEIARINGgsKCQinlNxLEgIaAAplCAISYRpfCl0IhIu9UBJWGlQKDAgKEggIRjIECgIIAwoPCA0SCwgfMgcKBQ0AAABACgwIDBIICEkyBAoCCAQKJQgDEiEaHwoPCAESCwgfMgcKBQ0AAIA/CgwIAhIICEoyBAoCCAIKmh0IAxKVHVqSHQgBEo0dGoodChEIARINGgsKCQinlNxLEgIaAAqcAQgCEpcBGpQBCpEBCISLvVASiQEahgEKDAgKEggIRjIECgIIAwoMCAwSCAhJMgQKAggECkEICRI9GjsKOQgBEjUaMwoxCAESLSIrChwKBBICCAoSFBISCAESAggEEgIIBBICCAESAggDEgsIHzIHCgUNAAAAAAolCAMSIRofCg8IARILCB8yBwoFDQAAYD8KDAgCEggISjIECgIIAgrVGwgDEtAbWs0bCAESlQIikgIKjwIKMFouCAISJFIiCAESHkocCAESCAgYMgQKAggAGg5SDAgCEggSBggDEgIIBRIEEgIILxLaARrXAQpdCAESWRpXClUIuZTcSxJOGkwKSggBEkYaRAoQCAESDBIKCAMSAggFEgIIAQoMCAISCAhOMgQKAggDCiIIAxIeGhwKGgj5o9xJEhMaEQoPCAMSCwgfMgcKBQ0AACBBCnYIAhJyGnAKbgiEi71QEmcaZQoeCAMSGhoYCggIARIEEgIILAoMCAISCAhKMgQKAggCCggIEhIEEgIIIQooCAgSJBoiCiAIARIcGhoKGAgBEhQSEggBEgIIBBICCAQSAggBEgIIBAoPCA4SCwgfMgcKBQ0AAAAAEp4IGpsICs0HCAESyAcaxQcKwgcI3JTcSxK6Bxq3BwqQBwgBEosHYogHEvsGGvgGCgwIAxIIEgYIARICCAYKEQgCEg0SCwgBEgIIAxIDCO8HChEIARINEgsIARICCAMSAwjyBwoICAcSBBICCDAKDAgIEggIVTIECgIIQQoMCAkSCBIGCAESAggECoUGCAQSgAYa/QUKEAgBEgwSCggDEgIIARICCAEKEAgFEgwSCggDEgIIARICCAUK1gUIBhLRBSLOBQrLBQorEikIARICCAYSAggBEg0aCwgYMgcKBQjP77R7EgIIARIKGggIGDIECgIIChKbBVqYBQgBErQCYrECEqMCGqACChEIARINEgsIARICCAMSAwjyBwoRCAISDRILCAESAggDEgMI7wcKDAgDEggSBggBEgIIBgoICAQSBBICCDAKDAgGEggIVTIECgIIQQoMCAcSCBIGCAESAggECsMBCAUSvgEauwEKqgEIBRKlASKiAQpMCixSKggBEiZKJAgBEggIGDIECgIIABoWUhQIAhIQEg4IARICCAQSAggHEgIIbBIcEhoIARICCAQSAggHEgIIbBIKGggIGDIECgIIRhJSIlAKPAooUiYIARIiSiAIARIICBgyBAoCCAAaElIQCAISDBIKCAESAggEEgIIBxIQEg4IARICCAQSAggHEgIIRhIQEg4IARICCAQSAggBEgIITwoMCAESCAglMgQKAggAKJaakduv9ezy3AES3AIq2QIISBIMEgoIAxICCAESAggFGsICYr8CErECGq4CChEIARINEgsIARICCAMSAwjyBwoRCAISDRILCAESAggDEgMI7wcKDAgDEggSBggBEgIIBgoICAQSBBICCDAKDAgGEggIVTIECgIIQQoMCAcSCBIGCAESAggECtEBCAUSzAEayQEKDAgBEggSBghIEgIIAQoMCAISCBIGCEgSAggCCqoBCAUSpQEiogEKTAosUioIARImSiQIARIICBgyBAoCCAAaFlIUCAISEBIOCAESAggEEgIIBxICCGwSHBIaCAESAggEEgIIBxICCGwSChoICBgyBAoCCAYSUiJQCjwKKFImCAESIkogCAESCAgYMgQKAggAGhJSEAgCEgwSCggBEgIIBBICCAcSEBIOCAESAggEEgIIBxICCAYSEBIOCAESAggEEgIIARICCDgolpqR26/17PLcASBJKEoKFAgFEhAaDgoMCAMSCAhpMgQKAggFKMqn+8eRyseEOQoiCAISHiIcChAKBBICCAoSCAglMgQKAggDEggIJTIECgIIAQpJCAISRRpDCkEIhIu9UBI6GjgKKAgIEiQaIgogCAESHBoaChgIARIUEhIIARICCAQSAggEEgIIARICCAMKDAgQEggISTIECgIIAhK8Axq5AwrrAggBEuYCGuMCCuACCNyU3EsS2AIa1QIKxAIIARK/AmK8AhKuAhqrAgoRCAESDRILCAESAggDEgMI8gcKEQgCEg0SCwgBEgIIAxIDCO8HCgwIAxIIEgYIARICCAYKDAgEEggSBggDEgIIAgqqAQgFEqUBIqIBCkwKLFIqCAESJkokCAESCAgYMgQKAggAGhZSFAgCEhASDggBEgIIBBICCAcSAghsEhwSGggBEgIIBBICCAcSAghsEgoaCAgYMgQKAghIElIiUAo8CihSJggBEiJKIAgBEggIGDIECgIIABoSUhAIAhIMEgoIARICCAQSAggHEhASDggBEgIIBBICCAcSAghIEhASDggBEgIIBBICCAESAghOCggIBxIEEgIIMQoMCAgSCAhVMgQKAggZCgwICRIIEgYIARICCAQKFAgGEhAaDgoMCAMSCAhpMgQKAggFKNiMkrnOnfLviQEKDAgCEggIJTIECgIIAQpJCAISRRpDCkEIhIu9UBI6GjgKKAgIEiQaIgogCAESHBoaChgIARIUEhIIARICCAQSAggEEgIIARICCAEKDAgQEggISTIECgIIAhLQDSLNDQrKDQoQWg4IAxIEEgIIGxIEEgIIHBK1DRqyDQoRCAESDRoLCgkIp5TcSxICGgAKcAgCEmwaagpoCISLvVASYRpfCgwIChIICEYyBAoCCAEKDAgQEggISTIECgIIBApBCAgSPRo7CjkIARI1GjMKMQgBEi0iKwoTCgQSAggaEgsIHzIHCgUNAAAAABIUEhIIARICCAQSAggEEgIIARICCAMKqgwIAxKlDFqiDAgBEo0GIooGCocGCgQSAggbEv4FGvsFCssFCAESxgUawwUKwAUIua29UBK4BRq1BQo8CAMSOBo2CjQIspmEUhItGisKKQgBEiUIBjIhCh8KHWJhZGdlLmVtbC1mZXw1MjkxY2ZlYWJjZTM4YjJmCi0IBRIpGicKJQjH9N1cEh4aHAoMCAcSCBIGCAMSAggPCgwIBBIIEgYIARICCAMKxQQIBhLABBq9BAqrAgj3wvBZEqMCGqACCg8IAhILCBgyBwoFCMf03VwKjAIIARKHAjqEAgqIASKFAQqCAQooSiYIBhIYCBhSFAgDEhASDggBEgIIAxIGCMe0vuABGggIGDIECgIIABJWGlQKFAgBEhASDggBEgIIAxIGCMe0vuABCh4IAxIaOhgKCAgYMgQKAggECgwIGDIICgYIy6XvpwEKDQgEEgkIgQEyBAoCCAEKDQgGEgkIggEyBAoCCAEKdyJ1CnMKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASRxpFChQIARIQEg4IARICCAMSBgjC4q72AQoMCAISCAgYMgQKAggFChAIAxIMOgoKCAgYMgQKAggFCg0IBhIJCIIBMgQKAggCCo8BCJX+m7gBEoYBGoMBCg8IAhILCBgyBwoFCMf03VwKcAgBEmw6agpoImYKZAooSiYIBhIYCBhSFAgDEhASDggBEgIIAxIGCMe0vuABGggIGDIECgIIABI4GjYKFAgBEhASDggBEgIIAxIGCMe0vuABCh4IAhIaOhgKCAgYMgQKAggECgwIGDIICgYIy6XvpwEKewiW/pu4ARJzGnEKDwgCEgsIGDIHCgUIx/TdXApeCAESWiJYClYKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASKhooChQIARIQEg4IARICCAMSBgjC4q72AQoQCAISDDoKCggIGDIECgIIBQorCAISJxolCiMIhIu9UBIcGhoKGAgJEhQaEgoQCAcSDBoKCggIARIEEgIIHRKNBiKKBgqHBgoEEgIIHBL+BRr7BQrLBQgBEsYFGsMFCsAFCLmtvVASuAUatQUKPAgDEjgaNgo0CLKZhFISLRorCikIARIlCAYyIQofCh1iYWRnZS5lbWwtZmV8NTI5MWNmZWFiY2UzOGIyZgotCAUSKRonCiUIx/TdXBIeGhwKDAgHEggSBggDEgIIEAoMCAQSCBIGCAESAggDCsUECAYSwAQavQQKqwII98LwWRKjAhqgAgoPCAISCwgYMgcKBQjH9N1cCowCCAEShwI6hAIKiAEihQEKggEKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjHtL7gARoICBgyBAoCCAASVhpUChQIARIQEg4IARICCAMSBgjHtL7gAQoeCAMSGjoYCggIGDIECgIIBAoMCBgyCAoGCMul76cBCg0IBBIJCIEBMgQKAggBCg0IBhIJCIIBMgQKAggBCncidQpzCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIwuKu9gEaCAgYMgQKAggAEkcaRQoUCAESEBIOCAESAggDEgYIwuKu9gEKDAgCEggIGDIECgIIBQoQCAMSDDoKCggIGDIECgIIBQoNCAYSCQiCATIECgIIAgqPAQiV/pu4ARKGARqDAQoPCAISCwgYMgcKBQjH9N1cCnAIARJsOmoKaCJmCmQKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjHtL7gARoICBgyBAoCCAASOBo2ChQIARIQEg4IARICCAMSBgjHtL7gAQoeCAISGjoYCggIGDIECgIIBAoMCBgyCAoGCMul76cBCnsIlv6buAEScxpxCg8IAhILCBgyBwoFCMf03VwKXggBEloiWApWCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIwuKu9gEaCAgYMgQKAggAEioaKAoUCAESEBIOCAESAggDEgYIwuKu9gEKEAgCEgw6CgoICBgyBAoCCAUKKwgCEicaJQojCISLvVASHBoaChgICRIUGhIKEAgHEgwaCgoICAESBBICCB0Sjg4iiw4KiA4KBBICCBAS/w0a/A0KEQgBEg0aCwoJCKeU3EsSAhoACiIIAhIeGhwKGgiEi71QEhMaEQoPCA0SCwgfMgcKBQ0AAIA/CsINCAMSvQ1aug0IARKZAxqWAwoRCAESDRoLCgkIp5TcSxICGgAKygEIAhLFARrCAQqmAQiEi71QEp4BGpsBCgwIChIICEYyBAoCCAMKDAgMEggISTIECgIIBAolCAMSIRofCg8IARILCB8yBwoFDQAAgD8KDAgCEggISjIECgIIAgoQCAISDBoKCggIARIEEgIIEwpECAkSQBo+CjwIARI4GjYKNAgBEjAiLgosCiRSIggBEh5KHAgBEggIGDIECgIIABoOUgwIAhIIEgYIAxICCAgSBBICCBIKFwjrmL1QEhAaDgoMCAYSCAgRMgQKAggACrMBCAMSrgFaqwEIARKmARqjAQpVCAESURpPCk0InKzQ+AESRRpDCkEIARI9IjsKOQosEioIARICCAYSAggBEg4aDAgYMggKBgjijtGxAhICCAESChoICBgyBAoCCAESCQiJATIECgIIAQpKCAISRhpECkIIhIu9UBI7GjkKEAgCEgwaCgoICAESBBICCBEKJQgDEiEaHwoPCAESCwgfMgcKBQ0AAIA/CgwIAhIICEoyBAoCCAISmQoilgoKkwoKJFIiCAESHkocCAESCAgYMgQKAggAGg5SDAgCEggSBggDEgIICBLqCRrnCQrVBwgBEtAHGs0HCsoHCLmtvVASwgcavwcKSQgDEkUaQwpBCLKZhFISOho4CjYIARIyCAYyLgosCip2aWRlb19hY3Rpb25fYnV0dG9uLmVtbC1mZXxhOTZlY2NiNjc4NmVhMzMKeggFEnYadApyCLr3oK0BEmoaaAoUCAUSEBoOCgwIEBIIEgYIAxICCAgKDAgBEggSBggBEgIIBAo0CAcSMAgGMiwKKgoob25fdGhlX2dvX2NvbnRyb2xzX2VuYWJsZW1lbnRfZW50aXR5X2tleQoMCAsSCBIGCAESAggDCvUFCAYS8AUa7QUK2QMI98LwWRLRAxrOAwoQCAISDAgYMggKBgi696CtAQq5AwgBErQDOrEDCqoBIqcBCqQBCkhKRggGEjgIGFI0CAMSMAgGMiwKKgoob25fdGhlX2dvX2NvbnRyb2xzX2VuYWJsZW1lbnRfZW50aXR5X2tleRoICBgyBAoCCAASWBpWCjQIARIwCAYyLAoqCihvbl90aGVfZ29fY29udHJvbHNfZW5hYmxlbWVudF9lbnRpdHlfa2V5CgwIAhIICBgyBAoCCAYKEAgDEgw6CgoICBgyBAoCCAYKdyJ1CnMKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASRxpFChQIARIQEg4IARICCAMSBgjC4q72AQoMCAISCAgYMgQKAggIChAIAxIMOgoKCAgYMgQKAggICg0IBhIJCIIBMgQKAggCCogBIoUBCoIBCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIx7S+4AEaCAgYMgQKAggAElYaVAoUCAESEBIOCAESAggDEgYIx7S+4AEKHggDEho6GAoICBgyBAoCCAsKDAgYMggKBgjLpe+nAQoNCAQSCQiBATIECgIIAQoNCAYSCQiCATIECgIIAQqQAQiV/pu4ARKHARqEAQoQCAISDAgYMggKBgi696CtAQpwCAESbDpqCmgiZgpkCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIx7S+4AEaCAgYMgQKAggAEjgaNgoUCAESEBIOCAESAggDEgYIx7S+4AEKHggCEho6GAoICBgyBAoCCAsKDAgYMggKBgjLpe+nAQp8CJb+m7gBEnQacgoQCAISDAgYMggKBgi696CtAQpeCAESWiJYClYKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASKhooChQIARIQEg4IARICCAMSBgjC4q72AQoQCAISDDoKCggIGDIECgIICAorCAQSJwgGMiMKIQofY2hhcHRlcl92aWRlb19hY3Rpb25fYnV0dG9uX2tleQrfAQgCEtoBGtcBCnYIhIu9UBJvGm0KEAgDEgwaCgoICAESBBICCB4KEAgCEgwaCgoICAESBBICCB4KDQgREgkIjAEyBAoCCAIKOAgBEjQaMgoXCAESExoRCg8IARILCB8yBwoFDQAAAAAKFwgEEhMaEQoPCAESCwgfMgcKBQ0AAAAACl0IlZe9UBJWGlQKUggGEk4aTApKCJCs3JIBEkIaQAo0CAESMFIuCAESKkooCAESCAgYMgQKAggAGhpSGAgCEhQSEggDEgIICBIGCP/C7NsBEgIIBAoICAMSBBICCCASqAgapQgK5QcIARLgBxrdBwraBwi5rb1QEtIHGs8HCl0IAxJZGlcKVQiymYRSEk4aTApKCAESRggGMkIKQAo+ZW5nYWdlbWVudF9wYW5lbF9sYXJnZV9wbGF5ZXJfY29udHJvbHMuZW1sLWZlfGVhYTZlMDVjOTJlNmVlNzgKjwEIBRKKARqHAQqEAQjIj6n1ARJ8GnoKDAgFEggSBggDEgIIAwoMCAISCBIGCAESAggECjwIAxI4IjYKNAooSiYIARIYCBhSFAgDEhASDggBEgIIAxIGCMLirvYBGggIGDIECgIIABIIEgYIARICCAYKEAgEEgwSCggBEgYI/93C4AEKDAgHEggSBggBEgIIAwrbBQgGEtYFGtMFCr8DCPfC8FkStwMatAMKEAgCEgwIGDIICgYIyI+p9QEKnwMIARKaAzqXAwp3InUKcwooSiYIBhIYCBhSFAgDEhASDggBEgIIAxIGCMLirvYBGggIGDIECgIIABJHGkUKFAgBEhASDggBEgIIAxIGCMLirvYBCgwIAhIICBgyBAoCCAMKEAgDEgw6CgoICBgyBAoCCAMKDQgGEgkIggEyBAoCCAIKkAEijQEKigEKO0o5CAYSKwgYUicIAxIjCAYyHwodChsveW91dHViZS9hcHAvcGxheWVyX292ZXJsYXkaCAgYMgQKAggAEksaSQonCAESIwgGMh8KHQobL3lvdXR1YmUvYXBwL3BsYXllcl9vdmVybGF5CgwIAhIICBgyBAoCCAQKEAgDEgw6CgoICBgyBAoCCAQKiAEihQEKggEKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjHtL7gARoICBgyBAoCCAASVhpUChQIARIQEg4IARICCAMSBgjHtL7gAQoeCAMSGjoYCggIGDIECgIIBwoMCBgyCAoGCMul76cBCg0IBBIJCIEBMgQKAggBCg0IBhIJCIIBMgQKAggBCpABCJX+m7gBEocBGoQBChAIAhIMCBgyCAoGCMiPqfUBCnAIARJsOmoKaCJmCmQKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjHtL7gARoICBgyBAoCCAASOBo2ChQIARIQEg4IARICCAMSBgjHtL7gAQoeCAISGjoYCggIGDIECgIIBwoMCBgyCAoGCMul76cBCnwIlv6buAESdBpyChAIAhIMCBgyCAoGCMiPqfUBCl4IARJaIlgKVgooSiYIBhIYCBhSFAgDEhASDggBEgIIAxIGCMLirvYBGggIGDIECgIIABIqGigKFAgBEhASDggBEgIIAxIGCMLirvYBChAIAhIMOgoKCAgYMgQKAggDCjsIAhI3GjUKGgiEi71QEhMaEQoPCA0SCwgfMgcKBQ0AAIA/ChcIlZe9UBIQGg4KDAgHEggIETIECgIIABKlLxqiLwoRCAESDRoLCgkIp5TcSxICGgAKlwEIAhKSARqPAQp0CISLvVASbRprCgwIChIICEYyBAoCCAEKDAgLEggIRzIECgIIBQoMCAwSCAhJMgQKAggCCg0IExIJCJEBMgQKAggBCg8IDRILCB8yBwoFDQAAgD4KHwgJEhsaGQoXCAcSExoRCg8IARILCB8yBwoFDQAAwEEKFwjrmL1QEhAaDgoMCAYSCAgRMgQKAggACvItCAMS7S1a6i0IARKZByKWBwqTBwokUiIIARIeShwIARIICBgyBAoCCAAaDlIMCAISCBIGCAMSAggNEuoGGucGChEIARINGgsKCQinlNxLEgIaAApVCAISURpPCk0IhIu9UBJGGkQKEAgEEgwaCgoICAESBBICCEYKEAgDEgwaCgoICAESBBICCB8KEAgCEgwaCgoICAESBBICCB8KDAgMEggISTIECgIIBAr6BQgDEvUFWvIFCAES7QUa6gUK5wUIARLiBRrfBQrcBQi5rb1QEtQFGtEFCkYIAxJCGkAKPgiymYRSEjcaNQozCAESLwgGMisKKQonZG93bmxvYWRfYnV0dG9uLmVtbC1mZXwxMzUyNjFhZDcwMjU4NDM5CjwIBRI4GjYKNAjEosiCARIsGioKDAgKEggSBggDEgIIDQoMCAMSCBIGCAESAggECgwIBhIIEgYIARICCAMKyAQIBhLDBBrABAqsAgj3wvBZEqQCGqECChAIAhIMCBgyCAoGCMSiyIIBCowCCAEShwI6hAIKiAEihQEKggEKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjHtL7gARoICBgyBAoCCAASVhpUChQIARIQEg4IARICCAMSBgjHtL7gAQoeCAMSGjoYCggIGDIECgIIBgoMCBgyCAoGCMul76cBCg0IBBIJCIEBMgQKAggBCg0IBhIJCIIBMgQKAggBCncidQpzCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIwuKu9gEaCAgYMgQKAggAEkcaRQoUCAESEBIOCAESAggDEgYIwuKu9gEKDAgCEggIGDIECgIICQoQCAMSDDoKCggIGDIECgIICQoNCAYSCQiCATIECgIIAgqQAQiV/pu4ARKHARqEAQoQCAISDAgYMggKBgjEosiCAQpwCAESbDpqCmgiZgpkCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIx7S+4AEaCAgYMgQKAggAEjgaNgoUCAESEBIOCAESAggDEgYIx7S+4AEKHggCEho6GAoICBgyBAoCCAYKDAgYMggKBgjLpe+nAQp8CJb+m7gBEnQacgoQCAISDAgYMggKBgjEosiCAQpeCAESWiJYClYKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASKhooChQIARIQEg4IARICCAMSBgjC4q72AQoQCAISDDoKCggIGDIECgIICRKvCRqsCQrRBwgBEswHGskHCsYHCLmtvVASvgcauwcKSQgDEkUaQwpBCLKZhFISOho4CjYIARIyCAYyLgosCip2aWRlb19hY3Rpb25fYnV0dG9uLmVtbC1mZXxhOTZlY2NiNjc4NmVhMzMKdggFEnIacApuCLr3oK0BEmYaZAoQCAUSDBoKCggIEBIEEgIIQgo0CAcSMAgGMiwKKgoob25fdGhlX2dvX2NvbnRyb2xzX2VuYWJsZW1lbnRfZW50aXR5X2tleQoMCAESCBIGCAESAggECgwICxIIEgYIARICCAMK9QUIBhLwBRrtBQrZAwj3wvBZEtEDGs4DChAIAhIMCBgyCAoGCLr3oK0BCrkDCAEStAM6sQMKqgEipwEKpAEKSEpGCAYSOAgYUjQIAxIwCAYyLAoqCihvbl90aGVfZ29fY29udHJvbHNfZW5hYmxlbWVudF9lbnRpdHlfa2V5GggIGDIECgIIABJYGlYKNAgBEjAIBjIsCioKKG9uX3RoZV9nb19jb250cm9sc19lbmFibGVtZW50X2VudGl0eV9rZXkKDAgCEggIGDIECgIIBgoQCAMSDDoKCggIGDIECgIIBgp3InUKcwooSiYIBhIYCBhSFAgDEhASDggBEgIIAxIGCMLirvYBGggIGDIECgIIABJHGkUKFAgBEhASDggBEgIIAxIGCMLirvYBCgwIAhIICBgyBAoCCAgKEAgDEgw6CgoICBgyBAoCCAgKDQgGEgkIggEyBAoCCAIKiAEihQEKggEKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjHtL7gARoICBgyBAoCCAASVhpUChQIARIQEg4IARICCAMSBgjHtL7gAQoeCAMSGjoYCggIGDIECgIICwoMCBgyCAoGCMul76cBCg0IBBIJCIEBMgQKAggBCg0IBhIJCIIBMgQKAggBCpABCJX+m7gBEocBGoQBChAIAhIMCBgyCAoGCLr3oK0BCnAIARJsOmoKaCJmCmQKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjHtL7gARoICBgyBAoCCAASOBo2ChQIARIQEg4IARICCAMSBgjHtL7gAQoeCAISGjoYCggIGDIECgIICwoMCBgyCAoGCMul76cBCnwIlv6buAESdBpyChAIAhIMCBgyCAoGCLr3oK0BCl4IARJaIlgKVgooSiYIBhIYCBhSFAgDEhASDggBEgIIAxIGCMLirvYBGggIGDIECgIIABIqGigKFAgBEhASDggBEgIIAxIGCMLirvYBChAIAhIMOgoKCAgYMgQKAggICjUIBBIxCAYyLQorCilhdWRpb190b2dnbGVfb25seV92aWRlb19hY3Rpb25fYnV0dG9uX2tleQqeAQgCEpkBGpYBCkkIhIu9UBJCGkAKCAgOEgQSAghFChAIBBIMGgoKCAgBEgQSAghGChAIAxIMGgoKCAgBEgQSAghHChAIAhIMGgoKCAgBEgQSAggeCkkIlZe9UBJCGkAKPggGEjoaOAo2CJCs3JIBEi4aLAogCAESHFoaCAISClIICAESBBICCDYSClIICAESBBICCDcKCAgDEgQSAgggEugJIuUJCuIJCiRSIggBEh5KHAgBEggIGDIECgIIABoOUgwIAhIIEgYIAxICCBMSuQkatgkK1QcIARLQBxrNBwrKBwi5rb1QEsIHGr8HCkkIAxJFGkMKQQiymYRSEjoaOAo2CAESMggGMi4KLAoqdmlkZW9fYWN0aW9uX2J1dHRvbi5lbWwtZmV8YTk2ZWNjYjY3ODZlYTMzCnoIBRJ2GnQKcgi696CtARJqGmgKFAgFEhAaDgoMCBASCBIGCAMSAggTCgwIARIIEgYIARICCAQKNAgHEjAIBjIsCioKKG9uX3RoZV9nb19jb250cm9sc19lbmFibGVtZW50X2VudGl0eV9rZXkKDAgLEggSBggBEgIIAwr1BQgGEvAFGu0FCtkDCPfC8FkS0QMazgMKEAgCEgwIGDIICgYIuvegrQEKuQMIARK0AzqxAwqqASKnAQqkAQpISkYIBhI4CBhSNAgDEjAIBjIsCioKKG9uX3RoZV9nb19jb250cm9sc19lbmFibGVtZW50X2VudGl0eV9rZXkaCAgYMgQKAggAElgaVgo0CAESMAgGMiwKKgoob25fdGhlX2dvX2NvbnRyb2xzX2VuYWJsZW1lbnRfZW50aXR5X2tleQoMCAISCAgYMgQKAggGChAIAxIMOgoKCAgYMgQKAggGCncidQpzCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIwuKu9gEaCAgYMgQKAggAEkcaRQoUCAESEBIOCAESAggDEgYIwuKu9gEKDAgCEggIGDIECgIICAoQCAMSDDoKCggIGDIECgIICAoNCAYSCQiCATIECgIIAgqIASKFAQqCAQooSiYIBhIYCBhSFAgDEhASDggBEgIIAxIGCMe0vuABGggIGDIECgIIABJWGlQKFAgBEhASDggBEgIIAxIGCMe0vuABCh4IAxIaOhgKCAgYMgQKAggLCgwIGDIICgYIy6XvpwEKDQgEEgkIgQEyBAoCCAEKDQgGEgkIggEyBAoCCAEKkAEIlf6buAEShwEahAEKEAgCEgwIGDIICgYIuvegrQEKcAgBEmw6agpoImYKZAooSiYIBhIYCBhSFAgDEhASDggBEgIIAxIGCMe0vuABGggIGDIECgIIABI4GjYKFAgBEhASDggBEgIIAxIGCMe0vuABCh4IAhIaOhgKCAgYMgQKAggLCgwIGDIICgYIy6XvpwEKfAiW/pu4ARJ0GnIKEAgCEgwIGDIICgYIuvegrQEKXggBEloiWApWCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIwuKu9gEaCAgYMgQKAggAEioaKAoUCAESEBIOCAESAggDEgYIwuKu9gEKEAgCEgw6CgoICBgyBAoCCAgKJwgEEiMIBjIfCh0KG2Fza192aWRlb19hY3Rpb25fYnV0dG9uX2tleQqyAQgCEq0BGqoBCkkIhIu9UBJCGkAKCAgOEgQSAghFChAIBBIMGgoKCAgBEgQSAghGChAIAxIMGgoKCAgBEgQSAghHChAIAhIMGgoKCAgBEgQSAggeCl0IlZe9UBJWGlQKUggGEk4aTApKCJCs3JIBEkIaQAo0CAESMFIuCAESKkooCAESCAgYMgQKAggAGhpSGAgCEhQSEggDEgIIExIGCP/C7NsBEgIIBAoICAMSBBICCCAS7gki6wkK6AkKJFIiCAESHkocCAESCAgYMgQKAggAGg5SDAgCEggSBggDEgIICRK/CRq8CQrVBwgBEtAHGs0HCsoHCLmtvVASwgcavwcKSQgDEkUaQwpBCLKZhFISOho4CjYIARIyCAYyLgosCip2aWRlb19hY3Rpb25fYnV0dG9uLmVtbC1mZXxhOTZlY2NiNjc4NmVhMzMKeggFEnYadApyCLr3oK0BEmoaaAoUCAUSEBoOCgwIEBIIEgYIAxICCAkKDAgBEggSBggBEgIIBAo0CAcSMAgGMiwKKgoob25fdGhlX2dvX2NvbnRyb2xzX2VuYWJsZW1lbnRfZW50aXR5X2tleQoMCAsSCBIGCAESAggDCvUFCAYS8AUa7QUK2QMI98LwWRLRAxrOAwoQCAISDAgYMggKBgi696CtAQq5AwgBErQDOrEDCqoBIqcBCqQBCkhKRggGEjgIGFI0CAMSMAgGMiwKKgoob25fdGhlX2dvX2NvbnRyb2xzX2VuYWJsZW1lbnRfZW50aXR5X2tleRoICBgyBAoCCAASWBpWCjQIARIwCAYyLAoqCihvbl90aGVfZ29fY29udHJvbHNfZW5hYmxlbWVudF9lbnRpdHlfa2V5CgwIAhIICBgyBAoCCAYKEAgDEgw6CgoICBgyBAoCCAYKdyJ1CnMKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASRxpFChQIARIQEg4IARICCAMSBgjC4q72AQoMCAISCAgYMgQKAggIChAIAxIMOgoKCAgYMgQKAggICg0IBhIJCIIBMgQKAggCCogBIoUBCoIBCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIx7S+4AEaCAgYMgQKAggAElYaVAoUCAESEBIOCAESAggDEgYIx7S+4AEKHggDEho6GAoICBgyBAoCCAsKDAgYMggKBgjLpe+nAQoNCAQSCQiBATIECgIIAQoNCAYSCQiCATIECgIIAQqQAQiV/pu4ARKHARqEAQoQCAISDAgYMggKBgi696CtAQpwCAESbDpqCmgiZgpkCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIx7S+4AEaCAgYMgQKAggAEjgaNgoUCAESEBIOCAESAggDEgYIx7S+4AEKHggCEho6GAoICBgyBAoCCAsKDAgYMggKBgjLpe+nAQp8CJb+m7gBEnQacgoQCAISDAgYMggKBgi696CtAQpeCAESWiJYClYKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASKhooChQIARIQEg4IARICCAMSBgjC4q72AQoQCAISDDoKCggIGDIECgIICAotCAQSKQgGMiUKIwohdmFyaXNwZWVkX3ZpZGVvX2FjdGlvbl9idXR0b25fa2V5CrIBCAISrQEaqgEKSQiEi71QEkIaQAoICA4SBBICCEUKEAgEEgwaCgoICAESBBICCEYKEAgDEgwaCgoICAESBBICCEcKEAgCEgwaCgoICAESBBICCB4KXQiVl71QElYaVApSCAYSThpMCkoIkKzckgESQhpACjQIARIwUi4IARIqSigIARIICBgyBAoCCAAaGlIYCAISFBISCAMSAggJEgYI/8Ls2wESAggECggIAxIEEgIIIBK7CRq4CQrVBwgBEtAHGs0HCsoHCLmtvVASwgcavwcKSQgDEkUaQwpBCLKZhFISOho4CjYIARIyCAYyLgosCip2aWRlb19hY3Rpb25fYnV0dG9uLmVtbC1mZXxhOTZlY2NiNjc4NmVhMzMKeggFEnYadApyCLr3oK0BEmoaaAoUCAUSEBoOCgwIEBIIEgYIAxICCAcKDAgBEggSBggBEgIIBAo0CAcSMAgGMiwKKgoob25fdGhlX2dvX2NvbnRyb2xzX2VuYWJsZW1lbnRfZW50aXR5X2tleQoMCAsSCBIGCAESAggDCvUFCAYS8AUa7QUK2QMI98LwWRLRAxrOAwoQCAISDAgYMggKBgi696CtAQq5AwgBErQDOrEDCqoBIqcBCqQBCkhKRggGEjgIGFI0CAMSMAgGMiwKKgoob25fdGhlX2dvX2NvbnRyb2xzX2VuYWJsZW1lbnRfZW50aXR5X2tleRoICBgyBAoCCAASWBpWCjQIARIwCAYyLAoqCihvbl90aGVfZ29fY29udHJvbHNfZW5hYmxlbWVudF9lbnRpdHlfa2V5CgwIAhIICBgyBAoCCAYKEAgDEgw6CgoICBgyBAoCCAYKdyJ1CnMKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASRxpFChQIARIQEg4IARICCAMSBgjC4q72AQoMCAISCAgYMgQKAggIChAIAxIMOgoKCAgYMgQKAggICg0IBhIJCIIBMgQKAggCCogBIoUBCoIBCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIx7S+4AEaCAgYMgQKAggAElYaVAoUCAESEBIOCAESAggDEgYIx7S+4AEKHggDEho6GAoICBgyBAoCCAsKDAgYMggKBgjLpe+nAQoNCAQSCQiBATIECgIIAQoNCAYSCQiCATIECgIIAQqQAQiV/pu4ARKHARqEAQoQCAISDAgYMggKBgi696CtAQpwCAESbDpqCmgiZgpkCihKJggGEhgIGFIUCAMSEBIOCAESAggDEgYIx7S+4AEaCAgYMgQKAggAEjgaNgoUCAESEBIOCAESAggDEgYIx7S+4AEKHggCEho6GAoICBgyBAoCCAsKDAgYMggKBgjLpe+nAQp8CJb+m7gBEnQacgoQCAISDAgYMggKBgi696CtAQpeCAESWiJYClYKKEomCAYSGAgYUhQIAxIQEg4IARICCAMSBgjC4q72ARoICBgyBAoCCAASKhooChQIARIQEg4IARICCAMSBgjC4q72AQoQCAISDDoKCggIGDIECgIICAopCAQSJQgGMiEKHwodcXVldWVfdmlkZW9fYWN0aW9uX2J1dHRvbl9rZXkKsgEIAhKtARqqAQpJCISLvVASQhpACggIDhIEEgIIRQoQCAQSDBoKCggIARIEEgIIRgoQCAMSDBoKCggIARIEEgIIRwoQCAISDBoKCggIARIEEgIIHgpdCJWXvVASVhpUClIIBhJOGkwKSgiQrNySARJCGkAKNAgBEjBSLggBEipKKAgBEggIGDIECgIIABoaUhgIAhIUEhIIAxICCAcSBgj/wuzbARICCAQKCAgDEgQSAgggEhMIAxgEIg0SCwgBEgIIARIDCJUSEjkIBBAGGAQiMQgGMi0KKwopL3lvdXR1YmUvYXBwL29uX3RoZV9nb19tZW51X3RyaWdnZXJfc3RhdGUSNwgFEAYYBCIvCAYyKwopCicveW91dHViZS9hcHAvb25fdGhlX2dvX2F1ZGlvX29ubHlfc3RhdGUSQAgGEAsYBCI4GjYKNAjWlelQEi0aKwopCLXhn48BEiEaHwodCAISGRoXChUIAxIRCAYyDQoLCglvbi10aGUtZ28SJggHEBEYBCIeShwIARIOCBASCggBEgIIBRICCAUaCAgQMgQKAggAEiYICBARGAQiHkocCAESDggQEgoIARICCAUSAggFGggIEDIECgIIARImCAkQERgEIh5KHAgBEg4IEhIKCAESAggFEgIIBhoICBIyBAoCCAESVAgKEBEYBCJMWkoIAxIiSiAIARISCBQSDggBEgIIBRICCAMSAggBGggIFDIECgIIAxIiSiAIARISCBQSDggBEgIIBRICCAMSAggBGggIFDIECgIIBBJUCAsQERgEIkxaSggDEiJKIAgBEhIIFBIOCAESAggFEgIIAxICCAEaCAgUMgQKAggBEiJKIAgBEhIIFBIOCAESAggFEgIIAxICCAEaCAgUMgQKAggCEhgIDBARGAQiEFoOCAISBBICCAsSBBICCAgSZwgNEBEYBCJfIl0KUQorEikIARICCAYSAggBEg0aCwgYMgcKBQjd5bR7EgIIARIKGggIGDIECgIIChIiSiAIARISCB0SDggBEgIIBRICCAoSAggDGggIHTIECgIIAxIICBEyBAoCCAASGAgOEB8YBCIQEg4IARICCAUSAggEEgIIAhIyCA8QERgEIipKKAgEEhIIHxIOCAESBgj+3cLgARICCAEaEBIOCAESBgj+3cLgARICCAMSNwgQEBEYBCIvEi0IARICCAYSAggBEg0aCwgYMgcKBQjdrbJ1EgIIARIOGgwIGDIICgYInKzQ+AESEwgREB8YBCILCB8yBwoFDQAANEISEwgSEB8YBCILCB8yBwoFDQAAcEESWwgTEB8YBCJTIlEKSQokUiIIARIeShwIARIICBgyBAoCCAAaDlIMCAISCBIGCAMSAggIEiEIH1odCAQSDQgGMgkKBwoFYSBiICsSBBICCBESBBICCBISBBICCBESLAgUEB8YBCIkIiIKEwoEEgIICRILCB8yBwoFDQAASEMSCwgfMgcKBQ0AAIJDEhMIFRAfGAQiCwgfMgcKBQ0AAFBAEkgIFhAfGAQiQAgfWjwIBBIPCAYyCwoJCgdhIGIgbWF4EiEIH1odCAQSDQgGMgkKBwoFYSBiIC8SBBICCA4SBBICCBUSBBICCBQSNwgXEB8YBCIvCB9aKwgEEg8IBjILCgkKB2EgYiBtYXgSEBIOCAESBgj+3cLgARICCAESBBICCBYSEwgYEB8YBCILCB8yBwoFDQAAcEISygEIGRAfGAQiwQEIH1q8AQgEEg8IBjILCgkKB2EgYiBtYXgSoAEIH1qbAQgEEg0IBjIJCgcKBWEgYiAtEoEBCB9afQgEEg0IBjIJCgcKBWEgYiAtEhASDggBEgIIBRICCAQSAggCElgIH1pUCAQSDQgGMgkKBwoFYSBiICoSLwgfWisIBBINCAYyCQoHCgVhIGIgLxILCB8yBwoFDQAAEEESCwgfMgcKBQ0AAIBBEhASDggBEgIIBRICCAQSAggBEgQSAggYEgQSAggUEiYIGhARGAQiHkocCAQSEggfEg4IARIGCP7dwuABEgIIARoEEgIIFBJECBsQERgEIjxaOggCEhASDggBEgYI/93C4AESAggWEiRSIggBEh5KHAgBEggIGDIECgIIABoOUgwIAhIIEgYIAxICCA8SRAgcEBEYBCI8WjoIAhIQEg4IARIGCP/dwuABEgIIGBIkUiIIARIeShwIARIICBgyBAoCCAAaDlIMCAISCBIGCAMSAggQEhwIHRAfGAQiFBISCAESAggEEgIIBBICCAESAggBEhMIHhAfGAQiCwgfMgcKBQ0AAChCEhMIHxAfGAQiCwgfMgcKBQ0AAIhCEhAIIBAlGAQiCAglMgQKAggVEhMIIRAfGAQiCwgfMgcKBQ2BleM/Eh8IIhARGAQiFxIVCAESAggDEgMI/gcSAggfEgQIk4seEhMIIxAfGAQiCwgfMgcKBQ1mZqY/EjwIJBAfGAQiNAgfWjAIBBINCAYyCQoHCgVhIGIgKhIQEg4IARIGCP7dwuABEgIIAxILCB8yBwoFDQAAYD8SPAglEB8YBCI0CB9aMAgEEg0IBjIJCgcKBWEgYiAqEhASDggBEgYI/t3C4AESAggDEgsIHzIHCgUNAAAAPxITCCYQHxgEIgsIHzIHCgUNAADSQxI1CCcQHxgEIi0IH1opCAQSDQgGMgkKBwoFYSBiIC0SEBIOCAESAggFEgIIBBICCAISBBICCBgSNwgoEB8YBCIvCB9aKwgEEg8IBjILCgkKB2EgYiBtaW4SEBIOCAESBgj+3cLgARICCAESBBICCCcSTwgpEB8YBCJHCB9aQwgEEg8IBjILCgkKB2EgYiBtYXgSIQgfWh0IBBINCAYyCQoHCgVhIGIgLRIEEgIIKBIEEgIIJhILCB8yBwoFDQAAAAASKQgqEB8YBCIhCB9aHQgEEg0IBjIJCgcKBWEgYiAqEgQSAggpEgQSAgghEisIKxAfGAQiIwgfWh8IBBIPCAYyCwoJCgdhIGIgbWluEgQSAggkEgQSAggqEn0ILBAfGAQidSJzCmQKP1o9CAISJVojCAISBBICCCISGUoXCAYSBggfEgIIJBoLCB8yBwoFDQAAAAASEkoQCAQSBggfEgIIKxoEEgIIJBIhCB9aHQgEEg0IBjIJCgcKBWEgYiAvEgQSAggrEgQSAggkEgsIHzIHCgUNAACAPxKcAQgtEBEYBCKTASKQAQpHCgQSAggiEj9aPQgCEiVKIwgGEhIIHxIOCAESBgj+3cLgARICCAMaCwgfMgcKBQ0AAAAAEhJKEAgHEgYIHxICCCsaBBICCCUSRUpDCAQSLQgfWikIBBINCAYyCQoHCgVhIGIgKhIQEg4IARIGCP7dwuABEgIIAxIEEgIIIxoQEg4IARIGCP7dwuABEgIIARJSCC4QERgEIkoiSApACiwSKggBEgIIBhICCAESDhoMCBgyCAoGCN2ki6kBEgIIARIKGggIGDIECgIICBIQEg4IARIGCP7dwuABEgIICBIEEgIILRIkCC8QERgEIhxaGggCEhBaDggCEgQSAggtEgQSAgguEgQSAggKEiQIMBgEIh4aHAoMCAESCAgqMgQKAggCCgwIAhIICCsyBAoCCAISJAgxGAQiHhocCgwIARIICCoyBAoCCAMKDAgCEggIKzIECgIIAxJFCDIQCxgEIj0aOwo5CICrn1ESMhowCggIARIEEgIIBAokCAISIFIeCAQSGhoYCggIARIEEgIIBAoMCAISCAgRMgQKAggAEkUIMxALGAQiPRo7CjkIgKufURIyGjAKCAgBEgQSAggFCiQIAhIgUh4IBBIaGhgKCAgBEgQSAggFCgwIAhIICBEyBAoCCAASdAg0EAsYBCJsGmoKaAjgqp9REmEaXwpdCAESWVpXCAESFBISCAMSAggGEgYI/8Ls2wESAggEEj0aOwo5CICrn1ESMhowCggIARIEEgIIBQokCAISIFIeCAQSGhoYCggIARIEEgIIBQoMCAISCAgRMgQKAggBEjsINRALGAQiMxoxCi8I4KqfURIoGiYKJAgBEiBaHggBEhQSEggDEgIIDBIGCP/C7NsBEgIIBBIEEgIIMxJsCDYQERgEImRaYggDEiZKJAgBEhYIMRISCAMSAggGEgYI/8Ls2wESAggOGggIMTIECgIIAxI2UjQIARIwUi4IARIqSigIARIICBgyBAoCCAAaGlIYCAISFBISCAMSAggGEgYI/8Ls2wESAggEEmwINxARGAQiZFpiCAMSJkokCAESFggxEhIIAxICCAwSBgj/wuzbARICCA4aCAgxMgQKAggDEjZSNAgBEjBSLggBEipKKAgBEggIGDIECgIIABoaUhgIAhIUEhIIAxICCAwSBgj/wuzbARICCAQSBAg4GAMSBgg5EDIYAxIGCDoQMBgDEgYIOxAyGAMSagg8GAQiZCJiClYKClIICAESBBICCDYSSEJGCDgSCBIGCAMSAggGGjYaNAoyCP/C7NsBEioIMEImCDoSEBIOCAMSAggGEgYI/8Ls2wEaDhoMCgoIBBIGCAsSAgg0IDsgORIIEgYIAxICCAYSBAg9GAMSBgg+EDIYAxIGCD8QMBgDEgYIQBAyGAMSaghBGAQiZCJiClYKClIICAESBBICCDcSSEJGCD0SCBIGCAMSAggMGjYaNAoyCP/C7NsBEioIMEImCD8SEBIOCAMSAggMEgYI/8Ls2wEaDhoMCgoIBBIGCAsSAgg1IEAgPhIIEgYIAxICCAwSkAEIQhgEIokBIoYBCmQKBBICCAwSXCJaClIKSlpICAISLVIrCAESJ0olCAESCAgYMgQKAggAGhdSFQgCEhESDwgBEgIIARIDCJUSEgIIEhIVEhMIARICCAESAwiVEhICCBISAggCEgQSAghBEgQSAgg8Eh4iHAoQCgQSAgguEggSBggDEgIIDBIIEgYIAxICCAYScghDEAsYBCJqImgKZgoVEhMIARICCAESAwiVEhICCA4SAggCEk0aSwpJCOCqn1ESQhpACj4IARI6WjgIARIcIhoKGAoQWg4IAxIEEgIICxIEEgIIDRIEEgIIBhIQIg4KDAoEEgIIDBIEEgIIMxIEEgIIMhIfCEQQERgEIhcSFQgBEgIIAxIDCP4HEgIIHxIECOnTHRIfCEUQHxgEIhciFQoTCgQSAghEEgsIHzIHCgUNAACAPxIYCEYQHxgEIhAiDgoMCgQSAghEEgQSAggeEh4IRxAfGAQiFiIUCgwKBBICCEQSBBICCB8SBBICCB4SBAhIGAMSBghJEBgYAxIGCEoQGBgDGIz3tbWrvsOEkgEg3bXTitvZo774ASonZG93bmxvYWRfYnV0dG9uLmVtbC1mZXwxMzUyNjFhZDcwMjU4NDM5Kj5lbmdhZ2VtZW50X3BhbmVsX2xhcmdlX3BsYXllcl9jb250cm9scy5lbWwtZmV8ZWFhNmUwNWM5MmU2ZWU3OCoqdmlkZW9fYWN0aW9uX2J1dHRvbi5lbWwtZmV8YTk2ZWNjYjY3ODZlYTMzKh1iYWRnZS5lbWwtZmV8NTI5MWNmZWFiY2UzOGIyZioQMzkwOTFlNTExOGZlZDNjYSoQODlkZmM4ZWNlNzI0ODY1OCoQZGNlNWIzYWFmYjY0NGQxNjAB";
                    const textEncoder = new TextEncoder();
                    const utf8 = new TextDecoder("utf-8", { fatal: true });
                    const schema = {
                        BrowseContent: [
                            [58173949, "singleColumnResultsRenderer", "SingleColumnResultsRenderer"],
                            [153515154, "elementRenderer", "ElementRenderer"],
                            [49399797, "sectionListRenderer", "SectionListRenderer"],
                        ],
                        SingleColumnResultsRenderer: [[1, "tabs", "BrowseTabSupportedRenderer", true]],
                        BrowseTabSupportedRenderer: [[58174010, "tabRenderer", "TabRenderer"]],
                        TabRenderer: [
                            [1, "endpoint", "TabEndpoint"],
                            [4, "content", "BrowseContent"],
                        ],
                        TabEndpoint: [[48687626, "browse", "TabBrowseEndpoint"]],
                        TabBrowseEndpoint: [[3, "params", "string"]],
                        ElementRenderer: [[172660663, "videoRendererContent", "VideoRendererContent"]],
                        VideoRendererContent: [
                            [1, "richItemContents", "VideoInfo", true],
                            [2, "renderInfo", "RenderInfo"],
                        ],
                        VideoInfo: [[168777401, "videoContext", "VideoContext"]],
                        VideoContext: [
                            [3, "layout", "ElementLayout"],
                            [5, "videoContent", "VideoContent"],
                        ],
                        ElementLayout: [[172035250, "layoutRender", "LayoutRender"]],
                        VideoContent: [
                            [413471385, "element", "ElementModel"],
                            [512694658, "smartSkipButton", "SmartSkipButton"],
                            [232954548, "videoLockup", "VideoLockup"],
                            [454362329, "sponsoredVideo", "bytes"],
                            [491441836, "sponsoredDisplay", "bytes"],
                        ],
                        ElementModel: [[1, "data", "ElementData"]],
                        ElementData: [[1829, "shoppingShelf", "bytes"]],
                        SmartSkipButton: [
                            [1, "actions", "SmartSkipActions"],
                            [13, "controller", "SmartSkipController"],
                            [17, "displayLimit", "uint"],
                        ],
                        SmartSkipActions: [[3, "items", "SmartSkipAction", true]],
                        SmartSkipAction: [[9, "displayLimit", "uint"]],
                        SmartSkipController: [[7, "promotionMode", "bool"]],
                        VideoLockup: [
                            [33, "attachments", "Attachment", true],
                            [34, "attachmentStateKey", "bytes"],
                        ],
                        Attachment: [[9, "products", "bytes", true]],
                        RenderInfo: [[183314536, "layoutRender", "LayoutRender"]],
                        LayoutRender: [[1, "eml", "string"]],
                        SectionListRenderer: [
                            [1, "sectionListSupportedRenderers", "SectionListSupportedRenderer", true],
                            [32, "promotedContents", "bytes", true],
                        ],
                        SectionListSupportedRenderer: [
                            [50195462, "itemSectionRenderer", "ItemSectionRenderer"],
                            [51845067, "shelfRenderer", "ShelfRenderer"],
                        ],
                        ItemSectionRenderer: [[1, "richItemContents", "RichItemContent", true]],
                        RichItemContent: [[153515154, "videoWithContextRenderer", "ElementRenderer"]],
                        ShelfRenderer: [[5, "richSectionContent", "RichSectionContent"]],
                        RichSectionContent: [[51431404, "reelShelfRenderer", "ReelShelfRenderer"]],
                        ReelShelfRenderer: [[1, "richItemContents", "RichItemContent", true]],
                        Next: [
                            [7, "content", "NextContent"],
                            [8, "onResponseReceivedAction", "BrowseContent"],
                            [14, "playerOverlays", "PlayerOverlays"],
                            [25, "engagementPanels", "EngagementPanel", true],
                            [777, "frameworkUpdates", "bytes"],
                        ],
                        EngagementPanel: [[138681066, "renderer", "EngagementPanelRenderer"]],
                        EngagementPanelRenderer: [[3, "content", "BrowseContent"]],
                        NextContent: [[51779735, "nextResult", "NextResult"]],
                        NextResult: [[1, "content", "BrowseContent"]],
                        PlayerOverlays: [[78882851, "renderer", "PlayerOverlayRenderer"]],
                        PlayerOverlayRenderer: [
                            [2, "overflowMenu", "bytes"],
                            [3, "related", "RelatedOverlay"],
                            [42, "overlayCollections", "OverlayCollection", true],
                        ],
                        OverlayCollection: [[401855120, "renderer", "OverlayCollectionRenderer"]],
                        OverlayCollectionRenderer: [[2, "overlays", "OverlayItem", true]],
                        OverlayItem: [[401855122, "content", "OverlayContent"]],
                        OverlayContent: [[1, "item", "RichItemContent"]],
                        RelatedOverlay: [[29209665, "contents", "RelatedOverlayContents"]],
                        RelatedOverlayContents: [[2, "contents", "RichItemContent", true]],
                        Player: [
                            [15, "playerConfig", "PlayerConfig"],
                            [60, "overlayCollections", "OverlayCollection", true],
                            [61, "paidPromotion", "bytes"],
                            [7, "adPlacements", "bytes", true],
                            [2, "playabilityStatus", "PlayabilityStatus"],
                            [9, "playbackTracking", "PlaybackTracking"],
                            [68, "adSlots", "bytes", true],
                        ],
                        PlayerConfig: [[1, "granularVariableSpeedConfig", "PlaybackSpeedConfig"]],
                        PlaybackSpeedConfig: [
                            [1, "minimumPlaybackRate", "uint"],
                            [2, "maximumPlaybackRate", "uint"],
                        ],
                        PlayabilityStatus: [
                            [21, "pictureInPictureRender", "PictureInPictureSupportedRenderer"],
                            [11, "backgroundPlayerRender", "BackgroundSupportedRenderer"],
                        ],
                        PictureInPictureSupportedRenderer: [[151635310, "pictureInPictureAbility", "PictureInPictureAbility"]],
                        PictureInPictureAbility: [
                            [1, "active", "bool"],
                            [4, "f4", "uint"],
                            [6, "f6", "uint"],
                            [8, "f8", "uint"],
                        ],
                        BackgroundSupportedRenderer: [[64657230, "backgroundAbility", "BackgroundAbility"]],
                        BackgroundAbility: [[1, "active", "bool"]],
                        PlaybackTracking: [[18, "pageadViewthroughconversion", "bytes"]],
                        WatchContent: [
                            [2, "player", "Player"],
                            [3, "next", "Next"],
                        ],
                        EncryptedResponsePart: [
                            [1, "encryptedContent", "bytes"],
                            [2, "hmac", "bytes"],
                            [3, "iv", "bytes"],
                            [4, "compressionAlgorithm", "uint"],
                        ],
                        OnesieInnertubeResponse: [[4, "contents", "WatchContent", true]],
                    };
                    const contentTypes = new Set([
                        "BrowseContent",
                        "BrowseTabSupportedRenderer",
                        "ElementRenderer",
                        "EngagementPanel",
                        "EngagementPanelRenderer",
                        "ItemSectionRenderer",
                        "Next",
                        "NextContent",
                        "NextResult",
                        "OnesieInnertubeResponse",
                        "OverlayCollection",
                        "OverlayCollectionRenderer",
                        "OverlayContent",
                        "OverlayItem",
                        "Player",
                        "PlayerOverlayRenderer",
                        "PlayerOverlays",
                        "ReelShelfRenderer",
                        "RelatedOverlay",
                        "RelatedOverlayContents",
                        "RichItemContent",
                        "RichSectionContent",
                        "SectionListRenderer",
                        "SectionListSupportedRenderer",
                        "ShelfRenderer",
                        "SingleColumnResultsRenderer",
                        "TabRenderer",
                        "VideoContent",
                        "VideoContext",
                        "VideoInfo",
                        "VideoLockup",
                        "VideoRendererContent",
                        "WatchContent",
                    ]);
                    const CONFIG_KEY = "YouTubeConfig";
                    const QUALITY_KEY = "YouTubeQuality";
                    function readConfig(key = CONFIG_KEY, limit = Infinity) {
                        const stored = $persistentStore.read(key);
                        if (typeof stored === "string" && stored.length > limit)
                            return {};
                        try {
                            const value = JSON.parse(stored || "{}");
                            return value && typeof value === "object" && !Array.isArray(value) ? value : {};
                        }
                        catch {
                            return {};
                        }
                    }
                    function writeConfig(config, key = CONFIG_KEY) {
                        return $persistentStore.write(JSON.stringify(config), key);
                    }
                    function concatBytes(chunks) {
                        const result = new Uint8Array(chunks.reduce((n, b) => n + b.length, 0));
                        let offset = 0;
                        for (const bytes of chunks) {
                            result.set(bytes, offset);
                            offset += bytes.length;
                        }
                        return result;
                    }
                    function sameBytes(a, b) {
                        return a === b || (a.length === b.length && a.every((value, i) => value === b[i]));
                    }
                    function varint(value) {
                        const bytes = [];
                        do {
                            bytes.push((value % 128) | (value > 127 ? 128 : 0));
                            value = Math.floor(value / 128);
                        } while (value);
                        return new Uint8Array(bytes);
                    }
                    function wireFields(bytes) {
                        const fields = [];
                        let offset = 0;
                        function read() {
                            let value = 0, scale = 1;
                            for (let i = 0; i < 5; i++) {
                                if (offset >= bytes.length)
                                    throw new Error("Truncated protobuf varint");
                                const byte = bytes[offset++];
                                value += (byte & 127) * scale;
                                if (!(byte & 128)) {
                                    if (value > 0xffffffff)
                                        throw new Error("Protobuf length/tag overflow");
                                    return value;
                                }
                                scale *= 128;
                            }
                            throw new Error("Invalid protobuf varint");
                        }
                        while (offset < bytes.length) {
                            const start = offset, tag = read(), no = Math.floor(tag / 8), wire = tag % 8;
                            if (!no)
                                throw new Error("Invalid protobuf field");
                            let payloadStart = offset;
                            if (wire === 2) {
                                const length = read();
                                payloadStart = offset;
                                offset += length;
                            }
                            else if (wire === 1)
                                offset += 8;
                            else if (wire === 5)
                                offset += 4;
                            else if (wire === 0) {
                                let count = 0, byte;
                                do {
                                    if (offset >= bytes.length || count++ === 10)
                                        throw new Error("Invalid protobuf integer");
                                    byte = bytes[offset++];
                                    if (count === 10 && byte > 1)
                                        throw new Error("Protobuf integer overflow");
                                } while (byte & 128);
                            }
                            else
                                throw new Error("Unsupported protobuf wire type " + wire);
                            if (offset > bytes.length)
                                throw new Error("Truncated protobuf field");
                            fields.push({
                                no,
                                wire,
                                data: bytes.subarray(payloadStart, offset),
                                raw: bytes.subarray(start, offset),
                            });
                        }
                        return fields;
                    }
                    function readInteger(bytes) {
                        let value = 0, scale = 1;
                        for (const byte of bytes) {
                            value += (byte & 127) * scale;
                            scale *= 128;
                        }
                        return value;
                    }
                    function readOptions(defaults = {}) {
                        return { ...defaults, ...parseArguments() };
                    }
                    function parseArguments() {
                        if (typeof $argument === "string") {
                            if (!$argument || $argument.includes("{{{"))
                                return {};
                            try {
                                return coerceValues(JSON.parse($argument));
                            }
                            catch {
                                return {};
                            }
                        }
                        if ($argument && typeof $argument === "object")
                            return coerceValues({ ...$argument });
                        return {};
                    }
                    function coerceValues(values) {
                        const result = {};
                        for (const [key, value] of Object.entries(values)) {
                            if (typeof value !== "string") {
                                result[key] = value;
                                continue;
                            }
                            const text = value.trim().toLowerCase();
                            if (text === "true")
                                result[key] = true;
                            else if (text === "false")
                                result[key] = false;
                            else if (text !== "" && !Number.isNaN(Number(text)))
                                result[key] = Number(text);
                            else
                                result[key] = value;
                        }
                        return result;
                    }
                    function platformKey(request) {
                        return Object.entries(request.headers ?? {}).some(([name, value]) => name.toLowerCase() === "user-agent" && /music/i.test(value))
                            ? "youtubeMusic"
                            : "youtube";
                    }
                    function keyCandidates(stored) {
                        if (!stored)
                            return [];
                        return [stored, ...(Array.isArray(stored.previous) ? stored.previous.slice(0, 3) : [])].filter((pair) => pair &&
                            typeof pair.clientKey === "string" &&
                            typeof pair.encryptKey === "string" &&
                            pair.clientKey.length > 0 &&
                            pair.clientKey.length <= 5500 &&
                            pair.encryptKey.length > 0 &&
                            pair.encryptKey.length <= 5500);
                    }
                    function clearKeys(platform, expected) {
                        if (platform === undefined || expected === undefined)
                            return;
                        const config = readConfig();
                        if (!Object.hasOwn(config, platform))
                            return;
                        const current = config[platform];
                        const snapshot = expected;
                        if (JSON.stringify(current) === JSON.stringify(snapshot)) {
                            delete config[platform];
                            return writeConfig(config);
                        }
                    }
                    function numberValue(bytes) {
                        const value = readInteger(bytes);
                        if (!Number.isSafeInteger(value))
                            throw new Error("Unsafe decoded integer");
                        return value;
                    }
                    function decodeBase64(value) {
                        const normalized = value.replace(/[-_\s=]/g, (character) => (character === "-" ? "+" : character === "_" ? "/" : ""));
                        const partial = normalized.length % 4 === 1;
                        const bytes = Uint8Array.fromBase64(partial ? normalized + "A" : normalized);
                        return partial ? bytes.subarray(0, -1) : bytes;
                    }
                    const QUALITY_LIMIT = 64 * 1024;
                    function validQuality(value) {
                        const record = value;
                        return !!(record &&
                            typeof record === "object" &&
                            !Array.isArray(record) &&
                            Number.isInteger(record.height) &&
                            record.height > 0 &&
                            record.height <= 0x7fffffff &&
                            Array.isArray(record.itags) &&
                            record.itags.length > 0 &&
                            record.itags.length <= 256 &&
                            record.itags.every((itag) => Number.isInteger(itag) && itag > 0 && itag <= 0xffffffff) &&
                            new Set(record.itags).size === record.itags.length &&
                            (record.premiumItags === undefined ||
                                (Array.isArray(record.premiumItags) &&
                                    record.premiumItags.length <= record.itags.length &&
                                    new Set(record.premiumItags).size === record.premiumItags.length &&
                                    record.premiumItags.every((itag) => record.itags.includes(itag)))));
                    }
                    function sameQuality(a, b) {
                        return (a !== undefined &&
                            a.height === b.height &&
                            a.itags.length === b.itags.length &&
                            b.itags.every((itag) => a.itags.includes(itag)) &&
                            (a.premiumItags?.length ?? 0) === (b.premiumItags?.length ?? 0) &&
                            (b.premiumItags ?? []).every((itag) => a.premiumItags?.includes(itag)));
                    }
                    function cacheQuality(players) {
                        if (!players.length)
                            return;
                        const streams = players
                            .map((player) => unknownFields(player).find((field) => field.no === 4 && field.wire === 2)?.data)
                            .filter(Boolean);
                        if (!streams.length)
                            return;
                        let stored;
                        try {
                            stored = readConfig(QUALITY_KEY, QUALITY_LIMIT);
                        }
                        catch (error) {
                            console.log("YouTube quality read: " + error);
                            return;
                        }
                        const cache = Object.create(null);
                        let changed = false;
                        const keys = Object.keys(stored);
                        if (keys.length > 16)
                            changed = true;
                        for (const id of keys.slice(-16)) {
                            const record = stored[id];
                            if (id.length > 256 || !validQuality(record)) {
                                changed = true;
                                continue;
                            }
                            cache[id] = { height: record.height, itags: record.itags };
                            if (record.premiumItags?.length)
                                cache[id].premiumItags = record.premiumItags;
                            if (Object.keys(record).length !== Object.keys(cache[id]).length)
                                changed = true;
                        }
                        for (const stream of streams) {
                            try {
                                const fields = wireFields(stream);
                                const url = fields.find((field) => field.no === 15 && field.wire === 2);
                                const match = url && /[?&]id=([^&]+)/.exec(utf8.decode(url.data));
                                if (!match)
                                    continue;
                                const id = decodeURIComponent(match[1]), quality = { height: 0, itags: [] };
                                if (id.length > 256)
                                    continue;
                                const itags = new Set();
                                let overflow = false;
                                for (const field of fields) {
                                    if (field.no !== 3 || field.wire !== 2)
                                        continue;
                                    const format = wireFields(field.data);
                                    const mime = format.find((field) => field.no === 5 && field.wire === 2);
                                    if (!mime || !utf8.decode(mime.data).startsWith("video/"))
                                        continue;
                                    const value = (no) => {
                                        const field = format.find((field) => field.no === no && field.wire === 0);
                                        return field ? numberValue(field.data) : 0;
                                    };
                                    const height = Math.min(value(7), value(8)), itag = value(1);
                                    if (!itag || !height || height > 0x7fffffff || height < quality.height)
                                        continue;
                                    if (height > quality.height) {
                                        quality.height = height;
                                        quality.itags = [];
                                        delete quality.premiumItags;
                                        itags.clear();
                                        overflow = false;
                                    }
                                    if (overflow || itags.has(itag))
                                        continue;
                                    if (itags.size === 256) {
                                        overflow = true;
                                        continue;
                                    }
                                    itags.add(itag);
                                    quality.itags.push(itag);
                                    const label = format.find((field) => field.no === 26 && field.wire === 2);
                                    if (label && /\bPremium\b/i.test(utf8.decode(label.data)))
                                        (quality.premiumItags ??= []).push(itag);
                                }
                                if (overflow || !validQuality(quality) || sameQuality(cache[id], quality))
                                    continue;
                                delete cache[id];
                                cache[id] = quality;
                                changed = true;
                            }
                            catch (error) {
                                console.log("YouTube quality metadata: " + error);
                            }
                        }
                        if (changed) {
                            const keys = Object.keys(cache);
                            for (const key of keys.slice(0, Math.max(0, keys.length - 16)))
                                delete cache[key];
                            try {
                                let serialized = JSON.stringify(cache);
                                while (textEncoder.encode(serialized).length > QUALITY_LIMIT) {
                                    delete cache[Object.keys(cache)[0]];
                                    serialized = JSON.stringify(cache);
                                }
                                if (!$persistentStore.write(serialized, QUALITY_KEY))
                                    console.log("YouTube quality write failed");
                            }
                            catch (error) {
                                console.log("YouTube quality cache: " + error);
                            }
                        }
                    }
                    const AI_PANEL = textEncoder.encode("PAyouchat");
                    const AI_SUMMARY = textEncoder.encode("ai_summary_");
                    function aiPathMatches(bytes, path, target = AI_PANEL, prefix = false) {
                        if (!path.length)
                            return prefix ? sameBytes(bytes.subarray(0, target.length), target) : sameBytes(bytes, target);
                        return wireFields(bytes).some((field) => field.no === path[0] && field.wire === 2 && aiPathMatches(field.data, path.slice(1), target, prefix));
                    }
                    function rewriteAiFields(bytes, no, transform) {
                        let changed = false;
                        const chunks = wireFields(bytes).flatMap((field) => {
                            if (field.no !== no || field.wire !== 2)
                                return [field.raw];
                            const data = transform(field.data);
                            if (data && sameBytes(data, field.data))
                                return [field.raw];
                            changed = true;
                            return data ? [encodeField([no, "", "bytes"], data)] : [];
                        });
                        return changed ? concatBytes(chunks) : bytes;
                    }
                    function removeAiActionBar(bytes) {
                        return rewriteAiFields(bytes, 1, (button) => aiPathMatches(button, [10, 461054335, 4, 169495254, 138681778, 1])
                            ? undefined
                            : rewriteBinaryPath(button, [10, 37098], (menu) => rewriteAiFields(menu, 3, (item) => aiPathMatches(item, [489973921, 997, 3, 3, 169495254, 138681778, 1]) ? undefined : item)));
                    }
                    function removeAiQuickActions(bytes) {
                        return rewriteAiFields(bytes, 10, (button) => aiPathMatches(button, [15, 461054335, 4, 169495254, 138681778, 1])
                            ? undefined
                            : rewriteBinaryPath(button, [6], (menu) => rewriteAiFields(menu, 3, (item) => aiPathMatches(item, [4, 16, 461054335, 4, 169495254, 138681778, 1]) ? undefined : item)));
                    }
                    function removeAiCarousel(bytes) {
                        return rewriteBinaryPath(bytes, [1], (carousel) => {
                            const fields = wireFields(carousel);
                            const headers = fields.filter((field) => field.no === 1 && field.wire === 2);
                            const cards = fields.filter((field) => field.no === 2 && field.wire === 2);
                            if (headers.length !== cards.length)
                                return carousel;
                            const removed = new Set();
                            cards.forEach((card, index) => {
                                if (aiPathMatches(card.data, [8, 2, 169495254, 138681778, 1])) {
                                    removed.add(card);
                                    removed.add(headers[index]);
                                }
                            });
                            return removed.size ? concatBytes(fields.filter((field) => !removed.has(field)).map((field) => field.raw)) : carousel;
                        });
                    }
                    function isAiOnlyCarousel(object) {
                        try {
                            return unknownFields(object).some((field) => {
                                if (field.no !== 408379376 || field.wire !== 2)
                                    return false;
                                const bodies = wireFields(field.data).filter((field) => field.no === 1 && field.wire === 2);
                                if (bodies.length !== 1)
                                    return false;
                                const fields = wireFields(bodies[0].data);
                                const headers = fields.filter((field) => field.no === 1 && field.wire === 2);
                                const cards = fields.filter((field) => field.no === 2 && field.wire === 2);
                                return (cards.length > 0 &&
                                    cards.length === headers.length &&
                                    cards.every((card) => aiPathMatches(card.data, [8, 2, 169495254, 138681778, 1])));
                            });
                        }
                        catch {
                            return false;
                        }
                    }
                    function removeAiElement(bytes) {
                        return rewriteBinaryPath(bytes, [153515154, 172660663, 1, 168777401, 5], (content) => {
                            let result = rewriteAiFields(content, 386137609, removeAiQuickActions);
                            result = rewriteBinaryPath(result, [413471385, 1], (data) => rewriteAiFields(data, 2185, removeAiActionBar));
                            return rewriteAiFields(result, 408379376, removeAiCarousel);
                        });
                    }
                    function removeAiSummary(bytes) {
                        const result = rewriteAiFields(bytes, 45, (key) => (aiPathMatches(key, [], AI_SUMMARY, true) ? undefined : key));
                        return rewriteBinaryPath(result, [1, 19, 1, 1, 4, 424915055, 1], (playback) => rewriteAiFields(playback, 31, (command) => aiPathMatches(command, [1, 204158123, 194114827, 1], AI_SUMMARY, true) ? undefined : command));
                    }
                    function removeAi(object) {
                        let changed = false;
                        try {
                            const next = object;
                            if (next.engagementPanels?.length) {
                                const keep = next.engagementPanels.filter((panel) => {
                                    const renderer = panel.renderer;
                                    return (!renderer ||
                                        !unknownFields(renderer).some((field) => field.no === 1 && field.wire === 2 && sameBytes(field.data, AI_PANEL)));
                                });
                                changed = setField(next, "engagementPanels", keep) || changed;
                                for (const panel of keep) {
                                    if (!panel.renderer)
                                        continue;
                                    changed =
                                        rewriteUnknownField(panel.renderer, 10, (footer) => aiPathMatches(footer, [
                                            260791572, 1, 153515154, 172660663, 1, 168777401, 5, 413471385, 1, 2553, 997, 3, 3, 170382688, 1, 169495254,
                                            138681778, 1,
                                        ])
                                            ? undefined
                                            : footer) || changed;
                                }
                            }
                            if (next.playerOverlays?.renderer)
                                changed = rewriteUnknownField(next.playerOverlays.renderer, 37, removeAiElement) || changed;
                            changed =
                                rewriteUnknownField(object, 216561405, (metadata) => rewriteBinaryPath(metadata, [1], removeAiElement)) || changed;
                            changed = rewriteUnknownField(object, 386137609, removeAiQuickActions) || changed;
                            changed = rewriteUnknownField(object, 408379376, removeAiCarousel) || changed;
                            const content = object;
                            if (content.element?.data)
                                changed = rewriteUnknownField(content.element.data, 2185, removeAiActionBar) || changed;
                            if (content.videoLockup)
                                changed = rewriteUnknownField(content.videoLockup, 18, removeAiSummary) || changed;
                            if (object.videoContent?.videoLockup)
                                changed =
                                    rewriteUnknownField(object, 6, (bindings) => rewriteBinaryPath(bindings, [188490103], (collection) => rewriteAiFields(collection, 1, (binding) => aiPathMatches(binding, [1], AI_SUMMARY, true) ? undefined : binding))) || changed;
                        }
                        catch (error) {
                            console.log("YouTube AI controls: " + error);
                        }
                        return changed;
                    }
                    function bytesField(bytes, number, unique = false) {
                        let first;
                        for (const field of wireFields(bytes)) {
                            if (field.no !== number || field.wire !== 2)
                                continue;
                            if (!unique)
                                return field.data;
                            if (first)
                                return;
                            first = field.data;
                        }
                        return first;
                    }
                    function nativeField(no, value) {
                        return encodeField([no, "", typeof value === "number" ? "uint" : typeof value === "string" ? "string" : "bytes"], value);
                    }
                    function nativePath(path, value) {
                        for (let i = path.length - 1; i >= 0; i--)
                            value = nativeField(path[i], value);
                        return value;
                    }
                    function binaryAt(bytes, path) {
                        let current = bytes;
                        for (const no of path) {
                            current = bytesField(current, no, true);
                            if (!current)
                                return;
                        }
                        return current;
                    }
                    const ON_THE_GO_ID = "on-the-go";
                    const ON_THE_GO_MENU_ID = "/youtube/app/player_overflow_menu/menu_item_on_the_go";
                    const MENU_MODEL_PATH = [153515154, 172660663, 1, 168777401, 5, 407694004];
                    const MENU_CONTEXT_PATH = [153515154, 172660663, 1, 168777401];
                    function panelIdentifier(panel) {
                        if (!panel.renderer)
                            return;
                        const fields = unknownFields(panel.renderer);
                        const structured = fields.find((f) => f.no === 18 && f.wire === 2);
                        const id = (structured && binaryAt(structured.data, [3])) ?? fields.find((f) => f.no === 1 && f.wire === 2)?.data;
                        return id && utf8.decode(id);
                    }
                    function onTheGoAction() {
                        const state = "/youtube/app/on_the_go_menu_trigger_state";
                        return nativeField(170382688, concatBytes([
                            nativePath([1, 241780379, 1], 1),
                            nativePath([1, 169495254, 423731020], new Uint8Array()),
                            nativePath([1, 169495254, 204158123, 170382688], concatBytes([
                                nativePath([1, 170382720], concatBytes([nativeField(1, state), nativeField(2, concatBytes([nativeField(1, state), nativeField(2, 1)]))])),
                                nativePath([1, 169495254, 138681778, 10], concatBytes([nativeField(1, 1), nativeField(3, ON_THE_GO_ID)])),
                            ])),
                        ]));
                    }
                    function onTheGoButton(icon, label, command, id) {
                        return nativeField(461054335, concatBytes([
                            nativeField(2, icon),
                            nativeField(4, command),
                            nativeField(5, label),
                            ...(id ? [nativeField(17, "id.player_controls." + id + ".button")] : [nativeField(28, 1), nativeField(29, 1)]),
                        ]));
                    }
                    function makeOnTheGoPanel(message, sourceItem, template, speedCommand) {
                        const nextResult = message.content?.nextResult;
                        if (!nextResult)
                            return;
                        const raw = unknownFields(nextResult).find((f) => f.no === 4 && f.wire === 2);
                        const metadata = raw && binaryAt(raw.data, [61479009]);
                        const endpoint = unknownFields(message).find((f) => f.no === 9 && f.wire === 2);
                        const video = endpoint && binaryAt(endpoint.data, [48687757, 1]);
                        const metadataVideo = metadata && binaryAt(metadata, [17]);
                        const title = metadata && binaryAt(metadata, [1, 1, 1]);
                        const author = metadata && binaryAt(metadata, [10, 1, 1]);
                        const thumbnails = metadata && bytesField(metadata, 2, true);
                        if (!video ||
                            !metadataVideo ||
                            !sameBytes(video, metadataVideo) ||
                            !/^[\w-]{11}$/.test(utf8.decode(video)) ||
                            !title ||
                            !thumbnails)
                            return;
                        const context = binaryAt(sourceItem, MENU_CONTEXT_PATH);
                        const theme = context && binaryAt(context, [6, 386334485, 1, 1, 1]);
                        const capabilities = context && binaryAt(context, [6, 386334486, 1, 1]);
                        if (!theme || !capabilities)
                            return;
                        const transport = [
                            [1, 6, 176991, "youtube_fill_experimental/skip_previous_24pt", "Previous video", "previous"],
                            [2, 4, 176993, "youtube_outline_experimental/skip10_back_24pt", "Rewind", "seek.backward"],
                            [3, 3, 176994, "youtube_outline_experimental/skip10_forward_24pt", "Fast forward", "seek.forward"],
                            [4, 5, 176988, "youtube_fill_experimental/skip_next_24pt", "Next video", "next"],
                        ];
                        const panelTarget = concatBytes([nativeField(1, 1), nativeField(3, ON_THE_GO_ID)]);
                        const thumbnailModel = concatBytes(wireFields(thumbnails).map((field) => {
                            if (field.no !== 1 || field.wire !== 2)
                                return field.raw;
                            return nativeField(1, concatBytes(wireFields(field.data).map((part) => part.wire === 0 && (part.no === 2 || part.no === 3) ? nativeField(part.no + 2, numberValue(part.data)) : part.raw)));
                        }));
                        const models = [
                            nativePath([1, 1], title),
                            ...(author ? [nativeField(2, author)] : []),
                            nativePath([3, 2329], concatBytes([
                                ...transport.map(([no, action, ve, icon, label, id]) => nativeField(no, onTheGoButton(icon, label, nativePath([169495254, 327511066], concatBytes([nativeField(1, action), nativeField(2, ve)])), id))),
                                nativeField(5, "Play"),
                                nativeField(6, "Pause"),
                                nativeField(7, "Replay"),
                            ])),
                            nativeField(5, thumbnailModel),
                            nativeField(6, onTheGoButton("youtube_outline_experimental/headset_24pt", "Switch to audio mode", nativePath([169495254, 300135747, 2], panelTarget))),
                            nativeField(12, onTheGoButton("youtube_outline_experimental/video_24pt", "Switch to video mode", nativePath([169495254, 300413109, 2], panelTarget))),
                        ];
                        if (speedCommand)
                            models.push(nativeField(9, onTheGoButton("youtube_outline_experimental/speedometer_24pt", "Playback speed", speedCommand)));
                        const chapters = message.engagementPanels
                            .map(panelIdentifier)
                            .find((id) => id === "engagement-panel-macro-markers-auto-chapters" || id === "engagement-panel-macro-markers-description-chapters");
                        if (chapters)
                            models.push(nativeField(8, onTheGoButton("youtube_outline_experimental/view_list_24pt", "Chapters", nativePath([169495254, 138681778], concatBytes([
                                nativeField(3, ON_THE_GO_ID),
                                nativeField(10, concatBytes([nativeField(1, 1), nativeField(3, chapters)])),
                            ])))));
                        const subscriptions = [
                            nativeField(1, concatBytes([nativeField(1, "/youtube/app/engagement_panel"), nativeField(2, 470855422), nativeField(3, 470855422)])),
                            nativeField(1, concatBytes([nativeField(1, "/youtube/app/player_overlay"), nativeField(2, 470855423), nativeField(3, 470855423)])),
                            ...[
                                ["menu_trigger", 14],
                                ["audio_only", 18],
                            ].map(([name, no]) => nativeField(1, concatBytes([
                                nativeField(1, "/youtube/app/on_the_go_" + name + "_state"),
                                nativeField(3, 1),
                                nativeField(3, 2325),
                                nativeField(3, Number(no)),
                            ]))),
                            nativeField(2, 413471385),
                        ];
                        const bindings = concatBytes([
                            nativeField(188490103, concatBytes(subscriptions)),
                            nativeField(212323971, concatBytes([nativeField(1, 413471385), nativeField(2, 5)])),
                            nativeField(386334485, concatBytes([nativeField(1, concatBytes([nativePath([1, 1], theme), nativeField(2, 4)])), nativeField(2, 413471385)])),
                            nativeField(386334486, concatBytes([
                                nativeField(1, concatBytes([nativeField(1, capabilities), nativeField(2, 6)])),
                                nativeField(2, 413471385),
                            ])),
                        ]);
                        return codec("EngagementPanel").fromBinary(nativeField(138681066, concatBytes([
                            nativePath([2, 138681548, 1, 1, 1], "On-the-go"),
                            nativePath([3, 49399797, 1, 50195462, 1, 153515154, 172660663], concatBytes([
                                nativePath([1, 168777401], concatBytes([
                                    nativePath([3, 172035250, 1], template),
                                    nativePath([5, 413471385, 1, 2325], concatBytes(models)),
                                    nativeField(6, bindings),
                                ])),
                                nativePath([2, 183314536, 1], template),
                            ])),
                            nativeField(5, 282218),
                            nativeField(6, 1),
                            nativeField(15, 1),
                            nativeField(17, 3),
                            nativeField(18, panelTarget),
                            nativeField(20, 1),
                            nativeField(21, 2),
                            nativeField(21, 1),
                            nativeField(36, 2),
                        ])));
                    }
                    function enableOnTheGo(message) {
                        const overlay = message.playerOverlays?.renderer;
                        if (!overlay?.overflowMenu || !Array.isArray(message.engagementPanels))
                            return false;
                        if (message.engagementPanels.some((p) => panelIdentifier(p) === ON_THE_GO_ID))
                            return false;
                        const menu = binaryAt(overlay.overflowMenu, [66439850]);
                        if (!menu)
                            return false;
                        const fields = wireFields(menu);
                        let source, speed;
                        let insertion = fields.length;
                        for (const [index, item] of fields.entries()) {
                            if (item.no !== 1 || item.wire !== 2)
                                continue;
                            const model = binaryAt(item.data, MENU_MODEL_PATH);
                            const state = model && bytesField(model, 10, true);
                            if (!model || !state)
                                continue;
                            const id = utf8.decode(state);
                            if (id === ON_THE_GO_MENU_ID)
                                return false;
                            if (id.endsWith("/menu_item_additional_settings"))
                                insertion = index;
                            source ??= item.data;
                            if (id.endsWith("/menu_item_playback_speed")) {
                                const commands = binaryAt(model, [4, 4, 170382688]);
                                if (commands)
                                    for (const command of wireFields(commands))
                                        if (command.no === 1 && binaryAt(command.data, [169495254, 443434441]))
                                            speed = command.data;
                            }
                        }
                        if (!source)
                            return false;
                        const resources = prepareOnTheGoResources(message);
                        if (!resources)
                            return false;
                        const panel = makeOnTheGoPanel(message, source, resources.template, speed);
                        if (!panel)
                            return false;
                        let entry = rewriteBinaryPath(source, MENU_MODEL_PATH, (model) => concatBytes([
                            ...wireFields(model)
                                .filter((f) => [1, 2, 13, 17].includes(f.no))
                                .map((f) => f.raw),
                            nativeField(4, concatBytes([
                                nativeField(2, "youtube_outline_experimental/headset_24pt"),
                                nativeField(3, "On-the-go"),
                                nativeField(4, onTheGoAction()),
                            ])),
                            nativeField(10, ON_THE_GO_MENU_ID),
                            nativeField(12, 1),
                        ]));
                        entry = rewriteBinaryPath(entry, [...MENU_CONTEXT_PATH, 6, 188490103, 1, 1], () => textEncoder.encode(ON_THE_GO_MENU_ID));
                        entry = rewriteBinaryPath(entry, [153515154, 3, 396644439, 1], () => textEncoder.encode("menu_item_on_the_go"));
                        const chunks = fields.map((field) => field.raw);
                        chunks.splice(insertion, 0, nativeField(1, entry));
                        const output = rewriteBinaryPath(overlay.overflowMenu, [66439850], () => concatBytes(chunks));
                        setField(message, "frameworkUpdates", resources.framework);
                        setField(message, "engagementPanels", [...message.engagementPanels, panel]);
                        return setField(overlay, "overflowMenu", output);
                    }
                    function onTheGoResourceId(update) {
                        const resource = binaryAt(update, [196886555]) ?? binaryAt(update, [426171394]);
                        const id = resource && bytesField(resource, 1, true);
                        return id && utf8.decode(id);
                    }
                    function bindTemplateReferences(bytes, replacements, depth = 0) {
                        for (const [before, after] of replacements)
                            if (sameBytes(bytes, before))
                                return after;
                        if (depth === 96)
                            return bytes;
                        let fields;
                        try {
                            fields = wireFields(bytes);
                        }
                        catch {
                            return bytes;
                        }
                        let changed = false;
                        const chunks = fields.map((field) => {
                            if (field.wire !== 2)
                                return field.raw;
                            const data = bindTemplateReferences(field.data, replacements, depth + 1);
                            if (data === field.data)
                                return field.raw;
                            changed = true;
                            return nativeField(field.no, data);
                        });
                        return changed ? concatBytes(chunks) : bytes;
                    }
                    function prepareOnTheGoResources(message) {
                        if (unknownFields(message).some((field) => field.no === 777))
                            return;
                        const framework = message.frameworkUpdates;
                        const updates = framework && binaryAt(framework, [2]);
                        if (!updates)
                            return;
                        const available = new Set(), defined = new Set();
                        for (const field of wireFields(updates)) {
                            if (field.no !== 1 || field.wire !== 2)
                                continue;
                            const id = onTheGoResourceId(field.data);
                            if (id) {
                                available.add(id);
                                defined.add(id);
                            }
                            const report = binaryAt(field.data, [328964737]);
                            if (!report)
                                continue;
                            for (const item of wireFields(report)) {
                                if (item.no !== 1 || item.wire !== 2)
                                    continue;
                                const name = binaryAt(item.data, [1]);
                                const status = wireFields(item.data).find((f) => f.no === 2 && f.wire === 0);
                                if (name && status && [1, 2].includes(numberValue(status.data)))
                                    available.add(utf8.decode(name));
                            }
                        }
                        const bundled = wireFields(decodeBase64(ON_THE_GO_RESOURCES_BASE64));
                        const bundledIds = new Set(bundled.map((field) => onTheGoResourceId(field.data)));
                        const missing = [];
                        let template = ON_THE_GO_BUNDLE_TEMPLATE;
                        for (const entry of bundled) {
                            let resource = binaryAt(entry.data, [196886555]);
                            let id = onTheGoResourceId(entry.data);
                            const replacements = [];
                            for (const dep of wireFields(resource).filter((f) => f.no === 5 && f.wire === 2)) {
                                const name = utf8.decode(dep.data);
                                if (bundledIds.has(name) || available.has(name))
                                    continue;
                                const prefix = name.slice(0, name.indexOf("|") + 1);
                                const matches = prefix ? [...available].filter((value) => value.startsWith(prefix)) : [];
                                if (matches.length !== 1)
                                    return;
                                replacements.push([dep.data, textEncoder.encode(matches[0])]);
                            }
                            if (replacements.length) {
                                resource = bindTemplateReferences(resource, replacements);
                                if (replacements.some(([before]) => containsMarker(resource, before)))
                                    return;
                                const bound = binaryAt(resource, [2]);
                                let hash = 2166136261;
                                for (const byte of bound)
                                    hash = Math.imul(hash ^ byte, 16777619);
                                id = id.split("|")[0] + "|" + (hash >>> 0).toString(16);
                                resource = concatBytes(wireFields(resource).flatMap((field) => {
                                    if (field.no === 4)
                                        return [];
                                    if (field.no === 1 && field.wire === 2)
                                        return [nativeField(1, id)];
                                    return [field.raw];
                                }));
                                if (onTheGoResourceId(entry.data) === template)
                                    template = id;
                            }
                            if (!defined.has(id))
                                missing.push(nativePath([1, 196886555], resource));
                        }
                        return {
                            template,
                            framework: missing.length ? rewriteBinaryPath(framework, [2], () => concatBytes([updates, ...missing])) : framework,
                        };
                    }
                    const AD_LAYOUT = /^(?:inline_injection_entrypoint_layout|video_display_button_group_layout|full_width_portrait_image_layout|full_width_square_image_layout|video_display_full_buttoned_layout)\.eml(?:-js)?(?:-fe)?$/;
                    const SHOPPING_LAYOUT = /^(?:shopping_|products?_in_video_)[a-z0-9_]+\.eml(?:-js)?(?:-fe)?$/;
                    const AD_TRACKING = textEncoder.encode("/pagead/");
                    const GAME_CARD = textEncoder.encode("mini_game_card.eml");
                    const STORE_CARD = textEncoder.encode("shopping_item_card_list.eml");
                    const STORE_TAB = textEncoder.encode("store");
                    const LIVE_BADGE = textEncoder.encode("youtube_outline_experimental/live_24pt");
                    const IMMERSIVE_LIVE = textEncoder.encode("immersive_live");
                    const PREMIUM_BROWSE_ID = textEncoder.encode("SPunlimited");
                    function containsMarker(bytes, marker = AD_TRACKING) {
                        if (!marker.length)
                            return true;
                        const end = bytes.length - marker.length;
                        let probes = 0, windowStart = 0;
                        for (let i = bytes.indexOf(marker[0]); i >= 0 && i <= end; i = bytes.indexOf(marker[0], i + 1)) {
                            let matched = true;
                            for (let j = 1; j < marker.length; j++)
                                if (bytes[i + j] !== marker[j]) {
                                    matched = false;
                                    break;
                                }
                            if (matched)
                                return true;
                            if (++probes === 8) {
                                if (i - windowStart < 256)
                                    return scanMarkerTail(bytes, marker, i + 1);
                                windowStart = i;
                                probes = 0;
                            }
                        }
                        return false;
                    }
                    function scanMarkerTail(bytes, marker, start) {
                        outer: for (let i = start; i <= bytes.length - marker.length; i++) {
                            for (let j = 0; j < marker.length; j++)
                                if (bytes[i + j] !== marker[j])
                                    continue outer;
                            return true;
                        }
                        return false;
                    }
                    function hasVerticalLiveTarget(lockup) {
                        let bytes = unknownFields(lockup).find((field) => field.no === 18 && field.wire === 2)?.data;
                        try {
                            for (const no of [4, 169495254, 462702848, 1, 139608561, 50, 7, 3]) {
                                if (!bytes)
                                    return false;
                                bytes = wireFields(bytes).find((field) => field.no === no && field.wire === 2)?.data;
                            }
                            return !!bytes && sameBytes(bytes, IMMERSIVE_LIVE);
                        }
                        catch {
                            return false;
                        }
                    }
                    function isStoreTab(item) {
                        const params = item.tabRenderer?.endpoint?.browse?.params;
                        if (!params)
                            return false;
                        try {
                            const target = wireFields(decodeBase64(decodeURIComponent(params))).find((field) => field.no === 2 && field.wire === 2);
                            return !!target && sameBytes(target.data, STORE_TAB);
                        }
                        catch {
                            return false;
                        }
                    }
                    function isPremiumBanner(bytes) {
                        const path = [2, 11, 1, 4, 170382656, 1, 169495254, 48687626, 2];
                        function matches(bytes, depth) {
                            if (depth === path.length)
                                return sameBytes(bytes, PREMIUM_BROWSE_ID);
                            const fields = wireFields(bytes).filter((field) => field.no === path[depth] && field.wire === 2);
                            return (depth === 5 || fields.length === 1) && fields.some((field) => matches(field.data, depth + 1));
                        }
                        try {
                            return matches(bytes, 0);
                        }
                        catch {
                            return false;
                        }
                    }
                    function isBlockedObject(object, blockGames, blockVerticalLive, blockStore) {
                        const layout = object.layoutRender?.eml?.split("|")[0];
                        if ((layout && (AD_LAYOUT.test(layout) || (blockStore && SHOPPING_LAYOUT.test(layout)))) ||
                            (blockStore && object.shoppingShelf) ||
                            object.sponsoredVideo ||
                            object.sponsoredDisplay ||
                            (blockVerticalLive && object.videoLockup && hasVerticalLiveTarget(object.videoLockup)))
                            return true;
                        return unknownFields(object).some((field) => field.wire === 2 &&
                            (containsMarker(field.data) ||
                                (field.no === 325515470 && isPremiumBanner(field.data)) ||
                                (blockStore && field.no === 400157044) ||
                                field.no === 455507059 ||
                                (blockVerticalLive && field.no === 519005951 && containsMarker(field.data, LIVE_BADGE)) ||
                                (field.no === 312131490 &&
                                    ((blockGames && containsMarker(field.data, GAME_CARD)) || (blockStore && containsMarker(field.data, STORE_CARD))))));
                    }
                    function transformContent(message, { blockGames = true, blockVerticalLive = false, jumpAhead = true, blockStore = true, blockAi = true, onTheGo = true } = {}) {
                        let changed = transformMenus(message);
                        if (onTheGo)
                            try {
                                changed = enableOnTheGo(message) || changed;
                            }
                            catch (error) {
                                console.log("YouTube On-the-go: " + error);
                            }
                        const BLOCKED = 1, EMPTY = 2;
                        const filtered = new Set(["richItemContents", "overlays"]);
                        const pruned = new Set(["richItemContents", "contents", "sectionListSupportedRenderers", "overlayCollections"]);
                        const wrappers = new Set([
                            "videoWithContextRenderer",
                            "videoRendererContent",
                            "itemSectionRenderer",
                            "shelfRenderer",
                            "richSectionContent",
                            "reelShelfRenderer",
                            "renderer",
                            "content",
                            "item",
                        ]);
                        function visit(object, classify = false) {
                            if (!object || typeof object !== "object" || ArrayBuffer.isView(object))
                                return 0;
                            if (Array.isArray(object)) {
                                let flags = 0;
                                for (const child of object)
                                    flags |= visit(child, classify) & BLOCKED;
                                return flags;
                            }
                            let blocked = classify &&
                                (isBlockedObject(object, blockGames, blockVerticalLive, blockStore) || (blockAi && isAiOnlyCarousel(object)));
                            const layout = object.renderInfo?.layoutRender?.eml?.split("|")[0];
                            let empty = !!layout && (AD_LAYOUT.test(layout) || (blockStore && SHOPPING_LAYOUT.test(layout)));
                            if (classify && (blocked || empty))
                                return BLOCKED;
                            if (blockAi)
                                changed = removeAi(object) || changed;
                            const state = object[wireState];
                            for (const name of Object.keys(object)) {
                                if (!classify && state?.deferred) {
                                    const spec = schema[state.type].find(([, key]) => key === name);
                                    if (spec &&
                                        !contentTypes.has(spec[2]) &&
                                        !filtered.has(name) &&
                                        !pruned.has(name) &&
                                        name !== "promotedContents" &&
                                        !(blockStore && (name === "tabs" || name === "attachments")))
                                        continue;
                                }
                                const child = object[name];
                                if (!child || typeof child !== "object" || ArrayBuffer.isView(child))
                                    continue;
                                if (!Array.isArray(child)) {
                                    const flags = visit(child, classify);
                                    if (classify && flags & BLOCKED)
                                        return BLOCKED;
                                    blocked = !!(flags & BLOCKED) || blocked;
                                    if (flags & EMPTY && wrappers.has(name))
                                        empty = true;
                                    continue;
                                }
                                let keep;
                                const filterItems = filtered.has(name), pruneItems = pruned.has(name);
                                const filterTabs = blockStore && name === "tabs", filterAttachments = blockStore && name === "attachments";
                                const filterPromoted = name === "promotedContents";
                                for (let index = 0; index < child.length; index++) {
                                    const item = child[index];
                                    const direct = (filterTabs && isStoreTab(item)) ||
                                        (filterAttachments && item.products?.length) ||
                                        (filterPromoted && containsMarker(item));
                                    const flags = direct && !classify ? 0 : visit(item, classify || filterItems);
                                    if (classify && flags & BLOCKED)
                                        return BLOCKED;
                                    blocked = !!(flags & BLOCKED) || blocked;
                                    const remove = direct || (filterItems && flags & BLOCKED) || (pruneItems && flags & EMPTY);
                                    if (remove)
                                        keep ??= child.slice(0, index);
                                    else if (keep)
                                        keep.push(item);
                                }
                                if (keep) {
                                    setField(object, name, keep);
                                    changed = true;
                                    if (!keep.length && (filterItems || pruneItems))
                                        empty = true;
                                }
                                if (blockStore && name === "attachments" && !(keep ?? child).length && object.attachmentStateKey !== undefined)
                                    changed = removeField(object, "attachmentStateKey") || changed;
                            }
                            if (jumpAhead && object.smartSkipButton)
                                changed = unlockJumpAhead(object.smartSkipButton) || changed;
                            return (blocked ? BLOCKED : 0) | (empty ? EMPTY : 0);
                        }
                        visit(message);
                        return changed;
                    }
                    function unlockJumpAhead(button) {
                        let changed = false;
                        const controller = button.controller;
                        if (controller?.promotionMode === true) {
                            setField(controller, "promotionMode", false);
                            changed = true;
                        }
                        if (button.actions?.items?.length)
                            for (const target of [button, ...button.actions.items]) {
                                if (target.displayLimit === 0x7fffffff)
                                    continue;
                                setField(target, "displayLimit", 0x7fffffff);
                                changed = true;
                            }
                        return changed;
                    }
                    function transformMenus(message) {
                        const overlay = message.playerOverlays?.renderer;
                        if (!overlay?.overflowMenu)
                            return false;
                        try {
                            const menu = unlockSpeedMenu(overlay.overflowMenu);
                            const changed = !sameBytes(menu, overlay.overflowMenu);
                            if (changed)
                                setField(overlay, "overflowMenu", menu);
                            return changed;
                        }
                        catch (error) {
                            console.log("YouTube speed menu: " + error);
                            return false;
                        }
                    }
                    function unlockSpeedMenu(bytes) {
                        const upsell = textEncoder.encode("PApremium_upsell");
                        return rewriteBinaryPath(bytes, [
                            66439850, 1, 153515154, 172660663, 1, 168777401, 5, 407694004, 4, 4, 170382688, 1, 169495254, 443434441, 1, 1,
                            441573002, 4, 153515154, 172660663, 1, 168777401, 5, 413471385, 1, 1602,
                        ], (selector) => {
                            const fields = wireFields(selector);
                            const maximum = fields.find((field) => field.no === 5 && field.wire === 5);
                            if (!maximum)
                                return selector;
                            const rate = new DataView(maximum.data.buffer, maximum.data.byteOffset, 4).getFloat32(0, true);
                            if (!(rate > 0))
                                return selector;
                            let expanded = selector;
                            if (rate < 4) {
                                const limit = new Uint8Array(4);
                                new DataView(limit.buffer).setFloat32(0, 4, true);
                                expanded = concatBytes(fields.map((field) => (field === maximum ? concatBytes([varint(45), limit]) : field.raw)));
                            }
                            return rewriteBinaryPath(expanded, [10, 1674], (preset) => {
                                const fields = wireFields(preset);
                                const keep = fields.filter((field) => field.no !== 3 || field.wire !== 2 || !containsMarker(field.data, upsell));
                                return keep.length === fields.length ? preset : concatBytes(keep.map((field) => field.raw));
                            });
                        });
                    }
                    function transformPlayer(player, parameters) {
                        let changed = transformContent(player, parameters);
                        changed = removeField(player, "paidPromotion") || changed;
                        for (const name of ["adPlacements", "adSlots"])
                            if (player[name]?.length) {
                                setField(player, name, []);
                                changed = true;
                            }
                        const speed = player.playerConfig?.granularVariableSpeedConfig;
                        if (speed?.maximumPlaybackRate !== undefined && speed.maximumPlaybackRate > 0 && speed.maximumPlaybackRate < 400) {
                            setField(speed, "maximumPlaybackRate", 400);
                            changed = true;
                        }
                        if (player.playbackTracking)
                            changed = removeField(player.playbackTracking, "pageadViewthroughconversion") || changed;
                        const status = player.playabilityStatus;
                        if (status) {
                            const pip = status.pictureInPictureRender ?? {};
                            setField(status, "pictureInPictureRender", pip);
                            const ability = pip.pictureInPictureAbility ?? {};
                            setField(pip, "pictureInPictureAbility", ability);
                            changed = setField(ability, "active", true) || changed;
                            changed = setField(ability, "f4", 0) || changed;
                            changed = setField(ability, "f6", 0) || changed;
                            changed = setField(ability, "f8", 1) || changed;
                            const background = status.backgroundPlayerRender ?? {};
                            setField(status, "backgroundPlayerRender", background);
                            const backgroundAbility = background.backgroundAbility ?? {};
                            setField(background, "backgroundAbility", backgroundAbility);
                            changed = setField(backgroundAbility, "active", true) || changed;
                        }
                        return changed;
                    }
                    function removeField(message, name) {
                        if (message[name] === undefined)
                            return false;
                        delete message[name];
                        if (message[wireState])
                            markChanged(message[wireState], name);
                        return true;
                    }
                    function transformWatch(message, parameters) {
                        let changed = false;
                        for (const content of message.contents) {
                            if (content.player)
                                changed = transformPlayer(content.player, parameters) || changed;
                            if (content.next)
                                changed = transformContent(content.next, parameters) || changed;
                        }
                        return changed;
                    }
                    const fieldSpecs = Object.create(null);
                    const wireState = Symbol("wireState");
                    function markChanged(state, name) {
                        while (state) {
                            (state.changed ??= new Set()).add(name);
                            name = state.parentName;
                            state = state.parent;
                        }
                    }
                    function readField(field, depth, state) {
                        const [, name, kind] = field.spec;
                        return kind === "bytes"
                            ? field.data
                            : kind === "string"
                                ? utf8.decode(field.data)
                                : kind === "bool"
                                    ? numberValue(field.data) !== 0
                                    : kind === "uint"
                                        ? numberValue(field.data)
                                        : decodeMessage(kind, field.data, depth + 1, state, name);
                    }
                    function decodeMessage(type, bytes, depth = 0, parent, parentName) {
                        if (depth > 64)
                            throw new Error("Protobuf nesting limit");
                        const message = {}, fields = wireFields(bytes);
                        const counts = fields.length > 1 ? new Map() : null;
                        const state = { bytes, fields, parent, parentName };
                        const specs = (fieldSpecs[type] ??= new Map(schema[type].map((spec) => [spec[0], spec])));
                        Object.defineProperty(message, wireState, { value: state });
                        for (const [, name, , repeated] of schema[type])
                            if (repeated)
                                message[name] = [];
                        if (counts)
                            for (const field of fields) {
                                const spec = specs.get(field.no);
                                if (!spec || field.wire !== (spec[2] === "bool" || spec[2] === "uint" ? 0 : 2))
                                    continue;
                                field.spec = spec;
                                if (!spec[3])
                                    counts.set(spec[1], (counts.get(spec[1]) ?? 0) + 1);
                            }
                        let lazyNames;
                        for (const field of fields) {
                            const spec = counts ? field.spec : specs.get(field.no);
                            if (!spec || field.wire !== (spec[2] === "bool" || spec[2] === "uint" ? 0 : 2))
                                continue;
                            field.spec = spec;
                            const [, name, kind, repeated] = spec;
                            if (!repeated && (counts?.get(name) ?? 0) > 1) {
                                delete field.spec;
                                continue;
                            }
                            if (schema[kind] && !contentTypes.has(kind)) {
                                if (lazyNames?.has(name))
                                    continue;
                                (lazyNames ??= new Set()).add(name);
                                const records = fields.filter((candidate) => candidate.spec?.[1] === name);
                                state.type = type;
                                state.deferred = true;
                                Object.defineProperty(message, name, {
                                    enumerable: true,
                                    configurable: true,
                                    get() {
                                        const value = repeated
                                            ? records.map((record) => readField(record, depth, state))
                                            : readField(records[0], depth, state);
                                        Object.defineProperty(message, name, {
                                            value,
                                            enumerable: true,
                                            writable: true,
                                            configurable: true,
                                        });
                                        return value;
                                    },
                                });
                            }
                            else {
                                const value = readField(field, depth, state);
                                if (repeated)
                                    message[name].push(value);
                                else
                                    message[name] = value;
                            }
                        }
                        return message;
                    }
                    function setField(message, name, value) {
                        const previous = message[name];
                        const same = Array.isArray(previous) && Array.isArray(value)
                            ? previous.length === value.length && previous.every((item, i) => item === value[i])
                            : previous === value;
                        if (same)
                            return false;
                        message[name] = value;
                        if (message[wireState])
                            markChanged(message[wireState], name);
                        return true;
                    }
                    function encodeField(spec, value) {
                        const [no, , kind] = spec, wire = kind === "bool" || kind === "uint" ? 0 : 2;
                        const data = kind === "bytes"
                            ? value
                            : kind === "string"
                                ? textEncoder.encode(value)
                                : kind === "bool"
                                    ? varint(value ? 1 : 0)
                                    : kind === "uint"
                                        ? varint(value)
                                        : encodeMessage(kind, value);
                        return concatBytes(wire === 2 ? [varint(no * 8 + wire), varint(data.length), data] : [varint(no * 8), data]);
                    }
                    function encodeMessage(type, message) {
                        const state = message[wireState];
                        if (state && !state.changed)
                            return state.bytes;
                        const chunks = [], remaining = new Map(), handled = new Set();
                        const identity = (value, kind) => (schema[kind] ? (value[wireState]?.bytes ?? value) : value);
                        function values(spec) {
                            const [, name, , repeated] = spec;
                            return repeated ? (message[name] ?? []) : message[name] === undefined ? [] : [message[name]];
                        }
                        for (const spec of schema[type]) {
                            const [, name, kind, repeated] = spec;
                            if (!repeated || !state?.changed?.has(name))
                                continue;
                            remaining.set(name, new Map(values(spec).map((value) => [identity(value, kind), value])));
                        }
                        for (const field of state?.fields ?? []) {
                            if (!field.spec || !state.changed.has(field.spec[1])) {
                                chunks.push(field.raw);
                                continue;
                            }
                            const [, name, kind, repeated] = field.spec;
                            handled.add(name);
                            if (repeated) {
                                const pending = remaining.get(name);
                                if (!pending.has(field.data))
                                    continue;
                                const value = pending.get(field.data);
                                pending.delete(field.data);
                                chunks.push(!schema[kind] || !value[wireState]?.changed ? field.raw : encodeField(field.spec, value));
                            }
                            else {
                                const value = message[name];
                                if (value !== undefined)
                                    chunks.push(identity(value, kind) === field.data && (!schema[kind] || !value[wireState]?.changed)
                                        ? field.raw
                                        : encodeField(field.spec, value));
                            }
                        }
                        for (const spec of schema[type]) {
                            const [, name, , repeated] = spec;
                            if (state && !state.changed.has(name))
                                continue;
                            if (repeated && remaining.has(name)) {
                                for (const value of remaining.get(name).values())
                                    chunks.push(encodeField(spec, value));
                            }
                            else if (!handled.has(name))
                                for (const value of values(spec))
                                    chunks.push(encodeField(spec, value));
                        }
                        const output = concatBytes(chunks);
                        return state && sameBytes(output, state.bytes) ? state.bytes : output;
                    }
                    function codec(type) {
                        return {
                            fromBinary: (bytes) => decodeMessage(type, bytes),
                            toBinary: (message) => encodeMessage(type, message),
                        };
                    }
                    const EMPTY_FIELDS = [];
                    function unknownFields(message) {
                        const state = message[wireState];
                        if (!state)
                            return EMPTY_FIELDS;
                        if (state.unknown)
                            return state.unknown;
                        if (!state.fields.length || (state.fields.length === 1 && state.fields[0].spec))
                            return EMPTY_FIELDS;
                        let unknown;
                        for (const field of state.fields)
                            if (!field.spec)
                                (unknown ??= []).push(field);
                        return (state.unknown = unknown ?? EMPTY_FIELDS);
                    }
                    function rewriteUnknownField(message, no, transform) {
                        let edits;
                        for (const field of unknownFields(message)) {
                            if (field.no !== no || field.wire !== 2)
                                continue;
                            const data = transform(field.data);
                            if (data && sameBytes(data, field.data))
                                continue;
                            (edits ??= []).push({ field, data });
                        }
                        if (!edits)
                            return false;
                        const state = message[wireState];
                        for (const { field, data } of edits) {
                            if (data) {
                                field.data = data;
                                field.raw = encodeField([no, "", "bytes"], data);
                            }
                            else {
                                state.fields.splice(state.fields.indexOf(field), 1);
                            }
                        }
                        state.unknown = undefined;
                        markChanged(state, "");
                        return true;
                    }
                    function rewriteBinaryPath(bytes, path, transform) {
                        if (!path.length)
                            return transform(bytes);
                        let changed = false;
                        const chunks = wireFields(bytes).map((field) => {
                            if (field.no !== path[0] || field.wire !== 2)
                                return field.raw;
                            const data = rewriteBinaryPath(field.data, path.slice(1), transform);
                            if (sameBytes(data, field.data))
                                return field.raw;
                            changed = true;
                            return encodeField([field.no, "", "bytes"], data);
                        });
                        return changed ? concatBytes(chunks) : bytes;
                    }
                    class UmpReader {
                        constructor(buffer) {
                            this.buffer = buffer;
                            this.offset = 0;
                        }
                        readByte() {
                            if (this.offset >= this.buffer.length)
                                throw new Error("Truncated UMP header");
                            return this.buffer[this.offset++];
                        }
                        readVarint() {
                            const first = this.readByte();
                            let size = 5;
                            for (let candidate = 1; candidate < 5; candidate++) {
                                if (!(first & (128 >> (candidate - 1)))) {
                                    size = candidate;
                                    break;
                                }
                            }
                            let bits = size === 5 ? 0 : 8 - size;
                            let value = size === 5 ? 0 : first & ((1 << bits) - 1);
                            for (let index = 1; index < size; index++, bits += 8)
                                value += this.readByte() * 2 ** bits;
                            return value;
                        }
                        readPart() {
                            const start = this.offset;
                            const type = this.readVarint(), length = this.readVarint();
                            if (length > this.buffer.length - this.offset)
                                throw new Error(`Truncated UMP payload: type=${type}, offset=${this.offset}, expected=${length}, available=${this.buffer.length - this.offset}`);
                            const data = this.buffer.subarray(this.offset, this.offset + length);
                            this.offset += length;
                            return {
                                type,
                                data,
                                originalData: data,
                                raw: this.buffer.subarray(start, this.offset),
                            };
                        }
                        get hasNext() {
                            return this.offset < this.buffer.length;
                        }
                    }
                    class UmpWriter {
                        constructor(capacity = 1024) {
                            this.buffer = new Uint8Array(capacity);
                            this.length = 0;
                        }
                        ensureCapacity(length) {
                            if (this.length + length <= this.buffer.length)
                                return;
                            const buffer = new Uint8Array(Math.max(this.buffer.length * 2, this.length + length));
                            buffer.set(this.buffer);
                            this.buffer = buffer;
                        }
                        writeByte(value) {
                            this.ensureCapacity(1);
                            this.buffer[this.length++] = value & 255;
                        }
                        writeVarint(value) {
                            if (!Number.isInteger(value) || value < 0 || value > 0xffffffff)
                                throw new Error("Invalid UMP integer");
                            const size = value < 128 ? 1 : value < 16384 ? 2 : value < 2097152 ? 3 : value < 268435456 ? 4 : 5;
                            if (size === 1)
                                return this.writeByte(value);
                            if (size === 5)
                                this.writeByte(240);
                            else
                                this.writeByte((256 - (256 >> (size - 1))) | (value & ((1 << (8 - size)) - 1)));
                            for (let index = 1, shift = size === 5 ? 0 : 8 - size; index < size; index++, shift += 8)
                                this.writeByte(Math.floor(value / 2 ** shift));
                        }
                        writePart({ type, data }) {
                            this.writeVarint(type);
                            this.writeVarint(data.length);
                            this.ensureCapacity(data.length);
                            this.buffer.set(data, this.length);
                            this.length += data.length;
                        }
                        finish() {
                            return this.buffer.subarray(0, this.length);
                        }
                    }
                    async function transformUmp(body, keys, options) {
                        let contexts;
                        const envelopeCodec = codec("EncryptedResponsePart");
                        const contentCodec = codec("OnesieInnertubeResponse");
                        const reader = new UmpReader(body), chunks = [];
                        const players = [];
                        let changed = false;
                        let rewriteNextPart = false;
                        async function rewritePayload(bytes) {
                            const part = envelopeCodec.fromBinary(bytes);
                            if (!(part.encryptedContent instanceof Uint8Array) || part.iv?.length !== 16 || part.hmac?.length !== 32)
                                throw new Error("Malformed encrypted UMP envelope");
                            if ((part.compressionAlgorithm ?? 0) > 1)
                                throw new Error("Unsupported UMP compression");
                            if (!contexts) {
                                const { CryptoContext } = createUmpPrimitives();
                                contexts = keys.map((key) => new CryptoContext(key));
                            }
                            let decrypted;
                            let crypto;
                            for (const candidate of contexts) {
                                try {
                                    decrypted = candidate.decrypt(part);
                                    crypto = candidate;
                                    break;
                                }
                                catch (error) {
                                    if (error.message !== "HMAC verification failed")
                                        throw error;
                                }
                            }
                            if (!decrypted || !crypto)
                                throw new Error("HMAC verification failed");
                            const gzipped = decrypted[0] === 31 && decrypted[1] === 139;
                            if (part.compressionAlgorithm === 1 && !gzipped)
                                throw new Error("Invalid UMP gzip payload");
                            const plaintext = gzipped ? await transformGzip(decrypted, true) : decrypted;
                            const content = contentCodec.fromBinary(plaintext);
                            if (options.autoHd !== false)
                                for (const item of content.contents)
                                    if (item.player)
                                        players.push(item.player);
                            if (!transformWatch(content, options))
                                return bytes;
                            const output = contentCodec.toBinary(content);
                            if (sameBytes(output, plaintext))
                                return bytes;
                            const compressed = gzipped ? await transformGzip(output, false) : output;
                            const encrypted = crypto.encrypt(compressed);
                            setField(part, "encryptedContent", encrypted.encryptedContent);
                            setField(part, "hmac", encrypted.hmac);
                            return envelopeCodec.toBinary(part);
                        }
                        while (reader.hasNext) {
                            const part = reader.readPart();
                            if (part.type === 10) {
                                const type = wireFields(part.data).find((field) => field.no === 1 && field.wire === 0);
                                rewriteNextPart = !!type && numberValue(type.data) === 25;
                            }
                            else if (part.type === 11 && rewriteNextPart) {
                                part.data = await rewritePayload(part.data);
                                rewriteNextPart = false;
                            }
                            if (part.data === part.originalData)
                                chunks.push(part.raw);
                            else {
                                changed = true;
                                const writer = new UmpWriter(part.data.length + 10);
                                writer.writePart(part);
                                chunks.push(writer.finish());
                            }
                        }
                        return { body: changed ? concatBytes(chunks) : body, players };
                    }
                    async function transformGzip(bytes, decompress) {
                        const stream = decompress ? new DecompressionStream("gzip") : new CompressionStream("gzip");
                        const reader = stream.readable.getReader();
                        const writer = stream.writable.getWriter();
                        const reading = (async () => {
                            const chunks = [];
                            let length = 0;
                            while (true) {
                                const { value, done } = await reader.read();
                                if (done)
                                    break;
                                length += value.length;
                                if (decompress && length > 16 * 1024 * 1024)
                                    throw new Error("UMP decompression exceeds 16 MiB");
                                chunks.push(value);
                            }
                            return concatBytes(chunks);
                        })();
                        const writing = (async () => {
                            await writer.write(bytes);
                            await writer.close();
                        })();
                        try {
                            return (await Promise.all([reading, writing]))[0];
                        }
                        catch (error) {
                            await Promise.allSettled([reader.cancel(error), writer.abort(error)]);
                            throw error;
                        }
                        finally {
                            reader.releaseLock();
                            writer.releaseLock();
                        }
                    }
                    function createUmpPrimitives() {
                        function abytes(value, ...lengths) {
                            if (!(value instanceof Uint8Array || (ArrayBuffer.isView(value) && value.constructor.name === "Uint8Array")))
                                throw new Error("Uint8Array expected");
                            if (lengths.length && !lengths.includes(value.length))
                                throw new Error("Invalid byte length: " + value.length);
                        }
                        function u32(arr) {
                            return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
                        }
                        function clean(...arrays) {
                            for (const array of arrays)
                                array.fill(0);
                        }
                        function isAligned32(bytes) {
                            return bytes.byteOffset % 4 === 0;
                        }
                        function copyBytes(bytes) {
                            return Uint8Array.from(bytes);
                        }
                        if (new Uint8Array(new Uint32Array([287454020]).buffer)[0] !== 68)
                            throw new Error("Non little-endian hardware is not yet supported");
                        var BLOCK_SIZE = 16, BLOCK_SIZE32 = 4;
                        var POLY = 283;
                        function mul2(n) {
                            return (n << 1) ^ (POLY & -(n >> 7));
                        }
                        function mul(a, b) {
                            let res = 0;
                            for (; b > 0; b >>= 1)
                                ((res ^= a & -(b & 1)), (a = mul2(a)));
                            return res;
                        }
                        var sbox = (() => {
                            let t = new Uint8Array(256);
                            for (let i = 0, x2 = 1; i < 256; i++, x2 ^= mul2(x2))
                                t[i] = x2;
                            let box = new Uint8Array(256);
                            box[0] = 99;
                            for (let i = 0; i < 255; i++) {
                                let x2 = t[255 - i];
                                ((x2 |= x2 << 8), (box[t[i]] = (x2 ^ (x2 >> 4) ^ (x2 >> 5) ^ (x2 >> 6) ^ (x2 >> 7) ^ 99) & 255));
                            }
                            return (clean(t), box);
                        })();
                        var rotr32_8 = (n) => (n << 24) | (n >>> 8), rotl32_8 = (n) => (n << 8) | (n >>> 24);
                        function genTtable(sbox2, fn2) {
                            if (sbox2.length !== 256)
                                throw new Error("Wrong sbox length");
                            let T0 = new Uint32Array(256).map((_2, j) => fn2(sbox2[j])), T1 = T0.map(rotl32_8), T2 = T1.map(rotl32_8), T3 = T2.map(rotl32_8), T01 = new Uint32Array(256 * 256), T23 = new Uint32Array(256 * 256), sbox22 = new Uint16Array(256 * 256);
                            for (let i = 0; i < 256; i++)
                                for (let j = 0; j < 256; j++) {
                                    let idx = i * 256 + j;
                                    ((T01[idx] = T0[i] ^ T1[j]), (T23[idx] = T2[i] ^ T3[j]), (sbox22[idx] = (sbox2[i] << 8) | sbox2[j]));
                                }
                            return { sbox2: sbox22, T01, T23 };
                        }
                        var tableEncoding = genTtable(sbox, (s) => (mul(s, 3) << 24) | (s << 16) | (s << 8) | mul(s, 2));
                        var xPowers = (() => {
                            let p2 = new Uint8Array(16);
                            for (let i = 0, x2 = 1; i < 16; i++, x2 = mul2(x2))
                                p2[i] = x2;
                            return p2;
                        })();
                        function expandKeyLE(key) {
                            abytes(key);
                            let len = key.length;
                            if (![16, 24, 32].includes(len))
                                throw new Error("aes: invalid key size, should be 16, 24 or 32, got " + len);
                            let { sbox2 } = tableEncoding, toClean = [];
                            isAligned32(key) || toClean.push((key = copyBytes(key)));
                            let k32 = u32(key), Nk = k32.length, subByte = (n) => applySbox(sbox2, n, n, n, n), xk = new Uint32Array(len + 28);
                            xk.set(k32);
                            for (let i = Nk; i < xk.length; i++) {
                                let t = xk[i - 1];
                                (i % Nk === 0 ? (t = subByte(rotr32_8(t)) ^ xPowers[i / Nk - 1]) : Nk > 6 && i % Nk === 4 && (t = subByte(t)),
                                    (xk[i] = xk[i - Nk] ^ t));
                            }
                            return (clean(...toClean), xk);
                        }
                        function apply0123(T01, T23, s0, s1, s2, s3) {
                            return T01[((s0 << 8) & 65280) | ((s1 >>> 8) & 255)] ^ T23[((s2 >>> 8) & 65280) | ((s3 >>> 24) & 255)];
                        }
                        function applySbox(sbox2, s0, s1, s2, s3) {
                            return sbox2[(s0 & 255) | (s1 & 65280)] | (sbox2[((s2 >>> 16) & 255) | ((s3 >>> 16) & 65280)] << 16);
                        }
                        function encrypt(xk, s0, s1, s2, s3) {
                            let { sbox2, T01, T23 } = tableEncoding, k = 0;
                            ((s0 ^= xk[k++]), (s1 ^= xk[k++]), (s2 ^= xk[k++]), (s3 ^= xk[k++]));
                            let rounds = xk.length / 4 - 2;
                            for (let i = 0; i < rounds; i++) {
                                let t02 = xk[k++] ^ apply0123(T01, T23, s0, s1, s2, s3), t12 = xk[k++] ^ apply0123(T01, T23, s1, s2, s3, s0), t22 = xk[k++] ^ apply0123(T01, T23, s2, s3, s0, s1), t32 = xk[k++] ^ apply0123(T01, T23, s3, s0, s1, s2);
                                ((s0 = t02), (s1 = t12), (s2 = t22), (s3 = t32));
                            }
                            let t0 = xk[k++] ^ applySbox(sbox2, s0, s1, s2, s3), t1 = xk[k++] ^ applySbox(sbox2, s1, s2, s3, s0), t2 = xk[k++] ^ applySbox(sbox2, s2, s3, s0, s1), t3 = xk[k++] ^ applySbox(sbox2, s3, s0, s1, s2);
                            return { s0: t0, s1: t1, s2: t2, s3: t3 };
                        }
                        function ctrCounter(xk, nonce, src) {
                            (abytes(nonce, BLOCK_SIZE), abytes(src));
                            let srcLen = src.length;
                            const dst = new Uint8Array(srcLen);
                            let ctr2 = nonce, c32 = u32(ctr2), { s0, s1, s2, s3 } = encrypt(xk, c32[0], c32[1], c32[2], c32[3]), src32 = u32(src), dst32 = u32(dst);
                            for (let i = 0; i + 4 <= src32.length; i += 4) {
                                ((dst32[i + 0] = src32[i + 0] ^ s0),
                                    (dst32[i + 1] = src32[i + 1] ^ s1),
                                    (dst32[i + 2] = src32[i + 2] ^ s2),
                                    (dst32[i + 3] = src32[i + 3] ^ s3));
                                let carry = 1;
                                for (let i2 = ctr2.length - 1; i2 >= 0; i2--)
                                    ((carry = (carry + (ctr2[i2] & 255)) | 0), (ctr2[i2] = carry & 255), (carry >>>= 8));
                                ({ s0, s1, s2, s3 } = encrypt(xk, c32[0], c32[1], c32[2], c32[3]));
                            }
                            let start = BLOCK_SIZE * Math.floor(src32.length / BLOCK_SIZE32);
                            if (start < srcLen) {
                                let b32 = new Uint32Array([s0, s1, s2, s3]), buf = new Uint8Array(b32.buffer);
                                for (let i = start, pos = 0; i < srcLen; i++, pos++)
                                    dst[i] = src[i] ^ buf[pos];
                                clean(b32);
                            }
                            return dst;
                        }
                        function aesCtr(expandedKey, nonce, input) {
                            const counter = copyBytes(nonce);
                            const source = isAligned32(input) ? input : copyBytes(input);
                            try {
                                return ctrCounter(expandedKey, counter, source);
                            }
                            finally {
                                clean(counter);
                                if (source !== input)
                                    clean(source);
                            }
                        }
                        function createView2(arr) {
                            return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
                        }
                        function rotr(word, shift) {
                            return (word << (32 - shift)) | (word >>> shift);
                        }
                        function Chi(a, b, c) {
                            return (a & b) ^ (~a & c);
                        }
                        function Maj(a, b, c) {
                            return (a & b) ^ (a & c) ^ (b & c);
                        }
                        const SHA256_IV = Uint32Array.from([
                            1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225,
                        ]);
                        var SHA256_K = Uint32Array.from([
                            1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401,
                            607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628,
                            770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711,
                            113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037,
                            2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616,
                            659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424,
                            2428436474, 2756734187, 3204031479, 3329325298,
                        ]), SHA256_W = new Uint32Array(64), SHA256 = class {
                            constructor() {
                                this.length = 0;
                                this.pos = 0;
                                this.buffer = new Uint8Array(64);
                                this.view = createView2(this.buffer);
                                this.set(SHA256_IV[0], SHA256_IV[1], SHA256_IV[2], SHA256_IV[3], SHA256_IV[4], SHA256_IV[5], SHA256_IV[6], SHA256_IV[7]);
                            }
                            update(data) {
                                const { view, buffer } = this;
                                const len = data.length;
                                for (let pos = 0; pos < len;) {
                                    const take = Math.min(64 - this.pos, len - pos);
                                    if (take === 64) {
                                        const dataView = createView2(data);
                                        for (; 64 <= len - pos; pos += 64)
                                            this.process(dataView, pos);
                                        continue;
                                    }
                                    buffer.set(data.subarray(pos, pos + take), this.pos);
                                    this.pos += take;
                                    pos += take;
                                    if (this.pos === 64) {
                                        this.process(view, 0);
                                        this.pos = 0;
                                    }
                                }
                                this.length += data.length;
                                clean(SHA256_W);
                                return this;
                            }
                            digest() {
                                const { buffer, view, pos } = this;
                                buffer[pos] = 128;
                                buffer.fill(0, pos + 1);
                                if (pos >= 56) {
                                    this.process(view, 0);
                                    buffer.fill(0);
                                }
                                view.setBigUint64(56, BigInt(this.length * 8), false);
                                this.process(view, 0);
                                const output = new Uint8Array(32);
                                const outputView = createView2(output);
                                const { A, B, C, D, E, F, G, H } = this;
                                const state = [A, B, C, D, E, F, G, H];
                                for (let i = 0; i < 8; i++)
                                    outputView.setUint32(4 * i, state[i], false);
                                this.set(0, 0, 0, 0, 0, 0, 0, 0);
                                clean(buffer);
                                return output;
                            }
                            set(A, B, C, D2, E2, F, G, H2) {
                                this.A = A | 0, this.B = B | 0, this.C = C | 0, this.D = D2 | 0, this.E = E2 | 0, this.F = F | 0, this.G = G | 0, this.H = H2 | 0;
                            }
                            process(view, offset) {
                                for (let i = 0; i < 16; i++, offset += 4)
                                    SHA256_W[i] = view.getUint32(offset, !1);
                                for (let i = 16; i < 64; i++) {
                                    let W15 = SHA256_W[i - 15], W2 = SHA256_W[i - 2], s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3), s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
                                    SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
                                }
                                let { A, B, C, D: D2, E: E2, F, G, H: H2 } = this;
                                for (let i = 0; i < 64; i++) {
                                    let sigma1 = rotr(E2, 6) ^ rotr(E2, 11) ^ rotr(E2, 25), T1 = (H2 + sigma1 + Chi(E2, F, G) + SHA256_K[i] + SHA256_W[i]) | 0, T2 = ((rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22)) + Maj(A, B, C)) | 0;
                                    ((H2 = G), (G = F), (F = E2), (E2 = (D2 + T1) | 0), (D2 = C), (C = B), (B = A), (A = (T1 + T2) | 0));
                                }
                                ((A = (A + this.A) | 0),
                                    (B = (B + this.B) | 0),
                                    (C = (C + this.C) | 0),
                                    (D2 = (D2 + this.D) | 0),
                                    (E2 = (E2 + this.E) | 0),
                                    (F = (F + this.F) | 0),
                                    (G = (G + this.G) | 0),
                                    (H2 = (H2 + this.H) | 0),
                                    this.set(A, B, C, D2, E2, F, G, H2));
                            }
                        };
                        class CryptoContext {
                            constructor(key) {
                                this.expandedKey = expandKeyLE(key.slice(0, 16));
                                this.hmacKey = key.slice(16);
                            }
                            signature(content) {
                                const pad = new Uint8Array(64);
                                pad.set(this.hmacKey.length > 64 ? new SHA256().update(this.hmacKey).digest() : this.hmacKey);
                                for (let i = 0; i < pad.length; i++)
                                    pad[i] ^= 54;
                                const inner = new SHA256().update(pad).update(content).update(this.iv).digest();
                                for (let i = 0; i < pad.length; i++)
                                    pad[i] ^= 106;
                                const signature = new SHA256().update(pad).update(inner).digest();
                                clean(pad, inner);
                                return signature;
                            }
                            decrypt(part) {
                                this.iv = part.iv;
                                const signature = this.signature(part.encryptedContent);
                                if (!equalBytes2(signature, part.hmac))
                                    throw new Error("HMAC verification failed");
                                return aesCtr(this.expandedKey, this.iv, part.encryptedContent);
                            }
                            encrypt(content) {
                                const encryptedContent = aesCtr(this.expandedKey, this.iv, content);
                                return { encryptedContent, hmac: this.signature(encryptedContent) };
                            }
                        }
                        function equalBytes2(left, right) {
                            if (left.length !== right.length)
                                return false;
                            let difference = 0;
                            for (let index = 0; index < left.length; index++)
                                difference |= left[index] ^ right[index];
                            return difference === 0;
                        }
                        return { CryptoContext };
                    }
                    async function umpMain() {
                        let platform, expected, invalidStoredKey = false;
                        try {
                            const status = Number($response.status);
                            if (status >= 300 || !$response.body?.length)
                                return $done();
                            const contentType = Object.entries($response.headers ?? {}).find(([name]) => name.toLowerCase() === "content-type")?.[1];
                            if (contentType && !/^application\/vnd\.yt-ump(?:\s*;|\s*$)/i.test(contentType))
                                return $done();
                            platform = platformKey($request);
                            expected = readConfig()[platform];
                            const keys = [];
                            for (const pair of keyCandidates(expected)) {
                                try {
                                    const key = decodeBase64(pair.clientKey);
                                    if (key.length >= 16)
                                        keys.push(key);
                                }
                                catch {
                                }
                            }
                            if (!keys.length) {
                                invalidStoredKey = expected !== undefined;
                                throw new Error("YouTubeConfig requires a valid stored clientKey");
                            }
                            const options = readOptions({ blockGames: true });
                            const result = await transformUmp($response.body, keys, options);
                            if (options.autoHd !== false)
                                cacheQuality(result.players);
                            $done(result.body === $response.body ? {} : { body: result.body });
                        }
                        catch (error) {
                            console.log(String(error));
                            if (invalidStoredKey || error?.message === "HMAC verification failed") {
                                try {
                                    clearKeys(platform, expected);
                                }
                                catch (storeError) {
                                    console.log("YouTube key recovery: " + storeError);
                                }
                            }
                            $done();
                        }
                    }
                    umpMain();
                })();
            }).call(this);
        }
    });
})();
