// Mengisi data awal: bidang Diskominfo, jenis kegiatan, dan akun admin pertama.
// Sekretariat dan sub bidang sengaja tidak dibuat; admin menambahkannya sendiri di Master data.
// Aman dijalankan berulang kali; data yang sudah ada dilewati. Jalankan: bun run db:seed
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DATA_UNIT: { kode: string; nama: string; induk?: string }[] = [
  { kode: "BID-OPINI", nama: "Bidang Pengelolaan Opini dan Pelayanan Informasi Publik" },
  { kode: "BID-KOMPUB", nama: "Bidang Pengelolaan Komunikasi Publik" },
  { kode: "BID-TIP", nama: "Bidang Teknologi Informasi dan Persandian" },
  { kode: "BID-EGOV", nama: "Bidang Pengelolaan E-Government" },
  { kode: "BID-APTIKA", nama: "Bidang Aplikasi Informatika" },
];

const DATA_JENIS_KEGIATAN = ["Rapat", "Sosialisasi", "Liputan", "Bimtek", "Pemeliharaan"];

// Membuat bidang bawaan (unit tanpa induk dibuat lebih dulu)
async function seedBidang() {
  for (const unit of [...DATA_UNIT].sort((a, b) => Number(!!a.induk) - Number(!!b.induk))) {
    if (await prisma.bidang.findUnique({ where: { kode: unit.kode } })) continue;
    const induk = unit.induk ? await prisma.bidang.findUnique({ where: { kode: unit.induk } }) : null;
    await prisma.bidang.create({ data: { kode: unit.kode, nama: unit.nama, parentId: induk?.id ?? null } });
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

await seedBidang();
await seedJenisKegiatan();
console.log(`Bidang: ${DATA_UNIT.length}, jenis kegiatan: ${DATA_JENIS_KEGIATAN.length}`);
await seedAdmin();
await prisma.$disconnect();
process.exit(0);
