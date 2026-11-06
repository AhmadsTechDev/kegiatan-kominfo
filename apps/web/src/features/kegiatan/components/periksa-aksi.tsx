"use client";

import { MessageSquareWarning } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { usePeriksaKegiatan } from "../hooks/use-kegiatan";
import type { StatusPelaksanaan } from "@/components/shared/status-badge";
import type { StatusPemeriksaanKegiatan } from "../types";

// Tombol periksa untuk pimpinan/admin: tandai perlu perbaikan dengan catatan wajib

type Props = {
  kegiatan: { id: number; judul: string; statusPemeriksaan: StatusPemeriksaanKegiatan; statusPelaksanaan: StatusPelaksanaan };
  ringkas?: boolean;
  className?: string;
};

export function PeriksaAksi({ kegiatan, ringkas, className }: Props) {
  const periksa = usePeriksaKegiatan();
  const [buka, setBuka] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [galat, setGalat] = useState<string | null>(null);

  const kirimPerbaikan = () => {
    if (!catatan.trim()) return setGalat("Catatan perbaikan wajib diisi");
    setGalat(null);
    periksa.mutate(
      { id: kegiatan.id, catatan: catatan.trim() },
      {
        onSuccess: () => {
          toast.success(`"${kegiatan.judul}" ditandai perlu perbaikan`);
          setBuka(false);
          setCatatan("");
        },
        onError: (e) => setGalat(e.message),
      },
    );
  };

  // Kegiatan yang belum dimulai atau dibatalkan belum punya dokumentasi dan hasil, jadi tidak diperiksa (backend juga menolak)
  if (kegiatan.statusPelaksanaan !== "berlangsung" && kegiatan.statusPelaksanaan !== "selesai") return null;

  const ukuran = ringkas ? "h-8 px-2.5 text-xs pointer-coarse:h-11" : "h-10 pointer-coarse:min-h-11";
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button
        variant="outline"
        className={ukuran}
        onClick={() => setBuka(true)}
        disabled={periksa.isPending}
        aria-label={ringkas ? `Tandai "${kegiatan.judul}" perlu perbaikan` : undefined}
      >
        <MessageSquareWarning aria-hidden />
        <span className={cn(ringkas && "hidden xl:inline")}>Perlu perbaikan</span>
      </Button>

      <Dialog
        open={buka}
        onOpenChange={(v) => {
          setBuka(v);
          if (!v) setGalat(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Perlu perbaikan: &ldquo;{kegiatan.judul}&rdquo;</DialogTitle>
            <DialogDescription>Catatan ini terlihat oleh pencatat di halaman detail kegiatan. Tanda perlu perbaikan hilang setelah kegiatan diubah oleh pencatat.</DialogDescription>
          </DialogHeader>
          <Field data-invalid={!!galat}>
            <FieldLabel htmlFor={`catatan-${kegiatan.id}`}>
              Catatan perbaikan
            </FieldLabel>
            <Textarea
              id={`catatan-${kegiatan.id}`}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              maxLength={2000}
              rows={4}
              aria-required
              aria-invalid={!!galat}
              autoFocus
            />
            <FieldDescription>Contoh: lengkapi foto dokumentasi dan jumlah peserta.</FieldDescription>
            {galat && <FieldError>{galat}</FieldError>}
          </Field>
          <DialogFooter>
            <Button variant="outline" className="h-10" onClick={() => setBuka(false)} disabled={periksa.isPending}>
              Batal
            </Button>
            <Button className="h-10" onClick={kirimPerbaikan} disabled={periksa.isPending}>
              {periksa.isPending && <Spinner />}
              Simpan catatan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
