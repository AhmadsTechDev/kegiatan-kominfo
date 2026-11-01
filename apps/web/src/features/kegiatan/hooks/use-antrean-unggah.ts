// =============================================================================
// HOOK PENGELOLA ANTREAN UNGGAH DOKUMENTASI
// =============================================================================
// Gunanya: Mengelola antrean pengunggahan berkas bukti kegiatan (foto/PDF) di peramban,
// mencakup validasi ukuran/tipe, kompresi otomatis, kuota, serta pemantauan progres.
//
// Isi berkas:
//   - UKURAN_MAKS         : batas ukuran berkas maksimal 20 MB (NFR-04)
//   - JUMLAH_MAKS         : batas kuota dokumentasi maksimal 10 berkas per kegiatan
//   - periksaBerkas       : validasi format berkas dan batas ukuran dokumen PDF di klien
//   - useAntreanUnggah    : hook pengelola siklus hidup antrean berkas dan unggah sekuensial
//   - useGantiDokumentasi : hook mutasi untuk menimpa berkas dokumentasi yang salah unggah
//
// Cara kerja:
//   1. Berkas divalidasi format dan kuotanya sebelum dimasukkan ke dalam antrean.
//   2. Berkas foto dikompresi di sisi klien sebelum dikirim satu per satu ke backend.
//   3. Memantau persentase progres pengunggahan per berkas lewat callback API.
//   4. Menyegarkan cache kueri kegiatan dan indikator dashboard setelah selesai.
//
// Catatan penting:
//   - Berkas ditolak ditandai jelas tanpa membatalkan berkas lain (DESIGN.md bagian 7).
//   - Menggunakan URL.revokeObjectURL saat pembersihan guna mencegah kebocoran memori.
//
// Dipakai oleh: components/dokumentasi-galeri.tsx
// =============================================================================

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import type { ItemUnggah } from "@/components/shared/file-dropzone";
import { dashboardKeys } from "@/features/dashboard/hooks/use-dashboard";
import { gantiDokumentasi, unggahDokumentasi } from "../api/dokumentasi";
import { JENIS_FOTO, kompresGambar } from "../lib/kompres-gambar";
import { kegiatanKeys } from "./use-kegiatan";

export const UKURAN_MAKS = 20 * 1024 * 1024;
export const JUMLAH_MAKS = 10;
const JENIS_DIIZINKAN = [...JENIS_FOTO, "application/pdf"];

export function periksaBerkas(f: File): string | null {
  if (!JENIS_DIIZINKAN.includes(f.type)) return "Hanya JPEG, PNG, WebP, atau PDF";
  if (f.type === "application/pdf" && f.size > UKURAN_MAKS) return "Ukuran maksimal 20 MB";
  return null;
}

const idAcak = () => crypto.randomUUID();

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
