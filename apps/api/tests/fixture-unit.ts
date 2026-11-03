// Sub bidang untuk uji. Seed produksi sengaja tidak membuatnya (admin menambahkan sendiri),
// tetapi banyak uji membutuhkan unit di bawah bidang untuk memeriksa lingkup baca dan induk.
import { prisma } from "@/lib/prisma";

const bidang = await prisma.bidang.findUniqueOrThrow({ where: { kode: "BID-TIP" } });
for (const [kode, nama] of [
  ["SEKSI-DATA", "Seksi Pengelolaan Data dan Persediaan"],
  ["SEKSI-KAMINFO", "Seksi Persediaan dan Keamanan Informasi"],
] as const) {
  await prisma.bidang.create({ data: { kode, nama, parentId: bidang.id } });
}
await prisma.$disconnect();
process.exit(0);
