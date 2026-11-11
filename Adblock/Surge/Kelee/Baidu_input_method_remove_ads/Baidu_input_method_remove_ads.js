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
            const okk = JSON.parse($response.body);
            if (/imrobot\/v1\/pub\/relation\/get_robot_list/.test($request.url)) {
                okk.data.robot_info.forEach((robot) => {
                    robot.friend_bg_img = `https://raw.githubusercontent.com/Keywos/rule/main/mocks/bd/robot${Math.floor(Math.random() * 12) + 1}.jpg`;
                });
            }
            else if (/v5\/custom_page\/layout/.test($request.url)) {
                const keyi = ["\u529f\u80fd\u5165\u53e3", "\u8868\u60c5\u56fe\u6807iOSan", "\u4e00\u4e22\u513f\u989c\u6587\u5b57\u6807\u9898\u680f-iOSan", "\u6d3b\u52a8\u4e2d\u5fc3\u6807\u9898\u680fiOS", "\u5b57\u4f53banner",];
                const keys = ["\u5b57\u4f53banner", "\u6d3b\u52a8\u4e2d\u5fc3\u6807\u9898\u680fiOS"];
                if (okk.data.page_layout_content && Array.isArray(okk.data.page_layout_content)) {
                    okk.data.page_layout_content = okk.data.page_layout_content.filter(({ module_desc }) => keyi.includes(module_desc));
                }
                if (okk.data.page_data_content && Array.isArray(okk.data.page_data_content)) {
                    okk.data.page_data_content = okk.data.page_data_content.filter(({ module_desc }) => keyi.includes(module_desc) && !keys.some((keyword) => module_desc.includes(keyword)));
                }
            }
            else if (/v5\/custom_page\/getdata/.test($request.url)) {
                if (okk.data && Array.isArray(okk.data)) {
                    okk.data.forEach((item) => { if (item.items) {
                        item.items = [];
                    } });
                }
            }
            $done({ body: JSON.stringify(okk) });
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
