import { ReferensiRepository } from "@/repositories/referensi.repository";

export function unitDanTurunan(unit: { id: number; parentId: number | null }[], akarId: number): number[] {
  const hasil = [akarId];
  for (let i = 0; i < hasil.length; i++) {
    for (const u of unit) if (u.parentId === hasil[i] && !hasil.includes(u.id)) hasil.push(u.id);
  }
  return hasil;
}

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
  async semua() {
    const [bidang, jenisKegiatan, pegawai] = await Promise.all([
      ReferensiRepository.semuaBidang(),
      ReferensiRepository.jenisKegiatanAktif(),
      ReferensiRepository.pegawaiAktif(),
    ]);
    return { bidang, jenisKegiatan, pegawai };
  },

  async unitDanTurunan(akarId: number) {
    return unitDanTurunan(await ReferensiRepository.semuaBidang(), akarId);
  },
};
