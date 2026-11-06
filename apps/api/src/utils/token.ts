/**
 * Token tautan email (aktivasi, reset sandi, ganti email). Yang dikirim ke pengguna hanya token asli;
 * basis data hanya menyimpan hash SHA-256-nya, sehingga isi tabel verification tidak bisa dipakai untuk membuka akun.
 */

export const TUJUAN_TOKEN = ["aktivasi", "reset-sandi", "ganti-email"] as const;
export type TujuanToken = (typeof TUJUAN_TOKEN)[number];

/**
 * Masa berlaku tiap jenis token
 */
export const MASA_TOKEN_MS: Record<TujuanToken, number> = {
  aktivasi: 72 * 60 * 60 * 1000,
  "reset-sandi": 60 * 60 * 1000,
  "ganti-email": 24 * 60 * 60 * 1000,
};

/**
 * Token acak 256 bit dalam base64url (43 karakter, aman di URL)
 *
 * crypto.getRandomValues menghasilkan angka acak yang aman untuk keamanan (tidak bisa ditebak),
 * berbeda dengan Math.random. 32 byte = 256 bit, terlalu banyak kemungkinan untuk dicoba satu per satu.
 * base64url hanya memakai huruf, angka, "-" dan "_", jadi aman ditaruh di URL tanpa diubah.
 * @returns token acak 43 karakter
 */
export function buatToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

/**
 * Hash SHA-256 (hex) dari token
 */
export function hashToken(token: string) {
  return new Bun.CryptoHasher("sha256").update(token).digest("hex");
}

/**
 * Nilai kolom verification.identifier untuk token tertentu
 */
export const identifierToken = (tujuan: TujuanToken, token: string) => `${tujuan}:${hashToken(token)}`;
