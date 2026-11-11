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
            let body = $response.body;
            let obj = JSON.parse(body);
            const search = "/banner/search_component_banner";
            const mine = "position_types=60%2C560%2C850%2C860%2C890%2C2400";
            const search_hot = "/search/hot_keywords";
            const recommend = "/resource_preload/list_h5_resource";
            const recommendPro = "/recommendation/interests/products";
            const adv = "/advertisement/v1";
            if (url.indexOf(mine) != -1) {
                obj.data = [];
                body = JSON.stringify(obj);
                $done({ body });
            }
            if (url.indexOf(search) != -1) {
                obj.data = [];
                body = JSON.stringify(obj);
                $done({ body });
            }
            if (url.indexOf(search_hot) != -1) {
                obj.data = [];
                body = JSON.stringify(obj);
                $done({ body });
            }
            if (url.indexOf(recommend) != -1) {
                obj.data = obj.data.filter(item => item.filename !== "RecommendProduct.29e31893.js");
                body = JSON.stringify(obj);
                $done({ body });
            }
            if (url.indexOf(recommendPro) != -1) {
                obj.data.activities = [];
                obj.data.products = [];
                body = JSON.stringify(obj);
                $done({ body });
            }
            if (url.indexOf(adv) != -1) {
                obj.data = obj.data.filter(item => ![30, 50, 90, 320, 100].includes(item.region_code));
                obj.data = obj.data.map(item => {
                    if (item.region_code === 2) {
                        item.positions = item.positions.filter(position => ![890, 60].includes(position.component_code));
                    }
                    return item;
                });
                body = JSON.stringify(obj);
                $done({ body });
            }
            const typeArr = [50, 2, 90, 770, 80, 320];
            obj.data = obj.data.filter(item => !typeArr.includes(item.position_type));
            body = JSON.stringify(obj);
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
