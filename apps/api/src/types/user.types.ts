import type { UserValidator } from "@/validators/user.validator";
import type { Role, StatusAkun } from "./umum.types";

export type DaftarAkunQuery = typeof UserValidator.daftarQuery.static;
export type IsiAkun = typeof UserValidator.buat.static;

// nonaktif: true hanya akun nonaktif, false menyembunyikannya, kosong menampilkan semua
export type FilterAkun = { q?: string; role?: Role; status?: StatusAkun; nonaktif?: boolean };
