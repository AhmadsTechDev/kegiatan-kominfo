import type { ROLES, SATUAN_REKAP, STATUS_AKUN, STATUS_PELAKSANAAN, STATUS_PEMERIKSAAN, STATUS_PERMINTAAN } from "@/utils/konstanta";

/**
 * Tipe yang dipakai bersama oleh banyak modul
 */

/**
 * KONSEP tipe dari konstanta: `(typeof ROLES)[number]` mengambil semua isi array ROLES menjadi tipe gabungan,
 * mis. "PEGAWAI" | "PIMPINAN" | "ADMIN". Bila konstanta ditambah, tipenya ikut berubah otomatis.
 */
export type Role = (typeof ROLES)[number];
export type StatusAkun = (typeof STATUS_AKUN)[number];
export type StatusPelaksanaan = (typeof STATUS_PELAKSANAAN)[number];
export type StatusPemeriksaan = (typeof STATUS_PEMERIKSAAN)[number];
export type StatusPermintaan = (typeof STATUS_PERMINTAAN)[number];
export type SatuanRekap = (typeof SATUAN_REKAP)[number];

/**
 * Data user yang sedang login, diisi oleh auth.plugin.ts
 */
export type UserSesi = { id: string; name: string; email: string; role: Role; pegawaiId?: number | null };

/**
 * Pelaku sebuah aksi; dipakai service untuk cek hak akses
 */
export type Aktor = { id: string; role: Role; pegawaiId: number | null };

/**
 * IP pemanggil, untuk pembatas laju
 */
export type MetaRequest = { ip: string | null };

/**
 * Admin yang menjalankan aksi manajemen akun; sesiId = sesi yang sedang dipakai admin (tidak ikut dicabut)
 */
export type Admin = { id: string; headers: Headers; sesiId?: string };

/**
 * Rentang waktu [mulai, akhir)
 */
export type Rentang = { mulai: Date; akhir: Date };

export type Halaman = { page: number; pageSize: number };

/**
 * Penanda kegiatan "milik" seseorang: dibuat olehnya atau dia penanggung jawabnya
 */
export type Milik = { userId: string; pegawaiId: number | null };

/**
 * Objek `set` dari Elysia untuk mengatur status HTTP
 */
export type SetStatus = { status?: number | string };

export type GalatField = { field: string; message: string };

/**
 * Bagian konteks Elysia yang dipakai controller. B = body, P = params, Q = query
 *
 * KONSEP generic: B, P, dan Q adalah "tipe isian" yang ditentukan saat dipakai,
 * mis. Konteks<IsiKegiatan, { id: number }> berarti body bertipe IsiKegiatan dan params berisi id angka.
 * `= unknown` adalah nilai bawaan bila tidak diisi.
 */
export type Konteks<B = unknown, P = unknown, Q = unknown> = {
  user: UserSesi;
  session: { id: string };
  request: Request;
  body: B;
  params: P;
  query: Q;
  set: SetStatus;
};
