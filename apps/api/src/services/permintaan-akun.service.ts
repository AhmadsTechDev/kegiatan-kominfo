import { env } from "@/config/env";
import { Conflict, NotFound, Unprocessable } from "@/lib/errors";
import { kirimEmail } from "@/lib/mailer";
import { prisma, type Db } from "@/lib/prisma";
import { PermintaanAkunRepository } from "@/repositories/permintaan-akun.repository";
import { UndanganRepository } from "@/repositories/undangan.repository";
import type { DaftarPermintaanQuery, IsiPermintaan, SetujuiPermintaan } from "@/types/permintaan-akun.types";
import type { Admin, MetaRequest } from "@/types/umum.types";
import { periksaNip } from "@/utils/nip";
import { buatPembatasLaju } from "@/utils/rate-limit";
import { MasterService } from "./master.service";
import { UndanganService } from "./undangan.service";

/**
 * Maksimal 3 permintaan akun per jam dari satu IP
 * Service permintaan akun: orang yang belum punya akun mengajukan dari halaman login,
 * lalu admin menyetujui (akun dibuat dan diundang lewat UndanganService) atau menolak (pemohon diberi tahu lewat email).
 */
const periksaLaju = buatPembatasLaju({
  jendelaMs: 60 * 60 * 1000,
  maks: 3,
  pesan: "Terlalu banyak permintaan dari jaringan ini. Coba lagi dalam satu jam atau hubungi administrator.",
});

/**
 * Menjalankan pengiriman email tanpa menggagalkan proses utama bila email gagal
 */
async function kirimTanpaGagal(kerja: () => Promise<void>) {
  try {
    await kerja();
  } catch (e) {
    console.error("[permintaan-akun] email pemberitahuan gagal", e);
  }
}

/**
 * Memastikan NIP sah, terdaftar sebagai pegawai aktif, dan belum punya akun/permintaan
 *
 * NIP opsional, tetapi bila diisi harus cocok dengan pegawai aktif di master data.
 * Pesan galatnya dibedakan per keadaan supaya pemohon tahu langkah berikutnya (masuk, cek email, atau menunggu).
 * @param nip NIP yang diisi pemohon
 * @returns data pegawai pemilik NIP
 * @throws Unprocessable bila NIP salah format, tidak terdaftar, sudah punya akun, atau sudah ada permintaan menunggu
 */
async function cocokkanNip(nip: string) {
  const salahNip = periksaNip(nip);
  if (salahNip) throw Unprocessable("NIP tidak valid", [{ field: "nip", message: salahNip }]);
  const pegawai = await UndanganRepository.pegawaiAktifByNip(nip);
  if (!pegawai) {
    throw Unprocessable("NIP tidak terdaftar sebagai pegawai aktif", [
      { field: "nip", message: "NIP tidak terdaftar sebagai pegawai aktif. Periksa kembali, kosongkan, atau hubungi administrator." },
    ]);
  }
  const [akun, menunggu] = await Promise.all([UndanganRepository.akunPegawai(pegawai.id), PermintaanAkunRepository.menungguUntukPegawai(pegawai.id)]);
  if (akun?.aktif) throw Unprocessable("NIP ini sudah punya akun. Silakan masuk, atau hubungi administrator bila lupa kata sandi.");
  if (akun) throw Unprocessable("Undangan aktivasi sudah dikirim ke email Anda. Periksa kotak masuk atau folder spam.");
  if (menunggu) throw Unprocessable("Permintaan untuk NIP ini sudah diterima dan sedang menunggu persetujuan administrator.");
  return pegawai;
}

/**
 * Mengunci permintaan untuk diproses; 404 bila tidak ada, 409 bila sudah diproses admin lain
 *
 * KONSEP race condition: dua admin bisa menekan Setujui di waktu yang hampir sama.
 * selesaikanJikaMenunggu hanya mengubah permintaan yang statusnya masih MENUNGGU, sehingga
 * hanya satu admin yang berhasil; admin lainnya menerima 409 Conflict.
 * @param id id permintaan
 * @param nilai status baru beserta data pemrosesnya
 * @param tx koneksi transaksi (bawaan: prisma biasa)
 * @returns data permintaan sebelum diubah
 */
async function ambilAlih(id: number, nilai: Parameters<typeof PermintaanAkunRepository.selesaikanJikaMenunggu>[1], tx: Db = prisma) {
  const p = await PermintaanAkunRepository.byId(id, tx);
  if (!p) throw NotFound("Permintaan akun tidak ditemukan");
  if (!(await PermintaanAkunRepository.selesaikanJikaMenunggu(id, nilai, tx))) throw Conflict("Permintaan ini sudah diproses administrator lain");
  return p;
}

