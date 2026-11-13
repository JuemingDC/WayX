let url = $request.url;
let body = $response.body;
let obj = JSON.parse(body);
if (url.includes("/gw/mtop.taobao.idlehome.home.nextfresh")) {
    delete obj.data.widgetReturnDO;
    delete obj.data.bannerReturnDO;
    if (obj.data?.sections) {
        obj.data.sections = obj.data.sections.filter(section => {
            return !(section.data && (section.data.bizType === "AD" || section.data.bizType === "homepage"));
        });
        let excludeNames = ['fish_home_yunying_card_d3', 'idlefish_seafood_market', 'fish_home_chat_room'];
        obj.data.sections = obj.data.sections.filter(function (section) {
            return !excludeNames.includes(section.template.name);
        });
        obj.data.sections = obj.data.sections.filter(section => {
            return (section.data && (section.data.cardTypeValue === "Item"));
        });
    }
    obj.data.homeTopList = [];
}
if (url.includes("/gw/mtop.taobao.idle.local.home")) {
    if (obj.data?.sections) {
        obj.data.sections = obj.data.sections.filter(section => {
            return !(section.data && section.data.bizType === "AD");
        });
    }
}
if (url.includes("/gw/mtop.taobao.idle.home.whale.modulet")) {
    delete obj.data.container.sections;
}
if (url.includes("/gw/mtop.taobao.idlemtopsearch.search.shade") || url.includes("/gw/mtop.taobao.idle.user.strategy.list")) {
    delete obj.data;
}
if (url.includes("/mtop.idle.user.page.my.adapter")) {
    const indexArr = ["0", "1", "3"];
    obj.data.container.sections = obj.data.container.sections.filter(item => indexArr.includes(item.index));
    obj.data.ability = [];
}
if (url.includes("/mtop.taobao.idlehome.home.circle.list")) {
    obj.data.circleList = obj.data.circleList.filter(circle => circle.circleId === "1" || circle.circleId === "2");
    if (obj.data?.next?.headList) {
        obj.data.next.headList = obj.data.next.headList.filter(circle => circle.bizCode === "main" || circle.bizCode === "recycle");
        const target = obj.data.next.headList.find(item => item.bizCode === "recycle");
        if (target) {
            if (!target.showInfo) {
                target.showInfo = {};
            }
            target.showInfo.rightTagImage = {};
        }
    }
    if (obj.data?.headList?.length > 0) {
        obj.data.headList = obj.data.headList.filter(circle => circle.bizCode === "main" || circle.bizCode === "recycle");
        const target = obj.data.headList.find(item => item.bizCode === "recycle");
        if (target) {
            if (!target.showInfo) {
                target.showInfo = {};
            }
            target.showInfo.rightTagImage = {};
        }
    }
}
if (url.includes("/gw/mtop.taobao.idlemtopsearch.search")) {
    if (obj.data && Array.isArray(obj.data.resultList)) {
        obj.data.resultList = obj.data.resultList.filter(element => {
            if (element.data && element.data.item && element.data.item.main && element.data.item.main.exContent) {
                const isAliMaMaAD = element.data.item.main.exContent.isAliMaMaAD;
                return !(isAliMaMaAD === true || isAliMaMaAD === "true");
            }
            return true;
        });
        const excludeNames = ["idlefish_search_card_category_select", "idlefish_search_spu_market_publish"];
        obj.data.resultList = obj.data.resultList.filter(element => {
            return !excludeNames.includes(element.data.template.name);
        });
    }
    if (obj.data?.resultPrefixBar) {
        delete obj.data.resultPrefixBar;
    }
    if (obj.data?.topList) {
        obj.data.topList = [];
    }
}
if (url.includes("/mtop.taobao.idle.group.myself.banner")) {
    obj.data.bannerList = [];
}
if (url.includes("/mtop.taobao.idle.playboy.recommend")) {
    obj.data.recommends = [];
    obj.data.items = [];
    obj.data.next = false;
}
if (url.includes("/mtop.taobao.idle.item.recommend.list")) {
    obj.data.cardList = [];
}
if (url.includes("/mtop.taobao.idle.local.nearby.itemdetail.enter/1.0")) {
    obj.data.targetUrl = "";
    obj.data.trackParams.itemIds = "";
    obj.data.nearbyItemInfoList = [];
    obj.data.name = "";
    obj.data.desc = "";
    obj.data.poiName = "";
}
if (url.includes("/gw/mtop.taobao.idlemessage.session.sync/3.0")) {
    obj.data.sessions = obj.data.sessions.filter(session => session.session.sessionType !== "25");
}
if (url.includes("idle.fun.follow.feed.list")) {
    obj.data.sections = obj.data.sections.filter(session => session.cardType === 9999);
    obj.data.sections.forEach(section => {
        if (section.cardData?.subText) {
            section.cardData.subText = "";
        }
    });
}
if (url.includes("idle.fun.follow.often.visit")) {
    obj.data.sections = [];
}
if (url.includes("idle.circle.myself.banner/1.0")) {
    obj.data.bannerList = [];
}
if (url.includes("idle.circle.visited/1.0")) {
    obj.data.visitedCircleList = [];
}
if (url.includes("follow.recommend.feed.list")) {
    obj.data.needDecryptKeys = [];
    obj.data.nextPage = false;
    obj.data.fitRecommendAB = true;
}
if (url.includes("/mtop.taobao.idle.local.flow.plat.section")) {
    const keyArr = ["fish_home_activity_enter_cardV1"];
    obj.data.data.components = obj.data.data.components.filter(item => !keyArr.includes(item.key));
}
body = JSON.stringify(obj);
$done({ body });
