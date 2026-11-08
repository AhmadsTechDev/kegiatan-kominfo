import { and, count, eq, inArray } from "drizzle-orm";
import { drafKegiatan, kegiatan, pegawai, user } from "@/db/schema";
import { db } from "@/lib/db";
import type { FilterDaftar } from "@/types/kegiatan.types";
import { kondisiDaftar } from "./kegiatan.repository";

export const PantauRepository = {
  /**
   * Jumlah kegiatan per status pemeriksaan (terkirim, perlu_perbaikan)
   */
  perStatus(f: FilterDaftar, sekarang: Date) {
    return db.select({ status: kegiatan.statusPemeriksaan, jumlah: count() }).from(kegiatan).where(kondisiDaftar(f, sekarang)).groupBy(kegiatan.statusPemeriksaan);
  },

  /**
   * Jumlah draf yang belum dikirim, bisa dibatasi per pegawai atau per bidang pemiliknya
   */
  jumlahDraf(f: Pick<FilterDaftar, "unitIds" | "pegawaiId">) {
    if (!f.pegawaiId && !f.unitIds) return db.$count(drafKegiatan);
    const pegawaiBidang = f.unitIds ? db.select({ id: pegawai.id }).from(pegawai).where(inArray(pegawai.bidangId, f.unitIds)) : undefined;
    const pemilik = db
      .select({ id: user.id })
      .from(user)
      .where(and(f.pegawaiId ? eq(user.pegawaiId, f.pegawaiId) : undefined, pegawaiBidang ? inArray(user.pegawaiId, pegawaiBidang) : undefined));
    return db.$count(drafKegiatan, inArray(drafKegiatan.pemilikId, pemilik));
  },
};
