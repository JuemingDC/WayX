// Converted: 2026-10-04 01:54:09 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/open-cms-api\.uc\.cn\/open-cms\?/i then response.json.delete(["result.cms_sK_home_top_banner", "result.cms_camera_member_banner", "result.cms_camera_asset_activity_banner_list", "result.cms_camera_asset_activity_banner", "result.cms_camera_my_activity_banner", "result.cms_sk_home_top_svip_promotion", "result.camera_teachers_day_goods_banner", "result.camear_vip_retain_pop", "result.camear_svip_retain_pop", "result.camera_vip_lottie_coupon_modal", "result.cms_miaosha_keep_modal_show", "result.cms_camera_asset_popup_activity", "result.cms_camera_show_coupon_popup", "result.scan_svip_refund_pop", "result.scan_svip_first_buy_pop", "result.camera_vip_lottie_universal_popup", "result.cms_camera_asset_pay_error_activity", "result.cms_dongfeng_common_config", "result.cms_web_ad_mark_config", "result.cms_adblock_rules", "result.camera_pay_scene_window", "result.camera_pay_huodong_toast", "result.cms_camera_export_pay_guide_config", "result.scan_king_vip_label", "result.camera_vip_rights_and_interests_text", "result.camera_vip_default_goods", "result.camera_vip_year_goods_ctrl", "result.cms_skip_image_switch", "result.cms_cloud_pdf_office_pay_enable", "result.camera_trial_url", "result.cms_my_list_part_config", "result.cms_search_welfare_config", "result.cms_camera_home_sign_url", "result.camera_member_lottery_on_off", "result.camera_vip_lottery_checked_goods", "result.cms_lottery_banner", "result.sk_home_newbie_guide", "result.cms_scanking_home_bubble", "result.cms_home_appstore_comment", "result.cms_home_appstore_comment_native_item", "result.encourage_config", "result.cms_camera_tips_dialog", "result.export_file_tips", "result.camera_qrcode_title_msg", "result.cms_mobilize_external_app_config", "result.cms_deeplink_back_desc", "result.idfa_auth_config", "result.cms_idfa_auth_enable", "result.cms_dongfeng_double_eleven_url", "result.gaokao_nu_vip_grant", "result.cms_skip_button_switch", "result.nu_grant_vip_pop_type", "result.qkscan_member_coupon", "result.qkscan_coupon_time", "result.cms_search_welfare_config_v2", "result.cms_search_welfare_url", "result.qkscan_member_rights", "result.qkscan_svip_member_rights", "result.camera_svip_member_center", "result.camera_member_center", "result.camera_vip_pay_url", "result.camera_vipplus_pay_url", "result.cms_scanking_pay_vip_retain_switch", "result.cms_camera_asset_popup_activity_new", "result.camera_member_lottery_on_off_new", "result.camera_preview_right_bottom", "result.camera_share_link_config", "result.cms_camera_tool_set_pic", "result.cms_membership_new_style", "result.cms_first_purchase_dialog_interval", "result.camera_vip_pay_pre_render_url", "result.camera_assets_membership_url", "result.qkscan_ios_vip_renew", "result.camera_startup_purchase_interval", "result.cms_membership_page_url", "result.camera_vip_price", "result.cms_repurchase_dialog_interval", "result.camera_pay_url", "result.camera_vip_year_goods_ctrl_new_logic", "result.camera_vip_venue_switch", "result.enable_svip_tab", "result.cms_cloud_pdf_image_pay_enable", "result.cms_mini_login_panel", "result.cms_mobile_binding_config_new", "result.cms_scanking_login_retain_switch", "result.cms_login_thirdpart_entrance", "result.cms_menu_quick_login_func_enable", "result.cms_quark_login_before_share_enable", "result.cms_diamond_main_area", "result.cms_diamond_sub_area", "result.cms_feed_diamond_main_area", "result.scan_king_home_tools_new", "result.cms_camera_gather_tab", "result.cms_my_right_item_data", "result.enable_popup_imediatly", "result.cms_new_guide_tab_list", "result.query_scan_king_guidance_function", "result.sk_full_screen_newbie_show", "result.cms_pcguide_qrcode", "result.cms_web_res_sniffer_enable", "result.cd_wk_blank_page_refresh_guide", "result.cms_camera_border_poster", "result.camera_license_poster_list", "result.cartoon_templates", "result.camera_idphoto_dresses", "result.camera_selfie_template_res", "result.camera_selfie_smile_res", "result.cms_app_act_mgr_data", "result.test_na_cms", "result.cms_ai_command_prompts", "result.sk_camera_ai_tab_sample_list_data", "result.camera_doc_scan_filter_ui_config", "result.cms_camera_scandoc_filters", "result.gaokao_zhiyuan_export_svip", "result.camera_idphoto_filters", "result.cms_paper_bottom_tools_config", "result.sk_enable_edit_page_recommend_data_opt", "result.sk_disable_edit_page_recommend_data_supplement", "result.cms_camera_skills", "result.qk_camera_compass_urls", "result.cms_enable_channel_re_active", "result.scan_write_free_num", "result.cms_web_sniff_float_tool_enable", "result.cms_custom_module_config", "result.cms_quark_action_bar_config", "result.cms_camera_guide_pdfwater_days", "result.scan_king_home_tools", "result.cms_idcard_show_cloud_print", "result.sk_idphoto_show_cloud_print", "result.camera_album_content", "result.cms_camera_question_config", "result.cms_member_center_experiment", "result.cms_ios_my_member", "result.cms_ai_tools_navi_url", "result.sk_home_imgtext_deeplink", "result.cms_file_picker_info_config", "result.chat_ai_camera_with__config", "result.cd_hot_group_list", "result.cd_hot_size_list", "result.cms_camera_share_miniframe_enable_tab", "result.sk_enable_sharelink", "result.camera_native_photo_search", "result.cms_search_prefetch_switch", "result.cd_home_searchbar_camera_enable", "result.ucdc_server_ip"])
const __wayxRegexReplace=(()=>{const SUPPORTED_FLAGS=/^[ims]*$/;function assertRegexNode(node) {
  if (!node || node.type!=='regex') throw new TypeError('Expected Loon semantic Regex node');
  const flags=String(node.flags || '');
  if (!SUPPORTED_FLAGS.test(flags)) throw new Error('Unsupported Loon regex flag(s): '+flags);
  if (new Set(flags).size!==flags.length) throw new Error('Duplicate Loon regex flag(s): '+flags);
  return {source:String(node.pattern ?? ''),flags};
}
function compileSourceRegex(node) {
  const {source,flags}=assertRegexNode(node);
  return new RegExp(source,flags);
}
function replaceSourceRegex(node,text,replacement) {
  const match=compileSourceRegex(node).exec(text);
  if (!match) return text;
  const out=String(replacement).replace(/\$(\d+)/g,(_,index)=>match[Number(index)] ?? '');
  return text.slice(0,match.index)+out+text.slice(match.index+match[0].length);
};return (text,pattern,flags,replacement)=>replaceSourceRegex({type:"regex",pattern,flags},String(text),replacement);})();
const SUPPORTED_FLAGS=/^[ims]*$/;
function assertRegexNode(node) {
  if (!node || node.type!=='regex') throw new TypeError('Expected Loon semantic Regex node');
  const flags=String(node.flags || '');
  if (!SUPPORTED_FLAGS.test(flags)) throw new Error('Unsupported Loon regex flag(s): '+flags);
  if (new Set(flags).size!==flags.length) throw new Error('Duplicate Loon regex flag(s): '+flags);
  return {source:String(node.pattern ?? ''),flags};
}
function compileSourceRegex(node) {
  const {source,flags}=assertRegexNode(node);
  return new RegExp(source,flags);
}
function execSourceRegex(node,value) {
  if (value===null || value===undefined) return null;
  if (typeof value!=='string') return null;
  return compileSourceRegex(node).exec(value);
}
class SemanticEvaluationError extends Error {
  constructor(message) {
    super(message);
    this.name='SemanticEvaluationError';
  }
}
function cloneCaptures(captures) {
  return new Map(captures);
}
function decodeHeaderName(value) {
  return String(value)
    .replace(/\\\\/g,'\\')
    .replace(/\\'/g,"'")
    .replace(/\\"/g,'"');
}
function headerVariable(name) {
  const match=String(name).match(/^(request|response)\.header\[(?:'((?:\\.|[^'])*)'|"((?:\\.|[^"])*)")\]$/);
  if (!match) return null;
  return {phase:match[1],name:decodeHeaderName(match[2] ?? match[3] ?? '')};
}
function lookupHeader(headers,name) {
  if (Array.isArray(headers)) {
    const item=headers.find(x=>String(x.field).toLowerCase()===String(name).toLowerCase());
    return item ? String(item.value ?? '') : null;
  }
  if (headers instanceof Map) {
    for (const [key,value] of headers) {
      if (String(key).toLowerCase()===String(name).toLowerCase()) return value===undefined ? '' : String(value);
    }
    return null;
  }
  if (headers && typeof headers==='object') {
    for (const [key,value] of Object.entries(headers)) {
      if (key.toLowerCase()===String(name).toLowerCase()) return value===undefined ? '' : String(value);
    }
  }
  return null;
}
function argumentValue(context,name) {
  const args=context.arguments;
  if (args instanceof Map) return args.has(name) ? args.get(name) : undefined;
  if (args && Object.prototype.hasOwnProperty.call(args,name)) return args[name];
  return undefined;
}
function captureValue(captures,name) {
  const match=String(name).match(/^([A-Za-z_][A-Za-z0-9_-]*)\.(\d+)$/);
  if (!match) return {found:false,value:undefined};
  const values=captures.get(match[1]);
  if (!values) return {found:true,value:undefined};
  return {found:true,value:values[Number(match[2])]};
}
function resolveSemanticVariable(name,context,captures=new Map()) {
  const key=String(name);
  if (key==='url') return context.url;
  if (key==='request.method') return context.request?.method ?? context.method;
  if (key==='response.status') return context.response?.status ?? context.response?.statusCode;

  const header=headerVariable(key);
  if (header) {
    const headers=header.phase==='request' ? context.request?.headers : context.response?.headers;
    return lookupHeader(headers,header.name);
  }

  const captured=captureValue(captures,key);
  if (captured.found) return captured.value;

  return argumentValue(context,key);
}
function stringTemplateParts(node) {
  if (node?.type==='raw-string') return [['s',String(node.value)]];
  if (node?.type!=='string') throw new TypeError('Expected a string template');
  const raw=typeof node.raw==='string' && node.raw.startsWith('"');
  const text=raw ? node.raw.slice(1,-1) : String(node.value);
  const parts=[];let literal='';
  const flush=()=>{if(literal){parts.push(['s',literal]);literal='';}};
  for(let i=0;i<text.length;i++) {
    if(text[i]==='\\' && i+1<text.length) {
      if(text.slice(i+1,i+3)==='${'){literal+='${';i+=2;continue;}
      if(raw){const n=text[++i];literal+=({n:'\n',r:'\r',t:'\t','"':'"','\\':'\\'})[n] ?? ('\\'+n);continue;}
    }
    if(text.slice(i,i+2)==='${') {
      let j=i+2,quote=null,escaped=false;
      for(;j<text.length;j++) {
        const c=text[j];
        if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote=null;}
        else if(c==="'")quote=c;
        else if(c==='}')break;
      }
      if(j===text.length)throw new SemanticEvaluationError('Unterminated string template');
      flush();parts.push(['v',text.slice(i+2,j)]);i=j;
    } else literal+=text[i];
  }
  flush();return parts;
}
function expandSemanticString(node,context,captures) {
  let text='';
  for(const [kind,value] of stringTemplateParts(node)) {
    const v=kind==='s' ? value : resolveSemanticVariable(value,context,captures);
    if(v===undefined)return undefined;
    text+=String(v);
  }
  return text;
}
function literalValue(node,context,captures) {
  if (!node) return undefined;
  switch (node.type) {
    case 'variable': return resolveSemanticVariable(node.name,context,captures);
    case 'string': return expandSemanticString(node,context,captures);
    case 'raw-string':
    case 'number':
    case 'boolean':
    case 'null': return node.value;
    case 'regex': return node;
    default: throw new SemanticEvaluationError('Unsupported condition value node: '+node.type);
  }
}
function comparison(node,context,captures) {
  const next=cloneCaptures(captures);
  const left=literalValue(node.left,context,next);

  if (node.operator==='==') {
    const right=literalValue(node.right,context,next);
    return {matched:Object.is(left,right),captures:next};
  }

  if (node.operator!=='~=') {
    throw new SemanticEvaluationError('Unsupported condition operator: '+node.operator);
  }
  if (node.right?.type!=='regex') {
    throw new SemanticEvaluationError('Dynamic ~= Regex evaluation is not implemented in Phase B core yet');
  }

  const match=execSourceRegex(node.right,left);
  if (!match) return {matched:false,captures:next};

  if (node.capture) {
    next.set(node.capture,Array.from(match));
  }
  return {matched:true,captures:next};
}
function evaluateNode(node,context,captures) {
  if (!node) throw new SemanticEvaluationError('Missing condition node');

  if (node.type==='group') return evaluateNode(node.expression,context,captures);
  if (node.type==='comparison') return comparison(node,context,captures);

  if (node.type==='logical') {
    if (node.operator==='&&') {
      const left=evaluateNode(node.left,context,cloneCaptures(captures));
      if (!left.matched) return {matched:false,captures:cloneCaptures(captures)};
      const right=evaluateNode(node.right,context,left.captures);
      if (!right.matched) return {matched:false,captures:cloneCaptures(captures)};
      return right;
    }

    if (node.operator==='||') {
      const left=evaluateNode(node.left,context,cloneCaptures(captures));
      if (left.matched) return left;
      return evaluateNode(node.right,context,cloneCaptures(captures));
    }

    throw new SemanticEvaluationError('Unsupported logical operator: '+node.operator);
  }

  throw new SemanticEvaluationError('Unsupported condition node: '+node.type);
}
function evaluateCondition(condition,context={},initialCaptures={}) {
  const captures=initialCaptures instanceof Map
    ? cloneCaptures(initialCaptures)
    : new Map(Object.entries(initialCaptures || {}));
  const result=evaluateNode(condition,context,captures);
  return {
    matched:result.matched,
    captures:Object.fromEntries(result.captures),
  };
}
const __wayxCaptures=Object.create(null);
let __wayxArgs={};try{__wayxArgs=JSON.parse(String($argument||"{}"))}catch{}
let __wayxHeaders={...($response.headers||{})};
let __wayxBody=$response.body;
function __wayxValue(name){return resolveSemanticVariable(name,{url:$request.url,request:$request,response:{...$response,headers:__wayxHeaders},arguments:__wayxArgs},new Map(Object.entries(__wayxCaptures)))}
function __wayxTpl(parts){let out="";for(const [kind,name] of parts){const v=kind==="s"?name:__wayxValue(name);if(v===undefined)return undefined;out+=String(v)}return out}
function __wayxWith(v,fn){if(v!==undefined)fn(v)}
function __wayxJsonAction(fn){try{const j=JSON.parse(String(__wayxBody ?? ""));fn(j);__wayxBody=JSON.stringify(j)}catch{}}
function __wayxJsonParent(root,path){let x=root;for(let i=0;i<path.length-1;i++){if(x==null||!(path[i] in Object(x)))return null;x=x[path[i]];}return x;}
function __wayxJsonGet(root,path){let x=root;for(const k of path){if(x==null||typeof x!=="object"||!(k in x))return undefined;x=x[k]}return x;}
function __wayxJsonSet(root,path,value){let x=root;for(let i=0;i<path.length-1;i++){const k=path[i],next=path[i+1];if(x==null||typeof x!=="object")return;const cur=x[k];if(cur==null)x[k]=typeof next==="number"?[]:{};else if(typeof cur!=="object")return;x=x[k]}if(x!=null&&typeof x==="object")x[path[path.length-1]]=value;}
function __wayxJsonAdd(root,path,value){const cur=__wayxJsonGet(root,path);if(cur===undefined||cur===null)__wayxJsonSet(root,path,value);}
function __wayxJsonDelete(root,path){const p=__wayxJsonParent(root,path);if(p==null)return;const k=path[path.length-1];if(Array.isArray(p)&&typeof k==="number"){if(k>=0&&k<p.length)p.splice(k,1);}else delete p[k];}
function __wayxJsonReplace(root,path,value){const cur=__wayxJsonGet(root,path);if(cur!==undefined&&cur!==null&&cur!==false)__wayxJsonSet(root,path,value);}
function __wayxHeader(phase,name){const h=phase==="request"?$request.headers:$response.headers;const w=String(name).toLowerCase();if(Array.isArray(h)){const x=h.find(x=>String(x.field).toLowerCase()===w);return x?.value;}const k=Object.keys(h||{}).find(x=>x.toLowerCase()===w);return k===undefined?undefined:h[k];}
function __wayxSet(n,v){const k=__wayxKey(n);__wayxDel(n);__wayxHeaders[k||n]=v;}
function __wayxDel(n){const w=String(n).toLowerCase();for(const k of Object.keys(__wayxHeaders))if(k.toLowerCase()===w)delete __wayxHeaders[k];}
function __wayxHeaderReplace(n,p,r,f=""){const w=String(n).toLowerCase();for(const k of Object.keys(__wayxHeaders))if(k.toLowerCase()===w)__wayxHeaders[k]=__wayxRegexReplace(__wayxHeaders[k],p,f,r);}
function __wayxKey(n){return Object.keys(__wayxHeaders).find(k=>k.toLowerCase()===String(n).toLowerCase());}
if((()=>{
const result=evaluateCondition({"type":"comparison","operator":"~=","left":{"type":"variable","name":"url","raw":"${url}"},"right":{"type":"regex","pattern":"^https:\\/\\/open-cms-api\\.uc\\.cn\\/open-cms\\?","flags":"i","raw":"/^https:\\/\\/open-cms-api\\.uc\\.cn\\/open-cms\\?/i"},"capture":null},{url:$request.url,request:$request,response:typeof $response!=="undefined"?$response:{},arguments:__wayxArgs});Object.assign(__wayxCaptures,result.captures);return result.matched;})()){
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_sK_home_top_banner"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_member_banner"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_asset_activity_banner_list"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_asset_activity_banner"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_my_activity_banner"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_sk_home_top_svip_promotion"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_teachers_day_goods_banner"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camear_vip_retain_pop"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camear_svip_retain_pop"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_vip_lottie_coupon_modal"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_miaosha_keep_modal_show"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_asset_popup_activity"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_show_coupon_popup"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","scan_svip_refund_pop"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","scan_svip_first_buy_pop"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_vip_lottie_universal_popup"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_asset_pay_error_activity"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_dongfeng_common_config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_web_ad_mark_config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_adblock_rules"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_pay_scene_window"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_pay_huodong_toast"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_export_pay_guide_config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","scan_king_vip_label"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_vip_rights_and_interests_text"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_vip_default_goods"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_vip_year_goods_ctrl"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_skip_image_switch"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_cloud_pdf_office_pay_enable"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_trial_url"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_my_list_part_config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_search_welfare_config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_home_sign_url"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_member_lottery_on_off"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_vip_lottery_checked_goods"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_lottery_banner"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","sk_home_newbie_guide"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_scanking_home_bubble"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_home_appstore_comment"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_home_appstore_comment_native_item"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","encourage_config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_tips_dialog"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","export_file_tips"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_qrcode_title_msg"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_mobilize_external_app_config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_deeplink_back_desc"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","idfa_auth_config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_idfa_auth_enable"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_dongfeng_double_eleven_url"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","gaokao_nu_vip_grant"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_skip_button_switch"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","nu_grant_vip_pop_type"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","qkscan_member_coupon"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","qkscan_coupon_time"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_search_welfare_config_v2"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_search_welfare_url"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","qkscan_member_rights"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","qkscan_svip_member_rights"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_svip_member_center"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_member_center"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_vip_pay_url"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_vipplus_pay_url"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_scanking_pay_vip_retain_switch"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_asset_popup_activity_new"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_member_lottery_on_off_new"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_preview_right_bottom"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_share_link_config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_tool_set_pic"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_membership_new_style"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_first_purchase_dialog_interval"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_vip_pay_pre_render_url"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_assets_membership_url"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","qkscan_ios_vip_renew"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_startup_purchase_interval"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_membership_page_url"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_vip_price"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_repurchase_dialog_interval"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_pay_url"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_vip_year_goods_ctrl_new_logic"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_vip_venue_switch"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","enable_svip_tab"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_cloud_pdf_image_pay_enable"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_mini_login_panel"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_mobile_binding_config_new"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_scanking_login_retain_switch"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_login_thirdpart_entrance"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_menu_quick_login_func_enable"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_quark_login_before_share_enable"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_diamond_main_area"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_diamond_sub_area"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_feed_diamond_main_area"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","scan_king_home_tools_new"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_gather_tab"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_my_right_item_data"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","enable_popup_imediatly"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_new_guide_tab_list"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","query_scan_king_guidance_function"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","sk_full_screen_newbie_show"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_pcguide_qrcode"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_web_res_sniffer_enable"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cd_wk_blank_page_refresh_guide"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_border_poster"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_license_poster_list"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cartoon_templates"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_idphoto_dresses"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_selfie_template_res"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_selfie_smile_res"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_app_act_mgr_data"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","test_na_cms"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_ai_command_prompts"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","sk_camera_ai_tab_sample_list_data"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_doc_scan_filter_ui_config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_scandoc_filters"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","gaokao_zhiyuan_export_svip"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_idphoto_filters"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_paper_bottom_tools_config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","sk_enable_edit_page_recommend_data_opt"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","sk_disable_edit_page_recommend_data_supplement"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_skills"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","qk_camera_compass_urls"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_enable_channel_re_active"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","scan_write_free_num"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_web_sniff_float_tool_enable"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_custom_module_config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_quark_action_bar_config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_guide_pdfwater_days"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","scan_king_home_tools"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_idcard_show_cloud_print"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","sk_idphoto_show_cloud_print"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_album_content"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_question_config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_member_center_experiment"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_ios_my_member"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_ai_tools_navi_url"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","sk_home_imgtext_deeplink"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_file_picker_info_config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","chat_ai_camera_with__config"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cd_hot_group_list"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cd_hot_size_list"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_camera_share_miniframe_enable_tab"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","sk_enable_sharelink"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","camera_native_photo_search"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cms_search_prefetch_switch"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","cd_home_searchbar_camera_enable"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["result","ucdc_server_ip"]));
  $done({body:__wayxBody});
}else{$done({});}
