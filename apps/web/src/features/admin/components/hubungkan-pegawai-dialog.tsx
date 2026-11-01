// =============================================================================
// DIALOG PENAUTAN AKUN KE DATA MASTER PEGAWAI
// =============================================================================
// Gunanya: menyediakan dialog modal untuk mengaitkan akun pengguna ke data
// pegawai agar memiliki unit kerja yang sah untuk mencatat kegiatan dinas.
//
// Isi berkas:
//   - HubungkanPegawaiDialog : dialog penautan akun dengan opsi pegawai ada atau baru
//
// Cara kerja:
//   1. Sistem mendeteksi otomatis kesamaan nama akun dengan daftar master pegawai.
//   2. Administrator memilih mode: menautkan ke pegawai yang ada atau membuat pegawai baru.
//   3. Form memvalidasi NIP jika diisi pada mode baru, lalu mengirim mutasi ke server.
//
// Catatan penting:
//   - Pegawai non-ASN dapat dibuatkan profil pegawai otomatis cukup dengan memilih unit kerja.
//   - Akun tanpa kaitan data pegawai tidak dapat melakukan pencatatan kegiatan dinas.
//
// Dipakai oleh: akun-view.tsx
// =============================================================================

"use client";

import { Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormDialog, Wajib } from "@/components/shared/form-dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReferensi } from "@/features/kegiatan/hooks/use-kegiatan";
import { periksaNip } from "@/lib/nip";
import { useHubungkanPegawai, useUnitKerjaAdmin } from "../hooks/use-admin";
import type { AkunAdmin } from "../types";
import { PilihanTab, PilihUnit } from "./admin-shared";

type Mode = "baru" | "ada";
const normal = (s: string) => s.trim().toLowerCase();

export function HubungkanPegawaiDialog({ akun, onClose }: { akun: AkunAdmin; onClose: () => void }) {
  const hubungkan = useHubungkanPegawai();
  const referensi = useReferensi();
  const unit = useUnitKerjaAdmin();
  const pegawai = referensi.data?.pegawai ?? [];
  const senama = pegawai.find((p) => normal(p.nama) === normal(akun.name));
  const [mode, setMode] = useState<Mode>(senama ? "ada" : "baru");
  const [pegawaiId, setPegawaiId] = useState(senama ? String(senama.id) : "");
  const [unitKerjaId, setUnitKerjaId] = useState("");
  const [nip, setNip] = useState("");
  const [galat, setGalat] = useState<Partial<Record<"pegawai" | "unit" | "nip" | "umum", string>>>({});
  const namaUnit = new Map((unit.data ?? []).map((u) => [u.id, u.nama]));

  const kirim = (e: React.FormEvent) => {
    e.preventDefault();
    const g: typeof galat = {};
    if (mode === "ada" && !pegawaiId) g.pegawai = "Pilih pegawai";
    if (mode === "baru" && !unitKerjaId) g.unit = "Pilih unit kerja";
    const salahNip = mode === "baru" && nip.trim() ? periksaNip(nip.trim()) : null;
    if (salahNip) g.nip = salahNip;
    setGalat(g);
    if (Object.keys(g).length) return;
    hubungkan.mutate(
      {
        id: akun.id,
        isi:
          mode === "ada"
            ? { pegawaiId: Number(pegawaiId) }
            : { pegawaiBaru: { unitKerjaId: Number(unitKerjaId), jabatan: null, nip: nip.trim() || null } },
      },
      {
        onSuccess: () => {
          toast.success(`Unit kerja ${akun.name} sudah diatur`);
          onClose();
        },
        onError: (err) => setGalat({ umum: err.message }),
      },
    );
  };

  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={`Atur unit kerja ${akun.name}`}
      description="Akun perlu terhubung ke data pegawai agar unit kerjanya jelas dan ia bisa mencatat kegiatan."
      onSubmit={kirim}
      pending={hubungkan.isPending}
      submitLabel="Simpan"
      galat={galat.umum}
    >
      <PilihanTab
        label="Cara menghubungkan"
        value={mode}
        onChange={setMode}
        opsi={[
          { nilai: "baru", label: "Belum ada di data pegawai" },
          { nilai: "ada", label: "Sudah ada di data pegawai" },
        ]}
      />
      {mode === "baru" ? (
        <>
          <div className="flex items-center gap-3 rounded-xl bg-muted/70 p-3 text-sm">
            <Building2 aria-hidden className="size-4 shrink-0 text-primary" />
            <p>
              Data pegawai <span className="font-semibold">{akun.name}</span> akan dibuat dengan unit kerja di bawah ini.
            </p>
          </div>
          <Field data-invalid={!!galat.unit}>
            <FieldLabel htmlFor="hubung-unit">
              Unit kerja <Wajib />
            </FieldLabel>
            <PilihUnit id="hubung-unit" unit={unit.data ?? []} value={unitKerjaId} onChange={setUnitKerjaId} invalid={!!galat.unit} />
            <FieldDescription>Pilih sub unit bila ia bertugas di sub bagian atau seksi.</FieldDescription>
            {galat.unit && <FieldError>{galat.unit}</FieldError>}
          </Field>
          <Field data-invalid={!!galat.nip}>
              <FieldLabel htmlFor="hubung-nip">
                NIP <span className="font-normal text-muted-foreground">(opsional)</span>
              </FieldLabel>
              <Input
                id="hubung-nip"
                inputMode="numeric"
                maxLength={18}
                className="h-10 tabular-nums"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                aria-invalid={!!galat.nip}
              />
              {galat.nip && <FieldError>{galat.nip}</FieldError>}
            </Field>
        </>
      ) : (
        <Field data-invalid={!!galat.pegawai}>
          <FieldLabel htmlFor="hubung-pegawai">
            Pegawai <Wajib />
          </FieldLabel>
          <Select value={pegawaiId} onValueChange={setPegawaiId}>
            <SelectTrigger id="hubung-pegawai" className="h-10 w-full" aria-invalid={!!galat.pegawai}>
              <SelectValue placeholder="Pilih pegawai" />
            </SelectTrigger>
            <SelectContent>
              {pegawai.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.nama}
                  <span className="text-muted-foreground"> · {namaUnit.get(p.unitKerjaId) ?? "Unit tidak diketahui"}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>Unit kerja akun mengikuti data pegawai yang dipilih.</FieldDescription>
          {galat.pegawai && <FieldError>{galat.pegawai}</FieldError>}
        </Field>
      )}
    </FormDialog>
  );
}
