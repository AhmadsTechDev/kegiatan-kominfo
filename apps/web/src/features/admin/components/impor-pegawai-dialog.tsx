// =============================================================================
// DIALOG IMPOR DATA PEGAWAI DARI LEMBAR KERJA EXCEL
// =============================================================================
// Gunanya: menyediakan dialog modal untuk menambah atau memperbarui data pegawai
// secara massal melalui unggahan berkas spreadsheet Excel (.xlsx).
//
// Isi berkas:
//   - BarisPratinjau : komponen penampil rincian status validasi per baris lembar kerja
//   - ImporPegawaiDialog : modal interaktif alur pratinjau, filter galat, dan simpan data
//
// Cara kerja:
//   1. Pengguna dapat mengunduh templat resmi Excel sebelum mengisi data kepegawaian.
//   2. Berkas diunggah untuk pratinjau validasi di backend tanpa langsung disimpan.
//   3. Hasil pratinjau mengelompokkan baris: data baru, diperbarui, sama, atau galat.
//   4. Admin meninjau data bermasalah, lalu menyimpan seluruh baris yang lolos validasi.
//
// Catatan penting:
//   - NIP yang sudah ada di database akan diperbarui datanya, bukan diduplikasi.
//   - Baris yang memiliki galat validasi akan dilewati tanpa membatalkan baris yang valid.
//
// Dipakai oleh: pegawai-tab.tsx
// =============================================================================

"use client";

