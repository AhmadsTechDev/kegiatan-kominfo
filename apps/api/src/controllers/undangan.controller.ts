import { UndanganService } from "@/services/undangan.service";
import type { Konteks } from "@/types/umum.types";
import type { UndangBody } from "@/types/undangan.types";
import { adminDari } from "@/utils/konteks";

/**
 * Controller undangan akun untuk pegawai.
 * Setiap fungsi menerima konteks permintaan dari Elysia, mengambil bagian yang perlu, lalu menyerahkan pekerjaannya ke service.
 */
export const UndanganController = {
  /**
   * POST /api/admin/pegawai/:id/undang
   */
  undang: ({ params, body, user, request }: Konteks<UndangBody, { id: number }>) =>
    UndanganService.undang({ pegawaiId: params.id, email: body.email, role: body.role }, adminDari(user, request)),
};
