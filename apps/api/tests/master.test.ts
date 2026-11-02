// Uji data master: unit kerja (aturan induk, kode otomatis, nonaktif), jenis unit, jenis kegiatan, pegawai, impor Excel
import { describe, expect, test } from "bun:test";
import ExcelJS from "exceljs";
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
    const indukSalah = await panggil("/admin/unit-kerja", { cookie: admin, json: { nama: "Seksi X", jenisUnitId: 5, parentId: await idUnit("SEKRETARIAT") } });
    expect(indukSalah.data.details[0].message).toBe("Induk seksi harus bidang");
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
    const unitLain = await panggil(`/admin/pegawai?unit=${await idUnit("SEKRETARIAT")}&q=${u.nip}`, { cookie: admin });
    expect(unitLain.data.total).toBe(0);
  });
});

describe("impor pegawai dari Excel", () => {
  // Membuat berkas Excel impor dengan kolom NIP, Nama, Jabatan, Unit kerja
  async function berkasExcel(baris: (string | number)[][]) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Pegawai");
    ws.addRow(["NIP", "Nama", "Jabatan", "Unit kerja"]);
    for (const b of baris) ws.addRow(b);
    return new Uint8Array(await wb.xlsx.writeBuffer());
  }

  test("templat bisa diunduh", async () => {
    const admin = await loginAdmin();
    const res = await panggil("/admin/pegawai/impor/templat", { cookie: admin });
    expect(res.status).toBe(200);
    expect(String.fromCharCode(res.data[0], res.data[1])).toBe("PK");
  });

  test("pratinjau menandai baris baru, perbarui, dan galat; simpan hanya baris yang sah", async () => {
    const admin = await loginAdmin();
    const lama = await buatPengguna();
    const nipBaru = nipAcak();
    const isi = await berkasExcel([
      [nipBaru, "Pegawai Impor Baru", "Staf", "SEKSI-DATA"],
      [lama.nip!, "Nama Diperbarui", "Analis", "Seksi Pengelolaan Data dan Persediaan"],
      [nipAcak(), "Unit Salah", "", "Bidang Teknologi"],
      [nipBaru, "NIP Kembar", "", "SEKSI-DATA"],
      [198702152011012002, "NIP Angka", "", "SEKSI-DATA"],
    ]);

    const pratinjau = await panggil("/admin/pegawai/impor", { cookie: admin, form: formBerkas(isi, "pegawai.xlsx") });
    expect(pratinjau.status).toBe(200);
    expect(pratinjau.data.disimpan).toBe(false);
    expect(pratinjau.data.ringkasan).toEqual({ total: 5, baru: 1, perbarui: 1, sama: 0, galat: 3 });
    expect(pratinjau.data.baris.map((b: { baris: number; status: string }) => [b.baris, b.status])).toEqual([
      [2, "baru"],
      [3, "perbarui"],
      [4, "galat"],
      [5, "galat"],
      [6, "galat"],
    ]);
    expect(pratinjau.data.baris[2].pesan[0]).toContain('Maksud Anda "Bidang Teknologi Informasi dan Persandian"?');
    expect(pratinjau.data.baris[3].pesan[0]).toBe("NIP sama dengan baris 2");
    expect(pratinjau.data.baris[4].pesan[0]).toContain("tersimpan sebagai angka");
    expect(await prisma.pegawai.findUnique({ where: { nip: nipBaru } })).toBeNull();

    const fd = formBerkas(isi, "pegawai.xlsx");
    fd.append("simpan", "1");
    const simpan = await panggil("/admin/pegawai/impor", { cookie: admin, form: fd });
    expect(simpan.data.disimpan).toBe(true);
    expect(await prisma.pegawai.findUnique({ where: { nip: nipBaru } })).toMatchObject({ nama: "Pegawai Impor Baru", jabatan: "Staf" });
    expect(await prisma.pegawai.findUnique({ where: { nip: lama.nip! } })).toMatchObject({ nama: "Nama Diperbarui", jabatan: "Analis" });

    const ulang = await panggil("/admin/pegawai/impor", { cookie: admin, form: formBerkas(isi, "pegawai.xlsx") });
    expect(ulang.data.ringkasan).toMatchObject({ baru: 0, perbarui: 0, sama: 2 });
  });

  test("berkas bukan Excel ditolak 415", async () => {
    const admin = await loginAdmin();
    const res = await panggil("/admin/pegawai/impor", { cookie: admin, form: formBerkas(new TextEncoder().encode("nip,nama"), "pegawai.csv") });
    expect(res.status).toBe(415);
  });
});
