// =============================================================================
// DIALOG AKSI PENYELESAIAN, PEMBATALAN, DAN PENGHAPUSAN KEGIATAN
// =============================================================================
// Gunanya: Menyediakan modal dialog konfirmasi untuk menyelesaikan kegiatan yang sedang
// berlangsung, membatalkannya dengan isian alasan wajib, atau menghapus datanya.
//
// Isi berkas:
//   - BATAS_ALASAN       : konstanta panjang maksimum teks alasan (1000 karakter)
//   - pesanGagal         : pemformat pesan kesalahan termasuk deteksi konflik 409
//   - KegiatanAksiDialog : komponen dialog konfirmasi aksi pembatalan atau penghapusan
//
// Cara kerja:
//   1. Menerima data target kegiatan dan jenis aksi ("selesai", "batalkan", atau "hapus").
//      "selesai" mengisi waktu selesai dengan waktu sekarang; statusnya tetap dihitung dari waktu.
//   2. Aksi batalkan memvalidasi isian teks alasan sebelum mutasi dikirimkan.
//   3. Aksi hapus menampilkan peringatan dampak dan mengeksekusi mutasi hapus.
//   4. Menutup dialog saat mutasi berhasil dan memicu callback onDihapus jika ada.
//
// Catatan penting:
//   - Alasan pembatalan bersifat wajib diisi sesuai kebutuhan bisnis (FR-05).
//   - Mengirim expectedUpdatedAt untuk mendeteksi konflik pengubahan (optimistic lock).
//   - Jika terjadi status 409 Conflict, kueri cache di-invalidasi agar data disegarkan.
//   - Mengikuti pola dialog konfirmasi tindakan kritis (DESIGN.md bagian 7).
//
// Dipakai oleh: components/kegiatan-detail-view.tsx
// =============================================================================

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import { kegiatanKeys, useBatalkanKegiatan, useHapusKegiatan, useSelesaikanKegiatan } from "../hooks/use-kegiatan";

export type TargetAksi = { id: number; judul: string; updatedAt: string };
export type JenisAksi = "selesai" | "batalkan" | "hapus";

type Props = {
  target: TargetAksi | null;
  aksi: JenisAksi | null;
  onClose: () => void;
  onDihapus?: () => void;
};

const BATAS_ALASAN = 1000;

const pesanGagal = (e: unknown) =>
  e instanceof ApiError && e.status === 409
    ? "Kegiatan ini baru saja diubah orang lain. Data sudah dimuat ulang, periksa lalu coba lagi."
    : e instanceof Error
      ? e.message
      : "Terjadi kesalahan. Coba lagi beberapa saat.";

export function KegiatanAksiDialog({ target, aksi, onClose, onDihapus }: Props) {
  const queryClient = useQueryClient();
  const selesaikan = useSelesaikanKegiatan();
  const batalkan = useBatalkanKegiatan();
  const hapus = useHapusKegiatan();
  const [alasan, setAlasan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);

  const tutup = () => {
    setAlasan("");
    setGalat(null);
    selesaikan.reset();
    batalkan.reset();
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

  if (aksi === "batalkan") {
    return (
      <ConfirmDialog
        open
        onOpenChange={(v) => !v && tutup()}
        title={`Batalkan kegiatan "${target.judul}"?`}
        description="Kegiatan tetap tercatat sebagai Dibatalkan dan tidak dapat diurungkan."
        confirmLabel="Batalkan kegiatan"
        pendingLabel="Membatalkan..."
        pending={batalkan.isPending}
        onConfirm={() => {
          if (!alasan.trim()) return setGalat("Alasan pembatalan wajib diisi");
          setGalat(null);
          batalkan.mutate(
            { id: target.id, alasan: alasan.trim(), expectedUpdatedAt: target.updatedAt },
            {
              onSuccess: () => {
                toast.success("Kegiatan dibatalkan");
                tutup();
              },
              onError: gagal,
            },
          );
        }}
      >
        <Field data-invalid={!!galat}>
          <FieldLabel htmlFor="alasan-batal">
            Alasan pembatalan
            <span aria-hidden className="text-destructive">
              *
            </span>
          </FieldLabel>
          <Textarea
            id="alasan-batal"
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            maxLength={BATAS_ALASAN}
            rows={3}
            aria-required
            aria-invalid={!!galat}
            autoFocus
          />
          {galat && <FieldError>{galat}</FieldError>}
        </Field>
      </ConfirmDialog>
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
            Kegiatan hilang dari daftar dan rekap. Pilih Batalkan bila hanya tidak jadi dilaksanakan.
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
