import { DashboardService } from "@/services/dashboard.service";
import type { DashboardQuery } from "@/types/dashboard.types";
import type { Konteks } from "@/types/umum.types";
import { aktorDari } from "@/utils/konteks";
import { parsePeriode } from "@/utils/periode";

/**
 * Controller dashboard dan beranda pribadi.
 * Setiap fungsi menerima konteks permintaan dari Elysia, mengambil bagian yang perlu, lalu menyerahkan pekerjaannya ke service.
 */
export const DashboardController = {
  /**
   * GET /api/dashboard
   */
  ringkasan: ({ query, user }: Konteks<unknown, unknown, DashboardQuery>) =>
    DashboardService.ringkasan(parsePeriode(query.periode), aktorDari(user)),

  /**
   * GET /api/dashboard/saya
   */
  saya: ({ user }: Konteks) => DashboardService.saya(aktorDari(user)),
};
