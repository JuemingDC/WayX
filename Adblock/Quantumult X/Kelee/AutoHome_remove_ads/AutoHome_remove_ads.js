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
            let url = $request.url;
            try {
                let obj = JSON.parse($response.body);
                if (/\/news_v\d+(?:\.\d+){2}\/news\/homenavigation/.test(url)) {
                    delete obj.result.leftops;
                }
                if (/\/club_v\d+(?:\.\d+){2}\/club\/index\/businessv\d+/.test(url)) {
                    delete obj.result.bannerlist;
                }
                if (url.includes("/carstreaming/selectcarportal/reclist")) {
                    delete obj.result.liveinfo;
                }
                if (/\/platform\/carserver\/carcard\/mycardv\d+/.test(url)) {
                    delete obj.result.nocartext;
                }
                if (/\/platform\/carserver\/carcard\/cards/.test(url)) {
                    delete obj.result.list[0];
                }
                function removeItemsWithKeywords(objc, keyword) {
                    var otherlist = objc["result"]["otherlist"];
                    if (Array.isArray(otherlist)) {
                        otherlist = otherlist.filter(function (ol) {
                            var lists = ol["list"];
                            if (Array.isArray(lists)) {
                                for (let index in lists) {
                                    var item = lists[index];
                                    if (item["title"] === keyword) {
                                        return false;
                                    }
                                }
                            }
                            return true;
                        });
                    }
                    objc["result"]["otherlist"] = otherlist;
                    return objc;
                }
                if (url.includes("/carstreaming/selectcarportal/seriestopwithtagscard")) {
                    obj = removeItemsWithKeywords(obj, "直播中");
                    obj = removeItemsWithKeywords(obj, "报价中");
                }
                if (/\/apic\/v\d+\/gethomepagefeed/.test(url)) {
                    obj = removeItemsWithKeywords(obj, "车抵贷");
                }
                if (/\/platform\/carserver\/((usercenter\/getservicecards)|(carcard\/allcard))/.test(url)) {
                    obj = removeItemsWithKeywords(obj, "低息借钱");
                    obj = removeItemsWithKeywords(obj, "分期购车");
                    obj = removeItemsWithKeywords(obj, "车主贷");
                    obj = removeItemsWithKeywords(obj, "测贷款额度");
                    obj = removeItemsWithKeywords(obj, "测贷款额");
                }
                console.log(JSON.stringify(obj));
                $done({ body: JSON.stringify(obj) });
            }
            catch (e) {
                console.error(e);
                $done({ body: $response.body });
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
