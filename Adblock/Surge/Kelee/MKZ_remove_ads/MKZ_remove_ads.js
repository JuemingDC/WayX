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
    const __wayxView = (value, phase) => { if (value === undefined)
        return undefined; const result = Object.assign({}, value); if (typeof value.body !== 'string') {
        const data = __wayxBinary(value.body) ? value.body : value.bodyBytes;
        if (__wayxBinary(data)) {
            const body = __wayxBytes(data);
            result.body = body;
        }
    } delete result.bodyBytes; return result; };
    return (function (nativeDone, run) {
        let attempted = false, nativeFailed = false, nativeError;
        const done = value => {
            if (attempted)
                return;
            attempted = true;
            try {
                return nativeDone(value);
            }
            catch (error) {
                nativeFailed = true;
                nativeError = error;
                throw error;
            }
        };
        const recover = error => {
            if (nativeFailed && error === nativeError)
                throw error;
            try {
                if (typeof console !== 'undefined' && typeof console.log === 'function')
                    console.log('[WayX] HTTP script failed; ' + (attempted ? 'completion already submitted' : 'passing through unchanged'), error);
            }
            catch { }
            if (!attempted)
                return done({});
        };
        try {
            const result = run(done);
            return result && typeof result.then === 'function' ? Promise.resolve(result).catch(recover) : result;
        }
        catch (error) {
            return recover(error);
        }
    })(__wayxDone, __wayxGuardDone => (function ($request, $response, $done) {
        return (function () {
            const url = $request.url;
            const body = $response.body;
            if (!body)
                $done({});
            let obj = JSON.parse(body);
            if (url.includes("/app/config/")) {
                delete obj.data.vip_subscribe_switch;
            }
            $done({ body: JSON.stringify(obj) });
        }).call(this);
    }).call(globalThis, __wayxView(typeof $request === 'undefined' ? undefined : $request, 'request'), __wayxView(typeof $response === 'undefined' ? undefined : $response, 'response'), value => {
        if (__wayxCompleted)
            return;
        const result = value == null ? {} : Object.assign({}, value);
        if (__wayxBinary(result.body)) {
            const data = __wayxBytes(result.body);
            result.body = data;
        }
        __wayxCompleted = true;
        return __wayxGuardDone(result);
    }));
})();
