import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  convert,
  parseLoon,
  scriptUrls,
  validateQX,
} from '../../.github/scripts/sync-convert.mjs';
import { validateSurgeModule } from '../src/index.mjs';

const ROOT = process.cwd();
const golden = JSON.parse(await fs.readFile(path.join(ROOT, 'converter/fixtures/end-to-end-golden.json'), 'utf8'));
const STAMP = golden.stamp;

const manifest = JSON.parse(await fs.readFile(path.join(ROOT, '.github/sources/loon.json'), 'utf8'));
const byId = new Map(manifest.map(entry => [entry.id, entry]));

const headerGroupFixture = {
  id:'HeaderGroupFixture',
  source:'https://example.invalid/header-group.lpx',
  qx:'HeaderGroupFixture.snippet',
  surge:'HeaderGroupFixture.sgmodule',
  category:'测试',
};
const headerGroupSource = `#!name=HeaderGroupFixture
#!desc=Header grouping regression

[Rewrite]
response if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then response.header.add("content-disposition", "inline")
response if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then response.header.set("content-type", "text/plain; charset=utf-8")

[MITM]
hostname=api.example.com
`;
const headerGroupOutput = convert(headerGroupFixture, headerGroupSource, new Map(), STAMP);
assert.match(headerGroupOutput.qx, /REVIEW REQUIRED: header\.add duplicate semantics are not verified for qx/);
assert.equal(
  headerGroupOutput.qx.split(/\r?\n/).some(line => !line.trim().startsWith('#') && /script-response-header/.test(line)),
  false,
  'QX header.add must not be activated through object-set semantics',
);
assert.match(headerGroupOutput.surge, /header-add content-disposition inline/);
assert.match(headerGroupOutput.surge, /header-del content-type/);
assert.match(headerGroupOutput.surge, /header-add content-type text\/plain; charset=utf-8/);
const requestAddFixture = {
  id:'RequestHeaderAddFixture',
  source:'https://example.invalid/request-header-add.lpx',
  qx:'RequestHeaderAddFixture.snippet',
  surge:'RequestHeaderAddFixture.sgmodule',
  category:'测试',
};
const requestAddSource = `#!name=RequestHeaderAddFixture
[Rewrite]
request if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then request.header.add("X-Test", "one")
response if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then response.header.replace("X-Test", /one/, "two")
`;
const requestAddOutput = convert(requestAddFixture, requestAddSource, new Map(), STAMP);
assert.ok(
  requestAddOutput.qx.includes('url request-header ^([^\\r\\n]+)(\\r\\n) request-header $1$2X-Test: one$2'),
  'QX request.header.add must use whole request-header insertion rather than object set\n' + requestAddOutput.qx,
);
assert.equal(
  requestAddOutput.qx.split(/\r?\n/).some(line => !line.trim().startsWith('#') && / url response-header /.test(line)),
  false,
  'QX must never emit the undocumented response-header rewrite token',
);
assert.match(requestAddOutput.qx, /url script-response-header .*header_.*\.js/);
assert.doesNotMatch(requestAddOutput.qx, /REVIEW REQUIRED/);
assert.match(requestAddOutput.surge, /header-add X-Test one/);

const requestAddBulkFixture = {
  id:'RequestHeaderAddBulkFixture',
  source:'https://example.invalid/request-header-add-bulk.lpx',
  qx:'RequestHeaderAddBulkFixture.snippet',
  surge:'RequestHeaderAddBulkFixture.sgmodule',
  category:'测试',
};
const requestAddBulkSource = `#!name=RequestHeaderAddBulkFixture
[Rewrite]
request if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then request.header.add(["X-A","X-B"], ["one","two"])
`;
const requestAddBulkOutput = convert(requestAddBulkFixture, requestAddBulkSource, new Map(), STAMP);
assert.ok(
  requestAddBulkOutput.qx.includes('request-header $1$2X-A: one$2X-B: two$2'),
  'QX bulk request.header.add must be emitted as one whole-header rewrite',
);
assert.equal(
  requestAddBulkOutput.qx.split(/\r?\n/).filter(line => !line.trim().startsWith('#') && / url request-header /.test(line)).length,
  1,
  'QX bulk request.header.add must not split one Loon action into multiple target rewrite rules',
);

