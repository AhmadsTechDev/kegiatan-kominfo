"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { lepasLapisan } from "@/hooks/use-tutup-lewat-kembali";
import { ApiError } from "@/lib/api-client";
import { kegiatanKeys, useHapusKegiatan, useSelesaikanKegiatan } from "../hooks/use-kegiatan";

/**
 * Dialog konfirmasi selesaikan atau hapus kegiatan
 */

export type TargetAksi = { id: number; judul: string; updatedAt: string };
export type JenisAksi = "selesai" | "hapus";

type Props = {
  target: TargetAksi | null;
  aksi: JenisAksi | null;
  onClose: () => void;
  onDihapus?: () => void;
};

const pesanGagal = (e: unknown) =>
  e instanceof ApiError && e.status === 409
    ? "Kegiatan ini baru saja diubah orang lain. Data sudah dimuat ulang, periksa lalu coba lagi."
    : e instanceof Error
      ? e.message
      : "Terjadi kesalahan. Coba lagi beberapa saat.";

export function KegiatanAksiDialog({ target, aksi, onClose, onDihapus }: Props) {
  const queryClient = useQueryClient();
  const selesaikan = useSelesaikanKegiatan();
  const hapus = useHapusKegiatan();
  const [galat, setGalat] = useState<string | null>(null);

  const tutup = () => {
    setGalat(null);
    selesaikan.reset();
    hapus.reset();
    onClose();
  };

  const gagal = (e: unknown) => {
    if (e instanceof ApiError && e.status === 409) queryClient.invalidateQueries({ queryKey: kegiatanKeys.all });
    setGalat(pesanGagal(e));
  };

  if (!target) return null;

  if (aksi === "selesai") {
    return (
      <ConfirmDialog
        open
        onOpenChange={(v) => !v && tutup()}
        title={`Selesaikan kegiatan "${target.judul}" sekarang?`}
        description={galat ?? "Waktu selesai diubah menjadi sekarang."}
        confirmLabel="Selesaikan"
        pendingLabel="Menyimpan..."
        pending={selesaikan.isPending}
        onConfirm={() =>
          selesaikan.mutate(
            { id: target.id, expectedUpdatedAt: target.updatedAt },
            {
              onSuccess: () => {
                toast.success("Kegiatan diselesaikan");
                tutup();
              },
              onError: gagal,
            },
          )
        }
      />
    );
  }

  if (aksi === "hapus") {
    return (
      <ConfirmDialog
        open
        onOpenChange={(v) => !v && tutup()}
        title={`Hapus kegiatan "${target.judul}"?`}
        description={
          <>
            Kegiatan hilang dari daftar dan rekap.
            {galat && <span className="mt-2 block text-destructive">{galat}</span>}
          </>
        }
        confirmLabel="Hapus kegiatan"
        pendingLabel="Menghapus..."
        pending={hapus.isPending}
        onConfirm={() =>
          hapus.mutate(target.id, {
            onSuccess: () => {
              toast.success("Kegiatan dihapus");

              /**
               * Halaman akan berpindah: entri riwayat dialog dilepas agar penutupan dialog tidak
               * memanggil history.back() yang membatalkan perpindahan ke daftar
               */
              if (onDihapus) lepasLapisan();
              tutup();
              onDihapus?.();
            },
            onError: gagal,
          })
        }
      />
    );
  }

  return null;
}
