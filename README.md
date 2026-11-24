# FigCraft Docker

One container, one native FigCraft desktop, two interfaces: Selkies browser desktop and authenticated Streamable HTTP MCP. The AI edits the same live document as the human. No sidecar or headless engine.

**Experimental:** integrated runtime and browser-visible edits are not yet verified. CI checks the control listener, authenticated MCP initialization/tools/list and HTTPS desktop endpoint.

## Deploy

Copy .env.example to .env; set strong unique WEB_PASSWORD and MCP_API_KEY (e.g. openssl rand -hex 32). Match PUID/PGID and point CONFIG_DIR and STORAGE_DIR at your existing mounts. Back them up and stop your old container before starting the replacement; do not share the same config between running instances.

```sh
docker compose up -d --build
```

Default bindings are loopback on the Docker host. Use an SSH tunnel for both interfaces or configure a trusted VPN/reverse proxy with TLS. To bind to a particular LAN/VPN address, set WEB_BIND and MCP_BIND explicitly. Do not send passwords or bearer tokens over untrusted plaintext HTTP.

- Browser: https://127.0.0.1:3001 (desktop username and password; upstream self-signed TLS by default).
- MCP: http://127.0.0.1:8000/mcp (Authorization: Bearer YOUR_KEY).
- Control: 127.0.0.1:7979 inside the container only; never publish it.

Example tunnel: ssh -L 3001:127.0.0.1:3001 -L 8000:127.0.0.1:8000 user@docker-host

Claude Code:

```sh
claude mcp add --transport http figcraft http://127.0.0.1:8000/mcp --header 'Authorization: Bearer YOUR_KEY'
```

Claude Desktop local configuration:

```json
{"mcpServers":{"figcraft":{"command":"npx","args":["-y","supergateway@4.2.4","--streamableHttp","http://127.0.0.1:8000/mcp","--oauth2Bearer","YOUR_KEY"]}}}
```

The upstream s6 init remains intact. Its init-craft copies our modified autostart to the desktop config on startup. The app starts with --control 7979 and automation file roots /storage; s6 runs Supergateway as abc. Every MCP session attaches to the existing app, not a new document engine. A gateway restart does not restart the desktop. The health check verifies both listeners, not actual edits.

## Acceptance test

Export MCP_API_KEY locally and run python3 scripts/smoke.py. Open the browser and create a disposable design. Ask Claude to inspect the active document, add a named rectangle, then confirm it appears in the browser. Edit it manually and ask Claude to inspect it again. Save to /storage and verify persistence after restart. Do not blindly retry an edit after a timeout.

## Security

Single trusted operator; both interfaces can alter the active document. Automation roots restrict file operations but are not a complete sandbox. Keep secrets out of git, restrict mounts, never publish the control socket, and verify both authentication mechanisms before enabling remote access. Claude.ai cloud connectors are not covered by this LAN deployment.

Upstream: https://github.com/junkerderprovinz/artcraft-apps ; https://github.com/storytold/figcraft/blob/v0.18.1/docs/mcp.md ; https://github.com/supercorp-ai/supergateway .

## Base image updates

The default base is `junkerderprovinz/figcraft:latest`. Rebuild with `docker compose build --pull` followed by `docker compose up -d`. Back up persistent data first and rerun the acceptance test. Set FIGCRAFT_IMAGE to a known-good digest for rollback or reproducibility. Upstream changes may affect CLI availability or startup integration.
