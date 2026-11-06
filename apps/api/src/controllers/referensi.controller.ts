import { ReferensiService } from "@/services/referensi.service";

/**
 * Controller data referensi untuk isian form (bidang, jenis, pegawai).
 * Setiap fungsi menerima konteks permintaan dari Elysia, mengambil bagian yang perlu, lalu menyerahkan pekerjaannya ke service.
 */
export const ReferensiController = {
  /**
   * GET /api/referensi
   */
  semua: () => ReferensiService.semua(),
};
