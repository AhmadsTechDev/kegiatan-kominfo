import { Unprocessable } from "@/lib/errors";
import { DokumentasiRepository } from "@/repositories/dokumentasi.repository";
import { KegiatanRepository } from "@/repositories/kegiatan.repository";
import type { FormatEkspor, InfoEkspor } from "@/types/ekspor.types";
import type { RekapQuery } from "@/types/rekap.types";
import type { Aktor, MetaRequest } from "@/types/umum.types";
import { formatTanggalPanjang, namaBulan, tanggalWib } from "@/utils/format-waktu";
import { buatPdf, isiSel, JUDUL_LAPORAN, KOLOM, KOP, ringkasanStatus, subjudul, teksKaki } from "@/utils/laporan-pdf";
import { buatPembatasLaju } from "@/utils/rate-limit";
import { AuditLogService } from "./audit-log.service";
import { filterDariQuery } from "./kegiatan.service";

export const BATAS_EKSPOR = 5000;

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
      const dokumentasi = (perKegiatan.get(b.id) ?? []).map(({ kegiatanId: _, ...d }) => d);
      return { id: b.id, judul, lokasi, jenis, bidang, penanggungJawab, waktu, dokumentasi };
    });
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
