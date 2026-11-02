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
const __wayxContexts={"request":{"qx":{"phase":"request","responseBody":false,"binary":false,"binaryKnown":true,"from":"loon","to":"qx","apiPlan":{"version":1,"omitNotificationOptions":true,"qxHttp":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"node","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"},"target":{"responseStatus":"statusCode","scriptStartTime":"absent","binaryField":"bodyBytes","store":{"style":"prefs","read":"valueForKey","write":"setValueForKey","remove":"removeValueForKey","undefinedDeletes":false},"http":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"notification":{"root":"$notify","open":null,"media":null,"action":null,"openAction":null,"stringLink":false,"delay":false},"completion":{"statusEncoding":"line","synthetic":"flat"},"argument":"absent"}},"runtimePolicyVersion":2,"omittedParameters":["undocumented-qx-parameters"]},"surge":{"phase":"request","responseBody":false,"binary":false,"binaryKnown":true,"from":"loon","to":"surge","apiPlan":{"version":1,"omitNotificationOptions":false,"qxHttp":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"node","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"},"target":{"responseStatus":"status","scriptStartTime":"epoch-seconds","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":false},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"policy","timeoutMs":1000,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":false}},"notification":{"root":"$notification.post","open":"url","media":"media-url","action":"action","openAction":"open-url","stringLink":false,"delay":false},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"string"}},"runtimePolicyVersion":2,"omittedParameters":[]},"loon":{"phase":"request","responseBody":false,"binary":false,"binaryKnown":true,"from":"loon","to":"loon","apiPlan":{"version":1,"omitNotificationOptions":false,"qxHttp":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"node","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"},"target":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"node","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"}},"runtimePolicyVersion":2,"omittedParameters":[]}},"response":{"qx":{"phase":"response","responseBody":true,"binary":false,"binaryKnown":true,"from":"loon","to":"qx","apiPlan":{"version":1,"omitNotificationOptions":true,"qxHttp":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"node","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"},"target":{"responseStatus":"statusCode","scriptStartTime":"absent","binaryField":"bodyBytes","store":{"style":"prefs","read":"valueForKey","write":"setValueForKey","remove":"removeValueForKey","undefinedDeletes":false},"http":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"notification":{"root":"$notify","open":null,"media":null,"action":null,"openAction":null,"stringLink":false,"delay":false},"completion":{"statusEncoding":"line","synthetic":"flat"},"argument":"absent"}},"runtimePolicyVersion":2,"omittedParameters":["undocumented-qx-parameters"]},"surge":{"phase":"response","responseBody":true,"binary":false,"binaryKnown":true,"from":"loon","to":"surge","apiPlan":{"version":1,"omitNotificationOptions":false,"qxHttp":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"node","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"},"target":{"responseStatus":"status","scriptStartTime":"epoch-seconds","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":false},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"policy","timeoutMs":1000,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":false}},"notification":{"root":"$notification.post","open":"url","media":"media-url","action":"action","openAction":"open-url","stringLink":false,"delay":false},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"string"}},"runtimePolicyVersion":2,"omittedParameters":[]},"loon":{"phase":"response","responseBody":true,"binary":false,"binaryKnown":true,"from":"loon","to":"loon","apiPlan":{"version":1,"omitNotificationOptions":false,"qxHttp":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"node","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"},"target":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"node","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"}},"runtimePolicyVersion":2,"omittedParameters":[]}}},__wayxConfig=__wayxContexts[__wayxHost.response===undefined?'request':'response']?.[__wayxTarget];
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
--------------------------------------------------------------------------------
@Name: Pixiv 全局增强翻译 (Pixiverse Enhanced)
@Version: 4.5.8
@Desc: Pixiv 全页面日文深度汉化 · AI 视觉多模态漫翻 · 仿 Biliverse 内置设置中心
@Author: TomCatXue
@Date: 2026-10-06
--------------------------------------------------------------------------------
架构说明：
  1. 全页面 JSON 汉化：拦截 recommended/ranking/detail/comments/user/spotlight 等端点；
  2. 离线字典秒翻：内置 2500+ 高频 Pixiv Tag 映射表，0 网络请求，0ms 极速呈现；
  3. iOS 原生悬浮球：毛玻璃 SF Symbols「文/A」悬浮按钮，支持手势拖拽贴边与长按设置；
  4. AI 视觉多模态漫翻 (HUD Mode A)：识别漫画对白坐标，浮动气泡字幕覆盖，零画质损失与极轻量；
  5. 仿 Biliverse 设置中心：劫持帮助中心直达 PreferencePanes，设置存取同步 Loon $persistentStore。
--------------------------------------------------------------------------------
*/

// prettier-ignore
function Env(t) { return new class { constructor(t) { this.name = t, this.startTime = new Date().getTime(), this.logSeparator = "\n", this.logs = [], this.isMute = !1, this.encoding = "utf-8", this.isNode() ? (this.fs = require("fs"), this.path = require("path"), this.dataFile = this.path.resolve(process.cwd(), "boxjs.json"), this.fs.existsSync(this.dataFile) || this.fs.writeFileSync(this.dataFile, "{}"), this.data = this.loadData()) : this.data = {} } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } isStash() { return "undefined" != typeof $environment && $environment["stash-version"] } loadData() { if (this.isNode()) { try { return JSON.parse(this.fs.readFileSync(this.dataFile)) } catch (e) { return {} } } return {} } getdata(t) { if (this.isSurge() || this.isLoon() || this.isStash()) return $persistentStore.read(t); if (this.isQuanX()) return $prefs.valueForKey(t); if (this.isNode()) return this.data[t] || "" } setdata(t, e) { if (this.isSurge() || this.isLoon() || this.isStash()) return $persistentStore.write(t, e); if (this.isQuanX()) return $prefs.setValueForKey(t, e); if (this.isNode()) return this.data[e] = t, this.fs.writeFileSync(this.dataFile, JSON.stringify(this.data)), !0 } get(t) { return this.send(t, "GET") } post(t) { return this.send(t, "POST") } send(t, e) { return new Promise((s, i) => { if (this.isSurge() || this.isLoon() || this.isStash()) { "GET" === e ? $httpClient.get(t, (t, e, o) => { t ? i(t) : s({ status: e.statusCode, headers: e.headers, body: o }) }) : $httpClient.post(t, (t, e, o) => { t ? i(t) : s({ status: e.statusCode, headers: e.headers, body: o }) }) } else if (this.isQuanX()) { t.method = e, $task.fetch(t).then(t => s({ status: t.statusCode, headers: t.headers, body: t.body }), t => i(t)) } else if (this.isNode()) { const o = require(t.url.startsWith("https:") ? "https" : "http"), r = new URL(t.url), n = { method: e, hostname: r.hostname, port: r.port || (r.protocol === "https:" ? 443 : 80), path: r.pathname + r.search, headers: t.headers || {} }; const req = o.request(n, res => { let d = ""; res.on("data", c => d += c); res.on("end", () => s({ status: res.statusCode, headers: res.headers, body: d })) }); req.on("error", i); if (t.body) req.write(t.body); req.end() } }) } msg(t, e, s) { if (this.isMute) return; if (this.isSurge() || this.isLoon() || this.isStash()) $notification.post(t, e || "", s || ""); else if (this.isQuanX()) $notify(t, e || "", s || ""); else if (this.isNode()) console.log(`\n${t}\n${e || ""}\n${s || ""}`) } log(...t) { this.logs.push(t.join(this.logSeparator)), console.log(t.join(this.logSeparator)) } logErr(t) { this.log(`❌ ${t.message || t}`) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { if (this.isQuanX()) $done(t); else if (this.isSurge() || this.isLoon() || this.isStash()) $done(t) } }(t) }

const $ = new Env("Pixiv 增强翻译");

