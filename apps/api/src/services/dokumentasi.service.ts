import { NotFound, PayloadTooLarge } from "@/lib/errors";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { DokumentasiRepository } from "@/repositories/dokumentasi.repository";
import { KegiatanRepository } from "@/repositories/kegiatan.repository";
import type { Aktor } from "@/types/umum.types";
import { JUMLAH_MAKS_DOKUMENTASI, prosesBerkas } from "@/utils/berkas";
import { dalamLingkup, lingkupBaca, pastikanBisaTulis } from "./kegiatan.service";

/**
 * Service dokumentasi: unggah, ganti, unduh, dan hapus berkas foto/PDF kegiatan.
 * Ada dua tempat penyimpanan yang harus selalu sinkron: metadata di database (nama, ukuran, path)
 * dan isi berkasnya di storage (disk atau Cloudinary). Banyak langkah di file ini ada untuk menjaga keduanya tetap cocok.
 */
const PESAN_KUOTA = `Maksimal ${JUMLAH_MAKS_DOKUMENTASI} berkas per kegiatan`;

/**
 * KONSEP tipe turunan: ReturnType mengambil tipe hasil fungsi insert, Awaited "membuka" Promise-nya.
 * Jadi tipe ini selalu sama dengan bentuk baris dari database tanpa perlu ditulis ulang.
 */
type BarisDokumentasi = Awaited<ReturnType<typeof DokumentasiRepository.insert>>;

/**
 * Kolom dokumentasi yang aman dikirim ke frontend (tanpa path dan hash)
 */
const publik = ({ id, kegiatanId, namaAsli, mime, ukuran, createdAt }: BarisDokumentasi) => ({ id, kegiatanId, namaAsli, mime, ukuran, createdAt });

/**
 * Menghapus berkas dari penyimpanan tanpa menggagalkan proses (cukup dicatat di log)
 * `.catch(...)` menangkap galat penghapusan agar tidak menggagalkan proses utama; berkas yang tertinggal cukup dicatat di log untuk dibersihkan manual.
 */
async function hapusBerkasDiam(key: string, pesan: string) {
  await storage.delete(key).catch((galat) => console.error(`[dokumentasi] ${pesan}`, key, galat));
}

export const DokumentasiService = {
  /**
   * Mengunggah satu berkas dokumentasi ke kegiatan (maksimal 10 berkas per kegiatan)
   *
   * Alurnya tiga langkah: (1) cek hak akses dan kuota, (2) proses lalu simpan berkas ke storage,
   * (3) simpan metadata ke database. Langkah 2 sengaja di luar transaksi karena bisa lama;
   * menahan kunci baris selama unggahan akan membuat pengguna lain menunggu.
   * Nama berkas di storage memakai UUID acak agar tidak bentrok dan tidak bisa ditebak.
   * @param kegiatanId kegiatan tujuan
   * @param berkas berkas dari form (foto atau PDF)
   * @param aktor pengguna yang mengunggah
   * @returns data dokumentasi yang aman dikirim ke frontend
   * @throws NotFound bila kegiatan tidak ada, Forbidden bila bukan pemiliknya, PayloadTooLarge bila kuota 10 berkas penuh
   */
  async unggah(kegiatanId: number, berkas: File, aktor: Aktor) {
    /**
     * Cek hak akses dan kuota dulu sebelum memproses berkas yang mungkin besar
     */
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
        /**
         * Cek ulang kuota di dalam kunci, karena bisa ada unggahan lain yang berjalan bersamaan
         */
        if (!(await KegiatanRepository.kunciAktif(kegiatanId, tx))) throw NotFound("Kegiatan tidak ditemukan");
        if ((await DokumentasiRepository.hitung(kegiatanId, tx)) >= JUMLAH_MAKS_DOKUMENTASI) throw PayloadTooLarge(PESAN_KUOTA);
        return DokumentasiRepository.insert(
          { kegiatanId, path: key, namaAsli: hasil.namaAsli, mime: hasil.mime, ukuran: hasil.bytes.byteLength, sha256: hasil.sha256, diunggahOleh: aktor.id },
          tx,
        );
      });
      return publik(baru);

    /**
     * Bila menyimpan ke database gagal, berkas yang sudah terlanjur diunggah dihapus lagi agar tidak jadi "berkas yatim", lalu galatnya diteruskan ke pemanggil.
     */
    } catch (e) {
      await hapusBerkasDiam(key, "gagal membersihkan berkas");
      throw e;
    }
  },

  /**
   * Mengganti berkas dokumentasi yang sudah ada dengan berkas baru
   */
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

      /**
       * Berkas lama baru dihapus setelah database sukses menunjuk ke berkas baru, jadi tidak ada saat di mana data menunjuk ke berkas yang sudah hilang.
       */
      await hapusBerkasDiam(data.dokumentasi.path, "berkas yatim, hapus manual:");
      return publik(baru);
    } catch (e) {
      await hapusBerkasDiam(key, "gagal membersihkan berkas");
      throw e;
    }
  },

  /**
   * Mengambil berkas dokumentasi untuk ditampilkan/diunduh (dicek lingkup bacanya)
   */
  async unduh(id: number, aktor: Aktor) {
    const data = await DokumentasiRepository.findDenganKegiatan(id);

    /**
     * Berkas hanya boleh diunduh oleh orang yang boleh melihat kegiatannya; selain itu dijawab 404.
     */
    if (!data || !dalamLingkup(await lingkupBaca(aktor), data.kegiatan)) throw NotFound("Dokumentasi tidak ditemukan");
    const berkas = await storage.read(data.dokumentasi.path);
    if (!berkas) throw NotFound("Berkas dokumentasi tidak ada di penyimpanan");
    return { berkas, ...data.dokumentasi };
  },

  /**
   * Menghapus berkas dokumentasi
   */
  async hapus(id: number, aktor: Aktor) {
    const data = await DokumentasiRepository.findDenganKegiatan(id);
    if (!data) throw NotFound("Dokumentasi tidak ditemukan");

    /**
     * Admin boleh menghapus dokumentasi kegiatan siapa pun; pegawai hanya pada kegiatan miliknya
     */
    if (aktor.role !== "ADMIN") {
      await pastikanBisaTulis(aktor, data.kegiatan, "Anda hanya dapat menghapus dokumentasi pada kegiatan milik Anda", "Dokumentasi tidak ditemukan");
    }

    await DokumentasiRepository.hapus(id, db);
    await hapusBerkasDiam(data.dokumentasi.path, "berkas yatim, hapus manual:");
  },
};
