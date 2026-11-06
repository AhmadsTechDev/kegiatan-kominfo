import { verifyPassword as cocokScrypt } from "better-auth/crypto";

/**
 * Hash kata sandi dengan Argon2id (bawaan Bun: memori 64 MiB, 2 iterasi). Dipakai Better Auth dan layanan akun
 *
 * KONSEP hash: kata sandi tidak pernah disimpan apa adanya. Hash mengubahnya menjadi teks acak yang tidak bisa
 * dikembalikan ke bentuk asli. Saat login, sandi yang diketik di-hash ulang lalu dicocokkan.
 * Argon2id sengaja dibuat lambat dan boros memori agar penyerang sulit mencoba jutaan tebakan.
 */
export const hashSandi = (sandi: string) => Bun.password.hash(sandi, { algorithm: "argon2id" });

/**
 * Mencocokkan kata sandi dengan hash. Hash lama buatan Better Auth (scrypt) tetap diterima sampai diganti saat login
 *
 * Awalan teks hash menunjukkan algoritmanya, jadi hash Argon2 dan hash scrypt lama bisa dibedakan.
 */
export async function cocokSandi({ hash, password }: { hash: string; password: string }) {
  if (hash.startsWith("$argon2")) return Bun.password.verify(password, hash);
  return cocokScrypt({ hash, password });
}

/**
 * Hash yang belum Argon2id perlu dibuat ulang setelah login berhasil
 */
export const perluHashUlang = (hash: string) => !hash.startsWith("$argon2id$");
