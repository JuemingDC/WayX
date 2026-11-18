// Modified: 2026-11-18 (chance). Converted HTTP scripts recover from escaped
// synchronous errors or returned Promise rejections without retrying submission.
export const scriptErrorBoundary = String.raw`function(nativeDone,run){
  let attempted=false,nativeFailed=false,nativeError;
  const done=value=>{
    if(attempted)return;
    attempted=true;
    try{return nativeDone(value);}catch(error){nativeFailed=true;nativeError=error;throw error;}
  };
  const recover=error=>{
    if(nativeFailed&&error===nativeError)throw error;
    try{if(typeof console!=='undefined'&&typeof console.log==='function')console.log('[WayX] HTTP script failed; '+(attempted?'completion already submitted':'passing through unchanged'),error);}catch{}
    if(!attempted)return done({});
  };
  try{
    const result=run(done);
    return result&&typeof result.then==='function'?Promise.resolve(result).catch(recover):result;
  }catch(error){return recover(error);}
}`;
