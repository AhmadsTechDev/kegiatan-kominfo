import { mock } from "bun:test";
import { Client } from "pg";
import { penyimpananPalsu } from "./penyimpanan-palsu";
import { kirimEmailPalsu } from "./surel-palsu";

const url = process.env.DATABASE_URL ?? "";
const namaDb = decodeURIComponent(new URL(url).pathname.slice(1));
if (!namaDb.endsWith("_test")) {
  throw new Error(`Uji dibatalkan: DATABASE_URL harus basis data khusus uji (berakhiran _test), bukan "${namaDb}". Periksa .env.test`);
}

function jalankan(perintah: string[]) {
  const hasil = Bun.spawnSync([process.execPath, ...perintah], { env: process.env, stdout: "pipe", stderr: "pipe" });
  if (hasil.exitCode !== 0) throw new Error(`Gagal: bun ${perintah.join(" ")}\n${hasil.stdout}\n${hasil.stderr}`);
}

async function kosongkanBasisData() {
  const db = new Client({ connectionString: url });
  await db.connect();
  await db.query("DROP SCHEMA IF EXISTS public CASCADE");
  await db.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
  await db.query("CREATE SCHEMA public");
  await db.end();
}

mock.module("@/lib/mailer", () => ({ kirimEmail: kirimEmailPalsu }));
mock.module("@/lib/storage", () => ({ storage: penyimpananPalsu }));

await kosongkanBasisData();
jalankan(["src/db/migrate.ts"]);
jalankan(["scripts/seed.ts"]);
