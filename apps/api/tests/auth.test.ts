// Uji login, sesi, penguncian akun, endpoint Better Auth yang ditutup, CSRF, hash kata sandi, hak akses role,
// aktivasi akun dari email undangan, serta lupa/atur ulang kata sandi
import { describe, expect, test } from "bun:test";
import { hashPassword as hashScrypt } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/utils/token";
import { aktifkan, auditUntuk, buatPengguna, emailAcak, idUnit, ipAcak, isiAkun, login, loginAdmin, nipAcak, panggil, SANDI, tokenTerakhir } from "./helpers";
import { kotakSurat, suratTerakhir } from "./surel-palsu";

// Membuat akun lewat admin tanpa mengaktifkannya
async function akunMenunggu(ubah: Record<string, unknown> = {}) {
  const isi = await isiAkun(ubah);
  const res = await panggil("/admin/akun", { cookie: await loginAdmin(), json: isi });
  if (res.status !== 201) throw new Error(JSON.stringify(res.data));
  return { id: res.data.id as string, email: isi.email as string, res };
}

describe("login dan sesi", () => {
  test("login dengan email, sesi terbaca, cookie HttpOnly + SameSite=Lax", async () => {
    const u = await buatPengguna();
    const masuk = await login(u.email, SANDI);
    expect(masuk.status).toBe(200);
    const setCookie = masuk.headers.getSetCookie().join("\n");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    const sesi = await panggil("/auth/get-session", { cookie: masuk.cookie });
    expect(sesi.data.user.email).toBe(u.email);
    expect(sesi.data.user.pegawaiId).toBe(u.pegawaiId);
  });

  test("NIP tidak bisa dipakai untuk login", async () => {
    const u = await buatPengguna();
    expect((await panggil("/auth/sign-in/username", { json: { username: u.nip, password: SANDI } })).status).toBe(404);
    expect((await login(u.nip, SANDI)).status).not.toBe(200);
  });

  test("tanpa login ditolak 401 dengan format galat seragam", async () => {
    const res = await panggil("/kegiatan");
    expect(res.status).toBe(401);
    expect(res.data).toMatchObject({ code: "UNAUTHORIZED" });
    expect((await panggil("/auth/get-session")).data).toBeNull();
  });

  test("kata sandi salah 401 dan tercatat login_gagal; email tidak terdaftar memberi galat yang sama", async () => {
    const u = await buatPengguna();
    const salah = await login(u.email, "salah-sandi-123");
    expect(salah.status).toBe(401);
    expect(salah.data.code).toBe("INVALID_EMAIL_OR_PASSWORD");
    expect((await auditUntuk("user", u.userId))[0]?.aksi).toBe("login_gagal");
    const tidakAda = await login(emailAcak("tidakada"), "salah-sandi-123");
    expect(tidakAda.status).toBe(401);
    expect(tidakAda.data.code).toBe(salah.data.code);
  });

  test("salah 5 kali: akun terkunci 15 menit walau sandi benar; tautan reset dari admin membuka kuncinya", async () => {
    const u = await buatPengguna();
    for (let i = 0; i < 5; i++) expect((await login(u.email, "salah-sandi-123")).status).toBe(401);

    const terkunci = await login(u.email, SANDI);
    expect(terkunci.status).toBe(429);
    expect(terkunci.data.code).toBe("ACCOUNT_LOCKED");
    expect((await auditUntuk("user", u.userId)).some((a) => a.aksi === "akun_terkunci")).toBe(true);

    const admin = await loginAdmin();
    const daftar = await panggil(`/admin/akun?q=${encodeURIComponent(u.email)}`, { cookie: admin });
    expect(daftar.data.items[0].terkunci).toBe(true);

    expect((await panggil(`/admin/akun/${u.userId}/reset-sandi`, { method: "POST", cookie: admin })).status).toBe(200);
    expect((await panggil("/reset-sandi", { json: { token: tokenTerakhir(u.email), password: "sandibaru12345" } })).status).toBe(200);
    expect((await login(u.email, "sandibaru12345")).status).toBe(200);
  });

  test("lebih dari 10 percobaan login per menit dari satu IP ditolak 429", async () => {
    const ip = ipAcak();
    const status: number[] = [];
    for (let i = 0; i < 11; i++) status.push((await login(emailAcak("tidakada"), "salah-sandi-123", ip)).status);
    expect(status.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(status[10]).toBe(429);
  });

  test("logout mengakhiri sesi dan tercatat di audit", async () => {
    const u = await buatPengguna();
    expect((await panggil("/auth/sign-out", { cookie: u.cookie, json: {} })).status).toBe(200);
    expect((await panggil("/me", { cookie: u.cookie })).status).toBe(401);
    expect((await auditUntuk("user", u.userId)).some((a) => a.aksi === "logout")).toBe(true);
  });

  test("akun yang dinonaktifkan tidak bisa login dan sesinya dicabut", async () => {
    const u = await buatPengguna();
    const admin = await loginAdmin();
    expect((await panggil(`/admin/akun/${u.userId}/nonaktifkan`, { cookie: admin, json: { alasan: "uji" } })).status).toBe(200);
    expect((await panggil("/me", { cookie: u.cookie })).status).toBe(401);
    const masuk = await login(u.email, SANDI);
    expect(masuk.status).toBe(403);
    expect(masuk.data.code).toBe("BANNED_USER");
  });

  test("akun yang menunggu aktivasi tidak bisa login", async () => {
    const { email } = await akunMenunggu();
    const masuk = await login(email, SANDI);
    expect(masuk.status).toBe(401);
    expect(masuk.data.code).toBe("INVALID_EMAIL_OR_PASSWORD");
  });
});

describe("endpoint Better Auth yang tidak dipakai ditutup", () => {
  test("daftar mandiri, reset bawaan, ubah user, ganti sandi bawaan, dan endpoint admin menjawab 404", async () => {
    const u = await buatPengguna();
    const tertutup = [
      ["/auth/sign-up/email", { email: emailAcak(), password: SANDI, name: "Daftar Sendiri" }],
      ["/auth/request-password-reset", { email: u.email }],
      ["/auth/reset-password", { token: "x".repeat(20), newPassword: SANDI }],
      ["/auth/update-user", { name: "Ganti Nama Sendiri" }],
      ["/auth/change-password", { currentPassword: SANDI, newPassword: "sandilain12345" }],
      ["/auth/admin/set-role", { userId: u.userId, role: "ADMIN" }],
    ] as const;
    for (const [path, json] of tertutup) expect((await panggil(path, { cookie: u.cookie, json })).status).toBe(404);
    expect((await panggil("/auth/list-sessions", { cookie: u.cookie })).status).toBe(404);
    expect((await panggil("/auth/admin/list-users", { cookie: await loginAdmin() })).status).toBe(404);
    const me = await panggil("/me", { cookie: u.cookie });
    expect(me.data).toMatchObject({ role: "PEGAWAI" });
    expect(me.data.name).not.toBe("Ganti Nama Sendiri");
    expect(await prisma.user.findFirst({ where: { name: "Daftar Sendiri" } })).toBeNull();
  });
});

describe("CSRF dan hash kata sandi", () => {
  test("permintaan pengubah data dari origin lain atau tanpa Origin/Referer ditolak 403; GET tetap boleh", async () => {
    const u = await buatPengguna();
    const lain = await panggil("/me", { method: "PATCH", cookie: u.cookie, json: { kontak: "0811" }, origin: "https://situs-jahat.example" });
    expect(lain.status).toBe(403);
    expect(lain.data.code).toBe("ASAL_DITOLAK");
    expect((await panggil("/me", { method: "PATCH", cookie: u.cookie, json: { kontak: "0811" }, origin: null })).status).toBe(403);
    expect((await panggil("/auth/sign-in/email", { json: { email: u.email, password: SANDI }, origin: "https://situs-jahat.example" })).status).toBe(403);
    expect((await panggil("/me", { cookie: u.cookie, origin: null })).status).toBe(200);
  });

  test("kata sandi disimpan sebagai Argon2id; hash scrypt lama tetap bisa login lalu diperbarui", async () => {
    const u = await buatPengguna();
    const akun = await prisma.account.findFirstOrThrow({ where: { userId: u.userId, providerId: "credential" } });
    expect(akun.password).toStartWith("$argon2id$");

    await prisma.account.update({ where: { id: akun.id }, data: { password: await hashScrypt(SANDI) } });
    expect((await login(u.email, SANDI)).status).toBe(200);
    expect((await prisma.account.findUniqueOrThrow({ where: { id: akun.id } })).password).toStartWith("$argon2id$");
  });
});

describe("hak akses role", () => {
  test("PEGAWAI (Operator) dan PIMPINAN ditolak 403 di semua endpoint admin", async () => {
    const pegawai = await buatPengguna();
    const pimpinan = await buatPengguna({ role: "PIMPINAN" });
    const dapat = ["/admin/akun", `/admin/akun/${pegawai.userId}`, "/admin/pegawai", "/admin/unit-kerja", "/audit-log", "/admin/permintaan-akun"];
    const kirim = [`/admin/akun/${pegawai.userId}/kirim-ulang-undangan`, `/admin/akun/${pimpinan.userId}/reset-sandi`, `/admin/akun/${pimpinan.userId}/cabut-sesi`];
    for (const u of [pegawai, pimpinan]) {
      for (const path of dapat) expect((await panggil(path, { cookie: u.cookie })).status).toBe(403);
      for (const path of kirim) expect((await panggil(path, { method: "POST", cookie: u.cookie })).status).toBe(403);
      expect((await panggil("/admin/akun", { cookie: u.cookie, json: await isiAkun({ role: "ADMIN" }) })).status).toBe(403);
      expect((await panggil(`/admin/akun/${u.userId}`, { method: "PATCH", cookie: u.cookie, json: await isiAkun({ role: "ADMIN" }) })).status).toBe(403);
    }
    expect((await panggil("/me", { cookie: pegawai.cookie })).data.role).toBe("PEGAWAI");
  });

  test("dashboard dinas dan pantau hanya untuk PIMPINAN dan ADMIN", async () => {
    const pegawai = await buatPengguna();
    const pimpinan = await buatPengguna({ role: "PIMPINAN" });
    expect((await panggil("/dashboard", { cookie: pegawai.cookie })).status).toBe(403);
    expect((await panggil("/pantau/ringkasan", { cookie: pegawai.cookie })).status).toBe(403);
    expect((await panggil("/dashboard", { cookie: pimpinan.cookie })).status).toBe(200);
    expect((await panggil("/pantau/ringkasan", { cookie: pimpinan.cookie })).status).toBe(200);
  });
});

describe("aktivasi akun dari email undangan", () => {
  test("admin membuat akun: undangan terkirim, token tersimpan sebagai hash, aktivasi sekali pakai, lalu login", async () => {
    const { id, email, res } = await akunMenunggu();
    expect(res.data.undangan).toEqual({ email, galat: null });
    const surel = suratTerakhir(email)!;
    expect(surel.subjek).toBe("Aktivasi akun Aplikasi Pendataan Kegiatan");
    const token = tokenTerakhir(email);

    // Basis data hanya menyimpan hash token
    const baris = await prisma.verification.findMany({ where: { value: id } });
    expect(baris.map((b) => b.identifier)).toEqual([`aktivasi:${hashToken(token)}`]);
    expect(JSON.stringify(baris)).not.toContain(token);
    expect(baris[0]!.expiresAt.getTime() - Date.now()).toBeGreaterThan(71 * 3600_000);

    const info = await panggil(`/aktivasi?token=${token}`);
    expect(info.status).toBe(200);
    expect(info.data).toMatchObject({ email });

    const lemah = await panggil("/aktivasi", { json: { token, password: "hanyahuruf" } });
    expect(lemah.status).toBe(422);
    expect(lemah.data.details[0]).toEqual({ field: "password", message: "Kata sandi harus berisi huruf dan angka" });

    expect((await panggil("/aktivasi", { json: { token, password: "sandiaktivasi123" } })).status).toBe(200);
    expect((await panggil("/aktivasi", { json: { token, password: "sandiaktivasi123" } })).status).toBe(410);
    expect((await panggil(`/aktivasi?token=${token}`)).data.code).toBe("TOKEN_TIDAK_BERLAKU");
    expect((await login(email, "sandiaktivasi123")).status).toBe(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { id } });
    expect(user.emailVerified).toBe(true);
    expect((await auditUntuk("user", id)).some((a) => a.aksi === "aktivasi")).toBe(true);
  });

  test("admin menambah pegawai dengan email dari Master data: undangan terkirim dan bisa diaktivasi", async () => {
    const admin = await loginAdmin();
    const email = emailAcak("undangan");
    const nip = nipAcak();
    const buat = await panggil("/admin/pegawai", { cookie: admin, json: { nip, nama: "Pegawai Undangan", unitKerjaId: await idUnit("SEKSI-DATA"), email } });
    expect(buat.status).toBe(201);
    expect(buat.data.undangan).toEqual({ email, galat: null });
    expect((await panggil(`/admin/pegawai?q=${nip}`, { cookie: admin })).data.items[0].akun.aktif).toBe(false);
    await aktifkan(email);
    expect((await panggil(`/admin/pegawai?q=${nip}`, { cookie: admin })).data.items[0].akun.aktif).toBe(true);
    expect((await panggil(`/admin/pegawai/${buat.data.id}/undang`, { cookie: admin, json: { email, role: "PEGAWAI" } })).status).toBe(422);
  });

  test("kirim ulang undangan membatalkan tautan lama", async () => {
    const admin = await loginAdmin();
    const { id, email } = await akunMenunggu();
    const tokenLama = tokenTerakhir(email);
    const ulang = await panggil(`/admin/akun/${id}/kirim-ulang-undangan`, { method: "POST", cookie: admin });
    expect(ulang.status).toBe(200);
    const tokenBaru = tokenTerakhir(email);
    expect(tokenBaru).not.toBe(tokenLama);
    expect((await panggil(`/aktivasi?token=${tokenLama}`)).status).toBe(410);
    expect((await panggil(`/aktivasi?token=${tokenBaru}`)).status).toBe(200);
  });

  test("token palsu, kedaluwarsa, atau milik akun yang dinonaktifkan ditolak 410", async () => {
    expect((await panggil("/aktivasi?token=tokenpalsu12345")).data.code).toBe("TOKEN_TIDAK_BERLAKU");
    expect((await panggil("/aktivasi", { json: { token: "tokenpalsu12345", password: "sandibaru12345" } })).status).toBe(410);

    const kedaluwarsa = await akunMenunggu();
    await prisma.verification.updateMany({ where: { value: kedaluwarsa.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await panggil("/aktivasi", { json: { token: tokenTerakhir(kedaluwarsa.email), password: "sandibaru12345" } })).status).toBe(410);

    const dinonaktifkan = await akunMenunggu();
    await panggil(`/admin/akun/${dinonaktifkan.id}/nonaktifkan`, { cookie: await loginAdmin(), json: {} });
    expect((await panggil("/aktivasi", { json: { token: tokenTerakhir(dinonaktifkan.email), password: "sandibaru12345" } })).status).toBe(410);
  });

  test("dua aktivasi bersamaan dengan token yang sama: hanya satu yang berhasil", async () => {
    const { id, email } = await akunMenunggu();
    const token = tokenTerakhir(email);
    const hasil = await Promise.all([1, 2].map((i) => panggil("/aktivasi", { json: { token, password: `sandiganda${i}2345` } })));
    expect(hasil.map((h) => h.status).sort()).toEqual([200, 410]);
    expect(await prisma.account.count({ where: { userId: id, providerId: "credential" } })).toBe(1);
  });
});

describe("lupa dan atur ulang kata sandi", () => {
  test("jawaban selalu sama; tautan hanya dikirim ke akun aktif", async () => {
    const u = await buatPengguna();
    const menunggu = await akunMenunggu();
    const sebelum = kotakSurat.length;

    const terdaftar = await panggil("/lupa-sandi", { json: { email: u.email.toUpperCase() } });
    const tidakAda = await panggil("/lupa-sandi", { json: { email: emailAcak("hantu") } });
    const belumAktif = await panggil("/lupa-sandi", { json: { email: menunggu.email } });
    for (const r of [terdaftar, tidakAda, belumAktif]) expect(r.status).toBe(200);
    expect(tidakAda.data).toEqual(terdaftar.data);
    expect(belumAktif.data).toEqual(terdaftar.data);

    const baru = kotakSurat.slice(sebelum);
    expect(baru.map((s) => s.kepada)).toEqual([u.email]);
    expect(baru[0]!.subjek).toBe("Atur ulang kata sandi Aplikasi Pendataan Kegiatan");
    const v = await prisma.verification.findFirstOrThrow({ where: { value: u.userId, identifier: { startsWith: "reset-sandi:" } } });
    expect(v.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(3600_000);
  });

  test("atur ulang lewat tautan: semua sesi dicabut, token sekali pakai, sandi lama tidak berlaku", async () => {
    const u = await buatPengguna();
    await panggil("/lupa-sandi", { json: { email: u.email } });
    const token = tokenTerakhir(u.email);
    expect((await panggil(`/reset-sandi?token=${token}`)).data).toMatchObject({ email: u.email });

    const lemah = await panggil("/reset-sandi", { json: { token, password: "pendek1" } });
    expect(lemah.status).toBe(422);
    expect(lemah.data.details[0].field).toBe("password");

    expect((await panggil("/reset-sandi", { json: { token, password: "sandireset12345" } })).status).toBe(200);
    expect((await panggil("/me", { cookie: u.cookie })).status).toBe(401);
    expect((await panggil("/reset-sandi", { json: { token, password: "sandireset67890" } })).status).toBe(410);
    expect((await login(u.email, SANDI)).status).toBe(401);
    expect((await login(u.email, "sandireset12345")).status).toBe(200);
    expect(suratTerakhir(u.email)?.subjek).toBe("Kata sandi akun Anda telah diubah");
    expect((await auditUntuk("user", u.userId)).some((a) => a.aksi === "reset_sandi")).toBe(true);
  });

  test("maksimal 5 permintaan lupa sandi per 15 menit dari satu IP", async () => {
    const ip = ipAcak();
    for (let i = 0; i < 5; i++) expect((await panggil("/lupa-sandi", { ip, json: { email: emailAcak() } })).status).toBe(200);
    expect((await panggil("/lupa-sandi", { ip, json: { email: emailAcak() } })).status).toBe(429);
  });

  test("permintaan berulang untuk satu email dibatasi diam-diam (tetap 200, tanpa email tambahan)", async () => {
    const u = await buatPengguna();
    const sebelum = kotakSurat.length;
    for (let i = 0; i < 5; i++) expect((await panggil("/lupa-sandi", { json: { email: u.email } })).status).toBe(200);
    expect(kotakSurat.slice(sebelum).filter((s) => s.kepada === u.email)).toHaveLength(3);
  });
});
