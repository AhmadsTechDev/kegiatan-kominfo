import { Elysia } from "elysia";
import { KegiatanController } from "@/controllers/kegiatan.controller";
import { authPlugin } from "@/plugins/auth.plugin";
import { PEMERIKSA, PENULIS } from "@/utils/konstanta";
import { KegiatanValidator } from "@/validators/kegiatan.validator";

const params = KegiatanValidator.params;

/**
 * Rute daftar, detail, catat, ubah, dan hapus kegiatan.
 * CARA MEMBACA satu baris rute, contoh `.get("/:id", KegiatanController.detail, { auth: true, params })`:
 *   - .get / .post / .patch / .delete = metode HTTP (ambil, kirim baru, ubah sebagian, hapus).
 *   - "/:id" = alamat; `:id` adalah parameter, mis. /api/kegiatan/12 berarti id = 12.
 *   - KegiatanController.detail = handler, fungsi yang dijalankan bila alamat cocok.
 *   - { auth, params, query, body } = opsi: auth dari auth.plugin, sisanya skema validator yang dicek otomatis.
 * `.use(authPlugin)` wajib dipasang agar opsi `auth` dikenali di file ini.
 */
export const kegiatanRoutes = new Elysia({ prefix: "/kegiatan" })
  .use(authPlugin)

  /**
   * Daftar kegiatan (PEGAWAI hanya melihat bidangnya dan kegiatan miliknya)
   */
  .get("/", KegiatanController.daftar, { auth: true, query: KegiatanValidator.daftarQuery })

  /**
   * Detail kegiatan
   */
  .get("/:id", KegiatanController.detail, { auth: true, params })

  /**
   * Tulis (catat, ubah, selesaikan, batalkan, hapus): hanya PEGAWAI (lihat PENULIS)
   * Catat kegiatan baru
   */
  .post("/", KegiatanController.buat, { auth: [...PENULIS], body: KegiatanValidator.buat })

  /**
   * Ubah kegiatan
   */
  .patch("/:id", KegiatanController.ubah, { auth: [...PENULIS], params, body: KegiatanValidator.ubah })

  /**
   * Selesaikan kegiatan yang sedang berlangsung (waktu selesai menjadi sekarang)
   */
  .post("/:id/selesai", KegiatanController.selesaikan, { auth: [...PENULIS], params, body: KegiatanValidator.selesai })

  /**
   * Batalkan kegiatan
   */
  .post("/:id/batalkan", KegiatanController.batalkan, { auth: [...PENULIS], params, body: KegiatanValidator.batalkan })

  /**
   * Periksa dokumentasi dan hasil kegiatan: pimpinan dan admin (tidak mengubah isi kegiatan)
   */
  .post("/:id/pemeriksaan", KegiatanController.periksa, { auth: [...PEMERIKSA], params, body: KegiatanValidator.periksa })

  /**
   * Hapus kegiatan
   */
  .delete("/:id", KegiatanController.hapus, { auth: [...PENULIS], params });
