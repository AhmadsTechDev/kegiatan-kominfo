// Uji manajemen akun oleh admin, permintaan akun dari halaman login, dan audit log
import { describe, expect, test } from "bun:test";
import { prisma } from "@/lib/prisma";
import { aktifkan, buatKegiatan, buatPengguna, emailAcak, idUnit, ipAcak, isiAkun, isiKegiatan, login, loginAdmin, nipAcak, panggil, SANDI, tokenTerakhir } from "./helpers";
import { kotakSurat, suratTerakhir } from "./surel-palsu";

// Id akun admin bawaan
async function idAdmin() {
  return (await panggil("/me", { cookie: await loginAdmin() })).data.id as string;
}

// Isian form akun untuk akun yang sudah ada (role/email bisa diganti)
async function isiDari(u: { email: string; nip: string }, ubah: Record<string, unknown> = {}) {
  return isiAkun({ name: "Nama Tetap", email: u.email, nip: u.nip, ...ubah });
}

describe("membuat akun", () => {
  test("akun dibuat tanpa kata sandi: MENUNGGU_AKTIVASI, pegawai ikut dibuat, kata sandi kiriman diabaikan", async () => {
    const admin = await loginAdmin();
    const nip = nipAcak();
    const isi = await isiAkun({ name: "Akun Baru", nip, jabatan: "Analis Data", role: "PIMPINAN", password: "sandidariadmin123" });
    const res = await panggil("/admin/akun", { cookie: admin, json: isi });
    expect(res.status).toBe(201);
    expect(await prisma.account.count({ where: { userId: res.data.id } })).toBe(0);
    expect((await login(isi.email as string, "sandidariadmin123")).status).toBe(401);

    const detail = await panggil(`/admin/akun/${res.data.id}`, { cookie: admin });
    expect(detail.data).toMatchObject({
      name: "Akun Baru",
      email: isi.email,
      role: "PIMPINAN",
      status: "MENUNGGU_AKTIVASI",
      emailVerified: false,
      pegawai: { nip, nama: "Akun Baru", jabatan: "Analis Data", bidang: { nama: "Seksi Pengelolaan Data dan Persediaan" } },
    });
    expect(new Date(detail.data.undangan.kedaluwarsa).getTime()).toBeGreaterThan(Date.now());
    expect(JSON.stringify(detail.data)).not.toMatch(/password|token/i);
  });

  test("NIP opsional; NIP pegawai terdaftar tanpa akun dipakai ulang, bukan diduplikasi", async () => {
    const admin = await loginAdmin();
    expect((await panggil("/admin/akun", { cookie: admin, json: await isiAkun({ nip: null }) })).status).toBe(201);
    expect((await panggil("/admin/akun", { cookie: admin, json: await isiAkun({ nip: "" }) })).status).toBe(201);

    const nip = nipAcak();
    const p = await panggil("/admin/pegawai", { cookie: admin, json: { nip, nama: "Sudah Terdaftar", bidangId: await idUnit("SEKSI-DATA") } });
    const res = await panggil("/admin/akun", { cookie: admin, json: await isiAkun({ name: "Sudah Terdaftar", nip, jabatan: "Pranata Komputer" }) });
    expect(res.status).toBe(201);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: res.data.id } })).pegawaiId).toBe(p.data.id);
    expect(await prisma.pegawai.count({ where: { nip } })).toBe(1);
    expect((await prisma.pegawai.findUniqueOrThrow({ where: { id: p.data.id } })).jabatan).toBe("Pranata Komputer");
  });

  test("email kembar, NIP/pegawai yang sudah punya akun, jabatan kosong, dan unit tidak ada ditolak 422", async () => {
    const admin = await loginAdmin();
    const u = await buatPengguna();
    const coba = async (ubah: Record<string, unknown>) => (await panggil("/admin/akun", { cookie: admin, json: await isiAkun(ubah) })).data;
    expect((await coba({ email: u.email.toUpperCase() })).details[0].field).toBe("email");
    expect((await coba({ nip: u.nip })).details[0]).toMatchObject({ field: "nip", message: `Pegawai ini sudah tertaut ke akun ${u.email}` });
    expect((await coba({ pegawaiId: u.pegawaiId })).details[0].field).toBe("pegawaiId");
    expect((await coba({ jabatan: "" })).details[0].field).toBe("jabatan");
    expect((await coba({ bidangId: 999999 })).details[0].field).toBe("bidangId");
    expect((await coba({ nip: "12345" })).details[0].field).toBe("nip");
  });

  test("email undangan gagal tidak membatalkan akun; galatnya dikembalikan agar admin bisa kirim ulang", async () => {
    const admin = await loginAdmin();
    const { mock } = await import("bun:test");
    const mailer = await import("@/lib/mailer");
    const asli = mailer.kirimEmail;
    mock.module("@/lib/mailer", () => ({ kirimEmail: async () => Promise.reject(new Error("SMTP mati")) }));
    try {
      const isi = await isiAkun();
      const res = await panggil("/admin/akun", { cookie: admin, json: isi });
      expect(res.status).toBe(201);
      expect(res.data.undangan.galat).toContain("gagal dikirim");
      expect(await prisma.user.findUnique({ where: { email: isi.email as string } })).not.toBeNull();
    } finally {
      mock.module("@/lib/mailer", () => ({ kirimEmail: asli }));
    }
  });
});

