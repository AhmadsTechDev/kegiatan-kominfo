// =============================================================================
// PANEL DOKUMENTASI KEGIATAN (DARI TABEL KEGIATAN)
// =============================================================================
// Gunanya: Menampilkan dokumentasi (foto/berkas) dan hasil satu kegiatan tanpa
// meninggalkan daftar kegiatan, lengkap dengan tombol Ubah dan Periksa.
//
// Isi berkas:
//   - KegiatanDokumentasiSheet : panel samping (layar penuh di HP) per ID kegiatan
//
// Cara kerja:
//   1. Data diambil dari GET /kegiatan/:id (hook useKegiatan), jadi selalu sesuai ID terpilih.
//   2. Mode lihat: hasil kegiatan, galeri dokumentasi (baca saja), catatan perbaikan terakhir.
//   3. Ubah (hanya bila bisaUbah): hasil bisa diedit dan galeri bisa unggah/ganti/hapus.
//      Hasil disimpan lewat PATCH /kegiatan/:id dengan isian lain apa adanya.
//   4. Periksa (hanya bila bisaPeriksa): tombol pemeriksaan pimpinan/admin.
//   5. Setelah simpan, cache detail dan daftar disegarkan sehingga data terbaru langsung tampil.
//
// Catatan penting:
//   - Tidak ada endpoint baru: memakai endpoint kegiatan, dokumentasi, dan pemeriksaan yang sudah ada.
//   - Hak akses tetap ditegakkan backend; tombol hanya mengikuti tanda bisaUbah/bisaPeriksa dari server.
//
// Dipakai oleh: components/kegiatan-list-view.tsx
// =============================================================================

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
import { DokumentasiGaleri } from "./dokumentasi-galeri";
import { PeriksaAksi } from "./periksa-aksi";

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
  const catatanTerakhir = k.catatanPemeriksaan[0];

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
          {/* Sama dengan daftar dan detail: "belum diperiksa" tidak perlu ditandai */}
          {k.statusPemeriksaan !== "terkirim" && <StatusPemeriksaanBadge status={k.statusPemeriksaan} />}
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
            <DokumentasiGaleri kegiatan={k} />
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
            <Button type="button" variant="outline" className="h-10 pointer-coarse:min-h-11" onClick={onGantiMode} disabled={simpan.isPending}>
              Batal
            </Button>
            <Button type="button" className="h-10 pointer-coarse:min-h-11" onClick={kirim} disabled={simpan.isPending || hasil === (k.hasil ?? "")}>
              {simpan.isPending && <Spinner />}
              {simpan.isPending ? "Menyimpan..." : "Simpan hasil"}
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
            {k.bisaUbah && <TombolUbah onClick={onGantiMode} />}
          </>
        )}
      </div>
    </>
  );
}

function TombolUbah({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" className="h-10 pointer-coarse:min-h-11" onClick={onClick}>
      <Pencil aria-hidden />
      Ubah
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
