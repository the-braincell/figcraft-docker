'use strict';
const crypto=require('node:crypto'),{parts,fail}=require('./storage');
const key=process.env.MCP_API_KEY;
if(!key)throw Error('MCP_API_KEY required');
function equal(a,b){const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&crypto.timingSafeEqual(x,y)}
function sign(s){return crypto.createHmac('sha256',key).update('figcraft-file-v1:'+s).digest('base64url')}
function issue(op,path,overwrite=false){parts(path);if(!process.env.FILE_PUBLIC_URL)fail(400,'Set FILE_PUBLIC_URL to the reachable MCP origin');const u=new URL(process.env.FILE_PUBLIC_URL);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.search||u.hash||u.pathname!=='/')fail(400,'FILE_PUBLIC_URL must be an HTTP(S) origin');const exp=Math.floor(Date.now()/1000)+900,s=Buffer.from(JSON.stringify({op,path,overwrite,exp})).toString('base64url');return {url:u.origin+'/transfer/'+s+'.'+sign(s),expires_at:new Date(exp*1000).toISOString(),path:'/storage/'+path}}
function verify(token){const [s,sig,...rest]=token.split('.');if(rest.length||!s||!sig||!equal(sig,sign(s)))fail(403,'Invalid transfer URL');let x;try{x=JSON.parse(Buffer.from(s,'base64url'))}catch{fail(403,'Invalid transfer URL')}if(!['upload','download'].includes(x.op)||!Number.isSafeInteger(x.exp)||x.exp<=Date.now()/1000)fail(403,'Transfer URL expired or invalid');parts(x.path);return x}
module.exports={issue,verify,equal,key};
