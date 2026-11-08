/**
 * Menerapkan migrasi SQL di folder drizzle/. Dijalankan saat aplikasi start: bun run db:migrate
 *
 * Masa transisi dari Prisma: basis data lama mencatat riwayatnya di _prisma_migrations, sedangkan Drizzle memakai
 * drizzle.__drizzle_migrations. Bila riwayat Drizzle masih kosong, migrasi yang sudah pernah diterapkan Prisma
 * dicatat lebih dulu supaya tidak dijalankan dua kali. Migrasi yang belum diterapkan tetap berjalan seperti biasa.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL wajib diisi");

const FOLDER = "./drizzle";
type EntriJurnal = { tag: string; when: number };

const client = new Client({ connectionString: url });
await client.connect();

/**
 * Menyalin riwayat Prisma ke riwayat Drizzle; hanya berjalan sekali, yaitu saat riwayat Drizzle masih kosong
 */
async function alihkanRiwayatPrisma() {
  await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
  await client.query("CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)");
  const { rows: tercatat } = await client.query("SELECT 1 FROM drizzle.__drizzle_migrations LIMIT 1");
  const { rows: lama } = await client.query("SELECT to_regclass('public._prisma_migrations') AS tabel");
  if (tercatat.length || !lama[0].tabel) return;

  const { rows } = await client.query<{ migration_name: string }>("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL");
  const sudah = new Set(rows.map((r) => r.migration_name));
  const { entries } = JSON.parse(readFileSync(`${FOLDER}/meta/_journal.json`, "utf8")) as { entries: EntriJurnal[] };
  let jumlah = 0;
  for (const e of entries) {
    /**
     * Nama folder Prisma "7_hapus_jabatan_pegawai" sama dengan tag Drizzle "0007_hapus_jabatan_pegawai" tanpa nol di depan
     */
    if (!sudah.has(e.tag.replace(/^0+(?=\d)/, ""))) continue;
    const hash = createHash("sha256").update(readFileSync(`${FOLDER}/${e.tag}.sql`, "utf8")).digest("hex");
    await client.query("INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)", [hash, e.when]);
    jumlah++;
  }
  console.log(`Riwayat migrasi Prisma dialihkan: ${jumlah} migrasi`);
}

await alihkanRiwayatPrisma();
await migrate(drizzle(client), { migrationsFolder: FOLDER });
console.log("Migrasi basis data selesai");
await client.end();
