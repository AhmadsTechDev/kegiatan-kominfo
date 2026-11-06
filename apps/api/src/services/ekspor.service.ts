import { NotFound, Unprocessable } from "@/lib/errors";
import { storage } from "@/lib/storage";
import { DokumentasiRepository } from "@/repositories/dokumentasi.repository";
import { KegiatanRepository } from "@/repositories/kegiatan.repository";
import type { FormatEkspor, InfoEkspor } from "@/types/ekspor.types";
import type { DokumentasiZipQuery, RekapQuery } from "@/types/rekap.types";
import type { Aktor, MetaRequest } from "@/types/umum.types";
import { formatTanggalPanjang, namaBulan, tanggalWib } from "@/utils/format-waktu";
import { buatPdf, isiSel, JUDUL_LAPORAN, KOLOM, KOP, ringkasanStatus, subjudul, teksKaki } from "@/utils/laporan-pdf";
import { buatPembatasLaju } from "@/utils/rate-limit";
import { aliranZip, type EntriZip } from "@/utils/zip";
import { AuditLogService } from "./audit-log.service";
import { filterDariQuery } from "./kegiatan.service";

export const BATAS_EKSPOR = 5000;
// Batas total ukuran dokumentasi dalam satu ZIP, agar unduhan tetap wajar untuk koneksi kantor
export const BATAS_ZIP_BYTE = 300 * 1024 * 1024;

// Nama aman untuk folder dan berkas di dalam ZIP (tanpa karakter yang ditolak Windows)
const namaAman = (teks: string, maks = 80) => teks.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").replace(/\s+/g, " ").trim().slice(0, maks) || "berkas";

// Menambah " (2)", " (3)", dan seterusnya bila nama sudah dipakai
function namaUnik(nama: string, terpakai: Set<string>) {
  if (!terpakai.has(nama)) return terpakai.add(nama), nama;
  const titik = nama.lastIndexOf(".");
  const [dasar, ext] = titik > 0 ? [nama.slice(0, titik), nama.slice(titik)] : [nama, ""];
  for (let n = 2; ; n++) {
    const calon = `${dasar} (${n})${ext}`;
    if (!terpakai.has(calon)) return terpakai.add(calon), calon;
  }
}

// Maksimal 10 ekspor per menit per akun
const periksaLaju = buatPembatasLaju({ jendelaMs: 60_000, maks: 10, pesan: "Terlalu banyak permintaan ekspor. Coba lagi dalam satu menit" });

type Pembuat = Aktor & { nama: string };

// Uraian rentang waktu untuk judul laporan, contoh "Mei 2026" atau "1 Mei 2026 s.d. 15 Mei 2026"
export function uraianRentang(query: Pick<RekapQuery, "periode" | "dari" | "sampai">) {
  const hari = (t: string) => formatTanggalPanjang(new Date(`${t}T12:00:00+07:00`));
  if (query.dari && query.sampai) return query.dari === query.sampai ? hari(query.dari) : `${hari(query.dari)} s.d. ${hari(query.sampai)}`;
  if (query.dari) return `Sejak ${hari(query.dari)}`;
  if (query.sampai) return `Sampai ${hari(query.sampai)}`;
  return query.periode ? namaBulan(query.periode) : "Semua periode";
}

// Bagian nama berkas yang menunjukkan rentang waktu
function rentangBerkas(query: Pick<RekapQuery, "periode" | "dari" | "sampai">) {
  if (query.dari || query.sampai) return `${query.dari ?? "awal"}_sd_${query.sampai ?? "sekarang"}`;
  return query.periode ?? "semua-periode";
}

// Mengambil baris laporan; ditolak bila lebih dari 5.000 kegiatan
async function barisLaporan(query: RekapQuery, aktor: Aktor, sekarang: Date) {
  const filter = await filterDariQuery(query, aktor);
  const baris = await KegiatanRepository.untukEkspor(filter, sekarang, BATAS_EKSPOR + 1);
  if (baris.length > BATAS_EKSPOR) {
    throw Unprocessable(`Hasil lebih dari ${BATAS_EKSPOR.toLocaleString("id-ID")} kegiatan. Persempit filter, misalnya per periode`);
  }
  return { baris, terbatas: !!filter.lingkup };
}

