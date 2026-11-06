import { Elysia } from "elysia";
import { auth } from "@/lib/auth";
import { Forbidden, Unauthorized } from "@/lib/errors";
import type { Role } from "@/types/umum.types";

/**
 * Memasang endpoint login Better Auth (/api/auth/*) dan opsi `auth` untuk melindungi rute.
 *   auth: true               -> wajib login (semua role)
 *   auth: ["ADMIN", ...]     -> wajib login dengan salah satu role tersebut
 * Bila lolos, handler mendapat `user` (data akun) dan `session`.
 *
 * KONSEP plugin + macro:
 * - .mount(auth.handler) menyerahkan semua alamat /api/auth/* (login, logout, dsb.) ke library Better Auth.
 * - .macro({ auth }) membuat opsi baru bernama `auth` yang bisa ditulis di definisi rute, contoh
 *   `.get("/x", handler, { auth: ["ADMIN"] })`. Elysia menjalankan isi macro sebelum handler rute.
 * - name: "auth" membuat plugin ini hanya dipasang sekali walaupun di-.use() di banyak file rute.
 */
export const authPlugin = new Elysia({ name: "auth" }).mount(auth.handler).macro({
  auth: (roles: true | Role[]) => ({
    /**
     * Membaca sesi dari cookie; 401 bila belum login, 403 bila akun nonaktif atau role tidak cocok
     *
     * KONSEP resolve: fungsi yang berjalan sebelum handler, dan nilai yang di-return-nya (user, session)
     * otomatis tersedia sebagai parameter handler. Fungsi ini `async` karena harus menunggu database membaca sesi.
     * Bila sebuah galat dilempar (throw), handler tidak dijalankan dan error.plugin mengubahnya menjadi JSON 401/403.
     */
    async resolve({ request: { headers } }) {
      const hasil = await auth.api.getSession({ headers });
      if (!hasil) throw Unauthorized();
      if (hasil.user.banned) throw Forbidden("Akun Anda dinonaktifkan");

      const role = hasil.user.role as Role;

      /**
       * `roles` bernilai true berarti cukup login; bila berupa daftar role, role pengguna harus ada di daftar itu.
       */
      if (Array.isArray(roles) && !roles.includes(role)) throw Forbidden();

      return { user: { ...hasil.user, role }, session: hasil.session };
    },
  }),
});
