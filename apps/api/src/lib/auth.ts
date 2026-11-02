import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";
import { env, isProduction } from "@/config/env";
import { AuthService, PATH_AUTH_PUBLIK, PATH_LOGIN } from "@/services/auth.service";
import { SANDI_MAKS, SANDI_MIN } from "@/utils/kebijakan-sandi";
import { prisma } from "./prisma";
import { cocokSandi, hashSandi } from "./sandi";

// Role untuk plugin admin Better Auth. Endpoint HTTP plugin ini ditutup (lihat hook di bawah); plugin tetap dipasang
// karena menyediakan kolom role/banned dan menolak login akun yang dinonaktifkan (BANNED_USER) setelah sandinya cocok
const ac = createAccessControl(defaultStatements);
const rolesAuth = {
  ADMIN: ac.newRole({ user: ["create", "list", "set-role", "ban", "get", "update"], session: ["list", "revoke", "delete"] }),
  PEGAWAI: ac.newRole({ user: [], session: [] }),
  PIMPINAN: ac.newRole({ user: [], session: [] }),
};

// Konfigurasi Better Auth: login hanya dengan email, sesi 8 jam di cookie HttpOnly, tanpa daftar mandiri.
// Aktivasi, lupa/reset sandi, ganti email, dan ganti sandi ditangani services/kredensial.service.ts & akun-saya.service.ts
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.FRONTEND_URL],

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: SANDI_MIN,
    maxPasswordLength: SANDI_MAKS,
    // Argon2id; hash scrypt lama tetap bisa login dan diperbarui otomatis (AuthService.catatLoginBerhasil)
    password: { hash: hashSandi, verify: cocokSandi },
  },

  user: {
    additionalFields: {
      pegawaiId: { type: "number", required: false, input: false },
      failedLoginCount: { type: "number", required: false, input: false, returned: false },
      lockedUntil: { type: "date", required: false, input: false, returned: false },
      emailBaru: { type: "string", required: false, input: false, returned: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
  },

  // Token verifikasi bawaan Better Auth (bila suatu saat dipakai) disimpan sebagai hash, bukan teks asli
  verification: { storeIdentifier: "hashed" },

  advanced: {
    database: { generateId: () => crypto.randomUUID() },
    useSecureCookies: isProduction,
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: isProduction },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    // Percobaan dengan email berbeda dari satu IP ikut dihitung; pegawai satu kantor sering berbagi satu IP publik.
    // Perlindungan per akun ada di AuthService (5 salah = kunci 15 menit), jadi batas IP cukup longgar
    customRules: { [PATH_LOGIN]: { window: 60, max: 30 } },
  },

  plugins: [admin({ ac, roles: rolesAuth, defaultRole: "PEGAWAI", adminRoles: ["ADMIN"] })],

  hooks: {
    // Sebelum Better Auth bekerja: tutup endpoint yang tidak dipakai, catat logout, tolak login bila akun terkunci.
    // ctx.request hanya ada untuk permintaan HTTP; panggilan auth.api dari server tidak dibatasi
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.request && !PATH_AUTH_PUBLIK.includes(ctx.path)) AuthService.tolakEndpointTertutup();

      if (ctx.path === "/sign-out") {
        const sesi = await getSessionFromCtx(ctx);
        if (sesi) await AuthService.catatLogout(sesi.user.id, ctx.request?.headers);
        return;
      }

      if (ctx.path === PATH_LOGIN) await AuthService.tolakJikaTerkunci(ctx.body);
    }),

    // Sesudah percobaan login: catat berhasil/gagal (gagal 5x = akun dikunci)
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== PATH_LOGIN) return;
      const headers = ctx.request?.headers;

      const sesiBaru = ctx.context.newSession;
      if (sesiBaru) {
        await AuthService.catatLoginBerhasil(sesiBaru.user.id, ctx.body, headers);
        return;
      }

      const hasil = ctx.context.returned;
      if (hasil instanceof APIError && hasil.statusCode === 401) await AuthService.catatLoginGagal(ctx.body, headers);
    }),
  },
});

export type AuthSession = typeof auth.$Infer.Session;
