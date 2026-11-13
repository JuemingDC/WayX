let url = $request.url;
let body = $response.body;
let obj;
try {
    obj = JSON.parse(body);
}
catch (e) {
    console.log("数据返回异常，服务挂了");
    $done({});
}
if (url.includes("/x/v2/search/square")) {
    if (obj?.data) {
        obj.data = { type: "history", title: "搜索历史", search_hotword_revision: 2 };
    }
}
else if (url.includes("/resource/top/activity")) {
    var jsonString = '{ "code": -404, "message": "啥都木有", "ttl": 1, "data": null }';
    obj = JSON.parse(jsonString);
}
else if (url.includes("/x/v2/feed/index?")) {
    if (obj?.data?.items?.length > 0) {
        obj.data.items = obj.data.items.filter((i) => i?.card_goto === "av");
    }
    if (obj?.data?.config?.toast?.has_toast) {
        obj.data.config.toast.has_toast = false;
    }
}
else if (url.includes("/x/resource/show/tab/v2")) {
    if (obj?.data?.bottom?.length > 0) {
        const sortLists = ["首页", "动态", "关注", "我的"];
        obj.data.bottom = obj.data.bottom
            .filter((i) => sortLists?.includes(i?.name))
            .sort((a, b) => sortLists.indexOf(a?.name) - sortLists.indexOf(b?.name));
    }
    if (obj?.data?.tab?.length > 0) {
        const sortLists = ["直播", "推荐", "热门"];
        obj.data.tab = obj.data.tab
            .filter((i) => sortLists?.includes(i?.name))
            .sort((a, b) => sortLists.indexOf(a?.name) - sortLists.indexOf(b?.name));
    }
    if (obj?.data?.top?.length > 0) {
        obj.data.top = obj.data.top.filter((i) => i?.name === "消息");
        if (obj?.data?.top?.[0]?.pos) {
            obj.data.top[0].pos = 1;
        }
    }
}
else if (url.includes("/x/v2/account/mine?")) {
    if (obj?.data?.sections_v2?.length > 0) {
        let newSects = [];
        for (let item of obj.data.sections_v2) {
            delete item.button;
            if (item?.style) {
                if (item?.style === 1 || item?.style === 2) {
                    if (item?.title) {
                        if (item?.title === "创作中心" || item?.title === "推荐服务" || item?.title === "我的服务") {
                            continue;
                        }
                        else if (item?.title === "更多服务") {
                            delete item.title;
                            if (item?.items?.length > 0) {
                                let newItems = [];
                                for (let i of item.items) {
                                    if (/user_center\/feedback/g.test(i?.uri)) {
                                    }
                                    else if (/user_center\/setting/g.test(i?.uri)) {
                                        newItems.push(i);
                                    }
                                    else {
                                        continue;
                                    }
                                }
                                item.items = newItems;
                            }
                        }
                    }
                }
                else {
                    continue;
                }
            }
            newSects.push(item);
        }
        obj.data.sections_v2 = newSects;
    }
    delete obj.data.modular_vip_section;
    obj.data.use_modular_vip_section = false;
}
else if (url.includes("/x/v2/feed/index/story")) {
    if (obj?.data?.items?.length > 0) {
        let newItems = [];
        for (let item of obj.data.items) {
            if (item?.hasOwnProperty("ad_info")) {
                continue;
            }
            else if (["vertical_ad_av", "vertical_live", "vertical_pgc"]?.includes(item?.card_goto)) {
                continue;
            }
            else {
                delete item.creative_entrance;
                delete item.story_cart_icon;
                delete item.free_flow_toast;
                newItems.push(item);
            }
        }
        obj.data.items = newItems;
    }
}
else if (url.includes("/pgc/page/bangumi") || url.includes("/pgc/page/cinema/tab")) {
    if (obj.result?.modules?.length > 0) {
        obj.result.modules.forEach((i) => {
            if (i?.style?.startsWith("banner")) {
                if (i?.items?.length > 0) {
                    i.items = i.items.filter((ii) => ii?.link?.includes("play"));
                }
            }
            else if (i?.style?.startsWith("function")) {
                if (i?.items?.length > 0) {
                    i.items = i.items.filter((ii) => ii?.blink?.startsWith("bilibili"));
                }
            }
            else if ([241, 1283, 1284, 1441]?.includes(i?.module_id)) {
                if (i?.items?.length > 0) {
                    i.items = [];
                }
            }
            else if (i?.style?.startsWith("tip")) {
                if (i?.items?.length > 0) {
                    i.items = [];
                }
            }
        });
    }
}
else if (url.includes("/xlive/app-room/v1/index/getInfoByRoom") || url.includes("/xlive/app-room/v1/index/getInfoByUser") || url.includes("/xlive/app-interface/v2/index/feed")) {
    delete obj.data.play_together_info;
    delete obj.data.play_together_info_v2;
    delete obj.data.activity_banner_info;
    if (obj?.data?.function_card?.length > 0) {
        obj.data.function_card = null;
    }
    const banner_list = ["banner_v2", "activity_card_v1"];
    if (obj?.data?.card_list?.length > 0) {
        obj.data.card_list = obj.data.card_list.filter((item) => !banner_list.includes(item.card_type));
        obj.data.card_list.forEach(card => {
            if (card?.card_type === 'area_entrance_v3') {
                const targetList = card?.card_data?.area_entrance_v3?.list;
                if (targetList && Array.isArray(targetList)) {
                    card.card_data.area_entrance_v3.list = targetList.filter(item => item?.id === 6);
                }
            }
        });
    }
    if (obj?.data?.new_tab_info?.outer_list?.length > 0) {
        obj.data.new_tab_info.outer_list = obj.data.new_tab_info.outer_list.filter((i) => i?.biz_id !== 33);
    }
    if (obj?.data?.show_reserve_status !== undefined) {
        obj.data.show_reserve_status = false;
    }
    if (obj?.data?.reserve_info !== undefined) {
        obj.data.reserve_info.show_reserve_status = false;
    }
    if (obj?.data?.shopping_info !== undefined) {
        obj.data.shopping_info.is_show = 0;
    }
}
else if (url.includes("/second/getList")) {
    obj.data.banner = [];
}
body = JSON.stringify(obj);
$done({ body });
