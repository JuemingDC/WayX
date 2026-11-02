// Modified: 2026-11-02 (chance). Loon's synchronous AES contract delegates
// cryptography to pinned noble-ciphers; only types, modes and result shapes map.
export const scriptCrypto = String.raw`function(host,config){
  if(config.to==='loon'&&host.crypto&&host.crypto.aes&&typeof host.crypto.aes.encrypt==='function'&&typeof host.crypto.aes.decrypt==='function')return host.crypto;
  let provider;
  const proto=Object.getPrototypeOf(Uint8Array.prototype),get=name=>Object.getOwnPropertyDescriptor(proto,name).get,tag=Object.getOwnPropertyDescriptor(proto,Symbol.toStringTag).get;
  const view=(value,name)=>{if(tag.call(value)!=='Uint8Array')throw new TypeError(name+' requires Uint8Array');return new Uint8Array(get('buffer').call(value),get('byteOffset').call(value),get('byteLength').call(value));};
  const invalid=message=>{throw new TypeError('Loon AES: '+message);};
  const run=(method,value,options)=>{
    const data=view(value,'data');if(!options||typeof options!=='object')invalid('options required');
    const rawMode=options.mode;if(typeof rawMode!=='string')invalid('mode must be String');const mode=rawMode.toLowerCase();
    if(!['ecb','cbc','ctr','gcm'].includes(mode))invalid('unknown mode');
    const key=view(options.key,'key');if(![16,24,32].includes(key.length))invalid('key length must be 16, 24 or 32');
    const rawIV=options.iv;let iv;if(mode==='ecb'){if(rawIV!==undefined)invalid('ECB forbids IV');}else{iv=view(rawIV,'iv');if(iv.length!==(mode==='gcm'?12:16))invalid('invalid IV length');}
    const rawPadding=options.padding;let disablePadding=false;
    if(mode==='ecb'||mode==='cbc'){if(rawPadding!==undefined&&typeof rawPadding!=='string')invalid('padding must be String');const padding=rawPadding===undefined?'pkcs7':rawPadding.toLowerCase();if(!['pkcs7','none'].includes(padding))invalid('unknown padding');disablePadding=padding==='none';if(disablePadding&&data.length%16)invalid('unpadded data must be block aligned');}
    else if(rawPadding!==undefined)invalid('mode does not use padding');
    const rawAAD=options.aad,rawTag=options.tag;let aad,tagBytes;
    if(mode==='gcm'){if(rawAAD!==undefined)aad=view(rawAAD,'aad');if(method==='decrypt'){tagBytes=view(rawTag,'tag');if(tagBytes.length!==16)invalid('GCM tag length must be 16');}else if(rawTag!==undefined)invalid('encrypt does not accept tag');}
    else if(rawAAD!==undefined||rawTag!==undefined)invalid('mode does not use AAD/tag');
    try{
      if(!provider)provider=host.aes();
      const cipher=mode==='ecb'?provider.ecb(key,{disablePadding}):mode==='cbc'?provider.cbc(key,iv,{disablePadding}):mode==='ctr'?provider.ctr(key,iv):provider.gcm(key,iv,aad);
      let input=data;if(tagBytes){input=new Uint8Array(data.length+16);input.set(data);input.set(tagBytes,data.length);}
      const result=cipher[method](input);
      if(method==='decrypt')return result;
      if(mode==='gcm')return {ciphertext:result.slice(0,-16),tag:result.slice(-16)};
      return {ciphertext:result};
    }catch(cause){const error=new Error('AES '+method+' failed');error.code=method==='encrypt'?'ENCRYPTION_FAILED':'DECRYPTION_FAILED';error.cause=cause;throw error;}
  };
  return {aes:{encrypt:(data,options)=>run('encrypt',data,options),decrypt:(data,options)=>run('decrypt',data,options)}};
}`;
