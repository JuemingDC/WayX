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
            if (url.includes("/app_index/get_app_tab")) {
                if (obj?.data?.selected_list?.length > 0) {
                    obj.data.selected_list = obj.data.selected_list.filter((i) => !["购物", "商城"]?.includes(i?.name));
                }
            }
            else if (url.includes("/bafconfigcenter_intf/config/get")) {
                const items = [
                    "pregnancy__find_group_guide_image_url",
                    "pregnancy__home_left_icon",
                    "pregnancy__home_left_icon_new",
                    "pregnancy__home_left_icon_static",
                    "pregnancy__video_white_list"
                ];
                if (obj?.data) {
                    for (let i of items) {
                        if (obj?.data?.[i]) {
                            obj.data[i] = "";
                        }
                    }
                }
            }
            else if (url.includes("/cms_column/get_column_list")) {
                if (obj?.data?.list?.length > 0) {
                    let newLists = [];
                    for (let item of obj.data.list) {
                        if (item?.data_source_list?.length > 0) {
                            let newDatas = [];
                            for (let i of item.data_source_list) {
                                if (i?.tab_name?.includes("精品秒杀")) {
                                    continue;
                                }
                                else {
                                    newDatas.push(i);
                                }
                            }
                            item.data_source_list = newDatas;
                        }
                        if (["225", "226", "238", "239"]?.includes(item?.id)) {
                            continue;
                        }
                        newLists.push(item);
                    }
                    obj.data.list = newLists;
                }
            }
            else if (url.includes("/feeds/get_index_feeds_list")) {
                if (obj?.data?.list?.length > 0) {
                    obj.data.list = obj.data.list.filter((i) => ["发表了", "提问了"]?.includes(i?.action_desc) && !i.hasOwnProperty("seeding_goods_info"));
                }
            }
            else if (url.includes("/mobile_search_new/search_index")) {
                if (obj?.data?.find_search) {
                    delete obj.data.find_search;
                }
            }
            else if (url.includes("/user/get_user_info")) {
                if (obj?.data?.video_show) {
                    delete obj.data.video_show;
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
