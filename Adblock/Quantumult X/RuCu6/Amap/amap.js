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
    const __wayxDecodeText = (value, body) => (function (value, data, decoder) {
        const headers = value.headers || {};
        const header = name => headers[Object.keys(headers).find(key => key.toLowerCase() === name)];
        const type = String(header('content-type') || '');
        const charset = /;\s*charset\s*=\s*["']?([^;"'\s]+)/i.exec(type)?.[1];
        if (charset && !/^utf-?8$/i.test(charset))
            return data;
        if (type && !/^(?:text\/|application\/(?:[\w.+-]+\+)?(?:json|xml)(?:\s*;|\s*$))/i.test(type.trim()))
            return data;
        const encoding = header('content-encoding');
        if (encoding && !/^identity$/i.test(String(encoding).trim()))
            return data;
        return new decoder('utf-8', { fatal: true }).decode(data);
    })(value, body, (function (legacy, native = {}) {
        let legacyProvider;
        const text = value => { if (typeof value === 'symbol')
            throw new TypeError('Cannot convert a Symbol to a string'); return String(value); };
        const dictionary = value => { if (value === undefined || value === null)
            return {}; if (typeof value !== 'object' && typeof value !== 'function')
            throw new TypeError('Options must be an object'); return value; };
        const arrayBufferLength = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength').get;
        const typedPrototype = Object.getPrototypeOf(Uint8Array.prototype), typedGet = name => Object.getOwnPropertyDescriptor(typedPrototype, name).get, dataGet = name => Object.getOwnPropertyDescriptor(DataView.prototype, name).get;
        const typedName = Object.getOwnPropertyDescriptor(typedPrototype, Symbol.toStringTag).get, typedLength = typedGet('length'), typedBuffer = typedGet('buffer'), typedOffset = typedGet('byteOffset'), typedBytes = typedGet('byteLength'), dataBuffer = dataGet('buffer'), dataOffset = dataGet('byteOffset'), dataBytes = dataGet('byteLength'), setBytes = Uint8Array.prototype.set;
        const inputBytes = value => {
            if (value === undefined)
                return new Uint8Array(0);
            let length;
            try {
                length = arrayBufferLength.call(value);
            }
            catch { }
            if (length !== undefined)
                return new Uint8Array(value, 0, length);
            if (ArrayBuffer.isView(value)) {
                const typed = typedName.call(value) !== undefined, buffer = (typed ? typedBuffer : dataBuffer).call(value), offset = (typed ? typedOffset : dataOffset).call(value), size = (typed ? typedBytes : dataBytes).call(value);
                arrayBufferLength.call(buffer);
                return new Uint8Array(buffer, offset, size);
            }
            throw new TypeError('Expected an ArrayBuffer or view');
        };
        const scalar = (s, index) => { let cp = s.charCodeAt(index), read = 1; if (cp >= 0xd800 && cp <= 0xdbff) {
            const low = s.charCodeAt(index + 1);
            if (low >= 0xdc00 && low <= 0xdfff) {
                cp = 0x10000 + ((cp - 0xd800) << 10) + (low - 0xdc00);
                read = 2;
            }
            else
                cp = 0xfffd;
        }
        else if (cp >= 0xdc00 && cp <= 0xdfff)
            cp = 0xfffd; return { cp, read }; };
        const sequence = cp => cp <= 0x7f ? [cp] : cp <= 0x7ff ? [0xc0 | (cp >> 6), 0x80 | (cp & 63)] : cp <= 0xffff ? [0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)] : [0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)];
        const encoderInstances = new WeakSet();
        const encoderBrand = value => { if (!encoderInstances.has(value))
            throw new TypeError('Illegal TextEncoder receiver'); };
        class TextEncoder {
            constructor() { encoderInstances.add(this); }
            get encoding() { encoderBrand(this); return 'utf-8'; }
            encode(input = undefined) { encoderBrand(this); const s = input === undefined ? '' : text(input), out = []; for (let i = 0; i < s.length;) {
                const point = scalar(s, i);
                out.push(...sequence(point.cp));
                i += point.read;
            } return new Uint8Array(out); }
            encodeInto(input, destination) { encoderBrand(this); if (arguments.length < 2)
                throw new TypeError('Two arguments required'); const s = text(input); if (typedName.call(destination) !== 'Uint8Array')
                throw new TypeError('Uint8Array destination required'); const capacity = typedLength.call(destination); let read = 0, written = 0; while (read < s.length) {
                const point = scalar(s, read), bytes = sequence(point.cp);
                if (written + bytes.length > capacity)
                    break;
                setBytes.call(destination, bytes, written);
                written += bytes.length;
                read += point.read;
            } return { read, written }; }
        }
        const decoders = new WeakMap(), decoderState = value => { const state = decoders.get(value); if (!state)
            throw new TypeError('Illegal TextDecoder receiver'); return state; };
        const reset = state => { state.point = 0; state.seen = 0; state.need = 0; state.lower = 0x80; state.upper = 0xbf; };
        class TextDecoder {
            constructor(label = 'utf-8', options = undefined) {
                const encoding = text(label).replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '').toLowerCase(), opts = dictionary(options), fatal = !!opts.fatal, ignoreBOM = !!opts.ignoreBOM;
                let delegate;
                if (typeof native.TextDecoder === 'function') {
                    try {
                        delegate = new native.TextDecoder(encoding, { fatal, ignoreBOM });
                    }
                    catch (error) {
                        if (error.name !== 'RangeError')
                            throw error;
                    }
                }
                if (!delegate && !['utf-8', 'utf8', 'unicode-1-1-utf-8', 'unicode11utf8', 'unicode20utf8', 'x-unicode20utf8'].includes(encoding)) {
                    if (!legacy)
                        throw new RangeError('Encoding provider unavailable');
                    if (!legacyProvider)
                        legacyProvider = legacy();
                    delegate = new legacyProvider.TextDecoder(encoding, { fatal, ignoreBOM });
                }
                const state = { fatal, ignoreBOM, delegate, stream: false, bom: false };
                reset(state);
                decoders.set(this, state);
            }
            get encoding() { const state = decoderState(this); return state.delegate ? state.delegate.encoding : 'utf-8'; }
            get fatal() { return decoderState(this).fatal; }
            get ignoreBOM() { return decoderState(this).ignoreBOM; }
            decode(input = undefined, options = undefined) {
                const state = decoderState(this), bytes = inputBytes(input), opts = dictionary(options), stream = !!opts.stream, out = [];
                if (state.delegate)
                    return state.delegate.decode(bytes, { stream });
                if (!state.stream) {
                    reset(state);
                    state.bom = false;
                }
                state.stream = stream;
                const emit = cp => { if (!state.bom) {
                    state.bom = true;
                    if (cp === 0xfeff && !state.ignoreBOM)
                        return;
                } out.push(cp <= 0xffff ? String.fromCharCode(cp) : String.fromCharCode(0xd800 + ((cp - 0x10000) >> 10), 0xdc00 + ((cp - 0x10000) & 1023))); };
                const error = () => { reset(state); if (state.fatal)
                    throw new TypeError('Invalid UTF-8 data'); emit(0xfffd); };
                for (let i = 0; i < bytes.length; i++) {
                    const b = bytes[i];
                    if (!state.need) {
                        if (b <= 0x7f) {
                            emit(b);
                            continue;
                        }
                        if (b >= 0xc2 && b <= 0xdf) {
                            state.need = 1;
                            state.point = b & 31;
                            continue;
                        }
                        if (b >= 0xe0 && b <= 0xef) {
                            state.need = 2;
                            state.point = b & 15;
                            if (b === 0xe0)
                                state.lower = 0xa0;
                            if (b === 0xed)
                                state.upper = 0x9f;
                            continue;
                        }
                        if (b >= 0xf0 && b <= 0xf4) {
                            state.need = 3;
                            state.point = b & 7;
                            if (b === 0xf0)
                                state.lower = 0x90;
                            if (b === 0xf4)
                                state.upper = 0x8f;
                            continue;
                        }
                        error();
                        continue;
                    }
                    if (b < state.lower || b > state.upper) {
                        error();
                        i--;
                        continue;
                    }
                    state.lower = 0x80;
                    state.upper = 0xbf;
                    state.point = (state.point << 6) | (b & 63);
                    state.seen++;
                    if (state.seen === state.need) {
                        const cp = state.point;
                        reset(state);
                        emit(cp);
                    }
                }
                if (!stream && state.need)
                    error();
                return out.join('');
            }
        }
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        class PortableInvalidCharacterError extends Error {
            get name() { return 'InvalidCharacterError'; }
            get code() { return 5; }
            get [Symbol.toStringTag]() { return 'DOMException'; }
        }
        const invalid = () => { throw typeof DOMException === 'function' ? new DOMException('Invalid Base64 character', 'InvalidCharacterError') : new PortableInvalidCharacterError('Invalid Base64 character'); };
        function atob(value) { if (!arguments.length)
            throw new TypeError('One argument required'); let s = text(value).replace(/[\t\n\f\r ]/g, ''); if (s.length % 4 === 0)
            s = s.replace(/==?$/, ''); if (s.length % 4 === 1 || /[^A-Za-z0-9+/]/.test(s))
            invalid(); let bits = 0, buffer = 0, out = ''; for (let i = 0; i < s.length; i++) {
            buffer = (buffer << 6) | alphabet.indexOf(s[i]);
            bits += 6;
            if (bits >= 8) {
                bits -= 8;
                out += String.fromCharCode((buffer >> bits) & 255);
            }
        } return out; }
        function btoa(value) { if (!arguments.length)
            throw new TypeError('One argument required'); const s = text(value); let out = ''; for (let i = 0; i < s.length; i += 3) {
            const a = s.charCodeAt(i), b = s.charCodeAt(i + 1), c = s.charCodeAt(i + 2);
            if (a > 255 || b > 255 || c > 255)
                invalid();
            const word = (a << 16) | ((b || 0) << 8) | (c || 0);
            out += alphabet[(word >>> 18) & 63] + alphabet[(word >>> 12) & 63] + (i + 1 < s.length ? alphabet[(word >>> 6) & 63] : '=') + (i + 2 < s.length ? alphabet[word & 63] : '=');
        } return out; }
        return { TextEncoder, TextDecoder, atob, btoa };
    })(undefined, { TextDecoder: globalThis.TextDecoder }).TextDecoder);
    const __wayxView = (value, phase) => { if (value === undefined)
        return undefined; const result = Object.assign({}, value); if (typeof value.body !== 'string') {
        const data = __wayxBinary(value.bodyBytes) ? value.bodyBytes : value.body;
        if (__wayxBinary(data)) {
            const body = __wayxBytes(data);
            result.body = (typeof $response === 'undefined' ? 'request' : 'response') === phase && ["response"].includes(phase) ? __wayxDecodeText(value, body) : body;
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
            if (!$response.body)
                $done({});
            let obj = JSON.parse($response.body);
            if (url.includes("/aos/perception/publicTravel/beforeNavi")) {
                if (obj?.data?.common_data?.bus_plan_bottom_event?.data?.length > 0) {
                    obj.data.common_data.bus_plan_bottom_event.data = [];
                }
                if (obj?.data?.common_data?.bus_plan_bottom_tips?.data?.length > 0) {
                    obj.data.common_data.bus_plan_bottom_tips.data = [];
                }
                if (obj?.data?.common_data?.bus_plan_segment_event?.data?.length > 0) {
                    obj.data.common_data.bus_plan_segment_event.data = [];
                }
                if (obj?.data?.front_end?.assistant?.length > 0) {
                    obj.data.front_end.assistant = [];
                }
            }
            else if (url.includes("/boss/car/order/content_info")) {
                if (obj?.data?.lubanData?.benefitsCard?.dataList?.length > 0) {
                    obj.data.lubanData.benefitsCard.dataList = [];
                }
                if (obj?.data?.lubanData?.popup?.dataList?.length > 0) {
                    obj.data.lubanData.popup.dataList = [];
                }
                if (obj?.data?.lubanData?.skin?.dataList?.length > 0) {
                    obj.data.lubanData.skin.dataList = [];
                }
                if (obj?.data?.matrixData?.c3DiversionCard?.dataList?.length > 0) {
                    obj.data.matrixData.c3DiversionCard.dataList = [];
                }
                if (obj?.data?.matrixData?.DiversionCard?.dataList?.length > 0) {
                    obj.data.matrixData.DiversionCard.dataList = [];
                }
            }
            else if (url.includes("/boss/order_web/friendly_information")) {
                const items = ["banners", "carouselTips", "integratedBanners", "integratedTips", "skins", "skinAndTips", "tips"];
                if (obj?.data?.["105"]) {
                    for (let i of items) {
                        delete obj.data["105"][i];
                    }
                }
            }
            else if (url.includes("/bus/plan/integrate")) {
                if (obj?.data?.banner_lists?.data?.length > 0) {
                    obj.data.banner_lists.data = [];
                }
                if (obj?.data?.banner_lists?.tips?.length > 0) {
                    obj.data.banner_lists.tips = [];
                }
                if (obj?.data?.mixed_plans?.data?.taxiPlans?.length > 0) {
                    obj.data.mixed_plans.data.taxiPlans = [];
                }
            }
            else if (url.includes("/c3frontend/af-hotel/page/main")) {
                if (obj?.data?.modules) {
                    if (obj?.data?.modules?.CouponPortalCard) {
                        delete obj.data.modules.CouponPortalCard;
                    }
                    if (obj?.data?.modules?.CouponWidget) {
                        delete obj.data.modules.CouponWidget;
                    }
                    if (obj?.data?.modules?.recommended_list) {
                        delete obj.data.modules.recommended_list;
                    }
                    if (obj?.data?.modules?.user_filter_card) {
                        const items = [
                            "banner",
                            "bannerList",
                            "service_data",
                            "sug_items_data"
                        ];
                        if (obj?.data?.modules?.user_filter_card?.data) {
                            if (obj?.data?.modules?.user_filter_card?.data?.search_button_data?.rightbgText) {
                                delete obj.data.modules.user_filter_card.data.search_button_data.rightbgText;
                            }
                            for (let i of items) {
                                delete obj.data.modules.user_filter_card.data[i];
                            }
                        }
                    }
                }
            }
            else if (url.includes("/c3frontend/af-launch/page/main")) {
                if (obj?.data?.modules?.C1EndNaviEngine?.data) {
                    obj.data.modules.C1EndNaviEngine.data = {};
                }
            }
            else if (url.includes("/c3frontend/af-nearby/nearby")) {
                if (obj?.data?.modules?.banner) {
                    obj.data.modules.banner = {};
                }
                if (obj?.data?.modules?.contentPoster) {
                    obj.data.modules.contentPoster = {};
                }
            }
            else if (url.includes("/faas/amap-navigation/card-service-plan-home")) {
                if (obj?.data?.children?.length > 0) {
                    obj.data.children = obj.data.children.filter((i) => !i.hasOwnProperty("schema"));
                }
            }
            else if (url.includes("/faas/amap-navigation/main-page")) {
                if (obj?.data?.cardList?.length > 0) {
                    obj.data.cardList = obj.data.cardList.filter((i) => i?.dataKey === "ContinueNavigationCard" ||
                        i?.dataKey === "FrequentLocation" ||
                        i?.dataKey === "LoginCard");
                }
                if (obj?.data?.mapBizList?.length > 0) {
                    obj.data.mapBizList = obj.data.mapBizList.filter((i) => i?.dataKey === "FindCarVirtualCard");
                }
            }
            else if (url.includes("/perception/drive/routeInfo")) {
                if (obj?.data?.tbt?.event?.length > 0) {
                    obj.data.tbt.event = obj.data.tbt.event.filter((i) => !/ads-\d+/.test(i?.dynamic_id_s));
                }
                if (obj?.data?.front_end) {
                    if (obj?.data?.front_end?.assistant) {
                        delete obj.data.front_end.assistant;
                    }
                    if (obj?.data?.front_end?.guide_tips?.length > 0) {
                        obj.data.front_end.guide_tips = obj.data.front_end.guide_tips.filter((i) => i?.biz_type !== "music");
                    }
                    if (obj?.data?.front_end?.download?.length > 0) {
                        obj.data.front_end.download = obj.data.front_end.download.filter((i) => !/ads-\d+/.test(i?.dynamic_id_s));
                    }
                }
            }
            else if (url.includes("/perception/drive/routePlan")) {
                const items = [
                    "assistant",
                    "global_guide_data",
                    "route_search",
                    "start_button_tips"
                ];
                if (obj?.data?.front_end) {
                    for (let i of items) {
                        delete obj.data.front_end[i];
                    }
                }
                if (obj?.data?.tbt?.event?.length > 0) {
                    obj.data.tbt.event = obj.data.tbt.event.filter((i) => !/ads-\d+/.test(i?.dynamic_id_s));
                }
                if (obj?.data?.front_end?.download?.length > 0) {
                    obj.data.front_end.download = obj.data.front_end.download.filter((i) => !/ads-\d+/.test(i?.dynamic_id_s));
                }
            }
            else if (url.includes("/promotion-web/resource")) {
                const items = [
                    "alpha",
                    "banner",
                    "bravo",
                    "bubble",
                    "charlie",
                    "icon",
                    "other",
                    "popup",
                    "push",
                    "tips"
                ];
                if (obj?.data) {
                    for (let i of items) {
                        delete obj.data[i];
                    }
                }
            }
            else if (url.includes("/shield/dsp/profile/index/nodefaasv3")) {
                if (obj?.data) {
                    if (obj?.data?.tipData) {
                        delete obj.data.tipData;
                    }
                    if (obj?.data?.memberInfo) {
                        delete obj.data.memberInfo;
                    }
                    if (obj?.data?.topMixedCard) {
                        delete obj.data.topMixedCard;
                    }
                    if (obj?.data?.cardList?.length > 0) {
                        obj.data.cardList = obj.data.cardList.filter((i) => i?.dataKey === "MyOrderCard");
                    }
                }
            }
            else if (url.includes("/shield/frogserver/aocs/updatable/")) {
                const items = [
                    "EndNaviC3AdCard",
                    "Naviendpage_Searchwords",
                    "SplashScreenControl",
                    "TipsTaxiButton",
                    "amapCoin",
                    "favorites_info",
                    "feedback_banner",
                    "footprint",
                    "his_input_tip",
                    "home_business_position_config",
                    "hotel_activity",
                    "hotel_fillin_opt",
                    "hotel_loop",
                    "hotel_tipsicon",
                    "hotsaleConfig",
                    "landing_page_info",
                    "map_weather_switch",
                    "maplayers",
                    "navi_end",
                    "nearby_business_popup",
                    "nearby_map_entry_guide",
                    "nearby_map_pull_down_guide",
                    "operation_layer",
                    "poi_rec",
                    "route_banner",
                    "routeresult_banner",
                    "sportsGroupConfig",
                    "sportsHealthConfig",
                    "sportsHomeConfig",
                    "sportsRouteConfig",
                    "sportsTaskConfig",
                    "sports_walk",
                    "small_biz_b2b_kb",
                    "small_biz_case",
                    "small_biz_fun",
                    "small_biz_index",
                    "small_biz_news",
                    "splashscreen",
                    "splashview_config",
                    "sur_bar",
                    "taxi_activity",
                    "testflight_adiu",
                    "tf_remind",
                    "tips_bar_black_list",
                    "vip"
                ];
                if (obj?.data) {
                    for (let i of items) {
                        if (obj?.data?.[i]) {
                            obj.data[i] = { status: 1, version: "", value: "" };
                        }
                    }
                }
            }
            else if (url.includes("/shield/search/common/coupon/info")) {
                if (obj?.data) {
                    obj.data = {};
                }
            }
            else if (url.includes("/shield/search/nearbyrec_smart")) {
                const items = ["head", "search_hot_words", "feed_rec"];
                if (obj?.data?.modules?.length > 0) {
                    if (obj?.data?.modules?.length > 0) {
                        obj.data.modules = obj.data.modules.filter((i) => items?.includes(i));
                    }
                }
            }
            else if (url.includes("/shield/search/poi/detail")) {
                const items = [
                    "CouponBanner",
                    "CouponPush",
                    "activityRecommendation",
                    "adStoreBigBannerModule",
                    "adv_compliance_info",
                    "adv_gift",
                    "bigListBizRec",
                    "bottomDescription",
                    "brand_service",
                    "brand_shop_bar",
                    "businessQualifications",
                    "carServiceCard",
                    "checkIn",
                    "check_in",
                    "cityCardFeed",
                    "city_discount",
                    "claim",
                    "co_branded_card",
                    "collector_guide",
                    "commonAiAgent",
                    "commonGoodsShelf",
                    "commonHkfMiniPortal",
                    "common_coupon_bar",
                    "common_coupon_card",
                    "comprehensiveEditEntrance",
                    "contributor",
                    "cpt_service_shop",
                    "dayTripList",
                    "discount_commodity",
                    "divergentRecommendModule",
                    "enhanceCustomerServiceFixedBottom",
                    "enhanceCustomerServicePoiModule",
                    "everyOneToSee",
                    "feedback",
                    "first_surround_estate_tab",
                    "footer_tel_button",
                    "ggc_entry",
                    "hkfMiniPortal",
                    "hkfCalendarRecommend",
                    "horizontalGoodsShelf",
                    "hospital_strategy",
                    "hotPlay",
                    "hot_new_house_estate",
                    "hot_shop",
                    "hotelCoupon",
                    "hotelList",
                    "hotelMustRead",
                    "houseAgentService",
                    "houseList",
                    "houseOfficeBrandIntroduction",
                    "houseOfficeInfo",
                    "houseOfficeNotice",
                    "houseOfficeService",
                    "houseShelf",
                    "house_apart_info",
                    "house_buying_agent",
                    "house_coupon",
                    "house_cp_clues",
                    "house_cpt_coupon",
                    "house_cpt_grab",
                    "house_price",
                    "house_price_v2",
                    "house_rent_sale_agency",
                    "image_banner",
                    "kaMarketingCampaign",
                    "kaProductMixServiceShelf",
                    "ka_not_enter",
                    "legSameIndustryRecEntrance",
                    "legal_document",
                    "listBizRec_1",
                    "listBizRec_2",
                    "matrix_banner",
                    "merchantSettlement",
                    "membership",
                    "mini_hook_shelf",
                    "movie_info",
                    "multi_page_anchor",
                    "nearbyGoodCar",
                    "nearbyRecommendModule",
                    "nearby_house",
                    "nearby_new_house_estate",
                    "nearby_office_estate",
                    "nearby_old_sell_estate",
                    "nearby_play_rec",
                    "newGuest",
                    "newRelatedRecommends",
                    "new_operation_banner",
                    "newsellhouse",
                    "officerenthouse",
                    "officesellhouse",
                    "official_account",
                    "official_account_hospital",
                    "oldsellhouse",
                    "operation_banner",
                    "operator_card",
                    "packageShelf",
                    "parentBizRec",
                    "parentPoiRecEntrance",
                    "platformCustomerCommonModule",
                    "platformCustomerComplianceInfo",
                    "poiDetailBottomBar",
                    "poiDetailBottomBarOperation",
                    "poiDetailCommonConfig",
                    "poiDetailNewBeltCardV2",
                    "poiDetailNewBeltV2",
                    "poiDetailWaterFeed",
                    "poiDetailWaterFeedTitle",
                    "poster_banner",
                    "portal_entrance",
                    "quickLink",
                    "quickLinksPortal",
                    "relatedRecommends",
                    "renthouse",
                    "rentSaleHouse",
                    "rentsaleagencyv2",
                    "rentsaleagencyv3",
                    "rentsalehouse",
                    "residentialOwners",
                    "retainInfo",
                    "reviews",
                    "sameIndustryRecommendModule",
                    "sameIndustry2RecommendModule",
                    "scenic_coupon",
                    "scenic_filter",
                    "scenic_lifeservices",
                    "scenic_mustplay",
                    "scenic_play_guide",
                    "scenic_recommend",
                    "scenic_voice",
                    "searchPlaMap",
                    "second_surround_estate_tab",
                    "service_shop",
                    "shopBaseCase",
                    "shopStdActivity",
                    "shopStructGift",
                    "shoppingMallEvent",
                    "similarShelfRecommend",
                    "similarShopRecommend",
                    "smallListBizRec",
                    "smallOrListBizRec",
                    "societyPublicExperience",
                    "subscription",
                    "surroundHouseTab",
                    "surroundOldSellHouse",
                    "surroundRentHouse",
                    "surround_facility",
                    "surround_facility_new",
                    "surround_house_tab",
                    "surround_oldsellhouse",
                    "surround_renthouse",
                    "surround_rentoffice",
                    "surround_selloffice",
                    "thirdparty_info",
                    "travelGuideRec",
                    "uploadBar",
                    "upload_bar",
                    "verification",
                    "waistRecEntrance",
                    "waterFallFeed",
                    "waterFallFeedTitle",
                    "yellowPageAdRecommendModule"
                ];
                if (obj?.data?.modules) {
                    if (obj?.data?.modules?.combineReviews?.data?.write_comment) {
                        delete obj.data.modules.combineReviews.data.write_comment;
                    }
                    for (let i of items) {
                        delete obj.data.modules[i];
                    }
                }
            }
            else if (url.includes("/shield/search_bff/hotword")) {
                if (obj?.data?.headerHotWord?.length > 0) {
                    obj.data.headerHotWord = [];
                }
            }
            else if (url.includes("/shield/search_poi/search/sp") || url.includes("/shield/search_poi/mps")) {
                if (obj?.data?.list_data) {
                    let list = obj.data.list_data.content[0];
                    if (list?.hookInfo) {
                        let hookData = list.hookInfo.data;
                        if (hookData?.header) {
                            delete hookData.header;
                        }
                        if (hookData?.house_info) {
                            delete hookData.house_info;
                        }
                    }
                    if (list?.map_bottom_bar?.hotel) {
                        delete list.map_bottom_bar.hotel;
                    }
                    if (list?.poi?.item_info?.tips_bottombar_button?.hotel) {
                        delete list.poi.item_info.tips_bottombar_button.hotel;
                    }
                    if (list?.tips_operation_info) {
                        delete list.tips_operation_info;
                    }
                    if (list?.bottom?.bottombar_button?.hotel) {
                        delete list.bottom.bottombar_button.hotel;
                    }
                    if (list?.card?.card_id === "SearchCardBrand" && list?.item_type === "brandAdCard") {
                        delete list.card;
                    }
                    if (list?.card?.card_id === "NearbyGroupBuy" && list?.item_type === "toplist") {
                        delete list.card;
                    }
                    if (list?.card?.card_id === "ImageBanner" && list?.item_type === "ImageBanner") {
                        delete list.card;
                    }
                }
                else if (obj?.data?.district?.poi_list) {
                    let poi = obj.data.district.poi_list[0];
                    if (poi?.transportation) {
                        delete poi.transportation;
                    }
                    if (poi?.feed_rec_tab) {
                        delete poi.feed_rec_tab;
                    }
                }
                else if (obj?.data?.modules) {
                    if (obj?.data?.modules?.not_parse_result?.data?.list_data) {
                        let list = obj.data.modules.not_parse_result.data.list_data.content[0];
                        if (list?.hookInfo) {
                            let hookData = list.hookInfo.data;
                            if (hookData?.header) {
                                delete hookData.header;
                            }
                            if (hookData?.house_info) {
                                delete hookData.house_info;
                            }
                        }
                        if (list?.map_bottom_bar?.hotel) {
                            delete list.map_bottom_bar.hotel;
                        }
                        if (list?.poi?.item_info?.tips_bottombar_button?.hotel) {
                            delete list.poi.item_info.tips_bottombar_button.hotel;
                        }
                        if (list?.tips_operation_info) {
                            delete list.tips_operation_info;
                        }
                        if (list?.bottom?.bottombar_button?.hotel) {
                            delete list.bottom.bottombar_button.hotel;
                        }
                    }
                    if (obj?.data?.modules?.list_data?.data) {
                        let list = obj.data.modules.list_data.data;
                        if (list?.content?.length > 0) {
                            list.content = list.content.filter((i) => !["brandAdCard", "toplist_al"].includes(i?.item_type));
                        }
                    }
                }
            }
            else if (url.includes("/shield/search_poi/sug")) {
                if (obj?.tip_list) {
                    let newLists = [];
                    if (obj?.tip_list?.length > 0) {
                        for (let item of obj.tip_list) {
                            if (["12"].includes(item?.tip?.datatype_spec) ||
                                ["ad", "poi_ad", "toplist"].includes(item?.tip?.result_type) ||
                                ["ad", "exct_query_sug_merge_theme", "query_sug_merge_theme", "sp"].includes(item?.tip?.task_tag)) {
                                continue;
                            }
                            else {
                                newLists.push(item);
                            }
                        }
                        obj.tip_list = newLists;
                    }
                }
                else if (obj?.city_list) {
                    let newLists = [];
                    if (obj?.city_list?.length > 0) {
                        for (let item of obj.city_list) {
                            let newTips = [];
                            if (item?.tip_list?.length > 0) {
                                for (let ii of item.tip_list) {
                                    if (["12"].includes(ii?.tip?.datatype_spec)) {
                                        continue;
                                    }
                                    else if (["ad", "poi_ad"].includes(ii?.tip?.result_type)) {
                                        continue;
                                    }
                                    else {
                                        newTips.push(ii);
                                    }
                                }
                                item.tip_list = newTips;
                            }
                            newLists.push(item);
                        }
                        obj.city_list = newLists;
                    }
                }
            }
            else if (url.includes("/shield/search_poi/tips_operation_location")) {
                if (obj?.data?.coupon) {
                    delete obj.data.coupon;
                }
                const items = [
                    "belt",
                    "common_float_bar",
                    "common_image_banner",
                    "coupon_discount_float_bar",
                    "coupon_float_bar",
                    "discount_coupon",
                    "image_cover_bar",
                    "mood_coupon_banner",
                    "operation_brand",
                    "promotion_wrap_card",
                    "tips_top_banner"
                ];
                if (obj?.data?.modules) {
                    for (let i of items) {
                        delete obj.data.modules[i];
                    }
                }
            }
            else if (url.includes("/valueadded/alimama/splash_screen")) {
                if (obj?.data?.ad?.length > 0) {
                    for (let item of obj.data.ad) {
                        item.set.setting.display_time = 0;
                        item.creative[0].start_time = 3818332800;
                        item.creative[0].end_time = 3818419199;
                    }
                }
            }
            $done({ body: JSON.stringify(obj) });
        }).call(this);
    }).call(globalThis, __wayxView(typeof $request === 'undefined' ? undefined : $request, 'request'), __wayxView(typeof $response === 'undefined' ? undefined : $response, 'response'), value => {
        if (__wayxCompleted)
            return;
        const result = value == null ? {} : Object.assign({}, value);
        if (__wayxBinary(result.body)) {
            const data = __wayxBytes(result.body);
            result.bodyBytes = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
            delete result.body;
        }
        __wayxCompleted = true;
        return __wayxGuardDone(result);
    }));
})();
