import { KegiatanService } from "@/services/kegiatan.service";
import type { BatalkanKegiatan, DaftarQuery, IsiKegiatan, PeriksaKegiatan, SelesaikanKegiatan, UbahKegiatan } from "@/types/kegiatan.types";
import type { Konteks } from "@/types/umum.types";
import { aktorDari } from "@/utils/konteks";

/**
 * Bentuk parameter URL :id. Validator sudah mengubahnya dari teks menjadi angka sebelum sampai ke sini.
 */
type Id = { id: number };

/**
 * KONSEP controller: lapisan tipis antara rute dan service. Controller TIDAK berisi aturan bisnis;
 * ia hanya mengambil body/params/query/user dari konteks permintaan, mengubah user menjadi Aktor
 * (aktorDari), lalu memanggil service. Nilai yang di-return otomatis dikirim Elysia sebagai JSON.
 * `set.status` mengubah kode status HTTP, mis. 201 (data baru dibuat) atau 204 (berhasil tanpa isi).
 */
export const KegiatanController = {
  /**
   * GET /api/kegiatan
   */
  daftar: ({ query, user }: Konteks<unknown, unknown, DaftarQuery>) => KegiatanService.daftar(query, aktorDari(user)),

  /**
   * GET /api/kegiatan/:id
   */
  detail: ({ params, user }: Konteks<unknown, Id>) => KegiatanService.detail(params.id, aktorDari(user)),

  /**
   * POST /api/kegiatan
   */
  buat: ({ body, user, set }: Konteks<IsiKegiatan>) => {
    set.status = 201;
    return KegiatanService.buat(body, aktorDari(user));
  },

  /**
   * PATCH /api/kegiatan/:id
   */
  ubah: ({ params, body, user }: Konteks<UbahKegiatan, Id>) => KegiatanService.ubah(params.id, body, aktorDari(user)),

  /**
   * POST /api/kegiatan/:id/pemeriksaan
   */
  periksa: ({ params, body, user }: Konteks<PeriksaKegiatan, Id>) =>
    KegiatanService.periksa(params.id, body, aktorDari(user)),

  /**
   * POST /api/kegiatan/:id/selesai
   */
  selesaikan: ({ params, body, user }: Konteks<SelesaikanKegiatan, Id>) =>
    KegiatanService.selesaikan(params.id, body, aktorDari(user)),

  /**
   * POST /api/kegiatan/:id/batalkan
   */
  batalkan: ({ params, body, user }: Konteks<BatalkanKegiatan, Id>) =>
    KegiatanService.batalkan(params.id, body, aktorDari(user)),

  /**
   * DELETE /api/kegiatan/:id — balasan kosong 204
   */
  hapus: async ({ params, user, set }: Konteks<unknown, Id>) => {
    await KegiatanService.hapus(params.id, aktorDari(user));
    set.status = 204;
  },
};
