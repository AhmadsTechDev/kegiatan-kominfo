"use client";

import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { urlDokumentasi } from "@/features/kegiatan/api/dokumentasi";
import type { Dokumentasi } from "@/features/kegiatan/types";
import { formatAngka, formatTanggalJam, formatUkuran } from "@/lib/format";
import type { KegiatanDokumentasi } from "../types";

// Tab Dokumentasi di halaman laporan: berkas tiap kegiatan pada cakupan yang dipilih

const adalahFoto = (d: Dokumentasi) => d.mime.startsWith("image/");

export const hitungBerkas = (data: KegiatanDokumentasi[]) => data.reduce((n, k) => n + k.dokumentasi.length, 0);

function KartuKegiatan({ k, onLihat }: { k: KegiatanDokumentasi; onLihat: (foto: Dokumentasi[], indeks: number) => void }) {
  const foto = k.dokumentasi.filter(adalahFoto);
  return (
    <li className="flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link href={`/kegiatan/${k.id}`} className="font-semibold hover:text-primary hover:underline">
            {k.judul}
          </Link>
          <span className="text-xs text-muted-foreground">
            {k.jenis} · {k.bidang} · {k.penanggungJawab}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {k.waktu}
            {k.lokasi && ` · ${k.lokasi}`}
          </span>
        </div>
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">{formatAngka(k.dokumentasi.length)} berkas</span>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6" aria-label={`Berkas dokumentasi ${k.judul}`}>
        {k.dokumentasi.map((d) => (
          <li key={d.id}>
            {adalahFoto(d) ? (
              <button
                type="button"
                onClick={() => onLihat(foto, foto.indexOf(d))}
                className="group relative block aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-lg border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Lihat ${d.namaAsli}`}
              >
                <Image
                  src={urlDokumentasi(d)}
                  alt={d.namaAsli}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-200 ease-out-expo group-hover:scale-105"
                />
              </button>
            ) : (
              <a
                href={urlDokumentasi(d)}
                target="_blank"
                rel="noopener"
                className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border bg-background p-3 text-center transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <FileText aria-hidden className="size-8 text-primary" />
                <span className="line-clamp-2 text-xs font-medium break-all">{d.namaAsli}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  PDF · {formatUkuran(d.ukuran)}
                  <ExternalLink aria-hidden className="size-3" />
                </span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </li>
  );
}

function PratinjauFoto({ foto, indeks, onIndeks, onTutup }: { foto: Dokumentasi[]; indeks: number | null; onIndeks: (i: number) => void; onTutup: () => void }) {
  const d = indeks == null ? null : foto[indeks];
  return (
    <Dialog open={d != null} onOpenChange={(v) => !v && onTutup()}>
      {d && indeks != null && (
        <DialogContent className="gap-3 sm:max-w-3xl">
          <DialogTitle className="truncate pr-8">{d.namaAsli}</DialogTitle>
          <DialogDescription>
            {formatUkuran(d.ukuran)} · diunggah {formatTanggalJam(d.createdAt)}
          </DialogDescription>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
            <Image src={urlDokumentasi(d)} alt={d.namaAsli} fill unoptimized sizes="768px" className="object-contain" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon" className="size-10" aria-label="Foto sebelumnya" disabled={indeks === 0} onClick={() => onIndeks(indeks - 1)}>
                <ChevronLeft />
              </Button>
              <span className="px-2 text-xs text-muted-foreground tabular-nums">
                {indeks + 1} dari {foto.length}
              </span>
              <Button type="button" variant="outline" size="icon" className="size-10" aria-label="Foto berikutnya" disabled={indeks === foto.length - 1} onClick={() => onIndeks(indeks + 1)}>
                <ChevronRight />
              </Button>
            </div>
            <Button asChild variant="outline" className="h-10">
              <a href={urlDokumentasi(d, true)} download>
                <Download aria-hidden />
                Unduh
              </a>
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

type Props = { data?: KegiatanDokumentasi[]; galat?: Error | null; onUlang: () => void; mengulang: boolean; memudar: boolean };

export function LaporanDokumentasi({ data, galat, onUlang, mengulang, memudar }: Props) {
  const [lihat, setLihat] = useState<{ foto: Dokumentasi[]; indeks: number } | null>(null);

  if (galat) return <ErrorState message={galat.message} onRetry={onUlang} retrying={mengulang} />;
  if (!data) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    );
  }
  if (data.length === 0) {
    return <EmptyState icon={ImageOff} title="Tidak ada kegiatan pada cakupan ini." description="Ubah periode, bidang, atau pegawai di atas." />;
  }

  const adaBerkas = data.filter((k) => k.dokumentasi.length > 0);
  const tanpa = data.filter((k) => k.dokumentasi.length === 0);

  return (
    <div className={memudar ? "flex flex-col gap-4 opacity-60 transition-opacity" : "flex flex-col gap-4 transition-opacity"}>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        <span className="font-semibold text-foreground tabular-nums">{formatAngka(adaBerkas.length)}</span> dari{" "}
        <span className="tabular-nums">{formatAngka(data.length)}</span> kegiatan punya dokumentasi,{" "}
        <span className="font-semibold text-foreground tabular-nums">{formatAngka(hitungBerkas(data))}</span> berkas
      </p>

      {adaBerkas.length === 0 ? (
        <EmptyState icon={ImageOff} title="Belum ada kegiatan yang dokumentasinya terunggah." />
      ) : (
        <ul className="flex flex-col gap-4">
          {adaBerkas.map((k) => (
            <KartuKegiatan key={k.id} k={k} onLihat={(foto, indeks) => setLihat({ foto, indeks })} />
          ))}
        </ul>
      )}

      {tanpa.length > 0 && (
        <section className="rounded-xl border border-dashed p-4" aria-label="Kegiatan tanpa dokumentasi">
          <h3 className="text-sm font-semibold">Belum ada dokumentasi ({formatAngka(tanpa.length)})</h3>
          <ul className="mt-2 flex flex-col divide-y divide-muted text-sm">
            {tanpa.map((k) => (
              <li key={k.id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-1.5">
                <Link href={`/kegiatan/${k.id}`} className="font-medium hover:text-primary hover:underline">
                  {k.judul}
                </Link>
                <span className="text-xs text-muted-foreground">{k.bidang}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <PratinjauFoto
        foto={lihat?.foto ?? []}
        indeks={lihat?.indeks ?? null}
        onIndeks={(i) => setLihat((l) => (l ? { ...l, indeks: i } : l))}
        onTutup={() => setLihat(null)}
      />
    </div>
  );
}
