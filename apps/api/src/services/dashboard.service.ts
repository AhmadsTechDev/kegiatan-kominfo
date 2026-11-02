import { DashboardRepository } from "@/repositories/dashboard.repository";
import { KegiatanRepository } from "@/repositories/kegiatan.repository";
import { ReferensiRepository } from "@/repositories/referensi.repository";
import { UserRepository } from "@/repositories/user.repository";
import type { Aktor } from "@/types/umum.types";
import { awalHariJakarta, geserPeriode, kodePeriode, periodeSekarang, rentangPeriode, tanggalJakarta, type Periode } from "@/utils/periode";
import { lingkupBaca } from "./kegiatan.service";

const JUMLAH_BULAN_TREN = 6;
const BATAS_DAFTAR = 5;
const HARI_PEKAN = 7;
const BATAS_PEKAN = 30;

// Tren 6 bulan terakhir: jumlah kegiatan per bulan untuk setiap unit induk (kunci = kode unit)
async function trenUnitBulanan(periode: Periode) {
  const awal = geserPeriode(periode, -(JUMLAH_BULAN_TREN - 1));
  const [baris, unitInduk] = await Promise.all([
    DashboardRepository.jumlahPerBulanUnitInduk(kodePeriode(awal), kodePeriode(periode)),
    DashboardRepository.daftarUnitInduk(),
  ]);

  const data = Array.from({ length: JUMLAH_BULAN_TREN }, (_, i) => {
    const bulan = kodePeriode(geserPeriode(awal, i));
    const jumlah = Object.fromEntries(unitInduk.map((u) => [u.kode, baris.find((r) => r.bulan === bulan && r.unitIndukId === u.id)?.jumlah ?? 0]));
    return { bulan, jumlah };
  });
  return { unitInduk, data };
}

export const DashboardService = {
  // Dashboard pimpinan/admin untuk satu bulan: KPI, tren, sebaran jenis, peta, dan daftar perhatian.
  // Admin juga menerima jumlah akun yang menunggu aktivasi.
  async ringkasan(periode: Periode, aktor: Aktor, sekarang = new Date()) {
    const rentang = rentangPeriode(periode);
    const [kpi, totalSebelumnya, tren, jenis, jenisAktif, peta, perhatian, mendatang, menungguAktivasi] = await Promise.all([
      DashboardRepository.hitungKpi(rentang, sekarang),
      DashboardRepository.hitungTotal(rentangPeriode(geserPeriode(periode, -1))),
      trenUnitBulanan(periode),
      DashboardRepository.jumlahPerJenis(rentang),
      DashboardRepository.jenisAktif(),
      DashboardRepository.titikPeta(rentang, sekarang),
      DashboardRepository.selesaiTanpaDokumentasi(rentang, sekarang, BATAS_DAFTAR),
      DashboardRepository.akanDatang(sekarang, BATAS_DAFTAR),
      aktor.role === "ADMIN" ? UserRepository.hitungStatus("MENUNGGU_AKTIVASI") : null,
    ]);
    const tanpaKegiatan = jenisAktif.filter((j) => !jenis.some((g) => g.id === j.id)).map((j) => ({ ...j, jumlah: 0 }));

    return {
      periode: kodePeriode(periode),
      periodeSekarang: kodePeriode(periodeSekarang(sekarang)),
      kpi: { ...kpi, totalPeriodeSebelumnya: totalSebelumnya },
      trenUnitBulanan: tren,
      sebaranJenis: [...jenis, ...tanpaKegiatan],
      peta,
      perluPerhatian: perhatian,
      akanDatang: mendatang,
      admin: menungguAktivasi == null ? null : { menungguAktivasi },
    };
  },

  // Beranda untuk semua role: kegiatan saya yang perlu dokumentasi, agenda, kegiatan pekan ini, dan ringkasan unit
  async saya(aktor: Aktor, sekarang = new Date()) {
    const milik = { userId: aktor.id, pegawaiId: aktor.pegawaiId };
    const lingkup = await lingkupBaca(aktor);
    const hariIni = tanggalJakarta(sekarang);
    const pekan = { mulai: awalHariJakarta(hariIni), akhir: awalHariJakarta(hariIni, HARI_PEKAN) };
    const [perluDokumentasi, agenda, pekanIni, bulanIni, pegawai] = await Promise.all([
      DashboardRepository.milikTanpaDokumentasi(milik, sekarang, BATAS_DAFTAR),
      DashboardRepository.agendaMilik(milik, sekarang, BATAS_DAFTAR),
      KegiatanRepository.kalender(pekan, lingkup, sekarang, BATAS_PEKAN),
      KegiatanRepository.kalender(rentangPeriode(periodeSekarang(sekarang)), lingkup, sekarang, 1000),
      aktor.pegawaiId == null ? undefined : ReferensiRepository.findPegawaiAktif(aktor.pegawaiId),
    ]);
    const unitIds = lingkup?.unitIds ?? [];
    const unitBulanIni = bulanIni.filter((k) => unitIds.includes(k.unitKerja.id) && k.statusPelaksanaan !== "dibatalkan");
    return {
      hariIni,
      perluDokumentasi,
      agenda,
      pekanIni: pekanIni.filter((k) => k.statusPelaksanaan !== "dibatalkan"),
      unit: pegawai ? { id: pegawai.unitKerjaId, jumlahBulanIni: unitBulanIni.length } : null,
    };
  },
};
