/**
 * Menerapkan migrasi SQL di folder drizzle/. Dijalankan saat aplikasi start: bun run db:migrate
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error("DATABASE_URL wajib diisi");
const url = rawUrl.replace(/(\.pooler\.supabase\.com):6543\b/, "$1:5432");

const client = new Client({ connectionString: url });
await client.connect();
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
console.log("Migrasi basis data selesai");
await client.end();
