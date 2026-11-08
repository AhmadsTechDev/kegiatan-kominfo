/**
 * Data DEMO untuk development: pegawai, akun berbagai role/status, dan kegiatan 3 bulan ke belakang + 3 minggu ke depan.
 * Semua nama, NIP, dan kegiatan di sini fiktif dan hanya untuk mencoba tampilan; JANGAN dijalankan di produksi.
 * Jalankan: bun run db:seed:demo (bisa diulang; data demo lama dihapus lalu dibuat ulang).
 * Prasyarat: bun run db:seed sudah dijalankan (bidang dan jenis kegiatan).
 */
import { eq, inArray, like, or } from "drizzle-orm";
import { account, bidang, catatanPemeriksaan, jenisKegiatan, kegiatan, pegawai, user, verification } from "@/db/schema";
import { db, pool } from "@/lib/db";
import { hashSandi } from "@/lib/sandi";

if (process.env.NODE_ENV === "production") throw new Error("seed-demo dilarang dijalankan di produksi");

const DOMAIN = "demo.local";
export const SANDI_DEMO = "sandidemo2026";

/**
 * Acak dengan benih tetap agar hasilnya sama setiap kali dijalankan
 */
let benih = 20261102;
const acak = () => ((benih = (benih * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pilih = <T>(daftar: readonly T[]) => daftar[Math.floor(acak() * daftar.length)]!;

/**
 * NIP 18 digit yang lolos aturan utils/nip.ts (lahir 1975-1995, TMT 22-26 tahun setelahnya)
 */
function nip(urut: number) {
  const lahir = 1975 + Math.floor(acak() * 21);
  const bln = String(1 + Math.floor(acak() * 12)).padStart(2, "0");
  const tgl = String(1 + Math.floor(acak() * 28)).padStart(2, "0");
  const tmt = `${lahir + 22 + Math.floor(acak() * 5)}${String(1 + Math.floor(acak() * 12)).padStart(2, "0")}`;
  return `${lahir}${bln}${tgl}${tmt}${1 + Math.floor(acak() * 2)}${String(urut).padStart(3, "0")}`;
}

type Orang = { nama: string; unit: string; akun?: { role: "PEGAWAI" | "PIMPINAN"; status: "AKTIF" | "MENUNGGU" | "NONAKTIF" }; nip?: boolean };

const ORANG: Orang[] = [
  { nama: "Sri Wahyuni", unit: "BID-TIP", akun: { role: "PIMPINAN", status: "AKTIF" }, nip: true },
  { nama: "Andi Saputra", unit: "BID-TIP", akun: { role: "PEGAWAI", status: "AKTIF" }, nip: true },
  { nama: "Dewi Lestari", unit: "BID-TIP", akun: { role: "PEGAWAI", status: "AKTIF" }, nip: true },
  { nama: "Budi Santoso", unit: "BID-TIP", akun: { role: "PEGAWAI", status: "AKTIF" }, nip: true },
  { nama: "Fitri Handayani", unit: "BID-KOMPUB", akun: { role: "PEGAWAI", status: "AKTIF" }, nip: true },
  { nama: "Yoga Pratama", unit: "BID-OPINI", akun: { role: "PEGAWAI", status: "AKTIF" } },
  { nama: "Nurul Aini", unit: "BID-EGOV", akun: { role: "PEGAWAI", status: "AKTIF" }, nip: true },
  { nama: "Hendra Wijaya", unit: "BID-OPINI", akun: { role: "PEGAWAI", status: "MENUNGGU" } },
  { nama: "Siti Rohani", unit: "BID-EGOV", akun: { role: "PEGAWAI", status: "NONAKTIF" }, nip: true },
  { nama: "Agus Setiawan", unit: "BID-TIP", nip: true },
  { nama: "Rina Marlina", unit: "SUBBAG-UMPEG" },
];

/**
 * Lokasi di Palembang (koordinat perkiraan untuk peta demo)
 */
const LOKASI = [
  { nama: "Kantor Diskominfo Kota Palembang", lat: -2.9776, lng: 104.7477 },
  { nama: "Kantor Wali Kota Palembang", lat: -2.9908, lng: 104.7566 },
  { nama: "Benteng Kuto Besak", lat: -2.9927, lng: 104.7591 },
  { nama: "Kantor Camat Ilir Barat I", lat: -2.9721, lng: 104.7339 },
  { nama: "Kantor Camat Kalidoni", lat: -2.9472, lng: 104.7871 },
  { nama: "Kantor Camat Seberang Ulu I", lat: -3.0139, lng: 104.7626 },
  { nama: "Aula Diskominfo", lat: -2.9776, lng: 104.7477 },
  { nama: "Daring (Zoom)", lat: null, lng: null },
] as const;

const JUDUL: Record<string, string[]> = {
  Rapat: ["Rapat koordinasi bulanan", "Rapat evaluasi layanan aplikasi", "Rapat persiapan HUT Kota Palembang", "Rapat pembahasan anggaran TIK"],
  Sosialisasi: ["Sosialisasi keterbukaan informasi publik", "Sosialisasi keamanan siber untuk ASN", "Sosialisasi aplikasi layanan publik"],
  Liputan: ["Liputan kegiatan Wali Kota", "Liputan pelantikan pejabat", "Liputan festival budaya Sungai Musi"],
  Bimtek: ["Bimtek pengelolaan website OPD", "Bimtek satu data Palembang", "Bimtek penulisan berita"],
  Pemeliharaan: ["Pemeliharaan jaringan fiber optik", "Pemeliharaan server pusat data", "Pemeliharaan CCTV kota"],
};

const HARI = 24 * 3600_000;

async function hapusDemoLama() {
  const users = await db.select({ id: user.id, pegawaiId: user.pegawaiId }).from(user).where(like(user.email, `%@${DOMAIN}`));
  const userIds = users.map((u) => u.id);
  const pegawaiTerkait = await db
    .select({ id: pegawai.id })
    .from(pegawai)
    .where(or(inArray(pegawai.id, users.map((u) => u.pegawaiId!).filter(Boolean)), inArray(pegawai.nama, ORANG.map((o) => o.nama))));
  const pegawaiIds = pegawaiTerkait.map((p) => p.id);
  await db.transaction(async (tx) => {
    await tx.delete(kegiatan).where(or(inArray(kegiatan.dibuatOleh, userIds), inArray(kegiatan.penanggungJawabId, pegawaiIds)));
    await tx.delete(verification).where(inArray(verification.value, userIds));
    await tx.delete(user).where(inArray(user.id, userIds));
    await tx.delete(pegawai).where(inArray(pegawai.id, pegawaiIds));
  });
  return users.length;
}

const dihapus = await hapusDemoLama();
const unit = new Map((await db.select({ id: bidang.id, kode: bidang.kode }).from(bidang)).map((u) => [u.kode, u.id]));
const jenis = await db.select({ id: jenisKegiatan.id, nama: jenisKegiatan.nama }).from(jenisKegiatan);
const [admin] = await db.select({ id: user.id }).from(user).where(eq(user.role, "ADMIN")).limit(1);
if (!unit.size || !jenis.length || !admin) throw new Error("Jalankan dulu: bun run db:seed");

const hash = await hashSandi(SANDI_DEMO);
const pelaksana: { userId: string; pegawaiId: number; unitId: number }[] = [];
let pimpinanId = admin.id;

for (const [i, o] of ORANG.entries()) {
  const unitId = unit.get(o.unit);
  if (!unitId) throw new Error(`Unit ${o.unit} tidak ada`);
  const [p] = await db.insert(pegawai).values({ nama: o.nama, bidangId: unitId, nip: o.nip ? nip(i + 1) : null }).returning({ id: pegawai.id });
  if (!o.akun) continue;
  const email = `${o.nama.toLowerCase().replace(/\s+/g, ".")}@${DOMAIN}`;
  const id = crypto.randomUUID();
  await db.insert(user).values({
    id,
    name: o.nama,
    email,
    role: o.akun.role,
    pegawaiId: p!.id,
    emailVerified: o.akun.status !== "MENUNGGU",
    banned: o.akun.status === "NONAKTIF",
    banReason: o.akun.status === "NONAKTIF" ? "Pindah tugas" : null,
    kontak: o.akun.status === "AKTIF" ? `0812-${String(1000 + i * 37).slice(-4)}-${String(2000 + i * 53).slice(-4)}` : null,
  });

  /**
   * Akun MENUNGGU tidak punya kata sandi (belum aktivasi); selainnya bisa login dengan SANDI_DEMO
   */
  if (o.akun.status !== "MENUNGGU") await db.insert(account).values({ id: crypto.randomUUID(), accountId: id, providerId: "credential", userId: id, password: hash });
  if (o.akun.role === "PEGAWAI" && o.akun.status === "AKTIF") pelaksana.push({ userId: id, pegawaiId: p!.id, unitId });
  if (o.akun.role === "PIMPINAN" && pimpinanId === admin.id) pimpinanId = id;
}

/**
 * Kegiatan: 90 hari ke belakang sampai 21 hari ke depan, jam kerja WIB
 */
const sekarang = Date.now();
let jumlah = 0;
for (let i = 0; i < 48; i++) {
  const j = pilih(jenis);
  const orang = pilih(pelaksana);
  const hariKe = Math.floor(acak() * 111) - 90;
  const mulai = new Date(sekarang + hariKe * HARI);
  mulai.setUTCHours(1 + Math.floor(acak() * 6), acak() < 0.5 ? 0 : 30, 0, 0); // 08.00-13.30 WIB
  const durasiJam = j.nama === "Pemeliharaan" || j.nama === "Bimtek" ? 4 + Math.floor(acak() * 4) : 1 + Math.floor(acak() * 3);
  const selesai = new Date(mulai.getTime() + durasiJam * 3600_000);
  const lewat = selesai.getTime() < sekarang;
  const batal = acak() < 0.07;
  const lokasi = pilih(LOKASI);
  const judul = pilih(JUDUL[j.nama] ?? [`Kegiatan ${j.nama}`]);
  const pemeriksaan = !lewat || batal ? "terkirim" : pilih(["terkirim", "terkirim", "terkirim", "perlu_perbaikan"] as const);

  const [k] = await db
    .insert(kegiatan)
    .values({
      judul,
      jenisId: j.id,
      uraian: `${judul} yang diselenggarakan Diskominfo Kota Palembang. Data demo untuk mencoba tampilan aplikasi.`,
      lokasiNama: lokasi.nama,
      lat: lokasi.lat === null ? null : String(lokasi.lat),
      lng: lokasi.lng === null ? null : String(lokasi.lng),
      tglMulai: mulai,
      tglSelesai: selesai,
      bidangId: orang.unitId,
      penanggungJawabId: orang.pegawaiId,
      dibuatOleh: orang.userId,
      jumlahPeserta: 5 + Math.floor(acak() * 60),
      hasil: lewat && !batal && acak() < 0.6 ? "Kegiatan berjalan sesuai rencana. Notulen dan daftar hadir disimpan di dokumentasi." : null,
      dibatalkanAt: batal ? new Date(mulai.getTime() - 2 * HARI) : null,
      alasanBatal: batal ? "Bentrok dengan agenda Wali Kota" : null,
      statusPemeriksaan: pemeriksaan,
    })
    .returning({ id: kegiatan.id });
  if (pemeriksaan !== "terkirim") {
    await db.insert(catatanPemeriksaan).values({ kegiatanId: k!.id, pemeriksaId: pimpinanId, status: pemeriksaan, isi: "Mohon lengkapi foto kegiatan dan jumlah peserta." });
  }
  jumlah++;
}

console.log(`Data demo: ${ORANG.length} pegawai, ${ORANG.filter((o) => o.akun).length} akun, ${jumlah} kegiatan${dihapus ? ` (menggantikan ${dihapus} akun demo lama)` : ""}`);
console.log(`Login akun demo: <nama.depan.belakang>@${DOMAIN} dengan sandi ${SANDI_DEMO}, mis. andi.saputra@${DOMAIN} (pegawai), rahmat.hidayat@${DOMAIN} (pimpinan)`);
await pool.end();
process.exit(0);
