# syntax=docker/dockerfile:1

# Builds the API, the typed client and the MCP server, then drops dev
# dependencies. The developer console is not part of the image.
FROM node:24-bookworm-slim AS build
WORKDIR /repo
COPY . .
# Lifecycle scripts are skipped: the packages are built explicitly below.
RUN npm ci --ignore-scripts --no-audit --no-fund \
  && npm run build --workspace @direktamt/integrations-contracts \
  && npm run build --workspace @direktamt/integrations-client \
  && npm run build --workspace @direktamt/integrations-api \
  && npm run build --workspace @direktamt/integrations-mcp \
  && npm prune --omit=dev --ignore-scripts --no-audit --no-fund \
  && rm -rf apps/ui

# Runtime tree with the built API (apps/api/dist/Main.js) and the built
# stdio MCP server (packages/mcp/dist/Main.js).
FROM node:24-bookworm-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build --chown=node:node /repo /repo
USER node

# The integrations API on port 3000.
FROM runtime AS api
EXPOSE 3000
CMD ["node", "apps/api/dist/Main.js"]
