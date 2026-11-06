"use client";

import { useCurrentUser } from "./use-current-user";
import { useProfil } from "./use-profil";

/**
 * Lingkup bidang yang boleh dilihat (pegawai: unitnya, pimpinan/admin: semua) dan saringUnit
 */

type UnitPohon = { id: number; parentId: number | null };

/**
 * Versi frontend dari lingkup baca backend: pegawai hanya melihat bidangnya dan sub bidang di bawahnya.
 * Dipakai untuk menyaring pilihan filter bidang agar tidak menampilkan bidang yang datanya tidak bisa dilihat.
 * Perulangan di saringUnit diulang sampai tidak ada id baru, supaya turunan di tingkat berapa pun ikut masuk.
 * @returns terbatas (true untuk pegawai), unit milik pegawai, dan fungsi saringUnit
 */
export function useLingkupPegawai() {
  const { user } = useCurrentUser();
  const terbatas = user?.role === "PEGAWAI";
  const unit = useProfil(terbatas).data?.pegawai?.bidang ?? null;

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
