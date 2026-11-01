import { Unprocessable } from "@/lib/errors";
import { ReferensiRepository } from "@/repositories/referensi.repository";
import { RekapRepository } from "@/repositories/rekap.repository";
import type { Jumlah, RekapPeriodeQuery, Unit } from "@/types/rekap.types";
import type { Aktor, SatuanRekap } from "@/types/umum.types";
import { geserKeWib, kodePeriode, periodeSekarang, tanggalJakarta } from "@/utils/periode";
import { hitungStatus } from "@/utils/status-kegiatan";
import { filterDariQuery } from "./kegiatan.service";
import { cariIndukTertinggi } from "./referensi.service";

export const MAKS_TITIK_TREN = 400;

const KOLOM_JUMLAH = ["total", "akanDatang", "berlangsung", "selesai", "dibatalkan", "peserta"] as const;
const KOLOM_STATUS = { akan_datang: "akanDatang", berlangsung: "berlangsung", selesai: "selesai", dibatalkan: "dibatalkan" } as const;

type BarisRekap = Awaited<ReturnType<typeof RekapRepository.barisRekap>>[number];

// Objek jumlah yang semua angkanya nol
const kosong = (): Jumlah => ({ total: 0, akanDatang: 0, berlangsung: 0, selesai: 0, dibatalkan: 0, peserta: 0 });

// Menambahkan angka-angka `dari` ke `ke`
function tambah(ke: Jumlah, dari: Jumlah) {
  for (const k of KOLOM_JUMLAH) ke[k] += dari[k];
}

// Memotong tanggal "YYYY-MM-DD" sesuai satuan: hari utuh, "YYYY-MM", atau "YYYY"
const potong = (tanggal: string, satuan: SatuanRekap) => tanggal.slice(0, satuan === "hari" ? 10 : satuan === "bulan" ? 7 : 4);

// Tanggal terakhir dari bulan "YYYY-MM"
function akhirBulan(periode: string) {
  const [t, b] = periode.split("-").map(Number);
  return new Date(Date.UTC(t!, b!, 0)).toISOString().slice(0, 10);
}

// Kunci periode berikutnya: hari/bulan/tahun setelah `kunci`
export function kunciBerikutnya(kunci: string, satuan: SatuanRekap) {
  if (satuan === "tahun") return String(Number(kunci) + 1);
  const [t, b, h] = kunci.split("-").map(Number);
  if (satuan === "bulan") return new Date(Date.UTC(t!, b!, 1)).toISOString().slice(0, 7);
  return new Date(Date.UTC(t!, b! - 1, h! + 1)).toISOString().slice(0, 10);
}

// Mengisi tren dari awal sampai akhir; periode tanpa kegiatan tetap muncul dengan jumlah 0
export function isiTren(data: { kunci: string; jumlah: number }[], awal: string, akhir: string, satuan: SatuanRekap) {
  const peta = new Map(data.map((d) => [d.kunci, d.jumlah]));
  const hasil: { periode: string; jumlah: number }[] = [];
  for (let k = awal; k <= akhir; k = kunciBerikutnya(k, satuan)) {
    if (hasil.length >= MAKS_TITIK_TREN) {
      throw Unprocessable(`Rentang terlalu panjang untuk rekap per ${satuan}. Persempit tanggal atau pilih satuan yang lebih besar.`);
    }
    hasil.push({ periode: k, jumlah: peta.get(k) ?? 0 });
  }
  return hasil;
}

// Menjumlahkan kegiatan per unit kerja, termasuk per status pelaksanaan dan total peserta
function hitungPerUnit(baris: BarisRekap[], sekarang: Date) {
  const peta = new Map<number, Jumlah>();
  for (const k of baris) {
    const j = peta.get(k.unitKerjaId) ?? kosong();
    j.total++;
    j[KOLOM_STATUS[hitungStatus(k, sekarang)]]++;
    j.peserta += k.jumlahPeserta ?? 0;
    peta.set(k.unitKerjaId, j);
  }
  return [...peta.entries()].map(([unitKerjaId, j]) => ({ unitKerjaId, ...j }));
}

