// =============================================================================
// HOOK FILTER KEGIATAN BERBASIS URL
// =============================================================================
// Gunanya: Mengelola status penyaringan dan paginasi daftar kegiatan yang tersimpan
// langsung di query string URL peramban agar tautan dapat dibagikan dan tahan refresh.
//
// Isi berkas:
//   - rentangDariPeriode : konversi format lama YYYY-MM menjadi rentang tanggal awal-akhir
//   - useKegiatanFilter  : hook pembaca dan pembaru parameter filter pencarian di URL
//
// Cara kerja:
//   1. Membaca nilai filter aktif dari URLSearchParams dan memvalidasi formatnya.
//   2. Mengabaikan nilai filter yang tidak valid agar tidak dikirim ke API backend.
//   3. Fungsi setFilter memperbarui URL dan otomatis mengembalikan posisi ke halaman 1.
//   4. Fungsi resetFilter membersihkan filter pencarian namun mempertahankan menu milik=saya.
//
// Catatan penting:
//   - Memenuhi standar filter dapat dibagikan (shareable URL) pada DESIGN.md bagian 5.3.
//   - Parameter milik=saya diperlakukan sebagai rute menu navigasi, bukan filter isian.
//   - Pembaruan rute menggunakan scroll: false agar posisi layar pengguna tidak meloncat.
//
// Dipakai oleh: components/kegiatan-list-view.tsx
// =============================================================================

"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { StatusPelaksanaan } from "@/components/shared/status-badge";
import type { FilterKegiatan } from "../types";

const STATUS: StatusPelaksanaan[] = ["akan_datang", "berlangsung", "selesai", "dibatalkan"];
const KUNCI = ["q", "dari", "sampai", "periode", "unit", "jenis", "status", "pegawai", "milik", "page"] as const;
const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const PERIODE = /^(\d{4})-(0[1-9]|1[0-2])$/;

function rentangDariPeriode(periode: string | null) {
  const cocok = periode ? PERIODE.exec(periode) : null;
  if (!cocok) return { dari: null, sampai: null };
  const [tahun, bulan] = [Number(cocok[1]), Number(cocok[2])];
  const hariAkhir = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
  return { dari: `${periode}-01`, sampai: `${periode}-${String(hariAkhir).padStart(2, "0")}` };
}

export function useKegiatanFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filter = useMemo<FilterKegiatan>(() => {
    const status = searchParams.get("status");
    const page = Number(searchParams.get("page"));
    const tanggal = (k: string) => {
      const v = searchParams.get(k);
      return v && TANGGAL.test(v) ? v : null;
    };
    const dari = tanggal("dari");
    const sampai = tanggal("sampai");
    const rentang = dari || sampai ? { dari, sampai } : rentangDariPeriode(searchParams.get("periode"));
    return {
      q: searchParams.get("q") ?? "",
      ...rentang,
      unit: searchParams.get("unit"),
      jenis: searchParams.get("jenis"),
      status: STATUS.includes(status as StatusPelaksanaan) ? (status as StatusPelaksanaan) : null,
      pegawai: /^\d+$/.test(searchParams.get("pegawai") ?? "") ? searchParams.get("pegawai") : null,
      milik: searchParams.get("milik") === "saya" ? "saya" : null,
      page: Number.isInteger(page) && page > 0 ? page : 1,
    };
  }, [searchParams]);

  const setFilter = useCallback(
    (ubah: Partial<FilterKegiatan>) => {
      const params = new URLSearchParams(searchParams);
      const nilai = { ...ubah, page: ubah.page ?? 1 };
      if ("dari" in ubah || "sampai" in ubah) params.delete("periode");
      for (const [k, v] of Object.entries(nilai)) {
        if (v === null || v === "" || (k === "page" && v === 1)) params.delete(k);
        else params.set(k, String(v));
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const milik = searchParams.get("milik");
  const resetFilter = useCallback(
    () => router.replace(milik === "saya" ? `${pathname}?milik=saya` : pathname, { scroll: false }),
    [milik, pathname, router],
  );

  const adaFilter = KUNCI.some((k) => k !== "page" && k !== "milik" && searchParams.get(k));

  return { filter, setFilter, resetFilter, adaFilter };
}
