import { PantauRepository } from "@/repositories/pantau.repository";
import type { PantauQuery } from "@/types/pantau.types";
import type { Aktor } from "@/types/umum.types";
import { filterDariQuery } from "./kegiatan.service";

export const PantauService = {
  // Ringkasan untuk pimpinan: jumlah kegiatan per status pemeriksaan dan jumlah draf yang belum dikirim
  async ringkasan(query: PantauQuery, aktor: Aktor, sekarang = new Date()) {
    const filter = await filterDariQuery(query, aktor);
    const [perStatus, draf] = await Promise.all([PantauRepository.perStatus(filter, sekarang), PantauRepository.jumlahDraf(filter)]);
    const jumlah = (s: string) => perStatus.find((p) => p.status === s)?.jumlah ?? 0;
    const terkirim = jumlah("terkirim");
    const diperiksa = jumlah("diperiksa");
    const perluPerbaikan = jumlah("perlu_perbaikan");
    return { total: terkirim + diperiksa + perluPerbaikan, draf, terkirim, diperiksa, perluPerbaikan };
  },
};
