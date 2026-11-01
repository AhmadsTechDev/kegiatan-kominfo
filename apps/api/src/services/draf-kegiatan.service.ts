import { NotFound, Unprocessable } from "@/lib/errors";
import { DrafKegiatanRepository } from "@/repositories/draf-kegiatan.repository";
import type { IsiDraf } from "@/types/draf-kegiatan.types";

export const BATAS_DRAF = 20;

export const DrafKegiatanService = {
  // Daftar ringkas draf milik user (judul dan tanggal mulai saja)
  async daftar(pemilikId: string) {
    const baris = await DrafKegiatanRepository.daftar(pemilikId);
    return baris.map(({ id, isi, updatedAt }) => {
      const i = isi as IsiDraf;
      return { id, judul: i.judul?.trim() || null, tanggalMulai: i.tanggalMulai || null, updatedAt };
    });
  },

  // Isi lengkap satu draf milik user
  async detail(id: number, pemilikId: string) {
    const draf = await DrafKegiatanRepository.detail(id, pemilikId);
    if (!draf) throw NotFound("Draf tidak ditemukan");
    return draf;
  },

  // Menyimpan draf baru (maksimal 20 draf per user)
  async buat(pemilikId: string, isi: IsiDraf) {
    if ((await DrafKegiatanRepository.jumlah(pemilikId)) >= BATAS_DRAF) {
      throw Unprocessable(`Draf maksimal ${BATAS_DRAF}. Selesaikan atau hapus draf lama terlebih dahulu.`);
    }
    const id = await DrafKegiatanRepository.insert(pemilikId, isi);
    return DrafKegiatanService.detail(id, pemilikId);
  },

  // Mengganti isi draf
  async ubah(id: number, pemilikId: string, isi: IsiDraf) {
    if ((await DrafKegiatanRepository.update(id, pemilikId, isi)) === 0) throw NotFound("Draf tidak ditemukan");
    return DrafKegiatanService.detail(id, pemilikId);
  },

  // Menghapus draf
  async hapus(id: number, pemilikId: string) {
    if ((await DrafKegiatanRepository.hapus(id, pemilikId)) === 0) throw NotFound("Draf tidak ditemukan");
  },
};
