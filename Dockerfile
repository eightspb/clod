FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG ASTRO_DB_REMOTE_URL
ARG ASTRO_DB_APP_TOKEN

RUN echo "ASTRO_DB_REMOTE_URL=${ASTRO_DB_REMOTE_URL}" >> .env \
 && echo "ASTRO_DB_APP_TOKEN=${ASTRO_DB_APP_TOKEN}" >> .env

RUN bun run astro build --remote

FROM oven/bun:1-slim AS runner
WORKDIR /app

RUN apt-get update && \
    apt-get install --yes --no-install-recommends unzip sqlite3 && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /data && \
    groupadd --system app && \
    useradd --system --gid app --home /app app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
RUN bun install --frozen-lockfile --omit=dev
COPY scripts ./scripts
COPY src/lib ./src/lib
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN test -x /usr/bin/unzip && \
    node -e "import('/app/scripts/import-clinic-history.mjs').then(() => process.exit(0)).catch(() => process.exit(1))"

RUN chmod +x /app/docker-entrypoint.sh && \
    chown -R app:app /app /data

USER app

ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:4321/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
