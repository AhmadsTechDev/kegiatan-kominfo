import { defineConfig } from "prisma/config";

// Pengaturan Prisma CLI: lokasi skema, folder migrasi, perintah seed, dan alamat basis data
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed.ts",
  },
  datasource: {
    // Boleh kosong saat `prisma generate` (misalnya ketika build image Docker)
    url: process.env.DATABASE_URL ?? "",
  },
});
