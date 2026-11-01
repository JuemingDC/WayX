// Modified: 2026-11-01 (chance). Exercise byte preservation, URI identity, declaration-only rebinding, missing-source retention and integrity failures.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {refreshSourceBackups,backupObject} from "../src/application/backups.ts";
import {validateSourceBackups} from "../src/validation/backups.ts";
import {scriptReferences,replaceScriptReferences,sourceScriptUrls} from "../src/parser/backup-references.ts";
import {createResourceSnapshot} from "../src/ingest/resources.ts";
const root=await fs.mkdtemp(path.join(os.tmpdir(),"wayx-backups-"));
try {
 const url="https://author.test/code.js?variant=1",bytes=Buffer.from("\ufeff// 作者\r\n$done({});\r\n");
 const source=Buffer.from('#!name=Raw\r\n[Script]\r\nhttp-response ^https://example\\.test/ script-path='+url+'#arg=x,requires-body=true\r\n');
 const entry={id:"Raw",file:"raw.lpx",source:"https://author.test/raw.lpx"};
 const target='# Original '+url+'\n^https://example\\.test/ url script-response-body '+url+'#arg=x\n^https://example\\.test/ url 302 '+url+'\n';
 await fs.mkdir(path.join(root,"Adblock/Quantumult X"),{recursive:true});
 await fs.writeFile(path.join(root,"Adblock/Quantumult X/raw.snippet"),target);
 let count=0;
 const resources=createResourceSnapshot({directory:path.join(root,"snapshot"),fetchBytes:async(u:string)=>{if(u===entry.source)return source;assert.equal(u,url);count++;return bytes;}});
 await resources.fetchBytes(entry.source);await resources.fetchText(url+'#arg=x');
 const report=await refreshSourceBackups(root,{resources,catalog:[entry],log:()=>{}});
 assert.equal(report.backedUpScripts,1);assert.equal(count,1,"same byte snapshot across fragment variants");
 const record=backupObject(url,bytes,"script");
 assert.deepEqual(await fs.readFile(path.join(root,record.path)),bytes);
 const saved=await fs.readFile(path.join(root,"Adblock/Quantumult X/raw.snippet"),"utf8");
 assert.ok(saved.includes(record.path+'#arg=x'));assert.ok(saved.includes('# Original '+url));assert.ok(saved.includes('url 302 '+url));
 assert.equal((await validateSourceBackups(root)).length,0);
 await resources.seal();
 // A second acquisition changes only the stored bytes/index; the public script address stays fixed.
 const updatedBytes=Buffer.from("// updated\r\n$done({});\r\n");
 await refreshSourceBackups(root,{resources:{cachedBytes:async()=>null,fetchBytes:async(u:string)=>{assert.equal(u,url);return updatedBytes;}},log:()=>{}});
 assert.deepEqual(await fs.readFile(path.join(root,record.path)),updatedBytes);
 assert.equal(await fs.readFile(path.join(root,"Adblock/Quantumult X/raw.snippet"),"utf8"),saved);
 const updatedIndex=JSON.parse(await fs.readFile(path.join(root,"Resource/Backup/index.json"),"utf8"));
 assert.notEqual(updatedIndex.objects[record.path].sha256,record.sha256);
 assert.equal((await validateSourceBackups(root)).length,0);
 const offline={fetchBytes:async()=>{throw Error("404");},cachedBytes:async()=>null};
 const retry=await refreshSourceBackups(root,{resources:offline,log:()=>{}});assert.equal(retry.backedUpScripts,1);assert.equal(retry.failures.length,1);assert.equal(await fs.readFile(path.join(root,"Adblock/Quantumult X/raw.snippet"),"utf8"),saved);
 assert.equal(backupObject(url,Buffer.from('new'),"script").path,record.path);
 assert.notEqual(backupObject(url+'2',bytes,"script").path,record.path);
 await fs.writeFile(path.join(root,record.path),'corrupt');assert.ok((await validateSourceBackups(root)).some(f=>f.code==='backup-integrity'));
 await assert.rejects(refreshSourceBackups(root,{resources:offline,log:()=>{}}),/checksum/);
 assert.equal(scriptReferences('# '+url+'\n; script-path='+url+'\n').length,0);
 const surge='s = type=cron,cronexp="0 8 * * *",script-path="'+url+'",argument="'+url+'"';
 assert.equal(replaceScriptReferences(surge,()=>"https://wayx.test/raw.js"),'s = type=cron,cronexp="0 8 * * *",script-path="https://wayx.test/raw.js",argument="'+url+'"');
 assert.equal(scriptReferences('* * * * * '+url+', tag=Task').length,1);
 assert.deepEqual(sourceScriptUrls('[Script]\nresponse if ${url} ~= /x/ then script("./a.js")\n','https://author.test/plugins/test.lpx'),['https://author.test/plugins/a.js']);
 console.log('Source backup integration: exact BOM/CRLF bytes, shared snapshot, query/fragment identity, stable in-place updates, fallback, integrity and declaration-only references passed');
} finally {await fs.rm(root,{recursive:true,force:true});}
