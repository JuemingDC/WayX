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
    const __wayxView = value => { if (value === undefined)
        return undefined; const result = Object.assign({}, value); if (__wayxBinary(value.bodyBytes) || __wayxBinary(value.body)) {
        const data = value.body;
        if (data !== undefined) {
            result.body = __wayxBytes(data);
            delete result.bodyBytes;
        }
    } return result; };
    return (function ($request, $response, $done) {
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
    }).call(globalThis, __wayxView(typeof $request === 'undefined' ? undefined : $request), __wayxView(typeof $response === 'undefined' ? undefined : $response), value => {
        if (__wayxCompleted)
            return;
        const result = value == null ? {} : Object.assign({}, value);
        if (__wayxBinary(result.body)) {
            const data = __wayxBytes(result.body);
            result.body = data;
        }
        __wayxCompleted = true;
        return __wayxDone(result);
    });
})();
