// =============================================================================
// PENANGAN GALAT HALAMAN APLIKASI (ERROR BOUNDARY)
// =============================================================================
// Gunanya: Menangkap galat tak terduga pada grup rute (app) di Aplikasi Pendataan
// Kegiatan sehingga kerangka tata letak tetap utuh dan pengguna dapat mencoba lagi.
//
// Isi berkas:
//   - ErrorHalaman : komponen antarmuka peringatan galat beserta tombol pemulihan
//
// Cara kerja:
//   1. Mencatat galat ke konsol peramban melalui hook useEffect saat galat terjadi.
//   2. Menampilkan pesan ramah serta kode digest galat untuk pelacakan log server.
//   3. Menyediakan tombol reset untuk merender ulang dan tautan kembali ke dashboard.
//
// Catatan penting:
//   - Detail teknis disembunyikan dari pengguna sesuai panduan desain (DESIGN.md).
//
// Dipakai oleh: Next.js App Router saat terjadi galat runtime di rute (app)
// =============================================================================

"use client";

import { RotateCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorHalaman({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-5 py-16 text-center">
      <span aria-hidden className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-7" />
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Halaman gagal ditampilkan</h1>
        <p className="text-sm text-muted-foreground">
          Terjadi kesalahan saat memuat halaman ini. Coba lagi; bila masih gagal, hubungi administrator aplikasi.
        </p>
        {error.digest && <p className="text-xs text-muted-foreground">Kode kesalahan: {error.digest}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button className="h-10" onClick={reset}>
          <RotateCw aria-hidden />
          Coba lagi
        </Button>
        <Button asChild variant="outline" className="h-10">
          <Link href="/dashboard">Ke dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
