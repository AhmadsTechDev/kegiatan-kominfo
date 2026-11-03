// Uji pengaturan akun sendiri: profil (data kepegawaian hanya dibaca), ganti email dengan verifikasi,
// ganti kata sandi, sesi aktif, dan preferensi
import { describe, expect, test } from "bun:test";
import { prisma } from "@/lib/prisma";
import { auditUntuk, buatPengguna, emailAcak, formBerkas, login, loginAdmin, panggil, PNG, SANDI, tokenTerakhir } from "./helpers";
import { kotakSurat, suratTerakhir } from "./surel-palsu";

describe("profil", () => {
  test("profil berisi info akun dan data kepegawaian, tanpa data rahasia", async () => {
    const u = await buatPengguna();
    const me = await panggil("/me", { cookie: u.cookie });
    expect(me.status).toBe(200);
    expect(me.data).toMatchObject({ id: u.userId, email: u.email, emailVerified: true, emailBaru: null, status: "AKTIF", role: "PEGAWAI", pegawai: { nip: u.nip } });
    expect(me.data.pegawai.bidang.parent.nama).toBe("Bidang Teknologi Informasi dan Persandian");
    expect(typeof me.data.createdAt).toBe("string");
    expect(JSON.stringify(me.data)).not.toMatch(/password|token|failedLogin|lockedUntil/i);
  });

  test("hanya kontak yang bisa diubah; nama, NIP, jabatan, unit, dan role dikelola admin", async () => {
    const u = await buatPengguna();
    const sebelum = (await panggil("/me", { cookie: u.cookie })).data;
    const res = await panggil("/me", {
      method: "PATCH",
      cookie: u.cookie,
      json: { kontak: "0812-3456", nama: "Nama Palsu", name: "Nama Palsu", jabatan: "Kepala Dinas", nip: "199001012022211001", role: "ADMIN", bidangId: 1 },
    });
    expect(res.status).toBe(200);
    expect(res.data.kontak).toBe("0812-3456");
    expect(res.data.name).toBe(sebelum.name);
    expect(res.data.role).toBe("PEGAWAI");
    expect(res.data.pegawai).toEqual(sebelum.pegawai);
  });

  test("kontak bukan nomor telepon ditolak 422 dengan nama field", async () => {
    const u = await buatPengguna();
    const res = await panggil("/me", { method: "PATCH", cookie: u.cookie, json: { kontak: "bukan nomor" } });
    expect(res.status).toBe(422);
    expect(res.data.details.some((d: { field: string }) => d.field === "kontak")).toBe(true);
  });

  test("unggah, lihat, dan hapus foto profil", async () => {
    const u = await buatPengguna();
    const unggah = await panggil("/me/foto", { cookie: u.cookie, form: formBerkas(PNG) });
    expect(unggah.status).toBe(200);
    expect(unggah.data.foto).toStartWith(`/api/me/foto/${u.userId}?v=`);

    const lain = await buatPengguna();
    const foto = await panggil(`/me/foto/${u.userId}`, { cookie: lain.cookie });
    expect(foto.status).toBe(200);
    expect(foto.headers.get("content-type")).toBe("image/webp");

    expect((await panggil("/me/foto", { method: "DELETE", cookie: u.cookie })).data).toEqual({ foto: null });
    expect((await panggil(`/me/foto/${u.userId}`, { cookie: u.cookie })).status).toBe(404);
  });

  test("foto bukan gambar ditolak 415", async () => {
    const u = await buatPengguna();
    const res = await panggil("/me/foto", { cookie: u.cookie, form: formBerkas(new TextEncoder().encode("%PDF-1.4"), "x.pdf") });
    expect(res.status).toBe(415);
  });
});

