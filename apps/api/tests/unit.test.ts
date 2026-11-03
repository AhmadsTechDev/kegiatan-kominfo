// Uji fungsi murni (tanpa basis data): NIP, periode WIB, status kegiatan, rekap, audit, berkas, pembatas laju,
// kebijakan kata sandi, token tautan email, status akun, hash kata sandi, dan perlindungan CSRF
import { describe, expect, test } from "bun:test";
import { hashPassword as hashScrypt } from "better-auth/crypto";
import { cocokSandi, hashSandi, perluHashUlang } from "@/lib/sandi";
import { redaksi } from "@/services/audit-log.service";
import { uraianRentang } from "@/services/ekspor.service";
import { isiTren, kunciBerikutnya } from "@/services/rekap.service";
import { cariIndukTertinggi, unitDanTurunan } from "@/services/referensi.service";
import { bersihkanNama, disposisi, kenaliJenis } from "@/utils/berkas";
import { periksaSandi } from "@/utils/kebijakan-sandi";
import { asalTerpercaya, requestMeta } from "@/utils/konteks";
import { periksaNip } from "@/utils/nip";
import { awalHariJakarta, geserPeriode, kodePeriode, parsePeriode, periodeSekarang, rentangPeriode, tanggalJakarta } from "@/utils/periode";
import { buatPembatasLaju } from "@/utils/rate-limit";
import { statusAkun } from "@/utils/status-akun";
import { hitungStatus } from "@/utils/status-kegiatan";
import { buatToken, hashToken, identifierToken, MASA_TOKEN_MS } from "@/utils/token";

const SEKARANG = new Date("2026-05-15T12:00:00+07:00");

describe("periksaNip", () => {
  test("NIP PNS dan PPPK yang sah diterima", () => {
    expect(periksaNip("198702152011012002", SEKARANG)).toBeNull();
    expect(periksaNip("199001012022211001", SEKARANG)).toBeNull();
  });

  test("bukan 18 digit angka ditolak", () => {
    expect(periksaNip("12345", SEKARANG)).toBe("NIP harus 18 digit angka");
    expect(periksaNip("19870215201101200A", SEKARANG)).toBe("NIP harus 18 digit angka");
  });

  test("tanggal lahir tidak ada di kalender ditolak", () => {
    expect(periksaNip("198702302011012002", SEKARANG)).toContain("tanggal lahir");
  });

  test("bulan pengangkatan selain 01-12 atau 21 ditolak", () => {
    expect(periksaNip("198702152011132002", SEKARANG)).toContain("bulan pengangkatan");
  });

  test("diangkat sebelum usia 17 tahun ditolak", () => {
    expect(periksaNip("198702152000012002", SEKARANG)).toContain("Tahun pengangkatan");
  });

  test("digit jenis kelamin dan nomor urut 000 ditolak", () => {
    expect(periksaNip("198702152011013002", SEKARANG)).toContain("Digit ke-15");
    expect(periksaNip("198702152011011000", SEKARANG)).toContain("Nomor urut");
  });
});

describe("periode WIB", () => {
  test("bulan berjalan dihitung menurut WIB, bukan UTC", () => {
    expect(periodeSekarang(new Date("2026-05-31T18:00:00Z"))).toEqual({ tahun: 2026, bulan: 6 });
    expect(tanggalJakarta(new Date("2026-05-31T18:00:00Z"))).toBe("2026-06-01");
  });

  test("parse, geser melewati tahun, dan kode periode", () => {
    expect(parsePeriode("2026-01")).toEqual({ tahun: 2026, bulan: 1 });
    expect(kodePeriode(geserPeriode({ tahun: 2026, bulan: 1 }, -1))).toBe("2025-12");
    expect(kodePeriode(geserPeriode({ tahun: 2025, bulan: 12 }, 1))).toBe("2026-01");
  });

  test("rentang bulan dimulai pukul 00:00 WIB", () => {
    const { mulai, akhir } = rentangPeriode({ tahun: 2026, bulan: 5 });
    expect(mulai.toISOString()).toBe("2026-04-30T17:00:00.000Z");
    expect(akhir.toISOString()).toBe("2026-05-31T17:00:00.000Z");
    expect(awalHariJakarta("2026-05-15", 1).toISOString()).toBe("2026-05-15T17:00:00.000Z");
  });
});

