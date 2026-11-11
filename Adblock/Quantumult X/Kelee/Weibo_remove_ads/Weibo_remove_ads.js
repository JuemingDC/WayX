/* SPDX-License-Identifier: GPL-3.0-only; ScriptHub derivative. */
(function () {
    const __wayxHost = { request: typeof $request === 'undefined' ? undefined : $request, response: typeof $response === 'undefined' ? undefined : $response, done: $done, global: globalThis };
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
        ;
        ;
        ;
        const overlay = {
            $request: request, $response: response, $done: done
        };
        return run.call(host.global, overlay);
    })(__wayxConfig, __wayxHost, function (__wayxScope) {
        return (function ($request, $response, $done) {
            return (function () {
                const url = $request.url;
                if (!$response)
                    $done({});
                if (!$response.body)
                    $done({});
                let body = $response.body;
                const itemMenusConfig = {
                    creatortypeask: false,
                    mblog_menus_apeal: true,
                    mblog_menus_avatar_widget: false,
                    mblog_menus_bullet_shield: true,
                    mblog_menus_card_bg: false,
                    mblog_menus_comment_manager: true,
                    mblog_menus_copy_url: true,
                    mblog_menus_custom: false,
                    mblog_menus_delete: true,
                    mblog_menus_edit: true,
                    mblog_menus_edit_history: true,
                    mblog_menus_edit_video: true,
                    mblog_menus_favorite: true,
                    mblog_menus_follow: true,
                    mblog_menus_home: false,
                    mblog_menus_long_picture: true,
                    mblog_menus_modify_visible: true,
                    mblog_menus_novelty: false,
                    mblog_menus_open_reward: false,
                    mblog_menus_popularize: false,
                    mblog_menus_promote: false,
                    mblog_menus_report: true,
                    mblog_menus_shield: true,
                    mblog_menus_sticking: true,
                    mblog_menus_video_feedback: false,
                    mblog_menus_video_later: false
                };
                if (url.includes("/interface/sdk/sdkad.php")) {
                    let obj = JSON.parse(body.substring(0, body.length - 2));
                    if (obj?.needlocation) {
                        obj.needlocation = false;
                    }
                    if (obj?.show_push_splash_ad) {
                        obj.show_push_splash_ad = false;
                    }
                    if (obj?.background_delay_display_time) {
                        obj.background_delay_display_time = 31536000;
                    }
                    if (obj?.lastAdShow_delay_display_time) {
                        obj.lastAdShow_delay_display_time = 31536000;
                    }
                    if (obj?.realtime_ad_video_stall_time) {
                        obj.realtime_ad_video_stall_time = 0;
                    }
                    if (obj?.realtime_ad_timeout_duration) {
                        obj.realtime_ad_timeout_duration = 0;
                    }
                    if (obj?.ads?.length > 0) {
                        for (let item of obj.ads) {
                            item.displaytime = 0;
                            item.displayintervel = 31536000;
                            item.allowdaydisplaynum = 0;
                            item.begintime = "2040-01-01 00:00:00";
                            item.endtime = "2040-01-01 23:59:59";
                        }
                    }
                    $done({ body: JSON.stringify(obj) + "OK" });
                }
                else {
                    let obj = JSON.parse(body);
                    if (url.includes("/2/cardlist")) {
                        if (obj?.top) {
                            delete obj.top;
                        }
                        if (obj?.cards?.length > 0) {
                            let newCards = [];
                            for (let card of obj.cards) {
                                if (card?.card_group?.length > 0) {
                                    let newGroup = [];
                                    for (let group of card.card_group) {
                                        let cardType = group.card_type;
                                        if ([120, 145, 192].includes(cardType)) {
                                            continue;
                                        }
                                        if (cardType === 6) {
                                            continue;
                                        }
                                        if (group?.mblog) {
                                            removeAvatar(group?.mblog);
                                        }
                                        newGroup.push(group);
                                    }
                                    card.card_group = newGroup;
                                    newCards.push(card);
                                }
                                else {
                                    let cardType = card.card_type;
                                    if ([17, 58].includes(cardType)) {
                                        continue;
                                    }
                                    if (card?.mblog) {
                                        removeAvatar(card?.mblog);
                                    }
                                    newCards.push(card);
                                }
                            }
                            obj.cards = newCards;
                        }
                    }
                    else if (url.includes("/2/checkin/show")) {
                        if (obj?.show) {
                            obj.show = 0;
                        }
                        if (obj?.show_time) {
                            obj.show_time = 0;
                        }
                    }
                    else if (url.includes("/2/client/publisher_list")) {
                        if (obj?.elements?.length > 0) {
                            obj.elements = obj.elements.filter((i) => ["写微博", "图片", "视频"].includes(i?.app_name));
                        }
                    }
                    else if (url.includes("/2/comments/build_comments")) {
                        if (obj?.datas?.length > 0) {
                            let newItems = [];
                            for (let item of obj.datas) {
                                if (item?.data) {
                                    if (!isAd(item?.data)) {
                                        if (item?.data?.comment_bubble) {
                                            delete item.data.comment_bubble;
                                        }
                                        if (item?.data?.comment_bullet_screens_message) {
                                            delete item.data.comment_bullet_screens_message;
                                        }
                                        if (item?.data?.hot_icon) {
                                            delete item.data.hot_icon;
                                        }
                                        if (item?.data?.vip_button) {
                                            delete item.data.vip_button;
                                        }
                                        if (item?.data?.user) {
                                            removeAvatar(item?.data);
                                            if (/(超话社区|微博)/.test(item?.data?.user?.name)) {
                                                continue;
                                            }
                                        }
                                        if ([6, 15, 41].includes(item?.type)) {
                                            continue;
                                        }
                                        if (item.hasOwnProperty("adType")) {
                                            continue;
                                        }
                                        newItems.push(item);
                                    }
                                }
                            }
                            obj.datas = newItems;
                        }
                        else if (obj?.root_comments?.length > 0) {
                            let newItems = [];
                            for (let item of obj.root_comments) {
                                if (!isAd(item)) {
                                    if (item?.comment_bubble) {
                                        delete item.comment_bubble;
                                    }
                                    if (item?.data?.comment_bubble) {
                                        delete item.data.comment_bubble;
                                    }
                                    if (item?.data?.comment_bullet_screens_message) {
                                        delete item.data.comment_bullet_screens_message;
                                    }
                                    if (item?.data?.hot_icon) {
                                        delete item.data.hot_icon;
                                    }
                                    if (item?.data?.vip_button) {
                                        delete item.data.vip_button;
                                    }
                                    if (item.user) {
                                        removeAvatar(item);
                                        if (["超话社区", "微博视频"].includes(item?.user?.name)) {
                                            continue;
                                        }
                                    }
                                    newItems.push(item);
                                }
                            }
                            obj.root_comments = newItems;
                        }
                        else if (obj?.comments?.length > 0) {
                            let newItems = [];
                            for (let item of obj.comments) {
                                if (item?.reply_comment?.comment_badge) {
                                    delete item.reply_comment.comment_badge;
                                }
                                if (item?.user?.icons) {
                                    delete item.user.icons;
                                }
                                newItems.push(item);
                            }
                            obj.comments = newItems;
                        }
                        if (obj?.rootComment) {
                            if (obj?.rootComment?.comment_bubble) {
                                delete obj.rootComment.comment_bubble;
                            }
                        }
                        if (obj?.status?.page_info) {
                            removeVoteInfo(obj?.status);
                        }
                    }
                    else if (url.includes("/2/container/asyn")) {
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                removeAvatar(item?.data);
                                if (/infeed_may_interest_in/.test(item?.itemId)) {
                                    continue;
                                }
                                if (item?.itemId === null) {
                                    continue;
                                }
                                if (item?.items?.length > 0) {
                                    for (let i of item.items) {
                                        removeAvatar(i?.data);
                                        removeVoteInfo(i?.data);
                                    }
                                }
                                newItems.push(item);
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/direct_messages/user_list")) {
                        if (obj?.user_list?.length > 0) {
                            obj.user_list = obj.user_list.filter((i) => !["活动通知", "闪聊"].includes(i?.user?.name));
                        }
                    }
                    else if (url.includes("/2/flowlist")) {
                        if (obj?.items?.length > 0) {
                            for (let item of obj.items) {
                                if (item?.items?.length > 0) {
                                    for (let i of item.items) {
                                        removeAvatar(i?.data);
                                        removeVoteInfo(i?.data);
                                    }
                                }
                            }
                        }
                        if (obj?.channelInfo?.channels?.length > 0) {
                            let newTabs = [];
                            for (let tab of obj.channelInfo.channels) {
                                if (/_selfrecomm/.test(tab?.flowId)) {
                                    continue;
                                }
                                else if (/_chaohua/.test(tab?.flowId)) {
                                    continue;
                                }
                                else {
                                    newTabs.push(tab);
                                }
                            }
                            obj.channelInfo.channels = newTabs;
                        }
                    }
                    else if (url.includes("/2/flowpage")) {
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                if (item?.data?.itemid === "hot-search-push-notice") {
                                    continue;
                                }
                                if (item?.items?.length > 0) {
                                    let newII = [];
                                    for (let i of item.items) {
                                        if (i?.data.hasOwnProperty("promotion")) {
                                            continue;
                                        }
                                        else if (/_img_search_stick/.test(i?.data?.pic)) {
                                            continue;
                                        }
                                        else {
                                            newII.push(i);
                                        }
                                    }
                                    item.items = newII;
                                }
                                newItems.push(item);
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/groups/allgroups/v2")) {
                        if (obj?.pageDatas?.length > 0) {
                            let newTabs = [];
                            for (let item of obj.pageDatas) {
                                if (item?.pageDataType === "homeExtend") {
                                    continue;
                                }
                                else {
                                    if (item?.categories?.length > 0) {
                                        let newCates = [];
                                        for (let i of item.categories) {
                                            if (i?.title === "默认分组") {
                                                if (i?.pageDatas?.length > 0) {
                                                    let newII = [];
                                                    for (let ii of i.pageDatas) {
                                                        if (["最新微博", "特别关注", "好友圈", "视频"].includes(ii?.title)) {
                                                            newII.push(ii);
                                                        }
                                                        else {
                                                            continue;
                                                        }
                                                        if (ii?.title === "最新微博") {
                                                            ii.title = "微博";
                                                        }
                                                    }
                                                    i.pageDatas = newII;
                                                }
                                            }
                                            newCates.push(i);
                                        }
                                        item.categories = newCates;
                                    }
                                    newTabs.push(item);
                                }
                            }
                            obj.pageDatas = newTabs;
                        }
                    }
                    else if (url.includes("/2/messageflow/notice")) {
                        if (obj?.messages?.length > 0) {
                            let newMsgs = [];
                            for (let msg of obj.messages) {
                                if (msg?.msg_card?.ad_tag) {
                                    continue;
                                }
                                else {
                                    newMsgs.push(msg);
                                }
                            }
                            obj.messages = newMsgs;
                        }
                    }
                    else if (url.includes("/2/page")) {
                        if (obj?.cards?.length > 0) {
                            if (obj?.cards?.[0]?.card_group?.length > 0) {
                                obj.cards[0].card_group = obj.cards[0].card_group.filter((c) => !(c?.actionlog?.ext?.includes("ads_word") || c?.itemid?.includes("t:51") || c?.itemid?.includes("ads_word")));
                            }
                            obj.cards = obj.cards.filter((i) => !(i?.itemid?.includes("feed_-_invite") ||
                                i?.itemid?.includes("infeed_friends_recommend") ||
                                i?.itemid?.includes("infeed_may_interest_in") ||
                                i?.itemid?.includes("infeed_pagemanual3") ||
                                i?.itemid?.includes("infeed_weibo_mall") ||
                                i?.mblog?.mblogtypename?.includes("广告")));
                        }
                        else if (obj?.card_group?.length > 0) {
                            obj.card_group = obj.card_group.filter((i) => i?.desc?.includes("你可能感兴趣的超话"));
                        }
                    }
                    else if (url.includes("/2/profile/container_timeline")) {
                        if (obj?.loadedInfo?.follow_guide_info) {
                            delete obj.loadedInfo.follow_guide_info;
                        }
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                if (item?.data?.left_hint?.[0]?.content === "全部微博(0)" && item?.data?.card_type === 216) {
                                    break;
                                }
                                else if (/内容/.test(item?.data?.name) && item?.data?.card_type === 58) {
                                    break;
                                }
                                else {
                                    if (item?.category === "card") {
                                        if ([58, 216].includes(item?.data?.card_type)) {
                                            if (/没有公开博文，为你推荐以下精彩内容/.test(item?.data?.name)) {
                                                continue;
                                            }
                                        }
                                        newItems.push(item);
                                    }
                                    else if (item?.category === "group") {
                                        if (item?.header?.data?.icon) {
                                            delete item.header.data.icon;
                                        }
                                        if (item?.itemId?.includes("INTEREST_PEOPLE")) {
                                            continue;
                                        }
                                        if (item?.profile_type_id === "weibo_cardpics") {
                                            continue;
                                        }
                                        if (item?.items?.length > 0) {
                                            let newII = [];
                                            for (let ii of item.items) {
                                                if (ii?.category === "feed") {
                                                    removeAvatar(ii?.data);
                                                    removeFeedAd(ii?.data);
                                                    removeVoteInfo(ii?.data);
                                                    if (ii?.data?.enable_comment_guide) {
                                                        ii.data.enable_comment_guide = false;
                                                    }
                                                    newII.push(ii);
                                                }
                                                else if (ii?.category === "card") {
                                                    if ([10, 48, 176].includes(ii?.data?.card_type)) {
                                                        continue;
                                                    }
                                                    if (ii?.data?.rightImage) {
                                                        delete ii.data.rightImage;
                                                    }
                                                    if (ii?.data?.backgroundImage) {
                                                        delete ii.data.backgroundImage;
                                                    }
                                                    newII.push(ii);
                                                }
                                            }
                                            item.items = newII;
                                        }
                                        newItems.push(item);
                                    }
                                    else if (item?.category === "feed") {
                                        if (!isAd(item?.data)) {
                                            removeFeedAd(item?.data);
                                            removeVoteInfo(item?.data);
                                            if (item?.data?.source?.includes("生日动态")) {
                                                continue;
                                            }
                                            if (item?.data?.title?.text !== "热门" && item?.data?.title?.structs?.length > 0) {
                                                continue;
                                            }
                                            newItems.push(item);
                                        }
                                    }
                                }
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/profile/dealatt") || url.includes("/2/friendships/")) {
                        if (obj?.cards?.length > 0) {
                            obj.cards = [];
                        }
                        if (obj?.toolbar_menus_new?.items?.length > 0) {
                            let toolbar = obj.toolbar_menus_new;
                            let newTools = [];
                            for (let item of toolbar.items) {
                                if (item?.identifier === "recommend") {
                                    continue;
                                }
                                else if (/reward_/.test(item?.identifier)) {
                                    continue;
                                }
                                else {
                                    newTools.push(item);
                                }
                            }
                            toolbar.items = newTools;
                        }
                    }
                    else if (url.includes("/2/profile/me")) {
                        if (obj?.vipHeaderBgImage) {
                            delete obj.vipHeaderBgImage;
                        }
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                let itemId = item.itemId;
                                if (itemId === "profileme_mine") {
                                    if (item?.header) {
                                        if (item?.header?.vipView) {
                                            delete item.header.vipView;
                                        }
                                        if (item?.header?.vipCenter) {
                                            delete item.header.vipCenter;
                                        }
                                        if (item?.header?.vipIcon) {
                                            delete item.header.vipIcon;
                                        }
                                    }
                                    if (item?.items?.length > 0) {
                                        for (let d of item.items) {
                                            if (d.itemId === "mainnums_friends") {
                                                let s = d.click.modules[0].scheme;
                                                d.click.modules[0].scheme = s.replace("231093_-_selfrecomm", "231093_-_selffollowed");
                                            }
                                        }
                                    }
                                    newItems.push(item);
                                }
                                else if (itemId === "100505_-_top8") {
                                    if (item?.items?.length > 0) {
                                        item.items = item.items.filter((i) => i?.itemId === "100505_-_album" ||
                                            i?.itemId === "100505_-_like" ||
                                            i?.itemId === "100505_-_watchhistory" ||
                                            i?.itemId === "100505_-_draft");
                                    }
                                    newItems.push(item);
                                }
                                else if (itemId === "100505_-_manage") {
                                    if (item?.style) {
                                        delete item.style;
                                    }
                                    if (item?.images) {
                                        delete item.images;
                                    }
                                    newItems.push(item);
                                }
                                else if (itemId === "100505_-_manage2") {
                                    if (item?.footer) {
                                        delete item.footer;
                                    }
                                    if (item?.body) {
                                        delete item.body;
                                    }
                                    newItems.push(item);
                                }
                                else if (itemId === "100505_-_chaohua" || itemId === "100505_-_recentlyuser") {
                                    newItems.push(item);
                                }
                                else {
                                    continue;
                                }
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/profile/statuses/tab")) {
                        if (obj?.cards?.length > 0) {
                            let newCards = [];
                            for (let card of obj.cards) {
                                if (card?.card_group?.length > 0) {
                                    let newGroup = [];
                                    for (let group of card.card_group) {
                                        let cardType = group.card_type;
                                        if (cardType === 22) {
                                            continue;
                                        }
                                        if (group?.mblog) {
                                            removeAvatar(group?.mblog);
                                            removeVoteInfo(group?.mblog);
                                        }
                                        newGroup.push(group);
                                    }
                                    card.card_group = newGroup;
                                    newCards.push(card);
                                }
                                else {
                                    if (card?.mblog) {
                                        removeAvatar(card?.mblog);
                                        removeVoteInfo(card?.mblog);
                                    }
                                    newCards.push(card);
                                }
                            }
                            obj.cards = newCards;
                        }
                        if (obj?.cardlistInfo?.page_type === "08") {
                            delete obj.cardlistInfo;
                        }
                    }
                    else if (url.includes("/2/profile/userinfo")) {
                        if (obj?.header?.data?.userInfo?.avatar_extend_info) {
                            delete obj.header.data.userInfo.avatar_extend_info;
                        }
                        if (obj?.profileSkin?.data) {
                            delete obj.profileSkin.data;
                        }
                        if (obj?.footer?.data) {
                            let toolbar = obj.footer.data.toolbar_menus_new;
                            if (toolbar?.lottie_guide) {
                                delete toolbar.lottie_guide;
                            }
                            if (toolbar?.servicePopup?.subData) {
                                delete toolbar.servicePopup.subData;
                            }
                            if (toolbar?.items?.length > 0) {
                                let newTools = [];
                                for (let item of toolbar.items) {
                                    if (item?.identifier === "recommend") {
                                        continue;
                                    }
                                    else if (item?.identifier === "urge") {
                                        continue;
                                    }
                                    else if (/reward_/.test(item?.identifier)) {
                                        continue;
                                    }
                                    else {
                                        newTools.push(item);
                                    }
                                }
                                toolbar.items = newTools;
                            }
                        }
                    }
                    else if (url.includes("/2/push/active")) {
                        if (obj?.compose_add_guide) {
                            delete obj.compose_add_guide;
                        }
                        if (obj?.floating_windows_force_show) {
                            delete obj.floating_windows_force_show;
                        }
                        if (obj?.interceptad) {
                            delete obj.interceptad;
                        }
                        if (obj?.interceptad_cardlist) {
                            delete obj.interceptad_cardlist;
                        }
                        if (obj?.loginconfig) {
                            delete obj.loginconfig;
                        }
                        if (obj?.profile_lotties) {
                            delete obj.profile_lotties;
                        }
                        if (obj?.ug_red_paper) {
                            delete obj.ug_red_paper;
                        }
                        if (obj?.weibo_pic_banner) {
                            delete obj.weibo_pic_banner;
                        }
                        if (obj?.disable_floating_window) {
                            obj.disable_floating_window = "1";
                        }
                        if (obj?.feed_redpacket) {
                            obj.feed_redpacket.starttime = "2208960000";
                            obj.feed_redpacket.interval = "31536000";
                            obj.feed_redpacket.endtime = "2209046399";
                            if (obj?.feed_redpacket?.finish_icon) {
                                delete obj.feed_redpacket.finish_icon;
                            }
                            if (obj?.feed_redpacket?.guide) {
                                delete obj.feed_redpacket.guide;
                            }
                            if (obj?.feed_redpacket?.icon) {
                                delete obj.feed_redpacket.icon;
                            }
                            if (obj?.feed_redpacket?.pre_icon) {
                                delete obj.feed_redpacket.pre_icon;
                            }
                        }
                        if (obj?.floating_window_for_live_streaming) {
                            obj.floating_window_for_live_streaming = false;
                        }
                        if (obj?.floating_window_show_interval) {
                            obj.floating_window_show_interval = 31536000;
                        }
                        if (obj?.floating_windows?.length > 0) {
                            obj.floating_windows = obj.floating_windows.filter((i) => !/(?:^ad_?|red_pocket|ug_high_priority)/.test(i?.subtype));
                        }
                    }
                    else if (url.includes("/2/search/")) {
                        if (url.includes("container_timeline")) {
                            if (obj?.loadedInfo) {
                                delete obj.loadedInfo;
                            }
                            if (obj?.items?.length > 0) {
                                let newItems = [];
                                for (let item of obj.items) {
                                    if (item?.category === "feed") {
                                        if (!isAd(item?.data)) {
                                            removeFeedAd(item?.data);
                                            newItems.push(item);
                                        }
                                    }
                                    else if (item?.category === "card") {
                                        if ([19, 22, 118, 206, 208, 217, 236, 249, 261].includes(item?.data?.card_type)) {
                                            continue;
                                        }
                                        else if (item?.data?.itemid === "ads_slide") {
                                            continue;
                                        }
                                        else if (item?.data?.cate_id === "1114") {
                                            continue;
                                        }
                                        else if (item?.data.hasOwnProperty("rank")) {
                                            continue;
                                        }
                                        else {
                                            newItems.push(item);
                                        }
                                    }
                                    else if (item?.category === "cell") {
                                        newItems.push(item);
                                    }
                                    else if (item?.category === "group") {
                                        if (item?.item_category === "insert_item") {
                                            continue;
                                        }
                                        else {
                                            if (item?.items?.length > 0) {
                                                let newII = [];
                                                for (let ii of item.items) {
                                                    if ([118, 182, 192, 217, 247, 264].includes(ii?.data?.card_type)) {
                                                        continue;
                                                    }
                                                    else if (ii?.data?.cate_id === "1114") {
                                                        continue;
                                                    }
                                                    else {
                                                        removeFeedAd(ii?.data);
                                                        newII.push(ii);
                                                    }
                                                }
                                                item.items = newII;
                                            }
                                        }
                                        newItems.push(item);
                                    }
                                }
                                obj.items = newItems;
                            }
                        }
                        else if (url.includes("finder")) {
                            if (obj?.channelInfo?.channels?.length > 0) {
                                let newChannels = [];
                                for (let channel of obj.channelInfo.channels) {
                                    if (["band_channel", "discover_channel", "trends_channel"].includes(channel?.key)) {
                                        let payload = channel.payload;
                                        if (payload) {
                                            if (payload?.loadedInfo) {
                                                if (payload?.loadedInfo?.searchBarContent?.length > 0) {
                                                    payload.loadedInfo.searchBarContent = [];
                                                }
                                                if (payload?.loadedInfo?.headerBack?.channelStyleMap) {
                                                    delete payload.loadedInfo.headerBack.channelStyleMap;
                                                }
                                                if (payload?.loadedInfo?.searchBarStyleInfo) {
                                                    delete payload.loadedInfo.searchBarStyleInfo;
                                                }
                                            }
                                            if (payload?.items?.length > 0) {
                                                let newItems = [];
                                                for (let item of payload.items) {
                                                    if (item?.category === "feed") {
                                                        if (!isAd(item?.data)) {
                                                            removeFeedAd(item.data);
                                                            newItems.push(item);
                                                        }
                                                    }
                                                    else if (item?.category === "card") {
                                                        if ([19, 22, 118, 206, 208, 217, 236, 249, 261].includes(item?.data?.card_type)) {
                                                            continue;
                                                        }
                                                        else if (item?.data?.itemid === "ads_slide") {
                                                            continue;
                                                        }
                                                        else if (item?.data?.cate_id === "1114") {
                                                            continue;
                                                        }
                                                        else if (item?.data.hasOwnProperty("rank")) {
                                                            continue;
                                                        }
                                                        else {
                                                            newItems.push(item);
                                                        }
                                                    }
                                                    else if (item?.category === "cell") {
                                                        newItems.push(item);
                                                    }
                                                    else if (item?.category === "group") {
                                                        if (item?.item_category === "insert_item") {
                                                            continue;
                                                        }
                                                        else {
                                                            if (item?.items?.length > 0) {
                                                                let newII = [];
                                                                for (let ii of item.items) {
                                                                    if ([118, 182, 192, 217, 247, 264].includes(ii?.data?.card_type)) {
                                                                        continue;
                                                                    }
                                                                    else if (ii?.data?.cate_id === "1114") {
                                                                        continue;
                                                                    }
                                                                    else {
                                                                        removeFeedAd(ii?.data);
                                                                        newII.push(ii);
                                                                    }
                                                                }
                                                                item.items = newII;
                                                            }
                                                        }
                                                        newItems.push(item);
                                                    }
                                                }
                                                payload.items = newItems;
                                            }
                                        }
                                        newChannels.push(channel);
                                    }
                                    else {
                                        continue;
                                    }
                                }
                                obj.channelInfo.channels = newChannels;
                            }
                            if (obj?.channelInfo?.moreChannels) {
                                delete obj.channelInfo.moreChannels;
                            }
                            if (obj?.header?.insert_data) {
                                delete obj.header.insert_data;
                            }
                            if (obj?.header?.data?.items?.length > 0) {
                                let newItems = [];
                                for (let item of obj.header.data.items) {
                                    if (item?.category === "card") {
                                        if ([19, 22, 118, 206, 208, 217, 236, 249, 261].includes(item?.data?.card_type)) {
                                            continue;
                                        }
                                        if (item?.data.hasOwnProperty("rank")) {
                                            continue;
                                        }
                                    }
                                    else if (item?.category === "group") {
                                        if (item?.items?.length > 0) {
                                            let newII = [];
                                            for (let i of item.items) {
                                                if ([118, 182, 192, 217, 247, 264].includes(i?.data?.card_type)) {
                                                    continue;
                                                }
                                                else {
                                                    newII.push(i);
                                                }
                                            }
                                            item.items = newII;
                                        }
                                    }
                                    newItems.push(item);
                                }
                                obj.header.data.items = newItems;
                            }
                        }
                    }
                    else if (url.includes("/2/searchall")) {
                        if (obj?.header?.data) {
                            const items = ["bg_img", "background_scheme", "background_url"];
                            for (let i of items) {
                                delete obj.header.data[i];
                            }
                        }
                        if (obj?.loadedInfo?.serviceMap?.layer) {
                            delete obj.loadedInfo.serviceMap.layer;
                        }
                        if (obj?.footer) {
                            if (obj?.footer?.data?.bg_lottie) {
                                delete obj.footer.data.bg_lottie;
                            }
                            if (obj?.footer?.data?.bg_lottie_dark) {
                                delete obj.footer.data.bg_lottie_dark;
                            }
                            if (obj?.footer?.data?.discuss_avatars) {
                                delete obj.footer.data.discuss_avatars;
                            }
                            if (obj?.footer?.data?.menus?.length > 0) {
                                obj.footer.data.menus = obj.footer.data.menus.filter((i) => !/\d+_ai\./.test(i?.pic));
                            }
                        }
                        if (obj?.cards?.length > 0) {
                            let newCards = [];
                            for (let card of obj.cards) {
                                if (card?.card_group?.length > 0) {
                                    let newGroup = [];
                                    for (let group of card.card_group) {
                                        if (group?.card_type === 22) {
                                            continue;
                                        }
                                        else if (group?.card_type === 42 && group?.title_extra_text === "广告") {
                                            continue;
                                        }
                                        else if (group?.card_type === 3 && group?.pics?.length > 0) {
                                            continue;
                                        }
                                        else {
                                            if (group?.mblog) {
                                                if (!isAd(group?.mblog)) {
                                                    if (group?.mblog?.title_source) {
                                                        delete group.mblog.title_source;
                                                    }
                                                    if (group?.mblog?.source_tag_struct) {
                                                        delete group.mblog.source_tag_struct;
                                                    }
                                                    if (group?.mblog?.extend_info) {
                                                        delete group.mblog.extend_info;
                                                    }
                                                    if (group?.mblog?.common_struct) {
                                                        delete group.mblog.common_struct;
                                                    }
                                                    removeAvatar(group?.mblog);
                                                    removeVoteInfo(group?.mblog);
                                                    if (group?.mblog?.is_ad === 1) {
                                                        continue;
                                                    }
                                                    newGroup.push(group);
                                                }
                                            }
                                            else {
                                                newGroup.push(group);
                                            }
                                        }
                                    }
                                    card.card_group = newGroup;
                                    newCards.push(card);
                                }
                                else {
                                    if (card?.mblog) {
                                        if (!isAd(card?.mblog)) {
                                            removeAvatar(card?.mblog);
                                            if (card?.mblog?.title_source) {
                                                delete card.mblog.title_source;
                                            }
                                            if (card?.mblog?.source_tag_struct) {
                                                delete card.mblog.source_tag_struct;
                                            }
                                            if (card?.mblog?.extend_info) {
                                                delete card.mblog.extend_info;
                                            }
                                            if (card?.mblog?.common_struct) {
                                                delete card.mblog.common_struct;
                                            }
                                            removeVoteInfo(card?.mblog);
                                            if (card?.mblog?.page_info?.cards?.length > 0) {
                                                let page = card.mblog.page_info;
                                                for (let i of page.cards) {
                                                    if (i?.media_info?.vote_info) {
                                                        delete i.media_info.vote_info;
                                                    }
                                                }
                                            }
                                            newCards.push(card);
                                        }
                                    }
                                }
                            }
                            obj.cards = newCards;
                        }
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                if (!isAd(item?.data)) {
                                    if (item?.category === "feed") {
                                        removeFeedAd(item?.data);
                                        removeVoteInfo(item?.data);
                                        newItems.push(item);
                                    }
                                    else if (item?.category === "group") {
                                        if (item?.items?.length > 0) {
                                            let newII = [];
                                            for (let ii of item.items) {
                                                if (ii?.cate_id === "638" && ii?.readtimetype === "card") {
                                                    continue;
                                                }
                                                else {
                                                    if (!isAd(ii?.data)) {
                                                        removeFeedAd(ii?.data);
                                                        if ([3, 17, 22, 30, 42, 89, 101, 206].includes(ii?.data?.card_type)) {
                                                            continue;
                                                        }
                                                        else if (ii?.data?.card_type === 4 && ii?.data?.cate_id === "640") {
                                                            continue;
                                                        }
                                                        else if (ii?.data?.card_type === 42 && ii?.data?.is_ads === true) {
                                                            continue;
                                                        }
                                                        newII.push(ii);
                                                    }
                                                }
                                            }
                                            item.items = newII;
                                        }
                                        newItems.push(item);
                                    }
                                    else {
                                        newItems.push(item);
                                    }
                                }
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/shproxy/chaohua/discovery/searchactive")) {
                        if (obj?.items?.length > 0) {
                            obj.items = obj.items.filter((i) => i?.data?.card_type !== 1007);
                        }
                    }
                    else if (url.includes("/2/statuses/container_detail?")) {
                        if (obj?.pageHeader?.data?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.pageHeader.data.items) {
                                if (item?.category === "card" && item?.data?.is_ad_card === 1) {
                                    continue;
                                }
                                else if (item?.category === "card" && item?.data?.card_type === 227) {
                                    continue;
                                }
                                else if (item?.category === "group" && item?.items?.length > 0) {
                                    continue;
                                }
                                else if (item?.category === "wboxcard" && item?.data?.card_type === 236) {
                                    continue;
                                }
                                else if (item?.data?.itemid === "top_searching" && item?.data?.card_type === 248) {
                                    continue;
                                }
                                else {
                                    newItems.push(item);
                                }
                            }
                            obj.pageHeader.data.items = newItems;
                        }
                        if (obj?.detailInfo?.extend?.ai_search_share) {
                            delete obj.detailInfo.extend.ai_search_share;
                        }
                        if (obj?.detailInfo?.extend?.follow_data) {
                            delete obj.detailInfo.extend.follow_data;
                        }
                        if (obj?.detailInfo?.extend?.reward_info) {
                            delete obj.detailInfo.extend.reward_info;
                        }
                        if (obj?.detailInfo?.extend?.sharecontent) {
                            delete obj.detailInfo.extend.sharecontent;
                        }
                        if (obj?.detailInfo?.status?.reward_info) {
                            delete obj.detailInfo.status.reward_info;
                        }
                    }
                    else if (url.includes("/2/statuses/comments_expand_child")) {
                        if (obj?.items?.length > 0) {
                            for (let item of obj.items) {
                                removeAvatar(item?.data);
                            }
                        }
                    }
                    else if (url.includes("/2/statuses/container_detail_comment")) {
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                if (item?.type !== "trend" && item?.type !== "comment_header_tip") {
                                    if (item?.data) {
                                        removeAvatar(item?.data);
                                        if (item?.data?.card_type === 236 || item?.data?.itemid === "ai_summary_entrance_real_show") {
                                            continue;
                                        }
                                        if (item?.data?.comment_bubble) {
                                            delete item.data.comment_bubble;
                                        }
                                        if (item?.data?.comment_bullet_screens_message) {
                                            delete item.data.comment_bullet_screens_message;
                                        }
                                        if (item?.data?.hot_icon) {
                                            delete item.data.hot_icon;
                                        }
                                        if (item?.data?.vip_button) {
                                            delete item.data.vip_button;
                                        }
                                    }
                                    if (item?.items?.length > 0) {
                                        let newII = [];
                                        for (let ii of item.items) {
                                            if (ii?.data) {
                                                removeAvatar(ii?.data);
                                                if (/微博智搜/.test(ii?.data?.user?.name)) {
                                                    continue;
                                                }
                                                if (ii?.data?.comment_bubble) {
                                                    delete ii.data.comment_bubble;
                                                }
                                                if (ii?.data?.comment_bullet_screens_message) {
                                                    delete ii.data.comment_bullet_screens_message;
                                                }
                                                if (ii?.data?.hot_icon) {
                                                    delete ii.data.hot_icon;
                                                }
                                                if (ii?.data?.vip_button) {
                                                    delete ii.data.vip_button;
                                                }
                                            }
                                            newII.push(ii);
                                        }
                                        item.items = newII;
                                    }
                                    newItems.push(item);
                                }
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/statuses/container_timeline_hot") || url.includes("/2/statuses/unread_hot_timeline")) {
                        for (let s of ["ad", "advertises", "trends", "headers"]) {
                            if (obj?.[s]) {
                                delete obj[s];
                            }
                        }
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                if (!isAd(item?.data)) {
                                    if (item?.category === "feed") {
                                        removeFeedAd(item?.data);
                                        removeVoteInfo(item?.data);
                                        newItems.push(item);
                                    }
                                    else {
                                        continue;
                                    }
                                }
                            }
                            obj.items = newItems;
                        }
                        if (obj?.statuses?.length > 0) {
                            let newStatuses = [];
                            for (let item of obj.statuses) {
                                if (!isAd(item)) {
                                    removeFeedAd(item);
                                    newStatuses.push(item);
                                }
                            }
                            obj.statuses = newStatuses;
                        }
                    }
                    else if (url.includes("/2/statuses/container_timeline?") || url.includes("/2/statuses/container_timeline_unread")) {
                        if (obj?.loadedInfo?.headers) {
                            delete obj.loadedInfo.headers;
                        }
                        if (obj?.common_struct) {
                            delete obj.common_struct;
                        }
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                if (!isAd(item?.data) && !isAd(item?.status)) {
                                    if (item?.category === "dynamic") {
                                        if (item?.status?.action_button_icon_dic) {
                                            delete item.status.action_button_icon_dic;
                                        }
                                        removeFeedAd(item?.status);
                                        removeVoteInfo(item?.status);
                                        if (item.status?.title?.structs) {
                                            continue;
                                        }
                                        if (item?.status?.screen_name_suffix_new?.length > 0) {
                                            if (item?.status?.screen_name_suffix_new?.[3]?.content === "快转了") {
                                                continue;
                                            }
                                        }
                                        if (item?.status?.title?.text?.includes("精选")) {
                                            continue;
                                        }
                                        if (item?.status?.user?.following === false) {
                                            continue;
                                        }
                                        if (item?.status?.user?.unfollowing_recom_switch === 1) {
                                            item.status.user.unfollowing_recom_switch = 0;
                                        }
                                        if (item?.status?.tag_struct?.length > 0) {
                                            item.status.tag_struct = [];
                                        }
                                        newItems.push(item);
                                    }
                                    else if (item?.category === "feed") {
                                        if (item?.data?.action_button_icon_dic) {
                                            delete item.data.action_button_icon_dic;
                                        }
                                        removeFeedAd(item?.data);
                                        removeVoteInfo(item?.data);
                                        if (item.data?.title?.structs) {
                                            continue;
                                        }
                                        if (item?.data?.screen_name_suffix_new?.length > 0) {
                                            if (item?.data?.screen_name_suffix_new?.[3]?.content === "快转了") {
                                                continue;
                                            }
                                        }
                                        if (item?.data?.title?.text?.includes("精选")) {
                                            continue;
                                        }
                                        if (item?.data?.user?.following === false) {
                                            continue;
                                        }
                                        if (item?.data?.user?.unfollowing_recom_switch === 1) {
                                            item.data.user.unfollowing_recom_switch = 0;
                                        }
                                        if (item?.data?.tag_struct?.length > 0) {
                                            item.data.tag_struct = [];
                                        }
                                        newItems.push(item);
                                    }
                                    else if (item?.category === "feedBiz") {
                                        newItems.push(item);
                                    }
                                    else {
                                        continue;
                                    }
                                }
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/statuses/container_timeline_topic")) {
                        if (obj?.header?.data?.follow_guide_info) {
                            delete obj.header.data.follow_guide_info;
                        }
                        if (obj?.items?.length > 0) {
                            let newItems = [];
                            for (let item of obj.items) {
                                if (item?.category === "feed") {
                                    removeAvatar(item?.data);
                                    if (!isAd(item?.data)) {
                                        if (item?.data?.title?.text?.includes("新人导师")) {
                                            delete item.data.title;
                                        }
                                        newItems.push(item);
                                    }
                                }
                                else if (item?.category === "card") {
                                    if ([4, 197, 236, 1012].includes(item?.data?.card_type)) {
                                        continue;
                                    }
                                    else {
                                        if (item?.data?.card_type === 31 && item?.data?.hotwords?.length > 0) {
                                            item.data.hotwords = [];
                                        }
                                        if (item?.data?.card_type === 22 && item?.data.hasOwnProperty("card_ad_style")) {
                                            continue;
                                        }
                                        newItems.push(item);
                                    }
                                }
                                else if (item?.category === "group") {
                                    if (item?.style?.topHover) {
                                        delete item.style.topHover;
                                    }
                                    if (item?.items?.length > 0) {
                                        if (item?.itemId === null) {
                                            let newII = [];
                                            for (let ii of item.items) {
                                                if (ii?.data.hasOwnProperty("itemid")) {
                                                    if (ii?.data?.itemid?.includes("mine_topics")) {
                                                        newII.push(ii);
                                                    }
                                                    else if (ii?.data?.itemid?.includes("tab_search_input")) {
                                                        if (ii?.data?.hotwords) {
                                                            ii.data.hotwords = [{ word: "搜索超话" }];
                                                        }
                                                        newII.push(ii);
                                                    }
                                                    else if (ii?.data?.itemid?.includes("poiRankList")) {
                                                        newII.push(ii);
                                                    }
                                                }
                                                else {
                                                    newII.push(ii);
                                                }
                                                removeAvatar(ii?.data);
                                            }
                                            item.items = newII;
                                        }
                                        else {
                                            let newII = [];
                                            for (let ii of item.items) {
                                                if (ii?.data) {
                                                    if (ii?.data?.common_struct) {
                                                        delete ii.data.common_struct;
                                                    }
                                                    removeAvatar(ii?.data);
                                                    if ([1008, 1024].includes(ii?.data?.card_type)) {
                                                        continue;
                                                    }
                                                    else {
                                                        newII.push(ii);
                                                    }
                                                }
                                            }
                                            item.items = newII;
                                        }
                                    }
                                    if (item?.header?.arrayText?.contents?.length > 0) {
                                        continue;
                                    }
                                    newItems.push(item);
                                }
                                else {
                                    continue;
                                }
                            }
                            obj.items = newItems;
                        }
                    }
                    else if (url.includes("/2/statuses/extend")) {
                        if (obj?.trend?.extra_struct?.extBtnInfo?.btn_picurl?.includes("ad")) {
                            delete obj.trend;
                        }
                        if (obj.trend?.titles) {
                            let title = obj.trend.titles.title;
                            if (/(博主好物种草|相关推荐|专区)/.test(title)) {
                                delete obj.trend;
                            }
                        }
                        const item = [
                            "bubble_guide_data",
                            "button_extra_info",
                            "display_info",
                            "extend_info",
                            "floating_button",
                            "follow_data",
                            "head_cards",
                            "highlight",
                            "interaction_extra_info",
                            "page_alerts",
                            "reward_info",
                            "source_tag_struct",
                            "top_cards"
                        ];
                        if (obj) {
                            item.forEach((i) => {
                                delete obj[i];
                            });
                        }
                        if (obj?.custom_action_list?.length > 0) {
                            let newActions = [];
                            for (let item of obj.custom_action_list) {
                                let type = item.type;
                                let add = itemMenusConfig[type];
                                if (type === "mblog_menus_copy_url") {
                                    newActions.unshift(item);
                                }
                                else if (add) {
                                    newActions.push(item);
                                }
                            }
                            obj.custom_action_list = newActions;
                        }
                        if (obj?.has_common_struct) {
                            obj.has_common_struct = false;
                        }
                        if (obj?.enable_comment_guide) {
                            obj.enable_comment_guide = false;
                        }
                    }
                    else if (url.includes("/2/statuses/repost_timeline")) {
                        if (obj?.hot_reposts?.length > 0) {
                            let newReposts = [];
                            for (let item of obj.hot_reposts) {
                                if (!isAd(item)) {
                                    newReposts.push(item);
                                }
                            }
                            obj.hot_reposts = newReposts;
                        }
                        if (obj?.reposts?.length > 0) {
                            let newReposts = [];
                            for (let item of obj.reposts) {
                                if (!isAd(item)) {
                                    newReposts.push(item);
                                }
                            }
                            obj.reposts = newReposts;
                        }
                    }
                    else if (url.includes("/2/statuses/show")) {
                        removeFeedAd(obj);
                        if (obj?.text) {
                            removeFeedAd(obj.text);
                        }
                        if (obj?.reward_info) {
                            delete obj.reward_info;
                        }
                        removeVoteInfo(obj);
                    }
                    else if (url.includes("/2/video/full_screen_stream")) {
                        if (obj?.statuses?.length > 0) {
                            let newStatuses = [];
                            for (let item of obj.statuses) {
                                if (!isAd(item)) {
                                    removeAvatar(item);
                                    if (item?.video_info?.tags?.length > 0) {
                                        item.video_info.tags = [];
                                    }
                                    newStatuses.push(item);
                                }
                            }
                            obj.statuses = newStatuses;
                        }
                    }
                    else if (url.includes("/2/video/tiny_stream_mid_detail")) {
                        if (obj?.status?.video_info?.shopping?.length > 0) {
                            obj.status.video_info.shopping = [];
                        }
                        if (obj?.status?.video_info?.bottom_banner) {
                            obj.status.video_info.bottom_banner = {};
                        }
                        if (obj?.status?.video_info?.float_info) {
                            obj.status.video_info.float_info = {};
                        }
                    }
                    else if (url.includes("/2/video/tiny_stream_video_list")) {
                        if (obj?.statuses?.length > 0) {
                            obj.statuses = [];
                        }
                        if (obj?.tab_list?.length > 0) {
                            obj.tab_list = [];
                        }
                    }
                    else if (url.includes("/2/!/huati/discovery_home_bottom_channels")) {
                        if (obj?.button_configs) {
                            delete obj.button_configs;
                        }
                        if (obj?.channelInfo?.channel_list?.length > 0) {
                            obj.channelInfo.channel_list = obj.channelInfo.channel_list.filter((t) => t?.title !== "广场");
                        }
                    }
                    else if (url.includes("/aj/appicon/list")) {
                        if (obj?.data?.list?.length > 0) {
                            for (let item of obj.data.list) {
                                if (item?.cardType) {
                                    item.cardType = 2;
                                }
                            }
                        }
                    }
                    else if (url.includes("/v1/ad/preload") || url.includes("/v2/ad/preload")) {
                        if (obj?.ads?.length > 0) {
                            for (let item of obj.ads) {
                                item.start_time = 3818332800;
                                item.end_time = 3818419199;
                                item.daily_display_cnt = 50;
                                item.display_duration = 0;
                            }
                            if (obj?.ads?.creatives?.length > 0) {
                                for (let item of obj.ads.creatives) {
                                    item.start_time = 3818332800;
                                    item.end_time = 3818419199;
                                    item.daily_display_cnt = 50;
                                    item.display_duration = 0;
                                }
                            }
                        }
                    }
                    else if (url.includes("/wbapplua/wbpullad.lua") || url.includes("/preload/get_ad")) {
                        if (obj?.cached_ad?.ads?.length > 0) {
                            for (let item of obj.cached_ad.ads) {
                                item.show_count = 50;
                                item.duration = 0;
                                item.start_date = 3818332800;
                                item.end_date = 3818419199;
                            }
                        }
                    }
                    $done({ body: JSON.stringify(obj) });
                }
                function isAd(data) {
                    if (data?.mblogtypename === "广告") {
                        return true;
                    }
                    if (data?.mblogtypename === "热推") {
                        return true;
                    }
                    if (data?.readtimetype === "adMblog") {
                        return true;
                    }
                    if (data?.promotion?.recommend === "广告") {
                        return true;
                    }
                    if (data?.promotion?.recommend === "热推") {
                        return true;
                    }
                    if (data?.promotion?.type?.includes("ad")) {
                        return true;
                    }
                    if (data?.content_auth_info?.content_auth_title === "广告") {
                        return true;
                    }
                    if (data?.content_auth_info?.content_auth_title === "热推") {
                        return true;
                    }
                    if (data?.ads_material_info?.is_ads === true) {
                        return true;
                    }
                    return false;
                }
                function removeAvatar(data) {
                    if (data?.block_card_bg) {
                        delete data.block_card_bg;
                    }
                    if (data?.buttons) {
                        delete data.buttons;
                    }
                    if (data?.cardid) {
                        delete data.cardid;
                    }
                    if (data?.icons) {
                        delete data.icons;
                    }
                    if (data?.mblog_buttons) {
                        delete data.mblog_buttons;
                    }
                    if (data?.pic_bg_new) {
                        delete data.pic_bg_new;
                    }
                    if (data?.user?.avatargj_id) {
                        delete data.user.avatargj_id;
                    }
                    if (data?.user?.avatar_extend_info) {
                        delete data.user.avatar_extend_info;
                    }
                    if (data?.user?.cardid) {
                        delete data.user.cardid;
                    }
                    if (data?.user?.icons) {
                        delete data.user.icons;
                    }
                    if (data?.user?.mbtype) {
                        delete data.user.mbtype;
                    }
                }
                function removeFeedAd(item) {
                    removeAvatar(item);
                    if (item?.retweeted_status) {
                        removeAvatar(item?.retweeted_status);
                    }
                    if (item?.common_struct) {
                        delete item.common_struct;
                    }
                    if (item?.comment_summary) {
                        delete item.comment_summary;
                    }
                    if (item?.extend_info) {
                        delete item.extend_info;
                    }
                    if (item?.semantic_brand_params) {
                        delete item.semantic_brand_params;
                    }
                }
                function removeVoteInfo(item) {
                    if (item?.page_info?.media_info?.vote_info) {
                        delete item.page_info.media_info.vote_info;
                    }
                }
            }).call(this);
        }).call(this, Object.prototype.hasOwnProperty.call(__wayxScope, "$request") ? __wayxScope["$request"] : (typeof $request === 'undefined' ? undefined : $request), Object.prototype.hasOwnProperty.call(__wayxScope, "$response") ? __wayxScope["$response"] : (typeof $response === 'undefined' ? undefined : $response), Object.prototype.hasOwnProperty.call(__wayxScope, "$done") ? __wayxScope["$done"] : (typeof $done === 'undefined' ? undefined : $done));
    });
})();
