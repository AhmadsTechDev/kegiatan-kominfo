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

export const Unauthorized = (message = "Sesi berakhir, silakan login kembali") => new AppError(401, "UNAUTHORIZED", message);

export const Forbidden = (message = "Anda tidak memiliki akses untuk tindakan ini") => new AppError(403, "FORBIDDEN", message);

export const NotFound = (message = "Data tidak ditemukan") => new AppError(404, "NOT_FOUND", message);

export const Conflict = (message = "Data sudah diubah orang lain. Muat ulang untuk melihat versi terbaru") =>
  new AppError(409, "CONFLICT", message);

export const Unprocessable = (message: string, details?: unknown) => new AppError(422, "VALIDATION_ERROR", message, details);

export const PayloadTooLarge = (message: string) => new AppError(413, "PAYLOAD_TOO_LARGE", message);

export const UnsupportedMediaType = (message = "Hanya JPEG, PNG, WebP, atau PDF") => new AppError(415, "UNSUPPORTED_MEDIA_TYPE", message);

export const TooManyRequests = (message = "Terlalu banyak permintaan. Coba lagi sebentar lagi") =>
  new AppError(429, "TOO_MANY_REQUESTS", message);