export const PermintaanAkunService = {
  /**
   * Orang luar (belum punya akun) mengajukan permintaan akun dari halaman login; admin diberi tahu lewat email
   */
  async ajukan(isi: IsiPermintaan, meta: MetaRequest) {
    periksaLaju(meta.ip ?? "tanpa-ip");
    const email = isi.email.trim().toLowerCase();
    const nama = isi.nama.trim();
    if (!nama) throw Unprocessable("Nama wajib diisi", [{ field: "nama", message: "Nama wajib diisi" }]);

    const nip = isi.nip?.trim() || null;
    const pegawai = nip ? await cocokkanNip(nip) : null;
    const [menungguEmail, pemilikEmail] = await Promise.all([PermintaanAkunRepository.menungguUntukEmail(email), UndanganRepository.akunByEmail(email)]);
    if (menungguEmail) throw Unprocessable("Permintaan dengan email ini sudah diterima dan sedang menunggu persetujuan administrator.");
    if (pemilikEmail) throw Unprocessable("Email sudah dipakai akun lain", [{ field: "email", message: "Email sudah dipakai akun lain" }]);

    const id = await PermintaanAkunRepository.insert({ pegawaiId: pegawai?.id ?? null, nama, email, catatan: isi.catatan?.trim() || null, ip: meta.ip });

    /**
     * Semua email admin aktif diambil; email pemberitahuan dikirim paralel lewat Promise.all dan kegagalannya tidak membatalkan permintaan.
     */
    const admin = await PermintaanAkunRepository.emailAdmin();
    if (admin.length) {
      /**
       * Satu email per admin agar alamat admin lain tidak saling terlihat
       */
      const surat = {
        judul: "Ada permintaan akun baru",
        pratinjau: `${nama} meminta akun dengan email ${email}.`,
        paragraf: ["Seseorang meminta akun Pendataan Kegiatan. Tinjau lalu setujui atau tolak di halaman Manajemen akun."],
        rincian: [
          { label: "Nama", nilai: nama },
          { label: "NIP", nilai: pegawai?.nip ?? "Tanpa NIP" },
          { label: "Email", nilai: email },
        ],
        tombol: { label: "Tinjau permintaan", url: `${env.FRONTEND_URL}/admin/akun?tab=permintaan` },
      };
      await Promise.all(admin.map((alamat) => kirimTanpaGagal(() => kirimEmail(alamat, `Permintaan akun baru: ${nama}`, surat))));
    }
    return { id };
  },

  /**
   * Daftar permintaan akun untuk admin, plus jumlah yang menunggu
   */
  async daftar(query: DaftarPermintaanQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [hasil, jumlahMenunggu] = await Promise.all([PermintaanAkunRepository.daftar(query.status, { page, pageSize }), PermintaanAkunRepository.jumlahMenunggu()]);
    return { ...hasil, page, pageSize, jumlahMenunggu };
  },

  /**
   * Jumlah permintaan yang menunggu (untuk badge di menu admin)
   */
  jumlahMenunggu() {
    return PermintaanAkunRepository.jumlahMenunggu();
  },

  /**
   * Menyetujui permintaan: buat data pegawai bila belum ada, lalu undang akunnya. Bila gagal, status permintaan dikembalikan ke MENUNGGU
   *
   * Status permintaan diubah lebih dulu (ambilAlih) agar admin lain tidak memproses permintaan yang sama.
   * Bila langkah berikutnya gagal (mis. email undangan gagal), blok catch mengembalikan status ke MENUNGGU
   * supaya permintaan bisa diproses ulang.
   * @param isi role akun, bidang (wajib bila pemohon tanpa NIP), dan email pengganti opsional
   * @returns hasil undangan (email tujuan dan status pengirimannya)
   */
  async setujui(id: number, isi: SetujuiPermintaan, admin: Admin) {
    const permintaan = await ambilAlih(id, { status: "DISETUJUI", diprosesOleh: admin.id });
    try {
      const email = isi.email ?? permintaan.email;
      let pegawaiId = permintaan.pegawaiId;
      if (!pegawaiId) {
        /**
         * Setiap akun tertaut ke data pegawai, jadi pemohon tanpa NIP terdaftar wajib diberi bidang
         */
        if (!isi.bidangId) throw Unprocessable("Lengkapi data pegawai pemohon", [{ field: "bidangId", message: "Bidang wajib dipilih" }]);
        pegawaiId = (
          await MasterService.buatPegawai({ nip: null, nama: permintaan.nama, bidangId: isi.bidangId })
        ).id;
      }
      return await UndanganService.undang({ pegawaiId, email, role: isi.role });
    } catch (e) {
      await PermintaanAkunRepository.kembalikanMenunggu(id);
      throw e;
    }
  },

  /**
   * Menolak permintaan dengan alasan; pemohon diberi tahu lewat email
   */
  async tolak(id: number, alasan: string, admin: Admin) {
    const bersih = alasan.trim();
    if (!bersih) throw Unprocessable("Alasan penolakan wajib diisi", [{ field: "alasan", message: "Alasan penolakan wajib diisi" }]);
    const permintaan = await prisma.$transaction(async (tx) => {
      return ambilAlih(id, { status: "DITOLAK", alasanTolak: bersih, diprosesOleh: admin.id }, tx);
    });
    await kirimTanpaGagal(() =>
      kirimEmail(permintaan.email, "Permintaan akun Anda belum disetujui", {
        judul: "Permintaan akun belum dapat disetujui",
        pratinjau: "Permintaan akun Anda di Pendataan Kegiatan belum dapat disetujui.",
        paragraf: [`Halo ${permintaan.nama},`, "Permintaan akun Anda di Pendataan Kegiatan belum dapat disetujui.", `Alasan: ${bersih}`],
        catatan: "Bila ada pertanyaan, hubungi administrator aplikasi Diskominfo Kota Palembang.",
      }),
    );
    return { id };
  },
};
