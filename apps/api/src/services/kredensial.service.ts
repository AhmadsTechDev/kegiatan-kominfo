import { env } from "@/config/env";
import { AppError, NotFound, Unprocessable } from "@/lib/errors";
import { kirimEmail, type IsiEmail } from "@/lib/mailer";
import { galatDuplikat, prisma, type Db } from "@/lib/prisma";
import { cocokSandi, hashSandi } from "@/lib/sandi";
import { AuthRepository } from "@/repositories/auth.repository";
import { SesiRepository } from "@/repositories/sesi.repository";
import { TokenAkunRepository } from "@/repositories/token-akun.repository";
import type { AturSandi, GantiEmail } from "@/types/auth.types";
import type { MetaRequest } from "@/types/umum.types";
import { formatWaktu } from "@/utils/format-waktu";
import { periksaSandi } from "@/utils/kebijakan-sandi";
import { buatPembatasLaju } from "@/utils/rate-limit";
import { buatToken, MASA_TOKEN_MS, type TujuanToken } from "@/utils/token";
import { AuditLogService } from "./audit-log.service";

/**
 * Alur yang memakai tautan email sekali pakai: aktivasi akun, lupa/atur ulang kata sandi, dan verifikasi email baru.
 * KONSEP token sekali pakai: kode acak panjang yang dikirim di tautan email sebagai bukti bahwa yang membuka
 * tautan memang pemilik email. Bila database bocor, hash token tidak bisa dipakai untuk membuka tautan.
 * Setiap token punya masa berlaku dan langsung "dipakai habis" begitu berhasil digunakan.
 * Token asli hanya ada di email; basis data menyimpan hash-nya (utils/token.ts).
 */

export const PESAN_LUPA_SANDI = "Bila email tersebut terdaftar dan aktif, tautan untuk mengatur ulang kata sandi telah dikirim. Periksa kotak masuk atau folder spam.";

/**
 * KONSEP Record<K, V>: objek yang kuncinya harus lengkap sesuai K. Bila jenis token baru ditambahkan
 * di TujuanToken tetapi pesannya lupa ditulis di sini, TypeScript langsung memberi galat.
 */
const PESAN_TOKEN: Record<TujuanToken, string> = {
  aktivasi: "Tautan aktivasi tidak berlaku atau sudah kedaluwarsa. Minta administrator mengirim ulang undangan.",
  "reset-sandi": "Tautan atur ulang kata sandi tidak berlaku atau sudah kedaluwarsa. Minta tautan baru dari halaman Lupa kata sandi.",
  "ganti-email": "Tautan verifikasi email tidak berlaku atau sudah kedaluwarsa. Ajukan ulang perubahan email dari halaman Pengaturan.",
};

const jam = (tujuan: TujuanToken) => MASA_TOKEN_MS[tujuan] / 3_600_000;
const tautan = (halaman: string, token: string) => `${env.FRONTEND_URL}/${halaman}?token=${encodeURIComponent(token)}`;

/**
 * Isi email untuk setiap alur. Email keamanan mencantumkan waktu kejadian dan jalan mengamankan akun.
 */
const amankan = { label: "Atur ulang kata sandi", url: `${env.FRONTEND_URL}/lupa-sandi` };

/**
 * Template semua email di alur kredensial. Setiap fungsi menerima data (nama, token) lalu mengembalikan subjek dan isi.
 * `satisfies` memeriksa bentuk objek tanpa mengubah tipe aslinya, jadi tiap template tetap punya parameternya sendiri.
 */