const requestAddSetFixture = {
  id:'RequestHeaderAddSetFixture',
  source:'https://example.invalid/request-header-add-set.lpx',
  qx:'RequestHeaderAddSetFixture.snippet',
  surge:'RequestHeaderAddSetFixture.sgmodule',
  category:'测试',
};
const requestAddSetSource = `#!name=RequestHeaderAddSetFixture
[Rewrite]
request if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then request.header.add("X-A", "one")
request if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then request.header.set("X-B", "two")
`;
const requestAddSetOutput = convert(requestAddSetFixture, requestAddSetSource, new Map(), STAMP);
assert.match(requestAddSetOutput.qx, /REVIEW REQUIRED: QX header\.add cannot be represented losslessly/);
assert.equal(
  requestAddSetOutput.qx.split(/\r?\n/).some(line => !line.trim().startsWith('#') && / url (?:request-header|script-request-header) /.test(line)),
  false,
  'QX adjacent add+set must not be split into unproven multiple rewrite execution',
);

const requestReplaceCaptureFixture = {
  id:'RequestHeaderReplaceCaptureFixture',
  source:'https://example.invalid/request-header-replace-capture.lpx',
  qx:'RequestHeaderReplaceCaptureFixture.snippet',
  surge:'RequestHeaderReplaceCaptureFixture.sgmodule',
  category:'测试',
};
const requestReplaceCaptureSource = `#!name=RequestHeaderReplaceCaptureFixture
[Rewrite]
request if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then request.header.replace("User-Agent", /iPhone OS (\\d+)/, "iPhone OS $1")
`;
const requestReplaceCaptureOutput = convert(requestReplaceCaptureFixture, requestReplaceCaptureSource, new Map(), STAMP);
assert.equal(
  requestReplaceCaptureOutput.qx.split(/\r?\n/).some(line => !line.trim().startsWith('#') && / url request-header /.test(line)),
  false,
  'QX header.replace must not embed action-local captures into whole-header capture numbering',
);
assert.match(requestReplaceCaptureOutput.qx, /url script-request-header .*header_.*\.js/);
assert.doesNotMatch(requestReplaceCaptureOutput.qx, /REVIEW REQUIRED/);
const requestReplaceCaptureHelper = [...requestReplaceCaptureOutput.generatedScripts.values()].find(text => text.includes('User-Agent'));
assert.ok(requestReplaceCaptureHelper, 'QX request.header.replace must generate a helper');
assert.ok(
  requestReplaceCaptureHelper.includes('__wayxReplace("User-Agent", "iPhone OS (\\\\d+)", "iPhone OS $1");'),
  'QX header helper must preserve action-local $1 replacement and regex capture source',
);
assert.match(requestReplaceCaptureHelper, /toLowerCase\(\)/);
assert.doesNotMatch(requestReplaceCaptureHelper, /__wayxJsonAdd|__wayxJsonDelete|__wayxBody=/);

const requestAddDollarFixture = {
  id:'RequestHeaderAddDollarFixture',
  source:'https://example.invalid/request-header-add-dollar.lpx',
  qx:'RequestHeaderAddDollarFixture.snippet',
  surge:'RequestHeaderAddDollarFixture.sgmodule',
  category:'测试',
};
const requestAddDollarSource = `#!name=RequestHeaderAddDollarFixture
[Rewrite]
request if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then request.header.add("X-Price", "price $1")
`;
const requestAddDollarOutput = convert(requestAddDollarFixture, requestAddDollarSource, new Map(), STAMP);
assert.equal(
  requestAddDollarOutput.qx.split(/\r?\n/).some(line => !line.trim().startsWith('#') && / url request-header /.test(line)),
  false,
  'QX request.header.add with $ replacement syntax must not use the native replacement string',
);
assert.match(requestAddDollarOutput.qx, /REVIEW REQUIRED: QX header\.add cannot be represented losslessly/);


