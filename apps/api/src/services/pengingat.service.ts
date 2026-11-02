import { env } from "@/config/env";
import type { JenisPengingat } from "@/generated/prisma/enums";
import { kirimEmail, type IsiEmail } from "@/lib/mailer";
import { PengingatRepository, type KandidatPengingat } from "@/repositories/pengingat.repository";
import { formatJam, formatRentang, tanggalWib } from "@/utils/format-waktu";

const JEDA_DOKUMENTASI_MS = 60 * 60 * 1000;
const BATAS_DOKUMENTASI_MS = 3 * 24 * 60 * 60 * 1000;

export type Pengirim = (kepada: string, subjek: string, isi: IsiEmail) => Promise<void>;

// Rincian kegiatan yang sama untuk kedua jenis pengingat
const rincianKegiatan = (k: KandidatPengingat) => [
  { label: "Kegiatan", nilai: k.judul },
  { label: "Waktu", nilai: formatRentang(k.tglMulai, k.tglSelesai) },
  ...(k.lokasiNama ? [{ label: "Lokasi", nilai: k.lokasiNama }] : []),
];

// Isi email pengingat H-1 ("hari ini" bila kegiatannya mulai hari ini)
function emailHMinus1(k: KandidatPengingat, sekarang: Date) {
  const hari = tanggalWib(k.tglMulai) === tanggalWib(sekarang) ? "hari ini" : "besok";
  return {
    subjek: `Pengingat: ${k.judul} ${hari}`,
    isi: {
      judul: `Kegiatan Anda ${hari}`,
      pratinjau: `${k.judul}, mulai ${formatJam(k.tglMulai)} WIB${k.lokasiNama ? ` di ${k.lokasiNama}` : ""}.`,
      paragraf: [`Halo ${k.nama},`, `Anda tercatat sebagai penanggung jawab kegiatan berikut, yang berlangsung ${hari}.`],
      rincian: rincianKegiatan(k),
      tombol: { label: "Lihat kegiatan", url: `${env.FRONTEND_URL}/kegiatan/${k.kegiatanId}` },
      catatan: "Setelah kegiatan selesai, unggah foto atau notulen sebagai dokumentasi agar laporan dinas lengkap.",
    },
  };
}

// Isi email pengingat untuk kegiatan selesai yang belum berdokumentasi
function emailDokumentasi(k: KandidatPengingat) {
  return {
    subjek: `Lengkapi dokumentasi: ${k.judul}`,
    isi: {
      judul: "Kegiatan selesai, dokumentasi belum ada",
      pratinjau: `Unggah foto atau notulen untuk ${k.judul}.`,
      paragraf: [
        `Halo ${k.nama},`,
        "Kegiatan berikut sudah selesai tetapi belum memiliki dokumentasi. Unggah foto kegiatan atau notulen (JPEG, PNG, WebP, atau PDF, maks. 20 MB per berkas).",
      ],
      rincian: rincianKegiatan(k),
      tombol: { label: "Unggah dokumentasi", url: `${env.FRONTEND_URL}/kegiatan/${k.kegiatanId}#dokumentasi` },
      catatan: "Pengingat ini hanya dikirim sekali untuk setiap kegiatan. Anda menerimanya karena tercatat sebagai penanggung jawab.",
    },
  };
}

export const PengingatService = {
  // Satu putaran pengingat: cari kandidat, kirim email, catat agar tidak terkirim dua kali
  async jalankan(sekarang = new Date(), kirim: Pengirim = kirimEmail) {
    const hasil: Record<JenisPengingat, number> = { H_MINUS_1: 0, DOKUMENTASI: 0 };
    const [besok, dokumentasi] = await Promise.all([
      PengingatRepository.hMinus1(sekarang),
      PengingatRepository.tanpaDokumentasi(sekarang, JEDA_DOKUMENTASI_MS, BATAS_DOKUMENTASI_MS),
    ]);
    const antrean = [
      ...besok.map((k) => ({ jenis: "H_MINUS_1" as const, k, email: emailHMinus1(k, sekarang) })),
      ...dokumentasi.map((k) => ({ jenis: "DOKUMENTASI" as const, k, email: emailDokumentasi(k) })),
    ];

    for (const { jenis, k, email } of antrean) {
      try {
        await kirim(k.email, email.subjek, email.isi);
        await PengingatRepository.catat(k.kegiatanId, jenis, k.userId);
        hasil[jenis]++;
      } catch (e) {
        console.error(`[pengingat] gagal mengirim ${jenis} kegiatan #${k.kegiatanId}:`, e instanceof Error ? e.message : e);
      }
    }
    return hasil;
  },
};
