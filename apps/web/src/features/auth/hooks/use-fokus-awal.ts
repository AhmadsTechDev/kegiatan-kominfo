// =============================================================================
// HOOK FOKUS AWAL FORMULIR (useFokusAwal)
// =============================================================================
// Gunanya: Memfokuskan kolom pertama formulir hanya pada perangkat dengan penunjuk halus (mouse).
//
// Isi berkas:
//   - useFokusAwal : memanggil setFocus react-hook-form sekali saat formulir tampil
//
// Catatan penting:
//   - Di ponsel fokus otomatis membuka papan ketik yang menutup separuh kartu sebelum isinya terbaca.
//
// Dipakai oleh: LoginForm, MintaAkunForm, FormSandiBaru, LupaSandiForm
// =============================================================================

"use client";

import { useEffect } from "react";
import type { FieldValues, Path, UseFormSetFocus } from "react-hook-form";

export function useFokusAwal<T extends FieldValues>(setFocus: UseFormSetFocus<T>, nama: Path<T>) {
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) setFocus(nama);
  }, [setFocus, nama]);
}
