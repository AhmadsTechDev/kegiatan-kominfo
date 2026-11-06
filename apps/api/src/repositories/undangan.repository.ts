import { prisma } from "@/lib/prisma";

export const UndanganRepository = {
  /**
   * Pegawai aktif berdasarkan id
   */
  async pegawaiAktif(id: number) {
    return (await prisma.pegawai.findFirst({ where: { id, aktif: true }, select: { id: true, nip: true, nama: true } })) ?? undefined;
  },

  /**
   * Pegawai aktif berdasarkan NIP
   */
  async pegawaiAktifByNip(nip: string) {
    return (await prisma.pegawai.findFirst({ where: { nip, aktif: true }, select: { id: true, nip: true, nama: true } })) ?? undefined;
  },

  /**
   * Akun milik pegawai; `aktif` = sudah membuat kata sandi (punya kredensial)
   */
  async akunPegawai(pegawaiId: number) {
    const u = await prisma.user.findFirst({
      where: { pegawaiId },
      select: { id: true, email: true, banned: true, accounts: { where: { providerId: "credential" }, select: { id: true } } },
    });
    return u ? { id: u.id, email: u.email, banned: u.banned, aktif: u.accounts.length > 0 } : undefined;
  },

  /**
   * Akun pemilik email tertentu
   */
  async akunByEmail(email: string) {
    return (await prisma.user.findUnique({ where: { email }, select: { id: true, pegawaiId: true } })) ?? undefined;
  },
};
