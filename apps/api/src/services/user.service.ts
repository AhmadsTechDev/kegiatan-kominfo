import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { AppError, Forbidden, NotFound, Unprocessable } from "@/lib/errors";
import { AuthRepository } from "@/repositories/auth.repository";
import { UndanganRepository } from "@/repositories/undangan.repository";
import { UserRepository } from "@/repositories/user.repository";
import type { Admin, GalatField, Role } from "@/types/umum.types";
import type { BuatAkun, DaftarAkunQuery, HubungkanAkun, UbahAkun } from "@/types/user.types";
import { periksaNip } from "@/utils/nip";
import { AuditLogService } from "./audit-log.service";
import { urlFoto } from "./auth.service";
import { MasterService } from "./master.service";

// Memanggil API Better Auth dan mengubah galatnya menjadi galat aplikasi yang mudah dibaca frontend
export async function panggilAuth<T>(kerja: () => Promise<T>): Promise<T> {
  try {
    return await kerja();
  } catch (e) {
    if (!(e instanceof APIError)) throw e;
    const kode = (e.body as { code?: string } | undefined)?.code;
    if (kode === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" || kode === "USER_ALREADY_EXISTS") {
      throw Unprocessable("Email sudah dipakai akun lain", [{ field: "email", message: "Email sudah dipakai akun lain" }]);
    }
    if (kode === "USERNAME_IS_ALREADY_TAKEN" || kode === "USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER") {
      throw Unprocessable("NIP sudah dipakai akun lain", [{ field: "nip", message: "NIP sudah dipakai akun lain" }]);
    }
    if (e.statusCode === 403) throw Forbidden();
    if (e.statusCode === 404) throw NotFound("Akun tidak ditemukan");
    if (e.statusCode === 400) throw new AppError(422, "VALIDATION_ERROR", e.body?.message ?? "Data akun tidak valid");
    throw e;
  }
}

// Memeriksa tautan akun ke pegawai/NIP; mengembalikan NIP yang dipakai sebagai username (atau null)
async function validasiTautan(isi: UbahAkun, kecualiUserId?: string): Promise<string | null> {
  const galat: GalatField[] = [];
  let nip = isi.nip?.trim() || null;
  if (isi.pegawaiId != null) {
    const [pegawai, lain] = await Promise.all([UserRepository.pegawaiAktif(isi.pegawaiId), UserRepository.akunLainUntukPegawai(isi.pegawaiId, kecualiUserId)]);
    if (!pegawai) galat.push({ field: "pegawaiId", message: "Pegawai tidak ditemukan atau nonaktif" });
    else if (lain) galat.push({ field: "pegawaiId", message: `Pegawai ini sudah tertaut ke akun ${lain.email}` });
    nip = pegawai?.nip ?? null;
  } else if (nip) {
    const salah = periksaNip(nip);
    const pemilik = salah ? null : await UserRepository.pegawaiByNip(nip);
    if (salah) galat.push({ field: "nip", message: salah });
    else if (pemilik) galat.push({ field: "nip", message: `NIP ini milik pegawai ${pemilik.nama}; pilih pegawai tersebut di kolom Pegawai` });
  }
  if (nip && (await UserRepository.akunLainDenganUsername(nip, kecualiUserId))) galat.push({ field: "nip", message: "NIP sudah dipakai akun lain" });
  if (!isi.name.trim()) galat.push({ field: "name", message: "Nama wajib diisi" });
  if (galat.length) throw Unprocessable("Periksa kembali isian akun", galat);
  return nip;
}

// Mengambil akun berdasarkan id; 404 bila tidak ada
async function muat(id: string) {
  const akun = await UserRepository.byId(id);
  if (!akun) throw NotFound("Akun tidak ditemukan");
  return akun;
}

// Admin tidak boleh melakukan aksi tertentu pada akunnya sendiri (mis. menonaktifkan diri)
function tolakDiriSendiri(id: string, admin: Admin, pesan: string) {
  if (id === admin.id) throw Unprocessable(pesan);
}

