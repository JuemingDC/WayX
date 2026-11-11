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
            var url = $request.url;
            var body = $response.body;
            if (url.includes("/api/mobile/index.php?module=basicdata&type=app_onoff")) {
                var banner = JSON.parse(body);
                delete banner.Variables.data.xinren;
                var pathsToClear = [
                    "goodhotel",
                    "goodhotel_txt",
                    "goodthread",
                    "goodthread_txt",
                    "homeinns_already_joined",
                    "homeinns_entry",
                    "homeinns_entry_banner",
                    "homeinns_entry_url"
                ];
                pathsToClear.forEach(function (path) {
                    if (banner.Variables && banner.Variables.data && banner.Variables.data[path]) {
                        banner.Variables.data[path] = {};
                    }
                });
                $done({ body: JSON.stringify(banner) });
            }
            else if (url.includes("/api/mobile/index.php?module=plugin&id=k_misign:sign")) {
                var sign_adv = JSON.parse(body);
                if (sign_adv.Variables && sign_adv.Variables.data && sign_adv.Variables.data.adv) {
                    delete sign_adv.Variables.data.adv;
                }
                $done({ body: JSON.stringify(sign_adv) });
            }
            else if (url.includes("/api/mobile/index.php?version=5")) {
                var section_adv = JSON.parse(body);
                if (section_adv.Variables && section_adv.Variables.data && Array.isArray(section_adv.Variables.data)) {
                    section_adv.Variables.data.forEach(function (item) {
                        if (item.adv) {
                            item.adv = {};
                        }
                    });
                }
                $done({ body: JSON.stringify(section_adv) });
            }
            else {
                $done({ body: body });
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
