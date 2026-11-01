import { PermintaanAkunService } from "@/services/permintaan-akun.service";
import type { DaftarPermintaanQuery, IsiPermintaan, SetujuiPermintaan } from "@/types/permintaan-akun.types";
import type { Konteks } from "@/types/umum.types";
import { adminDari, requestMeta } from "@/utils/konteks";

type Id = { id: number };

export const PermintaanAkunController = {
  // POST /api/permintaan-akun (tanpa login)
  ajukan: ({ body, request, set }: Pick<Konteks<IsiPermintaan>, "body" | "request" | "set">) => {
    set.status = 201;
    return PermintaanAkunService.ajukan(body, requestMeta(request.headers));
  },

  // GET /api/admin/permintaan-akun
  daftar: ({ query }: Konteks<unknown, unknown, DaftarPermintaanQuery>) => PermintaanAkunService.daftar(query),

  // GET /api/admin/permintaan-akun/jumlah
  jumlah: async () => ({ menunggu: await PermintaanAkunService.jumlahMenunggu() }),

  // POST /api/admin/permintaan-akun/:id/setujui
  setujui: ({ params, body, user, request }: Konteks<SetujuiPermintaan, Id>) => PermintaanAkunService.setujui(params.id, body, adminDari(user, request)),

  // POST /api/admin/permintaan-akun/:id/tolak
  tolak: ({ params, body, user, request }: Konteks<{ alasan: string }, Id>) => PermintaanAkunService.tolak(params.id, body.alasan, adminDari(user, request)),
};
