import { z } from "zod";

// Cek kata sandi di formulir, sama dengan aturan backend (utils/kebijakan-sandi.ts)

export const SANDI_MIN = 8;
export const SANDI_MAKS = 128;

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
