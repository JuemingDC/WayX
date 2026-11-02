/* Adapter: GPL-3.0-only; derived from ScriptHub b943361f11be5795b3eb10f9cc4e5497642922fc. See vendor/script-hub/NOTICE.md. */
(function(){
const __wayxTarget=typeof $loon==='string'?'loon':typeof $task!=='undefined'&&typeof $task.fetch==='function'?'qx':typeof $environment!=='undefined'&&$environment['surge-version']?'surge':null;
const __wayxHost={global:globalThis,request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,task:typeof $task==='undefined'?undefined:$task,http:typeof $httpClient==='undefined'?undefined:$httpClient,prefs:typeof $prefs==='undefined'?undefined:$prefs,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,notifyQx:typeof $notify==='undefined'?undefined:$notify,notify:typeof $notification==='undefined'?undefined:$notification,script:typeof $script==='undefined'?undefined:$script,argument:typeof $argument==='undefined'?undefined:$argument,environment:typeof $environment==='undefined'?undefined:$environment,loon:typeof $loon==='undefined'?undefined:$loon,setTimeout:typeof setTimeout==='undefined'?undefined:setTimeout,codecs:(function(){
  const text=value=>{if(typeof value==='symbol')throw new TypeError('Cannot convert a Symbol to a string');return String(value);};
  const dictionary=value=>{if(value===undefined||value===null)return {};if(typeof value!=='object'&&typeof value!=='function')throw new TypeError('Options must be an object');return value;};
  const arrayBufferLength=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'byteLength').get;
  const typedPrototype=Object.getPrototypeOf(Uint8Array.prototype),typedGet=name=>Object.getOwnPropertyDescriptor(typedPrototype,name).get,dataGet=name=>Object.getOwnPropertyDescriptor(DataView.prototype,name).get;
  const typedName=Object.getOwnPropertyDescriptor(typedPrototype,Symbol.toStringTag).get,typedLength=typedGet('length'),typedBuffer=typedGet('buffer'),typedOffset=typedGet('byteOffset'),typedBytes=typedGet('byteLength'),dataBuffer=dataGet('buffer'),dataOffset=dataGet('byteOffset'),dataBytes=dataGet('byteLength'),setBytes=Uint8Array.prototype.set;
  const inputBytes=value=>{
    if(value===undefined)return new Uint8Array(0);
    let length;try{length=arrayBufferLength.call(value);}catch{}
    if(length!==undefined)return new Uint8Array(value,0,length);
    if(ArrayBuffer.isView(value)){
      const typed=typedName.call(value)!==undefined,buffer=(typed?typedBuffer:dataBuffer).call(value),offset=(typed?typedOffset:dataOffset).call(value),size=(typed?typedBytes:dataBytes).call(value);
      arrayBufferLength.call(buffer);return new Uint8Array(buffer,offset,size);
    }
    throw new TypeError('Expected an ArrayBuffer or view');
  };
  const scalar=(s,index)=>{let cp=s.charCodeAt(index),read=1;if(cp>=0xd800&&cp<=0xdbff){const low=s.charCodeAt(index+1);if(low>=0xdc00&&low<=0xdfff){cp=0x10000+((cp-0xd800)<<10)+(low-0xdc00);read=2;}else cp=0xfffd;}else if(cp>=0xdc00&&cp<=0xdfff)cp=0xfffd;return {cp,read};};
  const sequence=cp=>cp<=0x7f?[cp]:cp<=0x7ff?[0xc0|(cp>>6),0x80|(cp&63)]:cp<=0xffff?[0xe0|(cp>>12),0x80|((cp>>6)&63),0x80|(cp&63)]:[0xf0|(cp>>18),0x80|((cp>>12)&63),0x80|((cp>>6)&63),0x80|(cp&63)];
  const encoderInstances=new WeakSet();
  const encoderBrand=value=>{if(!encoderInstances.has(value))throw new TypeError('Illegal TextEncoder receiver');};
  class TextEncoder{
    constructor(){encoderInstances.add(this);}
    get encoding(){encoderBrand(this);return 'utf-8';}
    encode(input=undefined){encoderBrand(this);const s=input===undefined?'':text(input),out=[];for(let i=0;i<s.length;){const point=scalar(s,i);out.push(...sequence(point.cp));i+=point.read;}return new Uint8Array(out);}
    encodeInto(input,destination){encoderBrand(this);if(arguments.length<2)throw new TypeError('Two arguments required');const s=text(input);if(typedName.call(destination)!=='Uint8Array')throw new TypeError('Uint8Array destination required');const capacity=typedLength.call(destination);let read=0,written=0;while(read<s.length){const point=scalar(s,read),bytes=sequence(point.cp);if(written+bytes.length>capacity)break;setBytes.call(destination,bytes,written);written+=bytes.length;read+=point.read;}return {read,written};}
  }
  const decoders=new WeakMap(),decoderState=value=>{const state=decoders.get(value);if(!state)throw new TypeError('Illegal TextDecoder receiver');return state;};
  const reset=state=>{state.point=0;state.seen=0;state.need=0;state.lower=0x80;state.upper=0xbf;};
  class TextDecoder{
    constructor(label='utf-8',options=undefined){
      const encoding=text(label).replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g,'').toLowerCase(),opts=dictionary(options),fatal=!!opts.fatal,ignoreBOM=!!opts.ignoreBOM;
      if(!['utf-8','utf8','unicode-1-1-utf-8','unicode11utf8','unicode20utf8','x-unicode20utf8'].includes(encoding))throw new RangeError('Only UTF-8 labels are supported');
      const state={fatal,ignoreBOM,stream:false,bom:false};reset(state);decoders.set(this,state);
    }
    get encoding(){decoderState(this);return 'utf-8';}
    get fatal(){return decoderState(this).fatal;}
    get ignoreBOM(){return decoderState(this).ignoreBOM;}
    decode(input=undefined,options=undefined){
      const state=decoderState(this),bytes=inputBytes(input),opts=dictionary(options),stream=!!opts.stream,out=[];
      if(!state.stream){reset(state);state.bom=false;}state.stream=stream;
      const emit=cp=>{if(!state.bom){state.bom=true;if(cp===0xfeff&&!state.ignoreBOM)return;}out.push(cp<=0xffff?String.fromCharCode(cp):String.fromCharCode(0xd800+((cp-0x10000)>>10),0xdc00+((cp-0x10000)&1023)));};
      const error=()=>{reset(state);if(state.fatal)throw new TypeError('Invalid UTF-8 data');emit(0xfffd);};
      for(let i=0;i<bytes.length;i++){
        const b=bytes[i];
        if(!state.need){
          if(b<=0x7f){emit(b);continue;}
          if(b>=0xc2&&b<=0xdf){state.need=1;state.point=b&31;continue;}
          if(b>=0xe0&&b<=0xef){state.need=2;state.point=b&15;if(b===0xe0)state.lower=0xa0;if(b===0xed)state.upper=0x9f;continue;}
          if(b>=0xf0&&b<=0xf4){state.need=3;state.point=b&7;if(b===0xf0)state.lower=0x90;if(b===0xf4)state.upper=0x8f;continue;}
          error();continue;
        }
        if(b<state.lower||b>state.upper){error();i--;continue;}
        state.lower=0x80;state.upper=0xbf;state.point=(state.point<<6)|(b&63);state.seen++;
        if(state.seen===state.need){const cp=state.point;reset(state);emit(cp);}
      }
      if(!stream&&state.need)error();return out.join('');
    }
  }
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  class PortableInvalidCharacterError extends Error{get name(){return 'InvalidCharacterError';}get code(){return 5;}get [Symbol.toStringTag](){return 'DOMException';}}
  const invalid=()=>{throw typeof DOMException==='function'?new DOMException('Invalid Base64 character','InvalidCharacterError'):new PortableInvalidCharacterError('Invalid Base64 character');};
  function atob(value){if(!arguments.length)throw new TypeError('One argument required');let s=text(value).replace(/[\t\n\f\r ]/g,'');if(s.length%4===0)s=s.replace(/==?$/,'');if(s.length%4===1||/[^A-Za-z0-9+/]/.test(s))invalid();let bits=0,buffer=0,out='';for(let i=0;i<s.length;i++){buffer=(buffer<<6)|alphabet.indexOf(s[i]);bits+=6;if(bits>=8){bits-=8;out+=String.fromCharCode((buffer>>bits)&255);}}return out;}
  function btoa(value){if(!arguments.length)throw new TypeError('One argument required');const s=text(value);let out='';for(let i=0;i<s.length;i+=3){const a=s.charCodeAt(i),b=s.charCodeAt(i+1),c=s.charCodeAt(i+2);if(a>255||b>255||c>255)invalid();const word=(a<<16)|((b||0)<<8)|(c||0);out+=alphabet[(word>>>18)&63]+alphabet[(word>>>12)&63]+(i+1<s.length?alphabet[(word>>>6)&63]:'=')+(i+2<s.length?alphabet[word&63]:'=');}return out;}
  return {TextEncoder,TextDecoder,atob,btoa};
})(),utils:typeof $utils==='undefined'?undefined:$utils,crypto:typeof $crypto==='undefined'?undefined:$crypto,dns:typeof $dns==='undefined'?undefined:$dns,compression:(function(){/*
(The MIT License)

Copyright (C) 2014-2017 by Vitaly Puzrin and Andrei Tuputcyn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
(C) 1995-2013 Jean-loup Gailly and Mark Adler
(C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin

This software is provided 'as-is', without any express or implied
warranty. In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

1. The origin of this software must not be misrepresented; you must not
  claim that you wrote the original software. If you use this software
  in a product, an acknowledgment in the product documentation would be
  appreciated but is not required.
2. Altered source versions must be plainly marked as such, and must not be
  misrepresented as being the original software.
3. This notice may not be removed or altered from any source distribution.
*/
const module={exports:{}};const exports=module.exports;/*! pako 2.1.0 https://github.com/nodeca/pako @license (MIT AND Zlib) */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((t="undefined"!=typeof globalThis?globalThis:t||self).pako={})}(this,(function(t){"use strict";function e(t){let e=t.length;for(;--e>=0;)t[e]=0}const a=256,i=286,n=30,s=15,r=new Uint8Array([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]),o=new Uint8Array([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]),l=new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7]),h=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),d=new Array(576);e(d);const _=new Array(60);e(_);const f=new Array(512);e(f);const c=new Array(256);e(c);const u=new Array(29);e(u);const w=new Array(n);function m(t,e,a,i,n){this.static_tree=t,this.extra_bits=e,this.extra_base=a,this.elems=i,this.max_length=n,this.has_stree=t&&t.length}let b,g,p;function k(t,e){this.dyn_tree=t,this.max_code=0,this.stat_desc=e}e(w);const v=t=>t<256?f[t]:f[256+(t>>>7)],y=(t,e)=>{t.pending_buf[t.pending++]=255&e,t.pending_buf[t.pending++]=e>>>8&255},x=(t,e,a)=>{t.bi_valid>16-a?(t.bi_buf|=e<<t.bi_valid&65535,y(t,t.bi_buf),t.bi_buf=e>>16-t.bi_valid,t.bi_valid+=a-16):(t.bi_buf|=e<<t.bi_valid&65535,t.bi_valid+=a)},z=(t,e,a)=>{x(t,a[2*e],a[2*e+1])},A=(t,e)=>{let a=0;do{a|=1&t,t>>>=1,a<<=1}while(--e>0);return a>>>1},E=(t,e,a)=>{const i=new Array(16);let n,r,o=0;for(n=1;n<=s;n++)o=o+a[n-1]<<1,i[n]=o;for(r=0;r<=e;r++){let e=t[2*r+1];0!==e&&(t[2*r]=A(i[e]++,e))}},R=t=>{let e;for(e=0;e<i;e++)t.dyn_ltree[2*e]=0;for(e=0;e<n;e++)t.dyn_dtree[2*e]=0;for(e=0;e<19;e++)t.bl_tree[2*e]=0;t.dyn_ltree[512]=1,t.opt_len=t.static_len=0,t.sym_next=t.matches=0},Z=t=>{t.bi_valid>8?y(t,t.bi_buf):t.bi_valid>0&&(t.pending_buf[t.pending++]=t.bi_buf),t.bi_buf=0,t.bi_valid=0},U=(t,e,a,i)=>{const n=2*e,s=2*a;return t[n]<t[s]||t[n]===t[s]&&i[e]<=i[a]},S=(t,e,a)=>{const i=t.heap[a];let n=a<<1;for(;n<=t.heap_len&&(n<t.heap_len&&U(e,t.heap[n+1],t.heap[n],t.depth)&&n++,!U(e,i,t.heap[n],t.depth));)t.heap[a]=t.heap[n],a=n,n<<=1;t.heap[a]=i},D=(t,e,i)=>{let n,s,l,h,d=0;if(0!==t.sym_next)do{n=255&t.pending_buf[t.sym_buf+d++],n+=(255&t.pending_buf[t.sym_buf+d++])<<8,s=t.pending_buf[t.sym_buf+d++],0===n?z(t,s,e):(l=c[s],z(t,l+a+1,e),h=r[l],0!==h&&(s-=u[l],x(t,s,h)),n--,l=v(n),z(t,l,i),h=o[l],0!==h&&(n-=w[l],x(t,n,h)))}while(d<t.sym_next);z(t,256,e)},T=(t,e)=>{const a=e.dyn_tree,i=e.stat_desc.static_tree,n=e.stat_desc.has_stree,r=e.stat_desc.elems;let o,l,h,d=-1;for(t.heap_len=0,t.heap_max=573,o=0;o<r;o++)0!==a[2*o]?(t.heap[++t.heap_len]=d=o,t.depth[o]=0):a[2*o+1]=0;for(;t.heap_len<2;)h=t.heap[++t.heap_len]=d<2?++d:0,a[2*h]=1,t.depth[h]=0,t.opt_len--,n&&(t.static_len-=i[2*h+1]);for(e.max_code=d,o=t.heap_len>>1;o>=1;o--)S(t,a,o);h=r;do{o=t.heap[1],t.heap[1]=t.heap[t.heap_len--],S(t,a,1),l=t.heap[1],t.heap[--t.heap_max]=o,t.heap[--t.heap_max]=l,a[2*h]=a[2*o]+a[2*l],t.depth[h]=(t.depth[o]>=t.depth[l]?t.depth[o]:t.depth[l])+1,a[2*o+1]=a[2*l+1]=h,t.heap[1]=h++,S(t,a,1)}while(t.heap_len>=2);t.heap[--t.heap_max]=t.heap[1],((t,e)=>{const a=e.dyn_tree,i=e.max_code,n=e.stat_desc.static_tree,r=e.stat_desc.has_stree,o=e.stat_desc.extra_bits,l=e.stat_desc.extra_base,h=e.stat_desc.max_length;let d,_,f,c,u,w,m=0;for(c=0;c<=s;c++)t.bl_count[c]=0;for(a[2*t.heap[t.heap_max]+1]=0,d=t.heap_max+1;d<573;d++)_=t.heap[d],c=a[2*a[2*_+1]+1]+1,c>h&&(c=h,m++),a[2*_+1]=c,_>i||(t.bl_count[c]++,u=0,_>=l&&(u=o[_-l]),w=a[2*_],t.opt_len+=w*(c+u),r&&(t.static_len+=w*(n[2*_+1]+u)));if(0!==m){do{for(c=h-1;0===t.bl_count[c];)c--;t.bl_count[c]--,t.bl_count[c+1]+=2,t.bl_count[h]--,m-=2}while(m>0);for(c=h;0!==c;c--)for(_=t.bl_count[c];0!==_;)f=t.heap[--d],f>i||(a[2*f+1]!==c&&(t.opt_len+=(c-a[2*f+1])*a[2*f],a[2*f+1]=c),_--)}})(t,e),E(a,d,t.bl_count)},O=(t,e,a)=>{let i,n,s=-1,r=e[1],o=0,l=7,h=4;for(0===r&&(l=138,h=3),e[2*(a+1)+1]=65535,i=0;i<=a;i++)n=r,r=e[2*(i+1)+1],++o<l&&n===r||(o<h?t.bl_tree[2*n]+=o:0!==n?(n!==s&&t.bl_tree[2*n]++,t.bl_tree[32]++):o<=10?t.bl_tree[34]++:t.bl_tree[36]++,o=0,s=n,0===r?(l=138,h=3):n===r?(l=6,h=3):(l=7,h=4))},I=(t,e,a)=>{let i,n,s=-1,r=e[1],o=0,l=7,h=4;for(0===r&&(l=138,h=3),i=0;i<=a;i++)if(n=r,r=e[2*(i+1)+1],!(++o<l&&n===r)){if(o<h)do{z(t,n,t.bl_tree)}while(0!=--o);else 0!==n?(n!==s&&(z(t,n,t.bl_tree),o--),z(t,16,t.bl_tree),x(t,o-3,2)):o<=10?(z(t,17,t.bl_tree),x(t,o-3,3)):(z(t,18,t.bl_tree),x(t,o-11,7));o=0,s=n,0===r?(l=138,h=3):n===r?(l=6,h=3):(l=7,h=4)}};let F=!1;const L=(t,e,a,i)=>{x(t,0+(i?1:0),3),Z(t),y(t,a),y(t,~a),a&&t.pending_buf.set(t.window.subarray(e,e+a),t.pending),t.pending+=a};var N=(t,e,i,n)=>{let s,r,o=0;t.level>0?(2===t.strm.data_type&&(t.strm.data_type=(t=>{let e,i=4093624447;for(e=0;e<=31;e++,i>>>=1)if(1&i&&0!==t.dyn_ltree[2*e])return 0;if(0!==t.dyn_ltree[18]||0!==t.dyn_ltree[20]||0!==t.dyn_ltree[26])return 1;for(e=32;e<a;e++)if(0!==t.dyn_ltree[2*e])return 1;return 0})(t)),T(t,t.l_desc),T(t,t.d_desc),o=(t=>{let e;for(O(t,t.dyn_ltree,t.l_desc.max_code),O(t,t.dyn_dtree,t.d_desc.max_code),T(t,t.bl_desc),e=18;e>=3&&0===t.bl_tree[2*h[e]+1];e--);return t.opt_len+=3*(e+1)+5+5+4,e})(t),s=t.opt_len+3+7>>>3,r=t.static_len+3+7>>>3,r<=s&&(s=r)):s=r=i+5,i+4<=s&&-1!==e?L(t,e,i,n):4===t.strategy||r===s?(x(t,2+(n?1:0),3),D(t,d,_)):(x(t,4+(n?1:0),3),((t,e,a,i)=>{let n;for(x(t,e-257,5),x(t,a-1,5),x(t,i-4,4),n=0;n<i;n++)x(t,t.bl_tree[2*h[n]+1],3);I(t,t.dyn_ltree,e-1),I(t,t.dyn_dtree,a-1)})(t,t.l_desc.max_code+1,t.d_desc.max_code+1,o+1),D(t,t.dyn_ltree,t.dyn_dtree)),R(t),n&&Z(t)},B={_tr_init:t=>{F||((()=>{let t,e,a,h,k;const v=new Array(16);for(a=0,h=0;h<28;h++)for(u[h]=a,t=0;t<1<<r[h];t++)c[a++]=h;for(c[a-1]=h,k=0,h=0;h<16;h++)for(w[h]=k,t=0;t<1<<o[h];t++)f[k++]=h;for(k>>=7;h<n;h++)for(w[h]=k<<7,t=0;t<1<<o[h]-7;t++)f[256+k++]=h;for(e=0;e<=s;e++)v[e]=0;for(t=0;t<=143;)d[2*t+1]=8,t++,v[8]++;for(;t<=255;)d[2*t+1]=9,t++,v[9]++;for(;t<=279;)d[2*t+1]=7,t++,v[7]++;for(;t<=287;)d[2*t+1]=8,t++,v[8]++;for(E(d,287,v),t=0;t<n;t++)_[2*t+1]=5,_[2*t]=A(t,5);b=new m(d,r,257,i,s),g=new m(_,o,0,n,s),p=new m(new Array(0),l,0,19,7)})(),F=!0),t.l_desc=new k(t.dyn_ltree,b),t.d_desc=new k(t.dyn_dtree,g),t.bl_desc=new k(t.bl_tree,p),t.bi_buf=0,t.bi_valid=0,R(t)},_tr_stored_block:L,_tr_flush_block:N,_tr_tally:(t,e,i)=>(t.pending_buf[t.sym_buf+t.sym_next++]=e,t.pending_buf[t.sym_buf+t.sym_next++]=e>>8,t.pending_buf[t.sym_buf+t.sym_next++]=i,0===e?t.dyn_ltree[2*i]++:(t.matches++,e--,t.dyn_ltree[2*(c[i]+a+1)]++,t.dyn_dtree[2*v(e)]++),t.sym_next===t.sym_end),_tr_align:t=>{x(t,2,3),z(t,256,d),(t=>{16===t.bi_valid?(y(t,t.bi_buf),t.bi_buf=0,t.bi_valid=0):t.bi_valid>=8&&(t.pending_buf[t.pending++]=255&t.bi_buf,t.bi_buf>>=8,t.bi_valid-=8)})(t)}};var C=(t,e,a,i)=>{let n=65535&t|0,s=t>>>16&65535|0,r=0;for(;0!==a;){r=a>2e3?2e3:a,a-=r;do{n=n+e[i++]|0,s=s+n|0}while(--r);n%=65521,s%=65521}return n|s<<16|0};const M=new Uint32Array((()=>{let t,e=[];for(var a=0;a<256;a++){t=a;for(var i=0;i<8;i++)t=1&t?3988292384^t>>>1:t>>>1;e[a]=t}return e})());var H=(t,e,a,i)=>{const n=M,s=i+a;t^=-1;for(let a=i;a<s;a++)t=t>>>8^n[255&(t^e[a])];return-1^t},j={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},K={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_MEM_ERROR:-4,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8};const{_tr_init:P,_tr_stored_block:Y,_tr_flush_block:G,_tr_tally:X,_tr_align:W}=B,{Z_NO_FLUSH:q,Z_PARTIAL_FLUSH:J,Z_FULL_FLUSH:Q,Z_FINISH:V,Z_BLOCK:$,Z_OK:tt,Z_STREAM_END:et,Z_STREAM_ERROR:at,Z_DATA_ERROR:it,Z_BUF_ERROR:nt,Z_DEFAULT_COMPRESSION:st,Z_FILTERED:rt,Z_HUFFMAN_ONLY:ot,Z_RLE:lt,Z_FIXED:ht,Z_DEFAULT_STRATEGY:dt,Z_UNKNOWN:_t,Z_DEFLATED:ft}=K,ct=258,ut=262,wt=42,mt=113,bt=666,gt=(t,e)=>(t.msg=j[e],e),pt=t=>2*t-(t>4?9:0),kt=t=>{let e=t.length;for(;--e>=0;)t[e]=0},vt=t=>{let e,a,i,n=t.w_size;e=t.hash_size,i=e;do{a=t.head[--i],t.head[i]=a>=n?a-n:0}while(--e);e=n,i=e;do{a=t.prev[--i],t.prev[i]=a>=n?a-n:0}while(--e)};let yt=(t,e,a)=>(e<<t.hash_shift^a)&t.hash_mask;const xt=t=>{const e=t.state;let a=e.pending;a>t.avail_out&&(a=t.avail_out),0!==a&&(t.output.set(e.pending_buf.subarray(e.pending_out,e.pending_out+a),t.next_out),t.next_out+=a,e.pending_out+=a,t.total_out+=a,t.avail_out-=a,e.pending-=a,0===e.pending&&(e.pending_out=0))},zt=(t,e)=>{G(t,t.block_start>=0?t.block_start:-1,t.strstart-t.block_start,e),t.block_start=t.strstart,xt(t.strm)},At=(t,e)=>{t.pending_buf[t.pending++]=e},Et=(t,e)=>{t.pending_buf[t.pending++]=e>>>8&255,t.pending_buf[t.pending++]=255&e},Rt=(t,e,a,i)=>{let n=t.avail_in;return n>i&&(n=i),0===n?0:(t.avail_in-=n,e.set(t.input.subarray(t.next_in,t.next_in+n),a),1===t.state.wrap?t.adler=C(t.adler,e,n,a):2===t.state.wrap&&(t.adler=H(t.adler,e,n,a)),t.next_in+=n,t.total_in+=n,n)},Zt=(t,e)=>{let a,i,n=t.max_chain_length,s=t.strstart,r=t.prev_length,o=t.nice_match;const l=t.strstart>t.w_size-ut?t.strstart-(t.w_size-ut):0,h=t.window,d=t.w_mask,_=t.prev,f=t.strstart+ct;let c=h[s+r-1],u=h[s+r];t.prev_length>=t.good_match&&(n>>=2),o>t.lookahead&&(o=t.lookahead);do{if(a=e,h[a+r]===u&&h[a+r-1]===c&&h[a]===h[s]&&h[++a]===h[s+1]){s+=2,a++;do{}while(h[++s]===h[++a]&&h[++s]===h[++a]&&h[++s]===h[++a]&&h[++s]===h[++a]&&h[++s]===h[++a]&&h[++s]===h[++a]&&h[++s]===h[++a]&&h[++s]===h[++a]&&s<f);if(i=ct-(f-s),s=f-ct,i>r){if(t.match_start=e,r=i,i>=o)break;c=h[s+r-1],u=h[s+r]}}}while((e=_[e&d])>l&&0!=--n);return r<=t.lookahead?r:t.lookahead},Ut=t=>{const e=t.w_size;let a,i,n;do{if(i=t.window_size-t.lookahead-t.strstart,t.strstart>=e+(e-ut)&&(t.window.set(t.window.subarray(e,e+e-i),0),t.match_start-=e,t.strstart-=e,t.block_start-=e,t.insert>t.strstart&&(t.insert=t.strstart),vt(t),i+=e),0===t.strm.avail_in)break;if(a=Rt(t.strm,t.window,t.strstart+t.lookahead,i),t.lookahead+=a,t.lookahead+t.insert>=3)for(n=t.strstart-t.insert,t.ins_h=t.window[n],t.ins_h=yt(t,t.ins_h,t.window[n+1]);t.insert&&(t.ins_h=yt(t,t.ins_h,t.window[n+3-1]),t.prev[n&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=n,n++,t.insert--,!(t.lookahead+t.insert<3)););}while(t.lookahead<ut&&0!==t.strm.avail_in)},St=(t,e)=>{let a,i,n,s=t.pending_buf_size-5>t.w_size?t.w_size:t.pending_buf_size-5,r=0,o=t.strm.avail_in;do{if(a=65535,n=t.bi_valid+42>>3,t.strm.avail_out<n)break;if(n=t.strm.avail_out-n,i=t.strstart-t.block_start,a>i+t.strm.avail_in&&(a=i+t.strm.avail_in),a>n&&(a=n),a<s&&(0===a&&e!==V||e===q||a!==i+t.strm.avail_in))break;r=e===V&&a===i+t.strm.avail_in?1:0,Y(t,0,0,r),t.pending_buf[t.pending-4]=a,t.pending_buf[t.pending-3]=a>>8,t.pending_buf[t.pending-2]=~a,t.pending_buf[t.pending-1]=~a>>8,xt(t.strm),i&&(i>a&&(i=a),t.strm.output.set(t.window.subarray(t.block_start,t.block_start+i),t.strm.next_out),t.strm.next_out+=i,t.strm.avail_out-=i,t.strm.total_out+=i,t.block_start+=i,a-=i),a&&(Rt(t.strm,t.strm.output,t.strm.next_out,a),t.strm.next_out+=a,t.strm.avail_out-=a,t.strm.total_out+=a)}while(0===r);return o-=t.strm.avail_in,o&&(o>=t.w_size?(t.matches=2,t.window.set(t.strm.input.subarray(t.strm.next_in-t.w_size,t.strm.next_in),0),t.strstart=t.w_size,t.insert=t.strstart):(t.window_size-t.strstart<=o&&(t.strstart-=t.w_size,t.window.set(t.window.subarray(t.w_size,t.w_size+t.strstart),0),t.matches<2&&t.matches++,t.insert>t.strstart&&(t.insert=t.strstart)),t.window.set(t.strm.input.subarray(t.strm.next_in-o,t.strm.next_in),t.strstart),t.strstart+=o,t.insert+=o>t.w_size-t.insert?t.w_size-t.insert:o),t.block_start=t.strstart),t.high_water<t.strstart&&(t.high_water=t.strstart),r?4:e!==q&&e!==V&&0===t.strm.avail_in&&t.strstart===t.block_start?2:(n=t.window_size-t.strstart,t.strm.avail_in>n&&t.block_start>=t.w_size&&(t.block_start-=t.w_size,t.strstart-=t.w_size,t.window.set(t.window.subarray(t.w_size,t.w_size+t.strstart),0),t.matches<2&&t.matches++,n+=t.w_size,t.insert>t.strstart&&(t.insert=t.strstart)),n>t.strm.avail_in&&(n=t.strm.avail_in),n&&(Rt(t.strm,t.window,t.strstart,n),t.strstart+=n,t.insert+=n>t.w_size-t.insert?t.w_size-t.insert:n),t.high_water<t.strstart&&(t.high_water=t.strstart),n=t.bi_valid+42>>3,n=t.pending_buf_size-n>65535?65535:t.pending_buf_size-n,s=n>t.w_size?t.w_size:n,i=t.strstart-t.block_start,(i>=s||(i||e===V)&&e!==q&&0===t.strm.avail_in&&i<=n)&&(a=i>n?n:i,r=e===V&&0===t.strm.avail_in&&a===i?1:0,Y(t,t.block_start,a,r),t.block_start+=a,xt(t.strm)),r?3:1)},Dt=(t,e)=>{let a,i;for(;;){if(t.lookahead<ut){if(Ut(t),t.lookahead<ut&&e===q)return 1;if(0===t.lookahead)break}if(a=0,t.lookahead>=3&&(t.ins_h=yt(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),0!==a&&t.strstart-a<=t.w_size-ut&&(t.match_length=Zt(t,a)),t.match_length>=3)if(i=X(t,t.strstart-t.match_start,t.match_length-3),t.lookahead-=t.match_length,t.match_length<=t.max_lazy_match&&t.lookahead>=3){t.match_length--;do{t.strstart++,t.ins_h=yt(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart}while(0!=--t.match_length);t.strstart++}else t.strstart+=t.match_length,t.match_length=0,t.ins_h=t.window[t.strstart],t.ins_h=yt(t,t.ins_h,t.window[t.strstart+1]);else i=X(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++;if(i&&(zt(t,!1),0===t.strm.avail_out))return 1}return t.insert=t.strstart<2?t.strstart:2,e===V?(zt(t,!0),0===t.strm.avail_out?3:4):t.sym_next&&(zt(t,!1),0===t.strm.avail_out)?1:2},Tt=(t,e)=>{let a,i,n;for(;;){if(t.lookahead<ut){if(Ut(t),t.lookahead<ut&&e===q)return 1;if(0===t.lookahead)break}if(a=0,t.lookahead>=3&&(t.ins_h=yt(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),t.prev_length=t.match_length,t.prev_match=t.match_start,t.match_length=2,0!==a&&t.prev_length<t.max_lazy_match&&t.strstart-a<=t.w_size-ut&&(t.match_length=Zt(t,a),t.match_length<=5&&(t.strategy===rt||3===t.match_length&&t.strstart-t.match_start>4096)&&(t.match_length=2)),t.prev_length>=3&&t.match_length<=t.prev_length){n=t.strstart+t.lookahead-3,i=X(t,t.strstart-1-t.prev_match,t.prev_length-3),t.lookahead-=t.prev_length-1,t.prev_length-=2;do{++t.strstart<=n&&(t.ins_h=yt(t,t.ins_h,t.window[t.strstart+3-1]),a=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart)}while(0!=--t.prev_length);if(t.match_available=0,t.match_length=2,t.strstart++,i&&(zt(t,!1),0===t.strm.avail_out))return 1}else if(t.match_available){if(i=X(t,0,t.window[t.strstart-1]),i&&zt(t,!1),t.strstart++,t.lookahead--,0===t.strm.avail_out)return 1}else t.match_available=1,t.strstart++,t.lookahead--}return t.match_available&&(i=X(t,0,t.window[t.strstart-1]),t.match_available=0),t.insert=t.strstart<2?t.strstart:2,e===V?(zt(t,!0),0===t.strm.avail_out?3:4):t.sym_next&&(zt(t,!1),0===t.strm.avail_out)?1:2};function Ot(t,e,a,i,n){this.good_length=t,this.max_lazy=e,this.nice_length=a,this.max_chain=i,this.func=n}const It=[new Ot(0,0,0,0,St),new Ot(4,4,8,4,Dt),new Ot(4,5,16,8,Dt),new Ot(4,6,32,32,Dt),new Ot(4,4,16,16,Tt),new Ot(8,16,32,32,Tt),new Ot(8,16,128,128,Tt),new Ot(8,32,128,256,Tt),new Ot(32,128,258,1024,Tt),new Ot(32,258,258,4096,Tt)];function Ft(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=ft,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new Uint16Array(1146),this.dyn_dtree=new Uint16Array(122),this.bl_tree=new Uint16Array(78),kt(this.dyn_ltree),kt(this.dyn_dtree),kt(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new Uint16Array(16),this.heap=new Uint16Array(573),kt(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new Uint16Array(573),kt(this.depth),this.sym_buf=0,this.lit_bufsize=0,this.sym_next=0,this.sym_end=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}const Lt=t=>{if(!t)return 1;const e=t.state;return!e||e.strm!==t||e.status!==wt&&57!==e.status&&69!==e.status&&73!==e.status&&91!==e.status&&103!==e.status&&e.status!==mt&&e.status!==bt?1:0},Nt=t=>{if(Lt(t))return gt(t,at);t.total_in=t.total_out=0,t.data_type=_t;const e=t.state;return e.pending=0,e.pending_out=0,e.wrap<0&&(e.wrap=-e.wrap),e.status=2===e.wrap?57:e.wrap?wt:mt,t.adler=2===e.wrap?0:1,e.last_flush=-2,P(e),tt},Bt=t=>{const e=Nt(t);var a;return e===tt&&((a=t.state).window_size=2*a.w_size,kt(a.head),a.max_lazy_match=It[a.level].max_lazy,a.good_match=It[a.level].good_length,a.nice_match=It[a.level].nice_length,a.max_chain_length=It[a.level].max_chain,a.strstart=0,a.block_start=0,a.lookahead=0,a.insert=0,a.match_length=a.prev_length=2,a.match_available=0,a.ins_h=0),e},Ct=(t,e,a,i,n,s)=>{if(!t)return at;let r=1;if(e===st&&(e=6),i<0?(r=0,i=-i):i>15&&(r=2,i-=16),n<1||n>9||a!==ft||i<8||i>15||e<0||e>9||s<0||s>ht||8===i&&1!==r)return gt(t,at);8===i&&(i=9);const o=new Ft;return t.state=o,o.strm=t,o.status=wt,o.wrap=r,o.gzhead=null,o.w_bits=i,o.w_size=1<<o.w_bits,o.w_mask=o.w_size-1,o.hash_bits=n+7,o.hash_size=1<<o.hash_bits,o.hash_mask=o.hash_size-1,o.hash_shift=~~((o.hash_bits+3-1)/3),o.window=new Uint8Array(2*o.w_size),o.head=new Uint16Array(o.hash_size),o.prev=new Uint16Array(o.w_size),o.lit_bufsize=1<<n+6,o.pending_buf_size=4*o.lit_bufsize,o.pending_buf=new Uint8Array(o.pending_buf_size),o.sym_buf=o.lit_bufsize,o.sym_end=3*(o.lit_bufsize-1),o.level=e,o.strategy=s,o.method=a,Bt(t)};var Mt={deflateInit:(t,e)=>Ct(t,e,ft,15,8,dt),deflateInit2:Ct,deflateReset:Bt,deflateResetKeep:Nt,deflateSetHeader:(t,e)=>Lt(t)||2!==t.state.wrap?at:(t.state.gzhead=e,tt),deflate:(t,e)=>{if(Lt(t)||e>$||e<0)return t?gt(t,at):at;const a=t.state;if(!t.output||0!==t.avail_in&&!t.input||a.status===bt&&e!==V)return gt(t,0===t.avail_out?nt:at);const i=a.last_flush;if(a.last_flush=e,0!==a.pending){if(xt(t),0===t.avail_out)return a.last_flush=-1,tt}else if(0===t.avail_in&&pt(e)<=pt(i)&&e!==V)return gt(t,nt);if(a.status===bt&&0!==t.avail_in)return gt(t,nt);if(a.status===wt&&0===a.wrap&&(a.status=mt),a.status===wt){let e=ft+(a.w_bits-8<<4)<<8,i=-1;if(i=a.strategy>=ot||a.level<2?0:a.level<6?1:6===a.level?2:3,e|=i<<6,0!==a.strstart&&(e|=32),e+=31-e%31,Et(a,e),0!==a.strstart&&(Et(a,t.adler>>>16),Et(a,65535&t.adler)),t.adler=1,a.status=mt,xt(t),0!==a.pending)return a.last_flush=-1,tt}if(57===a.status)if(t.adler=0,At(a,31),At(a,139),At(a,8),a.gzhead)At(a,(a.gzhead.text?1:0)+(a.gzhead.hcrc?2:0)+(a.gzhead.extra?4:0)+(a.gzhead.name?8:0)+(a.gzhead.comment?16:0)),At(a,255&a.gzhead.time),At(a,a.gzhead.time>>8&255),At(a,a.gzhead.time>>16&255),At(a,a.gzhead.time>>24&255),At(a,9===a.level?2:a.strategy>=ot||a.level<2?4:0),At(a,255&a.gzhead.os),a.gzhead.extra&&a.gzhead.extra.length&&(At(a,255&a.gzhead.extra.length),At(a,a.gzhead.extra.length>>8&255)),a.gzhead.hcrc&&(t.adler=H(t.adler,a.pending_buf,a.pending,0)),a.gzindex=0,a.status=69;else if(At(a,0),At(a,0),At(a,0),At(a,0),At(a,0),At(a,9===a.level?2:a.strategy>=ot||a.level<2?4:0),At(a,3),a.status=mt,xt(t),0!==a.pending)return a.last_flush=-1,tt;if(69===a.status){if(a.gzhead.extra){let e=a.pending,i=(65535&a.gzhead.extra.length)-a.gzindex;for(;a.pending+i>a.pending_buf_size;){let n=a.pending_buf_size-a.pending;if(a.pending_buf.set(a.gzhead.extra.subarray(a.gzindex,a.gzindex+n),a.pending),a.pending=a.pending_buf_size,a.gzhead.hcrc&&a.pending>e&&(t.adler=H(t.adler,a.pending_buf,a.pending-e,e)),a.gzindex+=n,xt(t),0!==a.pending)return a.last_flush=-1,tt;e=0,i-=n}let n=new Uint8Array(a.gzhead.extra);a.pending_buf.set(n.subarray(a.gzindex,a.gzindex+i),a.pending),a.pending+=i,a.gzhead.hcrc&&a.pending>e&&(t.adler=H(t.adler,a.pending_buf,a.pending-e,e)),a.gzindex=0}a.status=73}if(73===a.status){if(a.gzhead.name){let e,i=a.pending;do{if(a.pending===a.pending_buf_size){if(a.gzhead.hcrc&&a.pending>i&&(t.adler=H(t.adler,a.pending_buf,a.pending-i,i)),xt(t),0!==a.pending)return a.last_flush=-1,tt;i=0}e=a.gzindex<a.gzhead.name.length?255&a.gzhead.name.charCodeAt(a.gzindex++):0,At(a,e)}while(0!==e);a.gzhead.hcrc&&a.pending>i&&(t.adler=H(t.adler,a.pending_buf,a.pending-i,i)),a.gzindex=0}a.status=91}if(91===a.status){if(a.gzhead.comment){let e,i=a.pending;do{if(a.pending===a.pending_buf_size){if(a.gzhead.hcrc&&a.pending>i&&(t.adler=H(t.adler,a.pending_buf,a.pending-i,i)),xt(t),0!==a.pending)return a.last_flush=-1,tt;i=0}e=a.gzindex<a.gzhead.comment.length?255&a.gzhead.comment.charCodeAt(a.gzindex++):0,At(a,e)}while(0!==e);a.gzhead.hcrc&&a.pending>i&&(t.adler=H(t.adler,a.pending_buf,a.pending-i,i))}a.status=103}if(103===a.status){if(a.gzhead.hcrc){if(a.pending+2>a.pending_buf_size&&(xt(t),0!==a.pending))return a.last_flush=-1,tt;At(a,255&t.adler),At(a,t.adler>>8&255),t.adler=0}if(a.status=mt,xt(t),0!==a.pending)return a.last_flush=-1,tt}if(0!==t.avail_in||0!==a.lookahead||e!==q&&a.status!==bt){let i=0===a.level?St(a,e):a.strategy===ot?((t,e)=>{let a;for(;;){if(0===t.lookahead&&(Ut(t),0===t.lookahead)){if(e===q)return 1;break}if(t.match_length=0,a=X(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++,a&&(zt(t,!1),0===t.strm.avail_out))return 1}return t.insert=0,e===V?(zt(t,!0),0===t.strm.avail_out?3:4):t.sym_next&&(zt(t,!1),0===t.strm.avail_out)?1:2})(a,e):a.strategy===lt?((t,e)=>{let a,i,n,s;const r=t.window;for(;;){if(t.lookahead<=ct){if(Ut(t),t.lookahead<=ct&&e===q)return 1;if(0===t.lookahead)break}if(t.match_length=0,t.lookahead>=3&&t.strstart>0&&(n=t.strstart-1,i=r[n],i===r[++n]&&i===r[++n]&&i===r[++n])){s=t.strstart+ct;do{}while(i===r[++n]&&i===r[++n]&&i===r[++n]&&i===r[++n]&&i===r[++n]&&i===r[++n]&&i===r[++n]&&i===r[++n]&&n<s);t.match_length=ct-(s-n),t.match_length>t.lookahead&&(t.match_length=t.lookahead)}if(t.match_length>=3?(a=X(t,1,t.match_length-3),t.lookahead-=t.match_length,t.strstart+=t.match_length,t.match_length=0):(a=X(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++),a&&(zt(t,!1),0===t.strm.avail_out))return 1}return t.insert=0,e===V?(zt(t,!0),0===t.strm.avail_out?3:4):t.sym_next&&(zt(t,!1),0===t.strm.avail_out)?1:2})(a,e):It[a.level].func(a,e);if(3!==i&&4!==i||(a.status=bt),1===i||3===i)return 0===t.avail_out&&(a.last_flush=-1),tt;if(2===i&&(e===J?W(a):e!==$&&(Y(a,0,0,!1),e===Q&&(kt(a.head),0===a.lookahead&&(a.strstart=0,a.block_start=0,a.insert=0))),xt(t),0===t.avail_out))return a.last_flush=-1,tt}return e!==V?tt:a.wrap<=0?et:(2===a.wrap?(At(a,255&t.adler),At(a,t.adler>>8&255),At(a,t.adler>>16&255),At(a,t.adler>>24&255),At(a,255&t.total_in),At(a,t.total_in>>8&255),At(a,t.total_in>>16&255),At(a,t.total_in>>24&255)):(Et(a,t.adler>>>16),Et(a,65535&t.adler)),xt(t),a.wrap>0&&(a.wrap=-a.wrap),0!==a.pending?tt:et)},deflateEnd:t=>{if(Lt(t))return at;const e=t.state.status;return t.state=null,e===mt?gt(t,it):tt},deflateSetDictionary:(t,e)=>{let a=e.length;if(Lt(t))return at;const i=t.state,n=i.wrap;if(2===n||1===n&&i.status!==wt||i.lookahead)return at;if(1===n&&(t.adler=C(t.adler,e,a,0)),i.wrap=0,a>=i.w_size){0===n&&(kt(i.head),i.strstart=0,i.block_start=0,i.insert=0);let t=new Uint8Array(i.w_size);t.set(e.subarray(a-i.w_size,a),0),e=t,a=i.w_size}const s=t.avail_in,r=t.next_in,o=t.input;for(t.avail_in=a,t.next_in=0,t.input=e,Ut(i);i.lookahead>=3;){let t=i.strstart,e=i.lookahead-2;do{i.ins_h=yt(i,i.ins_h,i.window[t+3-1]),i.prev[t&i.w_mask]=i.head[i.ins_h],i.head[i.ins_h]=t,t++}while(--e);i.strstart=t,i.lookahead=2,Ut(i)}return i.strstart+=i.lookahead,i.block_start=i.strstart,i.insert=i.lookahead,i.lookahead=0,i.match_length=i.prev_length=2,i.match_available=0,t.next_in=r,t.input=o,t.avail_in=s,i.wrap=n,tt},deflateInfo:"pako deflate (from Nodeca project)"};const Ht=(t,e)=>Object.prototype.hasOwnProperty.call(t,e);var jt=function(t){const e=Array.prototype.slice.call(arguments,1);for(;e.length;){const a=e.shift();if(a){if("object"!=typeof a)throw new TypeError(a+"must be non-object");for(const e in a)Ht(a,e)&&(t[e]=a[e])}}return t},Kt=t=>{let e=0;for(let a=0,i=t.length;a<i;a++)e+=t[a].length;const a=new Uint8Array(e);for(let e=0,i=0,n=t.length;e<n;e++){let n=t[e];a.set(n,i),i+=n.length}return a};let Pt=!0;try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(t){Pt=!1}const Yt=new Uint8Array(256);for(let t=0;t<256;t++)Yt[t]=t>=252?6:t>=248?5:t>=240?4:t>=224?3:t>=192?2:1;Yt[254]=Yt[254]=1;var Gt=t=>{if("function"==typeof TextEncoder&&TextEncoder.prototype.encode)return(new TextEncoder).encode(t);let e,a,i,n,s,r=t.length,o=0;for(n=0;n<r;n++)a=t.charCodeAt(n),55296==(64512&a)&&n+1<r&&(i=t.charCodeAt(n+1),56320==(64512&i)&&(a=65536+(a-55296<<10)+(i-56320),n++)),o+=a<128?1:a<2048?2:a<65536?3:4;for(e=new Uint8Array(o),s=0,n=0;s<o;n++)a=t.charCodeAt(n),55296==(64512&a)&&n+1<r&&(i=t.charCodeAt(n+1),56320==(64512&i)&&(a=65536+(a-55296<<10)+(i-56320),n++)),a<128?e[s++]=a:a<2048?(e[s++]=192|a>>>6,e[s++]=128|63&a):a<65536?(e[s++]=224|a>>>12,e[s++]=128|a>>>6&63,e[s++]=128|63&a):(e[s++]=240|a>>>18,e[s++]=128|a>>>12&63,e[s++]=128|a>>>6&63,e[s++]=128|63&a);return e},Xt=(t,e)=>{const a=e||t.length;if("function"==typeof TextDecoder&&TextDecoder.prototype.decode)return(new TextDecoder).decode(t.subarray(0,e));let i,n;const s=new Array(2*a);for(n=0,i=0;i<a;){let e=t[i++];if(e<128){s[n++]=e;continue}let r=Yt[e];if(r>4)s[n++]=65533,i+=r-1;else{for(e&=2===r?31:3===r?15:7;r>1&&i<a;)e=e<<6|63&t[i++],r--;r>1?s[n++]=65533:e<65536?s[n++]=e:(e-=65536,s[n++]=55296|e>>10&1023,s[n++]=56320|1023&e)}}return((t,e)=>{if(e<65534&&t.subarray&&Pt)return String.fromCharCode.apply(null,t.length===e?t:t.subarray(0,e));let a="";for(let i=0;i<e;i++)a+=String.fromCharCode(t[i]);return a})(s,n)},Wt=(t,e)=>{(e=e||t.length)>t.length&&(e=t.length);let a=e-1;for(;a>=0&&128==(192&t[a]);)a--;return a<0||0===a?e:a+Yt[t[a]]>e?a:e};var qt=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0};const Jt=Object.prototype.toString,{Z_NO_FLUSH:Qt,Z_SYNC_FLUSH:Vt,Z_FULL_FLUSH:$t,Z_FINISH:te,Z_OK:ee,Z_STREAM_END:ae,Z_DEFAULT_COMPRESSION:ie,Z_DEFAULT_STRATEGY:ne,Z_DEFLATED:se}=K;function re(t){this.options=jt({level:ie,method:se,chunkSize:16384,windowBits:15,memLevel:8,strategy:ne},t||{});let e=this.options;e.raw&&e.windowBits>0?e.windowBits=-e.windowBits:e.gzip&&e.windowBits>0&&e.windowBits<16&&(e.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new qt,this.strm.avail_out=0;let a=Mt.deflateInit2(this.strm,e.level,e.method,e.windowBits,e.memLevel,e.strategy);if(a!==ee)throw new Error(j[a]);if(e.header&&Mt.deflateSetHeader(this.strm,e.header),e.dictionary){let t;if(t="string"==typeof e.dictionary?Gt(e.dictionary):"[object ArrayBuffer]"===Jt.call(e.dictionary)?new Uint8Array(e.dictionary):e.dictionary,a=Mt.deflateSetDictionary(this.strm,t),a!==ee)throw new Error(j[a]);this._dict_set=!0}}function oe(t,e){const a=new re(e);if(a.push(t,!0),a.err)throw a.msg||j[a.err];return a.result}re.prototype.push=function(t,e){const a=this.strm,i=this.options.chunkSize;let n,s;if(this.ended)return!1;for(s=e===~~e?e:!0===e?te:Qt,"string"==typeof t?a.input=Gt(t):"[object ArrayBuffer]"===Jt.call(t)?a.input=new Uint8Array(t):a.input=t,a.next_in=0,a.avail_in=a.input.length;;)if(0===a.avail_out&&(a.output=new Uint8Array(i),a.next_out=0,a.avail_out=i),(s===Vt||s===$t)&&a.avail_out<=6)this.onData(a.output.subarray(0,a.next_out)),a.avail_out=0;else{if(n=Mt.deflate(a,s),n===ae)return a.next_out>0&&this.onData(a.output.subarray(0,a.next_out)),n=Mt.deflateEnd(this.strm),this.onEnd(n),this.ended=!0,n===ee;if(0!==a.avail_out){if(s>0&&a.next_out>0)this.onData(a.output.subarray(0,a.next_out)),a.avail_out=0;else if(0===a.avail_in)break}else this.onData(a.output)}return!0},re.prototype.onData=function(t){this.chunks.push(t)},re.prototype.onEnd=function(t){t===ee&&(this.result=Kt(this.chunks)),this.chunks=[],this.err=t,this.msg=this.strm.msg};var le={Deflate:re,deflate:oe,deflateRaw:function(t,e){return(e=e||{}).raw=!0,oe(t,e)},gzip:function(t,e){return(e=e||{}).gzip=!0,oe(t,e)},constants:K};const he=16209;var de=function(t,e){let a,i,n,s,r,o,l,h,d,_,f,c,u,w,m,b,g,p,k,v,y,x,z,A;const E=t.state;a=t.next_in,z=t.input,i=a+(t.avail_in-5),n=t.next_out,A=t.output,s=n-(e-t.avail_out),r=n+(t.avail_out-257),o=E.dmax,l=E.wsize,h=E.whave,d=E.wnext,_=E.window,f=E.hold,c=E.bits,u=E.lencode,w=E.distcode,m=(1<<E.lenbits)-1,b=(1<<E.distbits)-1;t:do{c<15&&(f+=z[a++]<<c,c+=8,f+=z[a++]<<c,c+=8),g=u[f&m];e:for(;;){if(p=g>>>24,f>>>=p,c-=p,p=g>>>16&255,0===p)A[n++]=65535&g;else{if(!(16&p)){if(0==(64&p)){g=u[(65535&g)+(f&(1<<p)-1)];continue e}if(32&p){E.mode=16191;break t}t.msg="invalid literal/length code",E.mode=he;break t}k=65535&g,p&=15,p&&(c<p&&(f+=z[a++]<<c,c+=8),k+=f&(1<<p)-1,f>>>=p,c-=p),c<15&&(f+=z[a++]<<c,c+=8,f+=z[a++]<<c,c+=8),g=w[f&b];a:for(;;){if(p=g>>>24,f>>>=p,c-=p,p=g>>>16&255,!(16&p)){if(0==(64&p)){g=w[(65535&g)+(f&(1<<p)-1)];continue a}t.msg="invalid distance code",E.mode=he;break t}if(v=65535&g,p&=15,c<p&&(f+=z[a++]<<c,c+=8,c<p&&(f+=z[a++]<<c,c+=8)),v+=f&(1<<p)-1,v>o){t.msg="invalid distance too far back",E.mode=he;break t}if(f>>>=p,c-=p,p=n-s,v>p){if(p=v-p,p>h&&E.sane){t.msg="invalid distance too far back",E.mode=he;break t}if(y=0,x=_,0===d){if(y+=l-p,p<k){k-=p;do{A[n++]=_[y++]}while(--p);y=n-v,x=A}}else if(d<p){if(y+=l+d-p,p-=d,p<k){k-=p;do{A[n++]=_[y++]}while(--p);if(y=0,d<k){p=d,k-=p;do{A[n++]=_[y++]}while(--p);y=n-v,x=A}}}else if(y+=d-p,p<k){k-=p;do{A[n++]=_[y++]}while(--p);y=n-v,x=A}for(;k>2;)A[n++]=x[y++],A[n++]=x[y++],A[n++]=x[y++],k-=3;k&&(A[n++]=x[y++],k>1&&(A[n++]=x[y++]))}else{y=n-v;do{A[n++]=A[y++],A[n++]=A[y++],A[n++]=A[y++],k-=3}while(k>2);k&&(A[n++]=A[y++],k>1&&(A[n++]=A[y++]))}break}}break}}while(a<i&&n<r);k=c>>3,a-=k,c-=k<<3,f&=(1<<c)-1,t.next_in=a,t.next_out=n,t.avail_in=a<i?i-a+5:5-(a-i),t.avail_out=n<r?r-n+257:257-(n-r),E.hold=f,E.bits=c};const _e=15,fe=new Uint16Array([3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0]),ce=new Uint8Array([16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78]),ue=new Uint16Array([1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0]),we=new Uint8Array([16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64]);var me=(t,e,a,i,n,s,r,o)=>{const l=o.bits;let h,d,_,f,c,u,w=0,m=0,b=0,g=0,p=0,k=0,v=0,y=0,x=0,z=0,A=null;const E=new Uint16Array(16),R=new Uint16Array(16);let Z,U,S,D=null;for(w=0;w<=_e;w++)E[w]=0;for(m=0;m<i;m++)E[e[a+m]]++;for(p=l,g=_e;g>=1&&0===E[g];g--);if(p>g&&(p=g),0===g)return n[s++]=20971520,n[s++]=20971520,o.bits=1,0;for(b=1;b<g&&0===E[b];b++);for(p<b&&(p=b),y=1,w=1;w<=_e;w++)if(y<<=1,y-=E[w],y<0)return-1;if(y>0&&(0===t||1!==g))return-1;for(R[1]=0,w=1;w<_e;w++)R[w+1]=R[w]+E[w];for(m=0;m<i;m++)0!==e[a+m]&&(r[R[e[a+m]]++]=m);if(0===t?(A=D=r,u=20):1===t?(A=fe,D=ce,u=257):(A=ue,D=we,u=0),z=0,m=0,w=b,c=s,k=p,v=0,_=-1,x=1<<p,f=x-1,1===t&&x>852||2===t&&x>592)return 1;for(;;){Z=w-v,r[m]+1<u?(U=0,S=r[m]):r[m]>=u?(U=D[r[m]-u],S=A[r[m]-u]):(U=96,S=0),h=1<<w-v,d=1<<k,b=d;do{d-=h,n[c+(z>>v)+d]=Z<<24|U<<16|S|0}while(0!==d);for(h=1<<w-1;z&h;)h>>=1;if(0!==h?(z&=h-1,z+=h):z=0,m++,0==--E[w]){if(w===g)break;w=e[a+r[m]]}if(w>p&&(z&f)!==_){for(0===v&&(v=p),c+=b,k=w-v,y=1<<k;k+v<g&&(y-=E[k+v],!(y<=0));)k++,y<<=1;if(x+=1<<k,1===t&&x>852||2===t&&x>592)return 1;_=z&f,n[_]=p<<24|k<<16|c-s|0}}return 0!==z&&(n[c+z]=w-v<<24|64<<16|0),o.bits=p,0};const{Z_FINISH:be,Z_BLOCK:ge,Z_TREES:pe,Z_OK:ke,Z_STREAM_END:ve,Z_NEED_DICT:ye,Z_STREAM_ERROR:xe,Z_DATA_ERROR:ze,Z_MEM_ERROR:Ae,Z_BUF_ERROR:Ee,Z_DEFLATED:Re}=K,Ze=16180,Ue=16190,Se=16191,De=16192,Te=16194,Oe=16199,Ie=16200,Fe=16206,Le=16209,Ne=t=>(t>>>24&255)+(t>>>8&65280)+((65280&t)<<8)+((255&t)<<24);function Be(){this.strm=null,this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new Uint16Array(320),this.work=new Uint16Array(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}const Ce=t=>{if(!t)return 1;const e=t.state;return!e||e.strm!==t||e.mode<Ze||e.mode>16211?1:0},Me=t=>{if(Ce(t))return xe;const e=t.state;return t.total_in=t.total_out=e.total=0,t.msg="",e.wrap&&(t.adler=1&e.wrap),e.mode=Ze,e.last=0,e.havedict=0,e.flags=-1,e.dmax=32768,e.head=null,e.hold=0,e.bits=0,e.lencode=e.lendyn=new Int32Array(852),e.distcode=e.distdyn=new Int32Array(592),e.sane=1,e.back=-1,ke},He=t=>{if(Ce(t))return xe;const e=t.state;return e.wsize=0,e.whave=0,e.wnext=0,Me(t)},je=(t,e)=>{let a;if(Ce(t))return xe;const i=t.state;return e<0?(a=0,e=-e):(a=5+(e>>4),e<48&&(e&=15)),e&&(e<8||e>15)?xe:(null!==i.window&&i.wbits!==e&&(i.window=null),i.wrap=a,i.wbits=e,He(t))},Ke=(t,e)=>{if(!t)return xe;const a=new Be;t.state=a,a.strm=t,a.window=null,a.mode=Ze;const i=je(t,e);return i!==ke&&(t.state=null),i};let Pe,Ye,Ge=!0;const Xe=t=>{if(Ge){Pe=new Int32Array(512),Ye=new Int32Array(32);let e=0;for(;e<144;)t.lens[e++]=8;for(;e<256;)t.lens[e++]=9;for(;e<280;)t.lens[e++]=7;for(;e<288;)t.lens[e++]=8;for(me(1,t.lens,0,288,Pe,0,t.work,{bits:9}),e=0;e<32;)t.lens[e++]=5;me(2,t.lens,0,32,Ye,0,t.work,{bits:5}),Ge=!1}t.lencode=Pe,t.lenbits=9,t.distcode=Ye,t.distbits=5},We=(t,e,a,i)=>{let n;const s=t.state;return null===s.window&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new Uint8Array(s.wsize)),i>=s.wsize?(s.window.set(e.subarray(a-s.wsize,a),0),s.wnext=0,s.whave=s.wsize):(n=s.wsize-s.wnext,n>i&&(n=i),s.window.set(e.subarray(a-i,a-i+n),s.wnext),(i-=n)?(s.window.set(e.subarray(a-i,a),0),s.wnext=i,s.whave=s.wsize):(s.wnext+=n,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=n))),0};var qe={inflateReset:He,inflateReset2:je,inflateResetKeep:Me,inflateInit:t=>Ke(t,15),inflateInit2:Ke,inflate:(t,e)=>{let a,i,n,s,r,o,l,h,d,_,f,c,u,w,m,b,g,p,k,v,y,x,z=0;const A=new Uint8Array(4);let E,R;const Z=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);if(Ce(t)||!t.output||!t.input&&0!==t.avail_in)return xe;a=t.state,a.mode===Se&&(a.mode=De),r=t.next_out,n=t.output,l=t.avail_out,s=t.next_in,i=t.input,o=t.avail_in,h=a.hold,d=a.bits,_=o,f=l,x=ke;t:for(;;)switch(a.mode){case Ze:if(0===a.wrap){a.mode=De;break}for(;d<16;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}if(2&a.wrap&&35615===h){0===a.wbits&&(a.wbits=15),a.check=0,A[0]=255&h,A[1]=h>>>8&255,a.check=H(a.check,A,2,0),h=0,d=0,a.mode=16181;break}if(a.head&&(a.head.done=!1),!(1&a.wrap)||(((255&h)<<8)+(h>>8))%31){t.msg="incorrect header check",a.mode=Le;break}if((15&h)!==Re){t.msg="unknown compression method",a.mode=Le;break}if(h>>>=4,d-=4,y=8+(15&h),0===a.wbits&&(a.wbits=y),y>15||y>a.wbits){t.msg="invalid window size",a.mode=Le;break}a.dmax=1<<a.wbits,a.flags=0,t.adler=a.check=1,a.mode=512&h?16189:Se,h=0,d=0;break;case 16181:for(;d<16;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}if(a.flags=h,(255&a.flags)!==Re){t.msg="unknown compression method",a.mode=Le;break}if(57344&a.flags){t.msg="unknown header flags set",a.mode=Le;break}a.head&&(a.head.text=h>>8&1),512&a.flags&&4&a.wrap&&(A[0]=255&h,A[1]=h>>>8&255,a.check=H(a.check,A,2,0)),h=0,d=0,a.mode=16182;case 16182:for(;d<32;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}a.head&&(a.head.time=h),512&a.flags&&4&a.wrap&&(A[0]=255&h,A[1]=h>>>8&255,A[2]=h>>>16&255,A[3]=h>>>24&255,a.check=H(a.check,A,4,0)),h=0,d=0,a.mode=16183;case 16183:for(;d<16;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}a.head&&(a.head.xflags=255&h,a.head.os=h>>8),512&a.flags&&4&a.wrap&&(A[0]=255&h,A[1]=h>>>8&255,a.check=H(a.check,A,2,0)),h=0,d=0,a.mode=16184;case 16184:if(1024&a.flags){for(;d<16;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}a.length=h,a.head&&(a.head.extra_len=h),512&a.flags&&4&a.wrap&&(A[0]=255&h,A[1]=h>>>8&255,a.check=H(a.check,A,2,0)),h=0,d=0}else a.head&&(a.head.extra=null);a.mode=16185;case 16185:if(1024&a.flags&&(c=a.length,c>o&&(c=o),c&&(a.head&&(y=a.head.extra_len-a.length,a.head.extra||(a.head.extra=new Uint8Array(a.head.extra_len)),a.head.extra.set(i.subarray(s,s+c),y)),512&a.flags&&4&a.wrap&&(a.check=H(a.check,i,c,s)),o-=c,s+=c,a.length-=c),a.length))break t;a.length=0,a.mode=16186;case 16186:if(2048&a.flags){if(0===o)break t;c=0;do{y=i[s+c++],a.head&&y&&a.length<65536&&(a.head.name+=String.fromCharCode(y))}while(y&&c<o);if(512&a.flags&&4&a.wrap&&(a.check=H(a.check,i,c,s)),o-=c,s+=c,y)break t}else a.head&&(a.head.name=null);a.length=0,a.mode=16187;case 16187:if(4096&a.flags){if(0===o)break t;c=0;do{y=i[s+c++],a.head&&y&&a.length<65536&&(a.head.comment+=String.fromCharCode(y))}while(y&&c<o);if(512&a.flags&&4&a.wrap&&(a.check=H(a.check,i,c,s)),o-=c,s+=c,y)break t}else a.head&&(a.head.comment=null);a.mode=16188;case 16188:if(512&a.flags){for(;d<16;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}if(4&a.wrap&&h!==(65535&a.check)){t.msg="header crc mismatch",a.mode=Le;break}h=0,d=0}a.head&&(a.head.hcrc=a.flags>>9&1,a.head.done=!0),t.adler=a.check=0,a.mode=Se;break;case 16189:for(;d<32;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}t.adler=a.check=Ne(h),h=0,d=0,a.mode=Ue;case Ue:if(0===a.havedict)return t.next_out=r,t.avail_out=l,t.next_in=s,t.avail_in=o,a.hold=h,a.bits=d,ye;t.adler=a.check=1,a.mode=Se;case Se:if(e===ge||e===pe)break t;case De:if(a.last){h>>>=7&d,d-=7&d,a.mode=Fe;break}for(;d<3;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}switch(a.last=1&h,h>>>=1,d-=1,3&h){case 0:a.mode=16193;break;case 1:if(Xe(a),a.mode=Oe,e===pe){h>>>=2,d-=2;break t}break;case 2:a.mode=16196;break;case 3:t.msg="invalid block type",a.mode=Le}h>>>=2,d-=2;break;case 16193:for(h>>>=7&d,d-=7&d;d<32;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}if((65535&h)!=(h>>>16^65535)){t.msg="invalid stored block lengths",a.mode=Le;break}if(a.length=65535&h,h=0,d=0,a.mode=Te,e===pe)break t;case Te:a.mode=16195;case 16195:if(c=a.length,c){if(c>o&&(c=o),c>l&&(c=l),0===c)break t;n.set(i.subarray(s,s+c),r),o-=c,s+=c,l-=c,r+=c,a.length-=c;break}a.mode=Se;break;case 16196:for(;d<14;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}if(a.nlen=257+(31&h),h>>>=5,d-=5,a.ndist=1+(31&h),h>>>=5,d-=5,a.ncode=4+(15&h),h>>>=4,d-=4,a.nlen>286||a.ndist>30){t.msg="too many length or distance symbols",a.mode=Le;break}a.have=0,a.mode=16197;case 16197:for(;a.have<a.ncode;){for(;d<3;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}a.lens[Z[a.have++]]=7&h,h>>>=3,d-=3}for(;a.have<19;)a.lens[Z[a.have++]]=0;if(a.lencode=a.lendyn,a.lenbits=7,E={bits:a.lenbits},x=me(0,a.lens,0,19,a.lencode,0,a.work,E),a.lenbits=E.bits,x){t.msg="invalid code lengths set",a.mode=Le;break}a.have=0,a.mode=16198;case 16198:for(;a.have<a.nlen+a.ndist;){for(;z=a.lencode[h&(1<<a.lenbits)-1],m=z>>>24,b=z>>>16&255,g=65535&z,!(m<=d);){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}if(g<16)h>>>=m,d-=m,a.lens[a.have++]=g;else{if(16===g){for(R=m+2;d<R;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}if(h>>>=m,d-=m,0===a.have){t.msg="invalid bit length repeat",a.mode=Le;break}y=a.lens[a.have-1],c=3+(3&h),h>>>=2,d-=2}else if(17===g){for(R=m+3;d<R;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}h>>>=m,d-=m,y=0,c=3+(7&h),h>>>=3,d-=3}else{for(R=m+7;d<R;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}h>>>=m,d-=m,y=0,c=11+(127&h),h>>>=7,d-=7}if(a.have+c>a.nlen+a.ndist){t.msg="invalid bit length repeat",a.mode=Le;break}for(;c--;)a.lens[a.have++]=y}}if(a.mode===Le)break;if(0===a.lens[256]){t.msg="invalid code -- missing end-of-block",a.mode=Le;break}if(a.lenbits=9,E={bits:a.lenbits},x=me(1,a.lens,0,a.nlen,a.lencode,0,a.work,E),a.lenbits=E.bits,x){t.msg="invalid literal/lengths set",a.mode=Le;break}if(a.distbits=6,a.distcode=a.distdyn,E={bits:a.distbits},x=me(2,a.lens,a.nlen,a.ndist,a.distcode,0,a.work,E),a.distbits=E.bits,x){t.msg="invalid distances set",a.mode=Le;break}if(a.mode=Oe,e===pe)break t;case Oe:a.mode=Ie;case Ie:if(o>=6&&l>=258){t.next_out=r,t.avail_out=l,t.next_in=s,t.avail_in=o,a.hold=h,a.bits=d,de(t,f),r=t.next_out,n=t.output,l=t.avail_out,s=t.next_in,i=t.input,o=t.avail_in,h=a.hold,d=a.bits,a.mode===Se&&(a.back=-1);break}for(a.back=0;z=a.lencode[h&(1<<a.lenbits)-1],m=z>>>24,b=z>>>16&255,g=65535&z,!(m<=d);){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}if(b&&0==(240&b)){for(p=m,k=b,v=g;z=a.lencode[v+((h&(1<<p+k)-1)>>p)],m=z>>>24,b=z>>>16&255,g=65535&z,!(p+m<=d);){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}h>>>=p,d-=p,a.back+=p}if(h>>>=m,d-=m,a.back+=m,a.length=g,0===b){a.mode=16205;break}if(32&b){a.back=-1,a.mode=Se;break}if(64&b){t.msg="invalid literal/length code",a.mode=Le;break}a.extra=15&b,a.mode=16201;case 16201:if(a.extra){for(R=a.extra;d<R;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}a.length+=h&(1<<a.extra)-1,h>>>=a.extra,d-=a.extra,a.back+=a.extra}a.was=a.length,a.mode=16202;case 16202:for(;z=a.distcode[h&(1<<a.distbits)-1],m=z>>>24,b=z>>>16&255,g=65535&z,!(m<=d);){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}if(0==(240&b)){for(p=m,k=b,v=g;z=a.distcode[v+((h&(1<<p+k)-1)>>p)],m=z>>>24,b=z>>>16&255,g=65535&z,!(p+m<=d);){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}h>>>=p,d-=p,a.back+=p}if(h>>>=m,d-=m,a.back+=m,64&b){t.msg="invalid distance code",a.mode=Le;break}a.offset=g,a.extra=15&b,a.mode=16203;case 16203:if(a.extra){for(R=a.extra;d<R;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}a.offset+=h&(1<<a.extra)-1,h>>>=a.extra,d-=a.extra,a.back+=a.extra}if(a.offset>a.dmax){t.msg="invalid distance too far back",a.mode=Le;break}a.mode=16204;case 16204:if(0===l)break t;if(c=f-l,a.offset>c){if(c=a.offset-c,c>a.whave&&a.sane){t.msg="invalid distance too far back",a.mode=Le;break}c>a.wnext?(c-=a.wnext,u=a.wsize-c):u=a.wnext-c,c>a.length&&(c=a.length),w=a.window}else w=n,u=r-a.offset,c=a.length;c>l&&(c=l),l-=c,a.length-=c;do{n[r++]=w[u++]}while(--c);0===a.length&&(a.mode=Ie);break;case 16205:if(0===l)break t;n[r++]=a.length,l--,a.mode=Ie;break;case Fe:if(a.wrap){for(;d<32;){if(0===o)break t;o--,h|=i[s++]<<d,d+=8}if(f-=l,t.total_out+=f,a.total+=f,4&a.wrap&&f&&(t.adler=a.check=a.flags?H(a.check,n,f,r-f):C(a.check,n,f,r-f)),f=l,4&a.wrap&&(a.flags?h:Ne(h))!==a.check){t.msg="incorrect data check",a.mode=Le;break}h=0,d=0}a.mode=16207;case 16207:if(a.wrap&&a.flags){for(;d<32;){if(0===o)break t;o--,h+=i[s++]<<d,d+=8}if(4&a.wrap&&h!==(4294967295&a.total)){t.msg="incorrect length check",a.mode=Le;break}h=0,d=0}a.mode=16208;case 16208:x=ve;break t;case Le:x=ze;break t;case 16210:return Ae;default:return xe}return t.next_out=r,t.avail_out=l,t.next_in=s,t.avail_in=o,a.hold=h,a.bits=d,(a.wsize||f!==t.avail_out&&a.mode<Le&&(a.mode<Fe||e!==be))&&We(t,t.output,t.next_out,f-t.avail_out),_-=t.avail_in,f-=t.avail_out,t.total_in+=_,t.total_out+=f,a.total+=f,4&a.wrap&&f&&(t.adler=a.check=a.flags?H(a.check,n,f,t.next_out-f):C(a.check,n,f,t.next_out-f)),t.data_type=a.bits+(a.last?64:0)+(a.mode===Se?128:0)+(a.mode===Oe||a.mode===Te?256:0),(0===_&&0===f||e===be)&&x===ke&&(x=Ee),x},inflateEnd:t=>{if(Ce(t))return xe;let e=t.state;return e.window&&(e.window=null),t.state=null,ke},inflateGetHeader:(t,e)=>{if(Ce(t))return xe;const a=t.state;return 0==(2&a.wrap)?xe:(a.head=e,e.done=!1,ke)},inflateSetDictionary:(t,e)=>{const a=e.length;let i,n,s;return Ce(t)?xe:(i=t.state,0!==i.wrap&&i.mode!==Ue?xe:i.mode===Ue&&(n=1,n=C(n,e,a,0),n!==i.check)?ze:(s=We(t,e,a,a),s?(i.mode=16210,Ae):(i.havedict=1,ke)))},inflateInfo:"pako inflate (from Nodeca project)"};var Je=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1};const Qe=Object.prototype.toString,{Z_NO_FLUSH:Ve,Z_FINISH:$e,Z_OK:ta,Z_STREAM_END:ea,Z_NEED_DICT:aa,Z_STREAM_ERROR:ia,Z_DATA_ERROR:na,Z_MEM_ERROR:sa}=K;function ra(t){this.options=jt({chunkSize:65536,windowBits:15,to:""},t||{});const e=this.options;e.raw&&e.windowBits>=0&&e.windowBits<16&&(e.windowBits=-e.windowBits,0===e.windowBits&&(e.windowBits=-15)),!(e.windowBits>=0&&e.windowBits<16)||t&&t.windowBits||(e.windowBits+=32),e.windowBits>15&&e.windowBits<48&&0==(15&e.windowBits)&&(e.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new qt,this.strm.avail_out=0;let a=qe.inflateInit2(this.strm,e.windowBits);if(a!==ta)throw new Error(j[a]);if(this.header=new Je,qe.inflateGetHeader(this.strm,this.header),e.dictionary&&("string"==typeof e.dictionary?e.dictionary=Gt(e.dictionary):"[object ArrayBuffer]"===Qe.call(e.dictionary)&&(e.dictionary=new Uint8Array(e.dictionary)),e.raw&&(a=qe.inflateSetDictionary(this.strm,e.dictionary),a!==ta)))throw new Error(j[a])}function oa(t,e){const a=new ra(e);if(a.push(t),a.err)throw a.msg||j[a.err];return a.result}ra.prototype.push=function(t,e){const a=this.strm,i=this.options.chunkSize,n=this.options.dictionary;let s,r,o;if(this.ended)return!1;for(r=e===~~e?e:!0===e?$e:Ve,"[object ArrayBuffer]"===Qe.call(t)?a.input=new Uint8Array(t):a.input=t,a.next_in=0,a.avail_in=a.input.length;;){for(0===a.avail_out&&(a.output=new Uint8Array(i),a.next_out=0,a.avail_out=i),s=qe.inflate(a,r),s===aa&&n&&(s=qe.inflateSetDictionary(a,n),s===ta?s=qe.inflate(a,r):s===na&&(s=aa));a.avail_in>0&&s===ea&&a.state.wrap>0&&0!==t[a.next_in];)qe.inflateReset(a),s=qe.inflate(a,r);switch(s){case ia:case na:case aa:case sa:return this.onEnd(s),this.ended=!0,!1}if(o=a.avail_out,a.next_out&&(0===a.avail_out||s===ea))if("string"===this.options.to){let t=Wt(a.output,a.next_out),e=a.next_out-t,n=Xt(a.output,t);a.next_out=e,a.avail_out=i-e,e&&a.output.set(a.output.subarray(t,t+e),0),this.onData(n)}else this.onData(a.output.length===a.next_out?a.output:a.output.subarray(0,a.next_out));if(s!==ta||0!==o){if(s===ea)return s=qe.inflateEnd(this.strm),this.onEnd(s),this.ended=!0,!0;if(0===a.avail_in)break}}return!0},ra.prototype.onData=function(t){this.chunks.push(t)},ra.prototype.onEnd=function(t){t===ta&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=Kt(this.chunks)),this.chunks=[],this.err=t,this.msg=this.strm.msg};var la={Inflate:ra,inflate:oa,inflateRaw:function(t,e){return(e=e||{}).raw=!0,oa(t,e)},ungzip:oa,constants:K};const{Deflate:ha,deflate:da,deflateRaw:_a,gzip:fa}=le,{Inflate:ca,inflate:ua,inflateRaw:wa,ungzip:ma}=la;var ba=ha,ga=da,pa=_a,ka=fa,va=ca,ya=ua,xa=wa,za=ma,Aa=K,Ea={Deflate:ba,deflate:ga,deflateRaw:pa,gzip:ka,Inflate:va,inflate:ya,inflateRaw:xa,ungzip:za,constants:Aa};t.Deflate=ba,t.Inflate=va,t.constants=Aa,t.default=Ea,t.deflate=ga,t.deflateRaw=pa,t.gzip=ka,t.inflate=ya,t.inflateRaw=xa,t.ungzip=za,Object.defineProperty(t,"__esModule",{value:!0})}));
;return module.exports;})};
const __wayxContexts={"response":{"qx":{"phase":"response","responseBody":true,"binary":false,"binaryKnown":true,"from":"loon","to":"qx","apiPlan":{"version":1,"omitNotificationOptions":true,"qxHttp":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"node","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"},"target":{"responseStatus":"statusCode","scriptStartTime":"absent","binaryField":"bodyBytes","store":{"style":"prefs","read":"valueForKey","write":"setValueForKey","remove":"removeValueForKey","undefinedDeletes":false},"http":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"notification":{"root":"$notify","open":null,"media":null,"action":null,"openAction":null,"stringLink":false,"delay":false},"completion":{"statusEncoding":"line","synthetic":"flat"},"argument":"absent"}},"runtimePolicyVersion":2,"omittedParameters":["undocumented-qx-parameters"]},"surge":{"phase":"response","responseBody":true,"binary":false,"binaryKnown":true,"from":"loon","to":"surge","apiPlan":{"version":1,"omitNotificationOptions":false,"qxHttp":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"node","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"},"target":{"responseStatus":"status","scriptStartTime":"epoch-seconds","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":false},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"policy","timeoutMs":1000,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":false}},"notification":{"root":"$notification.post","open":"url","media":"media-url","action":"action","openAction":"open-url","stringLink":false,"delay":false},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"string"}},"runtimePolicyVersion":2,"omittedParameters":[]},"loon":{"phase":"response","responseBody":true,"binary":false,"binaryKnown":true,"from":"loon","to":"loon","apiPlan":{"version":1,"omitNotificationOptions":false,"qxHttp":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"node","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"},"target":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"node","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"}},"runtimePolicyVersion":2,"omittedParameters":[]}}},__wayxConfig=__wayxContexts[__wayxHost.response===undefined?'request':'response']?.[__wayxTarget];
if(!__wayxConfig)throw new Error('Unregistered HTTP source/target declaration');
return (function(config,host,run){
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const fail=message=>{throw new TypeError('WayX API: '+message);};
  const source=config.apiPlan.source,target=config.apiPlan.target;
  const headers=(function(headers){
  if(headers===undefined||headers===null)return headers;
  if(typeof headers!=='object'||Array.isArray(headers))throw new TypeError('Header dictionary required');
  const lowerCaseHeaders=Object.fromEntries(Object.entries(headers).map(([k,v])=>[k.toLowerCase(),v]));
  const key=prop=>typeof prop==='string'?prop.toLowerCase():prop;
  return new Proxy(lowerCaseHeaders,{
    get:(target,prop,receiver)=>{
      if(prop==='hasOwnProperty')return name=>Object.prototype.hasOwnProperty.call(target,key(name));
      if(prop==='propertyIsEnumerable')return name=>Object.prototype.propertyIsEnumerable.call(target,key(name));
      if(typeof prop==='string'&&!Object.prototype.hasOwnProperty.call(target,key(prop))&&['toString','toLocaleString','valueOf','constructor'].includes(prop))return Reflect.get(target,prop,receiver);
      return Reflect.get(target,key(prop),receiver);
    },
    set:(target,prop,value)=>Reflect.defineProperty(target,key(prop),{value,writable:true,enumerable:true,configurable:true}),
    deleteProperty:(target,prop)=>Reflect.deleteProperty(target,key(prop)),
    has:(target,prop)=>Reflect.has(target,key(prop)),
    defineProperty:(target,prop,descriptor)=>{
      if(key(prop)!==prop&&!descriptor.configurable)throw new TypeError('Case-insensitive Header descriptors must be configurable');
      return Reflect.defineProperty(target,key(prop),descriptor);
    },
    getOwnPropertyDescriptor:(target,prop)=>{const d=Reflect.getOwnPropertyDescriptor(target,key(prop));return d&&key(prop)!==prop?Object.assign({},d,{configurable:true}):d;},
  });
});
  const bytes=value=>ArrayBuffer.isView(value)?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):value instanceof ArrayBuffer?new Uint8Array(value):fail('binary body requires BufferSource');
  const buffer=value=>{const b=bytes(value);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
  // Modified: 2026-11-02 (chance). Validate status lines as well as numeric
  // values before formatting for QX; strings must not bypass result validation.
  const status=value=>{if(typeof value==='number'&&Number.isInteger(value)&&value>=100&&value<=599)return value;const m=typeof value==='string'&&/^HTTP\/[\d.]+\s+(\d{3})(?:\s.*)?$/.exec(value);if(m)return status(Number(m[1]));return fail('invalid HTTP status');};
  const statusLine=value=>{const code=status(value);return typeof value==='string'?value:'HTTP/1.1 '+code+' '+({200:'OK',201:'Created',204:'No Content',301:'Moved Permanently',302:'Found',304:'Not Modified',400:'Bad Request',401:'Unauthorized',403:'Forbidden',404:'Not Found',500:'Internal Server Error'}[code]||'Status');};
  function view(value){
    if(value===undefined)return undefined;
    const result=Object.assign({},value);
    if(value.headers!==undefined)result.headers=headers(value.headers);
    if(own(value,target.responseStatus)){result[source.responseStatus]=status(value[target.responseStatus]);if(source.responseStatus!==target.responseStatus)delete result[target.responseStatus];}
    if(config.binary){
      const valueBytes=target.binaryField==='bodyBytes'?value.bodyBytes:value.body;
      if(valueBytes!==undefined){const b=bytes(valueBytes);if(source.binaryField==='bodyBytes'){result.bodyBytes=buffer(b);delete result.body;}else{result.body=b;delete result.bodyBytes;}}
    }
    return result;
  }
  const request=view(host.request),response=view(host.response);
  let completed=false;
  // Modified: 2026-11-02 (chance). Validation does not consume completion;
  // author catch/fallback may retry until a result is submitted to the host.
  const finish=value=>{completed=true;return host.done(value);};
  function message(value,synthetic){
    if(!value||typeof value!=='object'||Array.isArray(value))return fail('completion requires an object');
    const out=Object.assign({},value);
    if(own(out,'statusCode')&&!own(out,'status'))out.status=out.statusCode;
    delete out.statusCode;
    if(own(out,'status'))out.status=target.completion.statusEncoding==='line'?statusLine(out.status):status(out.status);
    if(own(out,'headers')){if(!out.headers||typeof out.headers!=='object'||Array.isArray(out.headers))fail('completion headers require a dictionary');out.headers=Object.assign({},headers(out.headers));}
    if(own(out,'bodyBytes')){out.body=bytes(out.bodyBytes);delete out.bodyBytes;}
    if(out.body instanceof ArrayBuffer||ArrayBuffer.isView(out.body)){if(target.binaryField==='bodyBytes'){out.bodyBytes=buffer(out.body);delete out.body;}else out.body=bytes(out.body);}
    for(const key of Object.keys(out))if(!['url','headers','body','bodyBytes','status','abort'].includes(key)){if(config.to==='qx')delete out[key];else fail('unmapped completion field: '+key);}
    if(target.completion.synthetic==='flat'&&out.abort)fail('target abort API unavailable');
    if(target.completion.synthetic==='flat'&&!synthetic&&config.phase==='response'&&own(out,'headers')&&!own(out,'body')&&!own(out,'bodyBytes')&&config.responseBody)fail('QX response-body requires body with changed headers');
    return out;
  }
  function done(value){
    if(completed)return;
    if(value===undefined||value===null)return finish({});
    if(value===response||value===request){
      // Return actual current fields; mutations made by author code are retained.
      const out={};for(const k of ['url','headers','body','bodyBytes',source.responseStatus])if(own(value,k))out[k]=value[k];
      value=out;
    }
    if(typeof value==='string')value={body:value};
    let synthetic=false,payload=value;
    if(value&&typeof value==='object'&&own(value,'response')){synthetic=true;payload=value.response;}
    else if(config.from==='qx'&&config.phase==='echo')synthetic=true;
    const out=message(payload,synthetic);
    if(synthetic){if(target.completion.synthetic==='flat'){if(config.phase!=='echo')fail('QX synthetic response requires an echo declaration');return finish(out);}return finish({response:out});}
    return finish(out);
  }
  // ScriptHub-style native transport bridge, with complete method/error contracts.
  function transport(input,style,method){
    if(typeof input==='string')input={url:input};
    if(!input||typeof input!=='object'||typeof input.url!=='string')return fail('HTTP request requires url');
    const http=style==='promise'?config.apiPlan.qxHttp:source.http;
    const options=style==='promise'?(input.opts||{}):input;
    const verb=String(method||input.method||'GET').toLowerCase();
    if(!config.apiPlan.methods.includes(verb))return fail('HTTP method unavailable: '+verb);
    const req={url:input.url};
    if(own(input,'headers'))req.headers=Object.assign({},input.headers);
    if(own(input,'body'))req.body=input.body instanceof ArrayBuffer||ArrayBuffer.isView(input.body)?(target.http.style==='promise'?buffer(input.body):bytes(input.body)):input.body;
    const mapped={};
    for(const semantic of ['redirect','cookie','tls'])mapped[target.http[semantic]]=own(options,http[semantic])?options[http[semantic]]:http.defaults[semantic];
    if(own(options,http.policy))mapped[target.http.policy]=options[http.policy]===http.directPolicy?target.http.directPolicy:options[http.policy];
    // Modified: 2026-11-02 (chance). Decode the documented source body-base64
    // value into the target's byte body instead of dropping its meaning.
    if(style==='callback'&&input['body-base64']&&config.from!==config.to){
      if(typeof input.body!=='string')fail('body-base64 requires a String body');
      const raw=host.codecs.atob(input.body),data=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)data[i]=raw.charCodeAt(i);
      req.body=target.http.style==='promise'?buffer(data):data;
    }
    if(target.http.style==='promise'){
      req.method=verb.toUpperCase();req.opts=mapped;
      return {req,verb};
    }
    Object.assign(req,mapped);
    if(http.timeoutMs!==null&&target.http.timeoutMs!==null&&own(input,'timeout'))req.timeout=input.timeout*http.timeoutMs/target.http.timeoutMs;
    for(const key of ['binary-mode','body-base64','alpn'])if(style==='callback'&&own(input,key)&&(key!=='body-base64'||config.from===config.to))req[key]=input[key];
    if(style==='promise')req['binary-mode']=true;
    return {req,verb};
  }
  function taskFetch(input){
    return new Promise((resolve,reject)=>{
      let plan;try{plan=transport(input,'promise');}catch(error){reject(error);return;}
      const normalize=(native,data)=>{
        if(!native)return reject({error:'HTTP transport returned no response'});
        const out={statusCode:status(native[target.responseStatus]),headers:headers(native.headers||{})};
        if(data instanceof ArrayBuffer||ArrayBuffer.isView(data)){
          out.bodyBytes=buffer(data);
          if(target.http.style==='promise'&&typeof native.body==='string')out.body=native.body;
          else{
            const type=out.headers['content-type']||'',match=typeof type==='string'&&/charset\s*=\s*["']?([^;\s"']+)/i.exec(type);
            const encoding=match?match[1]:'utf-8',Decoder=typeof host.global.TextDecoder==='function'?host.global.TextDecoder:host.codecs.TextDecoder;
            try{out.body=new Decoder(encoding).decode(bytes(data));}catch(cause){const error=new Error('HTTP response charset unavailable: '+encoding);error.code='UNSUPPORTED_RESPONSE_CHARSET';error.encoding=encoding;error.cause=cause;throw error;}
          }
        }else out.body=data;
        resolve(out);
      };
      if(target.http.style==='promise'){
        let promise;try{promise=host.task.fetch(plan.req);}catch(error){reject(error);return;}
        Promise.resolve(promise).then(r=>{try{normalize(r,r&&(own(r,'bodyBytes')?r.bodyBytes:r.body));}catch(error){reject(error);}},reject);
      }else{
        const fn=host.http&&host.http[plan.verb];if(typeof fn!=='function'){reject(new TypeError('Native HTTP method unavailable'));return;}
        try{fn.call(host.http,plan.req,(error,r,data)=>{if(error){reject({error});return;}try{normalize(r,data);}catch(e){reject(e);}});}catch(error){reject(error);}
      }
    });
  }
  const http={};for(const method of config.apiPlan.methods)http[method]=(input,callback)=>{
    if(typeof callback!=='function')return fail('HTTP callback required');
    const plan=transport(input,'callback',method);
    if(target.http.style==='callback'){
      const fn=host.http&&host.http[method];if(typeof fn!=='function')return fail('native HTTP method unavailable');
      return fn.call(host.http,plan.req,(error,r,data)=>{if(error)return callback(error,r,data);if(!r)return callback('HTTP transport returned no response',r,data);const result=Object.assign({},r,{headers:headers(r.headers||{})});result.status=status(r[target.responseStatus]);return callback(null,result,data);});
    }
    return host.task.fetch(plan.req).then(r=>{if(!r)return callback('HTTP transport returned no response',undefined,undefined);return callback(null,{status:status(r.statusCode),headers:headers(r.headers||{})},input&&input['binary-mode']&&own(r,'bodyBytes')?bytes(r.bodyBytes):r.body);},e=>callback(e&&e.error||e,undefined,undefined));
  };
  const nativeStore=target.store.style==='prefs'?host.prefs:host.store;
  const storageKey=key=>{if(key===undefined){const name=config.name||(config.from===config.to&&host.script&&host.script.name);if(!name)return fail('source storage default key needs source script name');return name;}if(typeof key!=='string')return fail('storage key must be String');return key;};
  const store={read:key=>nativeStore[target.store.read](storageKey(key)),write:(value,key)=>{
    key=storageKey(key);if(value===null||(value===undefined&&source.store.undefinedDeletes))return target.store.remove?nativeStore[target.store.remove](key):nativeStore[target.store.write](null,key);
    if(typeof value!=='string')return fail('storage value must be String or deletion marker');return nativeStore[target.store.write](value,key);
  }};
  const prefKey=key=>typeof key==='string'?key:fail('QX storage requires an explicit String key');
  const prefs={valueForKey:key=>store.read(prefKey(key)),setValueForKey:(value,key)=>{key=prefKey(key);if(typeof value!=='string')return fail('QX storage value must be String');return store.write(value,key);},removeValueForKey:key=>target.store.remove?nativeStore[target.store.remove](prefKey(key)):nativeStore[target.store.write](null,prefKey(key))};
  // Modified: 2026-11-02 (chance). Native QX clear-all is real; other hosts
  // cannot reproduce it by deleting only keys observed by this adapter.
  if(config.from==='qx'&&config.to==='qx'&&host.prefs&&typeof host.prefs.removeAllValues==='function')prefs.removeAllValues=host.prefs.removeAllValues.bind(host.prefs);
  function notify(title='',subtitle='',body='',option,delay){
    if(config.apiPlan.omitNotificationOptions)return target.notification.root==='$notify'?host.notifyQx(title,subtitle,body):host.notify.post(title,subtitle,body);
    if(delay!==undefined&&delay!==0&&config.from!==config.to)return fail('notification delay has no target API');
    if(config.from===config.to)return host.notify.post(title,subtitle,body,option,delay);
    const raw=typeof option==='string'?{url:option}:option||{};
    const open=raw.openUrl||raw.url||raw['open-url'],media=raw.mediaUrl||raw['media-url'];
    const mapped={};if(open!==undefined)mapped[target.notification.open]=open;if(media!==undefined)mapped[target.notification.media]=media;
    for(const key of Object.keys(raw))if(!['url','openUrl','open-url','mediaUrl','media-url','action'].includes(key))fail('notification option unavailable: '+key);
    return host.notify.post(title,subtitle,body,mapped);
  }
  let argument=config.from==='qx'||target.argument==='absent'?undefined:host.argument;
  if(config.argumentSchema&&config.argumentSchema.kind==='object'&&typeof argument==='string')argument=JSON.parse(argument);
  const script=config.from==='qx'?undefined:Object.assign({},host.script,{name:config.name||host.script&&host.script.name});
  if(script&&script.startTime!==undefined){const t=script.startTime;script.startTime=t instanceof Date?t:new Date(t*1000);}
  const environment=Object.assign({},host.environment);delete environment['surge-version'];delete environment['stash-version'];
  const overlay={
    $request:request,$response:response,$done:done,$script:script,
    $task:config.from==='qx'?{fetch:taskFetch}:undefined,$httpClient:config.from==='qx'?undefined:http,
    $prefs:config.from==='qx'?prefs:undefined,$persistentStore:config.from==='qx'?undefined:store,
    $notify:config.from==='qx'?notify:undefined,$notification:config.from==='qx'?undefined:{post:notify},
    $argument:argument,$environment:environment,$loon:config.from==='loon'?(host.loon||'Loon (WayX API compatibility)'):undefined,
  };
  // Modified: 2026-11-02 (chance). Preserve native source-only services on Loon;
  // do not accidentally expose a different target API as an implemented mapping.
  if(config.from==='loon'){
    overlay.$utils=(function(host,config){
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
})(host,config);
    overlay.$crypto=config.from===config.to?host.crypto:undefined;
    overlay.$dns=config.from===config.to?host.dns:undefined;
  }
  if(config.from==='loon')overlay.setInterval=(fn,delay,...args)=>host.setTimeout(fn,delay,...args);
  for(const name of ['TextEncoder','TextDecoder','atob','btoa'])if(typeof host.global[name]==='undefined')overlay[name]=host.codecs[name];
  const scope=new Proxy(overlay,{has:(t,key)=>own(t,key),get:(t,key)=>key===Symbol.unscopables?undefined:Reflect.get(t,key),set:(t,key,value)=>Reflect.set(t,key,value)});
  const global=new Proxy(host.global,{get:(t,key)=>own(overlay,key)?overlay[key]:Reflect.get(t,key),set:(t,key,value)=>own(overlay,key)?Reflect.set(overlay,key,value):Reflect.set(t,key,value),has:(t,key)=>own(overlay,key)||Reflect.has(t,key)});
  overlay.globalThis=global;overlay.window=global;overlay.global=global;
  return run.call(global,scope);
})(__wayxConfig,__wayxHost,function(__wayxScope){with(__wayxScope){return (function(){
/*
引用地址：https://raw.githubusercontent.com/RuCu6/Loon/main/Scripts/weibo.js
*/
// 2026-04-23 18:00

const url = $request.url;
if (!$response) $done({});
if (!$response.body) $done({});
let body = $response.body;

// 微博详情页菜单配置
const itemMenusConfig = {
  creatortypeask: false, // 转发任务
  mblog_menus_apeal: true, // 申诉
  mblog_menus_avatar_widget: false, // 用此头像挂件
  mblog_menus_bullet_shield: true, // 屏蔽弹幕
  mblog_menus_card_bg: false, // 用此卡片背景
  mblog_menus_comment_manager: true, // 评论管理
  mblog_menus_copy_url: true, // 复制链接
  mblog_menus_custom: false, // 寄微博
  mblog_menus_delete: true, // 删除
  mblog_menus_edit: true, // 编辑
  mblog_menus_edit_history: true, // 编辑记录
  mblog_menus_edit_video: true, // 编辑视频
  mblog_menus_favorite: true, // 收藏
  mblog_menus_follow: true, // 关注
  mblog_menus_home: false, // 返回首页
  mblog_menus_long_picture: true, // 生成长图
  mblog_menus_modify_visible: true, // 设置分享范围
  mblog_menus_novelty: false, // 新鲜事投稿
  mblog_menus_open_reward: false, // 赞赏
  mblog_menus_popularize: false,
  mblog_menus_promote: false, // 推广
  mblog_menus_report: true, // 投诉
  mblog_menus_shield: true, // 屏蔽
  mblog_menus_sticking: true, // 置顶
  mblog_menus_video_feedback: false, // 播放反馈
  mblog_menus_video_later: false // 可能是稍后再看
};

if (url.includes("/interface/sdk/sdkad.php")) {
  // 开屏广告
  let obj = JSON.parse(body.substring(0, body.length - 2));
  if (obj?.needlocation) {
    obj.needlocation = false;
  }
  if (obj?.show_push_splash_ad) {
    obj.show_push_splash_ad = false;
  }
  if (obj?.background_delay_display_time) {
    obj.background_delay_display_time = 31536000; // 60 * 60 * 24 * 365 = 31536000
  }
  if (obj?.lastAdShow_delay_display_time) {
    obj.lastAdShow_delay_display_time = 31536000;
  }
  if (obj?.realtime_ad_video_stall_time) {
    obj.realtime_ad_video_stall_time = 0;
  }
  if (obj?.realtime_ad_timeout_duration) {
    obj.realtime_ad_timeout_duration = 0;
  }
  if (obj?.ads?.length > 0) {
    for (let item of obj.ads) {
      item.displaytime = 0;
      item.displayintervel = 31536000;
      item.allowdaydisplaynum = 0;
      item.begintime = "2040-01-01 00:00:00";
      item.endtime = "2040-01-01 23:59:59";
    }
  }
  $done({ body: JSON.stringify(obj) + "OK" });
} else {
  let obj = JSON.parse(body);
  if (url.includes("/2/cardlist")) {
    if (obj?.top) {
      delete obj.top; // 发现页 趋势 顶部头图
    }
    if (obj?.cards?.length > 0) {
      let newCards = [];
      for (let card of obj.cards) {
        if (card?.card_group?.length > 0) {
          let newGroup = [];
          for (let group of card.card_group) {
            let cardType = group.card_type;
            // 120,145 视频版块轮播图 192横版热门视频 电影 颜值 电视剧等
            if ([120, 145, 192].includes(cardType)) {
              continue;
            }
            // 我的热搜 查看更多热搜
            if (cardType === 6) {
              continue;
            }
            if (group?.mblog) {
              removeAvatar(group?.mblog); // 卡片挂件,关注按钮
            }
            newGroup.push(group);
          }
          card.card_group = newGroup;
          newCards.push(card);
        } else {
          let cardType = card.card_type;
          // 17猜你想搜 58搜索偏好设置
          if ([17, 58].includes(cardType)) {
            continue;
          }
          if (card?.mblog) {
            removeAvatar(card?.mblog); // 卡片挂件,关注按钮
          }
          newCards.push(card);
        }
      }
      obj.cards = newCards;
    }
  } else if (url.includes("/2/checkin/show")) {
    // 首页签到
    if (obj?.show) {
      obj.show = 0;
    }
    if (obj?.show_time) {
      obj.show_time = 0;
    }
  } else if (url.includes("/2/client/publisher_list")) {
    // 首页右上角按钮
    if (obj?.elements?.length > 0) {
      obj.elements = obj.elements.filter((i) => ["写微博", "图片", "视频"].includes(i?.app_name));
    }
  } else if (url.includes("/2/comments/build_comments")) {
    // 评论区
    if (obj?.datas?.length > 0) {
      let newItems = [];
      for (let item of obj.datas) {
        if (item?.data) {
          if (!isAd(item?.data)) {
            if (item?.data?.comment_bubble) {
              delete item.data.comment_bubble; // 评论气泡
            }
            if (item?.data?.comment_bullet_screens_message) {
              delete item.data.comment_bullet_screens_message; // 评论弹幕
            }
            if (item?.data?.hot_icon) {
              delete item.data.hot_icon; // 热评小图标 弹幕 首评
            }
            if (item?.data?.vip_button) {
              delete item.data.vip_button; // 会员气泡按钮
            }
            // 微博伪装评论
            if (item?.data?.user) {
              removeAvatar(item?.data); // 头像挂件,关注按钮
              if (/(超话社区|微博)/.test(item?.data?.user?.name)) {
                continue;
              }
            }
            // 6为你推荐更多精彩内容 15过滤提示 41评论区氛围调查
            if ([6, 15, 41].includes(item?.type)) {
              continue;
            }
            if (item.hasOwnProperty("adType")) {
              continue;
            }
            newItems.push(item);
          }
        }
      }
      obj.datas = newItems;
    } else if (obj?.root_comments?.length > 0) {
      let newItems = [];
      for (let item of obj.root_comments) {
        if (!isAd(item)) {
          if (item?.comment_bubble) {
            delete item.comment_bubble; // 评论气泡 新版本
          }
          if (item?.data?.comment_bubble) {
            delete item.data.comment_bubble; // 评论气泡
          }
          if (item?.data?.comment_bullet_screens_message) {
            delete item.data.comment_bullet_screens_message; // 评论弹幕
          }
          if (item?.data?.hot_icon) {
            delete item.data.hot_icon; // 热评小图标 弹幕 首评
          }
          if (item?.data?.vip_button) {
            delete item.data.vip_button; // 会员气泡按钮
          }
          // 微博伪装评论
          if (item.user) {
            removeAvatar(item); // 头像挂件,关注按钮
            if (["超话社区", "微博视频"].includes(item?.user?.name)) {
              continue;
            }
          }
          newItems.push(item);
        }
      }
      obj.root_comments = newItems;
    } else if (obj?.comments?.length > 0) {
      let newItems = [];
      for (let item of obj.comments) {
        if (item?.reply_comment?.comment_badge) {
          delete item.reply_comment.comment_badge;
        }
        if (item?.user?.icons) {
          delete item.user.icons;
        }
        newItems.push(item);
      }
      obj.comments = newItems;
    }
    if (obj?.rootComment) {
      if (obj?.rootComment?.comment_bubble) {
        delete obj.rootComment.comment_bubble;
      }
    }
    if (obj?.status?.page_info) {
      removeVoteInfo(obj?.status); // 投票窗口
    }
  } else if (url.includes("/2/container/asyn")) {
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        removeAvatar(item?.data); // 关注按钮
        if (/infeed_may_interest_in/.test(item?.itemId)) {
          // 你可能感兴趣的超话
          continue;
        }
        if (item?.itemId === null) {
          // 横版博主卡片
          continue;
        }
        if (item?.items?.length > 0) {
          for (let i of item.items) {
            removeAvatar(i?.data); // 背景卡片
            removeVoteInfo(i?.data); // 投票窗口
          }
        }
        newItems.push(item);
      }
      obj.items = newItems;
    }
  } else if (url.includes("/2/direct_messages/user_list")) {
    if (obj?.user_list?.length > 0) {
      obj.user_list = obj.user_list.filter((i) => !["活动通知", "闪聊"].includes(i?.user?.name));
    }
  } else if (url.includes("/2/flowlist")) {
    // 关注列表
    if (obj?.items?.length > 0) {
      for (let item of obj.items) {
        if (item?.items?.length > 0) {
          for (let i of item.items) {
            removeAvatar(i?.data); // 背景卡片
            removeVoteInfo(i?.data); // 投票窗口
          }
        }
      }
    }
    if (obj?.channelInfo?.channels?.length > 0) {
      let newTabs = [];
      for (let tab of obj.channelInfo.channels) {
        if (/_selfrecomm/.test(tab?.flowId)) {
          // 关注页推荐tab
          continue;
        } else if (/_chaohua/.test(tab?.flowId)) {
          // 关注页超话tab
          continue;
        } else {
          newTabs.push(tab);
        }
      }
      obj.channelInfo.channels = newTabs;
    }
  } else if (url.includes("/2/flowpage")) {
    // 热搜列表
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        if (item?.data?.itemid === "hot-search-push-notice") {
          // 开启推送通知的提示
          continue;
        }
        if (item?.items?.length > 0) {
          let newII = [];
          for (let i of item.items) {
            if (i?.data.hasOwnProperty("promotion")) {
              // 热搜列表中的推广项目
              continue;
            } else if (/_img_search_stick/.test(i?.data?.pic)) {
              // 手动置顶的微博热搜
              continue;
            } else {
              newII.push(i);
            }
          }
          item.items = newII;
        }
        newItems.push(item);
      }
      obj.items = newItems;
    }
  } else if (url.includes("/2/groups/allgroups/v2")) {
    // 顶部tab
    if (obj?.pageDatas?.length > 0) {
      // homeFeed关注 homeHot推荐
      let newTabs = [];
      for (let item of obj.pageDatas) {
        if (item?.pageDataType === "homeExtend") {
          // 多余的推广tab 比如华为Mate60
          continue;
        } else {
          if (item?.categories?.length > 0) {
            let newCates = [];
            for (let i of item.categories) {
              if (i?.title === "默认分组") {
                if (i?.pageDatas?.length > 0) {
                  let newII = [];
                  for (let ii of i.pageDatas) {
                    if (["最新微博", "特别关注", "好友圈", "视频"].includes(ii?.title)) {
                      // 白名单列表
                      newII.push(ii);
                    } else {
                      continue;
                    }
                    if (ii?.title === "最新微博") {
                      ii.title = "微博";
                    }
                  }
                  i.pageDatas = newII;
                }
              }
              newCates.push(i);
            }
            item.categories = newCates;
          }
          newTabs.push(item);
        }
      }
      obj.pageDatas = newTabs;
    }
  } else if (url.includes("/2/messageflow/notice")) {
    // 消息动态页
    if (obj?.messages?.length > 0) {
      let newMsgs = [];
      for (let msg of obj.messages) {
        if (msg?.msg_card?.ad_tag) {
          continue;
        } else {
          newMsgs.push(msg);
        }
      }
      obj.messages = newMsgs;
    }
  } else if (url.includes("/2/page")) {
    // 搜索页列表,超话
    if (obj?.cards?.length > 0) {
      if (obj?.cards?.[0]?.card_group?.length > 0) {
        obj.cards[0].card_group = obj.cards[0].card_group.filter(
          (c) => !(c?.actionlog?.ext?.includes("ads_word") || c?.itemid?.includes("t:51") || c?.itemid?.includes("ads_word"))
        );
      }
      obj.cards = obj.cards.filter(
        (i) =>
          !(
            i?.itemid?.includes("feed_-_invite") || // 超话里的好友
            i?.itemid?.includes("infeed_friends_recommend") || // 好友关注
            i?.itemid?.includes("infeed_may_interest_in") || // 你可能感兴趣的超话
            i?.itemid?.includes("infeed_pagemanual3") || // 手动区域3
            i?.itemid?.includes("infeed_weibo_mall") || // 微博小店
            i?.mblog?.mblogtypename?.includes("广告")
          )
      );
    } else if (obj?.card_group?.length > 0) {
      obj.card_group = obj.card_group.filter((i) => i?.desc?.includes("你可能感兴趣的超话"));
    }
  } else if (url.includes("/2/profile/container_timeline")) {
    if (obj?.loadedInfo?.follow_guide_info) {
      delete obj.loadedInfo.follow_guide_info; // 个人主页关注弹窗
    }
    // 个人主页信息流
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        if (item?.data?.left_hint?.[0]?.content === "全部微博(0)" && item?.data?.card_type === 216) {
          // 全部微博为0的博主
          break;
        } else if (/内容/.test(item?.data?.name) && item?.data?.card_type === 58) {
          // 个人微博页刷完后的推荐微博
          break;
        } else {
          if (item?.category === "card") {
            // 58微博展示时间段提示 216筛选按钮
            if ([58, 216].includes(item?.data?.card_type)) {
              if (/没有公开博文，为你推荐以下精彩内容/.test(item?.data?.name)) {
                // 个人微博页刷完后的推荐信息流
                continue;
              }
            }
            newItems.push(item);
          } else if (item?.category === "group") {
            // 遍历group,保留置顶微博
            if (item?.header?.data?.icon) {
              delete item.header.data.icon; // 置顶微博背景图
            }
            if (item?.itemId?.includes("INTEREST_PEOPLE")) {
              // 可能感兴趣的人
              continue;
            }
            if (item?.profile_type_id === "weibo_cardpics") {
              // 近期热门 精选微博 那年今日等横版内容
              continue;
            }
            if (item?.items?.length > 0) {
              let newII = [];
              for (let ii of item.items) {
                if (ii?.category === "feed") {
                  removeAvatar(ii?.data); // 头像挂件,关注按钮
                  removeFeedAd(ii?.data); // 信息流推广
                  removeVoteInfo(ii?.data); // 投票窗口
                  // 评论指引
                  if (ii?.data?.enable_comment_guide) {
                    ii.data.enable_comment_guide = false;
                  }
                  newII.push(ii);
                } else if (ii?.category === "card") {
                  if ([10, 48, 176].includes(ii?.data?.card_type)) {
                    // 最近关注与互动过的博主
                    continue;
                  }
                  if (ii?.data?.rightImage) {
                    delete ii.data.rightImage; // 新版置顶微博皇冠
                  }
                  if (ii?.data?.backgroundImage) {
                    delete ii.data.backgroundImage; // 新版置顶微博背景图
                  }
                  newII.push(ii);
                }
              }
              item.items = newII;
            }
            newItems.push(item);
          } else if (item?.category === "feed") {
            if (!isAd(item?.data)) {
              removeFeedAd(item?.data); // 信息流推广
              removeVoteInfo(item?.data); // 投票窗口
              if (item?.data?.source?.includes("生日动态")) {
                // 移除生日祝福微博
                continue;
              }
              if (item?.data?.title?.text !== "热门" && item?.data?.title?.structs?.length > 0) {
                // 移除赞过的微博 保留热门内容
                continue;
              }
              newItems.push(item);
            }
          }
        }
      }
      obj.items = newItems;
    }
  } else if (url.includes("/2/profile/dealatt") || url.includes("/2/friendships/")) {
    // 个人主页点击关注后展示菜单
    if (obj?.cards?.length > 0) {
      obj.cards = []; // 相关推荐卡片
    }
    if (obj?.toolbar_menus_new?.items?.length > 0) {
      let toolbar = obj.toolbar_menus_new;
      // 底部菜单
      let newTools = [];
      for (let item of toolbar.items) {
        if (item?.identifier === "recommend") {
          // 相关推荐
          continue;
        } else if (/reward_/.test(item?.identifier)) {
          // 赞赏
          continue;
        } else {
          newTools.push(item);
        }
      }
      toolbar.items = newTools;
    }
  } else if (url.includes("/2/profile/me")) {
    // 我的页面
    if (obj?.vipHeaderBgImage) {
      delete obj.vipHeaderBgImage;
    }
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        let itemId = item.itemId;
        if (itemId === "profileme_mine") {
          if (item?.header) {
            if (item?.header?.vipView) {
              delete item.header.vipView;
            }
            if (item?.header?.vipCenter) {
              delete item.header.vipCenter;
            }
            if (item?.header?.vipIcon) {
              delete item.header.vipIcon;
            }
          }
          if (item?.items?.length > 0) {
            for (let d of item.items) {
              if (d.itemId === "mainnums_friends") {
                let s = d.click.modules[0].scheme;
                d.click.modules[0].scheme = s.replace("231093_-_selfrecomm", "231093_-_selffollowed");
              }
            }
          }
          newItems.push(item);
        } else if (itemId === "100505_-_top8") {
          if (item?.items?.length > 0) {
            item.items = item.items.filter(
              (i) =>
                i?.itemId === "100505_-_album" || // 我的相册
                i?.itemId === "100505_-_like" || // 赞/收藏
                i?.itemId === "100505_-_watchhistory" || // 浏览记录
                i?.itemId === "100505_-_draft" // 草稿箱
              // i?.itemId === "100505_-_pay" || // 我的钱包
              // i?.itemId === "100505_-_ordercenter" || // 我的订单
              // i?.itemId === "100505_-_productcenter" || // 创作中心
              // i?.itemId === "100505_-_promote" || // 广告中心
            );
          }
          newItems.push(item);
        } else if (itemId === "100505_-_manage") {
          if (item?.style) {
            delete item.style;
          }
          if (item?.images) {
            delete item.images; // 移除分隔符的点点点
          }
          newItems.push(item);
        } else if (itemId === "100505_-_manage2") {
          if (item?.footer) {
            delete item.footer; // 移除面板样式
          }
          if (item?.body) {
            delete item.body; // 移除框内推广
          }
          newItems.push(item);
        } else if (itemId === "100505_-_chaohua" || itemId === "100505_-_recentlyuser") {
          newItems.push(item);
        } else {
          // 移除其他推广
          continue;
        }
      }
      obj.items = newItems;
    }
  } else if (url.includes("/2/profile/statuses/tab")) {
    if (obj?.cards?.length > 0) {
      let newCards = [];
      for (let card of obj.cards) {
        if (card?.card_group?.length > 0) {
          let newGroup = [];
          for (let group of card.card_group) {
            let cardType = group.card_type;
            // 22那年今天
            if (cardType === 22) {
              continue;
            }
            if (group?.mblog) {
              removeAvatar(group?.mblog); // 卡片挂件,关注按钮
              removeVoteInfo(group?.mblog); // 投票窗口
            }
            newGroup.push(group);
          }
          card.card_group = newGroup;
          newCards.push(card);
        } else {
          if (card?.mblog) {
            removeAvatar(card?.mblog); // 卡片挂件,关注按钮
            removeVoteInfo(card?.mblog); // 投票窗口
          }
          newCards.push(card);
        }
      }
      obj.cards = newCards;
    }
    if (obj?.cardlistInfo?.page_type === "08") {
      delete obj.cardlistInfo; // 我的热搜
    }
  } else if (url.includes("/2/profile/userinfo")) {
    // 个人详情页
    if (obj?.header?.data?.userInfo?.avatar_extend_info) {
      delete obj.header.data.userInfo.avatar_extend_info; // 头像挂件
    }
    if (obj?.profileSkin?.data) {
      delete obj.profileSkin.data; // 全套个性皮肤
    }
    if (obj?.footer?.data) {
      let toolbar = obj.footer.data.toolbar_menus_new;
      // 底部菜单项目
      if (toolbar?.lottie_guide) {
        delete toolbar.lottie_guide; // 弹窗
      }
      if (toolbar?.servicePopup?.subData) {
        delete toolbar.servicePopup.subData; // 服务悬浮窗口
      }
      if (toolbar?.items?.length > 0) {
        let newTools = [];
        for (let item of toolbar.items) {
          if (item?.identifier === "recommend") {
            // 相关推荐
            continue;
          } else if (item?.identifier === "urge") {
            // 催更
            continue;
          } else if (/reward_/.test(item?.identifier)) {
            // 赞赏
            continue;
          } else {
            newTools.push(item);
          }
        }
        toolbar.items = newTools;
      }
    }
  } else if (url.includes("/2/push/active")) {
    if (obj?.compose_add_guide) {
      delete obj.compose_add_guide; // 过期的情人节红包
    }
    // delete obj.feed_redpacket; // 首页右上角红包图标
    if (obj?.floating_windows_force_show) {
      delete obj.floating_windows_force_show; // 强制展示的悬浮窗
    }
    if (obj?.interceptad) {
      delete obj.interceptad; // 可能是首页签到弹窗
    }
    if (obj?.interceptad_cardlist) {
      delete obj.interceptad_cardlist; // 可能是首页签到弹窗
    }
    if (obj?.loginconfig) {
      delete obj.loginconfig; // 登录领红包
    }
    if (obj?.profile_lotties) {
      delete obj.profile_lotties; // 个人主页头像挂件素材
    }
    if (obj?.ug_red_paper) {
      delete obj.ug_red_paper; // 可能是首页签到弹窗
    }
    if (obj?.weibo_pic_banner) {
      delete obj.weibo_pic_banner; // 微博种草晒图
    }
    // 禁用所有的悬浮窗
    if (obj?.disable_floating_window) {
      obj.disable_floating_window = "1";
    }
    // 首页右上角红包图标
    if (obj?.feed_redpacket) {
      obj.feed_redpacket.starttime = "2208960000";
      obj.feed_redpacket.interval = "31536000";
      obj.feed_redpacket.endtime = "2209046399";
      if (obj?.feed_redpacket?.finish_icon) {
        delete obj.feed_redpacket.finish_icon;
      }
      if (obj?.feed_redpacket?.guide) {
        delete obj.feed_redpacket.guide;
      }
      if (obj?.feed_redpacket?.icon) {
        delete obj.feed_redpacket.icon;
      }
      if (obj?.feed_redpacket?.pre_icon) {
        delete obj.feed_redpacket.pre_icon;
      }
    }
    if (obj?.floating_window_for_live_streaming) {
      obj.floating_window_for_live_streaming = false;
    }
    if (obj?.floating_window_show_interval) {
      obj.floating_window_show_interval = 31536000;
    }
    if (obj?.floating_windows?.length > 0) {
      obj.floating_windows = obj.floating_windows.filter((i) => !/(?:^ad_?|red_pocket|ug_high_priority)/.test(i?.subtype));
    }
  } else if (url.includes("/2/search/")) {
    // 搜索页信息流
    if (url.includes("container_timeline")) {
      if (obj?.loadedInfo) {
        delete obj.loadedInfo;
      }
      if (obj?.items?.length > 0) {
        let newItems = [];
        for (let item of obj.items) {
          if (item?.category === "feed") {
            if (!isAd(item?.data)) {
              removeFeedAd(item?.data); // 信息流推广
              newItems.push(item);
            }
          } else if (item?.category === "card") {
            // 19热议等tab 22商业推广 118横版广告图片 206,249横版视频广告 208实况热聊 217错过了热词 236微博趋势 261奥运滚动横幅
            if ([19, 22, 118, 206, 208, 217, 236, 249, 261].includes(item?.data?.card_type)) {
              continue;
            } else if (item?.data?.itemid === "ads_slide") {
              // 商业推广 主图 附图
              continue;
            } else if (item?.data?.cate_id === "1114") {
              // 微博趋势标题
              continue;
            } else if (item?.data.hasOwnProperty("rank")) {
              // 奥运等排行榜
              continue;
            } else {
              newItems.push(item);
            }
          } else if (item?.category === "cell") {
            // 保留信息流分割线
            newItems.push(item);
          } else if (item?.category === "group") {
            if (item?.item_category === "insert_item") {
              // 信息流内部嵌入的“微博热搜”
              continue;
            } else {
              if (item?.items?.length > 0) {
                let newII = [];
                for (let ii of item.items) {
                  // 118横版广告图片 182热议话题 217错过了热词 247横版视频广告 264微博趋势
                  if ([118, 182, 192, 217, 247, 264].includes(ii?.data?.card_type)) {
                    continue;
                  } else if (ii?.data?.cate_id === "1114") {
                    // 微博趋势
                    continue;
                  } else {
                    removeFeedAd(ii?.data);
                    newII.push(ii);
                  }
                }
                item.items = newII;
              }
            }
            newItems.push(item);
          }
        }
        obj.items = newItems;
      }
    } else if (url.includes("finder")) {
      if (obj?.channelInfo?.channels?.length > 0) {
        let newChannels = [];
        for (let channel of obj.channelInfo.channels) {
          // 顶部标签栏 白名单
          if (["band_channel", "discover_channel", "trends_channel"].includes(channel?.key)) {
            let payload = channel.payload;
            if (payload) {
              if (payload?.loadedInfo) {
                // 去除搜索框填充词
                if (payload?.loadedInfo?.searchBarContent?.length > 0) {
                  payload.loadedInfo.searchBarContent = [];
                }
                if (payload?.loadedInfo?.headerBack?.channelStyleMap) {
                  delete payload.loadedInfo.headerBack.channelStyleMap; // 去除搜索背景图片
                }
                if (payload?.loadedInfo?.searchBarStyleInfo) {
                  delete payload.loadedInfo.searchBarStyleInfo; // 搜索框样式
                }
              }
              if (payload?.items?.length > 0) {
                let newItems = [];
                for (let item of payload.items) {
                  if (item?.category === "feed") {
                    if (!isAd(item?.data)) {
                      removeFeedAd(item.data); // 信息流推广
                      // removeAvatar(item.data); // 头像挂件
                      newItems.push(item);
                    }
                  } else if (item?.category === "card") {
                    // 19热议等tab 22商业推广 118横版广告图片 206,249横版视频广告 208实况热聊 217错过了热词 236微博趋势 261奥运滚动横幅
                    if ([19, 22, 118, 206, 208, 217, 236, 249, 261].includes(item?.data?.card_type)) {
                      continue;
                    } else if (item?.data?.itemid === "ads_slide") {
                      // 商业推广 主图 附图
                      continue;
                    } else if (item?.data?.cate_id === "1114") {
                      // 微博趋势标题
                      continue;
                    } else if (item?.data.hasOwnProperty("rank")) {
                      // 奥运等排行榜
                      continue;
                    } else {
                      newItems.push(item);
                    }
                  } else if (item?.category === "cell") {
                    // 保留信息流分割线
                    newItems.push(item);
                  } else if (item?.category === "group") {
                    if (item?.item_category === "insert_item") {
                      // 信息流内部嵌入的“个性化开关”
                      continue;
                    } else {
                      if (item?.items?.length > 0) {
                        let newII = [];
                        for (let ii of item.items) {
                          // 118横版广告图片 182热议话题 192横版好看视频 217错过了热词 247横版视频广告 264微博趋势
                          if ([118, 182, 192, 217, 247, 264].includes(ii?.data?.card_type)) {
                            continue;
                          } else if (ii?.data?.cate_id === "1114") {
                            // 微博趋势
                            continue;
                          } else {
                            removeFeedAd(ii?.data); // 头像挂件
                            newII.push(ii);
                          }
                        }
                        item.items = newII;
                      }
                    }
                    newItems.push(item);
                  }
                }
                payload.items = newItems;
              }
            }
            newChannels.push(channel);
          } else {
            continue;
          }
        }
        obj.channelInfo.channels = newChannels;
      }
      if (obj?.channelInfo?.moreChannels) {
        // 更多版块
        delete obj.channelInfo.moreChannels;
      }
      if (obj?.header?.insert_data) {
        delete obj.header.insert_data;
      }
      if (obj?.header?.data?.items?.length > 0) {
        // 2025-01-24更新 新版本finder_window
        let newItems = [];
        for (let item of obj.header.data.items) {
          if (item?.category === "card") {
            if ([19, 22, 118, 206, 208, 217, 236, 249, 261].includes(item?.data?.card_type)) {
              continue;
            }
            if (item?.data.hasOwnProperty("rank")) {
              // 各种赛事排行榜
              continue;
            }
          } else if (item?.category === "group") {
            if (item?.items?.length > 0) {
              let newII = [];
              for (let i of item.items) {
                if ([118, 182, 192, 217, 247, 264].includes(i?.data?.card_type)) {
                  continue;
                } else {
                  newII.push(i);
                }
              }
              item.items = newII;
            }
          }
          newItems.push(item);
        }
        obj.header.data.items = newItems;
      }
    }
  } else if (url.includes("/2/searchall")) {
    if (obj?.header?.data) {
      // 商品推广头部淘宝跳转
      const items = ["bg_img", "background_scheme", "background_url"];
      for (let i of items) {
        delete obj.header.data[i];
      }
    }
    if (obj?.loadedInfo?.serviceMap?.layer) {
      delete obj.loadedInfo.serviceMap.layer; // 搜索结果 悬浮窗
    }
    if (obj?.footer) {
      // 讨论区动画
      if (obj?.footer?.data?.bg_lottie) {
        delete obj.footer.data.bg_lottie;
      }
      if (obj?.footer?.data?.bg_lottie_dark) {
        delete obj.footer.data.bg_lottie_dark;
      }
      if (obj?.footer?.data?.discuss_avatars) {
        delete obj.footer.data.discuss_avatars; // 进入讨论区气泡动画头像
      }
      if (obj?.footer?.data?.menus?.length > 0) {
        // 底部菜单
        obj.footer.data.menus = obj.footer.data.menus.filter((i) => !/\d+_ai\./.test(i?.pic));
      }
    }
    if (obj?.cards?.length > 0) {
      let newCards = [];
      for (let card of obj.cards) {
        if (card?.card_group?.length > 0) {
          let newGroup = [];
          for (let group of card.card_group) {
            if (group?.card_type === 22) {
              // 先筛选card_group里面的card_type
              // 横版广告图
              continue;
            } else if (group?.card_type === 42 && group?.title_extra_text === "广告") {
              // 推荐品牌广告
              continue;
            } else if (group?.card_type === 3 && group?.pics?.length > 0) {
              // 推荐品牌广告图
              continue;
            } else {
              if (group?.mblog) {
                // 有mblog字段的过滤广告
                if (!isAd(group?.mblog)) {
                  if (group?.mblog?.title_source) {
                    delete group.mblog.title_source;
                  }
                  if (group?.mblog?.source_tag_struct) {
                    delete group.mblog.source_tag_struct;
                  }
                  if (group?.mblog?.extend_info) {
                    delete group.mblog.extend_info;
                  }
                  if (group?.mblog?.common_struct) {
                    delete group.mblog.common_struct; // 商品橱窗
                  }
                  removeAvatar(group?.mblog); // 头像挂件,关注按钮
                  removeVoteInfo(group?.mblog); // 投票窗口
                  // 新版热推
                  if (group?.mblog?.is_ad === 1) {
                    continue;
                  }
                  newGroup.push(group);
                }
              } else {
                newGroup.push(group); // 没有mblog字段的全部推送
              }
            }
          }
          card.card_group = newGroup;
          newCards.push(card);
        } else {
          if (card?.mblog) {
            if (!isAd(card?.mblog)) {
              removeAvatar(card?.mblog); // 头像挂件,关注按钮
              if (card?.mblog?.title_source) {
                delete card.mblog.title_source;
              }
              if (card?.mblog?.source_tag_struct) {
                delete card.mblog.source_tag_struct;
              }
              if (card?.mblog?.extend_info) {
                delete card.mblog.extend_info;
              }
              if (card?.mblog?.common_struct) {
                delete card.mblog.common_struct; // 商品橱窗
              }
              removeVoteInfo(card?.mblog); // 投票窗口
              // 隐藏在 cards 里面的投票窗口
              if (card?.mblog?.page_info?.cards?.length > 0) {
                let page = card.mblog.page_info;
                for (let i of page.cards) {
                  if (i?.media_info?.vote_info) {
                    delete i.media_info.vote_info;
                  }
                }
              }
              newCards.push(card);
            }
          }
        }
      }
      obj.cards = newCards;
    }
    // 13.11.1版本obj下的cards变为了items 2023-11-26
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        if (!isAd(item?.data)) {
          if (item?.category === "feed") {
            removeFeedAd(item?.data); // 信息流推广
            removeVoteInfo(item?.data); // 投票窗口
            newItems.push(item);
          } else if (item?.category === "group") {
            if (item?.items?.length > 0) {
              let newII = [];
              for (let ii of item.items) {
                if (ii?.cate_id === "638" && ii?.readtimetype === "card") {
                  // 大家都在问
                  continue;
                } else {
                  if (!isAd(ii?.data)) {
                    // removeAvatar(ii?.data);
                    removeFeedAd(ii?.data); // 商品橱窗
                    // 3推广卡片 17相关搜索 22广告图 25智搜总结 30推荐博主 42,236智搜问答 89商品推广视频 101大家都在问 206推广视频
                    if ([3, 17, 22, 30, 42, 89, 101, 206].includes(ii?.data?.card_type)) {
                      continue;
                    } else if (ii?.data?.card_type === 4 && ii?.data?.cate_id === "640") {
                      // 大家都在问
                      continue;
                    } else if (ii?.data?.card_type === 42 && ii?.data?.is_ads === true) {
                      // 商品推广desc
                      continue;
                    }
                    newII.push(ii);
                  }
                }
              }
              item.items = newII;
            }
            newItems.push(item);
          } else {
            newItems.push(item);
          }
        }
      }
      obj.items = newItems;
    }
  } else if (url.includes("/2/shproxy/chaohua/discovery/searchactive")) {
    // 超话搜索页
    if (obj?.items?.length > 0) {
      // 1007 可能感兴趣的话题
      obj.items = obj.items.filter((i) => i?.data?.card_type !== 1007);
    }
  } else if (url.includes("/2/statuses/container_detail?")) {
    // 新版 微博详情页
    if (obj?.pageHeader?.data?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.pageHeader.data.items) {
        if (item?.category === "card" && item?.data?.is_ad_card === 1) {
          // 底部卡片广告
          continue;
        } else if (item?.category === "card" && item?.data?.card_type === 227) {
          // 铁粉参与互动
          continue;
        } else if (item?.category === "group" && item?.items?.length > 0) {
          // 博主好物种草 关注推荐
          continue;
        } else if (item?.category === "wboxcard" && item?.data?.card_type === 236) {
          // 底部横版广告
          continue;
        } else if (item?.data?.itemid === "top_searching" && item?.data?.card_type === 248) {
          // 底部大家都在搜
          continue;
        } else {
          newItems.push(item);
        }
      }
      obj.pageHeader.data.items = newItems;
    }
    if (obj?.detailInfo?.extend?.ai_search_share) {
      // 底部智搜
      delete obj.detailInfo.extend.ai_search_share;
    }
    if (obj?.detailInfo?.extend?.follow_data) {
      // 关注弹窗
      delete obj.detailInfo.extend.follow_data;
    }
    if (obj?.detailInfo?.extend?.reward_info) {
      // 赞赏信息
      delete obj.detailInfo.extend.reward_info;
    }
    if (obj?.detailInfo?.extend?.sharecontent) {
      // 微信领红包
      delete obj.detailInfo.extend.sharecontent;
    }
    if (obj?.detailInfo?.status?.reward_info) {
      // 赞赏信息
      delete obj.detailInfo.status.reward_info;
    }
  } else if (url.includes("/2/statuses/comments_expand_child")) {
    // 评论区更多回复 二级页面
    if (obj?.items?.length > 0) {
      for (let item of obj.items) {
        removeAvatar(item?.data); // 头像挂件,关注按钮
      }
    }
  } else if (url.includes("/2/statuses/container_detail_comment")) {
    // 新版 微博评论区
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        if (item?.type !== "trend" && item?.type !== "comment_header_tip") {
          // 广告 铁粉标记
          if (item?.data) {
            removeAvatar(item?.data); // 头像挂件,关注按钮
            if (item?.data?.card_type === 236 || item?.data?.itemid === "ai_summary_entrance_real_show") {
              // 罗伯特总结
              continue;
            }
            if (item?.data?.comment_bubble) {
              delete item.data.comment_bubble; // 评论气泡
            }
            if (item?.data?.comment_bullet_screens_message) {
              delete item.data.comment_bullet_screens_message; // 评论弹幕
            }
            if (item?.data?.hot_icon) {
              delete item.data.hot_icon; // 热评小图标 弹幕 首评
            }
            if (item?.data?.vip_button) {
              delete item.data.vip_button; // 会员气泡按钮
            }
          }
          if (item?.items?.length > 0) {
            let newII = [];
            for (let ii of item.items) {
              if (ii?.data) {
                removeAvatar(ii?.data); // 头像挂件,关注按钮
                if (/微博智搜/.test(ii?.data?.user?.name)) {
                  continue;
                }
                if (ii?.data?.comment_bubble) {
                  delete ii.data.comment_bubble; // 评论气泡
                }
                if (ii?.data?.comment_bullet_screens_message) {
                  delete ii.data.comment_bullet_screens_message; // 评论弹幕
                }
                if (ii?.data?.hot_icon) {
                  delete ii.data.hot_icon; // 热评小图标 弹幕 首评
                }
                if (ii?.data?.vip_button) {
                  delete ii.data.vip_button; // 会员气泡按钮
                }
              }
              newII.push(ii);
            }
            item.items = newII;
          }
          newItems.push(item);
        }
      }
      obj.items = newItems;
    }
  } else if (url.includes("/2/statuses/container_timeline_hot") || url.includes("/2/statuses/unread_hot_timeline")) {
    // 首页推荐tab信息流
    for (let s of ["ad", "advertises", "trends", "headers"]) {
      if (obj?.[s]) {
        delete obj[s];
      }
    }
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        if (!isAd(item?.data)) {
          if (item?.category === "feed") {
            removeFeedAd(item?.data); // 信息流推广
            removeVoteInfo(item?.data); // 投票窗口
            newItems.push(item);
          } else {
            // 移除其他推广
            continue;
          }
        }
      }
      obj.items = newItems;
    }
    if (obj?.statuses?.length > 0) {
      let newStatuses = [];
      for (let item of obj.statuses) {
        if (!isAd(item)) {
          removeFeedAd(item); // 信息流推广
          newStatuses.push(item);
        }
      }
      obj.statuses = newStatuses;
    }
  } else if (url.includes("/2/statuses/container_timeline?") || url.includes("/2/statuses/container_timeline_unread")) {
    if (obj?.loadedInfo?.headers) {
      delete obj.loadedInfo.headers; // 首页关注tab信息流
    }
    if (obj?.common_struct) {
      delete obj.common_struct; // 商品橱窗
    }
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        if (!isAd(item?.data) && !isAd(item?.status)) {
          if (item?.category === "dynamic") {
            if (item?.status?.action_button_icon_dic) {
              delete item.status.action_button_icon_dic;
            }
            removeFeedAd(item?.status); // 信息流推广
            removeVoteInfo(item?.status); // 投票窗口
            if (item.status?.title?.structs) {
              // 移除 未关注人消息 (你关注的博主，他自己关注的别的博主的微博消息)
              continue;
            }
            // 快转内容
            if (item?.status?.screen_name_suffix_new?.length > 0) {
              if (item?.status?.screen_name_suffix_new?.[3]?.content === "快转了") {
                continue;
              }
            }
            // 美妆精选季
            if (item?.status?.title?.text?.includes("精选")) {
              continue;
            }
            // 未关注博主
            if (item?.status?.user?.following === false) {
              continue;
            }
            // 关闭关注推荐
            if (item?.status?.user?.unfollowing_recom_switch === 1) {
              item.status.user.unfollowing_recom_switch = 0;
            }
            // 博主top100
            if (item?.status?.tag_struct?.length > 0) {
              item.status.tag_struct = [];
            }
            newItems.push(item);
          } else if (item?.category === "feed") {
            if (item?.data?.action_button_icon_dic) {
              delete item.data.action_button_icon_dic;
            }
            removeFeedAd(item?.data); // 信息流推广
            removeVoteInfo(item?.data); // 投票窗口
            if (item.data?.title?.structs) {
              // 移除 未关注人消息 (你关注的博主，他自己关注的别的博主的微博消息)
              continue;
            }
            // 快转内容
            if (item?.data?.screen_name_suffix_new?.length > 0) {
              if (item?.data?.screen_name_suffix_new?.[3]?.content === "快转了") {
                continue;
              }
            }
            // 美妆精选季
            if (item?.data?.title?.text?.includes("精选")) {
              continue;
            }
            // 未关注博主
            if (item?.data?.user?.following === false) {
              continue;
            }
            // 关闭关注推荐
            if (item?.data?.user?.unfollowing_recom_switch === 1) {
              item.data.user.unfollowing_recom_switch = 0;
            }
            // 博主top100
            if (item?.data?.tag_struct?.length > 0) {
              item.data.tag_struct = [];
            }
            newItems.push(item);
          } else if (item?.category === "feedBiz") {
            newItems.push(item); // 管理特别关注按钮
          } else {
            // 移除其他推广
            continue;
          }
        }
      }
      obj.items = newItems;
    }
  } else if (url.includes("/2/statuses/container_timeline_topic")) {
    // 超话信息流
    if (obj?.header?.data?.follow_guide_info) {
      delete obj.header.data.follow_guide_info; // 底部弹出的关注按钮
    }
    if (obj?.items?.length > 0) {
      let newItems = [];
      for (let item of obj.items) {
        if (item?.category === "feed") {
          removeAvatar(item?.data); // 头像挂件,关注按钮
          if (!isAd(item?.data)) {
            if (item?.data?.title?.text?.includes("新人导师")) {
              // 萌新帖 互动赢新人导师
              delete item.data.title;
            }
            newItems.push(item);
          }
        } else if (item?.category === "card") {
          if ([4, 197, 236, 1012].includes(item?.data?.card_type)) {
            // 4你可能感兴趣的超话 197你可能感兴趣的超话 236壁纸故事 1012热门超话
            continue;
          } else {
            if (item?.data?.card_type === 31 && item?.data?.hotwords?.length > 0) {
              // 31 搜索框滚动热词
              item.data.hotwords = [];
            }
            if (item?.data?.card_type === 22 && item?.data.hasOwnProperty("card_ad_style")) {
              continue;
            }
            newItems.push(item);
          }
        } else if (item?.category === "group") {
          if (item?.style?.topHover) {
            delete item.style.topHover; // 空降发帖背景图
          }
          if (item?.items?.length > 0) {
            if (item?.itemId === null) {
              // 超话页顶部乱七八糟
              let newII = [];
              for (let ii of item.items) {
                if (ii?.data.hasOwnProperty("itemid")) {
                  if (ii?.data?.itemid?.includes("mine_topics")) {
                    // 保留我的超话
                    newII.push(ii);
                  } else if (ii?.data?.itemid?.includes("tab_search_input")) {
                    // 保留搜索框
                    if (ii?.data?.hotwords) {
                      ii.data.hotwords = [{ word: "搜索超话" }]; // 删除热搜词
                    }
                    newII.push(ii);
                  } else if (ii?.data?.itemid?.includes("poiRankList")) {
                    newII.push(ii); // 保留地点超话 地标人气榜
                  }
                } else {
                  newII.push(ii); // 放行无itemid字段的内容
                }
                removeAvatar(ii?.data); // 头像挂件,关注按钮
              }
              item.items = newII;
            } else {
              let newII = [];
              for (let ii of item.items) {
                if (ii?.data) {
                  if (ii?.data?.common_struct) {
                    delete ii.data.common_struct;
                  }
                  removeAvatar(ii?.data);
                  if ([1008, 1024].includes(ii?.data?.card_type)) {
                    // 1008关注你感兴趣的超话 1024超话顶部发现
                    continue;
                  } else {
                    newII.push(ii);
                  }
                }
              }
              item.items = newII;
            }
          }
          if (item?.header?.arrayText?.contents?.length > 0) {
            // 你的好友也关注了
            continue;
          }
          newItems.push(item);
        } else {
          // 移除其他推广
          continue;
        }
      }
      obj.items = newItems;
    }
  } else if (url.includes("/2/statuses/extend")) {
    // 微博详情页
    if (obj?.trend?.extra_struct?.extBtnInfo?.btn_picurl?.includes("ad")) {
      delete obj.trend;
    }
    if (obj.trend?.titles) {
      let title = obj.trend.titles.title;
      if (/(博主好物种草|相关推荐|专区)/.test(title)) {
        delete obj.trend;
      }
    }
    const item = [
      "bubble_guide_data", // 评论区弹窗
      "button_extra_info", // 推荐评论
      "display_info", // 二楼
      "extend_info", // 拓展卡片
      "floating_button", // 悬浮购物车按钮
      "follow_data", // 关注提醒
      "head_cards", // 超话投票
      "highlight", // 二楼
      "interaction_extra_info", // ai评论
      "page_alerts", // 超话新帖 新用户通知
      "reward_info", // 公益赞赏
      "source_tag_struct", // 二楼
      "top_cards" // 大家都在搜
    ];
    if (obj) {
      item.forEach((i) => {
        delete obj[i];
      });
    }
    if (obj?.custom_action_list?.length > 0) {
      let newActions = [];
      for (let item of obj.custom_action_list) {
        let type = item.type;
        let add = itemMenusConfig[type];
        if (type === "mblog_menus_copy_url") {
          newActions.unshift(item);
        } else if (add) {
          newActions.push(item);
        }
      }
      obj.custom_action_list = newActions;
    }
    if (obj?.has_common_struct) {
      obj.has_common_struct = false; // 商品橱窗
    }
    if (obj?.enable_comment_guide) {
      obj.enable_comment_guide = false; // 评论指引
    }
  } else if (url.includes("/2/statuses/repost_timeline")) {
    // 评论详情页 转发区
    if (obj?.hot_reposts?.length > 0) {
      // 样式1
      let newReposts = [];
      for (let item of obj.hot_reposts) {
        if (!isAd(item)) {
          newReposts.push(item);
        }
      }
      obj.hot_reposts = newReposts;
    }
    if (obj?.reposts?.length > 0) {
      // 样式2
      let newReposts = [];
      for (let item of obj.reposts) {
        if (!isAd(item)) {
          newReposts.push(item);
        }
      }
      obj.reposts = newReposts;
    }
  } else if (url.includes("/2/statuses/show")) {
    removeFeedAd(obj); // 信息流推广
    // 循环引用中的商品橱窗
    if (obj?.text) {
      removeFeedAd(obj.text); // 信息流推广
    }
    if (obj?.reward_info) {
      delete obj.reward_info; // 赞赏信息
    }
    // 投票窗口
    removeVoteInfo(obj);
  } else if (url.includes("/2/video/full_screen_stream")) {
    // 视频页
    if (obj?.statuses?.length > 0) {
      let newStatuses = [];
      for (let item of obj.statuses) {
        if (!isAd(item)) {
          removeAvatar(item);
          if (item?.video_info?.tags?.length > 0) {
            // 投票
            item.video_info.tags = [];
          }
          newStatuses.push(item);
        }
      }
      obj.statuses = newStatuses;
    }
  } else if (url.includes("/2/video/tiny_stream_mid_detail")) {
    if (obj?.status?.video_info?.shopping?.length > 0) {
      // 带货
      obj.status.video_info.shopping = [];
    }
    if (obj?.status?.video_info?.bottom_banner) {
      // 大家都在搜
      obj.status.video_info.bottom_banner = {};
    }
    if (obj?.status?.video_info?.float_info) {
      // 悬浮窗
      obj.status.video_info.float_info = {};
    }
  } else if (url.includes("/2/video/tiny_stream_video_list")) {
    if (obj?.statuses?.length > 0) {
      obj.statuses = []; // 移除视频自动连播
      // obj.statuses = obj.statuses.filter((m) => !(m?.mblogtypename === "广告"));
    }
    if (obj?.tab_list?.length > 0) {
      obj.tab_list = [];
    }
  } else if (url.includes("/2/!/huati/discovery_home_bottom_channels")) {
    if (obj?.button_configs) {
      delete obj.button_configs; // 超话左上角,右上角图标
    }
    // 广场页
    if (obj?.channelInfo?.channel_list?.length > 0) {
      obj.channelInfo.channel_list = obj.channelInfo.channel_list.filter((t) => t?.title !== "广场");
    }
  } else if (url.includes("/aj/appicon/list")) {
    if (obj?.data?.list?.length > 0) {
      for (let item of obj.data.list) {
        if (item?.cardType) {
          item.cardType = 2;
        }
      }
    }
  } else if (url.includes("/v1/ad/preload") || url.includes("/v2/ad/preload")) {
    // 开屏广告
    if (obj?.ads?.length > 0) {
      for (let item of obj.ads) {
        item.start_time = 3818332800; // Unix 时间戳 2090-12-31 00:00:00
        item.end_time = 3818419199; // Unix 时间戳 2090-12-31 23:59:59
        item.daily_display_cnt = 50; // total_display_cnt: 50
        item.display_duration = 0;
      }
      if (obj?.ads?.creatives?.length > 0) {
        for (let item of obj.ads.creatives) {
          item.start_time = 3818332800; // Unix 时间戳 2090-12-31 00:00:00
          item.end_time = 3818419199; // Unix 时间戳 2090-12-31 23:59:59
          item.daily_display_cnt = 50; // total_display_cnt: 50
          item.display_duration = 0;
        }
      }
    }
  } else if (url.includes("/wbapplua/wbpullad.lua") || url.includes("/preload/get_ad")) {
    // 开屏广告
    if (obj?.cached_ad?.ads?.length > 0) {
      for (let item of obj.cached_ad.ads) {
        item.show_count = 50;
        item.duration = 0; // 60 * 60 * 24 * 365 = 31536000
        item.start_date = 3818332800; // Unix 时间戳 2090-12-31 00:00:00
        item.end_date = 3818419199; // Unix 时间戳 2090-12-31 23:59:59
      }
    }
  }
  $done({ body: JSON.stringify(obj) });
}

