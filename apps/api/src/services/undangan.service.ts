import { NotFound, Unprocessable } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { UndanganRepository } from "@/repositories/undangan.repository";
import { UserRepository } from "@/repositories/user.repository";
import type { IsiUndangan } from "@/types/undangan.types";
import { KredensialService } from "./kredensial.service";

export const UndanganService = {
  /**
   * Mengundang pegawai dari Master data: membuat akunnya (tanpa kata sandi) lalu mengirim email aktivasi.
   * Bila pegawai sudah punya akun yang belum diaktivasi, email/role diperbarui dan undangan dikirim ulang
   *
   * Dipakai di dua tempat: tombol Undang di Master data dan persetujuan permintaan akun (permintaan-akun.service).
   * @returns id akun, email tujuan, dan apakah ini pengiriman ulang
   * @throws Unprocessable bila pegawai sudah punya akun aktif, akunnya nonaktif, atau email dipakai akun lain
   */
  async undang({ pegawaiId, email: emailMentah, role }: IsiUndangan) {
    const email = emailMentah.trim().toLowerCase();
    const pegawai = await UndanganRepository.pegawaiAktif(pegawaiId);
    if (!pegawai) throw NotFound("Pegawai tidak ditemukan atau nonaktif");

    const [akun, pemilikEmail] = await Promise.all([UndanganRepository.akunPegawai(pegawaiId), UndanganRepository.akunByEmail(email)]);
    if (akun?.aktif) throw Unprocessable(`${pegawai.nama} sudah punya akun aktif (${akun.email})`);
    if (akun?.banned) throw Unprocessable("Akun pegawai ini sedang nonaktif. Aktifkan dulu di Manajemen akun");
    if (pemilikEmail && pemilikEmail.id !== akun?.id) {
      throw Unprocessable("Email sudah dipakai akun lain", [{ field: "email", message: "Email sudah dipakai akun lain" }]);
    }

    const userId = akun?.id ?? crypto.randomUUID();
    const { token } = await prisma.$transaction(async (tx) => {
      if (akun) await UserRepository.update(akun.id, { email, role }, tx);
      else await UserRepository.insert({ id: userId, name: pegawai.nama, email, role, pegawaiId }, tx);
      return KredensialService.terbitkan("aktivasi", userId, tx);
    });

    await KredensialService.kirimUndangan({ name: pegawai.nama, email }, token);
    return { userId, email, kirimUlang: !!akun };
  },
};
