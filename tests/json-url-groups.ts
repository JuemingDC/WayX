// Modified: 2026-11-15 (chance). Verify the real repeated-URL failure and
// source-stage grouping, including comments, phases and per-line file indices.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {convertPlugin, convertPluginWithContext, materializeConversionRunContext} from "../src/emit/conversion.ts";
const options = {stamp:"2026-11-15"};
const entry = {id:"URLGroup", source:"https://example.test/main.lpx", category:"Test"};
const source = '[Rewrite]\n# first\nresponse if ${url} ~= /same/i then response.json.add("x",1)\nresponse if ${url} ~= /other/ then response.json.jq(".other = true")\n# second\nresponse if ${url} ~= /same/i then response.json.jq_file("one.jq")\nrequest if ${url} ~= /same/i then request.json.jq(".request = true")\n# third\nresponse if ${url} ~= /same/i then response.json.delete("ad") | response.json.jq_file("two.jq")\n';
const context = await materializeConversionRunContext(entry,source,{root:process.cwd(), fetchText:async (url: string) => url.endsWith('one.jq') ? '.x += 2' : '.x *= 3'});
const before = JSON.stringify([...context.declarations]);
for (let iteration = 0; iteration < 2; iteration++) {
  const out = convertPluginWithContext(entry,source,context,options);
  for (const target of ['qx','surge']) {
    const rows = out[target].split('\n').filter((line: string) => target === 'qx' ? line.startsWith('(?i)same url jsonjq-response-body ') : line.startsWith('http-response-jq (?i)same '));
    assert.equal(rows.length,1,out[target]);
    const program = rows[0].slice(rows[0].indexOf(" '")+2,-1);
    const result = spawnSync('jq',['-c',program],{input:'{"ad":1}',encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    assert.equal(result.stdout.trim(),'{"x":9}');
    assert.ok(out[target].includes('# first'));
    assert.ok(out[target].includes('# second'));
    assert.ok(out[target].includes('# third'));
    assert.ok(out[target].includes('other'));
    assert.ok(out[target].includes(target==='qx'?'jsonjq-request-body':'http-request-jq'));
  }
  assert.equal(JSON.stringify([...context.declarations]),before,'source grouping must not mutate the reusable acquisition context');
}
// A broken dependency in a later source line diagnoses the entire URL group.
const brokenSource = '[Rewrite]\nresponse if ${url} ~= /broken/ then response.json.add("before",true)\nresponse if ${url} ~= /broken/ then response.json.jq_file("missing.jq")\n';
const brokenContext = await materializeConversionRunContext(entry,brokenSource,{root:process.cwd(),fetchText:async () => {throw Error('missing URL group fixture');}});
const broken = convertPluginWithContext(entry,brokenSource,brokenContext,options);
for (const target of ['qx','surge']) {
  assert.match(broken[target],/REVIEW REQUIRED.*missing URL group fixture/);
  assert.doesNotMatch(broken[target],/^[^#\n]*(?:jsonjq-response-body|http-response-jq)/m);
}
const realChecks: any[] = [];
for (const name of ['Tieba','Taqu','XiaobaiPrint','Zhihu']) {
  const original = await fs.readFile(`Resource/Loon/${name}_remove_ads.lpx`,'utf8');
  const out = convertPlugin({...entry,id:name},original,options);
  for (const target of ['qx','surge']) {
    const jqRows = out[target].split('\n').filter((line: string) => target === 'qx' ? !line.startsWith('#') && line.includes('url jsonjq-response-body ') : line.startsWith('http-response-jq '));
    const keys = jqRows.map((line: string) => line.slice(0,line.indexOf(" '")));
    assert.equal(new Set(keys).size,keys.length,`${name}/${target}: duplicate active JQ URL`);
    if(name==='Tieba') {
      const sync = jqRows.filter((line: string) => line.includes('c\\/s\\/sync'));
      assert.equal(sync.length,1,`${target}: Tieba sync must be one rule`);
      const program = sync[0].slice(sync[0].indexOf(" '")+2,-1);
      const result = spawnSync('jq',['-c',program],{input:JSON.stringify({activity_switch:1,wl_config:{keep:1},index_tab_info:[{tab_name:'推荐'},{tab_name:'广告'}],top_level_navi:{推荐:1,侧边栏:2,关注:3,广告:4}}),encoding:'utf8'});
      assert.equal(result.status,0,result.stderr);
      const body = JSON.parse(result.stdout);
      assert.equal(body.activity_switch,undefined);
      assert.equal(body.wl_config.home_ad_num,0);
      assert.equal(body.wl_config.index_bear_first_floor_max,999999999);
      assert.equal(body.wl_config.keep,1);
      assert.deepEqual(body.index_tab_info,[{tab_name:'推荐'}]);
      assert.deepEqual(body.top_level_navi,{推荐:1,侧边栏:2,关注:3});
    }
    realChecks.push({name,target,jqRules:jqRows.length,duplicateUrls:keys.length-new Set(keys).size});
  }
}
console.log(JSON.stringify(realChecks));
console.log('Source URL groups: real Tieba/Taqu/XiaobaiPrint/Zhihu outputs, original dependency indices, comments, phases and reusable contexts passed');
