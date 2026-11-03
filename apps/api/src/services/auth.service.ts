import { APIError } from "better-auth/api";
import { NotFound } from "@/lib/errors";
import { hashSandi, perluHashUlang } from "@/lib/sandi";
import { storage } from "@/lib/storage";
import { AuthRepository } from "@/repositories/auth.repository";
import type { UbahProfil } from "@/types/auth.types";
import type { MetaRequest } from "@/types/umum.types";
import { prosesFotoProfil } from "@/utils/berkas";
import { requestMeta } from "@/utils/konteks";
import { statusAkun } from "@/utils/status-akun";
import { AuditLogService } from "./audit-log.service";

export const BATAS_GAGAL_LOGIN = 5;
export const LAMA_KUNCI_MS = 15 * 60 * 1000;
export const PATH_LOGIN = "/sign-in/email";

// Endpoint Better Auth yang boleh dipanggil dari luar (HTTP). Selebihnya (daftar mandiri, reset sandi bawaan,
// ubah user, endpoint admin, dll.) ditutup; fitur akun memakai endpoint aplikasi sendiri yang punya validasi dan audit
export const PATH_AUTH_PUBLIK = [PATH_LOGIN, "/sign-out", "/get-session"];

// URL foto profil; `?v=` berganti setiap foto diganti sehingga aman di-cache peramban
export const urlFoto = (userId: string, key: string | null) => (key ? `/api/me/foto/${userId}?v=${key.split("/").pop()?.split(".")[0]}` : null);

// Email yang sedang dipakai untuk login (dari body permintaan)
const emailLogin = (body: unknown) => (body as { email?: unknown } | undefined)?.email;

// Meta request dari header (bila ada)
const metaDari = (headers?: Headers) => (headers ? requestMeta(headers) : {});

export const AuthService = {
  // ---------- Aturan login (dipanggil dari hook Better Auth di lib/auth.ts) ----------

  // Menolak endpoint Better Auth yang tidak dipakai aplikasi
  tolakEndpointTertutup(): never {
    throw new APIError("NOT_FOUND", { code: "NOT_FOUND", message: "Endpoint tidak ditemukan" });
  },

  // Menolak login bila akun masih terkunci karena terlalu sering salah kata sandi
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

  // Login berhasil: hapus hitungan gagal, perbarui hash lama ke Argon2id, dan catat ke audit log
  async catatLoginBerhasil(userId: string, body: unknown, headers?: Headers) {
    await AuthRepository.resetLoginGagal(userId);
    const sandi = (body as { password?: unknown } | undefined)?.password;
    const hash = await AuthRepository.hashSandi(userId);
    if (typeof sandi === "string" && hash && perluHashUlang(hash)) await AuthRepository.gantiSandi(userId, await hashSandi(sandi));
    await AuditLogService.catat({ aktorId: userId, aksi: "login", entitas: "user", entitasId: userId, ...metaDari(headers) });
  },

  // Login gagal: tambah hitungan gagal; setelah 5 kali akun dikunci 15 menit
  async catatLoginGagal(body: unknown, headers?: Headers) {
    const meta = metaDari(headers);
    const email = emailLogin(body);
    const akun = typeof email === "string" ? await AuthRepository.findByEmail(email) : null;
    if (!akun) {
      await AuditLogService.catat({ aktorId: null, aksi: "login_gagal", entitas: "user", ...meta });
      return;
    }

    const jumlahGagal = akun.failedLoginCount + 1;
    const harusDikunci = jumlahGagal >= BATAS_GAGAL_LOGIN;
    if (harusDikunci) await AuthRepository.kunci(akun.id, new Date(Date.now() + LAMA_KUNCI_MS));
    else await AuthRepository.tambahLoginGagal(akun.id);

    await AuditLogService.catat({
      aktorId: akun.id,
      aksi: harusDikunci ? "akun_terkunci" : "login_gagal",
      entitas: "user",
      entitasId: akun.id,
      sesudah: { percobaanGagal: jumlahGagal },
      ...meta,
    });
  },

  // Mencatat logout ke audit log
  async catatLogout(userId: string, headers?: Headers) {
    await AuditLogService.catat({ aktorId: userId, aksi: "logout", entitas: "user", entitasId: userId, ...metaDari(headers) });
  },

  // ---------- Profil user yang sedang login (/api/me) ----------

  // Profil lengkap: data kepegawaian (dikelola admin), info akun, status, dan URL foto
  async profil(userId: string) {
    const data = await AuthRepository.findProfil(userId);
    if (!data) throw NotFound("Pengguna tidak ditemukan");
    const { image, banned, punyaKredensial, ...profil } = data;
    return { ...profil, status: statusAkun({ banned, punyaKredensial }), foto: urlFoto(userId, image) };
  },

  // Mengubah nomor kontak. Nama, NIP, dan bidang hanya bisa diubah admin
  async ubahProfil(userId: string, isi: UbahProfil, meta: MetaRequest) {
    const sebelum = await AuthRepository.findProfil(userId);
    if (!sebelum) throw NotFound("Pengguna tidak ditemukan");
    const kontak = isi.kontak?.trim() || null;
    await AuthRepository.ubahKontak(userId, kontak);
    await AuditLogService.catat({ aktorId: userId, aksi: "ubah", entitas: "user", entitasId: userId, sebelum: { kontak: sebelum.kontak }, sesudah: { kontak }, ...meta });
    return AuthService.profil(userId);
  },

  // Mengganti foto profil: proses ke WebP, simpan, lalu hapus foto lama
  async unggahFoto(userId: string, berkas: File, meta: MetaRequest) {
    const bytes = await prosesFotoProfil(berkas);
    const lama = await AuthRepository.fotoKey(userId);
    const key = `avatar/${userId}/${crypto.randomUUID()}.webp`;
    await storage.put(key, bytes);
    await AuthRepository.setFoto(userId, key);
    if (lama) await storage.delete(lama).catch(() => {});
    await AuditLogService.catat({ aktorId: userId, aksi: "ubah", entitas: "user", entitasId: userId, sesudah: { foto: "diganti" }, ...meta });
    return { foto: urlFoto(userId, key) };
  },

  // Menghapus foto profil
  async hapusFoto(userId: string, meta: MetaRequest) {
    const lama = await AuthRepository.fotoKey(userId);
    if (!lama) return { foto: null };
    await AuthRepository.setFoto(userId, null);
    await storage.delete(lama).catch(() => {});
    await AuditLogService.catat({ aktorId: userId, aksi: "ubah", entitas: "user", entitasId: userId, sesudah: { foto: "dihapus" }, ...meta });
    return { foto: null };
  },

  // Membaca berkas foto profil seorang user
  async bacaFoto(userId: string) {
    const key = await AuthRepository.fotoKey(userId);
    const berkas = key ? await storage.read(key) : null;
    if (!berkas) throw NotFound("Foto tidak ditemukan");
    return berkas;
  },
};
