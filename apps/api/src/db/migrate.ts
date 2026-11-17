import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { databaseConfig } from "@/config/database";

const url = databaseConfig.url.replace(/(\.pooler\.supabase\.com):6543\b/, "$1:5432");

const client = new Client({ connectionString: url });
await client.connect();
await migrate(drizzle(client), { migrationsFolder: "./src/db/migrations" });
console.log("Migrasi basis data selesai");
await client.end();

