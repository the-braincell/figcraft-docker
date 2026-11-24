'use strict';
const s=require('./storage'),t=require('./tokens'),str={type:'string'},bool={type:'boolean',default:false};
const specs=[
['upload_text','Write UTF-8 text, up to 1 MiB, to a path relative to /storage.',{path:str,content:str,overwrite:bool},['path','content']],
['upload_file','Write base64 data, up to 1 MiB decoded; use get_upload_url for larger files.',{path:str,content_base64:str,overwrite:bool},['path','content_base64']],
['get_upload_url','Create a temporary browser upload link for the user; this does not transfer the file.',{path:str,overwrite:bool},['path']],
['get_download_url','Create a temporary download link.',{path:str},['path']],
['list_files','List a storage directory; empty path means root.',{path:{type:'string',default:''}},[]],
['get_file_info','Return size, modification timestamp and SHA-256.',{path:str},['path']],
['create_directory','Create a directory under storage.',{path:str},['path']],
['move_file','Move a regular file without overwriting.',{path:str,destination:str},['path','destination']],
['delete_file','Permanently delete a regular file only after user confirmation.',{path:str,confirm:{type:'boolean'}},['path','confirm']]];
const definitions=specs.map(([name,description,properties,required])=>({name,description,inputSchema:{type:'object',properties,required,additionalProperties:false},annotations:{readOnlyHint:['list_files','get_file_info','get_download_url'].includes(name),destructiveHint:['delete_file','move_file','upload_text','upload_file','get_upload_url'].includes(name)}}));
async function call(name,a){const d=definitions.find(x=>x.name===name);if(!d)return null;if(!a||typeof a!=='object'||Array.isArray(a))s.fail(400,'Invalid arguments');for(const k of d.inputSchema.required)if(!Object.hasOwn(a,k))s.fail(400,'Missing '+k);for(const [k,v] of Object.entries(a)){if(!Object.hasOwn(d.inputSchema.properties,k)||typeof v!==d.inputSchema.properties[k].type)s.fail(400,'Invalid '+k)}
switch(name){
case 'upload_text':return s.put(a.path,s.Readable.from([Buffer.from(a.content)]),{overwrite:a.overwrite,limit:s.inline});
case 'upload_file':{if(a.content_base64.length>Math.ceil(s.inline/3)*4)s.fail(413,'Inline upload too large');if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(a.content_base64))s.fail(400,'Invalid base64');return s.put(a.path,s.Readable.from([Buffer.from(a.content_base64,'base64')]),{overwrite:a.overwrite,limit:s.inline})}
case 'get_upload_url':return t.issue('upload',a.path,a.overwrite===true);
case 'get_download_url':{const {h}=await s.open(a.path);await h.close();return t.issue('download',a.path)}
case 'list_files':return s.list(a.path||'');
case 'get_file_info':return s.info(a.path);
case 'create_directory':return s.mkdir(a.path);
case 'move_file':return s.move(a.path,a.destination);
case 'delete_file':if(a.confirm!==true)s.fail(400,'Explicit confirmation required');return s.remove(a.path);
}}
module.exports={definitions,call};