describe("daftar dan detail akun", () => {
  test("cari nama/email/NIP, saring per role dan status", async () => {
    const admin = await loginAdmin();
    const pimpinan = await buatPengguna({ role: "PIMPINAN" });
    const cari = (q: string, tambahan = "") => panggil(`/admin/akun?q=${encodeURIComponent(q)}${tambahan}`, { cookie: admin });

    expect((await cari(pimpinan.nip)).data.items[0].email).toBe(pimpinan.email);
    const perRole = await cari(pimpinan.email, "&role=PIMPINAN&status=AKTIF");
    expect(perRole.data.items).toHaveLength(1);
    expect(perRole.data.items[0]).toMatchObject({ role: "PIMPINAN", status: "AKTIF", terkunci: false, bisaDihapus: true });
    expect((await cari(pimpinan.email, "&status=MENUNGGU_AKTIVASI")).data.total).toBe(0);
    expect((await panggil("/admin/akun?role=ADMIN", { cookie: admin })).data.items.map((a: { role: string }) => a.role)).toContain("ADMIN");

    await panggil(`/admin/akun/${pimpinan.userId}/nonaktifkan`, { cookie: admin, json: {} });
    const nonaktif = await cari(pimpinan.email, "&status=NONAKTIF");
    expect(nonaktif.data.items[0]).toMatchObject({ status: "NONAKTIF", banned: true, banReason: "Dinonaktifkan admin" });
    const pulih = await panggil(`/admin/akun/${pimpinan.userId}/aktifkan`, { method: "POST", cookie: admin });
    expect(pulih.data.status).toBe("AKTIF");
    expect((await login(pimpinan.email, SANDI)).status).toBe(200);

    const menunggu = await panggil("/admin/akun", { cookie: admin, json: await isiAkun() });
    const status = (await panggil(`/admin/akun?status=MENUNGGU_AKTIVASI&pageSize=100`, { cookie: admin })).data.items;
    expect(status.some((a: { id: string }) => a.id === menunggu.data.id)).toBe(true);
    expect(status.every((a: { status: string }) => a.status === "MENUNGGU_AKTIVASI")).toBe(true);
    expect((await panggil("/admin/akun?status=SALAH", { cookie: admin })).status).toBe(422);
  });

  test("detail akun aktif berisi sesi (tanpa token) dan riwayat; 404 bila tidak ada", async () => {
    const admin = await loginAdmin();
    const u = await buatPengguna();
    const detail = await panggil(`/admin/akun/${u.userId}`, { cookie: admin });
    expect(detail.data).toMatchObject({ status: "AKTIF", emailVerified: true, undangan: null, bisaDihapus: true });
    expect(detail.data.sesi).toHaveLength(1);
    expect(Object.keys(detail.data.sesi[0]).sort()).toEqual(["createdAt", "expiresAt", "id", "ipAddress", "updatedAt", "userAgent"]);
    expect(detail.data.riwayat.map((r: { aksi: string }) => r.aksi)).toEqual(expect.arrayContaining(["login", "aktivasi", "buat"]));
    expect((await panggil("/admin/akun/tidak-ada", { cookie: admin })).status).toBe(404);
  });
});

