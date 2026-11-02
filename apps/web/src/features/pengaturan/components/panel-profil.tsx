// =============================================================================
// PANEL PROFIL: DATA KEPEGAWAIAN DAN KONTAK
// =============================================================================
// Gunanya: Menampilkan data kepegawaian (dikelola administrator, hanya dibaca) dan
// formulir nomor kontak yang boleh diubah sendiri oleh pemilik akun.
//
// Isi berkas:
//   - Baris, Kosong      : baris label-nilai dan penanda nilai kosong (dipakai panel lain)
//   - PanelKepegawaian   : nama, NIP, jabatan, dan unit kerja (read-only)
//   - PanelKontak        : formulir nomor kontak (PATCH /me)
//
// Catatan penting:
//   - Nama, NIP, jabatan, dan unit kerja hanya bisa diubah admin; backend menolak perubahan dari pemilik akun.
//   - Foto profil diubah dari kartu profil di bagian atas halaman Pengaturan.
//
// Dipakai oleh: frontend/src/features/pengaturan/components/pengaturan-view.tsx
// =============================================================================

"use client";

import { Check, IdCard, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { Profil } from "@/features/auth/hooks/use-profil";
import { ApiError } from "@/lib/api-client";
import { useUbahKontak } from "../hooks/use-akun-saya";

export function Baris({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-3.5 sm:flex-row sm:items-baseline sm:gap-4 md:px-6">
      <dt className="text-sm text-muted-foreground sm:w-36 sm:shrink-0">{label}</dt>
      <dd className="min-w-0 text-sm font-medium">{children}</dd>
    </div>
  );
}

export const Kosong = ({ teks = "-" }: { teks?: string }) => <span className="font-normal text-muted-foreground">{teks}</span>;

export function PanelKepegawaian({ p }: { p: Profil }) {
  const unit = p.pegawai?.unitKerja;
  // Admin mengelola datanya sendiri lewat Manajemen akun; role lain harus meminta admin
  const admin = p.role === "ADMIN";
  return (
    <Panel className="h-fit">
      <PanelHeader
        title="Data kepegawaian"
        description={admin ? "Diubah lewat Manajemen akun, sama seperti akun lain." : "Dikelola administrator. Hubungi admin bila ada data yang keliru."}
        action={
          admin && (
            <Button asChild variant="outline" size="sm" className="h-9 pointer-coarse:min-h-11">
              <Link href={`/admin/akun/${p.id}`}>
                <Pencil aria-hidden />
                Kelola
              </Link>
            </Button>
          )
        }
      />
      {p.pegawai ? (
        <dl className="divide-y divide-muted border-t border-muted">
          <Baris label="Nama lengkap">{p.pegawai.nama}</Baris>
          <Baris label="NIP">{p.pegawai.nip ? <span className="tabular-nums">{p.pegawai.nip}</span> : <Kosong teks="Tanpa NIP" />}</Baris>
          <Baris label="Jabatan">{p.pegawai.jabatan ?? <Kosong />}</Baris>
          <Baris label="Bidang">
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
            <p className="font-medium">Jabatan dan bidang belum diisi</p>
            <p className="mt-0.5 text-muted-foreground">
              {admin ? "Lengkapi lewat tombol Kelola di atas." : "Minta administrator melengkapi jabatan dan bidang akun Anda."}
            </p>
          </div>
        </PanelBody>
      )}
    </Panel>
  );
}

const POLA_KONTAK = /^[0-9+()\-\s]*$/;

export function PanelKontak({ p }: { p: Profil }) {
  const simpan = useUbahKontak();
  const awal = p.kontak ?? "";
  const [kontak, setKontak] = useState(awal);
  const [galat, setGalat] = useState<string | null>(null);

  const kirim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!POLA_KONTAK.test(kontak)) return setGalat("Kontak berupa nomor telepon, mis. 0812-3456-7890");
    setGalat(null);
    simpan.mutate(kontak.trim() || null, {
      onSuccess: () => toast.success("Kontak diperbarui"),
      onError: (e) => (e instanceof ApiError && e.details?.length ? setGalat(e.details[0]!.message) : toast.error(e.message)),
    });
  };

  return (
    <Panel className="h-fit">
      <PanelHeader title="Kontak" description={p.role === "ADMIN" ? "Hanya terlihat oleh Anda dan administrator lain." : "Hanya terlihat oleh Anda dan administrator."} />
      <PanelBody className="border-t border-muted pt-4 md:pt-5">
        <form onSubmit={kirim} noValidate className="flex flex-col gap-4">
          <Field data-invalid={!!galat}>
            <FieldLabel htmlFor="profil-kontak">Nomor telepon/WhatsApp</FieldLabel>
            <Input
              id="profil-kontak"
              className="h-10 pointer-coarse:min-h-11"
              inputMode="tel"
              autoComplete="tel"
              maxLength={50}
              value={kontak}
              onChange={(e) => setKontak(e.target.value)}
              aria-invalid={!!galat}
            />
            {galat ? <FieldError>{galat}</FieldError> : <FieldDescription>Contoh: 0812-3456-7890. Boleh dikosongkan.</FieldDescription>}
          </Field>
          {/* Tombol utama baru muncul saat ada perubahan; tombol utama yang dipudarkan tampak kusam di tema gelap */}
          <Button type="submit" variant={kontak === awal ? "outline" : "default"} className="h-10 pointer-coarse:min-h-11 w-fit" disabled={kontak === awal || simpan.isPending}>
            {simpan.isPending ? <Spinner /> : <Check aria-hidden />}
            Simpan kontak
          </Button>
        </form>
      </PanelBody>
    </Panel>
  );
}
