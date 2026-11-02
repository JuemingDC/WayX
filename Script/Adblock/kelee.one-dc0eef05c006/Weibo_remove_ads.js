(function(){
const __wayxTarget=typeof $loon==='string'?'loon':typeof $task!=='undefined'&&typeof $task.fetch==='function'?'qx':typeof $environment!=='undefined'&&$environment['surge-version']?'surge':null;
if(!__wayxTarget)throw new Error('Unsupported adblock script host');
const __wayxCodecs=undefined;
const __wayxHost={request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,script:typeof $script==='undefined'?undefined:$script,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,prefs:typeof $prefs==='undefined'?undefined:$prefs,notify:typeof $notification==='undefined'?undefined:$notification,notifyQx:typeof $notify==='undefined'?undefined:$notify,http:typeof $httpClient==='undefined'?undefined:$httpClient,task:typeof $task==='undefined'?undefined:$task,argument:typeof $argument==='undefined'?undefined:$argument,codecs:__wayxCodecs};
const __wayxContexts={"response":{"qx":{"from":"loon","to":"qx","phase":"response","binary":false,"responseBody":false,"apiPlan":{"version":1,"omitNotificationOptions":true,"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"policy","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"},"target":{"responseStatus":"statusCode","scriptStartTime":"absent","binaryField":"bodyBytes","store":{"style":"prefs","read":"valueForKey","write":"setValueForKey","remove":"removeValueForKey","undefinedDeletes":false},"http":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"notification":{"root":"$notify","open":null,"media":null,"action":null,"openAction":null,"stringLink":false,"delay":false},"completion":{"statusEncoding":"line","synthetic":"flat"},"argument":"absent"}},"headerReads":{},"headerPrefixes":{},"binaryReads":false},"surge":{"from":"loon","to":"surge","phase":"response","binary":false,"responseBody":false,"apiPlan":{"version":1,"omitNotificationOptions":false,"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"policy","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"},"target":{"responseStatus":"status","scriptStartTime":"epoch-seconds","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":false},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"policy","timeoutMs":1000,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":false}},"notification":{"root":"$notification.post","open":"url","media":"media-url","action":"action","openAction":"open-url","stringLink":false,"delay":false},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"string"}},"headerReads":{},"headerPrefixes":{},"binaryReads":false},"loon":{"from":"loon","to":"loon","phase":"response","binary":false,"responseBody":false,"apiPlan":{"version":1,"omitNotificationOptions":false,"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"policy","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"},"target":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"policy","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"}}}}},__wayxRole=__wayxHost.response===undefined?'request':'response',__wayxConfig=__wayxContexts[__wayxRole]&&__wayxContexts[__wayxRole][__wayxTarget];
if(!__wayxConfig)throw new Error('Unregistered adblock HTTP trigger');
const __wayxRun=function($request,$response,$done,$script,$persistentStore,$prefs,$notification,$notify,__wayxContext,setTimeout,setInterval){
/*
引用地址：https://raw.githubusercontent.com/RuCu6/Loon/main/Scripts/weibo.js
*/
// 2026-04-23 18:00

const url = $request.url;
if (!$response) $done({});
if (!$response.body) $done({});
let body = $response.body;

// 微博详情页菜单配置
const itemMenusConfig = {
  creatortypeask: false, // 转发任务
  mblog_menus_apeal: true, // 申诉
  mblog_menus_avatar_widget: false, // 用此头像挂件
  mblog_menus_bullet_shield: true, // 屏蔽弹幕
  mblog_menus_card_bg: false, // 用此卡片背景
  mblog_menus_comment_manager: true, // 评论管理
  mblog_menus_copy_url: true, // 复制链接
  mblog_menus_custom: false, // 寄微博
  mblog_menus_delete: true, // 删除
  mblog_menus_edit: true, // 编辑
  mblog_menus_edit_history: true, // 编辑记录
  mblog_menus_edit_video: true, // 编辑视频
  mblog_menus_favorite: true, // 收藏
  mblog_menus_follow: true, // 关注
  mblog_menus_home: false, // 返回首页
  mblog_menus_long_picture: true, // 生成长图
  mblog_menus_modify_visible: true, // 设置分享范围
  mblog_menus_novelty: false, // 新鲜事投稿
  mblog_menus_open_reward: false, // 赞赏
  mblog_menus_popularize: false,
  mblog_menus_promote: false, // 推广
  mblog_menus_report: true, // 投诉
  mblog_menus_shield: true, // 屏蔽
  mblog_menus_sticking: true, // 置顶
  mblog_menus_video_feedback: false, // 播放反馈
  mblog_menus_video_later: false // 可能是稍后再看
};

if (url.includes("/interface/sdk/sdkad.php")) {
  // 开屏广告
  let obj = JSON.parse(body.substring(0, body.length - 2));
  if (obj?.needlocation) {
    obj.needlocation = false;
  }
  if (obj?.show_push_splash_ad) {
    obj.show_push_splash_ad = false;
  }
  if (obj?.background_delay_display_time) {
    obj.background_delay_display_time = 31536000; // 60 * 60 * 24 * 365 = 31536000
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
} else {
  let obj = JSON.parse(body);
  if (url.includes("/2/cardlist")) {
    if (obj?.top) {
      delete obj.top; // 发现页 趋势 顶部头图
    }
    if (obj?.cards?.length > 0) {
      let newCards = [];
      for (let card of obj.cards) {
        if (card?.card_group?.length > 0) {
          let newGroup = [];
          for (let group of card.card_group) {
            let cardType = group.card_type;
            // 120,145 视频版块轮播图 192横版热门视频 电影 颜值 电视剧等
            if ([120, 145, 192].includes(cardType)) {
              continue;
            }
            // 我的热搜 查看更多热搜
            if (cardType === 6) {
              continue;
            }
            if (group?.mblog) {
              removeAvatar(group?.mblog); // 卡片挂件,关注按钮
            }
            newGroup.push(group);
          }
          card.card_group = newGroup;
          newCards.push(card);
        } else {
          let cardType = card.card_type;
          // 17猜你想搜 58搜索偏好设置
          if ([17, 58].includes(cardType)) {
            continue;
          }
          if (card?.mblog) {
            removeAvatar(card?.mblog); // 卡片挂件,关注按钮
          }
          newCards.push(card);
        }
      }
      obj.cards = newCards;
    }
  } else if (url.includes("/2/checkin/show")) {
    // 首页签到
    if (obj?.show) {
      obj.show = 0;
    }
    if (obj?.show_time) {
      obj.show_time = 0;
    }
  } else if (url.includes("/2/client/publisher_list")) {
    // 首页右上角按钮
    if (obj?.elements?.length > 0) {
      obj.elements = obj.elements.filter((i) => ["写微博", "图片", "视频"].includes(i?.app_name));
    }
  } else if (url.includes("/2/comments/build_comments")) {
    // 评论区
    if (obj?.datas?.length > 0) {
      let newItems = [];
      for (let item of obj.datas) {
        if (item?.data) {
          if (!isAd(item?.data)) {
            if (item?.data?.comment_bubble) {
              delete item.data.comment_bubble; // 评论气泡
            }
            if (item?.data?.comment_bullet_screens_message) {
              delete item.data.comment_bullet_screens_message; // 评论弹幕
            }
            if (item?.data?.hot_icon) {
              delete item.data.hot_icon; // 热评小图标 弹幕 首评
            }
            if (item?.data?.vip_button) {
              delete item.data.vip_button; // 会员气泡按钮
            }
            // 微博伪装评论
            if (item?.data?.user) {
              removeAvatar(item?.data); // 头像挂件,关注按钮
              if (/(超话社区|微博)/.test(item?.data?.user?.name)) {
                continue;
              }
            }
            // 6为你推荐更多精彩内容 15过滤提示 41评论区氛围调查
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
    } else if (obj?.root_comments?.length > 0) {
      let newItems = [];
      for (let item of obj.root_comments) {
        if (!isAd(item)) {
          if (item?.comment_bubble) {
            delete item.comment_bubble; // 评论气泡 新版本
          }
          if (item?.data?.comment_bubble) {
            delete item.data.comment_bubble; // 评论气泡
          }
          if (item?.data?.comment_bullet_screens_message) {
            delete item.data.comment_bullet_screens_message; // 评论弹幕
          }
          if (item?.data?.hot_icon) {
            delete item.data.hot_icon; // 热评小图标 弹幕 首评
          }
          if (item?.data?.vip_button) {
            delete item.data.vip_button; // 会员气泡按钮
          }
          // 微博伪装评论
          if (item.user) {
            removeAvatar(item); // 头像挂件,关注按钮
            if (["超话社区", "微博视频"].includes(item?.user?.name)) {
              continue;
            }
          }
          newItems.push(item);
        }
      }
      obj.root_comments = newItems;
    } else if (obj?.comments?.length > 0) {
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
      removeVoteInfo(obj?.status); // 投票窗口
    }
  } else if (url.includes("/2/container/asyn")) {
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        removeAvatar(item?.data); // 关注按钮
        if (/infeed_may_interest_in/.test(item?.itemId)) {
          // 你可能感兴趣的超话
          continue;
        }
        if (item?.itemId === null) {
          // 横版博主卡片
          continue;
        }
        if (item?.items?.length > 0) {
          for (let i of item.items) {
            removeAvatar(i?.data); // 背景卡片
            removeVoteInfo(i?.data); // 投票窗口
          }
        }
        newItems.push(item);
      }
      obj.items = newItems;
    }
  } else if (url.includes("/2/direct_messages/user_list")) {
    if (obj?.user_list?.length > 0) {
      obj.user_list = obj.user_list.filter((i) => !["活动通知", "闪聊"].includes(i?.user?.name));
    }
  } else if (url.includes("/2/flowlist")) {
    // 关注列表
    if (obj?.items?.length > 0) {
      for (let item of obj.items) {
        if (item?.items?.length > 0) {
          for (let i of item.items) {
            removeAvatar(i?.data); // 背景卡片
            removeVoteInfo(i?.data); // 投票窗口
          }
        }
      }
    }
    if (obj?.channelInfo?.channels?.length > 0) {
      let newTabs = [];
      for (let tab of obj.channelInfo.channels) {
        if (/_selfrecomm/.test(tab?.flowId)) {
          // 关注页推荐tab
          continue;
        } else if (/_chaohua/.test(tab?.flowId)) {
          // 关注页超话tab
          continue;
        } else {
          newTabs.push(tab);
        }
      }
      obj.channelInfo.channels = newTabs;
    }
  } else if (url.includes("/2/flowpage")) {
    // 热搜列表
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        if (item?.data?.itemid === "hot-search-push-notice") {
          // 开启推送通知的提示
          continue;
        }
        if (item?.items?.length > 0) {
          let newII = [];
          for (let i of item.items) {
            if (i?.data.hasOwnProperty("promotion")) {
              // 热搜列表中的推广项目
              continue;
            } else if (/_img_search_stick/.test(i?.data?.pic)) {
              // 手动置顶的微博热搜
              continue;
            } else {
              newII.push(i);
            }
          }
          item.items = newII;
        }
        newItems.push(item);
      }
      obj.items = newItems;
    }
  } else if (url.includes("/2/groups/allgroups/v2")) {
    // 顶部tab
    if (obj?.pageDatas?.length > 0) {
      // homeFeed关注 homeHot推荐
      let newTabs = [];
      for (let item of obj.pageDatas) {
        if (item?.pageDataType === "homeExtend") {
          // 多余的推广tab 比如华为Mate60
          continue;
        } else {
          if (item?.categories?.length > 0) {
            let newCates = [];
            for (let i of item.categories) {
              if (i?.title === "默认分组") {
                if (i?.pageDatas?.length > 0) {
                  let newII = [];
                  for (let ii of i.pageDatas) {
                    if (["最新微博", "特别关注", "好友圈", "视频"].includes(ii?.title)) {
                      // 白名单列表
                      newII.push(ii);
                    } else {
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
  } else if (url.includes("/2/messageflow/notice")) {
    // 消息动态页
    if (obj?.messages?.length > 0) {
      let newMsgs = [];
      for (let msg of obj.messages) {
        if (msg?.msg_card?.ad_tag) {
          continue;
        } else {
          newMsgs.push(msg);
        }
      }
      obj.messages = newMsgs;
    }
  } else if (url.includes("/2/page")) {
    // 搜索页列表,超话
    if (obj?.cards?.length > 0) {
      if (obj?.cards?.[0]?.card_group?.length > 0) {
        obj.cards[0].card_group = obj.cards[0].card_group.filter(
          (c) => !(c?.actionlog?.ext?.includes("ads_word") || c?.itemid?.includes("t:51") || c?.itemid?.includes("ads_word"))
        );
      }
      obj.cards = obj.cards.filter(
        (i) =>
          !(
            i?.itemid?.includes("feed_-_invite") || // 超话里的好友
            i?.itemid?.includes("infeed_friends_recommend") || // 好友关注
            i?.itemid?.includes("infeed_may_interest_in") || // 你可能感兴趣的超话
            i?.itemid?.includes("infeed_pagemanual3") || // 手动区域3
            i?.itemid?.includes("infeed_weibo_mall") || // 微博小店
            i?.mblog?.mblogtypename?.includes("广告")
          )
      );
    } else if (obj?.card_group?.length > 0) {
      obj.card_group = obj.card_group.filter((i) => i?.desc?.includes("你可能感兴趣的超话"));
    }
  } else if (url.includes("/2/profile/container_timeline")) {
    if (obj?.loadedInfo?.follow_guide_info) {
      delete obj.loadedInfo.follow_guide_info; // 个人主页关注弹窗
    }
    // 个人主页信息流
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        if (item?.data?.left_hint?.[0]?.content === "全部微博(0)" && item?.data?.card_type === 216) {
          // 全部微博为0的博主
          break;
        } else if (/内容/.test(item?.data?.name) && item?.data?.card_type === 58) {
          // 个人微博页刷完后的推荐微博
          break;
        } else {
          if (item?.category === "card") {
            // 58微博展示时间段提示 216筛选按钮
            if ([58, 216].includes(item?.data?.card_type)) {
              if (/没有公开博文，为你推荐以下精彩内容/.test(item?.data?.name)) {
                // 个人微博页刷完后的推荐信息流
                continue;
              }
            }
            newItems.push(item);
          } else if (item?.category === "group") {
            // 遍历group,保留置顶微博
            if (item?.header?.data?.icon) {
              delete item.header.data.icon; // 置顶微博背景图
            }
            if (item?.itemId?.includes("INTEREST_PEOPLE")) {
              // 可能感兴趣的人
              continue;
            }
            if (item?.profile_type_id === "weibo_cardpics") {
              // 近期热门 精选微博 那年今日等横版内容
              continue;
            }
            if (item?.items?.length > 0) {
              let newII = [];
              for (let ii of item.items) {
                if (ii?.category === "feed") {
                  removeAvatar(ii?.data); // 头像挂件,关注按钮
                  removeFeedAd(ii?.data); // 信息流推广
                  removeVoteInfo(ii?.data); // 投票窗口
                  // 评论指引
                  if (ii?.data?.enable_comment_guide) {
                    ii.data.enable_comment_guide = false;
                  }
                  newII.push(ii);
                } else if (ii?.category === "card") {
                  if ([10, 48, 176].includes(ii?.data?.card_type)) {
                    // 最近关注与互动过的博主
                    continue;
                  }
                  if (ii?.data?.rightImage) {
                    delete ii.data.rightImage; // 新版置顶微博皇冠
                  }
                  if (ii?.data?.backgroundImage) {
                    delete ii.data.backgroundImage; // 新版置顶微博背景图
                  }
                  newII.push(ii);
                }
              }
              item.items = newII;
            }
            newItems.push(item);
          } else if (item?.category === "feed") {
            if (!isAd(item?.data)) {
              removeFeedAd(item?.data); // 信息流推广
              removeVoteInfo(item?.data); // 投票窗口
              if (item?.data?.source?.includes("生日动态")) {
                // 移除生日祝福微博
                continue;
              }
              if (item?.data?.title?.text !== "热门" && item?.data?.title?.structs?.length > 0) {
                // 移除赞过的微博 保留热门内容
                continue;
              }
              newItems.push(item);
            }
          }
        }
      }
      obj.items = newItems;
    }
  } else if (url.includes("/2/profile/dealatt") || url.includes("/2/friendships/")) {
    // 个人主页点击关注后展示菜单
    if (obj?.cards?.length > 0) {
      obj.cards = []; // 相关推荐卡片
    }
    if (obj?.toolbar_menus_new?.items?.length > 0) {
      let toolbar = obj.toolbar_menus_new;
      // 底部菜单
      let newTools = [];
      for (let item of toolbar.items) {
        if (item?.identifier === "recommend") {
          // 相关推荐
          continue;
        } else if (/reward_/.test(item?.identifier)) {
          // 赞赏
          continue;
        } else {
          newTools.push(item);
        }
      }
      toolbar.items = newTools;
    }
  } else if (url.includes("/2/profile/me")) {
    // 我的页面
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
        } else if (itemId === "100505_-_top8") {
          if (item?.items?.length > 0) {
            item.items = item.items.filter(
              (i) =>
                i?.itemId === "100505_-_album" || // 我的相册
                i?.itemId === "100505_-_like" || // 赞/收藏
                i?.itemId === "100505_-_watchhistory" || // 浏览记录
                i?.itemId === "100505_-_draft" // 草稿箱
              // i?.itemId === "100505_-_pay" || // 我的钱包
              // i?.itemId === "100505_-_ordercenter" || // 我的订单
              // i?.itemId === "100505_-_productcenter" || // 创作中心
              // i?.itemId === "100505_-_promote" || // 广告中心
            );
          }
          newItems.push(item);
        } else if (itemId === "100505_-_manage") {
          if (item?.style) {
            delete item.style;
          }
          if (item?.images) {
            delete item.images; // 移除分隔符的点点点
          }
          newItems.push(item);
        } else if (itemId === "100505_-_manage2") {
          if (item?.footer) {
            delete item.footer; // 移除面板样式
          }
          if (item?.body) {
            delete item.body; // 移除框内推广
          }
          newItems.push(item);
        } else if (itemId === "100505_-_chaohua" || itemId === "100505_-_recentlyuser") {
          newItems.push(item);
        } else {
          // 移除其他推广
          continue;
        }
      }
      obj.items = newItems;
    }
  } else if (url.includes("/2/profile/statuses/tab")) {
    if (obj?.cards?.length > 0) {
      let newCards = [];
      for (let card of obj.cards) {
        if (card?.card_group?.length > 0) {
          let newGroup = [];
          for (let group of card.card_group) {
            let cardType = group.card_type;
            // 22那年今天
            if (cardType === 22) {
              continue;
            }
            if (group?.mblog) {
              removeAvatar(group?.mblog); // 卡片挂件,关注按钮
              removeVoteInfo(group?.mblog); // 投票窗口
            }
            newGroup.push(group);
          }
          card.card_group = newGroup;
          newCards.push(card);
        } else {
          if (card?.mblog) {
            removeAvatar(card?.mblog); // 卡片挂件,关注按钮
            removeVoteInfo(card?.mblog); // 投票窗口
          }
          newCards.push(card);
        }
      }
      obj.cards = newCards;
    }
    if (obj?.cardlistInfo?.page_type === "08") {
      delete obj.cardlistInfo; // 我的热搜
    }
  } else if (url.includes("/2/profile/userinfo")) {
    // 个人详情页
    if (obj?.header?.data?.userInfo?.avatar_extend_info) {
      delete obj.header.data.userInfo.avatar_extend_info; // 头像挂件
    }
    if (obj?.profileSkin?.data) {
      delete obj.profileSkin.data; // 全套个性皮肤
    }
    if (obj?.footer?.data) {
      let toolbar = obj.footer.data.toolbar_menus_new;
      // 底部菜单项目
      if (toolbar?.lottie_guide) {
        delete toolbar.lottie_guide; // 弹窗
      }
      if (toolbar?.servicePopup?.subData) {
        delete toolbar.servicePopup.subData; // 服务悬浮窗口
      }
      if (toolbar?.items?.length > 0) {
        let newTools = [];
        for (let item of toolbar.items) {
          if (item?.identifier === "recommend") {
            // 相关推荐
            continue;
          } else if (item?.identifier === "urge") {
            // 催更
            continue;
          } else if (/reward_/.test(item?.identifier)) {
            // 赞赏
            continue;
          } else {
            newTools.push(item);
          }
        }
        toolbar.items = newTools;
      }
    }
  } else if (url.includes("/2/push/active")) {
    if (obj?.compose_add_guide) {
      delete obj.compose_add_guide; // 过期的情人节红包
    }
    // delete obj.feed_redpacket; // 首页右上角红包图标
    if (obj?.floating_windows_force_show) {
      delete obj.floating_windows_force_show; // 强制展示的悬浮窗
    }
    if (obj?.interceptad) {
      delete obj.interceptad; // 可能是首页签到弹窗
    }
    if (obj?.interceptad_cardlist) {
      delete obj.interceptad_cardlist; // 可能是首页签到弹窗
    }
    if (obj?.loginconfig) {
      delete obj.loginconfig; // 登录领红包
    }
    if (obj?.profile_lotties) {
      delete obj.profile_lotties; // 个人主页头像挂件素材
    }
    if (obj?.ug_red_paper) {
      delete obj.ug_red_paper; // 可能是首页签到弹窗
    }
    if (obj?.weibo_pic_banner) {
      delete obj.weibo_pic_banner; // 微博种草晒图
    }
    // 禁用所有的悬浮窗
    if (obj?.disable_floating_window) {
      obj.disable_floating_window = "1";
    }
    // 首页右上角红包图标
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
  } else if (url.includes("/2/search/")) {
    // 搜索页信息流
    if (url.includes("container_timeline")) {
      if (obj?.loadedInfo) {
        delete obj.loadedInfo;
      }
      if (obj?.items?.length > 0) {
        let newItems = [];
        for (let item of obj.items) {
          if (item?.category === "feed") {
            if (!isAd(item?.data)) {
              removeFeedAd(item?.data); // 信息流推广
              newItems.push(item);
            }
          } else if (item?.category === "card") {
            // 19热议等tab 22商业推广 118横版广告图片 206,249横版视频广告 208实况热聊 217错过了热词 236微博趋势 261奥运滚动横幅
            if ([19, 22, 118, 206, 208, 217, 236, 249, 261].includes(item?.data?.card_type)) {
              continue;
            } else if (item?.data?.itemid === "ads_slide") {
              // 商业推广 主图 附图
              continue;
            } else if (item?.data?.cate_id === "1114") {
              // 微博趋势标题
              continue;
            } else if (item?.data.hasOwnProperty("rank")) {
              // 奥运等排行榜
              continue;
            } else {
              newItems.push(item);
            }
          } else if (item?.category === "cell") {
            // 保留信息流分割线
            newItems.push(item);
          } else if (item?.category === "group") {
            if (item?.item_category === "insert_item") {
              // 信息流内部嵌入的“微博热搜”
              continue;
            } else {
              if (item?.items?.length > 0) {
                let newII = [];
                for (let ii of item.items) {
                  // 118横版广告图片 182热议话题 217错过了热词 247横版视频广告 264微博趋势
                  if ([118, 182, 192, 217, 247, 264].includes(ii?.data?.card_type)) {
                    continue;
                  } else if (ii?.data?.cate_id === "1114") {
                    // 微博趋势
                    continue;
                  } else {
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
    } else if (url.includes("finder")) {
      if (obj?.channelInfo?.channels?.length > 0) {
        let newChannels = [];
        for (let channel of obj.channelInfo.channels) {
          // 顶部标签栏 白名单
          if (["band_channel", "discover_channel", "trends_channel"].includes(channel?.key)) {
            let payload = channel.payload;
            if (payload) {
              if (payload?.loadedInfo) {
                // 去除搜索框填充词
                if (payload?.loadedInfo?.searchBarContent?.length > 0) {
                  payload.loadedInfo.searchBarContent = [];
                }
                if (payload?.loadedInfo?.headerBack?.channelStyleMap) {
                  delete payload.loadedInfo.headerBack.channelStyleMap; // 去除搜索背景图片
                }
                if (payload?.loadedInfo?.searchBarStyleInfo) {
                  delete payload.loadedInfo.searchBarStyleInfo; // 搜索框样式
                }
              }
              if (payload?.items?.length > 0) {
                let newItems = [];
                for (let item of payload.items) {
                  if (item?.category === "feed") {
                    if (!isAd(item?.data)) {
                      removeFeedAd(item.data); // 信息流推广
                      // removeAvatar(item.data); // 头像挂件
                      newItems.push(item);
                    }
                  } else if (item?.category === "card") {
                    // 19热议等tab 22商业推广 118横版广告图片 206,249横版视频广告 208实况热聊 217错过了热词 236微博趋势 261奥运滚动横幅
                    if ([19, 22, 118, 206, 208, 217, 236, 249, 261].includes(item?.data?.card_type)) {
                      continue;
                    } else if (item?.data?.itemid === "ads_slide") {
                      // 商业推广 主图 附图
                      continue;
                    } else if (item?.data?.cate_id === "1114") {
                      // 微博趋势标题
                      continue;
                    } else if (item?.data.hasOwnProperty("rank")) {
                      // 奥运等排行榜
                      continue;
                    } else {
                      newItems.push(item);
                    }
                  } else if (item?.category === "cell") {
                    // 保留信息流分割线
                    newItems.push(item);
                  } else if (item?.category === "group") {
                    if (item?.item_category === "insert_item") {
                      // 信息流内部嵌入的“个性化开关”
                      continue;
                    } else {
                      if (item?.items?.length > 0) {
                        let newII = [];
                        for (let ii of item.items) {
                          // 118横版广告图片 182热议话题 192横版好看视频 217错过了热词 247横版视频广告 264微博趋势
                          if ([118, 182, 192, 217, 247, 264].includes(ii?.data?.card_type)) {
                            continue;
                          } else if (ii?.data?.cate_id === "1114") {
                            // 微博趋势
                            continue;
                          } else {
                            removeFeedAd(ii?.data); // 头像挂件
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
          } else {
            continue;
          }
        }
        obj.channelInfo.channels = newChannels;
      }
      if (obj?.channelInfo?.moreChannels) {
        // 更多版块
        delete obj.channelInfo.moreChannels;
      }
      if (obj?.header?.insert_data) {
        delete obj.header.insert_data;
      }
      if (obj?.header?.data?.items?.length > 0) {
        // 2025-01-24更新 新版本finder_window
        let newItems = [];
        for (let item of obj.header.data.items) {
          if (item?.category === "card") {
            if ([19, 22, 118, 206, 208, 217, 236, 249, 261].includes(item?.data?.card_type)) {
              continue;
            }
            if (item?.data.hasOwnProperty("rank")) {
              // 各种赛事排行榜
              continue;
            }
          } else if (item?.category === "group") {
            if (item?.items?.length > 0) {
              let newII = [];
              for (let i of item.items) {
                if ([118, 182, 192, 217, 247, 264].includes(i?.data?.card_type)) {
                  continue;
                } else {
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
  } else if (url.includes("/2/searchall")) {
    if (obj?.header?.data) {
      // 商品推广头部淘宝跳转
      const items = ["bg_img", "background_scheme", "background_url"];
      for (let i of items) {
        delete obj.header.data[i];
      }
    }
    if (obj?.loadedInfo?.serviceMap?.layer) {
      delete obj.loadedInfo.serviceMap.layer; // 搜索结果 悬浮窗
    }
    if (obj?.footer) {
      // 讨论区动画
      if (obj?.footer?.data?.bg_lottie) {
        delete obj.footer.data.bg_lottie;
      }
      if (obj?.footer?.data?.bg_lottie_dark) {
        delete obj.footer.data.bg_lottie_dark;
      }
      if (obj?.footer?.data?.discuss_avatars) {
        delete obj.footer.data.discuss_avatars; // 进入讨论区气泡动画头像
      }
      if (obj?.footer?.data?.menus?.length > 0) {
        // 底部菜单
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
              // 先筛选card_group里面的card_type
              // 横版广告图
              continue;
            } else if (group?.card_type === 42 && group?.title_extra_text === "广告") {
              // 推荐品牌广告
              continue;
            } else if (group?.card_type === 3 && group?.pics?.length > 0) {
              // 推荐品牌广告图
              continue;
            } else {
              if (group?.mblog) {
                // 有mblog字段的过滤广告
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
                    delete group.mblog.common_struct; // 商品橱窗
                  }
                  removeAvatar(group?.mblog); // 头像挂件,关注按钮
                  removeVoteInfo(group?.mblog); // 投票窗口
                  // 新版热推
                  if (group?.mblog?.is_ad === 1) {
                    continue;
                  }
                  newGroup.push(group);
                }
              } else {
                newGroup.push(group); // 没有mblog字段的全部推送
              }
            }
          }
          card.card_group = newGroup;
          newCards.push(card);
        } else {
          if (card?.mblog) {
            if (!isAd(card?.mblog)) {
              removeAvatar(card?.mblog); // 头像挂件,关注按钮
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
                delete card.mblog.common_struct; // 商品橱窗
              }
              removeVoteInfo(card?.mblog); // 投票窗口
              // 隐藏在 cards 里面的投票窗口
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
    // 13.11.1版本obj下的cards变为了items 2023-11-26
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        if (!isAd(item?.data)) {
          if (item?.category === "feed") {
            removeFeedAd(item?.data); // 信息流推广
            removeVoteInfo(item?.data); // 投票窗口
            newItems.push(item);
          } else if (item?.category === "group") {
            if (item?.items?.length > 0) {
              let newII = [];
              for (let ii of item.items) {
                if (ii?.cate_id === "638" && ii?.readtimetype === "card") {
                  // 大家都在问
                  continue;
                } else {
                  if (!isAd(ii?.data)) {
                    // removeAvatar(ii?.data);
                    removeFeedAd(ii?.data); // 商品橱窗
                    // 3推广卡片 17相关搜索 22广告图 25智搜总结 30推荐博主 42,236智搜问答 89商品推广视频 101大家都在问 206推广视频
                    if ([3, 17, 22, 30, 42, 89, 101, 206].includes(ii?.data?.card_type)) {
                      continue;
                    } else if (ii?.data?.card_type === 4 && ii?.data?.cate_id === "640") {
                      // 大家都在问
                      continue;
                    } else if (ii?.data?.card_type === 42 && ii?.data?.is_ads === true) {
                      // 商品推广desc
                      continue;
                    }
                    newII.push(ii);
                  }
                }
              }
              item.items = newII;
            }
            newItems.push(item);
          } else {
            newItems.push(item);
          }
        }
      }
      obj.items = newItems;
    }
  } else if (url.includes("/2/shproxy/chaohua/discovery/searchactive")) {
    // 超话搜索页
    if (obj?.items?.length > 0) {
      // 1007 可能感兴趣的话题
      obj.items = obj.items.filter((i) => i?.data?.card_type !== 1007);
    }
  } else if (url.includes("/2/statuses/container_detail?")) {
    // 新版 微博详情页
    if (obj?.pageHeader?.data?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.pageHeader.data.items) {
        if (item?.category === "card" && item?.data?.is_ad_card === 1) {
          // 底部卡片广告
          continue;
        } else if (item?.category === "card" && item?.data?.card_type === 227) {
          // 铁粉参与互动
          continue;
        } else if (item?.category === "group" && item?.items?.length > 0) {
          // 博主好物种草 关注推荐
          continue;
        } else if (item?.category === "wboxcard" && item?.data?.card_type === 236) {
          // 底部横版广告
          continue;
        } else if (item?.data?.itemid === "top_searching" && item?.data?.card_type === 248) {
          // 底部大家都在搜
          continue;
        } else {
          newItems.push(item);
        }
      }
      obj.pageHeader.data.items = newItems;
    }
    if (obj?.detailInfo?.extend?.ai_search_share) {
      // 底部智搜
      delete obj.detailInfo.extend.ai_search_share;
    }
    if (obj?.detailInfo?.extend?.follow_data) {
      // 关注弹窗
      delete obj.detailInfo.extend.follow_data;
    }
    if (obj?.detailInfo?.extend?.reward_info) {
      // 赞赏信息
      delete obj.detailInfo.extend.reward_info;
    }
    if (obj?.detailInfo?.extend?.sharecontent) {
      // 微信领红包
      delete obj.detailInfo.extend.sharecontent;
    }
    if (obj?.detailInfo?.status?.reward_info) {
      // 赞赏信息
      delete obj.detailInfo.status.reward_info;
    }
  } else if (url.includes("/2/statuses/comments_expand_child")) {
    // 评论区更多回复 二级页面
    if (obj?.items?.length > 0) {
      for (let item of obj.items) {
        removeAvatar(item?.data); // 头像挂件,关注按钮
      }
    }
  } else if (url.includes("/2/statuses/container_detail_comment")) {
    // 新版 微博评论区
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        if (item?.type !== "trend" && item?.type !== "comment_header_tip") {
          // 广告 铁粉标记
          if (item?.data) {
            removeAvatar(item?.data); // 头像挂件,关注按钮
            if (item?.data?.card_type === 236 || item?.data?.itemid === "ai_summary_entrance_real_show") {
              // 罗伯特总结
              continue;
            }
            if (item?.data?.comment_bubble) {
              delete item.data.comment_bubble; // 评论气泡
            }
            if (item?.data?.comment_bullet_screens_message) {
              delete item.data.comment_bullet_screens_message; // 评论弹幕
            }
            if (item?.data?.hot_icon) {
              delete item.data.hot_icon; // 热评小图标 弹幕 首评
            }
            if (item?.data?.vip_button) {
              delete item.data.vip_button; // 会员气泡按钮
            }
          }
          if (item?.items?.length > 0) {
            let newII = [];
            for (let ii of item.items) {
              if (ii?.data) {
                removeAvatar(ii?.data); // 头像挂件,关注按钮
                if (/微博智搜/.test(ii?.data?.user?.name)) {
                  continue;
                }
                if (ii?.data?.comment_bubble) {
                  delete ii.data.comment_bubble; // 评论气泡
                }
                if (ii?.data?.comment_bullet_screens_message) {
                  delete ii.data.comment_bullet_screens_message; // 评论弹幕
                }
                if (ii?.data?.hot_icon) {
                  delete ii.data.hot_icon; // 热评小图标 弹幕 首评
                }
                if (ii?.data?.vip_button) {
                  delete ii.data.vip_button; // 会员气泡按钮
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
  } else if (url.includes("/2/statuses/container_timeline_hot") || url.includes("/2/statuses/unread_hot_timeline")) {
    // 首页推荐tab信息流
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
            removeFeedAd(item?.data); // 信息流推广
            removeVoteInfo(item?.data); // 投票窗口
            newItems.push(item);
          } else {
            // 移除其他推广
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
          removeFeedAd(item); // 信息流推广
          newStatuses.push(item);
        }
      }
      obj.statuses = newStatuses;
    }
  } else if (url.includes("/2/statuses/container_timeline?") || url.includes("/2/statuses/container_timeline_unread")) {
    if (obj?.loadedInfo?.headers) {
      delete obj.loadedInfo.headers; // 首页关注tab信息流
    }
    if (obj?.common_struct) {
      delete obj.common_struct; // 商品橱窗
    }
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        if (!isAd(item?.data) && !isAd(item?.status)) {
          if (item?.category === "dynamic") {
            if (item?.status?.action_button_icon_dic) {
              delete item.status.action_button_icon_dic;
            }
            removeFeedAd(item?.status); // 信息流推广
            removeVoteInfo(item?.status); // 投票窗口
            if (item.status?.title?.structs) {
              // 移除 未关注人消息 (你关注的博主，他自己关注的别的博主的微博消息)
              continue;
            }
            // 快转内容
            if (item?.status?.screen_name_suffix_new?.length > 0) {
              if (item?.status?.screen_name_suffix_new?.[3]?.content === "快转了") {
                continue;
              }
            }
            // 美妆精选季
            if (item?.status?.title?.text?.includes("精选")) {
              continue;
            }
            // 未关注博主
            if (item?.status?.user?.following === false) {
              continue;
            }
            // 关闭关注推荐
            if (item?.status?.user?.unfollowing_recom_switch === 1) {
              item.status.user.unfollowing_recom_switch = 0;
            }
            // 博主top100
            if (item?.status?.tag_struct?.length > 0) {
              item.status.tag_struct = [];
            }
            newItems.push(item);
          } else if (item?.category === "feed") {
            if (item?.data?.action_button_icon_dic) {
              delete item.data.action_button_icon_dic;
            }
            removeFeedAd(item?.data); // 信息流推广
            removeVoteInfo(item?.data); // 投票窗口
            if (item.data?.title?.structs) {
              // 移除 未关注人消息 (你关注的博主，他自己关注的别的博主的微博消息)
              continue;
            }
            // 快转内容
            if (item?.data?.screen_name_suffix_new?.length > 0) {
              if (item?.data?.screen_name_suffix_new?.[3]?.content === "快转了") {
                continue;
              }
            }
            // 美妆精选季
            if (item?.data?.title?.text?.includes("精选")) {
              continue;
            }
            // 未关注博主
            if (item?.data?.user?.following === false) {
              continue;
            }
            // 关闭关注推荐
            if (item?.data?.user?.unfollowing_recom_switch === 1) {
              item.data.user.unfollowing_recom_switch = 0;
            }
            // 博主top100
            if (item?.data?.tag_struct?.length > 0) {
              item.data.tag_struct = [];
            }
            newItems.push(item);
          } else if (item?.category === "feedBiz") {
            newItems.push(item); // 管理特别关注按钮
          } else {
            // 移除其他推广
            continue;
          }
        }
      }
      obj.items = newItems;
    }
  } else if (url.includes("/2/statuses/container_timeline_topic")) {
    // 超话信息流
    if (obj?.header?.data?.follow_guide_info) {
      delete obj.header.data.follow_guide_info; // 底部弹出的关注按钮
    }
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        if (item?.category === "feed") {
          removeAvatar(item?.data); // 头像挂件,关注按钮
          if (!isAd(item?.data)) {
            if (item?.data?.title?.text?.includes("新人导师")) {
              // 萌新帖 互动赢新人导师
              delete item.data.title;
            }
            newItems.push(item);
          }
        } else if (item?.category === "card") {
          if ([4, 197, 236, 1012].includes(item?.data?.card_type)) {
            // 4你可能感兴趣的超话 197你可能感兴趣的超话 236壁纸故事 1012热门超话
            continue;
          } else {
            if (item?.data?.card_type === 31 && item?.data?.hotwords?.length > 0) {
              // 31 搜索框滚动热词
              item.data.hotwords = [];
            }
            if (item?.data?.card_type === 22 && item?.data.hasOwnProperty("card_ad_style")) {
              continue;
            }
            newItems.push(item);
          }
        } else if (item?.category === "group") {
          if (item?.style?.topHover) {
            delete item.style.topHover; // 空降发帖背景图
          }
          if (item?.items?.length > 0) {
            if (item?.itemId === null) {
              // 超话页顶部乱七八糟
              let newII = [];
              for (let ii of item.items) {
                if (ii?.data.hasOwnProperty("itemid")) {
                  if (ii?.data?.itemid?.includes("mine_topics")) {
                    // 保留我的超话
                    newII.push(ii);
                  } else if (ii?.data?.itemid?.includes("tab_search_input")) {
                    // 保留搜索框
                    if (ii?.data?.hotwords) {
                      ii.data.hotwords = [{ word: "搜索超话" }]; // 删除热搜词
                    }
                    newII.push(ii);
                  } else if (ii?.data?.itemid?.includes("poiRankList")) {
                    newII.push(ii); // 保留地点超话 地标人气榜
                  }
                } else {
                  newII.push(ii); // 放行无itemid字段的内容
                }
                removeAvatar(ii?.data); // 头像挂件,关注按钮
              }
              item.items = newII;
            } else {
              let newII = [];
              for (let ii of item.items) {
                if (ii?.data) {
                  if (ii?.data?.common_struct) {
                    delete ii.data.common_struct;
                  }
                  removeAvatar(ii?.data);
                  if ([1008, 1024].includes(ii?.data?.card_type)) {
                    // 1008关注你感兴趣的超话 1024超话顶部发现
                    continue;
                  } else {
                    newII.push(ii);
                  }
                }
              }
              item.items = newII;
            }
          }
          if (item?.header?.arrayText?.contents?.length > 0) {
            // 你的好友也关注了
            continue;
          }
          newItems.push(item);
        } else {
          // 移除其他推广
          continue;
        }
      }
      obj.items = newItems;
    }
  } else if (url.includes("/2/statuses/extend")) {
    // 微博详情页
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
      "bubble_guide_data", // 评论区弹窗
      "button_extra_info", // 推荐评论
      "display_info", // 二楼
      "extend_info", // 拓展卡片
      "floating_button", // 悬浮购物车按钮
      "follow_data", // 关注提醒
      "head_cards", // 超话投票
      "highlight", // 二楼
      "interaction_extra_info", // ai评论
      "page_alerts", // 超话新帖 新用户通知
      "reward_info", // 公益赞赏
      "source_tag_struct", // 二楼
      "top_cards" // 大家都在搜
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
        } else if (add) {
          newActions.push(item);
        }
      }
      obj.custom_action_list = newActions;
    }
    if (obj?.has_common_struct) {
      obj.has_common_struct = false; // 商品橱窗
    }
    if (obj?.enable_comment_guide) {
      obj.enable_comment_guide = false; // 评论指引
    }
  } else if (url.includes("/2/statuses/repost_timeline")) {
    // 评论详情页 转发区
    if (obj?.hot_reposts?.length > 0) {
      // 样式1
      let newReposts = [];
      for (let item of obj.hot_reposts) {
        if (!isAd(item)) {
          newReposts.push(item);
        }
      }
      obj.hot_reposts = newReposts;
    }
    if (obj?.reposts?.length > 0) {
      // 样式2
      let newReposts = [];
      for (let item of obj.reposts) {
        if (!isAd(item)) {
          newReposts.push(item);
        }
      }
      obj.reposts = newReposts;
    }
  } else if (url.includes("/2/statuses/show")) {
    removeFeedAd(obj); // 信息流推广
    // 循环引用中的商品橱窗
    if (obj?.text) {
      removeFeedAd(obj.text); // 信息流推广
    }
    if (obj?.reward_info) {
      delete obj.reward_info; // 赞赏信息
    }
    // 投票窗口
    removeVoteInfo(obj);
  } else if (url.includes("/2/video/full_screen_stream")) {
    // 视频页
    if (obj?.statuses?.length > 0) {
      let newStatuses = [];
      for (let item of obj.statuses) {
        if (!isAd(item)) {
          removeAvatar(item);
          if (item?.video_info?.tags?.length > 0) {
            // 投票
            item.video_info.tags = [];
          }
          newStatuses.push(item);
        }
      }
      obj.statuses = newStatuses;
    }
  } else if (url.includes("/2/video/tiny_stream_mid_detail")) {
    if (obj?.status?.video_info?.shopping?.length > 0) {
      // 带货
      obj.status.video_info.shopping = [];
    }
    if (obj?.status?.video_info?.bottom_banner) {
      // 大家都在搜
      obj.status.video_info.bottom_banner = {};
    }
    if (obj?.status?.video_info?.float_info) {
      // 悬浮窗
      obj.status.video_info.float_info = {};
    }
  } else if (url.includes("/2/video/tiny_stream_video_list")) {
    if (obj?.statuses?.length > 0) {
      obj.statuses = []; // 移除视频自动连播
      // obj.statuses = obj.statuses.filter((m) => !(m?.mblogtypename === "广告"));
    }
    if (obj?.tab_list?.length > 0) {
      obj.tab_list = [];
    }
  } else if (url.includes("/2/!/huati/discovery_home_bottom_channels")) {
    if (obj?.button_configs) {
      delete obj.button_configs; // 超话左上角,右上角图标
    }
    // 广场页
    if (obj?.channelInfo?.channel_list?.length > 0) {
      obj.channelInfo.channel_list = obj.channelInfo.channel_list.filter((t) => t?.title !== "广场");
    }
  } else if (url.includes("/aj/appicon/list")) {
    if (obj?.data?.list?.length > 0) {
      for (let item of obj.data.list) {
        if (item?.cardType) {
          item.cardType = 2;
        }
      }
    }
  } else if (url.includes("/v1/ad/preload") || url.includes("/v2/ad/preload")) {
    // 开屏广告
    if (obj?.ads?.length > 0) {
      for (let item of obj.ads) {
        item.start_time = 3818332800; // Unix 时间戳 2090-12-31 00:00:00
        item.end_time = 3818419199; // Unix 时间戳 2090-12-31 23:59:59
        item.daily_display_cnt = 50; // total_display_cnt: 50
        item.display_duration = 0;
      }
      if (obj?.ads?.creatives?.length > 0) {
        for (let item of obj.ads.creatives) {
          item.start_time = 3818332800; // Unix 时间戳 2090-12-31 00:00:00
          item.end_time = 3818419199; // Unix 时间戳 2090-12-31 23:59:59
          item.daily_display_cnt = 50; // total_display_cnt: 50
          item.display_duration = 0;
        }
      }
    }
  } else if (url.includes("/wbapplua/wbpullad.lua") || url.includes("/preload/get_ad")) {
    // 开屏广告
    if (obj?.cached_ad?.ads?.length > 0) {
      for (let item of obj.cached_ad.ads) {
        item.show_count = 50;
        item.duration = 0; // 60 * 60 * 24 * 365 = 31536000
        item.start_date = 3818332800; // Unix 时间戳 2090-12-31 00:00:00
        item.end_date = 3818419199; // Unix 时间戳 2090-12-31 23:59:59
      }
    }
  }
  $done({ body: JSON.stringify(obj) });
}

// 判断信息流
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

// 移除头像挂件,关注按钮
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
    delete data.mblog_buttons; // 转发按钮图标
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
    delete data.user.mbtype; // 会员等级图标
  }
}

// 移除信息流关注按钮,推广,热评
function removeFeedAd(item) {
  removeAvatar(item); // 头像挂件,关注按钮
  if (item?.retweeted_status) {
    removeAvatar(item?.retweeted_status);
  }
  if (item?.common_struct) {
    delete item.common_struct; // 商品橱窗
  }
  if (item?.comment_summary) {
    delete item.comment_summary; // 移除信息流中的热评
  }
  if (item?.extend_info) {
    delete item.extend_info; // 商品橱窗
  }
  if (item?.semantic_brand_params) {
    delete item.semantic_brand_params; // 商品橱窗
  }
}

// 移除投票窗口
function removeVoteInfo(item) {
  if (item?.page_info?.media_info?.vote_info) {
    delete item.page_info.media_info.vote_info;
  }
}
};
// Modified: 2026-11-02 (chance). Apply the documented QX notification subset
// on the native branch too; all original optional expressions still evaluate.
const __wayxNativeNotify=__wayxConfig.apiPlan.omitNotificationOptions&&__wayxConfig.omittedParameters&&__wayxConfig.omittedParameters.some(p=>p.startsWith('notification.argument'))&&typeof __wayxHost.notifyQx==='function'?((title,subtitle,body)=>__wayxHost.notifyQx(title,subtitle,body)):__wayxHost.notifyQx;
if(__wayxTarget==="loon"&&!__wayxConfig.httpTask)return __wayxRun(__wayxHost.request,__wayxHost.response,__wayxHost.done,__wayxHost.script,__wayxHost.store,__wayxHost.prefs,__wayxHost.notify,__wayxNativeNotify,undefined,setTimeout,typeof setInterval==='undefined'?undefined:setInterval,__wayxHost.http,__wayxHost.task,__wayxHost.argument,__wayxCodecs&&__wayxCodecs.TextEncoder,__wayxCodecs&&__wayxCodecs.TextDecoder,__wayxCodecs&&__wayxCodecs.atob,__wayxCodecs&&__wayxCodecs.btoa);
return (function(config,host,run){
  const fail=message=>{throw new Error('WayX API contract: '+message);};
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  // Modified: 2026-11-02 (chance). All client spellings/defaults below come
  // from the semantic target plan, shared with parser validation and reports.
  const sourceLayout=config.apiPlan.source,targetLayout=config.apiPlan.target;
  const sourceHttp=sourceLayout.http,targetHttp=targetLayout.http;
  const targetStore=targetLayout.store.style==='prefs'?host.prefs:host.store;
  const bytes=value=>value instanceof Uint8Array?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):value instanceof ArrayBuffer?new Uint8Array(value):fail('expected Uint8Array or ArrayBuffer');
  const buffer=value=>{const b=bytes(value);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
  const status=value=>{if(typeof value==='number'&&Number.isInteger(value)&&value>=100&&value<=599)return value;const m=typeof value==='string'&&value.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})(?:\s.*)?$/);return m?Number(m[1]):fail('unsupported HTTP status');};
  const reasons={200:'OK',201:'Created',204:'No Content',301:'Moved Permanently',302:'Found',304:'Not Modified',307:'Temporary Redirect',308:'Permanent Redirect',400:'Bad Request',401:'Unauthorized',403:'Forbidden',404:'Not Found',500:'Internal Server Error',502:'Bad Gateway',503:'Service Unavailable'};
  // Modified: 2026-11-02 (chance). Validate only queried singleton fields;
  // preserve the author's dictionary and case-insensitive lookup unchanged.
  function view(value,role){
    if(value===undefined)return undefined;
    const names=config.headerReads&&config.headerReads[role]||[];
    // Modified: 2026-11-02 (chance). Prefix-find input requires at most one
    // matching field, so dictionary enumeration order cannot alter the result.
    const prefixes=config.headerPrefixes&&config.headerPrefixes[role]||[];
    if(names.length||prefixes.length){
      if(!value.headers||typeof value.headers!=='object'||Array.isArray(value.headers))fail('header dictionary required');
      for(const prefix of prefixes){const keys=Object.keys(value.headers).filter(k=>k.toLowerCase().startsWith(prefix));if(keys.length>1||keys.some(k=>typeof value.headers[k]!=='string'))fail('header prefix lookup requires a singleton string field: '+prefix);}
      for(const name of names){const keys=Object.keys(value.headers).filter(k=>k.toLowerCase()===name);if(keys.length>1||keys.some(k=>typeof value.headers[k]!=='string'))fail('header lookup requires a singleton string field: '+name);}
    }
    const result=Object.assign({},value);
    // Modified: 2026-11-02 (chance). The declaration identifies the principal
    // binary input; never silently feed text into a byte-only source program.
    if(config.binaryReads&&role===(config.phase==='response'?'response':'request')){
      if(targetLayout.binaryField==='bodyBytes'){
        if(!(value.bodyBytes instanceof ArrayBuffer))fail('binary trigger requires QX ArrayBuffer bodyBytes');
        if(sourceLayout.binaryField!=='bodyBytes'){result.body=new Uint8Array(value.bodyBytes);delete result.bodyBytes;}
      }else{
        const input=bytes(value.body);
        if(sourceLayout.binaryField==='bodyBytes'){result.bodyBytes=buffer(input);delete result.body;}
        else result.body=input;
      }
    }
    if(sourceLayout.responseStatus!==targetLayout.responseStatus&&own(result,targetLayout.responseStatus)){
      result[sourceLayout.responseStatus]=status(result[targetLayout.responseStatus]);delete result[targetLayout.responseStatus];
    }
    if(sourceLayout.binaryField==='bodyBytes'){
      if(result.body instanceof Uint8Array||result.body instanceof ArrayBuffer){result[sourceLayout.binaryField]=buffer(result.body);delete result.body;}
    }else if(own(result,'bodyBytes')){
      if(config.binaryReads&&role===(config.phase==='response'?'response':'request'))result.body=new Uint8Array(result.bodyBytes);delete result.bodyBytes;
    }
    return result;
  }
  const sourceStore={
    read:key=>{if(typeof key!=='string'||/[\\/]/.test(key))fail('explicit plain storage key required');const v=targetStore[targetLayout.store.read](key);return v==null?null:v;},
    write:(value,key)=>{if(typeof key!=='string'||/[\\/]/.test(key))fail('explicit plain storage key required');if(value===undefined&&sourceLayout.store.undefinedDeletes)value=null;if(value!==null&&typeof value!=='string')fail('unsupported storage coercion');return value===null&&targetLayout.store.remove?targetStore[targetLayout.store.remove](key):targetStore[targetLayout.store.write](value,key);}
  };
  const sourcePrefs={valueForKey:key=>sourceStore.read(key),setValueForKey:(value,key)=>sourceStore.write(value,key),removeValueForKey:key=>sourceStore.write(null,key)};
  // Modified: 2026-11-02 (chance). Only explicit URL/HTTP media fields map;
  // no fake notification delay, clipboard action or undocumented QX options.
  function notify(title,subtitle,body,option,delay){
    if(config.to==='egern'){if(arguments.length>3)fail('notification options unavailable');return host.ctx.notify({title,subtitle,body});}
    // Modified: 2026-11-02 (chance). Omit QX-undocumented source options
    // before optional-field validation; argument construction already occurred.
    if(targetLayout.notification.open===null)return host.notifyQx(title,subtitle,body);
    if(config.apiPlan.omitNotificationOptions)return host.notify.post(title,subtitle,body);
    if(arguments.length<=3)return host.notify.post(title,subtitle,body);
    if(delay!==undefined&&delay!==0)fail('notification delay has no verified target mapping');
    let url,media;const notification=sourceLayout.notification;
    if(notification.stringLink&&typeof option==='string')url=option;
    else if(notification.open){
      if(!option||typeof option!=='object'||Array.isArray(option))fail('notification options require a dictionary');
      if(notification.action&&option[notification.action]!==undefined&&option[notification.action]!==notification.openAction)fail('notification action needs an explicit mapping');
      url=option[notification.open];media=option[notification.media];
    }else if(option&&typeof option==='object'&&!Object.keys(option).length)return host.notify.post(title,subtitle,body);
    else fail('source notification options have no verified mapping');
    if(url!==undefined&&typeof url!=='string')fail('notification URL requires String');
    if(media!==undefined&&(typeof media!=='string'||!/^https?:\/\//i.test(media)))fail('notification media requires HTTP(S) URL');
    const mapped={};
    if(url!==undefined)mapped[targetLayout.notification.open]=url;
    if(media!==undefined)mapped[targetLayout.notification.media]=media;
    return host.notify.post(title,subtitle,body,mapped);
  }
  function headersView(headers){
    const object=Object.assign({},headers||{});
    const key=name=>Object.keys(object).find(k=>k.toLowerCase()===String(name).toLowerCase());
    return new Proxy(object,{get:(target,name)=>{
      if(name==='get')return n=>{const k=key(n);return k===undefined?null:target[k];};
      if(name==='has')return n=>key(n)!==undefined;
      const k=typeof name==='string'?key(name):name;return k===undefined?undefined:target[k];
    }});
  }
  function ctxMessage(value){
    if(value===undefined)return undefined;
    let consumed=false;
    const consume=()=>{if(consumed)throw new TypeError('Body has already been consumed');consumed=true;return value.body;};
    return {url:value.url,method:value.method,status:value.status??value.statusCode,headers:headersView(value.headers),text:async()=>{const v=consume();if(v===undefined||v===null)return '';if(typeof v!=='string')fail('binary-to-text decoding needs an explicit codec');return v;},json:async()=>{const v=consume();if(typeof v!=='string')fail('JSON requires the text-body contract');return JSON.parse(v);},arrayBuffer:async()=>{const v=consume();return v===undefined||v===null?new ArrayBuffer(0):buffer(v);}};
  }
  // Modified: 2026-11-02 (chance). Only a proven untouched source context
  // identity becomes pass-through; arbitrary/modified objects follow normal rules.
  let originalResponse;
  function canonical(value){
    if(config.contextPassThrough&&value===originalResponse&&value!==undefined)return {};
    if(value===undefined||value===null)return {};
    if(typeof value==='string'){if(config.from!=='qx')fail('non-QX string completion');return config.phase==='echo'?{response:{status:200,body:value}}:{body:value};}
    if(typeof value!=='object'||Array.isArray(value))fail('unsupported completion result');
    if(sourceLayout.completion.synthetic==='flat'&&config.phase==='echo')value={response:value};
    const result=Object.assign({},value);
    if(own(result,'statusCode')){result.status=result.statusCode;delete result.statusCode;}
    if(own(result,'status'))result.status=status(result.status);
    if(own(result,'bodyBytes')){result.body=new Uint8Array(result.bodyBytes);delete result.bodyBytes;}
    if(result.response){result.response=Object.assign({},result.response);if(own(result.response,'status'))result.response.status=status(result.response.status);if(own(result.response,'bodyBytes')){result.response.body=new Uint8Array(result.response.bodyBytes);delete result.response.bodyBytes;}}
    for(const k of Object.keys(result))if(!['url','headers','body','status','response','abort'].includes(k))fail('unmapped completion field: '+k);
    return result;
  }
  let completed=false,resolveDone;
  const completion=config.to==='egern'?new Promise(resolve=>resolveDone=resolve):null;
  function done(value){
    if(completed)return;completed=true;
    const result=canonical(value);
    if(config.to==='egern'){
      const response=result.response?host.ctx.respond(result.response):result.abort?host.ctx.abort():result;
      resolveDone(Object.keys(result).length?response:undefined);return;
    }
    if(targetLayout.completion.synthetic==='flat'){
      if(result.abort)fail('target abort semantics are not proven');
      let output=result;
      if(result.response){if(config.phase!=='echo')fail('direct response requires a QX echo declaration');output=result.response;}
      if(own(output,'status'))output.status='HTTP/1.1 '+status(output.status)+' '+(reasons[status(output.status)]||'Status');
      if(output.body instanceof Uint8Array||output.body instanceof ArrayBuffer){output.bodyBytes=buffer(output.body);delete output.body;}
      return host.done(output);
    }
    if(config.to==='loon'&&result.abort)fail('Loon abort result is not documented');
    return host.done(result);
  }
  // Modified: 2026-11-02 (chance). Callback-only HTTP mapping keeps explicit
  // cookies/redirects and native cancellation; no fake Promise timeout or null success.
  function callbackHttp(){
    if(!config.httpCallback)return undefined;
    if(targetHttp.style==='promise'?!host.task:!host.http)fail('native HTTP transport unavailable');
    const client={};let active=false;
    for(const method of config.apiPlan.methods)client[method]=(input,callback)=>{
      if(active)fail('callback HTTP subset permits one active request');active=true;
      // Modified: 2026-11-02 (chance). QX author-documented fields only;
      // unsupported timeout/ALPN/etc. are omitted by user instruction, never faked.
      if(targetHttp.style==='promise'){
        const request={url:input.url,method:method.toUpperCase(),headers:Object.assign({},input.headers),opts:{[targetHttp.redirect]:input[sourceHttp.redirect]===undefined?sourceHttp.defaults.redirect:input[sourceHttp.redirect],[targetHttp.cookie]:input[sourceHttp.cookie]===undefined?sourceHttp.defaults.cookie:input[sourceHttp.cookie],[targetHttp.tls]:input[sourceHttp.tls]===undefined?sourceHttp.defaults.tls:input[sourceHttp.tls]}};
        if(own(input,'body'))request.body=input.body;
        if(own(input,sourceHttp.policy))request.opts[targetHttp.policy]=input[sourceHttp.policy]===sourceHttp.directPolicy?targetHttp.directPolicy:input[sourceHttp.policy];
        let task;
        try{task=host.task.fetch(request);}catch(error){active=false;throw error;}
        return task.then(response=>{
          active=false;
          if(!response||typeof response[targetLayout.responseStatus]!=='number'||!Number.isInteger(response[targetLayout.responseStatus])||response[targetLayout.responseStatus]<100||response[targetLayout.responseStatus]>599)fail('HTTP success requires a numeric response status');
          const data=response.body;
          if(typeof data!=='string'||data.length>65536||/[^\x00-\x7f]/.test(data))fail('callback HTTP subset requires ASCII response text');
          return callback(null,{[sourceLayout.responseStatus]:response[targetLayout.responseStatus],headers:response.headers},data);
        },reason=>{active=false;return callback(reason&&reason.error||reason||'QX fetch failed',undefined,undefined);});
      }
      const opts=Object.assign({},input,{headers:Object.assign({},input.headers)});
      opts.timeout=input.timeout*sourceHttp.timeoutMs/targetHttp.timeoutMs;
      return host.http[method](opts,(error,response,data)=>{
        active=false;
        if(error)return callback(error,response,data);
        if(!response||typeof response.status!=='number'||!Number.isInteger(response.status)||response.status<100||response.status>599)fail('HTTP success requires a numeric response status');
        if(typeof data!=='string'||data.length>65536||/[^\x00-\x7f]/.test(data))fail('callback HTTP subset requires ASCII response text');
        return callback(error,response,data);
      });
    };
    return client;
  }
  // Modified: 2026-11-02 (chance). QX-source fetch remains a real Promise.
  // Sanitize only documented fields on every host; no timeout or cancellation shim.
  function sourceTask(){
    if(!config.httpTask)return undefined;
    const native=host.task,client=host.http;let active=false;
    if(targetHttp.style==='promise'?!native:!client)fail('native HTTP transport unavailable');
    return {fetch:input=>{
      if(active)fail('QX fetch subset permits one active request');active=true;
      const incoming=input[sourceHttp.optionsRoot]||{},request={url:input.url,method:input.method||'GET',headers:Object.assign({},input.headers),opts:{[sourceHttp.redirect]:incoming[sourceHttp.redirect]===undefined?sourceHttp.defaults.redirect:incoming[sourceHttp.redirect],[sourceHttp.cookie]:incoming[sourceHttp.cookie]===undefined?sourceHttp.defaults.cookie:incoming[sourceHttp.cookie],[sourceHttp.tls]:incoming[sourceHttp.tls]===undefined?sourceHttp.defaults.tls:incoming[sourceHttp.tls]}};
      if(own(input,'body'))request.body=input.body;
      if(own(incoming,sourceHttp.policy))request.opts[sourceHttp.policy]=incoming[sourceHttp.policy];
      const normalize=(response,data)=>{
        if(!response||typeof response[sourceLayout.responseStatus]!=='number'||!Number.isInteger(response[sourceLayout.responseStatus])||response[sourceLayout.responseStatus]<100||response[sourceLayout.responseStatus]>599)fail('QX fetch success requires a numeric statusCode');
        const result={[sourceLayout.responseStatus]:response[sourceLayout.responseStatus]};
        if(config.httpTaskBinary){const b=bytes(data);if(b.length>65536)fail('QX fetch subset byte limit');result[sourceLayout.binaryField]=buffer(b);}
        else{if(typeof data!=='string'||data.length>65536||/[^\x00-\x7f]/.test(data))fail('QX fetch subset requires ASCII response text');result.body=data;}
        return result;
      };
      if(targetHttp.style==='promise'){
        let promise;try{promise=native.fetch(request);}catch(error){active=false;throw error;}
        return promise.then(response=>{active=false;return normalize(response,response&&(config.httpTaskBinary?response.bodyBytes:response.body));},reason=>{active=false;throw reason;});
      }
      const options={url:request.url,headers:request.headers,[targetHttp.redirect]:request.opts[sourceHttp.redirect],[targetHttp.cookie]:request.opts[sourceHttp.cookie],[targetHttp.tls]:request.opts[sourceHttp.tls]};
      if(own(request,'body'))options.body=request.body;
      if(own(request.opts,sourceHttp.policy))options[targetHttp.policy]=request.opts[sourceHttp.policy]===sourceHttp.directPolicy?targetHttp.directPolicy:request.opts[sourceHttp.policy];
      if(config.httpTaskBinary)options['binary-mode']=true;
      return new Promise((resolve,reject)=>{
        try{client[request.method.toLowerCase()](options,(error,response,data)=>{
          active=false;if(error){reject({error});return;}
          try{resolve(normalize(response&&{[sourceLayout.responseStatus]:response[targetLayout.responseStatus]},data));}catch(error){reject(error);}
        });}catch(error){active=false;reject(error);}
      });
    }};
  }
  // Modified: 2026-11-02 (chance). Surge already carries a JSON payload for
  // typed Loon PluginObject arguments. QX deliberately supplies no argument.
  function sourceArgument(){
    if(!config.argumentMapped)return undefined;
    if(targetLayout.argument==='absent')return undefined;
    const schema=config.argumentSchema;let input=host.argument;
    if(schema.kind==='string'){
      if(typeof input!=='string')fail('declared source String argument missing');return input;
    }
    if(targetLayout.argument==='string'){
      if(typeof input!=='string')fail('declared PluginObject JSON argument missing');
      input=JSON.parse(input);
    }
    if(!input||typeof input!=='object'||Array.isArray(input))fail('PluginObject argument dictionary required');
    for(const key of Object.keys(schema.fields)){if(!own(input,key)||typeof input[key]!==schema.fields[key])fail('PluginObject argument type mismatch: '+key);if(schema.enumValues&&schema.enumValues[key]&&!schema.enumValues[key].includes(input[key]))fail('PluginObject argument enum mismatch: '+key);}
    return input;
  }
  function start(request,response){
    const script={name:config.name||host.script&&host.script.name||host.ctx&&host.ctx.script.name};
    if(host.script&&host.script.startTime!==undefined){const start=host.script.startTime;script.startTime=sourceLayout.scriptStartTime==='date'?(start instanceof Date?start:new Date(start*1000)):(start instanceof Date?start.getTime()/1000:start);}
    const ctx={request:ctxMessage(request),response:ctxMessage(response),script,respond:value=>({response:value}),abort:()=>({abort:true})};
    const sourceTimer=(callback,delay,...args)=>setTimeout(()=>callback(...args),delay);
    originalResponse=view(response,'response');
    const result=run(view(request,'request'),originalResponse,done,config.from==='qx'?undefined:script,config.from==='qx'?undefined:sourceStore,config.from==='qx'?sourcePrefs:undefined,config.from==='qx'?undefined:{post:notify},config.from==='qx'?notify:undefined,ctx,config.from==='loon'?sourceTimer:setTimeout,config.from==='loon'?sourceTimer:undefined,callbackHttp(),sourceTask(),sourceArgument(),host.codecs&&host.codecs.TextEncoder,host.codecs&&host.codecs.TextDecoder,host.codecs&&host.codecs.atob,host.codecs&&host.codecs.btoa);
    if(config.from==='egern')return Promise.resolve(result).then(done);
    return completion||result;
  }
  if(config.to==='egern')return (async()=>{
    async function input(message,role){if(!message)return undefined;const result={url:message.url,method:message.method,status:message.status,headers:{}};for(const [name,value]of message.headers){if(own(result.headers,name))fail('duplicate header needs an explicit full-header declaration');result.headers[name]=value;}
      if(config.binary)result.body=new Uint8Array(await message.arrayBuffer());else if(role==='response'||config.phase==='request'||config.phase==='echo')result.body=await message.text();return result;}
    return await start(await input(host.ctx.request,'request'),await input(host.ctx.response,'response'));
  })();
  return start(host.request,host.response);
})(__wayxConfig,__wayxHost,__wayxRun);
})();
