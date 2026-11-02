// Uji data master: unit kerja (aturan induk, kode otomatis, nonaktif), jenis unit, jenis kegiatan, pegawai
import { describe, expect, test } from "bun:test";
import { prisma } from "@/lib/prisma";
import { buatBidang, buatPengguna, formBerkas, idUnit, login, loginAdmin, nipAcak, panggil, SANDI } from "./helpers";

const kodeAcak = () => crypto.randomUUID().slice(0, 6);

describe("unit kerja", () => {
  test("kode unit dibuat otomatis dari jenis dan singkatan nama, dan tetap unik", async () => {
    const admin = await loginAdmin();
    const nama = `Bidang Statistik Sektoral ${kodeAcak()}`;
    const a = await panggil("/admin/unit-kerja", { cookie: admin, json: { nama, jenisUnitId: 2, parentId: null } });
    const b = await panggil("/admin/unit-kerja", { cookie: admin, json: { nama: `${nama} Dua`, jenisUnitId: 2, parentId: null } });
    expect(a.status).toBe(201);
    const unit = await prisma.unitKerja.findMany({ where: { id: { in: [a.data.id, b.data.id] } }, orderBy: { id: "asc" } });
    expect(unit[0]!.kode).toStartWith("BID-SS");
    expect(new Set(unit.map((u) => u.kode)).size).toBe(2);
  });

  test("seksi wajib di bawah bidang; bidang tidak boleh punya induk", async () => {
    const admin = await loginAdmin();
    const tanpaInduk = await panggil("/admin/unit-kerja", { cookie: admin, json: { nama: "Seksi X", jenisUnitId: 5, parentId: null } });
    expect(tanpaInduk.status).toBe(422);
    expect(tanpaInduk.data.details[0].field).toBe("parentId");
    const indukSalah = await panggil("/admin/unit-kerja", { cookie: admin, json: { nama: "Seksi X", jenisUnitId: 5, parentId: await idUnit("SEKSI-DATA") } });
    expect(indukSalah.data.details[0].message).toBe("Induk sub bidang harus bidang");
    const bidangBerinduk = await panggil("/admin/unit-kerja", { cookie: admin, json: { nama: "Bidang X", jenisUnitId: 2, parentId: await idUnit("BID-TIP") } });
    expect(bidangBerinduk.status).toBe(422);
    const sah = await panggil("/admin/unit-kerja", { cookie: admin, json: { nama: `Seksi Uji ${kodeAcak()}`, jenisUnitId: 5, parentId: await idUnit("BID-TIP") } });
    expect(sah.status).toBe(201);
  });

  test("kode unit yang sudah dipakai ditolak 422", async () => {
    const admin = await loginAdmin();
    const res = await panggil("/admin/unit-kerja", { cookie: admin, json: { kode: "BID-TIP", nama: "Duplikat", jenisUnitId: 2, parentId: null } });
    expect(res.status).toBe(422);
    expect(res.data.details[0].field).toBe("kode");
  });

  test("unit tidak bisa dinonaktifkan selama masih punya pegawai aktif", async () => {
    const admin = await loginAdmin();
    const bidang = await buatBidang();
    const p = await panggil("/admin/pegawai", { cookie: admin, json: { nama: "Pegawai Unit", unitKerjaId: bidang.id } });
    const isi = { nama: bidang.nama, jenisUnitId: 2, parentId: null, aktif: false };
    expect((await panggil(`/admin/unit-kerja/${bidang.id}`, { method: "PATCH", cookie: admin, json: isi })).status).toBe(422);

    await panggil(`/admin/pegawai/${p.data.id}`, { method: "PATCH", cookie: admin, json: { nama: "Pegawai Unit", unitKerjaId: bidang.id, aktif: false } });
    expect((await panggil(`/admin/unit-kerja/${bidang.id}`, { method: "PATCH", cookie: admin, json: isi })).status).toBe(200);

    const audit = await panggil(`/audit-log?entitas=unit_kerja&aksi=nonaktifkan`, { cookie: admin });
    expect(audit.data.items.some((a: { entitasId: string }) => a.entitasId === String(bidang.id))).toBe(true);
    const pegawaiBaru = await panggil("/admin/pegawai", { cookie: admin, json: { nama: "Masuk Unit Nonaktif", unitKerjaId: bidang.id } });
    expect(pegawaiBaru.status).toBe(422);
  });

  test("daftar unit menghitung pegawai aktif", async () => {
    const admin = await loginAdmin();
    const bidang = await buatBidang();
    await buatPengguna({ unitId: bidang.id });
    const daftar = await panggil("/admin/unit-kerja", { cookie: admin });
    expect(daftar.data.find((u: { id: number }) => u.id === bidang.id)).toMatchObject({ jenis: "Bidang", induk: null, jumlahPegawaiAktif: 1 });
  });
});

