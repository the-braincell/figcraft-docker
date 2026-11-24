#!/bin/sh
set -eu
: "${SUPERGATEWAY_API_KEY:?MCP API key required}"
case "${MCP_MODE:-attached}" in
 attached)
  port=${CONTROL_PORT:-7979}
  case "$port" in ''|*[!0-9]*) echo 'Invalid control port' >&2; exit 1;; esac
  [ "$port" -ge 1 ] && [ "$port" -le 65535 ] || exit 1
  cmd="figcraft-cli mcp --attach $port --timeout 120"
  ;;
 headless) cmd='figcraft-cli mcp --automation-read-root /workspace --automation-write-root /workspace';;
 *) echo 'Invalid MCP_MODE' >&2; exit 1;;
esac
cd /workspace
bin=$(node -p 'const b=require("/opt/supergateway/package.json").bin; typeof b === "string" ? b : b.supergateway')
exec node "/opt/supergateway/$bin" --stdio "$cmd" --outputTransport streamableHttp --stateful --host 0.0.0.0 --port 8000 --healthEndpoint /healthz
