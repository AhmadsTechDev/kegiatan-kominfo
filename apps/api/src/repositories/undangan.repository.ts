import { prisma } from "@/lib/prisma";

const AWALAN_TOKEN = "reset-password:";

export const UndanganRepository = {
  // Pegawai aktif berdasarkan id
  async pegawaiAktif(id: number) {
    return (await prisma.pegawai.findFirst({ where: { id, aktif: true }, select: { id: true, nip: true, nama: true } })) ?? undefined;
  },

  // Pegawai aktif berdasarkan NIP
  async pegawaiAktifByNip(nip: string) {
    return (await prisma.pegawai.findFirst({ where: { nip, aktif: true }, select: { id: true, nip: true, nama: true } })) ?? undefined;
  },

  // Akun milik pegawai; `aktif` = sudah membuat kata sandi (punya kredensial)
  async akunPegawai(pegawaiId: number) {
    const u = await prisma.user.findFirst({
      where: { pegawaiId },
      select: { id: true, email: true, banned: true, accounts: { where: { providerId: "credential" }, select: { id: true } } },
    });
    return u ? { id: u.id, email: u.email, banned: u.banned, aktif: u.accounts.length > 0 } : undefined;
  },

  // Akun tanpa pegawai dengan email ini yang belum diaktivasi (undangan tertunda)
  async akunTertundaTanpaPegawai(email: string) {
    const u = await prisma.user.findFirst({
      where: { email, pegawaiId: null },
      select: { id: true, accounts: { where: { providerId: "credential" }, select: { id: true } } },
    });
    return u && u.accounts.length === 0 ? { id: u.id } : undefined;
  },

  // Akun pemilik email tertentu
  async akunByEmail(email: string) {
    return (await prisma.user.findUnique({ where: { email }, select: { id: true, pegawaiId: true } })) ?? undefined;
  },

  // Menghapus token aktivasi lama milik user (sebelum mengirim undangan ulang)
  async hapusTokenUndangan(userId: string) {
    await prisma.verification.deleteMany({ where: { value: userId, identifier: { startsWith: AWALAN_TOKEN } } });
  },

  // Nama & email pemilik token aktivasi yang masih berlaku; undefined bila token salah/kedaluwarsa
  async infoToken(token: string, sekarang = new Date()) {
    const v = await prisma.verification.findFirst({
      where: { identifier: `${AWALAN_TOKEN}${token}`, expiresAt: { gt: sekarang } },
      select: { value: true, expiresAt: true },
    });
    if (!v) return undefined;
    const u = await prisma.user.findUnique({ where: { id: v.value }, select: { name: true, email: true } });
    return u ? { nama: u.name, email: u.email, kedaluwarsa: v.expiresAt } : undefined;
  },
};
