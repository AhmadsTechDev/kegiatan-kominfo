// =============================================================================
// HOOK LINGKUP DATA PEGAWAI (useLingkupPegawai)
// =============================================================================
// Gunanya: Menentukan batasan akses data unit kerja (pegawai dibatasi ke unit dan cabangnya,
// sedangkan pimpinan/admin melihat seluruh dinas) serta menyediakan fungsi penyaring saringUnit.
//
// Isi berkas:
//   - useLingkupPegawai : hook penghitung status terbatas, unit kerja pegawai, dan fungsi saringUnit
//
// Dipakai oleh: Komponen filter daftar kegiatan dan halaman rekapitulasi
// =============================================================================

"use client";

import { useCurrentUser } from "./use-current-user";
import { useProfil } from "./use-profil";

type UnitPohon = { id: number; parentId: number | null };

export function useLingkupPegawai() {
  const { user } = useCurrentUser();
  const terbatas = user?.role === "PEGAWAI";
  const unit = useProfil(terbatas).data?.pegawai?.unitKerja ?? null;

  function saringUnit<T extends UnitPohon>(semua: T[]): T[] {
    if (!terbatas) return semua;
    if (!unit) return [];
    const ids = new Set([unit.id]);
    for (let bertambah = true; bertambah; ) {
      bertambah = false;
      for (const u of semua) {
        if (u.parentId != null && ids.has(u.parentId) && !ids.has(u.id)) {
          ids.add(u.id);
          bertambah = true;
        }
      }
    }
    return semua.filter((u) => ids.has(u.id));
  }

  return { terbatas, unit, saringUnit };
}
