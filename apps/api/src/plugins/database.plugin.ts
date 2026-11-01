import { Elysia } from "elysia";
import { prisma } from "@/lib/prisma";

// Membuka koneksi Prisma saat server menyala dan menutupnya saat server berhenti
export const databasePlugin = new Elysia({ name: "database" })
  .onStart(async () => {
    await prisma.$connect();
  })
  .onStop(async () => {
    await prisma.$disconnect();
  });