describe("jenis unit dan jenis kegiatan", () => {
  test("jenis unit tidak boleh menjadi induk dari dirinya sendiri secara melingkar", async () => {
    const admin = await loginAdmin();
    const a = await panggil("/admin/jenis-unit", { cookie: admin, json: { nama: `Jenis A ${kodeAcak()}`, indukJenisId: null } });
    const b = await panggil("/admin/jenis-unit", { cookie: admin, json: { nama: `Jenis B ${kodeAcak()}`, indukJenisId: a.data.id } });
    expect(b.status).toBe(201);
    const lingkar = await panggil(`/admin/jenis-unit/${a.data.id}`, { method: "PATCH", cookie: admin, json: { nama: "Jenis A ubah", indukJenisId: b.data.id } });
    expect(lingkar.status).toBe(422);
    expect(lingkar.data.details[0].field).toBe("indukJenisId");
  });

  test("jenis kegiatan: nama kembar ditolak, yang nonaktif hilang dari pilihan formulir", async () => {
    const admin = await loginAdmin();
    expect((await panggil("/admin/jenis-kegiatan", { cookie: admin, json: { nama: "Rapat" } })).status).toBe(422);
    const nama = `Jenis Uji ${kodeAcak()}`;
    const baru = await panggil("/admin/jenis-kegiatan", { cookie: admin, json: { nama } });
    const ref = async () => (await panggil("/referensi", { cookie: admin })).data.jenisKegiatan.map((j: { nama: string }) => j.nama);
    expect(await ref()).toContain(nama);
    await panggil(`/admin/jenis-kegiatan/${baru.data.id}`, { method: "PATCH", cookie: admin, json: { nama, aktif: false } });
    expect(await ref()).not.toContain(nama);
    const daftar = await panggil("/admin/jenis-kegiatan", { cookie: admin });
    expect(daftar.data.find((j: { id: number }) => j.id === baru.data.id)).toMatchObject({ aktif: false, jumlahKegiatan: 0 });
  });
});

