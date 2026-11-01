import { ReferensiRepository } from "@/repositories/referensi.repository";

// Mengumpulkan id unit akar beserta seluruh turunannya (bidang -> seksi -> ...)
export function unitDanTurunan(unit: { id: number; parentId: number | null }[], akarId: number): number[] {
  const hasil = [akarId];
  for (let i = 0; i < hasil.length; i++) {
    for (const u of unit) if (u.parentId === hasil[i] && !hasil.includes(u.id)) hasil.push(u.id);
  }
  return hasil;
}

// Menelusuri ke atas sampai unit tertinggi (tanpa induk)
export function cariIndukTertinggi<T extends { id: number; parentId: number | null }>(unit: T[], id: number): T | undefined {
  let u = unit.find((x) => x.id === id);
  const dilihat = new Set<number>();
  while (u?.parentId != null && !dilihat.has(u.id)) {
    dilihat.add(u.id);
    u = unit.find((x) => x.id === u!.parentId);
  }
  return u;
}

export const ReferensiService = {
  // Data pilihan formulir: unit kerja, jenis kegiatan aktif, dan pegawai aktif
  async semua() {
    const [unitKerja, jenisKegiatan, pegawai] = await Promise.all([
      ReferensiRepository.semuaUnitKerja(),
      ReferensiRepository.jenisKegiatanAktif(),
      ReferensiRepository.pegawaiAktif(),
    ]);
    return { unitKerja, jenisKegiatan, pegawai };
  },

  // Id unit beserta seluruh turunannya, diambil dari basis data
  async unitDanTurunan(akarId: number) {
    return unitDanTurunan(await ReferensiRepository.semuaUnitKerja(), akarId);
  },
};
