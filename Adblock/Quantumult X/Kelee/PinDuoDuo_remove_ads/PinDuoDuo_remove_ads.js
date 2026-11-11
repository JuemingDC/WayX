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
            let body = $response.body || "";
            const oldChunk = "https://pfile.pddpic.com/mdkd/mdkd/_next/static/chunks/9410-b8806e870a26db7d.js";
            const newChunk = "https://kelee.one/Resource/JavaScript/PinDuoDuo/9410-b8806e870a26db7d.js";
            function replaceAllText(text, from, to) {
                let pos = text.indexOf(from);
                while (pos !== -1) {
                    text = text.slice(0, pos) + to + text.slice(pos + from.length);
                    pos = text.indexOf(from, pos + to.length);
                }
                return text;
            }
            function removeGifContainer(html) {
                const marker = "index_gif-container";
                let pos = html.indexOf(marker);
                while (pos !== -1) {
                    const open = html.lastIndexOf("<div", pos);
                    if (open === -1)
                        break;
                    let i = open;
                    let depth = 0;
                    let end = -1;
                    while (i < html.length) {
                        const nextOpen = html.indexOf("<div", i);
                        const nextClose = html.indexOf("</div>", i);
                        if (nextClose === -1)
                            break;
                        if (nextOpen !== -1 && nextOpen < nextClose) {
                            depth++;
                            i = nextOpen + 4;
                        }
                        else {
                            depth--;
                            i = nextClose + 6;
                            if (depth === 0) {
                                end = i;
                                break;
                            }
                        }
                    }
                    if (end === -1)
                        break;
                    html = html.slice(0, open) + html.slice(end);
                    pos = html.indexOf(marker, open);
                }
                return html;
            }
            function trimNextData(html) {
                const idNeedle = 'id="__NEXT_DATA__"';
                const idPos = html.indexOf(idNeedle);
                if (idPos === -1)
                    return html;
                const tagStart = html.lastIndexOf("<script", idPos);
                if (tagStart === -1)
                    return html;
                const contentStart = html.indexOf(">", tagStart);
                if (contentStart === -1)
                    return html;
                const tagEnd = html.indexOf("</script>", contentStart);
                if (tagEnd === -1)
                    return html;
                const jsonText = html.slice(contentStart + 1, tagEnd);
                try {
                    const data = JSON.parse(jsonText);
                    const serverData = data &&
                        data.props &&
                        data.props.pageProps &&
                        data.props.pageProps.serverData;
                    if (Array.isArray(serverData)) {
                        data.props.pageProps.serverData = serverData.filter(item => item &&
                            (item.key === "fastBindCMobilePreCheck" ||
                                item.key === "queryStationPackageInfo"));
                    }
                    return html.slice(0, contentStart + 1) +
                        JSON.stringify(data) +
                        html.slice(tagEnd);
                }
                catch (e) {
                    return html;
                }
            }
            body = replaceAllText(body, oldChunk, newChunk);
            body = removeGifContainer(body);
            body = trimNextData(body);
            $done({ body });
        }).call(this);
    }).call(globalThis, undefined, __wayxView(typeof $response === 'undefined' ? undefined : $response), value => {
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
