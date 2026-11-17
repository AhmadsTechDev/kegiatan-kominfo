import { APIError } from "better-auth/api";
import { NotFound } from "@/lib/errors";
import { hashSandi, perluHashUlang } from "@/lib/sandi";
import { storage } from "@/lib/storage";
import { AuthRepository } from "@/repositories/auth.repository";
import type { UbahProfil } from "@/validators/auth.validator";
import { prosesFotoProfil } from "@/utils/berkas";
import { statusAkun } from "@/utils/status-akun";

export const BATAS_GAGAL_LOGIN = 5;
export const LAMA_KUNCI_MS = 15 * 60 * 1000;
export const PATH_LOGIN = "/sign-in/email";

export const PATH_AUTH_PUBLIK = [PATH_LOGIN, "/sign-out", "/get-session"];

const emailLogin = (body: unknown) => (body as { email?: unknown } | undefined)?.email;

export const urlFoto = (userId: string, key: string | null) => (key ? `/api/me/foto/${userId}?v=${key.split("/").pop()?.split(".")[0]}` : null);

export const AuthService = {

  tolakEndpointTertutup(): never {
    throw new APIError("NOT_FOUND", { code: "NOT_FOUND", message: "Endpoint tidak ditemukan" });
  },

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

  async catatLoginBerhasil(userId: string, body: unknown) {
    await AuthRepository.resetLoginGagal(userId);
    const sandi = (body as { password?: unknown } | undefined)?.password;
    const hash = await AuthRepository.hashSandi(userId);

    if (typeof sandi === "string" && hash && perluHashUlang(hash)) await AuthRepository.gantiSandi(userId, await hashSandi(sandi));
  },

  async catatLoginGagal(body: unknown) {
    const email = emailLogin(body);
    const akun = typeof email === "string" ? await AuthRepository.findByEmail(email) : null;

    if (!akun) return;

    const jumlahGagal = akun.failedLoginCount + 1;

    const harusDikunci = jumlahGagal >= BATAS_GAGAL_LOGIN;
    if (harusDikunci) await AuthRepository.kunci(akun.id, new Date(Date.now() + LAMA_KUNCI_MS));
    else await AuthRepository.tambahLoginGagal(akun.id);
  },

  async profil(userId: string) {
    const data = await AuthRepository.findProfil(userId);
    if (!data) throw NotFound("Pengguna tidak ditemukan");
    const { image, banned, punyaKredensial, ...profil } = data;
    return { ...profil, status: statusAkun({ banned, punyaKredensial }), foto: urlFoto(userId, image) };
  },

  async ubahProfil(userId: string, isi: UbahProfil) {
    if (!(await AuthRepository.findProfil(userId))) throw NotFound("Pengguna tidak ditemukan");
    const kontak = isi.kontak?.trim() || null;
    await AuthRepository.ubahKontak(userId, kontak);
    return AuthService.profil(userId);
  },

  async unggahFoto(userId: string, berkas: File) {
    const bytes = await prosesFotoProfil(berkas);
    const lama = await AuthRepository.fotoKey(userId);
    const key = `avatar/${userId}/${crypto.randomUUID()}.webp`;
    await storage.put(key, bytes);
    await AuthRepository.setFoto(userId, key);

    if (lama) await storage.delete(lama).catch(() => {});
    return { foto: urlFoto(userId, key) };
  },

  async hapusFoto(userId: string) {
    const lama = await AuthRepository.fotoKey(userId);
    if (!lama) return { foto: null };
    await AuthRepository.setFoto(userId, null);
    await storage.delete(lama).catch(() => {});
    return { foto: null };
  },

  async bacaFoto(userId: string) {
    const key = await AuthRepository.fotoKey(userId);
    const berkas = key ? await storage.read(key) : null;
    if (!berkas) throw NotFound("Foto tidak ditemukan");
    return berkas;
  },
};
