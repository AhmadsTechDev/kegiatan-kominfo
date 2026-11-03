// =============================================================================
// HALAMAN PENGATURAN AKUN PENGGUNA
// =============================================================================
// Gunanya: Menyediakan pengelolaan akun mandiri dalam empat kelompok: Profil,
// Informasi akun, Keamanan, dan Preferensi.
//
// Isi berkas:
//   - KartuProfil    : kartu identitas pengguna dan pengelolaan foto avatar
//   - TAB            : daftar kelompok pengaturan (dibaca dari ?tab= agar bisa ditautkan)
//   - IsiTab         : panel yang ditampilkan untuk tiap kelompok
//   - PengaturanView : komponen induk pengatur tata letak seluruh pengaturan
//
// Cara kerja:
//   1. Mengambil data akun pengguna yang sedang masuk menggunakan useProfil.
//   2. Menangani validasi ukuran (maks. 2 MB) dan format gambar (JPEG, PNG, WebP)
//      sebelum mengunggah berkas foto profil ke backend.
//   3. Kelompok aktif disimpan di URL (?tab=akun) sehingga tautan dari email (mis. setelah
//      verifikasi email baru) langsung membuka kelompok yang tepat.
//
// Catatan penting:
//   - Mengacu pada kebutuhan pengelolaan akun di features/07-masuk-kelola-akun.md.
//   - Nama, NIP, jabatan, dan bidang bersifat read-only (dikelola admin).
//
// Dipakai oleh: frontend/src/app/(app)/pengaturan/page.tsx
// =============================================================================

"use client";

import { Building2, Camera, Mail, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { AvatarInisial } from "@/components/shared/avatar-inisial";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { Panel } from "@/components/shared/panel";
import { StatusAkunBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { idTab, PilihanTab } from "@/features/admin/components/admin-shared";
import { useProfil, type Profil } from "@/features/auth/hooks/use-profil";
import { KETERANGAN_ROLE } from "@/types/auth";
import { useHapusFoto, useUnggahFoto } from "../hooks/use-foto-profil";
import { PanelAkun } from "./panel-akun";
import { PanelKeluar, PanelSandi, PanelSesi } from "./panel-keamanan";
import { PanelNotifikasi, PanelTema } from "./panel-preferensi";
import { PanelKepegawaian, PanelKontak } from "./panel-profil";

const berlangganan = () => () => {};

const UKURAN_MAKS = 2 * 1024 * 1024;
const JENIS_FOTO = ["image/jpeg", "image/png", "image/webp"];

function KartuProfil({ p }: { p: Profil }) {
  const unggah = useUnggahFoto();
  const hapus = useHapusFoto();
  const input = useRef<HTMLInputElement>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);

  const pilih = (berkas: File | undefined) => {
    if (!berkas) return;
    if (!JENIS_FOTO.includes(berkas.type)) return toast.error("Foto harus JPEG, PNG, atau WebP.");
    if (berkas.size > UKURAN_MAKS) return toast.error("Ukuran foto maksimal 2 MB.");
    unggah.mutate(berkas, {
      onSuccess: () => toast.success("Foto profil diperbarui"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <Panel className="overflow-hidden">
      <div aria-hidden className="h-24 bg-linear-to-r from-[#1a2a6e] via-[#26418f] to-[#0d9488] md:h-28 dark:opacity-85" />
      <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end md:px-6">
        <div className="relative -mt-12 w-fit shrink-0">
          <AvatarInisial nama={p.name} src={p.foto} className="size-24 rounded-3xl text-2xl ring-4 ring-card" />
          {unggah.isPending && (
            <span className="absolute inset-0 flex items-center justify-center rounded-3xl bg-background/70">
              <Spinner className="size-6" />
            </span>
          )}
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={unggah.isPending}
            aria-label={p.foto ? "Ganti foto profil" : "Unggah foto profil"}
            title="JPEG, PNG, atau WebP. Maks. 2 MB"
            className="absolute -right-1.5 -bottom-1.5 flex size-9 pointer-coarse:size-11 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
          >
            <Camera aria-hidden className="size-4" />
          </button>
          <input
            ref={input}
            type="file"
            accept={JENIS_FOTO.join(",")}
            className="sr-only"
            onChange={(e) => {
              pilih(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <div className="min-w-0 flex-1 sm:pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-2xl font-extrabold tracking-tight">{p.name}</h2>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-primary">{KETERANGAN_ROLE[p.role] ?? p.role}</span>
            {p.status !== "AKTIF" && <StatusAkunBadge status={p.status} />}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Mail aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{p.email}</span>
            </span>
            {p.pegawai && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Building2 aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">{p.pegawai.bidang.nama}</span>
              </span>
            )}
          </p>
        </div>

        {p.foto && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 pointer-coarse:min-h-11 self-start text-muted-foreground sm:self-end"
            onClick={() => setKonfirmasiHapus(true)}
            disabled={hapus.isPending}
          >
            <Trash2 aria-hidden />
            Hapus foto
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={konfirmasiHapus}
        onOpenChange={setKonfirmasiHapus}
        title="Hapus foto profil?"
        description="Avatar Anda kembali menampilkan inisial nama."
        confirmLabel="Hapus foto"
        pendingLabel="Menghapus..."
        pending={hapus.isPending}
        onConfirm={() =>
          hapus.mutate(undefined, {
            onSuccess: () => {
              toast.success("Foto profil dihapus");
              setKonfirmasiHapus(false);
            },
            onError: (e) => toast.error(e.message),
          })
        }
      />
    </Panel>
  );
}

type Tab = "profil" | "akun" | "keamanan" | "preferensi";
const ID_PANEL = "panel-pengaturan";

const TAB: { nilai: Tab; label: string }[] = [
  { nilai: "profil", label: "Profil" },
  { nilai: "akun", label: "Informasi akun" },
  { nilai: "keamanan", label: "Keamanan" },
  { nilai: "preferensi", label: "Preferensi" },
];

function IsiTab({ tab, p }: { tab: Tab; p: Profil }) {
  if (tab === "akun") return <PanelAkun p={p} />;
  if (tab === "keamanan") {
    return (
      <div className="flex flex-col gap-5">
        <PanelSandi />
        <PanelSesi />
        <PanelKeluar />
      </div>
    );
  }
  if (tab === "preferensi") {
    return (
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <PanelTema />
        <PanelNotifikasi />
      </div>
    );
  }
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <PanelKepegawaian p={p} />
      <PanelKontak key={p.kontak ?? ""} p={p} />
    </div>
  );
}

export function PengaturanView() {
  const profil = useProfil();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const dariUrl = searchParams.get("tab");
  const tab: Tab = TAB.some((t) => t.nilai === dariUrl) ? (dariUrl as Tab) : "profil";
  const terhidrasi = useSyncExternalStore(
    berlangganan,
    () => true,
    () => false,
  );

  if (!terhidrasi || profil.isPending) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-10 w-80 rounded-lg" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }
  if (profil.isError) return <ErrorState message={profil.error.message} onRetry={() => profil.refetch()} retrying={profil.isRefetching} />;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="sr-only">Pengaturan</h1>
      <KartuProfil p={profil.data} />
      <PilihanTab
        label="Kelompok pengaturan"
        idPanel={ID_PANEL}
        value={tab}
        onChange={(t) => router.replace(t === "profil" ? pathname : `${pathname}?tab=${t}`, { scroll: false })}
        opsi={TAB}
      />
      <div role="tabpanel" id={ID_PANEL} aria-labelledby={idTab(ID_PANEL, tab)}>
        <IsiTab tab={tab} p={profil.data} />
      </div>
    </div>
  );
}
