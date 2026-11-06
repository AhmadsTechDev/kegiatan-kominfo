import { CircleSlash } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "@/components/shared/panel";
import { StatusBadge, type StatusPelaksanaan } from "@/components/shared/status-badge";
import { formatAngka } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { JumlahStatus } from "../types";

// Komposisi status pelaksanaan: satu batang bertumpuk plus rincian jumlah dan persentase

const STATUS: { kunci: Exclude<keyof JumlahStatus, "total" | "peserta">; status: StatusPelaksanaan; batang: string }[] = [
  { kunci: "selesai", status: "selesai", batang: "bg-status-selesai-foreground" },
  { kunci: "berlangsung", status: "berlangsung", batang: "bg-status-berlangsung-foreground" },
  { kunci: "akanDatang", status: "akan_datang", batang: "bg-status-akan-datang-foreground" },
  { kunci: "dibatalkan", status: "dibatalkan", batang: "bg-status-dibatalkan-foreground" },
];

export function SebaranStatus({ total, animasi, className }: { total: JumlahStatus; animasi: boolean; className?: string }) {
  const persen = (n: number) => (total.total === 0 ? 0 : Math.round((n / total.total) * 100));
  const isi = STATUS.filter((s) => total[s.kunci] > 0);

  return (
    <Panel className={className}>
      <PanelHeader title="Status pelaksanaan" />
      <PanelBody className="flex flex-1 flex-col gap-5">
        {total.total === 0 ? (
          <EmptyState icon={CircleSlash} title="Belum ada kegiatan pada periode ini." />
        ) : (
          <>
            {/* Celah 2 px antarsegmen memisahkan warna yang bersebelahan tanpa mengandalkan beda warna saja */}
            <div aria-hidden className="flex h-3 gap-0.5 overflow-hidden rounded-full">
              {isi.map((s, i) => (
                <div
                  key={s.kunci}
                  className={cn("h-full first:rounded-l-full last:rounded-r-full", s.batang, animasi && "animate-tumbuh-x")}
                  style={{ flexGrow: total[s.kunci], animationDelay: animasi ? `${i * 50}ms` : undefined }}
                />
              ))}
            </div>
            <ul className="flex flex-col divide-y divide-muted" aria-label="Jumlah kegiatan per status pelaksanaan">
              {STATUS.map((s) => (
                <li key={s.kunci} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden className={cn("size-2.5 shrink-0 rounded-sm", s.batang)} />
                    <StatusBadge status={s.status} />
                  </span>
                  <span className="flex items-baseline gap-2 tabular-nums">
                    <span className="text-xs text-muted-foreground">{persen(total[s.kunci])}%</span>
                    <span className={cn("w-10 text-right text-sm font-bold", total[s.kunci] === 0 && "font-normal text-muted-foreground")}>
                      {formatAngka(total[s.kunci])}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </PanelBody>
      {total.total > 0 && (
        <PanelFooter>
          <span>Peserta tercatat</span>
          <span className="font-semibold text-foreground tabular-nums">{formatAngka(total.peserta)} orang</span>
        </PanelFooter>
      )}
    </Panel>
  );
}
