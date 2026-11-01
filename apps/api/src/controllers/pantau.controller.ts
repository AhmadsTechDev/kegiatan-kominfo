import { PantauService } from "@/services/pantau.service";
import type { PantauQuery } from "@/types/pantau.types";
import type { Konteks } from "@/types/umum.types";
import { aktorDari } from "@/utils/konteks";

export const PantauController = {
  // GET /api/pantau/ringkasan
  ringkasan: ({ query, user }: Konteks<unknown, unknown, PantauQuery>) => PantauService.ringkasan(query, aktorDari(user)),
};