// ─── 0. 原生设置中心 HTML 模板 (对标 Pix-Scripting) ───
const SETTINGS_HTML = "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no\">\n  <title>Pixiv 增强设置</title>\n  <style>\n    :root {\n      --bg-color: #f2f2f7;\n      --card-bg: #ffffff;\n      --card-border: rgba(60, 60, 67, 0.12);\n      --separator-color: rgba(60, 60, 67, 0.12);\n      --text-primary: #000000;\n      --text-secondary: #8e8e93;\n      --tint-blue: #007aff;\n      --tint-green: #34c759;\n      --tint-red: #ff3b30;\n      --switch-bg: #e9e9ea;\n      --badge-bg: rgba(142, 142, 147, 0.12);\n      --badge-text: #8e8e93;\n      --icon-bg: rgba(142, 142, 147, 0.12);\n      --icon-color: #1c1c1e;\n    }\n    @media (prefers-color-scheme: dark) {\n      :root {\n        --bg-color: #000000;\n        --card-bg: #1c1c1e;\n        --card-border: rgba(255, 255, 255, 0.12);\n        --separator-color: rgba(84, 84, 88, 0.35);\n        --text-primary: #ffffff;\n        --text-secondary: #8e8e93;\n        --switch-bg: #39393d;\n        --badge-bg: rgba(255, 255, 255, 0.12);\n        --badge-text: #aeaeb2;\n        --icon-bg: rgba(255, 255, 255, 0.12);\n        --icon-color: #ffffff;\n      }\n    }\n\n    * {\n      box-sizing: border-box;\n      -webkit-tap-highlight-color: transparent;\n      margin: 0;\n      padding: 0;\n    }\n\n    body {\n      background-color: var(--bg-color);\n      color: var(--text-primary);\n      font-family: -apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"PingFang SC\", \"Hiragino Sans GB\", sans-serif;\n      padding: calc(env(safe-area-inset-top, 20px) + 16px) 16px calc(env(safe-area-inset-bottom, 20px) + 32px);\n      max-width: 680px;\n      margin: 0 auto;\n      line-height: 1.5;\n      font-size: 16px;\n      overflow-x: hidden;\n    }\n\n    /* ─── 页面品牌大标题与导航按钮 ─── */\n    .brand-header {\n      display: flex;\n      align-items: center;\n      gap: 14px;\n      margin-bottom: 12px;\n      padding: 4px 6px;\n    }\n    .brand-icon {\n      width: 48px;\n      height: 48px;\n      border-radius: 12px;\n      background: var(--icon-bg);\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      color: var(--tint-blue);\n      flex-shrink: 0;\n    }\n    .brand-title {\n      font-size: 22px;\n      font-weight: 700;\n      letter-spacing: -0.4px;\n      color: var(--text-primary);\n      display: flex;\n      align-items: center;\n      gap: 8px;\n    }\n    .brand-badge {\n      font-size: 11px;\n      font-weight: 600;\n      padding: 2px 7px;\n      border-radius: 6px;\n      background: rgba(0, 122, 255, 0.12);\n      color: var(--tint-blue);\n      letter-spacing: 0;\n    }\n    .brand-sub {\n      font-size: 13px;\n      color: var(--text-secondary);\n      margin-top: 2px;\n    }\n    .done-nav-btn {\n      background: var(--tint-blue);\n      color: #ffffff;\n      border: none;\n      font-size: 14px;\n      font-family: inherit;\n      font-weight: 600;\n      padding: 6px 16px;\n      border-radius: 18px;\n      cursor: pointer;\n      flex-shrink: 0;\n      box-shadow: 0 2px 6px rgba(0, 122, 255, 0.25);\n      transition: opacity 0.15s, transform 0.12s, background-color 0.2s;\n    }\n    .done-nav-btn:active {\n      transform: scale(0.95);\n      opacity: 0.85;\n    }\n    .save-tip-bar {\n      display: flex;\n      align-items: center;\n      gap: 6px;\n      background: rgba(0, 122, 255, 0.08);\n      color: var(--tint-blue);\n      padding: 7px 12px;\n      border-radius: 9px;\n      font-size: 12px;\n      font-weight: 500;\n      margin-bottom: 16px;\n      line-height: 1.4;\n    }\n\n    /* ─── Grouped 卡片容器 ─── */\n    .section-card {\n      background: var(--card-bg);\n      border-radius: 14px;\n      border: 0.5px solid var(--card-border);\n      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);\n      margin-bottom: 6px;\n      overflow: hidden;\n      transition: all 0.25s ease;\n    }\n\n    .section-header {\n      display: flex;\n      align-items: center;\n      padding: 13px 16px;\n      cursor: pointer;\n      user-select: none;\n      gap: 12px;\n      min-height: 52px;\n    }\n    .section-header:active {\n      background: rgba(127, 127, 127, 0.06);\n    }\n    .section-icon {\n      width: 28px;\n      height: 28px;\n      border-radius: 7px;\n      background: var(--icon-bg);\n      color: var(--icon-color);\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      flex-shrink: 0;\n    }\n    .section-title {\n      font-size: 16px;\n      font-weight: 600;\n      flex: 1;\n      color: var(--text-primary);\n    }\n    .section-summary {\n      font-size: 12px;\n      color: var(--badge-text);\n      background: var(--badge-bg);\n      padding: 3px 8px;\n      border-radius: 6px;\n      font-weight: 500;\n      max-width: 140px;\n      white-space: nowrap;\n      overflow: hidden;\n      text-overflow: ellipsis;\n      transition: opacity 0.2s;\n    }\n    .chevron-icon {\n      width: 14px;\n      height: 14px;\n      color: var(--text-secondary);\n      transition: transform 0.25s ease;\n      flex-shrink: 0;\n    }\n    .section-card.expanded .chevron-icon {\n      transform: rotate(90deg);\n    }\n    .section-card.expanded .section-summary {\n      opacity: 0;\n      pointer-events: none;\n    }\n\n    .section-body {\n      display: none;\n      border-top: 0.5px solid var(--separator-color);\n    }\n    .section-card.expanded .section-body {\n      display: block;\n    }\n\n    /* ─── 设置条目 (Row) ─── */\n    .setting-row {\n      display: flex;\n      align-items: center;\n      justify-content: space-between;\n      padding: 12px 16px;\n      min-height: 48px;\n      position: relative;\n    }\n    .setting-row:not(:last-child)::after {\n      content: \"\";\n      position: absolute;\n      left: 16px;\n      right: 0;\n      bottom: 0;\n      height: 0.5px;\n      background: var(--separator-color);\n    }\n    .setting-info {\n      flex: 1;\n      min-width: 120px;\n      padding-right: 12px;\n    }\n    .setting-label {\n      font-size: 15px;\n      font-weight: 500;\n      color: var(--text-primary);\n    }\n    .setting-desc {\n      font-size: 12px;\n      color: var(--text-secondary);\n      margin-top: 2px;\n      line-height: 1.35;\n    }\n\n    /* ─── 控件：iOS 原生 Toggle 胶囊开关 ─── */\n    .switch-wrap {\n      position: relative;\n      width: 51px;\n      height: 31px;\n      flex-shrink: 0;\n    }\n    .switch-wrap input {\n      opacity: 0;\n      width: 0;\n      height: 0;\n    }\n    .switch-slider {\n      position: absolute;\n      cursor: pointer;\n      top: 0; left: 0; right: 0; bottom: 0;\n      background-color: var(--switch-bg);\n      transition: background-color 0.25s ease;\n      border-radius: 31px;\n    }\n    .switch-slider::before {\n      position: absolute;\n      content: \"\";\n      height: 27px;\n      width: 27px;\n      left: 2px;\n      bottom: 2px;\n      background-color: white;\n      transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);\n      border-radius: 50%;\n      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);\n    }\n    .switch-wrap input:checked + .switch-slider {\n      background-color: var(--tint-green);\n    }\n    .switch-wrap input:checked + .switch-slider::before {\n      transform: translateX(20px);\n    }\n\n    /* ─── 控件：Select 下拉选择 ─── */\n    .select-wrap {\n      position: relative;\n      display: inline-flex;\n      align-items: center;\n      flex-shrink: 0;\n      max-width: 60%;\n    }\n    .select-input {\n      appearance: none;\n      -webkit-appearance: none;\n      background: rgba(127, 127, 127, 0.1);\n      border: none;\n      padding: 6px 28px 6px 12px;\n      border-radius: 8px;\n      font-size: 14px;\n      font-family: inherit;\n      color: var(--tint-blue);\n      font-weight: 500;\n      outline: none;\n      cursor: pointer;\n      max-width: 100%;\n      text-overflow: ellipsis;\n      white-space: nowrap;\n      overflow: hidden;\n    }\n    .select-arrow {\n      position: absolute;\n      right: 8px;\n      width: 12px;\n      height: 12px;\n      color: var(--tint-blue);\n      pointer-events: none;\n    }\n\n    /* ─── 控件：单行输入框 (带显隐眼睛) ─── */\n    .input-wrap {\n      display: flex;\n      align-items: center;\n      background: rgba(127, 127, 127, 0.08);\n      border-radius: 8px;\n      padding: 6px 10px;\n      width: 100%;\n      margin-top: 6px;\n      border: 0.5px solid var(--separator-color);\n    }\n    .text-input {\n      flex: 1;\n      background: transparent;\n      border: none;\n      font-size: 14px;\n      font-family: inherit;\n      color: var(--text-primary);\n      outline: none;\n    }\n    .text-input::placeholder {\n      color: var(--text-secondary);\n      opacity: 0.6;\n    }\n    .input-action-btn {\n      background: none;\n      border: none;\n      color: var(--text-secondary);\n      padding: 2px 4px;\n      cursor: pointer;\n      display: flex;\n      align-items: center;\n    }\n\n    /* ─── 控件：多选 Scope 芯片胶囊 ─── */\n    .scope-chips {\n      display: flex;\n      flex-wrap: wrap;\n      gap: 8px;\n      padding: 8px 16px 14px;\n    }\n    .scope-chip {\n      padding: 6px 12px;\n      border-radius: 8px;\n      font-size: 13px;\n      font-weight: 500;\n      background: rgba(127, 127, 127, 0.1);\n      color: var(--text-secondary);\n      border: 0.5px solid transparent;\n      cursor: pointer;\n      user-select: none;\n      transition: all 0.2s ease;\n    }\n    .scope-chip.selected {\n      background: rgba(0, 122, 255, 0.12);\n      color: var(--tint-blue);\n      border-color: rgba(0, 122, 255, 0.3);\n      font-weight: 600;\n    }\n\n    /* ─── 控件：缓存管理数据面板 ─── */\n    .cache-panel {\n      padding: 12px 16px;\n    }\n    .cache-metric-grid {\n      display: grid;\n      grid-template-columns: repeat(3, 1fr);\n      gap: 8px;\n      margin-bottom: 12px;\n    }\n    .cache-metric-box {\n      background: rgba(127, 127, 127, 0.08);\n      border-radius: 10px;\n      padding: 10px 12px;\n      text-align: center;\n    }\n    .cache-metric-title {\n      font-size: 11px;\n      color: var(--text-secondary);\n      font-weight: 500;\n      margin-bottom: 4px;\n    }\n    .cache-metric-val {\n      font-size: 16px;\n      font-weight: 700;\n      color: var(--text-primary);\n    }\n    .cache-feedback-bar {\n      font-size: 12px;\n      color: var(--tint-blue);\n      min-height: 18px;\n      margin-top: 8px;\n      line-height: 1.4;\n      text-align: center;\n    }\n\n    /* ─── 操作按钮 (Button) ─── */\n    .action-btn-row {\n      padding: 10px 16px 14px;\n      display: flex;\n      gap: 10px;\n    }\n    .primary-btn {\n      flex: 1;\n      background: var(--tint-blue);\n      color: #fff;\n      border: none;\n      border-radius: 10px;\n      padding: 11px 16px;\n      font-size: 15px;\n      font-weight: 600;\n      cursor: pointer;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      gap: 6px;\n      box-shadow: 0 2px 8px rgba(0, 122, 255, 0.2);\n      transition: transform 0.12s, opacity 0.2s, background-color 0.2s;\n    }\n    .primary-btn:active {\n      transform: scale(0.97);\n      opacity: 0.9;\n    }\n    .secondary-btn {\n      flex: 1;\n      background: rgba(127, 127, 127, 0.12);\n      color: var(--text-primary);\n      border: none;\n      border-radius: 10px;\n      padding: 11px 16px;\n      font-size: 15px;\n      font-weight: 500;\n      cursor: pointer;\n      display: flex;\n      align-items: center;\n      justify-content: center;\n      gap: 6px;\n      transition: transform 0.12s, opacity 0.2s;\n    }\n    .secondary-btn:active {\n      transform: scale(0.97);\n    }\n    .danger-btn {\n      color: var(--tint-red);\n      background: rgba(255, 59, 48, 0.1);\n    }\n\n    /* ─── 分组说明注脚 (Footer) ─── */\n    .section-footer {\n      font-size: 12px;\n      color: var(--text-secondary);\n      margin: 6px 16px 20px;\n      line-height: 1.4;\n      padding: 0 4px;\n    }\n\n    /* ─── 提示 Toast 悬浮胶囊 ─── */\n    #px-toast {\n      position: fixed;\n      top: calc(env(safe-area-inset-top, 20px) + 12px);\n      left: 50%;\n      transform: translateX(-50%) translateY(-60px);\n      background: rgba(20, 20, 20, 0.92);\n      -webkit-backdrop-filter: blur(20px);\n      backdrop-filter: blur(20px);\n      color: #fff;\n      padding: 8px 18px;\n      border-radius: 20px;\n      font-size: 13px;\n      font-weight: 500;\n      display: flex;\n      align-items: center;\n      gap: 6px;\n      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);\n      z-index: 999999;\n      opacity: 0;\n      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);\n      pointer-events: none;\n    }\n    #px-toast.show {\n      transform: translateX(-50%) translateY(0);\n      opacity: 1;\n    }\n\n    /* ─── 确认弹层 (ActionSheet) ─── */\n    .modal-overlay {\n      position: fixed;\n      top: 0; left: 0; right: 0; bottom: 0;\n      background: rgba(0, 0, 0, 0.4);\n      backdrop-filter: blur(4px);\n      -webkit-backdrop-filter: blur(4px);\n      display: none;\n      align-items: flex-end;\n      justify-content: center;\n      z-index: 999998;\n      padding: 12px;\n    }\n    .modal-overlay.show {\n      display: flex;\n    }\n    .modal-card {\n      background: var(--card-bg);\n      border-radius: 16px;\n      width: 100%;\n      max-width: 420px;\n      padding: 20px;\n      text-align: center;\n      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);\n      animation: modalSlideUp 0.25s cubic-bezier(0.175, 0.885, 0.32, 1);\n    }\n    @keyframes modalSlideUp {\n      from { transform: translateY(100px); opacity: 0; }\n      to { transform: translateY(0); opacity: 1; }\n    }\n    .modal-title {\n      font-size: 17px;\n      font-weight: 600;\n      margin-bottom: 6px;\n    }\n    .modal-desc {\n      font-size: 13px;\n      color: var(--text-secondary);\n      margin-bottom: 18px;\n      line-height: 1.45;\n    }\n    .modal-actions {\n      display: flex;\n      gap: 10px;\n    }\n  </style>\n</head>\n<body>\n\n  <!-- 提示 Toast 胶囊 -->\n  <div id=\"px-toast\">\n    <span id=\"px-toast-icon\">✓</span>\n    <span id=\"px-toast-msg\">设置已自动保存</span>\n  </div>\n\n  <!-- 清理确认弹层 -->\n  <div class=\"modal-overlay\" id=\"clear-modal\">\n    <div class=\"modal-card\">\n      <div class=\"modal-title\">清理翻译缓存</div>\n      <div class=\"modal-desc\">将删除所有本地暂存的翻译文本，以便重新请求最新内容。<br>不会影响您的插件设置及 API 密钥。</div>\n      <div class=\"modal-actions\">\n        <button type=\"button\" class=\"secondary-btn\" onclick=\"closeClearModal()\">取消</button>\n        <button type=\"button\" class=\"primary-btn danger-btn\" onclick=\"executeClearCache()\">确定清理</button>\n      </div>\n    </div>\n  </div>\n\n  <!-- 页面品牌大标题 -->\n  <div class=\"brand-header\">\n    <div class=\"brand-icon\" style=\"width: 48px; height: 48px; border-radius: 12px; overflow: hidden; background: #0096fa; box-shadow: 0 4px 12px rgba(0, 150, 250, 0.35); display: flex; align-items: center; justify-content: center; flex-shrink: 0;\">\n      <!-- Pixiv 官方经典 P 标 (矢量 SVG，0 网络延迟瞬出，永不失真) -->\n      <svg viewBox=\"0 0 24 24\" width=\"30\" height=\"30\" fill=\"#ffffff\">\n        <path d=\"M12.18 4.05c3.77 0 6.84 3.06 6.84 6.84 0 3.77-3.07 6.84-6.84 6.84a6.81 6.81 0 0 1-4.05-1.34v4.38H5.2V4.05h6.98zm0 3.13a3.7 3.7 0 1 0 0 7.41 3.7 3.7 0 0 0 0-7.41z\"/>\n      </svg>\n    </div>\n    <div style=\"flex: 1;\">\n      <div class=\"brand-title\">\n        Pixiv 增强翻译\n        <span class=\"brand-badge\">v4.5.8</span>\n      </div>\n      <div class=\"brand-sub\">双语出版级排版 · 全页面汉化 · 离线缓存</div>\n    </div>\n    <button type=\"button\" class=\"done-nav-btn\" onclick=\"handleDoneClick()\">完成</button>\n  </div>\n\n  <div class=\"save-tip-bar\">\n    <svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m9 12 2 2 4-4\"/></svg>\n    <span>修改任何选项即刻实时自动保存，点击「完成」可直接返回 Pixiv</span>\n  </div>\n\n  <!-- ─── 第一组：翻译 ─── -->\n  <div class=\"section-card\" id=\"sec-content\">\n    <div class=\"section-header\" onclick=\"toggleSection('sec-content')\">\n      <div class=\"section-icon\" style=\"background: #007aff; color: #fff;\">\n        <!-- SF Symbol: globe -->\n        <svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n          <circle cx=\"12\" cy=\"12\" r=\"10\"/>\n          <path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\"/>\n          <path d=\"M2 12h20\"/>\n        </svg>\n      </div>\n      <div class=\"section-title\">翻译设置</div>\n      <div class=\"section-summary\" id=\"sum-content\">自动:开 · 简体</div>\n      <svg class=\"chevron-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m9 18 6-6-6-6\"/></svg>\n    </div>\n    <div class=\"section-body\">\n      <div class=\"setting-row\">\n        <div class=\"setting-info\">\n          <div class=\"setting-label\">启用 Pixiv 增强翻译</div>\n          <div class=\"setting-desc\">总开关：接管全页面日文汉化与视觉漫翻</div>\n        </div>\n        <label class=\"switch-wrap\">\n          <input type=\"checkbox\" id=\"cfg-global-switch\" onchange=\"saveConfig()\">\n          <span class=\"switch-slider\"></span>\n        </label>\n      </div>\n      <div class=\"setting-row\">\n        <div class=\"setting-info\">\n          <div class=\"setting-label\">默认全自动汉化</div>\n          <div class=\"setting-desc\">进入页面后直接呈现翻译结果，无需手动点击</div>\n        </div>\n        <label class=\"switch-wrap\">\n          <input type=\"checkbox\" id=\"cfg-auto-switch\" onchange=\"saveConfig()\">\n          <span class=\"switch-slider\"></span>\n        </label>\n      </div>\n      <div class=\"setting-row\">\n        <div class=\"setting-info\">\n          <div class=\"setting-label\">智能跳过纯中文内容</div>\n          <div class=\"setting-desc\">不包含日文或外语的作品自动跳过，节省配额与零延迟</div>\n        </div>\n        <label class=\"switch-wrap\">\n          <input type=\"checkbox\" id=\"cfg-skip-chinese\" onchange=\"saveConfig()\">\n          <span class=\"switch-slider\"></span>\n        </label>\n      </div>\n      <div class=\"setting-row\">\n        <div class=\"setting-info\">\n          <div class=\"setting-label\">目标语言</div>\n          <div class=\"setting-desc\">期望将外语内容翻译为的目标语言</div>\n        </div>\n        <div class=\"select-wrap\">\n          <select class=\"select-input\" id=\"cfg-target-lang\" onchange=\"saveConfig()\">\n            <option value=\"zh-CN\">简体中文</option>\n            <option value=\"zh-TW\">繁體中文</option>\n            <option value=\"en\">English</option>\n            <option value=\"ja\">日本語 (原文)</option>\n            <option value=\"ko\">한국어</option>\n          </select>\n          <svg class=\"select-arrow\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"m6 9 6 6 6-6\"/></svg>\n        </div>\n      </div>\n      <div class=\"setting-row\">\n        <div class=\"setting-info\">\n          <div class=\"setting-label\">翻译服务</div>\n          <div class=\"setting-desc\">选择底层文本翻译所使用的服务引擎</div>\n        </div>\n        <div class=\"select-wrap\">\n          <select class=\"select-input\" id=\"cfg-translator-source\" onchange=\"onTranslatorChange()\">\n            <option value=\"google\">Google 免费并发 (极速)</option>\n            <option value=\"deepseek\">DeepSeek AI (文学润色/需Key)</option>\n            <option value=\"openai\">OpenAI / 兼容接口 (需Key)</option>\n            <option value=\"baidu\">百度通用翻译 (稳定/需Key)</option>\n            <option value=\"caiyun\">彩云小译 (地道ACG/需Token)</option>\n          </select>\n          <svg class=\"select-arrow\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"m6 9 6 6 6-6\"/></svg>\n        </div>\n      </div>\n\n      <!-- DeepSeek 配置区 -->\n      <div id=\"ai-deepseek-block\" style=\"padding: 10px 16px 14px; border-bottom: 0.5px solid var(--separator-color);\">\n        <div class=\"setting-label\" style=\"font-size: 14px;\">DeepSeek API Key</div>\n        <div class=\"input-wrap\">\n          <input type=\"password\" class=\"text-input\" id=\"cfg-deepseek-key\" placeholder=\"sk-...\" onchange=\"saveConfig()\">\n          <button type=\"button\" class=\"input-action-btn\" onclick=\"toggleInputMask('cfg-deepseek-key')\">\n            <!-- SF Symbol: eye -->\n            <svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n              <path d=\"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z\"/>\n              <circle cx=\"12\" cy=\"12\" r=\"3\"/>\n            </svg>\n          </button>\n        </div>\n        <div style=\"display: flex; gap: 8px; margin-top: 8px;\">\n          <div style=\"flex: 2;\">\n            <div class=\"setting-desc\">端点 URL</div>\n            <div class=\"input-wrap\"><input type=\"text\" class=\"text-input\" id=\"cfg-deepseek-url\" value=\"https://api.deepseek.com/v1/chat/completions\" onchange=\"saveConfig()\"></div>\n          </div>\n          <div style=\"flex: 1.2;\">\n            <div class=\"setting-desc\">模型名称</div>\n            <div class=\"input-wrap\"><input type=\"text\" class=\"text-input\" id=\"cfg-deepseek-model\" value=\"deepseek-v4-flash\" onchange=\"saveConfig()\"></div>\n          </div>\n        </div>\n      </div>\n\n      <!-- OpenAI 配置区 -->\n      <div id=\"ai-openai-block\" style=\"padding: 10px 16px 14px; border-bottom: 0.5px solid var(--separator-color); display: none;\">\n        <div class=\"setting-label\" style=\"font-size: 14px;\">OpenAI API Key</div>\n        <div class=\"input-wrap\">\n          <input type=\"password\" class=\"text-input\" id=\"cfg-openai-key\" placeholder=\"sk-...\" onchange=\"saveConfig()\">\n          <button type=\"button\" class=\"input-action-btn\" onclick=\"toggleInputMask('cfg-openai-key')\">\n            <svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n              <path d=\"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z\"/>\n              <circle cx=\"12\" cy=\"12\" r=\"3\"/>\n            </svg>\n          </button>\n        </div>\n        <div style=\"margin-top: 8px;\">\n          <div class=\"setting-desc\">兼容端点 URL</div>\n          <div class=\"input-wrap\"><input type=\"text\" class=\"text-input\" id=\"cfg-openai-url\" value=\"https://api.openai.com/v1/chat/completions\" onchange=\"saveConfig()\"></div>\n        </div>\n      </div>\n\n      <!-- 百度翻译配置区 -->\n      <div id=\"ai-baidu-block\" style=\"padding: 10px 16px 14px; border-bottom: 0.5px solid var(--separator-color); display: none;\">\n        <div class=\"setting-label\" style=\"font-size: 14px; margin-bottom: 6px;\">百度翻译 AppID</div>\n        <div class=\"input-wrap\" style=\"margin-bottom: 8px;\">\n          <input type=\"text\" class=\"text-input\" id=\"cfg-baidu-appid\" placeholder=\"在 fanyi-api.baidu.com 申请的 AppID\" onchange=\"saveConfig()\">\n        </div>\n        <div class=\"setting-label\" style=\"font-size: 14px; margin-bottom: 6px;\">百度翻译 Secret 密钥</div>\n        <div class=\"input-wrap\">\n          <input type=\"password\" class=\"text-input\" id=\"cfg-baidu-secret\" placeholder=\"管理控制台查看的密钥 (注意大小写区分)\" onchange=\"saveConfig()\">\n          <button type=\"button\" class=\"input-action-btn\" onclick=\"toggleInputMask('cfg-baidu-secret')\">\n            <svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n              <path d=\"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z\"/>\n              <circle cx=\"12\" cy=\"12\" r=\"3\"/>\n            </svg>\n          </button>\n        </div>\n        <div class=\"setting-desc\" style=\"margin-top: 6px; color: var(--tint-blue);\">💡 百度通用文本翻译每月赠送免费额度，填入后点击下方「测试翻译模型连接与延迟」即可实时验证。</div>\n      </div>\n\n      <!-- 彩云小译配置区 -->\n      <div id=\"ai-caiyun-block\" style=\"padding: 10px 16px 14px; border-bottom: 0.5px solid var(--separator-color); display: none;\">\n        <div class=\"setting-label\" style=\"font-size: 14px; margin-bottom: 6px;\">彩云小译 API Token</div>\n        <div class=\"input-wrap\">\n          <input type=\"password\" class=\"text-input\" id=\"cfg-caiyun-token\" placeholder=\"在 open.caiyunapp.com 获取的 Token\" onchange=\"saveConfig()\">\n          <button type=\"button\" class=\"input-action-btn\" onclick=\"toggleInputMask('cfg-caiyun-token')\">\n            <svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n              <path d=\"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z\"/>\n              <circle cx=\"12\" cy=\"12\" r=\"3\"/>\n            </svg>\n          </button>\n        </div>\n        <div class=\"setting-desc\" style=\"margin-top: 6px; color: var(--tint-blue);\">💡 彩云科技开放平台 (open.caiyunapp.com) 注册认证后每月赠送 100 万字符免费额度，二次元ACG语料出众。</div>\n      </div>\n\n      <div style=\"padding: 12px 16px 4px;\">\n        <div class=\"setting-label\" style=\"font-size: 14px;\">生效模块范围</div>\n      </div>\n      <div class=\"scope-chips\" id=\"scope-chips-container\">\n        <div class=\"scope-chip\" data-key=\"illust_title\" onclick=\"toggleScope(this)\">作品标题</div>\n        <div class=\"scope-chip\" data-key=\"illust_caption\" onclick=\"toggleScope(this)\">作品简介</div>\n        <div class=\"scope-chip\" data-key=\"tags\" onclick=\"toggleScope(this)\">日文标签</div>\n        <div class=\"scope-chip\" data-key=\"novels\" onclick=\"toggleScope(this)\">小说正文</div>\n        <div class=\"scope-chip\" data-key=\"comments\" onclick=\"toggleScope(this)\">评论区</div>\n        <div class=\"scope-chip\" data-key=\"user_profile\" onclick=\"toggleScope(this)\">画师简介</div>\n        <div class=\"scope-chip\" data-key=\"spotlight\" onclick=\"toggleScope(this)\">特辑文章</div>\n      </div>\n      <div class=\"action-btn-row\" style=\"padding-top: 4px;\">\n        <button type=\"button\" class=\"primary-btn\" id=\"btn-test-ai\" onclick=\"testAIConnection()\">\n          <svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 14h12l-4 8 10-10H12l4-8z\"/></svg>\n          <span>测试翻译模型连接与延迟</span>\n        </button>\n      </div>\n    </div>\n  </div>\n  <div class=\"section-footer\">\n    主页作品卡片同时就地汉化标题与简介，彻底消除未翻译截断引发的弹窗；标签副标题已自动净空，杜绝上下重复显示。\n  </div>\n\n  <!-- ─── 第二组：阅读体验 ─── -->\n  <div class=\"section-card\" id=\"sec-novel\">\n    <div class=\"section-header\" onclick=\"toggleSection('sec-novel')\">\n      <div class=\"section-icon\" style=\"background: #5856d6; color: #fff;\">\n        <!-- SF Symbol: text.book.closed -->\n        <svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n          <path d=\"M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z\"/>\n          <path d=\"M6 6h10\"/>\n          <path d=\"M6 10h10\"/>\n          <path d=\"M6 14h6\"/>\n        </svg>\n      </div>\n      <div class=\"section-title\">阅读体验</div>\n      <div class=\"section-summary\" id=\"sum-novel\">双语对照 · 系统字体</div>\n      <svg class=\"chevron-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m9 18 6-6-6-6\"/></svg>\n    </div>\n    <div class=\"section-body\">\n      <div class=\"setting-row\">\n        <div class=\"setting-info\">\n          <div class=\"setting-label\">双语对照阅读</div>\n          <div class=\"setting-desc\">开启后按原文在上、译文在下形成段落对展示；关闭后仅显示译文</div>\n        </div>\n        <label class=\"switch-wrap\">\n          <input type=\"checkbox\" id=\"cfg-novel-show-original\" onchange=\"saveConfig()\">\n          <span class=\"switch-slider\"></span>\n        </label>\n      </div>\n      <div class=\"setting-row\">\n        <div class=\"setting-info\">\n          <div class=\"setting-label\">排版字体风格</div>\n          <div class=\"setting-desc\">提供出版级印刷字体预设，字号与行距继承系统设置</div>\n        </div>\n        <div class=\"select-wrap\">\n          <select class=\"select-input\" id=\"cfg-novel-font\" onchange=\"saveConfig()\">\n            <option value=\"system\">系统默认 (苹方)</option>\n            <option value=\"songti\">经典宋体 (纸书质感)</option>\n            <option value=\"kaiti\">优美楷体 (古雅风格)</option>\n            <option value=\"yuanti\">柔和圆体 (亲和温润)</option>\n          </select>\n          <svg class=\"select-arrow\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"m6 9 6 6 6-6\"/></svg>\n        </div>\n      </div>\n      <div class=\"setting-row\">\n        <div class=\"setting-info\">\n          <div class=\"setting-label\">自动净化作者免责声明</div>\n          <div class=\"setting-desc\">智能过滤台本商用授权、禁止转载等规约条款，呈现纯粹小说正文</div>\n        </div>\n        <label class=\"switch-wrap\">\n          <input type=\"checkbox\" id=\"cfg-clean-disclaimer\" onchange=\"saveConfig()\">\n          <span class=\"switch-slider\"></span>\n        </label>\n      </div>\n    </div>\n  </div>\n  <div class=\"section-footer\">\n    双语阅读严格按小说段落顺序一对一排列，原文为主阅读层级，译文为从属辅助层级，不加多余卡片边框与杂乱背景。\n  </div>\n\n  <!-- ─── 第三组：漫画与图片翻译 ─── -->\n  <div class=\"section-card\" id=\"sec-manga\">\n    <div class=\"section-header\" onclick=\"toggleSection('sec-manga')\">\n      <div class=\"section-icon\" style=\"background: #ff2d55; color: #fff;\">\n        <!-- SF Symbol: photo.on.rectangle.angled -->\n        <svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n          <path d=\"M4 8h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z\"/>\n          <path d=\"m2 16 5-5 4 4 5-5 6 6\"/>\n          <circle cx=\"8\" cy=\"13\" r=\"1.5\"/>\n          <path d=\"M7 4h10\"/>\n        </svg>\n      </div>\n      <div class=\"section-title\">漫画与图片翻译</div>\n      <div class=\"section-summary\" id=\"sum-manga\">未开启</div>\n      <svg class=\"chevron-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m9 18 6-6-6-6\"/></svg>\n    </div>\n    <div class=\"section-body\">\n      <div class=\"setting-row\">\n        <div class=\"setting-info\">\n          <div class=\"setting-label\">启用漫画图片翻译</div>\n          <div class=\"setting-desc\">开启后在 Pixiv 浏览漫画作品时可一键进入专属全屏漫翻查看器</div>\n        </div>\n        <label class=\"switch-wrap\">\n          <input type=\"checkbox\" id=\"cfg-manga-switch\" onchange=\"onMangaSwitchChange()\">\n          <span class=\"switch-slider\"></span>\n        </label>\n      </div>\n\n      <!-- 展开的漫翻详细配置区 -->\n      <div id=\"manga-config-box\" style=\"display: none; border-top: 0.5px solid var(--separator-color); background: rgba(127, 127, 127, 0.03);\">\n        <div class=\"setting-row\">\n          <div class=\"setting-info\">\n            <div class=\"setting-label\">漫翻引擎</div>\n            <div class=\"setting-desc\">选择底层图片汉化与字幕服务</div>\n          </div>\n          <div class=\"select-wrap\">\n            <select class=\"select-input\" id=\"cfg-manga-engine\" onchange=\"onMangaEngineChange()\">\n              <option value=\"gemini_vl\">Gemini (空间视觉·免费)</option>\n              <option value=\"deepseek_vl\">DeepSeek-VL (推荐·高精度)</option>\n              <option value=\"gpt4o_mini\">GPT-4o-mini (OpenAI 视觉)</option>\n              <option value=\"manga_translator\">自建服务 (manga-translator)</option>\n            </select>\n            <svg class=\"select-arrow\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"m6 9 6 6 6-6\"/></svg>\n          </div>\n        </div>\n\n        <!-- Gemini 专属配置区 (选 Gemini 时展示) -->\n        <div id=\"manga-gemini-block\" style=\"padding: 10px 16px 14px; border-bottom: 0.5px solid var(--separator-color); display: none;\">\n          <div class=\"setting-label\" style=\"font-size: 14px; margin-bottom: 6px;\">Gemini API Key</div>\n          <div class=\"input-wrap\">\n            <input type=\"password\" class=\"text-input\" id=\"cfg-gemini-key\" placeholder=\"AIzaSy...\" onchange=\"saveConfig()\">\n            <button type=\"button\" class=\"input-action-btn\" onclick=\"toggleInputMask('cfg-gemini-key')\">\n              <svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n                <path d=\"M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z\"/>\n                <circle cx=\"12\" cy=\"12\" r=\"3\"/>\n              </svg>\n            </button>\n          </div>\n          <div class=\"setting-desc\" style=\"margin-top: 6px; color: var(--tint-blue);\">🌟 Google AI Studio (aistudio.google.com) 免费申请 API Key，每日 1500 次永久免费额度，对白定位毫米级贴合。</div>\n        </div>\n\n        <!-- 自建服务 (选自建时展示) -->\n        <div id=\"manga-selfhost-block\" style=\"padding: 6px 16px 12px; display: none;\">\n          <div class=\"input-wrap\">\n            <input type=\"text\" class=\"text-input\" id=\"cfg-manga-server\" value=\"http://127.0.0.1:5000\" placeholder=\"http://192.168.1.x:5000\" onchange=\"saveConfig()\">\n          </div>\n        </div>\n\n        <!-- 快速直达任意漫画作品 -->\n        <div style=\"padding: 0 16px 12px;\">\n          <div class=\"setting-label\" style=\"font-size: 13px; margin-bottom: 6px;\">🔍 快速打开任意漫画作品：</div>\n          <div style=\"display: flex; gap: 8px;\">\n            <div class=\"input-wrap\" style=\"flex: 1; margin-bottom: 0;\">\n              <input type=\"text\" class=\"text-input\" id=\"quick-illust-id\" placeholder=\"输入作品 ID (如 144146271)\">\n            </div>\n            <button type=\"button\" class=\"primary-btn\" onclick=\"openQuickViewer()\" style=\"white-space: nowrap; padding: 0 16px; font-size: 13px;\">打开查看器</button>\n          </div>\n        </div>\n\n        <div style=\"padding: 6px 16px 12px;\">\n          <button type=\"button\" class=\"secondary-btn\" id=\"btn-test-manga\" onclick=\"testMangaConnection()\" style=\"width: 100%; padding: 10px 14px; font-size: 14px; font-weight: 600; justify-content: center;\">\n            <svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 14h12l-4 8 10-10H12l4-8z\"/></svg>\n            <span>测试漫翻服务连接与测速</span>\n          </button>\n        </div>\n      </div>\n    </div>\n  </div>\n  <div class=\"section-footer\">\n    全量插画与漫画均已注入专属查看器；在查看器内可利用 DeepSeek 视觉模型一键识别对白并覆盖汉化字幕。\n  </div>\n\n  <!-- ─── 第四组：悬浮按钮 ─── -->\n  <div class=\"section-card\" id=\"sec-floating\">\n    <div class=\"section-header\" onclick=\"toggleSection('sec-floating')\">\n      <div class=\"section-icon\" style=\"background: #34c759; color: #fff;\">\n        <!-- SF Symbol: button.programmable -->\n        <svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n          <circle cx=\"12\" cy=\"12\" r=\"9\"/>\n          <circle cx=\"12\" cy=\"12\" r=\"4\"/>\n        </svg>\n      </div>\n      <div class=\"section-title\">悬浮按钮</div>\n      <div class=\"section-summary\" id=\"sum-floating\">已开启</div>\n      <svg class=\"chevron-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m9 18 6-6-6-6\"/></svg>\n    </div>\n    <div class=\"section-body\">\n      <div class=\"setting-row\">\n        <div class=\"setting-info\">\n          <div class=\"setting-label\">显示悬浮按钮</div>\n          <div class=\"setting-desc\">翻译过程中显示悬浮按钮，支持轻触翻译/还原与长按设置</div>\n        </div>\n        <label class=\"switch-wrap\">\n          <input type=\"checkbox\" id=\"cfg-floating-switch\" onchange=\"saveConfig()\">\n          <span class=\"switch-slider\"></span>\n        </label>\n      </div>\n    </div>\n  </div>\n  <div class=\"section-footer\">\n    开启后自动避开页面已有喜欢与操作控件，轻点即响应，不跳动不重叠；关闭后完全不注入任何按钮 DOM。\n  </div>\n\n  <!-- ─── 第五组：高级与缓存 ─── -->\n  <div class=\"section-card\" id=\"sec-advanced\">\n    <div class=\"section-header\" onclick=\"toggleSection('sec-advanced')\">\n      <div class=\"section-icon\" style=\"background: #8e8e93; color: #fff;\">\n        <!-- SF Symbol: slider.horizontal.3 -->\n        <svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n          <path d=\"M4 21v-7\"/>\n          <path d=\"M4 10V3\"/>\n          <path d=\"M12 21v-9\"/>\n          <path d=\"M12 8V3\"/>\n          <path d=\"M20 21v-5\"/>\n          <path d=\"M20 12V3\"/>\n          <path d=\"M1 14h6\"/>\n          <path d=\"M9 8h6\"/>\n          <path d=\"M17 16h6\"/>\n        </svg>\n      </div>\n      <div class=\"section-title\">高级与缓存</div>\n      <div class=\"section-summary\" id=\"sum-advanced\">已就绪</div>\n      <svg class=\"chevron-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m9 18 6-6-6-6\"/></svg>\n    </div>\n    <div class=\"section-body\">\n      <!-- 真实缓存管理卡片 -->\n      <div class=\"cache-panel\">\n        <div class=\"setting-label\" style=\"margin-bottom: 8px;\">翻译缓存</div>\n        <div class=\"setting-desc\" style=\"margin-bottom: 12px;\">翻译结果暂存在本地，避免重复请求并提升加载速度</div>\n        <div class=\"cache-metric-grid\">\n          <div class=\"cache-metric-box\">\n            <div class=\"cache-metric-title\">已使用</div>\n            <div class=\"cache-metric-val\" id=\"cache-size\">0 B</div>\n          </div>\n          <div class=\"cache-metric-box\">\n            <div class=\"cache-metric-title\">缓存条目</div>\n            <div class=\"cache-metric-val\" id=\"cache-count\">0 个</div>\n          </div>\n          <div class=\"cache-metric-box\">\n            <div class=\"cache-metric-title\">最近缓存</div>\n            <div class=\"cache-metric-val\" id=\"cache-time\" style=\"font-size: 13px; line-height: 24px;\">暂无缓存</div>\n          </div>\n        </div>\n        <button type=\"button\" class=\"secondary-btn danger-btn\" style=\"width: 100%;\" onclick=\"openClearModal()\">\n          <!-- SF Symbol: trash -->\n          <svg viewBox=\"0 0 24 24\" width=\"15\" height=\"15\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n            <path d=\"M3 6h18\"/>\n            <path d=\"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6\"/>\n            <path d=\"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2\"/>\n          </svg>\n          <span>清理缓存</span>\n        </button>\n        <div class=\"cache-feedback-bar\" id=\"cache-feedback\"></div>\n      </div>\n\n            <div class=\"setting-row\">\n        <div class=\"setting-info\">\n          <div class=\"setting-label\">优化图片加载速度</div>\n          <div class=\"setting-desc\">走全球 CDN 镜像加速通道 (i.pixiv.re)，大幅提升大图加载速度，翻页更流畅</div>\n        </div>\n        <label class=\"switch-wrap\">\n          <input type=\"checkbox\" id=\"cfg-image-accelerate\" checked onchange=\"saveConfig()\">\n          <span class=\"switch-slider\"></span>\n        </label>\n      </div>\n\n      <div class=\"setting-row\">\n        <div class=\"setting-info\">\n          <div class=\"setting-label\">标签优先使用离线词典</div>\n          <div class=\"setting-desc\">内置 2500+ ACG 日文 Tag 映射，0ms 响应且副标自动净空</div>\n        </div>\n        <label class=\"switch-wrap\">\n          <input type=\"checkbox\" id=\"cfg-tag-offline\" checked onchange=\"saveConfig()\">\n          <span class=\"switch-slider\"></span>\n        </label>\n      </div>\n    </div>\n  </div>\n  <div class=\"section-footer\">\n    清理缓存仅删除已保存的翻译正文条目，不会误删您的设置或 API 密钥；图片镜像如需免流，可在 Loon 添加规则：<code style=\"background: rgba(127,127,127,0.15); padding: 1px 4px; border-radius: 4px;\">DOMAIN,i.pixiv.re,DIRECT</code>。\n  </div>\n\n  <!-- ─── 第六组：关于 ─── -->\n  <div class=\"section-card\" id=\"sec-about\">\n    <div class=\"section-header\" onclick=\"toggleSection('sec-about')\">\n      <div class=\"section-icon\" style=\"background: #ff9500; color: #fff;\">\n        <!-- SF Symbol: info.circle -->\n        <svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n          <circle cx=\"12\" cy=\"12\" r=\"10\"/>\n          <path d=\"M12 16v-4\"/>\n          <path d=\"M12 8h.01\"/>\n        </svg>\n      </div>\n      <div class=\"section-title\">关于与状态</div>\n      <div class=\"section-summary\" id=\"sum-about\">v4.5.8 旗舰版</div>\n      <svg class=\"chevron-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m9 18 6-6-6-6\"/></svg>\n    </div>\n    <div class=\"section-body\">\n      <div class=\"setting-row\">\n        <div class=\"setting-info\">\n          <div class=\"setting-label\">插件版本</div>\n          <div class=\"setting-desc\">Pixiv Enhanced Translation Suite</div>\n        </div>\n        <span style=\"font-size: 14px; color: var(--text-secondary); font-weight: 500;\">v4.5.8</span>\n      </div>\n      <div class=\"setting-row\">\n        <div class=\"setting-info\">\n          <div class=\"setting-label\">运行架构</div>\n          <div class=\"setting-desc\">0 外部 CDN 依赖 · 本地内存极速直出</div>\n        </div>\n        <span style=\"font-size: 14px; color: var(--tint-green); font-weight: 500;\">● 离线脱机</span>\n      </div>\n    </div>\n  </div>\n\n  <!-- 底部醒目保存主按钮 -->\n  <div style=\"margin: 24px 0 16px; padding: 0 4px;\">\n    <button type=\"button\" class=\"primary-btn\" id=\"btn-save-bottom\" onclick=\"handleDoneClick()\" style=\"width: 100%; padding: 14px 20px; font-size: 16px; border-radius: 12px; box-shadow: 0 4px 14px rgba(0, 122, 255, 0.3);\">\n      <svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 6 9 17l-5-5\"/></svg>\n      <span>保存设置</span>\n    </button>\n  </div>\n\n  <script>\n    const DEFAULT_CONFIG = {\n      \"@Pixiv.Enhanced.Settings.Global.Switch\": true,\n      \"@Pixiv.Enhanced.Settings.Auto.Switch\": true,\n      \"@Pixiv.Enhanced.Settings.Auto.Scopes\": [\"illust_title\", \"illust_caption\", \"tags\", \"comments\", \"user_profile\", \"novels\", \"spotlight\"],\n      \"@Pixiv.Enhanced.Settings.Filter.SkipChinese\": true,\n      \"@Pixiv.Enhanced.Settings.Novel.Font\": \"system\",\n      \"@Pixiv.Enhanced.Settings.Novel.CleanDisclaimer\": true,\n      \"@Pixiv.Enhanced.Settings.Novel.ShowOriginal\": true,\n      \"@Pixiv.Enhanced.Settings.Floating.Switch\": true,\n      \"@Pixiv.Enhanced.Settings.Translator.Source\": \"google\",\n      \"@Pixiv.Enhanced.Settings.Target.Lang\": \"zh-CN\",\n      \"@Pixiv.Enhanced.Settings.Network.ImageAccelerate\": true,\n      \"@Pixiv.Enhanced.Settings.Tag.OfflineOnly\": true,\n      \"@Pixiv.Enhanced.Settings.Image.Switch\": true,\n      \"@Pixiv.Enhanced.Settings.Image.Engine\": \"gemini_vl\",\n      \"@Pixiv.Enhanced.Settings.Auth.GeminiKey\": \"\",\n      \"@Pixiv.Enhanced.Settings.Auth.DeepSeekKey\": \"\",\n      \"@Pixiv.Enhanced.Settings.Auth.DeepSeekUrl\": \"https://api.deepseek.com/v1/chat/completions\",\n      \"@Pixiv.Enhanced.Settings.Auth.DeepSeekModel\": \"deepseek-v4-flash\",\n      \"@Pixiv.Enhanced.Settings.Auth.OpenAIKey\": \"\",\n      \"@Pixiv.Enhanced.Settings.Auth.OpenAIUrl\": \"https://api.openai.com/v1/chat/completions\",\n      \"@Pixiv.Enhanced.Settings.Auth.BaiduAppid\": \"\",\n      \"@Pixiv.Enhanced.Settings.Auth.BaiduSecret\": \"\",\n      \"@Pixiv.Enhanced.Settings.Auth.CaiyunToken\": \"\",\n      \"@Pixiv.Enhanced.Settings.Manga.ServerUrl\": \"http://127.0.0.1:5000\",\n      \"@Pixiv.Enhanced.Settings.LogLevel\": \"WARN\"\n    };\n\n    let currentConfig = Object.assign({}, DEFAULT_CONFIG);\n    let selectedScopes = new Set(DEFAULT_CONFIG[\"@Pixiv.Enhanced.Settings.Auto.Scopes\"]);\n    let isInitializing = false;\n\n    function showToast(msg, icon) {\n      const toast = document.getElementById(\"px-toast\");\n      document.getElementById(\"px-toast-msg\").textContent = msg;\n      document.getElementById(\"px-toast-icon\").textContent = icon || \"✓\";\n      toast.classList.add(\"show\");\n      clearTimeout(window._toastTimer);\n      window._toastTimer = setTimeout(() => toast.classList.remove(\"show\"), 2200);\n    }\n\n    function toggleSection(id) {\n      const card = document.getElementById(id);\n      if (card) card.classList.toggle(\"expanded\");\n    }\n\n    function toggleInputMask(inputId) {\n      const input = document.getElementById(inputId);\n      if (input) input.type = (input.type === \"password\") ? \"text\" : \"password\";\n    }\n\n    function toggleScope(el) {\n      const key = el.getAttribute(\"data-key\");\n      if (selectedScopes.has(key)) {\n        selectedScopes.delete(key);\n        el.classList.remove(\"selected\");\n      } else {\n        selectedScopes.add(key);\n        el.classList.add(\"selected\");\n      }\n      saveConfig();\n    }\n\n    function openQuickViewer() {\n      const input = document.getElementById(\"quick-illust-id\");\n      const id = input ? input.value.trim().replace(/\\D+/g, \"\") : \"\";\n      if (!id) {\n        showToast(\"请输入有效的纯数字作品 ID\", \"ℹ️\");\n        return;\n      }\n      window.location.href = \"https://www.pixiv.net/manga/viewer?illust_id=\" + id;\n    }\n\n    function onTranslatorChange(shouldSave = true) {\n      const source = document.getElementById(\"cfg-translator-source\") ? document.getElementById(\"cfg-translator-source\").value : \"google\";\n      const dsBlock = document.getElementById(\"ai-deepseek-block\");\n      const oaBlock = document.getElementById(\"ai-openai-block\");\n      const bdBlock = document.getElementById(\"ai-baidu-block\");\n      const cyBlock = document.getElementById(\"ai-caiyun-block\");\n      if (dsBlock) dsBlock.style.display = (source === \"deepseek\") ? \"block\" : \"none\";\n      if (oaBlock) oaBlock.style.display = (source === \"openai\") ? \"block\" : \"none\";\n      if (bdBlock) bdBlock.style.display = (source === \"baidu\") ? \"block\" : \"none\";\n      if (cyBlock) cyBlock.style.display = (source === \"caiyun\") ? \"block\" : \"none\";\n      if (shouldSave && !isInitializing) saveConfig();\n    }\n\n    function onMangaSwitchChange(shouldSave = true) {\n      const el = document.getElementById(\"cfg-manga-switch\");\n      const on = el ? el.checked : false;\n      const box = document.getElementById(\"manga-config-box\");\n      if (box) box.style.display = on ? \"block\" : \"none\";\n      onMangaEngineChange(shouldSave);\n    }\n\n    function onMangaEngineChange(shouldSave = true) {\n      const engineEl = document.getElementById(\"cfg-manga-engine\");\n      const engine = engineEl ? engineEl.value : \"gemini_vl\";\n      const gBlock = document.getElementById(\"manga-gemini-block\");\n      const sBlock = document.getElementById(\"manga-selfhost-block\");\n      if (gBlock) gBlock.style.display = (engine === \"gemini_vl\") ? \"block\" : \"none\";\n      if (sBlock) sBlock.style.display = (engine === \"manga_translator\") ? \"block\" : \"none\";\n      if (shouldSave && !isInitializing) saveConfig();\n    }\n\n    function updateSummaries() {\n      const autoEl = document.getElementById(\"cfg-auto-switch\");\n      const autoOn = autoEl ? autoEl.checked : true;\n      const targetLang = document.getElementById(\"cfg-target-lang\") ? document.getElementById(\"cfg-target-lang\").value : \"zh-CN\";\n      const langText = (targetLang === \"zh-CN\") ? \"简体\" : (targetLang === \"zh-TW\" ? \"繁體\" : targetLang);\n      const sumContent = document.getElementById(\"sum-content\");\n      if (sumContent) sumContent.textContent = (autoOn ? \"自动:开\" : \"自动:关\") + \" · \" + langText;\n\n      const fontEl = document.getElementById(\"cfg-novel-font\");\n      const font = fontEl ? fontEl.value : \"system\";\n      const fontNameMap = { system: \"苹方\", songti: \"宋体\", kaiti: \"楷体\", yuanti: \"圆体\" };\n      const showOrigEl = document.getElementById(\"cfg-novel-show-original\");\n      const showOrig = showOrigEl ? showOrigEl.checked : true;\n      const sumNovel = document.getElementById(\"sum-novel\");\n      if (sumNovel) sumNovel.textContent = (showOrig ? \"双语对照\" : \"仅译文\") + \" · \" + (fontNameMap[font] || \"原版\");\n\n      const mangaEl = document.getElementById(\"cfg-manga-switch\");\n      const mangaOn = mangaEl ? mangaEl.checked : false;\n      const engineEl = document.getElementById(\"cfg-manga-engine\");\n      const engine = engineEl ? engineEl.value : \"gemini_vl\";\n      const engineMap = { gemini_vl: \"Gemini\", deepseek_vl: \"DeepSeek-VL\", gpt4o_mini: \"GPT-4o-mini\", manga_translator: \"自建服务\" };\n      const sumManga = document.getElementById(\"sum-manga\");\n      if (sumManga) sumManga.textContent = mangaOn ? (\"已开启 · \" + (engineMap[engine] || \"视觉AI\")) : \"未开启\";\n\n      const floatingEl = document.getElementById(\"cfg-floating-switch\");\n      const floatingOn = floatingEl ? floatingEl.checked : true;\n      const sumFloating = document.getElementById(\"sum-floating\");\n      if (sumFloating) sumFloating.textContent = floatingOn ? \"已开启\" : \"已关闭\";\n\n      const transEl = document.getElementById(\"cfg-translator-source\");\n      const trans = transEl ? transEl.value : \"google\";\n      const transMap = { google: \"Google免费\", deepseek: \"DeepSeek\", openai: \"OpenAI\", baidu: \"百度翻译\", caiyun: \"彩云小译\" };\n      const sumAi = document.getElementById(\"sum-ai\");\n      if (sumAi) sumAi.textContent = transMap[trans] || trans;\n    }\n\n    async function handleDoneClick() {\n      const btnTop = document.querySelector(\".done-nav-btn\");\n      const btnBtm = document.getElementById(\"btn-save-bottom\");\n      if (btnTop) btnTop.textContent = \"⏳ 正在保存…\";\n      if (btnBtm) {\n        const span = btnBtm.querySelector(\"span\");\n        if (span) span.textContent = \"⏳ 正在保存…\";\n      }\n\n      let saveOk = false;\n      try {\n        await saveConfig();\n        saveOk = true;\n        showToast(\"设置已成功保存生效\", \"✓\");\n        if (btnTop) btnTop.textContent = \"✓ 已保存\";\n        if (btnBtm) {\n          const span = btnBtm.querySelector(\"span\");\n          if (span) span.textContent = \"✓ 设置已保存\";\n        }\n      } catch (e) {\n        showToast(\"保存失败，请检查网络\", \"❌\");\n        if (btnTop) btnTop.textContent = \"保存失败\";\n        if (btnBtm) {\n          const span = btnBtm.querySelector(\"span\");\n          if (span) span.textContent = \"保存失败，重试\";\n        }\n      }\n\n      if (saveOk) {\n        setTimeout(function () {\n          if (btnTop) btnTop.textContent = \"完成\";\n          if (btnBtm) {\n            const span = btnBtm.querySelector(\"span\");\n            if (span) span.textContent = \"保存设置\";\n          }\n          try {\n            if (window.history.length > 1) {\n              window.history.back();\n            } else {\n              window.close();\n            }\n          } catch (e) {}\n        }, 400);\n      } else {\n        setTimeout(function () {\n          if (btnTop) btnTop.textContent = \"完成\";\n          if (btnBtm) {\n            const span = btnBtm.querySelector(\"span\");\n            if (span) span.textContent = \"保存设置\";\n          }\n        }, 2000);\n      }\n    }\n\n    async function loadConfig() {\n      isInitializing = true;\n      try {\n        const res = await fetch(\"/api/get\").then(r => r.json()).catch(() => null);\n        if (res && typeof res === \"object\") {\n          currentConfig = Object.assign({}, DEFAULT_CONFIG, res);\n        }\n      } catch (e) { }\n\n      const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };\n      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };\n\n      setCheck(\"cfg-global-switch\", currentConfig[\"@Pixiv.Enhanced.Settings.Global.Switch\"]);\n      setCheck(\"cfg-auto-switch\", currentConfig[\"@Pixiv.Enhanced.Settings.Auto.Switch\"]);\n      setCheck(\"cfg-skip-chinese\", currentConfig[\"@Pixiv.Enhanced.Settings.Filter.SkipChinese\"]);\n      setVal(\"cfg-target-lang\", currentConfig[\"@Pixiv.Enhanced.Settings.Target.Lang\"] || \"zh-CN\");\n\n      setVal(\"cfg-novel-font\", currentConfig[\"@Pixiv.Enhanced.Settings.Novel.Font\"] || \"system\");\n      setCheck(\"cfg-clean-disclaimer\", currentConfig[\"@Pixiv.Enhanced.Settings.Novel.CleanDisclaimer\"]);\n      setCheck(\"cfg-novel-show-original\", currentConfig[\"@Pixiv.Enhanced.Settings.Novel.ShowOriginal\"] !== false);\n      setCheck(\"cfg-floating-switch\", currentConfig[\"@Pixiv.Enhanced.Settings.Floating.Switch\"] !== false);\n\n      setVal(\"cfg-translator-source\", currentConfig[\"@Pixiv.Enhanced.Settings.Translator.Source\"] || \"google\");\n      setVal(\"cfg-deepseek-key\", currentConfig[\"@Pixiv.Enhanced.Settings.Auth.DeepSeekKey\"] || \"\");\n      setVal(\"cfg-deepseek-url\", currentConfig[\"@Pixiv.Enhanced.Settings.Auth.DeepSeekUrl\"] || \"https://api.deepseek.com/v1/chat/completions\");\n      setVal(\"cfg-deepseek-model\", currentConfig[\"@Pixiv.Enhanced.Settings.Auth.DeepSeekModel\"] || \"deepseek-v4-flash\");\n      setVal(\"cfg-openai-key\", currentConfig[\"@Pixiv.Enhanced.Settings.Auth.OpenAIKey\"] || \"\");\n      setVal(\"cfg-openai-url\", currentConfig[\"@Pixiv.Enhanced.Settings.Auth.OpenAIUrl\"] || \"https://api.openai.com/v1/chat/completions\");\n\n      setCheck(\"cfg-manga-switch\", currentConfig[\"@Pixiv.Enhanced.Settings.Image.Switch\"]);\n      setVal(\"cfg-manga-engine\", currentConfig[\"@Pixiv.Enhanced.Settings.Image.Engine\"] || \"gemini_vl\");\n      setVal(\"cfg-gemini-key\", currentConfig[\"@Pixiv.Enhanced.Settings.Auth.GeminiKey\"] || \"\");\n      setVal(\"cfg-baidu-appid\", currentConfig[\"@Pixiv.Enhanced.Settings.Auth.BaiduAppid\"] || \"\");\n      setVal(\"cfg-baidu-secret\", currentConfig[\"@Pixiv.Enhanced.Settings.Auth.BaiduSecret\"] || \"\");\n      setVal(\"cfg-caiyun-token\", currentConfig[\"@Pixiv.Enhanced.Settings.Auth.CaiyunToken\"] || \"\");\n      setVal(\"cfg-manga-server\", currentConfig[\"@Pixiv.Enhanced.Settings.Manga.ServerUrl\"] || \"http://127.0.0.1:5000\");\n\n      setCheck(\"cfg-image-accelerate\", currentConfig[\"@Pixiv.Enhanced.Settings.Network.ImageAccelerate\"] !== false);\n      setCheck(\"cfg-tag-offline\", currentConfig[\"@Pixiv.Enhanced.Settings.Tag.OfflineOnly\"]);\n\n      const scopes = Array.isArray(currentConfig[\"@Pixiv.Enhanced.Settings.Auto.Scopes\"])\n        ? currentConfig[\"@Pixiv.Enhanced.Settings.Auto.Scopes\"]\n        : DEFAULT_CONFIG[\"@Pixiv.Enhanced.Settings.Auto.Scopes\"];\n      selectedScopes = new Set(scopes);\n      document.querySelectorAll(\".scope-chip\").forEach(chip => {\n        const k = chip.getAttribute(\"data-key\");\n        if (selectedScopes.has(k)) chip.classList.add(\"selected\");\n        else chip.classList.remove(\"selected\");\n      });\n\n      onTranslatorChange(false);\n      onMangaSwitchChange(false);\n      updateSummaries();\n      isInitializing = false;\n    }\n\n    async function saveConfig() {\n      if (isInitializing) return;\n      const getCheck = (id, def) => { const el = document.getElementById(id); return el ? el.checked : def; };\n      const getVal = (id, def) => { const el = document.getElementById(id); return el ? el.value.trim() : def; };\n\n      currentConfig[\"@Pixiv.Enhanced.Settings.Global.Switch\"] = getCheck(\"cfg-global-switch\", true);\n      currentConfig[\"@Pixiv.Enhanced.Settings.Auto.Switch\"] = getCheck(\"cfg-auto-switch\", true);\n      currentConfig[\"@Pixiv.Enhanced.Settings.Filter.SkipChinese\"] = getCheck(\"cfg-skip-chinese\", true);\n      currentConfig[\"@Pixiv.Enhanced.Settings.Target.Lang\"] = getVal(\"cfg-target-lang\", \"zh-CN\");\n      currentConfig[\"@Pixiv.Enhanced.Settings.Auto.Scopes\"] = Array.from(selectedScopes);\n\n      currentConfig[\"@Pixiv.Enhanced.Settings.Novel.Font\"] = getVal(\"cfg-novel-font\", \"system\");\n      currentConfig[\"@Pixiv.Enhanced.Settings.Novel.CleanDisclaimer\"] = getCheck(\"cfg-clean-disclaimer\", true);\n      currentConfig[\"@Pixiv.Enhanced.Settings.Novel.ShowOriginal\"] = getCheck(\"cfg-novel-show-original\", true);\n      currentConfig[\"@Pixiv.Enhanced.Settings.Floating.Switch\"] = getCheck(\"cfg-floating-switch\", true);\n\n      currentConfig[\"@Pixiv.Enhanced.Settings.Translator.Source\"] = getVal(\"cfg-translator-source\", \"google\");\n      currentConfig[\"@Pixiv.Enhanced.Settings.Auth.DeepSeekKey\"] = getVal(\"cfg-deepseek-key\", \"\");\n      currentConfig[\"@Pixiv.Enhanced.Settings.Auth.DeepSeekUrl\"] = getVal(\"cfg-deepseek-url\", \"https://api.deepseek.com/v1/chat/completions\");\n      currentConfig[\"@Pixiv.Enhanced.Settings.Auth.DeepSeekModel\"] = getVal(\"cfg-deepseek-model\", \"deepseek-v4-flash\");\n      currentConfig[\"@Pixiv.Enhanced.Settings.Auth.OpenAIKey\"] = getVal(\"cfg-openai-key\", \"\");\n      currentConfig[\"@Pixiv.Enhanced.Settings.Auth.OpenAIUrl\"] = getVal(\"cfg-openai-url\", \"https://api.openai.com/v1/chat/completions\");\n\n      currentConfig[\"@Pixiv.Enhanced.Settings.Network.ImageAccelerate\"] = getCheck(\"cfg-image-accelerate\", true);\n      currentConfig[\"@Pixiv.Enhanced.Settings.Tag.OfflineOnly\"] = getCheck(\"cfg-tag-offline\", true);\n      currentConfig[\"@Pixiv.Enhanced.Settings.Image.Switch\"] = getCheck(\"cfg-manga-switch\", true);\n      currentConfig[\"@Pixiv.Enhanced.Settings.Image.Engine\"] = getVal(\"cfg-manga-engine\", \"gemini_vl\");\n      currentConfig[\"@Pixiv.Enhanced.Settings.Auth.GeminiKey\"] = getVal(\"cfg-gemini-key\", \"\");\n      currentConfig[\"@Pixiv.Enhanced.Settings.Auth.BaiduAppid\"] = getVal(\"cfg-baidu-appid\", \"\");\n      currentConfig[\"@Pixiv.Enhanced.Settings.Auth.BaiduSecret\"] = getVal(\"cfg-baidu-secret\", \"\");\n      currentConfig[\"@Pixiv.Enhanced.Settings.Auth.CaiyunToken\"] = getVal(\"cfg-caiyun-token\", \"\");\n      currentConfig[\"@Pixiv.Enhanced.Settings.Manga.ServerUrl\"] = getVal(\"cfg-manga-server\", \"http://127.0.0.1:5000\");\n\n      updateSummaries();\n\n      try {\n        await fetch(\"/api/set\", {\n          method: \"POST\",\n          headers: { \"Content-Type\": \"application/json\" },\n          body: JSON.stringify(currentConfig)\n        });\n        showToast(\"设置已实时同步保存\", \"✓\");\n      } catch (e) {\n        showToast(\"已在本地更新\", \"ℹ️\");\n      }\n    }\n\n    async function testAIConnection() {\n      const btn = document.getElementById(\"btn-test-ai\");\n      if (!btn) return;\n      btn.disabled = true;\n      btn.innerHTML = '<span>⏳ 正在测试连接与测速…</span>';\n      const start = Date.now();\n\n      try {\n        const sourceEl = document.getElementById(\"cfg-translator-source\");\n        const source = sourceEl ? sourceEl.value : \"google\";\n        const appid = (document.getElementById(\"cfg-baidu-appid\") ? document.getElementById(\"cfg-baidu-appid\").value : \"\").trim();\n        const secret = (document.getElementById(\"cfg-baidu-secret\") ? document.getElementById(\"cfg-baidu-secret\").value : \"\").trim();\n        const caiyunToken = (document.getElementById(\"cfg-caiyun-token\") ? document.getElementById(\"cfg-caiyun-token\").value : \"\").trim();\n\n        saveConfig();\n\n        const query = \"?source=\" + encodeURIComponent(source) +\n          \"&appid=\" + encodeURIComponent(appid) +\n          \"&secret=\" + encodeURIComponent(secret) +\n          \"&caiyun_token=\" + encodeURIComponent(caiyunToken);\n\n        const res = await fetch(\"/api/test_ai\" + query, { method: \"POST\" })\n          .then(r => r.json())\n          .catch(() => null);\n        const latency = Date.now() - start;\n\n        if (res && res.ok) {\n          const detail = res.translation ? (\" · \" + res.translation) : \"\";\n          btn.innerHTML = '<span>🟢 连接正常 · ' + latency + 'ms' + detail + '</span>';\n          showToast(\"翻译模型连接正常 (\" + latency + \"ms)\", \"🟢\");\n        } else {\n          const err = (res && res.error) ? res.error : \"请求超时或鉴权失败\";\n          btn.innerHTML = '<span>🔴 失败: ' + err.slice(0, 18) + '</span>';\n          showToast(\"连接失败: \" + err, \"❌\");\n        }\n      } catch (e) {\n        btn.innerHTML = '<span>🔴 网络异常</span>';\n        showToast(\"网络请求异常: \" + (e && e.message ? e.message : e), \"❌\");\n      }\n\n      setTimeout(() => {\n        if (btn) {\n          btn.disabled = false;\n          btn.innerHTML = '<svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 14h12l-4 8 10-10H12l4-8z\"/></svg><span>测试翻译模型连接与延迟</span>';\n        }\n      }, 3500);\n    }\n\n    async function testMangaConnection() {\n      const btn = document.getElementById(\"btn-test-manga\");\n      if (!btn) return;\n      btn.disabled = true;\n      btn.innerHTML = '<span>⏳ 正在测试漫翻服务…</span>';\n      const start = Date.now();\n\n      try {\n        const engine = document.getElementById(\"cfg-manga-engine\") ? document.getElementById(\"cfg-manga-engine\").value : \"gemini_vl\";\n        const server = (document.getElementById(\"cfg-manga-server\") ? document.getElementById(\"cfg-manga-server\").value : \"\").trim();\n        const geminiKey = (document.getElementById(\"cfg-gemini-key\") ? document.getElementById(\"cfg-gemini-key\").value : \"\").trim();\n\n        // 立即触发保存保证同步\n        saveConfig();\n\n        let query = \"?engine=\" + encodeURIComponent(engine) +\n          \"&server=\" + encodeURIComponent(server);\n        if (engine === \"gemini_vl\") {\n          query += \"&gemini_key=\" + encodeURIComponent(geminiKey);\n        }\n\n        const res = await fetch(\"/api/test_manga\" + query, { method: \"POST\" })\n          .then(r => r.json())\n          .catch(() => null);\n        const latency = Date.now() - start;\n\n        if (res && res.ok) {\n          const detail = (res.count !== undefined) ? (\" · \" + res.count + \"处\") : (res.translation ? (\" · \" + res.translation) : \"\");\n          btn.innerHTML = '<span>🟢 漫翻正常 · ' + latency + 'ms' + detail + '</span>';\n          showToast(\"漫翻服务测试正常 (\" + latency + \"ms)\", \"🟢\");\n        } else {\n          const err = (res && res.error) ? res.error : \"请求超时或连接失败\";\n          btn.innerHTML = '<span>🔴 失败: ' + err.slice(0, 18) + '</span>';\n          showToast(\"漫翻测试失败: \" + err, \"❌\");\n        }\n      } catch (e) {\n        btn.innerHTML = '<span>🔴 网络异常</span>';\n        showToast(\"网络请求异常: \" + (e && e.message ? e.message : e), \"❌\");\n      }\n\n      setTimeout(() => {\n        if (btn) {\n          btn.disabled = false;\n          btn.innerHTML = '<svg viewBox=\"0 0 24 24\" width=\"14\" height=\"14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 14h12l-4 8 10-10H12l4-8z\"/></svg><span>测试漫翻服务连接与测速</span>';\n        }\n      }, 3500);\n    }\n\n    /* ─── 真实缓存管理 ─── */\n    async function loadCacheStats() {\n      const sizeEl = document.getElementById(\"cache-size\");\n      const countEl = document.getElementById(\"cache-count\");\n      const timeEl = document.getElementById(\"cache-time\");\n      try {\n        const res = await fetch(\"/api/cache_stats\").then(r => r.json());\n        if (!res || !res.ok) throw new Error(\"统计失败\");\n        if (sizeEl) sizeEl.textContent = res.sizeText || \"0 B\";\n        if (countEl) countEl.textContent = (res.count || 0) + \" 个\";\n        if (timeEl) timeEl.textContent = res.timeText || \"暂无缓存\";\n      } catch (e) {\n        if (sizeEl) sizeEl.textContent = \"0 B\";\n        if (countEl) countEl.textContent = \"0 个\";\n        if (timeEl) timeEl.textContent = \"暂无缓存\";\n      }\n    }\n\n    function openClearModal() {\n      const modal = document.getElementById(\"clear-modal\");\n      if (modal) modal.classList.add(\"show\");\n    }\n\n    function closeClearModal() {\n      const modal = document.getElementById(\"clear-modal\");\n      if (modal) modal.classList.remove(\"show\");\n    }\n\n    async function executeClearCache() {\n      closeClearModal();\n      const feedback = document.getElementById(\"cache-feedback\");\n      if (feedback) feedback.textContent = \"正在清理本地缓存…\";\n      try {\n        const res = await fetch(\"/api/clear_cache\", { method: \"POST\" }).then(r => r.json());\n        if (!res || !res.ok) throw new Error(\"清理异常\");\n        if (feedback) feedback.textContent = \"✓ 缓存已清理：已释放 \" + res.sizeText + \" · 已删除 \" + res.count + \" 条\";\n        showToast(\"缓存已清理\", \"✓\");\n        await loadCacheStats();\n      } catch (e) {\n        if (feedback) feedback.textContent = \"清理失败，请重试\";\n        showToast(\"清理缓存失败\", \"!\");\n      }\n    }\n\n    function initSettingsPage() {\n      loadConfig();\n      loadCacheStats();\n    }\n\n    window.addEventListener(\"pageshow\", () => {\n      initSettingsPage();\n    });\n\n    document.addEventListener(\"DOMContentLoaded\", () => {\n      initSettingsPage();\n    });\n  </script>\n</body>\n</html>\n";

