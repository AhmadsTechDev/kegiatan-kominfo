"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { StatusPelaksanaan } from "@/components/shared/status-badge";
import type { FilterKegiatan } from "../types";

// Filter dan paginasi daftar kegiatan disimpan di URL agar bisa dibagikan

const STATUS: StatusPelaksanaan[] = ["akan_datang", "berlangsung", "selesai", "dibatalkan"];
const KUNCI = ["q", "dari", "sampai", "periode", "unit", "jenis", "status", "pegawai", "milik", "pemeriksaan", "page"] as const;
const RUTE_MENU = ["milik", "pemeriksaan"] as const;
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
      // Menu "Perlu perbaikan": hanya nilai ini yang dipakai sebagai rute menu
      pemeriksaan: searchParams.get("pemeriksaan") === "perlu_perbaikan" ? "perlu_perbaikan" : null,
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

  // milik dan pemeriksaan adalah rute menu (Kegiatan saya, Perlu perbaikan), bukan isian filter, jadi tetap dipertahankan
  const rute = new URLSearchParams();
  for (const k of RUTE_MENU) {
    const v = searchParams.get(k);
    if (v) rute.set(k, v);
  }
  const qsRute = rute.toString();
  const resetFilter = useCallback(
    () => router.replace(qsRute ? `${pathname}?${qsRute}` : pathname, { scroll: false }),
    [qsRute, pathname, router],
  );

  const adaFilter = KUNCI.some((k) => k !== "page" && !(RUTE_MENU as readonly string[]).includes(k) && searchParams.get(k));

  return { filter, setFilter, resetFilter, adaFilter };
}
