"use client";

import { useEffect, useState } from "react";

// Hitung mundur per detik ke waktu target, format "MM:SS"

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
