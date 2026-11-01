import type { PermintaanAkunValidator } from "@/validators/permintaan-akun.validator";

export type IsiPermintaan = typeof PermintaanAkunValidator.ajukan.static;
export type DaftarPermintaanQuery = typeof PermintaanAkunValidator.daftarQuery.static;
export type SetujuiPermintaan = typeof PermintaanAkunValidator.setujui.static;
