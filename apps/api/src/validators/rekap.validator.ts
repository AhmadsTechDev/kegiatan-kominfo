import { t } from "elysia";
import { SATUAN_REKAP } from "@/utils/konstanta";
import { KegiatanValidator } from "./kegiatan.validator";

// Filter rekap = filter daftar kegiatan tanpa paginasi dan tanpa filter "milik"
const filterRekap = t.Omit(KegiatanValidator.daftarQuery, ["milik", "page", "pageSize"]);

export const RekapValidator = {
  // Dipakai juga oleh endpoint ekspor
  query: filterRekap,
  // Unduh dokumentasi sebagai ZIP: cakupan laporan, opsional satu kegiatan saja
  dokumentasiZipQuery: t.Composite([filterRekap, t.Object({ kegiatan: t.Optional(t.Numeric({ minimum: 1, error: "Kegiatan tidak valid" })) })]),
  rekapQuery: t.Composite([
    filterRekap,
    t.Object({ satuan: t.Optional(t.Union(SATUAN_REKAP.map((s) => t.Literal(s)), { error: "Satuan harus hari, bulan, atau tahun" })) }),
  ]),
};
