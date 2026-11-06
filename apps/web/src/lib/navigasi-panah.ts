/**
 * Navigasi panah keyboard untuk tablist/radiogroup (roving tabindex, Home/End)
 */

const PILIHAN = '[role="tab"]:not(:disabled), [role="radio"]:not(:disabled)';

/**
 * KONSEP roving tabindex: dalam sekelompok tab, hanya satu yang bisa dicapai dengan tombol Tab;
 * perpindahan antarpilihan memakai tombol panah (standar aksesibilitas WAI-ARIA).
 * Panah kanan/bawah = berikutnya, kiri/atas = sebelumnya (memutar di ujung), Home/End = pertama/terakhir.
 * @param e peristiwa keyboard dari elemen pembungkus tablist/radiogroup
 * @param daftar semua nilai pilihan, berurutan sesuai tampilan
 * @param sekarang nilai yang sedang terpilih
 * @param pilih fungsi untuk memilih nilai baru
 */
export function tanganiPanah<T>(e: React.KeyboardEvent<HTMLElement>, daftar: readonly T[], sekarang: T | undefined, pilih: (v: T) => void) {
  const i = sekarang === undefined ? -1 : daftar.indexOf(sekarang);
  const n = daftar.length;
  let j: number;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % n;
  else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + n) % n;
  else if (e.key === "Home") j = 0;
  else if (e.key === "End") j = n - 1;
  else return;
  e.preventDefault();
  pilih(daftar[j]!);
  e.currentTarget.querySelectorAll<HTMLElement>(PILIHAN)[j]?.focus();
}

/**
 * Pilihan aktif mendapat tabIndex 0 (bisa dicapai Tab), sisanya -1. Bila belum ada yang dipilih, pilihan pertama yang bisa dicapai.
 */
export const tabIndexPilihan = <T>(nilai: T, sekarang: T | undefined, pertama: T) =>
  nilai === sekarang || (sekarang === undefined && nilai === pertama) ? 0 : -1;