const SURAT = {
  aktivasi: (nama: string, token: string) => ({
    subjek: "Aktifkan akun Anda",
    isi: {
      judul: "Aktifkan akun Anda",
      pratinjau: `Buat kata sandi untuk mulai memakai aplikasi. Tautan berlaku ${jam("aktivasi")} jam.`,
      paragraf: [
        `Halo ${nama},`,
        "Administrator Diskominfo Kota Palembang telah membuatkan akun untuk Anda di Pendataan Kegiatan.",
        "Tekan tombol di bawah untuk memverifikasi email dan membuat kata sandi. Setelah itu Anda masuk dengan email ini.",
      ],
      tombol: { label: "Aktifkan akun", url: tautan("aktivasi", token) },
    },
  }),
  reset: (nama: string, token: string) => ({
    subjek: "Atur ulang kata sandi",
    isi: {
      judul: "Atur ulang kata sandi",
      pratinjau: `Buat kata sandi baru lewat tautan yang berlaku ${jam("reset-sandi")} jam.`,
      paragraf: [`Halo ${nama},`, "Ada permintaan untuk mengatur ulang kata sandi akun Anda. Tekan tombol di bawah untuk membuat kata sandi baru."],
      tombol: { label: "Buat kata sandi baru", url: tautan("reset-sandi", token) },
      catatan: `Tautan berlaku ${jam("reset-sandi")} jam dan hanya dapat dipakai sekali. Bila Anda tidak memintanya, abaikan email ini; kata sandi Anda tidak berubah.`,
    },
  }),
  sandiDiubah: (nama: string, waktu = new Date()) => ({
    subjek: "Kata sandi Anda diubah",
    isi: {
      judul: "Kata sandi Anda diubah",
      pratinjau: `Kata sandi akun Anda diubah pada ${formatWaktu(waktu)}.`,
      paragraf: [`Halo ${nama},`, "Kata sandi akun Pendataan Kegiatan Anda baru saja diubah."],
      rincian: [{ label: "Waktu", nilai: formatWaktu(waktu) }],
      tombol: amankan,
      catatan: "Bila bukan Anda yang mengubahnya, segera atur ulang kata sandi lewat tombol di atas lalu hubungi administrator aplikasi.",
    },
  }),
  verifikasiEmail: (nama: string, token: string) => ({
    subjek: "Verifikasi email baru Anda",
    isi: {
      judul: "Verifikasi email baru",
      pratinjau: "Pastikan email ini milik Anda agar bisa dipakai untuk masuk.",
      paragraf: [`Halo ${nama},`, "Tekan tombol di bawah untuk memastikan email ini milik Anda. Setelah diverifikasi, Anda masuk dengan email ini."],
      tombol: { label: "Verifikasi email", url: tautan("konfirmasi-email", token) },
      catatan: `Tautan berlaku ${jam("ganti-email")} jam. Sampai diverifikasi, Anda tetap masuk dengan email lama.`,
    },
  }),
  permintaanGantiEmail: (nama: string, emailBaru: string, waktu = new Date()) => ({
    subjek: "Permintaan ganti email akun Anda",
    isi: {
      judul: "Ada permintaan ganti email",
      pratinjau: `Email akun Anda diminta diganti menjadi ${emailBaru}.`,
      paragraf: [`Halo ${nama},`, "Ada permintaan untuk mengganti email akun Anda. Email ini tetap berlaku sampai email baru diverifikasi."],
      rincian: [
        { label: "Email baru", nilai: emailBaru },
        { label: "Waktu", nilai: formatWaktu(waktu) },
      ],
      tombol: amankan,
      catatan: "Bila bukan Anda yang memintanya, segera atur ulang kata sandi lewat tombol di atas lalu hubungi administrator aplikasi.",
    },
  }),
  emailDiganti: (nama: string, emailBaru: string, waktu = new Date()) => ({
    subjek: "Email akun Anda diganti",
    isi: {
      judul: "Email akun Anda diganti",
      pratinjau: `Mulai sekarang Anda masuk dengan ${emailBaru}.`,
      paragraf: [`Halo ${nama},`, "Email akun Pendataan Kegiatan Anda telah diganti. Email ini tidak lagi dapat dipakai untuk masuk."],
      rincian: [
        { label: "Email baru", nilai: emailBaru },
        { label: "Waktu", nilai: formatWaktu(waktu) },
      ],
      catatan: "Bila bukan Anda yang menggantinya, segera hubungi administrator aplikasi agar email akun dikembalikan.",
    },
  }),
} satisfies Record<string, (...a: never[]) => { subjek: string; isi: IsiEmail }>;

