// Uji kegiatan: validasi isian, hak akses per role dan unit, konflik ubah bersamaan (409),
// batal, periksa, hapus, filter daftar, audit log, dan draf kegiatan
import { describe, expect, test } from "bun:test";
import { prisma } from "@/lib/prisma";
import { auditUntuk, buatKegiatan, buatPengguna, formBerkas, idJenis, idUnit, isiKegiatan, jamLagi, loginAdmin, panggil, PNG } from "./helpers";

describe("mencatat kegiatan", () => {
  test("PEGAWAI mencatat kegiatannya sendiri; bidang mengikuti penanggung jawab", async () => {
    const u = await buatPengguna();
    const isi = await isiKegiatan(u.pegawaiId!, { lat: -2.976074, lng: 104.775431 });
    const baru = await buatKegiatan(u.cookie, isi);
    const detail = await panggil(`/kegiatan/${baru.id}`, { cookie: u.cookie });
    expect(detail.status).toBe(200);
    expect(detail.data).toMatchObject({
      judul: isi.judul,
      lat: -2.976074,
      lng: 104.775431,
      bidang: { id: await idUnit("SEKSI-DATA") },
      unitInduk: { nama: "Bidang Teknologi Informasi dan Persandian" },
      statusPelaksanaan: "akan_datang",
      statusPemeriksaan: "terkirim",
      bisaUbah: true,
      bisaPeriksa: false,
    });
    expect(detail.data.riwayat[0].aksi).toBe("buat");
  });

  test("lokasi opsional: kegiatan tanpa nama lokasi dan titik peta tersimpan", async () => {
    const u = await buatPengguna();
    const baru = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { lokasiNama: null, lat: null, lng: null }));
    const detail = await panggil(`/kegiatan/${baru.id}`, { cookie: u.cookie });
    expect(detail.status).toBe(200);
    expect(detail.data).toMatchObject({ lokasiNama: null, lat: null, lng: null });
  });

  test("tanggal selesai sebelum tanggal mulai ditolak 422", async () => {
    const u = await buatPengguna();
    const res = await panggil("/kegiatan", { cookie: u.cookie, json: await isiKegiatan(u.pegawaiId!, { tglMulai: jamLagi(5), tglSelesai: jamLagi(4) }) });
    expect(res.status).toBe(422);
    expect(res.data.details).toContainEqual({ field: "tglSelesai", message: "Tanggal selesai tidak boleh sebelum tanggal mulai" });
  });

  test("lintang tanpa bujur, judul kosong, dan field wajib hilang ditolak 422", async () => {
    const u = await buatPengguna();
    expect((await panggil("/kegiatan", { cookie: u.cookie, json: await isiKegiatan(u.pegawaiId!, { lat: -2.9 }) })).status).toBe(422);
    expect((await panggil("/kegiatan", { cookie: u.cookie, json: await isiKegiatan(u.pegawaiId!, { judul: "   " }) })).status).toBe(422);
    const tanpaJenis = await panggil("/kegiatan", { cookie: u.cookie, json: { judul: "X", penanggungJawabId: u.pegawaiId } });
    expect(tanpaJenis.status).toBe(422);
    expect(tanpaJenis.data.code).toBe("VALIDATION_ERROR");
  });

  test("PEGAWAI tidak boleh mencatat atas nama pegawai lain", async () => {
    const u = await buatPengguna();
    const lain = await buatPengguna();
    const res = await panggil("/kegiatan", { cookie: u.cookie, json: await isiKegiatan(lain.pegawaiId!) });
    expect(res.status).toBe(422);
    expect(res.data.details[0].field).toBe("penanggungJawabId");
  });

  test("ADMIN dan PIMPINAN tidak boleh mencatat, mengubah, menghapus kegiatan, atau mengunggah dokumentasi", async () => {
    const u = await buatPengguna();
    const k = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!));
    const admin = await loginAdmin();
    const pimpinan = await buatPengguna({ role: "PIMPINAN" });
    for (const cookie of [admin, pimpinan.cookie]) {
      expect((await panggil("/kegiatan", { cookie, json: await isiKegiatan(u.pegawaiId!) })).status).toBe(403);
      expect((await panggil(`/kegiatan/${k.id}`, { method: "PATCH", cookie, json: { ...(await isiKegiatan(u.pegawaiId!)), expectedUpdatedAt: k.updatedAt } })).status).toBe(403);
      expect((await panggil(`/kegiatan/${k.id}/batalkan`, { cookie, json: { alasan: "uji", expectedUpdatedAt: k.updatedAt } })).status).toBe(403);
      expect((await panggil(`/kegiatan/${k.id}`, { method: "DELETE", cookie })).status).toBe(403);
      expect((await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie, form: formBerkas(PNG) })).status).toBe(403);
      expect((await panggil("/draf-kegiatan", { cookie, json: { isi: { judul: "x" } } })).status).toBe(403);
      // Tetap bisa membaca
      expect((await panggil(`/kegiatan/${k.id}`, { cookie })).data).toMatchObject({ id: k.id, bisaUbah: false, bisaPeriksa: true });
    }
  });

  test("jenis kegiatan yang dinonaktifkan tidak bisa dipilih", async () => {
    const admin = await loginAdmin();
    const jenis = await panggil("/admin/jenis-kegiatan", { cookie: admin, json: { nama: `Jenis Nonaktif ${crypto.randomUUID().slice(0, 6)}` } });
    await panggil(`/admin/jenis-kegiatan/${jenis.data.id}`, { method: "PATCH", cookie: admin, json: { nama: "Jenis Nonaktif " + jenis.data.id, aktif: false } });
    const u = await buatPengguna();
    const res = await panggil("/kegiatan", { cookie: u.cookie, json: await isiKegiatan(u.pegawaiId!, { jenisId: jenis.data.id }) });
    expect(res.status).toBe(422);
    expect(res.data.details[0].field).toBe("jenisId");
  });
});

