// Uji pengingat email otomatis: H-1 sebelum kegiatan dan kegiatan selesai yang belum berdokumentasi
import { describe, expect, test } from "bun:test";
import type { IsiEmail } from "@/lib/mailer";
import { PengingatService } from "@/services/pengingat.service";
import { buatKegiatan, buatPengguna, formBerkas, isiKegiatan, jamLagi, loginAdmin, panggil, PNG } from "./helpers";

// Menjalankan satu putaran pengingat dan mengembalikan email yang dikirim ke alamat tertentu
async function putaran(kepada: string) {
  const terkirim: { kepada: string; subjek: string; isi: IsiEmail }[] = [];
  await PengingatService.jalankan(new Date(), async (ke, subjek, isi) => {
    terkirim.push({ kepada: ke, subjek, isi });
  });
  return terkirim.filter((s) => s.kepada === kepada);
}

describe("pengingat email", () => {
  test("kegiatan dalam 24 jam ke depan diingatkan sekali saja", async () => {
    const u = await buatPengguna();
    const k = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { judul: "Rapat pengingat", tglMulai: jamLagi(3), tglSelesai: jamLagi(4) }));
    const pertama = await putaran(u.email);
    expect(pertama).toHaveLength(1);
    expect(pertama[0]!.subjek).toMatch(/^Pengingat: Rapat pengingat (hari ini|besok)$/);
    expect(pertama[0]!.isi.tombol!.url).toEndWith(`/kegiatan/${k.id}`);
    expect(await putaran(u.email)).toHaveLength(0);
  });

  test("kegiatan selesai tanpa dokumentasi diingatkan; yang sudah berdokumentasi tidak", async () => {
    const u = await buatPengguna();
    await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { judul: "Belum didokumentasi", tglMulai: jamLagi(-4), tglSelesai: jamLagi(-2) }));
    const sudah = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { judul: "Sudah didokumentasi", tglMulai: jamLagi(-4), tglSelesai: jamLagi(-2) }));
    await panggil(`/kegiatan/${sudah.id}/dokumentasi`, { cookie: u.cookie, form: formBerkas(PNG) });
    const surel = await putaran(u.email);
    expect(surel.map((s) => s.subjek)).toEqual(["Lengkapi dokumentasi: Belum didokumentasi"]);
  });

  test("kegiatan dibatalkan, terlalu jauh, atau akun penanggung jawab nonaktif tidak diingatkan", async () => {
    const u = await buatPengguna();
    const batal = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { tglMulai: jamLagi(3), tglSelesai: jamLagi(4) }));
    await panggil(`/kegiatan/${batal.id}/batalkan`, { cookie: u.cookie, json: { alasan: "Batal", expectedUpdatedAt: batal.updatedAt } });
    await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { tglMulai: jamLagi(30), tglSelesai: jamLagi(31) }));
    expect(await putaran(u.email)).toHaveLength(0);

    const nonaktif = await buatPengguna();
    await buatKegiatan(nonaktif.cookie, await isiKegiatan(nonaktif.pegawaiId!, { tglMulai: jamLagi(3), tglSelesai: jamLagi(4) }));
    await panggil(`/admin/akun/${nonaktif.userId}/nonaktifkan`, { cookie: await loginAdmin(), json: {} });
    expect(await putaran(nonaktif.email)).toHaveLength(0);
  });

  test("pengingat yang dimatikan di Preferensi tidak dikirim; jenis lain tetap", async () => {
    const u = await buatPengguna();
    expect((await panggil("/me/preferensi", { method: "PATCH", cookie: u.cookie, json: { notifPengingatKegiatan: false } })).status).toBe(200);
    await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId, { judul: "Besok tanpa pengingat", tglMulai: jamLagi(3), tglSelesai: jamLagi(4) }));
    await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId, { judul: "Kemarin tanpa foto", tglMulai: jamLagi(-4), tglSelesai: jamLagi(-2) }));
    expect((await putaran(u.email)).map((s) => s.subjek)).toEqual(["Lengkapi dokumentasi: Kemarin tanpa foto"]);
  });
});
