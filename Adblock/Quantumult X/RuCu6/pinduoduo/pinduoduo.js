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
            if (!$response.body)
                $done({});
            let body = $response.body;
            if (url.includes("/api/alexa/homepage/hub")) {
                let obj = JSON.parse(body);
                if (obj?.result) {
                    if (obj?.result?.bottom_tabs?.length > 0) {
                        obj.result.bottom_tabs = obj.result.bottom_tabs.filter((i) => /(?:chat_list|index|personal)/.test(i?.link));
                    }
                    if (obj?.result?.buffer_bottom_tabs?.length > 0) {
                        obj.result.buffer_bottom_tabs = obj.result.buffer_bottom_tabs.filter((i) => /(?:chat_list|index|personal)/.test(i?.link));
                    }
                    if (obj?.result?.dy_module?.irregular_banner_dy) {
                        delete obj.result.dy_module.irregular_banner_dy;
                    }
                    if (obj?.result?.search_bar_hot_query) {
                        delete obj.result.search_bar_hot_query;
                    }
                    if (obj?.result?.top_skin) {
                        delete obj.result.top_skin;
                    }
                }
                body = JSON.stringify(obj);
            }
            else if (url.includes("/comment_result")) {
                if (/^\s*<!DOCTYPE html>/i.test(body) !== false) {
                    const hideCSS = `
      <style>
        /* 隐藏推荐商品容器 */
        #recommend-wrapper,
        #downloader-container {
          display: none !important;
          height: 0 !important;
          overflow: hidden !important;
        }
      </style>
    </head>
    `;
                    body = body.replace("</head>", hideCSS);
                    if (body.includes('"has_more":true')) {
                        body = body.replace('"has_more":true', '"has_more":false');
                    }
                }
            }
            else if (url.includes("/mdkd/package")) {
                if (/^\s*<!DOCTYPE html>/i.test(body) !== false) {
                    const hideCSS = `
      <style>
        /* 1. 隐藏底部大面积的商品推荐瀑布流 */
        #goods-list-big-container,
        [class^="index_goods-list-big-container"],
        .goods-list-container {
          display: none !important;
          height: 0 !important;
          overflow: hidden !important;
        }
        
        /* 2. 隐藏右下角悬浮的 GIF 活动动图 */
        [class^="index_gif-container"] {
          display: none !important;
        }

        /* 3. 【可选】如果你说的红框是“近一周已取出快递”模块，请删除下面这行代码前后的注释斜杠 */
        /* [class^="index_recently-package-container"] { display: none !important; } */
        
        /* 4. 【可选】如果你说的红框是“暂无手机尾号收到的快递”的引导，请删除下面这行代码前后的注释斜杠 */
        /* .empty-package_package-none-container__35DEn { display: none !important; } */
      </style>
    </head>
    `;
                    body = body.replace("</head>", hideCSS);
                }
            }
            else {
                $done({});
            }
            $done({ body });
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
