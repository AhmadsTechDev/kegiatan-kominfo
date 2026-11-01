import { DrafKegiatanService } from "@/services/draf-kegiatan.service";
import type { SimpanDraf } from "@/types/draf-kegiatan.types";
import type { Konteks } from "@/types/umum.types";

type Id = { id: number };

export const DrafKegiatanController = {
  // GET /api/draf-kegiatan
  daftar: ({ user }: Konteks) => DrafKegiatanService.daftar(user.id),

  // GET /api/draf-kegiatan/:id
  detail: ({ params, user }: Konteks<unknown, Id>) => DrafKegiatanService.detail(params.id, user.id),

  // POST /api/draf-kegiatan
  buat: ({ body, user, set }: Konteks<SimpanDraf>) => {
    set.status = 201;
    return DrafKegiatanService.buat(user.id, body.isi);
  },

  // PUT /api/draf-kegiatan/:id
  ubah: ({ params, body, user }: Konteks<SimpanDraf, Id>) => DrafKegiatanService.ubah(params.id, user.id, body.isi),

  // DELETE /api/draf-kegiatan/:id — balasan kosong 204
  hapus: async ({ params, user, set }: Konteks<unknown, Id>) => {
    await DrafKegiatanService.hapus(params.id, user.id);
    set.status = 204;
  },
};
