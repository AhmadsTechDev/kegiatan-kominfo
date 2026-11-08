import { NotFound, Unprocessable } from "@/lib/errors";
import { galatDuplikat, prisma, type Db } from "@/lib/prisma";
import { AuthRepository } from "@/repositories/auth.repository";
import { MasterRepository } from "@/repositories/master.repository";
import { SesiRepository } from "@/repositories/sesi.repository";
import { TokenAkunRepository } from "@/repositories/token-akun.repository";
import { UserRepository } from "@/repositories/user.repository";
import type { NilaiPegawai } from "@/types/master.types";
import type { Admin, GalatField } from "@/types/umum.types";
import type { DaftarAkunQuery, IsiAkun } from "@/types/user.types";
import { statusAkun } from "@/utils/status-akun";
import { urlFoto } from "./auth.service";
import { KredensialService } from "./kredensial.service";
import { validasiPegawai } from "./master.service";

/**
 * Manajemen akun oleh admin. Akun dibuat tanpa kata sandi (MENUNGGU_AKTIVASI); pemiliknya membuat kata sandi
 * sendiri lewat tautan aktivasi di email. Admin tidak pernah menentukan atau melihat kata sandi.
 */

/**
 * Hubungan antar-file: service ini memakai KredensialService (token dan email undangan), validasiPegawai
 * dari master.service (aturan data pegawai), serta beberapa repository. Satu akun selalu terhubung ke satu data pegawai.
 */
const emailDipakai = () => Unprocessable("Email sudah dipakai akun lain", [{ field: "email", message: "Email sudah dipakai akun lain" }]);

/**
 * Mengambil akun berdasarkan id; 404 bila tidak ada
 */
async function muat(id: string) {
  const akun = await UserRepository.byId(id);
  if (!akun) throw NotFound("Akun tidak ditemukan");
  return akun;
}

/**
 * Admin tidak boleh melakukan aksi tertentu pada akunnya sendiri (mis. menurunkan role atau menonaktifkan diri)
 */
function tolakDiriSendiri(id: string, admin: Admin, pesan: string) {
  if (id === admin.id) throw Unprocessable(pesan);
}

/**
 * Menentukan data pegawai untuk akun: pegawai pilihan admin, pegawai yang sudah tertaut, pegawai pemilik NIP
 * yang belum punya akun, atau (bila tidak ada) pegawai baru. Mengembalikan id pegawai (null = buat baru) dan isinya
 *
 * Urutan pencarian pegawai: pilihan admin -> pegawai yang sudah tertaut ke akun -> pegawai dengan NIP yang sama.
 * Bila semuanya tidak ada, data pegawai baru akan dibuat (pegawaiId null).
 * Satu pegawai tidak boleh tertaut ke dua akun, jadi itu dicek di sini.
 * @param isi isian form akun dari admin
 * @param akun akun yang sedang diubah (kosong saat membuat akun baru)
 * @returns id pegawai yang dipakai (null = buat baru) dan nilai kolom pegawainya
 * @throws Unprocessable bila pegawai tidak ditemukan atau sudah tertaut ke akun lain
 */
async function siapkanPegawai(isi: IsiAkun, akun?: { id: string; pegawaiId: number | null }) {
  const nip = isi.nip?.trim() || null;
  let pegawaiId = isi.pegawaiId ?? akun?.pegawaiId ?? null;
  if (pegawaiId == null && nip) pegawaiId = (await UserRepository.pegawaiByNip(nip))?.id ?? null;

  const lama = pegawaiId == null ? undefined : await UserRepository.pegawai(pegawaiId);
  const galat: GalatField[] = [];
  if (pegawaiId != null && !lama) galat.push({ field: "pegawaiId", message: "Pegawai tidak ditemukan" });
  const lain = lama ? await UserRepository.akunLainUntukPegawai(lama.id, akun?.id) : undefined;
  if (lain) galat.push({ field: isi.pegawaiId ? "pegawaiId" : "nip", message: `Pegawai ini sudah tertaut ke akun ${lain.email}` });
  if (galat.length) throw Unprocessable("Periksa kembali isian akun", galat);

  const nilai = await validasiPegawai({ nip, nama: isi.name, bidangId: isi.bidangId }, lama?.bidangId, lama?.nip, {
    pegawaiId: lama?.id,
  });
  return { pegawaiId: lama?.id ?? null, nilai: { ...nilai, aktif: true } };
}

