import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";

/**
 * Membuka koneksi Prisma saat server menyala dan menutupnya saat server berhenti
 *
 * onStart dan onStop adalah lifecycle hook server (bukan per permintaan): dijalankan sekali saat server
 * mulai dan sekali saat server dimatikan. Menutup koneksi dengan rapi mencegah koneksi database menggantung.
 */
export const databasePlugin = new Elysia({ name: "database" })
  .onStart(async () => {
    await prisma.$connect();
  })
  .onStop(async () => {
    await prisma.$disconnect();
  });
