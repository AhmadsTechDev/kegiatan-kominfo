/**
 * Titik masuk (entry point) server API. File inilah yang dijalankan pertama kali oleh `bun src/index.ts`.
 * Tugasnya hanya tiga: menyalakan server, menyalakan pengingat email terjadwal, lalu mencetak alamat server.
 * Semua pengaturan server (plugin, rute) dirakit di app.ts agar bisa dipakai ulang oleh file pengujian.
 */
import { app } from "./app";
import { env } from "./config/env";
import { mulaiPengingat } from "./jobs/pengingat.job";

/**
 * Mulai menerima permintaan HTTP di port dari .env (bawaan 3001).
 * Setelah baris ini server terus berjalan menunggu permintaan, kode di bawahnya tetap dieksekusi.
 */
app.listen(env.PORT);

/**
 * Pengingat email dijalankan di sini (bukan di app.ts) agar tidak ikut berjalan saat pengujian
 */
if (env.PENGINGAT_AKTIF) mulaiPengingat();

console.log(`API berjalan di http://localhost:${env.PORT}/api`);
