// Uji laporan: rekap, ekspor PDF, pratinjau, dashboard, kalender, dan pantau harus menghitung angka yang sama.
// Setiap uji memakai bidang baru dan periode khusus (tahun 2031 / 2020) agar angkanya tidak tercampur data uji lain.
import { describe, expect, test } from "bun:test";
import { buatBidang, buatKegiatan, buatPengguna, formBerkas, idJenis, isiKegiatan, loginAdmin, panggil, PNG } from "./helpers";

// Waktu WIB pada tanggal tertentu, contoh wib("2031-03-05", 9)
const wib = (tanggal: string, jam: number) => `${tanggal}T${String(jam).padStart(2, "0")}:00:00+07:00`;

// Satu bidang baru berisi satu pegawai dengan tiga kegiatan di Maret 2031 (satu dibatalkan)
async function siapkanMaret2031() {
  const bidang = await buatBidang();
  const u = await buatPengguna({ unitId: bidang.id });
  const rapat = await idJenis("Rapat");
  const sosialisasi = await idJenis("Sosialisasi");
  await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { jenisId: rapat, tglMulai: wib("2031-03-05", 9), tglSelesai: wib("2031-03-05", 11), jumlahPeserta: 10 }));
  await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { jenisId: sosialisasi, tglMulai: wib("2031-03-20", 13), tglSelesai: wib("2031-03-20", 15), jumlahPeserta: 25 }));
  const batal = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { jenisId: rapat, tglMulai: wib("2031-03-28", 8), tglSelesai: wib("2031-03-28", 9), jumlahPeserta: 5 }));
  const res = await panggil(`/kegiatan/${batal.id}/batalkan`, { cookie: u.cookie, json: { alasan: "Ditunda", expectedUpdatedAt: batal.updatedAt } });
  expect(res.status).toBe(200);
  return { bidang, u, rapat, sosialisasi };
}

