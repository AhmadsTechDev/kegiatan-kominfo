// Uji data master: bidang dan sub bidang (aturan induk, kode otomatis, nonaktif), jenis kegiatan, pegawai
import { describe, expect, test } from "bun:test";
import { asc, eq, inArray } from "drizzle-orm";
import { bidang as tabelBidang } from "@/db/schema";
import { db } from "@/lib/db";
import { buatBidang, buatKegiatan, buatPengguna, formBerkas, idUnit, isiKegiatan, login, loginAdmin, nipAcak, panggil, SANDI } from "./helpers";

const kodeAcak = () => crypto.randomUUID().slice(0, 6);

describe("bidang", () => {
  test("kode dibuat otomatis dari tingkat dan singkatan nama, dan tetap unik", async () => {
    const admin = await loginAdmin();
    const nama = `Bidang Statistik Sektoral ${kodeAcak()}`;
    const a = await panggil("/admin/bidang", { cookie: admin, json: { nama, parentId: null } });
    const b = await panggil("/admin/bidang", { cookie: admin, json: { nama: `${nama} Dua`, parentId: null } });
    expect(a.status).toBe(201);
    const unit = await db.select().from(tabelBidang).where(inArray(tabelBidang.id, [a.data.id, b.data.id])).orderBy(asc(tabelBidang.id));
    expect(unit[0]!.kode).toStartWith("BID-SS");
    expect(new Set(unit.map((u) => u.kode)).size).toBe(2);
  });

  test("sub bidang wajib di bawah bidang (maksimal dua tingkat)", async () => {
    const admin = await loginAdmin();
    const indukSalah = await panggil("/admin/bidang", { cookie: admin, json: { nama: "Sub X", parentId: await idUnit("SEKSI-DATA") } });
    expect(indukSalah.status).toBe(422);
    expect(indukSalah.data.details[0].message).toBe("Induk sub bidang harus bidang");
    const indukTidakAda = await panggil("/admin/bidang", { cookie: admin, json: { nama: "Sub X", parentId: 999999 } });
    expect(indukTidakAda.status).toBe(422);
    expect(indukTidakAda.data.details[0].field).toBe("parentId");

    const sah = await panggil("/admin/bidang", { cookie: admin, json: { nama: `Sub Bidang Uji ${kodeAcak()}`, parentId: await idUnit("BID-TIP") } });
    expect(sah.status).toBe(201);
    expect((await db.select().from(tabelBidang).where(eq(tabelBidang.id, sah.data.id)))[0]!.kode).toStartWith("SUBBID-");
    const daftar = await panggil("/admin/bidang", { cookie: admin });
    expect(daftar.data.find((u: { id: number }) => u.id === sah.data.id)).toMatchObject({ jenis: "Sub bidang", induk: expect.any(String) });
  });

  test("bidang yang masih punya sub bidang tidak bisa dijadikan sub bidang", async () => {
    const admin = await loginAdmin();
    const induk = await idUnit("BID-TIP");
    const bidang = await buatBidang();
    const lain = await buatBidang();
    const ubah = await panggil(`/admin/bidang/${induk}`, { method: "PATCH", cookie: admin, json: { nama: "Bidang Teknologi Informasi dan Persandian", parentId: bidang.id } });
    expect(ubah.status).toBe(422);
    expect(ubah.data.details[0].message).toContain("masih punya sub bidang");
    const boleh = await panggil(`/admin/bidang/${lain.id}`, { method: "PATCH", cookie: admin, json: { nama: lain.nama, parentId: bidang.id } });
    expect(boleh.status).toBe(200);
  });

  test("kode unit yang sudah dipakai ditolak 422", async () => {
    const admin = await loginAdmin();
    const res = await panggil("/admin/bidang", { cookie: admin, json: { kode: "BID-TIP", nama: "Duplikat", parentId: null } });
    expect(res.status).toBe(422);
    expect(res.data.details[0].field).toBe("kode");
  });

  test("unit tidak bisa dinonaktifkan selama masih punya pegawai aktif", async () => {
    const admin = await loginAdmin();
    const bidang = await buatBidang();
    const p = await panggil("/admin/pegawai", { cookie: admin, json: { nama: "Pegawai Unit", bidangId: bidang.id } });
    const isi = { nama: bidang.nama, parentId: null, aktif: false };
    expect((await panggil(`/admin/bidang/${bidang.id}`, { method: "PATCH", cookie: admin, json: isi })).status).toBe(422);

    await panggil(`/admin/pegawai/${p.data.id}`, { method: "PATCH", cookie: admin, json: { nama: "Pegawai Unit", bidangId: bidang.id, aktif: false } });
    expect((await panggil(`/admin/bidang/${bidang.id}`, { method: "PATCH", cookie: admin, json: isi })).status).toBe(200);

    const pegawaiBaru = await panggil("/admin/pegawai", { cookie: admin, json: { nama: "Masuk Unit Nonaktif", bidangId: bidang.id } });
    expect(pegawaiBaru.status).toBe(422);
  });

  test("bidang yang belum dipakai bisa dihapus permanen", async () => {
    const admin = await loginAdmin();
    const bidang = await buatBidang();
    const daftar = await panggil("/admin/bidang", { cookie: admin });
    expect(daftar.data.find((u: { id: number }) => u.id === bidang.id).bisaDihapus).toBe(true);

    expect((await panggil(`/admin/bidang/${bidang.id}`, { method: "DELETE", cookie: admin })).status).toBe(200);
    expect(await db.$count(tabelBidang, eq(tabelBidang.id, bidang.id))).toBe(0);
    expect((await panggil(`/admin/bidang/${bidang.id}`, { method: "DELETE", cookie: admin })).status).toBe(404);
  });

  test("bidang yang masih punya pegawai, kegiatan, atau sub bidang tidak bisa dihapus", async () => {
    const admin = await loginAdmin();
    const denganPegawai = await buatBidang();
    const u = await buatPengguna({ unitId: denganPegawai.id });
    const pegawai = await panggil(`/admin/bidang/${denganPegawai.id}`, { method: "DELETE", cookie: admin });
    expect(pegawai.status).toBe(422);
    expect(pegawai.data.message).toContain("pegawai");

    await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId));
    await panggil(`/admin/pegawai/${u.pegawaiId}`, { method: "PATCH", cookie: admin, json: { nama: "Pegawai Pindah", bidangId: await idUnit("BID-TIP"), aktif: false } });
    const kegiatan = await panggil(`/admin/bidang/${denganPegawai.id}`, { method: "DELETE", cookie: admin });
    expect(kegiatan.status).toBe(422);
    expect(kegiatan.data.message).toContain("kegiatan");

    const induk = await buatBidang();
    await panggil("/admin/bidang", { cookie: admin, json: { nama: `Sub Hapus ${kodeAcak()}`, parentId: induk.id } });
    const sub = await panggil(`/admin/bidang/${induk.id}`, { method: "DELETE", cookie: admin });
    expect(sub.status).toBe(422);
    expect(sub.data.message).toContain("sub bidang");
    const daftar = await panggil("/admin/bidang", { cookie: admin });
    expect(daftar.data.find((x: { id: number }) => x.id === induk.id).bisaDihapus).toBe(false);
  });

  test("daftar unit menghitung pegawai aktif", async () => {
    const admin = await loginAdmin();
    const bidang = await buatBidang();
    await buatPengguna({ unitId: bidang.id });
    const daftar = await panggil("/admin/bidang", { cookie: admin });
    expect(daftar.data.find((u: { id: number }) => u.id === bidang.id)).toMatchObject({ jenis: "Bidang", induk: null, jumlahPegawaiAktif: 1 });
  });
});

