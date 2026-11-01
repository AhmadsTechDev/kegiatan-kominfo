import ExcelJS from "exceljs";
import type { BarisEkspor, InfoEkspor } from "@/types/ekspor.types";
import { LABEL_STATUS, formatWaktu } from "./format-waktu";
import { geserKeWib } from "./periode";

const FORMAT_WAKTU = "dd/mm/yyyy hh:mm";

// Membuat berkas Excel rekap kegiatan (lembar Kegiatan + lembar Keterangan)
export async function buatExcel(baris: BarisEkspor[], info: InfoEkspor) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Aplikasi Pendataan Kegiatan Diskominfo Kota Palembang";
  wb.created = info.dibuatPada;

  const ws = wb.addWorksheet("Kegiatan", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Judul", key: "judul", width: 42 },
    { header: "Jenis", key: "jenis", width: 22 },
    { header: "Unit kerja", key: "unitKerja", width: 30 },
    { header: "Penanggung jawab", key: "penanggungJawab", width: 26 },
    { header: "Mulai (WIB)", key: "tglMulai", width: 18, style: { numFmt: FORMAT_WAKTU } },
    { header: "Selesai (WIB)", key: "tglSelesai", width: 18, style: { numFmt: FORMAT_WAKTU } },
    { header: "Status", key: "status", width: 14 },
    { header: "Lokasi", key: "lokasiNama", width: 30 },
    { header: "Lintang", key: "lat", width: 12 },
    { header: "Bujur", key: "lng", width: 12 },
    { header: "Jumlah peserta", key: "jumlahPeserta", width: 15 },
    { header: "Uraian", key: "uraian", width: 50 },
    { header: "Hasil", key: "hasil", width: 50 },
    { header: "Alasan batal", key: "alasanBatal", width: 30 },
    { header: "Nomor referensi", key: "refEksternal", width: 20 },
  ];

  for (const b of baris) {
    ws.addRow({
      id: b.id,
      judul: b.judul,
      jenis: b.jenis,
      unitKerja: b.unitKerja,
      penanggungJawab: b.penanggungJawab,
      tglMulai: geserKeWib(b.tglMulai),
      tglSelesai: geserKeWib(b.tglSelesai),
      status: LABEL_STATUS[b.statusPelaksanaan],
      lokasiNama: b.lokasiNama,
      lat: b.lat,
      lng: b.lng,
      jumlahPeserta: b.jumlahPeserta,
      uraian: b.uraian,
      hasil: b.hasil,
      alasanBatal: b.alasanBatal,
      refEksternal: b.refEksternal,
    });
  }

  const kepala = ws.getRow(1);
  kepala.font = { bold: true, color: { argb: "FFFFFFFF" } };
  kepala.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F2A4A" } };
  kepala.alignment = { vertical: "middle" };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };

  const ket = wb.addWorksheet("Keterangan");
  ket.columns = [{ width: 22 }, { width: 80 }];
  ket.addRows([
    ["Laporan", "Rekap kegiatan Dinas Komunikasi dan Informatika Kota Palembang"],
    ["Filter", info.filter.join(" · ")],
    ["Jumlah kegiatan", baris.length],
    ["Dibuat oleh", info.dibuatOleh],
    ["Dibuat pada", formatWaktu(info.dibuatPada)],
    ["Catatan", "Status pelaksanaan dihitung aplikasi saat berkas dibuat. Kegiatan yang dihapus tidak disertakan."],
  ]);
  ket.getColumn(1).font = { bold: true };

  return Buffer.from(await wb.xlsx.writeBuffer());
}
