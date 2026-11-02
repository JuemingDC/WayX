// Modified: 2026-11-02 (chance). Reuse Pako for synchronous Loon gzip APIs;
// retain native Loon methods and exact typed-array input views.
export const scriptCompression = String.raw`function(host,config){
  // Modified: 2026-11-02 (chance). A complete native Loon object retains its
  // own identity, method receivers, descriptors and original parameter errors.
  if(config.from===config.to&&host.utils&&typeof host.utils.gzip==='function'&&typeof host.utils.ungzip==='function')return host.utils;
  let provider;
  const proto=Object.getPrototypeOf(Uint8Array.prototype);
  const get=name=>Object.getOwnPropertyDescriptor(proto,name).get;
  const tag=Object.getOwnPropertyDescriptor(proto,Symbol.toStringTag).get;
  const byteView=value=>{
    if(tag.call(value)!=='Uint8Array')throw new TypeError('Loon gzip APIs require Uint8Array');
    return new Uint8Array(get('buffer').call(value),get('byteOffset').call(value),get('byteLength').call(value));
  };
  const run=(method,value)=>{
    const input=byteView(value);
    if(config.from===config.to&&host.utils&&typeof host.utils[method]==='function')return host.utils[method](input);
    try{
      if(!provider)provider=host.compression();
      if(method==='gzip')return provider.gzip(input);
      // Modified: 2026-11-02 (chance). Require gzip and stream completion;
      // Pako's convenience ungzip also accepts zlib and may return undefined
      // for a truncated stream. Leave member/CRC/trailer parsing to Pako.
      const inflater=new provider.Inflate({windowBits:31});
      inflater.push(input,true);
      if(inflater.err||!inflater.ended||!inflater.result)throw new Error(inflater.msg||'incomplete gzip stream');
      return inflater.result;
    }catch(cause){
      const error=new Error(method==='gzip'?'gzip compression failed':'invalid gzip data');
      error.code=method==='gzip'?'COMPRESSION_FAILED':'DECOMPRESSION_FAILED';error.cause=cause;throw error;
    }
  };
  return Object.assign({},config.from===config.to?host.utils:undefined,{gzip:value=>run('gzip',value),ungzip:value=>run('ungzip',value)});
}`;
