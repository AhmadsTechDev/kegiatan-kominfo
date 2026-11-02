// =============================================================================
// DIALOG KONFIRMASI TINDAKAN
// =============================================================================
// Gunanya: Menampilkan modal dialog konfirmasi peringatan sebelum menjalankan
//          tindakan penting atau berbahaya seperti menghapus data.
//
// Isi berkas:
//   - ConfirmDialog : komponen modal konfirmasi dengan dukungan tombol pending
//
// Cara kerja:
//   1. Menerima status open dan menampilkan judul serta deskripsi konsekuensi aksi.
//   2. Mengunci tombol aksi dan menampilkan spinner jika proses pending berjalan.
//   3. Memanggil callback onConfirm ketika pengguna menekan tombol konfirmasi.
//
// Catatan penting:
//   - Tombol konfirmasi tidak langsung menutup dialog agar tetap terbuka selama
//     permintaan ke server berlangsung sampai proses selesai.
//
// Dipakai oleh: Modul kegiatan (hapus/batal kegiatan, hapus foto dokumentasi)
// =============================================================================

"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  onConfirm: () => void;
  pending?: boolean;
  // "default" untuk aksi yang tidak merusak (mis. kirim ulang undangan)
  confirmVariant?: "destructive" | "default";
  children?: React.ReactNode;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel = "Memproses...",
  onConfirm,
  pending,
  confirmVariant = "destructive",
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      <AlertDialogContent className="data-[size=default]:sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-10 pointer-coarse:min-h-11" disabled={pending}>
            Kembali
          </AlertDialogCancel>
          <Button variant={confirmVariant} className="h-10 pointer-coarse:min-h-11" onClick={onConfirm} disabled={pending}>
            {pending && <Spinner />}
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
