import { describe, expect, test } from "bun:test";
import { periksaSandi, skemaSandiBaru } from "./sandi";

describe("periksaSandi (sama dengan aturan backend)", () => {
  test("menerima kata sandi yang memenuhi syarat", () => {
    expect(periksaSandi("sandiuji12345")).toBeNull();
    expect(periksaSandi("Kata Sandi Aman 2026!")).toBeNull();
  });

  test("menolak yang terlalu pendek, tanpa angka/huruf, berulang, atau memuat email", () => {
    expect(periksaSandi("abc123")).toBe("Kata sandi minimal 8 karakter");
    expect(periksaSandi("hanyahurufsaja")).toBe("Kata sandi harus berisi huruf dan angka");
    expect(periksaSandi("12345678901")).toBe("Kata sandi harus berisi huruf dan angka");
    expect(periksaSandi("aaaaaaaaaaaa")).not.toBeNull();
    expect(periksaSandi("andisaputra2026", "andisaputra@diskominfo.local")).toBe("Kata sandi tidak boleh memuat alamat email Anda");
  });
});

describe("skemaSandiBaru", () => {
  test("kata sandi dan ulangan harus sama", () => {
    const hasil = skemaSandiBaru().safeParse({ password: "sandiuji12345", ulang: "sandiuji12346" });
    expect(hasil.success).toBe(false);
    expect(hasil.error?.issues[0]?.path).toEqual(["ulang"]);
    expect(skemaSandiBaru().safeParse({ password: "sandiuji12345", ulang: "sandiuji12345" }).success).toBe(true);
  });
});
