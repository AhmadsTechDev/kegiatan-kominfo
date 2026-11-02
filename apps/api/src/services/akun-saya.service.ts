import { NotFound, Unprocessable } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { cocokSandi, hashSandi } from "@/lib/sandi";
import { AuthRepository } from "@/repositories/auth.repository";
import { PreferensiRepository } from "@/repositories/preferensi.repository";
import { SesiRepository } from "@/repositories/sesi.repository";
import type { GantiSandi, Preferensi, UbahPreferensi } from "@/types/auth.types";
import type { MetaRequest } from "@/types/umum.types";
import { periksaSandi } from "@/utils/kebijakan-sandi";
import { buatPembatasLaju } from "@/utils/rate-limit";
import { AuditLogService } from "./audit-log.service";
import { KredensialService } from "./kredensial.service";

// Keamanan dan preferensi akun sendiri (/api/me/sandi, /api/me/sesi, /api/me/preferensi)

export const PREFERENSI_BAWAAN: Preferensi = { tema: "system", notifPengingatKegiatan: true, notifPengingatDokumentasi: true };

// Maksimal 5 percobaan ganti kata sandi per 15 menit per akun (memperlambat penebakan kata sandi lama)
const lajuGantiSandi = buatPembatasLaju({ jendelaMs: 15 * 60_000, maks: 5, pesan: "Terlalu banyak percobaan ganti kata sandi. Coba lagi dalam 15 menit." });

export const AkunSayaService = {
  // Mengganti kata sandi sendiri; bawaannya sesi di perangkat lain ikut dicabut (sesi saat ini tetap)
  async gantiSandi(userId: string, sesiId: string, { sandiLama, sandiBaru, cabutSesiLain = true }: GantiSandi, meta: MetaRequest) {
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
    const sesiDicabut = await prisma.$transaction(async (tx) => {
      await AuthRepository.gantiSandi(userId, hashBaru, tx);
      const n = cabutSesiLain ? await SesiRepository.hapusSemua(userId, sesiId, tx) : 0;
      await AuditLogService.catat({ aktorId: userId, aksi: "ganti_sandi", entitas: "user", entitasId: userId, sesudah: { sesiDicabut: n }, ...meta }, tx);
      return n;
    });
    KredensialService.beritahuSandiDiubah(akun);
    return { sesiDicabut };
  },

  // Daftar sesi login yang masih berlaku, dengan penanda sesi yang sedang dipakai
  async daftarSesi(userId: string, sesiId: string) {
    return (await SesiRepository.daftar(userId)).map((s) => ({ ...s, sesiIni: s.id === sesiId }));
  },

  // Mencabut satu sesi di perangkat lain
  async cabutSesi(userId: string, sesiId: string, id: string, meta: MetaRequest) {
    if (id === sesiId) throw Unprocessable("Ini sesi yang sedang Anda pakai. Gunakan tombol Keluar untuk mengakhirinya.");
    if (!(await SesiRepository.hapus(userId, id))) throw NotFound("Sesi tidak ditemukan atau sudah berakhir");
    await AuditLogService.catat({ aktorId: userId, aksi: "cabut_sesi", entitas: "user", entitasId: userId, sesudah: { jumlah: 1 }, ...meta });
    return { id };
  },

  // Mencabut semua sesi selain sesi yang sedang dipakai
  async cabutSesiLain(userId: string, sesiId: string, meta: MetaRequest) {
    const jumlah = await SesiRepository.hapusSemua(userId, sesiId);
    await AuditLogService.catat({ aktorId: userId, aksi: "cabut_sesi", entitas: "user", entitasId: userId, sesudah: { jumlah }, ...meta });
    return { jumlah };
  },

  // Preferensi tampilan dan notifikasi (nilai bawaan bila belum pernah diubah)
  async preferensi(userId: string): Promise<Preferensi> {
    return ((await PreferensiRepository.ambil(userId)) as Preferensi | undefined) ?? PREFERENSI_BAWAAN;
  },

  // Menyimpan sebagian preferensi
  async ubahPreferensi(userId: string, isi: UbahPreferensi): Promise<Preferensi> {
    return (await PreferensiRepository.simpan(userId, isi)) as Preferensi;
  },
};
