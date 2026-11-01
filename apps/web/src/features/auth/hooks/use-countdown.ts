// =============================================================================
// HOOK DAN UTILITAS HITUNG MUNDUR (useCountdown & formatSisaWaktu)
// =============================================================================
// Gunanya: Menghitung sisa detik menuju batas target secara realtime per detik dan
// memformat angka detik menjadi representasi string "MM:SS".
//
// Isi berkas:
//   - useCountdown    : hook penghitung sisa detik menuju target waktu (mis. akun terkunci)
//   - formatSisaWaktu : fungsi pemformat angka detik menjadi tampilan format "MM:SS"
//
// Catatan penting:
//   - Menyimpan timestamp waktu saat ini; sisa detik dihitung dinamis untuk menghindari efek samping render.
//
// Dipakai oleh: LoginForm (frontend/src/features/auth/components/login-form.tsx)
// =============================================================================

"use client";

import { useEffect, useState } from "react";

export function useCountdown(sampai: Date | undefined, mulai: number) {
  const [sekarang, setSekarang] = useState<number | null>(null);

  useEffect(() => {
    if (!sampai) return;
    const timer = setInterval(() => {
      const waktu = Date.now();
      setSekarang(waktu);
      if (waktu >= sampai.getTime()) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [sampai]);

  if (!sampai) return null;
  const acuan = Math.max(sekarang ?? mulai, mulai);
  const detik = Math.ceil((sampai.getTime() - acuan) / 1000);
  return detik > 0 ? detik : null;
}

export function formatSisaWaktu(detik: number) {
  const menit = Math.floor(detik / 60);
  return `${String(menit).padStart(2, "0")}:${String(detik % 60).padStart(2, "0")}`;
}
