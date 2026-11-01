// =============================================================================
// PENGUJIAN UNIT VALIDATOR NOMOR INDUK PEGAWAI (NIP)
// =============================================================================
// Gunanya: Menguji keabsahan logika pemeriksaan 18 digit NIP ASN dan skema formulir
// Zod agar validasi di frontend berfungsi persis sama dengan backend.
//
// Yang diuji dan alasannya:
//   - Format NIP sah PNS dan PPPK: memastikan kombinasi digit yang benar diloloskan.
//   - Pendeteksian salah ketik: menguji penolakan tanggal lahir kalender tidak valid,
//     bulan pengangkatan di luar batas (01-12 atau 21 PPPK), dan digit jenis kelamin.
//   - Skema Zod zNip: memastikan pesan galat formulir konsisten dengan aturan server.
//
// Dipakai oleh: Bun test runner untuk pengujian otomatis modul validasi pegawai.
// =============================================================================

import { describe, expect, test } from "bun:test";
import { periksaNip, zNip } from "./nip";

const SEKARANG = new Date("2026-10-19T00:00:00Z");

describe("periksaNip (sama dengan backend)", () => {
  test("NIP PNS dan PPPK yang benar lolos", () => {
    expect(periksaNip("198702152011012002", SEKARANG)).toBeNull();
    expect(periksaNip("198501012023212001", SEKARANG)).toBeNull();
  });

  test("salah ketik tanggal lahir, bulan, dan jenis kelamin ditolak", () => {
    expect(periksaNip("198702302011012002", SEKARANG)).toContain("tanggal lahir");
    expect(periksaNip("198702152011132002", SEKARANG)).toContain("bulan pengangkatan");
    expect(periksaNip("198702152011013002", SEKARANG)).toContain("Digit ke-15");
  });

  test("zNip memakai pesan yang sama di form", () => {
    const hasil = zNip().safeParse("12345");
    expect(hasil.success).toBe(false);
    expect(hasil.error?.issues[0]?.message).toBe("NIP harus 18 digit angka");
  });
});
