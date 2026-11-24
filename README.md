# FigCraft Docker

One container, one native FigCraft desktop, two interfaces: Selkies browser desktop and authenticated Streamable HTTP MCP. The AI edits the same live document as the human. No sidecar or headless engine.

**Experimental:** integrated runtime and browser-visible edits are not yet verified. CI checks the control listener, authenticated MCP initialization/tools/list and HTTPS desktop endpoint.

## Deploy

Authenticate to GHCR with a classic PAT with read:packages if the package is private. Copy .env.example to .env; set a strong unique MCP_API_KEY (e.g. openssl rand -hex 32). Match PUID/PGID and point CONFIG_DIR and STORAGE_DIR at your existing mounts. Back them up and stop your old container before starting the replacement; do not share the same config between running instances.

```sh
docker compose pull
docker compose up -d
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

The desktop is unauthenticated by default for trusted internal deployments. Compose explicitly sets PASSWORD to an empty string and SELKIES_ENABLE_BASIC_AUTH=false. The image removes Basic Auth directives from the upstream Nginx template. Remove old authentication overrides from your Portainer stack and recreate the container, not just restart it. To disable direct host access, remove the browser port mapping; the desktop continues running for MCP. Other containers on the same Docker network may still reach it. If authentication is needed later, use an authenticated reverse proxy; the bundled Nginx template deliberately omits Basic Auth. MCP bearer authentication remains mandatory. Default timezone is UTC.

## Acceptance test

Export MCP_API_KEY locally and run python3 scripts/smoke.py. Open the browser and create a disposable design. Ask Claude to inspect the active document, add a named rectangle, then confirm it appears in the browser. Edit it manually and ask Claude to inspect it again. Save to /storage and verify persistence after restart. Do not blindly retry an edit after a timeout.

## Security

Single trusted operator; both interfaces can alter the active document. Automation roots restrict file operations but are not a complete sandbox. Keep secrets out of git, restrict mounts, never publish the control socket, and verify MCP authentication before enabling remote access. Claude.ai cloud connectors are not covered by this LAN deployment.

Upstream: https://github.com/junkerderprovinz/artcraft-apps ; https://github.com/storytold/figcraft/blob/v0.18.1/docs/mcp.md ; https://github.com/supercorp-ai/supergateway .

## Base image updates

The default deployment pulls the tested GHCR package. For local development, the default base is `junkerderprovinz/figcraft:latest`. Build explicitly with `docker compose -f compose.yaml -f compose.build.yaml build --pull` followed by `docker compose -f compose.yaml -f compose.build.yaml up -d --no-build`. Back up persistent data first and rerun the acceptance test. Set FIGCRAFT_IMAGE to a known-good digest for rollback or reproducibility. Upstream changes may affect CLI availability or startup integration.

## Automated distribution (GHCR)

The default compose.yaml deploys the packaged GHCR image; compose.build.yaml is an explicit local build override used by CI. compose.portainer.yaml remains supported for existing stacks and requires absolute mount paths. The workflow runs on main pushes, pull requests, manual dispatch and every six hours. Scheduled runs compare the upstream digest and source revision against the last successful GHCR image. Changed builds use the exact resolved upstream digest; the same local candidate is tested and published without rebuilding. Publication is restricted to main, and failures leave the previous latest tag untouched. CI additionally checks that an MCP-created rectangle exists in the live desktop control API; browser pixel-level verification remains manual.

Images: `ghcr.io/the-braincell/figcraft-docker:latest` and unique `build-RUN_ID-ATTEMPT` tags. Linux amd64 initially. For strict rollback pin the registry manifest digest. Packages are private unless the organization changes visibility; configure registry access in Portainer with a GitHub classic PAT with read:packages and any required organization SSO authorization. GitHub Actions uses its own GITHUB_TOKEN with packages:write, subject to org policy.

In Portainer add the GHCR registry, then create a stack from compose.portainer.yaml (paste the file or use Git deployment). Set absolute CONFIG_DIR and STORAGE_DIR to your existing host paths; set MCP_API_KEY and desired WEB_BIND/MCP_BIND. Stop the old container before deployment. Do not deploy until the first successful publication. Pull and redeploy manually after backups; the scheduled workflow updates the registry, not your running desktop, so unsaved work is not interrupted. Use FIGCRAFT_MCP_IMAGE to select a prior build or digest if rollback is needed.

## File transfers

Port 8100 serves both /mcp and /api/files using the existing MCP bearer key. All file tool and API paths are relative to /storage, e.g. assets/logo.png. Native FigCraft tools use the resulting absolute /storage/assets/logo.png path. Selkies uploads/downloads also target /storage.

Set FILE_PUBLIC_URL to a browser-reachable origin, e.g. http://figcraft.example.com:8100 (or your HTTPS reverse proxy origin), to enable temporary links. Ordinary API calls do not require it. FILE_MAX_BYTES defaults to 268435456 (256 MiB). Inline MCP uploads are limited to 1 MiB decoded. The service runs as abc (configured PUID/PGID); startup checks writability and, if necessary, repairs ownership and owner permissions on the storage root only. Existing files and subdirectories are never recursively changed. Writable mounts retain their existing ownership. If repair fails (e.g. read-only bind mount, SMB/NFS root squashing or ACLs), startup logs a warning and continues; fix permissions on the host. Recreate after changing environment variables.

### HTTP API

```sh
export FIGCRAFT_URL=http://figcraft.example.com:8100
# Set MCP_API_KEY securely in your shell.
curl --fail-with-body -H "Authorization: Bearer $MCP_API_KEY" \
  --upload-file logo.png "$FIGCRAFT_URL/api/files/assets/logo.png"
