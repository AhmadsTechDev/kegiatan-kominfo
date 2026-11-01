import { KalenderService } from "@/services/kalender.service";
import type { KalenderQuery } from "@/types/kalender.types";
import type { Konteks } from "@/types/umum.types";
import { aktorDari } from "@/utils/konteks";

export const KalenderController = {
  // GET /api/kalender
  bulan: ({ query, user }: Konteks<unknown, unknown, KalenderQuery>) => KalenderService.bulan(query.bulan, aktorDari(user)),
};
