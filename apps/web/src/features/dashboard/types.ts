import type { StatusPelaksanaan } from "@/components/shared/status-badge";

// Tipe data dashboard: statistik dinas dan aktivitas pegawai

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