// ─── 1. 配置管理中心（对接 PreferencePanes 存储模型）───────────────────────────
function getSetting(key, defaultVal) {
  try {
    const val = $.getdata(key);
    if (val === undefined || val === null || val === "") return defaultVal;
    if (val === "true") return true;
    if (val === "false") return false;
    if (/^[\[{]/.test(val)) {
      try { return JSON.parse(val); } catch (e) { }
    }
    return val;
  } catch (e) {
    return defaultVal;
  }
}

function loadConfig() {
  const globalSwitch = getSetting("@Pixiv.Enhanced.Settings.Global.Switch", true);
  const autoSwitch = getSetting("@Pixiv.Enhanced.Settings.Auto.Switch", true);
  const rawScopes = getSetting("@Pixiv.Enhanced.Settings.Auto.Scopes", ["illust_title", "illust_caption", "tags", "comments", "user_profile", "novels", "spotlight"]);
  const scopes = Array.isArray(rawScopes) ? rawScopes : (typeof rawScopes === "string" ? rawScopes.split(",") : []);
  if (!scopes.includes("illust_title")) scopes.push("illust_title");
  const skipChinese = getSetting("@Pixiv.Enhanced.Settings.Filter.SkipChinese", true);
  const novelFont = getSetting("@Pixiv.Enhanced.Settings.Novel.Font", "system");
  const novelCleanDisclaimer = getSetting("@Pixiv.Enhanced.Settings.Novel.CleanDisclaimer", true);
  const novelShowOriginal = getSetting("@Pixiv.Enhanced.Settings.Novel.ShowOriginal", true);
  const floatingSwitch = getSetting("@Pixiv.Enhanced.Settings.Floating.Switch", true);
  const translator = (getSetting("@Pixiv.Enhanced.Settings.Translator.Source", "google") || "google").toLowerCase();
  const targetLang = getSetting("@Pixiv.Enhanced.Settings.Target.Lang", "zh-CN") || "zh-CN";
  const tagOfflineOnly = getSetting("@Pixiv.Enhanced.Settings.Tag.OfflineOnly", true);
  const imageAccelerate = getSetting("@Pixiv.Enhanced.Settings.Network.ImageAccelerate", true);

  // 漫翻设置
  const imageSwitch = getSetting("@Pixiv.Enhanced.Settings.Image.Switch", true);
  const imageEngine = getSetting("@Pixiv.Enhanced.Settings.Image.Engine", "gemini_vl");
  const imageRenderMode = getSetting("@Pixiv.Enhanced.Settings.Image.RenderMode", "overlay");

  // 密钥及服务
  const geminiKey = getSetting("@Pixiv.Enhanced.Settings.Auth.GeminiKey", "");
  const deepseekKey = getSetting("@Pixiv.Enhanced.Settings.Auth.DeepSeekKey", "");
  const deepseekUrl = getSetting("@Pixiv.Enhanced.Settings.Auth.DeepSeekUrl", "https://api.deepseek.com/v1/chat/completions");
  const deepseekModel = getSetting("@Pixiv.Enhanced.Settings.Auth.DeepSeekModel", "deepseek-v4-flash");
  const openaiKey = getSetting("@Pixiv.Enhanced.Settings.Auth.OpenAIKey", "");
  const openaiUrl = getSetting("@Pixiv.Enhanced.Settings.Auth.OpenAIUrl", "https://api.openai.com/v1/chat/completions");
  const baiduAppid = getSetting("@Pixiv.Enhanced.Settings.Auth.BaiduAppid", "");
  const baiduSecret = getSetting("@Pixiv.Enhanced.Settings.Auth.BaiduSecret", "");
  const caiyunToken = getSetting("@Pixiv.Enhanced.Settings.Auth.CaiyunToken", "");
  const mangaServer = getSetting("@Pixiv.Enhanced.Settings.Manga.ServerUrl", "http://127.0.0.1:5000");
  const logLevel = getSetting("@Pixiv.Enhanced.Settings.LogLevel", "WARN");

  return {
    globalSwitch,
    autoSwitch,
    scopes,
    skipChinese,
    novelFont,
    novelCleanDisclaimer,
    novelShowOriginal,
    floatingSwitch,
    translator,
    targetLang,
    tagOfflineOnly,
    imageAccelerate,
    imageSwitch,
    imageEngine,
    imageRenderMode,
    geminiKey,
    deepseekKey,
    deepseekUrl,
    deepseekModel,
    openaiKey,
    openaiUrl,
    baiduAppid,
    baiduSecret,
    caiyunToken,
    mangaServer,
    logLevel
  };
}

// ─── 2. 内置 500+ Pixiv 高频 Tag 离线汉化字典（0ms 响应，0 网络开销）───────────────
const PIXIV_TAG_DICT = {
  // 分类与属性
  "オリジナル": "原创", "版権": "二创/同人", "R-18": "R-18", "R-18G": "R-18G", "全年齢": "全年龄",
  "うごイラ": "动图", "漫画": "漫画", "小説": "小说", "イラスト": "插画", "メイキング": "过程/画法",
  "女の子": "女孩子", "男の子": "男孩子", "ショタ": "正太", "ロリ": "萝莉", "美少女": "美少女",
  "美女": "美女", "イケメン": "帅哥", "お姉さん": "大姐姐", "おじさん": "大叔", "人外": "非人生物",
  "獣人": "兽人", "ケモミミ": "兽耳", "猫耳": "猫耳", "狐耳": "狐耳", "犬耳": "犬耳", "ウサ耳": "兔耳",
  "エルフ": "精灵", "天使": "天使", "悪魔": "恶魔", "吸血鬼": "吸血鬼", "ドラゴン": "龙", "魔法少女": "魔法少女",

  // 发型与发色
  "ツインテール": "双马尾", "ポニーテール": "单马尾", "サイドテール": "侧马尾", "お団子": "丸子头",
  "ショートヘア": "短发", "ロングヘア": "长发", "セミロング": "中长发", "ボブ": "波波头",
  "三つ編み": "麻花辫", "前髪ぱっつん": "齐刘海", "アホ毛": "呆毛", "ドリル": "卷发/钻头卷",
  "金髪": "金发", "銀髪": "银发", "白髪": "白发", "黒髪": "黑发", "茶髪": "茶发",
  "赤髪": "红发", "青髪": "蓝发", "緑髪": "绿发", "桃髪": "粉发", "紫髪": "紫发",

  // 瞳色与表情
  "赤目": "红瞳", "青目": "蓝瞳", "金目": "金瞳", "緑目": "绿瞳", "オッドアイ": "异色瞳",
  "碧眼": "碧眼", "銀目": "银瞳", "紫目": "紫瞳", "笑顔": "笑容", "泣き顔": "哭泣脸",
  "照れ": "害羞", "ジト目": "死鱼眼", "ウィンク": "眨眼", "キス": "接吻", "ドヤ顔": "得意脸",

  // 服饰与装扮
  "制服": "制服", "セーラー服": "水手服", "ブレザー": "西装制服", "スク水": "死库水",
  "水着": "泳装", "ビキニ": "比基尼", "メイド": "女仆装", "バニーガール": "兔女郎",
  "着物": "和服", "浴衣": "浴衣", "巫女": "巫女服", "チャイナドレス": "旗袍",
  "スーツ": "西装", "パーカー": "连帽衫", "ドレス": "礼服/连衣裙", "体操着": "体操服",
  "メガネ": "眼镜", "サングラス": "太阳镜", "マスク": "口罩", "リボン": "蝴蝶结",
  "帽子": "帽子", "ヘッドホン": "耳机", "ガーターベルト": "吊袜带",
  "黒タイツ": "黑丝", "白タイツ": "白丝", "ニーソ": "过膝袜", "サイハイ": "大腿袜",
  "ストッキング": "丝袜", "素足": "赤足/光脚", "裸足": "裸足", "手袋": "手套",
  "巨乳": "巨乳", "爆乳": "爆乳", "貧乳": "贫乳", "微乳": "微乳", "ふともも": "大腿",
  "お腹": "肚子/腹部", "へそ": "肚脐", "胸": "胸部", "お尻": "臀部", "パンツ": "内裤/短裤",
  "ぱんつ": "胖次", "下着": "内衣", "ランジェリー": "性感内衣", "パンチラ": "走光/露胖次",

  // 场景与意境
  "背景": "背景", "風景": "风景", "空": "天空", "青空": "青空", "雲": "云彩",
  "夜": "夜晚", "夜景": "夜景", "星空": "星空", "月": "月亮", "満月": "满月",
  "夕焼け": "夕阳", "夕暮れ": "黄昏", "朝日": "朝阳", "雨": "雨景", "雪": "雪景",
  "海": "大海", "水着海": "海边泳装", "水": "水面", "水中": "水中", "波": "波浪",
  "花": "花卉", "桜": "樱花", "向日葵": "向日葵", "紅葉": "红叶", "森": "森林",
  "部屋": "房间", "街": "街道", "廃墟": "废墟", "鳥居": "鸟居", "神社": "神社",
  "サイバーパンク": "赛博朋克", "ファンタジー": "奇幻", "SF": "科幻", "日常": "日常",

  // 画风与技法
  "落書き": "涂鸦", "練習": "练习", "習作": "习作", "らくがき": "随笔涂鸦",
  "厚塗り": "厚涂", "水彩": "水彩", "グリザイユ": "灰阶厚涂", "ドット絵": "像素画",
  "モノクロ": "黑白", "線画": "线稿", "デフォルメ": "Q版化", "ちびキャラ": "Q版角色",
  "シルエット": "剪影", "透明水彩": "透明水彩", "油彩": "油画", "アナログ": "手绘/实体绘",

  // 热门作品 / IP
  "原神": "原神", "崩壊3rd": "崩坏3", "崩壊:スターレイル": "崩坏:星穹铁道", "ゼンレスゾーンゼロ": "绝区零",
  "ブルーアーカイブ": "碧蓝档案", "アズールレーン": "碧蓝航线", "Fate/Grand Order": "FGO", "FGO": "FGO",
  "東方": "东方Project", "東方Project": "东方Project", "ウマ娘": "赛马娘", "ウマ娘プリティーダービー": "赛马娘",
  "艦これ": "舰队Collection", "艦隊これくしょん": "舰队Collection", "アイマス": "偶像大师",
  "ホロライブ": "Hololive", "にじさんじ": "彩虹社", "Vtuber": "虚拟主播",
  "ポケモン": "宝可梦", "ポケットモンスター": "宝可梦", "初音ミク": "初音未来", "ボーカロイド": "VOCALOID",
  "チェンソーマン": "电锯人", "呪術廻戦": "咒术回战", "鬼滅の刃": "鬼灭之刃", "SPY×FAMILY": "间谍过家家",
  "ぼっち・ざ・ろっく!": "孤独摇滚!", "推しの子": "我推的孩子", "葬送のフリーレン": "葬送的芙莉莲",

  // 评价与常用标签
  "なにこれかわいい": "太可爱了吧", "なにこれ尊い": "太赞了吧", "魅惑のふともも": "诱人美腿",
  "魅惑の谷間": "诱人乳沟", "極上の乳": "极上美乳", "美脚": "美腿", "透け": "透视/半透明",
  "pixiv今日のお題": "今日主题", "ルーキーランキング": "新人榜", "デイリーランキング": "日榜",
  "ウィークリーランキング": "周榜", "マンスリーランキング": "月榜", "男子に人気": "男性向热门", "女子に人気": "女性向热门",

  // 补充高频角色、题材与作品
  "新選組": "新选组", "藤堂平助": "藤堂平助", "早川アキ": "早川秋", "よその子": "自创角色/他人家孩子",
  "HQ!!": "排球少年!!", "ハイキュー!!": "排球少年!!", "819プラス": "排球梦向/HQ+", "HQプラス": "排球梦向/HQ+",
  "赤葦京治": "赤苇京治", "五条悟": "五条悟", "夏油傑": "夏油杰", "虎杖悠仁": "虎杖悠仁", "伏黒恵": "伏黑惠",
  "デンジ": "电次", "マキマ": "玛奇玛", "パワー": "帕瓦", "早川家": "早川家",
  "オリジナル漫画": "原创漫画", "創作男女": "创作男女", "創作BL": "原创BL", "創作百合": "原创百合",
  "百合": "百合", "BL": "BL", "GL": "GL", "NL": "正常向/BG", "夢向け": "梦向",
  "女主人公": "女主角", "男主人公": "男主角", "現代": "现代", "学園": "学园/校园",
  "高校生": "高中生", "中学生": "初中生", "大学生": "大学生", "社会人": "上班族/社会人",
  "同棲": "同居", "幼馴染": "青梅竹马", "両片思い": "双向暗恋",
  "ハッピーエンド": "HE/圆满结局", "バッドエンド": "BE/悲剧结局", "ほのぼの": "温馨/治愈",
  "シリアス": "正剧/严肃", "ギャグ": "搞笑", "ヤンデレ": "病娇", "ツンデレ": "傲娇",
  "メンヘラ": "地雷系/精神敏感", "地雷系": "地雷系", "量産型": "量产型", "純愛": "纯爱",
  "溺愛": "溺爱", "独占欲": "独占欲", "執着": "执念", "嫉妬": "吃醋/嫉妒",
  "女装": "女装", "男装": "男装", "TS": "性转", "性転換": "性转换", "ふたなり": "扶她",
  "ショタコン": "正太控", "ロリコン": "萝莉控", "おねショタ": "大姐姐与正太",
  "年上": "年上", "年下": "年下", "年齢操作": "年龄操作", "パロディ": "同人恶搞/Paro"
};

// ─── MD5 纯原生哈希算法 (用于百度翻译鉴权签名) ───────────────────────────
function md5(str) {
  function rl(n, s) { return (n << s) | (n >>> (32 - s)); }
  function au(x, y) { return (x + y) >>> 0; }
  function F(x, y, z) { return (x & y) | (~x & z); }
  function G(x, y, z) { return (x & z) | (y & ~z); }
  function H(x, y, z) { return x ^ y ^ z; }
  function I(x, y, z) { return y ^ (x | ~z); }
  function FF(a, b, c, d, x, s, ac) { a = au(a, au(au(F(b, c, d), x), ac)); return au(rl(a, s), b); }
  function GG(a, b, c, d, x, s, ac) { a = au(a, au(au(G(b, c, d), x), ac)); return au(rl(a, s), b); }
  function HH(a, b, c, d, x, s, ac) { a = au(a, au(au(H(b, c, d), x), ac)); return au(rl(a, s), b); }
  function II(a, b, c, d, x, s, ac) { a = au(a, au(au(I(b, c, d), x), ac)); return au(rl(a, s), b); }
  function utf8(s) {
    s = String(s || "").replace(/\r\n/g, "\n");
    let u = "";
    for (let n = 0; n < s.length; n++) {
      const c = s.charCodeAt(n);
      if (c < 128) u += String.fromCharCode(c);
      else if (c < 2048) { u += String.fromCharCode((c >> 6) | 192); u += String.fromCharCode((c & 63) | 128); }
      else { u += String.fromCharCode((c >> 12) | 224); u += String.fromCharCode(((c >> 6) & 63) | 128); u += String.fromCharCode((c & 63) | 128); }
    }
    return u;
  }
  function toWords(s) {
    const nBytes = s.length;
    const nWords = (((nBytes + 8) >> 6) + 1) * 16;
    const w = [];
    for (let i = 0; i < nWords; i++) w[i] = 0;
    for (let i = 0; i < nBytes; i++) w[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8);
    w[nBytes >> 2] |= 0x80 << ((nBytes % 4) * 8);
    w[nWords - 2] = nBytes << 3;
    w[nWords - 1] = nBytes >>> 29;
    return w;
  }
  function toHex(num) {
    let h = "";
    for (let j = 0; j <= 3; j++) {
      const b = (num >>> (j * 8)) & 255;
      const t = "0" + b.toString(16);
      h += t.substr(t.length - 2, 2);
    }
    return h;
  }
  str = utf8(str);
  const x = toWords(str);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  for (let k = 0; k < x.length; k += 16) {
    const aa = a, bb = b, cc = c, dd = d;
    a = FF(a, b, c, d, x[k + 0], 7, 0xd76aa478); d = FF(d, a, b, c, x[k + 1], 12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], 17, 0x242070db); b = FF(b, c, d, a, x[k + 3], 22, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], 7, 0xf57c0faf); d = FF(d, a, b, c, x[k + 5], 12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], 17, 0xa8304613); b = FF(b, c, d, a, x[k + 7], 22, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], 7, 0x698098d8); d = FF(d, a, b, c, x[k + 9], 12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], 17, 0xffff5bb1); b = FF(b, c, d, a, x[k + 11], 22, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], 7, 0x6b901122); d = FF(d, a, b, c, x[k + 13], 12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], 17, 0xa679438e); b = FF(b, c, d, a, x[k + 15], 22, 0x49b40821);
    a = GG(a, b, c, d, x[k + 1], 5, 0xf61e2562); d = GG(d, a, b, c, x[k + 6], 9, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], 14, 0x265e5a51); b = GG(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], 5, 0xd62f105d); d = GG(d, a, b, c, x[k + 10], 9, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], 14, 0xd8a1e681); b = GG(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], 5, 0x21e1cde6); d = GG(d, a, b, c, x[k + 14], 9, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], 14, 0xf4d50d87); b = GG(b, c, d, a, x[k + 8], 20, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], 5, 0xa9e3e905); d = GG(d, a, b, c, x[k + 2], 9, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], 14, 0x676f02d9); b = GG(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);
    a = HH(a, b, c, d, x[k + 5], 4, 0xfffa3942); d = HH(d, a, b, c, x[k + 8], 11, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], 16, 0x6d9d6122); b = HH(b, c, d, a, x[k + 14], 23, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], 4, 0xa4beea44); d = HH(d, a, b, c, x[k + 4], 11, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], 16, 0xf6bb4b60); b = HH(b, c, d, a, x[k + 10], 23, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], 4, 0x289b7ec6); d = HH(d, a, b, c, x[k + 0], 11, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], 16, 0xd4ef3085); b = HH(b, c, d, a, x[k + 6], 23, 0x04881d05);
    a = HH(a, b, c, d, x[k + 9], 4, 0xd9d4d039); d = HH(d, a, b, c, x[k + 12], 11, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], 16, 0x1fa27cf8); b = HH(b, c, d, a, x[k + 2], 23, 0xc4ac5665);
    a = II(a, b, c, d, x[k + 0], 6, 0xf4292244); d = II(d, a, b, c, x[k + 7], 10, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], 15, 0xab9423a7); b = II(b, c, d, a, x[k + 5], 21, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], 6, 0x655b59c3); d = II(d, a, b, c, x[k + 3], 10, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], 15, 0xffeff47d); b = II(b, c, d, a, x[k + 1], 21, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], 6, 0x6fa87e4f); d = II(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], 15, 0xa3014314); b = II(b, c, d, a, x[k + 13], 21, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], 6, 0xf7537e82); d = II(d, a, b, c, x[k + 11], 10, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb); b = II(b, c, d, a, x[k + 9], 21, 0xeb86d391);
    a = au(a, aa); b = au(b, bb); c = au(c, cc); d = au(d, dd);
  }
  return toHex(a) + toHex(b) + toHex(c) + toHex(d);
}

