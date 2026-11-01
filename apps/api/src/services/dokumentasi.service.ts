import { NotFound, PayloadTooLarge } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { DokumentasiRepository } from "@/repositories/dokumentasi.repository";
import { KegiatanRepository } from "@/repositories/kegiatan.repository";
import type { Aktor, MetaRequest } from "@/types/umum.types";
import { JUMLAH_MAKS_DOKUMENTASI, prosesBerkas } from "@/utils/berkas";
import { AuditLogService } from "./audit-log.service";
import { dalamLingkup, lingkupBaca, pastikanBisaTulis } from "./kegiatan.service";

const PESAN_KUOTA = `Maksimal ${JUMLAH_MAKS_DOKUMENTASI} berkas per kegiatan`;

type BarisDokumentasi = Awaited<ReturnType<typeof DokumentasiRepository.insert>>;

// Kolom dokumentasi yang aman dikirim ke frontend (tanpa path dan hash)
const publik = ({ id, kegiatanId, namaAsli, mime, ukuran, createdAt }: BarisDokumentasi) => ({ id, kegiatanId, namaAsli, mime, ukuran, createdAt });

// Menghapus berkas dari penyimpanan tanpa menggagalkan proses (cukup dicatat di log)
async function hapusBerkasDiam(key: string, pesan: string) {
  await storage.delete(key).catch((galat) => console.error(`[dokumentasi] ${pesan}`, key, galat));
}

export const DokumentasiService = {
  // Mengunggah satu berkas dokumentasi ke kegiatan (maksimal 10 berkas per kegiatan)
  async unggah(kegiatanId: number, berkas: File, aktor: Aktor, meta: MetaRequest) {
    // Cek hak akses dan kuota dulu sebelum memproses berkas yang mungkin besar
    await prisma.$transaction(async (tx) => {
      const k = await KegiatanRepository.kunciAktif(kegiatanId, tx);
      if (!k) throw NotFound("Kegiatan tidak ditemukan");
      await pastikanBisaTulis(aktor, k, "Anda hanya dapat mengunggah dokumentasi pada kegiatan milik Anda");
      if ((await DokumentasiRepository.hitung(kegiatanId, tx)) >= JUMLAH_MAKS_DOKUMENTASI) throw PayloadTooLarge(PESAN_KUOTA);
    });

    const hasil = await prosesBerkas(berkas);
    const key = `kegiatan/${kegiatanId}/${crypto.randomUUID()}.${hasil.ext}`;
    await storage.put(key, hasil.bytes);

    try {
      const baru = await prisma.$transaction(async (tx) => {
        // Cek ulang kuota di dalam kunci, karena bisa ada unggahan lain yang berjalan bersamaan
        if (!(await KegiatanRepository.kunciAktif(kegiatanId, tx))) throw NotFound("Kegiatan tidak ditemukan");
        if ((await DokumentasiRepository.hitung(kegiatanId, tx)) >= JUMLAH_MAKS_DOKUMENTASI) throw PayloadTooLarge(PESAN_KUOTA);
        const baris = await DokumentasiRepository.insert(
          { kegiatanId, path: key, namaAsli: hasil.namaAsli, mime: hasil.mime, ukuran: hasil.bytes.byteLength, sha256: hasil.sha256, diunggahOleh: aktor.id },
          tx,
        );
        await AuditLogService.catat({ aktorId: aktor.id, aksi: "unggah", entitas: "dokumentasi", entitasId: baris.id, sesudah: baris, ...meta }, tx);
        return baris;
      });
      return publik(baru);
    } catch (e) {
      await hapusBerkasDiam(key, "gagal membersihkan berkas");
      throw e;
    }
  },

  // Mengganti berkas dokumentasi yang sudah ada dengan berkas baru
  async ganti(id: number, berkas: File, aktor: Aktor, meta: MetaRequest) {
    const data = await DokumentasiRepository.findDenganKegiatan(id);
    if (!data) throw NotFound("Dokumentasi tidak ditemukan");
    await pastikanBisaTulis(aktor, data.kegiatan, "Anda hanya dapat mengganti dokumentasi pada kegiatan milik Anda", "Dokumentasi tidak ditemukan");

    const hasil = await prosesBerkas(berkas);
    const key = `kegiatan/${data.kegiatan.id}/${crypto.randomUUID()}.${hasil.ext}`;
    await storage.put(key, hasil.bytes);

    try {
      const baru = await prisma.$transaction(async (tx) => {
        if (!(await KegiatanRepository.kunciAktif(data.kegiatan.id, tx))) throw NotFound("Kegiatan tidak ditemukan");
        const baris = await DokumentasiRepository.ganti(
          id,
          { path: key, namaAsli: hasil.namaAsli, mime: hasil.mime, ukuran: hasil.bytes.byteLength, sha256: hasil.sha256, diunggahOleh: aktor.id, createdAt: new Date() },
          tx,
        );
        if (!baris) throw NotFound("Dokumentasi tidak ditemukan");
        await AuditLogService.catat(
          { aktorId: aktor.id, aksi: "ganti_file", entitas: "dokumentasi", entitasId: id, sebelum: data.dokumentasi, sesudah: baris, ...meta },
          tx,
        );
        return baris;
      });
      await hapusBerkasDiam(data.dokumentasi.path, "berkas yatim, hapus manual:");
      return publik(baru);
    } catch (e) {
      await hapusBerkasDiam(key, "gagal membersihkan berkas");
      throw e;
    }
  },

  // Mengambil berkas dokumentasi untuk ditampilkan/diunduh (dicek lingkup bacanya)
  async unduh(id: number, aktor: Aktor) {
    const data = await DokumentasiRepository.findDenganKegiatan(id);
    if (!data || !dalamLingkup(await lingkupBaca(aktor), data.kegiatan)) throw NotFound("Dokumentasi tidak ditemukan");
    const berkas = await storage.read(data.dokumentasi.path);
    if (!berkas) throw NotFound("Berkas dokumentasi tidak ada di penyimpanan");
    return { berkas, ...data.dokumentasi };
  },

  // Menghapus berkas dokumentasi
  async hapus(id: number, aktor: Aktor, meta: MetaRequest) {
    const data = await DokumentasiRepository.findDenganKegiatan(id);
    if (!data) throw NotFound("Dokumentasi tidak ditemukan");
    await pastikanBisaTulis(aktor, data.kegiatan, "Anda hanya dapat menghapus dokumentasi pada kegiatan milik Anda", "Dokumentasi tidak ditemukan");

    await prisma.$transaction(async (tx) => {
      await DokumentasiRepository.hapus(id, tx);
      await AuditLogService.catat({ aktorId: aktor.id, aksi: "hapus_file", entitas: "dokumentasi", entitasId: id, sebelum: data.dokumentasi, ...meta }, tx);
    });
    await hapusBerkasDiam(data.dokumentasi.path, "berkas yatim, hapus manual:");
  },
};
