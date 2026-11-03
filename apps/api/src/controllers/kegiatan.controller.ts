import { KegiatanService } from "@/services/kegiatan.service";
import type { BatalkanKegiatan, DaftarQuery, IsiKegiatan, PeriksaKegiatan, SelesaikanKegiatan, UbahKegiatan } from "@/types/kegiatan.types";
import type { Konteks } from "@/types/umum.types";
import { aktorDari, requestMeta } from "@/utils/konteks";

type Id = { id: number };

export const KegiatanController = {
  // GET /api/kegiatan
  daftar: ({ query, user }: Konteks<unknown, unknown, DaftarQuery>) => KegiatanService.daftar(query, aktorDari(user)),

  // GET /api/kegiatan/:id
  detail: ({ params, user }: Konteks<unknown, Id>) => KegiatanService.detail(params.id, aktorDari(user)),

  // POST /api/kegiatan
  buat: ({ body, user, request, set }: Konteks<IsiKegiatan>) => {
    set.status = 201;
    return KegiatanService.buat(body, aktorDari(user), requestMeta(request.headers));
  },

  // PATCH /api/kegiatan/:id
  ubah: ({ params, body, user, request }: Konteks<UbahKegiatan, Id>) => KegiatanService.ubah(params.id, body, aktorDari(user), requestMeta(request.headers)),

  // POST /api/kegiatan/:id/pemeriksaan
  periksa: ({ params, body, user, request }: Konteks<PeriksaKegiatan, Id>) =>
    KegiatanService.periksa(params.id, body, aktorDari(user), requestMeta(request.headers)),

  // POST /api/kegiatan/:id/selesai
  selesaikan: ({ params, body, user, request }: Konteks<SelesaikanKegiatan, Id>) =>
    KegiatanService.selesaikan(params.id, body, aktorDari(user), requestMeta(request.headers)),

  // POST /api/kegiatan/:id/batalkan
  batalkan: ({ params, body, user, request }: Konteks<BatalkanKegiatan, Id>) =>
    KegiatanService.batalkan(params.id, body, aktorDari(user), requestMeta(request.headers)),

  // DELETE /api/kegiatan/:id — balasan kosong 204
  hapus: async ({ params, user, request, set }: Konteks<unknown, Id>) => {
    await KegiatanService.hapus(params.id, aktorDari(user), requestMeta(request.headers));
    set.status = 204;
  },
};