export const EksporService = {
  // Data pratinjau laporan dalam bentuk JSON (isi sama dengan PDF) untuk ditampilkan di frontend
  async pratinjau(query: RekapQuery, aktor: Pembuat, sekarang = new Date()) {
    const { baris } = await barisLaporan(query, aktor, sekarang);
    const info: InfoEkspor = { periode: uraianRentang(query), dibuatOleh: aktor.nama, dibuatPada: sekarang };
    return {
      kop: KOP,
      judul: JUDUL_LAPORAN,
      subjudul: subjudul(info),
      ringkasan: ringkasanStatus(baris),
      kolom: KOLOM.map((k) => ({ judul: k.judul, lebar: k.lebar })),
      baris: baris.map((b) => ({ id: b.id, ...isiSel(b) })),
      kaki: teksKaki(info),
    };
  },

  // Kegiatan pada cakupan laporan beserta berkas dokumentasinya, untuk tab Dokumentasi di halaman laporan
  async dokumentasi(query: RekapQuery, aktor: Aktor, sekarang = new Date()) {
    const { baris } = await barisLaporan(query, aktor, sekarang);
    const berkas = await DokumentasiRepository.untukKegiatan(baris.map((b) => b.id));
    const perKegiatan = new Map<number, typeof berkas>();
    for (const d of berkas) perKegiatan.set(d.kegiatanId, [...(perKegiatan.get(d.kegiatanId) ?? []), d]);
    return baris.map((b) => {
      const { judul, lokasi, jenis, bidang, penanggungJawab, waktu } = isiSel(b);
      const dokumentasi = (perKegiatan.get(b.id) ?? []).map(({ kegiatanId: _k, path: _p, ...d }) => d);
      return { id: b.id, judul, lokasi, jenis, bidang, penanggungJawab, waktu, dokumentasi };
    });
  },

  // Dokumentasi pada cakupan laporan sebagai ZIP: satu folder per kegiatan, atau berkas langsung bila satu kegiatan
  async dokumentasiZip(query: DokumentasiZipQuery, aktor: Pembuat, meta: MetaRequest, sekarang = new Date()) {
    periksaLaju(aktor.id);
    const { kegiatan: idKegiatan, ...cakupan } = query;
    const { baris } = await barisLaporan(cakupan, aktor, sekarang);
    const dipilih = idKegiatan ? baris.filter((b) => b.id === idKegiatan) : baris;
    if (idKegiatan && dipilih.length === 0) throw NotFound("Kegiatan tidak ditemukan pada cakupan laporan");

    const berkas = await DokumentasiRepository.untukKegiatan(dipilih.map((b) => b.id));
    if (berkas.length === 0) throw Unprocessable("Belum ada dokumentasi pada cakupan ini");
    const total = berkas.reduce((n, d) => n + d.ukuran, 0);
    if (total > BATAS_ZIP_BYTE) {
      throw Unprocessable(`Total dokumentasi lebih dari ${BATAS_ZIP_BYTE / 1024 / 1024} MB. Persempit periode atau unduh per kegiatan`);
    }

    const folder = new Map<number, string>();
    const folderTerpakai = new Set<string>();
    for (const b of dipilih) folder.set(b.id, namaUnik(`${tanggalWib(b.tglMulai)} ${namaAman(b.judul)}`, folderTerpakai));
    const berkasTerpakai = new Map<number, Set<string>>();
    const entri: EntriZip[] = berkas.map((d) => {
      const terpakai = berkasTerpakai.get(d.kegiatanId) ?? new Set<string>();
      berkasTerpakai.set(d.kegiatanId, terpakai);
      const nama = namaUnik(namaAman(d.namaAsli, 150), terpakai);
      return {
        nama: idKegiatan ? nama : `${folder.get(d.kegiatanId)}/${nama}`,
        waktu: d.createdAt,
        baca: async () => {
          const isi = await storage.read(d.path);
          return isi ? new Uint8Array(await isi.arrayBuffer()) : null;
        },
      };
    });

    await AuditLogService.catat({ aktorId: aktor.id, aksi: "ekspor", entitas: "kegiatan", sesudah: { format: "zip", filter: query, jumlah: berkas.length }, ...meta });

    const nama = idKegiatan
      ? `dokumentasi-${namaAman(dipilih[0]!.judul, 60).replace(/ /g, "-").toLowerCase()}.zip`
      : `dokumentasi-kegiatan-${rentangBerkas(cakupan)}-${tanggalWib(sekarang)}.zip`;
    return { aliran: aliranZip(entri), nama, jumlah: berkas.length };
  },

  // Membuat berkas PDF dan mencatatnya ke audit log
  async buat(format: FormatEkspor, query: RekapQuery, aktor: Pembuat, meta: MetaRequest, sekarang = new Date()) {
    periksaLaju(aktor.id);

    const { baris } = await barisLaporan(query, aktor, sekarang);
    const info: InfoEkspor = { periode: uraianRentang(query), dibuatOleh: aktor.nama, dibuatPada: sekarang };
    const isi = await buatPdf(baris, info);

    await AuditLogService.catat({ aktorId: aktor.id, aksi: "ekspor", entitas: "kegiatan", sesudah: { format, filter: query, jumlah: baris.length }, ...meta });

    return { isi, nama: `rekap-kegiatan-${rentangBerkas(query)}-${tanggalWib(sekarang)}.${format}`, jumlah: baris.length };
  },
};
