FROM oven/bun:1.3.10 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.10 AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --omit=dev

FROM oven/bun:1.3.10 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1.3.10-slim AS runner
LABEL org.opencontainers.image.source="https://github.com/eightspb/clod" \
      org.opencontainers.image.description="Клиника Одинцова: Astro 7 site, admin CRM and booking API"
WORKDIR /app

RUN apt-get update && \
    apt-get install --yes --no-install-recommends unzip sqlite3 && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /data && \
    groupadd --system app && \
    useradd --system --gid app --home /app app

COPY --from=builder /app/dist ./dist
RUN test -f /app/dist/client/pagefind/pagefind-entry.json
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
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

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD bun -e "fetch('http://localhost:4321/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
