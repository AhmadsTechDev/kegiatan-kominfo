import { and, eq, gt, gte, isNull, lt, lte, notExists, or, sql, type SQL } from "drizzle-orm";
import { dokumentasi, kegiatan, pengingat, preferensiPengguna, user, type JenisPengingat } from "@/db/schema";
import { db } from "@/db";

export type KandidatPengingat = {
  kegiatanId: number;
  judul: string;
  tglMulai: Date;
  tglSelesai: Date;
  lokasiNama: string | null;
  userId: string;
  email: string;
  nama: string;
};

const BATAS_PER_PUTARAN = 200;

function kandidat(jenis: JenisPengingat, syarat: SQL): Promise<KandidatPengingat[]> {
  const notifNyala = eq(jenis === "H_MINUS_1" ? preferensiPengguna.notifPengingatKegiatan : preferensiPengguna.notifPengingatDokumentasi, true);
  const sudahDikirim = db
    .select({ satu: sql`1` })
    .from(pengingat)
    .where(and(eq(pengingat.kegiatanId, kegiatan.id), eq(pengingat.userId, user.id), eq(pengingat.jenis, jenis)));
  return db
    .select({
      kegiatanId: kegiatan.id,
      judul: kegiatan.judul,
      tglMulai: kegiatan.tglMulai,
      tglSelesai: kegiatan.tglSelesai,
      lokasiNama: kegiatan.lokasiNama,
      userId: user.id,
      email: user.email,
      nama: user.name,
    })
    .from(kegiatan)
    .innerJoin(user, eq(user.pegawaiId, kegiatan.penanggungJawabId))
    .leftJoin(preferensiPengguna, eq(preferensiPengguna.userId, user.id))
    .where(and(isNull(kegiatan.deletedAt), isNull(kegiatan.dibatalkanAt), syarat, eq(user.banned, false), or(isNull(preferensiPengguna.userId), notifNyala), notExists(sudahDikirim)))
    .limit(BATAS_PER_PUTARAN);
}

export const PengingatRepository = {
  hMinus1(sekarang: Date) {
    return kandidat("H_MINUS_1", and(gt(kegiatan.tglMulai, sekarang), lte(kegiatan.tglMulai, new Date(sekarang.getTime() + 24 * 3600_000)))!);
  },

  tanpaDokumentasi(sekarang: Date, jedaMs: number, batasMs: number) {
    const tanpaBerkas = notExists(
      db
        .select({ satu: sql`1` })
        .from(dokumentasi)
        .where(eq(dokumentasi.kegiatanId, kegiatan.id)),
    );
    return kandidat("DOKUMENTASI", and(lt(kegiatan.tglSelesai, new Date(sekarang.getTime() - jedaMs)), gte(kegiatan.tglSelesai, new Date(sekarang.getTime() - batasMs)), tanpaBerkas)!);
  },

  async catat(kegiatanId: number, jenis: JenisPengingat, userId: string) {
    await db.insert(pengingat).values({ kegiatanId, jenis, userId }).onConflictDoNothing();
  },
};
