import { z } from "zod";

// Skema Zod formulir login (FR-01)

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email wajib diisi").pipe(z.email("Format email tidak valid")),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export type LoginInput = z.infer<typeof loginSchema>;
