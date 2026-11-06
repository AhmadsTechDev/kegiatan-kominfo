"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

/**
 * Animasi angka naik dari 0 ke target saat pertama tampil (ease-out)
 */

/**
 * KONSEP useEffect: menjalankan kode setelah komponen tampil di layar, mis. memulai animasi.
 * Fungsi yang di-return (cancelAnimationFrame) adalah "pembersih" yang dijalankan saat komponen hilang,
 * agar animasi tidak terus berjalan di latar belakang.
 * requestAnimationFrame memanggil `langkah` sekali per frame layar (biasanya 60 kali per detik).
 * @param target angka akhir
 * @param durasi lama animasi dalam milidetik
 * @returns angka yang sedang ditampilkan
 */
export function useCountUp(target: number, durasi = 600) {
  const kurangiGerak = usePrefersReducedMotion();
  const [nilai, setNilai] = useState(0);
  const [selesai, setSelesai] = useState(false);

  useEffect(() => {
    if (kurangiGerak || selesai) return;
    const mulai = performance.now();
    let frame = 0;
    const langkah = (sekarang: number) => {
      const t = Math.min((sekarang - mulai) / durasi, 1);

      /**
       * Rumus ease-out: angka naik cepat di awal lalu melambat menjelang akhir, terasa lebih alami.
       */
      const easeOut = 1 - Math.pow(1 - t, 3);
      setNilai(Math.round(target * easeOut));
      if (t < 1) frame = requestAnimationFrame(langkah);
      else setSelesai(true);
    };
    frame = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(frame);
  }, [target, durasi, kurangiGerak, selesai]);

  return kurangiGerak || selesai ? target : nilai;
}

