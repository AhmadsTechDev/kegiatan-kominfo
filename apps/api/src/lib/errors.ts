/**
 * Galat aplikasi yang membawa status HTTP; diubah menjadi JSON oleh error.plugin.ts
 *
 * KONSEP class turunan: AppError mewarisi Error bawaan JavaScript lalu menambah status HTTP, kode,
 * dan details. Tulisan `public status: number` di constructor adalah singkatan TypeScript untuk
 * membuat properti sekaligus mengisinya.
 * Fungsi-fungsi di bawah hanyalah "pabrik" kecil agar kode cukup menulis `throw NotFound()`
 * tanpa mengingat angka status dan kodenya.
 */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/**
 * 401: belum login atau sesi sudah habis
 */
export const Unauthorized = (message = "Sesi berakhir, silakan login kembali") => new AppError(401, "UNAUTHORIZED", message);

/**
 * 403: sudah login tetapi tidak berhak
 */
export const Forbidden = (message = "Anda tidak memiliki akses untuk tindakan ini") => new AppError(403, "FORBIDDEN", message);

/**
 * 404: data tidak ditemukan
 */
export const NotFound = (message = "Data tidak ditemukan") => new AppError(404, "NOT_FOUND", message);

/**
 * 409: data sudah diubah orang lain (versi updatedAt tidak cocok)
 */
export const Conflict = (message = "Data sudah diubah orang lain. Muat ulang untuk melihat versi terbaru") =>
  new AppError(409, "CONFLICT", message);

/**
 * 422: isian tidak valid; details berisi daftar { field, message }
 */
export const Unprocessable = (message: string, details?: unknown) => new AppError(422, "VALIDATION_ERROR", message, details);

/**
 * 413: berkas terlalu besar atau kuota berkas habis
 */
export const PayloadTooLarge = (message: string) => new AppError(413, "PAYLOAD_TOO_LARGE", message);

/**
 * 415: jenis berkas tidak didukung
 */
export const UnsupportedMediaType = (message = "Hanya JPEG, PNG, WebP, atau PDF") => new AppError(415, "UNSUPPORTED_MEDIA_TYPE", message);

/**
 * 429: terlalu banyak permintaan dalam waktu singkat
 */
export const TooManyRequests = (message = "Terlalu banyak permintaan. Coba lagi sebentar lagi") =>
  new AppError(429, "TOO_MANY_REQUESTS", message);