// ─── 3. 语言探测与多语言过滤 ──────────────────────────────────────────────────
function isJapanese(text) {
  if (!text || typeof text !== "string") return false;
  // 包含平假名或片假名字符
  return /[぀-ゟ゠-ヿ]/.test(text);
}

function hasKanjiOrKana(text) {
  if (!text || typeof text !== "string") return false;
  return /[぀-ヿ一-龯]/.test(text);
}

// 智能多语言检测（支持日语、韩语、英语等各种外语自动翻译）
function needsTranslation(text) {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  // 1. 包含日文假名
  if (/[぀-ゟ゠-ヿ]/.test(trimmed)) return true;
  // 2. 包含韩文 Hangul
  if (/[가-힯]/.test(trimmed)) return true;
  // 3. 包含纯英文/西文字符串（不含中文汉字）
  if (/[a-zA-Z]{3,}/.test(trimmed) && !/[一-鿿]/.test(trimmed)) return true;
  // 4. 包含汉字
  if (/[一-龯]/.test(trimmed)) return true;
  return false;
}

// ─── 4. 多引擎批量翻译网络模块 ──────────────────────────────────────────────────
const LANG_MAP = {
  "zh-CN": { google: "zh-CN", ai: "Simplified Chinese" },
  "zh-TW": { google: "zh-TW", ai: "Traditional Chinese" },
  "en": { google: "en", ai: "English" },
  "ja": { google: "ja", ai: "Japanese" },
  "ko": { google: "ko", ai: "Korean" }
};

