# Image backend (Bun + Elysia + Drizzle). Dibangun dari folder apps/api/ (lihat docker-compose.yml di root).
# Basis Debian (glibc) agar biner sharp prebuilt langsung dipakai tanpa kompilasi.

FROM oven/bun:1.4 AS dasar
WORKDIR /app

FROM dasar AS dependensi
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

FROM dasar AS rilis
ENV NODE_ENV=production \
    PORT=3001 \
    STORAGE_DIR=/data/storage \
    TZ=Asia/Jakarta
COPY --from=dependensi /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY src ./src
COPY assets ./assets
RUN mkdir -p /data/storage && chown -R bun:bun /data/storage
USER bun
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD bun -e "fetch('http://localhost:' + (process.env.PORT || 3001) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
# Migrasi basis data, hak akses DB, seed data awal, lalu menyalakan server
CMD ["bun", "run", "start"]
