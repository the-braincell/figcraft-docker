# Development handoff

Goal: a Portainer-friendly FigCraft MCP gateway for the existing junkerderprovinz/figcraft Selkies desktop, plus standalone headless mode.

- Verify upstream CLI flags, image tag, binary paths, Supergateway authentication and health endpoint against pinned versions before declaring production readiness.
- Run headless CI, including rejection of unauthenticated requests, MCP initialization and tools/list.
- Test live attached mode on a disposable document in a real desktop container.
- Keep internal control port private, use least privilege, avoid Docker socket mounts and never commit secrets.
- Add GHCR publishing only after the smoke test passes; use versioned releases and eventually test ARM64.
- Prefer pull requests for subsequent changes. Document actual validation results and limitations.