const qxValidatorEntry = {id:'QxValidatorFixture'};
const validQxValidatorText = `# Name: QxValidatorFixture
# [filter_local]
host, example.com, reject
# [rewrite_local]
^https://example\\.com url reject
# [mitm]
hostname = example.com
`;
assert.doesNotThrow(() => validateQX(validQxValidatorText, qxValidatorEntry));
assert.throws(
  () => validateQX(validQxValidatorText.replace('host, example.com, reject', 'dest-port, 443, reject'), qxValidatorEntry),
  /unsupported Quantumult X filter type/,
);
assert.throws(
  () => validateQX(validQxValidatorText.replace('^https://example\\.com url reject', '(?i)^https://example\\.com url reject'), qxValidatorEntry),
  /must not restore discarded Loon regex flags/,
);
assert.throws(
  () => validateQX(validQxValidatorText.replace('^https://example\\.com url reject', '[hH][tT][tT][pP][sS]://example\\.com url reject'), qxValidatorEntry),
  /manual HTTP case-fold/,
);
assert.throws(
  () => validateQX(validQxValidatorText.replace('^https://example\\.com url reject', '^https://example\\.com url loon-private-action'), qxValidatorEntry),
  /unsupported Quantumult X rewrite action/,
);
assert.throws(
  () => validateQX(validQxValidatorText.replace('^https://example\\.com url reject', '^https://example\\.com url response-header x response-header y'), qxValidatorEntry),
  /unsupported Quantumult X rewrite action/,
);

const outOfScopeSurgeScript = `#!name=ScopeFixture
#!desc=Scope fixture
[Script]
task = type=cron,script-path=https://example.com/task.js,cronexp="0 8 * * *"
`;
assert.throws(
  () => validateSurgeModule(outOfScopeSurgeScript, {id:'ScopeFixture'}, {adblockScope:true}),
  /unsupported Surge script type 'cron' in WayX ad-block scope/,
);

