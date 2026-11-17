import { NotFound, Unprocessable } from "@/lib/errors";
import { db, galatDuplikat, type Db } from "@/db";
import { AuthRepository } from "@/repositories/auth.repository";
import { MasterRepository } from "@/repositories/master.repository";
import { SesiRepository } from "@/repositories/sesi.repository";
import { TokenAkunRepository } from "@/repositories/token-akun.repository";
import { UserRepository } from "@/repositories/user.repository";
import type { NilaiPegawai } from "@/types/master.types";
import type { Admin, GalatField } from "@/types/umum.types";
import type { DaftarAkunQuery, IsiAkun } from "@/validators/user.validator";
import { statusAkun } from "@/utils/status-akun";
import { urlFoto } from "./auth.service";
import { KredensialService } from "./kredensial.service";
import { validasiPegawai } from "./master.service";

const emailDipakai = () => Unprocessable("Email sudah dipakai akun lain", [{ field: "email", message: "Email sudah dipakai akun lain" }]);

async function muat(id: string) {
  const akun = await UserRepository.byId(id);
  if (!akun) throw NotFound("Akun tidak ditemukan");
  return akun;
}

function tolakDiriSendiri(id: string, admin: Admin, pesan: string) {
  if (id === admin.id) throw Unprocessable(pesan);
}

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

async function simpanPegawai(pegawaiId: number | null, nilai: NilaiPegawai, tx: Db) {
  if (pegawaiId == null) return MasterRepository.insertPegawai(nilai, tx);
  await MasterRepository.updatePegawai(pegawaiId, nilai, tx);
  return pegawaiId;
}

async function transaksiAman<T>(kerja: (tx: Db) => Promise<T>) {
  try {
    return await db.transaction(kerja);
  } catch (e) {
    if (galatDuplikat(e)) throw Unprocessable("Email atau NIP baru saja dipakai data lain. Periksa kembali isian akun.");
    throw e;
  }
}

async function kirimUndanganAman(akun: { name: string; email: string }, token: string) {
  try {
    await KredensialService.kirimUndangan(akun, token);
    return { email: akun.email, galat: null };
  } catch (e) {
    return { email: akun.email, galat: e instanceof Error ? e.message : "Undangan gagal dikirim" };
  }
}

export const UserService = {
  async daftar(query: DaftarAkunQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { items, total } = await UserRepository.daftar({ q: query.q?.trim() || undefined, role: query.role, status: query.status, nonaktif: query.nonaktif === undefined ? undefined : query.nonaktif === "1" }, { page, pageSize });
    const sekarang = new Date();

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

  async buat(isi: IsiAkun) {
    const email = isi.email.trim().toLowerCase();
    if (await AuthRepository.emailDipakai(email)) throw emailDipakai();
    const { pegawaiId, nilai } = await siapkanPegawai(isi);

    const id = crypto.randomUUID();
    const { token } = await transaksiAman(async (tx) => {
      const pid = await simpanPegawai(pegawaiId, nilai, tx);
      await UserRepository.insert({ id, name: nilai.nama, email, role: isi.role, pegawaiId: pid }, tx);
      return KredensialService.terbitkan("aktivasi", id, tx);
    });
    return { id, undangan: await kirimUndanganAman({ name: nilai.nama, email }, token) };
  },

  async ubah(id: string, isi: IsiAkun, admin: Admin) {
    const sebelum = await muat(id);

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

  async nonaktifkan(id: string, alasan: string | undefined, admin: Admin) {
    const sebelum = await muat(id);
    tolakDiriSendiri(id, admin, "Anda tidak dapat menonaktifkan akun Anda sendiri");
    if (sebelum.banned) throw Unprocessable("Akun ini sudah nonaktif");
    await db.transaction(async (tx) => {
      await UserRepository.update(id, { banned: true, banReason: alasan?.trim() || "Dinonaktifkan admin", emailBaru: null }, tx);
      await SesiRepository.hapusSemua(id, undefined, tx);

      await TokenAkunRepository.hapusMilik(id, undefined, tx);
    });
    return { id };
  },

  async aktifkan(id: string) {
    const sebelum = await muat(id);
    if (!sebelum.banned) throw Unprocessable("Akun ini sudah aktif");
    const status = await db.transaction(async (tx) => {
      await UserRepository.update(id, { banned: false, banReason: null, banExpires: null }, tx);
      const sesudah = (await UserRepository.byId(id, tx))!;
      return statusAkun(sesudah);
    });
    return { id, status };
  },

  async hapus(id: string, admin: Admin) {
    await muat(id);
    tolakDiriSendiri(id, admin, "Anda tidak dapat menghapus akun Anda sendiri");

    if ((await UserRepository.terpakai([id])).size) {
      throw Unprocessable("Akun ini tercatat sebagai pembuat, pengunggah, atau pemeriksa kegiatan sehingga tidak dapat dihapus. Nonaktifkan saja agar jejak kegiatannya tetap utuh.");
    }
    await db.transaction(async (tx) => {
      await TokenAkunRepository.hapusMilik(id, undefined, tx);
      await UserRepository.hapus(id, tx);
    });
    return { id };
  },

  async kirimUlangUndangan(id: string) {
    const akun = await muat(id);
    const status = statusAkun(akun);
    if (status === "NONAKTIF") throw Unprocessable("Akun ini nonaktif. Aktifkan dulu sebelum mengirim undangan.");
    if (status === "AKTIF") throw Unprocessable("Akun ini sudah aktif sehingga tidak perlu undangan. Gunakan Atur ulang kata sandi bila pemiliknya lupa kata sandi.");
    const { token, kedaluwarsa } = await KredensialService.terbitkan("aktivasi", id);
    await KredensialService.kirimUndangan(akun, token);
    return { id, email: akun.email, kedaluwarsa };
  },

  async resetSandi(id: string, admin: Admin) {
    const akun = await muat(id);
    const status = statusAkun(akun);
    if (status === "MENUNGGU_AKTIVASI") throw Unprocessable("Akun ini belum diaktivasi. Kirim ulang undangan aktivasi.");
    if (status === "NONAKTIF") throw Unprocessable("Akun ini nonaktif. Aktifkan dulu sebelum mengatur ulang kata sandi.");
    const { token, sesiDicabut } = await db.transaction(async (tx) => {
      await AuthRepository.resetLoginGagal(id, tx);

      const n = await SesiRepository.hapusSemua(id, id === admin.id ? admin.sesiId : undefined, tx);
      const hasil = await KredensialService.terbitkan("reset-sandi", id, tx);
      return { ...hasil, sesiDicabut: n };
    });
    await KredensialService.kirimTautanReset(akun, token);
    return { id, email: akun.email, sesiDicabut };
  },

  async cabutSesi(id: string, admin: Admin) {
    await muat(id);
    const jumlah = await SesiRepository.hapusSemua(id, id === admin.id ? admin.sesiId : undefined);
    return { id, jumlah };
  },
};
