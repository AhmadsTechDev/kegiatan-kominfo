import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAngka } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Navigasi halaman data dengan ringkasan rentang baris
 */

type PaginationBarProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  satuan?: string;
  className?: string;
};

function nomorHalaman(page: number, jumlah: number): (number | "…")[] {
  const set = new Set([1, jumlah, page - 1, page, page + 1].filter((n) => n >= 1 && n <= jumlah));
  const urut = [...set].sort((a, b) => a - b);
  return urut.flatMap((n, i) => (i > 0 && n - urut[i - 1]! > 1 ? (["…", n] as const) : [n]));
}

export function PaginationBar({ page, pageSize, total, onPageChange, satuan = "kegiatan", className }: PaginationBarProps) {
  const jumlah = Math.max(1, Math.ceil(total / pageSize));
  const awal = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const akhir = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Navigasi halaman" className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
        Menampilkan {formatAngka(awal)}–{formatAngka(akhir)} dari {formatAngka(total)} {satuan}
      </p>
      {jumlah > 1 && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-10" aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft />
          </Button>
          {nomorHalaman(page, jumlah).map((n, i) =>
            n === "…" ? (
              <span key={`jeda-${i}`} aria-hidden className="px-1 text-sm text-muted-foreground max-sm:hidden">
                …
              </span>
            ) : (
              <Button
                key={n}
                variant="ghost"
                className={cn(
                  "size-10 tabular-nums max-sm:[&:not([aria-current])]:hidden",
                  n === page && "border border-primary/30 bg-secondary font-bold text-primary hover:bg-secondary",
                )}
                aria-label={`Halaman ${n}`}
                aria-current={n === page ? "page" : undefined}
                onClick={() => onPageChange(n)}
              >
                {n}
              </Button>
            ),
          )}
          <Button variant="ghost" size="icon" className="size-10" aria-label="Halaman berikutnya" disabled={page >= jumlah} onClick={() => onPageChange(page + 1)}>
            <ChevronRight />
          </Button>
        </div>
      )}
    </nav>
  );
}