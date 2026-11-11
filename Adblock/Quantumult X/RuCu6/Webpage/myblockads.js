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
        const data = value.bodyBytes;
        if (data !== undefined) {
            result.body = __wayxBytes(data);
            delete result.bodyBytes;
        }
    } return result; };
    return (function ($request, $response, $done) {
        return (function () {
            const url = $request.url;
            const isHtml = /^\s*<!DOCTYPE html>/i.test($response.body);
            if (isHtml) {
                let body = $response.body;
                if (/^https:\/\/(?:18hlw\.com|8olbt\.imsatcmn\.cc)\//.test(url)) {
                    const cssBlock = `
      <style>
        #copy-img,
        #copy-success,
        #notice_container,
        .addbox,
        .application-popup,
        .article-tags,
        .client-only-placeholder > p:has(> img[alt="710X240"]),
        .client-only-placeholder > p:has(> img[alt="710X240"]) + p,
        .client-only-placeholder > p:has(> img[alt="812X400"]),
        .editormd-preview blockquote,
        .editormd-preview p a,
        .footer,
        .gotoclick,
        .infomation,
        .list-sec,
        .relation { 
          display: none !important; 
        } 
      </style>
    </head>`;
                    body = body.replace(/<\/head>/, cssBlock);
                }
                else if (/^https:\/\/javdb\.com\//.test(url)) {
                    const cssBlock = `
      <style>
        .app-desktop-banner, 
        .moj-content,
        .sda-content,
        .sub-header { 
          display: none !important; 
        } 
      </style>
    </head>`;
                    body = body.replace(/<\/head>/, cssBlock);
                }
                else if (/^https:\/\/www\.(?:hgeme|xn--wcv59z)\.com\//.test(url)) {
                    let injectCode = `
      <style>
        #bads {
          display: none !important;
          opacity: 0 !important;
        }
      </style>
      <script>
        localStorage.setItem("bads", Date.now());
      </script>
      </head>
    `;
                    body = body.replace(/<\/head>/i, injectCode);
                }
                else if (/^https:\/\/javranking\.cc\/(?:zh-hans|en)\//.test(url)) {
                    body = body
                        .replace(/<aside\b[^>]*\bdata-spot-a\b[^>]*>[\s\S]*?<\/aside>/g, "")
                        .replace(/<li\b[^>]*\bclass="[^"]*\bsponsor-grid-slot\b[^"]*"[^>]*>[\s\S]*?<\/li>/g, "")
                        .replace(/<article\b[^>]*\bdata-spot-b\b[^>]*>[\s\S]*?<\/article>/g, "")
                        .replace(/<dialog\b[^>]*\bclass="[^"]*\b(?:spot-dialog|sponsor-dialog)\b[^"]*"[^>]*>[\s\S]*?<\/dialog>/g, "")
                        .replace(/<aside\b[^>]*\bdata-spot-c\b[^>]*>[\s\S]*?<\/aside>/g, "")
                        .replace(/<aside\b[^>]*\bclass="[^"]*\bspot-c-slot\b[^"]*"[^>]*>[\s\S]*?<\/aside>/g, "")
                        .replace(/<main\b[^>]*>/g, (tag) => tag
                        .replace(/\s*\bhas-spot-top\b/g, "")
                        .replace(/\s*\bhas-sponsor-banner\b/g, ""));
                }
                else if (/^https:\/\/(?:yhg007\.com|[a-z]{8}\.111107\d\.xyz)\/search-[^/]+\.html/.test(url)) {
                    body = body.replace(/z-index:10;/g, "z-index:-9999;pointer-events:none;");
                    body = body.replace(/opacity:0.01;/g, "opacity:0;pointer-events:none;");
                    body = body.replace(/(<script[^>]*data-zsky-ad-code[^>]*>)([\s\S]*?)(<\/script>)/gi, "$1/* ad blocked */$3");
                    const safeCss = `
      <style>
        /* 处理原生广告容器 */
        .zsky-custom-ad-code {
          opacity: 0 !important;
          height: 1px !important;
          min-height: 1px !important;
          margin: 0 !important;
          padding: 0 !important;
          pointer-events: none !important;
          overflow: hidden !important;
        }
        /* 双保险：屏蔽任何漏网的动态生成劫持块 */
        div[style*="position:fixed"][style*="opacity"],
        [class^="idpmi"] {
          display: none !important;
          pointer-events: none !important;
          z-index: -9999 !important;
        }
      </style>
    </head>`;
                    body = body.replace(/<\/head>/i, safeCss);
                }
                else if (/^https:\/\/(?:yhg007\.com|[a-z]{8}\.111107\d\.xyz)\/hash\/(?:[a-fA-F0-9]{40}|[A-Z2-7]{32})\.html/.test(url)) {
                    const ta = body.match(/(<textarea\b[^>]*\bid="magnetLink"[^>]*>)([\s\S]*?)(<\/textarea>)/i);
                    if (ta) {
                        const hm = ta[1].match(/\bdata-hash="([^"]+)"/i);
                        if (hm)
                            body = body.replace(ta[0], ta[1] + `magnet:?xt=urn:btih:${hm[1]}` + ta[3]);
                    }
                    body = body
                        .replace(/<section\b[^>]*\baria-label="移花宫引路人"[^>]*>[\s\S]*?<\/section>/g, "")
                        .replace(/<section\b[^>]*\baria-label="推荐应用"[^>]*>[\s\S]*?<\/section>/g, "")
                        .replace(/<div class="tbox">\s*<div class="ssbox">\s*<div class="title">\s*<h3>使用磁力链接<\/h3>\s*<\/div>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g, "")
                        .replace(/<div class="zsky-terminal-code-ad-root"[^>]*><!--zsky-terminal-code-ad:start-->[\s\S]*?<!--zsky-terminal-code-ad:end--><\/div>/g, "");
                }
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
            result.bodyBytes = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
            delete result.body;
        }
        __wayxCompleted = true;
        return __wayxDone(result);
    });
})();
