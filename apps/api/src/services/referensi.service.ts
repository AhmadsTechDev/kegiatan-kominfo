import { ReferensiRepository } from "@/repositories/referensi.repository";

/**
 * Mengumpulkan id unit akar beserta seluruh turunannya (bidang -> seksi -> ...)
 *
 * Cara kerja: `hasil` dipakai sekaligus sebagai antrean. Untuk setiap id di `hasil`, semua unit yang induknya id tersebut
 * ditambahkan ke belakang, lalu perulangan ikut memeriksanya juga (penelusuran melebar / breadth-first).
 * Pengecekan `includes` mencegah id yang sama masuk dua kali.
 * @param unit daftar semua unit (id dan id induk)
 * @param akarId unit awal
 * @returns id unit awal beserta seluruh turunannya
 */
export function unitDanTurunan(unit: { id: number; parentId: number | null }[], akarId: number): number[] {
  const hasil = [akarId];
  for (let i = 0; i < hasil.length; i++) {
    for (const u of unit) if (u.parentId === hasil[i] && !hasil.includes(u.id)) hasil.push(u.id);
  }
  return hasil;
}

/**
 * Menelusuri ke atas sampai unit tertinggi (tanpa induk)
 *
 * `dilihat` mencatat unit yang sudah dilewati, sehingga perulangan tetap berhenti walaupun data induknya
 * keliru membentuk lingkaran (A induknya B, B induknya A).
 * @param unit daftar semua unit
 * @param id unit awal
 * @returns unit paling atas (tanpa induk), atau undefined bila id tidak ditemukan
 */
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
  /**
   * Data pilihan formulir: bidang, jenis kegiatan aktif, dan pegawai aktif
   */
  async semua() {
    const [bidang, jenisKegiatan, pegawai] = await Promise.all([
      ReferensiRepository.semuaBidang(),
      ReferensiRepository.jenisKegiatanAktif(),
      ReferensiRepository.pegawaiAktif(),
    ]);
    return { bidang, jenisKegiatan, pegawai };
  },

  /**
   * Id unit beserta seluruh turunannya, diambil dari basis data
   */
  async unitDanTurunan(akarId: number) {
    return unitDanTurunan(await ReferensiRepository.semuaBidang(), akarId);
  },
};
