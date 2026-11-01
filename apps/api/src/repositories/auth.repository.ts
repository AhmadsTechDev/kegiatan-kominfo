import { prisma } from "@/lib/prisma";

export const AuthRepository = {
  // Mencari akun berdasarkan email (huruf kecil)
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  },

  // Mencari akun berdasarkan username (berisi NIP)
  findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  },

  // Mengosongkan hitungan gagal login dan membuka kunci akun
  async resetLoginGagal(userId: string) {
    await prisma.user.update({ where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: null } });
  },

  // Menandai akun sudah aktif (email terverifikasi) setelah aktivasi
  async tandaiAktif(userId: string) {
    await prisma.user.update({ where: { id: userId }, data: { emailVerified: true, failedLoginCount: 0, lockedUntil: null } });
  },

  // Menambah 1 hitungan gagal login secara atomik di basis data
  async tambahLoginGagal(userId: string) {
    await prisma.user.update({ where: { id: userId }, data: { failedLoginCount: { increment: 1 } } });
  },

  // Mengunci akun sampai waktu tertentu
  async kunci(userId: string, sampai: Date) {
    await prisma.user.update({ where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: sampai } });
  },

  // Key berkas foto profil (kolom image); null bila belum ada foto
  async fotoKey(userId: string) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } });
    return u?.image ?? null;
  },

  // Menyimpan atau menghapus key foto profil
  async setFoto(userId: string, key: string | null) {
    await prisma.user.update({ where: { id: userId }, data: { image: key } });
  },

  // Mengubah nama/kontak akun sekaligus nama/jabatan pegawai tertaut dalam satu transaksi
  async ubahProfil(userId: string, pegawaiId: number | null, nilai: { nama: string; jabatan: string | null; kontak: string | null }) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { name: nilai.nama, kontak: nilai.kontak } });
      if (pegawaiId != null) await tx.pegawai.update({ where: { id: pegawaiId }, data: { nama: nilai.nama, jabatan: nilai.jabatan } });
    });
  },

  // Profil lengkap user beserta pegawai, unit kerja, dan unit induknya
  findProfil(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        image: true,
        kontak: true,
        pegawai: {
          select: {
            id: true,
            nip: true,
            nama: true,
            jabatan: true,
            unitKerja: { select: { id: true, kode: true, nama: true, parent: { select: { id: true, nama: true } } } },
          },
        },
      },
    });
  },
};
