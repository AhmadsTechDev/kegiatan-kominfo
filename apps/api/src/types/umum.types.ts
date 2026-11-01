import type { AKSI_AUDIT, ROLES, SATUAN_REKAP, STATUS_PELAKSANAAN, STATUS_PEMERIKSAAN, STATUS_PERMINTAAN } from "@/utils/konstanta";

// Tipe yang dipakai bersama oleh banyak modul

export type Role = (typeof ROLES)[number];
export type StatusPelaksanaan = (typeof STATUS_PELAKSANAAN)[number];
export type StatusPemeriksaan = (typeof STATUS_PEMERIKSAAN)[number];
export type StatusPermintaan = (typeof STATUS_PERMINTAAN)[number];
export type SatuanRekap = (typeof SATUAN_REKAP)[number];
export type AksiAudit = (typeof AKSI_AUDIT)[number];

// Data user yang sedang login, diisi oleh auth.plugin.ts
export type UserSesi = { id: string; name: string; email: string; role: Role; pegawaiId?: number | null };

// Pelaku sebuah aksi; dipakai service untuk cek hak akses
export type Aktor = { id: string; role: Role; pegawaiId: number | null };

// IP dan user-agent pemanggil, untuk audit log
export type MetaRequest = { ip: string | null; userAgent: string | null };

// Admin yang memanggil API Better Auth (butuh header cookie aslinya)
export type Admin = { id: string; headers: Headers; meta: MetaRequest };

// Rentang waktu [mulai, akhir)
export type Rentang = { mulai: Date; akhir: Date };

export type Halaman = { page: number; pageSize: number };

// Penanda kegiatan "milik" seseorang: dibuat olehnya atau dia penanggung jawabnya
export type Milik = { userId: string; pegawaiId: number | null };

// Objek `set` dari Elysia untuk mengatur status HTTP
export type SetStatus = { status?: number | string };

export type GalatField = { field: string; message: string };

// Bagian konteks Elysia yang dipakai controller. B = body, P = params, Q = query
export type Konteks<B = unknown, P = unknown, Q = unknown> = {
  user: UserSesi;
  request: Request;
  body: B;
  params: P;
  query: Q;
  set: SetStatus;
};
