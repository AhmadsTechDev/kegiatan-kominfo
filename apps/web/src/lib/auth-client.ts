// =============================================================================
// KLIEN AUTENTIKASI PENGGUNA (BETTER AUTH)
// =============================================================================
// Gunanya: Menginisialisasi klien autentikasi Better Auth di frontend untuk mengelola
// sesi pengguna, proses masuk/keluar akun, dan fitur khusus administrator.
//
// Isi berkas:
//   - authClient : instance Better Auth dengan plugin usernameClient dan adminClient.
//
// Catatan penting:
//   - basePath "/api/auth" diteruskan proxy Next.js ke backend pada origin yang sama.
//   - Cookie sesi dikelola otomatis di sisi klien tanpa kendala lintas domain (CORS).
//
// Dipakai oleh: use-current-user.ts serta komponen formulir autentikasi dan akun.
// =============================================================================

import { createAuthClient } from "better-auth/react";
import { adminClient, usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [usernameClient(), adminClient()],
});
