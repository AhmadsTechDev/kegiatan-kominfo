import { authClient } from "@/lib/auth-client";
import type { LoginInput } from "../schemas/login.schema";

// Login lewat Better Auth dan menerjemahkan galatnya ke pesan berbahasa Indonesia

export type LoginErrorKind = "kredensial" | "terkunci" | "nonaktif" | "terlalu_sering" | "validasi" | "server";

export class LoginError extends Error {
  constructor(
    public kind: LoginErrorKind,
    message: string,
    public lockedUntil?: Date,
  ) {
    super(message);
  }

  readonly diterimaPada = Date.now();
}

type AuthClientError = { status: number; code?: string; message?: string; lockedUntil?: string };

function petakanError(error: AuthClientError): LoginError {
  if (error.code === "ACCOUNT_LOCKED") {
    const sampai = error.lockedUntil ? new Date(error.lockedUntil) : new Date(Date.now() + 15 * 60_000);
    return new LoginError("terkunci", "Terlalu banyak percobaan. Coba lagi dalam 15 menit.", sampai);
  }
  if (error.status === 429) {
    return new LoginError("terlalu_sering", "Terlalu banyak percobaan dari jaringan ini. Tunggu satu menit, lalu coba lagi.");
  }
  if (error.code === "BANNED_USER" || error.status === 403) {
    return new LoginError("nonaktif", "Akun Anda dinonaktifkan. Hubungi admin untuk mengaktifkannya kembali.");
  }
  if (error.status === 401) {
    return new LoginError("kredensial", "Email atau kata sandi salah.");
  }
  if (error.status === 400 || error.status === 422) {
    return new LoginError("validasi", "Periksa kembali email dan kata sandi.");
  }
  return new LoginError("server", "Server tidak dapat dihubungi. Coba lagi beberapa saat.");
}

export async function login({ email, password }: LoginInput) {
  const { data, error } = await authClient.signIn.email({ email, password });

  if (error) throw petakanError(error as AuthClientError);
  return data;
}
