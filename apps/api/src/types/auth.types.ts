import type { AuthValidator } from "@/validators/auth.validator";

export type UbahProfil = typeof AuthValidator.ubahProfil.static;
export type GantiEmail = typeof AuthValidator.gantiEmail.static;
export type GantiSandi = typeof AuthValidator.gantiSandi.static;
export type UbahPreferensi = typeof AuthValidator.preferensi.static;
export type AturSandi = typeof AuthValidator.aturSandi.static;

export type Preferensi = Required<UbahPreferensi>;
