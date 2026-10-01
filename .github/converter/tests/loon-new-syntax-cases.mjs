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
assert.equal(deleteQx.ok, true);
assert.match(deleteQx.line, /jsonjq-response-body/);
assert.match(deleteQx.line, /delpaths/);
assert.match(deleteQx.line, /wl_config/);
assert.equal(deleteSurge.ok, true);
assert.match(deleteSurge.line, /^http-response-jq /);

const replaceAst = parseRewriteV2(
  'response if ${url} ~= /^https?:\\/\\/tiebac\\.baidu\\.com\\/c\\/s\\/sync$/i then response.json.replace(["wl_config.home_ad_num", "wl_config.frs_ad_num", "wl_config.index_bear_first_floor_max"], [0, 0, 999999999])'
);
assert.equal(qxDirectRewritePlan(replaceAst).ok, true);
const replaceQx = qxDirectRewritePlan(replaceAst);
const replaceSurge = surgeDirectRewritePlan(replaceAst);
assert.match(replaceQx.line, /getpath/);
assert.match(replaceQx.line, /setpath/);
assert.equal(replaceSurge.ok, true);
assert.match(replaceSurge.line, /getpath/);

const addAst = parseRewriteV2(
  'response if ${url} ~= /^https?:\\/\\/tiebac\\.baidu\\.com\\/c\\/s\\/sync$/i then response.json.add("wl_config.new_flag", true)'
);
const addQx = qxDirectRewritePlan(addAst);
const addSurge = surgeDirectRewritePlan(addAst);
assert.equal(addQx.ok, true);
assert.match(addQx.line, /getpath/);
assert.match(addQx.line, /== null/);
assert.equal(addSurge.ok, true);
assert.match(addSurge.line, /^http-response-jq /);

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
assert.equal(jqQx.ok, true);
assert.match(jqQx.line, /jsonjq-response-body/);
assert.equal(surgeDirectRewritePlan(jqAst).ok, true);

const preserveJqSource = '.a |= (. + 1) | .b = [1, 2] | .c = {"x": true}';
const preserveJqAst = parseRewriteV2(
  'response if ${url} ~= /api/ then response.json.jq("' + preserveJqSource.replace(/"/g, '\\"') + '")'
);
const preserveJqQx = qxDirectRewritePlan(preserveJqAst);
const preserveJqSurge = surgeDirectRewritePlan(preserveJqAst);
assert.ok(preserveJqQx.line.endsWith("'" + preserveJqSource + "'"));
assert.ok(preserveJqSurge.line.endsWith("'" + preserveJqSource + "'"));

const mockAst = parseRewriteV2(
  'response if ${url} ~= /^https?:\\/\\/tieba\\.baidu\\.com\\/mo\\/q\\/search\\/startPage\\?/i then response.body.mock("json", "{\\"no\\":0,\\"error\\":\\"success\\"}", 200)'
);
const qxMock = renderQxInlineMockScript(mockAst, {category:'Adblock'});
assert.equal(qxMock.qxAction, 'script-echo-response');
assert.match(qxMock.script, /__wayxBody = /);
assert.match(qxMock.script, /success/);
const surgeMock = surgeInlineMockPlan(mockAst);
assert.equal(surgeMock.ok, true);
assert.equal(surgeMock.section, 'map');

const rejectDictAst = parseRewriteV2(
  'request if ${url} ~= /^https:\\/\\/acs\\.m\\.goofish\\.com\\/gw\\/mtop\\.taobao\\.idle\\.user\\.strategy\\.list\\//i then reject_dict(200)'
);
assert.equal(qxPrimitiveForRewriteV2Action(rejectDictAst.actions[0]), 'reject-dict');

const reject404Ast = parseRewriteV2(
  'request if ${url} ~= /^https?:\\/\\/api-access\\.pangolin-sdk-toutiao\\.com\\/api\\/ad\\/union\\/sdk/i then reject(404)'
);
const reject404Qx = qxDirectRewritePlan(reject404Ast);
assert.equal(reject404Qx.ok, true);
assert.match(reject404Qx.line, / url reject$/);
const reject404Surge = surgeRejectRewritePlan(reject404Ast);
assert.equal(reject404Surge.ok, true);
assert.equal(reject404Surge.section, 'url');
assert.match(reject404Surge.line, / _ reject$/);

const rejectImgAst = parseRewriteV2(
  'request if ${url} ~= /^https?:\\/\\/api-mifit\\.huami\\.com\\/discovery\\/mi\\/discovery\\/sport_summary_ad\\?/i then reject_img(200)'
);
assert.equal(qxPrimitiveForRewriteV2Action(rejectImgAst.actions[0]), 'reject-img');
const rejectImgSurge = surgeRejectRewritePlan(rejectImgAst);
assert.equal(rejectImgSurge.ok, true);
assert.equal(rejectImgSurge.section, 'map');
assert.match(rejectImgSurge.line, /data-type=tiny-gif status-code=200/);

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
assert.match(surgeUrlDrop, /Surge Module unsupported Rule policy REJECT-DROP commented out/);
assert.match(surgeUrlDrop, /Source declaration: URL-REGEX/);

console.log('Loon new-syntax reference cases passed');
