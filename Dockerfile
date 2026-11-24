ARG FIGCRAFT_IMAGE=junkerderprovinz/figcraft:latest
FROM node:22-bookworm-slim AS gateway
ARG SUPERGATEWAY_VERSION=4.2.4
RUN npm install --global supergateway@${SUPERGATEWAY_VERSION}
FROM ${FIGCRAFT_IMAGE}
USER root
ARG UPSTREAM_DIGEST
ARG SOURCE_REVISION
LABEL org.opencontainers.image.source="https://github.com/the-braincell/figcraft-docker" \
      org.opencontainers.image.revision="${SOURCE_REVISION}" \
      io.figcraft.upstream.digest="${UPSTREAM_DIGEST}"
COPY --from=gateway /usr/local/bin/node /usr/local/bin/node
COPY --from=gateway /usr/local/lib/node_modules/supergateway /opt/supergateway
COPY rootfs/ /
RUN chmod 755 /defaults/autostart /etc/s6-overlay/s6-rc.d/svc-figcraft-mcp/run && command -v figcraft-cli && node --version
EXPOSE 8000
