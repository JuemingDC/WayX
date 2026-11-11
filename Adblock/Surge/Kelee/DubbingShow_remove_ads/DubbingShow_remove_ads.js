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
            function removeDataWithKeyword(array) {
                if (Array.isArray(array)) {
                    for (let i = array.length - 1; i >= 0; i--) {
                        if (array[i].data && array[i].data.includes("金币哦")) {
                            array.splice(i, 1);
                        }
                    }
                }
            }
            try {
                let obj = JSON.parse(body);
                if (url.includes("/Api/Film/GetConfigValue")) {
                    if (obj.data && Array.isArray(obj.data)) {
                        removeDataWithKeyword(obj.data);
                    }
                }
                $done({ body: JSON.stringify(obj) });
            }
            catch (e) {
                console.error("JSON parsing error:", e);
                $done({});
            }
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
