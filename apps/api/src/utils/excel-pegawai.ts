import ExcelJS from "exceljs";
import { UnsupportedMediaType, Unprocessable } from "@/lib/errors";
import type { BarisMentah, UnitTemplat } from "@/types/master.types";

export const MAKS_BARIS_IMPOR = 1000;
export const MAKS_UKURAN_IMPOR = 2 * 1024 * 1024;

const ALIAS: Record<keyof Omit<BarisMentah, "baris" | "galatNip">, string[]> = {
  nip: ["nip", "nipbaru", "nip18digit", "nomorindukpegawai"],
  nama: ["nama", "namapegawai", "namalengkap"],
  jabatan: ["jabatan", "namajabatan"],
  unit: ["unitkerja", "unit", "kodeunit", "kodeunitkerja", "bidang", "satuankerja"],
};

// Menyamakan judul kolom: huruf kecil tanpa spasi/tanda baca ("Unit Kerja" -> "unitkerja")
const normal = (teks: string) => teks.toLowerCase().replace(/[^a-z0-9]/g, "");

// Mengambil isi sel Excel sebagai teks (termasuk rich text dan hasil rumus)
function teksSel(sel: ExcelJS.Cell): string {
  const v = sel.value;
  if (v == null) return "";
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("").trim();
    if ("result" in v) return String(v.result ?? "").trim();
    if ("text" in v) return String(v.text).trim();
  }
  return String(v).trim();
}

// Mengambil NIP dari sel; NIP yang tersimpan sebagai angka ditandai galat karena digitnya bisa berubah
function nipSel(sel: ExcelJS.Cell): { nip: string; galat?: string } {
  if (typeof sel.value === "number") {
    return { nip: sel.text, galat: "NIP tersimpan sebagai angka di Excel sehingga digit terakhirnya berubah. Format kolom NIP sebagai Teks lalu ketik ulang" };
  }
  return { nip: teksSel(sel).replace(/[\s'.-]/g, "") };
}

// Membaca berkas Excel impor pegawai: mencari baris judul kolom lalu mengambil setiap baris data
export async function bacaExcelPegawai(berkas: File): Promise<BarisMentah[]> {
  if (berkas.size > MAKS_UKURAN_IMPOR) throw Unprocessable("Berkas maksimal 2 MB");
  const isi = new Uint8Array(await berkas.arrayBuffer());
  if (isi[0] !== 0x50 || isi[1] !== 0x4b) throw UnsupportedMediaType("Gunakan berkas Excel .xlsx (unduh templat bila perlu)");

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(isi.buffer as ArrayBuffer);
  } catch {
    throw UnsupportedMediaType("Berkas Excel tidak dapat dibaca. Simpan ulang sebagai .xlsx");
  }
  const ws = wb.worksheets[0];
  if (!ws) throw Unprocessable("Berkas Excel tidak memiliki lembar kerja");

  let kolom: Partial<Record<keyof typeof ALIAS, number>> = {};
  let barisJudul = 0;
  for (let r = 1; r <= Math.min(10, ws.rowCount) && !barisJudul; r++) {
    const temu: typeof kolom = {};
    ws.getRow(r).eachCell((sel, c) => {
      const n = normal(teksSel(sel));
      for (const [k, alias] of Object.entries(ALIAS)) if (alias.includes(n) && !temu[k as keyof typeof ALIAS]) temu[k as keyof typeof ALIAS] = c;
    });
    if (temu.nama && (temu.nip || temu.unit)) {
      kolom = temu;
      barisJudul = r;
    }
  }
  if (!barisJudul) throw Unprocessable("Kolom Nama tidak ditemukan. Gunakan templat atau pastikan baris judul berisi NIP, Nama, Unit kerja");
  if (!kolom.unit) throw Unprocessable("Kolom Unit kerja tidak ditemukan. Isi dengan kode atau nama unit kerja");

  const hasil: BarisMentah[] = [];
  for (let r = barisJudul + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const { nip, galat } = kolom.nip ? nipSel(row.getCell(kolom.nip)) : { nip: "", galat: undefined };
    const nama = teksSel(row.getCell(kolom.nama!));
    const jabatan = kolom.jabatan ? teksSel(row.getCell(kolom.jabatan)) : "";
    const unit = teksSel(row.getCell(kolom.unit));
    if (!nip && !nama && !unit) continue;
    hasil.push({ baris: r, nip, nama, jabatan, unit, galatNip: galat });
    if (hasil.length > MAKS_BARIS_IMPOR) throw Unprocessable(`Maksimal ${MAKS_BARIS_IMPOR} pegawai per impor. Bagi berkas menjadi beberapa bagian`);
  }
  if (!hasil.length) throw Unprocessable("Tidak ada baris data di bawah judul kolom");
  return hasil;
}

const NAVY = "FF1A2A6E";
const TEAL = "FF0D9488";
const ABU_GARIS = "FFD5DBE8";
const ZEBRA = "FFF6F8FC";
const KUNING = "FFFEF3C7";
const PUTIH = "FFFFFFFF";

// Isian warna latar sel
const isi = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const garis: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: ABU_GARIS } },
  bottom: { style: "thin", color: { argb: ABU_GARIS } },
  left: { style: "thin", color: { argb: ABU_GARIS } },
  right: { style: "thin", color: { argb: ABU_GARIS } },
};

