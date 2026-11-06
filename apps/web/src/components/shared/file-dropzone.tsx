"use client";

import { CheckCircle2, CircleAlert, FileText, Upload, X } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatUkuran } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Area seret-lepas untuk unggah foto atau PDF; proses unggah diurus pemanggil
 */

export type StatusUnggah = "menunggu" | "mengunggah" | "berhasil" | "gagal";

export type ItemUnggah = {
  id: string;
  file: File;
  nama: string;
  ukuran: number;
  preview: string | null;
  status: StatusUnggah;
  progres: number;
  galat?: string;
};

type FileDropzoneProps = {
  items: ItemUnggah[];
  onTambah: (berkas: File[]) => void;
  onHapus: (id: string) => void;
  /** Bila diisi, berkas tidak langsung diunggah: tombol Unggah muncul setelah ada berkas yang menunggu */
  onUnggah?: () => void;
  sisa: number;
  disabled?: boolean;
  accept?: string;
  className?: string;
};

export const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export function FileDropzone({ items, onTambah, onHapus, onUnggah, sisa, disabled, accept = ACCEPT, className }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [diseret, setDiseret] = useState(false);
  const idKeterangan = useId();
  const nonaktif = disabled || sisa <= 0;
  const menunggu = items.filter((it) => it.status === "menunggu").length;

  const terima = (daftar: FileList | null) => {
    if (daftar && daftar.length > 0) onTambah([...daftar]);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!nonaktif) setDiseret(true);
        }}
        onDragLeave={() => setDiseret(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDiseret(false);
          if (!nonaktif) terima(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border border-dashed border-input bg-background px-4 py-6 text-center transition-colors duration-120 ease-out",
          diseret && "border-primary bg-secondary",
          nonaktif && "opacity-60",
        )}
      >
        <span aria-hidden className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
          <Upload className="size-5" />
        </span>
        {/* Layar sentuh tidak bisa menyeret berkas, cukup tombol Pilih berkas */}
        <p className="text-sm font-semibold pointer-coarse:hidden">Seret berkas ke sini atau pilih berkas</p>
        <p id={idKeterangan} className="text-xs text-muted-foreground">
          JPEG, PNG, WebP, atau PDF · Maksimal 20 MB per berkas ·{" "}
          {sisa > 0 ? `${sisa} berkas lagi` : "Kuota 10 berkas sudah penuh"}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-1 h-10"
          onClick={() => inputRef.current?.click()}
          disabled={nonaktif}
          aria-describedby={idKeterangan}
        >
          Pilih berkas
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            terima(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Berkas yang dipilih">
          {items.map((it) => (
            <li
              key={it.id}
              className={cn("flex items-center gap-3 rounded-lg border p-2.5", it.status === "gagal" && "border-destructive/40 bg-destructive/5")}
            >
              <span className="relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                {it.preview ? (
                  <Image src={it.preview} alt="" fill unoptimized sizes="44px" className="object-cover" />
                ) : (
                  <FileText aria-hidden className="size-5" />
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm font-medium">{it.nama}</span>
                {it.status === "gagal" ? (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <CircleAlert aria-hidden className="size-3.5 shrink-0" />
                    {it.galat}
                  </span>
                ) : it.status === "mengunggah" ? (
                  <span
                    role="progressbar"
                    aria-label={`Mengunggah ${it.nama}`}
                    aria-valuenow={it.progres}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                  >
                    <span
                      className="block h-full origin-left rounded-full bg-primary transition-transform duration-150 ease-out"
                      style={{ transform: `scaleX(${it.progres / 100})` }}
                    />
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {it.status === "berhasil" && <CheckCircle2 aria-hidden className="size-3.5 text-status-selesai-foreground" />}
                    {formatUkuran(it.ukuran)}
                    {it.status === "berhasil" ? " · Terunggah" : onUnggah ? " · Siap diunggah" : " · Menunggu"}
                  </span>
                )}
              </div>
              {it.status !== "mengunggah" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0"
                  onClick={() => onHapus(it.id)}
                  aria-label={`Buang ${it.nama} dari daftar`}
                >
                  <X />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {onUnggah && menunggu > 0 && (
        <Button type="button" className="h-10 self-start pointer-coarse:min-h-11 max-sm:w-full" onClick={onUnggah} disabled={disabled}>
          {disabled ? <Spinner /> : <Upload aria-hidden />}
          {disabled ? "Mengunggah..." : `Unggah ${menunggu} berkas`}
        </Button>
      )}
    </div>
  );
}