/**
 * Menyimpan data pegawai milik akun di dalam transaksi (baru atau perubahan)
 */
async function simpanPegawai(pegawaiId: number | null, nilai: NilaiPegawai, tx: Db) {
  if (pegawaiId == null) return MasterRepository.insertPegawai(nilai, tx);
  await MasterRepository.updatePegawai(pegawaiId, nilai, tx);
  return pegawaiId;
}

/**
 * Menjalankan transaksi dan mengubah pelanggaran UNIQUE (email/NIP yang baru saja dipakai orang lain) menjadi 422
 *
 * KONSEP generic <T>: fungsi ini mengembalikan apa pun yang dikembalikan `kerja`, dengan tipe yang sama.
 * Pengecekan email/NIP di awal bisa "kalah cepat" dengan permintaan lain; di sini galat UNIQUE dari database
 * menjadi pengaman terakhir dan diubah menjadi pesan 422 yang mudah dipahami.
 * @param kerja isi transaksi yang menerima `tx`
 * @returns hasil dari `kerja`
 */
async function transaksiAman<T>(kerja: (tx: Db) => Promise<T>) {
  try {
    return await prisma.$transaction(kerja);
  } catch (e) {
    if (galatDuplikat(e)) throw Unprocessable("Email atau NIP baru saja dipakai data lain. Periksa kembali isian akun.");
    throw e;
  }
}

/**
 * Mengirim undangan aktivasi; kegagalan email tidak membatalkan akun yang sudah tersimpan (admin bisa kirim ulang)
 * Mengembalikan { email, galat } alih-alih melempar galat, supaya frontend bisa memberi tahu admin bahwa akun tersimpan tetapi emailnya gagal.
 */
async function kirimUndanganAman(akun: { name: string; email: string }, token: string) {
  try {
    await KredensialService.kirimUndangan(akun, token);
    return { email: akun.email, galat: null };
  } catch (e) {
    return { email: akun.email, galat: e instanceof Error ? e.message : "Undangan gagal dikirim" };
  }
}

