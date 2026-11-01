// =============================================================================
// API DAN PENANGANAN ERROR LOGIN
// =============================================================================
// Gunanya: Menangani autentikasi masuk pengguna serta menerjemahkan respons galat dari
// Better Auth ke dalam objek galat berbahasa Indonesia yang aman bagi pengguna.
//
// Isi berkas:
//   - LoginErrorKind : tipe union kategori galat (kredensial, terkunci, nonaktif, dll.)
//   - LoginError     : kelas galat kustom penyimpan jenis galat dan batas akun terkunci
//   - petakanError   : memetakan kode status HTTP dan kode Better Auth ke LoginError
//   - login          : mengirim kredensial login via signIn.email atau signIn.username
//
// Cara kerja:
//   1. Memeriksa apakah identitas mengandung karakter '@' untuk memilih login email atau NIP.
//   2. Memanggil metode autentikasi Better Auth yang sesuai.
//   3. Jika gagal, petakanError menangkap kode galat (seperti ACCOUNT_LOCKED) dan melempar LoginError.
//
// Catatan penting:
//   - Memetakan error ke pesan aman berbahasa Indonesia agar tidak membocorkan detail sensitif.
//   - Menghitung batas waktu kunci akun (default 15 menit) untuk mendukung hitung mundur di UI.
//
// Dipakai oleh: useLogin, LoginForm
// =============================================================================

import { authClient } from "@/lib/auth-client";
import type { LoginInput } from "../schemas/login.schema";

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
    return new LoginError("terlalu_sering", "Terlalu banyak permintaan. Coba lagi sebentar lagi.");
  }
  if (error.code === "BANNED_USER" || error.status === 403) {
    return new LoginError("nonaktif", "Akun Anda dinonaktifkan. Hubungi admin untuk mengaktifkannya kembali.");
  }
  if (error.status === 401) {
    return new LoginError("kredensial", "NIP/email atau kata sandi salah.");
  }
  if (error.status === 400 || error.status === 422) {
    return new LoginError("validasi", "Periksa kembali NIP/email dan kata sandi.");
  }
  return new LoginError("server", "Server tidak dapat dihubungi. Coba lagi beberapa saat.");
}

export async function login({ identitas, password }: LoginInput) {
  const isEmail = identitas.includes("@");
  const { data, error } = await (isEmail
    ? authClient.signIn.email({ email: identitas, password })
    : authClient.signIn.username({ username: identitas, password }));

  if (error) throw petakanError(error as AuthClientError);
  return data;
}
