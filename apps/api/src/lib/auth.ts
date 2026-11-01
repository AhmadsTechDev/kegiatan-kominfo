import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { admin, username } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";
import { env, isProduction } from "@/config/env";
import { AuthService, PATH_LOGIN, PATH_RESET_PUBLIK } from "@/services/auth.service";
import { kirimEmail } from "./mailer";
import { prisma } from "./prisma";

// Masa berlaku tautan aktivasi akun (72 jam)
export const MASA_UNDANGAN_DETIK = 72 * 60 * 60;

// Hak akses tiap role di plugin admin Better Auth: hanya ADMIN yang boleh mengelola user
const ac = createAccessControl(defaultStatements);
const rolesAuth = {
  ADMIN: ac.newRole({
    user: ["create", "list", "set-role", "ban", "delete", "set-password", "set-email", "get", "update"],
    session: ["list", "revoke", "delete"],
  }),
  PEGAWAI: ac.newRole({ user: [], session: [] }),
  PIMPINAN: ac.newRole({ user: [], session: [] }),
};

// Konfigurasi Better Auth: login email/NIP, sesi 8 jam, tanpa daftar mandiri, aktivasi lewat email undangan
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.FRONTEND_URL],

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 10,
    resetPasswordTokenExpiresIn: MASA_UNDANGAN_DETIK,
    revokeSessionsOnPasswordReset: true,

    // "Reset password" dipakai sebagai email undangan aktivasi akun baru
    sendResetPassword: async ({ user, token }) => {
      await kirimEmail(user.email, "Aktivasi akun Aplikasi Pendataan Kegiatan", {
        judul: "Aktifkan akun Anda",
        paragraf: [
          `Halo ${user.name},`,
          "Administrator Diskominfo Kota Palembang telah membuatkan akun untuk Anda di Aplikasi Pendataan Kegiatan.",
          "Klik tombol di bawah untuk membuat kata sandi dan mengaktifkan akun. Setelah itu Anda dapat masuk dengan email ini atau NIP Anda.",
        ],
        tombol: { label: "Aktifkan akun", url: `${env.FRONTEND_URL}/aktivasi?token=${encodeURIComponent(token)}` },
        catatan: `Tautan berlaku ${MASA_UNDANGAN_DETIK / 3600} jam dan hanya dapat dipakai sekali. Bila Anda tidak merasa meminta akun, abaikan email ini.`,
      });
    },

    // Setelah kata sandi dibuat: tandai akun aktif dan catat ke audit log
    onPasswordReset: async ({ user }) => {
      await AuthService.catatAktivasi(user.id);
    },
  },

  user: {
    additionalFields: {
      pegawaiId: { type: "number", required: false, input: false },
      failedLoginCount: { type: "number", required: false, input: false, returned: false },
      lockedUntil: { type: "date", required: false, input: false, returned: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
  },

  advanced: {
    database: { generateId: () => crypto.randomUUID() },
    useSecureCookies: isProduction,
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-in/username": { window: 60, max: 10 },
    },
  },

  plugins: [
    username({ minUsernameLength: 8, maxUsernameLength: 18 }),
    admin({ ac, roles: rolesAuth, defaultRole: "PEGAWAI", adminRoles: ["ADMIN"] }),
  ],

  hooks: {
    // Sebelum Better Auth bekerja: tolak reset mandiri, catat logout, tolak login bila akun terkunci
    before: createAuthMiddleware(async (ctx) => {
      if (PATH_RESET_PUBLIK.includes(ctx.path) && ctx.request) AuthService.tolakResetMandiri();

      if (ctx.path === "/sign-out") {
        const sesi = await getSessionFromCtx(ctx);
        if (sesi) await AuthService.catatLogout(sesi.user.id, ctx.request?.headers);
        return;
      }

      if (PATH_LOGIN.includes(ctx.path)) await AuthService.tolakJikaTerkunci(ctx.path, ctx.body);
    }),

    // Sesudah percobaan login: catat berhasil/gagal (gagal 5x = akun dikunci)
    after: createAuthMiddleware(async (ctx) => {
      if (!PATH_LOGIN.includes(ctx.path)) return;
      const headers = ctx.request?.headers;

      const sesiBaru = ctx.context.newSession;
      if (sesiBaru) {
        await AuthService.catatLoginBerhasil(sesiBaru.user.id, headers);
        return;
      }

      const hasil = ctx.context.returned;
      if (hasil instanceof APIError && hasil.statusCode === 401) await AuthService.catatLoginGagal(ctx.path, ctx.body, headers);
    }),
  },
});

export type AuthSession = typeof auth.$Infer.Session;