describe("jenis kegiatan", () => {
  test("tabel jenis unit sudah dihapus: endpoint lamanya tidak ada", async () => {
    const admin = await loginAdmin();
    expect((await panggil("/admin/jenis-unit", { cookie: admin })).status).toBe(404);
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
    const bidangId = await idUnit("SEKSI-DATA");
    expect((await panggil("/admin/pegawai", { cookie: admin, json: { nip: "198702302011012002", nama: "X", bidangId } })).status).toBe(422);
    const nip = nipAcak();
    await panggil("/admin/pegawai", { cookie: admin, json: { nip, nama: "Pemilik NIP", bidangId } });
    const kembar = await panggil("/admin/pegawai", { cookie: admin, json: { nip, nama: "Peniru", bidangId } });
    expect(kembar.status).toBe(422);
    expect(kembar.data.details[0].message).toBe("NIP sudah terdaftar atas nama Pemilik NIP");
  });

  test("filter akun=tanpa dan akun=ada memisahkan pegawai menurut kepemilikan akun", async () => {
    const admin = await loginAdmin();
    const bidang = await buatBidang();
    const u = await buatPengguna({ unitId: bidang.id });
    await panggil("/admin/pegawai", { cookie: admin, json: { nama: "Belum Punya Akun", bidangId: bidang.id } });
    const daftar = await panggil(`/admin/pegawai?unit=${bidang.id}&akun=tanpa`, { cookie: admin });
    expect(daftar.data.items.map((p: { nama: string }) => p.nama)).toEqual(["Belum Punya Akun"]);
    const berakun = await panggil(`/admin/pegawai?unit=${bidang.id}&akun=ada`, { cookie: admin });
    expect(berakun.data.items.map((p: { id: number }) => p.id)).toEqual([u.pegawaiId]);
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

  test("admin mengubah nomor telepon pegawai berakun; pegawai tanpa akun ditolak 422", async () => {
    const admin = await loginAdmin();
    const bidang = await buatBidang();
    const u = await buatPengguna({ unitId: bidang.id });
    const isi = { nama: "Punya Telp", bidangId: bidang.id };
    expect((await panggil(`/admin/pegawai/${u.pegawaiId}`, { method: "PATCH", cookie: admin, json: { ...isi, kontak: "0812 3333 4444" } })).status).toBe(200);
    expect((await panggil("/me", { cookie: u.cookie })).data.kontak).toBe("0812 3333 4444");
    expect((await panggil(`/admin/pegawai/${u.pegawaiId}`, { method: "PATCH", cookie: admin, json: { ...isi, kontak: "telp-ku" } })).status).toBe(422);
    // Tanpa field kontak, nomor lama tetap
    await panggil(`/admin/pegawai/${u.pegawaiId}`, { method: "PATCH", cookie: admin, json: isi });
    expect((await panggil("/me", { cookie: u.cookie })).data.kontak).toBe("0812 3333 4444");

    const tanpaAkun = await panggil("/admin/pegawai", { cookie: admin, json: { nama: "Belum Berakun", bidangId: bidang.id } });
    const tolak = await panggil(`/admin/pegawai/${tanpaAkun.data.id}`, { method: "PATCH", cookie: admin, json: { nama: "Belum Berakun", bidangId: bidang.id, kontak: "0812" } });
    expect(tolak.status).toBe(422);
    expect(tolak.data.details[0].field).toBe("kontak");
  });

  test("role bawaan undangan tersimpan di pegawai tanpa akun, termasuk ADMIN", async () => {
    const admin = await loginAdmin();
    const bidang = await buatBidang();
    const baru = await panggil("/admin/pegawai", { cookie: admin, json: { nama: "Calon Pimpinan", bidangId: bidang.id } });
    const ambil = async () => (await panggil(`/admin/pegawai?unit=${bidang.id}&akun=tanpa`, { cookie: admin })).data.items[0];
    expect((await ambil()).roleUndangan).toBe("PEGAWAI");
    const isi = { nama: "Calon Pimpinan", bidangId: bidang.id };
    expect((await panggil(`/admin/pegawai/${baru.data.id}`, { method: "PATCH", cookie: admin, json: { ...isi, roleUndangan: "PIMPINAN" } })).status).toBe(200);
    expect((await ambil()).roleUndangan).toBe("PIMPINAN");
    expect((await panggil(`/admin/pegawai/${baru.data.id}`, { method: "PATCH", cookie: admin, json: { ...isi, roleUndangan: "SUPER" } })).status).toBe(422);
    expect((await panggil(`/admin/pegawai/${baru.data.id}`, { method: "PATCH", cookie: admin, json: { ...isi, roleUndangan: "ADMIN" } })).status).toBe(200);
    expect((await ambil()).roleUndangan).toBe("ADMIN");
    await panggil(`/admin/pegawai/${baru.data.id}`, { method: "PATCH", cookie: admin, json: { ...isi, roleUndangan: "PIMPINAN" } });
    // Tanpa field roleUndangan, pilihan lama tidak berubah
    await panggil(`/admin/pegawai/${baru.data.id}`, { method: "PATCH", cookie: admin, json: { ...isi, nip: null } });
    expect((await ambil()).roleUndangan).toBe("PIMPINAN");
  });

  test("hapus pegawai: hanya yang belum punya akun dan belum dipakai kegiatan", async () => {
    const admin = await loginAdmin();
    const bidang = await buatBidang();
    const baru = await panggil("/admin/pegawai", { cookie: admin, json: { nama: "Salah Input", bidangId: bidang.id } });
    expect((await panggil(`/admin/pegawai/${baru.data.id}`, { method: "DELETE", cookie: admin })).status).toBe(200);
    expect((await panggil(`/admin/pegawai?unit=${bidang.id}&akun=tanpa`, { cookie: admin })).data.total).toBe(0);

    const u = await buatPengguna({ unitId: bidang.id });
    const berakun = await panggil(`/admin/pegawai/${u.pegawaiId}`, { method: "DELETE", cookie: admin });
    expect(berakun.status).toBe(422);
    expect((await panggil(`/admin/pegawai/${u.pegawaiId}`, { method: "DELETE", cookie: u.cookie })).status).toBe(403);
    expect((await panggil("/admin/pegawai/999999", { method: "DELETE", cookie: admin })).status).toBe(404);
  });

  test("pegawai tanpa NIP (non-ASN) boleh", async () => {
    const admin = await loginAdmin();
    const res = await panggil("/admin/pegawai", { cookie: admin, json: { nama: "Honorer", bidangId: await idUnit("SEKSI-DATA") } });
    expect(res.status).toBe(201);
  });

  test("mengubah NIP dan nama pegawai: nama akun ikut berubah, login tetap dengan email", async () => {
    const u = await buatPengguna();
    const admin = await loginAdmin();
    const nipBaru = nipAcak();
    const ubah = await panggil(`/admin/pegawai/${u.pegawaiId}`, { method: "PATCH", cookie: admin, json: { nip: nipBaru, nama: "Ganti NIP", bidangId: await idUnit("SEKSI-DATA") } });
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
    const unitLain = await panggil(`/admin/pegawai?unit=${await idUnit("BID-EGOV")}&q=${u.nip}`, { cookie: admin });
    expect(unitLain.data.total).toBe(0);
  });
});
