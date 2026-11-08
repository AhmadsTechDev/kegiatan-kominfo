import { and, eq } from "drizzle-orm";
import { pegawai, user } from "@/db/schema";
import { db } from "@/lib/db";
import { punyaKredensial } from "@/utils/status-akun";

const PILIH_PEGAWAI = { id: pegawai.id, nip: pegawai.nip, nama: pegawai.nama };

export const UndanganRepository = {
  /**
   * Pegawai aktif berdasarkan id
   */
  async pegawaiAktif(id: number) {
    const [p] = await db
      .select(PILIH_PEGAWAI)
      .from(pegawai)
      .where(and(eq(pegawai.id, id), eq(pegawai.aktif, true)))
      .limit(1);
    return p;
  },

  /**
   * Pegawai aktif berdasarkan NIP
   */
  async pegawaiAktifByNip(nip: string) {
    const [p] = await db
      .select(PILIH_PEGAWAI)
      .from(pegawai)
      .where(and(eq(pegawai.nip, nip), eq(pegawai.aktif, true)))
      .limit(1);
    return p;
  },

  /**
   * Akun milik pegawai; `aktif` = sudah membuat kata sandi (punya kredensial)
   */
  async akunPegawai(pegawaiId: number) {
    const [u] = await db.select({ id: user.id, email: user.email, banned: user.banned, aktif: punyaKredensial }).from(user).where(eq(user.pegawaiId, pegawaiId)).limit(1);
    return u;
  },

  /**
   * Akun pemilik email tertentu
   */
  async akunByEmail(email: string) {
    const [u] = await db.select({ id: user.id, pegawaiId: user.pegawaiId }).from(user).where(eq(user.email, email)).limit(1);
    return u;
  },
};
