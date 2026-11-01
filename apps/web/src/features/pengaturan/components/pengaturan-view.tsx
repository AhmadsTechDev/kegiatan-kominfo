// =============================================================================
// HALAMAN PENGATURAN AKUN PENGGUNA
// =============================================================================
// Gunanya: Menyediakan antarmuka pengelolaan akun mandiri meliputi informasi
// profil, foto avatar, data kepegawaian, keamanan sandi, dan preferensi tema.
//
// Isi berkas:
//   - KartuProfil       : kartu identitas pengguna dan pengelolaan foto avatar
//   - PanelKepegawaian  : panel rincian data NIP dan unit kerja dinas
//   - PanelKeamanan     : panel keamanan untuk pemicu modal ganti kata sandi
//   - PanelTampilan     : panel pengaturan pilihan tema (terang, gelap, sistem)
//   - PengaturanView    : komponen induk pengatur tata letak seluruh pengaturan
//
// Cara kerja:
//   1. Mengambil data akun pengguna yang sedang masuk menggunakan useProfil.
//   2. Menangani validasi ukuran (maks. 2 MB) dan format gambar (JPEG, PNG, WebP)
//      sebelum mengunggah berkas foto profil ke backend.
//   3. Menampilkan dialog konfirmasi sebelum mengeksekusi penghapusan foto profil.
//   4. Mengatur preferensi tema tampilan antarmuka peramban melalui next-themes.
//   5. Menjaga konsistensi render antara server dan klien via useSyncExternalStore.
//
// Catatan penting:
//   - Mengacu pada kebutuhan pengelolaan akun di features/07-masuk-kelola-akun.md.
//   - Aturan keamanan: kata sandi minimal 10 karakter dan akun akan terkunci
//     selama 15 menit apabila terjadi kegagalan masuk sebanyak 5 kali berturut-turut.
//   - Data NIP dan unit kerja bersifat read-only bagi pegawai (dikelola admin).
//
// Dipakai oleh: frontend/src/app/(app)/pengaturan/page.tsx
// =============================================================================

"use client";

import { Building2, Camera, IdCard, KeyRound, Mail, Monitor, Moon, ShieldCheck, Sun, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { AvatarInisial } from "@/components/shared/avatar-inisial";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { GantiSandiDialog } from "@/features/auth/components/ganti-sandi-dialog";
import { useProfil, type Profil } from "@/features/auth/hooks/use-profil";
import { cn } from "@/lib/utils";
import { KETERANGAN_ROLE } from "@/types/auth";
import { useHapusFoto, useUnggahFoto } from "../hooks/use-foto-profil";
import { PanelProfil } from "./panel-profil";

const berlangganan = () => () => {};

const UKURAN_MAKS = 2 * 1024 * 1024;
const JENIS_FOTO = ["image/jpeg", "image/png", "image/webp"];

const TEMA = [
  { nilai: "light", label: "Terang", ikon: Sun },
  { nilai: "dark", label: "Gelap", ikon: Moon },
  { nilai: "system", label: "Sistem", ikon: Monitor },
] as const;

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
            className="absolute -right-1.5 -bottom-1.5 flex size-9 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
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
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Mail aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{p.email}</span>
            </span>
            {p.pegawai && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Building2 aria-hidden className="size-3.5 shrink-0" />
                <span className="truncate">{p.pegawai.unitKerja.nama}</span>
              </span>
            )}
          </p>
        </div>

        {p.foto && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 self-start text-muted-foreground sm:self-end"
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

function Baris({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-3.5 sm:flex-row sm:items-baseline sm:gap-4 md:px-6">
      <dt className="text-sm text-muted-foreground sm:w-32 sm:shrink-0">{label}</dt>
      <dd className="min-w-0 text-sm font-medium">{children}</dd>
    </div>
  );
}

const Kosong = ({ teks = "-" }: { teks?: string }) => <span className="font-normal text-muted-foreground">{teks}</span>;

function PanelKepegawaian({ p }: { p: Profil }) {
  const unit = p.pegawai?.unitKerja;
  return (
    <Panel className="h-fit">
      <PanelHeader title="Data kepegawaian" description="NIP dan unit kerja diatur administrator lewat Master data." />
      {p.pegawai ? (
        <dl className="divide-y divide-muted border-t border-muted">
          <Baris label="Nama pegawai">{p.pegawai.nama}</Baris>
          <Baris label="NIP">{p.pegawai.nip ? <span className="tabular-nums">{p.pegawai.nip}</span> : <Kosong teks="Tanpa NIP" />}</Baris>
          <Baris label="Unit kerja">
            {unit?.nama}
            {unit?.parent && <span className="block text-xs font-normal text-muted-foreground">di bawah {unit.parent.nama}</span>}
          </Baris>
        </dl>
      ) : (
        <PanelBody className="flex items-start gap-3 border-t border-muted pt-4 md:pt-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <IdCard aria-hidden className="size-5" />
          </span>
          <div className="text-sm">
            <p className="font-medium">Belum terhubung ke data pegawai</p>
            <p className="mt-0.5 text-muted-foreground">
              {p.role === "PEGAWAI"
                ? "Minta administrator mengatur unit kerja Anda agar bisa mencatat kegiatan."
                : "Tidak wajib untuk akun pimpinan dan administrator."}
            </p>
          </div>
        </PanelBody>
      )}
    </Panel>
  );
}

function PanelKeamanan() {
  const [buka, setBuka] = useState(false);
  return (
    <Panel>
      <PanelHeader title="Keamanan" />
      <PanelBody className="flex items-start gap-3 border-t border-muted pt-4 md:pt-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
          <ShieldCheck aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Kata sandi</p>
          <p className="text-xs text-muted-foreground">Minimal 10 karakter. Akun terkunci 15 menit setelah 5 kali salah.</p>
          <Button variant="outline" size="sm" className="mt-3 h-9" onClick={() => setBuka(true)}>
            <KeyRound aria-hidden />
            Ganti kata sandi
          </Button>
        </div>
      </PanelBody>
      <GantiSandiDialog open={buka} onOpenChange={setBuka} />
    </Panel>
  );
}

function PanelTampilan() {
  const { theme, setTheme } = useTheme();
  const siap = useSyncExternalStore(
    berlangganan,
    () => true,
    () => false,
  );
  return (
    <Panel>
      <PanelHeader title="Tampilan" description="Berlaku di perangkat ini." />
      <PanelBody className="border-t border-muted pt-4 md:pt-5">
        <div role="radiogroup" aria-label="Tema tampilan" className="grid grid-cols-3 gap-2">
          {TEMA.map(({ nilai, label, ikon: Ikon }) => {
            const aktif = siap && theme === nilai;
            return (
              <button
                key={nilai}
                type="button"
                role="radio"
                aria-checked={aktif}
                onClick={() => setTheme(nilai)}
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

export function PengaturanView() {
  const profil = useProfil();
  const terhidrasi = useSyncExternalStore(
    berlangganan,
    () => true,
    () => false,
  );

  if (!terhidrasi || profil.isPending) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-52 w-full rounded-xl" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }
  if (!profil.data) return null;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="sr-only">Pengaturan</h1>
      <KartuProfil p={profil.data} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <PanelProfil key={`${profil.data.name}|${profil.data.pegawai?.jabatan}|${profil.data.kontak}`} p={profil.data} />
          <PanelKepegawaian p={profil.data} />
        </div>
        <div className="flex flex-col gap-5">
          <PanelKeamanan />
          <PanelTampilan />
        </div>
      </div>
    </div>
  );
}
