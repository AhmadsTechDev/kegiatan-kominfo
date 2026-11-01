import { t } from "elysia";

// Isian draf selalu teks (bentuk mentah dari formulir) dengan panjang maksimal
const teks = (maks: number) => t.Optional(t.String({ maxLength: maks, error: `Isian draf maksimal ${maks} karakter` }));

const isiDraf = t.Object({
  judul: teks(200),
  jenisId: teks(10),
  uraian: teks(5000),
  jumlahPeserta: teks(6),
  tanggalMulai: teks(10),
  jamMulai: teks(5),
  tanggalSelesai: teks(10),
  jamSelesai: teks(5),
  lokasiNama: teks(255),
  lat: teks(20),
  lng: teks(20),
  refEksternal: teks(255),
});

export const DrafKegiatanValidator = {
  params: t.Object({ id: t.Numeric({ minimum: 1, error: "ID draf tidak valid" }) }),
  simpan: t.Object({ isi: isiDraf }),
};
