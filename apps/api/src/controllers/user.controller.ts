import { UserService } from "@/services/user.service";
import type { Konteks } from "@/types/umum.types";
import type { DaftarAkunQuery, IsiAkun } from "@/types/user.types";
import { adminDari } from "@/utils/konteks";

type Id = { id: string };

/**
 * Controller manajemen akun oleh admin.
 * Setiap fungsi menerima konteks permintaan dari Elysia, mengambil bagian yang perlu, lalu menyerahkan pekerjaannya ke service.
 */
export const UserController = {
  /**
   * GET /api/admin/akun
   */
  daftar: ({ query }: Konteks<unknown, unknown, DaftarAkunQuery>) => UserService.daftar(query),

  /**
   * GET /api/admin/akun/:id
   */
  detail: ({ params }: Konteks<unknown, Id>) => UserService.detail(params.id),

  /**
   * POST /api/admin/akun
   */
  buat: ({ body, user, request, set }: Konteks<IsiAkun>) => {
    set.status = 201;
    return UserService.buat(body, adminDari(user, request));
  },

  /**
   * PATCH /api/admin/akun/:id
   */
  ubah: ({ params, body, user, request }: Konteks<IsiAkun, Id>) => UserService.ubah(params.id, body, adminDari(user, request)),

  /**
   * POST /api/admin/akun/:id/nonaktifkan
   */
  nonaktifkan: ({ params, body, user, request }: Konteks<{ alasan?: string }, Id>) =>
    UserService.nonaktifkan(params.id, body.alasan, adminDari(user, request)),

  /**
   * POST /api/admin/akun/:id/aktifkan
   */
  aktifkan: ({ params, user, request }: Konteks<unknown, Id>) => UserService.aktifkan(params.id, adminDari(user, request)),

  /**
   * DELETE /api/admin/akun/:id
   */
  hapus: ({ params, user, request }: Konteks<unknown, Id>) => UserService.hapus(params.id, adminDari(user, request)),

  /**
   * POST /api/admin/akun/:id/kirim-ulang-undangan
   */
  kirimUlangUndangan: ({ params, user, request }: Konteks<unknown, Id>) => UserService.kirimUlangUndangan(params.id, adminDari(user, request)),

  /**
   * POST /api/admin/akun/:id/reset-sandi
   */
  resetSandi: ({ params, user, session, request }: Konteks<unknown, Id>) => UserService.resetSandi(params.id, adminDari(user, request, session)),

  /**
   * POST /api/admin/akun/:id/cabut-sesi
   */
  cabutSesi: ({ params, user, session, request }: Konteks<unknown, Id>) => UserService.cabutSesi(params.id, adminDari(user, request, session)),
};
