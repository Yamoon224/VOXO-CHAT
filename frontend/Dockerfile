FROM node:22-bookworm-slim AS dependencies

WORKDIR /workspace/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci


FROM node:22-bookworm-slim AS builder

WORKDIR /workspace/frontend

COPY --from=dependencies /workspace/frontend/node_modules ./node_modules
COPY frontend/ ./
COPY shared/ /workspace/shared/

ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api
ARG NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001
ARG APP_BASE_PATH=

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_FRONTEND_URL=${NEXT_PUBLIC_FRONTEND_URL} \
    APP_BASE_PATH=${APP_BASE_PATH} \
    NEXT_TELEMETRY_DISABLED=1

RUN mkdir -p public && npm run build


FROM node:22-bookworm-slim AS runtime

ARG APP_BASE_PATH=

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    APP_BASE_PATH=${APP_BASE_PATH}

WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /workspace/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /workspace/frontend/public ./frontend/public
COPY --from=builder --chown=nextjs:nodejs /workspace/frontend/.next/static ./frontend/.next/static

USER nextjs

WORKDIR /app/frontend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "const path = (process.env.APP_BASE_PATH || '') + '/'; require('http').get('http://127.0.0.1:3000' + path, (res) => process.exit(res.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"]

CMD ["node", "server.js"]
