import { prisma, type Db } from "@/lib/prisma";
import type { Halaman, StatusPermintaan } from "@/types/umum.types";

type BarisBaru = { pegawaiId: number | null; nama: string; email: string; catatan: string | null; ip: string | null };

export const PermintaanAkunRepository = {
  // Menyimpan permintaan akun baru dan mengembalikan id-nya
  async insert(nilai: BarisBaru) {
    return (await prisma.permintaanAkun.create({ data: nilai, select: { id: true } })).id;
  },

  // Permintaan yang masih menunggu untuk pegawai tertentu
  async menungguUntukPegawai(pegawaiId: number) {
    return (await prisma.permintaanAkun.findFirst({ where: { pegawaiId, status: "MENUNGGU" }, select: { id: true } })) ?? undefined;
  },

  // Permintaan yang masih menunggu untuk email tertentu
  async menungguUntukEmail(email: string) {
    return (await prisma.permintaanAkun.findFirst({ where: { email, status: "MENUNGGU" }, select: { id: true } })) ?? undefined;
  },

  // Daftar permintaan akun terbaru dengan filter status dan paginasi
  async daftar(status: StatusPermintaan | undefined, halaman: Halaman) {
    const where = { status };
    const [baris, total] = await Promise.all([
      prisma.permintaanAkun.findMany({
        where,
        select: {
          id: true,
          nama: true,
          email: true,
          catatan: true,
          status: true,
          alasanTolak: true,
          diprosesAt: true,
          pemroses: { select: { name: true } },
          createdAt: true,
          pegawai: { select: { id: true, nip: true, nama: true, jabatan: true, unitKerja: { select: { nama: true } } } },
        },
        orderBy: { id: "desc" },
        take: halaman.pageSize,
        skip: (halaman.page - 1) * halaman.pageSize,
      }),
      prisma.permintaanAkun.count({ where }),
    ]);
    const items = baris.map(({ pemroses, pegawai, ...p }) => ({
      ...p,
      diprosesOleh: pemroses?.name ?? null,
      pegawai: pegawai ? { id: pegawai.id, nip: pegawai.nip, nama: pegawai.nama, jabatan: pegawai.jabatan } : null,
      unitKerja: pegawai?.unitKerja.nama ?? null,
    }));
    return { items, total };
  },

  // Jumlah permintaan yang menunggu persetujuan
  jumlahMenunggu() {
    return prisma.permintaanAkun.count({ where: { status: "MENUNGGU" } });
  },

  // Satu permintaan berdasarkan id
  async byId(id: number, db: Db = prisma) {
    return (await db.permintaanAkun.findUnique({ where: { id } })) ?? undefined;
  },

  // Menandai permintaan selesai HANYA bila statusnya masih MENUNGGU; mengembalikan true bila berhasil
  async selesaikanJikaMenunggu(id: number, nilai: { status: StatusPermintaan; alasanTolak?: string | null; diprosesOleh: string }, db: Db = prisma) {
    const hasil = await db.permintaanAkun.updateMany({ where: { id, status: "MENUNGGU" }, data: { ...nilai, diprosesAt: new Date() } });
    return hasil.count > 0;
  },

  // Mengembalikan permintaan ke status MENUNGGU (bila pembuatan akun gagal)
  async kembalikanMenunggu(id: number) {
    await prisma.permintaanAkun.update({ where: { id }, data: { status: "MENUNGGU", diprosesOleh: null, diprosesAt: null } });
  },

  // Email semua admin yang aktif (penerima pemberitahuan)
  async emailAdmin() {
    const baris = await prisma.user.findMany({ where: { role: "ADMIN", banned: false }, select: { email: true } });
    return baris.map((b) => b.email);
  },
};
