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
            const url = $request.url;
            const isHtml = /^\s*<!DOCTYPE html>/i.test($response.body);
            const interMatch = url.match(/^https:\/\/cn\.pornhub\.com\/interstitial\?[^#]*\bviewkey=([A-Za-z0-9]+)/i);
            const interTarget = interMatch ? "https://cn.pornhub.com/view_video.php?viewkey=" + interMatch[1] : "";
            if (interTarget) {
                $done({
                    body: '<!DOCTYPE html><html><head><meta charset="utf-8">' +
                        '<meta http-equiv="refresh" content="0;url=' + interTarget + '">' +
                        "<script>location.replace(" + JSON.stringify(interTarget) + ")</script>" +
                        "</head><body></body></html>",
                });
            }
            else if (isHtml && /^https:\/\/cn\.pornhub\.com\//i.test(url)) {
                let body = $response.body;
                body = body.replace(/<link\b[^>]*\brel="stylesheet"[^>]*>/g, (tag) => {
                    if (!/\bmedia="(?:print|none)"/.test(tag))
                        return tag;
                    if (!/\bonload="this\.(?:onload=null;this\.)?media='all'"/.test(tag))
                        return tag;
                    return tag
                        .replace(/\s*\bmedia="(?:print|none)"/, "")
                        .replace(/\s*\bonload="[^"]*"/, "");
                });
                body = body
                    .replace(/<style>body\.blurredAVModal\{[^<]*?<\/style>/g, "")
                    .replace(/<style>\s*#ageDisclaimerOverlay,#ageVerificationOverlay\{[\s\S]*?<\/style>/g, "")
                    .replace(/<body\b[^>]*>/g, (tag) => tag.replace(/\s*\bblurredAVModal\b/g, "").replace(/\s*\bis-blurred\b/g, ""))
                    .replace(/<div id="ageDisclaimerOverlay"[^>]*><\/div>/g, "")
                    .replace(/<div id="js-ageDisclaimerModal"[\s\S]*?<\/div>\s*<\/div>\s*(?=<script>\s*var avModalContent)/g, "")
                    .replace(/\binitModal\(\);/, "/* initModal disabled */");
                let navRemoved = false;
                const adBlockClasses = new Set();
                body.replace(/<style[^>]*>([\s\S]*?)<\/style>/g, (m, css) => {
                    if (/\.ad-link\b/.test(css)) {
                        css.replace(/\.([a-z0-9]+a[abd])(?=[\s.{,:])/g, (mm, cls) => {
                            adBlockClasses.add(cls);
                            return mm;
                        });
                    }
                    return m;
                });
                body = body
                    .replace(/<script\b[^>]*>\s*var tjPreloadAds =[\s\S]*?<\/script>/g, "")
                    .replace(/<script\b[^>]*>\s*var tjEmbeddedAdsDuration =[\s\S]*?<\/script>/g, "")
                    .replace(/<script\b[^>]*\bsrc="[^"]*trafficjunky[^"]*"[^>]*>\s*<\/script>/g, "")
                    .replace(/<div class="bottomNav clearfix">[\s\S]*?<\/div>/g, (m) => {
                    if (m.includes("gtm-event-header-paidtabs")) {
                        navRemoved = true;
                        return "";
                    }
                    return m;
                })
                    .replace(/<li\b[^>]*>\s*<div\b[^>]*>\s*<ins\b[^>]*\badsbytrafficjunky\b[^>]*><\/ins>[\s\S]*?<\/div>\s*<\/li>/g, "")
                    .replace(/<div\b[^>]*>\s*<ins\b[^>]*\badsbytrafficjunky\b[^>]*><\/ins>\s*<\/div>/g, "")
                    .replace(/<div\b[^>]*>\s*<ins\b[^>]*\badsbytrafficjunky\b[^>]*><\/ins>[\s\S]*?<\/div>\s*<\/div>/g, "")
                    .replace(/<div\b[^>]*\bclass="([a-z0-9]+a[bd])"[^>]*>(?:\s|<!--[\s\S]*?-->)*<\/div>/g, (m, cls) => cls.length >= 6 && (/\d/.test(cls) || adBlockClasses.has(cls)) ? "" : m)
                    .replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (m, open, css, close) => {
                    if (!/\.ad-link\b/.test(css) || !/\.[a-z0-9]+a[abd][\s.{,:]/.test(css))
                        return m;
                    const zeroed = css
                        .replace(/([;{]\s*(?:min-)?height\s*:\s*)\d+(?:\.\d+)?px/g, "$10px")
                        .replace(/([;{]\s*(?:padding|margin)(?:-[a-z]+)?\s*:\s*)[^;}]+/g, "$10");
                    return open + zeroed + close;
                })
                    .replace(/<ins\b[^>]*\badsbytrafficjunky\b[^>]*>[\s\S]*?<\/ins>/g, "")
                    .replace(/(["' ])js-popUnder(?=["' ])/g, "$1")
                    .replace(/(["' ])js-pop(?=["' ]|$)/g, "$1")
                    .replace(/"adRollGlobalConfig":\[(?:[^\[\]{}]|\[[^\]]*\]|\{[^{}]*\})*\]/g, (m) => m.length < 8000 && m.includes("_xa") ? '"adRollGlobalConfig":[]' : m)
                    .replace(/("adOutstreamGlobalConfig":\{(?:[^{}]|\[[^\]]*\])*"json":")[^"]*(")/, (m, p1, p2) => (m.length < 3000 ? p1 + p2 : m))
                    .replace(/<div class="abovePlayerButtons clearfix ctasActionMenu">(?:\s|<div class="clearfix videoCtaPill[^"]*">[\s\S]*?<\/a>\s*<\/div>)*\s*<\/div>/g, "")
                    .replace(/<div class="abovePlayerButtonsWrapper ctasActionMenuWrap">(?:\s|<div class="blurredBackground[^"]*"><\/div>)*\s*<\/div>/g, "")
                    .replace(/<div class="sectionTitle trendingPillsTitle">\s*<h1[^>]*>[\s\S]*?<\/h1>\s*<\/div>/g, "")
                    .replace(/<div class="[^"]*relatedSearchTermsWrapper[^"]*">(?:\s|<div class="blurredBackground[^"]*"><\/div>)*<ul class="trendingNowWrapper[^"]*">(?:\s|<!--[\s\S]*?-->|<li class="trendingNow"[^>]*>[\s\S]*?<\/li>)*\s*<\/ul>(?:\s|<div class="blurredBackground[^"]*"><\/div>)*\s*<\/div>/g, (m) => (m.length < 40000 && !m.includes("recommended") ? "" : m));
                body = body.replace(/<script>\s*var interstitial = JSON\.parse\('[^']*'\)[\s\S]*?<\/script>/g, (m) => m.length < 6000 && m.includes("window.location.href = '/interstitial?viewkey=") ? "" : m);
                body = body
                    .replace(/var TEXTLINKS\s*=\s*\[[\s\S]*?\];/g, (m) => m.length < 4000 && m.includes("campaignId") && m.includes("clickUrl")
                    ? "var TEXTLINKS = [];"
                    : m)
                    .replace(/"json":"([^"]*)"/g, (m, u) => (u.includes("_xa") ? '"json":""' : m))
                    .replace(/<script\b[^>]*>\s*function requestHb\([\s\S]*?<\/script>/g, (m) => m.length < 6000 && m.includes("ads_batch") ? "" : m);
                body = body.replace(/"noPopUnder":\s*0/g, '"noPopUnder":1');
                body = body
                    .replace(/<div\b[^>]*\bid="shortiesListSection"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g, (m) => m.length < 2000 && m.includes("modelShorties__title") ? "" : m)
                    .replace(/<div\b[^>]*\bid="modelShortiesVideos"[^>]*>[\s\S]*?<\/ul>\s*<\/div>/g, (m) => m.length < 60000 && m.includes("shortiesBox") ? "" : m);
                body = body.replace(/<li\b[^>]*\bclass="[^"]*relatedOutstream[^"]*"[^>]*>[\s\S]*?<\/li>/g, (m) => (m.length < 2000 && m.includes("relatedOutstreamPlayer") ? "" : m));
                const navFixCss = navRemoved
                    ? `
      #mobileContainer {
        padding-top: 60px;
      }`
                    : "";
                const cssBlock = `
    <style>
      #ageDisclaimerOverlay,
      #ageVerificationOverlay,
      #js-ageDisclaimerModal,
      .ageDisclaimer,
      ins.adsbytrafficjunky,
      div.rdisc5k,
      div.rdisc5aa,
      div.watchpageAd,
      li.rdisc5,
      li.js-nativeTjMob,
      .abovePlayerButtons,
      .abovePlayerButtonsWrapper,
      div.trendingPillsTitle,
      .relatedSearchTermsWrapper,
      .adsRemoveButtonWrapper,
      .gtm-event-header-paidtabs {
        display: none !important;
      }
      body.blurredAVModal,
      body.is-blurred {
        filter: none !important;
        opacity: 1 !important;
      }
      .is-blurred #mobileContainer img,
      .is-blurred #mobileContainer iframe,
      .is-blurred #mobileContainer video {
        filter: none !important;
      }
      /* 播放页 tab 栏（相关/推荐视频/评论/片单）取消悬停：站点样式给 .tabFilterWrapper 设了 position:sticky
         （带药丸时 top:116px），滑动看相关列表时它一直浮在固定位置挡视线（2026-10-30 用户反馈）；
         改 static 让它随页面滚走，tab 本身与切换功能保留不动 */
      div.tabWrapper .tabFilterWrapper {
        position: static !important;
      }
      /* 「短片」栏目兜底（2t 已整段删除，此处防结构变体漏网复现） */
      #shortiesListSection,
      #modelShortiesVideos {
        display: none !important;
      }
      /* 信息流广告位兜底（2u 已删 li 本体，此处防类名变体漏网） */
      .relatedOutstream {
        display: none !important;
      }${navFixCss}
    </style>
  </head>`;
                body = body.replace(/<\/head>/i, cssBlock);
                const returnJs = `
    <script>
      (function () {
        try {
          var isDetail = /view_video\\.php/.test(location.pathname) || /[?&]viewkey=/.test(location.search);
          if ("scrollRestoration" in history) {
            history.scrollRestoration = "auto";
          }
          var POS_KEY = "ph_scroll_" + location.pathname + (isDetail ? location.search : "");
          var MARK_KEY = "ph_went_detail";
          var saveTimer = null;
          var restorePos = 0, restoreDone = false, revealed = true;
          function saveNow() {
            // 恢复进行中时，内容还没长齐、scrollTo 会被浏览器 clamp 到半途——这种中间值不许回写存位，免得把存好的目标冲掉
            if (restorePos && !restoreDone && (window.scrollY || 0) < restorePos) return;
            try { sessionStorage.setItem(POS_KEY, String(window.scrollY || 0)); } catch (e) {}
          }
          window.addEventListener("scroll", function () {
            if (saveTimer) return;
            saveTimer = setTimeout(function () { saveTimer = null; saveNow(); }, 150);
          }, { passive: true });
          window.addEventListener("pagehide", saveNow);
          document.addEventListener("click", function (event) {
            if (event.ctrlKey || event.metaKey) return;
            var t = event.target;
            var link = t && t.closest ? t.closest("a") : null;
            if (!link || !link.href) return;
            if (!/view_video\\.php/.test(link.href) && !/[?&]viewkey=/.test(link.href)) return;
            saveNow();
            try { sessionStorage.setItem(MARK_KEY, String(Date.now())); } catch (e) {}
            link.setAttribute("target", "_blank");
            setTimeout(function () {
              if (!document.hidden) {
                try { sessionStorage.removeItem(MARK_KEY); } catch (e) {}
              }
            }, 5000);
          }, true);
          // ---- 恢复侧 ----
          // 闪烁的成因：整页重载时页面先在顶部渲染出来，pageshow 才触发恢复，第一帧必然是顶部。
          // 改法：脚本在 <head> 里就预判（标记新鲜 + 存有位置 + 后退导航），命中先把整页藏起来（visibility:hidden），
          // DOMContentLoaded 起开始定位、到位立刻揭示；1200ms 兜底必揭示，不会把页面藏死。
          function readSaved() {
            var mark = 0, pos = 0;
            try {
              mark = parseInt(sessionStorage.getItem(MARK_KEY) || "0", 10);
              pos = parseInt(sessionStorage.getItem(POS_KEY) || "0", 10);
            } catch (e) {}
            if (!mark || !pos) return 0;
            if (Date.now() - mark >= 30 * 60 * 1000) return 0;
            return pos;
          }
          function navIsBack() {
            var t = "";
            try {
              var entries = performance.getEntriesByType ? performance.getEntriesByType("navigation") : null;
              if (entries && entries[0]) t = entries[0].type;
              else if (performance.navigation && performance.navigation.type === 2) t = "back_forward";
            } catch (e) {}
            return t === "back_forward";
          }
          function reveal() {
            if (!revealed) {
              revealed = true;
              try { document.documentElement.style.visibility = ""; } catch (e) {}
            }
          }
          function tryRestore() {
            if (!restorePos || restoreDone) return;
            window.scrollTo(0, restorePos);
            if (Math.abs((window.scrollY || 0) - restorePos) <= 2) {
              restoreDone = true;
              reveal();
            }
          }
          function startRestore() {
            tryRestore();
            var tries = 0;
            var timer = setInterval(function () {
              tries++;
              tryRestore();
              if (restoreDone || tries >= 12) {
                clearInterval(timer);
                reveal();
              }
            }, 100);
          }
          var earlyPos = readSaved();
          if (earlyPos && navIsBack()) {
            restorePos = earlyPos;
            revealed = false;
            try { document.documentElement.style.visibility = "hidden"; } catch (e) {}
            setTimeout(reveal, 1200);
            document.addEventListener("DOMContentLoaded", startRestore);
          }
          window.addEventListener("pageshow", function (event) {
            if (restorePos) {
              tryRestore();
              if (restoreDone) reveal();
              return;
            }
            // head 阶段没判出后退时在这里补判：bfcache 恢复（persisted，浏览器已原生定位、只补一刀）
            // 或此刻才读到 back_forward 的重载返回——不藏页（可能已出画），照常恢复
            var p = readSaved();
            if (!p) return;
            if (event.persisted || navIsBack()) {
              restorePos = p;
              startRestore();
            }
          });
        } catch (e) {}
      })();
    </script>`;
                body = body.replace(/<\/head>/i, returnJs + "\n</head>");
                $done({ body });
            }
            else {
                $done({});
            }
        }).call(this);
    }).call(globalThis, __wayxView(typeof $request === 'undefined' ? undefined : $request, 'request'), __wayxView(typeof $response === 'undefined' ? undefined : $response, 'response'), value => {
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