describe("mengubah akun", () => {
  test("mengubah role mencabut sesi lama; role baru berlaku setelah login ulang", async () => {
    const admin = await loginAdmin();
    const u = await buatPengguna();
    const ubah = await panggil(`/admin/akun/${u.userId}`, { method: "PATCH", cookie: admin, json: await isiDari(u, { role: "PIMPINAN", jabatan: "Kepala Seksi" }) });
    expect(ubah.status).toBe(200);
    expect((await panggil("/me", { cookie: u.cookie })).status).toBe(401);
    const baru = await login(u.email, SANDI);
    expect((await panggil("/me", { cookie: baru.cookie })).data).toMatchObject({ role: "PIMPINAN", name: "Nama Tetap", pegawai: { jabatan: "Kepala Seksi" } });
  });

  test("mengganti email akun yang belum diaktivasi mengirim undangan baru dan membatalkan yang lama", async () => {
    const admin = await loginAdmin();
    const isi = await isiAkun();
    const buat = await panggil("/admin/akun", { cookie: admin, json: isi });
    const tokenLama = tokenTerakhir(isi.email as string);
    const emailBaru = emailAcak("koreksi");
    const ubah = await panggil(`/admin/akun/${buat.data.id}`, { method: "PATCH", cookie: admin, json: { ...isi, email: emailBaru } });
    expect(ubah.data.undangan).toEqual({ email: emailBaru, galat: null });
    expect((await panggil(`/aktivasi?token=${tokenLama}`)).status).toBe(410);
    await aktifkan(emailBaru);
    expect((await login(emailBaru, SANDI)).status).toBe(200);
  });

  test("admin tidak bisa mengubah role, menonaktifkan, atau menghapus akunnya sendiri", async () => {
    const admin = await loginAdmin();
    const id = await idAdmin();
    const ubah = await panggil(`/admin/akun/${id}`, { method: "PATCH", cookie: admin, json: await isiAkun({ name: "Administrator", email: process.env.SEED_ADMIN_EMAIL, role: "PEGAWAI" }) });
    expect(ubah.status).toBe(422);
    expect((await panggil(`/admin/akun/${id}/nonaktifkan`, { cookie: admin, json: {} })).status).toBe(422);
    expect((await panggil(`/admin/akun/${id}`, { method: "DELETE", cookie: admin })).status).toBe(422);
  });

  test("akun tanpa data kegiatan bisa dihapus (token ikut terhapus), walau pernah login; yang membuat kegiatan tidak", async () => {
    const admin = await loginAdmin();
    const isi = await isiAkun();
    const akun = await panggil("/admin/akun", { cookie: admin, json: isi });
    expect((await panggil(`/admin/akun?q=${encodeURIComponent(isi.email as string)}`, { cookie: admin })).data.items[0].bisaDihapus).toBe(true);
    expect((await panggil(`/admin/akun/${akun.data.id}`, { method: "DELETE", cookie: admin })).status).toBe(200);
    expect(await prisma.user.findUnique({ where: { email: isi.email as string } })).toBeNull();
    expect(await prisma.verification.count({ where: { value: akun.data.id } })).toBe(0);

    const pernahLogin = await buatPengguna();
    expect((await panggil(`/admin/akun/${pernahLogin.userId}`, { method: "DELETE", cookie: admin })).status).toBe(200);
    expect(await prisma.user.findUnique({ where: { id: pernahLogin.userId } })).toBeNull();

    const terpakai = await buatPengguna();
    await buatKegiatan(terpakai.cookie, await isiKegiatan(terpakai.pegawaiId));
    const hapus = await panggil(`/admin/akun/${terpakai.userId}`, { method: "DELETE", cookie: admin });
    expect(hapus.status).toBe(422);
    expect(hapus.data.message).toContain("Nonaktifkan saja");
  });
});

