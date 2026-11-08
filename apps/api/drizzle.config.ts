import { defineConfig } from "drizzle-kit";

// Pengaturan Drizzle Kit: lokasi skema, folder migrasi, dan alamat basis data
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
