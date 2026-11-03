// =============================================================================
// KEBIJAKAN KATA SANDI (SISI KLIEN)
// =============================================================================
// Gunanya: Menyamakan pemeriksaan kata sandi di formulir dengan aturan backend
// (apps/api/src/utils/kebijakan-sandi.ts) agar galat tampil sebelum dikirim.
//
// Isi berkas:
//   - SYARAT_SANDI : teks ringkas syarat kata sandi untuk keterangan input
//   - periksaSandi : mengembalikan pesan galat atau null bila kata sandi sah
//   - skemaSandiBaru : skema Zod kata sandi baru + ulangi, dengan konteks email
//
// Catatan penting:
//   - Backend tetap menjadi penentu akhir; aturan di sini hanya untuk umpan balik cepat.
//
// Dipakai oleh: FormSandiBaru (aktivasi dan atur ulang), GantiSandiDialog
// =============================================================================

import { z } from "zod";

export const SANDI_MIN = 8;
export const SANDI_MAKS = 128;
export const SYARAT_SANDI = `Minimal ${SANDI_MIN} karakter, berisi huruf dan angka, dan tidak memuat alamat email Anda.`;

export function periksaSandi(sandi: string, email?: string | null): string | null {
  if (sandi.length < SANDI_MIN) return `Kata sandi minimal ${SANDI_MIN} karakter`;
  if (sandi.length > SANDI_MAKS) return `Kata sandi maksimal ${SANDI_MAKS} karakter`;
  if (!/\p{L}/u.test(sandi) || !/\p{N}/u.test(sandi)) return "Kata sandi harus berisi huruf dan angka";
  if (/^(.)\1+$/u.test(sandi)) return "Kata sandi tidak boleh berupa satu karakter berulang";
  const namaEmail = email?.split("@")[0]?.toLowerCase();
  if (namaEmail && namaEmail.length >= 4 && sandi.toLowerCase().includes(namaEmail)) return "Kata sandi tidak boleh memuat alamat email Anda";
  return null;
}

export const skemaSandiBaru = (email?: string | null) =>
  z
    .object({ password: z.string(), ulang: z.string() })
    .superRefine((v, ctx) => {
      const salah = periksaSandi(v.password, email);
      if (salah) ctx.addIssue({ code: "custom", path: ["password"], message: salah });
      if (v.password !== v.ulang) ctx.addIssue({ code: "custom", path: ["ulang"], message: "Kata sandi tidak sama" });
    });

export type NilaiSandiBaru = z.infer<ReturnType<typeof skemaSandiBaru>>;
