"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Tombol Kembali di HP menutup dialog/sheet yang terbuka, bukan meninggalkan halaman

// Kunci entri riwayat milik lapisan yang sedang terbuka
const aktif = new Set<string>();

// Membuang entri riwayat sisa lapisan yang sudah tertutup (mis. pratinjau lalu konfirmasi, keduanya
// ditutup bersamaan) supaya satu kali Kembali langsung meninggalkan halaman, bukan "tidak terjadi apa-apa"
function buangSisa() {
  const kunci = window.history.state?.__lapisan;
  if (!kunci || aktif.has(kunci)) return;
  window.history.back();
  setTimeout(buangSisa, 60);
}

export function useTutupLewatKembali(open: boolean, tutup: () => void) {
  const tutupRef = useRef(tutup);
  useEffect(() => {
    tutupRef.current = tutup;
  });

  useEffect(() => {
    if (!open) return;
    const kunci = Math.random().toString(36).slice(2);
    const lama = window.history.state?.__lapisan;
    // Entri sisa lapisan yang sudah tutup (mis. pasang ulang StrictMode) dipakai ulang, bukan ditumpuk
    if (lama && !aktif.has(lama)) window.history.replaceState({ ...window.history.state, __lapisan: kunci }, "");
    else window.history.pushState({ ...window.history.state, __lapisan: kunci }, "");
    aktif.add(kunci);
    let lewatKembali = false;
    const onPop = () => {
      // Lapisan bertumpuk: bila entri kita masih yang aktif, yang ditutup adalah lapisan di atasnya
      if (window.history.state?.__lapisan === kunci) return;
      lewatKembali = true;
      tutupRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      aktif.delete(kunci);
      if (lewatKembali) return;
      // Ditunda: bila lapisan langsung dipasang ulang (React StrictMode) atau lapisan lain masih
      // terbuka, entri teratas milik lapisan yang aktif sehingga tidak ikut dibuang
      setTimeout(buangSisa, 0);
    };
  }, [open]);
}

// Lapisan ditutup karena navigasi (Link replace): entrinya akan diganti halaman tujuan,
// jadi kunci dilepas agar penutupan lapisan tidak memanggil history.back()
export function lepasLapisan() {
  const { __lapisan, ...sisa } = window.history.state ?? {};
  if (__lapisan) window.history.replaceState(sisa, "");
}

export function useOpenTerkendali(open: boolean | undefined, defaultOpen: boolean | undefined, onOpenChange?: (v: boolean) => void) {
  const [internal, setInternal] = useState(defaultOpen ?? false);
  const terbuka = open ?? internal;
  const ubah = useCallback(
    (v: boolean) => {
      if (open === undefined) setInternal(v);
      onOpenChange?.(v);
    },
    [open, onOpenChange],
  );
  useTutupLewatKembali(terbuka, () => ubah(false));
  return [terbuka, ubah] as const;
}
