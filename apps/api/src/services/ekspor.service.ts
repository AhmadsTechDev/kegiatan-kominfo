import { Unprocessable } from "@/lib/errors";
import { KegiatanRepository } from "@/repositories/kegiatan.repository";
import { ReferensiRepository } from "@/repositories/referensi.repository";
import type { FormatEkspor, InfoEkspor } from "@/types/ekspor.types";
import type { RekapQuery } from "@/types/rekap.types";
import type { Aktor, MetaRequest } from "@/types/umum.types";
import { formatTanggalPanjang, LABEL_STATUS, namaBulan, tanggalWib } from "@/utils/format-waktu";
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

// Periode dan filter lain yang dipakai, masing-masing berlabel agar terbaca jelas di laporan
async function uraianFilter(query: RekapQuery, terbatas: boolean): Promise<Pick<InfoEkspor, "periode" | "cakupan">> {
  const [unit, jenis, pegawai] = await Promise.all([
    query.unit ? ReferensiRepository.semuaBidang() : undefined,
    query.jenis ? ReferensiRepository.jenisKegiatanAktif() : undefined,
    query.pegawai ? ReferensiRepository.pegawaiAktif() : undefined,
  ]);
  const kataKunci = query.q?.trim();
  return {
    periode: uraianRentang(query),
    cakupan: [
      {
        label: "Bidang",
        nilai: query.unit
          ? (unit?.find((u) => u.id === query.unit)?.nama ?? "Unit tidak dikenal")
          : terbatas
            ? "Bidang sendiri dan kegiatan milik sendiri"
            : "Semua bidang",
      },
      { label: "Jenis kegiatan", nilai: query.jenis ? (jenis?.find((j) => j.id === query.jenis)?.nama ?? "Jenis tidak dikenal") : "Semua jenis" },
      { label: "Status", nilai: query.status ? LABEL_STATUS[query.status] : "Semua status" },
      ...(query.pegawai ? [{ label: "Penanggung jawab", nilai: pegawai?.find((p) => p.id === query.pegawai)?.nama ?? "Tidak dikenal" }] : []),
      ...(kataKunci ? [{ label: "Kata kunci", nilai: `"${kataKunci}"` }] : []),
    ],
  };
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
    const { baris, terbatas } = await barisLaporan(query, aktor, sekarang);
    const info: InfoEkspor = { ...(await uraianFilter(query, terbatas)), dibuatOleh: aktor.nama, dibuatPada: sekarang };
    return {
      kop: KOP,
      judul: JUDUL_LAPORAN,
      subjudul: subjudul(info),
      cakupan: info.cakupan,
      ringkasan: ringkasanStatus(baris),
      kolom: KOLOM.map((k) => ({ judul: k.judul, lebar: k.lebar })),
      baris: baris.map((b) => ({ id: b.id, ...isiSel(b) })),
      kaki: teksKaki(info),
    };
  },

  // Membuat berkas PDF dan mencatatnya ke audit log
  async buat(format: FormatEkspor, query: RekapQuery, aktor: Pembuat, meta: MetaRequest, sekarang = new Date()) {
    periksaLaju(aktor.id);

    const { baris, terbatas } = await barisLaporan(query, aktor, sekarang);
    const info: InfoEkspor = { ...(await uraianFilter(query, terbatas)), dibuatOleh: aktor.nama, dibuatPada: sekarang };
    const isi = await buatPdf(baris, info);

    await AuditLogService.catat({ aktorId: aktor.id, aksi: "ekspor", entitas: "kegiatan", sesudah: { format, filter: query, jumlah: baris.length }, ...meta });

    return { isi, nama: `rekap-kegiatan-${rentangBerkas(query)}-${tanggalWib(sekarang)}.${format}`, jumlah: baris.length };
  },
};
