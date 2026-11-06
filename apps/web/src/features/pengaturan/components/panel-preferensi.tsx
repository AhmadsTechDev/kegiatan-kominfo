"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { tabIndexPilihan, tanganiPanah } from "@/lib/navigasi-panah";
import { cn } from "@/lib/utils";
import type { Preferensi } from "../api/akun-saya";
import { usePreferensi, useTema, useUbahPreferensi } from "../hooks/use-akun-saya";

/**
 * Panel preferensi tema dan email pengingat; disimpan di akun agar ikut ke perangkat lain
 */

const berlangganan = () => () => {};

const TEMA = [
  { nilai: "light", label: "Terang", ikon: Sun },
  { nilai: "dark", label: "Gelap", ikon: Moon },
  { nilai: "system", label: "Sistem", ikon: Monitor },
] as const;
const NILAI_TEMA = TEMA.map((t) => t.nilai);

function Saklar({ id, aktif, onChange, label, keterangan }: { id: string; aktif: boolean; onChange: (v: boolean) => void; label: string; keterangan: string }) {
  return (
    <div className="flex items-start gap-4 py-3.5">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <p id={`${id}-ket`} className="text-xs text-muted-foreground">
          {keterangan}
        </p>
      </div>
      {/* Tombol membungkus lintasan agar area sentuh 44 px di layar sentuh. Saat mati, lintasan bergaris
          muted-foreground (7:1 terhadap card) supaya bentuknya tetap terlihat, bukan hanya beda warna isi */}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={aktif}
        aria-describedby={`${id}-ket`}
        onClick={() => onChange(!aktif)}
        className="-my-1 inline-flex shrink-0 items-center justify-center rounded-full p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11 pointer-coarse:min-w-11"
      >
        <span aria-hidden className={cn("inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors", aktif ? "border-primary bg-primary" : "border-muted-foreground bg-card")}>
          <span className={cn("inline-block size-4 rounded-full transition-transform", aktif ? "translate-x-[22px] bg-background" : "translate-x-0.5 bg-muted-foreground")} />
        </span>
      </button>
    </div>
  );
}

export function PanelTema() {
  const { tema, pilih } = useTema();
  const siap = useSyncExternalStore(
    berlangganan,
    () => true,
    () => false,
  );
  return (
    <Panel>
      <PanelHeader title="Tema tampilan" />
      <PanelBody className="border-t border-muted pt-4 md:pt-5">
        <div
          role="radiogroup"
          aria-label="Tema tampilan"
          className="grid grid-cols-3 gap-2"
          onKeyDown={(e) => tanganiPanah(e, NILAI_TEMA, siap ? tema : undefined, pilih)}
        >
          {TEMA.map(({ nilai, label, ikon: Ikon }) => {
            const aktif = siap && tema === nilai;
            return (
              <button
                key={nilai}
                type="button"
                role="radio"
                aria-checked={aktif}
                tabIndex={tabIndexPilihan(nilai, siap ? tema : undefined, NILAI_TEMA[0])}
                onClick={() => pilih(nilai)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  aktif ? "border-primary bg-secondary text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Ikon aria-hidden className="size-5" />
                {label}
              </button>
            );
          })}
        </div>
      </PanelBody>
    </Panel>
  );
}

export function PanelNotifikasi() {
  const pref = usePreferensi();
  const ubah = useUbahPreferensi();
  const simpan = (isi: Partial<Preferensi>) => ubah.mutate(isi, { onError: (e) => toast.error(e.message) });

  return (
    <Panel>
      <PanelHeader title="Notifikasi email" />
      <PanelBody className="border-t border-muted py-1 md:py-1">
        {pref.isPending ? (
          <div className="flex flex-col gap-3 py-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : pref.isError ? (
          <ErrorState className="my-3" message={pref.error.message} onRetry={() => pref.refetch()} retrying={pref.isRefetching} />
        ) : (
          <div className="divide-y divide-muted">
            <Saklar
              id="notif-kegiatan"
              aktif={pref.data.notifPengingatKegiatan}
              onChange={(v) => simpan({ notifPengingatKegiatan: v })}
              label="Pengingat kegiatan"
              keterangan="Email sehari sebelum kegiatan dimulai."
            />
            <Saklar
              id="notif-dokumentasi"
              aktif={pref.data.notifPengingatDokumentasi}
              onChange={(v) => simpan({ notifPengingatDokumentasi: v })}
              label="Pengingat dokumentasi"
              keterangan="Email bila kegiatan yang sudah selesai belum punya foto atau notulen."
            />
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
