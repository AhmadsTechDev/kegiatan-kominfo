"use client";

import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/hooks/use-count-up";
import { formatAngka } from "@/lib/format";
import { cn } from "@/lib/utils";

// Kartu angka ringkasan (KPI) dengan ikon dan animasi angka

const NADA = {
  primary: "bg-secondary text-primary",
  "akan-datang": "bg-status-akan-datang text-status-akan-datang-foreground",
  berlangsung: "bg-status-berlangsung text-status-berlangsung-foreground",
  selesai: "bg-status-selesai text-status-selesai-foreground",
  dibatalkan: "bg-status-dibatalkan text-status-dibatalkan-foreground",
} as const;

type StatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  nada?: keyof typeof NADA;
  keterangan?: React.ReactNode;
  className?: string;
};

export function StatCard({ label, value, icon: Icon, nada = "primary", keterangan, className }: StatCardProps) {
  const tampil = useCountUp(value);

  return (
    <div className={cn("@container flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        {/* Di kartu sempit (grid 2 kolom di HP) ikon disembunyikan agar label tidak terjepit */}
        <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg @max-3xs:hidden", NADA[nada])}>
          <Icon className="size-5" />
        </span>
      </div>
      <p className="font-heading text-3xl leading-none font-extrabold tracking-tight tabular-nums">
        <span className="sr-only">{formatAngka(value)}</span>
        <span aria-hidden>{formatAngka(tampil)}</span>
      </p>
      {keterangan && <div className="text-xs text-muted-foreground">{keterangan}</div>}
    </div>
  );
}

export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:p-5", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="size-9 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}