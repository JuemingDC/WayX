const url = $request.url;
if (!$response.body)
    $done({});
const isIQY = url.includes("iqiyi.com/");
const isMG = url.includes("mgtv.com/");
const isYK = url.includes("youku.com/");
let obj = JSON.parse($response.body);
if (isIQY) {
    if (url.includes("/bottom_theme?")) {
        if (obj?.cards?.length > 0) {
            let card = obj.cards[0];
            if (card?.items?.length > 0) {
                card.items = card.items.filter((i) => ["29", "31", "34"]?.includes(i?._id));
                for (let i = 0; i < card.items.length; i++) {
                    card.items[i].show_order = i + 1;
                }
            }
        }
    }
    else if (url.includes("/common_switch?")) {
        if (obj?.content?.resource) {
            const items = [
                "activities",
                "ai_guide",
                "cast_device_ad",
                "flow_promotion",
                "growth_award",
                "ip_restriction_ad",
                "member",
                "ppc_feed_insert",
                "second_floor_guide",
                "speed_ad",
                "vip_tips",
                "vipgrowth_value",
                "vr"
            ];
            for (let i of items) {
                delete obj.content.resource[i];
            }
        }
    }
    else if (url.includes("/control/")) {
        if (obj?.content?.weather) {
            delete obj.content.weather;
        }
    }
    else if (url.includes("/getMyMenus?")) {
        if (obj?.data?.length > 0) {
            let newMenus = [];
            for (let item of obj.data) {
                if (["wd_liebiao_2", "wd_liebiao_3", "wd_liebiao_4"]?.includes(item?.statistic?.block)) {
                    continue;
                }
                else {
                    if (item?.menuList?.length > 0) {
                        let newLists = [];
                        for (let i of item.menuList) {
                            if (i?.menuType === 121) {
                                continue;
                            }
                            else {
                                newLists.push(i);
                            }
                        }
                        item.menuList = newLists;
                        newMenus.push(item);
                    }
                    else {
                        newMenus.push(item);
                    }
                }
            }
            obj.data = newMenus;
        }
    }
    else if (url.includes("/home_top_menu?")) {
        if (obj?.cards?.length > 0) {
            let card = obj.cards[0];
            if (card?.items?.length > 0) {
                card.items = card.items.filter((i) => !["1017", "8196", "4525518866820370"]?.includes(i?._id));
                for (let i = 0; i < card.items.length; i++) {
                    card.items[i].show_order = i + 1;
                }
            }
        }
    }
    else if (url.includes("/mixer?")) {
        if (obj?.errorCode === 0) {
            const items = ["adSlots", "splashLottieFile", "splashUiConfig"];
            for (let i of items) {
                delete obj[i];
            }
        }
    }
    else if (url.includes("/search.video.iqiyi.com/")) {
        if (obj?.cache_expired_sec) {
            obj.cache_expired_sec = 1;
        }
        if (obj?.data) {
            obj.data = [{ query: "搜索内容" }];
        }
        if (obj?.show_style?.roll_period) {
            obj.show_style.roll_period = 1000;
        }
    }
    else if (url.includes("/views_category/")) {
        if (obj?.base?.statistics?.ad_str) {
            delete obj.base.statistics.ad_str;
        }
        if (obj?.cards?.length > 0) {
            let newCards = [];
            for (let card of obj.cards) {
                if (card?.blocks?.length > 0) {
                    let newItems = [];
                    for (let item of card.blocks) {
                        if (["block_321", "block_415", "block_416"]?.includes(item?.block_name)) {
                            continue;
                        }
                        else if (item?.buttons?.[0]?.id === "ad") {
                            continue;
                        }
                        else {
                            newItems.push(item);
                        }
                    }
                    card.blocks = newItems;
                    newCards.push(card);
                }
                else {
                    newCards.push(card);
                }
            }
            obj.cards = newCards;
        }
    }
    else if (url.includes("/views_comment/")) {
        if (obj?.cards?.length > 0) {
            obj.cards = obj.cards.filter((i) => i.hasOwnProperty("alias_name") && !["comment_resource_card", "comment_resource_convention_card"]?.includes(i?.alias_name));
        }
    }
    else if (url.includes("/views_home/")) {
        if (obj?.base?.statistics?.ad_str) {
            delete obj.base.statistics.ad_str;
        }
        if (obj?.cards?.length > 0) {
            let newCards = [];
            for (let card of obj.cards) {
                if (["ad_mobile_flow", "ad_trueview", "focus", "qy_home_vip_opr_banner"]?.includes(card?.alias_name)) {
                    continue;
                }
                else {
                    if (card?.top_banner?.l_blocks?.length > 0) {
                        for (let item of card.top_banner.l_blocks) {
                            if (item?.buttons?.length > 0) {
                                delete item.buttons;
                            }
                        }
                        newCards.push(card);
                    }
                    else {
                        newCards.push(card);
                    }
                }
            }
            obj.cards = newCards;
        }
    }
    else if (url.includes("/views_plt/")) {
        if (obj?.kv_pair) {
            const items = ["activity_tab", "cloud_cinema", "vip_fixed_card"];
            for (let i of items) {
                delete obj.kv_pair[i];
            }
        }
        if (obj?.cards?.length > 0) {
            obj.cards = obj.cards.filter((i) => ![
                "bi_playlist",
                "cloud_cinema_play_privilege",
                "cloud_cinema_playlist",
                "cloud_cinema_playlist_1",
                "cloud_cinema_playlist_2",
                "cloud_cinema_privilege_icon",
                "cloud_cinema_star_activities",
                "play_ad_no_vip",
                "play_around",
                "play_custom_card",
                "play_splendid_collection",
                "play_type_topical_card_3",
                "play_type_topical_card_4",
                "play_variety_custom_2",
                "play_vertical",
                "play_vip_promotion",
                "play_water_fall_like",
                "play_water_fall_like_title",
                "plt_cloud_cinema_photo",
                "plt_cloud_cinema_short2",
                "plt_playlist",
                "plt_playlist_1",
                "plt_playlist_2",
                "funny_short_video"
            ]?.includes(i?.alias_name));
        }
    }
    else if (url.includes("/views_search/")) {
        if (obj?.cards?.length > 0) {
            let newCards = [];
            for (let card of obj.cards) {
                if ([
                    "ad_mobile_flow",
                    "hot_query_bottom",
                    "hot_query_search_top_ad",
                    "search_com_related_query",
                    "search_intent_detail_onesearch",
                    "search_mid_text_ad",
                    "search_onebox_v2",
                    "search_small_card_ad",
                    "search_topbanner_text",
                    "search_vip_banner"
                ]?.includes(card?.strategy_com_id)) {
                    continue;
                }
                else {
                    if (card?.blocks?.length > 0) {
                        let newBlocks = [];
                        for (let i of card.blocks) {
                            if (i.hasOwnProperty("block_name")) {
                                newBlocks.push(i);
                            }
                            else if (i.hasOwnProperty("block_type")) {
                                if (![861, 959]?.includes(i?.block_type)) {
                                    newBlocks.push(i);
                                }
                            }
                        }
                        card.blocks = newBlocks;
                        newCards.push(card);
                    }
                    else {
                        newCards.push(card);
                    }
                }
            }
            obj.cards = newCards;
        }
    }
    else if (url.includes("/waterfall/")) {
        if (obj?.base?.statistics?.ad_str) {
            delete obj.base.statistics.ad_str;
        }
        if (obj?.cards?.length > 0) {
            let newCards = [];
            for (let card of obj.cards) {
                if (card.hasOwnProperty("block_class")) {
                    continue;
                }
                else {
                    if (card?.blocks?.length > 0) {
                        let newItems = [];
                        for (let item of card.blocks) {
                            if (item.hasOwnProperty("block_class")) {
                                continue;
                            }
                            else {
                                newItems.push(item);
                            }
                        }
                        card.blocks = newItems;
                        newCards.push(card);
                    }
                    else {
                        newCards.push(card);
                    }
                }
            }
            obj.cards = newCards;
        }
    }
}
else if (isMG) {
    if (url.includes("/dynamic/v1/channel/index/")) {
        if (obj?.adInfo) {
            delete obj.adInfo;
        }
        if (obj?.data?.length > 0) {
            let newItems = [];
            for (let item of obj.data) {
                if (item?.moduleEntityId === "91") {
                    if (item?.DSLList?.length > 0) {
                        let newLists = [];
                        for (let i of item.DSLList) {
                            if (i?.data?.items?.length > 0) {
                                let newII = [];
                                for (let ii of i.data.items) {
                                    if (ii?.id === 0) {
                                        continue;
                                    }
                                    else if (["热门", "推荐"]?.includes(ii?.cornerTitle)) {
                                        continue;
                                    }
                                    else {
                                        newII.push(ii);
                                    }
                                }
                                i.data.items = newII;
                                newLists.push(i);
                            }
                            else {
                                newLists.push(i);
                            }
                        }
                        item.DSLList = newLists;
                        newItems.push(item);
                    }
                    else {
                        newItems.push(item);
                    }
                }
                else if (["842", "2237", "5418"]?.includes(item?.moduleEntityId)) {
                    continue;
                }
                else {
                    newItems.push(item);
                }
            }
            obj.data = newItems;
        }
        if (obj?.moduleIDS?.length > 0) {
            obj.moduleIDS = obj.moduleIDS.filter((i) => !["842", "2237", "5418"]?.includes(i?.moduleEntityId));
        }
    }
    else if (url.includes("/dynamic/v1/channel/vrsList/")) {
        if (obj?.data?.length > 0) {
            let newItems = [];
            for (let item of obj.data) {
                if (item?.vclassId > 100033 && item?.vclassId !== 100160) {
                    continue;
                }
                else {
                    newItems.push(item);
                }
            }
            obj.data = newItems;
        }
    }
    else if (url.includes("/mobile/config?")) {
        const items = [
            "XmVideoB",
            "XmsellSwitch",
            "damang_duanju_tab",
            "damang_tab",
            "dc_adConfig",
            "relative_ads",
            "second_floor_guide_switch"
        ];
        for (let i of items) {
            if (obj?.data?.[i]) {
                obj.data[i] = "0";
            }
        }
        if (obj?.data?.XmFsLvlCatAddr) {
            obj.data.XmFsLvlCatAddr = "";
        }
    }
    else if (url.includes("/mobile/recommend/v2?")) {
        if (obj?.data?.default) {
            obj.data.default = { 0: ["搜索内容"] };
        }
        if (obj?.data?.recommend) {
            obj.data.recommend = [];
        }
        if (obj?.data?.interval) {
            obj.data.interval = 1000;
        }
    }
    else if (url.includes("/odin/c1/channel/index?")) {
        if (obj?.data?.length > 0) {
            let newItems = [];
            for (let item of obj.data) {
                if (item?.moduleType === "childslideicon") {
                    continue;
                }
                else {
                    newItems.push(item);
                }
            }
            obj.data = newItems;
        }
    }
    else if (url.includes("/v1/vod/info?")) {
        if (obj?.data?.config?.ad) {
            obj.data.config.ad.wmShowTime = 0;
        }
        if (obj?.data?.config?.videoRcMod) {
            obj.data.config.videoRcMod.toastStatus = 0;
            obj.data.config.videoRcMod.toastTime = 0;
        }
        if (obj?.data?.tabs?.length > 0) {
            obj.data.tabs = obj.data.tabs.filter((i) => ["1", "2"]?.includes(i?.type));
        }
        if (obj?.data?.template?.modules?.length > 0) {
            let newMods = [];
            for (let item of obj.data.template.modules) {
                if ([202, 203, 301, 601, 701, 702]?.includes(item?.dataType)) {
                    continue;
                }
                else {
                    if (item?.clipInfo?.rcInfo) {
                        delete item.clipInfo.rcInfo;
                    }
                    newMods.push(item);
                }
            }
            obj.data.template.modules = newMods;
        }
        if (obj?.data?.template?.theme) {
            delete obj.data.template.theme;
        }
    }
    else if (url.includes("/v3/module/list?")) {
        if (obj?.data?.list?.length > 0) {
            let newList = [];
            for (let item of obj.data.list) {
                if ([3, 5, 6, 8]?.includes(item?.moduleType)) {
                    continue;
                }
                else if (item?.moduleType === 2 && item?.title === "用户信息模块") {
                    if (item?.data?.length > 0) {
                        let newItems = [];
                        for (let i of item.data) {
                            if (["领取芒果卡权益", "签到赢积分"]?.includes(i?.title)) {
                                continue;
                            }
                            else {
                                newItems.push(i);
                            }
                        }
                        item.data = newItems;
                        newList.push(item);
                    }
                    else {
                        newList.push(item);
                    }
                }
                else if (item?.moduleType === 7 && item?.title === "我的服务") {
                    if (item?.data?.length > 0) {
                        let newItems = [];
                        for (let i of item.data) {
                            if (["功能实验室", "芒果壁纸", "我的音乐"]?.includes(i?.title)) {
                                continue;
                            }
                            else {
                                newItems.push(i);
                            }
                        }
                        item.data = newItems;
                        newList.push(item);
                    }
                    else {
                        newList.push(item);
                    }
                }
                else {
                    newList.push(item);
                }
            }
            obj.data.list = newList;
        }
    }
    else if (url.includes("/v10/video/info?")) {
        if (obj?.data?.categoryList?.length > 0) {
            obj.data.categoryList = obj.data.categoryList.filter((i) => ![2, 8, 9, 14, 17]?.includes(i?.dataType));
        }
    }
}
else if (isYK) {
    if (url.includes("/collect-api/get_push_interval_config_wx?")) {
        if (obj?.data) {
            const items = ["tipContent", "tipContentNew"];
            for (let i of items) {
                delete obj.data[i];
            }
        }
    }
    else if (url.includes("columbus.gateway.new.execute")) {
        if (obj?.data?.["2019030100"]?.data) {
            let objData = obj.data["2019030100"].data;
            if (objData?.data?.global) {
                let config = objData.data.global;
                if (config?.PHONE_DETAIL_TOP_TAB?.pageTabs?.length > 0) {
                    config.PHONE_DETAIL_TOP_TAB.pageTabs = config.PHONE_DETAIL_TOP_TAB.pageTabs.filter((i) => ["detail", "planet"]?.includes(i?.code));
                }
            }
            if (objData?.nodes?.length > 0) {
                if (objData?.nodes?.length === 1) {
                    let node0 = objData.nodes[0];
                    if (node0?.nodes?.length > 0) {
                        if (node0?.typeName === "NORMAL") {
                            node0.nodes = node0.nodes.filter((i) => ![
                                "PHONE_CHD_AGE_DETAIL_2",
                                "PHONE_CHILD_SERIES_A",
                                "PHONE_CHILD_STAR_A",
                                "PHONE_DEFALT_SCROLL_C",
                                "Phone运营banner",
                                "播放页触达组件",
                                "播放页广告组件",
                                "播放页会员引导组件",
                                "播放页活动组件",
                                "播放页全屏播后推荐组件",
                                "播放页少儿品牌专区组件",
                                "播放页推荐组件",
                                "播放页用户触达组件",
                                "播放页有料不能停组件",
                                "球区自动化组件",
                                "优酷购"
                            ]?.includes(i?.typeName));
                        }
                        else if (node0?.typeName === "FEED_CHILD_DRAWER_PAGINATION") {
                            if (node0?.nodes) {
                                node0.nodes = [];
                            }
                        }
                        else if (node0?.typeName === "FEED_DRAWER_PAGINATION") {
                            if (node0?.nodes) {
                                node0.nodes = [];
                            }
                        }
                    }
                }
                else {
                    objData.nodes = [];
                }
            }
        }
    }
    else if (url.includes("columbus.home.feed/")) {
        if (obj?.data?.["2019061000"]?.data) {
            let objData = obj.data["2019061000"].data;
            if (objData?.nodes?.length > 0) {
                let newNodes1 = [];
                for (let node1 of objData.nodes) {
                    if (node1?.typeName === "PHONE_FEED_CARD_GROUP") {
                        if (node1?.nodes?.length > 0) {
                            let newNode2 = [];
                            for (let node2 of node1.nodes) {
                                if (node2?.typeName === "PHONE_FEED_CARD_S_AD") {
                                    continue;
                                }
                                else if (node2?.typeName === "PHONE_H_UC_AD") {
                                    continue;
                                }
                                else {
                                    newNode2.push(node2);
                                }
                            }
                            node1.nodes = newNode2;
                            newNodes1.push(node1);
                        }
                        else {
                            newNodes1.push(node1);
                        }
                    }
                    else {
                        newNodes1.push(node1);
                    }
                }
                objData.nodes = newNodes1;
            }
        }
    }
    else if (url.includes("columbus.home.query/")) {
        if (obj?.data?.["2019061000"]?.data) {
            let objData = obj.data["2019061000"].data;
            if (objData?.data?.indexPositionResult?.length > 0) {
                objData.data.indexPositionResult = [];
            }
            if (objData?.nodes?.length > 0) {
                let newNodes1 = [];
                for (let node1 of objData.nodes) {
                    if (["CHILD", "COMIC2", "20230929GREATWORKMFK"]?.includes(node1?.data?.nodeKey)) {
                        continue;
                    }
                    else {
                        if (node1?.data?.indexPositionResult?.length > 0) {
                            node1.data.indexPositionResult = [];
                        }
                        if (node1?.data?.refreshImg) {
                            delete node1.data.refreshImg;
                        }
                        if (node1?.nodes?.length > 0) {
                            let newNode2 = [];
                            for (let node2 of node1.nodes) {
                                if (node2?.data?.crmSale) {
                                    delete node2.data.crmSale;
                                }
                                if (["UC广告抽屉", "橱窗广告"].includes(node2?.typeName)) {
                                    continue;
                                }
                                else if (node2?.id === 31476) {
                                    if (node2?.data?.keywords?.length > 0) {
                                        delete node2.data.keywords;
                                    }
                                }
                                else if (node2?.id === 35505) {
                                    continue;
                                }
                                else if (node2?.id === 37335) {
                                    continue;
                                }
                                else {
                                    if (node2?.nodes?.length > 0) {
                                        let newNode3 = [];
                                        for (let node3 of node2.nodes) {
                                            if ([
                                                "PHONE_FEED_CARD_B_AD",
                                                "PHONE_FEED_CARD_S_AD",
                                                "PHONE_H_UC_AD",
                                                "PHONE_IMG_A",
                                                "PHONE_YK_AD_BANNER"
                                            ].includes(node3?.typeName)) {
                                                continue;
                                            }
                                            else if (node3.id === 272768) {
                                                console.log("移除首页的轮播广告");
                                                continue;
                                            }
                                            else {
                                                if (node3?.nodes?.length > 0) {
                                                    let newNode4 = [];
                                                    for (let node4 of node3.nodes) {
                                                        if (node4?.typeName === "PHONE_FEED_CARD_S_AD") {
                                                            continue;
                                                        }
                                                        else if (node4?.data.hasOwnProperty("ad")) {
                                                            continue;
                                                        }
                                                        else {
                                                            newNode4.push(node4);
                                                        }
                                                    }
                                                    node3.nodes = newNode4;
                                                    newNode3.push(node3);
                                                }
                                                else {
                                                    newNode3.push(node3);
                                                }
                                            }
                                        }
                                        node2.nodes = newNode3;
                                        newNode2.push(node2);
                                    }
                                    else {
                                        newNode2.push(node2);
                                    }
                                }
                            }
                            node1.nodes = newNode2;
                        }
                        newNodes1.push(node1);
                    }
                }
                objData.nodes = newNodes1;
            }
        }
    }
    else if (url.includes("columbus.uc.query/")) {
        if (obj?.data?.["2019061000"]?.data) {
            let objData = obj.data["2019061000"].data;
            if (objData?.nodes?.length > 0) {
                let objNodes = objData.nodes[0];
                if (objNodes?.nodes?.length > 0) {
                    let newNodes = [];
                    for (let item of objNodes.nodes) {
                        if (item?.id === 32133) {
                            continue;
                        }
                        else if (item?.id === 32775) {
                            continue;
                        }
                        else if (item?.id === 22570) {
                            continue;
                        }
                        else if (item?.id === 28912) {
                            if (item?.nodes?.length > 0) {
                                let newII = [];
                                for (let ii of item.nodes) {
                                    if (ii?.id === 110429) {
                                        continue;
                                    }
                                    newII.push(ii);
                                }
                                item.nodes = newII;
                                newNodes.push(item);
                            }
                            else {
                                newNodes.push(item);
                            }
                        }
                        else if (item?.id === 35942) {
                            continue;
                        }
                        else if (item?.id === 36014) {
                            continue;
                        }
                        else if (item?.id === 36015) {
                            if (item?.nodes?.length > 0) {
                                let node0 = item.nodes[0];
                                if (node0?.nodes?.length > 0) {
                                    let newII = [];
                                    for (let ii of node0.nodes) {
                                        if ([683367, 683368, 683372, 683502]?.includes(ii?.id)) {
                                            newII.push(ii);
                                        }
                                    }
                                    node0.nodes = newII;
                                    newNodes.push(item);
                                }
                                else {
                                    newNodes.push(item);
                                }
                            }
                            else {
                                newNodes.push(item);
                            }
                        }
                        else if (item?.id === 38466) {
                            continue;
                        }
                        else {
                            newNodes.push(item);
                        }
                    }
                    objNodes.nodes = newNodes;
                }
            }
        }
    }
    else if (url.includes("columbus.ycp.query/")) {
        if (obj?.data?.["2019061000"]?.data) {
            let objData = obj.data["2019061000"].data;
            if (objData?.nodes?.length > 0) {
                let objNodes = objData.nodes[0];
                if (objNodes?.nodes?.length > 0) {
                    let newNodes = [];
                    for (let item of objNodes.nodes) {
                        if (item?.id === 23242) {
                            if (item?.nodes?.length > 0) {
                                let newItems = [];
                                for (let i of item.nodes) {
                                    if (i?.typeName === "COMPONENT_YCP_NOTICE") {
                                        continue;
                                    }
                                    else if (i?.id === 113941) {
                                        continue;
                                    }
                                    else {
                                        newItems.push(i);
                                    }
                                }
                                item.nodes = newItems;
                                newNodes.push(item);
                            }
                            else {
                                newNodes.push(item);
                            }
                        }
                        else if (item?.id === 23243) {
                            if (item?.nodes?.length > 0) {
                                let newItems = [];
                                for (let i of item.nodes) {
                                    if (i?.id === -1000) {
                                        continue;
                                    }
                                    else {
                                        newItems.push(i);
                                    }
                                }
                                item.nodes = newItems;
                                newNodes.push(item);
                            }
                            else {
                                newNodes.push(item);
                            }
                        }
                        else {
                            newNodes.push(item);
                        }
                    }
                    objNodes.nodes = newNodes;
                }
            }
        }
    }
    else if (url.includes("haidai.lantern.appconfig.get/")) {
        if (obj?.data?.model?.configInfo?.bottomNavigate) {
            let bottom = obj.data.model.configInfo.bottomNavigate;
            if (bottom?.data?.bottomTabList?.length > 0) {
                bottom.data.bottomTabList = bottom.data.bottomTabList.filter((i) => ["HOME", "NEW_UCENTER", "VIP_MEMBER"]?.includes(i?.type));
                for (let i = 0; i < bottom.data.bottomTabList.length; i++) {
                    bottom.data.bottomTabList[i].menuIndex = i + 1;
                }
            }
        }
    }
    else if (url.includes("huluwa.dispatcher.youthmode.config2/")) {
        if (obj?.data?.result) {
            obj.data.result = {};
        }
    }
    else if (url.includes("play.ups.appinfo.get/")) {
        if (obj?.data?.data) {
            const items = ["ad", "watermark", "ykad"];
            for (let i of items) {
                delete obj.data.data[i];
            }
        }
    }
    else if (url.includes("soku.yksearch/")) {
        if (obj?.data?.nodes?.length > 0) {
            obj.data.nodes = obj.data.nodes.filter((i) => i.hasOwnProperty("data"));
        }
    }
}
$done({ body: JSON.stringify(obj) });
