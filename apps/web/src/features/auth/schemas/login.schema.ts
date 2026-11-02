// =============================================================================
// SKEMA VALIDASI FORMULIR LOGIN (loginSchema)
// =============================================================================
// Gunanya: Mendefinisikan aturan validasi input masuk (email dan kata sandi)
// menggunakan Zod sesuai kebutuhan fungsional FR-01.
//
// Isi berkas:
//   - loginSchema : skema Zod pemvalidasi format email dan kata sandi wajib diisi
//   - LoginInput  : tipe data TypeScript yang disimpulkan otomatis dari loginSchema
//
// Catatan penting:
//   - Email pribadi adalah satu-satunya identitas login; NIP tidak dipakai untuk masuk.
//
// Dipakai oleh: LoginForm (frontend/src/features/auth/components/login-form.tsx)
// =============================================================================

import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email wajib diisi").pipe(z.email("Format email tidak valid")),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export type LoginInput = z.infer<typeof loginSchema>;
