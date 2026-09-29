// Scan original Source Script URLs referenced by catalog-managed Loon plugins.
// Author: chance
// Category: Converter / Script Compatibility / Report
import fs from 'node:fs/promises';
import path from 'node:path';
import { inspectQxScriptCompatibility } from '../src/script-compat.mjs';
import { loadLoonSourceCatalog } from '../src/source-catalog.mjs';
import { fetchOriginalText } from '../src/source-fetch.mjs';
import { scriptUrls } from '../../.github/scripts/sync-convert.mjs';

const ROOT=process.cwd();
const CATALOG=path.join(ROOT,'.github','sources','loon.json');
const RESOURCE_ROOT=path.join(ROOT,'Resource','Loon');
const REPORT=path.join(ROOT,'monitor','.runtime','reports','script-compat.json');

const catalog=await loadLoonSourceCatalog(CATALOG);
const items=[];

for (const entry of catalog) {
  const source=await fs.readFile(path.join(RESOURCE_ROOT,entry.file),'utf8');
  for (const scriptUrl of scriptUrls(source)) {
    try {
      const sourceText=await fetchOriginalText(scriptUrl);
      const result=inspectQxScriptCompatibility({scriptUrl,sourceText});
      items.push({
        pluginId:entry.id,
        scriptUrl,
        status:result.status,
        executable:result.executable,
        reason:result.reason,
        signals:result.signals,
      });
    } catch (error) {
      items.push({
        pluginId:entry.id,
        scriptUrl,
        status:'review',
        executable:false,
        reason:'Original Source Script fetch failed: '+String(error?.message || error),
        signals:{sourceAvailable:false},
      });
    }
  }
}

const summary={};
for(const item of items) summary[item.status]=(summary[item.status]||0)+1;
await fs.mkdir(path.dirname(REPORT),{recursive:true});
await fs.writeFile(REPORT,JSON.stringify({version:2,sourcePolicy:'original-only',summary,items},null,2)+'\n');

console.log('WayX original-script compatibility scan:',JSON.stringify(summary));
for(const item of items.filter(x=>!x.executable)) {
  console.log(`REVIEW ${item.pluginId} ${item.scriptUrl}: ${item.reason}`);
}
