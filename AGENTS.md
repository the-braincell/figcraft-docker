# Development requirements

Single integrated container is the product. Preserve upstream Selkies/s6 init, launch exactly one FigCraft desktop with loopback control enabled, and attach all MCP sessions to it. Do not reintroduce a headless or sidecar default.

Validate pinned image and CLI, gateway authentication, default unauthenticated browser access, control readiness and MCP tool enumeration. Then test browser-visible edits in both directions and persistence. CI must not claim live visual tests until they actually run. Preserve existing config/storage mounts and GPU options. Publish versioned GHCR images after validation. Never expose the internal control port or commit secrets.

The user runs junkerderprovinz/figcraft:latest; retain this as the default base, with an optional digest override. Validate the actual pulled image in CI.

User preference: UTC timezone; no browser login by default for internal deployments. Browser authentication is opt-in, and the browser port mapping may be removed without disabling MCP. Keep MCP bearer authentication mandatory.

Default published WEB_BIND and MCP_BIND to 0.0.0.0 for internal deployments; retain configurable overrides. Native control port 7979 must remain loopback-only and unpublished.

Do not supply CUSTOM_USER or PASSWORD in default Compose; explicitly disable native Selkies basic auth. Browser access remains unauthenticated on trusted networks only.

Superseding prior optional web authentication notes: explicitly set PASSWORD empty and strip Basic Auth directives from /defaults/default.conf at build time. Use an authenticated external reverse proxy if needed. Keep MCP authentication intact.

File transfers: public port 8100 serves MCP and authenticated HTTP; Supergateway 8101 and native control 7979 are internal-only. Keep paths confined to /storage, reject traversal/symlinks, default no overwrite, stage uploads atomically, enforce size limits and scoped expiring signed links. Maintain README and CI coverage for binary roundtrips, MCP tools, authentication, signed links and live edits.

Storage startup: after init-craft (configured abc identity), check actual write access as abc. Repair only the storage root when necessary, never recursively alter existing contents, preserve writable mounts, and warn without blocking startup if the host filesystem prevents repair. CI must start with root-owned storage and verify existing file ownership/mode is preserved before upload tests.

Default compose.yaml must deploy the published GHCR image without a build section. Use compose.build.yaml explicitly for local builds and CI; retain compose.portainer.yaml for existing deployments. CI must test and publish the exact locally built candidate, never the previous GHCR image.
