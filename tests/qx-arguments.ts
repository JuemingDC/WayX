// Modified: 2026-11-17 (chance). Verify official QX fragment argument transport.
import assert from "node:assert/strict";
import vm from "node:vm";
import { qxScriptArgumentUrl, planQxScript, parseScriptDeclaration, buildSurgeArgumentTable } from "../src/parser/script.ts";
import { planScriptApiConversion } from "../src/parser/script-api.ts";
import { applyScriptBindings } from "../src/parser/backup-references.ts";
const url = "https://example.test/a.js?rev=1#keep=%25";
const table = buildSurgeArgumentTable(['name=input,"CN"','count=input,2,type=number','flag=switch,false']);
function decode(value: string) {
  const part = new URL(value).hash.slice(1).split("&").find(p=>p.startsWith("_wayx_argument="))!;
  return JSON.parse(decodeURIComponent(part.slice("_wayx_argument=".length))).value;
}
const expected = {name:"CN",count:2,flag:false};
const object = "{$"+"{name},$"+"{count},$"+"{flag}}";
for (const trigger of ['request if $'+'{url} ~= /api/','response if $'+'{url} ~= /api/','cron "0 8 * * *"','network-changed','generic']) {
  const plan = planQxScript(parseScriptDeclaration(trigger+' then script("'+url+'",'+object+')'),{argumentTable:table});
  assert.equal(plan.ok,true);
  const operand = plan.line.split(/\s/).find((s: string)=>s.startsWith("https://"))!.replace(/,$/,"");
  assert.deepEqual(decode(operand),expected);
  assert.ok(operand.startsWith(url+"&_wayx_argument="));
}
for (const value of ["", "a=1&b=2 # 中文 %25", '{"still":"a string"}', expected]) {
  const operand = typeof value === "string"
    ? qxScriptArgumentUrl(url,{type:"raw-string",value},table,[])
    : qxScriptArgumentUrl(url,{type:"plugin-object",items:[{name:"name"},{name:"count"},{name:"flag"}]},table,[]);
  assert.deepEqual(decode(operand),value);
  const payload = JSON.stringify({value});
  for (const phase of ["request","response","task"] as const) {
    const plan = planScriptApiConversion("$done({body:JSON.stringify($argument)});",{from:"loon",to:"qx",phase,responseBody:true,name:"args"});
    assert.equal(plan.status,"adapted");
    for (const env of [{variables:{_wayx_argument:payload}},{variables:{_wayx_argument:encodeURIComponent(payload)}},{sourcePath:operand}]) {
      let output: any;
      // Modified: 2026-11-17 (chance). Supply the actual host response presence for response-phase binding.
      vm.runInNewContext(plan.code!,{$response:phase==="response"?{headers:{},body:""}:undefined,$environment:env,$done:(v: any)=>{output=v;},$task:{fetch(){}},console,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,URL,URLSearchParams});
      assert.deepEqual(JSON.parse(output.body),value);
    }
  }
  const line = "^api url script-response-body "+operand;
  const rebound = applyScriptBindings(line,{[operand]:{path:"Script/a.js"}},"https://raw.example");
  assert.ok(rebound.endsWith(new URL(operand).hash));
}
assert.equal(qxScriptArgumentUrl(url,{type:"plugin-object",items:[{name:"missing"}]},table,[]),url);
assert.equal(qxScriptArgumentUrl("a.js",{type:"string",value:"x"},table,[]),"a.js");
const collision=url+"&_wayx_argument=existing";
assert.equal(qxScriptArgumentUrl(collision,{type:"string",value:"x"},table,[]),collision);
const legacy=planQxScript(parseScriptDeclaration('http-response api script-path='+url+',argument={"mode":"x"}'));
assert.equal(decode(legacy.line.split(" ").at(-1)!), '{"mode":"x"}');
console.log("QX arguments: phases, typed defaults, empty/Unicode/reserved strings, variables, sourcePath and backup fragments passed");
