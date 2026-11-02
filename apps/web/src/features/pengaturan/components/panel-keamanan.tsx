// =============================================================================
// PANEL KEAMANAN AKUN
// =============================================================================
// Gunanya: Pengaturan keamanan akun sendiri: ganti kata sandi, sesi login aktif
// (keluarkan satu perangkat atau semua perangkat lain), dan keluar.
//
// Isi berkas:
//   - PanelSandi : tombol ganti kata sandi dan petunjuk bila lupa kata sandi
//   - PanelSesi  : daftar sesi aktif dengan keadaan memuat, galat, dan konfirmasi pencabutan
//   - PanelKeluar: tombol keluar dari perangkat ini
//
// Catatan penting:
//   - Akun terkunci 15 menit setelah 5 kali salah kata sandi.
//   - Sesi yang dicabut langsung tidak berlaku (backend memeriksa sesi di basis data setiap permintaan).
//
// Dipakai oleh: frontend/src/features/pengaturan/components/pengaturan-view.tsx
// =============================================================================

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

export function PanelSandi() {
  const [buka, setBuka] = useState(false);
  return (
    <Panel>
      <PanelHeader title="Kata sandi" />
      <PanelBody className="flex items-start gap-3 border-t border-muted pt-4 md:pt-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
          <ShieldCheck aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Minimal 10 karakter berisi huruf dan angka. Akun terkunci 15 menit setelah 5 kali salah.</p>
          <p className="mt-1 text-xs text-muted-foreground">Lupa kata sandi saat ini? Keluar, lalu pilih Lupa kata sandi di halaman masuk.</p>
          <Button variant="outline" size="sm" className="mt-3 h-9 pointer-coarse:min-h-11" onClick={() => setBuka(true)}>
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
        description="Perangkat yang sedang masuk ke akun Anda. Keluarkan perangkat yang tidak Anda kenali."
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
  return (
    <Panel>
      {/* Panel tanpa PanelHeader, jadi PanelBody perlu padding atas sendiri */}
      <PanelBody className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center md:pt-5">
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">Keluar dari perangkat ini</p>
          <p className="text-muted-foreground">Sesi di perangkat lain tidak terpengaruh.</p>
        </div>
        <Button variant="outline" className="h-10 pointer-coarse:min-h-11 text-destructive hover:text-destructive" onClick={logout} disabled={pending}>
          {pending ? <Spinner /> : <LogOut aria-hidden />}
          Keluar
        </Button>
      </PanelBody>
    </Panel>
  );
}