/**
 * Pembatas laju per IP untuk permintaan lupa sandi, per email (diam-diam, agar tidak membocorkan email terdaftar),
 * per IP untuk semua tautan publik, dan per akun untuk ganti email
 * KONSEP rate limit (pembatas laju): membatasi berapa kali sebuah aksi boleh dilakukan dalam jangka waktu tertentu,
 * untuk mencegah penyalahgunaan seperti spam email atau tebak-tebakan token.
 */
const lajuLupaIp = buatPembatasLaju({ jendelaMs: 15 * 60_000, maks: 5, pesan: "Terlalu banyak permintaan atur ulang kata sandi. Coba lagi dalam 15 menit." });
const lajuLupaEmail = buatPembatasLaju({ jendelaMs: 60 * 60_000, maks: 3 });
const lajuTautan = buatPembatasLaju({ jendelaMs: 15 * 60_000, maks: 20, pesan: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." });
const lajuGantiEmail = buatPembatasLaju({ jendelaMs: 60 * 60_000, maks: 5, pesan: "Terlalu banyak permintaan ganti email. Coba lagi dalam satu jam." });

/**
 * true bila masih dalam batas laju; false (tanpa galat) bila sudah melewatinya
 *
 * Pembatas laju biasanya melempar galat 429. Fungsi ini mengubahnya menjadi true/false,
 * dipakai saat batas harus dicek "diam-diam" tanpa memberi tahu penyerang bahwa batasnya tercapai.
 * @param periksa fungsi pembatas laju dari buatPembatasLaju
 * @param kunci identitas yang dibatasi (mis. alamat email)
 * @returns true bila masih boleh, false bila sudah melewati batas
 */
function dalamBatas(periksa: (kunci: string) => void, kunci: string) {
  try {
    periksa(kunci);
    return true;
  } catch {
    return false;
  }
}

/**
 * 410 Gone: tautannya pernah ada tetapi sudah tidak berlaku (kedaluwarsa, sudah dipakai, atau salah).
 */
const tokenTidakBerlaku = (tujuan: TujuanToken) => new AppError(410, "TOKEN_TIDAK_BERLAKU", PESAN_TOKEN[tujuan]);

/**
 * Mengirim email pemberitahuan tanpa menunggu dan tanpa menggagalkan proses utama
 * KONSEP fire-and-forget: `void kirimEmail(...)` menjalankan pengiriman tanpa menunggu hasilnya (tanpa await).
 * Pengguna tidak perlu menunggu email pemberitahuan terkirim, dan bila gagal cukup dicatat di log.
 */
function kirimDiBelakang(kepada: string, { subjek, isi }: { subjek: string; isi: IsiEmail }) {
  void kirimEmail(kepada, subjek, isi).catch((e) => console.error("[kredensial] email pemberitahuan gagal", e));
}

/**
 * Mengirim email bertautan; galat 502 bila gagal agar admin/pengguna bisa mengulang
 * Berbeda dengan kirimDiBelakang: email berisi tautan WAJIB terkirim, jadi kegagalan dilaporkan sebagai galat 502 agar bisa diulang.
 */
async function kirimWajib(kepada: string, { subjek, isi }: { subjek: string; isi: IsiEmail }, pesanGagal: string) {
  try {
    await kirimEmail(kepada, subjek, isi);
  } catch (e) {
    console.error("[kredensial] email gagal", e);
    throw new AppError(502, "EMAIL_GAGAL", pesanGagal);
  }
}

/**
 * Akun pemilik token yang masih berlaku beserta waktu kedaluwarsa token; undefined bila token salah
 */
async function akunDariToken(tujuan: TujuanToken, token: string) {
  const v = await TokenAkunRepository.cari(tujuan, token);
  const akun = v ? await AuthRepository.akunKredensial({ id: v.value }) : undefined;
  return akun && v ? { ...akun, kedaluwarsa: v.expiresAt } : undefined;
}

/**
 * Memeriksa kebijakan kata sandi lalu membuat hash-nya
 *
 * @param password kata sandi yang diketik pengguna
 * @param email email akun, dipakai untuk menolak sandi yang memuat bagian depan email
 * @param field nama kolom form untuk pesan galat
 * @returns hash Argon2id dari kata sandi
 * @throws Unprocessable bila sandi tidak memenuhi kebijakan (8-128 karakter, berisi huruf dan angka, tidak memuat email)
 */
async function hashSandiSah(password: string, email: string, field = "password") {
  const salah = periksaSandi(password, { email });
  if (salah) throw Unprocessable("Kata sandi belum memenuhi syarat", [{ field, message: salah }]);
  return hashSandi(password);
}

const IP = (meta: MetaRequest) => meta.ip ?? "tanpa-ip";

export const KredensialService = {
  /**
   * Membuat token baru (token lama dengan tujuan yang sama tidak berlaku lagi). Kirim `db` agar ikut transaksi
   */
  async terbitkan(tujuan: TujuanToken, userId: string, db?: Db) {
    const token = buatToken();
    const kedaluwarsa = new Date(Date.now() + MASA_TOKEN_MS[tujuan]);
    await TokenAkunRepository.simpan(tujuan, userId, token, kedaluwarsa, db);
    return { token, kedaluwarsa };
  },

  /**
   * Mengirim email undangan aktivasi; 502 EMAIL_GAGAL bila gagal
   */
  kirimUndangan(akun: { name: string; email: string }, token: string) {
    return kirimWajib(akun.email, SURAT.aktivasi(akun.name, token), "Email undangan gagal dikirim. Periksa konfigurasi SMTP lalu kirim ulang undangan.");
  },

  /**
   * Mengirim email tautan atur ulang kata sandi; 502 EMAIL_GAGAL bila gagal
   */
  kirimTautanReset(akun: { name: string; email: string }, token: string) {
    return kirimWajib(akun.email, SURAT.reset(akun.name, token), "Email atur ulang kata sandi gagal dikirim. Periksa konfigurasi SMTP lalu coba lagi.");
  },

  /**
   * Memberi tahu pemilik akun bahwa kata sandinya berubah
   */
  beritahuSandiDiubah(akun: { name: string; email: string }) {
    kirimDiBelakang(akun.email, SURAT.sandiDiubah(akun.name));
  },

  /**
   * ---------- Aktivasi akun dari email undangan ----------
   */

  /**
   * Nama, email, dan masa berlaku tautan aktivasi (untuk halaman aktivasi sebelum membuat kata sandi)
   */
  async infoAktivasi(token: string, meta: MetaRequest) {
    lajuTautan(IP(meta));
    const akun = await akunDariToken("aktivasi", token);
    if (!akun || akun.banned || akun.punyaKredensial) throw tokenTidakBerlaku("aktivasi");
    return { nama: akun.name, email: akun.email, kedaluwarsa: akun.kedaluwarsa };
  },

  /**
   * Membuat kata sandi pertama: email terverifikasi, akun menjadi AKTIF, token tidak bisa dipakai lagi
   *
   * Token dicek dua kali: sekali di awal untuk menampilkan pesan yang jelas, dan sekali lagi di dalam transaksi
   * saat token "dipakai". Pengecekan kedua mencegah satu tautan dipakai dua kali bila dibuka bersamaan.
   * @returns email akun, agar halaman berikutnya bisa langsung mengisinya di form login
   * @throws AppError 410 bila tautan tidak berlaku
   */
  async aktivasi({ token, password }: AturSandi, meta: MetaRequest) {
    lajuTautan(IP(meta));
    const akun = await akunDariToken("aktivasi", token);
    if (!akun || akun.banned || akun.punyaKredensial) throw tokenTidakBerlaku("aktivasi");
    const hash = await hashSandiSah(password, akun.email);
    await prisma.$transaction(async (tx) => {
      if ((await TokenAkunRepository.pakai("aktivasi", token, tx)) !== akun.id) throw tokenTidakBerlaku("aktivasi");
      await AuthRepository.buatKredensial(akun.id, hash, tx);
      await AuthRepository.verifikasiDanBuka(akun.id, tx);
      await AuditLogService.catat({ aktorId: akun.id, aksi: "aktivasi", entitas: "user", entitasId: akun.id, ...meta }, tx);
    });
    return { email: akun.email };
  },

  /**
   * ---------- Lupa dan atur ulang kata sandi ----------
   */

  /**
   * Selalu menjawab sama, terdaftar atau tidak, agar tidak bisa dipakai menebak email. Tautan hanya untuk akun AKTIF
   *
   * KONSEP user enumeration: bila jawaban untuk email terdaftar dan tidak terdaftar berbeda, penyerang bisa
   * mengetahui email mana yang punya akun. Karena itu jawabannya selalu sama dan emailnya dikirim di belakang.
   * @param emailMentah email yang diketik pengguna (belum dirapikan)
   * @returns pesan umum yang sama untuk semua kasus
   */
  async lupaSandi(emailMentah: string, meta: MetaRequest) {
    lajuLupaIp(IP(meta));
    const email = emailMentah.trim().toLowerCase();
    const akun = await AuthRepository.akunKredensial({ email });
    if (akun && !akun.banned && akun.punyaKredensial && dalamBatas(lajuLupaEmail, email)) {
      const { token } = await KredensialService.terbitkan("reset-sandi", akun.id);
      await AuditLogService.catat({ aktorId: null, aksi: "minta_reset_sandi", entitas: "user", entitasId: akun.id, ...meta });
      kirimDiBelakang(akun.email, SURAT.reset(akun.name, token));
    }
    return { message: PESAN_LUPA_SANDI };
  },

  /**
   * Email dan masa berlaku tautan atur ulang (untuk halaman reset sebelum mengisi kata sandi)
   */
  async infoReset(token: string, meta: MetaRequest) {
    lajuTautan(IP(meta));
    const akun = await akunDariToken("reset-sandi", token);
    if (!akun || akun.banned || !akun.punyaKredensial) throw tokenTidakBerlaku("reset-sandi");
    return { email: akun.email, kedaluwarsa: akun.kedaluwarsa };
  },

  /**
   * Mengganti kata sandi lewat tautan: kunci login dibuka dan semua sesi lama dicabut
   */
  async resetSandi({ token, password }: AturSandi, meta: MetaRequest) {
    lajuTautan(IP(meta));
    const akun = await akunDariToken("reset-sandi", token);
    if (!akun || akun.banned || !akun.punyaKredensial) throw tokenTidakBerlaku("reset-sandi");
    const hash = await hashSandiSah(password, akun.email);
    await prisma.$transaction(async (tx) => {
      if ((await TokenAkunRepository.pakai("reset-sandi", token, tx)) !== akun.id) throw tokenTidakBerlaku("reset-sandi");
      await AuthRepository.gantiSandi(akun.id, hash, tx);
      await AuthRepository.verifikasiDanBuka(akun.id, tx);

      /**
       * Semua sesi login lama dicabut, jadi orang yang mungkin mengetahui sandi lama langsung keluar dari semua perangkat.
       */
      const sesiDicabut = await SesiRepository.hapusSemua(akun.id, undefined, tx);
      await AuditLogService.catat(
        { aktorId: akun.id, aksi: "reset_sandi", entitas: "user", entitasId: akun.id, sesudah: { metode: "tautan_email", sesiDicabut }, ...meta },
        tx,
      );
    });
    KredensialService.beritahuSandiDiubah(akun);
    return { email: akun.email };
  },

  /**
   * ---------- Ganti email (diminta pemilik akun dari Pengaturan) ----------
   */

  /**
   * Menyimpan email baru sebagai "menunggu verifikasi" dan mengirim tautan ke email baru. Email lama tetap dipakai login
   *
   * Mengganti email butuh kata sandi saat ini, supaya orang yang meminjam perangkat yang sedang login
   * tidak bisa mengambil alih akun dengan mengganti emailnya.
   * @param userId pemilik akun yang sedang login
   * @returns email baru dan waktu kedaluwarsa tautan verifikasinya
   * @throws Unprocessable bila sandi salah, email sama, atau email sudah dipakai akun lain
   */
  async mintaGantiEmail(userId: string, { email: emailMentah, password }: GantiEmail, meta: MetaRequest) {
    lajuGantiEmail(userId);
    const akun = await AuthRepository.akunKredensial({ id: userId });
    if (!akun) throw NotFound("Pengguna tidak ditemukan");
    const hash = await AuthRepository.hashSandi(userId);
    if (!hash || !(await cocokSandi({ hash, password }))) {
      throw Unprocessable("Kata sandi saat ini salah", [{ field: "password", message: "Kata sandi saat ini salah" }]);
    }
    const email = emailMentah.trim().toLowerCase();
    if (email === akun.email) throw Unprocessable("Email baru sama dengan email saat ini", [{ field: "email", message: "Email baru sama dengan email saat ini" }]);
    if (await AuthRepository.emailDipakai(email, userId)) throw Unprocessable("Email sudah dipakai akun lain", [{ field: "email", message: "Email sudah dipakai akun lain" }]);

    const { token, kedaluwarsa } = await prisma.$transaction(async (tx) => {
      await AuthRepository.setEmailBaru(userId, email, tx);
      const hasil = await KredensialService.terbitkan("ganti-email", userId, tx);
      await AuditLogService.catat({ aktorId: userId, aksi: "minta_ganti_email", entitas: "user", entitasId: userId, sebelum: { email: akun.email }, sesudah: { emailBaru: email }, ...meta }, tx);
      return hasil;
    });
    await kirimWajib(email, SURAT.verifikasiEmail(akun.name, token), "Email verifikasi gagal dikirim. Coba lagi beberapa saat.");
    kirimDiBelakang(akun.email, SURAT.permintaanGantiEmail(akun.name, email));
    return { emailBaru: email, kedaluwarsa };
  },

  /**
   * Membatalkan perubahan email yang belum diverifikasi
   */
  async batalGantiEmail(userId: string, meta: MetaRequest) {
    const akun = await AuthRepository.akunKredensial({ id: userId });
    if (!akun?.emailBaru) throw Unprocessable("Tidak ada perubahan email yang menunggu verifikasi");
    await prisma.$transaction(async (tx) => {
      await AuthRepository.setEmailBaru(userId, null, tx);
      await TokenAkunRepository.hapusMilik(userId, "ganti-email", tx);
      await AuditLogService.catat({ aktorId: userId, aksi: "batal_ganti_email", entitas: "user", entitasId: userId, sebelum: { emailBaru: akun.emailBaru }, ...meta }, tx);
    });
    return { emailBaru: null };
  },

  /**
   * Membuka tautan verifikasi: email baru menggantikan email lama (tanpa perlu login)
   */
  async konfirmasiEmail(token: string, meta: MetaRequest) {
    lajuTautan(IP(meta));
    const akun = await akunDariToken("ganti-email", token);
    if (!akun || akun.banned || !akun.emailBaru) throw tokenTidakBerlaku("ganti-email");
    const baru = akun.emailBaru;
    const dipakai = () => Unprocessable("Email ini sudah dipakai akun lain. Ajukan email lain dari halaman Pengaturan.");
    if (await AuthRepository.emailDipakai(baru, akun.id)) throw dipakai();
    try {
      await prisma.$transaction(async (tx) => {
        if ((await TokenAkunRepository.pakai("ganti-email", token, tx)) !== akun.id) throw tokenTidakBerlaku("ganti-email");
        await AuthRepository.terapkanEmailBaru(akun.id, baru, tx);
        await AuditLogService.catat({ aktorId: akun.id, aksi: "ganti_email", entitas: "user", entitasId: akun.id, sebelum: { email: akun.email }, sesudah: { email: baru }, ...meta }, tx);
      });

    /**
     * Dua orang bisa memverifikasi email yang sama bersamaan; database menolak salah satunya (UNIQUE), dan galat itu diubah menjadi pesan yang mudah dipahami.
     */
    } catch (e) {
      if (galatDuplikat(e)) throw dipakai();
      throw e;
    }
    kirimDiBelakang(akun.email, SURAT.emailDiganti(akun.name, baru));
    return { email: baru };
  },
};
