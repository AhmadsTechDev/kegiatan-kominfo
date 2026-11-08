import { Elysia } from "elysia";
import { pool } from "@/lib/db";

/**
 * Memastikan basis data bisa dihubungi saat server menyala dan menutup koneksi saat server berhenti
 *
 * onStart dan onStop adalah lifecycle hook server (bukan per permintaan): dijalankan sekali saat server
 * mulai dan sekali saat server dimatikan. Menutup koneksi dengan rapi mencegah koneksi database menggantung.
 */
export const databasePlugin = new Elysia({ name: "database" })
  .onStart(async () => {
    (await pool.connect()).release();
  })
  .onStop(async () => {
    await pool.end();
  });
