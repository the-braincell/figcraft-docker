# FigCraft Docker

One container, one native FigCraft desktop, two interfaces: Selkies browser desktop and authenticated Streamable HTTP MCP. The AI edits the same live document as the human. No sidecar or headless engine.

**Experimental:** integrated runtime and browser-visible edits are not yet verified. CI checks the control listener, authenticated MCP initialization/tools/list and HTTPS desktop endpoint.

## Deploy

Copy .env.example to .env; set a strong unique MCP_API_KEY (e.g. openssl rand -hex 32). Match PUID/PGID and point CONFIG_DIR and STORAGE_DIR at your existing mounts. Back them up and stop your old container before starting the replacement; do not share the same config between running instances.

```sh
docker compose up -d --build
```

Both published ports bind to all IPv4 interfaces (0.0.0.0) by default for trusted internal networks. Restrict access with firewall rules or override WEB_BIND and MCP_BIND with a specific LAN/VPN address or 127.0.0.1. Use TLS or a trusted VPN for remote access. The browser is unauthenticated by default; do not expose it to untrusted networks. Do not send bearer tokens over untrusted plaintext HTTP.

- Browser: https://127.0.0.1:3001 (no login by default; upstream self-signed TLS by default).
- MCP: http://127.0.0.1:8100/mcp (Authorization: Bearer YOUR_KEY).
- Control: 127.0.0.1:7979 inside the container only; never publish it.

Example tunnel: ssh -L 3001:127.0.0.1:3001 -L 8100:127.0.0.1:8100 user@docker-host

Claude Code:

```sh
claude mcp add --transport http figcraft http://127.0.0.1:8100/mcp --header 'Authorization: Bearer YOUR_KEY'
```

Claude Desktop local configuration:

```json
{"mcpServers":{"figcraft":{"command":"npx","args":["-y","supergateway@4.2.4","--streamableHttp","http://127.0.0.1:8100/mcp","--oauth2Bearer","YOUR_KEY"]}}}
```

The upstream s6 init remains intact. Its init-craft copies our modified autostart to the desktop config on startup. The app starts with --control 7979 and automation file roots /storage; s6 runs Supergateway as abc. Every MCP session attaches to the existing app, not a new document engine. A gateway restart does not restart the desktop. The health check verifies both listeners, not actual edits.

## Browser access and timezone

The desktop is unauthenticated by default for trusted internal deployments. Compose does not supply CUSTOM_USER or PASSWORD and sets SELKIES_ENABLE_BASIC_AUTH=false. Remove old authentication overrides from your Portainer stack and recreate the container, not just restart it. To disable direct host access, remove the browser port mapping; the desktop continues running for MCP. Other containers on the same Docker network may still reach it. If authentication is needed later, explicitly configure upstream Nginx CUSTOM_USER and PASSWORD via Compose or use an authenticated reverse proxy. MCP bearer authentication remains mandatory. Default timezone is UTC.

## Acceptance test

Export MCP_API_KEY locally and run python3 scripts/smoke.py. Open the browser and create a disposable design. Ask Claude to inspect the active document, add a named rectangle, then confirm it appears in the browser. Edit it manually and ask Claude to inspect it again. Save to /storage and verify persistence after restart. Do not blindly retry an edit after a timeout.

## Security

Single trusted operator; both interfaces can alter the active document. Automation roots restrict file operations but are not a complete sandbox. Keep secrets out of git, restrict mounts, never publish the control socket, and verify MCP authentication before enabling remote access. Claude.ai cloud connectors are not covered by this LAN deployment.

Upstream: https://github.com/junkerderprovinz/artcraft-apps ; https://github.com/storytold/figcraft/blob/v0.18.1/docs/mcp.md ; https://github.com/supercorp-ai/supergateway .

## Base image updates

The default base is `junkerderprovinz/figcraft:latest`. Rebuild with `docker compose build --pull` followed by `docker compose up -d`. Back up persistent data first and rerun the acceptance test. Set FIGCRAFT_IMAGE to a known-good digest for rollback or reproducibility. Upstream changes may affect CLI availability or startup integration.

## Automated distribution (GHCR)

The workflow runs on main pushes, pull requests, manual dispatch and every six hours. Scheduled runs compare the upstream digest and source revision against the last successful GHCR image. Changed builds use the exact resolved upstream digest; the same local candidate is tested and published without rebuilding. Publication is restricted to main, and failures leave the previous latest tag untouched. CI additionally checks that an MCP-created rectangle exists in the live desktop control API; browser pixel-level verification remains manual.

Images: `ghcr.io/the-braincell/figcraft-docker:latest` and unique `build-RUN_ID-ATTEMPT` tags. Linux amd64 initially. For strict rollback pin the registry manifest digest. Packages are private unless the organization changes visibility; configure registry access in Portainer with a GitHub classic PAT with read:packages and any required organization SSO authorization. GitHub Actions uses its own GITHUB_TOKEN with packages:write, subject to org policy.

In Portainer add the GHCR registry, then create a stack from compose.portainer.yaml (paste the file or use Git deployment). Set absolute CONFIG_DIR and STORAGE_DIR to your existing host paths; set MCP_API_KEY and desired WEB_BIND/MCP_BIND. Stop the old container before deployment. Do not deploy until the first successful publication. Pull and redeploy manually after backups; the scheduled workflow updates the registry, not your running desktop, so unsaved work is not interrupted. Use FIGCRAFT_MCP_IMAGE to select a prior build or digest if rollback is needed.
