import { Elysia } from "elysia";
import { auth } from "@/lib/auth";
import { Forbidden, Unauthorized } from "@/lib/errors";
import type { Role } from "@/types/umum.types";

// Memasang endpoint login Better Auth (/api/auth/*) dan opsi `auth` untuk melindungi rute.
//   auth: true               -> wajib login (semua role)
//   auth: ["ADMIN", ...]     -> wajib login dengan salah satu role tersebut
// Bila lolos, handler mendapat `user` (data akun) dan `session`.
export const authPlugin = new Elysia({ name: "auth" }).mount(auth.handler).macro({
  auth: (roles: true | Role[]) => ({
    // Membaca sesi dari cookie; 401 bila belum login, 403 bila akun nonaktif atau role tidak cocok
    async resolve({ request: { headers } }) {
      const hasil = await auth.api.getSession({ headers });
      if (!hasil) throw Unauthorized();
      if (hasil.user.banned) throw Forbidden("Akun Anda dinonaktifkan");

      const role = hasil.user.role as Role;
      if (Array.isArray(roles) && !roles.includes(role)) throw Forbidden();

      return { user: { ...hasil.user, role }, session: hasil.session };
    },
  }),
});
