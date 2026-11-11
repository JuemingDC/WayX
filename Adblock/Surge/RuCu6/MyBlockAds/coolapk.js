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
            if (url.includes("/feed/detail")) {
                if (obj.data?.hotReplyRows?.length > 0) {
                    obj.data.hotReplyRows = obj.data.hotReplyRows.filter((item) => item?.id);
                }
                if (obj.data?.topReplyRows?.length > 0) {
                    obj.data.topReplyRows = obj.data.topReplyRows.filter((item) => item?.id);
                }
                const item = ["detailSponsorCard", "include_goods", "include_goods_ids"];
                for (let i of item) {
                    if (obj.data?.[i]) {
                        obj.data[i] = [];
                    }
                }
            }
            else if (url.includes("/feed/replyList")) {
                if (obj.data?.length > 0) {
                    obj.data = obj.data.filter((item) => item?.id);
                }
            }
            else if (url.includes("/main/dataList")) {
                if (obj.data?.length > 0) {
                    obj.data = obj.data.filter((item) => !(item?.entityTemplate === "sponsorCard" || item?.title === "精选配件"));
                }
            }
            else if (url.includes("/main/indexV8")) {
                if (obj.data?.length > 0) {
                    obj.data = obj.data.filter((item) => !(item?.entityTemplate === "sponsorCard" ||
                        item?.entityId === 8639 ||
                        item?.entityId === 29349 ||
                        item?.entityId === 33006 ||
                        item?.entityId === 32557 ||
                        item?.title?.includes("值得买") ||
                        item?.title?.includes("红包")));
                }
            }
            else if (url.includes("/main/init")) {
                if (obj.data?.length > 0) {
                    let newDatas = [];
                    for (let item of obj.data) {
                        if ([944, 945, 6390].includes(item?.entityId)) {
                            continue;
                        }
                        else {
                            if (item?.entityId === 20131) {
                                if (item?.entities?.length > 0) {
                                    let newEnts = [];
                                    for (let i of item.entities) {
                                        if (i?.title === "酷品") {
                                            continue;
                                        }
                                        else {
                                            newEnts.push(i);
                                        }
                                    }
                                    item.entities = newEnts;
                                }
                            }
                            newDatas.push(item);
                        }
                    }
                    obj.data = newDatas;
                }
            }
            else if (url.includes("/page/dataList")) {
                if (obj.data?.length > 0) {
                    obj.data = obj.data.filter((item) => !(item?.title === "酷安热搜" || item?.entityTemplate === "imageScaleCard" || item?.entityTemplate === "sponsorCard"));
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