describe("lingkup baca dan hak ubah", () => {
  test("rekan satu unit bisa melihat tetapi tidak bisa mengubah (403)", async () => {
    const pemilik = await buatPengguna();
    const rekan = await buatPengguna();
    const k = await buatKegiatan(pemilik.cookie, await isiKegiatan(pemilik.pegawaiId!));
    const detail = await panggil(`/kegiatan/${k.id}`, { cookie: rekan.cookie });
    expect(detail.status).toBe(200);
    expect(detail.data.bisaUbah).toBe(false);
    const ubah = await panggil(`/kegiatan/${k.id}`, {
      method: "PATCH",
      cookie: rekan.cookie,
      json: { ...(await isiKegiatan(pemilik.pegawaiId!)), expectedUpdatedAt: k.updatedAt },
    });
    expect(ubah.status).toBe(403);
    expect((await panggil(`/kegiatan/${k.id}`, { method: "DELETE", cookie: rekan.cookie })).status).toBe(403);
  });

  test("pegawai unit lain tidak bisa melihat (404, bukan 403)", async () => {
    const pemilik = await buatPengguna();
    const luar = await buatPengguna({ unitId: await idUnit("BID-OPINI") });
    const k = await buatKegiatan(pemilik.cookie, await isiKegiatan(pemilik.pegawaiId!));
    expect((await panggil(`/kegiatan/${k.id}`, { cookie: luar.cookie })).status).toBe(404);
    const daftar = await panggil("/kegiatan?pageSize=100", { cookie: luar.cookie });
    expect(daftar.data.items.some((x: { id: number }) => x.id === k.id)).toBe(false);
  });

  test("pegawai di bidang induk bisa melihat kegiatan seksi di bawahnya", async () => {
    const pemilik = await buatPengguna();
    const atasan = await buatPengguna({ unitId: await idUnit("BID-TIP") });
    const k = await buatKegiatan(pemilik.cookie, await isiKegiatan(pemilik.pegawaiId!));
    expect((await panggil(`/kegiatan/${k.id}`, { cookie: atasan.cookie })).status).toBe(200);
  });

  test("PIMPINAN melihat semua kegiatan dan boleh memeriksa, tetapi tidak boleh mengubah", async () => {
    const pemilik = await buatPengguna({ unitId: await idUnit("BID-EGOV") });
    const pimpinan = await buatPengguna({ role: "PIMPINAN" });
    const k = await buatKegiatan(pemilik.cookie, await isiKegiatan(pemilik.pegawaiId!));
    const detail = await panggil(`/kegiatan/${k.id}`, { cookie: pimpinan.cookie });
    expect(detail.data).toMatchObject({ bisaPeriksa: true, bisaUbah: false });
    const ubah = await panggil(`/kegiatan/${k.id}`, { method: "PATCH", cookie: pimpinan.cookie, json: { ...(await isiKegiatan(pemilik.pegawaiId!)), expectedUpdatedAt: k.updatedAt } });
    expect(ubah.status).toBe(403);
  });

  test("ADMIN memeriksa kegiatan; PEGAWAI tidak boleh memeriksa", async () => {
    const pemilik = await buatPengguna();
    const k = await buatKegiatan(pemilik.cookie, await isiKegiatan(pemilik.pegawaiId!));
    const admin = await loginAdmin();
    expect((await panggil(`/kegiatan/${k.id}`, { cookie: admin })).data.bisaPeriksa).toBe(true);
    expect((await panggil(`/kegiatan/${k.id}/pemeriksaan`, { cookie: admin, json: { status: "diperiksa" } })).status).toBe(200);
    expect((await panggil(`/kegiatan/${k.id}/pemeriksaan`, { cookie: pemilik.cookie, json: { status: "diperiksa" } })).status).toBe(403);
  });

  test("hasil pemeriksaan masuk ke notifikasi pegawai, terpisah dari status pelaksanaan, dan tercatat di riwayat", async () => {
    const pemilik = await buatPengguna();
    const k = await buatKegiatan(pemilik.cookie, await isiKegiatan(pemilik.pegawaiId!));
    const admin = await loginAdmin();
    const pimpinan = await buatPengguna({ role: "PIMPINAN" });
    expect((await panggil(`/kegiatan/${k.id}/pemeriksaan`, { cookie: admin, json: { status: "perlu_perbaikan" } })).status).toBe(422);
    expect((await panggil(`/kegiatan/${k.id}/pemeriksaan`, { cookie: admin, json: { status: "perlu_perbaikan", catatan: "Foto belum ada" } })).status).toBe(200);
    expect((await panggil(`/kegiatan/${k.id}/pemeriksaan`, { cookie: pimpinan.cookie, json: { status: "diperiksa" } })).status).toBe(200);

    const detail = await panggil(`/kegiatan/${k.id}`, { cookie: pemilik.cookie });
    expect(detail.data).toMatchObject({ statusPelaksanaan: "akan_datang", statusPemeriksaan: "diperiksa" });
    expect(detail.data.catatanPemeriksaan.map((c: { status: string }) => c.status)).toEqual(["diperiksa", "perlu_perbaikan"]);

    const notif = await panggil("/notifikasi", { cookie: pemilik.cookie });
    expect(notif.data.belumDibaca).toBe(2);
    expect(notif.data.items[1]).toMatchObject({ jenis: "perlu_perbaikan", isi: "Foto belum ada", kegiatanId: k.id, dibacaAt: null });
    // Pemeriksa tidak menerima notifikasinya sendiri
    expect((await panggil("/notifikasi", { cookie: admin })).data.items.some((n: { kegiatanId: number }) => n.kegiatanId === k.id)).toBe(false);

    // Hanya pemilik yang bisa menandai dibaca
    const id = notif.data.items[1].id;
    expect((await panggil(`/notifikasi/${id}/baca`, { cookie: pimpinan.cookie, json: {} })).data.jumlah).toBe(0);
    expect((await panggil(`/notifikasi/${id}/baca`, { cookie: pemilik.cookie, json: {} })).data.jumlah).toBe(1);
    expect((await panggil("/notifikasi/baca-semua", { cookie: pemilik.cookie, json: {} })).data.jumlah).toBe(1);
    expect((await panggil("/notifikasi", { cookie: pemilik.cookie })).data.belumDibaca).toBe(0);
  });
});

