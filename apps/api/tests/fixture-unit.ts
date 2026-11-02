// Sub bidang untuk uji. Seed produksi sengaja tidak membuatnya (admin menambahkan sendiri),
// tetapi banyak uji membutuhkan unit di bawah bidang untuk memeriksa lingkup baca dan induk.
import { prisma } from "@/lib/prisma";

const bidang = await prisma.unitKerja.findUniqueOrThrow({ where: { kode: "BID-TIP" } });
const jenis = await prisma.jenisUnit.findUniqueOrThrow({ where: { nama: "Sub bidang" } });
for (const [kode, nama] of [
  ["SEKSI-DATA", "Seksi Pengelolaan Data dan Persediaan"],
  ["SEKSI-KAMINFO", "Seksi Persediaan dan Keamanan Informasi"],
] as const) {
  await prisma.unitKerja.create({ data: { kode, nama, jenisUnitId: jenis.id, parentId: bidang.id } });
}
await prisma.$disconnect();
process.exit(0);
