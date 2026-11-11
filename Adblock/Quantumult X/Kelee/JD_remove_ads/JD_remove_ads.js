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
            let obj = JSON.parse($response.body);
            if (url.includes("functionId=deliverLayer") || url.includes("functionId=orderTrackBusiness")) {
                if (obj?.bannerInfo) {
                    delete obj.bannerInfo;
                }
                if (obj?.floors?.length > 0) {
                    obj.floors = obj.floors.filter((i) => !["banner", "jdDeliveryBanner"]?.includes(i?.mId));
                }
            }
            else if (url.includes("functionId=getTabHomeInfo")) {
                if (obj?.result?.iconInfo) {
                    delete obj.result.iconInfo;
                }
                if (obj?.result?.roofTop) {
                    delete obj.result.roofTop;
                }
            }
            else if (url.includes("functionId=myOrderInfo")) {
                if (obj?.floors?.length > 0) {
                    let newFloors = [];
                    for (let floor of obj.floors) {
                        if (["bannerFloor", "bpDynamicFloor", "plusFloor"]?.includes(floor?.mId)) {
                            continue;
                        }
                        else {
                            if (floor?.mId === "virtualServiceCenter") {
                                if (floor?.data?.virtualServiceCenters?.length > 0) {
                                    let newItems = [];
                                    for (let item of floor.data.virtualServiceCenters) {
                                        if (item?.serviceList?.length > 0) {
                                            let newCards = [];
                                            for (let card of item.serviceList) {
                                                if (card?.serviceTitle === "精选特惠") {
                                                    continue;
                                                }
                                                newCards.push(card);
                                            }
                                            item.serviceList = newCards;
                                        }
                                        newItems.push(item);
                                    }
                                    floor.data.virtualServiceCenters = newItems;
                                }
                            }
                            if (floor?.mId === "customerServiceFloor") {
                                if (floor?.data?.moreText) {
                                    delete floor.data.moreIcon;
                                    delete floor.data.moreIcon_dark;
                                    floor.data.moreText = " ";
                                }
                            }
                            newFloors.push(floor);
                        }
                    }
                    obj.floors = newFloors;
                }
            }
            else if (url.includes("functionId=personinfoBusiness")) {
                if (obj?.floors?.length > 0) {
                    let newFloors = [];
                    for (let floor of obj.floors) {
                        const items = [
                            "bigSaleFloor",
                            "buyOften",
                            "newAttentionCard",
                            "newBigSaleFloor",
                            "newStyleAttentionCard",
                            "newsFloor",
                            "noticeFloor",
                            "recommendfloor"
                        ];
                        if (items?.includes(floor?.mId)) {
                            continue;
                        }
                        else {
                            if (floor?.mId === "basefloorinfo") {
                                if (floor?.data?.commonPopup) {
                                    delete floor.data.commonPopup;
                                }
                                if (floor?.data?.commonPopup_dynamic) {
                                    delete floor.data.commonPopup_dynamic;
                                }
                                if (floor?.data?.commonTips?.length > 0) {
                                    floor.data.commonTips = [];
                                }
                                if (floor?.data?.commonWindows?.length > 0) {
                                    floor.data.commonWindows = [];
                                }
                                if (floor?.data?.floatLayer) {
                                    delete floor.data.floatLayer;
                                }
                            }
                            else if (floor?.mId === "iconToolFloor") {
                                if (floor?.data?.nodes?.length > 0) {
                                    const sortLists = [
                                        "applezhushou",
                                        "lingjindouxin",
                                        "dongdongnongchangxin",
                                        "chongwangwang",
                                        "kehufuwu",
                                        "xianzhiguanjia",
                                        "wenyisheng",
                                        "jijianfuwu",
                                        "zhuanzuanhongbao",
                                        "huanletaojin"
                                    ];
                                    let node = floor.data.nodes;
                                    if (node?.[0]?.length > 0) {
                                        node[0] = node[0]
                                            .filter((i) => sortLists?.includes(i?.functionId))
                                            .sort((a, b) => sortLists.indexOf(a?.functionId) - sortLists.indexOf(b?.functionId));
                                    }
                                    if (node?.[1]?.length > 0) {
                                        node[1] = node[1]
                                            .filter((i) => sortLists?.includes(i?.functionId))
                                            .sort((a, b) => sortLists.indexOf(a?.functionId) - sortLists.indexOf(b?.functionId));
                                    }
                                }
                            }
                            else if (floor?.mId === "orderIdFloor") {
                                if (floor?.data?.commentRemindInfo?.infos?.length > 0) {
                                    floor.data.commentRemindInfo.infos = [];
                                }
                            }
                            else if (floor?.mId === "userinfo") {
                                if (floor?.data?.newPlusBlackCard) {
                                    delete floor.data.newPlusBlackCard;
                                }
                            }
                            newFloors.push(floor);
                        }
                    }
                    obj.floors = newFloors;
                }
            }
            else if (url.includes("functionId=start")) {
                if (obj?.images?.length > 0) {
                    obj.images = [];
                }
                if (obj?.showTimesDaily) {
                    obj.showTimesDaily = 0;
                }
            }
            else if (url.includes("functionId=welcomeHome")) {
                if (obj?.floorList?.length > 0) {
                    const delItems = [
                        "bottomXview",
                        "float",
                        "photoCeiling",
                        "ruleFloat",
                        "searchIcon",
                        "topRotate",
                        "tabBarAtmosphere"
                    ];
                    obj.floorList = obj.floorList.filter((i) => !delItems?.includes(i?.type));
                }
                if (obj?.webViewFloorList?.length > 0) {
                    obj.webViewFloorList = [];
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
