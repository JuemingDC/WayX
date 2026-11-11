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
            if (!$response.body)
                $done({});
            let obj = JSON.parse($response.body);
            if (url.includes("ad.mcloud.139.com/advertapi/adv-filter/")) {
                if (obj?.body) {
                    if (obj?.body?.length > 0) {
                        let newBods = [];
                        for (let item of obj.body) {
                            if ([
                                "APP-启动页",
                                "APP-我的-底部卡片",
                                "APP-我的-悬浮窗",
                                "APP-我的-文字链",
                                "APP-我的-活动推广专区",
                                "APP-相册上传界面-banner",
                                "APP-首页-云朵中心卡片"
                            ]?.includes(item?.adposname)) {
                                continue;
                            }
                            newBods.push(item);
                        }
                        obj.body = newBods;
                    }
                    else {
                        obj.body = {};
                    }
                }
            }
            else if (url.includes("jzts.cmpassport.com/personalized/getPushContent")) {
                if (obj?.data?.length > 0) {
                    for (let item of obj.data) {
                        if (item?.actsList?.length > 0) {
                            for (let i of item.actsList) {
                                if (i?.putStartTime) {
                                    i.putStartTime = "2090-12-31 00:00:00.0";
                                }
                                if (i?.putEndTime) {
                                    i.putEndTime = "2090-12-31 23:59:59.0";
                                }
                                if (i?.adUrl) {
                                    i.adUrl = "";
                                }
                            }
                        }
                    }
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
            result.body = data;
        }
        __wayxCompleted = true;
        return __wayxDone(result);
    });
})();