describe("ubah, batal, periksa, hapus", () => {
  test("dua pengubahan bersamaan dengan versi yang sama: satu berhasil, satu 409", async () => {
    const u = await buatPengguna();
    const k = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!));
    const isi = await isiKegiatan(u.pegawaiId!);
    const [a, b] = await Promise.all([
      panggil(`/kegiatan/${k.id}`, { method: "PATCH", cookie: u.cookie, json: { ...isi, judul: "Versi A", expectedUpdatedAt: k.updatedAt } }),
      panggil(`/kegiatan/${k.id}`, { method: "PATCH", cookie: u.cookie, json: { ...isi, judul: "Versi B", expectedUpdatedAt: k.updatedAt } }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const lagi = await panggil(`/kegiatan/${k.id}`, { method: "PATCH", cookie: u.cookie, json: { ...isi, expectedUpdatedAt: k.updatedAt } });
    expect(lagi.status).toBe(409);
    expect(lagi.data.code).toBe("CONFLICT");
  });

  test("pemeriksaan pimpinan tidak menaikkan versi; ubah oleh pegawai mengembalikan status ke terkirim", async () => {
    const u = await buatPengguna();
    const pimpinan = await buatPengguna({ role: "PIMPINAN" });
    const k = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!));

    expect((await panggil(`/kegiatan/${k.id}/pemeriksaan`, { cookie: pimpinan.cookie, json: { status: "perlu_perbaikan" } })).status).toBe(422);
    expect((await panggil(`/kegiatan/${k.id}/pemeriksaan`, { cookie: u.cookie, json: { status: "diperiksa" } })).status).toBe(403);
    const periksa = await panggil(`/kegiatan/${k.id}/pemeriksaan`, { cookie: pimpinan.cookie, json: { status: "perlu_perbaikan", catatan: "Lengkapi hasil" } });
    expect(periksa.data).toEqual({ id: k.id, statusPemeriksaan: "perlu_perbaikan" });

    const detail = await panggil(`/kegiatan/${k.id}`, { cookie: u.cookie });
    expect(detail.data.updatedAt).toBe(k.updatedAt);
    expect(detail.data.catatanPemeriksaan[0]).toMatchObject({ status: "perlu_perbaikan", isi: "Lengkapi hasil" });

    const ubah = await panggil(`/kegiatan/${k.id}`, { method: "PATCH", cookie: u.cookie, json: { ...(await isiKegiatan(u.pegawaiId!)), hasil: "Sudah", expectedUpdatedAt: k.updatedAt } });
    expect(ubah.status).toBe(200);
    expect((await panggil(`/kegiatan/${k.id}`, { cookie: u.cookie })).data.statusPemeriksaan).toBe("terkirim");
  });

  test("batalkan kegiatan: alasan wajib, tidak bisa dibatalkan dua kali", async () => {
    const u = await buatPengguna();
    const k = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!));
    expect((await panggil(`/kegiatan/${k.id}/batalkan`, { cookie: u.cookie, json: { alasan: "   ", expectedUpdatedAt: k.updatedAt } })).status).toBe(422);
    const batal = await panggil(`/kegiatan/${k.id}/batalkan`, { cookie: u.cookie, json: { alasan: "Narasumber berhalangan", expectedUpdatedAt: k.updatedAt } });
    expect(batal.status).toBe(200);
    const detail = await panggil(`/kegiatan/${k.id}`, { cookie: u.cookie });
    expect(detail.data).toMatchObject({ statusPelaksanaan: "dibatalkan", alasanBatal: "Narasumber berhalangan" });
    const lagi = await panggil(`/kegiatan/${k.id}/batalkan`, { cookie: u.cookie, json: { alasan: "Lagi", expectedUpdatedAt: batal.data.updatedAt } });
    expect(lagi.status).toBe(422);
  });

  test("kegiatan yang sudah selesai tidak bisa dibatalkan", async () => {
    const u = await buatPengguna();
    const k = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { tglMulai: jamLagi(-3), tglSelesai: jamLagi(-1) }));
    const batal = await panggil(`/kegiatan/${k.id}/batalkan`, { cookie: u.cookie, json: { alasan: "Salah catat", expectedUpdatedAt: k.updatedAt } });
    expect(batal.status).toBe(422);
    expect(batal.data.message).toContain("sudah selesai");
  });

  test("selesaikan sekarang: hanya untuk kegiatan yang berlangsung, waktu selesai menjadi sekarang", async () => {
    const u = await buatPengguna();
    const berlangsung = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { tglMulai: jamLagi(-1), tglSelesai: jamLagi(2) }));
    expect((await panggil(`/kegiatan/${berlangsung.id}`, { cookie: u.cookie })).data.statusPelaksanaan).toBe("berlangsung");

    const lama = await panggil(`/kegiatan/${berlangsung.id}/selesai`, { cookie: u.cookie, json: { expectedUpdatedAt: "2000-01-01T00:00:00.000Z" } });
    expect(lama.status).toBe(409);

    const selesai = await panggil(`/kegiatan/${berlangsung.id}/selesai`, { cookie: u.cookie, json: { expectedUpdatedAt: berlangsung.updatedAt } });
    expect(selesai.status).toBe(200);
    const detail = await panggil(`/kegiatan/${berlangsung.id}`, { cookie: u.cookie });
    expect(detail.data.statusPelaksanaan).toBe("selesai");
    expect(new Date(detail.data.tglSelesai).getTime()).toBeLessThanOrEqual(Date.now());
    expect(new Date(detail.data.tglSelesai).getTime()).toBeGreaterThan(Date.now() - 60_000);
    expect((await auditUntuk("kegiatan", berlangsung.id)).map((a) => a.aksi)).toEqual(["ubah", "buat"]);

    const lagi = await panggil(`/kegiatan/${berlangsung.id}/selesai`, { cookie: u.cookie, json: { expectedUpdatedAt: selesai.data.updatedAt } });
    expect(lagi.status).toBe(422);
    expect(lagi.data.message).toContain("sudah selesai");
  });

  test("selesaikan sekarang ditolak untuk kegiatan yang belum dimulai, dibatalkan, atau milik orang lain", async () => {
    const u = await buatPengguna();
    const nanti = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!));
    const belum = await panggil(`/kegiatan/${nanti.id}/selesai`, { cookie: u.cookie, json: { expectedUpdatedAt: nanti.updatedAt } });
    expect(belum.status).toBe(422);
    expect(belum.data.message).toContain("belum dimulai");

    const jalan = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { tglMulai: jamLagi(-1), tglSelesai: jamLagi(2) }));
    const batal = await panggil(`/kegiatan/${jalan.id}/batalkan`, { cookie: u.cookie, json: { alasan: "Ditunda", expectedUpdatedAt: jalan.updatedAt } });
    const dibatalkan = await panggil(`/kegiatan/${jalan.id}/selesai`, { cookie: u.cookie, json: { expectedUpdatedAt: batal.data.updatedAt } });
    expect(dibatalkan.status).toBe(422);

    const lain = await buatPengguna();
    const orang = await panggil(`/kegiatan/${nanti.id}/selesai`, { cookie: lain.cookie, json: { expectedUpdatedAt: nanti.updatedAt } });
    expect([403, 404]).toContain(orang.status);
  });

  test("hapus kegiatan: 204, lalu tidak ditemukan lagi; tercatat lengkap di audit", async () => {
    const u = await buatPengguna();
    const k = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!));
    const ubah = await panggil(`/kegiatan/${k.id}`, { method: "PATCH", cookie: u.cookie, json: { ...(await isiKegiatan(u.pegawaiId!)), expectedUpdatedAt: k.updatedAt } });
    expect(ubah.status).toBe(200);
    expect((await panggil(`/kegiatan/${k.id}`, { method: "DELETE", cookie: u.cookie })).status).toBe(204);
    expect((await panggil(`/kegiatan/${k.id}`, { cookie: u.cookie })).status).toBe(404);
    expect((await panggil(`/kegiatan/${k.id}`, { method: "DELETE", cookie: u.cookie })).status).toBe(404);

    const audit = await auditUntuk("kegiatan", k.id);
    expect(audit.map((a) => a.aksi)).toEqual(["hapus", "ubah", "buat"]);
    expect(audit.every((a) => a.aktorId === u.userId && a.ip)).toBe(true);
    expect((audit[1]!.dataSebelum as { judul: string }).judul).not.toBe((audit[1]!.dataSesudah as { judul: string }).judul);
  });

  test("id tidak ada 404, id bukan angka 422", async () => {
    const u = await buatPengguna();
    expect((await panggil("/kegiatan/999999", { cookie: u.cookie })).status).toBe(404);
    expect((await panggil("/kegiatan/abc", { cookie: u.cookie })).status).toBe(422);
  });
});