const argumentRewriteFixture = {
  id:'ArgumentRewriteFixture',
  source:'https://example.invalid/argument-rewrite.lpx',
  qx:'ArgumentRewriteFixture.snippet',
  surge:'ArgumentRewriteFixture.sgmodule',
  category:'测试',
};
const argumentRewriteSource = `#!name=ArgumentRewriteFixture
[Argument]
enabled=switch,true,tag=Enabled
price=input,9.99,type=number,tag=Price

[Rewrite]
response if \${enabled} == true && \${url} ~= /api/ then response.json.replace("data.price", \${price})
`;
const argumentRewriteOutput = convert(argumentRewriteFixture, argumentRewriteSource, new Map(), STAMP);
assert.match(argumentRewriteOutput.qx, /REVIEW REQUIRED: Quantumult X cannot carry Loon plugin \[Argument\] references/);
assert.doesNotMatch(argumentRewriteOutput.qx, /Source \[Argument\]|Argument usage:|enabled=switch|price=input/);
assert.match(argumentRewriteOutput.surge, /^#!arguments=.*enabled:true.*price:9\.99/m);
assert.match(argumentRewriteOutput.surge, /wayx_complex_.*type=http-response,pattern=.*script-path=.*argument=/);
assert.doesNotMatch(argumentRewriteOutput.surge, /REVIEW REQUIRED/);
assert.equal(
  argumentRewriteOutput.qx.split(/\r?\n/).some(line => !line.trim().startsWith('#') && /jsonjq-response-body/.test(line)),
  false,
  'plugin Argument Rewrite must not be frozen into an executable QX rewrite',
);
const argumentHelper = [...argumentRewriteOutput.generatedScripts.values()].find(text => /__wayxArgs/.test(text));
assert.ok(argumentHelper, 'Surge Argument Rewrite must generate a runtime helper');
assert.match(argumentHelper, /JSON\.parse\(String\(\$argument/);

const directSourceScriptFixture = {
  id:'DirectSourceScriptFixture',
  source:'https://example.invalid/direct-source-script.lpx',
  qx:'DirectSourceScriptFixture.snippet',
  surge:'DirectSourceScriptFixture.sgmodule',
  category:'测试',
};
const directSourceScriptUrl='https://scripts.example.com/source-runtime.js';
const directSourceScriptSource = `#!name=DirectSourceScriptFixture
[Script]
http-response ^https:\\/\\/api\\.example\\.com script-path=${directSourceScriptUrl},tag=source_response,requires-body=true
`;
const directSourceScriptMap = new Map([[directSourceScriptUrl, {
  qx:directSourceScriptUrl,
  surge:directSourceScriptUrl,
  source:'throw new Error("Quantumult X is not supported"); const body=$utils.ungzip($response.bodyBytes);',
  qxAdapted:false,
}]]);
const directSourceScriptOutput=convert(directSourceScriptFixture,directSourceScriptSource,directSourceScriptMap,STAMP);
assert.ok(directSourceScriptOutput.qx.includes('script-response-body ' + directSourceScriptUrl));
assert.ok(directSourceScriptOutput.surge.includes('script-path=' + directSourceScriptUrl));
assert.doesNotMatch(directSourceScriptOutput.qx, /source script disabled/i);

const disabledRewriteFixture = {
  id:'DisabledRewriteFixture',
  source:'https://example.invalid/disabled-rewrite.lpx',
  qx:'DisabledRewriteFixture.snippet',
  surge:'DisabledRewriteFixture.sgmodule',
  category:'测试',
};
const disabledRewriteSource = `#!name=DisabledRewriteFixture
[Rewrite]
#response if \${url} ~= /^https:\\/\\/api\\.example\\.com\\/mock\\?/i then response.body.mock("text", "OK", 200)
#response if \${url} ~= /^https:\\/\\/api\\.example\\.com\\/json\\?/i then response.json.jq(".data.ads = []")
`;
const unknownSectionFixture = {
  id:'UnknownSectionFixture',
  source:'https://example.invalid/unknown-section.lpx',
  qx:'UnknownSectionFixture.snippet',
  surge:'UnknownSectionFixture.sgmodule',
  category:'测试',
};
const unknownSectionSource = `#!name=UnknownSectionFixture
[FutureFeature]
foo = bar
`;
const unknownSectionOutput = convert(unknownSectionFixture, unknownSectionSource, new Map(), STAMP);
assert.match(unknownSectionOutput.qx, /REVIEW REQUIRED: unsupported Loon source section \[FutureFeature\]/);
assert.match(unknownSectionOutput.qx, /# Source declaration: foo = bar/);
assert.match(unknownSectionOutput.surge, /REVIEW REQUIRED: unsupported Loon source section \[FutureFeature\]/);
assert.match(unknownSectionOutput.surge, /# Source declaration: foo = bar/);

const disabledRewriteOutput = convert(disabledRewriteFixture, disabledRewriteSource, new Map(), STAMP);
assert.match(disabledRewriteOutput.surge, /^\[Body Rewrite\]$/m);
assert.match(disabledRewriteOutput.surge, /#response if \$\{url\} ~= \/\^https:\\\/\\\/api\\\.example\\\.com\\\/json\\\?\/i then response\.json\.jq/);
assert.ok(disabledRewriteOutput.surge.includes("# http-response-jq ^https:\\/\\/api\\.example\\.com\\/json\\? '.data.ads = []'"));
assert.match(disabledRewriteOutput.surge, /^\[Map Local\]$/m);
assert.match(disabledRewriteOutput.surge, /#response if \$\{url\} ~= \/\^https:\\\/\\\/api\\\.example\\\.com\\\/mock\\\?\/i then response\.body\.mock\("text", "OK", 200\)/);
assert.ok(disabledRewriteOutput.surge.includes('# ^https:\\/\\/api\\.example\\.com\\/mock\\? data-type=text data="OK" status-code=200 header="Content-Type:text/plain"'));
assert.equal(
  disabledRewriteOutput.surge.split(/\r?\n/).some(line => !line.trim().startsWith('#') && /api\\\.example\\\.com\/(?:mock|json)/.test(line)),
  false,
  'disabled source Rewrite entries must remain disabled after Surge conversion',
);

const cases = [
  {
    name:'HTTPDNS',
    entry:byId.get('HTTPDNS'),
    file:'Resource/Loon/Block_HTTPDNS.lpx',
  },
  {
    name:'PinDuoDuo',
    entry:byId.get('PinDuoDuo'),
    file:'Resource/Loon/PinDuoDuo_remove_ads.lpx',
  },
  {
    name:'MyBlockAds',
    entry:{
      id:'MyBlockAds',
      source:'https://raw.githubusercontent.com/JuemingDC/WayX/main/Resource/Loon/RuCu6/myblockads.lpx',
      qx:'MyBlockAds.snippet',
      surge:'MyBlockAds.sgmodule',
      category:'去广告',
    },
    file:'Resource/Loon/RuCu6/myblockads.lpx',
  },
  {
    name:'YouTube',
    entry:{
      id:'YouTube',
      source:'https://raw.githubusercontent.com/JuemingDC/WayX/main/Resource/Loon/RuCu6/youtube.lpx',
      qx:'YouTube.snippet',
      surge:'YouTube.sgmodule',
      category:'去广告',
    },
    file:'Resource/Loon/RuCu6/youtube.lpx',
  },
  {
    name:'Bilibili',
    entry:{
      id:'Bilibili',
      source:'https://raw.githubusercontent.com/JuemingDC/WayX/main/Resource/Loon/RuCu6/bilibili.lpx',
      qx:'Bilibili.snippet',
      surge:'Bilibili.sgmodule',
      category:'去广告',
    },
    file:'Resource/Loon/RuCu6/bilibili.lpx',
  },
  {
    name:'JingDong',
    entry:{
      id:'JingDong',
      source:'https://raw.githubusercontent.com/JuemingDC/WayX/main/Resource/Loon/RuCu6/jingdong.lpx',
      qx:'JingDong.snippet',
      surge:'JingDong.sgmodule',
      category:'去广告',
    },
    file:'Resource/Loon/RuCu6/jingdong.lpx',
  },
];

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function regressionScriptSource(url) {
  // Real-plugin regression fixtures may encode known source behavior, but the
  // production converter never sees these identities. Genericity is enforced
  // separately by generic-identity.mjs and genericity-audit.mjs.
  if (/\/bilibili\/(?:request|response)\.js(?:\?|$)/i.test(url)) {
    return 'throw new Error("Quantumult X is not supported"); const body=$utils.ungzip($response.bodyBytes);';
  }
  if (/\/youtube\/(?:request|response)\.js(?:\?|$)/i.test(url)) {
    return 'const isQX=typeof $task!=="undefined"; const pref=$prefs.valueForKey("x"); $done({body:$response&&$response.body});';
  }
  if (/\/12306\.js(?:\?|$)/i.test(url)) {
    return 'const body=$request.body; const isQX=typeof $task!=="undefined"; if(isQX)$done({body});else $done({response:{body}});';
  }
  if (/\/header\.js(?:\?|$)/i.test(url)) {
    return 'const h=$request.headers; if(h) $done({status:"HTTP/1.1 404 Not Found"}); else $done({});';
  }
  return 'const isQX=typeof $task!=="undefined"; $done({});';
}

function passthroughScriptMap(source) {
  return new Map(scriptUrls(source).map(url => [
    url,
    {qx:url, surge:url, source:regressionScriptSource(url), qxAdapted:false},
  ]));
}

function activeLines(text) {
  return text.split('\n').filter(raw => {
    const line = raw.trim();
    return line && !line.startsWith('#') && !line.startsWith(';') && !line.startsWith('//') && !/^\[[^\]]+\]$/.test(line);
  });
}

function count(text, re) {
  return (text.match(re) || []).length;
}

const report = [];
const goldenMismatches = [];
for (const testCase of cases) {
  assert.ok(testCase.entry, `${testCase.name}: missing manifest entry`);
  const source = await fs.readFile(path.join(ROOT, testCase.file), 'utf8');
  const scripts = passthroughScriptMap(source);
  const jqFiles = new Map();
  const out = convert(testCase.entry, source, scripts, STAMP, new Map(), jqFiles);

  validateQX(out.qx, testCase.entry);
  validateSurgeModule(out.surge, testCase.entry);

  assert.match(out.qx, /^#?!.+|^# /m);
  assert.ok(out.qx.includes('# [filter_local]'));
  assert.ok(out.qx.includes('# [rewrite_local]'));
  assert.ok(out.qx.includes('# [mitm]'));
  assert.equal(/^\[(?:filter_local|rewrite_local|mitm)\]$/mi.test(out.qx), false);

  assert.match(out.surge, /^#!name=.+$/m);
  assert.match(out.surge, /^#!desc=.+$/m);
  assert.equal(/^#!(?:author|icon|date|loon_version)=/mi.test(out.surge), false);

  // Conversion may create target helper scripts for rewrite/mock semantics, but
  // original Script-section JavaScript is never rewritten or wrapped.
  for (const url of scriptUrls(source)) {
    assert.ok(![...out.generatedScripts.values()].some(body => body.includes('Source: ' + url) && body.includes('Script v2 ->')));
  }

  const actual = {
    name:testCase.name,
    source:testCase.file,
    qxSha256:sha256(out.qx),
    surgeSha256:sha256(out.surge),
    qxBytes:Buffer.byteLength(out.qx),
    surgeBytes:Buffer.byteLength(out.surge),
    sourceScriptCount:scripts.size,
    generatedScriptCount:out.generatedScripts.size,
    qxReview:count(out.qx, /REVIEW REQUIRED/g),
    surgeReview:count(out.surge, /REVIEW REQUIRED/g),
    sections:[...out.surge.matchAll(/^\[([^\]]+)\]$/gm)].map(m => m[1]),
  };

  const expected = golden.cases[testCase.name];
  assert.ok(expected, testCase.name + ': missing golden fixture');
  for (const key of ['qxSha256','surgeSha256','qxBytes','surgeBytes','sourceScriptCount','generatedScriptCount','qxReview','surgeReview']) {
    if (actual[key] !== expected[key]) {
      goldenMismatches.push({
        case:testCase.name,
        key,
        expected:expected[key],
        actual:actual[key],
      });
    }
  }
  if (JSON.stringify(actual.sections) !== JSON.stringify(expected.sections)) {
    goldenMismatches.push({
      case:testCase.name,
      key:'sections',
      expected:expected.sections,
      actual:actual.sections,
    });
  }

  const qxActive = activeLines(out.qx);
  const surgeActive = activeLines(out.surge);

  if (testCase.name === 'HTTPDNS') {
    assert.match(out.surge, /^#!requirement=CORE_VERSION>=20$/m);
    assert.match(out.surge, /AND,\(\(URL-REGEX,/);
    assert.match(out.surge, /USER-AGENT,/);
    assert.equal(/^#!(?:author|icon|date|loon_version)=/mi.test(out.surge), false);
    assert.ok(qxActive.some(line => /url reject-200$/.test(line)), 'HTTPDNS: QX URL-REGEX reject mapping missing');
  }

  if (testCase.name === 'PinDuoDuo') {
    assert.match(out.surge, /AND,\(\(DOMAIN,\s*api\.pinduoduo\.com\),\s*\(PROTOCOL,\s*QUIC\)\),REJECT/);
    assert.match(out.surge, /^\[Body Rewrite\]$/m);
    assert.match(out.surge, /^\[Map Local\]$/m);
    assert.match(out.surge, /^\[Script\]$/m);
    assert.match(out.surge, /^hostname = %APPEND% api\.pinduoduo\.com, m\.pinduoduo\.net$/m);
    assert.ok(surgeActive.some(line => line.includes('script-path=https://kelee.one/Resource/JavaScript/PinDuoDuo/PinDuoDuo_remove_ads.js')));
  }

  if (testCase.name === 'MyBlockAds') {
    assert.doesNotMatch(out.qx, /jq-path=/);
    assert.doesNotMatch(out.surge, /jq-path=/);
    assert.match(out.surge, /^\[Body Rewrite\]$/m);
    assert.match(out.surge, /^\[Map Local\]$/m);
  }

  if (testCase.name === 'YouTube') {
    assert.doesNotMatch(out.qx, /Source \[Argument\]|Argument usage:/, 'YouTube QX must not emit Loon plugin parameter UI/declarations');
    assert.match(out.surge, /^#!arguments=.*captionLang:zh-Hans/m);
    assert.match(out.surge, /argument="\{\\\"captionLang\\\":\\\"\{\{\{captionLang\}\}\}\\\"\}"/);
    assert.equal(qxActive.some(line => /youtube\/request\.js$/.test(line)), false, 'YouTube: request binary script must stay inactive until QX request bodyBytes is officially verified');
    assert.match(out.qx, /request binary_body_mode=true has no verified Quantumult X request-body bodyBytes example/);
    assert.match(out.qx, /SCRIPT V2 REVIEW REQUIRED/);
    assert.doesNotMatch(out.surge, /SCRIPT V2 REVIEW REQUIRED/);
  }

  if (testCase.name === 'Bilibili') {
    assert.match(out.qx, /^host, bsbsb\.top, PROXY$/m, 'Bilibili: Loon plugin PROXY binding must remain literal in QX');
    assert.doesNotMatch(out.qx, /Source \[Argument\]|Argument usage:/, 'Bilibili QX must not emit Loon plugin parameter UI/declarations');
    assert.doesNotMatch(out.qx, /QUANTUMULT X (?:UNSUPPORTED|REVIEW REQUIRED) - source script disabled/);
    assert.ok(qxActive.some(line => /bilibili\/(?:request|response|json)\.js/.test(line)), 'Bilibili Source Script declarations must keep original URLs without runtime compatibility gating');
    assert.match(out.surge, /Source Loon plugin policy PROXY preserved without conversion/);
    assert.doesNotMatch(out.surge, /Source declaration:.*PROXY[\s\S]*REVIEW REQUIRED: Surge Module requires an external policy binding/);
    assert.match(out.surge, /^#!arguments=.*displayUpList:auto.*sponsorBlock:true/m);
    assert.match(out.surge, /#!REQUIREMENT "'\{\{\{sponsorBlock\}\}\}'=='true'"/);
    assert.doesNotMatch(out.surge, /SCRIPT V2 REVIEW REQUIRED/);
    assert.match(
      out.surge,
      /#response if \$\{url\} ~= \/\^https:\\\/\\\/app\\\.bilibili\\\.com\\\/x\\\/v2\\\/splash\\\/list\\\?\/i then response\.body\.mock\("text", "OK", 200\)/,
      'Bilibili: disabled source mock line must be preserved as a comment',
    );
    assert.ok(
      out.surge.includes('# ^https:\\/\\/app\\.bilibili\\.com\\/x\\/v2\\/splash\\/list\\? data-type=text data="OK" status-code=200 header="Content-Type:text/plain"'),
      'Bilibili: disabled response.body.mock must have a disabled Surge Map Local equivalent',
    );
    assert.ok(
      out.surge.includes("# http-response-jq ^https:\\/\\/app\\.bilibili\\.com\\/x\\/v2\\/splash\\/(show|event\\/list2)\\? '.data |= with_entries("),
      'Bilibili: disabled response.json.jq must have a disabled Surge Body Rewrite equivalent',
    );
  }

  if (testCase.name === 'JingDong') {
    assert.match(out.surge, /^#!arguments=Capture:false,Cookies:/m);
    assert.match(out.surge, /#!REQUIREMENT "'\{\{\{Capture\}\}\}'=='true'"/);
    assert.ok(qxActive.some(line => /Scripts\/jingdong\.js$/.test(line)), 'JingDong native script declaration missing');
    assert.match(out.qx, /dynamic enable cannot be carried|SCRIPT V2 REVIEW REQUIRED/);
  }

  report.push(actual);
}

console.log('End-to-end conversion report:');
console.log(JSON.stringify(report, null, 2));
if (goldenMismatches.length) {
  console.error('Golden mismatches:');
  console.error(JSON.stringify(goldenMismatches, null, 2));
}
assert.deepEqual(goldenMismatches, [], 'end-to-end golden mismatches detected');
console.log('End-to-end conversion golden passed');
