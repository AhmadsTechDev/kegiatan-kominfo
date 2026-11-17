import { PengingatService } from "@/services/pengingat.service";

const INTERVAL_MS = 15 * 60 * 1000;
const JEDA_AWAL_MS = 30_000;

let berjalan = false;

async function putaran() {
  if (berjalan) return;
  berjalan = true;
  try {
    const n = await PengingatService.jalankan();
    if (n.H_MINUS_1 + n.DOKUMENTASI > 0) console.log(`[pengingat] terkirim: H-1 ${n.H_MINUS_1}, dokumentasi ${n.DOKUMENTASI}`);
  } catch (e) {
    console.error("[pengingat] putaran gagal:", e instanceof Error ? e.message : e);

  } finally {
    berjalan = false;
  }
}

export function mulaiPengingat() {
  setTimeout(putaran, JEDA_AWAL_MS);
  return setInterval(putaran, INTERVAL_MS);
}
