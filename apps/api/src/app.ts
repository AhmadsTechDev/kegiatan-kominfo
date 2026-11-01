import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { env } from "@/config/env";
import { authPlugin } from "@/plugins/auth.plugin";
import { databasePlugin } from "@/plugins/database.plugin";
import { errorPlugin } from "@/plugins/error.plugin";
import { loggerPlugin } from "@/plugins/logger.plugin";
import { apiRoutes } from "@/routes";

// Merakit server. Urutan .use() penting: plugin yang dipasang lebih dulu berlaku untuk semua yang sesudahnya.
// Ukuran body maksimal 21 MB karena unggahan dokumentasi maksimal 20 MB.
export const app = new Elysia({ serve: { maxRequestBodySize: 21 * 1024 * 1024 } })
  // Untuk setiap permintaan: catat IP asli (untuk audit log) dan pasang header keamanan
  .onRequest(({ request, server, set }) => {
    if (!request.headers.has("x-real-ip") && !request.headers.has("x-forwarded-for")) {
      const ip = server?.requestIP(request)?.address;
      if (ip) request.headers.set("x-real-ip", ip);
    }
    set.headers["x-content-type-options"] = "nosniff";
    set.headers["x-frame-options"] = "DENY";
    set.headers["referrer-policy"] = "strict-origin-when-cross-origin";
  })
  // Hanya website frontend yang boleh memanggil API (termasuk membawa cookie login)
  .use(cors({ origin: env.FRONTEND_URL, credentials: true, exposeHeaders: ["Content-Disposition", "X-Jumlah-Kegiatan"] }))
  .use(loggerPlugin)
  .use(errorPlugin)
  .use(databasePlugin)
  .use(authPlugin)
  .use(apiRoutes);

export type App = typeof app;
