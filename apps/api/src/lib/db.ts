import { ilike, like, type Column } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/config/env";

/**
 * Satu koneksi basis data yang dipakai bersama oleh seluruh repository
 *
 * KONSEP Drizzle ORM: query ditulis mirip SQL, misalnya db.select().from(kegiatan).where(eq(kegiatan.id, 1)),
 * lalu diterjemahkan menjadi SQL ke PostgreSQL lewat driver pg. `max` membatasi jumlah koneksi yang dibuka
 * bersamaan (connection pool) agar database tidak kewalahan.
 */
export const pool = new Pool({ connectionString: env.DATABASE_URL, max: env.DATABASE_POOL_MAX });
export const db = drizzle(pool);

/**
 * Tipe koneksi: bisa `db` biasa atau `tx` di dalam db.transaction(...)
 *
 * KONSEP transaksi: db.transaction(async (tx) => {...}) menjalankan beberapa query sebagai satu kesatuan;
 * bila salah satu gagal, semuanya dibatalkan. Repository menerima parameter bertipe Db supaya
 * fungsinya bisa dipanggil di dalam maupun di luar transaksi.
 */
export type Db = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Mengecek apakah galat berasal dari pelanggaran UNIQUE (kode PostgreSQL 23505)
 * Drizzle membungkus galat driver, jadi kodenya bisa berada di `cause`.
 */
export function galatDuplikat(e: unknown) {
  const galat = e as { code?: string; cause?: { code?: string } } | null;
  return galat?.code === "23505" || galat?.cause?.code === "23505";
}

/**
 * Tanda % dan _ pada kata kunci harus di-escape agar dibaca sebagai huruf biasa oleh LIKE
 */
const polaAman = (teks: string) => teks.replace(/[\\%_]/g, "\\$&");

/**
 * Kolom mengandung potongan teks, tanpa membedakan huruf besar dan kecil (ILIKE '%kata%')
 */
export const mengandung = (kolom: Column, teks: string) => ilike(kolom, `%${polaAman(teks)}%`);

/**
 * Kolom mengandung potongan teks, membedakan huruf besar dan kecil (LIKE '%kata%')
 */
export const memuat = (kolom: Column, teks: string) => like(kolom, `%${polaAman(teks)}%`);

/**
 * Kolom diawali teks tertentu (LIKE 'awalan%')
 */
export const berawalan = (kolom: Column, teks: string) => like(kolom, `${polaAman(teks)}%`);