// Menjumlahkan kegiatan per periode (kunci tanggal WIB), urut naik
function hitungPerPeriode(baris: BarisRekap[], satuan: SatuanRekap) {
  const peta = new Map<string, number>();
  for (const k of baris) {
    const kunci = potong(geserKeWib(k.tglMulai).toISOString(), satuan);
    peta.set(kunci, (peta.get(kunci) ?? 0) + 1);
  }
  return [...peta.entries()].map(([kunci, jumlah]) => ({ kunci, jumlah })).sort((a, b) => a.kunci.localeCompare(b.kunci));
}

// Menjumlahkan kegiatan per penanggung jawab, terbanyak di atas
function hitungPerPegawai(baris: BarisRekap[]) {
  const peta = new Map<number, { id: number; nama: string; unitKerja: string; jumlah: number }>();
  for (const { penanggungJawab: p } of baris) {
    const j = peta.get(p.id) ?? { id: p.id, nama: p.nama, unitKerja: p.unitKerja.nama, jumlah: 0 };
    j.jumlah++;
    peta.set(p.id, j);
  }
  return [...peta.values()].sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama));
}

// Menjumlahkan kegiatan per jenis, terbanyak di atas
function hitungPerJenis(baris: BarisRekap[]) {
  const peta = new Map<number, { id: number; nama: string; jumlah: number }>();
  for (const { jenis } of baris) {
    const j = peta.get(jenis.id) ?? { id: jenis.id, nama: jenis.nama, jumlah: 0 };
    j.jumlah++;
    peta.set(jenis.id, j);
  }
  return [...peta.values()].sort((a, b) => b.jumlah - a.jumlah);
}

export const RekapService = {
  // Rekap kegiatan: total, tren per periode, per pegawai, per unit induk, dan per jenis
  async rekap({ satuan = "bulan", ...query }: RekapPeriodeQuery, aktor: Aktor, sekarang = new Date()) {
    const filter = await filterDariQuery(query, aktor);
    const [baris, unit] = await Promise.all([RekapRepository.barisRekap(filter, sekarang), ReferensiRepository.semuaUnitKerja()]);
    const perUnit = hitungPerUnit(baris, sekarang);
    const perPeriode = hitungPerPeriode(baris, satuan);

    // Tren: rentangnya dari filter tanggal/periode; bila tidak ada filter, dari data pertama sampai terakhir
    const hariIni = tanggalJakarta(sekarang);
    const awalFilter = query.dari ?? (query.periode && !query.sampai ? `${query.periode}-01` : undefined);
    const akhirFilter = query.sampai ?? (query.periode && !query.dari ? akhirBulan(query.periode) : undefined);
    const awal = awalFilter ? potong(awalFilter, satuan) : (perPeriode[0]?.kunci ?? potong(hariIni, satuan));
    const akhir = akhirFilter ? potong(akhirFilter, satuan) : (perPeriode.at(-1)?.kunci ?? potong(hariIni, satuan));
    const tren = awalFilter || akhirFilter || perPeriode.length > 0 ? isiTren(perPeriode, awal, akhir, satuan) : [];

    // Per unit: PEGAWAI melihat per unit sendiri; selain itu digabung ke unit induk tertinggi
    const barisUnit = new Map<number, { unit: { id: number; kode: string; nama: string } } & Jumlah>();
    const ambilBaris = (u: Unit) => {
      if (!barisUnit.has(u.id)) barisUnit.set(u.id, { unit: { id: u.id, kode: u.kode, nama: u.nama }, ...kosong() });
      return barisUnit.get(u.id)!;
    };
    if (!filter.unitIds && !filter.lingkup) for (const u of unit) if (u.parentId == null && u.aktif) ambilBaris(u);

    const total = kosong();
    for (const r of perUnit) {
      const induk = filter.lingkup ? unit.find((u) => u.id === r.unitKerjaId) : cariIndukTertinggi(unit, r.unitKerjaId);
      if (induk) tambah(ambilBaris(induk), r);
      tambah(total, r);
    }

    return {
      periodeSekarang: kodePeriode(periodeSekarang(sekarang)),
      satuan,
      total,
      tren,
      perPegawai: hitungPerPegawai(baris),
      perUnit: [...barisUnit.values()].sort((a, b) => b.total - a.total || a.unit.nama.localeCompare(b.unit.nama, "id")),
      perJenis: hitungPerJenis(baris),
    };
  },
};
