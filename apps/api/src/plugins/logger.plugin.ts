import { Elysia } from "elysia";
import { appConfig } from "@/config/app";

const aktif = appConfig.NODE_ENV !== "test";

export const loggerPlugin = new Elysia({ name: "logger" })

  .derive({ as: "global" }, () => ({ waktuMulai: performance.now() }))
  .onAfterResponse({ as: "global" }, ({ request, set, response, waktuMulai }) => {
    if (!aktif) return;

    const status = response instanceof Response ? response.status : (set.status ?? 200);
    const lama = waktuMulai === undefined ? "-" : `${(performance.now() - waktuMulai).toFixed(0)}ms`;
    console.log(`${request.method} ${new URL(request.url).pathname} ${status} ${lama}`);
  });
