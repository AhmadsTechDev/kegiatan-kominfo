import { type Db } from "@/db";
import { NotifikasiRepository } from "@/repositories/notifikasi.repository";

type KegiatanPerluPerbaikan = {
  id: number;
  judul: string;
  dibuatOleh: string;
  penanggungJawabId: number;
  catatan: string;
  pemeriksaId: string;
};

export const NotifikasiService = {
  daftar: (userId: string) => NotifikasiRepository.daftar(userId),

  async baca(userId: string, id?: number) {
    return { jumlah: await NotifikasiRepository.tandaiDibaca(userId, id) };
  },

  async perluPerbaikan(k: KegiatanPerluPerbaikan, tx: Db) {
    const penerima = await NotifikasiRepository.penerimaKegiatan(k, k.pemeriksaId, tx);
    const judul = `Perlu perbaikan: ${k.judul}`;
    await NotifikasiRepository.buatBanyak(
      penerima.map((u) => ({ userId: u.id, jenis: "perlu_perbaikan", judul: judul.slice(0, 200), isi: k.catatan, kegiatanId: k.id })),
      tx,
    );
  },
};
