// Modified: 2026-10-29 (chance). Freeze Kelee acquisition/conversion without
// removing catalog entries or touching their checked-in artifacts.
import fs from 'node:fs/promises';
import path from 'node:path';
export async function keleePaused(root) {
  try{return JSON.parse(await fs.readFile(path.join(root,'.github/sources/kelee-pause.json'),'utf8')).paused===true;}
  catch(error){if(error.code==='ENOENT')return false;throw error;}
}
export function isKeleeSource(source) {
  const host=new URL(source).hostname;
  return host==='kelee.one'||host.endsWith('.kelee.one');
}
