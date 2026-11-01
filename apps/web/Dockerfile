# =============================================================================
# IMAGE FRONTEND (Next.js, output standalone) untuk deploy di VPS dengan docker compose
# =============================================================================
# Dibangun dari folder apps/web/ (lihat docker-compose.yml di root proyek).
# Dependensi dipasang dengan Bun (sesuai bun.lock), sedangkan build dan server memakai Node,
# runtime resmi Next.js. Hasil build "standalone" hanya berisi berkas yang benar-benar dipakai.
# =============================================================================

FROM node:22-bookworm-slim AS dasar
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM dasar AS build
# Biner Bun disalin dari image resminya, hanya untuk memasang dependensi dari bun.lock
COPY --from=oven/bun:1.4 /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# API_URL dibaca next.config.ts saat build (aturan rewrites /api/* ikut dibakukan ke hasil build),
# jadi harus diberikan sebagai build argument, bukan environment saat container berjalan
ARG API_URL=http://backend:3001
ENV API_URL=$API_URL \
    NEXT_OUTPUT=standalone
RUN bun run build

FROM dasar AS rilis
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=Asia/Jakarta
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/login').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]
