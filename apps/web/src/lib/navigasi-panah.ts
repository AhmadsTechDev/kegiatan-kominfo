// =============================================================================
// NAVIGASI PANAH UNTUK TAB DAN GRUP PILIHAN
// =============================================================================
// Gunanya: Pola keyboard ARIA untuk role="tablist" dan role="radiogroup": panah
// kiri/kanan/atas/bawah berpindah sekaligus memilih, Home/End ke ujung, dan hanya
// pilihan aktif yang masuk urutan Tab (roving tabindex).
//
// Isi berkas:
//   - tanganiPanah : penangan onKeyDown di wadah grup; memilih dan memfokuskan pilihan baru
//   - tabIndexPilihan : tabIndex 0 untuk pilihan aktif (atau pilihan pertama bila belum ada)
//
// Dipakai oleh: PilihanTab (admin-shared.tsx), PilihRole (akun-aksi.tsx), PanelTema (panel-preferensi.tsx)
// =============================================================================

const PILIHAN = '[role="tab"]:not(:disabled), [role="radio"]:not(:disabled)';

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

export const tabIndexPilihan = <T>(nilai: T, sekarang: T | undefined, pertama: T) =>
  nilai === sekarang || (sekarang === undefined && nilai === pertama) ? 0 : -1;
