import type { UserValidator } from "@/validators/user.validator";
import type { Role } from "./umum.types";

export type DaftarAkunQuery = typeof UserValidator.daftarQuery.static;
export type BuatAkun = typeof UserValidator.buat.static;
export type UbahAkun = typeof UserValidator.ubah.static;
export type HubungkanAkun = typeof UserValidator.hubungkan.static;

export type FilterAkun = { q?: string; role?: Role; aktif?: boolean };
