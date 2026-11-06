import { PantauService } from "@/services/pantau.service";
import type { PantauQuery } from "@/types/pantau.types";
import type { Konteks } from "@/types/umum.types";
import { aktorDari } from "@/utils/konteks";

/**
 * Controller ringkasan pemantauan untuk pimpinan dan admin.
 * Setiap fungsi menerima konteks permintaan dari Elysia, mengambil bagian yang perlu, lalu menyerahkan pekerjaannya ke service.
 */
export const PantauController = {
  /**
   * GET /api/pantau/ringkasan
   */
  ringkasan: ({ query, user }: Konteks<unknown, unknown, PantauQuery>) => PantauService.ringkasan(query, aktorDari(user)),
};
