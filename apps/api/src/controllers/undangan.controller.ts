import { UndanganService } from "@/services/undangan.service";
import type { Konteks } from "@/types/umum.types";
import type { UndangBody } from "@/types/undangan.types";
import { adminDari } from "@/utils/konteks";

export const UndanganController = {
  // POST /api/admin/pegawai/:id/undang
  undang: ({ params, body, user, request }: Konteks<UndangBody, { id: number }>) =>
    UndanganService.undang({ pegawaiId: params.id, email: body.email, role: body.role }, adminDari(user, request)),

  // GET /api/aktivasi?token=... (tanpa login)
  infoToken: ({ query }: Pick<Konteks<unknown, unknown, { token: string }>, "query">) => UndanganService.infoToken(query.token),
};
