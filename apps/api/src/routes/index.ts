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
import { pantauRoutes } from "./pantau.route";
import { permintaanAkunRoutes } from "./permintaan-akun.route";
import { referensiRoutes } from "./referensi.route";
import { rekapRoutes } from "./rekap.route";
import { undanganRoutes } from "./undangan.route";
import { userRoutes } from "./user.route";

// Semua endpoint aplikasi di bawah /api. Contoh: kegiatanRoutes (prefix /kegiatan) menjadi /api/kegiatan
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
  .use(permintaanAkunRoutes);
