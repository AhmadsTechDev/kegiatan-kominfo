import { type Db } from "@/lib/prisma";
import { NotifikasiRepository } from "@/repositories/notifikasi.repository";

type HasilPemeriksaan = {
  id: number;
  judul: string;
  dibuatOleh: string;
  penanggungJawabId: number;
  status: "diperiksa" | "perlu_perbaikan";
  catatan: string | null;
  pemeriksaId: string;
};

export const NotifikasiService = {
  // GET daftar notifikasi user yang sedang masuk
  daftar: (userId: string) => NotifikasiRepository.daftar(userId),

  // Menandai satu notifikasi (atau semuanya bila id kosong) sebagai dibaca
  async baca(userId: string, id?: number) {
    return { jumlah: await NotifikasiRepository.tandaiDibaca(userId, id) };
  },

  // Dipanggil di dalam transaksi pemeriksaan: kabari pegawai pembuat dan penanggung jawab
  async hasilPemeriksaan(k: HasilPemeriksaan, tx: Db) {
    const penerima = await NotifikasiRepository.penerimaKegiatan(k, k.pemeriksaId, tx);
    const judul = k.status === "perlu_perbaikan" ? `Perlu perbaikan: ${k.judul}` : `Sudah diperiksa: ${k.judul}`;
    await NotifikasiRepository.buatBanyak(
      penerima.map((u) => ({ userId: u.id, jenis: k.status, judul: judul.slice(0, 200), isi: k.catatan, kegiatanId: k.id })),
      tx,
    );
  },
};
