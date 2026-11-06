"use client";

import { ChevronRight, CircleAlert, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge, StatusPemeriksaanBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api-client";
import { formatTanggalJam } from "@/lib/format";
import { useKegiatan, useUbahKegiatan } from "../hooks/use-kegiatan";
import { keKegiatanPayload, nilaiAwalForm } from "../schemas/kegiatan.schema";
import type { KegiatanDetail } from "../types";
import { DokumentasiGaleri, type StatusAntrean } from "./dokumentasi-galeri";
import { PeriksaAksi } from "./periksa-aksi";

// Sheet dokumentasi dan hasil kegiatan tanpa meninggalkan daftar kegiatan

type Target = { id: number; judul: string };

function Bagian({ judul, children }: { judul: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-heading text-sm font-bold">{judul}</h3>
      {children}
    </section>
  );
}

function Isi({ k, onGantiMode, mengubah }: { k: KegiatanDetail; mengubah: boolean; onGantiMode: () => void }) {
  const [hasil, setHasil] = useState(k.hasil ?? "");
  const [galat, setGalat] = useState<string | null>(null);
  const simpan = useUbahKegiatan(k.id);
  const [antrean, setAntrean] = useState<StatusAntrean>("kosong");
  const catatanTerakhir = k.catatanPemeriksaan[0];
  const hasilBerubah = hasil !== (k.hasil ?? "");
  const tahan = antrean !== "kosong";

  const kirim = () => {
    setGalat(null);
    // Isian lain dikirim apa adanya; yang berubah hanya hasil kegiatan
    const payload = keKegiatanPayload({ ...nilaiAwalForm(k), hasil });
    simpan.mutate(
      { ...payload, expectedUpdatedAt: k.updatedAt },
      {
        onSuccess: () => {
          toast.success("Hasil kegiatan disimpan");
          onGantiMode();
        },
        onError: (e) =>
          setGalat(
            e instanceof ApiError && e.status === 409
              ? "Kegiatan ini baru saja diubah orang lain. Tutup panel lalu buka lagi untuk melihat versi terbaru."
              : e.message,
          ),
      },
    );
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-4 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={k.statusPelaksanaan} />
          <StatusPemeriksaanBadge status={k.statusPemeriksaan} />
        </div>

        {catatanTerakhir?.status === "perlu_perbaikan" && k.statusPemeriksaan === "perlu_perbaikan" && (
          <div role="note" className="flex gap-2 rounded-lg border border-status-berlangsung-foreground/20 bg-status-berlangsung p-3 text-sm text-status-berlangsung-foreground">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 [overflow-wrap:anywhere]">
              <p className="font-semibold">Perlu perbaikan</p>
              {catatanTerakhir.isi && <p className="whitespace-pre-line">{catatanTerakhir.isi}</p>}
              <p className="mt-1 text-xs opacity-90">
                {catatanTerakhir.pemeriksa}, {formatTanggalJam(catatanTerakhir.waktu)}
              </p>
            </div>
          </div>
        )}

        <Bagian judul="Hasil kegiatan">
          {mengubah ? (
            <>
              <label htmlFor="dok-hasil" className="sr-only">
                Hasil kegiatan
              </label>
              <Textarea id="dok-hasil" rows={5} maxLength={5000} placeholder="Hasil atau tindak lanjut..." value={hasil} onChange={(e) => setHasil(e.target.value)} />
            </>
          ) : (
            <p className={k.hasil ? "text-sm whitespace-pre-line [overflow-wrap:anywhere]" : "text-sm text-muted-foreground"}>{k.hasil ?? "Belum diisi."}</p>
          )}
        </Bagian>

        <Bagian judul={`Dokumentasi (${k.dokumentasi.length})`}>
          {mengubah ? (
            <DokumentasiGaleri kegiatan={k} onAntreanBerubah={setAntrean} />
          ) : k.dokumentasi.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada dokumentasi.</p>
          ) : (
            <DokumentasiGaleri kegiatan={k} bacaSaja />
          )}
        </Bagian>

        {galat && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {galat}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-end">
        {mengubah ? (
          <>
            {tahan && (
              <p id="tahan-simpan-dok" aria-live="polite" className="order-last text-xs text-muted-foreground sm:order-none sm:mr-auto">
                {antrean === "mengunggah" ? "Tunggu sampai unggahan selesai." : "Tekan Unggah dulu untuk berkas yang dipilih."}
              </p>
            )}
            {/* Batal hanya bila ada isian hasil yang bisa dibuang; tanpa itu, Selesai sudah cukup */}
            {hasilBerubah && (
              <Button type="button" variant="outline" className="h-10 pointer-coarse:min-h-11" onClick={onGantiMode} disabled={simpan.isPending || antrean === "mengunggah"}>
                Batal
              </Button>
            )}
            <Button
              type="button"
              className="h-10 pointer-coarse:min-h-11"
              onClick={hasilBerubah ? kirim : onGantiMode}
              disabled={simpan.isPending || tahan}
              aria-describedby={tahan ? "tahan-simpan-dok" : undefined}
            >
              {simpan.isPending && <Spinner />}
              {simpan.isPending ? "Menyimpan..." : hasilBerubah ? "Simpan hasil" : "Selesai"}
            </Button>
          </>
        ) : (
          <>
            <Button asChild variant="ghost" className="h-10 pointer-coarse:min-h-11 sm:mr-auto">
              <Link href={`/kegiatan/${k.id}`}>
                Buka detail
                <ChevronRight aria-hidden />
              </Link>
            </Button>
            {k.bisaPeriksa && <PeriksaAksi kegiatan={k} className="w-full sm:w-auto" />}
            {k.bisaUbah && <TombolUbah kosong={!k.hasil && k.dokumentasi.length === 0} onClick={onGantiMode} />}
          </>
        )}
      </div>
    </>
  );
}

// Nama tombol menyebut apa yang diubah di panel ini: hasil dan dokumentasi, bukan seluruh kegiatan
function TombolUbah({ kosong, onClick }: { kosong: boolean; onClick: () => void }) {
  return (
    <Button type="button" className="h-10 pointer-coarse:min-h-11" onClick={onClick}>
      <Pencil aria-hidden />
      {kosong ? "Isi hasil dan dokumentasi" : "Ubah hasil dan dokumentasi"}
    </Button>
  );
}

export function KegiatanDokumentasiSheet({ target, onClose }: { target: Target | null; onClose: () => void }) {
  const [mengubah, setMengubah] = useState(false);
  const detail = useKegiatan(target?.id ?? 0);
  const tutup = () => {
    setMengubah(false);
    onClose();
  };

  return (
    <Sheet open={target !== null} onOpenChange={(v) => !v && tutup()}>
      <SheetContent side="right" className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
        <SheetHeader className="pr-12">
          <SheetTitle>Dokumentasi</SheetTitle>
          <SheetDescription className="[overflow-wrap:anywhere]">{target?.judul}</SheetDescription>
        </SheetHeader>
        {detail.isPending ? (
          <div className="flex flex-col gap-3 px-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : detail.isError ? (
          <ErrorState className="mx-4" message={detail.error.message} onRetry={() => detail.refetch()} retrying={detail.isRefetching} />
        ) : (
          // key: isian hasil dimulai ulang dari data terbaru setiap kali mode berganti
          <Isi key={`${detail.data.id}-${mengubah}`} k={detail.data} mengubah={mengubah} onGantiMode={() => setMengubah((v) => !v)} />
        )}
      </SheetContent>
    </Sheet>
  );
}
