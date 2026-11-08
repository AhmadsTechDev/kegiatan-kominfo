import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";
import { env, isProduction } from "@/config/env";
import { AuthService, PATH_AUTH_PUBLIK, PATH_LOGIN } from "@/services/auth.service";
import { SANDI_MAKS, SANDI_MIN } from "@/utils/kebijakan-sandi";
import { account, session, user, verification } from "@/db/schema";
import { db } from "./db";
import { cocokSandi, hashSandi } from "./sandi";

/**
 * Role untuk plugin admin Better Auth. Endpoint HTTP plugin ini ditutup (lihat hook di bawah); plugin tetap dipasang
 * karena menyediakan kolom role/banned dan menolak login akun yang dinonaktifkan (BANNED_USER) setelah sandinya cocok
 *
 * KONSEP access control: daftar izin per role. `ac.newRole` menentukan aksi apa saja yang boleh
 * dilakukan role itu lewat plugin admin Better Auth. Pengecekan hak akses aplikasi yang sesungguhnya
 * tetap ada di backend kita sendiri (opsi `auth` di rute dan pengecekan di service).
 */
const ac = createAccessControl(defaultStatements);
const rolesAuth = {
  ADMIN: ac.newRole({ user: ["create", "list", "set-role", "ban", "get", "update"], session: ["list", "revoke", "delete"] }),
  PEGAWAI: ac.newRole({ user: [], session: [] }),
  PIMPINAN: ac.newRole({ user: [], session: [] }),
};

/**
 * Konfigurasi Better Auth: login hanya dengan email, sesi 8 jam di cookie HttpOnly, tanpa daftar mandiri.
 * Aktivasi, lupa/reset sandi, ganti email, dan ganti sandi ditangani services/kredensial.service.ts & akun-saya.service.ts
 *
 * Better Auth adalah library autentikasi: ia mengurus login, cookie sesi, dan tabel user/session.
 * Objek `auth` ini dipakai di dua tempat:
 * - auth.handler dipasang oleh plugins/auth.plugin.ts untuk melayani alamat /api/auth/*.
 * - auth.api.getSession() dipanggil untuk mengecek siapa yang sedang login di setiap permintaan.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.FRONTEND_URL],

  /**
   * Better Auth menyimpan user dan sesi lewat koneksi Drizzle yang sama dengan bagian aplikasi lainnya.
   */
  database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),

  emailAndPassword: {
    enabled: true,

    /**
     * Tidak ada pendaftaran mandiri: akun hanya dibuat admin (lewat undangan) atau dari permintaan akun yang disetujui.
     */
    disableSignUp: true,
    minPasswordLength: SANDI_MIN,
    maxPasswordLength: SANDI_MAKS,

    /**
     * Argon2id; hash scrypt lama tetap bisa login dan diperbarui otomatis (AuthService.catatLoginBerhasil)
     */
    password: { hash: hashSandi, verify: cocokSandi },
  },

  /**
   * additionalFields: kolom tambahan di tabel user milik aplikasi ini.
   * input: false = tidak boleh diisi dari luar lewat endpoint Better Auth; returned: false = tidak ikut dikirim ke frontend.
   */
  user: {
    additionalFields: {
      pegawaiId: { type: "number", required: false, input: false },
      failedLoginCount: { type: "number", required: false, input: false, returned: false },
      lockedUntil: { type: "date", required: false, input: false, returned: false },
      emailBaru: { type: "string", required: false, input: false, returned: false },
    },
  },

  /**
   * Sesi berlaku 8 jam (dalam detik). updateAge: masa berlaku diperpanjang paling sering sekali per jam saat pengguna aktif.
   */
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
  },

  /**
   * Token verifikasi bawaan Better Auth (bila suatu saat dipakai) disimpan sebagai hash, bukan teks asli
   */
  verification: { storeIdentifier: "hashed" },

  /**
   * httpOnly: cookie tidak bisa dibaca JavaScript di peramban, jadi aman dari pencurian lewat skrip jahat (XSS).
   * sameSite "lax": cookie tidak ikut terkirim pada permintaan POST dari situs lain (perlindungan CSRF).
   * secure: cookie hanya dikirim lewat HTTPS saat produksi.
   */
  advanced: {
    database: { generateId: () => crypto.randomUUID() },
    useSecureCookies: isProduction,
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: isProduction },
  },

  /**
   * Pembatas laju: paling banyak 100 permintaan per 60 detik dari satu IP ke endpoint auth, untuk meredam serangan tebak sandi.
   */
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,

    /**
     * Percobaan dengan email berbeda dari satu IP ikut dihitung; pegawai satu kantor sering berbagi satu IP publik.
     * Perlindungan per akun ada di AuthService (5 salah = kunci 15 menit), jadi batas IP cukup longgar
     */
    customRules: { [PATH_LOGIN]: { window: 60, max: 30 } },
  },

  plugins: [admin({ ac, roles: rolesAuth, defaultRole: "PEGAWAI", adminRoles: ["ADMIN"] })],

  /**
   * KONSEP hook/middleware: fungsi yang "menyelip" di sekitar proses Better Auth.
   * `before` berjalan sebelum Better Auth memproses permintaan, `after` berjalan sesudahnya.
   * Di sini kita memakai keduanya untuk aturan khusus aplikasi: penguncian akun dan pencatatan login.
   */
  hooks: {
    /**
     * Sebelum Better Auth bekerja: tutup endpoint yang tidak dipakai dan tolak login bila akun terkunci.
     * ctx.request hanya ada untuk permintaan HTTP; panggilan auth.api dari server tidak dibatasi
     */
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.request && !PATH_AUTH_PUBLIK.includes(ctx.path)) AuthService.tolakEndpointTertutup();

      if (ctx.path === PATH_LOGIN) await AuthService.tolakJikaTerkunci(ctx.body);
    }),

    /**
     * Sesudah percobaan login: catat berhasil/gagal (gagal 5x = akun dikunci)
     */
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== PATH_LOGIN) return;

      /**
       * Login berhasil ditandai dengan adanya sesi baru; kalau tidak ada dan jawabannya 401, berarti sandi salah.
       */
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

/**
 * Tipe data sesi (user + session) yang disimpulkan otomatis dari konfigurasi di atas, jadi selalu sinkron.
 */
export type AuthSession = typeof auth.$Infer.Session;
