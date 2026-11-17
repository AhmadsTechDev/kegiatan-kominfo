import { NotFound, PayloadTooLarge } from "@/lib/errors";
import { db } from "@/db";
import { storage } from "@/lib/storage";
import { DokumentasiRepository } from "@/repositories/dokumentasi.repository";
import { KegiatanRepository } from "@/repositories/kegiatan.repository";
import type { Aktor } from "@/types/umum.types";
import { JUMLAH_MAKS_DOKUMENTASI, prosesBerkas } from "@/utils/berkas";
import { dalamLingkup, lingkupBaca, pastikanBisaTulis } from "./kegiatan.service";

type BarisDokumentasi = Awaited<ReturnType<typeof DokumentasiRepository.insert>>;

const PESAN_KUOTA = `Maksimal ${JUMLAH_MAKS_DOKUMENTASI} berkas per kegiatan`;

const publik = ({ id, kegiatanId, namaAsli, mime, ukuran, createdAt }: BarisDokumentasi) => ({ id, kegiatanId, namaAsli, mime, ukuran, createdAt });

async function hapusBerkasDiam(key: string, pesan: string) {
  await storage.delete(key).catch((galat) => console.error(`[dokumentasi] ${pesan}`, key, galat));
}

export const DokumentasiService = {
  async unggah(kegiatanId: number, berkas: File, aktor: Aktor) {
    await db.transaction(async (tx) => {
      const k = await KegiatanRepository.kunciAktif(kegiatanId, tx);
      if (!k) throw NotFound("Kegiatan tidak ditemukan");
      await pastikanBisaTulis(aktor, k, "Anda hanya dapat mengunggah dokumentasi pada kegiatan milik Anda");
      if ((await DokumentasiRepository.hitung(kegiatanId, tx)) >= JUMLAH_MAKS_DOKUMENTASI) throw PayloadTooLarge(PESAN_KUOTA);
    });

    const hasil = await prosesBerkas(berkas);
    const key = `kegiatan/${kegiatanId}/${crypto.randomUUID()}.${hasil.ext}`;
    await storage.put(key, hasil.bytes);

    try {
      const baru = await db.transaction(async (tx) => {
        if (!(await KegiatanRepository.kunciAktif(kegiatanId, tx))) throw NotFound("Kegiatan tidak ditemukan");
        if ((await DokumentasiRepository.hitung(kegiatanId, tx)) >= JUMLAH_MAKS_DOKUMENTASI) throw PayloadTooLarge(PESAN_KUOTA);
        return DokumentasiRepository.insert(
          { kegiatanId, path: key, namaAsli: hasil.namaAsli, mime: hasil.mime, ukuran: hasil.bytes.byteLength, sha256: hasil.sha256, diunggahOleh: aktor.id },
          tx,
        );
      });
      return publik(baru);

    } catch (e) {
      await hapusBerkasDiam(key, "gagal membersihkan berkas");
      throw e;
    }
  },

  async ganti(id: number, berkas: File, aktor: Aktor) {
    const data = await DokumentasiRepository.findDenganKegiatan(id);
    if (!data) throw NotFound("Dokumentasi tidak ditemukan");
    await pastikanBisaTulis(aktor, data.kegiatan, "Anda hanya dapat mengganti dokumentasi pada kegiatan milik Anda", "Dokumentasi tidak ditemukan");

    const hasil = await prosesBerkas(berkas);
    const key = `kegiatan/${data.kegiatan.id}/${crypto.randomUUID()}.${hasil.ext}`;
    await storage.put(key, hasil.bytes);

    try {
      const baru = await db.transaction(async (tx) => {
        if (!(await KegiatanRepository.kunciAktif(data.kegiatan.id, tx))) throw NotFound("Kegiatan tidak ditemukan");
        const baris = await DokumentasiRepository.ganti(
          id,
          { path: key, namaAsli: hasil.namaAsli, mime: hasil.mime, ukuran: hasil.bytes.byteLength, sha256: hasil.sha256, diunggahOleh: aktor.id, createdAt: new Date() },
          tx,
        );
        if (!baris) throw NotFound("Dokumentasi tidak ditemukan");
        return baris;
      });

      await hapusBerkasDiam(data.dokumentasi.path, "berkas yatim, hapus manual:");
      return publik(baru);
    } catch (e) {
      await hapusBerkasDiam(key, "gagal membersihkan berkas");
      throw e;
    }
  },

  async unduh(id: number, aktor: Aktor) {
    const data = await DokumentasiRepository.findDenganKegiatan(id);

    if (!data || !dalamLingkup(await lingkupBaca(aktor), data.kegiatan)) throw NotFound("Dokumentasi tidak ditemukan");
    const berkas = await storage.read(data.dokumentasi.path);
    if (!berkas) throw NotFound("Berkas dokumentasi tidak ada di penyimpanan");
    return { berkas, ...data.dokumentasi };
  },

  async hapus(id: number, aktor: Aktor) {
    const data = await DokumentasiRepository.findDenganKegiatan(id);
    if (!data) throw NotFound("Dokumentasi tidak ditemukan");

    if (aktor.role !== "ADMIN") {
      await pastikanBisaTulis(aktor, data.kegiatan, "Anda hanya dapat menghapus dokumentasi pada kegiatan milik Anda", "Dokumentasi tidak ditemukan");
    }

    await DokumentasiRepository.hapus(id, db);
    await hapusBerkasDiam(data.dokumentasi.path, "berkas yatim, hapus manual:");
  },
};
