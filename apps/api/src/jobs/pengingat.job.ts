import { PengingatService } from "@/services/pengingat.service";

const INTERVAL_MS = 15 * 60 * 1000;
const JEDA_AWAL_MS = 30_000;

/**
 * Penanda agar dua putaran tidak berjalan bersamaan bila satu putaran memakan waktu lebih dari 15 menit.
 */
let berjalan = false;

/**
 * Satu putaran pengingat; dilewati bila putaran sebelumnya belum selesai
 */
async function putaran() {
  if (berjalan) return;
  berjalan = true;
  try {
    const n = await PengingatService.jalankan();
    if (n.H_MINUS_1 + n.DOKUMENTASI > 0) console.log(`[pengingat] terkirim: H-1 ${n.H_MINUS_1}, dokumentasi ${n.DOKUMENTASI}`);
  } catch (e) {
    console.error("[pengingat] putaran gagal:", e instanceof Error ? e.message : e);

  /**
   * `finally` selalu dijalankan, baik putaran berhasil maupun gagal, jadi penanda pasti dikembalikan ke false.
   */
  } finally {
    berjalan = false;
  }
}

/**
 * Menjalankan pengingat email di latar belakang: pertama setelah 30 detik, lalu setiap 15 menit
 *
 * setTimeout menjalankan fungsi sekali setelah jeda; setInterval menjalankannya berulang setiap selang waktu.
 * Keduanya berjalan di latar belakang tanpa menghentikan server melayani permintaan lain.
 */
export function mulaiPengingat() {
  setTimeout(putaran, JEDA_AWAL_MS);
  return setInterval(putaran, INTERVAL_MS);
}
