import { app } from "./app";
import { env } from "./config/env";
import { mulaiPengingat } from "./jobs/pengingat.job";

app.listen(env.PORT);

// Pengingat email dijalankan di sini (bukan di app.ts) agar tidak ikut berjalan saat pengujian
if (env.PENGINGAT_AKTIF) mulaiPengingat();

console.log(`API berjalan di http://localhost:${env.PORT}/api`);
console.log('Email Mailpit dijalankan di http://localhost:8025');
