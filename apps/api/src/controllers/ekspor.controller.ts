import { EksporService } from "@/services/ekspor.service";
import type { FormatEkspor } from "@/types/ekspor.types";
import type { RekapQuery } from "@/types/rekap.types";
import type { Konteks } from "@/types/umum.types";
import { aktorDari, requestMeta } from "@/utils/konteks";

const MIME: Record<FormatEkspor, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

type KonteksEkspor = Konteks<unknown, unknown, RekapQuery>;

// Membuat handler unduh berkas untuk format tertentu (xlsx atau pdf)
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

export const EksporController = {
  // GET /api/ekspor/kegiatan.xlsx
  excel: unduh("xlsx"),

  // GET /api/ekspor/kegiatan.pdf
  pdf: unduh("pdf"),

  // GET /api/ekspor/pratinjau
  pratinjau: ({ query, user }: KonteksEkspor) => EksporService.pratinjau(query, { ...aktorDari(user), nama: user.name }),
};
