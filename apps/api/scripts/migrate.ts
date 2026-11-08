/**
 * Menerapkan migrasi SQL di folder drizzle/. Dijalankan saat aplikasi start: bun run db:migrate
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL wajib diisi");

const client = new Client({ connectionString: url });
await client.connect();
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
console.log("Migrasi basis data selesai");
await client.end();
