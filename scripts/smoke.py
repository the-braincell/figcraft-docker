#!/usr/bin/env python3
"""Verify authentication and live desktop mutation using a disposable new document."""
import json, os, sys, urllib.request, urllib.error
url = sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8000/mcp'
key = os.environ['MCP_API_KEY']
headers = {'Accept':'application/json, text/event-stream','Content-Type':'application/json'}
def send(payload, auth=True):
    h = dict(headers)
    if auth: h['Authorization'] = 'Bearer '+key
    req=urllib.request.Request(url, json.dumps(payload).encode(), h)
    with urllib.request.urlopen(req, timeout=150) as r:
        if r.headers.get('Mcp-Session-Id'): headers['Mcp-Session-Id']=r.headers['Mcp-Session-Id']
        if 'text/event-stream' in r.headers.get('Content-Type',''):
            for line in r:
                if line.startswith(b'data:'):
                    obj=json.loads(line[5:])
                    if 'id' in obj: return obj
        else:
            data=r.read(); return json.loads(data) if data else None
init={'jsonrpc':'2.0','id':1,'method':'initialize','params':{'protocolVersion':'2025-06-18','capabilities':{},'clientInfo':{'name':'smoke','version':'1'}}}
try: send(init,False)
except urllib.error.HTTPError as e:
    assert e.code==401, e.code
else: raise RuntimeError('Unauthenticated request accepted')
r=send(init); assert 'result' in r,r
headers['MCP-Protocol-Version']=r['result']['protocolVersion']
send({'jsonrpc':'2.0','method':'notifications/initialized'})
r=send({'jsonrpc':'2.0','id':2,'method':'tools/list'}); assert r['result']['tools'],r
print('Tools:', ', '.join(t['name'] for t in r['result']['tools']))

# Prove that MCP is operating against the live desktop, not a headless engine.
def call(name, arguments, request_id):
    response = send({'jsonrpc':'2.0','id':request_id,'method':'tools/call',
                     'params':{'name':name,'arguments':arguments}})
    assert 'result' in response, response
    result = response['result']
    assert not result.get('isError'), result
    return result
ui = call('inspect_ui', {}, 3)
assert 'windows' in json.dumps(ui), ui
call('run_command', {'command':'file.new','params':{}}, 4)
print('Created disposable test document')
marker = 'CI-live-desktop-rectangle'
call('create_node', {'type':'rectangle','x':20,'y':20,'width':100,'height':80,'name':marker}, 5)
document = call('inspect_document', {'depth':8}, 6)
assert marker in json.dumps(document), document
# Independently inspect the desktop socket from inside the container.
import subprocess
control = subprocess.check_output(['docker','compose','exec','-T','figcraft','node','-e',
    """const s=require('net').connect(7979,'127.0.0.1',()=>s.write(JSON.stringify({id:1,method:'document.inspect',params:{depth:8}})+'\\n'));let b='';s.on('data',c=>{b+=c;if(b.includes('\\n')){console.log(b);s.end();process.exit(0)}});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),65000);"""],timeout=75)
reply = json.loads(control)
assert reply.get('ok') and marker in json.dumps(reply), reply
print('Verified live desktop document mutation through MCP')