describe("daftar kegiatan", () => {
  test("filter milik saya, status, pencarian tidak peka huruf, dan paginasi", async () => {
    const u = await buatPengguna();
    const kode = crypto.randomUUID().slice(0, 8);
    await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { judul: `Sosialisasi ${kode}` }));
    await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { judul: `Rapat ${kode}`, tglMulai: jamLagi(-30), tglSelesai: jamLagi(-28) }));

    const milik = await panggil("/kegiatan?milik=saya", { cookie: u.cookie });
    expect(milik.data.total).toBe(2);
    expect(milik.data.items.every((k: { bisaUbah: boolean }) => k.bisaUbah)).toBe(true);

    expect((await panggil(`/kegiatan?q=${kode.toUpperCase()}`, { cookie: u.cookie })).data.total).toBe(2);
    expect((await panggil(`/kegiatan?q=sosialisasi%20${kode}`, { cookie: u.cookie })).data.total).toBe(1);
    const selesai = await panggil(`/kegiatan?milik=saya&status=selesai`, { cookie: u.cookie });
    expect(selesai.data.items.map((k: { judul: string }) => k.judul)).toEqual([`Rapat ${kode}`]);

    const halaman = await panggil("/kegiatan?milik=saya&pageSize=1&page=2", { cookie: u.cookie });
    expect(halaman.data).toMatchObject({ total: 2, page: 2, pageSize: 1 });
    expect(halaman.data.items).toHaveLength(1);
  });

  test("query tidak valid ditolak 422", async () => {
    const u = await buatPengguna();
    expect((await panggil("/kegiatan?pageSize=500", { cookie: u.cookie })).status).toBe(422);
    expect((await panggil("/kegiatan?periode=2026-13", { cookie: u.cookie })).status).toBe(422);
    expect((await panggil("/kegiatan?dari=2026-05-10&sampai=2026-05-01", { cookie: u.cookie })).status).toBe(422);
  });
});