// Menulis baris judul lebar (sel digabung) di bagian atas lembar
function judulLembar(ws: ExcelJS.Worksheet, baris: number, kolomAkhir: string, teks: string, gaya: { ukuran: number; latar: string; warna?: string; tinggi: number; miring?: boolean }) {
  ws.mergeCells(`A${baris}:${kolomAkhir}${baris}`);
  const sel = ws.getCell(`A${baris}`);
  sel.value = teks;
  sel.font = { name: "Calibri", size: gaya.ukuran, bold: !gaya.miring, italic: gaya.miring, color: { argb: gaya.warna ?? PUTIH } };
  sel.fill = isi(gaya.latar);
  sel.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
  ws.getRow(baris).height = gaya.tinggi;
}

// Memberi gaya baris kepala tabel (latar biru tua, huruf putih tebal)
function kepalaTabel(row: ExcelJS.Row) {
  row.height = 26;
  row.eachCell((sel) => {
    sel.font = { bold: true, color: { argb: PUTIH } };
    sel.fill = isi(NAVY);
    sel.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    sel.border = garis;
  });
}

const BARIS_KEPALA = 5;
const BARIS_BERGAYA = 200;

// Membuat berkas templat impor pegawai (lembar Pegawai, Petunjuk, dan Daftar unit kerja)
export async function buatTemplatPegawai(unit: UnitTemplat[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Aplikasi Pendataan Kegiatan Diskominfo Kota Palembang";
  wb.title = "Templat impor pegawai";
  const akhirUnit = unit.length + 1;

  const ws = wb.addWorksheet("Pegawai", {
    views: [{ state: "frozen", ySplit: BARIS_KEPALA, showGridLines: false }],
    properties: { tabColor: { argb: NAVY } },
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  ws.columns = [
    { key: "nip", width: 24, style: { numFmt: "@" } },
    { key: "nama", width: 38 },
    { key: "unit", width: 52 },
  ];
  judulLembar(ws, 1, "C", "TEMPLAT IMPOR PEGAWAI", { ukuran: 16, latar: NAVY, tinggi: 32 });
  judulLembar(ws, 2, "C", "Dinas Komunikasi dan Informatika Kota Palembang · Aplikasi Pendataan Kegiatan", { ukuran: 10, latar: TEAL, tinggi: 20 });
  judulLembar(ws, 3, "C", "Isi mulai baris 6, satu pegawai per baris. Kolom bertanda * wajib diisi. Baca lembar Petunjuk bila ragu.", {
    ukuran: 10,
    latar: KUNING,
    warna: "FF92400E",
    tinggi: 22,
    miring: true,
  });
  ws.getRow(4).height = 6;
  const kepala = ws.getRow(BARIS_KEPALA);
  kepala.values = ["NIP", "Nama lengkap *", "Unit kerja *"];
  kepalaTabel(kepala);

  for (let i = 0; i < BARIS_BERGAYA; i++) {
    const row = ws.getRow(BARIS_KEPALA + 1 + i);
    row.height = 20;
    for (let c = 1; c <= 3; c++) {
      const sel = row.getCell(c);
      sel.border = garis;
      sel.alignment = { vertical: "middle", indent: 1 };
      if (i % 2 === 1) sel.fill = isi(ZEBRA);
    }
  }

  for (let r = BARIS_KEPALA + 1; r <= BARIS_KEPALA + MAKS_BARIS_IMPOR; r++) {
    ws.getCell(`A${r}`).dataValidation = {
      type: "custom",
      allowBlank: true,
      formulae: [`OR(A${r}="",AND(LEN(SUBSTITUTE(A${r}," ",""))=18,ISNUMBER(--SUBSTITUTE(A${r}," ",""))))`],
      showInputMessage: true,
      promptTitle: "NIP",
      prompt: "18 digit angka. Kosongkan untuk pegawai non-ASN (honorer).",
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "NIP tidak 18 digit",
      error: "NIP biasanya 18 digit angka. Periksa kembali, atau kosongkan bila pegawai tidak punya NIP.",
    };
    ws.getCell(`B${r}`).dataValidation = {
      type: "textLength",
      operator: "lessThanOrEqual",
      allowBlank: true,
      formulae: [150],
      showInputMessage: true,
      promptTitle: "Nama lengkap",
      prompt: "Nama pegawai seperti di data kepegawaian.",
      showErrorMessage: true,
      errorTitle: "Nama terlalu panjang",
      error: "Nama maksimal 150 karakter.",
    };
    if (unit.length) {
      ws.getCell(`C${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`'Daftar unit kerja'!$A$2:$A$${akhirUnit}`],
        showInputMessage: true,
        promptTitle: "Unit kerja",
        prompt: "Pilih dari daftar. Pilih sub bagian atau seksi bila pegawai bertugas di sana.",
        showErrorMessage: false,
      };
    }
  }

  const pt = wb.addWorksheet("Petunjuk", { views: [{ showGridLines: false }], properties: { tabColor: { argb: TEAL } } });
  pt.columns = [{ width: 22 }, { width: 10 }, { width: 62 }, { width: 34 }];
  judulLembar(pt, 1, "D", "PETUNJUK PENGISIAN", { ukuran: 16, latar: NAVY, tinggi: 32 });
  pt.getRow(2).height = 8;
  const langkah = [
    'Isi data di lembar "Pegawai" mulai baris 6, satu pegawai per baris. Baris kosong dilewati. Nomor baris di pratinjau impor sama dengan nomor baris Excel.',
    "NIP boleh dikosongkan untuk pegawai non-ASN (honorer). NIP berspasi dari data kepegawaian tetap diterima.",
    "Pilih Unit kerja dari daftar turun. Pilih nama sub bagian atau seksi bila pegawai bertugas di sana; pilih bidang atau sekretariat bila langsung di bawahnya.",
    "Simpan sebagai .xlsx, lalu unggah di Master data, tab Pegawai, tombol Impor Excel. Periksa pratinjau sebelum menekan Impor.",
    "NIP yang sudah terdaftar akan diperbarui, bukan diduplikasi. Pegawai tanpa NIP dicocokkan lewat nama.",
  ];
  langkah.forEach((t, i) => {
    const r = 3 + i;
    pt.mergeCells(`B${r}:D${r}`);
    pt.getCell(`A${r}`).value = `Langkah ${i + 1}`;
    pt.getCell(`A${r}`).font = { bold: true, color: { argb: NAVY } };
    pt.getCell(`B${r}`).value = t;
    pt.getCell(`B${r}`).alignment = { wrapText: true, vertical: "middle" };
    pt.getCell(`A${r}`).alignment = { vertical: "middle", indent: 1 };
    pt.getRow(r).height = 32;
  });

  const awalKolom = 3 + langkah.length + 1;
  pt.getRow(awalKolom).values = ["Kolom", "Wajib", "Keterangan", "Contoh"];
  kepalaTabel(pt.getRow(awalKolom));
  const kolom = [
    ["NIP", "Tidak", "18 digit angka sesuai data kepegawaian. Kosongkan bila non-ASN.", "198702152011012002"],
    ["Nama lengkap", "Ya", "Nama pegawai, maksimal 150 karakter.", "Andi Saputra"],
    ["Unit kerja", "Ya", "Nama atau kode unit dari lembar Daftar unit kerja.", unit.find((u) => u.induk)?.nama ?? unit[0]?.nama ?? ""],
  ];
  kolom.forEach((v, i) => {
    const row = pt.getRow(awalKolom + 1 + i);
    row.values = v;
    row.height = 22;
    row.eachCell((sel, c) => {
      sel.border = garis;
      sel.alignment = { vertical: "middle", wrapText: true, indent: 1 };
      if (c === 4) sel.font = { italic: true, color: { argb: "FF5B6785" } };
      if (c === 1) sel.font = { bold: true };
    });
    row.getCell(4).numFmt = "@";
  });

  const du = wb.addWorksheet("Daftar unit kerja", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: false }],
    properties: { tabColor: { argb: "FF64748B" } },
  });
  du.columns = [
    { header: "Unit kerja", key: "nama", width: 52 },
    { header: "Di bawah", key: "induk", width: 46 },
    { header: "Kode", key: "kode", width: 16 },
  ];
  kepalaTabel(du.getRow(1));
  unit.forEach((u, i) => {
    const row = du.addRow({ nama: u.nama, induk: u.induk ?? "-", kode: u.kode });
    row.height = 20;
    row.eachCell((sel, c) => {
      sel.border = garis;
      sel.alignment = { vertical: "middle", indent: c === 1 && u.induk ? 3 : 1 };
      if (i % 2 === 1) sel.fill = isi(ZEBRA);
      if (c === 1 && !u.induk) sel.font = { bold: true };
      if (c > 1) sel.font = { color: { argb: "FF5B6785" } };
    });
  });
  du.autoFilter = { from: "A1", to: `C${akhirUnit}` };

  return Buffer.from(await wb.xlsx.writeBuffer());
}
