import assert from 'node:assert/strict';
import {
  parseRewriteV2,
  qxDirectRewritePlan,
  surgeDirectRewritePlan,
  surgeRejectRewritePlan,
  renderQxInlineMockScript,
  surgeInlineMockPlan,
  qxPrimitiveForRewriteV2Action,
  qxRule,
  surgeRule,
} from '../src/index.mjs';

// User-supplied Loon new-syntax reference cases.
// Source semantics are asserted; script source files are never rewritten here.

const deleteAst = parseRewriteV2(
  'response if ${url} ~= /^https?:\\/\\/tiebac\\.baidu\\.com\\/c\\/s\\/sync$/i then response.json.delete(["activity_switch", "video_report_config", "wl_config.pb_banner_funad_cache_strategy", "scheme_whitelist"])'
);
const deleteQx = qxDirectRewritePlan(deleteAst);
const deleteSurge = surgeDirectRewritePlan(deleteAst);
assert.equal(deleteQx.ok, false);
assert.match(deleteQx.reason, /cannot preserve Loon regex flags: i/);
assert.equal(deleteSurge.ok, false);
assert.match(deleteSurge.reason, /cannot preserve Loon regex flags: i/);

const replaceAst = parseRewriteV2(
  'response if ${url} ~= /^https?:\\/\\/tiebac\\.baidu\\.com\\/c\\/s\\/sync$/i then response.json.replace(["wl_config.home_ad_num", "wl_config.frs_ad_num", "wl_config.index_bear_first_floor_max"], [0, 0, 999999999])'
);
const replaceQx = qxDirectRewritePlan(replaceAst);
const replaceSurge = surgeDirectRewritePlan(replaceAst);
assert.equal(replaceQx.ok, false);
assert.match(replaceQx.reason, /cannot preserve Loon regex flags: i/);
assert.equal(replaceSurge.ok, false);
assert.match(replaceSurge.reason, /cannot preserve Loon regex flags: i/);

const addAst = parseRewriteV2(
  'response if ${url} ~= /^https?:\\/\\/tiebac\\.baidu\\.com\\/c\\/s\\/sync$/i then response.json.add("wl_config.new_flag", true)'
);
const addQx = qxDirectRewritePlan(addAst);
const addSurge = surgeDirectRewritePlan(addAst);
assert.equal(addQx.ok, false);
assert.match(addQx.reason, /cannot preserve Loon regex flags: i/);
assert.equal(addSurge.ok, false);
assert.match(addSurge.reason, /cannot preserve Loon regex flags: i/);

const scalarDeleteAst = parseRewriteV2(
  'response if ${url} ~= /api/ then response.json.delete("data.ad")'
);
assert.match(qxDirectRewritePlan(scalarDeleteAst).line, /'del\(\.data\.ad\)'$/);

const indexedDeleteAst = parseRewriteV2(
  'response if ${url} ~= /api/ then response.json.delete(["items[0]", "items[1]"])'
);
const indexedDeleteQx = qxDirectRewritePlan(indexedDeleteAst);
const indexedDeleteSurge = surgeDirectRewritePlan(indexedDeleteAst);
assert.match(indexedDeleteQx.line, /del\(\.items\[0\]\) \| del\(\.items\[1\]\)/);
assert.match(indexedDeleteSurge.line, /del\(\.items\[0\]\) \| del\(\.items\[1\]\)/);

const jqAst = parseRewriteV2(
  'response if ${url} ~= /^https:\\/\\/acs\\.m\\.goofish\\.com\\/gw\\/mtop\\.taobao\\.idle\\.trade\\.full\\.info\\//i then response.json.jq(".data.components |= map(select(.render | . == \\"orderStatusVO\\" or . == \\"addressInfoVO\\" or . == \\"orderInfoVO\\"))")'
);
const jqQx = qxDirectRewritePlan(jqAst);
const jqSurge = surgeDirectRewritePlan(jqAst);
assert.equal(jqQx.ok, false);
assert.match(jqQx.reason, /cannot preserve Loon regex flags: i/);
assert.equal(jqSurge.ok, false);
assert.match(jqSurge.reason, /cannot preserve Loon regex flags: i/);

