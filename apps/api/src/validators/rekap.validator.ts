import { t } from "elysia";
import { SATUAN_REKAP } from "@/utils/konstanta";
import { KegiatanValidator } from "./kegiatan.validator";

const filterRekap = t.Omit(KegiatanValidator.daftarQuery, ["milik", "page", "pageSize"]);

export const RekapValidator = {
  query: filterRekap,

  dokumentasiZipQuery: t.Composite([filterRekap, t.Object({ kegiatan: t.Optional(t.Numeric({ minimum: 1, error: "Kegiatan tidak valid" })) })]),
  rekapQuery: t.Composite([
    filterRekap,
    t.Object({ satuan: t.Optional(t.Union(SATUAN_REKAP.map((s) => t.Literal(s)), { error: "Satuan harus hari, bulan, atau tahun" })) }),
  ]),
};
