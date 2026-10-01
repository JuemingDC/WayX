import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const SRC=path.join(ROOT,'converter','src');
const files=[
  ...(await fs.readdir(SRC))
    .filter(name=>name.endsWith('.mjs'))
    .map(name=>path.join(SRC,name)),
  path.join(ROOT,'.github','scripts','sync-convert.mjs'),
  path.join(ROOT,'converter','tools','regenerate-canonical.mjs'),
];

const forbiddenSymbols=[
  'QX_SCRIPT_OVERRIDES',
  'QX_SCRIPT_PORT_REGISTRY',
  'registeredQxScriptPort',
  'EXTRA_LOCAL_ENTRIES',
];

const identityComparisonPatterns=[
  /\b(?:entry|plugin)\.(?:id|name|author)\s*(?:===|==|!==|!=)\s*['"]/,
  /\bswitch\s*\(\s*(?:entry|plugin)\.(?:id|name|author)\s*\)/,
  /\b(?:scriptUrl|sourceUrl)\s*\.(?:includes|startsWith|endsWith|match)\s*\(\s*['"][^'"]*(?:youtube|bilibili|jingdong|12306|myblockads|rucu6)/i,
  /\/Scripts\\\/(?:youtube|bilibili|jingdong|12306|myblockads)[^/]*\\?\.js/i,
  /path\.startsWith\(\s*["']Resource\/Loon\/[^"']+\/["']\s*\)/,
  /Resource\/Loon\/(?:RuCu6|YouTube|Bilibili|JingDong|MyBlockAds)\//i,
];

const violations=[];
for(const file of files){
  const text=await fs.readFile(file,'utf8');
  for(const symbol of forbiddenSymbols){
    if(text.includes(symbol)) violations.push(`${path.relative(ROOT,file)}: forbidden plugin-port symbol ${symbol}`);
  }
  for(const re of identityComparisonPatterns){
    if(re.test(text)) violations.push(`${path.relative(ROOT,file)}: identity-driven semantic branch matched ${re}`);
  }
}

assert.deepEqual(violations, [], 'Generic converter audit failed:\n'+violations.join('\n'));
console.log('Generic converter source audit passed');
