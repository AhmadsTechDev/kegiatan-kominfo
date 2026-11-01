import { UserService } from "@/services/user.service";
import type { Konteks } from "@/types/umum.types";
import type { BuatAkun, DaftarAkunQuery, HubungkanAkun, UbahAkun } from "@/types/user.types";
import { adminDari } from "@/utils/konteks";

type Id = { id: string };

export const UserController = {
  // GET /api/admin/akun
  daftar: ({ query }: Konteks<unknown, unknown, DaftarAkunQuery>) => UserService.daftar(query),

  // POST /api/admin/akun
  buat: ({ body, user, request, set }: Konteks<BuatAkun>) => {
    set.status = 201;
    return UserService.buat(body, adminDari(user, request));
  },

  // PATCH /api/admin/akun/:id
  ubah: ({ params, body, user, request }: Konteks<UbahAkun, Id>) => UserService.ubah(params.id, body, adminDari(user, request)),

  // POST /api/admin/akun/:id/nonaktifkan
  nonaktifkan: ({ params, body, user, request }: Konteks<{ alasan?: string }, Id>) =>
    UserService.nonaktifkan(params.id, body.alasan, adminDari(user, request)),

  // POST /api/admin/akun/:id/aktifkan
  aktifkan: ({ params, user, request }: Konteks<unknown, Id>) => UserService.aktifkan(params.id, adminDari(user, request)),

  // DELETE /api/admin/akun/:id
  hapus: ({ params, user, request }: Konteks<unknown, Id>) => UserService.hapus(params.id, adminDari(user, request)),

  // POST /api/admin/akun/:id/hubungkan-pegawai
  hubungkan: ({ params, body, user, request }: Konteks<HubungkanAkun, Id>) => UserService.hubungkanPegawai(params.id, body, adminDari(user, request)),

  // POST /api/admin/akun/:id/reset-sandi
  resetSandi: ({ params, body, user, request }: Konteks<{ password: string }, Id>) =>
    UserService.resetSandi(params.id, body.password, adminDari(user, request)),
};
