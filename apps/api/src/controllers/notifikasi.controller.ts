import { NotifikasiService } from "@/services/notifikasi.service";
import type { Konteks } from "@/types/umum.types";

type Id = { id: number };

export const NotifikasiController = {
  // GET /api/notifikasi
  daftar: ({ user }: Konteks) => NotifikasiService.daftar(user.id),

  // POST /api/notifikasi/:id/baca
  baca: ({ params, user }: Konteks<unknown, Id>) => NotifikasiService.baca(user.id, params.id),

  // POST /api/notifikasi/baca-semua
  bacaSemua: ({ user }: Konteks) => NotifikasiService.baca(user.id),
};