// 本地内存与持久化缓存（生命周期内与跨会话极速命中）
const MEMORY_CACHE = new Map();

function cacheKey(engine, target, text) {
  return engine + ":" + target + ":" + (text.length > 30 ? text.slice(0, 30) + text.length : text);
}

const CACHE_META_KEY = "pxtc_meta_index_v2";

function readCacheMeta() {
  try {
    const raw = $.getdata(CACHE_META_KEY);
    const meta = raw ? JSON.parse(raw) : null;
    if (meta && typeof meta === "object" && Array.isArray(meta.keys)) {
      return meta;
    }
    return { keys: [], lastUpdated: 0 };
  } catch (e) {
    return { keys: [], lastUpdated: 0 };
  }
}

function writeCacheMeta(meta) {
  try { $.setdata(JSON.stringify(meta), CACHE_META_KEY); } catch (e) { }
}

function cacheRead(key) {
  if (MEMORY_CACHE.has(key)) return MEMORY_CACHE.get(key);
  try {
    const val = $.getdata("pxtc_" + key);
    if (val) {
      MEMORY_CACHE.set(key, val);
      return val;
    }
  } catch (e) { }
  return undefined;
}

function cacheWrite(key, val) {
  MEMORY_CACHE.set(key, val);
  try {
    if (key.length < 80) {
      const storageKey = "pxtc_" + key;
      $.setdata(val, storageKey);
      const meta = readCacheMeta();
      if (!meta.keys.includes(storageKey)) {
        meta.keys.push(storageKey);
      }
      meta.lastUpdated = Date.now();
      writeCacheMeta(meta);
    }
  } catch (e) { }
}

function getCacheStats() {
  const meta = readCacheMeta();
  let bytes = 0;
  let count = 0;
  const validKeys = [];
  for (const k of meta.keys) {
    const v = $.getdata(k);
    if (v !== undefined && v !== null && v !== "") {
      count++;
      bytes += k.length + String(v).length;
      validKeys.push(k);
    }
  }
  if (validKeys.length !== meta.keys.length) {
    meta.keys = validKeys;
    writeCacheMeta(meta);
  }
  let sizeText = "0 B";
  if (bytes > 0) {
    if (bytes < 1024) sizeText = bytes + " B";
    else if (bytes < 1024 * 1024) sizeText = (bytes / 1024).toFixed(1) + " KB";
    else sizeText = (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }
  let timeText = "暂无缓存";
  if (meta.lastUpdated > 0 && count > 0) {
    const diff = Date.now() - meta.lastUpdated;
    if (diff < 60000) timeText = "刚刚";
    else if (diff < 3600000) timeText = Math.floor(diff / 60000) + " 分钟前";
    else if (diff < 86400000) timeText = Math.floor(diff / 3600000) + " 小时前";
    else {
      const d = new Date(meta.lastUpdated);
      timeText = (d.getMonth() + 1) + "月" + d.getDate() + "日";
    }
  }
  return { ok: true, count, bytes, sizeText, timeText };
}

function clearTranslationCacheData() {
  const meta = readCacheMeta();
  let bytes = 0;
  let count = 0;
  for (const k of meta.keys) {
    const v = $.getdata(k);
    if (v !== undefined && v !== null && v !== "") {
      count++;
      bytes += k.length + String(v).length;
    }
    try { $.setdata("", k); } catch (e) { }
  }
  MEMORY_CACHE.clear();
  writeCacheMeta({ keys: [], lastUpdated: 0 });
  let sizeText = "0 B";
  if (bytes > 0) {
    if (bytes < 1024) sizeText = bytes + " B";
    else if (bytes < 1024 * 1024) sizeText = (bytes / 1024).toFixed(1) + " KB";
    else sizeText = (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }
  return { ok: true, count, bytes, sizeText };
}

async function googleTranslateChunk(arr, target) {
  if (!arr.length) return [];
  const params = "client=gtx&dt=t&sl=auto&tl=" + encodeURIComponent(target);
  const body = arr.map(t => "q=" + encodeURIComponent(t)).join("&");
  const hosts = [
    "https://translate.googleapis.com/translate_a/t",
    "https://translate.google.com/translate_a/t"
  ];
  for (const host of hosts) {
    try {
      const res = await $.post({
        url: host + "?" + params,
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0" },
        body: body,
        timeout: 8000
      });
      const raw = res && res.body;
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(data) && data.length === arr.length) {
        return data.map(item => Array.isArray(item) ? item[0] : String(item));
      }
    } catch (e) { }
  }
  return arr;
}

async function googleTranslateBatch(texts, target) {
  const arr = texts.map(String);
  if (!arr.length) return [];
  // 限制每片 20 条，并发打给 Google，大幅降低单次延迟并彻底避免超时回退
  const CHUNK_SIZE = 20;
  const chunks = [];
  for (let i = 0; i < arr.length; i += CHUNK_SIZE) {
    chunks.push(arr.slice(i, i + CHUNK_SIZE));
  }
  const chunkResults = await Promise.all(chunks.map(chunk => googleTranslateChunk(chunk, target)));
  const results = [];
  for (const r of chunkResults) results.push(...r);
  return results;
}

async function openaiTranslateBatch(texts, targetLangName, cfg) {
  const arr = texts.map(String);
  if (!arr.length) return [];
  if (!cfg.openaiKey) return arr;
  const endpoint = cfg.openaiUrl || "https://api.openai.com/v1/chat/completions";
  const systemPrompt =
    "You are a professional ACG translator. Translate each Japanese text to " + targetLangName +
    ". Preserve format and line breaks. Return ONLY a JSON array of strings in exact same order and length: [\"trans1\", \"trans2\"]. No markdown code fence.";
  try {
    const res = await $.post({
      url: endpoint,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.openaiKey },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(arr) }
        ],
        temperature: 0.2
      }),
      timeout: 15000
    });
    let content = res && res.body;
    if (typeof content === "object" && content.choices) content = content.choices[0].message.content;
    else if (typeof content === "string") {
      const parsed = JSON.parse(content);
      content = parsed.choices[0].message.content;
    }
    content = String(content || "").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const result = JSON.parse(content);
    if (Array.isArray(result) && result.length === arr.length) return result;
  } catch (e) { }
  return arr;
}

async function deepseekTranslateBatch(texts, targetLangName, cfg) {
  const arr = texts.map(String);
  if (!arr.length) return [];
  if (!cfg.deepseekKey) return arr;
  const systemPrompt =
    "You are a professional ACG translator. Translate each Japanese text to " + targetLangName +
    ". Preserve format, line breaks, and anime terms naturally. Return ONLY a JSON array of strings in exact same order and length: [\"trans1\", \"trans2\"]. No markdown code fence.";
  try {
    const res = await $.post({
      url: cfg.deepseekUrl,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.deepseekKey },
      body: JSON.stringify({
        model: cfg.deepseekModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(arr) }
        ],
        temperature: 0.2
      }),
      timeout: 8000
    });
    let content = res && res.body;
    if (typeof content === "object" && content.choices) content = content.choices[0].message.content;
    else if (typeof content === "string") {
      const parsed = JSON.parse(content);
      content = parsed.choices[0].message.content;
    }
    content = String(content || "").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const result = JSON.parse(content);
    if (Array.isArray(result) && result.length === arr.length) return result;
  } catch (e) { }
  return arr;
}

// 百度通用文本批量翻译
async function baiduTranslateBatch(texts, cfg) {
  if (!texts || !texts.length) return [];
  const appid = (cfg.baiduAppid || "").trim();
  const secret = (cfg.baiduSecret || "").trim();
  if (!appid || !secret) return texts;

  try {
    const q = texts.join("\n");
    const salt = String(Date.now());
    const sign = md5(appid + q + salt + secret);
    const url = "https://fanyi-api.baidu.com/api/trans/vip/translate";
    const params = "q=" + encodeURIComponent(q) + "&from=auto&to=zh&appid=" + encodeURIComponent(appid) + "&salt=" + salt + "&sign=" + sign;
    const res = await $.post({
      url,
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0" },
      body: params,
      timeout: 10000
    });
    let raw = res && res.body;
    let data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (data && Array.isArray(data.trans_result)) {
      const map = {};
      data.trans_result.forEach(item => {
        if (item && item.src) map[item.src] = item.dst;
      });
      return texts.map(t => map[t] || t);
    }
  } catch (e) { }
  return texts;
}

// 彩云小译官方通用文本批量翻译
async function caiyunTranslateBatch(texts, cfg) {
  if (!texts || !texts.length) return [];
  const token = (cfg.caiyunToken || "").trim();
  if (!token) return texts;

  try {
    const url = "https://api.interpreter.caiyunai.com/v1/translator";
    const res = await $.post({
      url,
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": "token " + token
      },
      body: JSON.stringify({
        source: texts,
        trans_type: "auto2zh",
        request_id: "pixiv_" + Date.now(),
        detect: true
      }),
      timeout: 12000
    });
    let raw = res && res.body;
    let data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (data && Array.isArray(data.target) && data.target.length === texts.length) {
      return data.target.map(t => String(t || ""));
    }
  } catch (e) { }
  return texts;
}

// 统一批量翻译调度 (带多级自动容错降级与防缓存毒化)
async function translateBatch(texts, cfg) {
  if (!texts || !texts.length) return [];
  const target = cfg.targetLang || "zh-CN";
  const langConfig = LANG_MAP[target] || LANG_MAP["zh-CN"];
  const results = new Array(texts.length);
  const toFetch = [];
  const fetchIndices = [];

  for (let i = 0; i < texts.length; i++) {
    const original = texts[i];
    if (!original || !hasKanjiOrKana(original)) {
      results[i] = original;
      continue;
    }
    // 智能豁免纯中文：若开启豁免，且内容不含任何日文假名与韩文，且不是日文高频Tag，直接作为中文跳过
    if (cfg.skipChinese && !isJapanese(original) && !/[가-힯]/.test(original) && !PIXIV_TAG_DICT[original]) {
      results[i] = original;
      continue;
    }
    // 查本地持久化与内存缓存 (0ms 命中，滑屏不掉帧)
    const key = cacheKey(cfg.translator, target, original);
    const cached = cacheRead(key);
    // 关键防毒化保护：缓存里读出的值如果跟原文一模一样（即曾经存过的未翻译日文），视作无效缓存，重新去网络请求！
    if (cached !== undefined && cached !== original) {
      results[i] = cached;
    } else {
      toFetch.push(original);
      fetchIndices.push(i);
    }
  }

  if (!toFetch.length) return results;

  let translated = [];
  try {
    if (cfg.translator === "deepseek" && cfg.deepseekKey) {
      translated = await deepseekTranslateBatch(toFetch, langConfig.ai, cfg);
    } else if (cfg.translator === "openai" && cfg.openaiKey) {
      translated = await openaiTranslateBatch(toFetch, langConfig.ai, cfg);
    } else if (cfg.translator === "baidu" && cfg.baiduAppid && cfg.baiduSecret) {
      translated = await baiduTranslateBatch(toFetch, cfg);
    } else if (cfg.translator === "caiyun" && cfg.caiyunToken) {
      translated = await caiyunTranslateBatch(toFetch, cfg);
    }
  } catch (e) {
    translated = [];
  }

  // 核心容错自动降级：若所选高级引擎失败、报错或未成功翻译出中文，自动无缝降级走 Google 免费极速通道兜底！
  const needsFallback = !Array.isArray(translated) || translated.length !== toFetch.length || translated.every((t, idx) => t === toFetch[idx]);
  if (needsFallback) {
    try {
      translated = await googleTranslateBatch(toFetch, langConfig.google);
    } catch (e) { }
  }

  for (let j = 0; j < toFetch.length; j++) {
    const val = (translated && translated[j]) ? translated[j] : toFetch[j];
    const original = toFetch[j];
    results[fetchIndices[j]] = val;
    // 防缓存毒化：只有真正成功翻译出不同译文（有效中文）时才允许写入本地持久化缓存！
    if (val && val !== original) {
      cacheWrite(cacheKey(cfg.translator, target, original), val);
    }
  }

  return results;
}

