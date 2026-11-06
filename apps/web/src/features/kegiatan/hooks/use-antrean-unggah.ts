"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import type { ItemUnggah } from "@/components/shared/file-dropzone";
import { dashboardKeys } from "@/features/dashboard/hooks/use-dashboard";
import { gantiDokumentasi, unggahDokumentasi } from "../api/dokumentasi";
import { JENIS_FOTO, kompresGambar } from "../lib/kompres-gambar";
import { kegiatanKeys } from "./use-kegiatan";

/**
 * Antrean unggah dokumentasi: validasi, kompresi, kuota, dan progres
 */

export const UKURAN_MAKS = 20 * 1024 * 1024;
export const JUMLAH_MAKS = 10;
const JENIS_DIIZINKAN = [...JENIS_FOTO, "application/pdf"];

export function periksaBerkas(f: File): string | null {
  if (!JENIS_DIIZINKAN.includes(f.type)) return "Hanya JPEG, PNG, WebP, atau PDF";
  if (f.type === "application/pdf" && f.size > UKURAN_MAKS) return "Ukuran maksimal 20 MB";
  return null;
}

const idAcak = () => crypto.randomUUID();

/**
 * Menyimpan daftar berkas yang dipilih beserta statusnya (menunggu, mengunggah, berhasil, gagal) dan progresnya.
 * Kuota 10 berkas per kegiatan dihitung di sini juga, supaya pengguna langsung tahu sebelum mengunggah;
 * backend tetap memeriksanya ulang.
 * URL.createObjectURL membuat alamat sementara untuk pratinjau foto dan harus dilepas (revokeObjectURL) agar memori tidak bocor.
 * @param terpakai jumlah berkas yang sudah tersimpan di kegiatan
 */
export function useAntreanUnggah(terpakai = 0) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ItemUnggah[]>([]);
  const [berjalan, setBerjalan] = useState(false);

  const ubahItem = (id: string, ubah: Partial<ItemUnggah>) =>
    setItems((daftar) => daftar.map((it) => (it.id === id ? { ...it, ...ubah } : it)));

  const aktif = items.filter((it) => it.status !== "gagal" && it.status !== "berhasil").length;
  const sisa = Math.max(0, JUMLAH_MAKS - terpakai - aktif);

  const tambah = (berkas: File[]): ItemUnggah[] => {
    let kuota = sisa;
    const baru = berkas.map((f): ItemUnggah => {
      const dasar = {
        id: idAcak(),
        file: f,
        nama: f.name,
        ukuran: f.size,
        progres: 0,
        preview: JENIS_FOTO.includes(f.type) ? URL.createObjectURL(f) : null,
      };
      const galat = periksaBerkas(f);
      if (galat) return { ...dasar, status: "gagal", galat };
      if (kuota <= 0) return { ...dasar, status: "gagal", galat: `Maksimal ${JUMLAH_MAKS} berkas per kegiatan` };
      kuota--;
      return { ...dasar, status: "menunggu" };
    });
    setItems((daftar) => [...daftar, ...baru]);
    return baru;
  };

  const hapus = (id: string) =>
    setItems((daftar) => {
      const it = daftar.find((x) => x.id === id);
      if (it?.preview) URL.revokeObjectURL(it.preview);
      return daftar.filter((x) => x.id !== id);
    });

  const bersihkanBerhasil = useCallback(
    () =>
      setItems((daftar) =>
        daftar.filter((it) => {
          if (it.status !== "berhasil") return true;
          if (it.preview) URL.revokeObjectURL(it.preview);
          return false;
        }),
      ),
    [],
  );

  /**
   * Berkas diunggah satu per satu (for...of dengan await), bukan bersamaan, agar koneksi HP tidak kewalahan
   * dan urutan progres mudah diikuti. Satu berkas gagal tidak menghentikan berkas berikutnya.
   */
  const unggah = async (kegiatanId: number, daftar: ItemUnggah[] = items) => {
    const antre = daftar.filter((it) => it.status === "menunggu");
    let berhasil = 0;
    setBerjalan(true);
    for (const it of antre) {
      ubahItem(it.id, { status: "mengunggah", progres: 0 });
      try {
        const berkas = await kompresGambar(it.file);
        if (berkas.size > UKURAN_MAKS) throw new Error("Ukuran maksimal 20 MB");
        await unggahDokumentasi(kegiatanId, berkas, (progres) => ubahItem(it.id, { progres }));
        ubahItem(it.id, { status: "berhasil", progres: 100 });
        berhasil++;
      } catch (e) {
        ubahItem(it.id, { status: "gagal", galat: e instanceof Error ? e.message : "Gagal mengunggah" });
      }
    }
    setBerjalan(false);
    if (berhasil > 0) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: kegiatanKeys.detail(kegiatanId) }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]);
    }
    return { berhasil, gagal: antre.length - berhasil };
  };

  useEffect(
    () => () => {
      setItems((daftar) => {
        for (const it of daftar) if (it.preview) URL.revokeObjectURL(it.preview);
        return daftar;
      });
    },
    [],
  );

  return { items, sisa, berjalan, tambah, hapus, unggah, bersihkanBerhasil };
}

export function useGantiDokumentasi(kegiatanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, berkas }: { id: number; berkas: File }) => {
      const siap = await kompresGambar(berkas);
      if (siap.size > UKURAN_MAKS) throw new Error("Ukuran maksimal 20 MB");
      return gantiDokumentasi(id, siap);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: kegiatanKeys.detail(kegiatanId) }),
  });
}
