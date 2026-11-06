import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

// Klien Better Auth: sesi, login/logout, dan fitur admin

// Kolom tambahan user dari backend (role dari plugin admin, pegawaiId dari user.additionalFields)
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [inferAdditionalFields({ user: { role: { type: "string" }, pegawaiId: { type: "number", required: false } } })],
});
