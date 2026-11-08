/**
 * Mengisi data awal: unit sesuai bagan struktur organisasi Diskominfo, jenis kegiatan, dan akun admin pertama.
 * Kepala Dinas tidak dibuat sebagai unit; perannya dijalankan akun ber-role PIMPINAN.
 * Aman dijalankan berulang kali; data yang sudah ada dilewati. Jalankan: bun run db:seed
 */
import { eq } from "drizzle-orm";
import { bidang, jenisKegiatan, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db, pool } from "@/lib/db";

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

/**
 * Mencari satu bidang berdasarkan kode
 */
async function bidangDenganKode(kode: string) {
  const [b] = await db.select().from(bidang).where(eq(bidang.kode, kode)).limit(1);
  return b;
}

/**
 * Membuat bidang bawaan (unit tanpa induk dibuat lebih dulu)
 */
async function seedBidang() {
  /**
   * Diurutkan agar unit tanpa induk (nilai 0) dibuat lebih dulu daripada sub unit (nilai 1),
   * karena sub unit butuh id induknya. `!!x` mengubah nilai apa pun menjadi true/false.
   */
  for (const unit of [...DATA_UNIT].sort((a, b) => Number(!!a.induk) - Number(!!b.induk))) {
    if (await bidangDenganKode(unit.kode)) continue;
    const induk = unit.induk ? await bidangDenganKode(unit.induk) : undefined;
    await db.insert(bidang).values({ kode: unit.kode, nama: unit.nama, parentId: induk?.id ?? null });
  }
}

/**
 * Membuat jenis kegiatan bawaan
 */
async function seedJenisKegiatan() {
  /**
   * onConflictDoNothing: jenis yang sudah ada dilewati, jadi seed aman dijalankan berulang kali.
   */
  await db
    .insert(jenisKegiatan)
    .values(DATA_JENIS_KEGIATAN.map((nama) => ({ nama })))
    .onConflictDoNothing();
}

/**
 * Membuat akun admin pertama dari SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD
 */
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

  /**
   * Admin pertama tidak melewati tautan aktivasi; email-nya ditetapkan sendiri oleh pengelola server lewat .env,
   * jadi dianggap terverifikasi agar tidak tampil "Belum terverifikasi" di Pengaturan
   */
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, hasil.user.id));
  console.log(`Akun admin ${email} dibuat`);
}

await seedBidang();
await seedJenisKegiatan();
console.log(`Bidang: ${DATA_UNIT.length}, jenis kegiatan: ${DATA_JENIS_KEGIATAN.length}`);
await seedAdmin();
await pool.end();
process.exit(0);
