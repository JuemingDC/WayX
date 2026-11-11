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
            const body = $response.body;
            if (!body)
                $done({});
            let obj;
            try {
                obj = JSON.parse(body);
            }
            catch (e) {
                console.error("JSON解析错误:", e);
                $done({});
            }
            const regexTabList = /\/v\d\/ironman\/discovery_v\d\/tab_list_v\d/;
            const regexConfigs = /\/v\d\/graph\/homepage\/comicVideo\/v\d\/configs/;
            const regexUnifiedFeed = /\/v\d\/graph\/unified_feed$/;
            const targetTitles = ["KK评委", "2024新漫报到", "VIP"];
            const targetDescs = ["超级漫画节", "在kk当评委", "屈臣氏·KKCOS大赏", "KK朋友圈", "KK运势"];
            function removeObjectsWith(obj, key, targets) {
                if (Array.isArray(obj)) {
                    return obj.filter(item => !item[key] || !targets.includes(item[key]));
                }
                else if (typeof obj === 'object' && obj !== null) {
                    for (let k in obj) {
                        if (obj[k] && typeof obj[k] === 'object') {
                            if (obj[k][key] && targets.includes(obj[k][key])) {
                                delete obj[k];
                            }
                            else {
                                obj[k] = removeObjectsWith(obj[k], key, targets);
                            }
                        }
                    }
                }
                return obj;
            }
            function processUnifiedFeed(obj) {
                if (obj.data && obj.data.universalModels) {
                    obj.data.universalModels.forEach(model => {
                        if (model.loopBanner) {
                            delete model.loopBanner;
                        }
                        if (model.post && model.post.promotions && model.post.promotions[0] && model.post.promotions[0].type === 4) {
                            delete model.post.promotions;
                        }
                    });
                }
                return obj;
            }
            if (regexTabList.test(url)) {
                obj = removeObjectsWith(obj, 'title', targetTitles);
            }
            if (regexConfigs.test(url)) {
                obj = removeObjectsWith(obj, 'desc', targetDescs);
            }
            if (url.includes("/ironman/comic/recommend")) {
                const keysToDelete = [
                    "operation_float_ball",
                    "topic_goods",
                    "total_coupon",
                    "share_comics_page_lottery"
                ];
                keysToDelete.forEach(key => delete obj.data[key]);
            }
            if (regexUnifiedFeed.test(url)) {
                obj = processUnifiedFeed(obj);
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
