"use client";

import { tableFeatures, useTable, type ColumnDef, type RowData } from "@tanstack/react-table";
import { Inbox, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { EmptyState } from "./empty-state";

// Tabel data generik dengan skeleton, kartu di ponsel, dan keadaan kosong

export const dataTableFeatures = tableFeatures({});
export type DataTableColumn<TData extends RowData> = ColumnDef<typeof dataTableFeatures, TData>;

type DataTableProps<TData extends RowData> = {
  columns: DataTableColumn<TData>[];
  data: TData[];
  isLoading?: boolean;
  skeletonRows?: number;
  empty?: { icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode };
  renderMobileCard?: (row: TData) => React.ReactNode;
  getRowKey?: (row: TData, index: number) => string;
  caption?: string;
  animasiMasuk?: boolean;
  bleed?: boolean;
  /** Jarak antarkolom lebih rapat, untuk tabel dengan banyak kolom agar tidak perlu digeser */
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

export function DataTable<TData extends RowData>({
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
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId: getRowKey ? (row, index) => getRowKey(row, index) : undefined,
  });

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
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="border-y bg-background hover:bg-background">
              {group.headers.map((header) => (
                <TableHead key={header.id} scope="col" className={cn("h-10 px-4 text-xs font-bold tracking-wider text-muted-foreground uppercase", padat && "px-3")}>
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row, i) => (
            <TableRow key={row.id} {...animasiBaris(animasiMasuk, i)}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id} className={cn("px-4 py-3", padat && "px-3")}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