export const UserService = {
  /**
   * Daftar akun untuk halaman manajemen akun, dengan status, kunci login, dan bisa-tidaknya dihapus
   */
  async daftar(query: DaftarAkunQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { items, total } = await UserRepository.daftar({ q: query.q?.trim() || undefined, role: query.role, status: query.status, nonaktif: query.nonaktif === undefined ? undefined : query.nonaktif === "1" }, { page, pageSize });
    const sekarang = new Date();

    /**
     * Satu query untuk semua akun di halaman ini (bukan satu query per akun), lalu hasilnya berupa Set id akun yang sudah punya jejak kegiatan.
     */
    const terpakai = await UserRepository.terpakai(items.map((a) => a.id));
    return {
      items: items.map(({ lockedUntil, punyaKredensial, image, ...a }) => ({
        ...a,
        foto: urlFoto(a.id, image),
        status: statusAkun({ banned: a.banned, punyaKredensial }),
        terkunci: lockedUntil != null && lockedUntil > sekarang,
        bisaDihapus: !terpakai.has(a.id),
      })),
      total,
      page,
      pageSize,
    };
  },

  /**
   * Detail satu akun: data akun & pegawai, status, undangan yang masih berlaku, dan sesi aktif
   */
  async detail(id: string) {
    const a = await UserRepository.detail(id);
    if (!a) throw NotFound("Akun tidak ditemukan");
    const status = statusAkun(a);
    const [terpakai, kedaluwarsaUndangan] = await Promise.all([
      UserRepository.terpakai([id]),
      status === "MENUNGGU_AKTIVASI" ? TokenAkunRepository.kedaluwarsaAktivasi(id) : null,
    ]);
    const { lockedUntil, punyaKredensial, image, sessions, ...akun } = a;
    return {
      ...akun,
      foto: urlFoto(id, image),
      status,
      terkunci: lockedUntil != null && lockedUntil > new Date(),
      bisaDihapus: !terpakai.has(id),
      undangan: status === "MENUNGGU_AKTIVASI" ? { kedaluwarsa: kedaluwarsaUndangan } : null,
      sesi: sessions,
    };
  },

  /**
   * Membuat akun beserta data pegawainya dalam satu transaksi, lalu mengirim email aktivasi ke email pribadi pemiliknya
   */
  async buat(isi: IsiAkun) {
    const email = isi.email.trim().toLowerCase();
    if (await AuthRepository.emailDipakai(email)) throw emailDipakai();
    const { pegawaiId, nilai } = await siapkanPegawai(isi);

    /**
     * Id akun dibuat di sini (bukan oleh database) agar bisa langsung dipakai untuk token aktivasi di transaksi yang sama.
     */
    const id = crypto.randomUUID();
    const { token } = await transaksiAman(async (tx) => {
      const pid = await simpanPegawai(pegawaiId, nilai, tx);
      await UserRepository.insert({ id, name: nilai.nama, email, role: isi.role, pegawaiId: pid }, tx);
      return KredensialService.terbitkan("aktivasi", id, tx);
    });
    return { id, undangan: await kirimUndanganAman({ name: nilai.nama, email }, token) };
  },

  /**
   * Mengubah akun dan data pegawainya. Role berubah = semua sesi dicabut. Email akun yang belum diaktivasi
   * berubah = undangan baru dikirim ke email baru; email akun aktif berubah = perlu diverifikasi ulang
   */
  async ubah(id: string, isi: IsiAkun, admin: Admin) {
    const sebelum = await muat(id);

    /**
     * Mengganti role mencabut semua sesi, supaya hak akses baru langsung berlaku dan sesi lama dengan hak lama tidak bisa dipakai lagi.
     */
    const gantiRole = isi.role !== sebelum.role;
    if (gantiRole) tolakDiriSendiri(id, admin, "Anda tidak dapat mengubah role akun Anda sendiri");
    const email = isi.email.trim().toLowerCase();
    const gantiEmail = email !== sebelum.email;
    if (gantiEmail && (await AuthRepository.emailDipakai(email, id))) throw emailDipakai();
    const { pegawaiId, nilai } = await siapkanPegawai(isi, sebelum);
    const menunggu = statusAkun(sebelum) === "MENUNGGU_AKTIVASI";

    const undanganBaru = await transaksiAman(async (tx) => {
      const pid = await simpanPegawai(pegawaiId, nilai, tx);
      await UserRepository.update(id, { name: nilai.nama, email, role: isi.role, pegawaiId: pid, ...(gantiEmail ? { emailVerified: false, emailBaru: null } : {}) }, tx);
      if (gantiRole) await SesiRepository.hapusSemua(id, undefined, tx);
      if (gantiEmail) await TokenAkunRepository.hapusMilik(id, "ganti-email", tx);
      const token = gantiEmail && menunggu ? await KredensialService.terbitkan("aktivasi", id, tx) : null;
      return token;
    });
    return { id, undangan: undanganBaru ? await kirimUndanganAman({ name: nilai.nama, email }, undanganBaru.token) : null };
  },

  /**
   * Menonaktifkan akun: tidak bisa login, semua sesi dicabut, dan tautan email yang belum dipakai dibatalkan
   */
  async nonaktifkan(id: string, alasan: string | undefined, admin: Admin) {
    const sebelum = await muat(id);
    tolakDiriSendiri(id, admin, "Anda tidak dapat menonaktifkan akun Anda sendiri");
    if (sebelum.banned) throw Unprocessable("Akun ini sudah nonaktif");
    await prisma.$transaction(async (tx) => {
      await UserRepository.update(id, { banned: true, banReason: alasan?.trim() || "Dinonaktifkan admin", emailBaru: null }, tx);
      await SesiRepository.hapusSemua(id, undefined, tx);

      /**
       * Tautan email yang belum dipakai (aktivasi, reset, ganti email) ikut dibatalkan agar tidak bisa dipakai untuk mengaktifkan akun yang dinonaktifkan.
       */
      await TokenAkunRepository.hapusMilik(id, undefined, tx);
    });
    return { id };
  },

  /**
   * Mengaktifkan kembali akun yang dinonaktifkan (akun yang belum pernah diaktivasi kembali ke MENUNGGU_AKTIVASI)
   */
  async aktifkan(id: string) {
    const sebelum = await muat(id);
    if (!sebelum.banned) throw Unprocessable("Akun ini sudah aktif");
    const status = await prisma.$transaction(async (tx) => {
      await UserRepository.update(id, { banned: false, banReason: null, banExpires: null }, tx);
      const sesudah = (await UserRepository.byId(id, tx))!;
      return statusAkun(sesudah);
    });
    return { id, status };
  },

  /**
   * Menghapus akun yang belum meninggalkan data kegiatan (membuat kegiatan, mengunggah dokumentasi, atau memeriksa);
   * selebihnya cukup dinonaktifkan. Data pegawainya tetap ada
   */
  async hapus(id: string, admin: Admin) {
    await muat(id);
    tolakDiriSendiri(id, admin, "Anda tidak dapat menghapus akun Anda sendiri");

    /**
     * Akun yang sudah punya jejak kegiatan tidak boleh dihapus agar riwayat siapa membuat atau memeriksa apa tetap utuh; cukup dinonaktifkan.
     */
    if ((await UserRepository.terpakai([id])).size) {
      throw Unprocessable("Akun ini tercatat sebagai pembuat, pengunggah, atau pemeriksa kegiatan sehingga tidak dapat dihapus. Nonaktifkan saja agar jejak kegiatannya tetap utuh.");
    }
    await prisma.$transaction(async (tx) => {
      await TokenAkunRepository.hapusMilik(id, undefined, tx);
      await UserRepository.hapus(id, tx);
    });
    return { id };
  },

  /**
   * Mengirim ulang email aktivasi untuk akun yang belum diaktivasi; tautan lama tidak berlaku lagi
   */
  async kirimUlangUndangan(id: string) {
    const akun = await muat(id);
    const status = statusAkun(akun);
    if (status === "NONAKTIF") throw Unprocessable("Akun ini nonaktif. Aktifkan dulu sebelum mengirim undangan.");
    if (status === "AKTIF") throw Unprocessable("Akun ini sudah aktif sehingga tidak perlu undangan. Gunakan Atur ulang kata sandi bila pemiliknya lupa kata sandi.");
    const { token, kedaluwarsa } = await KredensialService.terbitkan("aktivasi", id);
    await KredensialService.kirimUndangan(akun, token);
    return { id, email: akun.email, kedaluwarsa };
  },

  /**
   * Reset kata sandi lewat mekanisme resmi: kunci login dibuka, sesi dicabut, dan tautan atur ulang dikirim ke email
   * pemilik akun. Admin tidak menentukan kata sandinya
   */
  async resetSandi(id: string, admin: Admin) {
    const akun = await muat(id);
    const status = statusAkun(akun);
    if (status === "MENUNGGU_AKTIVASI") throw Unprocessable("Akun ini belum diaktivasi. Kirim ulang undangan aktivasi.");
    if (status === "NONAKTIF") throw Unprocessable("Akun ini nonaktif. Aktifkan dulu sebelum mengatur ulang kata sandi.");
    const { token, sesiDicabut } = await prisma.$transaction(async (tx) => {
      await AuthRepository.resetLoginGagal(id, tx);

      /**
       * Bila admin mereset akunnya sendiri, sesi yang sedang dipakainya dikecualikan agar ia tidak ikut keluar.
       */
      const n = await SesiRepository.hapusSemua(id, id === admin.id ? admin.sesiId : undefined, tx);
      const hasil = await KredensialService.terbitkan("reset-sandi", id, tx);
      return { ...hasil, sesiDicabut: n };
    });
    await KredensialService.kirimTautanReset(akun, token);
    return { id, email: akun.email, sesiDicabut };
  },

  /**
   * Mencabut semua sesi login akun (sesi admin yang sedang dipakai tidak ikut dicabut)
   */
  async cabutSesi(id: string, admin: Admin) {
    await muat(id);
    const jumlah = await SesiRepository.hapusSemua(id, id === admin.id ? admin.sesiId : undefined);
    return { id, jumlah };
  },
};