describe("ganti email", () => {
  test("butuh kata sandi, email berbeda, dan belum dipakai akun lain", async () => {
    const u = await buatPengguna();
    const lain = await buatPengguna();
    const coba = (json: unknown) => panggil("/me/email", { method: "PATCH", cookie: u.cookie, json });
    expect((await coba({ email: emailAcak(), password: "salah-sandi-123" })).data.details[0].field).toBe("password");
    expect((await coba({ email: u.email, password: SANDI })).data.details[0].field).toBe("email");
    expect((await coba({ email: lain.email, password: SANDI })).data.details[0].message).toBe("Email sudah dipakai akun lain");
    expect((await coba({ email: "bukan-email", password: SANDI })).status).toBe(422);
  });

  test("email lama tetap dipakai sampai email baru diverifikasi; tautan sekali pakai", async () => {
    const u = await buatPengguna();
    const baru = emailAcak("baru");
    const minta = await panggil("/me/email", { method: "PATCH", cookie: u.cookie, json: { email: baru.toUpperCase(), password: SANDI } });
    expect(minta.status).toBe(200);
    expect(minta.data.emailBaru).toBe(baru);
    expect(suratTerakhir(baru)!.subjek).toBe("Verifikasi email baru Anda");
    expect(suratTerakhir(u.email)!.subjek).toBe("Permintaan ganti email akun Anda");

    // Sebelum verifikasi: email lama tetap berlaku, email baru belum bisa dipakai login
    expect((await panggil("/me", { cookie: u.cookie })).data).toMatchObject({ email: u.email, emailBaru: baru });
    expect((await login(u.email, SANDI)).status).toBe(200);
    expect((await login(baru, SANDI)).status).toBe(401);

    const token = tokenTerakhir(baru);
    const konfirmasi = await panggil("/konfirmasi-email", { json: { token } });
    expect(konfirmasi.status).toBe(200);
    expect(konfirmasi.data).toEqual({ email: baru });
    expect((await panggil("/konfirmasi-email", { json: { token } })).status).toBe(410);

    expect((await login(u.email, SANDI)).status).toBe(401);
    const masuk = await login(baru, SANDI);
    expect(masuk.status).toBe(200);
    expect((await panggil("/me", { cookie: masuk.cookie })).data).toMatchObject({ email: baru, emailBaru: null, emailVerified: true });
    expect(suratTerakhir(u.email)!.subjek).toBe("Email akun Anda diganti");
    expect((await auditUntuk("user", u.userId)).map((a) => a.aksi)).toEqual(expect.arrayContaining(["minta_ganti_email", "ganti_email"]));
  });

  test("permintaan baru membatalkan tautan lama; batal menghapus permintaan", async () => {
    const u = await buatPengguna();
    const pertama = emailAcak("pertama");
    await panggil("/me/email", { method: "PATCH", cookie: u.cookie, json: { email: pertama, password: SANDI } });
    const tokenPertama = tokenTerakhir(pertama);
    const kedua = emailAcak("kedua");
    await panggil("/me/email", { method: "PATCH", cookie: u.cookie, json: { email: kedua, password: SANDI } });
    expect((await panggil("/konfirmasi-email", { json: { token: tokenPertama } })).status).toBe(410);

    expect((await panggil("/me/email", { method: "DELETE", cookie: u.cookie })).data).toEqual({ emailBaru: null });
    expect((await panggil("/konfirmasi-email", { json: { token: tokenTerakhir(kedua) } })).status).toBe(410);
    expect((await panggil("/me/email", { method: "DELETE", cookie: u.cookie })).status).toBe(422);
  });

  test("email baru yang keburu dipakai akun lain gagal diverifikasi", async () => {
    const u = await buatPengguna();
    const rebutan = emailAcak("rebutan");
    await panggil("/me/email", { method: "PATCH", cookie: u.cookie, json: { email: rebutan, password: SANDI } });
    const token = tokenTerakhir(rebutan);
    await prisma.user.update({ where: { id: (await buatPengguna()).userId }, data: { email: rebutan } });
    expect((await panggil("/konfirmasi-email", { json: { token } })).status).toBe(422);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.userId } })).email).toBe(u.email);
  });
});

describe("ganti kata sandi", () => {
  test("sandi lama salah, sandi baru lemah, atau sama dengan yang lama ditolak 422 per field", async () => {
    const u = await buatPengguna();
    const coba = (json: unknown) => panggil("/me/sandi", { method: "PATCH", cookie: u.cookie, json });
    expect((await coba({ sandiLama: "salah-sandi-123", sandiBaru: "sandibaru12345" })).data.details[0].field).toBe("sandiLama");
    expect((await coba({ sandiLama: SANDI, sandiBaru: "1234567890" })).data.details[0]).toEqual({ field: "sandiBaru", message: "Kata sandi harus berisi huruf dan angka" });
    expect((await coba({ sandiLama: SANDI, sandiBaru: SANDI })).data.details[0].field).toBe("sandiBaru");
  });

  test("berhasil: sesi lain dicabut, sesi ini tetap, pemilik diberi tahu lewat email", async () => {
    const u = await buatPengguna();
    const lain = await login(u.email, SANDI);
    const res = await panggil("/me/sandi", { method: "PATCH", cookie: u.cookie, json: { sandiLama: SANDI, sandiBaru: "sandibaru12345" } });
    expect(res.status).toBe(200);
    expect(res.data.sesiDicabut).toBe(1);
    expect((await panggil("/me", { cookie: u.cookie })).status).toBe(200);
    expect((await panggil("/me", { cookie: lain.cookie })).status).toBe(401);
    expect((await login(u.email, SANDI)).status).toBe(401);
    expect((await login(u.email, "sandibaru12345")).status).toBe(200);
    expect(suratTerakhir(u.email)!.subjek).toBe("Kata sandi Anda diubah");
  });

  test("maksimal 5 percobaan per 15 menit per akun", async () => {
    const u = await buatPengguna();
    for (let i = 0; i < 5; i++) {
      expect((await panggil("/me/sandi", { method: "PATCH", cookie: u.cookie, json: { sandiLama: "salah-sandi-123", sandiBaru: "sandibaru12345" } })).status).toBe(422);
    }
    expect((await panggil("/me/sandi", { method: "PATCH", cookie: u.cookie, json: { sandiLama: SANDI, sandiBaru: "sandibaru12345" } })).status).toBe(429);
  });
});

