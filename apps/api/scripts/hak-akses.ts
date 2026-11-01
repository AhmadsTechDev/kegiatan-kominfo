// Membuat (atau memperbarui) user PostgreSQL khusus aplikasi dengan hak terbatas.
// Hanya berjalan bila APP_DB_USER dan APP_DB_PASSWORD diisi; DATABASE_URL harus user dengan hak DDL.
// audit_log hanya diberi SELECT dan INSERT agar catatan audit tidak bisa diubah/dihapus
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const url = process.env.DATABASE_URL;
const appUser = process.env.APP_DB_USER;
const appPass = process.env.APP_DB_PASSWORD;

// Membungkus nama (role/tabel) dengan tanda kutip ganda agar aman dipakai di SQL
const nama = (teks: string) => `"${teks.replace(/"/g, '""')}"`;

// Membungkus teks dengan tanda kutip tunggal agar aman dipakai di SQL
const teks = (isi: string) => `'${isi.replace(/'/g, "''")}'`;

// Membuat role aplikasi lalu mengatur hak akses tiap tabel/view di schema public
async function aturHakAkses(db: PrismaClient, user: string, sandi: string) {
  const ada = await db.$queryRaw<unknown[]>`SELECT 1 FROM pg_roles WHERE rolname = ${user}`;
  await db.$executeRawUnsafe(`${ada.length ? "ALTER" : "CREATE"} ROLE ${nama(user)} LOGIN PASSWORD ${teks(sandi)}`);
  await db.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${nama(user)}`);
  await db.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${nama(user)}`);

  const objek = await db.$queryRaw<{ nama: string; jenis: string }[]>`
    SELECT table_name AS nama, table_type AS jenis FROM information_schema.tables WHERE table_schema = 'public'`;
  for (const o of objek) {
    const tabel = nama(o.nama);
    await db.$executeRawUnsafe(`REVOKE ALL PRIVILEGES ON ${tabel} FROM ${nama(user)}`);
    if (o.jenis === "VIEW") await db.$executeRawUnsafe(`GRANT SELECT ON ${tabel} TO ${nama(user)}`);
    else if (o.nama === "audit_log") await db.$executeRawUnsafe(`GRANT SELECT, INSERT ON ${tabel} TO ${nama(user)}`);
    else await db.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${tabel} TO ${nama(user)}`);
  }
  console.log(`Hak akses ${user} diatur untuk ${objek.length} tabel/view (audit_log: SELECT, INSERT).`);
}

if (!appUser) {
  console.log("Lewati pengaturan hak akses: APP_DB_USER kosong");
} else {
  if (!url) throw new Error("DATABASE_URL (user dengan hak DDL) wajib diisi");
  if (!appPass) throw new Error("APP_DB_PASSWORD wajib diisi bersama APP_DB_USER");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 1 }) });
  await aturHakAkses(db, appUser, appPass);
  await db.$disconnect();
}
