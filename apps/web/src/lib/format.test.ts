import { describe, expect, test } from "bun:test";
import { formatAngka, formatJam, formatPeriode, formatRentangTanggal, formatTanggal, formatUkuran, inisial, periodeSebelumnya, tanggalWib } from "./format";

/**
 * Uji fungsi format.ts: tanggal, jam WIB, rentang, angka, periode, ukuran berkas, inisial
 */

describe("format", () => {
  test("tanggal dan jam selalu dalam WIB, apa pun zona perangkat", () => {
    expect(formatTanggal("2026-10-14T17:30:00Z")).toBe("15 Okt 2026");
    expect(formatJam("2026-10-14T17:30:00Z")).toBe("00:30 WIB");
    expect(tanggalWib("2026-10-14T17:30:00Z")).toBe("2026-10-15");
  });

  test("rentang tanggal diringkas bila bulan sama", () => {
    expect(formatRentangTanggal("2026-10-14T02:00:00Z", "2026-10-14T05:00:00Z")).toBe("14 Okt 2026");
    expect(formatRentangTanggal("2026-10-14T02:00:00Z", "2026-10-16T05:00:00Z")).toBe("14–16 Okt 2026");
    expect(formatRentangTanggal("2026-09-30T02:00:00Z", "2026-10-02T05:00:00Z")).toBe("30 Sep 2026 – 2 Okt 2026");
  });

  test("angka, periode, ukuran berkas, dan inisial", () => {
    expect(formatAngka(3151)).toBe("3.151");
    expect(formatPeriode("2026-10")).toBe("Okt 2026");
    expect(formatPeriode("2026-10", true)).toBe("Oktober 2026");
    expect(periodeSebelumnya("2026-01", 3)).toEqual(["2026-01", "2025-12", "2025-11"]);
    expect(formatUkuran(512 * 1024)).toBe("512 KB");
    expect(formatUkuran(4.25 * 1024 * 1024)).toBe("4,3 MB");
    expect(inisial("Andi Saputra Wijaya")).toBe("AS");
  });
});
