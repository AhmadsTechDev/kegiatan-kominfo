"use client";

import { Building2, ChevronLeft, ChevronRight, Clock, Download, ExternalLink, FileArchive, FileText, ImageOff, MapPin, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { urlDokumentasi } from "@/features/kegiatan/api/dokumentasi";
import type { Dokumentasi } from "@/features/kegiatan/types";
import { formatTanggalJam, formatUkuran } from "@/lib/format";
import { unduhDokumentasiZip } from "../api";
import type { CakupanLaporan, KegiatanDokumentasi } from "../types";

/**
 * Tab Dokumentasi di halaman laporan: berkas tiap kegiatan pada cakupan yang dipilih, bisa diunduh satu per satu atau sebagai ZIP
 */

const adalahFoto = (d: Dokumentasi) => d.mime.startsWith("image/");

export const hitungBerkas = (data: KegiatanDokumentasi[]) => data.reduce((n, k) => n + k.dokumentasi.length, 0);

/**
 * "semua" untuk seluruh cakupan, angka untuk satu kegiatan
 */
type TargetUnduh = "semua" | number;

function Meta({ icon: Icon, label, children }: { icon: typeof Clock; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <dt className="sr-only">{label}</dt>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <dd className="min-w-0 text-foreground/90">{children}</dd>
    </div>
  );
}

function TombolUnduhBerkas({ d }: { d: Dokumentasi }) {
  return (
    <div className="mt-1.5 flex items-center gap-1">
      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={d.namaAsli}>
        {d.namaAsli}
      </span>
      <Button asChild variant="ghost" size="icon" className="size-8 shrink-0 pointer-coarse:size-11">
        <a href={urlDokumentasi(d, true)} download aria-label={`Unduh ${d.namaAsli}`} title="Unduh berkas">
          <Download aria-hidden className="size-4" />
        </a>
      </Button>
    </div>
  );
}

function KartuKegiatan({
  k,
  onLihat,
  onUnduhSemua,
  mengunduh,
  sibuk,
}: {
  k: KegiatanDokumentasi;
  onLihat: (foto: Dokumentasi[], indeks: number) => void;
  onUnduhSemua: () => void;
  mengunduh: boolean;
  sibuk: boolean;
}) {
  const foto = k.dokumentasi.filter(adalahFoto);
  return (
    <li className="flex flex-col gap-4 rounded-xl border p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">{k.jenis}</span>
            <Link href={`/kegiatan/${k.id}`} className="font-heading text-base font-bold hover:text-primary hover:underline">
              {k.judul}
            </Link>
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Meta icon={Clock} label="Waktu">
              <span className="tabular-nums">{k.waktu}</span>
            </Meta>
            {k.lokasi && (
              <Meta icon={MapPin} label="Lokasi">
                {k.lokasi}
              </Meta>
            )}
            <Meta icon={Building2} label="Bidang">
              {k.bidang}
            </Meta>
            <Meta icon={UserRound} label="Penanggung jawab">
              {k.penanggungJawab}
            </Meta>
          </dl>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 shrink-0 pointer-coarse:min-h-11"
          onClick={onUnduhSemua}
          disabled={sibuk}
          aria-label={`Unduh ${k.dokumentasi.length} berkas dokumentasi ${k.judul} sebagai ZIP`}
        >
          {mengunduh ? <Spinner /> : <FileArchive aria-hidden />}
          {mengunduh ? "Menyiapkan..." : "Unduh semua"}
        </Button>
      </div>

      <ul className="grid grid-cols-2 gap-3 border-t border-muted pt-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6" aria-label={`Berkas dokumentasi ${k.judul}`}>
        {k.dokumentasi.map((d) => (
          <li key={d.id} className="min-w-0">
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
                aria-label={`Buka ${d.namaAsli} di tab baru`}
              >
                <FileText aria-hidden className="size-8 text-primary" />
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  PDF · {formatUkuran(d.ukuran)}
                  <ExternalLink aria-hidden className="size-3" />
                </span>
              </a>
            )}
            <TombolUnduhBerkas d={d} />
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

type Props = {
  cakupan: CakupanLaporan;
  data?: KegiatanDokumentasi[];
  galat?: Error | null;
  onUlang: () => void;
  mengulang: boolean;
  memudar: boolean;
};

export function LaporanDokumentasi({ cakupan, data, galat, onUlang, mengulang, memudar }: Props) {
  const [lihat, setLihat] = useState<{ foto: Dokumentasi[]; indeks: number } | null>(null);
  const [mengunduh, setMengunduh] = useState<TargetUnduh | null>(null);

  /**
   * Satu ZIP disiapkan dalam satu waktu; tombol lain menunggu agar server tidak dibebani unduhan ganda
   */
  const unduhZip = async (target: TargetUnduh) => {
    setMengunduh(target);
    try {
      await unduhDokumentasiZip(cakupan, target === "semua" ? undefined : target);
      toast.success("Dokumentasi diunduh sebagai ZIP");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh dokumentasi");
    } finally {
      setMengunduh(null);
    }
  };

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
  const totalBerkas = hitungBerkas(data);

  return (
    <div className={memudar ? "flex flex-col gap-4 opacity-60 transition-opacity" : "flex flex-col gap-4 transition-opacity"}>
      <div className="flex justify-end">
        {totalBerkas > 0 && (
          <Button variant="outline" className="h-10 pointer-coarse:min-h-11" onClick={() => unduhZip("semua")} disabled={mengunduh !== null}>
            {mengunduh === "semua" ? <Spinner /> : <FileArchive aria-hidden />}
            {mengunduh === "semua" ? "Menyiapkan ZIP..." : "Unduh semua dokumentasi"}
          </Button>
        )}
      </div>

      {adaBerkas.length === 0 ? (
        <EmptyState icon={ImageOff} title="Belum ada kegiatan yang dokumentasinya terunggah." />
      ) : (
        <ul className="flex flex-col gap-4">
          {adaBerkas.map((k) => (
            <KartuKegiatan
              key={k.id}
              k={k}
              onLihat={(foto, indeks) => setLihat({ foto, indeks })}
              onUnduhSemua={() => unduhZip(k.id)}
              mengunduh={mengunduh === k.id}
              sibuk={mengunduh !== null}
            />
          ))}
        </ul>
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
