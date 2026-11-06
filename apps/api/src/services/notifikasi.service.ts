import { type Db } from "@/lib/prisma";
import { NotifikasiRepository } from "@/repositories/notifikasi.repository";

/**
 * Service notifikasi di lonceng aplikasi. Notifikasi dibuat oleh service lain (mis. saat pemeriksaan) dan dibaca lewat controller notifikasi.
 */
type KegiatanPerluPerbaikan = {
  id: number;
  judul: string;
  dibuatOleh: string;
  penanggungJawabId: number;
  catatan: string;
  pemeriksaId: string;
};

export const NotifikasiService = {
  /**
   * GET daftar notifikasi user yang sedang masuk
   */
  daftar: (userId: string) => NotifikasiRepository.daftar(userId),

  /**
   * Menandai satu notifikasi (atau semuanya bila id kosong) sebagai dibaca
   */
  async baca(userId: string, id?: number) {
    return { jumlah: await NotifikasiRepository.tandaiDibaca(userId, id) };
  },

  /**
   * Dipanggil di dalam transaksi pemeriksaan: kabari pegawai pembuat dan penanggung jawab
   */
  async perluPerbaikan(k: KegiatanPerluPerbaikan, tx: Db) {
    /**
     * Penerima = pembuat dan penanggung jawab kegiatan, tanpa pemeriksa itu sendiri. Judul dipotong 200 karakter sesuai batas kolom.
     */
    const penerima = await NotifikasiRepository.penerimaKegiatan(k, k.pemeriksaId, tx);
    const judul = `Perlu perbaikan: ${k.judul}`;
    await NotifikasiRepository.buatBanyak(
      penerima.map((u) => ({ userId: u.id, jenis: "perlu_perbaikan", judul: judul.slice(0, 200), isi: k.catatan, kegiatanId: k.id })),
      tx,
    );
  },
};
