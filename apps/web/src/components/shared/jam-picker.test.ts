import { describe, expect, test } from "bun:test";
import { normalisasiJam } from "./jam-picker";

// Uji normalisasiJam: teks jam bebas jadi format 24 jam, masukan salah ditolak

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
