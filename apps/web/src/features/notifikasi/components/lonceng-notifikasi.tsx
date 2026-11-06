"use client";

import { Bell, CircleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTanggalJam } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Notifikasi } from "../api/notifikasi";
import { useBacaNotifikasi, useBacaSemuaNotifikasi, useNotifikasi } from "../hooks/use-notifikasi";

/**
 * Lonceng notifikasi pegawai: hasil pemeriksaan kegiatan beserta catatannya
 */

export function LoncengNotifikasi() {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const daftar = useNotifikasi();
  const baca = useBacaNotifikasi();
  const bacaSemua = useBacaSemuaNotifikasi();
  const belum = daftar.data?.belumDibaca ?? 0;

  const pilih = (n: Notifikasi) => {
    if (!n.dibacaAt) baca.mutate(n.id);
    setBuka(false);
    if (n.kegiatanId) router.push(`/kegiatan/${n.kegiatanId}`);
  };

  return (
    <Popover open={buka} onOpenChange={setBuka}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 rounded-full text-muted-foreground"
          aria-label={belum > 0 ? `Notifikasi, ${belum} belum dibaca` : "Notifikasi"}
        >
          <Bell aria-hidden className="size-[18px]" />
          {belum > 0 && (
            <span
              aria-hidden
              className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground tabular-nums"
            >
              {belum > 9 ? "9+" : belum}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="font-heading text-sm font-bold">Notifikasi</p>
          {belum > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-primary pointer-coarse:min-h-11"
              onClick={() => bacaSemua.mutate()}
              disabled={bacaSemua.isPending}
            >
              Tandai semua dibaca
            </Button>
          )}
        </div>
        <div className="max-h-[min(24rem,60dvh)] overflow-y-auto overscroll-contain">
          {daftar.isPending ? (
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : daftar.isError ? (
            <ErrorState className="m-3" message={daftar.error.message} onRetry={() => daftar.refetch()} retrying={daftar.isRefetching} />
          ) : daftar.data.items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Belum ada notifikasi.</p>
          ) : (
            <ul className="divide-y divide-muted">
              {daftar.data.items.map((n) => {
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => pilih(n)}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                        !n.dibacaAt && "bg-secondary/60",
                      )}
                    >
                      <CircleAlert
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-status-berlangsung-foreground"
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className={cn("text-sm [overflow-wrap:anywhere]", !n.dibacaAt ? "font-semibold" : "font-medium")}>{n.judul}</span>
                        {n.isi && <span className="line-clamp-2 text-xs text-muted-foreground [overflow-wrap:anywhere]">{n.isi}</span>}
                        <span className="text-[11px] text-muted-foreground">
                          {formatTanggalJam(n.createdAt)}
                          {!n.dibacaAt && <span className="sr-only">, belum dibaca</span>}
                        </span>
                      </span>
                      {!n.dibacaAt && <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