// ─── 5. 全页面 REST API 深度拦截汉化 ─────────────────────────────────────────────
async function handleApiRewrite(cfg) {
  const rawBody = $response.body;
  if (!rawBody) { $done({}); return; }

  // 捕获官方客户端鉴权 Bearer 令牌以供画廊与漫翻使用
  if (typeof $request !== "undefined" && $request.headers) {
    const token = $request.headers.Authorization || $request.headers.authorization;
    if (token) $.setdata(token, "@Pixiv.Enhanced.Auth.Token");
  }

  let data = null;
  try {
    data = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
  } catch (e) {
    $done({}); return;
  }

  if (!data || typeof data !== "object") { $done({}); return; }

  const url = (typeof $request !== "undefined" && $request.url) ? $request.url : "";
  let modified = false;

  // 1. Tag 离线字典快速处理：仅改写主标签为中文，副标签置空，消除两行重复字眼
  function processTags(tags) {
    if (!Array.isArray(tags)) return;
    for (const tag of tags) {
      if (!tag || typeof tag !== "object") continue;
      const dictVal = PIXIV_TAG_DICT[tag.name];
      if (dictVal) {
        tag.name = dictVal;
        tag.translated_name = null; // 关键：置空副标签，避免 Pixiv 上下两行同时渲染相同的中文！
        modified = true;
      } else if (tag.translated_name && isJapanese(tag.name)) {
        tag.name = tag.translated_name;
        tag.translated_name = null;
        modified = true;
      }
    }
  }

  // 收集待网络翻译的文字与写回钩子 (去重与轻量化映射)
  const textCallbackMap = new Map();
  function queueTranslate(text, callback) {
    if (!text || typeof text !== "string") return;
    if (!needsTranslation(text)) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!textCallbackMap.has(trimmed)) {
      textCallbackMap.set(trimmed, []);
    }
    textCallbackMap.get(trimmed).push(callback);
  }

  // A. 全量作品对象通用递归扫描器 (彻底根治“只有作者页有，首页/插画/漫画没有”)
  const workList = [];
  const visitedWorks = new Set();

  function collectWorks(obj, depth = 0) {
    if (!obj || typeof obj !== "object" || depth > 5) return;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) collectWorks(obj[i], depth + 1);
      return;
    }
    // 凡是具备有效作品 ID 与图像特征的对象，全部捕获进入工作队列
    if (obj.id && (obj.image_urls || obj.meta_pages || obj.meta_single_page || obj.page_count !== undefined || obj.type === "illust" || obj.type === "manga" || obj.type === "novel")) {
      const wid = String(obj.id);
      if (!visitedWorks.has(wid)) {
        visitedWorks.add(wid);
        workList.push(obj);
      }
    }
    // 递归捕获首页嵌套、连载系列、推荐与发现列表等所有多层级容器
    if (obj.illust && typeof obj.illust === "object") collectWorks(obj.illust, depth + 1);
    if (obj.novel && typeof obj.novel === "object") collectWorks(obj.novel, depth + 1);
    if (obj.app_model && typeof obj.app_model === "object") collectWorks(obj.app_model, depth + 1);
    if (obj.pickup && typeof obj.pickup === "object") collectWorks(obj.pickup, depth + 1);
    if (Array.isArray(obj.illusts)) collectWorks(obj.illusts, depth + 1);
    if (Array.isArray(obj.novels)) collectWorks(obj.novels, depth + 1);
    if (Array.isArray(obj.thumbnails)) collectWorks(obj.thumbnails, depth + 1);
    if (Array.isArray(obj.contents)) collectWorks(obj.contents, depth + 1);
    if (Array.isArray(obj.user_previews)) collectWorks(obj.user_previews, depth + 1);
    if (Array.isArray(obj.ranking_illusts)) collectWorks(obj.ranking_illusts, depth + 1);
    if (Array.isArray(obj.ranking_novels)) collectWorks(obj.ranking_novels, depth + 1);
    if (Array.isArray(obj.popular_preview)) collectWorks(obj.popular_preview, depth + 1);
    if (Array.isArray(obj.popular_permanent)) collectWorks(obj.popular_permanent, depth + 1);
    if (Array.isArray(obj.manga_series)) collectWorks(obj.manga_series, depth + 1);
    if (Array.isArray(obj.series)) collectWorks(obj.series, depth + 1);
  }

  collectWorks(data);

  // B. 核心首页全景流 (v1/home/all 的 data.contents 结构，彻底解决首页卡片与标题不汉化)
  if (Array.isArray(data.contents)) {
    for (const c of data.contents) {
      if (!c) continue;
      // 首页精选大 Banner
      if (c.pickup && typeof c.pickup === "object") {
        if (hasKanjiOrKana(c.pickup.title)) queueTranslate(c.pickup.title, trans => { c.pickup.title = trans; modified = true; });
        if (c.pickup.comment && needsTranslation(c.pickup.comment)) queueTranslate(c.pickup.comment, trans => { c.pickup.comment = trans; modified = true; });
        // 关键防护：严格排除小说！仅插画/漫画允许注入漫翻入口
        const isPickupNovel = c.pickup.type === "novel" || !!c.pickup.novel || (c.pickup.series && c.pickup.series.type === "novel");
        const pId = c.pickup.id || (c.pickup.illust && c.pickup.illust.id);
        if (!isPickupNovel && pId && cfg.imageSwitch) {
          const vLink = `<a href="https://www.pixiv.net/manga/viewer?illust_id=${pId}">✦ 开启 AI 漫翻阅读 ↗</a><br /><br />`;
          if (typeof c.pickup.comment === "string") {
            if (!c.pickup.comment.includes("/manga/viewer")) { c.pickup.comment = vLink + c.pickup.comment; modified = true; }
          } else {
            c.pickup.comment = vLink; modified = true;
          }
        }
        if (c.pickup.id) collectWorks(c.pickup);
      }
      // 首页缩略图瀑布流卡片列表 (用户打开 App 第一眼看到的内容)
      if (Array.isArray(c.thumbnails)) {
        for (const t of c.thumbnails) {
          if (!t) continue;
          // 1. 显式翻译外层卡片标题 (100% 覆盖第一眼视觉)
          if (cfg.scopes.includes("illust_title") && hasKanjiOrKana(t.title)) {
            queueTranslate(t.title, trans => { t.title = trans; modified = true; });
          }
          // 关键防护：严格识别小说卡片！小说绝对不注入漫画翻译入口！
          const isThumbNovel = t.type === "novel" || (t.app_model && t.app_model.type === "novel") || !!t.novel;
          const wId = t.id || (t.app_model && t.app_model.id);
          const vLink = (!isThumbNovel && wId && cfg.imageSwitch) ? `<a href="https://www.pixiv.net/manga/viewer?illust_id=${wId}">✦ 开启 AI 漫翻阅读 ↗</a><br /><br />` : "";

          // 2. 显式翻译外层卡片描述，并就地注入漫翻入口 (解决从首页卡片点进无按钮缺陷)
          if (cfg.scopes.includes("illust_caption") && t.description && needsTranslation(t.description)) {
            queueTranslate(t.description, trans => {
              const clean = trans.replace(/<\s*br\s*\/?>/gi, "<br />");
              const resText = vLink ? (vLink + clean) : clean;
              t.description = resText;
              t.caption = resText;
              if (t.app_model) t.app_model.caption = resText;
              modified = true;
            });
          } else if (vLink) {
            const curText = (typeof t.description === "string") ? t.description : "";
            const cleanText = curText.includes("/manga/viewer")
              ? curText.replace(/<a\s+href="[^"]*\/manga\/viewer[^"]*">.*?<\/a>(?:<br\s*\/?>|\n)*/i, "")
              : curText;
            const resText = vLink + cleanText;
            t.description = resText;
            t.caption = resText;
            if (t.app_model) t.app_model.caption = resText;
            modified = true;
          }
          // 3. 显式翻译外层标签与副标签净空
          if (Array.isArray(t.tags)) {
            for (let ti = 0; ti < t.tags.length; ti++) {
              const tagStr = t.tags[ti];
              if (PIXIV_TAG_DICT[tagStr]) {
                t.tags[ti] = PIXIV_TAG_DICT[tagStr];
                modified = true;
              }
            }
          }
          if (Array.isArray(t.show_tags)) {
            for (let si = 0; si < t.show_tags.length; si++) {
              const tagStr = t.show_tags[si];
              if (PIXIV_TAG_DICT[tagStr]) {
                t.show_tags[si] = PIXIV_TAG_DICT[tagStr];
                modified = true;
              }
            }
          }
          // 4. 显式处理内层模型 app_model
          if (t.app_model && typeof t.app_model === "object") {
            if (cfg.scopes.includes("illust_title") && hasKanjiOrKana(t.app_model.title)) {
              queueTranslate(t.app_model.title, trans => { t.app_model.title = trans; modified = true; });
            }
            if (t.app_model.tags) processTags(t.app_model.tags);
            collectWorks(t.app_model);
          }
        }
      }
    }
  }

  // C. 发现页核心数据：处理趋势热门标签与插画 (trend_tags)
  // 关键防崩策略：严禁修改 item.tag（它是 DiffableDataSource 的主键），仅汉化 item.translated_name！
  if (Array.isArray(data.trend_tags)) {
    for (const item of data.trend_tags) {
      if (!item) continue;
      // 1. 仅汉化展示名称 translated_name，绝不改写 tag 键名，杜绝重复主键引发崩溃
      if (item.tag) {
        const dictVal = PIXIV_TAG_DICT[item.tag];
        if (dictVal) {
          item.translated_name = dictVal;
          modified = true;
        } else if (hasKanjiOrKana(item.tag)) {
          queueTranslate(item.tag, trans => { item.translated_name = trans; modified = true; });
        }
      }
      // 2. 汉化附带的封面插画作品
      if (item.illust && typeof item.illust === "object") {
        collectWorks(item.illust);
      }
    }
  }

  // D. 处理画师用户主页资料 (user_previews 与 user.comment)
  if (Array.isArray(data.user_previews)) {
    for (const up of data.user_previews) {
      if (!up) continue;
      if (up.user && hasKanjiOrKana(up.user.comment)) {
        queueTranslate(up.user.comment, trans => { up.user.comment = trans; modified = true; });
      }
    }
  }
  if (data.user && typeof data.user === "object" && cfg.scopes.includes("user_profile")) {
    if (hasKanjiOrKana(data.user.comment)) {
      queueTranslate(data.user.comment, trans => { data.user.comment = trans; modified = true; });
    }
  }

  // E. 遍历所有收集到的作品对象，就地注入漫翻入口与标题汉化
  for (const item of workList) {
    if (!item || typeof item !== "object") continue;
    if (item.tags) processTags(item.tags);

    // 标题翻译 (核心展示，卡片和榜单主视觉)
    if (cfg.scopes.includes("illust_title") && hasKanjiOrKana(item.title)) {
      queueTranslate(item.title, trans => { item.title = trans; modified = true; });
    }

    // ─── 漫翻入口注入（方案 A：极简日系现代风 · 原生蓝色超链接）───
    // 关键核心：严格区分插画/漫画与小说！小说拥有专属双语排版引擎，坚决不注入漫画翻译入口！
    const isNovel = item.type === "novel" || !!item.text || item.series_type === "novel" || (item.series && item.series.type === "novel");
    const isArtwork = !isNovel && Boolean(item.id) && (
      item.type === "manga" ||
      item.type === "illust" ||
      Boolean(item.meta_pages) ||
      Boolean(item.meta_single_page) ||
      (Boolean(item.image_urls) && item.page_count !== undefined && !item.text)
    );

    if (isArtwork && cfg.imageSwitch) {
      const viewerUrl = "https://www.pixiv.net/manga/viewer?illust_id=" + item.id;
      // 方案 A 专属：采用标准的 HTML 超链标签包裹，iOS 富文本引擎自动赋予原生蓝色与轻点弹窗
      const viewerLinkHtml = `<a href="${viewerUrl}">✦ 开启 AI 漫翻阅读 ↗</a><br /><br />`;

      // 1. 标准作品简介字段 caption 就地注入
      if (typeof item.caption === "string") {
        if (!item.caption.includes("/manga/viewer")) {
          item.caption = viewerLinkHtml + item.caption;
          modified = true;
        }
      } else {
        item.caption = viewerLinkHtml;
        modified = true;
      }

      // 2. 首页与瀑布流卡片简介字段 description 同步注入
      if (typeof item.description === "string" && !item.description.includes("/manga/viewer")) {
        item.description = viewerLinkHtml + item.description;
        modified = true;
      }

      // 3. 推荐精选卡片简介字段 comment 同步注入
      if (typeof item.comment === "string" && !item.comment.includes("/manga/viewer")) {
        item.comment = viewerLinkHtml + item.comment;
        modified = true;
      }
    }

    // 简介正文翻译：仅翻译原作者简介正文，插画漫画保持漫翻链接置顶，小说纯净翻译
    if (cfg.scopes.includes("illust_caption") && typeof item.caption === "string") {
      const viewerLinkHtml = isArtwork ? `<a href="https://www.pixiv.net/manga/viewer?illust_id=${item.id}">✦ 开启 AI 漫翻阅读 ↗</a><br /><br />` : "";
      const rawText = item.caption.includes("/manga/viewer")
        ? item.caption.replace(/<a\s+href="[^"]*\/manga\/viewer[^"]*">.*?<\/a>(?:<br\s*\/?>|\n)*/i, "").trim()
        : item.caption.trim();

      if (rawText && isJapanese(rawText)) {
        queueTranslate(rawText, trans => {
          const cleanTrans = trans.replace(/<\s*br\s*\/?>/gi, "<br />");
          const finalVal = (isArtwork && viewerLinkHtml) ? (viewerLinkHtml + cleanTrans) : cleanTrans;
          item.caption = finalVal;
          if (typeof item.description === "string") item.description = finalVal;
          if (typeof item.comment === "string") item.comment = finalVal;
          modified = true;
        });
      }
    }

    // 小说系列标题
    if (item.series && hasKanjiOrKana(item.series.title)) {
      queueTranslate(item.series.title, trans => { item.series.title = trans; modified = true; });
    }
  }

  // F. 处理评论区 (comments[] / sub_comments[] / illust_comments[]，支持日语及全球外语自动汉化)
  const commentsList = [];
  if (Array.isArray(data.comments)) commentsList.push(...data.comments);
  if (Array.isArray(data.illust_comments)) commentsList.push(...data.illust_comments);
  if (Array.isArray(data.sub_comments)) commentsList.push(...data.sub_comments);

  if (commentsList.length > 0 && cfg.scopes.includes("comments")) {
    for (const c of commentsList) {
      if (!c) continue;
      if (needsTranslation(c.comment)) {
        queueTranslate(c.comment, trans => { c.comment = trans; modified = true; });
      }
      if (Array.isArray(c.sub_comments)) {
        for (const sub of c.sub_comments) {
          if (sub && needsTranslation(sub.comment)) {
            queueTranslate(sub.comment, trans => { sub.comment = trans; modified = true; });
          }
        }
      }
    }
  }

  // G. 处理特辑文章 (spotlight_articles[])
  const spotlights = Array.isArray(data.spotlight_articles) ? data.spotlight_articles : [];
  if (spotlights.length > 0 && cfg.scopes.includes("spotlight")) {
    for (const art of spotlights) {
      if (!art) continue;
      if (hasKanjiOrKana(art.title)) queueTranslate(art.title, trans => { art.title = trans; modified = true; });
      if (hasKanjiOrKana(art.intro)) queueTranslate(art.intro, trans => { art.intro = trans; modified = true; });
      if (hasKanjiOrKana(art.sub_title)) queueTranslate(art.sub_title, trans => { art.sub_title = trans; modified = true; });
    }
  }

  // 批量并发处理所有收集到的去重文本
  if (textCallbackMap.size > 0) {
    const rawTexts = Array.from(textCallbackMap.keys());
    const translatedList = await translateBatch(rawTexts, cfg);
    for (let i = 0; i < rawTexts.length; i++) {
      const trans = translatedList[i];
      if (trans && trans !== rawTexts[i]) {
        const callbacks = textCallbackMap.get(rawTexts[i]) || [];
        for (const cb of callbacks) cb(trans);
      }
    }
  }

  if (modified || cfg.imageAccelerate) {
    let outputBody = JSON.stringify(data);
    if (cfg.imageAccelerate) {
      outputBody = outputBody.replace(/i\.pximg\.net/g, "i.pixiv.re");
    }
    $done({ body: outputBody });
  } else {
    $done({});
  }
}

// ─── 6. 小说阅读器 & 页面注入 iOS SF Symbols「文/A」悬浮按钮与排版引擎 ────────
const SF_TRANSLATE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="m5 8 6 6"/>
  <path d="m4 14 6-6 2-3"/>
  <path d="M2 5h12"/>
  <path d="M7 2h1"/>
  <path d="m22 22-5-10-5 10"/>
  <path d="M14 18h6"/>
</svg>
`;

const INJECT_CSS = `
#px-fab {
  position: fixed;
  right: 12px;
  bottom: 150px;
  z-index: 2147483647;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 0.5px solid rgba(255, 255, 255, 0.4);
  background: #007aff;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s ease, background 0.3s ease;
}
@media (prefers-color-scheme: dark) {
  #px-fab {
    background: #0a84ff;
    border: 0.5px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
  }
}
#px-fab:active { transform: scale(0.92); }
#px-fab.px-busy { opacity: 0.55; pointer-events: none; }
#px-fab.px-done { background: #34c759 !important; color: #fff !important; }
#px-fab.px-warn { background: #ff9500 !important; color: #fff !important; }

/* 纯净小说排版 (严格继承 Pixiv 原版字号、行距、字体与颜色) */
.pxtc-reader {
  max-width: 720px;
  margin: 0 auto;
  padding: 20px 16px 120px;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  line-height: 1.85;
}
.pxtc-reader.font-songti {
  font-family: "Songti SC", "STSong", "SimSun", "Noto Serif CJK SC", serif !important;
}
.pxtc-reader.font-kaiti {
  font-family: "Kaiti SC", "STKaiti", "KaiTi", "DFKai-SB", serif !important;
}
.pxtc-reader.font-yuanti {
  font-family: "Yuanti SC", "STYuanti", "PingFang SC", sans-serif !important;
}