describe("angka laporan konsisten", () => {
  test("rekap, ekspor, pratinjau, dashboard, kalender, dan pantau untuk data yang sama", async () => {
    const { bidang, u, rapat, sosialisasi } = await siapkanMaret2031();
    const admin = await loginAdmin();
    const filter = `unit=${bidang.id}&periode=2031-03`;

    const rekap = await panggil(`/rekap?${filter}`, { cookie: admin });
    expect(rekap.status).toBe(200);
    expect(rekap.data.total).toEqual({ total: 3, akanDatang: 2, berlangsung: 0, selesai: 0, dibatalkan: 1, peserta: 40 });
    expect(rekap.data.tren).toEqual([{ periode: "2031-03", jumlah: 3 }]);
    expect(rekap.data.perJenis).toEqual([
      { id: rapat, nama: "Rapat", jumlah: 2 },
      { id: sosialisasi, nama: "Sosialisasi", jumlah: 1 },
    ]);
    expect(rekap.data.perPegawai).toEqual([expect.objectContaining({ id: u.pegawaiId, jumlah: 3, bidang: bidang.nama })]);
    expect(rekap.data.perUnit).toEqual([expect.objectContaining({ unit: { id: bidang.id, kode: bidang.kode, nama: bidang.nama }, total: 3 })]);

    const harian = await panggil(`/rekap?unit=${bidang.id}&dari=2031-03-01&sampai=2031-03-31&satuan=hari`, { cookie: admin });
    expect(harian.data.tren).toHaveLength(31);
    expect(harian.data.tren.filter((t: { jumlah: number }) => t.jumlah > 0).map((t: { periode: string }) => t.periode)).toEqual(["2031-03-05", "2031-03-20", "2031-03-28"]);

    const pdf = await panggil(`/ekspor/kegiatan.pdf?${filter}`, { cookie: admin });
    expect(pdf.headers.get("x-jumlah-kegiatan")).toBe("3");
    expect(pdf.headers.get("content-disposition")).toBe(`attachment; filename="rekap-kegiatan-2031-03-${new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)}.pdf"`);
    expect(new TextDecoder().decode(pdf.data.slice(0, 5))).toBe("%PDF-");

    const pratinjau = await panggil(`/ekspor/pratinjau?${filter}`, { cookie: admin });
    expect(pratinjau.data.baris).toHaveLength(3);
    expect(pratinjau.data.ringkasan[0]).toEqual({ label: "Total kegiatan", nilai: 3 });
    expect(pratinjau.data.subjudul).toContain("Maret 2031");
    expect(pratinjau.data.subjudul).toContain(bidang.nama);

    const dashboard = await panggil("/dashboard?periode=2031-03", { cookie: admin });
    expect(dashboard.data.kpi).toMatchObject({ total: 3, akanDatang: 2, berlangsung: 0, totalPeriodeSebelumnya: 0 });
    expect(dashboard.data.trenUnitBulanan.data.at(-1)).toMatchObject({ bulan: "2031-03", jumlah: { [bidang.kode]: 3 } });
    // Jenis aktif tanpa kegiatan ikut tampil dengan jumlah 0 di belakang
    expect(dashboard.data.sebaranJenis.filter((j: { jumlah: number }) => j.jumlah > 0)).toEqual(rekap.data.perJenis);
    expect(dashboard.data.sebaranJenis.slice(rekap.data.perJenis.length).every((j: { jumlah: number }) => j.jumlah === 0)).toBe(true);
    expect(dashboard.data.admin).toEqual({ menungguAktivasi: expect.any(Number) });

    const kalender = await panggil("/kalender?bulan=2031-03", { cookie: u.cookie });
    expect(kalender.data.items).toHaveLength(3);
    expect(kalender.data.items.every((k: { unitIndukId: number }) => k.unitIndukId === bidang.id)).toBe(true);

    const pimpinan = await buatPengguna({ role: "PIMPINAN" });
    const pantau = await panggil(`/pantau/ringkasan?unit=${bidang.id}&dari=2031-03-01&sampai=2031-03-31`, { cookie: pimpinan.cookie });
    expect(pantau.data).toEqual({ total: 3, draf: 0, terkirim: 3, diperiksa: 0, perluPerbaikan: 0 });
  });

  test("ekspor tercatat di audit log beserta filter dan jumlahnya", async () => {
    const { bidang } = await siapkanMaret2031();
    const u = await buatPengguna({ role: "PIMPINAN", unitId: bidang.id });
    await panggil(`/ekspor/kegiatan.pdf?unit=${bidang.id}`, { cookie: u.cookie });
    const admin = await loginAdmin();
    const audit = await panggil(`/audit-log?aktor=${u.userId}&aksi=ekspor`, { cookie: admin });
    expect(audit.data.total).toBe(1);
    const detail = await panggil(`/audit-log/${audit.data.items[0].id}`, { cookie: admin });
    expect(detail.data.dataSesudah).toMatchObject({ format: "pdf", jumlah: 3, filter: { unit: bidang.id } });
  });

  test("PEGAWAI tidak bisa membuka rekap dan laporan (403)", async () => {
    const { u } = await siapkanMaret2031();
    expect((await panggil("/rekap?periode=2031-03", { cookie: u.cookie })).status).toBe(403);
    expect((await panggil("/ekspor/pratinjau?periode=2031-03", { cookie: u.cookie })).status).toBe(403);
    expect((await panggil("/ekspor/kegiatan.pdf?periode=2031-03", { cookie: u.cookie })).status).toBe(403);
  });

  test("kegiatan selesai tanpa dokumentasi muncul di beranda pemiliknya sampai dokumentasinya diunggah", async () => {
    const bidang = await buatBidang();
    const u = await buatPengguna({ unitId: bidang.id });
    const k = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!, { tglMulai: wib("2020-05-10", 9), tglSelesai: wib("2020-05-10", 11) }));
    const admin = await loginAdmin();

    const sebelum = await panggil("/dashboard?periode=2020-05", { cookie: admin });
    expect(sebelum.data.kpi).toMatchObject({ selesai: 1 });
    // Dashboard dinas tidak lagi memantau dokumentasi (opsional)
    expect(sebelum.data.kpi.selesaiTanpaDokumentasi).toBeUndefined();
    expect(sebelum.data.perluPerhatian).toBeUndefined();
    const saya = await panggil("/dashboard/saya", { cookie: u.cookie });
    expect(saya.data.perluDokumentasi.total).toBe(1);
    expect(saya.data.unit).toEqual({ id: bidang.id, jumlahBulanIni: 0 });

    await panggil(`/kegiatan/${k.id}/dokumentasi`, { cookie: u.cookie, form: formBerkas(PNG) });
    expect((await panggil("/dashboard/saya", { cookie: u.cookie })).data.perluDokumentasi.total).toBe(0);
  });

  test("agenda pribadi berisi kegiatan saya yang akan datang", async () => {
    const u = await buatPengguna();
    const k = await buatKegiatan(u.cookie, await isiKegiatan(u.pegawaiId!));
    const saya = await panggil("/dashboard/saya", { cookie: u.cookie });
    expect(saya.data.agenda.total).toBe(1);
    expect(saya.data.agenda.items[0].id).toBe(k.id);
    expect(saya.data.pekanIni.some((x: { id: number }) => x.id === k.id)).toBe(true);
  });
});

describe("batas laporan", () => {
  test("tren per hari lebih dari 400 hari ditolak 422; satuan tidak dikenal 422", async () => {
    const admin = await loginAdmin();
    expect((await panggil("/rekap?satuan=hari&dari=2020-01-01&sampai=2026-01-01", { cookie: admin })).status).toBe(422);
    expect((await panggil("/rekap?satuan=minggu", { cookie: admin })).status).toBe(422);
  });

  test("ekspor dibatasi 10 kali per menit per akun; pratinjau tidak dibatasi", async () => {
    const u = await buatPengguna({ role: "PIMPINAN", unitId: (await buatBidang()).id });
    for (let i = 0; i < 10; i++) expect((await panggil("/ekspor/kegiatan.pdf", { cookie: u.cookie })).status).toBe(200);
    const ke11 = await panggil("/ekspor/kegiatan.pdf", { cookie: u.cookie });
    expect(ke11.status).toBe(429);
    expect((await panggil("/ekspor/pratinjau", { cookie: u.cookie })).status).toBe(200);
  });
});
