// =============================================================================
// PENGUJIAN SKEMA FORM KEGIATAN
// =============================================================================
// Gunanya: Menguji validasi form input kegiatan pada sisi klien dan fungsi
// konversi waktu ke zona WIB (Waktu Indonesia Barat) sebelum dikirim ke backend.
//
// Isi berkas:
//   - konversi waktu WIB : menguji keIsoWib dan bagianWib tetap konsisten
//   - validasi form kegiatan : menguji kegiatanSchema dan keKegiatanPayload
//
// Cara kerja:
//   1. Memverifikasi penggabungan tanggal dan jam form menghasilkan ISO +07:00.
//   2. Memastikan tanggal tidak bergeser ke hari berikutnya saat larut malam.
//   3. Menguji aturan validasi: kelengkapan data, urutan tanggal/jam, koordinat
//      lat/lng berpasangan, batas angka peserta, dan pembentukan payload API.
//
// Catatan penting:
//   - Memastikan validasi klien sesuai spesifikasi DESIGN.md bagian 4.5 agar
//     pengguna lekas mendapat umpan balik tanpa menunggu validasi server.
// =============================================================================

import { describe, expect, test } from "bun:test";
import { bagianWib, keIsoWib, keKegiatanPayload, kegiatanSchema, nilaiAwalForm } from "./kegiatan.schema";

const isian = {
  ...nilaiAwalForm(undefined, 7),
  judul: "  Rapat koordinasi  ",
  jenisId: "1",
  tanggalMulai: "2026-10-20",
  jamMulai: "09:00",
  tanggalSelesai: "2026-10-20",
  jamSelesai: "12:00",
};

describe("nilai awal kegiatan baru", () => {
  test("mulai sekarang (WIB) dan selesai satu jam kemudian", () => {
    const sebelum = Date.now();
    const v = nilaiAwalForm(undefined, 7);
    const mulai = new Date(keIsoWib(v.tanggalMulai, v.jamMulai)).getTime();
    const selesai = new Date(keIsoWib(v.tanggalSelesai, v.jamSelesai)).getTime();
    // jam dibulatkan ke menit, jadi mulai paling lama satu menit sebelum sekarang
    expect(sebelum - mulai).toBeLessThan(60_000 + 1000);
    expect(mulai).toBeLessThanOrEqual(Date.now());
    expect(selesai - mulai).toBe(3600_000);
  });
});

describe("konversi waktu WIB", () => {
  test("tanggal dan jam form menjadi ISO berzona +07:00 dan kembali utuh", () => {
    const iso = keIsoWib("2026-10-20", "09:00");
    expect(new Date(iso).toISOString()).toBe("2026-10-20T02:00:00.000Z");
    expect(bagianWib("2026-10-20T02:00:00.000Z")).toEqual({ tanggal: "2026-10-20", jam: "09:00" });
  });

  test("jam 23.30 WIB tidak bergeser ke hari berikutnya", () => {
    expect(bagianWib(keIsoWib("2026-10-31", "23:30"))).toEqual({ tanggal: "2026-10-31", jam: "23:30" });
  });
});

describe("validasi form kegiatan", () => {
  test("isian lengkap lolos dan payload API memakai tipe yang benar", () => {
    const hasil = kegiatanSchema.safeParse(isian);
    expect(hasil.success).toBe(true);
    const payload = keKegiatanPayload(hasil.data!);
    expect(payload.judul).toBe("Rapat koordinasi");
    expect(payload.penanggungJawabId).toBe(7);
    expect(payload.lat).toBeNull();
    expect(payload.jumlahPeserta).toBeNull();
  });

  test("tanggal selesai sebelum tanggal mulai ditolak di kolom tanggal selesai", () => {
    const hasil = kegiatanSchema.safeParse({ ...isian, jamSelesai: "08:00" });
    expect(hasil.success).toBe(false);
    expect(hasil.error!.issues.map((i) => i.path.join("."))).toContain("tanggalSelesai");
  });

  test("lintang tanpa bujur dan lintang di luar rentang ditolak", () => {
    const tanpaBujur = kegiatanSchema.safeParse({ ...isian, lat: "-2.97" });
    expect(tanpaBujur.error!.issues.map((i) => i.path[0])).toContain("lng");
    const luar = kegiatanSchema.safeParse({ ...isian, lat: "95", lng: "104" });
    expect(luar.error!.issues.map((i) => i.path[0])).toContain("lat");
  });

  test("judul kosong dan jumlah peserta bukan angka ditolak", () => {
    const hasil = kegiatanSchema.safeParse({ ...isian, judul: "   ", jumlahPeserta: "dua puluh" });
    const kolom = hasil.error!.issues.map((i) => i.path[0]);
    expect(kolom).toContain("judul");
    expect(kolom).toContain("jumlahPeserta");
  });
});
