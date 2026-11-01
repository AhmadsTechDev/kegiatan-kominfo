import type { UndanganValidator } from "@/validators/undangan.validator";
import type { Role } from "./umum.types";

export type UndangBody = typeof UndanganValidator.undang.static;

export type IsiUndangan = { pegawaiId: number; email: string; role: Role };
