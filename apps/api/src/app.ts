import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { env } from "@/config/env";
import { authPlugin } from "@/plugins/auth.plugin";
import { databasePlugin } from "@/plugins/database.plugin";
import { errorPlugin } from "@/plugins/error.plugin";
import { loggerPlugin } from "@/plugins/logger.plugin";
import { apiRoutes } from "@/routes";
import { asalTerpercaya } from "@/utils/konteks";

/**
 * Merakit server. Urutan .use() penting: plugin yang dipasang lebih dulu berlaku untuk semua yang sesudahnya.
 * Ukuran body maksimal 21 MB karena unggahan dokumentasi maksimal 20 MB.
 *
 * KONSEP: Elysia adalah framework web untuk Bun. Server dibangun dengan "method chaining",
 * yaitu memanggil .onRequest(), .use(), dan seterusnya secara berantai pada objek yang sama.
 * Setiap .use(plugin) menambahkan kemampuan baru ke server, mirip memasang modul tambahan.
 */
export const app = new Elysia({ serve: { maxRequestBodySize: 21 * 1024 * 1024 } })

  /**
   * Untuk setiap permintaan: catat IP asli (untuk pembatas laju), pasang header keamanan, dan tolak permintaan
   * pengubah data yang tidak berasal dari frontend (perlindungan CSRF untuk cookie sesi)
   *
   * KONSEP lifecycle hook: onRequest dijalankan PALING AWAL untuk setiap permintaan, sebelum rute dicari.
   * Bila fungsi ini mengembalikan nilai (return {...}), Elysia langsung mengirim nilai itu sebagai jawaban
   * dan permintaan berhenti di sini, sehingga rute tujuannya tidak pernah dijalankan.
   */
  .onRequest(({ request, server, set }) => {
    /**
     * Bila API berada di belakang reverse proxy (mis. Caddy, lihat Caddyfile), proxy yang mengisi header IP. Tanpa proxy,
     * IP diambil dari koneksi agar pembatas laju tetap tahu asal permintaan.
     */
    if (!request.headers.has("x-real-ip") && !request.headers.has("x-forwarded-for")) {
      const ip = server?.requestIP(request)?.address;
      if (ip) request.headers.set("x-real-ip", ip);
    }

    /**
     * Header keamanan untuk peramban: nosniff = jangan menebak jenis berkas, DENY = halaman API tidak boleh
     * ditampilkan di dalam iframe situs lain, referrer-policy = batasi info alamat asal yang dibagikan.
     */
    set.headers["x-content-type-options"] = "nosniff";
    set.headers["x-frame-options"] = "DENY";
    set.headers["referrer-policy"] = "strict-origin-when-cross-origin";
    if (!asalTerpercaya(request, [env.FRONTEND_URL, env.BETTER_AUTH_URL])) {
      set.status = 403;
      return { code: "ASAL_DITOLAK", message: "Permintaan ditolak karena tidak berasal dari aplikasi" };
    }
  })

  /**
   * Hanya website frontend yang boleh memanggil API (termasuk membawa cookie login)
   *
   * CORS (Cross-Origin Resource Sharing): aturan peramban yang menentukan situs mana yang boleh memanggil API.
   * credentials: true mengizinkan cookie login ikut terkirim. exposeHeaders membuat frontend bisa membaca header
   * tersebut (nama berkas unduhan dan jumlah kegiatan).
   */
  .use(cors({ origin: env.FRONTEND_URL, credentials: true, exposeHeaders: ["Content-Disposition", "X-Jumlah-Kegiatan"] }))
  .use(loggerPlugin)

  /**
   * Semua galat dari rute di bawahnya diubah menjadi JSON seragam oleh plugin ini.
   */
  .use(errorPlugin)
  .use(databasePlugin)
  .use(authPlugin)
  .use(apiRoutes);

/**
 * Tipe server lengkap, dipakai bila ada kode lain yang perlu mengetahui bentuk seluruh rute API.
 */
export type App = typeof app;
