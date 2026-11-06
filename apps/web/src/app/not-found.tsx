import { ArrowLeft, Compass } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { site } from "@/config/site";

/**
 * Halaman 404 saat rute tidak ditemukan atau notFound() dipanggil
 */

export const metadata: Metadata = { title: "Halaman tidak ditemukan" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10 text-center">
      <span aria-hidden className="flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-secondary text-primary">
        <Compass className="size-8" />
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <p className="text-xs font-bold tracking-widest text-primary uppercase">Kesalahan 404</p>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Halaman tidak ditemukan</h1>
        <p className="text-sm text-muted-foreground">
          Alamat yang Anda buka tidak ada atau sudah dipindahkan. Periksa kembali tautannya, atau kembali ke dashboard.
        </p>
      </div>
      <Button asChild className="h-10">
        <Link href="/dashboard">
          <ArrowLeft aria-hidden />
          Kembali ke dashboard
        </Link>
      </Button>
      <p className="text-xs text-muted-foreground">
        {site.namaSistem} · Diskominfo {site.wilayah}
      </p>
    </main>
  );
}
