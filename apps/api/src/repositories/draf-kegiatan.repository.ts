import { and, desc, eq } from "drizzle-orm";
import { drafKegiatan } from "@/db/schema";
import { db, type Db } from "@/db";
import type { IsiDraf } from "@/validators/draf-kegiatan.validator";

const PILIH_DRAF = { id: drafKegiatan.id, isi: drafKegiatan.isi, updatedAt: drafKegiatan.updatedAt };

const milik = (id: number, pemilikId: string) => and(eq(drafKegiatan.id, id), eq(drafKegiatan.pemilikId, pemilikId));

export const DrafKegiatanRepository = {
  daftar(pemilikId: string) {
    return db.select(PILIH_DRAF).from(drafKegiatan).where(eq(drafKegiatan.pemilikId, pemilikId)).orderBy(desc(drafKegiatan.updatedAt), desc(drafKegiatan.id));
  },

  jumlah(pemilikId: string) {
    return db.$count(drafKegiatan, eq(drafKegiatan.pemilikId, pemilikId));
  },

  async detail(id: number, pemilikId: string) {
    const [d] = await db.select(PILIH_DRAF).from(drafKegiatan).where(milik(id, pemilikId)).limit(1);
    return d;
  },

  async insert(pemilikId: string, isi: IsiDraf) {
    const [baru] = await db.insert(drafKegiatan).values({ pemilikId, isi }).returning({ id: drafKegiatan.id });
    return baru!.id;
  },

  async update(id: number, pemilikId: string, isi: IsiDraf) {
    const hasil = await db.update(drafKegiatan).set({ isi }).where(milik(id, pemilikId));
    return hasil.rowCount ?? 0;
  },

  async hapus(id: number, pemilikId: string, tx: Db = db) {
    const hasil = await tx.delete(drafKegiatan).where(milik(id, pemilikId));
    return hasil.rowCount ?? 0;
  },
};
