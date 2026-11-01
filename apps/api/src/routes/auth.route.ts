import { Elysia } from "elysia";
import { AuthController } from "@/controllers/auth.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { AuthValidator } from "@/validators/auth.validator";

// Profil user yang sedang login. Login/logout sendiri ditangani Better Auth di /api/auth/*
export const authRoutes = new Elysia({ prefix: "/me" })
  .use(authPlugin)
  // Profil saya
  .get("/", AuthController.me, { auth: true })
  // Ubah nama, jabatan, kontak
  .patch("/", AuthController.ubahProfil, { auth: true, body: AuthValidator.ubahProfil })
  // Ganti foto profil
  .post("/foto", AuthController.unggahFoto, { auth: true, body: AuthValidator.unggahFoto })
  // Hapus foto profil
  .delete("/foto", AuthController.hapusFoto, { auth: true })
  // Lihat foto profil user mana pun (untuk avatar)
  .get("/foto/:userId", AuthController.foto, { auth: true, params: AuthValidator.fotoParams });
