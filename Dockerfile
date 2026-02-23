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

RUN mkdir -p /data

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
RUN bun install --frozen-lockfile --omit=dev
COPY scripts ./scripts
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x /app/docker-entrypoint.sh

ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

EXPOSE 4321

ENTRYPOINT ["/app/docker-entrypoint.sh"]
