// Mengisi data awal: jenis unit, unit kerja Diskominfo, jenis kegiatan, dan akun admin pertama.
// Sekretariat dan sub bidang sengaja tidak dibuat; admin menambahkannya sendiri di Master data (jenis unitnya sudah tersedia).
// Aman dijalankan berulang kali; data yang sudah ada dilewati. Jalankan: bun run db:seed
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DATA_JENIS_UNIT: { nama: string; induk?: string }[] = [
  { nama: "Sekretariat" },
  { nama: "Bidang" },
  { nama: "Kelompok fungsional" },
  { nama: "Sub bagian", induk: "Sekretariat" },
  { nama: "Sub bidang", induk: "Bidang" },
];

const DATA_UNIT: { kode: string; nama: string; jenis: string; induk?: string }[] = [
  { kode: "BID-OPINI", nama: "Bidang Pengelolaan Opini dan Pelayanan Informasi Publik", jenis: "Bidang" },
  { kode: "BID-KOMPUB", nama: "Bidang Pengelolaan Komunikasi Publik", jenis: "Bidang" },
  { kode: "BID-TIP", nama: "Bidang Teknologi Informasi dan Persandian", jenis: "Bidang" },
  { kode: "BID-EGOV", nama: "Bidang Pengelolaan E-Government", jenis: "Bidang" },
  { kode: "BID-APTIKA", nama: "Bidang Aplikasi Informatika", jenis: "Bidang" },
];

const DATA_JENIS_KEGIATAN = ["Rapat", "Sosialisasi", "Liputan", "Bimtek", "Pemeliharaan"];

// Membuat jenis unit bawaan (induk dulu, baru turunannya)
async function seedJenisUnit() {
  // Jenis "Seksi" dulu bernama begitu; ganti namanya agar basis data lama tidak mendapat jenis ganda
  const lama = await prisma.jenisUnit.findUnique({ where: { nama: "Seksi" } });
  if (lama && !(await prisma.jenisUnit.findUnique({ where: { nama: "Sub bidang" } }))) await prisma.jenisUnit.update({ where: { id: lama.id }, data: { nama: "Sub bidang" } });
  for (const j of DATA_JENIS_UNIT) {
    if (await prisma.jenisUnit.findUnique({ where: { nama: j.nama } })) continue;
    const induk = j.induk ? await prisma.jenisUnit.findUnique({ where: { nama: j.induk } }) : null;
    await prisma.jenisUnit.create({ data: { nama: j.nama, indukJenisId: induk?.id ?? null } });
  }
}

// Membuat unit kerja bawaan (unit tanpa induk dibuat lebih dulu)
async function seedUnitKerja() {
  for (const unit of [...DATA_UNIT].sort((a, b) => Number(!!a.induk) - Number(!!b.induk))) {
    if (await prisma.unitKerja.findUnique({ where: { kode: unit.kode } })) continue;
    const induk = unit.induk ? await prisma.unitKerja.findUnique({ where: { kode: unit.induk } }) : null;
    const jenis = await prisma.jenisUnit.findUnique({ where: { nama: unit.jenis } });
    await prisma.unitKerja.create({ data: { kode: unit.kode, nama: unit.nama, jenisUnitId: jenis!.id, parentId: induk?.id ?? null } });
  }
}

// Membuat jenis kegiatan bawaan
async function seedJenisKegiatan() {
  await prisma.jenisKegiatan.createMany({ data: DATA_JENIS_KEGIATAN.map((nama) => ({ nama })), skipDuplicates: true });
}

// Membuat akun admin pertama dari SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD
async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("Lewati akun admin: SEED_ADMIN_EMAIL atau SEED_ADMIN_PASSWORD belum diisi");
    return;
  }
  if (await prisma.user.findUnique({ where: { email: email.toLowerCase() } })) {
    console.log(`Akun admin ${email} sudah ada`);
    return;
  }
  const { user } = await auth.api.createUser({ body: { email, password, name: "Administrator", role: "ADMIN" } });
  // Admin pertama tidak melewati tautan aktivasi; email-nya ditetapkan sendiri oleh pengelola server lewat .env,
  // jadi dianggap terverifikasi agar tidak tampil "Belum terverifikasi" di Pengaturan
  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  console.log(`Akun admin ${email} dibuat`);
}

await seedJenisUnit();
await seedUnitKerja();
await seedJenisKegiatan();
console.log(`Unit kerja: ${DATA_UNIT.length}, jenis kegiatan: ${DATA_JENIS_KEGIATAN.length}`);
await seedAdmin();
await prisma.$disconnect();
process.exit(0);
