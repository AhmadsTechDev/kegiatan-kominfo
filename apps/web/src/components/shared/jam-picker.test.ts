// =============================================================================
// PENGUJIAN NORMALISASI JAM (JAM PICKER TEST)
// =============================================================================
// Gunanya: Menguji fungsi normalisasiJam untuk memastikan parsing teks waktu bebas
//          menghasilkan format baku 24 jam dan menolak masukan yang tidak valid.
//
// Isi berkas:
//   - Unit test bun:test untuk fungsi normalisasiJam
//
// Yang diuji dan alasannya:
//   - Pengujian ragam format jam ("8", "830", "8.30", dll.) menjadi format "HH:MM".
//   - Pengujian penolakan nilai tak valid ("24:00", "abc", dll.) agar bernilai null.
//   - Diuji untuk menjamin keandalan input jam kegiatan sebelum validasi formulir.
// =============================================================================

import { describe, expect, test } from "bun:test";
import { normalisasiJam } from "./jam-picker";

describe("normalisasiJam", () => {
  test.each([
    ["8", "08:00"],
    ["830", "08:30"],
    ["0830", "08:30"],
    ["8.30", "08:30"],
    ["8:05", "08:05"],
    ["13:45", "13:45"],
    ["2359", "23:59"],
  ])("%s menjadi %s", (masuk, keluar) => expect(normalisasiJam(masuk)).toBe(keluar));

  test.each(["24:00", "12:60", "abc", "", "12345"])("%s ditolak", (masuk) => expect(normalisasiJam(masuk)).toBeNull());
});
