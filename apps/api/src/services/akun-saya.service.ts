import { NotFound, Unprocessable } from "@/lib/errors";
import { db } from "@/db";
import { cocokSandi, hashSandi } from "@/lib/sandi";
import { AuthRepository } from "@/repositories/auth.repository";
import { PreferensiRepository } from "@/repositories/preferensi.repository";
import { SesiRepository } from "@/repositories/sesi.repository";
import type { GantiSandi, Preferensi, UbahPreferensi } from "@/validators/auth.validator";
import { periksaSandi } from "@/utils/kebijakan-sandi";
import { buatPembatasLaju } from "@/utils/rate-limit";
import { KredensialService } from "./kredensial.service";

export const PREFERENSI_BAWAAN: Preferensi = { tema: "system", notifPengingatKegiatan: true, notifPengingatDokumentasi: true };

const lajuGantiSandi = buatPembatasLaju({ jendelaMs: 15 * 60_000, maks: 5, pesan: "Terlalu banyak percobaan ganti kata sandi. Coba lagi dalam 15 menit." });

export const AkunSayaService = {
  async gantiSandi(userId: string, sesiId: string, { sandiLama, sandiBaru, cabutSesiLain = true }: GantiSandi) {
    lajuGantiSandi(userId);
    const [akun, hash] = await Promise.all([AuthRepository.akunKredensial({ id: userId }), AuthRepository.hashSandi(userId)]);
    if (!akun) throw NotFound("Pengguna tidak ditemukan");
    if (!hash || !(await cocokSandi({ hash, password: sandiLama }))) {
      throw Unprocessable("Kata sandi saat ini salah", [{ field: "sandiLama", message: "Kata sandi saat ini salah" }]);
    }
    if (sandiBaru === sandiLama) throw Unprocessable("Kata sandi baru harus berbeda", [{ field: "sandiBaru", message: "Kata sandi baru harus berbeda dari yang lama" }]);
    const salah = periksaSandi(sandiBaru, { email: akun.email });
    if (salah) throw Unprocessable("Kata sandi belum memenuhi syarat", [{ field: "sandiBaru", message: salah }]);

    const hashBaru = await hashSandi(sandiBaru);
    const sesiDicabut = await db.transaction(async (tx) => {
      await AuthRepository.gantiSandi(userId, hashBaru, tx);
      return cabutSesiLain ? SesiRepository.hapusSemua(userId, sesiId, tx) : 0;
    });
    KredensialService.beritahuSandiDiubah(akun);
    return { sesiDicabut };
  },

  async daftarSesi(userId: string, sesiId: string) {
    return (await SesiRepository.daftar(userId)).map((s) => ({ ...s, sesiIni: s.id === sesiId }));
  },

  async cabutSesi(userId: string, sesiId: string, id: string) {
    if (id === sesiId) throw Unprocessable("Ini sesi yang sedang Anda pakai. Gunakan tombol Keluar untuk mengakhirinya.");
    if (!(await SesiRepository.hapus(userId, id))) throw NotFound("Sesi tidak ditemukan atau sudah berakhir");
    return { id };
  },

  async cabutSesiLain(userId: string, sesiId: string) {
    const jumlah = await SesiRepository.hapusSemua(userId, sesiId);
    return { jumlah };
  },

  async preferensi(userId: string): Promise<Preferensi> {
    return (await PreferensiRepository.ambil(userId)) ?? PREFERENSI_BAWAAN;
  },

  async ubahPreferensi(userId: string, isi: UbahPreferensi): Promise<Preferensi> {
    return PreferensiRepository.simpan(userId, isi);
  },
};