curl --fail-with-body -H "Authorization: Bearer $MCP_API_KEY" \
  "$FIGCRAFT_URL/api/files?path=assets"
curl --fail-with-body -H "Authorization: Bearer $MCP_API_KEY" \
  "$FIGCRAFT_URL/api/files/assets/logo.png" -o logo.png
curl --fail-with-body -I -H "Authorization: Bearer $MCP_API_KEY" \
  "$FIGCRAFT_URL/api/files/assets/logo.png"
```

PUT sends raw binary bytes, not multipart; returns path, byte count and SHA-256. Append ?overwrite=true only to intentionally replace a file. GET downloads; HEAD gives length; GET /api/files lists a directory (optional path query); DELETE requires ?confirm=true. URL-encode special characters in each path segment. Uploads create parent directories and stage files before atomic publication. Default no overwrite returns 409 on conflict.

### MCP tools

| Tool | Arguments |
| --- | --- |
| upload_text | path, content, overwrite=false |
| upload_file | path, content_base64, overwrite=false |
| get_upload_url | path, overwrite=false |
| get_download_url | path |
| list_files | path="" |
| get_file_info | path |
| create_directory | path |
| move_file | path, destination |
| delete_file | path, confirm=true (after user approval) |

### Claude Desktop and Hermes

Keep the existing MCP configuration; no new client installation is needed. In Claude Desktop, ask for a temporary upload URL for assets/logo.png. Open it in your browser, choose the local file, and upload. Tell Claude when complete; it can then import /storage/assets/logo.png into the live desktop. Claude can generate SVG/text directly using upload_text. Paperclip attachments do not automatically forward their original binary bytes to this service. Ask for a download link to retrieve an exported file. Hermes can additionally perform the binary curl upload directly when its terminal can access the source file.

Temporary URLs are HMAC-signed bearer capabilities scoped to one file and operation, valid for 15 minutes, reusable until expiry. No-overwrite prevents a second successful upload by default. They contain no master key, but anyone holding a link can use it; avoid sharing or logging links. Rotating the MCP key revokes all links. Upload links serve a simple browser form and accept raw PUT; download links accept GET/HEAD.

### Security and troubleshooting

- 401: use the MCP bearer key rather than GHCR credentials.
- 403 on a temporary URL: invalid or expired; obtain a fresh link.
- URL tool error: configure FILE_PUBLIC_URL with scheme, host and optional port, no path.
- 409: choose a different filename or explicitly authorize overwrite.
- 413: use binary HTTP for large files or adjust FILE_MAX_BYTES.
- 403 on storage operations: check `docker logs figcraft` for `[init-figcraft-storage]` warnings, mount ownership, ACLs and PUID/PGID. Existing nested directories may need separate permission fixes.
- Missing MCP tools: reconnect the client after redeploying the new image.

File paths reject absolute paths, traversal and symlink traversal using Linux directory descriptors. Only regular files are served. The shared storage mount is trusted, not an isolation boundary against hostile local users or processes concurrently moving directories. Use HTTPS or a trusted VPN. Native Supergateway is now internal-only on 127.0.0.1:8101; the HTTP front end proxies /mcp and /healthz. Never publish 8101 or 7979. The unauthenticated Selkies web UI must remain on a trusted network.
