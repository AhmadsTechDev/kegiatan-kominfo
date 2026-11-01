// =============================================================================
// PANEL PENGATURAN DATA PROFIL PENGGUNA
// =============================================================================
// Gunanya: Menyediakan formulir bagi pengguna untuk memperbarui informasi
// profil pribadi seperti nama lengkap, jabatan dinas, dan nomor kontak.
//
// Isi berkas:
//   - PanelProfil : komponen form pembaruan data profil dan kontak pengguna
//
// Cara kerja:
//   1. Menginisialisasi nilai awal form dari data profil pengguna saat ini.
//   2. Memvalidasi nama wajib diisi dan format nomor telepon di sisi klien.
//   3. Mengirim perubahan data ke server backend melalui permintaan PATCH /me.
//   4. Memperbarui cache TanStack Query dan sesi login setelah berhasil disimpan.
//
// Catatan penting:
//   - Mengacu pada features/07-masuk-kelola-akun.md (sub-fitur Atur Profil).
//   - Kolom jabatan hanya dapat diedit jika akun telah terhubung ke data pegawai.
//   - Galat validasi 422 dari backend dipetakan langsung ke masing-masing input.
//
// Dipakai oleh: frontend/src/features/pengaturan/components/pengaturan-view.tsx
// =============================================================================

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { Profil } from "@/features/auth/hooks/use-profil";
import { ApiError, apiClient } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";

type IsiProfil = { nama: string; jabatan: string; kontak: string };

export function PanelProfil({ p }: { p: Profil }) {
  const queryClient = useQueryClient();
  const sesi = authClient.useSession();
  const awal: IsiProfil = { nama: p.name, jabatan: p.pegawai?.jabatan ?? "", kontak: p.kontak ?? "" };
  const [isi, setIsi] = useState<IsiProfil>(awal);
  const [galat, setGalat] = useState<Partial<Record<keyof IsiProfil, string>>>({});

  const simpan = useMutation({
    mutationFn: async (v: IsiProfil) =>
      (await apiClient.patch<Profil>("/me", { nama: v.nama.trim(), jabatan: v.jabatan.trim() || null, kontak: v.kontak.trim() || null })).data,
    onSuccess: async () => {
      toast.success("Profil berhasil diperbarui");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["me"] }), sesi.refetch()]);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.details?.length) {
        setGalat(Object.fromEntries(e.details.map((d) => [d.field === "nama" || d.field === "kontak" || d.field === "jabatan" ? d.field : "nama", d.message])));
      } else toast.error(e.message);
    },
  });

  const berubah = isi.nama !== awal.nama || isi.jabatan !== awal.jabatan || isi.kontak !== awal.kontak;
  const kirim = (e: React.FormEvent) => {
    e.preventDefault();
    const baru: typeof galat = {};
    if (!isi.nama.trim()) baru.nama = "Nama wajib diisi";
    if (isi.kontak && !/^[0-9+()\-\s]*$/.test(isi.kontak)) baru.kontak = "Kontak berupa nomor telepon, mis. 0812-3456-7890";
    setGalat(baru);
    if (Object.keys(baru).length === 0) simpan.mutate(isi);
  };
  const ubah = (k: keyof IsiProfil) => (e: React.ChangeEvent<HTMLInputElement>) => setIsi((v) => ({ ...v, [k]: e.target.value }));

  return (
    <Panel className="h-fit">
      <PanelHeader title="Atur profil" description="Nama dan jabatan ini tampil pada kegiatan yang Anda catat." />
      <PanelBody className="border-t border-muted pt-4 md:pt-5">
        <form onSubmit={kirim} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!galat.nama} className="sm:col-span-2">
            <FieldLabel htmlFor="profil-nama">
              Nama lengkap{" "}
              <span aria-hidden className="text-destructive">
                *
              </span>
            </FieldLabel>
            <Input id="profil-nama" className="h-10" maxLength={150} value={isi.nama} onChange={ubah("nama")} aria-required aria-invalid={!!galat.nama} />
            {galat.nama && <FieldError>{galat.nama}</FieldError>}
          </Field>
          <Field data-invalid={!!galat.jabatan}>
            <FieldLabel htmlFor="profil-jabatan">Jabatan</FieldLabel>
            <Input id="profil-jabatan" className="h-10" maxLength={150} value={isi.jabatan} onChange={ubah("jabatan")} disabled={!p.pegawai} />
            {!p.pegawai && <FieldDescription>Tersedia setelah akun terhubung ke data pegawai.</FieldDescription>}
            {galat.jabatan && <FieldError>{galat.jabatan}</FieldError>}
          </Field>
          <Field data-invalid={!!galat.kontak}>
            <FieldLabel htmlFor="profil-kontak">Kontak (telepon/WhatsApp)</FieldLabel>
            <Input id="profil-kontak" className="h-10" inputMode="tel" maxLength={50} placeholder="0812-3456-7890" value={isi.kontak} onChange={ubah("kontak")} aria-invalid={!!galat.kontak} />
            {galat.kontak && <FieldError>{galat.kontak}</FieldError>}
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" className="h-10" disabled={!berubah || simpan.isPending}>
              {simpan.isPending ? <Spinner /> : <Check aria-hidden />}
              Simpan profil
            </Button>
          </div>
        </form>
      </PanelBody>
    </Panel>
  );
}
