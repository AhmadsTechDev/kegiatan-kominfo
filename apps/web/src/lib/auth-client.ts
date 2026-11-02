// =============================================================================
// KLIEN AUTENTIKASI PENGGUNA (BETTER AUTH)
// =============================================================================
// Gunanya: Menginisialisasi klien autentikasi Better Auth di frontend untuk mengelola
// sesi pengguna, proses masuk/keluar akun, dan fitur khusus administrator.
//
// Isi berkas:
//   - authClient : instance Better Auth untuk login email, logout, dan membaca sesi.
//
// Catatan penting:
//   - basePath "/api/auth" diteruskan proxy Next.js ke backend pada origin yang sama.
//   - Cookie sesi dikelola otomatis di sisi klien tanpa kendala lintas domain (CORS).
//   - Backend hanya membuka sign-in/email, sign-out, dan get-session. Aktivasi, lupa sandi,
//     ganti sandi, ganti email, dan sesi memakai endpoint aplikasi (apiClient).
//
// Dipakai oleh: use-current-user.ts, use-login.ts, use-logout.ts.
// =============================================================================

import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

// Kolom tambahan user dari backend (role dari plugin admin, pegawaiId dari user.additionalFields)
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [inferAdditionalFields({ user: { role: { type: "string" }, pegawaiId: { type: "number", required: false } } })],
});
