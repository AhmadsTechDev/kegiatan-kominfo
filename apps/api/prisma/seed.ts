// Mengisi data awal: jenis unit, unit kerja Diskominfo, jenis kegiatan, dan akun admin pertama.
// Aman dijalankan berulang kali; data yang sudah ada dilewati. Jalankan: bun run db:seed
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DATA_JENIS_UNIT: { nama: string; induk?: string }[] = [
  { nama: "Sekretariat" },
  { nama: "Bidang" },
  { nama: "Kelompok fungsional" },
  { nama: "Sub bagian", induk: "Sekretariat" },
  { nama: "Seksi", induk: "Bidang" },
];

const DATA_UNIT: { kode: string; nama: string; jenis: string; induk?: string }[] = [
  { kode: "SEKRETARIAT", nama: "Sekretariat", jenis: "Sekretariat" },
  { kode: "SUBAG-UMPEG", nama: "Sub Bagian Umum dan Kepegawaian", jenis: "Sub bagian", induk: "SEKRETARIAT" },
  { kode: "SUBAG-KEU", nama: "Sub Bagian Keuangan", jenis: "Sub bagian", induk: "SEKRETARIAT" },
  { kode: "SUBAG-RENLAP", nama: "Sub Bagian Perencanaan dan Pelaporan", jenis: "Sub bagian", induk: "SEKRETARIAT" },
  { kode: "BID-OPINI", nama: "Bidang Pengelolaan Opini dan Pelayanan Informasi Publik", jenis: "Bidang" },
  { kode: "BID-KOMPUB", nama: "Bidang Pengelolaan Komunikasi Publik", jenis: "Bidang" },
  { kode: "BID-TIP", nama: "Bidang Teknologi Informasi dan Persandian", jenis: "Bidang" },
  { kode: "SEKSI-DATA", nama: "Seksi Pengelolaan Data dan Persediaan", jenis: "Seksi", induk: "BID-TIP" },
  { kode: "SEKSI-KAMINFO", nama: "Seksi Persediaan dan Keamanan Informasi", jenis: "Seksi", induk: "BID-TIP" },
  { kode: "BID-EGOV", nama: "Bidang Pengelolaan E-Government", jenis: "Bidang" },
  { kode: "JAFUNG", nama: "Kelompok Jabatan Fungsional", jenis: "Kelompok fungsional" },
];

const DATA_JENIS_KEGIATAN = ["Rapat", "Sosialisasi", "Liputan", "Bimtek", "Pemeliharaan"];

// Membuat jenis unit bawaan (induk dulu, baru turunannya)
async function seedJenisUnit() {
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
  await auth.api.createUser({ body: { email, password, name: "Administrator", role: "ADMIN" } });
  console.log(`Akun admin ${email} dibuat`);
}

await seedJenisUnit();
await seedUnitKerja();
await seedJenisKegiatan();
console.log(`Unit kerja: ${DATA_UNIT.length}, jenis kegiatan: ${DATA_JENIS_KEGIATAN.length}`);
await seedAdmin();
await prisma.$disconnect();
process.exit(0);
