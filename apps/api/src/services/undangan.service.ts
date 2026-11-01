import { auth } from "@/lib/auth";
import { AppError, NotFound, Unprocessable } from "@/lib/errors";
import { UndanganRepository } from "@/repositories/undangan.repository";
import type { Admin, Role } from "@/types/umum.types";
import type { IsiUndangan } from "@/types/undangan.types";
import { AuditLogService } from "./audit-log.service";
import { panggilAuth } from "./user.service";

// Mengirim email berisi tautan aktivasi (memakai fitur "reset password" Better Auth)
async function kirimTautan(email: string) {
  try {
    await auth.api.requestPasswordReset({ body: { email } });
  } catch (e) {
    console.error("[undangan] gagal mengirim email", e);
    throw new AppError(502, "EMAIL_GAGAL", "Email undangan gagal dikirim. Periksa konfigurasi SMTP lalu kirim ulang undangan.");
  }
}

export const UndanganService = {
  // Mengundang pegawai: membuat akunnya (username = NIP) lalu mengirim email aktivasi. Bisa dipakai untuk kirim ulang
  async undang({ pegawaiId, email: emailMentah, role }: IsiUndangan, admin: Admin) {
    const email = emailMentah.trim().toLowerCase();
    const pegawai = await UndanganRepository.pegawaiAktif(pegawaiId);
    if (!pegawai) throw NotFound("Pegawai tidak ditemukan atau nonaktif");

    const [akun, pemilikEmail] = await Promise.all([UndanganRepository.akunPegawai(pegawaiId), UndanganRepository.akunByEmail(email)]);
    if (akun?.aktif) throw Unprocessable(`${pegawai.nama} sudah punya akun aktif (${akun.email})`);
    if (akun?.banned) throw Unprocessable("Akun pegawai ini sedang nonaktif. Aktifkan dulu di Manajemen akun");
    if (pemilikEmail && pemilikEmail.id !== akun?.id) {
      throw Unprocessable("Email sudah dipakai akun lain", [{ field: "email", message: "Email sudah dipakai akun lain" }]);
    }

    let userId: string;
    if (akun) {
      await panggilAuth(() => auth.api.adminUpdateUser({ headers: admin.headers, body: { userId: akun.id, data: { email, role } } }));
      await UndanganRepository.hapusTokenUndangan(akun.id);
      userId = akun.id;
    } else {
      const { user } = await panggilAuth(() =>
        auth.api.createUser({
          headers: admin.headers,
          body: { email, name: pegawai.nama, role, data: { username: pegawai.nip, displayUsername: pegawai.nip, pegawaiId } },
        }),
      );
      userId = user.id;
    }

    await kirimTautan(email);
    await AuditLogService.catat({ aktorId: admin.id, aksi: "undang", entitas: "user", entitasId: userId, sesudah: { email, role, pegawaiId, kirimUlang: !!akun }, ...admin.meta });
    return { userId, email, kirimUlang: !!akun };
  },

  // Mengundang orang yang tidak terdaftar sebagai pegawai (akun tanpa NIP)
  async undangTanpaPegawai({ nama, email: emailMentah, role }: { nama: string; email: string; role: Role }, admin: Admin) {
    const email = emailMentah.trim().toLowerCase();
    const [tertunda, pemilik] = await Promise.all([UndanganRepository.akunTertundaTanpaPegawai(email), UndanganRepository.akunByEmail(email)]);
    if (pemilik && !tertunda) throw Unprocessable("Email sudah dipakai akun lain", [{ field: "email", message: "Email sudah dipakai akun lain" }]);

    let user: { id: string };
    if (tertunda) {
      await panggilAuth(() => auth.api.adminUpdateUser({ headers: admin.headers, body: { userId: tertunda.id, data: { name: nama, role } } }));
      await UndanganRepository.hapusTokenUndangan(tertunda.id);
      user = tertunda;
    } else {
      ({ user } = await panggilAuth(() => auth.api.createUser({ headers: admin.headers, body: { email, name: nama, role } })));
    }

    await kirimTautan(email);
    await AuditLogService.catat({
      aktorId: admin.id,
      aksi: "undang",
      entitas: "user",
      entitasId: user.id,
      sesudah: { email, role, pegawaiId: null, kirimUlang: !!tertunda },
      ...admin.meta,
    });
    return { userId: user.id, email, kirimUlang: !!tertunda };
  },

  // Info pemilik token aktivasi (dipakai halaman aktivasi sebelum user membuat kata sandi)
  async infoToken(token: string) {
    const info = await UndanganRepository.infoToken(token);
    if (!info) throw new AppError(410, "TOKEN_TIDAK_BERLAKU", "Tautan aktivasi tidak berlaku atau sudah kedaluwarsa. Minta administrator mengirim ulang undangan.");
    return info;
  },
};
