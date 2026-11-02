import { t } from "elysia";
import { KegiatanValidator } from "./kegiatan.validator";

export const PantauValidator = {
  query: t.Pick(KegiatanValidator.daftarQuery, ["q", "unit", "pegawai", "dari", "sampai"]),
};
