import { Elysia } from "elysia";
import { AuthController } from "@/controllers/auth.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { AuthValidator } from "@/validators/auth.validator";

const LOGIN = { auth: true as const };

/**
 * Akun sendiri (semua role). Login/logout/sesi ditangani Better Auth di /api/auth/*
 */
export const authRoutes = new Elysia({ prefix: "/me" })
  .use(authPlugin)

  /**
   * Profil, data kepegawaian (baca saja), dan info akun
   */
  .get("/", AuthController.me, LOGIN)

  /**
   * Ubah kontak
   */
  .patch("/", AuthController.ubahProfil, { ...LOGIN, body: AuthValidator.ubahProfil })

  /**
   * Ganti foto profil
   */
  .post("/foto", AuthController.unggahFoto, { ...LOGIN, body: AuthValidator.unggahFoto })

  /**
   * Hapus foto profil
   */
  .delete("/foto", AuthController.hapusFoto, LOGIN)

  /**
   * Lihat foto profil user mana pun (untuk avatar)
   */
  .get("/foto/:userId", AuthController.foto, { ...LOGIN, params: AuthValidator.fotoParams })

  /**
   * Minta ganti email (tautan verifikasi dikirim ke email baru)
   */
  .patch("/email", AuthController.gantiEmail, { ...LOGIN, body: AuthValidator.gantiEmail })

  /**
   * Batalkan ganti email yang belum diverifikasi
   */
  .delete("/email", AuthController.batalGantiEmail, LOGIN)

  /**
   * Ganti kata sandi
   */
  .patch("/sandi", AuthController.gantiSandi, { ...LOGIN, body: AuthValidator.gantiSandi })

  /**
   * Sesi login aktif
   */
  .get("/sesi", AuthController.daftarSesi, LOGIN)

  /**
   * Cabut semua sesi lain
   */
  .delete("/sesi", AuthController.cabutSesiLain, LOGIN)

  /**
   * Cabut satu sesi
   */
  .delete("/sesi/:id", AuthController.cabutSesi, { ...LOGIN, params: AuthValidator.sesiParams })

  /**
   * Preferensi tema dan notifikasi
   */
  .get("/preferensi", AuthController.preferensi, LOGIN)
  .patch("/preferensi", AuthController.ubahPreferensi, { ...LOGIN, body: AuthValidator.preferensi });

/**
 * Tautan dari email, tanpa login: aktivasi akun, lupa/atur ulang kata sandi, verifikasi email baru
 */
export const akunPublikRoutes = new Elysia()
  .get("/aktivasi", AuthController.infoAktivasi, { query: AuthValidator.tokenQuery })
  .post("/aktivasi", AuthController.aktivasi, { body: AuthValidator.aturSandi })
  .post("/lupa-sandi", AuthController.lupaSandi, { body: AuthValidator.lupaSandi })
  .get("/reset-sandi", AuthController.infoReset, { query: AuthValidator.tokenQuery })
  .post("/reset-sandi", AuthController.resetSandi, { body: AuthValidator.aturSandi })
  .post("/konfirmasi-email", AuthController.konfirmasiEmail, { body: AuthValidator.tokenBody });
