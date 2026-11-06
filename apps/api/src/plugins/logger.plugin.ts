import { Elysia } from "elysia";
import { env } from "@/config/env";

const aktif = env.NODE_ENV !== "test";

/**
 * Menulis satu baris log untuk setiap permintaan: metode, path, status, dan lama proses
 */
export const loggerPlugin = new Elysia({ name: "logger" })

  /**
   * derive menambahkan data baru ke setiap permintaan, di sini catatan waktu mulai.
   * onAfterResponse berjalan setelah jawaban terkirim, jadi lama proses = waktu sekarang dikurangi waktuMulai.
   */
  .derive({ as: "global" }, () => ({ waktuMulai: performance.now() }))
  .onAfterResponse({ as: "global" }, ({ request, set, response, waktuMulai }) => {
    if (!aktif) return;

    /**
     * Handler yang mengembalikan Response sendiri (mis. Better Auth) membawa status di Response itu
     */
    const status = response instanceof Response ? response.status : (set.status ?? 200);
    const lama = waktuMulai === undefined ? "-" : `${(performance.now() - waktuMulai).toFixed(0)}ms`;
    console.log(`${request.method} ${new URL(request.url).pathname} ${status} ${lama}`);
  });
