import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildReadmePlan,readmePlanDiff,writeReadmePlan} from '../src/readme-index.mjs';

const ROOT=process.cwd();
const mode=process.argv.includes('--write') ? 'write' : 'check';
const plan=await buildReadmePlan(ROOT);
const diff=await readmePlanDiff(ROOT,plan);
if(mode==='write'){
  if(diff.length) await writeReadmePlan(ROOT,plan);
  console.log(`README index write complete; changed=${diff.length}${diff.length ? ' ['+diff.join(', ')+']' : ''}`);
}else if(diff.length){
  console.error('README index is stale:\n'+diff.join('\n'));
  process.exitCode=1;
}else{
  console.log('README/install index is current');
}

const __isMain=process.argv[1] && path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
void __isMain;
