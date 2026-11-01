import { t } from "elysia";
import { KegiatanValidator } from "./kegiatan.validator";

export const PantauValidator = {
  query: t.Pick(KegiatanValidator.daftarQuery, ["unit", "pegawai", "dari", "sampai"]),
};