describe("pencarian nama pegawai", () => {
  test("kata kunci mencocokkan nama penanggung jawab, di daftar kegiatan dan ringkasan pantau", async () => {
    const pemilik = await buatPengguna();
    const k = await buatKegiatan(pemilik.cookie, await isiKegiatan(pemilik.pegawaiId!));
    const { nama } = await prisma.pegawai.findUniqueOrThrow({ where: { id: pemilik.pegawaiId }, select: { nama: true } });
    const pimpinan = await buatPengguna({ role: "PIMPINAN" });
    const daftar = await panggil(`/kegiatan?q=${encodeURIComponent(nama)}&pageSize=100`, { cookie: pimpinan.cookie });
    expect(daftar.data.items.map((x: { id: number }) => x.id)).toContain(k.id);
    const ringkasan = await panggil(`/pantau/ringkasan?q=${encodeURIComponent(nama)}`, { cookie: pimpinan.cookie });
    expect(ringkasan.status).toBe(200);
    expect(ringkasan.data.total).toBe(1);
  });
});

describe("draf kegiatan", () => {
  test("simpan, ubah, lihat daftar, lalu terhapus otomatis saat kegiatan dicatat", async () => {
    const u = await buatPengguna();
    const draf = await panggil("/draf-kegiatan", { cookie: u.cookie, json: { isi: { judul: "Draf rapat", tanggalMulai: "2026-12-01" } } });
    expect(draf.status).toBe(201);
    const ubah = await panggil(`/draf-kegiatan/${draf.data.id}`, { method: "PUT", cookie: u.cookie, json: { isi: { judul: "Draf rapat 2" } } });
    expect(ubah.data.isi).toEqual({ judul: "Draf rapat 2" });
    expect((await panggil("/draf-kegiatan", { cookie: u.cookie })).data).toEqual([
      { id: draf.data.id, judul: "Draf rapat 2", tanggalMulai: null, updatedAt: ubah.data.updatedAt },
    ]);

    await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { drafId: draf.data.id }));
    expect((await panggil("/draf-kegiatan", { cookie: u.cookie })).data).toEqual([]);
  });

  test("draf orang lain tidak terlihat dan tidak bisa dipakai", async () => {
    const u = await buatPengguna();
    const lain = await buatPengguna();
    const draf = await panggil("/draf-kegiatan", { cookie: u.cookie, json: { isi: { judul: "Rahasia" } } });
    expect((await panggil(`/draf-kegiatan/${draf.data.id}`, { cookie: lain.cookie })).status).toBe(404);
    expect((await panggil(`/draf-kegiatan/${draf.data.id}`, { method: "DELETE", cookie: lain.cookie })).status).toBe(404);
    const pakai = await panggil("/kegiatan", { cookie: lain.cookie, json: await isiKegiatan(lain.pegawaiId!, { drafId: draf.data.id }) });
    expect(pakai.status).toBe(404);
  });

  test("maksimal 20 draf per akun", async () => {
    const u = await buatPengguna();
    for (let i = 0; i < 20; i++) expect((await panggil("/draf-kegiatan", { cookie: u.cookie, json: { isi: { judul: `D${i}` } } })).status).toBe(201);
    const ke21 = await panggil("/draf-kegiatan", { cookie: u.cookie, json: { isi: { judul: "D21" } } });
    expect(ke21.status).toBe(422);
  });

  test("PIMPINAN tidak punya draf", async () => {
    const pimpinan = await buatPengguna({ role: "PIMPINAN" });
    expect((await panggil("/draf-kegiatan", { cookie: pimpinan.cookie })).status).toBe(403);
  });
});

describe("referensi", () => {
  test("semua role bisa membaca data pilihan; NIP pegawai tidak dibagikan", async () => {
    const u = await buatPengguna();
    const res = await panggil("/referensi", { cookie: u.cookie });
    expect(res.status).toBe(200);
    expect(res.data.jenisKegiatan.some((j: { id: number }) => j.id)).toBe(true);
    expect(res.data.bidang.find((x: { kode: string }) => x.kode === "SEKSI-DATA").parentId).toBe(await idUnit("BID-TIP"));
    expect(res.data.pegawai.find((p: { id: number }) => p.id === u.pegawaiId)).not.toHaveProperty("nip");
    expect(await idJenis()).toBeGreaterThan(0);
  });
});