const preserveJqSource = '.a |= (. + 1) | .b = [1, 2] | .c = {"x": true}';
const preserveJqAst = parseRewriteV2(
  'response if ${url} ~= /api/ then response.json.jq("' + preserveJqSource.replace(/"/g, '\\"') + '")'
);
const preserveJqQx = qxDirectRewritePlan(preserveJqAst);
const preserveJqSurge = surgeDirectRewritePlan(preserveJqAst);
assert.ok(preserveJqQx.line.endsWith("'" + preserveJqSource + "'"));
assert.ok(preserveJqSurge.line.endsWith("'" + preserveJqSource + "'"));

const preserveDelpathsSource = 'delpaths([["ads"],["promo"]])';
const preserveDelpathsAst = parseRewriteV2(
  'response if ${url} ~= /api/ then response.json.jq("' + preserveDelpathsSource.replace(/"/g, '\\"') + '")'
);
const preserveDelpathsQx = qxDirectRewritePlan(preserveDelpathsAst);
const preserveDelpathsSurge = surgeDirectRewritePlan(preserveDelpathsAst);
assert.ok(preserveDelpathsQx.line.endsWith("'" + preserveDelpathsSource + "'"));
assert.ok(preserveDelpathsSurge.line.endsWith("'" + preserveDelpathsSource + "'"));

const mockAst = parseRewriteV2(
  'response if ${url} ~= /^https?:\\/\\/tieba\\.baidu\\.com\\/mo\\/q\\/search\\/startPage\\?/i then response.body.mock("json", "{\\"no\\":0,\\"error\\":\\"success\\"}", 200)'
);
assert.throws(
  () => renderQxInlineMockScript(mockAst, {category:'Adblock'}),
  /cannot preserve Loon regex flags: i/,
);
const surgeMock = surgeInlineMockPlan(mockAst);
assert.equal(surgeMock.ok, false);
assert.match(surgeMock.reason, /cannot preserve Loon regex flags: i/);

const rejectDictAst = parseRewriteV2(
  'request if ${url} ~= /^https:\\/\\/acs\\.m\\.goofish\\.com\\/gw\\/mtop\\.taobao\\.idle\\.user\\.strategy\\.list\\//i then reject_dict(200)'
);
assert.equal(qxPrimitiveForRewriteV2Action(rejectDictAst.actions[0]), 'reject-dict');

const reject404Ast = parseRewriteV2(
  'request if ${url} ~= /^https?:\\/\\/api-access\\.pangolin-sdk-toutiao\\.com\\/api\\/ad\\/union\\/sdk/i then reject(404)'
);
const reject404Qx = qxDirectRewritePlan(reject404Ast);
assert.equal(reject404Qx.ok, false);
assert.match(reject404Qx.reason, /cannot preserve Loon regex flags: i/);
const reject404Surge = surgeRejectRewritePlan(reject404Ast);
assert.equal(reject404Surge.ok, false);
assert.match(reject404Surge.reason, /cannot preserve Loon regex flags: i/);

const rejectImgAst = parseRewriteV2(
  'request if ${url} ~= /^https?:\\/\\/api-mifit\\.huami\\.com\\/discovery\\/mi\\/discovery\\/sport_summary_ad\\?/i then reject_img(200)'
);
assert.equal(qxPrimitiveForRewriteV2Action(rejectImgAst.actions[0]), 'reject-img');
const rejectImgSurge = surgeRejectRewritePlan(rejectImgAst);
assert.equal(rejectImgSurge.ok, false);
assert.match(rejectImgSurge.reason, /cannot preserve Loon regex flags: i/);

const loonUrlImg = 'URL-REGEX,"^https:\\/\\/a\\.line\\.me\\/er\\/lads\\/v\\d\\/ei\\?",REJECT-IMG';
assert.equal(qxRule(loonUrlImg).line, '^https:\\/\\/a\\.line\\.me\\/er\\/lads\\/v\\d\\/ei\\? url reject-img');
assert.equal(
  surgeRule(loonUrlImg),
  'URL-REGEX,^https:\\/\\/a\\.line\\.me\\/er\\/lads\\/v\\d\\/ei\\?,REJECT-TINYGIF'
);

const loonLogicalRule = 'AND,((URL-REGEX,"^http:\\/\\/119\\.29\\.29\\.90\\/d\\?"),(USER-AGENT,"Example*")),DIRECT';
assert.equal(
  surgeRule(loonLogicalRule),
  'AND,((URL-REGEX,^http:\\/\\/119\\.29\\.29\\.90\\/d\\?),(USER-AGENT,"Example*")),DIRECT',
);

const loonNestedLogicalRule = 'AND,((DOMAIN-KEYWORD,tnc),(OR,((DOMAIN-SUFFIX,capcutapi.com),(DOMAIN-SUFFIX,zijieapi.com)))),DIRECT';
assert.equal(surgeRule(loonNestedLogicalRule), loonNestedLogicalRule);

const loonProtocolRule = 'AND,((DOMAIN,api.pinduoduo.com),(PROTOCOL,QUIC)),REJECT';
assert.equal(surgeRule(loonProtocolRule), loonProtocolRule);

const loonIpRule = 'IP-CIDR,39.156.140.30/32,REJECT,no-resolve';
assert.equal(surgeRule(loonIpRule), loonIpRule);

const loonUrlDrop = 'URL-REGEX,"^https:\\/\\/drop\\.example\\.com",REJECT-DROP';
assert.equal(qxRule(loonUrlDrop).line, '^https:\\/\\/drop\\.example\\.com url reject');
const surgeUrlDrop = surgeRule(loonUrlDrop);
assert.equal(surgeUrlDrop, 'URL-REGEX,^https:\\/\\/drop\\.example\\.com,REJECT-DROP');

const loonUrlNoDrop = 'URL-REGEX,"^https:\\/\\/nodrop\\.example\\.com",REJECT-NO-DROP';
const surgeUrlNoDrop = surgeRule(loonUrlNoDrop);
assert.equal(surgeUrlNoDrop, 'URL-REGEX,^https:\\/\\/nodrop\\.example\\.com,REJECT-NO-DROP');

console.log('Loon new-syntax reference cases passed');
