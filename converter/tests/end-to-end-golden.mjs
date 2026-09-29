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
    assert.equal(actual.qxReview, 0);
    assert.equal(actual.surgeReview, 0);
    assert.match(out.qx, /response\.json\.jq\("jq-path=https:\/\/rucu6\.pages\.dev\/JQLang\/reddit\.jq"\)/);
    assert.match(out.surge, /response\.json\.jq\("jq-path=https:\/\/rucu6\.pages\.dev\/JQLang\/reddit\.jq"\)/);
    assert.match(out.surge, /^\[Body Rewrite\]$/m);
    assert.match(out.surge, /^\[Map Local\]$/m);
  }

  if (testCase.name === 'YouTube') {
    assert.equal(actual.qxReview, 2);
    assert.equal(actual.surgeReview, 2);
    assert.ok(qxActive.some(line => /youtube\/request\.js$/.test(line)), 'YouTube: native QX request script declaration missing');
    assert.match(out.qx, /SCRIPT V2 REVIEW REQUIRED/);
    assert.match(out.surge, /SCRIPT V2 REVIEW REQUIRED/);
  }

  if (testCase.name === 'Bilibili') {
    assert.match(out.qx, /QUANTUMULT X UNSUPPORTED - source script disabled/);
    assert.equal(qxActive.some(line => /bilibili\/(?:request|response)\.js/.test(line)), false, 'Bilibili protobuf scripts must not be active in QX');
    assert.ok(qxActive.some(line => /bilibili\/json\.js/.test(line)), 'Bilibili JSON script declarations should remain available');
    assert.equal(actual.surgeReview, 3);
  }

  if (testCase.name === 'JingDong') {
    assert.equal(actual.qxReview, 2);
    assert.equal(actual.surgeReview, 2);
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
