"use client";

import { Inbox, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/utils/cn";
import { EmptyState } from "./empty-state";

export type DataTableColumn<TData> = {
  id: string;
  header: React.ReactNode;
  cell: (row: TData) => React.ReactNode;
};

export type DataTableEmpty = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

type DataTableProps<TData> = {
  columns: DataTableColumn<TData>[];
  data: TData[];
  isLoading?: boolean;
  skeletonRows?: number;
  empty?: DataTableEmpty;
  renderMobileCard?: (row: TData) => React.ReactNode;
  getRowKey?: (row: TData, index: number) => string;
  caption?: string;
  animasiMasuk?: boolean;
  bleed?: boolean;
  padat?: boolean;
  className?: string;
};

const BATAS_STAGGER = 8;

export function animasiBaris(aktif: boolean | undefined, i: number) {
  if (!aktif || i >= BATAS_STAGGER) return {};
  return {
    className: "animate-in fade-in slide-in-from-bottom-1 duration-200 ease-out-expo fill-mode-backwards",
    style: { animationDelay: `${i * 30}ms` },
  };
}

export function DataTableSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  skeletonRows = 5,
  empty = { title: "Belum ada data." },
  renderMobileCard,
  getRowKey,
  caption,
  animasiMasuk,
  bleed,
  padat,
  className,
}: DataTableProps<TData>) {
  if (isLoading) return <DataTableSkeleton rows={skeletonRows} className={cn(bleed && "px-4 pb-4", className)} />;

  if (data.length === 0) {
    return <EmptyState icon={empty.icon ?? Inbox} {...empty} className={className} />;
  }

  return (
    <div className={className}>
      {renderMobileCard && (
        <ul className={cn("flex flex-col gap-2 md:hidden", bleed && "px-4 pb-4")}>
          {data.map((row, i) => (
            <li key={getRowKey?.(row, i) ?? i} {...animasiBaris(animasiMasuk, i)}>
              {renderMobileCard(row)}
            </li>
          ))}
        </ul>
      )}
      <Table className={cn(renderMobileCard && "hidden md:table")}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <TableHeader>
          <TableRow className="border-y bg-background hover:bg-background">
            {columns.map((kolom) => (
              <TableHead
                key={kolom.id}
                scope="col"
                className={cn("h-10 px-4 text-xs font-bold tracking-wider text-muted-foreground uppercase", padat && "px-3")}
              >
                {kolom.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={getRowKey?.(row, i) ?? i} {...animasiBaris(animasiMasuk, i)}>
              {columns.map((kolom) => (
                <TableCell key={kolom.id} className={cn("px-4 py-3", padat && "px-3")}>
                  {kolom.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