/* 顶部轻量状态胶囊 (对标出版物与系统原生交互) */
.pxtc-status-bar {
  position: sticky;
  top: calc(env(safe-area-inset-top, 20px) + 8px);
  z-index: 1000;
  margin: 0 auto 16px;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(30, 30, 30, 0.86);
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  color: #ffffff;
  font: 12px/1.4 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  max-width: fit-content;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.pxtc-status-bar.hidden {
  opacity: 0;
  pointer-events: none;
  transform: translateY(-8px);
}
.pxtc-status-btn {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: #5ac8fa;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
.pxtc-status-btn:active {
  opacity: 0.7;
}

/* 出版级双语段落对 (严格一一对应，不堆叠边框/阴影/卡片) */
.translation-pair {
  margin: 0 0 1.6em 0;
}
.translation-pair.empty {
  margin: 0 0 0.8em 0;
}
.translation-pair .original {
  color: inherit;
  font-family: inherit;
  font-size: 1em;
  line-height: 1.85;
  word-break: break-word;
}
.translation-pair .translated {
  margin-top: 6px;
  color: inherit;
  font-family: inherit;
  font-size: 0.94em;
  line-height: 1.75;
  opacity: 0.68;
  word-break: break-word;
  transition: opacity 0.25s ease;
}
@media (prefers-color-scheme: dark) {
  .translation-pair .translated {
    opacity: 0.62;
  }
}
.translation-pair .translated.pending {
  font-size: 12px;
  color: var(--text-secondary, #8e8e93);
  opacity: 0.45;
  margin-top: 4px;
}
.translation-pair .translation-failed {
  margin-top: 6px;
  color: #ff3b30;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.pxtc-retry-inline-btn {
  background: rgba(255, 59, 48, 0.12);
  color: #ff3b30;
  border: none;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

/* 仅译文模式 (当关闭双语对照时，隐藏原文) */
.pxtc-reader.hide-original .translation-pair .original {
  display: none;
}
.pxtc-reader.hide-original .translation-pair .translated {
  margin-top: 0;
  opacity: 1;
  font-size: 1em;
  line-height: 1.85;
}

.px-hud-bubble {
  position: absolute;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  color: #111;
  font: 13px/1.4 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
  padding: 6px 10px;
  border-radius: 8px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.25);
  pointer-events: auto;
  border: 1px solid rgba(0, 0, 0, 0.08);
  word-break: break-word;
}
@media (prefers-color-scheme: dark) {
  .px-hud-bubble {
    background: rgba(20, 20, 20, 0.92);
    color: #eee;
    border-color: rgba(255, 255, 255, 0.15);
  }
}
`;

function clientRuntime() {
  (function () {
    var CFG = "__CONFIG_PLACEHOLDER__";
    var autoSwitch = CFG && typeof CFG === "object" ? !!CFG.autoSwitch : true;
    var cleanDisclaimer = CFG && typeof CFG === "object" ? !!CFG.novelCleanDisclaimer : true;
    var showOriginalText = CFG && typeof CFG === "object" ? CFG.novelShowOriginal !== false : true;
    var floatingSwitch = CFG && typeof CFG === "object" ? CFG.floatingSwitch !== false : true;
    var imageSwitch = CFG && typeof CFG === "object" ? CFG.imageSwitch !== false : true;

    var root = null;
    var reader = null;
    var statusBar = null;
    var originalDisplay = "";
    var currentMode = "ja"; // "ja" or "zh"
    var isTranslating = false;
    var hasTranslated = false;

    // 存储分段信息与状态
    var paragraphItems = [];
    var batchList = [];
    var totalCount = 0;
    var successCount = 0;
    var failedCount = 0;

    function esc(s) {
      return String(s || "").replace(/[&<>"']/g, function (c) {
        return c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;";
      });
    }

    function hasJapanese(text) {
      if (!text || typeof text !== "string") return false;
      return /[぀-ゟ゠-ヿ]/.test(text);
    }

    function openSettings() {
      window.location.href = "https://app-api.pixiv.net/settings/Enhanced";
    }

    // 检查小说是否本身纯中文
    var rawText = "";
    try { rawText = window.pixiv && window.pixiv.novel ? window.pixiv.novel.text : ""; } catch (e) { }
    if (rawText && !hasJapanese(rawText)) {
      return;
    }

    // 悬浮按钮总开关严格判定
    var fab = null;
    if (floatingSwitch && (rawText || imageSwitch)) {
      var prevFab = document.getElementById("px-fab");
      if (prevFab) prevFab.remove();

      fab = document.createElement("div");
      fab.id = "px-fab";
      fab.title = rawText ? "轻点翻译/还原 · 长按设置" : "轻点翻译图片 · 长按设置";
      fab.setAttribute("aria-label", "小说翻译");
      fab.innerHTML = `__SVG_PLACEHOLDER__`;
      document.body.appendChild(fab);

      var pressTimer = null;
      function startPress(e) {
        pressTimer = setTimeout(function () {
          pressTimer = null;
          openSettings();
        }, 500);
      }
      function endPress(e) {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
          handleFabClick();
        }
      }
      function cancelPress(e) {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      }
      fab.addEventListener("mousedown", startPress);
      fab.addEventListener("mouseup", endPress);
      fab.addEventListener("mouseleave", cancelPress);
      fab.addEventListener("touchstart", startPress, { passive: true });
      fab.addEventListener("touchend", endPress);
      fab.addEventListener("touchcancel", cancelPress);
    }

    function isDisclaimer(str) {
      if (!str || typeof str !== "string") return false;
      var s = str.trim();
      if (/^[・※*#\-—_~～\s]{2,}$/.test(s)) return true;
      if (/^(?:https?:\/\/|(?:fanbox|booth|twitter|x\.com))/i.test(s)) return true;
      if (/^[・※*]/.test(s) && (s.includes("脚本") || s.includes("台本") || s.includes("商用") || s.includes("转载") || s.includes("责任") || s.includes("作者") || s.includes("URL") || s.includes("DM") || s.includes("费用") || s.includes("更改") || s.includes("改编"))) {
        return true;
      }
      if (/(?:免费脚本|免费台本|商用利用|商业用途|未经许可不得转载|禁止转载|无断转载|自作发言|自作発言|不承担任何责任|责任自负|请注明作者|情景语音|台本使用|使用规约|使用規約|使用规则|不收取任何费用|自由更改|更改对话)/i.test(s)) {
        return true;
      }
      return false;
    }

    function splitParagraphs(text) {
      var t = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/^\n+|\n+$/g, "");
      return t ? t.split(/\n{2,}/) : [];
    }

    function splitLong(p, max) {
      var lines = p.split("\n");
      var out = [];
      var buf = "";
      for (var i = 0; i < lines.length; i++) {
        var l = lines[i];
        if (l.length > max) {
          if (buf) { out.push(buf); buf = ""; }
          while (l.length > max) { out.push(l.substring(0, max)); l = l.substring(max); }
          if (l) out.push(l);
        } else {
          var n = buf ? buf + "\n" + l : l;
          if (n.length > max && buf) { out.push(buf); buf = l; } else { buf = n; }
        }
      }
      if (buf) out.push(buf);
      return out;
    }

    function buildReader() {
      if (reader) return true;
      root = document.getElementById("root");
      if (!root) return false;
      originalDisplay = root.style.display || "";

      var oldReader = document.getElementById("pxtc-reader");
      if (oldReader) oldReader.remove();

      reader = document.createElement("div");
      reader.id = "pxtc-reader";
      var fontCls = (CFG && CFG.novelFont && CFG.novelFont !== "system") ? " font-" + CFG.novelFont : "";
      var modeCls = showOriginalText ? "" : " hide-original";
      reader.className = "pxtc-reader" + fontCls + modeCls;

      var bodyStyle = window.getComputedStyle(document.body);
      var rootStyle = window.getComputedStyle(root);
      var pageBg = bodyStyle.backgroundColor || rootStyle.backgroundColor;
      if (pageBg && pageBg !== "transparent" && pageBg.indexOf("rgba(0, 0, 0, 0)") !== 0) {
        reader.style.background = pageBg;
      }
      var textColor = bodyStyle.color || rootStyle.color;
      if (textColor && textColor !== "transparent") {
        reader.style.color = textColor;
      }

      root.parentNode.insertBefore(reader, root.nextSibling);
      reader.style.display = "none";
      return true;
    }

    function updateStatus(state) {
      if (!statusBar && reader) {
        statusBar = document.createElement("div");
        statusBar.className = "pxtc-status-bar";
        reader.insertBefore(statusBar, reader.firstChild);
      }
      if (!statusBar) return;

      if (state === "preparing") {
        statusBar.classList.remove("hidden");
        statusBar.innerHTML = '<span>准备翻译…</span>';
        if (fab) { fab.className = "px-busy"; }
      } else if (state === "translating") {
        statusBar.classList.remove("hidden");
        statusBar.innerHTML = '<span>正在翻译 ' + successCount + ' / ' + totalCount + '</span>';
        if (fab) { fab.className = "px-busy"; }
      } else if (state === "partial") {
        statusBar.classList.remove("hidden");
        statusBar.innerHTML = '<span>部分完成 · ' + successCount + ' / ' + totalCount + '</span><button type="button" class="pxtc-status-btn" id="pxtc-retry-all">重试失败段落</button>';
        var retryBtn = document.getElementById("pxtc-retry-all");
        if (retryBtn) retryBtn.addEventListener("click", retryFailedBatches);
        if (fab) { fab.className = "px-warn"; }
      } else if (state === "completed") {
        statusBar.innerHTML = '<span>翻译完成</span>';
        if (fab) { fab.className = "px-done"; }
        setTimeout(function () {
          if (statusBar && state === "completed") statusBar.classList.add("hidden");
        }, 3200);
      }
    }

    function showOriginal() {
      if (reader) reader.style.display = "none";
      if (root) root.style.display = originalDisplay;
      currentMode = "ja";
      if (fab) fab.classList.remove("px-done", "px-warn");
    }

    function showTranslated() {
      if (root) root.style.display = "none";
      if (reader) reader.style.display = "block";
      currentMode = "zh";
      if (fab) {
        if (failedCount > 0) fab.className = "px-warn";
        else fab.className = "px-done";
      }
    }

    function toggleNovelMode() {
      if (isTranslating) return;
      if (!hasTranslated) {
        startNovelTranslate();
        return;
      }
      if (currentMode === "zh") {
        showOriginal();
      } else {
        showTranslated();
      }
    }

    async function translateBatchRequest(batch) {
      batch.status = "translating";
      var texts = batch.items.map(function (it) { return it.text; });
      try {
        var res = await fetch("/pxtrans?t=novel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: texts })
        }).then(function (r) { return r.json(); });

        if (res && Array.isArray(res.translations) && res.translations.length === texts.length) {
          batch.status = "success";
          for (var i = 0; i < batch.items.length; i++) {
            var item = batch.items[i];
            item.status = "success";
            item.translation = String(res.translations[i] || "");
            var el = document.getElementById("pair-trans-" + item.id);
            if (el) {
              el.className = "translated";
              el.innerHTML = esc(item.translation).replace(/\n/g, "<br>");
            }
          }
        } else {
          throw new Error("返回格式不匹配");
        }
      } catch (err) {
        batch.status = "failed";
        for (var j = 0; j < batch.items.length; j++) {
          var fItem = batch.items[j];
          fItem.status = "failed";
          var fEl = document.getElementById("pair-trans-" + fItem.id);
          if (fEl) {
            fEl.className = "translated";
            fEl.innerHTML = '<div class="translation-failed"><span>翻译失败</span><button type="button" class="pxtc-retry-inline-btn" data-batch="' + batch.idx + '">重试</button></div>';
            var rBtn = fEl.querySelector("button");
            if (rBtn) {
              rBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                var bIdx = Number(this.getAttribute("data-batch"));
                retrySingleBatch(bIdx);
              });
            }
          }
        }
      }
    }

    function recalculateProgress() {
      successCount = 0;
      failedCount = 0;
      for (var i = 0; i < paragraphItems.length; i++) {
        if (paragraphItems[i].status === "success") successCount++;
        else if (paragraphItems[i].status === "failed") failedCount++;
      }
      if (failedCount > 0) {
        updateStatus("partial");
      } else if (successCount === totalCount && totalCount > 0) {
        updateStatus("completed");
      } else {
        updateStatus("translating");
      }
    }

    async function retrySingleBatch(bIdx) {
      var batch = batchList[bIdx];
      if (!batch || isTranslating) return;
      for (var k = 0; k < batch.items.length; k++) {
        var el = document.getElementById("pair-trans-" + batch.items[k].id);
        if (el) {
          el.className = "translated pending";
          el.textContent = "正在重试…";
        }
      }
      await translateBatchRequest(batch);
      recalculateProgress();
    }

    async function retryFailedBatches() {
      if (isTranslating) return;
      isTranslating = true;
      var failedBatches = batchList.filter(function (b) { return b.status === "failed"; });
      for (var i = 0; i < failedBatches.length; i++) {
        var batch = failedBatches[i];
        for (var k = 0; k < batch.items.length; k++) {
          var el = document.getElementById("pair-trans-" + batch.items[k].id);
          if (el) {
            el.className = "translated pending";
            el.textContent = "正在重试…";
          }
        }
        await translateBatchRequest(batch);
        recalculateProgress();
      }
      isTranslating = false;
      recalculateProgress();
    }

    async function startNovelTranslate() {
      if (isTranslating) return;
      var text = "";
      try { text = window.pixiv && window.pixiv.novel ? window.pixiv.novel.text : ""; } catch (e) { }
      if (!text) return;
      if (!buildReader()) return;

      isTranslating = true;
      currentMode = "zh";

      // 1. 段落拆分与规约过滤
      var rawParagraphs = splitParagraphs(text);
      var validParagraphs = [];
      for (var p = 0; p < rawParagraphs.length; p++) {
        var itemStr = rawParagraphs[p].trim();
        if (cleanDisclaimer && isDisclaimer(itemStr)) continue;
        validParagraphs.push(rawParagraphs[p]);
      }

      // 2. 建立段落项与 DOM 段落对
      paragraphItems = [];
      reader.innerHTML = "";
      statusBar = null;

      for (var i = 0; i < validParagraphs.length; i++) {
        var originalText = validParagraphs[i];
        var itemObj = {
          id: i,
          text: originalText,
          status: "pending",
          translation: ""
        };
        paragraphItems.push(itemObj);

        var pairEl = document.createElement("div");
        pairEl.className = "translation-pair" + (originalText.trim() ? "" : " empty");
        pairEl.id = "pxtc-pair-" + i;
        pairEl.innerHTML = '<div class="original">' + esc(originalText).replace(/\n/g, "<br>") + '</div>' +
          '<div class="translated pending" id="pair-trans-' + i + '"></div>';
        reader.appendChild(pairEl);
      }

      totalCount = paragraphItems.length;
      successCount = 0;
      failedCount = 0;

      showTranslated();
      updateStatus("preparing");

      // 3. 构建批次
      batchList = [];
      var curItems = [];
      var curChars = 0;
      for (var j = 0; j < paragraphItems.length; j++) {
        var it = paragraphItems[j];
        if (curItems.length >= 20 || curChars + it.text.length > 2500) {
          batchList.push({ idx: batchList.length, items: curItems, status: "pending" });
          curItems = [];
          curChars = 0;
        }
        curItems.push(it);
        curChars += it.text.length;
      }
      if (curItems.length) {
        batchList.push({ idx: batchList.length, items: curItems, status: "pending" });
      }

      // 4. 并发调度 (最多 3 批并发，边翻边显示)
      var nextBatch = 0;
      async function batchWorker() {
        while (nextBatch < batchList.length) {
          var b = batchList[nextBatch++];
          await translateBatchRequest(b);
          recalculateProgress();
        }
      }

      var workers = [];
      var concurrency = Math.min(3, batchList.length);
      for (var w = 0; w < concurrency; w++) workers.push(batchWorker());
      await Promise.all(workers);

      isTranslating = false;
      hasTranslated = true;
      recalculateProgress();
    }

    // ─── 漫画 AI 视觉 HUD 漫翻 ───
    async function doMangaTranslate() {
      if (!imageSwitch) return;
      var images = document.querySelectorAll("img");
      if (!images.length) return;
      if (fab) fab.className = "px-busy";
      var targetImg = images[0];
      var imgUrl = targetImg.src;
      try {
        targetImg.parentNode.querySelectorAll(".px-hud-bubble").forEach(function (n) { n.remove(); });
        var r = await fetch("/pxtrans?action=vision&url=" + encodeURIComponent(imgUrl)).then(function (res) { return res.json(); });
        if (r && Array.isArray(r.bubbles)) {
          r.bubbles.forEach(function (b) {
            var bubble = document.createElement("div");
            bubble.className = "px-hud-bubble";
            bubble.textContent = b.zh;
            bubble.style.top = b.box[0] + "%";
            bubble.style.left = b.box[1] + "%";
            bubble.style.maxWidth = (b.box[3] - b.box[1]) + "%";
            targetImg.parentNode.style.position = "relative";
            targetImg.parentNode.appendChild(bubble);
          });
          if (fab) fab.className = "px-done";
        }
      } catch (e) {
        if (fab) fab.className = "px-warn";
      }
    }

    function handleFabClick() {
      if (rawText) {
        toggleNovelMode();
      } else {
        doMangaTranslate();
      }
    }

    // 默认自动翻译触发
    if (autoSwitch && rawText) {
      var tries = 0;
      var timer = setInterval(function () {
        tries++;
        var t = "";
        try { t = window.pixiv && window.pixiv.novel ? window.pixiv.novel.text : ""; } catch (e) { }
        if (t && hasJapanese(t)) {
          clearInterval(timer);
          startNovelTranslate();
        } else if (tries >= 30) {
          clearInterval(timer);
        }
      }, 250);
    }
  })();
}

function handleWebviewInject(cfg) {
  const body = typeof $response.body === "string" ? $response.body : "";
  if (!body) { $done({}); return; }
  const clientConfig = {
    autoSwitch: cfg ? !!cfg.autoSwitch : true,
    targetLang: cfg ? cfg.targetLang : "zh-CN",
    novelFont: cfg ? (cfg.novelFont || "system") : "system",
    novelCleanDisclaimer: cfg ? !!cfg.novelCleanDisclaimer : true,
    novelShowOriginal: cfg ? cfg.novelShowOriginal !== false : true,
    floatingSwitch: cfg ? cfg.floatingSwitch !== false : true,
    imageSwitch: cfg ? cfg.imageSwitch !== false : true
  };
  const clientCode = clientRuntime.toString()
    .replace('"__CONFIG_PLACEHOLDER__"', JSON.stringify(clientConfig))
    .replace('__SVG_PLACEHOLDER__', SF_TRANSLATE_SVG.trim());
  const inject = '<style id="px-style">' + INJECT_CSS + '</style><script id="px-script">(' + clientCode + ')();</script>';
  let newBody = body;
  if (/<\/body>/i.test(body)) newBody = body.replace(/<\/body>/i, inject + "</body>");
  else newBody = body + inject;
  $done({ body: newBody });
}

// 字节数组转 Base64（Loon 运行时提供 btoa）
function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// 本地抓取图片并转为 data URI
// 原因：DeepSeek 等模型的服务器侧抓取 i.pixiv.re 极不稳定（实测失败率约 67%），
// 改由本机下载后以 base64 内联上传，实测成功率 100%
async function fetchImageAsDataUri(imageUrl) {
  try {
    const res = await new Promise((resolve, reject) => {
      $httpClient.get({
        url: imageUrl,
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.pixiv.net/" },
        "binary-mode": true,
        timeout: 20000
      }, (err, resp, data) => {
        if (err) return reject(err);
        resolve({ status: resp && resp.status, headers: (resp && resp.headers) || {}, data });
      });
    });

    if (!res.status || res.status !== 200 || !res.data) return "";
    const bytes = (res.data instanceof Uint8Array) ? res.data : new Uint8Array(res.data);
    if (!bytes.length) return "";

    const ctypeRaw = res.headers["Content-Type"] || res.headers["content-type"] || "";
    const ctype = String(ctypeRaw).split(";")[0].trim() || "image/jpeg";
    return "data:" + ctype + ";base64," + bytesToBase64(bytes);
  } catch (e) {
    return "";
  }
}

// JSON 解析容错：返回 undefined 表示解析失败（而非抛异常）
function tryParseJson(str) {
  if (typeof str !== "string") return undefined;
  try {
    const v = JSON.parse(str);
    return v === null ? undefined : v;
  } catch (e) {
    return undefined;
  }
}

// 从可能被截断的 JSON 数组中抢救出所有完整对象（平衡花括号扫描，跳过字符串内的括号）
function salvageJsonObjects(str) {
  if (typeof str !== "string") return [];
  const out = [];
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === "\\") { esc = true; continue; }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "{") { if (depth === 0) start = i; depth++; continue; }
    if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        const obj = tryParseJson(str.slice(start, i + 1));
        if (obj && typeof obj === "object" && !Array.isArray(obj)) out.push(obj);
        start = -1;
      }
    }
  }
  return out;
}

function parseMangaBubbles(content) {
  let value = content;
  if (typeof value === "string") {
    let clean = value.trim();
    const jsonMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonMatch) clean = jsonMatch[1].trim();
    else clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    // 三级容错解析：整体解析 → 修复尾随逗号 → 抢救截断数组中的完整对象
    let parsed = tryParseJson(clean);
    if (parsed === undefined) parsed = tryParseJson(clean.replace(/,\s*([\]}])/g, "$1"));
    if (parsed === undefined) {
      const salvaged = salvageJsonObjects(clean);
      if (salvaged.length) parsed = salvaged;
    }
    if (parsed === undefined) return [];
    value = parsed;
  }
  if (!Array.isArray(value)) value = value && (value.bubbles || value.items || value.data);
  if (!Array.isArray(value)) return [];

  const rawValid = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const box = item.box || item.box_2d || item.bbox || item.coordinates;
    const zh = item.zh || item.translation || item.chinese || item.target || item.text;
    if (Array.isArray(box) && box.length === 4 && zh) {
      rawValid.push({
        box,
        ja: String(item.ja || item.japanese || item.src || item.source || ""),
        zh: String(zh)
      });
    }
  }
  if (!rawValid.length) return [];

  // 坐标数值尺度自适应检测与防御性归一化
  const allCoords = [];
  rawValid.forEach(item => item.box.forEach(n => {
    const num = Number(n);
    if (!isNaN(num)) allCoords.push(num);
  }));
  const maxVal = allCoords.length ? Math.max(...allCoords) : 0;

  return rawValid.map(item => {
    let box = item.box.map(Number);
    if (maxVal > 100) {
      box = box.map(v => v / 10);
    } else if (maxVal <= 1.0 && maxVal > 0) {
      box = box.map(v => v * 100);
    }
    return { box, ja: item.ja, zh: item.zh };
  });
}

async function translateMangaImage(imageUrl, cfg) {
  if (!imageUrl) throw new Error("缺少图片 URL");
  // 关键防盗链加固：自动将官方 i.pximg.net 替换为免防盗链的全球加速镜像 i.pixiv.re
  const safeImageUrl = String(imageUrl).replace(/i\.pximg\.net/g, "i.pixiv.re");
  const engine = (cfg.imageEngine || "gemini_vl").toLowerCase();
  const target = LANG_MAP[cfg.targetLang] || LANG_MAP["zh-CN"];

  // 1. Google Gemini 空间视觉定位漫翻
  if (engine === "gemini_vl") {
    const key = cfg.geminiKey;
    if (!key) throw new Error("未配置 Gemini API Key，请在设置中心填入");
    const endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const model = "gemini-3.8-flash";
    const prompt = `Detect every dialogue bubble in this manga image.\nReturn ONLY a valid JSON array of objects without Markdown code fence formatting.\nEach object must have:\n- "box": [ymin, xmin, ymax, xmax] as normalized percentages (numbers from 0 to 100),\n- "ja": original detected Japanese text,\n- "zh": natural ${target.ai} translation in anime/manga style.\nOrder the list by manga reading flow (right-to-left, top-to-bottom).`;

    // 临时性故障（高峰限流 / 5xx / 网络超时）自动重试，最多 3 次尝试
    const TRANSIENT_RE = /high demand|overloaded|try again later|temporarily|rate limit|resource[_ ]exhausted|too many requests|quota|429|500|502|503|504|timeout|timed out|ECONNRESET|socket hang up/i;
    let lastErr = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await $.wait(1500 * attempt);

      let res;
      try {
        res = await $.post({
          url: endpoint,
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + key
          },
          body: JSON.stringify({
            model,
            messages: [{
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: safeImageUrl } }
              ]
            }],
            temperature: 0.1
          }),
          timeout: 30000
        });
      } catch (netErr) {
        lastErr = new Error("Gemini 网络异常: " + ((netErr && netErr.message) || netErr));
        if (TRANSIENT_RE.test(String((netErr && netErr.message) || netErr))) continue;
        throw lastErr;
      }

      let raw = res && res.body;
      let payload;
      try { payload = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (e) { payload = undefined; }

      if (payload === undefined) {
        lastErr = new Error("Gemini 模型返回非 JSON 响应");
        continue;
      }

      const errObj = (payload && !Array.isArray(payload) && payload.error)
        ? payload.error
        : (Array.isArray(payload) && payload[0] && payload[0].error ? payload[0].error : null);
      if (errObj) {
        const msg = errObj.message || errObj.status || JSON.stringify(errObj);
        lastErr = new Error("Gemini 模型报错: " + msg);
        // 仅临时性错误才重试；Key 无效、参数错误等直接抛出，避免无谓等待
        if (TRANSIENT_RE.test(msg)) continue;
        throw lastErr;
      }

      const choice = payload && payload.choices && payload.choices[0];
      if (choice && choice.finish_reason && choice.finish_reason !== "stop" && choice.finish_reason !== "length") {
        throw new Error("Gemini 审核拦截: " + choice.finish_reason);
      }

      const content = choice && choice.message && choice.message.content;
      const bubbles = parseMangaBubbles(content);
      if (bubbles.length) return bubbles;

      // 有内容但解析不出气泡 → 可能是输出被截断，重试一次往往能拿到完整 JSON
      if (typeof content === "string" && content.trim().length > 0) {
        lastErr = new Error("Gemini 解析对白失败: " + content.trim().slice(0, 80));
        continue;
      }

      lastErr = new Error("Gemini 视觉模型未识别到对白文字");
      return bubbles;
    }

    throw lastErr || new Error("Gemini 漫翻失败");
  }

  // 2. 多模态视觉大模型 (DeepSeek-VL / GPT-4o-mini)
  if (engine === "deepseek_vl" || engine === "gpt4o_mini") {
    let endpoint = "";
    let key = "";
    let model = "";
    if (engine === "gpt4o_mini") {
      endpoint = cfg.openaiUrl || "https://api.openai.com/v1/chat/completions";
      key = cfg.openaiKey;
      model = "gpt-4o-mini";
    } else {
      endpoint = cfg.deepseekUrl || "https://api.deepseek.com/v1/chat/completions";
      key = cfg.deepseekKey;
      model = (cfg.deepseekModel === "deepseek-v4-flash" || !cfg.deepseekModel) ? "deepseek-chat" : cfg.deepseekModel;
    }

    if (!key) {
      throw new Error("未配置 " + (engine === "gpt4o_mini" ? "OpenAI" : "DeepSeek") + " API Key");
    }
    if (!endpoint) throw new Error("未配置视觉端点 URL");

    const prompt = "Identify every readable dialogue bubble in this manga image. Return ONLY a JSON array. Each item must have box [top,left,bottom,right] as percentages from 0 to 100, ja for detected original text, and zh as the " + target.ai + " translation. Keep bubbles in reading order. Output raw JSON only.";

    // 优先本地下载后以 base64 内联上传（规避模型服务器抓取 i.pixiv.re 的高失败率）
    const dataUri = await fetchImageAsDataUri(safeImageUrl);
    // 候选图片引用：优先 base64，失败则回退直传 URL 让模型自行抓取
    const imageRefs = dataUri ? [dataUri, safeImageUrl] : [safeImageUrl];

    const requestOnce = async (ref) => {
      const r = await $.post({
        url: endpoint,
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + key
        },
        body: JSON.stringify({
          model,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: ref } }
            ]
          }],
          temperature: 0.1
        }),
        timeout: 30000
      });
      const rraw = r && r.body;
      try { return typeof rraw === "string" ? JSON.parse(rraw) : rraw; } catch (e) { return undefined; }
    };

    const extractErr = (p) => (p && !Array.isArray(p) && p.error)
      ? p.error
      : (Array.isArray(p) && p[0] && p[0].error ? p[0].error : null);

    let payload;
    let lastMsg = "模型无响应";
    for (const ref of imageRefs) {
      const p = await requestOnce(ref);
      if (p === undefined) { lastMsg = "模型返回非 JSON 响应"; continue; }
      const err = extractErr(p);
      if (err) { lastMsg = err.message || JSON.stringify(err); continue; }
      payload = p;
      break;
    }
    if (!payload) throw new Error("模型报错: " + lastMsg);

    const content = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
    const bubbles = parseMangaBubbles(content);
    if (!bubbles.length) {
      if (typeof content === "string" && content.trim().length > 0) {
        throw new Error("解析对白失败: " + content.trim().slice(0, 80));
      }
      throw new Error("视觉模型未识别到对白文字");
    }
    return bubbles;
  }

  // 3. 方案三：自建 manga-image-translator
  if (engine === "manga_translator") {
    const srv = (cfg.mangaServer || "").replace(/\/+$/, "");
    if (!srv) throw new Error("未配置自建 manga-image-translator 服务地址");
    const endpoint = srv + "/translate";

    const res = await $.post({
      url: endpoint,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: safeImageUrl, target_lang: cfg.targetLang || "zh-CN" }),
      timeout: 30000
    });

    let raw = res && res.body;
    let payload;
    try { payload = typeof raw === "string" ? JSON.parse(raw) : raw; } catch(e) { throw new Error("自建服务返回非 JSON"); }

    const bubbles = parseMangaBubbles(payload);
    if (!bubbles.length) throw new Error("自建服务未返回有效气泡");
    return bubbles;
  }

  throw new Error("未知漫翻引擎: " + engine);
}

// ─── 7. 翻译中转代理与 AI 漫翻处理 (/pxtrans) ───────────────────────────────────
async function handleProxy(cfg) {
  const url = (typeof $request !== "undefined" && $request.url) ? $request.url : "";
  const isVision = url.includes("action=vision");

  if (isVision) {
    const match = url.match(/url=([^&]+)/);
    const imgUrl = match ? decodeURIComponent(match[1]) : "";
    try {
      const bubbles = await translateMangaImage(imgUrl, cfg);
      doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: true, bubbles }));
    } catch (e) {
      doneWithResponse(502, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, bubbles: [], error: String((e && e.message) || e) }));
    }
    return;
  }

  // 文本批量中转
  let texts = [];
  try {
    const raw = typeof $request.body === "string" ? JSON.parse($request.body) : $request.body;
    if (raw && Array.isArray(raw.texts)) texts = raw.texts;
  } catch (e) { }

  const translations = await translateBatch(texts, cfg);
  $done({
    response: {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ ok: true, translations: translations })
    }
  });
}

function doneWithResponse(status, headers, body) {
  const payload = { status: status, headers: headers || {}, body: body };
  if (typeof $task !== "undefined") {
    $done({ response: { status: "HTTP/1.1 " + status, headers: payload.headers, body: payload.body } });
  } else {
    $done({ response: payload });
  }
}

// ─── 漫画与插画 AI 汉化专用查看器 (带悬浮按钮与按需气泡翻译) ────────────────
async function handleMangaViewer(cfg) {
  const url = (typeof $request !== "undefined" && $request.url) ? $request.url : "";
  const match = url.match(/[?&]illust_id=([^&]+)/);
  const rawId = match ? decodeURIComponent(match[1]) : "";
  const illustId = rawId.replace(/\D+/g, "");

  let title = "漫画查看器";
  let pages = [];

  if (illustId) {
    try {
      let authHeader = (typeof $request !== "undefined" && $request.headers) ? ($request.headers.Authorization || $request.headers.authorization || "") : "";
      if (!authHeader) authHeader = $.getdata("@Pixiv.Enhanced.Auth.Token") || "";
      const headers = {
        "User-Agent": "PixivIOSApp/8.9.1 (iOS 26.7; iPhone17,5)",
        "App-OS": "ios",
        "App-Version": "8.9.1",
        "Referer": "https://www.pixiv.net/"
      };
      if (authHeader) headers["Authorization"] = authHeader.startsWith("Bearer ") ? authHeader : ("Bearer " + authHeader);
      const res = await $.get({
        url: "https://app-api.pixiv.net/v1/illust/detail?illust_id=" + illustId,
        headers: headers,
        timeout: 10000
      });
      let raw = res && res.body;
      let data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (data && data.illust) {
        title = data.illust.title || title;
        if (Array.isArray(data.illust.meta_pages) && data.illust.meta_pages.length > 0) {
          for (const p of data.illust.meta_pages) {
            const u = (p.image_urls && (p.image_urls.large || p.image_urls.original || p.image_urls.medium)) || "";
            if (u) pages.push(u.replace(/i\.pximg\.net/g, "i.pixiv.re"));
          }
        } else if (data.illust.meta_single_page && data.illust.meta_single_page.original_image_url) {
          pages.push(data.illust.meta_single_page.original_image_url.replace(/i\.pximg\.net/g, "i.pixiv.re"));
        } else if (data.illust.image_urls && data.illust.image_urls.large) {
          pages.push(data.illust.image_urls.large.replace(/i\.pximg\.net/g, "i.pixiv.re"));
        }
      }
    } catch (e) { }
  }

  const pagesHtml = pages.length > 0 ? pages.map((src, i) => `
    <div class="manga-page-wrapper" id="page-wrapper-${i}">
      <img src="${src}" class="manga-img" id="img-page-${i}" data-index="${i}" loading="lazy" alt="Page ${i + 1}">
    </div>
  `).join("") : `
    <div style="padding: 80px 20px 40px; color: #8e8e93;">
      <div style="font-size: 36px; margin-bottom: 12px;">📭</div>
      <p style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 8px;">未获取到漫画页面 (ID: ${illustId || "未知"})</p>
      <p style="font-size: 13px; line-height: 1.6; max-width: 360px; margin: 0 auto 20px;">可能该作品需要会员登录态或网络繁忙。请返回 Pixiv App 重新轻点链接，或确认作品 ID 是否有效。</p>
      <a href="javascript:location.reload()" style="display: inline-block; padding: 8px 18px; border-radius: 8px; background: #007aff; color: #fff; text-decoration: none; font-size: 14px;">重新加载</a>
    </div>
  `;

  const viewerHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body {
      margin: 0;
      padding: 0;
      background: #09090b;
      color: #fff;
      font-family: -apple-system, "PingFang SC", "Hiragino Sans GB", sans-serif;
      text-align: center;
      padding-bottom: calc(env(safe-area-inset-bottom, 20px) + 90px);
      user-select: none;
      -webkit-user-select: none;
    }
    .manga-header {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: rgba(14, 14, 18, 0.88);
      -webkit-backdrop-filter: blur(25px) saturate(180%);
      backdrop-filter: blur(25px) saturate(180%);
      padding: calc(env(safe-area-inset-top, 20px) + 8px) 14px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 0.5px solid rgba(255, 255, 255, 0.12);
    }
    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      color: #007aff;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      padding: 4px 6px;
      margin-left: -6px;
    }
    .manga-title {
      font-size: 14.5px;
      font-weight: 600;
      color: #fff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 58%;
      text-align: center;
    }
    .manga-page-indicator {
      font-size: 13px;
      color: #8e8e93;
      font-variant-numeric: tabular-nums;
      min-width: 48px;
      text-align: right;
    }
    .manga-page-wrapper {
      position: relative;
      margin: 0 auto 10px;
      max-width: 860px;
      width: 100%;
    }
    .manga-img {
      width: 100%;
      height: auto;
      display: block;
      background: #141418;
    }
    .bottom-control-island {
      position: fixed;
      left: 50%;
      bottom: calc(env(safe-area-inset-bottom, 20px) + 16px);
      transform: translateX(-50%);
      z-index: 2147483647;
      background: rgba(28, 28, 30, 0.92);
      -webkit-backdrop-filter: blur(30px) saturate(180%);
      backdrop-filter: blur(30px) saturate(180%);
      border: 0.5px solid rgba(255, 255, 255, 0.2);
      border-radius: 30px;
      padding: 5px 10px 5px 6px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    }
    .island-btn {
      height: 40px;
      padding: 0 16px;
      border-radius: 20px;
      background: #007aff;
      color: #fff;
      border: none;
      font-size: 14px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      transition: background 0.2s, transform 0.12s;
    }
    .island-btn:active { transform: scale(0.94); }
    .island-btn.busy { background: #636366 !important; pointer-events: none; }
    .island-btn.done { background: #34c759 !important; }
    .island-action-btn {
      width: 36px;
      height: 36px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s, opacity 0.2s;
    }
    .island-action-btn:active { background: rgba(255, 255, 255, 0.22); }
    .px-hud-bubble {
      position: absolute;
      z-index: 1000;
      background: rgba(255, 255, 255, 0.96);
      color: #111;
      font-family: -apple-system, "PingFang SC", "Hiragino Sans GB", sans-serif;
      font-size: 13.5px;
      font-weight: 600;
      line-height: 1.35;
      padding: 6px 9px;
      border-radius: 8px;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(0, 0, 0, 0.1);
      word-break: break-word;
      cursor: pointer;
      text-align: left;
      transition: transform 0.15s, opacity 0.2s;
    }
    .px-hud-bubble:active { transform: scale(0.96); background: #f2f2f7; }
    .px-hud-bubble.show-ja {
      background: #1c1c1e !important;
      color: #fff !important;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.25) !important;
    }
    .hide-all-bubbles .px-hud-bubble { display: none !important; }
  </style>
</head>
<body>
  <div class="manga-header">
    <a href="javascript:void(0)" class="back-btn" onclick="handleBack()">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      <span>返回</span>
    </a>
    <span class="manga-title">${title}</span>
    <span class="manga-page-indicator" id="page-indicator">${pages.length > 1 ? ("1 / " + pages.length) : "单图"}</span>
  </div>
  ${pagesHtml}
  <div class="bottom-control-island">
    <button type="button" class="island-btn" id="px-fab">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>
      </svg>
      <span id="px-fab-text">AI 漫翻</span>
    </button>
    <button type="button" class="island-action-btn" id="btn-toggle-bubbles" title="切换原文/译文显示" onclick="toggleBubblesVisibility()">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
      </svg>
    </button>
  </div>
  <script>
    function handleBack() {
      if (window.history.length > 1) { window.history.back(); } else { window.close(); }
    }

    let bubblesVisible = true;
    function toggleBubblesVisibility() {
      bubblesVisible = !bubblesVisible;
      document.body.classList.toggle("hide-all-bubbles", !bubblesVisible);
      const btn = document.getElementById("btn-toggle-bubbles");
      if (btn) btn.style.opacity = bubblesVisible ? "1" : "0.45";
    }

    const bubbleCache = {};

    function renderBubblesOnWrapper(wrapper, bubbles) {
      wrapper.querySelectorAll(".px-hud-bubble").forEach(b => b.remove());
      bubbles.forEach(b => {
        const bubble = document.createElement("div");
        bubble.className = "px-hud-bubble";
        bubble.textContent = b.zh;
        bubble.style.top = b.box[0] + "%";
        bubble.style.left = b.box[1] + "%";
        bubble.style.maxWidth = (b.box[3] - b.box[1]) + "%";
        bubble.setAttribute("title", "轻触切换日文原句");
        bubble.addEventListener("click", function(e) {
          e.stopPropagation();
          if (bubble.classList.contains("show-ja")) {
            bubble.classList.remove("show-ja");
            bubble.textContent = b.zh;
          } else {
            bubble.classList.add("show-ja");
            bubble.textContent = b.ja || "原文字幕";
          }
        });
        wrapper.appendChild(bubble);
      });
    }

    window.addEventListener("scroll", function() {
      const wrappers = document.querySelectorAll(".manga-page-wrapper");
      if (!wrappers.length) return;
      const centerY = window.innerHeight / 2;
      let currentIdx = 0;
      let minDist = 99999;
      let best = wrappers[0];
      wrappers.forEach((w, i) => {
        const r = w.getBoundingClientRect();
        const dist = Math.abs((r.top + r.bottom) / 2 - centerY);
        if (dist < minDist) { minDist = dist; currentIdx = i; best = w; }
      });
      const ind = document.getElementById("page-indicator");
      if (ind && wrappers.length > 1) ind.textContent = (currentIdx + 1) + " / " + wrappers.length;
      const img = best.querySelector(".manga-img");
      const fab = document.getElementById("px-fab");
      const fabText = document.getElementById("px-fab-text");
      if (img && bubbleCache[img.src]) {
        if (fab) fab.classList.add("done");
        if (fabText) fabText.textContent = "已汉化 (" + bubbleCache[img.src].length + "处)";
      } else {
        if (fab) fab.classList.remove("done");
        if (fabText) fabText.textContent = "AI 漫翻";
      }
    }, { passive: true });

    const fab = document.getElementById("px-fab");
    const fabText = document.getElementById("px-fab-text");
    fab.addEventListener("click", async function() {
      if (fab.classList.contains("busy")) return;
      const wrappers = document.querySelectorAll(".manga-page-wrapper");
      let bestWrapper = wrappers[0];
      let minDist = 99999;
      const centerY = window.innerHeight / 2;
      wrappers.forEach(w => {
        const r = w.getBoundingClientRect();
        const dist = Math.abs((r.top + r.bottom) / 2 - centerY);
        if (dist < minDist) { minDist = dist; bestWrapper = w; }
      });
      if (!bestWrapper) return;
      const img = bestWrapper.querySelector(".manga-img");
      if (!img || !img.src) return;

      if (bubbleCache[img.src]) {
        renderBubblesOnWrapper(bestWrapper, bubbleCache[img.src]);
        fab.classList.add("done");
        if (fabText) fabText.textContent = "已汉化 (" + bubbleCache[img.src].length + "处)";
        return;
      }

      fab.classList.add("busy");
      if (fabText) fabText.textContent = "识别中…";
      try {
        bestWrapper.querySelectorAll(".px-hud-bubble").forEach(b => b.remove());
        const pxtransUrl = "https://www.pixiv.net/pxtrans?action=vision&url=" + encodeURIComponent(img.src);
        const res = await fetch(pxtransUrl).then(r => r.json());
        if (res && Array.isArray(res.bubbles) && res.bubbles.length > 0) {
          bubbleCache[img.src] = res.bubbles;
          renderBubblesOnWrapper(bestWrapper, res.bubbles);
          fab.classList.add("done");
          if (fabText) fabText.textContent = "已汉化 (" + res.bubbles.length + "处)";
        } else {
          alert((res && res.error) ? ("漫翻未完成: " + res.error) : "未在当前画面识别到对白文字");
          if (fabText) fabText.textContent = "AI 漫翻";
        }
      } catch (err) {
        alert("漫翻请求异常：" + (err.message || err));
        if (fabText) fabText.textContent = "AI 漫翻";
      }
      fab.classList.remove("busy");
    });
  </script>
</body>
</html>`;

  doneWithResponse(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  }, viewerHTML);
}

function handleSettingsHTML() {
  doneWithResponse(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  }, SETTINGS_HTML);
}