describe("hitungStatus", () => {
  const k = (mulaiJam: number, selesaiJam: number, batal = false) => ({
    tglMulai: new Date(SEKARANG.getTime() + mulaiJam * 3600_000),
    tglSelesai: new Date(SEKARANG.getTime() + selesaiJam * 3600_000),
    dibatalkanAt: batal ? SEKARANG : null,
  });

  test("akan datang, berlangsung, selesai, dibatalkan", () => {
    expect(hitungStatus(k(1, 2), SEKARANG)).toBe("akan_datang");
    expect(hitungStatus(k(-1, 1), SEKARANG)).toBe("berlangsung");
    expect(hitungStatus(k(-3, -1), SEKARANG)).toBe("selesai");
    expect(hitungStatus(k(-3, -1, true), SEKARANG)).toBe("dibatalkan");
  });
});

describe("rekap", () => {
  test("kunci periode berikutnya per hari, bulan, tahun", () => {
    expect(kunciBerikutnya("2026-02-28", "hari")).toBe("2026-03-01");
    expect(kunciBerikutnya("2026-12", "bulan")).toBe("2027-01");
    expect(kunciBerikutnya("2026", "tahun")).toBe("2027");
  });

  test("tren mengisi periode kosong dengan 0", () => {
    expect(isiTren([{ kunci: "2026-03", jumlah: 4 }], "2026-01", "2026-04", "bulan")).toEqual([
      { periode: "2026-01", jumlah: 0 },
      { periode: "2026-02", jumlah: 0 },
      { periode: "2026-03", jumlah: 4 },
      { periode: "2026-04", jumlah: 0 },
    ]);
  });

  test("tren lebih dari 400 titik ditolak", () => {
    expect(() => isiTren([], "2020-01-01", "2026-01-01", "hari")).toThrow("Rentang terlalu panjang");
  });

  test("uraian rentang untuk judul laporan", () => {
    expect(uraianRentang({ periode: "2026-05" })).toBe("Mei 2026");
    expect(uraianRentang({})).toBe("Semua periode");
    expect(uraianRentang({ dari: "2026-05-01" })).toStartWith("Sejak ");
  });
});

describe("pohon bidang", () => {
  const unit = [
    { id: 1, parentId: null },
    { id: 2, parentId: 1 },
    { id: 3, parentId: 2 },
    { id: 4, parentId: null },
  ];

  test("unit beserta seluruh turunannya", () => {
    expect(unitDanTurunan(unit, 1).sort()).toEqual([1, 2, 3]);
    expect(unitDanTurunan(unit, 4)).toEqual([4]);
  });

  test("induk tertinggi", () => {
    expect(cariIndukTertinggi(unit, 3)?.id).toBe(1);
    expect(cariIndukTertinggi(unit, 4)?.id).toBe(4);
  });
});

describe("redaksi audit", () => {
  test("kunci rahasia dibuang dan tipe khusus diubah ke JSON", () => {
    const hasil = redaksi({
      nama: "A",
      password: "x",
      sesi: { token: "y", ok: 1 },
      waktu: new Date("2026-01-01T00:00:00Z"),
      id: 5n,
      lat: { toJSON: () => "-2.976074" },
    });
    expect(hasil).toEqual({ nama: "A", sesi: { ok: 1 }, waktu: "2026-01-01T00:00:00.000Z", id: 5, lat: "-2.976074" });
  });
});

describe("berkas", () => {
  const awal = (teks: string) => new TextEncoder().encode(teks);

  test("jenis dikenali dari isi, bukan nama", () => {
    expect(kenaliJenis(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
    expect(kenaliJenis(awal("%PDF-1.7"))?.mime).toBe("application/pdf");
    expect(kenaliJenis(awal("RIFF....WEBPVP8 "))?.mime).toBe("image/webp");
    expect(kenaliJenis(awal("MZ\x90\x00"))).toBeNull();
  });

  test("nama berkas dibersihkan dari path dan karakter kontrol", () => {
    expect(bersihkanNama("C:\\data\\foto\u0007.jpg")).toBe("foto.jpg");
    expect(bersihkanNama("   ")).toBe("berkas");
  });

  test("Content-Disposition aman untuk huruf non-ASCII", () => {
    expect(disposisi("attachment", 'Rapat "ü".pdf')).toBe(`attachment; filename="Rapat ___.pdf"; filename*=UTF-8''Rapat%20%22%C3%BC%22.pdf`);
  });
});

describe("utilitas lain", () => {
  test("IP diambil dari entri pertama x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1", "user-agent": "uji" });
    expect(requestMeta(h)).toEqual({ ip: "1.2.3.4", userAgent: "uji" });
    expect(requestMeta(new Headers({ "x-real-ip": "5.6.7.8" })).ip).toBe("5.6.7.8");
  });

  test("pembatas laju menolak permintaan ke-(maks+1) dalam satu jendela", () => {
    const periksa = buatPembatasLaju({ jendelaMs: 1000, maks: 2 });
    periksa("a", 0);
    periksa("a", 10);
    expect(() => periksa("a", 20)).toThrow();
    expect(() => periksa("b", 20)).not.toThrow();
    expect(() => periksa("a", 1500)).not.toThrow();
  });
});

