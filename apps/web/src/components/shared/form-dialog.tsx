// =============================================================================
// DIALOG FORMULIR MODAL
// =============================================================================
// Gunanya: Membungkus formulir modal singkat untuk operasi penambahan atau
//          pembaruan data master, akun pengguna, dan pergantian kata sandi.
//
// Isi berkas:
//   - FormDialog : dialog formulir modal dengan footer aksi dan indikator loading
//   - Wajib      : komponen penanda tanda bintang merah untuk kolom wajib diisi
//
// Cara kerja:
//   1. Membuka dialog modal sesuai prop open dan menangani submit formulir.
//   2. Mengunci penutupan dialog dan menampilkan spinner saat status pending aktif.
//   3. Menampilkan kotak peringatan galat umum jika terdapat kesalahan dari server.
//
// Catatan penting:
//   - Mengikuti panduan DESIGN.md bagian 5.7 untuk form data master dan akun.
//   - Form menggunakan noValidate agar validasi sepenuhnya dikendalikan Zod di klien.
//
// Dipakai oleh: Dialog master data unit/jenis, modal akun pengguna, dan sandi
// =============================================================================

"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

type FormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  submitLabel: string;
  galat?: string | null;
  children: React.ReactNode;
};

export function FormDialog({ open, onOpenChange, title, description, onSubmit, pending, submitLabel, galat, children }: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="flex min-w-0 flex-col gap-4">{children}</div>
          {galat && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {galat}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-10 pointer-coarse:min-h-11" onClick={() => onOpenChange(false)} disabled={pending}>
              Batal
            </Button>
            <Button type="submit" className="h-10 pointer-coarse:min-h-11" disabled={pending}>
              {pending && <Spinner />}
              {pending ? "Menyimpan..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Wajib() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  );
}