// 判断信息流
function isAd(data) {
  if (data?.mblogtypename === "广告") {
    return true;
  }
  if (data?.mblogtypename === "热推") {
    return true;
  }
  if (data?.readtimetype === "adMblog") {
    return true;
  }
  if (data?.promotion?.recommend === "广告") {
    return true;
  }
  if (data?.promotion?.recommend === "热推") {
    return true;
  }
  if (data?.promotion?.type?.includes("ad")) {
    return true;
  }
  if (data?.content_auth_info?.content_auth_title === "广告") {
    return true;
  }
  if (data?.content_auth_info?.content_auth_title === "热推") {
    return true;
  }
  if (data?.ads_material_info?.is_ads === true) {
    return true;
  }
  return false;
}

// 移除头像挂件,关注按钮
function removeAvatar(data) {
  if (data?.block_card_bg) {
    delete data.block_card_bg;
  }
  if (data?.buttons) {
    delete data.buttons;
  }
  if (data?.cardid) {
    delete data.cardid;
  }
  if (data?.icons) {
    delete data.icons;
  }
  if (data?.mblog_buttons) {
    delete data.mblog_buttons; // 转发按钮图标
  }
  if (data?.pic_bg_new) {
    delete data.pic_bg_new;
  }
  if (data?.user?.avatargj_id) {
    delete data.user.avatargj_id;
  }
  if (data?.user?.avatar_extend_info) {
    delete data.user.avatar_extend_info;
  }
  if (data?.user?.cardid) {
    delete data.user.cardid;
  }
  if (data?.user?.icons) {
    delete data.user.icons;
  }
  if (data?.user?.mbtype) {
    delete data.user.mbtype; // 会员等级图标
  }
}

// 移除信息流关注按钮,推广,热评
function removeFeedAd(item) {
  removeAvatar(item); // 头像挂件,关注按钮
  if (item?.retweeted_status) {
    removeAvatar(item?.retweeted_status);
  }
  if (item?.common_struct) {
    delete item.common_struct; // 商品橱窗
  }
  if (item?.comment_summary) {
    delete item.comment_summary; // 移除信息流中的热评
  }
  if (item?.extend_info) {
    delete item.extend_info; // 商品橱窗
  }
  if (item?.semantic_brand_params) {
    delete item.semantic_brand_params; // 商品橱窗
  }
}

// 移除投票窗口
function removeVoteInfo(item) {
  if (item?.page_info?.media_info?.vote_info) {
    delete item.page_info.media_info.vote_info;
  }
}
}).call(this);}});
})();