describe("sesi aktif", () => {
  test("daftar sesi menandai sesi ini dan tidak memuat token", async () => {
    const u = await buatPengguna();
    await login(u.email, SANDI);
    const sesi = await panggil("/me/sesi", { cookie: u.cookie });
    expect(sesi.data).toHaveLength(2);
    expect(sesi.data.filter((s: { sesiIni: boolean }) => s.sesiIni)).toHaveLength(1);
    expect(JSON.stringify(sesi.data)).not.toMatch(/token/i);
  });

  test("mencabut satu sesi lain; sesi ini dan sesi milik orang lain tidak bisa dicabut lewat sini", async () => {
    const u = await buatPengguna();
    const lain = await login(u.email, SANDI);
    const daftar = (await panggil("/me/sesi", { cookie: u.cookie })).data as { id: string; sesiIni: boolean }[];
    const ini = daftar.find((s) => s.sesiIni)!;
    const bukan = daftar.find((s) => !s.sesiIni)!;

    expect((await panggil(`/me/sesi/${ini.id}`, { method: "DELETE", cookie: u.cookie })).status).toBe(422);
    const orangLain = await buatPengguna();
    expect((await panggil(`/me/sesi/${bukan.id}`, { method: "DELETE", cookie: orangLain.cookie })).status).toBe(404);
    expect((await panggil("/me", { cookie: lain.cookie })).status).toBe(200);

    expect((await panggil(`/me/sesi/${bukan.id}`, { method: "DELETE", cookie: u.cookie })).status).toBe(200);
    expect((await panggil("/me", { cookie: lain.cookie })).status).toBe(401);
    expect((await panggil("/me", { cookie: u.cookie })).status).toBe(200);
  });

  test("cabut semua sesi lain", async () => {
    const u = await buatPengguna();
    const a = await login(u.email, SANDI);
    const b = await login(u.email, SANDI);
    expect((await panggil("/me/sesi", { method: "DELETE", cookie: u.cookie })).data).toEqual({ jumlah: 2 });
    for (const c of [a, b]) expect((await panggil("/me", { cookie: c.cookie })).status).toBe(401);
    expect((await panggil("/me", { cookie: u.cookie })).status).toBe(200);
  });

  test("sesi yang dicabut admin langsung tidak berlaku", async () => {
    const u = await buatPengguna();
    await panggil(`/admin/akun/${u.userId}/cabut-sesi`, { method: "POST", cookie: await loginAdmin() });
    expect((await panggil("/me/sesi", { cookie: u.cookie })).status).toBe(401);
  });
});

describe("preferensi", () => {
  test("nilai bawaan, simpan sebagian, dan validasi", async () => {
    const u = await buatPengguna();
    expect((await panggil("/me/preferensi", { cookie: u.cookie })).data).toEqual({ tema: "system", notifPengingatKegiatan: true, notifPengingatDokumentasi: true });
    const ubah = await panggil("/me/preferensi", { method: "PATCH", cookie: u.cookie, json: { tema: "dark" } });
    expect(ubah.data).toEqual({ tema: "dark", notifPengingatKegiatan: true, notifPengingatDokumentasi: true });
    await panggil("/me/preferensi", { method: "PATCH", cookie: u.cookie, json: { notifPengingatDokumentasi: false } });
    expect((await panggil("/me/preferensi", { cookie: u.cookie })).data).toEqual({ tema: "dark", notifPengingatKegiatan: true, notifPengingatDokumentasi: false });
    expect((await panggil("/me/preferensi", { method: "PATCH", cookie: u.cookie, json: { tema: "ungu" } })).status).toBe(422);
    expect(kotakSurat.length).toBeGreaterThan(0);
  });
});
