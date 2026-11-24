#!/usr/bin/env python3
"""Verify authentication, initialize a session, and list tools without editing."""
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
