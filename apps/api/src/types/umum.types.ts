import type { ROLES, SATUAN_REKAP, STATUS_AKUN, STATUS_PELAKSANAAN, STATUS_PEMERIKSAAN, STATUS_PERMINTAAN, TEMA } from "@/utils/konstanta";

export type Role = (typeof ROLES)[number];
export type StatusAkun = (typeof STATUS_AKUN)[number];
export type Tema = (typeof TEMA)[number];
export type StatusPelaksanaan = (typeof STATUS_PELAKSANAAN)[number];
export type StatusPemeriksaan = (typeof STATUS_PEMERIKSAAN)[number];
export type StatusPermintaan = (typeof STATUS_PERMINTAAN)[number];
export type SatuanRekap = (typeof SATUAN_REKAP)[number];

export type UserSesi = { id: string; name: string; email: string; role: Role; pegawaiId?: number | null };

export type Aktor = { id: string; role: Role; pegawaiId: number | null };

export type MetaRequest = { ip: string | null };

export type Admin = { id: string; sesiId?: string };

export type Rentang = { mulai: Date; akhir: Date };

export type Halaman = { page: number; pageSize: number };

export type Milik = { userId: string; pegawaiId: number | null };

export type GalatField = { field: string; message: string };
