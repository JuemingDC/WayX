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
            let obj = JSON.parse($response.body);
            if (url.includes("/buffer/hotList")) {
                delete obj.result.topBanner;
            }
            if (url.includes("/mang/preview/banners")) {
                delete obj.data;
            }
            if (url.includes("/bbsallapi/lego/data")) {
                obj.data.cards.forEach(card => {
                    if (card.code === "multiIcon") {
                        const titlesToRemove = ["个性换肤", "专家预测", "邀请好友", "版主中心", "JRs战术板", "草稿箱", "58同城"];
                        if (card.components && card.components.length > 0) {
                            card.components = card.components.filter(component => {
                                return !(component.data && titlesToRemove.includes(component.data.title));
                            });
                        }
                    }
                });
            }
            if (obj.data && obj.data.cards) {
                obj.data.cards = obj.data.cards.filter(card => {
                    if (card.components && card.components.length > 0) {
                        return !card.components.some(component => component.data && component.data.title === "我的应用");
                    }
                    return true;
                });
            }
            if (url.includes("/bplapi/user/v1/more")) {
                if (obj.result && obj.result.vipInfo && obj.result.vipInfo.textInfo) {
                    delete obj.result.vipInfo.textInfo;
                }
                if (obj.result && obj.result.vipInfo) {
                    delete obj.result.vipInfo;
                }
            }
            $done({ body: JSON.stringify(obj) });
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
