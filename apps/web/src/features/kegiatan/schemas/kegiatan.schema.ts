import { z } from "zod";
import type { IsiDraf, KegiatanDetail, KegiatanPayload } from "../types";

// Skema Zod formulir kegiatan dan konversi antara formulir, payload API, dan draf

const JAM = /^([01]\d|2[0-3]):[0-5]\d$/;
const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;

export const keIsoWib = (tanggal: string, jam: string) => `${tanggal}T${jam}:00+07:00`;

export function bagianWib(iso: string) {
  const wib = new Date(new Date(iso).getTime() + OFFSET_WIB_MS).toISOString();
  return { tanggal: wib.slice(0, 10), jam: wib.slice(11, 16) };
}

const angkaOpsional = (teks: string) => (teks.trim() === "" ? null : Number(teks.replace(",", ".")));

export const kegiatanSchema = z
  .object({
    judul: z.string().trim().min(1, "Judul wajib diisi").max(200, "Judul maksimal 200 karakter"),
    jenisId: z.string().min(1, "Jenis kegiatan wajib dipilih"),
    penanggungJawabId: z.string().min(1, "Penanggung jawab wajib dipilih"),
    uraian: z.string().max(5000, "Uraian maksimal 5.000 karakter"),
    hasil: z.string().max(5000, "Hasil maksimal 5.000 karakter"),
    jumlahPeserta: z.string().regex(/^\d{0,6}$/, "Jumlah peserta harus berupa angka bulat"),
    tanggalMulai: z.string().min(1, "Tanggal mulai wajib diisi"),
    jamMulai: z.string().regex(JAM, "Jam mulai wajib diisi"),
    tanggalSelesai: z.string().min(1, "Tanggal selesai wajib diisi"),
    jamSelesai: z.string().regex(JAM, "Jam selesai wajib diisi"),
    lokasiNama: z.string().max(255, "Nama lokasi maksimal 255 karakter"),
    lat: z.string(),
    lng: z.string(),
    refEksternal: z.string().max(255, "Nomor surat maksimal 255 karakter"),
  })
  .superRefine((v, ctx) => {
    if (v.tanggalMulai && v.tanggalSelesai && JAM.test(v.jamMulai) && JAM.test(v.jamSelesai)) {
      const mulai = new Date(keIsoWib(v.tanggalMulai, v.jamMulai));
      const selesai = new Date(keIsoWib(v.tanggalSelesai, v.jamSelesai));
      if (selesai < mulai) {
        ctx.addIssue({ code: "custom", path: ["tanggalSelesai"], message: "Tanggal selesai tidak boleh sebelum tanggal mulai" });
      }
    }

    const lat = angkaOpsional(v.lat);
    const lng = angkaOpsional(v.lng);
    if (lat !== null && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
      ctx.addIssue({ code: "custom", path: ["lat"], message: "Lintang harus angka antara -90 dan 90" });
    }
    if (lng !== null && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
      ctx.addIssue({ code: "custom", path: ["lng"], message: "Bujur harus angka antara -180 dan 180" });
    }
    if ((lat === null) !== (lng === null)) {
      ctx.addIssue({ code: "custom", path: [lat === null ? "lat" : "lng"], message: "Lintang dan bujur harus diisi berpasangan" });
    }
  });

export type KegiatanFormValues = z.infer<typeof kegiatanSchema>;

export const KOLOM_SERVER: Record<string, keyof KegiatanFormValues> = {
  judul: "judul",
  jenisId: "jenisId",
  penanggungJawabId: "penanggungJawabId",
  uraian: "uraian",
  hasil: "hasil",
  jumlahPeserta: "jumlahPeserta",
  tglMulai: "tanggalMulai",
  tglSelesai: "tanggalSelesai",
  lokasiNama: "lokasiNama",
  lat: "lat",
  lng: "lng",
  refEksternal: "refEksternal",
};

const teksAtauNull = (teks: string) => (teks.trim() === "" ? null : teks.trim());

export function keKegiatanPayload(v: KegiatanFormValues): KegiatanPayload {
  return {
    judul: v.judul.trim(),
    jenisId: Number(v.jenisId),
    penanggungJawabId: Number(v.penanggungJawabId),
    uraian: teksAtauNull(v.uraian),
    hasil: teksAtauNull(v.hasil),
    jumlahPeserta: v.jumlahPeserta === "" ? null : Number(v.jumlahPeserta),
    tglMulai: keIsoWib(v.tanggalMulai, v.jamMulai),
    tglSelesai: keIsoWib(v.tanggalSelesai, v.jamSelesai),
    lokasiNama: teksAtauNull(v.lokasiNama),
    lat: angkaOpsional(v.lat),
    lng: angkaOpsional(v.lng),
    refEksternal: teksAtauNull(v.refEksternal),
  };
}

export function nilaiAwalForm(k?: KegiatanDetail, penanggungJawabId?: number | null): KegiatanFormValues {
  if (!k) {
    // Kegiatan baru dimulai sekarang (WIB) dan berakhir satu jam kemudian, supaya pengisi tinggal mengubah bila perlu
    const sekarang = Date.now();
    const mulai = bagianWib(new Date(sekarang).toISOString());
    const selesai = bagianWib(new Date(sekarang + 3600_000).toISOString());
    return {
      judul: "",
      jenisId: "",
      penanggungJawabId: penanggungJawabId ? String(penanggungJawabId) : "",
      uraian: "",
      hasil: "",
      jumlahPeserta: "",
      tanggalMulai: mulai.tanggal,
      jamMulai: mulai.jam,
      tanggalSelesai: selesai.tanggal,
      jamSelesai: selesai.jam,
      lokasiNama: "",
      lat: "",
      lng: "",
      refEksternal: "",
    };
  }
  const mulai = bagianWib(k.tglMulai);
  const selesai = bagianWib(k.tglSelesai);
  return {
    judul: k.judul,
    jenisId: String(k.jenis.id),
    penanggungJawabId: String(k.penanggungJawab.id),
    uraian: k.uraian ?? "",
    hasil: k.hasil ?? "",
    jumlahPeserta: k.jumlahPeserta == null ? "" : String(k.jumlahPeserta),
    tanggalMulai: mulai.tanggal,
    jamMulai: mulai.jam,
    tanggalSelesai: selesai.tanggal,
    jamSelesai: selesai.jam,
    lokasiNama: k.lokasiNama ?? "",
    lat: k.lat == null ? "" : String(k.lat),
    lng: k.lng == null ? "" : String(k.lng),
    refEksternal: k.refEksternal ?? "",
  };
}

export function keIsiDraf(v: KegiatanFormValues): IsiDraf {
  const bulatkan = (teks: string) => {
    const n = angkaOpsional(teks);
    return n === null || Number.isNaN(n) ? teks.slice(0, 20) : n.toFixed(6);
  };
  return {
    judul: v.judul,
    jenisId: v.jenisId,
    uraian: v.uraian,
    jumlahPeserta: v.jumlahPeserta,
    tanggalMulai: v.tanggalMulai,
    jamMulai: v.jamMulai,
    tanggalSelesai: v.tanggalSelesai,
    jamSelesai: v.jamSelesai,
    lokasiNama: v.lokasiNama,
    lat: bulatkan(v.lat),
    lng: bulatkan(v.lng),
    refEksternal: v.refEksternal,
  };
}
