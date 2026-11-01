import type { DrafKegiatanValidator } from "@/validators/draf-kegiatan.validator";

export type SimpanDraf = typeof DrafKegiatanValidator.simpan.static;
export type IsiDraf = SimpanDraf["isi"];
