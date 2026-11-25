FROM node:22-bookworm-slim AS widget-builder

WORKDIR /build/widget

ARG WIDGET_FRONTEND_URL=http://localhost:3001
ENV VITE_FRONTEND_URL=${WIDGET_FRONTEND_URL}

COPY widget/package.json widget/package-lock.json ./
RUN npm ci

COPY widget/ ./
RUN npm run build


FROM node:22-bookworm-slim AS backend-dependencies

WORKDIR /build/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force


FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3000

RUN apt-get update \
    && apt-get install --no-install-recommends -y \
        ca-certificates \
        ghostscript \
        graphicsmagick \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# shared/ vit à la racine du dépôt et le backend l'atteint par ../../../shared :
# l'appli doit donc rester dans un sous-dossier, avec shared/ à côté d'elle.
COPY --chown=node:node backend/ ./backend/
COPY --chown=node:node shared/ ./shared/
COPY --from=backend-dependencies --chown=node:node /build/backend/node_modules ./backend/node_modules
COPY --from=widget-builder --chown=node:node /build/widget/dist/ ./backend/public/

USER node

WORKDIR /app/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://127.0.0.1:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]

CMD ["node", "src/server.js"]
