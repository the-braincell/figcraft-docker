# Development requirements

Single integrated container is the product. Preserve upstream Selkies/s6 init, launch exactly one FigCraft desktop with loopback control enabled, and attach all MCP sessions to it. Do not reintroduce a headless or sidecar default.

Validate pinned image and CLI, gateway authentication, browser authentication, control readiness and MCP tool enumeration. Then test browser-visible edits in both directions and persistence. CI must not claim live visual tests until they actually run. Preserve existing config/storage mounts and GPU options. Publish versioned GHCR images after validation. Never expose the internal control port or commit secrets.

The user runs junkerderprovinz/figcraft:latest; retain this as the default base, with an optional digest override. Validate the actual pulled image in CI.