import { CircleAlert, Download, FileSpreadsheet, RefreshCw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { unduhTemplatPegawai } from "../api/admin";
import { useImporPegawai } from "../hooks/use-admin";
import type { BarisImpor, HasilImpor, StatusImpor } from "../types";

const LABEL: Record<StatusImpor, string> = { baru: "Baru", perbarui: "Diperbarui", sama: "Sudah sama", galat: "Bermasalah" };
const WARNA: Record<StatusImpor, string> = {
  baru: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  perbarui: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  sama: "bg-muted text-muted-foreground",
  galat: "bg-destructive/10 text-destructive",
};
const URUTAN: StatusImpor[] = ["baru", "perbarui", "sama", "galat"];

function BarisPratinjau({ b }: { b: BarisImpor }) {
  return (
    <li className="flex flex-col gap-1 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 w-9 shrink-0 text-xs text-muted-foreground tabular-nums">#{b.baris}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{b.nama || <span className="text-muted-foreground italic">tanpa nama</span>}</p>
          <p className="truncate text-xs text-muted-foreground">
            <span className="tabular-nums">{b.nip || "tanpa NIP"}</span>
            {" · "}
            {b.unit?.nama ?? (b.unitTeks || "tanpa unit")}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", WARNA[b.status])}>{LABEL[b.status]}</span>
      </div>
      {b.pesan.length > 0 && (
        <ul className={cn("ml-11 text-xs", b.status === "galat" ? "text-destructive" : "text-muted-foreground")}>
          {b.pesan.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function ImporPegawaiDialog({ onClose }: { onClose: () => void }) {
  const impor = useImporPegawai();
  const input = useRef<HTMLInputElement>(null);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [hasil, setHasil] = useState<HasilImpor | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [hanyaMasalah, setHanyaMasalah] = useState(false);
  const [unduh, setUnduh] = useState(false);

  const pratinjau = (f: File) => {
    setBerkas(f);
    setHasil(null);
    setGalat(null);
    setHanyaMasalah(false);
    impor.mutate(
      { berkas: f, simpan: false },
      {
        onSuccess: (h) => {
          setHasil(h);
          setHanyaMasalah(h.ringkasan.galat > 0);
        },
        onError: (e) => setGalat(e.message),
      },
    );
  };

  const simpan = () => {
    if (!berkas) return;
    impor.mutate(
      { berkas, simpan: true },
      {
        onSuccess: ({ ringkasan: r }) => {
          const bagian = [r.baru && `${r.baru} pegawai ditambahkan`, r.perbarui && `${r.perbarui} diperbarui`].filter(Boolean).join(", ");
          toast.success(`Impor selesai: ${bagian}.`, { description: r.galat ? `${r.galat} baris bermasalah dilewati.` : undefined });
          onClose();
        },
        onError: (e) => setGalat(e.message),
      },
    );
  };

  const templat = async () => {
    setUnduh(true);
    try {
      await unduhTemplatPegawai();
    } catch {
      toast.error("Templat gagal diunduh. Coba lagi.");
    } finally {
      setUnduh(false);
    }
  };

  const r = hasil?.ringkasan;
  const jumlahSimpan = r ? r.baru + r.perbarui : 0;
  const tampil = hasil ? (hanyaMasalah ? hasil.baris.filter((b) => b.status === "galat") : hasil.baris) : [];
  const memuat = impor.isPending;

  return (
    <Dialog open onOpenChange={(v) => !v && !memuat && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Impor pegawai dari Excel</DialogTitle>
          <DialogDescription>Tambah atau perbarui banyak pegawai sekaligus. NIP yang sudah terdaftar akan diperbarui, bukan diduplikasi.</DialogDescription>
        </DialogHeader>

        <input
          ref={input}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) pratinjau(f);
          }}
        />

        {!hasil ? (
          <div className="flex flex-col gap-4">
            <ol className="grid gap-2 text-sm sm:grid-cols-3">
              {[
                ["Unduh templat", "Atau pakai berkas dari kepegawaian dengan kolom NIP, Nama, Unit kerja (nama sub bagian/seksi atau unitnya)."],
                ["Isi data", "Kolom NIP harus berformat Teks agar 18 digitnya tidak berubah."],
                ["Unggah dan periksa", "Pratinjau tampil dulu; tidak ada yang tersimpan sebelum Anda menekan Impor."],
              ].map(([judul, isi], i) => (
                <li key={judul} className="rounded-xl border bg-muted/30 p-3">
                  <p className="font-medium">
                    <span className="mr-1.5 text-primary tabular-nums">{i + 1}.</span>
                    {judul}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{isi}</p>
                </li>
              ))}
            </ol>
            <Button type="button" variant="outline" className="h-10 self-start" onClick={templat} disabled={unduh}>
              {unduh ? <Spinner /> : <Download aria-hidden />}
              Unduh templat Excel
            </Button>
            <button
              type="button"
              disabled={memuat}
              onClick={() => input.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) pratinjau(f);
              }}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
            >
              {memuat ? <Spinner className="size-6" /> : <FileSpreadsheet className="size-8 text-primary" aria-hidden />}
              <span className="text-sm font-medium">{memuat ? `Membaca ${berkas?.name ?? "berkas"}...` : "Pilih atau seret berkas .xlsx ke sini"}</span>
              <span className="text-xs text-muted-foreground">Maksimal 2 MB, 1.000 pegawai per berkas</span>
            </button>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <FileSpreadsheet className="size-4 text-muted-foreground" aria-hidden />
              <span className="min-w-0 truncate font-medium">{berkas?.name}</span>
              <span className="text-muted-foreground">· {r!.total} baris</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {URUTAN.filter((s) => r![s] > 0).map((s) => (
                <span key={s} className={cn("rounded-full px-2.5 py-1 text-xs font-medium tabular-nums", WARNA[s])}>
                  {LABEL[s]}: {r![s]}
                </span>
              ))}
            </div>
            {r!.galat > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>
                  {r!.galat} baris bermasalah akan dilewati. Perbaiki di Excel lalu unggah ulang, atau lanjutkan impor untuk baris yang benar saja.{" "}
                  <button type="button" className="font-medium underline underline-offset-2" onClick={() => setHanyaMasalah((v) => !v)}>
                    {hanyaMasalah ? "Tampilkan semua baris" : "Tampilkan yang bermasalah saja"}
                  </button>
                </p>
              </div>
            )}
            <ul className="max-h-80 divide-y overflow-y-auto rounded-xl border" aria-label="Pratinjau baris impor">
              {tampil.map((b) => (
                <BarisPratinjau key={b.baris} b={b} />
              ))}
            </ul>
          </div>
        )}

        {galat && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {galat}
          </p>
        )}

        <DialogFooter className="gap-2">
          {hasil ? (
            <>
              <Button type="button" variant="outline" className="h-10" onClick={() => input.current?.click()} disabled={memuat}>
                <RefreshCw aria-hidden />
                Ganti berkas
              </Button>
              <Button type="button" className="h-10" onClick={simpan} disabled={memuat || jumlahSimpan === 0}>
                {memuat ? <Spinner /> : <Upload aria-hidden />}
                {jumlahSimpan === 0 ? "Tidak ada yang perlu diimpor" : `Impor ${jumlahSimpan} pegawai`}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" className="h-10" onClick={onClose} disabled={memuat}>
              Batal
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
