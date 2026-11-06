import { Elysia } from "elysia";
import { AppError } from "@/lib/errors";

/**
 * Mengubah semua galat menjadi JSON seragam { code, message, details } untuk frontend
 *
 * KONSEP error handling terpusat: daripada setiap rute menulis try/catch sendiri, rute cukup melempar
 * galat (throw NotFound(), throw Forbidden(), dsb.) dan plugin ini yang menyusun jawabannya.
 * `as: "global"` berarti penanganan ini berlaku untuk seluruh rute di aplikasi, bukan hanya di plugin ini.
 */
export const errorPlugin = new Elysia({ name: "error" }).onError({ as: "global" }, ({ code, error, set }) => {
  /**
   * Galat buatan aplikasi (lib/errors.ts) sudah membawa status dan kode, jadi tinggal diteruskan.
   */
  if (error instanceof AppError) {
    set.status = error.status;
    return { code: error.code, message: error.message, details: error.details };
  }
  switch (code) {
    /**
     * Galat validasi dari Elysia (isian tidak sesuai skema validator). Setiap kesalahan diubah menjadi
     * { field, message } supaya frontend bisa menampilkan pesan tepat di bawah kolom yang salah.
     * Pesan diambil dari opsi `error` di skema validator bila ada, kalau tidak memakai pesan bawaan.
     */
    case "VALIDATION":
      set.status = 422;
      return {
        code: "VALIDATION_ERROR",
        message: "Data yang dikirim tidak valid",
        details: error.all.map((e) => {
          const pesanSchema = "schema" in e ? (e.schema as { error?: unknown }).error : undefined;
          return {
            field: "path" in e ? e.path.replace(/^\//, "") : undefined,
            message: typeof pesanSchema === "string" ? pesanSchema : (e.summary ?? e.message),
          };
        }),
      };
    case "NOT_FOUND":
      set.status = 404;
      return { code: "NOT_FOUND", message: "Endpoint tidak ditemukan" };
    case "PARSE":
      set.status = 400;
      return { code: "BAD_REQUEST", message: "Format permintaan tidak dapat dibaca" };

    /**
     * Galat yang tidak terduga: detailnya hanya dicatat di log server, pengguna cukup menerima pesan umum agar info internal tidak bocor.
     */
    default:
      console.error("[error]", error);
      set.status = 500;
      return { code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server" };
  }
});
