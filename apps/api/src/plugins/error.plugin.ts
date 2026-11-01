import { Elysia } from "elysia";
import { AppError } from "@/lib/errors";

// Mengubah semua galat menjadi JSON seragam { code, message, details } untuk frontend
export const errorPlugin = new Elysia({ name: "error" }).onError({ as: "global" }, ({ code, error, set }) => {
  if (error instanceof AppError) {
    set.status = error.status;
    return { code: error.code, message: error.message, details: error.details };
  }
  switch (code) {
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
    default:
      console.error("[error]", error);
      set.status = 500;
      return { code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server" };
  }
});
