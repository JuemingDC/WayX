// Modified: 2026-11-03 (chance). Exercise backup, shared API binding, conditional publication and repeat refresh as one transaction.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {convertNativeQxToSurge} from '../src/emit/conversion.ts';
import {refreshSourceBackups} from '../src/application/backups.ts';
import {validateSourceBackups} from '../src/validation/backups.ts';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'wayx-header-'));
try {
 const qx='# Managed by: WayX Native QX\n# [rewrite_local]\n^https://one\\.test/ leisu* url-and-header reject-dict\n^https://two\\.test/ (?i)\\r\\nUser-Agent:\\s*QQSportsV3\\/ url-and-header script-response-body https://author.test/code.js\n# [mitm]\nhostname = one.test,two.test\n';
 const qxPath='Adblock/Quantumult X/fixture.snippet',sgPath='Adblock/Surge/fixture.sgmodule';
 for(const [file,text] of [[qxPath,qx],[sgPath,convertNativeQxToSurge(qx).surge]]){await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),text);}
 const resources={cachedBytes:async()=>null,fetchBytes:async()=>Buffer.from('// author license\n$done({body:"changed"});')};
 const report=await refreshSourceBackups(root,{resources,log:()=>{}});
 assert.equal(report.headerRewrites.filter((r:any)=>r.status==='converted').length,2);
 const output=await fs.readFile(path.join(root,sgPath),'utf8');
 assert.doesNotMatch(output,/REVIEW REQUIRED/);assert.match(output,/wayx_qx_header_v1=/);assert.match(output,/Script\/Generated\/header_/);
 assert.deepEqual(await validateSourceBackups(root),[]);
 await refreshSourceBackups(root,{resources,log:()=>{}});
 assert.equal(await fs.readFile(path.join(root,sgPath),'utf8'),output);
 assert.deepEqual(await validateSourceBackups(root),[]);
 console.log('QX header backup integration: fresh shared adapter, helper liveness, source archives and repeat publication passed');
}finally{await fs.rm(root,{recursive:true,force:true});}
