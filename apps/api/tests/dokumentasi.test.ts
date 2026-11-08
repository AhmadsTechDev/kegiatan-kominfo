// Uji unggah dokumentasi: jenis berkas dicek dari isinya, batas 20 MB dan 10 berkas, hak akses, unduh, ganti, hapus
import { describe, expect, test } from "bun:test";
import { buatKegiatan, buatPengguna, formBerkas, idUnit, isiKegiatan, loginAdmin, panggil, PNG } from "./helpers";

// Pegawai beserta satu kegiatan miliknya
async function siapkan() {
  const u = await buatPengguna();
  const k = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!));
  return { u, k };
}

describe("unggah dokumentasi", () => {
  test("foto PNG diterima, dan tampil di detail kegiatan", async () => {
    const { u, k } = await siapkan();
    const res = await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie: u.cookie, form: formBerkas(PNG, "C:\\foto\\rapat.png") });
    expect(res.status).toBe(201);
    expect(res.data).toMatchObject({ kegiatanId: k.id, namaAsli: "rapat.png", mime: "image/png" });
    expect(res.data).not.toHaveProperty("path");

    const detail = await panggil(`/kegiatan/${k.id}`, { cookie: u.cookie });
    expect(detail.data.dokumentasi).toHaveLength(1);
  });

  test("PDF diterima", async () => {
    const { u, k } = await siapkan();
    const pdf = new TextEncoder().encode("%PDF-1.4\n%%EOF");
    const res = await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie: u.cookie, form: formBerkas(pdf, "notulen.pdf") });
    expect(res.status).toBe(201);
    expect(res.data.mime).toBe("application/pdf");
  });

  test("berkas .exe ditolak 415 walau diberi nama .jpg", async () => {
    const { u, k } = await siapkan();
    const exe = new Uint8Array(64);
    exe.set([0x4d, 0x5a]);
    const res = await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie: u.cookie, form: formBerkas(exe, "foto.jpg") });
    expect(res.status).toBe(415);
  });

  test("berkas 20,01 MB ditolak 413", async () => {
    const { u, k } = await siapkan();
    const besar = new Uint8Array(Math.ceil(20.01 * 1024 * 1024));
    besar.set([0xff, 0xd8, 0xff]);
    const res = await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie: u.cookie, form: formBerkas(besar, "besar.jpg") });
    expect(res.status).toBe(413);
  });

  test("gambar rusak (tanda JPEG tetapi isinya bukan gambar) ditolak 415", async () => {
    const { u, k } = await siapkan();
    const rusak = new Uint8Array(100);
    rusak.set([0xff, 0xd8, 0xff]);
    expect((await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie: u.cookie, form: formBerkas(rusak, "rusak.jpg") })).status).toBe(415);
  });

  test("maksimal 10 berkas per kegiatan", async () => {
    const { u, k } = await siapkan();
    for (let i = 0; i < 10; i++) expect((await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie: u.cookie, form: formBerkas(PNG) })).status).toBe(201);
    const ke11 = await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie: u.cookie, form: formBerkas(PNG) });
    expect(ke11.status).toBe(413);
  });

  test("rekan satu unit tidak boleh mengunggah ke kegiatan orang lain (403); unit lain 404", async () => {
    const { k } = await siapkan();
    const rekan = await buatPengguna();
    const luar = await buatPengguna({ unitId: await idUnit("BID-OPINI") });
    expect((await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie: rekan.cookie, form: formBerkas(PNG) })).status).toBe(403);
    expect((await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie: luar.cookie, form: formBerkas(PNG) })).status).toBe(404);
  });
});

describe("unduh, ganti, hapus dokumentasi", () => {
  test("unduhan wajib login dan sesuai lingkup baca", async () => {
    const { u, k } = await siapkan();
    const d = await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie: u.cookie, form: formBerkas(PNG) });

    expect((await panggil(`/dokumentasi/${d.data.id}`)).status).toBe(401);
    const luar = await buatPengguna({ unitId: await idUnit("BID-OPINI") });
    expect((await panggil(`/dokumentasi/${d.data.id}`, { cookie: luar.cookie })).status).toBe(404);

    const unduh = await panggil(`/dokumentasi/${d.data.id}?unduh=1`, { cookie: u.cookie });
    expect(unduh.status).toBe(200);
    expect(unduh.headers.get("content-type")).toBe("image/png");
    expect(unduh.headers.get("content-disposition")).toStartWith("attachment;");
    expect(unduh.headers.get("etag")).toMatch(/^"[0-9a-f]{64}"$/);
    expect((await panggil(`/dokumentasi/${d.data.id}`, { cookie: u.cookie })).headers.get("content-disposition")).toStartWith("inline;");
  });

  test("ganti berkas lalu hapus", async () => {
    const { u, k } = await siapkan();
    const d = await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie: u.cookie, form: formBerkas(PNG) });
    const pdf = new TextEncoder().encode("%PDF-1.4\n%%EOF");
    const ganti = await panggil(`/dokumentasi/${d.data.id}`, { method: "PUT", cookie: u.cookie, form: formBerkas(pdf, "ganti.pdf") });
    expect(ganti.status).toBe(200);
    expect(ganti.data).toMatchObject({ id: d.data.id, namaAsli: "ganti.pdf", mime: "application/pdf" });
    expect((await panggil(`/dokumentasi/${d.data.id}`, { cookie: u.cookie })).headers.get("content-type")).toBe("application/pdf");

    expect((await panggil(`/dokumentasi/${d.data.id}`, { method: "DELETE", cookie: u.cookie })).status).toBe(204);
    expect((await panggil(`/dokumentasi/${d.data.id}`, { cookie: u.cookie })).status).toBe(404);
  });

  test("admin boleh menghapus dokumentasi kegiatan pegawai, pimpinan tidak", async () => {
    const { u, k } = await siapkan();
    const d = await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie: u.cookie, form: formBerkas(PNG) });
    const pimpinan = await buatPengguna({ role: "PIMPINAN" });
    expect((await panggil(`/dokumentasi/${d.data.id}`, { method: "DELETE", cookie: pimpinan.cookie })).status).toBe(403);

    const admin = await loginAdmin();
    expect((await panggil(`/kegiatan/${k.id}`, { cookie: admin })).data.bisaHapusDokumentasi).toBe(true);
    expect((await panggil(`/dokumentasi/${d.data.id}`, { method: "DELETE", cookie: admin })).status).toBe(204);
    expect((await panggil(`/dokumentasi/${d.data.id}`, { cookie: u.cookie })).status).toBe(404);
    // Admin tetap tidak bisa mengganti berkas
    const d2 = await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie: u.cookie, form: formBerkas(PNG) });
    expect((await panggil(`/dokumentasi/${d2.data.id}`, { method: "PUT", cookie: admin, form: formBerkas(PNG) })).status).toBe(403);
  });

  test("dokumentasi ikut tidak bisa diakses setelah kegiatannya dihapus", async () => {
    const { u, k } = await siapkan();
    const d = await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie: u.cookie, form: formBerkas(PNG) });
    await panggil(`/kegiatan/${k.id}`, { method: "DELETE", cookie: u.cookie });
    expect((await panggil(`/dokumentasi/${d.data.id}`, { cookie: u.cookie })).status).toBe(404);
  });
});
