import { RekapService } from "@/services/rekap.service";
import type { RekapPeriodeQuery } from "@/types/rekap.types";
import type { Konteks } from "@/types/umum.types";
import { aktorDari } from "@/utils/konteks";

export const RekapController = {
  // GET /api/rekap
  rekap: ({ query, user }: Konteks<unknown, unknown, RekapPeriodeQuery>) => RekapService.rekap(query, aktorDari(user)),
};
