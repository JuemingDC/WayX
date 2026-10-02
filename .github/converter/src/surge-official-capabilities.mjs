// Surge official capability registry used by WayX validation
// Author: chance
// Category: Converter / Surge / Adblock Capability Gate

// WayX converts Loon ad-block plugins only. This registry deliberately tracks
// only source-relevant Rule types, Rewrite capabilities and MITM hostname.
export const SURGE_WAYX_RULE_TYPES = new Set([
  'DOMAIN','DOMAIN-SUFFIX','DOMAIN-KEYWORD','DOMAIN-WILDCARD','DOMAIN-SET',
  'IP-CIDR','IP-CIDR6','GEOIP','IP-ASN',
  'USER-AGENT','URL-REGEX',
  'PROCESS-NAME',
  'DEST-PORT','SRC-PORT','IN-PORT','SRC-IP','DEVICE-NAME','MAC-ADDRESS',
  'PROTOCOL','HOSTNAME-TYPE','SUBNET','CELLULAR-RADIO','CELLULAR-CARRIER',
  'AND','OR','NOT',
  'SCRIPT','RULE-SET',
]);

export const SURGE_WAYX_RULE_BUILTIN_POLICIES = new Set([
  'DIRECT',
  'REJECT','REJECT-DROP','REJECT-NO-DROP','REJECT-TINYGIF',
  'CELLULAR','CELLULAR-ONLY','HYBRID','NO-HYBRID',
]);

export const SURGE_WAYX_REWRITE_SECTIONS = new Set([
  'URL Rewrite','Header Rewrite','Body Rewrite','Map Local','Script',
]);

export const SURGE_WAYX_URL_REWRITE_TYPES = new Set([
  'header','302','307','reject',
]);

export const SURGE_WAYX_HEADER_REWRITE_ACTIONS = new Set([
  'header-add','header-del','header-replace','header-replace-regex',
]);

export const SURGE_WAYX_BODY_REWRITE_TYPES = new Set([
  'http-request','http-response','http-request-jq','http-response-jq',
]);

export const SURGE_WAYX_MAP_LOCAL_DATA_TYPES = new Set([
  'file','text','tiny-gif','base64',
]);

export const SURGE_WAYX_SCRIPT_TYPES = new Set([
  'http-request','http-response',
]);

export const SURGE_WAYX_MITM_KEYS = new Set(['hostname']);
