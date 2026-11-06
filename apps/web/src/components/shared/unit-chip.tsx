import { cn } from "@/lib/utils";

/**
 * Label nama bidang / sub bidang penanggung jawab kegiatan
 */

export function UnitChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground", className)}>
      <span className="line-clamp-2">{children}</span>
    </span>
  );
}
