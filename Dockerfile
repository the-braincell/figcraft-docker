ARG FIGCRAFT_IMAGE=junkerderprovinz/figcraft:0.18.1
FROM node:22-bookworm-slim AS gateway
ARG SUPERGATEWAY_VERSION=4.2.4
RUN npm install --global supergateway@${SUPERGATEWAY_VERSION}
FROM ${FIGCRAFT_IMAGE}
USER root
COPY --from=gateway /usr/local/bin/node /usr/local/bin/node
COPY --from=gateway /usr/local/lib/node_modules/supergateway /opt/supergateway
COPY scripts/start.sh /usr/local/bin/start-mcp
RUN chmod 755 /usr/local/bin/start-mcp && command -v figcraft-cli && figcraft-cli --version && node --version
ENTRYPOINT ["/usr/local/bin/start-mcp"]
CMD []
