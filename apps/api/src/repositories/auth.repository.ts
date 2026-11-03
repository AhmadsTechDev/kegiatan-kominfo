import { prisma, type Db } from "@/lib/prisma";

const KREDENSIAL = { providerId: "credential" } as const;

export const AuthRepository = {
  // Mencari akun berdasarkan email (huruf kecil)
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  },

  // Data akun untuk alur kredensial: status, email, dan ada-tidaknya kata sandi
  async akunKredensial(where: { id: string } | { email: string }) {
    const u = await prisma.user.findUnique({
      where,
      select: { id: true, name: true, email: true, emailBaru: true, banned: true, accounts: { where: KREDENSIAL, select: { id: true } } },
    });
    if (!u) return undefined;
    const { accounts, ...akun } = u;
    return { ...akun, punyaKredensial: accounts.length > 0 };
  },

  // Hash kata sandi akun (undefined bila belum punya kredensial)
  async hashSandi(userId: string) {
    const a = await prisma.account.findFirst({ where: { userId, ...KREDENSIAL }, select: { password: true } });
    return a?.password ?? undefined;
  },

  // Membuat kredensial email+sandi pertama kali (aktivasi). accountId = id user, sesuai konvensi Better Auth
  async buatKredensial(userId: string, hash: string, db: Db) {
    await db.account.create({ data: { id: crypto.randomUUID(), accountId: userId, providerId: KREDENSIAL.providerId, userId, password: hash } });
  },

  // Mengganti hash kata sandi; mengembalikan jumlah baris yang berubah (0 bila belum punya kredensial)
  async gantiSandi(userId: string, hash: string, db: Db = prisma) {
    const { count } = await db.account.updateMany({ where: { userId, ...KREDENSIAL }, data: { password: hash } });
    return count;
  },

  // Mengosongkan hitungan gagal login dan membuka kunci akun
  async resetLoginGagal(userId: string, db: Db = prisma) {
    await db.user.update({ where: { id: userId }, data: { failedLoginCount: 0, lockedUntil: null } });
  },

  // Email terbukti dimiliki (lewat tautan aktivasi/reset): tandai terverifikasi dan buka kunci login
  async verifikasiDanBuka(userId: string, db: Db) {
    await db.user.update({ where: { id: userId }, data: { emailVerified: true, failedLoginCount: 0, lockedUntil: null } });
  },

  // Menerapkan email baru yang sudah diverifikasi
  async terapkanEmailBaru(userId: string, email: string, db: Db) {
    await db.user.update({ where: { id: userId }, data: { email, emailBaru: null, emailVerified: true } });
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

  // Mengubah nomor kontak (satu-satunya data profil teks yang boleh diubah pemilik akun)
  async ubahKontak(userId: string, kontak: string | null) {
    await prisma.user.update({ where: { id: userId }, data: { kontak } });
  },

  // Menyimpan email baru yang menunggu verifikasi (null = batal)
  async setEmailBaru(userId: string, emailBaru: string | null, db: Db = prisma) {
    await db.user.update({ where: { id: userId }, data: { emailBaru } });
  },

  // Apakah email sudah dipakai akun lain
  async emailDipakai(email: string, kecualiUserId?: string) {
    const u = await prisma.user.findFirst({ where: { email, id: kecualiUserId ? { not: kecualiUserId } : undefined }, select: { id: true } });
    return u != null;
  },

  // Profil lengkap user beserta pegawai, bidang, unit induk, dan info akunnya
  async findProfil(userId: string) {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailBaru: true,
        emailVerified: true,
        role: true,
        banned: true,
        image: true,
        kontak: true,
        createdAt: true,
        accounts: { where: KREDENSIAL, select: { id: true } },
        pegawai: {
          select: {
            id: true,
            nip: true,
            nama: true,
            bidang: { select: { id: true, kode: true, nama: true, parent: { select: { id: true, nama: true } } } },
          },
        },
      },
    });
    if (!u) return undefined;
    const { accounts, ...profil } = u;
    return { ...profil, punyaKredensial: accounts.length > 0 };
  },
};
