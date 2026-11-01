import { ReferensiService } from "@/services/referensi.service";

export const ReferensiController = {
  // GET /api/referensi
  semua: () => ReferensiService.semua(),
};
