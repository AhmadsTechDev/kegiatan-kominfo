import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { BarisEkspor, InfoEkspor } from "@/types/ekspor.types";
import type { StatusPelaksanaan } from "@/types/umum.types";
import { formatRentang } from "./format-waktu";

export const KOP = {
  pemerintah: "PEMERINTAH KOTA PALEMBANG",
  dinas: "DINAS KOMUNIKASI DAN INFORMATIKA",
  alamat: [
    "Jalan Nyoman Ratu No. 1271 Palembang, Provinsi Sumatera Selatan 30129",
    "Telp. (0711) 352271, Faksimile (0711) 353262",
    "Laman : www.kominfo.palembang.go.id  Pos El : kominfo@palembang.go.id",
  ],
};

const LOGO = { data: readFileSync(join(import.meta.dir, "../../assets/logo-palembang.png")), format: "png" as const };

Font.registerHyphenationCallback((kata) => [kata]);

const NAVY = "#0f2a4a";
const ABU = "#64748b";
const GARIS = "#cbd5e1";

/**
 * KONSEP @react-pdf/renderer: PDF disusun dengan komponen mirip React (Document, Page, View, Text),
 * lalu diubah menjadi berkas PDF di server. Tata letaknya memakai StyleSheet dengan aturan mirip CSS (flexbox),
 * dan ukuran dalam satuan "pt" (1/72 inci). File ini berekstensi .tsx karena memakai sintaks JSX.
 */
const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 28, paddingHorizontal: 32, fontSize: 8.5, fontFamily: "Helvetica", color: "#0f172a" },
  kop: { flexDirection: "row", alignItems: "center", paddingBottom: 8 },
  logo: { width: 72, height: 80 },
  kopTeks: { flex: 1, alignItems: "center", marginRight: 72, color: "#000" },
  kopPemerintah: { fontSize: 14 },
  kopDinas: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 1 },
  kopAlamat: { fontSize: 8.5, marginTop: 1.5 },
  garisKop: { borderBottomWidth: 3, borderBottomColor: "#000", marginBottom: 12 },
  judul: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center" },
  subjudul: { fontSize: 9.5, textAlign: "center", marginTop: 3, marginBottom: 12 },
  baris: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: GARIS },
  kepala: { flexDirection: "row", backgroundColor: NAVY, color: "#fff", fontFamily: "Helvetica-Bold" },
  sel: { paddingVertical: 4, paddingHorizontal: 4 },
  kecil: { fontSize: 7.5, color: ABU, marginTop: 1 },
  kosong: { padding: 16, textAlign: "center", color: ABU },
});

export const KOLOM = [
  { judul: "No", lebar: "4%" },
  { judul: "Kegiatan", lebar: "31%" },
  { judul: "Jenis", lebar: "12%" },
  { judul: "Bidang", lebar: "17%" },
  { judul: "Penanggung jawab", lebar: "13%" },
  { judul: "Waktu (WIB)", lebar: "17%" },
  { judul: "Peserta", lebar: "6%" },
] as const;

export const JUDUL_LAPORAN = "REKAP KEGIATAN";

/**
 * Teks di bawah judul laporan: rentang waktu yang direkap
 */
export const subjudul = (info: InfoEkspor) => `Periode ${info.periode}`;

/**
 * Isi teks setiap sel tabel untuk satu kegiatan (dipakai PDF dan pratinjau di frontend)
 */
export function isiSel(b: BarisEkspor) {
  return {
    judul: b.judul,
    lokasi: b.lokasiNama,
    jenis: b.jenis,
    bidang: b.bidang,
    penanggungJawab: b.penanggungJawab,
    waktu: formatRentang(b.tglMulai, b.tglSelesai),
    peserta: b.jumlahPeserta == null ? "–" : b.jumlahPeserta.toLocaleString("id-ID"),
  };
}

/**
 * Komponen dokumen PDF laporan (A4 mendatar, berkop dinas)
 *
 * Komponen dokumen PDF: kop dinas, judul, periode, lalu tabel kegiatan.
 * Elemen dengan `fixed` (kepala tabel) diulang otomatis di setiap halaman, dan `wrap={false}` menjaga
 * satu baris kegiatan tidak terpotong di antara dua halaman.
 * @param baris kegiatan yang masuk laporan
 * @param info periode dan pembuat laporan
 */
function Laporan({ baris, info }: { baris: BarisEkspor[]; info: InfoEkspor }) {
  const sel = (i: number) => [s.sel, { width: KOLOM[i]!.lebar }];

  return (
    <Document title="Rekap Kegiatan Diskominfo Kota Palembang" author={info.dibuatOleh} creator="Aplikasi Pendataan Kegiatan">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.kop}>
          <Image src={LOGO} style={s.logo} />
          <View style={s.kopTeks}>
            <Text style={s.kopPemerintah}>{KOP.pemerintah}</Text>
            <Text style={s.kopDinas}>{KOP.dinas}</Text>
            {KOP.alamat.map((baris, i) => (
              <Text key={baris} style={i === 0 ? [s.kopAlamat, { marginTop: 3 }] : s.kopAlamat}>
                {baris}
              </Text>
            ))}
          </View>
        </View>
        <View style={s.garisKop} />

        <Text style={s.judul}>{JUDUL_LAPORAN}</Text>
        <Text style={s.subjudul}>{subjudul(info)}</Text>

        <View style={s.kepala} fixed>
          {KOLOM.map((k, i) => (
            <Text key={k.judul} style={sel(i)}>
              {k.judul}
            </Text>
          ))}
        </View>
        {baris.length === 0 && <Text style={s.kosong}>Tidak ada kegiatan yang sesuai filter.</Text>}
        {baris.map((b, n) => {
          const isi = isiSel(b);
          return (
            <View key={b.id} style={s.baris} wrap={false}>
              <Text style={sel(0)}>{n + 1}</Text>
              <View style={sel(1)}>
                <Text>{isi.judul}</Text>
                {isi.lokasi && <Text style={s.kecil}>{isi.lokasi}</Text>}
              </View>
              <Text style={sel(2)}>{isi.jenis}</Text>
              <Text style={sel(3)}>{isi.bidang}</Text>
              <Text style={sel(4)}>{isi.penanggungJawab}</Text>
              <Text style={sel(5)}>{isi.waktu}</Text>
              <Text style={sel(6)}>{isi.peserta}</Text>
            </View>
          );
        })}
      </Page>
    </Document>
  );
}

/**
 * Membuat berkas PDF rekap kegiatan
 *
 * @returns Promise berisi isi berkas PDF (Buffer) yang siap dikirim sebagai unduhan
 */
export function buatPdf(baris: BarisEkspor[], info: InfoEkspor) {
  return renderToBuffer(<Laporan baris={baris} info={info} />);
}
