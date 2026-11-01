import { APIError } from "better-auth/api";
import { NotFound, Unprocessable } from "@/lib/errors";
import { storage } from "@/lib/storage";
import { AuthRepository } from "@/repositories/auth.repository";
import type { UbahProfil } from "@/types/auth.types";
import type { MetaRequest } from "@/types/umum.types";
import { prosesFotoProfil } from "@/utils/berkas";
import { requestMeta } from "@/utils/konteks";
import { AuditLogService } from "./audit-log.service";

export const BATAS_GAGAL_LOGIN = 5;
export const LAMA_KUNCI_MS = 15 * 60 * 1000;
export const PATH_LOGIN = ["/sign-in/email", "/sign-in/username"];
export const PATH_RESET_PUBLIK = ["/request-password-reset", "/forget-password"];

// URL foto profil; `?v=` berganti setiap foto diganti sehingga aman di-cache peramban
export const urlFoto = (userId: string, key: string | null) => (key ? `/api/me/foto/${userId}?v=${key.split("/").pop()?.split(".")[0]}` : null);

// Mencari akun yang sedang mencoba login dari isian email atau username (NIP)
async function cariAkunLogin(path: string, body: unknown) {
  const isian = (body ?? {}) as { email?: string; username?: string };
  if (path === "/sign-in/email" && isian.email) return AuthRepository.findByEmail(isian.email);
  if (path === "/sign-in/username" && isian.username) return AuthRepository.findByUsername(isian.username);
  return null;
}

// Meta request dari header (bila ada)
const metaDari = (headers?: Headers) => (headers ? requestMeta(headers) : {});

export const AuthService = {
  // ---------- Aturan login (dipanggil dari hook Better Auth di lib/auth.ts) ----------

  // Menolak reset kata sandi mandiri; reset hanya lewat admin
  tolakResetMandiri(): never {
    throw new APIError("FORBIDDEN", { code: "RESET_DISABLED", message: "Reset kata sandi mandiri tidak tersedia. Hubungi administrator." });
  },

  // Menolak login bila akun masih terkunci karena terlalu sering salah kata sandi
  async tolakJikaTerkunci(path: string, body: unknown) {
    const akun = await cariAkunLogin(path, body);
    if (akun?.lockedUntil && akun.lockedUntil > new Date()) {
      throw new APIError("TOO_MANY_REQUESTS", {
        code: "ACCOUNT_LOCKED",
        message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
        lockedUntil: akun.lockedUntil.toISOString(),
      });
    }
  },

  // Login berhasil: hapus hitungan gagal dan catat ke audit log
  async catatLoginBerhasil(userId: string, headers?: Headers) {
    await AuthRepository.resetLoginGagal(userId);
    await AuditLogService.catat({ aktorId: userId, aksi: "login", entitas: "user", entitasId: userId, ...metaDari(headers) });
  },

  // Login gagal: tambah hitungan gagal; setelah 5 kali akun dikunci 15 menit
  async catatLoginGagal(path: string, body: unknown, headers?: Headers) {
    const meta = metaDari(headers);
    const akun = await cariAkunLogin(path, body);
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

  // Dipanggil setelah user membuat kata sandi lewat tautan undangan
  async catatAktivasi(userId: string) {
    await AuthRepository.tandaiAktif(userId);
    await AuditLogService.catat({ aktorId: userId, aksi: "aktivasi", entitas: "user", entitasId: userId });
  },

  // ---------- Profil user yang sedang login (/api/me) ----------

  // Profil lengkap user beserta URL fotonya
  async profil(userId: string) {
    const data = await AuthRepository.findProfil(userId);
    if (!data) throw NotFound("Pengguna tidak ditemukan");
    const { image, ...profil } = data;
    return { ...profil, foto: urlFoto(userId, image) };
  },

  // Mengubah nama, jabatan, dan kontak; nama & jabatan ikut disalin ke data pegawai
  async ubahProfil(userId: string, isi: UbahProfil, meta: MetaRequest) {
    const sebelum = await AuthRepository.findProfil(userId);
    if (!sebelum) throw NotFound("Pengguna tidak ditemukan");
    const nama = isi.nama.trim();
    if (!nama) throw Unprocessable("Periksa kembali isian profil", [{ field: "nama", message: "Nama wajib diisi" }]);
    const nilai = { nama, jabatan: isi.jabatan?.trim() || null, kontak: isi.kontak?.trim() || null };
    await AuthRepository.ubahProfil(userId, sebelum.pegawai?.id ?? null, nilai);
    await AuditLogService.catat({
      aktorId: userId,
      aksi: "ubah",
      entitas: "user",
      entitasId: userId,
      sebelum: { nama: sebelum.name, jabatan: sebelum.pegawai?.jabatan ?? null, kontak: sebelum.kontak },
      sesudah: nilai,
      ...meta,
    });
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
