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
            if (url.includes("/v1/users/onboard_list")) {
                if (obj.result?.length > 0) {
                    obj.result = obj.result.filter((i) => ![
                        "backup_list_under_mydevice_banner",
                        "backup_top_banner",
                        "home_bulletin_board",
                        "home_top_banner",
                        "resource_top_banner",
                        "video_top_banner"
                    ].includes(i?.anchor));
                }
            }
            else if (url.includes("/v2/users/home/news")) {
                if (obj.result?.length > 0) {
                    obj.result = obj.result.filter((i) => !i?.code?.includes("productUpdate"));
                }
            }
            else if (url.includes("/v1/user/home/widgets") || url.includes("/v2/users/home/widgets")) {
                const item = [
                    "album",
                    "banners",
                    "coreFeatures",
                    "introduceAlipan",
                    "mainBackup",
                    "minorBackup",
                    "signIn"
                ];
                item.forEach((i) => {
                    delete obj[i];
                });
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