export const UserService = {
  // Daftar akun untuk halaman manajemen akun, dengan status aktivasi, kunci, dan bisa-tidaknya dihapus
  async daftar(query: DaftarAkunQuery) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { items, total } = await UserRepository.daftar(
      { q: query.q?.trim() || undefined, role: query.role, aktif: query.aktif === undefined ? undefined : query.aktif === "1" },
      { page, pageSize },
    );
    const sekarang = new Date();
    const terpakai = await UserRepository.terpakai(items.map((a) => a.id));
    return {
      items: items.map(({ lockedUntil, punyaKredensial, image, ...a }) => ({
        ...a,
        foto: urlFoto(a.id, image),
        menungguAktivasi: !punyaKredensial,
        terkunci: lockedUntil != null && lockedUntil > sekarang,
        bisaDihapus: !terpakai.has(a.id),
      })),
      total,
      page,
      pageSize,
    };
  },

  // Membuat akun langsung dengan kata sandi dari admin
  async buat(isi: BuatAkun, admin: Admin) {
    const nip = await validasiTautan(isi);
    const { user } = await panggilAuth(() =>
      auth.api.createUser({
        headers: admin.headers,
        body: {
          email: isi.email.trim().toLowerCase(),
          password: isi.password,
          name: isi.name.trim(),
          role: isi.role,
          data: { username: nip, displayUsername: nip, pegawaiId: isi.pegawaiId ?? null },
        },
      }),
    );
    const sesudah = await UserRepository.byId(user.id);
    await AuditLogService.catat({ aktorId: admin.id, aksi: "buat", entitas: "user", entitasId: user.id, sesudah, ...admin.meta });
    return { id: user.id };
  },

  // Mengubah data akun; bila role berubah, semua sesi akun itu dicabut (harus login ulang)
  async ubah(id: string, isi: UbahAkun, admin: Admin) {
    const sebelum = await muat(id);
    if (isi.role !== sebelum.role) tolakDiriSendiri(id, admin, "Anda tidak dapat mengubah role akun Anda sendiri");
    const nip = await validasiTautan(isi, id);
    await panggilAuth(() =>
      auth.api.adminUpdateUser({
        headers: admin.headers,
        body: {
          userId: id,
          data: {
            name: isi.name.trim(),
            email: isi.email.trim().toLowerCase(),
            role: isi.role,
            ...(nip !== sebelum.username ? { username: nip, displayUsername: nip } : {}),
            pegawaiId: isi.pegawaiId ?? null,
          },
        },
      }),
    );
    if (isi.role !== sebelum.role) await panggilAuth(() => auth.api.revokeUserSessions({ headers: admin.headers, body: { userId: id } }));
    const sesudah = await UserRepository.byId(id);
    await AuditLogService.catat({ aktorId: admin.id, aksi: "ubah", entitas: "user", entitasId: id, sebelum, sesudah, ...admin.meta });
    return { id };
  },

  // Menautkan akun ke pegawai yang sudah ada, atau membuat data pegawai baru lalu menautkannya
  async hubungkanPegawai(id: string, isi: HubungkanAkun, admin: Admin) {
    const akun = await muat(id);
    if (!isi.pegawaiId && !isi.pegawaiBaru) throw Unprocessable("Pilih pegawai atau isi data pegawai baru");
    const pegawaiId = isi.pegawaiBaru
      ? (
          await MasterService.buatPegawai(
            { nip: isi.pegawaiBaru.nip ?? null, nama: akun.name, jabatan: isi.pegawaiBaru.jabatan ?? null, unitKerjaId: isi.pegawaiBaru.unitKerjaId },
            { id: admin.id, role: "ADMIN", pegawaiId: null },
            admin.meta,
          )
        ).id
      : isi.pegawaiId!;
    return UserService.ubah(id, { name: akun.name, email: akun.email, role: akun.role as Role, nip: null, pegawaiId }, admin);
  },

  // Menonaktifkan (ban) akun
  async nonaktifkan(id: string, alasan: string | undefined, admin: Admin) {
    const sebelum = await muat(id);
    tolakDiriSendiri(id, admin, "Anda tidak dapat menonaktifkan akun Anda sendiri");
    if (sebelum.banned) throw Unprocessable("Akun ini sudah nonaktif");
    await panggilAuth(() => auth.api.banUser({ headers: admin.headers, body: { userId: id, banReason: alasan?.trim() || "Dinonaktifkan admin" } }));
    const sesudah = await UserRepository.byId(id);
    await AuditLogService.catat({ aktorId: admin.id, aksi: "nonaktifkan", entitas: "user", entitasId: id, sebelum, sesudah, ...admin.meta });
    return { id };
  },

  // Mengaktifkan kembali akun yang dinonaktifkan
  async aktifkan(id: string, admin: Admin) {
    const sebelum = await muat(id);
    if (!sebelum.banned) throw Unprocessable("Akun ini sudah aktif");
    await panggilAuth(() => auth.api.unbanUser({ headers: admin.headers, body: { userId: id } }));
    const sesudah = await UserRepository.byId(id);
    await AuditLogService.catat({ aktorId: admin.id, aksi: "aktifkan", entitas: "user", entitasId: id, sebelum, sesudah, ...admin.meta });
    return { id };
  },

  // Menghapus akun yang belum pernah dipakai (yang sudah dipakai cukup dinonaktifkan)
  async hapus(id: string, admin: Admin) {
    const sebelum = await muat(id);
    tolakDiriSendiri(id, admin, "Anda tidak dapat menghapus akun Anda sendiri");
    if ((await UserRepository.terpakai([id])).size) {
      throw Unprocessable("Akun ini sudah pernah dipakai sehingga tidak dapat dihapus. Nonaktifkan saja agar jejak kegiatannya tetap utuh.");
    }
    await panggilAuth(() => auth.api.removeUser({ headers: admin.headers, body: { userId: id } }));
    await UndanganRepository.hapusTokenUndangan(id);
    await AuditLogService.catat({ aktorId: admin.id, aksi: "hapus", entitas: "user", entitasId: id, sebelum, ...admin.meta });
    return { id };
  },

  // Mengatur kata sandi baru oleh admin; kunci login dibuka dan sesi lama dicabut
  async resetSandi(id: string, password: string, admin: Admin) {
    await muat(id);
    await panggilAuth(() => auth.api.setUserPassword({ headers: admin.headers, body: { userId: id, newPassword: password } }));
    await AuthRepository.resetLoginGagal(id);
    if (id !== admin.id) await panggilAuth(() => auth.api.revokeUserSessions({ headers: admin.headers, body: { userId: id } }));
    await AuditLogService.catat({ aktorId: admin.id, aksi: "reset_sandi", entitas: "user", entitasId: id, ...admin.meta });
    return { id };
  },
};
