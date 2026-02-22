FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG ASTRO_DB_REMOTE_URL
ARG ASTRO_DB_APP_TOKEN
ENV ASTRO_DB_REMOTE_URL=${ASTRO_DB_REMOTE_URL}
ENV ASTRO_DB_APP_TOKEN=${ASTRO_DB_APP_TOKEN}

RUN bun run build

FROM oven/bun:1-slim AS runner
WORKDIR /app

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs appuser

COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/package.json ./

ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

USER appuser

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
