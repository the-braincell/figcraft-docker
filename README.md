# FigCraft Docker / MCP gateway

An authenticated, stateful Streamable HTTP bridge for the native FigCraft CLI. Designed for the junkerderprovinz Selkies desktop image. No Docker socket or privileged sidecar required.

**Status:** experimental initial scaffold. Container build, gateway authentication and live desktop integration must be validated before production use. CI tests headless mode only.

## Attached mode (existing desktop)

1. Back up your existing /config and design files. Verify the running image version and CLI: `docker exec figcraft figcraft-cli --version`. Set FIGCRAFT_IMAGE to the same version (ideally an immutable digest).
2. Add the following to the existing desktop service, preserving its current settings. Recreate that service.

```yaml
services:
  figcraft:
    environment:
      FIGCRAFT_CONTROL_PORT: '7979'
    ports:
      - '127.0.0.1:8000:8000'
```

Do not publish 7979. Open FigCraft in Selkies. If its launcher does not pass through the environment, enable the control channel inside the app (if supported by your version), or start `figcraft --control 7979` from the desktop terminal as the desktop user after closing the original app. Verify the listener with `docker exec figcraft sh -c 'ss -ltn | grep 7979'` if ss is installed.

3. Copy .env.example to .env, set the actual container name and a long random MCP_API_KEY (openssl rand -hex 32). Create workspace and grant UID 1000 write access, or change the Compose user.

```sh
mkdir -p workspace
docker compose up -d --build
```

The sidecar shares the desktop network namespace, so the desktop owns the published port. Recreate the sidecar after recreating the desktop container. A healthy gateway does not prove the desktop control channel is ready.

## Headless mode

Run `docker compose -f compose.headless.yaml up -d --build`. No existing desktop required. This creates a separate in-memory document session per MCP client; explicitly save documents to /workspace for persistence. Avoid opening and writing the same local file concurrently.

## Clients

Use HTTPS or an SSH tunnel (for example `ssh -L 8000:127.0.0.1:8000 user@docker-host`). The endpoint is then http://127.0.0.1:8000/mcp.

Claude Code:

```sh
claude mcp add --transport http figcraft http://127.0.0.1:8000/mcp --header 'Authorization: Bearer YOUR_KEY'
```

Claude Desktop configuration (Node.js installed locally):

```json
{"mcpServers":{"figcraft":{"command":"npx","args":["-y","supergateway@4.2.4","--streamableHttp","http://127.0.0.1:8000/mcp","--oauth2Bearer","YOUR_KEY"]}}}
```

Claude.ai cloud connectors require reachable HTTPS and compatible authentication; this deployment targets local clients.

## Validation

Export MCP_API_KEY in your shell and run `python3 scripts/smoke.py http://127.0.0.1:8000/mcp`. Then ask Claude to inspect the active document without editing. Test edits on a disposable document. Do not expose the gateway beyond loopback until the authentication smoke test passes.

## Security and maintenance

The MCP key grants powerful editing and file operations. Attached mode inherits the desktop app's own file access, including mounted /storage; the sidecar's read-only root does not sandbox the desktop. Restrict desktop mounts and configure automation roots if supported. Never expose the unauthenticated control port. Use a single trusted operator; concurrent clients may act on the same document. Do not commit credentials. Rebuild both images together when upgrading FigCraft; run headless CI and an attached smoke test. No automatic upgrades.

Upstream: https://github.com/storytold/figcraft/blob/main/docs/mcp.md ; https://github.com/junkerderprovinz/artcraft-apps ; https://github.com/supercorp-ai/supergateway .
