// Navigasi panah keyboard untuk tablist/radiogroup (roving tabindex, Home/End)

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
