"use client";

import { KeyRound, LogOut, MonitorX, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DaftarSesi, namaPerangkat, type Sesi } from "@/components/shared/daftar-sesi";
import { ErrorState } from "@/components/shared/error-state";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { GantiSandiDialog } from "@/features/auth/components/ganti-sandi-dialog";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useCabutSesi, useCabutSesiLain, useSesi } from "../hooks/use-akun-saya";

// Panel keamanan: ganti kata sandi, sesi login aktif, dan keluar

export function PanelSandi() {
  const [buka, setBuka] = useState(false);
  return (
    <Panel>
      <PanelHeader title="Kata sandi" />
      <PanelBody className="flex items-center gap-3 border-t border-muted pt-4 md:pt-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
          <ShieldCheck aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <Button variant="outline" size="sm" className="h-9 pointer-coarse:min-h-11" onClick={() => setBuka(true)}>
            <KeyRound aria-hidden />
            Ganti kata sandi
          </Button>
        </div>
      </PanelBody>
      <GantiSandiDialog open={buka} onOpenChange={setBuka} />
    </Panel>
  );
}

export function PanelSesi() {
  const sesi = useSesi();
  const cabut = useCabutSesi();
  const cabutLain = useCabutSesiLain();
  const [target, setTarget] = useState<Sesi | "lainnya" | null>(null);
  const jumlahLain = sesi.data?.filter((s) => !s.sesiIni).length ?? 0;

  const konfirmasi = () => {
    if (target === "lainnya") {
      cabutLain.mutate(undefined, {
        onSuccess: (h) => {
          toast.success(`${h.jumlah} sesi di perangkat lain dikeluarkan`);
          setTarget(null);
        },
        onError: (e) => toast.error(e.message),
      });
    } else if (target) {
      cabut.mutate(target.id, {
        onSuccess: () => {
          toast.success(`${namaPerangkat(target.userAgent).teks} dikeluarkan`);
          setTarget(null);
        },
        onError: (e) => toast.error(e.message),
      });
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="Sesi aktif"
        action={
          jumlahLain > 0 && (
            <Button variant="outline" size="sm" className="h-9 pointer-coarse:min-h-11" onClick={() => setTarget("lainnya")}>
              <MonitorX aria-hidden />
              Keluarkan perangkat lain
            </Button>
          )
        }
      />
      <PanelBody className="border-t border-muted pt-1 md:pt-1">
        {sesi.isPending ? (
          <div className="flex flex-col gap-3 py-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : sesi.isError ? (
          <ErrorState className="my-3" message={sesi.error.message} onRetry={() => sesi.refetch()} retrying={sesi.isRefetching} />
        ) : (
          <DaftarSesi sesi={sesi.data} onCabut={setTarget} pendingId={cabut.isPending ? cabut.variables : null} />
        )}
      </PanelBody>
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(v) => !v && setTarget(null)}
        title={target === "lainnya" ? "Keluarkan semua perangkat lain?" : `Keluarkan ${target ? namaPerangkat(target.userAgent).teks : "perangkat"}?`}
        description="Perangkat tersebut harus masuk ulang dengan kata sandi. Perangkat ini tetap masuk."
        confirmLabel="Keluarkan"
        pendingLabel="Mengeluarkan..."
        pending={cabut.isPending || cabutLain.isPending}
        onConfirm={konfirmasi}
      />
    </Panel>
  );
}

export function PanelKeluar() {
  const { logout, pending } = useLogout();
  const cabutLain = useCabutSesiLain();
  const sibuk = pending || cabutLain.isPending;

  // Semua perangkat lain dikeluarkan lebih dulu, baru perangkat ini
  const keluarSemua = () =>
    cabutLain.mutate(undefined, { onSuccess: logout, onError: (e) => toast.error(e.message) });

  return (
    <Panel>
      {/* Panel tanpa PanelHeader, jadi PanelBody perlu padding atas sendiri */}
      <PanelBody className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center md:pt-5">
        <p className="min-w-0 flex-1 text-sm font-medium">Keluar dari akun</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="h-10 pointer-coarse:min-h-11" onClick={keluarSemua} disabled={sibuk}>
            {cabutLain.isPending ? <Spinner /> : <MonitorX aria-hidden />}
            Keluar dari semua perangkat
          </Button>
          <Button variant="outline" className="h-10 pointer-coarse:min-h-11 text-destructive hover:text-destructive" onClick={logout} disabled={sibuk}>
            {pending ? <Spinner /> : <LogOut aria-hidden />}
            Keluar
          </Button>
        </div>
      </PanelBody>
    </Panel>
  );
}
