import { HealthService } from "@/services/health.service";

/**
 * Controller cek kesehatan server (dipakai pemantau/hosting untuk tahu API hidup).
 * Setiap fungsi menerima konteks permintaan dari Elysia, mengambil bagian yang perlu, lalu menyerahkan pekerjaannya ke service.
 */
export const HealthController = {
  /**
   * GET /api/health
   */
  cek: () => HealthService.cek(),
};
