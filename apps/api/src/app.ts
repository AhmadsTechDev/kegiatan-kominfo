import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { appConfig } from "@/config/app";
import { authConfig } from "@/config/auth";
import { authPlugin } from "@/plugins/auth.plugin";
import { databasePlugin } from "@/plugins/database.plugin";
import { errorPlugin } from "@/plugins/error.plugin";
import { loggerPlugin } from "@/plugins/logger.plugin";
import { apiRoutes } from "@/routes";
import { asalTerpercaya } from "@/utils/konteks";

export const app = new Elysia({ serve: { maxRequestBodySize: 21 * 1024 * 1024 } })

  .onRequest(({ request, server, set }) => {
    if (!request.headers.has("x-real-ip") && !request.headers.has("x-forwarded-for")) {
      const ip = server?.requestIP(request)?.address;
      if (ip) request.headers.set("x-real-ip", ip);
    }

    set.headers["x-content-type-options"] = "nosniff";
    set.headers["x-frame-options"] = "DENY";
    set.headers["referrer-policy"] = "strict-origin-when-cross-origin";
    if (!asalTerpercaya(request, [appConfig.FRONTEND_URL, authConfig.url])) {
      set.status = 403;
      return { code: "ASAL_DITOLAK", message: "Permintaan ditolak karena tidak berasal dari aplikasi" };
    }
  })

  .use(cors({ origin: appConfig.FRONTEND_URL, credentials: true, exposeHeaders: ["Content-Disposition", "X-Jumlah-Kegiatan"] }))
  .use(loggerPlugin)

  .use(errorPlugin)
  .use(databasePlugin)
  .use(authPlugin)
  .use(apiRoutes);

export type App = typeof app;
