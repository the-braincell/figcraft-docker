'use strict';
const {spawn}=require('node:child_process'),readline=require('node:readline'),{definitions,call}=require('./tools'),s=require('./storage');
const child=spawn('figcraft-cli',['mcp','--attach','7979','--timeout','120'],{stdio:['pipe','pipe','inherit']});
const pending=new Set(),names=new Set(definitions.map(x=>x.name)),write=x=>process.stdout.write(JSON.stringify(x)+'\n');
child.on('error',e=>{console.error(e.message);process.exit(1)});
child.on('exit',c=>process.exit(c||0));child.stdin.on('error',()=>process.exit(1));
process.on('SIGTERM',()=>child.kill('SIGTERM'));
readline.createInterface({input:child.stdout}).on('line',line=>{let x;try{x=JSON.parse(line)}catch{return process.stdout.write(line+'\n')}if(pending.delete(x.id)&&Array.isArray(x.result?.tools)&&!x.result.nextCursor){const existing=new Set(x.result.tools.map(t=>t.name));x.result.tools.push(...definitions.filter(t=>!existing.has(t.name)))}write(x)});
readline.createInterface({input:process.stdin}).on('line',async line=>{let x;try{x=JSON.parse(line)}catch{return child.stdin.write(line+'\n')}if(x.method==='tools/list')pending.add(x.id);if(x.method==='tools/call'&&names.has(x.params?.name)){try{const r=await call(x.params.name,x.params.arguments||{});write({jsonrpc:'2.0',id:x.id,result:{content:[{type:'text',text:JSON.stringify(r)}]}})}catch(e){write({jsonrpc:'2.0',id:x.id,result:{isError:true,content:[{type:'text',text:s.message(e)}]}})}}else child.stdin.write(line+'\n')}).on('close',()=>child.stdin.end());
