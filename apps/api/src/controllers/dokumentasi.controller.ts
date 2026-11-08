import { DokumentasiService } from "@/services/dokumentasi.service";
import type { Konteks } from "@/types/umum.types";
import { disposisi } from "@/utils/berkas";
import { aktorDari } from "@/utils/konteks";

type Id = { id: number };
type Berkas = { berkas: File };

/**
 * Controller berkas dokumentasi kegiatan (unggah, ganti, unduh, hapus).
 * Setiap fungsi menerima konteks permintaan dari Elysia, mengambil bagian yang perlu, lalu menyerahkan pekerjaannya ke service.
 */
export const DokumentasiController = {
  /**
   * POST /api/kegiatan/:id/dokumentasi
   */
  unggah: async ({ params, body, user, set }: Konteks<Berkas, Id>) => {
    const hasil = await DokumentasiService.unggah(params.id, body.berkas, aktorDari(user));
    set.status = 201;
    return hasil;
  },

  /**
   * PUT /api/dokumentasi/:id
   */
  ganti: ({ params, body, user }: Konteks<Berkas, Id>) =>
    DokumentasiService.ganti(params.id, body.berkas, aktorDari(user)),

  /**
   * GET /api/dokumentasi/:id — mengirim berkas; ?unduh=1 memaksa peramban mengunduh
   */
  unduh: async ({ params, query, user }: Konteks<unknown, Id, { unduh?: "1" }>) => {
    const d = await DokumentasiService.unduh(params.id, aktorDari(user));
    return new Response(d.berkas, {
      headers: {
        "Content-Type": d.mime,
        "Content-Length": String(d.berkas.size),
        "Content-Disposition": disposisi(query.unduh ? "attachment" : "inline", d.namaAsli),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
        ETag: `"${d.sha256}"`,
      },
    });
  },

  /**
   * DELETE /api/dokumentasi/:id — balasan kosong 204
   */
  hapus: async ({ params, user, set }: Konteks<unknown, Id>) => {
    await DokumentasiService.hapus(params.id, aktorDari(user));
    set.status = 204;
  },
};
