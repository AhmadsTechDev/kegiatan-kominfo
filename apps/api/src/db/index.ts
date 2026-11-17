import { ilike, like, type Column } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { databaseConfig } from "@/config/database";

export type Db = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const pool = new Pool({
  connectionString: databaseConfig.url,
  max: databaseConfig.poolMax,
  idleTimeoutMillis: 30_000,
});
export const db = drizzle(pool);

const polaAman = (teks: string) => teks.replace(/[\\%_]/g, "\\$&");

export function galatDuplikat(e: unknown) {
  const galat = e as { code?: string; cause?: { code?: string } } | null;
  return galat?.code === "23505" || galat?.cause?.code === "23505";
}

export const mengandung = (kolom: Column, teks: string) => ilike(kolom, `%${polaAman(teks)}%`);

export const memuat = (kolom: Column, teks: string) => like(kolom, `%${polaAman(teks)}%`);

export const berawalan = (kolom: Column, teks: string) => like(kolom, `${polaAman(teks)}%`);