describe("kebijakan kata sandi", () => {
  test("panjang 8-128, berisi huruf dan angka", () => {
    expect(periksaSandi("sandiuji12345")).toBeNull();
    expect(periksaSandi("Kata Sandi Aman 2026!")).toBeNull();
    expect(periksaSandi("abc123")).toBe("Kata sandi minimal 8 karakter");
    expect(periksaSandi(`a1${"x".repeat(127)}`)).toBe("Kata sandi maksimal 128 karakter");
    expect(periksaSandi("hanyahurufsaja")).toBe("Kata sandi harus berisi huruf dan angka");
    expect(periksaSandi("12345678901")).toBe("Kata sandi harus berisi huruf dan angka");
  });

  test("karakter berulang dan sandi yang memuat email ditolak", () => {
    expect(periksaSandi("aaaaaaaaaaaa")).not.toBeNull();
    expect(periksaSandi("andisaputra2026", { email: "AndiSaputra@diskominfo.local" })).toBe("Kata sandi tidak boleh memuat alamat email Anda");
    expect(periksaSandi("rahasia2026xyz", { email: "ab@x.id" })).toBeNull();
  });
});

describe("token tautan email", () => {
  test("token acak 256 bit base64url; yang disimpan hanya hash SHA-256", () => {
    const a = buatToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(buatToken()).not.toBe(a);
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(identifierToken("reset-sandi", "abc")).toBe("reset-sandi:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  test("masa berlaku: aktivasi 72 jam, reset sandi 1 jam, ganti email 24 jam", () => {
    expect(MASA_TOKEN_MS).toEqual({ aktivasi: 72 * 3600_000, "reset-sandi": 3600_000, "ganti-email": 24 * 3600_000 });
  });
});

describe("status akun dan hash kata sandi", () => {
  test("status diturunkan dari banned dan kredensial", () => {
    expect(statusAkun({ banned: false, punyaKredensial: false })).toBe("MENUNGGU_AKTIVASI");
    expect(statusAkun({ banned: false, punyaKredensial: true })).toBe("AKTIF");
    expect(statusAkun({ banned: true, punyaKredensial: true })).toBe("NONAKTIF");
    expect(statusAkun({ banned: true, punyaKredensial: false })).toBe("NONAKTIF");
  });

  test("Argon2id untuk hash baru; hash scrypt lama tetap cocok dan ditandai perlu diperbarui", async () => {
    const baru = await hashSandi("sandiuji12345");
    expect(baru).toStartWith("$argon2id$");
    expect(await cocokSandi({ hash: baru, password: "sandiuji12345" })).toBe(true);
    expect(await cocokSandi({ hash: baru, password: "sandiuji12346" })).toBe(false);
    expect(perluHashUlang(baru)).toBe(false);

    const lama = await hashScrypt("sandiuji12345");
    expect(await cocokSandi({ hash: lama, password: "sandiuji12345" })).toBe(true);
    expect(await cocokSandi({ hash: lama, password: "salah" })).toBe(false);
    expect(perluHashUlang(lama)).toBe(true);
  });
});

describe("perlindungan CSRF", () => {
  const terpercaya = ["https://kegiatan.palembang.go.id"];
  const req = (method: string, headers: Record<string, string> = {}) => new Request("https://api.local/api/me", { method, headers });

  test("metode aman selalu lolos", () => {
    expect(asalTerpercaya(req("GET"), terpercaya)).toBe(true);
    expect(asalTerpercaya(req("HEAD"), terpercaya)).toBe(true);
  });

  test("POST/PATCH/DELETE hanya dari origin terpercaya (Origin, atau Referer bila Origin tidak ada)", () => {
    expect(asalTerpercaya(req("POST", { origin: "https://kegiatan.palembang.go.id" }), terpercaya)).toBe(true);
    expect(asalTerpercaya(req("PATCH", { referer: "https://kegiatan.palembang.go.id/pengaturan" }), terpercaya)).toBe(true);
    expect(asalTerpercaya(req("POST", { origin: "https://jahat.example" }), terpercaya)).toBe(false);
    expect(asalTerpercaya(req("DELETE", { origin: "https://kegiatan.palembang.go.id.jahat.example" }), terpercaya)).toBe(false);
    expect(asalTerpercaya(req("POST"), terpercaya)).toBe(false);
    expect(asalTerpercaya(req("POST", { origin: "null" }), terpercaya)).toBe(false);
  });
});
