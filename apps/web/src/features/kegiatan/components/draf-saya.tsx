"use client";

import { FilePen, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Panel } from "@/components/shared/panel";
import { StatusPemeriksaanBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatTanggal, formatTanggalJam } from "@/lib/format";
import { useDaftarDraf, useHapusDraf } from "../hooks/use-kegiatan";
import type { DrafRingkas } from "../types";

// Panel draf kegiatan milik pegawai di atas daftar kegiatan

const namaDraf = (d: DrafRingkas) => d.judul ?? "Draf tanpa judul";

export function DrafSaya() {
  const daftar = useDaftarDraf();
  const hapus = useHapusDraf();
  const [akanDihapus, setAkanDihapus] = useState<DrafRingkas | null>(null);

  if (!daftar.data?.length) return null;

  const konfirmasiHapus = () => {
    if (!akanDihapus) return;
    hapus.mutate(akanDihapus.id, {
      onSuccess: () => {
        toast.success("Draf dihapus");
        setAkanDihapus(null);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Panel className="mb-4">
      <div className="flex items-center justify-between gap-2 border-b border-muted px-4 py-3 md:px-5">
        <h2 className="font-heading text-sm font-bold">Draf saya</h2>
        <span className="text-xs text-muted-foreground">Belum tersimpan sebagai kegiatan</span>
      </div>
      <ul className="divide-y divide-muted">
        {daftar.data.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-5">
            <StatusPemeriksaanBadge status="draf" />
            <div className="min-w-0 flex-1">
              <p className={d.judul ? "truncate text-sm font-semibold" : "truncate text-sm text-muted-foreground italic"}>{namaDraf(d)}</p>
              <p className="text-xs text-muted-foreground">
                {d.tanggalMulai && `Rencana ${formatTanggal(d.tanggalMulai)} · `}
                Disimpan {formatTanggalJam(d.updatedAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" className="h-8 px-3 text-xs">
                <Link href={`/kegiatan/baru?draf=${d.id}`}>
                  <FilePen aria-hidden className="size-3.5" />
                  Lanjutkan
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setAkanDihapus(d)}
                aria-label={`Hapus draf ${namaDraf(d)}`}
              >
                <Trash2 aria-hidden className="size-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={akanDihapus != null}
        onOpenChange={(buka) => !buka && setAkanDihapus(null)}
        title={`Hapus draf "${akanDihapus ? namaDraf(akanDihapus) : ""}"?`}
        description="Isian draf ini akan dibuang dan tidak bisa dikembalikan."
        confirmLabel="Hapus draf"
        pendingLabel="Menghapus..."
        onConfirm={konfirmasiHapus}
        pending={hapus.isPending}
      />
    </Panel>
  );
}