describe("undangan, reset sandi, dan sesi oleh admin", () => {
  test("kirim ulang undangan hanya untuk akun yang belum diaktivasi", async () => {
    const admin = await loginAdmin();
    const u = await buatPengguna();
    const aktif = await panggil(`/admin/akun/${u.userId}/kirim-ulang-undangan`, { method: "POST", cookie: admin });
    expect(aktif.status).toBe(422);
    expect(aktif.data.message).toContain("sudah aktif");
  });

  test("reset sandi admin mengirim tautan ke email pemilik, mencabut sesinya, dan tidak berlaku untuk akun menunggu", async () => {
    const admin = await loginAdmin();
    const u = await buatPengguna();
    const sebelum = kotakSurat.length;
    const res = await panggil(`/admin/akun/${u.userId}/reset-sandi`, { method: "POST", cookie: admin });
    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({ email: u.email, sesiDicabut: 1 });
    expect(kotakSurat.slice(sebelum).map((s) => s.kepada)).toEqual([u.email]);
    expect(suratTerakhir(u.email)!.subjek).toBe("Atur ulang kata sandi");
    expect((await panggil("/me", { cookie: u.cookie })).status).toBe(401);
    // Kata sandi lama tetap berlaku sampai pemiliknya membuat yang baru
    expect((await login(u.email, SANDI)).status).toBe(200);

    const menunggu = await panggil("/admin/akun", { cookie: admin, json: await isiAkun() });
    expect((await panggil(`/admin/akun/${menunggu.data.id}/reset-sandi`, { method: "POST", cookie: admin })).status).toBe(422);
  });

  test("cabut semua sesi akun", async () => {
    const admin = await loginAdmin();
    const u = await buatPengguna();
    await login(u.email, SANDI);
    const res = await panggil(`/admin/akun/${u.userId}/cabut-sesi`, { method: "POST", cookie: admin });
    expect(res.data.jumlah).toBe(2);
    expect((await panggil("/me", { cookie: u.cookie })).status).toBe(401);
    // Admin mencabut sesinya sendiri: sesi yang sedang dipakai tetap berlaku
    await panggil(`/admin/akun/${await idAdmin()}/cabut-sesi`, { method: "POST", cookie: admin });
    expect((await panggil("/me", { cookie: admin })).status).toBe(200);
  });
});

describe("permintaan akun", () => {
  test("permintaan tanpa NIP: admin diberi tahu, lalu disetujui dengan membuat data pegawai dan mengirim undangan", async () => {
    const admin = await loginAdmin();
    const email = emailAcak("minta");
    const ajukan = await panggil("/permintaan-akun", { json: { nama: "Pemohon Baru", email, catatan: "Staf baru" } });
    expect(ajukan.status).toBe(201);
    expect(suratTerakhir(process.env.SEED_ADMIN_EMAIL!)?.subjek).toBe("Permintaan akun baru: Pemohon Baru");

    const jumlah = await panggil("/admin/permintaan-akun/jumlah", { cookie: admin });
    expect(jumlah.data.menunggu).toBeGreaterThanOrEqual(1);

    // Tanpa bidang dan jabatan ditolak, dan permintaan tetap menunggu
    const kurang = await panggil(`/admin/permintaan-akun/${ajukan.data.id}/setujui`, { cookie: admin, json: { role: "PEGAWAI" } });
    expect(kurang.status).toBe(422);
    expect(kurang.data.details.map((d: { field: string }) => d.field)).toEqual(["bidangId", "jabatan"]);

    const setujui = await panggil(`/admin/permintaan-akun/${ajukan.data.id}/setujui`, { cookie: admin, json: { role: "PEGAWAI", bidangId: await idUnit("SEKSI-DATA"), jabatan: "Staf" } });
    expect(setujui.status).toBe(200);
    expect(setujui.data).toMatchObject({ email, kirimUlang: false });

    await aktifkan(email, "sandipemohon123");
    const masuk = await login(email, "sandipemohon123");
    expect((await panggil("/me", { cookie: masuk.cookie })).data.pegawai).toMatchObject({ nama: "Pemohon Baru", jabatan: "Staf" });

    const daftar = await panggil("/admin/permintaan-akun?status=DISETUJUI", { cookie: admin });
    expect(daftar.data.items.find((p: { id: number }) => p.id === ajukan.data.id)).toMatchObject({ status: "DISETUJUI", diprosesOleh: "Administrator" });
    expect((await panggil(`/admin/permintaan-akun/${ajukan.data.id}/setujui`, { cookie: admin, json: { role: "PEGAWAI" } })).status).toBe(409);
  });

  test("permintaan dengan NIP pegawai terdaftar menampilkan data pegawainya", async () => {
    const admin = await loginAdmin();
    const nip = nipAcak();
    await panggil("/admin/pegawai", { cookie: admin, json: { nip, nama: "Pegawai Belum Berakun", jabatan: "Analis", bidangId: await idUnit("SEKSI-DATA") } });
    const ajukan = await panggil("/permintaan-akun", { json: { nama: "Pegawai Belum Berakun", nip, email: emailAcak("nip") } });
    expect(ajukan.status).toBe(201);
    const daftar = await panggil("/admin/permintaan-akun?status=MENUNGGU&pageSize=100", { cookie: admin });
    expect(daftar.data.items.find((p: { id: number }) => p.id === ajukan.data.id)).toMatchObject({
      pegawai: { nip, nama: "Pegawai Belum Berakun", jabatan: "Analis" },
      bidang: "Seksi Pengelolaan Data dan Persediaan",
    });
    const kedua = await panggil("/permintaan-akun", { json: { nama: "X", nip, email: emailAcak() } });
    expect(kedua.status).toBe(422);
    expect(kedua.data.message).toContain("menunggu persetujuan");
  });

  test("NIP tidak sah, NIP tidak terdaftar, email sudah dipakai, atau email sedang menunggu ditolak", async () => {
    const u = await buatPengguna();
    expect((await panggil("/permintaan-akun", { json: { nama: "X", nip: "12345", email: emailAcak() } })).status).toBe(422);
    expect((await panggil("/permintaan-akun", { json: { nama: "X", nip: nipAcak(), email: emailAcak() } })).data.message).toBe("NIP tidak terdaftar sebagai pegawai aktif");
    expect((await panggil("/permintaan-akun", { json: { nama: "X", nip: u.nip, email: emailAcak() } })).data.message).toContain("sudah punya akun");
    expect((await panggil("/permintaan-akun", { json: { nama: "X", email: u.email } })).data.message).toBe("Email sudah dipakai akun lain");
    const email = emailAcak();
    expect((await panggil("/permintaan-akun", { json: { nama: "X", email } })).status).toBe(201);
    expect((await panggil("/permintaan-akun", { json: { nama: "X", email } })).status).toBe(422);
  });

  test("ditolak dengan alasan: pemohon diberi tahu, dan tidak bisa diproses dua kali", async () => {
    const admin = await loginAdmin();
    const email = emailAcak("tolak");
    const ajukan = await panggil("/permintaan-akun", { json: { nama: "Ditolak", email } });
    expect((await panggil(`/admin/permintaan-akun/${ajukan.data.id}/tolak`, { cookie: admin, json: { alasan: "Bukan pegawai" } })).status).toBe(200);
    expect(suratTerakhir(email)?.isi.paragraf).toContain("Alasan: Bukan pegawai");
    expect((await panggil(`/admin/permintaan-akun/${ajukan.data.id}/tolak`, { cookie: admin, json: { alasan: "Lagi" } })).status).toBe(409);
    expect((await panggil("/admin/permintaan-akun/999999/tolak", { cookie: admin, json: { alasan: "X" } })).status).toBe(404);
  });

  test("maksimal 3 permintaan per jam dari satu IP", async () => {
    const ip = ipAcak();
    for (let i = 0; i < 3; i++) expect((await panggil("/permintaan-akun", { ip, json: { nama: "Banjir", email: emailAcak() } })).status).toBe(201);
    expect((await panggil("/permintaan-akun", { ip, json: { nama: "Banjir", email: emailAcak() } })).status).toBe(429);
  });
});

