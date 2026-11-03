import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { BarisEkspor, InfoEkspor } from "@/types/ekspor.types";
import type { StatusPelaksanaan } from "@/types/umum.types";
import { LABEL_STATUS, formatRentang, formatWaktu } from "./format-waktu";

export const KOP = {
  pemerintah: "PEMERINTAH KOTA PALEMBANG",
  dinas: "DINAS KOMUNIKASI DAN INFORMATIKA",
  alamat: null as string | null,
};

const LOGO = { data: readFileSync(join(import.meta.dir, "../../assets/logo-palembang.png")), format: "png" as const };

Font.registerHyphenationCallback((kata) => [kata]);

const NAVY = "#0f2a4a";
const ABU = "#64748b";
const GARIS = "#cbd5e1";

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 40, paddingHorizontal: 32, fontSize: 8.5, fontFamily: "Helvetica", color: "#0f172a" },
  kop: { flexDirection: "row", alignItems: "center", paddingBottom: 8 },
  logo: { width: 46, height: 51 },
  kopTeks: { flex: 1, alignItems: "center", marginRight: 46 },
  kopPemerintah: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  kopDinas: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 2 },
  kopAlamat: { fontSize: 8, color: ABU, marginTop: 2 },
  garisTebal: { borderBottomWidth: 2, borderBottomColor: "#000" },
  garisTipis: { borderBottomWidth: 0.6, borderBottomColor: "#000", marginTop: 1.5, marginBottom: 12 },
  judul: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center" },
  subjudul: { fontSize: 9, textAlign: "center", color: ABU, marginTop: 3, marginBottom: 10 },
  ringkasan: { flexDirection: "row", marginBottom: 10, gap: 6 },
  kotak: { flex: 1, borderWidth: 0.6, borderColor: GARIS, borderRadius: 3, padding: 6 },
  kotakLabel: { fontSize: 7.5, color: ABU },
  kotakNilai: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 2 },
  baris: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: GARIS },
  kepala: { flexDirection: "row", backgroundColor: NAVY, color: "#fff", fontFamily: "Helvetica-Bold" },
  sel: { paddingVertical: 4, paddingHorizontal: 4 },
  kecil: { fontSize: 7.5, color: ABU, marginTop: 1 },
  kosong: { padding: 16, textAlign: "center", color: ABU },
  kaki: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: ABU,
  },
});

export const KOLOM = [
  { judul: "No", lebar: "4%" },
  { judul: "Kegiatan", lebar: "27%" },
  { judul: "Jenis", lebar: "12%" },
  { judul: "Bidang", lebar: "15%" },
  { judul: "Penanggung jawab", lebar: "13%" },
  { judul: "Waktu (WIB)", lebar: "15%" },
  { judul: "Peserta", lebar: "6%" },
  { judul: "Status", lebar: "8%" },
] as const;

const URUTAN_STATUS: StatusPelaksanaan[] = ["akan_datang", "berlangsung", "selesai", "dibatalkan"];

export const JUDUL_LAPORAN = "REKAP KEGIATAN";

// Teks di bawah judul laporan: uraian filter yang dipakai
export const subjudul = (info: InfoEkspor) => info.filter.join("  ·  ");

// Teks di kaki halaman: siapa yang mencetak dan kapan
export const teksKaki = (info: InfoEkspor) => `Dicetak oleh ${info.dibuatOleh} pada ${formatWaktu(info.dibuatPada)}`;

// Kotak ringkasan di atas tabel: total kegiatan dan jumlah per status
export function ringkasanStatus(baris: BarisEkspor[]) {
  return [
    { label: "Total kegiatan", nilai: baris.length },
    ...URUTAN_STATUS.map((st) => ({ label: LABEL_STATUS[st], nilai: baris.filter((b) => b.statusPelaksanaan === st).length })),
  ];
}

// Isi teks setiap sel tabel untuk satu kegiatan (dipakai PDF dan pratinjau di frontend)
export function isiSel(b: BarisEkspor) {
  return {
    judul: b.judul,
    lokasi: b.lokasiNama,
    jenis: b.jenis,
    bidang: b.bidang,
    penanggungJawab: b.penanggungJawab,
    waktu: formatRentang(b.tglMulai, b.tglSelesai),
    peserta: b.jumlahPeserta == null ? "–" : b.jumlahPeserta.toLocaleString("id-ID"),
    status: LABEL_STATUS[b.statusPelaksanaan],
  };
}

// Komponen dokumen PDF laporan (A4 mendatar, berkop dinas)
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
            {KOP.alamat && <Text style={s.kopAlamat}>{KOP.alamat}</Text>}
          </View>
        </View>
        <View style={s.garisTebal} />
        <View style={s.garisTipis} />

        <Text style={s.judul}>{JUDUL_LAPORAN}</Text>
        <Text style={s.subjudul}>{subjudul(info)}</Text>

        <View style={s.ringkasan}>
          {ringkasanStatus(baris).map((r) => (
            <View key={r.label} style={s.kotak}>
              <Text style={s.kotakLabel}>{r.label}</Text>
              <Text style={s.kotakNilai}>{r.nilai.toLocaleString("id-ID")}</Text>
            </View>
          ))}
        </View>

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
              <Text style={sel(7)}>{isi.status}</Text>
            </View>
          );
        })}

        <View style={s.kaki} fixed>
          <Text>{teksKaki(info)}</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// Membuat berkas PDF rekap kegiatan
export function buatPdf(baris: BarisEkspor[], info: InfoEkspor) {
  return renderToBuffer(<Laporan baris={baris} info={info} />);
}
