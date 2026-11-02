// Dijalankan sekali sebelum semua berkas uji (lihat bunfig.toml):
// 1. Memastikan basis data uji berakhiran _test, lalu mengosongkannya
// 2. Menerapkan migrasi Prisma dan data awal (seed)
// 3. Mengganti pengirim email dengan versi palsu agar tidak ada email sungguhan yang terkirim
import { mock } from "bun:test";
import { rm } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { kirimEmailPalsu } from "./surel-palsu";

const url = process.env.DATABASE_URL ?? "";
const namaDb = decodeURIComponent(new URL(url).pathname.slice(1));
if (!namaDb.endsWith("_test")) {
  throw new Error(`Uji dibatalkan: DATABASE_URL harus basis data khusus uji (berakhiran _test), bukan "${namaDb}". Periksa .env.test`);
}

// Menjalankan perintah dan menghentikan uji bila perintah gagal
function jalankan(perintah: string[]) {
  const hasil = Bun.spawnSync([process.execPath, ...perintah], { env: process.env, stdout: "pipe", stderr: "pipe" });
  if (hasil.exitCode !== 0) throw new Error(`Gagal: bun ${perintah.join(" ")}\n${hasil.stdout}\n${hasil.stderr}`);
}

// Menghapus semua tabel di basis data uji
async function kosongkanBasisData() {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 1 }) });
  await db.$executeRawUnsafe("DROP SCHEMA IF EXISTS public CASCADE");
  await db.$executeRawUnsafe("CREATE SCHEMA public");
  await db.$disconnect();
}

mock.module("@/lib/mailer", () => ({ kirimEmail: kirimEmailPalsu }));

await kosongkanBasisData();
await rm(process.env.STORAGE_DIR ?? "./storage-test", { recursive: true, force: true });
jalankan(["x", "prisma", "migrate", "deploy"]);
jalankan(["prisma/seed.ts"]);
jalankan(["tests/fixture-unit.ts"]);
