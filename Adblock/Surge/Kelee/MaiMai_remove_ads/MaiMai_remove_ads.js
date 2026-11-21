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
        return undefined; const result = Object.assign({}, value); if (typeof value.body !== 'string') {
        const data = __wayxBinary(value.body) ? value.body : value.bodyBytes;
        if (__wayxBinary(data))
            result.body = __wayxBytes(data);
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
            let obj = JSON.parse($response.body);
            if (url.includes("/maimai/feed/v5/focus_feed?")) {
                if (obj.feeds && Array.isArray(obj.feeds)) {
                    obj.feeds = obj.feeds.filter(feed => !feed.newAdStyle);
                }
            }
            else if (url.includes("/maimai/gossip/v3/gossip_detail_comment?")) {
                if (obj.comments && obj.comments.lst && Array.isArray(obj.comments.lst)) {
                    obj.comments.lst = obj.comments.lst.filter(comment => !comment.newAdStyle);
                }
            }
            else if (url.includes("/maimai/feed/v6/feed_detail_comment?")) {
                if (obj.lst && Array.isArray(obj.lst)) {
                    obj.lst = obj.lst.filter(item => !item.newAdStyle);
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
        return __wayxGuardDone(result);
    }));
})();
