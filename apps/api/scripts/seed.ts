import { eq } from "drizzle-orm";
import { bidang, jenisKegiatan, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db, pool } from "@/db";

const DATA_UNIT: { kode: string; nama: string; induk?: string }[] = [
  { kode: "SEKRETARIAT", nama: "Sekretariat" },
  { kode: "SUBBAG-UMPEG", nama: "Sub Bagian Umum dan Kepegawaian", induk: "SEKRETARIAT" },
  { kode: "SUBBAG-KEU", nama: "Sub Bagian Keuangan", induk: "SEKRETARIAT" },
  { kode: "SUBBAG-RENLAP", nama: "Sub Bagian Perencanaan dan Pelaporan", induk: "SEKRETARIAT" },
  { kode: "BID-OPINI", nama: "Bidang Pengelolaan Opini dan Pelayanan Informasi Publik" },
  { kode: "BID-KOMPUB", nama: "Bidang Pengelolaan Komunikasi Publik" },
  { kode: "BID-TIP", nama: "Bidang Teknologi Informasi dan Persandian" },
  { kode: "SEKSI-DATA", nama: "Seksi Pengelolaan Data dan Statistik", induk: "BID-TIP" },
  { kode: "SEKSI-SANDI", nama: "Seksi Persandian dan Keamanan Informasi", induk: "BID-TIP" },
  { kode: "BID-EGOV", nama: "Bidang Pengelolaan E-Government" },
  { kode: "KJF", nama: "Kelompok Jabatan Fungsional" },
];

const DATA_JENIS_KEGIATAN = ["Rapat", "Sosialisasi", "Liputan", "Bimtek", "Pemeliharaan"];

async function bidangDenganKode(kode: string) {
  const [b] = await db.select().from(bidang).where(eq(bidang.kode, kode)).limit(1);
  return b;
}

async function seedBidang() {
  for (const unit of [...DATA_UNIT].sort((a, b) => Number(!!a.induk) - Number(!!b.induk))) {
    if (await bidangDenganKode(unit.kode)) continue;
    const induk = unit.induk ? await bidangDenganKode(unit.induk) : undefined;
    await db.insert(bidang).values({ kode: unit.kode, nama: unit.nama, parentId: induk?.id ?? null });
  }
}

async function seedJenisKegiatan() {
  await db
    .insert(jenisKegiatan)
    .values(DATA_JENIS_KEGIATAN.map((nama) => ({ nama })))
    .onConflictDoNothing();
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("Lewati akun admin: SEED_ADMIN_EMAIL atau SEED_ADMIN_PASSWORD belum diisi");
    return;
  }
  const [ada] = await db.select({ id: user.id }).from(user).where(eq(user.email, email.toLowerCase())).limit(1);
  if (ada) {
    console.log(`Akun admin ${email} sudah ada`);
    return;
  }
  const hasil = await auth.api.createUser({ body: { email, password, name: "Administrator", role: "ADMIN" } });

  await db.update(user).set({ emailVerified: true }).where(eq(user.id, hasil.user.id));
  console.log(`Akun admin ${email} dibuat`);
}

await seedBidang();
await seedJenisKegiatan();
console.log(`Bidang: ${DATA_UNIT.length}, jenis kegiatan: ${DATA_JENIS_KEGIATAN.length}`);
await seedAdmin();
await pool.end();
process.exit(0);