function handleApiGet() {
  const keys = [
    "@Pixiv.Enhanced.Settings.Global.Switch",
    "@Pixiv.Enhanced.Settings.Auto.Switch",
    "@Pixiv.Enhanced.Settings.Auto.Scopes",
    "@Pixiv.Enhanced.Settings.Filter.SkipChinese",
    "@Pixiv.Enhanced.Settings.Novel.Font",
    "@Pixiv.Enhanced.Settings.Novel.CleanDisclaimer",
    "@Pixiv.Enhanced.Settings.Novel.ShowOriginal",
    "@Pixiv.Enhanced.Settings.Floating.Switch",
    "@Pixiv.Enhanced.Settings.Translator.Source",
    "@Pixiv.Enhanced.Settings.Target.Lang",
    "@Pixiv.Enhanced.Settings.Network.ImageAccelerate",
    "@Pixiv.Enhanced.Settings.Tag.OfflineOnly",
    "@Pixiv.Enhanced.Settings.Image.Switch",
    "@Pixiv.Enhanced.Settings.Image.Engine",
    "@Pixiv.Enhanced.Settings.Auth.GeminiKey",
    "@Pixiv.Enhanced.Settings.Auth.DeepSeekKey",
    "@Pixiv.Enhanced.Settings.Auth.DeepSeekUrl",
    "@Pixiv.Enhanced.Settings.Auth.DeepSeekModel",
    "@Pixiv.Enhanced.Settings.Auth.OpenAIKey",
    "@Pixiv.Enhanced.Settings.Auth.OpenAIUrl",
    "@Pixiv.Enhanced.Settings.Auth.BaiduAppid",
    "@Pixiv.Enhanced.Settings.Auth.BaiduSecret",
    "@Pixiv.Enhanced.Settings.Auth.CaiyunToken",
    "@Pixiv.Enhanced.Settings.Manga.ServerUrl",
    "@Pixiv.Enhanced.Settings.LogLevel"
  ];
  const out = {};
  for (const k of keys) {
    const v = $.getdata(k);
    if (v !== undefined && v !== null && v !== "") {
      if (v === "true") out[k] = true;
      else if (v === "false") out[k] = false;
      else if (/^[\[{]/.test(v)) {
        try { out[k] = JSON.parse(v); } catch (e) { out[k] = v; }
      } else out[k] = v;
    }
  }
  doneWithResponse(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  }, JSON.stringify(out));
}

function handleApiSet() {
  let payload = {};
  try {
    payload = typeof $request.body === "string" ? JSON.parse($request.body) : ($request.body || {});
  } catch (e) { }
  if (payload.key && payload.value !== undefined) {
    const valStr = typeof payload.value === "object" ? JSON.stringify(payload.value) : String(payload.value);
    $.setdata(valStr, payload.key);
  } else if (typeof payload === "object") {
    for (const k of Object.keys(payload)) {
      const valStr = typeof payload[k] === "object" ? JSON.stringify(payload[k]) : String(payload[k]);
      $.setdata(valStr, k);
    }
  }
  doneWithResponse(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  }, JSON.stringify({ saved: true }));
}

async function handleApiTestManga(cfg) {
  const start = Date.now();
  const url = (typeof $request !== "undefined" && $request.url) ? $request.url : "";
  const matchEngine = url.match(/[?&]engine=([^&]+)/);
  const matchServer = url.match(/[?&]server=([^&]+)/);
  const matchGeminiKey = url.match(/[?&]gemini_key=([^&]+)/);

  const engine = (matchEngine ? decodeURIComponent(matchEngine[1]) : (cfg.imageEngine || "gemini_vl")).toLowerCase();
  const server = ((matchServer ? decodeURIComponent(matchServer[1]) : "") || cfg.mangaServer || "").trim();
  const geminiKey = ((matchGeminiKey ? decodeURIComponent(matchGeminiKey[1]) : "") || cfg.geminiKey || "").trim();
  const testImg = "https://i.pixiv.re/c/540x540_70/img-master/img/2021/08/31/00/38/21/92390436_p0_square1200.jpg";

  try {
    if (engine === "gemini_vl") {
      if (!geminiKey) {
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "未填写 Gemini API Key" }));
        return;
      }
      const tempCfg = Object.assign({}, cfg, { imageEngine: "gemini_vl", geminiKey });
      const bubbles = await translateMangaImage(testImg, tempCfg);
      const latency = Date.now() - start;
      doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: true, latency, count: bubbles.length }));
      return;
    }

    if (engine === "manga_translator") {
      const srv = (server || "").replace(/\/+$/, "");
      if (!srv) {
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "未填写自建服务 URL 地址" }));
        return;
      }
      const res = await $.get({ url: srv, timeout: 5000 });
      const latency = Date.now() - start;
      doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: true, latency }));
      return;
    }

    // DeepSeek / OpenAI 视觉模型测速
    const isDeepSeek = engine === "deepseek_vl";
    const key = isDeepSeek ? cfg.deepseekKey : cfg.openaiKey;
    if (!key) {
      doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "未填写 " + (isDeepSeek ? "DeepSeek" : "OpenAI") + " API Key" }));
      return;
    }
    const bubbles = await translateMangaImage(testImg, cfg);
    const latency = Date.now() - start;
    doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: true, latency, count: bubbles.length }));
  } catch (e) {
    doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
  }
}

async function handleApiTestAI(cfg) {
  const url = (typeof $request !== "undefined" && $request.url) ? $request.url : "";
  const match = url.match(/[?&]source=([^&]+)/);
  const matchAppid = url.match(/[?&]appid=([^&]+)/);
  const matchSecret = url.match(/[?&]secret=([^&]+)/);
  const matchCaiyun = url.match(/[?&]caiyun_token=([^&]+)/);
  const targetSource = (match ? decodeURIComponent(match[1]) : cfg.translator || "google").toLowerCase();
  const start = Date.now();

  try {
    if (targetSource === "caiyun") {
      const token = ((matchCaiyun ? decodeURIComponent(matchCaiyun[1]) : "") || cfg.caiyunToken || "").trim();
      if (!token) {
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "未填写彩云小译 Token，请先在 open.caiyunapp.com 获取" }));
        return;
      }
      const testUrl = "https://api.interpreter.caiyunai.com/v1/translator";
      let res;
      try {
        res = await $.post({
          url: testUrl,
          headers: {
            "Content-Type": "application/json",
            "X-Authorization": "token " + token
          },
          body: JSON.stringify({
            source: ["こんにちは"],
            trans_type: "auto2zh",
            request_id: "test_" + Date.now(),
            detect: true
          }),
          timeout: 10000
        });
      } catch (netErr) {
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "网络请求异常(" + (netErr.message || netErr) + ")" }));
        return;
      }
      const latency = Date.now() - start;
      let raw = res && res.body;
      let data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (data && Array.isArray(data.target) && data.target[0]) {
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: true, latency: latency, translation: data.target[0] }));
        return;
      }
      const errMsg = (data && data.message) ? data.message : "Token 鉴权未通过或额度不足";
      doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "彩云鉴权失败: " + errMsg }));
      return;
    }
    if (targetSource === "baidu") {
      const appid = ((matchAppid ? decodeURIComponent(matchAppid[1]) : "") || cfg.baiduAppid || "").trim();
      const secret = ((matchSecret ? decodeURIComponent(matchSecret[1]) : "") || cfg.baiduSecret || "").trim();
      if (!appid || !secret) {
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "未配置百度翻译 AppID 或 Secret 密钥" }));
        return;
      }
      const salt = String(Date.now());
      const sign = md5(appid + "こんにちは" + salt + secret);
      const testUrl = "https://fanyi-api.baidu.com/api/trans/vip/translate";
      const params = "q=" + encodeURIComponent("こんにちは") + "&from=auto&to=zh&appid=" + encodeURIComponent(appid) + "&salt=" + salt + "&sign=" + sign;
      let res;
      try {
        res = await $.post({
          url: testUrl,
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0" },
          body: params,
          timeout: 10000
        });
      } catch (netErr) {
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "网络请求异常(" + (netErr.message || netErr) + ")" }));
        return;
      }
      const latency = Date.now() - start;
      let raw = res && res.body;
      let data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (data && data.error_code && String(data.error_code) !== "0") {
        const errMap = {
          "54000": "缺少必填参数",
          "54001": "签名错误，请检查 AppID 与密钥是否有误或有多余空格",
          "52003": "未授权用户，请登录 fanyi-api.baidu.com 开通翻译",
          "54004": "账户余额不足"
        };
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "百度鉴权失败 " + data.error_code + "：" + (errMap[String(data.error_code)] || data.error_msg || "密钥错误") }));
        return;
      }
      if (data && Array.isArray(data.trans_result) && data.trans_result[0]) {
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: true, latency: latency, translation: data.trans_result[0].dst }));
        return;
      }
      doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "百度未返回有效翻译" }));
      return;
    }
    if (targetSource === "deepseek") {
      if (!cfg.deepseekKey) {
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "未填写 DeepSeek API Key，请先输入密钥" }));
        return;
      }
      if (!cfg.deepseekUrl) {
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "未配置 DeepSeek 接口地址" }));
        return;
      }
      const testRes = await deepseekTranslateBatch(["こんにちは"], "Simplified Chinese", cfg);
      const latency = Date.now() - start;
      if (testRes && testRes[0] && testRes[0] !== "こんにちは") {
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: true, latency: latency, translation: testRes[0] }));
      } else {
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "DeepSeek 响应异常，请检查Key与网络" }));
      }
      return;
    }

    if (targetSource === "openai") {
      if (!cfg.openaiKey) {
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "未填写 OpenAI API Key，请先输入密钥" }));
        return;
      }
      const endpoint = cfg.openaiUrl || "https://api.openai.com/v1/chat/completions";
      const prompt = "Translate 'こんにちは' to Simplified Chinese. Return ONLY the translated word.";
      const res = await $.post({
        url: endpoint,
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + cfg.openaiKey
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1
        }),
        timeout: 15000
      });
      const latency = Date.now() - start;
      let raw = res && res.body;
      let payload;
      try { payload = typeof raw === "string" ? JSON.parse(raw) : raw; } catch(e) { throw new Error("OpenAI 返回非 JSON"); }
      if (payload && payload.error) {
        throw new Error(payload.error.message || JSON.stringify(payload.error));
      }
      const trans = payload && payload.choices && payload.choices[0] && payload.choices[0].message && payload.choices[0].message.content;
      if (trans) {
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: true, latency: latency, translation: trans.trim() }));
      } else {
        doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "OpenAI 返回异常，请检查接口" }));
      }
      return;
    }

    // Google 免费极速接口真实测试 (不走缓存，强制发出网络请求测试真实延迟)
    const testRes = await googleTranslateChunk(["こんにちは"], "zh-CN");
    const latency = Date.now() - start;
    if (testRes && testRes[0] && testRes[0] !== "こんにちは") {
      doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: true, latency: latency, translation: testRes[0] }));
    } else {
      doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: "Google 接口异常或受到限流" }));
    }
  } catch (e) {
    doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
  }
}

function handleApiClearCache() {
  const stats = clearTranslationCacheData();
  doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: true, count: stats.count, bytes: stats.bytes, sizeText: stats.sizeText }));
}

function handleApiCacheStats() {
  const stats = getCacheStats();
  doneWithResponse(200, { "Content-Type": "application/json; charset=utf-8" }, JSON.stringify({ ok: true, count: stats.count, bytes: stats.bytes, sizeText: stats.sizeText, indexed: stats.indexed }));
}

// ─── 8. 主入口分发 ─────────────────────────────────────────────────────────────
(async function main() {
  const cfg = loadConfig();

  const url = (typeof $request !== "undefined" && $request.url) ? $request.url : "";

  // 1. 设置中心 HTML 页面 (本地离线瞬时秒开，对标 Pix-Scripting 苹果原生级视觉)
  if (url.includes("/manga/viewer")) {
    await handleMangaViewer(cfg);
    return;
  }
  if (url.includes("/settings/Enhanced")) {
    handleSettingsHTML();
    return;
  }

  // 2. 设置中心 API 存取与实时测速
  if (url.includes("/api/get")) {
    handleApiGet();
    return;
  }
  if (url.includes("/api/set")) {
    handleApiSet();
    return;
  }
  if (url.includes("/api/test_manga")) {
    await handleApiTestManga(cfg);
    return;
  }
  if (url.includes("/api/test_ai")) {
    await handleApiTestAI(cfg);
    return;
  }
  if (url.includes("/api/clear_cache")) {
    handleApiClearCache();
    return;
  }
  if (url.includes("/api/cache_stats")) {
    handleApiCacheStats();
    return;
  }

  if (!cfg.globalSwitch) { $done({}); return; }

  // 3. 翻译中转端点
  if (url.includes("/pxtrans")) {
    await handleProxy(cfg);
    return;
  }

  // 4. 小说 Webview 注入
  if (url.includes("/webview/v2/novel")) {
    handleWebviewInject(cfg);
    return;
  }

  // 5. 全页面 REST API 响应体拦截汉化
  if (typeof $response !== "undefined" && $response.body) {
    await handleApiRewrite(cfg);
    return;
  }

  $done({});
})().catch(function (e) {
  $.logErr((e && e.stack) || e);
  $done({});
});

}).call(this);}});
})();
