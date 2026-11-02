// =============================================================================
// KOMPONEN TAMPILAN PESAN KESALAHAN
// =============================================================================
// Gunanya: Menampilkan kartu peringatan saat pemuatan data gagal, disertai tombol
//          untuk memuat ulang data (retry) pada Aplikasi Pendataan Kegiatan.
//
// Isi berkas:
//   - ErrorState : kartu penampil pesan galat dengan opsi pemuatan ulang
//
// Catatan penting:
//   - Memakai panduan DESIGN.md bagian 7 untuk penyajian pesan kesalahan yang jelas.
//
// Dipakai oleh: Halaman kegiatan, dashboard, dan komponen pemanggil kueri server
// =============================================================================

import { CircleAlert, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
};

export function ErrorState({ message, onRetry, retrying, className }: ErrorStateProps) {
  return (
    <Card role="alert" className={cn("rounded-xl shadow-sm", className)}>
      <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
        <span aria-hidden className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <CircleAlert className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Data gagal dimuat</p>
          <p className="text-xs text-muted-foreground">{message ?? "Terjadi kesalahan. Coba lagi beberapa saat."}</p>
        </div>
        {onRetry && (
          <Button variant="outline" className="h-10 pointer-coarse:min-h-11" onClick={onRetry} disabled={retrying}>
            <RotateCw className={cn(retrying && "animate-spin")} />
            Coba lagi
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
