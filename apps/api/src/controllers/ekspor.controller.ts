import { EksporService } from "@/services/ekspor.service";
import type { FormatEkspor } from "@/types/ekspor.types";
import type { DokumentasiZipQuery, RekapQuery } from "@/types/rekap.types";
import { disposisi } from "@/utils/berkas";
import type { Konteks } from "@/types/umum.types";
import { aktorDari, requestMeta } from "@/utils/konteks";

const MIME: Record<FormatEkspor, string> = {
  pdf: "application/pdf",
};

type KonteksEkspor = Konteks<unknown, unknown, RekapQuery>;

/**
 * Membuat handler unduh berkas untuk format tertentu (saat ini hanya PDF)
 */
const unduh = (format: FormatEkspor) => async ({ query, user, request }: KonteksEkspor) => {
  const hasil = await EksporService.buat(format, query, { ...aktorDari(user), nama: user.name }, requestMeta(request.headers));
  return new Response(hasil.isi, {
    headers: {
      "Content-Type": MIME[format],
      "Content-Disposition": `attachment; filename="${hasil.nama}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
      "X-Jumlah-Kegiatan": String(hasil.jumlah),
    },
  });
};

/**
 * Controller ekspor laporan (PDF, pratinjau JSON, dan ZIP dokumentasi).
 * Setiap fungsi menerima konteks permintaan dari Elysia, mengambil bagian yang perlu, lalu menyerahkan pekerjaannya ke service.
 */
export const EksporController = {
  /**
   * GET /api/ekspor/kegiatan.pdf
   */
  pdf: unduh("pdf"),

  /**
   * GET /api/ekspor/dokumentasi.zip — semua dokumentasi pada cakupan, atau satu kegiatan bila ?kegiatan= diisi
   */
  dokumentasiZip: async ({ query, user, request }: Konteks<unknown, unknown, DokumentasiZipQuery>) => {
    const hasil = await EksporService.dokumentasiZip(query, { ...aktorDari(user), nama: user.name }, requestMeta(request.headers));
    return new Response(hasil.aliran, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": disposisi("attachment", hasil.nama),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  },

  /**
   * GET /api/ekspor/dokumentasi
   */
  dokumentasi: ({ query, user }: KonteksEkspor) => EksporService.dokumentasi(query, aktorDari(user)),

  /**
   * GET /api/ekspor/pratinjau
   */
  pratinjau: ({ query, user }: KonteksEkspor) => EksporService.pratinjau(query, { ...aktorDari(user), nama: user.name }),
};
