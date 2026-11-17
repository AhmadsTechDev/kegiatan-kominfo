import { NotFound, Unprocessable } from "@/lib/errors";
import { db } from "@/db";
import { UndanganRepository } from "@/repositories/undangan.repository";
import { UserRepository } from "@/repositories/user.repository";
import type { Role } from "@/types/umum.types";
import { KredensialService } from "./kredensial.service";

export const UndanganService = {
  async undang({ pegawaiId, email: emailMentah, role }: { pegawaiId: number; email: string; role: Role }) {
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
    const { token } = await db.transaction(async (tx) => {
      if (akun) await UserRepository.update(akun.id, { email, role }, tx);
      else await UserRepository.insert({ id: userId, name: pegawai.nama, email, role, pegawaiId }, tx);
      return KredensialService.terbitkan("aktivasi", userId, tx);
    });

    await KredensialService.kirimUndangan({ name: pegawai.nama, email }, token);
    return { userId, email, kirimUlang: !!akun };
  },
};