describe("audit log", () => {
  test("aksi admin tercatat; kata sandi dan token tidak pernah tersimpan", async () => {
    const admin = await loginAdmin();
    const u = await buatPengguna();
    await panggil(`/admin/akun/${u.userId}/reset-sandi`, { method: "POST", cookie: admin });
    const hariIni = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    const daftar = await panggil(`/audit-log?aksi=kirim_reset_sandi&dari=${hariIni}&sampai=${hariIni}`, { cookie: admin });
    expect(daftar.data.items.some((a: { entitasId: string }) => a.entitasId === u.userId)).toBe(true);

    const semua = await prisma.auditLog.findMany({ select: { dataSebelum: true, dataSesudah: true } });
    const teks = JSON.stringify(semua);
    expect(teks).not.toContain(SANDI);
    expect(teks).not.toMatch(/"(password|token)"/i);
    for (const s of kotakSurat.filter((s) => s.isi.tombol?.url.includes("token="))) {
      expect(teks).not.toContain(new URL(s.isi.tombol!.url).searchParams.get("token")!);
    }

    expect((await panggil(`/audit-log?dari=2026-05-10&sampai=2026-05-01`, { cookie: admin })).status).toBe(422);
    expect((await panggil("/audit-log/999999999", { cookie: admin })).status).toBe(404);
    const pilihan = await panggil("/audit-log/pilihan", { cookie: admin });
    expect(pilihan.data.entitas).toContain("user");
    expect(pilihan.data.aksi).toContain("kirim_reset_sandi");
  });

  test("email yang terkirim selama uji tertangkap, tidak ada yang keluar sungguhan", () => {
    expect(kotakSurat.length).toBeGreaterThan(0);
  });
});
