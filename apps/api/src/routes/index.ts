import { Elysia } from "elysia";
import { auditLogRoutes } from "./audit-log.route";
import { akunPublikRoutes, authRoutes } from "./auth.route";
import { dashboardRoutes } from "./dashboard.route";
import { dokumentasiRoutes } from "./dokumentasi.route";
import { drafKegiatanRoutes } from "./draf-kegiatan.route";
import { eksporRoutes } from "./ekspor.route";
import { healthRoutes } from "./health.route";
import { kalenderRoutes } from "./kalender.route";
import { kegiatanRoutes } from "./kegiatan.route";
import { masterRoutes } from "./master.route";
import { notifikasiRoutes } from "./notifikasi.route";
import { pantauRoutes } from "./pantau.route";
import { permintaanAkunRoutes } from "./permintaan-akun.route";
import { referensiRoutes } from "./referensi.route";
import { rekapRoutes } from "./rekap.route";
import { undanganRoutes } from "./undangan.route";
import { userRoutes } from "./user.route";

/**
 * Semua endpoint aplikasi di bawah /api. Contoh: kegiatanRoutes (prefix /kegiatan) menjadi /api/kegiatan
 *
 * ALUR SATU PERMINTAAN di backend ini (dari luar ke dalam):
 *   1. routes/*.route.ts      -> menentukan alamat URL, siapa yang boleh mengakses (auth), dan validator isian.
 *   2. validators/*.ts        -> memeriksa bentuk data yang dikirim (body, query, params) sebelum diproses.
 *   3. controllers/*.ts       -> "penerima tamu": mengambil data dari permintaan lalu memanggil service.
 *   4. services/*.ts          -> logika bisnis: aturan hak akses, perhitungan, audit log, kirim email.
 *   5. repositories/*.ts      -> satu-satunya lapisan yang menulis query database lewat Prisma.
 * Pemisahan ini membuat setiap file punya satu tanggung jawab, sehingga mudah dicari dan diuji.
 * `prefix` ditambahkan di depan semua alamat milik rute di dalamnya.
 */
export const apiRoutes = new Elysia({ prefix: "/api" })
  .use(healthRoutes)
  .use(authRoutes)
  .use(akunPublikRoutes)
  .use(dashboardRoutes)
  .use(referensiRoutes)
  .use(kegiatanRoutes)
  .use(drafKegiatanRoutes)
  .use(kalenderRoutes)
  .use(dokumentasiRoutes)
  .use(rekapRoutes)
  .use(pantauRoutes)
  .use(eksporRoutes)
  .use(masterRoutes)
  .use(userRoutes)
  .use(auditLogRoutes)
  .use(undanganRoutes)
  .use(permintaanAkunRoutes)
  .use(notifikasiRoutes);