describe("pegawai", () => {
  test("NIP tidak sah atau sudah terdaftar ditolak 422", async () => {
    const admin = await loginAdmin();
    const unitKerjaId = await idUnit("SEKSI-DATA");
    expect((await panggil("/admin/pegawai", { cookie: admin, json: { nip: "198702302011012002", nama: "X", unitKerjaId } })).status).toBe(422);
    const nip = nipAcak();
    await panggil("/admin/pegawai", { cookie: admin, json: { nip, nama: "Pemilik NIP", unitKerjaId } });
    const kembar = await panggil("/admin/pegawai", { cookie: admin, json: { nip, nama: "Peniru", unitKerjaId } });
    expect(kembar.status).toBe(422);
    expect(kembar.data.details[0].message).toBe("NIP sudah terdaftar atas nama Pemilik NIP");
  });

  test("filter akun=tanpa hanya menampilkan pegawai yang belum punya akun", async () => {
    const admin = await loginAdmin();
    const bidang = await buatBidang();
    await buatPengguna({ unitId: bidang.id });
    await panggil("/admin/pegawai", { cookie: admin, json: { nama: "Belum Punya Akun", unitKerjaId: bidang.id } });
    const daftar = await panggil(`/admin/pegawai?unit=${bidang.id}&akun=tanpa`, { cookie: admin });
    expect(daftar.data.items.map((p: { nama: string }) => p.nama)).toEqual(["Belum Punya Akun"]);
  });

  test("daftar akun: nonaktif=1 hanya akun nonaktif, nonaktif=0 menyembunyikannya", async () => {
    const admin = await loginAdmin();
    const u = await buatPengguna();
    expect((await panggil(`/admin/akun/${u.userId}/nonaktifkan`, { cookie: admin, json: { alasan: "uji" } })).status).toBe(200);
    expect((await panggil(`/admin/akun?q=${u.email}&nonaktif=1`, { cookie: admin })).data.total).toBe(1);
    expect((await panggil(`/admin/akun?q=${u.email}&nonaktif=0`, { cookie: admin })).data.total).toBe(0);
  });

  test("daftar pegawai: yang punya nomor telepon tampil lebih dulu", async () => {
    const admin = await loginAdmin();
    const bidang = await buatBidang();
    const tanpaTelp = await buatPengguna({ unitId: bidang.id });
    const denganTelp = await buatPengguna({ unitId: bidang.id });
    expect((await panggil("/me", { method: "PATCH", cookie: denganTelp.cookie, json: { kontak: "0812-1111-2222" } })).status).toBe(200);
    const daftar = await panggil(`/admin/pegawai?unit=${bidang.id}`, { cookie: admin });
    expect(daftar.data.items.map((p: { id: number }) => p.id)).toEqual([denganTelp.pegawaiId, tanpaTelp.pegawaiId]);
    const hal2 = await panggil(`/admin/pegawai?unit=${bidang.id}&page=2&pageSize=1`, { cookie: admin });
    expect(hal2.data.items.map((p: { id: number }) => p.id)).toEqual([tanpaTelp.pegawaiId]);
  });

  test("pegawai tanpa NIP (non-ASN) boleh", async () => {
    const admin = await loginAdmin();
    const res = await panggil("/admin/pegawai", { cookie: admin, json: { nama: "Honorer", unitKerjaId: await idUnit("SEKSI-DATA") } });
    expect(res.status).toBe(201);
  });

  test("mengubah NIP dan nama pegawai: nama akun ikut berubah, login tetap dengan email", async () => {
    const u = await buatPengguna();
    const admin = await loginAdmin();
    const nipBaru = nipAcak();
    const ubah = await panggil(`/admin/pegawai/${u.pegawaiId}`, { method: "PATCH", cookie: admin, json: { nip: nipBaru, nama: "Ganti NIP", unitKerjaId: await idUnit("SEKSI-DATA") } });
    expect(ubah.status).toBe(200);
    const masuk = await login(u.email, SANDI);
    expect(masuk.status).toBe(200);
    expect((await panggil("/me", { cookie: masuk.cookie })).data).toMatchObject({ name: "Ganti NIP", pegawai: { nip: nipBaru } });
  });

  test("filter unit mencakup sub-unit, dan pencarian NIP", async () => {
    const admin = await loginAdmin();
    const u = await buatPengguna();
    const lewatInduk = await panggil(`/admin/pegawai?unit=${await idUnit("BID-TIP")}&q=${u.nip}`, { cookie: admin });
    expect(lewatInduk.data.total).toBe(1);
    expect(lewatInduk.data.items[0].akun).toMatchObject({ email: u.email, aktif: true });
    const unitLain = await panggil(`/admin/pegawai?unit=${await idUnit("BID-APTIKA")}&q=${u.nip}`, { cookie: admin });
    expect(unitLain.data.total).toBe(0);
  });
});
