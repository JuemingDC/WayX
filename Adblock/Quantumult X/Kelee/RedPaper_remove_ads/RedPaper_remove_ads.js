/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
(function () {
    const __wayxHost = { request: typeof $request === 'undefined' ? undefined : $request, response: typeof $response === 'undefined' ? undefined : $response, done: $done, prefs: typeof $prefs === 'undefined' ? undefined : $prefs, global: globalThis };
    if ((__wayxHost.response === undefined ? 'request' : 'response') !== "response")
        throw new Error('Unregistered HTTP source/target declaration');
    const __wayxConfig = { "apiPlan": { "target": { "responseStatus": "statusCode", "scriptStartTime": "absent", "binaryField": "bodyBytes", "store": { "style": "prefs", "read": "valueForKey", "write": "setValueForKey", "remove": "removeValueForKey", "undefinedDeletes": false }, "http": { "style": "promise", "root": "$task.fetch", "optionsRoot": "opts", "redirect": "redirection", "cookie": "auto-cookie", "tls": "skip-cert-verify", "policy": "policy", "timeoutMs": null, "directPolicy": "direct", "defaults": { "redirect": true, "cookie": false, "tls": false } }, "notification": { "root": "$notify", "open": "open-url", "media": "media-url", "action": null, "openAction": null, "stringLink": false, "delay": false }, "completion": { "statusEncoding": "line", "synthetic": "flat" }, "argument": "absent" } } };
    return (function (config, host, run) {
        const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
        const fail = message => { throw new TypeError('WayX API: ' + message); };
        const target = config.apiPlan.target;
        const headers = (function (headers) {
            if (headers === undefined || headers === null)
                return headers;
            if (typeof headers !== 'object' || Array.isArray(headers))
                throw new TypeError('Header dictionary required');
            const lowerCaseHeaders = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
            const key = prop => typeof prop === 'string' ? prop.toLowerCase() : prop;
            return new Proxy(lowerCaseHeaders, {
                get: (target, prop, receiver) => {
                    if (prop === 'hasOwnProperty')
                        return name => Object.prototype.hasOwnProperty.call(target, key(name));
                    if (prop === 'propertyIsEnumerable')
                        return name => Object.prototype.propertyIsEnumerable.call(target, key(name));
                    if (typeof prop === 'string' && !Object.prototype.hasOwnProperty.call(target, key(prop)) && ['toString', 'toLocaleString', 'valueOf', 'constructor'].includes(prop))
                        return Reflect.get(target, prop, receiver);
                    return Reflect.get(target, key(prop), receiver);
                },
                set: (target, prop, value) => Reflect.defineProperty(target, key(prop), { value, writable: true, enumerable: true, configurable: true }),
                deleteProperty: (target, prop) => Reflect.deleteProperty(target, key(prop)),
                has: (target, prop) => Reflect.has(target, key(prop)),
                defineProperty: (target, prop, descriptor) => {
                    if (key(prop) !== prop && !descriptor.configurable)
                        throw new TypeError('Case-insensitive Header descriptors must be configurable');
                    return Reflect.defineProperty(target, key(prop), descriptor);
                },
                getOwnPropertyDescriptor: (target, prop) => { const d = Reflect.getOwnPropertyDescriptor(target, key(prop)); return d && key(prop) !== prop ? Object.assign({}, d, { configurable: true }) : d; },
            });
        });
        const abLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
        const typed = Object.getPrototypeOf(Uint8Array.prototype);
        const get = name => Object.getOwnPropertyDescriptor(typed, name).get;
        const tag = Object.getOwnPropertyDescriptor(typed, Symbol.toStringTag).get;
        const bytes = value => {
            let length;
            try {
                length = abLength.call(value);
            }
            catch { }
            if (length !== undefined)
                return new Uint8Array(value, 0, length);
            if (ArrayBuffer.isView(value)) {
                const isTyped = tag.call(value) !== undefined, getter = name => isTyped ? get(name).call(value) : Object.getOwnPropertyDescriptor(DataView.prototype, name).get.call(value);
                return new Uint8Array(getter('buffer'), getter('byteOffset'), getter('byteLength'));
            }
            return fail('binary body requires BufferSource');
        };
        const binary = value => {
            if (ArrayBuffer.isView(value))
                return true;
            try {
                abLength.call(value);
                return true;
            }
            catch {
                return false;
            }
        };
        const buffer = value => { const b = bytes(value); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
        const status = value => {
            if (typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599)
                return value;
            const m = typeof value === 'string' && /^HTTP\/[\d.]+\s+(\d{3})(?:\s.*)?$/.exec(value);
            if (m)
                return status(Number(m[1]));
            return fail('invalid HTTP status');
        };
        const statusLine = value => { const code = status(value); return typeof value === 'string' ? value : 'HTTP/1.1 ' + code + ' ' + ({ 200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error' }[code] || 'Status'); };
        const requestParts = value => typeof value === 'string' ? /^(https?):\/\/([^/?#]+)([^#]*)/i.exec(value) : null;
        const originalRequest = requestParts(host.request && host.request.url);
        const rawPath = parts => parts[3] ? (parts[3][0] === '?' ? '/' : '') + parts[3] : '/';
        function view(value, requestRole = false) {
            if (value === undefined)
                return undefined;
            const result = Object.assign({}, value);
            if (requestRole && false && originalRequest) {
                if (!own(result, 'scheme'))
                    result.scheme = originalRequest[1].toLowerCase();
                if (!own(result, 'path'))
                    result.path = rawPath(originalRequest);
            }
            if (value.headers !== undefined)
                result.headers = headers(value.headers);
            if (own(value, "statusCode")) {
                result["status"] = status(value["statusCode"]);
                delete result["statusCode"];
            }
            if (binary(value.bodyBytes) || binary(value.body)) {
                const valueBytes = value.bodyBytes;
                if (valueBytes !== undefined) {
                    const b = bytes(valueBytes);
                    {
                        result.body = b;
                        delete result.bodyBytes;
                    }
                }
            }
            return result;
        }
        const request = view(host.request, true);
        const response = view(host.response);
        let completed = false;
        const finish = value => { completed = true; return host.done(value); };
        function message(value, synthetic) {
            if (!value || typeof value !== 'object' || Array.isArray(value))
                return fail('completion requires an object');
            const out = Object.assign({}, value);
            if (!synthetic && false && false && own(out, 'path')) {
                if (typeof out.path !== 'string' || !out.path.startsWith('/') || /[\r\n]/.test(out.path))
                    fail('QX request path must be an absolute request path');
                ;
            }
            if (own(out, 'statusCode') && !own(out, 'status'))
                out.status = out.statusCode;
            delete out.statusCode;
            if (own(out, 'status'))
                out.status = statusLine(out.status);
            if (own(out, 'headers')) {
                if (!out.headers || typeof out.headers !== 'object' || Array.isArray(out.headers))
                    fail('completion headers require a dictionary');
                out.headers = Object.assign({}, headers(out.headers));
            }
            if (own(out, 'bodyBytes')) {
                out.body = bytes(out.bodyBytes);
                delete out.bodyBytes;
            }
            if (binary(out.body)) {
                {
                    out.bodyBytes = buffer(out.body);
                    delete out.body;
                }
            }
            ;
            for (const key of Object.keys(out))
                if (!['url', 'headers', 'body', 'bodyBytes', 'status', 'abort', ...([]), ...([])].includes(key)) {
                    delete out[key];
                }
            delete out.abort;
            if (!synthetic && true && own(out, 'headers') && !own(out, 'body') && !own(out, 'bodyBytes') && true)
                fail('QX response-body requires body with changed headers');
            return out;
        }
        function done(value) {
            if (completed)
                return;
            if (['task', 'network', 'generic'].includes("response"))
                return finish(value ?? {});
            if (value === undefined || value === null)
                return finish({});
            if (value === response || value === request) {
                const out = {};
                for (const k of ['url', 'headers', 'body', 'bodyBytes', 'h2_trailers', ...([]), "status"])
                    if (own(value, k))
                        out[k] = value[k];
                value = out;
            }
            if (typeof value === 'string')
                value = { body: value };
            let synthetic = false, payload = value;
            if (value && typeof value === 'object' && own(value, 'response')) {
                synthetic = true;
                payload = value.response;
            }
            else
                ;
            const out = message(payload, synthetic);
            if (synthetic) {
                {
                    fail('QX synthetic response requires an echo declaration');
                    return finish(out);
                }
                return finish({ response: out });
            }
            return finish(out);
        }
        const nativeStore = host.prefs;
        const storageKey = key => {
            if (key === undefined) {
                const name = "RedPaper_remove_ads.js";
                if (!name)
                    return fail('source storage default key needs source script name');
                return name;
            }
            if (typeof key !== 'string')
                return fail('storage key must be String');
            return key;
        };
        const store = { read: key => nativeStore["valueForKey"](storageKey(key)), write: (value, key) => {
                key = storageKey(key);
                if (value === null || (value === undefined && true))
                    return nativeStore["removeValueForKey"](key);
                if (typeof value !== 'string')
                    return fail('storage value must be String or deletion marker');
                return nativeStore["setValueForKey"](value, key);
            } };
        store.remove = () => {
            ;
            {
                host.prefs.removeAllValues();
                return;
            }
            return;
        };
        ;
        ;
        ;
        const overlay = {
            $request: request, $response: response, $done: done,
            $persistentStore: store
        };
        return run.call(host.global, overlay);
    })(__wayxConfig, __wayxHost, function (__wayxScope) {
        return (function ($request, $response, $done, $persistentStore) {
            return (function () {
                const url = $request.url;
                if (!$response.body)
                    $done({});
                let obj = JSON.parse($response.body);
                if (url.includes("/v1/interaction/comment/video/download")) {
                    let commitsCache = JSON.parse($persistentStore.read("redBookCommentLivePhoto"));
                    if (commitsCache) {
                        let commitsRsp = commitsCache;
                        if (commitsRsp?.livePhotos?.length > 0 && obj?.data?.video) {
                            for (const item of commitsRsp.livePhotos) {
                                if (item?.videId === obj?.data?.video?.video_id) {
                                    obj.data.video.video_url = item.videoUrl;
                                    break;
                                }
                            }
                        }
                    }
                }
                else if (url.includes("/v1/note/imagefeed") || url.includes("/v2/note/feed")) {
                    let newDatas = [];
                    if (obj?.data?.[0]?.note_list?.length > 0) {
                        for (let item of obj.data[0].note_list) {
                            if (item?.function_switch?.length > 0) {
                                for (let i of item.function_switch) {
                                    if (i?.enable === false) {
                                        i.enable = true;
                                        i.reason = "";
                                    }
                                }
                            }
                            if (item?.media_save_config) {
                                item.media_save_config.disable_save = false;
                                item.media_save_config.disable_watermark = true;
                                item.media_save_config.disable_weibo_cover = true;
                            }
                            if (item?.share_info?.function_entries?.length > 0) {
                                const additem = { type: "video_download" };
                                let videoDownloadIndex = item.share_info.function_entries.findIndex((i) => i?.type === "video_download");
                                if (videoDownloadIndex !== -1) {
                                    let videoDownloadEntry = item.share_info.function_entries.splice(videoDownloadIndex, 1)[0];
                                    item.share_info.function_entries.splice(0, 0, videoDownloadEntry);
                                }
                                else {
                                    item.share_info.function_entries.splice(0, 0, additem);
                                }
                            }
                            if (item?.images_list?.length > 0) {
                                for (let i of item.images_list) {
                                    if (i.hasOwnProperty("live_photo_file_id") && i.hasOwnProperty("live_photo")) {
                                        if (i?.live_photo_file_id &&
                                            i?.live_photo?.media?.video_id &&
                                            i?.live_photo?.media?.stream?.h265?.[0]?.master_url) {
                                            let myData = {
                                                file_id: i.live_photo_file_id,
                                                video_id: i.live_photo.media.video_id,
                                                url: i.live_photo.media.stream.h265[0].master_url
                                            };
                                            newDatas.push(myData);
                                        }
                                        $persistentStore.write(JSON.stringify(newDatas), "redBookLivePhoto");
                                    }
                                }
                            }
                        }
                    }
                }
                else if (url.includes("/v1/note/live_photo/save")) {
                    let livePhoto = JSON.parse($persistentStore.read("redBookLivePhoto"));
                    if (obj?.data?.datas?.length > 0) {
                        if (livePhoto?.length > 0) {
                            obj.data.datas.forEach((itemA) => {
                                livePhoto.forEach((itemB) => {
                                    if (itemB?.file_id === itemA?.file_id && itemA?.url) {
                                        itemA.url = itemA.url.replace(/^https?:\/\/.*\.mp4/g, itemB.url);
                                    }
                                });
                            });
                        }
                    }
                    else {
                        obj = { code: 0, success: true, msg: "成功", data: { datas: livePhoto } };
                    }
                }
                else if (url.includes("/v1/system/service/ui/config")) {
                    if (obj?.data?.sideConfigHomepage?.componentConfig?.sidebar_config_cny_2025) {
                        obj.data.sideConfigHomepage.componentConfig.sidebar_config_cny_2025 = {};
                    }
                    if (obj?.data?.sideConfigPersonalPage?.componentConfig?.sidebar_config_cny_2025) {
                        obj.data.sideConfigPersonalPage.componentConfig.sidebar_config_cny_2025 = {};
                    }
                }
                else if (url.includes("/v1/system_service/config")) {
                    const item = ["app_theme", "loading_img", "splash", "store"];
                    if (obj?.data) {
                        for (let i of item) {
                            delete obj.data[i];
                        }
                    }
                }
                else if (url.includes("/v2/note/widgets")) {
                    const item = ["cooperate_binds", "generic", "note_next_step", "widget_list", "widgets_nbb", "widgets_ncb", "widgets_ndb"];
                    if (obj?.data) {
                        for (let i of item) {
                            delete obj.data[i];
                        }
                    }
                }
                else if (url.includes("/v2/system_service/splash_config")) {
                    if (obj?.data?.ads_groups?.length > 0) {
                        for (let i of obj.data.ads_groups) {
                            i.start_time = 3818332800;
                            i.end_time = 3818419199;
                            if (i?.ads?.length > 0) {
                                for (let ii of i.ads) {
                                    ii.start_time = 3818332800;
                                    ii.end_time = 3818419199;
                                }
                            }
                        }
                    }
                }
                else if (url.includes("/v2/user/followings/followfeed")) {
                    if (obj?.data?.items?.length > 0) {
                        obj.data.items = obj.data.items.filter((i) => i?.recommend_reason === "friend_post");
                    }
                }
                else if (url.includes("/v3/note/videofeed")) {
                    if (obj?.data?.length > 0) {
                        for (let item of obj.data) {
                            if (item?.media_save_config) {
                                item.media_save_config.disable_save = false;
                                item.media_save_config.disable_watermark = true;
                                item.media_save_config.disable_weibo_cover = true;
                            }
                            if (item?.share_info?.function_entries?.length > 0) {
                                const additem = { type: "video_download" };
                                let videoDownloadIndex = item.share_info.function_entries.findIndex((i) => i?.type === "video_download");
                                if (videoDownloadIndex !== -1) {
                                    let videoDownloadEntry = item.share_info.function_entries.splice(videoDownloadIndex, 1)[0];
                                    item.share_info.function_entries.splice(0, 0, videoDownloadEntry);
                                }
                                else {
                                    item.share_info.function_entries.splice(0, 0, additem);
                                }
                            }
                        }
                    }
                }
                else if (url.includes("/v4/followfeed")) {
                    if (obj?.data?.items?.length > 0) {
                        obj.data.items = obj.data.items.filter((i) => !["recommend_user"].includes(i?.recommend_reason));
                    }
                }
                else if (url.includes("/v4/note/videofeed")) {
                    let modDatas = [];
                    let newDatas = [];
                    let unlockDatas = [];
                    if (obj?.data?.length > 0) {
                        for (let item of obj.data) {
                            if (item?.function_switch?.length > 0) {
                                for (let i of item.function_switch) {
                                    if (i?.enable === false) {
                                        i.enable = true;
                                        i.reason = "";
                                    }
                                }
                            }
                            if (item?.model_type === "note") {
                                if (item?.id && item?.video_info_v2?.media?.stream?.h265?.[0]?.master_url) {
                                    let myData = {
                                        id: item.id,
                                        url: item.video_info_v2.media.stream.h265[0].master_url
                                    };
                                    newDatas.push(myData);
                                }
                                if (item?.share_info?.function_entries?.length > 0) {
                                    const additem = { type: "video_download" };
                                    let videoDownloadIndex = item.share_info.function_entries.findIndex((i) => i?.type === "video_download");
                                    if (videoDownloadIndex !== -1) {
                                        let videoDownloadEntry = item.share_info.function_entries.splice(videoDownloadIndex, 1)[0];
                                        item.share_info.function_entries.splice(0, 0, videoDownloadEntry);
                                    }
                                    else {
                                        item.share_info.function_entries.splice(0, 0, additem);
                                    }
                                }
                                if (item.hasOwnProperty("ad")) {
                                    continue;
                                }
                                else {
                                    modDatas.push(item);
                                }
                            }
                            else {
                                continue;
                            }
                            obj.data = modDatas;
                        }
                        $persistentStore.write(JSON.stringify(newDatas), "redBookVideoFeed");
                    }
                    let videoFeedUnlock = JSON.parse($persistentStore.read("redBookVideoFeedUnlock"));
                    if (videoFeedUnlock?.gayhub === "rucu6") {
                        if (obj?.data?.length > 0) {
                            for (let item of obj.data) {
                                if (item?.id && item?.video_info_v2?.media?.stream?.h265?.[0]?.master_url) {
                                    let myData = {
                                        id: item.id,
                                        url: item.video_info_v2.media.stream.h265[0].master_url
                                    };
                                    unlockDatas.push(myData);
                                }
                            }
                        }
                        $persistentStore.write(JSON.stringify(unlockDatas), "redBookVideoFeedUnlock");
                    }
                }
                else if (url.includes("/v5/note/comment/list")) {
                    replaceRedIdWithFmz200(obj.data);
                    let livePhotos = [];
                    let note_id = "";
                    if (obj?.data?.comments?.length > 0) {
                        note_id = obj.data.comments[0].note_id;
                        for (const comment of obj.data.comments) {
                            if (comment?.comment_type === 3) {
                                comment.comment_type = 2;
                            }
                            if (comment?.media_source_type === 1) {
                                comment.media_source_type = 0;
                            }
                            if (comment?.pictures?.length > 0) {
                                for (const picture of comment.pictures) {
                                    if (picture?.video_id) {
                                        const picObj = JSON.parse(picture.video_info);
                                        if (picObj?.stream?.h265?.[0]?.master_url) {
                                            const videoData = {
                                                videId: picture.video_id,
                                                videoUrl: picObj.stream.h265[0].master_url
                                            };
                                            livePhotos.push(videoData);
                                        }
                                    }
                                }
                            }
                            if (comment?.sub_comments?.length > 0) {
                                for (const sub_comment of comment.sub_comments) {
                                    if (comment?.comment_type === 3) {
                                        comment.comment_type = 2;
                                    }
                                    if (comment?.media_source_type === 1) {
                                        comment.media_source_type = 0;
                                    }
                                    if (sub_comment?.pictures?.length > 0) {
                                        for (const picture of sub_comment.pictures) {
                                            if (picture?.video_id) {
                                                const picObj = JSON.parse(picture.video_info);
                                                if (picObj?.stream?.h265?.[0]?.master_url) {
                                                    const videoData = {
                                                        videId: picture.video_id,
                                                        videoUrl: picObj.stream.h265[0].master_url
                                                    };
                                                    livePhotos.push(videoData);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (livePhotos?.length > 0) {
                        let commitsRsp;
                        let commitsCache = JSON.parse($persistentStore.read("redBookCommentLivePhoto"));
                        if (!commitsCache) {
                            commitsRsp = { noteId: note_id, livePhotos: livePhotos };
                        }
                        else {
                            commitsRsp = commitsCache;
                            if (commitsRsp?.noteId === note_id) {
                                commitsRsp.livePhotos = deduplicateLivePhotos(commitsRsp.livePhotos.concat(livePhotos));
                            }
                            else {
                                commitsRsp = { noteId: note_id, livePhotos: livePhotos };
                            }
                        }
                        $persistentStore.write(JSON.stringify(commitsRsp), "redBookCommentLivePhoto");
                    }
                }
                else if (url.includes("/v5/recommend/user/follow_recommend")) {
                    if (obj?.data?.title === "你可能感兴趣的人" && obj?.data?.rec_users?.length > 0) {
                        obj.data = {};
                    }
                }
                else if (url.includes("/v6/homefeed")) {
                    if (obj?.data?.length > 0) {
                        let newItems = [];
                        for (let item of obj.data) {
                            if (item?.model_type === "live_v2") {
                                continue;
                            }
                            else if (item.hasOwnProperty("ads_info")) {
                                continue;
                            }
                            else if (item.hasOwnProperty("card_icon")) {
                                continue;
                            }
                            else if (item.hasOwnProperty("note_attributes")) {
                                continue;
                            }
                            else if (item?.note_attributes?.includes("goods")) {
                                continue;
                            }
                            else if (item?.has_related_goods === true) {
                                continue;
                            }
                            else {
                                if (item?.related_ques) {
                                    delete item.related_ques;
                                }
                                newItems.push(item);
                            }
                        }
                        obj.data = newItems;
                    }
                }
                else if (url.includes("/v10/note/video/save")) {
                    let videoFeed = JSON.parse($persistentStore.read("redBookVideoFeed"));
                    let videoFeedUnlock = JSON.parse($persistentStore.read("redBookVideoFeedUnlock"));
                    if (obj?.data?.note_id && videoFeed?.length > 0) {
                        for (let item of videoFeed) {
                            if (item.id === obj.data.note_id) {
                                obj.data.download_url = item.url;
                            }
                        }
                    }
                    if (obj?.data?.note_id && videoFeedUnlock?.length > 0) {
                        if (obj?.data?.disable === true && obj?.data?.msg) {
                            delete obj.data.disable;
                            delete obj.data.msg;
                            obj.data.download_url = "";
                            obj.data.status = 2;
                            for (let item of videoFeedUnlock) {
                                if (item.id === obj.data.note_id) {
                                    obj.data.download_url = item.url;
                                }
                            }
                        }
                    }
                    videoFeedUnlock = { gayhub: "rucu6" };
                    $persistentStore.write(JSON.stringify(videoFeedUnlock), "redBookVideoFeedUnlock");
                }
                else if (url.includes("/v10/search/notes")) {
                    if (obj?.data?.items?.length > 0) {
                        obj.data.items = obj.data.items.filter((i) => i?.model_type === "note");
                    }
                }
                else {
                    $done({});
                }
                $done({ body: JSON.stringify(obj) });
                function deduplicateLivePhotos(livePhotos) {
                    const seen = new Map();
                    livePhotos = livePhotos.filter((item) => {
                        if (seen.has(item.videId)) {
                            return false;
                        }
                        seen.set(item.videId, true);
                        return true;
                    });
                    return livePhotos;
                }
                function replaceRedIdWithFmz200(obj) {
                    if (Array.isArray(obj)) {
                        obj.forEach((item) => replaceRedIdWithFmz200(item));
                    }
                    else if (typeof obj === "object" && obj !== null) {
                        if ("red_id" in obj) {
                            obj.fmz200 = obj.red_id;
                            delete obj.red_id;
                        }
                        Object.keys(obj).forEach((key) => {
                            replaceRedIdWithFmz200(obj[key]);
                        });
                    }
                }
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done), Object.prototype.hasOwnProperty.call(__wayxScope, "$persistentStore") ? __wayxScope["$persistentStore"] : (typeof $persistentStore === 'undefined' ? undefined : $persistentStore));
    });
})();
