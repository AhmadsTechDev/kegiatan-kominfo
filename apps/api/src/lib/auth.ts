import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";
import { appConfig, isProduction } from "@/config/app";
import { authConfig } from "@/config/auth";
import { AuthService, PATH_AUTH_PUBLIK, PATH_LOGIN } from "@/services/auth.service";
import { SANDI_MAKS, SANDI_MIN } from "@/utils/kebijakan-sandi";
import { account, session, user, verification } from "@/db/schema";
import { db } from "@/db";
import { cocokSandi, hashSandi } from "./sandi";

const ac = createAccessControl(defaultStatements);
const rolesAuth = {
  ADMIN: ac.newRole({ user: ["create", "list", "set-role", "ban", "get", "update"], session: ["list", "revoke", "delete"] }),
  PEGAWAI: ac.newRole({ user: [], session: [] }),
  PIMPINAN: ac.newRole({ user: [], session: [] }),
};

export const auth = betterAuth({
  baseURL: authConfig.url,
  basePath: "/api/auth",
  secret: authConfig.secret,
  trustedOrigins: [appConfig.FRONTEND_URL],

  database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),

  emailAndPassword: {
    enabled: true,

    disableSignUp: true,
    minPasswordLength: SANDI_MIN,
    maxPasswordLength: SANDI_MAKS,

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

    customRules: { [PATH_LOGIN]: { window: 60, max: 30 } },
  },

  plugins: [admin({ ac, roles: rolesAuth, defaultRole: "PEGAWAI", adminRoles: ["ADMIN"] })],

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.request && !PATH_AUTH_PUBLIK.includes(ctx.path)) AuthService.tolakEndpointTertutup();

      if (ctx.path === PATH_LOGIN) await AuthService.tolakJikaTerkunci(ctx.body);
    }),

    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== PATH_LOGIN) return;

      const sesiBaru = ctx.context.newSession;
      if (sesiBaru) {
        await AuthService.catatLoginBerhasil(sesiBaru.user.id, ctx.body);
        return;
      }

      const hasil = ctx.context.returned;
      if (hasil instanceof APIError && hasil.statusCode === 401) await AuthService.catatLoginGagal(ctx.body);
    }),
  },
});

export type AuthSession = typeof auth.$Infer.Session;
