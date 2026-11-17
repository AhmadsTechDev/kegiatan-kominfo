import { Elysia } from "elysia";
import { auth } from "@/lib/auth";
import { Forbidden, Unauthorized } from "@/lib/errors";
import type { Role } from "@/types/umum.types";

export const authPlugin = new Elysia({ name: "auth" }).mount(auth.handler).macro({
  auth: (roles: true | readonly Role[]) => ({
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
