import { KegiatanRepository } from "@/repositories/kegiatan.repository";
import { ReferensiRepository } from "@/repositories/referensi.repository";
import type { Aktor } from "@/types/umum.types";
import { kodePeriode, parsePeriode, periodeSekarang, rentangPeriode } from "@/utils/periode";
import { lingkupBaca } from "./kegiatan.service";
import { cariIndukTertinggi } from "./referensi.service";

/**
 * Service kalender. Paling banyak 1.000 kegiatan per bulan dikirim; bila tercapai, `terpotong` memberi tahu frontend bahwa ada yang tidak tampil.
 */
const BATAS = 1000;

export const KalenderService = {
  /**
   * Kegiatan dalam satu bulan untuk tampilan kalender; tiap kegiatan diberi id unit induknya (untuk warna)
   */
  async bulan(bulan: string | undefined, aktor: Aktor, sekarang = new Date()) {
    const periode = parsePeriode(bulan, sekarang);
    const [items, unit] = await Promise.all([
      KegiatanRepository.kalender(rentangPeriode(periode), await lingkupBaca(aktor), sekarang, BATAS),
      ReferensiRepository.semuaBidang(),
    ]);
    const unitInduk = unit.filter((u) => u.parentId == null).map((u) => ({ id: u.id, nama: u.nama }));
    return {
      bulan: kodePeriode(periode),
      bulanSekarang: kodePeriode(periodeSekarang(sekarang)),
      unitInduk,

      /**
       * Setiap kegiatan diberi id bidang induk tertingginya, karena warna di kalender ditentukan per bidang induk.
       */
      items: items.map((k) => ({ ...k, unitIndukId: cariIndukTertinggi(unit, k.bidang.id)?.id ?? k.bidang.id })),
      terpotong: items.length >= BATAS,
    };
  },
};
