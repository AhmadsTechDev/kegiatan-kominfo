// =============================================================================
// SKEMA VALIDASI FORMULIR LOGIN (loginSchema)
// =============================================================================
// Gunanya: Mendefinisikan aturan validasi input masuk (NIP/email dan kata sandi)
// menggunakan Zod sesuai kebutuhan fungsional FR-01.
//
// Isi berkas:
//   - loginSchema : skema Zod pemvalidasi format email (bila ada '@') atau NIP (deretan angka)
//   - LoginInput  : tipe data TypeScript yang disimpulkan otomatis dari loginSchema
//
// Dipakai oleh: LoginForm (frontend/src/features/auth/components/login-form.tsx)
// =============================================================================

import { z } from "zod";

export const loginSchema = z.object({
  identitas: z
    .string()
    .trim()
    .min(1, "NIP atau email wajib diisi")
    .refine((nilai) => (nilai.includes("@") ? z.email().safeParse(nilai).success : /^\d+$/.test(nilai)), {
      error: (issue) =>
        String(issue.input).includes("@") ? "Format email tidak valid" : "NIP hanya berisi angka",
    }),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export type LoginInput = z.infer<typeof loginSchema>;
