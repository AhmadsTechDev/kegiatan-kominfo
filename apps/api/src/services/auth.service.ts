import { APIError } from "better-auth/api";
import { NotFound } from "@/lib/errors";
import { hashSandi, perluHashUlang } from "@/lib/sandi";
import { storage } from "@/lib/storage";
import { AuthRepository } from "@/repositories/auth.repository";
import type { UbahProfil } from "@/types/auth.types";
import { prosesFotoProfil } from "@/utils/berkas";
import { statusAkun } from "@/utils/status-akun";

/**
 * Service autentikasi: aturan login tambahan (penguncian akun) dan profil pengguna yang sedang login.
 * Fungsi-fungsi bagian login dipanggil dari hook Better Auth di lib/auth.ts, bukan dari controller.
 */
export const BATAS_GAGAL_LOGIN = 5;
export const LAMA_KUNCI_MS = 15 * 60 * 1000;
export const PATH_LOGIN = "/sign-in/email";

/**
 * Endpoint Better Auth yang boleh dipanggil dari luar (HTTP). Selebihnya (daftar mandiri, reset sandi bawaan,
 * ubah user, endpoint admin, dll.) ditutup; fitur akun memakai endpoint aplikasi sendiri yang punya validasi
 */
export const PATH_AUTH_PUBLIK = [PATH_LOGIN, "/sign-out", "/get-session"];

/**
 * URL foto profil; `?v=` berganti setiap foto diganti sehingga aman di-cache peramban
 * Contoh hasil: /api/me/foto/abc?v=uuid-foto. Nilai v ikut berubah saat foto diganti, sehingga peramban tahu harus mengambil foto baru.
 */
export const urlFoto = (userId: string, key: string | null) => (key ? `/api/me/foto/${userId}?v=${key.split("/").pop()?.split(".")[0]}` : null);

/**
 * Email yang sedang dipakai untuk login (dari body permintaan)
 */
const emailLogin = (body: unknown) => (body as { email?: unknown } | undefined)?.email;

export const AuthService = {
  /**
   * ---------- Aturan login (dipanggil dari hook Better Auth di lib/auth.ts) ----------
   */

  /**
   * Menolak endpoint Better Auth yang tidak dipakai aplikasi
   * Tipe `never` berarti fungsi ini tidak pernah selesai dengan normal: ia selalu melempar galat.
   */
  tolakEndpointTertutup(): never {
    throw new APIError("NOT_FOUND", { code: "NOT_FOUND", message: "Endpoint tidak ditemukan" });
  },

  /**
   * Menolak login bila akun masih terkunci karena terlalu sering salah kata sandi
   *
   * `body: unknown` karena isi permintaan login belum pasti bentuknya, jadi tipe email dicek dulu
   * (typeof email === "string") sebelum dipakai. Ini cara aman menangani data dari luar.
   * @param body isi permintaan login dari Better Auth
   * @throws APIError TOO_MANY_REQUESTS (kode ACCOUNT_LOCKED) bila akun masih dalam masa kunci
   */
  async tolakJikaTerkunci(body: unknown) {
    const email = emailLogin(body);
    const akun = typeof email === "string" ? await AuthRepository.findByEmail(email) : null;
    if (akun?.lockedUntil && akun.lockedUntil > new Date()) {
      throw new APIError("TOO_MANY_REQUESTS", {
        code: "ACCOUNT_LOCKED",
        message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
        lockedUntil: akun.lockedUntil.toISOString(),
      });
    }
  },

  /**
   * Login berhasil: hapus hitungan gagal dan perbarui hash lama ke Argon2id
   */
  async catatLoginBerhasil(userId: string, body: unknown) {
    await AuthRepository.resetLoginGagal(userId);
    const sandi = (body as { password?: unknown } | undefined)?.password;
    const hash = await AuthRepository.hashSandi(userId);

    /**
     * Hash lama (scrypt) diperbarui ke Argon2id memanfaatkan sandi asli yang baru saja diketik pengguna; sandi asli tidak pernah disimpan.
     */
    if (typeof sandi === "string" && hash && perluHashUlang(hash)) await AuthRepository.gantiSandi(userId, await hashSandi(sandi));
  },

  /**
   * Login gagal: tambah hitungan gagal; setelah 5 kali akun dikunci 15 menit
   *
   * @param body isi permintaan login (untuk mengambil email yang dicoba)
   */
  async catatLoginGagal(body: unknown) {
    const email = emailLogin(body);
    const akun = typeof email === "string" ? await AuthRepository.findByEmail(email) : null;

    if (!akun) return;

    const jumlahGagal = akun.failedLoginCount + 1;

    /**
     * Pada kegagalan ke-5, akun dikunci 15 menit; sebelum itu hitungannya hanya ditambah satu.
     */
    const harusDikunci = jumlahGagal >= BATAS_GAGAL_LOGIN;
    if (harusDikunci) await AuthRepository.kunci(akun.id, new Date(Date.now() + LAMA_KUNCI_MS));
    else await AuthRepository.tambahLoginGagal(akun.id);
  },

  /**
   * ---------- Profil user yang sedang login (/api/me) ----------
   */

  /**
   * Profil lengkap: data kepegawaian (dikelola admin), info akun, status, dan URL foto
   */
  async profil(userId: string) {
    const data = await AuthRepository.findProfil(userId);
    if (!data) throw NotFound("Pengguna tidak ditemukan");
    const { image, banned, punyaKredensial, ...profil } = data;
    return { ...profil, status: statusAkun({ banned, punyaKredensial }), foto: urlFoto(userId, image) };
  },

  /**
   * Mengubah nomor kontak. Nama, NIP, dan bidang hanya bisa diubah admin
   */
  async ubahProfil(userId: string, isi: UbahProfil) {
    if (!(await AuthRepository.findProfil(userId))) throw NotFound("Pengguna tidak ditemukan");
    const kontak = isi.kontak?.trim() || null;
    await AuthRepository.ubahKontak(userId, kontak);
    return AuthService.profil(userId);
  },

  /**
   * Mengganti foto profil: proses ke WebP, simpan, lalu hapus foto lama
   */
  async unggahFoto(userId: string, berkas: File) {
    const bytes = await prosesFotoProfil(berkas);
    const lama = await AuthRepository.fotoKey(userId);
    const key = `avatar/${userId}/${crypto.randomUUID()}.webp`;
    await storage.put(key, bytes);
    await AuthRepository.setFoto(userId, key);

    /**
     * Foto lama dihapus setelah foto baru tersimpan; kegagalan menghapus diabaikan karena tidak memengaruhi pengguna.
     */
    if (lama) await storage.delete(lama).catch(() => {});
    return { foto: urlFoto(userId, key) };
  },

  /**
   * Menghapus foto profil
   */
  async hapusFoto(userId: string) {
    const lama = await AuthRepository.fotoKey(userId);
    if (!lama) return { foto: null };
    await AuthRepository.setFoto(userId, null);
    await storage.delete(lama).catch(() => {});
    return { foto: null };
  },

  /**
   * Membaca berkas foto profil seorang user
   */
  async bacaFoto(userId: string) {
    const key = await AuthRepository.fotoKey(userId);
    const berkas = key ? await storage.read(key) : null;
    if (!berkas) throw NotFound("Foto tidak ditemukan");
    return berkas;
  },
};
