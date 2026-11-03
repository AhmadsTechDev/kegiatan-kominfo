// =============================================================================
// TIPE DATA FITUR DASHBOARD
// =============================================================================
// Gunanya: Mendefinisikan kontrak tipe data TypeScript untuk seluruh data
// statistik dinas dan aktivitas personal pegawai pada dashboard aplikasi.
//
// Isi berkas:
//   - KegiatanRingkas : Bentuk ringkas data kegiatan untuk tabel, agenda, dan peta.
//   - DashboardData : Struktur data lengkap respons API dashboard dinas.
//   - AgendaPekan : Struktur data jadwal agenda kegiatan unit selama tujuh hari.
//   - KegiatanSaya : Struktur data respons dashboard personal milik pegawai.
//
// Catatan penting:
//   - Berfungsi sebagai kontrak antarmuka klien terhadap endpoint GET /dashboard
//     dan GET /dashboard/saya guna memastikan keamanan tipe data (type-safety).
//   - Mengakomodasi kegiatan daring dengan tipe lokasiNama berupa string atau null.
//
// Dipakai oleh: get-dashboard.ts dan seluruh komponen dashboard
// =============================================================================

import type { StatusPelaksanaan } from "@/components/shared/status-badge";

export type KegiatanRingkas = {
  id: number;
  judul: string;
  tglMulai: string;
  tglSelesai: string;
  lokasiNama: string | null;
  bidang: string;
  jenis: string;
  penanggungJawab: string;
  statusPelaksanaan: StatusPelaksanaan;
};

export type DashboardData = {
  periode: string;
  periodeSekarang: string;
  kpi: {
    total: number;
    totalPeriodeSebelumnya: number;
    berlangsung: number;
    akanDatang: number;
    selesai: number;
  };
  trenUnitBulanan: {
    unitInduk: { id: number; kode: string; nama: string }[];
    data: { bulan: string; jumlah: Record<string, number> }[];
  };
  sebaranJenis: { id: number; nama: string; jumlah: number }[];
  peta: (KegiatanRingkas & { lat: number; lng: number })[];
  akanDatang: KegiatanRingkas[];
  /** Hanya terisi untuk ADMIN */
  admin: { menungguAktivasi: number } | null;
};

export type AgendaPekan = {
  id: number;
  judul: string;
  tglMulai: string;
  tglSelesai: string;
  lokasiNama: string | null;
  bidang: { id: number; nama: string };
  jenis: string;
  penanggungJawab: string;
  statusPelaksanaan: StatusPelaksanaan;
};

export type KegiatanSaya = {
  hariIni: string;
  perluDokumentasi: { total: number; items: KegiatanRingkas[] };
  agenda: { total: number; items: KegiatanRingkas[] };
  pekanIni: AgendaPekan[];
  unit: { id: number; jumlahBulanIni: number } | null;
};
